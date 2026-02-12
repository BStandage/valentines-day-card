export async function onRequest({ request, env, params }) {
  const id = params.id;

  // [[path]] comes in as an array of segments for multi-segment matches.
  // e.g. /c/abc/assets/solo/1.png -> ["assets","solo","1.png"]
  const segments = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  const rel = segments.join("/"); // "assets/solo/1.png", "css/app.css", "js/index.js", etc.

  // If somehow we got here with no rel, just serve index.html
  if (!rel) {
    const url = new URL(request.url);
    url.pathname = "/index.html";
    return fetch(new Request(url.toString(), request));
  }

  // 1) Per-card images from R2
  // /c/<id>/assets/solo/1.png -> R2 key: <id>/solo/1.png
  // /c/<id>/assets/couple/couple.png -> R2 key: <id>/couple/couple.png
  if (rel.startsWith("assets/")) {
    const r2Key = `${id}/${rel.replace(/^assets\//, "")}`;

    const obj = await env.R2.get(r2Key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(obj.body, { status: 200, headers });
  }

  // 2) Everything else: serve your static site files from the Pages root
  // /c/<id>/css/app.css -> /css/app.css
  // /c/<id>/js/index.js -> /js/index.js
  // /c/<id>/heart.html  -> /heart.html
  const url = new URL(request.url);
  url.pathname = `/${rel}`;
  return fetch(new Request(url.toString(), request));
}
