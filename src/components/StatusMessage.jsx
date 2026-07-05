import './StatusMessage.css'

export default function StatusMessage({ variant = 'empty', title, description }) {
  return (
    <div className={`status-message status-message--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {variant === 'loading' && <div className="status-message__spinner" aria-hidden="true" />}
      <p className="status-message__title">{title}</p>
      {description && <p className="status-message__description">{description}</p>}
    </div>
  )
}
