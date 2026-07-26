// Avance de certificaciones — calculado en vivo sobre los datos reales que ya
// existen en el sistema (GeoSIC, tamizado EUDR, fichas, bitácoras). No hay
// checklist editable ni evidencia subida todavía: esto es un punto de
// partida honesto — cada requisito que SÍ podemos ver desde los datos se
// evalúa de verdad; el resto se marca `no_rastreado` en vez de inventarse.
//
// La mayoría de los esquemas comparten la misma base de datos (geolocalización
// de parcela, trazabilidad productor→parcela, registro de campo), así que un
// solo cómputo de PanelStats alcanza para las 8 tarjetas.
//
// Cada requisito trackeable enlaza al módulo real donde se corrige (`modulo`).
// Cada requisito `no_rastreado` que algún día podría cubrirse con una
// herramienta propia enlaza a su tarjeta en la hoja de ruta (`hojaDeRuta`,
// ver HOJA_DE_RUTA más abajo) — los que dependen de un tercero (organismo
// certificador, programa externo) no enlazan a nada, son honestos "fuera de
// este sistema, punto".
import type { PanelStats } from '@/lib/data/panel'

export type EstadoRequisito = 'cumplido' | 'parcial' | 'faltante' | 'no_rastreado'

export interface Requisito {
  label: string
  modulo?: { href: string; label: string } // dónde corregirlo HOY, si aplica
  hojaDeRuta?: string // slug de HOJA_DE_RUTA si el hueco lo cerraría un módulo futuro
  evaluar: (s: PanelStats) => { estado: EstadoRequisito; detalle: string }
}

export interface Certificacion {
  slug: string
  nombre: string
  tipo: string
  alcance: string
  requisitos: Requisito[]
}

export interface ModuloFuturo {
  slug: string
  nombre: string
  descripcion: string
}

const pct = (parte: number, total: number) => (total > 0 ? parte / total : 0)
const fmtPct = (p: number) => `${Math.round(p * 100)}%`

// Estado por cobertura: ≥90% cumplido, algo pero no todo = parcial, 0 = faltante.
function porCobertura(parte: number, total: number, etiqueta: string) {
  const p = pct(parte, total)
  const estado: EstadoRequisito = total === 0 ? 'faltante' : p >= 0.9 ? 'cumplido' : p > 0 ? 'parcial' : 'faltante'
  return { estado, detalle: `${parte} de ${total} ${etiqueta} (${fmtPct(p)})` }
}

function trazabilidadBase(s: PanelStats) {
  const ok = s.productores > 0 && s.parcelas > 0
  return {
    estado: (ok ? 'cumplido' : 'faltante') as EstadoRequisito,
    detalle: ok
      ? `${s.productores} productores vinculados a ${s.parcelas} parcelas`
      : 'Aún no hay productores/parcelas registrados',
  }
}

const NO_RASTREADO = (detalle: string) => (): { estado: EstadoRequisito; detalle: string } => ({
  estado: 'no_rastreado',
  detalle,
})

const GEOSIC = { href: '/geosic', label: 'GeoSIC' }
const SATELITE = { href: '/satelite', label: 'Satélite' }
const FICHAS = { href: '/fichas', label: 'Fichas' }
const BITACORA = { href: '/bitacora', label: 'Bitácoras' }
const PRODUCTORES = { href: '/productores', label: 'Productores' }

