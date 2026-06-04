# Ellygent CLI Installer for Windows
#
# Installs the CLI by cloning the GitHub repository and building locally.
# Usage:
#   irm https://ellygent.com/cli/install.ps1 | iex
#
# Optional:
#   $env:VERSION = "v0.1.1"; irm https://ellygent.com/cli/install.ps1 | iex

param(
    [string]$Version = "main"
)

if ($env:VERSION) {
    $Version = $env:VERSION
}

$RepositoryUrl = "https://github.com/EEQuality/ellygent-cli.git"

function Write-Info {
    param([string]$Message)
    Write-Host "INFO: " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "OK: " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host "WARN: " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "ERROR: " -ForegroundColor Red -NoNewline
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

function Invoke-Step {
    param(
        [string]$Description,
        [scriptblock]$Action
    )

    Write-Info $Description
    & $Action
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "$Description failed"
        exit $LASTEXITCODE
    }
}

function Install-EllygentCli {
    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ellygent-cli-install-" + [System.Guid]::NewGuid().ToString("N"))
    $packageArtifact = $null

    Write-Host ""
    Write-Info "Installing Ellygent CLI from GitHub checkout with npm"
    Write-Host ""

    Assert-Command -Name "node" -InstallHint "Install Node.js 20+ from https://nodejs.org/"
    Assert-Command -Name "npm" -InstallHint "Install npm by installing Node.js 20+ from https://nodejs.org/"
    Assert-Command -Name "git" -InstallHint "Install Git from https://git-scm.com/download/win"

    $packageVersion = $null

    try {
        if ($Version -and $Version -ne "main") {
            $normalizedVersion = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
            Invoke-Step -Description "Cloning Ellygent CLI from GitHub ($normalizedVersion)" -Action {
                git clone --depth 1 --branch $normalizedVersion $RepositoryUrl $tempRoot
            }
        } else {
            Invoke-Step -Description "Cloning Ellygent CLI from GitHub (main)" -Action {
                git clone --depth 1 $RepositoryUrl $tempRoot
            }
        }

        Invoke-Step -Description "Installing CLI dependencies" -Action {
            npm install --prefix $tempRoot
        }

        Invoke-Step -Description "Building CLI" -Action {
            npm run build --prefix $tempRoot
        }

        $packageJson = Get-Content (Join-Path $tempRoot 'package.json') -Raw | ConvertFrom-Json
        $packageVersion = $packageJson.version

        Invoke-Step -Description "Packing CLI for installation" -Action {
            Push-Location $tempRoot
            try {
                $script:packageArtifact = ((npm pack) | Select-Object -Last 1).Trim()
            } finally {
                Pop-Location
            }
        }

        Invoke-Step -Description "Installing CLI globally" -Action {
            npm install -g (Join-Path $tempRoot $packageArtifact)
        }
    } finally {
        if (Test-Path $tempRoot) {
            Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Add-NpmBinToPathIfNeeded

    $ellygent = Get-Command ellygent -ErrorAction SilentlyContinue
    if (-not $ellygent) {
        Write-Warn "Installation finished, but 'ellygent' is not available in the current shell yet."
        Write-Warn "Restart the terminal, then run 'ellygent --version'."
        return
    }

    $installedVersion = if ($packageVersion) { $packageVersion } else { "unknown" }
    Write-Success "Installed version: $installedVersion"
    Write-Host ""
    Write-Info "Get started with:"
    Write-Host "  ellygent auth login --token <your-personal-access-token>"
    Write-Host "  ellygent whoami"
    Write-Host "  ellygent --help"
    Write-Host ""
}

Install-EllygentCli
