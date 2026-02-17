-- Enable admin-controlled "free with login" access for programs and e-books.
alter table public.courses
  add column if not exists free_for_logged_in boolean not null default false;

alter table public.ebooks
  add column if not exists free_for_logged_in boolean not null default false;
