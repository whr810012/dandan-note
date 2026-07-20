$ErrorActionPreference = "Stop"

$exe = Join-Path $PSScriptRoot "..\src-tauri\target\release\app.exe"
if (-not (Test-Path $exe)) {
  Write-Host "Executable not found. Building first..."
  & npm run desktop:build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Get-CimInstance Win32_Process |
  Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like '*\src-tauri\target\release\app.exe' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Milliseconds 400

try {
  Start-Process -FilePath $exe
  Write-Host "Started: $exe"
} catch {
  Write-Host "Direct launch blocked by Windows policy."
  Write-Host "Please open this file manually in Explorer and allow it if prompted:"
  Write-Host $exe
  Invoke-Item (Split-Path $exe -Parent)
  exit 1
}
