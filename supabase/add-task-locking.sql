alter table public.opening_tasks
add column if not exists locked boolean not null default false;

drop policy if exists "tasks_update_instructor" on public.opening_tasks;

create policy "tasks_update_instructor" on public.opening_tasks
for update using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id and c.instructor_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id and c.instructor_id = auth.uid()
  )
);
