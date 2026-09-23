window.NAVAL_MODALS_AUDIO = (function () {
  "use strict";

  let ctx = null;
  let muted = false;
  let voiceOn = false;
  let ambientNodes = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, delaySec, gainValue) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (delaySec || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(gainValue || 0.09, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sweep(freqFrom, freqTo, dur, type, delaySec, gainValue) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + (delaySec || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sawtooth";
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.linearRampToValueAtTime(freqTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(gainValue || 0.08, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const EVENT_SFX = {
    fire: () => { tone(880, .16, "square", 0); tone(660, .16, "square", .22); tone(880, .22, "square", .44); },
    psc: () => { tone(660, .18, "sine", 0); tone(880, .22, "sine", .18); },
    storm: () => { sweep(220, 70, .9, "sawtooth", 0, .07); },
    blackout: () => { sweep(500, 60, .35, "square", 0, .08); tone(80, .15, "square", .38); },
    mob: () => { tone(1200, .12, "sine", 0); tone(1200, .12, "sine", .28); tone(1200, .16, "sine", .56); },
    oilspill: () => { tone(400, .18, "sawtooth", 0); tone(400, .18, "sawtooth", .24); },
    calm: () => { tone(660, .3, "sine", 0, .06); tone(880, .35, "sine", .12, .06); },
    drill: () => { tone(523, .16, "triangle", 0); tone(659, .16, "triangle", .16); tone(784, .3, "triangle", .32); }
  };

  function playEvent(key) {
    (EVENT_SFX[key] || EVENT_SFX.calm)();
  }
  function playCorrect() { tone(880, .12, "sine", 0); }
  function playWrong() { tone(160, .22, "sawtooth", 0); }
  function playTick() { tone(1000, .04, "square", 0, .04); }
  function playUnlock() { tone(523, .12, "triangle", 0); tone(784, .18, "triangle", .13); }

  function startAmbient() {
    if (muted || ambientNodes) return;
    const c = ensureCtx();
    if (!c) return;
    const osc1 = c.createOscillator();
    const osc2 = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const master = c.createGain();
    osc1.type = "sine"; osc1.frequency.value = 55;
    osc2.type = "sine"; osc2.frequency.value = 58;
    lfo.type = "sine"; lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.012;
    master.gain.value = 0.03;
    lfo.connect(lfoGain).connect(master.gain);
    osc1.connect(master); osc2.connect(master);
    master.connect(c.destination);
    osc1.start(); osc2.start(); lfo.start();
    ambientNodes = { osc1, osc2, lfo, master };
  }

  function stopAmbient() {
    if (!ambientNodes) return;
    const { osc1, osc2, lfo, master } = ambientNodes;
    try {
      const c = ctx;
      master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
      setTimeout(() => { osc1.stop(); osc2.stop(); lfo.stop(); }, 500);
    } catch (e) { /* already stopped */ }
    ambientNodes = null;
  }

  function setMuted(value) {
    muted = value;
    if (muted) stopAmbient();
  }

  function setVoiceEnabled(value) { voiceOn = value; }

  function speakRaw(text, lang) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || "es-ES";
      u.rate = 1.02;
      u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech synthesis unavailable */ }
  }

  function speak(text, lang) {
    if (!voiceOn || muted) return;
    speakRaw(text, lang);
  }

  function speakOnce(text, lang) {
    if (muted) return;
    speakRaw(text, lang);
  }

  return { playEvent, playCorrect, playWrong, playTick, playUnlock, startAmbient, stopAmbient, setMuted, setVoiceEnabled, speak, speakOnce };
})();
