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
    const response = await fetch("data/mockData.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const json = await response.json();
    initWithData(json);          // defined in app.js
  } catch (err) {
    console.error("[IDQR] Failed to load data:", err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                  font-family:sans-serif;color:#A35139;flex-direction:column;gap:12px">
        <strong style="font-size:1.2rem">Failed to load dashboard data</strong>
        <code style="font-size:.85rem;color:#666">${err.message}</code>
        <p style="font-size:.8rem;color:#999">
          Make sure the app is served over HTTP (not file://) and
          <code>data/mockData.json</code> exists.
        </p>
      </div>`;
  }
})();