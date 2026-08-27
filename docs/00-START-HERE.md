# START HERE — Agent Onboarding

You are picking up work on **web-os**, a polyglot monorepo undergoing a deliberate,
in-progress migration of its auth/core backend from NestJS (TypeScript) to a
new Rust "engine" service, plus production-hardening work on top. This isn't
a prototype — read `AGENTS.md` at the repo root and `services/engine/AGENTS.md`
now, before anything else. They state the standard this project is held to.

## Read these files in this exact order

1. **This file** — orientation.
2. `docs/02-ARCHITECTURE.md` — what exists, how the pieces talk to each other.
3. `docs/03-STATUS.md` — what's done (verified, not just written) vs. not started.
4. `docs/05-AGENT-RULES.md` — hard rules distilled from real mistakes made
   during this build. Read this before running ANY command that touches
   `.env` files, git, or secrets. Skipping this file has already caused a
   real data-loss incident once (see `docs/08-INCIDENT-LOG.md`) — don't
   repeat it.
5. `docs/07-KNOWN-ISSUES-AND-GOTCHAS.md` — real bugs already found and fixed.
   If something in this list looks like it's happening again, it's a
   regression, not a new discovery — check here first.
6. `docs/06-ENVIRONMENT-SETUP.md` — exact tool/language/framework versions.
7. `docs/04-COMMANDS-REFERENCE.md` — copy-pasteable commands for everything.
8. `docs/01-BLUEPRINT.md` — the production roadmap, phases, what's next.

## The one non-negotiable working style for this project

Every single piece of work in this project so far has followed this loop,
and it must continue:

1. **Read the real source** before porting/changing anything — don't infer
   behavior from a spec/contract doc if the actual source is available.
2. **Build it.**
3. **Verify it for real** — compile it, run its tests, and where possible
   test it live against the actual running system (curl, browser, direct
   DB/Redis inspection). "It compiles" and "it looks right" are explicitly
   NOT sufficient — this project has already caught multiple real bugs
   that would have shipped under that lower bar (see the gotchas file).
4. **Report honestly** — what's verified vs. assumed, what's a deliberate
   deviation from a reference implementation (and why), what's still open.
5. **Never claim something is done, tested, or secure without having
   actually observed the proof**, not inferred it.

## Who's driving this project

The person you're working with has explicitly said they are **not a
developer** and does not know what's required to make a real, production-
grade auth system. That means: don't assume they'll catch a bad idea or an
unsafe command before it runs. Explain consequences before destructive
actions. Never ask them to paste a secret into chat. Prefer commands that
verify things blindly (diff, count, boolean checks) over anything that
would print a secret to the screen or into this conversation.
