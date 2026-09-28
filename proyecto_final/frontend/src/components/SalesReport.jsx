import { useEffect, useState } from 'react'
import { ventasApi, usuariosApi, productosApi, serviciosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const hoy = new Date().toISOString().slice(0, 10)
const dinero = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`

export const SalesReport = () => {
  const { token } = useAuth()
  const [filtros, setFiltros] = useState({ fecha_desde: '', fecha_hasta: '', cliente: '', producto: '', servicio: '', estado: '', valor_min: '', valor_max: '' })
  const [ventas, setVentas] = useState([])
  const [catalogos, setCatalogos] = useState({ clientes: [], productos: [], servicios: [] })
  const [fecha, setFecha] = useState(hoy)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [vista, setVista] = useState('ventas')
  const [filtrosFactura, setFiltrosFactura] = useState({ numero: '', cliente: '', fecha_desde: '', fecha_hasta: '' })
  const [facturas, setFacturas] = useState([])

  useEffect(() => {
    Promise.all([usuariosApi.listar(token), productosApi.listar(), serviciosApi.listar()])
      .then(([usuarios, productos, servicios]) => setCatalogos({ clientes: usuarios.filter((u) => u.nombre_rol === 'cliente'), productos, servicios }))
      .catch((e) => setError(e.message))
  }, [token])

  const buscar = async (event) => {
    event?.preventDefault()
    setCargando(true); setError('')
    try { setVentas(await ventasApi.historial(filtros, token)) } catch (e) { setError(e.message) } finally { setCargando(false) }
  }
  const exportar = async () => {
    setError('')
    try {
      const blob = await ventasApi.pdf(fecha, token)
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = `reporte-ventas-${fecha}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError(e.message) }
  }
  const exportarExcel = async () => {
    setError('')
    try {
      const blob = await ventasApi.excel(fecha, token)
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = `reporte-ventas-${fecha}.xlsx`; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError(e.message) }
  }
  const buscarFacturas = async (event) => {
    event?.preventDefault(); setError('')
    try { setFacturas(await ventasApi.facturas(filtrosFactura, token)) } catch (e) { setError(e.message) }
  }
  const descargarFactura = async (numero) => {
    try {
      const blob = await ventasApi.pdfFactura(numero, token); const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = `${numero}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setError(e.message) }
  }
  const estadoVenta = async (venta, estado) => {
    setError('')
    try { await ventasApi.cambiarEstado(venta.id_venta, estado, token); await buscar() } catch (e) { setError(e.message) }
  }

  return <div className="space-y-6 text-cream">
    <header><p className="text-xs uppercase tracking-[.2em] text-gold-light">Gestión comercial</p><h2 className="mt-1 font-display text-3xl text-gold-light">Ventas y facturas</h2><p className="mt-2 text-sm text-cream-dim">Consulta operaciones y descarga reportes o facturas.</p></header>
    {error && <p role="alert" className="rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
    <div className="flex gap-2"><button onClick={()=>setVista('ventas')} className={`rounded px-4 py-2 ${vista==='ventas'?'bg-gold text-ink':'border border-gold/30'}`}>Historial de ventas</button><button onClick={()=>setVista('facturas')} className={`rounded px-4 py-2 ${vista==='facturas'?'bg-gold text-ink':'border border-gold/30'}`}>Facturas</button></div>
    {vista === 'facturas' ? <>
      <form onSubmit={buscarFacturas} className="grid gap-3 rounded-xl border border-gold/20 bg-ink-soft p-4 md:grid-cols-4">
        <label className="text-sm">Número de factura<input value={filtrosFactura.numero} onChange={e=>setFiltrosFactura({...filtrosFactura,numero:e.target.value})} placeholder="FV-00000001" className="mt-1 w-full rounded bg-ink p-2" /></label>
        <label className="text-sm">Cliente<select value={filtrosFactura.cliente} onChange={e=>setFiltrosFactura({...filtrosFactura,cliente:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="">Todos</option>{catalogos.clientes.map(c=><option key={c.id_usuario} value={c.id_usuario}>{c.nombre} {c.apellido}</option>)}</select></label>
        <label className="text-sm">Desde<input type="date" value={filtrosFactura.fecha_desde} onChange={e=>setFiltrosFactura({...filtrosFactura,fecha_desde:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
        <label className="text-sm">Hasta<input type="date" value={filtrosFactura.fecha_hasta} onChange={e=>setFiltrosFactura({...filtrosFactura,fecha_hasta:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
        <button className="w-fit rounded bg-crimson-bright px-4 py-2 font-semibold md:col-span-4">Buscar facturas</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-gold/20"><table className="w-full text-left text-sm"><thead className="bg-ink-soft text-gold-light"><tr>{['Factura','Fecha','Cliente','Total','Estado','Descarga'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{facturas.map(f=><tr key={f.numero_factura} className="border-t border-ink-line"><td className="p-3">{f.numero_factura}</td><td className="p-3">{new Date(f.fecha_emision).toLocaleString('es-CO')}</td><td className="p-3">{f.cliente}</td><td className="p-3">{dinero(f.total)}</td><td className="p-3 capitalize">{f.factura_estado}</td><td className="p-3"><button onClick={()=>descargarFactura(f.numero_factura)} className="text-gold-light hover:underline">Descargar PDF</button></td></tr>)}</tbody></table>{facturas.length===0&&<p className="p-5 text-cream-dim">Busca para consultar las facturas registradas.</p>}</div>
    </> : <>
    <form onSubmit={buscar} className="grid gap-3 rounded-xl border border-gold/20 bg-ink-soft p-4 md:grid-cols-4">
      <label className="text-sm">Desde<input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros({...filtros, fecha_desde:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
      <label className="text-sm">Hasta<input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros({...filtros, fecha_hasta:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
      <label className="text-sm">Cliente<select value={filtros.cliente} onChange={(e) => setFiltros({...filtros, cliente:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="">Todos</option>{catalogos.clientes.map(c=><option key={c.id_usuario} value={c.id_usuario}>{c.nombre} {c.apellido}</option>)}</select></label>
      <label className="text-sm">Producto<select value={filtros.producto} onChange={(e) => setFiltros({...filtros, producto:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="">Todos</option>{catalogos.productos.map(p=><option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}</select></label>
      <label className="text-sm">Servicio<select value={filtros.servicio} onChange={(e) => setFiltros({...filtros, servicio:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="">Todos</option>{catalogos.servicios.map(s=><option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}</select></label>
      <label className="text-sm">Estado<select value={filtros.estado} onChange={(e) => setFiltros({...filtros, estado:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="">Todos</option><option>pendiente</option><option>pagada</option><option>cancelada</option></select></label>
      <label className="text-sm">Valor mínimo<input type="number" min="0" value={filtros.valor_min} onChange={(e) => setFiltros({...filtros, valor_min:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
      <label className="text-sm">Valor máximo<input type="number" min="0" value={filtros.valor_max} onChange={(e) => setFiltros({...filtros, valor_max:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
      <div className="flex items-end gap-2 md:col-span-4"><button className="rounded bg-crimson-bright px-4 py-2 font-semibold" disabled={cargando}>{cargando ? 'Consultando…' : 'Consultar historial'}</button><button type="button" onClick={()=>setFiltros({fecha_desde:'',fecha_hasta:'',cliente:'',producto:'',servicio:'',estado:'',valor_min:'',valor_max:''})} className="rounded border border-gold/30 px-4 py-2">Limpiar filtros</button></div>
    </form>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gold/20 bg-ink-soft p-4"><label className="text-sm">Fecha del reporte diario<input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} className="mt-1 block rounded bg-ink p-2" /></label><button onClick={exportar} className="rounded bg-gold px-4 py-2 font-semibold text-ink">Descargar PDF</button><button onClick={exportarExcel} className="rounded border border-gold/40 px-4 py-2 font-semibold text-gold-light">Descargar Excel (.xlsx)</button></div>
    {error && <p role="alert" className="rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-gold/20"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-ink-soft text-gold-light"><tr>{['Venta / fecha','Cliente','Productos y servicios','Subtotal','Descuento','Impuestos','Total','Estado','Acciones'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{ventas.map(v=><tr key={v.id_venta} className="border-t border-ink-line align-top"><td className="p-3">#{v.id_venta}<br/>{new Date(v.fecha_venta).toLocaleString('es-CO')}</td><td className="p-3">{v.cliente}</td><td className="p-3">{v.detalles.map(d=><div key={`${d.tipo}-${d.nombre_item}`}>{d.tipo}: {d.nombre_item} × {d.cantidad}</div>)}</td><td className="p-3">{dinero(v.subtotal)}</td><td className="p-3">{dinero(v.descuento)}</td><td className="p-3">{dinero(v.impuestos)}</td><td className="p-3 font-semibold">{dinero(v.total)}</td><td className="p-3 capitalize">{v.estado}</td><td className="p-3">{v.estado !== 'cancelada' && <div className="flex flex-col gap-2"><button onClick={()=>estadoVenta(v, 'pagada')} className="text-left text-gold-light hover:underline">Marcar pagada</button><button onClick={()=>estadoVenta(v, 'cancelada')} className="text-left text-red-300 hover:underline">Cancelar</button></div>}</td></tr>)}</tbody></table>{ventas.length===0&&<p className="p-5 text-cream-dim">No hay ventas para los filtros seleccionados.</p>}</div>
    </>}
  </div>
}
