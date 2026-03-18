/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 4: Hyperparameter Config
   src/views/hyperparams.js
═══════════════════════════════════════════ */

const Hyperparams = (() => {

  const config = {
    sensitivity:  'Medium',
    lookback:     '26 Weeks',
    accountTypes: [], // empty = all
    weightByVol:  true,
    minScore:     10
  };

  const ACCOUNT_TYPES = [
    'Long Term Care Pharmacy', 'Long Term Care', 'Specialty Pharmacy',
    'Pharmacy', 'Community Practice', 'Community Hospital',
    'Academic NCI/NCCN', 'Academic', 'Childrens Hospital', 'VA', 'Other'
  ];

  let datasetMaxDate = null;
  let datasetMinDate = null;

  async function init() {
    renderAccountTypeGrid();
    bindPillToggles();
    bindYNToggles();
    initSensSlider();
    await setupLookbackWindow(); // Fetch dates and setup range logic
  }

  /* ─── DYNAMIC LOOKBACK WINDOW LOGIC ─── */
  async function setupLookbackWindow() {
    // 1. Fetch data to find min and max dates
    let data = [];
    if (window._uploadedRecords && window._uploadedRecords.length > 0) {
      data = window._uploadedRecords;
    } else {
      try {
        const res = await fetch('data1/mockData.json');
        const json = await res.json();
        data = json.records;
      } catch(e) {
        console.warn('Could not load mock data for dates', e);
      }
    }

    // 2. Calculate dates from data
    if (data.length > 0) {
      const realDates = data.map(r => r.invoiceDate ? new Date(r.invoiceDate) : null).filter(Boolean);
      if (realDates.length > 0) {
        datasetMaxDate = new Date(Math.max(...realDates.map(d => d.getTime())));
        datasetMinDate = new Date(Math.min(...realDates.map(d => d.getTime())));
      } else {
        // Fallback to weekIdx if exact invoice dates aren't available
        const weekIdxs = data.map(r => r.weekIdx).filter(n => !isNaN(n));
        const maxWk = weekIdxs.length ? Math.max(...weekIdxs) : 78;
        const minWk = weekIdxs.length ? Math.min(...weekIdxs) : 0;
        const epoch = window._dataEpoch || new Date('2024-07-07');
        datasetMaxDate = new Date(epoch.getTime() + maxWk * 7 * 24 * 60 * 60 * 1000);
        datasetMinDate = new Date(epoch.getTime() + minWk * 7 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Safe fallback
      datasetMaxDate = new Date();
      datasetMinDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    }

    // 3. Update the description text with the formatted max date
    const descEl = document.getElementById('lookbackDesc');
    const fmtMax = datasetMaxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (descEl) {
      descEl.innerHTML = `How much historical data should inform the <strong>${fmtMax}</strong>?`;
    }

    // 4. Bind the select dropdown to update the range label
    const select = document.getElementById('lookbackSelect');
    if (select) {
      select.addEventListener('change', (e) => {
        config.lookback = e.target.value;
        updateDateRangeLabel(e.target.value);
      });
      // Fire once on load to populate the initial state
      updateDateRangeLabel(select.value);
    }
  }

  function updateDateRangeLabel(val) {
    const displayEl = document.getElementById('lookbackDateRange');
    if (!displayEl || !datasetMaxDate) return;

    let startDate = new Date(datasetMaxDate);
    
    // Calculate the start date based on dropdown selection
    if (val === '4 Weeks') {
      startDate.setDate(datasetMaxDate.getDate() - (4 * 7));
    } else if (val === '13 Weeks') {
      startDate.setDate(datasetMaxDate.getDate() - (13 * 7));
    } else if (val === '26 Weeks') {
      startDate.setDate(datasetMaxDate.getDate() - (26 * 7));
    } else if (val === 'All Time') {
      startDate = new Date(datasetMinDate);
    }

    const fmtStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtMax = datasetMaxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    displayEl.textContent = `${fmtStart} — ${fmtMax}`;
  }


  /* ─── EXISTING UI BINDINGS (Pills, Y/N, Sensitivity Slider) ─── */
  function renderAccountTypeGrid() {
    const grid = document.getElementById('acctTypeGrid');
    if (!grid) return;
    grid.innerHTML = ACCOUNT_TYPES.map(t => `
      <button class="acct-tag" onclick="Hyperparams.toggleAcctType(this, '${t}')">${t}</button>
    `).join('');
  }

  function bindPillToggles() {
    document.querySelectorAll('.pill-toggle:not(#sensPillToggle)').forEach(group => {
      group.querySelectorAll('.pill-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.pill-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const key = group.dataset.key || 'minScore'; 
          config[key] = btn.dataset.value || btn.textContent.trim();
        });
      });
    });
  }

  function bindYNToggles() {
    document.querySelectorAll('.yn-toggle').forEach(group => {
      group.querySelectorAll('.yn-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.yn-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const key = group.dataset.key;
          if (key) config[key] = btn.dataset.value === 'true';
        });
      });
    });
  }

  function initSensSlider() {
    const slider = document.getElementById('sensSlider');
    const wrap = document.getElementById('sensSliderWrap');
    const pills = document.querySelectorAll('#sensPillToggle .pill-opt');
    if (!slider || !wrap || !pills.length) return;

    function interpolateColor(color1, color2, factor) {
      const result = color1.slice();
      for (let i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
      }
      return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
    }

    function getSensColor(val) {
      const cLow = [127, 163, 192];
      const cMed = [255, 177, 98];
      const cHigh = [163, 81, 57];
      if (val <= 50) return interpolateColor(cLow, cMed, val / 50);
      return interpolateColor(cMed, cHigh, (val - 50) / 50);
    }

    function updateSensUI(val) {
      slider.value = val;
      const color = getSensColor(val);
      wrap.style.setProperty('--sens-color', color);

      let idx = 1; 
      if (val <= 33) idx = 0;
      else if (val >= 67) idx = 2;

      const values = ['Low', 'Medium', 'High'];
      config.sensitivity = values[idx];

      pills.forEach((p, i) => {
        if (i === idx) {
          p.classList.add('selected');
          p.style.backgroundColor = color;
          p.style.borderColor = color;
          p.style.color = (val > 65) ? '#fff' : 'var(--truffle)'; 
        } else {
          p.classList.remove('selected');
          p.style.backgroundColor = '';
          p.style.borderColor = '';
          p.style.color = '';
        }
      });
    }

    slider.addEventListener('input', (e) => updateSensUI(e.target.value));

    pills.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const targetValues = [16, 50, 84]; 
        updateSensUI(targetValues[idx]);
      });
    });

    updateSensUI(50);
  }

  function toggleAcctType(btn, type) {
    btn.classList.toggle('selected');
    if (btn.classList.contains('selected')) {
      config.accountTypes.push(type);
    } else {
      config.accountTypes = config.accountTypes.filter(t => t !== type);
    }
  }

  function getConfig() { return { ...config }; }

  return { init, toggleAcctType, getConfig };
})();

document.addEventListener('DOMContentLoaded', () => Hyperparams.init());