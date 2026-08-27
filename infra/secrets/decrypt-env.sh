#!/usr/bin/env bash
# Decrypts services/<name>/.env.enc -> services/<name>/.env
#
# Requires SOPS_AGE_KEY_FILE to point at your private age key (see
# infra/secrets/README.md for how that key is generated/stored — it is
# NEVER committed to this repo).
#
# Usage: ./decrypt-env.sh gateway
#        ./decrypt-env.sh engine
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <gateway|engine>" >&2
  exit 1
fi

if [ -z "${SOPS_AGE_KEY_FILE:-}" ]; then
  echo "SOPS_AGE_KEY_FILE is not set. Point it at your private age key first, e.g.:" >&2
  echo "  export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt" >&2
  exit 1
fi

SERVICE="$1"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENC_FILE="$REPO_ROOT/services/$SERVICE/.env.enc"
ENV_FILE="$REPO_ROOT/services/$SERVICE/.env"

if [ ! -f "$ENC_FILE" ]; then
  echo "No such file: $ENC_FILE" >&2
  exit 1
fi

sops --input-type dotenv --output-type dotenv --decrypt "$ENC_FILE" > "$ENV_FILE"
echo "Decrypted $ENC_FILE -> $ENV_FILE"
