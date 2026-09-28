import slide01 from '../assets/images/01-bienvenida.jpg'
import slide02 from '../assets/images/02-coleccion-labiales.jpg'
import slide03 from '../assets/images/03-paleta-dorada.jpg'
import slide04 from '../assets/images/04-linea-skincare.jpg'
import slide05 from '../assets/images/05-perfumeria-exclusiva.jpg'
import slide06 from '../assets/images/06-edicion-dorada.jpg'
import slide07 from '../assets/images/07-detalles-artesanales.jpg'
import slide08 from '../assets/images/08-tendencias-temporada.jpg'
import slide09 from '../assets/images/09-regalos-especiales.jpg'
import slide10 from '../assets/images/10-compromiso-calidad.jpg'

export const DEFAULT_SLIDES = [
  { url: slide01, title: 'Bienvenida', description: 'El arte de realzar tu belleza natural.' },
  { url: slide02, title: 'Colección de Labiales', description: 'Tonos intensos con acabado de alta duración.' },
  { url: slide03, title: 'Paleta Dorada', description: 'Sombras luminosas para toda ocasión.' },
  { url: slide04, title: 'Línea Skincare', description: 'Cuidado facial con ingredientes naturales.' },
  { url: slide05, title: 'Perfumería Exclusiva', description: 'Fragancias que cuentan tu historia.' },
  { url: slide06, title: 'Edición Dorada', description: 'Piezas limitadas de brillo excepcional.' },
  { url: slide07, title: 'Detalles Artesanales', description: 'Elaborado con precisión y pasión.' },
  { url: slide08, title: 'Tendencias de Temporada', description: 'Lo último en maquillaje y estilo.' },
  { url: slide09, title: 'Regalos Especiales', description: 'Sets exclusivos para sorprender.' },
  { url: slide10, title: 'Compromiso de Calidad', description: 'Belleza responsable, resultados reales.' },
]

const STORAGE_KEY = 'elymarquez_carousel_slides'

export const getCarouselSlides = () => {
  if (typeof window === 'undefined') return DEFAULT_SLIDES

  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!Array.isArray(guardado) || guardado.length !== DEFAULT_SLIDES.length) return DEFAULT_SLIDES

    return DEFAULT_SLIDES.map((slide, index) => ({
      ...slide,
      url: typeof guardado[index] === 'string' ? guardado[index] : slide.url,
    }))
  } catch {
    return DEFAULT_SLIDES
  }
}

export const saveCarouselSlides = (urls) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls))
  window.dispatchEvent(new Event('carousel-updated'))
}
