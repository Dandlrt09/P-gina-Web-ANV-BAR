import { CATEGORIES, type ProductColor } from '../catalog/catalog'
import {
  slugifyName,
  uniqueSlug,
  validateProductInput,
  type AdminProductInput,
  type ValidationIssue,
} from './products'

/**
 * Carga masiva de productos (slice "pegá desde Excel/CSV" + subida de archivo).
 *
 * Formato aceptado (primera fila = encabezados, resto = datos):
 *   nombre;categoria;precio;editorial;tela;cuidados;tallas;variantes;es_nuevo;orden
 * El separador puede ser `;`, `,` o TAB (Excel pega con TAB); se detecta por
 * la primera línea. Si la primera fila NO parece un encabezado (ninguna celda
 * matchea un alias conocido), no se descarta: se trata como dato y las columnas
 * se asumen en el orden canónico de arriba — pegar "en seco" funciona.
 * `variantes` usa `Nombre #hex [https://foto]` separadas por `;`.
 * Precio y orden toleran formato humano (`$420.000`, `420 000`): se conservan
 * solo los dígitos, porque el portapapeles de Excel lleva el texto formateado
 * de la celda y el dominio exige enteros sin decimales.
 * El identificador (slug) se deriva del nombre rehusando el auto-slug del
 * form y se resuelve contra los ids existentes + los del propio lote para no
 * colisionar. Cada fila se valida con el MISMO validateProductInput del form,
 * así las reglas (y mensajes) son idénticos a la alta manual.
 */

export type ImportPreviewRow = {
  /** Línea de la planilla (1 = encabezado). */
  line: number
  name: string
  /** Slug resuelto (único contra base + lote). */
  slug: string
  /** Errores de validación de la fila; vacío = fila importable. */
  issues: ValidationIssue[]
  input: AdminProductInput | null
}

export type ImportFailure = { line: number; name: string; message: string }

export type ImportResult = {
  created: number
  failed: ImportFailure[]
}

const HEADER_ALIASES: Record<string, keyof AdminProductInput> = {
  nombre: 'name',
  name: 'name',
  categoria: 'category',
  category: 'category',
  precio: 'priceRaw',
  price: 'priceRaw',
  price_cop: 'priceRaw',
  editorial: 'editorial',
  'texto_editorial': 'editorial',
  descripcion: 'editorial',
  description: 'editorial',
  tela: 'fabric',
  fabric: 'fabric',
  cuidados: 'care',
  care: 'care',
  tallas: 'sizes',
  sizes: 'sizes',
  variantes: 'colors',
  variantes_url: 'colors',
  variants: 'colors',
  colors: 'colors',
  es_nuevo: 'isNew',
  is_new: 'isNew',
  nuevo: 'isNew',
  orden: 'sortOrder',
  sort_order: 'sortOrder',
}

/** Normaliza un encabezado para el mapeo por alias: minúsculas, sin acentos,
 *  no-alfanuméricos → '_'. */
function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Separa una línea respetando comillas dobles (Excel comillea campos que
 *  contienen el separador). */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((cell) => cell.trim())
}

/** Detecta el separador real: TAB (Excel), ';' o ',' según la primera línea. */
function detectSeparator(line: string): string {
  if (line.includes('\t')) return '\t'
  return line.includes(';') ? ';' : ','
}

/** `Nombre #rrggbb https://foto` → variante; null si el formato no matchea. */
const VARIANT_RE = /^(.+?)\s+#([0-9a-fA-F]{6})(?:\s+(\S+))?$/

export type ParsedVariantes = {
  colors: ProductColor[]
  /** true si alguna célula no vacía no matcheó `Nombre #hex [URL]`. */
  malformed: boolean
}

function parseVariantes(raw: string): ParsedVariantes {
  const colors: ProductColor[] = []
  let malformed = false
  for (const cell of raw.split(';')) {
    const part = cell.trim()
    if (part === '') continue
    const match = VARIANT_RE.exec(part)
    if (!match) {
      malformed = true
      continue
    }
    colors.push({
      name: match[1].trim(),
      // Canonical con numeral: validateProductInput exige #rrggbb (igual que
      // el <input type="color"> del form) y así viaja a colors.jsonb.
      hex: `#${match[2]}`,
      ...(match[3] ? { image: { src: match[3], label: match[1].trim() } } : {}),
    })
  }
  return { colors, malformed }
}

/** `"XS, S, M, L"` → ["XS", "S", "M", "L"] (separador coma; tolera espacios). */
function parseSizes(raw: string): string[] {
  return raw
    .split(',')
    .map((size) => size.trim())
    .filter((size) => size !== '')
}

function parseEsNuevo(raw: string): boolean {
  const value = normalizeHeader(raw)
  return value === 'si' || value === 'true' || value === '1' || value === 's' || value === 'yes'
}

/** Convierte un entero con formato humano (`$420.000`, `420 000`, `1.250.000`)
 *  al crudo del dominio: conserva solo los dígitos. Vacío/sin dígitos → NaN
 *  (la validación de abajo lo reporta con su mensaje normal). Los precios son
 *  SIEMPRE enteros de pesos, así que descartar separadores es seguro. */
