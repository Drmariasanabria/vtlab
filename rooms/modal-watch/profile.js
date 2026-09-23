window.NAVAL_MODALS_PROFILE = (function () {
  "use strict";

  const KEY = "modalwatch_profile_v1";
  const DAILY_KEY = "modalwatch_daily_v1";

  const BADGE_CATALOG = [
    { id: "perfect_run", icon: "🎯", label: "Sin fallos", desc: "Termina una guardia sin ningún fallo." },
    { id: "speedster", icon: "⚡", label: "Reflejos de radar", desc: "6 o más respuestas rápidas en una guardia." },
    { id: "streak5", icon: "🔥", label: "Racha del Capitán", desc: "Encadena 5 aciertos seguidos." },
    { id: "full_watch", icon: "🧭", label: "Guardia completa", desc: "Responde las 18 preguntas de una partida." },
    { id: "captain", icon: "⚓", label: "Apto para el puente", desc: "Consigue 4200 puntos o más en una guardia." },
    { id: "survivor", icon: "🆘", label: "Superviviente", desc: "Acierta justo durante un evento con multiplicador activo." },
    { id: "veteran", icon: "🎖️", label: "Veterano de flota", desc: "Completa 10 guardias." },
    { id: "scholar", icon: "📚", label: "Erudito del gremio", desc: "Acumula 100 respuestas correctas en total." }
  ];

  function defaultProfile() {
    return { xp: 0, gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalAnswered: 0, categoryStats: {}, badges: {} };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultProfile(), parsed);
    } catch (e) { return defaultProfile(); }
  }

  function save(profile) {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) { /* storage unavailable */ }
  }

  function recordGame(session) {
    const profile = load();
    const before = new Set(Object.keys(profile.badges));

    profile.xp += session.score;
    profile.gamesPlayed += 1;
    profile.bestScore = Math.max(profile.bestScore, session.score);
    profile.totalCorrect += session.correctCount;
    profile.totalAnswered += session.answeredCount;

    Object.entries(session.categoryTally).forEach(([cat, tally]) => {
      const cur = profile.categoryStats[cat] || { correct: 0, total: 0 };
      cur.correct += tally.correct;
      cur.total += tally.total;
      profile.categoryStats[cat] = cur;
    });

    const flags = {
      perfect_run: session.answeredCount > 0 && session.correctCount === session.answeredCount,
      speedster: session.fastAnswers >= 6,
      streak5: session.maxStreak >= 5,
      full_watch: session.answeredCount === session.totalSlots,
      captain: session.score >= 4200,
      survivor: !!session.eventBonusHit,
      veteran: profile.gamesPlayed >= 10,
      scholar: profile.totalCorrect >= 100
    };
    Object.entries(flags).forEach(([id, unlocked]) => {
      if (unlocked && !profile.badges[id]) profile.badges[id] = { unlockedAt: Date.now() };
    });

    save(profile);
    const newly = Object.keys(profile.badges).filter((id) => !before.has(id));
    return { profile, newlyUnlocked: newly };
  }

  function weakestCategory(profile) {
    let worst = null, worstRatio = 2;
    Object.entries(profile.categoryStats).forEach(([cat, s]) => {
      if (s.total < 2) return;
      const ratio = s.correct / s.total;
      if (ratio < worstRatio) { worstRatio = ratio; worst = cat; }
    });
    return worst;
  }

  function loadDaily() {
    try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { return {}; }
  }

  function saveDailyResult(dateKey, score) {
    const history = loadDaily();
    const prevBest = history[dateKey] ? history[dateKey].best : 0;
    history[dateKey] = { best: Math.max(prevBest, score), lastScore: score, playedAt: Date.now() };
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(history)); } catch (e) { /* storage unavailable */ }
    return history[dateKey];
  }

  function dailyStreak() {
    const history = loadDaily();
    let streak = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (history[key]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }

  return { BADGE_CATALOG, load, save, recordGame, weakestCategory, loadDaily, saveDailyResult, dailyStreak };
})();
