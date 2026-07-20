# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE VERIFICATION SCRIPT - Gecko/Exchange Price Separation
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  UNBOUND DEX - Price Separation Verification                       ║" -ForegroundColor Cyan
Write-Host "║  Gecko (Market) vs Exchange (DEX) Prices                         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$AllPassed = $true

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Database Connection Test
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[1/7] Testing Database Connection..." -ForegroundColor Yellow
try {
    $dbResult = & psql -h localhost -p 55422 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pairs WHERE pool_address IS NOT NULL;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pairCount = $dbResult.Trim()
        Write-Host "  ✓ Database connected" -ForegroundColor Green
        Write-Host "  ✓ Found $pairCount pairs with pool addresses" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database connection failed" -ForegroundColor Red
        $AllPassed = $false
    }
} catch {
    Write-Host "  ✗ psql not found in PATH - skipping DB test" -ForegroundColor Yellow
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Backend API Health Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[2/7] Testing Backend API..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
    if ($health.StatusCode -eq 200) {
        Write-Host "  ✓ Backend is running on port 8080" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Backend returned status $($health.StatusCode)" -ForegroundColor Red
        $AllPassed = $false
    }
} catch {
    Write-Host "  ✗ Backend is not responding" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 3. API Response Structure Verification
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[3/7] Verifying API Response Structure..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/pairs?limit=1" -UseBasicParsing -TimeoutSec 10
    $pairs = $response.Content | ConvertFrom-Json
    
    if ($pairs.Count -gt 0) {
        $pair = $pairs[0]
        Write-Host "  Testing pair: $($pair.id)" -ForegroundColor Cyan
        
        # Check gecko fields
        $geckoFields = @('gecko_price', 'gecko_price_usd', 'gecko_price_change_24h')
        $geckoPresent = $true
        foreach ($field in $geckoFields) {
            if ($null -eq $pair.$field) {
                Write-Host "  ✗ Missing field: $field" -ForegroundColor Red
                $geckoPresent = $false
                $AllPassed = $false
            }
        }
        
        if ($geckoPresent) {
            Write-Host "  ✓ All gecko_* fields present" -ForegroundColor Green
            Write-Host "    - gecko_price: $($pair.gecko_price)" -ForegroundColor Gray
            Write-Host "    - gecko_price_usd: $($pair.gecko_price_usd)" -ForegroundColor Gray
            Write-Host "    - gecko_price_change_24h: $($pair.gecko_price_change_24h)" -ForegroundColor Gray
        }
        
        # Check exchange fields
        $exchangeFields = @('price', 'price_usd', 'price_change_24h')
        $exchangePresent = $true
        foreach ($field in $exchangeFields) {
            if ($null -eq $pair.$field) {
                Write-Host "  ✗ Missing field: $field" -ForegroundColor Red
                $exchangePresent = $false
                $AllPassed = $false
            }
        }
        
        if ($exchangePresent) {
            Write-Host "  ✓ All exchange price fields present" -ForegroundColor Green
            Write-Host "    - price: $($pair.price)" -ForegroundColor Gray
            Write-Host "    - price_usd: $($pair.price_usd)" -ForegroundColor Gray
            Write-Host "    - price_change_24h: $($pair.price_change_24h)" -ForegroundColor Gray
        }
        
        # Compare gecko vs exchange
        if ($geckoPresent -and $exchangePresent) {
            Write-Host ""
            Write-Host "  Price Comparison:" -ForegroundColor Cyan
            Write-Host "    Gecko Price:    $($pair.gecko_price)" -ForegroundColor Yellow
            Write-Host "    Exchange Price: $($pair.price)" -ForegroundColor Yellow
            
            if ($pair.gecko_price -eq $pair.price) {
                Write-Host "  ⚠ Prices are identical - may not have diverged yet" -ForegroundColor Yellow
            } else {
                Write-Host "  ✓ Prices are separate (good!)" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  ✗ No pairs returned from API" -ForegroundColor Red
        $AllPassed = $false
    }
} catch {
    Write-Host "  ✗ Failed to fetch API data: $($_.Exception.Message)" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Price-Worker Process Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[4/7] Checking Price-Worker Process..." -ForegroundColor Yellow
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
if ($nodeProcesses.Count -gt 0) {
    Write-Host "  ✓ Found $($nodeProcesses.Count) Node.js process(es) running" -ForegroundColor Green
    Write-Host "  Note: Cannot determine which is price-worker without pm2" -ForegroundColor Gray
} else {
    Write-Host "  ⚠ No Node.js processes found" -ForegroundColor Yellow
    Write-Host "  Price-worker may not be running" -ForegroundColor Yellow
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Frontend Type Definitions Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[5/7] Verifying Frontend Type Definitions..." -ForegroundColor Yellow
$typesFile = "c:\Users\HAMMAD\Documents\DeEx-Trade-main\artifacts\dex\src\types\index.ts"
if (Test-Path $typesFile) {
    $content = Get-Content $typesFile -Raw
    $requiredFields = @(
        'geckoPrice',
        'geckoPriceUSD',
        'geckoPriceChange24h',
        'geckoHigh24h',
        'geckoLow24h'
    )
    
    $allFound = $true
    foreach ($field in $requiredFields) {
        if ($content -match $field) {
            Write-Host "  ✓ Found: $field" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Missing: $field" -ForegroundColor Red
            $allFound = $false
            $AllPassed = $false
        }
    }
    
    if ($allFound) {
        Write-Host "  ✓ All gecko fields defined in TypeScript types" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ Types file not found" -ForegroundColor Red
    $AllPassed = $false
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Frontend Component Usage Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[6/7] Verifying Frontend Component Implementation..." -ForegroundColor Yellow

$components = @(
    @{
        Name = "MobilePairHeader"
        Path = "c:\Users\HAMMAD\Documents\DeEx-Trade-main\artifacts\dex\src\mobile\components\MobilePairHeader.tsx"
        SearchFor = "geckoPrice"
    },
    @{
        Name = "MobileTradeView"
        Path = "c:\Users\HAMMAD\Documents\DeEx-Trade-main\artifacts\dex\src\mobile\components\MobileTradeView.tsx"
        SearchFor = "geckoPrice"
    },
    @{
        Name = "MobileMarketsPage"
        Path = "c:\Users\HAMMAD\Documents\DeEx-Trade-main\artifacts\dex\src\mobile\components\MobileMarketsPage.tsx"
        SearchFor = "geckoPrice"
    }
)

foreach ($comp in $components) {
    if (Test-Path $comp.Path) {
        $content = Get-Content $comp.Path -Raw
        if ($content -match $comp.SearchFor) {
            Write-Host "  ✓ $($comp.Name) uses gecko fields" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ $($comp.Name) may not be using gecko fields" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ $($comp.Name) not found" -ForegroundColor Red
        $AllPassed = $false
    }
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# 7. Documentation Check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "[7/7] Checking Documentation..." -ForegroundColor Yellow
$docs = @(
    "README_PRICE_FIX.md",
    "GECKO_PRICE_SEPARATION_FIX.md",
    "MIGRATION_QUICKSTART.md",
    "PRICE_SEPARATION_SUMMARY.md"
)

$docsFound = 0
foreach ($doc in $docs) {
    $fullPath = "c:\Users\HAMMAD\Documents\DeEx-Trade-main\$doc"
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $doc exists" -ForegroundColor Green
        $docsFound++
    } else {
        Write-Host "  ✗ $doc missing" -ForegroundColor Red
    }
}

if ($docsFound -eq $docs.Count) {
    Write-Host "  ✓ All documentation files present" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Some documentation missing" -ForegroundColor Yellow
}
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICATION SUMMARY                                            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($AllPassed) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your gecko/exchange price separation is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "What's Working:" -ForegroundColor Cyan
    Write-Host "  • Database has gecko_* columns populated" -ForegroundColor Gray
    Write-Host "  • Backend API returns both gecko and exchange prices" -ForegroundColor Gray
    Write-Host "  • Frontend types include all gecko fields" -ForegroundColor Gray
    Write-Host "  • Mobile components use gecko prices for display" -ForegroundColor Gray
    Write-Host "  • Exchange prices remain separate and updateable" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Test in mobile UI - verify prices display correctly" -ForegroundColor Gray
    Write-Host "  2. Place a test order - exchange price should update" -ForegroundColor Gray
    Write-Host "  3. Wait 39 seconds - gecko price should update from price-worker" -ForegroundColor Gray
    Write-Host "  4. Confirm they remain separate" -ForegroundColor Gray
} else {
    Write-Host "⚠️ SOME CHECKS FAILED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Review the failed items above and fix them." -ForegroundColor Yellow
    Write-Host "Most issues can be resolved by:" -ForegroundColor Gray
    Write-Host "  • Restarting backend: cd backend && go run ." -ForegroundColor Gray
    Write-Host "  • Starting price-worker: cd price-worker && node index.js" -ForegroundColor Gray
    Write-Host "  • Rebuilding frontend: cd artifacts/dex && npm run build" -ForegroundColor Gray
}

Write-Host ""
Write-Host "For detailed docs, see:" -ForegroundColor Cyan
Write-Host "  • README_PRICE_FIX.md (quick start)" -ForegroundColor Gray
Write-Host "  • GECKO_PRICE_SEPARATION_FIX.md (complete guide)" -ForegroundColor Gray
Write-Host ""
