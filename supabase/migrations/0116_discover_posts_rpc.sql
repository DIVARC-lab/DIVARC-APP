-- Chantier Feed 5.1 — RPC discover_posts : découverte explicable.
--
-- Retourne des posts à découvrir avec des raisons EXPLICITES (jamais opaques).
-- Chaque post est accompagné d'un `reason_type` codifié + `reason_data` JSON
-- contenant les chiffres précis (X amis ont réagi, Y discussions...).
--
-- Formules visibles, documentées sur /about/feed-algorithm.
--
-- Strategie de mixage : on prend des candidats de 3 sources distinctes,
-- on déduplique par post_id et on limite. Ordre par score décroissant
-- (chaque source produit ses propres scores normalisés).
--
-- IDEMPOTENT.

create or replace function public.discover_posts(
  p_user_id uuid default null,
  p_limit int default 30
)
returns table (
  post_id uuid,
  score numeric,
  reason_type text,
  reason_data jsonb
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_limit int := least(greatest(p_limit, 1), 60);
begin
  return query
  with
  /* Visible posts (public uniquement pour la découverte). */
  visible as (
    select p.id, p.author_id, p.created_at, p.total_reactions
      from public.posts p
     where p.deleted_at is null
       and p.status = 'published'
       and p.visibility = 'public'
       and (p.thread_position is null or p.thread_position = 0)
       and p.created_at > now() - interval '14 days'
       and (v_user is null or p.author_id <> v_user)
  ),

  /* ===========================================================
   * Source 1 : TRENDING_DIVERSE
   *   Posts < 7j avec ≥ 3 commenteurs distincts ET ≥ 3 réacteurs distincts.
   *   On valorise la DIVERSITÉ des participants — pas le volume brut.
   * =========================================================== */
  trending_diverse as (
    select
      v.id as post_id,
      (
        (select count(distinct c.author_id)
           from public.post_comments c
          where c.post_id = v.id and c.deleted_at is null) * 0.6
        + (select count(distinct r.user_id)
             from public.post_reactions r
            where r.post_id = v.id) * 0.4
      )::numeric as score,
      'trending_diverse'::text as reason_type,
      jsonb_build_object(
        'commenters', (
          select count(distinct c.author_id)
            from public.post_comments c
           where c.post_id = v.id and c.deleted_at is null
        ),
        'reactors', (
          select count(distinct r.user_id)
            from public.post_reactions r
           where r.post_id = v.id
        )
      ) as reason_data
    from visible v
    where v.created_at > now() - interval '7 days'
      and (select count(distinct c.author_id)
             from public.post_comments c
            where c.post_id = v.id and c.deleted_at is null) >= 3
      and (select count(distinct r.user_id)
             from public.post_reactions r
            where r.post_id = v.id) >= 3
  ),

  /* ===========================================================
   * Source 2 : FRIEND_ECHO
   *   Posts où ≥ 2 amis (friendships acceptées) de v_user ont réagi.
   *   Raison : "X de tes amis ont réagi".
   *   On ne tient PAS compte des likes opaques : que les réactions explicites.
   * =========================================================== */
  friend_echo as (
    select
      v.id as post_id,
      friend_count::numeric * 2.0 as score,
      'friend_echo'::text as reason_type,
      jsonb_build_object('friend_reactors', friend_count) as reason_data
    from visible v
    join lateral (
      select count(distinct r.user_id) as friend_count
        from public.post_reactions r
       where r.post_id = v.id
         and r.user_id <> v.author_id
         and v_user is not null
         and exists (
           select 1 from public.friendships f
            where f.status = 'accepted'
              and (
                (f.requester_id = v_user and f.recipient_id = r.user_id)
                or (f.recipient_id = v_user and f.requester_id = r.user_id)
              )
         )
    ) fc on true
    where friend_count >= 2
  ),

  /* ===========================================================
   * Source 3 : RISING_VOICE
   *   Auteurs < 50 amis acceptés, posts < 5j, ≥ 2 réactions par d'autres.
   *   Donne de la visibilité aux petits comptes qui résonnent.
   * =========================================================== */
  rising_voice as (
    select
      v.id as post_id,
      extract(epoch from v.created_at)::numeric / 1e6 as score,
      'rising_voice'::text as reason_type,
      jsonb_build_object(
        'author_friends', (
          select count(*) from public.friendships f
           where f.status = 'accepted'
             and (f.requester_id = v.author_id or f.recipient_id = v.author_id)
        ),
        'external_reactions', (
          select count(distinct r.user_id)
            from public.post_reactions r
           where r.post_id = v.id and r.user_id <> v.author_id
        )
      ) as reason_data
    from visible v
    where v.created_at > now() - interval '5 days'
      and (
        select count(*) from public.friendships f
         where f.status = 'accepted'
           and (f.requester_id = v.author_id or f.recipient_id = v.author_id)
      ) < 50
      and (
        select count(distinct r.user_id)
          from public.post_reactions r
         where r.post_id = v.id and r.user_id <> v.author_id
      ) >= 2
  ),

  /* Mix : on prend toutes les sources, on déduplique par post_id en gardant
   * la raison avec le score le plus élevé. */
  mixed as (
    select * from trending_diverse
    union all
    select * from friend_echo
    union all
    select * from rising_voice
  ),
  deduped as (
    select distinct on (post_id)
      post_id, score, reason_type, reason_data
    from mixed
    order by post_id, score desc nulls last
  )

  select d.post_id, d.score, d.reason_type, d.reason_data
    from deduped d
    /* Anti-spam : pas plus de 2 posts du même auteur. */
    where (
      select count(*) from deduped d2
        join public.posts p2 on p2.id = d2.post_id
        join public.posts p1 on p1.id = d.post_id
       where p2.author_id = p1.author_id
         and d2.score >= d.score
    ) <= 2
   order by d.score desc nulls last
   limit v_limit;
end;
$$;

grant execute on function public.discover_posts(uuid, int) to authenticated, anon;

comment on function public.discover_posts(uuid, int) is
  'Découverte explicable : 3 sources (trending_diverse, friend_echo, rising_voice) mixées avec raisons codifiées. Aucune ML. Cf. /about/feed-algorithm.';
