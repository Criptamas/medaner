import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Lee UNA VEZ (getDoc, no onSnapshot) configuracion/tarifas: las tarifas no
// necesitan actualizarse en vivo durante una cotización de un solo paso, y
// evita dejar un listener abierto de más. Documento inexistente (posible
// mientras el seed todavía no está publicado) y error de red se tratan igual
// de forma segura: nunca lanzan, siempre devuelven error/tarifas null para
// que CotizacionViajeSheet pueda mostrar un estado de "Reintentar".
export function useTarifas() {
  const [tarifas, setTarifas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)

    getDoc(doc(db, 'configuracion', 'tarifas'))
      .then((snap) => {
        if (cancelado) return
        if (!snap.exists()) {
          setTarifas(null)
          setError(new Error('Tarifas no configuradas todavía'))
          return
        }
        setTarifas(snap.data())
      })
      .catch((err) => {
        if (cancelado) return
        setTarifas(null)
        setError(err)
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [intento])

  // Expuesto para que quien consuma el hook (CotizacionViajeSheet) pueda
  // reintentar la lectura sin desmontar/remontar el componente.
  function reintentar() {
    setIntento((n) => n + 1)
  }

  return { tarifas, loading, error, reintentar }
}
