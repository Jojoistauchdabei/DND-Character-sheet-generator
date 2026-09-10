/* data – aus index.html ausgelagert, Verhalten unveraendert. */
    const klassen = ["Barbar","Barde","Kleriker","Druide","Kämpfer","Mönch","Paladin","Waldläufer","Schurke","Zauberer","Hexenmeister","Magier"];
    const völker = ["Zwerg","Elf","Gnom","Halbelf","Halbork","Halbling","Mensch","Teuflingsblut","Drachenkind"];
    const hintergründe = ["Akoluth","Betrüger","Krimineller","Unterhalter","Volksheld","Gildenhandwerker","Einsiedler","Adliger","Ausgestoßener","Weiser","Seemann","Soldat","Waisenkind","Söldner"];
    const fertigkeiten = [
      { name:"Akrobatik", attr:"GES" }, { name:"Arkane Kunde", attr:"INT" },
      { name:"Athletik", attr:"STR" }, { name:"Auftreten", attr:"CHA" },
      { name:"Einschüchtern", attr:"CHA" }, { name:"Fingerfertigkeit", attr:"GES" },
      { name:"Geschichte", attr:"INT" }, { name:"Heilkunde", attr:"WEI" },
      { name:"Heimlichkeit", attr:"GES" }, { name:"Mit Tieren umgehen", attr:"WEI" },
      { name:"Motiv erkennen", attr:"WEI" }, { name:"Nachforschungen", attr:"INT" },
      { name:"Naturkunde", attr:"INT" }, { name:"Religion", attr:"INT" },
      { name:"Täuschen", attr:"CHA" }, { name:"Überlebenskunst", attr:"WEI" },
      { name:"Überzeugen", attr:"CHA" }, { name:"Wahrnehmung", attr:"WEI" },
    ];

    const attrMap = { STR:"stärke", GES:"geschicklichkeit", KON:"konstitution", INT:"intelligenz", WEI:"weisheit", CHA:"charisma" };

    const attrAliases = {
      STR: 'STR', GES: 'GES', KON: 'KON', INT: 'INT', WEI: 'WEI', CHA: 'CHA',
      STÄRKE: 'STR', STAERKE: 'STR', GESCHICKLICHKEIT: 'GES', KONSTITUTION: 'KON',
      INTELLIGENZ: 'INT', WEISHEIT: 'WEI', CHARISMA: 'CHA'
    };
    function resolveAttrKey(value) {
      const raw = String(value || '').trim().toUpperCase()
        .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE');
      return attrAliases[raw] || null;
    }

    const baseAc = 10;
    const armorData = {
      "Keine": { bonus: 0, dexCap: null },
      "Gepolsterte Rüstung": { bonus: 1, dexCap: null },
      "Leder": { bonus: 1, dexCap: null },
      "Genietetes Leder": { bonus: 2, dexCap: null },
      "Fellrüstung": { bonus: 2, dexCap: 2 },
      "Kettenhemd": { bonus: 3, dexCap: 2 },
      "Schuppenpanzer": { bonus: 4, dexCap: 2 },
      "Brustplatte": { bonus: 4, dexCap: 2 },
      "Halbe Platte": { bonus: 5, dexCap: 2 },
      "Ringpanzer": { bonus: 4, dexCap: 0 },
      "Kettenpanzer": { bonus: 6, dexCap: 0 },
      "Schienenpanzer": { bonus: 7, dexCap: 0 },
      "Plattenpanzer": { bonus: 8, dexCap: 0 }
    };

    function normalizeSkillProfs(raw) {
      const normalized = {};
      fertigkeiten.forEach(s => {
        let v = raw && raw[s.name];
        if (v === true) v = 1;
        if (v === false || v == null) v = 0;
        if (typeof v === 'string') {
          const parsed = parseInt(v, 10);
          v = Number.isNaN(parsed) ? 0 : parsed;
        }
        if (typeof v !== 'number') v = 0;
        v = Math.max(0, Math.min(2, v));
        normalized[s.name] = v;
      });
      return normalized;
    }

    let skillProfs = normalizeSkillProfs();

    const getMod = (v) => Math.floor((v - 10) / 2);
    const getProf = (lvl) => 2 + Math.floor((lvl - 1) / 4);
    const fmtMod = (v) => v >= 0 ? `+${v}` : `${v}`;
    const safeFilename = (name) => String(name || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'charakter';

    const pdfLibSources = [
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
    ];
    let pdfLibPromise = null;

    function loadPdfLibFrom(src) {
      return new Promise((resolve, reject) => {
        if (window.PDFLib) {
          resolve();
          return;
        }
        const existing = document.querySelector(`script[data-pdf-lib="${src}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('PDF-Lib konnte nicht geladen werden.')));
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.pdfLib = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PDF-Lib konnte nicht geladen werden.'));
        document.head.appendChild(script);
      });
    }

    async function ensurePdfLib() {
      if (window.PDFLib) return;
      if (!pdfLibPromise) {
        pdfLibPromise = (async () => {
          for (const src of pdfLibSources) {
            try {
              await loadPdfLibFrom(src);
              if (window.PDFLib) return;
            } catch (err) {
              // next CDN
            }
          }
          pdfLibPromise = null;
          throw new Error('PDF-Lib konnte nicht geladen werden.');
        })();
      }
      return pdfLibPromise;
    }