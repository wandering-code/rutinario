import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '../platform/api'
import { Icon } from '../ui/icons'
import { Boton, BotonIcono, Contador, Etiqueta, Hoja, Menu, SUAVE, useAvisos, Vacio } from '../ui/piezas'
import { Cabecera } from './Shell'
import {
  DIAS_CORTO, DIAS_LETRA, TIPO, TIPOS_DIA, clonar, nombreSemana, normalizar, nuevaRutina, textoRecuento,
} from '../domain/rutina'
import { descargarJSON } from '../exports/json'

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
function haceCuanto(iso) {
  const s = (new Date(iso) - Date.now()) / 1000
  const pasos = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'], [31557600, 'month'], [Infinity, 'year']]
  const div = [1, 60, 3600, 86400, 604800, 2629800, 31557600]
  for (let i = 0; i < pasos.length; i++) if (Math.abs(s) < pasos[i][0]) return rtf.format(Math.round(s / div[i]), pasos[i][1])
  return ''
}

// Plantillas de arranque: tipo y título de cada día (lunes → domingo).
const PLANTILLAS = [
  { id: 'vacia', name: 'En blanco', dias: [['fuerza'], ['fuerza'], ['descanso'], ['fuerza'], ['fuerza'], ['cardio'], ['descanso']] },
  { id: 'fullbody', name: 'Full body · 3 días', dias: [['fuerza', 'Full body A'], ['cardio'], ['fuerza', 'Full body B'], ['descanso'], ['fuerza', 'Full body C'], ['activo'], ['descanso']] },
  { id: 'torso-pierna', name: 'Torso / Pierna · 4 días', dias: [['fuerza', 'Torso A'], ['fuerza', 'Pierna A'], ['descanso'], ['fuerza', 'Torso B'], ['fuerza', 'Pierna B'], ['cardio'], ['descanso']] },
  { id: 'ppl', name: 'Push / Pull / Legs · 6 días', dias: [['fuerza', 'Push'], ['fuerza', 'Pull'], ['fuerza', 'Legs'], ['fuerza', 'Push'], ['fuerza', 'Pull'], ['fuerza', 'Legs'], ['descanso']] },
  { id: 'weider', name: 'Weider · 5 días', dias: [['fuerza', 'Pecho'], ['fuerza', 'Espalda'], ['fuerza', 'Pierna'], ['fuerza', 'Hombro'], ['fuerza', 'Brazo'], ['cardio'], ['descanso']] },
]

