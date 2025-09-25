-- Site-wide settings (public readable; service role writes)
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  hero_title text,
  hero_subtitle text,
  primary_color text default '#b65437',
  accent_color text default '#f5b750',
  bg_color text default '#fefdfa',
  text_color text default '#2c2522',
  social jsonb default '{}'::jsonb, -- { x:'', instagram:'', linkedin:'', facebook:'' }
  footer_copy text,
  updated_at timestamptz default now()
);

insert into public.site_settings (id, hero_title, hero_subtitle, footer_copy, social)
  values (
    '00000000-0000-0000-0000-000000000001',
    'Unlock your potential',
    'Certified CPD (CPPD) knowledge development programmes from PanAvest.',
    '© PanAvest. All rights reserved.',
    jsonb_build_object('x','','instagram','','linkedin','','facebook','')
  )
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings for select using (true);
-- Writes only via service role (RLS bypass). No public write policy on purpose.
