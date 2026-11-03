/* =========================================================
   HIDDEN RESERVOIR
   Kod sırası: DESIGN → state → input → rule → output
   ========================================================= */

/* 1. DESIGN: Deneyin ayarlanabilir tasarım değerleri */
const DESIGN = {
  capacity: 100,                 // Deponun alabileceği en yüksek su miktarı
  initialLevel: 80,              // Her sıfırlamada başlangıç su seviyesi
  addAmount: 10,                  // Add 10 butonunun eklediği miktar
  drainRatePerSecond: 5,         // Saniyede boşalan su miktarı
  targetLow: 40,                 // Görev aralığının alt sınırı
  targetHigh: 60,                // Görev aralığının üst sınırı
  displayDecimals: 0,            // Ekrandaki sayı basamağı; 0 = tam sayı
  acknowledgementDurationMs: 1100, // Eylem alındı mesajının görünme süresi
  tankWidth: 150,                // Depo genişliği (piksel)
  tankHeight: 250,               // Depo yüksekliği (piksel)
  colors: {
    page: "#f5f9ff",
    surface: "#ffffff",
    pale: "#dceeff",
    light: "#a9d3f5",
    water: "#72b6e8",
    deep: "#355c7d",
    strong: "#397fb5"
  },
  rules: {
    addOnlyWhenPaused: true,     // true ise Add 10 yalnızca duraklatıldığında çalışır
    }
};

/* 2. STATE: Sistemin o anki gerçek durumu */
const state = {
  level: DESIGN.initialLevel,
  running: false,
  feedbackMode: "full",
  resultRevealed: false,
  lastFrameTime: null,
  animationFrameId: null,
  acknowledgementTimeoutId: null
};

/* Gerekli HTML elemanlarını bir yerde topluyoruz. */
const elements = {
  fullModeButton: document.getElementById("fullModeButton"),
  ackModeButton: document.getElementById("ackModeButton"),
  modeChip: document.getElementById("modeChip"),
  tank: document.getElementById("tank"),
  water: document.getElementById("water"),
  stateFeedback: document.getElementById("stateFeedback"),
  levelValue: document.getElementById("levelValue"),
  statusLabel: document.getElementById("statusLabel"),
  hiddenReadout: document.getElementById("hiddenReadout"),
  acknowledgement: document.getElementById("acknowledgement"),
  addButton: document.getElementById("addButton"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  revealRow: document.getElementById("revealRow"),
  revealButton: document.getElementById("revealButton"),
  controlHint: document.getElementById("controlHint"),
  targetNote: document.getElementById("targetNote")
};

/* 3. INPUT: Kullanıcı eylemleri */
elements.addButton.addEventListener("click", handleAdd);
elements.startButton.addEventListener("click", handleStart);
elements.pauseButton.addEventListener("click", handlePause);
elements.resetButton.addEventListener("click", handleReset);
elements.fullModeButton.addEventListener("click", () => handleModeChange("full"));
elements.ackModeButton.addEventListener("click", () => handleModeChange("ack"));
elements.revealButton.addEventListener("click", handleReveal);

/* Sayfa arka plana geçtiğinde simülasyonu güvenli biçimde duraklat. */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running) {
    pauseSimulation();
    render();
  }
});

function handleAdd() {
  if (DESIGN.rules.addOnlyWhenPaused && state.running) return;
  applyAddRule();
  acknowledge("Add 10 received.");
  render();
}

function handleStart() {
  if (state.running || state.level <= 0) return;
  startSimulation();
  render();
}

function handlePause() {
  if (!state.running) return;
  pauseSimulation();
  acknowledge("Pause received.");
  render();
}

function handleReset() {
  stopAnimationLoop();
  state.level = DESIGN.initialLevel;
  state.running = false;
  state.resultRevealed = false;
  state.lastFrameTime = null;
  clearAcknowledgement();
  render();
  announceReset();
}

function handleModeChange(mode) {
  if (mode !== "full" && mode !== "ack") return;
  state.feedbackMode = mode;
  state.resultRevealed = false;
  clearAcknowledgement();
  render();
}

function handleReveal() {
  if (state.feedbackMode !== "ack") return;
  state.resultRevealed = true;
  render();
  elements.acknowledgement.textContent = "Result revealed.";
}

/* 4. RULE: Simülasyon kuralları, arayüz çiziminden bağımsızdır */
function applyAddRule() {
  if (DESIGN.rules.addOnlyWhenPaused && state.running) return;
  state.level = clamp(state.level + DESIGN.addAmount, 0, DESIGN.capacity);
}

function startSimulation() {
  if (state.running || state.level <= 0) return;
  state.running = true;
  state.lastFrameTime = performance.now();
  scheduleAnimationFrame();
}

function pauseSimulation() {
  if (!state.running) return;
  state.running = false;
  state.lastFrameTime = null;
  stopAnimationLoop();
}

