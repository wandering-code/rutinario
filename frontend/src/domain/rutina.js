// Forma de una rutina y todas las reglas que no son "pantalla".
//
// rutina.data = {
//   description, goal,
//   weeks: [{ id, label, days: [día × 7, de lunes a domingo] }],
//   volume: { mode: 'grupo'|'musculo', secondary: 0.5, objetivo: 'ciencia'|'propio',
//             ranges: { grupo: [min, max], musculo: [min, max] } },   // ranges: solo con objetivo 'propio'
// }
// día   = { id, type, title, notes, entries: [entrada] }
// entrada = { id, exerciseId, name, mode: 'sets'|'time', detailed,
//             sets: [{ id, reps, load, rir, rest, kind }],
//             cardio: { duration, intensity, distance },
//             tempo, notes, superset }
//
// `superset: true` en una entrada la une con la SIGUIENTE (A1 → A2).

// crypto.randomUUID solo existe en contextos seguros, y en LAN por http
// (probando desde el móvil) no lo es.
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DIAS_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const TIPOS_DIA = [
  { id: 'fuerza', name: 'Fuerza', color: 'var(--color-t-fuerza)' },
  { id: 'cardio', name: 'Cardio', color: 'var(--color-t-cardio)' },
  { id: 'movilidad', name: 'Movilidad', color: 'var(--color-t-movilidad)' },
  { id: 'deporte', name: 'Deporte', color: 'var(--color-t-deporte)' },
  { id: 'activo', name: 'Descanso activo', color: 'var(--color-t-activo)' },
  { id: 'descanso', name: 'Descanso', color: 'var(--color-t-descanso)' },
]
export const TIPO = Object.fromEntries(TIPOS_DIA.map((t) => [t.id, t]))
export const esEntreno = (tipo) => tipo !== 'descanso'

export const TIPOS_SERIE = [
  { id: 'normal', name: 'Efectiva', corto: '' },
  { id: 'calentamiento', name: 'Calentamiento', corto: 'C' },
  { id: 'drop', name: 'Drop set', corto: 'D' },
  { id: 'fallo', name: 'Al fallo', corto: 'F' },
  { id: 'amrap', name: 'AMRAP', corto: 'A' },
]
export const SERIE = Object.fromEntries(TIPOS_SERIE.map((t) => [t.id, t]))

export const MATERIAL = [
  { id: 'barra', name: 'Barra' },
  { id: 'mancuernas', name: 'Mancuernas' },
  { id: 'maquina', name: 'Máquina' },
  { id: 'polea', name: 'Polea' },
  { id: 'peso-corporal', name: 'Peso corporal' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'banda', name: 'Banda elástica' },
  { id: 'otro', name: 'Otro' },
]
export const MATERIAL_NOMBRE = Object.fromEntries(MATERIAL.map((m) => [m.id, m.name]))

export const TIPOS_EJERCICIO = [
  { id: 'fuerza', name: 'Fuerza' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'movilidad', name: 'Movilidad' },
]

// ── Fábricas ────────────────────────────────────────────────────────────

export const nuevaSerie = (base = {}) => ({ reps: '10', load: '', rir: '', rest: 90, kind: 'normal', ...base, id: uid() })

export function nuevaEntrada(ejercicio) {
  const tiempo = ejercicio?.kind === 'cardio'
  return {
    id: uid(),
    exerciseId: ejercicio?.id ?? null,
    name: ejercicio?.name ?? 'Ejercicio',
    mode: tiempo ? 'time' : 'sets',
    detailed: false,
    sets: tiempo ? [] : [nuevaSerie(), nuevaSerie(), nuevaSerie()],
    cardio: { duration: tiempo ? '30' : '', intensity: '', distance: '' },
    tempo: '',
    notes: '',
    superset: false,
  }
}

export const nuevoDia = (type = 'descanso') => ({ id: uid(), type, title: '', notes: '', entries: [] })

export function nuevaSemana(patron = ['fuerza', 'fuerza', 'descanso', 'fuerza', 'fuerza', 'cardio', 'descanso']) {
  return { id: uid(), label: '', days: patron.map((t) => nuevoDia(t)) }
}

