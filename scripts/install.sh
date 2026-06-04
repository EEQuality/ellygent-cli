#!/bin/sh
# Ellygent CLI Installer for Linux/macOS
#
# Installs the CLI from the GitHub repository using npm.
# Usage:
#   curl -fsSL https://ellygent.com/cli/install.sh | sh
#   wget -qO- https://ellygent.com/cli/install.sh | sh
#
# Optional:
#   VERSION=v0.1.1 curl -fsSL https://ellygent.com/cli/install.sh | sh

set -e

VERSION="${VERSION:-main}"
REPOSITORY_URL="git+https://github.com/EEQuality/ellygent-cli.git"

if [ "$VERSION" != "main" ]; then
  REPOSITORY_URL="${REPOSITORY_URL}#${VERSION}"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() {
  printf "${BLUE}ℹ${NC} %s\n" "$1"
}

success() {
  printf "${GREEN}✓${NC} %s\n" "$1"
}

warn() {
  printf "${YELLOW}⚠${NC} %s\n" "$1"
}

error() {
  printf "${RED}✗${NC} %s\n" "$1" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "$1 is required but was not found in PATH."
    error "$2"
    exit 1
  fi
}

main() {
  echo ""
  info "Installing Ellygent CLI from GitHub with npm"
  echo ""

  require_command node "Install Node.js 20+ from https://nodejs.org/"
  require_command npm "Install npm by installing Node.js 20+ from https://nodejs.org/"
  require_command git "Install Git from https://git-scm.com/downloads"

  info "npm package source: ${REPOSITORY_URL}"
  npm install -g "$REPOSITORY_URL"

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
