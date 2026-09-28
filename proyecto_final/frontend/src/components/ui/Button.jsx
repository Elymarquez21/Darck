const VARIANTS = {
  primary:
    'bg-gradient-to-r from-crimson to-crimson-bright text-cream border border-gold/50 hover:from-crimson-bright hover:to-crimson shadow-[0_4px_16px_rgba(200,30,58,0.35)]',
  secondary:
    'bg-ink-soft text-cream-dim border border-ink-line hover:border-gold/50 hover:text-cream',
  outline:
    'border border-gold text-gold-light hover:bg-gold/10',
  ghost: 'text-cream-dim hover:text-gold-light',
}

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`sheen font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
