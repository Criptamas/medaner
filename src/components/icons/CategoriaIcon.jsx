import { iconoDeCategoria } from '../../utils/categorias'
import {
  IconMedicalCross,
  IconUtensils,
  IconCloche,
  IconCart,
  IconDrink,
  IconStorefront,
} from './Icons'

// Traduce la CLAVE devuelta por iconoDeCategoria (util puro, sin JSX) al
// componente SVG concreto. Separado en su propio archivo para no meter React
// en src/utils/categorias.js (utils = lógica pura; components = render).
const ICONO_POR_CLAVE = {
  farmacia: IconMedicalCross,
  comida: IconUtensils,
  restaurante: IconCloche,
  carrito: IconCart,
  bebidas: IconDrink,
  generico: IconStorefront,
}

// Ícono de una categoría de tienda (QuickAccessStrip, TiendaCard). Siempre
// decorativo en los usos actuales (va junto al nombre de la categoría, que ya
// la identifica en texto) — aria-hidden por defecto, no hace falta pasarlo
// desde cada caller.
export default function CategoriaIcon({ categoria, size, className }) {
  const Icono = ICONO_POR_CLAVE[iconoDeCategoria(categoria)] ?? IconStorefront
  return <Icono size={size} className={className} aria-hidden="true" />
}
