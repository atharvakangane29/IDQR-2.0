/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 1.5: Load Type Selection
   src/views/loadType.js
═══════════════════════════════════════════ */

const LoadType = (() => {

  let selectedType = 'full';

  function init() {
    selectedType = 'full';
    document.getElementById('card-full').classList.add('selected');
    document.getElementById('card-incr').classList.remove('selected');
    document.getElementById('sessionDiffBanner').classList.remove('show');

    const last = SessionStore.getLastLoad();
    const subEl = document.getElementById('loadTypeSub');
    if (last) {
      const ts = new Date(last.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      if (subEl) subEl.textContent = `Last load: ${ts} · ${last.count} records`;
    } else {
      if (subEl) subEl.textContent = 'No previous session found. Full load recommended.';
    }
  }

  function select(type) {
    selectedType = type;
    document.getElementById('card-full').classList.toggle('selected', type === 'full');
    document.getElementById('card-incr').classList.toggle('selected', type === 'incremental');

    const banner = document.getElementById('sessionDiffBanner');
    const last   = SessionStore.getLastLoad();

    if (type === 'incremental' && last) {
      banner.classList.add('show');
      document.getElementById('sdbCount').textContent = last.count;
      document.getElementById('sdbAvg').textContent   = last.summary.avgScore;
      document.getElementById('sdbMax').textContent   = last.summary.maxScore;
      document.getElementById('sdbCrit').textContent  = last.summary.critical;
      const ts = new Date(last.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      document.getElementById('sdbTs').textContent = 'Snapshot from ' + ts;

      // Show deltas if there are 2+ loads
      const history = SessionStore.getHistory();
      const deltasEl = document.getElementById('sdbDeltas');
      if (history.length >= 2 && deltasEl) {
        const prev = history[1];
        const deltaCount = last.count - prev.count;
        const deltaScore = (last.summary.avgScore - prev.summary.avgScore).toFixed(2);
        deltasEl.innerHTML = makeDelta(deltaCount, 'records', true) + makeDelta(deltaScore, 'avg score', false);
      }
    } else if (type === 'incremental' && !last) {
      banner.classList.add('show');
      document.getElementById('sdbCount').textContent = '—';
      document.getElementById('sdbAvg').textContent   = '—';
      document.getElementById('sdbMax').textContent   = '—';
      document.getElementById('sdbCrit').textContent  = '—';
      document.getElementById('sdbTs').textContent    = 'No previous session — will start fresh';
      const deltasEl = document.getElementById('sdbDeltas');
      if (deltasEl) deltasEl.innerHTML = '';
    } else {
      banner.classList.remove('show');
    }
  }

  function makeDelta(val, label, moreIsGood) {
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return `<span class="sdb-delta same">= ${label}</span>`;
    const positive = n > 0;
    const good = moreIsGood ? positive : !positive;
    const cls  = good ? 'up' : 'down';
    const sign = positive ? '+' : '';
    return `<span class="sdb-delta ${cls}">${sign}${val} ${label}</span>`;
  }

  function confirm() {
    Pipeline.advanceTo(2);
  }

  function getType() { return selectedType; }

  return { init, select, confirm, getType };
})();