// Volumen semanal recomendado para hipertrofia: 10-20 series efectivas por
// músculo, con los secundarios a ½. Fuentes en VOLUMEN_FUENTES.
export const VOLUMEN_RECOMENDADO = { rango: [10, 20], secundarios: 0.5 }
export const VOLUMEN_FUENTES = [
  { cita: 'Schoenfeld et al. 2017', que: '10 o más series por músculo y semana: más crecimiento que con menos', url: 'https://doi.org/10.1080/02640414.2016.1210197' },
  { cita: 'Baz-Valle et al. 2022', que: '12-20 series por músculo y semana en gente entrenada', url: 'https://pubmed.ncbi.nlm.nih.gov/35291645/' },
  { cita: 'Pelland et al. 2026', que: 'contar los secundarios como ½ serie; más volumen sigue sumando, cada vez menos', url: 'https://doi.org/10.1007/s40279-025-02344-w' },
]

// Objetivo por músculo: rango MAV («volumen adaptativo máximo», donde se crece
// más) de las tablas de Renaissance Periodization (Israetel et al.), en series
// directas por semana, para un programa de cuerpo entero y nivel intermedio.
// También se guardan MEV (mínimo eficaz) y MRV (máximo recuperable) para
// mostrarlos. RP no da cifra legible para espalda (la tabla es una imagen) ni
// para pectoral superior, lumbar, aductores, abductores u oblicuos: espalda y
// hombros (grupo) usan el rango general de los metaanálisis, y el resto se
// queda sin objetivo en vez de inventarlo.
const rp = (nombre, slug, mev, mav, mrv) => ({
  rango: mav, mev, mrv,
  fuente: { cita: `RP · ${nombre}`, url: `https://rpstrength.com/blogs/articles/${slug}` },
})
const RP = {
  pecho: rp('Pecho', 'chest-hypertrophy-training-tips', '4-6', [6, 16], '16-24'),
  trapecio: rp('Trapecio', 'trap-hypertrophy-training-tips', '0-4', [4, 12], '12-20'),
  deltAnt: rp('Deltoide anterior', 'front-delt-hypertrophy-training-tips', '0-2', [4, 8], '8-12'),
  deltLat: rp('Deltoide lateral', 'side-delt-hypertrophy-training-tips', '6-8', [8, 24], '24-30'),
  deltPost: rp('Deltoide posterior', 'rear-delt-hypertrophy-training-tips', '0-4', [4, 12], '12-20'),
  biceps: rp('Bíceps', 'bicep-hypertrophy-training-tips', '8-10', [14, 20], '20-26'),
  triceps: rp('Tríceps', 'triceps-hypertrophy-training-tips', '4-6', [6, 16], '16-20'),
  antebrazo: rp('Antebrazo', 'forearm-hypertrophy-training-tips', '0-8', [8, 24], '24-30'),
  cuadriceps: rp('Cuádriceps', 'quad-hypertrophy-training-tips', '4-6', [6, 14], '14-18'),
  isquios: rp('Isquiotibiales', 'hamstring-hypertrophy-training-tips', '2-4', [2, 8], '8-14'),
  gluteos: rp('Glúteos', 'glute-hypertrophy-training-tips', '6-8', [8, 24], '24-30'),
  gemelos: rp('Gemelos', 'calves-hypertrophy-training-tips', '4-6', [6, 16], '16-24'),
  abdomen: rp('Abdomen', 'ab-hypertrophy-training-tips', '0-4', [4, 12], '12-20'),
}
const GENERAL = { rango: VOLUMEN_RECOMENDADO.rango, general: true, fuente: { cita: 'Rango general (metaanálisis)', url: VOLUMEN_FUENTES[1].url } }
// Por id de músculo o de grupo (los de la taxonomía por defecto; si se crean
// otros en Ajustes, se quedan sin objetivo recomendado).
export const VOLUMEN_POR_ID = {
  // músculos
  pectoral: RP.pecho, dorsal: GENERAL, 'espalda-media': GENERAL, trapecio: RP.trapecio,
  'delt-ant': RP.deltAnt, 'delt-lat': RP.deltLat, 'delt-post': RP.deltPost,
  biceps: RP.biceps, triceps: RP.triceps, antebrazo: RP.antebrazo,
  cuadriceps: RP.cuadriceps, isquios: RP.isquios, gluteos: RP.gluteos, gemelos: RP.gemelos, abdomen: RP.abdomen,
  // grupos
  pecho: RP.pecho, espalda: GENERAL, hombros: GENERAL,
  'g-biceps': RP.biceps, 'g-triceps': RP.triceps, 'g-antebrazo': RP.antebrazo,
  'g-cuadriceps': RP.cuadriceps, 'g-isquios': RP.isquios, 'g-gluteos': RP.gluteos, 'g-gemelos': RP.gemelos, core: RP.abdomen,
}

