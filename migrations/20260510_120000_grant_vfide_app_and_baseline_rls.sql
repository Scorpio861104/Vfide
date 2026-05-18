-- Migration: 20260510_120000_grant_vfide_app_and_baseline_rls.sql
--
-- Purpose:
--   Make the application service role `vfide_app` usable across the entire
--   schema and add a minimum-viable RLS baseline so that promoting a
--   testnet DATABASE_URL to a NOBYPASSRLS role does not break the app.
--
-- Context:
--   Prior migration `20260503_120000_create_app_role_rls_enforcement.sql`
--   created `vfide_app` with NOBYPASSRLS and granted on 8 tables. The repo
--   has 110 tables; the other 102 had no grants. With
--   `instrumentation.ts::verifyRlsEnforcementOrThrow()` fail-closed in
--   production, switching DATABASE_URL to vfide_app would fail at the
--   first query against any ungranted table.
--
-- What this migration does:
--   1. GRANT SELECT, INSERT, UPDATE, DELETE on every existing table in
--      the public schema to vfide_app (idempotent).
--   2. GRANT USAGE on every sequence.
--   3. Ensure default privileges for future-created tables and sequences
--      so this doesn't have to be repeated for every new migration.
--   4. For each table not already in pg_policies, attempt to add a basic
--      owner-only RLS read policy when the table has one of the common
--      owner-address columns (wallet_address, owner_address, user_address,
--      merchant_address, merchant_wallet_address). Tables that don't fit
--      this pattern are listed in a NOTICE for manual review.
--
-- What this migration does NOT do:
--   - Tighten existing policies on the 7 already-protected tables.
--   - Add INSERT/UPDATE/DELETE-side policies. Read isolation first; write
--     isolation needs per-table review.
--   - FORCE ROW LEVEL SECURITY on tables that already have it (because
--     forcing requires every row to have an owner column, which not all
--     do — e.g. lookup tables).

BEGIN;

-- ============================================================================
-- 1. Grants on existing tables and sequences
-- ============================================================================
DO $$
DECLARE
    tbl text;
    seq text;
BEGIN
    -- Ensure the role exists; we no-op if not (e.g. dev environments)
    PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
    IF NOT FOUND THEN
        RAISE NOTICE 'Role vfide_app does not exist; skipping grants.';
        RETURN;
    END IF;

    GRANT USAGE ON SCHEMA public TO vfide_app;

    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO vfide_app',
            tbl
        );
    END LOOP;

    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON public.%I TO vfide_app', seq);
    END LOOP;

    -- Future tables/sequences should inherit grants automatically
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public ' ||
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vfide_app';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public ' ||
            'GRANT USAGE, SELECT ON SEQUENCES TO vfide_app';
END$$;

-- ============================================================================
-- 2. Baseline RLS policies for tables with obvious owner columns
-- ============================================================================
DO $$
DECLARE
    tbl record;
    owner_col text;
    candidates text[] := ARRAY[
        'wallet_address',
        'owner_address',
        'user_address',
        'merchant_address',
        'merchant_wallet_address'
    ];
    c text;
    has_policy boolean;
    tables_unowned text[] := ARRAY[]::text[];
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Skip if any policy exists already (don't overwrite explicit work)
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl.tablename
        ) INTO has_policy;

        IF has_policy THEN
            CONTINUE;
        END IF;

        owner_col := NULL;
        FOREACH c IN ARRAY candidates LOOP
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = tbl.tablename
                  AND column_name = c
            ) THEN
                owner_col := c;
                EXIT;
            END IF;
        END LOOP;

        IF owner_col IS NULL THEN
            tables_unowned := array_append(tables_unowned, tbl.tablename);
            CONTINUE;
        END IF;

        -- Enable RLS (idempotent at the DDL layer)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);

        -- Owner read policy
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING (%I = current_setting(''app.current_user_address'', true)::text)',
            tbl.tablename || '_read_own',
            tbl.tablename,
            owner_col
        );

        -- Owner write policy: INSERT must have the owner column = the current user
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%I = current_setting(''app.current_user_address'', true)::text)',
            tbl.tablename || '_insert_own',
            tbl.tablename,
            owner_col
        );

        -- Owner update policy
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING (%I = current_setting(''app.current_user_address'', true)::text) WITH CHECK (%I = current_setting(''app.current_user_address'', true)::text)',
            tbl.tablename || '_update_own',
            tbl.tablename,
            owner_col,
            owner_col
        );

        -- Owner delete policy
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE USING (%I = current_setting(''app.current_user_address'', true)::text)',
            tbl.tablename || '_delete_own',
            tbl.tablename,
            owner_col
        );

        RAISE NOTICE 'Added owner-only RLS policies on % (owner column: %)', tbl.tablename, owner_col;
    END LOOP;

    IF array_length(tables_unowned, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠  % tables have no obvious owner column and were skipped:', array_length(tables_unowned, 1);
        RAISE NOTICE '   %', array_to_string(tables_unowned, ', ');
        RAISE NOTICE '   These tables remain accessible to vfide_app with no RLS boundary.';
        RAISE NOTICE '   Add explicit policies before mainnet announcement.';
    END IF;
END$$;

COMMIT;
