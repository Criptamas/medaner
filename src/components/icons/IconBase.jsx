// Base compartida de todo el set de iconos propios de Medaner (ver
// spec/15-*.md: reemplaza emojis nativos por SVG inline, sin depender de
// assets externos tipo undraw.co). Un solo componente centraliza el
// contrato visual (stroke plano, currentColor, tamaño por prop) para que
// cada ícono concreto sea solo su `<path>` — ni un componente reinventa el
// viewBox/stroke, evitando that cada ícono nuevo repita el boilerplate.
//
// `currentColor` en stroke/fill: el color lo decide el CSS del lugar donde
// se usa (heredando `color`), nunca un hex propio del ícono — así todos se
// adaptan a los tokens del tema oscuro (--text-h, --blue, etc.) sin
// hardcodear nada acá.
export default function IconBase({ size = 20, className, children, viewBox = '0 0 24 24', ...rest }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}
