/* ═══════════════════════════════════════════
   IDQR 2.0 — Session Store
   Persists load history in localStorage.
═══════════════════════════════════════════ */

const SessionStore = (() => {

  const KEY_HISTORY  = 'idqr_load_history';   // array of load snapshots
  const KEY_INCREMENTAL = 'idqr_incremental'; // accumulated incremental records

  /* ── Save a new full-load snapshot ── */
  function saveFullLoad(records, label) {
    const snapshot = {
      id:        Date.now(),
      type:      'full',
      label:     label || 'Full Load',
      timestamp: new Date().toISOString(),
      count:     records.length,
      recordIds: records.map(r => r.id),
      summary: {
        avgScore: +(records.reduce((s, r) => s + r.score, 0) / (records.length || 1)).toFixed(2),
        maxScore: records.reduce((m, r) => Math.max(m, r.score), 0),
        critical: records.filter(r => r.score >= 18).length,
        regions:  [...new Set(records.map(r => r.region))].length,
      }
    };
    const history = getHistory();
    history.unshift(snapshot);
    if (history.length > 10) history.length = 10; // keep last 10 loads
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    return snapshot;
  }

  /* ── Save incremental records (merged, deduped by id) ── */
  function saveIncremental(newRecords, label) {
    const existing = getIncrementalRecords();
    const existingIds = new Set(existing.map(r => r.id));
    const added = newRecords.filter(r => !existingIds.has(r.id));
    const merged = [...existing, ...added];
    localStorage.setItem(KEY_INCREMENTAL, JSON.stringify(merged));

    const history = getHistory();
    const snapshot = {
      id:        Date.now(),
      type:      'incremental',
      label:     label || 'Incremental Load',
      timestamp: new Date().toISOString(),
      count:     newRecords.length,
      addedCount: added.length,
      totalCount: merged.length,
      recordIds: newRecords.map(r => r.id),
      summary: {
        avgScore: +(newRecords.reduce((s, r) => s + r.score, 0) / (newRecords.length || 1)).toFixed(2),
        maxScore: newRecords.reduce((m, r) => Math.max(m, r.score), 0),
        critical: newRecords.filter(r => r.score >= 18).length,
        newRecords: added.length,
        duplicates: newRecords.length - added.length,
      }
    };
    history.unshift(snapshot);
    if (history.length > 10) history.length = 10;
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    return snapshot;
  }

  function getHistory()             { try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); } catch { return []; } }
  function getIncrementalRecords()  { try { return JSON.parse(localStorage.getItem(KEY_INCREMENTAL) || '[]'); } catch { return []; } }
  function clearIncremental()       { localStorage.removeItem(KEY_INCREMENTAL); }
  function clearAll()               { localStorage.removeItem(KEY_HISTORY); localStorage.removeItem(KEY_INCREMENTAL); }
  function getLastLoad()            { const h = getHistory(); return h[0] || null; }
  function hasIncrementalData()     { return getIncrementalRecords().length > 0; }

  return { saveFullLoad, saveIncremental, getHistory, getIncrementalRecords, clearIncremental, clearAll, getLastLoad, hasIncrementalData };
})();