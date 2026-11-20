#!/bin/sh
# Download/review this wrapper and compare its SHA256 with an independently trusted release record first.
# Default: audited v0.1.4 source commit, verified lockfile, versioned managed install.
set -eu
umask 077
VERSION="${VERSION:-v0.1.4}"
export VERSION
RUNTIME_SHA256="2ad5bb56c78f615a0db76f0f40090fd17b3ad465282c03323cfe08667bbc1bff"
RUNTIME_URL="https://ellygent.com/cli/install-runtime.mjs"
command -v node >/dev/null 2>&1 || { echo 'Node.js20+ required' >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo 'Git required' >&2; exit 1; }
TEMP_DIR=$(mktemp -d)
trap 'rm -rf -- "$TEMP_DIR"' EXIT HUP INT TERM
if [ -n "${ELLYGENT_INSTALLER_RUNTIME:-}" ]; then
  cp -- "$ELLYGENT_INSTALLER_RUNTIME" "$TEMP_DIR/install-runtime.mjs"
else
  command -v curl >/dev/null 2>&1 || { echo 'curl required to retrieve verified installer runtime' >&2; exit 1; }
  env -u CURL_CA_BUNDLE -u SSL_CERT_FILE -u SSL_CERT_DIR curl --disable --fail --silent --show-error --proto '=https' --tlsv1.2 --connect-timeout 10 --max-time 60 "$RUNTIME_URL" -o "$TEMP_DIR/install-runtime.mjs"
fi
node -e 'const fs=require("fs"),c=require("crypto");if(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex")!==process.argv[2])process.exit(2)' "$TEMP_DIR/install-runtime.mjs" "$RUNTIME_SHA256"
node "$TEMP_DIR/install-runtime.mjs" "$@"
