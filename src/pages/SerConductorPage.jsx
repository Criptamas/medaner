import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import FotoInputField from '../components/FotoInputField'
import StatusMessage from '../components/StatusMessage'
import './SerConductorPage.css'

const MIN_PASSWORD_LENGTH = 6

// Página pública de postulación a conductor. Es página completa (no bottom
// sheet) por el mismo criterio ya usado en /pedir-viaje: formulario largo
// con dos uploads de archivo se lee mejor con su propio scroll que metido en
// un sheet acotado a 85vh.
//
// Flujo: crea la cuenta con Supabase Auth (tipo_usuario: 'conductor'), sube
// las 2 fotos requeridas al bucket privado "conductor-verificacion" y crea
// la fila en "solicitudes_conductor" que el admin revisa después desde
// /admin (pestaña "Solicitudes"). No toca conductores/{uid} de Firestore —
// ese doc lo sigue creando el admin a mano tras aprobar (ver flujo en
// AdminPage), este formulario solo arma la solicitud en Supabase.
export default function SerConductorPage() {
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fotoPlaca, setFotoPlaca] = useState(null)
  const [fotoSelfie, setFotoSelfie] = useState(null)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [fase, setFase] = useState('formulario') // 'formulario' | 'confirmar-email' | 'exito'
  // Se guarda apenas signUp devuelve sesión activa. Sirve para dos cosas: (1)
  // asociar las fotos y la solicitud al usuario recién creado, y (2) si falla
  // la subida de fotos (paso que SÍ bloquea) y el conductor reintenta, evita
  // llamar a signUp() de nuevo con un email que ya existe — el reintento solo
  // repite subida + insert, no la creación de cuenta.
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

  const cuentaYaCreada = userId !== null

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (!fotoPlaca || !fotoSelfie) {
      setError('Subí las dos fotos (placa del vehículo y tu selfie) para continuar.')
      return
    }

    setEnviando(true)
    try {
      let uid = userId

      if (!uid) {
        const { data, error: errorSignup } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nombre: nombre.trim(), tipo_usuario: 'conductor' } },
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

        // Teléfono: best-effort, mismo patrón que ya usa el signup de
        // clientes (ClienteAuthSheet) — la cuenta y la sesión ya existen, un
        // fallo acá no debe bloquear el resto de la solicitud.
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
      // sin ambas no se puede crear la solicitud. Se guarda el PATH dentro
      // del bucket (no una URL pública: el bucket es privado). Sin
      // `upsert` (ver comentario en fotoPlacaPath/fotoSelfiePath) — cada
      // path se sube como máximo una vez por cuenta.
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

      const { error: errorInsert } = await supabase.from('solicitudes_conductor').insert({
        usuario_id: uid,
        cedula: cedula.trim(),
        foto_placa_url: pathPlaca,
        foto_selfie_url: pathSelfie,
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
        {fase === 'formulario' && (
          <>
            <div className="ser-conductor-page__hero">
              <h1>Sumate como conductor</h1>
              <p>
                Completá tus datos y subí tus fotos. Revisamos tu solicitud y te contactamos por
                WhatsApp para confirmar tu cuenta.
              </p>
            </div>

            <form className="ser-conductor-page__form" onSubmit={handleSubmit}>
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

              <label className="ser-conductor-page__campo">
                <span>Teléfono</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="0412 1234567"
                  autoComplete="tel"
                  required
                  disabled={cuentaYaCreada}
                />
              </label>

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

              {cuentaYaCreada && (
                <p className="ser-conductor-page__aviso">
                  Tu cuenta ya fue creada. Solo falta terminar de enviar tu solicitud — probá de
                  nuevo.
                </p>
              )}

              {error && (
                <p className="ser-conductor-page__error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="ser-conductor-page__submit" disabled={enviando}>
                {enviando ? 'Enviando...' : cuentaYaCreada ? 'Reintentar envío' : 'Enviar solicitud'}
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
