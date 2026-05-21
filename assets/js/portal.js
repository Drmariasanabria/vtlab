const rooms = [
  {
    title: "Phonetics Time Vault",
    category: "Education",
    description: "IPA transcription · voicing · manner of articulation · gamified phonetics",
    href: "./rooms/phonetics-time-vault/",
  },
  {
    title: "Bridge Command",
    category: "ESP",
    description: "Bridge communication · mission stations · oral interaction · professional English",
    href: "./rooms/bridge-command/",
  },
  {
    title: "CLIL Studio Pro",
    category: "Education",
    description: "Plan and preserve a CLIL/AICLE unit · 4Cs · Coyle checklist · exports",
    href: "./rooms/clil-planner/",
  },
  {
    title: "Scaffolding and Bloom Lab",
    category: "Education",
    description: "Bloom taxonomy · ZDP · scaffolding · visual organisers · saved progress",
    href: "./rooms/scaffolding-bloom-lab/",
  },
];

const hiddenResources = {
  lomloe: {
    title: "LOMLOE Activity Compass",
    subtitle: "Lengua Extranjera · Cantabria",
    description: "Resumen navegable del currículo LOMLOE para convertir criterios, saberes y competencias en actividades.",
    href: "./rooms/lomloe-activity-compass/",
  },
};

const questionnaireItems = {
  pre: [
    {
      es: "Tengo experiencia previa usando escape rooms o experiencias interactivas con fines educativos.",
      en: "I have previous experience using escape rooms or interactive experiences for educational purposes.",
    },
    {
      es: "Me siento cómodo/a aprendiendo mediante recursos digitales interactivos.",
      en: "I feel comfortable learning through interactive digital resources.",
    },
    {
      es: "Creo que la gamificación puede mejorar la implicación del alumnado.",
      en: "I think gamification can improve learner engagement.",
    },
    {
      es: "Creo que este tipo de experiencias puede favorecer el aprendizaje activo.",
      en: "I think this type of experience can support active learning.",
    },
    {
      es: "Me veo capaz de diseñar en el futuro una experiencia educativa similar.",
      en: "I can imagine myself designing a similar educational experience in the future.",
    },
    {
      es: "Me interesa aprender cómo se crean recursos educativos digitales con apoyo de IA o vibe-coding.",
      en: "I am interested in learning how digital educational resources are created with AI support or vibe-coding.",
    },
  ],
  post: [
    {
      es: "La experiencia me ha parecido fácil de usar.",
      en: "The experience was easy to use.",
    },
    {
      es: "El formato interactivo ha aumentado mi motivación.",
      en: "The interactive format increased my motivation.",
    },
    {
      es: "La experiencia me ha hecho reflexionar sobre nuevas formas de enseñar.",
      en: "The experience made me reflect on new ways of teaching.",
    },
    {
      es: "Considero que este tipo de recurso puede ser útil en educación superior o formación docente.",
      en: "I consider this type of resource useful in higher education or teacher education.",
    },
    {
      es: "Después de usarlo, me veo más capaz de crear una experiencia educativa similar.",
      en: "After using it, I feel more capable of creating a similar educational experience.",
    },
    {
      es: "Me gustaría aprender más sobre diseño de recursos educativos con IA o vibe-coding.",
      en: "I would like to learn more about designing educational resources with AI or vibe-coding.",
    },
  ],
};

const questionnaireText = {
  es: {
    preTitle: "Cuestionario pre-room",
    postTitle: "Cuestionario post-room",
    intro: "Cuestionarios generales sobre percepción de experiencias educativas interactivas. No están vinculados a una materia concreta.",
    consentTitle: "Consentimiento informado",
    consent: "Acepto que mis respuestas se utilicen con fines de docencia, mejora del recurso e investigación educativa en forma anonimizada o seudonimizada. Entiendo que puedo no responder preguntas abiertas y que mi participación no afecta a mi evaluación.",
    realName: "Nombre real",
    email: "Correo electrónico",
    role: "Rol o grupo",
    expectations: "Antes de usarlo: ¿qué esperas de este tipo de experiencia educativa?",
    futureTeacher: "Como futuro/a docente, ¿te ves creando algo parecido? Explica por qué.",
    liked: "Después de usarlo: ¿qué te ha resultado más útil o interesante?",
    improve: "¿Qué mejorarías para que este tipo de experiencia funcione mejor en educación?",
    scale: "Escala 1-5: 1 = totalmente en desacuerdo · 5 = totalmente de acuerdo",
    saveEmail: "Enviar respuestas por email",
    exportPdf: "Exportar PDF",
    saved: "Respuestas preparadas. Se abrirá tu cliente de correo.",
  },
  en: {
    preTitle: "Pre-room questionnaire",
    postTitle: "Post-room questionnaire",
    intro: "General questionnaires about perceptions of interactive educational experiences. They are not tied to a specific subject.",
    consentTitle: "Informed consent",
    consent: "I agree that my responses may be used for teaching, resource improvement, and educational research in anonymised or pseudonymised form. I understand that I may leave open questions unanswered and that participation does not affect assessment.",
    realName: "Real name",
    email: "Email",
    role: "Role or group",
    expectations: "Before using it: what do you expect from this type of educational experience?",
    futureTeacher: "As a future teacher, can you see yourself creating something similar? Explain why.",
    liked: "After using it: what did you find most useful or interesting?",
    improve: "What would you improve so this type of experience works better in education?",
    scale: "Scale 1-5: 1 = strongly disagree · 5 = strongly agree",
    saveEmail: "Send responses by email",
    exportPdf: "Export PDF",
    saved: "Responses prepared. Your email client will open.",
  },
};

