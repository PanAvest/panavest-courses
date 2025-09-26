-- Run once in Supabase SQL editor
create extension if not exists pgcrypto;
create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.course_slides (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  intro_video_url text,
  asset_url text,
  body text,
  created_at timestamptz not null default now()
);
create index if not exists idx_course_chapters_course on public.course_chapters(course_id, order_index);
create index if not exists idx_course_slides_chapter on public.course_slides(chapter_id, order_index);
