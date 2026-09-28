import heroImg from '../assets/images/07-detalles-artesanales.jpg'

const values = [
  {
    icon: '💎',
    title: 'Calidad',
    text: 'Seleccionamos cada ingrediente y material pensando en resultados reales y duraderos.',
  },
  {
    icon: '🌿',
    title: 'Responsabilidad',
    text: 'Belleza consciente: fórmulas cuidadas y prácticas responsables con las personas y el entorno.',
  },
  {
    icon: '✨',
    title: 'Autenticidad',
    text: 'Creemos en realzar la belleza natural de cada persona, sin máscaras ni imposiciones.',
  },
  {
    icon: '🤝',
    title: 'Cercanía',
    text: 'Acompañamos a cada cliente con asesoría honesta antes, durante y después de su compra.',
  },
]

const milestones = [
  { year: '2016', text: 'Nace Ely Marquez como un pequeño taller de cosmética artesanal.' },
  { year: '2019', text: 'Lanzamos nuestra primera colección de labiales de larga duración.' },
  { year: '2022', text: 'Ampliamos la línea a skincare y perfumería exclusiva.' },
  { year: '2026', text: 'Renovamos nuestra plataforma digital para acercarnos aún más a ti.' },
]

export const AboutUs = () => {
  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative max-w-5xl mx-auto my-10 px-4">
        <div className="relative rounded-2xl overflow-hidden border border-gold/40 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
          <img
            src={heroImg}
            alt="Detalles artesanales de la marca Ely Marquez"
            className="w-full h-64 md:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent flex items-end">
            <div className="p-6 md:p-10">
              <span aria-hidden className="text-gold-light text-lg">✦</span>
              <h1 className="font-display italic text-3xl md:text-5xl font-semibold text-gold-shine">
                ¿Quiénes Somos?
              </h1>
              <p className="text-cream-dim mt-2 max-w-xl">
                Conoce la historia, los valores y el propósito detrás de Ely Marquez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Historia / Misión / Visión */}
      <section className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.45)] animate-[riseIn_0.5s_ease-out]">
          <span aria-hidden className="absolute -top-3 left-6 text-2xl">📖</span>
          <h2 className="font-display italic text-2xl font-semibold text-gold-shine">
            Nuestra Historia
          </h2>
          <hr className="gold-divider w-16 my-3" />
          <p className="text-cream-dim">
            Ely Marquez nació del amor por el detalle y la convicción de que la belleza
            es una forma de expresión personal. Desde un pequeño taller artesanal, hemos
            crecido hasta convertirnos en una marca reconocida por la calidad de sus
            productos y la calidez de su servicio.
          </p>
        </div>

        <div className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.45)] animate-[riseIn_0.6s_ease-out]">
          <span aria-hidden className="absolute -top-3 left-6 text-2xl">🎯</span>
          <h2 className="font-display italic text-2xl font-semibold text-gold-shine">
            Misión y Visión
          </h2>
          <hr className="gold-divider w-16 my-3" />
          <p className="text-cream-dim mb-3">
            <span className="text-gold-light font-semibold">Misión:</span> ofrecer
            productos de belleza de alta calidad que realcen la confianza y la
            personalidad de quienes los usan.
          </p>
          <p className="text-cream-dim">
            <span className="text-gold-light font-semibold">Visión:</span> ser la marca
            de referencia en cosmética consciente, cercana e innovadora en la región.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <div className="text-center mb-8">
          <h2 className="font-display italic text-2xl md:text-3xl font-semibold text-gold-shine">
            Nuestros Valores
          </h2>
          <hr className="gold-divider w-20 mx-auto mt-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((value) => (
            <div
              key={value.title}
              className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-5 py-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1"
            >
              <span aria-hidden className="text-3xl">{value.icon}</span>
              <h3 className="font-display italic text-lg font-semibold text-gold-shine mt-2">
                {value.title}
              </h3>
              <p className="text-cream-dim text-sm mt-2">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Línea de tiempo */}
      <section className="max-w-3xl mx-auto px-4 mt-14">
        <div className="text-center mb-8">
          <h2 className="font-display italic text-2xl md:text-3xl font-semibold text-gold-shine">
            Nuestro Camino
          </h2>
          <hr className="gold-divider w-20 mx-auto mt-3" />
        </div>

        <ol className="relative border-l border-gold/40 ml-3">
          {milestones.map((item) => (
            <li key={item.year} className="mb-8 ml-6">
              <span className="absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-crimson to-crimson-bright border border-gold/50 text-cream text-xs font-bold">
                ✦
              </span>
              <p className="font-display italic text-lg text-gold-light">{item.year}</p>
              <p className="text-cream-dim text-sm mt-1">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
