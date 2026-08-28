# Blueprint — Full Production Roadmap

This is the complete plan, superseding the original engine blueprint
document. It covers EVERY domain the unified Rust engine was originally
scoped to absorb (auth, chat/realtime, vision, security), how the
existing frontend apps (`apps/explorer`, `apps/chat`, `apps/shell`,
`apps/marketing`) are meant to eventually connect to it, AND the
production-hardening/deployment work layered on top. Read this
end-to-end before starting any new phase — don't just read the section
that looks relevant, since the domains depend on and inform each other.

**Read `03-STATUS.md` for the authoritative done/not-done state before
starting anything — this file is the PLAN, that file is REALITY.**

---

## The big picture — two tracks that both matter

**Track A — Engine domains** (what the Rust engine actually DOES):
Auth (done) -> Realtime/Chat -> Vision -> Security/Policy -> eventual AI
serving. Each domain follows the same pattern already proven in auth:
read the existing frontend code that expects this backend, build the
matching endpoints, verify live against the real frontend where possible.

**Track B — Production hardening & operations** (making the whole
system trustworthy and resilient): Tier 1 security hardening -> your
thesis (failover) -> observability -> real deployment. This track applies
ACROSS all of Track A's domains, not just auth.

**Track C — Frontend unification** (the actual "web-os" concept tying
the apps together): currently unresolved, blocks real progress on the
project's original vision.

These interleave. Realistic order: finish Track B's Tier 1 (mostly
done) -> Track A's Realtime domain (highest product value, apps/chat is
already built and waiting) -> Track B's thesis -> Track A's Vision domain
-> Track C -> everything else. This is a recommendation, not a hard
rule — revisit based on what actually matters most when you get here.

---

# TRACK A — Engine Domains

## A1. Auth domain — DONE

Full parity with `services/gateway`, live-verified. See `03-STATUS.md`
for the itemized breakdown. This proved the whole methodology (read
real source -> build -> verify live) that every domain below should
follow.

## A2. Realtime / Chat domain — NOT STARTED, highest product value next step

### Why this first

`apps/chat` (Vue 3 + Vite) is already fully built on the frontend
side — UI, message list, composer, markdown rendering, i18n — and
already has `useSSEChat.ts`, a composable clearly written to expect a
real Server-Sent-Events backend. It currently falls back to
`lib/mockResponder.ts`, a local fake responder, purely because no real
backend exists yet. This is the domain where finishing the backend
unlocks an already-built frontend, unlike vision (see A3) where more
frontend work would also be needed.

### What to build in `engine-realtime` (currently an empty placeholder crate)

1. **Schema** (new Prisma migration, or direct SQL matching the
   project's existing pattern of Rust reading the gateway-owned schema —
   decide which service owns this migration; recommend the gateway
   still owns migrations for consistency with the existing pattern even
   if engine-realtime is the one serving these routes):
   - `conversations` table: `id`, `userId` (FK), `title`, `createdAt`,
     `updatedAt`
   - `messages` table: `id`, `conversationId` (FK), `role`
     (`user`/`assistant`/`system`), `content`, `createdAt`
2. **The actual LLM backend — an open decision, make it explicitly**:
   options are the Anthropic API, OpenAI API, or a self-hosted model.
   Given this project already runs on Claude for its own development,
   the Anthropic API is a reasonable default, but this is a real
   product/cost decision, not a technical one — decide deliberately.
3. **Endpoints**:
   - `POST /chat/conversations` — create a new conversation
   - `GET /chat/conversations` — list the user's conversations
   - `GET /chat/conversations/:id/messages` — history
   - `POST /chat/conversations/:id/messages` — send a message, response
     is an SSE stream (`Content-Type: text/event-stream`), matching
     what `useSSEChat.ts` already expects on the frontend. In axum, this
     is `axum::response::sse::Sse` plus a stream of `Event`s — a
     genuinely different response pattern than anything built in the
     auth domain so far (all plain JSON) — budget real time for this.
4. **Auth**: reuse the existing `engine-auth::verify_access_token` plus
   cookie/header extraction pattern from `routes/auth.rs` — don't
   reinvent session validation for this domain.
5. **Rate limiting**: LLM API calls cost real money per request — this
   domain needs its OWN rate limiting beyond the generic nginx IP limit
   (Tier 1 item 3), similar in spirit to the OTP-cooldown pattern
   already built (Redis-backed, per-user this time rather than
   per-destination).
