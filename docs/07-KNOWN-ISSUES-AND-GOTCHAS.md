# Known Issues & Gotchas — Real Bugs Already Found (Don't Rediscover These)

Each entry: what happened, root cause, the fix, how it was verified.

## 1. Postgres columns are `TIMESTAMP`, not `TIMESTAMPTZ`

Rust model used `chrono::DateTime<Utc>` for `emailVerified`/`createdAt`,
matching what a Prisma `DateTime` field "should" be. sqlx threw a runtime
type-mismatch error. Root cause: Prisma's `DateTime` maps to plain
`TIMESTAMP` unless the schema explicitly adds `@db.Timestamptz`, which
this schema doesn't. **Fix**: use `chrono::NaiveDateTime` in the Rust
model; convert to `DateTime<Utc>` (assuming UTC) only at the JSON-response
boundary, to match the gateway's own "treat as UTC, append Z" behavior.
Verified via live `/auth/me` byte-for-byte diff against the gateway.

## 2. `jsonwebtoken` (Rust) defaults to 60s leeway; Node's `jsonwebtoken` defaults to 0

A unit test asserting an expired token is rejected FAILED — the crate's
default `Validation` tolerates up to 60 seconds of clock skew on `exp`.
Node's `jsonwebtoken` (what the gateway's `JwtStrategy` uses) has zero
leeway by default. Left unfixed, engine-core would have accepted access
tokens for up to 60s longer than the gateway would. **Fix**: explicitly
set `validation.leeway = 0` in `engine-auth::verify_access_token`.

## 3. `sops` format detection breaks silently without explicit `--input-type`/`--output-type`

