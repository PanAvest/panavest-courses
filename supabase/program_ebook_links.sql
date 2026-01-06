-- Map knowledge programs (courses) to ebooks for bundled entitlements
create extension if not exists pgcrypto;

create table if not exists public.program_ebook_links (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique(course_id, ebook_id)
);
