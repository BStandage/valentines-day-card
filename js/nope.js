(function () {
  const card = document.getElementById("finalCard");
  const noGhost = document.getElementById("noGhost");
  const noBtn = document.getElementById("noBtn");
  const yesBtn = document.getElementById("yesBtn");
  const title = document.getElementById("titleText");
  const sub = document.getElementById("subText");

  if (!card || !noGhost || !noBtn || !yesBtn || !title || !sub) return;

  // Prevent any successful click
  noBtn.addEventListener("click", (e) => e.preventDefault());

  // Tunables (make it impossible)
  const OUTER_R = 520;        // starts pushing far away
  const INNER_R = 140;        // inside this: very strong
  const K_OUTER = 2200000;    // repulsion constant
  const K_INNER = 5200000;    // stronger near cursor
  const MAX_SPEED = 2200;     // px/sec
  const FRICTION = 0.975;     // closer to 1 = more "ice"
  const EDGE_PAD = 10;
  const OB_PAD = 12;
  const BOUNCE = 0.82;

  let x = 0, y = 0;   // local coords in card
  let vx = 0, vy = 0;
  let ready = false;

  let pointer = { x: null, y: null };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }

  function rectInflate(r, p) {
    return { left: r.left - p, top: r.top - p, right: r.right + p, bottom: r.bottom + p };
  }

  function overlaps(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  function cardRect() { return card.getBoundingClientRect(); }

  function toLocal(clientX, clientY) {
    const c = cardRect();
    return { x: clientX - c.left, y: clientY - c.top };
  }

  function btnBoxLocal(c) {
    const b = noBtn.getBoundingClientRect();
    return {
      left: b.left - c.left,
      top: b.top - c.top,
      right: b.right - c.left,
      bottom: b.bottom - c.top,
      w: b.width,
      h: b.height
    };
  }

  function obToLocal(ob, c) {
    return {
      left: ob.left - c.left,
      top: ob.top - c.top,
      right: ob.right - c.left,
      bottom: ob.bottom - c.top
    };
  }

  function obstaclesLocal() {
    const c = cardRect();
    return [
      obToLocal(rectInflate(title.getBoundingClientRect(), OB_PAD), c),
      obToLocal(rectInflate(sub.getBoundingClientRect(), OB_PAD), c),
      obToLocal(rectInflate(yesBtn.getBoundingClientRect(), OB_PAD), c),
    ];
  }

  function apply() {
    noBtn.style.transform = `translate(${x}px, ${y}px)`;
  }

  // Place moving No exactly on top of ghost slot (next to Yes)
  function placeOnGhost() {
    const c = cardRect();
    const g = noGhost.getBoundingClientRect();
    const b = noBtn.getBoundingClientRect();

    // compute ghost position inside card
    x = g.left - c.left;
    y = g.top - c.top;

    // clamp (in case card is tight)
    x = clamp(x, EDGE_PAD, c.width - b.width - EDGE_PAD);
    y = clamp(y, EDGE_PAD, c.height - b.height - EDGE_PAD);

    vx = 0;
    vy = 0;

    apply();
    resolveObstacles();
    ready = true;
  }

  // Minimal push-out from obstacles (bounce)
  function resolveObstacles() {
    const c = cardRect();
    const obs = obstaclesLocal();

    for (let iter = 0; iter < 10; iter++) {
      const r = btnBoxLocal(c);
      let hit = false;

      for (const ob of obs) {
        if (!overlaps(r, ob)) continue;
        hit = true;

        const moveLeft = r.right - ob.left;
        const moveRight = ob.right - r.left;
        const moveUp = r.bottom - ob.top;
        const moveDown = ob.bottom - r.top;

        const minX = Math.min(moveLeft, moveRight);
        const minY = Math.min(moveUp, moveDown);

        if (minX < minY) {
          if (moveLeft < moveRight) { x -= moveLeft; vx = -Math.abs(vx) * BOUNCE; }
          else { x += moveRight; vx = Math.abs(vx) * BOUNCE; }
        } else {
          if (moveUp < moveDown) { y -= moveUp; vy = -Math.abs(vy) * BOUNCE; }
          else { y += moveDown; vy = Math.abs(vy) * BOUNCE; }
        }

        const b = noBtn.getBoundingClientRect();
        x = clamp(x, EDGE_PAD, c.width - b.width - EDGE_PAD);
        y = clamp(y, EDGE_PAD, c.height - b.height - EDGE_PAD);

        apply();
      }

      if (!hit) break;
    }
  }

  function edgeBounce() {
    const c = cardRect();
    const b = noBtn.getBoundingClientRect();

    const maxX = c.width - b.width - EDGE_PAD;
    const maxY = c.height - b.height - EDGE_PAD;

    if (x <= EDGE_PAD) { x = EDGE_PAD; vx = Math.abs(vx) * BOUNCE; }
    if (x >= maxX) { x = maxX; vx = -Math.abs(vx) * BOUNCE; }
    if (y <= EDGE_PAD) { y = EDGE_PAD; vy = Math.abs(vy) * BOUNCE; }
    if (y >= maxY) { y = maxY; vy = -Math.abs(vy) * BOUNCE; }
  }

  function repelFromPointer(dt) {
    if (pointer.x == null || pointer.y == null) return;

    const c = cardRect();
    const b = noBtn.getBoundingClientRect();
    const cx = x + b.width / 2;
    const cy = y + b.height / 2;

    const p = toLocal(pointer.x, pointer.y);
    const dx = cx - p.x;
    const dy = cy - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > OUTER_R) return;

    const dd = Math.max(18, d);
    const nx = dx / dd;
    const ny = dy / dd;

    const K = (dd < INNER_R) ? K_INNER : K_OUTER;

    // inverse-square repulsion
    const f = K / (dd * dd);

    vx += nx * f * dt;
    vy += ny * f * dt;
  }

  function speedCap() {
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > MAX_SPEED) {
      vx = (vx / sp) * MAX_SPEED;
      vy = (vy / sp) * MAX_SPEED;
    }
  }

  function step(dt) {
    if (!ready) return;

    repelFromPointer(dt);

    // tiny drift so it never settles perfectly (still "ice", not jitter)
    vx += rand(-18, 18) * dt;
    vy += rand(-14, 14) * dt;

    // ice friction
    vx *= FRICTION;
    vy *= FRICTION;

    speedCap();

    // integrate
    x += vx * dt;
    y += vy * dt;

    edgeBounce();
    apply();

    // bounce off text + yes button
    resolveObstacles();
  }

  // Track cursor
  window.addEventListener("mousemove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });

  // Track touch dragging
  window.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
  }, { passive: true });

  // If they try to tap the No button, shove it hard away immediately
  noBtn.addEventListener("touchstart", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    e.preventDefault();
    pointer.x = t.clientX;
    pointer.y = t.clientY;

    // impulse kick
    const p = toLocal(t.clientX, t.clientY);
    const b = noBtn.getBoundingClientRect();
    const cx = x + b.width / 2;
    const cy = y + b.height / 2;
    const dx = cx - p.x;
    const dy = cy - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    vx += (dx / d) * 1200;
    vy += (dy / d) * 1200;
  }, { passive: false });

  window.addEventListener("resize", () => {
    ready = false;
  });

  // Start after layout settles so ghost has its true position
  function start() {
    placeOnGhost();
  }

  // Wait a couple frames (ensures fonts/layout have applied)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      start();

      let last = performance.now();
      function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        if (!ready) start();
        step(dt);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    });
  })();
})();
