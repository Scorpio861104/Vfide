# VFIDE Database Setup Guide

## Quick Start

### Option 1: Docker (Recommended for Development)

```bash
# Start PostgreSQL container
docker run -d \
  --name vfide-postgres \
  -e POSTGRES_DB=vfide_testnet \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Wait a few seconds for startup, then initialize schema
cd frontend
psql postgresql://postgres:postgres@localhost:5432/vfide_testnet -f init-db.sql
```

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL** (if not already installed)
   - macOS: `brew install postgresql@15 && brew services start postgresql@15`
   - Ubuntu/Debian: `sudo apt install postgresql-15`
   - Windows: Download from https://www.postgresql.org/download/

2. **Create Database**
   ```bash
   createdb vfide_testnet
   ```

3. **Initialize Schema**
   ```bash
   cd frontend
   psql vfide_testnet -f init-db.sql
   ```

4. **Verify Setup**
   ```bash
   psql vfide_testnet -c "\dt"
   ```
   Should show 16 tables.

### Option 3: Vercel Postgres (For Deployment)

1. **Create Postgres Database**
   ```bash
   vercel login
   vercel link
   vercel storage create postgres vfide-db
   ```

2. **Pull Environment Variables**
   ```bash
   cd frontend
   vercel env pull .env.local
   ```

3. **Initialize Schema**
   ```bash
   # Extract DATABASE_URL from .env.local
   source .env.local
   psql "$DATABASE_URL" -f init-db.sql
   ```

## Environment Configuration

Update your `frontend/.env.local`:

```bash
# Local Development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vfide_testnet

# Vercel Postgres (auto-generated when you pull env)
# DATABASE_URL=postgres://default:xxx@xxx.postgres.vercel-storage.com/verceldb
```

## Database Schema Overview

The database includes these tables:

- `users` - User profiles and wallet addresses
- `messages` - Direct messages between users
- `friends` - Friend relationships
- `groups` - Group/community info
- `group_members` - Group membership
- `group_invites` - Invitation codes
- `notifications` - User notifications
- `badges` - User achievements
- `proposals` - DAO proposals
- `attachments` - File uploads
- `user_rewards` - Reward tracking
- `transactions` - Transaction history
- `token_balances` - User token balances
- `payment_requests` - Payment request tracking
- `activities` - User activity feed
- `endorsements` - Skill endorsements

## Troubleshooting

### "database does not exist"
```bash
createdb vfide_testnet
```

### "psql: command not found"
Install PostgreSQL client tools:
- macOS: `brew install libpq && brew link --force libpq`
- Ubuntu: `sudo apt install postgresql-client`

### "connection refused"
Ensure PostgreSQL is running:
- Docker: `docker ps` (should show vfide-postgres)
- Local: `pg_isready`
- Or: `brew services list` (macOS)

### "role does not exist"
Create the user:
```bash
createuser postgres
```

### Reset Database
```bash
# Drop and recreate
dropdb vfide_testnet
createdb vfide_testnet
psql vfide_testnet -f frontend/init-db.sql
```

## Production Considerations

1. **Use Connection Pooling** - Already configured via `pg.Pool`
2. **Set Strong Password** - Change from default `postgres` password
3. **Enable SSL** - Add `?sslmode=require` to DATABASE_URL
4. **Backup Strategy** - Set up automated backups
5. **Monitor Performance** - Use pg_stat_statements extension

## Managed PostgreSQL Providers

For production deployment, consider:

- **Vercel Postgres** - Integrated with Vercel deployment
- **Supabase** - Free tier + real-time features
- **Neon** - Serverless Postgres
- **AWS RDS** - Enterprise-grade
- **Railway** - Simple deployment
- **DigitalOcean** - Managed databases

## Need Help?

- Check init-db.sql for complete schema
- Review app/api/**/route.ts for query examples
- See lib/db.ts for connection configuration
