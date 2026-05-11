-- ============================================================
-- Namecard scanner — Supabase schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- 1. cards table -------------------------------------------------------------

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- image paths inside the `card-images` storage bucket
  front_image_path text not null,
  back_image_path  text,

  -- card content
  company_name              text not null,
  website                   text,
  website_guessed           boolean default false,
  country_name              text,
  country_code              text,
  person_name               text not null,
  person_name_en            text,
  position                  text,
  industry                  text,
  company_type              text,
  interested_service        text not null,
  interested_service_other  text,
  note                      text,
  detected_language         text,

  -- AI bookkeeping
  ai_filled_fields jsonb default '[]'::jsonb,
  ai_confidence    jsonb
);

create index if not exists cards_user_created_idx
  on public.cards (user_id, created_at desc);

-- Migration: companyType added later (safe to re-run)
alter table public.cards
  add column if not exists company_type text;

-- 2. RLS ---------------------------------------------------------------------

alter table public.cards enable row level security;

drop policy if exists "Users select own cards"  on public.cards;
drop policy if exists "Users insert own cards"  on public.cards;
drop policy if exists "Users update own cards"  on public.cards;
drop policy if exists "Users delete own cards"  on public.cards;

create policy "Users select own cards"
  on public.cards for select
  using (auth.uid() = user_id);

create policy "Users insert own cards"
  on public.cards for insert
  with check (auth.uid() = user_id);

create policy "Users update own cards"
  on public.cards for update
  using (auth.uid() = user_id);

create policy "Users delete own cards"
  on public.cards for delete
  using (auth.uid() = user_id);

-- 3. Storage bucket ----------------------------------------------------------
-- (private; each user can only read their own folder)

insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own images"  on storage.objects;
drop policy if exists "Users read own images"    on storage.objects;
drop policy if exists "Users delete own images"  on storage.objects;

-- Path convention: <user_id>/<card_id>/<front|back>.jpg
-- (storage.foldername returns an array of path segments before the filename)

create policy "Users upload own images"
  on storage.objects for insert
  with check (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own images"
  on storage.objects for select
  using (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'card-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
