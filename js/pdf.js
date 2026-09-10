/* pdf – aus index.html ausgelagert, Verhalten unveraendert. */
    function exportJSON() {
      const data = collectData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename(document.getElementById('charaktername').value) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function toBase64Utf8(text) {
      const bytes = new TextEncoder().encode(text);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }

    function fromBase64Utf8(b64) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }

    function embedJsonInPdf(pdfBytes, json) {
      const base64 = toBase64Utf8(json);
      const marker = `\n%%DNDJSON:${base64}\n%%ENDDNDJSON`;
      const markerBytes = new TextEncoder().encode(marker);
      const combined = new Uint8Array(pdfBytes.length + markerBytes.length);
      combined.set(pdfBytes);
      combined.set(markerBytes, pdfBytes.length);
      return combined;
    }

    function extractJsonFromPdf(buffer) {
      const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
      const startMarker = '%%DNDJSON:';
      const endMarker = '%%ENDDNDJSON';
      const start = text.indexOf(startMarker);
      if (start === -1) return null;
      const end = text.indexOf(endMarker, start);
      if (end === -1) return null;
      const base64 = text.substring(start + startMarker.length, end).trim();
      if (!base64) return null;
      return fromBase64Utf8(base64);
    }

    function splitDataUrl(dataUrl) {
      const match = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl || '');
      if (!match) return null;
      const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
      return { mime, base64: match[3] };
    }

    async function addImageToPdf(pdfDoc, dataUrl) {
      const info = splitDataUrl(dataUrl);
      if (!info) return null;
      const bytes = Uint8Array.from(atob(info.base64), c => c.charCodeAt(0));
      if (info.mime === 'image/png') return await pdfDoc.embedPng(bytes);
      return await pdfDoc.embedJpg(bytes);
    }

    async function exportPDF() {
      try {
        await ensurePdfLib();
        if (!window.PDFLib) throw new Error('PDF-Lib konnte nicht geladen werden.');
        const data = collectData();
        const json = JSON.stringify(data);
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const standardFonts = StandardFonts || {};
        const font = await pdfDoc.embedFont(standardFonts.TimesRoman || 'Times-Roman');
        const fontBold = await pdfDoc.embedFont(standardFonts.TimesRomanBold || 'Times-Bold');

      const pageSize = [595.28, 841.89];
      const margin = 36;
      const contentW = pageSize[0] - margin * 2;

      const hexToRgb = (hex) => {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;
        return rgb(r, g, b);
      };

      const colors = {
        bg: hexToRgb('#faf6ee'),
        panel: hexToRgb('#f0e8d5'),
        ink: hexToRgb('#2a1a0e'),
        accent: hexToRgb('#8b5a2b'),
        border: hexToRgb('#c9a87c')
      };

      const yFromTop = (page, yTop) => page.getHeight() - yTop;

      const getFontTopOffset = (usedFont, size) => {
        if (usedFont && typeof usedFont.ascentAtSize === 'function') return usedFont.ascentAtSize(size);
        if (usedFont && typeof usedFont.heightAtSize === 'function') return usedFont.heightAtSize(size);
        return size;
      };

      // WinAnsi (CP1252) ist die einzige Kodierung der Standard-PDF-Fonts.
      // Alles andere (z.B. Emojis) würde drawText zum Absturz bringen – daher entfernen wir es.
      const winAnsiSafeRe = /[^\u0020-\u007E\n\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/g;
      const sanitizeWinAnsi = (v) => String(v == null ? '' : v).replace(winAnsiSafeRe, '');

      const drawTextTop = (page, text, x, yTop, size, usedFont, color) => {
        const offset = getFontTopOffset(usedFont, size);
        page.drawText(sanitizeWinAnsi(text), { x, y: yFromTop(page, yTop) - offset, size, font: usedFont, color });
      };

      const safeText = (v) => (v == null || v === '' ? '-' : sanitizeWinAnsi(String(v)));

      const wrapText = (text, maxWidth, size, usedFont) => {
        const lines = [];
        const raw = safeText(text);
        const paragraphs = raw.split(/\n+/);
        paragraphs.forEach((p, idx) => {
          const words = p.split(/\s+/).filter(Boolean);
          let line = '';
          words.forEach(word => {
            const test = line ? line + ' ' + word : word;
            const width = usedFont.widthOfTextAtSize(test, size);
            if (width <= maxWidth) {
              line = test;
            } else {
              if (line) lines.push(line);
              line = word;
            }
          });
          if (line) lines.push(line);
          if (idx < paragraphs.length - 1) lines.push('');
        });
        return lines;
      };

      const fitText = (text, maxWidth, size, usedFont) => {
        let out = sanitizeWinAnsi(String(text || ''));
        if (usedFont.widthOfTextAtSize(out, size) <= maxWidth) return out;
        while (out.length > 0 && usedFont.widthOfTextAtSize(out + '...', size) > maxWidth) {
          out = out.slice(0, -1);
        }
        return out.length ? out + '...' : '';
      };

      const drawBox = (page, x, yTop, w, h, label, value, opts = {}) => {
        const labelSize = opts.labelSize || 8;
        const valueSize = opts.valueSize || 11;
        const padding = opts.padding || 6;
        const fill = opts.fill !== false;
        page.drawRectangle({
          x,
          y: yFromTop(page, yTop) - h,
          width: w,
          height: h,
          borderColor: colors.border,
          borderWidth: 1,
          color: fill ? colors.panel : undefined
        });
        drawTextTop(page, label, x + padding, yTop + 4, labelSize, fontBold, colors.accent);
        const textAreaWidth = w - padding * 2;
        const textAreaHeight = h - 16;
        const cleanVal = (() => {
          if (!value) return '';
          const tmp = document.createElement('div');
          tmp.innerHTML = String(value)
            .replace(/<br\s*\/?>/gi, '\\n')
            .replace(/<\/p>/gi, '\\n')
            .replace(/<\/div>/gi, '\\n')
            .replace(/<\/h[1-6]>/gi, '\\n')
            .replace(/<li>/gi, '• ')
            .replace(/<\/li>/gi, '\\n');
          return (tmp.textContent || tmp.innerText || '').trim();
        })();
        const lines = wrapText(cleanVal, textAreaWidth, valueSize, font);
        const maxLines = Math.max(1, Math.floor(textAreaHeight / (valueSize + 2)));
        lines.slice(0, maxLines).forEach((line, i) => {
          drawTextTop(page, line, x + padding, yTop + 16 + i * (valueSize + 2), valueSize, font, colors.ink);
        });
      };

      const drawSectionTitle = (page, text, yTop) => {
        drawTextTop(page, text.toUpperCase(), margin, yTop, 9, fontBold, colors.accent);
        page.drawLine({
          start: { x: margin, y: yFromTop(page, yTop + 12) },
          end: { x: pageSize[0] - margin, y: yFromTop(page, yTop + 12) },
          color: colors.border,
          thickness: 1
        });
      };

      const drawPageFrame = (page, title, pageNum) => {
        page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: colors.bg });
        page.drawRectangle({ x: margin - 10, y: margin - 10, width: contentW + 20, height: pageSize[1] - (margin - 10) * 2, borderColor: colors.border, borderWidth: 1 });
        page.drawRectangle({ x: margin - 5, y: margin - 5, width: contentW + 10, height: pageSize[1] - (margin - 5) * 2, borderColor: colors.accent, borderWidth: 1 });
        drawTextTop(page, title, margin, 24, 12, fontBold, colors.accent);
        drawTextTop(page, `Seite ${pageNum}/5`, pageSize[0] - margin - 60, 24, 9, fontBold, colors.accent);
      };

      const attrs = {
        STR: parseInt(data['stärke']) || 0,
        GES: parseInt(data['geschicklichkeit']) || 0,
        KON: parseInt(data['konstitution']) || 0,
        INT: parseInt(data['intelligenz']) || 0,
        WEI: parseInt(data['weisheit']) || 0,
        CHA: parseInt(data['charisma']) || 0
      };
      const mods = {
        STR: getMod(attrs.STR),
        GES: getMod(attrs.GES),
        KON: getMod(attrs.KON),
        INT: getMod(attrs.INT),
        WEI: getMod(attrs.WEI),
        CHA: getMod(attrs.CHA)
      };
      const lvl = Math.min(20, Math.max(1, parseInt(data['stufe']) || 1));
      const prof = getProf(lvl);
      const initBonus = parseInt(data['initiative']) || 0;
      const initTotal = mods.GES + initBonus;

      const armorType = data['rüstungstyp'] || 'Keine';
      const armor = armorData[armorType] || armorData['Keine'];
      const dexAdd = armor.dexCap === null ? mods.GES : (armor.dexCap === 0 ? 0 : Math.min(mods.GES, armor.dexCap));
      const shieldBonus = data['schild'] ? 2 : 0;
      const acBonus = parseInt(data['ac']) || 0;
      const acAuto = baseAc + armor.bonus + dexAdd + shieldBonus + acBonus;

      const p1 = pdfDoc.addPage(pageSize);
      drawPageFrame(p1, 'D&D Charakterbogen', 1);

      let y = 56;
      drawSectionTitle(p1, 'Basis', y);
      y += 16;
      const gap = 8;
      const row1W = (contentW - gap * 2) / 3;
      drawBox(p1, margin, y, row1W, 32, 'Charaktername', data['charaktername']);
      drawBox(p1, margin + row1W + gap, y, row1W, 32, 'Spielername', data['spielername']);
      drawBox(p1, margin + (row1W + gap) * 2, y, row1W, 32, 'Erfahrungspunkte', data['erfahrungspunkte']);
      y += 40;
      const row2W = (contentW - gap * 3) / 4;
      drawBox(p1, margin, y, row2W, 32, 'Klasse', data['klasse']);
      drawBox(p1, margin + row2W + gap, y, row2W, 32, 'Stufe', lvl);
      drawBox(p1, margin + (row2W + gap) * 2, y, row2W, 32, 'Volk', data['volk']);
      drawBox(p1, margin + (row2W + gap) * 3, y, row2W, 32, 'Hintergrund', data['hintergrund']);

      y += 48;
      drawSectionTitle(p1, 'Attribute', y);
      y += 16;
      const attrW = (contentW - gap * 5) / 6;
      const attrH = 50;
      const attrKeys = ['STR', 'GES', 'KON', 'INT', 'WEI', 'CHA'];
      attrKeys.forEach((k, i) => {
        const x = margin + i * (attrW + gap);
        const val = attrs[k];
        const mod = fmtMod(mods[k]);
        drawBox(p1, x, y, attrW, attrH, k, `${val}  (${mod})`, { valueSize: 12 });
      });

      y += attrH + 18;
      drawSectionTitle(p1, 'Kampfwerte', y);
      y += 16;
      const row3W = (contentW - gap * 3) / 4;
      drawBox(p1, margin, y, row3W, 32, 'Ruestungsklasse Auto', acAuto);
      drawBox(p1, margin + row3W + gap, y, row3W, 32, 'Ruestungsklasse Bonus', acBonus);
      drawBox(p1, margin + (row3W + gap) * 2, y, row3W, 32, 'Ruestungsart', armorType);
      drawBox(p1, margin + (row3W + gap) * 3, y, row3W, 32, 'Schild', data['schild'] ? 'Getragen' : '-');

      y += 40;
      const row4W = (contentW - gap * 2) / 3;
      drawBox(p1, margin, y, row4W, 32, 'Initiative Bonus', initBonus);
      drawBox(p1, margin + row4W + gap, y, row4W, 32, 'Initiative Gesamt', fmtMod(initTotal));
      drawBox(p1, margin + (row4W + gap) * 2, y, row4W, 32, 'Bewegungsrate (m)', data['bewegungsrate']);

      y += 40;
      drawBox(p1, margin, y, row4W, 32, 'TP Maximum', data['tpmax']);
      drawBox(p1, margin + row4W + gap, y, row4W, 32, 'TP Aktuell', data['tpakt']);
      drawBox(p1, margin + (row4W + gap) * 2, y, row4W, 32, 'TP Temporaer', data['tptemp']);

      y += 50;
      drawSectionTitle(p1, 'Fertigkeiten', y);
      y += 16;
      const listH = 160;
      const colW = (contentW - gap) / 2;
      const lineSize = 9;
      const lineHeight = 12;
      const drawSkillColumn = (x, yTop, skills) => {
        p1.drawRectangle({ x, y: yFromTop(p1, yTop) - listH, width: colW, height: listH, borderColor: colors.border, borderWidth: 1, color: colors.panel });
        skills.forEach((s, idx) => {
          const profLevel = skillProfs[s.name] || 0;
          const profBonus = profLevel === 2 ? prof * 2 : profLevel === 1 ? prof : 0;
          const bonus = getMod(attrs[s.attr]) + profBonus;
          const label = `${s.name} (${s.attr})`;
          const labelMax = colW - 54;
          const labelText = fitText(label, labelMax, lineSize, font);
          const mark = profLevel === 2 ? 'E' : profLevel === 1 ? 'P' : '';
          drawTextTop(p1, labelText, x + 6, yTop + 6 + idx * lineHeight, lineSize, font, colors.ink);
          const bonusText = fmtMod(bonus);
          const bonusWidth = fontBold.widthOfTextAtSize(bonusText, lineSize);
          drawTextTop(p1, bonusText, x + colW - 18 - bonusWidth, yTop + 6 + idx * lineHeight, lineSize, fontBold, colors.accent);
          if (mark) drawTextTop(p1, mark, x + colW - 12, yTop + 6 + idx * lineHeight, lineSize, fontBold, colors.accent);
        });
      };
      drawSkillColumn(margin, y, fertigkeiten.slice(0, 9));
      drawSkillColumn(margin + colW + gap, y, fertigkeiten.slice(9));
      y += listH + 16;
      const percProf = skillProfs['Wahrnehmung'] || 0;
      const percBonus = percProf === 2 ? prof * 2 : percProf === 1 ? prof : 0;
      const passivePerc = 10 + mods.WEI + percBonus;
      drawBox(p1, margin, y, 160, 28, 'Passive Wahrnehmung', passivePerc, { valueSize: 12 });

      const p2 = pdfDoc.addPage(pageSize);
      drawPageFrame(p2, 'Hintergrund', 2);
      y = 56;
      drawSectionTitle(p2, 'Details', y);
      y += 16;
      const detailW = (contentW - gap * 2) / 3;
      drawBox(p2, margin, y, detailW, 32, 'Alter', data['alter']);
      drawBox(p2, margin + detailW + gap, y, detailW, 32, 'Glaube/Gottheit', data['glaube']);
      drawBox(p2, margin + (detailW + gap) * 2, y, detailW, 32, 'Groessenkategorie', data['größenkategorie']);
      y += 40;
      drawBox(p2, margin, y, detailW, 32, 'Koerpergroesse', data['körpergröße']);
      drawBox(p2, margin + detailW + gap, y, detailW, 32, 'Gewicht (kg)', data['gewicht']);
      drawBox(p2, margin + (detailW + gap) * 2, y, detailW, 32, 'Geschlecht', data['geschlecht']);
      y += 40;
      drawBox(p2, margin, y, detailW, 32, 'Gesinnung', data['gesinnung']);
      drawBox(p2, margin + detailW + gap, y, detailW, 32, 'Augenfarbe', data['augenfarbe']);
      drawBox(p2, margin + (detailW + gap) * 2, y, detailW, 32, 'Haarfarbe', data['haarfarbe']);

      y += 48;
      drawSectionTitle(p2, 'Aussehen & Geschichte', y);
      y += 16;
      const textW = (contentW - gap) / 2;
      drawBox(p2, margin, y, textW, 120, 'Aussehen', data['aussehen'], { valueSize: 9 });
      drawBox(p2, margin + textW + gap, y, textW, 120, 'Hintergrundgeschichte', data['hintergrundgeschichte'], { valueSize: 9 });
      const appearanceImage = await addImageToPdf(pdfDoc, data['aussehenBild']);
      if (appearanceImage) {
        const maxW = textW - 12;
        const maxH = 110;
        const scale = Math.min(maxW / appearanceImage.width, maxH / appearanceImage.height);
        p2.drawImage(appearanceImage, {
          x: margin + 6,
          y: yFromTop(p2, y + 6) - appearanceImage.height * scale,
          width: appearanceImage.width * scale,
          height: appearanceImage.height * scale
        });
      }
      const mapImage = await addImageToPdf(pdfDoc, data['karteBild']);
      if (mapImage) {
        const maxW = textW - 12;
        const maxH = 110;
        const scale = Math.min(maxW / mapImage.width, maxH / mapImage.height);
        p2.drawImage(mapImage, {
          x: margin + textW + gap + 6,
          y: yFromTop(p2, y + 6) - mapImage.height * scale,
          width: mapImage.width * scale,
          height: mapImage.height * scale
        });
      }

      y += 136;
      drawSectionTitle(p2, 'Persoenlichkeit', y);
      y += 16;
      drawBox(p2, margin, y, textW, 90, 'Persoenlichkeitsmerkmale', data['persönlichkeit'], { valueSize: 9 });
      drawBox(p2, margin + textW + gap, y, textW, 90, 'Ideale', data['ideale'], { valueSize: 9 });
      y += 106;
      drawBox(p2, margin, y, textW, 90, 'Bindungen', data['bindungen'], { valueSize: 9 });
      drawBox(p2, margin + textW + gap, y, textW, 90, 'Makel', data['makel'], { valueSize: 9 });
      y += 106;
      drawBox(p2, margin, y, pageSize[0] - margin * 2, 70, 'Notizen', data['notizen'], { valueSize: 9 });

      const p3 = pdfDoc.addPage(pageSize);
      drawPageFrame(p3, 'Zauber', 3);
      y = 56;
      drawSectionTitle(p3, 'Zauberwerte', y);
      y += 16;
      const zW = (contentW - gap * 3) / 4;
      drawBox(p3, margin, y, zW, 32, 'Zauberklasse', data['zaubklasse']);
      drawBox(p3, margin + zW + gap, y, zW, 32, 'Attribut', data['zaubattr']);
      drawBox(p3, margin + (zW + gap) * 2, y, zW, 32, 'Zauber-SG', data['zaubsg']);
      const zaubKey = resolveAttrKey(data['zaubattr']);
      drawBox(p3, margin + (zW + gap) * 3, y, zW, 32, 'Auto-SG', 8 + prof + (zaubKey ? mods[zaubKey] : 0));

      y += 48;
      drawSectionTitle(p3, 'Zauberlisten', y);
      y += 16;
      const spellW = (contentW - gap * 2) / 3;
      const spellH = 520;
      const drawSpellList = (title, startId, count, x) => {
        p3.drawRectangle({ x, y: yFromTop(p3, y) - spellH, width: spellW, height: spellH, borderColor: colors.border, borderWidth: 1, color: colors.panel });
        drawTextTop(p3, title, x + 6, y + 4, 9, fontBold, colors.accent);
        const lineSize = 9;
        const lineHeight = 12;
        for (let i = 0; i < count; i++) {
          const key = `${startId}${i}`;
          const val = data[key] || '';
          drawTextTop(p3, fitText(val, spellW - 12, lineSize, font) || '-', x + 6, y + 20 + i * lineHeight, lineSize, font, colors.ink);
        }
      };
      drawSpellList('Zaubertricks (0)', 'zauber-trick-', 10, margin);
      drawSpellList('Stufe 1', 'zauber-1-', 12, margin + spellW + gap);
      drawSpellList('Stufe 2', 'zauber-2-', 12, margin + (spellW + gap) * 2);
      // Extra spell levels added for the sheet and PDF
      const p3b = pdfDoc.addPage(pageSize);
      drawPageFrame(p3b, 'Zauber - Stufe 3 bis 6', 4);
      y = 56;
      drawSectionTitle(p3b, 'Zauberlisten', y);
      y += 16;
      const spellW2 = (contentW - gap) / 2;
      const drawSpellList2 = (title, startId, count, x, yTop) => {
        const h = 250;
        p3b.drawRectangle({ x, y: yFromTop(p3b, yTop) - h, width: spellW2, height: h, borderColor: colors.border, borderWidth: 1, color: colors.panel });
        drawTextTop(p3b, title, x + 6, yTop + 4, 9, fontBold, colors.accent);
        const lineSize = 9;
        const lineHeight = 12;
        for (let i = 0; i < count; i++) {
          const key = `${startId}${i}`;
          const val = data[key] || '';
          drawTextTop(p3b, fitText(val, spellW2 - 12, lineSize, font) || '-', x + 6, yTop + 20 + i * lineHeight, lineSize, font, colors.ink);
        }
      };
      drawSpellList2('Stufe 3', 'zauber-3-', 12, margin, y);
      drawSpellList2('Stufe 4', 'zauber-4-', 12, margin + spellW2 + gap, y);
      drawSpellList2('Stufe 5', 'zauber-5-', 12, margin, y + 260);
      drawSpellList2('Stufe 6', 'zauber-6-', 12, margin + spellW2 + gap, y + 260);

      const p4 = pdfDoc.addPage(pageSize);
      drawPageFrame(p4, 'Inventar', 5);
      y = 56;
      drawSectionTitle(p4, 'Inventar', y);
      y += 16;
      const tableH = 520;
      p4.drawRectangle({ x: margin, y: yFromTop(p4, y) - tableH, width: contentW, height: tableH, borderColor: colors.border, borderWidth: 1, color: colors.panel });
      drawTextTop(p4, 'Gegenstand', margin + 6, y + 4, 9, fontBold, colors.accent);
      drawTextTop(p4, 'Anz.', margin + contentW - 120, y + 4, 9, fontBold, colors.accent);
      drawTextTop(p4, 'Gew. (kg)', margin + contentW - 60, y + 4, 9, fontBold, colors.accent);
      const rowHeight = 14;
      for (let i = 0; i < 18; i++) {
        const rowY = y + 20 + i * rowHeight;
        const name = data[`inv-name-${i}`] || '';
        const anz = data[`inv-anz-${i}`] || '';
        const gew = data[`inv-gew-${i}`] || '';
        drawTextTop(p4, fitText(name, contentW - 150, 9, font) || '-', margin + 6, rowY, 9, font, colors.ink);
        drawTextTop(p4, String(anz || '-'), margin + contentW - 115, rowY, 9, font, colors.ink);
        drawTextTop(p4, String(gew || '-'), margin + contentW - 60, rowY, 9, font, colors.ink);
      }

      y += tableH + 24;
      drawSectionTitle(p4, 'Waehrung', y);
      y += 16;
      const coinW = (contentW - gap * 3) / 4;
      drawBox(p4, margin, y, coinW, 32, 'PM', data['währung-pp']);
      drawBox(p4, margin + coinW + gap, y, coinW, 32, 'GM', data['währung-gm']);
      drawBox(p4, margin + (coinW + gap) * 2, y, coinW, 32, 'SM', data['währung-sm']);
      drawBox(p4, margin + (coinW + gap) * 3, y, coinW, 32, 'KM', data['währung-km']);

        const pdfBytes = await pdfDoc.save();
        const pdfWithData = embedJsonInPdf(pdfBytes, json);
        const blob = new Blob([pdfWithData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFilename(data.charaktername) + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        console.error(err);
        alert('PDF-Export fehlgeschlagen: ' + err.message);
      }
    }

    async function importPDF(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const json = extractJsonFromPdf(buffer);
        if (!json) throw new Error('Keine eingebetteten JSON-Daten gefunden.');
        const data = JSON.parse(json);
        if (hasActiveCharacter() && !window.confirm('Ein gespeicherter Charakter existiert bereits und wird überschrieben. Fortfahren?')) return;
        applyData(data);
        updateCalcs();
        alert('✓ PDF erfolgreich importiert!');
      } catch (err) {
        alert('✗ Fehler: ' + err.message);
      } finally {
        event.target.value = '';
      }
    }

    function importJSON(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (hasActiveCharacter() && !window.confirm('Ein gespeicherter Charakter existiert bereits und wird überschrieben. Fortfahren?')) return;
          applyData(data);
          updateCalcs();
          alert('✓ Charakter erfolgreich importiert!');
        } catch (err) {
          alert('✗ Fehler: ' + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
