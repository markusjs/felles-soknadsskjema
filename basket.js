/**
 * basket.js — Kristiania handlekurv
 * Strukturert datamodell i localStorage. Injiserer sidebar-panel.
 * Kaprer originale React «Søk nå»-knapper for campus-studier.
 */

/* ─── Global topbar fix ─── */
(function(){
  var s = document.createElement('style');
  s.textContent = [
    /* Skjul søk-li i topbaren (ikke wired opp i prototypen) */
    'li:has([role="search"]){display:none!important}',
    /* Skjul profil-ikon (Mitt Kristiania) – kun li med direkte barn-a til min-side */
    'li:has(> a[href$="/min-side/"]){display:none!important}',
    /* Større logo */
    'img[src*="Kristiania_logo"]{height:52px!important;width:auto!important}',
  ].join('');
  document.head.appendChild(s);
})();

/* ─── Constants ─── */
var BASKET_KEY = 'kristiania_basket_v2';
var EMPTY_BASKET = { programs: [], looseEmner: [] };

/* Demo: studiehistorikken til den innloggede brukeren – emner som er bestått i
   et tidligere semester, gruppert på studieprogrammet de ble tatt i. Et program
   med minst ett bestått emne regnes som påbegynt, se getStartedPrograms().
   `href` må matche lenken programmet har i «Dette emnet inngår i»-listen på
   enkeltemnesidene, siden det er nøkkelen vi kobler på. */
/* Demo-studiehistorikk. `completed` er de beståtte emnene med studiepoeng,
   `localUrl` siden i prototypen kortet lenker til – med anker rett ned til
   studieplanleggeren, som er det studenten skal videre i. */
var COMPLETED_BY_PROGRAM = [
  { id: 'adm-ledelse-nett',
    name: 'Administrasjon og ledelse',
    href: '/studier/nettstudier/bachelor/administrasjon-og-ledelse/',
    localUrl: '/studier/Administrasjon og ledelse - Bachelor (nettstudie)#studieplanlegger',
    level: 'Bachelor', totalCredits: 180,
    studieform: 'Deltid',
    completed: [{ code: '6277', pts: 7.5 }, { code: '6024', pts: 7.5 },
                { code: '6340', pts: 7.5 }, { code: '6336', pts: 7.5 }],
    /* Emner studenten er påmeldt, men ikke ferdig med. */
    active: [{ code: '6025', pts: 7.5 }] },
  { id: 'anvendt-psykologi-nett',
    name: 'Anvendt psykologi',
    href: '/studier/nettstudier/bachelor/bachelor-i-anvendt-psykologi/',
    localUrl: '/studier/Anvendt psykologi - Bachelor (nettstudie) _ Kristiania#emner-seksjon',
    level: 'Bachelor', totalCredits: 180,
    studieform: 'Deltid',
    completed: [{ code: 'ap-psyk101', pts: 15 }, { code: 'ap-psyk102', pts: 15 }] }
];

/* Utled kodelistene, så resten av koden kan fortsette å bruke .codes. */
COMPLETED_BY_PROGRAM.forEach(function(p) {
  p.codes = p.completed.map(function(e) { return e.code; });
  p.completedCredits = p.completed.reduce(function(sum, e) { return sum + e.pts; }, 0);
});

/* Flat liste over alle beståtte emnekoder, uavhengig av program. Beholdt som
   egen variabel fordi studieplanleggerne og utsjekk-flyten bruker den direkte. */
var COMPLETED_COURSE_CODES = COMPLETED_BY_PROGRAM.reduce(function(acc, p) {
  return acc.concat(p.codes);
}, []);

/* Emner studenten alt er aktiv i – kan ikke bestilles på nytt. */
var ACTIVE_COURSE_CODES = COMPLETED_BY_PROGRAM.reduce(function(acc, p) {
  return acc.concat((p.active || []).map(function(e) { return e.code; }));
}, []);

function isCompletedCourse(code) {
  return COMPLETED_COURSE_CODES.indexOf(String(code)) > -1;
}

function isActiveCourse(code) {
  return ACTIVE_COURSE_CODES.indexOf(String(code)) > -1;
}

/* Emner som blokkerer søknaden: bestått eller allerede påbegynt. Returnerer
   'bestatt' | 'aktiv' | null. Gjelder bare innloggede – vi kjenner ikke
   studiehistorikken til anonyme besøkende. */
function emneKonflikt(code) {
  if (!getAuthState()) return null;
  if (isCompletedCourse(code)) return 'bestatt';
  if (isActiveCourse(code)) return 'aktiv';
  return null;
}

/* Studieprogrammer studenten har påbegynt: har minst ett bestått emne.
   Kun relevant når brukeren er innlogget – anonyme besøkende har ingen kjent
   studiehistorikk å slå opp i. */
function getStartedPrograms() {
  if (!getAuthState()) return [];
  return COMPLETED_BY_PROGRAM.filter(function(p) { return p.codes.length > 0; });
}

/* Finn emner i kurven som allerede er bestått. Returnerer [] hvis ingen treff. */
function getCompletedConflicts() {
  var b = getBasket();
  var conflicts = [];
  (b.programs || []).forEach(function(p) {
    if (p.type === 'nett' && p.emner) {
      p.emner.forEach(function(e) {
        if (COMPLETED_COURSE_CODES.indexOf(String(e.code)) > -1) {
          conflicts.push({ code: e.code, name: e.name, source: 'program', programId: p.id });
        }
      });
    }
  });
  (b.looseEmner || []).forEach(function(e) {
    if (COMPLETED_COURSE_CODES.indexOf(String(e.code)) > -1) {
      conflicts.push({ code: e.code, name: e.name, source: 'loose' });
    }
  });
  return conflicts;
}

/* ─── Path helper ─── */
function getSokSkjemaPath() {
  return '/sok-skjema.html';
}

/* ─── Innloggingsstatus (delt globalt, uavhengig av side) ─── */
var AUTH_KEY = 'kristiania_auth_v1';

function getAuthState() {
  try {
    var raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function setAuthState(method, name) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ method: method, name: name || 'Lars Juster Eilefsen' }));
  if (typeof window._feideLoggedIn !== 'undefined') window._feideLoggedIn = (method === 'feide');
  if (typeof spApplyCompletedState === 'function') spApplyCompletedState();
  renderBasketPanel();
}

function clearAuthState() {
  localStorage.removeItem(AUTH_KEY);
  if (typeof window._feideLoggedIn !== 'undefined') window._feideLoggedIn = false;
  if (typeof spApplyCompletedState === 'function') spApplyCompletedState();
  renderBasketPanel();
}

