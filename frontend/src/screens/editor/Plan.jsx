import { useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, BotonIcono, Hoja, Menu, SUAVE, useAvisos } from '../../ui/piezas'
import { useEscritorio } from '../../platform/viewport'
import { ColumnaDia, SelectorTipo, menuDia } from './Dia'
import { EntradaOrdenable, TarjetaEntrada } from './Entrada'
import EditorEntrada from './EditorEntrada'
import SelectorEjercicio from './SelectorEjercicio'
import {
  DIAS, DIAS_LETRA, TIPO, clonar, duracionDia, esEntreno, etiquetasSuperserie, formatoMinutos, nombreSemana,
  nuevaEntrada, seriesDia,
} from '../../domain/rutina'

const hoyIndice = () => (new Date().getDay() + 6) % 7

function buscar(data, diaId) {
  for (let wi = 0; wi < data.weeks.length; wi++) {
    const di = data.weeks[wi].days.findIndex((d) => d.id === diaId)
    if (di >= 0) return { wi, di, dia: data.weeks[wi].days[di] }
  }
  return null
}

function buscarEntrada(data, entradaId) {
  for (const w of data.weeks) for (const d of w.days) {
    const i = d.entries.findIndex((e) => e.id === entradaId)
    if (i >= 0) return { dia: d, i, entrada: d.entries[i] }
  }
  return null
}

// ── Diálogo "copiar a otros días" ──────────────────────────────────────

