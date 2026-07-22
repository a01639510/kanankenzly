-- ============================================================================
-- Kenzly GeoOps — Storage bucket de GeoSIC + bootstrap de acceso
-- ----------------------------------------------------------------------------
-- Ejecutar despues de 0001_geosic_rpc.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Bucket para archivos KML/KMZ y capturas.
--    Publico de lectura para que las URLs (archivo_kml_url) sean accesibles;
--    la escritura va siempre por el API route con sesion autenticada.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('geosic', 'geosic', true)
on conflict (id) do nothing;

-- Politicas de Storage: lectura publica, escritura solo autenticados.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'geosic_read'
  ) then
    create policy geosic_read on storage.objects
      for select using (bucket_id = 'geosic');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'geosic_write'
  ) then
    create policy geosic_write on storage.objects
      for insert to authenticated with check (bucket_id = 'geosic');
  end if;
end $$;

-- ============================================================================
-- 2. BOOTSTRAP DE ACCESO  (correr UNA vez, ajustando las 3 variables)
-- ----------------------------------------------------------------------------
-- RLS solo deja ver los datos de una organizacion a sus MIEMBROS. Este bloque
-- crea la organizacion (si no existe) y te deja como admin de ella.
--
-- PASO A (manual): crea el usuario en Authentication > Users del dashboard de
-- Supabase (o por signup) con tu correo.
--
-- PASO B: ajusta v_email / v_org_slug / v_org_nombre y ejecuta el bloque.
--         El slug debe coincidir con ORG_SLUG de tu .env.local.
-- ============================================================================
do $$
declare
  v_email      text := 'admin@ejemplo.org';   -- <-- AJUSTA
  v_nombre     text := 'Administrador';       -- <-- AJUSTA
  v_org_slug   text := 'demo';                -- <-- AJUSTA (= ORG_SLUG)
  v_org_nombre text := 'Organizacion Demo';   -- <-- AJUSTA
  v_uid   uuid;
  v_org   uuid;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise notice 'No existe auth.users con email %. Crea el usuario primero.', v_email;
    return;
  end if;

  -- Crea la organizacion la primera vez; si ya existe, la reutiliza.
  select id into v_org from organizaciones where slug = v_org_slug;
  if v_org is null then
    insert into organizaciones (nombre, slug)
    values (v_org_nombre, v_org_slug)
    returning id into v_org;
    raise notice 'Organizacion % creada (%).', v_org_slug, v_org;
  end if;

  insert into usuarios (id, email, nombre)
  values (v_uid, v_email, v_nombre)
  on conflict (id) do update set email = excluded.email;

  insert into membresias (org_id, usuario_id, rol)
  values (v_org, v_uid, 'admin')
  on conflict (org_id, usuario_id) do update set rol = 'admin';

  raise notice 'Listo: % es admin de % (org %).', v_email, v_org_slug, v_org;
end $$;
