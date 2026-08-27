# infra/secrets — encrypted `.env` files

Local dev still uses plaintext `.env` files exactly as before — nothing
about running the app day-to-day changes. What this adds: an
**encrypted, committable backup** of those files (`.env.enc`), so your
secrets have real version history and aren't only ever sitting on one
machine's disk in plaintext.

This is deliberately scoped for the "local dev now, real cloud
deployment later" stage this project is at. When you actually deploy to
a real cloud platform (AWS/GCP/Azure/Railway/Fly.io/etc.), that
platform's native secrets manager becomes the source of truth for
_production_ secrets — this tool is for local dev secrets, and for
safely handing secrets to a second developer/machine without pasting
them anywhere insecure.

## One-time setup

```bash
# 1. Install the tools (if not already)
sudo apt install -y age
# sops isn't in Ubuntu's default repos — grab the real binary from GitHub:
curl -sL -o /tmp/sops https://github.com/getsops/sops/releases/latest/download/sops-v3.9.4.linux.amd64
chmod +x /tmp/sops
sudo mv /tmp/sops /usr/local/bin/sops
# (check https://github.com/getsops/sops/releases for the current
#  latest version — v3.9.4 was current when this was written)

# 2. Generate your personal age keypair
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
```

That command prints a line like:

```
Public key: age19s2rrwhvk20z0a3nj89nlc96myfcew88xkrlw8rj5rcq9rxray5sklyrqe
```

**3. Back up the private key file (`~/.config/sops/age/keys.txt`) somewhere safe** —
a password manager (1Password, Bitwarden, etc.) is ideal. If you lose
this file, you permanently lose the ability to decrypt anything you've
encrypted with it. There is no recovery. Treat it with the same care as
the secrets it protects.

**4. Put the public key into `.sops.yaml`** at the repo root — replace
`REPLACE_WITH_YOUR_AGE_PUBLIC_KEY` with the public key from step 2.

**5. Tell sops where your private key lives**, every session (add to
your `~/.bashrc` so you don't have to repeat this):

```bash
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

## Day to day usage

**Encrypt your current `.env` into a committable backup:**

```bash
./infra/secrets/encrypt-env.sh gateway
./infra/secrets/encrypt-env.sh engine
```

This creates/updates `services/gateway/.env.enc` and
`services/engine/.env.enc` — safe to `git add` and commit. Run this any
time you change a real `.env` value, so the encrypted backup stays current.

**Recover a `.env` file from its encrypted backup** (e.g., on a fresh
clone, or after accidentally deleting a local `.env`):

```bash
./infra/secrets/decrypt-env.sh gateway
./infra/secrets/decrypt-env.sh engine
```

## What's actually protected, and what isn't

- **Protected**: the secret _values_ are AES-256-GCM encrypted inside
  `.env.enc`. Someone with read access to the git repo but without your
  private age key learns nothing about the actual values.
- **Not hidden**: the variable _names_ (`DATABASE_URL=`,
  `JWT_ACCESS_SECRET=`, etc.) remain visible in the encrypted file —
  this is normal/expected for sops and doesn't leak anything sensitive
  on its own.
- **Still your responsibility**: the plaintext `.env` files themselves
  must stay gitignored (already true in this repo) — this tool doesn't
  replace that, it adds a safe way to back them up alongside it.
- **The secrets already exposed earlier in this project's development**
  (pasted in chat, committed before `.gitignore` covered them, etc.)
  still need to be rotated regardless of this tool — encrypting a
  compromised secret doesn't un-compromise it.
