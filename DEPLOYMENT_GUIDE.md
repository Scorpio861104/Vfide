# 🚀 VFIDE Deployment Guide

**Complete guide for deploying VFIDE to production**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Recommended: Vercel Deployment](#vercel-deployment)
4. [Alternative: Docker Deployment](#docker-deployment)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

Before deploying, you need:

1. **Database:** PostgreSQL (Recommended: Vercel Postgres, Neon, or Supabase)
2. **Redis:** For rate limiting (Recommended: Upstash Redis)
3. **Error Tracking:** Sentry account
4. **Blockchain:** WalletConnect Project ID
5. **Smart Contracts:** Deployed to mainnet with verified addresses

### Required Tools

```bash
# Node.js 18+
node --version  # Should be 18 or higher

# npm
npm --version

# Git
git --version
```

---

## Deployment Options

### Option 1: Vercel (⭐ Recommended)

**Best for:** Quick deployment, automatic scaling, zero DevOps

**Pros:**
- ✅ Zero configuration needed
- ✅ Automatic HTTPS & CDN
- ✅ Built-in CI/CD
- ✅ Free tier available
- ✅ Edge functions support
- ✅ Simple environment management

**Cons:**
- ❌ Less infrastructure control
- ❌ Vendor lock-in

### Option 2: Docker + Cloud

**Best for:** Full control, custom infrastructure, existing Docker workflow

**Pros:**
- ✅ Complete control
- ✅ Can run anywhere
- ✅ Custom scaling
- ✅ Multi-cloud support

**Cons:**
- ❌ More setup required
- ❌ Need to manage infrastructure
- ❌ Higher operational overhead

### Option 3: Traditional VM/VPS

**Best for:** Custom requirements, existing infrastructure

**Pros:**
- ✅ Maximum control
- ✅ Cost-effective at scale

**Cons:**
- ❌ Most complex setup
- ❌ Manual scaling
- ❌ Requires DevOps expertise

---

## Vercel Deployment

### Step 1: Install Vercel CLI

```bash
npm install -g vercel

# Login to Vercel
vercel login
```

### Step 2: Set Up Required Services

#### 2.1 Database (PostgreSQL)

**Option A: Vercel Postgres**
```bash
# In your Vercel dashboard:
# Storage → Create Database → Postgres
# Copy connection string
```

**Option B: Neon (Recommended for larger projects)**
1. Visit https://neon.tech
2. Create account and project
3. Copy connection string

**Option C: Supabase**
1. Visit https://supabase.com
2. Create project
3. Get connection string from Settings → Database

#### 2.2 Redis (Upstash)

1. Visit https://upstash.com
2. Create Redis database
3. Copy REST URL and token

#### 2.3 Sentry (Error Tracking)

1. Visit https://sentry.io
2. Create project (Next.js)
3. Copy DSN

#### 2.4 WalletConnect

1. Visit https://cloud.walletconnect.com
2. Create project
3. Copy Project ID

### Step 3: Configure Environment Variables

Create `.env.production.local`:

```bash
# Copy template
cp .env.production.example .env.production.local
```

Fill in all required variables:

```env
# ============================================
# CRITICAL: Required for Production
# ============================================

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://vfide.io
NEXT_PUBLIC_IS_TESTNET=false

# Database
DATABASE_URL=postgresql://user:password@host:5432/vfide_production

# Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Security Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-here
CSRF_SECRET=your-csrf-secret-here
SESSION_SECRET=your-session-secret-here

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Smart Contracts (Base Mainnet)
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_ADDRESS=0x...

# Blockchain RPCs
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_ZKSYNC_RPC_URL=https://mainnet.era.zksync.io

# ============================================
# Optional: Advanced Configuration
# ============================================

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# API Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Session
SESSION_MAX_AGE=86400

# CORS
ALLOWED_ORIGINS=https://vfide.io,https://www.vfide.io
```

### Step 4: Generate Security Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32

# Generate Session secret
openssl rand -base64 32
```

### Step 5: Deploy to Vercel

#### First-time Setup

```bash
# Navigate to project
cd /path/to/Vfide

# Link to Vercel (follow prompts)
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel env add DATABASE_URL production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add JWT_SECRET production
vercel env add CSRF_SECRET production
vercel env add SESSION_SECRET production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# ... add all other environment variables
```

Or use Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add all variables from `.env.production.local`
3. Set them for "Production" environment

#### Deploy

```bash
# Production deployment
vercel --prod

# Or push to main branch (if GitHub integration is set up)
git push origin main
```

### Step 6: Run Database Migrations

```bash
# Connect to production database
DATABASE_URL=your-production-db-url npm run migrate:up

# Verify migrations
DATABASE_URL=your-production-db-url npm run migrate:status
```

### Step 7: Verify Deployment

1. **Check Health Endpoint:**
   ```bash
   curl https://vfide.io/api/health
   ```

2. **Test Critical Paths:**
   - Visit https://vfide.io
   - Connect wallet
   - Test dashboard
   - Test payment flow

3. **Monitor Logs:**
   ```bash
   vercel logs
   ```

4. **Check Sentry:**
   - Visit your Sentry dashboard
   - Verify error tracking is working

---

## Docker Deployment

### Step 1: Build Docker Image

```bash
# Build production image
docker build -t vfide-app:latest .

# Test locally
docker run -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e UPSTASH_REDIS_REST_URL="your-redis-url" \
  -e UPSTASH_REDIS_REST_TOKEN="your-redis-token" \
  vfide-app:latest
```

### Step 2: Deploy to Cloud Provider

#### AWS ECS

```bash
# Tag image
docker tag vfide-app:latest your-aws-account.dkr.ecr.region.amazonaws.com/vfide:latest

# Push to ECR
aws ecr get-login-password --region region | docker login --username AWS --password-stdin your-aws-account.dkr.ecr.region.amazonaws.com
docker push your-aws-account.dkr.ecr.region.amazonaws.com/vfide:latest

# Deploy to ECS (configure in AWS Console or use Terraform)
```

#### Google Cloud Run

```bash
# Tag and push
gcloud builds submit --tag gcr.io/project-id/vfide

# Deploy
gcloud run deploy vfide \
  --image gcr.io/project-id/vfide \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### DigitalOcean

```bash
# Use App Platform
# 1. Push to GitHub
# 2. Connect repo in DigitalOcean
# 3. Configure as Dockerfile deployment
# 4. Set environment variables
# 5. Deploy
```

### Step 3: Set Up Reverse Proxy

```nginx
# /etc/nginx/sites-available/vfide
server {
    listen 80;
    server_name vfide.io www.vfide.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vfide.io www.vfide.io;

    ssl_certificate /etc/letsencrypt/live/vfide.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vfide.io/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Post-Deployment Checklist

### Immediate Verification (Critical)

- [ ] **Health check:** `curl https://vfide.io/api/health` returns 200
- [ ] **Homepage loads:** https://vfide.io is accessible
- [ ] **HTTPS works:** Certificate is valid
- [ ] **Wallet connection:** MetaMask/WalletConnect works
- [ ] **Database connection:** Dashboard loads user data
- [ ] **Error tracking:** Sentry receives test error
- [ ] **Rate limiting:** Redis connection works

### Functional Testing

- [ ] **User flows:**
  - [ ] Connect wallet
  - [ ] Create vault
  - [ ] Send payment
  - [ ] Receive payment
  - [ ] View transaction history
  - [ ] Submit governance proposal
  - [ ] Vote on proposal
  - [ ] Claim rewards

- [ ] **Smart contract interaction:**
  - [ ] Token approval
  - [ ] Token transfer
  - [ ] Vault operations
  - [ ] DAO operations

- [ ] **Performance:**
  - [ ] LCP < 2.5s
  - [ ] FCP < 1.8s
  - [ ] CLS < 0.1
  - [ ] Page load < 3s

### Security Verification

- [ ] **Security headers:** Use https://securityheaders.com
- [ ] **SSL/TLS:** Use https://www.ssllabs.com/ssltest/
- [ ] **CSRF protection:** Test with Burp Suite
- [ ] **Rate limiting:** Test with curl loops
- [ ] **Input validation:** Test with malicious input
- [ ] **XSS protection:** Test with XSS payloads
- [ ] **SQL injection:** Test with SQL payloads

### Browser/Device Testing

- [ ] **Desktop browsers:**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

- [ ] **Mobile devices:**
  - [ ] iOS Safari
  - [ ] Android Chrome
  - [ ] Mobile wallet apps

---

## Monitoring & Maintenance

### Set Up Monitoring

**1. Uptime Monitoring**
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Set up alerts for downtime

**2. Performance Monitoring**
- Vercel Analytics (built-in)
- Google PageSpeed Insights
- Lighthouse CI

**3. Error Tracking**
- Sentry (already configured)
- Set up Slack/email alerts

**4. Log Aggregation**
- Vercel Logs (for Vercel)
- CloudWatch (for AWS)
- StackDriver (for GCP)

### Regular Maintenance

**Daily:**
- [ ] Check error rates in Sentry
- [ ] Monitor uptime status
- [ ] Review critical logs

**Weekly:**
- [ ] Review performance metrics
- [ ] Check security alerts
- [ ] Update dependencies (if needed)
- [ ] Review database performance

**Monthly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Backup verification

---

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and rebuild
vercel --force

# Or locally:
rm -rf .next node_modules
npm install
npm run build
```

#### Environment Variables Not Working

```bash
# Check if variables are set
vercel env ls

# Pull environment variables
vercel env pull .env.local
```

#### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check if migrations ran
npm run migrate:status
```

#### Rate Limiting Not Working

```bash
# Test Redis connection
redis-cli -u $UPSTASH_REDIS_REST_URL ping
```

#### Wallet Connection Issues

1. Check WalletConnect Project ID is correct
2. Verify network configuration (mainnet vs testnet)
3. Check browser console for errors
4. Test with different wallets

### Getting Help

- **Documentation:** Review all `.md` files in repository
- **Logs:** Check Vercel logs or container logs
- **Sentry:** Review error details and stack traces
- **Community:** Open GitHub issue with deployment logs

---

## Rollback Procedure

If deployment fails or issues are found:

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Docker

```bash
# Stop current container
docker stop vfide-app

# Start previous version
docker run -d -p 3000:3000 vfide-app:previous-tag
```

---

## Success Criteria

Deployment is successful when:

✅ All health checks pass  
✅ No critical errors in Sentry  
✅ All user flows work  
✅ Performance meets targets  
✅ Security headers are correct  
✅ Monitoring is active  
✅ Backups are configured  

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch for any issues
2. **Announce launch** - Social media, community
3. **User onboarding** - Help first users get started
4. **Gather feedback** - Collect user feedback
5. **Iterate** - Plan improvements based on usage

---

**🎉 Congratulations on deploying VFIDE!**

For questions or issues, refer to:
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Detailed checklist
- `PRODUCTION_READINESS_REPORT.md` - Production status
- `README.md` - General documentation
