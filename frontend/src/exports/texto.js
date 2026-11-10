import {
  DIAS, SERIE, TIPO, duracionDia, esEntreno, etiquetasSuperserie, formatoDescanso, formatoMinutos, nombreSemana,
  resumenEntrada, textoRecuento,
} from '../domain/rutina'
import { semanasElegidas } from './comun'

function lineasSeries(e) {
  // Solo si las series cambian entre sí: si son iguales ya lo dice el resumen.
  const firma = (s) => [s.reps, s.load, s.rir, s.rest, s.kind].join('|')
  if (e.mode !== 'sets' || e.sets.every((s) => firma(s) === firma(e.sets[0]))) return []
  let n = 0
  return e.sets.map((s) => {
    const cal = s.kind === 'calentamiento'
    const etiqueta = cal ? 'C' : String(++n)
    return [`${etiqueta}) ${s.reps || '—'} reps`, s.load, s.rir && `RIR ${s.rir}`, s.rest && formatoDescanso(s.rest), s.kind !== 'normal' && !cal && SERIE[s.kind]?.name].filter(Boolean).join(' · ')
  })
}

// Texto plano pensado para pegar en WhatsApp/Notas: legible sin formato.
export function aTexto(nombre, data, { semanas = 'todas', notas = true } = {}) {
  const out = [nombre.toUpperCase()]
  if (data.goal) out.push(`Objetivo: ${data.goal}`)
  if (data.description) out.push(data.description)
  for (const { w, i } of semanasElegidas(data, semanas)) {
    out.push('', '━━━━━━━━━━━━━━━━')
    out.push(`${data.weeks.length > 1 ? nombreSemana(w, i).toUpperCase() + ' · ' : ''}${textoRecuento(w)}`)
    w.days.forEach((d, di) => {
      out.push('')
      const min = d.entries.length ? ` (~${formatoMinutos(duracionDia(d))})` : ''
      out.push(`▸ ${DIAS[di].toUpperCase()} · ${TIPO[d.type].name}${d.title ? ` · ${d.title}` : ''}${min}`)
      if (notas && d.notes) out.push(`  ${d.notes.replace(/\n/g, '\n  ')}`)
      const et = etiquetasSuperserie(d.entries)
      d.entries.forEach((e, ei) => {
        out.push(`  ${et[e.id] || ei + 1}. ${e.name} — ${resumenEntrada(e)}`)
        for (const l of lineasSeries(e)) out.push(`      ${l}`)
        if (e.tempo) out.push(`      Tempo ${e.tempo}`)
        if (notas && e.notes) out.push(`      ${e.notes.replace(/\n/g, '\n      ')}`)
      })
      if (!d.entries.length && !esEntreno(d.type)) out.push('  Descanso')
    })
  }
  return out.join('\n')
}

export function aMarkdown(nombre, data, { semanas = 'todas', notas = true } = {}) {
  const out = [`# ${nombre}`]
  if (data.goal) out.push('', `**Objetivo:** ${data.goal}`)
  if (data.description) out.push('', data.description)
  for (const { w, i } of semanasElegidas(data, semanas)) {
    out.push('', `## ${data.weeks.length > 1 ? nombreSemana(w, i) : 'Semana'}`, '', `_${textoRecuento(w)}_`)
    w.days.forEach((d, di) => {
      const min = d.entries.length ? ` · ~${formatoMinutos(duracionDia(d))}` : ''
      out.push('', `### ${DIAS[di]} — ${TIPO[d.type].name}${d.title ? `: ${d.title}` : ''}${min}`)
      if (notas && d.notes) out.push('', `> ${d.notes.replace(/\n/g, '\n> ')}`)
      if (!d.entries.length) return
      const et = etiquetasSuperserie(d.entries)
      out.push('', '| # | Ejercicio | Prescripción | Notas |', '|---|---|---|---|')
      d.entries.forEach((e, ei) => {
        const extra = [...lineasSeries(e), e.tempo && `Tempo ${e.tempo}`, notas && e.notes].filter(Boolean).join('<br>')
        out.push(`| ${et[e.id] || ei + 1} | ${e.name} | ${resumenEntrada(e)} | ${extra.replace(/\|/g, '\\|').replace(/\n/g, '<br>')} |`)
      })
    })
  }
  return out.join('\n')
}

// Una fila por serie: lo más cómodo para tratarlo luego en otra herramienta.
export function aCSV(nombre, data, { semanas = 'todas' } = {}) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const filas = [['Semana', 'Día', 'Tipo de día', 'Título', 'Orden', 'Ejercicio', 'Serie', 'Tipo de serie', 'Reps', 'Carga', 'RIR', 'Descanso (s)', 'Duración (min)', 'Distancia', 'Intensidad', 'Tempo', 'Notas']]
  for (const { w, i } of semanasElegidas(data, semanas)) {
    w.days.forEach((d, di) => {
      const et = etiquetasSuperserie(d.entries)
      if (!d.entries.length) filas.push([nombreSemana(w, i), DIAS[di], TIPO[d.type].name, d.title])
      d.entries.forEach((e, ei) => {
        const orden = et[e.id] || ei + 1
        if (e.mode === 'time') {
          filas.push([nombreSemana(w, i), DIAS[di], TIPO[d.type].name, d.title, orden, e.name, '', '', '', '', '', '', e.cardio.duration, e.cardio.distance, e.cardio.intensity, '', e.notes])
        } else {
          e.sets.forEach((s, si) => filas.push([nombreSemana(w, i), DIAS[di], TIPO[d.type].name, d.title, orden, e.name, si + 1, SERIE[s.kind]?.name, s.reps, s.load, s.rir, s.rest, '', '', '', e.tempo, si === 0 ? e.notes : '']))
        }
      })
    })
  }
  // BOM para que Excel abra bien las tildes.
  return '﻿' + filas.map((f) => f.map(esc).join(';')).join('\n')
}
