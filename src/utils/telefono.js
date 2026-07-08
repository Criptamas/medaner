// Normaliza un teléfono venezolano a su forma canónica de 10 dígitos
// (ej: "0412-123.45.67" → "4121234567", "+58 412 1234567" → "4121234567",
// "5804121234567" → "4121234567" — +58 pegado sin quitar el 0 de troncal)
// para poder comparar números sin importar cómo los escribió el cliente.
//
// Es el contrato compartido entre:
//  - la creación de pedidos/viajes (se guarda como clienteTelefonoNormalizado)
//  - el endpoint /api/recuperar-pedidos (busca por ese campo)
// Si se cambia esta lógica, los documentos viejos quedan inconsistentes con
// las búsquedas nuevas — no modificar sin migrar datos. Por eso los cambios
// acá solo deben ACEPTAR formatos que antes se rechazaban (nunca cambiar el
// resultado de un formato que ya normalizaba bien).
export function normalizarTelefono(telefono) {
  if (typeof telefono !== 'string') return null

  const digitos = telefono.replace(/\D/g, '')

  // Prefijo internacional de Venezuela (+58) + número nacional YA sin el 0
  // de troncal (12 dígitos en total, ej: 584121234567) → se acepta tal cual.
  if (digitos.startsWith('58') && digitos.length === 12) {
    return digitos.slice(2)
  }

  // Mismo prefijo +58, pero el número nacional TODAVÍA trae pegado el 0 de
  // troncal (13 dígitos en total, ej: 5804121234567 — pasa cuando alguien
  // copia/pega el "58" delante sin quitar el 0 con el que ya empezaba el
  // número). Quitamos el "58" y dejamos que la rama de abajo resuelva el 0
  // inicial exactamente igual que en el caso nacional.
  const sinCodigoPais =
    digitos.startsWith('58') && digitos.length === 13 && digitos.charAt(2) === '0'
      ? digitos.slice(2)
      : digitos

  // Forma nacional con 0 inicial (0412..., 0269...) → sin el 0.
  // IMPORTANTE: si empieza con 0 pero no tiene exactamente 11 dígitos,
  // es inválido (incompleto o malformado); no procesarlo.
  if (sinCodigoPais.startsWith('0')) {
    if (sinCodigoPais.length === 11) {
      return sinCodigoPais.slice(1)
    }
    return null
  }

  // Un número venezolano válido queda en 10 dígitos (código de área + 7).
  return sinCodigoPais.length === 10 ? sinCodigoPais : null
}

// Arma el link de wa.me para contactar por WhatsApp (cliente ↔ conductor)
// sin exponer el número "crudo" ni depender del formato en que se escribió.
// 58 = código de país de Venezuela; normalizarTelefono ya deja el resto en
// 10 dígitos nacionales, que es justo lo que wa.me espera después del código.
export function construirEnlaceWhatsApp(telefono) {
  const normalizado = normalizarTelefono(telefono)
  if (!normalizado) return null
  return `https://wa.me/58${normalizado}`
}
