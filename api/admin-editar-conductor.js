import { getAdminDb } from './_lib/firebaseAdmin.js'

// Vehículos válidos para el campo "vehiculo" (ver spec/08 §1). Cualquier
// otro valor se rechaza antes de tocar Firestore.
const VEHICULOS_VALIDOS = ['moto', 'carro']

// Campos editables por este endpoint. A propósito es una lista blanca
// separada de firestore.rules: estos campos quedan FUERA de los `hasOnly`
// del cliente (ni el conductor ni el admin autenticado por reglas pueden
// tocarlos) — solo Admin SDK, vía este endpoint, puede escribirlos. Así
// placa/fotos/vehiculo no comparten superficie de escritura con
// "cuotaSemanalPagada" (spec/08 §1, spec/09 §6).
const CAMPOS_EDITABLES = ['placa', 'fotoPerfilUrl', 'motoFotoUrl', 'vehiculo']

// Edita el perfil público de un conductor (foto, placa, foto de la moto,
// tipo de vehículo). Separado de admin-aprobar-conductor.js porque ese
// endpoint solo corre una vez (al aprobar la solicitud); este se usa para
// cargar/corregir estos datos después, las veces que haga falta.
// Sin chequeo de que quien llama es admin de verdad: mismo nivel de
// protección informal que el resto de los endpoints admin-* del repo.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { conductorUid, ...body } = req.body ?? {}
  if (!conductorUid) {
    res.status(400).json({ error: 'Falta conductorUid' })
    return
  }

  if (body.vehiculo !== undefined && !VEHICULOS_VALIDOS.includes(body.vehiculo)) {
    res.status(400).json({ error: "vehiculo debe ser 'moto' o 'carro'" })
    return
  }

  // Solo copiamos al update los campos que realmente vinieron en el body:
  // un PATCH parcial de verdad, no un .set que pisaría con undefined los
  // campos que el caller no mandó (ej. el admin solo cambia la placa, no
  // toda la ficha).
  const updates = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (body[campo] === undefined) continue
    if (typeof body[campo] !== 'string') {
      res.status(400).json({ error: `${campo} debe ser un string` })
      return
    }
    updates[campo] = body[campo]
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No se envió ningún campo para actualizar' })
    return
  }

  try {
    const db = getAdminDb()
    const conductorRef = db.collection('conductores').doc(conductorUid)

    const conductorSnap = await conductorRef.get()
    if (!conductorSnap.exists) {
      res.status(404).json({ error: 'Conductor no encontrado' })
      return
    }

    await conductorRef.update(updates)

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin-editar-conductor] falló el update en Firestore:', err.message)
    res.status(500).json({ error: 'No se pudo actualizar el conductor' })
  }
}
