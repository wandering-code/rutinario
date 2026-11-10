import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, SUAVE, Vacio } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { useEscritorio } from '../../platform/viewport'
import { Cabecera } from '../Shell'
import { FormularioEjercicio } from './FormularioEjercicio'
import { filtrarEjercicios, FiltrosEjercicio } from './filtros'
import { MATERIAL_NOMBRE } from '../../domain/rutina'

function Tarjeta({ ej, onClick }) {
  const { musculos } = useDatos()
  const img = ej.images?.[0]
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: SUAVE }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="text-left rounded-xl3 bg-surface border border-line/80 overflow-hidden sombra-1 hover:sombra-2 transition-shadow duration-300"
    >
      <div className="aspect-[4/3] bg-surface-2/50 relative">
        {img ? (
          <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink-mute/50">
            <Icon name={ej.kind === 'cardio' ? 'flame' : ej.kind === 'movilidad' ? 'body' : 'dumbbell'} size={34} stroke={1.4} />
          </div>
        )}
        {ej.images?.length > 1 && (
          <span className="absolute right-2 bottom-2 text-[11px] font-semibold bg-black/55 text-white rounded-full px-2 py-0.5 tabular">{ej.images.length} fotos</span>
        )}
        {ej.favorite && <Icon name="star" size={16} fill="currentColor" className="absolute left-2.5 top-2.5 text-warn drop-shadow" />}
      </div>
      <div className="p-3.5">
        <div className="font-medium text-[14.5px] leading-snug line-clamp-2">{ej.name}</div>
        <div className="text-[12.5px] text-ink-dim mt-1 truncate">
          {ej.primary.map((m) => musculos.get(m)?.name).filter(Boolean).join(', ') || { cardio: 'Cardio', movilidad: 'Movilidad' }[ej.kind] || '—'}
        </div>
        {ej.equipment && <div className="text-[11.5px] text-ink-mute mt-0.5">{MATERIAL_NOMBRE[ej.equipment]}</div>}
      </div>
    </motion.button>
  )
}

export default function Biblioteca() {
  const datos = useDatos()
  const escritorio = useEscritorio()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [abierto, setAbierto] = useState(null) // objeto ejercicio o {} para nuevo

  const lista = useMemo(() => filtrarEjercicios(datos, q, filtro), [datos, q, filtro])
  // Agrupado por grupo muscular principal cuando no se busca nada.
  const secciones = useMemo(() => {
    if (q.trim() || filtro !== 'todos') return [{ id: 'r', name: null, items: lista }]
    const porGrupo = new Map()
    for (const ej of lista) {
      const g = ej.kind !== 'fuerza' ? { id: ej.kind, name: ej.kind === 'cardio' ? 'Cardio' : 'Movilidad' } : datos.grupoDe.get(ej.primary[0]) || { id: 'otros', name: 'Sin músculo asignado' }
      if (!porGrupo.has(g.id)) porGrupo.set(g.id, { id: g.id, name: g.name, items: [] })
      porGrupo.get(g.id).items.push(ej)
    }
    const orden = [...datos.taxonomia.map((g) => g.id), 'cardio', 'movilidad', 'otros']
    return [...porGrupo.values()].sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))
  }, [lista, q, filtro, datos])

  return (
    <div className="h-full overflow-y-auto">
      <Cabecera titulo="Ejercicios" subtitulo={`${datos.ejercicios.length} en la biblioteca`}>
        <Boton variante="primario" icono="plus" onClick={() => setAbierto({})}>{escritorio ? 'Nuevo ejercicio' : 'Nuevo'}</Boton>
      </Cabecera>
      <div className="sticky top-0 z-10 bg-bg/85 backdrop-blur-xl px-5 lg:px-10 pt-1 pb-3 space-y-3">
        <div className="relative max-w-md">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="campo pl-10 rounded-full" placeholder="Buscar por nombre, músculo o material" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="lg:-mx-5"><FiltrosEjercicio valor={filtro} onChange={setFiltro} /></div>
      </div>
      <div className="px-5 lg:px-10 pb-32 pt-2">
        {lista.length === 0 ? (
          <Vacio icono="search" titulo="Sin resultados" texto={q ? `Nada coincide con «${q}».` : 'No hay ejercicios en este filtro.'}>
            <Boton icono="plus" onClick={() => setAbierto({ name: q })}>Crear ejercicio</Boton>
          </Vacio>
        ) : (
          secciones.map((s) => (
            <section key={s.id} className="mb-8">
              {s.name && <h2 className="font-display font-semibold text-[15px] tracking-tight mb-3 text-ink-dim">{s.name} <span className="text-ink-mute font-normal tabular">· {s.items.length}</span></h2>}
              <motion.div layout className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                <AnimatePresence>
                  {s.items.map((ej) => <Tarjeta key={ej.id} ej={ej} onClick={() => setAbierto(ej)} />)}
                </AnimatePresence>
              </motion.div>
            </section>
          ))
        )}
      </div>
      <FormularioEjercicio abierto={!!abierto} inicial={abierto || {}} onClose={() => setAbierto(null)}
        onGuardado={() => setAbierto(null)} onBorrado={() => setAbierto(null)} />
    </div>
  )
}
