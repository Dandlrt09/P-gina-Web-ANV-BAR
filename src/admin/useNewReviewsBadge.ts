/**
 * ANV·BAR — Aviso de comentarios nuevos del panel admin (estilo chat).
 *
 * Contador acumulativo de reviews de producto aún no vistas por ESTE browser:
 *   - Al montar: cuenta las reviews creadas después del último "visto"
 *     (timestamp en localStorage). Si nunca hubo visita previa, todo lo
 *     existente cuenta como visto para no estrenar el panel con un badge
 *     gigante.
 *   - En vivo: cada INSERT en product_reviews (canal realtime) suma 1, sin
 *     importar en qué ruta del panel esté parado el admin.
 *   - markSeen(): fija el "visto" en ahora y resetea el contador; el panel lo
 *     invoca al entrar a la ruta Comentarios.
 *
 * El estado de "visto" es local al browser (localStorage), igual que otras
 * preferencias del panel: para la escala de la tienda no justifica una tabla.
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../shared/supabase'
import { countReviewsSince } from '../reviews/productReviews'

const LAST_SEEN_KEY = 'anv-bar:reviews-last-seen-at'

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

/**
 * Contexto de audio compartido, creado UNA vez durante un gesto del usuario.
 * Los browsers crean el contexto suspendido si nace fuera del stack de un
 * click (callback de realtime, timers), así que no se instancia ahí: el hook
 * escucha el primer pointerdown del panel y lo desbloquea en ese momento.
 */
let audioCtx: AudioContext | null = null

function ensureAudioContext(): void {
  if (audioCtx === null) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
}

/** "Plin" de dos tonos generado con Web Audio API: sin archivos ni dependencias. */
function playChime(): void {
  const ctx = audioCtx
  if (ctx === null || ctx.state !== 'running') return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    /* sin audio disponible: el badge visual ya cubre el aviso */
  }
}

export function useNewReviewsBadge() {
  const [pending, setPending] = useState(0)

  // Desbloqueo de audio: el primer click en el panel crea/reanuda el contexto
  // dentro de un gesto del usuario, habilitando los plins futuros.
  useEffect(() => {
    window.addEventListener('pointerdown', ensureAudioContext)
    return () => window.removeEventListener('pointerdown', ensureAudioContext)
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

  // En vivo: cada reseña nueva acumula, como mensajes de chat.
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
