import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../ui/icons'
import { Logo } from '../ui/Logo'
import { RESORTE, SUAVE } from '../ui/piezas'
import { useEscritorio } from '../platform/viewport'
import Rutinas from './Rutinas'
import Editor from './editor/Editor'
import Biblioteca from './ejercicios/Biblioteca'
import Ajustes from './Ajustes'
import { Fallo } from '../ui/Fallo'

const SECCIONES = [
  { to: '/', label: 'Rutinas', icono: 'rutinas', fin: true },
  { to: '/ejercicios', label: 'Ejercicios', icono: 'dumbbell' },
  { to: '/ajustes', label: 'Ajustes', icono: 'settings' },
]

function activa(pathname, s) {
  if (s.to === '/') return pathname === '/' || pathname.startsWith('/rutina')
  return pathname.startsWith(s.to)
}

function BarraLateral({ compacta }) {
  const { pathname } = useLocation()
  return (
    <motion.nav
      animate={{ width: compacta ? 76 : 228 }}
      transition={{ duration: 0.35, ease: SUAVE }}
      className="shrink-0 h-full flex flex-col py-5 border-r border-line/70 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-[22px] mb-8 h-8">
        <Logo size={32} />
        <motion.span animate={{ opacity: compacta ? 0 : 1 }} className="font-display font-bold text-[17px] tracking-tight whitespace-nowrap">
          Rutinario
        </motion.span>
      </div>
      <div className="flex flex-col gap-1 px-3">
        {SECCIONES.map((s) => {
          const on = activa(pathname, s)
          return (
            <NavLink key={s.to} to={s.to} title={s.label}
              className={`relative flex items-center gap-3 h-10 px-[14px] rounded-xl text-[14px] font-medium transition-colors ${on ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              {on && <motion.span layoutId="nav-lateral" className="absolute inset-0 rounded-xl bg-surface sombra-1" transition={RESORTE} />}
              <Icon name={s.icono} size={20} className="relative" />
              <motion.span animate={{ opacity: compacta ? 0 : 1 }} className="relative whitespace-nowrap">{s.label}</motion.span>
            </NavLink>
          )
        })}
      </div>
    </motion.nav>
  )
}

function BarraInferior() {
  const { pathname } = useLocation()
  return (
    <nav className="shrink-0 border-t border-line/70 bg-bg/85 backdrop-blur-xl pb-segura">
      <div className="flex justify-around px-2 pt-1.5 pb-1.5">
        {SECCIONES.map((s) => {
          const on = activa(pathname, s)
          return (
            <NavLink key={s.to} to={s.to} className="relative flex flex-col items-center gap-0.5 w-24 py-1.5">
              {on && <motion.span layoutId="nav-inferior" className="absolute top-0 w-12 h-8 rounded-full bg-accent-soft" transition={RESORTE} />}
              <Icon name={s.icono} size={22} className={`relative mt-[5px] transition-colors ${on ? 'text-accent' : 'text-ink-mute'}`} />
              <span className={`text-[11px] font-medium transition-colors ${on ? 'text-ink' : 'text-ink-mute'}`}>{s.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default function Shell() {
  const escritorio = useEscritorio()
  const location = useLocation()
  const enEditor = location.pathname.startsWith('/rutina/')
  // Clave de transición: la sección, no la URL entera (cambiar de pestaña
  // dentro del editor no debe re-animar la pantalla).
  const clave = location.pathname.split('/').slice(0, 3).join('/')

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {escritorio && <BarraLateral compacta={enEditor} />}
      <main className="flex-1 min-w-0 min-h-0 relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={clave}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: SUAVE }}
          >
            <Fallo key={clave}>
            <Routes location={location}>
              <Route path="/" element={<Rutinas />} />
              <Route path="/rutina/:id" element={<Editor />} />
              <Route path="/ejercicios" element={<Biblioteca />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="*" element={<Rutinas />} />
            </Routes>
            </Fallo>
          </motion.div>
        </AnimatePresence>
      </main>
      {!escritorio && !enEditor && <BarraInferior />}
    </div>
  )
}

// Cabecera común de las pantallas de lista.
export function Cabecera({ titulo, subtitulo, children }) {
  return (
    <header className="pt-segura">
      <div className="flex items-end gap-3 px-5 lg:px-10 pt-6 lg:pt-10 pb-5">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[28px] lg:text-[34px] font-bold tracking-tight leading-none">{titulo}</h1>
          {subtitulo && <p className="text-ink-dim text-sm mt-2">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}
