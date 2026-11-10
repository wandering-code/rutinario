import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  // null = comprobando, false = sin sesión, true = dentro
  const [dentro, setDentro] = useState(null)

  useEffect(() => {
    api('/auth/me').then(() => setDentro(true)).catch(() => setDentro(false))
    const fuera = () => setDentro(false)
    window.addEventListener('rutinario:sesion-caducada', fuera)
    return () => window.removeEventListener('rutinario:sesion-caducada', fuera)
  }, [])

  const login = useCallback(async (password) => {
    await api('/auth/login', { method: 'POST', body: { password } })
    setDentro(true)
  }, [])
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setDentro(false)
  }, [])

  return <Ctx.Provider value={{ dentro, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
