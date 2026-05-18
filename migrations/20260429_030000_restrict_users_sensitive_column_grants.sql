-- Migration: restrict sensitive users-column reads for vfide_app
-- Fixes: N-H5 / N-M9 (authenticated sessions could read every users column)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    RAISE EXCEPTION 'vfide_app role does not exist; run role bootstrap first';
  END IF;
END;
$$;

-- Keep table-level SELECT for normal public profile UX, but revoke sensitive columns.
-- Postgres column privileges are additive/subtractive over table grants.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email'
  ) THEN
    EXECUTE 'REVOKE SELECT(email) ON TABLE public.users FROM vfide_app';
  END IF;
END;
$$;
