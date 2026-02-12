export async function onRequest({ request, env, params }) {
  const id = params.id;
  const path = (params.path || "").toString(); // wildcard part after /c/<id>/

  // If someone hits /c/<id>/ with no trailing path, path will be "" or undefined
  const normalized = path === "" ? "" : path;

  // 1) Per-card images: /c/<id>/assets/... -> R2 key: <id>/...
  if (normalized.startsWith("assets/")) {
    const rel = normalized.replace(/^assets\//, ""); // solo/1.png or couple/couple.png
    const key = `${id}/${rel}`;                       // <id>/solo/1.png etc.

    const obj = await env.R2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  }

  // 2) Serve your static files while keeping /c/<id>/ in the URL
  // Map:
  //   /c/<id>/           -> /index.html
  //   /c/<id>/heart.html -> /heart.html
  //   /c/<id>/css/app.css -> /css/app.css
  //   /c/<id>/js/index.js  -> /js/index.js
  const url = new URL(request.url);

  // If normalized is empty, serve index.html
  const target = normalized === "" ? "index.html" : normalized;
  url.pathname = `/${target}`;

  return fetch(new Request(url.toString(), request));
}
