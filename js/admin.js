/* admin - Admin-Dashboard: App-Statistiken via Supabase Edge Function. */

function adminInvokeStats() {
  const client = window.__supabase;
  if (!client) return Promise.reject(new Error('Supabase ist nicht verfuegbar.'));
  return client.functions.invoke('admin-stats').then(function (res) {
    if (res && res.error) return Promise.reject(res.error);
    return res.data;
  });
}

function loadAdminStats() {
  const content = document.getElementById('adminContent');
  if (!content) return;
  content.innerHTML = '<div class="admin-loading">Statistiken werden geladen ...</div>';
  adminInvokeStats()
    .then(function (data) { renderAdminDashboard(data); })
    .catch(function (err) { renderAdminError(err); });
}

function renderAdminError(err) {
  const content = document.getElementById('adminContent');
  if (!content) return;
  let msg = 'Statistiken konnten nicht geladen werden.';
  if (err) {
    const status = (err.context && err.context.status) ? err.context.status : ((err.status) ? err.status : 0);
    if (status === 403) msg = 'Kein Admin-Recht fuer dieses Konto.';
    else if (status === 401) msg = 'Bitte zuerst anmelden.';
  }
  content.innerHTML = '<div class="admin-error">' + msg + '</div>';
}

function adminFmt(n) { return Math.round(Number(n) || 0); }

function adminFmtDay(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return day + '.' + month + '.' + year;
}

function adminEscapeHtml(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function adminRenderBars(containerId, entries, labelOf) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!entries || !entries.length) { el.innerHTML = '<div class="admin-empty">Keine Daten.</div>'; return; }
  let maxVal = 0;
  entries.forEach(function (e) { if ((e.count || 0) > maxVal) maxVal = e.count || 0; });
  const topVal = maxVal > 0 ? maxVal : 1;
  let rows = '';
  entries.forEach(function (e) {
    const count = e.count || 0;
    const pct = Math.round((count / topVal) * 100);
    rows = rows +
      '<div class="admin-bar-row">' +
      '<div class="admin-bar-label" style="max-width: 110px;">' + adminEscapeHtml(labelOf ? labelOf(e) : e.date) + '</div>' +
      '<div class="admin-bar-track"><div class="admin-bar-fill" style="width: ' + pct + '%"></div></div>' +
      '<div class="admin-bar-value">' + adminFmt(count) + '</div>' +
      '</div>';
  });
  el.innerHTML = rows;
}

