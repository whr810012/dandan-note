param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "build-bundle")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

$vswhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) {
  Write-Error "Visual Studio Installer not found."
  exit 1
}

$installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -format value
if (-not $installPath) {
  Write-Error "MSVC C++ build tools were not found. Run npm run env:check first."
  exit 1
}

$devCmd = Join-Path $installPath "Common7\Tools\VsDevCmd.bat"
if (-not (Test-Path $devCmd)) {
  Write-Error "VsDevCmd.bat not found at $devCmd"
  exit 1
}

$projectRoot = Split-Path $PSScriptRoot -Parent
# Prefer a LocalAppData target dir so Windows app-control policies are less likely
# to block freshly generated cargo build-script binaries under the repo path.
$defaultTarget = Join-Path $env:LOCALAPPDATA "dandan-note-cargo-target"
$targetDir = if ($env:DANDAN_CARGO_TARGET_DIR) {
  $env:DANDAN_CARGO_TARGET_DIR
} else {
  $defaultTarget
}
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$env:CARGO_TARGET_DIR = $targetDir

$tauriCommand = switch ($Mode) {
  "dev" { "npm run tauri -- dev" }
  "build" { "npm run tauri -- build --no-bundle" }
  "build-bundle" { "npm run tauri -- build" }
}

$cmdLine = "call `"$devCmd`" -arch=x64 && $tauriCommand"
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/d", "/c", $cmdLine -Wait -NoNewWindow -PassThru -WorkingDirectory $projectRoot
exit $process.ExitCode
