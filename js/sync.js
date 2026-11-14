/* sync – Supabase-Anbindung: Accounts (E-Mail) + Cloud-Sync der Charakter-Slots.
 * Laeuft bewusst als klassisches Script (kein Build-Step) und haelt die App
 * funktionsfaehig, wenn der CDN-Ladevorgang fehlschlaegt (z.B. offline). */
(function () {
  'use strict';
  if (typeof supabase === 'undefined') return;
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') return;
  const L = window.__dndLocal;
  if (!L) return;

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.__supabase = client;
  const META_KEY = 'dndCloudMeta';
  const PUSH_DEBOUNCE_MS = 2500;

  let user = null;
  let pushTimer = null;
  let dmDirty = false;
  let channel = null;
  let dmEcho = null;
  const dirty = new Set();
  const ownEcho = new Map();
  const ownDeleteEcho = new Map();

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }
  function markSlotUpdated(id, iso) {
    const m = readMeta();
    m.slots = m.slots || {};
    m.slots[id] = iso;
    writeMeta(m);
  }
  function markDmUpdated(iso) { const m = readMeta(); m.dm = iso; writeMeta(m); }
  function slotNameOf(raw) {
    try { return String((JSON.parse(raw) || {}).charaktername || ''); } catch (e) { return ''; }
  }
  function safeDmState() {
    try { return JSON.parse(localStorage.getItem('dndDM_HP') || '{}'); } catch (e) { return {}; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---- Auth-UI ---------------------------------------------------------- */
  function updateAuthUI() {
    const el = document.getElementById('authStatus');
    if (!el) return;
    if (user) {
      el.innerHTML = '<span class="auth-user">✉ ' + escapeHtml(user.email || '') + '</span>' +
        '<button type="button" class="inactive" onclick="dndSignOut()">Abmelden</button>';
    } else {
      el.innerHTML = '<button type="button" onclick="openAuthModal()">🔐 Anmelden / Registrieren</button>';
    }
  }

  window.openAuthModal = function () {
    const o = document.getElementById('authOverlay');
    const e = document.getElementById('authEmail');
    const p = document.getElementById('authPassword');
    const err = document.getElementById('authError');
    if (e) e.value = '';
    if (p) p.value = '';
    if (err) { err.textContent = ''; err.style.display = 'none'; }
    if (o) o.classList.add('active');
    setTimeout(() => { if (e) e.focus(); }, 50);
  };
  window.closeAuthModal = function () {
    const o = document.getElementById('authOverlay');
    if (o) o.classList.remove('active');
  };

  function showAuthError(msg) {
    const err = document.getElementById('authError');
    if (!err) return;
    err.textContent = msg;
    err.style.display = 'block';
  }

  async function doAuth(mode) {
    const email = ((document.getElementById('authEmail') || {}).value || '').trim();
    const pass = (document.getElementById('authPassword') || {}).value || '';
    if (!email || pass.length < 6) {
      showAuthError('Bitte gültige E-Mail und Passwort (mindestens 6 Zeichen).');
      return;
    }
    try {
      if (mode === 'in') {
        const { error } = await client.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await client.auth.signUp({ email, password: pass });
        if (error) throw error;
        window.alert('Registriert! Falls die E-Mail-Bestätigung aktiviert ist: Bitte erst bestätigen, dann anmelden.');
      }
      window.closeAuthModal();
    } catch (e) {
      showAuthError(e.message || 'Anmeldung fehlgeschlagen.');
    }
  }
  window.dndSignIn = function () { return doAuth('in'); };
  window.dndSignUp = function () { return doAuth('up'); };
  window.dndSignOut = async function () {
    try { await client.auth.signOut(); } catch (e) {}
    location.reload();
  };

  /* ---- Cloud-Sync ------------------------------------------------------- */
  function schedulePush() {
    if (pushTimer) return;
    pushTimer = setTimeout(flushPush, PUSH_DEBOUNCE_MS);
  }

  async function pushDm() {
    dmDirty = false;
    const dmPayload = safeDmState();
    const { error, data: pushedDmRows } = await client.from('dm_state').upsert({ user_id: user.id, data: (dmPayload && typeof dmPayload === 'object' && !Array.isArray(dmPayload)) ? dmPayload : {} }).select('updated_at');
    if (error) {
      dmDirty = true;
      console.warn('DM-Sync fehlgeschlagen:', error.message);
      return;
    }
    const dmIso = Array.isArray(pushedDmRows) && pushedDmRows[0] && pushedDmRows[0].updated_at
      ? String(pushedDmRows[0].updated_at)
      : new Date().toISOString();
    markDmUpdated(dmIso);
    dmEcho = dmIso;
  }

  async function flushPush() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    if (!user) return;
    const ids = [...dirty].filter(isValidSlotId);
    dirty.clear();
    const failed = new Set();
    await Promise.all(ids.map(async (id) => {
      const raw = L.readSlotRaw(id);
      if (raw === null || raw === undefined) return;
      let payload;
      try { payload = JSON.parse(raw); } catch (e) { return; }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = {};
      const safeName = String(slotNameOf(raw) || '').slice(0, 120);
      const { error, data: pushedRows } = await client.from('sheets').upsert({
        user_id: user.id,
        slot_id: id,
        name: safeName,
        data: payload,
      }).select('slot_id,updated_at');
      if (error) {
        failed.add(id);
        console.warn('Cloud-Sync (Slot ' + id + ') fehlgeschlagen:', error.message);
        return;
      }
      const pushedIso = Array.isArray(pushedRows) && pushedRows[0] && pushedRows[0].updated_at
        ? String(pushedRows[0].updated_at)
        : new Date().toISOString();
      markSlotUpdated(id, pushedIso);
      ownEcho.set(id, pushedIso);
      pruneEchoes();
    }));
    if (dmDirty) await pushDm();
    failed.forEach(x => dirty.add(x));
  }

  function pruneEchoes() {
    const now = Date.now();
    [...ownEcho.entries()].forEach(([id, ts]) => { if (now - ts > 20000) ownEcho.delete(id); });
    [...ownDeleteEcho.entries()].forEach(([id, ts]) => { if (now - ts > 20000) ownDeleteEcho.delete(id); });
  }

  /* Eine Remote-Zeile in den lokalen Stand ueberfuehren (Pull und Live). */
  function adoptRemoteRow(row) {
    if (!row || !isValidSlotId(row.slot_id)) return { touched: false, indexChanged: false };
    const slotId = row.slot_id;
    const iso = row.updated_at || '';
    let touched = false;
    let indexChanged = false;
    const idx = L.getSlotIndex();
    const entry = idx.find(s => s.id === slotId);
    if (!entry) {
      idx.push({ id: slotId, name: String(row.name || '') });
      indexChanged = true;
    } else if (entry.name !== String(row.name || '')) {
      entry.name = String(row.name || '');
      indexChanged = true;
    }
    const metaIso = (readMeta().slots || {})[slotId] || '';
    if (!iso || new Date(iso) > new Date(metaIso || 0)) {
      const payload = (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) ? row.data : {};
      L.writeSlot(slotId, payload);
      markSlotUpdated(slotId, iso);
      if (slotId === L.getActiveSlotId()) touched = true;
    } else {
      dirty.add(slotId);
    }
    if (indexChanged) {
      L.setSlotIndex(idx);
      L.renderSlotOptions();
    }
    return { touched, indexChanged };
  }

  /* Remote-Gerät hat einen Slot gelöscht. Lokal mitlöschen, außer wenn hier
   * ungesendete Änderungen liegen (die werden danach wieder hochgeladen). */
  function processRemoteDelete(slotId) {
    if (!isValidSlotId(slotId) || dirty.has(slotId)) return;
    const idx = L.getSlotIndex();
    const rest = idx.filter(s => s.id !== slotId);
    if (rest.length === idx.length) return;
    try { localStorage.removeItem(L.slotKeyOf ? L.slotKeyOf(slotId) : 'dndChar_' + slotId); } catch (e) {}
    const m = readMeta();
    if (m.slots) { delete m.slots[slotId]; writeMeta(m); }
    const wasActive = L.getActiveSlotId() === slotId;
    if (rest.length === 0) {
      const nid = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      L.writeSlot(nid, {});
      rest.push({ id: nid, name: '' });
    }
    L.setSlotIndex(rest);
    L.renderSlotOptions();
    if (wasActive) {
      L.setActiveSlotId(rest[0].id);
      if (typeof resetForm === 'function') resetForm();
      L.load();
      if (typeof updateCalcs === 'function') updateCalcs();
    }
  }

  function applyRemoteActive(row) {
    const res = adoptRemoteRow(row);
    if (res.touched) {
      if (typeof resetForm === 'function') resetForm();
      L.load();
      if (typeof updateCalcs === 'function') updateCalcs();
    }
  }

  /* ---- Realtime (Live-Sync über WebSocket) -------------------------------- */
  function isValidSlotId(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= 80 && /^[A-Za-z0-9_-]+$/.test(id);
  }

  function subscribeRealtime() {
    if (channel || !user) return;
    const userFilter = 'user_id=eq.' + user.id;
    channel = client.channel('dnd-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sheets', filter: userFilter }, (payload) => {
        try {
          if (payload.eventType === 'DELETE') {
            processRemoteDelete((payload.old || {}).slot_id);
            return;
          }
          const row = (payload.new && typeof payload.new === 'object') ? payload.new : null;
          if (!row || !isValidSlotId(row.slot_id)) return;
          if (ownEcho.has(row.slot_id)) {
            if (String(row.updated_at || '') === String(ownEcho.get(row.slot_id))) {
              ownEcho.delete(row.slot_id);
              markSlotUpdated(row.slot_id, row.updated_at || '');
              return;
            }
          }
          applyRemoteActive(row);
        } catch (e) {
          console.warn('Live-Sync (sheets) Fehler:', (e && e.message) || e);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_state', filter: userFilter }, (payload) => {
        try {
          const row = (payload.new && typeof payload.new === 'object') ? payload.new : null;
          if (!row || !row.data) return;
          if (String(row.updated_at || '') === String(dmEcho)) { dmEcho = null; markDmUpdated(row.updated_at || ''); return; }
          const m = readMeta();
          if (row.updated_at && new Date(row.updated_at) > new Date(m.dm || 0)) {
            try {
              localStorage.setItem('dndDM_HP', JSON.stringify((row.data && typeof row.data === 'object') ? row.data : {}));
            } catch (e) {}
            markDmUpdated(row.updated_at);
            document.dispatchEvent(new CustomEvent('dnd-dm-synced'));
          }
        } catch (e) {
          console.warn('Live-Sync (dm) Fehler:', (e && e.message) || e);
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Live-Sync: Kanal-Fehler – Geräte tauschen sich erst beim Reload neu aus.');
          if (channel) { try { client.removeChannel(channel); } catch (e) {} channel = null; }
        }
      });
  }

  function unsubscribeRealtime() {
    if (channel) {
      try { client.removeChannel(channel); } catch (e) {}
      channel = null;
    }
  }

  async function pullMerge() {
    pruneEchoes();
    let rows = null, pullErr = null;
    try {
      const res = await client.from('sheets').select('slot_id,name,data,updated_at');
      rows = res.data; pullErr = res.error;
    } catch (e) { pullErr = e; }
    if (pullErr) throw pullErr;

    const m = readMeta();
    const remoteIds = new Set();
    let activeTouched = false;

    (rows || []).forEach(row => {
      if (!isValidSlotId(row && row.slot_id)) return;
      remoteIds.add(row.slot_id);
      const r = adoptRemoteRow(row);
      if (r.touched) activeTouched = true;
    });

    L.getSlotIndex().forEach(s => { if (!remoteIds.has(s.id)) dirty.add(s.id); });
    const idx = L.getSlotIndex();
    if (!L.getActiveSlotId() && idx.length > 0) {
      L.setActiveSlotId(idx[0].id);
      activeTouched = true;
    }

    let dmTouched = false;
    try {
      const { data: dmRow, error: dmErr } = await client.from('dm_state').select('data,updated_at').maybeSingle();
      if (!dmErr) {
        const metaIso = m.dm || '';
        if (dmRow && dmRow.updated_at && new Date(dmRow.updated_at) > new Date(metaIso || 0)) {
          try {
            localStorage.setItem('dndDM_HP', JSON.stringify((dmRow.data && typeof dmRow.data === 'object') ? dmRow.data : {}));
          } catch (e) {}
          markDmUpdated(dmRow.updated_at);
          dmTouched = true;
        } else {
          dmDirty = true;
        }
      }
    } catch (e) {}

    L.renderSlotOptions();
    if (activeTouched) {
      if (typeof resetForm === 'function') resetForm();
      L.load();
      if (typeof updateCalcs === 'function') updateCalcs();
    }
    if (dmTouched) document.dispatchEvent(new CustomEvent('dnd-dm-synced'));

    if ([...dirty].length || dmDirty) schedulePush();
  }

  async function startSync(u) {
    if (user) return;
    user = u;
    updateAuthUI();
    try { await pullMerge(); } catch (e) {
      console.warn('Cloud-Sync (Pull) fehlgeschlagen:', (e && e.message) || e);
    }
    try { await flushPush(); } catch (e) {}
    subscribeRealtime();
  }
  function stopSync() {
    unsubscribeRealtime();
    user = null;
    dirty.clear();
    dmDirty = false;
    ownEcho.clear();
    ownDeleteEcho.clear();
    updateAuthUI();
  }

  /* ---- API für sheet.js / dm.js ----------------------------------------- */
  window.__cloudSync = {
    get enabled() { return !!user; },
    onLocalChange(id) {
      if (!user || !isValidSlotId(id)) return;
      dirty.add(id);
      schedulePush();
    },
    onLocalDelete(id) {
      if (!user || !isValidSlotId(id)) return;
      dirty.delete(id);
      ownEcho.delete(id);
      ownDeleteEcho.set(id, Date.now());
      const m = readMeta();
      if (m.slots) { delete m.slots[id]; writeMeta(m); }
      client.from('sheets')
        .delete()
        .match({ user_id: user.id, slot_id: id })
        .then(r => { if (r && r.error) console.warn('Cloud-Löschen fehlgeschlagen:', r.error.message); })
        .catch(() => {});
    },
    saveDmState() {
      if (!user) return;
      dmDirty = true;
      schedulePush();
    },
  };

  /* ---- Bootstrap -------------------------------------------------------- */
  client.auth.onAuthStateChange((event, session) => {
    if (user && event === 'SIGNED_IN') return;
    if (session && session.user) startSync(session.user);
    else if (event === 'SIGNED_OUT') stopSync();
  });

  client.auth.getSession().then(({ data }) => {
    if (data && data.session && data.session.user) startSync(data.session.user);
    else updateAuthUI();
  }).catch(() => updateAuthUI());

  window.addEventListener('online', () => { if (user && (dirty.size || dmDirty)) schedulePush(); });
})();
