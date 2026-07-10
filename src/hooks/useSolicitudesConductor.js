import { useCallback, useEffect, useRef, useState } from 'react'

// Mismo patrón que useAllTiendas: fetch simple al montar (no tiempo real) a
// un endpoint serverless con service_role, porque el admin necesita ver TODAS
// las solicitudes (incluidas las de otros usuarios) y las fotos vía URL
// firmada del bucket privado — nada de eso lo puede hacer la ANON key desde
// el navegador. Se expone `refetch` para refrescar la lista después de
// aprobar/rechazar una solicitud sin recargar toda la página.
export function useSolicitudesConductor() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cancelledRef = useRef(false)

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // El endpoint filtra por 'pendiente' si no se le pasa ?estado — acá
      // hace falta también el historial (aprobadas/rechazadas) para la
      // sección colapsada de procesadas, así que se pide todo y se separa
      // en el cliente (AdminPage ya filtra pendientes vs. procesadas).
      const response = await fetch('/api/admin-solicitudes-conductor?estado=todas')
      if (!response.ok) {
        throw new Error(`GET /api/admin-solicitudes-conductor respondió ${response.status}`)
      }
      const data = await response.json()
      if (cancelledRef.current) return
      setSolicitudes(data.solicitudes ?? [])
    } catch (err) {
      if (!cancelledRef.current) setError(err)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    cargarSolicitudes()
    return () => {
      cancelledRef.current = true
    }
  }, [cargarSolicitudes])

  return { solicitudes, loading, error, refetch: cargarSolicitudes }
}
