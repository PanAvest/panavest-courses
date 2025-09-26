alter table public.courses add column if not exists cpd_points int;
alter table public.courses add column if not exists img text;

alter table public.enrollments add column if not exists paid boolean default false;
alter table public.enrollments add column if not exists progress_pct numeric default 0;

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete cascade,
  position int not null default 1,
  title text not null,
  intro_video_url text,
  summary text,
  created_at timestamptz default now()
);
create index if not exists idx_course_chapters_course on public.course_chapters(course_id);

create table if not exists public.course_slides (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.course_chapters (id) on delete cascade,
  position int not null default 1,
  title text not null,
  video_url text,
  content text,
  created_at timestamptz default now()
);
create index if not exists idx_course_slides_chapter on public.course_slides(chapter_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  amount numeric,
  currency text default 'GHS',
  method text,
  provider text,
  ref text,
  status text,
  created_at timestamptz default now()
);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_course on public.payments(course_id);

create table if not exists public.user_slide_progress (
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  slide_id uuid references public.course_slides(id) on delete cascade,
  completed_at timestamptz default now(),
  primary key(user_id, slide_id)
);
create index if not exists idx_user_progress_course on public.user_slide_progress(course_id);

do $$
declare cid uuid;
begin
  if not exists (select 1 from public.courses where slug='project-management-essentials') then
    insert into public.courses (slug,title,description,level,price,cpd_points,img,accredited,published)
    values ('project-management-essentials','Project Management Essentials',
            'Plan, execute, and deliver projects using practical frameworks.',
            'Beginner', 199.00, 12,
            '/project-management.png', array['CPPD'], true)
    returning id into cid;

    insert into public.course_chapters (course_id,position,title,intro_video_url,summary)
    values
      (cid,1,'Foundations','', 'Scope, time, cost, quality.'),
      (cid,2,'Planning','', 'WBS, critical path, risk.');

    insert into public.course_slides (chapter_id,position,title,video_url,content)
    select ch.id, 1, 'Welcome', '', 'Welcome to the program'
    from public.course_chapters ch where ch.course_id = cid and ch.position=1;

    insert into public.course_slides (chapter_id,position,title,video_url,content)
    select ch.id, 2, 'Key Concepts', '', 'Core PM ideas'
    from public.course_chapters ch where ch.course_id = cid and ch.position=1;
  end if;
end$$;
