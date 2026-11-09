-- Suspended accounts must not retain write access through already-issued sessions.
-- Add an active-account requirement to every public-schema write policy that applies
-- to authenticated users (including policies granted to PUBLIC). Preserve each
-- policy's command, role list, permissive/restrictive mode and existing predicates.
do $$
declare
  p record;
  v_roles text;
  v_command text;
  v_using text;
  v_check text;
  v_sql text;
begin
  for p in
    select pol.oid, pol.polname, pol.polrelid, pol.polcmd, pol.polpermissive,
           pol.polroles, pol.polqual, pol.polwithcheck,
           ns.nspname as schema_name, cls.relname as table_name
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    where ns.nspname = 'public'
      and pol.polcmd <> 'r'
      and (
        0 = any(pol.polroles)
        or (select oid from pg_roles where rolname = 'authenticated') = any(pol.polroles)
      )
  loop
    select string_agg(
      case when role_oid = 0 then 'public' else quote_ident(r.rolname) end,
      ', ' order by ord
    )
    into v_roles
    from unnest(p.polroles) with ordinality as roles(role_oid, ord)
    left join pg_roles r on r.oid = roles.role_oid;

    v_command := case p.polcmd
      when 'a' then 'insert'
      when 'w' then 'update'
      when 'd' then 'delete'
      when '*' then 'all'
      else null
    end;
    if v_command is null then
      raise exception 'Unexpected policy command % for %.%', p.polcmd, p.schema_name, p.table_name;
    end if;

    v_using := case when p.polqual is null then null
      else pg_get_expr(p.polqual, p.polrelid) end;
    v_check := case when p.polwithcheck is null then null
      else pg_get_expr(p.polwithcheck, p.polrelid) end;

    execute format('drop policy %I on %I.%I', p.polname, p.schema_name, p.table_name);

    v_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.polname, p.schema_name, p.table_name,
      case when p.polpermissive then 'permissive' else 'restrictive' end,
      v_command, v_roles
    );

    if v_using is not null then
      v_sql := v_sql || format(' using ((%s) and (public.is_active_user()))', v_using);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check ((%s) and (public.is_active_user()))', v_check);
    end if;

    execute v_sql;
  end loop;
end
$$;

-- A suspended account must also lose elevated staff and community-owner
-- authorization, including read access protected by these helper functions.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user()
    and coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user()
    and coalesce((select role in ('moderator','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user()
    and coalesce((select role in ('support','moderator','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_support()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user()
    and coalesce((select role in ('support','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.community_role(cid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when public.is_active_user() then
    (select role from public.community_memberships
     where community_id = cid and user_id = auth.uid())
  else null end
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select case when public.is_active_user() then
    (select role from public.profiles where id = auth.uid())
  else null end
$$;
