#!/bin/sh
# Ellygent CLI Installer for Linux/macOS
#
# Installs the CLI by cloning the GitHub repository and building locally.
# Usage:
#   curl -fsSL https://ellygent.com/cli/install.sh | sh
#   wget -qO- https://ellygent.com/cli/install.sh | sh
#
# Optional:
#   VERSION=v0.1.1 curl -fsSL https://ellygent.com/cli/install.sh | sh

set -e

VERSION="${VERSION:-main}"
REPOSITORY_URL="https://github.com/EEQuality/ellygent-cli.git"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
  printf "${BLUE}INFO:${NC} %s\n" "$1"
}

success() {
  printf "${GREEN}OK:${NC} %s\n" "$1"
}

warn() {
  printf "${YELLOW}WARN:${NC} %s\n" "$1"
}

error() {
  printf "${RED}ERROR:${NC} %s\n" "$1" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "$1 is required but was not found in PATH."
    error "$2"
    exit 1
  fi
}

run_step() {
  DESCRIPTION="$1"
  shift
  info "$DESCRIPTION"
  "$@"
}

normalize_ref() {
  case "$1" in
    main) printf '%s' 'main' ;;
    v*) printf '%s' "$1" ;;
    *) printf 'v%s' "$1" ;;
  esac
}

cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi

  if [ -n "$STAGED_PACKAGE_ARTIFACT" ] && [ -f "$STAGED_PACKAGE_ARTIFACT" ]; then
    rm -f "$STAGED_PACKAGE_ARTIFACT"
  fi
}

trap cleanup EXIT

clone_repo() {
  REF=$(normalize_ref "$VERSION")
  if [ "$REF" = "main" ]; then
    run_step "Cloning Ellygent CLI from GitHub (main)" git clone --depth 1 "$REPOSITORY_URL" "$TEMP_DIR"
  else
    run_step "Cloning Ellygent CLI from GitHub (${REF})" git clone --depth 1 --branch "$REF" "$REPOSITORY_URL" "$TEMP_DIR"
  fi
}

main() {
  TEMP_DIR=$(mktemp -d)
  PACKAGE_ARTIFACT=""
  STAGED_PACKAGE_ARTIFACT=$(mktemp -u "${TMPDIR:-/tmp}/ellygent-cli-install-package-XXXXXX.tgz")

  echo ""
  info "Installing Ellygent CLI from GitHub checkout with npm"
  echo ""

  require_command node "Install Node.js 20+ from https://nodejs.org/"
  require_command npm "Install npm by installing Node.js 20+ from https://nodejs.org/"
  require_command git "Install Git from https://git-scm.com/downloads"

  clone_repo
  run_step "Installing CLI dependencies" npm install --prefix "$TEMP_DIR"
  run_step "Building CLI" npm run build --prefix "$TEMP_DIR"
  run_step "Packing CLI for installation" sh -c "cd \"$TEMP_DIR\" && PACKAGE_ARTIFACT=\$(npm pack | tail -n 1) && printf '%s' \"\$PACKAGE_ARTIFACT\" > .ellygent-package-artifact"
  PACKAGE_ARTIFACT=$(cat "$TEMP_DIR/.ellygent-package-artifact")
  cp "$TEMP_DIR/$PACKAGE_ARTIFACT" "$STAGED_PACKAGE_ARTIFACT"
  info "Removing any existing global Ellygent CLI installation"
  npm uninstall -g @ellygent/cli >/dev/null 2>&1 || true
  run_step "Installing CLI globally" npm install -g "$STAGED_PACKAGE_ARTIFACT"

  if command -v ellygent >/dev/null 2>&1; then
    INSTALLED_VERSION=$(ellygent --version 2>/dev/null || echo "unknown")
    success "Installed version: ${INSTALLED_VERSION}"
    echo ""
    info "Get started with:"
    echo "  ellygent auth login --token <your-personal-access-token>"
    echo "  ellygent whoami"
    echo "  ellygent --help"
    echo ""
    exit 0
  fi

  NPM_BIN=$(npm bin -g 2>/dev/null || true)
  warn "Installation finished, but 'ellygent' is not available in the current shell yet."
  if [ -n "$NPM_BIN" ]; then
    warn "Add the npm global bin directory to PATH if needed: ${NPM_BIN}"
  fi
  warn "Restart the terminal, then run 'ellygent --version'."
  echo ""
}

main "$@"
