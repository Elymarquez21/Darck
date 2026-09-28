import { useEffect, useState } from 'react'
import { productosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { CatalogImage } from '../components/CatalogImage'

// Insignia visual reutilizable para el estado del producto
const BadgeEstado = ({ estado }) => {
  const estilos = {
    activo: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    inactivo: 'bg-cream-dim/10 text-cream-dim border-ink-line',
  }
  return (
    <span
      className={`text-[11px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${
        estilos[estado] || estilos.inactivo
      }`}
    >
      {estado}
    </span>
  )
}

// Insignia de stock: cambia de color según la cantidad disponible
const BadgeStock = ({ stock }) => {
  const cantidad = Number(stock) || 0
  let estilos = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
  let etiqueta = `${cantidad} en stock`

  if (cantidad === 0) {
    estilos = 'bg-crimson-bright/15 text-crimson-bright border-crimson-bright/40'
    etiqueta = 'Agotado'
  } else if (cantidad <= 5) {
    estilos = 'bg-gold/15 text-gold-light border-gold/40'
    etiqueta = `Últimas ${cantidad} unidades`
  }

  return (
    <span className={`text-[11px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${estilos}`}>
      {etiqueta}
    </span>
  )
}

// Página pública: catálogo de productos con su stock disponible.
// Consume GET /api/productos, que no requiere sesión iniciada.
export const Productos = () => {
  const { rol } = useAuth()
  const { agregarItem } = useCart()
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setCargando(true)
        const datos = await productosApi.listar()
        setProductos(datos)
      } catch (err) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarProductos()
  }, [])

  const productosFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
    return coincideNombre || coincideCategoria
  })

  const totalStock = productos.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)

  return (
    <div className="min-h-[80vh] px-4 md:px-10 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display italic text-3xl font-semibold text-gold-shine">
          Nuestros Productos
        </h1>
        <p className="text-cream-dim mt-1">
          Consulta el catálogo completo y la disponibilidad de cada producto.
        </p>
      </div>

      {/* Barra de resumen y búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-cream-dim text-sm">
          <span className="text-gold-light font-semibold">{productos.length}</span> productos ·{' '}
          <span className="text-gold-light font-semibold">{totalStock}</span> unidades en stock
        </p>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o categoría..."
          className="w-full sm:w-72 bg-ink-soft border border-ink-line rounded-lg px-4 py-2 text-cream placeholder:text-cream-dim/50 focus:outline-none focus:border-gold/60 transition-colors"
        />
      </div>

      {error && (
        <p className="text-crimson-bright bg-ink-soft border border-crimson-bright/30 rounded-lg px-4 py-2 mb-6 text-sm">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-cream-dim">Cargando productos...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map((p) => (
            <div
              key={p.id_producto}
              className="bg-ink-soft border border-ink-line rounded-xl p-4 flex flex-col animate-[fadeIn_0.3s_ease-out]"
            >
              <CatalogImage
                src={p.imagen_url}
                alt={`Imagen de ${p.nombre}`}
                className="mb-4 h-44 w-full rounded-lg object-cover"
              />
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display italic text-lg text-gold-light">{p.nombre}</h3>
                {p.estado && <BadgeEstado estado={p.estado} />}
              </div>
              {p.categoria && (
                <p className="text-cream-dim/70 text-xs uppercase tracking-wide mt-1">{p.categoria}</p>
              )}
              <p className="text-cream-dim text-sm mt-2 flex-1">{p.descripcion || 'Sin descripción'}</p>
              <p className="text-cream mt-3 font-semibold text-lg">
                ${Number(p.precio).toLocaleString('es-CO')}
              </p>
              <div className="mt-2">
                <BadgeStock stock={p.stock} />
              </div>
              {rol === 'cliente' && (
                <button
                  type="button"
                  onClick={() => agregarItem({
                    key: `producto-${p.id_producto}`,
                    tipo: 'producto',
                    id: p.id_producto,
                    nombre: p.nombre,
                    precio: p.precio,
                    stock: p.stock,
                  })}
                  disabled={Number(p.stock) <= 0 || p.estado !== 'activo'}
                  className="mt-4 w-full rounded-lg bg-crimson-bright px-3 py-2 text-sm font-semibold text-cream transition-colors hover:bg-crimson disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Number(p.stock) <= 0 ? 'Agotado' : 'Agregar al carrito'}
                </button>
              )}
            </div>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="text-cream-dim col-span-full text-center py-10">
              No se encontraron productos con ese criterio.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
