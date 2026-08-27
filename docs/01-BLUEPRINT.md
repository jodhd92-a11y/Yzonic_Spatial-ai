# Blueprint — Production Roadmap

This supersedes the original engine blueprint document. It reflects what
was actually learned building phases 1–3 (the Rust engine's full auth
parity + OAuth) and expands the remaining phases with concrete tooling,
concepts, and practices beyond what was originally scoped — because
building the first phases surfaced real requirements (secrets recovery,
TLS trust on WSL, DB-level data integrity) that weren't anticipated
up front, and that pattern will likely continue.

**Read `03-STATUS.md` for the authoritative done/not-done state before
starting any phase below — this file describes the PLAN, that file
describes REALITY.**

---

## Phase 0–3 (DONE) — Rust engine core + full auth parity + OAuth

Cargo workspace at `services/engine/`, crates: `engine-core`,
`engine-auth`, `engine-data`, plus empty placeholders `engine-realtime`,
`engine-security`, `engine-vision` (scaffolded per target layout, not
implemented), and `engine-vision-ffi` (on disk, not a workspace member —
add only once a real server-side inference need exists, per the
blueprint's original "what NOT to do" guidance).

Delivered: signup/login/refresh-rotation/logout/password-reset,
Google+GitHub OAuth with account linking and CSRF protection (an
improvement over the reference implementation, which has none), full
byte-for-byte behavioral parity with `services/gateway` verified live.
See `03-STATUS.md` for the itemized list.

---

## Phase 4 — Tier 1 hardening (IN PROGRESS — 3/6 done)

Goal: make the CURRENT single-service reality (traffic still only ever
hits the gateway; the engine is proven but not yet receiving real
traffic) safe enough that "real users" is a responsible thing to say.

- ✅ TLS (nginx + mkcert locally; real deployment needs a real CA —
  see Phase 7)
- ✅ Secrets encrypted at rest (sops+age)
- ✅ Global IP rate limiting (nginx)
- ❌ **Account deletion** — needs: a `DELETE /account` endpoint (both
  services, or route exclusively through whichever is live), cascading
  cleanup respecting the FK `onDelete` behavior already defined in the
  Prisma schema (`sessions`/`oauth_accounts`/`password_reset_tokens` are
  `CASCADE`; `otp_codes`/`audit_logs` are `SET NULL` — confirmed from
  the actual migration SQL, not assumed), a re-authentication or
  password-confirmation step before deletion (don't let a hijacked
  session silently delete an account), and a decision on hard-delete vs.
  soft-delete-with-grace-period (soft delete is generally the safer,
  more forgiving default for user-facing products — reversible for N
  days before permanent purge).
- ❌ **New-device/location login alerts** — needs: a "known devices"
  concept (fingerprint via User-Agent + IP, or a persistent device-id
  cookie), a comparison against `sessions`/`audit_logs` history to
  detect "first time we've seen this fingerprint for this user," and
  real email delivery (this is also where finishing the deferred
  `engine-core` Resend HTTP integration becomes worth doing — currently
  console-log-only). Consider IP geolocation (e.g. MaxMind GeoLite2) for
  a human-readable "new login from Mumbai, India" rather than a raw IP.
- ❌ **Monitoring + alerting** — see Phase 6, pulled forward conceptually
  here because "no monitoring" is itself a Tier-1-severity gap, not
  optional polish.

---

## Phase 5 — Your thesis: reverse-proxy automatic failover

The actual goal: real traffic hits nginx; nginx health-checks BOTH
`gateway` and `engine`; if the primary degrades or fails, traffic
automatically shifts to the other, transparently, without dropping user
sessions (which is only safe because of the parity work already done —
see `AGENTS.md`'s explicit framing of this connection).

Concrete build steps:

1. Decide primary/backup direction deliberately (this was left open in
   conversation — revisit: does the more resource-efficient service
   handle the majority of traffic, with the other as fallback, or does
   traffic stay on the reference implementation until the engine has a
   track record?).
2. nginx `upstream` block: uncomment and configure the `backup` server
   line already stubbed in `infra/nginx/nginx.conf`, plus `max_fails`/
   `fail_timeout` for automatic failure detection.
3. **Health check depth matters** — nginx's basic passive health checks
   (fail after N failed proxy attempts) are a start, but consider nginx
   Plus's active health checks or a sidecar health-check script hitting
   each service's `/healthz` (which already reports real DB/Redis
   connectivity, not just process-alive) on an interval, feeding into
   nginx's `upstream` state via `ngx_http_upstream_module` conf reload
   or a tool like `confd`/`consul-template` for dynamic upstream config.
4. **Session continuity under failover** — already true today since both
   services validate the SAME JWT secret and read the SAME sessions
   table; a mid-session failover should be transparent BY CONSTRUCTION.
   This needs a deliberate test: hold an active session, force a
   failover, confirm the session survives — don't assume it from the
   architecture, prove it.
5. **Chaos testing** — deliberately kill/overload the primary under
   controlled conditions and confirm: (a) failover actually triggers,
   (b) within an acceptable time window, (c) failback to primary works
   once it recovers, (d) no request is silently dropped during the
   transition (nginx should retry against the backup on a proxy error,
   via `proxy_next_upstream`).
6. Once this is proven, THIS is also the natural point to introduce
   **canary/gradual traffic shifting** (e.g., weighted upstream, or
   splitting by user cohort) rather than all-or-nothing failover, for
   more controlled future migrations of any service.

---

## Phase 6 — Observability (monitoring, alerting, logging)

Currently: structured JSON logs exist (`tracing` in Rust, Nest's default
logger in TS) but go nowhere except the terminal. Nothing pages anyone.

- **Metrics**: Prometheus + Grafana is the standard, well-documented
  open-source pairing. `engine-core` (axum) can expose a `/metrics`
  endpoint via `metrics`/`metrics-exporter-prometheus` crates; NestJS via
  `@willsoto/nestjs-prometheus`. Track at minimum: request rate, error
  rate, p50/p95/p99 latency per route, DB pool utilization, Redis
  connection health, auth-specific counters (login success/failure rate,
  lockouts triggered, OAuth failures).
- **Distributed tracing**: OpenTelemetry — both services emitting spans
  with a shared trace-id across the nginx→service→DB call chain is what
  makes "which of the two services actually handled this failed
  request" answerable during a real incident, especially once Phase 5's
  failover is live and requests may bounce between services.
- **Log aggregation**: ship structured logs somewhere queryable (Loki,
  or a hosted option) rather than only living in each service's stdout —
  critical once this isn't just one person's terminal.
- **Alerting**: define actual SLOs (e.g., "99.5% of auth requests
  succeed in under 500ms") and alert on error-budget burn, not on every
  individual blip — this is the core SRE practice that prevents alert
  fatigue from making real alerts get ignored.
- **Uptime/synthetic checks**: an external service (or a simple cron
  script) hitting `/healthz` from OUTSIDE the local network, so you find
  out about an outage the same way a real user would, not only via
  internal metrics that might themselves be down.

---

## Phase 7 — Real deployment (moving off local WSL)

Not yet started; deliberately deferred until Tier 1 + thesis are solid,
per explicit earlier decision in this project. When this phase starts:

- **Containerization**: Dockerfiles for `gateway` and `engine` (multi-stage
  builds — Rust especially benefits from a build-stage/runtime-stage split
  to keep final images small), a `docker-compose.yml` for local
  parity-with-prod, eventually Kubernetes or a simpler PaaS depending on
  scale needs.
- **Real TLS**: swap mkcert's local CA for Let's Encrypt (via
  `certbot` or a proxy that automates it, e.g. Caddy, or cert-manager if
  on Kubernetes) — mkcert is explicitly local-dev-only, never use it
  anywhere real users connect.
- **Real secrets manager**: whichever cloud platform is chosen dictates
  this (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault /
  Railway's or Fly.io's built-in secrets) — `infra/secrets`'s sops+age
  setup was explicitly built as a LOCAL-dev-appropriate stopgap for this
  exact reason; revisit at this phase, don't assume it scales to
  production as-is.
- **Database**: managed Postgres (RDS/Cloud SQL/etc.) with automated
  backups, point-in-time recovery, and — once traffic justifies it —
  read replicas. This is also the point to seriously evaluate connection
  pooling (PgBouncer) given TWO services will be hitting the same DB.
- **CI/CD**: GitHub Actions (repo is already on GitHub) running
  `cargo test`/`cargo clippy`/`npx tsc --noEmit`/lint on every PR,
  building and pushing container images on merge to main, with a real
  deploy pipeline (not manual `git push` to a server).
- **Zero-downtime deploys**: rolling updates or blue/green, so a deploy
  doesn't drop the exact kind of active session continuity Phase 5
  worked to guarantee.

---

## Phase 8+ — Tier 2/3 (deferred, tracked, not forgotten)

Cherry-pick as real usage grows, per the earlier explicit scoping
decision (Tier 1 + thesis first):

- TOTP (authenticator app) MFA, then **passkeys/WebAuthn** — the latter
  is genuinely where the industry (Google/Apple/Microsoft) has moved;
  worth prioritizing over TOTP if picking one.
- Breached-password checking (Have I Been Pwned's k-anonymity API — no
  need to send the real password, just a hash prefix).
- User-facing session management (list/revoke devices) — the DATA
  already exists in `sessions`, this is purely a UI + thin endpoint.
- Database high availability (replication/clustering) — a DIFFERENT,
  more fundamental layer than Phase 5's app-level failover; a single
  Postgres instance dying takes down both services regardless of
  failover between them.
- Load testing (k6, Gatling, or similar) — establish real capacity
  numbers instead of assuming "production-grade" without ever measuring.
- Fraud/anomaly detection (impossible-travel checks, risk scoring) —
  the deepest, most large-company-specific tier; genuinely optional
  until there's a real abuse signal to respond to.
- Compliance readiness (SOC 2 / ISO 27001) — mostly process/audit, not
  code; relevant only if this becomes a real commercial product handling
  other companies' data.
- Automated credential/key rotation — JWT signing keys, DB credentials
  rotating on a schedule rather than staying static indefinitely.

---

## Cross-cutting practices to apply throughout, not as a separate phase

- **Dependency vulnerability scanning**: `cargo audit` (Rust),
  `npm audit` / GitHub's Dependabot (Node) — wire into CI once Phase 7's
  pipeline exists; run manually before then.
- **Idempotency**: any endpoint with real side effects that could be
  retried by a flaky client (payment-adjacent stuff especially, but also
  worth considering for signup/OTP issuance) benefits from an
  idempotency-key pattern to avoid double-processing.
- **API versioning strategy**: decide EARLY (e.g., `/v1/auth/...`) before
  the engine's routes get consumed by a real frontend — retrofitting
  versioning after clients depend on unversioned routes is painful.
- **CORS hardening**: `CORS_ORIGIN` is currently a permissive
  comma-separated localhost list; tighten to the real deployed frontend
  origin(s) only once Phase 7 has a real domain.
- **Feature flags**: worth introducing before Phase 5's failover work, so
  "route N% of traffic to engine" or "enable new-device alerts" can be
  toggled without a redeploy — even a simple env-var-driven flag system
  is better than none.
