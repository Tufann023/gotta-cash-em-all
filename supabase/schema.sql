-- Gotta Cash 'Em All — Supabase schema
-- Run dit in Supabase Dashboard → SQL Editor → New query → Run
-- (1x; herhalen is veilig dankzij IF NOT EXISTS / drop policy)

-- =========================================================
-- WATCHLIST: kaarten die de gebruiker volgt (niet bezit)
-- =========================================================
create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id text not null,
  card_name text not null,
  set_name text not null,
  card_image text not null,
  noted_price_eur numeric,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists watchlist_items_user_id_idx on public.watchlist_items(user_id);

alter table public.watchlist_items enable row level security;

drop policy if exists "Users can read own watchlist" on public.watchlist_items;
create policy "Users can read own watchlist"
  on public.watchlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own watchlist" on public.watchlist_items;
create policy "Users can insert own watchlist"
  on public.watchlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own watchlist" on public.watchlist_items;
create policy "Users can update own watchlist"
  on public.watchlist_items for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own watchlist" on public.watchlist_items;
create policy "Users can delete own watchlist"
  on public.watchlist_items for delete
  using (auth.uid() = user_id);

-- =========================================================
-- WALLET: kaarten die de gebruiker bezit
-- =========================================================
create table if not exists public.wallet_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  card_id text not null,
  card_name text not null,
  set_name text not null,
  card_image text not null,
  condition text not null,
  purchase_date date not null,
  purchase_price_eur numeric not null check (purchase_price_eur >= 0),
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_holdings_user_id_idx on public.wallet_holdings(user_id);

alter table public.wallet_holdings enable row level security;

drop policy if exists "Users can read own wallet" on public.wallet_holdings;
create policy "Users can read own wallet"
  on public.wallet_holdings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own wallet" on public.wallet_holdings;
create policy "Users can insert own wallet"
  on public.wallet_holdings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own wallet" on public.wallet_holdings;
create policy "Users can update own wallet"
  on public.wallet_holdings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wallet" on public.wallet_holdings;
create policy "Users can delete own wallet"
  on public.wallet_holdings for delete
  using (auth.uid() = user_id);
