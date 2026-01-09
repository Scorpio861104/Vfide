# Monitoring and Observability Guide

Complete guide for monitoring, logging, and observability in VFIDE production deployments.

## Table of Contents

- [Overview](#overview)
- [Frontend Monitoring](#frontend-monitoring)
- [WebSocket Server Monitoring](#websocket-server-monitoring)
- [Smart Contract Monitoring](#smart-contract-monitoring)
- [Infrastructure Monitoring](#infrastructure-monitoring)
- [Logging](#logging)
- [Alerting](#alerting)
- [Performance Monitoring](#performance-monitoring)
- [Tools and Services](#tools-and-services)

## Overview

Effective monitoring is crucial for:
- **Detecting issues** before users are impacted
- **Understanding performance** and user behavior
- **Debugging problems** quickly
- **Capacity planning** for scaling
- **Security monitoring** for threats

### Monitoring Stack

- **Application Performance**: Vercel Analytics, New Relic, or DataDog
- **Error Tracking**: Sentry
- **Logging**: Winston (WebSocket), Console (Frontend)
- **Infrastructure**: Docker stats, Prometheus, Grafana
- **Blockchain**: Etherscan, Alchemy, The Graph
- **Uptime**: UptimeRobot, Pingdom, or StatusCake

---

## Frontend Monitoring

### Health Check Endpoint

**Endpoint**: `/api/health`

Monitor this endpoint for application health:

```bash
curl https://your-domain.com/api/health
```

**Expected Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T12:00:00Z",
  "version": "1.2.0",
  "environment": "production",
  "uptime": 3600,
  "memory": {
    "used": 150,
    "total": 512,
    "external": 10
  },
  "checks": {
    "env": true,
    "nextjs": true
  }
}
```

### Vercel Analytics

For deployments on Vercel:

1. Enable Web Analytics in Vercel dashboard
2. Add to your Next.js layout:

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

3. View metrics in Vercel dashboard:
   - Page views
   - Unique visitors
   - Top pages
   - Traffic sources
   - Core Web Vitals

### Error Tracking with Sentry

**Installation**:
```bash
npm install @sentry/nextjs
```

**Configuration** (`sentry.client.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ]
});
```

**Usage**:
```typescript
try {
  await createProposal(data);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'governance',
      action: 'create_proposal'
    },
    extra: {
      proposalData: data
    }
  });
  throw error;
}
```

### Core Web Vitals

Monitor Next.js Web Vitals:

```typescript
// app/layout.tsx
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'production') {
    const { id, name, label, value } = metric;
    
    // Send to analytics
    window.gtag?.('event', name, {
      event_category: label === 'web-vital' ? 'Web Vitals' : 'Next.js Metric',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true
    });
  }
}
```

Monitor these metrics:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms
- **FCP** (First Contentful Paint): < 1.8s

---

## WebSocket Server Monitoring

### Health Check

**Endpoint**: `http://your-websocket-server:3001/health`

```bash
curl http://localhost:3001/health
```

**Expected Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T12:00:00Z",
  "uptime": 7200,
  "connections": 42,
  "memory": {
    "heapUsed": 85,
    "heapTotal": 128,
    "external": 5
  }
}
```

### Winston Logging

The WebSocket server uses Winston for structured logging:

```typescript
// websocket-server/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

**Log Levels**:
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions
- `info`: Informational messages
- `http`: HTTP requests
- `verbose`: Verbose informational messages
- `debug`: Debug-level messages

### Connection Metrics

Monitor these WebSocket metrics:

```typescript
// Track connections
let activeConnections = 0;
let totalConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  totalConnections++;
  
  logger.info('Client connected', {
    socketId: socket.id,
    address: socket.handshake.address,
    activeConnections
  });
  
  socket.on('disconnect', () => {
    activeConnections--;
    logger.info('Client disconnected', {
      socketId: socket.id,
      activeConnections
    });
  });
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    activeConnections,
    totalConnections,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### Rate Limiting Metrics

Monitor rate limit hits:

```typescript
// In rate limit middleware
if (rateLimitExceeded) {
  logger.warn('Rate limit exceeded', {
    ip: socket.handshake.address,
    attempts: attemptsCount
  });
  
  // Track metric
  rateLimitHits.inc({ ip: socket.handshake.address });
}
```

---

## Smart Contract Monitoring

### Event Monitoring

Monitor critical blockchain events:

```typescript
// Monitor proposal creation
const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);

