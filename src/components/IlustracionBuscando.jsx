// Ilustración flat-design 100% inline (sin <img> ni URLs externas: el proyecto
// no tiene Firebase Storage). Representa a un conductor en moto acercándose y,
// al costado, un mini-mapa con la ruta punteada hacia el destino — la idea de
// "estamos buscando quién te lleve". Los colores salen de los tokens --vt-*
// de la paleta oscura de esta feature (heredados del contenedor .viaje-track),
// así la ilustración acompaña al tema sin hardcodear la paleta dos veces.
export default function IlustracionBuscando({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 170"
      role="img"
      aria-label="Un conductor en moto en camino hacia tu destino"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sombra en el piso */}
      <ellipse cx="98" cy="150" rx="82" ry="9" fill="rgba(0, 0, 0, 0.35)" />

      {/* Mini-mapa al costado (arriba a la derecha) con ruta punteada y pin */}
      <rect x="150" y="12" width="78" height="62" rx="10" fill="var(--vt-surface-2)" stroke="var(--vt-border)" />
      <path
        d="M164 64 C 178 46, 198 60, 210 38"
        fill="none"
        stroke="var(--vt-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <circle cx="164" cy="64" r="4" fill="#4C9AFF" />
      {/* Pin del destino */}
      <path d="M203 33 L210 46 L217 33 Z" fill="var(--vt-accent)" />
      <circle cx="210" cy="31" r="8" fill="var(--vt-accent)" />
      <circle cx="210" cy="31" r="3.2" fill="var(--vt-surface-2)" />

      {/* Ruedas de la moto */}
      <g>
        <circle cx="58" cy="128" r="18" fill="var(--vt-bg)" />
        <circle cx="58" cy="128" r="18" fill="none" stroke="var(--vt-text)" strokeWidth="5" />
        <circle cx="58" cy="128" r="5" fill="var(--vt-accent)" />
        <circle cx="150" cy="128" r="18" fill="var(--vt-bg)" />
        <circle cx="150" cy="128" r="18" fill="none" stroke="var(--vt-text)" strokeWidth="5" />
        <circle cx="150" cy="128" r="5" fill="var(--vt-accent)" />
      </g>

      {/* Chasis de la moto */}
      <rect x="58" y="118" width="92" height="9" rx="4" fill="var(--vt-accent)" />
      <rect x="70" y="98" width="9" height="24" fill="var(--vt-accent)" />
      <rect x="56" y="90" width="36" height="12" rx="6" fill="var(--vt-accent)" />
      <rect x="145" y="72" width="9" height="50" rx="4" fill="var(--vt-accent)" />
      <rect x="134" y="68" width="30" height="8" rx="4" fill="var(--vt-accent)" />

      {/* Conductor (cuerpo claro, casco de acento) */}
      <line x1="84" y1="98" x2="98" y2="116" stroke="var(--vt-text)" strokeWidth="12" strokeLinecap="round" />
      <line x1="98" y1="116" x2="118" y2="122" stroke="var(--vt-text)" strokeWidth="10" strokeLinecap="round" />
      <line x1="82" y1="96" x2="126" y2="80" stroke="var(--vt-text)" strokeWidth="20" strokeLinecap="round" />
      <line x1="118" y1="82" x2="150" y2="74" stroke="var(--vt-text)" strokeWidth="9" strokeLinecap="round" />
      <circle cx="132" cy="70" r="13" fill="var(--vt-accent)" />
      <rect x="132" y="64" width="13" height="8" rx="2" fill="var(--vt-bg)" />
    </svg>
  )
}
