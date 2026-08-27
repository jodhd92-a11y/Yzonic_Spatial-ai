# Commands Reference

All commands assume WSL2 (Ubuntu) on Windows, repo at `~/web-os`. Adjust
paths for other environments.

## Infra (Postgres, Redis) — must be running before anything else

```bash
sudo service postgresql status
sudo service postgresql start      # if not running
sudo service redis-server status
sudo service redis-server start    # if not running
redis-cli ping                     # expect PONG
psql "postgresql://postgres:devpassword@127.0.0.1:5433/webos" -c '\dt'
```

**Use `127.0.0.1`, not `localhost`, in DATABASE_URL** — see gotchas file
for why (`sqlx` IPv6/IPv4 resolution timeout).

## Gateway (NestJS)

```bash
cd ~/web-os/services/gateway
pnpm install
pnpm exec prisma migrate deploy       # apply migrations to a fresh DB
pnpm exec prisma migrate dev --create-only --name <migration_name>  # scaffold a new migration
pnpm run start:dev                    # watch mode, port 4000
npx tsc --noEmit -p .                 # real project-wide type check (NOT single-file — see gotchas)
```

## Engine (Rust)

```bash
cd ~/web-os/services/engine
set -a && source .env && set +a       # MUST be re-run every new terminal session
cargo build -p engine-core
cargo run -p engine-core               # port 4100
cargo test -p engine-auth              # unit tests, no DB/Redis needed
cargo test --workspace                 # everything
cargo clippy -p engine-core
```

Env vars must be sourced in the SAME shell that runs `cargo run` — sourcing
in one terminal does not carry to another.

## nginx (TLS + rate-limiting proxy)

```bash
sudo nginx -t -c ~/web-os/infra/nginx/nginx.conf     # validate syntax
sudo nginx -c ~/web-os/infra/nginx/nginx.conf         # start
sudo nginx -s stop -c ~/web-os/infra/nginx/nginx.conf # stop
sudo nginx -s reload -c ~/web-os/infra/nginx/nginx.conf # reload config without dropping connections
ps aux | grep nginx | grep -v grep                    # confirm running
```

The system's default `nginx.service` (from `apt install nginx`) must stay
**disabled** (`sudo systemctl disable nginx`) — see gotchas file for the
pid-file collision this causes otherwise.

## Secrets (sops + age)

```bash
# one-time setup
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
echo 'export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt' >> ~/.bashrc
source ~/.bashrc

# day to day
cd ~/web-os
./infra/secrets/encrypt-env.sh gateway   # .env -> .env.enc
./infra/secrets/encrypt-env.sh engine
./infra/secrets/decrypt-env.sh gateway   # .env.enc -> .env (recovery)
./infra/secrets/decrypt-env.sh engine
```

`.sops.yaml` MUST live at the repo root (sops searches upward from the
target file, not down into subdirectories).

## Verifying `.env` values WITHOUT exposing them (use these, always)

```bash
# does a var exist and have a non-placeholder value?
grep -c '""' path/to/.env                          # 0 = no empty placeholders

# do two files' values for the same key match?
diff <(grep '^KEY_NAME=' file1.env) <(grep '^KEY_NAME=' file2.env) && echo MATCH || echo MISMATCH

# copy one file's value into another, blind (value never printed)
LINE=$(grep '^KEY_NAME=' source.env)
sed -i "s|^KEY_NAME=.*|$LINE|" dest.env
unset LINE
```

**Never** `cat` a `.env` file's contents into chat or a shared terminal
transcript. See `docs/05-AGENT-RULES.md`.

## Testing an auth flow end to end

```bash
# 1. signup
curl -i -X POST http://localhost:4000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"SomePassword123!"}'

# 2. get the OTP — gateway: check MAIL_PROVIDER destination (Resend dashboard
#    or console log). engine: always console-logged, check its terminal.

# 3. verify (this logs you in, sets cookies)
curl -c cookies.jar -i -X POST http://localhost:4000/auth/verify-otp -H "Content-Type: application/json" -d '{"email":"test@example.com","code":"123456","purpose":"SIGNUP_VERIFY"}'

# 4. confirm session
curl -i http://localhost:4000/auth/me -b cookies.jar

# 5. clean up afterward
curl -i -X POST http://localhost:4000/auth/logout-all -b cookies.jar
rm cookies.jar
```

Swap port 4000→4100 to run the exact same sequence against the engine —
useful for side-by-side parity checks.

## Database inspection (direct, bypasses both services — ground truth)

```bash
psql "postgresql://postgres:devpassword@127.0.0.1:5433/webos" -c "SELECT id, email, \"emailVerified\" FROM users ORDER BY \"createdAt\" DESC LIMIT 5;"
psql "..." -c "SELECT provider, \"providerAccountId\", \"userId\" FROM oauth_accounts ORDER BY \"createdAt\" DESC LIMIT 5;"
psql "..." -c "SELECT LOWER(email), COUNT(*) FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;"  # duplicate-email check
```

## Rate-limit / flood test (nginx)

```bash
for i in $(seq 1 30); do curl -k -s -o /dev/null -w "%{http_code} " https://localhost:8443/; done; echo
# expect: run of 200s, then 429s once burst is exhausted
```

## Git — safe-by-default patterns used throughout this project

```bash
git status --short              # ALWAYS review before add/commit, every time
git check-ignore -v <path>       # check if a path is ignored (see gotchas re: negation-pattern ambiguity)
git add -f <path>                # test whether git WOULD stage an ignored file — real proof, check-ignore's exit code is not
git log --all --full-history -- '**/.env' '**/cookies.txt'   # audit history for leaked secrets before ANY push
git log --all -p | grep -iE "SECRET=|API_KEY=" | wc -l         # broader secret-pattern scan
```
