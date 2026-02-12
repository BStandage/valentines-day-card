export async function onRequest({ request, env, params }) {
  const id = params.id;

  // [[path]] is an array of segments
  const segs = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  let rel = segs.join("/"); // e.g. "assets/solo/1.png", "captcha", "captcha.html", "css/app.css"

  // If somehow no rel, serve the entry page (we’ll keep this consistent)
  if (!rel) {
    const u = new URL(request.url);
    u.pathname = "/captcha.html";
    return fetch(new Request(u.toString(), request));
  }

  // 1) Per-card images from R2
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

  // 2) Fix "pretty URL" pages -> actual html filenames
  // If the browser hits /c/<id>/captcha (no extension), we MUST serve /captcha.html
  // Same for heart/celebrate/yes.
  if (!rel.includes(".") && !rel.endsWith("/")) {
    const page = rel.split("/")[0]; // just in case someone does "captcha?x=1" etc.
    if (page === "captcha" || page === "heart" || page === "celebrate" || page === "yes") {
      rel = `${page}.html`;
    }
  }

  // 3) Serve static files from site root
  const u = new URL(request.url);
  u.pathname = `/${rel}`;

  return fetch(new Request(u.toString(), request));
}
