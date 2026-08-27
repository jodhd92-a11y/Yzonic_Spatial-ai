# Architecture

## System map

```
                              Browser / clients
                                     │
                        ┌────────────▼────────────┐
                        │   nginx reverse proxy      │  infra/nginx/nginx.conf
                        │   :8443 (HTTPS) / :8080     │  TLS termination (mkcert, local dev)
                        │   IP-based rate limiting     │  10r/s, burst 20, nodelay
                        └────────────┬────────────┘
                                     │ proxy_pass
                                     ▼
                        ┌────────────────────────┐
                        │  services/gateway         │  NestJS, TypeScript
                        │  :4000                      │  THE REFERENCE IMPLEMENTATION —
                        │                              │  full auth surface, currently
                        │                              │  what real traffic would use
                        └────────────┬────────────┘
                                     │ (independent, NOT yet load-balanced
                                     │  against the line below — see thesis)
                        ┌────────────▼────────────┐
                        │  services/engine           │  Rust — axum, sqlx, tokio
                        │  :4100                      │  THE PORT-IN-PROGRESS —
                        │                              │  full auth parity built +
                        │                              │  verified, not yet receiving
                        │                              │  real traffic
                        └────────────┬────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                  ▼
          ┌──────────────────┐              ┌──────────────────┐
          │   Postgres :5433    │              │   Redis :6379       │
          │   db: webos            │              │   rate limits,        │
          │   SAME DATABASE,       │              │   OTP cooldowns,       │
          │   both services         │              │   login lockout,       │
          │   read/write it          │              │   OAuth CSRF state     │
          └──────────────────┘              └──────────────────┘
```

**Critical fact**: gateway and engine are NOT currently load-balanced or
failed-over between — they're two independent, fully-working
implementations of the same auth contract, both pointed at the same
Postgres/Redis, verified to behave identically. Building the actual traffic
routing/failover between them is "the thesis" — see `docs/01-BLUEPRINT.md`.

## Per-service stack

### `services/gateway` (reference implementation, TypeScript)

- NestJS, Prisma ORM, class-validator/class-transformer
- Auth: Passport (JWT strategy + Google/GitHub OAuth strategies)
- Owns the Prisma schema and migrations — `services/gateway/prisma/`
- This is the schema of record; the Rust engine reads/writes the SAME
  tables via raw SQL (sqlx), not its own ORM/schema

### `services/engine` (Rust port, in progress)

Cargo workspace, crates:

- `engine-core` — axum HTTP server, routes, bootstrap, config, cookies,
  Redis client, mail (console-only stub — see gotchas), OAuth handlers
- `engine-auth` — pure crypto/logic: JWT sign/verify, Argon2 password
  hashing, opaque refresh tokens, OTP generation/hashing, email
  normalization, duration parsing. Unit tested, no I/O.
- `engine-data` — sqlx queries against the gateway's Prisma-owned schema.
  Models mirror real column names/types EXACTLY (see gotchas — TIMESTAMP
  vs TIMESTAMPTZ, cuid vs uuid ids, Postgres native enums).
- `engine-realtime`, `engine-security`, `engine-vision` — empty
  placeholders, scaffolded per the blueprint's target layout, not yet
  implemented.
- `engine-vision-ffi` — exists on disk, NOT a workspace member (uncomment
  in root `Cargo.toml` only once a real server-side inference need exists).

### `infra/nginx`

Single nginx config doing double duty: TLS termination (Tier 1 item 1) AND
the foundation the failover thesis will extend (currently routes only to
the gateway). See file for the `upstream` block's commented-out engine
line — that's where failover routing will actually get added.

### `infra/secrets`

`sops` + `age` encrypted `.env` backups. `.env.enc` files are safe to
commit; plaintext `.env` never is. See `docs/04-COMMANDS-REFERENCE.md` for
usage, `docs/08-INCIDENT-LOG.md` for why this exists (a real `.env` was
lost and had to be rebuilt from scratch before this existed).

### Frontends (`apps/*`) — largely unmodified by this backend work

- `apps/explorer` — Next.js, the actual product (camera-based scanning UI)
- `apps/chat` — Vue, iframed into explorer, currently backed by a mock
  responder, not yet wired to a real chat backend
- `apps/marketing` — Astro landing page
- `apps/shell` — Next.js, an early-stage desktop/window-manager concept,
  not integrated with the above yet

## Data model (owned by `services/gateway/prisma/schema.prisma`)

Tables: `users`, `sessions`, `otp_codes`, `oauth_accounts`,
`password_reset_tokens`, `audit_logs`. Key facts an agent must know before
touching any of this from the Rust side:

- `id` columns are Prisma `cuid()` strings for EXISTING rows — but that's
  generated client-side by Prisma, not a DB default. New rows inserted by
  `engine-core` use v4 UUID strings instead (documented, deliberate,
  harmless — nothing parses the id format).
- Timestamp columns (`emailVerified`, `createdAt`, etc.) are plain
  `TIMESTAMP` (no timezone) in Postgres, NOT `TIMESTAMPTZ` — this caused a
  real bug (see gotchas file). Rust models must use `NaiveDateTime`.
- `email` has a case-insensitive unique index
  (`users_email_lower_unique` migration) — a real bug was found and fixed
  here; see gotchas file before touching anything email-related.
- `provider`, `purpose`, `status` columns are native Postgres ENUM types —
  cast explicitly in SQL (`$1::"Provider"`, `::text` on read), not mapped
  via a custom sqlx type.
