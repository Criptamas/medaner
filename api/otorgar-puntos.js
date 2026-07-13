import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './_lib/firebaseAdmin.js'
import { getConfigPuntos, puntosSegunTramos } from './_lib/configPuntos.js'
import { fechaHoyISO, semanaISOActual } from './_lib/semana.js'

// Otorga puntos a un conductor por completar una carrera barata (spec/09
// §2). Endpoint aparte de notificar-cambio-estado.js a propósito: dominios
// distintos (ese notifica, este mueve un contador de negocio) y este
// necesita una transacción, el otro no.
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

  const db = getAdminDb()

  try {
    // No confiamos en nada del cliente más allá del ID: releemos el viaje
    // real con Admin SDK. El caller típico es un fire-and-forget disparado
    // desde advanceViajeStatus justo después de marcar "completado" (el
    // updateDoc del cliente ya resolvió, así que acá el estado ya está
    // actualizado) — pero igual nadie puede forzar puntos mandando un
    // viajeId de un viaje todavía pendiente.
    const viajeSnap = await db.collection('viajes').doc(viajeId).get()
    if (!viajeSnap.exists) {
      res.status(404).json({ error: 'Viaje no encontrado' })
      return
    }

    const viaje = viajeSnap.data()

    // No es un error del caller (advanceViajeStatus solo dispara esto en
    // "completado", pero un reintento tardío o un viajeId de otro estado no
    // debe otorgar nada ni romper con un 4xx): responde el mismo shape que
    // "carrera sin tramo", 0 otorgados.
    if (viaje.estado !== 'completado' || !viaje.conductorId) {
      res.status(200).json({ ok: true, otorgados: 0 })
      return
    }

    const conductorRef = db.collection('conductores').doc(viaje.conductorId)
    const ledgerRef = conductorRef.collection('puntosHistorial').doc(viajeId)

    const { tramos, topeDiario } = await getConfigPuntos(db)
    const semanaActual = semanaISOActual()
    const hoy = fechaHoyISO()

    const resultado = await db.runTransaction(async (tx) => {
      // Todas las lecturas antes que cualquier escritura (regla de
      // Firestore para transacciones): el ledger decide idempotencia, el
      // doc del conductor trae los contadores a resetear/sumar.
      const [ledgerSnap, conductorSnap] = await Promise.all([tx.get(ledgerRef), tx.get(conductorRef)])

      // Idempotente por viajeId: un reintento del fire-and-forget (red
      // inestable, doble invocación) no debe duplicar puntos.
      if (ledgerSnap.exists) return { yaOtorgado: true }

      // No debería pasar (conductorId sale de un viaje ya asignado), pero si
      // el doc del conductor fue borrado entre medio, no hay a quién sumarle
      // nada.
      if (!conductorSnap.exists) return { otorgados: 0 }

      const conductor = conductorSnap.data()

      // Reset perezoso semanal: si "puntos" quedó de una semana ISO anterior,
      // arranca de 0 en vez de arrastrar el acumulado viejo (spec/09 §3).
      const base = conductor.semanaPuntos === semanaActual ? (conductor.puntos ?? 0) : 0
      // Mismo reset pero diario, para el tope anti-abuso.
      const hoyPrev = conductor.fechaPuntosHoy === hoy ? (conductor.puntosHoy ?? 0) : 0

      const ganados = Math.min(puntosSegunTramos(viaje.precioFinal, tramos), Math.max(0, topeDiario - hoyPrev))

      tx.update(conductorRef, {
        puntos: base + ganados,
        semanaPuntos: semanaActual,
        puntosHoy: hoyPrev + ganados,
        fechaPuntosHoy: hoy,
      })
      // Ledger = idempotencia futura + auditoría (spec/09 §5). Se escribe
      // aunque "ganados" sea 0 (tope diario alcanzado): así un reintento con
      // el mismo viajeId sigue siendo detectado como "ya procesado" en vez
      // de recalcular en cada llamada.
      tx.set(ledgerRef, {
        puntos: ganados,
        precio: viaje.precioFinal,
        fecha: FieldValue.serverTimestamp(),
      })

      return { otorgados: ganados }
    })

    res.status(200).json({ ok: true, ...resultado })
  } catch (err) {
    console.error('[otorgar-puntos] falló el otorgamiento para el viaje', viajeId, err.message)
    res.status(500).json({ error: 'No se pudieron otorgar los puntos' })
  }
}
