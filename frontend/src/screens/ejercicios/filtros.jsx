import { Chip } from '../../ui/piezas'
import { useDatos } from '../../platform/datos'
import { MATERIAL_NOMBRE } from '../../domain/rutina'

// Quitar tildes para buscar: "biceps" encuentra "Bíceps".
export const plano = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filtrarEjercicios({ ejercicios, musculos, grupoDe }, q, filtro) {
  const t = plano(q.trim())
  return ejercicios.filter((ej) => {
    if (filtro === 'favoritos' && !ej.favorite) return false
    if (filtro === 'cardio' && ej.kind !== 'cardio') return false
    if (filtro === 'movilidad' && ej.kind !== 'movilidad') return false
    if (filtro.startsWith('g:') && !ej.primary.some((m) => grupoDe.get(m)?.id === filtro.slice(2))) return false
    if (!t) return true
    const texto = plano([ej.name, MATERIAL_NOMBRE[ej.equipment], ...[...ej.primary, ...ej.secondary].map((m) => musculos.get(m)?.name)].join(' '))
    return t.split(/\s+/).every((p) => texto.includes(p))
  }).sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name, 'es'))
}

export function FiltrosEjercicio({ valor, onChange }) {
  const { taxonomia, ejercicios } = useDatos()
  const hayFav = ejercicios.some((e) => e.favorite)
  const opciones = [
    { id: 'todos', name: 'Todos' },
    hayFav && { id: 'favoritos', name: 'Favoritos' },
    ...taxonomia.map((g) => ({ id: `g:${g.id}`, name: g.name })),
    { id: 'cardio', name: 'Cardio' },
    { id: 'movilidad', name: 'Movilidad' },
  ].filter(Boolean)
  return (
    <div className="flex gap-1.5 overflow-x-auto sin-barra -mx-5 px-5">
      {opciones.map((o) => (
        <Chip key={o.id} activo={valor === o.id} onClick={() => onChange(o.id)} className="shrink-0">{o.name}</Chip>
      ))}
    </div>
  )
}
