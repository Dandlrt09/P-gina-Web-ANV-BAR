# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

ANV·BAR is a storefront SPA for a handmade Colombian fashion brand. Public site: live product catalog read from Supabase, product detail pages, favorites, customer reviews, and an assistant chat widget. Orders are handled off-platform via WhatsApp text messages — there is no cart or payment flow. A private admin panel (`#/admin`, same SPA) manages the catalog with Supabase Auth + SQL allowlist authorization.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (hot reload) |
| `npm run build` | Typecheck (`tsc -b`) + production build to `dist/` |
| `npm run lint` | oxlint over the repo |
| `npm run preview` | Serve the production build locally |
| `npm run seed` | Seed products/categories from `content/products/*.json` into Supabase |

## Architecture

Screaming architecture: folders named after business capabilities, not frameworks.

```
src/
  app/          # bootstrap: App (hash routing + catalog gate), main.tsx, CSS brand tokens
  catalog/      # domain core: Product types + Supabase row mapping, load context/gate,
                # card/grid/detail/gallery/quick-view/featured UI
  favorites/    # favorites page + likes persistence (localStorage)
  reviews/      # customer reviews: section, wizard, local storage
  storefront/   # public landing sections: Nav, Hero, TrustBar, Designer,
                # Exclusivity, Testimonials, Contact, Footer; contact channels + WhatsApp helpers
  chat/         # floating ChatWidget + rule-based chatbot brain
  admin/        # admin panel: auth context, login/recovery, product CRUD,
                # spreadsheet import; Supabase client-side admin data access
  shared/       # cross-cutting primitives: Container, Reveal animation, Supabase client
content/        # build-time content sources (JSON) + seed source for products
supabase/       # SQL migrations, RLS policies, checks, seed script
public/imagenes/ # local photos referenced by seed JSONs
```

### Data flow

- **Products & categories**: fetched ONCE from Supabase before any route renders (`CatalogProvider` gate in `src/app/App.tsx`); consumers read the module singleton in `src/catalog/catalog.ts`.
- **Testimonials / designer profile / contact channels**: loaded at build time from `content/*.json` via `import.meta.glob` with strict runtime validation that throws at startup on malformed data.
- **Categories** are a presentation contract: canonical tuple lives in `src/catalog/catalog.ts`; the seed validates the database against it.
- **Reviews and likes** persist client-side only (localStorage).

## Domain rules (MUST follow)

- `priceCOP` is ALWAYS an integer amount of Colombian pesos, no decimals: `250000` renders as `$250.000`.
- Never introduce discounts, sale badges, or "offer" UI of any kind. The standard badge is "Bajo pedido 3-5 días" (made to order).
- WhatsApp links use E.164 format (`573186424021` = `+57` prefix). The site never offers phone calls — text only.
- Product categories must match the canonical tuple: Vestidos, Conjuntos, Camisas, Faldas, Pantalones, Sets, Accesorios.
- Color hex values must represent real garment colors, not arbitrary palette picks.

## Environment & secrets

- `.env` (never committed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `VITE_`-prefixed vars ship inside the client bundle. The anon key being public is BY DESIGN — Row Level Security is the security boundary, not key secrecy.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Seed-only. NEVER give it a `VITE_` prefix, never import it from `src/`, never commit it.

## Database discipline

- Schema changes only through NEW files in `supabase/migrations/`. Never edit an applied migration.
- Every write policy on every table MUST gate through the SQL allowlist helper `is_admin()` (see existing migrations for the pattern). Policies are the security boundary.
- `supabase/checks/` contains verification SQL for policy behavior; keep it current when touching policies.

## Definition of done

`npm run lint` AND `npm run build` both pass. There is no test runner configured; rely on typecheck, lint, and manual verification notes when behavior changes.

## Commit style

Conventional Commits: English, imperative mood, concise subject (`feat(admin): ...`, `fix(catalog): ...`). No AI attribution or co-author trailers.
