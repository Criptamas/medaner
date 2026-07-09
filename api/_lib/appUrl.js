// URL pública de la app, usada para el deep-link de las notificaciones push
// (la pantalla que se abre al tocar la notificación).
//
// Viaja siempre dentro de `data.url` del mensaje FCM, nunca en
// `webpush.fcmOptions.link`: ese campo lo valida FCM y rechaza el mensaje
// ENTERO (no solo ignora el link) si no es HTTPS. Con APP_BASE_URL sin definir
// el link quedaba como "undefined/viaje/abc", y en local como
// "http://localhost:3000/..." — en ambos casos FCM responde INVALID_ARGUMENT y
// no llega ninguna notificación. El payload de datos no tiene esa validación,
// y src/sw.js lee la URL de ahí igual.
export function construirUrlApp(path) {
  const explicita = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')

  // VERCEL_URL la inyecta Vercel en cada deploy (sin protocolo). Sirve de
  // respaldo si APP_BASE_URL quedó sin configurar en el entorno.
  const base = explicita || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (!base) return null
  return `${base}${path}`
}
