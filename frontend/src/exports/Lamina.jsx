import { forwardRef } from 'react'
import { useDatos } from '../platform/datos'
import {
  DIAS, TIPO, duracionDia, esEntreno, etiquetasSuperserie, formatoMinutos, nombreSemana, resumenEntrada, seriesDia,
  textoRecuento,
} from '../domain/rutina'

// Lo que se convierte en imagen o PDF. Lleva su propia paleta fija (clara u
// oscura), independiente del tema de la app, para que lo exportado se vea
// siempre igual en el móvil de quien lo reciba.
const PALETAS = {
  claro: { bg: '#f6f4ef', card: '#ffffff', line: '#e6e1d7', ink: '#1c1d1a', dim: '#66645d', mute: '#9a958b', acc: '#1f5c4a',
    tipos: { fuerza: '#1f5c4a', cardio: '#cf5a37', movilidad: '#6b58a8', deporte: '#b8801b', activo: '#6f8f5c', descanso: '#a39e94' } },
  oscuro: { bg: '#121311', card: '#1d1f1c', line: '#30332e', ink: '#f0efea', dim: '#b0ada4', mute: '#7f7c74', acc: '#5fbf9c',
    tipos: { fuerza: '#5fbf9c', cardio: '#f08a66', movilidad: '#a492e0', deporte: '#e3b04f', activo: '#9cc285', descanso: '#7f7c74' } },
}

export const ANCHOS = { horizontal: 1680, vertical: 1080, dia: 1080 }

