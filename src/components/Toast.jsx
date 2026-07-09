import { useEffect } from 'react'
import './Toast.css'

const DURACION_MS = 5000

// Toast/snackbar genérico para avisos in-app (ej. mensajes FCM en foreground,
// que no disparan la notificación del sistema operativo). mensaje null o ''
// significa "no mostrar nada" — así el caller controla la visibilidad con su
// propio estado sin necesitar un prop "visible" aparte.
export default function Toast({ mensaje, onCerrar }) {
  useEffect(() => {
    if (!mensaje) return undefined
    const timer = setTimeout(() => {
      onCerrar?.()
    }, DURACION_MS)
    return () => clearTimeout(timer)
  }, [mensaje, onCerrar])

  if (!mensaje) return null

  return (
    <div className="toast" role="status">
      <p className="toast__mensaje">{mensaje}</p>
      {onCerrar && (
        <button type="button" className="toast__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
          ✕
        </button>
      )}
    </div>
  )
}
