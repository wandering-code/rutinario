import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Icon } from './icons'
import { useEscritorio } from '../platform/viewport'

export const SUAVE = [0.22, 1, 0.36, 1]
export const RESORTE = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }

// ── Botones ─────────────────────────────────────────────────────────────

const VARIANTES = {
  primario: 'bg-accent text-on-accent hover:brightness-110 sombra-1',
  secundario: 'bg-surface text-ink border border-line hover:bg-surface-2/60',
  fantasma: 'text-ink-dim hover:text-ink hover:bg-surface-2/70',
  peligro: 'bg-danger text-white hover:brightness-110',
  suave: 'bg-accent-soft text-accent hover:bg-accent-soft/80',
}

export function Boton({ variante = 'secundario', icono, children, className = '', tam = 'md', ...props }) {
  const t = tam === 'sm' ? 'h-8 px-3 text-[13px] gap-1.5' : 'h-10 px-4 text-sm gap-2'
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center justify-center rounded-full font-medium select-none transition-[background,color,filter] duration-200 disabled:opacity-45 ${t} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {icono && <Icon name={icono} size={tam === 'sm' ? 16 : 18} />}
      {children}
    </motion.button>
  )
}

export function BotonIcono({ icono, label, className = '', tam = 36, activo, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-35 ${activo ? 'bg-accent-soft text-accent' : 'text-ink-dim hover:text-ink hover:bg-surface-2/70'} ${className}`}
      style={{ width: tam, height: tam }}
      {...props}
    >
      <Icon name={icono} size={Math.round(tam * 0.52)} />
    </motion.button>
  )
}

// ── Control segmentado con la pastilla que se desliza ───────────────────

export function Segmentado({ opciones, valor, onChange, className = '', tam = 'md' }) {
  const id = useId()
  return (
    <div className={`inline-flex p-1 rounded-full bg-surface-2/70 ${className}`} role="tablist">
      {opciones.map((o) => {
        const activo = o.id === valor
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={activo}
            onClick={(e) => onChange(o.id, e)}
            className={`relative flex items-center gap-1.5 rounded-full font-medium transition-colors duration-200 ${tam === 'sm' ? 'px-3 h-7 text-xs' : 'px-4 h-8 text-[13px]'} ${activo ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
          >
            {activo && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-surface sombra-1" transition={RESORTE} />
            )}
            {o.icono && <Icon name={o.icono} size={15} className="relative" />}
            <span className="relative whitespace-nowrap">{o.name}</span>
          </button>
        )
      })}
    </div>
  )
}

const HOJAS_ABIERTAS = []

// ── Hoja: abajo en el móvil (se cierra arrastrando), panel en escritorio ─

