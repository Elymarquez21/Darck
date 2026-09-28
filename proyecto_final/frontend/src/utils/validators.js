// Límites de longitud (mínima y máxima) por campo del formulario de registro
export const FIELD_LIMITS = {
  nombre: { min: 2, max: 40 },
  apellido: { min: 2, max: 40 },
  numeroDocumento: { min: 6, max: 15 },
  direccion: { min: 5, max: 100 },
  telefono: { min: 10, max: 10 },
  email: { min: 6, max: 60 },
  password: { min: 8, max: 20 },
  claveAdmin: { min: 1, max: 60 },
}

// Expresiones regulares utilizadas para validar tipos de dato y formatos
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]+$/
const DOC_REGEX = /^\d+$/
const PHONE_REGEX = /^3\d{9}$/ // Celular colombiano: 10 dígitos, inicia en 3
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const ADDRESS_REGEX = /^[A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü\s#\-.,]+$/
// Contraseña: al menos 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

/**
 * Elimina en tiempo real los caracteres no permitidos para cada campo,
 * evitando que el usuario pueda siquiera escribirlos.
 */
export const sanitizeValue = (name, rawValue) => {
  let value = rawValue

  switch (name) {
    case 'nombre':
    case 'apellido':
      value = value.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]/g, '')
      break
    case 'numeroDocumento':
    case 'telefono':
      value = value.replace(/\D/g, '')
      break
    case 'direccion':
      value = value.replace(/[^A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü\s#\-.,]/g, '')
      break
    case 'password':
    case 'confirmPassword':
    case 'claveAdmin':
      value = value.replace(/\s/g, '') // No se permiten espacios
      break
    default:
      break
  }

  const limit = FIELD_LIMITS[name]?.max
  if (limit && value.length > limit) {
    value = value.slice(0, limit)
  }

  return value
}

/**
 * Valida un campo específico del formulario de registro.
 * Retorna un mensaje de error en español o '' si el campo es válido.
 */
export const validateField = (name, value, allValues = {}) => {
  const limits = FIELD_LIMITS[name]

  switch (name) {
    case 'nombre':
    case 'apellido': {
      const etiqueta = name === 'nombre' ? 'nombre' : 'apellido'
      if (!value.trim()) return `El ${etiqueta} es obligatorio.`
      if (value.trim().length < limits.min) return `Debe tener al menos ${limits.min} caracteres.`
      if (value.length > limits.max) return `No puede superar ${limits.max} caracteres.`
      if (!NAME_REGEX.test(value)) return 'Solo se permiten letras y espacios.'
      return ''
    }

    case 'tipoDocumento':
      return value ? '' : 'Selecciona un tipo de documento.'

    case 'numeroDocumento': {
      if (!value) return 'El número de documento es obligatorio.'
      if (!DOC_REGEX.test(value)) return 'Solo se permiten números.'
      if (value.length < limits.min || value.length > limits.max) {
        return `Debe tener entre ${limits.min} y ${limits.max} dígitos.`
      }
      return ''
    }

    case 'direccion': {
      if (!value.trim()) return 'La dirección es obligatoria.'
      if (value.trim().length < limits.min) return `Debe tener al menos ${limits.min} caracteres.`
      if (value.length > limits.max) return `No puede superar ${limits.max} caracteres.`
      if (!ADDRESS_REGEX.test(value)) return 'La dirección contiene caracteres no permitidos.'
      return ''
    }

    case 'telefono': {
      if (!value) return 'El teléfono es obligatorio.'
      if (!DOC_REGEX.test(value)) return 'Solo se permiten números.'
      if (value.length !== limits.min) return `Debe tener ${limits.min} dígitos.`
      if (!PHONE_REGEX.test(value)) return 'Ingresa un celular colombiano válido (inicia en 3).'
      return ''
    }

    case 'email': {
      if (!value) return 'El correo es obligatorio.'
      if (value.length > limits.max) return `No puede superar ${limits.max} caracteres.`
      if (!EMAIL_REGEX.test(value)) return 'Ingresa un correo electrónico válido.'
      return ''
    }

    case 'password': {
      if (!value) return 'La contraseña es obligatoria.'
      if (value.length < limits.min || value.length > limits.max) {
        return `Debe tener entre ${limits.min} y ${limits.max} caracteres.`
      }
      if (!PASSWORD_REGEX.test(value)) {
        return 'Debe incluir mayúscula, minúscula, número y carácter especial.'
      }
      return ''
    }

    case 'confirmPassword': {
      if (!value) return 'Confirma tu contraseña.'
      if (value !== allValues.password) return 'Las contraseñas no coinciden.'
      return ''
    }

    case 'rol':
      return value === 'cliente' || value === 'administrador' ? '' : 'Selecciona un tipo de cuenta.'

    case 'claveAdmin': {
      // Solo es obligatoria cuando el usuario elige registrarse como administrador
      if (allValues.rol !== 'administrador') return ''
      if (!value) return 'Ingresa la clave de administrador.'
      return ''
    }

    default:
      return ''
  }
}
