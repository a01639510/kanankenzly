-- ============================================================================
-- Kenzly EUDR — Núcleo multi-tenant (PostgreSQL 15+ con PostGIS 3+)
-- ----------------------------------------------------------------------------
-- Objetivo de este archivo:
--   1. Multi-tenant desde la primera tabla (org_id + Row-Level Security).
--   2. Identidad de parcela UNIFICADA (un solo FK para referenciar parcelas),
--      con la data productiva por cultivo en tablas de extensión.
--   3. Motor de fichas CONFIGURABLE por organización/cultivo (núcleo vs config).
--   4. Separación clara: la GEOMETRÍA (PostGIS) es la verdad; los ESCALARES
--      (area, centroide, estado) son columnas planas que cualquier cliente
--      —incluido AppSheet en la fase puente— puede leer sin entender PostGIS.
--   5. Nombres internos canónicos: snake_case, sin acentos, sin espacios.
--      (Esto corrige de raíz el caos de nombres detectado en el Excel actual.)
--
-- Nota de diseño: en AppSheet recomendamos DOS tablas de parcela porque la
-- herramienta no puede referenciar nativamente a una de dos tablas. En Postgres
-- esa restricción no existe, así que aquí hacemos lo CORRECTO: una sola tabla
-- de identidad `parcelas` + extensiones `parcela_cafe` / `parcela_tropical`.
-- ============================================================================

create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- TIPOS
-- ----------------------------------------------------------------------------
create type tipo_cultivo      as enum ('cafe', 'tropical', 'mixto');
create type tipo_ficha        as enum ('robusta', 'arabe', 'tropicales');
create type estado_ficha      as enum ('borrador','en_revision','aprobada','pdf_generado','requiere_correccion');
create type metodo_levantamiento as enum ('google_earth','gps','qgis','otro');
create type rol_membresia     as enum ('admin','coordinador','inspector','solo_lectura');
create type estado_validacion as enum (
  'sin_poligono','cargado_sin_area','pendiente',
  'validado_preliminar','revisar_area','diferencia_critica',
  'validado','requiere_nuevo_levantamiento'
);

-- ============================================================================
-- 1. FUNDACIÓN MULTI-TENANT
-- ============================================================================
create table organizaciones (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text unique not null,          -- p.ej. 'mi-organizacion'
  created_at  timestamptz not null default now()
);

-- Perfil de usuario. En Supabase, id = auth.users.id.
create table usuarios (
  id          uuid primary key,              -- = auth.uid()
  email       text unique not null,
  nombre      text
);

