/* ═══════════════════════════════════════════
   IDQR 2.0 — Pipeline Transition Engine
   src/pipeline.js
═══════════════════════════════════════════ */

const Pipeline = (() => {
  let currentScreen = 0;
  const TOTAL_SCREENS = 7; // 0: landing, 1: loadtype, 2: upload, 3: kpis, 4: hyperparams, 5: training, 6: dashboard
  let stack = null;

  const STEP_LABELS = ['Upload', 'Review Data', 'Configure', 'Train', 'Dashboard'];

  function init() {
    stack = document.getElementById('pipelineStack');
    updateStepIndicators();
  }

  function advanceTo(screenIndex) {
    if (screenIndex < 0 || screenIndex >= TOTAL_SCREENS) return;
    currentScreen = screenIndex;
    stack.style.transform = `translateY(-${screenIndex * 100}vh)`;
    updateStepIndicators();
    // Fire screen-specific init hooks if defined
    const hooks = {
      1: () => LoadType && LoadType.init(),
      3: () => DataKPIs && DataKPIs.init(),
      5: () => Training && Training.init(),
      6: () => {
        // Show FABs
        const rf = document.getElementById('reportFab');
        const hf = document.getElementById('historyFab');
        if (rf) rf.style.display = 'flex';
        if (hf) hf.style.display = 'flex';
        // hand off to existing app.js
        if (typeof initWithData === 'function') {
          fetch('data1/mockData.json')
            .then(r => r.json())
            .then(json => {
              initWithData(json);
              // save this as a full or incremental load
              if (typeof LoadType !== 'undefined' && typeof SessionStore !== 'undefined') {
                const lt = LoadType.getType();
                if (lt === 'incremental') {
                  SessionStore.saveIncremental(json.records, 'Incremental — mockData');
                } else {
                  SessionStore.saveFullLoad(json.records, 'Full Load — mockData');
                }
                HistoryPanel && HistoryPanel.refresh();
              }
            });
        }
      }
    };
    if (hooks[screenIndex]) {
      setTimeout(hooks[screenIndex], 100);
    }
  }

  function next() {
    advanceTo(currentScreen + 1);
  }

  function updateStepIndicators() {
    // screen 0 = landing, screen 1 = loadtype (no step bar on these two)
    // screens 2-6 map to steps 0-4
    document.querySelectorAll('.pipe-step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      const stepScreen = i + 2; // step 0 = screen 2, etc.
      if (stepScreen < currentScreen)  el.classList.add('done');
      if (stepScreen === currentScreen) el.classList.add('active');
    });
  }

  return { init, advanceTo, next };
})();

document.addEventListener('DOMContentLoaded', () => Pipeline.init());
