# Starts dev server, runs Playwright suite, tears down server.

$port = 3000
$healthUrl = "http://localhost:$port/api/health"
$server = $null

function Stop-ProcessTree {
  param(
    [Parameter(Mandatory = $true)]
    [int]$ProcessId
  )

  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting dev server on port $port..."
try {
  $pnpmCmdPath = (Get-Command pnpm.cmd -ErrorAction Stop).Source
  $env:PLAYWRIGHT_TEST = "1"
  $server = Start-Process -FilePath $pnpmCmdPath -ArgumentList @("exec", "next", "dev", "-p", "$port") -PassThru -NoNewWindow
} catch {
  Write-Host "Failed to start dev server."
  Write-Host $_.Exception.Message
  exit 1
}

$ready = $false
$waited = 0
while (-not $ready -and $waited -lt 30) {
  Start-Sleep -Seconds 1
  $waited++
  $server.Refresh()
  if ($server.HasExited) {
    break
  }
  try {
    $resp = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 2 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
      $ready = $true
    }
  } catch {
  }
}

if (-not $ready) {
  if ($null -ne $server) {
    $server.Refresh()
    if ($server.HasExited) {
      Write-Host "Dev server exited before the health check completed."
    }
  }
  Write-Host "Dev server did not become ready in 30s. Killing."
  if ($null -ne $server) {
    Stop-ProcessTree -ProcessId $server.Id
  }
  exit 1
}

Write-Host "Dev server ready. Running Playwright suite..."
$env:PLAYWRIGHT_NO_SERVER = "1"
$env:PLAYWRIGHT_BASE_URL = "http://localhost:$port"
pnpm exec playwright test --reporter=list
$exitCode = $LASTEXITCODE

Write-Host "Stopping dev server..."
if ($null -ne $server) {
  Stop-ProcessTree -ProcessId $server.Id
}

exit $exitCode