export const CERTIFICACIONES: Certificacion[] = [
  {
    slug: 'eudr',
    nombre: 'EUDR',
    tipo: 'Regulación UE — obligatoria',
    alcance: 'Acceso al mercado UE (café, cacao, madera, etc.)',
    requisitos: [
      {
        label: 'Geolocalización de parcelas',
        modulo: GEOSIC,
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Evaluación de riesgo de deforestación',
        modulo: SATELITE,
        evaluar: (s) => porCobertura(s.eudr_analizadas, s.parcelas, 'parcelas analizadas'),
      },
      {
        label: 'Traslape con bosque 2020 (UE) evaluado',
        modulo: SATELITE,
        evaluar: (s) => porCobertura(s.bosque2020_evaluadas, s.parcelas, 'parcelas evaluadas'),
      },
      {
        label: 'Declaración de Diligencia Debida (DDS)',
        hojaDeRuta: 'dds',
        evaluar: NO_RASTREADO('Se presenta en el portal EU TRACES — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'rainforest-alliance',
    nombre: 'Rainforest Alliance',
    tipo: 'Certificación 3ª parte',
    alcance: 'Café, cacao, té, banano, aguacate — global',
    requisitos: [
      {
        label: 'Geolocalización alineada a EUDR',
        modulo: GEOSIC,
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Evaluación de riesgo de deforestación',
        modulo: SATELITE,
        evaluar: (s) => porCobertura(s.eudr_analizadas, s.parcelas, 'parcelas analizadas'),
      },
      {
        label: 'Inspección de finca',
        modulo: FICHAS,
        evaluar: (s) => porCobertura(s.fichas_por_estado.aprobada, s.fichas_total, 'fichas aprobadas'),
      },
      {
        label: 'Sistema de gestión interna (IMS) / cert. de grupo',
        hojaDeRuta: 'auditorias',
        evaluar: NO_RASTREADO('Gestión de grupo y auditoría RACP — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'globalgap',
    nombre: 'Global G.A.P.',
    tipo: 'Certificación 3ª parte',
    alcance: 'Global — 130+ países, todos los cultivos',
    requisitos: [
      { label: 'Trazabilidad productor → parcela', modulo: PRODUCTORES, evaluar: trazabilidadBase },
      {
        label: 'Inspección de campo (IFA)',
        modulo: FICHAS,
        evaluar: (s) => porCobertura(s.fichas_por_estado.aprobada, s.fichas_total, 'fichas aprobadas'),
      },
      {
        label: 'Registro de actividades y bitácora',
        modulo: BITACORA,
        evaluar: (s) => porCobertura(s.bitacoras, s.parcelas, 'parcelas con bitácora'),
      },
      {
        label: 'Auditoría anual acreditada',
        hojaDeRuta: 'auditorias',
        evaluar: NO_RASTREADO('Auditoría de un organismo certificador — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'proforest-avocado',
    nombre: 'ProForest Avocado',
    tipo: 'Certificación voluntaria de industria',
    alcance: 'México (Michoacán, Jalisco) — exportación a EE. UU.',
    requisitos: [
      {
        label: 'Geolocalización de huertas',
        modulo: GEOSIC,
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Sin pérdida de cobertura detectada',
        modulo: SATELITE,
        evaluar: (s) => {
          if (s.eudr_analizadas === 0) {
            return { estado: 'no_rastreado' as EstadoRequisito, detalle: 'Aún no hay tamizado EUDR corrido' }
          }
          return s.eudr_deforestacion === 0
            ? { estado: 'cumplido' as EstadoRequisito, detalle: 'Sin veredictos de deforestación' }
            : { estado: 'faltante' as EstadoRequisito, detalle: `${s.eudr_deforestacion} parcela(s) con veredicto de deforestación` }
        },
      },
      {
        label: 'Monitoreo Guardián Forestal',
        evaluar: NO_RASTREADO('Programa de verificación de un tercero — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'smeta',
    nombre: 'SMETA / Sedex',
    tipo: 'Metodología de auditoría',
    alcance: 'Global — cualquier industria',
    requisitos: [
      { label: 'Documentación de auditoría social', hojaDeRuta: 'auditoria-social', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
      { label: 'Registro de condiciones laborales', hojaDeRuta: 'auditoria-social', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
      { label: 'Plan de acciones correctivas', hojaDeRuta: 'auditoria-social', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
    ],
  },
  {
    slug: 'mayacert',
    nombre: 'Mayacert',
    tipo: 'Certificador 3ª parte (ISO 17065)',
    alcance: 'Latinoamérica y Asia',
    requisitos: [
      {
        label: 'Registro de insumos (bitácora)',
        modulo: BITACORA,
        evaluar: (s) => porCobertura(s.bitacoras, s.parcelas, 'parcelas con bitácora'),
      },
      {
        label: 'Inspección in situ',
        modulo: FICHAS,
        evaluar: (s) => porCobertura(s.fichas_por_estado.aprobada, s.fichas_total, 'fichas aprobadas'),
      },
      {
        label: 'Certificación orgánica (USDA/UE/JAS)',
        evaluar: NO_RASTREADO('Certificación del organismo acreditado — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'fairtrade',
    nombre: 'Fairtrade / FLOCERT',
    tipo: 'Certificación 3ª parte',
    alcance: 'Global — café, cacao, té, azúcar, banano',
    requisitos: [
      { label: 'Trazabilidad productor → parcela', modulo: PRODUCTORES, evaluar: trazabilidadBase },
      { label: 'Precio mínimo + prima Fairtrade', hojaDeRuta: 'precio-fairtrade', evaluar: NO_RASTREADO('Registro de pagos y prima — fuera de este sistema') },
      { label: 'Gobernanza democrática de la cooperativa', hojaDeRuta: 'gobernanza', evaluar: NO_RASTREADO('Actas y gobernanza — fuera de este sistema') },
    ],
  },
  {
    slug: 'semarnat',
    nombre: 'SEMARNAT',
    tipo: 'Permiso gubernamental',
    alcance: 'México — supervisión ambiental federal',
    requisitos: [
      { label: 'Padrón de parcelas y productores', modulo: PRODUCTORES, evaluar: trazabilidadBase },
      { label: 'Manifestación de Impacto Ambiental (MIA)', hojaDeRuta: 'tramites-semarnat', evaluar: NO_RASTREADO('Trámite ante SEMARNAT — fuera de este sistema') },
      { label: 'Licencia Ambiental Única (LAU)', hojaDeRuta: 'tramites-semarnat', evaluar: NO_RASTREADO('Trámite ante SEMARNAT — fuera de este sistema') },
      { label: 'Cédula de Operación Anual (COA)', hojaDeRuta: 'tramites-semarnat', evaluar: NO_RASTREADO('Reporte anual ante SEMARNAT — fuera de este sistema') },
    ],
  },
]

// Hoja de ruta: módulos que TODAVÍA no existen. Se muestran en la UI marcados
// como DEMO/"En construcción" — son la mitad de lo que le falta a la app para
// cumplir su objetivo real (llevar una parcela HASTA la certificación, no solo
// medir qué tan lejos está). Ver la nota "DEMO" en certificaciones/page.tsx:
// esto es deliberadamente una vista previa, sin datos ni botones funcionales.
export const HOJA_DE_RUTA: ModuloFuturo[] = [
  {
    slug: 'documentos',
    nombre: 'Gestión documental y evidencias',
    descripcion: 'Expediente por parcela/productor: subir y versionar contratos, actas, análisis de suelo, comprobantes.',
  },
  {
    slug: 'dds',
    nombre: 'Declaración de Diligencia Debida (DDS)',
    descripcion: 'Arma y exporta la DDS lista para EU TRACES a partir de los datos de GeoSIC y el tamizado EUDR.',
  },
  {
    slug: 'auditorias',
    nombre: 'Calendario y gestión de auditorías',
    descripcion: 'Programa auditorías por esquema, asigna responsable, sube hallazgos y da seguimiento a cierres.',
  },
  {
    slug: 'auditoria-social',
    nombre: 'Auditoría social y bienestar laboral',
    descripcion: 'Checklist SMETA/ETI: jornales, condiciones de trabajo, menores de edad, plan de acciones correctivas.',
  },
  {
    slug: 'precio-fairtrade',
    nombre: 'Precio y prima Fairtrade',
    descripcion: 'Registro de pagos a productores: precio mínimo, prima Fairtrade y su aplicación.',
  },
  {
    slug: 'gobernanza',
    nombre: 'Gobernanza cooperativa',
    descripcion: 'Actas de asamblea, padrón de socios activos, estructura directiva — lo que piden Fairtrade y RA para grupo.',
  },
  {
    slug: 'trazabilidad-cadena',
    nombre: 'Trazabilidad de cadena de suministro',
    descripcion: 'Sigue el lote más allá de la parcela: acopio, beneficio, lote de exportación — balance de masas.',
  },
  {
    slug: 'tramites-semarnat',
    nombre: 'Portal de trámites SEMARNAT',
    descripcion: 'Seguimiento de MIA, LAU y COA por proyecto: estatus, vigencia y próximos vencimientos.',
  },
]

// Progreso 0–1 de una certificación: cumplido pesa 1, parcial 0.5, el resto 0.
// `no_rastreado` cuenta en el denominador (es honesto: no está listo aunque
// el motivo sea "no lo medimos todavía").
export function progresoCertificacion(cert: Certificacion, s: PanelStats): number {
  const pesos: number[] = cert.requisitos.map((r) => {
    const estado = r.evaluar(s).estado
    if (estado === 'cumplido') return 1
    if (estado === 'parcial') return 0.5
    return 0
  })
  return pesos.reduce((a, b) => a + b, 0) / cert.requisitos.length
}
