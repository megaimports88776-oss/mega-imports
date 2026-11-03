-- MEGAIMPORTS — initial schema
-- Apply through Supabase SQL Editor or Supabase CLI migrations.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'confirmed', 'received', 'overdue', 'refunded', 'chargeback', 'failed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  cpf text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= price_cents),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sku text unique,
  active boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric(5,2) check (discount_percent > 0 and discount_percent <= 100),
  discount_cents integer check (discount_cents > 0),
  minimum_cents integer not null default 0 check (minimum_cents >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  check ((discount_percent is not null) <> (discount_cents is not null))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid not null references auth.users(id),
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  shipping_address jsonb not null,
  asaas_customer_id text,
  asaas_payment_id text unique,
  asaas_invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text,
  link_url text,
  active boolean not null default false,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payment_id text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_active_created_idx on public.products(active, created_at desc);
create index products_category_idx on public.products(category_id);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, payment_status);
create index order_items_order_idx on public.order_items(order_id);
create index webhook_pending_idx on public.asaas_webhook_events(processed, received_at);

-- Enable RLS on every exposed application table.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;
alter table public.site_settings enable row level security;
alter table public.banners enable row level security;
alter table public.asaas_webhook_events enable row level security;
alter table public.audit_logs enable row level security;

-- Customers can see/edit only their own profile (role is not client-editable via policy).
create policy "profile_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profile_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profile_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()) and role = 'customer');

-- Public storefront reads active catalog content only.
create policy "active_categories_public_read" on public.categories for select to anon, authenticated using (active = true);
create policy "active_products_public_read" on public.products for select to anon, authenticated using (active = true);
create policy "product_images_public_read" on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and p.active = true)
);
create policy "active_banners_public_read" on public.banners for select to anon, authenticated using (
  active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
);
create policy "site_settings_public_read" on public.site_settings for select to anon, authenticated using (key in ('brand', 'theme', 'contact', 'social'));

create policy "addresses_select_own" on public.addresses for select to authenticated using (user_id = (select auth.uid()));
create policy "addresses_insert_own" on public.addresses for insert to authenticated with check (user_id = (select auth.uid()));
create policy "addresses_update_own" on public.addresses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "addresses_delete_own" on public.addresses for delete to authenticated using (user_id = (select auth.uid()));

create policy "orders_select_own" on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy "order_items_select_own" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
);
create policy "favorites_select_own" on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

-- Deliberately no client policies for payment records, webhook events, coupons, audit logs,
-- or product writes. Server-side privileged operations must validate authorization.
-- Assign admin roles only through a trusted server/admin workflow, never from client input.
