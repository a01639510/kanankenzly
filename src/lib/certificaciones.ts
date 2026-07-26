// Avance de certificaciones — calculado en vivo sobre los datos reales que ya
// existen en el sistema (GeoSIC, tamizado EUDR, fichas, bitácoras). No hay
// checklist editable ni evidencia subida todavía: esto es un punto de
// partida honesto — cada requisito que SÍ podemos ver desde los datos se
// evalúa de verdad; el resto se marca `no_rastreado` en vez de inventarse.
//
// La mayoría de los esquemas comparten la misma base de datos (geolocalización
// de parcela, trazabilidad productor→parcela, registro de campo), así que un
// solo cómputo de PanelStats alcanza para las 8 tarjetas.
import type { PanelStats } from '@/lib/data/panel'

export type EstadoRequisito = 'cumplido' | 'parcial' | 'faltante' | 'no_rastreado'

export interface Requisito {
  label: string
  evaluar: (s: PanelStats) => { estado: EstadoRequisito; detalle: string }
}

export interface Certificacion {
  slug: string
  nombre: string
  tipo: string
  alcance: string
  requisitos: Requisito[]
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

export const CERTIFICACIONES: Certificacion[] = [
  {
    slug: 'eudr',
    nombre: 'EUDR',
    tipo: 'Regulación UE — obligatoria',
    alcance: 'Acceso al mercado UE (café, cacao, madera, etc.)',
    requisitos: [
      {
        label: 'Geolocalización de parcelas',
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Evaluación de riesgo de deforestación',
        evaluar: (s) => porCobertura(s.eudr_analizadas, s.parcelas, 'parcelas analizadas'),
      },
      {
        label: 'Traslape con bosque 2020 (UE) evaluado',
        evaluar: (s) => porCobertura(s.bosque2020_evaluadas, s.parcelas, 'parcelas evaluadas'),
      },
      {
        label: 'Declaración de Diligencia Debida (DDS)',
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
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Evaluación de riesgo de deforestación',
        evaluar: (s) => porCobertura(s.eudr_analizadas, s.parcelas, 'parcelas analizadas'),
      },
      {
        label: 'Inspección de finca',
        evaluar: (s) => porCobertura(s.fichas_por_estado.aprobada, s.fichas_total, 'fichas aprobadas'),
      },
      {
        label: 'Sistema de gestión interna (IMS) / cert. de grupo',
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
      { label: 'Trazabilidad productor → parcela', evaluar: trazabilidadBase },
      {
        label: 'Inspección de campo (IFA)',
        evaluar: (s) => porCobertura(s.fichas_por_estado.aprobada, s.fichas_total, 'fichas aprobadas'),
      },
      {
        label: 'Registro de actividades y bitácora',
        evaluar: (s) => porCobertura(s.bitacoras, s.parcelas, 'parcelas con bitácora'),
      },
      {
        label: 'Auditoría anual acreditada',
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
        evaluar: (s) => porCobertura(s.con_poligono, s.parcelas, 'parcelas con polígono'),
      },
      {
        label: 'Sin pérdida de cobertura detectada',
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
        evaluar: NO_RASTREADO('Programa de verificación externo — fuera de este sistema'),
      },
    ],
  },
  {
    slug: 'smeta',
    nombre: 'SMETA / Sedex',
    tipo: 'Metodología de auditoría',
    alcance: 'Global — cualquier industria',
    requisitos: [
      { label: 'Documentación de auditoría social', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
      { label: 'Registro de condiciones laborales', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
      { label: 'Plan de acciones correctivas', evaluar: NO_RASTREADO('Requiere módulo de auditoría social — no implementado') },
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
        evaluar: (s) => porCobertura(s.bitacoras, s.parcelas, 'parcelas con bitácora'),
      },
      {
        label: 'Inspección in situ',
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
      { label: 'Trazabilidad productor → parcela', evaluar: trazabilidadBase },
      { label: 'Precio mínimo + prima Fairtrade', evaluar: NO_RASTREADO('Registro de pagos y prima — fuera de este sistema') },
      { label: 'Gobernanza democrática de la cooperativa', evaluar: NO_RASTREADO('Actas y gobernanza — fuera de este sistema') },
    ],
  },
  {
    slug: 'semarnat',
    nombre: 'SEMARNAT',
    tipo: 'Permiso gubernamental',
    alcance: 'México — supervisión ambiental federal',
    requisitos: [
      { label: 'Padrón de parcelas y productores', evaluar: trazabilidadBase },
      { label: 'Manifestación de Impacto Ambiental (MIA)', evaluar: NO_RASTREADO('Trámite ante SEMARNAT — fuera de este sistema') },
      { label: 'Licencia Ambiental Única (LAU)', evaluar: NO_RASTREADO('Trámite ante SEMARNAT — fuera de este sistema') },
      { label: 'Cédula de Operación Anual (COA)', evaluar: NO_RASTREADO('Reporte anual ante SEMARNAT — fuera de este sistema') },
    ],
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