/* ─── CSS (injiseres én gang) ─── */
var BASKET_CSS = '\
.uTMhMIeN0bDXVFVIysSa::after{display:none!important}\
#sok-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1200;transition:opacity .3s;opacity:0}\
#sok-panel{display:none;position:fixed;top:0;right:0;height:100%;width:460px;max-width:100vw;background:#fff;z-index:1201;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);flex-direction:column;font-family:inherit;overflow:hidden}\
.hk-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;flex-shrink:0;border-bottom:1px solid #D4D4D4}\
.hk-header h2{font-size:28px;font-weight:600;margin:0;color:#46000A;line-height:1.2}\
.hk-close{background:none;border:none;cursor:pointer;padding:6px;color:#1A1A1A}\
.hk-close svg{width:24px;height:24px}\
.hk-body{flex:1;overflow-y:auto;padding:12px 20px}\
.hk-card{border:1px solid #D4D4D4;border-radius:8px;margin-bottom:16px;overflow:hidden;background:#fff;transition:border-color .2s}\
.hk-card:has(.hk-emner-list.open){border-color:#F9CCD2}\
.hk-card-header{display:flex;align-items:flex-start;justify-content:space-between;padding:16px;gap:12px;cursor:default;transition:background .2s}\
.hk-card-header.hk-clickable{cursor:pointer}\
.hk-card:has(.hk-emner-list) .hk-card-header{background:#FCF8F5}\
.hk-card-meta{font-size:14px;font-weight:400;color:#1A1A1A;line-height:17.5px;margin-bottom:4px}\
.hk-card-name{font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.3}\
.hk-card-right{display:flex;align-items:center;gap:8px;flex-shrink:0}\
.hk-badge{font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;white-space:nowrap;line-height:16px;border:none;color:#fff}\
.hk-badge-sem{background:#3D3D3D;color:#fff}\
.hk-badge-city{background:#AF0018;color:#fff}\
.hk-badge-nett{background:#7A3FD1;color:#fff}\
.hk-step{display:flex;flex-direction:column;gap:16px;padding:4px 0}\
.hk-step-back{display:inline-flex;align-items:center;gap:8px;background:none;border:none;padding:0;cursor:pointer;font-family:inherit;font-size:17px;color:#1A1A1A;align-self:flex-start}\
.hk-step-back:hover{color:#AF0018}\
.hk-step-question{font-size:22px;font-weight:600;color:#1A1A1A;line-height:1.25;margin-bottom:6px}\
.hk-step-sub{font-size:15px;color:#5C5C5C;line-height:1.4;margin:0}\
.hk-step-cards{display:flex;flex-direction:column;gap:8px}\
.hk-step-card{border:1.5px solid #D4D4D4;border-radius:8px;padding:18px 20px;cursor:pointer;display:flex;align-items:flex-start;gap:14px;transition:border-color .15s,background .15s}\
.hk-step-card:hover{background:#F5F5F5}\
.hk-step-card.selected{border-color:#0A4FB8;border-width:2px;padding:17px 19px;background:#F2F7FF}\
.hk-step-dot{width:22px;height:22px;border:2px solid #767676;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px}\
.hk-step-card.selected .hk-step-dot{border-color:#0A4FB8;border-width:2.5px}\
.hk-step-card.selected .hk-step-dot::after{content:"";width:12px;height:12px;background:#0A4FB8;border-radius:50%}\
.hk-step-title{font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.25}\
.hk-step-desc{font-size:14px;color:#5C5C5C;margin:4px 0 0;line-height:1.45}\
.hk-step-feil{color:#AF0018;font-size:14px;margin:0;line-height:1.4}\
.hk-step-h2{font-size:18px;font-weight:600;color:#1A1A1A;margin:0 0 12px}\
.hk-phone-row{display:flex;gap:8px;align-items:stretch}\
.hk-phone-prefix{display:flex;align-items:center;padding:0 14px;border:1px solid #767676;border-radius:8px;font-size:15px;color:#1A1A1A;flex-shrink:0}\
.hk-input{flex:1;border:1px solid #767676;border-radius:8px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;min-height:48px;box-sizing:border-box;width:100%}\
.hk-input:focus{border-color:#0A4FB8}\
.hk-input.feil{border-color:#AF0018;background:#FCF8F5}\
.hk-step-note{font-size:14px;color:#46000A;margin:0}\
.hk-cb-row{display:flex;align-items:flex-start;gap:10px;cursor:pointer}\
.hk-cb{width:22px;height:22px;border:2px solid #767676;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}\
.hk-cb.checked{background:#0A4FB8;border-color:#0A4FB8}\
.hk-cb-label{font-size:14px;color:#1A1A1A;line-height:1.45}\
.hk-otp{display:flex;gap:10px}\
.hk-otp input{width:56px;height:56px;border:1.5px solid #767676;border-radius:50%;font-size:22px;font-weight:600;text-align:center;font-family:inherit;outline:none;background:#fff}\
.hk-otp input:focus{border-color:#0A4FB8}\
.hk-feide-opt{display:flex;align-items:center;gap:12px;width:100%;border:1.5px solid #D4D4D4;border-radius:8px;padding:16px 18px;background:#fff;cursor:pointer;font-family:inherit;font-size:15px;font-weight:500;color:#1A1A1A;text-align:left}\
.hk-feide-opt:hover{background:#F5F5F5}\
.hk-feide-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #D4D4D4;border-radius:8px;padding:14px 16px}\
.hk-feide-avatar{width:32px;height:32px;border-radius:50%;background:#46000A;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:15px;flex-shrink:0}\
.k-delete{background:#F2F7FF;border:none;border-radius:50%;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;color:#0A4FB8;transition:background .15s,color .15s;flex-shrink:0}\
.k-delete:hover{background:#E0EBFE;color:#083D8F}\
.hk-chevron{background:none;border:none;cursor:pointer;padding:4px;transition:transform .2s;color:#1A1A1A}\
.hk-emner-list{border-top:1px solid #E6E6E6;display:none}\
.hk-emner-list.open{display:block}\
.hk-card:has(.hk-emner-list.open) .hk-emner-list{border-top-color:#F9CCD2}\
/* Alle emner i s\u00f8knaden har samme status \u2013 de er lagt til. Derfor b\u00e6rer\
   hver rad den bl\u00e5 «lagt til»-markeringen, ikke bare den sist tilf\u00f8yde. */\
.hk-emne-row{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #E6E6E6;gap:8px;background:#fff}\
.hk-emne-left{flex:1;min-width:0}\
.hk-emne-oppstart{font-size:14px;font-weight:400;color:#1A1A1A;line-height:17.5px;margin-top:2px}\
.hk-emne-oppstart strong{font-weight:600;color:#1A1A1A}\
/* Nett-merket ligger i venstre kolonne, ikke ved slettknappen \u2013 da f\u00e5r\
   emnetittelen hele radbredden. Emnetitlene er lange: en tredjedel av dem\
   er over 30 tegn. */\
.hk-emne-nett{display:inline-flex;margin-top:10px}\
.hk-emne-row:last-child{border-bottom:none}\
.hk-card:has(.hk-emner-list.open) .hk-emne-row{border-bottom-color:#F9CCD2}\
.hk-emner-list{overflow:hidden}\
/* Pulsen peker ut emnet som nettopp ble lagt til, og lander tilbake p\u00e5\
   radens vanlige bl\u00e5 \u2013 den skrur ikke statusen av. */\
@keyframes hkEmneAdded{0%{background:#E0EBFE}70%{background:#E0EBFE}100%{background:#fff}}\
.hk-emne-row.hk-emne-added{animation:hkEmneAdded 2s ease}\
.hk-emne-meta{font-size:14px;font-weight:400;color:#1A1A1A;line-height:17.5px}\
.hk-emne-name{font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.3}\
.hk-emne-right{display:flex;align-items:center;gap:8px;flex-shrink:0}\
.hk-badge-date{background:#3D3D3D;color:#fff;font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;line-height:16px}\
.hk-section-header{display:flex;align-items:center;justify-content:space-between;padding:12px 0 8px;cursor:pointer}\
.hk-section-title{font-size:14px;font-weight:400;color:#1A1A1A}\
.hk-footer{padding:16px 20px;border-top:1px solid #D4D4D4;flex-shrink:0;display:flex;flex-direction:column;gap:10px;position:sticky;bottom:0;background:#fff;z-index:2}\
.hk-auth-row{display:flex;align-items:center;justify-content:space-between;gap:12px}\
.hk-auth-row-loggedin{background:#f5f5f5;border-radius:8px;padding:10px 12px}\
.hk-auth-prompt{font-size:14px;font-weight:500;color:#46000A;flex:1;margin:0}\
.hk-auth-identity{display:flex;align-items:center;gap:10px;min-width:0}\
.hk-auth-avatar{width:36px;height:36px;border-radius:50%;background:#D4D4D4;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#1A1A1A;flex-shrink:0}\
.hk-auth-info{display:flex;flex-direction:column;gap:2px;min-width:0}\
.hk-auth-name{font-size:14px;font-weight:500;color:#1A1A1A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.hk-auth-source{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#46000A;font-weight:500}\
.hk-btn-small{display:inline-block !important;width:auto !important;padding:8px 16px !important;font-size:13px !important;white-space:nowrap;flex-shrink:0;text-decoration:none}\
.hk-btn-outline{display:block;width:100%;text-align:center;padding:13px;border-radius:999px;font-size:16px;font-weight:600;cursor:pointer;border:1px solid #0A4FB8;color:#0A4FB8;background:none;font-family:inherit}\
.hk-btn-outline:hover{background:#F2F7FF}\
.hk-btn-primary{display:block;width:100%;text-align:center;padding:13px;border-radius:999px;font-size:16px;font-weight:600;cursor:pointer;border:none;background:#AF0018;color:#fff;text-decoration:none;font-family:inherit}\
.hk-btn-primary:hover{background:#8C0013}\
.hk-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:24px;padding:64px 16px 16px;color:#5C5C5C}\
.hk-save-card{background:#FCF8F5;border:1px solid #F9CCD2;border-radius:8px;margin-bottom:16px;overflow:hidden}\
#hk-save-slot .hk-save-card{margin-bottom:0}\
#hk-save-slot .hk-save-body{max-height:46vh;overflow-y:auto}\
.hk-save-card .hk-card-header{padding:16px;align-items:center}\
.hk-save-title{font-size:16px;font-weight:600;color:#1A1A1A;margin:0}\
.hk-save-body{padding:0 16px 20px}\
.hk-radio-group{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:14px}\
.hk-radio-option{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:15px;color:#1A1A1A}\
.hk-radio-option input{position:absolute;opacity:0;width:0;height:0}\
.hk-radio-dot{position:relative;width:20px;height:20px;border-radius:50%;border:1.5px solid #0A4FB8;background:#fff;flex-shrink:0;box-sizing:border-box}\
.hk-radio-dot::after{content:"";position:absolute;top:50%;left:50%;width:10px;height:10px;border-radius:50%;background:transparent;transform:translate(-50%,-50%)}\
.hk-radio-option input:checked + .hk-radio-dot::after{background:#0A4FB8}\
.hk-save-consent-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:16px}\
.hk-save-cb{width:20px;height:20px;min-width:20px;border:1.5px solid #767676;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-top:1px;transition:background .15s,border-color .15s}\
.hk-save-cb.checked{background:#0A4FB8;border-color:#0A4FB8}\
.hk-save-cb-label{font-size:14px;color:#1A1A1A;line-height:1.4;cursor:pointer}\
.hk-save-input-row{display:flex;gap:10px}\
.hk-save-input{flex:1;min-width:0;border:1.5px solid #767676;border-radius:8px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;background:#fff}\
.hk-save-input:focus{border-color:#0A4FB8}\
.hk-save-send-btn{background:#0A4FB8;color:#fff;border:none;border-radius:8px;padding:0 22px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}\
.hk-save-send-btn:hover{background:#083D8F}\
.hk-save-privacy{font-size:13px;color:#1A1A1A;line-height:1.5;margin:14px 0 0}\
.hk-save-privacy a{color:#1A1A1A}\
.hk-save-success-row{display:flex;gap:10px;align-items:flex-start}\
.hk-save-success{font-size:15px;color:#1A1A1A;font-weight:400;margin:0;line-height:1.5}\
/* Programvalget: ett kort per studieprogram, med niv\u00e5, hva som legges til og\
   hvor langt studenten er kommet. */\
.hk-prog-card{display:block;width:100%;text-align:left;padding:18px 20px;margin-bottom:14px;border:1px solid #D4D4D4;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s}\
.hk-prog-card:hover{border-color:#0A4FB8;background:#F2F7FF}\
.hk-prog-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}\
.hk-prog-meta{font-size:15px;font-weight:400;color:#5c5c5c;line-height:1.35}\
.hk-prog-name{display:block;font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.3;margin-top:2px}\
.hk-prog-progress{display:block;font-size:15px;font-weight:400;color:#5c5c5c;line-height:1.35;margin-top:8px}\
.hk-prog-sub{display:block;font-size:15px;font-weight:400;color:#1A1A1A;line-height:1.4;margin-top:4px}\
.hk-prog-heading{font-size:19px;font-weight:600;color:#1A1A1A;margin:0 0 12px}\
.hk-prog-heading + .hk-prog-card{margin-top:0}\
.hk-prog-heading.hk-prog-heading-next{margin-top:26px}\
.hk-city-popover{position:fixed;z-index:1300;background:#fff;border-radius:8px;padding:16px;min-width:200px}\
.hk-city-popover h4{margin:0 0 12px;font-size:15px;font-weight:600;color:#1A1A1A}\
.hk-city-btn{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:6px;border:1.5px solid #D4D4D4;border-radius:8px;background:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}\
.hk-city-btn:hover{border-color:#0A4FB8;background:#F2F7FF}\
';

/* ─── CRUD ─── */
function getBasket() {
  try {
    var raw = localStorage.getItem(BASKET_KEY);
    if (!raw) return migrateOldBasket();
    var b = JSON.parse(raw);
    if (!b.programs) return migrateOldBasket();
    return b;
  } catch(e) { return { programs: [], looseEmner: [] }; }
}

function migrateOldBasket() {
  try {
    var old = JSON.parse(localStorage.getItem('kristiania_basket') || '[]');
    if (!Array.isArray(old) || old.length === 0) return { programs: [], looseEmner: [] };
    var b = { programs: [], looseEmner: [] };
    old.forEach(function(item) {
      if (item.type === 'nett' && item.program) {
        b.looseEmner.push({ code: item.id, name: item.name, program: item.program, pts: item.studiepoeng || 10, price: item.pricePerEmne || 6700 });
      } else {
        b.programs.push({ id: item.id, name: item.name, level: item.degree || 'Bachelor', points: '', type: item.type || 'campus', city: item.location || null, startSemester: 'Høst 26', price: item.pricePerSemester || 0 });
      }
    });
    saveBasket(b);
    localStorage.removeItem('kristiania_basket');
    return b;
  } catch(e) { return { programs: [], looseEmner: [] }; }
}

function saveBasket(b) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(b));
  refreshBasketUI();
}

function addProgram(prog) {
  var b = getBasket();
  if (b.programs.find(function(p) { return p.id === prog.id; })) { openSoknaderPanel(); return; }
  b.programs.push(prog);
  saveBasket(b);
  openSoknaderPanel();
}

function addProgramWithEmner(prog) {
  var b = getBasket();
  var existing = b.programs.find(function(p) { return p.id === prog.id; });
  if (existing) {
    existing.emner = prog.emner;
    existing.name = prog.name;
    /* Studiepoengsummen f\u00f8lger emnene, s\u00e5 den m\u00e5 skrives om ogs\u00e5. */
    if (prog.points) existing.points = prog.points;
    /* Gjennomf\u00f8ringen kan v\u00e6re valgt p\u00e5 nytt for denne bestillingen. */
    if (prog.studieform) existing.studieform = prog.studieform;
    if (prog.programCode) existing.programCode = prog.programCode;
  } else {
    b.programs.push(prog);
  }
  saveBasket(b);
  openSoknaderPanel();
}

function removeProgram(id) {
  var b = getBasket();
  // Find the program before removing, to sync SP
  var prog = b.programs.find(function(p) { return p.id === id; });
  b.programs = b.programs.filter(function(p) { return p.id !== id; });
  saveBasket(b);
  renderBasketPanel();
  // Sync studieplanlegger: remove all emner from SP if present
  if (prog && prog.emner && typeof spRemoveCourse === 'function') {
    prog.emner.forEach(function(e) { spRemoveCourse(e.code); });
  }
}

function removeEmne(programId, code) {
  var b = getBasket();
  var prog = b.programs.find(function(p) { return p.id === programId; });
  if (prog && prog.emner) {
    prog.emner = prog.emner.filter(function(e) { return e.code !== code; });
    if (prog.emner.length === 0) b.programs = b.programs.filter(function(p) { return p.id !== programId; });
  }
  saveBasket(b);
  renderBasketPanel();
  // Sync studieplanlegger: remove this emne from SP if present
  if (typeof spRemoveCourse === 'function') { spRemoveCourse(code); }
}

function addLooseEmne(emne) {
  var b = getBasket();
  /* Emnet kan skrives p\u00e5 nytt (oppstartsdato fra studiestart-modalen), s\u00e5
     eksisterende rad oppdateres i stedet for \u00e5 dupliseres. */
  var eksisterende = b.looseEmner.find(function(e) { return e.code === emne.code; });
  if (eksisterende) {
    Object.keys(emne).forEach(function(k) { eksisterende[k] = emne[k]; });
  } else {
    b.looseEmner.push(emne);
  }
  saveBasket(b);
}

/* Studieplanleggeren skriver frittst\u00e5ende emner samlet, slik
   addProgramWithEmner gj\u00f8r for programkortene. */
