import { useState } from 'react'
import { Carousel } from './Carousel'
import { DEFAULT_SLIDES, getCarouselSlides, saveCarouselSlides } from './carouselConfig'

const esUrlValida = (valor) => {
  try {
    const url = new URL(valor, window.location.origin)
    return Boolean(valor.trim()) && ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

const urlsActuales = () => getCarouselSlides().map((slide) => slide.url)

export const CarouselAdmin = () => {
  const [urlsGuardadas, setUrlsGuardadas] = useState(urlsActuales)
  const [urls, setUrls] = useState(urlsGuardadas)
  const [mensaje, setMensaje] = useState('')

  const errores = urls.map((url) => (esUrlValida(url) ? '' : 'Introduce una URL http o https válida.'))
  const puedeGuardar = errores.every((error) => !error)
  const previewSlides = DEFAULT_SLIDES.map((slide, index) => ({ ...slide, url: urls[index] }))

  const actualizarUrl = (index, valor) => {
    setUrls((actuales) => actuales.map((actual, posicion) => (posicion === index ? valor : actual)))
    setMensaje('')
  }

  const guardarCambios = () => {
    if (!puedeGuardar) {
      setMensaje('Revisa las URLs marcadas antes de guardar.')
      return
    }
    saveCarouselSlides(urls.map((url) => url.trim()))
    const nuevasUrls = urls.map((url) => url.trim())
    setUrlsGuardadas(nuevasUrls)
    setUrls(nuevasUrls)
    setMensaje('Cambios guardados correctamente.')
  }

  const cancelarCambios = () => {
    setUrls(urlsGuardadas)
    setMensaje('Cambios descartados.')
  }

  const restaurarPredeterminadas = () => {
    setUrls(DEFAULT_SLIDES.map((slide) => slide.url))
    setMensaje('Se cargaron las imágenes predeterminadas. Guarda para aplicarlas al carrusel público.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl italic text-gold-light">Administrar carrusel</h2>
        <p className="mt-1 text-sm text-cream-dim">
          Cambia las 10 imágenes por URL y revisa el resultado antes de guardarlo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {urls.map((url, index) => (
          <label key={index} className="block rounded-lg border border-ink-line bg-ink-soft p-4">
            <span className="mb-2 block text-sm font-semibold text-gold-light">Imagen {index + 1}</span>
            <input
              type="url"
              value={url}
              onChange={(event) => actualizarUrl(index, event.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className={`w-full rounded-lg border bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-dim/50 focus:outline-none ${
                errores[index] ? 'border-crimson-bright' : 'border-ink-line focus:border-gold/60'
              }`}
              aria-invalid={Boolean(errores[index])}
            />
            {errores[index] ? (
              <span className="mt-2 block text-xs text-crimson-bright">{errores[index]}</span>
            ) : (
              <span className="mt-2 block text-xs text-emerald-300">URL lista para previsualizar</span>
            )}
          </label>
        ))}
      </div>

      <div className="border-t border-gold/30 pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl italic text-gold-light">Vista previa</h3>
            <p className="mt-1 text-xs text-cream-dim">Usa las flechas para revisar las 10 posiciones.</p>
          </div>
          <span className="text-xs text-cream-dim">Actualización en tiempo real</span>
        </div>
        <Carousel slides={previewSlides} autoPlay={false} />
      </div>

      {mensaje && (
        <p className="rounded-lg border border-gold/30 bg-ink-soft px-4 py-3 text-sm text-gold-light" role="status">
          {mensaje}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-ink-line pt-4">
        <button
          type="button"
          onClick={restaurarPredeterminadas}
          className="rounded-lg border border-ink-line px-4 py-2 text-sm text-cream-dim transition-colors hover:border-gold/50 hover:text-cream"
        >
          Restaurar predeterminadas
        </button>
        <button
          type="button"
          onClick={cancelarCambios}
          className="rounded-lg border border-gold/50 px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold/10"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardarCambios}
          disabled={!puedeGuardar}
          className="rounded-lg bg-crimson-bright px-5 py-2 text-sm font-semibold text-cream transition-colors hover:bg-crimson disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
