import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../platform/auth'
import { useDatos } from '../platform/datos'
import { useTema } from '../platform/tema'
import { api } from '../platform/api'
import { Icon } from '../ui/icons'
import { Boton, BotonIcono, Segmentado, SUAVE, useAvisos } from '../ui/piezas'
import { Cabecera } from './Shell'
import { descargar } from '../exports/comun'
import { plano } from './ejercicios/filtros'

const nuevoId = (nombre) => `${plano(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'm'}-${Math.random().toString(36).slice(2, 6)}`

function Seccion({ titulo, texto, children }) {
  return (
    <section className="rounded-xl3 bg-surface border border-line/70 sombra-1 p-5 lg:p-6">
      <h2 className="font-display font-semibold text-[17px] tracking-tight">{titulo}</h2>
      {texto && <p className="text-[13px] text-ink-dim mt-1">{texto}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function EditorMusculos() {
  const { taxonomia, guardarTaxonomia, ejercicios } = useDatos()
  const { avisar, confirmar } = useAvisos()
  const [t, setT] = useState(taxonomia)
  const [guardando, setGuardando] = useState(false)
  useEffect(() => setT(taxonomia), [taxonomia])
  const cambiado = JSON.stringify(t) !== JSON.stringify(taxonomia)

  const usos = (mid) => ejercicios.filter((e) => e.primary.includes(mid) || e.secondary.includes(mid)).length
  const editarGrupo = (gi, fn) => setT((x) => x.map((g, i) => (i === gi ? fn(structuredClone(g)) : g)))

  async function guardar() {
    const limpio = t.map((g) => ({ ...g, name: g.name.trim(), muscles: g.muscles.filter((m) => m.name.trim()).map((m) => ({ ...m, name: m.name.trim() })) })).filter((g) => g.name)
    const borrados = taxonomia.flatMap((g) => g.muscles).filter((m) => !limpio.some((g) => g.muscles.some((x) => x.id === m.id)))
    const afectados = borrados.reduce((n, m) => n + usos(m.id), 0)
    if (afectados && !(await confirmar({
      titulo: 'Se quitan músculos en uso',
      texto: `${borrados.map((m) => m.name).join(', ')} ${borrados.length === 1 ? 'está asignado' : 'están asignados'} a ejercicios (${afectados}). Se quitarán de ellos y dejarán de contar en las series.`,
      boton: 'Guardar igualmente', peligro: true,
    }))) return
    setGuardando(true)
    try {
      await guardarTaxonomia(limpio)
      avisar('Músculos guardados')
    } catch (e) {
      avisar(e.message, { tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <div className="space-y-4">
        {t.map((g, gi) => (
          <div key={g.id} className="rounded-2xl border border-line p-3">
            <div className="flex items-center gap-2">
              <input className="flex-1 bg-transparent font-semibold text-[15px] outline-none rounded-lg px-2 py-1 hover:bg-surface-2/40 focus:bg-surface-2/50"
                value={g.name} onChange={(e) => editarGrupo(gi, (x) => ({ ...x, name: e.target.value }))} />
              <BotonIcono icono="chevU" label="Subir" tam={30} disabled={gi === 0} onClick={() => setT((x) => { const y = [...x]; [y[gi - 1], y[gi]] = [y[gi], y[gi - 1]]; return y })} />
              <BotonIcono icono="trash" label="Eliminar grupo" tam={30} onClick={() => setT((x) => x.filter((_, i) => i !== gi))} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2 px-1">
              <AnimatePresence initial={false}>
                {g.muscles.map((m, mi) => (
                  <motion.div key={m.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, ease: SUAVE }}
                    className="inline-flex items-center h-8 rounded-full bg-surface-2/60 pl-3 pr-1 gap-1">
                    <input className="bg-transparent text-[13px] outline-none" style={{ width: `${Math.max(4, m.name.length + 1)}ch` }} value={m.name}
                      onChange={(e) => editarGrupo(gi, (x) => { x.muscles[mi].name = e.target.value; return x })} />
                    <span className="text-[10.5px] text-ink-mute tabular" title="Ejercicios que lo usan">{usos(m.id) || ''}</span>
                    <button className="w-6 h-6 grid place-items-center rounded-full text-ink-mute hover:text-danger" aria-label={`Quitar ${m.name}`}
                      onClick={() => editarGrupo(gi, (x) => { x.muscles.splice(mi, 1); return x })}>
                      <Icon name="x" size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button className="h-8 px-3 rounded-full border border-dashed border-line text-[13px] text-ink-dim hover:text-accent hover:border-accent-line inline-flex items-center gap-1"
                onClick={() => editarGrupo(gi, (x) => { x.muscles.push({ id: nuevoId('musculo'), name: 'Nuevo' }); return x })}>
                <Icon name="plus" size={13} /> Músculo
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Boton icono="plus" onClick={() => setT((x) => [...x, { id: nuevoId('grupo'), name: 'Grupo nuevo', muscles: [] }])}>Grupo</Boton>
        <div className="flex-1" />
        <AnimatePresence>
          {cambiado && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex gap-2">
              <Boton variante="fantasma" onClick={() => setT(taxonomia)}>Descartar</Boton>
              <Boton variante="primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function Ajustes() {
  const { logout } = useAuth()
  const { pref, cambiar } = useTema()
  const { avisar } = useAvisos()

  async function copiaTotal() {
    const [rutinas, ejercicios, taxonomia] = await Promise.all([api('/routines'), api('/exercises'), api('/taxonomy')])
    const blob = new Blob([JSON.stringify({ rutinario: 1, tipo: 'copia-completa', exportado: new Date().toISOString(), rutinas, ejercicios, taxonomia }, null, 2)], { type: 'application/json' })
    descargar(blob, `rutinario-copia-${new Date().toISOString().slice(0, 10)}.json`)
    avisar('Copia descargada')
  }

  return (
    <div className="h-full overflow-y-auto">
      <Cabecera titulo="Ajustes" />
      <div className="px-5 lg:px-10 pb-32 max-w-3xl space-y-4">
        <Seccion titulo="Apariencia">
          <Segmentado
            opciones={[{ id: 'sistema', name: 'Sistema', icono: 'monitor' }, { id: 'claro', name: 'Claro', icono: 'sun' }, { id: 'oscuro', name: 'Oscuro', icono: 'moon' }]}
            valor={pref}
            onChange={(v, e) => cambiar(v, e)}
          />
        </Seccion>
        <Seccion titulo="Músculos y grupos" texto="Lo que se usa para clasificar los ejercicios y para el contador de series. El número junto a cada músculo es cuántos ejercicios lo usan.">
          <EditorMusculos />
        </Seccion>
        <Seccion titulo="Copia de seguridad" texto="Todas las rutinas, ejercicios y músculos en un solo archivo JSON (las imágenes no van dentro).">
          <Boton icono="download" onClick={copiaTotal}>Descargar copia completa</Boton>
        </Seccion>
        <Seccion titulo="Sesión">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-dim">Has entrado como administrador.</span>
            <Boton icono="logout" onClick={logout}>Cerrar sesión</Boton>
          </div>
        </Seccion>
        <p className="text-[12px] text-ink-mute text-center pt-4 tabular">Rutinario · versión {__VERSION__} · {__FECHA_BUILD__}</p>
      </div>
    </div>
  )
}
