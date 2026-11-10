import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const CLAVE = 'rutinario.tema'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function leer() {
  try { return localStorage.getItem(CLAVE) || 'sistema' } catch { return 'sistema' }
}
const resolver = (pref) => (pref === 'oscuro' || (pref === 'sistema' && media().matches) ? 'oscuro' : 'claro')

function aplicar(tema) {
  document.documentElement.dataset.tema = tema
  const color = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color))
}

export function useTema() {
  const [pref, setPref] = useState(leer)

  useEffect(() => {
    aplicar(resolver(pref))
    if (pref !== 'sistema') return
    const mq = media()
    const cambio = () => aplicar(resolver('sistema'))
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [pref])

  // El cambio se anima con un círculo que crece desde donde se pulsó.
  function cambiar(nueva, evento) {
    try { localStorage.setItem(CLAVE, nueva) } catch {}
    const antes = document.documentElement.dataset.tema
    const despues = resolver(nueva)
    if (!document.startViewTransition || antes === despues || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPref(nueva)
      return
    }
    const x = evento?.clientX ?? innerWidth / 2
    const y = evento?.clientY ?? innerHeight / 2
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const t = document.startViewTransition(() => {
      flushSync(() => setPref(nueva))
      aplicar(despues)
    })
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }

  return { pref, cambiar }
}
