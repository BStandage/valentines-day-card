function injectBase(html, baseHref) {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="${baseHref}">`);
  }
  return `<!doctype html><html><head><base href="${baseHref}"></head><body>${html}</body></html>`;
}

export async function onRequest({ request, env, params }) {
  const id = params.id;

  const segs = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  let rel = segs.join("/"); // e.g. "assets/solo/1.png", "captcha", "captcha.html", "css/app.css"

  // If nothing, treat as captcha.html (but index.js should handle /c/<id>/)
  if (!rel) rel = "captcha.html";

  // 1) R2 images
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

  // 2) Normalize pretty page -> real html file (only for known pages)
  // If user hits /c/<id>/captcha, serve /captcha.html
  const page = rel.replace(/\.html$/i, "");
  const isKnownPage = page === "captcha" || page === "heart" || page === "celebrate" || page === "yes";

  if (isKnownPage) {
    // Always fetch the real .html from site root
    const u = new URL(request.url);
    u.pathname = `/${page}.html`;

    // Don't auto-follow redirects so we can rewrite Location if needed
    const upstream = await fetch(new Request(u.toString(), request), { redirect: "manual" });

    // If the static side redirects (/captcha.html -> /captcha), rewrite to /c/<id>/captcha
    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location") || upstream.headers.get("Location");
      if (loc && loc.startsWith("/")) {
        const headers = new Headers(upstream.headers);
        headers.set("Location", `/c/${id}${loc}`);
        return new Response(null, { status: upstream.status, headers });
      }
      return upstream;
    }

    // Serve the HTML but inject base so all relative links/assets stay under /c/<id>/
    const html = await upstream.text();
    const patched = injectBase(html, `/c/${id}/`);

    const headers = new Headers(upstream.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "no-store");

    return new Response(patched, { status: upstream.status, headers });
  }

  // 3) Everything else (css/, js/, etc.) -> serve from site root while staying under /c/<id>/
  const u = new URL(request.url);
  u.pathname = `/${rel}`;

  const upstream = await fetch(new Request(u.toString(), request), { redirect: "manual" });

  // Rewrite redirects to keep /c/<id>/ prefix
  if (upstream.status >= 300 && upstream.status < 400) {
    const loc = upstream.headers.get("location") || upstream.headers.get("Location");
    if (loc && loc.startsWith("/")) {
      const headers = new Headers(upstream.headers);
      headers.set("Location", `/c/${id}${loc}`);
      return new Response(null, { status: upstream.status, headers });
    }
  }

  return upstream;
}
