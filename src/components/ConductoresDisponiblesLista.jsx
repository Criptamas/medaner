import Avatar from './Avatar'
import './ConductoresDisponiblesLista.css'

// Lista en vivo de conductores disponibles cerca del origen del viaje. Es
// SOLO informativa: el cliente ve quién anda cerca pero no elige ni acepta
// (spec/08 §2) — el matching sigue siendo "ver + difusión", gana el primer
// conductor que acepta desde su propia pantalla. Por eso no hay botones,
// teléfono ni coordenadas exactas: solo lo que ya expone el endpoint.
export default function ConductoresDisponiblesLista({ conductores }) {
  if (conductores.length === 0) {
    return <p className="conductores-lista__vacio">Buscando conductores en tu zona…</p>
  }

  return (
    <ul className="conductores-lista">
      {conductores.map((conductor, index) => (
        // El endpoint no expone id (spec/08 §2, evita filtrar el uid interno
        // de Firestore): la key se arma con los campos visibles + índice. No
        // es 100% estable entre polls si dos conductores empatan en todo,
        // pero el costo es cosmético (un re-mount ocasional de esa tarjeta),
        // nunca un dato incorrecto.
        <li
          key={`${conductor.nombre}-${conductor.distanciaKm}-${conductor.etaMin}-${index}`}
          className="conductores-lista__card"
        >
          <Avatar avatarUrl={conductor.fotoPerfilUrl} nombre={conductor.nombre} size={48} />
          <div className="conductores-lista__info">
            <p className="conductores-lista__nombre">{conductor.nombre || 'Conductor'}</p>
            {/* "puntos" es el sistema de recompensa por carreras baratas
                (spec/09), NO una calificación — la estrella es solo un ícono
                llamativo, no implica "5 estrellas" de rating. */}
            <p className="conductores-lista__puntos">
              <span aria-hidden="true">⭐</span> {conductor.puntos} pts
            </p>
            <p className="conductores-lista__detalle">Está a {conductor.distanciaKm} km</p>
            <p className="conductores-lista__detalle">Llega en {conductor.etaMin} min</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
