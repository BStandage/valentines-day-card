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

  // 1) Dynamic R2 images only – check for ID-specific subpaths
  if (rel.startsWith("assets/")) {
    const assetSubPath = rel.replace(/^assets\//, "");  // e.g. "solo/1.png" or "heart.png"

    // If it's one of your uploaded dynamic files (solo/, couple/), serve from R2
    if (assetSubPath.startsWith("solo/") || assetSubPath.startsWith("couple/")) {
      const key = `${id}/${assetSubPath}`;
      const obj = await env.R2.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { status: 200, headers });
    }

    // Otherwise, fall through to static assets (heart.png, petal.png, etc.)
  }

  // 2) Known pages – unchanged, using env.ASSETS.fetch
  const page = rel.replace(/\.html$/i, "");
  const isKnownPage = page === "captcha" || page === "heart" || page === "celebrate" || page === "yes";

  if (isKnownPage) {
    const assetUrl = new URL(request.url);
    assetUrl.pathname = `/${page}.html`;

    let upstream;
    try {
      upstream = await env.ASSETS.fetch(assetUrl);
    } catch (e) {
      console.error("ASSETS fetch error:", e);
      return new Response("Internal error", { status: 500 });
    }

    // Redirect handling – unchanged
    if (upstream.status >= 300 && upstream.status < 400) {
      let loc = upstream.headers.get("location");
      if (loc && loc.startsWith("/")) {
        const headers = new Headers(upstream.headers);
        headers.set("Location", `/c/${id}${loc}`);
        return new Response(null, { status: upstream.status, headers });
      }
    }

    if (upstream.ok && upstream.headers.get("content-type")?.includes("text/html")) {
      let html = await upstream.text();
      const patched = injectBase(html, `/c/${id}/`);

      const headers = new Headers(upstream.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.set("cache-control", "no-store");

      return new Response(patched, { status: upstream.status, headers });
    }

    return upstream;
  }

  // 3) All other requests (css/, js/, static assets/*, etc.) – use ASSETS
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/${rel}`;

  const upstream = await env.ASSETS.fetch(assetUrl);

  // Redirect rewrite if needed – unchanged
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