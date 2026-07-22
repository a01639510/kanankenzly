# EUDR Kenzly SaaS

Base generalizada del ERP agro de Kenzly, recortada al núcleo que sostiene la
**diligencia debida del EUDR** (Reglamento UE 2023/1115 de productos libres de
deforestación): geolocalización de parcelas, monitoreo satelital e inspección
en campo.

Es una **copia limpia y sin datos de cliente** del SaaS que opera en producción.
Punto de partida para convertirlo en producto multi-cliente y multi-país.

> Derivado de `kenzly-geosic`. Este repositorio es independiente: no comparte
> historia de git ni datos con el original.

## Qué incluye

Siete módulos, en el orden en que aparecen en la barra superior:

| Módulo | Para qué sirve en el EUDR |
|---|---|
| **Panel** | Resumen operativo; muestra arriba las parcelas en riesgo EUDR. |
| **GeoSIC** | Polígonos de parcela (carga KML/KMZ → PostGIS), área calculada y validación. Es el dato del Art. 9. |
| **Satélite** | Sentinel-2 (NDVI/EVI/NDWI), tamizado EUDR 2020 vs actual y traslape con la capa de bosque 2020 de la UE. |
| **Productores** | Padrón de productores y sus parcelas. |
| **Fichas** | Motor de formularios configurable para la inspección en campo (offline). |
| **Bitácoras** | Bitácora anual de actividades por parcela. |
| **Historial** | Historial de manejo comparado por año. |

Fuera de alcance en esta base (vive en el ERP completo): acopio, ventas,
CRM, contratos, certificación, LPA, agroecología y maquila.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + PostGIS +
RLS) · Mapbox GL JS · Sentinel-2 vía Copernicus Data Space · PWA offline
(Serwist + IndexedDB).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run dev
```

### Base de datos

En el SQL Editor de Supabase, corre los archivos de `supabase/migrations/` **en
orden numérico**, empezando por `0000_core_schema.sql`.

Requisitos del proyecto Supabase: extensiones `postgis` y `pgcrypto`.

En `0002_storage_and_bootstrap.sql` ajusta las cuatro variables del bloque de
bootstrap (correo, nombre, slug y nombre de la organización) antes de correrlo.
El usuario debe existir ya en *Authentication > Users*. El slug tiene que
coincidir con `ORG_SLUG` de tu `.env.local`.

> La numeración tiene huecos (falta 0010–0027, etc.): son las migraciones de los
> módulos que no forman parte de esta base. Se conservaron los números
> originales para no romper el orden relativo.

### Variables de entorno

Todas están documentadas en `.env.example`. Las dos propias de esta base:

- `ORG_SLUG` — organización con la que trabajan los scripts.
- `NEXT_PUBLIC_MAPA_CENTRO` — centro `"lng,lat"` de los mapas cuando aún no hay
  polígonos. Sin él, cae en el eje cafetero de Colombia.

## Scripts

Se corren con `node scripts/<archivo>` desde la raíz y leen `.env.local`.

| Script | Qué hace |
|---|---|
| `crear-usuario.mjs` | Alta/actualización de usuario + rol en la organización. |
| `import-eudr.mjs` | Importa el veredicto oficial de la verificadora a `parcela_eudr`. Simula si no pasas `--commit`. |
| `bulk-poligonos.mjs` | Carga masiva de polígonos. |
| `migrar-campos-por-parcela.mjs` | Migración de campos del motor de fichas. |
| `clean-parcela-codigos.mjs` / `restore-parcela-codigos.mjs` | Utilidades del código de parcela. |
| `dump-docx.mjs` | Vuelca la estructura de un `.docx` para modelar una ficha nueva. |

## Pendientes conocidos

- **No hay plantillas de ficha sembradas.** El motor de fichas es dirigido por
  datos (`form_templates` / `form_secciones` / `form_campos`); el seed anterior
  contenía formularios de un cliente y se eliminó. Hay que sembrar las
  plantillas de cada organización antes de usar el módulo Fichas.
- El delta EUDR pendiente de construir: expediente de legalidad, evaluación de
  riesgo por convergencia de pruebas, generación de la Declaración de Diligencia
  Debida (DDS) y el portal de permisos.