6. **Retire `mockResponder.ts`** in `apps/chat` once the real backend is
   live — but keep it around during development as a fast local-dev
   fallback (a config flag, not deleted entirely).

### Verification pattern (follow the same discipline as auth)

- Unit test the SSE event formatting logic in isolation.
- Live test: actually open `apps/chat` (needs `pnpm run dev` in that
  app — currently nothing runs it, since no frontend has been running
  throughout this project so far) pointed at the real engine endpoint,
  send a message, confirm streaming actually renders token-by-token in
  the UI, not just that curl gets a response.

## A3. Vision domain — NOT STARTED

### Current frontend state

`apps/explorer` already has a complete, working, CLIENT-SIDE vision
pipeline: `useCamera.ts` (camera access), `useVisionPipeline.ts` plus
`workers/vision.worker.ts` plus `lib/vision/frame-pipeline.ts`
(MediaPipe-based detection, running in a Web Worker for performance).
This client-side pipeline is well-built and should STAY client-side —
the actual gap is that captured frames/results currently only live in
memory/localStorage, with no persistence.

### What to build in `engine-vision` (currently an empty placeholder crate)

1. **Schema**: `scans` table — `id`, `userId`, `label`, `confidence`,
   `imageRef` (a pointer, not the raw bytes — see storage below),
   `metadata` (JSON — detection details), `createdAt`.
2. **Object storage decision** — an open decision to make explicitly:
   self-hosted MinIO (S3-compatible, good for local/self-hosted
   deployment) vs. a real cloud bucket (S3/GCS/R2) once B4 (real
   deployment) happens. Don't store image bytes in Postgres.
3. **Endpoints**:
   - `POST /vision/scans` — accept a captured frame (multipart or
     base64 JSON, decide based on typical frame size) plus detection
     metadata from the client-side pipeline, upload to object storage,
     write the row.
   - `GET /vision/scans` — paginated history.
   - `GET /vision/scans/:id` — single scan detail plus a signed URL to
     the stored image.
4. **No inference work in this phase** — the client-side MediaPipe
   pipeline already does detection. This phase is PERSISTENCE only.
   Server-side inference (the actual reason `engine-vision-ffi` would
   ever need to become a real workspace member) is explicitly a LATER,
   separate decision — don't build it speculatively; see A5 below.

### A note on the health/clinical-adjacent nature of this app's content

(wound/surgical-field/specimen scanning, per the original project
analysis) — revisit whether this domain needs stricter data handling
than a typical app once real deployment (B4) approaches: encryption at
rest for the object storage bucket specifically, audit trail retention
requirements, and whether "account deletion" (Track B Tier 1 item 4)
needs a harder guarantee for this data specifically. This was flagged
once already in this project's history as a conscious deferral, not an
oversight — don't let it stay silently deferred forever if this app
moves toward real clinical use.

## A4. Security/Policy domain — NOT STARTED

`engine-security` is currently an empty placeholder. Its actual scope
only becomes concrete once there's real inter-service traffic to
secure — currently `gateway` and `engine` don't call each other at all
(they're independent, parallel implementations, not a client/server
pair). This domain becomes relevant when:

- B2 (Track B, your thesis) is live and nginx is routing real traffic
  between two backends that might want to trust each other directly for
  some operations — that's when **mTLS between internal services**
  becomes a real, not speculative, need.
- Authorization needs to grow beyond "is this the right user" (today's
  model) into role/permission-based access — e.g. if `apps/shell`'s
  window-manager concept ever supports multi-user or team features.
- Audit log QUERYING/export becomes a real feature request (the
  `audit_logs` table already exists and is being written to across
  every auth event — this domain would be the read/query/export side).

**Don't build this speculatively** — it's listed here so its eventual
scope is understood, not as a "build this next" instruction.

## A5. Future — AI/vision inference serving, `engine-vision-ffi`

`engine-vision-ffi` exists on disk but is deliberately NOT a Cargo
workspace member (see the comment in `services/engine/Cargo.toml`).
This is correct and should stay this way until there's a genuine,
concrete server-side inference need — e.g., a model too large/slow to
run client-side, or a need to run inference on frames the client never
even needs to see fully (privacy-preserving processing). Adding this
crate to the workspace before that need is concrete would mean
compiling and maintaining a C++ FFI boundary that nothing calls — pure
premature complexity. When this DOES become real, it deserves its own
dedicated planning pass, not a bullet point here.

---

# TRACK B — Production Hardening & Operations

## B1. Tier 1 hardening — 3/6 done