function addLooseEmnerFromPlanner(emner) {
  if (!emner || !emner.length) return;
  emner.forEach(addLooseEmne);
  openSoknaderPanel();
}

function removeLooseEmne(code) {
  var b = getBasket();
  b.looseEmner = b.looseEmner.filter(function(e) { return e.code !== code; });
  saveBasket(b);
  renderBasketPanel();
  // Sync studieplanlegger: remove this emne from SP if present
  if (typeof spRemoveCourse === 'function') { spRemoveCourse(code); }
}

function clearBasket() {
  saveBasket({ programs: [], looseEmner: [] });
  renderBasketPanel();
  // Sync studieplanlegger: clear all courses
  if (typeof spCart === 'object' && typeof spRemoveCourse === 'function') {
    Object.keys(spCart).forEach(function(code) { spRemoveCourse(code); });
  }
}

function getBasketCount() {
  var b = getBasket();
  return b.programs.length + (b.looseEmner.length > 0 ? 1 : 0);
}

/* Sørg for lik ikon-rekkefølge i topbaren på alle sider:
   profil → søk → kurv → meny */
function normalizeTopbarOrder() {
  var basketImg = document.querySelector('img[src*="Basket.svg"]');
  if (!basketImg) return;
  var basketLi = basketImg.closest('li');
  if (!basketLi) return;
  var ul = basketLi.parentNode;
  if (!ul || ul.tagName !== 'UL') return;

  function liIn(el) {
    if (!el) return null;
    var li = el.closest('li');
    return (li && li.parentNode === ul) ? li : null;
  }
  var searchEl = document.querySelector('[role="search"]')
    || document.querySelector('img[src*="search.svg"]')
    || document.querySelector('img[src*="Search.svg"]');
  var profile  = liIn(document.querySelector('a[href$="/min-side/"]'));
  var search   = liIn(searchEl);
  var menu     = liIn(document.querySelector('img[src*="Menu.svg"]'));

  var order = [profile, search, basketLi, menu];
  for (var i = 0; i < order.length; i++) {
    if (order[i] && order[i].parentNode === ul) ul.appendChild(order[i]);
  }
}

/* ─── UI refresh ─── */
function refreshBasketUI() {
  updateBasketCount();
  renderBasketPanel();
}

function updateBasketCount() {
  var n = getBasketCount();
  document.querySelectorAll('#topbar-basket-count').forEach(function(el) {
    el.textContent = n; el.style.display = n > 0 ? 'block' : 'none';
  });
}

/* ─── Sidebar inject ─── */
function injectSidebarPanel() {
  if (document.getElementById('sok-panel')) return;
  // Inject CSS
  if (!document.getElementById('hk-styles')) {
    var style = document.createElement('style');
    style.id = 'hk-styles';
    style.textContent = BASKET_CSS;
    document.head.appendChild(style);
  }
  // Inject HTML
  var html = '<div id="sok-backdrop" onclick="closeSoknaderPanel()"></div>'
    + '<div id="sok-panel">'
    + '<div class="hk-header"><h2 id="hk-title">Søknader</h2>'
    + '<button class="hk-close" onclick="closeSoknaderPanel()" aria-label="Lukk">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'
    + '</button></div>'
    + '<div class="hk-body" id="hk-body"></div>'
    + '<div class="hk-footer" id="hk-footer">'
    /* Foten står nederst i sidebaren uansett steg. Rekkefølgen går fra det
       uforpliktende til det som fører søknaden videre: lagre, logg inn, gå videre. */
    + '<div id="hk-save-slot"></div>'
    + '<div id="hk-auth-slot"></div>'
    // Fra handlekurven er studievalget allerede gjort → hopp rett til innlogging
    + '<a href="' + getSokSkjemaPath() + '" id="hk-cta-btn" class="hk-btn-primary" style="display:none;">Gå videre</a>'
    + '</div>'
    + '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function openSoknaderPanel() {
  injectSidebarPanel();
  renderBasketPanel();
  var panel = document.getElementById('sok-panel');
  var backdrop = document.getElementById('sok-backdrop');
  if (!panel) return;
  panel.style.display = 'flex';
  backdrop.style.display = 'block';
  requestAnimationFrame(function() { requestAnimationFrame(function() {
    panel.style.transform = 'translateX(0)';
    backdrop.style.opacity = '1';
  }); });
}

function closeSoknaderPanel() {
  var panel = document.getElementById('sok-panel');
  var backdrop = document.getElementById('sok-backdrop');
  if (!panel) return;
  panel.style.transform = 'translateX(100%)';
  backdrop.style.opacity = '0';
  setTimeout(function() {
    panel.style.display = 'none';
    backdrop.style.display = 'none';
  }, 350);
}

/* ─── Trash SVG ─── */
var TRASH_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
var LOCK_SVG_SMALL = '<svg width="11" height="11" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="#46000A" stroke-width="2.6"/><rect x="11" y="15" width="10" height="7" rx="1.5" stroke="#46000A" stroke-width="1.8"/><path d="M13 15v-2.5a3 3 0 016 0V15" stroke="#46000A" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="19" r="1.2" fill="#46000A"/></svg>';

/* Innloggingsrad i bunnen av Søknader-panelet — vises alltid, uansett kurvinnhold */
function buildAuthFooterRow(awaitingChoice) {
  var auth = getAuthState();
  if (!auth) {
    var prompt = 'Logg inn for \u00e5 finne p\u00e5begynte studieprogrammer';
    /* Venter panelet på et programvalg, skal «Logg inn» logge inn på stedet og
       vurdere valget på nytt – ikke sende brukeren inn i søknadsskjemaet og
       forlate emnet. Det er også det fotnoten lover. */
    var loginBtn = awaitingChoice
      ? '<button class="hk-btn-outline hk-btn-small" onclick="hkLoginAndRetryChoice()">Logg inn</button>'
      : '<button class="hk-btn-outline hk-btn-small" onclick="hkVisLoggInn()">Logg inn</button>';
    return '<div class="hk-auth-row">'
      + '<p class="hk-auth-prompt">' + prompt + '</p>'
      + loginBtn
      + '</div>';
  }
  var parts = (auth.name || '').trim().split(/\s+/);
  var initials = ((parts[0] || '')[0] || '') + ((parts[parts.length - 1] || '')[0] || '');
  var methodLabel = auth.method === 'feide' ? 'Innlogget med FEIDE' : 'Innlogget';
  return '<div class="hk-auth-row hk-auth-row-loggedin">'
    + '<div class="hk-auth-identity">'
    + '<div class="hk-auth-avatar">' + initials.toUpperCase() + '</div>'
    + '<div class="hk-auth-info"><span class="hk-auth-name">' + auth.name + '</span>'
    + '<span class="hk-auth-source">' + LOCK_SVG_SMALL + methodLabel + '</span></div>'
    + '</div>'
    /* Utlogging hører hjemme i søknadsskjemaet, ikke i panelet. */
    + '</div>';
}
var CHEVRON_DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var CHEVRON_UP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ─── «Lagre og fortsett senere» — send søknaden til seg selv på e-post/SMS ─── */
var _hkSaveOpen = false;
var _hkSaveMethod = 'epost'; // 'epost' | 'sms'
var _hkSaveConsent = false;
/* Kvitteringen må overleve at foten tegnes på nytt – boksen står i foten, og
   den bygges om hver gang panelet bytter steg. */
var _hkSaveSentTo = null;

function hkSaveBoxHtml() {
  var isEpost = _hkSaveMethod === 'epost';
  var body = '';
  if (_hkSaveOpen && _hkSaveSentTo) {
    body = '<div class="hk-save-body"><div class="hk-save-success-row">' + CHECK_SVG_DARK
      + '<p class="hk-save-success">En lenke har blitt sendt til «' + _hkSaveSentTo + '». Bruk den for å fortsette søknaden senere.</p>'
      + '</div></div>';
  } else if (_hkSaveOpen) {
    body = '<div class="hk-save-body">'
      + '<div class="hk-radio-group">'
      + '<label class="hk-radio-option"><input type="radio" name="hk-save-method"' + (isEpost ? ' checked' : '') + ' onchange="setHkSaveMethod(\'epost\')"><span class="hk-radio-dot"></span>Send på e-post</label>'
      + '<label class="hk-radio-option"><input type="radio" name="hk-save-method"' + (!isEpost ? ' checked' : '') + ' onchange="setHkSaveMethod(\'sms\')"><span class="hk-radio-dot"></span>Send på SMS</label>'
      + '</div>'
      + '<div class="hk-save-consent-row">'
      + '<div id="hk-save-cb" class="hk-save-cb' + (_hkSaveConsent ? ' checked' : '') + '" onclick="hkToggleSaveConsent()">' + (_hkSaveConsent ? CHECK_SVG_SMALL : '') + '</div>'
      + '<span class="hk-save-cb-label" onclick="hkToggleSaveConsent()">En studierådgiver kan ta kontakt for å hjelpe meg med studievalg (valgfritt).</span>'
      + '</div>'
      + '<div class="hk-save-input-row">'
      + '<input type="' + (isEpost ? 'email' : 'tel') + '" id="hk-save-input" class="hk-save-input" placeholder="' + (isEpost ? 'Din e-postadresse' : 'Ditt mobilnummer') + '">'
      + '<button class="hk-save-send-btn" onclick="sendBasketSave()">Send</button>'
      + '</div>'
      + '<p class="hk-save-privacy">Vi behandler opplysningene dine i tråd med <a href="#">personvernerklæringen</a>.</p>'
      + '</div>';
  }
  return '<div class="hk-card hk-save-card" id="hk-save-box">'
    + '<div class="hk-card-header hk-clickable" onclick="toggleHkSaveBox()">'
    + '<p class="hk-save-title">Lagre og fortsett senere</p>'
    + '<button class="hk-chevron">' + (_hkSaveOpen ? CHEVRON_UP : CHEVRON_DOWN) + '</button>'
    + '</div>'
    + body
    + '</div>';
}

var CHECK_SVG_SMALL = '<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var CHECK_SVG_DARK = '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" style="flex-shrink:0;margin-top:3px"><path d="M1 6l4.5 4.5L15 1" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function toggleHkSaveBox() {
  _hkSaveOpen = !_hkSaveOpen;
  var box = document.getElementById('hk-save-box');
  if (box) box.outerHTML = hkSaveBoxHtml();
}

function hkToggleSaveConsent() {
  _hkSaveConsent = !_hkSaveConsent;
  var cb = document.getElementById('hk-save-cb');
  if (cb) {
    cb.classList.toggle('checked', _hkSaveConsent);
    cb.innerHTML = _hkSaveConsent ? CHECK_SVG_SMALL : '';
  }
}

function setHkSaveMethod(method) {
  _hkSaveMethod = method;
  var box = document.getElementById('hk-save-box');
  if (box) box.outerHTML = hkSaveBoxHtml();
}

function sendBasketSave() {
  var input = document.getElementById('hk-save-input');
  if (!input) return;
  var val = input.value.trim();
  var valid = _hkSaveMethod === 'epost'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    : val.replace(/\s/g, '').length >= 8;
  if (!valid) { input.style.borderColor = '#AF0018'; input.focus(); return; }
  var body = input.closest('.hk-save-body');
  if (!body) return;
  _hkSaveSentTo = val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  body.innerHTML = '<div class="hk-save-success-row">' + CHECK_SVG_DARK
    + '<p class="hk-save-success">En lenke har blitt sendt til «' + _hkSaveSentTo + '». Bruk den for å fortsette søknaden senere.</p>'
    + '</div>';
}

/* ─── Render ─── */
/* Fyller innloggingsraden + viser/skjuler "Gå videre"-knappen. Kalles av alle
   visninger i #sok-panel (søknadsliste, velg-studieprogram, velg-campus) slik
   at bunnraden alltid er synlig og konsistent, uansett hva som vises i body. */
/* awaitingChoice: panelet venter på at brukeren velger studieprogram for et
   emne. Da skal «Gå videre» skjules – ellers kan man gå videre og
   miste emnet som er i ferd med å bli lagt til. Innloggingsraden beholdes,
   siden innlogging er en del av valget (den finner påbegynte program). */