export function Hoja({ abierta, onClose, titulo, children, pie, ancho = 520, lado = 'centro', cabecera }) {
  const escritorio = useEscritorio()
  const controles = useDragControls()

  // Con dos hojas apiladas (p. ej. la ficha del ejercicio sobre la de la
  // rutina), Escape cierra solo la de arriba.
  const yo = useId()
  const cerrar = useRef(onClose)
  cerrar.current = onClose
  useEffect(() => {
    if (!abierta) return
    HOJAS_ABIERTAS.push(yo)
    const tecla = (e) => {
      if (e.key === 'Escape' && HOJAS_ABIERTAS[HOJAS_ABIERTAS.length - 1] === yo) cerrar.current()
    }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      const i = HOJAS_ABIERTAS.lastIndexOf(yo)
      if (i >= 0) HOJAS_ABIERTAS.splice(i, 1)
    }
  }, [abierta, yo])

  const derecha = escritorio && lado === 'derecha'

  return createPortal(
    <AnimatePresence>
      {abierta && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-velo backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            className={
              derecha
                ? 'absolute right-3 top-3 bottom-3 flex flex-col bg-surface rounded-xl3 sombra-3 overflow-hidden'
                : escritorio
                  ? 'absolute left-1/2 top-1/2 flex flex-col bg-surface rounded-xl3 sombra-3 overflow-hidden max-h-[86vh]'
                  : 'absolute inset-x-0 bottom-0 flex flex-col bg-surface rounded-t-xl3 sombra-3 max-h-[92dvh] pb-segura'
            }
            style={escritorio ? { width: `min(${ancho}px, calc(100vw - 24px))`, ...(derecha ? {} : { x: '-50%', y: '-50%' }) } : undefined}
            initial={derecha ? { x: 40, opacity: 0 } : escritorio ? { opacity: 0, scale: 0.96, x: '-50%', y: '-48%' } : { y: '100%' }}
            animate={derecha ? { x: 0, opacity: 1 } : escritorio ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0 }}
            exit={derecha ? { x: 40, opacity: 0 } : escritorio ? { opacity: 0, scale: 0.97, x: '-50%', y: '-48%' } : { y: '100%' }}
            transition={escritorio ? { duration: 0.32, ease: SUAVE } : RESORTE}
            drag={escritorio ? false : 'y'}
            dragListener={false}
            dragControls={controles}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose() }}
          >
            <div
              className="shrink-0 touch-none"
              onPointerDown={(e) => !escritorio && controles.start(e)}
            >
              {!escritorio && <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full bg-line" />}
              {(titulo || cabecera) && (
                <div className="flex items-center gap-2 px-5 pt-3 pb-3">
                  <div className="flex-1 min-w-0">
                    {cabecera || <h2 className="font-display text-lg font-semibold tracking-tight truncate">{titulo}</h2>}
                  </div>
                  <BotonIcono icono="x" label="Cerrar" onClick={onClose} />
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {pie && <div className="shrink-0 border-t border-line px-5 py-3 flex items-center justify-end gap-2">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ── Menú desplegable ─────────────────────────────────────────────────────

export function Menu({ boton, items, alinear = 'derecha' }) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!abierto || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const alto = Math.min(items.length * 40 + 12, 400)
    const abajo = r.bottom + alto + 8 < innerHeight
    setPos({
      top: abajo ? r.bottom + 6 : r.top - alto - 6,
      ...(alinear === 'derecha' ? { right: Math.max(8, innerWidth - r.right) } : { left: Math.max(8, r.left) }),
      origen: abajo ? 'top' : 'bottom',
    })
  }, [abierto, alinear, items.length])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (!ref.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => e.key === 'Escape' && setAbierto(false)
    const cerrar = () => setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('keydown', tecla)
    window.addEventListener('resize', cerrar)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('resize', cerrar)
    }
  }, [abierto])

  return (
    <>
      <span ref={ref} onClick={(e) => { e.stopPropagation(); setAbierto((a) => !a) }} className="inline-flex">{boton}</span>
      {createPortal(
        <AnimatePresence>
          {abierto && pos && (
            <motion.div
              ref={menuRef}
              className="fixed z-[60] min-w-48 rounded-2xl bg-surface border border-line sombra-2 p-1.5"
              style={{ top: pos.top, left: pos.left, right: pos.right, transformOrigin: `${pos.origen} ${alinear === 'derecha' ? 'right' : 'left'}` }}
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: SUAVE }}
            >
              {items.filter(Boolean).map((it, i) =>
                it === '-' ? <div key={i} className="my-1 h-px bg-line" /> : (
                  <button
                    key={i}
                    disabled={it.disabled}
                    onClick={(e) => { e.stopPropagation(); setAbierto(false); it.onClick?.(e) }}
                    className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-[13.5px] text-left transition-colors disabled:opacity-40 ${it.peligro ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-surface-2/70'}`}
                  >
                    {it.icono && <Icon name={it.icono} size={17} className={it.peligro ? '' : 'text-ink-dim'} />}
                    <span className="flex-1">{it.label}</span>
                    {it.atajo && <kbd className="text-[11px] text-ink-mute font-sans">{it.atajo}</kbd>}
                  </button>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

// ── Avisos y confirmaciones (una sola instancia para toda la app) ───────

const AvisosCtx = createContext(null)

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const [confirmacion, setConfirmacion] = useState(null)

  const avisar = useCallback((texto, { tipo = 'info', accion, ms = 3200 } = {}) => {
    const id = Math.random()
    setAvisos((a) => [...a.slice(-2), { id, texto, tipo, accion }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), ms)
  }, [])

  const confirmar = useCallback((opts) => new Promise((resolve) => setConfirmacion({ ...opts, resolve })), [])
  const cerrar = (v) => { confirmacion?.resolve(v); setConfirmacion(null) }

  return (
    <AvisosCtx.Provider value={{ avisar, confirmar }}>
      {children}
      {createPortal(
        <div className="fixed z-[70] inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-6 flex flex-col items-center gap-2 pointer-events-none px-4">
          <AnimatePresence>
            {avisos.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.28, ease: SUAVE }}
                className={`pointer-events-auto flex items-center gap-3 rounded-full pl-4 pr-2 py-2 text-sm sombra-2 ${a.tipo === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg'}`}
              >
                <span className="py-0.5">{a.texto}</span>
                {a.accion && (
                  <button onClick={a.accion.onClick} className="rounded-full px-3 py-1 font-semibold bg-white/15 hover:bg-white/25">{a.accion.label}</button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
      <Hoja abierta={!!confirmacion} onClose={() => cerrar(false)} titulo={confirmacion?.titulo} ancho={420}
        pie={<>
          <Boton variante="fantasma" onClick={() => cerrar(false)}>Cancelar</Boton>
          <Boton variante={confirmacion?.peligro ? 'peligro' : 'primario'} onClick={() => cerrar(true)}>{confirmacion?.boton || 'Aceptar'}</Boton>
        </>}
      >
        <p className="text-sm text-ink-dim leading-relaxed">{confirmacion?.texto}</p>
      </Hoja>
    </AvisosCtx.Provider>
  )
}

export const useAvisos = () => useContext(AvisosCtx)

// ── Campos ───────────────────────────────────────────────────────────────

export function Etiqueta({ children, extra }) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{children}</span>
      {extra}
    </div>
  )
}

export function Contador({ valor, onChange, min = 0, max = 99, paso = 1, sufijo, ancho = 'w-12' }) {
  const n = Number(valor) || 0
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface h-10">
      <button className="w-9 h-full grid place-items-center text-ink-dim hover:text-ink disabled:opacity-30" disabled={n <= min} onClick={() => onChange(Math.max(min, n - paso))} aria-label="Menos">
        <span className="text-lg leading-none">−</span>
      </button>
      <input
        inputMode="numeric"
        className={`${ancho} text-center bg-transparent tabular font-semibold outline-none`}
        value={valor}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          onChange(v === '' ? '' : Math.min(max, Number(v)))
        }}
        onBlur={() => { if (valor === '') onChange(min) }}
      />
      {sufijo && <span className="text-xs text-ink-mute -ml-1 mr-1">{sufijo}</span>}
      <button className="w-9 h-full grid place-items-center text-ink-dim hover:text-ink disabled:opacity-30" disabled={n >= max} onClick={() => onChange(Math.min(max, n + paso))} aria-label="Más">
        <span className="text-lg leading-none">+</span>
      </button>
    </div>
  )
}

export function Chip({ activo, onClick, children, color, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium border transition-colors duration-200 ${activo ? 'border-transparent text-on-accent' : 'border-line text-ink-dim hover:text-ink bg-surface'} ${className}`}
      style={activo ? { background: color || 'var(--color-accent)' } : undefined}
    >
      {children}
    </motion.button>
  )
}

export function Vacio({ icono, titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-2/70 grid place-items-center text-ink-dim mb-4">
        <Icon name={icono} size={26} />
      </div>
      <h3 className="font-display font-semibold text-lg tracking-tight">{titulo}</h3>
      {texto && <p className="text-sm text-ink-dim mt-1 max-w-sm">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

export function PuntoTipo({ color, className = '' }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${className}`} style={{ background: color }} />
}
