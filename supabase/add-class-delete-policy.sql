drop policy if exists "classes_delete_instructor" on public.classes;

create policy "classes_delete_instructor" on public.classes
for delete using (auth.uid() = instructor_id);
