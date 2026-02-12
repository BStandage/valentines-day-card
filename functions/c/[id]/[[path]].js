// functions/c/[id]/[[path]].js   (or wherever your onRequest lives)

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

  if (!rel) rel = "captcha.html";

  // 1) R2 images — unchanged, but added logging for debug (remove later if you want)
  if (rel.startsWith("assets/")) {
    const assetPath = rel.replace(/^assets\//, ""); // "solo/1.png" or "couple/couple.png"
    const key = `${id}/${assetPath}`;
    console.log(`Serving image: key = ${key}`); // ← helps in Pages logs

    const obj = await env.R2.get(key);
    if (!obj) {
      console.log(`Image not found: ${key}`);
      return new Response("Image not found", { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { status: 200, headers });
  }

  // 2) Serve known pages with embedded HTML + base injection
  const page = rel.replace(/\.html$/i, "");
  const isKnownPage = page === "captcha" || page === "heart" || page === "celebrate" || page === "yes";

  if (isKnownPage) {
    // Embedded HTML for captcha (add the others similarly if needed)
    let htmlContent = "";

    if (page === "captcha") {
      htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Challenge</title>
  <link rel="stylesheet" href="css/app.css" />
</head>
<body class="bg-swish">
  <main class="page page--center">
    <section class="panel" role="region" aria-label="image challenge panel">
      <header class="panelHeader">
        <div class="panelSmall">Select all images with</div>
        <div class="panelTitle">your valentine</div>
        <div class="panelSub">Click verify once there are none left.</div>
      </header>

      <div class="panelBody">
        <div id="grid" class="grid" aria-label="captcha grid"></div>
        <div id="msg" class="msg" aria-live="polite"></div>
      </div>

      <footer class="panelFooter">
        <div class="icons" aria-hidden="true">
          <span class="icon" title="Refresh">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M17.65 6.35A7.95 7.95 0 0012 4a8 8 0 108 8h-2a6 6 0 11-1.76-4.24L14 10h6V4l-2.35 2.35z"></path>
            </svg>
          </span>
          <span class="icon" title="Audio">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 3a7 7 0 00-7 7v7a3 3 0 003 3h1v-2H8a1 1 0 01-1-1v-7a5 5 0 0110 0v7a1 1 0 01-1 1h-1v2h1a3 3 0 003-3v-7a7 7 0 00-7-7z"></path>
            </svg>
          </span>
          <span class="icon" title="Info">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M11 10h2v7h-2v-7zm0-3h2v2h-2V7z"></path>
              <path d="M12 2a10 10 0 1010 10A10.01 10.01 0 0012 2zm0 18a8 8 0 118-8 8.01 8.01 0 01-8 8z"></path>
            </svg>
          </span>
        </div>

        <button id="verifyBtn" class="verifyBtn" type="button">VERIFY</button>
      </footer>
    </section>
  </main>

  <script src="js/captcha.js"></script>
</body>
</html>`;
    } else if (page === "heart") {
      // Add your heart.html content here as a string (same for celebrate, yes)
      htmlContent = `... your heart page HTML ...`;
    } // etc. for other pages

    if (!htmlContent) {
      return new Response("Page not implemented", { status: 501 });
    }

    const patched = injectBase(htmlContent, `/c/${id}/`);

    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });

    return new Response(patched, { status: 200, headers });
  }

  // 3) Everything else (css/, js/, etc.) → proxy from root — unchanged
  const u = new URL(request.url);
  u.pathname = `/${rel}`;

  const upstream = await fetch(new Request(u.toString(), request), { redirect: "manual" });

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