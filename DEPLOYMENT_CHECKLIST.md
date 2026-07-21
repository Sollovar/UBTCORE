# UNBOUND DEX - Deployment Checklist

Complete checklist for deploying UNBOUND DEX to production.

## ✅ Backend (Fly.io) - COMPLETE

- [x] Go backend code prepared
- [x] Dockerfile created for multi-stage build
- [x] `fly.toml` configuration created
- [x] Deployed to Fly.io (`ubtbackend.fly.dev`)
- [x] Connected to Fly.io PostgreSQL database
- [x] Database tables auto-created via GORM AutoMigrate
- [x] Health check endpoint responding: `https://ubtbackend.fly.dev/health`
- [x] API endpoints working:
  - [x] `/api/v1/pairs` (returning 59 pairs)
  - [x] `/api/v1/pairs?network=bsc` (20 pairs)
  - [x] `/api/v1/pairs?network=base` (19 pairs)
  - [x] `/api/v1/pairs?network=solana` (20 pairs)

**Status**: ✅ FULLY OPERATIONAL

---

## ✅ Pair Indexer (Fly.io) - COMPLETE

- [x] Node.js server code prepared
- [x] Dockerfile created for multi-stage build
- [x] `fly.toml` configuration created
- [x] Deployed to Fly.io (`ubtpairindexer`)
- [x] Connected to same Fly.io PostgreSQL database
- [x] Environment variables configured correctly
- [x] **DATABASE SCHEMA FIX APPLIED**: Removed non-existent columns from INSERT query
- [x] Pair fetching working: Health check shows 59 pairs
- [x] Pairs being inserted into database
- [x] Scheduled sync running every 15 minutes

**Status**: ✅ FULLY OPERATIONAL

---

## 🟡 Frontend (Vercel) - READY TO DEPLOY

### Configuration
- [x] `.env` file created with `VITE_API_URL=https://ubtbackend.fly.dev`
- [x] `.env.production` file created with same URL
- [x] `.env.local` file created for local testing
- [x] `.env.example` file created for documentation
- [x] `.gitignore` updated to exclude `.env.production.local`

### Code Fixes
- [x] Fixed `useCandles.ts` - now uses `API_BASE_URL`
- [x] Fixed `useFillNotifications.ts` - now uses `API_BASE_URL`
- [x] Verified all other API calls use `fetchApi` helper

### Deployment Steps
- [ ] **Step 1**: Go to https://vercel.com/dashboard
- [ ] **Step 2**: Click "Add New..." → "Project"
- [ ] **Step 3**: Select GitHub and import `UBTCORE` repository
- [ ] **Step 4**: Set root directory to `artifacts/dex`
- [ ] **Step 5**: Configure environment variables:
  - [ ] `VITE_API_URL` = `https://ubtbackend.fly.dev`
- [ ] **Step 6**: Click "Deploy"
- [ ] **Step 7**: Wait for build to complete (~5-10 minutes)
- [ ] **Step 8**: Access frontend at provided Vercel URL
- [ ] **Step 9**: Test pair loading in Markets page

**Status**: 🟡 READY TO DEPLOY

---

## 🔵 Database (Fly.io PostgreSQL) - COMPLETE

- [x] PostgreSQL cluster created on Fly.io
- [x] Database name: `fly-db`
- [x] Tables auto-created:
  - [x] `users`
  - [x] `pairs` (59 pairs inserted)
  - [x] `orders`
  - [x] `fills`
  - [x] `tokens`
  - [x] `solana_deposits`
  - [x] `refund_requests`
  - [x] `candles`
- [x] Indexes created for performance
- [x] Data syncing working correctly

**Status**: ✅ FULLY OPERATIONAL

---

## 📋 Verification Checklist

### Backend Tests
```bash
# Health check
curl https://ubtbackend.fly.dev/health
# Expected: {"status":"ok","time":...}

# Get all pairs
curl https://ubtbackend.fly.dev/api/v1/pairs
# Expected: {"count":59,"data":[...]}

# Get BSC pairs
curl https://ubtbackend.fly.dev/api/v1/pairs?network=bsc
# Expected: {"count":20,"data":[...]}

# Get trending pairs
curl https://ubtbackend.fly.dev/api/v1/pairs/trending
# Expected: {"count":59,"data":[...]}
```

### Frontend Tests (After Deployment)
- [ ] Navigate to frontend URL
- [ ] Markets page loads without errors
- [ ] Pairs list displays 59 pairs
- [ ] Price data is visible
- [ ] Can click on a pair to view details
- [ ] Orderbook loads
- [ ] Charts render correctly
- [ ] Mobile view works (resize browser)
- [ ] Can connect wallet (Dynamic Labs integration)

