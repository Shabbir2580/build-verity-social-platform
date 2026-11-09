-- Move pg_trgm out of the exposed public schema.
-- The extension is relocatable (verified on the live project), and the existing
-- trigram indexes remain attached to their operator classes by object identity.
-- Supabase's configured database search_path already includes the extensions schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
      AND e.extrelocatable
      AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'Expected relocatable pg_trgm extension in public schema; refusing to move it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION 'Required extensions schema does not exist; refusing to create or move pg_trgm';
  END IF;
END
$$;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
