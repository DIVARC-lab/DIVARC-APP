-- Migration 0109 — Couverture du changement de policy Supabase 30 octobre 2026.
--
-- À partir du 30/10/2026, les nouvelles tables créées dans `public` ne
-- recevront plus automatiquement les GRANT aux rôles anon/authenticated/
-- service_role. Cette migration :
--
--   1. Applique les GRANT standards sur TOUTES les tables existantes
--      du schéma public (idempotent — re-grant safe).
--   2. Installe un event trigger qui re-applique automatiquement ces
--      GRANT sur chaque CREATE TABLE futur dans public, ce qui couvre
--      les migrations à venir sans intervention manuelle.
--
-- Sécurité : les GRANT seuls ne donnent PAS accès aux lignes. La RLS
-- (déjà en place sur nos tables sensibles) reste la vraie barrière. Les
-- GRANT ouvrent juste la "porte" pour que PostgREST/supabase-js puisse
-- évaluer les policies.
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Backfill : GRANT sur toutes les tables existantes
-- =====================================================

do $$
declare
  t record;
begin
  for t in
    select schemaname, tablename
      from pg_catalog.pg_tables
     where schemaname = 'public'
  loop
    /* Grants standards. service_role bypasse RLS naturellement via la
     * config Supabase, mais on le déclare quand même pour la cohérence
     * avec PostgREST. */
    execute format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
      t.tablename
    );
    execute format(
      'GRANT SELECT ON public.%I TO anon',
      t.tablename
    );
    execute format(
      'GRANT ALL ON public.%I TO service_role',
      t.tablename
    );
  end loop;

  /* Pareil pour les séquences (default Supabase n'expose pas, mais
   * certaines tables avec serial nécessitent l'usage. Safe à grant). */
  for t in
    select schemaname, sequencename as tablename
      from pg_catalog.pg_sequences
     where schemaname = 'public'
  loop
    execute format(
      'GRANT USAGE ON SEQUENCE public.%I TO authenticated, service_role',
      t.tablename
    );
  end loop;
end;
$$;

-- =====================================================
-- 2. Default privileges pour les futures tables
-- =====================================================
--
-- Postgres ALTER DEFAULT PRIVILEGES s'applique aux objets créés PAR le
-- même rôle. Comme nos migrations s'exécutent en tant que postgres (rôle
-- propriétaire du schéma public), on définit les defaults pour ce rôle.

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage on sequences to authenticated, service_role;

-- =====================================================
-- 3. Event trigger pour CREATE TABLE futurs (filet de sécurité)
-- =====================================================
--
-- Même avec ALTER DEFAULT PRIVILEGES, certains outils (Supabase Studio,
-- CI/CD avec d'autres rôles) peuvent créer des tables qui contournent
-- les defaults. Un event trigger garantit que toute nouvelle table
-- public reçoit les GRANT, peu importe l'auteur.

create or replace function public.auto_grant_new_tables()
returns event_trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
     where command_tag = 'CREATE TABLE'
       and schema_name = 'public'
  loop
    /* obj.object_identity est de la forme "public.ma_table". */
    execute format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO authenticated',
      obj.object_identity
    );
    execute format(
      'GRANT SELECT ON %s TO anon',
      obj.object_identity
    );
    execute format(
      'GRANT ALL ON %s TO service_role',
      obj.object_identity
    );
  end loop;
end;
$$;

drop event trigger if exists ensure_public_grants;
create event trigger ensure_public_grants
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.auto_grant_new_tables();

comment on function public.auto_grant_new_tables() is
  'Event trigger qui applique les GRANT standards (anon/authenticated/service_role) sur toute nouvelle table créée dans le schéma public. Couvre le changement Supabase 30 octobre 2026.';