### Network Tests
- [ ] Open browser DevTools (F12)
- [ ] Network tab shows requests to `https://ubtbackend.fly.dev/api/v1/...`
- [ ] No CORS errors
- [ ] No 404 errors
- [ ] WebSocket connection works (check Console for ws messages)

---

## 🚀 Deployment Instructions

### For Vercel Deployment:

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Create New Project**
   - Click "Add New..." → "Project"
   - Connect GitHub if not already connected
   - Search for and select `UBTCORE` repository

3. **Configure Build**
   - **Project Name**: `unbound-dex` (or preferred name)
   - **Framework Preset**: `Vite`
   - **Root Directory**: `artifacts/dex`
   - Leave other settings as default

4. **Add Environment Variables**
   - Click "Add Environment Variables" (or skip and add later)
   - **Name**: `VITE_API_URL`
   - **Value**: `https://ubtbackend.fly.dev`
   - **Environments**: Select "Production, Preview, Development"

5. **Deploy**
   - Click "Deploy"
   - Watch the build progress
   - Wait 5-10 minutes for build to complete

6. **Access Frontend**
   - Vercel will provide a deployment URL
   - URL format: `https://unbound-dex.vercel.app` (or similar)
   - Click to visit your live frontend

7. **Test**
   - Navigate to `/trade`
   - Go to Markets tab
   - Verify pairs load from backend
   - Test a trade (if wallet connected)

---

## 🔗 System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     USER BROWSER                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────┐                    │
│  │ UNBOUND DEX Frontend (React)    │                    │
│  │ Deployed on Vercel              │                    │
│  │ URL: vercel.app/...             │                    │
│  └────────────────┬────────────────┘                    │
│                   │ VITE_API_URL=                       │
│                   │ https://ubtbackend.fly.dev          │
│                   ↓                                      │
└──────────────────────────────────────────────────────────┘
                    │
                    │ HTTP/WebSocket
                    ↓
      ┌─────────────────────────────────┐
      │ Backend API (Go)                │
      │ Deployed on Fly.io              │
      │ URL: ubtbackend.fly.dev         │
      │ - Pair data endpoints           │
      │ - Order management              │
      │ - Trading engine                │
      │ - WebSocket connections         │
      └────────────┬────────────────────┘
                   │ SQL
                   ↓
      ┌─────────────────────────────────┐
      │ PostgreSQL Database             │
      │ Fly.io Managed Postgres         │
      │ - Pairs (59+)                   │
      │ - Orders                        │
      │ - Fills                         │
      │ - Users                         │
      │ - Tokens                        │
      └─────────────────────────────────┘
                   ↑
                   │ Scheduled Insert
      ┌────────────┴────────────────────┐
      │ Pair Indexer (Node.js)          │
      │ Deployed on Fly.io              │
      │ - Fetches pairs from GeckoTerm  │
      │ - Syncs every 15 minutes        │
      └─────────────────────────────────┘
```

---

## 📊 Deployment Status Summary

| Component | Status | Location | URL |
|-----------|--------|----------|-----|
| **Backend API** | ✅ Live | Fly.io | `https://ubtbackend.fly.dev` |
| **Pair Indexer** | ✅ Live | Fly.io | Internal |
| **Database** | ✅ Live | Fly.io | Connected |
| **Frontend** | 🟡 Ready | Vercel | Pending deployment |
| **Pair Data** | ✅ Live | PostgreSQL | 59 pairs |

---

## 📝 Next Steps

1. **Deploy Frontend Now** (Recommended)
   - Follow "Deployment Instructions" section above
   - Estimated time: 10-15 minutes

2. **Test the Complete System**
   - Access frontend URL
   - Load markets/pairs
   - Connect wallet
   - Try placing a test order

3. **Monitor Logs**
   - Vercel: Deployments tab → View logs
   - Fly.io Backend: Dashboard → Logs
   - Fly.io Indexer: Dashboard → Logs

4. **Custom Domain (Optional)**
   - Add custom domain in Vercel Settings
   - Configure DNS records

5. **Production Settings (Optional)**
   - Enable analytics
   - Set up error tracking (Sentry)
   - Configure monitoring

---

## ✉️ Support

For deployment issues:
- Check Vercel build logs
- Check Fly.io app logs
- Verify environment variables
- Test backend API manually with curl

---

**Last Updated**: July 20, 2026
**System Status**: ✅ PRODUCTION READY (Frontend pending deployment)
