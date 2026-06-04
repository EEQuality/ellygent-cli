# Ellygent CLI Installer for Windows
# 
# Usage:
#   irm https://ellygent.com/cli/install.ps1 | iex
#
# Or with specific version:
#   $env:VERSION = "0.1.0"; irm https://ellygent.com/cli/install.ps1 | iex

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Ellygent\bin",
    [string]$BaseURL = "https://ellygent.com/downloads/cli",
    [string]$Version = "latest"
)

# Use environment variable version if set
if ($env:VERSION) {
    $Version = $env:VERSION
}

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# Detect architecture
function Get-Architecture {
    $arch = [System.Environment]::GetEnvironmentVariable("PROCESSOR_ARCHITECTURE")
    
    switch ($arch) {
        "AMD64" { return "x64" }
        "ARM64" { return "arm64" }
        default { 
            Write-Fail "Unsupported architecture: $arch"
            exit 1
        }
    }
}

# Download file with progress
function Download-File {
    param(
        [string]$Url,
        [string]$Output
    )
    
    Write-Info "Downloading from $Url..."
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing
        $ProgressPreference = 'Continue'
        return $true
    }
    catch {
        Write-Fail "Download failed: $_"
        return $false
    }
}

# Verify checksum
function Test-Checksum {
    param(
        [string]$FilePath,
        [string]$ExpectedChecksum
    )
    
    if (-not $ExpectedChecksum) {
        Write-Warn "No checksum provided, skipping verification"
        return $true
    }
    
    Write-Info "Verifying checksum..."
    
    $hash = Get-FileHash -Path $FilePath -Algorithm SHA256
    $actualChecksum = $hash.Hash.ToLower()
    $ExpectedChecksum = $ExpectedChecksum.ToLower()
    
    if ($actualChecksum -eq $ExpectedChecksum) {
        Write-Success "Checksum verified"
        return $true
    }
    else {
        Write-Fail "Checksum verification failed"
        Write-Fail "Expected: $ExpectedChecksum"
        Write-Fail "Got:      $actualChecksum"
        return $false
    }
}

# Get checksum from checksums file
function Get-ExpectedChecksum {
    param(
        [string]$Filename,
        [string]$ChecksumsUrl
    )
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        $checksums = Invoke-WebRequest -Uri $ChecksumsUrl -UseBasicParsing
        $ProgressPreference = 'Continue'
        
        $lines = $checksums.Content -split "`n"
        foreach ($line in $lines) {
            if ($line -match "(\w+)\s+$Filename") {
                return $matches[1]
            }
        }
    }
    catch {
        Write-Warn "Could not download checksums file"
    }
    
    return $null
}

# Add to PATH
function Add-ToPath {
    param([string]$Directory)
    
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($userPath -notlike "*$Directory*") {
        Write-Info "Adding to PATH..."
        $newPath = "$userPath;$Directory"
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        
        # Update current session
        $env:Path = "$env:Path;$Directory"
        
        Write-Success "Added to PATH"
        return $true
    }
    
    return $false
}

# Main installation
function Install-EllygentCLI {
    Write-Host ""
    Write-Info "Ellygent CLI Installer for Windows"
    Write-Host ""
    
    # Detect architecture
    $arch = Get-Architecture
    Write-Info "Detected architecture: $arch"
    
    # Determine binary name and URL
    $binaryName = "ellygent-win-$arch.exe"
    $downloadUrl = "$BaseURL/$Version/$binaryName"
    $checksumsUrl = "$BaseURL/$Version/checksums.txt"
    
    # Create temporary directory
    $tempDir = Join-Path $env:TEMP "ellygent-install"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir | Out-Null
    }
    
    $tempFile = Join-Path $tempDir $binaryName
    
    # Download binary
    if (-not (Download-File -Url $downloadUrl -Output $tempFile)) {
        exit 1
    }
    
    # Get and verify checksum
    $expectedChecksum = Get-ExpectedChecksum -Filename $binaryName -ChecksumsUrl $checksumsUrl
    if (-not (Test-Checksum -FilePath $tempFile -ExpectedChecksum $expectedChecksum)) {
        Remove-Item $tempFile -Force
        exit 1
    }
    
    # Create install directory
    Write-Info "Installing to $InstallDir..."
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    # Copy binary
    $targetPath = Join-Path $InstallDir "ellygent.exe"
    Copy-Item -Path $tempFile -Destination $targetPath -Force
    
    # Clean up
    Remove-Item $tempFile -Force
    
    Write-Success "Ellygent CLI installed successfully!"
    Write-Host ""
    
    # Add to PATH
    Add-ToPath -Directory $InstallDir
    
    # Verify installation
    try {
        $version = & $targetPath --version 2>$null
        Write-Success "Installed version: $version"
    }
    catch {
        Write-Warn "Installation complete, but could not verify version"
    }
    
    Write-Host ""
    Write-Info "Get started with:"
    Write-Host "  ellygent auth login"
    Write-Host "  ellygent --help"
    Write-Host ""
    
    if ($env:Path -notlike "*$InstallDir*") {
        Write-Warn "Please restart your terminal for PATH changes to take effect"
    }
}

# Run installation
Install-EllygentCLI
