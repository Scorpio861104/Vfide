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

# Step 5: Initialize database schema
echo ""
echo "🏗️  Step 5: Initialize database schema"
if [ -f init-db.sql ]; then
  # Extract DATABASE_URL from .env.local
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
    
    if [ -z "$DATABASE_URL" ]; then
      echo "⚠️  DATABASE_URL not found in .env.local"
      echo "Using POSTGRES_PRISMA_URL instead..."
      export $(grep -v '^#' .env.local | grep POSTGRES_PRISMA_URL | xargs)
      DATABASE_URL=$POSTGRES_PRISMA_URL
    fi
    
    if command -v psql &> /dev/null; then
      echo "Running schema initialization..."
      psql "$DATABASE_URL" -f init-db.sql
      echo "✅ Database schema initialized!"
    else
      echo "⚠️  psql not found. Please install PostgreSQL client or run manually:"
      echo "psql \"\$DATABASE_URL\" -f init-db.sql"
    fi
  else
    echo "❌ .env.local not found. Run 'vercel env pull' first."
    exit 1
  fi
else
  echo "❌ init-db.sql not found"
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
