import { AnimatePresence, motion } from 'motion/react'
import { AuthProvider, useAuth } from './platform/auth'
import { DatosProvider } from './platform/datos'
import { AvisosProvider } from './ui/piezas'
import Login from './screens/Login'
import Shell from './screens/Shell'
import AvisoActualizacion from './ui/AvisoActualizacion'

function Puerta() {
  const { dentro } = useAuth()
  return (
    <AnimatePresence mode="wait">
      {dentro === null ? (
        <motion.div key="cargando" className="h-full grid place-items-center" exit={{ opacity: 0 }}>
          <div className="w-6 h-6 rounded-full border-2 border-line border-t-accent animate-spin" />
        </motion.div>
      ) : dentro ? (
        <motion.div key="app" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <DatosProvider>
            <Shell />
          </DatosProvider>
        </motion.div>
      ) : (
        <motion.div key="login" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Login />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AvisosProvider>
        <Puerta />
        <AvisoActualizacion />
      </AvisosProvider>
    </AuthProvider>
  )
}
