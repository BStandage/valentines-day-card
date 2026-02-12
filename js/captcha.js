const grid = document.getElementById("grid");
const verifyBtn = document.getElementById("verifyBtn");
const msg = document.getElementById("msg");

const images = Array.from({ length: 9 }, (_, i) => `assets/solo/${i + 1}.png`);


let selected = new Array(images.length).fill(false);

function setMsg(text) {
  msg.textContent = text || "";
}

function buildGrid() {
  grid.innerHTML = "";
  selected = new Array(images.length).fill(false);
  setMsg("");

  images.forEach((src, idx) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.setAttribute("aria-label", `tile ${idx + 1}`);

    const img = document.createElement("img");
    img.src = src;
    img.alt = "tile";

    const badge = document.createElement("div");
    badge.className = "badge";

    /* ICON-STYLE HEART (geometric / consistent) */
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20.2l-1.2-1.1C6 14.6 3 11.9 3 8.7 3 6.5 4.8 5 6.8 5c1.4 0 2.7.7 3.5 1.8C11.1 5.7 12.4 5 13.8 5 15.8 5 17.6 6.5 17.6 8.7c0 3.2-3 5.9-7.8 10.4L12 20.2z"/>
      </svg>
    `;

    tile.appendChild(img);
    tile.appendChild(badge);

    tile.addEventListener("click", () => {
      selected[idx] = !selected[idx];
      tile.classList.toggle("tile--selected", selected[idx]);
      setMsg("");
    });

    grid.appendChild(tile);
  });
}

verifyBtn.addEventListener("click", () => {
  const remaining = selected.filter(v => !v).length;
  if (remaining === 0) {
    window.location.href = "heart";
    return;
  }

  setMsg(`Selection incomplete. Remaining: ${remaining}.`);
  grid.classList.remove("shake");
  void grid.offsetWidth;
  grid.classList.add("shake");
});

buildGrid();
