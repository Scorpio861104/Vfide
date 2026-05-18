-- Down migration for 20260510_120000_grant_vfide_app_and_baseline_rls.sql
--
-- Revokes the broad grants and drops any RLS policies created by the
-- *_read_own / *_insert_own / *_update_own / *_delete_own naming pattern.
-- Pre-existing policies (created by earlier migrations) are untouched.

BEGIN;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
            policyname LIKE '%\_read\_own' ESCAPE '\'
            OR policyname LIKE '%\_insert\_own' ESCAPE '\'
            OR policyname LIKE '%\_update\_own' ESCAPE '\'
            OR policyname LIKE '%\_delete\_own' ESCAPE '\'
          )
          -- Don't drop the original user-owned policies from
          -- 20260121_234000_add_row_level_security.sql; those use the same
          -- naming convention but pre-date this migration.
          AND tablename NOT IN ('users', 'messages', 'friendships', 'user_rewards', 'proposals', 'endorsements')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            pol.policyname,
            pol.tablename
        );
    END LOOP;
END$$;

DO $$
DECLARE
    tbl text;
BEGIN
    PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
    IF NOT FOUND THEN
        RETURN;
    END IF;

    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM vfide_app',
            tbl
        );
    END LOOP;

    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public ' ||
            'REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM vfide_app';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public ' ||
            'REVOKE USAGE, SELECT ON SEQUENCES FROM vfide_app';
END$$;

COMMIT;
