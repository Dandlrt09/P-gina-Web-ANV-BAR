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

export function useNewReviewsBadge() {
  const [pending, setPending] = useState(0)

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
        () => setPending((count) => count + 1),
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