function refreshSokPanelFooter(awaitingChoice) {
  var authSlot = document.getElementById('hk-auth-slot');
  if (authSlot) authSlot.innerHTML = buildAuthFooterRow(awaitingChoice);
  var ctaBtn = document.getElementById('hk-cta-btn');
  if (ctaBtn) {
    var b = getBasket();
    var totalItems = (b.programs || []).length + (b.looseEmner || []).length;
    ctaBtn.style.display = (!awaitingChoice && totalItems > 0) ? 'block' : 'none';
  }
  /* Ingenting å lagre når søknaden er tom og panelet ikke står midt i et valg. */
  var saveSlot = document.getElementById('hk-save-slot');
  if (saveSlot) {
    var harNoe = awaitingChoice || (getBasket().programs || []).length + (getBasket().looseEmner || []).length > 0;
    saveSlot.innerHTML = (getAuthState() || !harNoe) ? '' : hkSaveBoxHtml();
  }
  var footer = document.getElementById('hk-footer');
  if (footer) footer.style.display = 'flex';
}

function renderBasketPanel() {
  injectSidebarPanel();
  var b = getBasket();
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;

  var totalItems = b.programs.length + b.looseEmner.length;
  if (title) title.textContent = 'Søknad';
  refreshSokPanelFooter();

  if (totalItems === 0) {
    body.innerHTML = '<div class="hk-empty">'
      + '<div style="background:#FCF8F5;border-radius:999px;padding:16px;display:inline-flex;align-items:center;justify-content:center;">'
      + '<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M22 9L12 5 2 9l10 4 10-4z" stroke="#1A1A1A" stroke-width="1.8" stroke-linejoin="round" fill="none"/><path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke="#1A1A1A" stroke-width="1.8" stroke-linejoin="round" fill="none"/><line x1="22" y1="9" x2="22" y2="14" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round"/></svg>'
      + '</div>'
      + '<a href="/utdanning" style="display:block;width:100%;text-align:center;padding:12px;border-radius:999px;font-size:16px;font-weight:500;cursor:pointer;border:1px solid #46000A;color:#46000A;background:none;font-family:inherit;text-decoration:none;">Legg til studier eller emner</a>'
      + '</div>';
    return;
  }

  var html = '';
  b.programs.forEach(function(prog) {
    if (prog.type === 'nett' && prog.emner && prog.emner.length > 0) {
      html += renderNettCard(prog);
    } else {
      html += renderCampusCard(prog);
    }
  });

  if (b.looseEmner.length > 0) {
    html += renderLooseEmner(b.looseEmner);
  }

  body.innerHTML = html;
}

/* Fjerning fra Søknader-panelet må også oppdatere søknadsskjemaet bak panelet,
   ellers står den siden med utdatert innhold. Funksjonene finnes bare der. */
function refreshSoknadsskjemaOmTilstede() {
  var steg = (typeof _currentStep !== 'undefined') ? _currentStep : null;
  if (steg === 0 && typeof renderStep0 === 'function') renderStep0();
  if (steg === 4 && typeof renderPaymentStep === 'function') renderPaymentStep();
  if (typeof renderSidebar === 'function') renderSidebar();
}

function hkRemoveProgram(id) {
  removeProgram(id);
  refreshSoknadsskjemaOmTilstede();
}

function hkRemoveEmne(programId, code) {
  removeEmne(programId, code);
  refreshSoknadsskjemaOmTilstede();
}

function hkRemoveLooseEmne(code) {
  removeLooseEmne(code);
  refreshSoknadsskjemaOmTilstede();
}

/* «180 studiepoeng» -> «180 stp.». Stedsstudier henter denne som fritekst fra
   studiesiden, så forkortingen må skje ved rendring. */
function shortPts(str) {
  return String(str || '').replace(/studiepoeng/gi, 'stp.');
}

/* « · Deltid [NOH]» – gjennomføringen og studiekoden studenten valgte */
function gjennomforingSuffix(o) {
  if (!o || !o.studieform) return '';
  var kode = o.programCode || o.studiekode;
  /* Studiekoden vises bevisst: studentene trenger den når de søker
     utdanningsstøtte hos Lånekassen. */
  return ' · ' + o.studieform + (kode ? ' [' + kode + ']' : '');
}

function renderCampusCard(prog) {
  var badges = '';
  if (prog.startSemester) badges += '<span class="hk-badge hk-badge-sem">' + prog.startSemester + '</span>';
  if (prog.city) badges += '<span class="hk-badge hk-badge-city">' + prog.city + '</span>';
  return '<div class="hk-card"><div class="hk-card-header">'
    + '<div><div class="hk-card-meta">' + (prog.level || '') + (prog.points ? ' · ' + shortPts(prog.points) : '') + '</div>'
    + '<div class="hk-card-name">' + prog.name + '</div></div>'
    + '<div class="hk-card-right">' + badges
    + '<button class="k-delete" onclick="hkRemoveProgram(\'' + prog.id + '\')" aria-label="Fjern">' + TRASH_SVG + '</button>'
    + '</div></div></div>';
}

function renderNettCard(prog) {
  var emnerCount = prog.emner ? prog.emner.length : 0;
  var totalPts = 0;
  if (prog.emner) prog.emner.forEach(function(e) { totalPts += parseFloat(e.pts) || 0; });
  var ptsStr = totalPts % 1 === 0 ? totalPts : totalPts.toFixed(1).replace('.', ',');
  var meta = (prog.level || '') + ' · ' + ptsStr + ' stp. · ' + emnerCount + ' emner'
    + gjennomforingSuffix(prog);

  var emnerHtml = '';
  if (prog.emner) {
    prog.emner.forEach(function(e) {
      emnerHtml += '<div class="hk-emne-row" data-code="' + (e.code || '') + '">'
        + '<div class="hk-emne-left"><div class="hk-emne-meta">#' + (e.code || '') + ' · ' + (e.pts || 0) + ' stp.</div>'
        + '<div class="hk-emne-name">' + e.name + '</div>'
        + (e.startDate ? '<div class="hk-emne-oppstart">Oppstart: <strong>' + e.startDate + '</strong></div>' : '')
        + '<span class="hk-badge hk-badge-nett hk-emne-nett">Nett</span></div>'
        + '<div class="hk-emne-right">'
        + '<button class="k-delete" onclick="hkRemoveEmne(\'' + prog.id + '\',\'' + e.code + '\')" aria-label="Fjern">' + TRASH_SVG + '</button>'
        + '</div></div>';
    });
  }

  return '<div class="hk-card" data-prog-id="' + prog.id + '"><div class="hk-card-header hk-clickable" onclick="toggleHkEmner(this)">'
    + '<div><div class="hk-card-meta">' + meta + '</div>'
    + '<div class="hk-card-name">' + prog.name + '</div></div>'
    + '<div class="hk-card-right">'
    + '<button class="hk-chevron">' + CHEVRON_DOWN + '</button>'
    + '<button class="k-delete" onclick="event.stopPropagation();hkRemoveProgram(\'' + prog.id + '\')" aria-label="Fjern hele studieprogrammet">' + TRASH_SVG + '</button>'
    + '</div></div>'
    + '<div class="hk-emner-list">' + emnerHtml + '</div></div>';
}

/* Kortet med frittst\u00e5ende emner har ingen program-id, men trenger en krok
   revealEmne kan sl\u00e5 opp p\u00e5 n\u00e5r et emne legges til. */
var HK_LOOSE_CARD_ID = '__loose';

function renderLooseEmner(emner) {
  var inner = '';
  emner.forEach(function(e) {
    inner += '<div class="hk-emne-row" data-code="' + (e.code || '') + '">'
      + '<div class="hk-emne-left"><div class="hk-emne-meta">' + (e.program || 'Enkeltemne') + ' · ' + (e.pts || 0) + ' stp.'
      + gjennomforingSuffix(e) + '</div>'
      + '<div class="hk-emne-name">' + e.name + '</div>'
      + (e.startDate ? '<div class="hk-emne-oppstart">Oppstart: <strong>' + e.startDate + '</strong></div>' : '')
      + '<span class="hk-badge hk-badge-nett hk-emne-nett">Nett</span></div>'
      + '<div class="hk-emne-right">'
      + '<button class="k-delete" onclick="hkRemoveLooseEmne(\'' + e.code + '\')" aria-label="Fjern">' + TRASH_SVG + '</button>'
      + '</div></div>';
  });
  return '<div class="hk-card" data-prog-id="' + HK_LOOSE_CARD_ID + '"><div class="hk-card-header hk-clickable" onclick="toggleHkEmner(this)">'
    + '<div><div class="hk-section-title">Emner uten tilknytning til studieprogram</div>'
    + '<div style="font-weight:600;font-size:14px;">' + emner.length + ' emne' + (emner.length > 1 ? 'r' : '') + '</div></div>'
    + '<div class="hk-card-right"><button class="hk-chevron">' + CHEVRON_DOWN + '</button></div>'
    + '</div><div class="hk-emner-list">' + inner + '</div></div>';
}

function toggleHkEmner(headerEl) {
  var card = headerEl.closest('.hk-card');
  if (!card) return;
  var list = card.querySelector('.hk-emner-list');
  var chevBtn = card.querySelector('.hk-chevron');
  if (!list) return;
  var isOpen = list.classList.contains('open');
  list.classList.toggle('open');
  if (chevBtn) chevBtn.innerHTML = isOpen ? CHEVRON_DOWN : CHEVRON_UP;
}

/* ─── React «Søk nå» button interception ─── */
function extractChoices() {
  var props = window.__reactProps || {};
  var keys = Object.keys(props);
  for (var i = 0; i < keys.length; i++) {
    var val = props[keys[i]];
    if (val && val.admissionCallToAction && val.admissionCallToAction.choices) {
      return val.admissionCallToAction.choices;
    }
  }
  return null;
}

function interceptSokNaaButtons() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button[title="Søk nå"]');
    if (!btn) return;
    if (!btn.classList.contains('yEK9biWpMxeKit4W3SEn')) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var choices = extractChoices();
    if (!choices || choices.length === 0) return;

    // Deduplicate by city
    var cityMap = {};
    choices.forEach(function(c) { if (c.variantCity) cityMap[c.variantCity] = c; });
    var uniqueCities = Object.keys(cityMap);

    if (uniqueCities.length <= 1) {
      // Single city or no city — add directly
      addChoiceToBasket(choices[0]);
    } else {
      // Multiple cities — show selection in sidebar
      showCitySelectionInSidebar(cityMap);
    }
  }, true); // capture phase
}

function addChoiceToBasket(choice) {
  closeCityPopover();
  addProgram({
    id: choice.id || choice.variantCode,
    name: choice.name || '',
    level: deriveLevelFromPage(),
    points: choice.points || '',
    type: choice.studyItemType === 'onlineStudy' ? 'nett' : 'campus',
    city: choice.variantCity || null,
    startSemester: (choice.startSemester || 'Høst') + ' 26',
    price: choice.price || 0,
    studyFormType: choice.studyFormType || ''
  });
}

/* Derive level from study info on page or name */
function deriveLevelFromPage() {
  var props = window.__reactProps || {};
  var keys = Object.keys(props);
  for (var i = 0; i < keys.length; i++) {
    var val = props[keys[i]];
    if (val && val.admissionCallToAction && val.admissionCallToAction.choices) {
      var c = val.admissionCallToAction.choices[0];
      if (c) {
        var name = c.name || '';
        if (name.indexOf('Master') !== -1) return 'Master';
        if (name.indexOf('Fagskole') !== -1 || name.indexOf('fagskole') !== -1) return 'Fagskole';
      }
    }
    // Also check study item type name mapping
    if (val && val.studyItemType) {
      if (val.studyItemType === 'masterStudy') return 'Master';
      if (val.studyItemType === 'vocationalStudy') return 'Fagskole';
    }
  }
  // Fallback: check page title
  var title = document.title || '';
  if (title.indexOf('Master') !== -1) return 'Master';
  if (title.indexOf('Fagskole') !== -1 || title.indexOf('fagskole') !== -1) return 'Fagskole';
  return 'Bachelor';
}

