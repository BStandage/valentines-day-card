export async function onRequest({ request, env, params }) {
  const id = params.id;
  const path = (params.path || "").toString(); // can be "" for /c/<id>/

  // 1) Per-card images: /c/<id>/assets/... -> R2 key: <id>/...
  if (path.startsWith("assets/")) {
    const rel = path.replace(/^assets\//, ""); // solo/1.png or couple/couple.png
    const key = `${id}/${rel}`;                // <id>/solo/1.png etc.

    const obj = await env.R2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  }

  // 2) Everything else: serve static files from the Pages site
  // Map:
  //   /c/<id>/           -> /index.html
  //   /c/<id>/heart.html -> /heart.html
  //   /c/<id>/css/app.css -> /css/app.css
  //   /c/<id>/js/index.js  -> /js/index.js
  const url = new URL(request.url);
  const target = path === "" ? "index.html" : path;
  url.pathname = `/${target}`;

  return fetch(new Request(url.toString(), request));
}
