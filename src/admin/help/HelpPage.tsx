import { useEffect, useState } from 'react'
import { HELP_SECTIONS, helpHrefLabel, type HelpExample } from './helpContent'

/**
 * Ayuda del panel (#/admin/ayuda): guía completa de la tienda y del panel,
 * renderizada dentro del gate normal del admin. Pensada como página de
 * lectura: columna centrada, tipografía generosa y navegación entre secciones.
 *
 * Todo el contenido — guía y bloque de contacto final — es estático para
 * funcionar aun con Supabase caído.
 */

/** Navegación interna SIN anclas: un href="#seccion" pisaría el hash de la
 *  ruta (#/admin/ayuda) y rompería el routeo. Se hace scroll programático. */
function jumpToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Floating back-to-top button (bottom-right corner): appears after the
 *  reader scrolls past the intro and returns to the top of the page. */
function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Subir al inicio"
      aria-label="Subir al inicio de la página"
      className="fixed bottom-6 right-6 z-20 grid size-11 place-items-center rounded-full border border-brand-primary/40 bg-surface font-display text-lg text-brand-deep shadow-md transition-colors hover:bg-brand-primary/10"
    >
      ↑
    </button>
  )
}

/** Escalation contact shown at the end of the guide: the developer. Static
 *  by design so the help page renders even with the database unreachable.
 *  Phone is a Colombian mobile; the wa.me link uses the +57 E.164 prefix. */
const DEVELOPER_CONTACT = {
  name: 'Daniel',
  role: 'Desarrollo y soporte de ANV·BAR',
  whatsappLabel: '304 645 9177',
  whatsappHref: 'https://wa.me/573046459177',
  email: 'danieldelosriost@gmail.com',
}

function OwnerContactBlock() {
  return (
    <aside className="mt-14 rounded-xl border border-brand-primary/20 bg-white/60 p-6 sm:p-8">
      <h2 className="font-display text-xl font-medium text-brand-deep sm:text-2xl">
        Contacto directo
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">
        Si algo falla y esta guía no lo resuelve, escríbale directamente al desarrollador, por
        mensaje de texto o correo electrónico.
      </p>
      <p className="mt-4 text-sm text-ink/70">
        <span className="font-medium text-brand-deep">{DEVELOPER_CONTACT.name}</span>
        {` — ${DEVELOPER_CONTACT.role}`}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        <li>
          <a
            href={DEVELOPER_CONTACT.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="block h-full rounded-lg border border-brand-primary/15 bg-surface px-4 py-3 transition-colors hover:border-brand-primary hover:bg-white"
          >
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              WhatsApp
            </span>
            <span className="mt-1 block font-display text-base text-brand-deep">
              {DEVELOPER_CONTACT.whatsappLabel}
            </span>
          </a>
        </li>
        <li>
          <a
            href={`mailto:${DEVELOPER_CONTACT.email}`}
            className="block h-full rounded-lg border border-brand-primary/15 bg-surface px-4 py-3 transition-colors hover:border-brand-primary hover:bg-white"
          >
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Correo
            </span>
            <span className="mt-1 block font-display text-base text-brand-deep">
              {DEVELOPER_CONTACT.email}
            </span>
          </a>
        </li>
      </ul>
    </aside>
  )
}

/** Expandable worked example for an entry: collapsed by default so the guide
 *  stays scannable; opening it reveals a concrete field/table walkthrough and,
 *  for imports, the downloadable Excel template. */
function EntryExample({ example }: { example: HelpExample }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="rounded-full border border-brand-primary/30 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10"
      >
        {open ? 'Ocultar ejemplo' : 'Ver un ejemplo'}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-brand-primary/15 bg-white/70 p-4 sm:p-5">
          {example.download && (
            <div className="mb-4 rounded-md border border-brand-primary/20 bg-surface p-4 text-center">
              <a
                href={example.download.href}
                download
                className="inline-block rounded-full bg-brand-deep px-5 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
              >
                {example.download.label}
              </a>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">{example.download.note}</p>
            </div>
          )}

          {example.intro && <p className="text-sm leading-relaxed text-ink/80">{example.intro}</p>}

          {example.fields && (
            <dl className="mt-3 divide-y divide-brand-primary/10">
              {example.fields.map((field) => (
                <div key={field.label} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                    {field.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink/90">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {example.table && (
            <div className="mt-3 overflow-x-auto rounded-md border border-brand-primary/15">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-brand-primary/5">
                    {example.table.headers.map((header) => (
                      <th
                        key={header}
                        className="border-b border-brand-primary/15 px-3 py-2 font-semibold text-brand-deep"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {example.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${row[0]}-${cellIndex}`}
                          className="border-b border-brand-primary/10 px-3 py-2 align-top text-ink/90"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function HelpPage() {
  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Ayuda</p>
          <a
            href="#/admin"
            className="rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
          >
            Volver al panel
          </a>
        </div>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-medium leading-tight text-brand-deep sm:text-4xl">
            Guía de la tienda y del panel
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/80">
            Todo lo que necesita para administrar ANV·BAR sin depender de nadie: cómo funciona la
            tienda pública, qué hace cada pantalla del panel y qué hacer cuando algo falla.
          </p>
        </header>

        <nav aria-label="Ir a una sección" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {HELP_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => jumpToSection(`ayuda-${section.id}`)}
                  className="rounded-full border border-brand-primary/30 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10"
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {HELP_SECTIONS.map((section) => (
          <article
            key={section.id}
            id={`ayuda-${section.id}`}
            className="scroll-mt-32 pt-12 first:pt-12"
            aria-labelledby={`ayuda-${section.id}-titulo`}
          >
            <h2
              id={`ayuda-${section.id}-titulo`}
              className="font-display text-2xl font-medium text-brand-deep sm:text-3xl"
            >
              {section.title}
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink/80">{section.intro}</p>

            {section.entries.map((entry) => (
              <div key={entry.title} className="mt-8 border-t border-brand-primary/10 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <h3 className="font-display text-lg font-medium text-brand-deep">{entry.title}</h3>
                  {entry.href && (
                    <a
                      href={entry.href}
                      className="rounded-full bg-brand-primary/5 px-4 py-1.5 text-xs font-medium text-brand-deep transition-colors hover:bg-brand-primary/10"
                    >
                      {helpHrefLabel(entry)}
                    </a>
                  )}
                </div>
                {(entry.paragraphs ?? []).map((paragraph) => (
                  <p key={paragraph.slice(0, 48)} className="mt-3 leading-relaxed text-ink/90">
                    {paragraph}
                  </p>
                ))}
                {entry.bullets && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink/90">
                    {entry.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 48)}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {entry.example && <EntryExample example={entry.example} />}
              </div>
            ))}
          </article>
        ))}

        <OwnerContactBlock />
      </div>
      <BackToTopButton />
    </section>
  )
}
