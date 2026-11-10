import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../platform/api'
import { normalizar } from '../../domain/rutina'

// Estado del editor: la rutina como documento, con deshacer/rehacer y
// guardado automático.
//
// Cada cambio pasa por `editar(fn, clave)`: `fn` recibe una copia y la
// modifica (lo que devuelva se ignora). Cambios seguidos con la misma `clave` en menos de 1,2 s se funden
// en un solo paso de deshacer (escribir "12" no son dos pasos).
export function useRutina(id) {
  const [estado, setEstado] = useState({ cargando: true, error: null })
  const [doc, setDoc] = useState(null) // { name, data, archived }
  const [guardado, setGuardado] = useState('guardado') // guardado | pendiente | guardando | error | conflicto
  const pasado = useRef([])
  const futuro = useRef([])
  const ultimo = useRef({ clave: null, t: 0 })
  const version = useRef(null)
  const sucio = useRef(false)
  const [, forzar] = useState(0)
  // La fuente de verdad es la ref: los actualizadores de setState no pueden
  // tener efectos (StrictMode los ejecuta dos veces y duplicaría el historial).
  const docRef = useRef(null)
  const poner = (d) => { docRef.current = d; setDoc(d) }

  useEffect(() => {
    let vivo = true
    api(`/routines/${id}`)
      .then((r) => {
        if (!vivo) return
        version.current = r.version
        poner({ name: r.name, data: normalizar(r.data), archived: r.archived })
        setEstado({ cargando: false, error: null })
      })
      .catch((e) => vivo && setEstado({ cargando: false, error: e }))
    return () => { vivo = false }
  }, [id])

  const editar = useCallback((fn, clave = null) => {
    const actual = docRef.current
    if (!actual) return
    const copia = structuredClone(actual)
    fn(copia)
    const nuevo = copia
    const ahora = Date.now()
    const fundir = clave && ultimo.current.clave === clave && ahora - ultimo.current.t < 1200
    if (!fundir) {
      pasado.current.push(actual)
      if (pasado.current.length > 200) pasado.current.shift()
    }
    futuro.current = []
    ultimo.current = { clave, t: ahora }
    sucio.current = true
    poner(nuevo)
    setGuardado((g) => (g === 'conflicto' ? g : 'pendiente'))
  }, [])

  const deshacer = useCallback(() => {
    if (!pasado.current.length) return
    futuro.current.push(docRef.current)
    poner(pasado.current.pop())
    ultimo.current = { clave: null, t: 0 }
    sucio.current = true
    setGuardado((g) => (g === 'conflicto' ? g : 'pendiente'))
  }, [])

  const rehacer = useCallback(() => {
    if (!futuro.current.length) return
    pasado.current.push(docRef.current)
    poner(futuro.current.pop())
    ultimo.current = { clave: null, t: 0 }
    sucio.current = true
    setGuardado((g) => (g === 'conflicto' ? g : 'pendiente'))
  }, [])

  // Guardado automático, 700 ms después del último cambio.
  const guardar = useCallback(async (d, forzarVersion) => {
    setGuardado('guardando')
    try {
      const r = await api(`/routines/${id}`, { method: 'PUT', body: { ...d, version: forzarVersion ?? version.current } })
      version.current = r.version
      setGuardado((g) => (g === 'guardando' ? 'guardado' : g))
      forzar((n) => n + 1)
    } catch (e) {
      setGuardado(e.status === 409 ? 'conflicto' : 'error')
    }
  }, [id])

  useEffect(() => {
    if (!doc || !sucio.current || guardado === 'conflicto') return
    const t = setTimeout(() => { sucio.current = false; guardar(doc) }, 700)
    return () => clearTimeout(t)
  }, [doc, guardar, guardado])

  // Si falla por red, se reintenta solo cada pocos segundos.
  useEffect(() => {
    if (guardado !== 'error') return
    const t = setTimeout(() => guardar(doc), 5000)
    return () => clearTimeout(t)
  }, [guardado, doc, guardar])

  // Antes de cerrar la pestaña con cambios sin guardar, avisar.
  useEffect(() => {
    const f = (e) => { if (guardado !== 'guardado') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [guardado])

  // Conflicto: o se recarga la del servidor, o se pisa con la de aquí.
  const resolverConflicto = useCallback(async (quedarseConLaMia) => {
    const r = await api(`/routines/${id}`)
    if (quedarseConLaMia) {
      version.current = r.version
      setGuardado('pendiente')
      await guardar(doc, r.version)
    } else {
      version.current = r.version
      pasado.current = []
      futuro.current = []
      poner({ name: r.name, data: normalizar(r.data), archived: r.archived })
      sucio.current = false
      setGuardado('guardado')
    }
  }, [id, doc, guardar])

  return {
    ...estado, doc, editar, deshacer, rehacer, guardado, resolverConflicto,
    puedeDeshacer: pasado.current.length > 0, puedeRehacer: futuro.current.length > 0,
  }
}
