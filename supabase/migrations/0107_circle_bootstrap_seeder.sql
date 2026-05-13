-- Chantier 5.7 — Seeder bootstrap : 20 cercles de qualité préchargés.
--
-- Résout le cold-start au lancement : sans cercles initiaux, /circles
-- est vide → personne ne s'inscrit, etc. (cercle vicieux). Pour casser
-- ça on précharge 20 cercles avec des descriptions soignées, sur des
-- niches DIVARC alignées.
--
-- Stratégie :
--   - Migration crée la fonction `seed_bootstrap_circles(p_owner_id uuid)`
--   - L'admin l'appelle UNE FOIS avec son propre user_id :
--       select public.seed_bootstrap_circles(auth.uid());
--   - Idempotent : skip les slugs déjà existants
--   - Chaque cercle créé est marqué visibility='public', type='open'
--   - L'admin devient owner — il peut transférer plus tard à un modo
--     volontaire qui anime
--
-- Aligné sur les 20 cercles validés par l'équipe DIVARC pour la cible
-- francophone (entrepreneurs, parents, créateurs, communautés locales,
-- entraide, métiers).
--
-- IDEMPOTENT.

create or replace function public.seed_bootstrap_circles(p_owner_id uuid)
returns table (slug text, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  seeds jsonb := jsonb_build_array(
    /* TECH */
    jsonb_build_object(
      'slug', 'tech-entrepreneurs-paris',
      'name', 'Tech entrepreneurs Paris',
      'tagline', 'Entrepreneurs tech parisiens qui partagent leurs leçons, opportunités et matériel.',
      'description', 'Communauté d''entrepreneurs tech basés à Paris. On partage les vraies leçons (les échecs aussi), les opportunités, et le matériel qu''on ne veut plus.\n\nCe cercle est pour toi si tu construis un produit tech, que tu cherches des cofondateurs, ou que tu veux simplement échanger sans bullshit avec des gens qui font les mêmes erreurs que toi.',
      'primary_category', 'tech',
      'tags', array['startup', 'saas', 'fintech', 'paris'],
      'emoji', '💻',
      'color', 'navy',
      'is_local', true,
      'location_city', 'Paris',
      'location_country', 'FR',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    jsonb_build_object(
      'slug', 'tech-entrepreneurs-francophones',
      'name', 'Tech entrepreneurs francophones',
      'tagline', 'Le cercle pour entrepreneurs tech francophones, Paris/Lyon/Bordeaux/Bruxelles/Montréal.',
      'description', 'Communauté tech francophone, indépendante de la géographie. On parle SaaS, AI, fintech, climate tech.\n\nLa langue, c''est le français — pour partager sans la barrière linguistique des forums anglo-saxons.',
      'primary_category', 'tech',
      'tags', array['startup', 'saas', 'ai', 'francophone'],
      'emoji', '🚀',
      'color', 'gold',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    jsonb_build_object(
      'slug', 'devs-nextjs-france',
      'name', 'Devs Next.js France',
      'tagline', 'Le cercle des développeurs Next.js francophones.',
      'description', 'Cercle technique pour les devs qui font tourner Next.js en production. App Router, Server Actions, RSC, edge runtime, hosting…\n\nOn partage les pièges, les patterns qui marchent, les benchmarks. Niveau intermédiaire à avancé.',
      'primary_category', 'tech',
      'tags', array['nextjs', 'react', 'typescript', 'vercel'],
      'emoji', '⚡',
      'color', 'violet',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* BUSINESS */
    jsonb_build_object(
      'slug', 'auto-entrepreneurs-france',
      'name', 'Auto-entrepreneurs France',
      'tagline', 'Pour les indépendants en micro-entreprise. Pratiques, juridique, fiscalité, clients.',
      'description', 'On est tous freelances, consultants, artisans ou prestataires en micro-entreprise. Ce cercle, c''est pour les vraies questions du quotidien : comment facturer, gérer les charges, les premiers clients, l''Urssaf, les avances de trésorerie.\n\nPas de gourous, juste des indépendants qui s''entraident.',
      'primary_category', 'business',
      'tags', array['freelance', 'microentreprise', 'urssaf', 'comptabilite'],
      'emoji', '💼',
      'color', 'emerald',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    jsonb_build_object(
      'slug', 'mompreneurs-paris',
      'name', 'Mompreneurs Paris',
      'tagline', 'Mamans entrepreneurs parisiennes. On concilie business + famille sans s''excuser.',
      'description', 'Cercle de mamans qui entreprennent à Paris. On parle business model, équilibre vie pro / vie de famille, garde, télétravail, réseaux d''aide.\n\nPas de jugement, juste du soutien et des conseils concrets.',
      'primary_category', 'business',
      'tags', array['femmes', 'entrepreneuriat', 'famille', 'paris'],
      'emoji', '🌸',
      'color', 'rose',
      'is_local', true,
      'location_city', 'Paris',
      'location_country', 'FR',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    jsonb_build_object(
      'slug', 'investisseurs-immobiliers-locatifs',
      'name', 'Investisseurs immobiliers locatifs',
      'tagline', 'Pour les investisseurs locatifs : LMNP, déficit foncier, SCI, fiscalité.',
      'description', 'Cercle dédié à l''investissement locatif en France. LMNP, déficit foncier, SCI, fiscalité, choix entre meublé et nu, gestion locative directe vs agence, primes énergétiques.\n\nÉchange entre investisseurs sans le marketing des coachs payants.',
      'primary_category', 'business',
      'tags', array['immobilier', 'lmnp', 'sci', 'fiscalite'],
      'emoji', '🏠',
      'color', 'gold',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    /* SUPPORT - sensible */
    jsonb_build_object(
      'slug', 'aidants-familiaux-france',
      'name', 'Aidants familiaux France',
      'tagline', 'Pour celles et ceux qui aident un proche au quotidien. Tu n''es pas seul·e.',
      'description', 'Cercle d''entraide pour les aidants familiaux : enfants qui prennent soin d''un parent, parents d''enfants malades, conjoint·e·s d''une personne dépendante.\n\nUn espace sans jugement pour partager les difficultés, les ressources (APA, aide à domicile, répit), les coups de mou. La modération est attentive et bienveillante.',
      'primary_category', 'support',
      'tags', array['aidants', 'dependance', 'maladie', 'entraide'],
      'emoji', '🤝',
      'color', 'cream',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', false,
        'library', true, 'events', true, 'polls', false,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* IDENTITY */
    jsonb_build_object(
      'slug', 'diaspora-francophone-afrique',
      'name', 'Diaspora francophone d''Afrique',
      'tagline', 'La diaspora africaine francophone : connexions, retours au pays, business inter-continents.',
      'description', 'Cercle pour la diaspora francophone d''Afrique (Sénégal, Côte d''Ivoire, Cameroun, RDC, Maroc, Tunisie...). On parle retour au pays, business avec le continent, transferts, projets impact.\n\nUn espace pour celles et ceux qui vivent entre plusieurs cultures.',
      'primary_category', 'identity',
      'tags', array['afrique', 'diaspora', 'retour', 'business'],
      'emoji', '🌍',
      'color', 'gold',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* CULTURE */
    jsonb_build_object(
      'slug', 'romantasy-francaise',
      'name', 'Romantasy française - lectrices & auteurs',
      'tagline', 'Pour les passionné·e·s de romance + fantasy en français.',
      'description', 'Cercle pour celles et ceux qui dévorent les romance fantasy (Quatrième Aile, Court of Thorns and Roses, La Passe-Miroir...). On échange lectures, on discute des auteurs francophones émergents, on participe aux booktours.\n\nAuteurs : on autorise les mentions de tes oeuvres SI tu participes vraiment au cercle (pas de spam).',
      'primary_category', 'culture',
      'tags', array['romantasy', 'fantasy', 'romance', 'lecture'],
      'emoji', '🐉',
      'color', 'rose',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    jsonb_build_object(
      'slug', 'photographes-amateurs-fr',
      'name', 'Photographes amateurs FR',
      'tagline', 'Photographes en herbe ou confirmés : critiques bienveillantes, matos, sorties.',
      'description', 'Cercle photo francophone. On poste des photos pour avoir des retours constructifs, on parle matériel (vendu / cherché), on organise des sorties photo.\n\nTous niveaux acceptés, du smartphone au plein format.',
      'primary_category', 'culture',
      'tags', array['photo', 'photographie', 'reflex', 'sortie'],
      'emoji', '📷',
      'color', 'navy',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', true, 'mentorship', false
      )
    ),
    /* CREATORS */
    jsonb_build_object(
      'slug', 'createurs-contenu-independants',
      'name', 'Créateurs de contenu indépendants',
      'tagline', 'YouTubeurs, podcasters, streamers, newsletters indépendants. Sans algo, sans agence.',
      'description', 'Cercle pour celles et ceux qui créent du contenu en indépendant. YouTube, podcast, newsletter, streaming, Substack.\n\nOn parle monétisation directe (pas d''algorithmes), construction d''audience, outils, sponsoring éthique, fiscalité.',
      'primary_category', 'creators',
      'tags', array['youtube', 'podcast', 'newsletter', 'monetization'],
      'emoji', '🎙️',
      'color', 'violet',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* PRO COMMUNITIES */
    jsonb_build_object(
      'slug', 'pro-nettoyage-services-domicile',
      'name', 'Pro du nettoyage et services à domicile',
      'tagline', 'Pour les pros (CESU, indépendants, sociétés) du nettoyage et services à la personne.',
      'description', 'Cercle dédié aux professionnels du nettoyage et services à domicile. Indépendant·e·s, CESU, micro-sociétés.\n\nOn parle tarifs, devis, gestion clients difficiles, équipement pro, formations RNCP, prévention TMS.',
      'primary_category', 'pro_communities',
      'tags', array['nettoyage', 'services', 'cesu', 'pro'],
      'emoji', '🧽',
      'color', 'emerald',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', true,
        'library', true, 'events', false, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    jsonb_build_object(
      'slug', 'metiers-soin-aide-personne',
      'name', 'Métiers du soin et de l''aide à la personne',
      'tagline', 'AS, AVS, auxiliaires, infirmières en libéral. Entraide professionnelle.',
      'description', 'Cercle pour les pros du soin et de l''aide à la personne. AS (Aide-Soignant·e), AVS, auxiliaires de vie, infirmier·e·s libéraux.\n\nOn parle conditions de travail, droits, tournées, prévention, transitions de carrière.',
      'primary_category', 'pro_communities',
      'tags', array['sante', 'aide-soignant', 'avs', 'infirmiere'],
      'emoji', '💚',
      'color', 'emerald',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* PARENTING */
    jsonb_build_object(
      'slug', 'parents-zen-education-positive',
      'name', 'Parents zen - éducation positive',
      'tagline', 'Pour les parents qui veulent appliquer l''éducation positive sans culpabilité.',
      'description', 'Cercle de parents qui explorent l''éducation positive / bienveillante / Faber & Mazlish / TEACCH / etc.\n\nOn partage les vraies questions du quotidien : crises, sommeil, école, écrans. Bienveillance entre parents avant tout — y compris pour celles et ceux qui n''y arrivent pas tous les jours.',
      'primary_category', 'parenting',
      'tags', array['education-positive', 'parents', 'bienveillance', 'enfants'],
      'emoji', '🌱',
      'color', 'emerald',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    /* LIFESTYLE / HOBBIES */
    jsonb_build_object(
      'slug', 'cuisiniers-du-dimanche',
      'name', 'Cuisinier·e·s du dimanche',
      'tagline', 'Pour celles et ceux qui font cuire la passion. Recettes, ratés, photos de plats.',
      'description', 'Cercle de cuisiniers amateurs. On poste les plats du week-end (ratés inclus), on demande des recettes, on partage les pépites de saison.\n\nPas de chef étoilé en posture : juste des gens qui aiment cuisiner.',
      'primary_category', 'lifestyle',
      'tags', array['cuisine', 'recettes', 'patisserie', 'gastronomie'],
      'emoji', '🍳',
      'color', 'gold',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', true, 'mentorship', false
      )
    ),
    /* EDUCATION */
    jsonb_build_object(
      'slug', 'etudiants-ecole-ingenieur',
      'name', 'Étudiants en école d''ingénieur',
      'tagline', 'Pour les élèves-ingénieurs : cours, projets, stages, vie étudiante.',
      'description', 'Cercle pour les étudiant·e·s en écoles d''ingénieurs (Centrale, X, INSA, Mines, Télécom, ENSEEIHT, EPFL...). Cours, projets, stages, alternance, vie étudiante.\n\nLes ancien·ne·s sont bienvenu·e·s pour partager des retours d''expérience.',
      'primary_category', 'education',
      'tags', array['ingenieur', 'etudiant', 'stage', 'alternance'],
      'emoji', '🎓',
      'color', 'navy',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* MENTORSHIP / TECH */
    jsonb_build_object(
      'slug', 'mentors-freelance-juniors-tech',
      'name', 'Mentors freelance / juniors tech',
      'tagline', 'Mentors expérimentés et juniors freelance : matching pour pairer 1-1 ou en groupe.',
      'description', 'Cercle qui connecte mentors freelance expérimentés (10+ ans tech) avec des juniors qui veulent passer indépendant.\n\nOn pair en 1-1 ou en petits groupes pour faire grandir la prochaine génération de freelances tech.',
      'primary_category', 'tech',
      'tags', array['mentorat', 'freelance', 'tech', 'junior'],
      'emoji', '🧭',
      'color', 'violet',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', true,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* LGBTQ - sensible */
    jsonb_build_object(
      'slug', 'lgbtq-paris',
      'name', 'LGBTQ+ Paris',
      'tagline', 'Espace safe pour la communauté LGBTQ+ parisienne. Entraide, événements, ressources.',
      'description', 'Cercle parisien pour la communauté LGBTQ+. Entraide quotidienne, sorties, événements (Pride, soirées, manifestations), ressources juridiques et santé.\n\nModération zéro tolérance sur la transphobie, l''homophobie, le validisme et toute forme de discrimination.',
      'primary_category', 'lgbtq',
      'tags', array['lgbtq', 'paris', 'inclusion', 'safe-space'],
      'emoji', '🏳️‍🌈',
      'color', 'rose',
      'is_local', true,
      'location_city', 'Paris',
      'location_country', 'FR',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', true
      )
    ),
    /* SPIRITUALITY - sensible */
    jsonb_build_object(
      'slug', 'yoga-meditation-paris',
      'name', 'Yoga & méditation Paris',
      'tagline', 'Yogis et méditants parisiens. Pratiques quotidiennes, cours, retraites, bonnes adresses.',
      'description', 'Cercle de yogis et de méditant·e·s à Paris. On partage pratiques quotidiennes, cours et profs recommandés, retraites accessibles.\n\nApproche pluraliste : tous les courants sont bienvenus (Iyengar, Ashtanga, Vinyasa, Hatha, Yin, méditation bouddhiste, MBSR...). Pas de prosélytisme.',
      'primary_category', 'spirituality',
      'tags', array['yoga', 'meditation', 'paris', 'bien-etre'],
      'emoji', '🧘',
      'color', 'violet',
      'is_local', true,
      'location_city', 'Paris',
      'location_country', 'FR',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', true, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', false, 'mentorship', false
      )
    ),
    /* ACTIVISM - sensible */
    jsonb_build_object(
      'slug', 'engagement-ecologie-locale-fr',
      'name', 'Engagement écologie locale FR',
      'tagline', 'Pour celles et ceux qui agissent localement pour l''écologie en France.',
      'description', 'Cercle pour celles et ceux qui s''engagent concrètement pour l''écologie au niveau local : associations, conseils de quartier, ZAC, replantation, économie circulaire, mobilités douces.\n\nFocus sur l''action concrète plutôt que les débats abstraits. Modération anti-désinformation.',
      'primary_category', 'activism',
      'tags', array['ecologie', 'climat', 'local', 'engagement'],
      'emoji', '🌿',
      'color', 'emerald',
      'modules', jsonb_build_object(
        'social_feed', true, 'marketplace', false, 'jobs', false,
        'library', true, 'events', true, 'polls', true,
        'wiki', false, 'live_audio', false, 'challenges', true, 'mentorship', false
      )
    )
  );
  v_seed jsonb;
  v_circle_id uuid;
  v_existing uuid;
begin
  if p_owner_id is null then
    raise exception 'owner_id requis pour seed_bootstrap_circles';
  end if;

  for v_seed in select * from jsonb_array_elements(seeds)
  loop
    /* Skip si slug déjà existant (idempotent). */
    select id into v_existing
      from public.circles
     where slug = (v_seed ->> 'slug')
     limit 1;
    if v_existing is not null then
      slug := v_seed ->> 'slug';
      created := false;
      return next;
      continue;
    end if;

    /* Insert. */
    insert into public.circles (
      slug, name, tagline, description, emoji, color,
      primary_category, tags, language,
      is_local, location_city, location_country,
      modules,
      type, join_policy, visibility,
      owner_id,
      welcome_message
    ) values (
      v_seed ->> 'slug',
      v_seed ->> 'name',
      v_seed ->> 'tagline',
      v_seed ->> 'description',
      v_seed ->> 'emoji',
      v_seed ->> 'color',
      v_seed ->> 'primary_category',
      coalesce(
        array(select jsonb_array_elements_text(v_seed -> 'tags')),
        '{}'::text[]
      ),
      'fr',
      coalesce((v_seed ->> 'is_local')::boolean, false),
      v_seed ->> 'location_city',
      v_seed ->> 'location_country',
      coalesce(v_seed -> 'modules', '{}'::jsonb),
      'open',
      'instant',
      'public',
      p_owner_id,
      'Bienvenue ! Présente-toi en un post — d''où tu viens, ce qui t''amène ici. La bienveillance d''abord, le débat ensuite.'
    )
    returning id into v_circle_id;

    /* Insert owner dans circle_members. */
    insert into public.circle_members (
      circle_id, user_id, role, status
    ) values (
      v_circle_id, p_owner_id, 'owner', 'active'
    )
    on conflict do nothing;

    slug := v_seed ->> 'slug';
    created := true;
    return next;
  end loop;
end;
$$;

revoke all on function public.seed_bootstrap_circles(uuid) from public;
grant execute on function public.seed_bootstrap_circles(uuid)
  to authenticated, service_role;

comment on function public.seed_bootstrap_circles(uuid) is
  '20 cercles de qualité préchargés pour le cold-start (Chantier 5.7). Appel admin : select seed_bootstrap_circles(auth.uid()). Idempotent.';
