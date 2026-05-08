-- =====================================================
-- DIVARC — Migration 0026 : Pro Features (consolidée)
--   B.9  : Réseau pro distinct (connections N1/N2/N3)
--   B.10 : Mentorat structuré (offers + bookings)
--   B.11 : Skills assessments (quizzes + attempts + badges)
--   B.13 : Live recruiting (sessions Q&A)
-- =====================================================

-- =========================================================
-- 1. Connections pro (séparées des amitiés sociales)
-- =========================================================
create table if not exists public.pro_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  context text
    check (context is null or context in ('colleague', 'manager', 'report', 'client', 'partner', 'other')),
  intro text check (intro is null or char_length(intro) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint pro_connections_different_users check (requester_id <> recipient_id)
);

create unique index if not exists pro_connections_active_pair_idx
  on public.pro_connections (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  )
  where status in ('pending', 'accepted');

create index if not exists pro_connections_requester_idx
  on public.pro_connections (requester_id, status);
create index if not exists pro_connections_recipient_idx
  on public.pro_connections (recipient_id, status);

create or replace function public.are_pro_connected(user_a uuid, user_b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pro_connections
     where status = 'accepted'
       and ((requester_id = user_a and recipient_id = user_b)
         or (requester_id = user_b and recipient_id = user_a))
  );
$$;
grant execute on function public.are_pro_connected(uuid, uuid) to authenticated;

-- Degré de connexion (1 = direct, 2 = via 1 personne, 3 = via 2 personnes,
-- null = inconnu / pas dans 3 sauts).
create or replace function public.connection_degree(target_user_id uuid)
returns integer
language plpgsql stable security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  level1 uuid[];
  level2 uuid[];
