# UNBOUND DEX - Hosting & Deployment Guide

You now have 3 repositories on GitHub:
1. **UBTBackend** - Go API, matching engine, executor
2. **SupabaseUBT** - Database configuration, migrations, schema
3. Frontend (artifacts/dex) - React UI

This guide covers hosting all components together.

---

## Option 1: Vercel + Netlify + Railway (Recommended for Most)

### Frontend: Vercel or Netlify (Free)
- **Deploy:** React/Vite frontend from `artifacts/dex`
- **Steps:**
  1. Push frontend to GitHub: `github.com/Sollovar/UBTFrontend`
  2. Go to vercel.com, click "New Project"
  3. Import your GitHub repository
  4. Set root directory: `artifacts/dex`
  5. Deploy (auto-deploys on git push)
- **Cost:** Free tier includes up to 100GB bandwidth/month

### Backend: Railway (Recommended)
- **Deploy:** Go API + Redis + WebSocket
- **Steps:**
  1. Go to railway.app
  2. Click "New Project" → "Deploy from GitHub"
  3. Select `UBTBackend` repo
  4. Add PostgreSQL plugin (built-in)
  5. Add Redis plugin (built-in)
  6. Set environment variables (DB_*, RPC_*, etc.)
  7. Deploy
- **Cost:** ~$5/month for small instance, PostgreSQL included

### Database: Supabase Cloud (Recommended)
- **Deploy:** Managed PostgreSQL in cloud
- **Steps:**
  1. Go to supabase.com → Create new project
  2. Get connection string
  3. Update `backend/.env` with new DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
  4. Run migrations from `backend/migrations/` manually or via CLI
  5. Connect backend to cloud Supabase
- **Cost:** Free tier includes 500MB database + 2GB bandwidth
- **Alternative:** Use Supabase's own hosting

### Data Flow
```
Vercel Frontend (React)
    ↓ HTTPS
Railway Backend (Go) + Redis
    ↓
Supabase Cloud PostgreSQL
    ↓
Blockchain RPC Nodes (free tier sufficient)
```

---

## Option 2: Docker + Single Provider (Better Control)

### All-in-One on Railway/Render/Fly.io

Create a `docker-compose.yml` that combines:
- Backend (Go)
- Frontend (Node build)
- PostgreSQL
- Redis

Deploy as single container to:
- Railway
- Render.com
- Fly.io

**Advantages:** Everything bundled, single deployment  
**Disadvantages:** Less scalable, harder to debug individual components

---

## Option 3: AWS / Google Cloud / Azure (Enterprise)

Full control but more complex:
- **Frontend:** CloudFront + S3 (or Cloud Run, App Engine)
- **Backend:** EC2 / Cloud Run / App Engine
- **Database:** RDS PostgreSQL
- **Cache:** ElastiCache Redis

**Cost:** $50-200/month for production  
**Advantages:** Unlimited scale, enterprise SLA  
**Disadvantages:** Complex setup, learning curve

---

## Quick Start: Vercel + Railway + Supabase

### Step 1: Push Frontend to New Repo
```bash
cd artifacts/dex
git init
git add .
git commit -m "Initial commit: UNBOUND DEX Frontend"
git branch -M main
git remote add origin https://Sollovar:TOKEN@github.com/Sollovar/UBTFrontend.git
git push -u origin main
```

### Step 2: Deploy Frontend to Vercel
1. Go to vercel.com
2. Click "Import Project"
3. Paste: `https://github.com/Sollovar/UBTFrontend`
4. Set root directory: `.` (or leave blank)
5. Click "Deploy"
6. Get URL: `https://your-project.vercel.app`

### Step 3: Deploy Backend to Railway
1. Go to railway.app
2. Click "New Project" → "Deploy from GitHub Repo"
3. Select `UBTBackend`
4. Click "Create Service"
5. Add PostgreSQL plugin
6. Add Redis plugin
7. Set environment variables:
   ```
   PORT=8080
   DB_HOST=postgres.railway.internal (Railway auto-fills)
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=(Railway auto-generates)
   DB_NAME=postgres
   REDIS_URL=(Railway auto-fills)
   INFURA_URL=https://bsc-dataseed.nariox.org/
   ALCHEMY_URL=https://base-mainnet.infura.io/...
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
   ```
8. Deploy
9. Get URL: `https://your-backend.railway.app`

### Step 4: Setup Supabase Cloud
1. Go to supabase.com → Sign up
2. Create new project (choose region)
3. Get connection string: Settings → Database → URI
4. Go to Railway dashboard → Backend project
5. Update `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` with Supabase values
6. Run migrations:
   ```sql
   -- In Supabase SQL Editor, paste contents of backend/schema.sql
   -- Then run each migration from backend/migrations/
   ```

### Step 5: Configure Frontend Env Vars
Update `artifacts/dex/.env.production`:
```
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app/ws
```

