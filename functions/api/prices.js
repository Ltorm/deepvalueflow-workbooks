// Cloudflare Pages Function — proxies Yahoo Finance quotes.
// Endpoint: /api/prices?tickers=BW,DDI,APLD,...
// - No API key needed (uses Yahoo's public chart endpoint).
// - Caches each ticker for 60s at the edge.
// - CORS open so any workbook page on this site can call it.
//
// Pages Functions docs: https://developers.cloudflare.com/pages/functions/

const TICKER_RE = /^[A-Z0-9.\-^]{1,10}$/;
const MAX_TICKERS = 50;
const CACHE_TTL = 60; // seconds

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CACHE_TTL}`,
      ...CORS,
      ...(init.headers || {}),
    },
  });
}

async function fetchOne(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const r = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; deepvalueflow-workbook/1.0; +https://deepvalueflow.com)",
      "accept": "application/json",
    },
    cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
  });
  if (!r.ok) return [ticker, { error: `yahoo ${r.status}` }];
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta) return [ticker, { error: "no data" }];
  return [
    ticker,
    {
      price: meta.regularMarketPrice ?? null,
      previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
      currency: meta.currency ?? "USD",
      exchange: meta.exchangeName ?? null,
      marketState: meta.marketState ?? null,
      ts: meta.regularMarketTime ?? null,
    },
  ];
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("tickers") || "";
  const tickers = [...new Set(raw.split(","))]
    .map((t) => t.trim().toUpperCase())
    .filter((t) => TICKER_RE.test(t));

  if (tickers.length === 0) {
    return json({ error: "missing or invalid `tickers` param" }, { status: 400 });
  }
  if (tickers.length > MAX_TICKERS) {
    return json({ error: `too many tickers (max ${MAX_TICKERS})` }, { status: 400 });
  }

  try {
    const results = await Promise.all(tickers.map(fetchOne));
    const prices = Object.fromEntries(results);
    return json({
      prices,
      fetchedAt: new Date().toISOString(),
      count: tickers.length,
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, { status: 502 });
  }
}
