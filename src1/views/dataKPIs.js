/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 3: Data KPIs
   src/views/dataKPIs.js

   Shows ONLY what exists in the raw uploaded
   data — before the ML model runs.
   No score, anomaly type, or reason columns.
═══════════════════════════════════════════ */

const DataKPIs = (() => {

  let rendered = false;

  async function init() {
    if (rendered) return;
    rendered = true;

    const res  = await fetch('data1/mockData.json');
    const json = await res.json();
    const data = json.records;

    renderKPICards(data);
    renderAccountTypeBar(data);
    renderWeeklySpread(data);
  }

  function renderKPICards(data) {
    // Total Accounts
    set('kpiTotalAccounts',    data.length);
    set('kpiTotalAccountsSub', 'Unique account IDs in dataset');

    // Total Net Sales Units (derived from account ID — no score involved)
    const totalVol = data.reduce((s, r) => s + ((r.id * 17 + 200) % 900) + 300, 0);
    set('kpiTotalVol',    totalVol.toLocaleString());
    set('kpiTotalVolSub', '~$' + (totalVol * 0.096).toFixed(0) + 'K estimated exposure');

    // Unique Regions
    const regions = new Set(data.map(r => r.region)).size;
    set('kpiRegions',    regions);
    set('kpiRegionsSub', 'Unique cities / territories');

    // Unique Account Types
    const types = new Set(data.map(r => r.type)).size;
    set('kpiAcctTypes',    types);
    set('kpiAcctTypesSub', 'Distinct account categories');

    // Date Range — derived from week_index
    const minWk = Math.min(...data.map(r => r.weekIdx));
    const maxWk = Math.max(...data.map(r => r.weekIdx));
    const start = new Date('2024-07-07');
    const toDate = function(wk) {
      const d = new Date(start);
      d.setDate(d.getDate() + wk * 7);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };
    set('kpiDateRange',    (maxWk - minWk) + ' wks');
    set('kpiDateRangeSub', toDate(minWk) + ' to ' + toDate(maxWk));

    // Records per week avg
    const avgPerWk = (data.length / (maxWk - minWk || 1)).toFixed(1);
    set('kpiWeeklyAvg',    avgPerWk);
    set('kpiWeeklyAvgSub', 'Avg records per week');
  }

  function renderAccountTypeBar(data) {
    const counts = {};
    data.forEach(function(r) { counts[r.type] = (counts[r.type] || 0) + 1; });
    const sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
    const max = sorted[0][1];

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
    container.innerHTML = sorted.map(function(entry) {
      const type = entry[0], count = entry[1];
      return '<div class="acct-bar-row">' +
        '<span class="acct-bar-label" title="' + type + '">' + type + '</span>' +
        '<div class="acct-bar-track"><div class="acct-bar-fill" style="width:' +
        (count / max * 100).toFixed(1) + '%;background:' + (COLORS[type] || '#7FA3C0') + '"></div></div>' +
        '<span class="acct-bar-count">' + count + '</span>' +
        '</div>';
    }).join('');
  }

  function renderWeeklySpread(data) {
    const weeks  = data.map(function(r) { return r.weekIdx; });
    const minWk  = Math.min.apply(null, weeks);
    const maxWk  = Math.max.apply(null, weeks);
    const third  = (maxWk - minWk) / 3;
    const early  = data.filter(function(r) { return r.weekIdx <= minWk + third; }).length;
    const mid    = data.filter(function(r) { return r.weekIdx > minWk + third && r.weekIdx <= minWk + 2 * third; }).length;
    const recent = data.filter(function(r) { return r.weekIdx > minWk + 2 * third; }).length;
    const n      = data.length;

    const container = document.getElementById('weeklySpreadZones');
    if (!container) return;

    const start = new Date('2024-07-07');
    const toDate = function(wk) {
      const d = new Date(start);
      d.setDate(d.getDate() + wk * 7);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const zones = [
      { label: 'Early period',  count: early,  color: '#7FA3C0', range: toDate(minWk) + ' - ' + toDate(Math.floor(minWk + third)) },
      { label: 'Mid period',    count: mid,    color: '#FFB162', range: toDate(Math.floor(minWk + third)) + ' - ' + toDate(Math.floor(minWk + 2 * third)) },
      { label: 'Recent period', count: recent, color: '#A35139', range: toDate(Math.floor(minWk + 2 * third)) + ' - ' + toDate(maxWk) },
    ];
    container.innerHTML = zones.map(function(z) {
      return '<div class="score-zone-row">' +
        '<span class="score-zone-dot" style="background:' + z.color + '"></span>' +
        '<div class="score-zone-label" style="display:flex; flex-direction:column; line-height:1.2;">' + z.label + '<span style="font-size: 10px; color: #aaa; margin-top: 2px;">' + z.range + '</span></div>' +
        '<span class="score-zone-count">' + z.count + '</span>' +
        '<span class="score-zone-pct">' + ((z.count / n) * 100).toFixed(0) + '%</span>' +
        '</div>';
    }).join('');
  }

  function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init: init };
})();