/**
 * ANV·BAR — Aviso de comentarios nuevos del panel admin (estilo chat).
 *
 * Contador acumulativo de reviews de producto aún no vistas por ESTE browser:
 *   - Al montar: cuenta las reviews creadas después del último "visto"
 *     (timestamp en localStorage). Si nunca hubo visita previa, todo lo
 *     existente cuenta como visto para no estrenar el panel con un badge
 *     gigante.
 *   - En vivo: cada INSERT en product_reviews (canal realtime) suma 1 y
 *     suena el plin, sin importar en qué ruta del panel esté el admin.
 *   - markSeen(): fija el "visto" en ahora y resetea el contador; el panel lo
 *     invoca al entrar a la ruta Comentarios.
 *
 * El sonido es un WAV embebido como data-URI (sin assets ni dependencias)
 * reproducido con un elemento Audio: el primer gesto del usuario lo
 * "desbloquea" (play + pausa dentro del click) y desde ahí los play()
 * disparados por el callback de realtime funcionan en todos los browsers.
 * El estado de "visto" es local (localStorage): para la escala de la tienda
 * no justifica una tabla.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../shared/supabase'
import { countReviewsSince } from '../reviews/productReviews'

const LAST_SEEN_KEY = 'anv-bar:reviews-last-seen-at'

/** Plin de dos tonos (880 Hz → 1320 Hz, ~0.35 s), WAV PCM 8 kHz mono embebido. */
const CHIME_WAV = 'data:audio/wav;base64,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'

let chime: HTMLAudioElement | null = null
let chimeUnlocked = false

function ensureChime(): HTMLAudioElement | null {
  if (chime === null) {
    try {
      chime = new Audio(CHIME_WAV)
      chime.volume = 0.5
      chime.preload = 'auto'
    } catch {
      return null
    }
  }
  return chime
}

/**
 * Desbloqueo de autoplay: un play()+pausa dentro del gesto del usuario
 * habilita TODOS los play() futuros del elemento, aunque vengan de un
 * callback de websocket. Se hace una sola vez y a volumen cero para que el
 * desbloqueo no se escuche.
 */
function unlockChime(): void {
  const audio = ensureChime()
  if (audio === null || chimeUnlocked) return
  audio.volume = 0
  const playing = audio.play()
  if (playing === undefined) return
  playing
    .then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 0.5
      chimeUnlocked = true
    })
    .catch(() => {
      audio.volume = 0.5
    })
}

function playChime(): void {
  const audio = ensureChime()
  if (audio === null) return
  audio.currentTime = 0
  const playing = audio.play()
  if (playing !== undefined) playing.catch(() => {})
}

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY)
  } catch {
    return null
  }
}

function writeLastSeen(): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
  } catch {
    /* storage bloqueado: el badge solo pierde persistencia, no funciona mal */
  }
}

export function useNewReviewsBadge() {
  const [pending, setPending] = useState(0)

  // Desbloqueo de audio con el primer click o tecla en el panel.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockChime)
    window.addEventListener('keydown', unlockChime)
    return () => {
      window.removeEventListener('pointerdown', unlockChime)
      window.removeEventListener('keydown', unlockChime)
    }
  }, [])

  // Conteo inicial pendiente según el último "visto" persistido.
  useEffect(() => {
    const lastSeen = readLastSeen()
    if (lastSeen === null) {
      writeLastSeen()
      return
    }
    let alive = true
    countReviewsSince(lastSeen)
      .then((count) => {
        if (alive) setPending(count)
      })
      .catch(() => {
        /* sin conteo inicial el badge queda en cero; el realtime sigue vivo */
      })
    return () => {
      alive = false
    }
  }, [])

  // En vivo: cada reseña nueva acumula y suena, como mensajes de chat.
  useEffect(() => {
    const channel = supabase
      .channel('admin-reviews-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_reviews' },
        () => {
          setPending((count) => count + 1)
          playChime()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const markSeen = useCallback(() => {
    writeLastSeen()
    setPending(0)
  }, [])

  return { pending, markSeen }
}
