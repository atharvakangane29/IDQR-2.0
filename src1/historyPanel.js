/* ═══════════════════════════════════════════
   IDQR 2.0 — History Panel
   src/historyPanel.js
═══════════════════════════════════════════ */

const HistoryPanel = (() => {

  let isOpen = false;

  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    refresh();
    document.getElementById('historyPanel').classList.add('open');
    isOpen = true;
  }

  function close() {
    document.getElementById('historyPanel').classList.remove('open');
    isOpen = false;
  }

  function refresh() {
    const body    = document.getElementById('historyPanelBody');
    const history = SessionStore.getHistory();
    if (!body) return;
    if (!history.length) {
      body.innerHTML = '<div class="history-empty">No loads recorded yet.</div>';
      return;
    }
    body.innerHTML = history.map((snap, i) => {
      const ts  = new Date(snap.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const badgeCls = snap.type === 'full' ? 'history-badge-full' : 'history-badge-incr';
      const badgeTxt = snap.type === 'full' ? 'FULL' : 'INCREMENTAL';
      const extraStat = snap.type === 'incremental'
        ? `<div class="history-stat">New <span>${snap.addedCount || '—'}</span></div><div class="history-stat">Total <span>${snap.totalCount || '—'}</span></div>`
        : '';
      return `<div class="history-item">
        <div class="history-item-top">
          <span class="history-item-label">${snap.label || snap.type}</span>
          <span class="history-item-ts">${i === 0 ? 'Latest · ' : ''}${ts}</span>
        </div>
        <div><span class="${badgeCls}">${badgeTxt}</span></div>
        <div class="history-item-stats">
          <div class="history-stat">Records <span>${snap.count}</span></div>
          <div class="history-stat">Avg Score <span>${snap.summary.avgScore}</span></div>
          <div class="history-stat">Critical <span>${snap.summary.critical}</span></div>
          ${extraStat}
        </div>
      </div>`;
    }).join('');
  }

  function clearAll() {
    SessionStore.clearAll();
    refresh();
    if (typeof showToast === 'function') showToast('History cleared');
  }

  return { toggle, open, close, refresh, clearAll };
})();