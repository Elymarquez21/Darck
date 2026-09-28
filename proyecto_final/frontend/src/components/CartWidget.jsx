import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ventasApi } from '../services/api'

const formatoPrecio = (valor) => `$${Number(valor).toLocaleString('es-CO')}`

export const CartWidget = () => {
  const { rol, token } = useAuth()
  const { items, cambiarCantidad, quitarItem, vaciarCarrito, cantidadTotal, total } = useCart()
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorCompra, setErrorCompra] = useState('')

  const finalizarCompra = async () => {
    const ventana = window.open('about:blank', '_blank')
    if (ventana) ventana.opener = null
    setGuardando(true)
    setErrorCompra('')
    try {
      const venta = await ventasApi.registrar({ items: items.map((item) => ({ tipo: item.tipo, id: Number(item.id), cantidad: Number(item.cantidad) })) }, token)
      const detalle = items
        .map((item) => `- ${item.nombre} (${item.cantidad}): ${formatoPrecio(Number(item.precio) * item.cantidad)}`)
        .join('\n')
      const mensaje = `Hola, quiero solicitar estos artículos:\n${detalle}\nTotal: ${formatoPrecio(total)}\nVenta #${venta.id_venta}`
      if (ventana) ventana.location.href = `https://wa.me/573001234567?text=${encodeURIComponent(mensaje)}`
      vaciarCarrito()
    } catch (error) {
      ventana?.close()
      setErrorCompra(error.message || 'No se pudo registrar la venta.')
    } finally {
      setGuardando(false)
    }
  }

  if (rol !== 'cliente') return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        className="fixed right-5 bottom-24 z-40 flex items-center gap-2 rounded-full border border-gold/60 bg-crimson-bright px-4 py-3 text-sm font-semibold text-cream shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.03]"
        aria-label="Abrir carrito de compras"
        aria-expanded={abierto}
      >
        <span aria-hidden="true">🛒</span>
        <span>Carrito</span>
        <span className="flex min-w-6 items-center justify-center rounded-full bg-cream px-1.5 py-0.5 text-xs font-bold text-crimson-deep">
          {cantidadTotal}
        </span>
      </button>

      {abierto && (
        <aside className="fixed right-4 bottom-40 z-50 w-[min(92vw,380px)] rounded-xl border border-gold/50 bg-ink-soft p-5 text-cream shadow-[0_15px_45px_rgba(0,0,0,0.55)]" aria-label="Carrito de compras">
          <div className="flex items-start justify-between gap-4 border-b border-ink-line pb-3">
            <div>
              <h2 className="font-display text-xl italic text-gold-light">Tu carrito</h2>
              <p className="mt-1 text-xs text-cream-dim">{cantidadTotal} artículo(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xl leading-none text-cream-dim transition-colors hover:text-cream"
              aria-label="Cerrar carrito"
            >
              ×
            </button>
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-cream-dim">Tu carrito está vacío.</p>
          ) : (
            <>
              <div className="max-h-72 space-y-3 overflow-y-auto py-4">
                {items.map((item) => (
                  <div key={item.key} className="border-b border-ink-line pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream">{item.nombre}</p>
                        <p className="text-xs capitalize text-gold-light/80">{item.tipo}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarItem(item.key)}
                        className="text-xs text-crimson-bright hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-ink-line">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad - 1)}
                          className="px-2 py-1 text-cream-dim hover:text-cream"
                          aria-label={`Reducir cantidad de ${item.nombre}`}
                        >
                          −
                        </button>
                        <span className="min-w-7 text-center text-sm">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad + 1)}
                          className="px-2 py-1 text-cream-dim hover:text-cream"
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gold-light">
                        {formatoPrecio(Number(item.precio) * item.cantidad)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gold/30 pt-3">
                {errorCompra && <p role="alert" className="mb-3 text-sm text-crimson-bright">{errorCompra}</p>}
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-gold-light">{formatoPrecio(total)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={vaciarCarrito}
                    className="flex-1 rounded-lg border border-ink-line px-3 py-2 text-sm text-cream-dim transition-colors hover:border-crimson-bright/50 hover:text-crimson-bright"
                  >
                    Vaciar
                  </button>
                  <button
                    type="button"
                    onClick={finalizarCompra}
                    disabled={guardando}
                    className="flex-1 rounded-lg bg-crimson-bright px-3 py-2 text-sm font-semibold text-cream transition-colors hover:bg-crimson"
                  >
                    {guardando ? 'Registrando...' : 'Finalizar compra'}
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </>
  )
}
