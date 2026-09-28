// Cliente HTTP centralizado para comunicarse con el Backend
// (FastAPI + MySQL).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que FastAPI esté activo y que VITE_API_URL sea correcta.')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const mensaje = data?.mensaje || data?.detail?.mensaje || 'Ocurrió un error al comunicarse con el servidor.'
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    throw new Error(mensaje)
  }

  return data
}

const download = async (path, token, message) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { headers })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que FastAPI esté activo y que VITE_API_URL sea correcta.')
  }
  if (!response.ok) {
    let data = null
    try { data = await response.json() } catch { data = null }
    if (response.status === 401 && token) window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error(data?.mensaje || data?.detail?.mensaje || message)
  }
  return response.blob()
}

const queryString = (filtros = {}) => {
  const query = new URLSearchParams(Object.entries(filtros).filter(([, value]) => value !== '' && value != null))
  return query.size ? `?${query}` : ''
}

// ---------- Autenticación ----------
export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  perfil: (token) => request('/auth/perfil', { token }),
}

// ---------- Usuarios (administración) ----------
export const usuariosApi = {
  listar: (token, filtros) => request(`/usuarios${queryString(filtros)}`, { token }),
  crear: (payload, token) => request('/usuarios', { method: 'POST', body: payload, token }),
  actualizar: (id, payload, token) => request(`/usuarios/${id}`, { method: 'PUT', body: payload, token }),
  actualizarMiPerfil: (payload, token) => request('/usuarios/me', { method: 'PUT', body: payload, token }),
  cambiarEstado: (id, estado, token) => request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
  eliminar: (id, token) => request(`/usuarios/${id}`, { method: 'DELETE', token }),
}

// ---------- Productos ----------
export const productosApi = {
  listar: (filtros) => request(`/productos${queryString(filtros)}`),
  crear: (payload, token) => request('/productos', { method: 'POST', body: payload, token }),
  actualizar: (id, payload, token) => request(`/productos/${id}`, { method: 'PUT', body: payload, token }),
  eliminar: (id, token) => request(`/productos/${id}`, { method: 'DELETE', token }),
}

// ---------- Servicios ----------
export const serviciosApi = {
  listar: (filtros) => request(`/servicios${queryString(filtros)}`),
  crear: (payload, token) => request('/servicios', { method: 'POST', body: payload, token }),
  actualizar: (id, payload, token) => request(`/servicios/${id}`, { method: 'PUT', body: payload, token }),
  eliminar: (id, token) => request(`/servicios/${id}`, { method: 'DELETE', token }),
}

// ---------- Ventas e informes ----------
export const ventasApi = {
  registrar: (payload, token) => request('/ventas', { method: 'POST', body: payload, token }),
  historial: (filtros, token) => {
    return request(`/ventas${queryString(filtros)}`, { token })
  },
  reporte: (fecha, token) => request(`/ventas/reporte-diario?fecha=${encodeURIComponent(fecha)}`, { token }),
  cambiarEstado: (id, estado, token) => request(`/ventas/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
  pdf: (fecha, token) => download(`/ventas/reporte-diario/pdf?fecha=${encodeURIComponent(fecha)}`, token, 'No fue posible generar el reporte PDF.'),
  excel: (fecha, token) => download(`/ventas/reporte-diario/excel?fecha=${encodeURIComponent(fecha)}`, token, 'No fue posible generar el archivo Excel.'),
  facturas: (filtros, token) => {
    return request(`/ventas/facturas${queryString(filtros)}`, { token })
  },
  pdfFactura: (numero, token) => download(`/ventas/facturas/${encodeURIComponent(numero)}/pdf`, token, 'No fue posible descargar la factura.'),
}

export const dashboardApi = {
  indicadores: (token) => request('/dashboard', { token }),
  ventas: (filtros, token) => {
    return request(`/dashboard/ventas${queryString(filtros)}`, { token })
  },
}

export const pqrsApi = {
  registrar: (payload, token) => request('/pqrs', { method: 'POST', body: payload, token }),
  mias: (token) => request('/pqrs/mias', { token }),
  listar: (token) => request('/pqrs', { token }),
  actualizarEstado: (id, estado, token) => request(`/pqrs/${id}/estado`, { method: 'PATCH', body: { estado }, token }),
}

export const chatbotApi = {
  responder: (mensaje, historial = []) => request('/chatbot/message', { method: 'POST', body: { mensaje, historial } }),
}
