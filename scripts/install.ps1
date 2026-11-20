# Verify this wrapper against an independently trusted release record before execution.
param([string]$Version = "v0.1.4", [switch]$Rollback)
$ErrorActionPreference = "Stop"
if ($env:VERSION) { $Version = $env:VERSION }
$env:VERSION = $Version
$RuntimeSha256 = "2ad5bb56c78f615a0db76f0f40090fd17b3ad465282c03323cfe08667bbc1bff"
$RuntimeUrl = "https://ellygent.com/cli/install-runtime.mjs"
$Node = (Get-Command node -ErrorAction Stop).Source
$null = Get-Command git -ErrorAction Stop
$Temporary = Join-Path ([IO.Path]::GetTempPath()) ("ellygent-bootstrap-" + [Guid]::NewGuid().ToString("N"))
$null = New-Item -ItemType Directory -Path $Temporary
try {
    $Runtime = Join-Path $Temporary "install-runtime.mjs"
    if ($env:ELLYGENT_INSTALLER_RUNTIME) {
        Copy-Item -LiteralPath $env:ELLYGENT_INSTALLER_RUNTIME -Destination $Runtime
    } else {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $RuntimeUrl -OutFile $Runtime -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 60
    }
    if ((Get-FileHash -LiteralPath $Runtime -Algorithm SHA256).Hash.ToLowerInvariant() -ne $RuntimeSha256) {
        throw "Installer runtime checksum does not match the trusted wrapper"
    }
    if ($Rollback) { & $Node $Runtime rollback } else { & $Node $Runtime }
    if ($LASTEXITCODE -ne 0) { throw "Verified installer refused or failed; previous selection preserved" }
} finally {
    Remove-Item -LiteralPath $Temporary -Recurse -Force -ErrorAction SilentlyContinue
}