begin
  if me is null or me = target_user_id then return 0; end if;

  -- N1
  select array_agg(distinct case when requester_id = me then recipient_id else requester_id end)
    into level1
    from public.pro_connections
   where status = 'accepted'
     and (requester_id = me or recipient_id = me);
  if level1 is null then level1 := array[]::uuid[]; end if;

  if target_user_id = any(level1) then return 1; end if;

  -- N2 (amis d'amis)
  select array_agg(distinct case when requester_id = any(level1) then recipient_id else requester_id end)
    into level2
    from public.pro_connections
   where status = 'accepted'
     and (requester_id = any(level1) or recipient_id = any(level1));
  if level2 is null then level2 := array[]::uuid[]; end if;
  level2 := array(select unnest(level2) except select unnest(level1) except select me);

  if target_user_id = any(level2) then return 2; end if;

  -- N3
  if exists (
    select 1 from public.pro_connections
     where status = 'accepted'
       and (
         (requester_id = any(level2) and recipient_id = target_user_id)
         or (recipient_id = any(level2) and requester_id = target_user_id)
       )
  ) then return 3; end if;

  return null;
end;
$$;
grant execute on function public.connection_degree(uuid) to authenticated;

create or replace function public.send_pro_connection(
  recipient_user_id uuid,
  context_value text default null,
  intro_value text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then raise exception 'auth required'; end if;
  if me = recipient_user_id then raise exception 'cannot connect to self'; end if;

  insert into public.pro_connections (requester_id, recipient_id, context, intro)
       values (me, recipient_user_id, context_value, intro_value)
  returning id into new_id;

  -- Notification
  insert into public.notifications (user_id, type, title, body, related_user_id, href)
       values (
         recipient_user_id,
         'system',
         'Demande de connexion pro',
         coalesce(intro_value, 'Une nouvelle demande de connexion professionnelle.'),
         me,
         '/network?tab=recues'
       );

  return new_id;
end;
$$;
grant execute on function public.send_pro_connection(uuid, text, text) to authenticated;

-- RLS pro_connections
alter table public.pro_connections enable row level security;

drop policy if exists "users see own pro connections" on public.pro_connections;
create policy "users see own pro connections"
  on public.pro_connections for select
  using (requester_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "users send pro connection" on public.pro_connections;
create policy "users send pro connection"
  on public.pro_connections for insert
  with check (requester_id = auth.uid());

drop policy if exists "users respond pro connection" on public.pro_connections;
create policy "users respond pro connection"
  on public.pro_connections for update
  using (recipient_id = auth.uid() or requester_id = auth.uid());

drop policy if exists "users delete pro connection" on public.pro_connections;
create policy "users delete pro connection"
  on public.pro_connections for delete
  using (recipient_id = auth.uid() or requester_id = auth.uid());

-- =========================================================
-- 2. Mentorat — offres + sessions
-- =========================================================
create table if not exists public.mentor_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  bio text not null check (char_length(bio) between 10 and 4000),
  topics text[] not null default '{}',
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  rate_currency text
    check (rate_currency is null or rate_currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),
  languages text[] not null default '{fr}',
  is_available boolean not null default true,
  sessions_count integer not null default 0,
  rating_avg numeric(3, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_offers_available_idx
  on public.mentor_offers (is_available, created_at desc) where is_available;
create index if not exists mentor_offers_topics_idx
  on public.mentor_offers using gin (topics);

drop trigger if exists mentor_offers_set_updated_at on public.mentor_offers;
create trigger mentor_offers_set_updated_at
  before update on public.mentor_offers
  for each row execute function public.set_updated_at();

create table if not exists public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 200),
  message text check (message is null or char_length(message) between 1 and 2000),
  scheduled_at timestamptz,
  duration_min integer not null default 30 check (duration_min between 15 and 240),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  rating integer check (rating is null or rating between 1 and 5),
  rating_comment text check (rating_comment is null or char_length(rating_comment) <= 1000),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  constraint mentor_sessions_different_users check (mentor_id <> mentee_id)
);

create index if not exists mentor_sessions_mentor_idx
  on public.mentor_sessions (mentor_id, status, created_at desc);
create index if not exists mentor_sessions_mentee_idx
  on public.mentor_sessions (mentee_id, status, created_at desc);

-- Trigger : compteur sessions + notif au mentor
create or replace function public.notify_mentor_request()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  mentee_name text;
begin
  if tg_op = 'INSERT' then
    select coalesce(full_name, username, 'Quelqu''un')
      into mentee_name from public.profiles where id = new.mentee_id;
    insert into public.notifications (user_id, type, title, body, related_user_id, href)
         values (
           new.mentor_id,
           'system',
           'Nouvelle demande de mentorat',
           mentee_name || ' aimerait que tu sois son mentor sur « ' || new.topic || ' ».',
           new.mentee_id,
           '/mentors/inbox'
         );
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    -- Notif au mentee si réponse
    if new.status in ('confirmed', 'declined') then
      insert into public.notifications (user_id, type, title, body, related_user_id, href)
           values (
             new.mentee_id,
             'system',
             case when new.status = 'confirmed' then 'Demande de mentorat acceptée 🎓' else 'Demande de mentorat refusée' end,
             'Sujet : ' || new.topic,
             new.mentor_id,
             '/mentors/sessions'
           );
    end if;
    if new.status = 'completed' and old.status <> 'completed' then
      update public.mentor_offers
         set sessions_count = sessions_count + 1
       where user_id = new.mentor_id;
      if new.completed_at is null then new.completed_at := now(); end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mentor_session_notify_ins on public.mentor_sessions;
drop trigger if exists mentor_session_notify_upd on public.mentor_sessions;
create trigger mentor_session_notify_ins
  after insert on public.mentor_sessions
  for each row execute function public.notify_mentor_request();
create trigger mentor_session_notify_upd
  before update on public.mentor_sessions
  for each row execute function public.notify_mentor_request();

-- RLS mentor_offers
alter table public.mentor_offers enable row level security;
drop policy if exists "mentor offers public" on public.mentor_offers;
create policy "mentor offers public" on public.mentor_offers for select using (true);
drop policy if exists "owner writes own offer" on public.mentor_offers;
create policy "owner writes own offer" on public.mentor_offers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RLS mentor_sessions
alter table public.mentor_sessions enable row level security;
drop policy if exists "mentor or mentee can read" on public.mentor_sessions;
create policy "mentor or mentee can read" on public.mentor_sessions for select
  using (mentor_id = auth.uid() or mentee_id = auth.uid());
drop policy if exists "users book mentor sessions" on public.mentor_sessions;
create policy "users book mentor sessions" on public.mentor_sessions for insert
  with check (mentee_id = auth.uid() and mentor_id <> auth.uid());
drop policy if exists "mentor or mentee can update" on public.mentor_sessions;
create policy "mentor or mentee can update" on public.mentor_sessions for update
  using (mentor_id = auth.uid() or mentee_id = auth.uid());

-- =========================================================
-- 3. Skills assessments (quizzes + attempts)
-- =========================================================
create table if not exists public.skill_quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  skill_name text not null,
  title text not null,
  description text,
  pass_score integer not null default 70 check (pass_score between 50 and 100),
  question_count integer not null default 10 check (question_count between 1 and 50),
  duration_min integer not null default 15 check (duration_min between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists skill_quizzes_skill_idx on public.skill_quizzes (skill_name);

create table if not exists public.skill_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.skill_quizzes(id) on delete cascade,
  position_order integer not null,
  prompt text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index >= 0),
  explanation text,
  created_at timestamptz not null default now(),
  unique (quiz_id, position_order)
);

create table if not exists public.skill_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.skill_quizzes(id) on delete cascade,
  score integer not null,
  total integer not null,
  passed boolean not null,
  answers jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);

