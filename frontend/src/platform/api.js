// Todo lo que va al backend pasa por aquí. nginx (y Vite en dev) mandan /api
// al backend quitando el prefijo.
export async function api(path, { method = 'GET', body, headers, ...rest } = {}) {
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...rest,
    })
  } catch {
    throw Object.assign(new Error('Sin conexión con el servidor'), { status: 0 })
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    const msg = typeof detail.detail === 'string' ? detail.detail : `Error ${res.status}`
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('rutinario:sesion-caducada'))
    throw Object.assign(new Error(msg), { status: res.status })
  }
  return res.status === 204 ? null : res.json()
}

export async function subirImagen(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { url } = await api('/uploads', { method: 'POST', body: fd })
  return url
}
