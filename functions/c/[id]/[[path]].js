const PAGE_SET = new Set(["captcha", "heart", "celebrate", "yes"]);

function injectBase(html, baseHref) {
  // Put <base> right after <head> (or create a head if somehow missing)
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="${baseHref}">`);
  }
  return `<!doctype html><html><head><base href="${baseHref}"></head><body>${html}</body></html>`;
}

export async function onRequest({ request, env, params }) {
  const id = params.id;

  // [[path]] comes in as array-of-segments (or empty)
  const segs = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  let rel = segs.join("/"); // e.g. "", "captcha", "captcha.html", "css/app.css", "assets/solo/1.png"

  // If they visit /c/<id>/, serve captcha (entry)
  if (!rel) rel = "captcha";

  // Normalize "pretty page" to a page name (captcha/heart/celebrate/yes)
  // Handles /c/<id>/captcha or /c/<id>/captcha.html
  let pageName = null;
  if (rel.endsWith(".html")) {
    pageName = rel.replace(/\.html$/i, "");
  } else if (!rel.includes("/")) {
    pageName = rel;
  }

  // 1) Per-card assets from R2
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

  // 2) Serve HTML pages, but INJECT <base href="/c/<id>/">
  // This fixes CSS/JS/image paths no matter what the browser URL is.
  if (pageName && PAGE_SET.has(pageName)) {
    const u = new URL(request.url);
    u.pathname = `/${pageName}.html`;

    const upstream = await fetch(new Request(u.toString(), request));
    const html = await upstream.text();

    const baseHref = `/c/${id}/`;
    const patched = injectBase(html, baseHref);

    const headers = new Headers(upstream.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    // avoid caching HTML per-id while you iterate
    headers.set("cache-control", "no-store");

    return new Response(patched, { status: upstream.status, headers });
  }

  // 3) Everything else (css/, js/, images not in /assets/...) -> serve from site root
  // Example: /c/<id>/css/app.css should return /css/app.css
  const u = new URL(request.url);
  u.pathname = `/${rel}`;
  return fetch(new Request(u.toString(), request));
}
