(function () {
  const LIKERT = {
    1: "Strongly disagree",
    2: "Disagree",
    3: "Neither agree nor disagree",
    4: "Agree",
    5: "Strongly agree",
  };

  const PRE_ITEMS = [
    "I am familiar with educational escape rooms as learning tools.",
    "I am familiar with AI-assisted or vibe-coded educational resources.",
    "I expect this activity to be engaging.",
    "I expect this activity to be easy to use.",
    "I expect this activity to support my learning.",
    "I feel confident using interactive digital resources.",
    "I feel anxious about completing this activity.",
    "I prefer interactive resources to traditional worksheets.",
    "I think gamified resources can support university learning.",
    "I understand that my anonymised responses may be used for teaching/research purposes.",
  ];

  const POST_ITEMS = [
    "The resource was easy to navigate.",
    "The instructions were clear.",
    "The visual design helped me stay engaged.",
    "The escape-room format made the activity more motivating.",
    "The level of difficulty was appropriate.",
    "The game elements supported learning rather than distracting from it.",
    "The resource encouraged active participation.",
    "The activity felt useful as a learning experience.",
    "I would like to use similar resources in other learning contexts.",
    "This resource changed my perception of AI-assisted or vibe-coded educational materials.",
    "I consider this type of resource useful for university-level learning.",
    "I would recommend this type of activity to other students.",
  ];

  const POST_OPEN = [
    "What did you like most about the resource?",
    "What was difficult or confusing?",
    "What would you improve?",
    "How did the escape-room format affect your motivation?",
    "What is your opinion of using vibe-coded educational resources in university teaching?",
  ];

  const config = window.VTLabResearchConfig || {};
  const roomId = config.roomId || document.body.dataset.roomId || "vtlab-room";
  const roomName = config.roomName || document.title || "VT Lab room";
  const storageKey = `vtlab.research.${roomId}`;
  const state = loadState();
  let pendingStart = null;
  let pendingFinish = null;

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    injectModal();
    wireStartButton();
    wrapPostFlow();
  });

  window.VTLabResearch = {
    openPre,
    openPost,
    exportReport,
    getState: () => state,
  };

  function wireStartButton() {
    const selector = config.startSelector || ".btn-start, .btn-launch";
    const button = document.querySelector(selector);
    if (!button) return;

    const startFunctionName = config.startFunction || button.getAttribute("onclick")?.match(/([A-Za-z0-9_$]+)\(/)?.[1];
    button.removeAttribute("onclick");
    button.addEventListener("click", () => openPre(() => callGlobal(startFunctionName)));
  }

  function wrapPostFlow() {
    if (config.postFunction && typeof window[config.postFunction] === "function") {
      const original = window[config.postFunction];
      window[config.postFunction] = function () {
        openPost(() => {
          if (config.afterPostFunction && typeof window[config.afterPostFunction] === "function") {
            window[config.afterPostFunction]();
          } else {
            original.apply(this, arguments);
          }
        });
      };
    }
  }

  function openPre(onStart) {
    pendingStart = onStart;
    renderQuestionnaire("pre");
    showModal();
  }

  function openPost(onFinish) {
    pendingFinish = onFinish;
    renderQuestionnaire("post");
    showModal();
  }

  function renderQuestionnaire(type) {
    const title = type === "pre" ? "Pre-use questionnaire" : "Post-use questionnaire";
    const intro = type === "pre"
      ? "Before starting, please answer these general questions about your expectations and previous experience with educational digital resources."
      : "Before viewing the final report, please evaluate your experience of using this type of educational resource.";

    const body = document.querySelector("#vtlabResearchBody");
    body.innerHTML = `
      <div class="vtlab-rq-head">
        <p>VT Lab · ${escapeHtml(roomName)}</p>
        <h2>${title}</h2>
        <span>${intro}</span>
      </div>
      <form id="vtlabResearchForm">
        ${type === "pre" ? renderPreFields() : renderPostFields()}
        <div class="vtlab-rq-consent">
          <label>
            <input type="checkbox" name="researchConsent" ${state.consent ? "checked" : ""}>
            <span>I understand that anonymised or pseudonymised responses may be used for classroom feedback and research-oriented analysis.</span>
          </label>
        </div>
        <div class="vtlab-rq-actions">
          <button type="button" data-rq-skip>${type === "pre" ? "Skip and start" : "Skip and finish"}</button>
          <button type="submit">${type === "pre" ? "Save and start" : "Save and continue"}</button>
        </div>
      </form>
    `;

    document.querySelector("#vtlabResearchForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveResponses(type, false);
      hideModal();
      if (type === "pre" && pendingStart) pendingStart();
      if (type === "post") {
        renderExportPanel();
        if (pendingFinish) pendingFinish();
      }
    });

    document.querySelector("[data-rq-skip]").addEventListener("click", () => {
      saveResponses(type, true);
      hideModal();
      if (type === "pre" && pendingStart) pendingStart();
      if (type === "post") {
        renderExportPanel();
        if (pendingFinish) pendingFinish();
      }
    });
  }

  function renderPreFields() {
    return `
      ${textField("participantCode", "Participant code / alias", state.pre?.participantCode || "", true)}
      ${textField("courseGroup", "Course / group", state.pre?.courseGroup || "")}
      ${selectField("previousEscapeRooms", "Previous experience with educational escape rooms", ["None", "A little", "Some", "A lot"], state.pre?.previousEscapeRooms)}
      ${selectField("previousAiResources", "Previous experience with AI-assisted or vibe-coded educational resources", ["None", "A little", "Some", "A lot"], state.pre?.previousAiResources)}
      ${likertBlock(PRE_ITEMS, "pre")}
      ${textareaField("expectations", "What do you expect from this resource?", state.pre?.expectations || "")}
    `;
  }

  function renderPostFields() {
    return `
      ${likertBlock(POST_ITEMS, "post")}
      ${POST_OPEN.map((label, index) => textareaField(`open${index + 1}`, label, state.post?.[`open${index + 1}`] || "")).join("")}
    `;
  }

  function textField(name, label, value = "", required = false) {
    return `<label class="vtlab-rq-field">${escapeHtml(label)}<input name="${name}" value="${escapeHtml(value)}" ${required ? "required" : ""}></label>`;
  }

  function textareaField(name, label, value = "") {
    return `<label class="vtlab-rq-field">${escapeHtml(label)}<textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
  }

  function selectField(name, label, options, selected = "") {
    return `<label class="vtlab-rq-field">${escapeHtml(label)}<select name="${name}">${options.map(option => `<option ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }

  function likertBlock(items, prefix) {
    return `<div class="vtlab-rq-likert">${items.map((item, index) => {
      const name = `${prefix}_${index + 1}`;
      const current = state[prefix]?.[name] || "";
      return `<fieldset>
        <legend>${escapeHtml(item)}</legend>
        <div>${Object.entries(LIKERT).map(([value, text]) => `<label><input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}><strong>${value}</strong><span>${text}</span></label>`).join("")}</div>
      </fieldset>`;
    }).join("")}</div>`;
  }

  function saveResponses(type, skipped) {
    const form = document.querySelector("#vtlabResearchForm");
    const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
    data.status = skipped ? "skipped" : "submitted";
    data.timestamp = new Date().toISOString();

    state[type] = data;
    state.consent = data.researchConsent === "on";
    state.roomId = roomId;
    state.roomName = roomName;
    saveState();

    if (window.VTLabFirebase?.saveRoomSession) {
      window.VTLabFirebase.saveRoomSession({
        event: `${type}-questionnaire-${data.status}`,
        roomId,
        roomName,
        consent: state.consent,
        preQuestionnaire: state.pre || null,
        postQuestionnaire: state.post || null,
        result: getRoomResult(),
      }).catch((error) => console.warn("VT Lab Firebase save failed", error));
    }
  }

  function getRoomResult() {
    if (config.resultFunction && typeof window[config.resultFunction] === "function") {
      return window[config.resultFunction]();
    }
    if (typeof window.getVTLabRoomResult === "function") {
      return window.getVTLabRoomResult();
    }
    return null;
  }

  function renderExportPanel() {
    if (document.querySelector("#vtlabResearchExports")) return;
    const panel = document.createElement("section");
    panel.id = "vtlabResearchExports";
    panel.className = "vtlab-rq-exports";
    panel.innerHTML = `
      <h2>Research exports</h2>
      <p>Download generic pre/post questionnaire data for classroom feedback or research-oriented analysis.</p>
      <div>
        <button type="button" data-export="pre-pdf">Export pre-questionnaire as PDF</button>
        <button type="button" data-export="pre-word">Export pre-questionnaire as Word</button>
        <button type="button" data-export="post-pdf">Export post-questionnaire as PDF</button>
        <button type="button" data-export="post-word">Export post-questionnaire as Word</button>
        <button type="button" data-export="combined-pdf">Export combined report as PDF</button>
        <button type="button" data-export="combined-word">Export combined report as Word</button>
      </div>
    `;
    document.body.append(panel);
    panel.querySelectorAll("[data-export]").forEach((button) => {
      button.addEventListener("click", () => {
        const [kind, format] = button.dataset.export.split("-");
        exportReport(kind, format);
      });
    });
  }

  function exportReport(kind, format) {
    const html = buildReportHtml(kind);
    const code = state.pre?.participantCode || "participant";
    const date = new Date().toISOString().slice(0, 10);
    const safeCode = code.replace(/[^a-z0-9_-]+/gi, "-") || "participant";
    const base = `vtlab_${kind}_questionnaire_${safeCode}_${date}`;

    if (format === "word") {
      download(`${base}.doc`, html, "application/msword");
      return;
    }

    exportPdf(`${base}.pdf`, kind);
  }

  async function exportPdf(filename, kind) {
    await ensureJsPdf();
    if (!window.jspdf?.jsPDF) {
      alert("PDF export could not load. Please try again or use Word export.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const text = buildReportText(kind);
    const lines = doc.splitTextToSize(text, 510);
    let y = 44;
    lines.forEach((line) => {
      if (y > 790) {
        doc.addPage();
        y = 44;
      }
      doc.text(line, 42, y);
      y += 15;
    });
    doc.save(filename);
  }

  function ensureJsPdf() {
    if (window.jspdf?.jsPDF) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  function buildReportText(kind) {
    const includePre = kind === "pre" || kind === "combined";
    const includePost = kind === "post" || kind === "combined";
    const parts = [
      "VT Lab",
      `Room: ${roomName}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
    ];
    if (includePre) parts.push("Pre-use questionnaire", objectToText(state.pre || {}), "");
    if (includePost) parts.push("Post-use questionnaire", objectToText(state.post || {}), "");
    parts.push("Disclaimer", "Data are intended for classroom feedback and research-oriented analysis in anonymised or pseudonymised form.");
    return parts.join("\n");
  }

  function objectToText(obj) {
    const entries = Object.entries(obj).filter(([key]) => key !== "researchConsent");
    if (!entries.length) return "No responses recorded.";
    return entries.map(([key, value]) => `${labelFromKey(key)}: ${value}`).join("\n");
  }

  function buildReportHtml(kind) {
    const includePre = kind === "pre" || kind === "combined";
    const includePost = kind === "post" || kind === "combined";
    return `<!doctype html><html><head><meta charset="utf-8"><title>VT Lab questionnaire report</title>
      <style>body{font-family:Arial,sans-serif;color:#172033;line-height:1.45;padding:32px}h1,h2{color:#111827}table{width:100%;border-collapse:collapse;margin:16px 0 28px}th,td{border:1px solid #d6deea;padding:8px;text-align:left;vertical-align:top}th{background:#eef4ff;width:35%}.muted{color:#607086}</style>
      </head><body>
      <h1>VT Lab</h1>
      <p class="muted">Room: ${escapeHtml(roomName)}</p>
      <p class="muted">Generated: ${escapeHtml(new Date().toLocaleString())}</p>
      ${includePre ? `<h2>Pre-use questionnaire</h2>${tableFromObject(state.pre || {})}` : ""}
      ${includePost ? `<h2>Post-use questionnaire</h2>${tableFromObject(state.post || {})}` : ""}
      <h2>Disclaimer</h2>
      <p>Data are intended for classroom feedback and research-oriented analysis in anonymised or pseudonymised form.</p>
      </body></html>`;
  }

  function tableFromObject(obj) {
    const entries = Object.entries(obj).filter(([key]) => key !== "researchConsent");
    if (!entries.length) return "<p>No responses recorded.</p>";
    return `<table>${entries.map(([key, value]) => `<tr><th>${escapeHtml(labelFromKey(key))}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>`;
  }

  function labelFromKey(key) {
    if (key.startsWith("pre_")) return PRE_ITEMS[Number(key.split("_")[1]) - 1] || key;
    if (key.startsWith("post_")) return POST_ITEMS[Number(key.split("_")[1]) - 1] || key;
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  function injectModal() {
    document.body.insertAdjacentHTML("beforeend", `<div class="vtlab-rq-modal" id="vtlabResearchModal" role="dialog" aria-modal="true" aria-label="VT Lab questionnaire"><div class="vtlab-rq-card" id="vtlabResearchBody"></div></div>`);
  }

  function showModal() {
    document.querySelector("#vtlabResearchModal").classList.add("show");
    document.querySelector("#vtlabResearchModal input, #vtlabResearchModal textarea, #vtlabResearchModal button")?.focus();
  }

  function hideModal() {
    document.querySelector("#vtlabResearchModal").classList.remove("show");
  }

  function injectStyles() {
    const css = `
      .vtlab-rq-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(2,6,15,.82);backdrop-filter:blur(10px);padding:18px}
      .vtlab-rq-modal.show{display:flex}
      .vtlab-rq-card{width:min(920px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:#0b1426;color:#f8fbff;box-shadow:0 28px 90px rgba(0,0,0,.55);padding:clamp(18px,4vw,34px);font-family:Inter,system-ui,sans-serif}
      .vtlab-rq-head p{margin:0 0 8px;color:#b9ff72;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}.vtlab-rq-head h2{margin:0 0 10px;font-size:clamp(1.8rem,4vw,3rem);color:#fff}.vtlab-rq-head span{display:block;color:#aab8d0;line-height:1.55;margin-bottom:18px}
      .vtlab-rq-field{display:grid;gap:8px;margin:14px 0;font-weight:800}.vtlab-rq-field input,.vtlab-rq-field select,.vtlab-rq-field textarea{width:100%;min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;padding:10px 12px}.vtlab-rq-field textarea{min-height:90px}
      .vtlab-rq-likert fieldset{border:1px solid rgba(255,255,255,.14);border-radius:14px;margin:12px 0;padding:14px}.vtlab-rq-likert legend{font-weight:800;padding:0 6px}.vtlab-rq-likert fieldset>div{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px}.vtlab-rq-likert label{display:grid;gap:5px;place-items:center;min-height:62px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.06);font-size:.78rem;text-align:center}.vtlab-rq-likert span{color:#aab8d0}
      .vtlab-rq-consent{margin:18px 0;padding:13px;border:1px solid rgba(185,255,114,.28);border-radius:12px;background:rgba(185,255,114,.08);line-height:1.5}.vtlab-rq-consent label{display:flex;gap:10px;align-items:flex-start}
      .vtlab-rq-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.vtlab-rq-actions button,.vtlab-rq-exports button{min-height:44px;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:0 18px;background:linear-gradient(135deg,#65e7ff,#b9ff72);color:#07111b;font-weight:900;cursor:pointer}.vtlab-rq-actions button:first-child{background:transparent;color:#fff}
      .vtlab-rq-exports{width:min(980px,calc(100% - 36px));margin:28px auto;padding:24px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(12,20,38,.88);color:#fff;font-family:Inter,system-ui,sans-serif}.vtlab-rq-exports p{color:#aab8d0}.vtlab-rq-exports>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      @media(max-width:760px){.vtlab-rq-likert fieldset>div,.vtlab-rq-exports>div{grid-template-columns:1fr}.vtlab-rq-actions button,.vtlab-rq-exports button{width:100%}}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function callGlobal(name) {
    if (name && typeof window[name] === "function") {
      window[name]();
    }
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
