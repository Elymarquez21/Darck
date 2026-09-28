/**
 * Botón flotante de WhatsApp.
 *
 * Componente reutilizable e independiente que muestra un acceso directo
 * al contacto de la empresa por WhatsApp. Se mantiene fijo en una
 * posición de la pantalla sin importar la página o el scroll, y sigue
 * la misma línea visual (colores, tipografía y efectos) del resto de
 * la aplicación.
 *
 * Props:
 * - phone:    número de WhatsApp en formato internacional, solo dígitos
 *             (ej: "573001234567"). Por defecto usa el teléfono de contacto
 *             de la empresa.
 * - message:  mensaje predefinido que se abrirá en el chat.
 * - position: "right" (por defecto) o "left", para elegir la esquina
 *             inferior en la que se ancla el botón.
 */
export const WhatsAppButton = ({
  phone = '573001234567',
  message = 'Hola, quisiera más información sobre sus productos.',
  position = 'right',
}) => {
  const cleanPhone = phone.replace(/\D/g, '')
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

  const sideClass = position === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      title="Escríbenos por WhatsApp"
      className={`sheen group fixed bottom-56 md:bottom-32 ${sideClass} z-50 flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-gold/80 bg-gradient-to-br from-crimson to-crimson-bright text-cream shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-300 hover:scale-105 hover:shadow-[0_14px_38px_rgba(0,0,0,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light animate-[glowPulse_2.4s_ease-in-out_infinite]`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 448 512"
        className="h-[2.2rem] w-[2.2rem] fill-current"
      >
        <path d="M380.9 97.1A227.4 227.4 0 0 0 220.9 44C118.2 44 32.9 129.3 32.9 232c0 40.7 11.9 80.5 34.4 115.4L32 480l137.3-42.4c32.7 17.8 69.2 27.1 106.6 27.1h.1c102.7 0 188-84.3 188-188.1 0-50.4-19.6-97.9-55.1-133.5zm-159.9 289.2c-32.7 0-64.9-8.8-92.8-25.4l-6.7-4-81.1 25.1 27.3-79.1-4.6-7.2A176.5 176.5 0 0 1 56 232c0-96.6 78.5-175.1 175.1-175.1 46.7 0 90.7 18.2 123.9 51.3 33.2 33.1 51.5 77 51.5 123.8 0 96.8-78.5 175.2-175.1 175.2zm96.8-131.4c-5.3-2.7-31.2-15.4-36.1-17.1-4.9-1.7-8.5-2.6-12.1 2.7-3.6 5.3-13.9 17.1-17.1 20.6-3.2 3.5-6.4 4-12.1 1.3-5.7-2.7-23.9-8.8-45.5-28.1-16.8-15-28.1-33.5-31.4-39.1-3.3-5.6-1.2-8.6 2.7-11.3 2.7-2.7 5.9-7 8.8-10.4 2.9-3.4 3.8-5.8 5.7-9.8 1.9-4 1-7.4-.7-10.3-1.7-2.9-15.4-37-21-50.7-5.5-13.2-11.2-11.3-15.4-11.5-4-.2-8.7-.2-13.1-.2-4.4 0-11.6 1.7-17.7 8.2-6.1 6.5-23.2 22.7-23.2 55.1s23.9 64 27.2 68.5c3.3 4.4 46.9 71.4 113.5 100 15.8 6.8 28.1 10.9 37.7 14 16 5.1 30.3 4.4 41.8 2.7 12.8-1.9 38.6-15.7 43.9-30.9 5.3-15.2 5.3-28.1 3.7-30.8-1.6-2.8-6.1-4.5-12.7-7.9z" />
      </svg>
    </a>
  )
}
