import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'elymarquez_auth'

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Recupera la sesión guardada (si existe) al cargar la aplicación
  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY)
    if (guardado) {
      try {
        const { token: t, usuario: u } = JSON.parse(guardado)
        setToken(t)
        setUsuario(u)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    const cerrarSesionNoValida = () => {
      setToken(null)
      setUsuario(null)
      localStorage.removeItem(STORAGE_KEY)
    }

    window.addEventListener('auth:unauthorized', cerrarSesionNoValida)
    return () => window.removeEventListener('auth:unauthorized', cerrarSesionNoValida)
  }, [])

  const persistirSesion = (t, u) => {
    setToken(t)
    setUsuario(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, usuario: u }))
  }

  const login = async (email, password) => {
    const data = await authApi.login({ email, password })
    persistirSesion(data.token, data.usuario)
    return data.usuario
  }

  const register = async (payload) => {
    return authApi.register(payload)
  }

  const logout = () => {
    setToken(null)
    setUsuario(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Combina cambios parciales (p. ej. tras editar el perfil desde el Panel
  // de cliente) con el usuario de la sesión actual, para que el Navbar y el
  // resto de la aplicación reflejen la información actualizada al instante.
  const actualizarUsuarioSesion = (cambios) => {
    setUsuario((actual) => {
      if (!actual) return actual
      const actualizado = { ...actual, ...cambios }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, usuario: actualizado }))
      return actualizado
    })
  }

  const value = {
    token,
    usuario,
    cargando,
    isAuthenticated: Boolean(token),
    rol: usuario?.rol || null,
    login,
    register,
    logout,
    actualizarUsuarioSesion,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un <AuthProvider>')
  return context
}
