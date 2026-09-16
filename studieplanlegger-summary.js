/* ═══════════════════════════════════════════
   studieplanlegger-summary.js
   Mellomsteg mellom studieplanleggeren og søknaden.

   Før: «+» sendte emnet rett inn i sidepanelet, som spurte om
   studieprogram og gjennomføring med én gang.
   Nå: «+» samler emnet i et «Sammendrag» ved siden av planleggeren.
   Først «Gå videre» åpner sidebaren, og alle valgene – studieprogram,
   gjennomføring og studiestart – tas der.

   Filen laster etter den innebygde planleggerkoden på studiesiden og
   erstatter de globale funksjonene den hektet på klikkene.
   ═══════════════════════════════════════════ */

(function() {

if (typeof spCart === 'undefined') return;

/* ─── Hjelpere ─── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* 7.5 → «7,5», 15 → «15» */
function fmtPts(n) {
  var v = parseFloat(n) || 0;
  return (v % 1 === 0 ? String(v) : v.toFixed(1)).replace('.', ',');
}

function fmtKr(n) {
  return String(parseInt(n, 10) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* Emnene som er valgt, men ennå ikke sendt inn i søknaden. Et emne regnes som
   sendt inn i det studenten har valgt program (eller frittstående) for det –
   samme skille som spSyncToBasketInner allerede bruker. */
function spPendingList() {
  /* Emnekodene er tall, så nøkkelrekkefølgen i spCart blir numerisk. Sammendraget
     skal i stedet følge studieløpet, altså rekkefølgen radene står i. */
  var radRekkefolge = {};
  document.querySelectorAll('.sp-course-row[data-code]').forEach(function(row, i) {
    if (!(row.dataset.code in radRekkefolge)) radRekkefolge[row.dataset.code] = i;
  });
  return Object.keys(spCart)
    .filter(function(code) {
      var c = spCart[code];
      return c && !c.program && !c.loose;
    })
    .sort(function(a, b) {
      var ia = (a in radRekkefolge) ? radRekkefolge[a] : Infinity;
      var ib = (b in radRekkefolge) ? radRekkefolge[b] : Infinity;
      return ia - ib;
    })
    .map(function(code) {
      var c = spCart[code];
      return { code: code, name: c.name, pts: c.pts, price: c.price, url: c.url || null };
    });
}

/* Alt studenten har valgt i planleggeren, uansett om det alt ligger i søknaden.
   Sammendraget viser begge deler som like rader. */
function spValgteEmner() {
  var radRekkefolge = {};
  document.querySelectorAll('.sp-course-row[data-code]').forEach(function(row, i) {
    if (!(row.dataset.code in radRekkefolge)) radRekkefolge[row.dataset.code] = i;
  });
  return Object.keys(spCart)
    .sort(function(a, b) {
      var ia = (a in radRekkefolge) ? radRekkefolge[a] : Infinity;
      var ib = (b in radRekkefolge) ? radRekkefolge[b] : Infinity;
      return ia - ib;
    })
    .map(function(code) {
      var c = spCart[code];
      return { code: code, name: c.name, pts: c.pts, price: c.price, url: c.url || null };
    });
}

function spMarkRow(code, valgt) {
  document.querySelectorAll('.sp-course-row[data-code="' + code + '"] .sp-add-btn').forEach(function(b) {
    if (b.classList.contains('completed')) return;
    b.classList.toggle('added', !!valgt);
    b.textContent = valgt ? '✓' : '+';
  });
}

/* ─── Sammendraget ved siden av planleggeren ─── */
/* Arket legges sist i <body>: sidens egen <style> står der, og en regel i
   <head> ville tapt kaskaden mot den (blant annet bredden på .sp-inner). */
var SUMMARY_CSS = '\
/* Planleggeren deler nå plassen med sammendraget og trenger mer bredde. */\
.sp-inner{max-width:1180px}\
.sp-wrap{display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:28px;align-items:start}\
.sp-main{min-width:0}\
/* Faste kolonner for poeng og pris, så radene står på linje nedover. */\
.sp-course-row{padding:16px 24px;gap:16px}\
.sp-badge{min-width:76px;text-align:center}\
.sp-price{min-width:92px;font-variant-numeric:tabular-nums;font-family:\'Produkt\',\'Source Serif 4\',Georgia,serif}\
.sp-bestill-alle:disabled{background:#D4D4D4;color:#5C5C5C;cursor:default}\
.sp-bestill-alle:disabled:hover{background:#D4D4D4}\
/* Valgt emne: hvit knapp med kryss, tegnet i CSS så den ikke er avhengig av\
   hvilket tegn de ulike kodestiene setter i knappen. */\
.sp-add-btn{box-sizing:border-box}\
.sp-add-btn.added:not(.completed){position:relative;background:#fff;border:1.5px solid #1A1A1A;color:transparent;font-size:0}\
.sp-add-btn.added:not(.completed):hover{background:#F5F5F5}\
.sp-add-btn.added:not(.completed)::before,.sp-add-btn.added:not(.completed)::after{content:"";position:absolute;left:50%;top:50%;width:14px;height:1.8px;border-radius:1px;background:#1A1A1A}\
.sp-add-btn.added:not(.completed)::before{transform:translate(-50%,-50%) rotate(45deg)}\
.sp-add-btn.added:not(.completed)::after{transform:translate(-50%,-50%) rotate(-45deg)}\
\
.sp-side{position:sticky;top:88px;min-width:0}\
.sp-summary{display:flex;flex-direction:column;max-height:calc(100vh - 116px);background:#fff;border-radius:8px;overflow:hidden;}\
.sp-sum-head{flex-shrink:0;display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:24px 24px 14px}\
.sp-sum-head h3{font-size:22px;font-weight:600;color:#1A1A1A;margin:0;line-height:1.2}\
.sp-sum-count{font-size:13px;font-weight:600;color:#5c5c5c;white-space:nowrap}\
.sp-sum-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 24px;scrollbar-width:thin;scrollbar-color:#d4d4d4 transparent}\.sp-sum-scroll::-webkit-scrollbar{width:6px}\.sp-sum-scroll::-webkit-scrollbar-track{background:transparent}\.sp-sum-scroll::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:3px}\
.sp-sum-list{border-top:1px solid #1A1A1A;border-bottom:1px solid #1A1A1A}\
.sp-sum-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto 28px;align-items:start;gap:6px 14px;padding:14px 0;border-bottom:1px solid #E6E6E6}\
.sp-sum-row:last-child{border-bottom:none}\
.sp-sum-name{min-width:0;font-size:14px;color:#1A1A1A;line-height:1.35;text-decoration:underline;text-underline-offset:2px}\
/* Sidens globale a-regel tegner en 2px bunnstrek i full boksbredde – her skal\
   understrekingen følge teksten. */\
a.sp-sum-name,a.sp-sum-name:hover{border:none}\
a.sp-sum-name:hover{color:#46000A}\
.sp-sum-pts{font-size:13px;line-height:19px;color:#5c5c5c;white-space:nowrap;text-align:right}\
.sp-sum-price{font-size:13px;line-height:19px;color:#1A1A1A;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;font-family:\'Produkt\',\'Source Serif 4\',Georgia,serif}\
.sp-sum-remove{width:28px;height:28px;margin-top:-4px;padding:0;border:1.5px solid #1A1A1A;border-radius:999px;background:#fff;color:#1A1A1A;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,color .15s}\
.sp-sum-remove:hover{background:#46000A;border-color:#46000A;color:#fff}\
@keyframes spSumIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}\
.sp-sum-row.is-new{animation:spSumIn .24s ease}\
.sp-sum-empty{border-top:1px solid #D4D4D4;padding:30px 8px 28px;text-align:center}\
.sp-sum-empty svg{color:#D4D4D4}\
.sp-sum-empty p{margin:12px 0 0;font-size:14px;color:#5C5C5C;line-height:1.5}\
.sp-sum-total{flex-shrink:0;background:#1A1A1A;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px}\
.sp-sum-total-pts{display:block;font-size:14px;font-weight:600;line-height:1.3}\
.sp-sum-total-price{display:block;font-size:22px;font-weight:400;margin-top:3px;line-height:1.15;font-variant-numeric:tabular-nums;font-family:\'Produkt\',\'Source Serif 4\',Georgia,serif}\
.sp-sum-total-empty{font-size:14px;color:#5C5C5C;line-height:1.4}\
.sp-sum-cta{flex-shrink:0;background:#FFCA00;color:#1A1A1A;border:none;border-radius:8px;padding:14px 22px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s,transform .1s}\
.sp-sum-cta:hover:not(:disabled){background:#FFCA00}\
.sp-sum-cta:active:not(:disabled){transform:translateY(1px)}\
.sp-sum-cta:disabled{background:#1A1A1A;color:#5C5C5C;box-shadow:inset 0 0 0 1px #3d3d3d;cursor:default}\
\
@media(max-width:980px){\
.sp-wrap{display:block}\
.sp-side{position:sticky;top:auto;bottom:0;margin-top:16px;z-index:30}\
.sp-summary{max-height:none;border-radius:8px 8px 0 0;}\
.sp-sum-head{padding:16px 20px 10px}\
.sp-sum-scroll{padding:0 20px;max-height:30vh}\
.sp-sum-total{padding:14px 20px}\
.sp-sum-total-price{font-size:20px}\
}\
@media(max-width:520px){\
/* For smalt til én linje – navnet får hele bredden, tall og kryss under. */\
.sp-sum-row{grid-template-columns:minmax(0,1fr) auto 28px;gap:4px 12px}\
.sp-sum-pts{grid-column:1;grid-row:2;text-align:left}\
.sp-sum-price{grid-column:2;grid-row:2}\
.sp-sum-remove{grid-column:3;grid-row:1 / span 2;align-self:center;margin-top:0}\
.sp-sum-scroll{max-height:24vh}\
.sp-sum-cta{padding:13px 18px;font-size:14px}\
}\
';

function spInjectSummaryShell() {
  if (!document.getElementById('sp-summary-styles')) {
    var style = document.createElement('style');
    style.id = 'sp-summary-styles';
    style.textContent = SUMMARY_CSS;
    document.body.appendChild(style);
  }
  var wrap = document.querySelector('.sp-wrap');
  if (!wrap || document.getElementById('sp-side')) return;
  var side = document.createElement('aside');
  side.className = 'sp-side';
  side.id = 'sp-side';
  wrap.appendChild(side);
}

var X_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
var TOMT_SVG = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 9L12 5 2 9l10 4 10-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

/* Emnet som nettopp ble lagt til – raden tones inn så valget bekreftes visuelt. */
var _spNyKode = null;

function spRenderSummary() {
  var side = document.getElementById('sp-side');
  spOppdaterLeggTilAlle();
  if (!side) return;

  var valgte = spValgteEmner();
  var totalPts = 0, totalPris = 0, rader = '';

  valgte.forEach(function(e) {
    totalPts += parseFloat(e.pts) || 0;
    totalPris += parseInt(e.price, 10) || 0;
    /* Emnenavnet er understreket i designet – da skal det også føre et sted. */
    var navn = e.url
      ? '<a class="sp-sum-name" href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.name) + '</a>'
      : '<span class="sp-sum-name">' + esc(e.name) + '</span>';
    rader += '<div class="sp-sum-row' + (e.code === _spNyKode ? ' is-new' : '') + '">'
      + navn
      + '<span class="sp-sum-pts">' + fmtPts(e.pts) + ' stp.</span>'
      + '<span class="sp-sum-price">kr ' + fmtKr(e.price) + '</span>'
      + '<button class="sp-sum-remove" aria-label="Fjern ' + esc(e.name) + '"'
      + ' onclick="spRemoveCourse(\'' + esc(e.code) + '\')">' + X_SVG + '</button>'
      + '</div>';
  });
  _spNyKode = null;

  var innhold = valgte.length
    ? '<div class="sp-sum-list">' + rader + '</div>'
    : '<div class="sp-sum-empty">' + TOMT_SVG
      + '<p>Legg til emner fra semestrene for å fortsette.</p></div>';

  var sum = valgte.length
    ? '<div><span class="sp-sum-total-pts">Totalt ' + fmtPts(totalPts) + ' studiepoeng</span>'
      + '<span class="sp-sum-total-price">kr ' + fmtKr(totalPris) + '</span></div>'
    : '<span class="sp-sum-total-empty">Ingen emner valgt ennå</span>';

  side.innerHTML = '<div class="sp-summary">'
    + '<div class="sp-sum-head"><h3>Sammendrag</h3>'
    + (valgte.length ? '<span class="sp-sum-count">' + valgte.length
        + (valgte.length === 1 ? ' emne valgt' : ' emner valgt') + '</span>' : '')
    + '</div>'
    + '<div class="sp-sum-scroll">' + innhold + '</div>'
    + '<div class="sp-sum-total">' + sum
    + '<button class="sp-sum-cta" onclick="spGaVidere()"' + (valgte.length ? '' : ' disabled') + '>Gå videre</button>'
    + '</div>'
    + '</div>';
}

/* Knappen i semesterfoten bestiller ikke lenger – den fyller sammendraget, og
   kan angre når hele semesteret allerede ligger der. */
function spOppdaterLeggTilAlle() {
  document.querySelectorAll('.sp-semester').forEach(function(sem) {
    var btn = sem.querySelector('.sp-bestill-alle');
    if (!btn) return;
    var kanLegges = sem.querySelectorAll('.sp-add-btn:not(.added):not(.completed)').length;
    var valgte = sem.querySelectorAll('.sp-add-btn.added:not(.completed)').length;
    var fjernModus = !kanLegges && valgte > 0;
    btn.dataset.spModus = fjernModus ? 'fjern' : 'legg';
    btn.textContent = fjernModus ? 'Fjern alle' : 'Legg til alle';
    btn.disabled = !kanLegges && !valgte;
  });
}

/* ─── Valg av emner: bare inn i sammendraget, ikke i søknaden ─── */
function spSelect(emne, stille) {
  if (!emne || spCart[emne.code]) return;
  spCart[emne.code] = {
    name: emne.name, pts: emne.pts, price: emne.price,
    startDate: '', url: emne.url || null
  };
  spMarkRow(emne.code, true);
  _spNyKode = emne.code;
  if (!stille) spRenderSummary();
}

window.spAddCourse = function(btn) {
  var row = btn.closest('.sp-course-row');
  if (!row) return;
  var code = row.dataset.code;
  if (btn.classList.contains('completed')) return;
  if (typeof spCompletedCourses !== 'undefined' && spCompletedCourses.indexOf(code) > -1) return;
  if (spCart[code]) { spRemoveCourse(code); return; }
  spSelect(spEmneFraRad(btn, row));
};

window.spBestillAlle = function(btn) {
  var sem = btn.closest('.sp-semester');
  if (!sem) return;

  if (btn.dataset.spModus === 'fjern') {
    var koder = [];
    sem.querySelectorAll('.sp-add-btn.added:not(.completed)').forEach(function(b) {
      var row = b.closest('.sp-course-row');
      if (row) koder.push(row.dataset.code);
    });
    koder.forEach(function(code) { spRemoveCourse(code); });
    return;
  }

  sem.querySelectorAll('.sp-add-btn:not(.added):not(.completed)').forEach(function(b) {
    var row = b.closest('.sp-course-row');
    if (row) spSelect(spEmneFraRad(b, row), true);
  });
  _spNyKode = null;
  spRenderSummary();
};

/* Beståtte emner merkes ikke lenger i planleggeren, og fjernes ikke automatisk.
   Konflikten vises i søknaden, der studenten selv kan ta emnet ut. */
var _origApplyCompleted = window.spApplyCompletedState;
window.spApplyCompletedState = function() {
  _origApplyCompleted();
  document.querySelectorAll('.sp-completed-row').forEach(function(row) {
    row.classList.remove('sp-completed-row');
    var btn = row.querySelector('.sp-add-btn.completed');
    if (btn) {
      btn.classList.remove('completed');
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('title');
      btn.setAttribute('aria-label', 'Legg til');
      btn.textContent = btn.classList.contains('added') ? '\u2713' : '+';
    }
    var badge = row.querySelector('.sp-badge-bestatt');
    if (badge) badge.remove();
  });
  spRenderSummary();
};

/* ─── Synk mot søknaden ─── */
/* Emner som bare er valgt skal ikke skrives til søknaden ennå. Den opprinnelige
   synkingen gir alle uten program siden-programmet, så de holdes utenfor til
   studenten faktisk har gått videre. */
var _origSyncToBasket = window.spSyncToBasket;
var _spCommitting = false;

window.spSyncToBasket = function() {
  if (_spCommitting) {
    _origSyncToBasket();
    spRenderSummary();
    return;
  }
  var holdt = {};
  Object.keys(spCart).forEach(function(code) {
    var c = spCart[code];
    if (c && !c.program && !c.loose) { holdt[code] = c; delete spCart[code]; }
  });
  try {
    _origSyncToBasket();
  } finally {
    Object.keys(holdt).forEach(function(code) { spCart[code] = holdt[code]; });
  }
  spRenderSummary();
};

var _origRemoveCourse = window.spRemoveCourse;
window.spRemoveCourse = function(code) {
  _origRemoveCourse(code);
  spRenderSummary();
};

/* ─── «Gå videre»: alle valgene tas i sidebaren ─── */
/* Heltid/deltid er allerede valgt – det er fanen studenten står i. Panelet skal
   derfor ikke spørre om det på nytt. Enkeltemne-fanen har ingen heltid/deltid;
   der gjelder den fleksible enkeltemnekoden, som ligger under «deltid». */
function spAktivGjennomforing() {
  var fane = document.querySelector('.sp-tab[data-selected="true"]');
  var panel = fane && fane.dataset ? fane.dataset.panel : '';
  if (panel === 'sp-heltid') return 'heltid';
  return 'deltid';
}

window.spGaVidere = function() {
  var pending = spPendingList();
  /* Ligger alt i søknaden alt, er det ingen valg igjen å ta – da åpner vi den. */
  if (!pending.length) {
    if (typeof openSoknaderPanel === 'function') openSoknaderPanel();
    return;
  }
  velgProgramForPlanlegger(pending, SP_SIDENS_PROGRAM, function(p, opts) {
    opts = opts || {};
    /* p === null: emnene tas som frittstående enkeltemner. opts bærer
       gjennomføringen og studiekoden for den. */
    window.spValgtProgram = p ? { id: programIdFor(p), name: p.name,
                                  studieform: opts.studieform || null,
                                  code: opts.code || null } : null;
    window.spValgtLoose = p ? null : opts;
    spVisStudiestart(pending);
  }, spAktivGjennomforing());
};

/* Studiestart er siste valg, og det tas i samme panel som de to andre.
   Valget er de to kortene – semesterstart eller valgfri oppstartsdato. */
/* Standardscenariet ligger i studiestart-modal.js, delt med enkeltemnesidene. */

/* Sider som selv setter et semesterscenario får beholde datoene sine. */
function spStudiestartScenario() {
  if (typeof spScenarioOverride !== 'undefined' && spScenarioOverride
      && spScenarioOverride.id === 'approaching') return spScenarioOverride;
  return null;   /* null → renderStudiestartStep bruker standardscenariet */
}

function spVisStudiestart(pending) {
  var body = document.getElementById('hk-body');
  if (!body || typeof renderStudiestartStep !== 'function') { spLeggISoknaden(pending, ''); return; }
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(true);

  var valgt = window.spValgtProgram || SP_SIDENS_PROGRAM;
  renderStudiestartStep(body, spStudiestartScenario(), {
    /* Emnene følger med så studenten kan sette dato per emne. */
    emner: pending.map(function(e) { return { code: e.code, name: e.name, pts: e.pts }; }),
    /* Tilbake fra første steg går til programvalget. */
    onBack: function() { window.spGaVidere(); },
    gruppe: { navn: (valgt && valgt.name) || 'Emner', meta: spGruppeMeta(pending, valgt) },
    onTitle: function(tekst) {
      var el = document.getElementById('hk-title');
      if (el) el.textContent = tekst;
    },
    onConfirm: function(datoStr, perEmne) { spLeggISoknaden(pending, datoStr, perEmne); },
    onNotify: function(epost) { spVisVarselKvittering(epost); }
  });
}

/* «Bachelor · 30 stp. · 4 emner · Heltid [BAL]» – linjen over programnavnet. */
function spGruppeMeta(pending, valgt) {
  var stp = pending.reduce(function(sum, e) { return sum + (parseFloat(e.pts) || 0); }, 0);
  var d = [];
  var niva = (valgt && valgt.level)
    || (typeof deriveLevelFromPage === 'function' ? deriveLevelFromPage() : '');
  if (niva) d.push(niva);
  if (stp) d.push(String(stp).replace('.', ',') + ' stp.');
  d.push(pending.length + ' emne' + (pending.length !== 1 ? 'r' : ''));
  var gj = (valgt && valgt.studieform) || spAktivGjennomforing();
  d.push(gj.charAt(0).toUpperCase() + gj.slice(1) + (valgt && valgt.code ? ' [' + valgt.code + ']' : ''));
  return d.join(' · ');
}

function spLeggISoknaden(pending, datoStr, perEmne) {
  pending.forEach(function(e) {
    var egen = perEmne ? perEmne[String(e.code)] : null;
    if (spCart[e.code]) spCart[e.code].startDate = egen || datoStr || '';
  });

  _spCommitting = true;
  try { spSyncToBasket(); } finally { _spCommitting = false; }

  spRenderSummary();
  if (typeof renderBasketPanel === 'function') renderBasketPanel();

  var kortId = window.spValgtLoose
    ? (typeof HK_LOOSE_CARD_ID !== 'undefined' ? HK_LOOSE_CARD_ID : '__loose')
    : ((window.spValgtProgram && window.spValgtProgram.id) || SP_SIDENS_PROGRAM.id);
  var koder = pending.map(function(e) { return e.code; });
  if (koder.length && typeof revealEmner === 'function') {
    setTimeout(function() { revealEmner(kortId, koder); }, 150);
  }
}

/* «Mellom semestre» + Lånekassen: studenten ber om varsel i stedet for å
   bestille nå. Emnene blir stående i sammendraget. */
function spVisVarselKvittering(epost) {
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  if (title) title.textContent = 'Vi gir deg beskjed';
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(true);

  var mottaker = epost ? '«' + esc(epost) + '»' : 'e-postadressen din';
  body.innerHTML = '<div style="padding:8px 0;">'
    + '<div style="background:#FCF8F5;border-radius:8px;padding:18px 20px;">'
    + '<p style="font-size:15px;font-weight:600;color:#46000A;margin:0;">Vi sender deg en e-post når du kan bestille</p>'
    + '<p style="font-size:13.5px;color:#5C5C5C;margin:10px 0 0;line-height:1.55;">'
    + 'Vi varsler ' + mottaker + ' så snart bestillingen åpner for neste semester. '
    + 'Emnene du har valgt ligger fortsatt i sammendraget.</p>'
    + '</div>'
    + '<button onclick="closeSoknaderPanel()" style="background:none;border:none;padding:0;margin:20px 0 0;'
    + 'cursor:pointer;font-family:inherit;font-size:15px;font-weight:500;color:#46000A;">← Tilbake til studieplanleggeren</button>'
    + '</div>';
}

/* ─── Oppstart ─── */
function spInitSummary() {
  spInjectSummaryShell();
  spRenderSummary();
  /* Den innebygde koden leser søknaden 100 ms etter DOMContentLoaded og merker
     radene som alt ligger der – sammendraget må tegnes på nytt etterpå. */
  setTimeout(spRenderSummary, 200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', spInitSummary);
} else {
  spInitSummary();
}

})();
