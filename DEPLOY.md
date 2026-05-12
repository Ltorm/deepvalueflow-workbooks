# Deploy guide — Deep Value Flow workbooks

Total time: ~15 minutes the first time. Future updates are just `git push`.

---

## 1. Create the GitHub repo (~2 min)

1. Go to https://github.com/new
2. Repository name: `deepvalueflow-workbooks` (or whatever you like)
3. Set to **Public** (or Private — both work with Cloudflare Pages).
4. Don't initialize with README/license — we already have one.
5. Click **Create repository**.

GitHub will show you commands to push existing code. Open a terminal in the folder containing this file and run:

```bash
git init
git add .
git commit -m "Initial workbooks: RILY"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/deepvalueflow-workbooks.git
git push -u origin main
```

---

## 2. Sign up for Cloudflare (~2 min)

1. Go to https://dash.cloudflare.com/sign-up
2. Email + password. No credit card needed.
3. Verify your email (link in inbox).

---

## 3. Connect Cloudflare Pages to the repo (~5 min)

1. From the Cloudflare dashboard, click **Workers & Pages** in the left sidebar.
2. Click **Create** → **Pages** tab → **Connect to Git**.
3. Authorize Cloudflare's access to your GitHub account.
4. Select the `deepvalueflow-workbooks` repo.
5. Settings:
   - **Project name:** `workbooks` (becomes `workbooks.pages.dev`)
   - **Production branch:** `main`
   - **Framework preset:** **None**
   - **Build command:** *(leave empty)*
   - **Build output directory:** *(leave empty — uses repo root)*
6. Click **Save and Deploy**.

First deploy takes ~1 minute. When it's done:

- Visit `https://workbooks.pages.dev` — landing page.
- Visit `https://workbooks.pages.dev/rily.html` — RILY workbook with live prices.
- Visit `https://workbooks.pages.dev/api/prices?tickers=AAPL,MSFT` — should return JSON (proves the Function deployed).

If `/api/prices` returns 404, double-check the `functions/api/prices.js` path matches exactly (file-based routing — folder names matter).

---

## 4. (Optional) Custom subdomain (~5 min)

Skip this if `workbooks.pages.dev` is fine for now.

### If your domain registrar is *not* Cloudflare:

You can add a CNAME at your registrar pointing `workbooks.deepvalueflow.com` to `workbooks.pages.dev`. Cloudflare Pages will issue an SSL cert automatically. From the Pages project page → **Custom domains** → **Set up a custom domain** → paste `workbooks.deepvalueflow.com` and follow the prompts.

### If you want to move the whole apex domain to Cloudflare DNS:

This is a one-time hassle but unlocks Cloudflare's full toolkit. In the Cloudflare dashboard → **Add a site** → enter `deepvalueflow.com` → free plan → Cloudflare gives you two nameservers → update them at your current registrar (the Substack panel may have this; if not, wherever you registered the domain). Propagation takes 1–24 hours. Once active, custom-domain setup is one click from the Pages project.

---

## 5. Updating

To add a new workbook:

```bash
# in repo folder
cp rily.html newticker.html
# edit newticker.html — update data arrays at top of <script type="module"> block
# edit index.html — add a card linking to /newticker.html
git add .
git commit -m "Add NEWTICKER workbook"
git push
```

Cloudflare auto-deploys on every push to `main`. The new workbook is live in ~30 seconds.

---

## Sharing on Substack

Just paste the URL in your post. Substack will auto-generate a link preview using the `og:title` / `og:description` / `og:image` tags already in each workbook's `<head>`. To customize previews, edit those meta tags.

For embeds inside a post (rather than a link out), Substack doesn't allow custom iframes — your best bet is a screenshot + link.

---

## Troubleshooting

- **Prices show "Price fetch failed":** Open browser devtools → Network tab → reload. Check `/api/prices?tickers=...` request. If it 5xx's, Yahoo may have changed their endpoint. The Function source is `functions/api/prices.js` — easy to tweak.
- **Stale prices:** the proxy caches each ticker for 60s. Use the **↻ Refresh prices** button to bypass cache in the browser; server cache will refresh on its own after 60s.
- **High API volume:** Yahoo's public endpoints don't have hard rate limits but can rate-limit aggressively. If you start serving heavy traffic, swap the proxy to a real API (Twelve Data, Finnhub) by editing `functions/api/prices.js`.
