-- Gotta Cash 'Em All — Admin functions
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Geeft admin-emails (geen reken-overhead, alleen één string-vergelijking) toegang tot:
--   - is_admin()                          → bool, gebruikt door UI om admin-menu te tonen
--   - admin_users_overview()              → tabel met alle users + aggregate stats
--   - admin_user_wallet(target_user_id)   → wallet-kaarten van één user
--
-- Adminstatus = email match (case-insensitive). Voeg meer admins toe door extra
-- emails in de array te zetten. SECURITY DEFINER = functie runt als owner
-- (postgres), kan dus auth.users lezen. Niet-admins krijgen 'Not authorized'.

-- =========================================================
-- 1) is_admin() — true als ingelogde user in admin-lijst zit
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select lower(email) = ANY(ARRAY[
    'tufanavci94@gmail.com'
    -- voeg meer emails toe op nieuwe regels, comma ervoor
  ])
  from auth.users
  where id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated;

-- =========================================================
-- 2) admin_users_overview() — alle users met geaggregeerde stats
-- =========================================================
create or replace function public.admin_users_overview()
returns table (
  user_id uuid,
  email text,
  signed_up_at timestamptz,
  last_sign_in_at timestamptz,
  provider text,
  email_confirmed boolean,
  wallet_count bigint,
  wallet_quantity bigint,
  total_invested_eur numeric,
  watchlist_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      coalesce(u.raw_app_meta_data->>'provider', 'email')::text,
      (u.email_confirmed_at is not null),
      count(distinct w.id),
      coalesce(sum(w.quantity), 0)::bigint,
      coalesce(sum(w.purchase_price_eur * w.quantity), 0)::numeric(12,2),
      count(distinct wl.id)
    from auth.users u
    left join public.wallet_holdings w on w.user_id = u.id
    left join public.watchlist_items wl on wl.user_id = u.id
    group by u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_app_meta_data, u.email_confirmed_at
    order by u.created_at desc;
end;
$$;

grant execute on function public.admin_users_overview() to authenticated;

-- =========================================================
-- 3) admin_user_wallet(target_user) — wallet van één gebruiker
-- =========================================================
create or replace function public.admin_user_wallet(target_user uuid)
returns setof public.wallet_holdings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select * from public.wallet_holdings
    where user_id = target_user
    order by created_at desc;
end;
$$;

grant execute on function public.admin_user_wallet(uuid) to authenticated;

-- =========================================================
-- 4) admin_user_watchlist(target_user) — watchlist van één gebruiker
-- =========================================================
create or replace function public.admin_user_watchlist(target_user uuid)
returns setof public.watchlist_items
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
    select * from public.watchlist_items
    where user_id = target_user
    order by created_at desc;
end;
$$;

grant execute on function public.admin_user_watchlist(uuid) to authenticated;
