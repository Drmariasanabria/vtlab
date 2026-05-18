import { QUESTIONNAIRES, LIKERT_LABELS } from "../../research/questionnaires.js";
import { exportPdf, exportWord, loadSession, saveSession } from "../../research/export.js";
import { CHAMBERS, ROOM } from "./data.js";

const SESSION_KEY = "vtlab.phonetics-whovian-vault.session";
const session = {
  roomId: ROOM.id,
  roomName: ROOM.title,
  startedAt: new Date().toISOString(),
  metadata: {
    userAgent: navigator.userAgent,
    page: window.location.href,
    storage: "localStorage",
    firebaseReady: false,
  },
  ...loadSession(SESSION_KEY),
};

const elements = {
  preDialog: document.querySelector("#pre-dialog"),
  postDialog: document.querySelector("#post-dialog"),
  preForm: document.querySelector("#pre-form"),
  postForm: document.querySelector("#post-form"),
  lockPanel: document.querySelector("#lock-panel"),
  missionForm: document.querySelector("#mission-form"),
  chambers: document.querySelector("#chambers"),
  score: document.querySelector("#score"),
  completion: document.querySelector("#completion"),
  exports: document.querySelector("#exports"),
};

let score = session.score || 0;

renderQuestionnaire("pre", elements.preForm);
renderQuestionnaire("post", elements.postForm);
renderChambers();
restoreState();

document.querySelectorAll("[data-open-pre]").forEach((button) => {
  button.addEventListener("click", () => openDialog(elements.preDialog));
});

document.querySelectorAll("[data-open-post]").forEach((button) => {
  button.addEventListener("click", () => openDialog(elements.postDialog));
});

elements.preForm.addEventListener("submit", (event) => {
  event.preventDefault();
  session.preQuestionnaire = collectForm(elements.preForm);
  session.participantCode = session.preQuestionnaire.participantCode;
  session.preSubmittedAt = new Date().toISOString();
  saveAndUnlock();
  elements.preDialog.close();
});

elements.preForm.querySelector("[data-skip]")?.addEventListener("click", () => {
  session.preQuestionnaire = {
    participantCode: "skipped",
    courseGroup: "not provided",
    status: "Pre-questionnaire explicitly skipped",
  };
  session.preSkippedAt = new Date().toISOString();
  saveAndUnlock();
  elements.preDialog.close();
});

elements.postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  session.postQuestionnaire = collectForm(elements.postForm);
  session.postSubmittedAt = new Date().toISOString();
  saveSession(SESSION_KEY, session);
  elements.postDialog.close();
  elements.exports.hidden = false;
  elements.exports.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.missionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const answers = new FormData(elements.missionForm);
  score = CHAMBERS.reduce((total, chamber) => {
    const value = normalizeAnswer(answers.get(chamber.id));
    const accepted = chamber.accepted.map(normalizeAnswer);
    return total + (accepted.includes(value) ? 1 : 0);
  }, 0);

  session.score = score;
  session.completedAt = new Date().toISOString();
  session.missionAnswers = Object.fromEntries(answers.entries());
  saveSession(SESSION_KEY, session);
  updateFeedback(answers);
  updateScore();
  elements.completion.hidden = false;
  openDialog(elements.postDialog);
});

document.querySelectorAll("[data-export]").forEach((button) => {
  button.addEventListener("click", () => {
    const [kind, format] = button.dataset.export.split("-");
    if (format === "pdf") exportPdf(kind, session);
    if (format === "word") exportWord(kind, session);
  });
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog")?.close());
});

