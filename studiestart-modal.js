/* ═══════════════════════════════════════════
   studiestart-modal.js
   "Velg studiestart" modal for emnebestilling
   ═══════════════════════════════════════════ */

(function() {

/* ── State ── */
var _ssPending = [];   // [{btn, code, name, pts, price}, …]
var _ssStyleInjected = false;
var _ssCalYear, _ssCalMonth, _ssCalSelected = null;
var _ssCalMin, _ssCalMax;
var _ssWantsLanekassen = null;
var _ssEksamen = null;         /* valgt eksamensperiode, f.eks. '2026-12' */
var _ssSammeDato = true;       /* «Samme oppstartsdato for alle emner» */
var _ssEmner = [];             /* emnene valget gjelder, for per-emne-visningen */
var _ssGruppe = null;          /* {meta, navn} – studieprogrammet emnene hører til */
var _ssPerEmne = {};           /* emnekode → 'semester' | 'custom' */
var _ssPerEmneDato = {};       /* emnekode → Date for valgfri oppstart */
var _ssAktivtEmne = null;      /* emnet som har kalenderen åpen */
var _ssSteg = 'startdato';     /* 'lanekassen' | 'eksamen' | 'startdato' */
var _ssOnBack = null;          /* tilbake fra første steg – eies av kalleren */
var _ssEmneIdx = 0;            /* emnet vi står på når hvert emne får egen dato */
/* Satt når studiestart-steget rendres inne i søknadspanelet i stedet for i skuffen. */
var _ssInline = null;

/* ── CSS injection ── */
function injectStyles() {
  if (_ssStyleInjected) return;
  _ssStyleInjected = true;
  var css = document.createElement('style');
  css.textContent = '\
.ss-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1400;opacity:0;transition:opacity .3s}\
.ss-backdrop.open{display:block;opacity:1}\
.ss-modal{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:460px;max-width:100vw;background:#fff;z-index:1401;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;overflow:hidden}\
.ss-backdrop.open .ss-modal{transform:translateX(0)}\
.ss-header{padding:20px 24px 0;display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-shrink:0}\
.ss-close{width:40px;height:40px;border-radius:50%;border:none;background:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:#1A1A1A;flex-shrink:0;transition:background .15s;padding:0;line-height:1}\
.ss-close:hover{background:#E6E6E6}\
.ss-title{font-size:20px;font-weight:600;color:#1A1A1A;padding:4px 24px 0;flex-shrink:0}\
.ss-body{padding:16px 24px 24px;display:flex;flex-direction:column;gap:16px;flex:1 1 auto;overflow-y:auto;min-height:0;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}\
.ss-body > *{flex-shrink:0}\
.ss-footer{padding:16px 24px calc(20px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #E6E6E6;flex-shrink:0}\
.ss-radio-group{display:flex;flex-direction:column;gap:8px}\
.ss-radio-card{border:1.5px solid #D4D4D4;border-radius:8px;padding:18px 20px;cursor:pointer;display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px;transition:border-color .15s,background .15s}\
.ss-radio-card:hover{background:#F5F5F5}\
.ss-radio-card.selected{border-color:#0A4FB8;border-width:2px;padding:17px 19px;background:#F2F7FF}\
.ss-radio-dot{width:22px;height:22px;border:2px solid #767676;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px;transition:border-color .15s}\
.ss-radio-card.selected .ss-radio-dot{border-color:#0A4FB8;border-width:2.5px}\
.ss-radio-card.selected .ss-radio-dot::after{content:"";width:12px;height:12px;background:#0A4FB8;border-radius:50%}\
.ss-radio-main{font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.25}\
.ss-radio-desc{font-size:14px;color:#5C5C5C;margin:4px 0 0;line-height:1.45}\
.ss-radio-sub{font-size:15px;color:#5C5C5C;margin-top:6px;line-height:1.35}\
.ss-radio-sub svg{flex-shrink:0}\
.ss-radio-sub strong{color:#1A1A1A;font-weight:600}\
.ss-radio-link{color:#0A4FB8;text-decoration:underline;font-size:13px}\
.ss-calendar-wrap{display:none;padding:4px 0 0;flex-basis:100%}\
.ss-calendar-wrap.open{display:block}\
.ss-date-input{width:100%;border:1.5px solid #767676;border-radius:8px;padding:14px 16px;font-size:16px;font-family:inherit;outline:none;transition:border-color .15s;cursor:pointer;box-sizing:border-box;min-height:48px}\
.ss-date-input:focus{border-color:#0A4FB8}\
.ss-hint{font-size:13px;color:#5C5C5C;margin-top:6px}\
.ss-checkbox-row{display:flex;align-items:flex-start;gap:10px;cursor:pointer}\
.ss-checkbox-box{width:22px;height:22px;border:2px solid #767676;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}\
.ss-checkbox-box.checked{background:#0A4FB8;border-color:#0A4FB8}\
.ss-checkbox-label{font-size:14px;color:#1A1A1A;line-height:22px}\
.ss-warning{background:#FCF8F5;border:1px solid #FFCA00;border-radius:8px;padding:16px;margin-top:4px}\
.ss-warning-title{font-size:12px;font-weight:600;color:#1A1A1A;letter-spacing:.5px;margin-bottom:8px}\
.ss-warning p{font-size:13px;color:#5C5C5C;line-height:1.5;margin:0 0 8px}\
.ss-warning p:last-child{margin-bottom:0}\
.ss-warning strong{color:#1A1A1A}\
.ss-warning-email-label{font-size:13px;color:#5C5C5C;margin-bottom:6px}\
.ss-warning-email{width:100%;border:1.5px solid #D4D4D4;border-radius:8px;padding:12px 14px;font-size:16px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;min-height:44px}\
.ss-warning-email:focus{border-color:#0A4FB8}\
.ss-or-text{font-size:13px;color:#5C5C5C}\
.ss-btn{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;background:#AF0018;color:#fff;font-family:inherit;font-size:16px;font-weight:600;border:none;border-radius:999px;cursor:pointer;width:100%;transition:background .15s}\
.ss-btn:hover{background:#8C0013}\
.ss-btn:disabled{background:#D4D4D4;cursor:not-allowed}\
.ss-btn svg{flex-shrink:0}\
.ss-cal{background:#fff;border-radius:8px;padding:16px;border:1px solid #E6E6E6}\
.ss-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}\
.ss-cal-month{font-size:16px;font-weight:600;color:#1A1A1A}\
.ss-cal-arrows{display:flex;gap:8px}\
.ss-cal-arrow{width:44px;height:44px;border:none;background:#F5F5F5;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1A1A1A;transition:background .15s;flex-shrink:0;padding:0}\
.ss-cal-arrow:hover:not(:disabled){background:#E6E6E6}\
.ss-cal-arrow:disabled{opacity:.3;cursor:not-allowed}\
.ss-cal-arrow:disabled:hover{background:none}\
.ss-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px 2px;text-align:center}\
.ss-cal-dow{font-size:16px;font-weight:600;color:#5C5C5C;padding:0 0 12px;text-transform:capitalize}\
.ss-cal-dow.ss-weekend{color:#E03131}\
.ss-cal-day{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:50%;border:none;background:none;font-size:15px;color:#1A1A1A;cursor:pointer;margin:0;transition:background .12s,color .12s;font-family:inherit}\
.ss-cal-day:hover:not(:disabled):not(.ss-cal-today){background:#E6E6E6}\
.ss-cal-day:disabled{color:#D4D4D4;cursor:not-allowed}\
.ss-cal-day.ss-weekend{color:#E03131}\
.ss-cal-day:disabled.ss-weekend{color:#F5B5B5}\
.ss-cal-day.ss-cal-today{background:#F2F7FF;color:#0A4FB8;font-weight:600}\
.ss-cal-day.ss-cal-selected{background:#0A4FB8;color:#fff!important;font-weight:600}\
.ss-cal-day.ss-cal-empty{cursor:default}\
.ss-between-calendar{transition:max-height .3s ease,opacity .3s ease;overflow:hidden}\
.ss-between-warning{transition:max-height .3s ease,opacity .3s ease;overflow:hidden}\
.ss-date-row{position:relative}\
.ss-date-row .ss-date-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#5C5C5C;pointer-events:none}\
.ss-info-accordion{border:1px solid #f9ccd2;background:#FCF8F5;border-radius:8px;overflow:hidden}\
.ss-info-header{display:flex;align-items:center;justify-content:space-between;padding:12px;cursor:pointer;gap:12px;user-select:none}\
.ss-info-header-text{font-size:14px;font-weight:500;color:#1A1A1A;line-height:1.25}\
.ss-info-header-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:#1A1A1A;flex-shrink:0;transition:transform .3s ease}\
.ss-info-accordion.open .ss-info-header-icon{transform:rotate(180deg)}\
.ss-info-body{max-height:0;overflow:hidden;transition:max-height .35s ease}\
.ss-info-accordion.open .ss-info-body{max-height:800px}\
.ss-info-body-inner{padding:0 18px 16px}\
.ss-info-body ul{margin:0;padding-left:20px}\
.ss-info-body li{font-size:13px;color:#1A1A1A;line-height:1.55;margin-bottom:8px}\
.ss-info-body li:last-child{margin-bottom:0}\
.ss-info-link-wrap{margin-top:14px;font-size:13px}\
.ss-info-link{color:#1A1A1A;font-size:13px;font-weight:500}\
.ss-selected-date{display:none;align-items:flex-start;gap:10px;margin-top:4px;padding:14px 16px;background:#F2F7FF;border:1.5px solid #0A4FB8;border-radius:8px;font-size:14px;color:#1A1A1A}\
.ss-selected-date.show{display:flex}\
.ss-selected-date svg{flex-shrink:0;color:#0A4FB8}\
.ss-selected-date-label{color:#5C5C5C;font-weight:500}\
.ss-selected-date-value{font-weight:600;color:#1A1A1A}\
.ss-selected-date-hint{font-size:12px;color:#5C5C5C;font-weight:400}\
.ss-faq-section{padding:16px 16px 0;display:flex;flex-direction:column;gap:8px}\
@media (max-width:480px){\
.ss-modal{width:100%;max-width:100%;}\
.ss-header{padding:12px 12px 0}\
.ss-title{padding:4px 20px 0;font-size:19px}\
.ss-body{padding:14px 20px 20px;gap:14px}\
.ss-footer{padding:12px 20px calc(16px + env(safe-area-inset-bottom))}\
.ss-radio-card{padding:16px}\
.ss-radio-main{font-size:16px}\
.ss-radio-desc{font-size:13px}\
.ss-radio-sub{margin-top:6px}\
.ss-cal{padding:16px}\
.ss-cal-grid{gap:0}\
.ss-cal-day{font-size:15px}\
.ss-cal-dow{font-size:16px}\
.ss-close{width:44px;height:44px}\
.ss-btn{height:44px}\
}\
@media (max-width:360px){\
.ss-body{padding:12px 14px 16px}\
.ss-footer{padding:10px 14px calc(14px + env(safe-area-inset-bottom))}\
.ss-cal{padding:16px}\
.ss-cal-day{font-size:15px}\
}\
.ss-simple-card{border:1.5px solid #D4D4D4;border-radius:8px;padding:20px 24px;cursor:pointer;font-size:18px;font-weight:600;color:#1A1A1A;transition:border-color .15s,background .15s}\
.ss-simple-card:hover{background:#F5F5F5;border-color:#D4D4D4}\
.ss-simple-card.selected{border-color:#0A4FB8;background:#F2F7FF}\
.ss-subtitle{font-size:15px;color:#5C5C5C;padding:2px 24px 0;line-height:1.4;flex-shrink:0}\
.ss-order-label{font-size:12px;color:#5C5C5C;margin-bottom:4px}\
.ss-back{display:inline-flex;align-items:center;gap:8px;background:none;border:none;padding:0;margin-bottom:4px;cursor:pointer;font-family:inherit;font-size:17px;color:#1A1A1A;align-self:flex-start}\
.ss-back:hover{color:#AF0018}\
.ss-question{font-size:24px;font-weight:600;color:#1A1A1A;line-height:1.25;margin-bottom:6px}\
.ss-badge{display:inline-flex;align-items:center;background:#0A4FB8;color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;letter-spacing:.5px;flex-shrink:0}\
.ss-radio-main-row{display:flex;align-items:center;justify-content:space-between;gap:10px}\
.ss-same-date{display:flex;align-items:center;gap:12px;background:#F2F7FF;border-radius:8px;padding:16px 18px;cursor:pointer;user-select:none}\
.ss-same-date-label{font-size:16px;font-weight:500;color:#1A1A1A}\
.ss-emne-group{border:1px solid #F9CCD2;border-radius:8px;overflow:hidden}\
.ss-emne-head{background:#FCF8F5;padding:14px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}\
.ss-emne-head-main{flex:1;min-width:0}\
.ss-emne-head-chevron{display:inline-flex;color:#1A1A1A;flex-shrink:0}\
.ss-error{color:#AF0018;font-size:14px;margin:12px 0 0;line-height:1.4}\
.ss-notis{background:#FFFBEB;border:1px solid #FFCA00;border-radius:8px;padding:16px 18px;font-size:16px;font-weight:600;color:#1A1A1A;line-height:1.4}\
.ss-varsel{background:#FCF8F5;border:1px solid #F9CCD2;border-radius:8px;padding:14px 16px;margin-top:12px}\
.ss-varsel-tekst{font-size:14px;color:#1A1A1A;line-height:1.55;margin:0 0 8px}\
.ss-varsel-tekst:last-child{margin-bottom:0}\
.ss-emne-head-meta{font-size:13px;color:#5C5C5C;margin-bottom:2px}\
.ss-emne-head-name{font-size:17px;font-weight:600;color:#1A1A1A}\
.ss-emne-item{padding:18px;border-top:1px solid #F9CCD2}\
.ss-emne-item-code{font-size:13px;color:#5C5C5C}\
.ss-emne-item-name{font-size:17px;font-weight:600;color:#1A1A1A;margin-bottom:8px}\
.ss-emne-tag{display:inline-flex;background:#7A3FD1;color:#fff;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600}\
.ss-notify-label{font-size:13px;color:#5C5C5C;margin:14px 0 6px;line-height:1.4}\
.ss-between-lk-card{display:block}\
.ss-between-lk-card.selected{border-color:#F9CCD2;background:#FCF8F5}\
.ss-between-lk-card:hover{background:#FCF8F5}\
.ss-warning-email{width:100%;border:1.5px solid #D4D4D4;border-radius:8px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;background:#fff;box-sizing:border-box;min-height:44px;transition:border-color .15s}\
.ss-warning-email:focus{border-color:#0A4FB8}\
/* Inline-modus: samme innhold rendret rett i s\u00f8knadspanelet i stedet for i en egen skuff */\
.ss-backdrop.ss-inline-host{position:static;inset:auto;background:none;z-index:auto;display:block;opacity:1;transition:none}\
.ss-inline-host .ss-modal{position:static;height:auto;width:auto;max-width:none;transform:none;display:block;overflow:visible;transition:none}\
.ss-inline-host .ss-header,.ss-inline-host .ss-title{display:none}\
.ss-inline-host .ss-subtitle{padding:0;font-size:15px;color:#5C5C5C;line-height:1.4}\
.ss-inline-host .ss-question{font-size:22px}\
.ss-inline-host .ss-body{padding:16px 0 0;overflow:visible;flex:none;min-height:0}\
.ss-inline-host .ss-faq-section{padding:8px 0 0}\
.ss-inline-host .ss-footer{padding:20px 0 0;border-top:none;background:none}\
';
  document.head.appendChild(css);
}

/* Standardscenariet i prototypen. Sider som har sitt eget (spScenarioOverride)
   sender det inn i stedet – ellers er valget likt overalt. */
window.STUDIESTART_SCENARIO = {
  id: 'approaching',
  semesterLabel: '16. august 2026',
  studierettLabel: 'Studierett til 15. august 2027',
  semesterDateStr: '16.08.26',
  loanInfo: 'Anbefalt hvis du ønsker å søke lån/stipend hos Lånekassen.',
  loanLink: 'Les mer: Lånekassen: Nettstudier og samlingsbasert',
  calendarMin: '2026-06-16',
  calendarMax: '2026-09-16',
  /* Brukes i «mellom semestre»-varianten av studiestartsteget. */
  nextSemester: 'høstsemesteret',
  nextDate: '16. august',
  orderOpens: '16. mai'
};

/* ── Date scenario logic ── */
function getStudiestartScenario() {
  var now = new Date();
  var m = now.getMonth(); // 0-based
  var d = now.getDate();
  var y = now.getFullYear();

  // Oct 16 – Jan 15: vår nærmer seg
  if ((m === 9 && d >= 16) || m === 10 || m === 11 || (m === 0 && d <= 15)) {
    var semYear = (m >= 9) ? y + 1 : y;
    var semDate = new Date(semYear, 0, 16); // Jan 16
    var endDate = new Date(semYear + 1, 0, 15); // Jan 15 next year
    return {
      id: 'approaching',
      semesterLabel: '16. januar ' + semYear,
      studierettLabel: 'Studierett til 15. januar ' + (semYear + 1),
      semesterDateStr: formatDateShort(semDate),
      loanInfo: 'Anbefalt hvis du ønsker å søke lån/stipend hos Lånekassen.',
      loanLink: 'Les mer: Lånekassen: Nettstudier og samlingsbasert'
    };
  }
  // May 16 – Aug 15: høst nærmer seg
  if ((m === 4 && d >= 16) || m === 5 || m === 6 || (m === 7 && d <= 15)) {
    var semDate2 = new Date(y, 7, 16); // Aug 16
    var endDate2 = new Date(y + 1, 7, 15); // Aug 15 next year
    return {
      id: 'approaching',
      semesterLabel: '16. august ' + y,
      studierettLabel: 'Studierett til 15. august ' + (y + 1),
      semesterDateStr: formatDateShort(semDate2),
      loanInfo: 'Anbefalt hvis du ønsker å søke lån/stipend hos Lånekassen.',
      loanLink: 'Les mer: Lånekassen: Nettstudier og samlingsbasert'
    };
  }
  // Jan 16 – May 15: mellom semestre (vår pågår)
  if ((m === 0 && d >= 16) || (m >= 1 && m <= 3) || (m === 4 && d <= 15)) {
    return {
      id: 'between',
      nextSemester: 'høstsemesteret',
      nextDate: '16. august',
      nextDateFull: '16. august ' + y,
      orderOpens: '16. mai',
      studierettLabel: 'Studierett til 15. august ' + (y + 1)
    };
  }
  // Aug 16 – Oct 15: mellom semestre (høst pågår)
  return {
    id: 'between',
    nextSemester: 'vårsemesteret',
    nextDate: '16. januar',
    nextDateFull: '16. januar ' + (y + 1),
    orderOpens: '16. oktober',
    studierettLabel: 'Studierett til 15. januar ' + (y + 2)
  };
}

/* ── Eksamensplan, nettstudier høst 2026 ────────────────────────────────────
   Emnekode → eksamensdato (kolonnen «Dato til (eksamensdato)» i planen).
   Hentet fra Kristianias publiserte plan, 254 emner. Emner med «fleksibel
   eksamensgjennomføring» står ikke her – de har ingen fast dato.
   MERK: kun høsten 2026. Vårplanen er ikke publisert ennå, så emner uten
   treff her gir ingen studieperiode-sjekk. */
var EKSAMENSPLAN = {
  '2343':'2027-01-13', '2433':'2026-12-16', '2434':'2027-01-08', '2436':'2027-01-14', '2437':'2027-01-12', '2438':'2027-01-13',
  '2439':'2027-01-06', '2442':'2026-12-18', '2443':'2027-01-14', '2444':'2026-12-18', '2445':'2026-12-17', '2446':'2027-01-13',
  '2447':'2027-01-14', '2448':'2027-01-04', '2449':'2027-01-05', '2450':'2026-12-21', '2451':'2027-01-11', '2452':'2026-12-04',
  '2453':'2027-01-13', '2454':'2027-01-13', '2455':'2027-01-04', '2456':'2027-01-07', '2506':'2027-01-14', '2507':'2027-01-13',
  '2525':'2026-12-04', '2802':'2027-01-06', '2900':'2026-12-07', '2901':'2027-01-08', '2904':'2027-01-08', '2905':'2026-12-07',
  '2907':'2026-12-07', '2910':'2026-12-21', '4006':'2026-12-02', '4007':'2026-12-09', '4008':'2026-11-12', '4009':'2026-11-19',
  '4010':'2026-11-26', '4011':'2026-12-03', '4020':'2026-12-09', '4029':'2026-12-02', '4031':'2026-12-04', '4033':'2026-11-20',
  '4035':'2026-11-25', '4037':'2026-11-27', '4039':'2026-11-18', '4041':'2026-11-13', '4042':'2026-11-25', '4043':'2026-11-20',
  '4044':'2026-11-18', '4051':'2026-11-27', '4052':'2026-12-04', '4053':'2026-12-02', '4054':'2026-11-20', '4055':'2026-11-18',
  '4056':'2026-11-25', '4058':'2026-11-20', '4059':'2026-11-27', '4060':'2026-12-04', '4061':'2026-11-25', '4062':'2026-12-02',
  '4063':'2026-12-09', '4067':'2026-11-18', '4068':'2026-11-27', '4069':'2026-12-04', '4099':'2026-11-18', '4100':'2026-11-24',
  '4101':'2026-12-02', '4105':'2026-12-14', '4106':'2026-12-03', '4107':'2026-11-26', '4108':'2026-11-12', '4109':'2026-11-19',
  '4111':'2026-11-11', '4112':'2026-11-27', '4113':'2026-12-14', '4114':'2026-12-04', '5320':'2026-12-18', '5321':'2026-12-11',
  '5323':'2027-01-08', '5325':'2027-01-14', '5327':'2027-01-15', '5340':'2027-01-11', '5341':'2027-01-13', '5342':'2027-01-11',
  '5343':'2027-01-13', '5344':'2026-12-18', '5346':'2027-01-13', '5350':'2027-01-15', '5351':'2026-12-15', '5353':'2027-01-15',
  '5360':'2027-01-08', '6002':'2026-12-18', '6003':'2027-01-11', '6004':'2027-01-05', '6018':'2027-01-15', '6022':'2027-01-11',
  '6023':'2027-01-11', '6024':'2027-01-04', '6025':'2026-12-17', '6026':'2026-12-18', '6027':'2026-12-15', '6064':'2027-01-15',
  '6082':'2027-01-15', '6084':'2027-01-11', '6086':'2027-01-08', '6087':'2027-01-12', '6088':'2027-01-13', '6090':'2027-01-04',
  '6091':'2027-01-06', '6093':'2027-01-12', '6106':'2026-12-17', '6107':'2027-01-05', '6108':'2027-01-12', '6267':'2027-01-13',
  '6272':'2027-01-04', '6274':'2027-01-13', '6277':'2026-12-11', '6281':'2027-01-11', '6285':'2026-12-18', '6286':'2027-01-12',
  '6308':'2027-01-11', '6313':'2027-01-15', '6314':'2027-01-15', '6316':'2026-12-17', '6320':'2027-01-13', '6322':'2027-01-14',
  '6323':'2026-12-11', '6324':'2027-01-05', '6328':'2026-12-11', '6329':'2027-01-07', '6331':'2027-01-04', '6332':'2026-12-14',
  '6334':'2026-12-17', '6335':'2027-01-15', '6336':'2027-01-13', '6337':'2027-01-07', '6338':'2027-01-14', '6339':'2027-01-07',
  '6340':'2027-01-14', '6341':'2026-12-11', '6343':'2027-01-12', '6344':'2027-01-12', '6345':'2026-12-17', '6346':'2027-01-13',
  '6347':'2027-01-13', '6349':'2027-01-15', '6350':'2027-01-11', '6351':'2027-01-13', '6352':'2027-01-08', '6353':'2027-01-04',
  '6356':'2027-01-05', '6357':'2027-01-14', '6359':'2027-01-11', '6360':'2027-01-13', '6361':'2027-01-15', '6362':'2027-01-14',
  '6363':'2027-01-08', '6364':'2027-01-05', '6366':'2027-01-04', '6368':'2026-12-18', '6369':'2027-01-12', '6370':'2026-12-17',
  '6371':'2027-01-04', '6373':'2027-01-15', '6375':'2027-01-13', '6376':'2027-01-11', '6377':'2027-01-08', '6378':'2027-01-05',
  '6379':'2026-12-11', '6380':'2027-01-14', '6381':'2027-01-06', '6382':'2027-01-14', '6383':'2026-12-17', '6384':'2027-01-11',
  '6385':'2027-01-12', '6386':'2027-01-12', '6387':'2027-01-12', '6389':'2026-12-15', '6390':'2026-12-18', '6391':'2027-01-12',
  '6392':'2027-01-15', '6393':'2027-01-08', '6394':'2026-12-18', '6395':'2026-12-17', '6396':'2027-01-04', '6397':'2026-12-18',
  '6398':'2027-01-12', '6399':'2027-01-13', '6408':'2027-01-14', '6409':'2027-01-15', '6410':'2027-01-12', '6500':'2026-12-16',
  '6501':'2026-12-18', '6502':'2027-01-12', '6503':'2027-01-05', '6504':'2027-01-13', '6505':'2027-01-11', '6550':'2027-01-13',
  '6551':'2027-01-15', '7055':'2026-12-11', '7057':'2027-01-11', '7065':'2027-01-14', '7100':'2026-12-17', '7102':'2027-01-11',
  '7103':'2027-01-15', '7104':'2027-01-15', '7106':'2026-12-21', '7107':'2027-01-06', '7110':'2027-01-11', '7113':'2026-12-14',
  '7114':'2027-01-14', '7115':'2026-12-18', '7116':'2027-01-08', '7117':'2027-01-12', '7118':'2027-01-15', '7119':'2027-01-08',
  '7120':'2027-01-05', '7130':'2027-01-12', '7131':'2026-12-15', '7132':'2027-01-08', '7133':'2027-01-06', '7134':'2027-01-12',
  '7136':'2027-01-11', '7137':'2027-01-15', '7138':'2026-12-18', '7139':'2027-01-04', '7141':'2027-01-14', '7142':'2026-12-18',
  '7145':'2027-01-07', '7146':'2027-01-15', '7150':'2026-12-18', '7151':'2027-01-11', '7152':'2027-01-07', '7153':'2027-01-08',
  '7154':'2026-12-17', '7155':'2027-01-07', '7156':'2026-12-21', '7157':'2027-01-11', '7200':'2026-12-11', '7203':'2026-12-17',
  '7204':'2027-01-14', '7205':'2026-12-18', '7206':'2026-12-21', '7207':'2027-01-15', '7208':'2026-12-18', '7209':'2026-12-18',
  '7210':'2027-01-11', '7211':'2026-12-17', '7212':'2027-01-14', '7213':'2027-01-15', '7214':'2027-01-07', '7215':'2027-01-11',
  '7216':'2027-01-11', '7217':'2026-11-25'
};

var SS_MND = ['januar','februar','mars','april','mai','juni','juli','august',
               'september','oktober','november','desember'];

/* «16.08.26» → Date. Faller tilbake på i dag hvis scenariet mangler datoen. */
function ssSemesterStart(sc) {
  var m = /^(\d{2})\.(\d{2})\.(\d{2})$/.exec((sc && sc.semesterDateStr) || '');
  if (!m) return new Date();
  return new Date(2000 + parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/* Alle emner har 18 måneders studierett, uansett hvilken oppstart som velges. */
var SS_STUDIERETT_MND = 18;

/* Semesterstarten i scenariet kan ha passert. Da er den ikke et reelt valg, og
   vi anbefaler neste semesterstart i stedet (16. januar / 16. august). */
function ssAnbefaltDato(sc) {
  var iDag = new Date();
  iDag.setHours(0, 0, 0, 0);

  var d = ssSemesterStart(sc);
  if (d < iDag) {
    var y = iDag.getFullYear();
    var kandidater = [new Date(y, 0, 16), new Date(y, 7, 16), new Date(y + 1, 0, 16)];
    for (var i = 0; i < kandidater.length; i++) {
      if (kandidater[i] >= iDag) { d = kandidater[i]; break; }
    }
  }

  /* Semesterstarten er bare en anbefaling hvis den faktisk går opp med den
     eksamensperioden studenten valgte. Gjør den ikke det, anbefaler vi den
     seneste datoen som fortsatt holder – ellers motsier kortet seg selv. */
  var periode = ssGjeldendePeriode();
  if (!periode) return d;
  if (d <= periode.frist && ssPluss4(d) <= periode.til) return d;

  var senest = new Date(periode.til.getFullYear(), periode.til.getMonth() - 4, periode.til.getDate());
  if (senest > periode.frist) senest = periode.frist;
  var maks = new Date(iDag.getFullYear(), iDag.getMonth() + 3, iDag.getDate());
  if (senest > maks) senest = maks;
  var tidligst = ssTidligsteOppstart();
  return senest < tidligst ? tidligst : senest;
}

function ssStudierettLabel(sc) {
  var start = ssAnbefaltDato(sc);
  var slutt = new Date(start.getFullYear(), start.getMonth() + SS_STUDIERETT_MND, start.getDate() - 1);
  return 'Studierett til ' + slutt.getDate() + '. ' + SS_MND[slutt.getMonth()] + ' ' + slutt.getFullYear();
}

/* Eksamensdatoen for ett emne, eller null når emnet ikke står i planen
   (fleksibel eksamen, eller et semester vi ikke har plan for ennå). */
function ssEksamensdato(kode) {
  var iso = EKSAMENSPLAN[String(kode)];
  if (!iso) return null;
  var d = iso.split('-');
  return new Date(+d[0], +d[1] - 1, +d[2]);
}

function ssFormatDato(d) {
  return d.getDate() + '. ' + SS_MND[d.getMonth()] + ' ' + d.getFullYear();
}

/* Rammene rundt en eksamensperiode: når den åpner og lukker, og når
   oppmeldingen stenger. 'h2026' = høsten 2026, 'v2027' = våren 2027. */
function ssPeriodeInfo(verdi) {
  var m = /^([hv])(\d{4})$/.exec(verdi || '');
  if (!m) return null;
  var y = +m[2];
  if (m[1] === 'h') {
    return { verdi: verdi, navn: 'Høst', maneder: 'desember ' + y + ' eller januar ' + (y + 1),
             fra: new Date(y, 11, 1), til: new Date(y + 1, 0, 15), frist: new Date(y, 10, 1) };
  }
  return { verdi: verdi, navn: 'Vår', maneder: 'mai eller juni ' + y,
           fra: new Date(y, 4, 1), til: new Date(y, 5, 15), frist: new Date(y, 3, 1) };
}

/* Alle perioder fra og med en dato, sortert etter oppmeldingsfrist. */
function ssPerioderFra(dato) {
  var liste = [];
  for (var y = dato.getFullYear(); y <= dato.getFullYear() + 2; y++) {
    liste.push('v' + y, 'h' + y);
  }
  return liste.map(ssPeriodeInfo)
    .sort(function(a, b) { return a.frist - b.frist; });
}

/* Perioden studenten faktisk siktet på. Vet de det ikke ennå, regner vi på den
   første som fortsatt er åpen – det er den strengeste. */
function ssGjeldendePeriode() {
  var info = ssPeriodeInfo(_ssEksamen);
  if (info) return info;
  var forste = ssEksamensPerioder()[0];
  return forste ? ssPeriodeInfo(forste.verdi) : null;
}

/* Sluttdatoen vi måler studieperioden mot. Har vi emnets faktiske eksamensdato
   i den valgte perioden, bruker vi den. Ellers første dag i perioden, som er
   det strengeste anslaget – for eksempel våren, der planen ikke finnes ennå. */
function ssSluttdato(kode, periode) {
  if (!periode) return null;
  var eks = ssEksamensdato(kode);
  if (eks && eks >= periode.fra && eks <= periode.til) return eks;
  return periode.til;
}

/* Lånekassen krever minst 4 måneder fra oppstart til eksamen. */
function ssSenesteOppstart(kode, periode) {
  var slutt = ssSluttdato(kode, periode);
  if (!slutt) return null;
  return new Date(slutt.getFullYear(), slutt.getMonth() - 4, slutt.getDate());
}

/* Første periode som både er åpen for oppmelding og gir fire måneders
   studieperiode med den valgte oppstarten. */
function ssAnbefaltPeriode(kode, oppstart) {
  var alle = ssPerioderFra(oppstart);
  for (var i = 0; i < alle.length; i++) {
    var p = alle[i];
    if (oppstart > p.frist) continue;
    var senest = ssSenesteOppstart(kode, p);
    if (senest && oppstart > senest) continue;
    return p;
  }
  return null;
}

/* Varselteksten når oppstarten ikke henger sammen med den valgte perioden.
   Da peker vi videre til første periode som faktisk går opp.
   «Nei» på Lånekassen slår av sjekken; «vet ikke» gjør det ikke. */
function ssPeriodeVarsel(kode, oppstart) {
  if (_ssWantsLanekassen === false || !oppstart) return null;
  var periode = ssGjeldendePeriode();
  if (!periode) return null;

  var senest = ssSenesteOppstart(kode, periode);
  var rekkerOppmelding = oppstart <= periode.frist;
  var rekkerFireMnd = !senest || oppstart <= senest;
  if (rekkerOppmelding && rekkerFireMnd) return null;

  var aarsak = rekkerOppmelding
    ? 'Studieperioden fram til eksamen i ' + periode.maneder + ' blir for kort – Lånekassen krever minst 4 måneder.'
    : 'Oppmeldingen til eksamen i ' + periode.maneder + ' stenger ' + ssFormatDato(periode.frist) + '.';

  var neste = ssAnbefaltPeriode(kode, oppstart);
  if (!neste || neste.verdi === periode.verdi) return aarsak;
  return aarsak + ' Med denne oppstarten anbefaler vi eksamen i ' + neste.maneder + '.';
}

/* De generelle eksamensperiodene: høst er desember/januar, vår er mai/juni.
   Oppmeldingen stenger 1. november og 1. april, så en periode der fristen er
   passert er ikke et reelt valg – da er første mulighet påfølgende semester. */
function ssTidligsteOppstart() {
  var iDag = new Date();
  iDag.setHours(0, 0, 0, 0);
  return new Date(iDag.getFullYear(), iDag.getMonth(), iDag.getDate() + 1);
}

function ssPluss4(d) {
  return new Date(d.getFullYear(), d.getMonth() + 4, d.getDate());
}

function ssEksamensPerioder() {
  var iDag = new Date();
  iDag.setHours(0, 0, 0, 0);
  var tidligst = ssTidligsteOppstart();
  return ssPerioderFra(iDag)
    /* Perioden må både være åpen for oppmelding og mulig å rekke: selv den
       tidligste tillatte oppstarten må gi fire måneders studieperiode. */
    .filter(function(p) { return p.frist >= iDag && ssPluss4(tidligst) <= p.til; })
    .slice(0, 2)
    .map(function(p) {
      return { verdi: p.verdi, label: p.navn,
               sub: p.maneder.charAt(0).toUpperCase() + p.maneder.slice(1) };
    });
}

function formatDateShort(d) {
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yy = String(d.getFullYear()).slice(-2);
  return dd + '.' + mm + '.' + yy;
}

function getCalendarMinMax() {
  var now = new Date();
  var min = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var max = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  return {
    min: min.toISOString().split('T')[0],
    max: max.toISOString().split('T')[0]
  };
}

/* ── Custom calendar widget ── */
var _ssMonthNames = ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];
var _ssDowLabels = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];

var SS_CHEV_V = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var SS_CHEV_H = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function ssRenderCalendar() {
  var container = document.getElementById('ss-cal-widget');
  if (!container) return;

  var y = _ssCalYear, m = _ssCalMonth;
  var firstDay = new Date(y, m, 1).getDay(); // 0=Sun
  // Convert to Mon-based: Mon=0 … Sun=6
  var startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);

  var minD = new Date(_ssCalMin + 'T00:00:00');
  var maxD = new Date(_ssCalMax + 'T00:00:00');

  // Month nav
  var prevDisabled = (new Date(y, m, 0) < minD) ? ' disabled' : '';
  var nextDisabled = (new Date(y, m + 1, 1) > maxD) ? ' disabled' : '';

  var html = '<div class="ss-cal-nav">'
    + '<span class="ss-cal-month">' + _ssMonthNames[m] + ' ' + y + '</span>'
    + '<div class="ss-cal-arrows">'
    + '<button class="ss-cal-arrow" onclick="ssCalPrev()"' + prevDisabled + ' aria-label="Forrige måned">' + SS_CHEV_V + '</button>'
    + '<button class="ss-cal-arrow" onclick="ssCalNext()"' + nextDisabled + ' aria-label="Neste måned">' + SS_CHEV_H + '</button>'
    + '</div></div>';

  html += '<div class="ss-cal-grid">';
  // Day-of-week headers
  for (var i = 0; i < 7; i++) {
    var wkend = (i >= 5) ? ' ss-weekend' : '';
    html += '<div class="ss-cal-dow' + wkend + '">' + _ssDowLabels[i] + '</div>';
  }
  // Empty cells before 1st
  for (var e = 0; e < startOffset; e++) {
    html += '<button class="ss-cal-day ss-cal-empty" disabled></button>';
  }
  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    var dt = new Date(y, m, d);
    var dow = (startOffset + d - 1) % 7; // 0=Mon..6=Sun
    var isWeekend = dow >= 5;
    var isToday = dt.getTime() === today.getTime();
    var isSelected = _ssCalSelected && dt.getTime() === _ssCalSelected.getTime();
    var isDisabled = dt < minD || dt > maxD;

    var cls = 'ss-cal-day';
    if (isWeekend) cls += ' ss-weekend';
    if (isToday && !isSelected) cls += ' ss-cal-today';
    if (isSelected) cls += ' ss-cal-selected';

    if (isDisabled) {
      html += '<button class="' + cls + '" disabled>' + d + '</button>';
    } else {
      html += '<button class="' + cls + '" onclick="ssCalSelect(' + y + ',' + m + ',' + d + ')">' + d + '</button>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

window.ssCalPrev = function() {
  _ssCalMonth--;
  if (_ssCalMonth < 0) { _ssCalMonth = 11; _ssCalYear--; }
  ssRenderCalendar();
};

window.ssCalNext = function() {
  _ssCalMonth++;
  if (_ssCalMonth > 11) { _ssCalMonth = 0; _ssCalYear++; }
  ssRenderCalendar();
};

window.ssCalSelect = function(y, m, d) {
  _ssCalSelected = new Date(y, m, d);
  if (_ssAktivtEmne) {
    _ssPerEmneDato[_ssAktivtEmne] = _ssCalSelected;
    ssOppdaterVarsel(_ssAktivtEmne);
  }
  ssVisFeil(null);
  ssRenderCalendar();
  ssShowSelectedDate(_ssCalSelected);
  // Enable confirm button
  var btn = document.getElementById('ss-confirm-btn');
  if (btn) btn.disabled = false;
};

function ssFormatLongDate(d) {
  return d.getDate() + '. ' + _ssMonthNames[d.getMonth()].toLowerCase() + ' ' + d.getFullYear();
}

function ssShowSelectedDate(date) {
  var wrap = document.getElementById('ss-selected-date');
  var val = document.getElementById('ss-selected-date-value');
  if (!wrap || !val || !date) return;
  val.textContent = ssFormatLongDate(date);
  wrap.classList.add('show');
}

function ssInitCalendarState() {
  var mm = getCalendarMinMax();
  _ssCalMin = mm.min;
  _ssCalMax = mm.max;
  var now = new Date();
  _ssCalYear = now.getFullYear();
  _ssCalMonth = now.getMonth();
  _ssCalSelected = null;
}

/* ── Info accordion ── */
function buildInfoAccordion() {
  var chevron = '<svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 1l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var startdatoHtml = '<div class="ss-info-accordion">'
    + '<div class="ss-info-header" onclick="ssToggleInfo(this)">'
    + '<span class="ss-info-header-text">Hvilken startdato bør jeg velge?</span>'
    + '<span class="ss-info-header-icon">' + chevron + '</span>'
    + '</div>'
    + '<div class="ss-info-body"><div class="ss-info-body-inner"><ul>'
    + '<li>Startdatoen kan maksimalt settes tre måneder frem i tid og avgjør når du får tilgang til studiet.</li>'
    + '<li>Fristen for betaling og angrerett bestemmes av startdatoen du velger.</li>'
    + '<li>Du kan ikke endre startdato etter bestilling, da må du benytte angreretten og bestille emnet på nytt.</li>'
    + '</ul></div></div>'
    + '</div>';

  var tilgangHtml = '<div class="ss-info-accordion">'
    + '<div class="ss-info-header" onclick="ssToggleInfo(this)">'
    + '<span class="ss-info-header-text">Når får jeg tilgang til emnet?</span>'
    + '<span class="ss-info-header-icon">' + chevron + '</span>'
    + '</div>'
    + '<div class="ss-info-body"><div class="ss-info-body-inner"><ul>'
    + '<li>Du får tilgang til emnet når eventuell dokumentasjon er godkjent og søknaden til studiet er behandlet. Har du valgt å utsette oppstart, får du tilgang på valgt dato.</li>'
    + '<li>Hvis behandlingen av søknaden går lengre enn valgt oppstartsdato, får du tilsvarende utvidet studierett.</li>'
    + '</ul></div></div>'
    + '</div>';

  var lanekassenHtml = '<div class="ss-info-accordion">'
    + '<div class="ss-info-header" onclick="ssToggleInfo(this)">'
    + '<span class="ss-info-header-text">Lånekassen – viktig informasjon</span>'
    + '<span class="ss-info-header-icon">' + chevron + '</span>'
    + '</div>'
    + '<div class="ss-info-body"><div class="ss-info-body-inner"><ul>'
    + '<li>Søknadsfrist hos Lånekassen: <strong>15. mars</strong> for vårsemesteret og <strong>15. november</strong> for høstsemesteret.</li>'
    + '<li>Bestill i god tid – vi kan først bekrefte studiestatus når bestillingen er ferdig behandlet, og Lånekassen har periodevis lang saksbehandling.</li>'
    + '<li>Studieperioden (fra startdato til eksamen) må være <strong>minst 4 måneder</strong> for å gi rett til lån/stipend.</li>'
    + '<li>Studiebelastning avgjør beløpet: 30 studiepoeng per semester tilsvarer heltid, 15 studiepoeng tilsvarer deltid. Det gis ikke støtte for mer enn 30 studiepoeng per semester.</li>'
    + '<li>Lånekassen gir ikke støtte for perioden <strong>16. juni – 15. august</strong>.</li>'
    + '<li>Du kan ikke ta forbehold om at du får lån/stipend – betalingsfristen må overholdes uavhengig av Lånekassens vedtak.</li>'
    + '<li>Du er selv ansvarlig for å kjenne Lånekassens regler. Mer informasjon på <a href="https://www.lanekassen.no/" target="_blank" rel="noopener" onclick="event.stopPropagation()">lanekassen.no</a>.</li>'
    + '</ul>'
    + '<div class="ss-info-link-wrap"><a href="https://www.kristiania.no/studere-hos-oss/opptaksinformasjon/lanekassen/" class="ss-info-link" target="_blank" rel="noopener" onclick="event.stopPropagation()">Les mer: Lånekassen: Nettstudier og samlingsbasert</a></div>'
    + '</div></div>'
    + '</div>';

  return startdatoHtml + tilgangHtml + lanekassenHtml;
}

window.ssToggleInfo = function(header) {
  var acc = header && header.closest ? header.closest('.ss-info-accordion') : null;
  if (acc) acc.classList.toggle('open');
};

/* ── Build modal HTML ── */

/* Hele bunken deler ett valg under denne nøkkelen når «samme dato» er på. */
var SS_ALLE = '__alle';

/* De to oppstartsvalgene. Brukes både for hele bunken og per enkeltemne. */
function ssDatokortHTML(sc, kode) {
  /* Semesterstarten er bare anbefalt av hensyn til Lånekassen. Svarer studenten
     nei, står hen fritt – da er kalenderen eneste valg. */
  var kunValgfri = _ssWantsLanekassen === false;
  if (kunValgfri) _ssPerEmne[kode] = 'custom';

  var valgt = _ssPerEmne[kode] || 'semester';
  var kall = function(verdi) { return 'ssVelgDato(this,\'' + verdi + '\',\'' + kode + '\')'; };
  return '<div class="ss-radio-group">'
    + (kunValgfri ? '' :
       '<div class="ss-radio-card' + (valgt === 'semester' ? ' selected' : '') + '" onclick="' + kall('semester') + '">'
    + '<div class="ss-radio-dot"></div>'
    + '<div style="flex:1">'
    + '<div class="ss-radio-main-row"><div class="ss-radio-main">' + ssFormatDato(ssAnbefaltDato(sc)) + '</div>'
    + '<span class="ss-badge">ANBEFALT</span></div>'
    + '<div class="ss-radio-sub">' + ssStudierettLabel(sc) + '</div>'
    + '</div></div>')
    + '<div class="ss-radio-card' + (valgt === 'custom' ? ' selected' : '') + '" onclick="' + kall('custom') + '">'
    + '<div class="ss-radio-dot"></div>'
    + '<div style="flex:1">'
    + '<div class="ss-radio-main">Valgfri oppstart</div>'
    + '<div class="ss-radio-sub">' + SS_STUDIERETT_MND + ' måneder studierett</div>'
    + '</div>'
    /* Klikk inne i kalenderen må ikke boble opp til kortet – da kalles
       ssVelgDato på nytt, kalenderen bygges om og hopper tilbake til i dag. */
    + '<div class="ss-calendar-wrap" id="ss-cal-wrap-' + kode + '" onclick="event.stopPropagation()"></div>'
    + '</div>'
    + '<div class="ss-varsel" id="ss-varsel-' + kode + '" hidden></div>'
    + '</div>';
}

/* Samler varslene for det valget gjelder: ett emne, eller alle når bunken
   deler oppstartsdato. */
function ssVarselTekster(kode, sc) {
  if (kode !== SS_ALLE) {
    var t = ssPeriodeVarsel(kode, ssValgtDato(kode, sc));
    return t ? [{ navn: null, tekst: t }] : [];
  }
  var dato = ssValgtDato(SS_ALLE, sc);
  var alle = _ssEmner.map(function(e) {
    var v = ssPeriodeVarsel(e.code, dato);
    return v ? { navn: e.name, tekst: v } : null;
  }).filter(Boolean);

  /* Samme melding for hvert emne betyr at den gjelder bunken, ikke emnet. */
  var likeAlle = alle.length === _ssEmner.length && alle.every(function(v) {
    return v.tekst === alle[0].tekst;
  });
  return likeAlle ? [{ navn: null, tekst: alle[0].tekst }] : alle;
}

window.ssOppdaterVarsel = function(kode) {
  var el = document.getElementById('ss-varsel-' + kode);
  if (!el) return;
  var backdrop = document.getElementById('ss-backdrop');
  var sc = backdrop && backdrop._ssScenario;
  if (!sc) return;
  var varsler = ssVarselTekster(kode, sc);
  el.hidden = !varsler.length;
  el.innerHTML = varsler.map(function(v) {
    return '<p class="ss-varsel-tekst">'
      + (v.navn ? '<strong>' + v.navn + ':</strong> ' : '') + v.tekst + '</p>';
  }).join('');
};

/* Per emne: ett kort per studieprogram, med hvert emne og dets eget datovalg. */
/* Ett emne om gangen – «Bekreft» tar studenten videre til neste. */
function ssPerEmneHTML(sc) {
  if (!_ssEmner.length) return ssDatokortHTML(sc, SS_ALLE) + ssFot();

  if (_ssEmneIdx > _ssEmner.length - 1) _ssEmneIdx = _ssEmner.length - 1;
  var g = _ssGruppe || {};
  var e = _ssEmner[_ssEmneIdx];
  var kode = String(e.code);
  var chevron = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return '<div class="ss-emne-group">'
    + '<div class="ss-emne-head">'
    + '<div class="ss-emne-head-main">'
    + (g.meta ? '<div class="ss-emne-head-meta">' + g.meta + '</div>' : '')
    + '<div class="ss-emne-head-name">' + (g.navn || 'Emner') + '</div>'
    + '</div>'
    + '<span class="ss-emne-head-chevron">' + chevron + '</span>'
    + '</div>'
    + '<div class="ss-emne-item">'
    + '<div class="ss-emne-item-code">#' + kode + (e.pts ? ' · ' + e.pts + ' stp.' : '') + '</div>'
    + '<div class="ss-emne-item-name">' + (e.name || '') + '</div>'
    + '<span class="ss-emne-tag">Nett</span>'
    + ssDatokortHTML(sc, kode)
    + ssFot()
    + '</div>'
    + '</div>';
}

function buildApproachingHTML(sc) {
  var hake = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return SS_LUKK
    + '<h2 class="ss-title">Velg studiestart</h2>'
    + '<div class="ss-body">' + ssTilbakeKnapp()
    + '<div class="ss-question" style="font-size:20px;margin:0">Startdato</div>'
    + '<div class="ss-same-date" onclick="ssToggleSammeDato()">'
    + '<span class="ss-checkbox-box' + (_ssSammeDato ? ' checked' : '') + '">' + (_ssSammeDato ? hake : '') + '</span>'
    + '<span class="ss-same-date-label">Samme oppstartsdato for alle emner</span>'
    + '</div>'
    + (_ssSammeDato ? ssDatokortHTML(sc, SS_ALLE) + ssFot() : ssPerEmneHTML(sc))
    + '<div class="ss-faq-section">' + buildInfoAccordion() + '</div>'
    + '</div>';
}

window.ssToggleSammeDato = function() {
  _ssSammeDato = !_ssSammeDato;
  _ssEmneIdx = 0;
  ssGaTilSteg('startdato');
};

window.ssVelgDato = function(kort, verdi, kode) {
  ssVisFeil(null);
  _ssPerEmne[kode] = verdi;
  var gruppe = kort.closest('.ss-radio-group');
  gruppe.querySelectorAll('.ss-radio-card').forEach(function(c) { c.classList.remove('selected'); });
  kort.classList.add('selected');
  ssApneKalender(verdi === 'custom' ? kode : null);
  ssOppdaterVarsel(kode);
};

/* Kalenderen finnes i én instans og flyttes til kortet som er åpent. */
function ssApneKalender(kode) {
  document.querySelectorAll('.ss-calendar-wrap').forEach(function(w) {
    w.classList.remove('open'); w.innerHTML = '';
  });
  _ssAktivtEmne = kode;
  if (!kode) return;

  var wrap = document.getElementById('ss-cal-wrap-' + kode);
  if (!wrap) return;
  wrap.classList.add('open');
  wrap.innerHTML = '<div id="ss-cal-widget" class="ss-cal" style="margin-top:12px"></div>';
  ssInitCalendarState();
  _ssCalSelected = _ssPerEmneDato[kode] || null;
  /* Knappen er alltid aktiv – mangler datoen, sier ssValider() fra i stedet. */
  ssRenderCalendar();
}

function buildBetweenHTML(sc) {
  var mm = getCalendarMinMax();
  var clockSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#5C5C5C" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#5C5C5C" stroke-width="1.5" stroke-linecap="round"/></svg>';

  if (_ssWantsLanekassen) {
    // Card-based layout: upcoming semester + email notification, OR custom date now
    return '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>'
      + '<h2 class="ss-title">Velg studiestart</h2>'
      + '<div class="ss-body">' + ssTilbakeKnapp()
      + '<div class="ss-radio-group">'
      // Card 1: upcoming semester (selected by default, no radio dot)
      + '<div class="ss-radio-card ss-between-lk-card selected" onclick="ssSelectRadioBetween(this,\'semester\')">'
      + '<div style="flex:1">'
      + '<div class="ss-order-label">Kan bestilles fra ' + sc.orderOpens + '</div>'
      + '<div class="ss-radio-main">' + (sc.nextDateFull || sc.nextDate) + '</div>'
      + '<p class="ss-radio-desc">Anbefalt hvis du ønsker å søke lån/stipend hos Lånekassen.</p>'
      + '<div class="ss-radio-sub">' + clockSvg + ' ' + (sc.studierettLabel || '') + '</div>'
      + '<p class="ss-notify-label">Send e-post når jeg kan søke opptak for å sikre studiestøtte.</p>'
      + '<input type="email" class="ss-warning-email" id="ss-notify-email" placeholder="mail@epost.no" onclick="event.stopPropagation()">'
      + '</div>'
      + '</div>'
      // Card 2: custom date now
      + '<div class="ss-radio-card" onclick="ssSelectRadioBetween(this,\'custom\')">'
      + '<div class="ss-radio-dot"></div>'
      + '<div style="flex:1">'
      + '<div class="ss-radio-main">Valgfri oppstart</div>'
      + '<p class="ss-radio-desc">Du kan starte når som helst innen 3 måneder fra dagens dato.</p>'
      + '<div class="ss-radio-sub">' + clockSvg + ' 12 måneder studierett</div>'
      + '<div class="ss-calendar-wrap" id="ss-cal-wrap">'
      + '<div id="ss-cal-widget" class="ss-cal" style="margin-top:12px"></div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="ss-selected-date" id="ss-selected-date">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
      + '<div style="display:flex;flex-direction:column;gap:2px;">'
      + '<div><span class="ss-selected-date-label">Valgt studiestart:</span> <span class="ss-selected-date-value" id="ss-selected-date-value"></span></div>'
      + '<span class="ss-selected-date-hint">Du får tilgang så fort dokumentasjonen er godkjent.</span>'
      + '</div>'
      + '</div>'
      + '<div class="ss-faq-section">'
      + buildInfoAccordion()
      + '</div>'
      + '</div>'
      + '<div class="ss-footer">'
      + '<button class="ss-btn" id="ss-confirm-btn" onclick="confirmStudiestart()">Bekreft</button>'
      + '</div>';
  }

  // Nei case: just show calendar to pick a date now
  return '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>'
    + '<h2 class="ss-title">Velg studiestart</h2>'
    + '<div class="ss-body">' + ssTilbakeKnapp()
    + '<div id="ss-cal-widget" class="ss-cal"></div>'
    + '<div class="ss-selected-date" id="ss-selected-date">'
    + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    + '<div style="display:flex;flex-direction:column;gap:2px;">'
    + '<div><span class="ss-selected-date-label">Valgt studiestart:</span> <span class="ss-selected-date-value" id="ss-selected-date-value"></span></div>'
    + '<span class="ss-selected-date-hint">Du får tilgang så fort dokumentasjonen er godkjent.</span>'
    + '</div>'
    + '</div>'
    + '<div class="ss-faq-section">'
    + buildInfoAccordion()
    + '</div>'
    + '</div>'
    + '<div class="ss-footer">'
    + '<button class="ss-btn" id="ss-confirm-btn" onclick="confirmStudiestart()" disabled>Bekreft</button>'
    + '</div>';
}

/* ── Steg 1: Lånekassen ──────────────────────────────────────────────────
   Svaret avgjør om vi spør om eksamensdato, og hvor mye oppstartsdatoen
   betyr for studenten. */
var SS_LUKK = '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>';

function ssFot() {
  return '<p class="ss-error" id="ss-error" hidden></p>'
    + '<div class="ss-footer"><button class="ss-btn" id="ss-confirm-btn" onclick="ssBekreftSteg()">Bekreft</button></div>';
}

function ssVisFeil(tekst) {
  var el = document.getElementById('ss-error');
  if (!el) return;
  el.textContent = tekst || '';
  el.hidden = !tekst;
}

/* Returnerer feilteksten når steget mangler et valg, ellers null. */
function ssValider() {
  if (_ssSteg === 'lanekassen') {
    return _ssWantsLanekassen === null ? 'Velg et alternativ for å gå videre.' : null;
  }
  if (_ssSteg === 'eksamen') {
    return _ssEksamen === null ? 'Velg et alternativ for å gå videre.' : null;
  }
  var backdrop = document.getElementById('ss-backdrop');
  var sc = backdrop && backdrop._ssScenario;
  if (!sc) return null;
  var kode = _ssSammeDato ? SS_ALLE : String((_ssEmner[_ssEmneIdx] || {}).code);
  return ssDatoFor(kode, sc) ? null : 'Velg en oppstartsdato for å gå videre.';
}

function ssValgkort(verdi, tekst, valgt, handler, sub) {
  return '<div class="ss-radio-card' + (valgt ? ' selected' : '') + '" onclick="' + handler + '(this,\'' + verdi + '\')">'
    + '<div class="ss-radio-dot"></div>'
    + '<div style="flex:1"><div class="ss-radio-main">' + tekst + '</div>'
    + (sub ? '<p class="ss-radio-desc">' + sub + '</p>' : '')
    + '</div>'
    + '</div>';
}

function buildLanekassenHTML() {
  var v = _ssWantsLanekassen;
  return SS_LUKK
    + '<h2 class="ss-title">Oppstart for emner</h2>'
    + '<div class="ss-body">' + ssTilbakeKnapp()
    + '<div>'
    + '<div class="ss-question">Skal du søke lån eller stipend fra Lånekassen?</div>'
    + '<p class="ss-subtitle">Svaret avgjør hvor viktig oppstartsdatoen til emnet er.</p>'
    + '</div>'
    + '<div class="ss-radio-group">'
    + ssValgkort('ja', 'Ja', v === true, 'ssVelgLanekassen')
    + ssValgkort('nei', 'Nei', v === false, 'ssVelgLanekassen')
    + ssValgkort('vetikke', 'Vet ikke ennå', v === 'vetikke', 'ssVelgLanekassen')
    + '</div>'
    + ssFot()
    + '<div class="ss-faq-section">' + buildInfoAccordion() + '</div>'
    + '</div>';
}

window.ssVelgLanekassen = function(kort, verdi) {
  ssVisFeil(null);
  _ssWantsLanekassen = (verdi === 'ja') ? true : (verdi === 'nei' ? false : 'vetikke');
  /* Bare «Ja» får eksamenssteget – et gammelt svar må ikke bli hengende igjen
     og styre studieperiode-sjekken etterpå. */
  if (verdi !== 'ja') _ssEksamen = null;
  var gruppe = kort.closest('.ss-radio-group');
  gruppe.querySelectorAll('.ss-radio-card').forEach(function(c) { c.classList.remove('selected'); });
  kort.classList.add('selected');
  var btn = document.getElementById('ss-confirm-btn');
  if (btn) btn.disabled = false;
};

/* ── Steg 2: eksamensdato ────────────────────────────────────────────────
   Vises bare når studenten svarer «Ja» på Lånekassen. Svaret er sluttdatoen
   Kristiania i dag må be om på e-post for å rapportere den videre. */
function buildEksamenHTML(sc) {
  var kort = ssEksamensPerioder().map(function(a) {
    return ssValgkort(a.verdi, a.label, _ssEksamen === a.verdi, 'ssVelgEksamen', a.sub);
  }).join('') + ssValgkort('vetikke', 'Vet ikke ennå', _ssEksamen === 'vetikke', 'ssVelgEksamen');

  return SS_LUKK
    + '<h2 class="ss-title">Velg studiestart</h2>'
    + '<div class="ss-body">' + ssTilbakeKnapp()
    + '<div>'
    + '<div class="ss-question">Når planlegger du å ta eksamen?</div>'
    + '<p class="ss-subtitle">Svaret avgjør hvor lang studieperiode du har.</p>'
    + '</div>'
    + '<div class="ss-notis">Du må fortsatt melde deg opp til vurdering i StudentWeb</div>'
    + '<div class="ss-radio-group">' + kort + '</div>'
    + ssFot()
    + '<div class="ss-faq-section">' + buildInfoAccordion() + '</div>'
    + '</div>';
}

window.ssVelgEksamen = function(kort, verdi) {
  ssVisFeil(null);
  _ssEksamen = verdi;
  var gruppe = kort.closest('.ss-radio-group');
  gruppe.querySelectorAll('.ss-radio-card').forEach(function(c) { c.classList.remove('selected'); });
  kort.classList.add('selected');
  var btn = document.getElementById('ss-confirm-btn');
  if (btn) btn.disabled = false;
};

/* ── Stegmotor ──────────────────────────────────────────────────────────── */
function ssTittelFor(steg) {
  var s = steg || _ssSteg;
  if (s === 'lanekassen') return 'Oppstart for emner';
  if (s === 'eksamen') return 'Studieperiode';
  return 'Velg studiestart';
}

/* Forrige steg, eller null når vi står på det første. */
function ssForrigeSteg() {
  if (_ssSteg === 'startdato') {
    if (!_ssSammeDato && _ssEmneIdx > 0) return 'forrigeEmne';
    return _ssWantsLanekassen === true ? 'eksamen' : 'lanekassen';
  }
  if (_ssSteg === 'eksamen') return 'lanekassen';
  return null;
}

function ssTilbakeKnapp() {
  if (!ssForrigeSteg() && !_ssOnBack) return '';
  return '<button class="ss-back" onclick="ssTilbake()">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    + 'Tilbake</button>';
}

window.ssTilbake = function() {
  var forrige = ssForrigeSteg();
  if (forrige === 'forrigeEmne') { _ssEmneIdx--; ssGaTilSteg('startdato'); return; }
  if (forrige) { ssGaTilSteg(forrige); return; }
  if (_ssOnBack) _ssOnBack();
};

function ssByggSteg(steg, sc) {
  if (steg === 'lanekassen') return buildLanekassenHTML();
  if (steg === 'eksamen') return buildEksamenHTML(sc);
  return (sc.id === 'approaching') ? buildApproachingHTML(sc) : buildBetweenHTML(sc);
}

window.ssGaTilSteg = function(steg) {
  var backdrop = document.getElementById('ss-backdrop');
  var modal = document.getElementById('ss-modal');
  if (!backdrop || !modal) return;
  var sc = backdrop._ssScenario;
  _ssSteg = steg;
  _ssAktivtEmne = null;
  modal.innerHTML = ssByggSteg(steg, sc);
  if (_ssInline && _ssInline.onTitle) _ssInline.onTitle(ssTittelFor());
  if (steg === 'startdato' && sc.id === 'between') {
    ssInitCalendarState();
    ssRenderCalendar();
  }
  if (steg === 'startdato') {
    var aktivKode = _ssSammeDato ? SS_ALLE : String((_ssEmner[_ssEmneIdx] || {}).code);
    /* Er kalenderen eneste valg, skal den stå åpen fra start. */
    if (_ssWantsLanekassen === false) ssApneKalender(aktivKode);
    /* Vis studieperiode-varselet med en gang, siden datoen er forvalgt. */
    ssOppdaterVarsel(aktivKode);
  }
};

window.ssBekreftSteg = function() {
  var feil = ssValider();
  if (feil) { ssVisFeil(feil); return; }
  ssVisFeil(null);

  if (_ssSteg === 'lanekassen') {
    /* Bare «Ja» trenger eksamensdatoen – den er til Lånekasse-rapporteringen. */
    ssGaTilSteg(_ssWantsLanekassen === true ? 'eksamen' : 'startdato');
    return;
  }
  if (_ssSteg === 'eksamen') { ssGaTilSteg('startdato'); return; }

  /* Egen dato per emne: gå til neste emne til alle er tatt stilling til. */
  if (!_ssSammeDato && _ssEmneIdx < _ssEmner.length - 1) {
    _ssEmneIdx++;
    ssGaTilSteg('startdato');
    return;
  }
  confirmStudiestart();
};

/* ── Public API ── */

window.openStudiestartModal = function(pendingCourses, scenarioOverride, options) {
  _ssPending = pendingCourses || [];

  // skipAll: legg emnene direkte i kurven uten å vise noen modal
  if (options && options.skipAll) {
    _ssPending.forEach(function(c) {
      if (typeof spCart !== 'undefined' && !spCart[c.code]) {
        spCart[c.code] = { name: c.name, pts: c.pts, price: c.price, startDate: '', url: c.url || null };
        document.querySelectorAll('.sp-course-row[data-code="' + c.code + '"] .sp-add-btn').forEach(function(b) {
          b.classList.add('added'); b.textContent = '✓';
        });
        if (c.btn) { c.btn.classList.add('added'); c.btn.textContent = '✓'; }
      }
    });
    if (typeof spSyncToBasket === 'function') spSyncToBasket();
    _ssPending = [];
    return;
  }

  injectStyles();

  // Remove existing modal if any
  var old = document.getElementById('ss-backdrop');
  if (old) old.remove();

  ssNullstillValg();
  _ssEmner = _ssPending.slice();
  _ssGruppe = (options && options.gruppe) || null;
  _ssOnBack = (options && options.onBack) || null;
  var sc = scenarioOverride || getStudiestartScenario();
  _ssSteg = 'lanekassen';
  var initialHTML = buildLanekassenHTML();

  var backdrop = document.createElement('div');
  backdrop.className = 'ss-backdrop';
  backdrop.id = 'ss-backdrop';
  backdrop.innerHTML = '<div class="ss-modal" id="ss-modal">' + initialHTML + '</div>';

  // Close on backdrop click
  backdrop.addEventListener('click', function(e) {
    if (e.target === backdrop) closeStudiestartModal();
  });

  document.body.appendChild(backdrop);

  // Store scenario for later
  backdrop._ssScenario = sc;

  // Trigger open animation
  requestAnimationFrame(function() {
    backdrop.classList.add('open');
    if (sc.id === 'between' && false) {
      ssInitCalendarState();
      ssRenderCalendar();
    }
  });
};

/* Samme steg som skuffen, men rendret rett i en beholder – søknadspanelet.
   opts: { onConfirm(datoStr, perEmne), onNotify(epost), onTitle(tekst), emner, gruppe } */
window.renderStudiestartStep = function(container, scenarioOverride, opts) {
  if (!container) return;
  opts = opts || {};
  injectStyles();

  /* En skuff som står åpen ville ellers krangle om id-ene under. */
  var old = document.getElementById('ss-backdrop');
  if (old) old.remove();

  _ssPending = [];
  ssNullstillValg();
  _ssEmner = (opts.emner || []).slice();
  _ssGruppe = opts.gruppe || null;
  _ssOnBack = opts.onBack || null;
  _ssInline = {
    onConfirm: opts.onConfirm || null,
    onNotify: opts.onNotify || null,
    onTitle: opts.onTitle || null
  };

  var sc = scenarioOverride || window.STUDIESTART_SCENARIO || getStudiestartScenario();
  _ssSteg = 'lanekassen';
  var initialHTML = buildLanekassenHTML();

  var host = document.createElement('div');
  host.className = 'ss-backdrop ss-inline-host open';
  host.id = 'ss-backdrop';
  host.innerHTML = '<div class="ss-modal ss-inline" id="ss-modal">' + initialHTML + '</div>';
  container.innerHTML = '';
  container.appendChild(host);
  host._ssScenario = sc;

  if (_ssInline.onTitle) _ssInline.onTitle(ssTittelFor());
};

function ssNullstillValg() {
  _ssWantsLanekassen = null;
  _ssEksamen = null;
  _ssSammeDato = true;
  _ssPerEmne = {};
  _ssPerEmneDato = {};
  _ssAktivtEmne = null;
  _ssEmneIdx = 0;
  _ssCalSelected = null;
}

function ssClearInline() {
  var inline = _ssInline;
  _ssInline = null;
  return inline || {};
}

window.closeStudiestartModal = function() {
  var backdrop = document.getElementById('ss-backdrop');
  if (!backdrop) return;
  /* Inline-steget eies av panelet det står i – det lukkes ikke herfra. */
  if (backdrop.classList.contains('ss-inline-host')) return;
  backdrop.classList.remove('open');
  setTimeout(function() { backdrop.remove(); }, 250);
  _ssPending = [];
};

window.ssSelectRadioBetween = function(card, value) {
  var group = card.closest('.ss-radio-group');
  group.querySelectorAll('.ss-radio-card').forEach(function(c) { c.classList.remove('selected'); });
  card.classList.add('selected');

  var calWrap = document.getElementById('ss-cal-wrap');
  var btn = document.getElementById('ss-confirm-btn');

  if (value === 'custom') {
    if (calWrap) calWrap.classList.add('open');
    if (btn) btn.disabled = !_ssCalSelected;
    ssInitCalendarState();
    ssRenderCalendar();
  } else {
    if (calWrap) calWrap.classList.remove('open');
    if (btn) btn.disabled = false;
  }
};


window.ssToggleCheckbox = function(row) {
  var box = row.querySelector('.ss-checkbox-box');
  if (box) box.classList.toggle('checked');
};

window.ssBetweenToggle = function() {
  var box = document.getElementById('ss-lk-check');
  if (!box) return;
  var isChecked = box.classList.toggle('checked');

  var warning = document.getElementById('ss-between-warning');
  var calendar = document.getElementById('ss-between-calendar');
  var btn = document.getElementById('ss-confirm-btn');
  var selDate = document.getElementById('ss-selected-date');

  if (isChecked) {
    // Show warning + date input, hide calendar
    if (warning) { warning.style.maxHeight = '600px'; warning.style.opacity = '1'; }
    if (calendar) { calendar.style.maxHeight = '0'; calendar.style.opacity = '0'; }
    // Reset selected date from calendar
    _ssCalSelected = null;
    // Disable button until date input has value
    var dateInput = document.getElementById('ss-custom-date');
    if (btn) btn.disabled = !(dateInput && dateInput.value);
    if (selDate) {
      if (dateInput && dateInput.value) {
        var p = dateInput.value.split('-');
        ssShowSelectedDate(new Date(+p[0], +p[1] - 1, +p[2]));
      } else {
        selDate.classList.remove('show');
      }
    }
  } else {
    // Show calendar, hide warning
    if (warning) { warning.style.maxHeight = '0'; warning.style.opacity = '0'; }
    if (calendar) { calendar.style.maxHeight = '800px'; calendar.style.opacity = '1'; }
    // Re-check if calendar has selection
    if (btn) btn.disabled = !_ssCalSelected;
    if (selDate) selDate.classList.remove('show');
    // Re-render calendar
    ssRenderCalendar();
  }
};

window.ssDateChanged = function() {
  var dateInput = document.getElementById('ss-custom-date');
  var btn = document.getElementById('ss-confirm-btn');
  if (btn && dateInput) btn.disabled = !dateInput.value;
  if (dateInput && dateInput.value) {
    var parts = dateInput.value.split('-');
    ssShowSelectedDate(new Date(+parts[0], +parts[1] - 1, +parts[2]));
  }
};

function ssFormatKort(d) {
  return String(d.getDate()).padStart(2, '0') + '.'
       + String(d.getMonth() + 1).padStart(2, '0') + '.'
       + String(d.getFullYear()).slice(-2);
}

function ssValgtDato(kode, sc) {
  if ((_ssPerEmne[kode] || 'semester') === 'semester') return ssAnbefaltDato(sc);
  return _ssPerEmneDato[kode] || null;
}

/* Tom streng betyr «valgfri oppstart er valgt, men ingen dato er plukket». */
function ssDatoFor(kode, sc) {
  if ((_ssPerEmne[kode] || 'semester') === 'semester') return ssFormatKort(ssAnbefaltDato(sc));
  var d = _ssPerEmneDato[kode];
  return d ? ssFormatKort(d) : '';
}

window.confirmStudiestart = function() {
  var backdrop = document.getElementById('ss-backdrop');
  if (!backdrop) return;
  var sc = backdrop._ssScenario;
  var dateStr = '';
  var perEmne = null;

  if (sc.id === 'approaching') {
    if (_ssSammeDato) {
      dateStr = ssDatoFor(SS_ALLE, sc);
      if (!dateStr) return;   /* valgfri oppstart uten valgt dato */
    } else {
      perEmne = {};
      for (var i = 0; i < _ssEmner.length; i++) {
        var kode = String(_ssEmner[i].code);
        var d = ssDatoFor(kode, sc);
        if (!d) return;
        perEmne[kode] = d;
      }
      dateStr = perEmne[String((_ssEmner[0] || {}).code)] || ssFormatKort(ssAnbefaltDato(sc));
    }
  } else {
    if (_ssWantsLanekassen) {
      // Check which card is selected in between+Ja layout
      var selectedCard = document.querySelector('.ss-radio-card.selected');
      var isSemesterCard = selectedCard && selectedCard.classList.contains('ss-between-lk-card');
      if (isSemesterCard) {
        // User wants to be notified for the upcoming semester — no order is placed
        if (_ssInline) {
          var epostFelt = document.getElementById('ss-notify-email');
          var inline = ssClearInline();
          if (inline.onNotify) inline.onNotify(epostFelt ? epostFelt.value.trim() : '');
          return;
        }
        closeStudiestartModal();
        return;
      }
      // Custom date from calendar
      if (!_ssCalSelected) return;
      var dd = String(_ssCalSelected.getDate()).padStart(2, '0');
      var mm2 = String(_ssCalSelected.getMonth() + 1).padStart(2, '0');
      var yy2 = String(_ssCalSelected.getFullYear()).slice(-2);
      dateStr = dd + '.' + mm2 + '.' + yy2;
    } else {
      // Date from calendar widget
      if (!_ssCalSelected) return;
      var ddd = String(_ssCalSelected.getDate()).padStart(2, '0');
      var mmm = String(_ssCalSelected.getMonth() + 1).padStart(2, '0');
      var yyy = String(_ssCalSelected.getFullYear()).slice(-2);
      dateStr = ddd + '.' + mmm + '.' + yyy;
    }
  }

  /* Inline-modus: kalleren eier emnene og legger dem i søknaden selv. */
  if (_ssInline) {
    var inlineState = ssClearInline();
    if (inlineState.onConfirm) inlineState.onConfirm(dateStr, perEmne);
    return;
  }

  // Add all pending courses with start date
  _ssPending.forEach(function(c) {
    if (typeof spCart !== 'undefined' && !spCart[c.code]) {
      var egen = perEmne ? perEmne[String(c.code)] : null;
      spCart[c.code] = { name: c.name, pts: c.pts, price: c.price, startDate: egen || dateStr, url: c.url || null };
      document.querySelectorAll('.sp-course-row[data-code="' + c.code + '"] .sp-add-btn').forEach(function(b) {
        b.classList.add('added');
        b.textContent = '\u2713';
      });
    }
  });

  if (typeof spSyncToBasket === 'function') spSyncToBasket();

  closeStudiestartModal();
};

})();
