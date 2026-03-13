param()

$ErrorActionPreference = "Stop"

function Test-UrlReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 0
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ge 200 -and $statusCode -lt 400) {
      return $true
    }

    return $false
  }
}

function Wait-ForUrlReady {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  do {
    if (Test-UrlReady -Url $Url) {
      return $true
    }

    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  return $false
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$defaultPort = if ($env:PLAYWRIGHT_PORT) { $env:PLAYWRIGHT_PORT } else { "3100" }
$baseUrl = if ($env:PLAYWRIGHT_BASE_URL) { $env:PLAYWRIGHT_BASE_URL } else { "http://127.0.0.1:$defaultPort" }
$baseUri = [Uri]$baseUrl
$localHosts = @("127.0.0.1", "localhost", "::1", "[::1]")
$manageLocalServer =
  $env:PLAYWRIGHT_NO_SERVER -ne "1" -and
  $localHosts -contains $baseUri.Host

if (-not $manageLocalServer) {
  exit 0
}

$repoDevRouteUrl = "$baseUrl/api/dev/env-check"
$repoPidPath = Join-Path $repoRoot ".tmp-playwright-server.pid"
$repoStdoutLog = Join-Path $repoRoot ".tmp-playwright-server.out.log"
$repoStderrLog = Join-Path $repoRoot ".tmp-playwright-server.err.log"

if (Test-UrlReady -Url $repoDevRouteUrl) {
  exit 0
}

Push-Location $repoRoot
try {
  pnpm build
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm build failed before Playwright server startup."
  }
} finally {
  Pop-Location
}

Remove-Item $repoStdoutLog, $repoStderrLog, $repoPidPath -Force -ErrorAction SilentlyContinue

$nodeCommand = Get-Command node -ErrorAction Stop
$nextCliPath = Join-Path $repoRoot "node_modules\next\dist\bin\next"
$previousPlaywrightTest = $env:PLAYWRIGHT_TEST
$env:PLAYWRIGHT_TEST = "1"

try {
  $serverProcess = Start-Process `
  -FilePath $nodeCommand.Source `
  -ArgumentList $nextCliPath, "start", "-H", $baseUri.Host, "-p", "$($baseUri.Port)" `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $repoStdoutLog `
  -RedirectStandardError $repoStderrLog `
  -PassThru
} finally {
  if ($null -eq $previousPlaywrightTest) {
    Remove-Item Env:PLAYWRIGHT_TEST -ErrorAction SilentlyContinue
  } else {
    $env:PLAYWRIGHT_TEST = $previousPlaywrightTest
  }
}

Set-Content -Path $repoPidPath -Value $serverProcess.Id

if (-not (Wait-ForUrlReady -Url $repoDevRouteUrl -TimeoutSeconds 45)) {
  if (Get-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  }

  Write-Host "Playwright server stdout:"
  if (Test-Path $repoStdoutLog) {
    Get-Content $repoStdoutLog
  }

  Write-Host "Playwright server stderr:"
  if (Test-Path $repoStderrLog) {
    Get-Content $repoStderrLog
  }

  Remove-Item $repoPidPath -Force -ErrorAction SilentlyContinue
  throw "Timed out waiting for the local Playwright server at $repoDevRouteUrl."
}
