export function renderDashboardHtml({
  title = "Snippen Fake SMS Provider",
} = {}) {
  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0e17;
      --bg-surface: #121826;
      --bg-surface-elevated: #1a2337;
      --border-subtle: #232f48;
      --border-focus: #3b82f6;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-blue: #3b82f6;
      --accent-blue-hover: #2563eb;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --accent-purple: #8b5cf6;
      --accent-rose: #f43f5e;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .logo-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-icon {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.4);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
      animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Controls & Buttons */
    button, .btn {
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease-in-out;
    }

    .btn-primary {
      background: var(--accent-blue);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--accent-blue-hover);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.35);
    }

    .btn-secondary {
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      border-color: var(--border-subtle);
    }
    .btn-secondary:hover {
      background: var(--border-subtle);
      border-color: #3b4d6d;
    }

    .btn-danger {
      background: rgba(244, 63, 94, 0.12);
      color: var(--accent-rose);
      border-color: rgba(244, 63, 94, 0.3);
    }
    .btn-danger:hover {
      background: rgba(244, 63, 94, 0.2);
    }

    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
    }

    .toggle-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stat-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: var(--font-mono);
      letter-spacing: -0.03em;
    }

    /* Main Content Layout */
    .main-grid {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Simulator Form */
    .form-group {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .form-input, .form-textarea {
      width: 100%;
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.875rem;
      transition: border-color 0.15s ease;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .form-textarea {
      resize: vertical;
      min-height: 90px;
    }

    .quick-templates {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .template-chip {
      background: var(--bg-surface-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 3px 10px;
      font-size: 0.725rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .template-chip:hover {
      color: var(--text-primary);
      border-color: var(--accent-blue);
      background: rgba(59, 130, 246, 0.1);
    }

    .alert {
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      margin-bottom: 16px;
      display: none;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .alert-error {
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fb7185;
    }

    /* Messages & Logs Panels */
    .panel-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 8px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-weight: 500;
      cursor: pointer;
    }

    .tab-btn.active {
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
    }

    /* Message items */
    .message-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message-item {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s;
    }

    .message-item:hover {
      border-color: #3b4d6d;
    }

    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .direction-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .badge-inbound {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-outbound {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .msg-meta {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .msg-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .msg-body {
      font-size: 0.9375rem;
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--accent-blue);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .msg-body.inbound-border {
      border-left-color: var(--accent-green);
    }

    .msg-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* Logs Table / List */
    .log-stream {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }

    .log-entry {
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .log-time {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .log-tag {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      font-weight: 600;
      flex-shrink: 0;
    }

    .tag-outbound { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .tag-inbound { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
    .tag-webhook { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
    .tag-reset { background: rgba(244, 63, 94, 0.2); color: #fda4af; }
    .tag-info { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }

    .log-msg {
      color: var(--text-primary);
      word-break: break-all;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="logo-group">
        <div class="logo-icon">📱</div>
        <div>
          <div class="brand-title">${title}</div>
          <div class="brand-subtitle">Snippen Integration & E2E Test Harness</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="status-badge">
          <span class="status-dot"></span>
          <span id="health-status">OPERATIONAL</span>
        </div>
        <button id="btn-refresh" class="btn btn-secondary btn-sm" title="Oppdater visning">
          🔄 Oppdater
        </button>
        <button id="btn-clear" class="btn btn-danger btn-sm" title="Slett alle meldinger">
          🗑️ Nullstill
        </button>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Totalt meldinger</div>
        <div id="stat-total" class="stat-value">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Innkommende (Inbound)</div>
        <div id="stat-inbound" class="stat-value" style="color: var(--accent-green);">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Utgående (Outbound)</div>
        <div id="stat-outbound" class="stat-value" style="color: var(--accent-blue);">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Oppetid (Uptime)</div>
        <div id="stat-uptime" class="stat-value">0s</div>
      </div>
    </div>

    <!-- Main Section -->
    <div class="main-grid">
      <!-- Left: Simulator Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">💬 SMS-simulator</h2>
        </div>
        <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 16px;">
          Simuler innkommende SMS fra en leietaker. Meldingen lagres og sendes via webhook til <code>snippen-sms-service</code>.
        </p>

        <div id="form-alert" class="alert"></div>

        <form id="simulator-form">
          <div class="form-group">
            <label class="form-label" for="sim-from">Avsender (Telefonnr)</label>
            <input type="text" id="sim-from" class="form-input" value="+4799887766" placeholder="+47xxxxxxxx" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="sim-text">Meldingstekst</label>
            <textarea id="sim-text" class="form-textarea" placeholder="Skriv melding her..." required>Takk for adgangskoden!</textarea>
            <div class="quick-templates">
              <span class="template-chip" data-text="Takk for koden!">Takk for koden</span>
              <span class="template-chip" data-text="Kan vi få to ekstra bord?">Ekstra bord</span>
              <span class="template-chip" data-text="Hvor finner vi nøkkelen?">Nøkkel-spørsmål</span>
              <span class="template-chip" data-text="JA">Bekreftelse</span>
            </div>
          </div>

          <button type="submit" id="btn-submit-sim" class="btn btn-primary" style="width: 100%;">
            📤 Send innkommende SMS
          </button>
        </form>
      </div>

      <!-- Right: Messages & Activity Logs Tabs -->
      <div class="panel-container">
        <div class="card">
          <div class="card-header">
            <div class="tabs">
              <button class="tab-btn active" data-tab="messages">📨 Meldinger (<span id="tab-count-msg">0</span>)</button>
              <button class="tab-btn" data-tab="logs">📋 Hendelseslogg (<span id="tab-count-log">0</span>)</button>
            </div>
            <div class="toggle-group">
              <label><input type="checkbox" id="auto-refresh" checked> Auto-refresh (2s)</label>
            </div>
          </div>

          <!-- Messages Pane -->
          <div id="pane-messages">
            <div id="messages-container" class="message-list">
              <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div>Ingen meldinger registrert ennå.</div>
              </div>
            </div>
          </div>

          <!-- Logs Pane -->
          <div id="pane-logs" style="display: none;">
            <div id="logs-container" class="log-stream">
              <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div>Ingen logger registrert ennå.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      let activeTab = 'messages';
      let refreshTimer = null;

      const statTotal = document.getElementById('stat-total');
      const statInbound = document.getElementById('stat-inbound');
      const statOutbound = document.getElementById('stat-outbound');
      const statUptime = document.getElementById('stat-uptime');
      const healthStatus = document.getElementById('health-status');
      const messagesContainer = document.getElementById('messages-container');
      const logsContainer = document.getElementById('logs-container');
      const tabCountMsg = document.getElementById('tab-count-msg');
      const tabCountLog = document.getElementById('tab-count-log');
      const autoRefreshCheck = document.getElementById('auto-refresh');
      const formAlert = document.getElementById('form-alert');
      const simForm = document.getElementById('simulator-form');

      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeTab = btn.getAttribute('data-tab');
          document.getElementById('pane-messages').style.display = activeTab === 'messages' ? 'block' : 'none';
          document.getElementById('pane-logs').style.display = activeTab === 'logs' ? 'block' : 'none';
        });
      });

      // Quick template chips
      document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.getElementById('sim-text').value = chip.getAttribute('data-text');
        });
      });

      // Format ISO dates nicely
      function formatDate(isoStr) {
        if (!isoStr) return '';
        try {
          const d = new Date(isoStr);
          return d.toLocaleTimeString('no-NO') + '.' + String(d.getMilliseconds()).padStart(3, '0');
        } catch {
          return isoStr;
        }
      }

      function formatUptime(seconds) {
        if (!seconds) return '0s';
        const s = Math.floor(seconds);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        if (h > 0) return h + 't ' + (m % 60) + 'm';
        if (m > 0) return m + 'm ' + (s % 60) + 's';
        return s + 's';
      }

      function showAlert(type, text) {
        formAlert.className = 'alert alert-' + type;
        formAlert.textContent = text;
        formAlert.style.display = 'block';
        setTimeout(() => { formAlert.style.display = 'none'; }, 4000);
      }

      async function fetchState() {
        try {
          // Health
          const healthRes = await fetch('/health');
          if (healthRes.ok) {
            const hData = await healthRes.json();
            statUptime.textContent = formatUptime(hData.uptime);
            healthStatus.textContent = 'OPERATIONAL';
          }

          // Messages
          const msgRes = await fetch('/messages');
          if (msgRes.ok) {
            const data = await msgRes.json();
            const messages = data.messages || [];
            statTotal.textContent = messages.length;
            tabCountMsg.textContent = messages.length;

            const inboundCount = messages.filter(m => m.direction === 'inbound').length;
            const outboundCount = messages.filter(m => m.direction === 'outbound').length;
            statInbound.textContent = inboundCount;
            statOutbound.textContent = outboundCount;

            renderMessages(messages);
          }

          // Logs
          const logRes = await fetch('/api/logs');
          if (logRes.ok) {
            const logData = await logRes.json();
            const logs = logData.events || [];
            tabCountLog.textContent = logs.length;
            renderLogs(logs);
          }
        } catch (err) {
          console.error('Fetch state error:', err);
          healthStatus.textContent = 'OFFLINE';
        }
      }

      function renderMessages(messages) {
        if (!messages.length) {
          messagesContainer.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <div>Ingen meldinger registrert ennå.</div>
            </div>\`;
          return;
        }

        messagesContainer.innerHTML = messages.map(msg => {
          const isInbound = msg.direction === 'inbound';
          const badgeClass = isInbound ? 'badge-inbound' : 'badge-outbound';
          const badgeText = isInbound ? '📥 INNKOMMENDE' : '📤 UTGÅENDE';
          const sender = msg.from || (isInbound ? 'Ukjent' : 'Snippen');
          const recipient = msg.to || 'Ukjent';

          return \`
            <div class="message-item" id="msg-\${msg.id}">
              <div class="msg-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="direction-badge \${badgeClass}">\${badgeText}</span>
                  <span class="msg-meta">
                    \${isInbound ? 'Fra: <b>' + sender + '</b>' : 'Til: <b>' + recipient + '</b> (Fra ' + sender + ')'}
                  </span>
                </div>
                <div class="msg-time">\${formatDate(msg.createdAt)}</div>
              </div>
              <div class="msg-body \${isInbound ? 'inbound-border' : ''}">\${escapeHtml(msg.text)}</div>
              <div class="msg-footer">
                <span>ID: \${msg.id}</span>
                <span>Status: \${msg.status}</span>
              </div>
            </div>
          \`;
        }).join('');
      }

      function renderLogs(logs) {
        if (!logs.length) {
          logsContainer.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <div>Ingen logger registrert ennå.</div>
            </div>\`;
          return;
        }

        logsContainer.innerHTML = logs.map(entry => {
          let tagClass = 'tag-info';
          if (entry.type === 'outbound') tagClass = 'tag-outbound';
          else if (entry.type === 'inbound') tagClass = 'tag-inbound';
          else if (entry.type === 'webhook') tagClass = 'tag-webhook';
          else if (entry.type === 'reset') tagClass = 'tag-reset';

          return \`
            <div class="log-entry">
              <span class="log-time">\${formatDate(entry.timestamp)}</span>
              <span class="log-tag \${tagClass}">\${entry.type}</span>
              <span class="log-msg">\${escapeHtml(entry.message)}</span>
            </div>
          \`;
        }).join('');
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // Submit simulated inbound SMS
      simForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const from = document.getElementById('sim-from').value.trim();
        const text = document.getElementById('sim-text').value.trim();

        if (!from || !text) {
          showAlert('error', 'Vennligst fyll ut både avsender og meldingstekst.');
          return;
        }

        const btn = document.getElementById('btn-submit-sim');
        btn.disabled = true;
        btn.textContent = 'Sender...';

        try {
          const res = await fetch('/messages/inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, text }),
          });

          const data = await res.json();
          if (res.ok) {
            showAlert('success', '✅ Melding injisert vellykket! Webhook status: ' + (data.webhook?.delivered ? 'Levert (200)' : 'Mislyktes'));
            document.getElementById('sim-text').value = '';
            fetchState();
          } else {
            showAlert('error', '❌ Feil ved injisering: ' + (data.error || 'Ukjent feil'));
          }
        } catch (err) {
          showAlert('error', '❌ Nettverksfeil: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = '📤 Send innkommende SMS';
        }
      });

      // Clear all messages
      document.getElementById('btn-clear').addEventListener('click', async () => {
        if (!confirm('Er du sikker på at du vil slette alle meldinger?')) return;
        try {
          await fetch('/messages', { method: 'DELETE' });
          fetchState();
        } catch (err) {
          alert('Kunne ikke slette meldinger: ' + err.message);
        }
      });

      // Manual refresh
      document.getElementById('btn-refresh').addEventListener('click', fetchState);

      // Auto refresh setup
      function setupAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        if (autoRefreshCheck.checked) {
          refreshTimer = setInterval(fetchState, 2000);
        }
      }

      autoRefreshCheck.addEventListener('change', setupAutoRefresh);

      // Initial load
      fetchState();
      setupAutoRefresh();
    })();
  </script>
</body>
</html>
`;
}
