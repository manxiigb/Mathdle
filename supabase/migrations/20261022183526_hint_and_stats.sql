-- 1. Una sola pista por problema
alter table public.problem_secrets add column hint text;
update public.problem_secrets set hint = hints[1] where array_length(hints, 1) >= 1;
alter table public.problem_secrets drop column hints;

alter table public.problems add column has_hint boolean not null default false;
update public.problems p set has_hint = true
from public.problem_secrets s
where s.problem_id = p.id and s.hint is not null;

alter table public.attempts drop column hint;

-- 2. Quién reveló la pista (cuesta una casilla)
create table public.hint_uses (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id bigint not null references public.problems(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);
alter table public.hint_uses enable row level security;
create policy "ver mis pistas" on public.hint_uses
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.hint_uses from anon, authenticated;

-- 3. Vista de resultados (ahora sabe cuándo terminó cada día)
drop view if exists public.daily_results;
create view public.daily_results with (security_invoker = true) as
select a.user_id, p.id as problem_id, p.publish_date,
       count(*) as attempts,
       bool_or(a.correct) as solved,
       (bool_or(a.correct)
         or count(*) >= p.max_attempts - (case when h.user_id is not null then 1 else 0 end)) as finished
from public.attempts a
join public.problems p on p.id = a.problem_id
left join public.hint_uses h on h.user_id = a.user_id and h.problem_id = a.problem_id
group by a.user_id, p.id, p.publish_date, p.max_attempts, h.user_id;
grant select on public.daily_results to authenticated;

-- 4. submit_attempt: ahora descuenta la casilla de la pista
create or replace function public.submit_attempt(p_problem_id bigint, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_problem public.problems;
  v_secret public.problem_secrets;
  v_n int;
  v_max int;
  v_solved boolean;
  v_diff numeric;
  v_correct boolean;
  v_feedback text;
  v_finished boolean;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if length(p_answer) > 100 then raise exception 'Respuesta demasiado larga'; end if;

  select * into v_problem from public.problems where id = p_problem_id;
  if not found or v_problem.publish_date <> v_today then
    raise exception 'Problema no disponible';
  end if;

  select * into v_secret from public.problem_secrets where problem_id = p_problem_id;

  v_max := v_problem.max_attempts - case when exists (
    select 1 from public.hint_uses where user_id = v_uid and problem_id = p_problem_id
  ) then 1 else 0 end;

  select count(*), coalesce(bool_or(correct), false) into v_n, v_solved
  from public.attempts where user_id = v_uid and problem_id = p_problem_id;

  if v_solved or v_n >= v_max then raise exception 'Ya terminaste este problema'; end if;

  if v_problem.answer_type = 'number' then
    begin
      v_diff := replace(trim(p_answer), ',', '.')::numeric - v_secret.answer::numeric;
    exception when invalid_text_representation then
      raise exception 'Respuesta inválida';
    end;
    v_correct := abs(v_diff) <= v_secret.tolerance;
    v_feedback := case when v_correct then 'correct'
                       when v_diff > 0 then 'too_high' else 'too_low' end;
  else
    v_correct := lower(trim(p_answer)) = lower(trim(v_secret.answer));
    v_feedback := case when v_correct then 'correct' else 'wrong' end;
  end if;

  v_n := v_n + 1;
  v_finished := v_correct or v_n >= v_max;

  insert into public.attempts(user_id, problem_id, attempt_no, answer_given, correct, feedback)
  values (v_uid, p_problem_id, v_n, p_answer, v_correct, v_feedback);

  return jsonb_build_object(
    'attempt_no', v_n, 'correct', v_correct, 'feedback', v_feedback,
    'finished', v_finished, 'attempts_left', v_max - v_n,
    'solution', case when v_finished then v_secret.answer end,
    'explanation', case when v_finished then v_secret.explanation end
  );
end $$;

-- 5. get_solution: también respeta la casilla de la pista
create or replace function public.get_solution(p_problem_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('answer', s.answer, 'explanation', s.explanation)
  from public.problem_secrets s
  join public.problems p on p.id = s.problem_id
  where s.problem_id = p_problem_id
    and (
      exists (select 1 from public.attempts a
              where a.user_id = auth.uid() and a.problem_id = p_problem_id and a.correct)
      or (select count(*) from public.attempts a
          where a.user_id = auth.uid() and a.problem_id = p_problem_id)
         >= p.max_attempts - (case when exists (
              select 1 from public.hint_uses h
              where h.user_id = auth.uid() and h.problem_id = p_problem_id
            ) then 1 else 0 end)
    );
$$;

-- 6. Revelar la pista (idempotente: si ya la usó, se la devuelve sin costo)
create or replace function public.reveal_hint(p_problem_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_problem public.problems;
  v_hint text;
  v_n int;
  v_solved boolean;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select * into v_problem from public.problems where id = p_problem_id;
  if not found or v_problem.publish_date <> v_today then
    raise exception 'Problema no disponible';
  end if;

  select hint into v_hint from public.problem_secrets where problem_id = p_problem_id;
  if v_hint is null then raise exception 'Este problema no tiene pista'; end if;

  if exists (select 1 from public.hint_uses where user_id = v_uid and problem_id = p_problem_id) then
    return v_hint;
  end if;

  select count(*), coalesce(bool_or(correct), false) into v_n, v_solved
  from public.attempts where user_id = v_uid and problem_id = p_problem_id;

  if v_solved or v_n >= v_problem.max_attempts then raise exception 'Ya terminaste este problema'; end if;
  if v_n < 2 then raise exception 'La pista se desbloquea en la tercera casilla'; end if;
  if v_n > v_problem.max_attempts - 2 then raise exception 'Ya es muy tarde para usar la pista'; end if;

  insert into public.hint_uses(user_id, problem_id) values (v_uid, p_problem_id);
  return v_hint;
end $$;

revoke execute on function public.reveal_hint(bigint) from public, anon;
grant  execute on function public.reveal_hint(bigint) to authenticated;