create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('student', 'instructor')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.opening_tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  instructions text,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.opening_tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  manual_scores jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (task_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.memberships enable row level security;
alter table public.opening_tasks enable row level security;
alter table public.submissions enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles_select_own_or_instructor" on public.profiles;
create policy "profiles_select_own_or_instructor" on public.profiles
for select using (
  auth.uid() = id
  or public.current_profile_role() = 'instructor'
);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "classes_select_authenticated" on public.classes
for select using (auth.role() = 'authenticated');

create policy "classes_insert_instructor" on public.classes
for insert with check (auth.uid() = instructor_id);

create policy "classes_update_instructor" on public.classes
for update using (auth.uid() = instructor_id) with check (auth.uid() = instructor_id);

create policy "memberships_select_related" on public.memberships
for select using (
  student_id = auth.uid()
  or exists (select 1 from public.classes c where c.id = class_id and c.instructor_id = auth.uid())
);

create policy "memberships_insert_student_or_instructor" on public.memberships
for insert with check (
  student_id = auth.uid()
  or exists (select 1 from public.classes c where c.id = class_id and c.instructor_id = auth.uid())
);

create policy "tasks_select_related" on public.opening_tasks
for select using (
  exists (select 1 from public.classes c where c.id = class_id and c.instructor_id = auth.uid())
  or exists (select 1 from public.memberships m where m.class_id = class_id and m.student_id = auth.uid())
);

create policy "tasks_insert_instructor" on public.opening_tasks
for insert with check (
  exists (select 1 from public.classes c where c.id = class_id and c.instructor_id = auth.uid())
);

create policy "submissions_select_related" on public.submissions
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.opening_tasks t
    join public.classes c on c.id = t.class_id
    where t.id = task_id and c.instructor_id = auth.uid()
  )
);

create policy "submissions_insert_own" on public.submissions
for insert with check (student_id = auth.uid());

create policy "submissions_update_instructor_grade" on public.submissions
for update using (
  exists (
    select 1 from public.opening_tasks t
    join public.classes c on c.id = t.class_id
    where t.id = task_id and c.instructor_id = auth.uid()
  )
);
