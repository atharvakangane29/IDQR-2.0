/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 5: Training / Loading
   src/views/training.js
═══════════════════════════════════════════ */

const Training = (() => {

  let miniChart = null;
  let started   = false;

  const STEPS = [
    { id: 'step0', label: 'Ingesting records',            duration: 700  },
    { id: 'step1', label: 'Normalizing by account type',  duration: 900  },
    { id: 'step2', label: 'Running anomaly detection',    duration: 1100 },
    { id: 'step3', label: 'Scoring deviations',           duration: 800  },
    { id: 'step4', label: 'Building time series',         duration: 900  },
    { id: 'step5', label: 'Finalizing dashboard',         duration: 600  },
  ];

  function init() {
    if (started) return;
    started = true;
    buildMiniChart();
    runSteps();
  }

  /* ─── Mini line chart animates left-to-right ─── */
  function buildMiniChart() {
    const canvas = document.getElementById('trainingMiniChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (miniChart) { miniChart.destroy(); miniChart = null; }

    // Build a short flat baseline — we'll push data in progressively
    const labels = Array.from({ length: 40 }, (_, i) => i);
    const seed   = 42;
    function seededRng(s) { let x = s; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
    const rng    = seededRng(seed);
    const fullData = labels.map(i => +(75 + Math.sin(i / 3.5) * 30 + (rng() - .5) * 8).toFixed(1));
    const visibleData = new Array(40).fill(null);

    miniChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: visibleData,
          borderColor: 'rgba(255,177,98,.7)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: .4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 20, max: 200 }
        }
      }
    });

    // Animate data appearing left to right
    let i = 0;
    const interval = setInterval(() => {
      if (i >= 40) { clearInterval(interval); return; }
      visibleData[i] = fullData[i];
      miniChart.data.datasets[0].data = [...visibleData];
      miniChart.update('none');
      i++;
    }, 90);
  }

  /* ─── Sequential step runner ─── */
  async function runSteps() {
    const progressFill = document.getElementById('trainingProgressFill');
    const totalTime    = STEPS.reduce((s, st) => s + st.duration, 0);
    let elapsed        = 0;

    for (let i = 0; i < STEPS.length; i++) {
      const stepEl = document.getElementById(STEPS[i].id);
      if (!stepEl) continue;

      // Activate current, mark previous done
      if (i > 0) {
        const prev = document.getElementById(STEPS[i - 1].id);
        if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
      }
      stepEl.classList.add('active');

      // Update progress bar
      elapsed += STEPS[i].duration;
      if (progressFill) {
        progressFill.style.width = ((elapsed / totalTime) * 100).toFixed(1) + '%';
      }

      // Show stats mid-way through
      if (i === 2) showStat('stat0');
      if (i === 3) showStat('stat1');
      if (i === 4) showStat('stat2');

      await wait(STEPS[i].duration);
    }

    // Mark last step done
    const last = document.getElementById(STEPS[STEPS.length - 1].id);
    if (last) { last.classList.remove('active'); last.classList.add('done'); }
    if (progressFill) progressFill.style.width = '100%';

    // Brief pause then advance to dashboard
    await wait(800);
    Pipeline.advanceTo(6);  

    // Show toast on dashboard load
    setTimeout(() => {
      if (typeof showToast === 'function') showToast('Model ready — dashboard loaded');
    }, 600);
  }

  function showStat(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { init };
})();
