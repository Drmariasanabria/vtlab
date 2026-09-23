(function () {
  "use strict";

  const DATA = window.NAVAL_MODALS_DATA;
  const SYNC = window.NAVAL_MODALS_SYNC;
  const PROFILE = window.NAVAL_MODALS_PROFILE;
  const AUDIO = window.NAVAL_MODALS_AUDIO;
  const SHARE = window.NAVAL_MODALS_SHARE;
  const SESSION_KEY = "modalwatch_session_v1";

  const AVATARS = ["⚓", "🚢", "🛟", "🧭", "⚙️", "🔧", "🌊", "🦺", "📡", "🔥", "🛰️", "🪝"];
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TUTORIAL_SEEN_KEY = "modalwatch_seen_tutorial_v1";
  const TUTORIAL_STEPS = [
    { icon: "🧭", title: "Responde contra reloj", desc: "Cada pregunta tiene su propia ventana de tiempo dentro del cronómetro general de 15 minutos. Cuanto más rápido aciertes, más puntos consigues." },
    { icon: "⚡", title: "Eventos en directo", desc: "Cada pocas preguntas salta un evento (incendio, hombre al agua, mar gruesa…) que multiplica puntos o cambia el cronómetro para todos a la vez, en el mismo instante." },
    { icon: "📖", title: "Glosario del gremio", desc: "Haz clic en cualquier palabra técnica resaltada dentro de la pregunta, o abre el glosario completo, para ver su traducción oficial." },
    { icon: "🏅", title: "Sube de rango", desc: "Tu progreso, precisión e insignias se guardan en tu perfil. Reta a tu tripulación por código de sala o compite en el reto diario." }
  ];
  const RANKS = [
    { min: 0, label: "Grumete", icon: "🐣" },
    { min: 800, label: "Marinero", icon: "⛵" },
    { min: 1600, label: "Oficial de Guardia", icon: "🧭" },
    { min: 2400, label: "Primer Oficial", icon: "🎖️" },
    { min: 3200, label: "Jefe de Máquinas", icon: "⚙️" },
    { min: 4200, label: "Capitán", icon: "⚓" },
    { min: 5500, label: "Almirante de la Flota", icon: "👑" }
  ];

  const el = (id) => document.getElementById(id);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    adapter: null,
    mode: null,            // 'solo' | 'multi' | 'daily'
    role: null,            // 'host' | 'guest'
    code: null,
    playerId: null,
    name: "",
    avatar: "⚓",
    teamsEnabled: false,
    selectedTeam: "A",
    schedule: null,
    startAt: null,
    unsubscribe: null,
    room: null,
    seenReactionIds: null,
    currentSlotIndex: -1,
    answered: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    missed: [],
    categoryTally: {},
    mult: { value: 1, questionsLeft: 0 },
    windowMult: null,
    flatBonus: { value: 0, questionsLeft: 0 },
    glossaryLockedUntil: 0,
    soundOn: true,
    voiceOn: false,
    pendingMode: "create",
    selectedAvatar: { create: "⚓", join: "⚓" },
    ticking: false,
    fastAnswers: 0,
    eventBonusHit: false,
    dailyDateKey: null,
    lastSessionBadges: [],
    tutorialStep: 0
  };

  // ---------------- Navigation ----------------
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const target = el("screen-" + id);
    if (target) target.classList.add("active");
    if (id === "home") refreshHomeSummaries();
    if (id === "profile") renderProfileScreen();
  }

  $$("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "create" || target === "solo" || target === "daily") {
        state.pendingMode = target;
        renderCreateScreenMode();
        showScreen("create");
      } else {
        showScreen(target);
      }
    });
  });
  el("btn-home-logo").addEventListener("click", () => {
    teardownGame();
    showScreen("home");
  });

  function renderCreateScreenMode() {
    const heading = el("create-heading");
    const btn = el("btn-do-create");
    const teamsField = el("create-teams-field");
    if (state.pendingMode === "solo") {
      heading.textContent = "Práctica en solitario";
      btn.textContent = "Empezar guardia";
      teamsField.classList.add("hidden");
    } else if (state.pendingMode === "daily") {
      heading.textContent = "Reto diario";
      btn.textContent = "Jugar el reto de hoy";
      teamsField.classList.add("hidden");
    } else {
      heading.textContent = "Crear sala";
      btn.textContent = "Generar código de sala";
      teamsField.classList.remove("hidden");
    }
  }

  // ---------------- Avatar pickers ----------------
  function renderAvatarGrid(containerId, group) {
    const c = el(containerId);
    c.innerHTML = "";
    AVATARS.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "avatar-opt" + (a === state.selectedAvatar[group] ? " selected" : "");
      b.textContent = a;
      b.addEventListener("click", () => {
        state.selectedAvatar[group] = a;
        $$(".avatar-opt", c).forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      c.appendChild(b);
    });
  }
  renderAvatarGrid("create-avatars", "create");
  renderAvatarGrid("join-avatars", "join");

  $$(".team-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.selectedTeam = b.dataset.team;
      $$(".team-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
  });

  // ---------------- Create / Join / Solo / Daily ----------------
  el("btn-do-create").addEventListener("click", async () => {
    const name = el("create-name").value.trim() || "Oficial";
    const avatar = state.selectedAvatar.create;
    if (state.pendingMode === "solo") { startSolo(name, avatar); return; }
    if (state.pendingMode === "daily") { startDaily(name, avatar); return; }

    const teamsOn = el("create-teams-toggle").checked;
    state.adapter = SYNC.createAdapter();
    updateSyncBadge();
    const btn = el("btn-do-create");
    btn.disabled = true;
    try {
      const { code, playerId } = await state.adapter.createRoom(name, avatar, teamsOn ? "A" : null);
      state.mode = "multi";
      state.role = "host";
      state.code = code;
      state.playerId = playerId;
      state.name = name;
      state.avatar = avatar;
      state.teamsEnabled = teamsOn;
      persistSession();
      enterLobby();
    } finally {
      btn.disabled = false;
    }
  });

  el("btn-do-join").addEventListener("click", async () => {
    const code = el("join-code").value.trim().toUpperCase();
    const name = el("join-name").value.trim() || "Tripulante";
    const avatar = state.selectedAvatar.join;
    const team = state.selectedTeam;
    const errorEl = el("join-error");
    errorEl.classList.add("hidden");
    if (code.length < 4) {
      errorEl.textContent = "Introduce un código de sala válido.";
      errorEl.classList.remove("hidden");
      return;
    }
    state.adapter = SYNC.createAdapter();
    updateSyncBadge();
    const btn = el("btn-do-join");
    btn.disabled = true;
    try {
      const res = await state.adapter.joinRoom(code, name, avatar, team);
      state.mode = "multi";
      state.role = "guest";
      state.code = res.code;
      state.playerId = res.playerId;
      state.name = name;
      state.avatar = avatar;
      persistSession();
      enterLobby();
    } catch (e) {
      errorEl.textContent = "No se ha encontrado esa sala. Comprueba el código.";
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
    }
  });

  function updateSyncBadge() {
    const badge = el("sync-badge");
    if (!state.adapter) { badge.textContent = "—"; badge.classList.remove("on"); return; }
    if (state.adapter.mode === "firebase") {
      badge.textContent = "🌐 Multijugador en red";
      badge.classList.add("on");
    } else {
      badge.textContent = "💻 Modo local (mismo navegador)";
      badge.classList.remove("on");
    }
  }

  function enterLobby() {
    el("lobby-code").textContent = state.code;
    el("lobby-hint").textContent = state.adapter.mode === "firebase"
      ? "Comparte este código o el enlace directo con tu tripulación, en cualquier dispositivo."
      : "Modo local: este código solo sincroniza pestañas de este mismo navegador. Configura Firebase para multijugador entre dispositivos (ver README).";
    el("btn-start-game").classList.toggle("hidden", state.role !== "host");
    el("lobby-wait").classList.toggle("hidden", state.role === "host");
    showScreen("lobby");
    state.seenReactionIds = null;
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = state.adapter.subscribe(state.code, onRoomUpdate);
  }

  el("btn-copy-code").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      flashCopyButton("btn-copy-code", "¡Copiado!");
    } catch (e) { /* clipboard unavailable */ }
  });
  el("btn-copy-link").addEventListener("click", async () => {
    const url = new URL(location.href);
    url.search = "?join=" + state.code;
    try {
      await navigator.clipboard.writeText(url.toString());
      flashCopyButton("btn-copy-link", "¡Enlace copiado!");
    } catch (e) { /* clipboard unavailable */ }
  });
  function flashCopyButton(id, msg) {
    const b = el(id);
    const original = b.textContent;
    b.textContent = msg;
    setTimeout(() => (b.textContent = original), 1500);
  }

  el("btn-start-game").addEventListener("click", () => {
    state.adapter.startGame(state.code);
  });

  function onRoomUpdate(room) {
    if (!room) return;
    state.room = room;
    state.teamsEnabled = !!room.teamsEnabled;
    if (state.seenReactionIds === null) {
      state.seenReactionIds = new Set((room.reactions || []).map((r) => r.id));
    } else {
      renderNewReactions(room.reactions || []);
    }
    if ($("#screen-lobby").classList.contains("active")) renderLobbyPlayers(room);
    if (room.status === "playing" && !state.schedule) {
      state.schedule = SYNC.buildSchedule(state.code);
      state.startAt = room.startAt;
      beginGameScreen();
    }
    renderLeaderboard(room);
    renderTeamScoreboard(room, "team-scoreboard", "team-a-score", "team-b-score");
  }

  function renderNewReactions(list) {
    list.forEach((r) => {
      if (state.seenReactionIds.has(r.id)) return;
      state.seenReactionIds.add(r.id);
      spawnFloatingReaction(r.emoji);
    });
  }

  function spawnFloatingReaction(emoji) {
    const layer = el("reaction-layer");
    const span = document.createElement("span");
    span.className = "reaction-float";
    span.textContent = emoji;
    span.style.left = (8 + Math.random() * 84) + "%";
    layer.appendChild(span);
    setTimeout(() => span.remove(), 2200);
  }

  function renderLobbyPlayers(room) {
    const list = el("lobby-players");
    list.innerHTML = "";
    Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt).forEach((p) => {
      const li = document.createElement("li");
      const teamTag = room.teamsEnabled && p.team ? `<span class="p-tag team-${p.team.toLowerCase()}">Equipo ${p.team}</span>` : "";
      li.innerHTML = `<span class="p-avatar">${p.avatar}</span><span class="p-name">${escapeHtml(p.name)}</span>${teamTag}`;
      list.appendChild(li);
    });
  }

  function renderTeamScoreboard(room, boxId, aId, bId) {
    const box = el(boxId);
    if (!room || !room.teamsEnabled) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const totals = teamTotals(room);
    el(aId).textContent = totals.A.toLocaleString("es-ES");
    el(bId).textContent = totals.B.toLocaleString("es-ES");
  }

  function teamTotals(room) {
    const totals = { A: 0, B: 0 };
    Object.entries(room.players || {}).forEach(([id, p]) => {
      const score = id === state.playerId ? state.score : (p.score || 0);
      if (p.team === "A") totals.A += score;
      else if (p.team === "B") totals.B += score;
    });
    return totals;
  }

  // ---------------- Solo / Daily mode ----------------
  function startSolo(name, avatar) {
    resetToRunStart("solo", name, avatar);
    state.code = "SOLO-" + Math.random().toString(36).slice(2, 8);
    state.schedule = SYNC.buildSchedule(state.code);
    state.startAt = Date.now() + 1500;
    beginGameScreen();
  }

  function startDaily(name, avatar) {
    resetToRunStart("daily", name, avatar);
    const { seed, dateKey } = SYNC.dailySeed();
    state.code = seed;
    state.dailyDateKey = dateKey;
    state.schedule = SYNC.buildSchedule(seed);
    state.startAt = Date.now() + 1500;
    beginGameScreen();
  }

  function resetToRunStart(mode, name, avatar) {
    clearSession();
    if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
    state.adapter = null;
    state.mode = mode;
    state.role = "host";
    state.name = name;
    state.avatar = avatar;
    state.room = null;
    state.teamsEnabled = false;
  }

  // ---------------- Game engine ----------------
  function beginGameScreen() {
    resetRunState();
    showScreen("game");
    el("leaderboard-panel").classList.toggle("hidden", state.mode !== "multi");
    el("reaction-bar").classList.toggle("hidden", state.mode !== "multi");
    buildProgressDots(state.schedule.slots.length);
    AUDIO.startAmbient();
    if (!state.ticking) {
      state.ticking = true;
      requestAnimationFrame(gameTick);
    }
  }

  function buildProgressDots(count) {
    const box = el("q-progress-dots");
    box.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const d = document.createElement("span");
      d.className = "dot";
      box.appendChild(d);
    }
  }
  function markProgressDot(index, status) {
    const dots = $$("#q-progress-dots .dot");
    if (dots[index]) {
      dots[index].classList.remove("current", "done", "missed");
      dots[index].classList.add(status);
    }
  }

  function resetRunState() {
    state.currentSlotIndex = -1;
    state.answered = false;
    state.score = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.correctCount = 0;
    state.answeredCount = 0;
    state.missed = [];
    state.categoryTally = {};
    state.mult = { value: 1, questionsLeft: 0 };
    state.windowMult = null;
    state.flatBonus = { value: 0, questionsLeft: 0 };
    state.glossaryLockedUntil = 0;
    state.fastAnswers = 0;
    state.eventBonusHit = false;
  }

  let lastTickSecond = -1;
  function gameTick() {
    if ($("#screen-game").classList.contains("active") && state.startAt !== null) {
      const now = Date.now();
      const elapsed = now - state.startAt;

      if (elapsed < 0) {
        el("timer-text").textContent = "Preparando…";
        el("q-prompt").textContent = `La guardia comienza en ${Math.ceil(-elapsed / 1000)}…`;
        el("q-options").innerHTML = "";
        el("q-counter").textContent = `1 / ${SYNC.QUESTIONS_PER_ROOM}`;
      } else {
        const totalMs = state.schedule.totalMs;
        const remainingMs = Math.max(0, totalMs - elapsed);
        updateTimerHud(remainingMs, totalMs);

        if (remainingMs <= 0) { finishGame(); return; }

        const slotIndex = Math.min(state.schedule.slots.length - 1, Math.floor(elapsed / SYNC.SLOT_MS));
        const slot = state.schedule.slots[slotIndex];

        if (slotIndex !== state.currentSlotIndex) {
          if (slot.event) applyEvent(slot.event, now);
          renderQuestion(slot);
        }

        if (!state.answered) {
          const answerRemaining = slot.answerEndMs - elapsed;
          const pct = Math.max(0, Math.min(100, (answerRemaining / SYNC.ANSWER_WINDOW_MS) * 100));
          el("answer-fill").style.width = pct + "%";
          if (answerRemaining <= 0) lockAnswer(slot, -1, now);
        }

        updateGlossaryLockUi(now);
      }
    }
    requestAnimationFrame(gameTick);
  }

  function updateTimerHud(remainingMs, totalMs) {
    const s = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    if (s !== lastTickSecond) {
      lastTickSecond = s;
      el("timer-text").textContent = `${mm}:${ss}`;
    }
    const fill = el("timer-fill");
    fill.style.width = Math.max(0, (remainingMs / totalMs) * 100) + "%";
    fill.classList.toggle("warn", remainingMs < 120000);
  }

  function renderQuestion(slot) {
    state.currentSlotIndex = slot.index;
    state.answered = false;
    el("q-counter").textContent = `${slot.index + 1} / ${state.schedule.slots.length}`;
    el("q-category").textContent = slot.question.category;
    const diff = el("q-difficulty");
    diff.textContent = { easy: "Fácil", medium: "Media", hard: "Difícil" }[slot.question.difficulty];
    diff.className = "badge-difficulty " + slot.question.difficulty;
    el("q-points").textContent = slot.question.points + " pts base";
    markProgressDot(slot.index, "current");
    el("q-prompt").innerHTML = highlightGlossary(slot.question.prompt);
    el("q-feedback").textContent = "";
    el("answer-fill").style.width = "100%";

    const opts = el("q-options");
    opts.innerHTML = "";
    slot.question.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "opt-btn";
      b.type = "button";
      b.innerHTML = `<span class="k">${"ABCD"[i]}</span>${escapeHtml(opt)}`;
      b.addEventListener("click", () => lockAnswer(slot, i, Date.now()));
      opts.appendChild(b);
    });
  }

  el("btn-read-question").addEventListener("click", () => {
    const slot = state.schedule && state.schedule.slots[state.currentSlotIndex];
    if (slot) AUDIO.speakOnce(slot.question.prompt.replace(/___/g, "blank"), "en-US");
  });

  function lockAnswer(slot, chosenIndex, now) {
    if (state.answered) return;
    state.answered = true;
    const correct = chosenIndex === slot.question.correct;
    const answerRemaining = Math.max(0, slot.answerEndMs - now);
    const speedFraction = answerRemaining / SYNC.ANSWER_WINDOW_MS;
    const multiplier = getActiveMultiplier(now);

    const tally = state.categoryTally[slot.question.category] || { correct: 0, total: 0 };
    tally.total += 1;

    let points = 0;
    if (correct) {
      const base = slot.question.points * multiplier;
      const speedBonus = Math.round(slot.question.points * 0.5 * speedFraction);
      let awarded = Math.round(base + speedBonus);
      if (state.streak >= 2) awarded = Math.round(awarded * 1.2);
      if (state.flatBonus.questionsLeft > 0) awarded += state.flatBonus.value;
      points = awarded;
      state.score += points;
      state.streak += 1;
      state.maxStreak = Math.max(state.maxStreak, state.streak);
      state.correctCount += 1;
      tally.correct += 1;
      if (speedFraction > 0.7) state.fastAnswers += 1;
      if (multiplier > 1) state.eventBonusHit = true;
      AUDIO.playCorrect();
    } else {
      state.streak = 0;
      state.missed.push({
        prompt: slot.question.prompt,
        correctOption: slot.question.options[slot.question.correct],
        explain: slot.question.explain
      });
      AUDIO.playWrong();
    }
    markProgressDot(slot.index, correct ? "done" : "missed");
    state.categoryTally[slot.question.category] = tally;

    state.answeredCount += 1;
    if (state.mult.questionsLeft > 0) state.mult.questionsLeft -= 1;
    if (state.flatBonus.questionsLeft > 0) state.flatBonus.questionsLeft -= 1;

    $$(".opt-btn", el("q-options")).forEach((b, i) => {
      b.disabled = true;
      if (i === slot.question.correct) b.classList.add("correct");
      else if (i === chosenIndex) b.classList.add("wrong");
    });
    const card = $(".question-wrap");
    if (!correct) {
      card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    }

    el("score-value").textContent = state.score.toLocaleString("es-ES");
    el("streak-value").textContent = state.streak >= 2 ? `🔥 Racha x${state.streak}` : "";
    el("q-feedback").textContent = correct
      ? `¡Correcto! +${points} pts — ${slot.question.explain}`
      : chosenIndex === -1
        ? `Tiempo agotado. Respuesta correcta: "${slot.question.options[slot.question.correct]}" — ${slot.question.explain}`
        : `Incorrecto. Respuesta correcta: "${slot.question.options[slot.question.correct]}" — ${slot.question.explain}`;

    if (state.mode === "multi" && state.adapter) {
      state.adapter.updatePlayer(state.code, state.playerId, {
        score: state.score, streak: state.streak, correct: state.correctCount, answered: state.answeredCount
      });
    }
  }

  function getActiveMultiplier(now) {
    let m = 1;
    if (state.mult.questionsLeft > 0) m = Math.max(m, state.mult.value);
    if (state.windowMult && now < state.windowMult.expiresAt) m = Math.max(m, state.windowMult.value);
    return m;
  }

  function applyEvent(event, now) {
    const eff = event.effect;
    if (eff.multiplier && eff.questions) state.mult = { value: eff.multiplier, questionsLeft: eff.questions };
    if (eff.multiplier && eff.windowMs) state.windowMult = { value: eff.multiplier, expiresAt: now + eff.windowMs };
    if (eff.flatBonus) state.flatBonus = { value: eff.flatBonus, questionsLeft: eff.questions || 1 };
    if (eff.timeDeltaSeconds) state.startAt += eff.timeDeltaSeconds * 1000;
    if (eff.lockGlossarySeconds) state.glossaryLockedUntil = now + eff.lockGlossarySeconds * 1000;
    showEventBanner(event);
    AUDIO.playEvent(event.key);
    AUDIO.speak(event.title + ". " + event.desc, "es-ES");
  }

  let bannerTimeout = null;
  function showEventBanner(event) {
    const banner = el("event-banner");
    banner.innerHTML = `<div class="ev-title">${event.icon} ${escapeHtml(event.title)}</div><div class="ev-desc">${escapeHtml(event.desc)}</div>`;
    banner.classList.remove("hidden");
    requestAnimationFrame(() => banner.classList.add("show"));
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      banner.classList.remove("show");
      setTimeout(() => banner.classList.add("hidden"), 400);
    }, 5200);
  }

  function updateGlossaryLockUi(now) {
    const locked = now < state.glossaryLockedUntil;
    el("btn-glossary").disabled = locked;
    el("btn-glossary").style.opacity = locked ? .4 : 1;
  }

  // ---------------- Finish / Results ----------------
  function finishGame() {
    state.startAt = null;
    AUDIO.stopAmbient();
    if (state.mode === "multi" && state.role === "host" && state.adapter) state.adapter.endGame(state.code);
    if (state.mode === "daily" && state.dailyDateKey) PROFILE.saveDailyResult(state.dailyDateKey, state.score);
    if (state.mode !== "multi") clearSession();
    renderResults();
    showScreen("results");
    saveVTLabCompletion();
    burstConfetti();
  }

  function saveVTLabCompletion() {
    if (!window.VTLabFirebase?.saveRoomSession) return;
    const session = window.VTLabFirebase.getLocalSession?.() || {};
    if (!session.testMode && (!session.cohortCode || !session.user)) return;
    const accuracy = state.answeredCount
      ? Math.round((state.correctCount / state.answeredCount) * 100)
      : 0;
    window.VTLabFirebase.saveRoomSession({
      event: "modal-watch-completed",
      roomId: "modal-watch",
      roomName: "Modal Watch",
      result: {
        mode: state.mode,
        score: state.score,
        accuracy,
        correctCount: state.correctCount,
        answeredCount: state.answeredCount,
        maxStreak: state.maxStreak,
        rank: currentRank().label,
        completed: true,
      },
    }).catch((error) => console.warn("VT Lab progress save failed", error));
  }

  function currentRank() {
    return RANKS.slice().reverse().find((r) => state.score >= r.min) || RANKS[0];
  }

  function computeSessionBadges() {
    const badges = [];
    const has = (id) => PROFILE.BADGE_CATALOG.find((b) => b.id === id);
    if (state.answeredCount > 0 && state.correctCount === state.answeredCount) badges.push(has("perfect_run"));
    if (state.fastAnswers >= 6) badges.push(has("speedster"));
    if (state.maxStreak >= 5) badges.push(has("streak5"));
    if (state.answeredCount === state.schedule.slots.length) badges.push(has("full_watch"));
    if (state.score >= 4200) badges.push(has("captain"));
    if (state.eventBonusHit) badges.push(has("survivor"));
    return badges.filter(Boolean);
  }

  function renderResults() {
    const rank = currentRank();
    el("results-rank").textContent = `${rank.icon} ${rank.label}`;
    el("results-score").textContent = `${state.score.toLocaleString("es-ES")} pts`;
    const acc = state.answeredCount ? Math.round((state.correctCount / state.answeredCount) * 100) : 0;
    el("results-accuracy").textContent = acc + "%";

    const sessionBadges = computeSessionBadges();
    state.lastSessionBadges = sessionBadges;
    el("results-badges").innerHTML = sessionBadges.length
      ? sessionBadges.map((b) => `<span class="badge-pill" title="${escapeHtml(b.label)}">${b.icon}</span>`).join("")
      : `<span style="color:var(--text-1);font-size:14px;">Sigue entrenando para desbloquear insignias</span>`;

    const review = el("results-review");
    review.innerHTML = "";
    if (!state.missed.length) {
      review.innerHTML = `<p style="color:var(--text-1);">¡Ninguna pregunta fallada! Guardia impecable. 🎖️</p>`;
    } else {
      state.missed.forEach((m) => {
        const div = document.createElement("div");
        div.className = "review-item";
        div.innerHTML = `<div class="rv-prompt">${escapeHtml(m.prompt).replace("___", "<u>___</u>")}</div>
          <div class="rv-answer">Respuesta correcta: "${escapeHtml(m.correctOption)}"</div>
          <div class="rv-explain">${escapeHtml(m.explain)}</div>`;
        review.appendChild(div);
      });
    }

    renderPodium();
    renderTeamScoreboard(state.room, "team-results", "team-a-final", "team-b-final");

    const { newlyUnlocked } = PROFILE.recordGame({
      score: state.score, correctCount: state.correctCount, answeredCount: state.answeredCount,
      categoryTally: state.categoryTally, fastAnswers: state.fastAnswers, maxStreak: state.maxStreak,
      totalSlots: state.schedule.slots.length, eventBonusHit: state.eventBonusHit
    });
    if (newlyUnlocked.length) showBadgeToast(newlyUnlocked);
  }

  function showBadgeToast(ids) {
    const items = ids.map((id) => PROFILE.BADGE_CATALOG.find((b) => b.id === id)).filter(Boolean);
    if (!items.length) return;
    const toast = el("badge-toast");
    toast.innerHTML = `<b>¡Nueva insignia!</b> ` + items.map((b) => `${b.icon} ${escapeHtml(b.label)}`).join(" · ");
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    AUDIO.playUnlock();
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 400);
    }, 4200);
  }

  function renderPodium() {
    const podium = el("podium");
    let players;
    if (state.mode === "multi" && state.room) {
      players = Object.entries(state.room.players || {}).map(([id, p]) => ({
        id, name: p.name, avatar: p.avatar, score: id === state.playerId ? state.score : (p.score || 0)
      }));
    } else {
      players = [{ id: "me", name: state.name, avatar: state.avatar, score: state.score }];
    }
    players.sort((a, b) => b.score - a.score);
    const top = players.slice(0, 3);
    const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
    const medals = ["🥇", "🥈", "🥉"];
    podium.innerHTML = order.map((idx) => {
      const p = top[idx];
      if (!p) return "";
      return `<div class="podium-slot p${idx + 1}">
        <div class="podium-medal">${medals[idx]}</div>
        <div class="podium-bar"></div>
        <div class="podium-name">${p.avatar} ${escapeHtml(p.name)}</div>
        <div class="podium-score">${p.score.toLocaleString("es-ES")} pts</div>
      </div>`;
    }).join("");
  }

  el("btn-download-card").addEventListener("click", async () => {
    const canvas = buildResultCanvas();
    await SHARE.downloadCard(canvas, "modal-watch-resultado.png");
  });
  el("btn-share-card").addEventListener("click", async () => {
    const canvas = buildResultCanvas();
    await SHARE.shareCard(canvas, "modal-watch-resultado.png", `Saqué ${state.score} pts en MODAL WATCH`);
  });
  function buildResultCanvas() {
    const rank = currentRank();
    const acc = state.answeredCount ? Math.round((state.correctCount / state.answeredCount) * 100) : 0;
    return SHARE.buildCard({
      name: state.name, avatar: state.avatar, rankLabel: rank.label, rankIcon: rank.icon,
      score: state.score, accuracy: acc, badges: state.lastSessionBadges
    });
  }

  el("btn-play-again").addEventListener("click", () => {
    if (state.mode === "solo") startSolo(state.name, state.avatar);
    else if (state.mode === "daily") startDaily(state.name, state.avatar);
    else { teardownGame(); showScreen("home"); }
  });
  el("btn-back-home").addEventListener("click", () => {
    teardownGame();
    showScreen("home");
  });

  function teardownGame() {
    if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
    AUDIO.stopAmbient();
    state.adapter = null;
    state.mode = null;
    state.schedule = null;
    state.startAt = null;
    state.code = null;
    state.room = null;
    clearSession();
  }

  // ---------------- Leaderboard ----------------
  function renderLeaderboard(room) {
    if (state.mode !== "multi" || !$("#screen-game").classList.contains("active")) return;
    const list = el("leaderboard-list");
    const players = Object.entries(room.players || {}).map(([id, p]) => ({
      id, name: p.name, avatar: p.avatar, score: id === state.playerId ? state.score : (p.score || 0)
    })).sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
      <li class="${p.id === state.playerId ? "me" : ""}">
        <span class="lb-rank">#${i + 1}</span>
        <span>${p.avatar}</span>
        <span class="lb-name">${escapeHtml(p.name)}</span>
        <span class="lb-score">${p.score.toLocaleString("es-ES")}</span>
      </li>`).join("");
  }

  // ---------------- Reactions ----------------
  $$("#reaction-bar button").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.mode === "multi" && state.adapter) state.adapter.sendReaction(state.code, state.playerId, b.dataset.emoji);
    });
  });

  // ---------------- Glossary ----------------
  function renderGlossaryGrid() {
    const grid = el("glossary-grid");
    grid.innerHTML = "";
    DATA.GLOSSARY.forEach((g) => {
      const card = document.createElement("div");
      card.className = "glossary-term";
      card.innerHTML = `<div class="flip-inner">
        <div class="face front"><b>${escapeHtml(g.term)}</b><small>toca para traducir</small></div>
        <div class="face back"><b>${escapeHtml(g.es)}</b><small>${escapeHtml(g.def)}</small></div>
      </div>`;
      card.addEventListener("click", () => card.classList.toggle("flipped"));
      grid.appendChild(card);
    });
  }
  renderGlossaryGrid();

  el("btn-glossary").addEventListener("click", () => {
    if (Date.now() < state.glossaryLockedUntil) return;
    el("glossary-modal").classList.remove("hidden");
  });
  el("btn-close-glossary").addEventListener("click", () => el("glossary-modal").classList.add("hidden"));
  el("glossary-modal").addEventListener("click", (e) => {
    if (e.target.id === "glossary-modal") el("glossary-modal").classList.add("hidden");
  });

  function highlightGlossary(text) {
    let out = escapeHtml(text);
    const sorted = DATA.GLOSSARY.slice().sort((a, b) => b.term.length - a.term.length);
    sorted.forEach((g) => {
      const re = new RegExp("\\b(" + g.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "i");
      if (re.test(out)) out = out.replace(re, (m) => `<span class="term-hit" data-term="${escapeHtml(g.term)}">${m}</span>`);
    });
    return out;
  }

  document.addEventListener("click", (e) => {
    const hit = e.target.closest(".term-hit");
    const pop = el("term-popover");
    if (hit) {
      const g = DATA.GLOSSARY.find((x) => x.term === hit.dataset.term);
      if (g) {
        pop.innerHTML = `<b>${escapeHtml(g.es)}</b><br>${escapeHtml(g.def)}`;
        const r = hit.getBoundingClientRect();
        pop.style.left = Math.min(window.innerWidth - 300, r.left) + "px";
        pop.style.top = (r.bottom + 8) + "px";
        pop.classList.remove("hidden");
      }
    } else if (!e.target.closest("#term-popover")) {
      pop.classList.add("hidden");
    }
  });

  // ---------------- Sound / Voice toggles ----------------
  el("btn-sound").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    AUDIO.setMuted(!state.soundOn);
    el("btn-sound").textContent = state.soundOn ? "🔊" : "🔇";
  });
  el("btn-voice").addEventListener("click", () => {
    state.voiceOn = !state.voiceOn;
    AUDIO.setVoiceEnabled(state.voiceOn);
    el("btn-voice").classList.toggle("active", state.voiceOn);
    el("btn-voice").title = state.voiceOn ? "Voz de puente: activada" : "Voz de puente";
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------- Profile screen ----------------
  function renderProfileScreen() {
    const p = PROFILE.load();
    el("profile-xp").textContent = p.xp.toLocaleString("es-ES");
    el("profile-games").textContent = p.gamesPlayed;
    el("profile-best").textContent = p.bestScore.toLocaleString("es-ES");
    const acc = p.totalAnswered ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;
    el("profile-accuracy").textContent = acc + "%";
    const weak = PROFILE.weakestCategory(p);
    el("profile-weak").textContent = weak || "Aún sin datos suficientes";
    el("profile-daily-streak").textContent = PROFILE.dailyStreak() + " días";

    const gallery = el("profile-badges");
    gallery.innerHTML = PROFILE.BADGE_CATALOG.map((b) => {
      const unlocked = !!p.badges[b.id];
      return `<div class="badge-tile ${unlocked ? "unlocked" : "locked"}" title="${escapeHtml(b.desc)}">
        <span class="bt-icon">${unlocked ? b.icon : "🔒"}</span>
        <span class="bt-label">${escapeHtml(b.label)}</span>
      </div>`;
    }).join("");
  }

  el("btn-reset-profile").addEventListener("click", () => {
    if (!confirm("¿Reiniciar toda tu hoja de servicio (XP, insignias, estadísticas)? Esta acción no se puede deshacer.")) return;
    PROFILE.save({ xp: 0, gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalAnswered: 0, categoryStats: {}, badges: {} });
    renderProfileScreen();
    refreshHomeSummaries();
  });

  function refreshHomeSummaries() {
    const p = PROFILE.load();
    el("home-profile-summary").textContent = p.gamesPlayed
      ? `${p.gamesPlayed} guardias · mejor marca ${p.bestScore.toLocaleString("es-ES")} pts · ${Object.keys(p.badges).length}/${PROFILE.BADGE_CATALOG.length} insignias`
      : "Sin partidas registradas todavía.";
    const daily = PROFILE.loadDaily();
    const key = SYNC.dailySeed().dateKey;
    el("daily-desc").textContent = daily[key]
      ? `Ya has jugado hoy — tu mejor marca es ${daily[key].best.toLocaleString("es-ES")} pts. ¡Supérala!`
      : "Las mismas 18 preguntas para todo el mundo hoy. Compara tu mejor marca.";
  }

  // ---------------- Ambient FX (radar sweep + starfield) ----------------
  (function ambientFx() {
    const canvas = el("fx-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, stars = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = Array.from({ length: Math.floor((w * h) / 9000) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .2, s: Math.random() * .5 + .1
      }));
    }
    window.addEventListener("resize", resize);
    resize();

    let angle = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(180,230,255,0.55)";
      stars.forEach((st) => {
        ctx.globalAlpha = 0.4 + Math.sin((Date.now() / 900) * st.s) * 0.3;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const cx = w * 0.82, cy = h * 0.12, radius = Math.max(w, h) * 0.55;
      const grad = ctx.createConicGradient ? ctx.createConicGradient(angle, cx, cy) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(0,229,255,0.20)");
        grad.addColorStop(0.06, "rgba(0,229,255,0.0)");
        grad.addColorStop(1, "rgba(0,229,255,0.0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) angle += 0.012;
      requestAnimationFrame(draw);
    }
    draw();
  })();

  function burstConfetti() {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none;width:100%;height:100%;";
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const colors = ["#00e5ff", "#ff9f1c", "#33ffb0", "#ff4d6d", "#eaf6ff"];
    const parts = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2, y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 12, vy: Math.random() * -10 - 4,
      g: 0.35, color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 3, life: 0
    }));
    let frame = 0;
    function step() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life++;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / 90);
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      if (frame < 100) requestAnimationFrame(step);
      else canvas.remove();
    }
    step();
  }

  // ---------------- Keyboard shortcuts (1-4 to answer) ----------------
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-game").classList.contains("active")) return;
    const idx = { "1": 0, "2": 1, "3": 2, "4": 3 }[e.key];
    if (idx === undefined || state.answered) return;
    const btn = $$(".opt-btn")[idx];
    if (btn) btn.click();
  });

  // ---------------- Session persistence (reconnect after reload) ----------------
  function persistSession() {
    if (state.mode !== "multi") return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        code: state.code, playerId: state.playerId, name: state.name, avatar: state.avatar, role: state.role
      }));
    } catch (e) { /* storage unavailable */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* storage unavailable */ }
  }
  async function tryReconnect() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { /* ignore */ }
    if (!saved) return false;
    const adapter = SYNC.createAdapter();
    let room = null;
    try { room = await adapter.getRoom(saved.code); } catch (e) { /* room lookup failed */ }
    if (!room || !room.players || !room.players[saved.playerId]) { clearSession(); return false; }
    state.adapter = adapter;
    state.mode = "multi";
    state.role = saved.role;
    state.code = saved.code;
    state.playerId = saved.playerId;
    state.name = saved.name;
    state.avatar = saved.avatar;
    updateSyncBadge();
    if (room.status === "playing") {
      state.schedule = SYNC.buildSchedule(state.code);
      state.startAt = room.startAt;
      state.room = room;
      beginGameScreen();
    } else if (room.status === "ended") {
      state.room = room;
      clearSession();
      showScreen("home");
      return true;
    } else {
      enterLobby();
    }
    return true;
  }

  // ---------------- Join-by-link prefill ----------------
  function checkJoinLink() {
    const params = new URLSearchParams(location.search);
    const join = params.get("join");
    if (join) {
      showScreen("join");
      el("join-code").value = join.toUpperCase();
      el("join-name").focus();
    }
  }

  // ---------------- Boot splash ----------------
  function dismissBootSplash() {
    el("boot-splash").classList.add("done");
  }
  setTimeout(dismissBootSplash, REDUCED_MOTION ? 50 : 1300);

  // ---------------- Hero parallax + home card tilt ----------------
  if (!REDUCED_MOTION) {
    const hero = el("hero");
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      $$(".hero-layer", hero).forEach((layer) => {
        const depth = Number(layer.dataset.depth || 10);
        layer.style.transform = `translate(${-px * depth}px, ${-py * depth}px)`;
      });
    });
    hero.addEventListener("mouseleave", () => {
      $$(".hero-layer", hero).forEach((layer) => (layer.style.transform = ""));
    });

    $$(".home-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  // ---------------- Tutorial ----------------
  function renderTutorialStep() {
    const wrap = el("tutorial-steps");
    wrap.innerHTML = TUTORIAL_STEPS.map((s, i) => `
      <div class="tutorial-step ${i === state.tutorialStep ? "active" : ""}">
        <div class="ts-icon">${s.icon}</div>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.desc)}</p>
      </div>`).join("");
    el("tutorial-dots").innerHTML = TUTORIAL_STEPS.map((_, i) =>
      `<span class="${i === state.tutorialStep ? "active" : ""}"></span>`).join("");
    const isLast = state.tutorialStep === TUTORIAL_STEPS.length - 1;
    el("btn-tutorial-next").textContent = isLast ? "Empezar" : "Siguiente";
    el("btn-tutorial-skip").classList.toggle("hidden", isLast);
  }
  function openTutorial() {
    state.tutorialStep = 0;
    renderTutorialStep();
    el("tutorial-modal").classList.remove("hidden");
  }
  function closeTutorial() {
    el("tutorial-modal").classList.add("hidden");
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, "1"); } catch (e) { /* storage unavailable */ }
  }
  el("btn-howto").addEventListener("click", openTutorial);
  el("btn-close-tutorial").addEventListener("click", closeTutorial);
  el("btn-tutorial-skip").addEventListener("click", closeTutorial);
  el("btn-tutorial-next").addEventListener("click", () => {
    if (state.tutorialStep < TUTORIAL_STEPS.length - 1) { state.tutorialStep += 1; renderTutorialStep(); }
    else closeTutorial();
  });

  renderCreateScreenMode();
  refreshHomeSummaries();
  tryReconnect().then((reconnected) => {
    if (!reconnected) checkJoinLink();
    let seenTutorial = true;
    try { seenTutorial = !!localStorage.getItem(TUTORIAL_SEEN_KEY); } catch (e) { /* storage unavailable */ }
    if (!reconnected && !seenTutorial) setTimeout(openTutorial, REDUCED_MOTION ? 100 : 1500);
  });
})();