function renderAdminDashboard(data) {
  const o = (data && data.overview) ? data.overview : {};
  const signupsByDay = data.signupsByDay || [];
  const updatesByDay = data.updatesByDay || [];
  const dmUpdatesByDay = data.dmUpdatesByDay || [];
  const classDistribution = data.classDistribution || [];
  const levelDistribution = data.levelDistribution || [];
  const topCharacters = data.topCharacters || [];

  const content = document.getElementById('adminContent');
  const generatedAt = document.getElementById('adminGeneratedAt');
  if (generatedAt) generatedAt.textContent = adminFmtDay((data && data.generated_at) || '');

  let statsHtml = '';
  const statCards = [
    ['stat-total-users', o.totalUsers, 'Registrierte Nutzer'],
    ['stat-active-users', o.activeUsers30d, 'Aktive (30 Tage)'],
    ['stat-total-chars', o.totalCharacters, 'Charaktere'],
    ['stat-total-dm', o.totalDmStates, 'DM-Zustaende'],
    ['stat-avg-chars', o.charactersPerUser, 'Durchschnittlich pro Nutzer']
  ];
  statCards.forEach(function (c) {
    statsHtml = statsHtml +
      '<div class="admin-stat-card"><div class="admin-stat-value" id="' + c[0] + '">' + adminFmt(c[1]) + '</div>' +
      '<div class="admin-stat-label">' + c[2] + '</div></div>';
  });

  let classesBody = '<div class="admin-empty">Keine Daten.</div>';
  if (classDistribution.length) {
    const maxCount = classDistribution[0].count || 1;
    classesBody = classDistribution.map(function (c) {
      const pct = Math.round((c.count / maxCount) * 100);
      return '<div class="admin-bar-row">' +
        '<div class="admin-bar-label" style="max-width: 120px;">' + adminEscapeHtml(c.klasse) + '</div>' +
        '<div class="admin-bar-track"><div class="admin-bar-fill" style="width: ' + pct + '%"></div></div>' +
        '<div class="admin-bar-value">' + adminFmt(c.count) + '</div>' +
        '</div>';
    }).join('');
  }

  let levelsBody = '<div class="admin-empty">Keine Daten.</div>';
  if (levelDistribution.length) {
    const maxCount = levelDistribution[0].count || 1;
    levelsBody = levelDistribution.map(function (l) {
      const pct = Math.round((l.count / maxCount) * 100);
      return '<div class="admin-bar-row">' +
        '<div class="admin-bar-label" style="max-width: 120px;">' + adminFmt(l.stufe) + '</div>' +
        '<div class="admin-bar-track"><div class="admin-bar-fill" style="width: ' + pct + '%"></div></div>' +
        '<div class="admin-bar-value">' + adminFmt(l.count) + '</div>' +
        '</div>';
    }).join('');
  }

  let topRows = '';
  if (topCharacters.length) {
    topCharacters.forEach(function (r) {
      topRows = topRows +
        '<tr>' +
        '<td>' + adminEscapeHtml(r.charaktername || r.name || '-') + '</td>' +
        '<td>' + adminEscapeHtml(r.klasse) + ((r.stufe) ? ' (Stufe ' + adminFmt(r.stufe) + ')' : '') + '</td>' +
        '<td>' + adminEscapeHtml(r.email || '-') + '</td>' +
        '<td>' + adminFmtDay(r.updated_at) + '</td>' +
        '</tr>';
    });
  }

  const topHtml = '<table class="admin-table"><thead><tr><th>Charakter</th><th>Klasse / Stufe</th><th>Spieler</th><th>Zuletzt bearbeitet</th></tr></thead><tbody>' + topRows + '</tbody></table>';

  content.innerHTML = '' +
    '<div class="admin-stats-grid">' + statsHtml + '</div>' +
    '<div class="admin-grid2">' +
      '<div class="box">' +
        '<div class="admin-chart-title">Registrierungen (letzte 30 Tage)</div>' +
        '<div id="adminChartSignups"></div>' +
      '</div>' +
      '<div class="box">' +
        '<div class="admin-chart-title">Charakter-Aktivitaet (letzte 30 Tage)</div>' +
        '<div id="adminChartUpdates"></div>' +
      '</div>' +
    '</div>' +
    '<div class="box">' +
      '<div class="admin-chart-title">DM-HP-Aenderungen (letzte 30 Tage)</div>' +
      '<div id="adminChartDm"></div>' +
    '</div>' +
    '<div class="admin-grid2">' +
      '<div class="box">' +
        '<div class="admin-chart-title">Klassen-Verteilung</div>' +
        '<div id="adminChartClasses">' + classesBody + '</div>' +
      '</div>' +
      '<div class="box">' +
        '<div class="admin-chart-title">Stufen-Verteilung</div>' +
        '<div id="adminChartLevels">' + levelsBody + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="box">' +
      '<div class="admin-chart-title">Zuletzt bearbeitete Charaktere</div>' +
      '<div id="adminTopCharacters">' + topHtml + '</div>' +
    '</div>';

  adminRenderBars('adminChartSignups', signupsByDay, function (e) { return adminFmtDay(e.date); });
  adminRenderBars('adminChartUpdates', updatesByDay, function (e) { return adminFmtDay(e.date); });
  adminRenderBars('adminChartDm', dmUpdatesByDay, function (e) { return adminFmtDay(e.date); });
  adminRenderBars('adminChartClasses', classDistribution, function (e) { return e.klasse; });
  adminRenderBars('adminChartLevels', levelDistribution, function (e) { return adminFmt(e.stufe); });
}
