-- Add missing UPDATE policy for user_writings to allow upsert operations
create policy "Allow users to update own writings"
  on public.user_writings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