function parseIntLoose(raw: string): number {
  const digits = raw.replace(/\D+/g, '')
  return digits === '' ? Number.NaN : Number.parseInt(digits, 10)
}

/** Convierte una fila cruda (ya mapeada por alias) en AdminProductInput. */
function buildInput(
  row: Partial<Record<keyof AdminProductInput, string>>,
  slug: string,
): { input: AdminProductInput; variantesMalformed: boolean } {
  const priceRaw = (row.priceRaw ?? '').trim()
  const parsedPrice = parseIntLoose(priceRaw)
  const sortRaw = (row.sortOrder ?? '').trim()
  const sortOrder = sortRaw === '' ? null : parseIntLoose(sortRaw)
  const { colors, malformed } = parseVariantes(row.colors ?? '')

  return {
    variantesMalformed: malformed,
    input: {
      id: slug,
      name: row.name ?? '',
      category: (row.category ?? '') as AdminProductInput['category'],
      priceCOP: Number.isNaN(parsedPrice) ? NaN : parsedPrice,
      isNew: parseEsNuevo(row.isNew ?? ''),
      sortOrder: Number.isNaN(sortOrder ?? NaN) ? null : sortOrder,
      editorial: row.editorial ?? '',
      fabric: row.fabric ?? '',
      care: row.care ?? '',
      sizes: parseSizes(row.sizes ?? ''),
      colors,
    },
  }
}

/** Orden canónico de columnas cuando la planilla viene SIN encabezado:
 *  exactamente el mismo orden documentado en la ayuda del importador. */
const CANONICAL_ORDER: (keyof AdminProductInput)[] = [
  'name',
  'category',
  'priceRaw',
  'editorial',
  'fabric',
  'care',
  'sizes',
  'colors',
  'isNew',
  'sortOrder',
]

/** ¿La primera fila es un encabezado? Basta con que UNA celda mapee un alias
 *  conocido (`nombre`, `precio`, `variantes`...). Una fila de datos real casi
 *  nunca matchea: los nombres de producto no son "Precio" ni "Categoría". */
function looksLikeHeader(cells: string[]): boolean {
  return cells.some((cell) => HEADER_ALIASES[normalizeHeader(cell)] !== undefined)
}

/**
 * Parsea la planilla completa. `existingIds`: ids ya presentes en la base
 * (para resolver slugs únicos). Las filas vacías se ignoran.
 */
export function parseImportTable(text: string, existingIds: ReadonlySet<string>): ImportPreviewRow[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd())
  const firstData = lines.find((line) => line.trim() !== '')
  if (!firstData) return []

  const sep = detectSeparator(firstData)
  let headerCols: string[] | null = null
  let headerDecided = false
  const rows: ImportPreviewRow[] = []
  const usedSlugs = new Set(existingIds)

  lines.forEach((raw, index) => {
    const line = index + 1
    if (raw.trim() === '') return
    const cells = splitLine(raw, sep)

    // La decisión de encabezado se toma UNA vez, sobre la primera fila con
    // contenido. Si no parece encabezado, esa fila ES un dato y las columnas
    // caen por posición (orden canónico): pegar en seco no pierde productos.
    if (!headerDecided) {
      headerDecided = true
      if (looksLikeHeader(cells)) {
        headerCols = cells.map((cell) => normalizeHeader(cell))
        return
      }
    }

    const record: Partial<Record<keyof AdminProductInput, string>> = {}
    cells.forEach((cell, cellIndex) => {
      const key = headerCols ? HEADER_ALIASES[headerCols[cellIndex]] : CANONICAL_ORDER[cellIndex]
      if (key) record[key] = cell
    })

    const name = record.name ?? ''
    const slug = uniqueSlug(slugifyName(name), usedSlugs)
    usedSlugs.add(slug)

    const { input, variantesMalformed } = buildInput(record, slug)
    const issues = validateProductInput(input)

    // Mensaje más claro que los fallos genéricos de color cuando la columna
    // `variantes` no respeta `Nombre #hex [URL]` (ej. falta el #hex).
    if (variantesMalformed) {
      issues.push({
        field: 'colors',
        message:
          'Variantes — formato esperado por variante: Nombre #hex [https://foto] (ej. Marfil #F5E6C8 https://…). Sepárelas con «;».',
      })
    }

    rows.push({ line, name, slug, issues, input })
  })

  return rows
}

/** Importa las filas válidas en orden; las fallidas se reportan sin abortar. */
export async function importRows(
  rows: ImportPreviewRow[],
  create: (input: AdminProductInput) => Promise<unknown>,
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, failed: [] }
  for (const row of rows) {
    if (!row.input || row.issues.length > 0) continue
    try {
      await create(row.input)
      result.created += 1
    } catch (err) {
      result.failed.push({
        line: row.line,
        name: row.name,
        message: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }
  return result
}

/** Devuelve las categorías vigentes para mostrarlas en la ayuda del import. */
export function listValidCategories(): readonly string[] {
  return CATEGORIES
}