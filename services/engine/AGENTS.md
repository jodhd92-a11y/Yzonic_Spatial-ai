# AGENTS.md — services/engine

This file is a standing instruction for any AI assistant (Claude, or any
other coding agent) working in `services/engine`. Read this before making
changes here.

## The standard: production-grade, not prototype

Every component of this engine — auth, data layer, realtime, vision,
security, whatever gets added next — is being built as **real,
production-grade infrastructure for a system that will actually run in
production.** It is explicitly NOT a prototype, a showcase, a learning
exercise, or a proof-of-concept, even though it started from one and is
being built incrementally.

This has concrete consequences for how work here should be done:

1. **No silent shortcuts.** If something is simplified, deferred, or
   deviates from the reference implementation (`services/gateway`) for
   any reason — time, complexity, missing infrastructure — it must be:
   - Clearly documented in the code (a doc comment explaining what and
     why, not just a `// TODO`)
   - Called out explicitly to the person you're working with, not buried
   - Tracked as an open item to resolve before this is considered
     production-ready, not accepted as a permanent state

2. **Parity with the reference implementation is not optional.** Where
   `services/engine` reimplements something `services/gateway` already
   does (currently: the full auth surface), the new implementation must
   match the original's _behavior_ exactly — error messages, status
   codes, security properties (constant-time comparisons, lockout
   thresholds, token TTLs), not just its rough shape. When porting
   logic, read the original source in full before writing the port;
   don't infer behavior from a spec/contract doc alone if the real
   source is available — the contract docs here
   (`contracts/openapi.yaml`) were themselves generated FROM the real
   source and can drift, so the source is more authoritative.

3. **Test before declaring something done.** Unit tests for pure logic
   (crypto, parsing, validation). Side-by-side live testing against the
   reference implementation for anything behavioral (same request to
   both services, diff the responses). "It compiles" and "it looks
   right" are not sufficient on their own — this codebase has already caught
   multiple real bugs (a JWT clock-skew leeway mismatch, a
   TIMESTAMP-vs-TIMESTAMPTZ column type error, a missing audit-log
   write) that would have shipped if compilation success had been
   treated as sufficient.

4. **Security-critical code gets full scrutiny every time**, not just
   when it's new. Password hashing, token generation/rotation,
   rate-limiting, session validation — every change to these areas
   should be reviewed as carefully as the first time they were written,
   not treated as "already solved, don't need to look closely."

5. **This is heading toward real infrastructure, including automatic
   failover.** The end goal is not "two services that happen to both
   work" — it's a real reverse-proxy/load-balancer setup in front of
   `services/gateway` and `services/engine` with health checks and
   automatic failover between them, which is only safe because of (2)
   and (3) above. Keep that end state in mind: behavioral drift between
   the two services isn't just a correctness issue, it's what would make
   automatic failover unsafe (a user silently losing their session
   because the two services disagree on how to validate it).

## What "not done yet" looks like right now (as of this writing)

Tracked explicitly so it doesn't get silently forgotten as "close enough":

- OTP delivery is console-log-only, not real Resend HTTP delivery.
- Per-IP route throttling (as opposed to the already-ported per-account
  login lockout / per-destination OTP rate limits) is not implemented.
- New row IDs are v4 UUIDs, not real Prisma `cuid()` — functionally fine
  (nothing parses the id format) but worth knowing.
- No reverse proxy / load balancer / automatic failover exists yet —
  both services currently run independently with nothing routing
  traffic between them. This is the actual next major milestone.
- No production deployment story (containers, orchestration, secrets
  management, TLS termination) exists yet.
- OAuth is implemented but only smoke-tested by the person driving this,
  not yet verified against both providers in a live end-to-end run at
  the time of writing — confirm this has actually happened before
  treating OAuth as fully closed.

Update this list as items get resolved or new ones get identified —
don't let it go stale.
