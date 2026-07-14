import { IconHome, IconBriefcase, IconGraduationCap, IconHeart } from './Icons'

// Ícono por tipo de dirección favorita (Hogar/Trabajo/Universidad/
// Personalizado). Antes vivía como un objeto `ICONOS_TITULO` (emoji)
// DUPLICADO en DireccionesFavoritasList.jsx y FavoritaForm.jsx — se
// consolida acá (spec/15-*.md) para tener una sola fuente de verdad.
//
// OJO: FavoritaForm.jsx NO puede usar este componente para las <option> de su
// <select> — un <option> nativo solo puede mostrar texto, cualquier elemento
// hijo (incluido un <svg>) se ignora en el render. Ese archivo dejó las
// opciones en texto plano (sin ícono ni emoji) por esa limitación de
// plataforma, no por descuido; el ícono sigue existiendo para este mismo
// concepto en DireccionesFavoritasList (tarjetas custom, no <select>).
const ICONO_POR_TITULO = {
  Hogar: IconHome,
  Trabajo: IconBriefcase,
  Universidad: IconGraduationCap,
  Personalizado: IconHeart,
}

export default function FavoritaTituloIcon({ titulo, size, className }) {
  const Icono = ICONO_POR_TITULO[titulo] ?? IconHeart
  return <Icono size={size} className={className} aria-hidden="true" />
}
