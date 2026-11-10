import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, BotonIcono, Contador, Etiqueta, Hoja, Menu, Segmentado, SUAVE } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { Interruptor } from '../../ui/Interruptor'
import { FormularioEjercicio } from '../ejercicios/FormularioEjercicio'
import { DIAS_CORTO, TIPOS_SERIE, TIPO, formatoDescanso, nuevaSerie, resumenEntrada } from '../../domain/rutina'

const DESCANSOS = [30, 45, 60, 90, 120, 180, 240]
const INTENSIDADES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'LISS', 'HIIT', 'Intervalos']

function Descanso({ valor, onChange }) {
  const [libre, setLibre] = useState(false)
  const v = Number(valor) || 0
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {DESCANSOS.map((s) => (
          <button key={s} onClick={() => { onChange(s); setLibre(false) }}
            className={`h-8 px-3 rounded-full text-[13px] font-medium tabular transition-all duration-200 ${v === s && !libre ? 'bg-accent text-on-accent' : 'bg-surface-2/60 text-ink-dim hover:text-ink'}`}>
            {formatoDescanso(s)}
          </button>
        ))}
        <button onClick={() => setLibre(true)}
          className={`h-8 px-3 rounded-full text-[13px] font-medium transition-all duration-200 ${libre || (v && !DESCANSOS.includes(v)) ? 'bg-accent text-on-accent' : 'bg-surface-2/60 text-ink-dim hover:text-ink'}`}>
          {v && !DESCANSOS.includes(v) && !libre ? formatoDescanso(v) : 'Otro'}
        </button>
      </div>
      <AnimatePresence>
        {libre && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2 pt-2.5">
              <input autoFocus inputMode="numeric" className="campo w-28 tabular" value={valor}
                onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} />
              <span className="text-sm text-ink-dim">segundos</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CampoTexto({ label, valor, onChange, placeholder, ancho = '', modo }) {
  return (
    <label className={`block ${ancho}`}>
      <Etiqueta>{label}</Etiqueta>
      <input className="campo tabular" inputMode={modo} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

// Modo simple: todas las series efectivas comparten valores.
function SeriesSimples({ entrada, cambiar }) {
  const ef = entrada.sets.filter((s) => s.kind !== 'calentamiento')
  const cal = entrada.sets.filter((s) => s.kind === 'calentamiento')
  const base = ef[0] || nuevaSerie()

  const ponerEfectivas = (n) => cambiar((e) => {
    const c = e.sets.filter((s) => s.kind === 'calentamiento')
    const f = e.sets.filter((s) => s.kind !== 'calentamiento')
    const plantilla = f[0] || nuevaSerie()
    e.sets = [...c, ...Array.from({ length: n }, (_, i) => f[i] || nuevaSerie({ ...plantilla }))]
  }, 'n')
  const ponerCalentamiento = (n) => cambiar((e) => {
    const c = e.sets.filter((s) => s.kind === 'calentamiento')
    const f = e.sets.filter((s) => s.kind !== 'calentamiento')
    e.sets = [...Array.from({ length: n }, (_, i) => c[i] || nuevaSerie({ reps: '10', rest: 60, kind: 'calentamiento' })), ...f]
  }, 'cal')
  const campo = (k) => (v) => cambiar((e) => { e.sets.forEach((s) => { if (s.kind !== 'calentamiento') s[k] = v }) }, `simple:${k}`)
  const tipoSerie = (k) => cambiar((e) => { e.sets.forEach((s) => { if (s.kind !== 'calentamiento') s.kind = k }) })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <Etiqueta>Series</Etiqueta>
          <Contador valor={ef.length} onChange={ponerEfectivas} min={1} max={20} ancho="w-8" />
        </div>
        <CampoTexto label="Repeticiones" valor={base.reps} onChange={campo('reps')} placeholder="8-12" ancho="w-28" />
        <CampoTexto label="Carga" valor={base.load} onChange={campo('load')} placeholder="60 kg" ancho="w-28" />
        <CampoTexto label="RIR" valor={base.rir} onChange={campo('rir')} placeholder="2" ancho="w-20" modo="decimal" />
      </div>
      <div>
        <Etiqueta>Descanso entre series</Etiqueta>
        <Descanso valor={base.rest} onChange={campo('rest')} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div>
          <Etiqueta>Tipo de serie</Etiqueta>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_SERIE.filter((t) => t.id !== 'calentamiento').map((t) => (
              <button key={t.id} onClick={() => tipoSerie(t.id)}
                className={`h-8 px-3 rounded-full text-[13px] font-medium transition-all duration-200 ${base.kind === t.id ? 'bg-ink text-bg' : 'bg-surface-2/60 text-ink-dim hover:text-ink'}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Etiqueta>Calentamiento</Etiqueta>
          <Contador valor={cal.length} onChange={ponerCalentamiento} min={0} max={6} ancho="w-8" />
        </div>
      </div>
    </div>
  )
}

// Modo detallado: una fila por serie.
function SeriesDetalladas({ entrada, cambiar }) {
  const set = (i, k) => (v) => cambiar((e) => { e.sets[i][k] = v }, `det:${i}:${k}`)
  let n = 0
  return (
    <div>
      <div className="grid grid-cols-[28px_1fr_1fr_0.6fr_1fr_28px] gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-mute px-1 mb-1.5">
        <span>#</span><span>Reps</span><span>Carga</span><span>RIR</span><span>Desc. (s)</span><span />
      </div>
      <motion.div layout className="space-y-1.5">
        <AnimatePresence initial={false}>
          {entrada.sets.map((s, i) => {
            const calent = s.kind === 'calentamiento'
            if (!calent) n++
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: SUAVE }}
                className="grid grid-cols-[28px_1fr_1fr_0.6fr_1fr_28px] gap-1.5 items-center">
                <Menu alinear="izquierda"
                  boton={<button className={`w-7 h-9 rounded-lg text-[12px] font-bold tabular ${calent ? 'text-ink-mute bg-surface-2/70' : s.kind !== 'normal' ? 'text-accent bg-accent-soft' : 'text-ink-dim'}`} title="Tipo de serie">
                    {calent ? 'C' : TIPOS_SERIE.find((t) => t.id === s.kind)?.corto || n}
                  </button>}
                  items={TIPOS_SERIE.map((t) => ({ label: t.name, icono: s.kind === t.id ? 'check' : undefined, onClick: () => set(i, 'kind')(t.id) }))}
                />
                <input className="campo !px-2 !py-2 tabular text-center" value={s.reps} onChange={(e) => set(i, 'reps')(e.target.value)} placeholder="10" />
                <input className="campo !px-2 !py-2 tabular text-center" value={s.load} onChange={(e) => set(i, 'load')(e.target.value)} placeholder="—" />
                <input className="campo !px-2 !py-2 tabular text-center" value={s.rir} onChange={(e) => set(i, 'rir')(e.target.value)} placeholder="—" />
                <input className="campo !px-2 !py-2 tabular text-center" inputMode="numeric" value={s.rest} onChange={(e) => set(i, 'rest')(Number(e.target.value.replace(/\D/g, '')) || 0)} />
                <button className="w-7 h-7 grid place-items-center rounded-full text-ink-mute hover:text-danger hover:bg-danger-soft disabled:opacity-30"
                  disabled={entrada.sets.length <= 1}
                  onClick={() => cambiar((e) => { e.sets.splice(i, 1) })} aria-label="Quitar serie">
                  <Icon name="x" size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      <div className="flex gap-2 mt-3">
        <Boton tam="sm" icono="plus" onClick={() => cambiar((e) => { const u = e.sets[e.sets.length - 1]; e.sets.push(nuevaSerie(u ? { ...u } : {})) })}>Serie</Boton>
        <Boton tam="sm" variante="fantasma" icono="plus" onClick={() => cambiar((e) => { e.sets.unshift(nuevaSerie({ reps: '10', rest: 60, kind: 'calentamiento' })) })}>Calentamiento</Boton>
      </div>
    </div>
  )
}

export default function EditorEntrada({ abierta, entrada, esUltima, onClose, onChange, onBorrar, onDuplicar, onMover, onCambiarEjercicio, dias, diaActual }) {
  const { porId, musculos } = useDatos()
  // Se guarda la última entrada vista para que el contenido no desaparezca
  // de golpe mientras la hoja hace su animación de salida.
  const [ultima, setUltima] = useState(entrada)
  const [editandoBase, setEditandoBase] = useState(false)
  if (entrada && entrada !== ultima) setUltima(entrada)
  const e = entrada || ultima
  if (!e) return <Hoja abierta={false} onClose={onClose} />

  const ej = porId.get(e.exerciseId)
  const prim = (ej?.primary || []).map((m) => musculos.get(m)?.name).filter(Boolean)
  const sec = (ej?.secondary || []).map((m) => musculos.get(m)?.name).filter(Boolean)

  const cabecera = (
    <div className="flex items-center gap-3 min-w-0">
      {ej?.images?.[0] ? (
        <img src={ej.images[0]} alt="" className="w-12 h-12 rounded-2xl object-cover bg-surface-2" />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-surface-2/70 grid place-items-center text-ink-mute"><Icon name={ej?.kind === 'cardio' ? 'flame' : 'dumbbell'} size={22} /></div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-semibold tracking-tight leading-tight truncate">{e.name}</h2>
        <p className="text-[12.5px] text-ink-dim truncate tabular">{resumenEntrada(e)}</p>
      </div>
      <BotonIcono icono="pencil" label={ej ? 'Editar el ejercicio (nombre, fotos, músculos…)' : 'Añadir a la biblioteca'} onClick={() => setEditandoBase(true)} />
    </div>
  )

  // Editar la ficha del ejercicio en la biblioteca, encima de esta hoja. Si
  // ya no existe en la biblioteca (se borró), se vuelve a crear y se enlaza.
  const formularioBase = (
    <FormularioEjercicio
      abierto={abierta && editandoBase}
      inicial={ej || { name: e.name, kind: e.mode === 'time' ? 'cardio' : 'fuerza' }}
      onClose={() => setEditandoBase(false)}
      onGuardado={(g) => {
        setEditandoBase(false)
        if (!ej) onChange((x) => { x.exerciseId = g.id; x.name = g.name })
      }}
      onBorrado={() => setEditandoBase(false)}
    />
  )

  return (
    <>
    {formularioBase}
    <Hoja abierta={abierta} onClose={onClose} cabecera={cabecera} ancho={560} lado="derecha"
      pie={<>
        <Menu alinear="izquierda" boton={<BotonIcono icono="more" label="Más acciones" />}
          items={[
            { label: ej ? 'Editar el ejercicio' : 'Añadir a la biblioteca', icono: 'pencil', onClick: () => setEditandoBase(true) },
            { label: 'Cambiar por otro ejercicio', icono: 'swap', onClick: onCambiarEjercicio },
            { label: 'Duplicar', icono: 'copy', onClick: onDuplicar },
            '-',
            ...dias.map((d, i) => ({ label: `Mover al ${DIAS_CORTO[i].toLowerCase()}${d.title ? ` · ${d.title}` : ''}`, icono: 'arrowR', disabled: d.id === diaActual, onClick: () => onMover(d.id) })),
          ]} />
        <Boton variante="fantasma" icono="trash" onClick={onBorrar} className="!text-danger">Quitar</Boton>
        <div className="flex-1" />
        <Boton variante="primario" onClick={onClose}>Listo</Boton>
      </>}
    >
      <div className="space-y-6">
        {(prim.length > 0 || sec.length > 0) && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {prim.map((m) => <span key={m} className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-accent-soft text-accent">{m}</span>)}
            {sec.map((m) => <span key={m} className="text-[12px] px-2.5 py-1 rounded-full bg-surface-2/70 text-ink-dim">{m}</span>)}
          </div>
        )}

        <Segmentado
          opciones={[{ id: 'sets', name: 'Series y reps', icono: 'layers' }, { id: 'time', name: 'Por tiempo', icono: 'clock' }]}
          valor={e.mode}
          onChange={(m) => onChange((x) => {
            x.mode = m
            if (m === 'sets' && !x.sets.length) x.sets = [nuevaSerie(), nuevaSerie(), nuevaSerie()]
            if (m === 'time' && !x.cardio.duration) x.cardio.duration = '20'
          })}
        />

        {e.mode === 'sets' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Detallar cada serie</span>
              <Interruptor activo={e.detailed} onChange={(v) => onChange((x) => {
                x.detailed = v
                // Al volver a simple, todas las efectivas toman los valores de la primera.
                if (!v) {
                  const f = x.sets.find((s) => s.kind !== 'calentamiento')
                  if (f) x.sets.forEach((s) => { if (s.kind !== 'calentamiento') Object.assign(s, { reps: f.reps, load: f.load, rir: f.rir, rest: f.rest, kind: f.kind }) })
                }
              })} />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={e.detailed ? 'd' : 's'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                {e.detailed ? <SeriesDetalladas entrada={e} cambiar={onChange} /> : <SeriesSimples entrada={e} cambiar={onChange} />}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-4">
              <CampoTexto label="Duración (min)" valor={e.cardio.duration} onChange={(v) => onChange((x) => { x.cardio.duration = v.replace(/[^\d.,]/g, '') }, 'dur')} placeholder="30" ancho="w-32" modo="decimal" />
              <CampoTexto label="Distancia" valor={e.cardio.distance} onChange={(v) => onChange((x) => { x.cardio.distance = v }, 'dist')} placeholder="5 km" ancho="w-32" />
            </div>
            <div>
              <Etiqueta>Intensidad</Etiqueta>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {INTENSIDADES.map((z) => (
                  <button key={z} onClick={() => onChange((x) => { x.cardio.intensity = x.cardio.intensity === z ? '' : z })}
                    className={`h-8 px-3 rounded-full text-[13px] font-medium transition-all duration-200 ${e.cardio.intensity === z ? 'text-white' : 'bg-surface-2/60 text-ink-dim hover:text-ink'}`}
                    style={e.cardio.intensity === z ? { background: TIPO.cardio.color } : undefined}>
                    {z}
                  </button>
                ))}
              </div>
              <input className="campo" placeholder="O descríbela: 130-140 ppm, inclinación 10%…" value={INTENSIDADES.includes(e.cardio.intensity) ? '' : e.cardio.intensity}
                onChange={(ev) => onChange((x) => { x.cardio.intensity = ev.target.value }, 'int')} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
          {e.mode === 'sets' && <CampoTexto label="Tempo" valor={e.tempo} onChange={(v) => onChange((x) => { x.tempo = v }, 'tempo')} placeholder="3-1-1-0" />}
          <label className={`block ${e.mode === 'sets' ? '' : 'sm:col-span-2'}`}>
            <Etiqueta>Notas</Etiqueta>
            <textarea rows={2} className="campo resize-none" placeholder="Técnica, agarre, ajustes de la máquina…" value={e.notes}
              onChange={(ev) => onChange((x) => { x.notes = ev.target.value }, 'notes')} />
          </label>
        </div>

        <div className={`flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3 ${esUltima ? 'opacity-50' : ''}`}>
          <div>
            <div className="text-sm font-medium">Superserie con el siguiente</div>
            <div className="text-[12.5px] text-ink-dim">{esUltima ? 'Es el último ejercicio del día.' : 'Se hacen seguidos, sin descanso entre ellos.'}</div>
          </div>
          <Interruptor activo={e.superset} disabled={esUltima} onChange={(v) => onChange((x) => { x.superset = v })} />
        </div>

        {ej?.description && (
          <div className="rounded-2xl bg-surface-2/40 px-4 py-3">
            <Etiqueta>Indicaciones del ejercicio</Etiqueta>
            <p className="text-[13.5px] text-ink-dim whitespace-pre-line leading-relaxed">{ej.description}</p>
          </div>
        )}
        {sec.length === 0 && prim.length === 0 && ej?.kind === 'fuerza' && (
          <p className="text-[12.5px] text-ink-mute flex gap-1.5"><Icon name="info" size={15} />Este ejercicio no tiene músculos asignados: no sumará al contador de series.</p>
        )}
      </div>
    </Hoja>
    </>
  )
}
