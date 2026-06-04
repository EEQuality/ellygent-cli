# Ellygent CLI Installer for Windows
#
# Installs the CLI from a GitHub Release package using npm.
# Usage:
#   irm https://ellygent.com/cli/install.ps1 | iex
#
# Optional:
#   $env:VERSION = "v0.1.1"; irm https://ellygent.com/cli/install.ps1 | iex

param(
    [string]$Version = "latest"
)

if ($env:VERSION) {
    $Version = $env:VERSION
}

$PackageUrl = "https://github.com/EEQuality/ellygent-cli/releases/latest/download/ellygent-cli-latest.tgz"
if ($Version -and $Version -ne "latest") {
    $normalizedVersion = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
    $packageVersion = $normalizedVersion.TrimStart("v")
    $PackageUrl = "https://github.com/EEQuality/ellygent-cli/releases/download/$normalizedVersion/ellygent-cli-$packageVersion.tgz"
}

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

function Assert-Command {
    param(
        [string]$Name,
        [string]$InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Fail "$Name is required but was not found in PATH."
        Write-Host "  $InstallHint"
        exit 1
    }
}

function Add-NpmBinToPathIfNeeded {
    $npmPrefix = & npm config get prefix 2>$null
    if (-not $npmPrefix) {
        return
    }

    $npmBin = Join-Path $npmPrefix "node_modules\.."
    $resolvedBin = [System.IO.Path]::GetFullPath($npmBin)
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")

    if ($userPath -notlike "*$resolvedBin*") {
        [System.Environment]::SetEnvironmentVariable("Path", "$userPath;$resolvedBin", "User")
        $env:Path = "$env:Path;$resolvedBin"
        Write-Success "Added npm global bin to PATH: $resolvedBin"
    }
}

function Install-EllygentCli {
    Write-Host ""
    Write-Info "Installing Ellygent CLI from GitHub Release with npm"
    Write-Host ""

    Assert-Command -Name "node" -InstallHint "Install Node.js 20+ from https://nodejs.org/"
    Assert-Command -Name "npm" -InstallHint "Install npm by installing Node.js 20+ from https://nodejs.org/"
    Assert-Command -Name "git" -InstallHint "Install Git from https://git-scm.com/download/win"

    Write-Info "npm package source: $PackageUrl"
    & npm install -g $PackageUrl
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm installation failed"
        exit $LASTEXITCODE
    }

    Add-NpmBinToPathIfNeeded

    $ellygent = Get-Command ellygent -ErrorAction SilentlyContinue
    if (-not $ellygent) {
        Write-Warn "Installation finished, but 'ellygent' is not available in the current shell yet."
        Write-Warn "Restart the terminal, then run 'ellygent --version'."
        return
    }

    $installedVersion = & $ellygent.Source --version 2>$null
    Write-Success "Installed version: $installedVersion"
    Write-Host ""
    Write-Info "Get started with:"
    Write-Host "  ellygent auth login --token <your-personal-access-token>"
    Write-Host "  ellygent whoami"
    Write-Host "  ellygent --help"
    Write-Host ""
}

Install-EllygentCli
