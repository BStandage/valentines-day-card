export async function onRequestGet() {
  return new Response("OK. POST multipart/form-data to /api/create", { status: 200 });
}

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return new Response("Expected multipart/form-data", { status: 400 });
  }

  const form = await request.formData();

  const couple = form.get("couple");
  const solos = form.getAll("solo");

  if (!(couple instanceof File)) {
    return new Response("Missing 'couple' file", { status: 400 });
  }
  if (!Array.isArray(solos) || solos.length !== 9 || !solos.every(f => f instanceof File)) {
    return new Response("Need exactly 9 files under 'solo'", { status: 400 });
  }

  // Basic size guard
  const maxBytes = 5 * 1024 * 1024; // 5MB each
  if (couple.size > maxBytes || solos.some(f => f.size > maxBytes)) {
    return new Response("One or more files too large (max 5MB each)", { status: 413 });
  }

  // Simple URL-safe ID
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);

  async function put(key, file) {
    await env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }

  // Store couple (force key name to match your frontend expectation)
  await put(`${id}/couple/couple.png`, couple);

  // Store 9 solo images mapped to 1.png..9.png keys
  for (let i = 0; i < 9; i++) {
    await put(`${id}/solo/${i + 1}.png`, solos[i]);
  }

  // Optional metadata
  await env.CARDS.put(`card:${id}`, JSON.stringify({ created: Date.now() }));

  const origin = new URL(request.url).origin;
  return Response.json({ id, url: `${origin}/c/${id}/` });
}
