const card = document.getElementById("finalCard");

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    card.classList.add("show");
  });
});
