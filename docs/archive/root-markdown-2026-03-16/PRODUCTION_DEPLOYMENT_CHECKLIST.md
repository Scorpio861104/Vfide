# Production Deployment Checklist

This checklist ensures the VFIDE application is fully ready for production deployment.

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration ✅
- [ ] Copy `.env.production` to `.env.production.local`
- [ ] Fill in all required environment variables:
  - [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from https://cloud.walletconnect.com/
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `JWT_SECRET` - Generate with `openssl rand -base64 32`
  - [ ] `CSRF_SECRET` - Generate with `openssl rand -base64 32`
  - [ ] `SESSION_SECRET` - Generate with `openssl rand -base64 32`
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` - Get from https://sentry.io/
  - [ ] `UPSTASH_REDIS_REST_URL` - For rate limiting
  - [ ] `UPSTASH_REDIS_REST_TOKEN` - For rate limiting
- [ ] Set `NEXT_PUBLIC_IS_TESTNET=false` for mainnet
- [ ] Update smart contract addresses for mainnet
- [ ] Validate environment: `npm run validate:env`

### 2. Security Hardening ✅
- [ ] Verify CSRF protection is enabled
- [ ] Verify rate limiting is configured (Upstash Redis)
- [ ] Review CSP headers in `next.config.ts`
- [ ] Ensure all API endpoints have proper authentication
- [ ] Verify JWT token validation
- [ ] Check CORS configuration
- [ ] Review and test all input validation
- [ ] Scan for XSS vulnerabilities
- [ ] Test SQL injection protection
- [ ] Enable HTTPS enforcement (HSTS headers)
- [ ] Verify secure cookie settings

### 3. Database Setup ✅
- [ ] Set up production PostgreSQL database
- [ ] Configure connection pooling (min: 2, max: 10)
- [ ] Run database migrations: `npm run migrate:up`
- [ ] Verify all migrations completed successfully
- [ ] Set up database backups (daily recommended)
- [ ] Configure database monitoring
- [ ] Test database connection from application
- [ ] Review and optimize query performance
- [ ] Set up database access controls

### 4. Smart Contract Configuration ✅
- [ ] Deploy all contracts to mainnet (if not done)
- [ ] Verify contract addresses in `.env.production.local`
- [ ] Test contract interactions from frontend
- [ ] Verify ABI files are up to date
- [ ] Test wallet connection flow
- [ ] Test token operations (approve, transfer)
- [ ] Test DAO governance functions
- [ ] Verify on-chain verification for rewards/claims

### 5. Build & Testing ✅
- [ ] Run `npm install` to ensure dependencies are installed
- [ ] Run `npm run typecheck` - Fix all TypeScript errors
- [ ] Run `npm run lint` - Fix all linting errors
- [ ] Run `npm run test:ci` - All tests must pass
- [ ] Run `npm run build` - Production build must succeed
- [ ] Run `npm run start` - Verify production server starts
- [ ] Test all critical user flows:
  - [ ] Connect wallet
  - [ ] Create account/vault
  - [ ] Make payment
  - [ ] View dashboard
  - [ ] Submit proposal (if governance enabled)
  - [ ] Claim rewards
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Run performance tests: `npm run test:performance`
- [ ] Run accessibility tests: `npm run test:a11y`

### 6. Performance Optimization ✅
- [ ] Verify images are optimized
- [ ] Check bundle size: `npm run analyze`
- [ ] Enable compression (gzip/brotli)
- [ ] Configure CDN for static assets
- [ ] Set up proper caching headers
- [ ] Test page load speeds (target < 3s)
- [ ] Verify Core Web Vitals:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Enable service worker for PWA (if applicable)
- [ ] Test offline functionality

### 7. Monitoring & Logging ✅
- [ ] Configure Sentry error tracking
- [ ] Set up Datadog RUM (if using)
- [ ] Configure Google Analytics (if using)
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors
- [ ] Monitor database performance
- [ ] Monitor API response times
- [ ] Set up Slack/email notifications for incidents

### 8. Documentation ✅
- [ ] Update README.md with production deployment instructions
- [ ] Document environment variables
- [ ] Create runbook for common operations
- [ ] Document rollback procedures
- [ ] Create incident response plan
- [ ] Document backup/restore procedures
- [ ] Update API documentation
- [ ] Create user documentation (if needed)

### 9. Legal & Compliance ✅
- [ ] Privacy Policy is accessible at `/legal`
- [ ] Terms of Service are accessible at `/legal`
- [ ] Cookie consent banner (if required)
- [ ] GDPR compliance (if EU users)
- [ ] Disclaimer about token utility (not securities)
- [ ] Age verification (if required)
- [ ] Geographic restrictions (if any)

### 10. Infrastructure Setup ✅
- [ ] Domain configured and DNS propagated
- [ ] SSL certificate installed and valid
- [ ] CDN configured (if using)
- [ ] Load balancer configured (if using)
- [ ] Auto-scaling configured (if using)
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Backup servers/regions configured (if using)

## 🚀 Deployment Steps

### Pre-Deployment
1. Create production branch: `git checkout -b production`
2. Merge latest stable code
3. Run full test suite: `npm run test:all`
4. Create production build: `npm run build`
5. Test production build locally: `npm run start`

### Deployment
1. Deploy database migrations first
2. Deploy application code
3. Verify environment variables are set
4. Run smoke tests
5. Monitor error logs for first 30 minutes
6. Verify critical paths are working

### Post-Deployment
1. Test wallet connections
2. Test all critical user flows
3. Monitor performance metrics
4. Check error tracking dashboard
5. Verify analytics are collecting data
6. Monitor server resources (CPU, memory, disk)

## 🔄 Rollback Procedures

If issues are detected after deployment:

1. **Immediate Actions:**
   - Stop accepting new traffic (if critical)
   - Alert team members
   - Document the issue

2. **Rollback Code:**
   ```bash
   # Revert to previous deployment
   git revert <commit-hash>
   npm run build
   # Deploy previous version
   ```

3. **Rollback Database:**
   ```bash
   # Only if migrations were run
   npm run migrate:down
   ```

4. **Verify Rollback:**
   - Test critical paths
   - Check error rates return to normal
   - Monitor for 15 minutes

## 📊 Success Criteria

After deployment, verify:
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms (p95)
- [ ] Core Web Vitals are green
- [ ] All critical paths working
- [ ] No security vulnerabilities detected
- [ ] Uptime > 99.9% after 24 hours

## 🆘 Emergency Contacts

- **DevOps Lead:** [Contact info]
- **Security Lead:** [Contact info]
- **Database Admin:** [Contact info]
- **On-Call Engineer:** [Contact info]

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE_WIRING.md)
- [Security Audit](./SECURITY_AUDIT.md)
- [API Documentation](./openapi.yaml)
- [Deployment Guide](./docs/deployment.md)

## ✅ Sign-Off

Before deploying to production, the following roles must review and approve:

- [ ] **Tech Lead** - Code review complete
- [ ] **Security Lead** - Security audit passed
- [ ] **DevOps Lead** - Infrastructure ready
- [ ] **Product Manager** - Features approved
- [ ] **QA Lead** - All tests passed

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Approved By:** _______________  
