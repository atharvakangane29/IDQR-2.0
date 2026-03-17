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

    let data;
    if (window._uploadedRecords && window._uploadedRecords.length > 0) {
      data = window._uploadedRecords;
    } else {
      const res  = await fetch('data1/mockData.json');
      const json = await res.json();
      data = json.records;
    }

    renderKPICards(data);
    renderAccountTypeBar(data);
    renderWeeklySpread(data);
  }

  function renderKPICards(data) {
    // Total Accounts
    const uniqueAccounts = new Set(data.map(r => r.id)).size;
    set('kpiTotalAccounts',    uniqueAccounts);
    set('kpiTotalAccountsSub', 'Unique account IDs in dataset');

    // Total Net Sales Units — use real vol field
    const totalVol = data.reduce(function(s, r) {
      return s + (r.vol || 0);
    }, 0);
    set('kpiTotalVol',    totalVol.toLocaleString());
    set('kpiTotalVolSub', 'Sum of net sales units');

    // Unique States (more meaningful than full region string)
    const regions = new Set(data.map(r => r.state).filter(Boolean)).size;
    set('kpiRegions',    regions);
    set('kpiRegionsSub', 'Unique states covered');

    // Unique Account Types
    const types = new Set(data.map(r => r.accounttype).filter(Boolean)).size;
    set('kpiAcctTypes',    types);
    set('kpiAcctTypesSub', 'Distinct account categories');

    // Date Range — use real invoiceDate if available, else fall back to weekIdx
    const realDates = data.map(r => r.invoiceDate).filter(Boolean);
    let dateRangeStr, dateSubStr, avgPerWk, avgSubStr;

    if (realDates.length > 0) {
      const minDate = new Date(Math.min(...realDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...realDates.map(d => d.getTime())));
      const fmt = function(d) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      const spanDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));
      const spanWks  = Math.round(spanDays / 7);
      dateRangeStr = spanWks + ' wks';
      dateSubStr   = fmt(minDate) + ' – ' + fmt(maxDate);

      // Avg per week using real span
      avgPerWk = (data.length / (spanWks || 1)).toFixed(1);
      avgSubStr = 'Avg records per week';
    } else {
      const weekIdxs = data.map(r => r.weekIdx).filter(n => !isNaN(n));
      const minWk    = Math.min(...weekIdxs);
      const maxWk    = Math.max(...weekIdxs);
      const start    = window._dataEpoch || new Date('2024-07-07');
      const toDate   = function(wk) {
        const d = new Date(start);
        d.setDate(d.getDate() + wk * 7);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
      dateRangeStr = (maxWk - minWk) + ' periods';
      dateSubStr   = toDate(minWk) + ' – ' + toDate(maxWk);
      const buckets = new Set(data.map(r => r.weekIdx)).size;
      avgPerWk  = (data.length / (buckets || 1)).toFixed(1);
      avgSubStr = 'Avg records per time period';
    }

    set('kpiDateRange',    dateRangeStr);
    set('kpiDateRangeSub', dateSubStr);
    set('kpiWeeklyAvg',    avgPerWk);
    set('kpiWeeklyAvgSub', avgSubStr);
  }

  function renderAccountTypeBar(data) {
    const FIXED_TYPES = [
      'Long Term Care Pharmacy',
      'Specialty Pharmacy',
      'Pharmacy',
      'Community Practice',
      'Childrens Hospital',
    ];
    const counts = {};
    data.forEach(function(r) { if (r.accounttype) counts[r.accounttype] = (counts[r.accounttype] || 0) + 1; });
    const sorted = FIXED_TYPES.map(t => [t, counts[t] || 0]);
    const max = Math.max(...sorted.map(e => e[1]), 1);

    const COLORS = {
      'Long Term Care Pharmacy': '#2C3B4D',
      'Specialty Pharmacy':      '#FFB162',
      'Pharmacy':                '#4A6B8A',
      'Community Practice':      '#7FA3C0',
      'Childrens Hospital':      '#A35139',
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