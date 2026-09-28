import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi, productosApi, serviciosApi, usuariosApi } from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/Modal'
import { CarouselAdmin } from '../components/CarouselAdmin'
import { CatalogImage } from '../components/CatalogImage'
import { FIELD_LIMITS, sanitizeValue, validateField } from '../utils/validators'
import { SalesReport } from '../components/SalesReport'
import { AdminDashboard } from '../components/AdminDashboard'
import { SalesAnalytics } from '../components/SalesAnalytics'
import { PQRManager } from '../components/PQRManager'

const initialFormPerfil = {
  nombre: '',
  apellido: '',
  direccion: '',
  telefono: '',
  password: '',
  confirmPassword: '',
}

const initialProducto = { nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '' }
const initialServicio = { nombre: '', descripcion: '', precio: '', duracion_minutos: '', imagen_url: '' }

const esUrlImagenValida = (valor) => {
  if (!valor.trim()) return true
  try {
    const url = new URL(valor)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

const initialNuevoUsuario = {
  nombre: '',
  apellido: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  direccion: '',
  telefono: '',
  email: '',
  password: '',
  id_rol: '2',
}

const initialEditarUsuario = {
  nombre: '',
  apellido: '',
  direccion: '',
  telefono: '',
  password: '',
}

const OPCIONES_TIPO_DOC = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

const OPCIONES_ROL = [
  { value: '1', label: 'Administrador' },
  { value: '2', label: 'Empleado' },
  { value: '3', label: 'Cliente' },
]

const OPCIONES_ESTADO_USUARIO = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'bloqueado', label: 'Bloqueado' },
]

const ETIQUETAS_TIPO_DOC = Object.fromEntries(OPCIONES_TIPO_DOC.map((o) => [o.value, o.label]))

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
    <circle cx="10" cy="7" r="3.5" />
  </svg>
)

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M3.5 9.5 12 4l8.5 5.5v5L12 20l-8.5-5.5v-5Z" />
    <path d="M12 20v-10.5" />
    <path d="M3.5 9.5 12 15l8.5-5.5" />
  </svg>
)

const IconSpark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M12 3v6" />
    <path d="m8.5 8.5 7 7" />
    <path d="m3 12h6" />
    <path d="m15 12h6" />
    <path d="m12 15v6" />
    <path d="m8.5 15.5 7-7" />
  </svg>
)

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M16.5 19v-1a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4v1" />
    <circle cx="9.5" cy="7" r="3" />
    <path d="M18.5 18v-1a4 4 0 0 0-3-3.86" />
    <path d="M17 5.5a3 3 0 0 1 0 5.8" />
  </svg>
)

const IconSignOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

const sidebarIcons = {
  perfil: IconUser,
  productos: IconBox,
  servicios: IconSpark,
  usuarios: IconUsers,
  ventas: IconBox,
  carrusel: IconSpark,
  dashboard: IconBox,
  pqrs: IconSpark,
  logout: IconSignOut,
}

