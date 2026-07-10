// scripts/migrar-tiendas.js
//
// Migración ÚNICA (correr a mano con `node scripts/migrar-tiendas.js`) del
// catálogo tiendas/productos de Firestore hacia las tablas nuevas de
// Supabase (public.tiendas / public.productos). No es parte de la app: no se
// importa desde src/.
//
// - Additivo/de copia: NUNCA borra ni modifica nada en Firestore.
// - NO hace upsert por nombre: correrlo dos veces sin vaciar antes las
//   tablas de Supabase duplica todo el catálogo.
// - Un registro individual con datos raros no aborta el resto: se loguea el
//   error y se continúa con el siguiente.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Carga de .env propia (deliberadamente NO usa dotenv ni el --env-file
// nativo de Node) ----------------------------------------------------------
// FIREBASE_ADMIN_PRIVATE_KEY en el .env de este proyecto está guardada como
// PEM multilínea CRUDO, sin comillas envolventes. Tanto dotenv como
// `node --env-file` solo soportan continuación multilínea cuando el valor
// está entre comillas; con este archivo, verificado en vivo, ambos truncan
// la clave a solo "-----BEGIN PRIVATE KEY-----" (27 caracteres, sin llegar
// nunca al "END"), lo que rompe la autenticación del Admin SDK con un error
// de PEM inválido. Este parser trata cualquier línea que NO tenga forma de
// NOMBRE_DE_VARIABLE=valor (mayúsculas/dígitos/guion bajo antes del "=")
// como continuación de la variable anterior, así que el bloque PEM se
// reconstruye línea por línea sin depender de comillas. Se exige que el
// nombre sea 100% mayúsculas a propósito: una línea de contenido base64 del
// PEM podría tener casualmente un "=" de padding, pero que esa línea sea
// además 100% mayúsculas/dígitos es estadísticamente descartable.
function cargarEnvLocal(rutaEnv) {
  const lineas = readFileSync(rutaEnv, 'utf-8').split(/\r?\n/)
  const env = {}
  let claveActual = null
  let valorActual = []

  const cerrarClave = () => {
    if (claveActual === null) return
    let valor = valorActual.join('\n')
    // Comillas envolventes de un valor de una sola línea (ej.
    // VITE_SUPABASE_URL="https://..."): se quitan, igual que cualquier
    // parser de .env estándar.
    const envueltoEnComillas =
      valor.length >= 2 &&
      ((valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'")))
    env[claveActual] = envueltoEnComillas ? valor.slice(1, -1) : valor
    claveActual = null
    valorActual = []
  }

  for (const lineaCruda of lineas) {
    const inicioClave = lineaCruda.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)

    if (inicioClave) {
      cerrarClave()
      claveActual = inicioClave[1]
      valorActual = [inicioClave[2]]
      continue
    }

    if (lineaCruda.trim() === '') {
      cerrarClave()
      continue
    }

    if (claveActual !== null) {
      // Continuación del valor multilínea en curso (ej. cuerpo base64 o el
      // "-----END PRIVATE KEY-----" del PEM).
      valorActual.push(lineaCruda)
    }
    // Línea suelta fuera de cualquier valor (comentario, etc.): se ignora.
  }
  cerrarClave()

  return env
}

const env = cargarEnvLocal(join(__dirname, '..', '.env'))

function requerirEnv(nombre) {
  const valor = env[nombre]
  if (!valor) {
    throw new Error(`Falta ${nombre} en .env — no se puede continuar la migración.`)
  }
  return valor
}

// --- Firestore (origen, solo lectura) -------------------------------------
// Mismo patrón de credenciales que api/_lib/firebaseAdmin.js (variables
// FIREBASE_ADMIN_*), sin el guard de "warm start" porque este script corre
// una sola vez y termina, no se reutiliza entre invocaciones.
const firestoreApp = initializeApp({
  credential: cert({
    projectId: requerirEnv('FIREBASE_ADMIN_PROJECT_ID'),
    clientEmail: requerirEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
    // Vercel guarda \n como texto literal en variables de entorno de una
    // sola línea; acá no hace falta (el .env local ya trae saltos de línea
    // reales gracias a cargarEnvLocal), pero se deja por si el formato del
    // .env cambia más adelante a una sola línea escapada.
    privateKey: requerirEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore(firestoreApp)

// --- Supabase (destino) ----------------------------------------------------
// service_role: salta RLS. Es la única forma de insertar en tiendas/productos
// porque esas tablas no tienen policy de insert para anon/authenticated (el
// catálogo es de solo lectura desde el cliente).
const supabase = createClient(
  requerirEnv('VITE_SUPABASE_URL'),
  requerirEnv('SUPABASE_SERVICE_ROLE_KEY'),
)

async function migrarTienda(tiendaDoc, resumen) {
  const tienda = tiendaDoc.data()

  const { data: tiendaInsertada, error: errorTienda } = await supabase
    .from('tiendas')
    .insert({
      nombre: tienda.nombre ?? '',
      categoria: tienda.categoria ?? null,
      descripcion: tienda.descripcion ?? null,
      telefono: tienda.telefono ?? null,
      activa: tienda.activa ?? true,
    })
    .select('id')
    .single()

  if (errorTienda) {
    resumen.tiendasError++
    console.error(
      `[tienda ${tiendaDoc.id}] "${tienda.nombre ?? '(sin nombre)'}" falló al insertar:`,
      errorTienda.message,
    )
    // Sin id nuevo no hay dónde colgar sus productos: se cuentan como
    // fallidos (nunca se intenta insertarlos) y se sigue con la próxima tienda.
    const productosSnap = await tiendaDoc.ref.collection('productos').get()
    resumen.productosError += productosSnap.size
    return
  }

  resumen.tiendasOk++
  await migrarProductosDeTienda(tiendaDoc, tiendaInsertada.id, tienda.nombre, resumen)
}

async function migrarProductosDeTienda(tiendaDoc, nuevoTiendaId, nombreTienda, resumen) {
  const productosSnap = await tiendaDoc.ref.collection('productos').get()

  for (const productoDoc of productosSnap.docs) {
    const producto = productoDoc.data()

    const { error: errorProducto } = await supabase.from('productos').insert({
      tienda_id: nuevoTiendaId,
      nombre: producto.nombre ?? '',
      descripcion: producto.descripcion ?? null,
      precio: producto.precio ?? 0,
      imagen: producto.imagen ?? null,
      disponible: producto.disponible ?? true,
    })

    if (errorProducto) {
      resumen.productosError++
      console.error(
        `  [producto ${productoDoc.id}] "${producto.nombre ?? '(sin nombre)'}" ` +
          `de tienda "${nombreTienda}" falló al insertar:`,
        errorProducto.message,
      )
      continue
    }

    resumen.productosOk++
  }
}

async function migrar() {
  const resumen = { tiendasOk: 0, tiendasError: 0, productosOk: 0, productosError: 0 }

  const tiendasSnap = await db.collection('tiendas').get()
  console.log(`Firestore: ${tiendasSnap.size} tienda(s) encontrada(s). Migrando...\n`)

  for (const tiendaDoc of tiendasSnap.docs) {
    // Secuencial (no Promise.all) a propósito: así el orden de los logs es
    // legible y no se satura la conexión con inserts concurrentes sobre el
    // plan gratuito de Supabase.
    await migrarTienda(tiendaDoc, resumen)
  }

  console.log('\n--- Resumen de la migración ---')
  console.log(`Tiendas:   ${resumen.tiendasOk} migradas, ${resumen.tiendasError} con error`)
  console.log(`Productos: ${resumen.productosOk} migrados, ${resumen.productosError} con error`)

  if (resumen.tiendasError > 0 || resumen.productosError > 0) {
    process.exitCode = 1
  }
}

migrar().catch((err) => {
  console.error('\nLa migración se interrumpió por un error inesperado:', err)
  process.exitCode = 1
})
