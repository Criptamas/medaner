// Mapeo categoría -> emoji para los accesos rápidos de la Home y las cards.
// Las categorías reales viven en Firestore (tiendas/{id}.categoria), texto
// libre por ahora; este helper normaliza (minúsculas, sin acentos) para que
// "Farmacia", "farmacía" o "FARMACIA" caigan en el mismo ícono. Si aparece
// una categoría sin ícono definido, se usa un fallback neutro (🏬).
//
// A escala (más categorías/ciudades) esto debería migrar a un catálogo de
// categorías en Firestore con su propio ícono; por ahora es un mapa liviano.

const ICONOS_POR_CATEGORIA = {
  farmacia: '💊',
  comida: '🍔',
  restaurante: '🍽️',
  comidarapida: '🍟',
  mercado: '🛒',
  supermercado: '🛒',
  abasto: '🥫',
  ferreteria: '🔧',
  bebidas: '🥤',
  licoreria: '🍷',
  panaderia: '🥖',
  reposteria: '🧁',
  carniceria: '🥩',
  fruteria: '🍎',
  verduleria: '🥬',
  ropa: '👕',
  tecnologia: '📱',
  electronica: '🔌',
  belleza: '💄',
  mascotas: '🐾',
  flores: '💐',
  libreria: '📚',
  juguetes: '🧸',
  hogar: '🏠',
}

function normalizarCategoria(categoria) {
  return (categoria ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos (marcas diacríticas)
    .replace(/\s+/g, '') // "comida rápida" -> "comidarapida"
}

export function iconoDeCategoria(categoria) {
  return ICONOS_POR_CATEGORIA[normalizarCategoria(categoria)] ?? '🏬'
}

// Devuelve las categorías distintas presentes en una lista de tiendas,
// preservando el texto original (para mostrarlo) y sin duplicados.
export function categoriasDistintas(tiendas) {
  const vistas = new Set()
  const resultado = []
  for (const tienda of tiendas) {
    const raw = tienda?.categoria?.toString().trim()
    if (!raw) continue
    const clave = normalizarCategoria(raw)
    if (vistas.has(clave)) continue
    vistas.add(clave)
    resultado.push(raw)
  }
  return resultado
}

export { normalizarCategoria }
