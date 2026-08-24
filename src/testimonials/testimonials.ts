/**
 * ANV·BAR — Acceso a datos de testimonios de clientas en Supabase.
 *
 * Módulo compartido por el storefront (lectura pública) y el panel admin
 * (CRUD completo): una sola fuente de verdad para los tipos, los límites de
 * validación y el mapeo snake_case → camelCase.
 *
 * La seguridad la aplica Row Level Security en la base: cualquiera puede leer,
 * mientras que crear, editar y borrar solo prospera para roles autenticados en
 * la allowlist de administradores (public.is_admin()); para cualquier otro rol
 * RLS simplemente ignora las filas sin reportar error.
 */

import { supabase } from '../shared/supabase'

/** Límites de validación, espejo exacto de los CHECKs de testimonials. */
export const TESTIMONIAL_BOUNDS = {
  minName: 1,
  maxName: 80,
  minText: 1,
  maxText: 1000,
} as const

/** Fila cruda de public.testimonials (snake_case, tal como la entrega PostgREST). */
export type TestimonialRow = {
  id: string
  name: string
  text: string
  created_at: string
  updated_at: string
}

/** Testimonio listo para renderizar (camelCase), misma forma para storefront y admin. */
export type Testimonial = {
  id: string
  /** Nombre de la clienta; el bridge de reviews resuelve vacío como "Anónimo". */
  name: string
  text: string
  createdAt: string
  /** Lo refresca el trigger set_updated_at_on_testimonials en cada UPDATE. */
  updatedAt: string
}

/** Mapea una fila de `testimonials` a `Testimonial` (snake_case → camelCase). */
export function mapTestimonialRow(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    name: row.name,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Todos los testimonios ordenados de más reciente a más antiguo
 * (`created_at DESC` con `id DESC` como desempate, el mismo criterio del
 * índice de la tabla).
 */
export async function listTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapTestimonialRow(row as TestimonialRow))
}

/**
 * Crea un testimonio y devuelve la fila insertada: recibir la fila ES la
 * prueba de éxito — sin fila no hay confirmación. RLS: solo allowlist admin.
 */
export async function createTestimonial(input: {
  name: string
  text: string
}): Promise<Testimonial> {
  const { data, error } = await supabase
    .from('testimonials')
    .insert({ name: input.name, text: input.text })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapTestimonialRow(data as TestimonialRow)
}

/**
 * Guarda los cambios a un testimonio (RLS: solo allowlist admin); el trigger
 * de la tabla refresca updated_at sin intervención del cliente.
 */
export async function updateTestimonial(
  id: string,
  input: { name: string; text: string },
): Promise<void> {
  const { error } = await supabase
    .from('testimonials')
    .update({ name: input.name, text: input.text })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Borra definitivamente un testimonio (RLS: solo allowlist admin). */
export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
