import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '../../ui/icons'
import { Boton, Etiqueta, Segmentado, SUAVE, useAvisos } from '../../ui/piezas'
import { Interruptor } from '../../ui/Interruptor'
import { useDatos } from '../../platform/datos'
import { ANCHOS, Lamina } from '../../exports/Lamina'
import { aCSV, aMarkdown, aTexto } from '../../exports/texto'
import { aExcel } from '../../exports/excel'
import { blobJSON } from '../../exports/json'
import { compartir, copiarTexto, descargar, nombreArchivo, puedeCompartirArchivos } from '../../exports/comun'
import { DIAS_CORTO, nombreSemana } from '../../domain/rutina'

const FORMATOS = [
  { id: 'imagen', name: 'Imagen', desc: 'PNG para enviar por móvil', icono: 'image' },
  { id: 'pdf', name: 'PDF', desc: 'Para imprimir o archivar', icono: 'printer' },
  { id: 'excel', name: 'Excel', desc: 'Hoja por semana + volumen', icono: 'table' },
  { id: 'texto', name: 'Texto', desc: 'Para WhatsApp o Notas', icono: 'file' },
  { id: 'markdown', name: 'Markdown', desc: 'Con tablas, para Notion…', icono: 'note' },
  { id: 'csv', name: 'CSV', desc: 'Una fila por serie', icono: 'rutinas' },
  { id: 'json', name: 'Copia JSON', desc: 'Reimportable en Rutinario', icono: 'json' },
]

