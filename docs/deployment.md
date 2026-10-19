# Deployment

```
Now                                   Later
User → Netlify/Render → Next.js       User → lunomistudio.com → Next.js (same code)
              └→ Supabase                            └→ Supabase (same project)
Meta → /api/webhooks/whatsapp → Next.js → Supabase
```
Only environment variables change when you move to a custom domain.

## 1. Supabase (free tier is fine to start)
1. <https://supabase.com> → **New project** (save the database password).
2. **SQL Editor**: run, in order, `supabase/migrations/0001_schema.sql`, `0002_permissions_and_functions.sql`, `0003_rls_policies.sql`. (Or use the Supabase CLI: `supabase link` then `supabase db push`.)
3. Optional: run `supabase/seed/01_reference_data.sql` for the launch services.
4. **Project Settings → API**: copy the URL, `anon` key and `service_role` key.
5. **Authentication → URL Configuration**: *Site URL* = your site URL; add `https://YOUR-SITE/auth/callback` to *Redirect URLs* (add both the temporary URL and, later, your custom domain).
6. **Authentication → Providers → Email**: keep "Confirm email" ON for production. Supabase's built-in email sender is rate-limited; configure custom SMTP before launch.
7. Storage buckets `private-files` (private) and `public-assets` (public) are created by migration 0003.

## 2. Netlify
1. Push the project to GitHub. **Add new site → Import from Git**.
2. Build command `npm run build` (already in `netlify.toml`; the Next.js runtime plugin is applied automatically).
3. **Site settings → Environment variables**: add every variable from `.env.example` (leave WhatsApp ones out until ready). Set `NEXT_PUBLIC_SITE_URL` to the Netlify URL, e.g. `https://lunomi-studio.netlify.app`.
4. Deploy. Public env vars are baked in at build time, so **redeploy after changing any `NEXT_PUBLIC_*`**.

## 2b. Render (alternative)
New **Web Service** → build `npm install && npm run build`, start `npm start`, add the same env vars. Free instances sleep when idle — the first WhatsApp webhook after a sleep may be slow, and Meta retries, so idempotency covers it; use a paid instance for production.

## 3. First admin
Register normally at `/register`, confirm the email, then in the Supabase SQL editor:
```sql
update profiles set role = 'ADMIN' where email = 'you@yourdomain.com';
```
Sign in again → you land in `/admin`. Create staff via **Admin → Staff → Send invitation**.

## 4. Custom domain (e.g. lunomistudio.com)
1. Netlify **Domain management → Add domain** and follow the DNS instructions (or use Netlify DNS).
2. Change `NEXT_PUBLIC_SITE_URL` to `https://lunomistudio.com` and redeploy.
3. Supabase → Authentication → URL Configuration: update *Site URL*; add `https://lunomistudio.com/auth/callback`.
4. Meta → WhatsApp → Configuration: change the webhook callback URL to `https://lunomistudio.com/api/webhooks/whatsapp`.
5. Sitemap, canonical URLs, Open Graph and email links all follow `NEXT_PUBLIC_SITE_URL` automatically.

## 5. Production checklist
- [ ] Custom SMTP configured in Supabase
- [ ] Real privacy policy and terms replace the placeholder pages
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and WhatsApp secrets only in the host's env settings
- [ ] Never run `npm run seed:demo` against the production project
- [ ] Enable Supabase backups (Pro plan) before holding real customer data
- [ ] Replace the in-memory rate limiter if you see abuse (see `lib/utils/rate-limit.ts`)