daoContract.on('ProposalCreated', (proposalId, proposer, description) => {
  logger.info('Proposal created', {
    proposalId: proposalId.toString(),
    proposer,
    description
  });
  
  // Send notification
  notifyAdmins('New proposal created', { proposalId, proposer });
});

// Monitor large transfers
const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

tokenContract.on('Transfer', (from, to, amount) => {
  const amountEth = ethers.formatEther(amount);
  
  if (parseFloat(amountEth) > 10000) {
    logger.warn('Large token transfer', {
      from,
      to,
      amount: amountEth
    });
    
    // Alert on suspicious activity
    alertSecurityTeam('Large transfer detected', { from, to, amount: amountEth });
  }
});
```

### Transaction Monitoring

Track transaction success rates:

```typescript
// Monitor transaction outcomes
async function monitorTransaction(txHash: string) {
  try {
    const receipt = await provider.waitForTransaction(txHash);
    
    if (receipt.status === 1) {
      logger.info('Transaction succeeded', {
        hash: txHash,
        gasUsed: receipt.gasUsed.toString(),
        block: receipt.blockNumber
      });
    } else {
      logger.error('Transaction failed', {
        hash: txHash,
        block: receipt.blockNumber
      });
      
      // Alert on failures
      Sentry.captureMessage('Transaction failed', {
        extra: { txHash, receipt }
      });
    }
  } catch (error) {
    logger.error('Transaction monitoring error', {
      hash: txHash,
      error: error.message
    });
  }
}
```

### Gas Price Monitoring

Monitor gas prices to alert users:

```typescript
async function checkGasPrice() {
  const gasPrice = await provider.getFeeData();
  const gasPriceGwei = ethers.formatUnits(gasPrice.gasPrice, 'gwei');
  
  logger.info('Current gas price', { gasPriceGwei });
  
  if (parseFloat(gasPriceGwei) > 100) {
    logger.warn('High gas prices', { gasPriceGwei });
    
    // Show warning to users
    websocket.emit('gas_price_alert', {
      message: 'Gas prices are currently high',
      gasPriceGwei
    });
  }
}

// Check every 5 minutes
setInterval(checkGasPrice, 5 * 60 * 1000);
```

### Block Explorer Integration

Use block explorers for monitoring:

- **Base**: https://basescan.org/
- **Base Sepolia**: https://sepolia.basescan.org/
- **Ethereum**: https://etherscan.io/

Monitor:
- Contract interactions
- Token transfers
- Event emissions
- Gas usage trends
- Failed transactions

---

## Infrastructure Monitoring

### Docker Monitoring

**Monitor container health**:
```bash
# Check container status
docker-compose ps

# View resource usage
docker stats

# Check logs
docker-compose logs -f --tail=100
```

**Automated health checks**:
```yaml
# docker-compose.yml
services:
  frontend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Prometheus + Grafana

**Prometheus configuration** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vfide-websocket'
    static_configs:
      - targets: ['websocket-server:3001']
    metrics_path: '/metrics'
    
  - job_name: 'vfide-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/api/metrics'
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

**Key metrics to monitor**:
- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Uptime Monitoring

Use external services to monitor uptime:

**UptimeRobot**:
- Monitor https://your-domain.com every 5 minutes
- Alert via email, SMS, Slack when down
- Check SSL certificate expiry
- Monitor keyword presence on page

**Status Page**:
Create a status page (e.g., status.vfide.io) to:
- Show current system status
- Display historical uptime
- Communicate incidents
- Schedule maintenance windows

---

## Logging

### Centralized Logging

**Log aggregation options**:
1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Loki** (Grafana Loki)
3. **CloudWatch** (AWS)
4. **Stackdriver** (Google Cloud)

