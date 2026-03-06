# Fazumi MVP Smoke Test Script
# Run: .\scripts\smoke-test.ps1

$baseUrl = "http://localhost:3000"
$automatedPasses = 0

Write-Host "=== FAZUMI MVP SMOKE TEST ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Health Check
Write-Host "[1/6] Testing /api/health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -ErrorAction Stop
    $healthOk = (
        $health.envConfigured -eq $true -and
        $health.env.supabase -eq $true -and
        $health.env.openai -eq $true -and
        $health.env.lemonsqueezy -eq $true -and
        $health.supabase -eq $true
    )

    if ($healthOk) {
        $automatedPasses += 1
        Write-Host "  ✓ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Health check failed" -ForegroundColor Red
        Write-Host "    Response: $(ConvertTo-Json $health -Depth 6 -Compress)" -ForegroundColor DarkGray
        exit 1
    }
} catch {
    Write-Host "  ✗ Health check error: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Landing Page
Write-Host "[2/6] Testing landing page (/)... " -ForegroundColor Yellow
try {
    $landing = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -ErrorAction Stop
    if ($landing.Content -match "Fazumi") {
        $automatedPasses += 1
        Write-Host "  ✓ Landing page loads" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Landing page missing Fazumi branding" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Landing page error: $_" -ForegroundColor Red
}

# Test 3: Pricing Page
Write-Host "[3/6] Testing pricing page (/pricing)..." -ForegroundColor Yellow
try {
    $pricing = Invoke-WebRequest -Uri "$baseUrl/pricing" -UseBasicParsing -ErrorAction Stop
    if ($pricing.Content -match "Monthly" -and $pricing.Content -match "Founder") {
        $automatedPasses += 1
        Write-Host "  ✓ Pricing page loads" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Pricing page missing expected plan content" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Pricing page error: $_" -ForegroundColor Red
}

# Test 4: Login Page
Write-Host "[4/6] Testing login page (/login)..." -ForegroundColor Yellow
try {
    $login = Invoke-WebRequest -Uri "$baseUrl/login" -UseBasicParsing -ErrorAction Stop
    if ($login.Content -match "Google" -and $login.Content -match "Apple") {
        $automatedPasses += 1
        Write-Host "  ✓ Login page loads" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Login page missing expected OAuth options" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Login page error: $_" -ForegroundColor Red
}

# Test 5: Summarize Page (Auth Required)
Write-Host "[5/6] Testing summarize page (requires auth)..." -ForegroundColor Yellow
Write-Host "  ⚠ Manual test required - visit $baseUrl/summarize in a 375px mobile viewport" -ForegroundColor Yellow

# Test 6: History Page (Auth Required)
Write-Host "[6/6] Testing history page (requires auth)..." -ForegroundColor Yellow
Write-Host "  ⚠ Manual test required - visit $baseUrl/history in a 375px mobile viewport" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== SMOKE TEST COMPLETE ===" -ForegroundColor Cyan

if ($automatedPasses -eq 4) {
    Write-Host "Automated tests: 4/6 passed" -ForegroundColor Green
} else {
    Write-Host "Automated tests: $automatedPasses/6 passed" -ForegroundColor Red
}

Write-Host "Manual tests required: 2/6 (summarize, history on mobile width 375px)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Sign up at $baseUrl/login" -ForegroundColor Gray
Write-Host "2. Switch DevTools to 375px width and test paste -> summarize -> save" -ForegroundColor Gray
Write-Host "3. Verify history shows your summary and delete still works" -ForegroundColor Gray
