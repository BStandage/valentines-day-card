export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
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

  // Basic size guard (tweak as you want)
  const maxBytes = 5 * 1024 * 1024;
  if (couple.size > maxBytes || solos.some(f => f.size > maxBytes)) {
    return new Response("One or more files too large (max 5MB each)", { status: 413 });
  }

  // Simple ID (URL-safe). Good enough for MVP.
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);

  // Helper to store as PNG bytes (we store as-is; user can upload png/jpg; content-type preserved)
  async function put(key, file) {
    await env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }

  await put(`${id}/couple/couple.png`, couple);

  // Keep your existing naming convention 1.png..9.png (but we’re generating them)
  for (let i = 0; i < 9; i++) {
    await put(`${id}/solo/${i + 1}.png`, solos[i]);
  }

  // Optional: record created time
  await env.CARDS.put(`card:${id}`, JSON.stringify({ created: Date.now() }));

  const url = new URL(request.url);
  const shareUrl = `${url.origin}/c/${id}/`;

  return Response.json({ id, url: shareUrl });
}
