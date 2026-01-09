# Docker Deployment Guide for VFIDE

This guide covers deploying the complete VFIDE stack using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Services](#services)
- [Production Deployment](#production-deployment)
- [Monitoring and Logs](#monitoring-and-logs)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Docker** 20.10+ — [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** 2.0+ — [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git** — [Install Git](https://git-scm.com/)

Verify installation:
```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Scorpio861104/Vfide.git
cd Vfide
```

### 2. Configure Environment Variables

Create environment files:

```bash
# Frontend environment
cp frontend/.env.example frontend/.env.local

# WebSocket server environment
cp websocket-server/.env.example websocket-server/.env
```

Edit the files with your configuration:

**frontend/.env.local:**
```env
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

**websocket-server/.env:**
```env
PORT=3001
JWT_SECRET=your_secure_random_string_here
ETHEREUM_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
REDIS_URL=redis://redis:6379
```

### 3. Build and Start Services

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application:
- **Frontend**: http://localhost:3000
- **WebSocket Server**: http://localhost:3001
- **Redis**: localhost:6379

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Configuration

### docker-compose.yml

The stack includes 4 services:

1. **frontend** - Next.js application (port 3000)
2. **websocket-server** - Socket.IO server (port 3001)
3. **redis** - Session storage and caching (port 6379)
4. **nginx** - Reverse proxy (ports 80/443, optional)

### Environment Variables

#### Frontend Service

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CHAIN_ID` | Blockchain network ID | 84532 |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address | Required |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Required |
| `NEXT_PUBLIC_WEBSOCKET_URL` | WebSocket server URL | ws://websocket-server:3001 |
| `NEXT_PUBLIC_ALCHEMY_KEY` | Alchemy API key | Optional |

#### WebSocket Server Service

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | Secret for JWT signing | Required |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Required |
| `REDIS_URL` | Redis connection URL | redis://redis:6379 |
| `CORS_ORIGIN` | Allowed CORS origins | http://frontend:3000 |

#### Redis Service

Pre-configured with:
- **Persistence**: AOF (Append-Only File)
- **Max Memory**: 256MB
- **Eviction Policy**: allkeys-lru (Least Recently Used)

## Services

### Frontend

**Dockerfile Location**: `frontend/Dockerfile`

Multi-stage build:
1. **deps** - Install dependencies
2. **builder** - Build Next.js application
3. **runner** - Production runtime

Features:
- Non-root user for security
- Health check endpoint
- Optimized layer caching
- Minimal final image size

**Build manually:**
```bash
cd frontend
docker build -t vfide-frontend .
docker run -p 3000:3000 --env-file .env.local vfide-frontend
```

### WebSocket Server

**Dockerfile Location**: `websocket-server/Dockerfile`

Features:
- Socket.IO real-time server
- JWT + Ethereum signature authentication
- Redis for session management
- Rate limiting and DDoS protection

**Build manually:**
```bash
cd websocket-server
docker build -t vfide-websocket .
docker run -p 3001:3001 --env-file .env vfide-websocket
```

### Redis

**Image**: `redis:7-alpine`

Configuration:
- Persistent storage with AOF
- Memory limit: 256MB
- LRU eviction policy

**Access Redis CLI:**
```bash
docker-compose exec redis redis-cli
```

### Nginx (Optional)

**Configuration**: `nginx.conf`

Features:
- Reverse proxy for frontend and WebSocket
- Rate limiting (10 req/s general, 5 req/s WebSocket)
- Gzip compression
- Security headers
- SSL/TLS support (production)
- Static asset caching

**Enable Nginx:**
```bash
docker-compose --profile production up -d
```

## Production Deployment

### 1. SSL/TLS Certificates

Generate or obtain SSL certificates:

```bash
# Using Let's Encrypt (Certbot)
sudo certbot certonly --standalone -d your-domain.com

# Or use your own certificates
mkdir ssl
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

### 2. Update nginx.conf

Uncomment the HTTPS server block in `nginx.conf` and update:
- `server_name` to your domain
- SSL certificate paths

### 3. Configure DNS

Point your domain to your server's IP:
```
A     your-domain.com      -> YOUR_SERVER_IP
A     www.your-domain.com  -> YOUR_SERVER_IP
```

### 4. Production Environment Variables

Update `.env` files with production values:

```bash
# Frontend
NEXT_PUBLIC_CHAIN_ID=8453  # Base Mainnet
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-domain.com/ws
NODE_ENV=production

# WebSocket
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### 5. Deploy

```bash
# Build with production profile
docker-compose --profile production build

# Start with production profile
docker-compose --profile production up -d

# View logs
docker-compose logs -f
```

### 6. Security Best Practices

- [ ] Use strong `JWT_SECRET` (32+ random characters)
- [ ] Enable firewall (UFW, iptables)
- [ ] Configure fail2ban for SSH protection
- [ ] Regularly update Docker images
- [ ] Monitor resource usage
- [ ] Set up automated backups for Redis data
- [ ] Use Docker secrets for sensitive data (Swarm/Kubernetes)

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f websocket-server

# Last 100 lines
docker-compose logs --tail=100 frontend
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Manual health check
curl http://localhost:3000/api/health  # Frontend
curl http://localhost:3001/health      # WebSocket
```

### Resource Usage

```bash
# Container resource usage
docker stats

# Specific container
docker stats vfide-frontend
```

### Redis Monitoring

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check memory usage
redis-cli INFO memory

# Monitor commands
redis-cli MONITOR
```

## Troubleshooting

### Frontend Won't Start

**Issue**: Frontend container exits immediately

**Solutions:**
```bash
# Check logs
docker-compose logs frontend

# Verify environment variables
docker-compose exec frontend env

# Rebuild without cache
docker-compose build --no-cache frontend
```

### WebSocket Connection Fails

**Issue**: "WebSocket connection failed"

**Solutions:**
```bash
# Check WebSocket server logs
docker-compose logs websocket-server

# Verify Redis connection
docker-compose exec websocket-server nc -zv redis 6379

# Test WebSocket endpoint
curl http://localhost:3001/health
```

### Redis Connection Issues

**Issue**: "Could not connect to Redis"

**Solutions:**
```bash
# Check Redis status
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

### Port Already in Use

**Issue**: "Port 3000 is already allocated"

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different ports in docker-compose.yml
ports:
  - "3100:3000"  # Use 3100 on host, 3000 in container
```

### Out of Memory

**Issue**: Container killed due to OOM

**Solutions:**
```bash
# Increase Docker memory limit
# Docker Desktop: Settings → Resources → Memory

# Or limit container memory in docker-compose.yml
services:
  frontend:
    mem_limit: 2g
    mem_reservation: 1g
```

### Build Failures

**Issue**: "npm install" fails during build

**Solutions:**
```bash
# Clear Docker build cache
docker builder prune -a

# Build with more verbose output
docker-compose build --progress=plain

# Check available disk space
df -h
```

## Advanced Configuration

### Horizontal Scaling

Scale WebSocket servers:

```bash
# Scale to 3 instances
docker-compose up -d --scale websocket-server=3

# Requires Redis for session sharing
# Add load balancer (Nginx, HAProxy)
```

### Persistent Volumes

Redis data is persisted by default. To back up:

```bash
# Create backup
docker-compose exec redis redis-cli SAVE
docker cp vfide-redis:/data/dump.rdb ./redis-backup.rdb

# Restore backup
docker cp ./redis-backup.rdb vfide-redis:/data/dump.rdb
docker-compose restart redis
```

### Custom Networks

Use custom networks for isolation:

```yaml
networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge

services:
  frontend:
    networks:
      - frontend-network
  websocket-server:
    networks:
      - frontend-network
      - backend-network
  redis:
    networks:
      - backend-network
```

## Useful Commands

```bash
# Rebuild specific service
docker-compose build frontend

# Restart specific service
docker-compose restart websocket-server

# Execute command in container
docker-compose exec frontend sh
docker-compose exec redis redis-cli

# View container details
docker inspect vfide-frontend

# Clean up unused resources
docker system prune -a

# Update images
docker-compose pull
docker-compose up -d
```

## Support

- **Documentation**: [README.md](../README.md)
- **Issues**: [GitHub Issues](https://github.com/Scorpio861104/Vfide/issues)
- **Discord**: [discord.gg/vfide](https://discord.gg/vfide)
- **Email**: dev@vfide.io

---

For cloud deployment options (AWS, Google Cloud, Azure), see [PRODUCTION-DEPLOYMENT-GUIDE.md](PRODUCTION-DEPLOYMENT-GUIDE.md).
