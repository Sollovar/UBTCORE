# UNBOUND DEX - Frontend Deployment to Vercel

This guide explains how to deploy the UNBOUND DEX frontend to Vercel.

## Prerequisites

- A Vercel account (free tier is sufficient)
- GitHub account (frontend repository already pushed)
- The backend API running on Fly.io (`https://ubtbackend.fly.dev`)

## Quick Deploy Steps

### Option 1: Deploy from Git (Easiest - Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository**
   - Select "GitHub"
   - Find and select `UBTCORE` repository (or your fork)
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `unbound-dex` (or your preferred name)
   - **Framework Preset**: Select "Vite"
   - **Root Directory**: `artifacts/dex`
   - Click "Continue"

4. **Set Environment Variables**
   - In the "Environment Variables" section, add:
     - **Name**: `VITE_API_URL`
     - **Value**: `https://ubtbackend.fly.dev`
   - Click "Add"
   - Make sure it's available for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy

6. **Access Your Frontend**
   - Once deployed, you'll get a URL like `https://unbound-dex.vercel.app`
   - Frontend is now live!

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to the frontend directory
cd artifacts/dex

# Login to Vercel
vercel login

# Deploy
vercel --prod

# When prompted:
# - Set environment variable VITE_API_URL=https://ubtbackend.fly.dev
# - Confirm build settings
```

## Environment Variables

The frontend needs one key environment variable:

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_API_URL` | Backend API URL | `https://ubtbackend.fly.dev` |

### Optional Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_WS_URL` | WebSocket URL (optional) | `wss://ubtbackend.fly.dev` |

If `VITE_WS_URL` is not set, the frontend will automatically upgrade the HTTP connection to WebSocket.

## Build Configuration

The Vercel deployment automatically detects:
- **Framework**: Vite (detected from `package.json`)
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

These are configured in the Vite config file at `artifacts/dex/vite.config.ts`.

## Verifying the Deployment

After deployment completes:

1. **Check Frontend Health**
   ```bash
   # Visit the frontend URL
   https://your-deployed-url.vercel.app
   ```

2. **Verify API Connection**
   - Open the browser console (F12 → Console tab)
   - Navigate to the Markets or Trade page
   - Check the Network tab to see API requests to `https://ubtbackend.fly.dev/api/v1/pairs`

3. **Test Pair Loading**
   - The Markets page should show pairs from the Fly.io backend
   - Prices should load without errors

## Troubleshooting

### Issue: "404 Not Found" when fetching pairs

**Solution**: Verify the `VITE_API_URL` environment variable is set correctly in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Check that `VITE_API_URL=https://ubtbackend.fly.dev` is set
- Redeploy: `vercel --prod`

### Issue: CORS Errors

**Solution**: The backend already has CORS enabled for all origins. If you still see CORS errors:
- Check browser console for exact error
- Verify backend is running: `https://ubtbackend.fly.dev/health`
- Ensure API URL doesn't have trailing slash

### Issue: Build Fails

**Solution**: 
- Check Vercel build logs for specific errors
- Ensure all dependencies are installed: `npm install`
- Verify `package.json` has correct scripts
- Check that TypeScript compilation passes: `npm run typecheck`

## Continuous Deployment

After initial deployment:

1. **Every push to main branch triggers automatic deployment**
2. **Preview deployments** are created for pull requests
3. **To disable auto-deploy**: Project Settings → Git → Disable Auto-Deploy

## Custom Domain (Optional)

To use a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update frontend API calls if domain changes

## Performance Optimization

The frontend deployment includes:
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Caching headers
- ✅ GZIP compression
- ✅ CDN distribution globally

No additional configuration needed - Vercel handles this automatically.

## Next Steps

After frontend deployment:

1. ✅ Frontend is live on Vercel
2. ✅ Backend is running on Fly.io
3. ✅ Pair indexer is syncing data
4. ⏳ **Next**: Deploy price worker (optional)
5. ⏳ **Next**: Connect wallet and test trading

## Support URLs

- **Frontend**: `https://unbound-dex.vercel.app` (or your custom URL)
- **Backend API**: `https://ubtbackend.fly.dev`
- **API Health**: `https://ubtbackend.fly.dev/health`
- **Pairs Endpoint**: `https://ubtbackend.fly.dev/api/v1/pairs`

## Documentation

For more information:
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [UNBOUND Architecture](./UNBOUND_DOCUMENTATION.md)
- [Hosting Guide](./HOSTING_GUIDE.md)
