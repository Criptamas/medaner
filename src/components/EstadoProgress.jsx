import './EstadoProgress.css'

// Indicador visual de progreso reutilizable: recibe la lista de pasos
// (cada uno { key, label }) y el estado actual. Lo usan tanto el seguimiento
// de pedidos como el de viajes, que tienen estados distintos.
export default function EstadoProgress({ estado, steps }) {
  const currentIndex = steps.findIndex((step) => step.key === estado)

  return (
    <ol className="estado-progress">
      {steps.map((step, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        const className = [
          'estado-progress__step',
          isDone && 'estado-progress__step--done',
          isCurrent && 'estado-progress__step--current',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={step.key} className={className}>
            <span className="estado-progress__dot" aria-hidden="true" />
            <span className="estado-progress__label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
