# Deep Value Flow — Workbooks

Static site of interactive SOTP valuation workbooks.

- `index.html` — landing page listing all workbooks.
- `rily.html` — RILY / BRC Group Holdings SOTP.
- `shared/prices.js` — price-fetcher module imported by every workbook.
- `functions/api/prices.js` — Cloudflare Pages Function that proxies Yahoo Finance.

To add a new workbook:

1. Copy `rily.html` → `<ticker>.html`. Update the data arrays at the top of the `<script type="module">` block.
2. Add a `<a class="card">` block to `index.html`.
3. Commit and push. Cloudflare Pages auto-deploys.

See [`DEPLOY.md`](./DEPLOY.md) for first-time deployment.

**Not investment advice.**
