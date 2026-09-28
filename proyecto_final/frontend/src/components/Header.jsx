import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo2 from '../assets/logo2.png'

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const { isAuthenticated, usuario, rol, logout } = useAuth()
  const navigate = useNavigate()

  // Enlaces públicos: mientras no hay sesión iniciada solo se muestra
  // "¿Quiénes Somos?"; el resto aparece una vez el usuario inicia sesión.
  const linksPublicos = isAuthenticated
    ? [
        { to: '/', label: 'Inicio' },
        { to: '/productos', label: 'Productos' },
        { to: '/servicios', label: 'Servicios' },
        { to: '/quienes-somos', label: '¿Quiénes Somos?' },
        { to: '/contacto', label: 'Contacto' },
      ]
    : [{ to: '/quienes-somos', label: '¿Quiénes Somos?' }]

  // Enlaces que dependen de si hay sesión iniciada. Con sesión activa,
  // "Mi Cuenta"/"Panel" se maneja aparte como menú desplegable (ver abajo)
  // para poder alojar ahí el botón de "Cerrar sesión".
  const linksSesion = isAuthenticated
    ? []
    : [
        { to: '/login', label: 'Iniciar Sesión' },
        { to: '/register', label: 'Registrarse' },
      ]

  const links = [...linksPublicos, ...linksSesion]
  const etiquetaCuenta = rol === 'cliente' ? 'Mi Cuenta' : 'Panel'

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    setIsAccountOpen(false)
    navigate('/')
  }

  // Cierra el menú de "Mi Cuenta" al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-ink border-b border-ink-line/80 shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
      {/* Filo dorado superior */}
      <div className="h-[3px] bg-gradient-to-r from-crimson-deep via-gold to-crimson-deep" />

      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2 min-w-0">
          <img
            src={logo2}
            alt="Ely Marquez logo"
            className="h-20 w-auto object-contain drop-shadow-[0_0_14px_rgba(212,168,90,0.25)]"
          />
        </Link>

        {/* Enlaces en pantallas medianas y grandes */}
        <ul className="hidden md:flex items-center gap-8 font-medium">
          {links.map((link) => (
            <li key={link.to} className="relative">
              <Link
                to={link.to}
                className="group relative inline-block py-1 text-cream-dim transition-colors duration-300 hover:text-cream"
              >
                {link.label}
                <span className="pointer-events-none absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-crimson-bright to-gold-light transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            </li>
          ))}

          {/* Menú de cuenta: agrupa el acceso al panel y, dentro de él, "Cerrar sesión" */}
          {isAuthenticated && (
            <li className="relative pl-4 ml-4 border-l border-ink-line" ref={accountRef}>
              <button
                onClick={() => setIsAccountOpen((prev) => !prev)}
                className="group flex items-center gap-1.5 py-1 text-cream-dim transition-colors duration-300 hover:text-cream"
                aria-haspopup="true"
                aria-expanded={isAccountOpen}
              >
                Bienvenido, <span className="font-semibold text-cream">{usuario?.nombre}</span>
                <span className={`text-xs transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {isAccountOpen && (
                <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-ink-line bg-ink-soft shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-[fadeIn_0.2s_ease-out]">
                  <div className="border-b border-ink-line px-4 py-3" title={usuario?.correo}>
                    <p className="text-sm text-cream break-all">{usuario?.correo}</p>
                    <p className="text-[11px] uppercase tracking-wide text-cream-dim/70">{rol}</p>
                  </div>
                  <Link
                    to="/panel"
                    onClick={() => setIsAccountOpen(false)}
                    className="block px-4 py-2 text-sm text-cream-dim transition-colors duration-200 hover:bg-ink hover:text-cream"
                  >
                    {etiquetaCuenta}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-crimson-bright transition-colors duration-200 hover:bg-crimson-bright hover:text-ink"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </li>
          )}
        </ul>

        {/* Botón hamburguesa, solo visible en pantallas pequeñas */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gold-light text-2xl focus:outline-none transition-transform duration-300"
          aria-label="Abrir menú"
        >
          <span className={`inline-block transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
            {isOpen ? '✕' : '☰'}
          </span>
        </button>
      </div>

      {/* Menú desplegable en pantallas pequeñas */}
      {isOpen && (
        <div className="md:hidden bg-ink-soft border-t border-ink-line animate-[fadeIn_0.25s_ease-out]">
          {isAuthenticated && (
            <div className="px-6 pt-4 text-sm text-gold-light/90">
              Bienvenido, <span className="font-semibold text-cream">{usuario?.nombre} {usuario?.apellido}</span>{' '}
              <span className="text-[11px] uppercase tracking-wide text-cream-dim/70">({rol})</span>
            </div>
          )}

          <ul className="flex flex-col px-6 py-4 gap-4 font-medium">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className="block text-cream-dim hover:text-gold-light transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {/* Sección de cuenta: agrupa el enlace al panel y "Cerrar sesión" */}
            {isAuthenticated && (
              <li className="flex flex-col gap-3 border-t border-ink-line pt-4">
                <Link
                  to="/panel"
                  onClick={() => setIsOpen(false)}
                  className="block text-cream-dim hover:text-gold-light transition-colors duration-200"
                >
                  {etiquetaCuenta}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-full border border-crimson-bright/50 py-2 text-sm font-semibold text-crimson-bright transition-colors duration-200 hover:bg-crimson-bright hover:text-ink"
                >
                  Cerrar sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  )
}
