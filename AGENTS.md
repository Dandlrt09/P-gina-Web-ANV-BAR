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
| `npm test` | Vitest run (unit tests for pure domain logic) |
| `npm run preview` | Serve the production build locally |
| `npm run seed` | Seed products/categories from `content/products/*.json` into Supabase |

## Architecture

Screaming architecture: folders named after business capabilities, not frameworks.

```
src/
  app/          # bootstrap: App (hash routing + catalog gate + #/recovery), main.tsx, CSS brand tokens
  catalog/      # domain core: Product types + Supabase row mapping, load context/gate,
                # card/grid/detail/gallery/quick-view/featured UI,
                # contactChannels.ts + designerProfile.ts (live singletons)
  favorites/    # favorites page + likes persistence (localStorage personal list)
                # + likes-api.ts / useLikeCount.ts (aggregate like counts from Supabase)
  reviews/      # customer reviews: section, wizard, productReviews.ts (Supabase data layer)
  testimonials/ # shared testimonials CRUD/types module (Supabase)
  storefront/   # public landing sections: Nav, Hero, TrustBar, Designer,
                # Exclusivity, Testimonials, Contact, Footer; contact channels + WhatsApp helpers
  chat/         # floating ChatWidget + rule-based chatbot brain (reads live contact channels)
  admin/        # admin panel: auth context, login/recovery, product CRUD,
                # spreadsheet import, reviews/testimonials/designer/contact managers,
                # help system (src/admin/help); Supabase client-side admin data access
  shared/       # cross-cutting primitives: Container, Reveal animation, Supabase client
content/        # bundled JSON fallbacks (designer, contact) + build-time categories + seed source for products
supabase/       # SQL migrations, RLS policies, checks, seed script
public/imagenes/ # local photos referenced by seed JSONs
```

### Data flow

- **Products & categories**: fetched ONCE from Supabase before any route renders (`CatalogProvider` gate in `src/app/App.tsx`); consumers read the module singleton in `src/catalog/catalog.ts`. Kept LIVE afterwards: a shared realtime channel on `products`+`categories` triggers a debounced authoritative refetch that bumps a version counter exposed through CatalogContext, so all `useCatalog()` consumers re-render without reloading.
- **Product reviews**: stored in Supabase table `product_reviews` (RLS: public read, anonymous INSERT, admin reply/delete gated by `is_admin()`), realtime per-product; moderated at `#/admin/comentarios`.
- **Testimonials**: loaded LIVE from Supabase table `testimonials` (RLS public read, admin-write-only) with realtime updates; managed at `#/admin/testimonios`.
- **Designer profile**: loaded LIVE from Supabase table `designer_profile` (singleton row id=1; RLS public read, admin-update-only) with realtime updates; managed at `#/admin/disenadora`. `content/designer.json` stays bundled as the silent fallback shown until the DB read resolves.
- **Contact channels**: loaded LIVE from Supabase table `contact_channels` with `content/contact.json` as the bundled fallback; realtime keeps the Contact section AND the chatbot's answers in sync when the owner edits channels.
- **Likes/favorites**: each visitor's personal favorites list stays in localStorage (`anv-*` keys). Aggregated anonymous like counts live in Supabase table `product_likes` (`product_id` + anonymous `client_id`, one row per visitor per product); cards/detail show "N favoritos" (hidden at zero). Like/unlike sync is fire-and-forget — backend failure never breaks the local UX.
- **Categories** are a presentation contract: canonical tuple lives in `src/catalog/catalog.ts`; the seed validates the database against it.

### Admin routes

Registered in `src/admin/AdminApp.tsx`: dashboard `#/admin`, `#/admin/login`, `#/admin/productos` (+ nuevo/editar), `#/admin/importar` (spreadsheet import), `#/admin/comentarios` (review moderation), `#/admin/testimonios`, `#/admin/disenadora`, `#/admin/contacto`, `#/admin/ayuda` (self-contained static help, opened via "?" button in a dedicated tab; owner contact block reads live singletons).

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
- Every write policy on every table MUST gate through the SQL allowlist helper `is_admin()` (see existing migrations for the pattern). Policies are the security boundary. EXCEPTION: `product_reviews` INSERT (anonymous customer reviews) and `product_likes` SELECT/INSERT/DELETE (anonymous aggregate likes keyed by a random client UUID) are deliberately open to anon — no identity exists for visitors; document any new anon-write surface this way.
- Realtime requires the relevant tables enabled in the Supabase Dashboard replication publication (`Database → Replication`). Handlers always refetch authoritatively, so REPLICA IDENTITY FULL is only needed where DELETE payloads must carry old row data (see `product_reviews` migration).
- `supabase/checks/` contains verification SQL for policy behavior; keep it current when touching policies.

## Definition of done

`npm run lint`, `npm test`, AND `npm run build` all pass. Unit tests cover pure domain logic (price formatting, catalog ordering, WhatsApp links, chatbot brain); add tests alongside new pure modules (`*.test.ts` co-located, Vitest node environment).

## Commit style

Conventional Commits: English, imperative mood, concise subject (`feat(admin): ...`, `fix(catalog): ...`). No AI attribution or co-author trailers.
