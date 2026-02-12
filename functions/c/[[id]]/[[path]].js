export async function onRequest({ request, env, params }) {
  const id = params.id;
  const path = params.path || "";

  // 1) Serve per-card images from R2
  // Your frontend asks for: assets/solo/1.png .. 9.png and assets/couple/couple.png
  if (path.startsWith("assets/")) {
    // Map /c/<id>/assets/solo/1.png  ->  <id>/solo/1.png in R2
    // Map /c/<id>/assets/couple/couple.png -> <id>/couple/couple.png in R2
    const rel = path.replace(/^assets\//, ""); // solo/1.png or couple/couple.png
    const key = `${id}/${rel}`;

    const obj = await env.R2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    // Allow caching (safe because ID is immutable)
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(obj.body, { headers });
  }

  // 2) For everything else under /c/<id>/..., serve your static site files
  // We basically rewrite:
  //   /c/<id>/         -> /index.html
  //   /c/<id>/heart.html -> /heart.html
  //   /c/<id>/script.js  -> /script.js
  const url = new URL(request.url);
  const targetPath = (path === "" ? "index.html" : path);
  url.pathname = `/${targetPath}`;

  return fetch(new Request(url.toString(), request));
}