// Objetivo de una fila del contador: { rango, fuente?, mev?, mrv? } o null.
export function objetivoDe(id, cfg) {
  if (cfg.objetivo === 'propio') return { rango: cfg.ranges[cfg.mode] }
  return VOLUMEN_POR_ID[id] || null
}

export function nuevaRutina({ weeks = 1, patron } = {}) {
  return {
    description: '',
    goal: '',
    weeks: Array.from({ length: weeks }, () => nuevaSemana(patron)),
    volume: { mode: 'grupo', secondary: VOLUMEN_RECOMENDADO.secundarios, objetivo: 'ciencia', ranges: { grupo: [...VOLUMEN_RECOMENDADO.rango], musculo: [...VOLUMEN_RECOMENDADO.rango] } },
  }
}

// Copia profunda con ids nuevos (duplicar un día, una semana o una rutina).
export function clonar(obj) {
  const c = structuredClone(obj)
  const renovar = (o) => {
    if (Array.isArray(o)) o.forEach(renovar)
    else if (o && typeof o === 'object') {
      if ('id' in o && typeof o.id === 'string') o.id = uid()
      Object.values(o).forEach(renovar)
    }
  }
  renovar(c)
  return c
}

// Las rutinas guardadas pueden venir de versiones anteriores de la app o de un
// JSON importado: esto rellena lo que falte sin perder nada.
export function normalizar(data) {
  const d = { ...nuevaRutina({ weeks: 0 }), ...(data || {}) }
  d.volume = { mode: 'grupo', secondary: VOLUMEN_RECOMENDADO.secundarios, objetivo: 'ciencia', ...(data?.volume || {}) }
  // Un objetivo por modo: 10-20 series tiene sentido por músculo, no por grupo.
  d.volume.ranges = { grupo: [...VOLUMEN_RECOMENDADO.rango], musculo: [...VOLUMEN_RECOMENDADO.rango], ...(d.volume.ranges || {}) }
  delete d.volume.range
  if (!Array.isArray(d.weeks) || d.weeks.length === 0) d.weeks = [nuevaSemana()]
  d.weeks = d.weeks.map((w) => ({
    id: w.id || uid(),
    label: w.label || '',
    days: Array.from({ length: 7 }, (_, i) => {
      const day = w.days?.[i] || nuevoDia()
      return {
        ...nuevoDia(), ...day,
        id: day.id || uid(),
        entries: (day.entries || []).map((e) => ({
          ...nuevaEntrada(), ...e,
          id: e.id || uid(),
          sets: (e.sets || []).map((s) => ({ ...nuevaSerie(), ...s, id: s.id || uid() })),
          cardio: { duration: '', intensity: '', distance: '', ...(e.cardio || {}) },
        })),
      }
    }),
  }))
  return d
}

// Nombres al día con la biblioteca: si un ejercicio se renombra, sus copias en
// la rutina también. Devuelve true si ha cambiado algo (modifica `data`).
export function sincronizarNombres(data, porId) {
  let cambiado = false
  for (const w of data.weeks) for (const d of w.days) for (const e of d.entries) {
    const nombre = porId.get(e.exerciseId)?.name
    if (nombre && nombre !== e.name) { e.name = nombre; cambiado = true }
  }
  return cambiado
}

// ── Formato ─────────────────────────────────────────────────────────────

export function formatoDescanso(seg) {
  const s = Number(seg) || 0
  if (!s) return ''
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`
}

export function formatoMinutos(min) {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h} h${m % 60 ? ` ${m % 60} min` : ''}`
}

const efectivas = (sets) => sets.filter((s) => s.kind !== 'calentamiento')

