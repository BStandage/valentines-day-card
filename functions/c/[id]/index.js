export async function onRequest({ request }) {
  const url = new URL(request.url);
  url.pathname = "/index.html";
  return fetch(new Request(url.toString(), request));
}
