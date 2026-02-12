export async function onRequest({ request, env, params }) {
  const id = params.id;

  // For [[path]] (double brackets), params.path is an ARRAY of segments. :contentReference[oaicite:4]{index=4}
  const segments = Array.isArray(params.path) ? params.path : [];
  const path = segments.join("/"); // e.g. "assets/solo/1.png" or "css/app.css"

  // 1) Per-card images: /c/<id>/assets/... -> R2 key: <id>/...
  if (path.startsWith("assets/")) {
    const rel = path.slice("assets/".length); // "solo/1.png" or "couple/couple.png"
    const key = `${id}/${rel}`;               // "<id>/solo/1.png", "<id>/couple/couple.png"

    const obj = await env.R2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  }

  // 2) Everything else: serve static files from your Pages site
  // /c/<id>/css/app.css -> /css/app.css
  // /c/<id>/js/index.js -> /js/index.js
  // /c/<id>/heart.html  -> /heart.html
  const url = new URL(request.url);
  url.pathname = `/${path}`;
  return fetch(new Request(url.toString(), request));
}
