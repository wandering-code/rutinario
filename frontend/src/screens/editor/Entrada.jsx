import { forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { useDatos } from '../../platform/datos'
import { resumenEntrada } from '../../domain/rutina'

// La tarjeta de un ejercicio dentro de un día. `compacta` es la de la rejilla
// de escritorio (siete columnas, poco ancho); la otra es la del móvil.
export const TarjetaEntrada = forwardRef(function TarjetaEntrada(
  { entrada, etiqueta, compacta, arrastrando, superior, onClick, asa, style, ...rest }, ref,
) {
  const { porId, musculos } = useDatos()
  const ej = porId.get(entrada.exerciseId)
  const img = ej?.images?.[0]
  const principal = ej?.primary?.map((m) => musculos.get(m)?.name).filter(Boolean).slice(0, 2).join(', ')

  return (
    <div
      ref={ref}
      style={style}
      {...rest}
      onClick={onClick}
      className={`group relative flex items-start gap-2.5 rounded-2xl bg-surface border transition-[box-shadow,border-color,opacity] duration-200 cursor-pointer select-none
        ${compacta ? 'p-2.5' : 'p-3'}
        ${arrastrando ? 'opacity-30' : ''}
        ${superior ? 'sombra-3 border-accent-line rotate-[1.5deg] scale-[1.02]' : 'border-line/80 sombra-1 hover:border-ink-mute/30 hover:sombra-2'}`}
    >
      {img && !compacta && (
        <img src={img} alt="" className="w-11 h-11 rounded-xl object-cover bg-surface-2 shrink-0" loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {etiqueta && (
            <span className="shrink-0 text-[10px] font-bold tabular rounded-md px-1 py-px bg-accent-soft text-accent">{etiqueta}</span>
          )}
          <span className={`font-medium leading-tight ${compacta ? 'text-[12.5px] line-clamp-2' : 'text-[14.5px] truncate'}`}>{entrada.name}</span>
        </div>
        <div className={`text-ink-dim tabular mt-0.5 ${compacta ? 'text-[11.5px] leading-snug' : 'text-[13px]'}`}>{resumenEntrada(entrada)}</div>
        {!compacta && principal && <div className="text-[12px] text-ink-mute mt-0.5 truncate">{principal}</div>}
      </div>
      {entrada.notes && <Icon name="note" size={13} className="text-ink-mute mt-0.5" />}
      {asa && (
        <button
          {...asa}
          onClick={(e) => e.stopPropagation()}
          className="touch-none -mr-1 -my-1 p-1.5 text-ink-mute hover:text-ink cursor-grab active:cursor-grabbing"
          aria-label="Arrastrar para mover"
        >
          <Icon name="grip" size={16} stroke={2.6} />
        </button>
      )}
    </div>
  )
})

export function EntradaOrdenable({ entrada, diaId, etiqueta, compacta, onAbrir, asaSiempre }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entrada.id,
    data: { diaId },
  })
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <TarjetaEntrada
        ref={setNodeRef}
        entrada={entrada}
        etiqueta={etiqueta}
        compacta={compacta}
        arrastrando={isDragging}
        onClick={onAbrir}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        // En escritorio se arrastra la tarjeta entera; en el móvil solo desde
        // el asa, para que deslizar el dedo siga haciendo scroll.
        {...(asaSiempre ? {} : { ...attributes, ...listeners })}
        asa={asaSiempre ? { ...attributes, ...listeners } : null}
      />
    </motion.div>
  )
}
