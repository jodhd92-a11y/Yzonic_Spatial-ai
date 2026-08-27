# Agent Rules — Read Before Touching Anything

These are not theoretical best practices. Every rule below exists because
NOT following it already caused a real problem during this project's
build. Cross-reference `docs/08-INCIDENT-LOG.md` and
`docs/07-KNOWN-ISSUES-AND-GOTCHAS.md` for the full story behind each.

## Secrets — absolute rules, no exceptions

1. **NEVER ask the person to paste a secret value into chat.** Not a
   password, not a JWT secret, not an API key. If you need to confirm a
   value, use a blind check (`diff` on grep output, `grep -c '""'` for
   emptiness, boolean match/mismatch) — never one that prints the value.
2. **If a secret DOES get exposed** (person pastes it despite the above,
   or it ends up in a log/transcript) — treat it as compromised
   immediately. Tell them to rotate it. Don't just move on.
3. **Never `cat` a `.env` file's full contents anywhere it will be
   displayed** — to the agent, in a transcript, in a screenshot request.
4. **Every new secret-bearing entry point needs its var added to
   `infra/secrets/README.md`'s workflow** — don't let new secrets exist
   only as plaintext with no encrypted backup story.

## Destructive commands — think before every `rm`, `touch` + `rm` combo, `git reset`

5. **Before writing `rm <path>` in any instruction, ask: could this path
   already contain real, non-reproducible data?** A real incident
   happened: `touch services/gateway/.env.enc services/gateway/.env`
   followed by `rm services/gateway/.env.enc services/gateway/.env` was
   given as a "gitignore test" cleanup step, without noticing the REAL
   `.env` (with live secrets) already existed at that exact path. `touch`
   on an existing file only updates its timestamp — it does NOT create a
   safe empty stand-in. The `rm` right after destroyed a real file.
   **Fix pattern going forward: use paths that cannot collide with real
   files for throwaway tests** (e.g. a scratch dir, or names with an
   obvious "-test-" marker), or explicitly check `ls -la <path>` and warn
   before any `rm` that touches a path matching `.env`, `*.pem`, `*.key`,
   or anything in `infra/secrets/`.
6. **Before any `git push` to a remote** (especially first push / new
   remote), run the full history audit from `04-COMMANDS-REFERENCE.md`
   (secret scan, large-file scan) — every time, not just once.
7. **`git status --short` before every commit, read it, don't just trust
   `git add -A` did the right thing.** Look specifically for: any bare
   `.env` (not `.env.example`, not `.env.enc`), duplicate/nested paths
   from a bad unzip (this happened — `infra/nginx/nginx/nginx.conf`),
   stray OS artifacts (`*:Zone.Identifier` on WSL).

## Verification — the actual standard, not a suggestion

8. **"It compiles" is not "it's correct."** This project's sandbox often
   cannot even compile the Rust engine (see gotchas — ancient apt-only
   rustc, huge dependency trees hit `edition2024` walls). When that's the
   case, do the most rigorous MANUAL review possible (trace every
   ownership/borrow/type at every call site) — this has already caught
   real bugs (a dropped `mod tests {` line, missing `chrono`/`sqlx`
   deps in `Cargo.toml`) — but always say plainly that manual review is
   not the same as compilation and ask the person to run the real build
   and report back errors verbatim.
9. **When porting logic from one implementation to another (TS→Rust so
   far), read the ENTIRE real source file(s) first** — not a summary, not
   the contract doc alone (contract docs can drift; they were generated
   FROM the source, so the source is more authoritative when they
   disagree). This project found real behavioral gaps this way (JWT
   leeway default, a missing audit-log call inside `resetPassword`'s
   internal `logoutAll` invocation).
10. **A live test beats a code review, every time it's feasible.** Several
    real bugs in this project were ONLY caught by actually running the
    flow against the real database/Redis (TIMESTAMP-vs-TIMESTAMPTZ,
    email case-sensitivity duplicate accounts, the nginx pid-file
    collision). Don't skip live testing because "the code looks right."
11. **When a test result is ambiguous, don't trust the ambiguous signal —
    find a more definitive one.** `git check-ignore -v`'s exit code with
    negation patterns turned out to be confusing; the actual proof was
    `git add` + `git status --short`. Prefer ground-truth checks (does
    the DB row exist, does the HTTP response match, does the file
    actually decrypt byte-identical via `diff`) over interpreting a
    tool's possibly-ambiguous secondary signal.

## Honesty / scope discipline

12. **Never claim parity, security, or "done" status without the
    specific verification that proves it.** State exactly what was
    checked and what wasn't. This project maintains an explicit ⚠️ status
    for things that are built-but-not-fully-verified (see
    `03-STATUS.md`) rather than rounding up to ✅.
13. **Flag deliberate deviations from a reference implementation
    explicitly, in both code comments and to the person** — never let a
    "close enough" port pass as faithful. Example done right: OAuth CSRF
    protection was ADDED (the gateway has none) — this was called out as
    an improvement, not silently shipped as if it were parity.
14. **Don't inflate scope claims.** "Production-grade for a real
    single-service app with resilience between two backends" is an
    honest description of where this project can realistically get.
    "Enterprise-grade" implies RBAC, SSO, multi-tenancy, DB clustering,
    compliance audits — none of which exist here. Say the true thing.

## Toolchain / environment specifics for THIS sandbox vs. the real dev machine

15. Sandbox tool-use environments used to help build this may have an
    ancient, apt-only Rust toolchain (1.75, Dec 2023) incompatible with
    much of current crates.io (`edition2024` requirement). This is NOT a
    real constraint on the person's actual machine (which has 1.93+ via
    apt directly, confirmed working). Don't propagate sandbox-only
    version pins (`time = "=0.3.36"` etc.) into deliverables — strip them
    before packaging, as was done for every Rust patch in this project.
16. WSL2 has a SEPARATE certificate trust store from Windows. `mkcert
-install` inside WSL does not make Windows browsers trust the cert —
    the CA must also be imported into Windows' own trust store
    (`certutil -addstore -f "ROOT" <path-to-rootCA.pem>` from an admin
    PowerShell). See gotchas file.
17. WSL2 `sqlx`/Rust DB connections to `localhost` can hang/timeout due to
    IPv6-before-IPv4 resolution order, even when `psql`/Node connect
    fine with the same hostname. Use `127.0.0.1` explicitly in
    `DATABASE_URL` for the Rust engine.