/* ─── City selection in sidebar ─── */
function showCitySelectionInSidebar(cityMap) {
  injectSidebarPanel();
  openSoknaderPanel();
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  refreshSokPanelFooter();
  if (title) title.textContent = 'Velg campus';

  var studyName = '';
  var firstChoice = cityMap[Object.keys(cityMap)[0]];
  if (firstChoice) studyName = firstChoice.name || '';

  var html = '<div style="padding:8px 0;">'
    + '<p style="font-size:14px;color:#5C5C5C;margin:0 0 4px;">Du legger til:</p>'
    + '<p style="font-size:16px;font-weight:600;margin:0 0 20px;color:#1a1a1a;">' + studyName + '</p>'
    + '<p style="font-size:15px;font-weight:600;margin:0 0 12px;color:#1a1a1a;">Velg campus</p>';
  Object.keys(cityMap).forEach(function(city) {
    html += '<button class="hk-city-sidebar-btn" onclick="addChoiceToBasket(' + JSON.stringify(cityMap[city]).replace(/"/g, '&quot;') + ')"'
      + ' style="display:block;width:100%;text-align:left;padding:16px;margin-bottom:8px;border:1.5px solid #D4D4D4;border-radius:8px;background:#fff;font-size:16px;font-weight:500;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s;"'
      + ' onmouseover="this.style.borderColor=\'#AF0018\';this.style.background=\'#FCF8F5\'"'
      + ' onmouseout="this.style.borderColor=\'#D4D4D4\';this.style.background=\'#fff\'"'
      + '>' + city + '</button>';
  });
  html += '</div>';
  body.innerHTML = html;
}

/* ─── City popover (legacy) ─── */
var cityPopoverEl = null;

function showCityPopover(anchorBtn, cityMap) {
  closeCityPopover();
  var rect = anchorBtn.getBoundingClientRect();
  var div = document.createElement('div');
  div.className = 'hk-city-popover';
  div.id = 'hk-city-popover';
  div.style.top = (rect.bottom + 8) + 'px';
  div.style.left = Math.max(8, rect.left) + 'px';
  var html = '<h4>Velg campus</h4>';
  Object.keys(cityMap).forEach(function(city) {
    html += '<button class="hk-city-btn" onclick="addChoiceToBasket(' + JSON.stringify(cityMap[city]).replace(/"/g, '&quot;') + ')">' + city + '</button>';
  });
  div.innerHTML = html;
  document.body.appendChild(div);
  cityPopoverEl = div;
  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', closeCityPopoverOnOutside);
  }, 10);
}

function closeCityPopover() {
  if (cityPopoverEl) { cityPopoverEl.remove(); cityPopoverEl = null; }
  document.removeEventListener('click', closeCityPopoverOnOutside);
}

function closeCityPopoverOnOutside(e) {
  if (cityPopoverEl && !cityPopoverEl.contains(e.target)) closeCityPopover();
}

/* ─── Topbar basket auto-enhancer ─── */
function enhanceTopbarBasket() {
  var basketImg = document.querySelector('img[src*="Basket.svg"]');
  if (!basketImg) return;
  var btn = basketImg.closest('button');
  if (!btn) return;
  // Normaliser vertikal justering (fjern inline-block baseline-gap)
  basketImg.style.display = 'block';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  var basketLi = btn.closest('li');
  if (basketLi) { basketLi.style.display = 'flex'; basketLi.style.alignItems = 'center'; }
  // Add click handler if not already set
  if (!btn.getAttribute('onclick')) {
    btn.setAttribute('onclick', 'openSoknaderPanel()');
    btn.style.cursor = 'pointer';
  }
  // Add badge if missing
  if (!btn.querySelector('#topbar-basket-count')) {
    btn.style.position = 'relative';
    var badge = document.createElement('span');
    badge.id = 'topbar-basket-count';
    badge.style.cssText = 'display:none;position:absolute;top:2px;right:2px;background:#AF0018;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:600;line-height:16px;text-align:center;box-sizing:border-box;';
    btn.appendChild(badge);
  }
}

/* ─── Enkeltemne: «Kjøp emnet» ───
   På enkeltemne-sider skal «Kjøp emnet» legge emnet inn under en bachelorgrad.
   Hvis emnet inngår i en bachelorgrad som allerede ligger i søknaden, legges det
   rett dit. Ellers spør vi hvilken grad emnet skal inngå i (fra «Dette emnet
   inngår i»-listen nederst på siden). */

