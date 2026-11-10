// Forma de una rutina y todas las reglas que no son "pantalla".
//
// rutina.data = {
//   description, goal,
//   weeks: [{ id, label, days: [día × 7, de lunes a domingo] }],
//   volume: { mode: 'grupo'|'musculo', secondary: 0.5, ranges: { grupo: [min, max], musculo: [min, max] } },
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

export function nuevaRutina({ weeks = 1, patron } = {}) {
  return {
    description: '',
    goal: '',
    weeks: Array.from({ length: weeks }, () => nuevaSemana(patron)),
    volume: { mode: 'grupo', secondary: 0.5, ranges: { grupo: [10, 25], musculo: [10, 20] } },
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
  d.volume = { mode: 'grupo', secondary: 0.5, ...(data?.volume || {}) }
  // Un objetivo por modo: 10-20 series tiene sentido por músculo, no por grupo.
  d.volume.ranges = { grupo: [10, 25], musculo: [10, 20], ...(d.volume.ranges || {}) }
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

// Duración aproximada: ~40 s de trabajo por serie + su descanso (el último
// descanso del día no cuenta) + los minutos de las entradas por tiempo.
export function duracionDia(dia) {
  let seg = 0
  let ultimoDescanso = 0
  for (const e of dia.entries) {
    if (e.mode === 'time') { seg += (parseFloat(e.cardio?.duration) || 0) * 60; continue }
    for (const s of e.sets) {
      const descanso = e.superset ? 15 : Number(s.rest) || 0
      seg += 40 + descanso
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
