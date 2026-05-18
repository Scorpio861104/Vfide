-- Rollback: restore vfide_app access to users.email column

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email'
  ) THEN
    EXECUTE 'GRANT SELECT(email) ON TABLE public.users TO vfide_app';
  END IF;
END;
$$;
