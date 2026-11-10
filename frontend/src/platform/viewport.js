import { useEffect, useState } from 'react'

// "Escritorio" a partir de 1024px: ahí caben los siete días de la semana a la vista.
export function useMedia(query) {
  const [ok, setOk] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setOk(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return ok
}
export const useEscritorio = () => useMedia('(min-width: 1024px)')
export const useTactil = () => useMedia('(pointer: coarse)')
