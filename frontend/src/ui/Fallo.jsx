import { Component } from 'react'

// Si algo revienta al pintar, se enseña esto en vez de una pantalla en blanco.
export class Fallo extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="h-full grid place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h2 className="font-display text-xl font-bold tracking-tight">Algo ha fallado</h2>
          <p className="text-sm text-ink-dim mt-2">Tus datos están a salvo en el servidor. Recarga para seguir.</p>
          <pre className="text-[11px] text-ink-mute mt-4 whitespace-pre-wrap">{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => location.reload()} className="mt-5 h-10 px-5 rounded-full bg-accent text-on-accent text-sm font-medium">Recargar</button>
        </div>
      </div>
    )
  }
}
