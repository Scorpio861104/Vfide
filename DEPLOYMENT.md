# Production Deployment Guide

Complete guide for deploying VFIDE to production with all infrastructure, security, and monitoring configured.

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ database
- [ ] Redis 6+ instance
- [ ] Domain name with SSL certificate
- [ ] Cloud provider account (AWS/GCP/Azure/Vercel)
- [ ] Blockchain node access (Infura/Alchemy)
- [ ] SMTP service for emails (SendGrid/AWS SES)

---

## Step 1: Environment Configuration

### 1.1 Copy Environment Template
```bash
cp .env.production.example .env.production
```

### 1.2 Generate Secure Secrets
```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CSRF secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.3 Configure Environment Variables

Edit `.env.production` with your values:

**Database:**
```env
DATABASE_URL="postgresql://user:password@host:5432/vfide_production?connection_limit=20"
```

**Redis:**
```env
REDIS_URL="redis://your-redis-host:6379"
REDIS_PASSWORD="your-redis-password"
REDIS_TLS="true"
```

**Security:**
```env
JWT_SECRET="<generated-secret-from-step-1.2>"
CSRF_SECRET="<generated-secret-from-step-1.2>"
SESSION_SECRET="<generated-secret-from-step-1.2>"
```

**Blockchain:**
```env
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL="https://mainnet.infura.io/v3/YOUR-PROJECT-ID"
CONTRACT_BADGE_NFT="0x..."
CONTRACT_PROOF_SCORE="0x..."
```

---

## Step 2: Database Setup

### 2.1 Install Prisma CLI
```bash
npm install -g prisma
```

### 2.2 Generate Prisma Client
```bash
npm run prisma:generate
```

### 2.3 Run Migrations
```bash
# Development/Staging
npm run prisma:push

# Production
npm run prisma:migrate
```

### 2.4 Verify Database Connection
```bash
npm run prisma:studio
```

---

## Step 3: Redis Setup

### 3.1 Option A: Docker (Development/Testing)
```bash
docker run -d \
  --name vfide-redis \
  -p 6379:6379 \
  redis:alpine \
  redis-server --requirepass your-redis-password
```

### 3.2 Option B: Managed Service (Production)

**AWS ElastiCache:**
- Create Redis cluster
- Enable encryption in transit
- Configure security groups
- Note connection endpoint

**Redis Cloud:**
- Create database
- Enable TLS
- Copy connection string

### 3.3 Test Redis Connection
```bash
redis-cli -h your-host -p 6379 -a your-password ping
# Should return: PONG
```

---

## Step 4: Install Dependencies

### 4.1 Production Dependencies
```bash
npm install --production=false

# Key packages
npm install @prisma/client redis jose zod
```

### 4.2 Development Dependencies
```bash
npm install -D \
  @types/node \
  @types/react \
  prisma \
  typescript \
  @testing-library/react \
  @testing-library/jest-dom \
  jest \
  @playwright/test
```

---

## Step 5: Build Application

### 5.1 Type Check
```bash
npm run typecheck
```

### 5.2 Run Tests
```bash
# Unit + Integration tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### 5.3 Production Build
```bash
NODE_ENV=production npm run build
```

---

## Step 6: Security Configuration

### 6.1 Configure Rate Limits

Edit `lib/security/rate-limit.ts` if needed:
```typescript
export const RATE_LIMITS = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,             // Adjust based on needs
  },
  // ... other endpoints
};
```

### 6.2 Configure CORS

Edit `lib/security/headers.ts`:
```typescript
const allowedOrigins = [
  'https://vfide.io',
  'https://www.vfide.io',
  // Add your domains
];
```

### 6.3 Review CSP Headers

Update Content-Security-Policy in `lib/security/headers.ts` if using additional CDNs or services.

---

## Step 7: Deploy to Cloud Provider

### Option A: Vercel (Recommended for Next.js)

#### 7.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 7.2 Login
```bash
vercel login
```

#### 7.3 Configure Project
```bash
vercel link
```

#### 7.4 Set Environment Variables
```bash
# Set all environment variables from .env.production
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
vercel env add JWT_SECRET production
# ... etc for all variables
```

#### 7.5 Deploy
```bash
vercel --prod
```

### Option B: AWS (EC2 + RDS + ElastiCache)

#### 7.1 Create EC2 Instance
- Ubuntu 22.04 LTS
- t3.medium or larger
- Configure security groups

