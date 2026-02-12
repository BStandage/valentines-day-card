export async function onRequest({ request, env, params }) {
  const id = params.id;

  // Serve the main page while keeping /c/<id>/ in the URL
  const url = new URL(request.url);
  url.pathname = "/index.html";
  return fetch(new Request(url.toString(), request));
}
