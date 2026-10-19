# WhatsApp (Meta Cloud API)

Lunomi Studio uses **only the official WhatsApp Business Cloud API** — no WhatsApp Web, browser automation or unofficial libraries.

## Modes (`WHATSAPP_MODE`)
| Mode | When | What happens |
|---|---|---|
| `off` | default when credentials are missing | Admin shows "WhatsApp integration is not configured." Nothing else is affected. Webhook returns 503. |
| `mock` | `WHATSAPP_MODE=mock` | Admin → WhatsApp has a **simulator**. Messages run through the *same pipeline* as real ones but nothing leaves the server. Mock contacts are flagged `is_mock` and can never be sent to Meta, even in live mode. |
| `live` | all four credentials set (or `WHATSAPP_MODE=live`) | Real webhook + sending. |

## Setup (first time)
1. Go to <https://developers.facebook.com> → **My Apps → Create App** → type **Business**. Link (or create) a **Meta Business portfolio**.
2. In the app, **Add product → WhatsApp**. Meta creates a test WhatsApp Business Account (WABA) and a test phone number.
3. **WhatsApp → API Setup** shows:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. **Access token**: the API Setup token expires in ~24h (fine for a first test). For production create a **System User** in Business Settings → Users → System users, assign the app + WABA, and generate a **permanent token** with `whatsapp_business_messaging` + `whatsapp_business_management` → `WHATSAPP_ACCESS_TOKEN`.
5. **App secret**: App settings → Basic → *App secret* → `META_APP_SECRET` (used to verify webhook signatures).
6. Choose any long random string as `WHATSAPP_VERIFY_TOKEN`.
7. Set these in your hosting dashboard (never commit them) and redeploy.
8. **WhatsApp → Configuration → Webhook**: Callback URL `https://YOUR-SITE/api/webhooks/whatsapp`, Verify token = your `WHATSAPP_VERIFY_TOKEN` → **Verify and save**. Then subscribe to the **messages** field.
9. While in development, add your own phone under API Setup → *To* and send yourself the `hello_world` template. Reply from your phone — the message should appear in **Admin → Conversations**.
10. Going live: complete Business Verification, add your real number, and get message templates approved.

## Rules the app respects
* **24-hour customer-service window.** You can send free-form text only within 24 h of the customer's last message. After that Meta requires an **approved template**. The conversation screen shows a warning; if `WHATSAPP_REENGAGEMENT_TEMPLATE` is set the app sends that template instead, otherwise the reply is refused with a clear message (and stored as `FAILED`).
* **Delivery is not assumed.** Outbound messages start `PENDING`, become `SENT` when Meta accepts them, and move to `DELIVERED`/`READ`/`FAILED` only from Meta's status webhooks (never backwards).
* **Idempotency.** Meta retries webhooks; each event is stored once (`whatsapp_webhook_events.event_key`).
* **Signature check.** Every POST is verified with HMAC-SHA256 (`X-Hub-Signature-256`) on the raw body.
* **Customer matching.** A number is matched only to an existing customer *without* a portal account and with exactly one matching phone. Otherwise a new **unlinked** customer + lead is created; an admin can link it (Admin → WhatsApp → Contacts). Phone numbers typed by portal users are unverified, so they are never auto-linked.
* **Assignment.** A returning customer's new conversation goes to their previous assignee if still active; otherwise it is UNASSIGNED and admins are notified.

## Limitations
* Inbound media (images, documents) is stored as a text placeholder (`[image] caption`); downloading media is not implemented yet.
* Only text (and one configured template) can be sent.
* Business-initiated conversations require templates you create and get approved in Meta.
