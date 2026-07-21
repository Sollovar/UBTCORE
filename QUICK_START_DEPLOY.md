# Quick Start - Deploy UNBOUND DEX Frontend

**Time Required**: 5 minutes to deploy + 10 minutes for build

## Prerequisites
- Vercel account (free)
- GitHub account with UBTCORE repository access

## Step-by-Step Deployment

### 1. Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

### 2. Create New Project
- Click: `Add New...` → `Project`
- Click: `Continue with GitHub`

### 3. Select Repository
- Search for: `UBTCORE`
- Click: Select the repository

### 4. Configure Build Settings

| Setting | Value |
|---------|-------|
| Project Name | `unbound-dex` (or your choice) |
| Framework | `Vite` |
| Root Directory | `artifacts/dex` |
| Build Command | `npm run build` |
| Output Directory | `dist/public` |

### 5. Add Environment Variables

**Critical Step**: Add this environment variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://ubtbackend.fly.dev` |

**Make sure it's available for**: Production, Preview, Development

### 6. Click "Deploy"
- Wait 5-10 minutes for build to complete
- Vercel will show deployment progress

### 7. Access Your Frontend
- Vercel will provide a URL (e.g., `https://unbound-dex.vercel.app`)
- Click to visit your live frontend

### 8. Verify It Works
1. Navigate to `/trade`
2. Go to **Markets** tab
3. Should see 59 pairs loading
4. No errors in DevTools Console (F12)

## That's It! 🎉

Your UNBOUND DEX frontend is now live and connected to the backend!

## Testing Checklist

- [ ] Frontend loads without errors
- [ ] Markets page displays 59 pairs
- [ ] Pair prices are visible
- [ ] Can click on a pair to view details
- [ ] Mobile view works
- [ ] No CORS errors in console
- [ ] Network requests go to `https://ubtbackend.fly.dev`

## If Something Goes Wrong

### Error: "Failed to fetch pairs"
1. Check environment variable in Vercel
2. Verify `VITE_API_URL=https://ubtbackend.fly.dev` is set
3. Redeploy project

### Error: CORS issue
1. This shouldn't happen - backend has CORS enabled
2. Check backend is running: `https://ubtbackend.fly.dev/health`
3. Check browser console for exact error

### Build Failed
1. Check Vercel build logs
2. Verify all dependencies installed
3. Try redeploying

## Useful Links

- **Frontend**: Your deployed Vercel URL
- **Backend**: `https://ubtbackend.fly.dev`
- **Pairs API**: `https://ubtbackend.fly.dev/api/v1/pairs`
- **Health Check**: `https://ubtbackend.fly.dev/health`

## Next Steps

After successful deployment:
1. ✅ Frontend is live
2. ✅ Backend is running
3. ✅ Database is synced
4. ⏳ Optional: Deploy price worker
5. ⏳ Optional: Set up custom domain

## Need More Help?

See the full guides:
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Detailed instructions
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Complete checklist
- [FRONTEND_READY_FOR_DEPLOYMENT.md](./FRONTEND_READY_FOR_DEPLOYMENT.md) - Technical details

---

**Ready?** → Go to https://vercel.com/dashboard and start deploying!