function TiraSemana({ semana, alto = 'h-1.5' }) {
  return (
    <div className="flex gap-1">
      {semana.days.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className={`w-full ${alto} rounded-full`} style={{ background: TIPO[d.type]?.color, opacity: d.type === 'descanso' ? 0.35 : 1 }} />
          <span className="text-[10px] text-ink-mute font-medium">{DIAS_LETRA[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Tarjeta({ r, onAbrir, onDuplicar, onArchivar, onBorrar }) {
  const data = useMemo(() => normalizar(r.data), [r.data])
  const s0 = data.weeks[0]
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: SUAVE }}
      whileHover={{ y: -2 }}
      onClick={onAbrir}
      className="group relative cursor-pointer rounded-xl3 bg-surface border border-line/80 p-5 sombra-1 hover:sombra-2 transition-shadow duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[17px] tracking-tight truncate">{r.name}</h3>
          <p className="text-[13px] text-ink-dim mt-0.5 truncate">
            {data.goal || data.description || textoRecuento(s0)}
          </p>
        </div>
        <Menu
          boton={<BotonIcono icono="more" label="Opciones" tam={32} />}
          items={[
            { label: 'Duplicar', icono: 'copy', onClick: onDuplicar },
            { label: 'Exportar copia (JSON)', icono: 'json', onClick: () => descargarJSON(r) },
            { label: r.archived ? 'Desarchivar' : 'Archivar', icono: 'archive', onClick: onArchivar },
            '-',
            { label: 'Eliminar', icono: 'trash', peligro: true, onClick: onBorrar },
          ]}
        />
      </div>
      <div className="mt-5"><TiraSemana semana={s0} /></div>
      <div className="mt-4 flex items-center gap-3 text-[12px] text-ink-mute">
        {data.weeks.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent px-2 py-0.5 font-medium">
            <Icon name="refresh" size={12} /> {data.weeks.length} semanas
          </span>
        )}
        <span className="truncate">{textoRecuento(s0)}</span>
        <span className="ml-auto whitespace-nowrap">{haceCuanto(r.updated_at)}</span>
      </div>
    </motion.article>
  )
}

function NuevaRutina({ abierta, onClose, onCrear }) {
  const [nombre, setNombre] = useState('')
  const [semanas, setSemanas] = useState(1)
  const [plantilla, setPlantilla] = useState('torso-pierna')
  const [dias, setDias] = useState(PLANTILLAS[2].dias)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (abierta) { setNombre(''); setSemanas(1); setPlantilla('torso-pierna'); setDias(PLANTILLAS[2].dias); setCreando(false) }
  }, [abierta])

  const elegir = (p) => { setPlantilla(p.id); setDias(p.dias) }
  const cambiarDia = (i, tipo) => setDias((ds) => ds.map((d, j) => (j === i ? [tipo, tipo === d[0] ? d[1] : ''] : d)))
  const recuento = TIPOS_DIA.map((t) => [t, dias.filter((d) => d[0] === t.id).length]).filter(([, n]) => n)

  async function crear() {
    setCreando(true)
    const data = nuevaRutina({ weeks: semanas, patron: dias.map((d) => d[0]) })
    data.weeks.forEach((w) => w.days.forEach((d, i) => { d.title = dias[i][1] || '' }))
    try { await onCrear(nombre.trim() || 'Rutina nueva', data) } catch { setCreando(false) }
  }

  return (
    <Hoja abierta={abierta} onClose={onClose} titulo="Nueva rutina" ancho={600}
      pie={<>
        <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
        <Boton variante="primario" onClick={crear} disabled={creando}>{creando ? 'Creando…' : 'Crear rutina'}</Boton>
      </>}
    >
      <div className="space-y-6">
        <div>
          <Etiqueta>Nombre</Etiqueta>
          <input className="campo" autoFocus placeholder="Ej. Hipertrofia otoño" value={nombre} onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crear()} />
        </div>
        <div>
          <Etiqueta>Punto de partida</Etiqueta>
          <div className="flex gap-2 overflow-x-auto sin-barra -mx-5 px-5 pb-1">
            {PLANTILLAS.map((p) => (
              <button key={p.id} onClick={() => elegir(p)}
                className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-200 ${plantilla === p.id ? 'border-accent-line bg-accent-soft' : 'border-line hover:border-ink-mute/40'}`}>
                <div className="text-[13px] font-medium whitespace-nowrap">{p.name}</div>
                <div className="flex gap-0.5 mt-2">
                  {p.dias.map((d, i) => <span key={i} className="w-3 h-1 rounded-full" style={{ background: TIPO[d[0]].color, opacity: d[0] === 'descanso' ? 0.35 : 1 }} />)}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Etiqueta extra={<span className="text-[12px] text-ink-mute">{recuento.map(([t, n]) => `${n} ${t.name.toLowerCase()}`).join(' · ')}</span>}>
            Semana tipo
          </Etiqueta>
          <div className="rounded-2xl border border-line divide-y divide-line">
            {dias.map((d, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <span className="w-9 text-[13px] font-semibold text-ink-dim">{DIAS_CORTO[i]}</span>
                <div className="flex gap-1 overflow-x-auto sin-barra flex-1">
                  {TIPOS_DIA.map((t) => {
                    const on = d[0] === t.id
                    return (
                      <button key={t.id} onClick={() => cambiarDia(i, t.id)}
                        className={`shrink-0 h-7 px-2.5 rounded-full text-[12px] font-medium transition-all duration-200 ${on ? 'text-white' : 'text-ink-dim hover:bg-surface-2/70'}`}
                        style={on ? { background: t.color } : undefined}>
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Semanas de rotación</div>
            <div className="text-[13px] text-ink-dim">Si la rutina cambia de una semana a otra (A/B, mesociclo…).</div>
          </div>
          <Contador valor={semanas} onChange={setSemanas} min={1} max={12} ancho="w-8" />
        </div>
      </div>
    </Hoja>
  )
}

export default function Rutinas() {
  const [rutinas, setRutinas] = useState(null)
  const [nueva, setNueva] = useState(false)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const { avisar, confirmar } = useAvisos()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  useEffect(() => {
    api('/routines').then(setRutinas).catch((e) => { setRutinas([]); avisar(e.message, { tipo: 'error' }) })
  }, [avisar])

  async function crear(name, data) {
    const r = await api('/routines', { method: 'POST', body: { name, data } })
    navigate(`/rutina/${r.id}`)
  }

  async function duplicar(r) {
    const copia = await api('/routines', { method: 'POST', body: { name: `${r.name} (copia)`, data: clonar(r.data) } })
    setRutinas((rs) => [copia, ...rs])
    avisar('Rutina duplicada')
  }

  async function archivar(r) {
    const act = await api(`/routines/${r.id}`, { method: 'PUT', body: { name: r.name, data: r.data, archived: !r.archived, version: r.version } })
    setRutinas((rs) => rs.map((x) => (x.id === r.id ? act : x)))
    avisar(act.archived ? 'Archivada' : 'Recuperada')
  }

  async function borrar(r) {
    const ok = await confirmar({ titulo: `¿Eliminar «${r.name}»?`, texto: 'Se borra para siempre. Si quieres conservarla sin verla, archívala.', boton: 'Eliminar', peligro: true })
    if (!ok) return
    await api(`/routines/${r.id}`, { method: 'DELETE' })
    setRutinas((rs) => rs.filter((x) => x.id !== r.id))
    avisar('Rutina eliminada')
  }

  async function importar(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const json = JSON.parse(await f.text())
      const origen = json.rutinario ? json : { name: json.name, data: json.data || json }
      const r = await api('/routines', { method: 'POST', body: { name: origen.name || f.name.replace(/\.json$/, ''), data: normalizar(origen.data) } })
      setRutinas((rs) => [r, ...rs])
      avisar('Rutina importada')
    } catch {
      avisar('Ese archivo no es una rutina válida', { tipo: 'error' })
    }
  }

  const q = busqueda.trim().toLowerCase()
  const filtradas = (rutinas || []).filter((r) => !q || r.name.toLowerCase().includes(q))
  const activas = filtradas.filter((r) => !r.archived)
  const archivadas = filtradas.filter((r) => r.archived)

  return (
    <div className="h-full overflow-y-auto">
      <Cabecera titulo="Rutinas" subtitulo={rutinas ? `${activas.length} ${activas.length === 1 ? 'rutina' : 'rutinas'}` : ' '}>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importar} />
        <BotonIcono icono="upload" label="Importar JSON" onClick={() => fileRef.current?.click()} />
        <Boton variante="primario" icono="plus" onClick={() => setNueva(true)} className="hidden sm:inline-flex">Nueva rutina</Boton>
      </Cabecera>

      <div className="px-5 lg:px-10 pb-32">
        {rutinas && rutinas.length > 3 && (
          <div className="relative mb-5 max-w-md">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input className="campo pl-10 rounded-full" placeholder="Buscar rutina" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        )}

        {rutinas === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-44 rounded-xl3 bg-surface-2/50 animate-pulse" />)}
          </div>
        ) : rutinas.length === 0 ? (
          <Vacio icono="rutinas" titulo="Aún no hay rutinas" texto="Crea la primera: eliges cuántos días son de fuerza, cardio o descanso y luego vas añadiendo ejercicios.">
            <Boton variante="primario" icono="plus" onClick={() => setNueva(true)}>Nueva rutina</Boton>
          </Vacio>
        ) : (
          <>
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {activas.map((r) => (
                  <Tarjeta key={r.id} r={r} onAbrir={() => navigate(`/rutina/${r.id}`)}
                    onDuplicar={() => duplicar(r)} onArchivar={() => archivar(r)} onBorrar={() => borrar(r)} />
                ))}
              </AnimatePresence>
            </motion.div>
            {archivadas.length > 0 && (
              <div className="mt-10">
                <button onClick={() => setVerArchivadas((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-ink-dim hover:text-ink">
                  <motion.span animate={{ rotate: verArchivadas ? 90 : 0 }}><Icon name="chevR" size={16} /></motion.span>
                  Archivadas ({archivadas.length})
                </button>
                <AnimatePresence initial={false}>
                  {verArchivadas && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: SUAVE }} className="overflow-hidden">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 pt-4 opacity-75">
                        {archivadas.map((r) => (
                          <Tarjeta key={r.id} r={r} onAbrir={() => navigate(`/rutina/${r.id}`)}
                            onDuplicar={() => duplicar(r)} onArchivar={() => archivar(r)} onBorrar={() => borrar(r)} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* En el móvil, botón flotante */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setNueva(true)}
        className="sm:hidden fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+84px)] w-14 h-14 rounded-2xl bg-accent text-on-accent grid place-items-center sombra-3 z-10"
        aria-label="Nueva rutina"
      >
        <Icon name="plus" size={26} />
      </motion.button>

      <NuevaRutina abierta={nueva} onClose={() => setNueva(false)} onCrear={crear} />
    </div>
  )
}

