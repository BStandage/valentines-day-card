(function () {
  const layer = document.getElementById("petals");
  if (!layer) return;

  const PETAL_SRC = "assets/petal.png";

  const MAX_PETALS = 34;          // simultaneous petals
  const SPAWN_EVERY_MS = 170;     // spawn frequency
  const MIN_SIZE = 10;
  const MAX_SIZE = 24;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }
  function randi(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function spawnOne() {
    if (layer.childElementCount >= MAX_PETALS) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const el = document.createElement("div");
    el.className = "petal";

    const size = randi(MIN_SIZE, MAX_SIZE);

    // start slightly above the top
    const startX = rand(-40, vw + 40);
    const startY = rand(-120, -30);

    // fall beyond bottom
    const fall = vh + rand(180, 360);

    // drift + sway amplitude
    const driftX = rand(-160, 160);
    const sway = rand(10, 26);

    // rotation
    const rot0 = rand(-180, 180);
    const rot1 = rot0 + rand(-720, 720);

    // timing
    const dur = rand(5200, 9800);
    const delay = rand(0, 240);

    // appearance
    const op = rand(0.55, 0.92);
    const blur = rand(0, 0.9);

    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;

    el.style.setProperty("--size", `${size}px`);
    el.style.setProperty("--fall", `${fall}px`);
    el.style.setProperty("--drift", `${driftX}px`);
    el.style.setProperty("--sway", `${sway}px`);
    el.style.setProperty("--rot0", `${rot0}deg`);
    el.style.setProperty("--rot1", `${rot1}deg`);
    el.style.setProperty("--dur", `${dur}ms`);
    el.style.setProperty("--delay", `${delay}ms`);
    el.style.setProperty("--op", `${op}`);
    el.style.setProperty("--blur", `${blur}px`);

    const img = document.createElement("img");
    img.src = PETAL_SRC;
    img.alt = "";
    img.draggable = false;

    el.appendChild(img);
    layer.appendChild(el);

    window.setTimeout(() => el.remove(), dur + delay + 400);
  }

  // Kickstart: spawn a few immediately so you *see* it
  for (let i = 0; i < 10; i++) spawnOne();

  window.setInterval(() => {
    // spawn a couple per tick for a nice density
    spawnOne();
    if (Math.random() < 0.45) spawnOne();
  }, SPAWN_EVERY_MS);
})();
