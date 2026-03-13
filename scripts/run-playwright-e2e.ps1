param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PlaywrightArgs
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$playwrightExitCode = 0
$previousNoServer = $env:PLAYWRIGHT_NO_SERVER

Push-Location $repoRoot
try {
  & (Join-Path $PSScriptRoot "start-playwright-server.ps1")

  $env:PLAYWRIGHT_NO_SERVER = "1"
  & pnpm exec playwright test e2e @PlaywrightArgs
  $playwrightExitCode = $LASTEXITCODE
} finally {
  if ($null -eq $previousNoServer) {
    Remove-Item Env:PLAYWRIGHT_NO_SERVER -ErrorAction SilentlyContinue
  } else {
    $env:PLAYWRIGHT_NO_SERVER = $previousNoServer
  }

  & (Join-Path $PSScriptRoot "stop-playwright-server.ps1")
  Pop-Location
}

exit $playwrightExitCode
