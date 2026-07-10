import { useEffect, useRef, useState } from 'react'
import './FotoInputField.css'

// Input de archivo + preview, reutilizable. Se extrae porque SerConductorPage
// necesita el mismo bloque dos veces (foto de placa y selfie) — evita
// duplicar el manejo de object URL (creación/revocación) en cada uso.
// El componente solo conoce el File elegido; no sabe nada de Supabase ni de
// a qué bucket/tabla va, así el padre decide qué hacer con él (mantiene la
// lógica de negocio fuera de un componente de UI).
export default function FotoInputField({ id, label, onChange, required = false, disabled = false }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const inputRef = useRef(null)

  // Libera el object URL anterior cada vez que cambia o al desmontar, para
  // no acumular memoria si el usuario prueba varias fotos antes de enviar.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
    onChange(file)
  }

  function quitarFoto() {
    setPreviewUrl(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="foto-input-field">
      <label className="foto-input-field__label" htmlFor={id}>
        <span>{label}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required={required}
          disabled={disabled}
          className="foto-input-field__input"
        />
      </label>

      {previewUrl && (
        <div className="foto-input-field__preview">
          <img src={previewUrl} alt={`Vista previa — ${label}`} />
          <button
            type="button"
            className="foto-input-field__quitar"
            onClick={quitarFoto}
            disabled={disabled}
          >
            Quitar foto
          </button>
        </div>
      )}
    </div>
  )
}
