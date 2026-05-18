window.addEventListener("DOMContentLoaded", async () => {
  const app = document.querySelector("#teacher-app");
  if (!app) return;

  await waitForFirebase();
  await window.VTLabFirebase.authReady();
  renderTeacherApp();
});

async function renderTeacherApp() {
  const app = document.querySelector("#teacher-app");
  const session = window.VTLabFirebase.getLocalSession();
  const user = window.VTLabFirebase.auth.currentUser;

  if (session.role !== "teacher" || (!user && !session.testMode)) {
    app.innerHTML = `
      <div class="access-grid">
        <section class="access-panel">
          <p class="kicker">Teacher mode</p>
          <h2>Sign in with Google</h2>
          <p>Create cohorts, generate student codes, view saved sessions, and export questionnaire records.</p>
          <button class="button button--primary" type="button" data-teacher-login>Sign in with Google</button>
          <p class="access-error" id="teacherError" role="alert"></p>
        </section>
        <section class="access-panel">
          <p class="kicker">Test mode</p>
          <h2>Try teacher dashboard</h2>
          <p>Use this to inspect the interface without saving cohorts or reading Firebase records.</p>
          <button class="button button--ghost" type="button" data-teacher-test>Enter teacher test mode</button>
        </section>
      </div>
    `;
    app.querySelector("[data-teacher-login]").addEventListener("click", async () => {
      const error = app.querySelector("#teacherError");
      error.textContent = "";
      try {
        await window.VTLabFirebase.loginWithGoogle("teacher");
        renderTeacherApp();
      } catch (err) {
        error.textContent = err.message || "Google sign-in did not complete.";
      }
    });
    app.querySelector("[data-teacher-test]").addEventListener("click", () => {
      window.VTLabFirebase.startTestMode("teacher");
      renderTeacherApp();
    });
    return;
  }

  app.innerHTML = `
    <div class="access-panel access-panel--active">
      <div>
        <p class="kicker">${session.testMode ? "Teacher test mode" : "Teacher mode"}</p>
        <h2>${session.testMode ? "Local preview only" : escapeHtml(user?.displayName || user?.email || "Teacher")}</h2>
        <p>${session.testMode ? "No cohorts or reports will be saved or loaded from Firebase." : "Create a cohort, share its code with students, then open the cohort to view progress and exports."}</p>
      </div>
      <button class="button button--ghost" type="button" data-teacher-logout>${session.testMode ? "Exit test mode" : "Sign out"}</button>
    </div>

    <div class="teacher-grid">
      <section class="access-panel">
        <p class="kicker">New cohort</p>
        <h2>Create a code</h2>
        <form id="cohortForm">
          <label>Cohort name <input name="cohortName" placeholder="e.g. Maritime English 2026" required></label>
          <button class="button button--primary" type="submit">Create cohort</button>
        </form>
        <p class="access-error" id="cohortError" role="alert"></p>
      </section>

      <section class="access-panel">
        <p class="kicker">Existing cohorts</p>
        <h2>Your cohorts</h2>
        <div id="cohortList" class="cohort-list"></div>
      </section>
    </div>

    <section class="access-panel cohort-detail" id="cohortDetail" hidden></section>
  `;

  app.querySelector("[data-teacher-logout]").addEventListener("click", async () => {
    if (session.testMode) {
      window.VTLabFirebase.clearLocalSession();
    } else {
      await window.VTLabFirebase.logout();
    }
    renderTeacherApp();
  });

  app.querySelector("#cohortForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = app.querySelector("#cohortError");
    error.textContent = "";
    const name = new FormData(form).get("cohortName");
    if (session.testMode) {
      renderCohorts([{ code: "TEST01", name, testMode: true }]);
      form.reset();
      return;
    }
    try {
      await window.VTLabFirebase.createCohort(name);
      form.reset();
      loadCohorts();
    } catch (err) {
      error.textContent = err.message || "Could not create cohort.";
    }
  });

  loadCohorts();
}

async function loadCohorts() {
  const session = window.VTLabFirebase.getLocalSession();
  if (session.testMode) {
    renderCohorts([{ code: "TEST01", name: "Test cohort", testMode: true }]);
    return;
  }
  const cohorts = await window.VTLabFirebase.listTeacherCohorts();
  renderCohorts(cohorts);
}

