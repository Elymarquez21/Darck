import { useEffect } from 'react'

export const Modal = ({ isOpen, onClose, title, children }) => {
  // Cierra el modal con la tecla ESC y bloquea el scroll del body mientras está abierto
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-cream shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-gold/40 animate-[fadeIn_0.25s_ease-out]"
      >
        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-ink via-crimson-deep to-ink border-b border-gold/40 px-6 py-4 rounded-t-2xl">
          <h2 id="modal-title" className="font-display italic text-lg font-semibold text-gold-shine">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-cream-dim hover:text-gold-light text-xl leading-none transition-colors duration-200"
          >
            ✕
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
