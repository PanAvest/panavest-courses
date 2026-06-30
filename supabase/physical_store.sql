-- ============================================================================
-- Physical e-book copies: stock / SKU, delivery orders, and discount vouchers
-- Run this in the Supabase SQL editor (or psql) once to enable the feature.
-- All reads/writes for vouchers + orders go through the service role (admin),
-- so no public RLS policies are required.
-- ============================================================================

-- ── 1) ebooks: stock + SKU columns ─────────────────────────────────────────
alter table public.ebooks add column if not exists sku text;
alter table public.ebooks add column if not exists stock_quantity integer not null default 0;
alter table public.ebooks add column if not exists show_stock boolean not null default false;

-- ── 2) Discount voucher codes ──────────────────────────────────────────────
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent',  -- 'percent' | 'fixed'
  discount_value integer not null default 0,       -- percent (0-100) OR fixed amount in pesewas (minor units)
  active boolean not null default true,
  max_uses integer,                                -- null = unlimited
  used_count integer not null default 0,
  min_subtotal_cents integer not null default 0,   -- minimum order subtotal (pesewas) before the code applies
  expires_at timestamptz,                          -- null = never expires
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vouchers_code_lower_idx on public.vouchers (lower(code));
alter table public.vouchers enable row level security;
-- No public policies on purpose: validation + management happen via service role.

-- ── 3) Physical delivery / pickup orders ────────────────────────────────────
create table if not exists public.physical_orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  ebook_id uuid references public.ebooks (id) on delete set null,
  ebook_slug text,
  ebook_title text,
  customer_name text not null,
  email text not null,
  phone text not null,
  quantity integer not null default 1,
  fulfillment text not null default 'delivery',    -- 'delivery' | 'pickup'
  region text,
  city text,
  street text,
  unit_price_cents integer not null default 0,
  subtotal_cents integer not null default 0,
  voucher_code text,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'new',              -- 'new' | 'processing' | 'fulfilled' | 'cancelled'
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists physical_orders_created_idx on public.physical_orders (created_at desc);
create index if not exists physical_orders_status_idx on public.physical_orders (status);
alter table public.physical_orders enable row level security;
-- No public policies on purpose: all access via service role.

-- ── 4) Atomic stock decrement (used when an order is placed) ────────────────
-- Returns the remaining stock, or NULL if there was not enough stock.
create or replace function public.decrement_ebook_stock(p_ebook_id uuid, p_qty integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  remaining integer;
begin
  update public.ebooks
     set stock_quantity = stock_quantity - p_qty
   where id = p_ebook_id
     and stock_quantity >= p_qty
  returning stock_quantity into remaining;
  return remaining; -- NULL when the WHERE guard fails (insufficient stock)
end;
$$;

-- ── 4b) Atomic stock return (used when an order is cancelled / deleted) ─────
-- Optional: the app also has a guarded read-modify-write fallback, but this is
-- fully atomic. Returns the new stock level.
create or replace function public.increment_ebook_stock(p_ebook_id uuid, p_qty integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  remaining integer;
begin
  update public.ebooks
     set stock_quantity = stock_quantity + p_qty
   where id = p_ebook_id
  returning stock_quantity into remaining;
  return remaining;
end;
$$;

-- ── 5) Atomic voucher redemption (increments usage, respecting max_uses) ────
-- Returns true when the redemption succeeded.
create or replace function public.redeem_voucher(p_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  updated integer;
begin
  update public.vouchers
     set used_count = used_count + 1,
         updated_at = now()
   where lower(code) = lower(p_code)
     and active = true
     and (expires_at is null or expires_at > now())
     and (max_uses is null or used_count < max_uses);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;
