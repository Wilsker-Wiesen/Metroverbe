/* Oberfläche und Spielabläufe */
(function () {
  "use strict";
  const E = Engine, VERBEN = VERB_DATEN.verben, L = E.LINIEN, FOLGE = E.LINIEN_FOLGE;
  const GRAMMATIK = VERB_DATEN.grammatik || [];
  /* Wie viel vom Bestand gezeigt wird: 1 nur Formenträger, 2 dazu der Übungsvorrat, 3 alles */
  const UMFANG = [
    { w: 1, name: "Die wichtigsten", text: "Nur die Verben, die du unbedingt können musst." },
    { w: 2, name: "Wichtige und häufige", text: "Dazu viele häufige Verben, die genauso gehen." },
    { w: 3, name: "Alle Verben", text: "Auch seltene Wörter aus einzelnen Themen." }
  ];
  const SCHLUESSEL = "conjugaison.v1";
  const app = document.getElementById("app");

  /* Jedes Spiel ist eine Fahrt und übt genau eine Sache (was).
     min: so viele Verben braucht die Fahrt, damit sie nicht nur aus Wiederholungen besteht.
     linie: Diese Fahrt kann man auch nur auf einer Linie fahren. */
  const SPIELE = [
    { id: "quiz", name: "Linienfahrt", was: "Verbformen", text: "Ein Satz, eine Lücke: Wähle die richtige Verbform.", zeiten: true, opt: true, ziel: 15, min: 3, linie: true },
    { id: "partizip", name: "Endstation Partizip", was: "Participe passé", text: "Finde das richtige Participe passé.", textAngleich: "Finde das richtige Participe passé, auch mit Angleichung: partie oder parties?", opt: true, ziel: 15, min: 6 },
    { id: "aux", name: "Welches Gleis?", was: "avoir oder être", text: "tu ___ parti: Setze das Hilfsverb ein, es, as, est oder a.", ziel: 15, min: 8, etre: 3 },
    { id: "reihe", name: "Strecke bauen", was: "Ganze Tabellen", text: "Tippe die Formen in der richtigen Reihenfolge an: je, tu, il …", zeiten: true, ziel: 5, min: 3, linie: true },
    { id: "bedeutung", name: "Durchsage", was: "Bedeutung", text: "Was heißt das? Französisch und Deutsch zuordnen.", opt: true, ziel: 15, min: 6 },
    /* Ohne Einstellungsseite: Sie steht als eigener Block über den anderen Fahrten */
    { id: "blau", name: "Fahrt ins Blaue", was: "Alles gemischt", frei: true, text: "Nichts einstellen: zufälliges Verb, zufällige Form, quer durch alles, was ihr schon hattet.", opt: true, ziel: 15, min: 6 }
  ];
  /* Die Bahnhöfe des Netzes: jede Zeit und jeder Modus. Reihenfolge wie in Engine.ZEITEN */
  const BAHNHOEFE = {
    pres: { art: "Zeit", de: "Gegenwart: was jetzt ist.", regel: "Stamm + Endung. Die Endung hängt von der Linie ab." },
    imp: { art: "Modus", de: "Befehlsform: Mach das!", regel: "Drei Formen ohne Subjekt: tu, nous und vous." },
    fc: { art: "Zeit", de: "Nahe Zukunft: was gleich passiert.", regel: "aller im Présent + Infinitiv", bauteil: "aller" },
    pc: { art: "Zeit", de: "Vergangenheit: was passiert ist.", regel: "avoir oder être im Présent + Participe passé", gleise: true },
    impf: { art: "Zeit", de: "Vergangenheit: wie es war, was oft geschah.", regel: "Stamm von nous im Présent + -ais, -ais, -ait, -ions, -iez, -aient. Nur être hat einen eigenen Stamm: ét-." },
    pr: { art: "Zeit", de: "Gerade eben passiert.", regel: "venir im Présent + de + Infinitiv", bauteil: "venir" },
    prog: { art: "Zeit", de: "Gerade dabei.", regel: "être im Présent + en train de + Infinitiv", bauteil: "être" },
    fs: { art: "Zeit", de: "Zukunft: was sein wird.", regel: "Infinitiv (bei -re ohne das e) + -ai, -as, -a, -ons, -ez, -ont. Unregelmäßige haben einen eigenen Stamm: être → ser-, aller → ir-." },
    pqp: { art: "Zeit", de: "Vorvergangenheit: was davor schon war.", regel: "avoir oder être im Imparfait + Participe passé", gleise: true },
    cond: { art: "Modus", de: "Möglichkeit und höfliche Bitte: Ich würde …", regel: "Stamm des Futur simple + -ais, -ais, -ait, -ions, -iez, -aient" },
    subj: { art: "Modus", de: "Nach Ausdrücken wie il faut que.", regel: "Stamm von ils im Présent + -e, -es, -e, -ions, -iez, -ent. Einige Unregelmäßige haben eigene Stämme." }
  };
  /* Die wichtigsten Verben sind Beispiele an den Bahnhöfen, wohnen aber auf der Linie „!“ */
  const WICHTIG = ["être", "avoir", "aller", "venir", "faire"];
  const HILFSVERB = [
    { inf: "être", thema: "passe_compose_etre", satz: "Hilfsverb: Damit fährst du im Passé composé auf Gleis être, zum Beispiel je suis allé(e)." },
    { inf: "avoir", thema: "passe_compose_avoir", satz: "Hilfsverb: Damit fährst du im Passé composé auf Gleis avoir, zum Beispiel j'ai parlé." },
    { inf: "aller", thema: "futur_compose", satz: "Hilfsverb: Damit baust du das Futur composé, zum Beispiel je vais parler." },
    { inf: "venir", thema: "passe_recent", satz: "Hilfsverb: Damit baust du das Passé récent, zum Beispiel je viens de parler." }
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
      setup: { uhr: false, zeiten: ["pres"], n: 4 }
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
        /* Früher blieb eine gewählte Linie für alle Fahrten hängen. Heute gilt sie nur für eine Fahrt. */
        delete s.setup.linien;
      }
    } catch (e) { /* Ohne Speicher läuft die App trotzdem */ }
    return s;
  }
  function sichern() { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(S)); } catch (e) { /* siehe oben */ } }

  let S = laden();
  const TABS = { netz: "Netzplan", fahrten: "Fahrten", fahrplan: "Fahrplan", fahrkarte: "Mein Stand" };
  /* nurLinie: Die Fahrt, die gerade eingestellt wird, läuft nur auf dieser Linie. Wird nie gespeichert. */
  const a = { neu: { jahr: null, unite: null }, einzeln: false, tab: "netz", setup: null, nurLinie: null, linie: null, verb: null, bahnhof: null, suche: "", decke: false, offen: new Set(), filter: "alle", gross: false, spalten: new Set(), bestaetige: false };
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
    a.filter = "alle";
    sichern();
  }
  /* Beim Spieltext zählt, ob die Angleichung schon dran war */
  const spielText = (g) => (g.textAngleich && themaDa("passe_compose_etre") ? g.textAngleich : g.text);
  const aktive = () => VERBEN.filter(aktiv);
  const zahlVerben = (n) => (n === 1 ? "1 Verb" : n + " Verben");
  /* Was eine Fahrt gerade übt, in Worten. b: { linie, zeit }, beides darf fehlen. */
  const VERBEN_DER_LINIE = { er: "Verben auf -er", ir: "Verben auf -ir mit -iss-", irk: "Verben auf -ir ohne -iss-", dre: "Verben auf -dre", irr: "unregelmäßige Verben" };
  const linienText = (b) => (b.linie ? "Nur " + VERBEN_DER_LINIE[b.linie] : "Alle Linien");
  function zeitenText(g, b) {
    if (g.id === "aux" || g.id === "partizip") return "Passé composé";
    if (g.id === "bedeutung") return "Bedeutung";
    if (g.id === "blau") return "alles, was ihr hattet";
    return (b.zeit ? [b.zeit] : S.setup.zeiten.filter((z) => zeitenErlaubt().includes(z))).map((z) => E.ZEITEN[z]).join(", ");
  }
  /* Warum eine Fahrt (noch) nicht geht, oder null. Ein Hinweis kommt nur, wenn er wirklich mehr Verben bringt. */
  function sperre(g, b) {
    const spt = spaeter(g);
    if (spt) return spt;
    const pool = poolFuer(g, b), wo = b.linie ? "Auf dieser Linie gibt es" : "Du hast";
    if (pool.length < g.min) {
      const mehr = VERBEN.filter((v) => bisStand(v) && E.uebbar(v) && (!b.linie || v.typ === b.linie)).length > aktive().filter((v) => E.uebbar(v) && (!b.linie || v.typ === b.linie)).length;
      return `Braucht mindestens ${g.min} Verben. ${wo} bisher ${zahlVerben(pool.length)}.${mehr ? " Unter „Mein Stand“ kannst du mehr Verben dazunehmen." : ""}`;
    }
    if (g.etre) {
      const n = pool.filter((v) => E.konj(v).aux === "être").length;
      if (n < g.etre) return `Braucht mindestens ${g.etre} Verben mit être. ${wo} bisher ${n}.`;
    }
    return null;
  }
  /* Stempel: je Linie und Pflichtzeit. Er ist voll, wenn 8 Verben dieser Linie in dieser Zeit sitzen,
     bei kleineren Linien alle. So gibt es schon früh etwas zu holen. */
  const STEMPEL_ZIEL = 8;
  function stempelListe() {
    const zeiten = zeitenStandard(), alle = aktive().filter(E.uebbar);
    return linienDa().map((l) => ({
      l,
      felder: zeiten.map((z) => {
        const vs = alle.filter((v) => v.typ === l && zeitenFuer(v).includes(z));
        const ziel = Math.min(STEMPEL_ZIEL, vs.length), gut = vs.filter((v) => E.stufe(v, S.stats, [z]) === 3).length;
        return { z, ziel, gut: Math.min(gut, ziel), voll: ziel > 0 && gut >= ziel };
      }).filter((f) => f.ziel > 0)
    }));
  }
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
    else if (a.bahnhof) inhalt = seiteBahnhof();
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
      ${vs ? `<section class="ticket"><div class="ticket-kopf"><span>Dein Stand</span><span>${NAME}</span></div>
        <b class="ticket-gross">${jahr}. Lernjahr, Unité ${unite} von ${zahl}</b>
        <span>${zahlVerben(vs.n)}${vs.refl ? ", auch reflexive" : ""}</span>
        <span class="leise">Bahnhöfe: ${h(vs.zeiten.join(", "))}</span></section>
      <button class="knopf" data-a="neuFertig">Einsteigen</button>
      <p class="hinweis">Du kannst das später unter „Mein Stand“ ändern.</p>` : ""}
    </main>`;
  }
  function tabs() {
    return `<nav class="tabs">${Object.entries(TABS).map(([k, t]) =>
      `<button data-a="tab" data-w="${k}" ${a.tab === k && !a.linie && !a.verb && !a.setup && !a.bahnhof ? 'aria-current="page"' : ""}>${t}</button>`).join("")}</nav>`;
  }
  /* Die Linienmarke. -ir mit -iss- trägt unter der Marke ein kleines Zusatzschild. */
  const marke = (l, klein) => `<span class="rund${klein ? " mini" : ""}">${h(L[l].kurz)}${L[l].unter ? `<i class="unter">${h(L[l].unter)}</i>` : ""}</span>`;

  /* Der Netzplan: Die Linie sagt, welche Verben, der Bahnhof, welche Zeit. Jede Linie fährt durch jeden Bahnhof. */
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
  /* Welche Gleise ein Bahnhof gerade hat: nur Passé composé und Plus-que-parfait teilen sich auf */
  const gleiseVon = (z) => (BAHNHOEFE[z].gleise ? (themaDa("passe_compose_etre") ? ["avoir", "être"] : ["avoir"]) : []);
  const istModus = (z) => BAHNHOEFE[z].art === "Modus";
  function netzplan() {
    const linien = PLAN_FOLGE.filter((l) => linienDa().includes(l));
    const pflicht = zeitenStandard();
    const halte = zeitenErlaubt().map((z) => ({ z, gleise: gleiseVon(z), modus: istModus(z), zusatz: !pflicht.includes(z) }));
    const n = linien.length, MITTE = 180, WEIT = 66, ENG = 12, SPITZE = 58, LUECKE = 20, BREIT = 118;
    const weit = (i) => MITTE + (i - (n - 1) / 2) * WEIT, eng = (i) => MITTE + (i - (n - 1) / 2) * ENG;
    const arm = Math.max(Math.abs(weit(0) - eng(0)), 76);
    const yA = SPITZE + arm;
    let lauf = yA + LUECKE / 2;
    halte.forEach((b) => { b.h = b.gleise.length ? 56 : 42; b.y = lauf + b.h / 2; lauf += b.h + LUECKE; });
    const yE = lauf - LUECKE / 2, ende = yE + arm;
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
        ${L[l].unter ? `<rect x="${xw - 16}" y="35" width="32" height="18" rx="6" class="pl-unter"/><text x="${xw}" y="48.5" class="pl-unter-text">${h(L[l].unter)}</text>` : ""}
        <circle cx="${xw}" cy="${ende}" r="9" class="${fertig ? "pl-ende voll" : "pl-ende"}"/>
        <text x="${xw}" y="${ende + 27}" class="pl-zahl">${gut}/${vs.length}</text>
      </g>`;
    }).join("");
    const bahnhoefe = halte.map((b) => {
      const art = (b.modus ? " modus" : "") + (b.zusatz ? " zusatz" : "");
      const oben = b.y - b.h / 2;
      return `<g class="pl-halt${art}" data-a="bahnhof" data-w="${b.z}" role="button" tabindex="0" aria-label="Bahnhof ${h(E.ZEITEN[b.z])}, ${BAHNHOEFE[b.z].art}${b.zusatz ? ", Zusatz" : ""}">
        <rect x="0" y="${oben - LUECKE / 2}" width="360" height="${b.h + LUECKE}" fill="transparent"/>
        <rect x="${MITTE - BREIT}" y="${oben}" width="${BREIT * 2}" height="${b.h}" rx="20" class="pl-bhf"/>
        <text x="${MITTE}" y="${b.y + (b.gleise.length ? -3 : 7.5)}" class="pl-bhf-name">${h(E.ZEITEN[b.z])}</text>
        ${b.gleise.length ? `<text x="${MITTE}" y="${b.y + 17}" class="pl-gleise">${b.gleise.map((g) => "Gleis " + g).join(" · ")}</text>` : ""}
      </g>`;
    }).join("");
    return `<svg viewBox="0 0 360 ${ende + 38}" class="plansvg" role="group" aria-label="Netzplan">${strecken}${bahnhoefe}</svg>`;
  }
  /* Erklärt die drei Bahnhofsarten, aber nur die, die gerade auf dem Plan stehen */
  function legende() {
    const z = zeitenErlaubt(), pflicht = zeitenStandard();
    const teile = [
      z.some((x) => !istModus(x)) && '<span><i class="lg"></i>Zeit</span>',
      z.some(istModus) && '<span><i class="lg modus"></i>Modus</span>',
      z.some((x) => !pflicht.includes(x)) && '<span><i class="lg zusatz"></i>Zusatzteil</span>'
    ].filter(Boolean);
    return `<div class="legende">${teile.join("")}</div>`;
  }
  function seiteNetz() {
    const quiz = SPIELE[0], zu = sperre(quiz, {});
    const st = stempelListe().flatMap((x) => x.felder);
    /* Der Schnellstart sagt, was er übt: Linienfahrt über alle Linien in den gewählten Bahnhöfen */
    const los = zu
      ? `<section class="los">
        <div class="spalte"><h2>Gleich geht's los</h2><p>Für eine Fahrt brauchst du mindestens ${quiz.min} Verben, bisher hast du ${zahlVerben(poolFuer(quiz, {}).length)}. Bis dahin kannst du im Fahrplan Formen abdecken und dich selbst abfragen.</p></div>
        <div class="reihe"><button data-a="tab" data-w="fahrplan">Zum Fahrplan</button></div>
      </section>`
      : `<section class="los">
        <div class="spalte"><h2>Einsteigen</h2><p><b>Linienfahrt</b> · Alle Linien · ${h(zeitenText(quiz, {}))}</p></div>
        <div class="reihe">
          <button data-a="schnell" data-w="ruhe">In Ruhe</button>
          <button data-a="schnell" data-w="uhr">Express · 60 s</button>
        </div>
        <button class="klein-link" data-a="setup" data-w="quiz">Bahnhöfe ändern</button>
      </section>`;
    return `
      <header class="kopf">
        <div class="marke"><span>${NAME}</span><img src="icons/symbol.svg" alt=""></div>
        <div class="zahlen">
          <div><b>${S.km}</b><span>km gefahren</span></div>
          <div><b>${S.serie}</b><span>Tage in Folge</span></div>
          <div><b>${st.filter((f) => f.voll).length}/${st.length}</b><span>Stempel</span></div>
        </div>
      </header>
      ${los}
      <section class="plan">${netzplan()}${legende()}</section>
      <p class="hinweis mitte">Tippe auf eine Linie, um ihre Tabelle anzusehen, oder auf einen Bahnhof.</p>`;
  }
  /* Jede Fahrt hat ihr eigenes Streckenbild auf hellem Grund, in den Farben der Linien */
  const bild = (innen) => `<svg class="streckenbild" viewBox="0 0 240 56" aria-hidden="true">${innen}</svg>`;
  const STRECKENBILD = {
    quiz: bild([["er", "M-6 42 H34 L46 28"], ["ir", "M46 28 L58 14 H92 L104 28"], ["irr", "M104 28 L116 42 H144 L154 28"], ["irk", "M154 28 L164 14 H192 L202 28"], ["dre", "M202 28 L212 42 H246"]].map(([l, d]) => `<path d="${d}" stroke="var(--${l})"/>`).join("") + [46, 104, 154, 202].map((x) => `<circle cx="${x}" cy="28" r="7" class="sb-hub"/>`).join("")),
    partizip: bild(`<path d="M-6 28 H200" stroke="var(--irk)"/>${[36, 88, 140].map((x) => `<circle cx="${x}" cy="28" r="4" class="sb-punkt"/>`).join("")}<circle cx="208" cy="28" r="12" class="sb-ende" stroke="var(--irk)"/>`),
    aux: bild(`<path d="M86 28 L110 11 H246" stroke="var(--er)"/><path d="M86 28 L110 45 H246" stroke="var(--dre)"/><path d="M-6 28 H86" stroke="var(--tinte)"/><circle cx="86" cy="28" r="9" class="sb-hub"/>`),
    reihe: bild(`<path d="M-6 28 H246" stroke="var(--ir)"/>${[30, 66, 102, 138, 174, 210].map((x, i) => `<circle cx="${x}" cy="28" r="8" class="${i < 3 ? "sb-hub" : "sb-ende"}" stroke="var(--ir)"/>`).join("")}`),
    bedeutung: bild(`<path d="M-6 28 H246" stroke="var(--irr)"/><circle cx="120" cy="28" r="10" class="sb-hub"/>${[17, 30, 43].map((r) => `<path d="M${120 - r} ${28 - r * 0.6} Q${120 - r * 1.3} 28 ${120 - r} ${28 + r * 0.6} M${120 + r} ${28 - r * 0.6} Q${120 + r * 1.3} 28 ${120 + r} ${28 + r * 0.6}" class="sb-welle"/>`).join("")}`),
    blau: bild(`<path d="M-6 28 H246" stroke="var(--blau)" stroke-dasharray="13 10"/><circle cx="120" cy="28" r="17" class="sb-frage"/><text x="120" y="37" class="sb-zeichen">?</text>`)
  };
  /* Unten auf jeder Kachel: wie viele Verben die Fahrt hat, oder warum sie noch zu ist */
  function kachelFuss(g) {
    const zu = sperre(g, {});
    return zu ? `<span class="fuss zu">${h(zu)}</span>` : `<span class="fuss">${zahlVerben(poolFuer(g, {}).length)}</span>`;
  }
  function seiteFahrten() {
    const blau = SPIELE.find((s) => s.id === "blau"), blauZu = !!sperre(blau, {});
    return `
      <header class="spalte"><h1>Fahrten</h1>
      <p class="leise">Alle Fahrten laufen über alle Linien. Nur eine Linie üben: im Netzplan auf die Linie tippen.</p></header>
      <div class="spiele">
        <section class="spiel blau${blauZu ? " zu" : ""}">${STRECKENBILD.blau}<div class="spiel-text">
          <span class="was">${h(blau.was)}</span><h3>${h(blau.name)}</h3><p>${h(blau.text)}</p>
          <div class="reihe"><button data-a="blau" data-w="ruhe" ${blauZu ? "disabled" : ""}>In Ruhe</button><button data-a="blau" data-w="uhr" ${blauZu ? "disabled" : ""}>Express · 60 s</button></div>
          ${kachelFuss(blau)}
        </div></section>
        ${SPIELE.filter((s) => !s.frei).map((s) => `
        <button class="spiel" data-a="setup" data-w="${s.id}" ${sperre(s, {}) ? "disabled" : ""}>${STRECKENBILD[s.id]}<div class="spiel-text">
          <span class="was">${h(s.was)}</span><h3>${h(s.name)}</h3><p>${h(spielText(s))}</p>${kachelFuss(s)}
        </div></button>`).join("")}</div>`;
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
      <header class="schild" data-l="${l}">${marke(l)}<div><h1>${h(L[l].name)}</h1></div></header>
      <p>${h(t.text)}</p>
      ${tabelle}
      <p class="merke">${h(t.extra)}</p>
      <section class="los ueben" data-l="${l}">
        <div class="spalte"><h2>Nur diese Linie üben</h2><p>Hier kommen nur ${h(VERBEN_DER_LINIE[l])} dran. Deine anderen Fahrten bleiben, wie sie sind.</p></div>
        <div class="ueben-liste">${SPIELE.filter((g) => g.linie).map((g) => {
          const zu = sperre(g, { linie: l });
          return `<button data-a="linieUeben" data-w="${g.id}|${l}" ${zu ? "disabled" : ""}><span class="was">${h(g.was)}</span><b>${h(g.name)}</b><small>${h(zu || zahlVerben(poolFuer(g, { linie: l }).length))}</small></button>`;
        }).join("")}</div>
      </section>
      <section class="spalte"><h2>Verben dieser Linie</h2>${verbliste(vs, true)}</section>`;
  }
  function verbliste(vs, schiene, text) {
    return `<div class="verbliste${schiene ? " schiene" : ""}">${vs.map((v) => `
      <button class="verbzeile" data-a="verb" data-w="${h(v.inf)}" data-l="${v.typ}">
        <i class="punkt s${fortschritt(v)}"></i><b>${h(v.inf)}</b><span class="de">${h(text ? text(v) : v.de)}</span>
      </button>`).join("")}</div>`;
  }
  /* Wortsuche: findet Infinitiv, deutsche Bedeutung und einfache Verbformen. Akzente sind egal. */
  const ohneAkzent = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let formenSpeicher = { stand: null, liste: [] };
  function bekannteFormen() {
    if (formenSpeicher.stand === jetzt()) return formenSpeicher.liste;
    const liste = VERBEN.filter(bisStand).map((v) => {
      const k = E.konj(v), formen = new Map(), zeiten = zeitenFuer(v);
      const dazu = (f) => { if (f) { const w = f.trim().split(/[\s']+/).pop(); formen.set(ohneAkzent(w), w); } };
      ["pres", "imp", "impf", "fs", "cond", "subj"].filter((z) => zeiten.includes(z) && k[z]).forEach((z) => k[z].forEach(dazu));
      if (zeiten.includes("pc")) dazu(k.pp);
      return { v, formen };
    });
    formenSpeicher = { stand: jetzt(), liste };
    return liste;
  }
  function treffer(roh) {
    const q = ohneAkzent(roh.trim());
    if (!q) return [];
    const lang = q.length >= 2;
    return bekannteFormen().map(({ v, formen }) => {
      const inf = ohneAkzent(v.inf), kern = inf.replace(/^(se |s')/, ""), de = ohneAkzent(v.de);
      const rang = inf === q || kern === q ? 0
        : lang && formen.has(q) ? 1
        : kern.startsWith(q) ? 2
        : de.split(/[^a-zß]+/).some((w) => w.startsWith(q)) ? 3
        : lang && inf.includes(q) ? 4
        : lang && de.includes(q) ? 5 : -1;
      return { v, rang, form: rang === 1 ? formen.get(q) : null };
    }).filter((t) => t.rang >= 0)
      .sort((x, y) => x.rang - y.rang || (x.v.prio || 1) - (y.v.prio || 1) || x.v.inf.localeCompare(y.v.inf, "fr"))
      .slice(0, 30);
  }
  function suchInhalt() {
    const liste = treffer(a.suche);
    if (!liste.length) return `<p class="hinweis">Nichts gefunden. Vielleicht kommt dieses Verb erst später.</p>`;
    const zu = new Map(liste.map((t) => [t.v.inf, t]));
    return verbliste(liste.map((t) => t.v), false, (v) => (zu.get(v.inf).form ? `Form: ${zu.get(v.inf).form} · ${v.de}` : v.de));
  }
  function seiteFahrplan() {
    return `
      <header class="spalte"><h1>Fahrplan</h1>
      <p class="leise">Schau nach oder decke Formen ab und frag dich selbst.</p></header>
      <div class="suche"><label for="suche" hidden>Verb suchen</label>
        <input id="suche" data-i="suche" type="search" value="${h(a.suche)}" placeholder="Verb oder Form suchen" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>
      <div id="fahrplanInhalt" class="fahrplan-inhalt">${fahrplanInhalt()}</div>`;
  }
  /* Eigener Teil der Seite: Beim Tippen wird nur er neu gezeichnet, damit das Suchfeld den Fokus behält */
  function fahrplanInhalt() {
    if (a.suche.trim()) return suchInhalt();
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
      <div class="spalte">${art}${filter}</div>
      <button class="knopf zwei" data-a="zufall" ${vs.length ? "" : "disabled"}>Zufälliges Verb abfragen</button>
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
  /* Ein Bahnhof: Was die Zeit bedeutet, wie sie gebaut wird, und Beispiele quer durch die Linien */
  function formVon(v, z) { return E.tabelle(v)[z][0].voll; }
  const reiheHilfsverb = (inf, z) => E.tabelle(finde(inf))[z].map((r) => r.voll.replace("il/elle/on", "il").replace("ils/elles", "ils")).join(", ");
  const beispielZeile = (v, z) => `<button class="verbzeile bsp" data-a="verb" data-w="${h(v.inf)}" data-l="${v.typ}">
    ${marke(v.typ, true)}<b>${h(formVon(v, z))}</b><span class="de">${h(v.inf)}</span></button>`;
  function fahrbar(z) { return aktive().filter((v) => E.uebbar(v) && zeitenFuer(v).includes(z)); }
  function beispiele(z) {
    const da = fahrbar(z);
    const je = PLAN_FOLGE.filter((l) => l !== "irr").map((l) => {
      const b = finde(L[l].beispiel);
      return da.includes(b) ? b : da.find((v) => v.typ === l && !v.reflexiv);
    }).filter(Boolean);
    return je.concat(WICHTIG.map(finde).filter((v) => da.includes(v)));
  }
  function gleisBeispiele(z, gleis) {
    const da = fahrbar(z).filter((v) => E.konj(v).aux === gleis);
    if (gleis === "avoir") {
      const je = PLAN_FOLGE.filter((l) => l !== "irr").map((l) => {
        const b = finde(L[l].beispiel);
        return da.includes(b) ? b : da.find((v) => v.typ === l && !v.reflexiv);
      }).filter(Boolean);
      return je.concat(["avoir", "faire"].map(finde).filter((v) => da.includes(v)));
    }
    const refl = da.find((v) => v.reflexiv);
    return ["aller", "venir", "partir", "arriver"].map(finde).filter((v) => da.includes(v)).concat(refl ? [refl] : []);
  }
  function gleisBlock(z, gleis) {
    const refl = themaDa("passe_compose_reflexiv");
    const text = gleis === "avoir" ? `Die meisten Verben. Das Partizip bleibt unverändert${themaDa("accord_avoir") ? ", außer ein direktes Objekt steht davor: la lettre que j'ai écrite" : ""}.` : `Verben der Bewegung und des Zustandswechsels${refl ? " und alle reflexiven Verben" : ""}. Das Partizip richtet sich nach dem Subjekt.`;
    return `<section class="gleis-block"><h3><span class="gleis-nr">Gleis</span> ${gleis}</h3><p>${h(text)}</p>
      <p class="leise klein">${h(reiheHilfsverb(gleis, z === "pc" ? "pres" : "impf"))}</p>
      <div class="verbliste">${gleisBeispiele(z, gleis).map((v) => beispielZeile(v, z)).join("")}</div></section>`;
  }
  function seiteBahnhof() {
    const z = a.bahnhof, b = BAHNHOEFE[z], gleise = gleiseVon(z);
    const zusatz = !zeitenStandard().includes(z);
    const zu = sperre(SPIELE[0], { zeit: z }), genug = !zu;
    return `
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="schild bhf"><div><h1>${h(E.ZEITEN[z])}</h1><p>${b.art}. ${h(b.de)}</p></div></header>
      <p class="merke"><b>So wird gebaut:</b> ${h(b.regel)}</p>
      ${zusatz ? `<p class="hinweis">Das steht bei euch in einem Zusatzteil. In deinen Fahrten ist es deshalb nicht vorgewählt.</p>` : ""}
      <section class="los">
        <div class="spalte"><h2>Nur diesen Bahnhof üben</h2><p>${genug ? `<b>Linienfahrt</b> · Alle Linien · Nur ${h(E.ZEITEN[z])}` : h(zu)}</p></div>
        <div class="reihe">
          <button data-a="bahnhofFahren" data-w="${z}|ruhe" ${genug ? "" : "disabled"}>In Ruhe</button>
          <button data-a="bahnhofFahren" data-w="${z}|uhr" ${genug ? "" : "disabled"}>Express · 60 s</button>
        </div>
      </section>
      ${b.bauteil ? `<section class="spalte"><h2>Das brauchst du dafür</h2><p>${h(reiheHilfsverb(b.bauteil, "pres"))}</p></section>` : ""}
      ${gleise.length
        ? gleise.map((g) => gleisBlock(z, g)).join("") + (z === "pc" && gleise.length > 1 ? `<div class="knoepfe"><button class="knopf zwei" data-a="setup" data-w="aux">Welches Gleis? üben</button><button class="knopf zwei" data-a="setup" data-w="partizip">Endstation Partizip</button></div>` : "")
        : `<section class="spalte"><h2>Beispiele</h2><div class="verbliste">${beispiele(z).map((v) => beispielZeile(v, z)).join("")}</div></section>`}`;
  }
  function seiteVerb() {
    const v = finde(a.verb), t = E.tabelle(v), k = E.konj(v), zeiten = zeitenFuer(v);
    const hilfs = HILFSVERB.find((u) => u.inf === v.inf && themaDa(u.thema));
    const block = (z) => {
      if (!t[z]) return `<section class="formblock"><h3>${h(E.ZEITEN[z])}</h3><p class="leise">Dieses Verb hat keinen Imperativ.</p></section>`;
      return `<section class="formblock"><h3>${h(E.ZEITEN[z])}</h3><div class="formen${z === "subj" ? " que" : ""}">
        ${t[z].map((r, i) => {
          const id = z + i, zu = a.decke && !a.offen.has(id);
          if (a.decke) return `<button class="form" data-a="auf" data-w="${id}">${person(r.person)}${zu ? '<span class="deck">verdeckt</span>' : `<span>${h(r.form)}</span>`}</button>`;
          return `<div class="form">${person(r.person)}<span>${h(r.form)}</span></div>`;
        }).join("")}
      </div>${a.decke ? `<div class="selbst"><button class="ja" data-a="selbst" data-w="${z}|1">Konnte ich</button><button class="nein" data-a="selbst" data-w="${z}|0">Noch üben</button></div>` : ""}</section>`;
    };
    return `
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="schild" data-l="${v.typ}">${marke(v.typ)}<div><h1>${h(v.inf)}</h1><p>${h(v.de)}</p></div></header>
      <p class="leise klein">${h(L[v.typ].name)}${zeiten.includes("pc") ? ` · Passé composé mit ${h(k.aux)}` : ""}</p>
      ${hilfs ? `<p class="merke">${h(hilfs.satz)}</p>` : ""}
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
    /* Je Linie eine Reihe, je Pflichtzeit ein Stempel */
    const stempel = stempelListe().filter((x) => x.felder.length).map((x) => `
      <div class="stempel-linie" data-l="${x.l}">${marke(x.l, true)}<div class="stempelreihe">${x.felder.map((f) =>
        `<div class="stempel${f.voll ? " voll" : ""}"><span>${h(E.ZEITEN[f.z])}</span><small>${f.voll ? "geschafft" : f.gut + "/" + f.ziel}</small></div>`).join("")}</div></div>`).join("");
    const einzeln = FOLGE.map((l) => {
      const vs = bisher.filter((v) => v.typ === l);
      if (!vs.length) return "";
      const an = vs.filter(aktiv).length;
      return `<section class="spalte" data-l="${l}">
        <div class="zwischen"><div class="linie-kopf">${marke(l, true)}<h3>${h(L[l].name)}</h3></div>
        <button class="chip" data-a="alleLinie" data-w="${l}">${an === vs.length ? "Keine" : "Alle"}</button></div>
        <div class="waehl">${vs.map((v) => `<button class="chip" data-l="${l}" data-a="waehl" data-w="${h(v.inf)}" aria-pressed="${aktiv(v)}">${h(v.inf)}</button>`).join("")}</div>
      </section>`;
    }).join("");
    return `
      <section class="ticket"><div class="ticket-kopf"><span>Mein Stand</span><span>${NAME}</span></div>
        <span class="leise klein">Ihr seid im</span>
        <b class="ticket-gross">${gueltig}</b>
        <span>${n} von ${zahlVerben(bisher.length)} auf deinem Netz</span>
        <span class="leise">Bahnhöfe: ${h(zeitenErlaubt().map((z) => E.ZEITEN[z]).join(", "))}</span>
      </section>
      <section class="feld"><span class="lbl">Wo stehst du gerade?</span><div class="reihe">
        <label for="band" hidden>Lernjahr</label><select id="band" data-c="band">${aufbau.map((x) => `<option value="${x.jahr}" ${S.stand.band === x.jahr ? "selected" : ""}>${x.jahr}. Lernjahr</option>`).join("")}</select>
        <label for="lektion" hidden>Unité</label><select id="lektion" data-c="lektion"><option value="">Ganzes Lernjahr</option>${Array.from({ length: zahl }, (_, i) => i + 1).map((l) => `<option value="${l}" ${S.stand.lektion === l ? "selected" : ""}>Unité ${l}</option>`).join("")}</select>
      </div></section>
      <section class="spalte"><h2>Deine Stempel</h2>
        <p class="hinweis">Sitzen ${STEMPEL_ZIEL} Verben einer Linie in einer Zeit, bekommst du den Stempel. Hat die Linie weniger Verben, müssen alle sitzen. Ein Verb sitzt, wenn du es in dieser Zeit etwa viermal richtig hattest. Fehler zählen dagegen.</p>
        <div class="stempel-tafel">${stempel}</div></section>
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
    const b = { linie: a.nurLinie };
    const pool = poolFuer(g, b), zu = sperre(g, b);
    /* Oben steht immer, was geübt wird. Eine einzelne Linie lässt sich hier wieder lösen. */
    const bereich = b.linie
      ? `<div class="bereich" data-l="${b.linie}">${marke(b.linie, true)}<div><span class="lbl">Du übst</span><b>${h(linienText(b))}</b></div>
        <button class="chip" data-a="alleLinien">Alle Linien</button></div>`
      : `<div class="bereich"><div><span class="lbl">Du übst</span><b>Alle Linien</b></div></div>`;
    return `<main class="seite">
      <button class="zurueck" data-a="zurueck">← Zurück</button>
      <header class="spalte"><span class="was">${h(g.was)}</span><h1>${h(g.name)}</h1><p>${h(spielText(g))}</p>${rek ? `<p class="leise klein">Dein Express-Rekord: ${rek} Punkte</p>` : ""}</header>
      ${bereich}
      <div class="feld"><span class="lbl">Tempo</span><div class="chips">
        <button class="chip" data-a="uhr" data-w="0" aria-pressed="${!s.uhr}">In Ruhe</button>
        <button class="chip" data-a="uhr" data-w="1" aria-pressed="${s.uhr}">Express · 60 s</button>
      </div></div>
      ${g.zeiten ? `<div class="feld"><span class="lbl">Bahnhöfe</span><div class="chips">${zeitenErlaubt().map((z) => [z, E.ZEITEN[z]]).map(([z, t]) =>
        `<button class="chip" data-a="zeit" data-w="${z}" aria-pressed="${s.zeiten.includes(z)}">${t}</button>`).join("")}</div>${
        zeitenErlaubt().length > zeitenStandard().length ? `<p class="hinweis">Bahnhöfe aus Zusatzteilen und Randthemen sind nicht vorgewählt. Tippe sie an, wenn du sie üben willst.</p>` : ""}</div>` : ""}
      ${g.opt ? `<div class="feld"><span class="lbl">Antwortmöglichkeiten</span><div class="chips">${[4, 5, 6].map((n) =>
        `<button class="chip" data-a="n" data-w="${n}" aria-pressed="${s.n === n}">${n}</button>`).join("")}</div></div>` : ""}
      <button class="knopf" data-a="start" ${zu ? "disabled" : ""}>Einsteigen · ${zahlVerben(pool.length)}</button>
      ${zu ? `<p class="hinweis">${h(zu)}${g.zeiten && !spaeter(g) ? " Oder wähle mehr Bahnhöfe." : ""}</p>` : ""}
    </main>`;
  }

  /* ---------- Spielablauf ---------- */
  /* Fahrt ins Blaue: alles, was bisher Pflicht war, unabhängig von der eigenen Auswahl */
  const blauZeiten = (v) => { const pflicht = zeitenStandard(); return zeitenFuer(v).filter((z) => pflicht.includes(z)); };
  /* b.zeit: Fahrt ab einem Bahnhof, also genau diese Zeit. b.linie: nur Verben dieser Linie.
     Beides gilt nur für diese eine Fahrt, die gespeicherte Auswahl bleibt unberührt. */
  function poolFuer(g, b) {
    b = b || {};
    const zeiten = b.zeit ? [b.zeit] : S.setup.zeiten;
    return aktive().filter((v) => {
      if (!E.uebbar(v)) return false;   /* il y a, il faut, neiger: nur eine Form */
      if (b.linie && v.typ !== b.linie) return false;
      if (g.id === "blau") return blauZeiten(v).length > 0;
      const frei = zeitenFuer(v);
      if (g.id === "aux") return frei.includes("pc") && themaDa("passe_compose_etre");
      if (g.id === "partizip") return frei.includes("pc");
      if (g.id === "bedeutung") return true;
      return zeiten.some((z) => frei.includes(z));
    });
  }
  /* Zeit für die nächste Frage und die Verben, die sie schon können */
  function zeitUndFeld(s) {
    const moeglich = s.zeiten.filter((z) => s.pool.some((v) => zeitenFuer(v).includes(z)));
    const z = E.eins(moeglich);
    return { z, feld: s.pool.filter((v) => zeitenFuer(v).includes(z)) };
  }
  function start(id, b) {
    b = b || {};
    const g = SPIELE.find((s) => s.id === id);
    const pool = poolFuer(g, b);
    if (sperre(g, b)) { a.setup = id; a.nurLinie = b.linie || null; zeige(); return; }
    halt();
    spiel = { g, id, b, uhr: S.setup.uhr, pool, n: S.setup.n, zeiten: b.zeit ? [b.zeit] : S.setup.zeiten.slice(), punkte: 0, combo: 0, ok: 0, nein: 0, zahl: 0, falsch: new Map(), gesehen: new Map(), frage: null, wahl: null, letztes: null, ende: 0, km0: S.km, fertig: false, zuletzt: null, spur: [] };
    if (spiel.uhr) {
      spiel.ende = Date.now() + 60000;
      uhr = setInterval(tick, 200);
    }
    if (id === "reihe") neueReihe();
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
  /* Mischt, was der Lernstand hergibt: être, reflexive Verben, avoir und ab accord_avoir das Objekt vor dem Verb */
  function frageAngleichung(s) {
    const refl = s.pool.filter((v) => v.reflexiv), rest = s.pool.filter((v) => !v.reflexiv);
    const etre = rest.filter((v) => E.konj(v).aux === "être"), avoir = rest.filter((v) => E.konj(v).aux === "avoir");
    const saetze = themaDa("accord_avoir") ? E.ANGLEICH_SAETZE.filter((x) => s.pool.includes(finde(x.inf))) : [];
    const arten = [etre, etre, refl, avoir].filter((x) => x.length);
    if (saetze.length) arten.push(saetze, saetze, saetze);
    const wahl = E.eins(arten);
    if (wahl === saetze) { const x = E.eins(saetze); return E.frageObjektSatz(x, finde(x.inf)); }
    return E.frageAngleichung(E.waehle(wahl, (x) => x.inf + "|acc", S.stats, s.letztes));
  }
  function neueFrage() {
    const s = spiel;
    s.wahl = null;
    s.hilfe = false;
    let q;
    /* Jede Fahrt übt nur ihre eigene Sache. Bedeutungen gibt es nur in der Durchsage. */
    if (s.id === "bedeutung") {
      const v = E.waehle(s.pool, (x) => x.inf + "|de", S.stats, s.letztes);
      q = E.frageBedeutung(v, s.pool.length >= 6 ? s.pool : aktive(), s.n);
    } else if (s.id === "quiz") {
      const { z, feld } = zeitUndFeld(s);
      const v = E.waehle(feld, (x) => x.inf + "|" + z, S.stats, s.letztes);
      q = E.frageForm(v, z, s.n);
    } else if (s.id === "blau") {
      /* Halb frei aus allen Verben, halb über eine zufällige Linie, sonst wären fast nur -er-Verben dran */
      const linien = FOLGE.filter((l) => s.pool.some((v) => v.typ === l)), l = E.eins(linien);
      const feld = Math.random() < 0.5 ? s.pool : s.pool.filter((v) => v.typ === l);
      const ohne = feld.filter((v) => v.inf !== s.letztes);
      const v = E.eins(ohne.length ? ohne : feld);
      q = E.frageForm(v, E.eins(blauZeiten(v)), s.n);
    } else if (s.id === "partizip") {
      q = themaDa("passe_compose_etre") && Math.random() < 0.6 ? frageAngleichung(s) : E.fragePartizip(E.waehle(s.pool, (x) => x.inf + "|pc", S.stats, s.letztes), s.n);
    } else if (s.id === "aux") {
      /* Reflexive Verben sind leicht zu erkennen und zahlreich, deshalb kommen sie nur ab und zu dran */
      const refl = s.pool.filter((v) => v.reflexiv), rest = s.pool.filter((v) => !v.reflexiv);
      const etre = rest.filter((v) => E.konj(v).aux === "être"), r = Math.random();
      const feld = etre.length && r < 0.35 ? etre : refl.length && r < 0.5 ? refl : rest.length ? rest : s.pool;
      q = E.frageHilfsverb(E.waehle(feld, (x) => x.inf + "|pc", S.stats, s.letztes));
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

  /* Oben läuft die Strecke mit: Jede beantwortete Frage färbt eine Station in der Farbe ihrer Linie */
  function leiste() {
    const s = spiel;
    let strecke, zaehler;
    if (s.uhr) {
      const r = Math.max(0, s.ende - Date.now());
      strecke = `<div class="gleis${r < 10000 ? " knapp" : ""}"><i style="width:${100 - r / 600}%"></i></div>`;
      zaehler = `<span id="zeit" class="stand">${Math.ceil(r / 1000)}</span>`;
    } else {
      const ziel = s.g.ziel;
      const wartend = s.id === "reihe" || s.wahl === null;
      const stops = Array.from({ length: ziel }, (_, i) => {
        const x = s.spur[i];
        if (x) return `<li class="halt ${x.ok ? "ok" : "nein"}" data-l="${x.l}"></li>`;
        return `<li class="halt${i === s.spur.length && wartend ? " jetzt" : ""}"></li>`;
      }).join("");
      strecke = `<ol class="strecke" aria-hidden="true">${stops}</ol>`;
      zaehler = `<span class="stand">${Math.min(s.spur.length + (wartend ? 1 : 0), ziel)}/${ziel}</span>`;
    }
    const ohneHalt = s.combo >= 3 ? `${s.combo} richtig in Folge` : "";
    /* Unter der Leiste steht immer, was diese Fahrt übt */
    const bereich = `<span class="unterwegs"${s.b.linie ? ` data-l="${s.b.linie}"` : ""}>${h(s.g.name)} · ${h(linienText(s.b))}${s.b.zeit ? " · Nur " + h(E.ZEITEN[s.b.zeit]) : ""}</span>`;
    return `<div class="leiste"><button class="x" data-a="abbrechen" aria-label="Aussteigen">✕</button>${strecke}${zaehler}</div>
      <div class="combo">${bereich}<span>${s.uhr ? `${s.punkte} Punkte${ohneHalt ? " · " + ohneHalt : ""}` : ohneHalt}</span></div>`;
  }
  function seiteSpiel() {
    const s = spiel;
    const inhalt = s.id === "reihe" ? spielReihe() : spielFrage();
    return `<div class="spielseite"><div class="spielinnen">${leiste()}${inhalt}</div></div>`;
  }
  function kopfFrage(q, offen) {
    if (q.art === "form") {
      const luecke = offen ? `<span class="luecke leer">&nbsp;</span>` : `<span class="luecke neu">${h(q.antwort)}</span>`;
      const subj = q.zeit === "imp" ? "" : `${h(q.subj)}${/'$/.test(q.subj) ? "" : " "}`;
      const zusatz = q.zeit === "imp" ? `Sag es zu: <b>${h(q.subj)}</b> · ` : q.hinweis ? `(${h(q.hinweis)}) · ` : "";
      return `<div class="kicker">${E.ZEITEN[q.zeit]}</div><div class="satz">${subj}${luecke}${q.zeit === "imp" && !offen ? " !" : ""}</div><div class="inf">${zusatz}<b>${h(q.v.inf)}</b></div>`;
    }
    if (q.art === "partizip") return `<div class="kicker">Participe passé von</div><div class="satz">${h(q.v.inf)}</div>`;
    if (q.art === "aux") {
      const luecke = offen ? `<span class="luecke leer">&nbsp;</span>` : `<span class="luecke neu">${h(q.antwort)}</span>`;
      const vor = /'$/.test(q.vor) ? h(q.vor) : h(q.vor) + " ";
      return `<div class="kicker">Passé composé · Gleis avoir oder être?</div><div class="satz">${vor}${luecke} ${h(q.nach)}</div><div class="inf"><b>${h(q.v.inf)}</b></div>`;
    }
    if (q.art === "accord") {
      const luecke = offen ? `<span class="luecke leer">&nbsp;</span>` : `<span class="luecke neu">${h(q.antwort)}</span>`;
      return `<div class="kicker">Partizip angleichen</div><div class="satz">${h(q.vor)} ${luecke}${h(q.nach)}</div><div class="inf">${q.hinweis ? `(${h(q.hinweis)}) · ` : ""}<b>${h(q.v.inf)}</b></div>`;
    }
    return `<div class="kicker">${q.umgekehrt ? "Wie heißt auf Französisch" : "Was heißt"}</div><div class="satz">${h(q.umgekehrt ? q.v.de : q.v.inf)}</div>`;
  }
  function spielFrage() {
    const s = spiel, q = s.frage, offen = s.wahl === null;
    const breit = q.optionen.some((o) => o.text.length > 18);
    const ops = q.optionen.map((o, i) => {
      let k = "";
      if (!offen) { if (o.wert === q.antwort) k = " richtig"; else if (i === s.wahl) k = " falsch"; }
      return `<button class="op${k}" data-a="op" data-w="${i}" ${offen ? "" : "disabled"}>${h(o.text)}</button>`;
    }).join("");
    let rueck = `<div class="rueck ruhe"></div>`;
    if (!offen) {
      const z = s.zuletzt, bed = q.art === "bedeutung" ? "" : `<span>${h(q.v.inf)} = ${h(q.v.de)}</span>`;
      if (z.richtig) rueck = `<div class="rueck gut"><b>${s.uhr ? h(q.voll) : "Richtig: " + h(q.voll)}</b>${bed}</div>`;
      else {
        /* Die Erklärung gibt es auf Wunsch. Im Express läuft die Fahrt sofort weiter, dort entfällt sie. */
        const hilfe = !s.uhr && q.erklaerung;
        rueck = `<div class="rueck schlecht"><div class="rueck-kopf"><b>Richtig wäre: ${h(q.voll)}</b>${hilfe ? `<button class="hilfe" data-a="hilfe" aria-expanded="${!!s.hilfe}" aria-label="Warum?">?</button>` : ""}</div>${hilfe && s.hilfe ? `<span>${h(q.erklaerung)}</span>` : ""}${bed}</div>`;
      }
    }
    return `<section class="frage" data-l="${q.v.typ}">${marke(q.v.typ, true)}${kopfFrage(q, offen)}</section>
      <div class="optionen${breit ? " breit" : ""}">${ops}</div>
      ${rueck}
      ${!offen && !s.uhr ? `<button class="knopf weiter" data-a="weiter">${s.zahl >= s.g.ziel ? "Zum Ergebnis" : "Nächste Station"}</button>` : ""}`;
  }
  function spielReihe() {
    const r = spiel.r;
    const zeilen = r.zeilen.map((z, i) => `<div class="z${i === r.pos ? " dran" : i < r.pos ? " ab" : ""}">${person(z.person)}<span>${i < r.pos ? h(z.form) : ""}</span></div>`).join("");
    const blasen = r.blasen.map((b, i) => `<button class="blase${r.wackel === i ? " wackel" : ""}" data-a="blase" data-w="${i}" ${b.weg ? "disabled" : ""}>${h(b.t)}</button>`).join("");
    return `<section class="frage" data-l="${r.v.typ}">${marke(r.v.typ, true)}<div class="kicker">${E.ZEITEN[r.z]}</div><div class="satz">${h(r.v.inf)}</div><div class="inf">${r.fertig ? h(r.v.de) : "&nbsp;"}</div></section>
      <div class="zeilen${r.z === "subj" ? " que" : ""}" data-l="${r.v.typ}">${zeilen}</div><div class="blasen">${blasen}</div>`;
  }
  function seiteErgebnis() {
    const s = spiel, summe = s.ok + s.nein;
    const anteil = summe ? Math.round((s.ok / summe) * 100) : 0;
    const titel = s.uhr ? (s.neuerRekord ? "Neuer Rekord !" : "Express am Ziel") : anteil >= 90 ? "Excellent !" : anteil >= 70 ? "Très bien !" : anteil >= 50 ? "Pas mal !" : "On continue !";
    const falsch = Array.from(s.falsch.values());
    const neu = Array.from(s.gesehen.values()).filter((v) => !s.falsch.has(v.inf)).slice(0, 8);
    const liste = (vs) => `<div class="verbliste">${vs.map((v) => `<button class="verbzeile" data-a="spielVerb" data-w="${h(v.inf)}" data-l="${v.typ}"><i class="punkt s${fortschritt(v)}"></i><b>${h(v.inf)}</b><span class="de">${h(v.de)}</span></button>`).join("")}</div>`;
    return `<div class="spielseite"><div class="spielinnen">
      <section class="ergebnis">
        <div class="kicker">Terminus</div>
        <h1>${titel}</h1>
        <div class="gross">${s.uhr ? s.punkte : anteil + " %"}</div>
        <p class="leise">${s.uhr ? "Punkte" : `${s.ok} richtig, ${s.nein} falsch`} · ${S.km - s.km0} km gefahren${s.uhr && S.rekord[s.id] ? ` · Rekord ${S.rekord[s.id]}` : ""}</p>
        <p class="leise klein">${h(s.g.name)} · ${h(linienText(s.b))}${s.b.zeit ? " · Nur " + h(E.ZEITEN[s.b.zeit]) : ""}</p>
      </section>
      <div class="knoepfe"><button class="knopf" data-a="nochmal">Nochmal fahren</button><button class="knopf zwei" data-a="abbrechen">Aussteigen</button></div>
      ${falsch.length ? `<section class="spalte"><h2>Diese Verben nochmal anfahren</h2>${liste(falsch)}</section>` : ""}
      ${neu.length ? `<section class="spalte"><h2>Auch dabei</h2>${liste(neu)}</section>` : ""}
    </div></div>`;
  }

  /* ---------- Aktionen ---------- */
  function umschalten(liste, wert) {
    const i = liste.indexOf(wert);
    if (i >= 0) liste.splice(i, 1); else liste.push(wert);
  }
  function oeffneVerb(inf) { a.verb = inf; a.decke = false; a.offen = new Set(); }
  const AKT = {
    tab(w) { a.tab = w; a.setup = a.nurLinie = a.linie = a.verb = a.bahnhof = null; a.suche = ""; a.bestaetige = false; try { history.replaceState(null, "", "#" + w); } catch (e) {} window.scrollTo(0, 0); },
    setup(w) { a.setup = w; window.scrollTo(0, 0); },
    linie(w) { a.linie = w; window.scrollTo(0, 0); },
    verb(w) { oeffneVerb(w); window.scrollTo(0, 0); },
    bahnhof(w) { a.bahnhof = w; window.scrollTo(0, 0); },
    bahnhofFahren(w) { const [z, art] = w.split("|"); S.setup.uhr = art === "uhr"; start("quiz", { zeit: z }); return true; },
    zurueck() { if (a.setup) a.setup = a.nurLinie = null; else if (a.verb) a.verb = null; else if (a.bahnhof) a.bahnhof = null; else a.linie = null; window.scrollTo(0, 0); },
    blau(w) { S.setup.uhr = w === "uhr"; start("blau"); return true; },
    schnell(w) { S.setup.uhr = w === "uhr"; start("quiz"); },
    /* Eine Fahrt nur auf dieser Linie einstellen. Die Linienseite bleibt dahinter, Zurück führt wieder hin. */
    linieUeben(w) { const [id, l] = w.split("|"); a.setup = id; a.nurLinie = l; window.scrollTo(0, 0); },
    alleLinien() { a.nurLinie = null; },
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
    n(w) { S.setup.n = Number(w); sichern(); },
    start() { start(a.setup, { linie: a.nurLinie }); },
    op(w) { antworte(Number(w)); return true; },
    hilfe() { spiel.hilfe = !spiel.hilfe; },
    weiter() { weiter(); return true; },
    blase(w) { blase(Number(w)); return true; },
    abbrechen() { halt(); spiel = null; a.setup = a.nurLinie = null; window.scrollTo(0, 0); },
    nochmal() { const { id, b } = spiel; halt(); spiel = null; start(id, b); return true; },
    spielVerb(w) { halt(); spiel = null; a.setup = a.nurLinie = a.linie = a.bahnhof = null; a.tab = "fahrplan"; oeffneVerb(w); window.scrollTo(0, 0); },
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
  app.addEventListener("input", (ev) => {
    if (ev.target.dataset.i !== "suche") return;
    a.suche = ev.target.value;
    const ziel = document.getElementById("fahrplanInhalt");
    if (ziel) ziel.innerHTML = fahrplanInhalt();
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
    if (spiel.frage && spiel.id !== "reihe") {
      if (/^[1-6]$/.test(ev.key) && spiel.wahl === null) antworte(Number(ev.key) - 1);
      else if ((ev.key === "Enter" || ev.key === " ") && spiel.wahl !== null && !spiel.uhr) { ev.preventDefault(); weiter(); }
    }
  });
  function ausHash() {
    const t = location.hash.slice(1);
    if (TABS[t]) { a.tab = t; a.setup = a.nurLinie = a.linie = a.verb = a.bahnhof = null; }
  }
  window.addEventListener("hashchange", () => { if (!spiel) { ausHash(); zeige(); } });
  ausHash();
  zeige();
})();
