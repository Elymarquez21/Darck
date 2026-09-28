import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'elymarquez_cart'

const cargarCarrito = () => {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    const items = guardado ? JSON.parse(guardado) : []
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(cargarCarrito)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const agregarItem = (item) => {
    setItems((actuales) => {
      const existente = actuales.find((actual) => actual.key === item.key)
      if (existente) {
        const limite = item.tipo === 'producto' ? Number(item.stock) || 0 : Infinity
        const cantidad = Math.min(existente.cantidad + 1, limite || 1)
        return actuales.map((actual) =>
          actual.key === item.key ? { ...actual, cantidad } : actual,
        )
      }

      return [...actuales, { ...item, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (key, cantidad) => {
    setItems((actuales) =>
      actuales
        .map((item) => {
          if (item.key !== key) return item
          const limite = item.tipo === 'producto' ? Number(item.stock) || 0 : Infinity
          return { ...item, cantidad: Math.min(Math.max(Number(cantidad) || 1, 1), limite || 1) }
        })
        .filter((item) => item.cantidad > 0),
    )
  }

  const quitarItem = (key) => {
    setItems((actuales) => actuales.filter((item) => item.key !== key))
  }

  const vaciarCarrito = () => setItems([])

  const cantidadTotal = items.reduce((total, item) => total + item.cantidad, 0)
  const total = items.reduce((suma, item) => suma + Number(item.precio) * item.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, agregarItem, cambiarCantidad, quitarItem, vaciarCarrito, cantidadTotal, total }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de un <CartProvider>')
  return context
}
