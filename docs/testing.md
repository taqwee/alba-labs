# Testing

## Automated
```bash
npm run typecheck   # TypeScript strict
npm run lint
npm test            # unit tests (permissions, access rules, WhatsApp signature/parser/processor, files, audit, utils)
```
**Database isolation tests** (real Postgres, no Supabase account needed beyond a scratch DB): apply the three migrations, then
`psql "$DATABASE_URL" -f tests/sql/rls_isolation.sql` — asserts Customer A ≠ Customer B, Staff 1 ≠ Staff 2, admin sees all, assignment history, admin monitoring cannot send, anon has no access. It rolls back its data. (On a plain Postgres you first need small stubs for the `auth`/`storage` schemas; on a Supabase DEV project just paste it in the SQL editor.)

**Integration test against Supabase:** after `npm run seed:demo` run `RLS_TEST=1 npm test`.

## Manual checklist
Use a DEV Supabase project. Seed with `ALLOW_DEMO_SEED=1 npm run seed:demo` (see README). Password for all demo users: `LunomiDemo!2024`.

### Registration / login / reset
1. `/register` → sign up with a real inbox → email arrives → click link → you land in `/customer`.
2. Try weak password (<10 chars) → inline error. Register same email again → same neutral message (no account enumeration).
3. Sign out, `/login` with a wrong password → "Email or password is incorrect."
4. `/forgot-password` → link → `/reset-password` → new password → signed in.
5. Signed out, open `/admin`, `/staff`, `/customer` → redirected to `/login`.

### Public site & leads
6. Visit `/`, `/services`, `/work`, `/about`, `/contact` on desktop and a 375 px wide viewport. Work page shows the empty state until you publish something.
7. Submit the contact form with bad data → field errors. Submit valid → thank-you. As admin: **Leads** shows it, dashboard "New leads" +1, bell notification appears.
8. Admin → Services: deactivate "Logo Design" → disappears from `/services` within ~1 minute; reactivate.

### Roles & permission boundaries
9. Customer A (`customer.a@demo…`): sees only their project/conversation. Manually open `/admin` → bounced to `/customer`. Open a conversation URL belonging to Customer B → 404.
10. Staff One: sees only "Demo: logo question". Staff Two's conversation URL → 404. `/admin` → bounced to `/staff`. No "Assign" control is shown.
11. Admin: sees both conversations, all customers, Activity log.

### Projects, tasks
12. Admin → Projects → New project for Customer A, assign Staff One, save. Customer A sees it; Customer B does not.
13. Staff One posts a project update (visible) → Customer A gets a notification. Post an internal one → not visible to Customer A.
14. Admin → Tasks → add task assigned to Staff Two → Staff Two sees it; Staff One does not.

### Conversations
15. Admin → Conversations → open one: banner says read-only; **no composer** is shown. Assign to Staff Two → assignment history records it; Staff Two gets a notification; Staff One loses access.
16. Staff replies → message appears for Customer A in `/customer/messages`. Customer replies → assigned staff notified.
17. Add an internal note → shown in dashed yellow "Internal note — never sent to the customer"; Customer A cannot see it.

### Files
18. Customer uploads a PNG → listed; download works via short-lived link. Rename `virus.exe` to `photo.png` and upload → rejected ("content does not match"). Upload >10 MB → rejected.
19. Customer B cannot download Customer A's file URL (`/api/files/<id>` → 404).

### WhatsApp mock mode
20. Set `WHATSAPP_MODE=mock`, restart. Admin → WhatsApp → "Simulate customer message" → an UNASSIGNED conversation + unlinked customer + lead appear; admins are notified.
21. Assign it to Staff One → Staff One replies → status `SENT`, marked simulated; nothing is sent externally.
22. Send the same simulated number again → same conversation (no duplicate customer).

### WhatsApp webhook (needs Meta test app)
23. Meta "Verify and save" succeeds. Send a WhatsApp message from your phone → appears in admin. Meta "Resend" the same event → no duplicate message.
24. Reply from the staff portal → phone receives it; status moves SENT → DELIVERED → READ.
25. Wait >24 h (or edit `last_inbound_at` in DB) → composer shows the window warning; reply is refused or uses the configured template.
26. Unset `WHATSAPP_ACCESS_TOKEN` and redeploy → admin says "WhatsApp integration is not configured."; the rest works.
