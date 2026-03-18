# 🚀 Quick Deployment Instructions

**Fast-track guide to deploy VFIDE to production**

---

## ⚡ Quick Start (5 Minutes)

### 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. Configure Environment Variables

Add these in Vercel Dashboard (Settings → Environment Variables):

**Critical Variables:**
```
DATABASE_URL=your-postgres-url
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
JWT_SECRET=generate-with-openssl
CSRF_SECRET=generate-with-openssl
SESSION_SECRET=generate-with-openssl
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-wc-id
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

Generate secrets:
```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For CSRF_SECRET  
openssl rand -base64 32  # For SESSION_SECRET
```

### 3. Deploy

**Using Script (Recommended):**
```bash
./scripts/deploy.sh production
```

**Or Manually:**
```bash
vercel --prod
```

### 4. Verify

```bash
curl https://your-domain.vercel.app/api/health
```

---

## 📋 Pre-Deployment Requirements

### Required Services

1. **PostgreSQL Database** - Get from:
   - Vercel Postgres (easiest)
   - Neon.tech (recommended)
   - Supabase
   - Your own server

2. **Redis (Upstash)** - https://upstash.com
   - Create database
   - Copy REST URL & Token

3. **Sentry** - https://sentry.io
   - Create Next.js project
   - Copy DSN

4. **WalletConnect** - https://cloud.walletconnect.com
   - Create project
   - Copy Project ID

5. **Smart Contracts** - Deploy to mainnet first
   - Update contract addresses in env vars

---

## 🔧 Deployment Methods

### Method 1: Automated Script ⭐

```bash
# Clone repo
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide

# Run deployment
./scripts/deploy.sh production
```

The script will:
- ✅ Check prerequisites
- ✅ Run TypeScript check
- ✅ Run linter
- ✅ Test build
- ✅ Deploy to Vercel
- ✅ Verify deployment

### Method 2: Vercel CLI

```bash
# First time setup
vercel link

# Add environment variables
vercel env add VARIABLE_NAME production

# Deploy
vercel --prod
```

### Method 3: GitHub Integration

1. Connect repo to Vercel
2. Configure environment variables in dashboard
3. Push to main branch
4. Automatic deployment!

### Method 4: Docker

```bash
# Build
docker build -t vfide:latest .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e UPSTASH_REDIS_REST_URL="..." \
  vfide:latest
```

---

## ✅ Post-Deployment Checklist

### Immediate Verification (< 5 minutes)

```bash
# Health check
curl https://your-domain/api/health

# Homepage
curl https://your-domain/

# Test wallet connection
# Visit https://your-domain and connect wallet
```

### Functional Testing (10-15 minutes)

- [ ] Connect wallet (MetaMask, WalletConnect)
- [ ] Create vault
- [ ] Send payment
- [ ] View dashboard
- [ ] Check transaction history

### Monitoring Setup (5 minutes)

- [ ] Verify Sentry is receiving events
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts

---

## 🔥 Common Issues & Quick Fixes

### Build Fails

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working

```bash
# Check variables are set
vercel env ls

# Pull to local
vercel env pull
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Run migrations
DATABASE_URL=your-prod-db npm run migrate:up
```

### Wallet Connection Not Working

1. Check WalletConnect Project ID is correct
2. Verify you're on correct network (mainnet)
3. Clear browser cache
4. Try different wallet

---

## 📊 Deployment Status

### Current State

- ✅ Application code: Production ready
- ✅ Build configuration: Complete
- ✅ Security: Hardened
- ✅ Performance: Optimized
- ✅ Documentation: Complete
- ✅ Tests: Passing (209 test files)
- ✅ Deployment scripts: Ready

### What You Need

- ⏳ Vercel account & project setup
- ⏳ Database provisioned
- ⏳ Redis configured
- ⏳ Environment variables set
- ⏳ Smart contracts deployed to mainnet
- ⏳ Domain configured (optional)

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Health endpoint returns 200
- ✅ Homepage loads
- ✅ Wallet connects
- ✅ Database queries work
- ✅ No errors in Sentry
- ✅ Performance < 3s load time

---

## 📚 Documentation

**Detailed Guides:**
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Comprehensive checklist
- `PRODUCTION_READINESS_REPORT.md` - Production assessment
- `README.md` - General documentation

**Quick Reference:**
- Environment variables: `.env.production.example`
- Build script: `npm run build`
- Start script: `npm run start`
- Health endpoint: `/api/health`

---

## 🆘 Need Help?

1. **Check logs:**
   ```bash
   vercel logs
   ```

2. **Review errors:**
   - Sentry dashboard
   - Vercel dashboard → Deployments → Logs

3. **Rollback if needed:**
   ```bash
   vercel rollback [deployment-url]
   ```

4. **Contact:**
   - Open GitHub issue
   - Check documentation
   - Review troubleshooting section

---

## 🎉 You're Ready!

The VFIDE application is production-ready and waiting to be deployed.

**Next Step:** Run `./scripts/deploy.sh production`

---

**Estimated deployment time:** 15-30 minutes  
**Difficulty:** Easy (with Vercel) to Medium (with Docker)  
**Requirements:** All prerequisites set up

Good luck! 🚀