create index if not exists skill_quiz_attempts_user_idx
  on public.skill_quiz_attempts (user_id, finished_at desc);
create index if not exists skill_quiz_attempts_quiz_idx
  on public.skill_quiz_attempts (quiz_id, finished_at desc);

-- Vue d'agrégation : meilleur score par (user, quiz) → permet d'afficher le badge
create or replace view public.user_skill_badges as
  select a.user_id,
         a.quiz_id,
         q.skill_name,
         q.slug,
         q.title,
         max(a.score) as best_score,
         max(a.total) as total,
         bool_or(a.passed) as passed,
         max(a.finished_at) as last_attempt_at
    from public.skill_quiz_attempts a
    join public.skill_quizzes q on q.id = a.quiz_id
   group by a.user_id, a.quiz_id, q.skill_name, q.slug, q.title;

-- RLS quizzes/questions : lecture publique, pas d'écriture user
alter table public.skill_quizzes enable row level security;
alter table public.skill_quiz_questions enable row level security;
alter table public.skill_quiz_attempts enable row level security;

drop policy if exists "quizzes public" on public.skill_quizzes;
create policy "quizzes public" on public.skill_quizzes for select using (true);
drop policy if exists "questions public" on public.skill_quiz_questions;
create policy "questions public" on public.skill_quiz_questions for select using (true);

drop policy if exists "users see own attempts and others passed" on public.skill_quiz_attempts;
create policy "users see own attempts and others passed"
  on public.skill_quiz_attempts for select
  using (user_id = auth.uid() or passed = true);

drop policy if exists "users insert own attempts" on public.skill_quiz_attempts;
create policy "users insert own attempts"
  on public.skill_quiz_attempts for insert
  with check (user_id = auth.uid());

-- Seed : 3 quizzes francophones par défaut
insert into public.skill_quizzes (slug, skill_name, title, description, pass_score, question_count)
values
  ('javascript-fondamentaux', 'JavaScript', 'JavaScript — Fondamentaux',
   'Variables, types, hoisting, closures, async. 5 questions à choix unique.', 70, 5),
  ('react-bases', 'React', 'React — Bases',
   'Hooks, état, effets, rendu, composants. 5 questions à choix unique.', 70, 5),
  ('postgres-sql', 'SQL / Postgres', 'SQL Postgres — Bases',
   'SELECT, JOIN, indexes, RLS. 5 questions à choix unique.', 70, 5)
