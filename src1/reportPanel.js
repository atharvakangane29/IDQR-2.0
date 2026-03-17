/* ═══════════════════════════════════════════
   IDQR 2.0 — AI Report Panel
   src/reportPanel.js
═══════════════════════════════════════════ */

const ReportPanel = (() => {

  let isOpen    = false;
  let activeType = 'summary';
  let lastReport = '';

  function open() {
    document.getElementById('reportDrawer').classList.add('open');
    isOpen = true;
    updateSubtitle();
  }

  function close() {
    document.getElementById('reportDrawer').classList.remove('open');
    isOpen = false;
  }

  function setType(type) {
    activeType = type;
    document.querySelectorAll('.report-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.rtype === type);
    });
  }

  function updateSubtitle() {
    const sub = document.getElementById('reportDrawerSub');
    if (!sub) return;
    const n = (typeof currentData !== 'undefined') ? currentData.length : 0;
    sub.textContent = `${n} records in current view · Powered by Claude`;
  }

  async function generate() {
    const genEl  = document.getElementById('reportGenerating');
    const conEl  = document.getElementById('reportContent');
    const emptyEl = document.getElementById('reportEmpty');

    genEl.style.display  = 'flex';
    conEl.classList.remove('show');
    if (emptyEl) emptyEl.style.display = 'none';

    const data = (typeof currentData !== 'undefined') ? currentData : [];
    const history = SessionStore.getHistory();
    const lastLoad = SessionStore.getLastLoad();

    try {
      const prompt = buildPrompt(data, history, lastLoad, activeType);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const json = await response.json();
      const text = json.content?.map(b => b.text || '').join('') || '';
      lastReport = text;
      renderReport(text);
    } catch (err) {
      renderError(err.message);
    } finally {
      genEl.style.display = 'none';
    }
  }

  function buildPrompt(data, history, lastLoad, type) {
    const summary = {
      total:    data.length,
      avgScore: data.length ? (data.reduce((s, r) => s + r.score, 0) / data.length).toFixed(2) : 0,
      maxScore: data.length ? data.reduce((m, r) => Math.max(m, r.score), 0).toFixed(2) : 0,
      critical: data.filter(r => r.score >= 18).length,
      byType:   Object.entries(data.reduce((acc, r) => { acc[r.type] = (acc[r.type]||0)+1; return acc; }, {}))
                  .sort((a,b) => b[1]-a[1]).map(([t,c]) => `${t}: ${c}`).join(', '),
      byRegion: Object.entries(data.reduce((acc, r) => { const reg = (r.region||'').split(',').pop().trim(); acc[reg] = (acc[reg]||0)+1; return acc; }, {}))
                  .sort((a,b) => b[1]-a[1]).slice(0,5).map(([r,c]) => `${r}: ${c}`).join(', '),
      topRecords: data.sort((a,b) => b.score-a.score).slice(0,5).map(r => `${r.name} (score ${r.score.toFixed(1)}, ${r.type})`).join('; '),
    };

    const deltaContext = history.length >= 2
      ? `Previous load had ${history[1].count} records with avg score ${history[1].summary.avgScore}. Current load has ${data.length} records with avg score ${summary.avgScore}. Delta: ${data.length - history[1].count} records, ${(summary.avgScore - history[1].summary.avgScore).toFixed(2)} avg score change.`
      : 'No previous load to compare.';

    const typeInstructions = {
      summary:  'Provide a concise executive summary of the anomaly landscape. Highlight top risks, notable patterns, and a 2-sentence recommendation.',
      critical: 'Focus ONLY on critical anomalies (score ≥18). List the top findings, explain why each is concerning, and prioritize which to investigate first.',
      regional: 'Analyze the geographic distribution of anomalies. Identify which regions are most affected and whether clusters suggest systemic vs isolated issues.',
      delta:    `Compare this load to the previous session. ${deltaContext} Explain what changed, whether it is improving or worsening, and what to watch.`,
    };

    return `You are an anomaly detection analyst reviewing pharmaceutical account data. Respond in structured plain text with short labeled sections using ALL CAPS headers (like "SUMMARY:", "KEY FINDINGS:", "RECOMMENDATION:"). No markdown, no bullet asterisks — use dashes for lists.

Data snapshot:
- Total records: ${summary.total}
- Avg anomaly score: ${summary.avgScore} / 30
- Max score: ${summary.maxScore}
- Critical (≥18): ${summary.critical}
- By type: ${summary.byType}
- Top regions affected: ${summary.byRegion}
- Highest scoring records: ${summary.topRecords}

Task: ${typeInstructions[type] || typeInstructions.summary}

Keep it under 280 words. Be specific, direct, and actionable.`;
  }

  function renderReport(text) {
    const conEl = document.getElementById('reportContent');
    if (!conEl) return;

    // Parse ALL CAPS sections
    const sections = [];
    const lines = text.split('\n').filter(l => l.trim());
    let current = null;
    lines.forEach(line => {
      const headerMatch = line.match(/^([A-Z][A-Z\s\/]+):\s*(.*)/);
      if (headerMatch) {
        if (current) sections.push(current);
        current = { title: headerMatch[1].trim(), lines: headerMatch[2] ? [headerMatch[2]] : [] };
      } else if (current) {
        current.lines.push(line);
      } else {
        sections.push({ title: 'REPORT', lines: [line] });
      }
    });
    if (current) sections.push(current);

    if (!sections.length) {
      sections.push({ title: 'REPORT', lines: lines });
    }

    conEl.innerHTML = sections.map(s => `
      <div class="report-section">
        <div class="report-section-title">${s.title}</div>
        <div class="report-text">${s.lines.map(l => {
          const isDash = l.trim().startsWith('-');
          return isDash
            ? `<div class="report-finding"><span class="report-finding-dot" style="background:var(--amber)"></span><span>${l.replace(/^-\s*/,'')}</span></div>`
            : `<p>${l}</p>`;
        }).join('')}</div>
      </div>
    `).join('');

    conEl.classList.add('show');
  }

  function renderError(msg) {
    const conEl = document.getElementById('reportContent');
    if (!conEl) return;
    conEl.innerHTML = `<div class="report-section"><div class="report-section-title">ERROR</div><div class="report-text"><p style="color:#e87e62">${msg}</p><p>Make sure you are running on claude.ai or an environment with the Anthropic API proxy enabled.</p></div></div>`;
    conEl.classList.add('show');
  }

  function copy() {
    if (!lastReport) return;
    navigator.clipboard.writeText(lastReport).then(() => {
      if (typeof showToast === 'function') showToast('Report copied to clipboard');
    });
  }

  return { open, close, setType, generate, copy };
})();