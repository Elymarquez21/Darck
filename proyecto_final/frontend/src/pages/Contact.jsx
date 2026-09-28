import { useState } from 'react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const initialState = {
  nombre: '',
  email: '',
  asunto: '',
  mensaje: '',
}

const MESSAGE_MAX = 500

// Validación de cada campo del formulario de contacto
const validateField = (name, value) => {
  switch (name) {
    case 'nombre':
      if (!value.trim()) return 'El nombre es obligatorio.'
      if (value.trim().length < 2) return 'El nombre es demasiado corto.'
      return ''
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
      if (!value) return 'El correo es obligatorio.'
      if (!emailRegex.test(value)) return 'Ingresa un correo electrónico válido.'
      return ''
    }
    case 'asunto':
      if (!value.trim()) return 'El asunto es obligatorio.'
      return ''
    case 'mensaje':
      if (!value.trim()) return 'El mensaje es obligatorio.'
      if (value.trim().length < 10) return 'Cuéntanos un poco más (mínimo 10 caracteres).'
      return ''
    default:
      return ''
  }
}

const contactInfo = [
  {
    icon: '📍',
    title: 'Dirección',
    text: 'Calle 45 # 12-30, Bogotá, Colombia',
  },
  {
    icon: '📞',
    title: 'Teléfono',
    text: '+57 300 123 4567',
  },
  {
    icon: '✉️',
    title: 'Correo',
    text: 'contacto@elymarquez.com',
  },
  {
    icon: '🕒',
    title: 'Horario',
    text: 'Lun. a Sáb. · 9:00 am – 6:00 pm',
  },
]

export const Contact = () => {
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    const cleanValue = name === 'mensaje' ? value.slice(0, MESSAGE_MAX) : value
    setFormData((prev) => ({ ...prev, [name]: cleanValue }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, cleanValue) }))
    if (success) setSuccess(false)
  }

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    Object.keys(formData).forEach((key) => {
      newErrors[key] = validateField(key, formData[key])
    })
    setErrors(newErrors)
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}))

    const hasErrors = Object.values(newErrors).some((msg) => msg)
    if (!hasErrors) {
      setSuccess(true)
      setFormData(initialState)
      setTouched({})
    }
  }

  return (
    <div className="pb-16">
      <section className="max-w-5xl mx-auto px-4 pt-10 text-center">
        <span aria-hidden className="text-gold-light text-lg">✦</span>
        <h1 className="font-display italic text-3xl md:text-5xl font-semibold text-gold-shine">
          Contacto
        </h1>
        <hr className="gold-divider w-20 mx-auto mt-3 mb-2" />
        <p className="text-cream-dim max-w-xl mx-auto">
          ¿Tienes preguntas sobre nuestros productos? Escríbenos y con gusto te ayudaremos.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 mt-10 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Información de contacto */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {contactInfo.map((item) => (
            <div
              key={item.title}
              className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.45)] flex items-start gap-3"
            >
              <span aria-hidden className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-display italic text-lg font-semibold text-gold-shine">
                  {item.title}
                </h3>
                <p className="text-cream-dim text-sm mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario de contacto */}
        <div className="md:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="relative bg-cream shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gold/40 rounded-2xl p-8 animate-[riseIn_0.5s_ease-out]"
            noValidate
          >
            <span aria-hidden className="absolute -top-4 left-8 text-2xl">💌</span>
            <h2 className="font-display italic text-2xl font-semibold text-crimson-deep mb-1">
              Envíanos un mensaje
            </h2>
            <hr className="gold-divider w-16 mb-6" />

            {success && (
              <div className="mb-5 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-center animate-[fadeIn_0.4s_ease-out]">
                <p className="text-crimson-bright font-semibold">
                  ¡Gracias! Tu mensaje fue enviado correctamente. 🎉
                </p>
                <p className="text-ink/60 text-sm mt-0.5">Te responderemos muy pronto.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <Input
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.nombre}
                touched={touched.nombre}
                placeholder="Ej: María Gómez"
                autoComplete="name"
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
                placeholder="ejemplo@correo.com"
                autoComplete="email"
              />

              <div className="md:col-span-2">
                <Input
                  label="Asunto"
                  name="asunto"
                  value={formData.asunto}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.asunto}
                  touched={touched.asunto}
                  placeholder="Ej: Consulta sobre un producto"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label htmlFor="mensaje" className="text-sm font-semibold text-crimson-deep">
                  Mensaje <span className="text-crimson-bright">*</span>
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  rows={4}
                  value={formData.mensaje}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={MESSAGE_MAX}
                  placeholder="Cuéntanos en qué podemos ayudarte..."
                  aria-invalid={Boolean(touched.mensaje && errors.mensaje)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-ink bg-white/70 outline-none transition-all duration-200 focus:ring-2 resize-none ${
                    touched.mensaje && errors.mensaje
                      ? 'border-crimson-bright focus:ring-crimson-bright/30'
                      : 'border-gold/40 focus:ring-gold/40 focus:border-gold'
                  }`}
                />
                <div className="min-h-[18px] flex items-center justify-between gap-2">
                  {touched.mensaje && errors.mensaje ? (
                    <p className="text-crimson-bright text-xs">{errors.mensaje}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-ink/30 whitespace-nowrap">
                    {formData.mensaje.length}/{MESSAGE_MAX}
                  </span>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4">
              Enviar mensaje
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
