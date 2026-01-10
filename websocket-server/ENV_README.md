# WebSocket Server Configuration Examples

This directory contains environment configuration templates for different deployment scenarios.

## Files

- `.env.example` - Local development configuration
- `.env.testnet` - Base Sepolia testnet configuration
- `.env.production.example` - Mainnet production configuration
- `.env.staging.example` - Staging environment configuration

## Quick Setup

### For Local Development
```bash
cp .env.example .env
# Edit .env with your local settings
npm install
npm run dev
```

### For Testnet Deployment
```bash
cp .env.testnet .env
# Update with your database and Redis URLs if needed
npm install
npm run build
npm start
```

### For Production
```bash
cp .env.production.example .env.production
# Update all production values
npm install
npm run build
npm start
```

## Environment Variables Reference

### Server Configuration
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `HOST` - Server host (default: 0.0.0.0)

### CORS
- `CORS_ORIGINS` - Comma-separated list of allowed origins

### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (generate with `openssl rand -base64 32`)

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL (if using Supabase)
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Redis (Optional)
- `REDIS_URL` - Redis connection string
- `REDIS_ENABLED` - Enable Redis (true/false)

### Blockchain RPC URLs
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia testnet RPC
- `BASE_RPC_URL` - Base mainnet RPC
- `POLYGON_RPC_URL` - Polygon mainnet RPC
- `ZKSYNC_RPC_URL` - zkSync mainnet RPC

### Smart Contract Addresses
- `DAO_ADDRESS` - DAO contract address
- `TOKEN_ADDRESS` - VFIDE token address
- `COUNCIL_MANAGER_ADDRESS` - Council manager address

### Rate Limiting
- `RATE_LIMIT_MAX_CONNECTIONS_PER_IP` - Max connections per IP
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds

### Performance
- `HEARTBEAT_INTERVAL` - WebSocket heartbeat interval (ms)
- `HEARTBEAT_TIMEOUT` - Heartbeat timeout (ms)
- `MAX_CONNECTIONS` - Maximum concurrent connections
- `MAX_ROOMS_PER_CONNECTION` - Max rooms per connection
- `MESSAGE_HISTORY_LIMIT` - Message history limit

### Feature Flags
- `ENABLE_GOVERNANCE_EVENTS` - Enable governance event streaming
- `ENABLE_CHAT_PERSISTENCE` - Enable chat message persistence
- `ENABLE_NOTIFICATIONS` - Enable notification system
- `ENABLE_PRESENCE_TRACKING` - Enable user presence tracking

### Security
- `ENABLE_SIGNATURE_VERIFICATION` - Require Ethereum signatures
- `SIGNATURE_MESSAGE_PREFIX` - Message prefix for signatures
- `TOKEN_EXPIRATION` - JWT token expiration time

### Monitoring
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `SENTRY_DSN` - Sentry DSN for error tracking
- `SENTRY_ENVIRONMENT` - Sentry environment name

## Security Best Practices

1. **Never commit `.env` files** - They contain secrets
2. **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Update JWT_SECRET and API keys periodically
4. **Use environment-specific configs** - Different secrets for dev/staging/prod
5. **Enable signature verification** - Require wallet signatures in production
6. **Configure CORS properly** - Only allow trusted origins
7. **Enable rate limiting** - Protect against abuse
8. **Use HTTPS in production** - Ensure secure connections

## Deployment Platforms

### Render.com
Set environment variables in Dashboard -> Environment

### Railway.app
Use Railway CLI or Dashboard -> Variables

### Heroku
Use `heroku config:set KEY=VALUE`

### Docker
Mount `.env` file or use Docker secrets

### Local Development
Use `.env` file (automatically loaded by dotenv)

## Testing Configuration

```bash
# Verify environment variables are loaded
npm run dev

# Check logs for configuration
# Should see "Server running on port 8080"
# Should see "Database connected"
# Should see "Redis enabled: true/false"
```

## Troubleshooting

### Database Connection Fails
- Check `DATABASE_URL` format
- Verify database is accessible
- Check firewall/security groups

### Redis Connection Fails
- Set `REDIS_ENABLED=false` if not using Redis
- Check `REDIS_URL` format
- Verify Redis is running

### CORS Errors
- Add your frontend URL to `CORS_ORIGINS`
- Include http:// or https:// protocol
- Separate multiple origins with commas

### WebSocket Connection Fails
- Check `PORT` is not already in use
- Verify firewall allows WebSocket connections
- Ensure frontend uses correct WebSocket URL
