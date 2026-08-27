# Environment Setup

Target environment used throughout this project: **WSL2 (Ubuntu) on
Windows 11**. Everything below assumes that unless noted.

## Languages / runtimes

| Tool       | Version used                                        | Install                                                                                                   |
| ---------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Node.js    | via pnpm-managed / system                           | —                                                                                                         |
| pnpm       | 9.x (upgrade available, not yet done — see gotchas) | `corepack enable` or per repo's `packageManager` field                                                    |
| Rust       | 1.93.1 (via `apt install rustc cargo`)              | `sudo apt install -y rustc cargo pkg-config libssl-dev`                                                   |
| PostgreSQL | 16, local install (not Docker)                      | `sudo apt install postgresql`, listens on port **5433** (non-default — check `sudo ss -tlnp \| grep 543`) |
| Redis      | local install (not Docker)                          | `sudo apt install redis-server`                                                                           |

`rust-toolchain.toml` in `services/engine/` is set to `channel = "stable"`
— apt's plain `cargo`/`rustc` ignore this file (it's a `rustup`-only
mechanism), which is fine since apt's version is already newer than
what's needed.

## Infra tools

| Tool   | Purpose            | Install                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nginx  | 1.24.x             | `sudo apt install nginx` — **then `sudo systemctl disable nginx`**, see gotchas                                                                                                                                                                                                                                                    |
| mkcert | 1.4.4              | `sudo apt install mkcert`                                                                                                                                                                                                                                                                                                          |
| age    | 1.1.1              | `sudo apt install age`                                                                                                                                                                                                                                                                                                             |
| sops   | 3.9.4 (not in apt) | download binary directly: `curl -sL -o /tmp/sops https://github.com/getsops/sops/releases/download/v3.9.4/sops-v3.9.4.linux.amd64 && chmod +x /tmp/sops && sudo mv /tmp/sops /usr/local/bin/sops` — **use the exact versioned URL, `latest/download/<versioned-filename>` silently 404s and downloads an HTML error page instead** |

## Key Rust crates (services/engine)

axum 0.7, tokio, tower/tower-http, sqlx 0.7 (postgres, rustls, chrono,
uuid, json features), jsonwebtoken 9, argon2 0.5, sha2, rand, subtle
(constant-time compare), redis 0.24 (tokio-comp, connection-manager),
reqwest 0.12 (rustls-tls, no default features — avoids needing system
OpenSSL), urlencoding, uuid, chrono, tracing/tracing-subscriber.

## Key Node packages (services/gateway)

NestJS core + Passport (jwt, google-oauth20, github2 strategies),
Prisma + `@prisma/client`, class-validator + class-transformer, argon2
(node-argon2), ioredis, helmet, `@nestjs/throttler`, resend (mail).

## Ports in use

| Port | What                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 4000 | gateway (NestJS)                                                                                                                |
| 4100 | engine (Rust)                                                                                                                   |
| 5433 | Postgres (non-default port — verify with `ss -tlnp`)                                                                            |
| 6379 | Redis                                                                                                                           |
| 8080 | nginx (HTTP, redirects to 8443)                                                                                                 |
| 8443 | nginx (HTTPS)                                                                                                                   |
| 3000 | intended frontend port (referenced in OAuth redirect targets, CORS config) — no frontend is actually running as of this writing |

## Known-good local `.env` shape (values redacted — see infra/secrets)

Both `services/gateway/.env` and `services/engine/.env` need:
`DATABASE_URL` (port 5433, db `webos`, use `127.0.0.1` for the engine),
`REDIS_URL`, `JWT_ACCESS_SECRET` (byte-identical across both services —
this is load-bearing), `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN`.
Gateway additionally needs `PORT`, `NODE_ENV`, `CORS_ORIGIN`,
`COOKIE_DOMAIN`, `MAIL_PROVIDER`/`MAIL_API_KEY`/`MAIL_FROM`,
`FRONTEND_URL`. Both need `GOOGLE_CLIENT_ID`/`SECRET`/`CALLBACK_URL` and
`GITHUB_CLIENT_ID`/`SECRET`/`CALLBACK_URL` (client id/secret shared
between the two services, but `CALLBACK_URL` MUST differ — gateway uses
port 4000, engine uses port 4100 — see gotchas re: OAuth provider
redirect-URI registration).

Never write these values out in full anywhere. Use
`infra/secrets/decrypt-env.sh` to reconstruct from the committed
encrypted backup.
