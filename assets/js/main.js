const startup = document.querySelector("#startup");

window.addEventListener("load", () => {
  window.setTimeout(() => {
    startup?.classList.add("startup--hidden");
    document.body.classList.add("is-ready");
  }, 1450);
});

document.addEventListener("pointermove", (event) => {
  const root = document.documentElement;
  root.style.setProperty("--pointer-x", `${(event.clientX / window.innerWidth) * 100}%`);
  root.style.setProperty("--pointer-y", `${(event.clientY / window.innerHeight) * 100}%`);
});
