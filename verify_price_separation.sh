#!/bin/bash
# Price Separation Verification Script
# =====================================
# Run this after migration to verify everything works correctly

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Gecko/Exchange Price Separation Verification           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Test 1: Database Columns
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Checking Database Schema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_CHECK=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_name = 'pairs' 
  AND column_name IN ('gecko_price', 'gecko_price_usd', 'gecko_price_change_24h');
" 2>/dev/null || echo "0")

if [ "$DB_CHECK" -eq "3" ]; then
  echo -e "${GREEN}✓${NC} Database columns exist"
else
  echo -e "${RED}✗${NC} Missing gecko_* columns (found $DB_CHECK/3)"
  echo "   Run: psql -f backend/migrations/001_add_gecko_columns.sql"
  exit 1
fi

# Test 2: Database Data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Checking Database Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_DATA=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM pairs WHERE gecko_price > 0;
" 2>/dev/null || echo "0")

if [ "$DB_DATA" -gt "0" ]; then
  echo -e "${GREEN}✓${NC} Gecko prices populated ($DB_DATA pairs)"
else
  echo -e "${YELLOW}⚠${NC} No gecko prices yet (price-worker may not have run)"
fi

# Test 3: Backend API Health
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Checking Backend API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
  echo -e "${GREEN}✓${NC} Backend API is healthy"
else
  echo -e "${RED}✗${NC} Backend API not responding (HTTP $HEALTH_CHECK)"
  echo "   Check: ./backend/start.sh or your deployment"
  exit 1
fi

# Test 4: API Response Structure
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Checking API Response Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_RESPONSE=$(curl -s $API_URL/api/v1/pairs?limit=1 2>/dev/null)

if echo "$API_RESPONSE" | grep -q "gecko_price"; then
  echo -e "${GREEN}✓${NC} API returns gecko_price field"
else
  echo -e "${RED}✗${NC} API missing gecko_price field"
  echo "   Backend may need restart or code not deployed"
  exit 1
fi

if echo "$API_RESPONSE" | grep -q "gecko_price_usd"; then
  echo -e "${GREEN}✓${NC} API returns gecko_price_usd field"
else
  echo -e "${RED}✗${NC} API missing gecko_price_usd field"
fi

if echo "$API_RESPONSE" | grep -q "\"price\""; then
  echo -e "${GREEN}✓${NC} API returns price field (exchange)"
else
  echo -e "${YELLOW}⚠${NC} API missing price field"
fi

# Test 5: Sample Data
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Sample Pair Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v jq &> /dev/null; then
  SAMPLE=$(echo "$API_RESPONSE" | jq -r '.data[0] // .data // . | select(.gecko_price) | {
    id,
    gecko_price,
    gecko_price_usd,
    price,
    price_usd
  }' 2>/dev/null)
  
  if [ ! -z "$SAMPLE" ]; then
    echo "$SAMPLE"
    echo ""
    
    GECKO_PRICE=$(echo "$SAMPLE" | jq -r '.gecko_price // "0"')
    EXCHANGE_PRICE=$(echo "$SAMPLE" | jq -r '.price // "0"')
    
    if [ "$GECKO_PRICE" != "0" ] && [ "$EXCHANGE_PRICE" != "0" ]; then
      if [ "$GECKO_PRICE" != "$EXCHANGE_PRICE" ]; then
        echo -e "${GREEN}✓${NC} Gecko and exchange prices are different (as expected after fills)"
      else
        echo -e "${YELLOW}⚠${NC} Gecko and exchange prices are same (no fills yet or perfect match)"
      fi
    fi
  else
    echo -e "${YELLOW}⚠${NC} No sample data available yet"
  fi
else
  echo -e "${YELLOW}⚠${NC} jq not installed, skipping detailed output"
  echo "   Install jq for better output: apt-get install jq"
fi

# Test 6: Price-Worker Status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Price-Worker Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pm2 &> /dev/null; then
  PM2_STATUS=$(pm2 list | grep price-worker | grep online || echo "")
  if [ ! -z "$PM2_STATUS" ]; then
    echo -e "${GREEN}✓${NC} Price-worker is running"
  else
    echo -e "${YELLOW}⚠${NC} Price-worker not found in pm2"
    echo "   Start with: cd price-worker && pm2 start index.js --name price-worker"
  fi
else
  echo -e "${YELLOW}⚠${NC} pm2 not installed, cannot check price-worker status"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If all tests passed:"
echo "  1. ✅ Database migration successful"
echo "  2. ✅ Backend serving both price types"
echo "  3. ✅ Ready for UI testing"
echo ""
echo "Manual UI Tests:"
echo "  • Mobile Market page: Check top price updates"
echo "  • Mobile Chart: Check dropdown shows 'Exchange Price'"
echo "  • Mobile Trade: Check both prices appear"
echo "  • Place order: Check exchange price updates"
echo "  • Wait 39s: Check gecko price updates"
echo ""
echo "Logs to check:"
echo "  • Price-worker: pm2 logs price-worker"
echo "  • Backend: tail -f backend/logs/app.log"
echo "  • Browser: Open DevTools console"
echo ""
echo -e "${GREEN}Verification complete!${NC}"
