import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useClienteAuth } from '../hooks/useClienteAuth'
import FotoInputField from '../components/FotoInputField'
import StatusMessage from '../components/StatusMessage'
import './SerConductorPage.css'

const MIN_PASSWORD_LENGTH = 6

// Página pública de postulación a conductor. Es página completa (no bottom
// sheet) por el mismo criterio ya usado en /pedir-viaje: formulario largo
// con tres uploads de archivo se lee mejor con su propio scroll que metido
// en un sheet acotado a 85vh.
//
// Flujo (ver spec 13 para el diseño completo): si ya hay una sesión de
// cliente activa, se reusa esa cuenta en vez de crear una nueva — el resto
// del formulario (cédula + 3 fotos) es igual para ambos casos. Se sube al
// bucket privado "conductor-verificacion" y se crea la fila en
// "solicitudes_conductor" que el admin revisa después desde /admin. La
// cuenta se crea/mantiene como tipo_usuario 'cliente': la transición real a
// 'conductor' la hace el backend recién al aprobar la solicitud, nunca este
// formulario. No toca conductores/{uid} de Firestore.
export default function SerConductorPage() {
  const {
    user,
    nombre: nombreSesion,
    telefono: telefonoSesion,
    tipoUsuario,
    loading: authLoading,
  } = useClienteAuth()

  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fotoPlaca, setFotoPlaca] = useState(null)
  const [fotoSelfie, setFotoSelfie] = useState(null)
  const [fotoVehiculo, setFotoVehiculo] = useState(null)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [fase, setFase] = useState('formulario') // 'formulario' | 'confirmar-email' | 'exito'
  // Se guarda apenas hay un usuario asociado a la solicitud — ya sea porque
  // signUp() devolvió sesión activa, o porque se reusó una sesión de cliente
  // existente (ver efecto de reuso más abajo). Sirve para tres cosas: (1)
  // asociar las fotos y la solicitud al usuario, (2) si falla la subida de
  // fotos (paso que SÍ bloquea) y el conductor reintenta, evita llamar a
  // signUp() de nuevo con un email que ya existe — el reintento solo repite
  // subida + insert, y (3) gatea todo el flujo de reuso de sesión.
  const [userId, setUserId] = useState(null)
  // Path ya subido con éxito en un intento anterior (retry tras un fallo
  // parcial: p.ej. la placa subió bien pero la selfie falló). La policy de
  // Storage solo otorga INSERT sobre este bucket (a propósito, ver el SQL
  // semilla) — no hay policy de UPDATE, así que `upsert: true` en el mismo
  // path SIEMPRE es rechazado por RLS con "new row violates row-level
  // security policy", exista o no el archivo. Por eso nunca se reintenta la
  // subida de un archivo que ya se confirmó subido: se guarda su path acá y
  // el reintento lo saltea, subiendo solo lo que falta.
  const [fotoPlacaPath, setFotoPlacaPath] = useState(null)
  const [fotoSelfiePath, setFotoSelfiePath] = useState(null)
  const [fotoVehiculoPath, setFotoVehiculoPath] = useState(null)

  const cuentaYaCreada = userId !== null
  const sesionReusada = Boolean(user) && tipoUsuario === 'cliente'
  const bloqueadoPor =
    user && (tipoUsuario === 'conductor' || tipoUsuario === 'admin') ? tipoUsuario : null
  // Ventana breve en la que ya hay sesión pero el perfil (tipo_usuario)
  // todavía no resolvió: ClienteAuthProvider baja `loading` a false apenas
  // confirma la sesión, sin esperar a que termine `cargarPerfil` (fetch
  // aparte). Tratamos esa ventana como "cargando" para no mostrarle por un
  // instante el formulario completo (con email/password) a alguien que ya
  // tiene cuenta — el mismo parpadeo que el loading de useClienteAuth ya
  // evita.
  const resolviendoPerfil = authLoading || (Boolean(user) && tipoUsuario === null)
  const mostrarNombreSoloLectura = sesionReusada && Boolean(nombreSesion)
  const mostrarTelefonoSoloLectura = sesionReusada && Boolean(telefonoSesion)

  // Reusa la sesión de cliente activa en vez de crear una cuenta nueva (spec
  // 13, "SerConductorPage.jsx reusa sesión existente"). Pre-seedear userId
  // hace que el resto de handleSubmit (el `if (!uid) { signUp… }`) se salte
  // solo, igual que en el flujo de retry tras fallo parcial.
  useEffect(() => {
    if (resolviendoPerfil || userId) return
    if (sesionReusada) {
      setUserId(user.id)
      if (telefonoSesion) setTelefono(telefonoSesion)
    }
  }, [resolviendoPerfil, sesionReusada, user, telefonoSesion, userId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    // La contraseña solo aplica si todavía no hay un usuario asociado (ni
    // recién creado en este intento, ni reusado de una sesión de cliente
    // activa) — en sesión reusada el campo ni siquiera se muestra.
    if (!userId && password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (!fotoPlaca || !fotoSelfie || !fotoVehiculo) {
      setError('Subí las 3 fotos (placa del vehículo, tu selfie y la foto de tu vehículo) para continuar.')
      return
    }

    setEnviando(true)
    try {
      let uid = userId

      if (!uid) {
        const { data, error: errorSignup } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // tipo_usuario: 'cliente' — mientras la solicitud está pendiente
          // la cuenta ES una cuenta cliente normal (spec 13). La transición
          // real a 'conductor' la hace el backend recién en la aprobación.
          options: { data: { nombre: nombre.trim(), tipo_usuario: 'cliente' } },
        })
        if (errorSignup) {
          setError(errorSignup.message || 'No se pudo crear la cuenta.')
          return
        }

        if (!data.session) {
          // Confirmación de email activada en el proyecto: todavía no hay
          // sesión, y sin ella las policies de RLS van a rechazar tanto la
          // subida de fotos como el insert de la solicitud. Cortamos acá.
          setFase('confirmar-email')
          return
        }

        uid = data.user.id
        setUserId(uid)
      }

      // Teléfono: best-effort, corre tanto si la cuenta se acaba de crear
      // como si se reusó una sesión existente — UPDATE idempotente (mismo
      // valor si no cambió), no hace falta trackear si el usuario lo
      // modificó o no.
      if (telefono.trim()) {
        const { error: errorTelefono } = await supabase
          .from('usuarios')
          .update({ telefono: telefono.trim() })
          .eq('id', uid)
        if (errorTelefono) {
          console.error('No se pudo guardar el teléfono del conductor:', errorTelefono)
        }
      }

      // Fotos: a diferencia del avatar opcional del cliente, acá un fallo SÍ
      // bloquea — foto_placa_url/foto_selfie_url son NOT NULL en la tabla,
      // sin las 3 no se puede crear la solicitud. Se guarda el PATH dentro
      // del bucket (no una URL pública: el bucket es privado). Sin
      // `upsert` (ver comentario en fotoPlacaPath/fotoSelfiePath/
      // fotoVehiculoPath) — cada path se sube como máximo una vez por
      // cuenta.
      let pathPlaca = fotoPlacaPath
      if (!pathPlaca) {
        const extPlaca = fotoPlaca.name.split('.').pop()
        pathPlaca = `${uid}/placa.${extPlaca}`
        const { error: errorUploadPlaca } = await supabase.storage
          .from('conductor-verificacion')
          .upload(pathPlaca, fotoPlaca)
        if (errorUploadPlaca) {
          throw new Error('No pudimos subir la foto de la placa. Revisá tu conexión e intentá de nuevo.')
        }
        setFotoPlacaPath(pathPlaca)
      }

      let pathSelfie = fotoSelfiePath
      if (!pathSelfie) {
        const extSelfie = fotoSelfie.name.split('.').pop()
        pathSelfie = `${uid}/selfie.${extSelfie}`
        const { error: errorUploadSelfie } = await supabase.storage
          .from('conductor-verificacion')
          .upload(pathSelfie, fotoSelfie)
        if (errorUploadSelfie) {
          throw new Error('No pudimos subir tu selfie. Revisá tu conexión e intentá de nuevo.')
        }
        setFotoSelfiePath(pathSelfie)
      }

      let pathVehiculo = fotoVehiculoPath
      if (!pathVehiculo) {
        const extVehiculo = fotoVehiculo.name.split('.').pop()
        pathVehiculo = `${uid}/vehiculo.${extVehiculo}`
        const { error: errorUploadVehiculo } = await supabase.storage
          .from('conductor-verificacion')
          .upload(pathVehiculo, fotoVehiculo)
        if (errorUploadVehiculo) {
          throw new Error('No pudimos subir la foto de tu vehículo. Revisá tu conexión e intentá de nuevo.')
        }
        setFotoVehiculoPath(pathVehiculo)
      }

      const { error: errorInsert } = await supabase.from('solicitudes_conductor').insert({
        usuario_id: uid,
        cedula: cedula.trim(),
        foto_placa_url: pathPlaca,
        foto_selfie_url: pathSelfie,
        foto_vehiculo_url: pathVehiculo,
      })
      if (errorInsert) {
        throw new Error('No pudimos registrar tu solicitud. Intentá de nuevo.')
      }

      setFase('exito')
    } catch (err) {
      console.error('Error al enviar la solicitud de conductor:', err)
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="ser-conductor-page">
      <header className="ser-conductor-page__header">
        <Link to="/" className="ser-conductor-page__back" aria-label="Volver al inicio">
          ←
        </Link>
        <span className="ser-conductor-page__header-titulo">Sé conductor</span>
      </header>

      <div className="ser-conductor-page__body">
        {resolviendoPerfil && (
          <div className="ser-conductor-page__resultado">
            <StatusMessage variant="loading" title="Cargando tu cuenta..." />
          </div>
        )}

        {!resolviendoPerfil && bloqueadoPor === 'conductor' && (
          <div className="ser-conductor-page__resultado">
            <StatusMessage
              variant="empty"
              title="Ya tenés una cuenta de conductor"
              description="Esta cuenta ya es parte de nuestro equipo de conductores, no hace falta postularse de nuevo."
            />
            <Link to="/conductor" className="ser-conductor-page__link-inicio">
              Ir a tu panel de conductor
            </Link>
          </div>
        )}

        {!resolviendoPerfil && bloqueadoPor === 'admin' && (
          <div className="ser-conductor-page__resultado">
            <StatusMessage
              variant="empty"
              title="No podés postularte con esta cuenta"
              description="Esta cuenta de administrador no puede registrarse como conductor."
            />
            <Link to="/" className="ser-conductor-page__link-inicio">
              Volver al inicio
            </Link>
          </div>
        )}

        {!resolviendoPerfil && !bloqueadoPor && fase === 'formulario' && (
          <>
            <div className="ser-conductor-page__hero">
              <h1>Sumate como conductor</h1>
              <p>
                Completá tus datos y subí tus fotos. Revisamos tu solicitud y te contactamos por
                WhatsApp para confirmar tu cuenta.
              </p>
            </div>

            <form className="ser-conductor-page__form" onSubmit={handleSubmit}>
              {mostrarNombreSoloLectura ? (
                <p className="ser-conductor-page__dato-sesion">
                  Vas a postularte con la cuenta de <strong>{nombreSesion}</strong>.
                </p>
              ) : (
                <label className="ser-conductor-page__campo">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                    required
                    disabled={cuentaYaCreada}
                  />
                </label>
              )}

              <label className="ser-conductor-page__campo">
                <span>Cédula</span>
                <input
                  type="text"
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value)}
                  placeholder="V-12345678"
                  required
                />
              </label>

              {mostrarTelefonoSoloLectura ? (
                <p className="ser-conductor-page__dato-sesion">
                  Te vamos a contactar por WhatsApp al <strong>{telefonoSesion}</strong>.
                </p>
              ) : (
                <label className="ser-conductor-page__campo">
                  <span>Teléfono</span>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                    placeholder="0412 1234567"
                    autoComplete="tel"
                    required
                    disabled={cuentaYaCreada && !sesionReusada}
                  />
                </label>
              )}

              {!sesionReusada && (
                <>
                  <label className="ser-conductor-page__campo">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      required
                      disabled={cuentaYaCreada}
                    />
                  </label>

                  <label className="ser-conductor-page__campo">
                    <span>Contraseña</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••"
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      disabled={cuentaYaCreada}
                    />
                  </label>
                </>
              )}

              <FotoInputField
                id="foto-placa"
                label="Foto de la placa del vehículo"
                onChange={setFotoPlaca}
                required
                disabled={enviando}
              />

              <FotoInputField
                id="foto-selfie"
                label="Selfie (foto suya)"
                onChange={setFotoSelfie}
                required
                disabled={enviando}
              />

              <FotoInputField
                id="foto-vehiculo"
                label="Foto de tu moto o carro"
                onChange={setFotoVehiculo}
                required
                disabled={enviando}
              />

              {cuentaYaCreada && (
                <p className="ser-conductor-page__aviso">
                  {sesionReusada
                    ? 'Vas a continuar con tu cuenta existente.'
                    : 'Tu cuenta ya fue creada. Solo falta terminar de enviar tu solicitud — probá de nuevo.'}
                </p>
              )}

              {error && (
                <p className="ser-conductor-page__error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="ser-conductor-page__submit" disabled={enviando}>
                {enviando
                  ? 'Enviando...'
                  : sesionReusada
                    ? 'Enviar solicitud'
                    : cuentaYaCreada
                      ? 'Reintentar envío'
                      : 'Enviar solicitud'}
              </button>
            </form>
          </>
        )}

        {fase === 'confirmar-email' && (
          <div className="ser-conductor-page__resultado">
            <StatusMessage
              variant="empty"
              title="Confirmá tu correo"
              description="Te enviamos un correo para confirmar tu cuenta. Revisá tu bandeja de entrada y volvé a intentar el registro cuando lo confirmes."
            />
            <Link to="/" className="ser-conductor-page__link-inicio">
              Volver al inicio
            </Link>
          </div>
        )}

        {fase === 'exito' && (
          <div className="ser-conductor-page__resultado">
            <StatusMessage
              variant="empty"
              title="Tu solicitud fue enviada"
              description="Te vamos a contactar por WhatsApp cuando sea aprobada."
            />
            <Link to="/" className="ser-conductor-page__link-inicio">
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
