// Normaliza un teléfono venezolano a su forma canónica de 10 dígitos
// (ej: "0412-123.45.67" → "4121234567", "+58 412 1234567" → "4121234567")
// para poder comparar números sin importar cómo los escribió el cliente.
//
// Es el contrato compartido entre:
//  - la creación de pedidos/viajes (se guarda como clienteTelefonoNormalizado)
//  - el endpoint /api/recuperar-pedidos (busca por ese campo)
// Si se cambia esta lógica, los documentos viejos quedan inconsistentes con
// las búsquedas nuevas — no modificar sin migrar datos.
export function normalizarTelefono(telefono) {
  if (typeof telefono !== 'string') return null

  let digitos = telefono.replace(/\D/g, '')

  // Prefijo internacional de Venezuela (+58) → forma nacional sin 0.
  if (digitos.startsWith('58') && digitos.length === 12) {
    digitos = digitos.slice(2)
  }
  // Forma nacional con 0 inicial (0412..., 0269...) → sin el 0.
  // IMPORTANTE: si empieza con 0 pero no tiene exactamente 11 dígitos,
  // es inválido (incompleto o malformado); no procesarlo.
  else if (digitos.startsWith('0')) {
    if (digitos.length === 11) {
      digitos = digitos.slice(1)
    } else {
      return null
    }
  }

  // Un número venezolano válido queda en 10 dígitos (código de área + 7).
  return digitos.length === 10 ? digitos : null
}