-- La membresía es la que habilita el aislamiento por inquilino (RLS).
create table membresias (
  org_id      uuid not null references organizaciones(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  rol         rol_membresia not null default 'inspector',
  primary key (org_id, usuario_id)
);

-- Helper: ¿el usuario actual pertenece a esta organización?
create or replace function es_miembro(p_org uuid) returns boolean as $$
  select exists (
    select 1 from membresias
    where org_id = p_org and usuario_id = auth.uid()
  );
$$ language sql stable security definer;

-- ============================================================================
-- 2. CATÁLOGOS (identidad única de productor y parcela)
-- ============================================================================
create table productores (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizaciones(id) on delete cascade,
  codigo          text not null,             -- código de padrón (humano)
  nombre_completo text not null,
  comunidad       text,
  municipio       text,
  sexo            text,
  anio_ingreso    int,
  tipo_productor  tipo_cultivo not null default 'cafe',
  created_at      timestamptz not null default now(),
  unique (org_id, codigo)                    -- el código no se repite por org
);

create table parcelas (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references organizaciones(id) on delete cascade,
  productor_id           uuid not null references productores(id) on delete restrict,
  codigo_parcela         text not null,      -- p.ej. CR089006-CAFE-001
  nombre                 text,
  comunidad              text,
  municipio              text,
  tipo_cultivo           tipo_cultivo not null,
  superficie_declarada_ha numeric(10,4),     -- "área del padrón" (base de comparación geo)
  sic_inicio_conversion  date,
  sic_ultima_insp_interna date,
  sic_ultima_insp_externa date,
  created_at             timestamptz not null default now(),
  unique (org_id, codigo_parcela)
);
create index on parcelas (org_id, productor_id);

-- Extensión productiva de café (1:1 con parcela cuando tipo_cultivo='cafe')
create table parcela_cafe (
  parcela_id              uuid primary key references parcelas(id) on delete cascade,
  superficie_arabica_ha   numeric(10,4),
  superficie_robusta_ha   numeric(10,4),
  arabe_produccion_qq     numeric(12,2),
  arabe_rendimiento_kg_ha numeric(12,2),
  robusta_produccion_qq   numeric(12,2),
  robusta_rendimiento_kg_ha numeric(12,2),
  fecha_siembra           date
);

-- Extensión productiva tropical. Los cultivos variables (cacao, coco, mango,
-- plátano, canela, marañón...) van en JSONB para no multiplicar columnas.
create table parcela_tropical (
  parcela_id        uuid primary key references parcelas(id) on delete cascade,
  superficie_2024_ha numeric(10,4),
  superficie_2025_ha numeric(10,4),
  cultivos          jsonb default '[]'::jsonb  -- [{cultivo, arboles, prod_kg, tm, rend}]
);

-- ============================================================================
-- 3. MOTOR DE FICHAS CONFIGURABLE  (núcleo invariante vs config por cliente)
-- ----------------------------------------------------------------------------
-- El espinazo (productor->parcela->ficha->detalle) NO cambia entre clientes.
-- Lo que cambia son los bloques de preguntas. Por eso el formulario se define
-- como DATOS, no como código: dar de alta una organización nueva = configurar.
-- ============================================================================
create table form_templates (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizaciones(id) on delete cascade,
  tipo_cultivo tipo_cultivo not null,
  nombre       text not null,
  version      int not null default 1,
  activo       boolean not null default true
);

create table form_secciones (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references form_templates(id) on delete cascade,
  nombre      text not null,                 -- 'Datos generales', 'Sombra', ...
  orden       int not null
);

create table form_campos (
  id            uuid primary key default gen_random_uuid(),
  seccion_id    uuid not null references form_secciones(id) on delete cascade,
  nombre_interno text not null,              -- canónico: snake_case, sin acentos
  etiqueta      text not null,               -- lo que ve el inspector (con acentos)
  tipo          text not null,               -- text|enum|number|date|bool|image|signature
  opciones      jsonb,                       -- para enum: ["Sí","No","N/A"]
  requerido     boolean not null default false,
  orden         int not null,
  unique (seccion_id, nombre_interno)
);

-- ============================================================================
-- 4. FICHAS Y DETALLE
-- ----------------------------------------------------------------------------
-- Campos canónicos (consultables) como columnas reales; las respuestas
-- variables del formulario configurable, en JSONB clave=nombre_interno.
-- ============================================================================
create table fichas (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizaciones(id) on delete cascade,
  template_id         uuid references form_templates(id),
  tipo                tipo_ficha not null,
  productor_id        uuid not null references productores(id),
  inspector_id        uuid references usuarios(id),
  fecha_inspeccion    date,
  area_cultivada_ha   numeric(10,4),         -- suma de parcelas seleccionadas
  resultado_evaluacion text,
  estado              estado_ficha not null default 'borrador',
  respuestas          jsonb default '{}'::jsonb,
  firma_productor_url text,
  firma_inspector_url text,
  ubicacion           geography(Point,4326), -- punto de la inspección (HERE())
  pdf_url             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on fichas (org_id, productor_id);
create index on fichas (org_id, estado);

-- Tabla detalle UNIFICADA: una fila por parcela vinculada a una ficha.
-- (Sustituye a las tres tablas Detalle_* gracias a la identidad única de parcela.)
create table ficha_parcelas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizaciones(id) on delete cascade,
  ficha_id    uuid not null references fichas(id) on delete cascade,
  parcela_id  uuid not null references parcelas(id) on delete restrict,
  unique (ficha_id, parcela_id)
);

-- ============================================================================
-- 5. GEOSIC — POLÍGONOS DE PARCELA
-- ----------------------------------------------------------------------------
-- geom         = la VERDAD geométrica (PostGIS). La llena el servicio GIS.
-- area_calc_ha, perimetro_m, centroide_* , diferencia_*, estado = ESCALARES
--   planos que cualquier cliente lee (incl. AppSheet) sin saber de PostGIS.
-- Versionado: una parcela puede tener varios polígonos en el tiempo.
-- ============================================================================
create table parcela_poligonos (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizaciones(id) on delete cascade,
  parcela_id          uuid not null references parcelas(id) on delete cascade,
  version             int not null default 1,
  activo              boolean not null default true,   -- versión vigente
  metodo              metodo_levantamiento default 'google_earth',
  archivo_kml_url     text,
  archivo_kmz_url     text,
  captura_url         text,

  geom                geometry(Polygon,4326),          -- fuente de verdad

  -- escalares derivados (los recalcula el trigger o el servicio GIS):
  area_calc_ha        numeric(10,4),
  perimetro_m         numeric(12,2),
  centroide_lat       numeric(10,7),
  centroide_lng       numeric(10,7),
  superficie_declarada_snapshot numeric(10,4),         -- congela el padrón al medir
  diferencia_ha       numeric(10,4),
  diferencia_pct      numeric(6,4),
  estado_validacion   estado_validacion not null default 'sin_poligono',

  responsable_id      uuid references usuarios(id),
  fecha_levantamiento date,
  validado_por        uuid references usuarios(id),
  fecha_validacion    date,
  motivo_cambio       text,
  observaciones       text,
  created_at          timestamptz not null default now()
);
create index parcela_poligonos_geom_gix on parcela_poligonos using gist (geom);
create index on parcela_poligonos (org_id, parcela_id, activo);

-- Trigger: recalcula escalares geométricos desde geom y la validación de área.
-- Respeta la validación HUMANA final ('validado') y no la sobreescribe.
create or replace function geo_recompute() returns trigger as $$
declare
  decl numeric;
begin
  if new.geom is not null then
    new.area_calc_ha  := round((ST_Area(new.geom::geography) / 10000.0)::numeric, 4);
    new.perimetro_m   := round(ST_Perimeter(new.geom::geography)::numeric, 2);
    new.centroide_lat := ST_Y(ST_Centroid(new.geom));
    new.centroide_lng := ST_X(ST_Centroid(new.geom));
  end if;

  select superficie_declarada_ha into decl from parcelas where id = new.parcela_id;
  new.superficie_declarada_snapshot := coalesce(new.superficie_declarada_snapshot, decl);

  if new.area_calc_ha is not null and new.superficie_declarada_snapshot is not null then
    new.diferencia_ha := abs(new.area_calc_ha - new.superficie_declarada_snapshot);
    new.diferencia_pct := case
      when new.superficie_declarada_snapshot = 0 then null
      else round(abs(new.area_calc_ha - new.superficie_declarada_snapshot)
                 / new.superficie_declarada_snapshot, 4)
    end;
  end if;

  -- No tocar el estado si un coordinador ya lo validó manualmente.
  if new.estado_validacion is distinct from 'validado' then
    new.estado_validacion := case
      when new.geom is null and new.archivo_kml_url is null then 'sin_poligono'
      when new.area_calc_ha is null                         then 'cargado_sin_area'
      when new.diferencia_pct is null                       then 'pendiente'
      when new.diferencia_pct <= 0.05                       then 'validado_preliminar'
      when new.diferencia_pct <= 0.15                       then 'revisar_area'
      else 'diferencia_critica'
    end;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_geo_recompute
  before insert or update on parcela_poligonos
  for each row execute function geo_recompute();

-- ============================================================================
-- 6. EXPEDIENTE TÉCNICO (bitácora, insumos, historial)
--    Todos referencian la identidad única de parcela: un solo FK limpio.
-- ============================================================================
create table bitacora_actividades (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizaciones(id) on delete cascade,
  parcela_id          uuid not null references parcelas(id) on delete cascade,
  fecha               date not null,
  actividad           text,
  vivero_num_plantas  int,
  gastos              numeric(12,2),
  materiales_abono    text,
  observaciones       text
);

create table control_insumos (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizaciones(id) on delete cascade,
  parcela_id           uuid not null references parcelas(id) on delete cascade,
  fecha_aplicacion     date,
  nombre_producto      text,
  ingrediente_activo   text,
  ingredientes_inertes text,
  origen_producto      text,
  dosis_kg_ha          numeric(10,3)
);

create table historial_manejo_anual (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizaciones(id) on delete cascade,
  parcela_id          uuid not null references parcelas(id) on delete cascade,
  anio                int not null,
  estado_parcela      text,
  produccion_kg       numeric(12,2),
  fertilizacion_kg    numeric(12,2),
  control_plagas      text,
  ultima_aplicacion_quimica date,
  unique (parcela_id, anio)
);

-- ============================================================================
-- 7. ROW-LEVEL SECURITY  (aislamiento por inquilino)
-- ----------------------------------------------------------------------------
-- Cada fila solo es visible/editable por miembros de su organización.
-- Esta es la decisión que NO se puede retrofitear barato: va desde el día uno.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'productores','parcelas','parcela_cafe','parcela_tropical',
    'form_templates','form_secciones','form_campos',
    'fichas','ficha_parcelas','parcela_poligonos',
    'bitacora_actividades','control_insumos','historial_manejo_anual'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Política para tablas con org_id directo:
create policy org_isolation on productores            using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on parcelas               using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on form_templates         using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on fichas                 using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on ficha_parcelas         using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on parcela_poligonos      using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on bitacora_actividades   using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on control_insumos        using (es_miembro(org_id)) with check (es_miembro(org_id));
create policy org_isolation on historial_manejo_anual using (es_miembro(org_id)) with check (es_miembro(org_id));

-- Para extensiones/config sin org_id directo, se hereda vía el padre:
create policy hereda_org on parcela_cafe     using (exists (select 1 from parcelas p where p.id = parcela_id and es_miembro(p.org_id)));
create policy hereda_org on parcela_tropical using (exists (select 1 from parcelas p where p.id = parcela_id and es_miembro(p.org_id)));
create policy hereda_org on form_secciones   using (exists (select 1 from form_templates ft where ft.id = template_id and es_miembro(ft.org_id)));
create policy hereda_org on form_campos      using (exists (select 1 from form_secciones s join form_templates ft on ft.id = s.template_id where s.id = seccion_id and es_miembro(ft.org_id)));

-- ============================================================================
-- 8. VISTAS DE CONVENIENCIA  (para reportes / dashboard del coordinador)
-- ============================================================================
create view v_indicadores_geo as
select
  org_id,
  count(*) filter (where activo)                                       as poligonos_activos,
  count(*) filter (where activo and estado_validacion = 'validado')    as validados,
  count(*) filter (where activo and diferencia_pct > 0.15)             as criticas,
  round(avg(diferencia_ha) filter (where activo), 4)                   as diferencia_promedio_ha
from parcela_poligonos
group by org_id;

create view v_parcelas_sin_poligono as
select p.org_id, p.id as parcela_id, p.codigo_parcela, p.nombre
from parcelas p
where not exists (
  select 1 from parcela_poligonos pp
  where pp.parcela_id = p.id and pp.activo and pp.geom is not null
);
