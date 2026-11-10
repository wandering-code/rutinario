import { motion } from 'motion/react'

export function Interruptor({ activo, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={!!activo}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={`relative shrink-0 w-11 h-[26px] rounded-full transition-colors duration-300 disabled:opacity-40 ${activo ? 'bg-accent' : 'bg-surface-2'}`}
    >
      <motion.span
        className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white sombra-1"
        animate={{ x: activo ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
      />
    </button>
  )
}
