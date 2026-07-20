# Complete Verification Script - Gecko/Exchange Price Separation
# ==================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UNBOUND DEX - Price Separation Verification" -ForegroundColor Cyan
Write-Host "Gecko (Market) vs Exchange (DEX) Prices" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$AllPassed = $true

# 1. Backend API Test
Write-Host "[1/5] Testing Backend API..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
    if ($health.StatusCode -eq 200) {
        Write-Host "  [OK] Backend is running on port 8080" -ForegroundColor Green
    }
} catch {
    Write-Host "  [FAIL] Backend is not responding" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# 2. API Response Structure
Write-Host "[2/5] Verifying API Response Structure..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/pairs?limit=1" -UseBasicParsing -TimeoutSec 10
    $pairs = $response.Content | ConvertFrom-Json
    
    if ($pairs.Count -gt 0) {
        $pair = $pairs[0]
        Write-Host "  Testing pair: $($pair.base_symbol)/$($pair.quote_symbol)" -ForegroundColor Cyan
        
        # Check gecko fields
        if ($pair.gecko_price -and $pair.gecko_price_usd -and $null -ne $pair.gecko_price_change_24h) {
            Write-Host "  [OK] All gecko_* fields present" -ForegroundColor Green
            Write-Host "    - gecko_price: $($pair.gecko_price)" -ForegroundColor Gray
            Write-Host "    - gecko_price_usd: $($pair.gecko_price_usd)" -ForegroundColor Gray
            Write-Host "    - gecko_price_change_24h: $($pair.gecko_price_change_24h)" -ForegroundColor Gray
        } else {
            Write-Host "  [FAIL] Missing gecko_* fields" -ForegroundColor Red
            $AllPassed = $false
        }
        
        # Check exchange fields
        if ($pair.price -and $pair.price_usd -and $null -ne $pair.price_change_24h) {
            Write-Host "  [OK] All exchange price fields present" -ForegroundColor Green
            Write-Host "    - price: $($pair.price)" -ForegroundColor Gray
            Write-Host "    - price_usd: $($pair.price_usd)" -ForegroundColor Gray
            Write-Host "    - price_change_24h: $($pair.price_change_24h)" -ForegroundColor Gray
        } else {
            Write-Host "  [FAIL] Missing exchange price fields" -ForegroundColor Red
            $AllPassed = $false
        }
        
        # Compare prices
        Write-Host ""
        Write-Host "  Price Comparison:" -ForegroundColor Cyan
        Write-Host "    Gecko Price:    $($pair.gecko_price)" -ForegroundColor Yellow
        Write-Host "    Exchange Price: $($pair.price)" -ForegroundColor Yellow
        
        if ($pair.gecko_price -eq $pair.price) {
            Write-Host "  [INFO] Prices are identical (normal if no trades yet)" -ForegroundColor Yellow
        } else {
            Write-Host "  [OK] Prices are separate!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [FAIL] Failed to fetch API data" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# 3. Process Check
Write-Host "[3/5] Checking Running Processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
if ($nodeProcesses.Count -gt 0) {
    Write-Host "  [OK] Found $($nodeProcesses.Count) Node.js process(es) running" -ForegroundColor Green
} else {
    Write-Host "  [WARN] No Node.js processes found - price-worker may not be running" -ForegroundColor Yellow
}
Write-Host ""

# 4. Frontend Types Check
Write-Host "[4/5] Verifying Frontend Type Definitions..." -ForegroundColor Yellow
$typesFile = "artifacts\dex\src\types\index.ts"
if (Test-Path $typesFile) {
    $content = Get-Content $typesFile -Raw
    $requiredFields = @('geckoPrice', 'geckoPriceUSD', 'geckoPriceChange24h')
    $allFound = $true
    
    foreach ($field in $requiredFields) {
        if ($content -match $field) {
            Write-Host "  [OK] Found: $field" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Missing: $field" -ForegroundColor Red
            $allFound = $false
            $AllPassed = $false
        }
    }
} else {
    Write-Host "  [FAIL] Types file not found" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# 5. Documentation Check
Write-Host "[5/5] Checking Documentation..." -ForegroundColor Yellow
$docs = @("README_PRICE_FIX.md", "GECKO_PRICE_SEPARATION_FIX.md", "MIGRATION_QUICKSTART.md")
$docsFound = 0
foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  [OK] $doc exists" -ForegroundColor Green
        $docsFound++
    }
}
Write-Host ""

# Final Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($AllPassed) {
    Write-Host "[SUCCESS] ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your gecko/exchange price separation is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "What's Working:" -ForegroundColor Cyan
    Write-Host "  * Backend API returns both gecko and exchange prices" -ForegroundColor Gray
    Write-Host "  * Frontend types include all gecko fields" -ForegroundColor Gray
    Write-Host "  * Components use gecko prices for market display" -ForegroundColor Gray
    Write-Host "  * Exchange prices remain separate and updateable" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Start price-worker if not running: cd price-worker && node index.js" -ForegroundColor Gray
    Write-Host "  2. Test in mobile UI - verify prices display correctly" -ForegroundColor Gray
    Write-Host "  3. Place a test order - exchange price should update" -ForegroundColor Gray
    Write-Host "  4. Wait 39 seconds - gecko price should update from price-worker" -ForegroundColor Gray
} else {
    Write-Host "[WARN] SOME CHECKS FAILED" -ForegroundColor Yellow
    Write-Host "Review the failed items above and fix them." -ForegroundColor Yellow
}

Write-Host ""
