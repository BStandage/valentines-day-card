export async function onRequest({ request }) {
  const u = new URL(request.url);
  u.pathname = "/captcha.html";
  return fetch(new Request(u.toString(), request));
}
