/* Konjugation, Falschoptionen, Fragen und Lernfortschritt. Ohne Bezug zur Oberfläche, damit es testbar bleibt. */
(function (root) {
  "use strict";

  const LINIEN = {
    er:  { kurz: "-er", name: "Verben auf -er", beispiel: "parler" },
    ir:  { kurz: "-ir", unter: "iss", name: "-ir mit -iss-", beispiel: "finir" },
    irk: { kurz: "-ir", name: "-ir ohne -iss-", beispiel: "partir" },
    dre: { kurz: "-dre", name: "Verben auf -dre", beispiel: "attendre" },
    irr: { kurz: "!", name: "Unregelmäßige Verben", beispiel: "faire" }
  };
  const LINIEN_FOLGE = ["er", "ir", "irk", "dre", "irr"];
  /* Reihenfolge = Bahnhöfe des Netzes, in der Folge, in der sie im Unterricht drankommen */
  const ZEITEN = {
    pres: "Présent", imp: "Impératif", fc: "Futur composé", pc: "Passé composé", impf: "Imparfait",
    pr: "Passé récent", prog: "Présent progressif", fs: "Futur simple", pqp: "Plus-que-parfait",
    cond: "Conditionnel présent", subj: "Subjonctif présent"
  };
  const GRUNDZEITEN = ["pres", "pc", "imp"];
  const EINFACH = { impf: 1, fs: 1, cond: 1, subj: 1 };   /* eine Verbform je Person */
  const UMSCHRIEBEN = { fc: 1, pr: 1, prog: 1 };          /* konjugiertes Hilfsverb und Infinitiv */
  const END_IMPF = ["ais", "ais", "ait", "ions", "iez", "aient"];
  const END_FUT = ["ai", "as", "a", "ons", "ez", "ont"];
  const PERSONEN = ["je", "tu", "il/elle/on", "nous", "vous", "ils/elles"];
  const END = {
    er: ["e", "es", "e", "ons", "ez", "ent"],
    ir: ["is", "is", "it", "issons", "issez", "issent"],
    re: ["s", "s", "", "ons", "ez", "ent"]
  };
  const AUX = {
    avoir: ["ai", "as", "a", "avons", "avez", "ont"],
    "être": ["suis", "es", "est", "sommes", "êtes", "sont"]
  };
  const AUX_IMPF = {
    avoir: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
    "être": ["étais", "étais", "était", "étions", "étiez", "étaient"]
  };
  const ALLER = ["vais", "vas", "va", "allons", "allez", "vont"];
  const VENIR = ["viens", "viens", "vient", "venons", "venez", "viennent"];
  /* Zustandsverben: "je suis en train de savoir" sagt niemand, also wird es nicht geübt */
  const KEIN_VERLAUF = new Set(["être", "avoir", "savoir", "pouvoir", "vouloir", "devoir", "connaître", "reconnaître", "naître", "coûter", "peser", "sembler", "plaire", "aimer", "adorer", "détester", "préférer", "désirer", "souhaiter", "espérer", "contenir", "dépendre", "croire"]);

  /* Reflexive Verben: Pronomen vor der Form, Elision vor Vokal und stummem h */
  const PRON = ["me", "te", "se", "nous", "vous", "se"];
  const PRON_KURZ = { me: "m'", te: "t'", se: "s'" };
  const grundInf = (v) => v.inf.replace(/^(se |s')/, "");
  const istRefl = (v) => !!v.reflexiv;
  const nurDritte = (v) => !!v.nurDritte;
  /* Verben, die man abfragen kann: unpersönliche nicht, weil es nur eine Form gibt */
  const uebbar = (v) => !nurDritte(v);

  let zufall = Math.random;
  const setZufall = (f) => { zufall = f; };
  const ganz = (n) => Math.floor(zufall() * n);
  const eins = (a) => a[ganz(a.length)];
  function misch(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = ganz(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }

  const speicher = new Map();
  function konj(v) {
    if (speicher.has(v.inf)) return speicher.get(v.inf);
    const inf = grundInf(v), refl = istRefl(v);
    let pres, pp;
    if (v.typ === "er") ({ pres, pp } = konjEr(v, inf));
    else if (v.typ === "ir") {
      const s = inf.slice(0, -2);
      pres = END.ir.map((e) => s + e); pp = s + "i";
    } else if (v.typ === "irk") {
      const s = inf.slice(0, -2), k = s.slice(0, -1);
      pres = [k + "s", k + "s", k + "t", s + "ons", s + "ez", s + "ent"]; pp = s + "i";
    } else if (v.typ === "dre") {
      const s = inf.slice(0, -2);
      pres = END.re.map((e) => s + e); pp = s + "u";
    } else { pres = v.pres; pp = v.pp; }
    let imp;
    if (v.imp === null || nurDritte(v)) imp = null;
    else if (v.imp) imp = v.imp;
    else imp = [pres[1].replace(/es$/, "e"), pres[3], pres[4]];
    /* Reflexiv: Imperativ nachgestellt, Passé composé immer mit être */
    let impRefl = null;
    if (refl && imp) impRefl = [imp[0] + "-toi", imp[1] + "-nous", imp[2] + "-vous"];
    const impf = imparfait(v, pres), futStamm = futurStamm(v, inf);
    const k = {
      pres, pp, imp: refl ? impRefl : imp,
      impf, futStamm,
      fs: END_FUT.map((e) => futStamm + e),
      cond: END_IMPF.map((e) => futStamm + e),
      subj: v.subjonctif || subjonctif(pres, impf),
      impNackt: imp, refl, grundInf: inf,
      pron: refl ? pres.map((f, i) => pronVor(PRON[i], f)) : null,
      aux: refl ? "être" : (v.aux || "avoir")
    };
    speicher.set(v.inf, k);
    return k;
  }

  /* Stamm aus der nous-Form. Vor -i- entfallen das Dehnungs-e und die Cedille: mangeais, aber mangions */
  function imparfait(v, pres) {
    const st = v.imparfaitStamm || pres[3].slice(0, -3);
    return END_IMPF.map((e) => (e[0] === "i" ? st.replace(/ge$/, "g").replace(/ç$/, "c") : st) + e);
  }
  function futurStamm(v, inf) { return v.futurStamm || (/re$/.test(inf) ? inf.slice(0, -1) : inf); }
  /* Singular und ils aus der ils-Form, nous und vous wie im Imparfait */
  function subjonctif(pres, impf) {
    const st = pres[5].slice(0, -3);
    return [st + "e", st + "es", st + "e", impf[3], impf[4], st + "ent"];
  }

  /* me lève, aber m'appelle */
  function pronVor(pron, form) {
    return (PRON_KURZ[pron] && vokal(form)) ? PRON_KURZ[pron] + form : pron + " " + form;
  }
  /* Präsens mit Reflexivpronomen, Person p */
  const reflPres = (k, p) => pronVor(PRON[p], k.pres[p]);

  function konjEr(v, inf) {
    const s = (inf || v.inf).slice(0, -2);
    let schuh = s;
    if (v.muster === "è") schuh = s.replace(/[eé]([^aeéiou]*)$/, "è$1");
    else if (v.muster === "dopp") schuh = s + s.slice(-1);
    else if (/y$/.test(s)) schuh = s.slice(0, -1) + "i";
    if (v.muster === "y") schuh = s.slice(0, -1) + "i";
    let nous = s;
    if (/g$/.test(s)) nous = s + "e";
    else if (/c$/.test(s)) nous = s.slice(0, -1) + "ç";
    const pres = END.er.map((e, p) => (p === 3 ? nous : p === 4 ? s : schuh) + e);
    return { pres, pp: s + "é" };
  }

  const vokal = (w) => /^[aeiouyàâéèêëîïôûh]/i.test(w);
  const mitSubj = (subj, form) => (subj === "je" && vokal(form) ? "j'" + form : subj + " " + form);
  const subjVor = (subj, form) => (subj === "je" && vokal(form) ? "j'" : subj);
  /* Subjonctif: que je, que j', qu'il */
  function queVor(subj, form) {
    if (/^(il|elle|on)/.test(subj)) return "qu'" + subj;
    return "que " + subjVor(subj, form);
  }
  const verbinde = (vorn, form) => (/'$/.test(vorn) ? vorn + form : vorn + " " + form);

  /* Infinitiv mit dem passenden Pronomen, bei reflexiven Verben: me lever, m'appeler */
  const infFuer = (k, p) => (k.refl ? pronVor(PRON[p], k.grundInf) : k.grundInf);
  const deVor = (rest) => (vokal(rest) ? "d'" + rest : "de " + rest);
  function umschrieben(k, zeit, p) {
    const inf = infFuer(k, p);
    if (zeit === "fc") return ALLER[p] + " " + inf;
    if (zeit === "pr") return VENIR[p] + " " + deVor(inf);
    return AUX["être"][p] + " en train " + deVor(inf);
  }

  /* Endet das Partizip schon auf -s (mis, assis), kommt im männlichen Plural nichts dazu */
  function endung(pp, g, pl) {
    const basis = pp + (g === "f" ? "e" : "");
    return basis + (pl && !/s$/.test(basis) ? "s" : "");
  }

  /* Personen fürs Passé composé. Bei être muss das Geschlecht klar sein, sonst gäbe es mehrere richtige Antworten. */
  const PC_AVOIR = [
    { t: "je", p: 0 }, { t: "tu", p: 1 }, { t: "il", p: 2 }, { t: "elle", p: 2 }, { t: "on", p: 2 },
    { t: "nous", p: 3 }, { t: "vous", p: 4 }, { t: "ils", p: 5 }, { t: "elles", p: 5 }
  ];
  const PC_ETRE = [
    { t: "je", h: "Emma", p: 0, g: "f" }, { t: "je", h: "Hugo", p: 0, g: "m" },
    { t: "tu", h: "Léa", p: 1, g: "f" }, { t: "tu", h: "Théo", p: 1, g: "m" },
    { t: "il", p: 2, g: "m" }, { t: "elle", p: 2, g: "f" },
    { t: "nous", h: "Emma et Léa", p: 3, g: "f", pl: 1 }, { t: "nous", h: "Hugo et Léa", p: 3, g: "m", pl: 1 },
    { t: "vous", h: "Léa et Inès", p: 4, g: "f", pl: 1 }, { t: "vous", h: "Théo et Hugo", p: 4, g: "m", pl: 1 },
    { t: "ils", p: 5, g: "m", pl: 1 }, { t: "elles", p: 5, g: "f", pl: 1 }
  ];

  /* Für die Tabellen */
  function tabelle(v) {
    const k = konj(v), etre = k.aux === "être";
    const marke = ["(e)", "(e)", "(e)", "(e)s", "(e)(s)", "(e)s"];
    const einzig = nurDritte(v);
    const wer = (p) => (einzig ? "il" : PERSONEN[p]);
    const zeile = (p, form) => ({ person: subjVor(wer(p), form), form, voll: mitSubj(wer(p), form) });
    const zeileQue = (p, form) => { const vorn = queVor(wer(p), form); return { person: vorn, form, voll: verbinde(vorn, form) }; };
    /* il y a → il y a eu: was vor der Verbform steht, bleibt auch im Passé composé vorn */
    const vorsatz = einzig && k.pres[2] && k.pres[2].includes(" ") ? k.pres[2].split(" ").slice(0, -1).join(" ") + " " : "";
    const da = (p) => k.pres[p] !== null && k.pres[p] !== undefined && (!einzig || p === 2);
    const zusammen = (hilfs) => hilfs[k.aux].map((a, p) => {
      if (!da(p)) return null;
      const kern = vorsatz + a + " " + k.pp + (etre ? marke[p] : "");
      return zeile(p, k.refl ? pronVor(PRON[p], kern) : kern);
    }).filter(Boolean);
    const einfach = (z) => k[z].map((f, p) => {
      if (!da(p)) return null;
      return (z === "subj" ? zeileQue : zeile)(p, k.refl ? pronVor(PRON[p], f) : f);
    }).filter(Boolean);
    const zeiten = zeitenVon(v);
    const umschr = (z) => (zeiten.includes(z) ? [0, 1, 2, 3, 4, 5].map((p) => zeile(p, umschrieben(k, z, p))) : null);
    return {
      pres: k.pres.map((f, p) => (da(p) ? zeile(p, k.refl ? reflPres(k, p) : f) : null)).filter(Boolean),
      pc: zusammen(AUX),
      imp: k.imp ? k.imp.map((f, i) => ({ person: ["tu", "nous", "vous"][i], form: f, voll: f + " !" })) : null,
      impf: einfach("impf"), pqp: zusammen(AUX_IMPF), fs: einfach("fs"), cond: einfach("cond"), subj: einfach("subj"),
      fc: umschr("fc"), pr: umschr("pr"), prog: umschr("prog")
    };
  }

  function optionen(antwort, stufen, n, verboten) {
    const raus = new Set([antwort].concat(verboten || []));
    const genutzt = new Set(), wahl = [];
    const reste = stufen.map((s) => misch(s.filter(Boolean)));
    let weiter = true;
    while (wahl.length < n - 1 && weiter) {
      weiter = false;
      for (const s of reste) {
        while (s.length) {
          const c = s.shift();
          if (!raus.has(c) && !genutzt.has(c)) { genutzt.add(c); wahl.push(c); weiter = true; break; }
        }
        if (wahl.length >= n - 1) break;
      }
    }
    const teile = antwort.split(" "), letztes = teile.pop(), vorne = teile.length ? teile.join(" ") + " " : "";
    for (const e of ["s", "e", "t", "x", "es", "ent", "ons", "ez", "é", "i", "u", "is"]) {
      if (wahl.length >= n - 1) break;
      for (const c of [vorne + letztes + e, vorne + letztes.slice(0, -1) + e]) {
        if (wahl.length < n - 1 && !raus.has(c) && !genutzt.has(c)) { genutzt.add(c); wahl.push(c); }
      }
    }
    return misch([antwort].concat(wahl));
  }

  const basis = (v) => v.inf.replace(/(oir|re|er|ir)$/, "");

  /* Formen, die bei -ayer ebenfalls richtig sind (je paye) und deshalb nie als falsch angeboten werden dürfen */
  function auchRichtig(v) {
    if (!/ayer$/.test(v.inf)) return [];
    const s = v.inf.slice(0, -2);
    return [0, 1, 2, 5].map((p) => s + END.er[p]);
  }

  /* Auch bei Futur, Conditionnel und Subjonctif gibt es bei -ayer zwei richtige Schreibungen */
  function auchRichtigIn(v, zeit) {
    if (!EINFACH[zeit] || zeit === "impf") return auchRichtig(v);
    if (!/ayer$/.test(v.inf)) return [];
    const s = v.inf.slice(0, -2);
    if (zeit === "fs") return END_FUT.map((e) => s + "er" + e);
    if (zeit === "cond") return END_IMPF.map((e) => s + "er" + e);
    return [0, 1, 2, 5].map((p) => s + END.er[p]);
  }

  function falschEinfach(v, zeit, p) {
    const k = konj(v), f = k[zeit], personen = f.filter((_, i) => i !== p), inf = k.grundInf;
    const ohneEndung = inf.replace(/(oir|re|er|ir)$/, "");
    const infStamm = /re$/.test(inf) ? inf.slice(0, -1) : inf;
    if (zeit === "impf") {
      const st = f[0].slice(0, -3);
      return [personen, [ohneEndung + END_IMPF[p], k.pres[p]], [st + END_FUT[p], infStamm + END_IMPF[p], inf]];
    }
    if (zeit === "fs") {
      return [personen, [infStamm + END_FUT[p], inf + END_FUT[p]], [k.pres[p], k.futStamm.slice(0, -1) + END_FUT[p], inf]];
    }
    if (zeit === "cond") {
      return [personen, [k.fs[p], k.impf[p]], [infStamm + END_IMPF[p], inf + END_IMPF[p], k.pres[p]]];
    }
    const st = f[0].replace(/e$/, "");
    return [personen, [k.pres[p], k.impf[p]], [ohneEndung + ["e", "es", "e", "ions", "iez", "ent"][p], st + ["a", "as", "a", "ons", "ez", "ont"][p], inf]];
  }

  function falschUmschrieben(v, zeit, p) {
    const k = konj(v), inf = infFuer(k, p), de = deVor(inf);
    const andere = [0, 1, 2, 3, 4, 5].filter((i) => i !== p);
    const pp = k.refl ? pronVor(PRON[p], k.pp) : k.pp;
    const prae = k.refl ? reflPres(k, p) : k.pres[p];
    const pron = k.refl ? andere.map((i) => pronVor(PRON[i], k.grundInf)) : [];
    if (zeit === "fc") {
      return [andere.map((i) => ALLER[i] + " " + inf), [ALLER[p] + " " + pp, ALLER[p] + " " + prae], [AUX["être"][p] + " " + inf, AUX.avoir[p] + " " + inf, VENIR[p] + " " + inf], pron.map((x) => ALLER[p] + " " + x)];
    }
    if (zeit === "pr") {
      return [andere.map((i) => VENIR[i] + " " + de), [VENIR[p] + " " + inf, VENIR[p] + " " + deVor(pp)], [ALLER[p] + " " + de, AUX.avoir[p] + " " + de], pron.map((x) => VENIR[p] + " " + deVor(x))];
    }
    const e = AUX["être"][p] + " en train ";
    return [andere.map((i) => AUX["être"][i] + " en train " + de), [e + inf, AUX.avoir[p] + " en train " + de], [e + deVor(pp), e + "à " + inf, ALLER[p] + " en train " + de], pron.map((x) => e + deVor(x))];
  }

  function falschPraesens(v, p) {
    const k = konj(v), b = basis(v), andere = k.pres.filter((_, i) => i !== p);
    let muster = [];
    if (v.typ === "er") {
      muster = [v.inf.slice(0, -2) + END.er[p], v.inf, k.pp, p === 5 ? b + "ont" : "", p === 3 ? b + "on" : ""];
    } else if (v.typ === "ir") {
      muster = [b + END.er[p], b + END.re[p], k.pp, p >= 3 ? b + "is" + END.er[p] : "", v.inf];
    } else if (v.typ === "irk") {
      muster = [b + END.ir[p], b + END.er[p], k.pp, v.inf];
    } else if (v.typ === "dre") {
      const s = v.inf.slice(0, -2);
      muster = [s + END.er[p], s + END.ir[p], k.pp, p === 2 ? s.slice(0, -1) + "t" : "", p === 5 ? s + "ont" : "", v.inf];
    } else {
      const sing = k.pres[0].replace(/[sx]$/, "");
      muster = [b + END.er[p], sing + END.er[p], sing + END.re[p], b + END.re[p], v.inf, k.pp];
    }
    const gemerkt = (v.fehler && v.fehler[p]) || [];
    return gemerkt.length ? [gemerkt, muster, andere] : [andere, muster];
  }

  function falschePartizipien(v) {
    const k = konj(v), b = basis(v);
    return [
      (v.ppFehler || []).concat([v.inf, k.pres[4]]),
      [b + "é", b + "i", b + "u", k.pres[2]],
      [b + "is", /[tî]$/.test(b) ? "" : b + "it", k.pp + "e", k.pp + "s"]
    ];
  }

  function frageForm(v, zeit, n) {
    const k = konj(v);
    let subj, antwort, stufen, verboten = auchRichtigIn(v, zeit), hinweis = null, p;
    const personWuerfeln = () => {
      p = ganz(6);
      subj = p === 2 ? eins(["il", "elle", "on"]) : p === 5 ? eins(["ils", "elles"]) : PERSONEN[p];
    };
    if (zeit === "pres") {
      personWuerfeln();
      antwort = k.refl ? reflPres(k, p) : k.pres[p];
      stufen = falschPraesens(v, p);
      if (k.refl) {
        const falschesPron = PRON.map((pr, i) => (i === p ? "" : pronVor(pr, k.pres[p])));
        stufen = [falschesPron].concat(stufen.map((s) => s.filter(Boolean).map((f) => pronVor(PRON[p], f))));
        verboten = verboten.concat(k.pres.map((f, i) => pronVor(PRON[i], f)).filter((_, i) => i === p));
      }
    } else if (EINFACH[zeit]) {
      personWuerfeln();
      const wickel = (f) => (k.refl ? pronVor(PRON[p], f) : f);
      antwort = wickel(k[zeit][p]);
      stufen = falschEinfach(v, zeit, p).map((s) => s.filter(Boolean).map(wickel));
      if (k.refl) stufen.unshift(PRON.map((pr, i) => (i === p ? "" : pronVor(pr, k[zeit][p]))));
    } else if (UMSCHRIEBEN[zeit]) {
      personWuerfeln();
      antwort = umschrieben(k, zeit, p);
      stufen = falschUmschrieben(v, zeit, p);
    } else if (zeit === "pc" || zeit === "pqp") {
      const hilfs = zeit === "pqp" ? AUX_IMPF : AUX;
      const etre = k.aux === "être", s = eins(etre ? PC_ETRE : PC_AVOIR);
      p = s.p; subj = s.t; hinweis = s.h || null;
      const pp = etre ? endung(k.pp, s.g, s.pl) : k.pp;
      const aux = hilfs[k.aux][p], gegen = hilfs[etre ? "avoir" : "être"][p];
      const wickel = (f) => (k.refl ? pronVor(PRON[p], f) : f);
      antwort = wickel(aux + " " + pp);
      const falschPP = falschePartizipien(v);
      stufen = [
        [gegen + " " + k.pp, gegen + " " + pp].map(wickel),
        [0, 1, 2, 3, 4, 5].filter((i) => i !== p).map((i) => wickel(hilfs[k.aux][i] + " " + pp)),
        falschPP[0].concat(falschPP[1]).map((f) => wickel(aux + " " + f)),
        (etre ? [k.pp, endung(k.pp, "f"), endung(k.pp, "m", 1), endung(k.pp, "f", 1)] : [endung(k.pp, "f"), endung(k.pp, "m", 1)]).map((f) => wickel(aux + " " + f)),
        zeit === "pqp" ? [wickel(AUX[k.aux][p] + " " + pp)] : [k.refl ? reflPres(k, p) : k.pres[p]],
        k.refl ? PRON.map((pr, i) => (i === p ? "" : pronVor(pr, aux + " " + pp))) : []
      ];
    } else {
      const i = ganz(3);
      p = [1, 3, 4][i];
      subj = ["tu", "nous", "vous"][i];
      antwort = k.imp[i];
      if (k.refl) {
        const falschAnhang = ["-toi", "-nous", "-vous"].map((an, j) => (j === i ? "" : k.impNackt[i] + an));
        stufen = [
          falschAnhang,
          [k.impNackt[i], reflPres(k, p), pronVor(PRON[p], k.impNackt[i])],
          [k.imp.filter((_, j) => j !== i).join("") ? k.imp[(i + 1) % 3] : "", v.inf, k.pp]
        ];
      } else {
        stufen = [[k.pres[p]].concat(k.imp.filter((_, j) => j !== i)), [i === 0 ? antwort + "s" : "", i === 0 && /s$/.test(antwort) ? antwort.slice(0, -1) : "", k.pres[2], k.pres[5]], [v.inf, k.pp]];
      }
    }
    const vorn = zeit === "imp" ? subj : zeit === "subj" ? queVor(subj, antwort) : subjVor(subj, antwort);
    const voll = zeit === "imp" ? antwort + " !" : verbinde(vorn, antwort);
    return {
      art: "form", v, zeit, schluessel: v.inf + "|" + zeit, antwort, voll, hinweis,
      subj: vorn,
      optionen: optionen(antwort, stufen, n, verboten).map((o) => ({ text: o, wert: o })),
      erklaerung: erklaere(v, zeit, antwort)
    };
  }

  function partizipGrund(v, pp) {
    if (v.typ === "er" && /é$/.test(pp)) return "Verben auf -er bilden das Partizip auf -é.";
    if ((v.typ === "ir" || v.typ === "irk") && /i$/.test(pp)) return "Verben auf -ir bilden das Partizip meist auf -i.";
    if (v.typ === "dre" && /u$/.test(pp)) return "Verben auf -dre bilden das Partizip auf -u.";
    return "Dieses Partizip ist unregelmäßig, das lernt man auswendig.";
  }
  function fragePartizip(v, n) {
    const k = konj(v);
    return {
      art: "partizip", v, zeit: "pc", schluessel: v.inf + "|pc", antwort: k.pp, voll: v.inf + " → " + k.pp,
      optionen: optionen(k.pp, falschePartizipien(v), n).map((o) => ({ text: o, wert: o })),
      erklaerung: partizipGrund(v, k.pp)
    };
  }

  function frageHilfsverb(v) {
    const k = konj(v);
    return {
      art: "aux", v, zeit: "pc", schluessel: v.inf + "|pc", antwort: k.aux,
      voll: mitSubj("il", k.refl ? pronVor(PRON[2], AUX[k.aux][2] + " " + k.pp) : AUX[k.aux][2] + " " + k.pp),
      optionen: [{ text: "Gleis avoir", wert: "avoir" }, { text: "Gleis être", wert: "être" }],
      erklaerung: k.refl ? "Reflexive Verben fahren immer auf Gleis être." : k.aux === "être" ? "Bewegung oder Zustandswechsel: Gleis être." : "Die allermeisten Verben fahren auf Gleis avoir."
    };
  }

  /* Angleichung des Partizips: Die Optionen sind immer die vier Formen desselben Partizips */
  function angleichGrund(pp, g, pl) {
    const art = (g === "f" ? "weiblich" : "männlich") + (pl ? " Plural" : " Singular");
    if (g !== "f" && pl && /s$/.test(pp)) return `Hier ${art}, und das Partizip endet schon auf -s.`;
    const rest = endung(pp, g, pl).slice(pp.length);
    return `Hier ${art}, also ${rest ? "-" + rest : "keine Endung"}.`;
  }
  function angleichOptionen(pp) {
    return Array.from(new Set([endung(pp, "m"), endung(pp, "f"), endung(pp, "m", 1), endung(pp, "f", 1)])).map((o) => ({ text: o, wert: o }));
  }
  function frageAngleichung(v) {
    const k = konj(v), etre = k.aux === "être", s = eins(etre ? PC_ETRE : PC_AVOIR);
    const aux = AUX[k.aux][s.p];
    const antwort = etre ? endung(k.pp, s.g, s.pl) : k.pp;
    const vor = mitSubj(s.t, k.refl ? pronVor(PRON[s.p], aux) : aux);
    return {
      art: "accord", v, zeit: "pc", schluessel: v.inf + "|acc", antwort, vor, nach: "", hinweis: s.h || null,
      voll: vor + " " + antwort, optionen: angleichOptionen(k.pp),
      erklaerung: k.refl ? "Reflexive Verben fahren auf Gleis être: Das Partizip richtet sich nach dem Subjekt. " + angleichGrund(k.pp, s.g, s.pl)
        : etre ? "Gleis être: Das Partizip richtet sich nach dem Subjekt. " + angleichGrund(k.pp, s.g, s.pl)
        : "Gleis avoir: Das Partizip bleibt unverändert."
    };
  }
  /* Sätze zur Angleichung bei avoir. davor: Das direkte Objekt steht vor dem Verb. */
  const ANGLEICH_SAETZE = [
    { vor: "Cette chanson ? Je l'ai", inf: "écouter", davor: 1, g: "f" },
    { vor: "Les photos ? Je les ai", inf: "regarder", davor: 1, g: "f", pl: 1 },
    { vor: "Ces livres ? Je les ai", inf: "lire", davor: 1, g: "m", pl: 1 },
    { vor: "Ta sœur ? Je l'ai", nach: " hier", inf: "voir", davor: 1, g: "f" },
    { vor: "Les clés ? Nous les avons", inf: "trouver", davor: 1, g: "f", pl: 1 },
    { vor: "Mon sac ? Je l'ai", inf: "perdre", davor: 1, g: "m" },
    { vor: "La lettre que j'ai", inf: "écrire", davor: 1, g: "f" },
    { vor: "Les films que nous avons", inf: "voir", davor: 1, g: "m", pl: 1 },
    { vor: "Les fleurs que Léa a", inf: "acheter", davor: 1, g: "f", pl: 1 },
    { vor: "La robe que tu as", inf: "choisir", davor: 1, g: "f" },
    { vor: "Les gâteaux qu'ils ont", inf: "faire", davor: 1, g: "m", pl: 1 },
    { vor: "La voiture qu'il a", inf: "vendre", davor: 1, g: "f" },
    { vor: "Les amies que j'ai", inf: "inviter", davor: 1, g: "f", pl: 1 },
    { vor: "La décision qu'elle a", inf: "prendre", davor: 1, g: "f" },
    { vor: "Les fenêtres que tu as", inf: "ouvrir", davor: 1, g: "f", pl: 1 },
    { vor: "Les règles que vous avez", inf: "comprendre", davor: 1, g: "f", pl: 1 },
    { vor: "Le train que nous avons", inf: "attendre", davor: 1, g: "m" },
    { vor: "J'ai", nach: " la lettre", inf: "écrire" },
    { vor: "Léa a", nach: " les fleurs", inf: "acheter" },
    { vor: "Nous avons", nach: " les films", inf: "voir" },
    { vor: "Elle a", nach: " la décision", inf: "prendre" },
    { vor: "Tu as", nach: " les fenêtres", inf: "ouvrir" },
    { vor: "Ils ont", nach: " la voiture", inf: "vendre" }
  ];
  function frageObjektSatz(s, v) {
    const k = konj(v), antwort = s.davor ? endung(k.pp, s.g, s.pl) : k.pp, nach = s.nach || "";
    return {
      art: "accord", v, zeit: "pc", schluessel: v.inf + "|acc", antwort, vor: s.vor, nach, hinweis: null,
      voll: s.vor + " " + antwort + nach, optionen: angleichOptionen(k.pp),
      erklaerung: s.davor ? "Das direkte Objekt steht vor dem Verb: Das Partizip richtet sich danach. " + angleichGrund(k.pp, s.g, s.pl) : "Das direkte Objekt steht hinter dem Verb: Das Partizip bleibt unverändert."
    };
  }

  function frageBedeutung(v, alle, n) {
    const umgekehrt = zufall() < 0.35;
    const feld = umgekehrt ? "inf" : "de";
    const antwort = v[feld];
    const andere = alle.filter((x) => x.inf !== v.inf && x.de !== v.de).map((x) => x[feld]);
    const wahl = misch(Array.from(new Set(andere))).slice(0, n - 1);
    return {
      art: "bedeutung", v, umgekehrt, schluessel: v.inf + "|de", antwort, voll: v.inf + " = " + v.de,
      optionen: misch([antwort].concat(wahl)).map((o) => ({ text: o, wert: o })),
      erklaerung: ""
    };
  }

  function erklaere(v, zeit, antwort) {
    const k = konj(v);
    if (zeit === "impf") return (v.imparfaitStamm ? "Eigener Stamm: " + v.imparfaitStamm + "-" : "Stamm aus der nous-Form (nous " + k.pres[3] + ")") + ", dazu -ais, -ais, -ait, -ions, -iez, -aient.";
    if (zeit === "pqp") return "Hilfsverb " + k.aux + " im Imparfait und Partizip " + k.pp + "." + (k.aux === "être" ? " Mit être richtet sich das Partizip nach dem Subjekt." : "");
    if (zeit === "fs") return (v.futurStamm ? "Stamm merken: " + k.futStamm + "-" : "Stamm aus dem Infinitiv: " + k.futStamm + "-") + ", dazu -ai, -as, -a, -ons, -ez, -ont.";
    if (zeit === "cond") return "Stamm wie im Futur simple (" + k.futStamm + "-), Endungen wie im Imparfait.";
    if (zeit === "subj") return v.subjonctif ? "Diese Formen merken: que je " + k.subj[0] + ", que nous " + k.subj[3] + "." : "Stamm aus der ils-Form (ils " + k.pres[5] + "), dazu -e, -es, -e, -ions, -iez, -ent.";
    if (zeit === "fc") return "aller im Präsens und der Infinitiv" + (k.refl ? " mit passendem Pronomen." : ".");
    if (zeit === "pr") return "venir de und der Infinitiv: etwas ist gerade eben passiert.";
    if (zeit === "prog") return "être en train de und der Infinitiv: etwas passiert gerade jetzt.";
    if (k.refl && zeit === "pres") return "Das Reflexivpronomen passt zur Person und steht vor dem Verb: " + reflPres(k, 0) + ", " + reflPres(k, 3) + ".";
    if (k.refl && zeit === "pc") return "Reflexive Verben bilden das Passé composé immer mit être, das Partizip richtet sich nach dem Subjekt.";
    if (k.refl && zeit === "imp") return "Im Imperativ steht das Pronomen hinter dem Verb: " + k.imp.join(", ") + ".";
    if (zeit === "pc") {
      return "Hilfsverb " + k.aux + ", Partizip " + k.pp + "." + (k.aux === "être" ? " Mit être richtet sich das Partizip nach dem Subjekt." : "");
    }
    if (zeit === "imp") {
      if (v.imp) return "Besondere Formen merken: " + v.imp.join(", ") + ".";
      if (/e$/.test(k.imp[0]) && k.pres[1] !== k.imp[0]) return "Bei tu fällt das -s weg: " + k.imp[0] + " !";
      return "Imperativ: Präsens ohne Pronomen.";
    }
    if (v.typ === "irr") return v.tipp || "Unregelmäßig: diese Form auswendig lernen.";
    if (v.typ === "ir") return "Wie finir: -is, -is, -it, -issons, -issez, -issent.";
    if (v.typ === "irk") return "Ohne -iss-: je pars, nous partons, ils partent.";
    if (v.typ === "dre") return "Wie attendre: -s, -s, -, -ons, -ez, -ent. Bei il kommt keine Endung dazu.";
    if (/ger$/.test(v.inf)) return "Vor -ons bleibt das e, damit das g weich klingt: nous " + k.pres[3] + ".";
    if (/cer$/.test(v.inf)) return "Vor -ons steht ç, damit es weich klingt: nous " + k.pres[3] + ".";
    if (v.muster) return "Bei je, tu, il und ils ändert sich der Stamm: " + k.pres[0] + ", aber nous " + k.pres[3] + ".";
    if (/yer$/.test(v.inf)) return "Bei je, tu, il und ils wird y zu i: " + k.pres[0] + ".";
    return "Endungen: -e, -es, -e, -ons, -ez, -ent.";
  }

  /* Lernstand: Kästchen 0 bis 5 je Verb und Zeit. Was wackelt, kommt öfter dran. */
  const GEWICHT = [10, 7, 5, 3, 2, 1];
  const NEU = 8;
  function waehle(verben, schluesselVon, stats, letztes) {
    const feld = verben.length > 1 ? verben.filter((v) => v.inf !== letztes) : verben;
    const g = feld.map((v) => { const s = stats[schluesselVon(v)]; return s ? GEWICHT[s.box] : NEU; });
    let r = zufall() * g.reduce((a, b) => a + b, 0);
    for (let i = 0; i < feld.length; i++) { r -= g[i]; if (r < 0) return feld[i]; }
    return feld[feld.length - 1];
  }
  function buche(stats, schluessel, richtig) {
    const s = stats[schluessel] || (stats[schluessel] = { box: 0, ok: 0, nein: 0 });
    if (richtig) { s.box = Math.min(s.box + 1, 5); s.ok++; } else { s.box = Math.max(s.box - 2, 0); s.nein++; }
    return s;
  }
  /* Welche Zeiten es bei diesem Verb überhaupt gibt. Was der Lernstand freigibt, entscheidet die Oberfläche. */
  function zeitenVon(v) {
    const k = konj(v), einzig = nurDritte(v);
    return Object.keys(ZEITEN).filter((z) => {
      if (z === "imp") return !!k.imp;
      if (UMSCHRIEBEN[z] && einzig) return false;       /* il faut hat keinen brauchbaren Infinitiv */
      if (z === "prog" && KEIN_VERLAUF.has(k.grundInf)) return false;
      return true;
    });
  }
  /* 0 = noch nicht geübt, 1 = begonnen, 2 = wird sicher, 3 = sitzt */
  function stufe(v, stats, welche) {
    const zeiten = welche && welche.length ? welche : GRUNDZEITEN.filter((z) => zeitenVon(v).includes(z));
    const boxen = zeiten.map((z) => (stats[v.inf + "|" + z] ? stats[v.inf + "|" + z].box : -1));
    if (boxen.every((b) => b < 0)) return 0;
    const schnitt = boxen.reduce((a, b) => a + Math.max(b, 0), 0) / boxen.length;
    return schnitt >= 3.5 ? 3 : schnitt >= 1.5 ? 2 : 1;
  }

  root.Engine = {
    LINIEN, LINIEN_FOLGE, ZEITEN, PERSONEN, AUX, END,
    konj, tabelle, mitSubj, misch, eins, setZufall, uebbar, istRefl, nurDritte, grundInf, reflPres, PRON,
    frageForm, fragePartizip, frageHilfsverb, frageAngleichung, frageObjektSatz, ANGLEICH_SAETZE, frageBedeutung,
    waehle, buche, stufe, zeitenVon, auchRichtig
  };
})(typeof window !== "undefined" ? window : globalThis);
