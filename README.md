# nitopath.com

Served by GitHub Pages (Jekyll, built automatically on push to `main`).

- Pages: `index.html`, `features.html`, `pricing.html`, `faq.md`, `support.md`, `delete-account.md`, `news/`
- Shared header and footer: `_includes/`, layouts in `_layouts/`, styles in `assets/site.css`
- News posts: add `_posts/YYYY-MM-DD-title.md` with `layout: post` and a `title`
- `privacy-policy.html` and `terms-of-service.html` are generated in the app repo by
  `node scripts/export-legal.mjs`; copy them here unchanged. `reset.html` and `confirmed.html`
  are used by Supabase email links. Files without front matter are copied as-is.

## Camera coverage (homepage 3D map, live numbers, state pages)

- `scripts/build-coverage.mjs` counts mapped cameras per half-degree square from NitoPath's public
  `cameras` function and writes `assets/data/coverage.json` (the 3D map), `_data/coverage.json`
  (totals and rankings for Jekyll) and `states/<state>.html` (one page per state, drawn by `_layouts/state.html`).
- `.github/workflows/refresh-coverage.yml` runs it every day at 09:17 UTC and commits the new numbers.
  Run it by hand from the Actions tab, or locally: `npm ci && npm run coverage`.
- The map itself is `assets/coverage.js` (three.js, vendored in `assets/vendor/`). `assets/coverage-poster.webp`
  is the still shown while it loads and on devices without WebGL.
- "Cameras near you" (`assets/near.js`) calls the `geocode` and `cameras` functions live from the browser.
