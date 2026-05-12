// Cloudflare Pages Function — fetches the Substack RSS feed and returns it as JSON.
// Endpoint: /api/blog?limit=4
// Used by the landing page to show recent posts.

const RSS_URL = "https://deepvalueflow.com/feed";
const CACHE_TTL = 600; // 10 minutes

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
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

// Pull text between <tag>...</tag>. Handles CDATA.
function tagContent(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

// Strip HTML, collapse whitespace, trim to maxChars.
function snippet(html, maxChars = 240) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text;
}

// Find first <img src="..."> in HTML.
function firstImage(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "4", 10) || 4, 12);

  try {
    const r = await fetch(RSS_URL, {
      headers: { "user-agent": "deepvalueflow-workbook/1.0" },
      cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
    });
    if (!r.ok) return json({ error: `rss ${r.status}`, posts: [] }, { status: 502 });
    const xml = await r.text();

    // Split into <item> blocks.
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) && items.length < limit) {
      const block = m[1];
      const title = tagContent(block, "title");
      const link = tagContent(block, "link");
      const pubDate = tagContent(block, "pubDate");
      const description = tagContent(block, "description");
      const content = tagContent(block, "content:encoded") || description;
      // Try multiple ways Substack exposes images:
      // 1) <enclosure url="...">
      // 2) <media:content url="...">
      // 3) first <img> in description/content
      let image = null;
      const encMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (encMatch) image = encMatch[1];
      if (!image) {
        const medMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        if (medMatch) image = medMatch[1];
      }
      if (!image) image = firstImage(content);
      items.push({
        title,
        link,
        pubDate,
        snippet: snippet(content),
        image,
      });
    }

    return json({
      posts: items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String(e?.message || e), posts: [] }, { status: 500 });
  }
}
