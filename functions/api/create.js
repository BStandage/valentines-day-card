export function onRequestGet() {
  return new Response(
    "OK. POST multipart/form-data to /api/create with fields: couple (1 file), solo (9 files).",
    { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
}

export async function onRequestPost({ request, env }) {
  // Make binding issues obvious
  if (!env.R2 || typeof env.R2.put !== "function") {
    return new Response("Server misconfigured: R2 binding 'R2' not available.", { status: 500 });
  }
  if (!env.CARDS || typeof env.CARDS.put !== "function") {
    return new Response("Server misconfigured: KV binding 'CARDS' not available.", { status: 500 });
  }

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

  // Size guard
  const maxBytes = 5 * 1024 * 1024; // 5MB each
  if (couple.size > maxBytes || solos.some(f => f.size > maxBytes)) {
    return new Response("One or more files too large (max 5MB each)", { status: 413 });
  }

  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);

  async function put(key, file) {
    await env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }

  // Store under keys your router expects
  await put(`${id}/couple/couple.png`, couple);
  for (let i = 0; i < 9; i++) {
    await put(`${id}/solo/${i + 1}.png`, solos[i]);
  }

  await env.CARDS.put(`card:${id}`, JSON.stringify({ created: Date.now() }));

  // IMPORTANT: always return the *main* hostname, not a preview/hash hostname
  const shareUrl = `https://valentines-day-card.pages.dev/c/${id}/`;

  return Response.json({ id, url: shareUrl });
}
