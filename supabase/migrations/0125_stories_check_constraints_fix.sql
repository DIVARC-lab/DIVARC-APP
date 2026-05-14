-- Migration 0125 — Fix des check constraints stories qui refusent type='video'.
--
-- Bug dans la migration 0035 : elle a ajouté le support video (check type
-- in 'photo','text','video' + nouvelles colonnes) MAIS a oublié de fixer
-- les contraintes `photo_requires_url` et `text_requires_content` créées
-- en 0010, qui forment :
--
--   photo_requires_url:
--     (type = 'photo' and photo_url is not null) or type = 'text'
--
--   text_requires_content:
--     (type = 'text' and (caption is not null or background is not null))
--     or type = 'photo'
--
-- Conséquence : quand type='video', les deux contraintes échouent car
-- 'video' n'est NI dans la première branche NI dans la branche else.
-- L'user voit "violates check constraint photo_requires_url".
--
-- Fix : refactor les contraintes en mode "implication" (si type=X alors Y),
-- qui tolère naturellement les autres types.
--
-- IDEMPOTENT.

alter table public.stories
  drop constraint if exists photo_requires_url;

alter table public.stories
  add constraint photo_requires_url
  check (
    type <> 'photo'
    or photo_url is not null
  );

alter table public.stories
  drop constraint if exists text_requires_content;

alter table public.stories
  add constraint text_requires_content
  check (
    type <> 'text'
    or (caption is not null or background is not null)
  );

comment on constraint photo_requires_url on public.stories is
  'Si type=photo, photo_url doit être non-null. Tolère type=text et type=video.';
comment on constraint text_requires_content on public.stories is
  'Si type=text, caption OU background doit être non-null. Tolère photo et video.';
