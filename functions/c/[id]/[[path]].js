// functions/c/[id]/[[path]].js

export async function onRequestGet(context) {
  const { request, env, params } = context;

  const id = params.id;

  // For [[path]] Cloudflare gives an array of segments (or undefined).
  // Example: /c/abc/solo/1.png -> ["solo","1.png"]
  const segs = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const rel = segs.join("/"); // e.g. "assets/solo/1.png" or "css/app.css"

  // If someone hits /c/:id with no extra segments, treat it like /c/:id/
  if (!rel) {
    const url = new URL(request.url);
    url.pathname = `/c/${id}/`;
    return Response.redirect(url.toString(), 301);
  }

  // 1) Images: /c/:id/assets/...
  if (rel.startsWith("assets/")) {
    // Map:
    //  /c/:id/assets/solo/1.png -> R2 key: :id/solo/1.png
    //  /c/:id/assets/couple/couple.png -> R2 key: :id/couple/couple.png
    const r2Key = `${id}/${rel.replace(/^assets\//, "")}`;

    const obj = await env.R2.get(r2Key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    // your create.js sets cache-control, but set a safe default if missing
    if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(obj.body, { status: 200, headers });
  }

  // 2) Everything else: serve from your static site root
  // Example:
  //  /c/:id/css/app.css  -> serve /css/app.css
  //  /c/:id/js/index.js  -> serve /js/index.js
  //  /c/:id/heart.html   -> serve /heart.html
  const url = new URL(request.url);
  const staticUrl = new URL(`/${rel}`, url.origin);

  return env.ASSETS.fetch(new Request(staticUrl.toString(), request));
}