window.addEventListener("DOMContentLoaded", async () => {
  const app = document.querySelector("#student-app");
  if (!app) return;

  await waitForFirebase();
  const user = await window.VTLabFirebase.authReady();
  const session = window.VTLabFirebase.getLocalSession();
  if (user && session.role === "student") {
    window.VTLabFirebase.setLocalSession({ user: {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
    } });
  }
  renderStudentApp();
});

function renderStudentApp() {
  const app = document.querySelector("#student-app");
  const session = window.VTLabFirebase.getLocalSession();

  if (session.role === "student" && (session.cohortCode || session.testMode)) {
    app.innerHTML = `
      <div class="access-panel access-panel--active">
        <div>
          <p class="kicker">${session.testMode ? "Student test mode" : "Student mode"}</p>
          <h2>${session.testMode ? "Try VT Lab without saving" : `Cohort ${escapeHtml(session.cohortCode)}`}</h2>
          <p>${session.testMode ? "Nothing from this run will be saved to Firebase." : `Signed in as ${escapeHtml(session.user?.displayName || session.user?.email || "student")}. Your questionnaire and progress records will be linked to this cohort.`}</p>
        </div>
        <button class="button button--ghost" type="button" data-student-reset>Change mode</button>
      </div>
      ${renderStudentQuestionnaires(session)}
      ${renderCategorisedRooms()}
      ${renderHiddenResourceAccess()}
    `;
    wireQuestionnaires(app);
    wireHiddenResourceAccess(app);
    app.querySelector("[data-student-reset]").addEventListener("click", async () => {
      window.VTLabFirebase.clearLocalSession();
      renderStudentApp();
    });
    return;
  }

  app.innerHTML = `
    <div class="access-grid">
      <section class="access-panel">
        <p class="kicker">Student mode</p>
        <h2>Join with your cohort code</h2>
        <p>Sign in with Google, enter the cohort code from your teacher, then choose a mission. Your questionnaire responses and progress will be saved for that cohort.</p>
        <form id="studentJoinForm">
          <label>Cohort code <input name="cohortCode" placeholder="ABC123" autocomplete="off" required></label>
          <button class="button button--primary" type="submit">Sign in with Google + join</button>
        </form>
        <p class="access-error" id="studentError" role="alert"></p>
      </section>

      <section class="access-panel">
        <p class="kicker">Test mode</p>
        <h2>Try as student</h2>
        <p>Use this for checking the rooms without a cohort code. Nothing will be saved to Firebase.</p>
        <button class="button button--ghost" type="button" data-student-test>Enter student test mode</button>
      </section>

      <section class="access-panel">
        <p class="kicker">Teacher preview</p>
        <h2>Test as teacher</h2>
        <p>Open the teacher dashboard with a fictional cohort and fictional student records. Nothing will be saved to Firebase.</p>
        <button class="button button--ghost" type="button" data-teacher-test>Test as teacher with fictional students</button>
      </section>
    </div>
  `;

  app.querySelector("#studentJoinForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = app.querySelector("#studentError");
    error.textContent = "";
    const code = new FormData(event.currentTarget).get("cohortCode");
    try {
      await window.VTLabFirebase.loginWithGoogle("student");
      await window.VTLabFirebase.joinCohort(code);
      renderStudentApp();
    } catch (err) {
      error.textContent = err.message || "Could not join this cohort.";
    }
  });

  app.querySelector("[data-student-test]").addEventListener("click", () => {
    window.VTLabFirebase.startTestMode("student");
    renderStudentApp();
  });

  app.querySelector("[data-teacher-test]").addEventListener("click", () => {
    window.VTLabFirebase.startTestMode("teacher");
    window.location.href = "./teacher/";
  });
}

