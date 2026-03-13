/* ═══════════════════════════════════════════
   IDQR 2.0 — Screen 4: Hyperparameter Config
   src/views/hyperparams.js
═══════════════════════════════════════════ */

const Hyperparams = (() => {

  // Default config — used by training screen for display
  const config = {
    sensitivity:  'Medium',
    lookback:     '26 Weeks',
    accountTypes: [], // empty = all
    weightByVol:  true,
  };

  const ACCOUNT_TYPES = [
    'Long Term Care Pharmacy', 'Long Term Care', 'Specialty Pharmacy',
    'Pharmacy', 'Community Practice', 'Community Hospital',
    'Academic NCI/NCCN', 'Academic', 'Childrens Hospital', 'VA', 'Other'
  ];

  function init() {
    renderAccountTypeGrid();
    bindPillToggles();
    bindYNToggles();
  }

  function renderAccountTypeGrid() {
    const grid = document.getElementById('acctTypeGrid');
    if (!grid) return;
    grid.innerHTML = ACCOUNT_TYPES.map(t => `
      <button class="acct-tag" onclick="Hyperparams.toggleAcctType(this, '${t}')">${t}</button>
    `).join('');
  }

  function bindPillToggles() {
    document.querySelectorAll('.pill-toggle').forEach(group => {
      group.querySelectorAll('.pill-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.pill-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          config.sensitivity = btn.dataset.value || btn.textContent.trim();
        });
      });
    });
  }

  function bindYNToggles() {
    document.querySelectorAll('.yn-toggle').forEach(group => {
      group.querySelectorAll('.yn-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.yn-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const key = group.dataset.key;
          if (key) config[key] = btn.dataset.value === 'true';
        });
      });
    });
  }

  function toggleAcctType(btn, type) {
    btn.classList.toggle('selected');
    if (btn.classList.contains('selected')) {
      config.accountTypes.push(type);
    } else {
      config.accountTypes = config.accountTypes.filter(t => t !== type);
    }
  }

  function getConfig() { return { ...config }; }

  return { init, toggleAcctType, getConfig };
})();

document.addEventListener('DOMContentLoaded', () => Hyperparams.init());
