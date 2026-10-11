# Consent Capture

**Implements:** FR-02
**API route:** `POST /api/consent` · **MongoDB collection:** `consents` (`docs/specs/mongodb-schema.md`)

---

## Contract

**Request:**
```json
{ "version": "2026-10-11-v1" }
```

**Response:**
```json
{ "accepted": true, "version": "2026-10-11-v1", "accepted_at": "2026-10-11T10:00:00Z" }
```

## Behavior

1. The current consent version is a server-side constant (`CURRENT_CONSENT_VERSION` in `src/lib/security/validate.ts` or equivalent) — the frontend fetches it to render the right consent text, it never sends its own version string as a trusted value for anything other than matching.
2. The route rejects (`400`) a request whose `version` doesn't match `CURRENT_CONSENT_VERSION` — this prevents a stale client from silently "accepting" an outdated consent text.
3. On success, inserts a `consents` document (`user_id`, `version`, `accepted_at = now()`). Consent rows are **never updated or deleted** — each acceptance is a permanent, append-only record; re-accepting the same version is a no-op (`409`, treated as success by the frontend, not an error state shown to the user).
4. **Upload gate:** `POST /api/policies` (the upload route) checks for a `consents` document at `CURRENT_CONSENT_VERSION` before accepting any file. Missing it returns `403 consent_required`; the frontend redirects to the consent screen, then back to upload on success.

## Version bump behavior

When `CURRENT_CONSENT_VERSION` changes (e.g. consent text is updated), any user whose latest `consents` document is for an older version is treated as **not consented at the new version** — the upload gate (step 4) re-triggers the consent screen on their next upload attempt, even though they consented before. Existing policies/chats are unaffected; this only gates new uploads.

## Edge cases

- A user who signs in on a second device before accepting consent on the first → consent is per-user, not per-device; accepting on either device satisfies the gate everywhere.
- A user under 18 — the PRD requires 18+, but specifies no verification mechanism. **[DEFAULT]** a self-declared age checkbox is shown alongside consent (`age_confirmed_18_plus` on `users`); this is not identity verification, just an honesty gate, and is flagged in `docs/engineering/implementation-specs.md` spec #1 as needing confirmation.
- Consent text itself (what exactly it says) is a product/legal content decision outside this spec's scope — this spec only defines the capture mechanism, not the wording.

## Acceptance criteria

```
Given a first-time user who has never accepted consent
When they attempt to upload a policy
Then the upload is rejected with consent_required and they are routed to the consent screen

Given a user accepts the current consent version
When they immediately attempt to upload
Then the upload proceeds

Given CURRENT_CONSENT_VERSION is bumped after a user already consented to the old version
When that user attempts a new upload
Then they are re-prompted for consent at the new version before the upload proceeds

Given a user re-submits acceptance for a version they already accepted
When POST /api/consent is called again with the same version
Then no duplicate consents document is created and the response still reports accepted: true
```
