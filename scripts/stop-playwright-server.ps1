param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoPidPath = Join-Path $repoRoot ".tmp-playwright-server.pid"
$repoStdoutLog = Join-Path $repoRoot ".tmp-playwright-server.out.log"
$repoStderrLog = Join-Path $repoRoot ".tmp-playwright-server.err.log"

if (Test-Path $repoPidPath) {
  $pidValue = Get-Content $repoPidPath -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($pidValue) {
    $numericPid = 0
    if ([int]::TryParse($pidValue, [ref]$numericPid)) {
      if (Get-Process -Id $numericPid -ErrorAction SilentlyContinue) {
        Stop-Process -Id $numericPid -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

Remove-Item $repoPidPath, $repoStdoutLog, $repoStderrLog -Force -ErrorAction SilentlyContinue
