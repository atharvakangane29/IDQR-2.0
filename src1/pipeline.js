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
        if (typeof initWithData !== 'function') return;

        if (window._uploadedRecords && window._uploadedRecords.length > 0) {
          // Use uploaded CSV data — only fetch mock for typeBadgeMap/regionCities schema
          fetch('data1/mockData.json')
            .then(r => r.json())
            .then(function(json) {
              // Build typeBadgeMap dynamically from uploaded data
              const badgeMap = {};
              window._uploadedRecords.forEach(function(r) {
                if (r.type && !badgeMap[r.type]) {
                  const t = r.type.toLowerCase();
                  if      (t.includes('region') || t.includes('territory')) badgeMap[r.type] = 'badge-reg';
                  else if (t.includes('date'))                               badgeMap[r.type] = 'badge-disc';
                  else if (t.includes('attribute'))                          badgeMap[r.type] = 'badge-vol';
                  else if (t.includes('account'))                            badgeMap[r.type] = 'badge-attr';
                  else                                                       badgeMap[r.type] = 'badge-fore';
                }
              });

              json.records        = window._uploadedRecords;
              json.typeBadgeMap   = badgeMap;
              // Build accountTypeIds from uploaded data
              const acctIds = {};
              window._uploadedRecords.forEach(function(r) {
                if (r.accounttype) {
                  if (!acctIds[r.accounttype]) acctIds[r.accounttype] = [];
                  acctIds[r.accounttype].push(r.id);
                }
              });
              json.accountTypeIds = acctIds;
              console.log('[IDQR] Initializing dashboard with', json.records.length, 'uploaded records');
              initWithData(json);
            });
        } else {
          fetch('data1/mockData.json')
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
