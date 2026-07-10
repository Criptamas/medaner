import { useEffect, useState } from 'react'
import './PwaInstallModal.css'

const DISMISS_KEY = 'medaner_pwa_install_dismissed'
// No re-molestar por 7 días tras un descarte. Volver a ofrecer después (el
// usuario pudo cambiar de idea, o entrar desde otro dispositivo).
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
// Pequeño delay para no tapar el primer render con el modal de una.
const DELAY_MS = 1500

// ¿La app ya corre instalada (standalone)? Entonces no tiene sentido ofrecer
// instalarla. Cubre Android/desktop (display-mode) e iOS (navigator.standalone).
function estaInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// iOS/iPadOS NO soporta beforeinstallprompt: la única vía de instalar la PWA es
// manual (Compartir → Agregar a pantalla de inicio). Además, el push web en
// iOS SOLO funciona con la PWA instalada — por eso este modal es clave ahí.
function esIOS() {
  const ua = window.navigator.userAgent
  const iPhoneIPad = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ se hace pasar por Mac; se detecta por el touch.
  const iPadOSComoMac = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  return iPhoneIPad || iPadOSComoMac
}

function descartadoReciente() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < DISMISS_MS
  } catch {
    return false
  }
}

// Modal "Descarga la app" para facilitar instalar la PWA — la mayoría de los
// usuarios no sabe hacerlo solo. Se monta global (App.jsx) y decide por su
// cuenta si corresponde mostrarse. Tres escenarios de CTA:
//  - Android/Chrome/Edge: botón "Instalar app" que dispara el prompt nativo
//    (evento beforeinstallprompt capturado).
//  - iPhone/iPad: instrucciones (Compartir → Agregar a pantalla de inicio).
//  - Resto (navegador sin soporte): instrucciones genéricas del menú.
export default function PwaInstallModal() {
  const [visible, setVisible] = useState(false)
  const [promptEvent, setPromptEvent] = useState(null)
  const ios = esIOS()

  useEffect(() => {
    if (estaInstalada() || descartadoReciente()) return

    // Capturamos el evento de instalación de Chromium (si el navegador lo
    // dispara) para poder ofrecer el botón nativo más abajo.
    function onBeforeInstall(e) {
      e.preventDefault()
      setPromptEvent(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Si el usuario instala por fuera del modal, lo ocultamos.
    function onInstalled() {
      setVisible(false)
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {
        /* localStorage no disponible: no pasa nada, solo no recordamos */
      }
    }
    window.addEventListener('appinstalled', onInstalled)

    const timer = setTimeout(() => setVisible(true), DELAY_MS)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function descartar() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* idem */
    }
  }

  async function instalar() {
    if (!promptEvent) return
    promptEvent.prompt()
    try {
      await promptEvent.userChoice
    } finally {
      // El evento solo se puede usar una vez.
      setPromptEvent(null)
      descartar()
    }
  }

  if (!visible) return null

  return (
    <div className="pwa-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-modal-titulo">
      <button
        type="button"
        className="pwa-modal__backdrop"
        aria-label="Cerrar"
        onClick={descartar}
      />
      <div className="pwa-modal__card">
        <div className="pwa-modal__icono" aria-hidden="true">📲</div>
        <h2 id="pwa-modal-titulo" className="pwa-modal__titulo">Descarga la app</h2>
        <p className="pwa-modal__texto">
          Instala Medaner en tu teléfono para abrirla como una app y recibir avisos de tus
          pedidos y viajes.
        </p>

        {ios ? (
          // iPhone/iPad: no hay prompt nativo, guiamos el gesto manual.
          <ol className="pwa-modal__pasos">
            <li>
              Toca <strong>Compartir</strong>{' '}
              <span className="pwa-modal__share" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                  <path d="M12 3v12" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7l4-4 4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>{' '}
              en la barra de Safari.
            </li>
            <li>Elige <strong>“Agregar a pantalla de inicio”</strong>.</li>
            <li>Confirma con <strong>Agregar</strong>.</li>
          </ol>
        ) : promptEvent ? (
          // Android/Chromium: prompt nativo de instalación.
          <button type="button" className="pwa-modal__instalar" onClick={instalar}>
            Instalar app
          </button>
        ) : (
          // Navegador sin soporte de prompt: instrucción genérica.
          <p className="pwa-modal__texto pwa-modal__texto--pasos">
            Abre el menú de tu navegador (⋮) y elige{' '}
            <strong>“Agregar a pantalla de inicio”</strong> o <strong>“Instalar app”</strong>.
          </p>
        )}

        <button type="button" className="pwa-modal__despues" onClick={descartar}>
          Ahora no
        </button>
      </div>
    </div>
  )
}
