export const PrimerComponente = () => {
  return (
    <section className="max-w-3xl mx-auto my-8 px-4">
      <div className="sheen relative rounded-2xl border border-gold/30 bg-ink-soft px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.45)] animate-[riseIn_0.5s_ease-out]">
        <span aria-hidden className="absolute -top-3 left-6 text-2xl">💄</span>
        <h2 className="font-display italic text-2xl font-semibold text-gold-shine">
          Primer Componente
        </h2>
        <hr className="gold-divider w-16 my-3" />
        <p className="text-cream-dim">Este es el primer componente de React.</p>
      </div>
    </section>
  )
}