// Vista previa a escala: la lámina se pinta a su tamaño real (para que la
// imagen salga nítida) y se encoge con transform para caber en la pantalla.
function Escalado({ ancho, children }) {
  const caja = useRef(null)
  const dentro = useRef(null)
  const [esc, setEsc] = useState(0.4)
  const [alto, setAlto] = useState(0)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const e = Math.min(1, (caja.current?.clientWidth || 300) / ancho)
      setEsc(e)
      setAlto((dentro.current?.offsetHeight || 0) * e)
    })
    if (caja.current) ro.observe(caja.current)
    if (dentro.current) ro.observe(dentro.current)
    return () => ro.disconnect()
  }, [ancho])
  return (
    <div ref={caja} className="w-full">
      <div style={{ height: alto }} className="relative overflow-hidden rounded-2xl sombra-2 transition-[height] duration-300">
        <div ref={dentro} style={{ width: ancho, transform: `scale(${esc})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Opcion({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}

export default function Exportar({ nombre, data }) {
  const datos = useDatos()
  const { avisar } = useAvisos()
  const [formato, setFormato] = useState('imagen')
  const [semana, setSemana] = useState(data.weeks.length > 1 ? 'todas' : 0)
  const [disposicion, setDisposicion] = useState('horizontal')
  const [dia, setDia] = useState(0)
  const [tema, setTema] = useState('claro')
  const [notas, setNotas] = useState(true)
  const [fotos, setFotos] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const lamina = useRef(null)
  const compartible = useMemo(puedeCompartirArchivos, [])

  const visual = formato === 'imagen' || formato === 'pdf'
  const textual = formato === 'texto' || formato === 'markdown' || formato === 'csv'
  // Una imagen es de una sola semana.
  const semanaImagen = semana === 'todas' ? 0 : semana
  const opts = { semanas: semana, notas }

  const textoPrevio = useMemo(() => {
    if (formato === 'texto') return aTexto(nombre, data, opts)
    if (formato === 'markdown') return aMarkdown(nombre, data, opts)
    if (formato === 'csv') return aCSV(nombre, data, opts).slice(1)
    return ''
  }, [formato, nombre, data, semana, notas]) // eslint-disable-line

  useEffect(() => {
    if (!imprimiendo) return
    const fin = () => setImprimiendo(false)
    window.addEventListener('afterprint', fin)
    const t = setTimeout(() => window.print(), 250) // da tiempo a cargar las fotos
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin) }
  }, [imprimiendo])

  async function generar() {
    if (formato === 'imagen') {
      const { toBlob } = await import('html-to-image')
      return [await toBlob(lamina.current, { pixelRatio: 2, cacheBust: false }), 'png']
    }
    if (formato === 'excel') return [await aExcel(nombre, data, datos, opts), 'xlsx']
    if (formato === 'texto') return [new Blob([aTexto(nombre, data, opts)], { type: 'text/plain;charset=utf-8' }), 'txt']
    if (formato === 'markdown') return [new Blob([aMarkdown(nombre, data, opts)], { type: 'text/markdown;charset=utf-8' }), 'md']
    if (formato === 'csv') return [new Blob([aCSV(nombre, data, opts)], { type: 'text/csv;charset=utf-8' }), 'csv']
    if (formato === 'json') return [blobJSON({ name: nombre, data }), 'json']
  }

  async function accion(modo) {
    if (formato === 'pdf') return setImprimiendo(true)
    setTrabajando(true)
    try {
      const [blob, ext] = await generar()
      const sufijo = formato === 'imagen'
        ? `${data.weeks.length > 1 ? `-s${semanaImagen + 1}` : ''}${disposicion === 'dia' ? `-${DIAS_CORTO[dia].toLowerCase()}` : ''}`
        : ''
      const archivo = nombreArchivo(nombre + sufijo, ext)
      if (modo === 'compartir') {
        const r = await compartir(blob, archivo, nombre)
        if (r === 'descargado') avisar('Descargado')
      } else {
        descargar(blob, archivo)
        avisar('Descargado')
      }
    } catch (e) {
      console.error(e)
      avisar('No se pudo generar el archivo', { tipo: 'error' })
    } finally {
      setTrabajando(false)
    }
  }

  async function copiar() {
    const ok = await copiarTexto(formato === 'texto' ? aTexto(nombre, data, opts) : formato === 'markdown' ? aMarkdown(nombre, data, opts) : aCSV(nombre, data, opts))
    avisar(ok ? 'Copiado al portapapeles' : 'No se pudo copiar', { tipo: ok ? 'info' : 'error' })
  }

  const semanasOpciones = [
    ...(data.weeks.length > 1 && formato !== 'imagen' ? [{ id: 'todas', name: 'Todas' }] : []),
    ...data.weeks.map((w, i) => ({ id: i, name: data.weeks.length > 1 ? `S${i + 1}` : nombreSemana(w, i) })),
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 pb-40 lg:grid lg:grid-cols-[340px_1fr] lg:gap-8">
        <div className="space-y-6 lg:sticky lg:top-0 lg:self-start lg:max-h-full">
          <div>
            <Etiqueta>Formato</Etiqueta>
            <div className="grid grid-cols-2 gap-2">
              {FORMATOS.map((f) => {
                const on = formato === f.id
                return (
                  <motion.button key={f.id} whileTap={{ scale: 0.97 }} onClick={() => setFormato(f.id)}
                    className={`relative text-left rounded-2xl border p-3 transition-colors duration-200 ${on ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface hover:border-ink-mute/40'}`}>
                    <Icon name={f.icono} size={19} className={on ? 'text-accent' : 'text-ink-dim'} />
                    <div className="text-[13.5px] font-semibold mt-1.5">{f.name}</div>
                    <div className="text-[11.5px] text-ink-dim leading-snug">{f.desc}</div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {formato !== 'json' && (
            <div className="rounded-2xl bg-surface border border-line/70 px-4 py-1.5 divide-y divide-line/60">
              {data.weeks.length > 1 && (
                <div className="py-2.5">
                  <div className="text-sm mb-2">Semana</div>
                  <div className="flex flex-wrap gap-1">
                    <Segmentado tam="sm" opciones={semanasOpciones} valor={formato === 'imagen' ? semanaImagen : semana} onChange={setSemana} />
                  </div>
                </div>
              )}
              {formato === 'imagen' && (
                <div className="py-2.5">
                  <div className="text-sm mb-2">Disposición</div>
                  <Segmentado tam="sm" valor={disposicion} onChange={setDisposicion}
                    opciones={[{ id: 'horizontal', name: 'Semana' }, { id: 'vertical', name: 'Vertical' }, { id: 'dia', name: 'Un día' }]} />
                  <AnimatePresence initial={false}>
                    {disposicion === 'dia' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-7 gap-1 pt-2.5">
                          {DIAS_CORTO.map((d, i) => (
                            <button key={d} onClick={() => setDia(i)} className={`h-8 rounded-lg text-[12px] font-semibold transition-colors ${dia === i ? 'bg-ink text-bg' : 'bg-surface-2/60 text-ink-dim'}`}>{d}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {visual && (
                <Opcion label="Fondo">
                  <Segmentado tam="sm" valor={tema} onChange={setTema} opciones={[{ id: 'claro', name: 'Claro' }, { id: 'oscuro', name: 'Oscuro' }]} />
                </Opcion>
              )}
              {formato !== 'csv' && <Opcion label="Incluir notas"><Interruptor activo={notas} onChange={setNotas} /></Opcion>}
              {visual && <Opcion label="Fotos de los ejercicios"><Interruptor activo={fotos} onChange={setFotos} /></Opcion>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {formato === 'pdf' ? (
              <Boton variante="primario" icono="printer" onClick={() => accion()} className="flex-1">Imprimir / guardar PDF</Boton>
            ) : (
              <>
                {compartible && <Boton variante="primario" icono="share" disabled={trabajando} onClick={() => accion('compartir')} className="flex-1">Compartir</Boton>}
                <Boton variante={compartible ? 'secundario' : 'primario'} icono="download" disabled={trabajando} onClick={() => accion('descargar')} className="flex-1">
                  {trabajando ? 'Generando…' : 'Descargar'}
                </Boton>
                {textual && <Boton icono="copy" onClick={copiar}>Copiar</Boton>}
              </>
            )}
          </div>
          {formato === 'pdf' && <p className="text-[12px] text-ink-mute -mt-3">En el diálogo de imprimir, elige «Guardar como PDF». Sale una página por semana.</p>}
        </div>

        <div className="mt-8 lg:mt-0 min-w-0">
          <Etiqueta>Vista previa</Etiqueta>
          <AnimatePresence mode="wait">
            <motion.div key={formato + disposicion} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: SUAVE }}>
              {visual ? (
                <Escalado ancho={formato === 'pdf' ? ANCHOS.horizontal : ANCHOS[disposicion]}>
                  <Lamina ref={lamina} nombre={nombre} data={data} semana={semanaImagen} formato={formato === 'pdf' ? 'horizontal' : disposicion}
                    dia={dia} notas={notas} fotos={fotos} tema={tema} />
                </Escalado>
              ) : formato === 'excel' ? (
                <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-dim space-y-2">
                  <p className="font-medium text-ink">El libro de Excel incluye:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{semana === 'todas' ? `Una hoja por semana (${data.weeks.length})` : 'Una hoja con la semana elegida'}, con cada día en su color y cada ejercicio con series, reps, carga, RIR, descanso y tempo.</li>
                    <li>Una hoja «Series por músculo» con el recuento semanal y el objetivo coloreado.</li>
                    <li>Si algún ejercicio está detallado serie a serie, una hoja con ese detalle.</li>
                  </ul>
                </div>
              ) : formato === 'json' ? (
                <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-dim">
                  Copia exacta de la rutina. Se vuelve a cargar desde <b className="text-ink">Rutinas → Importar</b>, en esta o en otra instalación de Rutinario.
                </div>
              ) : (
                <pre className="rounded-2xl border border-line bg-surface p-5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words font-mono text-ink-dim max-h-[70vh] overflow-auto">{textoPrevio}</pre>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {imprimiendo && createPortal(
        <div id="hoja-impresion">
          {(semana === 'todas' ? data.weeks.map((_, i) => i) : [semana]).map((i) => (
            <div key={i} style={{ zoom: 1040 / ANCHOS.horizontal, breakAfter: 'page' }}>
              <Lamina nombre={nombre} data={data} semana={i} formato="horizontal" notas={notas} fotos={fotos} tema={tema} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
