# Frontend API Configuration - UNBOUND DEX

## Overview

The UNBOUND DEX frontend has been configured to connect to the Fly.io backend API at `https://ubtbackend.fly.dev`.

## Environment Variables

The frontend uses the following environment variable:

```env
VITE_API_URL=https://ubtbackend.fly.dev
```

This variable tells the frontend where the backend API is located.

## Configuration Files

### `.env` (Development)
```env
VITE_API_URL=https://ubtbackend.fly.dev
```

### `.env.production` (Production/Vercel)
```env
VITE_API_URL=https://ubtbackend.fly.dev
```

### `.env.local` (Local Override)
```env
VITE_API_URL=https://ubtbackend.fly.dev
```

## How It Works

1. **Build Time**: When the frontend is built, `VITE_API_URL` is embedded in the JavaScript bundle
2. **Runtime**: The frontend uses this URL to make API calls to the backend
3. **Fallback**: If `VITE_API_URL` is not set, the frontend tries relative paths (`/api/v1/...`)

## API Endpoints Used

The frontend calls the following backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/pairs` | GET | Fetch all trading pairs |
| `/api/v1/pairs?network=bsc` | GET | Fetch BSC pairs |
| `/api/v1/pairs?network=base` | GET | Fetch Base pairs |
| `/api/v1/pairs?network=solana` | GET | Fetch Solana pairs |
| `/api/v1/pairs/trending` | GET | Fetch trending pairs |
| `/api/v1/pairs/:id` | GET | Fetch pair details |
| `/api/v1/pairs/:id/orderbook` | GET | Fetch orderbook for a pair |
| `/api/v1/pairs/:id/trades` | GET | Fetch trades for a pair |
| `/api/v1/pairs/:id/candles` | GET | Fetch OHLC candles |
| `/api/v1/orders` | GET/POST | Get or create orders |
| `/api/v1/fills/address/:address` | GET | Get fills for an address |
| `/api/v1/auth/login` | POST | Authenticate user |
| `/ws` | WebSocket | Real-time updates |

## File Changes Made

### 1. Created Configuration Files
- ✅ `artifacts/dex/.env` - Development environment
- ✅ `artifacts/dex/.env.production` - Production environment
- ✅ `artifacts/dex/.env.local` - Local development override
- ✅ `artifacts/dex/.env.example` - Example for documentation
- ✅ `artifacts/dex/.vercelignore` - Vercel build ignore list

### 2. Fixed API Calls
- ✅ `artifacts/dex/src/hooks/useCandles.ts` - Fixed hardcoded `/api/v1/pairs/...` path
- ✅ `artifacts/dex/src/hooks/useFillNotifications.ts` - Fixed hardcoded `/api/v1/fills/address/...` path
- ✅ Added `API_BASE_URL` import to both files

### 3. Updated .gitignore
- ✅ Added `.env.production.local` to `.gitignore`

## Verification Steps

To verify the configuration is correct:

1. **Check Environment Variables**
   ```bash
   grep -r "VITE_API_URL" artifacts/dex/.env*
   # Should show: VITE_API_URL=https://ubtbackend.fly.dev
   ```

2. **Test Frontend Build**
   ```bash
   cd artifacts/dex
   npm run build
   ```
   Look for `.env` loading messages

3. **Test API Connection**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Navigate to Markets page
   - Look for requests to `https://ubtbackend.fly.dev/api/v1/pairs`
   - Should see 200 OK response with pair data

4. **Test Deployment to Vercel**
   - Environment variable: `VITE_API_URL=https://ubtbackend.fly.dev`
   - Verify in Vercel dashboard: Settings → Environment Variables
   - Trigger redeploy to apply

## Troubleshooting

### Issue: Frontend shows "Network Error" or "Failed to fetch pairs"

**Check 1**: Verify `VITE_API_URL` is set correctly
```javascript
// In browser console:
console.log(import.meta.env.VITE_API_URL)
// Should print: https://ubtbackend.fly.dev
```

**Check 2**: Verify backend is running
```bash
curl https://ubtbackend.fly.dev/health
# Should return: {"status":"ok","time":...}
```

**Check 3**: Check browser console for CORS errors
- The backend has CORS enabled for all origins
- If CORS error persists, check backend logs

### Issue: Builds fail on Vercel

**Solution**: 
1. Go to Vercel dashboard
2. Project Settings → Environment Variables
3. Ensure `VITE_API_URL=https://ubtbackend.fly.dev` is set
4. Redeploy

## Deployment to Vercel

For detailed deployment instructions, see [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

## Next Steps

1. Deploy frontend to Vercel using environment variable `VITE_API_URL=https://ubtbackend.fly.dev`
2. Verify pairs load on the frontend
3. Test trading functionality
4. (Optional) Deploy price worker
5. (Optional) Set up custom domain

## Architecture

```
┌─────────────────────┐
│  Vercel Frontend    │ ← Your deployed React app
│  (unbound-dex)      │
└──────────┬──────────┘
           │
           │ VITE_API_URL=https://ubtbackend.fly.dev
           ↓
┌─────────────────────┐
│  Fly.io Backend     │ ← Go API server
│  (ubtbackend)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Fly.io PostgreSQL  │ ← Database
│  (UNBT cluster)     │
└─────────────────────┘
```

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [UNBOUND Documentation](./UNBOUND_DOCUMENTATION.md)
- [Hosting Guide](./HOSTING_GUIDE.md)
