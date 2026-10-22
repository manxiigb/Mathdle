create or replace function public.submit_attempt(p_problem_id bigint, p_answer text)
returns jsonb
language plpgsql
security definer          -- corre con permisos del dueño, saltándose RLS
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_problem public.problems;
  v_secret public.problem_secrets;
  v_n int; v_solved boolean; v_diff numeric;
  v_correct boolean; v_feedback text; v_finished boolean; v_hint text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select * into v_problem from public.problems where id = p_problem_id;
  if not found or v_problem.publish_date <> v_today then
    raise exception 'Problema no disponible';
  end if;

  select * into v_secret from public.problem_secrets where problem_id = p_problem_id;

  select count(*), coalesce(bool_or(correct), false) into v_n, v_solved
  from public.attempts where user_id = v_uid and problem_id = p_problem_id;

  if v_solved or v_n >= v_problem.max_attempts then
    raise exception 'Ya terminaste este problema';
  end if;

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
  v_finished := v_correct or v_n >= v_problem.max_attempts;
  v_hint := case when not v_finished then v_secret.hints[v_n] end;

  insert into public.attempts(user_id, problem_id, attempt_no, answer_given, correct, feedback, hint)
  values (v_uid, p_problem_id, v_n, p_answer, v_correct, v_feedback, v_hint);

  return jsonb_build_object(
    'attempt_no', v_n, 'correct', v_correct, 'feedback', v_feedback,
    'finished', v_finished, 'attempts_left', v_problem.max_attempts - v_n,
    'hint', v_hint,
    'solution', case when v_finished then v_secret.answer end,
    'explanation', case when v_finished then v_secret.explanation end
  );
end $$;

revoke execute on function public.submit_attempt(bigint, text) from public, anon;
grant  execute on function public.submit_attempt(bigint, text) to authenticated;

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
          where a.user_id = auth.uid() and a.problem_id = p_problem_id) >= p.max_attempts
    );
$$;

revoke execute on function public.get_solution(bigint) from public, anon;
grant  execute on function public.get_solution(bigint) to authenticated;