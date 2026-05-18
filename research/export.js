const DISCLAIMER = "Data are intended for classroom feedback and research-oriented analysis in anonymised or pseudonymised form.";

export function buildExportPayload(kind, session) {
  const pre = session.preQuestionnaire || {};
  const post = session.postQuestionnaire || {};
  const participant = pre.participantCode || session.participantCode || "participant";
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeParticipant = participant.toString().trim().replace(/[^a-z0-9_-]+/gi, "-") || "participant";
  const namePrefix = kind === "combined" ? "vtlab_combined_report" : `vtlab_${kind}_questionnaire`;

  return {
    filenameBase: `${namePrefix}_${safeParticipant}_${dateStamp}`,
    html: reportHtml(kind, session),
    text: reportText(kind, session),
  };
}

export function exportWord(kind, session) {
  const payload = buildExportPayload(kind, session);
  const blob = new Blob([payload.html], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8",
  });
  downloadBlob(blob, `${payload.filenameBase}.docx`);
}

export function exportPdf(kind, session) {
  const payload = buildExportPayload(kind, session);

  if (window.jspdf?.jsPDF) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 44;
    const lines = pdf.splitTextToSize(payload.text, 510);
    let y = margin;

    lines.forEach((line) => {
      if (y > 790) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 15;
    });

    pdf.save(`${payload.filenameBase}.pdf`);
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    alert("Please allow pop-ups to export the PDF report.");
    return;
  }
  printWindow.document.write(payload.html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function saveSession(sessionKey, session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function loadSession(sessionKey) {
  try {
    return JSON.parse(localStorage.getItem(sessionKey)) || {};
  } catch {
    return {};
  }
}

function reportHtml(kind, session) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(reportTitle(kind))}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #162033; line-height: 1.45; padding: 32px; }
    h1 { color: #101827; margin-bottom: 4px; }
    h2 { border-bottom: 1px solid #d9e2f2; color: #22304a; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0 26px; }
    th, td { border: 1px solid #d9e2f2; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eef4ff; }
    .meta { color: #52617a; }
  </style>
</head>
<body>
  <h1>VT Lab</h1>
  <p class="meta">Escape room: ${escapeHtml(session.roomName || "Phonetics Whovian Vault")}</p>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</p>
  ${metadataTable(session)}
  ${kind !== "post" ? responseSection("Pre-questionnaire responses", session.preQuestionnaire) : ""}
  ${kind !== "pre" ? responseSection("Post-questionnaire responses", session.postQuestionnaire) : ""}
  <h2>Session metadata</h2>
  ${objectTable(session.metadata || {})}
  <p><strong>Disclaimer:</strong> ${DISCLAIMER}</p>
</body>
</html>`;
}

function reportText(kind, session) {
  const parts = [
    "VT Lab",
    `Escape room: ${session.roomName || "Phonetics Whovian Vault"}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Participant metadata",
    objectToText({
      "Participant code / alias": session.preQuestionnaire?.participantCode || session.participantCode || "",
      "Course / group": session.preQuestionnaire?.courseGroup || "",
      "Date and time": session.startedAt || new Date().toISOString(),
    }),
  ];

  if (kind !== "post") parts.push("", "Pre-questionnaire responses", objectToText(session.preQuestionnaire || {}));
  if (kind !== "pre") parts.push("", "Post-questionnaire responses", objectToText(session.postQuestionnaire || {}));

  parts.push("", "Session metadata", objectToText(session.metadata || {}), "", `Disclaimer: ${DISCLAIMER}`);
  return parts.join("\n");
}

function metadataTable(session) {
  return objectTable({
    "Participant code / alias": session.preQuestionnaire?.participantCode || session.participantCode || "",
    "Course / group": session.preQuestionnaire?.courseGroup || "",
    "Date and time": session.startedAt || new Date().toISOString(),
  });
}

function responseSection(title, responses = {}) {
  return `<h2>${escapeHtml(title)}</h2>${objectTable(responses)}`;
}

function objectTable(source = {}) {
  const rows = Object.entries(source).map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(formatValue(value))}</td></tr>`).join("");
  return `<table>${rows || "<tr><td>No responses recorded.</td></tr>"}</table>`;
}

function objectToText(source = {}) {
  const entries = Object.entries(source);
  if (!entries.length) return "No responses recorded.";
  return entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join("\n");
}

function reportTitle(kind) {
  if (kind === "pre") return "VT Lab pre-questionnaire";
  if (kind === "post") return "VT Lab post-questionnaire";
  return "VT Lab combined research report";
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return Object.entries(value).map(([key, inner]) => `${key}: ${inner}`).join("; ");
  return value ?? "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
