import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, Hoja, SUAVE } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { FormularioEjercicio } from '../ejercicios/FormularioEjercicio'
import { filtrarEjercicios, FiltrosEjercicio } from '../ejercicios/filtros'

export default function SelectorEjercicio({ abierto, onClose, onElegir, unico }) {
  const datos = useDatos()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [sel, setSel] = useState([])
  const [creando, setCreando] = useState(false)

  useEffect(() => { if (abierto) { setSel([]); setQ('') } }, [abierto])

  const lista = useMemo(() => filtrarEjercicios(datos, q, filtro), [datos, q, filtro])

  function tocar(ej) {
    if (unico) return onElegir([ej])
    setSel((s) => (s.some((x) => x.id === ej.id) ? s.filter((x) => x.id !== ej.id) : [...s, ej]))
  }

  return (
    <>
      <Hoja abierta={abierto && !creando} onClose={onClose} titulo={unico ? 'Cambiar ejercicio' : 'Añadir ejercicios'} ancho={620}
        pie={<>
          <Boton variante="fantasma" icono="plus" onClick={() => setCreando(true)}>Crear nuevo</Boton>
          <div className="flex-1" />
          {!unico && (
            <Boton variante="primario" disabled={!sel.length} onClick={() => onElegir(sel)}>
              {sel.length ? `Añadir ${sel.length}` : 'Añadir'}
            </Boton>
          )}
        </>}
      >
        <div className="sticky top-0 z-10 bg-surface pb-3 -mx-5 px-5 space-y-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input className="campo pl-10 rounded-full" placeholder="Buscar por nombre, músculo o material" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <FiltrosEjercicio valor={filtro} onChange={setFiltro} />
        </div>
        {lista.length === 0 ? (
          <div className="text-center py-12 text-sm text-ink-dim">
            Nada con «{q}».
            <div className="mt-3"><Boton tam="sm" icono="plus" onClick={() => setCreando(true)}>Crear «{q || 'ejercicio nuevo'}»</Boton></div>
          </div>
        ) : (
          <div className="divide-y divide-line/70">
            {lista.map((ej) => {
              const orden = sel.findIndex((x) => x.id === ej.id)
              const on = orden >= 0
              return (
                <button key={ej.id} onClick={() => tocar(ej)} className="w-full flex items-center gap-3 py-2.5 text-left group">
                  {ej.images?.[0] ? (
                    <img src={ej.images[0]} alt="" loading="lazy" className="w-11 h-11 rounded-xl object-cover bg-surface-2 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-surface-2/60 grid place-items-center text-ink-mute shrink-0">
                      <Icon name={ej.kind === 'cardio' ? 'flame' : ej.kind === 'movilidad' ? 'body' : 'dumbbell'} size={19} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate group-hover:text-accent transition-colors">
                      {ej.favorite && <Icon name="star" size={12} fill="currentColor" className="inline text-warn mr-1 -mt-0.5" />}
                      {ej.name}
                    </div>
                    <div className="text-[12.5px] text-ink-dim truncate">
                      {ej.primary.map((m) => datos.musculos.get(m)?.name).filter(Boolean).join(', ') || (ej.kind === 'fuerza' ? 'Sin músculos' : ej.kind === 'cardio' ? 'Cardio' : 'Movilidad')}
                    </div>
                  </div>
                  {!unico && (
                    <motion.span
                      animate={{ scale: on ? 1 : 0.85, backgroundColor: on ? 'var(--color-accent)' : 'rgba(0,0,0,0)' }}
                      transition={{ duration: 0.2, ease: SUAVE }}
                      className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold text-on-accent border ${on ? 'border-transparent' : 'border-line'}`}
                    >
                      {on ? orden + 1 : ''}
                    </motion.span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <AnimatePresence>
          {sel.length > 0 && !unico && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-ink-mute text-center pt-3">
              Se añaden en el orden en que los marques.
            </motion.p>
          )}
        </AnimatePresence>
      </Hoja>
      <FormularioEjercicio
        abierto={creando}
        inicial={{ name: q }}
        onClose={() => setCreando(false)}
        onGuardado={(ej) => { setCreando(false); unico ? onElegir([ej]) : setSel((s) => [...s, ej]) }}
      />
    </>
  )
}
