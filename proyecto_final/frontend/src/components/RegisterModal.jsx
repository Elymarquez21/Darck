import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
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

export const RegisterModal = ({ isOpen, onClose }) => {
  const { register } = useAuth()
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')

  // Reinicia el formulario cada vez que el modal se cierra (sin registro exitoso)
  useEffect(() => {
    if (isOpen) return
    const timeout = setTimeout(() => {
      setFormData(initialState)
      setErrors({})
      setTouched({})
      setSuccess(false)
    }, 200)
    return () => clearTimeout(timeout)
  }, [isOpen])

  // Cierra automáticamente el modal unos segundos después de un registro exitoso
  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => onClose(), 1800)
    return () => clearTimeout(timeout)
  }, [success, onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    const cleanValue = sanitizeValue(name, value)
    const updated = { ...formData, [name]: cleanValue }
    setFormData(updated)

    setErrors((prev) => ({ ...prev, [name]: validateField(name, cleanValue, updated) }))

    // Si el usuario cambia la contraseña, revalida también la confirmación
    if (name === 'password' && updated.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', updated.confirmPassword, updated),
      }))
    }

    // Si cambia el tipo de cuenta, revalida la clave de administrador
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
    setTouched(
      Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    )

    const hasErrors = Object.values(newErrors).some((msg) => msg)
    if (hasErrors) return

    try {
      setEnviando(true)
      // El backend genera el hash de la contraseña antes de guardarla en MySQL
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
    } catch (error) {
      setErrorServidor(error.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleClose = () => {
    if (!success) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear una cuenta">
      {success ? (
        <div className="py-10 text-center animate-[fadeIn_0.4s_ease-out]">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-crimson-bright font-display italic font-semibold text-xl">¡Registro exitoso!</p>
          <p className="text-ink/60 text-sm mt-1">Ya puedes iniciar sesión con tu cuenta.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {errorServidor && (
            <p className="text-crimson-bright text-sm font-semibold text-center mb-3 animate-[fadeIn_0.4s_ease-out]">
              {errorServidor}
            </p>
          )}
          <div className="mb-4">
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

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button type="submit" className="flex-1" disabled={enviando}>
              {enviando ? 'Registrando...' : 'Registrarse'}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
