#!/usr/bin/env bash
# Encrypts services/<name>/.env -> services/<name>/.env.enc
#
# Usage: ./encrypt-env.sh gateway
#        ./encrypt-env.sh engine
#
# --input-type/--output-type are passed EXPLICITLY rather than relying
# on sops' filename-extension sniffing — confirmed during setup testing
# that sops silently fails to parse a dotenv file correctly if the
# output filename doesn't end in something it recognizes (e.g. `.enc`
# alone isn't enough). Don't remove these flags to "simplify" this
# script; that reintroduces the exact bug this comment is warning about.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <gateway|engine>" >&2
  exit 1
fi

SERVICE="$1"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/services/$SERVICE/.env"
ENC_FILE="$REPO_ROOT/services/$SERVICE/.env.enc"

if [ ! -f "$ENV_FILE" ]; then
  echo "No such file: $ENV_FILE" >&2
  exit 1
fi

sops --input-type dotenv --output-type dotenv --encrypt "$ENV_FILE" > "$ENC_FILE"
echo "Encrypted $ENV_FILE -> $ENC_FILE"
echo "$ENC_FILE is safe to commit. $ENV_FILE is NOT — confirm it's still gitignored."
