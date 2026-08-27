# Incident Log

Chronological record of security-relevant events during this project's
build. Kept honestly, including the agent's own mistakes, because an
accurate history is more useful to future work than a flattering one.

## Incident 1 — repeated plaintext secret exposure in chat, early build phase

Multiple real secrets were pasted into the conversation over the course
of early setup: the original `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`,
a Resend `MAIL_API_KEY`, Google and GitHub OAuth client secrets, and at
least one real account password. Each time this happened, the response
was: flag it immediately, do not proceed as if it were fine, walk through
rotating that specific credential (`openssl rand -hex 32` for JWT
secrets, provider dashboards for OAuth/mail secrets, the service's own
password-reset flow for account passwords), and establish a "blind"
verification workflow going forward (diff-based match checks,
grep-count-based emptiness checks) instead of ever displaying a value
directly. A `cookies.txt` file containing a live session's JWT and
refresh token (committed as an artifact from local testing, not from git
history) was also found and removed, with `.gitignore` updated to
prevent recurrence.

**Lesson embedded in `05-AGENT-RULES.md` rules #1–4.**

## Incident 2 — real `.env` file deleted via a careless test-cleanup instruction

During `.gitignore` verification testing, the agent instructed:

```
touch services/gateway/.env.enc services/gateway/.env
... (git add tests) ...
rm services/gateway/.env.enc services/gateway/.env
```

intending this as a safe, throwaway test using empty files. The
instruction did not account for the fact that a REAL, fully-configured
`services/gateway/.env` (built up over the entire project — real
`DATABASE_URL`, `JWT_ACCESS_SECRET`, OAuth credentials, mail API key)
already existed at that exact path. `touch` on an existing file only
updates its modification time; it does not empty or replace the
content. The subsequent `rm` deleted the real file permanently.

**Recovery**: the file was rebuilt field by field. Values with a known,
non-sensitive shape (`DATABASE_URL`, `REDIS_URL`, port numbers, CORS
origins) were reconstructed directly. `JWT_ACCESS_SECRET`/
`JWT_REFRESH_SECRET` could not be recovered (never shared with or stored
by the agent, by design) and were regenerated fresh via `openssl rand
-hex 32` — an acceptable outcome since it only meant existing sessions
were invalidated, not a security problem, and it had the side benefit of
retiring an earlier-exposed secret too. OAuth client secrets and the
Resend API key were regenerated from their respective provider
dashboards (Google Cloud Console, GitHub Developer Settings, Resend).
Every rebuilt value was then synced into `services/engine/.env` using the
blind-copy pattern and verified with `diff`-based match checks. Both
services were confirmed working end-to-end afterward (real signup/OAuth
tests, not just "file looks complete").

**This incident is the direct reason `infra/secrets/` (sops+age encrypted
backups) exists.** It was built and committed to git immediately
following this recovery, specifically so that a future loss of this kind
has a real, tested recovery path that doesn't require manually
reconstructing every value by hand again.

**Lesson embedded in `05-AGENT-RULES.md` rule #5 and
`07-KNOWN-ISSUES-AND-GOTCHAS.md` #14.**

## Incident 3 — Google OAuth client secret limit hit during rotation

While rotating the Google OAuth client secret as part of Incident 2's
recovery, discovered Google allows a maximum of 2 active secrets per
OAuth client, requiring deletion of both old (compromised) secrets before
a new one could be created. Not a security incident in itself, but
documented here since it affected the recovery sequence — resolved by
deleting both old secrets first, then generating one fresh one.

## Non-incidents worth noting (things that looked like problems but weren't)

- A `git reset` after cleaning up test files printed a long list of
  "Unstaged changes after reset" — this was git's normal informational
  summary of the difference between the last commit and the working
  directory (i.e., all of this project's accumulated unfinished work),
  not anything the `reset` command damaged.
- Browser "Not Secure" appearance after the TLS proxy was correctly
  configured turned out to be the WSL/Windows cert-trust-store split
  (see gotchas #9), not a flaw in the actual TLS setup — the encryption
  itself was genuinely correct throughout.
