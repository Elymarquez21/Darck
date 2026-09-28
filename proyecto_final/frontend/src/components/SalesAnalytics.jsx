import { useEffect, useMemo, useState } from 'react'
import { dashboardApi, productosApi, serviciosApi, usuariosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const initial = { fecha_desde: '', fecha_hasta: '', agrupacion: 'dia', producto: '', servicio: '', estado: '', cliente: '' }
const dinero = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`

export const SalesAnalytics = () => {
  const { token, rol } = useAuth()
  const [filtros, setFiltros] = useState(initial)
  const [datos, setDatos] = useState(null)
  const [catalogos, setCatalogos] = useState({ productos: [], servicios: [], clientes: [] })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const peticiones = [productosApi.listar(), serviciosApi.listar()]
    if (rol !== 'cliente') peticiones.push(usuariosApi.listar(token))
    Promise.all(peticiones).then(([productos, servicios, usuarios = []]) => setCatalogos({
      productos: productos.filter((p) => p.estado === 'activo'),
      servicios: servicios.filter((s) => s.estado === 'activo'),
      clientes: usuarios.filter((u) => u.nombre_rol === 'cliente' && u.estado === 'activo'),
    })).catch((e) => setError(e.message))
  }, [rol, token])

  const consultar = async (event) => {
    event?.preventDefault(); setCargando(true); setError('')
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, value]) => value !== ''))
      setDatos(await dashboardApi.ventas(params, token))
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }

  const serie = datos?.serie || []
  const maximoBarras = Math.max(1, ...serie.map((p) => p.ventas))
  const puntosLinea = useMemo(() => {
    const max = Math.max(1, ...serie.map((p) => p.facturacion))
    return serie.map((p, i) => `${serie.length < 2 ? 300 : 20 + (i * 560) / (serie.length - 1)},${170 - (p.facturacion * 145) / max}`).join(' ')
  }, [serie])
  const formatoPeriodo = (periodo) => {
    if (filtros.agrupacion === 'mes') return periodo
    const fecha = new Date(`${periodo}T12:00:00`)
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  return <section className="space-y-5 rounded-xl border border-gold/20 bg-ink-soft/50 p-4 md:p-6">
    <header><p className="text-xs uppercase tracking-[.2em] text-gold-light">Análisis de ventas</p><h3 className="mt-1 font-display text-2xl text-gold-light">Comportamiento comercial</h3><p className="mt-2 text-sm text-cream-dim">Consulta tendencias por día, semana o mes con filtros sobre ventas registradas.</p></header>
    <form onSubmit={consultar} className="grid gap-3 rounded-xl border border-gold/15 bg-ink p-4 md:grid-cols-4">
      <label className="text-sm">Fecha inicial<input type="date" value={filtros.fecha_desde} onChange={(e)=>setFiltros({...filtros,fecha_desde:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2" /></label>
      <label className="text-sm">Fecha final<input type="date" value={filtros.fecha_hasta} onChange={(e)=>setFiltros({...filtros,fecha_hasta:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2" /></label>
      <label className="text-sm">Agrupar por<select value={filtros.agrupacion} onChange={(e)=>setFiltros({...filtros,agrupacion:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2"><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option></select></label>
      <label className="text-sm">Estado<select value={filtros.estado} onChange={(e)=>setFiltros({...filtros,estado:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2"><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="pagada">Pagada</option><option value="cancelada">Cancelada</option></select></label>
      <label className="text-sm">Producto<select value={filtros.producto} onChange={(e)=>setFiltros({...filtros,producto:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2"><option value="">Todos</option>{catalogos.productos.map(p=><option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}</select></label>
      <label className="text-sm">Servicio<select value={filtros.servicio} onChange={(e)=>setFiltros({...filtros,servicio:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2"><option value="">Todos</option>{catalogos.servicios.map(s=><option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}</select></label>
      {rol !== 'cliente' && <label className="text-sm">Cliente<select value={filtros.cliente} onChange={(e)=>setFiltros({...filtros,cliente:e.target.value})} className="mt-1 w-full rounded bg-ink-soft p-2"><option value="">Todos</option>{catalogos.clientes.map(c=><option key={c.id_usuario} value={c.id_usuario}>{c.nombre} {c.apellido}</option>)}</select></label>}
      <div className="flex items-end gap-2"><button disabled={cargando} className="rounded bg-crimson-bright px-4 py-2 font-semibold">{cargando ? 'Actualizando…' : 'Aplicar filtros'}</button><button type="button" onClick={()=>setFiltros(initial)} className="rounded border border-gold/30 px-3 py-2">Limpiar</button></div>
    </form>
    {error && <p role="alert" className="rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
    {datos && <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Ventas", datos.indicadores.ventas], ["Facturación", dinero(datos.indicadores.facturacion)], ["Promedio por venta", dinero(datos.indicadores.promedio_venta)]].map(([label,value])=><article key={label} className="rounded-xl border border-gold/25 bg-ink-soft p-4"><p className="text-sm text-cream-dim">{label}</p><p className="mt-2 font-display text-2xl text-gold-light">{value}</p></article>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-xl border border-gold/20 bg-ink-soft p-4"><h4 className="font-semibold text-cream">Ventas por {filtros.agrupacion}</h4>{serie.length ? <div className="mt-4 overflow-x-auto"><div className="grid h-56 min-w-max grid-flow-col auto-cols-[2.75rem] items-end gap-2 border-b border-l border-ink-line px-2">{serie.map((p)=><div key={p.periodo} title={`${formatoPeriodo(p.periodo)}: ${p.ventas} ventas`} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[10px] text-cream-dim">{p.ventas}</span><div className="w-6 rounded-t bg-gold" style={{height:`${Math.max(p.ventas ? 5 : 0,(p.ventas/maximoBarras)*74)}%`}}/><span className="whitespace-nowrap text-[10px] text-cream-dim">{formatoPeriodo(p.periodo)}</span></div>)}</div></div> : <p className="py-12 text-center text-sm text-cream-dim">Sin ventas para este periodo.</p>}</article>
        <article className="min-w-0 rounded-xl border border-gold/20 bg-ink-soft p-4"><h4 className="font-semibold text-cream">Facturación por {filtros.agrupacion}</h4>{serie.some(p=>p.facturacion>0) ? <div className="mt-4"><svg role="img" aria-label="Gráfico lineal de facturación" viewBox="0 0 600 200" className="h-56 w-full overflow-visible"><line x1="20" y1="170" x2="580" y2="170" stroke="currentColor" className="text-ink-line"/><polyline points={puntosLinea} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" className="text-gold"/>{serie.map((p,i)=><circle key={p.periodo} cx={serie.length<2?300:20+(i*560)/(serie.length-1)} cy={170-(p.facturacion*145)/Math.max(1,...serie.map(x=>x.facturacion))} r="4" fill="currentColor" className="text-gold"><title>{formatoPeriodo(p.periodo)}: {dinero(p.facturacion)}</title></circle>)}</svg><div className="flex justify-between text-xs text-cream-dim"><span>{serie[0] && formatoPeriodo(serie[0].periodo)}</span><span>{serie.at(-1) && formatoPeriodo(serie.at(-1).periodo)}</span></div></div> : <p className="py-12 text-center text-sm text-cream-dim">Sin facturación para este periodo.</p>}</article>
      </div>
    </>}
  </section>
}
