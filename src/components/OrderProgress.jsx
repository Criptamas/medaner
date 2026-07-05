import './OrderProgress.css'

const STEPS = [
  { key: 'pendiente', label: 'Buscando un conductor' },
  { key: 'confirmado', label: 'Pedido confirmado' },
  { key: 'en_camino', label: 'Tu pedido va en camino' },
  { key: 'entregado', label: 'Pedido entregado' },
]

export default function OrderProgress({ estado }) {
  const currentIndex = STEPS.findIndex((step) => step.key === estado)

  return (
    <ol className="order-progress">
      {STEPS.map((step, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex
        const isCurrent = index === currentIndex
        const className = [
          'order-progress__step',
          isDone && 'order-progress__step--done',
          isCurrent && 'order-progress__step--current',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={step.key} className={className}>
            <span className="order-progress__dot" aria-hidden="true" />
            <span className="order-progress__label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
