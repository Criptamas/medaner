// Mapa temporal de UID de Firebase Auth → nombre para mostrar en la UI.
//
// Esto es un PALIATIVO hasta que exista un sistema de roles/perfiles real
// (todavía no hay colección de usuarios ni claims por rol). Por ahora solo
// cubre al personal interno con acceso a paneles protegidos (admin).
//
// Los conductores NO van en este mapa: su nombre vive (o vivirá) en el
// campo `nombre` del propio doc en `conductores/{uid}` y se resuelve leyendo
// ese doc (ver useConductorPropio), no hardcodeado acá.
export const NOMBRES_POR_UID = {
  y1AyjaLn7xeL1mfAiDTNu7nNhfV2: 'Juan Rojas', // admin
}

// Devuelve el nombre mapeado para un UID de personal interno, o null si no
// hay ninguno (ej. conductores, o un UID todavía no mapeado).
export function resolverNombrePorUid(uid) {
  return NOMBRES_POR_UID[uid] ?? null
}