Encrypting a `.env` file to an output named `.env.enc` and then trying to
decrypt it failed with a JSON parse error, because `sops` infers format
from the filename EXTENSION, and `.enc` isn't a recognized extension.
**Fix**: always pass `--input-type dotenv --output-type dotenv` explicitly
on both encrypt and decrypt (already baked into
`infra/secrets/{encrypt,decrypt}-env.sh` — don't remove these flags).

## 4. `.sops.yaml` must live at the repo root

`sops` discovers its config by walking UPWARD from the file being
encrypted's directory — not by searching the whole repo tree. Placing it
in `infra/secrets/` (a sibling, not an ancestor, of
`services/gateway/.env`) meant it was never found. **Fix**: `.sops.yaml`
lives at the repo root.

## 5. `.sops.yaml`'s `path_regex` matches the INPUT filename during encryption, not the output

A rule written as `path_regex: \.env\.enc$` never matched, because
`sops --encrypt services/gateway/.env > .../.env.enc` evaluates the rule
against `services/gateway/.env` (the input), not the redirected output
name. **Fix**: rule is `path_regex: /\.env$`.

## 6. `.gitignore`'s `.env.*` rule also silently matches `.env.enc`

Without an explicit negation, the encrypted backups (which are meant to
be committed) would be silently gitignored right alongside the real
`.env` files — defeating the entire point. **Fix**: added
`!.env.enc` / `!*/.env.enc` / `!*/*/.env.enc` negation rules AFTER the
`.env.*` rule (order matters — git uses last-matching-rule-wins).
Verified with real `git add` + `git status`, not just `check-ignore`
(see #12 below for why).

## 7. nginx pid-file collision between a custom instance and the system service

`apt install nginx` registers a systemd service using the DEFAULT
`/run/nginx.pid`. Starting a second, custom-config nginx instance
WITHOUT an explicit `pid` directive means it silently shares that same
pid file. Running `sudo systemctl restart nginx` then killed the custom
instance too (or instead of) the system one. **Fix**: the project's
`infra/nginx/nginx.conf` sets an explicit, distinct `pid` and `error_log`
path. Verified by deliberately recreating the collision (starting both,
restarting the system service, confirming the custom instance survives).

## 8. `sqlx`/Rust hangs connecting to `localhost` on WSL2; `psql` and Node work fine

Rust's `sqlx` pool timed out connecting to `postgresql://...@localhost:5433/...`
even though `psql` with the identical connection string worked instantly.
Root cause: WSL2 can resolve `localhost` to IPv6 (`::1`) first, and if
Postgres is only listening on IPv4 (confirmed via `ss -tlnp` showing only
`127.0.0.1:5433`), `sqlx` hangs/times out on the IPv6 attempt in a way
`psql`/Node's driver route around more gracefully. **Fix**: use
`127.0.0.1` explicitly in the engine's `DATABASE_URL`, not `localhost`.

## 9. WSL's Linux certificate trust store is separate from Windows' trust store

`mkcert -install` inside WSL only registers the CA in WSL's own trust
store. A Windows browser (Chrome/Edge/Firefox running on Windows, which
is the common case even when developing inside WSL) has never heard of
this CA and shows "Not Secure" even though the TLS handshake itself is
completely correctly configured. **Fix**: export the CA
(`mkcert -CAROOT` to find it, file is `rootCA.pem`) and import it
SEPARATELY into Windows' Trusted Root store, e.g. via an admin PowerShell:
`certutil -addstore -f "ROOT" <path-to-rootCA.pem>`. Firefox specifically
keeps its OWN cert store even on Windows and needs a further separate
step if used. Verified via Chrome's own certificate inspector showing the
correct issuer chain and "Connection is secure."

## 10. GitHub OAuth Apps support only ONE registered redirect URI (Google supports multiple)

Attempting to add a second callback URL (for testing the engine on port
4100 alongside the gateway on port 4000) the same way as Google doesn't
work — GitHub OAuth Apps have a single redirect URL field. **Fix**:
register a SEPARATE GitHub OAuth App specifically for the engine, with
its own Client ID/Secret and its own single callback URL pointing at
port 4100.

## 11. Email case-sensitivity — real duplicate-account bug, inherited from the reference implementation

Found via live OAuth testing: Google normalizes email to lowercase on
return; a password-signup account created with mixed-case email became
functionally invisible to OAuth account-linking, risking a second,
disconnected account for the same real person. Confirmed the ORIGINAL
NestJS gateway ALSO never normalizes email case anywhere (`grep -rn
"toLowerCase" services/gateway/src/auth/` returned nothing before the
fix) — this was not a Rust-port-introduced bug. **Fix, three layers**:
(a) DB-level `CREATE UNIQUE INDEX users_email_lower_unique ON users
(LOWER(email))` migration — the actual enforcement, works regardless of
which service/future-service writes; (b) `engine_auth::normalize_email`
applied at every Rust entry point; (c) `@Transform(({value}) =>
value?.trim().toLowerCase())` added to every email field across all 4
gateway DTOs, plus both OAuth strategy files. All three verified live.

## 12. `git check-ignore -v`'s exit code with negation patterns is genuinely ambiguous

Tried to verify the `.env.enc` gitignore fix using `git check-ignore -v`
— its behavior when the LAST matching rule is a negation is confusing/
inconsistently documented across git versions. **Don't rely on
`check-ignore`'s exit code alone for this.** Use the ground-truth test
instead: `git add <path>` on both the file that should be ignored and the
one that shouldn't, then `git status --short` — git's real staging
behavior is unambiguous proof.

## 13. `npx tsc --noEmit <single-file>` gives false-positive errors on NestJS DTOs

Checking a single DTO file in isolation (bypassing the project's real
`tsconfig.json`) produced spurious "property has no initializer" errors
on EVERY field, including ones never touched — because NestJS DTOs are
populated at runtime by `class-transformer`, which the project's real
tsconfig is configured to allow, but an isolated single-file check
doesn't know that context. **Fix**: always check with the real project
config: `npx tsc --noEmit -p .` from the service's root, or better, just
watch the actual `pnpm run start:dev` watcher's own output.

## 14. `touch` + `rm` on a path that might already hold real data — see incident log

Documented fully in `08-INCIDENT-LOG.md`. Summarized in
`05-AGENT-RULES.md` rule #5. The short version: `touch` does not create a
safe blank file if one already exists at that path — it only updates the
timestamp. A `rm` given as a "test cleanup" step right after destroyed a
real, populated `.env` file.