function Entrada({ e, etiqueta, p, notas, fotos, grande, porId }) {
  const img = fotos ? porId.get(e.exerciseId)?.images?.[0] : null
  return (
    <div style={{ display: 'flex', gap: grande ? 18 : 10, alignItems: 'flex-start', padding: grande ? '16px 0' : '9px 0', borderTop: `1px solid ${p.line}` }}>
      {img && <img src={img} alt="" style={{ width: grande ? 88 : 40, height: grande ? 88 : 40, borderRadius: grande ? 16 : 9, objectFit: 'cover', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          {etiqueta && <span style={{ fontSize: grande ? 15 : 10.5, fontWeight: 700, color: p.acc, flexShrink: 0 }}>{etiqueta}</span>}
          <span style={{ fontSize: grande ? 26 : 14, fontWeight: 600, lineHeight: 1.25, color: p.ink }}>{e.name}</span>
        </div>
        <div style={{ fontSize: grande ? 20 : 12.5, color: p.dim, marginTop: grande ? 4 : 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1.35 }}>{resumenEntrada(e)}{e.tempo ? ` · Tempo ${e.tempo}` : ''}</div>
        {notas && e.notes && <div style={{ fontSize: grande ? 17 : 11.5, color: p.mute, marginTop: 3, fontStyle: 'italic', whiteSpace: 'pre-line' }}>{e.notes}</div>}
      </div>
    </div>
  )
}

// Tres tamaños: pequeño (columnas de la semana), medio (vertical), grande (un día).
const TAM = {
  peq: { dia: 11.5, tipo: 10.5, pad: '2px 8px', titulo: 18, meta: 11.5, mt: 6 },
  med: { dia: 15, tipo: 13, pad: '3px 10px', titulo: 28, meta: 15, mt: 8 },
  grande: { dia: 18, tipo: 16, pad: '4px 12px', titulo: 44, meta: 18, mt: 10 },
}

function CabeceraDia({ d, i, p, tam = 'peq' }) {
  const c = p.tipos[d.type]
  const t = TAM[tam]
  const series = seriesDia(d)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: t.dia, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.mute }}>{DIAS[i]}</span>
        <span style={{ fontSize: t.tipo, fontWeight: 600, color: c, background: `${c}1f`, padding: t.pad, borderRadius: 99 }}>{TIPO[d.type].name}</span>
      </div>
      {d.title && <div style={{ fontFamily: 'Public Sans, sans-serif', fontSize: t.titulo, fontWeight: 700, letterSpacing: '-0.02em', marginTop: t.mt, color: p.ink, lineHeight: 1.1 }}>{d.title}</div>}
      {series > 0 && <div style={{ fontSize: t.meta, color: p.mute, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{d.entries.length} ejercicios · {series} series · ~{formatoMinutos(duracionDia(d))}</div>}
    </div>
  )
}

export const Lamina = forwardRef(function Lamina({ nombre, data, semana = 0, formato = 'horizontal', dia = 0, notas = true, fotos = false, tema = 'claro' }, ref) {
  const { porId } = useDatos()
  const p = PALETAS[tema]
  const w = data.weeks[semana] || data.weeks[0]
  const ancho = ANCHOS[formato]
  const base = { width: ancho, background: p.bg, color: p.ink, fontFamily: 'Inter, system-ui, sans-serif', padding: formato === 'horizontal' ? 48 : 64, boxSizing: 'border-box' }
  const subtitulo = [data.weeks.length > 1 && nombreSemana(w, semana), textoRecuento(w)].filter(Boolean).join('  ·  ')

  const pie = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, fontSize: formato === 'horizontal' ? 12 : 16, color: p.mute }}>
      <span>{data.goal}</span>
      <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>Rutinario</span>
    </div>
  )

  if (formato === 'dia') {
    const d = w.days[dia]
    const et = etiquetasSuperserie(d.entries)
    return (
      <div ref={ref} style={base}>
        <div style={{ fontSize: 18, color: p.mute, fontWeight: 600 }}>{nombre}{data.weeks.length > 1 ? ` · ${nombreSemana(w, semana)}` : ''}</div>
        <div style={{ marginTop: 28 }}><CabeceraDia d={d} i={dia} p={p} tam="grande" /></div>
        {notas && d.notes && <div style={{ fontSize: 19, color: p.dim, marginTop: 18, whiteSpace: 'pre-line', lineHeight: 1.45 }}>{d.notes}</div>}
        <div style={{ marginTop: 28, background: p.card, borderRadius: 28, padding: '8px 32px', border: `1px solid ${p.line}` }}>
          {d.entries.length ? d.entries.map((e, ei) => (
            <div key={e.id} style={ei === 0 ? { marginTop: -1 } : undefined}>
              <Entrada e={e} etiqueta={et[e.id] || ei + 1} p={p} notas={notas} fotos={fotos} grande porId={porId} />
            </div>
          )) : <div style={{ padding: '40px 0', textAlign: 'center', color: p.mute, fontSize: 22 }}>{esEntreno(d.type) ? 'Sin ejercicios' : 'Día de descanso'}</div>}
        </div>
        {pie}
      </div>
    )
  }

  if (formato === 'vertical') {
    return (
      <div ref={ref} style={base}>
        <div style={{ fontFamily: 'Public Sans, sans-serif', fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{nombre}</div>
        <div style={{ fontSize: 20, color: p.dim, marginTop: 12 }}>{subtitulo}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 36 }}>
          {w.days.map((d, i) => {
            const et = etiquetasSuperserie(d.entries)
            const c = p.tipos[d.type]
            if (!d.entries.length) {
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 22, background: p.card, border: `1px solid ${p.line}` }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: c }} />
                  <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.mute, width: 150 }}>{DIAS[i]}</span>
                  <span style={{ fontSize: 22, color: p.dim }}>{d.title || TIPO[d.type].name}</span>
                </div>
              )
            }
            return (
              <div key={d.id} style={{ padding: '22px 28px 10px', borderRadius: 26, background: p.card, border: `1px solid ${p.line}`, borderLeft: `6px solid ${c}` }}>
                <CabeceraDia d={d} i={i} p={p} tam="med" />
                <div style={{ marginTop: 12 }}>
                  {d.entries.map((e, ei) => (
                    <div key={e.id} style={{ fontSize: 19 }}>
                      <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: `1px solid ${p.line}`, alignItems: 'baseline' }}>
                        <span style={{ width: 30, fontSize: 15, fontWeight: 700, color: p.acc }}>{et[e.id] || ei + 1}</span>
                        <span style={{ flex: 1, fontSize: 21, fontWeight: 600 }}>{e.name}</span>
                        <span style={{ fontSize: 18, color: p.dim, fontVariantNumeric: 'tabular-nums', textAlign: 'right', maxWidth: 440 }}>{resumenEntrada(e)}</span>
                      </div>
                      {notas && e.notes && <div style={{ fontSize: 15, color: p.mute, fontStyle: 'italic', margin: '-4px 0 8px 42px' }}>{e.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {pie}
      </div>
    )
  }

  // Horizontal: la semana entera, siete columnas.
  return (
    <div ref={ref} style={base}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ fontFamily: 'Public Sans, sans-serif', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{nombre}</div>
          <div style={{ fontSize: 15, color: p.dim, marginTop: 8 }}>{subtitulo}</div>
        </div>
        {data.description && <div style={{ fontSize: 13, color: p.mute, maxWidth: 520, textAlign: 'right', lineHeight: 1.45 }}>{data.description}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginTop: 28, alignItems: 'stretch' }}>
        {w.days.map((d, i) => {
          const et = etiquetasSuperserie(d.entries)
          return (
            <div key={d.id} style={{ background: p.card, borderRadius: 20, padding: '16px 16px 8px', border: `1px solid ${p.line}`, borderTop: `4px solid ${p.tipos[d.type]}`, minHeight: 220 }}>
              <CabeceraDia d={d} i={i} p={p} />
              {notas && d.notes && <div style={{ fontSize: 11.5, color: p.dim, marginTop: 8, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{d.notes}</div>}
              <div style={{ marginTop: 10 }}>
                {d.entries.map((e, ei) => <Entrada key={e.id} e={e} etiqueta={et[e.id] || ei + 1} p={p} notas={notas} fotos={fotos} porId={porId} />)}
              </div>
            </div>
          )
        })}
      </div>
      {pie}
    </div>
  )
})