// "4 × 8-10 · RIR 2 · 1:30 min" si todas las series son iguales;
// "4 series: 12 / 10 / 8 / 6 · 1:30 min" si cambian.
export function resumenEntrada(e) {
  if (e.mode === 'time') {
    const c = e.cardio || {}
    return [c.duration && `${c.duration} min`, c.distance && c.distance, c.intensity].filter(Boolean).join(' · ') || 'Sin detallar'
  }
  const sets = e.sets || []
  if (!sets.length) return 'Sin series'
  const ef = efectivas(sets)
  const calent = sets.length - ef.length
  const base = ef.length ? ef : sets
  const reps = base.map((s) => s.reps || '—')
  const iguales = reps.every((r) => r === reps[0])
  const cargas = base.map((s) => s.load).filter(Boolean)
  const cargaIgual = cargas.length === base.length && cargas.every((c) => c === cargas[0])
  const rirs = base.map((s) => s.rir).filter(Boolean)
  const rirIgual = rirs.length === base.length && rirs.every((r) => r === rirs[0])
  const descansos = base.map((s) => Number(s.rest) || 0)
  const descansoIgual = descansos.every((d) => d === descansos[0])

  const partes = [iguales ? `${base.length} × ${reps[0]}` : `${base.length} series: ${reps.join(' / ')}`]
  if (cargaIgual) partes.push(cargas[0])
  if (rirIgual) partes.push(`RIR ${rirs[0]}`)
  if (descansoIgual && descansos[0]) partes.push(formatoDescanso(descansos[0]))
  const especiales = [...new Set(base.map((s) => s.kind).filter((k) => k !== 'normal'))].map((k) => SERIE[k]?.name)
  if (especiales.length) partes.push(especiales.join(', '))
  if (calent) partes.push(`+${calent} calent.`)
  return partes.join(' · ')
}

// Letras de superserie: A1, A2 / B1, B2… Las entradas sueltas no llevan.
export function etiquetasSuperserie(entries) {
  const out = {}
  let letra = 0
  let i = 0
  while (i < entries.length) {
    if (entries[i].superset && i + 1 < entries.length) {
      const L = String.fromCharCode(65 + (letra++ % 26))
      let n = 1
      while (i < entries.length) {
        out[entries[i].id] = `${L}${n++}`
        if (!entries[i].superset) break
        i++
      }
    }
    i++
  }
  return out
}

// Duración aproximada de un día, calibrada con sesiones reales (contar solo
// series + descanso programado se quedaba en la mitad del tiempo real):
//  · ~45 s de trabajo por serie (8-12 reps controladas + colocarse).
//  · Descanso programado + ~20 s de margen (cargar discos, apuntar, beber):
//    el descanso real casi nunca es el del cronómetro. El último del día no cuenta.
//  · ~3 min por ejercicio (o por superserie entera) para cambiar de máquina,
//    ajustarla y hacer la aproximación.
//  · Las entradas por tiempo suman sus minutos tal cual.
const TRABAJO_SERIE = 45
const MARGEN_DESCANSO = 20
const CAMBIO_EJERCICIO = 180

export function duracionDia(dia) {
  let seg = 0
  let ultimoDescanso = 0
  let enSuperserie = false
  for (const e of dia.entries) {
    if (e.mode === 'time') {
      seg += (parseFloat(e.cardio?.duration) || 0) * 60
      enSuperserie = false
      continue
    }
    if (!enSuperserie && e.sets.length) seg += CAMBIO_EJERCICIO
    enSuperserie = !!e.superset
    for (const s of e.sets) {
      const descanso = e.superset ? 15 : (Number(s.rest) || 0) + MARGEN_DESCANSO
      seg += TRABAJO_SERIE + descanso
      ultimoDescanso = descanso
    }
  }
  return Math.max(0, seg - ultimoDescanso) / 60
}

export const seriesDia = (dia) =>
  dia.entries.reduce((n, e) => n + (e.mode === 'time' ? 0 : efectivas(e.sets).length), 0)

export function recuentoTipos(semana) {
  const r = {}
  for (const d of semana.days) r[d.type] = (r[d.type] || 0) + 1
  return r
}

export function textoRecuento(semana) {
  const r = recuentoTipos(semana)
  return TIPOS_DIA.filter((t) => r[t.id]).map((t) => `${r[t.id]} ${t.name.toLowerCase()}`).join(' · ')
}

export const nombreSemana = (w, i) => w.label?.trim() || `Semana ${i + 1}`