function renderCohorts(cohorts) {
  const list = document.querySelector("#cohortList");
  if (!cohorts.length) {
    list.innerHTML = `<p>No cohorts yet.</p>`;
    return;
  }
  list.innerHTML = cohorts.map((cohort) => `
    <article class="cohort-row">
      <div>
        <strong>${escapeHtml(cohort.name)}</strong>
        <code>${escapeHtml(cohort.code)}</code>
      </div>
      <div class="cohort-actions">
        <button class="button button--ghost" type="button" data-open-cohort="${escapeHtml(cohort.code)}">Open</button>
        <button class="button button--danger" type="button" data-delete-cohort="${escapeHtml(cohort.code)}">Delete</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-open-cohort]").forEach((button) => {
    button.addEventListener("click", () => openCohort(button.dataset.openCohort, cohorts.find((item) => item.code === button.dataset.openCohort)));
  });

  list.querySelectorAll("[data-delete-cohort]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.dataset.deleteCohort;
      const cohort = cohorts.find((item) => item.code === code);
      if (!confirm(`Delete cohort "${cohort?.name || code}" and its saved student sessions?`)) return;
      const session = window.VTLabFirebase.getLocalSession();
      if (session.testMode) {
        renderCohorts([]);
        document.querySelector("#cohortDetail").hidden = true;
        return;
      }
      await window.VTLabFirebase.deleteCohort(code);
      document.querySelector("#cohortDetail").hidden = true;
      loadCohorts();
    });
  });
}

async function openCohort(code, cohort) {
  const detail = document.querySelector("#cohortDetail");
  detail.hidden = false;
  detail.innerHTML = `<p class="kicker">Loading cohort</p><h2>${escapeHtml(cohort?.name || code)}</h2>`;

  const session = window.VTLabFirebase.getLocalSession();
  const records = session.testMode ? demoRecords(code) : await window.VTLabFirebase.getCohortSessions(code);
  const students = groupByStudent(records);
  const studentList = Object.entries(students);

  detail.innerHTML = `
    <div class="cohort-detail__header">
      <div>
        <p class="kicker">Cohort code</p>
        <h2>${escapeHtml(cohort?.name || code)} · <code>${escapeHtml(code)}</code></h2>
        <p>Share this code with students. Their saved room sessions will appear here after they complete or skip the post-use questionnaire.</p>
      </div>
      <button class="button button--primary" type="button" data-export-cohort>Download cohort CSV</button>
    </div>
    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Room</th>
            <th>Event</th>
            <th>Progress</th>
            <th>Questionnaires</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          ${records.length ? records.map((record, index) => rowForRecord(record, index)).join("") : `<tr><td colspan="6">No saved student sessions yet.</td></tr>`}
        </tbody>
      </table>
    </div>
    <h3 class="teacher-subtitle">Students</h3>
    <div class="student-list">
      ${studentList.length ? studentList.map(([studentKey, studentRecords]) => `
        <article class="cohort-row">
          <div>
            <strong>${escapeHtml(studentRecords[0].studentName || studentRecords[0].studentEmail || studentKey)}</strong>
            <p>${studentRecords.length} saved record(s)</p>
          </div>
          <button class="button button--danger" type="button" data-delete-student="${escapeHtml(studentKey)}">Delete student</button>
        </article>
      `).join("") : `<p>No students yet.</p>`}
    </div>
    <p class="student-count">${Object.keys(students).length} student(s) · ${records.length} saved record(s)</p>
  `;

  detail.querySelector("[data-export-cohort]").addEventListener("click", () => downloadCsv(`vtlab_${code}_cohort_records.csv`, records));
  detail.querySelectorAll("[data-export-record]").forEach((button) => {
    button.addEventListener("click", () => downloadCsv(`vtlab_${code}_${button.dataset.exportRecord}.csv`, [records[Number(button.dataset.recordIndex)]]));
  });
  detail.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentKey = button.dataset.deleteStudent;
      if (!confirm("Delete this student and their saved sessions from this cohort?")) return;
      if (session.testMode) {
        detail.querySelector(".student-list").innerHTML = "<p>No students yet.</p>";
        return;
      }
      await window.VTLabFirebase.deleteCohortStudent(code, studentKey);
      openCohort(code, cohort);
    });
  });
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function rowForRecord(record, index) {
  const progress = record.result?.score != null
    ? `Score ${record.result.score}${record.result.totalTime ? ` · ${Math.round(record.result.totalTime / 60)} min` : ""}`
    : "Questionnaire saved";
  const questionnaires = [
    record.preQuestionnaire ? "pre" : "",
    record.postQuestionnaire ? "post" : "",
  ].filter(Boolean).join(" + ") || "none";

  return `
    <tr>
      <td>${escapeHtml(record.studentName || record.studentEmail || record.studentUid || "Anonymous")}</td>
      <td>${escapeHtml(record.roomName || record.roomId || "")}</td>
      <td>${escapeHtml(record.event || "")}</td>
      <td>${escapeHtml(progress)}</td>
      <td>${escapeHtml(questionnaires)}</td>
      <td><button type="button" data-export-record="${escapeHtml(record.id || index)}" data-record-index="${index}">CSV</button></td>
    </tr>
  `;
}

function groupByStudent(records) {
  return records.reduce((acc, record) => {
    const key = record.studentUid || record.studentEmail || "anonymous";
    acc[key] = acc[key] || [];
    acc[key].push(record);
    return acc;
  }, {});
}

function downloadCsv(filename, records) {
  const rows = records.flatMap(flattenRecord);
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");
  download(filename, csv, "text/csv");
}

function flattenRecord(record) {
  const base = {
    id: record.id || "",
    cohortCode: record.cohortCode || "",
    studentName: record.studentName || "",
    studentEmail: record.studentEmail || "",
    roomName: record.roomName || "",
    event: record.event || "",
    score: record.result?.score ?? "",
    progress: record.result?.currentChamber ?? record.result?.currentStation ?? "",
    totalTime: record.result?.totalTime ?? "",
    consent: record.consent ?? "",
  };
  return [{
    ...base,
    ...prefixObject("pre_", record.preQuestionnaire || {}),
    ...prefixObject("post_", record.postQuestionnaire || record.postAnswers || {}),
  }];
}

function prefixObject(prefix, obj) {
  return Object.entries(obj || {}).reduce((acc, [key, value]) => {
    acc[`${prefix}${key}`] = typeof value === "object" ? JSON.stringify(value) : value;
    return acc;
  }, {});
}

function demoRecords(code) {
  return [{
    id: "demo-record",
    cohortCode: code,
    studentName: "Test Student",
    roomName: "Phonetics Time Vault",
    event: "post-questionnaire-submitted",
    consent: true,
    result: { score: 1200, currentChamber: 3, totalTime: 840 },
    preQuestionnaire: { participantCode: "TEST", pre_1: "4", expectations: "Try the resource." },
    postQuestionnaire: { post_1: "5", open1: "It was engaging." },
  }];
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

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
