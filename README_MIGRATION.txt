Migrated from Vite to Next.js (App Router).

What was changed:
- React Router Link -> next/link in src/pages/*.tsx
- <Link to="..."> -> <Link href="...">
- Created app/ routes that re-export existing page components
- Moved Tailwind CSS import to app/globals.css (copied from src/index.css)
- Added Next.js config and Tailwind v4 PostCSS config

If CSS still looks broken locally:
1) delete node_modules + package-lock.json
2) npm install
3) ensure postcss.config.mjs contains @tailwindcss/postcss (not tailwindcss)
4) run npm run dev
