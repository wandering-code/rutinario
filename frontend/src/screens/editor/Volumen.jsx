import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Segmentado, SUAVE, Etiqueta } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { calcularVolumen, redondear } from '../../domain/volumen'
import { TIPO, TIPOS_DIA, duracionDia, esEntreno, formatoMinutos, nombreSemana, recuentoTipos, seriesDia } from '../../domain/rutina'

function color(v, [min, max]) {
  if (!v) return 'var(--color-line)'
  if (v < min) return 'var(--color-warn)'
  if (v > max) return 'var(--color-danger)'
  return 'var(--color-ok)'
}

function Fila({ f, rango, escala, semanas, abierta, onToggle }) {
  const v = f.media
  const ancho = Math.min(100, (v / escala) * 100)
  return (
    <div className="border-b border-line/60 last:border-0">
      <button onClick={onToggle} className="w-full grid grid-cols-[minmax(90px,170px)_1fr_auto] items-center gap-3 sm:gap-4 py-2.5 text-left group">
        <span className={`text-[13.5px] truncate ${v ? 'font-medium' : 'text-ink-mute'}`}>{f.name}</span>
        <div className="relative h-6 rounded-lg bg-surface-2/40 overflow-hidden">
          {/* Franja del objetivo */}
          <div className="absolute inset-y-0 bg-ok/10 border-x border-ok/25"
            style={{ left: `${(rango[0] / escala) * 100}%`, width: `${((rango[1] - rango[0]) / escala) * 100}%` }} />
          <motion.div
            className="absolute inset-y-1 left-1 rounded-md"
            initial={false}
            animate={{ width: `calc(${ancho}% - 8px)`, backgroundColor: color(v, rango) }}
            transition={{ duration: 0.6, ease: SUAVE }}
            style={{ minWidth: v ? 4 : 0 }}
          />
        </div>
        <div className="flex items-center gap-3 tabular">
          {semanas > 1 && (
            <span className="hidden md:flex gap-2 text-[12px] text-ink-mute">
              {f.porSemana.map((x, i) => <span key={i} className="w-7 text-right">{redondear(x)}</span>)}
            </span>
          )}
          <span className="w-10 text-right text-[15px] font-semibold">{redondear(Math.round(v * 10) / 10)}</span>
          <Icon name="chevD" size={14} className={`text-ink-mute transition-transform duration-300 ${abierta ? 'rotate-180' : ''} ${f.ejercicios.length ? '' : 'invisible'}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {abierta && f.ejercicios.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: SUAVE }} className="overflow-hidden">
            <div className="pb-3 pl-2 sm:pl-[186px] space-y-1">
              {f.ejercicios.map((e) => (
                <div key={e.name} className="flex items-center gap-2 text-[12.5px] text-ink-dim">
                  <span className={`w-1.5 h-1.5 rounded-full ${e.principal ? 'bg-accent' : 'bg-line'}`} />
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="tabular">{redondear(Math.round((e.sets / semanas) * 10) / 10)} series/sem</span>
                </div>
              ))}
              {f.frecuencia > 0 && <div className="text-[12px] text-ink-mute pt-1">Frecuencia: {redondear(Math.round(f.frecuencia * 10) / 10)} {f.frecuencia === 1 ? 'día' : 'días'} por semana</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Dato({ label, valor, sub }) {
  return (
    <div className="rounded-2xl bg-surface border border-line/70 px-4 py-3.5 sombra-1">
      <div className="text-[12px] text-ink-mute font-medium">{label}</div>
      <div className="font-display text-2xl font-bold tracking-tight tabular mt-0.5">{valor}</div>
      {sub && <div className="text-[12px] text-ink-dim mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Volumen({ data, editar }) {
  const datos = useDatos()
  const [abierta, setAbierta] = useState(null)
  const cfg = data.volume
  const filas = useMemo(() => calcularVolumen(data, datos, cfg), [data, datos, cfg])
  const n = data.weeks.length
  const rango = cfg.ranges[cfg.mode]
  const escala = Math.max(rango[1] * 1.3, ...filas.map((f) => f.media), 1)

  const resumen = useMemo(() => {
    let series = 0, min = 0, cardio = 0
    const tipos = {}
    for (const w of data.weeks) {
      for (const d of w.days) {
        series += seriesDia(d)
        min += esEntreno(d.type) || d.entries.length ? duracionDia(d) : 0
        for (const e of d.entries) if (e.mode === 'time') cardio += parseFloat(e.cardio.duration) || 0
      }
      for (const [k, v] of Object.entries(recuentoTipos(w))) tipos[k] = (tipos[k] || 0) + v
    }
    return { series: series / n, min: min / n, cardio: cardio / n, tipos }
  }, [data, n])

  const setCfg = (k, v) => editar((d) => { d.volume[k] = v })
  const setRango = (r) => editar((d) => { d.volume.ranges[d.volume.mode] = r }, 'rango')
  const grupos = cfg.mode === 'musculo' ? datos.taxonomia.map((g) => ({ ...g, filas: filas.filter((f) => f.grupoId === g.id) })) : null
  const sinMusculos = data.weeks.some((w) => w.days.some((d) => d.entries.some((e) => e.mode === 'sets' && !datos.porId.get(e.exerciseId)?.primary?.length)))

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 lg:px-8 pb-36">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
          <Dato label="Series efectivas" valor={redondear(Math.round(resumen.series))} sub={n > 1 ? 'de media por semana' : 'por semana'} />
          <Dato label="Tiempo de entreno" valor={formatoMinutos(resumen.min)} sub="estimado por semana" />
          <Dato label="Cardio" valor={formatoMinutos(resumen.cardio)} sub="por semana" />
          <div className="rounded-2xl bg-surface border border-line/70 px-4 py-3.5 sombra-1">
            <div className="text-[12px] text-ink-mute font-medium mb-1.5">Días {n > 1 ? `(en ${n} semanas)` : ''}</div>
            <div className="space-y-0.5">
              {TIPOS_DIA.filter((t) => resumen.tipos[t.id]).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                  <span className="flex-1 text-ink-dim">{t.name}</span>
                  <span className="tabular font-semibold">{resumen.tipos[t.id]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 mb-5">
          <div>
            <Etiqueta>Contar por</Etiqueta>
            <Segmentado opciones={[{ id: 'grupo', name: 'Grupo muscular' }, { id: 'musculo', name: 'Músculo' }]} valor={cfg.mode} onChange={(v) => setCfg('mode', v)} />
          </div>
          <div>
            <Etiqueta>Secundarios</Etiqueta>
            <Segmentado opciones={[{ id: 0, name: 'No' }, { id: 0.5, name: '½' }, { id: 1, name: '1' }]} valor={cfg.secondary} onChange={(v) => setCfg('secondary', v)} />
          </div>
          <div>
            <Etiqueta>Objetivo semanal {cfg.mode === 'grupo' ? 'por grupo' : 'por músculo'}</Etiqueta>
            <div className="flex items-center gap-2 text-sm">
              <input inputMode="numeric" className="campo !w-14 text-center tabular !py-1.5" value={rango[0]} onChange={(e) => setRango([Number(e.target.value.replace(/\D/g, '')) || 0, rango[1]])} />
              <span className="text-ink-mute">–</span>
              <input inputMode="numeric" className="campo !w-14 text-center tabular !py-1.5" value={rango[1]} onChange={(e) => setRango([rango[0], Number(e.target.value.replace(/\D/g, '')) || 0])} />
              <span className="text-ink-dim">series</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl3 bg-surface border border-line/70 sombra-1 px-4 sm:px-5 py-2">
          <div className="grid grid-cols-[minmax(90px,170px)_1fr_auto] gap-3 sm:gap-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute border-b border-line/60">
            <span>{cfg.mode === 'grupo' ? 'Grupo' : 'Músculo'}</span>
            <span className="flex items-center gap-3 normal-case tracking-normal font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warn" />Bajo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ok" />En objetivo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger" />Alto</span>
            </span>
            <span className="flex items-center gap-3">
              {n > 1 && <span className="hidden md:flex gap-2">{data.weeks.map((w, i) => <span key={i} className="w-7 text-right" title={nombreSemana(w, i)}>S{i + 1}</span>)}</span>}
              <span className="w-10 text-right">{n > 1 ? 'Media' : 'Series'}</span>
              <span className="w-3.5" />
            </span>
          </div>
          {grupos ? grupos.map((g) => (
            <div key={g.id} className="pt-3">
              <div className="text-[12px] font-semibold text-ink-dim">{g.name}</div>
              {g.filas.map((f) => <Fila key={f.id} f={f} rango={rango} escala={escala} semanas={n} abierta={abierta === f.id} onToggle={() => setAbierta(abierta === f.id ? null : f.id)} />)}
            </div>
          )) : filas.map((f) => (
            <Fila key={f.id} f={f} rango={rango} escala={escala} semanas={n} abierta={abierta === f.id} onToggle={() => setAbierta(abierta === f.id ? null : f.id)} />
          ))}
        </div>
        <p className="text-[12.5px] text-ink-mute mt-3 leading-relaxed">
          Cuentan las series efectivas (no las de calentamiento). {cfg.mode === 'grupo' && 'Por grupo, un ejercicio que toca dos músculos del mismo grupo cuenta una sola vez. '}
          {n > 1 && `La cifra grande es la media de las ${n} semanas; a la izquierda, cada semana por separado.`}
          {sinMusculos && <span className="block mt-1 text-warn">Hay ejercicios sin músculos asignados: no suman. Asígnalos en Ejercicios.</span>}
        </p>
      </div>
    </div>
  )
}

