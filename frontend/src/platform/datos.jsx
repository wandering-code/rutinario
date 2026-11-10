import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

// Biblioteca compartida por toda la app: músculos y ejercicios. Se carga una
// vez al entrar y cada pantalla la lee de aquí, así que editar un ejercicio en
// la biblioteca se ve al momento dentro de cualquier rutina abierta.
const Ctx = createContext(null)

export function DatosProvider({ children }) {
  const [taxonomia, setTaxonomia] = useState([])
  const [ejercicios, setEjercicios] = useState([])
  const [cargado, setCargado] = useState(false)
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([api('/taxonomy'), api('/exercises')])
      setTaxonomia(t)
      setEjercicios(e)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargado(true)
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  const guardarEjercicio = useCallback(async (ej) => {
    const { id, ...body } = ej
    const guardado = id ? await api(`/exercises/${id}`, { method: 'PUT', body }) : await api('/exercises', { method: 'POST', body })
    setEjercicios((xs) => {
      const otros = xs.filter((x) => x.id !== guardado.id)
      return [...otros, guardado].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    })
    return guardado
  }, [])

  const borrarEjercicio = useCallback(async (id) => {
    await api(`/exercises/${id}`, { method: 'DELETE' })
    setEjercicios((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const guardarTaxonomia = useCallback(async (data) => {
    const t = await api('/taxonomy', { method: 'PUT', body: data })
    setTaxonomia(t)
    // Los músculos borrados se quitan también de los ejercicios en el servidor.
    setEjercicios(await api('/exercises'))
    return t
  }, [])

  const valor = useMemo(() => {
    const porId = new Map(ejercicios.map((e) => [e.id, e]))
    const musculos = new Map()
    const grupoDe = new Map()
    for (const g of taxonomia) for (const m of g.muscles) { musculos.set(m.id, m); grupoDe.set(m.id, g) }
    return {
      taxonomia, ejercicios, porId, musculos, grupoDe, cargado, error,
      recargar, guardarEjercicio, borrarEjercicio, guardarTaxonomia,
    }
  }, [taxonomia, ejercicios, cargado, error, recargar, guardarEjercicio, borrarEjercicio, guardarTaxonomia])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const useDatos = () => useContext(Ctx)
