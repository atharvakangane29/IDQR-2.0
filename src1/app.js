/* ═══════════════════════════════════════════
   IDQR 2.0 — Application Logic
   src/app.js
   Depends on: Chart.js (global), mockData.json loaded via dataLoader.js
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   TIME SERIES — built once from loaded data
═══════════════════════════════════════════ */
const WEEKS = 78;

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const startDate = new Date("2024-07-07");
const TIME_LABELS = [], BASELINE = [], REGIONAL_BASE = [];

(function buildTimeSeries() {
  const rng = seededRng(42);
  for (let i = 0; i < WEEKS; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * 7);
    const mo = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    TIME_LABELS.push(i % 4 === 0 ? mo : "");
    BASELINE.push(+(22 + Math.sin(i / 10) * 3 + (rng() - .5) * 1.5).toFixed(1));
    const reg = 75 + Math.sin(i / 3.5) * 38 + Math.cos(i / 7) * 12 + (rng() - .5) * 10;
    REGIONAL_BASE.push(+Math.max(10, reg).toFixed(1));
  }
})();

function buildRegionalWithAnomalies(activeData) {
  return ALL_DATA._precomputedForecast || [...REGIONAL_BASE];
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let ALL_DATA     = [];   // populated after JSON loads
let TYPE_BADGE   = {};
let REGION_CITIES = {};
let ACCT_IDS     = {};

let filters  = { date: "All Time", state: "All States", acct: "All Types", sevLo: 0, sevHi: 30 };
let currentData = [];
let cfIds    = new Set();
let cfSource = "";
let sortKey  = "score";
let sortAsc  = false;

let scatterInst, lineInst, tierInst;

/* ═══════════════════════════════════════════
   DATA LOADER — called by dataLoader.js
═══════════════════════════════════════════ */
function initWithData(json) {
  ALL_DATA      = json.records;
  TYPE_BADGE    = json.typeBadgeMap;
  REGION_CITIES = json.regionCities;
  ACCT_IDS      = json.accountTypeIds;
  applyFilters();
  initSeveritySlider();
  document.getElementById("nlSearch")
    .addEventListener("keydown", e => { if (e.key === "Enter") runNLSearch(); });
}

/* ═══════════════════════════════════════════
   CROSS-FILTER HUB
═══════════════════════════════════════════ */
function setCF(ids, source) {
  cfIds    = ids;
  cfSource = source;
  const hasSel  = cfIds.size > 0;
  const selData = hasSel ? currentData.filter(r => cfIds.has(r.id)) : currentData;

  updateKPIs(selData, hasSel ? currentData.length : null);
  applyTableCF();
  if (source !== "scatter") applyScatterCF();
  if (source !== "line")    rebuildLine(currentData, hasSel ? cfIds : null);
  if (source !== "tier")    buildTier(selData);

  if (hasSel) {
    const names = selData.slice(0, 2).map(r => r.name).join(", ")
      + (selData.length > 2 ? ` +${selData.length - 2} more` : "");
    document.getElementById("cfBannerText").innerHTML =
      `<strong>${selData.length}</strong> record${selData.length !== 1 ? "s" : ""} selected: ${names}
       <span class="cf-source-label">via ${source}</span>`;
    document.getElementById("cfBanner").classList.add("show");
  } else {
    document.getElementById("cfBanner").classList.remove("show");
  }
}

function clearCF() {
  cfIds = new Set(); cfSource = "";
  updateKPIs(currentData, null);
  applyTableCF();
  applyScatterCF();
  rebuildLine(currentData, null);
  buildTier(currentData);
  document.getElementById("cfBanner").classList.remove("show");
  showToast("Selection cleared");
}

/* ═══════════════════════════════════════════
   GAUGE
═══════════════════════════════════════════ */
function updateGauge(val) {
  const v = isNaN(val) ? 0 : val;
  document.getElementById("gaugeVal").textContent = v.toFixed(2);
  document.getElementById("gaugeVal").style.color = v >= 20 ? "#A35139" : v >= 12 ? "#FFB162" : "#4A6B8A";
  const deg = -90 + (Math.min(v, 30) / 30) * 180;
  document.getElementById("gaugeNeedle").style.transform = `rotate(${deg}deg)`;
}

/* ═══════════════════════════════════════════
   KPIs
═══════════════════════════════════════════ */
function updateKPIs(data, totalCount) {
  const n   = data.length;
  const max = n ? data.reduce((m, r) => Math.max(m, r.score), 0) : 0;
  const avg = n ? (data.reduce((s, r) => s + r.score, 0) / n) : 0;
  const vol = data.reduce((s, r) => s + ((r.id * 17 + 200) % 900) + 300, 0);
  const prefix = totalCount !== null ? `${n} / ${totalCount}` : "" + n;
  document.getElementById("kTotal").textContent    = prefix;
  document.getElementById("kTotalSub").textContent = n >= 12 ? "↑ Above baseline" : "↓ Below baseline";
  document.getElementById("kVol").textContent      = vol.toLocaleString();
  document.getElementById("kVolSub").textContent   = "~$" + (vol * 0.096).toFixed(0) + "K estimated exposure";
  document.getElementById("kAvgSub").textContent   = "Avg score: " + avg.toFixed(2);
  updateGauge(max);
}

/* ═══════════════════════════════════════════
   TABLE
═══════════════════════════════════════════ */
function scoreClass(s) { return s >= 20 ? "crit" : s >= 12 ? "warn" : "ok"; }

let tableDisplayData = [];

function renderTable(data) {
  tableDisplayData = [...data].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === "number") return sortAsc ? (va - vb) : (vb - va);
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  document.getElementById("rowCount").textContent = `${data.length} record${data.length !== 1 ? "s" : ""}`;
  const hasSel = cfIds.size > 0;
  const tbody  = document.getElementById("tableBody");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:#aaa">No records match filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = tableDisplayData.map(r => {
    const sel = hasSel && cfIds.has(r.id);
    const dim = hasSel && !cfIds.has(r.id);
    return `<tr data-id="${r.id}"
      class="${r.score >= 20 ? "critical" : ""} ${sel ? "cf-sel" : ""} ${dim ? "cf-dim" : ""}"
      onclick="tableRowClick(${r.id})">
      <td>${String(r.id).padStart(8, '0')}</td>
      <td>${r.name}</td>
      <td>${r.region}</td>
      <td><span class="badge ${TYPE_BADGE[r.type] || "badge-disc"}">${r.type}</span></td>
      <td><span class="score-val ${scoreClass(r.score)}">${r.score.toFixed(2)}</span></td>
      <td style="color:#666;font-size:0.875rem">${r.reason}</td>
    </tr>`;
  }).join("");
}

