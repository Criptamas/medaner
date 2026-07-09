// Cálculo del precio estimado de un viaje a partir de la distancia real
// (Mapbox Directions) y las tarifas configurables que vienen de
// configuracion/tarifas en Firestore (ver src/hooks/useTarifas.js). Funciones
// puras a propósito: sin fetch ni estado, fáciles de verificar a mano.

// Redondea hacia arriba al múltiplo de `incremento` más cercano. Sin esta
// corrección, errores de punto flotante (ej. 0.5 + 7.8*0.3 puede dar
// 2.8400000000000003 en vez de 2.84) empujan `pasos` justo por encima de un
// entero y Math.ceil sube un escalón de más (3.00 → 3.50 en el ejemplo).
// Se corrige en dos puntos: redondeando el valor de entrada a 2 decimales
// (los precios siempre se manejan en centavos) y restando un epsilon antes
// del ceil final.
function redondearArribaIncremento(valor, incremento) {
  if (!incremento || incremento <= 0) return Math.round(valor * 100) / 100

  const valorCorregido = Math.round(valor * 100) / 100
  const pasos = Math.ceil(valorCorregido / incremento - 1e-9)
  return Math.round(pasos * incremento * 100) / 100
}

// tarifas = { tarifaBaseMoto, tarifaPorKmMoto, tarifaBaseCarro,
// tarifaPorKmCarro, tarifaMinima, incrementoAjuste } — documento
// configuracion/tarifas. distanciaKm viene de getRouteDistance (distancia de
// manejo real, no línea recta).
export function calcularPrecioBase({ tipoVehiculo, distanciaKm, tarifas }) {
  const precioSinPiso =
    tipoVehiculo === 'moto'
      ? tarifas.tarifaBaseMoto + distanciaKm * tarifas.tarifaPorKmMoto
      : tarifas.tarifaBaseCarro + distanciaKm * tarifas.tarifaPorKmCarro

  const precioConPiso = Math.max(precioSinPiso, tarifas.tarifaMinima)

  return redondearArribaIncremento(precioConPiso, tarifas.incrementoAjuste)
}

// Formateador propio y simple para USD. NO reusa priceFormatter de
// pedidoLabels.js: ese está configurado en es-AR/ARS (bug ya conocido y
// pendiente de arreglar aparte), y todos los precios de esta feature son en
// dólares. Defensivo con valores ausentes/NaN para que un dato legacy sin
// precioFinal nunca renderice "$undefined" o "$NaN".
export function formatUSD(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return `$${numero.toFixed(2)}`
}