function renderQuestionnaire(kind, form) {
  const definition = QUESTIONNAIRES[kind];
  const titleId = `${kind}-title`;
  form.innerHTML = `
    <div class="questionnaire__intro">
      <h2 id="${titleId}">${definition.title}</h2>
      <p>${definition.description}</p>
      <div class="consent">
        Consent notice: responses are stored locally in this browser and may be exported for classroom feedback and research-oriented analysis in anonymised or pseudonymised form. You may skip the pre-questionnaire if needed.
      </div>
    </div>
    ${definition.fields.map((field) => renderField(kind, field)).join("")}
    ${definition.likert.map((item, index) => renderLikert(`${kind}_likert_${index + 1}`, item)).join("")}
    ${(definition.openQuestions || []).map((question, index) => renderField(kind, { id: `open_${index + 1}`, label: question, type: "textarea" })).join("")}
    <div class="questionnaire__actions">
      ${kind === "pre" ? '<button class="button button--ghost" type="button" data-skip>Skip pre-questionnaire</button>' : ""}
      <button class="button button--ghost" type="button" data-close-dialog>Close</button>
      <button class="button button--primary" type="submit">${kind === "pre" ? "Submit + continue" : "Submit + unlock exports"}</button>
    </div>
  `;
}

function renderField(kind, field) {
  const id = `${kind}_${field.id}`;
  if (field.type === "select") {
    return `<div class="field">
      <label for="${id}">${field.label}</label>
      <select id="${id}" name="${field.id}">
        ${field.options.map((option) => `<option value="${option}">${option}</option>`).join("")}
      </select>
    </div>`;
  }

  if (field.type === "textarea") {
    return `<div class="field">
      <label for="${id}">${field.label}</label>
      <textarea id="${id}" name="${field.id}"></textarea>
    </div>`;
  }

  if (field.type === "likert") {
    return renderLikert(field.id, field.label);
  }

  return `<div class="field">
    <label for="${id}">${field.label}</label>
    <input id="${id}" name="${field.id}" type="${field.type}" ${field.required ? "required" : ""}>
  </div>`;
}

function renderLikert(name, label) {
  return `<fieldset class="likert">
    <legend>${label}</legend>
    <div class="likert__options">
      ${Object.entries(LIKERT_LABELS).map(([value, text]) => `
        <label>
          <input type="radio" name="${name}" value="${value}">
          <span>${value}</span>
          <small>${text}</small>
        </label>
      `).join("")}
    </div>
  </fieldset>`;
}

function renderChambers() {
  elements.chambers.innerHTML = CHAMBERS.map((chamber, index) => `
    <article class="chamber">
      <label for="${chamber.id}">${index + 1}. ${chamber.prompt}</label>
      <input id="${chamber.id}" name="${chamber.id}" autocomplete="off" required>
      <span class="hint">${chamber.hint}</span>
      <span class="feedback" data-feedback="${chamber.id}" aria-live="polite"></span>
    </article>
  `).join("");
}

function collectForm(form) {
  const formData = new FormData(form);
  const responses = {};
  for (const [key, value] of formData.entries()) {
    responses[key] = value;
  }
  return responses;
}

function saveAndUnlock() {
  saveSession(SESSION_KEY, session);
  unlockMission();
}

function unlockMission() {
  elements.lockPanel.hidden = true;
  elements.missionForm.hidden = false;
  document.querySelector("#mission").classList.remove("is-locked");
  elements.missionForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function restoreState() {
  updateScore();
  if (session.preQuestionnaire) unlockMission();
  if (session.completedAt) elements.completion.hidden = false;
  if (session.postQuestionnaire) elements.exports.hidden = false;
}

function updateFeedback(answers) {
  CHAMBERS.forEach((chamber) => {
    const feedback = document.querySelector(`[data-feedback="${chamber.id}"]`);
    const value = normalizeAnswer(answers.get(chamber.id));
    const correct = chamber.accepted.map(normalizeAnswer).includes(value);
    feedback.textContent = correct ? "Correct" : `Review: accepted answer is ${chamber.answer}`;
    feedback.classList.toggle("is-correct", correct);
    feedback.classList.toggle("is-wrong", !correct);
  });
}

function updateScore() {
  elements.score.textContent = `${score} / ${CHAMBERS.length}`;
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("ː", ":");
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}
