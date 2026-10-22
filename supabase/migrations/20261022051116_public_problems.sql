drop policy if exists "ver problemas publicados" on public.problems;

create policy "ver problemas publicados" on public.problems
  for select to anon, authenticated
  using (publish_date <= (now() at time zone 'America/Santiago')::date);