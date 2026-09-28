import { useState } from 'react'
import { Link } from 'react-router-dom'

export const RecoverPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      return 'El correo es obligatorio.'
    }
    if (!emailRegex.test(value)) {
      return 'Ingresa un correo electrónico válido.'
    }
    return ''
  }

  const handleChange = (e) => {
    const value = e.target.value
    setEmail(value)
    setError(validateEmail(value))
    setSent(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const message = validateEmail(email)
    setError(message)

    if (!message) {
      setSent(true)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-cream shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-gold/40 rounded-2xl p-8 w-full max-w-md animate-[riseIn_0.5s_ease-out]"
      >
        <span aria-hidden className="absolute -top-4 left-8 text-2xl">✨</span>
        <h2 className="font-display italic text-3xl font-semibold text-center mb-1 text-crimson-deep">
          Recuperar Contraseña
        </h2>
        <hr className="gold-divider w-20 mx-auto mb-4" />
        <p className="text-sm text-ink/60 text-center mb-6">
          Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-crimson-deep mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-ink bg-white/70 focus:outline-none focus:ring-2 transition-all duration-200 ${
              error
                ? 'border-crimson-bright focus:ring-crimson-bright/30'
                : 'border-gold/40 focus:ring-gold/40 focus:border-gold'
            }`}
            placeholder="ejemplo@correo.com"
          />
          {error && <p className="text-crimson-bright text-sm mt-1">{error}</p>}
          {sent && !error && (
            <p className="text-crimson-bright text-sm mt-1 font-medium">
              ¡Hemos enviado las instrucciones a tu correo!
            </p>
          )}
        </div>

        <button
          type="submit"
          className="sheen w-full bg-gradient-to-r from-crimson to-crimson-bright hover:from-crimson-bright hover:to-crimson text-cream font-semibold py-2 rounded-lg border border-gold/50 shadow-[0_4px_16px_rgba(200,30,58,0.35)] transition-all duration-300"
        >
          Recuperar contraseña
        </button>

        <p className="text-center text-sm text-ink/70 mt-6">
          <Link to="/login" className="text-crimson-bright font-semibold hover:underline">
            ← Regresar al inicio de sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