function applyTableCF() {
  const hasSel = cfIds.size > 0;
  document.querySelectorAll("#tableBody tr[data-id]").forEach(tr => {
    const id = +tr.dataset.id;
    tr.classList.toggle("cf-sel", hasSel && cfIds.has(id));
    tr.classList.toggle("cf-dim", hasSel && !cfIds.has(id));
  });
}

function tableRowClick(id) {
  if (cfIds.size === 1 && cfIds.has(id)) {
    clearCF();
  } else {
    setCF(new Set([id]), "table");
    showToast("Row selected — cross-filtering");
  }
}

function sortTable(key) {
  if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = false; }
  renderTable(currentData);
  applyTableCF();
}

/* ═══════════════════════════════════════════
   SCATTER CHART
═══════════════════════════════════════════ */
function buildScatter(data) {
  const normal = [], warn = [], crit = [];
  const rngS = seededRng(99);
  for (let i = 0; i < 90; i++) {
    const x = rngS() * 240 + 20, y = rngS() * 3 + 2 + x * .004;
    normal.push({ x, y, r: rngS() * 3 + 4, _id: null });
  }
  data.forEach(r => {
    const x = 80 + (r.id % 750), y = r.score, rad = 5 + r.score * .38;
    const pt = { x, y, r: rad, _id: r.id };
    if (r.score >= 18)      crit.push(pt);
    else if (r.score >= 10) warn.push(pt);
    else                    normal.push(pt);
  });

  const canvas = document.getElementById("scatterChart");
  if (scatterInst) { scatterInst.destroy(); scatterInst = null; }
  scatterInst = new Chart(canvas, {
    type: "bubble",
    data: { datasets: [
      { label: "Normal",   data: normal, backgroundColor: "rgba(74,107,138,.48)",  borderColor: "rgba(74,107,138,.2)",  borderWidth: 1 },
      { label: "Warning",  data: warn,   backgroundColor: "rgba(255,177,98,.72)",  borderColor: "rgba(255,177,98,.35)", borderWidth: 1 },
      { label: "Critical", data: crit,   backgroundColor: "rgba(163,81,57,.82)",   borderColor: "rgba(163,81,57,.4)",   borderWidth: 1 },
    ]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      onClick(evt, elements) {
        if (!elements.length) { if (cfIds.size > 0) clearCF(); return; }
        const newIds = new Set();
        elements.forEach(el => {
          const pt = scatterInst.data.datasets[el.datasetIndex].data[el.index];
          if (pt._id) newIds.add(pt._id);
        });
        if (newIds.size) {
          setCF(newIds, "scatter");
          applyScatterCF();
          showToast(`${newIds.size} point${newIds.size > 1 ? "s" : ""} selected`);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1B2632", titleColor: "#EEE9DF", bodyColor: "#C9C1B1",
          callbacks: {
            label: c => {
              const d = c.raw;
              if (d._id) {
                const rec = ALL_DATA.find(r => r.id === d._id);
                return rec ? ` ${rec.name}  Score: ${d.y.toFixed(2)}` : "";
              }
              return ` Vol: ${Math.round(d.x)}  Score: ${d.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Transaction Volume", color: "#6B7E91", font: { size: 10, weight: "600" } },
          grid: { color: "rgba(44,59,77,.06)" },
          ticks: { color: "#8a9dae", font: { size: 9 } }
        },
        y: {
          title: { display: true, text: "Deviation Score", color: "#6B7E91", font: { size: 10, weight: "600" } },
          grid: { color: "rgba(44,59,77,.06)" },
          ticks: { color: "#8a9dae", font: { size: 9 } },
          min: 0, max: 28
        }
      }
    }
  });
}

function applyScatterCF() {
  if (!scatterInst) return;
  const hasSel = cfIds.size > 0;
  scatterInst.data.datasets.forEach(ds => {
    const base = ds.label === "Normal"
      ? "rgba(74,107,138,.48)"
      : ds.label === "Warning"
        ? "rgba(255,177,98,.72)"
        : "rgba(163,81,57,.82)";
    ds.backgroundColor = ds.data.map(pt => {
      if (!hasSel) return base;
      if (pt._id === null) return "rgba(180,170,160,.12)";
      return cfIds.has(pt._id) ? base : "rgba(180,170,160,.12)";
    });
    ds.borderWidth = ds.data.map(pt =>
      (!hasSel || pt._id === null) ? 1 : cfIds.has(pt._id) ? 2.5 : 0
    );
  });
  scatterInst.update("none");
}

/* ═══════════════════════════════════════════
   LINE CHART — anomaly band plugin + rebuild
═══════════════════════════════════════════ */
const bandPlugin = {
  id: "bandPlugin",
  beforeDraw(chart) {
    const { ctx, chartArea: ca, scales } = chart;
    if (!ca || !scales.x) return;
    const bands = chart.config.options._bands || [];
    ctx.save();
    bands.forEach(b => {
      const x0 = scales.x.getPixelForValue(b.s);
      const x1 = scales.x.getPixelForValue(b.e);
      ctx.fillStyle = "rgba(163,81,57,.11)";
      ctx.fillRect(x0, ca.top, x1 - x0, ca.bottom - ca.top);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "rgba(163,81,57,.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, ca.top); ctx.lineTo(x0, ca.bottom); ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const { ctx, scales } = chart;
    if (!scales.x || !scales.y) return;
    const peaks = chart.config.options._peaks || [];
    peaks.forEach(p => {
      const x = scales.x.getPixelForValue(p.xi);
      const y = scales.y.getPixelForValue(p.v) - 12;
      ctx.save();
      ctx.font = "bold 9.5px 'DM Sans', sans-serif";
      ctx.fillStyle = "#A35139";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(p.v), x, y);
      ctx.restore();
    });
  }
};
Chart.register(bandPlugin);

function computeBands(weeks) {
  if (!weeks.size) return [];
  const sorted = [...weeks].sort((a, b) => a - b);
  const HALO = 2;
  const raw = sorted.map(w => ({ s: Math.max(0, w - HALO), e: Math.min(WEEKS - 1, w + HALO) }));
  const merged = [];
  raw.forEach(iv => {
    if (!merged.length || iv.s > merged[merged.length - 1].e + 1) {
      merged.push({ ...iv });
    } else {
      merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e);
    }
  });
  return merged;
}

function rebuildLine(data, highlightIds) {
  const regional    = buildRegionalWithAnomalies(data);
  const anomalyWeeks = new Set(data.map(r => r.weekIdx));
  const bands        = computeBands(anomalyWeeks);

  const hlWeeks = highlightIds
    ? new Set(data.filter(r => highlightIds.has(r.id)).map(r => r.weekIdx))
    : anomalyWeeks;

  const ptRadius   = Array.from({ length: WEEKS }, (_, i) => anomalyWeeks.has(i) ? 5 : 0);
  const ptBgColor  = Array.from({ length: WEEKS }, (_, i) => {
    if (!anomalyWeeks.has(i)) return "transparent";
    if (highlightIds) return hlWeeks.has(i) ? "#A35139" : "rgba(163,81,57,.2)";
    return "#A35139";
  });

  const peaks = [];
  data.forEach(r => {
    const wi = r.weekIdx;
    if (wi >= 0 && wi < WEEKS) {
      const isHl = !highlightIds || hlWeeks.has(wi);
      if (isHl) peaks.push({ xi: wi, v: regional[wi] });
    }
  });

  const canvas = document.getElementById("lineChart");
  if (lineInst) { lineInst.destroy(); lineInst = null; }
  lineInst = new Chart(canvas, {
    type: "line",
    data: { labels: TIME_LABELS, datasets: [
      {
        label: "Global Avg",
        data: BASELINE,
        borderColor: "rgba(170,158,143,.85)",
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: .4
      },
      {
        label: "Region",
        data: regional,
        borderColor: "#2C3B4D",
        borderWidth: 2,
        pointRadius: ptRadius,
        pointBackgroundColor: ptBgColor,
        pointBorderColor: ptBgColor,
        pointHoverRadius: 7,
        fill: false,
        tension: .25
      }
    ]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      _bands: bands,
      _peaks: peaks,
      onClick(evt, elements) {
        if (!elements.length) { if (cfIds.size > 0) clearCF(); return; }
        const newIds = new Set();
        elements.forEach(el => {
          if (el.datasetIndex !== 1) return;
          const wi = el.index;
          currentData.filter(r => r.weekIdx === wi).forEach(r => newIds.add(r.id));
        });
        if (newIds.size) {
          setCF(newIds, "line");
          showToast(`${newIds.size} record${newIds.size > 1 ? "s" : ""} selected from chart`);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1B2632", titleColor: "#EEE9DF", bodyColor: "#C9C1B1",
          callbacks: {
            title: items => {
              const i = items[0].dataIndex;
              const d = new Date(startDate); d.setDate(d.getDate() + i * 7);
              return "Week of " + d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            },
            label: item => {
              const i = item.dataIndex;
              const matched = currentData.filter(r => r.weekIdx === i);
              if (matched.length) return matched.map(r => ` [!] ${r.name}: ${r.score.toFixed(1)}`);
              return ` ${item.dataset.label}: ${item.raw}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8a9dae", font: { size: 8 }, maxRotation: 0 } },
        y: {
          grid: { color: "rgba(44,59,77,.05)" },
          ticks: { color: "#8a9dae", font: { size: 8.5 } },
          title: { display: true, text: "Net Sales Units", color: "#8a9dae", font: { size: 9 } }
        }
      }
    }
  });
}

/* ═══════════════════════════════════════════
   TIER BAR CHART
═══════════════════════════════════════════ */
function buildTier(data) {
  const counts = {};
  data.forEach(r => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const chartData = Object.values(counts);

  const canvas = document.getElementById("tierChart");
  if (tierInst) { tierInst.destroy(); tierInst = null; }
  tierInst = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels.map(l => l.length > 25 ? l.substring(0, 22) + '...' : l),
      datasets: [{
        label: "Total Anomalies",
        data: chartData,
        backgroundColor: ["#2C3B4D", "#FFB162", "#A35139", "#C9C1B1", "#7FA3C0"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      onClick(evt, elements) {
        if (!elements.length) return;
        const idx = elements[0].index;
        const selType = labels[idx];
        const matched = currentData.filter(r => r.type === selType);
        if (matched.length) {
          setCF(new Set(matched.map(r => r.id)), "tier");
          showToast(`${selType}: ${matched.length} records`);
        }
      },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1B2632" } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8a9dae", font: { size: 9 } } },
        y: { grid: { color: "rgba(44,59,77,.06)" }, ticks: { color: "#8a9dae", font: { size: 9 } }, beginAtZero: true }
      }
    }
  });
}

/* ═══════════════════════════════════════════
   GLOBAL FILTERS
═══════════════════════════════════════════ */
function updateStateDropdown(baseData) {
  // Extract unique 2-letter states from the available data
  const states = Array.from(new Set(baseData.map(r => {
    const parts = (r.region || "").split(',');
    return parts.length > 1 ? parts[1].trim() : r.region;
  }).filter(Boolean))).sort();

  const dd = document.getElementById("dd-region");
  if (!dd) return;

  let html = `<div class="dropdown-item ${filters.state === 'All States' ? 'chosen' : ''}" onclick="pickFilter('state','All States','btn-region','lbl-region')"><div class="di-dot" style="background:#C9C1B1"></div>All States</div><div class="dropdown-divider"></div>`;

  states.forEach((st, i) => {
    const colors = ["#2C3B4D", "#FFB162", "#4A6B8A", "#A35139", "#7FA3C0"];
    const color = colors[i % colors.length];
    const isChosen = filters.state === st ? 'chosen' : '';
    html += `<div class="dropdown-item ${isChosen}" onclick="pickFilter('state','${st}','btn-region','lbl-region')"><div class="di-dot" style="background:${color}"></div>${st}</div>`;
  });

  dd.innerHTML = html;
}

function applyFilters() {
  let data = [...ALL_DATA];

  // 1. Filter by Account
  if (filters.acct !== "All Types") {
    const ids = ACCT_IDS[filters.acct] || [];
    data = data.filter(r => ids.includes(r.id));
  }

  // 2. Filter by Severity
  data = data.filter(r => r.score >= filters.sevLo && r.score <= filters.sevHi);

  // 3. Filter by Date
  if (filters.date !== "All Time") {
    const skip = { "Last 30 Days": 3, "Q2 2025": 4, "Q1 2025": 2, "Last 6 Months": 1 }[filters.date] || 0;
    if (data.length > 4) data = data.filter((_, i) => i % 5 !== skip);
  }

  // 4. Update dynamic State dropdown using data valid up to this point
  updateStateDropdown(data);

  // 5. Filter by State
  if (filters.state !== "All States") {
    data = data.filter(r => (r.region || "").includes(filters.state));
  }

  // REMOVED the artificial "ALL_DATA.slice(0, 5)" fallback to fix the math!

  currentData = data;
  cfIds = new Set(); cfSource = "";
  document.getElementById("cfBanner").classList.remove("show");

  updateKPIs(data, null);
  renderTable(data);
  buildScatter(data);
  rebuildLine(data, null);
  buildTier(data);
  renderChips();
}

/* ─── DROPDOWN ─── */
function toggleDD(ddId, btnId) {
  const dd = document.getElementById(ddId);
  const wasOpen = dd.classList.contains("open");
  closeAllDD();
  if (!wasOpen) {
    dd.classList.add("open");
    document.getElementById(btnId).classList.add("active");
  }
}
function closeAllDD() {
  document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
}
document.addEventListener("click", e => { if (!e.target.closest(".hf")) closeAllDD(); });

function pickFilter(type, value, btnId, lblId) {
  document.getElementById(lblId).textContent = value;
  closeAllDD();
  document.querySelectorAll(`#dd-${type} .dropdown-item`)
    .forEach(el => el.classList.toggle("chosen", el.textContent.trim() === value));
  filters[type] = value;
  applyFilters();
  showToast("Filter: " + value);
}

/* ─── SEVERITY RANGE SLIDER ─── */
function initSeveritySlider() {
  const MAX     = 30;
  const track   = document.getElementById("sevTrack");
  const thumbLo = document.getElementById("sevThumbLo");
  const thumbHi = document.getElementById("sevThumbHi");
  const fill    = document.getElementById("sevFill");
  const label   = document.getElementById("sevVal");

  function pct(cx) {
    const r = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (cx - r.left) / r.width));
  }
  function toScore(p) { return Math.round(p * MAX); }
  function toLeft(score) { return (score / MAX * 100).toFixed(2) + "%"; }

  function updateSliderUI() {
    const lo = filters.sevLo, hi = filters.sevHi;
    thumbLo.style.left   = toLeft(lo);
    thumbHi.style.left   = toLeft(hi);
    fill.style.left      = toLeft(lo);
    fill.style.width     = ((hi - lo) / MAX * 100).toFixed(2) + "%";
    label.textContent    = lo + " – " + hi;
  }

  updateSliderUI();

  let dragging = null;

  function startDrag(which, e) { dragging = which; e.preventDefault(); }
  thumbLo.addEventListener("mousedown",  e => startDrag("lo", e));
  thumbHi.addEventListener("mousedown",  e => startDrag("hi", e));
  thumbLo.addEventListener("touchstart", e => startDrag("lo", e), { passive: false });
  thumbHi.addEventListener("touchstart", e => startDrag("hi", e), { passive: false });

  function onMove(cx) {
    if (!dragging) return;
    const s = toScore(pct(cx));
    if (dragging === "lo") filters.sevLo = Math.min(s, filters.sevHi - 1);
    else                   filters.sevHi = Math.max(s, filters.sevLo + 1);
    updateSliderUI();
  }
  document.addEventListener("mousemove", e => { if (dragging) onMove(e.clientX); });
  document.addEventListener("touchmove", e => { if (dragging) onMove(e.touches[0].clientX); }, { passive: true });

  function stopDrag() {
    if (!dragging) return;
    dragging = null;
    applyFilters();
    showToast("Score range: " + filters.sevLo + " – " + filters.sevHi);
  }
  document.addEventListener("mouseup",  stopDrag);
  document.addEventListener("touchend", stopDrag);

  track.addEventListener("click", e => {
    if (e.target === thumbLo || e.target === thumbHi) return;
    const s = toScore(pct(e.clientX));
    const midpoint = (filters.sevLo + filters.sevHi) / 2;
    if (s <= midpoint) filters.sevLo = Math.min(s, filters.sevHi - 1);
    else               filters.sevHi = Math.max(s, filters.sevLo + 1);
    updateSliderUI();
    applyFilters();
    showToast("Score range: " + filters.sevLo + " – " + filters.sevHi);
  });
}

