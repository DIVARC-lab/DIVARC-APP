-- =====================================================
-- DIVARC — Migration 0014 : Durée des messages audio
-- =====================================================

-- Ajout de la durée en ms pour les messages audio (utilisé aussi pour
-- la vidéo plus tard).
alter table public.messages
  add column if not exists attachment_duration_ms integer
    check (attachment_duration_ms is null or attachment_duration_ms >= 0);
