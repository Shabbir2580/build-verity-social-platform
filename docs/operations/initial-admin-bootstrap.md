# Initial administrator bootstrap

The application deliberately creates every new profile with the `user` role. There is no public signup parameter or client-side path that can create an administrator.

When a new Verity Supabase project has no active administrator, the project owner must perform the first promotion from the Supabase Dashboard SQL Editor. Do not add a public RPC or client-side bootstrap button.

## Preconditions

- Sign in to the Supabase Dashboard as a trusted project owner.
- Confirm the intended account has completed email verification.
- Confirm the email below belongs to the intended account.
- Run this only when the project has no active administrator.
- Keep the result and operator identity in the project's private operational records.

## One-time guarded SQL

Replace `REPLACE_WITH_VERIFIED_ACCOUNT_EMAIL` with the exact verified email address, then run the whole block in the SQL Editor.

```sql
begin;

do $bootstrap$
declare
  target_id uuid;
  matching_accounts integer;
begin
  select count(*), (array_agg(id))[1]
    into matching_accounts, target_id
  from auth.users
  where lower(email) = lower(trim('REPLACE_WITH_VERIFIED_ACCOUNT_EMAIL'))
    and email_confirmed_at is not null;

  if matching_accounts <> 1 or target_id is null then
    raise exception 'Expected exactly one account with that verified email';
  end if;

  if exists (
    select 1
    from public.profiles
    where role = 'admin'
      and is_suspended = false
  ) then
    raise exception 'An active administrator already exists; bootstrap refused';
  end if;

  update public.profiles
  set role = 'admin',
      is_suspended = false
  where id = target_id;

  if not found then
    raise exception 'The verified account has no profile; bootstrap refused';
  end if;

  insert into public.audit_logs
    (actor_id, action, entity_type, entity_id, details)
  values
    (null, 'admin.bootstrap', 'profile', target_id::text,
     jsonb_build_object(
       'method', 'supabase_dashboard_sql_editor',
       'reason', 'Initial administrator bootstrap'
     ));
end
$bootstrap$;

commit;
```

## After bootstrap

1. Sign in as the promoted account and confirm the admin workspace is accessible.
2. Create a second trusted administrator through the admin role-management workflow.
3. Keep administrator access limited to people who need it.
4. Do not reuse this procedure to promote additional accounts. Use the audited admin role-management workflow instead.

This script is intentionally not part of an application route, migration, or public API. It does not run automatically and does not promote any account until a project owner executes it in the Dashboard.