- DONE — HTTPS/TLS (nginx + mkcert)
- DONE — Secrets management (sops + age)
- DONE — IP-based rate limiting (nginx, global)
- NOT STARTED — **Account deletion**: needs a `DELETE /account`
  endpoint, cascading cleanup respecting the FK `onDelete` behavior
  already defined in the Prisma schema (`sessions`/`oauth_accounts`/
  `password_reset_tokens` are `CASCADE`; `otp_codes`/`audit_logs` are
  `SET NULL` — confirmed from actual migration SQL), a re-auth/
  password-confirmation step before deletion, and a
  soft-delete-with-grace-period vs. hard-delete decision (soft delete is
  the safer default — reversible for N days).
- NOT STARTED — **New-device/location login alerts**: needs a "known
  devices" concept (User-Agent + IP fingerprint, or a persistent
  device-id cookie), comparison against `sessions`/`audit_logs` history,
  and real email delivery (this is where finishing `engine-core`'s
  deferred Resend HTTP integration — currently console-log-only —
  becomes worth doing). Consider IP geolocation (MaxMind GeoLite2) for a
  human-readable "new login from Mumbai, India" instead of a raw IP.
- NOT STARTED — **Monitoring + alerting**: see B3; treated as
  Tier-1-severity, not optional polish, since "no monitoring" is itself
  a real gap.

## B2. Your thesis — reverse-proxy automatic failover

