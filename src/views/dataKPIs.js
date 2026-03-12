/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 3: Data KPIs
   src/views/dataKPIs.js

   Pulls stats directly from mockData.json.
   No ML yet — pure descriptive analytics.
═══════════════════════════════════════════ */

const DataKPIs = (() => {

  let rendered = false;

  async function init() {
    if (rendered) return;
    rendered = true;

    const res  = await fetch('data/mockData.json');
    const json = await res.json();
    const data = json.records;

    renderKPICards(data, json);
    renderAccountTypeBar(data);
    renderScoreDistribution(data);
  }

  function renderKPICards(data, json) {
    // ─ Total Accounts
    const totalAccounts = data.length;
    set('kpiTotalAccounts', totalAccounts);
    set('kpiTotalAccountsSub', `Unique account IDs in dataset`);

    // ─ Total Net Sales Units (same formula as dashboard)
    const totalVol = data.reduce((s, r) => s + ((r.id * 17 + 200) % 900) + 300, 0);
    set('kpiTotalVol', totalVol.toLocaleString());
    set('kpiTotalVolSub', `~$${(totalVol * 0.096).toFixed(0)}K estimated exposure`);

    // ─ Avg Anomaly Score
    const avg = data.reduce((s, r) => s + r.score, 0) / data.length;
    set('kpiAvgScore', avg.toFixed(2));
    set('kpiAvgScoreSub', `Across all ${data.length} records`);

    // ─ Records Above Threshold (score >= 15)
    const aboveThresh = data.filter(r => r.score >= 15).length;
    set('kpiAboveThresh', aboveThresh);
    set('kpiAboveThreshSub', `Score ≥ 15  (${((aboveThresh / data.length) * 100).toFixed(0)}% of records)`);

    // ─ Regions Covered
    const regions = new Set(data.map(r => r.region)).size;
    set('kpiRegions', regions);
    set('kpiRegionsSub', `Unique cities / territories`);

    // ─ Date Range
    const start = 'Jul 2024';
    const end   = 'Feb 2026';
    set('kpiDateRange', '78 wks');
    set('kpiDateRangeSub', `${start} → ${end}`);
  }

  function renderAccountTypeBar(data) {
    // Count records per type
    const typeCounts = {};
    data.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const max    = sorted[0][1];

    const COLORS = {
      'Attribute Error':    '#A35139',
      'Regional Pattern':   '#FFB162',
      'Volume Spike':       '#4A6B8A',
      'Forecast Deviation': '#7FA3C0',
      'Data Discrepancy':   '#C9C1B1',
      'Pricing Issue':      '#2C3B4D',
    };

    const container = document.getElementById('acctTypeBars');
    if (!container) return;
    container.innerHTML = sorted.map(([type, count]) => `
      <div class="acct-bar-row">
        <span class="acct-bar-label" title="${type}">${type}</span>
        <div class="acct-bar-track">
          <div class="acct-bar-fill" style="width:${(count / max * 100).toFixed(1)}%;background:${COLORS[type] || '#7FA3C0'}"></div>
        </div>
        <span class="acct-bar-count">${count}</span>
      </div>`).join('');
  }

  function renderScoreDistribution(data) {
    const low  = data.filter(r => r.score < 12).length;
    const med  = data.filter(r => r.score >= 12 && r.score < 20).length;
    const high = data.filter(r => r.score >= 20).length;
    const n    = data.length;

    const container = document.getElementById('scoreDistZones');
    if (!container) return;
    container.innerHTML = [
      { label: 'Low  (0 – 11)',    count: low,  color: '#7FA3C0' },
      { label: 'Medium  (12 – 19)',count: med,  color: '#FFB162' },
      { label: 'Critical  (20+)',  count: high, color: '#A35139' },
    ].map(z => `
      <div class="score-zone-row">
        <span class="score-zone-dot" style="background:${z.color}"></span>
        <span class="score-zone-label">${z.label}</span>
        <span class="score-zone-count">${z.count}</span>
        <span class="score-zone-pct">${((z.count / n) * 100).toFixed(0)}%</span>
      </div>`).join('');
  }

  function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init };
})();
