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
.ss-radio-card{border:1.5px solid #D4D4D4;border-radius:8px;padding:18px 20px;cursor:pointer;display:flex;align-items:flex-start;gap:14px;transition:border-color .15s,background .15s}\
.ss-radio-card:hover{background:#F5F5F5}\
.ss-radio-card.selected{border-color:#0A4FB8;background:#F2F7FF}\
.ss-radio-dot{width:22px;height:22px;border:2px solid #D4D4D4;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px;transition:border-color .15s}\
.ss-radio-card.selected .ss-radio-dot{border-color:#0A4FB8}\
.ss-radio-card.selected .ss-radio-dot::after{content:"";width:12px;height:12px;background:#0A4FB8;border-radius:50%}\
.ss-radio-main{font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.25}\
.ss-radio-desc{font-size:14px;color:#5C5C5C;margin:4px 0 0;line-height:1.45}\
.ss-radio-sub{font-size:13px;color:#5C5C5C;margin-top:18px;display:flex;align-items:center;gap:8px}\
.ss-radio-sub svg{flex-shrink:0}\
.ss-radio-sub strong{color:#1A1A1A;font-weight:600}\
.ss-radio-link{color:#0A4FB8;text-decoration:underline;font-size:13px}\
.ss-calendar-wrap{display:none;padding:4px 0 0}\
.ss-calendar-wrap.open{display:block}\
.ss-date-input{width:100%;border:1.5px solid #767676;border-radius:8px;padding:14px 16px;font-size:16px;font-family:inherit;outline:none;transition:border-color .15s;cursor:pointer;box-sizing:border-box;min-height:48px}\
.ss-date-input:focus{border-color:#0A4FB8}\
.ss-hint{font-size:13px;color:#5C5C5C;margin-top:6px}\
.ss-checkbox-row{display:flex;align-items:flex-start;gap:10px;cursor:pointer}\
.ss-checkbox-box{width:22px;height:22px;border:1.5px solid #767676;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}\
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
.ss-btn{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;background:#0A4FB8;color:#fff;font-family:inherit;font-size:16px;font-weight:600;border:none;border-radius:999px;cursor:pointer;width:100%;transition:background .15s}\
.ss-btn:hover{background:#083D8F}\
.ss-btn:disabled{background:#D4D4D4;cursor:not-allowed}\
.ss-btn svg{flex-shrink:0}\
.ss-cal{background:#fff;border-radius:8px;padding:16px;border:1px solid #E6E6E6}\
.ss-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}\
.ss-cal-month{font-size:16px;font-weight:600;color:#1A1A1A}\
.ss-cal-arrows{display:flex;gap:4px}\
.ss-cal-arrow{width:32px;height:32px;border:none;background:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#5C5C5C;font-size:18px;transition:background .15s}\
.ss-cal-arrow:hover{background:#E6E6E6}\
.ss-cal-arrow:disabled{opacity:.3;cursor:not-allowed}\
.ss-cal-arrow:disabled:hover{background:none}\
.ss-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}\
.ss-cal-dow{font-size:12px;font-weight:600;color:#5C5C5C;padding:4px 0 8px;text-transform:capitalize}\
.ss-cal-dow.ss-weekend{color:#8C1D18}\
.ss-cal-day{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:none;background:none;font-size:14px;color:#1A1A1A;cursor:pointer;margin:0 auto;transition:background .12s,color .12s;font-family:inherit}\
.ss-cal-day:hover:not(:disabled):not(.ss-cal-today){background:#E6E6E6}\
.ss-cal-day:disabled{color:#D4D4D4;cursor:not-allowed}\
.ss-cal-day.ss-weekend{color:#8C1D18}\
.ss-cal-day:disabled.ss-weekend{color:#F9CCD2}\
.ss-cal-day.ss-cal-today{background:#F2F7FF;color:#0A4FB8;font-weight:600}\
.ss-cal-day.ss-cal-selected{background:#1A1A1A;color:#fff!important;font-weight:600}\
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
.ss-radio-sub{margin-top:14px}\
.ss-cal{padding:12px 8px}\
.ss-cal-grid{gap:0}\
.ss-cal-day{width:100%;max-width:40px;height:40px;font-size:15px}\
.ss-cal-dow{font-size:11px}\
.ss-close{width:44px;height:44px}\
.ss-btn{height:44px}\
}\
@media (max-width:360px){\
.ss-body{padding:12px 14px 16px}\
.ss-footer{padding:10px 14px calc(14px + env(safe-area-inset-bottom))}\
.ss-cal{padding:10px 4px}\
.ss-cal-day{max-width:36px;height:36px;font-size:14px}\
}\
.ss-simple-card{border:1.5px solid #D4D4D4;border-radius:8px;padding:20px 24px;cursor:pointer;font-size:18px;font-weight:600;color:#1A1A1A;transition:border-color .15s,background .15s}\
.ss-simple-card:hover{background:#F5F5F5;border-color:#D4D4D4}\
.ss-simple-card.selected{border-color:#0A4FB8;background:#F2F7FF}\
.ss-subtitle{font-size:15px;color:#5C5C5C;padding:2px 24px 0;line-height:1.4;flex-shrink:0}\
.ss-order-label{font-size:12px;color:#5C5C5C;margin-bottom:4px}\
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
.ss-inline-host .ss-subtitle{padding:4px 0 0;font-size:18px;font-weight:500;color:#1A1A1A;line-height:1.4}\
.ss-inline-host .ss-body{padding:16px 0 0;overflow:visible;flex:none;min-height:0}\
.ss-inline-host .ss-faq-section{padding:8px 0 0}\
.ss-inline-host .ss-footer{padding:20px 0 0;border-top:none;background:none}\
.ss-inline-host .ss-cal-day{max-width:38px}\
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
    + '<button class="ss-cal-arrow" onclick="ssCalPrev()"' + prevDisabled + '>&lsaquo;</button>'
    + '<button class="ss-cal-arrow" onclick="ssCalNext()"' + nextDisabled + '>&rsaquo;</button>'
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
function buildApproachingHTML(sc) {
  var mm = getCalendarMinMax();
  var calMin = sc.calendarMin || mm.min;
  var calMax = sc.calendarMax || mm.max;
  return '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>'
    + '<h2 class="ss-title">Velg studiestart</h2>'
    + '<div class="ss-body">'
    + '<div class="ss-radio-group">'
    // Option 1: Semester date
    + '<div class="ss-radio-card selected" onclick="ssSelectRadio(this,\'semester\')">'
    + '<div class="ss-radio-dot"></div>'
    + '<div style="flex:1">'
    + '<div class="ss-radio-main">' + sc.semesterLabel + '</div>'
    + '<p class="ss-radio-desc">' + sc.loanInfo + '</p>'
    + '<div class="ss-radio-sub"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#5C5C5C" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#5C5C5C" stroke-width="1.5" stroke-linecap="round"/></svg> ' + sc.studierettLabel + '</div>'
    + '</div></div>'
    // Option 2: Custom date
    + '<div class="ss-radio-card" onclick="ssSelectRadio(this,\'custom\')">'
    + '<div class="ss-radio-dot"></div>'
    + '<div style="flex:1">'
    + '<div class="ss-radio-main">Valgfri oppstart</div>'
    + '<p class="ss-radio-desc">Du kan starte når som helst innen 3 måneder fra dagens dato.</p>'
    + '<div class="ss-radio-sub"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#5C5C5C" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#5C5C5C" stroke-width="1.5" stroke-linecap="round"/></svg> 12 måneder studierett</div>'
    + '<div class="ss-calendar-wrap" id="ss-cal-wrap">'
    + '<input type="date" class="ss-date-input" id="ss-custom-date" min="' + calMin + '" max="' + calMax + '">'
    + '</div>'
    + '</div></div>'
    + '</div>'
    + '<div class="ss-faq-section">'
    + buildInfoAccordion()
    + '</div>'
    + '</div>'
    + '<div class="ss-footer">'
    + '<button class="ss-btn" id="ss-confirm-btn" onclick="confirmStudiestart()">'
    + 'Bekreft'
    + '</button>'
    + '</div>';
}

function buildBetweenHTML(sc) {
  var mm = getCalendarMinMax();
  var clockSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#5C5C5C" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="#5C5C5C" stroke-width="1.5" stroke-linecap="round"/></svg>';

  if (_ssWantsLanekassen) {
    // Card-based layout: upcoming semester + email notification, OR custom date now
    return '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>'
      + '<h2 class="ss-title">Velg studiestart</h2>'
      + '<div class="ss-body">'
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
    + '<div class="ss-body">'
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

/* ── Studiestøtte step ── */
function buildStudiestotteHTML() {
  var chevron = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<div class="ss-header"><button class="ss-close" onclick="closeStudiestartModal()" aria-label="Lukk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button></div>'
    + '<h2 class="ss-title">Studiestøtte</h2>'
    + '<p class="ss-subtitle">Planlegger du å søke lån eller stipend fra Lånekassen?</p>'
    + '<div class="ss-body">'
    + '<div class="ss-radio-group">'
    + '<div class="ss-simple-card" onclick="ssStudiestotteSelect(\'ja\', this)">Ja</div>'
    + '<div class="ss-simple-card" onclick="ssStudiestotteSelect(\'nei\', this)">Nei</div>'
    + '</div>'
    + buildInfoAccordion()
    + '</div>';
}

window.ssStudiestotteSelect = function(val, card) {
  _ssWantsLanekassen = (val === 'ja');
  // Brief visual feedback on the card
  var cards = document.querySelectorAll('.ss-simple-card');
  cards.forEach(function(c) { c.classList.remove('selected'); });
  if (card) card.classList.add('selected');

  var backdrop = document.getElementById('ss-backdrop');
  if (!backdrop) return;
  var sc = backdrop._ssScenario;
  var modal = document.getElementById('ss-modal');
  if (!modal) return;

  setTimeout(function() {
    var html = (sc.id === 'approaching') ? buildApproachingHTML(sc) : buildBetweenHTML(sc);
    modal.innerHTML = html;
    if (_ssInline && _ssInline.onTitle) _ssInline.onTitle('Velg studiestart');
    if (sc.id === 'between' && !_ssWantsLanekassen) {
      ssInitCalendarState();
      ssRenderCalendar();
    }
    // Between+Ja: calendar is lazy-init'd when user clicks "Valgfri oppstart"
  }, 120);
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

  _ssWantsLanekassen = null;
  var sc = scenarioOverride || getStudiestartScenario();
  var skipStudiestotte = options && options.skipStudiestotte;

  var initialHTML = skipStudiestotte
    ? (sc.id === 'approaching' ? buildApproachingHTML(sc) : buildBetweenHTML(sc))
    : buildStudiestotteHTML();

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
    if (skipStudiestotte && sc.id === 'between') {
      ssInitCalendarState();
      ssRenderCalendar();
    }
  });
};

/* Samme steg som skuffen, men rendret rett i en beholder – søknadspanelet.
   opts: { onConfirm(datoStr), onNotify(epost), onTitle(tekst), skipStudiestotte } */
window.renderStudiestartStep = function(container, scenarioOverride, opts) {
  if (!container) return;
  opts = opts || {};
  injectStyles();

  /* En skuff som står åpen ville ellers krangle om id-ene under. */
  var old = document.getElementById('ss-backdrop');
  if (old) old.remove();

  _ssPending = [];
  _ssWantsLanekassen = null;
  _ssInline = {
    onConfirm: opts.onConfirm || null,
    onNotify: opts.onNotify || null,
    onTitle: opts.onTitle || null
  };

  var sc = scenarioOverride || window.STUDIESTART_SCENARIO || getStudiestartScenario();
  var skipStudiestotte = !!opts.skipStudiestotte;
  var initialHTML = skipStudiestotte
    ? (sc.id === 'approaching' ? buildApproachingHTML(sc) : buildBetweenHTML(sc))
    : buildStudiestotteHTML();

  var host = document.createElement('div');
  host.className = 'ss-backdrop ss-inline-host open';
  host.id = 'ss-backdrop';
  host.innerHTML = '<div class="ss-modal ss-inline" id="ss-modal">' + initialHTML + '</div>';
  container.innerHTML = '';
  container.appendChild(host);
  host._ssScenario = sc;

  if (_ssInline.onTitle) _ssInline.onTitle(skipStudiestotte ? 'Velg studiestart' : 'Studiestøtte');
  if (skipStudiestotte && sc.id === 'between') {
    ssInitCalendarState();
    ssRenderCalendar();
  }
};

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

window.ssSelectRadio = function(card, value) {
  var group = card.closest('.ss-radio-group');
  group.querySelectorAll('.ss-radio-card').forEach(function(c) { c.classList.remove('selected'); });
  card.classList.add('selected');

  var calWrap = document.getElementById('ss-cal-wrap');
  var btn = document.getElementById('ss-confirm-btn');
  if (value === 'custom') {
    if (calWrap) calWrap.classList.add('open');
    // Disable confirm until date picked
    var dateInput = document.getElementById('ss-custom-date');
    if (btn) btn.disabled = !dateInput.value;
    if (dateInput) {
      dateInput.onchange = function() { if (btn) btn.disabled = !this.value; };
    }
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

window.confirmStudiestart = function() {
  var backdrop = document.getElementById('ss-backdrop');
  if (!backdrop) return;
  var sc = backdrop._ssScenario;
  var dateStr = '';

  if (sc.id === 'approaching') {
    var selectedCard = document.querySelector('.ss-radio-card.selected');
    if (!selectedCard) return;
    var isSemester = selectedCard.querySelector('.ss-radio-main').textContent.indexOf('Valgfri') === -1;
    if (isSemester) {
      dateStr = sc.semesterDateStr;
    } else {
      var dateInput = document.getElementById('ss-custom-date');
      if (!dateInput || !dateInput.value) return;
      var parts = dateInput.value.split('-');
      dateStr = parts[2] + '.' + parts[1] + '.' + parts[0].slice(-2);
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
    if (inlineState.onConfirm) inlineState.onConfirm(dateStr);
    return;
  }

  // Add all pending courses with start date
  _ssPending.forEach(function(c) {
    if (typeof spCart !== 'undefined' && !spCart[c.code]) {
      spCart[c.code] = { name: c.name, pts: c.pts, price: c.price, startDate: dateStr, url: c.url || null };
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
