const btn = document.getElementById("widgetBtn");
const box = document.getElementById("box");

btn.addEventListener("click", () => {
  box.classList.add("box--checked");
  setTimeout(() => {
    window.location.href = "captcha";
  }, 350);
});
