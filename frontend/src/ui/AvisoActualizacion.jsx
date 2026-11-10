import { AnimatePresence, motion } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Boton, SUAVE } from './piezas'

// Cuando hay un build nuevo el service worker lo descarga en segundo plano y
// aquí se ofrece aplicarlo. Sin esto, la app instalada seguiría enseñando la
// versión que se cacheó la primera vez.
export default function AvisoActualizacion() {
  const { needRefresh: [hay], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_, reg) {
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000)
    },
  })
  return (
    <AnimatePresence>
      {hay && (
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: SUAVE }}
          className="fixed z-[80] top-[calc(env(safe-area-inset-top)+12px)] left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-surface border border-line sombra-2 pl-4 pr-1.5 py-1.5 text-sm"
        >
          Hay una versión nueva
          <Boton tam="sm" variante="primario" onClick={() => updateServiceWorker(true)}>Actualizar</Boton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