function renderHiddenResourceAccess() {
  const unlocked = localStorage.getItem("vtlab.hidden.lomloe") === "1";
  if (unlocked) return renderHiddenResourceCard(hiddenResources.lomloe);
  return `
    <section class="hidden-resource access-panel">
      <div>
        <p class="kicker">Restricted resource</p>
        <h2>Access by code</h2>
        <p>Some curriculum reference tools are hidden unless your teacher gives you the access code.</p>
      </div>
      <form id="hiddenResourceForm">
        <label>Resource code <input name="resourceCode" autocomplete="off" placeholder="••••••"></label>
        <button class="button button--ghost" type="submit">Unlock</button>
      </form>
      <p class="access-error" id="hiddenResourceError" role="alert"></p>
    </section>
  `;
}

function renderHiddenResourceCard(resource) {
  return `
    <section class="resource-category" aria-label="Restricted resources">
      <div class="resource-category__head">
        <div>
          <p class="kicker">Restricted Resource</p>
          <h2>${escapeHtml(resource.title)}</h2>
          <p>${escapeHtml(resource.subtitle)}</p>
        </div>
      </div>
      <div class="rooms-grid rooms-grid--compact">
        <article class="room-card">
          <div class="room-card__shine" aria-hidden="true"></div>
          <div>
            <p class="room-card__label">LOMLOE · Cantabria</p>
            <h3>${escapeHtml(resource.title)}</h3>
            <p>${escapeHtml(resource.description)}</p>
          </div>
          <a class="button button--primary" href="${resource.href}">Open resource</a>
        </article>
      </div>
    </section>
  `;
}

function wireHiddenResourceAccess(app) {
  const form = app.querySelector("#hiddenResourceForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = String(new FormData(form).get("resourceCode") || "").trim().toLowerCase();
    if (code !== "lomloe") {
      app.querySelector("#hiddenResourceError").textContent = "Code not accepted.";
      form.reset();
      return;
    }
    localStorage.setItem("vtlab.hidden.lomloe", "1");
    renderStudentApp();
  });
}

function renderStudentQuestionnaires(session) {
  const lang = localStorage.getItem("vtlab.questionnaire.lang") || "es";
  const t = questionnaireText[lang];
  return `
    <section class="student-questionnaires" id="student-questionnaires" aria-label="Student questionnaires">
      <div class="resource-category__head">
        <div>
          <p class="kicker">Research Questionnaires</p>
          <h2>${lang === "es" ? "Antes y después de los recursos" : "Before and after the resources"}</h2>
          <p>${t.intro}</p>
        </div>
        <div class="language-toggle" role="group" aria-label="Questionnaire language">
          <button type="button" class="${lang === "es" ? "active" : ""}" data-q-lang="es">ES</button>
          <button type="button" class="${lang === "en" ? "active" : ""}" data-q-lang="en">EN</button>
        </div>
      </div>
      <div class="questionnaire-grid">
        ${renderQuestionnaireCard("pre", lang, session)}
        ${renderQuestionnaireCard("post", lang, session)}
      </div>
    </section>
  `;
}

function renderQuestionnaireCard(type, lang, session) {
  const t = questionnaireText[lang];
  const title = type === "pre" ? t.preTitle : t.postTitle;
  const openA = type === "pre" ? t.expectations : t.liked;
  const openB = type === "pre" ? t.futureTeacher : t.improve;
  return `
    <article class="questionnaire-card">
      <h3>${title}</h3>
      <p>${t.scale}</p>
      <form data-questionnaire="${type}" data-lang="${lang}">
        <div class="questionnaire-consent">
          <strong>${t.consentTitle}</strong>
          <label><input type="checkbox" name="consent" required> ${t.consent}</label>
        </div>
        <div class="questionnaire-fields">
          <label>${t.realName}<input name="realName" value="${escapeHtml(session.user?.displayName || "")}" required></label>
          <label>${t.email}<input name="email" type="email" value="${escapeHtml(session.user?.email || "")}"></label>
          <label>${t.role}<input name="roleGroup" value="${escapeHtml(session.cohortCode || "")}"></label>
        </div>
        ${questionnaireItems[type].map((item, index) => renderLikertRow(`q${index + 1}`, item[lang])).join("")}
        <label class="questionnaire-open">${openA}<textarea name="open1"></textarea></label>
        <label class="questionnaire-open">${openB}<textarea name="open2"></textarea></label>
        <div class="questionnaire-actions">
          <button class="button button--primary" type="submit">${t.saveEmail}</button>
          <button class="button button--ghost" type="button" data-export-q="${type}">${t.exportPdf}</button>
        </div>
        <p class="questionnaire-status" role="status"></p>
      </form>
    </article>
  `;
}

function renderLikertRow(name, label) {
  return `
    <fieldset class="questionnaire-likert">
      <legend>${escapeHtml(label)}</legend>
      <div>
        ${[1, 2, 3, 4, 5].map((value) => `<label><input type="radio" name="${name}" value="${value}" required><span>${value}</span></label>`).join("")}
      </div>
    </fieldset>
  `;
}

