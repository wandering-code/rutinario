import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Menu, BotonIcono } from '../../ui/piezas'
import { EntradaOrdenable } from './Entrada'
import {
  DIAS, DIAS_CORTO, TIPO, TIPOS_DIA, duracionDia, esEntreno, etiquetasSuperserie, formatoMinutos, seriesDia,
} from '../../domain/rutina'

export function SelectorTipo({ tipo, onChange, grande }) {
  const t = TIPO[tipo]
  return (
    <Menu
      alinear="izquierda"
      boton={
        <button
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${grande ? 'h-8 px-3 text-[13px]' : 'h-6 px-2 text-[11px]'}`}
          style={{ background: `color-mix(in srgb, ${t.color} 14%, transparent)`, color: t.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
          {t.name}
          <Icon name="chevD" size={grande ? 14 : 12} stroke={2.4} />
        </button>
      }
      items={TIPOS_DIA.map((x) => ({
        label: x.name,
        icono: x.id === tipo ? 'check' : undefined,
        onClick: () => onChange(x.id),
      }))}
    />
  )
}

export function menuDia({ dia, onTipo, onCopiar, onPegar, hayCopiado, onVaciar, onDuplicarEn, onNotas }) {
  return [
    { label: 'Notas del día', icono: 'note', onClick: onNotas },
    { label: 'Copiar día', icono: 'copy', onClick: onCopiar },
    { label: 'Pegar día aquí', icono: 'layers', onClick: onPegar, disabled: !hayCopiado },
    { label: 'Copiar a otros días…', icono: 'swap', onClick: onDuplicarEn },
    '-',
    { label: 'Vaciar ejercicios', icono: 'trash', peligro: true, onClick: onVaciar, disabled: !dia.entries.length },
  ]
}

// Una columna de la rejilla de escritorio.
export function ColumnaDia({ dia, indice, hoy, acciones, onAbrirEntrada, onAnadir }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia:${dia.id}`, data: { diaId: dia.id } })
  const t = TIPO[dia.type]
  const etiquetas = etiquetasSuperserie(dia.entries)
  const entreno = esEntreno(dia.type)
  const series = seriesDia(dia)
  const min = duracionDia(dia)

  return (
    <div className="flex flex-col min-w-0 min-h-0 rounded-[22px] bg-surface-2/35 border border-line/50">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1">
          <span className={`text-[12px] font-bold uppercase tracking-[0.08em] ${hoy ? 'text-accent' : 'text-ink-mute'}`}>{DIAS_CORTO[indice]}</span>
          <div className="flex-1" />
          <Menu boton={<BotonIcono icono="more" label={`Opciones del ${DIAS[indice]}`} tam={26} />} items={menuDia({ dia, ...acciones })} />
        </div>
        <div className="mt-1.5"><SelectorTipo tipo={dia.type} onChange={acciones.onTipo} /></div>
        <input
          value={dia.title}
          onChange={(e) => acciones.onTitulo(e.target.value)}
          placeholder={entreno ? 'Título (ej. Torso A)' : t.name}
          className="mt-1.5 w-full bg-transparent font-display font-semibold text-[14.5px] tracking-tight outline-none placeholder:text-ink-mute/70 placeholder:font-medium"
        />
        {series > 0 && (
          <div className="text-[11px] text-ink-mute tabular mt-0.5">{series} series · ~{formatoMinutos(min)}</div>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 overflow-y-auto px-2 pb-2 space-y-1.5 rounded-b-[22px] transition-colors duration-200 ${isOver ? 'bg-accent-soft' : ''}`}
      >
        <SortableContext items={dia.entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {dia.entries.map((e) => (
            <EntradaOrdenable key={e.id} entrada={e} diaId={dia.id} etiqueta={etiquetas[e.id]} compacta onAbrir={() => onAbrirEntrada(e.id)} />
          ))}
        </SortableContext>
        {dia.type === 'descanso' && !dia.entries.length && (
          <div className="py-5 grid place-items-center text-ink-mute/50"><Icon name="bed" size={22} /></div>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAnadir}
          className={`w-full h-9 rounded-xl border border-dashed border-line text-ink-mute hover:text-accent hover:border-accent-line hover:bg-accent-soft/50 text-[12px] font-medium flex items-center justify-center gap-1 transition-colors ${dia.type === 'descanso' && !dia.entries.length ? 'opacity-0 hover:opacity-100 focus:opacity-100' : ''}`}
        >
          <Icon name="plus" size={14} /> Añadir
        </motion.button>
        {dia.notes && <p className="text-[11px] text-ink-dim italic px-1 pt-1 whitespace-pre-line line-clamp-4">{dia.notes}</p>}
      </div>
    </div>
  )
}
