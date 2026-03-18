/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 2: Data Upload
   src/views/dataUpload.js
═══════════════════════════════════════════ */

const DataUpload = (() => {

  // What to show in the mapping table UI
  const DISPLAY_MAPPINGS = [
    { csvCol: 'clientid',    internalField: 'account_id',   label: 'Account ID'   },
    { csvCol: 'accountname', internalField: 'account_name', label: 'Account Name' },
    { csvCol: 'state',       internalField: 'region',       label: 'Region/State' },
    { csvCol: 'accounttype', internalField: 'account_type', label: 'Account Type' },
    { csvCol: 'rowid',       internalField: 'rowid',        label: 'Row ID'       },
  ];

  const MOCK_USER_COLUMNS = ['clientid','accountname','state','accounttype','rowid'];

  function init() {
    setupDropzone();
  }

  function setupDropzone() {
    const zone = document.getElementById('dropzone');
    if (!zone) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
      });
    }
  }

  // Parse m/dd/yyyy or mm/dd/yyyy → JS Date
  function parseInvoiceDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    const parts = s.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day   = parseInt(parts[1], 10);
      const year  = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function buildRecords(rows) {
    // Only keep rows where score > 9.5
    const anomalyRows = rows.filter(function(row) {
      return parseFloat(row['score']) > 9.5;
    });

    // Find earliest invoice_date to use as epoch for weekIdx calculation
    const allDates = anomalyRows
      .map(r => parseInvoiceDate(r['invoice_date']))
      .filter(Boolean);

    const epochDate = allDates.length > 0
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : new Date('2024-07-07');

    window._dataEpoch = epochDate;

    const msPerWk = 7 * 24 * 60 * 60 * 1000;

    return anomalyRows.map(function(row, i) {
      const d       = parseInvoiceDate(row['invoice_date']);
      const weekIdx = d
        ? Math.round((d.getTime() - epochDate.getTime()) / msPerWk)
        : (i % 78);

      return {
        id:          parseInt(row['clientid'])              || parseInt(row['rowid']) || i,
        name:        row['accountname']                     || 'Unknown',
        region:      (row['city'] || '') + (row['state'] ? ', ' + row['state'] : ''),
        state:       row['state']                           || '',
        type:        row['anomaly_type']                    || '',
        score:       parseFloat(row['score'])               || 0,
        reason:      row['reason']                          || '',
        accounttype: row['accounttype']                     || '',
        weekIdx:     weekIdx,
        vol:         parseFloat(row['sum_net_sales_units']) || 0,
        invoiceDate: d,
        rowid:       parseInt(row['rowid'])                 || i,
      };
    });
  }

  function handleFile(file) {
    const successEl  = document.getElementById('uploadSuccess');
    const fileNameEl = document.getElementById('uploadFileName');
    const rowCountEl = document.getElementById('uploadRowCount');
    if (fileNameEl) fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
      const text   = e.target.result;
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows   = parsed.data;

      // Build records — only score > 9.5 rows
      window._uploadedRecords = buildRecords(rows);
      window._uploadedMeta    = { totalRows: rows.length, fields: parsed.meta.fields || [] };

      // Persist to sessionStorage so idqr2.html can read after navigation
      try {
        sessionStorage.setItem('idqr_records', JSON.stringify(window._uploadedRecords));
        sessionStorage.setItem('idqr_epoch',   window._dataEpoch ? window._dataEpoch.toISOString() : '');
        console.log('[IDQR] Saved', window._uploadedRecords.length, 'anomaly records (score > 9.5) to sessionStorage');
      } catch(err) {
        console.warn('[IDQR] sessionStorage save failed (data too large?):', err);
      }

      // if (rowCountEl) rowCountEl.textContent = window._uploadedRecords.length + ' anomaly records detected';
      if (successEl)  successEl.classList.add('show');

      renderMappingTable(parsed.meta.fields || []);
      document.getElementById('mappingSection').style.display = 'block';
      enableContinue();
    };
    reader.readAsText(file);
  }

  function renderMappingTable(availableCols) {
    const tbody  = document.getElementById('mappingBody');
    if (!tbody) return;
    const colSet = new Set((availableCols || []).map(c => c.toLowerCase().trim()));
    
    let allMapped = true;
    
    let html = DISPLAY_MAPPINGS.map(function(m) {
      const found = colSet.has(m.csvCol.toLowerCase());
      if (!found) allMapped = false; // Check if any mapping is missing
      
      return '<div class="mapping-row">' +
        '<span class="mapping-col-user">'     + m.csvCol        + '</span>' +
        '<span class="mapping-col-arrow">→</span>' +
        '<span class="mapping-col-expected">' + m.internalField + '</span>' +
        '<span class="mapping-status '        + (found ? 'ok' : 'warn') + '">' +
          '<span class="status-dot"></span>'  +
          (found ? 'Mapped' : 'Missing')      +
        '</span>' +
        '</div>';
    }).join('');

    // If everything mapped successfully, append the message as an additional row
    if (allMapped) {
      html += '<div class="mapping-row">' +
        '<span class="mapping-col-user" style="grid-column: span 3; color: #888; font-style: italic; font-weight: normal;">... all the other data is mapped as well ...</span>' +
        '<span class="mapping-status ok"><span class="status-dot"></span>Mapped</span>' +
        '</div>';
    }

    tbody.innerHTML = html;
  }

  function enableContinue() {
    const btn = document.getElementById('uploadContinueBtn');
    if (btn) {
      btn.disabled      = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
    }
  }

  function useSampleData() {
    const successEl  = document.getElementById('uploadSuccess');
    const fileNameEl = document.getElementById('uploadFileName');
    const rowCountEl = document.getElementById('uploadRowCount');
    if (fileNameEl) fileNameEl.textContent = 'mockData.json (sample)';
    if (rowCountEl) rowCountEl.textContent = '20 records loaded';
    if (successEl)  successEl.classList.add('show');

    // Clear uploaded data so mock is used
    window._uploadedRecords = null;
    window._dataEpoch       = null;
    sessionStorage.removeItem('idqr_records');
    sessionStorage.removeItem('idqr_epoch');

    const mappingSection = document.getElementById('mappingSection');
    if (mappingSection) mappingSection.style.display = 'block';
    renderMappingTable(MOCK_USER_COLUMNS);
    enableContinue();
  }

  return { init, useSampleData };
})();

document.addEventListener('DOMContentLoaded', () => DataUpload.init());