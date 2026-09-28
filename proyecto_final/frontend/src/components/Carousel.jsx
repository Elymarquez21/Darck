import { useEffect, useState, useCallback } from 'react'
import { getCarouselSlides } from './carouselConfig'

export const Carousel = ({ slides: slidesProp, autoPlay = true }) => {
  const [storedSlides, setStoredSlides] = useState(getCarouselSlides)
  const [current, setCurrent] = useState(0)
  const [failedUrl, setFailedUrl] = useState('')
  const slides = slidesProp || storedSlides
  const [loadedUrl, setLoadedUrl] = useState('')

  useEffect(() => {
    if (slidesProp) return undefined

    const actualizarSlides = () => {
      setStoredSlides(getCarouselSlides())
      setCurrent(0)
    }
    window.addEventListener('carousel-updated', actualizarSlides)
    return () => window.removeEventListener('carousel-updated', actualizarSlides)
  }, [slidesProp])

  const prevSlide = () => {
    setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1))
  }

  const nextSlide = useCallback(() => {
    setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1))
  }, [slides.length])

  // Auto-avance cada 6 segundos, en pausa si el usuario interactúa recientemente
  useEffect(() => {
    if (!autoPlay || slides.length < 2) return undefined
    const timer = setInterval(nextSlide, 6000)
    return () => clearInterval(timer)
  }, [autoPlay, nextSlide, slides.length])

  return (
    <div className="relative max-w-3xl mx-auto my-10 px-4">
      {/* Destellos decorativos */}
      <span aria-hidden className="sparkle-dot top-0 left-8 text-xl" style={{ animationDelay: '0.2s' }}>✦</span>
      <span aria-hidden className="sparkle-dot -top-2 right-16 text-sm" style={{ animationDelay: '1.1s' }}>✦</span>
      <span aria-hidden className="sparkle-dot bottom-4 -left-2 text-xs" style={{ animationDelay: '1.8s' }}>✦</span>

      <div className="relative rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.55)] border border-gold/40 p-[3px] bg-gradient-to-br from-gold via-crimson to-ink-soft">
        <div className="relative rounded-[14px] overflow-hidden">
          {failedUrl === slides[current].url || !slides[current].url ? (
            <div className="flex h-80 items-center justify-center bg-ink px-6 text-center text-crimson-bright">
              <div>
                <p className="font-semibold">No se pudo cargar esta imagen.</p>
                <p className="mt-1 text-xs text-cream-dim">Verifica la URL e inténtalo de nuevo.</p>
              </div>
            </div>
          ) : (
            <>
              {loadedUrl !== slides[current].url && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/80 text-sm text-gold-light">
                  Cargando imagen...
                </div>
              )}
              <img
                key={slides[current].url}
                src={slides[current].url}
                alt={slides[current].title}
                onLoad={() => setLoadedUrl(slides[current].url)}
                onError={() => {
                  setFailedUrl(slides[current].url)
                }}
                className="w-full h-80 object-cover animate-[fadeIn_0.5s_ease-out]"
              />
            </>
          )}

          {/* Texto sobre la imagen */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink via-crimson-deep/80 to-transparent p-5">
            <h3 className="font-display italic text-xl font-semibold text-gold-shine">
              {slides[current].title}
            </h3>
            <p className="text-sm text-cream-dim mt-1">{slides[current].description}</p>
          </div>

          {/* Botón anterior */}
          <button
            onClick={prevSlide}
            aria-label="Diapositiva anterior"
            className="sheen absolute top-1/2 left-3 -translate-y-1/2 bg-ink/70 hover:bg-crimson-bright text-gold-light rounded-full w-9 h-9 flex items-center justify-center font-bold border border-gold/50 transition-colors duration-300"
          >
            ‹
          </button>

          {/* Botón siguiente */}
          <button
            onClick={nextSlide}
            aria-label="Siguiente diapositiva"
            className="sheen absolute top-1/2 right-3 -translate-y-1/2 bg-ink/70 hover:bg-crimson-bright text-gold-light rounded-full w-9 h-9 flex items-center justify-center font-bold border border-gold/50 transition-colors duration-300"
          >
            ›
          </button>
        </div>
      </div>

      {/* Indicadores (puntos) */}
      <div className="flex justify-center gap-2 mt-5">
        {slides.map((slide, index) => (
          <button
            key={slide.url}
            onClick={() => setCurrent(index)}
            aria-label={`Ir a la diapositiva ${index + 1}: ${slide.title}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === current ? 'w-6 bg-gradient-to-r from-crimson-bright to-gold-light' : 'w-2.5 bg-ink-line hover:bg-gold/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
