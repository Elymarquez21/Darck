import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Protege rutas que requieren sesión iniciada (JWT) y, opcionalmente,
// restringe el acceso a un conjunto específico de roles.
export const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const { isAuthenticated, rol, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-cream-dim">
        Cargando...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/" replace />
  }

  return children
}
