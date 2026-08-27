# Status — What's Actually Done vs. Not

Legend: ✅ = built AND verified against a real running system (not just
written/reviewed). ⚠️ = built but only partially verified — check the note.
❌ = not started.

## Rust engine — auth parity with the gateway

- ✅ `engine-core` boots, `/healthz`, structured JSON logging
- ✅ `engine-data` connects to the real Postgres, reads `users` correctly
  (including the TIMESTAMP-not-TIMESTAMPTZ fix)
- ✅ `engine-auth` JWT verify matches gateway exactly, including a fixed
  clock-skew leeway bug (Rust's `jsonwebtoken` defaults to 60s leeway;
  Node's does not — set to 0 explicitly)
- ✅ `GET /auth/me` — parity proven live, byte-identical response to the
  gateway's own `/auth/me` for the same session cookie
- ✅ `POST /auth/signup` — live tested
- ✅ `POST /auth/verify-otp` — live tested (OTP delivered via console log,
  not real email — see gotchas)
- ✅ `POST /auth/login` — live tested
- ✅ `POST /auth/refresh` — rotation + reuse detection, live tested
- ✅ `POST /auth/logout` / `logout-all` — live tested
- ⚠️ `POST /auth/forgot-password` / `reset-password` — built, code-reviewed
  carefully, but NOT yet live-tested end to end on the engine specifically
  (was tested on the gateway during the email-case-sensitivity
  investigation). Verify before considering this fully closed.
- ✅ Google OAuth — live tested, including account-linking-by-email branch
- ✅ GitHub OAuth — live tested, including account-linking-by-email branch,
  the required `User-Agent` header, and the `/user` + `/user/emails`
  two-call fetch
- ✅ OAuth CSRF `state` protection — atomic Redis `GETDEL`, verified via
  direct Redis inspection (existed → consumed → gone) AND via HTTP replay
  test (`302` to `oauth_failed` on reuse)
- ✅ Login lockout (5 failures/15min, Redis-backed) — code matches gateway,
  not separately live-load-tested on the engine specifically
- ✅ Case-insensitive email uniqueness — DB-level constraint (works
  regardless of which service writes), app-level normalization in BOTH
  Rust and TypeScript, all verified live

## Not started (Rust engine)

- ❌ Real OTP email delivery (Resend HTTP call) — currently console-only,
  a deliberate, documented deviation. See `services/engine/src/mail.rs`.
- ❌ Per-IP route-level throttling inside the Rust app itself (the global
  nginx-layer rate limit covers this at the edge now — see Tier 1 below —
  but no app-layer equivalent to the gateway's `@Throttle` decorators)
- ❌ `engine-realtime` (chat backend) — empty placeholder crate only
- ❌ `engine-vision` (scan persistence) — empty placeholder crate only
- ❌ `engine-security` — empty placeholder crate only

## Tier 1 — production hardening (see docs/01-BLUEPRINT.md for full context)

- ✅ **Item 1, HTTPS/TLS** — nginx + mkcert, real TLS handshake tested,
  Windows/WSL cert-trust-store mismatch found and fixed (see gotchas),
  confirmed via Chrome's own certificate inspector
- ✅ **Item 2, Secrets management** — sops+age encrypted `.env.enc` backups,
  full round-trip tested, survived a REAL recovery scenario (see
  `08-INCIDENT-LOG.md`), committed to git
- ✅ **Item 3, IP-based rate limiting** — nginx `limit_req_zone`, tested
  under real flood conditions (burst passes, excess gets `429`) AND
  confirmed normal paced traffic is unaffected
- ❌ **Item 4, Account deletion flow** — not started
- ❌ **Item 5, New-device/location login alerts** — not started
- ❌ **Item 6, Monitoring + alerting** — not started

## Infrastructure / process

- ✅ Root `AGENTS.md` and `services/engine/AGENTS.md` — standing
  production-grade standard, referenced by this docs folder
- ✅ Git repo initialized, history audited clean (no secrets, no large
  binaries), pushed to a **private** GitHub repo
  (`github.com/jodhd92-a11y/Yzonic_Spatial-ai`)
- ✅ `.gitignore` correctly distinguishes `.env` (never committed) from
  `.env.enc` (deliberately committed) — verified via real `git add`
  behavior, not just pattern inspection

## Not started at all

- ❌ Your thesis — reverse-proxy/automatic-failover between gateway and
  engine (nginx `upstream` block has a commented-out line ready for this)
- ❌ Tier 2 items (TOTP/passkeys, breached-password checks, session
  management UI, DB high availability, load testing, CI/automated tests)
- ❌ Tier 3 items (fraud/anomaly detection, compliance readiness,
  automated key rotation)
- ❌ Any real cloud deployment — everything to date is local WSL dev only