#### 7.2 Install Dependencies
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

#### 7.3 Clone Repository
```bash
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide
npm install --production
```

#### 7.4 Configure Environment
```bash
nano .env.production
# Paste your configuration
```

#### 7.5 Build and Start
```bash
npm run build
pm2 start npm --name "vfide" -- start
pm2 save
pm2 startup
```

#### 7.6 Configure Nginx (Optional)
```nginx
server {
    listen 80;
    server_name vfide.io www.vfide.io;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option C: Docker

#### 7.1 Create Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

#### 7.2 Build Image
```bash
docker build -t vfide:latest .
```

#### 7.3 Run Container
```bash
docker run -d \
  --name vfide-app \
  -p 3000:3000 \
  --env-file .env.production \
  vfide:latest
```

---

## Step 8: Configure Monitoring

### 8.1 Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

Configure in `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 8.2 Application Health Checks

Create `/api/health/route.ts`:
```typescript
export async function GET() {
  // Check database
  // Check Redis
  // Check external services
  
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
```

### 8.3 Logging

Configure Winston logger:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

---

## Step 9: SSL/TLS Configuration

### 9.1 Obtain Certificate

**Option A: Let's Encrypt (Free)**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d vfide.io -d www.vfide.io
```

**Option B: Cloud Provider**
- AWS Certificate Manager
- Cloudflare SSL
- GCP Load Balancer SSL

### 9.2 Configure HTTPS Redirect

Nginx:
```nginx
server {
    listen 80;
    server_name vfide.io www.vfide.io;
    return 301 https://$server_name$request_uri;
}
```

---

## Step 10: Post-Deployment Verification

### 10.1 Health Checks
```bash
curl https://vfide.io/api/health
```

### 10.2 Security Headers
```bash
curl -I https://vfide.io
# Check for security headers
```

### 10.3 Rate Limiting
```bash
# Test rate limit
for i in {1..10}; do
  curl https://vfide.io/api/test
done
# Should see 429 after limit
```

### 10.4 Authentication Flow
- Test wallet connection
- Test signature verification
- Test JWT generation
- Test protected endpoints

### 10.5 Database Operations
- Test badge minting
- Test event tracking
- Test review creation
- Test transactions

---

## Step 11: Backup Strategy

### 11.1 Database Backups

**Automated Daily Backups:**
```bash
# Create backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
aws s3 cp backup-$(date +%Y%m%d).sql s3://vfide-backups/

# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### 11.2 Redis Backups

Configure Redis persistence:
```redis
# redis.conf
save 900 1
save 300 10
save 60 10000
```

### 11.3 Code Backups
- GitHub repository (already done)
- Regular commits
- Tagged releases

---

## Step 12: Scaling Considerations

### 12.1 Horizontal Scaling

**Load Balancer Setup:**
- Multiple application instances
- Session sharing via Redis
- Database connection pooling

### 12.2 Database Scaling

**Read Replicas:**
- Set up PostgreSQL read replicas
- Route read queries to replicas
- Keep writes on primary

### 12.3 Caching Strategy

**Redis Cluster:**
- Set up Redis cluster for high availability
- Configure failover
- Monitor cache hit rates

---

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL

# Check connection pool
# In application logs, look for connection errors
```

### Redis Connection Issues
```bash
# Test Redis
redis-cli -h host -p 6379 -a password ping

# Check if Redis is running
ps aux | grep redis
```

### Build Failures
```bash
# Clear caches
rm -rf .next node_modules
npm install
npm run build
```

### Rate Limit Issues
```bash
# Check Redis for rate limit keys
redis-cli keys "ratelimit:*"

# Clear specific rate limit
redis-cli del "ratelimit:endpoint:user"
```

---

## Maintenance

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Review security alerts

### Monthly Tasks
- [ ] Update dependencies (`npm update`)
- [ ] Run security audit (`npm audit`)
- [ ] Review and rotate secrets
- [ ] Database optimization
- [ ] Performance testing

### Quarterly Tasks
- [ ] Security penetration testing
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Review and update documentation

---

## Support

For deployment issues:
- GitHub Issues: https://github.com/Scorpio861104/Vfide/issues
- Email: support@vfide.com

For security concerns:
- Email: security@vfide.com
- See SECURITY.md for responsible disclosure

---

**Deployment Complete! 🚀**

Your VFIDE platform is now running in production with enterprise-grade security, monitoring, and scalability.
