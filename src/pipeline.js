/* ═══════════════════════════════════════════
   IDQR 2.0 — Pipeline Transition Engine
   src/pipeline.js
═══════════════════════════════════════════ */

const Pipeline = (() => {
  let currentScreen = 0;
  const TOTAL_SCREENS = 6; // 0-indexed: landing, upload, kpis, hyperparams, training, dashboard
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
      2: () => DataKPIs && DataKPIs.init(),
      4: () => Training && Training.init(),
      5: () => {
        // hand off to existing app.js
        if (typeof initWithData === 'function') {
          fetch('data/mockData.json')
            .then(r => r.json())
            .then(json => initWithData(json));
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
    // screen 0 = landing (no step bar)
    // screens 1-5 map to steps 0-4
    document.querySelectorAll('.pipe-step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      const stepScreen = i + 1; // step 0 = screen 1, etc.
      if (stepScreen < currentScreen)  el.classList.add('done');
      if (stepScreen === currentScreen) el.classList.add('active');
    });
  }

  return { init, advanceTo, next };
})();

document.addEventListener('DOMContentLoaded', () => Pipeline.init());
