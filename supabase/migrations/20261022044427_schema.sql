create table public.problems (
  id bigint generated always as identity primary key,
  publish_date date not null unique,        -- qué día sale
  title text,
  statement text not null,                  -- LaTeX
  answer_type text not null check (answer_type in ('number','text')),
  max_attempts int not null default 5
);

create table public.problem_secrets (       -- NADIE del cliente la lee
  problem_id bigint primary key references public.problems(id) on delete cascade,
  answer text not null,
  tolerance numeric not null default 0,     -- para respuestas numéricas
  hints text[] not null default '{}',       -- una pista por intento fallido
  explanation text
);

create table public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) default auth.uid(),
  problem_id bigint not null references public.problems(id),
  attempt_no int not null,
  answer_given text not null,
  correct boolean not null,
  feedback text,                            -- 'too_high' | 'too_low' | 'wrong' | 'correct'
  hint text,
  created_at timestamptz not null default now(),
  unique (user_id, problem_id, attempt_no)
);

create view public.daily_results with (security_invoker = true) as
select a.user_id, p.id as problem_id, p.publish_date,
       count(*) as attempts, bool_or(a.correct) as solved
from public.attempts a join public.problems p on p.id = a.problem_id
group by a.user_id, p.id, p.publish_date;