-- Evaluate auth.uid() once per statement rather than once per candidate row.
-- This is a semantics-preserving RLS optimization recommended by Supabase.
DO $$
DECLARE
  p record;
  using_expr text;
  check_expr text;
  alter_sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%auth.uid()%'
        OR coalesce(with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    using_expr := CASE
      WHEN p.qual IS NULL THEN NULL
      ELSE replace(p.qual, 'auth.uid()', '(select auth.uid())')
    END;

    check_expr := CASE
      WHEN p.with_check IS NULL THEN NULL
      ELSE replace(p.with_check, 'auth.uid()', '(select auth.uid())')
    END;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I%s%s',
      p.policyname,
      p.schemaname,
      p.tablename,
      CASE WHEN using_expr IS NULL THEN '' ELSE format(' USING (%s)', using_expr) END,
      CASE WHEN check_expr IS NULL THEN '' ELSE format(' WITH CHECK (%s)', check_expr) END
    );

    EXECUTE alter_sql;
  END LOOP;
END
$$;
