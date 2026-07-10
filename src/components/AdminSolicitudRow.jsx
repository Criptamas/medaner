import './AdminSolicitudRow.css'

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

// Fila de una solicitud de conductor en el panel de admin. Solo muestra los
// botones Aprobar/Rechazar cuando la solicitud sigue 'pendiente' — las ya
// procesadas se listan como historial de solo lectura (ver AdminPage, que
// las separa en una sección colapsada aparte).
export default function AdminSolicitudRow({ solicitud, updating, onAprobar, onRechazar }) {
  const esPendiente = solicitud.estado === 'pendiente'
  const fecha = solicitud.creadoEn
    ? new Date(solicitud.creadoEn).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <li className="admin-solicitud-row">
      <div className="admin-solicitud-row__cabecera">
        <h3>{solicitud.nombre || 'Sin nombre'}</h3>
        <span
          className={`admin-solicitud-row__estado admin-solicitud-row__estado--${solicitud.estado}`}
        >
          {ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
        </span>
      </div>

      <dl className="admin-solicitud-row__datos">
        {solicitud.telefono && (
          <div className="admin-solicitud-row__dato">
            <dt>Teléfono</dt>
            <dd>{solicitud.telefono}</dd>
          </div>
        )}
        <div className="admin-solicitud-row__dato">
          <dt>Cédula</dt>
          <dd>{solicitud.cedula}</dd>
        </div>
        {fecha && (
          <div className="admin-solicitud-row__dato">
            <dt>Enviada</dt>
            <dd>{fecha}</dd>
          </div>
        )}
      </dl>

      <div className="admin-solicitud-row__fotos">
        {/* Las URLs ya vienen firmadas (bucket privado) desde el endpoint;
            se abren en pestaña nueva para ver la foto en tamaño completo. */}
        <a
          className="admin-solicitud-row__foto"
          href={solicitud.fotoPlacaUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img src={solicitud.fotoPlacaUrl} alt={`Foto de la placa — ${solicitud.nombre || 'conductor'}`} />
          <span>Placa</span>
        </a>
        <a
          className="admin-solicitud-row__foto"
          href={solicitud.fotoSelfieUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img src={solicitud.fotoSelfieUrl} alt={`Selfie — ${solicitud.nombre || 'conductor'}`} />
          <span>Selfie</span>
        </a>
      </div>

      {esPendiente && (
        <div className="admin-solicitud-row__acciones">
          <button
            type="button"
            className="admin-solicitud-row__aprobar"
            onClick={onAprobar}
            disabled={updating}
          >
            {updating ? 'Procesando...' : 'Aprobar'}
          </button>
          <button
            type="button"
            className="admin-solicitud-row__rechazar"
            onClick={onRechazar}
            disabled={updating}
          >
            {updating ? 'Procesando...' : 'Rechazar'}
          </button>
        </div>
      )}
    </li>
  )
}
