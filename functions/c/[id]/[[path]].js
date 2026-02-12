function injectBase(html, baseHref) {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="${baseHref}">`);
  }
  return `<!doctype html><html><head><base href="${baseHref}"></head><body>${html}</body></html>`;
}

export async function onRequest(context) {
  const { request, env, params } = context;

  const id = params.id;

  const segs = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  let rel = segs.join("/");

  if (!rel) rel = "captcha.html";

  // 1) R2 images – unchanged, good
  if (rel.startsWith("assets/")) {
    const key = `${id}/${rel.replace(/^assets\//, "")}`;
    const obj = await env.R2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { status: 200, headers });
  }

  // 2) Known pages: fetch via env.ASSETS.fetch with adjusted path
  const page = rel.replace(/\.html$/i, "");
  const isKnownPage = page === "captcha" || page === "heart" || page === "celebrate" || page === "yes";

  if (isKnownPage) {
    // Construct URL for the static file at root
    const assetUrl = new URL(request.url);
    assetUrl.pathname = `/${page}.html`;  // exact file name in your build output

    // Fetch via ASSETS binding – this is the key fix
    let upstream;
    try {
      upstream = await env.ASSETS.fetch(assetUrl);
    } catch (e) {
      console.error("ASSETS fetch failed:", e);
      return new Response("Internal error fetching page", { status: 500 });
    }

    // Handle any redirects from static side (e.g. /captcha.html → /captcha)
    if (upstream.status >= 300 && upstream.status < 400) {
      let loc = upstream.headers.get("location");
      if (loc && loc.startsWith("/")) {
        // Rewrite redirect to stay under /c/[id]/
        const headers = new Headers(upstream.headers);
        headers.set("Location", `/c/${id}${loc}`);
        return new Response(null, { status: upstream.status, headers });
      }
    }

    // If not redirect, patch HTML with <base>
    if (upstream.ok && upstream.headers.get("content-type")?.includes("text/html")) {
      let html = await upstream.text();
      const patched = injectBase(html, `/c/${id}/`);

      const headers = new Headers(upstream.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.set("cache-control", "no-store");  // or adjust if you want caching

      return new Response(patched, { status: upstream.status, headers });
    }

    // Fallback: just pass through if not HTML or error
    return upstream;
  }

  // 3) Other static files (css/js/etc) – use ASSETS instead of external fetch
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/${rel}`;

  const upstream = await env.ASSETS.fetch(assetUrl);

  // Optional: rewrite redirects if any
  if (upstream.status >= 300 && upstream.status < 400) {
    let loc = upstream.headers.get("location");
    if (loc && loc.startsWith("/")) {
      const headers = new Headers(upstream.headers);
      headers.set("Location", `/c/${id}${loc}`);
      return new Response(null, { status: upstream.status, headers });
    }
  }

  return upstream;
}