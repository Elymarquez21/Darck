import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatbotApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const bienvenida = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente de Ely Marquez. Puedo ayudarte con productos, servicios, compras o solicitudes PQR.',
}

const preguntasSugeridas = [
  '¿Qué productos de maquillaje tienen?',
  '¿Qué servicios ofrecen?',
  '¿Cómo puedo realizar una compra?',
  '¿Cómo registro una PQR?',
]

export const Chatbot = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [conversacion, setConversacion] = useState([bienvenida])
  const [cargando, setCargando] = useState(false)
  const finalRef = useRef(null)

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversacion, cargando])

  const enviar = async (mensajeDirecto = mensaje) => {
    const texto = mensajeDirecto.trim()
    if (!texto || cargando) return

    const historial = conversacion
      .slice(1)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }))

    setConversacion((actual) => [...actual, { role: 'user', content: texto }])
    setMensaje('')
    setCargando(true)

    try {
      const respuesta = await chatbotApi.responder(texto, historial)
      setConversacion((actual) => [
        ...actual,
        {
          role: 'assistant',
          content: respuesta.respuesta,
          accion: respuesta.accion,
          origen: respuesta.origen,
        },
      ])
    } catch (error) {
      setConversacion((actual) => [
        ...actual,
        {
          role: 'assistant',
          content: error.message || 'No pude responder en este momento. Inténtalo de nuevo.',
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente virtual'}
        className="fixed bottom-6 left-5 z-50 flex items-center gap-2 rounded-full border border-gold/70 bg-crimson-bright px-4 py-3 font-semibold text-cream shadow-xl transition hover:scale-105"
      >
        <span aria-hidden="true">✦</span>
        <span>Asistente</span>
      </button>

      {abierto && (
        <section
          aria-label="Asistente virtual"
          className="fixed bottom-20 left-3 z-50 flex h-[min(70vh,560px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-2xl border border-gold/40 bg-ink shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-ink-line bg-ink-soft px-4 py-3">
            <div>
              <h2 className="font-display text-lg text-gold-light">Asistente Ely</h2>
              <p className="text-xs text-cream-dim">Productos, compras y PQR</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded p-2 text-xl text-cream-dim hover:text-cream"
              aria-label="Cerrar"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {conversacion.map((item, indice) => (
              <div
                key={`${indice}-${item.role}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  item.role === 'user'
                    ? 'ml-auto bg-crimson-bright text-cream'
                    : 'border border-gold/15 bg-ink-soft text-cream'
                }`}
              >
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.accion === 'pqr' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(false)
                      navigate(isAuthenticated ? '/panel' : '/login')
                    }}
                    className="mt-2 rounded bg-gold px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    {isAuthenticated ? 'Abrir Mis PQR' : 'Iniciar sesión para registrar PQR'}
                  </button>
                )}
              </div>
            ))}

            {conversacion.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gold-light">Puedes preguntarme:</p>
                <div className="flex flex-wrap gap-2">
                  {preguntasSugeridas.map((pregunta) => (
                    <button
                      key={pregunta}
                      type="button"
                      disabled={cargando}
                      onClick={() => void enviar(pregunta)}
                      className="rounded-full border border-gold/40 px-3 py-1.5 text-left text-xs text-cream transition hover:border-gold hover:bg-ink-soft disabled:opacity-50"
                    >
                      {pregunta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cargando && <p className="text-xs text-cream-dim">Escribiendo…</p>}
            <div ref={finalRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void enviar()
            }}
            className="flex gap-2 border-t border-ink-line p-3"
          >
            <label className="sr-only" htmlFor="chatbot-mensaje">
              Tu mensaje
            </label>
            <input
              id="chatbot-mensaje"
              value={mensaje}
              onChange={(event) => setMensaje(event.target.value)}
              maxLength={1200}
              placeholder="Escribe tu consulta…"
              className="min-w-0 flex-1 rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-cream outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={cargando || !mensaje.trim()}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  )
}
