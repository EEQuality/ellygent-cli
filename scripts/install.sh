#!/bin/sh
# Ellygent CLI Installer for Linux/macOS
# 
# Usage:
#   curl -fsSL https://ellygent.com/cli/install.sh | sh
#   wget -qO- https://ellygent.com/cli/install.sh | sh
#
# Or with specific version:
#   VERSION=0.1.1 curl -fsSL https://ellygent.com/cli/install.sh | sh

set -e

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BASE_URL="${BASE_URL:-https://ellygent.com/downloads/cli}"
VERSION="${VERSION:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
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

# Detect platform and architecture
detect_platform() {
  local os=""
  local arch=""

  # Detect OS
  case "$(uname -s)" in
    Linux*)     os="linux" ;;
    Darwin*)    os="macos" ;;
    *)          
      error "Unsupported operating system: $(uname -s)"
      exit 1
      ;;
  esac

  # Detect architecture
  case "$(uname -m)" in
    x86_64|amd64)  arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      error "Unsupported architecture: $(uname -m)"
      exit 1
      ;;
  esac

  echo "${os}-${arch}"
}

# Download file with checksum verification
download_with_checksum() {
  local url="$1"
  local output="$2"
  local checksum_url="${BASE_URL}/${VERSION}/checksums.txt"

  info "Downloading from ${url}..."
  
  # Try curl, fall back to wget
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$output" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$output" "$url"
  else
    error "Neither curl nor wget found. Please install one and try again."
    exit 1
  fi

  # Verify checksum if sha256sum is available
  if command -v sha256sum >/dev/null 2>&1; then
    info "Verifying checksum..."
    
    # Download checksums file
    local checksums_file="/tmp/ellygent-checksums.txt"
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL -o "$checksums_file" "$checksum_url" 2>/dev/null || true
    else
      wget -q -O "$checksums_file" "$checksum_url" 2>/dev/null || true
    fi

    if [ -f "$checksums_file" ]; then
      local filename=$(basename "$output")
      local expected_checksum=$(grep "$filename" "$checksums_file" | awk '{print $1}')
      
      if [ -n "$expected_checksum" ]; then
        local actual_checksum=$(sha256sum "$output" | awk '{print $1}')
        
        if [ "$expected_checksum" = "$actual_checksum" ]; then
          success "Checksum verified"
        else
          error "Checksum verification failed"
          error "Expected: $expected_checksum"
          error "Got:      $actual_checksum"
          rm -f "$output"
          exit 1
        fi
      else
        warn "Checksum not found in checksums file, skipping verification"
      fi
      
      rm -f "$checksums_file"
    else
      warn "Could not download checksums file, skipping verification"
    fi
  else
    warn "sha256sum not available, skipping checksum verification"
  fi
}

# Main installation
main() {
  echo ""
  info "Ellygent CLI Installer"
  echo ""

  # Detect platform
  local platform=$(detect_platform)
  info "Detected platform: ${platform}"

  # Determine binary name and URL
  local binary_name="ellygent-${platform}"
  local download_url="${BASE_URL}/${VERSION}/${binary_name}"
  
  # Download binary
  local temp_file="/tmp/${binary_name}"
  download_with_checksum "$download_url" "$temp_file"

  # Make executable
  chmod +x "$temp_file"

  # Install to target directory
  info "Installing to ${INSTALL_DIR}..."
  
  # Check if we need sudo
  if [ -w "$INSTALL_DIR" ]; then
    mv "$temp_file" "${INSTALL_DIR}/ellygent"
  else
    info "Administrator privileges required for ${INSTALL_DIR}"
    sudo mv "$temp_file" "${INSTALL_DIR}/ellygent"
  fi

  success "Ellygent CLI installed successfully!"
  echo ""
  
  # Verify installation
  if command -v ellygent >/dev/null 2>&1; then
    local installed_version=$(ellygent --version 2>/dev/null || echo "unknown")
    success "Installed version: ${installed_version}"
    echo ""
    info "Get started with:"
    echo "  ellygent login --token <your-personal-access-token>"
    echo "  ellygent whoami"
    echo "  ellygent --help"
  else
    warn "Installation complete, but 'ellygent' is not in PATH"
    warn "You may need to add ${INSTALL_DIR} to your PATH"
    echo ""
    info "Add to PATH:"
    echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
  fi
  
  echo ""
}

# Run main installation
main "$@"
