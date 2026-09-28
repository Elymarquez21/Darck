export const SegundoComponente = () => {
  return (
    <section className="max-w-3xl mx-auto my-8 mb-16 px-4">
      <div className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.45)] animate-[riseIn_0.6s_ease-out]">
        <span aria-hidden className="absolute -top-3 left-6 text-2xl">✨</span>
        <h2 className="font-display italic text-2xl font-semibold text-gold-shine">
          Segundo Componente
        </h2>
        <hr className="gold-divider w-16 my-3" />
        <p className="text-cream-dim mb-3">Lista de elementos:</p>
        <ul className="space-y-2">
          {['Elemento 1', 'Elemento 2', 'Elemento 3'].map((item) => (
            <li key={item} className="flex items-center gap-3 text-cream-dim">
              <span aria-hidden className="text-gold-light">✦</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
