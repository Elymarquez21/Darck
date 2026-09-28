import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { RegisterModal } from '../components/RegisterModal'
import { useAuth } from '../context/AuthContext'

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')
  const [cargando, setCargando] = useState(false)

  const validateField = (name, value) => {
    let message = ''

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
      if (!value) {
        message = 'El correo es obligatorio.'
      } else if (!emailRegex.test(value)) {
        message = 'Ingresa un correo electrónico válido.'
      }
    }

    if (name === 'password') {
      if (!value) {
        message = 'La contraseña es obligatoria.'
      } else if (value.length < 6) {
        message = 'La contraseña debe tener al menos 6 caracteres.'
      }
    }

    return message
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setFormData((prev) => ({ ...prev, [name]: newValue }))

    if (type !== 'checkbox') {
      const message = validateField(name, newValue)
      setErrors((prev) => ({ ...prev, [name]: message }))
    }
  }

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorServidor('')

    const emailError = validateField('email', formData.email)
    const passwordError = validateField('password', formData.password)

    setErrors({ email: emailError, password: passwordError })
    setTouched({ email: true, password: true })

    if (emailError || passwordError) return

    try {
      setCargando(true)
      await login(formData.email, formData.password)

      // Redirige según el rol asignado en la base de datos (admin/empleado/cliente)
      navigate('/panel')
    } catch (error) {
      setErrorServidor(error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 relative">
      <Link
        to="/"
        className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-gold-light hover:text-gold-shine transition-colors"
        aria-label="Volver a la página principal"
      >
        <span className="text-2xl leading-none">←</span>
        <span className="text-sm font-medium uppercase tracking-wide">Inicio</span>
      </Link>

      <form
        onSubmit={handleSubmit}
        className="relative bg-cream shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gold/40 rounded-2xl p-8 w-full max-w-md animate-[riseIn_0.5s_ease-out]"
        noValidate
      >
        <span aria-hidden className="absolute -top-4 left-8 text-2xl">💋</span>
        <h2 className="font-display italic text-3xl font-semibold text-center mb-1 text-crimson-deep">
          Iniciar Sesión
        </h2>
        <hr className="gold-divider w-20 mx-auto mb-6" />

        {errorServidor && (
          <p className="text-crimson-bright text-center text-sm font-semibold mb-4 animate-[fadeIn_0.4s_ease-out]">
            {errorServidor}
          </p>
        )}

        {/* Correo */}
        <div className="mb-4">
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
            placeholder="ejemplo@correo.com"
            autoComplete="email"
          />
        </div>

        {/* Contraseña */}
        <div className="mb-4">
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            touched={touched.password}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {/* Recordarme */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center text-sm text-ink/70">
            <input
              type="checkbox"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
              className="mr-2 accent-crimson-bright"
            />
            Recordarme
          </label>
          <Link to="/recover-password" className="text-sm text-crimson-bright hover:text-crimson font-medium hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Botón */}
        <Button type="submit" className="w-full" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>

        {/* Crear cuenta: abre el Modal de registro */}
        <p className="text-center text-sm text-ink/70 mt-6">
          ¿No tienes una cuenta?{' '}
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="text-crimson-bright font-semibold hover:underline"
          >
            Crear cuenta
          </button>
        </p>
      </form>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </div>
  )
}
