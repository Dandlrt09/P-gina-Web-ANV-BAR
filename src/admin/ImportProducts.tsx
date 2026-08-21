import { useState } from 'react'
import { listExistingIds, createProduct } from './products'
import {
  importRows,
  listValidCategories,
  parseImportTable,
  type ImportPreviewRow,
} from './import'

/**
 * Carga masiva de productos (slice "importar desde planilla").
 *
 * Dos caminos hacia el mismo parser:
 *  1. Subir un archivo .xlsx/.xls/.csv — se lee en el navegador con SheetJS
 *     (chunk perezoso, solo carga en el admin) y se serializa a TSV. Leer el
 *     ARCHIVO toma los valores crudos de las celdas: el precio llega como
 *     número limpio aunque Excel lo muestre como $420.000.
 *  2. Pegar la planilla como texto (Excel copia con TAB).
 * El parser deriva el slug desde el nombre, detecta si la primera fila es o no
 * encabezado (sin encabezado asume el orden canónico de columnas), valida CADA
 * fila con las mismas reglas del form y deja previsualizar antes de escribir.
 * Load: solo se importan las filas sin errores; las fallidas se reportan
 * línea por línea sin abortar el lote.
 */
export function ImportProducts() {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: { line: number; name: string; message: string }[] } | null>(null)

  const validCount = (rows ?? []).filter((row) => row.issues.length === 0).length

  const handlePreview = async () => {
    setError(null)
    setResult(null)
    setParsing(true)
    try {
      const existing = await listExistingIds()
      setRows(parseImportTable(text, new Set(existing)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos leer la planilla.')
      setRows(null)
    } finally {
      setParsing(false)
    }
  }

  /** Lee un .xlsx/.xls/.csv local y lo vuelca al textarea como TSV. La lectura
   *  del archivo NO toca la red: todo pasa por el mismo pipeline del texto. */
  const handleFile = async (file: File) => {
    setError(null)
    setResult(null)
    setRows(null)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer())
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) throw new Error('El archivo no tiene hojas.')
      const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: '',
      })
      const tsv = grid
        .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()).join('\t') : ''))
        .join('\n')
      if (tsv.trim() === '') throw new Error('No encontramos datos en la primera hoja.')
      setText(tsv)
      setFileName(file.name)
    } catch (err) {
      setFileName(null)
      setError(err instanceof Error ? err.message : 'No pudimos leer el archivo.')
    }
  }

  const handleClear = () => {
    setText('')
    setFileName(null)
    setRows(null)
    setResult(null)
    setError(null)
  }

  const handleImport = async () => {
    if (!rows || importing) return
    setError(null)
    setResult(null)
    setImporting(true)
    try {
      const outcome = await importRows(rows, createProduct)
      setResult(outcome)
      // Deja la planilla lista para el próximo lote.
      setText('')
      setRows(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos importar.')
    } finally {
      setImporting(false)
    }
  }

  const categories = listValidCategories().join(', ')

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">
          Importar productos
        </h1>
        <p className="mt-2 max-w-2xl text-ink/80">
          Subí tu planilla de Excel o pegala como texto. Un producto por fila; el identificador se
          genera solo desde el nombre. Las imágenes van como URL pública por variante (opcional:
          sin URL se ve un placeholder hasta subir la foto desde el formulario).
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-brand-primary bg-surface px-6 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface">
            Subir archivo .xlsx / .csv
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
                // Permite volver a elegir el mismo archivo después de limpiar.
                event.target.value = ''
              }}
            />
          </label>
          {fileName && (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
              {fileName}
              <button
                type="button"
                onClick={handleClear}
                aria-label="Quitar archivo y limpiar"
                className="text-brand-deep/60 transition-colors hover:text-brand-deep"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-brand-primary/15 bg-white/60 p-5 text-sm text-ink/75">
          <p className="font-medium text-brand-deep">Encabezados aceptados</p>
          <code className="mt-2 block overflow-x-auto whitespace-pre rounded-lg bg-surface px-3 py-2 text-xs text-brand-deep">
            {`nombre;categoria;precio;editorial;tela;cuidados;tallas;variantes;es_nuevo;orden`}
          </code>
          <p className="mt-3">
            <span className="font-medium text-brand-deep">Variantes:</span> «Nombre #hex [URL]»
            separadas por <code className="text-xs">;</code> — ej.{' '}
            <code className="text-xs">Marfil #F5E6C8 https://…; Negro #111111</code>
          </p>
          <p className="mt-2">
            <span className="font-medium text-brand-deep">Categorías vigentes:</span>{' '}
            <span className="text-ink/70">{categories}.</span>
          </p>
          <p className="mt-2 text-xs text-ink/60">
            Solo precio, descripción (columna «editorial»), tela, cuidados, tallas y variantes son
            obligatorias. «es_nuevo» acepta si/no (default no); «orden» es opcional. El precio
            tolera formato de moneda («$420.000»); si tu planilla no tiene fila de encabezados, las
            columnas deben seguir el orden de arriba.
          </p>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={`nombre;categoria;precio;editorial;tela;cuidados;tallas;variantes;es_nuevo;orden\nVestido Aurora;Vestidos;420000;Edición limitada;Lino;Lavar a mano;XS, S, M, L;Marfil #F5E6C8 https://ejemplo.com/foto.jpg;si;1`}
          className="mt-6 w-full rounded-xl border border-brand-primary/20 bg-surface px-4 py-3 font-mono text-sm text-ink outline-none transition-colors focus:border-brand-primary"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={parsing || text.trim() === ''}
            className="rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {parsing ? 'Leyendo…' : 'Previsualizar'}
          </button>
          {rows && validCount > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="rounded-full bg-brand-deep px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? 'Importando…' : `Importar ${validCount} producto${validCount === 1 ? '' : 's'}`}
            </button>
          )}
          {rows && validCount === 0 && (
            <p className="text-sm font-medium text-brand-deep">
              Corregí los errores para poder importar.
            </p>
          )}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-brand-deep">{error}</p>}

        {result && (
          <div className="mt-6 rounded-xl border border-brand-primary/15 bg-white/60 p-5">
            <h2 className="font-display text-lg text-brand-deep">Resultado</h2>
            <p className="mt-1 text-sm text-ink/80">
              {result.created} importado{result.created === 1 ? '' : 's'} correctamente.
            </p>
            {result.failed.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {result.failed.map((failure) => (
                  <li key={`${failure.line}-${failure.name}`} className="text-sm text-brand-deep">
                    Línea {failure.line} · {failure.name}: {failure.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {rows && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-brand-primary/15 bg-white/60">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-primary/15 text-xs uppercase tracking-wide text-ink/60">
                  <th className="px-4 py-3">Línea</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line} className="border-b border-brand-primary/10 align-top">
                    <td className="px-4 py-3 tabular-nums text-ink/60">{row.line}</td>
                    <td className="px-4 py-3 font-medium text-brand-deep">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{row.slug}</td>
                    <td className="px-4 py-3">
                      {row.issues.length === 0 ? (
                        <span className="inline-flex rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                          Listo
                        </span>
                      ) : (
                        <ul className="space-y-1">
                          {row.issues.map((issue) => (
                            <li key={issue.field} className="text-xs leading-relaxed text-brand-deep">
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}