on conflict (slug) do nothing;

-- Seed : questions JavaScript
insert into public.skill_quiz_questions (quiz_id, position_order, prompt, options, correct_index, explanation)
select q.id, ord, prompt, options::jsonb, correct_idx, expl
  from public.skill_quizzes q
 cross join (values
    (1, 'Que retourne `typeof null` en JavaScript ?',
     '["null","object","undefined","string"]', 1, '`typeof null` est `"object"` — bug historique conservé.'),
    (2, 'Quelle est la différence entre `let` et `var` ?',
     '["let est globale, var est locale","let est de portée bloc, var est de portée fonction","Aucune","let est plus rapide"]', 1, '`let` respecte la portée bloc, `var` la portée fonction.'),
    (3, 'Que retourne `[1,2,3].map(x => x*2)` ?',
     '["[1,2,3]","[2,4,6]","[1,4,9]","Erreur"]', 1, 'map applique la fonction à chaque élément et retourne un nouveau tableau.'),
    (4, 'À quoi sert `async/await` ?',
     '["Multi-threading","Paralléliser des appels","Écrire du code asynchrone qui se lit comme du synchrone","Améliorer les perfs"]', 2, 'await attend une promesse et permet d''écrire du code asynchrone séquentiellement.'),
    (5, 'Quelle valeur a `0.1 + 0.2 === 0.3` ?',
     '["true","false","NaN","Erreur"]', 1, 'À cause du flottant IEEE 754, le résultat est 0.30000000000000004.')
  ) as t(ord, prompt, options, correct_idx, expl)
 where q.slug = 'javascript-fondamentaux'
on conflict (quiz_id, position_order) do nothing;

-- Seed : questions React
insert into public.skill_quiz_questions (quiz_id, position_order, prompt, options, correct_index, explanation)
select q.id, ord, prompt, options::jsonb, correct_idx, expl
  from public.skill_quizzes q
 cross join (values
    (1, 'Quel hook gère un état local ?',
     '["useEffect","useState","useMemo","useRef"]', 1, 'useState retourne [value, setter].'),
    (2, 'Quand `useEffect` s''exécute-t-il par défaut ?',
     '["Avant le rendu","Après chaque rendu","Une seule fois","Jamais"]', 1, 'Sans tableau de deps, useEffect tourne après chaque rendu.'),
    (3, 'À quoi sert la prop `key` dans une liste ?',
     '["Améliorer le SEO","Identifier chaque élément pour le diff","Tri","Style"]', 1, 'React utilise la key pour optimiser le re-rendu des listes.'),
    (4, 'Que renvoie un composant fonctionnel ?',
     '["HTML","JSX","Une string","Une promesse"]', 1, 'Du JSX, transpilé en React.createElement.'),
    (5, 'Quel hook évite un recalcul coûteux ?',
     '["useState","useMemo","useEffect","useCallback"]', 1, 'useMemo memoize la valeur calculée.')
  ) as t(ord, prompt, options, correct_idx, expl)
 where q.slug = 'react-bases'
on conflict (quiz_id, position_order) do nothing;

-- Seed : questions Postgres
insert into public.skill_quiz_questions (quiz_id, position_order, prompt, options, correct_index, explanation)
select q.id, ord, prompt, options::jsonb, correct_idx, expl
  from public.skill_quizzes q
 cross join (values
    (1, 'Quel JOIN garde toutes les lignes de gauche ?',
     '["INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL JOIN"]', 1, 'LEFT JOIN garde toutes les lignes de la table de gauche, NULL côté droit si pas de match.'),
    (2, 'À quoi sert RLS sur Postgres ?',
     '["Indexer plus vite","Filtrer les lignes selon l''utilisateur","Compresser les données","Backup"]', 1, 'Row Level Security applique des policies par row selon le user authentifié.'),
    (3, 'Quel index est efficace pour les recherches LIKE %x% ?',
     '["B-tree","Hash","GIN avec pg_trgm","BRIN"]', 2, 'GIN + extension pg_trgm permet la recherche fuzzy sur du texte libre.'),
    (4, 'Que fait `EXPLAIN ANALYZE` ?',
     '["Modifie la requête","Affiche le plan + temps réel","Crée un index","Vérifie la syntaxe"]', 1, 'EXPLAIN ANALYZE exécute la requête et retourne le plan + les temps réels.'),
    (5, 'Quelle commande crée une fonction immutable ?',
     '["CREATE FUNCTION ... IMMUTABLE","CREATE PROCEDURE","CREATE TRIGGER","CREATE RULE"]', 0, 'Le mot-clé IMMUTABLE indique que la fonction renvoie le même résultat pour les mêmes inputs.')
  ) as t(ord, prompt, options, correct_idx, expl)
 where q.slug = 'postgres-sql'
