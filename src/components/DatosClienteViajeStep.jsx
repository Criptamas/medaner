import './DatosClienteViajeStep.css'

// Controlado desde el orquestador: los valores viven en PedirViajePage para
// que no se pierdan al navegar entre pasos.
export default function DatosClienteViajeStep({
  nombre,
  telefono,
  onNombreChange,
  onTelefonoChange,
  onContinuar,
}) {
  const isValid = nombre.trim() !== '' && telefono.trim() !== ''

  function handleSubmit(event) {
    event.preventDefault()
    if (isValid) onContinuar()
  }

  return (
    <form className="datos-cliente-step" onSubmit={handleSubmit}>
      <p className="datos-cliente-step__prompt">Tus datos</p>

      <label className="datos-cliente-step__field">
        <span>Nombre</span>
        <input
          type="text"
          value={nombre}
          onChange={(event) => onNombreChange(event.target.value)}
          autoComplete="name"
          required
        />
      </label>

      <label className="datos-cliente-step__field">
        <span>Teléfono</span>
        <input
          type="tel"
          value={telefono}
          onChange={(event) => onTelefonoChange(event.target.value)}
          autoComplete="tel"
          required
        />
      </label>

      <button type="submit" disabled={!isValid}>
        Continuar
      </button>
    </form>
  )
}
