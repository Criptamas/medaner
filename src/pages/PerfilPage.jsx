import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useClienteAuth } from '../hooks/useClienteAuth'
import Avatar from '../components/Avatar'
import FotoInputField from '../components/FotoInputField'
import './PerfilPage.css'

const MIN_PASSWORD_LENGTH = 6

// Página de perfil del CLIENTE (Supabase Auth). Ver/editar nombre, teléfono,
// foto, email y contraseña, más cerrar sesión. La ruta está protegida
// (RutaClienteProtegida en App.jsx): acá siempre hay sesión, pero igual somos
// defensivos si `user` no llegó todavía.
//
// Se separan en 3 acciones independientes (datos, foto, contraseña) a
// propósito: cada una puede fallar/confirmarse por su cuenta sin arrastrar a
// las otras (ej. cambiar el email dispara confirmación por correo en Supabase,
// no tiene sentido bloquear el guardado del nombre por eso).
export default function PerfilPage() {
  const { user, nombre, telefono, avatarUrl, refetchPerfil } = useClienteAuth()
  const navigate = useNavigate()

  const [nombreInput, setNombreInput] = useState(nombre ?? '')
  const [telefonoInput, setTelefonoInput] = useState(telefono ?? '')
  const [emailInput, setEmailInput] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [fotoNueva, setFotoNueva] = useState(null)

  // El perfil (nombre/telefono) llega async DESPUÉS de que loading pasa a
  // false, así que los inputs iniciales podrían montarse vacíos. Los
  // sincronizamos cuando el dato llega o cambia (tras un refetch). No pisa lo
  // que el usuario escribe: durante el tipeo estos valores de contexto no
  // cambian, solo cambian al cargar o al guardar.
  useEffect(() => {
    setNombreInput(nombre ?? '')
  }, [nombre])
  useEffect(() => {
    setTelefonoInput(telefono ?? '')
  }, [telefono])
  useEffect(() => {
    setEmailInput(user?.email ?? '')
  }, [user?.email])

  const [msgDatos, setMsgDatos] = useState(null) // { tipo: 'ok'|'error', texto }
  const [msgFoto, setMsgFoto] = useState(null)
  const [msgPass, setMsgPass] = useState(null)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [guardandoFoto, setGuardandoFoto] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)

  // --- Guardar nombre / teléfono / email ---
  async function handleGuardarDatos(e) {
    e.preventDefault()
    setMsgDatos(null)

    if (!nombreInput.trim()) {
      setMsgDatos({ tipo: 'error', texto: 'El nombre no puede quedar vacío.' })
      return
    }

    setGuardandoDatos(true)
    try {
      // Nombre/teléfono viven en la tabla usuarios (perfil), el email en
      // auth.users (Supabase Auth) — dos updates distintos.
      const { error: errorPerfil } = await supabase
        .from('usuarios')
        .update({ nombre: nombreInput.trim(), telefono: telefonoInput.trim() || null })
        .eq('id', user.id)
      if (errorPerfil) throw errorPerfil

      let avisoEmail = ''
      if (emailInput.trim() && emailInput.trim() !== user.email) {
        const { error: errorEmail } = await supabase.auth.updateUser({
          email: emailInput.trim(),
        })
        if (errorEmail) throw errorEmail
        // Supabase manda un correo de confirmación al email nuevo; el cambio
        // no se aplica hasta que el usuario lo confirme desde ahí.
        avisoEmail = ' Te enviamos un correo para confirmar tu nuevo email.'
      }

      await refetchPerfil()
      setMsgDatos({ tipo: 'ok', texto: `Datos guardados.${avisoEmail}` })
    } catch (error) {
      console.error('No se pudieron guardar los datos del perfil:', error)
      setMsgDatos({ tipo: 'error', texto: 'No se pudieron guardar los cambios. Intenta de nuevo.' })
    } finally {
      setGuardandoDatos(false)
    }
  }

  // --- Guardar foto de perfil (mismo patrón que el signup en ClienteAuthSheet) ---
  async function handleGuardarFoto() {
    if (!fotoNueva) return
    setMsgFoto(null)
    setGuardandoFoto(true)
    try {
      const ext = fotoNueva.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, fotoNueva, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-busting: el path es fijo ({uid}/avatar.ext), así que sin el ?v=
      // el navegador seguiría mostrando la foto vieja cacheada tras cambiarla.
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (updateError) throw updateError

      await refetchPerfil()
      setFotoNueva(null)
      setMsgFoto({ tipo: 'ok', texto: 'Foto actualizada.' })
    } catch (error) {
      console.error('No se pudo actualizar la foto de perfil:', error)
      setMsgFoto({ tipo: 'error', texto: 'No se pudo subir la foto. Intenta de nuevo.' })
    } finally {
      setGuardandoFoto(false)
    }
  }

  // --- Cambiar contraseña ---
  async function handleCambiarPassword(e) {
    e.preventDefault()
    setMsgPass(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMsgPass({ tipo: 'error', texto: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` })
      return
    }
    if (password !== password2) {
      setMsgPass({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    setGuardandoPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setPassword2('')
      setMsgPass({ tipo: 'ok', texto: 'Contraseña actualizada.' })
    } catch (error) {
      console.error('No se pudo cambiar la contraseña:', error)
      setMsgPass({ tipo: 'error', texto: 'No se pudo cambiar la contraseña. Intenta de nuevo.' })
    } finally {
      setGuardandoPass(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="perfil-page">
      <header className="perfil-page__header">
        <Link to="/" className="perfil-page__back" aria-label="Volver al inicio">
          ←
        </Link>
        <span className="perfil-page__header-titulo">Mi perfil</span>
      </header>

      <div className="perfil-page__body">
        {/* Identidad: foto grande + nombre/email actuales */}
        <section className="perfil-page__identidad">
          <Avatar nombre={nombre} avatarUrl={avatarUrl} size={88} />
          <div className="perfil-page__identidad-texto">
            <h1 className="perfil-page__nombre">{nombre || 'Cliente'}</h1>
            {user?.email && <p className="perfil-page__email">{user.email}</p>}
          </div>
        </section>

        {/* Foto */}
        <section className="perfil-card">
          <h2 className="perfil-card__titulo">Foto de perfil</h2>
          <FotoInputField
            id="perfil-foto"
            label="Elegir nueva foto"
            onChange={setFotoNueva}
            disabled={guardandoFoto}
          />
          {msgFoto && (
            <p className={`perfil-card__msg perfil-card__msg--${msgFoto.tipo}`} role="alert">
              {msgFoto.texto}
            </p>
          )}
          <button
            type="button"
            className="perfil-card__submit"
            onClick={handleGuardarFoto}
            disabled={!fotoNueva || guardandoFoto}
          >
            {guardandoFoto ? 'Subiendo...' : 'Guardar foto'}
          </button>
        </section>

        {/* Datos */}
        <section className="perfil-card">
          <h2 className="perfil-card__titulo">Datos</h2>
          <form className="perfil-card__form" onSubmit={handleGuardarDatos}>
            <label className="perfil-card__campo">
              <span>Nombre</span>
              <input
                type="text"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="perfil-card__campo">
              <span>Teléfono</span>
              <input
                type="tel"
                value={telefonoInput}
                onChange={(e) => setTelefonoInput(e.target.value)}
                placeholder="0412 1234567"
                autoComplete="tel"
              />
            </label>
            <label className="perfil-card__campo">
              <span>Email</span>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {msgDatos && (
              <p className={`perfil-card__msg perfil-card__msg--${msgDatos.tipo}`} role="alert">
                {msgDatos.texto}
              </p>
            )}
            <button type="submit" className="perfil-card__submit" disabled={guardandoDatos}>
              {guardandoDatos ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        {/* Contraseña */}
        <section className="perfil-card">
          <h2 className="perfil-card__titulo">Cambiar contraseña</h2>
          <form className="perfil-card__form" onSubmit={handleCambiarPassword}>
            <label className="perfil-card__campo">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </label>
            <label className="perfil-card__campo">
              <span>Repetir contraseña</span>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </label>
            {msgPass && (
              <p className={`perfil-card__msg perfil-card__msg--${msgPass.tipo}`} role="alert">
                {msgPass.texto}
              </p>
            )}
            <button type="submit" className="perfil-card__submit" disabled={guardandoPass}>
              {guardandoPass ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </section>

        <button type="button" className="perfil-page__logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
