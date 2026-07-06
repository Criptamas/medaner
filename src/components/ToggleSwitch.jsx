import './ToggleSwitch.css'

export default function ToggleSwitch({ checked, disabled, onChange, label }) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-switch__track" aria-hidden="true" />
      {label && <span className="toggle-switch__label">{label}</span>}
    </label>
  )
}
