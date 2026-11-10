import {
  DIAS, SERIE, TIPO, duracionDia, etiquetasSuperserie, formatoDescanso, formatoMinutos, nombreSemana, resumenEntrada,
  textoRecuento,
} from '../domain/rutina'
import { calcularVolumen } from '../domain/volumen'
import { semanasElegidas } from './comun'

// Colores fijos (no los del tema de la app): el Excel se ve igual lo abra quien lo abra.
const HEX = {
  fuerza: '1F5C4A', cardio: 'CF5A37', movilidad: '6B58A8', deporte: 'B8801B', activo: '6F8F5C', descanso: '9A958B',
}
const tenue = (hex) => {
  // Mezcla al 12 % con blanco, para el fondo de la fila del día.
  const n = parseInt(hex, 16)
  const mix = (c) => Math.round(255 - (255 - c) * 0.12).toString(16).padStart(2, '0')
  return `${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`.toUpperCase()
}
const borde = { style: 'thin', color: { argb: 'FFE3DED4' } }
const bordes = { top: borde, bottom: borde, left: borde, right: borde }

export async function aExcel(nombre, data, datos, { semanas = 'todas', notas = true } = {}) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Rutinario'
  wb.created = new Date()

  for (const { w, i } of semanasElegidas(data, semanas)) {
    const titulo = data.weeks.length > 1 ? nombreSemana(w, i) : 'Rutina'
    const ws = wb.addWorksheet(titulo.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
    ws.columns = [
      { key: 'orden', width: 6 }, { key: 'ej', width: 34 }, { key: 'series', width: 8 }, { key: 'reps', width: 12 },
      { key: 'carga', width: 12 }, { key: 'rir', width: 7 }, { key: 'desc', width: 11 }, { key: 'tempo', width: 10 },
      { key: 'resumen', width: 36 }, ...(notas ? [{ key: 'notas', width: 44 }] : []),
    ]
    const nCol = ws.columns.length

    ws.mergeCells(1, 1, 1, nCol)
    Object.assign(ws.getCell(1, 1), { value: nombre, font: { size: 18, bold: true, color: { argb: 'FF1C1D1A' } } })
    ws.getRow(1).height = 28
    ws.mergeCells(2, 1, 2, nCol)
    Object.assign(ws.getCell(2, 1), {
      value: [data.weeks.length > 1 && nombreSemana(w, i), textoRecuento(w), data.goal].filter(Boolean).join('   ·   '),
      font: { size: 11, color: { argb: 'FF66645D' } },
    })

    const cab = ws.getRow(4)
    cab.values = ['#', 'Ejercicio', 'Series', 'Reps', 'Carga', 'RIR', 'Descanso', 'Tempo', 'Resumen', ...(notas ? ['Notas'] : [])]
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1D1A' } }
      c.alignment = { vertical: 'middle' }
    })
    cab.height = 22

    w.days.forEach((d, di) => {
      const color = HEX[d.type] || HEX.descanso
      const min = d.entries.length ? `  ·  ~${formatoMinutos(duracionDia(d))}` : ''
      const fila = ws.addRow([`${DIAS[di]}  ·  ${TIPO[d.type].name}${d.title ? `  ·  ${d.title}` : ''}${min}`])
      ws.mergeCells(fila.number, 1, fila.number, nCol)
      const c = fila.getCell(1)
      c.font = { bold: true, size: 12, color: { argb: `FF${color}` } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${tenue(color)}` } }
      c.border = { left: { style: 'thick', color: { argb: `FF${color}` } } }
      fila.height = 22
      if (notas && d.notes) {
        const n = ws.addRow([d.notes])
        ws.mergeCells(n.number, 1, n.number, nCol)
        n.getCell(1).font = { italic: true, color: { argb: 'FF66645D' } }
        n.getCell(1).alignment = { wrapText: true }
      }
      const et = etiquetasSuperserie(d.entries)
      d.entries.forEach((e, ei) => {
        const ef = e.sets.filter((s) => s.kind !== 'calentamiento')
        const s0 = ef[0] || e.sets[0] || {}
        const iguales = (k) => ef.every((s) => s[k] === s0[k])
        const r = ws.addRow({
          orden: et[e.id] || ei + 1,
          ej: e.name,
          series: e.mode === 'time' ? '' : ef.length,
          reps: e.mode === 'time' ? '' : iguales('reps') ? s0.reps : ef.map((s) => s.reps).join(' / '),
          carga: e.mode === 'time' ? e.cardio.distance : iguales('load') ? s0.load : ef.map((s) => s.load || '—').join(' / '),
          rir: e.mode === 'time' ? '' : iguales('rir') ? s0.rir : ef.map((s) => s.rir || '—').join('/'),
          desc: e.mode === 'time' ? `${e.cardio.duration} min` : iguales('rest') ? formatoDescanso(s0.rest) : 'Variable',
          tempo: e.tempo,
          resumen: resumenEntrada(e),
          ...(notas ? { notas: e.notes } : {}),
        })
        r.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = bordes
          cell.alignment = { vertical: 'top', wrapText: true }
        })
        r.getCell('ej').font = { bold: true }
        r.getCell('orden').alignment = { horizontal: 'center', vertical: 'top' }
      })
      ws.addRow([])
    })
  }

  // Volumen semanal
  const filas = calcularVolumen(data, datos, data.volume).filter((f) => f.total > 0)
  if (filas.length) {
    const ws = wb.addWorksheet('Series por músculo')
    const n = data.weeks.length
    ws.columns = [{ width: 24 }, { width: 18 }, ...data.weeks.map(() => ({ width: 11 })), ...(n > 1 ? [{ width: 12 }] : [])]
    const cab = ws.addRow([data.volume.mode === 'grupo' ? 'Grupo' : 'Músculo', data.volume.mode === 'grupo' ? '' : 'Grupo', ...data.weeks.map((w, i) => nombreSemana(w, i)), ...(n > 1 ? ['Media'] : [])])
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1D1A' } }
    })
    const [min, max] = data.volume.ranges[data.volume.mode]
    for (const f of filas) {
      const r = ws.addRow([f.name, data.volume.mode === 'grupo' ? '' : f.grupo, ...f.porSemana, ...(n > 1 ? [Math.round(f.media * 10) / 10] : [])])
      const v = f.media
      const color = v < min ? 'FFB7791F' : v > max ? 'FFB3412A' : 'FF3D7A4F'
      r.getCell(r.cellCount).font = { bold: true, color: { argb: color } }
      r.eachCell({ includeEmpty: true }, (c) => { c.border = bordes })
    }
    ws.addRow([])
    ws.addRow([`Series efectivas (sin calentamiento). Secundarios cuentan ${data.volume.secondary}. Objetivo: ${min}–${max} series/semana.`]).getCell(1).font = { italic: true, color: { argb: 'FF8A867D' } }
  }

  // Detalle serie a serie, para las entradas que lo tienen.
  const detalladas = []
  for (const { w, i } of semanasElegidas(data, semanas)) w.days.forEach((d, di) => d.entries.forEach((e) => { if (e.mode === 'sets' && e.detailed) detalladas.push({ w, i, di, e }) }))
  if (detalladas.length) {
    const ws = wb.addWorksheet('Detalle por serie')
    ws.columns = [{ width: 14 }, { width: 12 }, { width: 32 }, { width: 8 }, { width: 14 }, { width: 10 }, { width: 12 }, { width: 8 }, { width: 11 }]
    const cab = ws.addRow(['Semana', 'Día', 'Ejercicio', 'Serie', 'Tipo', 'Reps', 'Carga', 'RIR', 'Descanso'])
    cab.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1D1A' } } })
    for (const { w, i, di, e } of detalladas) {
      e.sets.forEach((s, si) => ws.addRow([nombreSemana(w, i), DIAS[di], e.name, si + 1, SERIE[s.kind]?.name, s.reps, s.load, s.rir, formatoDescanso(s.rest)]))
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
