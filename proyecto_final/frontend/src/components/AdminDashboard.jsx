import { useEffect, useState } from 'react'
import { dashboardApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { SalesAnalytics } from './SalesAnalytics'

const cards = [
  ['usuarios', 'Usuarios registrados', 'personas'],
  ['productos', 'Productos activos', 'inventario'],
  ['servicios', 'Servicios activos', 'servicios'],
  ['ventas', 'Ventas registradas', 'operaciones'],
  ['facturacion', 'Facturación', 'ventas no canceladas'],
  ['facturas', 'Facturas emitidas', 'documentos vigentes'],
  ['pqrs_recibidas', 'PQR recibidas', 'solicitudes'],
  ['pqrs_pendientes', 'PQR pendientes', 'requieren atención'],
]

export const AdminDashboard = () => {
  const { token } = useAuth()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardApi.indicadores(token).then(setDatos).catch((e) => setError(e.message))
  }, [token])

  const valor = (key) => key === 'facturacion'
    ? `$${Number(datos?.[key] || 0).toLocaleString('es-CO')}`
    : Number(datos?.[key] || 0).toLocaleString('es-CO')

  return <section className="space-y-6 text-cream">
    <header><p className="text-xs uppercase tracking-[.2em] text-gold-light">Ely Marquez</p><h2 className="mt-1 font-display text-3xl text-gold-light">Dashboard administrativo</h2><p className="mt-2 text-sm text-cream-dim">Resumen actualizado de la actividad del sistema.</p></header>
    {error && <p role="alert" className="rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
    {!datos && !error ? <p className="text-cream-dim">Cargando indicadores…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([key, titulo, pie]) => <article key={key} className="rounded-xl border border-gold/25 bg-ink-soft p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-cream-dim">{titulo}</p><p className="mt-3 font-display text-3xl font-semibold text-gold-light">{valor(key)}</p></div><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-xl text-gold-light">{key.startsWith('pqr') ? '✉' : key === 'facturacion' ? '$' : key === 'ventas' ? '↗' : '◇'}</span></div>
        <p className="mt-4 border-t border-ink-line pt-3 text-xs text-cream-dim">{pie}</p>
      </article>)}
    </div>}
    <SalesAnalytics />
  </section>
}
