#!/bin/bash
# Complete Vercel Postgres Setup via CLI

set -e

echo "🚀 Vercel Postgres Setup Script"
echo "================================"
echo ""

# Step 1: Login to Vercel
echo "📝 Step 1: Login to Vercel"
vercel login

# Step 2: Link to your project (if not already linked)
echo ""
echo "🔗 Step 2: Link to Vercel project"
vercel link

# Step 3: Create Postgres database
echo ""
echo "🗄️  Step 3: Create Postgres database"
echo "This will create a new Postgres database named 'vfide-db'"
vercel storage create postgres vfide-db

# Step 4: Pull environment variables
echo ""
echo "📥 Step 4: Pull environment variables"
vercel env pull .env.local

# Step 5: Initialize database schema using migrations
echo ""
echo "🏗️  Step 5: Initialize database schema using migrations"
echo "The authoritative schema is defined in /migrations/"

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep -E 'DATABASE_URL|POSTGRES_PRISMA_URL' | xargs)
  
  if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found in .env.local"
    echo "Using POSTGRES_PRISMA_URL instead..."
    export $(grep -v '^#' .env.local | grep POSTGRES_PRISMA_URL | xargs)
    DATABASE_URL=$POSTGRES_PRISMA_URL
  fi
  
  # Check if migrations exist in the canonical top-level directory
  if [ -d "migrations" ] && [ "$(ls -A migrations)" ]; then
    echo "Running database migrations..."
    if command -v node &> /dev/null; then
      # Run canonical migration CLI
      npm run -s migrate:up || {
        echo "⚠️  Migration command failed (npm run migrate:up)."
        echo "Fallback: apply migrations manually via psql or migration tool."
      }
      echo "✅ Database migrations applied!"
    else
      echo "⚠️  Node not found. Please install Node.js or apply migrations manually:"
      echo "npm run migrate:up"
    fi
  else
    echo "⚠️  No migrations found in migrations/"
    echo "Please ensure the migration system is configured via lib/migrations/cli.ts"
    echo "See documentation: docs/DATABASE_SETUP.md"
  fi
else
  echo "❌ .env.local not found. Run 'vercel env pull' first."
  exit 1
fi

# Step 6: Deploy to production
echo ""
echo "🚀 Step 6: Deploy to production"
read -p "Deploy to production now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  vercel --prod
  echo "✅ Deployed to production!"
else
  echo "⏭️  Skipped deployment. Run 'vercel --prod' when ready."
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Check your database at: https://vercel.com/dashboard/stores"
echo "2. Test your API routes"
echo "3. Monitor logs: vercel logs"
