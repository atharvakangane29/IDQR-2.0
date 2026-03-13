/* ═══════════════════════════════════════════
   IDQR 2.0 — Data Loader
   src/dataLoader.js

   Fetches mockData.json, then hands data to
   app.js via initWithData(json).

   When you add a real backend, replace the
   fetch path with your API endpoint and
   adapt the response shape to match the
   same keys (records, regionCities, etc.)
═══════════════════════════════════════════ */

(async function loadData() {
  try {
    // Always fetch mock for schema (typeBadgeMap, regionCities, accountTypeIds)
    const response = await fetch("data1/mockData.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const json = await response.json();

    // Check sessionStorage for uploaded CSV records
    const stored = sessionStorage.getItem('idqr_records');
    if (stored) {
      try {
        const uploadedRecords = JSON.parse(stored);

        // Restore invoiceDate from string back to Date object
        uploadedRecords.forEach(function(r) {
          if (r.invoiceDate) r.invoiceDate = new Date(r.invoiceDate);
        });

        // Restore epoch
        const epochStr = sessionStorage.getItem('idqr_epoch');
        if (epochStr) window._dataEpoch = new Date(epochStr);

        // Build typeBadgeMap from actual anomaly types in uploaded data
        const badgeMap = {};
        uploadedRecords.forEach(function(r) {
          if (r.type && !badgeMap[r.type]) {
            const t = r.type.toLowerCase();
            if      (t.includes('region') || t.includes('territory')) badgeMap[r.type] = 'badge-reg';
            else if (t.includes('date'))                               badgeMap[r.type] = 'badge-disc';
            else if (t.includes('attribute'))                          badgeMap[r.type] = 'badge-attr';
            else if (t.includes('account'))                            badgeMap[r.type] = 'badge-vol';
            else                                                       badgeMap[r.type] = 'badge-fore';
          }
        });

        // Build accountTypeIds from uploaded data
        const acctIds = {};
        uploadedRecords.forEach(function(r) {
          if (r.accounttype) {
            if (!acctIds[r.accounttype]) acctIds[r.accounttype] = [];
            acctIds[r.accounttype].push(r.id);
          }
        });

        json.records        = uploadedRecords;
        json.typeBadgeMap   = badgeMap;
        json.accountTypeIds = acctIds;

        console.log('[IDQR] Loaded', uploadedRecords.length, 'records from sessionStorage');
      } catch(parseErr) {
        console.warn('[IDQR] Failed to parse sessionStorage records, using mock:', parseErr);
      }
    } else {
      console.log('[IDQR] No uploaded data found, using mockData.json');
    }

    initWithData(json);

  } catch (err) {
    console.error("[IDQR] Failed to load data:", err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                  font-family:sans-serif;color:#A35139;flex-direction:column;gap:12px">
        <strong style="font-size:1.2rem">Failed to load dashboard data</strong>
        <code style="font-size:.85rem;color:#666">${err.message}</code>
        <p style="font-size:.8rem;color:#999">
          Make sure the app is served over HTTP (not file://) and
          <code>data1/mockData.json</code> exists.
        </p>
      </div>`;
  }
})();