export async function onRequest({ request, env, params }) {
  const id = params.id;

  // [[path]] is usually an array of segments
  const segs = Array.isArray(params.path)
    ? params.path
    : (params.path ? [params.path] : []);

  const rel = segs.join("/"); // e.g. "assets/solo/1.png", "captcha.html", "captcha", "css/app.css"

  // If somehow called with no rel, just serve index route behavior
  if (!rel) {
    const u = new URL(request.url);
    u.pathname = "/index.html";
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

  // 2) Serve static files from site root, BUT keep URL under /c/<id>/ by rewriting redirects
  const url = new URL(request.url);
  url.pathname = `/${rel}`;

  // Prevent automatic redirect-follow so we can rewrite Location
  const upstream = await fetch(new Request(url.toString(), request), { redirect: "manual" });

  // If Pages tries to redirect /something.html -> /something, keep it under /c/<id>/
  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("Location") || upstream.headers.get("location");
    if (location && location.startsWith("/")) {
      const headers = new Headers(upstream.headers);
      // rewrite "/captcha" -> "/c/<id>/captcha"
      headers.set("Location", `/c/${id}${location}`);
      return new Response(null, { status: upstream.status, headers });
    }
  }

  return upstream;
}