**Structured logging format**:
```json
{
  "timestamp": "2025-01-08T12:00:00.000Z",
  "level": "info",
  "service": "websocket-server",
  "message": "Client connected",
  "socketId": "abc123",
  "userId": "0x123...",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Rotation

**Using logrotate** (Linux):
```conf
# /etc/logrotate.d/vfide
/var/log/vfide/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 vfide vfide
    sharedscripts
    postrotate
        docker-compose restart websocket-server
    endscript
}
```

### Log Retention

Recommended retention periods:
- **Error logs**: 90 days
- **Info logs**: 30 days
- **Debug logs**: 7 days
- **Access logs**: 30 days

---

## Alerting

### Alert Conditions

Set up alerts for:

1. **Critical**: Immediate action required
   - Service down (>2 minutes)
   - Error rate > 10%
   - Response time > 5s
   - Database connection lost
   - SSL certificate expires < 7 days

2. **Warning**: Review required
   - Error rate > 1%
   - Response time > 2s
   - Memory usage > 80%
   - Disk usage > 85%
   - Unusual traffic patterns

3. **Info**: FYI notifications
   - Deployment completed
   - New user signups spike
   - Large transaction detected

### Alert Channels

Configure multiple channels:
- **PagerDuty**: Critical alerts, on-call rotation
- **Slack**: Team notifications
- **Email**: Non-urgent alerts
- **SMS**: Critical alerts only
- **Discord**: Community notifications

### Alert Example (Prometheus)

```yaml
groups:
  - name: vfide_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} (threshold: 0.05)"
          
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service has been down for more than 2 minutes"
```

---

## Performance Monitoring

### Frontend Performance

Monitor with **Lighthouse CI**:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.vfide.vercel.app
            https://staging.vfide.vercel.app/governance
          uploadArtifacts: true
```

### Database Performance

Monitor Redis:
```bash
# Connect to Redis
redis-cli

# Monitor commands in real-time
MONITOR

# Get info
INFO stats

# Check slow log
SLOWLOG GET 10
```

### API Performance

Track API response times:
```typescript
// Middleware to log request duration
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });
    
    // Track in metrics
    httpRequestDuration.observe(
      { method: req.method, path: req.path, status: res.statusCode },
      duration / 1000
    );
  });
  
  next();
});
```

---

## Tools and Services

### Recommended Services

| Category | Free Option | Paid Option |
|----------|-------------|-------------|
| **Error Tracking** | Sentry (5k events/mo) | Sentry Pro |
| **Uptime** | UptimeRobot (50 monitors) | Pingdom |
| **Logging** | Loki (self-hosted) | DataDog |
| **APM** | Vercel Analytics | New Relic |
| **Infrastructure** | Grafana (self-hosted) | Grafana Cloud |
| **Blockchain** | Etherscan (free) | Alchemy Monitor |

### Dashboard Example

Create a Grafana dashboard with:
1. **Overview**: Uptime, error rate, active users
2. **Performance**: Response times, throughput
3. **Infrastructure**: CPU, memory, disk
4. **Business**: DAU, proposals created, votes cast
5. **Blockchain**: Gas prices, transaction success rate

---

## Best Practices

1. **Start simple**: Don't over-engineer monitoring initially
2. **Monitor what matters**: Focus on user-impacting metrics
3. **Set meaningful thresholds**: Based on actual usage patterns
4. **Test alerts**: Regularly verify alerts are working
5. **Document runbooks**: How to respond to each alert
6. **Review regularly**: Adjust thresholds as system evolves
7. **Secure monitoring data**: Don't log sensitive information
8. **Correlate metrics**: Connect frontend, backend, and blockchain metrics

---

## Troubleshooting

### High Memory Usage

```bash
# Check Node.js memory usage
node --max-old-space-size=4096 server.js

# Profile memory
node --inspect server.js
# Open chrome://inspect in Chrome
```

### Slow Responses

```typescript
// Add timing to identify bottlenecks
console.time('database_query');
const result = await db.query('...');
console.timeEnd('database_query');
```

### WebSocket Disconnections

```typescript
// Monitor disconnect reasons
socket.on('disconnect', (reason) => {
  logger.info('Disconnect', { reason, socketId: socket.id });
  
  // Track disconnect reasons
  disconnectReasons.inc({ reason });
});
```

---

For deployment guides, see [PRODUCTION-DEPLOYMENT-GUIDE.md](PRODUCTION-DEPLOYMENT-GUIDE.md) and [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md).
