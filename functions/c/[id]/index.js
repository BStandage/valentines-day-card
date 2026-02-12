export async function onRequest({ request }) {
  const u = new URL(request.url);

  // IMPORTANT: use the pretty URL so Pages doesn't redirect
  u.pathname = "/captcha";

  return fetch(new Request(u.toString(), request));
}