function wireQuestionnaires(app) {
  app.querySelectorAll("[data-q-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("vtlab.questionnaire.lang", button.dataset.qLang);
      renderStudentApp();
    });
  });

  app.querySelectorAll("[data-questionnaire]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = collectQuestionnaire(form);
      await saveQuestionnairePayload(payload);
      form.querySelector(".questionnaire-status").textContent = questionnaireText[payload.lang].saved;
      sendQuestionnaireEmail(payload);
    });
  });

  app.querySelectorAll("[data-export-q]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("form");
      exportQuestionnairePdf(collectQuestionnaire(form));
    });
  });
}

function collectQuestionnaire(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.questionnaire;
  const lang = form.dataset.lang;
  return {
    type,
    lang,
    submittedAt: new Date().toISOString(),
    realName: data.realName || "",
    email: data.email || "",
    roleGroup: data.roleGroup || "",
    consent: data.consent === "on",
    responses: Object.fromEntries(Object.entries(data).filter(([key]) => key.startsWith("q"))),
    open1: data.open1 || "",
    open2: data.open2 || "",
  };
}

async function saveQuestionnairePayload(payload) {
  const event = payload.type === "pre" ? "generic-pre-room-questionnaire" : "generic-post-room-questionnaire";
  if (window.VTLabFirebase?.saveRoomSession) {
    await window.VTLabFirebase.saveRoomSession({
      event,
      roomId: "student-portal",
      roomName: "VT Lab Student Portal",
      consent: payload.consent,
      genericQuestionnaire: payload,
      preQuestionnaire: payload.type === "pre" ? payload : null,
      postQuestionnaire: payload.type === "post" ? payload : null,
    });
  }
  localStorage.setItem(`vtlab.${payload.type}.questionnaire`, JSON.stringify(payload));
}

function sendQuestionnaireEmail(payload) {
  const subject = encodeURIComponent(`VT Lab ${payload.type} questionnaire · ${payload.realName || "student"}`);
  const body = encodeURIComponent(questionnairePlainText(payload));
  window.location.href = `mailto:maria.sanabria@unican.es?subject=${subject}&body=${body}`;
}

async function exportQuestionnairePdf(payload) {
  await ensureJsPdf();
  if (!window.jspdf?.jsPDF) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const lines = pdf.splitTextToSize(questionnairePlainText(payload), 510);
  let y = 44;
  lines.forEach((line) => {
    if (y > 790) {
      pdf.addPage();
      y = 44;
    }
    pdf.text(line, 42, y);
    y += 15;
  });
  pdf.save(`vtlab_${payload.type}_questionnaire_${safeName(payload.realName)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function questionnairePlainText(payload) {
  const lang = payload.lang;
  const t = questionnaireText[lang];
  const items = questionnaireItems[payload.type];
  const title = payload.type === "pre" ? t.preTitle : t.postTitle;
  return [
    "VT Lab",
    title,
    `Submitted: ${payload.submittedAt}`,
    `Real name: ${payload.realName}`,
    `Email: ${payload.email}`,
    `Role/group: ${payload.roleGroup}`,
    `Consent: ${payload.consent ? "yes" : "no"}`,
    "",
    ...items.flatMap((item, index) => [`${index + 1}. ${item[lang]}`, `Answer: ${payload.responses[`q${index + 1}`] || ""}`, ""]),
    `${payload.type === "pre" ? t.expectations : t.liked}:`,
    payload.open1,
    "",
    `${payload.type === "pre" ? t.futureTeacher : t.improve}:`,
    payload.open2,
  ].join("\n");
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

function safeName(value) {
  return String(value || "student").replace(/[^a-z0-9_-]+/gi, "-");
}

function renderCategorisedRooms() {
  const categories = ["Education", "ESP"];
  return categories.map((category) => {
    const categoryRooms = rooms.filter((room) => room.category === category);
    if (!categoryRooms.length) return "";
    return `
      <section class="resource-category" aria-label="${escapeHtml(category)} resources">
        <div class="resource-category__head">
          <p class="kicker">${escapeHtml(category)}</p>
          <h2>${category === "ESP" ? "English for Specific Purposes" : "Education"}</h2>
        </div>
        <div class="rooms-grid rooms-grid--compact">
          ${categoryRooms.map((room) => `
            <article class="room-card">
              <div class="room-card__shine" aria-hidden="true"></div>
              <div>
                <p class="room-card__label">${escapeHtml(room.category)}</p>
                <h3>${escapeHtml(room.title)}</h3>
                <p>${escapeHtml(room.description)}</p>
              </div>
              <a class="button button--primary" href="${room.href}">Open resource</a>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function waitForFirebase() {
  return new Promise((resolve) => {
    const tick = () => window.VTLabFirebase ? resolve() : window.setTimeout(tick, 40);
    tick();
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
