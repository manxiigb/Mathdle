alter table public.problems        enable row level security;
alter table public.problem_secrets enable row level security;  -- sin políticas = cerrada
alter table public.attempts        enable row level security;

-- Solo problemas ya publicados (hora de Chile) y solo usuarios logueados
create policy "ver problemas publicados" on public.problems
  for select to authenticated
  using (publish_date <= (now() at time zone 'America/Santiago')::date);

-- Cada uno ve solo sus intentos; nadie puede insertar directo
create policy "ver mis intentos" on public.attempts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Defensa en profundidad
revoke all on public.problem_secrets from anon, authenticated;
revoke insert, update, delete on public.attempts from anon, authenticated;