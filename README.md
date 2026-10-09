# nitopath.com

Served by GitHub Pages (Jekyll, built automatically on push to `main`).

- Pages: `index.html`, `features.html`, `pricing.html`, `faq.md`, `support.md`, `delete-account.md`, `news/`
- Shared header and footer: `_includes/`, layouts in `_layouts/`, styles in `assets/site.css`
- News posts: add `_posts/YYYY-MM-DD-title.md` with `layout: post` and a `title`
- `privacy-policy.html` and `terms-of-service.html` are generated in the app repo by
  `node scripts/export-legal.mjs`; copy them here unchanged. `reset.html` and `confirmed.html`
  are used by Supabase email links. Files without front matter are copied as-is.
