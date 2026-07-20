$ErrorActionPreference = "Stop"

$downloadDir = Join-Path $env:TEMP "desktop-note-buildtools"
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

$installer = Join-Path $downloadDir "vs_BuildTools.exe"
$uri = "https://aka.ms/vs/17/release/vs_BuildTools.exe"

Write-Host "Downloading Visual Studio Build Tools..."
Invoke-WebRequest -Uri $uri -OutFile $installer

Write-Host "Installing C++ build tools. This may take several minutes..."
$arguments = @(
  "--quiet",
  "--wait",
  "--norestart",
  "--add", "Microsoft.VisualStudio.Workload.VCTools",
  "--includeRecommended"
)

$process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
  Write-Error "Build Tools install failed with exit code $($process.ExitCode)."
  exit $process.ExitCode
}

Write-Host "Build Tools installation finished."
Write-Host "Run: npm run env:check"
Write-Host "Then: npm run desktop:dev"
