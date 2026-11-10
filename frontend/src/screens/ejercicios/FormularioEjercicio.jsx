import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, BotonIcono, Etiqueta, Hoja, Segmentado, SUAVE, useAvisos } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { subirImagen } from '../../platform/api'
import { MATERIAL, TIPOS_EJERCICIO } from '../../domain/rutina'

const VACIO = { name: '', kind: 'fuerza', equipment: '', primary: [], secondary: [], description: '', video_url: '', images: [], favorite: false }

// Tocar un músculo va rotando: nada → principal → secundario → nada.
function SelectorMusculos({ primary, secondary, onChange }) {
  const { taxonomia } = useDatos()
  const estado = (id) => (primary.includes(id) ? 'p' : secondary.includes(id) ? 's' : '')
  function rotar(id) {
    const e = estado(id)
    const p = primary.filter((x) => x !== id)
    const s = secondary.filter((x) => x !== id)
    if (e === '') p.push(id)
    else if (e === 'p') s.push(id)
    onChange(p, s)
  }
  return (
    <div className="space-y-3">
      {taxonomia.map((g) => (
        <div key={g.id}>
          <div className="text-[12px] font-medium text-ink-mute mb-1.5">{g.name}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.muscles.map((m) => {
              const e = estado(m.id)
              return (
                <motion.button key={m.id} whileTap={{ scale: 0.94 }} onClick={() => rotar(m.id)}
                  className={`h-8 px-3 rounded-full text-[13px] font-medium border transition-all duration-200
                    ${e === 'p' ? 'bg-accent text-on-accent border-transparent' : e === 's' ? 'bg-accent-soft text-accent border-accent-line' : 'border-line text-ink-dim hover:text-ink'}`}>
                  {m.name}{e === 's' && <span className="ml-1 opacity-70 text-[11px]">½</span>}
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[12px] text-ink-mute">Un toque: principal (cuenta 1 serie). Dos: secundario (cuenta ½, ajustable). Tres: quitar.</p>
    </div>
  )
}

function Imagenes({ imagenes, onChange }) {
  const { avisar } = useAvisos()
  const [subiendo, setSubiendo] = useState(0)
  const [encima, setEncima] = useState(false)
  const input = useRef(null)
  const actuales = useRef(imagenes)
  actuales.current = imagenes

  async function subir(files) {
    const lista = [...files].filter((f) => f.type.startsWith('image/'))
    if (!lista.length) return
    setSubiendo((n) => n + lista.length)
    for (const f of lista) {
      try {
        const url = await subirImagen(f)
        onChange([...actuales.current, url])
      } catch (e) {
        avisar(e.message, { tipo: 'error' })
      } finally {
        setSubiendo((n) => n - 1)
      }
    }
  }

  // Pegar una imagen copiada (captura, web…) con ⌘V mientras el formulario está abierto.
  useEffect(() => {
    const pegar = (e) => {
      const files = [...(e.clipboardData?.files || [])]
      if (files.length) { e.preventDefault(); subir(files) }
    }
    window.addEventListener('paste', pegar)
    return () => window.removeEventListener('paste', pegar)
  })

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); subir(e.dataTransfer.files) }}
      className={`rounded-2xl border border-dashed p-3 transition-colors duration-200 ${encima ? 'border-accent bg-accent-soft' : 'border-line'}`}
    >
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = '' }} />
      <div className="flex gap-2.5 overflow-x-auto sin-barra">
        <AnimatePresence initial={false}>
          {imagenes.map((url, i) => (
            <motion.div key={url} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25, ease: SUAVE }}
              className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-surface-2 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i === 0 && imagenes.length > 1 && <span className="absolute left-1.5 top-1.5 text-[10px] font-semibold bg-black/55 text-white rounded-md px-1.5 py-0.5">Portada</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/50 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                {i > 0 ? (
                  <button title="Usar de portada" className="w-7 h-7 grid place-items-center rounded-full bg-white/90 text-black"
                    onClick={() => onChange([url, ...imagenes.filter((x) => x !== url)])}><Icon name="star" size={14} /></button>
                ) : <span />}
                <button title="Quitar" className="w-7 h-7 grid place-items-center rounded-full bg-white/90 text-black"
                  onClick={() => onChange(imagenes.filter((x) => x !== url))}><Icon name="trash" size={14} /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: subiendo }).map((_, i) => (
          <div key={`s${i}`} className="shrink-0 w-24 h-24 rounded-xl bg-surface-2/70 grid place-items-center">
            <div className="w-5 h-5 rounded-full border-2 border-line border-t-accent animate-spin" />
          </div>
        ))}
        <button onClick={() => input.current?.click()}
          className="shrink-0 w-24 h-24 rounded-xl bg-surface-2/40 hover:bg-surface-2/80 text-ink-dim flex flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors">
          <Icon name="image" size={22} />
          Añadir
        </button>
      </div>
      <p className="text-[12px] text-ink-mute mt-2">Del ejercicio o de la máquina. Arrastra, pega (⌘V) o elige desde la galería o la cámara.</p>
    </div>
  )
}

