# UNBOUND Price Worker - Deployment to Fly.io

The price worker has been successfully uploaded to GitHub and is ready to deploy to Fly.io.

## GitHub Repository

**Repository**: https://github.com/Sollovar/UBTPriceworker.git

All code files, Dockerfile, and configuration are now on GitHub:
- ✅ `index.js` - Main application code
- ✅ `package.json` - Dependencies and scripts
- ✅ `package-lock.json` - Locked dependency versions
- ✅ `Dockerfile` - Container configuration
- ✅ `fly.toml` - Fly.io configuration
- ✅ `README.md` - Comprehensive documentation
- ✅ `.env.example` - Environment variable template
- ✅ `.gitignore` - Git ignore rules

## What the Price Worker Does

The price worker continuously updates pair prices from GeckoTerminal API:

1. **Every 2 minutes** (configurable):
   - Reads all pairs from PostgreSQL database
   - Fetches latest prices from GeckoTerminal API
   - Updates database with fresh pricing data

2. **Price data synced**:
   - `gecko_price` - Current price
   - `gecko_price_usd` - Price in USD
   - `gecko_price_change_24h` - 24h price change %
   - `gecko_high_24h` - 24h high
   - `gecko_low_24h` - 24h low
   - `gecko_liquidity` - Pool liquidity
   - `gecko_liquidity_usd` - Liquidity in USD
   - `gecko_market_cap` - Market cap
   - `gecko_market_cap_usd` - Market cap in USD

3. **API efficiency**:
   - Only **3 API calls per sync cycle** (1 per network)
   - Stays well under GeckoTerminal free tier (30 req/min)
   - Can handle 59+ pairs without rate limiting

## Quick Deploy to Fly.io (5 minutes)

### Option 1: Fly.io Dashboard (Recommended for you)

1. **Go to Fly.io Dashboard**
   ```
   https://fly.io/dashboard
   ```

2. **Create New App**
   - Click "New App"
   - Connect GitHub
   - Select repository: `UBTPriceworker`

3. **Configure App**
   - App name: `ubtpriceworker`
   - Region: `sin` (Singapore - same as backend)
   - Don't attach database

4. **Set Environment Variables**
   Add these in the Fly.io dashboard:

   ```
   DB_HOST           = direct.3x9jv024zzdr6qp7.flympg.net
   DB_PORT           = 5432
   DB_USER           = fly-user
   DB_PASSWORD       = kW3_WYIjboTS2TD-cTt0aLdrg4MkQPQy5HKz68ZPiVs
   DB_NAME           = fly-db
   SYNC_INTERVAL_SECONDS = 120
   BATCH_SIZE        = 30
   NETWORKS          = bsc,base,solana
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment

6. **Verify**
   - Check logs: Should see "Connected to database" and "Syncing prices"
   - Monitor: Check that prices are being updated

### Option 2: Fly.io CLI

If you prefer command line:

```bash
# Clone repository
git clone https://github.com/Sollovar/UBTPriceworker.git
cd UBTPriceworker

# Launch on Fly.io
flyctl launch --name ubtpriceworker --region sin

# Set secrets
flyctl secrets set -a ubtpriceworker \
  DB_HOST="direct.3x9jv024zzdr6qp7.flympg.net" \
  DB_PORT="5432" \
  DB_USER="fly-user" \
  DB_PASSWORD="kW3_WYIjboTS2TD-cTt0aLdrg4MkQPQy5HKz68ZPiVs" \
  DB_NAME="fly-db" \
  SYNC_INTERVAL_SECONDS="120" \
  BATCH_SIZE="30" \
  NETWORKS="bsc,base,solana"

# Deploy
flyctl deploy -a ubtpriceworker

# Check logs
flyctl logs -a ubtpriceworker
```

## Environment Variables Explained

| Variable | Value | Purpose |
|----------|-------|---------|
| `DB_HOST` | `direct.3x9jv024zzdr6qp7.flympg.net` | Fly.io PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `fly-user` | Database username |
| `DB_PASSWORD` | Your Fly.io password | Database password |
| `DB_NAME` | `fly-db` | Database name |
| `SYNC_INTERVAL_SECONDS` | `120` | Sync frequency (2 minutes) |
| `BATCH_SIZE` | `30` | Pools per API call |
| `NETWORKS` | `bsc,base,solana` | Networks to sync |

## Expected Behavior After Deployment

### In Fly.io Logs

```
[INFO] UNBOUND Price Worker started
[INFO] Connecting to database...
[INFO] Connected to PostgreSQL: fly-db
[INFO] Starting sync cycle...
[INFO] Networks to sync: bsc,base,solana
[INFO] Syncing 20 BSC pairs...
[INFO] Syncing 19 Base pairs...
[INFO] Syncing 20 Solana pairs...
[INFO] Updated 59 pairs with latest prices
[INFO] Next sync in 120 seconds...
```

### In Database

The `pairs` table will be updated with new price data:
- `gecko_price` - updated
- `gecko_price_usd` - updated
- `gecko_price_change_24h` - updated
- `gecko_updated_at` - updated to current timestamp

### In Backend API

The backend automatically serves this price data:
```bash
curl https://ubtbackend.fly.dev/api/v1/pairs | jq '.[0].gecko_price'
# Returns the latest price synced by the worker
```

## Monitoring

### Check App Status
```bash
flyctl status -a ubtpriceworker
```

### View Logs (Real-time)
```bash
flyctl logs -a ubtpriceworker -f
```

### Check Database Updates
```bash
# Connect to PostgreSQL and check last update time
psql postgresql://fly-user:password@direct.3x9jv024zzdr6qp7.flympg.net/fly-db

