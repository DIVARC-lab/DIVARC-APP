-- Chantier Cercles v3 — Chat de groupe temps réel
-- ================================================
--
-- Brique manquante critique : un canal de discussion persistent dans
-- chaque cercle, séparé du feed (posts) et asynchrone (mais Realtime).
--
-- Différences vs messages directs (table `messages`) :
--  - Pas de 1-1, scope = cercle entier (tous les membres lisent)
--  - Pas de E2E (le contenu est partagé, mod accessible)
--  - Threads V1 simples (parent_message_id → 1 niveau)
--  - Réactions emoji par message
--  - Mentions @username avec notif
--
-- RLS : SELECT membres actifs du cercle | INSERT membres actifs |
--       UPDATE own + edited_at | soft delete via deleted_at.

BEGIN;

-- ============================================================
-- 1. Table principale : circle_chat_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  /* Threads V1 : parent_message_id pointe vers le message racine.
     Pas de récursion (1 niveau max — toutes les replies pointent
     vers le même parent_message_id). */
  parent_message_id UUID REFERENCES public.circle_chat_messages(id)
    ON DELETE CASCADE,
  /* Attachments (images, fichiers, links). V1 = stub, à enrichir
     avec un upload pipeline plus tard. */
  attachments JSONB,
  /* Mentions extraites au moment du send pour faciliter les notifs.
     Array de user_id. */
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS circle_chat_messages_circle_created_idx
  ON public.circle_chat_messages (circle_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS circle_chat_messages_thread_idx
  ON public.circle_chat_messages (parent_message_id, created_at ASC)
  WHERE deleted_at IS NULL AND parent_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS circle_chat_messages_author_idx
  ON public.circle_chat_messages (author_id);

-- ============================================================
-- 2. Réactions emoji par message
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_chat_reactions (
  message_id UUID NOT NULL REFERENCES public.circle_chat_messages(id)
    ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS circle_chat_reactions_message_idx
  ON public.circle_chat_reactions (message_id);

-- ============================================================
-- 3. Lecture (last_read pour badges unread par membre)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_chat_reads (
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.circle_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_chat_reads ENABLE ROW LEVEL SECURITY;

/* Helper : check if current user is an active member of circle. */
CREATE OR REPLACE FUNCTION public.is_circle_active_member(p_circle_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

/* Policy SELECT : membres actifs lisent les messages non-deleted. */
DROP POLICY IF EXISTS circle_chat_messages_select_active ON public.circle_chat_messages;
CREATE POLICY circle_chat_messages_select_active
  ON public.circle_chat_messages FOR SELECT
  USING (
    deleted_at IS NULL AND public.is_circle_active_member(circle_id)
  );

/* Policy INSERT : membres actifs envoient des messages (en leur nom). */
DROP POLICY IF EXISTS circle_chat_messages_insert_active ON public.circle_chat_messages;
CREATE POLICY circle_chat_messages_insert_active
  ON public.circle_chat_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_circle_active_member(circle_id)
  );

/* Policy UPDATE : own messages uniquement (edit content + edited_at). */
DROP POLICY IF EXISTS circle_chat_messages_update_own ON public.circle_chat_messages;
CREATE POLICY circle_chat_messages_update_own
  ON public.circle_chat_messages FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

/* Policy DELETE : own (soft delete via UPDATE deleted_at=now() en
   pratique). Hard delete réservé aux modérateurs via RPC SECURITY
   DEFINER (à ajouter quand on intègre la modération chat). */
DROP POLICY IF EXISTS circle_chat_messages_delete_own ON public.circle_chat_messages;
CREATE POLICY circle_chat_messages_delete_own
  ON public.circle_chat_messages FOR DELETE
  USING (author_id = auth.uid());

/* Reactions : SELECT membres, INSERT/DELETE own. */
DROP POLICY IF EXISTS circle_chat_reactions_select_member ON public.circle_chat_reactions;
CREATE POLICY circle_chat_reactions_select_member
  ON public.circle_chat_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_chat_messages m
      WHERE m.id = circle_chat_reactions.message_id
        AND public.is_circle_active_member(m.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_chat_reactions_insert_own ON public.circle_chat_reactions;
CREATE POLICY circle_chat_reactions_insert_own
  ON public.circle_chat_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_chat_messages m
      WHERE m.id = circle_chat_reactions.message_id
        AND public.is_circle_active_member(m.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_chat_reactions_delete_own ON public.circle_chat_reactions;
CREATE POLICY circle_chat_reactions_delete_own
  ON public.circle_chat_reactions FOR DELETE
  USING (user_id = auth.uid());

/* Reads : SELECT own + UPSERT own. */
DROP POLICY IF EXISTS circle_chat_reads_own ON public.circle_chat_reads;
CREATE POLICY circle_chat_reads_own
  ON public.circle_chat_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. Realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_chat_reactions;

-- ============================================================
-- 6. RPC mark_circle_chat_read (UPSERT helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_circle_chat_read(p_circle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT public.is_circle_active_member(p_circle_id) THEN
    RAISE EXCEPTION 'not a member';
  END IF;
  INSERT INTO public.circle_chat_reads (circle_id, user_id, last_read_at)
  VALUES (p_circle_id, auth.uid(), now())
  ON CONFLICT (circle_id, user_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_circle_chat_read(UUID) TO authenticated;

-- ============================================================
-- 7. RPC count_circle_chat_unread (badge sidebar nav)
-- ============================================================

CREATE OR REPLACE FUNCTION public.count_circle_chat_unread(p_circle_id UUID)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.circle_chat_messages m
  WHERE m.circle_id = p_circle_id
    AND m.deleted_at IS NULL
    AND m.author_id != auth.uid()
    AND m.created_at > COALESCE(
      (SELECT last_read_at FROM public.circle_chat_reads
       WHERE circle_id = p_circle_id AND user_id = auth.uid()),
      '1970-01-01'::timestamptz
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_circle_chat_unread(UUID) TO authenticated;

-- ============================================================
-- 8. Trigger notif sur mention (notif aux mentioned users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_circle_chat_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mentioned_user UUID;
  author_name TEXT;
  circle_name TEXT;
  circle_slug TEXT;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Quelqu''un') INTO author_name
    FROM public.profiles WHERE id = NEW.author_id;

  SELECT name, slug INTO circle_name, circle_slug
    FROM public.circles WHERE id = NEW.circle_id;

  FOREACH mentioned_user IN ARRAY NEW.mentions LOOP
    /* Pas de notif si on se mentionne soi-même. */
    IF mentioned_user = NEW.author_id THEN CONTINUE; END IF;

    INSERT INTO public.notifications (
      user_id, type, title, body, related_user_id, href
    ) VALUES (
      mentioned_user,
      'system',
      author_name || ' t''a mentionné dans #' || COALESCE(circle_name, ''),
      substring(NEW.body FROM 1 FOR 140),
      NEW.author_id,
      '/circles/' || COALESCE(circle_slug, '') || '/chat?m=' || NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_circle_chat_mentions_trg ON public.circle_chat_messages;
CREATE TRIGGER notify_circle_chat_mentions_trg
  AFTER INSERT ON public.circle_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_circle_chat_mentions();

-- ============================================================
-- 9. Activer le module `chat` par défaut sur tous les cercles
-- ============================================================
-- Ajoute "chat": true au JSONB modules de chaque cercle existant.
-- Pour les futurs cercles, le code Next.js devrait inclure chat:true
-- dans le payload de création (PostComposer cercle / wizard /new).

UPDATE public.circles
SET modules = COALESCE(modules, '{}'::jsonb) || '{"chat": true}'::jsonb
WHERE NOT (modules ? 'chat');

COMMIT;
