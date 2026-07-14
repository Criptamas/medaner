import IconBase from './IconBase'

// Set de iconos propios de Medaner: estilo plano/geométrico simple, un solo
// color (currentColor), pensados para reemplazar los emojis nativos que
// representaban objetos/conceptos (ver spec/15-*.md para el detalle de qué
// se reemplazó y por qué). NO son ilustraciones detalladas — a propósito,
// para que se lean bien a 18-28px y no compitan con la tipografía.
//
// Cada componente acepta las props normales de un <svg> (className, size,
// aria-hidden, aria-label, role...) vía IconBase, así el caller decide su
// propio contrato de accesibilidad (decorativo vs. único contenido
// informativo) en vez de que el ícono lo asuma.

export function IconCar(props) {
  return (
    <IconBase {...props}>
      <path d="M4 16.5V11a2 2 0 0 1 1.2-1.8l1.6-3A2 2 0 0 1 8.6 5h6.8a2 2 0 0 1 1.8 1.2l1.6 3A2 2 0 0 1 20 11v5.5" />
      <path d="M4 15h16" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </IconBase>
  )
}

export function IconMoto(props) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="17.5" r="2.2" />
      <circle cx="18" cy="17.5" r="2.2" />
      <path d="M8 17.5h4.5l1.8-4.2H17" />
      <path d="M13 13.3l1.6-3.3h2.4" />
      <path d="M5.5 14.5L8 11h3" />
    </IconBase>
  )
}

// "Comprar" (hero) / bolsa de compras.
export function IconShoppingBag(props) {
  return (
    <IconBase {...props}>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </IconBase>
  )
}

// Carrito (CartIcon del header de tienda; categorías mercado/supermercado).
export function IconCart(props) {
  return (
    <IconBase {...props}>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6" />
      <circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

// Casa (favorita "Hogar"; categoría "hogar" cae en genérico, ver spec).
export function IconHome(props) {
  return (
    <IconBase {...props}>
      <path d="M4 11.5L12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9" />
    </IconBase>
  )
}

// Maletín (favorita "Trabajo").
export function IconBriefcase(props) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="7.5" width="17" height="11" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 12.5h17" />
    </IconBase>
  )
}

// Birrete (favorita "Universidad").
export function IconGraduationCap(props) {
  return (
    <IconBase {...props}>
      <path d="M12 4L2 9l10 5 10-5-10-5z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M20 9v6" />
    </IconBase>
  )
}

// Corazón (favorita "Personalizado").
export function IconHeart(props) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-7-4.4-9.3-8.8C1.4 8.4 3 5 6.3 5c2 0 3.3 1.1 3.7 2 .4-.9 1.7-2 3.7-2 3.3 0 4.9 3.4 3.6 6.2C19 15.6 12 20 12 20z" />
    </IconBase>
  )
}

// Efectivo (Footer "Efectivo").
export function IconCash(props) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.6" />
      <circle cx="12" cy="12" r="2.6" />
    </IconBase>
  )
}

// Teléfono (Footer "Pago móvil"; categoría "tecnologia" cae en genérico).
export function IconPhone(props) {
  return (
    <IconBase {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 19h2" />
    </IconBase>
  )
}

// Transferencia (Footer "Zelle" — genérico a propósito, NO el logo de Zelle:
// es una marca de terceros, el texto "Zelle" ya identifica el método).
export function IconTransfer(props) {
  return (
    <IconBase {...props}>
      <path d="M4 8h13" />
      <path d="M14 4l3 4-3 4" />
      <path d="M20 16H7" />
      <path d="M10 20l-3-4 3-4" />
    </IconBase>
  )
}

// Cruz médica (categoría "farmacia").
export function IconMedicalCross(props) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </IconBase>
  )
}

// Cubiertos (categoría "comida", ver spec para por qué comidarapida la
// reusa también).
export function IconUtensils(props) {
  return (
    <IconBase {...props}>
      <path d="M8 3v6M8 3c-1 0-1 2.2 0 3.2M8 3c1 0 1 2.2 0 3.2M8 9v12" />
      <path d="M16 3c0 3.5-2 5-2 8v9" />
    </IconBase>
  )
}

// Fuente con tapa (categoría "restaurante").
export function IconCloche(props) {
  return (
    <IconBase {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M3 15h18" />
      <path d="M12 7V4" />
      <circle cx="12" cy="3.3" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

// Copa/bebida (categoría "bebidas"; "licoreria" la reusa, ver spec).
export function IconDrink(props) {
  return (
    <IconBase {...props}>
      <path d="M8 3h8l-1.2 8.5a3 3 0 0 1-3 2.5h-.6a3 3 0 0 1-3-2.5L8 3z" />
      <path d="M12 14v6" />
      <path d="M9 20h6" />
      <path d="M9 6h6" />
    </IconBase>
  )
}

// Vitrina/local genérico: fallback neutro para categorías sin ícono propio
// (ver lista completa en spec/15-*.md).
export function IconStorefront(props) {
  return (
    <IconBase {...props}>
      <path d="M3.5 9.5l1-4.5a1.5 1.5 0 0 1 1.5-1.2h12a1.5 1.5 0 0 1 1.5 1.2l1 4.5" />
      <path d="M3.5 9.5a2.3 2.3 0 0 0 4.4 1.1M7.9 10.6a2.3 2.3 0 0 0 4.4 0M12.3 10.6a2.3 2.3 0 0 0 4.4 0M16.7 10.6a2.3 2.3 0 0 0 4.4-1.1" />
      <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <path d="M10 20v-4a2 2 0 0 1 4 0v4" />
    </IconBase>
  )
}

// Brújula (QuickAccessStrip, ítem "Todas" — explorar todas las categorías).
export function IconCompass(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.3 8.7l-2 5-5 2 2-5 5-2z" />
    </IconBase>
  )
}
