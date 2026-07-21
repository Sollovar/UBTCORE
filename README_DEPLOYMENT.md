# UNBOUND DEX - Complete Deployment Guide

🚀 **UNBOUND DEX is ready for full production deployment!**

## System Status

| Component | Status | URL |
|-----------|--------|-----|
| **Backend API** | ✅ RUNNING | https://ubtbackend.fly.dev |
| **Pair Indexer** | ✅ RUNNING | Internal (Fly.io) |
| **Database** | ✅ SYNCED | Fly.io PostgreSQL |
| **Frontend** | 🟡 READY | Pending Vercel deployment |

## Quick Links

### 🚀 Ready to Deploy?
Start here for a 5-minute deployment:
→ **[QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)**

### 📋 Detailed Instructions
Full step-by-step deployment guide:
→ **[VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)**

### ✅ Verification Checklist
Complete checklist for testing the system:
→ **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**

### 📝 What Changed
Summary of all frontend updates:
→ **[FRONTEND_UPDATE_SUMMARY.md](./FRONTEND_UPDATE_SUMMARY.md)**

### ⚙️ Technical Details
Deep dive into API configuration:
→ **[FRONTEND_API_CONFIGURATION.md](./FRONTEND_API_CONFIGURATION.md)**

### 📖 Project Documentation
Complete UNBOUND DEX documentation:
→ **[UNBOUND_DOCUMENTATION.md](./UNBOUND_DOCUMENTATION.md)**

### 🏠 Hosting Guide
All hosting options and setup:
→ **[HOSTING_GUIDE.md](./HOSTING_GUIDE.md)**

## 5-Minute Deploy Guide

### Step 1: Go to Vercel
```
https://vercel.com/dashboard
```

### Step 2: Create Project
- Click "Add New..." → "Project"
- Select GitHub → Choose "UBTCORE"

### Step 3: Configure
- Root Directory: `artifacts/dex`
- Environment Variable: `VITE_API_URL=https://ubtbackend.fly.dev`

### Step 4: Deploy
- Click "Deploy"
- Wait 5-10 minutes

### Step 5: Verify
- Visit your new Vercel URL
- Go to Markets page
- Should see 59 pairs loading

## What's Running

### Backend API (Fly.io)
```
URL: https://ubtbackend.fly.dev
Status: ✅ Running
Endpoints:
  - GET  /health (health check)
  - GET  /api/v1/pairs (all pairs - 59 available)
  - GET  /api/v1/pairs?network=bsc (BSC - 20 pairs)
  - GET  /api/v1/pairs?network=base (Base - 19 pairs)
  - GET  /api/v1/pairs?network=solana (Solana - 20 pairs)
  - GET  /api/v1/pairs/trending (trending)
  - GET  /api/v1/pairs/:id (pair details)
  - GET  /api/v1/orders (orders)
  - POST /api/v1/orders (create order)
  - GET  /api/v1/fills (fills)
  - GET  /ws (WebSocket)
```

### Pair Indexer (Fly.io)
```
Status: ✅ Running
Syncs: Every 15 minutes
Fetches: 59 trending pairs from GeckoTerminal
Inserts: Into Fly.io PostgreSQL database
Health: 59 pairs in memory (verified)
```

### Database (Fly.io PostgreSQL)
```
Status: ✅ Connected
Size: ~60 pairs + supporting tables
Tables: users, pairs, orders, fills, tokens, candles, etc.
Indexes: Performance optimized
Syncing: Active pair indexer
```

## What's New in Frontend

### Environment Configuration
✅ Created `.env` with `VITE_API_URL=https://ubtbackend.fly.dev`
✅ Created `.env.production` for production builds
✅ Created `.env.local` for local development

### API Fixes
✅ Fixed `useCandles.ts` to use correct API URL
✅ Fixed `useFillNotifications.ts` to use correct API URL
✅ All other endpoints already using proper base URL

### Database Schema Fix
✅ Fixed pair indexer INSERT query to match actual schema
✅ Removed non-existent columns
✅ Pairs now successfully inserting

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  VERCEL FRONTEND (React + Vite)                    │
│  ↓ Deployed at: unbound-dex.vercel.app             │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ VITE_API_URL=
                   │ https://ubtbackend.fly.dev
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  FLY.IO BACKEND API (Go + Gin)                      │
│  ↓ Running at: https://ubtbackend.fly.dev           │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ SQL Queries
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  FLY.IO POSTGRESQL DATABASE                        │
│  ↓ Contains: 59 pairs + orders/fills/users/etc      │
│                                                     │
└─────────────────────────────────────────────────────┘
                   ↑
                   │ Scheduled Insert
                   │ (Every 15 minutes)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  FLY.IO PAIR INDEXER (Node.js)                      │
