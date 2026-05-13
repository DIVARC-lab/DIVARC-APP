-- Chantier Feed 3.1 — RPC feed_v2 : 4 modes transparents en SQL pur.
--
-- Remplace progressivement le ranker JS opaque par 4 modes documentés sur
-- /about/feed-algorithm. Chaque mode est une CTE lisible, sans ML, sans boîte
-- noire. Toutes les pondérations sont visibles ici et auditables.
--
-- Modes :
--   - 'fresh'         : created_at desc + petit boost réactions (demi-vie 36h)
--   - 'conversations' : score basé sur unique_repliers + reactions_distinct
--   - 'rising_voices' : auteurs < 50 amis acceptés, posts < 72h, ≥ 1 réaction
--                       d'un autre user — anti-monopole des gros comptes
--   - 'inner_circle'  : auteurs amis OU avec qui j'ai échangé un message
--                       les 30 derniers jours
--   - 'raw'           : created_at desc strict, AUCUN filtrage (mode brut)
--
-- Visibilité : on respecte posts.visibility :
--   - 'public'   visible par tout authentifié
--   - 'friends'  visible par les amis acceptés de l'auteur
--   - 'private'  visible uniquement par l'auteur
--
-- IDEMPOTENT.

create or replace function public.feed_v2(
  p_mode text default 'fresh',
  p_user_id uuid default null,
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  post_id uuid,
  score numeric,
  reason text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_limit int := least(greatest(p_limit, 1), 100);
  v_offset int := greatest(p_offset, 0);
begin
  if p_mode not in ('fresh', 'conversations', 'rising_voices', 'inner_circle', 'raw') then
    raise exception 'invalid feed mode: %', p_mode using errcode = '22023';
  end if;

  /* CTE commune : posts visibles par v_user (respecte visibility). */
  return query
  with visible_posts as (
    select p.id, p.author_id, p.created_at, p.total_reactions
      from public.posts p
     where p.deleted_at is null
       and p.status = 'published'
       /* Pas les replies de thread — seuls les roots/standalone remontent. */
       and (p.thread_position is null or p.thread_position = 0)
       and (
         p.visibility = 'public'
         or (
           p.visibility = 'friends'
           and v_user is not null
           and (
             p.author_id = v_user
             or exists (
               select 1 from public.friendships f
                where f.status = 'accepted'
                  and (
                    (f.requester_id = v_user and f.recipient_id = p.author_id)
                    or (f.recipient_id = v_user and f.requester_id = p.author_id)
                  )
             )
           )
         )
         or (p.visibility = 'private' and p.author_id = v_user)
       )
  )

  /* === MODE FRESH (default) ============================================
   * Score = recency × boost_reactions, avec demi-vie 36h.
   * boost = 1 + log(1 + total_reactions) / 4 — plafond doux pour éviter
   *         que les viraux écrasent tout. */
  select
    vp.id as post_id,
    case
      when p_mode = 'fresh' then
        (1.0 + ln(1.0 + vp.total_reactions) / 4.0)
        * exp(
            ln(0.5)
            * extract(epoch from (now() - vp.created_at)) / (36.0 * 3600.0)
          )

      /* === MODE CONVERSATIONS ===========================================
       * Score = unique_repliers × 0.55 + reactions_distinct × 0.30 + recency × 0.15
       * unique_repliers : comptes distincts qui ont commenté.
       * reactions_distinct : nb d'users distincts ayant réagi. */
      when p_mode = 'conversations' then
        coalesce((
          select count(distinct c.author_id)
            from public.post_comments c
           where c.post_id = vp.id and c.deleted_at is null
        ), 0) * 0.55
        + coalesce((
          select count(distinct r.user_id)
            from public.post_reactions r
           where r.post_id = vp.id
        ), 0) * 0.30
        + exp(
            ln(0.5)
            * extract(epoch from (now() - vp.created_at)) / (48.0 * 3600.0)
          ) * 0.15

      /* === MODE RISING_VOICES ===========================================
       * Filtre dur :
       *   - auteur a < 50 amitiés acceptées
       *   - post créé < 72h
       *   - post a ≥ 1 réaction d'un user autre que l'auteur
       * Score : recency desc — on ne sur-pondère pas, c'est le filtre qui curate.
       */
      when p_mode = 'rising_voices' then
        case
          when (
            (select count(*) from public.friendships f
              where f.status = 'accepted'
                and (f.requester_id = vp.author_id or f.recipient_id = vp.author_id)
            ) < 50
            and vp.created_at > now() - interval '72 hours'
            and exists (
              select 1 from public.post_reactions r
               where r.post_id = vp.id and r.user_id <> vp.author_id
            )
          )
          then extract(epoch from vp.created_at)::numeric
          else null
        end

      /* === MODE INNER_CIRCLE ============================================
       * Filtre dur :
       *   - auteur ami accepté OU
       *   - auteur avec qui j'ai échangé un message les 30 derniers jours
       * Score : recency desc. */
      when p_mode = 'inner_circle' then
        case
          when v_user is not null and (
            exists (
              select 1 from public.friendships f
               where f.status = 'accepted'
                 and (
                   (f.requester_id = v_user and f.recipient_id = vp.author_id)
                   or (f.recipient_id = v_user and f.requester_id = vp.author_id)
                 )
            )
            or exists (
              select 1
                from public.messages m
                join public.conversation_members me
                  on me.conversation_id = m.conversation_id and me.user_id = v_user
                join public.conversation_members them
                  on them.conversation_id = m.conversation_id and them.user_id = vp.author_id
               where m.created_at > now() - interval '30 days'
                 and m.deleted_at is null
            )
          )
          then extract(epoch from vp.created_at)::numeric
          else null
        end

      /* === MODE RAW =====================================================
       * Aucun filtrage, aucun boost. created_at strict. Mode "panic button"
       * pour quiconque doute des autres modes. */
      when p_mode = 'raw' then
        extract(epoch from vp.created_at)::numeric

      else null
    end as score,

    /* reason : courte explication affichée dans l'UI à côté du post. */
    case
      when p_mode = 'fresh' and vp.total_reactions >= 3
        then 'frais · réactions soutenues'
      when p_mode = 'fresh'
        then 'récent'
      when p_mode = 'conversations'
        then 'conversation active'
      when p_mode = 'rising_voices'
        then 'voix émergente'
      when p_mode = 'inner_circle'
        then 'cercle proche'
      when p_mode = 'raw'
        then 'brut · ordre chronologique'
      else null
    end as reason

  from visible_posts vp
  where (
    p_mode in ('fresh', 'conversations', 'raw')
    or (p_mode = 'rising_voices' and (
      (select count(*) from public.friendships f
        where f.status = 'accepted'
          and (f.requester_id = vp.author_id or f.recipient_id = vp.author_id)
      ) < 50
      and vp.created_at > now() - interval '72 hours'
      and exists (
        select 1 from public.post_reactions r
         where r.post_id = vp.id and r.user_id <> vp.author_id
      )
    ))
    or (p_mode = 'inner_circle' and v_user is not null and (
      exists (
        select 1 from public.friendships f
         where f.status = 'accepted'
           and (
             (f.requester_id = v_user and f.recipient_id = vp.author_id)
             or (f.recipient_id = v_user and f.requester_id = vp.author_id)
           )
      )
      or exists (
        select 1
          from public.messages m
          join public.conversation_members me
            on me.conversation_id = m.conversation_id and me.user_id = v_user
          join public.conversation_members them
            on them.conversation_id = m.conversation_id and them.user_id = vp.author_id
         where m.created_at > now() - interval '30 days'
           and m.deleted_at is null
      )
    ))
  )
  order by score desc nulls last, vp.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

grant execute on function public.feed_v2(text, uuid, int, int) to authenticated, anon;

comment on function public.feed_v2(text, uuid, int, int) is
  'Feed v2 transparent — 4 modes documentés (fresh/conversations/rising_voices/inner_circle) + raw. Aucune ML, formules visibles dans la fonction. Cf. /about/feed-algorithm.';
