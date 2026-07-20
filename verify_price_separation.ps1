# Price Separation Verification Script (PowerShell)
# ==================================================
# Run this after migration to verify everything works correctly

$ErrorActionPreference = "Continue"

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Gecko/Exchange Price Separation Verification           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:8080" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "postgres" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }

Write-Host "Configuration:"
Write-Host "  API URL: $API_URL"
Write-Host "  Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
Write-Host ""

$allPassed = $true

# Test 1: Check if psql is available
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test 1: Checking Database Schema" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $psqlCheck = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCheck) {
        # Check if gecko columns exist
        $query = @"
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'pairs' 
AND column_name IN ('gecko_price', 'gecko_price_usd', 'gecko_price_change_24h');
"@
        
        $columnCount = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $query 2>$null
        $columnCount = $columnCount.Trim()
        
        if ($columnCount -eq "3") {
            Write-Host "✓ Database columns exist" -ForegroundColor Green
        } else {
            Write-Host "✗ Missing gecko_* columns (found $columnCount/3)" -ForegroundColor Red
            Write-Host "   Run: psql -f backend\migrations\001_add_gecko_columns.sql" -ForegroundColor Yellow
            $allPassed = $false
        }
    } else {
        Write-Host "⚠ psql not found, skipping database checks" -ForegroundColor Yellow
        Write-Host "   Install PostgreSQL client tools to enable DB checks" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not connect to database" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Yellow
}

# Test 2: Database Data
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test 2: Checking Database Data" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    if ($psqlCheck) {
        $dataQuery = "SELECT COUNT(*) FROM pairs WHERE gecko_price > 0;"
        $dataCount = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $dataQuery 2>$null
        $dataCount = $dataCount.Trim()
        
        if ([int]$dataCount -gt 0) {
            Write-Host "✓ Gecko prices populated ($dataCount pairs)" -ForegroundColor Green
        } else {
            Write-Host "⚠ No gecko prices yet (price-worker may not have run)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠ Could not check database data" -ForegroundColor Yellow
}

# Test 3: Backend API Health
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test 3: Checking Backend API" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $health = Invoke-WebRequest -Uri "$API_URL/health" -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($health.StatusCode -eq 200) {
        Write-Host "✓ Backend API is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend API returned status $($health.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "✗ Backend API not responding" -ForegroundColor Red
    Write-Host "   Check: backend is running on $API_URL" -ForegroundColor Yellow
    $allPassed = $false
}

# Test 4: API Response Structure
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test 4: Checking API Response Structure" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/pairs?limit=1" -Method Get -TimeoutSec 10
    
    $responseJson = $response | ConvertTo-Json -Depth 10
    
    if ($responseJson -match "gecko_price") {
        Write-Host "✓ API returns gecko_price field" -ForegroundColor Green
    } else {
        Write-Host "✗ API missing gecko_price field" -ForegroundColor Red
        Write-Host "   Backend may need restart or code not deployed" -ForegroundColor Yellow
        $allPassed = $false
    }
    
    if ($responseJson -match "gecko_price_usd") {
        Write-Host "✓ API returns gecko_price_usd field" -ForegroundColor Green
    } else {
        Write-Host "✗ API missing gecko_price_usd field" -ForegroundColor Red
    }
    
    if ($responseJson -match '"price"') {
        Write-Host "✓ API returns price field (exchange)" -ForegroundColor Green
    } else {
        Write-Host "⚠ API missing price field" -ForegroundColor Yellow
    }
    
    # Test 5: Sample Data
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Test 5: Sample Pair Data" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    # Try to get first pair data
    $firstPair = $null
    if ($response.data -and $response.data.Count -gt 0) {
        $firstPair = $response.data[0]
    } elseif ($response.Count -gt 0) {
        $firstPair = $response[0]
    }
    
    if ($firstPair) {
        Write-Host "Sample Pair:"
        Write-Host "  ID: $($firstPair.id)"
        Write-Host "  Gecko Price: $($firstPair.gecko_price)"
        Write-Host "  Gecko Price USD: $($firstPair.gecko_price_usd)"
        Write-Host "  Exchange Price: $($firstPair.price)"
        Write-Host "  Exchange Price USD: $($firstPair.price_usd)"
        Write-Host ""
        
        if ($firstPair.gecko_price -and $firstPair.price) {
            if ($firstPair.gecko_price -ne $firstPair.price) {
                Write-Host "✓ Gecko and exchange prices are different (as expected after fills)" -ForegroundColor Green
            } else {
                Write-Host "⚠ Gecko and exchange prices are same (no fills yet or perfect match)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠ No sample data available yet" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Could not fetch API data" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Yellow
    $allPassed = $false
}

# Test 6: Price-Worker Status
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Test 6: Price-Worker Status" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$pm2Check = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Check) {
    try {
        $pm2List = & pm2 list 2>$null | Out-String
        if ($pm2List -match "price-worker.*online") {
            Write-Host "✓ Price-worker is running" -ForegroundColor Green
        } else {
            Write-Host "⚠ Price-worker not found or not running in pm2" -ForegroundColor Yellow
            Write-Host "   Start with: cd price-worker && pm2 start index.js --name price-worker" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠ Could not check pm2 status" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ pm2 not installed, cannot check price-worker status" -ForegroundColor Yellow
    Write-Host "   Install with: npm install -g pm2" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($allPassed) {
    Write-Host "✓ All critical tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some tests failed. Review output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Manual UI Tests:" -ForegroundColor White
Write-Host "  • Mobile Market page: Check top price updates"
Write-Host "  • Mobile Chart: Check dropdown shows 'Exchange Price'"
Write-Host "  • Mobile Trade: Check both prices appear"
Write-Host "  • Place order: Check exchange price updates"
Write-Host "  • Wait 39s: Check gecko price updates"
Write-Host ""
Write-Host "Logs to check:" -ForegroundColor White
Write-Host "  • Price-worker: pm2 logs price-worker"
Write-Host "  • Backend: Check backend logs"
Write-Host "  • Browser: Open DevTools console (F12)"
Write-Host ""
Write-Host "Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed documentation, see:"
Write-Host "  • MIGRATION_QUICKSTART.md (quick steps)"
Write-Host "  • GECKO_PRICE_SEPARATION_FIX.md (full technical docs)"
Write-Host "  • PRICE_SEPARATION_SUMMARY.md (overview)"
