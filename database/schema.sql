-- WaterWise: run this complete script in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('Drinking','Cooking','Bathing','Laundry','Cleaning','Gardening','Dishwashing','Other')),
  litres numeric(10,1) not null check (litres >= 0.1 and litres <= 100000),
  log_date date not null default current_date check (log_date <= current_date),
  notes varchar(240),
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content varchar(500) not null check (char_length(trim(content)) between 5 and 500),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_user_date_idx on public.water_logs(user_id, log_date desc, created_at desc);
create index if not exists suggestions_created_at_idx on public.suggestions(created_at desc);
create index if not exists suggestions_user_id_idx on public.suggestions(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_user();

-- The app accesses data through its Node server, after checking each user's token
-- and role. RLS remains enabled as defense-in-depth; the server-only service key
-- bypasses RLS and must never be exposed to the browser.
alter table public.profiles enable row level security;
alter table public.water_logs enable row level security;
alter table public.suggestions enable row level security;

-- No public policies are created. Browser clients must not access these tables
-- directly. The Node backend uses its service key only after authorization checks.
-- Promote the intended admin account only after it has signed up and its profile
-- exists. Replace the email if your admin account differs:
-- update public.profiles set role = 'admin' where email = 'mrec@gmail.com';
