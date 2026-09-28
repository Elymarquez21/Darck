import { useState } from 'react'

export const CatalogImage = ({ src, alt, className = '' }) => {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-ink border border-ink-line text-center text-xs text-cream-dim/70 ${className}`}>
        Imagen no disponible
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
      loading="lazy"
    />
  )
}
