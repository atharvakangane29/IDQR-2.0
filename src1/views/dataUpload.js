/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 2: Data Upload
   src/views/dataUpload.js
═══════════════════════════════════════════ */

const DataUpload = (() => {

  const EXPECTED_COLUMNS = [
    { field: 'account_id',   label: 'Account ID',   type: 'number',  example: '10567' },
    { field: 'account_name', label: 'Account Name', type: 'string',  example: 'NorthStar Pharma' },
    { field: 'region',       label: 'Region',       type: 'string',  example: 'Boston, MA' },
    { field: 'account_type', label: 'Account Type', type: 'string',  example: 'Specialty Pharmacy' },
    { field: 'week_index',   label: 'Week Index',   type: 'integer', example: '22' },
  ];

  // Simulated auto-mapping: in real backend, this parses actual CSV headers
  const MOCK_USER_COLUMNS = [
    'acct_id', 'acct_name', 'territory', 'acct_type', 'wk_idx'
  ];

  function init() {
    setupDropzone();
    // mapping table renders only after file upload or sample data selection
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

  function handleFile(file) {
    // In production: parse CSV headers and call renderMappingTable(headers)
    // For now: simulate success with mock columns
    const successEl = document.getElementById('uploadSuccess');
    const fileNameEl = document.getElementById('uploadFileName');
    const rowCountEl = document.getElementById('uploadRowCount');
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (rowCountEl) rowCountEl.textContent = '20 records detected';
    if (successEl) successEl.classList.add('show');
    // Show mapping table
    renderMappingTable(MOCK_USER_COLUMNS);
    document.getElementById('mappingSection').style.display = 'block';
    enableContinue();
  }

  function renderMappingTable(userCols) {
    const tbody = document.getElementById('mappingBody');
    if (!tbody) return;
    tbody.innerHTML = EXPECTED_COLUMNS.map((col, i) => {
      const userCol = userCols[i] || '(not found)';
      const matched = !!userCols[i];
      return `<div class="mapping-row">
        <span class="mapping-col-user">${userCol}</span>
        <span class="mapping-col-arrow">→</span>
        <span class="mapping-col-expected">${col.field}</span>
        <span class="mapping-status ${matched ? 'ok' : 'warn'}">
          <span class="status-dot"></span>
          ${matched ? 'Mapped' : 'Missing'}
        </span>
      </div>`;
    }).join('');
  }

  function enableContinue() {
    const btn = document.getElementById('uploadContinueBtn');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }

  // Use sample data — skip real upload, show mock mapping immediately
  function useSampleData() {
    const successEl = document.getElementById('uploadSuccess');
    const fileNameEl = document.getElementById('uploadFileName');
    const rowCountEl = document.getElementById('uploadRowCount');
    if (fileNameEl) fileNameEl.textContent = 'mockData.json (sample)';
    if (rowCountEl) rowCountEl.textContent = '20 records loaded';
    if (successEl) successEl.classList.add('show');
    const mappingSection = document.getElementById('mappingSection');
    if (mappingSection) mappingSection.style.display = 'block';
    renderMappingTable(MOCK_USER_COLUMNS);
    enableContinue();
  }

  return { init, useSampleData };
})();

document.addEventListener('DOMContentLoaded', () => DataUpload.init());