export function FormularioEjercicio({ abierto, inicial, onClose, onGuardado, onBorrado }) {
  const { guardarEjercicio, borrarEjercicio } = useDatos()
  const { avisar, confirmar } = useAvisos()
  const [f, setF] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (abierto) { setF({ ...VACIO, ...inicial }); setGuardando(false) } }, [abierto]) // eslint-disable-line

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  async function guardar() {
    if (!f.name.trim()) return avisar('Ponle un nombre', { tipo: 'error' })
    setGuardando(true)
    try {
      const g = await guardarEjercicio({ ...f, name: f.name.trim() })
      avisar(f.id ? 'Ejercicio guardado' : 'Ejercicio creado')
      onGuardado?.(g)
    } catch (e) {
      avisar(e.message, { tipo: 'error' })
      setGuardando(false)
    }
  }

  async function borrar() {
    const ok = await confirmar({
      titulo: `¿Borrar «${f.name}»?`,
      texto: 'Desaparece de la biblioteca. Las rutinas que lo usan conservan su nombre y series, pero dejará de sumar en el contador por músculo.',
      boton: 'Borrar', peligro: true,
    })
    if (!ok) return
    await borrarEjercicio(f.id)
    avisar('Ejercicio borrado')
    onBorrado?.()
  }

  return (
    <Hoja abierta={abierto} onClose={onClose} ancho={640} lado="derecha"
      cabecera={
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight flex-1">{f.id ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2>
          <BotonIcono icono="star" label={f.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'} activo={f.favorite} onClick={() => set('favorite')(!f.favorite)} />
        </div>
      }
      pie={<>
        {f.id && <Boton variante="fantasma" icono="trash" className="!text-danger" onClick={borrar}>Borrar</Boton>}
        <div className="flex-1" />
        <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
        <Boton variante="primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
      </>}
    >
      <div className="space-y-6">
        <div>
          <Etiqueta>Nombre</Etiqueta>
          <input className="campo" autoFocus={!f.id} value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ej. Press inclinado en Smith" />
        </div>
        <div>
          <Etiqueta>Imágenes</Etiqueta>
          <Imagenes imagenes={f.images} onChange={set('images')} />
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <Etiqueta>Tipo</Etiqueta>
            <Segmentado opciones={TIPOS_EJERCICIO} valor={f.kind} onChange={set('kind')} />
          </div>
        </div>
        <div>
          <Etiqueta>Material</Etiqueta>
          <div className="flex flex-wrap gap-1.5">
            {MATERIAL.map((m) => (
              <button key={m.id} onClick={() => set('equipment')(f.equipment === m.id ? '' : m.id)}
                className={`h-8 px-3 rounded-full text-[13px] font-medium transition-all duration-200 ${f.equipment === m.id ? 'bg-ink text-bg' : 'bg-surface-2/60 text-ink-dim hover:text-ink'}`}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        {f.kind !== 'cardio' && (
          <div>
            <Etiqueta>Músculos trabajados</Etiqueta>
            <SelectorMusculos primary={f.primary} secondary={f.secondary} onChange={(p, s) => setF((x) => ({ ...x, primary: p, secondary: s }))} />
          </div>
        )}
        <div>
          <Etiqueta>Indicaciones</Etiqueta>
          <textarea rows={3} className="campo resize-none" value={f.description} onChange={(e) => set('description')(e.target.value)}
            placeholder="Ejecución, puntos clave, ajustes de la máquina…" />
        </div>
        <div>
          <Etiqueta>Vídeo de referencia</Etiqueta>
          <input className="campo" type="url" value={f.video_url} onChange={(e) => set('video_url')(e.target.value)} placeholder="https://…" />
        </div>
      </div>
    </Hoja>
  )
}
