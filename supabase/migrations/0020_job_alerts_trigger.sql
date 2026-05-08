-- =====================================================
-- DIVARC — Migration 0020 : Alertes emploi (notifications)
--   Trigger : à chaque nouveau job actif, scanne les saved_searches
--   actives et insère une notification pour chaque match.
-- =====================================================

create or replace function public.notify_matching_saved_searches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  search_row record;
  short_title text;
begin
  -- Skip si l'offre est draft / closed / archived (on ne notifie que sur active)
  if new.status <> 'active' then
    return new;
  end if;

  short_title := substring(new.title from 1 for 80);

  for search_row in
    select s.id, s.user_id, s.label, s.query, s.category, s.job_type,
           s.work_mode, s.experience_level, s.location
      from public.job_saved_searches s
     where s.alerts_enabled = true
       and s.user_id <> new.poster_id
       and (s.category is null or s.category = new.category)
       and (s.job_type is null or s.job_type = new.job_type)
       and (s.work_mode is null or s.work_mode = new.work_mode)
       and (s.experience_level is null or s.experience_level = new.experience_level)
       and (
         s.location is null
         or new.location is null
         or new.location ilike '%' || s.location || '%'
       )
       and (
         s.query is null
         or new.title ilike '%' || s.query || '%'
         or new.description ilike '%' || s.query || '%'
         or coalesce(new.company_name, '') ilike '%' || s.query || '%'
       )
  loop
    insert into public.notifications (
      user_id, type, title, body, href
    ) values (
      search_row.user_id,
      'system',
      'Nouvelle offre — alerte « ' || search_row.label || ' »',
      short_title || coalesce(' chez ' || new.company_name, ''),
      '/jobs/' || new.id::text
    );

    update public.job_saved_searches
       set last_notified_at = now()
     where id = search_row.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_matching_saved_searches_trg on public.jobs;
create trigger notify_matching_saved_searches_trg
  after insert on public.jobs
  for each row execute function public.notify_matching_saved_searches();