The goal: real traffic hits nginx; nginx health-checks BOTH `gateway`
and `engine`; if the primary degrades or fails, traffic automatically
shifts to the other, transparently, without dropping user sessions
(safe specifically BECAUSE of Track A1's parity work).

1. Decide primary/backup direction deliberately (left open in this
   project's history — revisit: does the more resource-efficient
   service handle majority traffic with the other as fallback, or does
   traffic stay on the reference implementation until the engine has a
   track record?).
2. nginx `upstream` block: uncomment/configure the `backup` server line
   already stubbed in `infra/nginx/nginx.conf`, plus `max_fails`/
   `fail_timeout`.
3. Health check depth: nginx's basic passive checks are a start;
   consider active health checks (nginx Plus, or a sidecar script
   hitting each service's `/healthz` — which already reports real
   DB/Redis connectivity, not just process-alive) feeding dynamic
   upstream config via `confd`/`consul-template` or a reload trigger.
4. **Session continuity under failover is true by construction today**
   (same JWT secret, same sessions table) — but PROVE it with a
   deliberate test: hold an active session, force a failover, confirm
   the session survives. Don't assume it from the architecture.
5. Chaos testing: deliberately kill/overload the primary under
   controlled conditions, confirm failover triggers within an
   acceptable window, failback works once primary recovers, and no
   request is silently dropped mid-transition (`proxy_next_upstream`).
6. Once proven, this is the natural point to introduce canary/gradual
   traffic shifting (weighted upstream, or split by user cohort) for
   more controlled future migrations generally.

## B3. Observability

Currently: structured JSON logs exist (`tracing` in Rust, Nest's
default logger in TS) but go nowhere except the terminal — nothing
pages anyone.

- **Metrics**: Prometheus + Grafana. `engine-core` (axum) can expose
  `/metrics` via `metrics`/`metrics-exporter-prometheus`; NestJS via
  `@willsoto/nestjs-prometheus`. Track: request rate, error rate,
  p50/p95/p99 latency per route, DB pool utilization, Redis connection
  health, auth-specific counters (login success/failure rate, lockouts,
  OAuth failures), and once A2 exists, LLM token usage/cost.
- **Distributed tracing**: OpenTelemetry — shared trace-id across
  nginx -> service -> DB is what makes "which service actually handled
  this failed request" answerable once B2's failover is live and
  requests may bounce between services.
- **Log aggregation**: ship structured logs somewhere queryable (Loki
  or similar) rather than only living in each service's own stdout.
- **Alerting**: define real SLOs (e.g., "99.5% of auth requests succeed
  under 500ms") and alert on error-budget burn, not every individual
  blip — prevents alert fatigue from making real alerts get ignored.
- **Synthetic/uptime checks**: something hitting `/healthz` from
  OUTSIDE the local network, so an outage is discovered the way a real
  user would experience it, not only via internal metrics that might
  themselves be down.

## B4. Real deployment (moving off local WSL)

Deliberately deferred until Tier 1 + thesis are solid. When it starts:

- **Containerization**: Dockerfiles for `gateway` and `engine`
  (multi-stage builds — Rust especially benefits from a
  build-stage/runtime-stage split for small final images), a
  `docker-compose.yml` for local parity-with-prod, eventually
  Kubernetes or a simpler PaaS depending on scale needs.
- **Real TLS**: swap mkcert's local CA for Let's Encrypt (`certbot`, or
  a proxy that automates it like Caddy, or cert-manager on Kubernetes)
  — mkcert is explicitly local-dev-only.
- **Real secrets manager**: platform-dependent (AWS Secrets
  Manager/GCP Secret Manager/Azure Key Vault/Railway's or Fly.io's
  built-in secrets) — `infra/secrets`'s sops+age setup was explicitly a
  LOCAL-dev stopgap; revisit at this phase.
- **Database**: managed Postgres with automated backups, point-in-time
  recovery, and — once traffic justifies it — read replicas. Also the
  point to evaluate connection pooling (PgBouncer) given TWO services
  hit the same DB.
- **CI/CD**: GitHub Actions running `cargo test`/`cargo clippy`/
  `npx tsc --noEmit`/lint on every PR, building/pushing images on
  merge, a real deploy pipeline (not manual `git push` to a server).
- **Zero-downtime deploys**: rolling or blue/green, so a deploy doesn't
  drop the session continuity B2 worked to guarantee.

## B5. Tier 2/3 — deferred, tracked, not forgotten

Cherry-pick as real usage grows:

- TOTP MFA, then passkeys/WebAuthn (the latter is where the industry
  has actually moved — Google/Apple/Microsoft — prioritize over TOTP
  if picking one).
- Breached-password checking (Have I Been Pwned's k-anonymity API — no
  need to send the real password, just a hash prefix).
- User-facing session management (list/revoke devices) — data already
  exists in `sessions`, purely a UI plus thin endpoint.
- Database high availability — a DIFFERENT, more fundamental layer than
  B2's app-level failover; one Postgres instance dying takes down BOTH
  services regardless of failover between them.
- Load testing (k6, Gatling) — establish real capacity numbers instead
  of assuming "production-grade" without ever measuring.
- Fraud/anomaly detection (impossible-travel, risk scoring) — the
  deepest, most large-company-specific tier.
- Compliance readiness (SOC 2/ISO 27001) — process/audit, relevant only
  if this becomes a real commercial product handling other companies'
  data.
- Automated credential/key rotation on a schedule.

---

# TRACK C — Frontend Unification (the actual "web-os" concept)

This is the part of the original vision that ties everything together
and hasn't been touched by any backend work so far.

## The current, unresolved duality

`apps/shell` has a fully-built Zustand window-manager store
(`lib/store/windows.ts` — open/close/focus/move/resize/minimize/
maximize, z-index stacking) but its actual page (`page.tsx`) just
renders "Blank canvas — ready." Meanwhile `apps/explorer` is a
complete, real, full-featured single-page app with its OWN navigation,
sidebar, and routing — not built as something meant to live inside a
window. This needs a deliberate decision, not an accidental default:
does `explorer` (and eventually `chat` in its own window, not just
iframed inside explorer as it is today) become a window hosted BY
`shell`, or does `shell`'s window-manager concept get retired in favor
of `explorer` staying the primary app shell? This decision blocks real
progress on the "OS" framing of this project and should happen before
more frontend work compounds on either assumption.

## `packages/ipc` — currently empty, but needed regardless of the decision above

Cross-app communication already exists, ad hoc: `apps/explorer`'s
`ChatEmbed.tsx` uses raw `postMessage` to talk to the iframed
`apps/chat`. Once more apps need to talk to each other (chat needing to
know what scan explorer just captured, shell needing to broadcast
window focus events, etc.), this ad hoc pattern won't scale. Build a
shared, TYPED IPC layer in `packages/ipc` — a thin wrapper over
`postMessage`/`BroadcastChannel` with a defined message schema (a
discriminated union of event types, shared TypeScript types imported by
every app) — so cross-app messages are compile-time checked rather than
stringly-typed and hoped-for.

## Auth cookie sharing across apps

`apps/explorer` already has real login/signup/OTP UI built and wired to
the gateway (`lib/auth-api.ts`), gated by a lightweight `proxy.ts`
cookie check. Once `chat`/`shell`/other apps need the same
authenticated session, confirm the cookie domain/path configuration
(`COOKIE_DOMAIN` env var, already parameterized in both
`services/gateway` and `services/engine`) is set up to actually be
shared correctly across whatever ports/subdomains these apps run on —
this hasn't been tested with more than one frontend app running
simultaneously yet.