│  ↓ Fetches pairs from GeckoTerminal API             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Testing the System

### Test Backend
```bash
# Check if backend is alive
curl https://ubtbackend.fly.dev/health

# Get all pairs
curl https://ubtbackend.fly.dev/api/v1/pairs

# Get BSC pairs
curl https://ubtbackend.fly.dev/api/v1/pairs?network=bsc
```

### Test Frontend (After Deployment)
1. Visit your Vercel URL
2. Navigate to `/trade`
3. Go to Markets tab
4. Should show 59 pairs
5. Click on a pair to see details

### Test in Browser DevTools
```javascript
// Open DevTools (F12 → Console):
fetch('https://ubtbackend.fly.dev/api/v1/pairs')
  .then(r => r.json())
  .then(d => console.log(`Loaded ${d.count} pairs`))
```

## Deployment Sequence

### Current Status ✅
```
✅ Backend deployed to Fly.io
✅ Database synced with pairs
✅ Pair indexer running and fetching
✅ Frontend configured
✅ Frontend ready for Vercel
```

### Next Steps
```
1. Deploy frontend to Vercel (⏳ You are here)
2. Test complete system end-to-end
3. (Optional) Set up custom domain
4. (Optional) Deploy price worker
```

## Files in This Deployment

### Documentation Files
```
✅ README_DEPLOYMENT.md (you are here)
✅ QUICK_START_DEPLOY.md (5-minute quick start)
✅ VERCEL_DEPLOYMENT_GUIDE.md (detailed instructions)
✅ DEPLOYMENT_CHECKLIST.md (verification checklist)
✅ FRONTEND_UPDATE_SUMMARY.md (what changed)
✅ FRONTEND_API_CONFIGURATION.md (technical details)
✅ FRONTEND_READY_FOR_DEPLOYMENT.md (status)
✅ UNBOUND_DOCUMENTATION.md (project docs)
✅ HOSTING_GUIDE.md (hosting options)
```

### Configuration Files (in artifacts/dex/)
```
✅ .env (development)
✅ .env.production (production)
✅ .env.local (local override)
✅ .env.example (documentation)
✅ .vercelignore (Vercel build config)
```

### Code Changes
```
✅ src/hooks/useCandles.ts (fixed API URL)
✅ src/hooks/useFillNotifications.ts (fixed API URL)
✅ src/services/api.ts (uses API_BASE_URL)
✅ src/utils/constants.ts (defines API_BASE_URL)
```

## Environment Variable

The key configuration:

```env
VITE_API_URL=https://ubtbackend.fly.dev
```

This tells the frontend exactly where to send all API requests.

**Why this matters**: 
- Development uses localhost or proxy
- Production uses the real backend on Fly.io
- This variable controls which backend is used

## Troubleshooting

### Frontend shows "404 Not Found"
**Solution**: Check that environment variable is set in Vercel:
- Project Settings → Environment Variables
- Verify `VITE_API_URL=https://ubtbackend.fly.dev`
- Redeploy

### "Failed to fetch pairs" error
**Solution**: Check backend is running:
```bash
curl https://ubtbackend.fly.dev/health
# Should return: {"status":"ok","time":...}
```

### CORS errors in console
**Solution**: Backend has CORS enabled. Check browser console for exact error.

## Performance

The system is optimized for performance:
- ✅ Backend caches pair data (3-second refresh)
- ✅ Frontend caches API responses
- ✅ WebSocket for real-time updates
- ✅ Database indexes for fast queries
- ✅ Vercel CDN for global distribution

## Security

Production security measures:
- ✅ HTTPS everywhere
- ✅ Environment variables not in code
- ✅ Database requires authentication
- ✅ CORS properly configured
- ✅ API rate limiting (configurable)

## Support

Need help? Check these in order:

1. **Quick questions**: See [QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)
2. **Deployment help**: See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)
3. **Verification**: See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
4. **Technical details**: See [FRONTEND_API_CONFIGURATION.md](./FRONTEND_API_CONFIGURATION.md)
5. **Project info**: See [UNBOUND_DOCUMENTATION.md](./UNBOUND_DOCUMENTATION.md)

## Ready to Deploy?

You have everything you need. The system is production-ready.

**→ [Start with QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)** (5 minutes)

---

## Summary

| Phase | Status |
|-------|--------|
| **Backend** | ✅ Complete & Running |
| **Database** | ✅ Complete & Synced |
| **Pair Indexer** | ✅ Complete & Running |
| **Frontend Config** | ✅ Complete & Ready |
| **Deployment** | 🟡 Ready to Deploy |

**Next Action**: Deploy frontend to Vercel (see Quick Start)

---

**Last Updated**: July 20, 2026  
**System Status**: ✅ **PRODUCTION READY**  
**Frontend**: ✅ **READY FOR DEPLOYMENT**
