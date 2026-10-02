/* ═══════════════════════════════════════════
   admin-dato.js
   Simulerer dagens dato for hele prototypen.

   Hele poenget er at datoen faktisk skal gjelde: vi bytter ut Date, slik at
   all logikk – studiestart-panelet, eksamensperiodene, kalendervinduet,
   oppmeldingsfristene – regner som om det var den dagen. Panelet viser
   deretter hva de virkelige funksjonene svarer, ikke en kopi av dem.

   Må lastes før de andre prototyp-skriptene.
   ═══════════════════════════════════════════ */
(function() {
  'use strict';

  var NOKKEL = 'adminSimDato';
  var MND = ['januar','februar','mars','april','mai','juni',
             'juli','august','september','oktober','november','desember'];

  function les() {
    try { return localStorage.getItem(NOKKEL); } catch (e) { return null; }
  }

  function skriv(iso) {
    try {
      if (iso) localStorage.setItem(NOKKEL, iso);
      else localStorage.removeItem(NOKKEL);
    } catch (e) {}
  }

  var EkteDate = Date;

  function isoAv(d) {
    var m = d.getMonth() + 1, dag = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dag < 10 ? '0' : '') + dag;
  }

  function formater(d) {
    return d.getDate() + '. ' + MND[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Date-overstyring ───────────────────────────────────────────────────
     Må skje før noe annet leser klokka. En simulert dag står stille på
     midnatt – prototypen bryr seg bare om datoen, ikke klokkeslettet. */
  var simIso = les();
  var simulert = false;

  if (simIso && /^\d{4}-\d{2}-\d{2}$/.test(simIso)) {
    var deler = simIso.split('-');
    var fast = new EkteDate(+deler[0], +deler[1] - 1, +deler[2]);
    if (isoAv(fast) !== isoAv(new EkteDate())) simulert = true;

    var FalskDate = function(a, b, c, d, e, f, g) {
      if (!(this instanceof FalskDate)) return new EkteDate(fast.getTime()).toString();
      switch (arguments.length) {
        case 0: return new EkteDate(fast.getTime());
        case 1: return new EkteDate(a);
        case 2: return new EkteDate(a, b);
        case 3: return new EkteDate(a, b, c);
        case 4: return new EkteDate(a, b, c, d);
        case 5: return new EkteDate(a, b, c, d, e);
        case 6: return new EkteDate(a, b, c, d, e, f);
        default: return new EkteDate(a, b, c, d, e, f, g);
      }
    };
    FalskDate.prototype = EkteDate.prototype;
    FalskDate.now = function() { return fast.getTime(); };
    FalskDate.parse = EkteDate.parse;
    FalskDate.UTC = EkteDate.UTC;
    window.Date = FalskDate;
  }

  /* ── Panelet ──────────────────────────────────────────────────────────── */

  var STIL = [
    /* Bred nok til at hele datoen med årstall får plass på én linje. */
    '.ad-panel{position:fixed;left:20px;top:20px;width:360px;max-height:calc(100vh - 40px);overflow:auto;',
    'background:#fff;border:1px solid #D4D4D4;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.18);',
    'z-index:9000;font-family:var(--k-sans,system-ui,sans-serif);display:flex;flex-direction:column;color:#1A1A1A}',
    '.ad-head{background:#1A1A1A;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;border-radius:8px 8px 0 0}',
    '.ad-head-tittel{flex:1;font-size:16px;font-weight:600}',
    '.ad-ikonknapp{cursor:pointer;display:flex;padding:4px;background:none;border:none;color:inherit;font-size:16px;line-height:1}',
    '.ad-kropp{padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.ad-etikett{font-size:15px;font-weight:600}',
    '.ad-datorad{display:flex;align-items:stretch;gap:8px}',
    '.ad-pil{width:42px;flex-shrink:0;border:1px solid #9A6D6D;border-radius:6px;background:#fff;',
    'cursor:pointer;font-family:inherit;font-size:17px;color:#1A1A1A;line-height:1}',
    '.ad-dato{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'font-family:inherit;font-size:16px;padding:10px 12px;border:1px solid #9A6D6D;border-radius:6px;',
    'color:#1A1A1A;background:#fff;cursor:pointer;white-space:nowrap}',
    '.ad-dato-velger{position:absolute;left:0;bottom:0;width:100%;height:100%;opacity:0;border:none;padding:0;pointer-events:none}',
    '.ad-datofelt{position:relative;flex:1;min-width:0;display:flex}',
    '.ad-tilbake{align-self:flex-start;background:none;border:none;padding:0;cursor:pointer;',
    'font-family:inherit;font-size:15px;font-weight:600;color:#0A4FB8}',
    '.ad-fot{border-top:1px solid #E6E6E6;padding:16px;display:flex;flex-direction:column;gap:10px;background:#FCF8F5}',
    '.ad-fot-tittel{font-size:15px;font-weight:600}',
    '.ad-kort{background:#fff;border:1px solid #E6E6E6;border-radius:8px;padding:14px 16px;',
    'display:flex;flex-direction:column;gap:8px}',
    '.ad-kort-tittel{font-size:16px;font-weight:600}',
    '.ad-kort ul{margin:0;padding:0 0 0 16px;list-style:none;display:flex;flex-direction:column;gap:4px}',
    '.ad-kort li{font-size:15px;line-height:1.35;position:relative}',
    '.ad-kort li::before{content:"\\00b7";position:absolute;left:-14px;color:#9A6D6D;font-weight:700}',
    '.ad-advarsel{background:#FFFBEB;border:1px solid #FFCA00;border-radius:6px;padding:10px 12px;',
    'font-size:14px;line-height:1.4;margin-top:2px}',
    '.ad-vindu{font-size:15px;color:#5C5C5C}',
    '.ad-flik{position:fixed;left:0;top:50%;transform:translateY(-50%);background:#1A1A1A;color:#fff;',
    'padding:14px 10px;border:none;border-radius:0 6px 6px 0;cursor:pointer;z-index:9000;display:flex;',
    'flex-direction:column;align-items:center;gap:8px;box-shadow:0 6px 16px rgba(0,0,0,.2);font-family:inherit}',
    '.ad-flik-dato{writing-mode:vertical-rl;font-size:12px;font-weight:600}'
  ].join('');

  var KALENDERIKON = '<svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">'
    + '<path d="M32 2C33.1 2 34 2.9 34 4v2h4c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6H10c-3.3 0-6-2.7-6-6V12c0-3.3 2.7-6 6-6h4V4c0-1.1.9-2 2-2s2 .9 2 2v2h12V4c0-1.1.9-2 2-2ZM8 40c0 1.1.9 2 2 2h28c1.1 0 2-.9 2-2V22H8v18ZM10 10c-1.1 0-2 .9-2 2v6h32v-6c0-1.1-.9-2-2-2h-4v2c0 1.1-.9 2-2 2s-2-.9-2-2v-2H18v2c0 1.1-.9 2-2 2s-2-.9-2-2v-2h-4Z" fill="currentColor"/></svg>';

  function avlesningHtml() {
    if (typeof window.ssAdminStatus !== 'function') {
      return '<span class="ad-vindu">studiestart-modal.js er ikke lastet på denne siden.</span>';
    }
    var st = window.ssAdminStatus();
    var kort = st.perioder.map(function(p) {
      return '<div class="ad-kort">'
        + '<span class="ad-kort-tittel">' + p.tittel + '</span>'
        + '<ul>' + p.valg.map(function(v) { return '<li>' + v + '</li>'; }).join('') + '</ul>'
        + (p.forKort ? '<div class="ad-advarsel">Under 4 måneder til eksamen. '
            + 'Gir ikke rett til lån/stipend.</div>' : '')
        + '</div>';
    }).join('');
    return '<span class="ad-fot-tittel">Studenten kan velge</span>' + kort
      + '<span class="ad-vindu">Valgfri dato: ' + st.kalender.fra + ' – ' + st.kalender.til + '</span>';
  }

  function settDato(iso) {
    skriv(iso);
    /* Datoen må gjelde fra første linje kode på siden, så vi laster på nytt
       i stedet for å prøve å regne om alt som alt er tegnet. */
    location.reload();
  }

  function tegn() {
    if (document.getElementById('ad-rot')) return;

    var stil = document.createElement('style');
    stil.id = 'ad-stil';
    stil.textContent = STIL;
    document.head.appendChild(stil);

    var rot = document.createElement('div');
    rot.id = 'ad-rot';
    document.body.appendChild(rot);

    /* Lukket til den åpnes – verktøyet skal ikke stå i veien for prototypen. */
    var apen = false;
    try { apen = localStorage.getItem('adminSimApen') === '1'; } catch (e) {}

    var naa = new Date();
    naa.setHours(0, 0, 0, 0);
    var iDagIso = isoAv(naa);

    function settApen(verdi) {
      apen = verdi;
      try { localStorage.setItem('adminSimApen', verdi ? '1' : '0'); } catch (e) {}
      render();
    }

    function render() {
      rot.innerHTML = '';

      if (!apen) {
        var flik = document.createElement('button');
        flik.className = 'ad-flik';
        flik.type = 'button';
        flik.title = 'Åpne dato-simulatoren';
        flik.innerHTML = KALENDERIKON
          + '<span class="ad-flik-dato">' + naa.getDate() + '. ' + MND[naa.getMonth()].slice(0, 3) + '</span>';
        flik.onclick = function() { settApen(true); };
        rot.appendChild(flik);
        return;
      }

      var panel = document.createElement('aside');
      panel.className = 'ad-panel';

      var KAL_IKON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
        + '<rect x="3" y="5" width="18" height="16" rx="2" stroke="#9A6D6D" stroke-width="1.6"/>'
        + '<path d="M3 10h18M8 3v4M16 3v4" stroke="#9A6D6D" stroke-width="1.6" stroke-linecap="round"/></svg>';

      panel.innerHTML =
        '<div class="ad-head">' + KALENDERIKON
        + '<span class="ad-head-tittel">Datosimulering</span>'
        + '<button type="button" class="ad-ikonknapp" id="ad-minimer" title="Minimer">—</button>'
        + '</div>'
        + '<div class="ad-kropp">'
        + '<span class="ad-etikett">Dagens dato</span>'
        + '<div class="ad-datorad">'
        + '<button type="button" class="ad-pil" id="ad-forrige" title="Forrige dag">&lsaquo;</button>'
        + '<div class="ad-datofelt">'
        + '<button type="button" class="ad-dato" id="ad-dato-knapp">'
        + '<span>' + formater(naa) + '</span>' + KAL_IKON + '</button>'
        + '<input type="date" class="ad-dato-velger" id="ad-dato" value="' + iDagIso + '" tabindex="-1" aria-hidden="true">'
        + '</div>'
        + '<button type="button" class="ad-pil" id="ad-neste" title="Neste dag">&rsaquo;</button>'
        + '</div>'
        /* Lenken finnes bare når det er noe å gå tilbake fra. */
        + (simulert ? '<button type="button" class="ad-tilbake" id="ad-tilbake">Tilbake til i dag</button>' : '')
        + '</div>'
        + '<div class="ad-fot">' + avlesningHtml() + '</div>';

      rot.appendChild(panel);

      panel.querySelector('#ad-minimer').onclick = function() { settApen(false); };
      var velger = panel.querySelector('#ad-dato');
      velger.onchange = function(e) { settDato(e.target.value || null); };
      panel.querySelector('#ad-dato-knapp').onclick = function() {
        /* showPicker finnes ikke i alle nettlesere – da duger et klikk. */
        if (typeof velger.showPicker === 'function') velger.showPicker();
        else { velger.style.pointerEvents = 'auto'; velger.focus(); velger.click(); }
      };
      panel.querySelector('#ad-forrige').onclick = function() { flytt(-1); };
      panel.querySelector('#ad-neste').onclick = function() { flytt(1); };
      var tilbake = panel.querySelector('#ad-tilbake');
      if (tilbake) tilbake.onclick = function() { settDato(null); };
    }

    function flytt(n) {
      settDato(isoAv(new Date(naa.getFullYear(), naa.getMonth(), naa.getDate() + n)));
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tegn);
  } else {
    tegn();
  }
})();
