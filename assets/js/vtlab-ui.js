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
          <button type="button" data-lomloe-open>Open in window</button>
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
    makeDraggable(widget, widget.querySelector(".vtlab-lomloe-head"), "vtlab.lomloe.pos");

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

    widget.querySelector("[data-lomloe-open]")?.addEventListener("click", () => {
      injectLomloeWindow();
    });
  }

  function injectLomloeWindow() {
    const existing = document.querySelector(".vtlab-lomloe-window");
    if (existing) {
      existing.classList.remove("is-min");
      return;
    }
    const frameWindow = document.createElement("section");
    frameWindow.className = "vtlab-lomloe-window";
    frameWindow.innerHTML = `
      <div class="vtlab-lomloe-window-head">
        <strong>LOMLOE Activity Compass</strong>
        <div>
          <button type="button" data-lomloe-window-min aria-label="Minimize LOMLOE window">_</button>
          <button type="button" data-lomloe-window-close aria-label="Close LOMLOE window">×</button>
        </div>
      </div>
      <iframe src="${resolveHomePath()}rooms/lomloe-activity-compass/" title="LOMLOE Activity Compass"></iframe>
    `;
    document.body.append(frameWindow);
    makeDraggable(frameWindow, frameWindow.querySelector(".vtlab-lomloe-window-head"), "vtlab.lomloe.window.pos");
    frameWindow.querySelector("[data-lomloe-window-close]").addEventListener("click", () => frameWindow.remove());
    frameWindow.querySelector("[data-lomloe-window-min]").addEventListener("click", () => frameWindow.classList.toggle("is-min"));
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
      .vtlab-lomloe-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12);cursor:move;user-select:none}
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
      .vtlab-lomloe-window{position:fixed;right:72px;top:72px;z-index:9996;width:min(920px,calc(100vw - 32px));height:min(720px,calc(100vh - 110px));border:1px solid rgba(255,255,255,.22);border-radius:18px;background:#0b1222;box-shadow:0 24px 80px rgba(0,0,0,.42);overflow:hidden}
      .vtlab-lomloe-window-head{height:46px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px;background:rgba(8,12,24,.96);color:#fff;border-bottom:1px solid rgba(255,255,255,.14);font:800 14px Inter,system-ui,sans-serif;cursor:move;user-select:none}
      .vtlab-lomloe-window-head div{display:flex;gap:6px}
      .vtlab-lomloe-window-head button{width:32px;height:32px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-weight:900}
      .vtlab-lomloe-window iframe{width:100%;height:calc(100% - 46px);border:0;background:#fff}
      .vtlab-lomloe-window.is-min{height:46px;width:min(380px,calc(100vw - 32px))}
      .vtlab-lomloe-window.is-min iframe{display:none}
      @media(max-width:680px){.vtlab-back-button{left:12px;bottom:12px}.vtlab-lomloe-widget{right:12px;bottom:66px}}
    `;
    document.head.append(style);
  }

  function makeDraggable(element, handle, storageKey) {
    const saved = readPosition(storageKey);
    if (saved) {
      element.style.left = `${saved.left}px`;
      element.style.top = `${saved.top}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    }
    let drag = null;
    handle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = element.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const left = clamp(drag.left + event.clientX - drag.x, 8, window.innerWidth - element.offsetWidth - 8);
      const top = clamp(drag.top + event.clientY - drag.y, 8, window.innerHeight - element.offsetHeight - 8);
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    });
    handle.addEventListener("pointerup", () => {
      if (!drag) return;
      const rect = element.getBoundingClientRect();
      localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
      drag = null;
    });
  }

  function readPosition(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey));
    } catch {
      return null;
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }
})();
