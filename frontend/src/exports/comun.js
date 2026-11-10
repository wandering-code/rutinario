// Descargar o compartir un archivo generado en el navegador.

export function nombreArchivo(nombre, ext) {
  const base = (nombre || 'rutina').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  return `${base || 'rutina'}.${ext}`
}

export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const puedeCompartirArchivos = () => {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })
  } catch { return false }
}

// Hoja de compartir del sistema (WhatsApp, AirDrop, Mail…). Si el navegador
// no la tiene, se descarga.
export async function compartir(blob, nombre, titulo) {
  const file = new File([blob], nombre, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo })
      return 'compartido'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado'
    }
  }
  descargar(blob, nombre)
  return 'descargado'
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Sin contexto seguro (http en LAN) no hay API de portapapeles.
    const t = document.createElement('textarea')
    t.value = texto
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    return ok
  }
}

// Semanas a exportar según la opción elegida ('todas' o un índice).
export const semanasElegidas = (data, cual) =>
  data.weeks.map((w, i) => ({ w, i })).filter(({ i }) => cual === 'todas' || cual === i)
