/* Oberfläche und Spielabläufe */
(function () {
  "use strict";
  const E = Engine, VERBEN = VERB_DATEN.verben, L = E.LINIEN, FOLGE = E.LINIEN_FOLGE;
  const GRAMMATIK = VERB_DATEN.grammatik || [];
  /* Wie viel vom Bestand gezeigt wird: 1 nur Formenträger, 2 dazu der Übungsvorrat, 3 alles */
  const UMFANG = [
    { w: 1, name: "Nur Pflichtverben", text: "Die Verben, an denen die Konjugationsmuster hängen." },
    { w: 2, name: "Pflicht und Vorrat", text: "Dazu die häufigen Verben mit Standardmuster." },
    { w: 3, name: "Alle Verben", text: "Auch die thematischen Einzelwörter." }
  ];
  const SCHLUESSEL = "conjugaison.v1";
  const app = document.getElementById("app");

  /* Jedes Spiel ist eine Fahrt: Jede Frage ist eine Station */
  const SPIELE = [
    { id: "quiz", name: "Linienfahrt", probe: "nous ___ (finir)", text: "An jeder Station wartet eine Verbform. Wähle die richtige.", zeiten: true, opt: true, ziel: 15 },
    { id: "partizip", name: "Endstation Partizip", probe: "prendre → ?", text: "Finde das richtige Participe passé.", opt: true, ziel: 15 },
    { id: "aux", name: "Umsteigen", probe: "partir: être", text: "Über welches Hilfsverb geht es ins Passé composé?", ziel: 15 },
    { id: "reihe", name: "Strecke bauen", probe: "je, tu, il, nous …", text: "Tippe die Formen in der richtigen Reihenfolge an, Station für Station.", zeiten: true, ziel: 5 },
    { id: "linie", name: "Welche Linie?", probe: "choisir: Linie -iss", text: "Auf welche Linie gehört dieses Verb?", ziel: 15 },
    { id: "bedeutung", name: "Durchsage", probe: "attendre = ?", text: "Was heißt das? Französisch und Deutsch zuordnen.", opt: true, ziel: 15 },
    { id: "memory", name: "Fundbüro", probe: "lire = lesen", text: "Finde die Paare: Verb und Bedeutung oder Partizip.", memory: true, ziel: 1 }
  ];
  /* Die vier Verben, über die alle Linien in andere Zeiten umsteigen */
  const UMSTEIGEN = [
    { inf: "être", thema: "passe_compose_etre", zone: "Passé composé", satz: "Von hier geht es ins Passé composé der Bewegungsverben: je suis allé(e)." },
    { inf: "avoir", thema: "passe_compose_avoir", zone: "Passé composé", satz: "Von hier geht es ins Passé composé der meisten Verben: j'ai parlé." },
    { inf: "aller", thema: "futur_compose", zone: "Futur composé", satz: "Von hier geht es ins Futur composé: je vais parler." },
    { inf: "venir", thema: "passe_recent", zone: "Passé récent", satz: "Von hier geht es ins Passé récent: je viens de parler." }
  ];
  const PLAN_FOLGE = ["er", "ir", "irr", "irk", "dre"];
  const NAME = "Métroverbe";

  const LINIEN_TEXT = {
    er: { text: "Ungefähr 90 % aller französischen Verben enden auf -er. Wer dieses Muster kann, kann die allermeisten Verben.", endungen: E.END.er, ex: "parl", pp: "parler → parlé", extra: "Besonderheiten: nous mangeons, nous commençons, j'achète, je préfère, j'appelle, je paie." },
    ir: { text: "Diese Verben enden auf -ir und bekommen im Plural -iss-.", endungen: E.END.ir, ex: "fin", pp: "finir → fini", extra: "Erkennungszeichen: nous finissons, vous choisissez, ils réussissent." },
    irk: { text: "Sie enden auch auf -ir, aber ohne -iss-. Im Singular fällt der letzte Stammbuchstabe weg: dor-s, aber dorm-ons.", endungen: ["s", "s", "t", "ons", "ez", "ent"], ex: "par(t)", pp: "partir → parti", extra: "partir und sortir bilden das Passé composé mit être, dormir mit avoir." },
    dre: { text: "Der Stamm bleibt immer gleich. Bei il, elle und on kommt keine Endung dazu.", endungen: E.END.re, ex: "attend", pp: "attendre → attendu", extra: "Vorsicht: prendre sieht ähnlich aus, ist aber unregelmäßig." },
    irr: { text: "Das sind wenige Verben, aber du brauchst sie ständig. Die Formen lernst du auswendig, viele Verben gehören zu kleinen Familien.", extra: "Familien: prendre, comprendre, apprendre. Dazu venir, revenir, devenir." }
  };

  function neu() {
    return {
      stats: {}, km: 0, serie: 0, letzter: null, rekord: {},
      stand: { an: {}, band: null, lektion: null, umfang: 2 },
      setup: { uhr: false, zeiten: ["pres"], linien: FOLGE.slice(), n: 4, memory: "de" }
    };
  }
  function laden() {
    const s = neu();
    try {
      const roh = localStorage.getItem(SCHLUESSEL);
      if (roh) {
        const d = JSON.parse(roh);
        Object.assign(s, d);
        s.setup = Object.assign(neu().setup, d.setup);
        s.stand = Object.assign(neu().stand, d.stand);
      }
    } catch (e) { /* Ohne Speicher läuft die App trotzdem */ }
    return s;
  }
  function sichern() { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(S)); } catch (e) { /* siehe oben */ } }

  let S = laden();
  const TABS = { netz: "Netzplan", fahrten: "Fahrten", fahrplan: "Fahrplan", fahrkarte: "Fahrkarte" };
  const a = { neu: { jahr: null, unite: null }, einzeln: false, tab: "netz", setup: null, linie: null, verb: null, decke: false, offen: new Set(), filter: "alle", gross: false, spalten: new Set(), bestaetige: false };
  let spiel = null, uhr = null, wartet = null;

  const h = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const person = (t) => `<span class="p${/j'$/.test(t) ? " elid" : ""}">${h(t)}</span>`;
  const finde = (inf) => VERBEN.find((v) => v.inf === inf);
  const rang = (b, l) => b * 100 + l;
  const jetzt = () => rang(S.stand.band, S.stand.lektion || 99);
  /* Ist das Verb bis zum gewählten Lernstand schon eingeführt? Was danach kommt, taucht nirgends auf. */
  const bisStand = (v) => !S.stand.band || !v.jahr || rang(v.jahr, v.unite || 0) <= jetzt();
  function aktiv(v) {
    if (!bisStand(v)) return false;
    if (S.stand.an[v.inf] !== undefined) return S.stand.an[v.inf];
    return !(v.prio && v.prio > (S.stand.umfang || 3));
  }
  /* Welches Grammatikthema eine Zeit freischaltet */
  const ZEIT_ID = {
    pc: "passe_compose_avoir", imp: "imperativ", impf: "imparfait", pqp: "plus_que_parfait", fc: "futur_compose",
    fs: "futur_simple", cond: "conditionnel_present", subj: "subjonctif_present", pr: "passe_recent", prog: "present_progressif"
  };
  const thema = (id) => GRAMMATIK.find((x) => x.id === id);
  function themaDa(id) {
    if (!S.stand.band) return true;
    const g = thema(id);
    return !!g && rang(g.jahr, g.unite) <= jetzt();
  }
  /* Steht ein Thema zuerst nur im Zusatzabschnitt, gilt es erst ab der verpflichtenden Stelle als Pflicht */
  function themaPflicht(id) {
    const g = thema(id);
    if (!g) return false;
    return !S.stand.band || (g.vollJahr ? rang(g.vollJahr, g.vollUnite) : rang(g.jahr, g.unite)) <= jetzt();
  }
  /* Spiele, die ein bestimmtes Grammatikthema brauchen */
  const BRAUCHT = { partizip: "passe_compose_avoir", aux: "passe_compose_etre" };
  function spaeter(g) {
    const id = BRAUCHT[g.id];
    if (!id || themaDa(id)) return null;
    const gr = thema(id);
    return gr ? `Kommt im ${gr.jahr}. Lernjahr, Unité ${gr.unite}.` : "Kommt später.";
  }
  /* Zeiten, die der Lernstand hergibt, darunter auch solche aus Zusatzabschnitten */
  const zeitenErlaubt = () => Object.keys(E.ZEITEN).filter((z) => z === "pres" || themaDa(ZEIT_ID[z]));
  /* Vorgewählt ist das Pflichtprogramm, Zusatzabschnitte und Randthemen wählt man selbst dazu */
  const zeitenStandard = () => zeitenErlaubt().filter((z) => z === "pres" || (themaPflicht(ZEIT_ID[z]) && thema(ZEIT_ID[z]).prio === 1));
  /* Dieselbe Frage für ein einzelnes Verb: reflexive und être-Verben kommen teils später */
  function zeitenFuer(v) {
    const erlaubt = zeitenErlaubt();
    return E.zeitenVon(v).filter((z) => {
      if (!erlaubt.includes(z)) return false;
      if (z === "pc") return v.reflexiv ? themaDa("passe_compose_reflexiv") : E.konj(v).aux === "être" ? themaDa("passe_compose_etre") : true;
      if (z === "imp" && v.reflexiv) return themaDa("imperativ_reflexiv");
      return true;
    });
  }
  function fortschritt(v) {
    const alle = zeitenFuer(v), standard = zeitenStandard();
    const zaehlen = alle.filter((z) => standard.includes(z));
    return E.stufe(v, S.stats, zaehlen.length ? zaehlen : alle);
  }
  const linienDa = () => FOLGE.filter((l) => aktive().some((v) => v.typ === l));
  /* Nach jeder Änderung des Lernstands fängt die Auswahl neu an */
  function standNeu() {
    S.stand.an = {};
    S.setup.zeiten = zeitenStandard();
    S.setup.linien = FOLGE.slice();
    a.filter = "alle";
    sichern();
  }
  const zone = (z) => Object.keys(E.ZEITEN).indexOf(z) + 1;
  const memoryArt = () => (S.setup.memory === "pp" && themaDa("passe_compose_avoir") ? "pp" : "de");
  const aktive = () => VERBEN.filter(aktiv);
  function heute(d) { const x = d || new Date(); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  function serieZaehlen() {
    const h1 = heute();
    if (S.letzter === h1) return;
    const g = new Date(); g.setDate(g.getDate() - 1);
    S.serie = S.letzter === heute(g) ? S.serie + 1 : 1;
    S.letzter = h1;
  }

  /* ---------- Darstellung ---------- */
  function zeige() {
    if (!S.stand.band) { app.innerHTML = seiteErsterStart(); return; }
    if (spiel) { app.innerHTML = spiel.fertig ? seiteErgebnis() : seiteSpiel(); return; }
    if (a.setup) { app.innerHTML = seiteSetup() + tabs(); return; }
    let inhalt;
    if (a.verb) inhalt = seiteVerb();
    else if (a.linie) inhalt = seiteLinie();
    else inhalt = { netz: seiteNetz, fahrten: seiteFahrten, fahrplan: seiteFahrplan, fahrkarte: seiteFahrkarte }[a.tab]();
    app.innerHTML = `<main class="seite">${inhalt}</main>` + tabs();
  }
  /* Einmalig beim ersten Start: Lernjahr und Unité festlegen, danach richtet sich alles danach */
  function vorschau(jahr, unite) {
    const alt = [S.stand.band, S.stand.lektion];
    S.stand.band = jahr; S.stand.lektion = unite;
    const verben = aktive();
    const r = { n: verben.length, zeiten: zeitenStandard().map((z) => E.ZEITEN[z]), refl: verben.some((v) => v.reflexiv) };
    [S.stand.band, S.stand.lektion] = alt;
    return r;
  }
  function seiteErsterStart() {
    const { jahr, unite } = a.neu;
    const aufbau = VERB_DATEN.aufbau || [];
    const zahl = (aufbau.find((x) => x.jahr === jahr) || { unites: 0 }).unites;
    const unites = Array.from({ length: zahl }, (_, i) => i + 1);
    const vs = jahr && unite ? vorschau(jahr, unite) : null;
    return `<main class="seite erster">
      <div class="marke"><span>${NAME}</span><img src="icons/symbol.svg" alt=""></div>
      <header class="spalte"><h1>Wo steigst du ein?</h1>
      <p>Stell das einmal ein. Dann zeigt dein Netz nur die Verben und Zeiten, die ihr schon hattet.</p></header>
      <section class="feld"><span class="lbl">Dein Lernjahr</span><div class="chips">${aufbau.map((x) =>
        `<button class="chip" data-a="neuJahr" data-w="${x.jahr}" aria-pressed="${jahr === x.jahr}">${x.jahr}. Lernjahr</button>`).join("")}</div></section>
      ${jahr ? `<section class="feld"><span class="lbl">Bei welcher Unité seid ihr?</span><div class="chips">${unites.map((u) =>
        `<button class="chip" data-a="neuUnite" data-w="${u}" aria-pressed="${unite === u}">Unité ${u}</button>`).join("")}</div></section>` : ""}
      ${vs ? `<section class="ticket"><div class="ticket-kopf"><span>Fahrkarte</span><span>${NAME}</span></div>
        <b class="ticket-gross">${jahr}. Lernjahr, Unité ${unite} von ${zahl}</b>
        <span>${vs.n} Verben${vs.refl ? ", auch reflexive" : ""}</span>
        <span class="leise">Zonen: ${h(vs.zeiten.join(", "))}</span></section>
      <button class="knopf" data-a="neuFertig">Fahrkarte lösen</button>
      <p class="hinweis">Du kannst das später unter „Fahrkarte“ ändern.</p>` : ""}
    </main>`;
  }
  function tabs() {
    return `<nav class="tabs">${Object.entries(TABS).map(([k, t]) =>
      `<button data-a="tab" data-w="${k}" ${a.tab === k && !a.linie && !a.verb && !a.setup ? 'aria-current="page"' : ""}>${t}</button>`).join("")}</nav>`;
  }
  const sitzt = () => aktive().filter((v) => fortschritt(v) === 3).length;

  /* Der Netzplan: Alle Linien laufen über dieselbe Strecke durch die vier Umsteigebahnhöfe und fächern davor und danach auf */
  function punktAuf(p, t) {
    const laengen = p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1]));
    let rest = laengen.reduce((x, y) => x + y, 0) * t;
    for (let i = 0; i < laengen.length; i++) {
      if (rest <= laengen[i] || i === laengen.length - 1) {
        const f = laengen[i] ? rest / laengen[i] : 0;
        return [p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f];
      }
      rest -= laengen[i];
    }
    return p[0];
  }
  function netzplan() {
    const linien = PLAN_FOLGE.filter((l) => linienDa().includes(l));
    const hubs = UMSTEIGEN.filter((u) => { const v = finde(u.inf); return v && aktiv(v); });
    const n = linien.length, MITTE = 180, WEIT = 66, ENG = 12, ABSTAND = 58, SPITZE = 58;
    const weit = (i) => MITTE + (i - (n - 1) / 2) * WEIT, eng = (i) => MITTE + (i - (n - 1) / 2) * ENG;
    const arm = Math.max(Math.abs(weit(0) - eng(0)), 76);
    const yA = SPITZE + arm, yE = yA + Math.max(hubs.length, 1) * ABSTAND, ende = yE + arm;
    const halb = ((n - 1) / 2) * ENG + 14;
    const zug = (x) => x.toFixed(1);
    const strecken = linien.map((l, i) => {
      const xw = weit(i), xe = eng(i), dx = Math.abs(xw - xe);
      const oben = [[xw, SPITZE], [xw, yA - dx], [xe, yA]], unten = [[xe, yE], [xw, yE + dx], [xw, ende]];
      const vs = VERBEN.filter((v) => v.typ === l && aktiv(v));
      const gut = vs.filter((v) => fortschritt(v) === 3).length;
      const plaetze = Math.min(vs.length, 12), teil = Math.ceil(plaetze / 2);
      const voll = gut ? Math.max(1, Math.floor((plaetze * gut) / vs.length)) : 0;
      const punkte = [];
      for (let k = 0; k < plaetze; k++) {
        const imOben = k < teil, zahl = imOben ? teil : plaetze - teil, nr = imOben ? k : k - teil;
        const t = imOben ? 0.1 + (0.7 * (nr + 0.5)) / zahl : 0.2 + (0.7 * (nr + 0.5)) / zahl;
        const [x, y] = punktAuf(imOben ? oben : unten, t);
        punkte.push(`<circle cx="${zug(x)}" cy="${zug(y)}" r="3.3" class="${k < voll ? "pl-voll" : "pl-leer"}"/>`);
      }
      const fertig = vs.length && gut === vs.length;
      return `<g data-l="${l}" data-a="linie" data-w="${l}" role="button" tabindex="0" aria-label="${h(L[l].name)}, ${gut} von ${vs.length} sitzen">
        <rect x="${xw - 31}" y="0" width="62" height="${yA - arm + arm * 0.7}" fill="transparent"/>
        <rect x="${xw - 31}" y="${yE + arm * 0.3}" width="62" height="${arm * 0.7 + 44}" fill="transparent"/>
        <path d="M${xw} ${SPITZE} V${yA - dx} L${xe} ${yA} V${yE} L${xw} ${yE + dx} V${ende}" class="pl-linie"/>
        ${punkte.join("")}
        <rect x="${xw - 24}" y="8" width="48" height="32" rx="9" class="pl-marke"/>
        <text x="${xw}" y="31" class="pl-kurz">${h(L[l].kurz)}</text>
        <circle cx="${xw}" cy="${ende}" r="9" class="${fertig ? "pl-ende voll" : "pl-ende"}"/>
        <text x="${xw}" y="${ende + 27}" class="pl-zahl">${gut}/${vs.length}</text>
      </g>`;
    }).join("");
    const bahnhoefe = hubs.map((u, i) => {
      const y = yA + (i + 0.5) * ABSTAND, offen = themaDa(u.thema);
      return `<g data-a="verb" data-w="${h(u.inf)}" role="button" tabindex="0" aria-label="Umsteigebahnhof ${h(u.inf)}">
        <rect x="0" y="${y - 27}" width="360" height="54" fill="transparent"/>
        <rect x="${MITTE - halb}" y="${y - 15}" width="${halb * 2}" height="30" rx="15" class="pl-hub"/>
        <text x="${MITTE - halb - 10}" y="${y + 7}" class="pl-name">${h(u.inf)}</text>
        ${offen ? `<text x="${MITTE + halb + 10}" y="${y + 5}" class="pl-ziel">${h(u.zone)}</text>` : ""}
      </g>`;
    }).join("");
    return `<svg viewBox="0 0 360 ${ende + 38}" class="plansvg" role="group" aria-label="Netzplan">${strecken}${bahnhoefe}</svg>`;
  }
  function seiteNetz() {
    const n = aktive();
    const wackelt = n.filter((v) => { const s = fortschritt(v); return s === 1 || s === 2; }).length;
    const sub = wackelt ? `${wackelt} Verben brauchen noch Übung. Sie kommen jetzt öfter dran.` : `${n.length} Verben liegen auf deinem Netz.`;
    return `
      <header class="kopf">
        <div class="marke"><span>${NAME}</span><img src="icons/symbol.svg" alt=""></div>
        <div class="zahlen">
          <div><b>${S.km}</b><span>km gefahren</span></div>
          <div><b>${S.serie}</b><span>Tage in Folge</span></div>
          <div><b>${sitzt()}/${n.length}</b><span>Verben sitzen</span></div>
        </div>
      </header>
      <section class="los">
        <div class="spalte"><h2>Einsteigen</h2><p>${sub}</p></div>
        <div class="reihe">
          <button data-a="schnell" data-w="ruhe">In Ruhe</button>
          <button data-a="schnell" data-w="uhr">Express · 60 s</button>
        </div>
      </section>
      <section class="plan">${netzplan()}</section>
      <p class="hinweis mitte">Tippe auf eine Linie oder einen Umsteigebahnhof.</p>`;
  }
  function seiteFahrten() {
    return `
      <header class="spalte"><h1>Fahrten</h1>
      <p class="leise">Jede Frage ist eine Station. In Ruhe oder als Express in 60 Sekunden.</p></header>
      <div class="spiele">${SPIELE.map((s) => { const spt = spaeter(s); return `
        <button class="spiel" data-a="setup" data-w="${s.id}" ${spt ? "disabled" : ""}>
          <span class="probe">${h(s.probe)}</span><h3>${h(s.name)}</h3><p>${h(spt || s.text)}</p>
        </button>`; }).join("")}</div>`;
  }
  function seiteLinie() {
    const l = a.linie, t = LINIEN_TEXT[l], vs = VERBEN.filter((v) => v.typ === l && aktiv(v));
    let tabelle = "";
    if (t.endungen) {
      tabelle = `<div class="scroll" data-l="${l}"><table><thead><tr><th>Person</th><th>Endung</th><th>Beispiel</th></tr></thead><tbody>
        ${E.tabelle(finde(L[l].beispiel)).pres.map((z, p) => `<tr><td>${h(z.person)}</td><td class="end">${t.endungen[p] ? "-" + h(t.endungen[p]) : "keine"}</td><td>${h(z.voll)}</td></tr>`).join("")}
      </tbody></table></div>${themaDa("passe_compose_avoir") ? `<p><b>Participe passé:</b> ${h(t.pp)}</p>` : ""}`;
    }
    return `
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="schild" data-l="${l}"><span class="rund">${h(L[l].kurz)}</span><div><h1>${h(L[l].name)}</h1></div></header>
      <p>${h(t.text)}</p>
      ${tabelle}
      <p class="merke">${h(t.extra)}</p>
      <button class="knopf" data-a="linieSpielen" data-w="${l}">Diese Linie fahren</button>
      <section class="spalte"><h2>Stationen</h2>${verbliste(vs, true)}</section>`;
  }
  function verbliste(vs, schiene) {
    return `<div class="verbliste${schiene ? " schiene" : ""}">${vs.map((v) => `
      <button class="verbzeile" data-a="verb" data-w="${h(v.inf)}" data-l="${v.typ}">
        <i class="punkt s${fortschritt(v)}"></i><b>${h(v.inf)}</b><span class="de">${h(v.de)}</span>
      </button>`).join("")}</div>`;
  }
  function seiteFahrplan() {
    const vs = aktive().filter((v) => a.filter === "alle" || v.typ === a.filter);
    const filter = `<div class="chips">
      <button class="chip" data-a="filter" data-w="alle" aria-pressed="${a.filter === "alle"}">Alle</button>
      ${linienDa().map((l) => `<button class="chip" data-l="${l}" data-a="filter" data-w="${l}" aria-pressed="${a.filter === l}">${h(L[l].name)}</button>`).join("")}
    </div>`;
    const art = `<div class="chips">
      <button class="chip" data-a="gross" data-w="0" aria-pressed="${!a.gross}">Verbliste</button>
      <button class="chip" data-a="gross" data-w="1" aria-pressed="${a.gross}">Große Tafel</button>
    </div>`;
    return `
      <header class="spalte"><h1>Fahrplan</h1>
      <p class="leise">Schau nach oder decke Formen ab und frag dich selbst.</p></header>
      <div class="spalte">${art}${filter}</div>
      <button class="knopf zwei" data-a="zufall" ${vs.length ? "" : "disabled"}>Zufällige Station abfragen</button>
      ${a.gross ? grosseTabelle(vs) : verbliste(vs)}`;
  }
  const SPALTEN = [["de", "Bedeutung"], ["je", "je"], ["nous", "nous"], ["ils", "ils/elles"], ["pp", "Partizip"], ["aux", "Hilfsverb"]];
  const spaltenDa = () => SPALTEN.filter(([s]) => (s !== "pp" && s !== "aux") || themaDa("passe_compose_avoir"));
  function grosseTabelle(vs) {
    const wert = (v, s) => { const k = E.konj(v); return { de: v.de, je: E.mitSubj("je", k.pres[0]), nous: "nous " + k.pres[3], ils: "ils " + k.pres[5], pp: k.pp, aux: k.aux }[s]; };
    const zelle = (v, s) => {
      const id = v.inf + "|" + s, zu = a.spalten.has(s) && !a.offen.has(id);
      if (a.spalten.has(s)) return `<td><button class="${zu ? "deck" : ""}" data-a="auf" data-w="${h(id)}" ${zu ? 'aria-label="Aufdecken"' : ""}>${zu ? "aufdecken" : h(wert(v, s))}</button></td>`;
      return `<td>${h(wert(v, s))}</td>`;
    };
    return `<div class="feld"><span class="lbl">Spalten abdecken</span><div class="chips">
      ${spaltenDa().map(([s, t]) => `<button class="chip" data-a="spalte" data-w="${s}" aria-pressed="${a.spalten.has(s)}">${h(t)}</button>`).join("")}
    </div></div>
    <div class="scroll"><table><thead><tr><th>Infinitiv</th>${spaltenDa().map(([, t]) => `<th>${h(t)}</th>`).join("")}</tr></thead><tbody>
      ${vs.map((v) => `<tr data-l="${v.typ}"><td><button data-a="verb" data-w="${h(v.inf)}"><b>${h(v.inf)}</b></button></td>${spaltenDa().map(([s]) => zelle(v, s)).join("")}</tr>`).join("")}
    </tbody></table></div>`;
  }
  const zonenkopf = (z) => `<span class="zone">${zone(z)}</span> ${h(E.ZEITEN[z])}`;
  function seiteVerb() {
    const v = finde(a.verb), t = E.tabelle(v), k = E.konj(v), zeiten = zeitenFuer(v);
    const hub = UMSTEIGEN.find((u) => u.inf === v.inf && themaDa(u.thema));
    const block = (z) => {
      if (!t[z]) return `<section class="formblock"><h3>${zonenkopf(z)}</h3><p class="leise">Dieses Verb hat keinen Imperativ.</p></section>`;
      return `<section class="formblock"><h3>${zonenkopf(z)}</h3><div class="formen${z === "subj" ? " que" : ""}">
        ${t[z].map((r, i) => {
          const id = z + i, zu = a.decke && !a.offen.has(id);
          if (a.decke) return `<button class="form" data-a="auf" data-w="${id}">${person(r.person)}${zu ? '<span class="deck">verdeckt</span>' : `<span>${h(r.form)}</span>`}</button>`;
          return `<div class="form">${person(r.person)}<span>${h(r.form)}</span></div>`;
        }).join("")}
      </div>${a.decke ? `<div class="selbst"><button class="ja" data-a="selbst" data-w="${z}|1">Konnte ich</button><button class="nein" data-a="selbst" data-w="${z}|0">Noch üben</button></div>` : ""}</section>`;
    };
    return `
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="schild" data-l="${v.typ}"><span class="rund">${h(L[v.typ].kurz)}</span><div><h1>${h(v.inf)}</h1><p>${h(v.de)}</p></div></header>
      <p class="leise klein">${h(L[v.typ].name)}${zeiten.includes("pc") ? ` · Passé composé mit ${h(k.aux)}` : ""}</p>
      ${hub ? `<p class="merke"><b>Umsteigebahnhof.</b> ${h(hub.satz)}</p>` : ""}
      <div class="chips">
        <button class="chip" data-a="decke" data-w="0" aria-pressed="${!a.decke}">Formen zeigen</button>
        <button class="chip" data-a="decke" data-w="1" aria-pressed="${a.decke}">Abdecken und abfragen</button>
      </div>
      <div class="drei">${zeiten.concat(zeitenErlaubt().includes("imp") && !k.imp ? ["imp"] : []).map(block).join("")}</div>
      ${v.tipp ? `<p class="merke">${h(v.tipp)}</p>` : ""}`;
  }
  function seiteFahrkarte() {
    const n = aktive().length;
    const aufbau = VERB_DATEN.aufbau || [];
    const zahl = (aufbau.find((x) => x.jahr === S.stand.band) || { unites: 0 }).unites;
    const bisher = VERBEN.filter(bisStand);
    const u = S.stand.umfang || 3;
    const zahlFuer = (w) => bisher.filter((v) => (v.prio || 1) <= w).length;
    const gueltig = `${S.stand.band}. Lernjahr${S.stand.lektion ? `, Unité ${S.stand.lektion} von ${zahl}` : ""}`;
    const stempel = linienDa().map((l) => {
      const vs = aktive().filter((v) => v.typ === l), gut = vs.filter((v) => fortschritt(v) === 3).length;
      return `<div class="stempel${vs.length && gut === vs.length ? " voll" : ""}" data-l="${l}"><span class="rund">${h(L[l].kurz)}</span><small>${gut}/${vs.length}</small></div>`;
    }).join("");
    const einzeln = FOLGE.map((l) => {
      const vs = bisher.filter((v) => v.typ === l);
      if (!vs.length) return "";
      const an = vs.filter(aktiv).length;
      return `<section class="spalte" data-l="${l}">
        <div class="zwischen"><div class="linie-kopf"><span class="rund mini">${h(L[l].kurz)}</span><h3>${h(L[l].name)}</h3></div>
        <button class="chip" data-a="alleLinie" data-w="${l}">${an === vs.length ? "Keine" : "Alle"}</button></div>
        <div class="waehl">${vs.map((v) => `<button class="chip" data-l="${l}" data-a="waehl" data-w="${h(v.inf)}" aria-pressed="${aktiv(v)}">${h(v.inf)}</button>`).join("")}</div>
      </section>`;
    }).join("");
    return `
      <section class="ticket"><div class="ticket-kopf"><span>Fahrkarte</span><span>${NAME}</span></div>
        <span class="leise klein">Gültig bis</span>
        <b class="ticket-gross">${gueltig}</b>
        <span>${n} von ${bisher.length} Verben auf deinem Netz</span>
        <span class="leise">Zonen: ${h(zeitenErlaubt().map((z) => E.ZEITEN[z]).join(", "))}</span>
      </section>
      <section class="feld"><span class="lbl">Wo stehst du gerade?</span><div class="reihe">
        <label for="band" hidden>Lernjahr</label><select id="band" data-c="band">${aufbau.map((x) => `<option value="${x.jahr}" ${S.stand.band === x.jahr ? "selected" : ""}>${x.jahr}. Lernjahr</option>`).join("")}</select>
        <label for="lektion" hidden>Unité</label><select id="lektion" data-c="lektion"><option value="">Ganzes Lernjahr</option>${Array.from({ length: zahl }, (_, i) => i + 1).map((l) => `<option value="${l}" ${S.stand.lektion === l ? "selected" : ""}>Unité ${l}</option>`).join("")}</select>
      </div></section>
      <section class="spalte"><h2>Deine Stempel</h2>
        <div class="stempelreihe">${stempel}</div>
        <p class="hinweis">Sitzt eine ganze Linie, bekommst du ihren Stempel.</p></section>
      <section class="feld"><span class="lbl">Wie groß soll dein Netz sein?</span><div class="chips">${UMFANG.map((o) =>
        `<button class="chip" data-a="umfang" data-w="${o.w}" aria-pressed="${u === o.w}">${o.name} (${zahlFuer(o.w)})</button>`).join("")}</div>
        <p class="hinweis">${h((UMFANG.find((o) => o.w === u) || UMFANG[2]).text)}</p></section>
      <section class="spalte"><button class="knopf zwei" data-a="einzeln">${a.einzeln ? "Einzelne Verben ausblenden" : "Einzelne Verben an- und abwählen"}</button>
        ${a.einzeln ? einzeln : ""}</section>
      <section class="spalte"><h2>Fortschritt</h2>
        ${a.bestaetige
          ? `<p>Dein Fortschritt und deine Rekorde werden gelöscht. Das lässt sich nicht rückgängig machen.</p><div class="knoepfe"><button class="knopf warn" data-a="loeschen">Ja, löschen</button><button class="knopf zwei" data-a="abbruch">Behalten</button></div>`
          : `<button class="knopf zwei" data-a="frage-loeschen">Fortschritt zurücksetzen</button>`}
        <p class="hinweis">Dein Fortschritt wird nur auf diesem Gerät gespeichert.</p>
      </section>`;
  }
  function seiteSetup() {
    const g = SPIELE.find((s) => s.id === a.setup), s = S.setup, rek = S.rekord[g.id];
    const pool = poolFuer(g);
    const genug = pool.length >= minimum(g);
    return `<main class="seite">
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="spalte"><h1>${h(g.name)}</h1><p>${h(g.text)}</p>${rek ? `<p class="leise klein">Dein Express-Rekord: ${rek} Punkte</p>` : ""}</header>
      <div class="feld"><span class="lbl">Tempo</span><div class="chips">
        <button class="chip" data-a="uhr" data-w="0" aria-pressed="${!s.uhr}">In Ruhe</button>
        <button class="chip" data-a="uhr" data-w="1" aria-pressed="${s.uhr}">Express · 60 s</button>
      </div></div>
      ${g.zeiten ? `<div class="feld"><span class="lbl">Zonen</span><div class="chips">${zeitenErlaubt().map((z) => [z, E.ZEITEN[z]]).map(([z, t]) =>
        `<button class="chip" data-a="zeit" data-w="${z}" aria-pressed="${s.zeiten.includes(z)}"><span class="zone">${zone(z)}</span>${t}</button>`).join("")}</div>${
        zeitenErlaubt().length > zeitenStandard().length ? `<p class="hinweis">Zonen aus Zusatzteilen und Randthemen sind nicht vorgewählt. Tippe sie an, wenn du sie üben willst.</p>` : ""}</div>` : ""}
      <div class="feld"><span class="lbl">Linien</span><div class="chips">${linienDa().map((l) =>
        `<button class="chip" data-l="${l}" data-a="lin" data-w="${l}" aria-pressed="${s.linien.includes(l)}">${h(L[l].name)}</button>`).join("")}</div></div>
      ${g.opt ? `<div class="feld"><span class="lbl">Antwortmöglichkeiten</span><div class="chips">${[4, 5, 6].map((n) =>
        `<button class="chip" data-a="n" data-w="${n}" aria-pressed="${s.n === n}">${n}</button>`).join("")}</div></div>` : ""}
      ${g.memory && themaDa("passe_compose_avoir") ? `<div class="feld"><span class="lbl">Paare</span><div class="chips">
        <button class="chip" data-a="mem" data-w="de" aria-pressed="${memoryArt() === "de"}">Verb und Bedeutung</button>
        <button class="chip" data-a="mem" data-w="pp" aria-pressed="${memoryArt() === "pp"}">Verb und Partizip</button></div></div>` : ""}
      <button class="knopf" data-a="start" ${genug ? "" : "disabled"}>Einsteigen · ${pool.length} Verben</button>
      ${genug ? "" : spaeter(g)
        ? `<p class="hinweis">Dieses Spiel braucht das Passé composé. ${h(spaeter(g))}</p>`
        : `<p class="hinweis">Dafür brauchst du mindestens ${minimum(g)} Verben. Wähle mehr Linien, einen größeren Umfang oder ergänze Verben unter „Fahrkarte“.</p>`}
    </main>`;
  }

  /* ---------- Spielablauf ---------- */
  const minimum = (g) => (g.memory ? 6 : g.opt || g.id === "linie" ? 6 : 1);
  function poolFuer(g) {
    const zeiten = S.setup.zeiten;
    return aktive().filter((v) => {
      if (!E.uebbar(v) || !S.setup.linien.includes(v.typ)) return false;   /* il y a, il faut, neiger: nur eine Form */
      const frei = zeitenFuer(v);
      if (g.id === "aux") return !v.reflexiv && frei.includes("pc") && themaDa("passe_compose_etre");
      if (g.id === "partizip" || (g.memory && memoryArt() === "pp")) return frei.includes("pc");
      if (g.id === "bedeutung" || g.memory || g.id === "linie") return true;
      return zeiten.some((z) => frei.includes(z));
    });
  }
  /* Zeit für die nächste Frage und die Verben, die sie schon können */
  function zeitUndFeld(s) {
    const moeglich = s.zeiten.filter((z) => s.pool.some((v) => zeitenFuer(v).includes(z)));
    const z = E.eins(moeglich);
    return { z, feld: s.pool.filter((v) => zeitenFuer(v).includes(z)) };
  }
  function start(id) {
    const g = SPIELE.find((s) => s.id === id);
    const pool = poolFuer(g);
    if (pool.length < minimum(g)) { a.setup = id; zeige(); return; }
    halt();
    spiel = { g, id, uhr: S.setup.uhr, pool, n: S.setup.n, zeiten: S.setup.zeiten.slice(), punkte: 0, combo: 0, ok: 0, nein: 0, zahl: 0, falsch: new Map(), gesehen: new Map(), frage: null, wahl: null, letztes: null, ende: 0, km0: S.km, fertig: false, zuletzt: null, spur: [] };
    if (spiel.uhr) {
      spiel.ende = Date.now() + 60000;
      uhr = setInterval(tick, 200);
    }
    if (id === "reihe") neueReihe();
    else if (id === "memory") neuesBrett();
    else neueFrage();
    zeige();
  }
  function halt() { clearInterval(uhr); clearTimeout(wartet); uhr = null; wartet = null; }
  function tick() {
    if (!spiel || spiel.fertig) return;
    const rest = spiel.ende - Date.now();
    if (rest <= 0) { beende(); return; }
    const g = document.querySelector(".gleis"), t = document.getElementById("zeit");
    if (g) { g.firstChild.style.width = (100 - rest / 600) + "%"; g.classList.toggle("knapp", rest < 10000); }
    if (t) t.textContent = Math.ceil(rest / 1000);
  }
  function neueFrage() {
    const s = spiel;
    s.wahl = null;
    const bonus = (s.id === "quiz" || s.id === "partizip") && s.zahl > 0 && s.zahl % 5 === 0;
    let q;
    if (bonus || s.id === "bedeutung") {
      const v = E.waehle(s.pool, (x) => x.inf + "|de", S.stats, s.letztes);
      q = E.frageBedeutung(v, s.pool.length >= 6 ? s.pool : aktive(), s.n);
      q.bonus = bonus;
    } else if (s.id === "quiz") {
      const { z, feld } = zeitUndFeld(s);
      const v = E.waehle(feld, (x) => x.inf + "|" + z, S.stats, s.letztes);
      q = E.frageForm(v, z, s.n);
    } else if (s.id === "partizip") {
      q = E.fragePartizip(E.waehle(s.pool, (x) => x.inf + "|pc", S.stats, s.letztes), s.n);
    } else if (s.id === "aux") {
      const etre = s.pool.filter((v) => E.konj(v).aux === "être");
      const feld = etre.length && Math.random() < 0.4 ? etre : s.pool;
      q = E.frageHilfsverb(E.waehle(feld, (x) => x.inf + "|pc", S.stats, s.letztes));
    } else {
      const linien = FOLGE.filter((l) => s.pool.some((v) => v.typ === l));
      q = E.frageLinie(E.waehle(s.pool, (x) => x.inf + "|typ", S.stats, s.letztes), linien.length >= 2 ? linien : FOLGE);
    }
    s.frage = q; s.letztes = q.v.inf;
  }
  function verbuche(richtig, v) {
    const s = spiel;
    if (richtig) {
      s.ok++; s.combo++; S.km++;
      s.punkte += 10 * Math.min(1 + Math.floor(s.combo / 3), 4);
      serieZaehlen();
    } else {
      s.nein++; s.combo = 0;
      s.falsch.set(v.inf, v);
    }
    s.gesehen.set(v.inf, v);
    s.spur.push({ l: v.typ, ok: richtig });
  }
  function antworte(i) {
    const s = spiel, q = s.frage;
    if (!q || s.wahl !== null) return;
    const o = q.optionen[i];
    if (!o) return;
    const richtig = o.wert === q.antwort;
    s.wahl = i; s.zahl++;
    verbuche(richtig, q.v);
    E.buche(S.stats, q.schluessel, richtig);
    s.zuletzt = { richtig, q };
    sichern();
    zeige();
    if (s.uhr) wartet = setTimeout(weiter, richtig ? 350 : 1100);
  }
  function weiter() {
    const s = spiel;
    if (!s || s.fertig) return;
    if (!s.uhr && s.zahl >= s.g.ziel) { beende(); return; }
    neueFrage();
    zeige();
  }
  function beende() {
    const s = spiel;
    halt();
    s.fertig = true;
    if (s.uhr) {
      s.neuerRekord = s.punkte > (S.rekord[s.id] || 0);
      if (s.neuerRekord) S.rekord[s.id] = s.punkte;
    }
    sichern();
    zeige();
  }

  function neueReihe() {
    const s = spiel;
    const { z, feld } = zeitUndFeld(s);
    const v = E.waehle(feld, (x) => x.inf + "|" + z, S.stats, s.letztes);
    const zeilen = E.tabelle(v)[z];
    s.letztes = v.inf;
    s.r = { v, z, zeilen, pos: 0, fehler: false, blasen: E.misch(zeilen.map((r) => ({ t: r.form, weg: false }))), wackel: -1 };
  }
  function blase(i) {
    const s = spiel, r = s.r, b = r.blasen[i];
    if (!b || b.weg || r.fertig) return;
    if (b.t === r.zeilen[r.pos].form) {
      b.weg = true; r.pos++; r.wackel = -1;
      if (r.pos === r.zeilen.length) {
        s.zahl++;
        verbuche(!r.fehler, r.v);
        E.buche(S.stats, r.v.inf + "|" + r.z, !r.fehler);
        s.zuletzt = { richtig: !r.fehler, q: { voll: r.v.inf, v: r.v, erklaerung: "" } };
        sichern();
        r.fertig = true;
        zeige();
        wartet = setTimeout(() => {
          if (!spiel || spiel.fertig) return;
          if (!s.uhr && s.zahl >= s.g.ziel) { beende(); return; }
          neueReihe(); zeige();
        }, 750);
        return;
      }
    } else {
      r.fehler = true; r.wackel = i; s.combo = 0; s.nein++; s.falsch.set(r.v.inf, r.v);
    }
    zeige();
  }

  function neuesBrett() {
    const s = spiel;
    const art = memoryArt();
    const wert = (v) => (art === "de" ? v.de : E.konj(v).pp);
    const verben = [], schon = new Set();
    for (const v of E.misch(s.pool)) {
      if (schon.has(wert(v))) continue;
      schon.add(wert(v)); verben.push(v);
      if (verben.length === 6) break;
    }
    s.m = {
      karten: E.misch(verben.flatMap((v) => [{ t: v.inf, v, paar: v.inf }, { t: wert(v), v, paar: v.inf }]).map((k) => Object.assign(k, { offen: false, weg: false }))),
      gewaehlt: [], gesperrt: false, rest: verben.length, fehlerFuer: new Set()
    };
  }
  function karte(i) {
    const s = spiel, m = s.m, k = m.karten[i];
    if (!k || m.gesperrt || k.offen || k.weg) return;
    k.offen = true; m.gewaehlt.push(k);
    if (m.gewaehlt.length < 2) { zeige(); return; }
    const [x, y] = m.gewaehlt;
    if (x.paar === y.paar) {
      x.weg = y.weg = true; m.gewaehlt = []; m.rest--; s.zahl++;
      verbuche(true, x.v);
      s.zuletzt = { richtig: true, q: { voll: x.v.inf + " = " + (memoryArt() === "de" ? x.v.de : E.konj(x.v).pp), v: x.v, erklaerung: "" } };
      sichern();
      zeige();
      if (m.rest === 0) wartet = setTimeout(() => {
        if (!spiel || spiel.fertig) return;
        if (!s.uhr) { beende(); return; }
        neuesBrett(); zeige();
      }, 500);
    } else {
      m.gesperrt = true; s.combo = 0; s.nein++;
      zeige();
      wartet = setTimeout(() => {
        if (!spiel || spiel.fertig) return;
        x.offen = y.offen = false; m.gewaehlt = []; m.gesperrt = false; zeige();
      }, 950);
    }
  }

  /* Oben läuft die Strecke mit: Jede beantwortete Frage färbt eine Station in der Farbe ihrer Linie */
  function leiste() {
    const s = spiel;
    let strecke, zaehler;
    if (s.uhr) {
      const r = Math.max(0, s.ende - Date.now());
      strecke = `<div class="gleis${r < 10000 ? " knapp" : ""}"><i style="width:${100 - r / 600}%"></i></div>`;
      zaehler = `<span id="zeit" class="stand">${Math.ceil(r / 1000)}</span>`;
    } else {
      const ziel = s.id === "memory" ? 6 : s.g.ziel;
      const wartend = s.id === "memory" || s.id === "reihe" || s.wahl === null;
      const stops = Array.from({ length: ziel }, (_, i) => {
        const x = s.spur[i];
        if (x) return `<li class="halt ${x.ok ? "ok" : "nein"}" data-l="${x.l}"></li>`;
        return `<li class="halt${i === s.spur.length && wartend ? " jetzt" : ""}"></li>`;
      }).join("");
      strecke = `<ol class="strecke" aria-hidden="true">${stops}</ol>`;
      zaehler = `<span class="stand">${Math.min(s.spur.length + (wartend ? 1 : 0), ziel)}/${ziel}</span>`;
    }
    const ohneHalt = s.combo >= 3 ? `${s.combo} Stationen ohne Halt` : "";
    return `<div class="leiste"><button class="x" data-a="abbrechen" aria-label="Aussteigen">✕</button>${strecke}${zaehler}</div>
      <div class="combo">${s.uhr ? `${s.punkte} Punkte${ohneHalt ? " · " + ohneHalt : ""}` : ohneHalt}</div>`;
  }
  function seiteSpiel() {
    const s = spiel;
    const inhalt = s.id === "reihe" ? spielReihe() : s.id === "memory" ? spielMemory() : spielFrage();
    return `<div class="spielseite"><div class="spielinnen">${leiste()}${inhalt}</div></div>`;
  }
  function kopfFrage(q, offen) {
    if (q.art === "form") {
      const luecke = offen ? `<span class="luecke leer">&nbsp;</span>` : `<span class="luecke neu">${h(q.antwort)}</span>`;
      const subj = q.zeit === "imp" ? "" : `${h(q.subj)}${/'$/.test(q.subj) ? "" : " "}`;
      const zusatz = q.zeit === "imp" ? `Sag es zu: <b>${h(q.subj)}</b> · ` : q.hinweis ? `(${h(q.hinweis)}) · ` : "";
      return `<div class="kicker">Zone ${zone(q.zeit)} · ${E.ZEITEN[q.zeit]}</div><div class="satz">${subj}${luecke}${q.zeit === "imp" && !offen ? " !" : ""}</div><div class="inf">${zusatz}<b>${h(q.v.inf)}</b></div>`;
    }
    if (q.art === "partizip") return `<div class="kicker">Participe passé von</div><div class="satz">${h(q.v.inf)}</div>`;
    if (q.art === "aux") return `<div class="kicker">Ins Passé composé über …</div><div class="satz">${h(q.v.inf)}</div>`;
    if (q.art === "linie") return `<div class="kicker">Auf welcher Linie liegt</div><div class="satz">${h(q.v.inf)}</div>`;
    return `<div class="kicker">${q.bonus ? "Durchsage: " : ""}${q.umgekehrt ? "Wie heißt auf Französisch" : "Was heißt"}</div><div class="satz">${h(q.umgekehrt ? q.v.de : q.v.inf)}</div>`;
  }
  function spielFrage() {
    const s = spiel, q = s.frage, offen = s.wahl === null;
    const breit = q.optionen.some((o) => o.text.length > 18) || q.art === "linie";
    const ops = q.optionen.map((o, i) => {
      let k = "";
      if (!offen) { if (o.wert === q.antwort) k = " richtig"; else if (i === s.wahl) k = " falsch"; }
      return `<button class="op${k}" data-a="op" data-w="${i}" ${o.linie ? `data-l="${o.linie}"` : ""} ${offen ? "" : "disabled"}>${h(o.text)}</button>`;
    }).join("");
    let rueck = `<div class="rueck ruhe"></div>`;
    if (!offen) {
      const z = s.zuletzt, bed = q.art === "bedeutung" ? "" : `<span>${h(q.v.inf)} = ${h(q.v.de)}</span>`;
      if (z.richtig) rueck = `<div class="rueck gut"><b>${s.uhr ? h(q.voll) : "Richtig: " + h(q.voll)}</b>${bed}</div>`;
      else rueck = `<div class="rueck schlecht"><b>Richtig wäre: ${h(q.voll)}</b>${q.erklaerung ? `<span>${h(q.erklaerung)}</span>` : ""}${bed}</div>`;
    }
    return `<section class="frage" ${q.art === "linie" ? "" : `data-l="${q.v.typ}"`}>${q.art === "linie" ? "" : `<span class="rund mini">${h(L[q.v.typ].kurz)}</span>`}${kopfFrage(q, offen)}</section>
      <div class="optionen${breit ? " breit" : ""}">${ops}</div>
      ${rueck}
      ${!offen && !s.uhr ? `<button class="knopf weiter" data-a="weiter">${s.zahl >= s.g.ziel ? "Zum Terminus" : "Nächste Station"}</button>` : ""}`;
  }
  function spielReihe() {
    const r = spiel.r;
    const zeilen = r.zeilen.map((z, i) => `<div class="z${i === r.pos ? " dran" : i < r.pos ? " ab" : ""}">${person(z.person)}<span>${i < r.pos ? h(z.form) : ""}</span></div>`).join("");
    const blasen = r.blasen.map((b, i) => `<button class="blase${r.wackel === i ? " wackel" : ""}" data-a="blase" data-w="${i}" ${b.weg ? "disabled" : ""}>${h(b.t)}</button>`).join("");
    return `<section class="frage" data-l="${r.v.typ}"><span class="rund mini">${h(L[r.v.typ].kurz)}</span><div class="kicker">Zone ${zone(r.z)} · ${E.ZEITEN[r.z]}</div><div class="satz">${h(r.v.inf)}</div><div class="inf">${r.fertig ? h(r.v.de) : "&nbsp;"}</div></section>
      <div class="zeilen${r.z === "subj" ? " que" : ""}" data-l="${r.v.typ}">${zeilen}</div><div class="blasen">${blasen}</div>`;
  }
  function spielMemory() {
    const s = spiel, m = s.m;
    const karten = m.karten.map((k, i) => {
      const k1 = k.weg ? "weg" : k.offen ? "offen" : "";
      return `<button class="karte ${k1}" data-a="karte" data-w="${i}" aria-label="${k.offen || k.weg ? h(k.t) : "Verdeckte Karte"}">${k.offen || k.weg ? h(k.t) : ""}</button>`;
    }).join("");
    const z = s.zuletzt;
    return `<div class="karten">${karten}</div><div class="rueck ${z ? "gut" : "ruhe"}">${z ? `<b>${h(z.q.voll)}</b>` : `<span class="leise">Decke zwei Fahrkarten auf, die zusammengehören.</span>`}</div>`;
  }
  function seiteErgebnis() {
    const s = spiel, summe = s.ok + s.nein;
    const anteil = summe ? Math.round((s.ok / summe) * 100) : 0;
    const memoryRuhig = s.id === "memory" && !s.uhr;
    const titel = s.uhr ? (s.neuerRekord ? "Neuer Rekord !" : "Express am Ziel") : memoryRuhig ? "Alles gefunden !" : anteil >= 90 ? "Excellent !" : anteil >= 70 ? "Très bien !" : anteil >= 50 ? "Pas mal !" : "On continue !";
    const falsch = Array.from(s.falsch.values());
    const neu = Array.from(s.gesehen.values()).filter((v) => !s.falsch.has(v.inf)).slice(0, 8);
    const liste = (vs) => `<div class="verbliste">${vs.map((v) => `<button class="verbzeile" data-a="spielVerb" data-w="${h(v.inf)}" data-l="${v.typ}"><i class="punkt s${fortschritt(v)}"></i><b>${h(v.inf)}</b><span class="de">${h(v.de)}</span></button>`).join("")}</div>`;
    return `<div class="spielseite"><div class="spielinnen">
      <section class="ergebnis">
        <div class="kicker">Terminus</div>
        <h1>${titel}</h1>
        <div class="gross">${s.uhr ? s.punkte : memoryRuhig ? summe : anteil + " %"}</div>
        <p class="leise">${s.uhr ? "Punkte" : memoryRuhig ? "Züge für 6 Paare" : `${s.ok} richtig, ${s.nein} falsch`} · ${S.km - s.km0} km gefahren${s.uhr && S.rekord[s.id] ? ` · Rekord ${S.rekord[s.id]}` : ""}</p>
      </section>
      <div class="knoepfe"><button class="knopf" data-a="nochmal">Nochmal fahren</button><button class="knopf zwei" data-a="abbrechen">Aussteigen</button></div>
      ${falsch.length ? `<section class="spalte"><h2>Diese Verben nochmal anfahren</h2>${liste(falsch)}</section>` : ""}
      ${neu.length ? `<section class="spalte"><h2>Unterwegs gehalten</h2>${liste(neu)}</section>` : ""}
    </div></div>`;
  }

  /* ---------- Aktionen ---------- */
  function umschalten(liste, wert) {
    const i = liste.indexOf(wert);
    if (i >= 0) liste.splice(i, 1); else liste.push(wert);
  }
  function oeffneVerb(inf) { a.verb = inf; a.decke = false; a.offen = new Set(); }
  const AKT = {
    tab(w) { a.tab = w; a.setup = a.linie = a.verb = null; a.bestaetige = false; try { history.replaceState(null, "", "#" + w); } catch (e) {} window.scrollTo(0, 0); },
    setup(w) { a.setup = w; window.scrollTo(0, 0); },
    linie(w) { a.linie = w; window.scrollTo(0, 0); },
    verb(w) { oeffneVerb(w); window.scrollTo(0, 0); },
    zurueck() { if (a.verb) a.verb = null; else if (a.linie) a.linie = null; else a.setup = null; },
    schnell(w) { S.setup.uhr = w === "uhr"; start("quiz"); },
    linieSpielen(w) { S.setup.linien = [w]; a.setup = "quiz"; a.linie = null; window.scrollTo(0, 0); },
    filter(w) { a.filter = w; },
    gross(w) { a.gross = w === "1"; a.offen = new Set(); },
    spalte(w) { if (a.spalten.has(w)) a.spalten.delete(w); else a.spalten.add(w); a.offen = new Set(); },
    zufall() {
      const vs = aktive().filter((v) => a.filter === "alle" || v.typ === a.filter);
      if (!vs.length) return;
      oeffneVerb(E.waehle(vs, (x) => x.inf + "|pres", S.stats, null).inf);
      a.decke = true;
      window.scrollTo(0, 0);
    },
    decke(w) { a.decke = w === "1"; a.offen = new Set(); },
    auf(w) { if (a.offen.has(w)) a.offen.delete(w); else a.offen.add(w); },
    selbst(w) {
      const [z, ok] = w.split("|");
      E.buche(S.stats, a.verb + "|" + z, ok === "1");
      if (ok === "1") { S.km++; serieZaehlen(); }
      sichern();
      for (let i = 0; i < 6; i++) a.offen.delete(z + i);
    },
    uhr(w) { S.setup.uhr = w === "1"; sichern(); },
    zeit(w) { if (S.setup.zeiten.length > 1 || !S.setup.zeiten.includes(w)) umschalten(S.setup.zeiten, w); sichern(); },
    lin(w) {
      const sichtbar = S.setup.linien.filter((l) => linienDa().includes(l));
      if (sichtbar.length > 1 || !sichtbar.includes(w)) umschalten(S.setup.linien, w);
      sichern();
    },
    n(w) { S.setup.n = Number(w); sichern(); },
    mem(w) { S.setup.memory = w; sichern(); },
    start() { start(a.setup); },
    op(w) { antworte(Number(w)); return true; },
    weiter() { weiter(); return true; },
    blase(w) { blase(Number(w)); return true; },
    karte(w) { karte(Number(w)); return true; },
    abbrechen() { halt(); spiel = null; a.setup = null; window.scrollTo(0, 0); },
    nochmal() { const id = spiel.id; halt(); spiel = null; start(id); return true; },
    spielVerb(w) { halt(); spiel = null; a.setup = null; a.tab = "fahrplan"; oeffneVerb(w); window.scrollTo(0, 0); },
    einzeln() { a.einzeln = !a.einzeln; },
    neuJahr(w) { a.neu = { jahr: Number(w), unite: null }; },
    neuUnite(w) { a.neu.unite = Number(w); },
    neuFertig() {
      S.stand.band = a.neu.jahr; S.stand.lektion = a.neu.unite;
      standNeu();
      a.tab = "netz";
      window.scrollTo(0, 0);
    },
    umfang(w) { S.stand.umfang = Number(w); S.stand.an = {}; sichern(); },
    waehl(w) { const v = finde(w); S.stand.an[w] = !aktiv(v); sichern(); },
    alleLinie(w) {
      const vs = VERBEN.filter((v) => v.typ === w && bisStand(v)), allesAn = vs.every(aktiv);
      vs.forEach((v) => { S.stand.an[v.inf] = !allesAn; });
      sichern();
    },
    "frage-loeschen"() { a.bestaetige = true; },
    abbruch() { a.bestaetige = false; },
    loeschen() { const st = S.stand; S = neu(); S.stand = st; a.bestaetige = false; standNeu(); }
  };
  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-a]");
    if (!b || b.disabled) return;
    const fertig = AKT[b.dataset.a](b.dataset.w);
    if (!fertig) zeige();
  });
  app.addEventListener("change", (ev) => {
    const c = ev.target.dataset.c;
    if (!c) return;
    const n = ev.target.value ? Number(ev.target.value) : null;
    if (c === "band") { S.stand.band = n; S.stand.lektion = null; } else S.stand.lektion = n;
    standNeu(); zeige();
  });
  /* Netzplan: Linien und Bahnhöfe sind SVG-Elemente, die auch per Tastatur gehen sollen */
  app.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const g = ev.target.closest("svg [data-a]");
    if (!g) return;
    ev.preventDefault();
    AKT[g.dataset.a](g.dataset.w);
    zeige();
  });
  document.addEventListener("keydown", (ev) => {
    if (!spiel || spiel.fertig) return;
    if (spiel.frage && spiel.id !== "reihe" && spiel.id !== "memory") {
      if (/^[1-6]$/.test(ev.key) && spiel.wahl === null) antworte(Number(ev.key) - 1);
      else if ((ev.key === "Enter" || ev.key === " ") && spiel.wahl !== null && !spiel.uhr) { ev.preventDefault(); weiter(); }
    }
  });
  function ausHash() {
    const t = location.hash.slice(1);
    if (TABS[t]) { a.tab = t; a.setup = a.linie = a.verb = null; }
  }
  window.addEventListener("hashchange", () => { if (!spiel) { ausHash(); zeige(); } });
  ausHash();
  zeige();
})();
