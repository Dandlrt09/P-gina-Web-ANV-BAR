-- supabase-products — data foundations (Fase 0)
-- Apply via Supabase SQL editor (or `supabase db push` once linked).
-- Additive + idempotent: safe to re-run.

-- Categories: presentation order. sort_order UNIQUE = catalog section order.
create table public.categories (
  id serial primary key,
  name text not null unique,
  sort_order int not null unique
);

-- products: colors/sizes JSONB mirror ProductColor[]/sizes EXACTLY (never
-- queried server-side; still @> queryable). sort_order nullable: NULL = after
-- numbered (NULLS LAST ordering). featuredImage/addedAt deliberately absent.
create table public.products (
  id text primary key,
  name text not null,
  category text not null references public.categories(name),
  price_cop int not null check (price_cop >= 0),
  sizes jsonb not null,
  fabric text,
  care text,
  editorial text,
  is_new boolean not null default false,
  sort_order int,
  colors jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- no updated_at trigger: no UPDATE path in this slice
);

-- RLS: policies are the security boundary (anon key ships in bundle BY DESIGN).
alter table public.categories enable row level security;
alter table public.products enable row level security;
create policy "anon read categories" on public.categories for select to anon using (true);
create policy "anon read products" on public.products for select to anon using (true);
-- no write policies -> anon/authenticated writes denied by default deny.

-- Storage: public bucket + explicit public-read on storage.objects (covers the
-- download API; public bucket + CDN URL serve the site).
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;
create policy "public read productos" on storage.objects
  for select using (bucket_id = 'productos');