on conflict (quiz_id, position_order) do nothing;

-- Update question_count cohérent avec les questions
update public.skill_quizzes q
   set question_count = sub.cnt
  from (
    select quiz_id, count(*)::int as cnt
      from public.skill_quiz_questions group by quiz_id
  ) sub
 where sub.quiz_id = q.id and sub.cnt <> q.question_count;

-- =========================================================
-- 4. Live recruiting (sessions Q&A en direct, chat-based)
-- =========================================================
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  title text not null check (char_length(title) between 5 and 160),
  description text check (description is null or char_length(description) between 1 and 4000),
  scheduled_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min between 10 and 480),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  attendees_count integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create index if not exists live_sessions_scheduled_idx
  on public.live_sessions (scheduled_at desc) where status in ('scheduled', 'live');

create table if not exists public.live_session_attendees (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create or replace function public.bump_live_session_attendees()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.live_sessions set attendees_count = attendees_count + 1 where id = new.session_id;
  elsif tg_op = 'DELETE' then
    update public.live_sessions set attendees_count = greatest(attendees_count - 1, 0) where id = old.session_id;
  end if;
  return null;
end;
$$;
drop trigger if exists live_attendees_count_ins on public.live_session_attendees;
drop trigger if exists live_attendees_count_del on public.live_session_attendees;
create trigger live_attendees_count_ins after insert on public.live_session_attendees
  for each row execute function public.bump_live_session_attendees();
create trigger live_attendees_count_del after delete on public.live_session_attendees
  for each row execute function public.bump_live_session_attendees();

-- Messages live (chat-based Q&A)
create table if not exists public.live_session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  is_question boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists live_session_messages_idx
  on public.live_session_messages (session_id, created_at);

alter table public.live_sessions enable row level security;
alter table public.live_session_attendees enable row level security;
alter table public.live_session_messages enable row level security;

drop policy if exists "live sessions public" on public.live_sessions;
create policy "live sessions public" on public.live_sessions for select using (true);
drop policy if exists "host writes session" on public.live_sessions;
create policy "host writes session" on public.live_sessions for all
  using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists "attendees self-read" on public.live_session_attendees;
create policy "attendees self-read" on public.live_session_attendees for select using (true);
drop policy if exists "users join sessions" on public.live_session_attendees;
create policy "users join sessions" on public.live_session_attendees for insert
  with check (user_id = auth.uid());
drop policy if exists "users leave sessions" on public.live_session_attendees;
create policy "users leave sessions" on public.live_session_attendees for delete
  using (user_id = auth.uid());

drop policy if exists "live messages public" on public.live_session_messages;
create policy "live messages public" on public.live_session_messages for select using (true);
drop policy if exists "attendees post messages" on public.live_session_messages;
create policy "attendees post messages" on public.live_session_messages for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.live_session_attendees a
       where a.session_id = live_session_messages.session_id and a.user_id = auth.uid()
    )
  );

-- =========================================================
-- 5. Realtime
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'pro_connections', 'mentor_offers', 'mentor_sessions',
    'skill_quiz_attempts', 'live_sessions', 'live_session_attendees',
    'live_session_messages'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
