# Phone OTP Sign-In

**Implements:** US-001, FR-01
**API routes:** `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`
**Data layer:** MongoDB `otp_codes` (pending codes) + `users` (identity) + a self-issued session JWT. **No Supabase Auth.**

---

## Provider and session issuance

**[DEFAULT — per `engineering-doc.md` §7/§11]** MSG91 as primary SMS OTP delivery, Twilio Verify as secondary/fallback, MSG91/Gupshup for WhatsApp OTP fallback. Since there is no Supabase Auth (or any third-party auth platform) in this project, **this app issues and verifies its own session**: a signed JWT (`src/lib/auth/session.ts`, e.g. via the `jose` library), `SESSION_JWT_SECRET` env var, set as an HttpOnly cookie, 30-day expiry per FR-01.

## `POST /api/auth/otp/send`

**Request:** `{ "phone": "+91XXXXXXXXXX" }` (E.164, India country code enforced client- and server-side)
**Response:** `{ "sent": true }`
**Behavior:**
1. Rate-limit check: max 3 sends per phone number per 15 minutes *(default — tune in Stage 7)* → `429 rate_limited` beyond that.
2. Generate a random 6-digit code; hash it (bcrypt/argon2 — never store the code in plain text, even transiently).
3. Upsert an `otp_codes` document: `{ phone, code_hash, expires_at: now() + 5 minutes }` (`docs/specs/mongodb-schema.md`'s TTL index handles expiry automatically) — any prior pending code for this phone is overwritten, so only the latest code is ever valid.
4. Dispatch the plain code via MSG91 (primary SMS); on a delivery timeout, fall back to Twilio Verify.
**Target:** delivered within 30 seconds *(assumption, from PRD)*.

## `POST /api/auth/otp/verify`

**Request:** `{ "phone": "+91XXXXXXXXXX", "code": "123456" }`
**Response:** `{ "session": true }` — the session JWT is set as an HttpOnly cookie by this route; it is never returned in the JSON body for client JS to read.
**Behavior:**
1. Look up the `otp_codes` document for this `phone`. If none exists (never sent, or TTL already expired it) → `410 code_expired`.
2. Compare the submitted `code` against `code_hash`. Mismatch → `401 invalid_code`.
3. On match: delete the `otp_codes` document (one-time use), upsert the `users` document (`phone`, `created_at` if new), issue a signed session JWT (`user_id`, 30-day expiry), set it as an HttpOnly cookie.
4. Return `{ "session": true }`.

## WhatsApp OTP fallback

If SMS delivery fails, or the user picks "send via WhatsApp" *(fallback entry point, not the primary MVP flow)*, `/api/auth/otp/send` dispatches via MSG91/Gupshup's WhatsApp Business API instead of SMS — same `otp_codes` document, same `/verify` contract, regardless of delivery channel.

## No password, no third-party auth platform

Phone + OTP is the entire authentication surface (FR-01, `CLAUDE.md`). There is no Supabase Auth, no Firebase Auth, no other identity provider — `users` + `otp_codes` + a self-issued JWT is the complete mechanism, consistent with "nothing new introduced" beyond what's already in the stack.

## Edge cases

- A user changes SIM/number between send and verify → verification fails `invalid_code` (code was sent to the old number) — no special handling needed.
- A user requests a new OTP before the first expires → the upsert in step 3 overwrites the pending code, so only the newest one verifies; the frontend should disable resend during the countdown to reduce confusion.
- Rate limit hit during a legitimate retry flood (poor network, repeated taps) → the `429` should render as "please wait before requesting another code," not a generic error.
- The TTL index deletion (MongoDB background process) is not instantaneous — there's a small window where an expired code's document still exists. **The `expires_at` check must still be done explicitly in step 1 of verify** (compare `expires_at` against `now()`), not relied on implicitly via "the document would have been deleted by now."

## Acceptance criteria

```
Given a valid Indian phone number
When POST /api/auth/otp/send is called
Then an OTP is dispatched via MSG91, an otp_codes document is created with a hashed code, and sent: true is returned

Given a correct, unexpired OTP code
When POST /api/auth/otp/verify is called
Then a 30-day session JWT cookie is set, the otp_codes document is deleted, and a users document exists for that phone

Given 4 OTP send requests within 15 minutes for the same number
When the 4th request is made
Then it is rejected with 429 rate_limited

Given an OTP code whose expires_at has passed
When POST /api/auth/otp/verify is called
Then it is rejected with 410 code_expired, not 401, even if the TTL index hasn't physically deleted the document yet
```