Redeploy Vercel → automatic rebuild

---

## Environment Variables Checklist

### Backend (.env)
```
# Server
PORT=8080
ENVIRONMENT=production

# Database
DB_HOST=your-supabase-host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=postgres
DB_SSL_MODE=require

# Redis
REDIS_URL=redis://cache:6379

# Blockchain
INFURA_URL=https://bsc-dataseed.nariox.org/
ALCHEMY_URL=https://base-mainnet.infura.io/v3/YOUR_KEY
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Settlement
SETTLEMENT_CONTRACT_BSC=0x4896ebe3EE1436a58c690A8021301A6bFD6BD4E7
SETTLEMENT_CONTRACT_BASE=0x723da0ef5eea8370015465e9Cf2513D7e48e1b61
EXECUTOR_ENABLED=true
EXECUTOR_PRIVATE_KEY=your-key
EXECUTOR_RPC_URL=https://bsc-dataseed.nariox.org/
EXECUTOR_RPC_URL_BASE=https://base-mainnet.infura.io/...

# Solana
SOLANA_CUSTODY_ADDRESS=HpFAMjQ5Vxp8J7HMvPGNEXZgWxdvxqd6MzXX8DdqqXA3
SOLANA_CUSTODY_PRIVATE_KEY=your-keypair
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app/ws
```

---

## Monitoring & Logging

### Railway Dashboard
- Real-time logs
- Metrics (CPU, memory, bandwidth)
- Deployment history
- Auto-rollback on failure

### Vercel Dashboard
- Frontend performance metrics
- Deployment logs
- Analytics (page views, errors)
- Environment variables management

### Supabase Dashboard
- Database connections
- Query performance
- Backup history
- Auto-scaling metrics

---

## SSL/HTTPS

All three services provide automatic SSL certificates:
- **Vercel:** ✅ Automatic (your-project.vercel.app)
- **Railway:** ✅ Automatic (your-backend.railway.app)
- **Supabase:** ✅ Automatic (supabase.co)

No configuration needed!

---

## Custom Domain

### Add Custom Domain
1. **Frontend (Vercel):**
   - Go to Vercel Project Settings → Domains
   - Add `unbound.yourdomain.com`
   - Update DNS CNAME to Vercel
   
2. **Backend (Railway):**
   - Go to Railway Project Settings → Domain
   - Add `api.unbound.yourdomain.com`
   - Update DNS CNAME to Railway

3. **Database (Supabase):**
   - Already on supabase domain, no action needed

---

## Cost Summary

| Component | Service | Free Tier | Paid |
|-----------|---------|-----------|------|
| Frontend | Vercel | ✅ Unlimited builds | $20/mo Pro |
| Backend | Railway | ✅ $5 credit/mo | Pay-as-you-go |
| Database | Supabase | ✅ 500MB | $25/mo up to 8GB |
| Cache | Railway Redis | Included | Included |
| DNS | Any registrar | ✅ Free | $1-15/yr |
| **Total** | | **✅ Free for MVP** | **~$50-100/mo** |

---

## Scaling Considerations

### Frontend
- Vercel auto-scales on demand
- No action needed

### Backend
- Railway: Increase instance size in Settings
- Or add multiple instances with load balancer

### Database
- Supabase: Auto-scaling up to plan limit
- Upgrade plan for more resources
- Connection pooling available

### Redis
- Railway: Automatic (included with project)
- Already optimized

---

## Next Steps

1. **Create frontend repo:** Push `artifacts/dex` to GitHub
2. **Deploy to Vercel:** Follow Step 2 above
3. **Deploy to Railway:** Follow Step 3-4 above
4. **Migrate to Supabase Cloud:** Follow Step 5 above
5. **Update environment variables:** On Vercel and Railway
6. **Test in production:** Verify all features work
7. **Setup custom domain:** Optional but recommended
8. **Enable monitoring:** Set up alerts on Railway/Vercel
9. **Automated backups:** Supabase handles automatically
10. **CI/CD:** GitHub Actions (already working with Vercel/Railway)

---

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` and `VITE_WS_URL` in `.env.production`
- Verify Railway backend is running (check logs)
- Check CORS headers in backend

### Backend can't connect to database
- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Check SSL mode: `DB_SSL_MODE=require` for cloud
- Test connection locally first

### WebSocket not connecting
- Verify `VITE_WS_URL=wss://...` (not ws://)
- Check Railway backend logs for WebSocket errors
- Ensure backend is listening on correct port

### RPC calls failing
- Verify `INFURA_URL`, `ALCHEMY_URL`, `SOLANA_RPC_URL`
- Check rate limits on RPC providers
- Consider backup RPC endpoints

---

## Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Docker Docs:** https://docs.docker.com
- **Go Deployment:** https://golang.org/doc/

**Recommendation:** Start with Option 1 (Vercel + Railway + Supabase) - it's the easiest and most cost-effective for MVP/growth stage.