/* ─── ACTIVE FILTER CHIPS ─── */
function renderChips() {
  const bar   = document.getElementById("activeFilters");
  const chips = [];
  if (filters.date !== "All Time")      chips.push({ key: "date",   label: "Date: " + filters.date });
  if (filters.state !== "All States")   chips.push({ key: "state",  label: "State: " + filters.state });
  if (filters.acct !== "All Types")     chips.push({ key: "acct",   label: "Acct: " + filters.acct });
  if (filters.sevLo !== 0 || filters.sevHi !== 30)
    chips.push({ key: "sev", label: "Score: " + filters.sevLo + " – " + filters.sevHi });
  bar.innerHTML = chips.map(c =>
    `<span class="af-chip" onclick="clearFilter('${c.key}')">${c.label} <span class="af-x">×</span></span>`
  ).join("");
}

function clearFilter(key) {
  const def = { date: "All Time", state: "All States", acct: "All Types" };
  const lbl = {
    date:   ["lbl-date",   "Date Range"],
    state:  ["lbl-region", "State"],
    acct:   ["lbl-acct",   "Account Type"]
  };
  if (key === "sev") {
    filters.sevLo = 0; filters.sevHi = 30;
    document.getElementById("sevThumbLo").style.left = "0%";
    document.getElementById("sevThumbHi").style.left = "100%";
    document.getElementById("sevFill").style.left    = "0%";
    document.getElementById("sevFill").style.width   = "100%";
    document.getElementById("sevVal").textContent    = "0 – 30";
  } else {
    filters[key] = def[key];
    if (lbl[key]) document.getElementById(lbl[key][0]).textContent = lbl[key][1];
  }
  applyFilters();
  showToast("Filter cleared");
}

