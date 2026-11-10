import { useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../platform/auth'
import { Logo } from '../ui/Logo'
import { SUAVE } from '../ui/piezas'

export default function Login() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!password) return
    setEnviando(true)
    setError('')
    try {
      await login(password)
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto grid place-items-center px-6 pt-segura pb-segura">
      <motion.form
        onSubmit={enviar}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: SUAVE }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <Logo size={56} />
          <h1 className="font-display text-3xl font-bold tracking-tight mt-5">Rutinario</h1>
          <p className="text-ink-dim mt-1.5 text-[15px]">Diseña rutinas. Compártelas.</p>
        </div>
        <motion.div animate={error ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Contraseña"
            className="campo h-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </motion.div>
        <p className="h-6 pt-1.5 text-[13px] text-danger">{error}</p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={enviando || !password}
          className="w-full h-12 rounded-full bg-accent text-on-accent font-semibold disabled:opacity-50 transition-opacity"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </motion.button>
      </motion.form>
    </div>
  )
}
