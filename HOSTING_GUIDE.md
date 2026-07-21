# UNBOUND DEX - Hosting & Deployment Guide

You now have 3 repositories on GitHub:
1. **UBTBackend** - Go API, matching engine, executor
2. **SupabaseUBT** - Database configuration, migrations, schema
3. Frontend (artifacts/dex) - React UI

This guide covers hosting all components together.

---

## Option 1: Fly.io Backend + Fly.io PostgreSQL (Simplest & Cheapest)

### Deploy Everything on Fly.io

Fly.io lets you host both your backend AND database on the same platform—super simple.

### Setup Steps

**1. Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

**2. Deploy your backend with built-in PostgreSQL:**
```bash
cd /path/to/your/backend
fly launch  # Creates fly.toml and asks for app name (e.g., "ubt-backend")
```

**3. Fly CLI will ask:**
- App name: `ubt-backend`
- Region: Choose closest to you (e.g., `sin` for Singapore, `iad` for US)
- Postgres database? **Answer YES**
- Redis database? **Answer YES**

**4. This auto-generates `fly.toml` config. It will:**
- Create PostgreSQL instance
- Create Redis instance
- Set environment variables automatically (DATABASE_URL, REDIS_URL)
- Deploy your backend

**5. Deploy:**
```bash
fly deploy
```

Your backend is now live at `https://ubt-backend.fly.dev`

**6. Deploy Frontend separately (Vercel or Netlify):**
```bash
# Just connect your GitHub repo to Vercel
# Set root directory: artifacts/dex
# Deploy
```

### Data Flow
```
Frontend (Vercel) → API Gateway (Fly.io)
    ↓
Backend (Go) + WebSocket (Fly.io)
    ↓
PostgreSQL (Fly.io) + Redis (Fly.io)
    ↓
Blockchain RPC Nodes
```

### Advantages
✅ **ONE CLICK deployment** (almost)  
✅ PostgreSQL included and auto-managed  
✅ Redis included  
✅ Auto-scaling built-in  
✅ Global edge network (fast everywhere)  
✅ Cheapest option (~$3-8/month)  
✅ Free SSL/HTTPS  
✅ No DevOps knowledge needed  

### Cost Breakdown
- Shared PostgreSQL: $7/month (3GB storage)
- Shared Redis: $3/month (1GB)
- Backend compute: Pay-as-you-go (~$0.15/hour = ~$3-5/month light usage)
- **Total: ~$13-15/month** (or less if you use free tier)

### Free Tier Available
- 3 shared-cpu-1x machines
- 3GB PostgreSQL
- 3GB Redis
- Very suitable for testing/staging

### Why Fly.io PostgreSQL vs Supabase?
| Feature | Fly.io PostgreSQL | Supabase |
|---------|------------------|----------|
| Cost | $7/mo | $25/mo |
| PostgreSQL | ✅ Same | ✅ Same |
| Redis | ✅ Included | ❌ Separate ($3-5) |
| API | ❌ No (use direct) | ✅ REST/GraphQL |
| Auth | ❌ Use own | ✅ Built-in |
| Real-time | ❌ Manual | ✅ Built-in |
| Setup | One command | More config |
| **For your DEX** | ✅ **RECOMMENDED** | Overkill |

**Your DEX uses direct database queries via Go backend** (not Supabase REST API), so Fly.io PostgreSQL is perfect—simpler and cheaper!

### Migration from Supabase to Fly.io
If you already have Supabase running locally:
```bash
# 1. Create Fly app with PostgreSQL
fly launch

# 2. Get connection details
fly postgres connect

# 3. Dump your Supabase schema
pg_dump -U postgres supabase_db > backup.sql

# 4. Restore to Fly PostgreSQL
psql $DATABASE_URL < backup.sql

# 5. Update backend .env
DATABASE_URL=$(fly postgres connect --proxy-port 5432)
```

Done! Your backend now uses Fly.io PostgreSQL instead of Supabase.

---

