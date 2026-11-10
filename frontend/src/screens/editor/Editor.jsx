import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '../../platform/api'
import { useEscritorio } from '../../platform/viewport'
import { Icon } from '../../ui/icons'
import { Boton, BotonIcono, Etiqueta, Hoja, Menu, RESORTE, Segmentado, SUAVE, useAvisos, Vacio } from '../../ui/piezas'
import { useRutina } from './useRutina'
import Plan from './Plan'
import Volumen from './Volumen'
import Exportar from './Exportar'
import { useDatos } from '../../platform/datos'
import { clonar, nombreSemana, sincronizarNombres, nuevaSemana, seriesDia, textoRecuento } from '../../domain/rutina'

const VISTAS = [
  { id: 'plan', name: 'Semana', icono: 'calendar' },
  { id: 'series', name: 'Series', icono: 'chart' },
  { id: 'exportar', name: 'Exportar', icono: 'share' },
]

function EstadoGuardado({ estado }) {
  const t = {
    guardado: ['Guardado', 'text-ink-mute', 'check'],
    pendiente: ['Cambios sin guardar', 'text-ink-mute', 'clock'],
    guardando: ['Guardando…', 'text-ink-mute', 'refresh'],
    error: ['Sin conexión · reintentando', 'text-warn', 'info'],
    conflicto: ['Conflicto', 'text-danger', 'info'],
  }[estado]
  return (
    <AnimatePresence mode="wait">
      <motion.span key={estado} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}
        className={`inline-flex items-center gap-1 text-[12px] whitespace-nowrap ${t[1]}`} title={t[0]}>
        <Icon name={t[2]} size={13} className={estado === 'guardando' ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">{t[0]}</span>
      </motion.span>
    </AnimatePresence>
  )
}

function Detalles({ abierto, onClose, doc, editar }) {
  return (
    <Hoja abierta={abierto} onClose={onClose} titulo="Detalles de la rutina" ancho={520} pie={<Boton variante="primario" onClick={onClose}>Listo</Boton>}>
      <div className="space-y-5">
        <div>
          <Etiqueta>Nombre</Etiqueta>
          <input className="campo" value={doc.name} onChange={(e) => editar((d) => { d.name = e.target.value }, 'nombre')} />
        </div>
        <div>
          <Etiqueta>Objetivo</Etiqueta>
          <input className="campo" placeholder="Hipertrofia, fuerza, recomposición…" value={doc.data.goal} onChange={(e) => editar((d) => { d.data.goal = e.target.value }, 'goal')} />
        </div>
        <div>
          <Etiqueta>Descripción</Etiqueta>
          <textarea rows={4} className="campo resize-none" placeholder="Para quién es, progresión, indicaciones generales…" value={doc.data.description}
            onChange={(e) => editar((d) => { d.data.description = e.target.value }, 'desc')} />
        </div>
      </div>
    </Hoja>
  )
}

