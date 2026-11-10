// Contador de series por músculo o por grupo muscular.
//
// Reglas:
// - Solo cuentan las series efectivas (las de calentamiento no).
// - Las entradas por tiempo (cardio) no suman series.
// - Músculo principal = 1 serie; secundario = `secondary` (0.5 por defecto,
//   0 para ignorarlos, 1 para contarlos enteros).
// - Por grupo: un ejercicio que toca dos músculos del mismo grupo cuenta UNA
//   vez para ese grupo (con el mayor peso de los dos), no dos. Un press banca
//   no son dos series de pecho porque toque pectoral y pectoral superior.

export function calcularVolumen(data, { porId, taxonomia }, { mode = 'grupo', secondary = 0.5 } = {}) {
  const grupoDe = new Map()
  for (const g of taxonomia) for (const m of g.muscles) grupoDe.set(m.id, g.id)

  const filas = mode === 'grupo'
    ? taxonomia.map((g) => ({ id: g.id, name: g.name, grupo: g.name }))
    : taxonomia.flatMap((g) => g.muscles.map((m) => ({ id: m.id, name: m.name, grupo: g.name, grupoId: g.id })))

  const semanas = data.weeks.map(() => new Map())
  // Detalle: qué ejercicios aportan a cada fila (para el desplegable).
  const aportes = new Map()

  data.weeks.forEach((w, wi) => {
    w.days.forEach((d, di) => {
      for (const e of d.entries) {
        if (e.mode === 'time') continue
        const n = e.sets.filter((s) => s.kind !== 'calentamiento').length
        if (!n) continue
        const ej = porId.get(e.exerciseId)
        if (!ej) continue
        const pesos = new Map()
        const sumar = (musculo, peso) => {
          const clave = mode === 'grupo' ? grupoDe.get(musculo) : musculo
          if (!clave || !peso) return
          pesos.set(clave, Math.max(pesos.get(clave) || 0, peso))
        }
        ej.secondary.forEach((m) => sumar(m, secondary))
        ej.primary.forEach((m) => sumar(m, 1))
        for (const [clave, peso] of pesos) {
          const v = n * peso
          semanas[wi].set(clave, (semanas[wi].get(clave) || 0) + v)
          if (!aportes.has(clave)) aportes.set(clave, new Map())
          const a = aportes.get(clave)
          const k = e.exerciseId
          const prev = a.get(k) || { name: ej.name, sets: 0, dias: new Set(), principal: peso === 1 }
          prev.sets += v
          prev.dias.add(`${wi}-${di}`)
          a.set(k, prev)
        }
      }
    })
  })

  const nSemanas = data.weeks.length
  const resultado = filas.map((f) => {
    const porSemana = semanas.map((m) => m.get(f.id) || 0)
    const total = porSemana.reduce((a, b) => a + b, 0)
    // Frecuencia: en cuántos días distintos se entrena (media por semana).
    const dias = new Set()
    for (const a of aportes.get(f.id)?.values() || []) a.dias.forEach((x) => dias.add(x))
    return {
      ...f,
      porSemana,
      total,
      media: nSemanas ? total / nSemanas : 0,
      frecuencia: nSemanas ? dias.size / nSemanas : 0,
      ejercicios: [...(aportes.get(f.id)?.values() || [])].sort((a, b) => b.sets - a.sets),
    }
  })
  return resultado
}

export const redondear = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