## Option 1B: Vercel + Railway + Supabase (Popular Choice)

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
- **IMPORTANT:** Supabase is a managed service and must be hosted on Supabase.com, NOT Railway
- **Steps:**
  1. Go to supabase.com → Create new project
  2. Get connection string from Settings → Database
  3. Copy these credentials:
     - Database URL (PostgreSQL connection string)
     - Supabase URL (API endpoint)
     - Supabase API Key (anon public key)
  4. Add to your Railway backend environment variables:
     - `DATABASE_URL=<your-supabase-connection-string>`
     - `SUPABASE_URL=<your-supabase-url>`
     - `SUPABASE_KEY=<your-supabase-api-key>`
  5. Run migrations from `backend/migrations/` using Supabase CLI or manually
- **Cost:** Free tier includes 500MB database + 2GB bandwidth
- **Why not Railway?** Supabase isn't a containerized app—it's a managed PostgreSQL service that requires Supabase infrastructure

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

## Option 3: VPS (Single Server - Best Control)

### All-in-One VPS Deployment (DigitalOcean, Linode, AWS EC2, Hetzner, etc.)

Host everything on one Linux VPS:

### Setup Steps

**1. Rent a VPS**
- DigitalOcean: $6-12/month (Droplet with Ubuntu 22.04)
- Linode: $5-15/month
- Hetzner: €3-5/month (very affordable)
- AWS EC2: $5-10/month (free tier for 12 months)

**2. SSH into your VPS and install required software:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Go (for backend)
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

**3. Clone your repositories:**
```bash
cd /home/username
git clone https://github.com/Sollovar/UBTCORE.git
cd UBTCORE
```

**4. Setup PostgreSQL Database:**
```bash
sudo su - postgres
psql

# Create database and user
CREATE DATABASE ubt_db;
CREATE USER ubt_user WITH PASSWORD 'strong_password_here';
ALTER ROLE ubt_user SET client_encoding TO 'utf8';
ALTER ROLE ubt_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ubt_user SET default_transaction_deferrable TO on;
ALTER ROLE ubt_user SET default_transaction_read_only TO off;
ALTER ROLE ubt_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ubt_db TO ubt_user;

# Run migrations
# Connect as ubt_user and run your migration files from supabase/migrations/
```

**5. Build and run backend:**
```bash
cd /home/username/UBTCORE/backend

# Create .env with your settings
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=ubt_user
DB_PASSWORD=strong_password_here
DB_NAME=ubt_db
REDIS_URL=redis://localhost:6379
PORT=8080
NODE_ENV=production
# Add other required env vars
EOF

# Build backend
go build -o ubt-backend

# Run as systemd service (persistent)
sudo tee /etc/systemd/system/ubt-backend.service > /dev/null << EOF
[Unit]
Description=UNBOUND DEX Backend
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=username
WorkingDirectory=/home/username/UBTCORE/backend
ExecStart=/home/username/UBTCORE/backend/ubt-backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ubt-backend
sudo systemctl start ubt-backend
```

**6. Build and serve frontend:**
```bash
cd /home/username/UBTCORE/artifacts/dex

# Install dependencies
npm install

# Build for production
npm run build

# Serve with Nginx (see below)
```

**7. Configure Nginx as reverse proxy:**
```bash
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
upstream backend {
    server localhost:8080;
}

server {
    listen 80 default_server;
    server_name your_domain.com;

    # Frontend
    location / {
        root /home/username/UBTCORE/artifacts/dex/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo systemctl restart nginx
```

**8. Enable HTTPS (SSL certificate - free with Let's Encrypt):**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
sudo systemctl restart nginx
```

### Data Flow
```
Your Domain → Nginx (port 80/443)
    ↓
Frontend (React static files)
Backend (Go API on :8080)
    ↓
PostgreSQL (local)
    ↓
Redis (local)
    ↓
Blockchain RPC Nodes
```

### Advantages
✅ Full control over infrastructure  
✅ No vendor lock-in  
✅ Cheapest option (~$5-15/month all-in)  
✅ Can run everything on same server  
✅ Easy to debug and manage  

### Disadvantages
❌ You maintain the server (updates, security, backups)  
❌ No auto-scaling  
❌ Single point of failure (no redundancy)  

### Maintenance Tips
- Backup database regularly: `pg_dump ubt_db > backup.sql`
- Monitor disk space: `df -h`
- Check logs: `journalctl -u ubt-backend -f`
- Keep system updated: `sudo apt update && sudo apt upgrade`

---

## Option 4: AWS / Google Cloud / Azure (Enterprise)

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
