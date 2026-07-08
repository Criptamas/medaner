import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { agregarPedidoActivo } from '../utils/seguimientoLocal'
import { normalizarTelefono } from '../utils/telefono'

// Arma el texto final que ve el conductor: la referencia que escribe el
// cliente (calle/punto conocido — lo único que el geocoder no puede dar en
// Venezuela, ver CLAUDE.md) + el municipio/estado que sí resuelve Mapbox.
// Si falta una de las dos partes, se usa la que haya (nunca queda vacío
// si al menos una de las dos existe).
function combinarDireccion(referencia, nombreGeocodificado) {
  const ref = (referencia ?? '').trim()
  const auto = (nombreGeocodificado ?? '').trim()
  if (ref && auto) return `${ref} — ${auto}`
  return ref || auto
}

// Crea un documento en "viajes". total arranca en 0 y conductorId vacío:
// la tarifa se acuerda con el conductor y este se asigna al aceptar el viaje.
export function useCreateViaje() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function createViaje({
    tipoVehiculo,
    origen,
    destino,
    clienteNombre,
    clienteTelefono,
    metodoPago,
  }) {
    setSubmitting(true)
    setError(null)
    try {
      const docRef = await addDoc(collection(db, 'viajes'), {
        clienteNombre,
        clienteTelefono,
        // Clave de búsqueda que usa /api/recuperar-pedidos para encontrar
        // viajes por teléfono sin depender del formato en que lo escribió
        // el cliente. Si no es un teléfono válido guardamos '' en vez de
        // bloquear la creación del viaje (ver src/utils/telefono.js).
        clienteTelefonoNormalizado: normalizarTelefono(clienteTelefono) ?? '',
        // Coordenadas: siguen siendo la fuente de verdad para el mapa y el
        // matching por proximidad con conductores (api/notificar-viaje.js).
        origen: { lat: origen.lat, lng: origen.lng },
        destino: { lat: destino.lat, lng: destino.lng },
        // origenNombre/destinoNombre: texto final legible que se muestra al
        // conductor, en la notificación push y en el seguimiento del cliente
        // (los 4 componentes que lo leen no cambian, siguen leyendo este
        // campo tal cual). Combina la referencia manual que escribe el
        // cliente (calle/punto conocido) con el municipio/estado que resuelve
        // Mapbox por geocoding inverso (src/utils/geocode.js) — Mapbox no
        // tiene datos de calle/POI para esta zona de Venezuela, así que la
        // referencia manual es la única forma de dar una ubicación útil.
        // origenReferencia/destinoReferencia: el texto manual crudo, guardado
        // aparte (no solo mezclado en el string de arriba) para poder
        // mostrarlo/editarlo/buscarlo después sin tener que parsear el
        // combinado. Cualquiera de los cuatro puede llegar vacío si falló el
        // geocoding o es un caso legacy; nunca bloqueamos la creación del
        // viaje por eso.
        origenNombre: combinarDireccion(origen.referencia, origen.nombre),
        origenReferencia: (origen.referencia ?? '').trim(),
        destinoNombre: combinarDireccion(destino.referencia, destino.nombre),
        destinoReferencia: (destino.referencia ?? '').trim(),
        tipoVehiculo,
        metodoPago,
        estado: 'pendiente',
        conductorId: '',
        total: 0,
        fechaCreacion: serverTimestamp(),
      })

      // Sin cuentas de cliente: este navegador queda como "dueño" del
      // viaje para poder mostrarlo en "Mis pedidos recientes".
      agregarPedidoActivo({ id: docRef.id, tipo: 'viaje' })

      // Best-effort: si esta llamada falla (conexión inestable justo en ese
      // instante), el viaje ya quedó creado en Firestore y sigue visible
      // para los conductores en la lista de respaldo "Viajes disponibles".
      fetch('/api/notificar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId: docRef.id }),
      }).catch(() => {})

      return docRef.id
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { createViaje, submitting, error }
}
