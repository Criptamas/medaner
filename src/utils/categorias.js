// Mapeo categoría -> CLAVE de ícono (no el ícono en sí: este archivo es un
// util puro sin JSX/React, ver src/components/icons/CategoriaIcon.jsx que
// traduce la clave a un componente SVG). Las categorías reales viven en
// Firestore (tiendas/{id}.categoria), texto libre por ahora; este helper
// normaliza (minúsculas, sin acentos) para que "Farmacia", "farmacía" o
// "FARMACIA" caigan en la misma clave.
//
// Antes esto devolvía un emoji directo; se reemplazó por el set de iconos
// propios (spec/15-*.md). Solo 5 categorías tienen ícono dedicado (las que el
// dueño del producto priorizó: comida, restaurante, mercado/supermercado,
// farmacia, bebidas) — el resto cae en 'generico' (ver spec para la lista
// completa y el porqué de no ilustrar las ~20).
//
// A escala (más categorías/ciudades) esto debería migrar a un catálogo de
// categorías en Firestore con su propio ícono; por ahora es un mapa liviano.

const ICONOS_POR_CATEGORIA = {
  farmacia: 'farmacia',
  comida: 'comida',
  restaurante: 'restaurante',
  mercado: 'carrito',
  supermercado: 'carrito',
  bebidas: 'bebidas',
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

// Devuelve la CLAVE de ícono para una categoría (no el ícono en sí, ver
// comentario arriba). 'generico' es el fallback neutro para cualquier
// categoría sin ícono dedicado.
export function iconoDeCategoria(categoria) {
  return ICONOS_POR_CATEGORIA[normalizarCategoria(categoria)] ?? 'generico'
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
