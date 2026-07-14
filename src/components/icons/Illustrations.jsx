// Ilustraciones planas estilo undraw.co (carrocería con volumen, 2-3 tonos de
// sombreado, ventanas/reflejos claros) — a diferencia de Icons.jsx (trazo
// simple de un color, pensado para 16-28px), estas son piezas protagónicas
// grandes: tarjetas de selección de vehículo y fondo de los banners del home.
//
// Origen/licencia: se intentó primero conseguir SVG de licencia abierta
// (unDraw / SVGRepo CC0) vía navegador, pero la búsqueda de undraw.co no
// devolvió resultados utilizables en esta sesión (timeouts de screenshot y el
// buscador con Algolia no renderizó resultados pese a varios intentos) — ver
// spec/15-*.md, sección de esta ronda, para el detalle. Se optó por la
// alternativa explícitamente autorizada: ilustraciones propias dibujadas a
// mano en SVG, en el mismo espíritu undraw (formas planas rellenas, no
// fotografía ni trazo de un solo color) y recoloreadas directo a la paleta de
// marca de Medaner. 100% propias — sin licencia de terceros que respetar, sin
// dependencia de un CDN externo (inline en el repo, como pide CLAUDE.md).
//
// Paleta usada (tokens de src/index.css salvo que se indique lo contrario):
// - var(--yellow) / var(--blue-700): tono principal / tono de sombra de cada
//   "carrocería" (auto, moto, pan de la hamburguesa) — mismo truco en las 3:
//   dos formas superpuestas (la de abajo un poco más grande, tono oscuro;
//   la de arriba tapa casi todo, tono principal) para lograr sombreado sin
//   degradés ni filtros.
// - Vidrios/faros/brillos: blancos o cremas claros (#e8f1f8, #fff6dd) — no
//   hay token para "vidrio de auto", inevitable un hex nuevo puntual.
// - Llantas: grises oscuros neutros (#0c141b, #2e3a47, #4b5563) — mismo
//   criterio, no hay token de "metal/caucho".
// - Comida: verde de lechuga reusa var(--green) (ya es el único acento fuera
//   de la paleta de marca en el proyecto, ver src/index.css); tomate/carne
//   usan tonos realistas nuevos (#c0453f, #7a4b23) inevitables para que se
//   lea como comida de verdad, no como un ícono monocromo.
//
// Cada componente acepta className (control de tamaño/posición vía CSS) y
// cualquier prop extra de <svg> (aria-hidden, style, etc.) — sin width/height
// fijos en el propio SVG a propósito: el viewBox define la proporción interna
// y el caller controla el tamaño final por CSS (mismo contrato que los
// íconos de Icons.jsx, pero pensado para tamaños grandes en vez de 16-28px).

export function IllustrationCar({ className, ...rest }) {
  return (
    <svg
      viewBox="0 0 240 140"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* sombra de contacto en el piso */}
      <ellipse cx="125" cy="124" rx="100" ry="7" fill="rgba(0,0,0,0.32)" />

      {/* Ruedas ANTES que la carrocería a propósito: la carrocería (dibujada
          después) tapa la mitad superior de cada llanta, efecto
          "guardabarros" en vez de un círculo flotando sobre el auto. */}
      <circle cx="62" cy="108" r="17" fill="#0c141b" />
      <circle cx="62" cy="108" r="8" fill="#2e3a47" />
      <circle cx="62" cy="108" r="2.5" fill="var(--yellow)" />
      <circle cx="190" cy="108" r="17" fill="#0c141b" />
      <circle cx="190" cy="108" r="8" fill="#2e3a47" />
      <circle cx="190" cy="108" r="2.5" fill="var(--yellow)" />

      {/* Carrocería: banda inferior más oscura (sombra) + banda superior
          (tono principal) superpuesta. */}
      <rect x="12" y="86" width="216" height="26" rx="13" fill="var(--blue-700)" />
      <rect x="12" y="62" width="216" height="32" rx="16" fill="var(--yellow)" />

      {/* Cabina/techo */}
      <rect x="70" y="30" width="96" height="36" rx="18" fill="var(--yellow)" />

      {/* Vidrios (tono claro) + parante central (B-pillar) entre las 2
          ventanas */}
      <rect x="78" y="36" width="80" height="20" rx="9" fill="#e8f1f8" />
      <rect x="116" y="36" width="5" height="20" fill="var(--blue-700)" />

      {/* Espejo lateral */}
      <rect x="162" y="40" width="10" height="6" rx="2" fill="var(--blue-700)" />

      {/* Línea de puerta */}
      <line x1="118" y1="62" x2="118" y2="110" stroke="var(--blue-700)" strokeWidth="2" opacity="0.55" />

      {/* Faro delantero / calador trasero */}
      <ellipse cx="222" cy="76" rx="6" ry="5" fill="#fff6dd" />
      <ellipse cx="18" cy="76" rx="5" ry="4" fill="#8a6600" />
    </svg>
  )
}