/* ─── NL SEARCH ─── */
function runNLSearch() {
  const q = document.getElementById("nlSearch").value.toLowerCase().trim();
  if (!q) { applyFilters(); return; }
  let data = [...currentData];
  if (q.includes("chicago"))                          data = data.filter(r => r.region.toLowerCase().includes("chicago"));
  if (q.includes("new york"))                         data = data.filter(r => r.region.toLowerCase().includes("new york"));
  if (q.includes("critical") || q.includes("high"))  data = data.filter(r => r.score >= 15);
  if (q.includes("regional") || q.includes("territory")) data = data.filter(r => r.type === "Regional Pattern");
  if (q.includes("volume"))                           data = data.filter(r => r.type === "Volume Spike");
  if (q.includes("pricing"))                          data = data.filter(r => r.type === "Pricing Issue");
  if (q.includes("forecast"))                         data = data.filter(r => r.type === "Forecast Deviation");
  const out = data.length ? data : currentData;
  setCF(new Set(out.map(r => r.id)), "table");
  showToast(`Search: ${out.length} result${out.length !== 1 ? "s" : ""}`);
}

function clearSearch() {
  document.getElementById("nlSearch").value = "";
  clearCF();
  showToast("Search cleared");
}

/* ─── TOAST ─── */
let _tt;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_tt);
  _tt = setTimeout(() => t.classList.remove("show"), 2000);
}