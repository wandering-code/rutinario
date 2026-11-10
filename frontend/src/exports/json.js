import { descargar, nombreArchivo } from './comun'

// Copia completa de una rutina, reimportable desde la lista de rutinas.
export function blobJSON(r) {
  const contenido = { rutinario: 1, exportado: new Date().toISOString(), name: r.name, data: r.data }
  return new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' })
}

export const descargarJSON = (r) => descargar(blobJSON(r), nombreArchivo(r.name, 'json'))