function RenombrarSemana({ semana, onClose, onGuardar }) {
  const [v, setV] = useState('')
  useEffect(() => { if (semana) setV(semana.label) }, [semana])
  return (
    <Hoja abierta={!!semana} onClose={onClose} titulo="Nombre de la semana" ancho={420}
      pie={<><Boton variante="fantasma" onClick={onClose}>Cancelar</Boton><Boton variante="primario" onClick={() => onGuardar(v)}>Guardar</Boton></>}>
      <input className="campo" autoFocus placeholder="Ej. Semana A, Descarga…" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onGuardar(v)} />
    </Hoja>
  )
}

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const escritorio = useEscritorio()
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') || 'plan'
  const [semana, setSemana] = useState(0)
  const [detalles, setDetalles] = useState(false)
  const [renombrar, setRenombrar] = useState(null)
  const { avisar, confirmar } = useAvisos()
  const r = useRutina(id)
  const { doc, editar, ajustar, deshacer, rehacer } = r
  const { porId } = useDatos()

  // Si un ejercicio se renombra en la biblioteca (desde aquí mismo o desde
  // otra pantalla), la rutina abierta lo refleja al momento.
  useEffect(() => {
    if (doc && porId.size) ajustar((d) => sincronizarNombres(d.data, porId))
  }, [doc, porId, ajustar])

  useEffect(() => {
    const tecla = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== 'z') return
      // Dentro de un campo de texto, ⌘Z es el deshacer del propio campo.
      if (e.target.closest('input, textarea')) return
      e.preventDefault()
      e.shiftKey ? rehacer() : deshacer()
    }
    const desdeAviso = () => deshacer()
    window.addEventListener('keydown', tecla)
    window.addEventListener('rutinario:deshacer', desdeAviso)
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('rutinario:deshacer', desdeAviso) }
  }, [deshacer, rehacer])

  useEffect(() => {
    if (doc && semana >= doc.data.weeks.length) setSemana(doc.data.weeks.length - 1)
  }, [doc, semana])

  useEffect(() => { if (doc) document.title = `${doc.name} · Rutinario` ; return () => { document.title = 'Rutinario' } }, [doc?.name]) // eslint-disable-line

  if (r.cargando) {
    return <div className="h-full grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-line border-t-accent animate-spin" /></div>
  }
  if (r.error || !doc) {
    return (
      <Vacio icono="info" titulo="No se pudo abrir la rutina" texto={r.error?.message}>
        <Boton onClick={() => navigate('/')}>Volver a rutinas</Boton>
      </Vacio>
    )
  }

  const data = doc.data
  const w = data.weeks[Math.min(semana, data.weeks.length - 1)]
  const seriesSemana = w.days.reduce((n, d) => n + seriesDia(d), 0)

  const cambiarVista = (v) => setParams(v === 'plan' ? {} : { vista: v }, { replace: true })

  async function duplicarRutina() {
    const c = await api('/routines', { method: 'POST', body: { name: `${doc.name} (copia)`, data: clonar(data) } })
    avisar('Rutina duplicada', { accion: { label: 'Abrir', onClick: () => navigate(`/rutina/${c.id}`) } })
  }

  async function borrarRutina() {
    const ok = await confirmar({ titulo: `¿Eliminar «${doc.name}»?`, texto: 'Se borra para siempre.', boton: 'Eliminar', peligro: true })
    if (!ok) return
    await api(`/routines/${id}`, { method: 'DELETE' })
    navigate('/')
  }

  const anadirSemana = (copiarDe) => {
    editar((d) => { d.data.weeks.push(copiarDe != null ? clonar(d.data.weeks[copiarDe]) : nuevaSemana(d.data.weeks[d.data.weeks.length - 1].days.map((x) => x.type))) })
    setSemana(data.weeks.length)
  }

  const menuSemana = (i) => [
    { label: 'Renombrar', icono: 'pencil', onClick: () => setRenombrar({ i, label: data.weeks[i].label }) },
    { label: 'Duplicar semana', icono: 'copy', onClick: () => anadirSemana(i) },
    { label: 'Mover antes', icono: 'chevL', disabled: i === 0, onClick: () => { editar((d) => { const ws = d.data.weeks; [ws[i - 1], ws[i]] = [ws[i], ws[i - 1]] }); setSemana(i - 1) } },
    { label: 'Mover después', icono: 'chevR', disabled: i === data.weeks.length - 1, onClick: () => { editar((d) => { const ws = d.data.weeks; [ws[i + 1], ws[i]] = [ws[i], ws[i + 1]] }); setSemana(i + 1) } },
    '-',
    {
      label: 'Eliminar semana', icono: 'trash', peligro: true, disabled: data.weeks.length === 1,
      onClick: async () => {
        if (!(await confirmar({ titulo: `¿Eliminar ${nombreSemana(data.weeks[i], i).toLowerCase()}?`, texto: 'Se pierden sus días y ejercicios (puedes deshacerlo con ⌘Z).', boton: 'Eliminar', peligro: true }))) return
        editar((d) => { d.data.weeks.splice(i, 1) })
        setSemana(Math.max(0, i - 1))
      },
    },
  ]

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 pt-segura">
        <div className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-6 pt-3 lg:pt-5">
          <BotonIcono icono="chevL" label="Volver a rutinas" onClick={() => navigate('/')} />
          <input
            value={doc.name}
            onChange={(e) => editar((d) => { d.name = e.target.value }, 'nombre')}
            onBlur={() => { if (!doc.name.trim()) editar((d) => { d.name = 'Rutina sin nombre' }) }}
            className="flex-1 min-w-0 bg-transparent font-display text-xl lg:text-2xl font-bold tracking-tight outline-none rounded-lg px-1.5 -mx-1.5 py-0.5 hover:bg-surface-2/40 focus:bg-surface-2/50 transition-colors truncate"
            aria-label="Nombre de la rutina"
          />
          <EstadoGuardado estado={r.guardado} />
          <BotonIcono icono="undo" label="Deshacer (⌘Z)" disabled={!r.puedeDeshacer} onClick={deshacer} />
          {escritorio && <BotonIcono icono="redo" label="Rehacer (⇧⌘Z)" disabled={!r.puedeRehacer} onClick={rehacer} />}
          <Menu boton={<BotonIcono icono="more" label="Más opciones" />} items={[
            { label: 'Detalles y objetivo', icono: 'pencil', onClick: () => setDetalles(true) },
            !escritorio && { label: 'Rehacer', icono: 'redo', disabled: !r.puedeRehacer, onClick: rehacer },
            { label: 'Duplicar rutina', icono: 'copy', onClick: duplicarRutina },
            { label: doc.archived ? 'Desarchivar' : 'Archivar', icono: 'archive', onClick: () => { editar((d) => { d.archived = !d.archived }); avisar(doc.archived ? 'Recuperada' : 'Archivada') } },
            '-',
            { label: 'Eliminar rutina', icono: 'trash', peligro: true, onClick: borrarRutina },
          ]} />
        </div>

        <AnimatePresence>
          {r.guardado === 'conflicto' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mx-4 lg:mx-6 mt-3 rounded-2xl bg-danger-soft border border-danger/30 px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="flex-1 min-w-48">Esta rutina se ha modificado desde otro dispositivo. ¿Con qué versión te quedas?</span>
                <Boton tam="sm" onClick={() => r.resolverConflicto(false)}>La del otro dispositivo</Boton>
                <Boton tam="sm" variante="peligro" onClick={() => r.resolverConflicto(true)}>La de aquí</Boton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-2 px-4 lg:px-6 pt-3 pb-3 lg:pb-4">
          <Segmentado opciones={VISTAS} valor={vista} onChange={cambiarVista} />
          {vista === 'plan' && (
            <div className="flex items-center gap-1 w-full lg:w-auto lg:ml-2 overflow-x-auto sin-barra">
              {data.weeks.length > 1 && data.weeks.map((wk, i) => (
                <div key={wk.id} className="relative">
                  <button onClick={() => setSemana(i)}
                    className={`relative h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${i === semana ? 'text-on-accent' : 'text-ink-dim hover:text-ink'}`}>
                    {i === semana && <motion.span layoutId="semana-activa" className="absolute inset-0 rounded-full bg-accent" transition={RESORTE} />}
                    <span className="relative">{wk.label || (escritorio ? `Semana ${i + 1}` : `S${i + 1}`)}</span>
                  </button>
                </div>
              ))}
              {data.weeks.length > 1 && (
                <Menu boton={<BotonIcono icono="chevD" label="Opciones de la semana" tam={30} />} items={menuSemana(semana)} />
              )}
              <Menu
                boton={
                  <button className="h-8 px-2.5 rounded-full text-[12.5px] font-medium text-ink-dim hover:text-ink hover:bg-surface-2/70 inline-flex items-center gap-1 whitespace-nowrap" title="Añadir semana de rotación">
                    <Icon name="plus" size={15} />{data.weeks.length === 1 && escritorio ? 'Rotación' : ''}
                  </button>
                }
                items={[
                  { label: 'Semana nueva (mismos tipos de día)', icono: 'plus', onClick: () => anadirSemana(null) },
                  { label: `Copia de ${nombreSemana(w, semana).toLowerCase()}`, icono: 'copy', onClick: () => anadirSemana(semana) },
                ]}
              />
            </div>
          )}
          {vista === 'plan' && escritorio && (
            <span className="ml-auto text-[12.5px] text-ink-mute whitespace-nowrap tabular">
              {textoRecuento(w)}{seriesSemana ? ` · ${seriesSemana} series` : ''}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={vista} className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: SUAVE }}>
            {vista === 'plan' && <Plan data={data} semana={Math.min(semana, data.weeks.length - 1)} editar={(fn, clave) => editar((d) => { fn(d.data) }, clave)} />}
            {vista === 'series' && <Volumen data={data} editar={(fn, clave) => editar((d) => { fn(d.data) }, clave)} />}
            {vista === 'exportar' && <Exportar nombre={doc.name} data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Detalles abierto={detalles} onClose={() => setDetalles(false)} doc={doc} editar={editar} />
      <RenombrarSemana semana={renombrar} onClose={() => setRenombrar(null)}
        onGuardar={(v) => { editar((d) => { d.data.weeks[renombrar.i].label = v.trim() }); setRenombrar(null) }} />
    </div>
  )
}
