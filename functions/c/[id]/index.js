export async function onRequest({ params }) {
  const id = params.id;
  return Response.redirect(`/c/${id}/captcha.html`, 302);
}
