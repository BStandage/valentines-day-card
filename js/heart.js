const heartBtn = document.getElementById("heartBtn");
const burstLayer = document.getElementById("burstLayer");
const hint = document.getElementById("hint");

const NEXT_PAGE_URL = "celebrate.html";

// clicks feel good already; keep
const CLICKS_TO_WIN = 18;

// decay: fair
const GRACE_MS = 320;
const DECAY_CLICKS_PER_SEC = 3.2;

// confetti + redirect timing
const CONFETTI_SPAWN_MS = 2200;
const REDIRECT_MS = 2800;

// visual tuning
const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const SHAKE_START = Math.floor(CLICKS_TO_WIN * 0.60);
const SHAKE_MAX_PX = 10;
const ROT_MAX_DEG = 12;

let progress = 0;
let exploded = false;

let lastTs = performance.now();
let lastClickTs = 0;

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }

function setHint(text) {
  if (hint) hint.textContent = text || "";
}

function update(now) {
  const dt = (now - lastTs) / 1000;
  lastTs = now;

  if (!exploded) {
    const msSinceClick = now - lastClickTs;
    if (msSinceClick > GRACE_MS) {
      progress -= DECAY_CLICKS_PER_SEC * dt;
      progress = clamp(progress, 0, CLICKS_TO_WIN);
    }
  }

  const t = progress / CLICKS_TO_WIN;
  const scale = lerp(MIN_SCALE, MAX_SCALE, t);

  let tx = 0, ty = 0, rot = 0;
  if (progress >= SHAKE_START) {
    const tt = (progress - SHAKE_START) / (CLICKS_TO_WIN - SHAKE_START);
    const amp = lerp(0, SHAKE_MAX_PX, tt);
    const rotAmp = lerp(0, ROT_MAX_DEG, tt);
    tx = rand(-amp, amp);
    ty = rand(-amp, amp);
    rot = rand(-rotAmp, rotAmp);
  }

  heartBtn.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`;

  if (!exploded) {
    if (progress <= 0) setHint("Continuously tap the heart. Be fast!");
    else if (progress > 0 && progress < CLICKS_TO_WIN * 0.35) setHint("");
    else if (progress < CLICKS_TO_WIN * 0.75) setHint("Keep going.");
    else if (progress < CLICKS_TO_WIN) setHint("Almost.");
    else setHint("Now.");
  }

  if (!exploded && progress >= CLICKS_TO_WIN) {
    explode();
    return;
  }
  // stop the animation loop after explode (prevents any lingering jitter)
  if (exploded) return;

  requestAnimationFrame(update);
}

function explode() {
  exploded = true;
  // freeze transform so it doesn't keep jittering during the pop
  heartBtn.style.transform = "translate(0px, 0px) rotate(0deg) scale(3)";
  heartBtn.disabled = true;
  setHint("");

  // heart fade/pop
  heartBtn.classList.add("heartPopLong");

  // confetti layer on
  if (burstLayer) {
    burstLayer.innerHTML = "";
    burstLayer.classList.add("burstGo");
  }

  // spawn small falling hearts for a couple seconds
  const start = performance.now();
  const spawnInterval = 70; // spawn rate
  const timer = setInterval(() => {
    const now = performance.now();
    if (now - start > CONFETTI_SPAWN_MS) {
      clearInterval(timer);
      return;
    }
    // spawn a few each tick
    spawnFallingHearts(5);
  }, spawnInterval);

  // redirect after letting it rain a bit
  setTimeout(() => {
    window.location.href = NEXT_PAGE_URL;
  }, REDIRECT_MS);
}

function spawnFallingHearts(count) {
  if (!burstLayer) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "heartConfetti";

    // start above the top edge so it falls into view
    const x = rand(0, vw);
    const y = rand(-80, -20);

    // fall distance to beyond bottom
    const fall = vh + rand(120, 260);

    // gentle drift
    const dx = rand(-90, 90);

    const dur = rand(1400, 2400);
    const rot = rand(-260, 260);
    const size = rand(10, 16); // SMALL hearts

    p.style.left = `${x}px`;
    p.style.top = `${y}px`;

    p.style.setProperty("--dx", `${dx}px`);
    p.style.setProperty("--fall", `${fall}px`);
    p.style.setProperty("--dur", `${dur}ms`);
    p.style.setProperty("--rot", `${rot}deg`);
    p.style.setProperty("--size", `${size}px`);

    const img = document.createElement("img");
    img.src = "assets/heart.png";
    img.alt = "";
    img.draggable = false;

    p.appendChild(img);
    burstLayer.appendChild(p);

    // cleanup after animation
    setTimeout(() => {
      p.remove();
    }, dur + 200);
  }
}

heartBtn.addEventListener("pointerdown", () => {
  if (exploded) return;

  lastClickTs = performance.now();
  progress += 1;
  progress = clamp(progress, 0, CLICKS_TO_WIN);

  heartBtn.classList.remove("tap");
  void heartBtn.offsetWidth;
  heartBtn.classList.add("tap");
});

requestAnimationFrame(update);