function CopiarA({ abierto, onClose, data, origenId, onAplicar }) {
  const [sel, setSel] = useState(new Set())
  const alternar = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <Hoja abierta={abierto} onClose={() => { setSel(new Set()); onClose() }} titulo="Copiar a otros días" ancho={560}
      pie={<>
        <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
        <Boton variante="primario" disabled={!sel.size} onClick={() => { onAplicar([...sel]); setSel(new Set()) }}>
          Copiar a {sel.size || ''} {sel.size === 1 ? 'día' : 'días'}
        </Boton>
      </>}
    >
      <p className="text-sm text-ink-dim mb-4">Se sustituye lo que haya en los días elegidos (tipo, título, notas y ejercicios).</p>
      <div className="space-y-4">
        {data.weeks.map((w, wi) => (
          <div key={w.id}>
            {data.weeks.length > 1 && <div className="text-[12px] font-semibold text-ink-mute uppercase tracking-wider mb-2">{nombreSemana(w, wi)}</div>}
            <div className="grid grid-cols-7 gap-1.5">
              {w.days.map((d, di) => {
                const origen = d.id === origenId
                const on = sel.has(d.id)
                return (
                  <button key={d.id} disabled={origen} onClick={() => alternar(d.id)}
                    className={`h-14 rounded-xl border flex flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-all duration-200
                      ${origen ? 'border-transparent bg-surface-2 text-ink-mute' : on ? 'border-accent bg-accent text-on-accent' : 'border-line hover:border-ink-mute/40'}`}>
                    {DIAS_LETRA[di]}
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? 'currentColor' : TIPO[d.type].color }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Hoja>
  )
}

function NotasDia({ abierto, onClose, valor, onChange, titulo }) {
  return (
    <Hoja abierta={abierto} onClose={onClose} titulo={titulo} ancho={480} pie={<Boton variante="primario" onClick={onClose}>Listo</Boton>}>
      <textarea autoFocus rows={6} className="campo resize-none" placeholder="Calentamiento, indicaciones, intensidad general…" value={valor} onChange={(e) => onChange(e.target.value)} />
    </Hoja>
  )
}

// ── Vista del móvil: un día cada vez ───────────────────────────────────

function DiaMovil({ dia, indice, acciones, onAbrirEntrada, onAnadir }) {
  const { setNodeRef } = useDroppable({ id: `dia:${dia.id}`, data: { diaId: dia.id } })
  const etiquetas = etiquetasSuperserie(dia.entries)
  const series = seriesDia(dia)
  return (
    <div className="px-5 pb-36">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-display text-xl font-bold tracking-tight flex-1">{DIAS[indice]}</h2>
        <SelectorTipo tipo={dia.type} onChange={acciones.onTipo} grande />
        <Menu boton={<BotonIcono icono="more" label="Opciones del día" />} items={menuDia({ dia, ...acciones })} />
      </div>
      <input value={dia.title} onChange={(e) => acciones.onTitulo(e.target.value)}
        placeholder={esEntreno(dia.type) ? 'Añade un título (ej. Torso A)' : TIPO[dia.type].name}
        className="w-full bg-transparent text-[15px] text-ink-dim outline-none placeholder:text-ink-mute/70" />
      {series > 0 && <div className="text-[12px] text-ink-mute tabular mt-1">{dia.entries.length} ejercicios · {series} series · ~{formatoMinutos(duracionDia(dia))}</div>}
      {dia.notes && (
        <button onClick={acciones.onNotas} className="mt-3 w-full text-left text-[13px] text-ink-dim bg-surface-2/50 rounded-xl px-3 py-2 whitespace-pre-line">{dia.notes}</button>
      )}
      <div ref={setNodeRef} className="mt-4 space-y-2">
        <SortableContext items={dia.entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {dia.entries.map((e) => (
            <EntradaOrdenable key={e.id} entrada={e} diaId={dia.id} etiqueta={etiquetas[e.id]} asaSiempre onAbrir={() => onAbrirEntrada(e.id)} />
          ))}
        </SortableContext>
        {dia.type === 'descanso' && !dia.entries.length && (
          <div className="flex flex-col items-center py-10 text-ink-mute">
            <Icon name="bed" size={30} />
            <span className="text-sm mt-2">Día de descanso</span>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.98 }} onClick={onAnadir}
          className="w-full h-12 rounded-2xl border border-dashed border-line text-ink-dim hover:text-accent hover:border-accent-line text-sm font-medium flex items-center justify-center gap-1.5">
          <Icon name="plus" size={18} /> Añadir ejercicio
        </motion.button>
      </div>
    </div>
  )
}

// ── Plan ───────────────────────────────────────────────────────────────

export default function Plan({ data, semana, editar }) {
  const escritorio = useEscritorio()
  const { avisar, confirmar } = useAvisos()
  const [diaMovil, setDiaMovil] = useState(hoyIndice)
  const [direccion, setDireccion] = useState(0)
  const [entradaAbierta, setEntradaAbierta] = useState(null)
  const [selector, setSelector] = useState(null) // { diaId, reemplazar? }
  const [notas, setNotas] = useState(null)
  const [copiarA, setCopiarA] = useState(null)
  const [copiado, setCopiado] = useState(null)
  const [arrastre, setArrastre] = useState(null)

  const w = data.weeks[semana] || data.weeks[0]
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const editarDia = (diaId, fn, clave) => editar((d) => { const r = buscar(d, diaId); if (r) fn(r.dia, d) }, clave)

  const accionesDe = (dia, indice) => ({
    onTipo: (tipo) => editarDia(dia.id, (x) => { x.type = tipo }),
    onTitulo: (t) => editarDia(dia.id, (x) => { x.title = t }, `titulo:${dia.id}`),
    onNotas: () => setNotas(dia.id),
    onCopiar: () => { setCopiado(structuredClone(dia)); avisar(`${DIAS[indice]} copiado`) },
    hayCopiado: !!copiado,
    onPegar: () => {
      if (!copiado) return
      editarDia(dia.id, (x) => {
        const c = clonar(copiado)
        Object.assign(x, { type: c.type, title: c.title, notes: c.notes, entries: c.entries })
      })
      avisar('Día pegado')
    },
    onDuplicarEn: () => setCopiarA(dia.id),
    onVaciar: async () => {
      if (!(await confirmar({ titulo: `¿Vaciar el ${DIAS[indice].toLowerCase()}?`, texto: 'Se quitan todos sus ejercicios. Puedes deshacerlo con ⌘Z.', boton: 'Vaciar', peligro: true }))) return
      editarDia(dia.id, (x) => { x.entries = [] })
    },
  })

  function anadirEjercicios(diaId, ejercicios, reemplazar) {
    editarDia(diaId, (x) => {
      if (reemplazar) {
        const i = x.entries.findIndex((e) => e.id === reemplazar)
        if (i >= 0 && ejercicios[0]) {
          const nueva = nuevaEntrada(ejercicios[0])
          const vieja = x.entries[i]
          // Al cambiar de ejercicio se conservan series, notas y superserie.
          x.entries[i] = nueva.mode === vieja.mode ? { ...vieja, exerciseId: nueva.exerciseId, name: nueva.name } : { ...nueva, notes: vieja.notes, superset: vieja.superset }
        }
      } else {
        x.entries.push(...ejercicios.map(nuevaEntrada))
      }
    })
    setSelector(null)
  }

  function alSoltar({ active, over }) {
    setArrastre(null)
    if (!over || active.id === over.id) return
    const desde = active.data.current?.diaId
    const hacia = over.data.current?.diaId
    if (!desde || !hacia) return
    editar((d) => {
      const o = buscar(d, desde)
      const t = buscar(d, hacia)
      if (!o || !t) return
      const i = o.dia.entries.findIndex((e) => e.id === active.id)
      if (i < 0) return
      if (desde === hacia) {
        const j = o.dia.entries.findIndex((e) => e.id === over.id)
        if (j >= 0) o.dia.entries = arrayMove(o.dia.entries, i, j)
        return
      }
      const [mov] = o.dia.entries.splice(i, 1)
      const j = t.dia.entries.findIndex((e) => e.id === over.id)
      t.dia.entries.splice(j >= 0 ? j : t.dia.entries.length, 0, mov)
    })
  }

  const entradaActiva = arrastre ? buscarEntrada(data, arrastre)?.entrada : null
  const abierta = entradaAbierta ? buscarEntrada(data, entradaAbierta) : null
  const diaNotas = notas ? buscar(data, notas) : null
  const indicesDias = useMemo(() => w.days.map((_, i) => i), [w])

  const cambiarDiaMovil = (i) => { setDireccion(i > diaMovil ? 1 : -1); setDiaMovil((i + 7) % 7) }

  return (
    <>
      <DndContext sensors={sensores} collisionDetection={closestCorners}
        onDragStart={({ active }) => setArrastre(active.id)} onDragEnd={alSoltar} onDragCancel={() => setArrastre(null)}>
        {escritorio ? (
          <div className="h-full grid grid-cols-7 gap-2 px-4 xl:px-6 pb-5">
            {indicesDias.map((i) => (
              <ColumnaDia key={w.days[i].id} dia={w.days[i]} indice={i} hoy={i === hoyIndice()}
                acciones={accionesDe(w.days[i], i)}
                onAbrirEntrada={setEntradaAbierta}
                onAnadir={() => setSelector({ diaId: w.days[i].id })} />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="shrink-0 px-4 pb-3">
              <div className="grid grid-cols-7 gap-1">
                {w.days.map((d, i) => {
                  const on = i === diaMovil
                  return (
                    <button key={d.id} onClick={() => cambiarDiaMovil(i)} className="relative h-14 rounded-2xl flex flex-col items-center justify-center gap-1">
                      {on && <motion.span layoutId="dia-movil" className="absolute inset-0 rounded-2xl bg-surface sombra-1 border border-line/70" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                      <span className={`relative text-[13px] font-semibold ${on ? 'text-ink' : i === hoyIndice() ? 'text-accent' : 'text-ink-dim'}`}>{DIAS_LETRA[i]}</span>
                      <span className="relative flex gap-0.5 items-center h-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: TIPO[d.type].color, opacity: d.type === 'descanso' ? 0.4 : 1 }} />
                        {d.entries.length > 0 && <span className="text-[9px] tabular text-ink-mute leading-none">{d.entries.length}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <motion.div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
              onPanEnd={(_, info) => {
                if (arrastre) return
                if (Math.abs(info.offset.x) > 70 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 1.5) {
                  cambiarDiaMovil(diaMovil + (info.offset.x < 0 ? 1 : -1))
                }
              }}
              style={{ touchAction: 'pan-y' }}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
                <motion.div
                  key={w.days[diaMovil].id}
                  custom={direccion}
                  variants={{
                    entra: (d) => ({ x: d * 40, opacity: 0 }),
                    centro: { x: 0, opacity: 1 },
                    sale: (d) => ({ x: d * -40, opacity: 0 }),
                  }}
                  initial="entra" animate="centro" exit="sale"
                  transition={{ duration: 0.28, ease: SUAVE }}
                >
                  <DiaMovil dia={w.days[diaMovil]} indice={diaMovil} acciones={accionesDe(w.days[diaMovil], diaMovil)}
                    onAbrirEntrada={setEntradaAbierta} onAnadir={() => setSelector({ diaId: w.days[diaMovil].id })} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        )}
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {entradaActiva && <TarjetaEntrada entrada={entradaActiva} compacta={escritorio} superior />}
        </DragOverlay>
      </DndContext>

      <EditorEntrada
        abierta={!!abierta}
        entrada={abierta?.entrada}
        esUltima={abierta ? abierta.i === abierta.dia.entries.length - 1 : false}
        onClose={() => setEntradaAbierta(null)}
        onChange={(fn, clave) => editar((d) => { const r = buscarEntrada(d, entradaAbierta); if (r) fn(r.entrada) }, clave)}
        onBorrar={() => {
          const id = entradaAbierta
          setEntradaAbierta(null)
          editar((d) => { const r = buscarEntrada(d, id); if (r) r.dia.entries.splice(r.i, 1) })
          avisar('Ejercicio quitado', { accion: { label: 'Deshacer', onClick: () => window.dispatchEvent(new Event('rutinario:deshacer')) } })
        }}
        onDuplicar={() => {
          editar((d) => { const r = buscarEntrada(d, entradaAbierta); if (r) r.dia.entries.splice(r.i + 1, 0, clonar(r.entrada)) })
          avisar('Ejercicio duplicado')
        }}
        onMover={(diaId) => {
          const id = entradaAbierta
          editar((d) => {
            const r = buscarEntrada(d, id)
            const t = buscar(d, diaId)
            if (!r || !t) return
            const [mov] = r.dia.entries.splice(r.i, 1)
            t.dia.entries.push(mov)
          })
          setEntradaAbierta(null)
          avisar('Ejercicio movido')
        }}
        onCambiarEjercicio={() => setSelector({ diaId: abierta.dia.id, reemplazar: entradaAbierta })}
        dias={w.days}
        diaActual={abierta?.dia.id}
      />

      <SelectorEjercicio
        abierto={!!selector}
        unico={!!selector?.reemplazar}
        onClose={() => setSelector(null)}
        onElegir={(ejs) => anadirEjercicios(selector.diaId, ejs, selector.reemplazar)}
      />

      <NotasDia abierto={!!diaNotas} onClose={() => setNotas(null)} titulo={diaNotas ? `Notas · ${DIAS[diaNotas.di]}` : ''}
        valor={diaNotas?.dia.notes || ''} onChange={(v) => editarDia(notas, (x) => { x.notes = v }, `notas:${notas}`)} />

      <CopiarA abierto={!!copiarA} onClose={() => setCopiarA(null)} data={data} origenId={copiarA}
        onAplicar={(destinos) => {
          editar((d) => {
            const o = buscar(d, copiarA)
            if (!o) return
            for (const id of destinos) {
              const t = buscar(d, id)
              if (!t) continue
              const c = clonar(o.dia)
              Object.assign(t.dia, { type: c.type, title: c.title, notes: c.notes, entries: c.entries })
            }
          })
          setCopiarA(null)
          avisar(`Copiado a ${destinos.length} ${destinos.length === 1 ? 'día' : 'días'}`)
        }} />
    </>
  )
}
