-- Lectura del enunciado: cualquiera (la RLS oculta los futuros)
grant select on public.problems to anon, authenticated;

-- Cada usuario lee lo suyo (la RLS filtra por usuario)
grant select on public.attempts to authenticated;
grant select on public.hint_uses to authenticated;
grant select on public.daily_results to authenticated;

-- Script de carga (la secret key actúa como service_role)
grant select, insert, update, delete on public.problems to service_role;
grant select, insert, update, delete on public.problem_secrets to service_role;
grant select, insert, update, delete on public.attempts to service_role;
grant select, insert, update, delete on public.hint_uses to service_role;
grant select on public.daily_results to service_role;
grant usage, select on all sequences in schema public to service_role;