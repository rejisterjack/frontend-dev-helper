# License server and go-to-market checklist

This checklist supports **deploying** [monetization/server](server), **wiring Stripe**, and **publishing** the extension. Keep [src/background/licensing.ts](../src/background/licensing.ts) (`FEATURE_MATRIX`) aligned with Stripe products and store copy ([monetization/README.md](README.md)).

## 1. Environment (license server)

Copy [server/.env.example](server/.env.example) and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (Prisma) |
| `JWT_SECRET` | License token signing |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_*` | Price IDs for checkout routes |
| `RESEND_API_KEY` | Optional: transactional email (payment failed, trial ending) |
| `RESEND_FROM` | Sender address (e.g. `FrontendDevHelper <billing@yourdomain.com>`) — required with `RESEND_API_KEY` |
| `ALLOWED_ORIGINS` / `FRONTEND_URL` | CORS and links in emails |

Without `RESEND_API_KEY`, the server **logs** intended emails instead of sending (see [server/src/utils/notifyUser.ts](server/src/utils/notifyUser.ts)).

## 2. Hosting

- **Railway:** [server/railway.json](server/railway.json) — `npx prisma migrate deploy` then `npm start`; health at `/health`.
- **Render:** [server/render.yaml](server/render.yaml) — bind `DATABASE_URL`, Stripe secrets, and run migrations on start.

Point the **extension’s** license validation base URL (wherever you configure it) at the deployed `https://` origin.

## 3. Stripe

1. Create products/prices matching **Pro** and **Team** in [licensing.ts](../src/background/licensing.ts).
2. Add **webhook endpoint** `POST /v1/webhooks/stripe` (raw body) with the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Subscribe to at least: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`.
4. Test with Stripe CLI locally before production.

## 4. Chrome Web Store (CWS)

1. Build the extension: `pnpm run build` from repo root; package `dist/` as a zip.
2. Use a **developer account** and pay the one-time registration fee if not already done.
3. Supply **screenshots**, short description, and permissions justification consistent with [docs/guide/security-and-privacy.md](../docs/guide/security-and-privacy.md).
4. Ensure `update_url` / store update flow matches your release process ([README.md](../README.md) notes).

## 5. Firefox Add-ons (AMO)

- Validate the **popup** and content tools on Firefox ([docs/firefox-parity.md](../docs/firefox-parity.md)); there is no `sidePanel` API on Firefox.

## 6. Post-deploy smoke

- `GET /health` returns OK.
- Issued license validates from the extension (or a test JWT client).
- Webhook events update `Subscription` / `License` rows in Postgres.
- Optional: trigger a test `invoice.payment_failed` and confirm email log or Resend delivery.
