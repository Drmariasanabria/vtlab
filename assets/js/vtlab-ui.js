(function () {
  const options = window.VTLabUI || {};

  document.addEventListener("DOMContentLoaded", () => {
    injectGlobalStyles();
    injectBackButton();
    if (options.educationResource) injectLomloeWidget();
  });

  function injectBackButton() {
    if (document.querySelector(".vtlab-back-button")) return;
    const button = document.createElement("button");
    button.className = "vtlab-back-button";
    button.type = "button";
    button.textContent = "Back";
    button.setAttribute("aria-label", "Go back");
    button.addEventListener("click", () => {
      if (history.length > 1) {
        history.back();
      } else {
        window.location.href = resolveHomePath();
      }
    });
    document.body.append(button);
  }

  function injectLomloeWidget() {
    if (document.querySelector(".vtlab-lomloe-widget")) return;
    const unlocked = localStorage.getItem("vtlab.hidden.lomloe") === "1";
    const widget = document.createElement("aside");
    widget.className = `vtlab-lomloe-widget${localStorage.getItem("vtlab.lomloe.min") === "1" ? " is-min" : ""}`;
    widget.innerHTML = `
      <div class="vtlab-lomloe-head">
        <strong>LOMLOE Compass</strong>
        <button type="button" data-lomloe-min aria-label="Minimize LOMLOE widget">_</button>
      </div>
      <div class="vtlab-lomloe-body">
        <p>Lengua Extranjera Cantabria reference for activity planning.</p>
        ${unlocked ? `
          <a href="${resolveHomePath()}rooms/lomloe-activity-compass/">Open LOMLOE Compass</a>
        ` : `
          <form data-lomloe-form>
            <label>Code <input name="code" autocomplete="off" placeholder="••••••"></label>
            <button type="submit">Unlock</button>
          </form>
          <p class="vtlab-lomloe-error" role="alert"></p>
        `}
      </div>
    `;
    document.body.append(widget);

    widget.querySelector("[data-lomloe-min]").addEventListener("click", () => {
      widget.classList.toggle("is-min");
      localStorage.setItem("vtlab.lomloe.min", widget.classList.contains("is-min") ? "1" : "0");
    });

    widget.querySelector("[data-lomloe-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = String(new FormData(event.currentTarget).get("code") || "").trim().toLowerCase();
      if (code !== "lomloe") {
        widget.querySelector(".vtlab-lomloe-error").textContent = "Code not accepted.";
        event.currentTarget.reset();
        return;
      }
      localStorage.setItem("vtlab.hidden.lomloe", "1");
      widget.remove();
      injectLomloeWidget();
    });
  }

  function resolveHomePath() {
    const path = window.location.pathname;
    if (path.includes("/rooms/")) return "../../";
    if (path.includes("/teacher/")) return "../";
    return "./";
  }

  function injectGlobalStyles() {
    if (document.querySelector("#vtlab-ui-style")) return;
    const style = document.createElement("style");
    style.id = "vtlab-ui-style";
    style.textContent = `
      .vtlab-back-button{position:fixed;left:16px;bottom:16px;z-index:9998;min-height:42px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(8,10,18,.86);color:#fff;padding:0 16px;font:800 14px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.28);backdrop-filter:blur(12px)}
      .vtlab-back-button:hover{transform:translateY(-2px)}
      .vtlab-lomloe-widget{position:fixed;right:16px;bottom:16px;z-index:9997;width:min(330px,calc(100vw - 32px));border:1px solid rgba(255,255,255,.22);border-radius:18px;background:rgba(8,12,24,.92);color:#f8fbff;box-shadow:0 18px 54px rgba(0,0,0,.34);backdrop-filter:blur(16px);font:500 14px Inter,system-ui,sans-serif;overflow:hidden}
      .vtlab-lomloe-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12)}
      .vtlab-lomloe-head strong{font-family:Inter,system-ui,sans-serif;font-weight:900}
      .vtlab-lomloe-head button{width:32px;height:32px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-weight:900}
      .vtlab-lomloe-body{display:grid;gap:10px;padding:14px}
      .vtlab-lomloe-body p{margin:0;color:#b8c4d8;line-height:1.45}
      .vtlab-lomloe-body a,.vtlab-lomloe-body button{min-height:40px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:linear-gradient(135deg,#65e7ff,#b9ff72);color:#061018;text-decoration:none;font-weight:900;padding:0 14px}
      .vtlab-lomloe-body form{display:grid;gap:8px}
      .vtlab-lomloe-body label{display:grid;gap:6px;color:#dce7f7;font-weight:800}
      .vtlab-lomloe-body input{width:100%;min-height:40px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;padding:0 10px}
      .vtlab-lomloe-error{color:#ff9dcb!important;font-weight:800}
      .vtlab-lomloe-widget.is-min{width:auto}
      .vtlab-lomloe-widget.is-min .vtlab-lomloe-body{display:none}
      @media(max-width:680px){.vtlab-back-button{left:12px;bottom:12px}.vtlab-lomloe-widget{right:12px;bottom:66px}}
    `;
    document.head.append(style);
  }
})();
