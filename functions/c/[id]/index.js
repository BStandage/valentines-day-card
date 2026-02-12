// functions/c/[id]/index.js

const ENTRY = "/index.html";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  // Ensure trailing slash (nice URLs, consistent relative behavior)
  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
    return Response.redirect(url.toString(), 301);
  }

  // Serve the normal entry HTML from the static site root
  // but *at* /c/:id/
  return context.env.ASSETS.fetch(new Request(new URL(ENTRY, url.origin)));
}
