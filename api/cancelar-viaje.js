import { getAdminDb } from './_lib/firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { viajeId } = req.body ?? {}
  if (!viajeId) {
    res.status(400).json({ error: 'Falta viajeId' })
    return
  }

  try {
    const db = getAdminDb()

    // El cliente no tiene sesión de Firebase y las reglas le bloquean escribir
    // en "viajes" — por eso esto va por Admin SDK. Releemos el viaje real en
    // vez de confiar en nada que mande el body más allá del ID.
    const viajeRef = db.collection('viajes').doc(viajeId)
    const viajeSnap = await viajeRef.get()

    if (!viajeSnap.exists) {
      res.status(404).json({ error: 'Viaje no encontrado' })
      return
    }

    const viaje = viajeSnap.data()

    // Solo se puede cancelar mientras nadie lo tomó todavía. Una vez que un
    // conductor lo aceptó (confirmado/en_curso) o ya se completó, cancelar
    // unilateralmente desde el cliente rompería el matching (el conductor
    // podría estar en camino) — a partir de ahí la cancelación necesitaría
    // coordinarse entre ambas partes, no es este endpoint.
    if (viaje.estado !== 'pendiente') {
      res.status(409).json({ error: 'El viaje ya no se puede cancelar' })
      return
    }

    await viajeRef.update({ estado: 'cancelado' })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[cancelar-viaje] error al cancelar el viaje', err)
    res.status(500).json({ error: 'No se pudo cancelar el viaje' })
  }
}
