// Shared price fetcher used by every workbook on the site.
// Hits our own /api/prices endpoint (a Cloudflare Pages Function that proxies Yahoo Finance).

const ENDPOINT = "/api/prices";
const LS_KEY = "dvf_prices_cache_v1";
const STALE_MS = 60_000; // 60s — match server-side cache

export async function fetchPrices(tickers) {
  if (!Array.isArray(tickers) || tickers.length === 0) return {};
  const list = [...new Set(tickers.map((t) => String(t).toUpperCase()))];
  const qs = encodeURIComponent(list.join(","));
  const r = await fetch(`${ENDPOINT}?tickers=${qs}`);
  if (!r.ok) throw new Error(`prices: HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`prices: ${j.error}`);
  return j; // { prices: {TKR:{price,previousClose,...}}, fetchedAt }
}

// Convenience wrapper: returns just a {TKR: price} map and caches in localStorage.
export async function priceMap(tickers, { force = false } = {}) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.ts < STALE_MS) {
    // see if cache already has all requested
    const have = Object.keys(cached.map);
    if (tickers.every((t) => have.includes(t.toUpperCase()))) {
      return { map: cached.map, fetchedAt: new Date(cached.ts).toISOString(), fromCache: true };
    }
  }
  const { prices, fetchedAt } = await fetchPrices(tickers);
  const map = {};
  for (const [tkr, info] of Object.entries(prices || {})) {
    if (info && typeof info.price === "number") map[tkr] = info.price;
  }
  writeCache({ map, ts: Date.now() });
  return { map, fetchedAt, fromCache: false };
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function writeCache(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch {}
}
