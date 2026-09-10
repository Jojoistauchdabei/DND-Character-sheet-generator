/* dm – aus index.html ausgelagert, Verhalten unveraendert. */
    /* ================= DUNGEON MASTER MODUL ================= */
    let dmInitDone = false;
    let currentDie = 20;
    const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];
    let diceHistory = [];

    const CREATURES = [
      { id:'goblin', name:'Goblin', emoji:'👺', cr:'1/4', xp:50, hp:7, ac:15, speed:'9m', str:8, dex:14, con:10, desc:'Kleiner, gemeiner Humanoid. Liebt Hinterhalte, hasst Tageslicht.', trait:'Nimble Flucht: Kann sich als Bonusaktion verstecken.' },
      { id:'ork', name:'Ork', emoji:'👹', cr:'1/2', xp:100, hp:15, ac:13, speed:'9m', str:16, dex:12, con:16, desc:'Brutaler Krieger mit Kriegsaxt. Kämpft bis zum Tod.', trait:'Aggressiv: Bonusaktion Bewegung auf Gegner zu.' },
      { id:'skelett', name:'Skelett', emoji:'💀', cr:'1/4', xp:50, hp:13, ac:13, speed:'9m', str:10, dex:14, con:15, desc:'Untoter Diener dunkler Magie. Immun gegen Gift.', trait:'Anfälligkeit für Wucht-Schaden.' },
      { id:'wolf', name:'Düsterwolf', emoji:'🐺', cr:'1', xp:200, hp:22, ac:14, speed:'15m', str:17, dex:15, con:15, desc:'Rudeljäger mit Rudeltaktik (Vorteil bei Verbündeten).', trait:'Umreißen: SG 13 Stärke oder liegend.' },
      { id:'eulenbaer', name:'Eulenbär', emoji:'🦉', cr:'3', xp:700, hp:59, ac:13, speed:'12m', str:20, dex:12, con:17, desc:'Brüllende Bestie aus Feder und Fell. Sehr territorial.', trait:'Multiangriff: Schnabel + Klauen.' },
      { id:'mimik', name:'Mimik', emoji:'📦', cr:'2', xp:450, hp:58, ac:12, speed:'4,5m', str:17, dex:12, con:15, desc:'Verwandelt sich in Truhen. Klebt Opfer fest.', trait:'Klebrig + Scheingestalt.' },
      { id:'troll', name:'Troll', emoji:'🧌', cr:'5', xp:1800, hp:84, ac:15, speed:'9m', str:18, dex:13, con:20, desc:'Regeneriert 10 TP/Runde. Nur Feuer & Säure stoppen ihn.', trait:'Regeneration + Multiangriff.' },
      { id:'jungdrache', name:'Junger Roter Drache', emoji:'🐲', cr:'10', xp:5900, hp:178, ac:18, speed:'12m, fliegend 24m', str:23, dex:14, con:21, desc:'Feuerodem (16W6, SG 17). Boss für Stufe 5-8.', trait:'Feuerodem + Furchterregende Präsenz.' },
      { id:'beholder', name:'Betrachter', emoji:'👁️', cr:'13', xp:10000, hp:180, ac:18, speed:'schwebend 6m', str:10, dex:14, con:18, desc:'Zentralauge = Antimagie. 10 Augenstrahlen.', trait:'Augenstrahlen: Desintegration, Tod u.v.m.' },
      { id:'schleim', name:'Gallertwürfel', emoji:'🟩', cr:'2', xp:450, hp:84, ac:6, speed:'4,5m', str:14, dex:6, con:20, desc:'Unsichtbar in Gängen. Verschlingt alles.', trait:'Verschlingen + Betäubender Schlag.' },
      { id:'bandit', name:'Banditenhauptmann', emoji:'🥷', cr:'2', xp:450, hp:65, ac:15, speed:'9m', str:15, dex:16, con:14, desc:'Anführer mit Multiangriff & Parieren.', trait:'Parieren (+2 RK als Reaktion).' },
      { id:'geist', name:'Gespenst', emoji:'👻', cr:'4', xp:1100, hp:45, ac:11, speed:'fliegend 15m', str:7, dex:13, con:10, desc:'Besessenheit + Horrifying Visage (Altern).', trait:'Ätherisch: Resistenz nicht-magisch.' },
    ];
    const ITEMS = [
      { id:'langschwert', name:'Langschwert +1', emoji:'🗡️', rarity:'Selten', type:'Waffe', desc:'+1 Angriff & Schaden. 1W8+1 (1W10+1 zweihändig) Hieb.', price:'500 GM' },
      { id:'feuerballstab', name:'Stab des Feuerballs', emoji:'🔥', rarity:'Sehr selten', type:'Stab', desc:'Wirkt Feuerball (8W6, SG 15). 7 Ladungen, regeneriert 1W6+1.', price:'2500 GM' },
      { id:'heiltrank', name:'Heiltrank (Superior)', emoji:'🧪', rarity:'Selten', type:'Verbrauch', desc:'Heilt 8W4+8 TP als Aktion. Muss getrunken werden.', price:'450 GM' },
      { id:'kettenhemd', name:'Mithril-Kettenhemd', emoji:'⛓️', rarity:'Ungewöhnlich', type:'Rüstung', desc:'RK 13+DEX (max 2). Kein Nachteil auf Heimlichkeit, kein Stärkebedarf.', price:'800 GM' },
      { id:'umhang', name:'Umhang der Elfen', emoji:'🧥', rarity:'Ungewöhnlich', type:'Wundersam', desc:'Vorteil auf Heimlichkeit. Kapuze = fast unsichtbar.', price:'600 GM' },
      { id:'bagholding', name:'Beutel des Haltens', emoji:'🎒', rarity:'Ungewöhnlich', type:'Wundersam', desc:'250 kg / 2m³ innen, nur 7 kg außen. Atmen beachten!', price:'700 GM' },
      { id:'bogen', name:'Oathbow (Schwurbogen)', emoji:'🏹', rarity:'Legendär', type:'Waffe', desc:'1W8+3, Schwurfeind: 3W6 extra. Einmal pro Tag.', price:'unbezahlbar' },
      { id:'amulett', name:'Amulett der Gesundheit', emoji:'📿', rarity:'Selten', type:'Wundersam', desc:'Konstitution = 19 (solange getragen).', price:'1200 GM' },
      { id:'stiefel', name:'Stiefel der Geschwindigkeit', emoji:'🥾', rarity:'Selten', type:'Wundersam', desc:'Bonusaktion: doppelte Bewegung, Gelegenheitsangriffe mit Nachteil.', price:'900 GM' },
      { id:'ring', name:'Ring des Schutzes', emoji:'💍', rarity:'Selten', type:'Ring', desc:'+1 RK und +1 auf alle Rettungswürfe. Einstimmung.', price:'1500 GM' },
      { id:'teppich', name:'Fliegender Teppich', emoji:'🧞', rarity:'Sehr selten', type:'Wundersam', desc:'Fliegt 9m, trägt bis 400 kg. Spricht Befehlswort.', price:'4000 GM' },
      { id:'wuerfel', name:'Würfel der Macht', emoji:'🎲', rarity:'Legendär', type:'Artefakt', desc:'Einmal pro Tag einen Wurf wiederholen. DM-Laune inklusive.', price:'???' },
    ];
    const WIKI = {
      goblin:{t:'Goblin',img:'👺',body:'Kleine Humanoide (HG 1/4, 50 XP). RK 15, TP 7. Meister des Hinterhalts. <b>Schwäche:</b> Sonnenlicht-Empfindlichkeit in manchen Settings.',links:['ork','heiltrank']},
      ork:{t:'Ork',img:'👹',body:'HG 1/2, 100 XP. RK 13, TP 15. Aggressiv: darf sich als Bonusaktion auf Feinde zubewegen.',links:['goblin','langschwert']},
      eulenbaer:{t:'Eulenbär',img:'🦉',body:'HG 3, 700 XP. RK 13, TP 59. Multiangriff Schnabel (1W10+5) + Klauen (2W6+5).',links:['troll','wolf']},
      troll:{t:'Troll',img:'🧌',body:'HG 5, 1800 XP. Regeneriert 10 TP pro Runde. Wird nur durch <b>Feuer</b> oder <b>Säure</b> dauerhaft getötet.',links:['jungdrache','feuerballstab']},
      jungdrache:{t:'Junger Roter Drache',img:'🐲',body:'HG 10, 5900 XP. Feuerodem 16W6 (SG 17 GES). Fliegt 24m. Ideal als Akt-Boss.',links:['beholder','feuerballstab']},
      beholder:{t:'Betrachter',img:'👁️',body:'HG 13, 10000 XP. Antimagie-Kegel + 10 Augenstrahlen (Desintegration, Todesstrahl...).',links:['geist','jungdrache']},
      geist:{t:'Gespenst',img:'👻',body:'HG 4, 1100 XP. Kann besetzen, altert Opfer mit Horror-Blick. Resistenz gegen nicht-magische Waffen.',links:['skelett','bewusstlos']},
      skelett:{t:'Skelett',img:'💀',body:'HG 1/4. Immun gegen Gift & Erschöpfung. Anfällig für Wuchtschaden.',links:['geist','vergiftet']},
      wolf:{t:'Düsterwolf',img:'🐺',body:'HG 1, 200 XP. RK 14, TP 22. Rudeltaktik: <b>Vorteil</b> wenn Verbündeter nah ist. Kann umreißen (SG 13 STR).',links:['goblin','vorteil','liegend']},
      mimik:{t:'Mimik',img:'📦',body:'HG 2, 450 XP. RK 12, TP 58. Tarnt sich als Truhe. Klebt Opfer fest (Entkommen SG 13).',links:['schleim','festgehalten']},
      schleim:{t:'Gallertwürfel',img:'🟩',body:'HG 2, 450 XP. RK 6, TP 84. Fast unsichtbar in Gängen. Verschlingt und betäubt Opfer.',links:['mimik','betaeubt']},
      bandit:{t:'Banditenhauptmann',img:'🥷',body:'HG 2, 450 XP. RK 15, TP 65. Multiangriff + Parieren (+2 RK als Reaktion).',links:['ork','langschwert']},
      langschwert:{t:'Langschwert +1',img:'🗡️',body:'Magische Waffe (selten). +1 auf Angriff & Schaden. 1W8+1 Hieb, versatil 1W10+1.',links:['bogen','angriffswurf']},
      feuerballstab:{t:'Stab des Feuerballs',img:'🔥',body:'7 Ladungen. Feuerball 8W6, SG 15. Regeneriert 1W6+1 bei Morgengrauen.',links:['jungdrache','zaubern']},
      heiltrank:{t:'Heiltrank',img:'🧪',body:'Superior: 8W4+8 TP. Aktion zum Trinken oder Verabreichen.',links:['amulett','lange-rast']},
      amulett:{t:'Amulett der Gesundheit',img:'📿',body:'Setzt KON auf 19 solange getragen. Braucht Einstimmung.',links:['heiltrank','konstitution']},
      ring:{t:'Ring des Schutzes',img:'💍',body:'+1 RK, +1 Rettungswürfe. Einstimmung erforderlich.',links:['umhang','rettungswurf']},
      umhang:{t:'Umhang der Elfen',img:'🧥',body:'Vorteil auf Heimlichkeit. In Schatten fast unsichtbar.',links:['stiefel','heimlichkeit']},
      kettenhemd:{t:'Mithril-Kettenhemd',img:'⛓️',body:'RK 13 + GES (max 2). Kein Nachteil auf Heimlichkeit, keine Stärke-Voraussetzung.',links:['langschwert','ruestungsklasse']},
      bagholding:{t:'Beutel des Haltens',img:'🎒',body:'Hält 250 kg / 2 m³, wiegt außen nur 7 kg. <b>Achtung:</b> Lebewesen ersticken darin.',links:['teppich','wuerfel']},
      bogen:{t:'Schwurbogen (Oathbow)',img:'🏹',body:'Legendär. 1W8+3. Schwurfeind erhält +3W6 Schaden. Einmal pro Tag Schwur.',links:['langschwert','angriffswurf']},
      stiefel:{t:'Stiefel der Geschwindigkeit',img:'🥾',body:'Bonusaktion: Bewegung verdoppelt, Gelegenheitsangriffe gegen dich mit Nachteil.',links:['umhang','gelegenheit']},
      teppich:{t:'Fliegender Teppich',img:'🧞',body:'Fliegt 9 m, trägt bis 400 kg. Folgt per Befehlswort. Sehr selten.',links:['bagholding','initiative']},
      wuerfel:{t:'Würfel der Macht',img:'🎲',body:'Artefakt (legendär). Einmal pro Tag einen Wurf wiederholen. DM-Laune inklusive.',links:['vorteil','bagholding']},
      staerke:{t:'Stärke (STR)',img:'💪',body:'Misst Körperkraft. Mod = (Wert-10)/2. Wichtig für <b>Athletik</b>, Nahkampf und Traglast.',links:['athletik','angriffswurf']},
      geschicklichkeit:{t:'Geschicklichkeit (GES)',img:'🤸',body:'Misst Flinkheit. Wichtig für RK, Initiative, Heimlichkeit und Fernkampf.',links:['initiative','ruestungsklasse']},
      konstitution:{t:'Konstitution (KON)',img:'❤️',body:'Misst Zähigkeit. Bestimmt TP pro Stufe und KON-Rettungswürfe (Konzentration).',links:['trefferpunkte','konzentration']},
      intelligenz:{t:'Intelligenz (INT)',img:'🧠',body:'Misst Wissen. Wichtig für Arkane Kunde, Nachforschungen und Magier-Zaubern.',links:['arkane-kunde','magier']},
      weisheit:{t:'Weisheit (WEI)',img:'🦉',body:'Misst Wahrnehmung und Einsicht. Wichtig für Wahrnehmung, Heilkunde und Kleriker.',links:['wahrnehmung','kleriker']},
      charisma:{t:'Charisma (CHA)',img:'✨',body:'Misst Ausstrahlung. Wichtig für Überzeugen, Auftreten und Hexenmeister / Barden.',links:['ueberzeugen','hexenmeister']},
      akrobatik:{t:'Akrobatik',img:'🤸',body:'GES-Fertigkeit: Balance, Saltos, Stürze abfangen. Nützlich bei Verfolgung und Fallen.',links:['geschicklichkeit','athletik']},
      'arkane-kunde':{t:'Arkane Kunde',img:'🔮',body:'INT-Fertigkeit: Wissen über Magie, Zauber, Ebenen und magische Kreaturen.',links:['intelligenz','zaubern']},
      athletik:{t:'Athletik',img:'🏋️',body:'Stärke-Fertigkeit: Klettern, Schwimmen, Springen, Ringen.',links:['staerke','akrobatik']},
      auftreten:{t:'Auftreten',img:'🎭',body:'CHA-Fertigkeit: Bühnenkunst, Musik, Ablenkung. Beeindruckt Publikum.',links:['charisma','taeuschen']},
      einschuechtern:{t:'Einschüchtern',img:'😠',body:'CHA-Fertigkeit: Drohen, verhören, Gegner zum Rückzug zwingen.',links:['charisma','veraengstigt']},
      fingerfertigkeit:{t:'Fingerfertigkeit',img:'🖐️',body:'GES-Fertigkeit: Schlösser, Fallen, Taschendiebstahl, feine Werkzeuge.',links:['geschicklichkeit','heimlichkeit']},
      geschichte:{t:'Geschichte',img:'📜',body:'INT-Fertigkeit: Wissen über Reiche, Kriege, Legenden und Adelslinien.',links:['intelligenz','religion']},
      heilkunde:{t:'Heilkunde',img:'🌿',body:'WEI-Fertigkeit: Wunden versorgen, Krankheiten erkennen, Verbündete stabilisieren.',links:['weisheit','heiltrank']},
      heimlichkeit:{t:'Heimlichkeit',img:'🥷',body:'GES-Fertigkeit: Leise bewegen, sich verstecken. Gegen passive Wahrnehmung.',links:['geschicklichkeit','umhang']},
      tiere:{t:'Mit Tieren umgehen',img:'🐴',body:'WEI-Fertigkeit: Reittiere beruhigen, Tiere zähmen, Absichten deuten.',links:['weisheit','naturkunde']},
      motiv:{t:'Motiv erkennen',img:'👁️',body:'WEI-Fertigkeit: Lügen durchschauen, Absichten lesen. Gegen Täuschen.',links:['weisheit','taeuschen']},
      nachforschungen:{t:'Nachforschungen',img:'🔍',body:'INT-Fertigkeit: Hinweise suchen, Bibliotheken wälzen, Spuren auswerten.',links:['intelligenz','wahrnehmung']},
      naturkunde:{t:'Naturkunde',img:'🌲',body:'INT-Fertigkeit: Pflanzen, Tiere, Wetter und Wildnis-Wissen. Für Druiden ideal.',links:['intelligenz','druide']},
      religion:{t:'Religion',img:'⛪',body:'INT-Fertigkeit: Götter, Riten, Untote und heilige Symbole erkennen.',links:['intelligenz','kleriker']},
      taeuschen:{t:'Täuschen',img:'🃏',body:'CHA-Fertigkeit: Lügen, Verkleiden, Fälschen. Gegen Motiv erkennen.',links:['charisma','motiv']},
      ueberlebenskunst:{t:'Überlebenskunst',img:'🏕️',body:'WEI-Fertigkeit: Spuren lesen, jagen, Orientierung, Wetter vorhersagen.',links:['weisheit','naturkunde']},
      ueberzeugen:{t:'Überzeugen',img:'💬',body:'CHA-Fertigkeit: Verhandeln, ehrlich überreden, Allianzen schmieden.',links:['charisma','motiv']},
      wahrnehmung:{t:'Wahrnehmung',img:'👀',body:'WEI-Fertigkeit: Wichtigste Fertigkeit. Hinterhalte, Fallen und Geheimtüren entdecken.',links:['weisheit','nachforschungen']},
      blind:{t:'Blind',img:'🙈',body:'Sieht nichts. Angriffe des Blinden mit Nachteil, Angriffe gegen ihn mit <b>Vorteil</b>.',links:['vorteil','taub']},
      bezaubert:{t:'Bezaubert',img:'💘',body:'Kann Bezauberer nicht angreifen. Bezauberer hat Vorteil auf soziale Würfe gegen dich.',links:['veraengstigt','motiv']},
      taub:{t:'Taub',img:'🙉',body:'Hört nichts. Automatischer Fehlschlag bei Würfen, die Gehör erfordern.',links:['blind','wahrnehmung']},
      veraengstigt:{t:'Verängstigt',img:'😱',body:'Nachteil auf Würfe solange Quelle sichtbar. Kann sich nicht freiwillig nähern.',links:['bezaubert','einschuechtern']},
      festgehalten:{t:'Festgehalten',img:'🤼',body:'Tempo 0. Angriffe gegen dich oft mit Vorteil. Entkommen per Athletik.',links:['zurueckgehalten','athletik']},
      handlungsunfaehig:{t:'Handlungsunfähig',img:'🚫',body:'Keine Aktionen und Reaktionen. Oberbegriff für viele harte Zustände.',links:['betaeubt','bewusstlos']},
      unsichtbar:{t:'Unsichtbar',img:'👤',body:'Angriffe mit Vorteil, Angriffe gegen dich mit Nachteil. Braucht Sicht zum Zielen.',links:['heimlichkeit','vorteil']},
      gelaehmt:{t:'Gelähmt',img:'🧊',body:'Handlungsunfähig, kein Move. STR/DEX-Rettung Fehlschlag. Angriffe mit Vorteil, Treffer aus 1,5 m kritisch.',links:['betaeubt','versteinert']},
      versteinert:{t:'Versteinert',img:'🗿',body:'Verwandelt in Stein. Handlungsunfähig, Resistenz gegen alles, immun gegen Gift. Gewicht x10.',links:['gelaehmt','vergiftet']},
      vergiftet:{t:'Vergiftet',img:'🤢',body:'Nachteil auf Angriffs- und Attributswürfe. Gift-Schaden variiert stark.',links:['versteinert','konstitution']},
      liegend:{t:'Liegend',img:'🛌',body:'Nahkampf gegen dich mit Vorteil, Fernkampf mit Nachteil. Aufstehen kostet halbe Bewegung.',links:['bewusstlos','gelegenheit']},
      zurueckgehalten:{t:'Zurückgehalten',img:'🕸️',body:'Tempo 0, Nachteil auf Angriffe und GES-Rettung. Angriffe gegen dich mit Vorteil.',links:['festgehalten','gelaehmt']},
      betaeubt:{t:'Betäubt',img:'💫',body:'Zustand: handlungsunfähig, kein Move, automatischer Fehlschlag bei STR/DEX-Rettung. Angriffe haben Vorteil.',links:['bewusstlos','handlungsunfaehig']},
      bewusstlos:{t:'Bewusstlos',img:'😵',body:'Liegend, handlungsunfähig. Angriffe aus 1,5m sind kritisch bei Treffer.',links:['betaeubt','liegend']},
      erschoepfung:{t:'Erschöpfung',img:'🥵',body:'6 Stufen: von Nachteil bis Tod. Lange Rast heilt 1 Stufe. Gefährlichster Langzeit-Zustand.',links:['lange-rast','vergiftet']},
      vorteil:{t:'Vorteil / Nachteil',img:'🎲',body:'Würfle 2W20, nimm höher (Vorteil) oder niedriger (Nachteil). Stapelt nicht.',links:['betaeubt','unsichtbar']},
      rast:{t:'Rast',img:'⛺',body:'Kurze Rast (1h): Hit Dice zum Heilen. Lange Rast (8h): alles voll, halbe Hit Dice zurück.',links:['heiltrank','kurze-rast']},
      'kurze-rast':{t:'Kurze Rast',img:'🔥',body:'Mind. 1 Stunde. Gib Trefferwürfel aus zum Heilen. Zauberer regeneriert Slots (Arkane Erholung).',links:['rast','lange-rast']},
      'lange-rast':{t:'Lange Rast',img:'🌙',body:'8 Stunden (6 Schlaf). TP voll, halbe Trefferwürfel zurück, 1 Erschöpfung weg. Max 1x pro 24h.',links:['rast','kurze-rast']},
      initiative:{t:'Initiative',img:'⚡',body:'W20 + GES-Mod zu Kampfbeginn. Höchster Wert handelt zuerst. Gleichstand: GES-Vergleich.',links:['geschicklichkeit','gelegenheit']},
      ruestungsklasse:{t:'Rüstungsklasse (RK)',img:'🛡️',body:'Angriff trifft bei Wurf >= RK. Basis 10 + GES + Rüstung + Schild. Höher ist besser.',links:['geschicklichkeit','kettenhemd']},
      trefferpunkte:{t:'Trefferpunkte (TP)',img:'❤️',body:'Bei 0 TP bewusstlos + Todesrettungswürfe (3 Erfolge leben). Heilung und Hit Dice füllen auf.',links:['konstitution','bewusstlos']},
      uebungsbonus:{t:'Übungsbonus',img:'🎖️',body:'+2 (Stufe 1) bis +6 (Stufe 17+). Addiert auf geübte Angriffe, Rettungen und Fertigkeiten.',links:['angriffswurf','rettungswurf']},
      rettungswurf:{t:'Rettungswurf',img:'🎲',body:'W20 + Attributs-Mod (+Übung wenn geübt) gegen SG. Erfolg = halb/kein Schaden.',links:['uebungsbonus','zauber-sg']},
      konzentration:{t:'Konzentration',img:'🧘',body:'Max 1 Konzentrations-Zauber aktiv. Schaden: KON-Rettung SG 10 oder halber Schaden. Endet bei Bewusstlosigkeit.',links:['zaubern','konstitution']},
      gelegenheit:{t:'Gelegenheitsangriff',img:'⚔️',body:'Reaktion: ein Nahkampfangriff wenn Gegner deine Reichweite verlässt. Einmal pro Runde.',links:['initiative','stiefel']},
      schwierigkeit:{t:'Herausforderung (HG)',img:'💀',body:'HG misst Monsterstärke. HG 1/4 = 50 XP, HG 5 = 1800 XP. Passt HG an Gruppenstufe an.',links:['xp','wolf']},
      xp:{t:'Erfahrungspunkte (XP)',img:'⭐',body:'Monster-XP durch Gruppe teilen. Stufenaufstieg nach DM-Tabelle. Kampf-Rechner nutzt adjustierte XP.',links:['schwierigkeit','uebungsbonus']},
      zaubern:{t:'Zaubern',img:'✨',body:'Aktion + Slots verbrauchen. Volle Zauberer kennen viele Zauber, Hexenmeister wenige aber flexible.',links:['zaubergrad','konzentration']},
      zaubergrad:{t:'Zaubergrad',img:'📚',body:'Grad 0 = Zaubertrick (immer). Grad 1-9 braucht Slots. Höher wirken = stärkerer Effekt.',links:['zaubern','zauber-sg']},
      'zauber-sg':{t:'Zauber-SG',img:'🎯',body:'SG = 8 + Übung + Zauberattribut-Mod. Gegner würfelt Rettung dagegen. Steigt mit Stufe.',links:['rettungswurf','zaubergrad']},
      angriffswurf:{t:'Zauberangriff',img:'🔥',body:'W20 + Übung + Zauber-Mod gegen RK. Krit bei 20 (doppelter Schaden). Zaubertricks skalieren.',links:['zauber-sg','uebungsbonus']},
      barbar:{t:'Barbar',img:'🪓',body:'W12 TP. <b>Wut:</b> +Schaden +Resistenz. Ungerüstete Verteidigung, brutale Krits.',links:['kaempfer','staerke']},
      barde:{t:'Barde',img:'🎶',body:'W8 TP. Bardeninspiration (W6+), Vielkönner, volle Zauber (CHA). Meister der Worte.',links:['schurke','charisma']},
      kleriker:{t:'Kleriker',img:'🙏',body:'W8 TP. Göttliche Magie (WEI). Heilt, vertreibt Untote, trägt mittlere Rüstung.',links:['paladin','weisheit']},
      druide:{t:'Druide',img:'🌿',body:'W8 TP. Wildgestalt (Tierform), Naturmagie (WEI). Spricht Druidisch.',links:['waldlaeufer','naturkunde']},
      kaempfer:{t:'Kämpfer',img:'⚔️',body:'W10 TP. Kampfstil, Taktischer Geist, Extra-Angriffe. Vielseitigster Krieger.',links:['barbar','paladin']},
      moench:{t:'Mönch',img:'🥋',body:'W8 TP. Ki-Punkte: Flurry, Stunning Strike, unbewaffnet stark. Hohe Mobilität.',links:['schurke','geschicklichkeit']},
      paladin:{t:'Paladin',img:'🛡️',body:'W10 TP. Göttlicher Schmied (Smite), Aura, Heilung. Eid + CHA-Zauber.',links:['kleriker','kaempfer']},
      waldlaeufer:{t:'Waldläufer',img:'🏹',body:'W10 TP. Lieblingsfeind, Jägerzauber, Wildnis-Experte. Bogen oder zwei Waffen.',links:['druide','ueberlebenskunst']},
      schurke:{t:'Schurke',img:'🗡️',body:'W8 TP. Hinterhältiger Angriff (+Schaden mit Vorteil), Expertise, Gauner-Talente.',links:['barde','heimlichkeit']},
      zauberer:{t:'Zauberer (Sorcerer)',img:'🌟',body:'W6 TP. Angeborene Magie (CHA), Zauberpunkte + Metamagie. Wenige Zauber, flexibel.',links:['magier','hexenmeister']},
      hexenmeister:{t:'Hexenmeister',img:'😈',body:'W8 TP. Paktmagie (CHA, kurze Rast!), Anrufungen, okkulter Patron.',links:['zauberer','kurze-rast']},
      magier:{t:'Magier',img:'🧙',body:'W6 TP. Zauberbuch, Arkane Erholung, größte Zauberliste (INT). Zerbrechlich aber mächtig.',links:['zauberer','intelligenz']},
      zwerg:{t:'Zwerg',img:'⛰️',body:'+2 KON. Gift-Resistenz, Dunkelsicht, Steinspürnase. Langsam aber zäh (7,5 m).',links:['mensch','konstitution']},
      elf:{t:'Elf',img:'🧝',body:'+2 GES. Feensinn (Schlafimmun), Dunkelsicht, 4h-Trance statt Schlaf.',links:['halbelf','geschicklichkeit']},
      gnom:{t:'Gnom',img:'🔧',body:'+2 INT. Gnomenschlauheit (Vorteil INT/WEI/CHA-Rettung vs. Magie). Klein, pfiffig.',links:['halbling','intelligenz']},
      halbelf:{t:'Halbelf',img:'🌗',body:'+2 CHA, +1/+1 frei. Feenblut, 2 freie Fertigkeiten. Charismatisch und vielseitig.',links:['elf','mensch']},
      halbork:{t:'Halbork',img:'👹',body:'+2 STR, +1 KON. Durchhalten (1x bei 0 TP auf 1 TP), brutale Krits. Einschüchternd.',links:['zwerg','staerke']},
      halbling:{t:'Halbling',img:'🍀',body:'+2 GES. Glück: 1en wiederholen. Klein, mutig, schleicht durch Beine.',links:['gnom','geschicklichkeit']},
      mensch:{t:'Mensch',img:'🧑',body:'+1 alle Attribute (Standard). Vielseitig, ehrgeizig, überall zuhause. Beste Wahl für Einsteiger.',links:['halbelf','zwerg']},
      teuflingsblut:{t:'Teuflingsblut (Tiefling)',img:'😈',body:'+2 CHA, +1 INT. Höllenresistenz (Feuer), Thaumaturgie, Dunkelsicht. Dramatisch.',links:['hexenmeister','mensch']},
      drachenkind:{t:'Drachenkind',img:'🐲',body:'+2 STR, +1 CHA. Odemwaffe (Element nach Drache) + Schadensresistenz. Stolz.',links:['halbork','jungdrache']},
    };
    let dmHP = {};
    try { dmHP = JSON.parse(localStorage.getItem('dndDM_HP') || '{}'); } catch(e){ dmHP = {}; }
    function saveDmHP(){ try{ localStorage.setItem('dndDM_HP', JSON.stringify(dmHP)); }catch(e){} }
    function hpOf(id, max){ if(dmHP[id]==null) dmHP[id]=max; return dmHP[id]; }
    function dmgHeal(id, max, delta){
      let cur = hpOf(id, max);
      cur = Math.max(0, Math.min(max, cur + delta));
      dmHP[id]=cur; saveDmHP();
      renderCreatures();
    }

    /* ---- 3D Würfel (korrekte Polyeder-Formen) ---- */
    const DICE_SHAPE = { 4:'d4', 6:'d6', 8:'d8', 10:'d10', 12:'d12', 20:'d20', 100:'d100' };
    const DICE_GLYPH = { 4:'▲', 6:'■', 8:'◆', 10:'⬠', 12:'⬟', 20:'⬢', 100:'%' };
    function buildDiceCube(sides, result){
      const cube = document.getElementById('diceCube');
      if(!cube) return;
      cube.innerHTML='';
      const shape = DICE_SHAPE[sides] || 'd20';
      const d = document.createElement('div');
      d.className = 'dice-shape ' + shape;
      const label = result != null ? result : (sides === 100 ? '00' : sides);
      d.innerHTML = `<span>${label}</span><small>W${sides}</small>`;
      // Dreieck-Formen: Zahl optisch zentrieren
      if (shape === 'd4') d.querySelector('span').style.marginTop = '34px';
      cube.appendChild(d);
    }
    function renderDiceSelect(){
      const box=document.getElementById('diceSelect');
      if(!box) return;
      box.innerHTML='';
      DICE_TYPES.forEach(d=>{
        const b=document.createElement('button');
        b.type='button';
        b.textContent=`${DICE_GLYPH[d]||''} W${d}`;
        if(d===currentDie) b.classList.add('picked');
        else b.classList.add('inactive');
        b.onclick=()=>{ currentDie=d; document.getElementById('diceLabel').textContent='W'+d; buildDiceCube(d, null); threeSetDie(d); renderDiceSelect(); };
        box.appendChild(b);
      });
    }
    function pushDiceLog(text){
      const log=document.getElementById('diceLog');
      if(!log) return;
      if(log.textContent.includes('Noch keine')) log.innerHTML='';
      const div=document.createElement('div');
      div.textContent=text;
      log.prepend(div);
      diceHistory.unshift(text);
    }
    function rollDice3D(){
      const sides=currentDie;
      const count=Math.max(1,Math.min(20,parseInt(document.getElementById('diceCount').value)||1));
      const mod=parseInt(document.getElementById('diceMod').value)||0;
      const rolls=[];
      for(let i=0;i<count;i++) rolls.push(1+Math.floor(Math.random()*sides));
      const sum=rolls.reduce((a,b)=>a+b,0);
      const total=sum+mod;
      if(threeDice&&threeDice.ready) threeDice.pendingResult={sides:sides,value:rolls[0]};
      const cube=document.getElementById('diceCube');
      if(cube){ cube.classList.remove('rolling'); void cube.offsetWidth; cube.classList.add('rolling'); }
      threeRoll();
      setTimeout(()=>{
        document.getElementById('diceResult').textContent=total;
        document.getElementById('diceLabel').textContent='W'+sides+(count>1?` x${count}`:'');
        buildDiceCube(sides, rolls[0]);
        const modStr = mod!==0 ? (mod>0?` + ${mod}`:` - ${Math.abs(mod)}`) : '';
        pushDiceLog(`🎲 ${count}W${sides} [${rolls.join(', ')}]${modStr} = ${total}`);
      }, 450);
    }
    function rollAdvantage(isAdv){
      currentDie=20; renderDiceSelect();
      const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20);
      const win=isAdv?Math.max(a,b):Math.min(a,b);
      if(threeDice&&threeDice.ready) threeDice.pendingResult={sides:20,value:win};
      const cube=document.getElementById('diceCube');
      if(cube){ cube.classList.remove('rolling'); void cube.offsetWidth; cube.classList.add('rolling'); }
      threeRoll();
      setTimeout(()=>{
        document.getElementById('diceResult').textContent=win;
        document.getElementById('diceLabel').textContent=isAdv?'Vorteil':'Nachteil';
        buildDiceCube(20, win);
        pushDiceLog(`${isAdv?'✅ Vorteil':'❌ Nachteil'} [${a}, ${b}] = ${win}`);
      },450);
    }
    function clearDiceLog(){ const l=document.getElementById('diceLog'); if(l) l.innerHTML='<div>Noch keine Würfe.</div>'; }

    /* ---- 3D Würfel-Modelle (three.js, CSS als Offline-Fallback) ---- */
    let threeDice = null;
    let threeLoading = null;
    const THREE_SOURCES = [
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://unpkg.com/three@0.128.0/build/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
    ];
    function loadThreeFrom(src){
      return new Promise((resolve, reject) => {
        if (window.THREE) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('three.js CDN failed'));
        document.head.appendChild(s);
      });
    }
    function ensureThree(){
      if (window.THREE) return Promise.resolve();
      if (!threeLoading) {
        threeLoading = (async () => {
          for (const src of THREE_SOURCES) {
            try { await loadThreeFrom(src); if (window.THREE) return; }
            catch (e) { /* nächstes CDN */ }
          }
          threeLoading = null;
          throw new Error('3D-Engine nicht ladbar');
        })();
      }
      return threeLoading;
    }
    function makeNumberSprite(text, scale){
      const T = window.THREE;
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.font = 'bold 76px Cinzel, Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(245,236,217,0.9)';
      ctx.strokeText(text, 64, 68);
      ctx.fillStyle = '#6b4423';
      ctx.fillText(text, 64, 68);
      const tex = new T.CanvasTexture(cv);
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false }));
      sp.scale.setScalar(scale);
      return sp;
    }
    function addFaceNumbers(parent, geo, labels, numScale, pushOut, die, sub, filterCaps){
      const T = window.THREE;
      const pos = geo.attributes.position;
      const tris = [];
      const va = new T.Vector3(), vb = new T.Vector3(), vc = new T.Vector3();
      const e1 = new T.Vector3(), e2 = new T.Vector3();
      const pushTri = (a, b, c) => {
        va.fromBufferAttribute(pos, a); vb.fromBufferAttribute(pos, b); vc.fromBufferAttribute(pos, c);
        e1.subVectors(vb, va); e2.subVectors(vc, va);
        const n = new T.Vector3().crossVectors(e1, e2);
        if (n.length() < 1e-6) return;
        n.normalize();
        tris.push({ c: new T.Vector3().addVectors(va, vb).add(vc).multiplyScalar(1 / 3), n });
      };
      if (geo.index) {
        const ix = geo.index.array;
        for (let f = 0; f < ix.length; f += 3) pushTri(ix[f], ix[f + 1], ix[f + 2]);
      } else {
        for (let f = 0; f < pos.count; f += 3) pushTri(f, f + 1, f + 2);
      }
      // Dreiecke mit gleicher Normale = eine Fläche (fängt auch Fünfecke des W12 ab)
      const groups = [];
      tris.forEach(t => {
        if (filterCaps && Math.hypot(t.n.x, t.n.z) < 0.3) return; // versteckte Kegel-Böden ignorieren
        let g = null;
        for (const h of groups) { if (h.n.dot(t.n) > 0.998) { g = h; break; } }
        if (!g) { g = { n: t.n.clone(), cs: [] }; groups.push(g); }
        g.cs.push(t.c);
      });
      groups.forEach((g, i) => {
        if (i >= labels.length) return;
        const c = new T.Vector3();
        g.cs.forEach(v => c.add(v));
        c.multiplyScalar(1 / g.cs.length).multiplyScalar(pushOut || 1.05);
        const sp = makeNumberSprite(String(labels[i]), numScale);
        sp.position.copy(c);
        parent.add(sp);
        if (die) {
          die.userData.faces = die.userData.faces || [];
          die.userData.faces.push({ label: String(labels[i]), sub: sub, holder: parent, normal: g.n.clone() });
        }
      });
    }
    function threeBipyramid(T, mat, edge, s, upperLabels, lowerLabels, numScale, sub, die){
      const b = new T.Group();
      const mkCone = (flip, labels, subTag) => {
        const holder = new T.Group();
        const geo = new T.ConeGeometry(1.0, 0.95, 5);
        holder.add(new T.Mesh(geo, mat));
        holder.add(new T.LineSegments(new T.EdgesGeometry(geo, 15), edge));
        addFaceNumbers(holder, geo, labels, numScale, 1.1, die, subTag, true);
        if (flip) holder.rotation.x = Math.PI;
        return holder;
      };
      const up = mkCone(false, upperLabels, sub);
      up.position.y = 0.475;
      const lo = mkCone(true, lowerLabels, sub);
      lo.position.y = -0.475;
      lo.rotation.y = Math.PI / 5;
      b.add(up); b.add(lo);
      b.rotation.y = Math.PI / 5;
      b.scale.setScalar(s);
      return b;
    }
    function threeDieGroup(sides){
      const T = window.THREE;
      const g = new T.Group();
      const mat = new T.MeshStandardMaterial({ color: 0xead9b8, roughness: 0.5, metalness: 0.25, flatShading: true });
      const edge = new T.LineBasicMaterial({ color: 0x8b5a2b });
      const addSolid = (geo, labels, numScale) => {
        const holder = new T.Group();
        holder.add(new T.Mesh(geo, mat));
        holder.add(new T.LineSegments(new T.EdgesGeometry(geo, 15), edge));
        addFaceNumbers(holder, geo, labels, numScale, 1.05, g, undefined, false);
        g.add(holder);
      };
      const seq = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
      if (sides === 4) { addSolid(new T.TetrahedronGeometry(1.55), [1, 2, 3, 4], 0.55); g.rotation.x = 0.35; }
      else if (sides === 6) addSolid(new T.BoxGeometry(1.5, 1.5, 1.5), [1, 6, 2, 5, 3, 4], 0.55);
      else if (sides === 8) addSolid(new T.OctahedronGeometry(1.35), seq(1, 8), 0.5);
      else if (sides === 12) addSolid(new T.DodecahedronGeometry(1.2), seq(1, 12), 0.45);
      else if (sides === 20) addSolid(new T.IcosahedronGeometry(1.25), seq(1, 20), 0.42);
      else if (sides === 100) {
        const l = threeBipyramid(T, mat, edge, 0.78, ['00', '10', '20', '30', '40'], ['50', '60', '70', '80', '90'], 0.5, 'tens', g);
        l.position.x = -0.85;
        const r = threeBipyramid(T, mat, edge, 0.78, ['0', '1', '2', '3', '4'], ['5', '6', '7', '8', '9'], 0.5, 'ones', g);
        r.position.x = 0.85;
        g.add(l); g.add(r);
      }
      else g.add(threeBipyramid(T, mat, edge, 1.15, ['0', '1', '2', '3', '4'], ['5', '6', '7', '8', '9'], 0.5, undefined, g)); // W10
      // Flächen-Normalen in Würfel-Raum auflösen (für Ergebnis-Ausrichtung)
      g.updateMatrixWorld(true);
      const q = new T.Quaternion();
      (g.userData.faces || []).forEach(f => {
        f.holder.getWorldQuaternion(q);
        f.normal.applyQuaternion(q);
        delete f.holder;
      });
      return g;
    }
    function threeSetDie(sides){
      if (!threeDice || !threeDice.ready || !window.THREE) return;
      threeDice.pendingResult = null;
      threeDice.settle = null;
      threeDice.held = false;
      const old = threeDice.die;
      if (old) {
        threeDice.group.remove(old);
        old.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
          }
        });
      }
      const die = threeDieGroup(sides);
      threeDice.die = die;
      threeDice.group.add(die);
    }
    function threeRoll(){
      if (!threeDice || !threeDice.ready) return;
      const d = threeDice;
      d.settle = null;
      d.held = false;
      d.vx = (10 + Math.random() * 8) * (Math.random() < 0.5 ? -1 : 1);
      d.vy = (10 + Math.random() * 8) * (Math.random() < 0.5 ? -1 : 1);
      d.vz = (Math.random() * 6 - 3);
      d.rollT = 0;
    }
    function settleLabel(sides, value){
      if (sides === 10) return value === 10 ? '0' : String(value);
      if (sides === 100) return value >= 100 ? '00' : String(Math.floor(value / 10) * 10).padStart(2, '0');
      return String(value);
    }
    function threeBeginSettle(d){
      const T = window.THREE;
      const pr = d.pendingResult;
      d.pendingResult = null;
      d.vx = d.vy = d.vz = 0;
      let target = null;
      const die = d.die;
      if (pr && die && die.userData.faces) {
        const label = settleLabel(pr.sides, pr.value);
        const wantSub = pr.sides === 100 ? 'tens' : undefined;
        const f = die.userData.faces.find(x => x.label === label && (wantSub === undefined || x.sub === wantSub))
          || die.userData.faces.find(x => x.label === label);
        if (f) {
          const inGroup = f.normal.clone().applyQuaternion(die.quaternion);
          const nW = inGroup.applyQuaternion(d.group.quaternion).normalize();
          const diePos = new T.Vector3();
          die.getWorldPosition(diePos);
          const camDir = d.camera.position.clone().sub(diePos).normalize();
          target = new T.Quaternion().setFromUnitVectors(nW, camDir).multiply(d.group.quaternion.clone());
        }
      }
      if (target) d.settle = { t: 0, q0: d.group.quaternion.clone(), q1: target };
      else d.held = true;
    }
    function threeTick(){
      const d = threeDice;
      if (!d) return;
      requestAnimationFrame(threeTick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - d.last) / 1000 || 0.016);
      d.last = now;
      const speed = Math.hypot(d.vx, d.vy, d.vz);
      if (d.settle) {
        // Ergebnisfläche weich zur Kamera drehen (Animation davor bleibt unangetastet)
        d.settle.t += dt / 0.6;
        const k = 1 - Math.pow(1 - Math.min(1, d.settle.t), 3);
        d.group.quaternion.slerpQuaternions(d.settle.q0, d.settle.q1, k);
        d.group.position.y *= 0.9;
        if (d.settle.t >= 1) {
          d.group.quaternion.copy(d.settle.q1);
          d.settle = null;
          d.held = true;
        }
      } else if (speed > 3.0) {
        d.group.rotation.x += d.vx * dt;
        d.group.rotation.y += d.vy * dt;
        d.group.rotation.z += d.vz * dt;
        const damp = Math.pow(0.1, dt);
        d.vx *= damp; d.vy *= damp; d.vz *= damp;
        d.rollT += dt;
        d.group.position.y = Math.abs(Math.sin(Math.min(1, d.rollT / 1.3) * Math.PI)) * 0.45;
      } else {
        d.vx = d.vy = d.vz = 0;
        if (d.pendingResult) threeBeginSettle(d);
        else if (!d.held) d.group.rotation.y += dt * 0.5;
        d.group.position.y *= 0.9;
      }
      d.renderer.render(d.scene, d.camera);
    }
    function threeInitDice(){
      if (threeDice || !document.getElementById('dice3d')) return;
      ensureThree().then(() => {
        try {
          const T = window.THREE;
          const mount = document.getElementById('dice3d');
          const W = 240, H = 200;
          const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
          renderer.setSize(W, H);
          renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
          mount.appendChild(renderer.domElement);
          const scene = new T.Scene();
          const camera = new T.PerspectiveCamera(38, W / H, 0.1, 100);
          camera.position.set(0, 0.9, 4.8);
          camera.lookAt(0, 0, 0);
          scene.add(new T.AmbientLight(0xfff2dd, 0.8));
          const key = new T.DirectionalLight(0xffffff, 0.85);
          key.position.set(3, 5, 4);
          scene.add(key);
          const rim = new T.DirectionalLight(0xd6a670, 0.45);
          rim.position.set(-4, -2, -3);
          scene.add(rim);
          const group = new T.Group();
          scene.add(group);
          threeDice = { renderer, scene, camera, group, die: null, vx: 0, vy: 0, vz: 0, rollT: 9, last: performance.now(), ready: true };
          threeSetDie(currentDie);
          mount.style.display = 'block';
          const fallback = document.querySelector('#pageDM .dice-scene');
          if (fallback) fallback.style.display = 'none';
          requestAnimationFrame(threeTick);
        } catch (e) { threeDice = null; }
      }).catch(() => { threeDice = null; });
    }

    /* ---- Creator ---- */
    const CREATOR_VOLK = [
      {n:'Mensch',b:'+1 alle Attribute',d:'Vielseitig, ehrgeizig'},
      {n:'Elf',b:'+2 GES',d:'Feensinn, lange Rast 4h'},
      {n:'Zwerg',b:'+2 KON',d:'Gift-Resistenz, Steinspürnase'},
      {n:'Halbling',b:'+2 GES',d:'Glück: 1en wiederholen'},
      {n:'Drachenkind',b:'+2 STR, +1 CHA',d:'Odemwaffe + Resistenz'},
      {n:'Gnom',b:'+2 INT',d:'Gnome Schlauheit'},
      {n:'Halbork',b:'+2 STR, +1 KON',d:'Durchhalten bei 1 TP'},
      {n:'Tiefling',b:'+2 CHA, +1 INT',d:'Höllenresistenz, Thaumaturgie'},
    ];
    const CREATOR_KLASSE = [
      {n:'Kämpfer',b:'W10 TP',d:'Kampfstil, Action Surge'},
      {n:'Magier',b:'W6 TP',d:'Zauberbuch, Arkane Erholung'},
      {n:'Kleriker',b:'W8 TP',d:'Heilung, Göttliche Macht'},
      {n:'Schurke',b:'W8 TP',d:'Sneak Attack, Expertise'},
      {n:'Barbar',b:'W12 TP',d:'Rage, ungerüstete Verteidigung'},
      {n:'Barde',b:'W8 TP',d:'Bardeninspiration, Vielkönner'},
      {n:'Druide',b:'W8 TP',d:'Wild Shape, Naturmagie'},
      {n:'Paladin',b:'W10 TP',d:'Smite, Aura, Heilung'},
      {n:'Waldläufer',b:'W10 TP',d:'Lieblingsfeind, Jäger'},
      {n:'Hexenmeister',b:'W8 TP',d:'Paktmagie, Anrufungen'},
      {n:'Mönch',b:'W8 TP',d:'Ki, Kampfkunst'},
      {n:'Zauberer',b:'W6 TP',d:'Metamagie, Herkunft'},
    ];
    let creatorState = { step:0, volk:'Mensch', klasse:'Kämpfer', attrs:{STR:15,GES:14,KON:13,INT:12,WEI:10,CHA:8}, name:'', hintergrund:'Soldat', gesinnung:'Neutral Gut' };
    const CREATOR_TITLES = ['1 Volk','2 Klasse','3 Attribute','4 Details','5 Fertig'];
    function renderCreator(){
      const dots=document.getElementById('creatorSteps');
      const body=document.getElementById('creatorBody');
      if(!dots||!body) return;
      dots.innerHTML='';
      CREATOR_TITLES.forEach((t,i)=>{
        const d=document.createElement('div');
        d.className='creator-dot'+(i===creatorState.step?' active':'');
        d.textContent=t;
        d.onclick=()=>{ creatorState.step=i; renderCreator(); };
        dots.appendChild(d);
      });
      const s=creatorState;
      if(s.step===0){
        body.innerHTML='<label>Volk wählen</label><div class="pick-grid">'+CREATOR_VOLK.map(v=>`<div class="pick-card ${s.volk===v.n?'selected':''}" onclick="creatorPickVolk('${v.n}')"><b>${v.n}</b><span>${v.b}<br>${v.d}</span></div>`).join('')+'</div>';
      } else if(s.step===1){
        body.innerHTML='<label>Klasse wählen</label><div class="pick-grid">'+CREATOR_KLASSE.map(v=>`<div class="pick-card ${s.klasse===v.n?'selected':''}" onclick="creatorPickKlasse('${v.n}')"><b>${v.n}</b><span>${v.b}<br>${v.d}</span></div>`).join('')+'</div>';
      } else if(s.step===2){
        const rows=Object.keys(s.attrs).map(k=>{
          const m=Math.floor((s.attrs[k]-10)/2);
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-light);"><b style="min-width:40px;font-family:Cinzel,serif;color:var(--accent);">${k}</b><button type="button" class="mini-button" onclick="creatorAttr('${k}',-1)">−</button><span style="min-width:60px;text-align:center;font-weight:bold;">${s.attrs[k]} (${m>=0?'+':''}${m})</span><button type="button" class="mini-button" onclick="creatorAttr('${k}',1)">+</button></div>`;
        }).join('');
        body.innerHTML=`<label>Attribute (Klick +/- oder Würfeln)</label>${rows}<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;"><button type="button" class="mini-button" onclick="creatorRollAttrs()">🎲 4W6 (niedrigster weg)</button><button type="button" class="mini-button" onclick="creatorStandardArray()">Standard-Array</button></div>`;
      } else if(s.step===3){
        body.innerHTML=`<div class="grid2"><div><label>Charaktername</label><input type="text" id="creatorName" value="${s.name}" oninput="creatorState.name=this.value"></div><div><label>Hintergrund</label><input type="text" id="creatorHintergrund" value="${s.hintergrund}" oninput="creatorState.hintergrund=this.value"></div></div><div style="margin-top:8px;"><label>Gesinnung</label><select id="creatorGesinnung" onchange="creatorState.gesinnung=this.value">${['Rechtschaffen Gut','Neutral Gut','Chaotisch Gut','Rechtschaffen Neutral','Neutral','Chaotisch Neutral','Rechtschaffen Böse','Neutral Böse','Chaotisch Böse'].map(g=>`<option ${s.gesinnung===g?'selected':''}>${g}</option>`).join('')}</select></div><p style="font-size:13px;margin-top:8px;">Volk: <b>${s.volk}</b> • Klasse: <b>${s.klasse}</b></p>`;
      } else {
        body.innerHTML=`<h3 style="font-family:Cinzel,serif;color:var(--accent);">Bereit!</h3><p><b>${s.name||'(namenlos)'}</b> – ${s.volk} ${s.klasse} (${s.hintergrund}, ${s.gesinnung})</p><p style="font-size:13px;">STR ${s.attrs.STR} • GES ${s.attrs.GES} • KON ${s.attrs.KON} • INT ${s.attrs.INT} • WEI ${s.attrs.WEI} • CHA ${s.attrs.CHA}</p><p style="font-size:12px;">Klicke „Auf Bogen übernehmen". Mit Checkbox oben wird ein neuer Slot angelegt.</p>`;
      }
    }
    function creatorPickVolk(n){ creatorState.volk=n; renderCreator(); }
    function creatorPickKlasse(n){ creatorState.klasse=n; renderCreator(); }
    function creatorAttr(k,d){ creatorState.attrs[k]=Math.max(3,Math.min(20,creatorState.attrs[k]+d)); renderCreator(); }
    function creatorRollAttrs(){
      const roll=()=>{ const r=[1,2,3,4].map(()=>1+Math.floor(Math.random()*6)).sort((a,b)=>a-b); return r[1]+r[2]+r[3]; };
      ['STR','GES','KON','INT','WEI','CHA'].forEach(k=>creatorState.attrs[k]=roll());
      renderCreator();
    }
    function creatorStandardArray(){ const v=[15,14,13,12,10,8]; ['STR','GES','KON','INT','WEI','CHA'].forEach((k,i)=>creatorState.attrs[k]=v[i]); renderCreator(); }
    function creatorPrev(){ creatorState.step=Math.max(0,creatorState.step-1); renderCreator(); }
    function creatorNext(){ creatorState.step=Math.min(4,creatorState.step+1); renderCreator(); }
    function creatorRandom(){
      creatorState.volk=CREATOR_VOLK[Math.floor(Math.random()*CREATOR_VOLK.length)].n;
      creatorState.klasse=CREATOR_KLASSE[Math.floor(Math.random()*CREATOR_KLASSE.length)].n;
      creatorRollAttrs(); renderCreator();
    }
    function creatorApply(){
      const asNew = document.getElementById('creatorNewSlot')?.checked;
      if(asNew){
        save();
        const id=newSlotId();
        try{ writeSlot(id,{}); }catch(e){ alert('Kein Speicherplatz.'); return; }
        const idx=getSlotIndex(); idx.push({id:id,name:creatorState.name||''}); setSlotIndex(idx); setActiveSlotId(id);
        resetForm(); renderSlotOptions();
      } else if(hasActiveCharacter()){
        if(!window.confirm('Der aktuelle Charakter wird mit den Creator-Daten überschrieben. Fortfahren?')) return;
      }
      const map={STR:'stärke',GES:'geschicklichkeit',KON:'konstitution',INT:'intelligenz',WEI:'weisheit',CHA:'charisma'};
      Object.keys(map).forEach(k=>{ const el=document.getElementById(map[k]); if(el) el.value=creatorState.attrs[k]; });
      const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
      set('charaktername',creatorState.name); set('volk',creatorState.volk); set('klasse',creatorState.klasse); set('hintergrund',creatorState.hintergrund); set('gesinnung',creatorState.gesinnung); set('stufe',1);
      const hd={'Barbar':12,'Kämpfer':10,'Paladin':10,'Waldläufer':10,'Kleriker':8,'Druide':8,'Mönch':8,'Schurke':8,'Barde':8,'Hexenmeister':8,'Magier':6,'Zauberer':6};
      const konMod=Math.floor((creatorState.attrs.KON-10)/2);
      const tp=Math.max(1,(hd[creatorState.klasse]||8)+konMod);
      set('tpmax',tp); set('tpakt',tp);
      updateCalcs(); showPage(1);
      alert('✨ Charakter übernommen!');
    }

    /* ---- Kreaturen & Items ---- */
    function renderCreatures(){
      const box=document.getElementById('creatureList');
      if(!box) return;
      const q=(document.getElementById('creatureSearch')?.value||'').toLowerCase();
      box.innerHTML='';
      CREATURES.filter(c=>(c.name+c.desc).toLowerCase().includes(q)).forEach(c=>{
        const cur=hpOf(c.id,c.hp);
        const pct=Math.round(100*cur/c.hp);
        const card=document.createElement('div');
        card.className='dm-card';
        card.innerHTML=`<h3>${c.emoji} ${c.name}</h3><div class="sub">HG ${c.cr} • ${c.xp} XP • RK ${c.ac} • ${c.speed}</div><div class="stat-row"><span class="dm-chip">STR ${c.str}</span><span class="dm-chip">GES ${c.dex??c.str}</span><span class="dm-chip">TP ${cur}/${c.hp}</span></div><div style="font-size:13px;">${c.desc}<br><i>${c.trait}</i></div><div class="hp-tracker"><button type="button" onclick="dmgHeal('${c.id}',${c.hp},-1)">−1</button><button type="button" onclick="dmgHeal('${c.id}',${c.hp},-5)">−5</button><div class="hp-val">${cur}/${c.hp}</div><button type="button" onclick="dmgHeal('${c.id}',${c.hp},1)">+1</button><button type="button" onclick="dmgHeal('${c.id}',${c.hp},${c.hp})">Reset</button></div><div class="hp-bar"><div style="width:${pct}%"></div></div><div style="display:flex;gap:6px;margin-top:6px;"><button type="button" class="mini-button" onclick="openWiki('${c.id}')">📖 Wiki</button><button type="button" class="mini-button" onclick="addMonsterToEncounter('${c.id}')">⚖️ Zum Kampf</button></div>`;
        box.appendChild(card);
      });
      if(!box.children.length) box.innerHTML='<p>Keine Kreatur gefunden.</p>';
    }
    function renderItems(){
      const box=document.getElementById('itemList');
      if(!box) return;
      const q=(document.getElementById('itemSearch')?.value||'').toLowerCase();
      box.innerHTML='';
      ITEMS.filter(c=>(c.name+c.desc+c.rarity).toLowerCase().includes(q)).forEach(c=>{
        const card=document.createElement('div');
        card.className='dm-card';
        card.innerHTML=`<div class="emoji-big">${c.emoji}</div><h3>${c.name}</h3><div class="sub">${c.type} • ${c.rarity} • ${c.price}</div><div style="font-size:13px;">${c.desc}</div><div style="display:flex;gap:6px;margin-top:8px;"><button type="button" class="mini-button" onclick="openWiki('${c.id}')">📖 Wiki</button><button type="button" class="mini-button" onclick="giveItemToChar('${c.name.replace(/'/g,"")}')">➕ Aufs Inventar</button></div>`;
        box.appendChild(card);
      });
      if(!box.children.length) box.innerHTML='<p>Kein Gegenstand gefunden.</p>';
    }
    function giveItemToChar(name){
      for(let i=0;i<18;i++){
        const el=document.getElementById('inv-name-'+i);
        if(el && !el.value){ el.value=name; const anz=document.getElementById('inv-anz-'+i); if(anz&&!anz.value) anz.value=1; save(); showPage(4); alert('➕ „'+name+'“ ins Inventar gelegt (Zeile '+(i+1)+').'); return; }
      }
      showPage(4); alert('Inventar voll – bitte selbst eintragen: '+name);
    }

    /* ---- Kampfplaner ---- */
    let encounterRows = [{id:'goblin',count:4}];
    const XP_TABLE = {1:[25,50,75,100],2:[50,100,150,200],3:[75,150,225,400],4:[125,250,500,750],5:[250,500,750,1100],6:[300,600,900,1400],7:[350,750,1100,1700],8:[450,900,1400,2100],9:[550,1100,1600,2400],10:[600,1200,1900,2800],11:[800,1600,2400,3600],12:[1000,2000,3000,4500],13:[1100,2200,3400,5100],14:[1250,2500,3800,5700],15:[1400,2800,4300,6400],16:[1600,3200,4800,7200],17:[2000,3900,5900,8800],18:[2100,4200,6300,9500],19:[2400,4900,7300,10900],20:[2800,5700,8500,12700]};
    function loadPartyFromSlots(){
      const box=document.getElementById('partyList');
      if(!box) return;
      box.innerHTML='';
      const idx=getSlotIndex();
      if(!idx.length){ box.innerHTML='<p>Keine Charaktere.</p>'; return; }
      idx.forEach(s=>{
        let d={}; try{ d=JSON.parse(readSlotRaw(s.id)||'{}'); }catch(e){}
        const lvl=Math.max(1,Math.min(20,parseInt(d.stufe)||1));
        const nm=d.charaktername||s.name||'(unbenannt)';
        const row=document.createElement('div');
        row.style.cssText='display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-light);font-size:13px;';
        row.innerHTML=`<input type="checkbox" checked data-plvl="${lvl}" data-pname="${nm.replace(/"/g,'')}"><span style="flex:1;"><b>${nm}</b> – Stufe ${lvl}</span><span class="dm-chip">TP ${d.tpmax||'?'}</span>`;
        box.appendChild(row);
      });
    }
    function addEncounterRow(presetId){
      encounterRows.push({id:presetId||'goblin',count:1});
      renderEncounterRows();
    }
    function renderEncounterRows(){
      const box=document.getElementById('encounterList');
      if(!box) return;
      box.innerHTML='';
      encounterRows.forEach((r,i)=>{
        const div=document.createElement('div');
        div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;';
        const opts=CREATURES.map(c=>`<option value="${c.id}" ${c.id===r.id?'selected':''}>${c.emoji} ${c.name} (HG ${c.cr})</option>`).join('');
        div.innerHTML=`<select data-eidx="${i}" class="enc-mon" style="flex:1;">${opts}</select><div class="count-stepper"><button type="button" onclick="encCount(${i},-1)">−</button><span id="enc-count-${i}">${r.count}x</span><button type="button" onclick="encCount(${i},1)">+</button></div><button type="button" class="mini-button" onclick="encRemove(${i})">✕</button>`;
        box.appendChild(div);
      });
      box.querySelectorAll('.enc-mon').forEach(sel=>{
        sel.onchange=(e)=>{ encounterRows[parseInt(e.target.dataset.eidx)].id=e.target.value; };
      });
    }
    function encCount(i,d){ encounterRows[i].count=Math.max(1,Math.min(30,encounterRows[i].count+d)); renderEncounterRows(); }
    function encRemove(i){ encounterRows.splice(i,1); if(!encounterRows.length) encounterRows.push({id:'goblin',count:1}); renderEncounterRows(); }
    function addMonsterToEncounter(id){ encounterRows.push({id:id,count:1}); showPage('DM'); renderEncounterRows(); setTimeout(()=>document.getElementById('dmFight')?.scrollIntoView({behavior:'smooth'}), 80); }
    function analyzeEncounter(){
      const partyChecks=[...document.querySelectorAll('#partyList input[type=checkbox]:checked')];
      const res=document.getElementById('encounterResult');
      const verdict=document.getElementById('encounterVerdict');
      if(!partyChecks.length){ res.textContent='Bitte mindestens einen Charakter in der Gruppe anhaken.'; return; }
      const lvls=partyChecks.map(c=>parseInt(c.dataset.plvl)||1);
      const n=lvls.length;
      let easy=0,med=0,hard=0,dead=0;
      lvls.forEach(l=>{ const t=XP_TABLE[Math.min(20,Math.max(1,l))]; easy+=t[0]; med+=t[1]; hard+=t[2]; dead+=t[3]; });
      let totalXP=0, count=0;
      encounterRows.forEach(r=>{ const c=CREATURES.find(x=>x.id===r.id); if(c){ totalXP+=c.xp*r.count; count+=r.count; } });
      const mult = count<=1?1:count===2?1.5:count<=6?2:count<=10?2.5:count<=14?3:4;
      const adj=totalXP*mult;
      let diff='Trivial', color='var(--accent)', advice='Lockere Übung. Gegner erhöhen oder Überraschung einbauen.';
      if(adj>=dead){ diff='TÖDLICH ☠️'; color='#a02c2c'; advice='Sehr gefährlich! Ein Charakter könnte sterben. Heilung, Fluchtweg oder Verbündete einplanen.'; }
      else if(adj>=hard){ diff='Schwer ⚔️'; color='#b06a1e'; advice='Fordernd aber schaffbar. Gruppe sollte voll ausgeruht sein & Taktik nutzen.'; }
      else if(adj>=med){ diff='Mittel 🛡️'; color='#5c7a3a'; advice='Gute Standard-Herausforderung. Ressourcen werden verbraucht.'; }
      else if(adj>=easy){ diff='Leicht 🌿'; color='#5c7a3a'; advice='Zum Aufwärmen. Passt für erschöpfte Gruppen.'; }
      const avgLvl=(lvls.reduce((a,b)=>a+b,0)/n).toFixed(1);
      res.innerHTML=`Gruppe: <b>${n} Charaktere, Ø Stufe ${avgLvl}</b><br>Monster-XP: <b>${totalXP}</b> × Multiplikator ${mult} (Anzahl ${count}) = <b>${adj} adj. XP</b><br>Schwellen: Leicht ${easy} / Mittel ${med} / Schwer ${hard} / Tödlich ${dead}`;
      verdict.style.display='block';
      verdict.style.borderColor=color;
      verdict.style.color=color;
      verdict.textContent=`${diff} – ${advice}`;
    }

    /* ---- Wiki ---- */
    function wikiEntry(key){ return WIKI[key] || null; }
    function renderWikiList(){
      const box=document.getElementById('wikiList');
      if(!box) return;
      const q=(document.getElementById('wikiSearch')?.value||'').toLowerCase();
      box.innerHTML='';
      Object.keys(WIKI).filter(k=>(WIKI[k].t+WIKI[k].body).toLowerCase().includes(q)).forEach(k=>{
        const e=WIKI[k];
        const d=document.createElement('div');
        d.className='skill-item';
        d.innerHTML=`<div style="font-size:20px;margin-right:8px;">${e.img}</div><div class="skill-name"><b>${e.t}</b></div>`;
        d.onclick=()=>showWikiArticle(k);
        box.appendChild(d);
      });
    }
    function wikiHtml(key){
      const e=wikiEntry(key);
      if(!e) return '<p>Kein Artikel gefunden.</p>';
      const links=(e.links||[]).map(l=>WIKI[l]?`<span class="wiki-link" onclick="openWiki('${l}')">${WIKI[l].img} ${WIKI[l].t}</span>`:'').join(' • ');
      // Kreatur/Item-Extras
      const c=CREATURES.find(x=>x.id===key);
      const it=ITEMS.find(x=>x.id===key);
      let extra='';
      if(c) extra=`<div class="stat-row"><span class="dm-chip">HG ${c.cr}</span><span class="dm-chip">${c.xp} XP</span><span class="dm-chip">RK ${c.ac}</span><span class="dm-chip">TP ${c.hp}</span></div>`;
      if(it) extra=`<div class="sub">${it.type} • ${it.rarity} • ${it.price}</div>`;
      return `<h2>${e.img} ${e.t}</h2>${extra}<p style="font-size:14px;line-height:1.5;">${e.body}</p>${links?`<p style="font-size:12px;margin-top:8px;">Siehe auch: ${links}</p>`:''}`;
    }
    function showWikiArticle(key){
      const a=document.getElementById('wikiArticle');
      if(a) a.innerHTML=wikiHtml(key);
    }
    function openWiki(key){
      const t=document.getElementById('wikiPopupTitle');
      const b=document.getElementById('wikiPopupBody');
      const o=document.getElementById('wikiOverlay');
      const e=wikiEntry(key);
      if(!e){
        // Fallback: Kreatur/Item ohne Wiki-Eintrag generisch zeigen
        const c=CREATURES.find(x=>x.id===key);
        const it=ITEMS.find(x=>x.id===key);
        if(t) t.textContent=(c?c.name:it?it.name:key).toUpperCase();
        if(b) b.innerHTML=c?`<h2>${c.emoji} ${c.name}</h2><p>${c.desc} ${c.trait}</p>`:it?`<h2>${it.emoji} ${it.name}</h2><p>${it.desc}</p>`:'<p>Kein Artikel.</p>';
      } else {
        if(t) t.textContent='📖 '+e.t.toUpperCase();
        if(b) b.innerHTML=wikiHtml(key);
      }
      if(o) o.classList.add('active');
    }
    function closeWiki(){ document.getElementById('wikiOverlay')?.classList.remove('active'); }

    function initDM(){
      if(!dmInitDone){
        dmInitDone=true;
        renderDiceSelect(); buildDiceCube(20,null);
        renderCreator(); renderCreatures(); renderItems();
        loadPartyFromSlots(); renderEncounterRows(); renderWikiList();
        showWikiArticle('goblin');
        threeInitDice();
      }
    }
