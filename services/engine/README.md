# services/engine

Rust core engine — phase 1 / week-1 slice, per the unified engine blueprint.
Lives alongside `services/gateway` (NestJS) as an independent Cargo
workspace; `pnpm-workspace.yaml` / `turbo.json` are untouched.

## What's actually built right now

- **`engine-core`** — axum HTTP server, structured JSON logs (`tracing`),
  `GET /healthz`, and the full username/password auth surface:
  `POST /auth/signup`, `verify-otp`, `resend-otp`, `login`, `refresh`
  (with rotation + reuse detection), `logout`, `logout-all`,
  `forgot-password`, `reset-password`, and `GET /auth/me`. Faithful port
  of `auth.controller.ts` + `auth.service.ts` + `otp.service.ts` —
  same error messages, same status codes, same Redis-backed login
  lockout and OTP rate limits.
- **`engine-data`** — connects to the **same** Postgres the gateway
  already uses via Prisma. Models for `User` (with/without password
  hash), `Session`, `OtpCode`, and audit-log inserts, all matching the
  real `schema.prisma` exactly, including its camelCase-quoted columns,
  cuid string ids, and native Postgres enum columns (cast via
  `::"OtpPurpose"` rather than a custom sqlx enum mapping).
- **`engine-auth`** — JWT sign/verify matching `JwtStrategy` exactly,
  Argon2 password hashing/verification interoperable with node-argon2's
  PHC-encoded hashes, opaque refresh-token generation/hashing, 6-digit
  OTP generation/hashing/constant-time verification, and duration
  parsing matching `common/time.ts`'s grammar. Unit tested.
- **`engine-realtime`, `engine-security`, `engine-vision`** — still empty
  placeholder crates. `engine-vision-ffi` still not a workspace member.
- **`contracts/openapi.yaml`** — the full auth route contract, verified
  against the live `auth.controller.ts` / DTOs / `cookies.ts`, including
  one correction found during this slice: login lockout returns `429`,
  not `423` as an earlier draft assumed.

### Known, deliberate deviations from the gateway (not bugs — flagging on purpose)

- **OTP delivery**: always logged to engine-core's own stdout, regardless
  of `MAIL_PROVIDER` — no Resend HTTP call yet. See the doc comment in
  `src/mail.rs` for the reasoning and what a real-delivery follow-up
  would look like.
- **New row IDs**: engine-core generates a v4 UUID string for any row it
  inserts (users, sessions, OTP codes, audit logs), not a real Prisma
  `cuid()` — there's no DB-level default to inherit (Prisma applies
  `cuid()` client-side), and nothing else in the schema parses or
  validates the id format. See `src/ids.rs`.
- **Per-IP route throttling** (the `@Throttle` decorators) is not
  implemented — the security-critical Redis-backed per-account login
  lockout and per-destination OTP rate limits ARE ported; IP-level
  throttling is abuse-shielding on top of that, not something auth
  correctness depends on.
- **OAuth** (`/auth/oauth/*`) — `google`, `google/callback`, `github`,
  `github/callback` are now implemented (account linking, token exchange,
  userinfo fetch). Added CSRF `state` protection the reference
  implementation doesn't have — see the OAuth section below.

### A note on password-hash compatibility — please verify this one

`engine-auth::password::hash_password` uses Argon2i (node-argon2's
historical default) to match what's already in `users.passwordHash` for
existing accounts. Verifying existing hashes should work regardless of
this guess (the PHC-encoded hash string itself carries its own
algorithm/params), but to be sure: **log in through engine-core with an
account that was created before this slice existed.** If that fails
with a hash-parse error specifically (not just "wrong password"), tell
me the exact error and I'll adjust the variant.

## Run it

You need the gateway's Postgres AND Redis reachable, plus the gateway's
own `JWT_ACCESS_SECRET` so the two services agree on how to validate a
session.

```bash
# 1. Configure the engine to point at the SAME database/redis/secret the gateway uses
cp services/engine/.env.example services/engine/.env
# then edit services/engine/.env and paste in DATABASE_URL, REDIS_URL, and
# JWT_ACCESS_SECRET from services/gateway/.env verbatim

# 2. Run it
cd services/engine
set -a && source .env && set +a
cargo run -p engine-core
```

Then, with the gateway also running:

```bash
curl -i http://localhost:4100/healthz
```

Should show `db_connected: true` and `redis_connected: true`.

Full auth flow smoke test (against a throwaway account, not a real one):

```bash
curl -i -X POST http://localhost:4100/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"TestPassword123!"}'
# check engine-core's own terminal for the logged OTP code
curl -c cookies.jar -i -X POST http://localhost:4100/auth/verify-otp -H "Content-Type: application/json" -d '{"email":"test@example.com","code":"<code from log>","purpose":"SIGNUP_VERIFY"}'
curl -i http://localhost:4100/auth/me -b cookies.jar
curl -c cookies.jar -i -X POST http://localhost:4100/auth/refresh -b cookies.jar
```

## What's next (not in this drop)

1. Frontend cutover behind a feature flag for real parity testing in
   staging.
2. `engine-realtime` + the chat domain (phase 2).
3. `engine-vision`'s actual phase-1 scope (section 4).
4. The reverse-proxy / automatic-failover layer in front of both
   services — see `AGENTS.md` for why that's the actual end goal this
   parity work is building toward, and why it isn't safe to build until
   the two services are proven to genuinely behave the same.

## OAuth (Google / GitHub) — one setup step before you can test it

Providers require an EXACT, pre-registered redirect URI per OAuth app —
they will not accept a request from a URI they don't already know about.
Your existing Google Cloud Console / GitHub OAuth App credentials almost
certainly have `http://localhost:4000/auth/oauth/.../callback`
registered (pointing at the gateway), NOT port 4100. To test OAuth
against engine-core, you have two options:

- **Add a second redirect URI** to the same OAuth app (Google Cloud
  Console → Credentials → your OAuth client → Authorized redirect URIs;
  GitHub → Developer Settings → OAuth Apps → your app) pointing at
  `http://localhost:4100/auth/oauth/google/callback` (and the GitHub
  equivalent). Most providers allow multiple registered URIs on one app,
  so both the gateway and engine-core can be tested without conflict.
- Or temporarily point `GOOGLE_CALLBACK_URL`/`GITHUB_CALLBACK_URL` in
  `services/engine/.env` at the gateway's port while testing, then swap
  back — more fragile, not recommended if you want to test both
  side by side.

### A deliberate, flagged improvement over the reference implementation

engine-core's OAuth flow adds CSRF `state`-parameter protection
(Redis-backed, one-time-use, 10-minute TTL) that the gateway's
`passport-google-oauth20`/`passport-github2` strategies do NOT have —
they're constructed without `state: true`, so the reference
implementation has no CSRF protection on OAuth login at all. This is a
real, known vulnerability class (login CSRF), not a stylistic choice
worth replicating for parity's sake. See the doc comment at the top of
`src/routes/oauth.rs` for detail. One consequence: OAuth routes hard-503
if Redis is unavailable, rather than silently running unprotected.

## A note on the toolchain

`rust-toolchain.toml` pins `1.85.0`. If `rustup` isn't installed yet:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# restart your shell, then from services/engine/:
rustup show   # auto-installs the pinned 1.85.0 toolchain via rust-toolchain.toml
```
