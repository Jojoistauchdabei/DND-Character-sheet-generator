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
  const META_KEY = 'dndCloudMeta';
  const PUSH_DEBOUNCE_MS = 2500;

  let user = null;
  let pushTimer = null;
  let dmDirty = false;
  const dirty = new Set();

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
    const { error } = await client.from('dm_state').upsert({ user_id: user.id, data: safeDmState() });
    if (error) {
      dmDirty = true;
      console.warn('DM-Sync fehlgeschlagen:', error.message);
      return;
    }
    markDmUpdated(new Date().toISOString());
  }

  async function flushPush() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    if (!user) return;
    const ids = [...dirty];
    dirty.clear();
    const failed = new Set();
    await Promise.all(ids.map(async (id) => {
      const raw = L.readSlotRaw(id);
      if (raw === null || raw === undefined) return;
      let payload;
      try { payload = JSON.parse(raw); } catch (e) { return; }
      const { error } = await client.from('sheets').upsert({
        user_id: user.id,
        slot_id: id,
        name: slotNameOf(raw),
        data: payload,
      });
      if (error) {
        failed.add(id);
        console.warn('Cloud-Sync (Slot ' + id + ') fehlgeschlagen:', error.message);
        return;
      }
      markSlotUpdated(id, new Date().toISOString());
    }));
    if (dmDirty) await pushDm();
    failed.forEach(x => dirty.add(x));
  }

  async function pullMerge() {
    let rows = null, pullErr = null;
    try {
      const res = await client.from('sheets').select('slot_id,name,data,updated_at');
      rows = res.data; pullErr = res.error;
    } catch (e) { pullErr = e; }
    if (pullErr) throw pullErr;

    const m = readMeta();
    const idx = L.getSlotIndex();
    const remoteIds = new Set();
    let activeTouched = false;
    const activeId = L.getActiveSlotId();

    (rows || []).forEach(row => {
      remoteIds.add(row.slot_id);
      const entry = idx.find(s => s.id === row.slot_id);
      if (!entry) {
        idx.push({ id: row.slot_id, name: String(row.name || '') });
      } else if (entry.name !== String(row.name || '')) {
        entry.name = String(row.name || '');
      }

      const iso = row.updated_at || '';
      const metaIso = (m.slots || {})[row.slot_id] || '';
      if (!iso || new Date(iso) > new Date(metaIso || 0)) {
        const payload = (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) ? row.data : {};
        L.writeSlot(row.slot_id, payload);
        markSlotUpdated(row.slot_id, iso);
        if (row.slot_id === activeId) activeTouched = true;
      } else {
        dirty.add(row.slot_id);
      }
    });

    idx.forEach(s => { if (!remoteIds.has(s.id)) dirty.add(s.id); });
    L.setSlotIndex(idx);
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
  }
  function stopSync() {
    user = null;
    dirty.clear();
    dmDirty = false;
    updateAuthUI();
  }

  /* ---- API für sheet.js / dm.js ----------------------------------------- */
  window.__cloudSync = {
    get enabled() { return !!user; },
    onLocalChange(id) {
      if (!user || !id) return;
      dirty.add(id);
      schedulePush();
    },
    onLocalDelete(id) {
      if (!user || !id) return;
      dirty.delete(id);
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
