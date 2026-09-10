/* sheet – aus index.html ausgelagert, Verhalten unveraendert. */
    function init() {
      const nav = document.getElementById('nav');
      const pages = [
        { n: 1, t: 'Seite 1' }, { n: 2, t: 'Seite 2' }, { n: 3, t: 'Seite 3' }, { n: 4, t: 'Seite 4' },
        { n: 'DM', t: '⚔ DM-Modus', dm: true },
      ];
      pages.forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p.t;
        btn.onclick = () => showPage(p.n);
        if (p.dm) btn.classList.add('dm-btn');
        if (p.n === 1) btn.classList.add('active');
        nav.appendChild(btn);
      });

      const skillList = document.getElementById('fertigkeiten-list');
      fertigkeiten.forEach(s => {
        const div = document.createElement('div');
        div.className = 'skill-item';
        div.id = `skill-${s.name}`;
        div.onclick = () => toggleSkill(s.name);
        skillList.appendChild(div);
      });

      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `zauber-trick-${i}`;
        input.onchange = () => save();
        div.appendChild(input);
        document.getElementById('zaubertricks-list').appendChild(div);
      }

      [1, 2, 3, 4, 5, 6].forEach(lvl => {
        const list = document.getElementById(`zauber${lvl}-list`);
        const count = lvl === 1 || lvl === 2 || lvl === 3 || lvl === 4 || lvl === 5 ? 12 : 12;
        for (let i = 0; i < count; i++) {
          const div = document.createElement('div');
          div.style.marginBottom = '4px';
          const input = document.createElement('input');
          input.type = 'text';
          input.id = `zauber-${lvl}-${i}`;
          input.onchange = () => save();
          div.appendChild(input);
          list.appendChild(div);
        }
      });

      const invList = document.getElementById('inventar-list');
      for (let i = 0; i < 18; i++) {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';
        tr.innerHTML = `
          <td style="padding: 2px;"><input type="text" id="inv-name-${i}" onchange="save()" style="border: none; background: var(--field-bg); border-bottom: 1px solid var(--border); width: 100%;"></td>
          <td style="padding: 2px; text-align: center; width: 40px;"><input type="number" id="inv-anz-${i}" min="0" onchange="save()" style="width: 100%; border: none; background: var(--field-bg); border-bottom: 1px solid var(--border); text-align: center;"></td>
          <td style="padding: 2px; text-align: center; width: 70px;">
            <div class="weight-field">
              <input type="number" id="inv-gew-${i}" step="0.1" min="0" onchange="save()" style="width: 100%; border: none; background: var(--field-bg); border-bottom: 1px solid var(--border); text-align: center;">
            </div>
          </td>
        `;
        invList.appendChild(tr);
      }

      attachDatalist('klasse', klassen);
      attachDatalist('volk', völker);
      attachDatalist('hintergrund', hintergründe);
      attachDatalist('zaubattr', ['STR', 'GES', 'KON', 'INT', 'WEI', 'CHA']);

      document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el || !el.id || el.id === 'importFile' || el.id === 'importPdfFile') return;
        if (el.closest && el.closest('#pageDM')) return;
        if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number'))) {
          save();
        }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === SLOT_ACTIVE_KEY || e.key === null) {
          resetForm();
          load();
          updateCalcs();
          renderSlotOptions();
        }
      });

      migrateStorage();
      renderSlotOptions();

      load();
      updateCalcs();
    }

    function attachDatalist(inputId, values) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const dl = document.createElement('datalist');
      dl.id = inputId + '-optionen';
      values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        dl.appendChild(opt);
      });
      document.body.appendChild(dl);
      input.setAttribute('list', dl.id);
    }

    function showPage(n) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById(n === 'DM' ? 'pageDM' : 'page' + n);
      if (target) target.classList.add('active');
      const pageBtns = [...document.querySelectorAll('#nav > button')];
      pageBtns.forEach(b => b.classList.remove('active'));
      const order = [1,2,3,4,'DM'];
      const idx = order.indexOf(n);
      if (pageBtns[idx]) pageBtns[idx].classList.add('active');
      if (n === 'DM') initDM();
    }

    function collectData() {
      const data = {};
      document.querySelectorAll('#page1 input, #page1 textarea, #page1 select, #page1 .rich-field, #page2 input, #page2 textarea, #page2 select, #page2 .rich-field, #page3 input, #page3 textarea, #page3 select, #page4 input, #page4 textarea, #page4 select').forEach(el => {
        if (el.id && el.id !== 'importFile' && el.id !== 'importPdfFile' && el.id !== 'charSlots' && el.id !== 'initiative-display' && el.id !== 'auto-zaubsg' && el.id !== 'passive-perc' && el.id !== 'ac-auto') {
          if (el.type === 'checkbox') {
            data[el.id] = el.checked;
          } else if (el.isContentEditable) {
            data[el.id] = el.innerHTML;
          } else {
            data[el.id] = el.value;
          }
        }
      });
      data.skillProfs = skillProfs;
      data.inspiration = document.getElementById('inspiration-box').classList.contains('active');
      return data;
    }

    function applyData(data) {
      if (data.skillProfs) {
        skillProfs = normalizeSkillProfs(data.skillProfs);
      }
      setAussehenBild('');
      setKarteBild('');
      Object.keys(data).forEach(key => {
        if (key === 'skillProfs' || key === 'charSlots') return;
        if (key === 'aussehenBild') {
          setAussehenBild(data[key]);
          return;
        }
        if (key === 'karteBild') {
          setKarteBild(data[key]);
          return;
        }
        const el = document.getElementById(key);
        if (el) {
          if (el.type === 'checkbox') {
            const v = data[key];
            el.checked = (v === true || v === 'true' || v === 1 || v === '1');
          } else if (el.isContentEditable) {
            el.innerHTML = data[key] || '';
          } else {
            el.value = data[key];
          }
        }
      });
      if (data.inspiration !== undefined && data.inspiration !== null) {
        const v = data.inspiration;
        document.getElementById('inspiration-box').classList.toggle('active', v === true || v === 'true' || v === 1 || v === '1');
      }
    }

    let saveWarned = false;

    const SLOT_INDEX_KEY = 'dndCharIndex';
    const SLOT_ACTIVE_KEY = 'dndActiveSlot';
    const SLOT_PREFIX = 'dndChar_';

    function slotKeyOf(id) { return SLOT_PREFIX + id; }
    function readSlotRaw(id) { return id ? localStorage.getItem(slotKeyOf(id)) : null; }
    function getSlotIndex() { try { return JSON.parse(localStorage.getItem(SLOT_INDEX_KEY) || '[]'); } catch (e) { return []; } }
    function setSlotIndex(idx) { localStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(idx)); }
    function getActiveSlotId() { return localStorage.getItem(SLOT_ACTIVE_KEY); }
    function setActiveSlotId(id) { localStorage.setItem(SLOT_ACTIVE_KEY, id); }
    function newSlotId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function writeSlot(id, data) { localStorage.setItem(slotKeyOf(id), JSON.stringify(data)); }

    function hasActiveCharacter() {
      const raw = readSlotRaw(getActiveSlotId());
      if (!raw) return false;
      try { return Object.keys(JSON.parse(raw)).length > 0; } catch (e) { return true; }
    }

    function migrateStorage() {
      const active = getActiveSlotId();
      if (active && readSlotRaw(active) !== null) {
        if (!getSlotIndex().some(s => s.id === active)) {
          let data = null;
          try { data = JSON.parse(readSlotRaw(active)); } catch (e) { data = null; }
          setSlotIndex([{ id: active, name: String((data && data.charaktername) || '') }]);
        }
        localStorage.removeItem('dndChar');
        return;
      }
      const idx = getSlotIndex();
      const intact = idx.filter(s => readSlotRaw(s.id) !== null);
      if (intact.length > 0) {
        setSlotIndex(intact);
        setActiveSlotId(intact[0].id);
        return;
      }
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem('dndChar') || 'null'); } catch (e) { legacy = null; }
      // Keine neuen IDs stapeln: Falls Kartei-Einträge existieren (Speicher geleert),
      // den ersten Eintrag wiederverwenden statt jedes Mal einen leeren Slot anzulegen.
      const prevIdx = getSlotIndex();
      const id = prevIdx.length > 0 ? prevIdx[0].id : newSlotId();
      writeSlot(id, legacy && typeof legacy === 'object' ? legacy : {});
      if (!prevIdx.some(s => s.id === id)) prevIdx.push({ id: id, name: String((legacy && legacy.charaktername) || '') });
      setSlotIndex(prevIdx);
      setActiveSlotId(id);
      localStorage.removeItem('dndChar');
    }

    function syncActiveName(name) {
      const idx = getSlotIndex();
      const id = getActiveSlotId();
      const entry = idx.find(s => s.id === id);
      const clean = String(name || '').trim();
      if (entry && entry.name !== clean) {
        entry.name = clean;
        setSlotIndex(idx);
        renderSlotOptions();
      }
    }

    function renderSlotOptions() {
      const sel = document.getElementById('charSlots');
      if (!sel) return;
      const active = getActiveSlotId();
      sel.innerHTML = '';
      getSlotIndex().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name || '(unbenannt)';
        if (s.id === active) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    function switchSlot(id) {
      if (!id || id === getActiveSlotId()) return;
      save();
      setActiveSlotId(id);
      resetForm();
      load();
      updateCalcs();
      renderSlotOptions();
    }

    function newSlot() {
      save();
      const id = newSlotId();
      try {
        writeSlot(id, {});
      } catch (err) {
        console.error('Neuer Charakter konnte nicht gespeichert werden:', err);
        alert('Kein Speicherplatz für einen neuen Charakter. Bitte alte Charaktere löschen, Bilder entfernen oder als JSON/PDF exportieren.');
        return;
      }
      const idx = getSlotIndex();
      idx.push({ id: id, name: '' });
      setSlotIndex(idx);
      setActiveSlotId(id);
      resetForm();
      updateCalcs();
      renderSlotOptions();
      document.getElementById('charaktername').focus();
    }

    function deleteSlot() {
      const idx = getSlotIndex();
      if (idx.length === 0) return;
      if (!window.confirm('Diesen Charakter wirklich löschen?')) return;
      const id = getActiveSlotId();
      localStorage.removeItem(slotKeyOf(id));
      const rest = idx.filter(s => s.id !== id);
      setSlotIndex(rest);
      if (rest.length === 0) {
        const nid = newSlotId();
        writeSlot(nid, {});
        rest.push({ id: nid, name: '' });
        setSlotIndex(rest);
      }
      setActiveSlotId(getSlotIndex()[0].id);
      resetForm();
      load();
      updateCalcs();
      renderSlotOptions();
    }

    function resetForm() {
      document.querySelectorAll('#page1 input, #page1 textarea, #page1 select, #page1 .rich-field, #page2 input, #page2 textarea, #page2 select, #page2 .rich-field, #page3 input, #page4 input').forEach(el => {
        if (el.id === 'importFile' || el.id === 'importPdfFile' || el.id === 'charSlots') return;
        if (el.type === 'checkbox') el.checked = false;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.isContentEditable) el.innerHTML = '';
        else el.value = '';
      });
      setAussehenBild('');
      setKarteBild('');
      skillProfs = normalizeSkillProfs();
      document.getElementById('inspiration-box').classList.remove('active');
    }

    function shrinkDataImages(data) {
      return new Promise(resolve => {
        const keys = ['aussehenBild', 'karteBild'].filter(k => typeof data[k] === 'string' && data[k].startsWith('data:image'));
        if (!keys.length) { resolve(false); return; }
        Promise.all(keys.map(k => compressDataUrl(data[k], 1000, 0.8).then(nd => {
          if (nd && nd.length < data[k].length) { data[k] = nd; return true; }
          return false;
        }))).then(results => resolve(results.some(Boolean)));
      });
    }

    async function freeSpaceFromOtherSlots(activeId) {
      const idx = getSlotIndex();
      for (const s of idx) {
        if (s.id === activeId) continue;
        const raw = readSlotRaw(s.id);
        if (!raw || !raw.includes('data:image')) continue;
        let d;
        try { d = JSON.parse(raw); } catch (e) { continue; }
        await shrinkDataImages(d);
        try { writeSlot(s.id, d); } catch (e) { /* weiter mit nächstem Slot */ }
      }
    }

    function finalSaveFailureAlert(err) {
      console.error('Speichern fehlgeschlagen:', err);
      if (!saveWarned) {
        saveWarned = true;
        alert('Speichern fehlgeschlagen (' + err.name + '). Der Browser-Speicher ist voll oder gesperrt. Bitte alle Charaktere als JSON/PDF exportieren, alte Charaktere löschen und den Browser-Cache für diese Seite leeren.');
      }
    }

    let shrinkAlertShown = false;

    function syncImageInputsFrom(data) {
      const a = document.getElementById('aussehenBild');
      const k = document.getElementById('karteBild');
      if (a && typeof data.aussehenBild === 'string' && a.value !== data.aussehenBild) a.value = data.aussehenBild;
      if (k && typeof data.karteBild === 'string' && k.value !== data.karteBild) k.value = data.karteBild;
    }

    async function recoverAndRetrySave(id, data, err) {
      console.warn('Speichern fehlgeschlagen, Starte Rettungskaskade:', err && err.name);
      const versucheSchreiben = () => {
        try {
          writeSlot(id, data);
          syncActiveName(data.charaktername);
          saveWarned = false;
          return true;
        } catch (e) { return false; }
      };
      const verkleinert = await shrinkDataImages(data);
      if (verkleinert && versucheSchreiben()) {
        syncImageInputsFrom(data);
        if (!shrinkAlertShown) {
          shrinkAlertShown = true;
          alert('Die Bilder dieses Charakters waren sehr groß und wurden einmalig automatisch verkleinert – Speichern funktioniert wieder.');
        }
        return;
      }
      localStorage.removeItem('dndChar');
      if (versucheSchreiben()) return;
      await freeSpaceFromOtherSlots(id);
      if (versucheSchreiben()) return;
      finalSaveFailureAlert(new DOMException('QuotaExceededError', 'QuotaExceededError'));
    }

    function ensureActiveSlot() {
      let id = getActiveSlotId();
      if (!id || readSlotRaw(id) === null) {
        migrateStorage();
        renderSlotOptions();
        id = getActiveSlotId();
      }
      return id;
    }

    function save() {
      const id = ensureActiveSlot();
      const data = collectData();
      try {
        if (id) writeSlot(id, data);
        syncActiveName(data.charaktername);
        saveWarned = false;
      } catch (err) {
        recoverAndRetrySave(id, data, err);
      }
    }

    function load() {
      const id = getActiveSlotId();
      let data;
      try {
        const saved = readSlotRaw(id);
        if (!saved) return;
        data = JSON.parse(saved);
      } catch (err) {
        console.warn('Gespeicherte Charakterdaten sind beschädigt und werden ignoriert:', err);
        return;
      }
      applyData(data);
      shrinkLargeImagesAsync(id);
    }

    function setAussehenBild(dataUrl) {
      const hidden = document.getElementById('aussehenBild');
      const preview = document.getElementById('aussehenBildPreview');
      const removeBtn = document.getElementById('aussehenBildRemove');
      if (hidden) hidden.value = dataUrl || '';
      if (!preview) return;
      preview.innerHTML = '';
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Aussehen Bild';
        preview.appendChild(img);
        if (removeBtn) removeBtn.disabled = false;
      } else {
        const span = document.createElement('span');
        span.textContent = 'Kein Bild';
        preview.appendChild(span);
        if (removeBtn) removeBtn.disabled = true;
      }
    }

    function setKarteBild(dataUrl) {
      const hidden = document.getElementById('karteBild');
      const preview = document.getElementById('karteBildPreview');
      const removeBtn = document.getElementById('karteBildRemove');
      if (hidden) hidden.value = dataUrl || '';
      if (!preview) return;
      preview.innerHTML = '';
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Karte Bild';
        preview.appendChild(img);
        if (removeBtn) removeBtn.disabled = false;
      } else {
        const span = document.createElement('span');
        span.textContent = 'Keine Karte';
        preview.appendChild(span);
        if (removeBtn) removeBtn.disabled = true;
      }
    }

    function compressDataUrl(dataUrl, maxDim, quality) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', quality));
          } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    }

    function compressImageFile(file, maxDim, quality) {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) { reject(new Error('Bitte eine Bilddatei auswählen.')); return; }
        if (file.size > 15 * 1024 * 1024) { reject(new Error('Bild ist zu groß (max 15 MB).')); return; }
        const reader = new FileReader();
        reader.onload = (e) => resolve(compressDataUrl(e.target.result, maxDim, quality));
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
        reader.readAsDataURL(file);
      });
    }

    function shrinkLargeImagesAsync(id) {
      const raw = readSlotRaw(id);
      if (!raw || raw.length < 1000000) return;
      let data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      const originals = {};
      const jobs = [];
      ['aussehenBild', 'karteBild'].forEach(k => {
        if (typeof data[k] === 'string' && data[k].startsWith('data:image')) {
          originals[k] = data[k];
          jobs.push(compressDataUrl(data[k], 1200, 0.85).then(nd => ({ key: k, nd })));
        }
      });
      if (!jobs.length) return;
      Promise.all(jobs).then(results => {
        // Frischen Stand lesen, damit zwischenzeitliche Eingaben nicht überschrieben werden
        const rawNow = readSlotRaw(id);
        if (!rawNow) return;
        let fresh;
        try { fresh = JSON.parse(rawNow); } catch (e) { return; }
        let changed = false;
        results.forEach(({ key, nd }) => {
          if (!nd) return;
          if (fresh[key] === originals[key] && nd.length < originals[key].length) {
            fresh[key] = nd;
            changed = true;
          }
        });
        if (!changed) return;
        try { writeSlot(id, fresh); } catch (e) { console.error('Automatische Bildverkleinerung fehlgeschlagen:', e); }
      });
    }

    function importAussehenBild(event) {
      const file = event.target.files[0];
      if (!file) return;
      compressImageFile(file, 1200, 0.85).then(dataUrl => {
        if (!dataUrl) throw new Error('Bild konnte nicht verarbeitet werden.');
        setAussehenBild(dataUrl);
        save();
      }).catch(err => alert(err.message)).finally(() => { event.target.value = ''; });
    }

    function importKarteBild(event) {
      const file = event.target.files[0];
      if (!file) return;
      compressImageFile(file, 1200, 0.85).then(dataUrl => {
        if (!dataUrl) throw new Error('Bild konnte nicht verarbeitet werden.');
        setKarteBild(dataUrl);
        save();
      }).catch(err => alert(err.message)).finally(() => { event.target.value = ''; });
    }

    function clearAussehenBild() {
      setAussehenBild('');
      const fileInput = document.getElementById('aussehenBildFile');
      if (fileInput) fileInput.value = '';
      save();
    }

    function clearKarteBild() {
      setKarteBild('');
      const fileInput = document.getElementById('karteBildFile');
      if (fileInput) fileInput.value = '';
      save();
    }

    function updateCalcs() {
      const attrs = {
        STR: parseInt(document.getElementById('stärke').value) || 0,
        GES: parseInt(document.getElementById('geschicklichkeit').value) || 0,
        KON: parseInt(document.getElementById('konstitution').value) || 0,
        INT: parseInt(document.getElementById('intelligenz').value) || 0,
        WEI: parseInt(document.getElementById('weisheit').value) || 0,
        CHA: parseInt(document.getElementById('charisma').value) || 0,
      };

      Object.keys(attrs).forEach(k => {
        document.getElementById('mod-' + k).textContent = fmtMod(getMod(attrs[k]));
      });

      const lvlInput = document.getElementById('stufe');
      const lvlRaw = parseInt(lvlInput.value);
      const lvl = Math.min(20, Math.max(1, lvlRaw || 1));
      if (lvl !== lvlRaw) lvlInput.value = lvl;
      document.getElementById('prof-bonus').textContent = '+' + getProf(lvl);

      const initBonus = parseInt(document.getElementById('initiative').value) || 0;
      document.getElementById('initiative-display').value = fmtMod(getMod(attrs.GES) + initBonus);

      const armorType = document.getElementById('rüstungstyp').value;
      const armor = armorData[armorType] || armorData["Keine"];
      const dexMod = getMod(attrs.GES);
      const dexAdd = armor.dexCap === null ? dexMod : (armor.dexCap === 0 ? 0 : Math.min(dexMod, armor.dexCap));
      const shieldBonus = document.getElementById('schild').checked ? 2 : 0;
      const acBonus = parseInt(document.getElementById('ac').value) || 0;
      const acAuto = baseAc + armor.bonus + dexAdd + shieldBonus + acBonus;
      document.getElementById('ac-auto').value = acAuto;

      const zaubAttrKey = resolveAttrKey(document.getElementById('zaubattr').value);
      const zaubMod = zaubAttrKey ? getMod(attrs[zaubAttrKey]) : 0;
      document.getElementById('auto-zaubsg').value = (8 + getProf(lvl) + zaubMod);

      const weiMod = getMod(attrs.WEI);
      const percProf = skillProfs['Wahrnehmung'] || 0;
      const percBonus = percProf === 2 ? getProf(lvl) * 2 : percProf === 1 ? getProf(lvl) : 0;
      document.getElementById('passive-perc').textContent = 10 + weiMod + percBonus;

      fertigkeiten.forEach(s => {
        const attrKey = s.attr;
        const profLevel = skillProfs[s.name] || 0;
        const profBonus = profLevel === 2 ? getProf(lvl) * 2 : profLevel === 1 ? getProf(lvl) : 0;
        const mod = getMod(attrs[attrKey]) + profBonus;
        const el = document.getElementById(`skill-${s.name}`);
        if (el) {
          const isProf = profLevel >= 1;
          const isExpert = profLevel === 2;
          el.innerHTML = `
            <div class="dot ${isProf ? 'checked' : ''}"></div>
            <div class="skill-name">${s.name}</div>
            <div class="skill-attr">(${s.attr})</div>
            <div class="skill-bonus">${fmtMod(mod)}</div>
            <div class="skill-expert ${isExpert ? 'active' : ''}">E</div>
          `;
        }
      });

      save();
    }

    function toggleSkill(name) {
      const current = skillProfs[name] || 0;
      const next = (current + 1) % 3;
      skillProfs[name] = next;
      updateCalcs();
    }

    function toggleInspiration() {
      const box = document.getElementById('inspiration-box');
      box.classList.toggle('active');
      save();
    }

    