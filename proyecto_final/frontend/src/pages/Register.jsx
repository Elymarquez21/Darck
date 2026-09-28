import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { FIELD_LIMITS, sanitizeValue, validateField } from '../utils/validators'
import { useAuth } from '../context/AuthContext'

const initialState = {
  nombre: '',
  apellido: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  direccion: '',
  telefono: '',
  email: '',
  password: '',
  confirmPassword: '',
  rol: 'cliente',
  claveAdmin: '',
}

const documentOptions = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

const roleOptions = [
  { value: 'cliente', label: 'Cliente', description: 'Compra productos y agenda servicios.' },
  { value: 'administrador', label: 'Administrador', description: 'Requiere una clave especial de acceso.' },
]

export const Register = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    const cleanValue = sanitizeValue(name, value)
    const updated = { ...formData, [name]: cleanValue }
    setFormData(updated)
    setSuccess(false)

    setErrors((prev) => ({ ...prev, [name]: validateField(name, cleanValue, updated) }))

    if (name === 'password' && updated.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', updated.confirmPassword, updated),
      }))
    }

    // Si cambia el tipo de cuenta, revalida la clave de administrador
    // (deja de ser obligatoria si vuelve a elegir "cliente")
    if (name === 'rol') {
      setErrors((prev) => ({
        ...prev,
        claveAdmin: validateField('claveAdmin', updated.claveAdmin, updated),
      }))
    }
  }

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorServidor('')

    const newErrors = {}
    Object.keys(formData).forEach((key) => {
      newErrors[key] = validateField(key, formData[key], formData)
    })
    setErrors(newErrors)
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}))

    const hasErrors = Object.values(newErrors).some((msg) => msg)
    if (hasErrors) return

    try {
      setEnviando(true)
      // El backend aplica hashing (bcrypt) a la contraseña antes de
      // insertarla en la tabla `usuarios` de la base de datos SQL.
      await register({
        nombre: formData.nombre,
        apellido: formData.apellido,
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.numeroDocumento,
        direccion: formData.direccion,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
        ...(formData.rol === 'administrador' ? { claveAdmin: formData.claveAdmin } : {}),
      })
      setSuccess(true)
      setFormData(initialState)
      setTouched({})
      setTimeout(() => navigate('/login'), 1800)
    } catch (error) {
      setErrorServidor(error.message)
    } finally {
      setEnviando(false)
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
        noValidate
        className="relative bg-cream shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gold/40 rounded-2xl p-8 w-full max-w-2xl animate-[riseIn_0.5s_ease-out]"
      >
        <span aria-hidden className="absolute -top-4 left-8 text-2xl">💄</span>
        <h2 className="font-display italic text-3xl font-semibold text-center mb-1 text-crimson-deep">
          Crear una cuenta
        </h2>
        <hr className="gold-divider w-20 mx-auto mb-6" />

        {success && (
          <p className="text-crimson-bright text-center font-semibold mb-4 animate-[fadeIn_0.4s_ease-out]">
            ¡Registro exitoso! 🎉 Redirigiendo a inicio de sesión...
          </p>
        )}

        {errorServidor && (
          <p className="text-crimson-bright text-center text-sm font-semibold mb-4 animate-[fadeIn_0.4s_ease-out]">
            {errorServidor}
          </p>
        )}

        <div className="mb-5">
          <p className="text-sm font-semibold text-crimson-deep mb-2">
            Tipo de cuenta <span className="text-crimson-bright">*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleOptions.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200 ${
                  formData.rol === opt.value
                    ? 'border-crimson-bright bg-crimson-bright/5 ring-2 ring-crimson-bright/30'
                    : 'border-gold/40 hover:border-gold'
                }`}
              >
                <input
                  type="radio"
                  name="rol"
                  value={opt.value}
                  checked={formData.rol === opt.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="block font-semibold text-crimson-deep">{opt.label}</span>
                <span className="block text-xs text-ink/60 mt-0.5">{opt.description}</span>
              </label>
            ))}
          </div>

          {formData.rol === 'administrador' && (
            <div className="mt-3 animate-[fadeIn_0.3s_ease-out]">
              <Input
                label="Clave de administrador"
                type="password"
                name="claveAdmin"
                value={formData.claveAdmin}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.claveAdmin}
                touched={touched.claveAdmin}
                maxLength={FIELD_LIMITS.claveAdmin.max}
                placeholder="••••••••"
                helperText="Solicita esta clave a quien administre el sistema."
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <Input
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.nombre}
            touched={touched.nombre}
            maxLength={FIELD_LIMITS.nombre.max}
            placeholder="Ej: María"
            autoComplete="given-name"
          />

          <Input
            label="Apellido"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.apellido}
            touched={touched.apellido}
            maxLength={FIELD_LIMITS.apellido.max}
            placeholder="Ej: Gómez"
            autoComplete="family-name"
          />

          <Select
            label="Tipo de documento"
            name="tipoDocumento"
            value={formData.tipoDocumento}
            onChange={handleChange}
            options={documentOptions}
          />

          <Input
            label="Número de documento"
            name="numeroDocumento"
            value={formData.numeroDocumento}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.numeroDocumento}
            touched={touched.numeroDocumento}
            maxLength={FIELD_LIMITS.numeroDocumento.max}
            placeholder="Ej: 1020304050"
            inputMode="numeric"
          />

          <div className="md:col-span-2">
            <Input
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.direccion}
              touched={touched.direccion}
              maxLength={FIELD_LIMITS.direccion.max}
              placeholder="Ej: Calle 10 # 20-30"
              autoComplete="street-address"
            />
          </div>

          <Input
            label="Teléfono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.telefono}
            touched={touched.telefono}
            maxLength={FIELD_LIMITS.telefono.max}
            placeholder="Ej: 3001234567"
            inputMode="numeric"
            autoComplete="tel"
          />

          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
            maxLength={FIELD_LIMITS.email.max}
            placeholder="ejemplo@correo.com"
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            touched={touched.password}
            maxLength={FIELD_LIMITS.password.max}
            placeholder="••••••••"
            helperText="8-20 caracteres: mayúscula, minúscula, número y símbolo."
            autoComplete="new-password"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            maxLength={FIELD_LIMITS.password.max}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrarse'}
        </Button>

        <p className="text-center text-sm text-ink/70 mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-crimson-bright font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