function normalizeProgName(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/* Identiteten til et studieprogram = stien i lenken (uten domene og
   etterfølgende skråstrek). Brukes til å slå sammen dubletter i
   «Dette emnet inngår i»-listen. */
function programKeyFromHref(href) {
  return (href || '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function slugifyProgram(s) {
  return 'emne-prog-' + (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Emne-data fra React-props (subject-objektet bak «Kjøp emnet») */
function extractEmneSubject() {
  var props = window.__reactProps || {};
  var keys = Object.keys(props);
  for (var i = 0; i < keys.length; i++) {
    var v = props[keys[i]];
    if (v && v.subject && v.subject.code) return v.subject;
  }
  return null;
}

function buildEmneObj(subject) {
  return {
    code: subject.code,
    name: subject.name || '',
    pts: subject.credits || 0,
    price: (subject.price && subject.price.amount) || 0,
    url: absEmneUrl(location.pathname)
  };
}

/* Emne-URL-er settes p\u00e5 sider med ulik dybde (/studier/..., /enkeltemner/...)
   men leses igjen fra s\u00f8knadsskjemaet, s\u00e5 de lagres absolutte. */
function absEmneUrl(url) {
  if (!url) return '';
  try { return new URL(url, location.href).pathname; } catch (e) { return url; }
}

/* Programmene emnet inngår i («Dette emnet inngår i»-listen).
   Kun bachelorprogrammer tas med (lenker med /bachelor/ i URL-en) –
   årsstudier og enkeltemner utelates. */
function getEmneIncludedPrograms(root) {
  var strongs = (root || document).querySelectorAll('strong, h2, h3');
  for (var i = 0; i < strongs.length; i++) {
    if (/Dette emnet inngår i/i.test(strongs[i].textContent || '')) {
      var parent = strongs[i].parentElement;
      var links = parent ? parent.querySelectorAll('ul a') : [];
      var seen = {};
      var out = [];
      for (var j = 0; j < links.length; j++) {
        var href = links[j].getAttribute('href') || '';
        if (href.indexOf('/bachelor/') === -1) continue;
        var txt = (links[j].textContent || '').trim();
        /* Dedupliser på programmet lenken peker til, ikke på lenketeksten:
           kristiania.no lister samme bachelorgrad under flere navn (f.eks.
           «HR, ledelse og organisasjon» og «HR og personalledelse» peker
           begge på /bachelor/hr-ledelse-og-organisasjon/). Første navn vinner. */
        var key = programKeyFromHref(href);
        if (txt && !seen[key]) { seen[key] = 1; out.push({ name: txt, href: href }); }
      }
      return out;
    }
  }
  return [];
}

/* Åpne riktig program-kort, scroll til den nye emne-raden og fremhev den */
function revealEmne(programId, code) {
  revealEmner(programId, [code]);
}

/* Markerer alle emnene som nettopp ble lagt til – ikke bare det siste. Listen
   åpnes én gang, og vi ruller til den første raden. */
function revealEmner(programId, codes) {
  setTimeout(function() {
    var card = document.querySelector('#hk-body .hk-card[data-prog-id="' + programId + '"]');
    if (!card) return;
    var list = card.querySelector('.hk-emner-list');
    var chev = card.querySelector('.hk-chevron');
    if (list && !list.classList.contains('open')) {
      list.classList.add('open');
      if (chev) chev.innerHTML = CHEVRON_UP;
    }

    var rader = (codes || []).map(function(c) {
      return card.querySelector('.hk-emne-row[data-code="' + c + '"]');
    }).filter(Boolean);
    if (!rader.length) return;

    rader[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    rader.forEach(function(row) {
      // Restart animasjonen om raden allerede har klassen
      row.classList.remove('hk-emne-added');
      void row.offsetWidth;
      row.classList.add('hk-emne-added');
    });
    setTimeout(function() {
      rader.forEach(function(row) { row.classList.remove('hk-emne-added'); });
    }, 2100);
  }, 120);
}

/* Legg emnet til et eksisterende program i kurven */
function addEmneToProgram(programId, emne) {
  var b = getBasket();
  var prog = b.programs.find(function(p) { return p.id === programId; });
  if (!prog) return;
  if (!prog.emner) prog.emner = [];
  if (!prog.emner.find(function(e) { return e.code === emne.code; })) {
    prog.emner.push(emne);
  }
  if (prog.type !== 'nett') prog.type = 'nett';
  saveBasket(b);
}

/* Kjente nett-bachelorprogrammer med egen studieplanlegger – bruk samme id
   slik at emnet havner på samme kort som studieplanleggeren bruker. */
var KNOWN_PROGRAM_IDS = {
  'administrasjon og ledelse': 'adm-ledelse-nett',
  'anvendt psykologi': 'anvendt-psykologi-nett'
};

/* Opprett (eller finn) et program ut fra navn og legg emnet der */
function chooseEmneProgram(emne, programName, programId, opts) {
  opts = opts || {};
  var b = getBasket();
  var norm = normalizeProgName(programName);
  if (!programId && KNOWN_PROGRAM_IDS[norm]) programId = KNOWN_PROGRAM_IDS[norm];
  var prog = b.programs.find(function(p) {
    return (programId && p.id === programId) || normalizeProgName(p.name) === norm;
  });
  if (!prog) {
    prog = { id: programId || slugifyProgram(programName), name: programName,
             level: 'Bachelor', points: '', type: 'nett', emner: [] };
    b.programs.push(prog);
  }
  /* Studieform hører til studieprogrammet, ikke til emnet. */
  if (opts.studieform) prog.studieform = opts.studieform;
  if (opts.code) prog.programCode = opts.code;
  if (!prog.emner) prog.emner = [];
  if (!prog.emner.find(function(e) { return e.code === emne.code; })) {
    prog.emner.push(emne);
  }
  if (prog.type !== 'nett') prog.type = 'nett';
  saveBasket(b);
  openSoknaderPanel();
  revealEmne(prog.id, emne.code);
  refreshSoknadsskjemaOmTilstede();
}

/* Studieform pr. studieprogram og programkoden vi viser i s\u00f8knaden. N\u00f8kkelen
   er program-stien, samme n\u00f8kkel som programKeyFromHref() gir. Heltid ligger
   f\u00f8rst. */
var STUDIEFORM = {
  heltid: { label: 'Heltid', note: '30 studiepoeng hvert semester. Estimert 7,5 timer hver dag, 5 dager i uka.' },
  deltid: { label: 'Deltid', note: '15 studiepoeng hvert semester. Estimert 3\u20134 timer hver dag, 5 dager i uka.' }
};

/* Heltid og deltid er to ulike studiekoder p\u00e5 samme program \u2013 koden f\u00f8lger
   studenten videre i s\u00f8knaden om studiest\u00f8tte hos L\u00e5nekassen. Kodene under er
   hentet fra studietilbudsdataene (STUDIETILBUD_ITEMS.codes: heltid f\u00f8rst). */
var PROGRAM_CODES = {
  '/studier/nettstudier/bachelor/administrasjon-og-ledelse': { heltid: 'BAL', deltid: 'NAL' },
  '/studier/nettstudier/bachelor/hr-ledelse-og-organisasjon': { heltid: 'BOH', deltid: 'NOH' },
  '/studier/nettstudier/bachelor/markedsforing': { heltid: 'BA-MF', deltid: 'NBA-MF' },
  '/studier/nettstudier/bachelor/bachelor-i--pedagogikk': { heltid: 'BA-PED', deltid: 'NBA-PED' },
  '/studier/nettstudier/bachelor/bachelor-i-anvendt-psykologi': { heltid: 'BA-BBP', deltid: 'NBA-NBP' },
  '/studier/nettstudier/bachelor/okonomi-og-administrasjon-profilering-regnskapsforer': { heltid: 'BOA', deltid: 'NOA' },
  '/studier/nettstudier/bachelor/spesialpedagogikk': { heltid: 'BLK', deltid: 'NLK' },
  '/studier/nettstudier/bachelor/bachelor-i-rettsvitenskap': { heltid: 'BA-RVT', deltid: 'NBA-RVT' }
};

/* Frittst\u00e5ende enkeltemner har bare en deltidskode i dag (EMN-N, \u00abEnkeltemner
   fleksibel start og slutt\u00bb). Heltidskoden er oppdiktet for prototypen, siden
   gjennomf\u00f8ring skal velges ogs\u00e5 for frittst\u00e5ende emner. */
var LOOSE_CODES = { heltid: 'EMN-H', deltid: 'EMN-N' };

/* Fallback n\u00e5r programmet ikke st\u00e5r i tabellen \u2013 prototypen skal aldri vise
   et valg uten kode. */
function fallbackCodes(name) {
  var initialer = String(name || 'PROG').replace(/[^A-Za-z\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5 ]/g, '')
    .split(/\s+/).filter(Boolean).slice(0, 3)
    .map(function(w) { return w.charAt(0).toUpperCase(); }).join('');
  return { heltid: 'B' + initialer, deltid: 'N' + initialer };
}

function getProgramCodes(p) {
  if (!p) return LOOSE_CODES;
  var fraTabell = p.href ? PROGRAM_CODES[programKeyFromHref(p.href)] : kodetabellFraNavn(p.name);
  return fraTabell || fallbackCodes(p.name);
}

/* Program som kommer fra s\u00f8knaden i stedet for en emneside har ingen lenke.
   Da sl\u00e5r vi opp p\u00e5 navnet, men bare n\u00e5r \u00e9n sti matcher \u2013 en oppdiktet kode er
   bedre enn feil kode. */
function kodetabellFraNavn(name) {
  var slug = String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) return null;
  var treff = Object.keys(PROGRAM_CODES).filter(function(k) { return k.indexOf(slug) > -1; });
  return treff.length === 1 ? PROGRAM_CODES[treff[0]] : null;
}

/* Sidebar-valg: hvilken grad skal emnet inn i? */
var _emneChoiceState = null;

function showEmneProgramChoice(emne, programs, opts) {
  opts = opts || {};
  _emneChoiceState = { emne: emne, programs: programs, opts: opts,
                       skipGjennomforing: !!opts.skipGjennomforing,
                       /* 'heltid' | 'deltid' n\u00e5r kalleren alt vet gjennomf\u00f8ringen \u2013
                          da er det steget hoppet over her. */
                       gjennomforing: opts.gjennomforing || null,
                       onPick: opts.onPick || null,
                       onCommit: opts.onCommit || null };
  injectSidebarPanel();
  openSoknaderPanel();
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  refreshSokPanelFooter(true);
  if (title) title.textContent = opts.title
    || (programs.length ? 'Velg studieprogram' : 'Legg til emne');

  /* Ett valg gjelder hele bestillingen, så kortene viser summen av det som
     legges til – ikke bare det første emnet. */
  var bestilling = opts.emner && opts.emner.length ? opts.emner : (emne ? [emne] : []);
  var leggerTilPts = bestilling.reduce(function(sum, e) {
    return sum + (parseFloat(e && e.pts) || 0);
  }, 0);

  var started = getStartedPrograms();
  function startetProgram(p) {
    var treff = null;
    started.forEach(function(sp) {
      if ((p.href && programKeyFromHref(p.href) === programKeyFromHref(sp.href))
          || normalizeProgName(p.name) === normalizeProgName(sp.name)) treff = sp;
    });
    return treff;
  }

  /* Indeksen mot st.programs må følge kortet, siden listen sorteres om. */
  var indeksert = programs.map(function(p, idx) { return { p: p, idx: idx }; });
  var paagaaende = indeksert.filter(function(x) { return !!startetProgram(x.p); });
  var nye = indeksert.filter(function(x) { return !startetProgram(x.p); });

  function kort(x) {
    return hkProgramCard(x.p, startetProgram(x.p), leggerTilPts,
                         'openEmneProgramDetail(' + x.idx + ')');
  }

  var html = '<div style="padding:8px 0;">' + (opts.onCommit ? hkEmneContextCard(emne) : '');

  if (programs.length === 0) {
    html += hkChoiceLine('Dette emnet inngår ikke i noen av bachelorgradene på nett.', false)
          + hkChoiceLine('Du kan ta det som et frittstående enkeltemne.', true);
  } else {
    /* Skillet mellom «fortsett der du er» og «start på nytt» gir bare mening
       når vi vet hva som er påbegynt – utlogget er listen flat, og foten
       tilbyr innlogging i stedet. */
    if (paagaaende.length) {
      html += hkProgramHeading('Fortsett', false);
      paagaaende.forEach(function(x) { html += kort(x); });
    }
    if (nye.length) {
      html += hkProgramHeading('Start på et nytt program', paagaaende.length > 0);
      nye.forEach(function(x) { html += kort(x); });
    }
  }

  /* Frittstående er alltid et alternativ – også når emnet inngår i grader.
     Da står det nederst, etter programmene, med «Eller» som skille. */
  if (programs.length) html += hkOrDivider();
  html += '<button class="hk-prog-card" onclick="openLooseGjennomforing()">'
    + '<span class="hk-prog-name">Som et frittstående enkeltemne</span>'
    + '<span class="hk-prog-sub">Ta faget uten å starte på et helt studieprogram</span>'
    + '</button>';

  html += '</div>';
  body.innerHTML = html;
}

function hkProgramHeading(tekst, harSeksjonOver) {
  return '<p class="hk-prog-heading' + (harSeksjonOver ? ' hk-prog-heading-next' : '') + '">'
    + tekst + '</p>';
}

/* Bachelorgradene i «Dette emnet inngår i» er alle 180 studiepoeng. Har vi
   studiekatalogen for hånden, brukes tallene derfra i stedet. */
function hkProgramFakta(p) {
  var fra = null;
  if (typeof window !== 'undefined' && window.STUDIETILBUD_ITEMS && p.href) {
    var key = programKeyFromHref(p.href);
    window.STUDIETILBUD_ITEMS.forEach(function(it) {
      if (!fra && it.linkUrl && programKeyFromHref(it.linkUrl) === key) fra = it;
    });
  }
  var poeng = fra && fra.points ? parseFloat(String(fra.points).replace(',', '.')) : NaN;
  return {
    level: (fra && fra.levelLabel) || 'Bachelor',
    total: isNaN(poeng) ? 180 : poeng
  };
}

/* Ett programkort: nivå og hva bestillingen legger til øverst, navnet i midten,
   og hvor langt studenten er kommet nederst. */
function hkProgramCard(p, startet, leggerTilPts, onclick) {
  var fakta = hkProgramFakta(p);
  var level = (startet && startet.level) || fakta.level;
  var total = (startet && startet.totalCredits) || fakta.total;
  var tatt = (startet && startet.completedCredits) || 0;

  var meta = level;
  if (leggerTilPts > 0) meta += ' • ' + hkPts(leggerTilPts) + ' studiepoeng';

  return '<button class="hk-prog-card" onclick="' + onclick + '">'
    + '<span class="hk-prog-top">'
    + '<span class="hk-prog-meta">' + meta + '</span>'
    + (startet ? HK_BADGE_PAAGAAR : '')
    + '</span>'
    + '<span class="hk-prog-name">' + p.name + '</span>'
    + '<span class="hk-prog-progress">' + hkPts(tatt) + ' / ' + hkPts(total) + ' studiepoeng</span>'
    + '</button>';
}

/* 7.5 → «7,5», 30 → «30» */
function hkPts(n) {
  var v = parseFloat(n) || 0;
  return (v % 1 === 0 ? String(v) : v.toFixed(1)).replace('.', ',');
}

/* \u00abStudie p\u00e5g\u00e5r\u00bb \u2013 markerer programmet studenten allerede holder p\u00e5 med */
var HK_BADGE_PAAGAAR = '<span style="flex-shrink:0;display:inline-flex;align-items:center;'
  + 'background:#0A4FB8;color:#fff;border-radius:999px;padding:7px 16px;'
  + 'font-size:14px;font-weight:600;line-height:1.2;white-space:nowrap;">Studie p\u00e5g\u00e5r</span>';

/* ─── Byggeklosser for valgpanelet ─── */

function hkChoiceLine(text, last) {
  return '<p style="font-size:18px;font-weight:500;margin:0 0 ' + (last ? '24px' : '8px')
    + ';color:#1A1A1A;line-height:1.4;">' + text + '</p>';
}

/* Hvilket emne handler dette om – står øverst så konteksten ikke forsvinner
   n\u00e5r man g\u00e5r ett niv\u00e5 ned i programvalget. */
function hkEmneContextCard(emne) {
  if (!emne) return '';
  var pts = emne.pts ? ' \u00b7 ' + String(emne.pts).replace('.', ',') + ' stp.' : '';
  return '<div style="background:#FCF8F5;border-radius:8px;padding:12px 16px;margin:0 0 20px;">'
    + '<div style="font-size:12.5px;font-weight:500;letter-spacing:.08em;color:#5C5C5C;">Emne</div>'
    + '<div style="font-size:16px;font-weight:600;color:#1A1A1A;margin-top:2px;">'
    + emne.name + (emne.code ? ' (' + emne.code + ')' : '') + pts + '</div></div>';
}

var HK_CHOICE_STYLE = 'display:flex;align-items:center;gap:12px;width:100%;text-align:left;'
  + 'padding:18px 20px;margin-bottom:12px;border:1px solid #D4D4D4;border-radius:8px;background:#fff;'
  + 'cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s;';

function hkOrDivider() {
  return '<div style="display:flex;align-items:center;gap:14px;margin:20px 0;">'
    + '<span style="flex:1;height:1px;background:#D4D4D4;"></span>'
    + '<span style="font-size:12.5px;font-weight:500;letter-spacing:.08em;color:#5C5C5C;">Eller</span>'
    + '<span style="flex:1;height:1px;background:#D4D4D4;"></span>'
    + '</div>';
}

function hkChoiceButton(onclick, name, sub, startedNote, badgeHtml) {
  return '<button class="hk-prog-choice" onclick="' + onclick + '" style="' + HK_CHOICE_STYLE + '"'
    + ' onmouseover="this.style.borderColor=\'#46000A\';this.style.background=\'#FCF8F5\'"'
    + ' onmouseout="this.style.borderColor=\'#D4D4D4\';this.style.background=\'#fff\'">'
    + '<span style="flex:1;min-width:0;">'
    + '<span style="display:block;font-size:18px;font-weight:500;color:#1A1A1A;line-height:1.3;">' + name + '</span>'
    + (sub ? '<span style="display:block;font-size:15px;font-weight:400;color:#1A1A1A;margin-top:4px;line-height:1.4;">' + sub + '</span>' : '')
    + (startedNote ? '<span style="display:block;font-size:15px;font-weight:400;color:#46000A;margin-top:4px;line-height:1.4;">' + startedNote + '</span>' : '')
    + '</span>'
    + (badgeHtml || '')
    + '</button>';
}

/* ─── Utvidbar infoboks i valgpanelet ─── */
function hkInfoAccordion(id, question, bodyHtml) {
  return '<div style="background:#FCF8F5;border:1px solid #F9CCD2;border-radius:8px;margin:0 0 20px;overflow:hidden;">'
    + '<button type="button" id="' + id + '-btn" aria-expanded="false" onclick="hkToggleInfo(\'' + id + '\')"'
    + ' style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;'
    + 'background:none;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:500;color:#1A1A1A;">'
    + '<span style="flex:1;min-width:0;line-height:1.35;">' + question + '</span>'
    + '<span id="' + id + '-chev" style="flex-shrink:0;display:flex;color:#46000A;">' + CHEVRON_DOWN + '</span>'
    + '</button>'
    + '<div id="' + id + '-body" style="display:none;padding:0 16px 16px;font-size:15px;color:#1A1A1A;line-height:1.55;">'
    + bodyHtml + '</div></div>';
}

function hkToggleInfo(id) {
  var body = document.getElementById(id + '-body');
  var btn = document.getElementById(id + '-btn');
  var chev = document.getElementById(id + '-chev');
  if (!body) return;
  var open = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (chev) chev.innerHTML = open ? CHEVRON_UP : CHEVRON_DOWN;
}

var INFO_GJENNOMFORING = '<p style="margin:0 0 10px;">Hvis du studerer p\u00e5 fulltid, tar du 30 studiepoeng '
  + 'eller mer i semesteret. Studerer du p\u00e5 deltid, tar du mindre, ofte halvparten.</p>'
  + '<p style="margin:0 0 12px;">Graden du ender opp med, vil v\u00e6re den samme \u2013 den tar bare lengre tid '
  + '\u00e5 fullf\u00f8re. Du f\u00e5r ogs\u00e5 st\u00f8tte fra L\u00e5nekassen som deltidsstudent, men ikke s\u00e5 mye som om '
  + 'du hadde studert p\u00e5 heltid.</p>'
  + '<a href="https://www.kristiania.no/nettstudier/" style="font-size:15px;font-weight:500;color:#46000A;">'
  + 'Les mer om gjennomf\u00f8ring</a>';

/* ─── Programvalg fra studieplanleggeren ─── */
/* Programlisten står bare på emnets egen side, ikke på programsiden. Hver rad i
   planleggeren har lenken dit (data-url), så derfra henter vi den. */
var _emneProgramCache = {};

function hentEmneProgrammer(url, cb) {
  if (!url) { cb([]); return; }
  if (_emneProgramCache[url]) { cb(_emneProgramCache[url]); return; }
  fetch(url).then(function(r) { return r.text(); }).then(function(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var progs = getEmneIncludedPrograms(doc);
    _emneProgramCache[url] = progs;
    cb(progs);
  }).catch(function() { cb([]); });
}

/* Samme id-utledning som chooseEmneProgram, slik at et emne lagt til fra
   planleggeren havner på samme programkort som ellers i søknaden. */
function programIdFor(p) {
  var norm = normalizeProgName(p.name);
  return KNOWN_PROGRAM_IDS[norm] || slugifyProgram(p.name);
}

/* Ett valg gjelder hele bestillingen, så listen er programmene *alle* emnene
   inngår i – pluss programmet siden handler om, som de tilhører av natur og
   derfor alltid skal være et valg. Gjennomføringen spørres det om her også:
   den står ingen steder på programsiden, og søknaden må vise om studenten
   studerer heltid eller deltid. */
function velgProgramForPlanlegger(emner, sidensProgram, onValgt, gjennomforing) {
  if (!emner.length) return;
  var lister = [];
  var igjen = emner.length;

  emner.forEach(function(e, i) {
    hentEmneProgrammer(e.url, function(progs) {
      lister[i] = progs;
      if (--igjen === 0) visValget();
    });
  });

  function visValget() {
    var felles = lister.reduce(function(acc, liste) {
      if (acc === null) return (liste || []).slice();
      return acc.filter(function(p) {
        return (liste || []).some(function(q) {
          return programKeyFromHref(q.href) === programKeyFromHref(p.href);
        });
      });
    }, null) || [];

    var sidensKey = programKeyFromHref(sidensProgram.href);
    if (!felles.some(function(p) { return programKeyFromHref(p.href) === sidensKey; })) {
      felles.unshift({ name: sidensProgram.name, href: sidensProgram.href });
    }

    showEmneProgramChoice(emner[0], felles, { onPick: onValgt, emner: emner,
                                              gjennomforing: gjennomforing || null });
  }
}

/* ─── Niv\u00e5 2: gjennomf\u00f8ring ─── */
var _emneProgramView = null;

function openEmneProgramDetail(idx) {
  var st = _emneChoiceState;
  if (!st || !st.programs[idx]) return;
  var p = st.programs[idx];
  if (st.skipGjennomforing && st.onPick) { st.onPick(p); return; }
  if (hkGjennomforingAlleredeValgt(p, getProgramCodes(p))) return;
  _emneProgramView = { idx: idx, program: p, codes: getProgramCodes(p) };
  renderGjennomforingStep();
}

/* Frittst\u00e5ende enkeltemne er ogs\u00e5 en gjennomf\u00f8ring \u2013 heltid og deltid har egne
   studiekoder der ogs\u00e5, s\u00e5 valget kan ikke hoppes over. */
function openLooseGjennomforing() {
  if (!_emneChoiceState) return;
  if (hkGjennomforingAlleredeValgt(null, LOOSE_CODES)) return;
  _emneProgramView = { idx: null, program: null, codes: LOOSE_CODES };
  renderGjennomforingStep();
}

/* Kommer valget fra studieplanleggeren, er heltid/deltid allerede bestemt av
   fanen studenten st\u00e5r i. Da skal ikke panelet sp\u00f8rre om det en gang til \u2013
   det gir bare et steg der svaret er gitt p\u00e5 forh\u00e5nd. */
function hkGjennomforingAlleredeValgt(program, codes) {
  var st = _emneChoiceState;
  if (!st || !st.gjennomforing || !st.onPick) return false;
  var form = STUDIEFORM[st.gjennomforing] ? st.gjennomforing : 'deltid';
  _emneProgramView = null;
  st.onPick(program, { studieform: STUDIEFORM[form].label, code: codes[form] });
  return true;
}

/* Gjennomf\u00f8ring er et eget steg \u2013 heltid og deltid som likestilte valg,
   med forklaringen tilgjengelig uten \u00e5 forlate panelet. */
function renderGjennomforingStep() {
  var v = _emneProgramView;
  if (!v) return;
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  refreshSokPanelFooter(true);
  if (title) title.textContent = 'Velg gjennomf\u00f8ring';

  var harProgram = !!v.program;
  var hva = harProgram ? v.program.name : 'et frittst\u00e5ende enkeltemne';
  var tilbake = (_emneChoiceState && _emneChoiceState.programs.length)
    ? 'Tilbake til programmene' : 'Tilbake';

  var html = '<div style="padding:8px 0;">'
    + hkChoiceLine('Hvordan vil du gjennomf\u00f8re ' + hva + '?', true)
    + hkInfoAccordion('hk-info-gjf', 'Hva er forskjellen p\u00e5 \u00e5 ta et emne p\u00e5 heltid/deltid?', INFO_GJENNOMFORING)
    + hkChoiceButton("hkPickStudieform('heltid')", hkFormLabel('heltid', v.codes), null, null)
    + hkChoiceButton("hkPickStudieform('deltid')", hkFormLabel('deltid', v.codes), null, null)
    + hkBackLink('backToEmneProgramList()', tilbake)
    + '</div>';
  body.innerHTML = html;
}

/* Koden st\u00e5r sammen med gjennomf\u00f8ringen, s\u00e5 studenten ser hva de faktisk s\u00f8ker p\u00e5 */
function hkFormLabel(form, codes) {
  return STUDIEFORM[form].label
    + ' <span style="font-weight:400;color:#5c5c5c;">[' + codes[form] + ']</span>';
}

function hkBackLink(onclick, text) {
  return '<button onclick="' + onclick + '" style="background:none;border:none;padding:0;margin:20px 0 0;'
    + 'cursor:pointer;font-family:inherit;font-size:15px;font-weight:500;color:#46000A;">\u2190 ' + text + '</button>';
}

/* Studieform er siste valg \u2013 emnet legges til her, med studiekoden for
   gjennomf\u00f8ringen som ble valgt. */
function hkPickStudieform(form) {
  var v = _emneProgramView, st = _emneChoiceState;
  if (!v || !st) return;
  var valg = { studieform: STUDIEFORM[form].label, code: v.codes[form] };
  _emneProgramView = null;
  /* Fra studieplanleggeren eier kalleren bestillingen \u2013 den legger emnene i
     kurven selv, og trenger b\u00e5de programmet (null = frittst\u00e5ende) og valget. */
  if (st.onPick) { st.onPick(v.program, valg); return; }
  /* Ellers tas studiestart her, som siste steg \u2013 samme valg som fra en
     studieprogramside. */
  hkVelgStudiestart(st.emne, function() { hkFullforEmnevalg(v, st, valg); });
}

function hkFullforEmnevalg(v, st, valg) {
  if (st.onCommit) st.onCommit();
  if (!v.program) { pickEmneAsLoose(valg.studieform, valg.code); return; }
  chooseEmneProgram(st.emne, v.program.name, v.program.id || null, valg);
}

/* Studiestart-steget i panelet. Emner som allerede har en dato \u2013 for eksempel
   n\u00e5r studenten bare bytter studieprogram \u2013 beholder sin og spørres ikke igjen. */
function hkVelgStudiestart(emne, ferdig) {
  var body = document.getElementById('hk-body');
  if (!body || !emne || emne.startDate || typeof renderStudiestartStep !== 'function') {
    ferdig();
    return;
  }
  refreshSokPanelFooter(true);
  renderStudiestartStep(body, null, {
    skipStudiestotte: true,
    onTitle: function(tekst) {
      var el = document.getElementById('hk-title');
      if (el) el.textContent = tekst;
    },
    onConfirm: function(datoStr) {
      if (datoStr) emne.startDate = datoStr;
      ferdig();
    },
    onNotify: function(epost) { hkVisVarselKvittering(epost); }
  });
}

/* Studenten ba om varsel i stedet for \u00e5 bestille n\u00e5 \u2013 emnet legges ikke til. */
function hkVisVarselKvittering(epost) {
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  if (title) title.textContent = 'Vi gir deg beskjed';
  refreshSokPanelFooter(true);
  var mottaker = epost
    ? '\u00ab' + String(epost).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\u00bb'
    : 'e-postadressen din';
  body.innerHTML = '<div style="padding:8px 0;">'
    + '<div style="background:#FCF8F5;border-radius:8px;padding:18px 20px;">'
    + '<p style="font-size:15px;font-weight:600;color:#46000A;margin:0;">Vi sender deg en e-post n\u00e5r du kan bestille</p>'
    + '<p style="font-size:13.5px;color:#5C5C5C;margin:10px 0 0;line-height:1.55;">'
    + 'Vi varsler ' + mottaker + ' s\u00e5 snart bestillingen \u00e5pner for neste semester. '
    + 'Emnet er ikke lagt til i s\u00f8knaden.</p>'
    + '</div>'
    + '<button onclick="closeSoknaderPanel()" style="background:none;border:none;padding:0;margin:20px 0 0;'
    + 'cursor:pointer;font-family:inherit;font-size:15px;font-weight:500;color:#46000A;">\u2190 Tilbake</button>'
    + '</div>';
}

function backToEmneProgramList() {
  var st = _emneChoiceState;
  _emneProgramView = null;
  if (st) showEmneProgramChoice(st.emne, st.programs, st.opts);
}

/* \u00abEndre studieprogram\u00bb fra s\u00f8knaden: samme valgpanel som ellers, men emnet
   skal flyttes \u2013 derfor rydder «fjern» det bort fra der det l\u00e5 f\u00f8rst n\u00e5r
   studenten har valgt ferdig. */
function startEndreStudieprogram(emne, fjern) {
  emneProgramKandidater(emne, function(programs) {
    showEmneProgramChoice(emne, programs, { onCommit: fjern, title: 'Endre studieprogram' });
  });
}

/* Kandidatene er gradene emnet inng\u00e5r i (hentet fra emnesiden) pluss
   nett-programmene som allerede ligger i s\u00f8knaden. Eldre kurv-rader mangler
   emne-URL, s\u00e5 listen m\u00e5 t\u00e5le \u00e5 st\u00e5 uten den. */
function emneProgramKandidater(emne, cb) {
  hentEmneProgrammer(emne && emne.url, function(fraEmnet) {
    var ut = (fraEmnet || []).slice();
    var sett = {};
    ut.forEach(function(p) { sett[normalizeProgName(p.name)] = 1; });
    (getBasket().programs || []).forEach(function(p) {
      if (p.type !== 'nett') return;
      var n = normalizeProgName(p.name);
      if (sett[n]) return;
      sett[n] = 1;
      ut.push({ name: p.name, href: null, id: p.id });
    });
    cb(ut);
  });
}


/* Emnet er allerede bestått – vis beskjed i sidepanelet i stedet for å legge
   det til. Samme ordlyd som konflikt-varselet i søknadsskjemaet. */
function showEmneAlreadyCompleted(emne, program) {
  injectSidebarPanel();
  openSoknaderPanel();
  var body = document.getElementById('hk-body');
  var title = document.getElementById('hk-title');
  if (!body) return;
  refreshSokPanelFooter();
  if (title) title.textContent = 'Allerede bestått';

  var iProgram = program
    ? ' i <strong>' + program.name + '</strong>'
    : '';

  body.innerHTML = '<div style="padding:8px 0;">'
    + '<div style="background:#FCF8F5;border-radius:8px;padding:18px 20px;">'
    + '<div style="display:flex;align-items:flex-start;gap:10px;">'
    + '<span style="color:#46000A;font-size:15px;font-weight:600;flex-shrink:0;margin-top:2px;">&#10003;</span>'
    + '<p style="font-size:15px;font-weight:600;color:#46000A;margin:0;">Du har allerede bestått ' + emne.name + '</p>'
    + '</div>'
    + '<p style="font-size:13.5px;color:#5C5C5C;margin:10px 0 0;line-height:1.55;padding-left:25px;">'
    + 'Emnet ble tatt' + iProgram + ' og kan ikke tas om igjen, så vi har ikke lagt det til. '
    + 'Stemmer ikke dette, ta kontakt på <a href="mailto:opptaknettstudier@kristiania.no" style="color:#0A4FB8;">opptaknettstudier@kristiania.no</a> eller 21 09 30 00.'
    + '</p>'
    + '</div></div>';
}


/* ─── Logg inn som steg i panelet ───
   Svaret styrer bare innloggingsmåten – FEIDE for dem som har studert her før,
   telefon for de andre. Selve søknaden er upåvirket. */
var HK_LOGIN_VALG = [
  { verdi: 'nei',     tittel: 'Nei, dette er første gang',         sub: 'Du bekrefter deg med telefonnummer' },
  { verdi: 'ja',      tittel: 'Ja, jeg er eller har vært student', sub: 'Du logger inn med FEIDE-brukeren din' },
  { verdi: 'usikker', tittel: 'Jeg er usikker',                    sub: 'Vi sjekker det for deg med telefonnummeret' }
];
var _hkLoginValg = null;

function hkVisLoggInn() {
  var body = document.getElementById('hk-body');
  if (!body) return;
  _hkLoginValg = null;
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(true);

  var title = document.getElementById('hk-title');
  if (title) title.textContent = 'Logg inn';

  var pil = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  body.innerHTML = '<div class="hk-step">'
    + '<button class="hk-step-back" onclick="hkLoggInnTilbake()">' + pil + 'Tilbake</button>'
    + '<div>'
    + '<div class="hk-step-question">Har du studert ved Kristiania f\u00f8r?</div>'
    + '<p class="hk-step-sub">Svaret avgj\u00f8r bare hvordan du logger inn. Det p\u00e5virker ikke s\u00f8knaden.</p>'
    + '</div>'
    + '<div class="hk-step-cards">'
    + HK_LOGIN_VALG.map(function(v) {
        return '<div class="hk-step-card" onclick="hkVelgLoggInn(this,\'' + v.verdi + '\')">'
          + '<div class="hk-step-dot"></div>'
          + '<div><div class="hk-step-title">' + v.tittel + '</div>'
          + '<p class="hk-step-desc">' + v.sub + '</p></div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<p class="hk-step-feil" id="hk-login-feil" hidden></p>'
    + '<button class="hk-btn-primary" onclick="hkLoggInnBekreft()">G\u00e5 videre</button>'
    + '</div>';
}

function hkVelgLoggInn(kort, verdi) {
  _hkLoginValg = verdi;
  kort.parentNode.querySelectorAll('.hk-step-card').forEach(function(c) { c.classList.remove('selected'); });
  kort.classList.add('selected');
  var feil = document.getElementById('hk-login-feil');
  if (feil) feil.hidden = true;
}

function hkLoggInnTilbake() {
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(false);
  renderBasketPanel();
}

function hkLoggInnBekreft() {
  var feil = document.getElementById('hk-login-feil');
  if (!_hkLoginValg) {
    if (feil) { feil.textContent = 'Velg et alternativ for å gå videre.'; feil.hidden = false; }
    return;
  }
  /* Samme forgrening som i søknadsskjemaet: FEIDE for tidligere studenter,
     telefon + bekreftelseskode for de andre. */
  if (_hkLoginValg === 'ja') hkVisFeide();
  else hkVisTelefon();
}

/* ── Skall rundt hvert steg, så tittel og tilbake-knapp behandles ett sted ── */
var HK_PIL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function hkStegSkall(tittel, tilbakeFn, innhold) {
  var body = document.getElementById('hk-body');
  if (!body) return;
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(true);
  var t = document.getElementById('hk-title');
  if (t) t.textContent = tittel;
  body.innerHTML = '<div class="hk-step">'
    + '<button class="hk-step-back" onclick="' + tilbakeFn + '">' + HK_PIL + 'Tilbake</button>'
    + innhold
    + '</div>';
}

/* ── Logg inn med Feide ── */
function hkVisFeide() {
  var msIkon = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0"><rect width="9.5" height="9.5" fill="#F25022"/><rect x="10.5" width="9.5" height="9.5" fill="#7FBA00"/><rect y="10.5" width="9.5" height="9.5" fill="#00A4EF"/><rect x="10.5" y="10.5" width="9.5" height="9.5" fill="#FFB900"/></svg>';
  var idIkon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><rect x="2" y="2" width="20" height="20" rx="3" stroke="#1A1A1A" stroke-width="1.5"/><path d="M7 8h10M7 12h10M7 16h6" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round"/></svg>';

  hkStegSkall('Logg inn med Feide', 'hkVisLoggInn()',
    '<div>'
    + '<div class="hk-step-question">Logg inn med Feide</div>'
    + '<p class="hk-step-sub">Du må logge deg på via Feide for å få tilgang til Dataporten.</p>'
    + '</div>'
    + '<div>'
    + '<p class="hk-step-sub" style="margin-bottom:8px">Din tilhørighet</p>'
    + '<div class="hk-feide-row">'
    + '<div style="display:flex;align-items:center;gap:12px"><div class="hk-feide-avatar">K</div>'
    + '<span style="font-size:15px;font-weight:500">Kristiania</span></div>'
    + '</div></div>'
    + '<div class="hk-step-cards">'
    + '<button class="hk-feide-opt" onclick="hkFullforInnlogging(\'feide\')">' + msIkon + 'Bruk arbeids- eller skolekonto</button>'
    + '<button class="hk-feide-opt" onclick="hkFullforInnlogging(\'feide\')">' + idIkon + 'Logg inn med ID-porten</button>'
    + '</div>');
}

/* ── Telefonnummer ── */
var _hkTelefon = '';

function hkVisTelefon() {
  hkStegSkall('Opprett søknad', 'hkVisLoggInn()',
    '<div>'
    + '<div class="hk-step-question">Opprett søknad</div>'
    + '<p class="hk-step-sub">Ny bruker</p>'
    + '</div>'
    + '<div>'
    + '<div class="hk-phone-row"><div class="hk-phone-prefix">+47</div>'
    + '<input type="tel" class="hk-input" id="hk-telefon" inputmode="numeric" autocomplete="tel" placeholder="Telefonnummer"></div>'
    + '<p class="hk-step-feil" id="hk-tlf-feil" hidden></p>'
    + '</div>'
    + '<p class="hk-step-note">Du får en bekreftelseskode på SMS.</p>'
    + '<div class="hk-cb-row" onclick="this.querySelector(\'.hk-cb\').classList.toggle(\'checked\')">'
    + '<span class="hk-cb"><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    + '<span class="hk-cb-label">Jeg samtykker til å bli kontaktet av en studierådgiver og har lest personvernerklæringen.</span>'
    + '</div>'
    + '<button class="hk-btn-primary" onclick="hkVidereFraTelefon()">Gå videre</button>');
}

function hkVidereFraTelefon() {
  var felt = document.getElementById('hk-telefon');
  var feil = document.getElementById('hk-tlf-feil');
  var nr = (felt.value || '').replace(/\s/g, '');
  if (nr.length < 8) {
    felt.classList.add('feil');
    if (feil) { feil.textContent = 'Oppgi et gyldig telefonnummer.'; feil.hidden = false; }
    return;
  }
  felt.classList.remove('feil');
  _hkTelefon = nr;
  hkVisKode();
}

/* ── Bekreftelseskode ── */
function hkVisKode() {
  var felter = '';
  for (var i = 0; i < 4; i++) {
    felter += '<input type="tel" maxlength="1" inputmode="numeric" oninput="hkOtpNeste(this)">';
  }
  var vist = _hkTelefon.replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3');
  hkStegSkall('Fullfør søknaden', 'hkVisTelefon()',
    '<div>'
    + '<div class="hk-step-question">Bekreftelseskode</div>'
    + '<p class="hk-step-sub">Vi har sendt deg en kode på <strong>' + vist + '</strong>.</p>'
    + '</div>'
    + '<div class="hk-otp" id="hk-otp">' + felter + '</div>'
    + '<p class="hk-step-feil" id="hk-kode-feil" hidden></p>'
    + '<button class="hk-btn-primary" onclick="hkBekreftKode()">Bekreft</button>'
    + '<button class="hk-btn-outline" onclick="alert(\'En bekreftelseskode er sendt til din e-post.\')">Send koden på e-post</button>');
}

function hkOtpNeste(felt) {
  if (!felt.value) return;
  var neste = felt.nextElementSibling;
  if (neste) neste.focus();
}

function hkBekreftKode() {
  var siffer = [].slice.call(document.querySelectorAll('#hk-otp input'))
    .map(function(i) { return i.value; }).join('');
  var feil = document.getElementById('hk-kode-feil');
  if (siffer.length < 4) {
    if (feil) { feil.textContent = 'Fyll inn hele koden for å gå videre.'; feil.hidden = false; }
    return;
  }
  hkFullforInnlogging('telefon');
}

function hkFullforInnlogging(metode) {
  setAuthState(metode, 'Lars Juster Eilefsen');
  _hkLoginValg = null;
  _hkTelefon = '';
  if (typeof refreshSokPanelFooter === 'function') refreshSokPanelFooter(false);
  renderBasketPanel();
}

/* Logg inn uten å forlate valget, og bygg panelet på nytt – nå med «Studie
   pågår» på de programmene studenten alt holder på med. */
function hkLoginAndRetryChoice() {
  setAuthState('feide', 'Lars Juster Eilefsen');
  if (typeof handleKjopEmnet === 'function' && extractEmneSubject()) {
    handleKjopEmnet();
  }
}

/* Legg emnet i søknaden uten tilknytning til et studieprogram. Havner under
   «Emner uten tilknytning til studieprogram» i søknadspanelet. */
function pickEmneAsLoose(studieform, studiekode) {
  var st = _emneChoiceState;
  if (!st || !st.emne) return;
  var emne = st.emne;
  if (studieform) emne.studieform = studieform;
  if (studiekode) emne.studiekode = studiekode;
  addLooseEmne(emne);
  openSoknaderPanel();
  renderBasketPanel();
  revealEmne(HK_LOOSE_CARD_ID, emne.code);
  refreshSoknadsskjemaOmTilstede();
}

function handleKjopEmnet() {
  var subject = extractEmneSubject();
  if (!subject) return;
  var emne = buildEmneObj(subject);
  var included = getEmneIncludedPrograms();

  /* Innlogget og emnet er allerede bestått → det kan ikke tas om igjen. */
  if (getAuthState() && isCompletedCourse(emne.code)) {
    var owner = COMPLETED_BY_PROGRAM.filter(function(p) {
      return p.codes.indexOf(String(emne.code)) > -1;
    })[0];
    showEmneAlreadyCompleted(emne, owner);
    return;
  }

  /* Studenten skal uansett velge studieprogram – også når vi vet hvilket de
     har påbegynt, eller når bare ett av dem ligger i søknaden. Det påbegynte
     merkes i listen i stedet for å velges for dem. */
  showEmneProgramChoice(emne, included);
}

function interceptKjopEmnet() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    if (!btn.classList.contains('yEK9biWpMxeKit4W3SEn')) return;
    if ((btn.textContent || '').trim().indexOf('Kjøp emnet') === -1) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleKjopEmnet();
  }, true);
}

/* ─── Init ─── */
function initBasket() {
  injectSidebarPanel();
  enhanceTopbarBasket();
  refreshBasketUI();
  interceptSokNaaButtons();
  interceptKjopEmnet();
  normalizeTopbarOrder();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBasket);
} else {
  initBasket();
}