function drainByElapsedTime(now) {
  if (!state.running) return;

  if (state.lastFrameTime === null) {
    state.lastFrameTime = now;
    return;
  }

  const elapsedSeconds = Math.max(0, (now - state.lastFrameTime) / 1000);
  state.lastFrameTime = now;
  state.level = clamp(
    state.level - DESIGN.drainRatePerSecond * elapsedSeconds,
    0,
    DESIGN.capacity
  );

  if (state.level <= 0) {
    state.level = 0;
    state.running = false;
    state.lastFrameTime = null;
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/* 5. OUTPUT: Görsel ve erişilebilir arayüz güncellemeleri */
function applyDesignSettings() {
  const root = document.documentElement;
  root.style.setProperty("--page-bg", DESIGN.colors.page);
  root.style.setProperty("--surface", DESIGN.colors.surface);
  root.style.setProperty("--blue-pale", DESIGN.colors.pale);
  root.style.setProperty("--blue-light", DESIGN.colors.light);
  root.style.setProperty("--blue", DESIGN.colors.water);
  root.style.setProperty("--blue-deep", DESIGN.colors.deep);
  root.style.setProperty("--blue-strong", DESIGN.colors.strong);
  root.style.setProperty("--tank-width", `${DESIGN.tankWidth}px`);
  root.style.setProperty("--tank-height", `${DESIGN.tankHeight}px`);
}
function scheduleAnimationFrame() {
  if (!state.running || state.animationFrameId !== null) return;
  state.animationFrameId = requestAnimationFrame(animationLoop);
}

function animationLoop(now) {
  state.animationFrameId = null;
  if (!state.running) return;

  drainByElapsedTime(now);
  render();

  if (state.running) scheduleAnimationFrame();
  else announceEmptyIfNeeded();
}

function stopAnimationLoop() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

function render() {
  applyDesignSettings();
  elements.targetNote.textContent = `Task: try to stop between ${DESIGN.targetLow} and ${DESIGN.targetHigh} units.`;
  const showLiveState = state.feedbackMode === "full" || state.resultRevealed;
  const levelPercent = (state.level / DESIGN.capacity) * 100;
  const roundedLevel = Number(state.level.toFixed(DESIGN.displayDecimals));
  const status = getStatusText();

  elements.modeChip.textContent = state.feedbackMode === "full"
    ? "Full Feedback"
    : "Acknowledgement Only";

  elements.fullModeButton.classList.toggle("is-selected", state.feedbackMode === "full");
  elements.ackModeButton.classList.toggle("is-selected", state.feedbackMode === "ack");
  elements.fullModeButton.setAttribute("aria-pressed", String(state.feedbackMode === "full"));
  elements.ackModeButton.setAttribute("aria-pressed", String(state.feedbackMode === "ack"));

  /* Gizli modda tankın doluluk oranı ve işaretleri de saklanır. */
  elements.tank.hidden = !showLiveState;
  elements.tank.setAttribute("aria-hidden", String(!showLiveState));
  elements.stateFeedback.hidden = !showLiveState;
  elements.stateFeedback.setAttribute("aria-hidden", String(!showLiveState));
  elements.hiddenReadout.hidden = showLiveState;
  elements.revealRow.hidden = state.feedbackMode !== "ack" || state.resultRevealed;

  if (showLiveState) {
    elements.water.style.height = `${levelPercent}%`;
    elements.levelValue.textContent = String(roundedLevel);
    elements.statusLabel.textContent = status;
    elements.tank.setAttribute(
      "aria-label",
      `Reservoir tank showing ${roundedLevel} units. ${status}.`
    );
  }

  elements.addButton.disabled = DESIGN.rules.addOnlyWhenPaused && state.running;
  elements.startButton.disabled = state.running || state.level <= 0;
  elements.pauseButton.disabled = !state.running;

  if (state.running) {
    elements.controlHint.textContent = "The reservoir is draining at 5 units per second. Add 10 is available while paused.";
  } else {
    elements.controlHint.textContent = "Add 10 is available while the reservoir is paused.";
  }

  if (state.feedbackMode === "ack" && !state.resultRevealed) {
    elements.controlHint.textContent = "Live level and status are hidden. Press Reveal result when your attempt is finished.";
  }
}

function getStatusText() {
  if (state.level <= 0) return "Empty";
  return state.running ? "Running" : "Paused";
}

function acknowledge(message) {
  clearAcknowledgement();
  elements.acknowledgement.textContent = message;
  elements.addButton.classList.add("is-acknowledged");
  elements.acknowledgement.classList.remove("is-active");
  void elements.acknowledgement.offsetWidth;
  elements.acknowledgement.classList.add("is-active");

  state.acknowledgementTimeoutId = window.setTimeout(() => {
    elements.acknowledgement.textContent = "";
    elements.addButton.classList.remove("is-acknowledged");
    state.acknowledgementTimeoutId = null;
  }, DESIGN.acknowledgementDurationMs);
}

function clearAcknowledgement() {
  if (state.acknowledgementTimeoutId !== null) {
    window.clearTimeout(state.acknowledgementTimeoutId);
    state.acknowledgementTimeoutId = null;
  }
  elements.acknowledgement.textContent = "";
  elements.addButton.classList.remove("is-acknowledged");
}

function announceReset() {
  elements.acknowledgement.textContent = "Reservoir reset to 80 units.";
  if (state.feedbackMode === "ack" && !state.resultRevealed) {
    elements.acknowledgement.textContent = "Reservoir reset.";
  }
}

function announceEmptyIfNeeded() {
  if (state.level <= 0) {
    elements.acknowledgement.textContent = "The reservoir is empty.";
  }
}

/* İlk görünümü hazırla. */
render();
