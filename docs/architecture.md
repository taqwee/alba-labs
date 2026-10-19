# Architecture

Lunomi Studio is a **modular monolith**: one Next.js app, one Supabase project (Postgres, Auth, Storage, Realtime), one official WhatsApp API.

```
Browser ──> Next.js (App Router, server components + server actions)
                │  user session (anon key + cookies)  → RLS decides what rows are visible
                │  service role (server only)         → webhooks, staff invites, signed URLs, audit/notifications
                ▼
            Supabase: Postgres + RLS · Auth · Storage · Realtime
Meta WhatsApp Cloud API ⇄ /api/webhooks/whatsapp  (inbound)  /  lib/whatsapp/dispatch.ts (outbound)
```

## Layers (UI → action → business logic → database)

| Layer | Where |
|---|---|
| UI (server components, few client components) | `app/**`, `components/**` |
| Server actions / route handlers (validate with Zod, check permission) | `app/actions/*`, `app/api/*` |
| Business logic | `lib/conversations`, `lib/whatsapp`, `lib/permissions`, `lib/files`, `lib/audit`, `lib/notifications` |
| Data | Supabase (SQL migrations in `supabase/migrations`) |

## Security model (defence in depth)
1. **Middleware** redirects anonymous visitors away from `/admin`, `/staff`, `/customer`.
2. **Layouts** call `requireRole()`; **pages/actions** call `requirePermission()` / `assertPermission()`.
3. **Row Level Security** is the real gate: even if app code were wrong, the database refuses. Staff see only conversations assigned to them; customers only their own rows.
4. `handle_new_user` **always creates CUSTOMER**. Staff/admin roles are only set with the service role (invite flow / SQL).
5. Triggers stop non-admins changing `role`, `is_active`, or a conversation's `assigned_to`.
6. Assignment goes through `assign_conversation()` (permission-checked, transactional, records history).
7. Replying requires the conversation to be **assigned to you** (admins too) so monitoring can never send a message.

## Permissions
Role → permission matrix lives in `lib/permissions/index.ts` and is mirrored in `supabase/migrations/0002_…sql` (a unit test fails if they drift). Individual staff can receive extra grants (`profile_permissions`) from **Admin → Staff**.

## Conversations
One `conversations` table for every channel (`WHATSAPP`, `WEBSITE`, `INTERNAL`). Add a channel with `alter type conversation_channel add value 'EMAIL'` plus an adapter next to `lib/whatsapp` — no changes to the conversation model.
Messages, internal notes (separate table, staff-only RLS) and assignment history are separate tables.

## WhatsApp pipeline
`route.ts` (verify signature → validate → parse) → `processor.ts` (pure business rules over a `WhatsAppStore` port) → `supabase-store.ts` (adapter). Idempotency: each event claims a unique `event_key` in `whatsapp_webhook_events`; duplicates are ignored, failures release the claim so Meta's retry works.

## Extension points (not built yet)
Quotes/invoices/payments/contracts: new tables keyed by `customer_id` / `project_id` with the same RLS helpers (`my_customer_id()`, `can_access_project()`). New permission keys go in both permission files. Email/Instagram/Telegram: new channel enum value + adapter. AI features: call from server actions/`processor.ts` hooks.
