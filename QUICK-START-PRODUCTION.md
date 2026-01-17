# 🚀 VFIDE Production Quick Start Guide

## Overview

VFIDE is now at **B+ (86/100)** production readiness. All 5 critical blockers have been fixed. This guide helps you deploy VFIDE to production quickly and safely.

---

## Prerequisites

### Required

- **Node.js** >= 20.0.0 (check: `node --version`)
- **npm** >= 9.0.0 (check: `npm --version`)
- **WalletConnect Project ID** (free from https://cloud.walletconnect.com/)
- **Git** (latest version)

### Optional (Recommended for Production)

- **Sentry Account** for error tracking
- **Upstash Redis** for rate limiting
- **PostgreSQL** for advanced features
- **Docker** for containerized deployment

---

## 5-Minute Setup (Development)

### 1. Clone and Install

```bash
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and add your WalletConnect Project ID
nano .env.local
```

**Minimum Required:**
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_from_walletconnect_cloud
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 🎉

---

## Production Deployment

### Option 1: Docker (Recommended)

**1. Configure Environment**

```bash
# Create production .env file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**2. Build and Run with Docker Compose**

```bash
# Build the Docker image
docker-compose build

# Start the application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f vfide-frontend
```

**3. Health Check**

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T01:00:00.000Z",
  "version": "0.1.0",
  "environment": "production"
}
```

---

### Option 2: Vercel (Easiest)

**1. Connect Repository**

- Visit https://vercel.com/new
- Import your VFIDE repository
- Configure project settings

**2. Add Environment Variables**

In Vercel dashboard, add:
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_IS_TESTNET=false
SENTRY_DSN=your_sentry_dsn (optional)
```

**3. Deploy**

Vercel will automatically:
- Build your application
- Run tests (if configured)
- Deploy to production
- Provide a URL

**4. Verify**

```bash
curl https://your-app.vercel.app/api/health
```

---

### Option 3: Manual Node.js Deployment

**1. Build Application**

```bash
# Install dependencies
npm ci --production=false

# Build
npm run build

# Prepare for production
npm prune --production
```

**2. Start Production Server**

```bash
# Set environment
export NODE_ENV=production
export NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Start server
npm start
```

**3. Use Process Manager (PM2)**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "vfide" -- start

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

---

## Configuration Checklist

### Essential (Must Have)

- [x] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - From https://cloud.walletconnect.com/
- [x] `NEXT_PUBLIC_IS_TESTNET` - Set to `false` for production
- [x] Node.js >= 20.0.0 installed

### Recommended (Should Have)

- [ ] `SENTRY_DSN` - Error tracking
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Client-side error tracking
- [ ] `NEXT_PUBLIC_GA_TRACKING_ID` - Google Analytics
- [ ] Custom RPC endpoints for better reliability
- [ ] SSL certificate (handled by Vercel/hosting)

### Advanced (Nice to Have)

- [ ] `DATABASE_URL` - PostgreSQL for advanced features
- [ ] `UPSTASH_REDIS_REST_URL` - Rate limiting
- [ ] `SMTP_*` - Email notifications
- [ ] `SESSION_SECRET` - Secure sessions
- [ ] Feature flags configuration

---

## Post-Deployment Checklist

### Immediate (First 24 Hours)

- [ ] Verify health check: `curl https://your-domain.com/api/health`
- [ ] Test wallet connections (MetaMask, Coinbase Wallet, WalletConnect)
- [ ] Monitor error rates in Sentry
- [ ] Check performance metrics (Lighthouse, Web Vitals)
- [ ] Test critical user flows (connect wallet, view profile, basic transactions)

### First Week

- [ ] Monitor server resources (CPU, memory, disk)
- [ ] Review error logs and fix critical issues
- [ ] Gather user feedback
- [ ] Run security scan
- [ ] Check bundle sizes and performance

### Ongoing

- [ ] Weekly dependency updates: `npm outdated` → `npm update`
- [ ] Monthly security audit: `npm audit`
- [ ] Performance monitoring (Web Vitals, Lighthouse scores)
- [ ] User analytics review
- [ ] Backup database (if applicable)

---

## Monitoring & Observability

### Health Check Endpoint

```bash
# Check application health
curl https://your-domain.com/api/health

# Expected: 200 OK with JSON response
```

### Sentry Error Tracking

1. Create account at https://sentry.io
2. Create new project
3. Copy DSN
4. Add to environment variables:
   ```bash
   SENTRY_DSN=your_sentry_dsn
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```

### Performance Monitoring

**Lighthouse CI (Recommended)**

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --config=lighthouse-budget.json
```

**Web Vitals Tracking**

- Already configured in application
- Reports to Sentry automatically
- Monitor in Sentry Performance dashboard

---

## Troubleshooting

### Issue: Wallets Not Connecting

**Symptom**: Only Coinbase Wallet works, MetaMask fails

**Solution**:
1. Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
2. Get Project ID from https://cloud.walletconnect.com/
3. Restart application after setting

**Verification**:
```bash
# Check console for warning
# Should NOT see: "No WalletConnect Project ID detected"
```

---

### Issue: Build Fails with TypeScript Errors

**Symptom**: `npm run build` fails with type errors

**Solution**:
```bash
# Run type check
npm run typecheck

# Fix errors or temporarily disable (not recommended)
# Edit next.config.ts: ignoreBuildErrors: true
```

---

### Issue: Docker Container Won't Start

**Symptom**: Container exits immediately

**Solution**:
```bash
# Check logs
docker-compose logs vfide-frontend

# Verify environment variables
docker-compose config

# Rebuild with no cache
docker-compose build --no-cache
```

---

### Issue: High Memory Usage

**Symptom**: Server runs out of memory

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in PM2
pm2 start npm --name "vfide" --node-args="--max-old-space-size=4096" -- start
```

---

## Security Best Practices

### Pre-Deployment

1. **Run Security Audit**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Check for Secrets**
   ```bash
   # Ensure no secrets in code
   git log --all --full-history -- '*env*'
   ```

3. **Review Environment Variables**
   - Never commit `.env` files
   - Use secure secret management
   - Rotate keys regularly

### Post-Deployment

1. **Monitor for Vulnerabilities**
   - Set up Dependabot alerts
   - Review Sentry security issues
   - Subscribe to security mailing lists

2. **Regular Updates**
   ```bash
   # Weekly dependency updates
   npm update
   npm audit
   ```

3. **Access Control**
   - Use strong passwords
   - Enable 2FA on all accounts
   - Limit production access

---

## Rollback Procedure

### If Deployment Fails

**Vercel:**
```bash
# Rollback to previous deployment
vercel rollback
```

**Docker:**
```bash
# Stop current containers
docker-compose down

# Checkout previous version
git checkout previous-tag

# Rebuild and restart
docker-compose build
docker-compose up -d
```

**PM2:**
```bash
# Stop application
pm2 stop vfide

# Checkout previous version
git checkout previous-tag

# Rebuild
npm run build

# Restart
pm2 restart vfide
```

---

## Performance Optimization

### Bundle Size

Current targets (from `.size-limit.json`):
- Main bundle: < 150KB
- Homepage: < 50KB
- Dashboard: < 75KB

**Check bundle sizes:**
```bash
npm run analyze
npm run size
```

### Web Vitals Targets

From `lighthouse-budget.json`:
- First Contentful Paint (FCP): < 2s
- Largest Contentful Paint (LCP): < 2.5s
- Total Blocking Time (TBT): < 300ms
- Cumulative Layout Shift (CLS): < 0.1

**Measure:**
```bash
npm run test:performance
```

---

## Next Steps

### Immediate (Do Now)

1. ✅ Complete this quick start
2. ✅ Deploy to staging
3. ✅ Test all critical flows
4. ✅ Set up monitoring
5. ✅ Document any issues

### Short-term (Next 2 Weeks)

1. [ ] Resolve 8 low severity vulnerabilities
2. [ ] Implement rate limiting
3. [ ] Create API documentation
4. [ ] Set up monitoring dashboards
5. [ ] Perform load testing

See [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) for complete plan.

### Long-term (Next 2-3 Months)

1. [ ] Complete Phase 1 high priority issues (90/100 rating)
2. [ ] Complete Phase 2 medium priority improvements (96/100 rating)
3. [ ] Full production launch
4. [ ] Public announcement

---

## Support Resources

### Documentation

- [COMPREHENSIVE-TESTING-PLAN.md](COMPREHENSIVE-TESTING-PLAN.md) - Complete testing strategy
- [SYSTEM-ENHANCEMENTS.md](SYSTEM-ENHANCEMENTS.md) - System improvement roadmap
- [PRODUCTION-READINESS-ASSESSMENT.md](PRODUCTION-READINESS-ASSESSMENT.md) - Detailed assessment
- [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) - Path to 96/100
- [WALLET-CONNECTION-SETUP.md](WALLET-CONNECTION-SETUP.md) - Wallet setup guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security policy

### External Resources

- **WalletConnect**: https://cloud.walletconnect.com/
- **Next.js Docs**: https://nextjs.org/docs
- **RainbowKit Docs**: https://rainbowkit.com/docs
- **Vercel Deployment**: https://vercel.com/docs
- **Docker Docs**: https://docs.docker.com/

### Getting Help

- **GitHub Issues**: https://github.com/Scorpio861104/Vfide/issues
- **GitHub Discussions**: https://github.com/Scorpio861104/Vfide/discussions
- **Security Issues**: security@vfide.com (private)

---

## Success Metrics

Track these KPIs post-deployment:

### Technical Metrics

- [ ] Uptime: > 99.9%
- [ ] Response time: < 200ms (p95)
- [ ] Error rate: < 0.1%
- [ ] Lighthouse score: > 90
- [ ] Core Web Vitals: All "Good"

### Business Metrics

- [ ] Wallet connection success rate: > 95%
- [ ] Transaction completion rate: > 90%
- [ ] User retention (7-day): > 40%
- [ ] Page load time: < 2s
- [ ] Mobile usage: Track and optimize

---

**Last Updated**: 2026-01-17  
**Version**: 0.1.0  
**Production Readiness**: B+ (86/100)  
**Status**: ✅ Ready for soft launch