SELECT COUNT(*), MAX(gecko_updated_at) FROM pairs;
# Should show 59 pairs and very recent update timestamp
```

## Troubleshooting

### App won't start / build fails

**Solution**:
1. Check build logs in Fly.io dashboard
2. Verify Node.js version is compatible
3. Check `package.json` and `Dockerfile` are valid
4. Try redeploying

### Database connection failed

**Solution**:
1. Verify environment variables are set correctly
2. Check Fly.io PostgreSQL is accessible
3. Test connection manually:
   ```bash
   psql postgresql://fly-user:password@direct.3x9jv024zzdr6qp7.flympg.net/fly-db
   ```

### Prices not updating

**Solution**:
1. Check logs: `flyctl logs -a ubtpriceworker`
2. Verify pairs exist in database: `SELECT COUNT(*) FROM pairs;`
3. Check GeckoTerminal API is accessible
4. Verify database credentials are correct

### High CPU usage

**Solution**:
1. Increase `SYNC_INTERVAL_SECONDS` to 180+ seconds
2. Decrease `BATCH_SIZE` to 20 pairs per call
3. Redeploy with new settings

## Performance & Scaling

### Current Configuration
- **Sync Interval**: 120 seconds (2 minutes)
- **Pairs per call**: 30
- **API calls per cycle**: 3 (1 per network)
- **Total API calls per hour**: 30

### Scaling Recommendations

| Requirement | Action |
|-------------|--------|
| More frequent updates | Decrease `SYNC_INTERVAL_SECONDS` to 60+ |
| More accurate data | Decrease `SYNC_INTERVAL_SECONDS` to 60+ |
| Lower API usage | Increase `SYNC_INTERVAL_SECONDS` to 180+ |
| Lower cost | Scale down Fly.io machine size |

## Architecture

```
┌──────────────────────────────┐
│  Fly.io Price Worker         │
│  (Node.js)                   │
│  Every 120 seconds:          │
│  - Read pairs from DB        │
│  - Fetch from GeckoTerminal  │
│  - Update DB with prices     │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│  Fly.io PostgreSQL           │
│  Database                    │
│  pairs table                 │
│  (59+ pairs with prices)     │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│  Fly.io Backend API          │
│  (Go)                        │
│  Serves pairs with prices    │
│  GET /api/v1/pairs           │
└────────────┬─────────────────┘
             │
             ↓
┌──────────────────────────────┐
│  Vercel Frontend             │
│  (React)                     │
│  Displays prices to users    │
└──────────────────────────────┘
```

## Complete System Overview

After price worker deployment, full system is:

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Vercel | Your Vercel URL |
| Backend API | ✅ Fly.io | https://ubtbackend.fly.dev |
| Pair Indexer | ✅ Fly.io | Internal |
| Price Worker | 🟡 Ready to Deploy | Fly.io (this doc) |
| Database | ✅ Fly.io | PostgreSQL |

## Next Steps

1. **Deploy Price Worker** (this guide)
2. **Verify prices update** in logs
3. **Monitor** system for 24 hours
4. **(Optional)** Adjust sync interval based on needs
5. **(Optional)** Deploy smart contracts

## Costs

Fly.io pricing (estimated for price worker alone):
- **Compute**: ~$5-10/month (shared machine)
- **Network**: ~$2-5/month (minimal egress)
- **Total**: ~$7-15/month

Combined with existing services:
- Backend: $10-15/month
- Price Worker: $7-15/month
- Database: $9/month (PostgreSQL free tier was just upgraded)
- **Total**: ~$26-39/month for entire UNBOUND DEX

## Support

For deployment issues:
1. Check Fly.io documentation: https://fly.io/docs
2. Review logs in Fly.io dashboard
3. Verify environment variables
4. Test database connection manually
5. Check GeckoTerminal API status

## GitHub Links

- **Repository**: https://github.com/Sollovar/UBTPriceworker.git
- **Clone**: `git clone https://github.com/Sollovar/UBTPriceworker.git`
- **Push updates**: `git push origin main`

---

**Status**: ✅ **READY FOR DEPLOYMENT**  
**Time to Deploy**: 5-10 minutes  
**After Deploy**: Monitor logs for 2-3 sync cycles to verify working
