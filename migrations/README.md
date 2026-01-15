# Database Migrations

This directory contains database migration scripts using node-pg-migrate.

## Setup

```bash
cd migrations
npm install
```

## Usage

### Create a new migration

```bash
npm run migrate:create -- my_migration_name
```

### Run pending migrations

```bash
npm run migrate:up
```

### Rollback last migration

```bash
npm run migrate:down
```

### Check migration status

```bash
npm run migrate:status
```

## Environment Variables

Migrations read from `DATABASE_URL` environment variable.

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## Migration Files

Migrations are numbered sequentially and run in order:
- `001_initial_schema.js` - Initial database schema
- Add new migrations as needed

## Best Practices

1. Always test migrations in development first
2. Create a rollback migration (down) for every up migration
3. Keep migrations small and focused
4. Never modify existing migrations after they've run in production
5. Always backup database before running migrations in production
