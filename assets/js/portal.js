const rooms = [
  {
    title: "Phonetics Time Vault",
    description: "IPA transcription · voicing · manner of articulation · gamified phonetics",
    href: "./rooms/phonetics-time-vault/",
  },
  {
    title: "Bridge Command",
    description: "Bridge communication · mission stations · oral interaction · professional English",
    href: "./rooms/bridge-command/",
  },
  {
    title: "CLIL Studio Pro",
    description: "Plan and preserve a CLIL/AICLE unit · 4Cs · Coyle checklist · exports",
    href: "./rooms/clil-planner/",
  },
];

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
      <div class="rooms-grid rooms-grid--compact">
        ${rooms.map((room) => `
          <article class="room-card">
            <div class="room-card__shine" aria-hidden="true"></div>
            <div>
              <p class="room-card__label">Available mission</p>
              <h3>${escapeHtml(room.title)}</h3>
              <p>${escapeHtml(room.description)}</p>
            </div>
            <a class="button button--primary" href="${room.href}">Open mission</a>
          </article>
        `).join("")}
      </div>
    `;
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
