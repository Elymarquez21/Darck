export const Footer = () => {
  return (
    <footer className="relative z-40 bg-ink text-cream-dim border-t border-ink-line/80 mt-auto">
      <div className="h-[3px] bg-gradient-to-r from-crimson-deep via-gold to-crimson-deep" />

      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-center">
        <p className="text-sm text-cream-dim/80 text-center">
          © {new Date().getFullYear()} Ely Marquez. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