// La moto ya no se dibuja acá: la reemplazó la ilustración que entregó el dueño
// del producto (ver MotoIllustration.jsx). Se re-exporta desde este módulo para
// que los callers (VehiculoSeleccionSheet, Hero) sigan importando de un solo
// lugar. La versión dibujada a mano que vivía acá se descartó: no se leía como
// una moto.
export { IllustrationMoto } from './MotoIllustration'

export function IllustrationFood({ className, ...rest }) {
  return (
    <svg
      viewBox="0 0 200 180"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <ellipse cx="100" cy="168" rx="82" ry="8" fill="rgba(0,0,0,0.3)" />

      {/* Pan de abajo */}
      <rect x="26" y="142" width="148" height="24" rx="12" fill="var(--blue-700)" />

      {/* Carne (marrón realista, sin token equivalente — inevitable para que
          se lea como comida) */}
      <rect x="28" y="122" width="144" height="20" rx="8" fill="#7a4b23" />

      {/* Queso: capa amarilla con "goteo" ondulado entre la carne y la
          lechuga */}
      <path
        d="M32,122 L168,122 L164,112 Q150,117 135,112 Q120,117 105,112 Q90,117 75,112 Q60,117 45,112 Q36,116 32,122 Z"
        fill="var(--yellow)"
      />

      {/* Lechuga: borde ondulado. var(--green) es el único acento fuera de la
          paleta de marca ya establecido en el proyecto (ver src/index.css),
          reusado acá en vez de inventar un verde nuevo. */}
      <path
        d="M24,118 L36,105 L50,118 L64,103 L78,118 L92,104 L106,118 L120,103 L134,118 L148,104 L162,118 L176,118 L176,124 L24,124 Z"
        fill="var(--green)"
      />

      {/* Tomate: asoma en los bordes (rojo realista, sin token equivalente) */}
      <ellipse cx="26" cy="112" rx="7" ry="6" fill="#c0453f" />
      <ellipse cx="174" cy="112" rx="7" ry="6" fill="#c0453f" />

      {/* Pan de arriba: domo con banda de sombra detrás (mismo truco de 2
          formas superpuestas que el auto/la moto) */}
      <path d="M14,112 Q14,42 100,36 Q186,42 186,112 Z" fill="var(--blue-700)" />
      <path d="M18,110 Q18,38 100,32 Q182,38 182,110 Z" fill="var(--yellow)" />

      {/* Brillo */}
      <ellipse cx="66" cy="55" rx="18" ry="10" fill="#ffffff" fillOpacity="0.18" />

      {/* Semillas de ajonjolí */}
      <ellipse cx="70" cy="58" rx="3" ry="1.6" fill="#fff6dd" />
      <ellipse cx="100" cy="48" rx="3" ry="1.6" fill="#fff6dd" />
      <ellipse cx="130" cy="56" rx="3" ry="1.6" fill="#fff6dd" />
      <ellipse cx="55" cy="75" rx="3" ry="1.6" fill="#fff6dd" />
      <ellipse cx="115" cy="70" rx="3" ry="1.6" fill="#fff6dd" />
      <ellipse cx="145" cy="72" rx="3" ry="1.6" fill="#fff6dd" />
    </svg>
  )
}
