import { useCallback, useEffect, useState } from 'react'
import { pqrsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const inicial = { tipo: 'peticion', asunto: '', descripcion: '' }
const estados = ['pendiente', 'en_proceso', 'respondida', 'cerrada']
const etiquetas = { pendiente: 'Pendiente', en_proceso: 'En proceso', respondida: 'Respondida', cerrada: 'Cerrada' }

export const PQRManager = () => {
  const { token, rol } = useAuth()
  const esStaff = rol === 'administrador' || rol === 'empleado'
  const [items, setItems] = useState([])
  const [form, setForm] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try { setItems(await (esStaff ? pqrsApi.listar(token) : pqrsApi.mias(token))); setError('') }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }, [esStaff, token])
  useEffect(() => { cargar() }, [cargar])

  const registrar = async (event) => {
    event.preventDefault(); setEnviando(true); setError(''); setMensaje('')
    try {
      const resultado = await pqrsApi.registrar(form, token)
      setMensaje(`${resultado.mensaje} Número de solicitud: ${resultado.id_pqr}.`)
      setForm(inicial); await cargar()
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }
  const cambiarEstado = async (id, estado) => {
    setError('')
    try { await pqrsApi.actualizarEstado(id, estado, token); await cargar() }
    catch (e) { setError(e.message) }
  }

  return <section className="space-y-6 text-cream">
    <header><p className="text-xs uppercase tracking-[.2em] text-gold-light">Atención al cliente</p><h2 className="mt-1 font-display text-3xl text-gold-light">{esStaff ? 'Gestión de PQR' : 'Mis PQR'}</h2><p className="mt-2 text-sm text-cream-dim">{esStaff ? 'Consulta solicitudes y actualiza su estado de atención.' : 'Registra peticiones, quejas, reclamos o sugerencias y consulta su seguimiento.'}</p></header>
    {mensaje && <p role="status" className="rounded border border-emerald-300/30 bg-emerald-900/20 p-3 text-emerald-100">{mensaje}</p>}
    {error && <p role="alert" className="rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
    {!esStaff && <form onSubmit={registrar} className="grid gap-4 rounded-xl border border-gold/20 bg-ink-soft p-5 md:grid-cols-2">
      <label className="text-sm">Tipo de solicitud<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="mt-1 w-full rounded bg-ink p-2"><option value="peticion">Petición</option><option value="queja">Queja</option><option value="reclamo">Reclamo</option><option value="sugerencia">Sugerencia</option></select></label>
      <label className="text-sm">Asunto<input required minLength={4} maxLength={120} value={form.asunto} onChange={e=>setForm({...form,asunto:e.target.value})} className="mt-1 w-full rounded bg-ink p-2" /></label>
      <label className="text-sm md:col-span-2">Descripción<textarea required minLength={10} maxLength={5000} rows={5} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} className="mt-1 w-full rounded bg-ink p-3" /></label>
      <button disabled={enviando} className="w-fit rounded bg-crimson-bright px-5 py-2 font-semibold">{enviando ? 'Enviando…' : 'Registrar solicitud'}</button>
    </form>}
    {cargando ? <p className="text-cream-dim">Cargando solicitudes…</p> : <div className="space-y-3">{items.map((pqr)=><article key={pqr.id_pqr} className="rounded-xl border border-gold/20 bg-ink-soft p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-gold-light">#{pqr.id_pqr} · {pqr.tipo}</p><h3 className="mt-1 text-lg font-semibold">{pqr.asunto}</h3>{esStaff && <p className="text-sm text-cream-dim">{pqr.cliente} · {pqr.correo}</p>}</div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pqr.estado==='pendiente'?'border-amber-300/40 text-amber-200':pqr.estado==='en_proceso'?'border-blue-300/40 text-blue-200':'border-emerald-300/40 text-emerald-200'}`}>{etiquetas[pqr.estado] || pqr.estado}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-cream-dim">{pqr.descripcion}</p><p className="mt-3 text-xs text-cream-dim">Recibida: {new Date(pqr.creado_en).toLocaleString('es-CO')}</p>
      {esStaff && <label className="mt-4 block max-w-xs text-sm">Actualizar estado<select value={pqr.estado} onChange={e=>cambiarEstado(pqr.id_pqr,e.target.value)} className="mt-1 w-full rounded bg-ink p-2">{estados.map(e=><option key={e} value={e}>{etiquetas[e]}</option>)}</select></label>}
    </article>)}{items.length===0 && <p className="rounded-xl border border-ink-line p-5 text-cream-dim">{esStaff ? 'No hay solicitudes recibidas.' : 'Aún no has registrado solicitudes.'}</p>}</div>}
  </section>
}
