import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import StatusMessage from '../StatusMessage'
import './ClienteAuthSheet.css'

const MIN_PASSWORD_LENGTH = 6

// Bottom sheet de autenticación de clientes (Supabase Auth). Mismo patrón
// "sin librerías" que TasaCambioSheet/CartDrawer: backdrop full-screen +
// sheet con position:absolute;bottom:0. Un solo componente con dos modos
// togglables (login/signup) en vez de dos sheets separados, porque comparten
// estructura visual y el usuario puede querer cambiar de uno a otro sin
// cerrar y reabrir.
export default function ClienteAuthSheet({ onCerrar, onAutenticado }) {
  const [modo, setModo] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [avisoConfirmacion, setAvisoConfirmacion] = useState(null)
  const [avisoAvatarError, setAvisoAvatarError] = useState(null)
  const fileInputRef = useRef(null)

  // Libera el object URL del preview cada vez que cambia o al desmontar
  // (elegir otra foto, quitarla, o cerrar el sheet) — evita fugas de memoria.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setError(null)
    setAvisoConfirmacion(null)
    setAvisoAvatarError(null)
  }

  function handleArchivoChange(e) {
    const file = e.target.files?.[0] ?? null
    setArchivo(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function quitarFoto() {
    setArchivo(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Sube la foto de perfil elegida al bucket "avatars" (path {uid}/avatar.ext,
  // exigido por la policy de storage.objects que valida auth.uid() contra el
  // primer segmento del path) y guarda la URL pública en usuarios.avatar_url.
  // Best-effort a propósito: la cuenta ya quedó creada antes de llamar esto,
  // así que un fallo acá nunca debe deshacer el signup — solo se informa.
  async function subirAvatar(userId) {
    try {
      const ext = archivo.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, archivo, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId)
      if (updateError) throw updateError

      return null
    } catch (error) {
      console.error('No se pudo subir la foto de perfil:', error)
      return 'Tu cuenta se creó, pero no pudimos subir tu foto de perfil. Podés agregarla más tarde.'
    }
  }

  function continuarTrasAvatar() {
    setAvisoAvatarError(null)
    onAutenticado?.()
    onCerrar()
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { error: errorLogin } = await supabase.auth.signInWithPassword({ email, password })
      if (errorLogin) {
        // Mensaje genérico a propósito: no revelar si el email existe o no.
        setError('Email o contraseña incorrectos.')
        return
      }
      onAutenticado?.()
      onCerrar()
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setAvisoConfirmacion(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    setEnviando(true)
    try {
      const { data, error: errorSignup } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre: nombre.trim(), tipo_usuario: 'cliente' } },
      })
      if (errorSignup) {
        setError(errorSignup.message || 'No se pudo crear la cuenta.')
        return
      }

      if (data.session) {
        // Confirmación de email desactivada en el proyecto: signUp ya deja
        // sesión activa. El trigger on_auth_user_created no lee "telefono"
        // del metadata, así que si el cliente lo cargó hay que completarlo
        // acá con un update aparte (best-effort: no bloquea el login si falla).
        if (telefono.trim() && data.user) {
          const { error: errorTelefono } = await supabase
            .from('usuarios')
            .update({ telefono: telefono.trim() })
            .eq('id', data.user.id)
          if (errorTelefono) {
            console.error('No se pudo guardar el teléfono del cliente:', errorTelefono)
          }
        }

        // La foto es opcional y solo se puede subir una vez que existe un
        // user.id real (la policy del bucket exige auth.uid() === carpeta).
        let errorAvatar = null
        if (archivo && data.user) {
          errorAvatar = await subirAvatar(data.user.id)
        }

        if (errorAvatar) {
          // No se deshace el signup: la cuenta ya existe. Se muestra el aviso
          // y se deja que el usuario decida cuándo cerrar el sheet.
          setAvisoAvatarError(errorAvatar)
        } else {
          onAutenticado?.()
          onCerrar()
        }
      } else {
        // Confirmación de email activada: todavía no hay sesión, no se puede
        // cerrar el sheet como si ya hubiera iniciado sesión.
        setAvisoConfirmacion('Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.')
      }
    } catch (error) {
      console.error('Error al crear la cuenta:', error)
      setError('No se pudo crear la cuenta. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="cliente-auth-sheet">
      <button
        type="button"
        className="cliente-auth-sheet__backdrop"
        onClick={onCerrar}
        aria-label="Cerrar"
      />
      <div className="cliente-auth-sheet__sheet" role="dialog" aria-label="Cuenta de cliente">
        <div className="cliente-auth-sheet__handle" aria-hidden="true" />

        <header className="cliente-auth-sheet__header">
          <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <button
            type="button"
            className="cliente-auth-sheet__close"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="cliente-auth-sheet__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'login'}
            className={`cliente-auth-sheet__tab ${modo === 'login' ? 'cliente-auth-sheet__tab--activo' : ''}`}
            onClick={() => cambiarModo('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'signup'}
            className={`cliente-auth-sheet__tab ${modo === 'signup' ? 'cliente-auth-sheet__tab--activo' : ''}`}
            onClick={() => cambiarModo('signup')}
          >
            Crear cuenta
          </button>
        </div>

        {avisoAvatarError ? (
          <div className="cliente-auth-sheet__aviso-avatar">
            <StatusMessage variant="empty" title="Cuenta creada" description={avisoAvatarError} />
            <button
              type="button"
              className="cliente-auth-sheet__submit"
              onClick={continuarTrasAvatar}
            >
              Continuar
            </button>
          </div>
        ) : avisoConfirmacion ? (
          <StatusMessage variant="empty" title="Revisa tu correo" description={avisoConfirmacion} />
        ) : (
          <form
            className="cliente-auth-sheet__form"
            onSubmit={modo === 'login' ? handleLogin : handleSignup}
          >
            {modo === 'signup' && (
              <label className="cliente-auth-sheet__campo">
                <span>Nombre</span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                />
              </label>
            )}

            {modo === 'signup' && (
              <label className="cliente-auth-sheet__campo">
                <span>Teléfono (opcional)</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="0412 1234567"
                  autoComplete="tel"
                />
              </label>
            )}

            {modo === 'signup' && (
              <label className="cliente-auth-sheet__campo">
                <span>Foto de perfil (opcional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleArchivoChange}
                  className="cliente-auth-sheet__file-input"
                />
              </label>
            )}

            {modo === 'signup' && previewUrl && (
              <div className="cliente-auth-sheet__avatar-preview">
                <img src={previewUrl} alt="Vista previa de la foto de perfil" />
                <button
                  type="button"
                  className="cliente-auth-sheet__avatar-quitar"
                  onClick={quitarFoto}
                >
                  Quitar foto
                </button>
              </div>
            )}

            <label className="cliente-auth-sheet__campo">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </label>

            <label className="cliente-auth-sheet__campo">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                minLength={modo === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && (
              <p className="cliente-auth-sheet__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="cliente-auth-sheet__submit" disabled={enviando}>
              {enviando
                ? 'Enviando...'
                : modo === 'login'
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
