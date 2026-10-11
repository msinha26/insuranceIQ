# Payments — Razorpay (UPI)

**Implements:** US-016
**API routes:** `POST /api/payments/create-order`, `POST /api/payments/webhook`, `GET /api/payments/status` *(addition — needed for polling since there is no Realtime; add to `engineering-doc.md`'s route tables)*
**Gateway:** **[DEFAULT — per `engineering-doc.md` §12]** Razorpay

---

## `POST /api/payments/create-order`

**Request:** `{ "plan": "hospital_pass" }` (or `"family_plan"` — the two SKUs named in the PRD; exact pricing (₹149/₹499) is a product/pricing decision the PRD itself calls "a hypothesis, not a plan" — this spec does not hard-code a price, it reads from a server-side plan-pricing config).

**Behavior:**
1. Look up the plan's amount (paise) from a server-side config (not client-supplied — never trust a client-sent amount for a payment).
2. Call Razorpay's Orders API to create an order for that amount.
3. Insert a `payments` document (`status: "pending"`, `razorpay_order_id`, `amount_paise`, `plan`) into MongoDB.
4. Return `{ "order_id": "...", "amount": 14900 }` for the client to open Razorpay's Checkout (UPI intent/collect) with.

## `POST /api/payments/webhook`

**Auth:** Razorpay webhook signature verification (HMAC with the webhook secret, per Razorpay's documented scheme) — **not** the app's own shared-secret pattern, since this is a third-party webhook, not n8n.

**Behavior:**
1. Verify signature → `401 invalid_signature` on failure, no further processing.
2. On `payment.captured` event: update the matching `payments` document to `status: "paid"` by `razorpay_order_id` (idempotent — a duplicate webhook delivery for the same order_id is a no-op update, not a double-credit).
3. Flip the user's entitlement (a derived read — "does this user have any `payments` document with `status: 'paid'` for the relevant plan," not a separate entitlements collection at MVP, per `docs/engineering/implementation-specs.md` spec #11's assumption).
4. On `payment.failed`: update the document to `status: "failed"`.

## Entitlement unlock timing (PRD target: within 10 seconds of payment completion)

Since UPI payment confirmation (the webhook) can arrive **before** the client-side Razorpay Checkout callback fires in the browser (a known UPI behavior — the bank confirms asynchronously), the frontend's `usePaymentStatus` hook (per `docs/engineering/implementation-specs.md` spec #11) must not rely solely on the client-side checkout success callback. With no Supabase Realtime in this architecture, it **polls** `GET /api/payments/status` (or re-fetches the relevant policy/account state) at a short interval (e.g. every 1–2 seconds for up to ~15 seconds after checkout opens) so the UI unlocks promptly once the webhook updates the document, regardless of what the client-side SDK reports.

## Edge cases

- Duplicate webhook delivery (Razorpay retries on any non-`200` response) → the update-by-`razorpay_order_id` is idempotent; the route should always return `200` once the signature is valid and the update is applied, so Razorpay stops retrying.
- Payment succeeds (webhook received, document updated to `paid`) but the entitlement-check code path has a transient bug/outage → the `payments` document is the source of truth; any entitlement check re-derives from it, so a transient failure self-heals on the next check rather than needing a separate reconciliation flag — *(flagged for Stage 7 to add monitoring/alerting if a paid user reports not seeing their unlock)*.
- A user closes the browser mid-UPI-flow after the payment actually succeeded on their bank's side → the webhook still arrives and updates the document; the next time they open the app, `usePaymentStatus`'s initial fetch (not just the polling loop) must pick up the already-`paid` state.
- Polling runs for a fixed window (~15s) after checkout opens → if the webhook is unusually slow and the window elapses before `paid` appears, the UI should fall back to a manual "refresh" affordance rather than polling forever.

## Acceptance criteria

```
Given a user selects the hospital_pass plan
When POST /api/payments/create-order is called
Then a Razorpay order is created with the server-configured amount (never a client-supplied amount) and a pending payments document is inserted

Given a valid payment.captured webhook from Razorpay
When POST /api/payments/webhook is called
Then the matching payments document flips to paid, and this is idempotent if the same webhook is delivered twice

Given the webhook arrives while the user's browser is still showing the Razorpay checkout UI
When the payments document flips to paid
Then the frontend's polling loop (GET /api/payments/status) picks up the paid state and unlocks the entitlement within the 10-second target, not only via the client-side checkout success callback

Given an invalid webhook signature
When POST /api/payments/webhook is called
Then it is rejected 401 invalid_signature and no payments document is modified
```