// Insignia visual reutilizable para el estado (activo / inactivo / bloqueado)
const BadgeEstado = ({ estado }) => {
  const estilos = {
    activo: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    inactivo: 'bg-cream-dim/10 text-cream-dim border-ink-line',
    bloqueado: 'bg-crimson-bright/15 text-crimson-bright border-crimson-bright/40',
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

export const Panel = () => {
  const { usuario, rol, token, logout, actualizarUsuarioSesion } = useAuth()
  // El cliente autenticado aterriza directamente en "Mi perfil"; el resto
  // de roles conserva la pestaña de Productos como vista inicial.
  const [tab, setTab] = useState(rol === 'cliente' ? 'perfil' : 'dashboard')

  const esAdmin = rol === 'administrador'
  const esEmpleado = rol === 'empleado'
  const puedeGestionar = esAdmin || esEmpleado

  const [productos, setProductos] = useState([])
  const [servicios, setServicios] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // ---------- Mi perfil (autoservicio del usuario autenticado) ----------
  const [perfilDetalle, setPerfilDetalle] = useState(null)
  const [formPerfil, setFormPerfil] = useState(initialFormPerfil)
  const [erroresPerfil, setErroresPerfil] = useState({})
  const [touchedPerfil, setTouchedPerfil] = useState({})
  const [mensajePerfil, setMensajePerfil] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const [nuevoProducto, setNuevoProducto] = useState(initialProducto)
  const [nuevoServicio, setNuevoServicio] = useState(initialServicio)
  const [nuevoUsuario, setNuevoUsuario] = useState(initialNuevoUsuario)
  const [erroresNuevoUsuario, setErroresNuevoUsuario] = useState({})
  const [touchedNuevoUsuario, setTouchedNuevoUsuario] = useState({})

  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoServicio, setCargandoServicio] = useState(false)
  const [cargandoUsuario, setCargandoUsuario] = useState(false)

  // ---------- Estado de los modales de edición / visualización ----------
  const [productoEditando, setProductoEditando] = useState(null)
  const [formProducto, setFormProducto] = useState(initialProducto)

  const [servicioEditando, setServicioEditando] = useState(null)
  const [formServicio, setFormServicio] = useState(initialServicio)

  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [formUsuario, setFormUsuario] = useState(initialEditarUsuario)
  const [erroresFormUsuario, setErroresFormUsuario] = useState({})
  const [touchedFormUsuario, setTouchedFormUsuario] = useState({})

  const [usuarioViendo, setUsuarioViendo] = useState(null)

  const cargarDatos = async () => {
    try {
      const [prod, serv] = await Promise.all([productosApi.listar(), serviciosApi.listar()])
      setProductos(prod)
      setServicios(serv)
      if (puedeGestionar) {
        const listaUsuarios = await usuariosApi.listar(token)
        setUsuarios(listaUsuarios)
      }
    } catch (error) {
      setMensaje(error.message)
    }
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===================== MI PERFIL =====================
  // El sistema identifica al cliente autenticado a partir de la información
  // de su sesión (JWT enviado en el header Authorization) y consulta el
  // detalle completo de su cuenta con GET /api/auth/perfil.
  const cargarPerfil = async () => {
    try {
      const detalle = await authApi.perfil(token)
      setPerfilDetalle(detalle)
      setFormPerfil({
        nombre: detalle.nombre || '',
        apellido: detalle.apellido || '',
        direccion: detalle.direccion || '',
        telefono: detalle.telefono || '',
        password: '',
        confirmPassword: '',
      })
    } catch (error) {
      setMensajePerfil(error.message)
    }
  }

  useEffect(() => {
    cargarPerfil()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChangePerfil = (e) => {
    const { name, value } = e.target
    const cleanValue = sanitizeValue(name, value)
    const updated = { ...formPerfil, [name]: cleanValue }
    setFormPerfil(updated)
    setMensajePerfil('')

    // La contraseña es opcional aquí: el cliente solo la valida si decide
    // cambiarla; de lo contrario, se conserva la actual.
    if (name === 'password' || name === 'confirmPassword') {
      setErroresPerfil((prev) => ({
        ...prev,
        password: updated.password ? validateField('password', updated.password, updated) : '',
        confirmPassword: updated.password
          ? validateField('confirmPassword', updated.confirmPassword, updated)
          : '',
      }))
    } else {
      setErroresPerfil((prev) => ({ ...prev, [name]: validateField(name, cleanValue, updated) }))
    }
  }

  const handleBlurPerfil = (e) => {
    setTouchedPerfil((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleGuardarPerfil = async (e) => {
    e.preventDefault()
    setMensajePerfil('')

    // Validaciones en tiempo real (Frontend): obligatoriedad, longitud
    // mínima/máxima, tipo de dato, regex, formato de contraseña, etc.
    const nuevosErrores = {
      nombre: validateField('nombre', formPerfil.nombre, formPerfil),
      apellido: validateField('apellido', formPerfil.apellido, formPerfil),
      direccion: validateField('direccion', formPerfil.direccion, formPerfil),
      telefono: validateField('telefono', formPerfil.telefono, formPerfil),
    }
    if (formPerfil.password || formPerfil.confirmPassword) {
      nuevosErrores.password = validateField('password', formPerfil.password, formPerfil)
      nuevosErrores.confirmPassword = validateField('confirmPassword', formPerfil.confirmPassword, formPerfil)
    }
    setErroresPerfil(nuevosErrores)
    setTouchedPerfil({ nombre: true, apellido: true, direccion: true, telefono: true, password: true, confirmPassword: true })

    const hayErrores = Object.values(nuevosErrores).some((msg) => msg)
    if (hayErrores) return

    try {
      setGuardandoPerfil(true)
      const payload = {
        nombre: formPerfil.nombre,
        apellido: formPerfil.apellido,
        direccion: formPerfil.direccion,
        telefono: formPerfil.telefono,
      }
      // El Backend vuelve a validar (obligatoriedad, longitud, regex,
      // formato de contraseña, etc.) antes de tocar la base de datos.
      if (formPerfil.password) payload.password = formPerfil.password

      const respuesta = await usuariosApi.actualizarMiPerfil(payload, token)
      setPerfilDetalle(respuesta.usuario)
      // Refleja el cambio de inmediato en el Navbar y en el resto de la app.
      actualizarUsuarioSesion({
        nombre: respuesta.usuario.nombre,
        apellido: respuesta.usuario.apellido,
      })
      setFormPerfil((prev) => ({ ...prev, password: '', confirmPassword: '' }))
      setTouchedPerfil({})
      setMensajePerfil('Tu información se actualizó correctamente.')
    } catch (error) {
      setMensajePerfil(error.message)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  // ===================== PRODUCTOS =====================

  const handleCrearProducto = async (e) => {
    e.preventDefault()
    setMensaje('')
    if (!nuevoProducto.nombre || !nuevoProducto.precio) {
      setMensaje('El nombre y el precio del producto son obligatorios.')
      return
    }
    if (esAdmin && !esUrlImagenValida(nuevoProducto.imagen_url)) {
      setMensaje('La imagen del producto debe usar una URL http o https válida.')
      return
    }
    try {
      setCargando(true)
      await productosApi.crear(
        {
          nombre: nuevoProducto.nombre,
          descripcion: nuevoProducto.descripcion,
          precio: Number(nuevoProducto.precio),
          stock: Number(nuevoProducto.stock || 0),
          ...(esAdmin && { imagen_url: nuevoProducto.imagen_url.trim() || null }),
        },
        token
      )
      setNuevoProducto(initialProducto)
      await cargarDatos()
      setMensaje('Producto creado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setCargando(false)
    }
  }

  const handleAbrirEditarProducto = (producto) => {
    setProductoEditando(producto)
    setFormProducto({
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio: producto.precio ?? '',
      stock: producto.stock ?? '',
      imagen_url: producto.imagen_url || '',
    })
    setMensaje('')
  }

  const handleGuardarProducto = async (e) => {
    e.preventDefault()
    if (!productoEditando) return
    if (esAdmin && !esUrlImagenValida(formProducto.imagen_url)) {
      setMensaje('La imagen del producto debe usar una URL http o https válida.')
      return
    }
    try {
      const payload = {
        nombre: formProducto.nombre,
        descripcion: formProducto.descripcion,
        precio: Number(formProducto.precio),
        stock: Number(formProducto.stock || 0),
        ...(esAdmin && { imagen_url: formProducto.imagen_url.trim() }),
      }
      await productosApi.actualizar(
        productoEditando.id_producto,
        payload,
        token
      )
      setProductoEditando(null)
      await cargarDatos()
      setMensaje('Producto actualizado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleToggleEstadoProducto = async (producto) => {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo'
    try {
      await productosApi.actualizar(producto.id_producto, { estado: nuevoEstado }, token)
      await cargarDatos()
      setMensaje(`Producto marcado como "${nuevoEstado}".`)
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleEliminarProducto = async (id) => {
    try {
      await productosApi.eliminar(id, token)
      await cargarDatos()
      setMensaje('Producto eliminado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  // ===================== SERVICIOS =====================

  const handleCrearServicio = async (e) => {
    e.preventDefault()
    setMensaje('')
    if (!nuevoServicio.nombre || !nuevoServicio.precio) {
      setMensaje('El nombre y el precio del servicio son obligatorios.')
      return
    }
    if (esAdmin && !esUrlImagenValida(nuevoServicio.imagen_url)) {
      setMensaje('La imagen del servicio debe usar una URL http o https válida.')
      return
    }
    try {
      setCargandoServicio(true)
      await serviciosApi.crear(
        {
          nombre: nuevoServicio.nombre,
          descripcion: nuevoServicio.descripcion,
          precio: Number(nuevoServicio.precio),
          duracion_minutos: Number(nuevoServicio.duracion_minutos || 30),
          ...(esAdmin && { imagen_url: nuevoServicio.imagen_url.trim() || null }),
        },
        token
      )
      setNuevoServicio(initialServicio)
      await cargarDatos()
      setMensaje('Servicio creado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setCargandoServicio(false)
    }
  }

  const handleAbrirEditarServicio = (servicio) => {
    setServicioEditando(servicio)
    setFormServicio({
      nombre: servicio.nombre || '',
      descripcion: servicio.descripcion || '',
      precio: servicio.precio ?? '',
      duracion_minutos: servicio.duracion_minutos ?? '',
      imagen_url: servicio.imagen_url || '',
    })
    setMensaje('')
  }

  const handleGuardarServicio = async (e) => {
    e.preventDefault()
    if (!servicioEditando) return
    if (esAdmin && !esUrlImagenValida(formServicio.imagen_url)) {
      setMensaje('La imagen del servicio debe usar una URL http o https válida.')
      return
    }
    try {
      const payload = {
        nombre: formServicio.nombre,
        descripcion: formServicio.descripcion,
        precio: Number(formServicio.precio),
        duracion_minutos: Number(formServicio.duracion_minutos || 30),
        ...(esAdmin && { imagen_url: formServicio.imagen_url.trim() }),
      }
      await serviciosApi.actualizar(
        servicioEditando.id_servicio,
        payload,
        token
      )
      setServicioEditando(null)
      await cargarDatos()
      setMensaje('Servicio actualizado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleToggleEstadoServicio = async (servicio) => {
    const nuevoEstado = servicio.estado === 'activo' ? 'inactivo' : 'activo'
    try {
      await serviciosApi.actualizar(servicio.id_servicio, { estado: nuevoEstado }, token)
      await cargarDatos()
      setMensaje(`Servicio marcado como "${nuevoEstado}".`)
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleEliminarServicio = async (id) => {
    try {
      await serviciosApi.eliminar(id, token)
      await cargarDatos()
      setMensaje('Servicio eliminado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  // ===================== USUARIOS =====================

  // Aplica el mismo saneo/validación en tiempo real que el formulario de
  // registro público a los campos del nuevo empleado/administrador.
  const handleChangeNuevoUsuario = (e) => {
    const { name, value } = e.target
    const cleanValue = sanitizeValue(name, value)
    const updated = { ...nuevoUsuario, [name]: cleanValue }
    setNuevoUsuario(updated)
    setErroresNuevoUsuario((prev) => ({ ...prev, [name]: validateField(name, cleanValue, updated) }))
  }

  const handleBlurNuevoUsuario = (e) => {
    setTouchedNuevoUsuario((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleCrearUsuario = async (e) => {
    e.preventDefault()
    setMensaje('')

    const camposValidables = ['nombre', 'apellido', 'tipoDocumento', 'numeroDocumento', 'direccion', 'telefono', 'email', 'password']
    const nuevosErrores = {}
    camposValidables.forEach((campo) => {
      nuevosErrores[campo] = validateField(campo, nuevoUsuario[campo], nuevoUsuario)
    })
    setErroresNuevoUsuario(nuevosErrores)
    setTouchedNuevoUsuario(camposValidables.reduce((acc, campo) => ({ ...acc, [campo]: true }), {}))

    if (Object.values(nuevosErrores).some((msg) => msg)) {
      setMensaje('Revisa los campos marcados en rojo antes de continuar.')
      return
    }

    try {
      setCargandoUsuario(true)
      await usuariosApi.crear(
        { ...nuevoUsuario, id_rol: Number(nuevoUsuario.id_rol) },
        token
      )
      setNuevoUsuario(initialNuevoUsuario)
      setErroresNuevoUsuario({})
      setTouchedNuevoUsuario({})
      await cargarDatos()
      setMensaje('Usuario registrado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    } finally {
      setCargandoUsuario(false)
    }
  }

  const handleAbrirEditarUsuario = (u) => {
    setUsuarioEditando(u)
    setFormUsuario({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      direccion: u.direccion || '',
      telefono: u.telefono || '',
      password: '',
    })
    setErroresFormUsuario({})
    setTouchedFormUsuario({})
    setMensaje('')
  }

  const handleChangeFormUsuario = (e) => {
    const { name, value } = e.target
    const cleanValue = sanitizeValue(name, value)
    const updated = { ...formUsuario, [name]: cleanValue }
    setFormUsuario(updated)
    // La nueva contraseña es opcional al editar: solo se valida si se escribe algo.
    const error = name === 'password' && !cleanValue ? '' : validateField(name, cleanValue, updated)
    setErroresFormUsuario((prev) => ({ ...prev, [name]: error }))
  }

  const handleBlurFormUsuario = (e) => {
    setTouchedFormUsuario((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleGuardarUsuario = async (e) => {
    e.preventDefault()
    if (!usuarioEditando) return

    const campos = ['nombre', 'apellido', 'direccion', 'telefono']
    const nuevosErrores = {}
    campos.forEach((campo) => {
      nuevosErrores[campo] = validateField(campo, formUsuario[campo], formUsuario)
    })
    if (formUsuario.password) {
      nuevosErrores.password = validateField('password', formUsuario.password, formUsuario)
    }
    setErroresFormUsuario(nuevosErrores)
    setTouchedFormUsuario({ nombre: true, apellido: true, direccion: true, telefono: true, password: true })

    if (Object.values(nuevosErrores).some((msg) => msg)) return

    const payload = {
      nombre: formUsuario.nombre,
      apellido: formUsuario.apellido,
      direccion: formUsuario.direccion,
      telefono: formUsuario.telefono,
    }
    if (formUsuario.password) payload.password = formUsuario.password
    try {
      await usuariosApi.actualizar(usuarioEditando.id_usuario, payload, token)
      setUsuarioEditando(null)
      await cargarDatos()
      setMensaje('Información del usuario actualizada correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleEliminarUsuario = async (id) => {
    try {
      await usuariosApi.eliminar(id, token)
      await cargarDatos()
      setMensaje('Usuario eliminado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  // Solo el administrador puede reasignar roles o cambiar el estado de una cuenta.
  const handleCambiarRol = async (id, id_rol) => {
    try {
      await usuariosApi.actualizar(id, { id_rol: Number(id_rol) }, token)
      await cargarDatos()
      setMensaje('Rol actualizado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const handleCambiarEstado = async (id, estado) => {
    try {
      await usuariosApi.cambiarEstado(id, estado, token)
      await cargarDatos()
      setMensaje('Estado actualizado correctamente.')
    } catch (error) {
      setMensaje(error.message)
    }
  }

  const tabs = [
    { id: 'perfil', label: 'Mi perfil' },
    { id: 'dashboard', label: esAdmin ? 'Dashboard' : esEmpleado ? 'Ventas' : 'Mis compras' },
    { id: 'pqrs', label: puedeGestionar ? 'Gestión de PQR' : 'Mis PQR' },
    { id: 'productos', label: 'Productos' },
    { id: 'servicios', label: 'Servicios' },
    ...(puedeGestionar ? [{ id: 'usuarios', label: 'Usuarios' }] : []),
    ...(puedeGestionar ? [{ id: 'ventas', label: 'Ventas e informes' }] : []),
    ...(esAdmin ? [{ id: 'carrusel', label: 'Administrar carrusel' }] : []),
  ]

  return (
    <div className="min-h-[80vh] px-4 md:px-8 pt-0 pb-8 md:pb-10 max-w-[1500px] mx-auto">
      <div className="md:grid md:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <aside className="border-y border-r border-gold/30 bg-transparent md:min-h-[760px] h-full rounded-none md:-ml-8">
          <div className="px-4 py-5 border-b border-gold/20">
            <div className="flex items-center justify-center py-2">
              <div className="text-center leading-tight">
                <div className="font-display italic font-bold text-[1.35rem] leading-none text-gold-light">Ely Marquez</div>
                <div className="mt-1 text-[0.52rem] uppercase tracking-[0.16em] text-gold-light/80">
                  {esAdmin ? 'Administración' : esEmpleado ? 'Empleado' : 'Cuenta'}
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 py-5">
            <nav className="space-y-2">
              {tabs.map((t) => {
                const Icon = sidebarIcons[t.id]
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`group w-full text-left px-3 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 border ${
                      tab === t.id
                        ? 'border-gold/40 bg-gold/8 text-gold-light'
                        : 'border-transparent text-cream-dim hover:text-cream hover:border-gold/15 hover:bg-white/5'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center ${tab === t.id ? 'bg-gold/10 text-gold-light' : 'bg-transparent text-cream-dim group-hover:text-cream'}`}>
                      <Icon />
                    </span>
                    <span className="flex-1 text-[0.98rem] leading-none">{t.label}</span>
                    <span className={`text-lg ${tab === t.id ? 'text-gold-light' : 'text-cream-dim/60'}`}>›</span>
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-gold/20">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-crimson-bright/35 bg-crimson-bright/5 px-4 py-3 text-base font-medium text-crimson-bright hover:bg-crimson-bright/10 transition-colors"
              >
                <span className="flex items-center justify-center">
                  <IconSignOut />
                </span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-6 pt-4">
          {mensaje && (
            <p className="text-gold-light bg-ink-soft border border-gold/30 rounded-lg px-4 py-2 text-sm animate-[fadeIn_0.3s_ease-out]">
              {mensaje}
            </p>
          )}

          {tab === 'carrusel' && esAdmin && <CarouselAdmin />}
          {tab === 'dashboard' && esAdmin && <AdminDashboard />}
          {tab === 'dashboard' && !esAdmin && <SalesAnalytics />}
          {tab === 'pqrs' && <PQRManager />}
          {tab === 'ventas' && puedeGestionar && <SalesReport />}

          {/* Mi perfil: información del cliente autenticado, identificado a partir de su sesión */}
      {tab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Datos de solo lectura, tal como quedaron registrados en el sistema */}
          <div className="bg-ink-soft border border-ink-line rounded-2xl p-6 space-y-4 h-fit">
            <h2 className="font-display italic text-xl text-gold-light">Información de mi cuenta</h2>
            {perfilDetalle ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-gold-light/80 font-semibold">Nombre completo</p>
                  <p className="text-cream">{perfilDetalle.nombre} {perfilDetalle.apellido}</p>
                </div>
                <div>
                  <p className="text-gold-light/80 font-semibold">Correo</p>
                  <p className="text-cream break-all">{perfilDetalle.correo}</p>
                </div>
                <div>
                  <p className="text-gold-light/80 font-semibold">Documento</p>
                  <p className="text-cream">
                    {ETIQUETAS_TIPO_DOC[perfilDetalle.tipo_documento] || perfilDetalle.tipo_documento}{' '}
                    {perfilDetalle.numero_documento}
                  </p>
                </div>
                <div>
                  <p className="text-gold-light/80 font-semibold">Rol</p>
                  <p className="text-cream capitalize">{perfilDetalle.nombre_rol}</p>
                </div>
                <div>
                  <p className="text-gold-light/80 font-semibold">Estado de la cuenta</p>
                  <BadgeEstado estado={perfilDetalle.estado} />
                </div>
                {perfilDetalle.creado_en && (
                  <div>
                    <p className="text-gold-light/80 font-semibold">Cliente desde</p>
                    <p className="text-cream">
                      {new Date(perfilDetalle.creado_en).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-cream-dim text-sm">Cargando tu información...</p>
            )}
            <p className="text-cream-dim/70 text-xs pt-2 border-t border-ink-line">
              El correo y el número de documento identifican tu cuenta y no pueden modificarse desde aquí.
              Si necesitas cambiarlos, comunícate con el equipo de Ely Marquez.
            </p>
          </div>

          {/* Formulario de edición, con las mismas validaciones en tiempo real del registro */}
          <div className="bg-cream rounded-2xl border border-gold/40 p-6">
            <h2 className="font-display italic text-xl text-crimson-deep mb-1">Actualizar mis datos</h2>
            <p className="text-ink/60 text-sm mb-4">Puedes actualizar tu dirección, tu teléfono y tu contraseña.</p>

            {mensajePerfil && (
              <p className="text-crimson-bright bg-white/60 border border-gold/30 rounded-lg px-3 py-2 mb-4 text-sm animate-[fadeIn_0.3s_ease-out]">
                {mensajePerfil}
              </p>
            )}

            <form onSubmit={handleGuardarPerfil} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                name="nombre"
                value={formPerfil.nombre}
                onChange={handleChangePerfil}
                onBlur={handleBlurPerfil}
                error={erroresPerfil.nombre}
                touched={touchedPerfil.nombre}
                maxLength={FIELD_LIMITS.nombre.max}
              />
              <Input
                label="Apellido"
                name="apellido"
                value={formPerfil.apellido}
                onChange={handleChangePerfil}
                onBlur={handleBlurPerfil}
                error={erroresPerfil.apellido}
                touched={touchedPerfil.apellido}
                maxLength={FIELD_LIMITS.apellido.max}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Dirección"
                  name="direccion"
                  value={formPerfil.direccion}
                  onChange={handleChangePerfil}
                  onBlur={handleBlurPerfil}
                  error={erroresPerfil.direccion}
                  touched={touchedPerfil.direccion}
                  maxLength={FIELD_LIMITS.direccion.max}
                />
              </div>
              <Input
                label="Teléfono"
                name="telefono"
                value={formPerfil.telefono}
                onChange={handleChangePerfil}
                onBlur={handleBlurPerfil}
                error={erroresPerfil.telefono}
                touched={touchedPerfil.telefono}
                maxLength={FIELD_LIMITS.telefono.max}
                inputMode="numeric"
                placeholder="Ej: 3001234567"
              />
              <div />
              <Input
                label="Nueva contraseña"
                type="password"
                name="password"
                required={false}
                value={formPerfil.password}
                onChange={handleChangePerfil}
                onBlur={handleBlurPerfil}
                error={erroresPerfil.password}
                touched={touchedPerfil.password}
                maxLength={FIELD_LIMITS.password.max}
                helperText="Déjalo en blanco para conservar tu contraseña actual."
                autoComplete="new-password"
              />
              <Input
                label="Confirmar nueva contraseña"
                type="password"
                name="confirmPassword"
                required={false}
                value={formPerfil.confirmPassword}
                onChange={handleChangePerfil}
                onBlur={handleBlurPerfil}
                error={erroresPerfil.confirmPassword}
                touched={touchedPerfil.confirmPassword}
                maxLength={FIELD_LIMITS.password.max}
                autoComplete="new-password"
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={guardandoPerfil}>
                  {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Productos */}
      {tab === 'productos' && (
        <div className="space-y-6">
          {puedeGestionar && (
            <form
              onSubmit={handleCrearProducto}
              className="bg-cream rounded-2xl border border-gold/40 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <Input
                label="Nombre"
                name="nombre"
                required={false}
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Labial mate rojo"
              />
              <Input
                label="Precio"
                name="precio"
                required={false}
                value={nuevoProducto.precio}
                onChange={(e) => setNuevoProducto((p) => ({ ...p, precio: e.target.value }))}
                placeholder="Ej: 45000"
                inputMode="numeric"
              />
              <Input
                label="Stock"
                name="stock"
                required={false}
                value={nuevoProducto.stock}
                onChange={(e) => setNuevoProducto((p) => ({ ...p, stock: e.target.value }))}
                placeholder="Ej: 20"
                inputMode="numeric"
              />
              {esAdmin && (
                <div className="md:col-span-2">
                  <Input
                    label="Imagen del producto (URL)"
                    type="url"
                    name="imagenProducto"
                    required={false}
                    value={nuevoProducto.imagen_url}
                    onChange={(e) => setNuevoProducto((p) => ({ ...p, imagen_url: e.target.value }))}
                    placeholder="https://ejemplo.com/producto.jpg"
                  />
                  {nuevoProducto.imagen_url && (
                    <CatalogImage
                      src={nuevoProducto.imagen_url}
                      alt="Vista previa del producto"
                      className="mt-1 h-20 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              )}
              <Button type="submit" disabled={cargando}>{cargando ? 'Guardando...' : 'Agregar producto'}</Button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((p) => (
              <div key={p.id_producto} className="bg-ink-soft border border-ink-line rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display italic text-lg text-gold-light">{p.nombre}</h3>
                  {p.estado && <BadgeEstado estado={p.estado} />}
                </div>
                <p className="text-cream-dim text-sm mt-1">{p.descripcion || 'Sin descripción'}</p>
                <p className="text-cream mt-2 font-semibold">${Number(p.precio).toLocaleString('es-CO')}</p>
                <p className="text-cream-dim/70 text-xs">Stock: {p.stock}</p>

                {puedeGestionar && (
                  <div className="mt-3 pt-3 border-t border-ink-line flex flex-wrap items-center gap-3 text-sm">
                    <button
                      onClick={() => handleAbrirEditarProducto(p)}
                      className="text-gold-light hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleEstadoProducto(p)}
                      className="text-cream-dim hover:text-gold-light hover:underline"
                    >
                      {p.estado === 'activo' ? 'Marcar inactivo' : 'Marcar activo'}
                    </button>
                    {esAdmin && (
                      <button
                        onClick={() => handleEliminarProducto(p.id_producto)}
                        className="text-crimson-bright hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {productos.length === 0 && <p className="text-cream-dim">Aún no hay productos registrados.</p>}
          </div>
        </div>
      )}

      {/* Servicios */}
      {tab === 'servicios' && (
        <div className="space-y-6">
          {puedeGestionar && (
            <form
              onSubmit={handleCrearServicio}
              className="bg-cream rounded-2xl border border-gold/40 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <Input
                label="Nombre"
                name="nombreServicio"
                required={false}
                value={nuevoServicio.nombre}
                onChange={(e) => setNuevoServicio((s) => ({ ...s, nombre: e.target.value }))}
                placeholder="Ej: Maquillaje a domicilio"
              />
              <Input
                label="Precio"
                name="precioServicio"
                required={false}
                value={nuevoServicio.precio}
                onChange={(e) => setNuevoServicio((s) => ({ ...s, precio: e.target.value }))}
                placeholder="Ej: 90000"
                inputMode="numeric"
              />
              <Input
                label="Duración (min)"
                name="duracionServicio"
                required={false}
                value={nuevoServicio.duracion_minutos}
                onChange={(e) => setNuevoServicio((s) => ({ ...s, duracion_minutos: e.target.value }))}
                placeholder="Ej: 60"
                inputMode="numeric"
              />
              {esAdmin && (
                <div className="md:col-span-2">
                  <Input
                    label="Imagen del servicio (URL)"
                    type="url"
                    name="imagenServicio"
                    required={false}
                    value={nuevoServicio.imagen_url}
                    onChange={(e) => setNuevoServicio((s) => ({ ...s, imagen_url: e.target.value }))}
                    placeholder="https://ejemplo.com/servicio.jpg"
                  />
                  {nuevoServicio.imagen_url && (
                    <CatalogImage
                      src={nuevoServicio.imagen_url}
                      alt="Vista previa del servicio"
                      className="mt-1 h-20 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              )}
              <Button type="submit" disabled={cargandoServicio}>
                {cargandoServicio ? 'Guardando...' : 'Agregar servicio'}
              </Button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicios.map((s) => (
              <div key={s.id_servicio} className="bg-ink-soft border border-ink-line rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display italic text-lg text-gold-light">{s.nombre}</h3>
                  {s.estado && <BadgeEstado estado={s.estado} />}
                </div>
                <p className="text-cream-dim text-sm mt-1">{s.descripcion || 'Sin descripción'}</p>
                <p className="text-cream mt-2 font-semibold">${Number(s.precio).toLocaleString('es-CO')}</p>
                <p className="text-cream-dim/70 text-xs">Duración: {s.duracion_minutos} min</p>

                {puedeGestionar && (
                  <div className="mt-3 pt-3 border-t border-ink-line flex flex-wrap items-center gap-3 text-sm">
                    <button
                      onClick={() => handleAbrirEditarServicio(s)}
                      className="text-gold-light hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleEstadoServicio(s)}
                      className="text-cream-dim hover:text-gold-light hover:underline"
                    >
                      {s.estado === 'activo' ? 'Marcar inactivo' : 'Marcar activo'}
                    </button>
                    {esAdmin && (
                      <button
                        onClick={() => handleEliminarServicio(s.id_servicio)}
                        className="text-crimson-bright hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {servicios.length === 0 && <p className="text-cream-dim">Aún no hay servicios registrados.</p>}
          </div>
        </div>
      )}

      {/* Usuarios (solo admin/empleado) */}
      {tab === 'usuarios' && puedeGestionar && (
        <div className="space-y-6">
        {esAdmin && (
          <form
            onSubmit={handleCrearUsuario}
            className="bg-cream rounded-2xl border border-gold/40 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <p className="md:col-span-3 font-display italic text-lg text-ink">Registrar empleado o administrador</p>
            <Input
              label="Nombre"
              name="nombre"
              value={nuevoUsuario.nombre}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.nombre}
              touched={touchedNuevoUsuario.nombre}
              maxLength={FIELD_LIMITS.nombre.max}
            />
            <Input
              label="Apellido"
              name="apellido"
              value={nuevoUsuario.apellido}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.apellido}
              touched={touchedNuevoUsuario.apellido}
              maxLength={FIELD_LIMITS.apellido.max}
            />
            <Select
              label="Tipo de documento"
              name="tipoDocumento"
              value={nuevoUsuario.tipoDocumento}
              onChange={handleChangeNuevoUsuario}
              options={OPCIONES_TIPO_DOC}
              required={false}
            />
            <Input
              label="Número de documento"
              name="numeroDocumento"
              value={nuevoUsuario.numeroDocumento}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.numeroDocumento}
              touched={touchedNuevoUsuario.numeroDocumento}
              maxLength={FIELD_LIMITS.numeroDocumento.max}
              inputMode="numeric"
            />
            <Input
              label="Dirección"
              name="direccion"
              value={nuevoUsuario.direccion}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.direccion}
              touched={touchedNuevoUsuario.direccion}
              maxLength={FIELD_LIMITS.direccion.max}
            />
            <Input
              label="Teléfono"
              name="telefono"
              value={nuevoUsuario.telefono}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.telefono}
              touched={touchedNuevoUsuario.telefono}
              maxLength={FIELD_LIMITS.telefono.max}
              inputMode="numeric"
            />
            <Input
              label="Correo"
              name="email"
              type="email"
              value={nuevoUsuario.email}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.email}
              touched={touchedNuevoUsuario.email}
              maxLength={FIELD_LIMITS.email.max}
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={nuevoUsuario.password}
              onChange={handleChangeNuevoUsuario}
              onBlur={handleBlurNuevoUsuario}
              error={erroresNuevoUsuario.password}
              touched={touchedNuevoUsuario.password}
              maxLength={FIELD_LIMITS.password.max}
              helperText="8-20 caracteres: mayúscula, minúscula, número y símbolo."
              autoComplete="new-password"
            />
            <Select
              label="Rol"
              name="id_rol"
              value={nuevoUsuario.id_rol}
              onChange={(e) => setNuevoUsuario((u) => ({ ...u, id_rol: e.target.value }))}
              options={OPCIONES_ROL}
              required={false}
            />
            <Button type="submit" disabled={cargandoUsuario} className="md:col-span-3">
              {cargandoUsuario ? 'Guardando...' : 'Registrar usuario'}
            </Button>
          </form>
        )}
        <div className="overflow-x-auto bg-ink-soft border border-ink-line rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gold-light border-b border-ink-line">
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Documento</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-b border-ink-line/60 text-cream-dim align-top">
                  <td className="p-3">{u.nombre} {u.apellido}</td>
                  <td className="p-3">{u.correo}</td>
                  <td className="p-3">{u.tipo_documento} {u.numero_documento}</td>
                  <td className="p-3 capitalize">
                    {esAdmin && u.id_usuario !== usuario?.id_usuario ? (
                      <Select
                        name={`rol-${u.id_usuario}`}
                        value={String(u.id_rol)}
                        onChange={(e) => handleCambiarRol(u.id_usuario, e.target.value)}
                        options={OPCIONES_ROL}
                        required={false}
                      />
                    ) : (
                      u.nombre_rol
                    )}
                  </td>
                  <td className="p-3 capitalize">
                    {esAdmin && u.id_usuario !== usuario?.id_usuario ? (
                      <Select
                        name={`estado-${u.id_usuario}`}
                        value={u.estado}
                        onChange={(e) => handleCambiarEstado(u.id_usuario, e.target.value)}
                        options={OPCIONES_ESTADO_USUARIO}
                        required={false}
                      />
                    ) : (
                      <BadgeEstado estado={u.estado} />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setUsuarioViendo(u)}
                        className="text-gold-light hover:underline"
                      >
                        Ver
                      </button>
                      {esAdmin && (
                        <button
                          onClick={() => handleAbrirEditarUsuario(u)}
                          className="text-gold-light hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      {esAdmin && u.id_usuario !== usuario?.id_usuario && (
                        <button
                          onClick={() => handleEliminarUsuario(u.id_usuario)}
                          className="text-crimson-bright hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 && <p className="text-cream-dim p-4">No hay usuarios registrados.</p>}
        </div>
        </div>
      )}
      </section>
    </div>

      {/* ---------- Modal: editar producto ---------- */}
      <Modal
        isOpen={Boolean(productoEditando)}
        onClose={() => setProductoEditando(null)}
        title={`Editar producto${productoEditando ? `: ${productoEditando.nombre}` : ''}`}
      >
        <form onSubmit={handleGuardarProducto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            name="editNombreProducto"
            required={false}
            value={formProducto.nombre}
            onChange={(e) => setFormProducto((p) => ({ ...p, nombre: e.target.value }))}
          />
          <Input
            label="Precio"
            name="editPrecioProducto"
            required={false}
            value={formProducto.precio}
            onChange={(e) => setFormProducto((p) => ({ ...p, precio: e.target.value }))}
            inputMode="numeric"
          />
          <Input
            label="Stock"
            name="editStockProducto"
            required={false}
            value={formProducto.stock}
            onChange={(e) => setFormProducto((p) => ({ ...p, stock: e.target.value }))}
            inputMode="numeric"
          />
          <div className="md:col-span-2">
            <Input
              label="Descripción"
              name="editDescripcionProducto"
              required={false}
              value={formProducto.descripcion}
              onChange={(e) => setFormProducto((p) => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          {esAdmin && (
            <div className="md:col-span-2">
              <Input
                label="Imagen del producto (URL)"
                type="url"
                name="editImagenProducto"
                required={false}
                value={formProducto.imagen_url}
                onChange={(e) => setFormProducto((p) => ({ ...p, imagen_url: e.target.value }))}
                placeholder="Deja vacío para quitar la imagen"
              />
              {formProducto.imagen_url && (
                <CatalogImage
                  src={formProducto.imagen_url}
                  alt="Vista previa del producto"
                  className="mt-1 h-24 w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setProductoEditando(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal: editar servicio ---------- */}
      <Modal
        isOpen={Boolean(servicioEditando)}
        onClose={() => setServicioEditando(null)}
        title={`Editar servicio${servicioEditando ? `: ${servicioEditando.nombre}` : ''}`}
      >
        <form onSubmit={handleGuardarServicio} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            name="editNombreServicio"
            required={false}
            value={formServicio.nombre}
            onChange={(e) => setFormServicio((s) => ({ ...s, nombre: e.target.value }))}
          />
          <Input
            label="Precio"
            name="editPrecioServicio"
            required={false}
            value={formServicio.precio}
            onChange={(e) => setFormServicio((s) => ({ ...s, precio: e.target.value }))}
            inputMode="numeric"
          />
          <Input
            label="Duración (min)"
            name="editDuracionServicio"
            required={false}
            value={formServicio.duracion_minutos}
            onChange={(e) => setFormServicio((s) => ({ ...s, duracion_minutos: e.target.value }))}
            inputMode="numeric"
          />
          <div className="md:col-span-2">
            <Input
              label="Descripción"
              name="editDescripcionServicio"
              required={false}
              value={formServicio.descripcion}
              onChange={(e) => setFormServicio((s) => ({ ...s, descripcion: e.target.value }))}
            />
          </div>
          {esAdmin && (
            <div className="md:col-span-2">
              <Input
                label="Imagen del servicio (URL)"
                type="url"
                name="editImagenServicio"
                required={false}
                value={formServicio.imagen_url}
                onChange={(e) => setFormServicio((s) => ({ ...s, imagen_url: e.target.value }))}
                placeholder="Deja vacío para quitar la imagen"
              />
              {formServicio.imagen_url && (
                <CatalogImage
                  src={formServicio.imagen_url}
                  alt="Vista previa del servicio"
                  className="mt-1 h-24 w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setServicioEditando(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal: editar información de usuario ---------- */}
      <Modal
        isOpen={Boolean(usuarioEditando)}
        onClose={() => setUsuarioEditando(null)}
        title={`Editar usuario${usuarioEditando ? `: ${usuarioEditando.nombre} ${usuarioEditando.apellido}` : ''}`}
      >
        <form onSubmit={handleGuardarUsuario} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            name="nombre"
            value={formUsuario.nombre}
            onChange={handleChangeFormUsuario}
            onBlur={handleBlurFormUsuario}
            error={erroresFormUsuario.nombre}
            touched={touchedFormUsuario.nombre}
            maxLength={FIELD_LIMITS.nombre.max}
          />
          <Input
            label="Apellido"
            name="apellido"
            value={formUsuario.apellido}
            onChange={handleChangeFormUsuario}
            onBlur={handleBlurFormUsuario}
            error={erroresFormUsuario.apellido}
            touched={touchedFormUsuario.apellido}
            maxLength={FIELD_LIMITS.apellido.max}
          />
          <Input
            label="Dirección"
            name="direccion"
            value={formUsuario.direccion}
            onChange={handleChangeFormUsuario}
            onBlur={handleBlurFormUsuario}
            error={erroresFormUsuario.direccion}
            touched={touchedFormUsuario.direccion}
            maxLength={FIELD_LIMITS.direccion.max}
          />
          <Input
            label="Teléfono"
            name="telefono"
            value={formUsuario.telefono}
            onChange={handleChangeFormUsuario}
            onBlur={handleBlurFormUsuario}
            error={erroresFormUsuario.telefono}
            touched={touchedFormUsuario.telefono}
            maxLength={FIELD_LIMITS.telefono.max}
            inputMode="numeric"
          />
          <div className="md:col-span-2">
            <Input
              label="Nueva contraseña"
              name="password"
              type="password"
              required={false}
              value={formUsuario.password}
              onChange={handleChangeFormUsuario}
              onBlur={handleBlurFormUsuario}
              error={erroresFormUsuario.password}
              touched={touchedFormUsuario.password}
              maxLength={FIELD_LIMITS.password.max}
              helperText="Déjalo en blanco para conservar la contraseña actual."
              autoComplete="new-password"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setUsuarioEditando(null)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal: ver detalle de usuario (solo lectura) ---------- */}
      <Modal
        isOpen={Boolean(usuarioViendo)}
        onClose={() => setUsuarioViendo(null)}
        title={usuarioViendo ? `${usuarioViendo.nombre} ${usuarioViendo.apellido}` : ''}
      >
        {usuarioViendo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-crimson-deep font-semibold">Correo</p>
              <p className="text-ink">{usuarioViendo.correo}</p>
            </div>
            <div>
              <p className="text-crimson-deep font-semibold">Documento</p>
              <p className="text-ink">
                {ETIQUETAS_TIPO_DOC[usuarioViendo.tipo_documento] || usuarioViendo.tipo_documento}{' '}
                {usuarioViendo.numero_documento}
              </p>
            </div>
            <div>
              <p className="text-crimson-deep font-semibold">Dirección</p>
              <p className="text-ink">{usuarioViendo.direccion}</p>
            </div>
            <div>
              <p className="text-crimson-deep font-semibold">Teléfono</p>
              <p className="text-ink">{usuarioViendo.telefono}</p>
            </div>
            <div>
              <p className="text-crimson-deep font-semibold">Rol</p>
              <p className="text-ink capitalize">{usuarioViendo.nombre_rol}</p>
            </div>
            <div>
              <p className="text-crimson-deep font-semibold">Estado</p>
              <BadgeEstado estado={usuarioViendo.estado} />
            </div>
            {usuarioViendo.creado_en && (
              <div className="md:col-span-2">
                <p className="text-crimson-deep font-semibold">Registrado el</p>
                <p className="text-ink">
                  {new Date(usuarioViendo.creado_en).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            <div className="md:col-span-2 flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setUsuarioViendo(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
