# ANV·BAR Web

Static marketing site for **ANV·BAR**, a handmade women's fashion brand (Colombia). No backend, no cart, no payments: catalog, product fichas, and WhatsApp ordering.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first `@theme` tokens in `src/index.css`)
- Fonts bundled via Fontsource: Fraunces Variable (display) + Manrope (sans)

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
npm run lint      # oxlint
```

## Structure

```
src/
  components/Container.tsx   # horizontal layout primitive
  components/Section.tsx     # vertical section primitive
  App.tsx                    # shell skeleton
  index.css                  # @theme design tokens (palette + typography)
```

UI copy is neutral Spanish; design tokens live only in `src/index.css`.