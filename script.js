// ═══════════════════════════════════════════════════════════
// Indoor Distance — Hemsida 2.0
// Modern shop, checkout, scroll animations, account dashboard
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://eousynkptffcvxgcapvp.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_hX-GcVSo3-KSp0A5Yjx4wQ_YA9v3jJE';
const TOKEN_KEY     = 'id_web_token';
const TOKEN_REFRESH = 'id_web_refresh';
const SWISH_NUMBER  = '076 396 88 61';
const FREE_SHIPPING_THRESHOLD = 500;

// ═══════════════════════════════════════════════════════════
//  MULTIVALUTA — 8 valutor, auto-detect, charm-avrundning
//  Källa: ungefärliga snittkurser juni 2026 (uppdatera vid behov)
// ═══════════════════════════════════════════════════════════
const CURRENCIES = {
  SEK: { code:'SEK', symbol:'kr',  position:'after',  decimals:0, rate:1.00,    name:'Svenska kronor' },
  NOK: { code:'NOK', symbol:'kr',  position:'after',  decimals:0, rate:0.99,    name:'Norska kronor' },
  DKK: { code:'DKK', symbol:'kr',  position:'after',  decimals:0, rate:0.66,    name:'Danska kroner' },
  EUR: { code:'EUR', symbol:'€',   position:'before', decimals:2, rate:0.088,   name:'Euro' },
  USD: { code:'USD', symbol:'$',   position:'before', decimals:2, rate:0.095,   name:'US Dollar' },
  GBP: { code:'GBP', symbol:'£',   position:'before', decimals:2, rate:0.075,   name:'British Pound' },
  CHF: { code:'CHF', symbol:'CHF', position:'before', decimals:2, rate:0.085,   name:'Schweizerfranc' },
  PLN: { code:'PLN', symbol:'zł',  position:'after',  decimals:0, rate:0.39,    name:'Polski złoty' }
};

const LANG_TO_CURRENCY = {
  sv:'SEK', no:'NOK', da:'DKK', fi:'EUR',
  en:'USD', de:'EUR', fr:'EUR', es:'EUR',
  it:'EUR', nl:'EUR', pl:'PLN', pt:'EUR',
  ja:'USD', ko:'USD', zh:'USD', ar:'USD'
};

const COUNTRY_TO_CURRENCY = {
  SE:'SEK', NO:'NOK', DK:'DKK', FI:'EUR', IS:'EUR',
  DE:'EUR', FR:'EUR', ES:'EUR', IT:'EUR', NL:'EUR', BE:'EUR', AT:'EUR', IE:'EUR', PT:'EUR', GR:'EUR',
  US:'USD', CA:'USD', MX:'USD',
  GB:'GBP', UK:'GBP',
  CH:'CHF', LI:'CHF',
  PL:'PLN',
  AU:'USD', NZ:'USD', JP:'USD', KR:'USD'
};

// Charm-avrundning: 9-ändelser eller .99 för småbelopp
function charmRound(amount, currency) {
  if (!isFinite(amount) || amount <= 0) return 0;
  var hasDecimals = CURRENCIES[currency] && CURRENCIES[currency].decimals > 0;
  // Sub-10: .99 för USD/EUR/GBP/CHF, heltal annars
  if (amount < 10) {
    if (hasDecimals) {
      var n = Math.max(1, Math.ceil(amount));
      return Math.max(0.99, n - 0.01);
    }
    return Math.max(1, Math.round(amount));
  }
  // 10-99
  if (amount < 100) return Math.round(amount);
  // 100-999: prova nearest 9-ändelse om inom 5%, annars heltal
  if (amount < 1000) {
    var nearest9 = Math.round((amount - 9) / 10) * 10 + 9;
    if (Math.abs(amount - nearest9) / amount < 0.05) return nearest9;
    return Math.round(amount);
  }
  // 1000+: prova nearest 99-ändelse om inom 2.5%, annars rund 10
  var nearest99 = Math.round(amount / 100) * 100 - 1;
  if (Math.abs(amount - nearest99) / amount < 0.025) return nearest99;
  return Math.round(amount / 10) * 10;
}

function getActiveCurrency() {
  // 1. Användaröverskridning (localStorage)
  try {
    var saved = localStorage.getItem('id_currency');
    if (saved && CURRENCIES[saved]) return saved;
  } catch(e){}
  // 2. Auto från språk
  try {
    var lang = (localStorage.getItem('id_lang') || navigator.language || 'sv').toLowerCase().slice(0,2);
    if (LANG_TO_CURRENCY[lang]) return LANG_TO_CURRENCY[lang];
  } catch(e){}
  // 3. Auto från geo (IntlLocale → region)
  try {
    var loc = new Intl.Locale(navigator.language);
    var region = (loc.region || '').toUpperCase();
    if (COUNTRY_TO_CURRENCY[region]) return COUNTRY_TO_CURRENCY[region];
  } catch(e){}
  return 'SEK';
}

function setCurrency(code) {
  if (!CURRENCIES[code]) return false;
  try { localStorage.setItem('id_currency', code); } catch(e){}
  if (typeof rerenderAllPrices === 'function') rerenderAllPrices();
  return true;
}

function formatPrice(sekAmount, opts) {
  opts = opts || {};
  var code = opts.currency || getActiveCurrency();
  var cur = CURRENCIES[code] || CURRENCIES.SEK;
  var raw = sekAmount * cur.rate;
  var rounded = charmRound(raw, code);
  var str;
  if (rounded !== Math.floor(rounded)) {
    str = rounded.toFixed(2);
  } else {
    str = String(Math.round(rounded));
  }
  // Tusentalsavgränsare med mellanslag (svensk standard) eller komma
  if (rounded >= 1000) {
    var intPart = Math.floor(rounded);
    var dec = (rounded !== intPart) ? '.' + str.split('.')[1] : '';
    var sep = (cur.position === 'before') ? ',' : ' ';
    str = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, sep) + dec;
  }
  if (cur.position === 'before') return cur.symbol + str;
  return str + ' ' + cur.symbol;
}

// Re-render alla priser i UI när valuta byts
function rerenderAllPrices() {
  // Produktkort & checkout
  try { if (typeof renderProducts === 'function') renderProducts(); } catch(e){}
  try { if (typeof renderCart === 'function') renderCart(); } catch(e){}
  // Statiska pris-element märkta med data-sek-price
  document.querySelectorAll('[data-sek-price]').forEach(function(el){
    var sek = parseFloat(el.getAttribute('data-sek-price'));
    if (isFinite(sek)) el.textContent = formatPrice(sek);
  });
  // Plan-priser
  document.querySelectorAll('[data-plan-price]').forEach(function(el){
    var sek = parseFloat(el.getAttribute('data-plan-price'));
    if (isFinite(sek)) el.textContent = formatPrice(sek);
  });
  // Currency-picker badge + disclaimer
  var code = getActiveCurrency();
  var b = document.getElementById('currencyPickerBadge');
  if (b) b.textContent = code;
  var disc = document.getElementById('currencyDisclaimerCode');
  if (disc) disc.textContent = code;
}

window.CURRENCIES = CURRENCIES;
window.charmRound = charmRound;
window.getActiveCurrency = getActiveCurrency;
window.setCurrency = setCurrency;
window.formatPrice = formatPrice;
window.rerenderAllPrices = rerenderAllPrices;

// ═══════════════════════════════════════════════════════════
//  GDPR COOKIE CONSENT
//  3 kategorier (necessary alltid på, analytics, marketing)
//  Visas första besöket + om policy-version har uppdaterats
// ═══════════════════════════════════════════════════════════
const COOKIE_CONSENT_KEY = 'id_cookie_consent';
const COOKIE_POLICY_VERSION = '1.0';

function getCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== COOKIE_POLICY_VERSION) return null;
    return parsed;
  } catch(e) { return null; }
}

function saveCookieConsent(prefs) {
  const consent = {
    version: COOKIE_POLICY_VERSION,
    necessary: true,
    analytics: !!prefs.analytics,
    marketing: !!prefs.marketing,
    ts: Date.now()
  };
  try { localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent)); } catch(e){}
  applyCookieConsent(consent);
  return consent;
}

function applyCookieConsent(consent) {
  // Aktivera/avaktivera analys-skript här. Just nu har vi inga, men hooken finns.
  // Exempel: if (consent.analytics) { initAnalytics(); }
  document.documentElement.classList.toggle('consent-analytics', !!consent.analytics);
  document.documentElement.classList.toggle('consent-marketing', !!consent.marketing);
  // Om användaren tackat nej till analys: rensa eventuell tidigare analys-data
  if (!consent.analytics) {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('id_analytics_')).forEach(k => localStorage.removeItem(k));
    } catch(e){}
  }
}

function showCookieBanner() {
  const b = document.getElementById('cookieBanner');
  if (b) b.style.display = '';
}
function hideCookieBanner() {
  const b = document.getElementById('cookieBanner');
  if (b) b.style.display = 'none';
}

function acceptCookies(mode) {
  let prefs;
  if (mode === 'all') prefs = { analytics: true, marketing: true };
  else prefs = { analytics: false, marketing: false }; // 'necessary' eller default
  saveCookieConsent(prefs);
  hideCookieBanner();
  if (typeof showToast === 'function') {
    showToast(mode === 'all' ? '✓ Tack — du kan ändra ditt val i sidfoten' : '✓ Endast nödvändiga cookies — du kan ändra senare');
  }
}

function openCookiePrefs() {
  const m = document.getElementById('cookiePrefsModal');
  if (!m) return;
  // Förfyll med eventuellt sparat val
  const cur = getCookieConsent() || { analytics: false, marketing: false };
  const a = document.getElementById('cookieToggleAnalytics');
  const mk = document.getElementById('cookieToggleMarketing');
  if (a) a.checked = !!cur.analytics;
  if (mk) mk.checked = !!cur.marketing;
  m.style.display = 'flex';
}

function closeCookiePrefs() {
  const m = document.getElementById('cookiePrefsModal');
  if (m) m.style.display = 'none';
}

function saveCookiePrefs() {
  const a = document.getElementById('cookieToggleAnalytics');
  const mk = document.getElementById('cookieToggleMarketing');
  saveCookieConsent({
    analytics: a ? a.checked : false,
    marketing: mk ? mk.checked : false
  });
  closeCookiePrefs();
  hideCookieBanner();
  if (typeof showToast === 'function') showToast('✓ Cookie-val sparat');
}

// Init: visa banner om samtycke saknas
document.addEventListener('DOMContentLoaded', () => {
  const consent = getCookieConsent();
  if (consent) {
    applyCookieConsent(consent);
    hideCookieBanner();
  } else {
    // Vänta lite så sidan hinner ladda först
    setTimeout(showCookieBanner, 800);
  }
});

window.acceptCookies = acceptCookies;
window.openCookiePrefs = openCookiePrefs;
window.closeCookiePrefs = closeCookiePrefs;
window.saveCookiePrefs = saveCookiePrefs;
window.getCookieConsent = getCookieConsent;

// ═══════════════════════════════════════════════════════════
//  PRIVACY-FRIENDLY ANALYTICS (egen lättvikt, GDPR-vänlig)
//
//  Designprinciper:
//  • Ingen tredjepart (Google/Meta) — allt går till vår egen Supabase
//  • Ingen persistent identifier — sessions-baserad UUID (slängs vid stängning)
//  • Respekterar Do Not Track-header
//  • Ingen IP-lagring (skickas inte, Supabase loggar inte automatiskt)
//  • Endast aggregerad data — vilka sidor, vilka knappar, ingen "vem"
//  • Opt-in via cookie-consent (kategori: analytics)
// ═══════════════════════════════════════════════════════════

const ANALYTICS_TABLE = 'analytics_events';
let _analyticsSessionId = null;

function getAnalyticsSession() {
  if (_analyticsSessionId) return _analyticsSessionId;
  try {
    _analyticsSessionId = sessionStorage.getItem('id_an_sid');
    if (!_analyticsSessionId) {
      _analyticsSessionId = 'sid-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('id_an_sid', _analyticsSessionId);
    }
  } catch(e) {
    _analyticsSessionId = 'fallback-' + Math.random().toString(36).slice(2);
  }
  return _analyticsSessionId;
}

function canTrack() {
  // Respektera DNT
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  const consent = getCookieConsent();
  return !!(consent && consent.analytics);
}

async function trackEvent(name, props) {
  if (!canTrack()) return;
  const evt = {
    event_name: String(name).slice(0, 60),
    session_id: getAnalyticsSession(),
    page_path: location.pathname + location.hash,
    referrer: document.referrer ? new URL(document.referrer).hostname : null,
    locale: (localStorage.getItem('id_lang') || navigator.language || '').slice(0, 5),
    currency: getActiveCurrency(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    props: props ? JSON.stringify(props).slice(0, 500) : null,
    ts: new Date().toISOString()
  };
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    await fetch(SUPABASE_URL + '/rest/v1/' + ANALYTICS_TABLE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(evt)
    });
  } catch(e) { /* analytics misslyckas tyst */ }
}

// Auto-track: sidvisning + scroll-djup + utlänk + outbound click
let _maxScroll = 0;
let _pageStart = Date.now();

function autoTrackPageview() {
  if (!canTrack()) return;
  trackEvent('pageview', { hash: location.hash || '#hem' });
  _maxScroll = 0;
  _pageStart = Date.now();
}

window.addEventListener('scroll', () => {
  if (!canTrack()) return;
  const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
  const pct = Math.round(window.scrollY / max * 100);
  if (pct > _maxScroll && pct >= 25 && pct % 25 === 0 && pct <= 100) {
    _maxScroll = pct;
    trackEvent('scroll_depth', { percent: pct });
  }
}, { passive: true });

window.addEventListener('beforeunload', () => {
  if (!canTrack()) return;
  const dwell = Math.round((Date.now() - _pageStart) / 1000);
  try {
    navigator.sendBeacon && navigator.sendBeacon(
      SUPABASE_URL + '/rest/v1/' + ANALYTICS_TABLE,
      new Blob([JSON.stringify({
        event_name: 'dwell_time',
        session_id: getAnalyticsSession(),
        page_path: location.pathname + location.hash,
        props: JSON.stringify({ seconds: dwell, max_scroll: _maxScroll }),
        ts: new Date().toISOString()
      })], { type: 'application/json' })
    );
  } catch(e) {}
});

// Spåra hash-byten (SPA-router)
window.addEventListener('hashchange', autoTrackPageview);

// Spåra utgående länkar
document.addEventListener('click', e => {
  if (!canTrack()) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  if (href.startsWith('http') && !href.includes(location.hostname)) {
    trackEvent('outbound_click', { url: new URL(href).hostname });
  }
}, true);

// Init: vid laddning
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(autoTrackPageview, 1500);
});

// Helper: track button-klick deklarativt
function trackBtn(name) {
  return function(e) { trackEvent('click', { btn: name }); };
}

window.trackEvent = trackEvent;
window.trackBtn = trackBtn;
window.getAnalyticsSession = getAnalyticsSession;

// Formspree endpoints — separate forms for contact and orders
const FORMSPREE_CONTACT = 'https://formspree.io/f/xykdnpno'; // contact form + newsletter signups
const FORMSPREE_ORDER   = 'https://formspree.io/f/mjgpdoyk'; // purchases & order updates
// Legacy alias kept for backward compatibility
const FORMSPREE_ENDPOINT = FORMSPREE_CONTACT;

// ═══════════════════════════════════════════════════════════
//  PRODUCT CATALOG — 6 produkter, varje med flera bilder
// ═══════════════════════════════════════════════════════════
const PRODUCTS = [
  {
    id: 'troja-herr',
    name: 'Indoor Distance T-shirt — Herr',
    tag: 'Herr',
    price: 349,
    category: 'man',
    images: [
      'bilder/troja-man-1.png',
      'bilder/troja-man-2.png',
      'bilder/troja-man-3.png'
    ],
    desc: 'Bekväm T-shirt i 100% ekologisk bomull med Indoor Distance-logga. Skuren för en avslappnad passform. Färg: vit.',
    color: 'Vit',
    sizes: ['S','M','L','XL','XXL'],
    sizeCategory: 'man',
    keywords: ['tröja','t-shirt','shirt','herr','man','kille','kläder','klubbtröja','vit']
  },
  {
    id: 'troja-dam',
    name: 'Indoor Distance T-shirt — Dam',
    tag: 'Dam',
    price: 349,
    category: 'kvinna',
    images: [
      'bilder/troja-kvinna-1.png',
      'bilder/troja-kvinna-2.png'
    ],
    desc: 'Skön T-shirt med tailored fit. Skuren för en bekväm och feminin passform. 100% ekologisk bomull. Färg: vit.',
    color: 'Vit',
    sizes: ['S','M','L','XL','XXL'],
    sizeCategory: 'kvinna',
    keywords: ['tröja','t-shirt','shirt','dam','kvinna','tjej','kläder','klubbtröja','vit']
  },
  {
    id: 'troja-ungdom',
    name: 'Indoor Distance T-shirt — Ungdom',
    tag: 'Ungdom',
    price: 299,
    category: 'ungdom',
    images: [
      'bilder/troja-ungdom-1.png',
      'bilder/troja-ungdom-2.png'
    ],
    desc: 'Perfekt för klubbträningen. Mjuk bomull, hållbar i tvätten. För ungdomar. Färg: vit.',
    color: 'Vit',
    sizes: ['S','M','L','XL','XXL'],
    sizeCategory: 'ungdom',
    keywords: ['tröja','t-shirt','ungdom','junior','tonåring','kläder','klubbtröja','vit']
  },
  {
    id: 'troja-smabarn',
    name: 'Indoor Distance T-shirt — Barn',
    tag: 'Barn',
    price: 249,
    category: 'smabarn',
    images: [
      'bilder/troja-smabarn-1.png',
      'bilder/troja-smabarn-2.png',
      'bilder/troja-smabarn-3.png'
    ],
    desc: 'Mjuk ekologisk bomull. Hudvänlig för känslig hud. Färg: vit. För de minsta.',
    color: 'Vit',
    sizes: ['1-2 år','3-4 år'],
    sizeCategory: 'barn',
    keywords: ['tröja','t-shirt','barn','baby','liten','kläder','klubbtröja','vit']
  },
  {
    id: 'hoodie-vuxen',
    name: 'Indoor Distance Huvtröja — Vuxen',
    tag: 'Vuxen',
    price: 599,
    category: 'hoodie',
    images: [
      'bilder/screenshot-2026-06-02-065433.png',
      'bilder/screenshot-2026-06-02-065441.png',
      'bilder/screenshot-2026-06-02-065450.png',
      'bilder/screenshot-2026-06-02-065458.png'
    ],
    desc: 'Mjuk, varm huvtröja med Indoor Distance-logga på bröstet och stor logga på ryggen. Borstad insida för extra komfort. 80% bomull, 20% polyester.',
    color: 'Ljusgrå',
    sizes: ['S','M','L','XL','XXL'],
    sizeCategory: 'vuxen-hoodie',
    keywords: ['huvtröja','hoodie','tröja','vuxen','grå','varm']
  },
  {
    id: 'hoodie-ungdom',
    name: 'Indoor Distance Huvtröja — Ungdom',
    tag: 'Ungdom',
    price: 549,
    category: 'hoodie',
    images: [
      'bilder/screenshot-2026-06-02-065541.png',
      'bilder/screenshot-2026-06-02-065556.png',
      'bilder/screenshot-2026-06-02-065505.png',
      'bilder/screenshot-2026-06-02-065548.png'
    ],
    desc: 'Huvtröja för ungdomar. Lika varm och bekväm som vuxenmodellen, anpassad i storlek. Indoor Distance-logga på bröstet och rygg.',
    color: 'Ljusgrå',
    sizes: ['S','M','L','XL'],
    sizeCategory: 'ungdom-hoodie',
    keywords: ['huvtröja','hoodie','ungdom','tonåring','grå','varm']
  },
  {
    id: 'hoodie-barn',
    name: 'Indoor Distance Huvtröja — Barn',
    tag: 'Barn',
    price: 499,
    category: 'hoodie',
    images: [
      'bilder/screenshot-2026-06-02-065603.png',
      'bilder/screenshot-2026-06-02-065531.png',
      'bilder/screenshot-2026-06-02-065610.png'
    ],
    desc: 'Mjuk huvtröja för de minsta. Varm fleece-insida som sitter perfekt över tröjan. Liten ID-logga på bröstet, stor logga på ryggen.',
    color: 'Ljusgrå',
    sizes: ['1-2 år','3-4 år'],
    sizeCategory: 'barn-hoodie',
    keywords: ['huvtröja','hoodie','barn','baby','liten','varm']
  },
  {
    id: 'mugg',
    name: 'Indoor Distance Mugg',
    tag: 'Mugg',
    price: 179,
    category: 'mugg',
    images: [
      'bilder/mugg-1.png',
      'bilder/mugg-2.png',
      'bilder/mugg-3.png'
    ],
    desc: 'Keramikmugg 325 ml med Indoor Distance-logga. Färg: vit. Tål diskmaskin och mikrovågsugn.',
    color: 'Vit',
    volume: '325 ml',
    sizes: null,
    keywords: ['mugg','kopp','kaffe','dryck','keramik','cup','325 ml','vit']
  },
  {
    id: 'klistermarke',
    name: 'Indoor Distance Klistermärke',
    tag: 'Klistermärke',
    price: 49,
    category: 'klister',
    images: [
      'bilder/klistermarke.png'
    ],
    desc: 'Vattenavstötande vinyl, 10 × 10 cm. Perfekt för flaskan, datorn, bilrutan eller skateboarden. Hållbar i flera år.',
    sizes: null,
    keywords: ['klistermärke','sticker','dekal','klister','vinyl']
  }
];

// ═══════════════════════════════════════════════════════════
//  SIZE GUIDE DATA (cm measurements per category)
// ═══════════════════════════════════════════════════════════
const SIZE_GUIDE = {
  man: {
    title: 'Herr',
    columns: ['Storlek', 'Bröst (cm)', 'Midja (cm)', 'Längd (cm)'],
    rows: [
      ['S',  '88-94',  '76-82',  '69'],
      ['M',  '94-100', '82-88',  '71'],
      ['L',  '100-106','88-94',  '73'],
      ['XL', '106-112','94-100', '75'],
      ['XXL','112-120','100-108','77']
    ]
  },
  kvinna: {
    title: 'Dam',
    columns: ['Storlek', 'Byst (cm)', 'Midja (cm)', 'Längd (cm)'],
    rows: [
      ['S',  '82-88',  '64-70',  '63'],
      ['M',  '88-94',  '70-76',  '65'],
      ['L',  '94-100', '76-82',  '67'],
      ['XL', '100-106','82-88',  '69'],
      ['XXL','106-112','88-96',  '71']
    ]
  },
  ungdom: {
    title: 'Ungdom',
    columns: ['Storlek', 'Längd (cm)', 'Bröst (cm)', 'Tröjlängd (cm)'],
    rows: [
      ['S',   '140-146', '70-74', '54'],
      ['M',   '146-152', '74-78', '58'],
      ['L',   '152-164', '78-84', '62'],
      ['XL',  '164-176', '84-90', '66'],
      ['XXL', '176-182', '90-96', '70']
    ]
  },
  barn: {
    title: 'Barn',
    columns: ['Storlek', 'Längd (cm)', 'Ålder', 'Tröjlängd (cm)'],
    rows: [
      ['1-2 år', '86-92',   '1-2 år',  '38'],
      ['3-4 år', '98-104',  '3-4 år',  '44']
    ]
  },
  'vuxen-hoodie': {
    title: 'Vuxen — Huvtröja',
    columns: ['Storlek', 'Bröst (cm)', 'Längd (cm)', 'Ärmlängd (cm)'],
    rows: [
      ['S',   '94-100', '68', '62'],
      ['M',   '100-106','70', '64'],
      ['L',   '106-112','72', '66'],
      ['XL',  '112-118','74', '68'],
      ['XXL', '118-126','76', '70']
    ]
  },
  'ungdom-hoodie': {
    title: 'Ungdom — Huvtröja',
    columns: ['Storlek', 'Längd (cm)', 'Bröst (cm)', 'Tröjlängd (cm)'],
    rows: [
      ['S',  '140-146', '74-78', '54'],
      ['M',  '146-152', '78-82', '58'],
      ['L',  '152-164', '82-88', '62'],
      ['XL', '164-176', '88-94', '66']
    ]
  },
  'barn-hoodie': {
    title: 'Barn — Huvtröja',
    columns: ['Storlek', 'Längd (cm)', 'Ålder', 'Tröjlängd (cm)'],
    rows: [
      ['1-2 år', '86-92',   '1-2 år',  '40'],
      ['3-4 år', '98-104',  '3-4 år',  '46']
    ]
  }
};

// Subscription plans (used by search to match queries about pricing)
const PLANS = [
  { name:'Med reklam · 1 mån',     price:99,  href:'#priser',
    keywords:['reklam','budget','billig','testa','månad','plan','prenumeration'] },
  { name:'Med reklam · Halv säsong', price:199, href:'#priser',
    keywords:['reklam','budget','halv','säsong','plan','prenumeration'] },
  { name:'Med reklam · Hel säsong',  price:349, href:'#priser',
    keywords:['reklam','budget','hel','säsong','år','plan','prenumeration'] },
  { name:'Individuell · 1 mån',      price:199, href:'#priser',
    keywords:['individuell','personlig','reklamfri','konto','månad','plan'] },
  { name:'Individuell · Halv säsong',price:349, href:'#priser',
    keywords:['individuell','personlig','reklamfri','halv','säsong','plan'] },
  { name:'Individuell · Hel säsong', price:649, href:'#priser',
    keywords:['individuell','personlig','reklamfri','hel','säsong','år','plan','populär'] },
  { name:'Klubb · 1 mån',            price:999,href:'#priser',
    keywords:['klubb','team','tränare','månad','plan','förening'] },
  { name:'Klubb · Halv säsong',      price:2499,href:'#priser',
    keywords:['klubb','team','tränare','halv','säsong','plan','förening'] },
  { name:'Klubb · Hel säsong',       price:4499,href:'#priser',
    keywords:['klubb','team','tränare','hel','säsong','år','plan','förening'] }
];

// Quick info links the search can also surface
const INFO_LINKS = [
  { name:'Om Indoor Distance',         href:'#om',       keywords:['om','company','företag','founder','grundare','vilka','vi'] },
  { name:'Våra tjänster',              href:'#tjanster', keywords:['tjänster','vad','erbjuder','funktioner','features'] },
  { name:'Vanliga frågor (FAQ)',       href:'#faq',      keywords:['faq','fråga','hjälp','support','vanlig'] },
  { name:'Recensioner',                href:'#testimonials', keywords:['recension','review','testimonial','röster','kunder'] },
  { name:'Kontakta oss',               href:'#kontakt',  keywords:['kontakt','mail','email','meddelande','frågor'] },
  { name:'Mitt konto',                 href:'#konto',    keywords:['konto','login','logga','registrera','dashboard','profil'] },
  { name:'Öppna appen',                href:'../Indoor distance app/indoor_distance_pro (1).html',
    keywords:['app','öppna','starta','prova','demo','testa'] }
];

// Merge custom products added via admin into PRODUCTS
try {
  const customs = JSON.parse(localStorage.getItem('id_custom_products') || '[]');
  if (Array.isArray(customs) && customs.length) {
    customs.forEach(cp => {
      // Skip if same id already exists (avoid duplicates)
      if (!PRODUCTS.find(p => p.id === cp.id)) PRODUCTS.push(cp);
    });
  }
} catch (e) { console.warn('Custom products load error:', e); }

// ═══════════════════════════════════════════════════════════
//  SHOP STATE & STOCK MANAGEMENT
//  Admin can close the shop (default = closed since not selling yet)
//  Admin can set stock per product (default = 0 = "not in stock yet")
// ═══════════════════════════════════════════════════════════
const SHOP_STATE_KEY  = 'id_shop_state';      // {open: bool, message: str, expectedDate: str}
const STOCK_KEY       = 'id_stock';           // {productId: number}
const ADMIN_PIN_KEY   = 'id_admin_pin';       // PIN for admin page

const DEFAULT_SHOP_STATE = {
  open: false,                                 // CLOSED by default — not selling yet
  message: 'Vi har inte börjat sälja än — håll utkik!',
  expectedDate: ''                             // e.g. "Hösten 2026"
};

function getShopState() {
  try {
    const s = JSON.parse(localStorage.getItem(SHOP_STATE_KEY) || 'null');
    return s || DEFAULT_SHOP_STATE;
  } catch(e) { return DEFAULT_SHOP_STATE; }
}
function setShopState(state) {
  localStorage.setItem(SHOP_STATE_KEY, JSON.stringify(state));
}
function isShopOpen() { return !!getShopState().open; }

function getStockMap() {
  try {
    return JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  } catch(e) { return {}; }
}
function setStockMap(map) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(map));
}
function getStock(productId) {
  const map = getStockMap();
  // If not set: returns 0 (sold out) - admin must manually add stock
  return Number.isInteger(map[productId]) ? map[productId] : 0;
}
function setStock(productId, qty) {
  const map = getStockMap();
  map[productId] = Math.max(0, Math.floor(qty));
  setStockMap(map);
}

// Decrement stock when item is purchased
function decrementStock(items) {
  const map = getStockMap();
  items.forEach(item => {
    const cur = Number.isInteger(map[item.id]) ? map[item.id] : 0;
    map[item.id] = Math.max(0, cur - item.qty);
  });
  setStockMap(map);
}

// ═══════════════════════════════════════════════════════════
//  RENDER PRODUCTS — with image gallery (arrows + dots + swipe)
// ═══════════════════════════════════════════════════════════
const galleryState = {}; // id → currentIndex

function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const shopOpen = isShopOpen();
  const shopState = getShopState();

  // SHOP CLOSED: show coming soon banner instead of products
  if (!shopOpen) {
    const dateText = shopState.expectedDate
      ? `<div class="shop-closed-date">Förväntad start: <strong>${shopState.expectedDate}</strong></div>`
      : '';
    grid.innerHTML = `
      <div class="shop-closed-banner reveal-up">
        <div class="shop-closed-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <span class="shop-closed-eyebrow">Kommer snart</span>
        <h3>Butiken är ännu inte öppen</h3>
        <p>${shopState.message || DEFAULT_SHOP_STATE.message}</p>
        ${dateText}
        <p class="shop-closed-preview-lbl">Förhandstitta på utbudet nedan</p>
      </div>
      <div class="shop-preview-grid">
        ${PRODUCTS.map((p, i) => renderPreviewCard(p, i)).join('')}
      </div>
    `;
    observeReveals();
    return;
  }

  // SHOP OPEN: render normal product grid
  grid.innerHTML = PRODUCTS.map((p, i) => renderProductCard(p, i)).join('');
  // Update arrow disabled states
  PRODUCTS.forEach(p => updateGalleryUI(p.id));
  // Init swipe
  PRODUCTS.forEach(p => { if (p.images.length > 1) initSwipe(p.id); });
  observeReveals();
}

function renderProductCard(p, i) {
  if (!galleryState[p.id]) galleryState[p.id] = 0;
  const hasGallery = p.images.length > 1;
  const stock = getStock(p.id);
  const stockBadge = stockBadgeHTML(stock);
  const isSoldOut = stock === 0;
  return `
    <article class="product-card reveal-up ${isSoldOut?'sold-out':''}" data-delay="${(i % 4) * 80}" data-category="${p.category}" data-pid="${p.id}">
      ${stockBadge}
      <div class="product-img" onclick="openProductModal('${p.id}')">
        <div class="gallery" data-gid="${p.id}">
          <div class="gallery-track" id="track-${p.id}">
            ${p.images.map((src,idx) => `
              <div class="gallery-slide"><img src="${src}" alt="${p.name} bild ${idx+1}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%23131D34%22/%3E%3Ctext x=%22200%22 y=%22200%22 font-family=%22Georgia%22 font-size=%22120%22 font-style=%22italic%22 fill=%22%23DCD0BC%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ED%3C/text%3E%3Ctext x=%22200%22 y=%22320%22 font-family=%22system-ui%22 font-size=%2216%22 fill=%22%238B95A1%22 text-anchor=%22middle%22 letter-spacing=%224%22%3EBILD LADDAS%3C/text%3E%3C/svg%3E';"></div>
            `).join('')}
          </div>
          ${hasGallery ? `
            <button class="gallery-arrow prev" onclick="event.stopPropagation();galleryStep('${p.id}',-1)" aria-label="Föregående">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="gallery-arrow next" onclick="event.stopPropagation();galleryStep('${p.id}',1)" aria-label="Nästa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div class="gallery-dots">
              ${p.images.map((_,idx) => `<span class="gallery-dot ${idx===0?'active':''}" onclick="event.stopPropagation();galleryGoTo('${p.id}',${idx})"></span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="product-info">
        <span class="product-tag">${p.tag}</span>
        <h3>${p.name}</h3>
        <p class="product-desc">${p.desc.split('.')[0]}.</p>
        ${p.sizes ? `
          <div class="card-sizes">
            <span class="card-sizes-lbl">Storlekar:</span>
            ${p.sizes.map(s => `<span class="card-size-chip">${s}</span>`).join('')}
          </div>
        ` : ''}
        <div class="product-bottom">
          <span class="product-price">${formatPrice(p.price)}</span>
          ${isSoldOut
            ? `<button class="btn-add disabled" disabled>Slutsåld</button>`
            : `<button class="btn-add" onclick="event.stopPropagation();quickAdd('${p.id}')">${p.sizes ? 'Välj storlek →' : 'Lägg till'}</button>`
          }
        </div>
      </div>
    </article>`;
}

// Preview card (shown when shop is closed) — no add to cart, smaller
function renderPreviewCard(p, i) {
  return `
    <article class="product-card preview-card reveal-up" data-delay="${(i % 4) * 60}" data-category="${p.category}" data-pid="${p.id}">
      <div class="product-img" onclick="openProductModal('${p.id}')">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%23131D34%22/%3E%3Ctext x=%22200%22 y=%22200%22 font-family=%22Georgia%22 font-size=%22120%22 font-style=%22italic%22 fill=%22%23DCD0BC%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ED%3C/text%3E%3Ctext x=%22200%22 y=%22320%22 font-family=%22system-ui%22 font-size=%2216%22 fill=%22%238B95A1%22 text-anchor=%22middle%22 letter-spacing=%224%22%3EBILD LADDAS%3C/text%3E%3C/svg%3E';">
      </div>
      <div class="product-info">
        <span class="product-tag">${p.tag}</span>
        <h3>${p.name}</h3>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="btn-add disabled" disabled>Kommer snart</button>
        </div>
      </div>
    </article>`;
}

function stockBadgeHTML(stock) {
  if (stock === 0) return `<div class="stock-badge sold-out-badge">Slutsåld</div>`;
  if (stock <= 3) return `<div class="stock-badge low-stock-badge">Bara ${stock} kvar!</div>`;
  if (stock <= 10) return `<div class="stock-badge low-stock-soft">${stock} i lager</div>`;
  return '';
}

function galleryStep(pid, delta) {
  const p = getProduct(pid);
  if (!p || p.images.length <= 1) return;
  const cur = galleryState[pid] || 0;
  const next = Math.max(0, Math.min(p.images.length - 1, cur + delta));
  if (next === cur) return;
  galleryState[pid] = next;
  updateGalleryUI(pid);
}

function galleryGoTo(pid, idx) {
  const p = getProduct(pid);
  if (!p) return;
  galleryState[pid] = Math.max(0, Math.min(p.images.length - 1, idx));
  updateGalleryUI(pid);
}

function updateGalleryUI(pid) {
  const idx = galleryState[pid] || 0;
  const p = getProduct(pid);
  if (!p) return;
  // Update product-card gallery
  const track = document.getElementById('track-' + pid);
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  // Card dots
  const card = document.querySelector(`.product-card[data-pid="${pid}"]`);
  if (card) {
    card.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    const prev = card.querySelector('.gallery-arrow.prev');
    const next = card.querySelector('.gallery-arrow.next');
    if (prev) prev.classList.toggle('disabled', idx === 0);
    if (next) next.classList.toggle('disabled', idx === p.images.length - 1);
  }
  // Modal gallery (if open with this product)
  if (modalProduct && modalProduct.id === pid) {
    const mTrack = document.getElementById('pmGalleryTrack');
    if (mTrack) mTrack.style.transform = `translateX(-${idx * 100}%)`;
    document.querySelectorAll('#pmGalleryDots .gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    const mPrev = document.querySelector('.product-modal-img .gallery-arrow.prev');
    const mNext = document.querySelector('.product-modal-img .gallery-arrow.next');
    if (mPrev) mPrev.classList.toggle('disabled', idx === 0);
    if (mNext) mNext.classList.toggle('disabled', idx === p.images.length - 1);
  }
}

// Touch/swipe support
function initSwipe(pid) {
  const card = document.querySelector(`.product-card[data-pid="${pid}"] .gallery`);
  if (!card) return;
  let startX = null;
  card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', e => {
    if (startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    if (Math.abs(diff) > 40) galleryStep(pid, diff > 0 ? -1 : 1);
    startX = null;
  });
}

function getProduct(id) { return PRODUCTS.find(p => p.id === id); }

function quickAdd(id) {
  const p = getProduct(id);
  if (!p) return;
  if (!isShopOpen()) { showToast('Butiken är inte öppen än'); return; }
  if (getStock(id) === 0) { showToast('Slutsåld'); return; }
  if (p.sizes) {
    openProductModal(id);
    return;
  }
  addToCart(p, null, 1);
}

// ═══════════════════════════════════════════════════════════
//  PRODUCT MODAL
// ═══════════════════════════════════════════════════════════
let modalProduct = null, modalSize = null, modalQuantity = 1;

function openProductModal(id) {
  const p = getProduct(id);
  if (!p) return;
  modalProduct = p; modalSize = p.sizes ? p.sizes[Math.floor(p.sizes.length/2)] : null; modalQuantity = 1;
  // Replace the modal image with a gallery
  const imgWrap = document.querySelector('.product-modal-img');
  const hasGallery = p.images.length > 1;
  imgWrap.innerHTML = `
    <div class="gallery" style="width:100%;height:100%">
      <div class="gallery-track" id="pmGalleryTrack">
        ${p.images.map((src,idx) => `
          <div class="gallery-slide"><img src="${src}" alt="${p.name} ${idx+1}"></div>
        `).join('')}
      </div>
      ${hasGallery ? `
        <button class="gallery-arrow prev" onclick="galleryStep('${p.id}',-1)" aria-label="Föregående">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="gallery-arrow next" onclick="galleryStep('${p.id}',1)" aria-label="Nästa">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div class="gallery-dots" id="pmGalleryDots">
          ${p.images.map((_,idx) => `<span class="gallery-dot ${idx===(galleryState[p.id]||0)?'active':''}" onclick="galleryGoTo('${p.id}',${idx})"></span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
  document.getElementById('pmTag').textContent = p.tag;
  document.getElementById('pmName').textContent = p.name;
  document.getElementById('pmDesc').textContent = p.desc;
  document.getElementById('pmPrice').textContent = formatPrice(p.price);
  document.getElementById('pmQty').textContent = modalQuantity;
  const sizesEl = document.getElementById('pmSizes');
  if (p.sizes) {
    sizesEl.parentElement.style.display = '';
    sizesEl.innerHTML = p.sizes.map(s =>
      `<button class="size-btn ${s===modalSize?'active':''}" onclick="selectSize('${s}')">${s}</button>`
    ).join('');
  } else {
    sizesEl.parentElement.style.display = 'none';
  }
  // Apply current index
  updateGalleryUI(p.id);
  // Swipe in modal too
  if (hasGallery) {
    let startX = null;
    const gWrap = imgWrap.querySelector('.gallery');
    gWrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    gWrap.addEventListener('touchend', e => {
      if (startX === null) return;
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      if (Math.abs(diff) > 40) galleryStep(p.id, diff > 0 ? -1 : 1);
      startX = null;
    });
    // Keyboard arrows
    document.addEventListener('keydown', modalKeyNav);
  }
  document.getElementById('productModal').classList.add('open');
}

function modalKeyNav(e) {
  if (!document.getElementById('productModal').classList.contains('open')) {
    document.removeEventListener('keydown', modalKeyNav);
    return;
  }
  if (!modalProduct) return;
  if (e.key === 'ArrowLeft')  galleryStep(modalProduct.id, -1);
  if (e.key === 'ArrowRight') galleryStep(modalProduct.id, 1);
}

function selectSize(s) {
  modalSize = s;
  document.querySelectorAll('#pmSizes .size-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === s);
  });
}

function modalQty(delta) {
  modalQuantity = Math.max(1, Math.min(10, modalQuantity + delta));
  document.getElementById('pmQty').textContent = modalQuantity;
}

function addModalToCart() {
  if (!modalProduct) return;
  if (!isShopOpen()) { showToast('Butiken är inte öppen än'); return; }
  if (getStock(modalProduct.id) === 0) { showToast('Slutsåld'); return; }
  if (modalProduct.sizes && !modalSize) { showToast('Välj en storlek'); return; }
  // Check we don't exceed stock
  const stock = getStock(modalProduct.id);
  const inCart = getCart().filter(it => it.id === modalProduct.id).reduce((s, it) => s + it.qty, 0);
  if (inCart + modalQuantity > stock) {
    showToast(`Bara ${stock - inCart} kvar`);
    return;
  }
  addToCart(modalProduct, modalSize, modalQuantity);
  closeProductModal();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  updateBodyModalLock();
}

// Add `modal-open` class to body whenever ANY modal-backdrop is open
function updateBodyModalLock() {
  const anyOpen = !!document.querySelector('.modal-backdrop.open, .cart-panel.open, .ai-spotlight.open, .mobile-menu.open');
  document.body.classList.toggle('modal-open', anyOpen);
}

// Auto-watch class changes on all modal-like elements
function initModalLockObserver() {
  const selectors = ['.modal-backdrop', '.cart-panel', '.ai-spotlight', '.mobile-menu'];
  const obs = new MutationObserver(updateBodyModalLock);
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  CART
// ═══════════════════════════════════════════════════════════
const CART_KEY = 'id_hemsida_cart';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e){ return []; } }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartUI(); }

function addToCart(product, size, qty) {
  const cart = getCart();
  const key = product.id + (size ? '|' + size : '');
  const existing = cart.find(i => i.key === key);
  if (existing) existing.qty = Math.min(99, existing.qty + qty);
  else cart.push({
    key, id: product.id, name: product.name,
    price: product.price, img: product.img, size, qty
  });
  saveCart(cart);
  showToast(`✓ ${product.name}${size?' ('+size+')':''} tillagd`);
  openCart();
  // Animate cart icon
  const cartBtn = document.querySelector('.cart-btn');
  if (cartBtn) {
    cartBtn.style.transform = 'scale(1.15)';
    setTimeout(() => cartBtn.style.transform = '', 250);
  }
}

function removeFromCart(key) { saveCart(getCart().filter(i => i.key !== key)); }
function changeQty(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) saveCart(cart.filter(i => i !== item));
  else saveCart(cart);
}

function cartSubtotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}

function getShippingCost() {
  const sub = cartSubtotal();
  if (sub === 0) return 0;
  if (sub >= FREE_SHIPPING_THRESHOLD) return 0;
  return 49;
}

function updateCartUI() {
  const cart = getCart();
  const sub = cartSubtotal();
  const shipping = getShippingCost();
  const total = sub + shipping;
  const cartCountEl = document.getElementById('cartCount');
  if (!cartCountEl) return; // Not on main page
  cartCountEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartTotal').textContent = formatPrice(total);
  document.getElementById('cartShipping').textContent = shipping === 0 ? 'Gratis ✓' : formatPrice(shipping);
  // Free shipping progress (visa avstånd kvar i aktiv valuta)
  const freeRow = document.getElementById('cartFreeShip');
  if (freeRow) {
    if (sub === 0) freeRow.querySelector('span').textContent = '';
    else if (sub >= FREE_SHIPPING_THRESHOLD) freeRow.querySelector('span').textContent = '🎁 Gratis frakt!';
    else freeRow.querySelector('span').textContent = `${formatPrice(FREE_SHIPPING_THRESHOLD - sub)} kvar till fri frakt`;
  }
  const list = document.getElementById('cartItems');
  if (cart.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:var(--text-mute)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 16px;opacity:.4;display:block">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/>
        </svg>
        <div style="font-size:13px">Varukorgen är tom</div>
      </div>`;
    return;
  }
  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.size ? '<div style="font-size:11px;color:var(--text-mute);margin-top:1px">Storlek: '+item.size+'</div>' : ''}
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <button onclick="changeQty('${item.key}', -1)" style="background:var(--surface-2);border:1px solid var(--border-2);color:#FFF;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px">−</button>
          <span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
          <button onclick="changeQty('${item.key}', 1)" style="background:var(--surface-2);border:1px solid var(--border-2);color:#FFF;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">×</button>
    </div>
  `).join('');
}

function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  updateCartUI();
}
function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
//  CHECKOUT FLOW
// ═══════════════════════════════════════════════════════════
let currentOrderNum = null;

function openCheckout() {
  if (getCart().length === 0) { showToast('Varukorgen är tom'); return; }
  closeCart();
  currentOrderNum = 'ID' + Date.now().toString(36).slice(-6).toUpperCase();
  document.getElementById('coOrderNum').textContent = currentOrderNum;
  // Pre-fill from saved customer details if available
  const saved = JSON.parse(localStorage.getItem('id_customer') || '{}');
  if (saved.fn) document.getElementById('coFn').value = saved.fn;
  if (saved.ln) document.getElementById('coLn').value = saved.ln;
  if (saved.email) document.getElementById('coEmail').value = saved.email;
  if (saved.phone) document.getElementById('coPhone').value = saved.phone;
  if (saved.street) document.getElementById('coStreet').value = saved.street;
  if (saved.zip) document.getElementById('coZip').value = saved.zip;
  if (saved.city) document.getElementById('coCity').value = saved.city;
  coNext(1);
  document.getElementById('checkoutModal').classList.add('open');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

function coNext(step) {
  // Validate current step
  if (step === 2) {
    const required = ['coFn','coLn','coEmail','coPhone','coStreet','coZip','coCity'];
    for (const id of required) {
      const el = document.getElementById(id);
      if (!el.value.trim()) { showToast('Fyll i alla fält'); el.focus(); return; }
    }
    // Save customer info for next time
    localStorage.setItem('id_customer', JSON.stringify({
      fn: document.getElementById('coFn').value,
      ln: document.getElementById('coLn').value,
      email: document.getElementById('coEmail').value,
      phone: document.getElementById('coPhone').value,
      street: document.getElementById('coStreet').value,
      zip: document.getElementById('coZip').value,
      city: document.getElementById('coCity').value
    }));
  }
  if (step === 3) {
    // Compute total with chosen shipping
    const shipOpt = document.querySelector('input[name="ship"]:checked')?.value || 'standard';
    const sub = cartSubtotal();
    let shipping = getShippingCost();
    if (shipOpt === 'express') shipping = 99;
    if (shipOpt === 'pickup') shipping = sub >= FREE_SHIPPING_THRESHOLD ? 0 : 39;
    document.getElementById('coSwishTotal').textContent = (sub + shipping) + ' kr';
  }
  // Show step
  document.querySelectorAll('.co-step').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
  document.getElementById('coStep' + step).classList.add('active');
  document.getElementById('coStep' + step).style.display = 'block';
  document.querySelectorAll('.checkout-step').forEach((el, i) => {
    el.classList.toggle('active', i+1 === step);
  });
}

function coBack(step) { coNext(step); }

// Switch between Swish and Card payment UI
function updatePayMethod() {
  const method = document.querySelector('input[name="payment"]:checked')?.value || 'swish';
  document.getElementById('paySwishBlock').style.display = method === 'swish' ? 'block' : 'none';
  document.getElementById('payCardBlock').style.display  = method === 'card'  ? 'block' : 'none';
  // Toggle active class on labels
  document.querySelectorAll('.pay-method').forEach(l => {
    l.classList.toggle('active', l.querySelector('input').checked);
  });
  // Update primary button label
  const btn = document.getElementById('coCompleteBtn');
  if (btn) btn.textContent = method === 'swish' ? 'Jag har Swishat ✓' : 'Slutför betalning →';
}

// Build Swish deep-link URL and open the Swish app (mobile only)
function openSwishApp(e) {
  e.preventDefault();
  const total = parseInt(document.getElementById('coSwishTotal').textContent) || cartSubtotal();
  const orderNum = currentOrderNum || 'ID000000';
  const swishNumber = SWISH_NUMBER.replace(/\s/g, ''); // remove spaces: "0763968861"
  // Swish deep-link format: swish://payment?data={JSON-encoded payload}
  const payload = {
    version: 1,
    payee: { value: swishNumber },
    amount: { value: total },
    message: { value: orderNum, editable: false }
  };
  const swishURL = 'swish://payment?data=' + encodeURIComponent(JSON.stringify(payload));
  // Detect mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // Open Swish app
    window.location.href = swishURL;
    showToast('🚀 Öppnar Swish-appen...');
    // Fallback: if Swish isn't installed, after 1.5s direct to Swish on App Store
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        // App didn't open — likely not installed. Show fallback info.
        showToast('Swish-appen verkar inte vara installerad. Swisha manuellt till ' + SWISH_NUMBER);
      }
    }, 1500);
  } else {
    // Desktop: show QR code or just instruct
    showToast('💡 Skanna med Swish-appen från din mobil eller swisha manuellt till ' + SWISH_NUMBER);
    // Could add QR code here in future
  }
  return false;
}

async function coComplete() {
  if (!document.getElementById('coTerms').checked) { showToast('Godkänn villkoren'); return; }
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'swish';
  // Save order to local history
  const order = {
    orderNum: currentOrderNum,
    ts: Date.now(),
    customer: {
      name: document.getElementById('coFn').value + ' ' + document.getElementById('coLn').value,
      email: document.getElementById('coEmail').value,
      phone: document.getElementById('coPhone').value,
      address: document.getElementById('coStreet').value + ', ' + document.getElementById('coZip').value + ' ' + document.getElementById('coCity').value
    },
    items: getCart(),
    shipping: document.querySelector('input[name="ship"]:checked')?.value || 'standard',
    subtotal: cartSubtotal(),
    total: parseInt(document.getElementById('coSwishTotal').textContent) || cartSubtotal(),
    paymentMethod,
    status: 'pending_payment' // initial status: "Väntar på swish"
  };
  const orders = JSON.parse(localStorage.getItem('id_orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('id_orders', JSON.stringify(orders));
  // Decrement stock
  decrementStock(order.items);
  // Submit to Formspree (order endpoint) so admin gets a structured email
  try {
    await fetch(FORMSPREE_ORDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `🛒 Ny order ${order.orderNum} — ${order.total} kr`,
        _replyto: order.customer.email,
        orderNumber: order.orderNum,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        deliveryAddress: order.customer.address,
        shippingMethod: order.shipping,
        paymentMethod,
        items: order.items.map(i => `${i.qty}× ${i.name}${i.size?' ('+i.size+')':''} = ${i.price * i.qty} kr`).join('\n'),
        subtotal: order.subtotal + ' kr',
        total: order.total + ' kr',
        swishNumber: SWISH_NUMBER,
        orderedAt: new Date(order.ts).toLocaleString('sv-SE')
      })
    });
  } catch (err) {
    console.warn('Order formspree error:', err);
  }
  // Clear cart
  localStorage.removeItem(CART_KEY);
  updateCartUI();
  closeCheckout();
  // Show confirmation
  document.getElementById('confirmText').innerHTML = `Vi har mottagit din beställning <strong>#${order.orderNum}</strong>. Vi bekräftar Swish-betalningen och skickar tracking inom 24 timmar till <strong>${order.customer.email}</strong>.`;
  document.getElementById('orderConfirmModal').classList.add('open');
  // Re-render products to update stock levels visually
  renderProducts();
}

function closeOrderConfirm() {
  document.getElementById('orderConfirmModal').classList.remove('open');
}

// Show the prepared order confirmation email — extension of the confirmation
function viewOrderEmail() {
  const orders = JSON.parse(localStorage.getItem('id_orders') || '[]');
  const latest = orders[0];
  if (!latest) return;
  showOrderEmailModal(latest.orderNum, latest.total, latest.customer, latest);
}

// ═══════════════════════════════════════════════════════════
//  AUTH (Supabase)
// ═══════════════════════════════════════════════════════════
function getToken()        { return localStorage.getItem(TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(TOKEN_REFRESH); }
function setTokens(access, refresh) {
  if (access)  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(TOKEN_REFRESH, refresh);
}
function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_REFRESH);
}

async function authedFetch(path, opts = {}) {
  opts.headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + (getToken() || SUPABASE_KEY),
    ...(opts.headers || {})
  };
  return fetch(SUPABASE_URL + path, opts);
}

async function webLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Fyll i e-post och lösenord'); return; }
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + (data.msg || data.error_description || 'Inloggning misslyckades')); return; }
    setTokens(data.access_token, data.refresh_token);
    showToast('✓ Inloggad');
    await loadUserDashboard();
  } catch(err) {
    showToast('Nätverksfel');
  }
}

async function webSignup() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Fyll i e-post och lösenord'); return; }
  if (password.length < 6) { showToast('Lösenord måste vara minst 6 tecken'); return; }
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + (data.msg || 'Registrering misslyckades')); return; }
    if (data.access_token) {
      setTokens(data.access_token, data.refresh_token);
      showToast('✓ Konto skapat');
      await loadUserDashboard();
    } else {
      showToast('📧 Kolla din e-post för bekräftelse');
    }
  } catch(err) { showToast('Nätverksfel'); }
}

async function webGoogleSignIn() {
  const cleanUrl = window.location.origin + window.location.pathname;
  const redirectTo = cleanUrl + '#konto';
  if (window.location.protocol === 'file:') {
    showToast('❌ Google-inloggning kräver https:// — deploy till GitHub Pages först');
    return;
  }
  // Pre-check: är Google-provider ens aktiverad i Supabase?
  try {
    const pingRes = await fetch(SUPABASE_URL + '/auth/v1/settings', {
      headers: { apikey: SUPABASE_KEY }
    });
    if (!pingRes.ok) {
      showToast('⚠ Supabase svarar inte (status ' + pingRes.status + ')');
      return;
    }
    const settings = await pingRes.json();
    const externalProviders = settings.external || {};
    if (!externalProviders.google) {
      showToast('⚠ Google-provider inte aktiverad i Supabase Dashboard');
      console.warn('Enable Google under Auth → Providers in Supabase.');
      return;
    }
  } catch(e) { console.warn('OAuth pre-check failed:', e); }
  showToast('🔐 Öppnar Google-inloggning...');
  const authUrl = SUPABASE_URL + '/auth/v1/authorize?' + new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo
  }).toString();
  window.location.href = authUrl;
}

async function webResetPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { showToast('Skriv din e-post först'); return; }
  try {
    await fetch(SUPABASE_URL + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email })
    });
    showToast('📧 Reset-länk skickad');
  } catch(err) { showToast('Nätverksfel'); }
}

async function webLogout() {
  try {
    await fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + getToken() }
    });
  } catch(e){}
  clearTokens();
  document.getElementById('kontoDashboard').style.display = 'none';
  document.getElementById('kontoLogin').style.display = 'block';
  updateAuthNavButton(null);
  showToast('✓ Utloggad');
}

// ═══════════════════════════════════════════════════════════
//  GDPR — Dataexport + Konto-radering (artikel 15, 17 & 20)
// ═══════════════════════════════════════════════════════════
async function gdprExportData() {
  if (typeof showToast === 'function') showToast('📦 Samlar in dina data...');
  const bundle = {
    exportedAt: new Date().toISOString(),
    policyVersion: COOKIE_POLICY_VERSION,
    source: 'indoordistance.github.io',
    profile: null,
    throws: [],
    orders: [],
    settings: {},
    localData: {}
  };

  // Hämta från Supabase
  try {
    const token = getToken();
    if (token) {
      const userRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
      });
      if (userRes.ok) bundle.profile = await userRes.json();
    }
  } catch(e) { console.warn('Profile fetch failed:', e); }

  // Lokal data (träningsdata + preferenser sparas främst lokalt)
  try {
    Object.keys(localStorage).filter(k => k.startsWith('id_')).forEach(k => {
      try { bundle.localData[k] = JSON.parse(localStorage.getItem(k)); }
      catch(e) { bundle.localData[k] = localStorage.getItem(k); }
    });
  } catch(e){}

  // Beställningar (lokala spår)
  try {
    const orders = JSON.parse(localStorage.getItem('id_orders') || '[]');
    bundle.orders = orders;
  } catch(e){}

  // Inställningar
  bundle.settings = {
    language: localStorage.getItem('id_lang') || null,
    currency: getActiveCurrency(),
    cookieConsent: getCookieConsent()
  };

  // Ladda ner som JSON
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = 'indoor-distance-mina-data-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (typeof showToast === 'function') showToast('✓ Dina data laddas ner');
}

function gdprStartDelete() {
  const m = document.getElementById('gdprDeleteModal');
  if (!m) return;
  const inp = document.getElementById('gdprConfirmText');
  if (inp) inp.value = '';
  const btn = document.getElementById('gdprConfirmBtn');
  if (btn) { btn.disabled = true; btn.style.opacity = 0.5; }
  m.style.display = 'flex';
}
function gdprCancelDelete() {
  const m = document.getElementById('gdprDeleteModal');
  if (m) m.style.display = 'none';
}

async function gdprConfirmDelete() {
  const btn = document.getElementById('gdprConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Behandlar...'; }

  // Hämta användar-info för notis
  let userInfo = { email: 'okänd', id: 'okänd' };
  try {
    const token = getToken();
    if (token) {
      const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        const u = await r.json();
        userInfo = { email: u.email || 'okänd', id: u.id || 'okänd' };
      }
    }
  } catch(e){}

  // Notisera VD via Formspree (för manuell radering av kvarvarande data inom 30 dagar)
  try {
    await fetch(FORMSPREE_CONTACT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: '🗑️ GDPR konto-radering begärd',
        type: 'gdpr_account_deletion',
        userEmail: userInfo.email,
        userId: userInfo.id,
        requestedAt: new Date().toISOString(),
        instruction: 'Radera all data för denna användare inom 30 dagar (utom bokföringspliktig orderhistorik som ska avidentifieras).'
      })
    });
  } catch(e) { console.warn('Notification failed:', e); }

  // Lokal sanering — radera allt id_-prefix
  try {
    Object.keys(localStorage).filter(k => k.startsWith('id_')).forEach(k => localStorage.removeItem(k));
  } catch(e){}

  // Logga ut
  clearTokens();

  // Visa bekräftelse
  gdprCancelDelete();
  document.getElementById('kontoDashboard').style.display = 'none';
  document.getElementById('kontoLogin').style.display = 'block';
  updateAuthNavButton(null);

  // Stor bekräftelse-modal
  const ok = document.createElement('div');
  ok.className = 'modal-backdrop';
  ok.style.cssText = 'position:fixed;inset:0;background:rgba(8,14,26,0.85);backdrop-filter:blur(14px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  ok.innerHTML = `<div style="background:linear-gradient(180deg,#1A2540,#131D34);border:1px solid rgba(220,208,188,0.30);border-radius:20px;padding:36px;max-width:460px;width:100%;text-align:center">
    <div style="font-size:56px;margin-bottom:14px">✓</div>
    <h2 style="font-family:var(--serif);font-style:italic;font-size:26px;color:var(--text);margin-bottom:10px">Begäran mottagen</h2>
    <p style="font-size:13px;color:var(--text-mute);line-height:1.65;margin-bottom:18px">
      Ditt konto kommer raderas inom <strong style="color:var(--accent)">30 dagar</strong>. Du har loggats ut och dina lokala data är redan borttagna från denna enhet.
    </p>
    <p style="font-size:12px;color:var(--text-mute);line-height:1.55;margin-bottom:22px">
      Vill du ångra dig? Mejla <a href="mailto:info.indoordistance@gmail.com" style="color:var(--accent)">info.indoordistance@gmail.com</a> inom 30 dagar.
    </p>
    <button class="btn-primary" onclick="this.closest('.modal-backdrop').remove(); window.location.href='index.html#hem'">Tillbaka till startsidan</button>
  </div>`;
  document.body.appendChild(ok);
}

window.gdprExportData = gdprExportData;
window.gdprStartDelete = gdprStartDelete;
window.gdprCancelDelete = gdprCancelDelete;
window.gdprConfirmDelete = gdprConfirmDelete;

function handleAuthClick() {
  document.getElementById('konto').scrollIntoView({ behavior: 'smooth' });
}

function updateAuthNavButton(user) {
  const btn = document.getElementById('authNavBtn');
  if (!btn) return;
  if (user) {
    const init = ((user.first_name||'?')[0] + (user.last_name||'?')[0]).toUpperCase();
    btn.classList.add('signed-in');
    btn.innerHTML = `<span class="user-avatar-mini">${init}</span> ${user.first_name || 'Konto'}`;
  } else {
    btn.classList.remove('signed-in');
    btn.textContent = 'Logga in';
  }
}

async function handleOAuthReturn() {
  if (!window.location.hash) return;
  const hash = window.location.hash.substring(1);
  // Check for OAuth error first (provider config issue, user cancelled, etc.)
  if (hash.indexOf('error') !== -1) {
    const params = new URLSearchParams(hash);
    const err = params.get('error_description') || params.get('error') || 'Inloggning misslyckades';
    showToast('❌ ' + decodeURIComponent(err).replace(/\+/g, ' '));
    // Clean URL so error doesn't reappear on refresh
    window.history.replaceState({}, document.title, window.location.pathname + '#konto');
    return;
  }
  if (hash.indexOf('access_token') === -1) return;
  const params = new URLSearchParams(hash);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access) return;
  setTokens(access, refresh);
  // Clean URL but preserve #konto navigation
  window.history.replaceState({}, document.title, window.location.pathname + '#konto');
  showToast('✓ Inloggad via Google');
  await loadUserDashboard();
  // Scroll to account section so user sees the dashboard
  setTimeout(() => {
    const konto = document.getElementById('konto');
    if (konto) konto.scrollIntoView({ behavior: 'smooth' });
  }, 300);
}

let currentUser = null;
let currentThrows = [];

async function loadUserDashboard() {
  const token = getToken();
  if (!token) return;
  try {
    const authRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token }
    });
    if (!authRes.ok) { clearTokens(); return; }
    const authUser = await authRes.json();
    const profileRes = await authedFetch('/rest/v1/users?email=eq.' + encodeURIComponent(authUser.email) + '&select=*');
    const profileRows = await profileRes.json();
    const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : {
      email: authUser.email,
      first_name: (authUser.user_metadata?.given_name || authUser.user_metadata?.full_name?.split(' ')[0] || ''),
      last_name:  (authUser.user_metadata?.family_name || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '')
    };
    currentUser = profile;

    const throwsRes = await authedFetch('/rest/v1/throws?user_email=eq.' + encodeURIComponent(authUser.email) + '&select=*&order=ts.desc&limit=100');
    if (throwsRes.ok) currentThrows = await throwsRes.json();
    else currentThrows = [];

    document.getElementById('kontoLogin').style.display = 'none';
    document.getElementById('kontoDashboard').style.display = 'block';
    updateAuthNavButton(profile);
    renderDashboard();
  } catch(err) {
    console.warn('loadUserDashboard error', err);
    clearTokens();
  }
}

function renderDashboard() {
  if (!currentUser) return;
  const init = ((currentUser.first_name||'?')[0] + (currentUser.last_name||'?')[0]).toUpperCase();
  document.getElementById('acctAvatar').textContent = init;
  document.getElementById('acctName').textContent = (currentUser.first_name || '') + ' ' + (currentUser.last_name || '');
  document.getElementById('acctEmail').textContent = currentUser.email;

  if (currentThrows.length > 0) {
    const best = currentThrows.reduce((a, b) => (a.distance_m||0) > (b.distance_m||0) ? a : b);
    const last10 = currentThrows.slice(0, 10);
    const avgScore = Math.round(last10.reduce((s, t) => s + (t.score || 0), 0) / last10.length);
    document.getElementById('statBest').textContent = (best.distance_m||0).toFixed(1) + ' m';
    document.getElementById('statBestDate').textContent = new Date(best.ts).toLocaleDateString('sv-SE');
    document.getElementById('statCount').textContent = currentThrows.length;
    document.getElementById('statAvg').textContent = avgScore || '–';
  } else {
    document.getElementById('statBest').textContent = '–';
    document.getElementById('statCount').textContent = '0';
    document.getElementById('statAvg').textContent = '–';
  }

  const recent = currentThrows.slice(0, 5);
  const recentEl = document.getElementById('recentThrows');
  if (recent.length === 0) {
    recentEl.innerHTML = '<div style="color:var(--text-mute);font-size:13px;padding:14px;background:var(--surface-2);border-radius:10px;text-align:center">Inga kast än — öppna appen för att börja!</div>';
  } else {
    recentEl.innerHTML = recent.map(t => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:600">${new Date(t.ts).toLocaleDateString('sv-SE')}</div>
          <div style="font-size:11px;color:var(--text-mute);margin-top:2px">${t.angle_deg ? t.angle_deg.toFixed(1) + '° · ' + (t.velocity_ms||0).toFixed(1) + ' m/s' : '–'}</div>
        </div>
        <div style="font-family:var(--serif);font-style:italic;font-size:22px;color:var(--accent)">${(t.distance_m||0).toFixed(1)} m</div>
      </div>`).join('');
  }
  const tableBody = document.getElementById('throwsTableBody');
  if (currentThrows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-mute);padding:24px">Inga kast än</td></tr>';
  } else {
    tableBody.innerHTML = currentThrows.map(t => `
      <tr>
        <td>${new Date(t.ts).toLocaleDateString('sv-SE')}</td>
        <td style="text-transform:capitalize">spjut</td>
        <td class="dist">${(t.distance_m||0).toFixed(1)} m</td>
        <td>${t.angle_deg ? t.angle_deg.toFixed(1) + '°' : '–'}</td>
        <td>${t.velocity_ms ? t.velocity_ms.toFixed(1) + ' m/s' : '–'}</td>
      </tr>`).join('');
  }

  // Orders
  const orders = JSON.parse(localStorage.getItem('id_orders') || '[]');
  const ordersEl = document.getElementById('ordersList');
  if (ordersEl) {
    if (orders.length === 0) {
      ordersEl.innerHTML = '<div style="color:var(--text-mute);font-size:13px;padding:14px;background:var(--surface-2);border-radius:10px;text-align:center">Inga beställningar än</div>';
    } else {
      ordersEl.innerHTML = orders.map(o => `
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-weight:700">Order #${o.orderNum}</div>
            <div style="font-family:var(--serif);font-style:italic;color:var(--accent);font-size:18px">${formatPrice(o.total)}</div>
          </div>
          <div style="font-size:12px;color:var(--text-mute);margin-bottom:6px">${new Date(o.ts).toLocaleString('sv-SE')}</div>
          <div style="font-size:12px;color:var(--text-mute)">${o.items.length} artiklar · ${o.status === 'pending_payment' ? '⏳ Väntar betalning' : '✓ Betald'}</div>
        </div>`).join('');
    }
  }

  document.getElementById('profFn').value = currentUser.first_name || '';
  document.getElementById('profLn').value = currentUser.last_name || '';
  document.getElementById('profAge').value = currentUser.age || '';
  document.getElementById('profHeight').value = currentUser.height_cm || '';
  document.getElementById('profClub').value = currentUser.club || '';
  document.getElementById('subStatus').textContent = currentUser.subscription_status || 'Trial';
  if (currentUser.subscription_renews_at) {
    document.getElementById('subRenews').textContent = 'Förnyas: ' + new Date(currentUser.subscription_renews_at).toLocaleDateString('sv-SE');
  } else if (currentUser.trial_ends_at) {
    document.getElementById('subRenews').textContent = 'Trial slutar: ' + new Date(currentUser.trial_ends_at).toLocaleDateString('sv-SE');
  }
}

function switchAcctTab(tab, btn) {
  document.querySelectorAll('.acct-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.account-menu button[data-tab]').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('acctTab-' + tab);
  if (el) el.style.display = 'block';
  if (btn) btn.classList.add('active');
}

async function saveProfile() {
  if (!currentUser) return;
  const update = {
    first_name: document.getElementById('profFn').value.trim() || null,
    last_name:  document.getElementById('profLn').value.trim() || null,
    age:        parseInt(document.getElementById('profAge').value) || null,
    height_cm:  parseInt(document.getElementById('profHeight').value) || null,
    club:       document.getElementById('profClub').value.trim() || null
  };
  try {
    const res = await authedFetch('/rest/v1/users?email=eq.' + encodeURIComponent(currentUser.email), {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(update)
    });
    if (res.ok) {
      Object.assign(currentUser, update);
      updateAuthNavButton(currentUser);
      showToast('✓ Profil sparad');
    } else showToast('Kunde inte spara');
  } catch(err) { showToast('Nätverksfel'); }
}

// ═══════════════════════════════════════════════════════════
//  FILTER, CONTACT, NEWSLETTER, MISC
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  AI SEARCH — smart fuzzy matching over products + plans + info
// ═══════════════════════════════════════════════════════════
function normaliseText(s) {
  return (s || '').toLowerCase()
    .replace(/[åä]/g,'a').replace(/ö/g,'o')
    .replace(/[^a-z0-9 ]/g,' ')
    .trim();
}

function scoreMatch(query, item) {
  const q = normaliseText(query);
  if (!q) return 0;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  // Pool of searchable text
  const fields = [
    { text: normaliseText(item.name || ''), weight: 3 },
    { text: normaliseText(item.tag || ''),  weight: 2 },
    { text: normaliseText(item.desc || ''), weight: 1 },
    { text: normaliseText((item.keywords || []).join(' ')), weight: 2.5 }
  ];

  let total = 0;
  for (const word of words) {
    let wordScore = 0;
    for (const f of fields) {
      if (!f.text) continue;
      // Exact word boundary match
      const re = new RegExp('(^|\\s)' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)');
      if (re.test(f.text)) { wordScore = Math.max(wordScore, f.weight * 1.5); continue; }
      // Substring match
      if (f.text.includes(word)) { wordScore = Math.max(wordScore, f.weight); continue; }
      // Partial / prefix match
      const tokens = f.text.split(/\s+/);
      for (const tok of tokens) {
        if (tok.startsWith(word) && word.length >= 3) {
          wordScore = Math.max(wordScore, f.weight * 0.7);
          break;
        }
        // Levenshtein-distance "close enough" for typos
        if (word.length >= 4 && Math.abs(tok.length - word.length) <= 2 && lev(tok, word) <= 1) {
          wordScore = Math.max(wordScore, f.weight * 0.5);
          break;
        }
      }
    }
    total += wordScore;
  }
  // Number-based price match: "tröja 350" or "billig under 200"
  const priceMatch = q.match(/(\d{2,4})/);
  if (priceMatch && item.price) {
    const target = parseInt(priceMatch[1]);
    if (Math.abs(item.price - target) <= 50) total += 1.5;
  }
  if (q.includes('billig') || q.includes('cheap')) {
    if (item.price && item.price < 200) total += 1.5;
  }
  if (q.includes('dyr') || q.includes('exclusiv')) {
    if (item.price && item.price > 400) total += 1.5;
  }
  return total;
}

// Levenshtein distance (small implementation)
function lev(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Array(b.length+1).fill(0).map((_,i)=>i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = a[i-1] === b[j-1] ? m[j-1] : 1 + Math.min(m[j-1], m[j], prev);
      m[j-1] = prev; prev = cur;
    }
    m[b.length] = prev;
  }
  return m[b.length];
}

function runSearch(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!resultsEl) return;
  const q = (query || '').trim();
  if (q.length < 1) { resultsEl.classList.remove('open'); return; }

  // Build candidate list
  const items = [
    ...PRODUCTS.map(p => ({ kind:'product', data:p, score: scoreMatch(q, p) })),
    ...PLANS.map(p =>    ({ kind:'plan',    data:p, score: scoreMatch(q, p) })),
    ...INFO_LINKS.map(i =>({ kind:'link',   data:i, score: scoreMatch(q, i) }))
  ].filter(x => x.score > 0.5)
   .sort((a,b) => b.score - a.score)
   .slice(0, 8);

  if (items.length === 0) {
    resultsEl.innerHTML = `<div class="search-empty">Inga träffar för "<strong>${q.replace(/</g,'&lt;')}</strong>". Prova "tröja", "klubbplan", "spjut" eller "kontakt".</div>`;
    resultsEl.classList.add('open');
    return;
  }

  resultsEl.innerHTML = items.map(item => {
    const d = item.data;
    if (item.kind === 'product') {
      return `<div class="search-result" onclick="openProductModal('${d.id}');closeSearch()">
        <div class="search-result-img"><img src="${d.images[0]}" alt=""></div>
        <div class="search-result-info">
          <div class="search-result-name">${d.name}</div>
          <div class="search-result-meta">${d.tag} · Produkt</div>
        </div>
        <div class="search-result-price">${formatPrice(d.price)}</div>
      </div>`;
    }
    if (item.kind === 'plan') {
      return `<div class="search-result" onclick="document.querySelector('${d.href}').scrollIntoView({behavior:'smooth'});closeSearch()">
        <div class="search-result-img" style="background:var(--surface-3)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
        <div class="search-result-info">
          <div class="search-result-name">${d.name}</div>
          <div class="search-result-meta">Prenumeration</div>
        </div>
        <div class="search-result-price">${formatPrice(d.price)}</div>
      </div>`;
    }
    return `<div class="search-result" onclick="location.href='${d.href}';closeSearch()">
      <div class="search-result-img" style="background:var(--surface-3)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></div>
      <div class="search-result-info">
        <div class="search-result-name">${d.name}</div>
        <div class="search-result-meta">Sidan</div>
      </div>
    </div>`;
  }).join('');
  resultsEl.classList.add('open');
}

function closeSearch() {
  const el = document.getElementById('searchResults');
  if (el) el.classList.remove('open');
}

function clearSearch() {
  const inp = document.getElementById('aiSearch');
  if (inp) { inp.value = ''; inp.focus(); }
  closeSearch();
}

function filterProducts(category, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.product-card').forEach(card => {
    const cat = card.getAttribute('data-category');
    card.style.display = (category === 'all' || cat === category) ? '' : 'none';
  });
}

function goToSignup() {
  document.getElementById('konto').scrollIntoView({ behavior: 'smooth' });
}

async function sendContact(e) {
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const msg = document.getElementById('contactMsg').value.trim();
  if (!name || !email || !msg) { showToast('Fyll i alla fält'); return; }

  // Save to local "outbox" so we don't lose it
  const outbox = JSON.parse(localStorage.getItem('id_contact_outbox') || '[]');
  outbox.push({ name, email, msg, ts: Date.now() });
  localStorage.setItem('id_contact_outbox', JSON.stringify(outbox));

  // Disable submit button during send
  const btn = e.target?.querySelector('button[type="submit"]');
  const originalBtnText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Skickar...'; }

  let sentViaFormspree = false;
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        message: msg,
        _replyto: email,
        _subject: `Kontaktformulär från ${name}`,
        page: 'Indoor Distance hemsida'
      })
    });
    if (res.ok) {
      sentViaFormspree = true;
    } else {
      const data = await res.json().catch(() => ({}));
      console.warn('Formspree error:', data);
    }
  } catch (err) {
    console.warn('Formspree network error:', err);
  }

  // Re-enable button
  if (btn) { btn.disabled = false; btn.textContent = originalBtnText; }

  if (sentViaFormspree) {
    // Successfully sent via Formspree
    showAutoReplyModal(name, email);
  } else {
    // Fallback: open mail client with prefilled message
    showToast('📧 Öppnar mailprogrammet som backup...');
    const body = `Från: ${name} <${email}>\n\n${msg}`;
    setTimeout(() => {
      window.open(`mailto:info.indoordistance@gmail.com?subject=Kontaktformulär&body=${encodeURIComponent(body)}`, '_blank');
    }, 600);
    showAutoReplyModal(name, email);
  }

  // Clear form
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactMsg').value = '';
}

async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value.trim();
  if (!email) return;
  // Save to localStorage
  const subs = JSON.parse(localStorage.getItem('id_newsletter') || '[]');
  if (!subs.includes(email)) subs.push(email);
  localStorage.setItem('id_newsletter', JSON.stringify(subs));
  document.getElementById('newsletterEmail').value = '';
  // Also send to Formspree so we actually get notified
  try {
    await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        email,
        message: 'Ny nyhetsbrevsprenumerant',
        _subject: 'Ny nyhetsbrevsprenumerant',
        page: 'Indoor Distance nyhetsbrev'
      })
    });
  } catch (err) { console.warn('Newsletter formspree error:', err); }
  // Show welcome email preview
  showWelcomeEmailModal(email);
}

function showToast(text) {
  let t = document.getElementById('hemsidaToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'hemsidaToast';
    t.style.cssText = `
      position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(20px);
      background:rgba(14,22,38,0.95); color:#F2F2F5;
      padding:13px 22px; border-radius:12px;
      border:1px solid rgba(212,178,106,0.40);
      backdrop-filter:blur(20px);
      font-size:13px; font-weight:600;
      box-shadow:0 12px 32px rgba(0,0,0,0.50), 0 0 24px rgba(212,178,106,0.15);
      z-index:1000; opacity:0;
      transition:opacity .25s ease, transform .25s ease;
      pointer-events:none;
    `;
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2400);
}

// ═══════════════════════════════════════════════════════════
//  SCROLL ANIMATIONS — IntersectionObserver reveals
// ═══════════════════════════════════════════════════════════
let revealObserver = null;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.getAttribute('data-delay') || '0');
          setTimeout(() => entry.target.classList.add('visible'), delay);
          revealObserver.unobserve(entry.target);
          // Count-up animation
          if (entry.target.querySelector('[data-count]') || entry.target.hasAttribute('data-count')) {
            const els = entry.target.hasAttribute('data-count') ? [entry.target] : entry.target.querySelectorAll('[data-count]');
            els.forEach(el => animateCount(el));
          }
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  }
  document.querySelectorAll('.reveal:not(.visible), .reveal-up:not(.visible), .reveal-words:not(.visible)').forEach(el => {
    revealObserver.observe(el);
  });
}

function animateCount(el) {
  const target = parseFloat(el.getAttribute('data-count'));
  const suffix = el.getAttribute('data-suffix') || '';
  const isDecimal = target % 1 !== 0;
  const duration = 1400;
  const startTime = performance.now();
  // Preserve <small> inside if any
  const small = el.querySelector('small');
  const smallHtml = small ? small.outerHTML : '';
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = (target * eased);
    el.innerHTML = (isDecimal ? val.toFixed(1) : Math.floor(val)) + suffix + smallHtml;
    if (progress < 1) requestAnimationFrame(step);
    else el.innerHTML = (isDecimal ? target.toFixed(1) : target) + suffix + smallHtml;
  }
  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════════
//  MAGNETIC BUTTONS + NAV SCROLL EFFECTS
// ═══════════════════════════════════════════════════════════
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x*0.15}px, ${y*0.20}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  VÅR RESA — animated canvas background scene
// ═══════════════════════════════════════════════════════════
function initResaScene() {
  const canvas = document.getElementById('resaBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  let particles = [];   // floating dust
  let spear = null;
  let rafId = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Re-seed
    stars = [];
    for (let i = 0; i < Math.floor(rect.width * rect.height / 8000); i++) {
      stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height * 0.7,
        r: Math.random() * 1.3 + 0.2,
        op: Math.random() * 0.6 + 0.2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
    particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() * 1.8 + 0.4,
        speed: 0.10 + Math.random() * 0.25,
        drift: Math.random() * 0.3 - 0.15,
        op: Math.random() * 0.4 + 0.1
      });
    }
    spear = {
      x: -100, y: rect.height * 0.18,
      angle: -0.3,
      speed: 0.6 + Math.random() * 0.4,
      trail: [],
      delay: 1200 + Math.random() * 5000
    };
  }

  function drawSpear(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Subtle trail
    ctx.strokeStyle = 'rgba(220,208,188,0.10)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-120, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    // Spear body
    ctx.strokeStyle = 'rgba(220,208,188,0.65)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    // Tip
    ctx.fillStyle = 'rgba(232,223,206,0.85)';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -2);
    ctx.lineTo(2, 2);
    ctx.closePath();
    ctx.fill();
    // Tail flex
    ctx.strokeStyle = 'rgba(220,208,188,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-30, -1.5);
    ctx.moveTo(-26, 0);
    ctx.lineTo(-30, 1.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawMountain(rect) {
    // Distant silhouette of mountains/landscape
    const h = rect.height;
    const w = rect.width;
    const baseY = h * 0.78;
    ctx.fillStyle = 'rgba(31,77,138,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= w; x += 18) {
      const y = baseY - (Math.sin(x * 0.005) * 16 + Math.sin(x * 0.012) * 10 + Math.sin(x * 0.025) * 5);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Nearer landscape (running track curve)
    const t2 = h * 0.92;
    ctx.fillStyle = 'rgba(220,208,188,0.04)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, t2);
    for (let x = 0; x <= w; x += 14) {
      const y = t2 - Math.sin(x * 0.008) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  function tick(t) {
    const rect = canvas.parentElement.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Stars
    for (const s of stars) {
      const a = (Math.sin(t * 0.001 * s.twinkleSpeed + s.twinkleOffset) + 1) * 0.5;
      ctx.fillStyle = `rgba(220,208,188,${s.op * (0.4 + a * 0.6)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mountains/landscape
    drawMountain(rect);

    // Floating dust
    for (const p of particles) {
      ctx.fillStyle = `rgba(220,208,188,${p.op})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -5) { p.y = rect.height + 5; p.x = Math.random() * rect.width; }
    }

    // Spear flight (occasional)
    if (spear) {
      spear.delay -= 16;
      if (spear.delay <= 0) {
        spear.x += spear.speed;
        spear.y += Math.sin(spear.x * 0.005) * 0.15;
        spear.angle = -0.3 + Math.sin(spear.x * 0.005) * 0.04;
        // Trail
        spear.trail.push({ x: spear.x, y: spear.y });
        if (spear.trail.length > 30) spear.trail.shift();
        // Draw trail
        ctx.strokeStyle = 'rgba(220,208,188,0.12)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        spear.trail.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        // Draw spear
        drawSpear(spear.x, spear.y, spear.angle);
        if (spear.x > rect.width + 200) {
          // Reset for another flight
          spear.x = -100;
          spear.y = rect.height * (0.1 + Math.random() * 0.3);
          spear.trail = [];
          spear.delay = 4000 + Math.random() * 6000;
          spear.speed = 0.5 + Math.random() * 0.5;
        }
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  rafId = requestAnimationFrame(tick);
}

// Timeline scroll-progress: fills the vertical line based on scroll
function initTimelineProgress() {
  const line = document.getElementById('timelineLine');
  if (!line) return;
  const wrapper = line.parentElement;
  function update() {
    const rect = wrapper.getBoundingClientRect();
    const viewH = window.innerHeight;
    // Progress: 0 when top of timeline reaches center of viewport,
    // 1 when bottom of timeline passes center.
    const center = viewH * 0.5;
    const startY = rect.top;
    const endY = rect.bottom;
    let progress = (center - startY) / (endY - startY);
    progress = Math.max(0, Math.min(1, progress));
    line.style.setProperty('--progress', (progress * 100) + '%');
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initScrollProgress() {
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    document.getElementById('scrollProgress').style.width = pct + '%';
    // Nav scroll state
    const nav = document.getElementById('nav');
    if (h.scrollTop > 80) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

// ═══════════════════════════════════════════════════════════
//  i18n — Multi-language translation system
//  SV (Swedish default), EN, NO, DA, DE, FR
// ═══════════════════════════════════════════════════════════
const LANG_KEY = 'id_lang';
const LANG_FLAGS = { sv:'🇸🇪', en:'🇬🇧', no:'🇳🇴', da:'🇩🇰', de:'🇩🇪', fr:'🇫🇷', es:'🇪🇸', it:'🇮🇹', fi:'🇫🇮', pl:'🇵🇱', nl:'🇳🇱', zh:'🇨🇳' };
const LANG_NAMES = { sv:'Svenska', en:'English', no:'Norsk', da:'Dansk', de:'Deutsch', fr:'Français', es:'Español', it:'Italiano', fi:'Suomi', pl:'Polski', nl:'Nederlands', zh:'中文' };

const TRANSLATIONS = {
  sv: {
    // Trust banner
    'trust.eyebrow':'VETENSKAP. INTE GISSNINGAR.',
    'trust.title':'Varje råd är <span class="grad-text">verifierbar</span>',
    'trust.sub':'Vi bygger på officiella riktlinjer och peer-reviewed forskning. Du kan klicka på varje källa i appen för att verifiera själv.',
    // How it works
    'how.eyebrow':'SÅ FUNKAR DET',
    'how.heading':'Från video till <span class="grad-text">vetenskap</span>',
    'how.sub':'Fyra steg från att du filmar till att du utvecklas.',
    'how.s1.title':'Filma med kameran',
    'how.s1.body':'Stå 25-30m från atleten (eller kortare för sprint). Tryck inspelning. Inga sensorer, ingen extra utrustning.',
    'how.s2.title':'AI analyserar rörelsen',
    'how.s2.body':'Pose-detektion + biomekanik räknar ut vinkel, hastighet, distans/tid och teknikpoäng. Tar ~2 sekunder.',
    'how.s3.title':'Få vetenskaplig feedback',
    'how.s3.body':'Varje förslag citerar källor — RF, SFIF, peer-reviewed studier. Du ser exakt vad som kan förbättras och varför.',
    'how.s4.title':'Utvecklas över tid',
    'how.s4.body':'Spåra progression, sätt mål, klara kurser och samla utmärkelser. AI-coachen anpassar sig efter dig.',
    // Updated FAQ
    'faq.q1':'När lanseras appen?','faq.a1':'Vi lanserar <strong>Q3 2026</strong>. Skriv upp dig på <a href="#newsletter">waitlist</a> för tidig åtkomst + 50% rabatt första året.',
    'faq.q2':'Vilka grenar stöds?','faq.a2':'<strong>Alla friidrottens grenar</strong> — spjut, diskus, slägga, kula, längdhopp, tresteg, höjdhopp, stavhopp, sprint (60-400m), häck, medel- och långdistans, plus mångkamp. Varje gren har egen fysik-modell.',
    'faq.q3':'Hur exakt är AI-mätningen?','faq.a3':'Standardprecisionen är cirka <strong>1,5 meter</strong> i interna tester. Med auto-kalibrering från fotpositioner kan vi komma ner till <strong>~1 meter</strong> felmarginal — på par med dyra mätinstrument.',
    'faq.q4':'Behöver jag speciell utrustning?','faq.a4':'Nej — vilken modern smartphone som helst med kamera fungerar. Inga sensorer eller extra utrustning. AI:n körs delvis på enheten + delvis i molnet för bästa precision.',
    'faq.q5':'Är råden vetenskapligt grundade?','faq.a5':'<strong>Ja, alla råd citerar källor.</strong> Vi bygger på RF (Riksidrottsförbundet), SFIF (Svenska Friidrottsförbundet), World Athletics, ACSM och peer-reviewed studier som Gabbett 2016 (BJSM), Mah 2011 (Stanford) och Bartonietz biomekanik.',
    'faq.q6':'Fungerar appen för nybörjare och elit?','faq.a6':'Ja — innehållet anpassas. Nybörjare får grundtips, mid-level får mer teknisk feedback, elit får avancerad biomekanik. Akademin har grund-, mellan- och avancerade kurser per gren.',
    'faq.q7':'Vad kostar appen?','faq.a7':'Pris meddelas inför lanseringen. <strong>Waitlist-medlemmar får 50% rabatt</strong> första året. Klubbpriser finns med faktura-betalning. Inga bindningstider.',
    'faq.q8':'Vad gör skadeskydds-AI:n?','faq.a8':'Den analyserar mönster i din träningsdata — träningslast (ACWR), tekniska kompensationer, välbefinnande — och varnar vid förhöjd skaderisk. Bygger på BJSM-publicerad forskning som visar 4× skaderisk vid ACWR > 1,5.',
    'faq.q9':'Fungerar appen offline?','faq.a9':'Ja, kärnfunktioner fungerar offline tack vare PWA-teknik. AI-chatten och vissa avancerade analyser kräver internet. Installera appen på hem-skärmen för bästa upplevelse.',
    'faq.q10':'Vilka språk finns tillgängliga?','faq.a10':'Hemsidan finns på 12 språk: svenska, engelska, norska, danska, finska, tyska, holländska, franska, spanska, italienska, polska och kinesiska. Appen släpps initialt på svenska och engelska.',

    'nav.login':'Logga in','nav.home':'Hem','nav.services':'Tjänster','nav.about':'Om oss',
    'nav.pricing':'Priser & Butik','nav.account':'Konto','nav.contact':'Kontakta',
    'hero.badge':'AI-driven kastträning','hero.title1':'Förenkla träningen',
    'hero.title2':'för <span class="grad-text">tränare & ungdomar</span>',
    'hero.lead':'Indoor Distance använder AI och en omfattande databas för spjutträning. Med bara din kamera analyserar appen kastet och ger dig feedback på <strong>hastighet, vinkel och distans</strong> direkt.',
    'hero.ctaPricing':'Se priser','hero.ctaLearn':'Lär dig mer',
    'hero.stat1':'precision idag','hero.stat2':'grenar','hero.stat3':'för full analys',
    'services.eyebrow':'Tjänster','services.heading':'Vad <span class="grad-text">erbjuder vi</span>',
    'services.sub':'Tre saker som gör skillnad — exakthet, enkelhet och tillgänglighet för alla.',
    'services.f1.title':'Exakthet','services.f1.text':'Vårt mål är att vårt mätverktyg ska uppnå maximal noggrannhet. För närvarande ligger precisionen på <strong>1,5 meter</strong> vilket är ovanligt bra. Med kalibrering kan vi gå ner mot 1 meter.',
    'services.f2.title':'Underlätta utlärning','services.f2.text':'Vi förenklar träningen för unga friidrottare och deras tränare. Få omedelbar feedback på <strong>hastighet, vinkel och distans</strong> — bara ett klick bort.',
    'services.f3.title':'Tillgänglighet','services.f3.text':'Indoor Distance är ett verktyg som <strong>alla kan ta del av</strong>. Vi stödjer både nybörjare och tränare i deras utveckling — oavsett klubb eller nivå.',
    'pricing.eyebrow':'Priser','pricing.heading':'Välj ditt <span class="grad-text">paket</span>',
    'pricing.sub':'Tre nivåer × tre perioder. Välj det som passar dig eller klubben.',
    'shop.eyebrow':'Butik','shop.heading':'Indoor Distance <span class="grad-text">merch</span>',
    'shop.sub':'Tröjor, muggar och klistermärken för hela klubben.',
    'filter.all':'Allt','filter.men':'Herr','filter.women':'Dam','filter.youth':'Ungdom',
    'filter.kids':'Småbarn','filter.hoodies':'Huvtröjor','filter.mugs':'Muggar','filter.stickers':'Klistermärken',
    'product.chooseSize':'Välj storlek (obligatoriskt)','product.sizeGuide':'Storleksguide',
    'newsletter.eyebrow':'Nyhetsbrev & Waitlist','newsletter.heading':'Säkra din plats — <span class="grad-text">50&nbsp;% rabatt första året</span>',
    'newsletter.sub':'Bli en av de första friidrottarna att testa Indoor Distance. Vi släpper appen i etapper för att säkra kvaliteten — waitlist-medlemmar går först i kön.',
    'newsletter.badge':'Waitlist öppen — endast inbjudningar Q3 2026',
    'newsletter.benefit1':'<strong>Tidig åtkomst</strong> innan publik lansering',
    'newsletter.benefit2':'<strong>50&nbsp;% rabatt</strong> hela första året',
    'newsletter.benefit3':'<strong>Beta-feedback</strong> — påverka funktioner',
    'newsletter.benefit4':'<strong>Träningstips</strong> från experter — 1 mejl/månad',
    'newsletter.trust1':'GDPR-säker — inga 3:e parter',
    'newsletter.trust2':'Max 1 mejl per månad',
    'newsletter.trust3':'Avregistrera när som helst',
    'newsletter.placeholder':'din@epost.se','newsletter.button':'Säkra min plats',
    'contact.eyebrow':'Kontakta','contact.heading':'Hör <span class="grad-text">av dig</span>',
    'contact.sub':'Frågor om tekniken, samarbeten eller allmänna funderingar? Skicka ett meddelande så svarar vi.',
    'contact.email':'E-post','contact.response':'Svarstid','contact.responseTime':'Inom 24h',
    'contact.name':'Ditt namn','contact.emailPh':'Din e-post','contact.msg':'Skriv ditt meddelande...',
    'contact.send':'Skicka meddelande',
    'order.thanks':'Tack för din beställning!','order.backToShop':'Tillbaka till shoppen',
    'sizeGuide.eyebrow':'Storleksguide','sizeGuide.title':'Hitta rätt storlek',
    'sizeGuide.tip':'Mät dig själv eller jämför med en tröja som passar. Vi rekommenderar måtten nedan i centimeter.',
    'sizeGuide.howto':'Så här mäter du:',
    'sizeGuide.measure.chest':'Bröst/Byst:','sizeGuide.measure.chestText':'Mät runt den bredaste delen av bröstet, under armhålorna.',
    'sizeGuide.measure.waist':'Midja:','sizeGuide.measure.waistText':'Mät runt naveln, där byxorna sitter naturligt.',
    'sizeGuide.measure.length':'Längd:','sizeGuide.measure.lengthText':'Mät från axelsöm till önskad tröjslut (oftast höft).',
    'email.close':'Stäng','email.openMail':'Öppna i mailprogrammet',
    'toast.subscribed':'✓ Tack! Du är nu prenumerant.',
    'toast.langChanged':'✓ Språk ändrat',
    // Plans
    'plan.budget':'Budget','plan.individual':'Individuell','plan.club':'Klubb','plan.popular':'Populär','plan.choose':'Välj plan',
    'plan.month':'1 månad','plan.halfSeason':'Halv säsong','plan.fullSeason':'Hel säsong <em>bäst värde</em>',
    'plan.ads.title':'Med reklam','plan.ads.desc':'Full funktionalitet, men med reklamavbrott. Perfekt för att testa.',
    'plan.personal.title':'Personligt konto','plan.personal.desc':'Helt reklamfri upplevelse. Spara obegränsat med kast.',
    'plan.clubAcc.title':'Klubbkonto','plan.clubAcc.desc':'För klubbar och tränarteam. Inkluderar tränarverktyg och prestanda-analys.',
    // Journey
    'journey.eyebrow':'Vår resa','journey.heading':'Från idé till <span class="grad-text">verklighet</span>',
    'journey.sub':'Så här gick det till — från en skiss på papper till en AI-app som vi förbereder för publik lansering.',
    'journey.m1.year':'2024 · Höst','journey.m1.title':'Idén föds',
    'journey.m1.text':'Två kastentusiaster tröttnar på måttband och stoppur. <em>"Varför finns det ingen app som mäter direkt med kameran?"</em> Första skissen ritas på baksidan av en träningsplan.',
    'journey.m2.year':'2024 · Vinter','journey.m2.title':'Första prototypen',
    'journey.m2.text':'Nätterna spenderas med att bygga den första pose-detektionen. Sjutton testkast på köksgolvet senare fungerar den första versionen — och precis lika dåligt som vi förväntade oss.',
    'journey.m3.year':'2025 · Vår','journey.m3.title':'AI-modellen växer fram',
    'journey.m3.text':'Nätter och helger med pose-detektion, fysik-modeller och TensorFlow. Första versionen ligger 3 meter fel — inte bra nog. Tillbaka till ritbordet, om och om igen.',
    'journey.m4.year':'2025 · Sommar','journey.m4.title':'Precisionsbarriären knäcks',
    'journey.m4.text':'Efter månader av kalibrering, biomekanik och AI-träning når vi 1,5 m precision i interna tester. Auto-kalibrering från fötternas position blir nyckeln. Vi vet att vi har något riktigt.',
    'journey.m5.year':'2025 · Höst','journey.m5.title':'Hela friidrotten',
    'journey.m5.text':'Vi expanderar från fyra kastgrenar till 25+ grenar — spjut, hopp, sprint, häck, distans, mångkamp. Bygger på riktig vetenskap: RF, SFIF, World Athletics och peer-reviewed forskning.',
    'journey.m6.year':'2026 · Idag','journey.m6.title':'Snart lansering',
    'journey.m6.text':'Appen är i interna tester och finslipas inför publik lansering. Skadeskydd-AI, mikro-lektioner, tävlingsläge — allt med källcitat. <strong>Lansering Q3 2026.</strong> Vill du vara med från start? <strong>Skriv upp dig på waitlist.</strong>',
    // About
    'about.eyebrow':'Om oss','about.heading':'Vi brinner för <span class="grad-text">friidrott</span>',
    'about.lead':'Indoor Distance är ett företag som brinner för att förenkla träningen för både tränare och aktiva ungdomar.',
    'about.p1':'Genom att använda artificiell intelligens och en omfattande databas för spjutträning kan man enbart med hjälp av sin kamera utföra en analys och få tillgång till all relevant data.',
    'about.p2':'Vi fokuserar på friidrott — i synnerhet <strong>spjut och diskus</strong> — och vårt mål är att göra teknisk träningsanalys tillgänglig för alla.',
    'about.quote':'"Vi gör verktyg som hjälper ungdomar nå sin fulla potential — utan dyr utrustning."',
    'about.quoteAuthor':'— Teamet på Indoor Distance',
    'about.card.personalBest':'PERSONBÄSTA','about.card.angle':'VINKEL','about.card.speed':'HASTIGHET',
    // FAQ
    'faq.eyebrow':'FAQ','faq.heading':'Vanliga <span class="grad-text">frågor</span>',
    'faq.q1':'Hur exakt är mätningen?',
    'faq.a1':'Standardprecisionen är cirka <strong>1,5 meter</strong>. Med kalibrering (en engångs-mätning med måttband) kan du komma ner till <strong>~1 meter</strong> felmarginal — på par med dyra mätinstrument.',
    'faq.q2':'Vilka grenar stöds?',
    'faq.a2':'Spjut, diskus, slägga och kula. Varje gren har egen fysik-modell anpassad för aerodynamiken (diskus får t.ex. lift-bonus medan slägga är ren tyngd).',
    'faq.q3':'Behöver jag en speciell telefon?',
    'faq.a3':'Nej — vilken modern smartphone som helst med kamera fungerar. Inga sensorer, ingen extra utrustning. Du behöver däremot internet för AI-funktionerna första gången.',
    'faq.q4':'Vad är skillnaden mellan kontotyperna?',
    'faq.a4':'<strong>Med reklam</strong> — full funktion men har reklamavbrott. <strong>Individuell</strong> — reklamfri och obegränsade kast. <strong>Klubb</strong> — alla individuella förmåner + tränarverktyg, möjlighet att följa hela laget och prestandaanalyser per atlet.',
    'faq.q5':'Hur betalar jag?',
    'faq.a5':'Vi tar emot betalning via <strong>Swish (076 396 88 61)</strong>. För klubbar erbjuder vi även faktura — kontakta info.indoordistance@gmail.com.',
    'faq.q6':'Kan jag avsluta när som helst?',
    'faq.a6':'Ja. Säsongprenumerationen löper ut automatiskt och förnyas inte utan ditt godkännande. Inga bindningstider, inga uppsägningstider.',
    'faq.q7':'Vad ingår i frakten av merch?',
    'faq.a7':'Frakt kostar 49 kr inom Sverige och är <strong>gratis vid köp över 500 kr</strong>. Levereras typiskt inom 3-5 arbetsdagar via PostNord.',
    // Testimonials
    'testimonials.eyebrow':'Röster från beta-testare',
    'testimonials.heading':'Vad <span class="grad-text">tidiga användare</span> säger',
    'testimonials.sub':'Citat från klubbar och atleter som har testat appen under utvecklingen.',
    'testimonials.t1.text':'"Helt otroligt verktyg. Min elev gick från 42 till 51 m på en månad efter att vi börjat använda appen. Den direkta feedbacken är guld värd."',
    'testimonials.t1.role':'Tränare, IFK Helsingborg',
    'testimonials.t2.text':'"Som tonåring som tränar på egen hand är det perfekt. Jag ser direkt om vinkeln var rätt eller om jag behöver kasta högre."',
    'testimonials.t2.role':'15 år, Hammarby IF',
    'testimonials.t3.text':'"Vi sparar massor av tid på klubbträningar. Slipper springa fram och tillbaka med måttband. AI-coachen är ett extra par ögon."',
    'testimonials.t3.role':'Huvudtränare, Spårvägens FK',
    // App demo + Konto + Footer
    'appDemo.eyebrow':'I appen','appDemo.heading':'Träna smartare med <span class="grad-text">AI</span>',
    'appDemo.sub':'Indoor Distance-appen mäter din kastteknik i realtid med kameran. Se hur det fungerar — fyra riktiga skärmar nedan.',
    'appDemo.openApp':'Öppna appen →',
    'account.eyebrow':'Konto','account.heading':'Ditt <span class="grad-text">konto</span>',
    'account.sub':'Hantera din profil, se dina kast och prenumeration här.',
    'footer.tagline':'AI-driven kastträning för spjut, diskus, kula och slägga. Av kastare, för kastare.',
    'footer.product':'Produkt','footer.company':'Företag','footer.social':'Sociala','footer.app':'Appen','footer.myAccount':'Mitt konto','footer.voices':'Röster',
    // Trust bar
    'trust.payment':'Säker betalning','trust.paymentSub':'SSL-krypterat · Swish',
    'trust.delivery':'Snabb leverans','trust.deliverySub':'PostNord · 3-5 dgr',
    'trust.returns':'14 dgr ångerrätt','trust.returnsSub':'Gratis retur',
    'trust.shipping':'Fri frakt över 500 kr','trust.shippingSub':'Inom Sverige',
    // Search
    'search.placeholder':'Sök produkt eller plan...',
    'search.askAI':'Fråga AI-assistenten',
    'search.noResults':'Inga träffar — prova "priser" eller "klubb"',
    'ai.assistant':'Fråga AI-assistent',
    'ai.placeholder':'Fråga AI-assistenten — t.ex. "hur betalar jag?", "klubbpris"...',
    'ai.empty':'Skriv en fråga — jag hjälper med info, priser, vägledning',
    // Download
    'download.eyebrow':'Ladda ner','download.heading':'Få Indoor Distance <span class="grad-text">på din enhet</span>',
    'download.sub':'Just nu finns appen som webb-app. iOS och Android är på gång!',
    'download.web.title':'Webb-app','download.web.desc':'Fungerar i alla moderna webbläsare på telefon, surfplatta och dator.',
    'download.web.cta':'Öppna i webbläsare →',
    'download.ios.title':'iOS-app','download.ios.desc':'Native app till iPhone & iPad. Planeras 2026.',
    'download.ios.cta':'Får besked först →',
    'download.android.title':'Android-app','download.android.desc':'Native app till Android. Planeras 2026.',
    'download.android.cta':'Får besked först →',
    'download.pwa.title':'Tips: Installera webbappen som "app"',
    'download.pwa.desc':'Öppna webbappen i Safari/Chrome → Dela → "Lägg till på hemskärm". Då fungerar den nästan som en native app, även offline.',
    'footer.download':'Ladda ner'
  },
  en: {
    // Trust banner
    'trust.eyebrow':'SCIENCE. NOT GUESSES.',
    'trust.title':'Every recommendation is <span class="grad-text">verifiable</span>',
    'trust.sub':'We build on official guidelines and peer-reviewed research. You can click every source in the app to verify yourself.',
    // How it works
    'how.eyebrow':'HOW IT WORKS',
    'how.heading':'From video to <span class="grad-text">science</span>',
    'how.sub':'Four steps from filming to improving.',
    'how.s1.title':'Film with your camera',
    'how.s1.body':'Stand 25-30m from the athlete (or shorter for sprint). Press record. No sensors, no extra equipment needed.',
    'how.s2.title':'AI analyzes the movement',
    'how.s2.body':'Pose detection + biomechanics calculate angle, speed, distance/time and technique score. Takes ~2 seconds.',
    'how.s3.title':'Get scientific feedback',
    'how.s3.body':'Every suggestion cites sources — RF, SFIF, peer-reviewed studies. You see exactly what to improve and why.',
    'how.s4.title':'Develop over time',
    'how.s4.body':'Track progress, set goals, complete courses, and earn achievements. The AI coach adapts to you.',
    // Updated FAQ
    'faq.q1':'When does the app launch?','faq.a1':'We launch <strong>Q3 2026</strong>. Sign up for the <a href="#newsletter">waitlist</a> for early access + 50% off the first year.',
    'faq.q2':'Which events are supported?','faq.a2':'<strong>All athletics events</strong> — javelin, discus, hammer, shot put, long jump, triple jump, high jump, pole vault, sprint (60-400m), hurdles, middle and long distance, plus combined events. Each event has its own physics model.',
    'faq.q3':'How accurate is the AI measurement?','faq.a3':'Standard precision is around <strong>1.5 meters</strong> in internal tests. With auto-calibration from foot positions we can reach <strong>~1 meter</strong> margin of error — on par with expensive measurement tools.',
    'faq.q4':'Do I need special equipment?','faq.a4':'No — any modern smartphone with a camera works. No sensors or extra equipment. The AI runs partially on-device and partially in the cloud for best precision.',
    'faq.q5':'Is the advice scientifically grounded?','faq.a5':'<strong>Yes, all advice cites sources.</strong> We build on RF (Swedish Sports Confederation), SFIF (Swedish Athletics), World Athletics, ACSM, and peer-reviewed studies like Gabbett 2016 (BJSM), Mah 2011 (Stanford), and Bartonietz biomechanics.',
    'faq.q6':'Does it work for beginners and elite?','faq.a6':'Yes — content adapts. Beginners get fundamentals, mid-level gets more technical feedback, elite gets advanced biomechanics. The Academy has beginner, intermediate and advanced courses per event.',
    'faq.q7':'What does the app cost?','faq.a7':'Price will be announced before launch. <strong>Waitlist members get 50% off</strong> the first year. Club pricing available with invoice billing. No lock-in periods.',
    'faq.q8':'What does the injury prevention AI do?','faq.a8':'It analyzes patterns in your training data — training load (ACWR), technical compensations, wellbeing — and warns of elevated injury risk. Built on BJSM-published research showing 4× injury risk at ACWR > 1.5.',
    'faq.q9':'Does the app work offline?','faq.a9':'Yes, core features work offline thanks to PWA technology. AI chat and some advanced analyses require internet. Install the app on your home screen for the best experience.',
    'faq.q10':'Which languages are available?','faq.a10':'The website is available in 12 languages: Swedish, English, Norwegian, Danish, Finnish, German, Dutch, French, Spanish, Italian, Polish and Chinese. The app launches initially in Swedish and English.',

    'nav.login':'Sign in','nav.home':'Home','nav.services':'Services','nav.about':'About',
    'nav.pricing':'Pricing & Shop','nav.account':'Account','nav.contact':'Contact',
    'hero.badge':'AI-driven throw training','hero.title1':'Simplify training',
    'hero.title2':'for <span class="grad-text">coaches & youth</span>',
    'hero.lead':'Indoor Distance uses AI and an extensive database for javelin training. With just your camera, the app analyzes the throw and gives you feedback on <strong>speed, angle and distance</strong> instantly.',
    'hero.ctaPricing':'See pricing','hero.ctaLearn':'Learn more',
    'hero.stat1':'precision today','hero.stat2':'disciplines','hero.stat3':'for full analysis',
    'services.eyebrow':'Services','services.heading':'What we <span class="grad-text">offer</span>',
    'services.sub':'Three things that make a difference — accuracy, simplicity and accessibility for all.',
    'services.f1.title':'Accuracy','services.f1.text':'Our goal is for our measurement tool to achieve maximum precision. Currently the precision is <strong>1.5 meters</strong>, which is exceptionally good. With calibration we can go down to 1 meter.',
    'services.f2.title':'Easier learning','services.f2.text':'We simplify training for young athletes and their coaches. Get instant feedback on <strong>speed, angle and distance</strong> — just one click away.',
    'services.f3.title':'Accessibility','services.f3.text':'Indoor Distance is a tool that <strong>everyone can use</strong>. We support both beginners and coaches in their development — regardless of club or level.',
    'pricing.eyebrow':'Pricing','pricing.heading':'Choose your <span class="grad-text">plan</span>',
    'pricing.sub':'Three tiers × three periods. Pick what fits you or your club.',
    'shop.eyebrow':'Shop','shop.heading':'Indoor Distance <span class="grad-text">merch</span>',
    'shop.sub':'T-shirts, mugs and stickers for the whole club.',
    'filter.all':'All','filter.men':'Men','filter.women':'Women','filter.youth':'Youth',
    'filter.kids':'Kids','filter.hoodies':'Hoodies','filter.mugs':'Mugs','filter.stickers':'Stickers',
    'product.chooseSize':'Choose size (required)','product.sizeGuide':'Size guide',
    'newsletter.eyebrow':'Newsletter & Waitlist','newsletter.heading':'Reserve your spot — <span class="grad-text">50% off first year</span>',
    'newsletter.sub':'Be one of the first athletes to test Indoor Distance. We\'re rolling out the app in stages to ensure quality — waitlist members go first in line.',
    'newsletter.badge':'Waitlist open — invitation only Q3 2026',
    'newsletter.benefit1':'<strong>Early access</strong> before public launch',
    'newsletter.benefit2':'<strong>50% off</strong> the entire first year',
    'newsletter.benefit3':'<strong>Beta feedback</strong> — shape the features',
    'newsletter.benefit4':'<strong>Training tips</strong> from experts — 1 email/month',
    'newsletter.trust1':'GDPR-safe — no 3rd parties',
    'newsletter.trust2':'Max 1 email per month',
    'newsletter.trust3':'Unsubscribe anytime',
    'newsletter.placeholder':'your@email.com','newsletter.button':'Reserve my spot',
    'contact.eyebrow':'Contact','contact.heading':'Get <span class="grad-text">in touch</span>',
    'contact.sub':'Questions about the technology, partnerships or general thoughts? Send a message and we\'ll reply.',
    'contact.email':'Email','contact.response':'Response time','contact.responseTime':'Within 24h',
    'contact.name':'Your name','contact.emailPh':'Your email','contact.msg':'Write your message...',
    'contact.send':'Send message',
    'order.thanks':'Thanks for your order!','order.backToShop':'Back to the shop',
    'sizeGuide.eyebrow':'Size guide','sizeGuide.title':'Find your size',
    'sizeGuide.tip':'Measure yourself or compare with a shirt that fits. Measurements below are in centimeters.',
    'sizeGuide.howto':'How to measure:',
    'sizeGuide.measure.chest':'Chest/Bust:','sizeGuide.measure.chestText':'Measure around the widest part of your chest, under the arms.',
    'sizeGuide.measure.waist':'Waist:','sizeGuide.measure.waistText':'Measure around your navel, where pants naturally sit.',
    'sizeGuide.measure.length':'Length:','sizeGuide.measure.lengthText':'Measure from shoulder seam to desired shirt end (usually hip).',
    'email.close':'Close','email.openMail':'Open in mail client',
    'toast.subscribed':'✓ Thanks! You\'re now subscribed.',
    'toast.langChanged':'✓ Language changed',
    'plan.budget':'Budget','plan.individual':'Individual','plan.club':'Club','plan.popular':'Popular','plan.choose':'Choose plan',
    'plan.month':'1 month','plan.halfSeason':'Half season','plan.fullSeason':'Full season <em>best value</em>',
    'plan.ads.title':'With ads','plan.ads.desc':'Full features but with ad breaks. Perfect for trying it out.',
    'plan.personal.title':'Personal account','plan.personal.desc':'Completely ad-free. Save unlimited throws.',
    'plan.clubAcc.title':'Club account','plan.clubAcc.desc':'For clubs and coaching teams. Includes coach tools and performance analysis.',
    'journey.eyebrow':'Our journey','journey.heading':'From idea to <span class="grad-text">reality</span>',
    'journey.sub':'Here\'s how it went — from a sketch on paper to an AI app we\'re preparing for public launch.',
    'journey.m1.year':'2024 · Fall','journey.m1.title':'The idea is born',
    'journey.m1.text':'Two throw enthusiasts get tired of measuring tape and stopwatches. <em>"Why is there no app that measures directly with the camera?"</em> First sketch on the back of a training plan.',
    'journey.m2.year':'2024 · Winter','journey.m2.title':'First prototype',
    'journey.m2.text':'Nights spent building the first pose detection. After seventeen test throws on the kitchen floor, the first version works — and just as poorly as we expected.',
    'journey.m3.year':'2025 · Spring','journey.m3.title':'The AI model takes shape',
    'journey.m3.text':'Nights and weekends with pose detection, physics models and TensorFlow. The first version is off by 3 meters — not good enough. Back to the drawing board, again and again.',
    'journey.m4.year':'2025 · Summer','journey.m4.title':'Breaking the precision barrier',
    'journey.m4.text':'After months of calibration, biomechanics and AI training, we reach 1.5 m precision in internal tests. Auto-calibration from foot position becomes the key. We know we have something real.',
    'journey.m5.year':'2025 · Fall','journey.m5.title':'All of athletics',
    'journey.m5.text':'We expand from four throwing events to 25+ disciplines — javelin, jumps, sprints, hurdles, distance, combined. Built on real science: RF, SFIF, World Athletics and peer-reviewed research.',
    'journey.m6.year':'2026 · Today','journey.m6.title':'Launching soon',
    'journey.m6.text':'The app is in internal testing and being polished for public launch. Injury prevention AI, micro-lessons, competition mode — all with cited sources. <strong>Launch Q3 2026.</strong> Want to be part from the start? <strong>Sign up for the waitlist.</strong>',
    'about.eyebrow':'About us','about.heading':'We\'re passionate about <span class="grad-text">athletics</span>',
    'about.lead':'Indoor Distance is a company passionate about simplifying training for both coaches and young athletes.',
    'about.p1':'Using AI and an extensive javelin training database, you can do a full analysis using only your camera and access all relevant data.',
    'about.p2':'We focus on athletics — particularly <strong>javelin and discus</strong> — and our goal is to make technical training analysis accessible to everyone.',
    'about.quote':'"We build tools that help young athletes reach their full potential — without expensive equipment."',
    'about.quoteAuthor':'— The Indoor Distance team',
    'about.card.personalBest':'PERSONAL BEST','about.card.angle':'ANGLE','about.card.speed':'SPEED',
    'faq.eyebrow':'FAQ','faq.heading':'Common <span class="grad-text">questions</span>',
    'faq.q1':'How accurate is the measurement?',
    'faq.a1':'Standard precision is about <strong>1.5 meters</strong>. With calibration (one-time measurement with tape) you can get to <strong>~1 meter</strong> error margin — on par with expensive equipment.',
    'faq.q2':'Which disciplines are supported?',
    'faq.a2':'Javelin, discus, hammer and shot put. Each event has its own physics model adapted for aerodynamics (discus gets a lift bonus, hammer is pure weight, etc.).',
    'faq.q3':'Do I need a special phone?',
    'faq.a3':'No — any modern smartphone with a camera works. No sensors, no extra equipment. You do need internet for the AI features the first time.',
    'faq.q4':'What\'s the difference between account types?',
    'faq.a4':'<strong>With ads</strong> — full functionality but with ad breaks. <strong>Individual</strong> — ad-free and unlimited throws. <strong>Club</strong> — all individual perks + coach tools, ability to follow the whole team and performance analysis per athlete.',
    'faq.q5':'How do I pay?',
    'faq.a5':'We accept payment via <strong>Swish (076 396 88 61)</strong>. For clubs we also offer invoicing — contact info.indoordistance@gmail.com.',
    'faq.q6':'Can I cancel any time?',
    'faq.a6':'Yes. Seasonal subscriptions expire automatically and won\'t renew without your consent. No lock-in, no cancellation period.',
    'faq.q7':'What\'s included in merch shipping?',
    'faq.a7':'Shipping costs 49 SEK within Sweden and is <strong>free over 500 SEK</strong>. Typically delivered within 3-5 business days via PostNord.',
    'testimonials.eyebrow':'Voices from beta testers',
    'testimonials.heading':'What <span class="grad-text">early users</span> say',
    'testimonials.sub':'Quotes from clubs and athletes who have tested the app during development.',
    'testimonials.t1.text':'"Incredible tool. My student went from 42 to 51 m in a month after we started using the app. The instant feedback is worth its weight in gold."',
    'testimonials.t1.role':'Coach, IFK Helsingborg',
    'testimonials.t2.text':'"As a teen training on my own, it\'s perfect. I can see right away if the angle was right or if I need to throw higher."',
    'testimonials.t2.role':'15 years, Hammarby IF',
    'testimonials.t3.text':'"We save tons of time at club practice. No more running back and forth with measuring tape. The AI coach is an extra pair of eyes."',
    'testimonials.t3.role':'Head coach, Spårvägens FK',
    'appDemo.eyebrow':'In the app','appDemo.heading':'Train smarter with <span class="grad-text">AI</span>',
    'appDemo.sub':'The Indoor Distance app measures your throw technique in real time with the camera. See how it works — four real screens below.',
    'appDemo.openApp':'Open the app →',
    'account.eyebrow':'Account','account.heading':'Your <span class="grad-text">account</span>',
    'account.sub':'Manage your profile, see your throws and subscription here.',
    'footer.tagline':'AI-driven throw training for javelin, discus, shot put and hammer. By throwers, for throwers.',
    'footer.product':'Product','footer.company':'Company','footer.social':'Social','footer.app':'The app','footer.myAccount':'My account','footer.voices':'Voices',
    'trust.payment':'Secure payment','trust.paymentSub':'SSL encrypted · Swish',
    'trust.delivery':'Fast delivery','trust.deliverySub':'PostNord · 3-5 days',
    'trust.returns':'14 days returns','trust.returnsSub':'Free return',
    'trust.shipping':'Free shipping over 500 SEK','trust.shippingSub':'Within Sweden',
    'search.placeholder':'Search products, plans or questions...',
    'search.askAI':'Ask AI coach',
    'search.noResults':'No matches — try "pricing" or "club"',
    'download.eyebrow':'Download','download.heading':'Get Indoor Distance <span class="grad-text">on your device</span>',
    'download.sub':'For now the app is web-based. iOS and Android coming soon!',
    'download.web.title':'Web App','download.web.desc':'Works in any modern browser on phone, tablet and desktop.',
    'download.web.cta':'Open in browser →',
    'download.ios.title':'iOS App','download.ios.desc':'Native iPhone & iPad app. Planned 2026.',
    'download.ios.cta':'Get notified first →',
    'download.android.title':'Android App','download.android.desc':'Native Android app. Planned 2026.',
    'download.android.cta':'Get notified first →',
    'download.pwa.title':'Tip: Install the web app like an app',
    'download.pwa.desc':'Open in Safari/Chrome → Share → "Add to Home Screen". Then it works almost like a native app, even offline.',
    'footer.download':'Download'
  },
  no: {
    'nav.login':'Logg inn','nav.home':'Hjem','nav.services':'Tjenester','nav.about':'Om oss',
    'nav.pricing':'Priser & Butikk','nav.account':'Konto','nav.contact':'Kontakt',
    'hero.badge':'AI-drevet kasttrening','hero.title1':'Forenkle treningen',
    'hero.title2':'for <span class="grad-text">trenere & ungdom</span>',
    'hero.lead':'Indoor Distance bruker AI og en omfattende database for spydtrening. Med bare kameraet ditt analyserer appen kastet og gir deg tilbakemelding på <strong>hastighet, vinkel og avstand</strong> direkte.',
    'hero.ctaPricing':'Se priser','hero.ctaLearn':'Lær mer',
    'hero.stat1':'presisjon i dag','hero.stat2':'grener','hero.stat3':'for full analyse',
    'services.eyebrow':'Tjenester','services.heading':'Hva vi <span class="grad-text">tilbyr</span>',
    'services.sub':'Tre ting som utgjør en forskjell — presisjon, enkelhet og tilgjengelighet for alle.',
    'services.f1.title':'Presisjon','services.f1.text':'Vårt mål er at måleverktøyet skal oppnå maksimal nøyaktighet. For øyeblikket er presisjonen <strong>1,5 meter</strong> — uvanlig bra. Med kalibrering kan vi gå ned mot 1 meter.',
    'services.f2.title':'Enklere læring','services.f2.text':'Vi forenkler treningen for unge friidrettsutøvere og trenerne deres. Få umiddelbar tilbakemelding på <strong>hastighet, vinkel og avstand</strong> — bare ett klikk unna.',
    'services.f3.title':'Tilgjengelighet','services.f3.text':'Indoor Distance er et verktøy som <strong>alle kan bruke</strong>. Vi støtter både nybegynnere og trenere i utviklingen — uansett klubb eller nivå.',
    'pricing.eyebrow':'Priser','pricing.heading':'Velg din <span class="grad-text">pakke</span>',
    'pricing.sub':'Tre nivåer × tre perioder. Velg det som passer deg eller klubben.',
    'shop.eyebrow':'Butikk','shop.heading':'Indoor Distance <span class="grad-text">merch</span>',
    'shop.sub':'T-skjorter, krus og klistremerker for hele klubben.',
    'filter.all':'Alt','filter.men':'Herre','filter.women':'Dame','filter.youth':'Ungdom',
    'filter.kids':'Småbarn','filter.hoodies':'Hettegensere','filter.mugs':'Krus','filter.stickers':'Klistremerker',
    'product.chooseSize':'Velg størrelse (obligatorisk)','product.sizeGuide':'Størrelsesguide',
    'newsletter.eyebrow':'Nyhetsbrev & Venteliste','newsletter.heading':'Sikre din plass — <span class="grad-text">50 % rabatt første året</span>',
    'newsletter.sub':'Bli en av de første friidrettsutøverne som tester Indoor Distance. Vi lanserer appen i etapper for å sikre kvaliteten — ventelistemedlemmer går først.',
    'newsletter.badge':'Venteliste åpen — kun invitasjon Q3 2026',
    'newsletter.benefit1':'<strong>Tidlig tilgang</strong> før offentlig lansering',
    'newsletter.benefit2':'<strong>50 % rabatt</strong> hele første året',
    'newsletter.benefit3':'<strong>Beta-tilbakemelding</strong> — påvirk funksjoner',
    'newsletter.benefit4':'<strong>Treningstips</strong> fra eksperter — 1 e-post/måned',
    'newsletter.trust1':'GDPR-trygg — ingen 3. parter',
    'newsletter.trust2':'Maks 1 e-post per måned',
    'newsletter.trust3':'Avmeld når som helst',
    'newsletter.placeholder':'din@epost.no','newsletter.button':'Sikre min plass',
    'contact.eyebrow':'Kontakt','contact.heading':'Ta <span class="grad-text">kontakt</span>',
    'contact.sub':'Spørsmål om teknologien, samarbeid eller generelle tanker? Send en melding så svarer vi.',
    'contact.email':'E-post','contact.response':'Svartid','contact.responseTime':'Innen 24t',
    'contact.name':'Ditt navn','contact.emailPh':'Din e-post','contact.msg':'Skriv meldingen din...',
    'contact.send':'Send melding',
    'order.thanks':'Takk for bestillingen!','order.backToShop':'Tilbake til butikken',
    'sizeGuide.eyebrow':'Størrelsesguide','sizeGuide.title':'Finn riktig størrelse',
    'sizeGuide.tip':'Mål deg selv eller sammenlign med en genser som passer. Målene under er i centimeter.',
    'sizeGuide.howto':'Slik måler du:',
    'sizeGuide.measure.chest':'Bryst:','sizeGuide.measure.chestText':'Mål rundt den bredeste delen av brystet, under armhulene.',
    'sizeGuide.measure.waist':'Midje:','sizeGuide.measure.waistText':'Mål rundt navlen, der buksene sitter naturlig.',
    'sizeGuide.measure.length':'Lengde:','sizeGuide.measure.lengthText':'Mål fra skuldersøm til ønsket gensereslutt (vanligvis hofte).',
    'email.close':'Lukk','email.openMail':'Åpne i e-postprogram',
    'toast.subscribed':'✓ Takk! Du er nå abonnent.',
    'toast.langChanged':'✓ Språk endret',
    'plan.budget':'Budsjett','plan.individual':'Individuell','plan.club':'Klubb','plan.popular':'Populær','plan.choose':'Velg plan',
    'plan.month':'1 måned','plan.halfSeason':'Halv sesong','plan.fullSeason':'Hel sesong <em>beste verdi</em>',
    'plan.ads.title':'Med reklame','plan.ads.desc':'Full funksjonalitet, men med reklamepauser. Perfekt for å teste.',
    'plan.personal.title':'Personlig konto','plan.personal.desc':'Helt reklamefri opplevelse. Lagre ubegrenset med kast.',
    'plan.clubAcc.title':'Klubbkonto','plan.clubAcc.desc':'For klubber og trenerteam. Inkluderer trenerverktøy og ytelsesanalyse.',
    'journey.eyebrow':'Vår reise','journey.heading':'Fra idé til <span class="grad-text">virkelighet</span>',
    'journey.sub':'Slik gikk det — fra en skisse på papir til en AI-app vi forbereder for offentlig lansering.',
    'journey.m1.year':'2024 · Høst','journey.m1.title':'Ideen blir født',
    'journey.m1.text':'To kastentusiaster blir lei av målebånd og stoppeklokker. <em>"Hvorfor finnes det ingen app som måler direkte med kameraet?"</em>',
    'journey.m2.year':'2024 · Vinter','journey.m2.title':'Første prototype',
    'journey.m2.text':'Nettene tilbringes med å bygge den første pose-deteksjonen. Etter sytten testkast på kjøkkengulvet fungerer første versjon.',
    'journey.m3.year':'2025 · Vår','journey.m3.title':'Første klubb sier ja',
    'journey.m3.text':'En lokal friidrettsklubb tar oss inn for testing. Trenerne sammenligner tallene våre med målebånd — vi bommer med 3 meter.',
    'journey.m4.year':'2025 · Sommer','journey.m4.title':'1,5 m presisjon oppnådd',
    'journey.m4.text':'Etter måneder med kalibrering, fysikk og AI-trening når vi den magiske grensen. Klubben validerer — tallene stemmer.',
    'journey.m5.year':'2025 · Høst','journey.m5.title':'Beta-lansering',
    'journey.m5.text':'Indoor Distance slippes i beta med fire grener: spyd, diskos, slegge og kule. Helt gratis under utvikling.',
    'journey.m6.year':'2026 · I dag','journey.m6.title':'Her er vi nå',
    'journey.m6.text':'Appen er i beta og utvikles uke for uke — AI-coach, klubbhåndtering, treningskalender. Vi forbereder lansering i <strong>2026</strong>.',
    'about.eyebrow':'Om oss','about.heading':'Vi brenner for <span class="grad-text">friidrett</span>',
    'about.lead':'Indoor Distance er et selskap som brenner for å forenkle treningen for både trenere og aktive ungdommer.',
    'about.p1':'Ved å bruke AI og en omfattende database for spydtrening kan man bare med kameraet utføre en analyse og få tilgang til all relevant data.',
    'about.p2':'Vi fokuserer på friidrett — særlig <strong>spyd og diskos</strong> — og målet vårt er å gjøre teknisk treningsanalyse tilgjengelig for alle.',
    'about.quote':'"Vi lager verktøy som hjelper unge nå sitt fulle potensial — uten dyrt utstyr."',
    'about.quoteAuthor':'— Indoor Distance-teamet',
    'about.card.personalBest':'PERSONLIG BESTE','about.card.angle':'VINKEL','about.card.speed':'HASTIGHET',
    'faq.eyebrow':'FAQ','faq.heading':'Vanlige <span class="grad-text">spørsmål</span>',
    'faq.q1':'Hvor nøyaktig er målingen?','faq.a1':'Standardpresisjon er ca <strong>1,5 meter</strong>. Med kalibrering kan du komme ned til <strong>~1 meter</strong>.',
    'faq.q2':'Hvilke grener støttes?','faq.a2':'Spyd, diskos, slegge og kule. Hver gren har egen fysikkmodell.',
    'faq.q3':'Trenger jeg en spesiell telefon?','faq.a3':'Nei — en hvilken som helst moderne smarttelefon med kamera fungerer.',
    'faq.q4':'Hva er forskjellen mellom kontotypene?','faq.a4':'<strong>Med reklame</strong>, <strong>Individuell</strong> (reklamefri), eller <strong>Klubb</strong> (med trenerverktøy).',
    'faq.q5':'Hvordan betaler jeg?','faq.a5':'Via <strong>Swish (076 396 88 61)</strong>. Klubber kan også få faktura.',
    'faq.q6':'Kan jeg avslutte når som helst?','faq.a6':'Ja. Abonnementet fornyes ikke uten ditt samtykke. Ingen bindingstid.',
    'faq.q7':'Hva inkluderer frakt på merch?','faq.a7':'Frakt 49 SEK innen Sverige, <strong>gratis over 500 SEK</strong>. 3-5 virkedager via PostNord.',
    'testimonials.eyebrow':'Stemmer fra beta-testere',
    'testimonials.heading':'Hva <span class="grad-text">tidlige brukere</span> sier',
    'testimonials.sub':'Sitater fra klubber og utøvere som har testet appen.',
    'testimonials.t1.text':'"Utrolig verktøy. Eleven min gikk fra 42 til 51 m på en måned."',
    'testimonials.t1.role':'Trener, IFK Helsingborg',
    'testimonials.t2.text':'"Som tenåring som trener alene er det perfekt. Jeg ser direkte om vinkelen var riktig."',
    'testimonials.t2.role':'15 år, Hammarby IF',
    'testimonials.t3.text':'"Vi sparer masse tid på klubbtreninger. AI-coachen er et ekstra par øyne."',
    'testimonials.t3.role':'Hovedtrener, Spårvägens FK',
    'appDemo.eyebrow':'I appen','appDemo.heading':'Tren smartere med <span class="grad-text">AI</span>',
    'appDemo.sub':'Indoor Distance-appen måler kastteknikken din i sanntid med kameraet.',
    'appDemo.openApp':'Åpne appen →',
    'account.eyebrow':'Konto','account.heading':'Din <span class="grad-text">konto</span>',
    'account.sub':'Administrer profilen din, se kastene dine og abonnementet her.',
    'footer.tagline':'AI-drevet kasttrening for spyd, diskos, kule og slegge. Av kastere, for kastere.',
    'footer.product':'Produkt','footer.company':'Selskap','footer.social':'Sosialt','footer.app':'Appen','footer.myAccount':'Min konto','footer.voices':'Stemmer',
    'trust.payment':'Sikker betaling','trust.paymentSub':'SSL-kryptert · Swish',
    'trust.delivery':'Rask levering','trust.deliverySub':'PostNord · 3-5 dager',
    'trust.returns':'14 dgr angrerett','trust.returnsSub':'Gratis retur',
    'trust.shipping':'Fri frakt over 500 SEK','trust.shippingSub':'Innen Sverige',
    'search.placeholder':'Søk produkter, planer eller spørsmål...',
    'search.askAI':'Spør AI-coach','search.noResults':'Ingen treff'
  },
  da: {
    'nav.login':'Log ind','nav.home':'Hjem','nav.services':'Tjenester','nav.about':'Om os',
    'nav.pricing':'Priser & Butik','nav.account':'Konto','nav.contact':'Kontakt',
    'hero.badge':'AI-drevet kasttræning','hero.title1':'Forenkle træningen',
    'hero.title2':'for <span class="grad-text">trænere & unge</span>',
    'hero.lead':'Indoor Distance bruger AI og en omfattende database til spydtræning. Med bare dit kamera analyserer appen kastet og giver dig feedback på <strong>hastighed, vinkel og afstand</strong> med det samme.',
    'hero.ctaPricing':'Se priser','hero.ctaLearn':'Lær mere',
    'hero.stat1':'præcision i dag','hero.stat2':'grene','hero.stat3':'for fuld analyse',
    'services.eyebrow':'Tjenester','services.heading':'Hvad vi <span class="grad-text">tilbyder</span>',
    'services.sub':'Tre ting der gør en forskel — præcision, enkelhed og tilgængelighed for alle.',
    'services.f1.title':'Præcision','services.f1.text':'Vores mål er at vores måleværktøj skal opnå maksimal nøjagtighed. I øjeblikket er præcisionen <strong>1,5 meter</strong>, hvilket er usædvanligt godt.',
    'services.f2.title':'Lettere læring','services.f2.text':'Vi forenkler træningen for unge friidrætsudøvere og deres trænere. Få øjeblikkelig feedback på <strong>hastighed, vinkel og afstand</strong>.',
    'services.f3.title':'Tilgængelighed','services.f3.text':'Indoor Distance er et værktøj som <strong>alle kan bruge</strong>. Vi støtter både begyndere og trænere i deres udvikling.',
    'pricing.eyebrow':'Priser','pricing.heading':'Vælg din <span class="grad-text">pakke</span>',
    'pricing.sub':'Tre niveauer × tre perioder. Vælg det der passer dig eller klubben.',
    'shop.eyebrow':'Butik','shop.heading':'Indoor Distance <span class="grad-text">merch</span>',
    'shop.sub':'T-shirts, krus og klistermærker til hele klubben.',
    'filter.all':'Alt','filter.men':'Herre','filter.women':'Dame','filter.youth':'Ungdom',
    'filter.kids':'Småbørn','filter.hoodies':'Hættetrøjer','filter.mugs':'Krus','filter.stickers':'Klistermærker',
    'product.chooseSize':'Vælg størrelse (obligatorisk)','product.sizeGuide':'Størrelsesguide',
    'newsletter.eyebrow':'Nyhedsbrev & Venteliste','newsletter.heading':'Sikre din plads — <span class="grad-text">50 % rabat første år</span>',
    'newsletter.sub':'Bliv en af de første atleter til at teste Indoor Distance. Vi lancerer appen i etaper for at sikre kvaliteten — ventelistemedlemmer går først.',
    'newsletter.badge':'Venteliste åben — kun invitation Q3 2026',
    'newsletter.benefit1':'<strong>Tidlig adgang</strong> før offentlig lancering',
    'newsletter.benefit2':'<strong>50 % rabat</strong> hele første år',
    'newsletter.benefit3':'<strong>Beta-feedback</strong> — påvirk funktioner',
    'newsletter.benefit4':'<strong>Træningstips</strong> fra eksperter — 1 mail/måned',
    'newsletter.trust1':'GDPR-sikker — ingen 3. parter',
    'newsletter.trust2':'Maks 1 mail om måneden',
    'newsletter.trust3':'Afmeld når som helst',
    'newsletter.placeholder':'din@email.dk','newsletter.button':'Sikre min plads',
    'contact.eyebrow':'Kontakt','contact.heading':'Tag <span class="grad-text">kontakt</span>',
    'contact.sub':'Spørgsmål om teknologien, samarbejde eller generelle tanker? Send en besked, så svarer vi.',
    'contact.email':'E-mail','contact.response':'Svartid','contact.responseTime':'Inden for 24t',
    'contact.name':'Dit navn','contact.emailPh':'Din e-mail','contact.msg':'Skriv din besked...',
    'contact.send':'Send besked',
    'order.thanks':'Tak for din bestilling!','order.backToShop':'Tilbage til butikken',
    'sizeGuide.eyebrow':'Størrelsesguide','sizeGuide.title':'Find den rigtige størrelse',
    'sizeGuide.tip':'Mål dig selv eller sammenlign med en trøje der passer. Målene under er i centimeter.',
    'sizeGuide.howto':'Sådan måler du:',
    'sizeGuide.measure.chest':'Bryst:','sizeGuide.measure.chestText':'Mål om den bredeste del af brystet, under armhulerne.',
    'sizeGuide.measure.waist':'Talje:','sizeGuide.measure.waistText':'Mål om navlen, hvor bukserne sidder naturligt.',
    'sizeGuide.measure.length':'Længde:','sizeGuide.measure.lengthText':'Mål fra skuldersøm til ønsket trøjeslut (normalt hofte).',
    'email.close':'Luk','email.openMail':'Åbn i mail-program',
    'toast.subscribed':'✓ Tak! Du er nu abonnent.',
    'toast.langChanged':'✓ Sprog ændret',
    'plan.budget':'Budget','plan.individual':'Individuel','plan.club':'Klub','plan.popular':'Populær','plan.choose':'Vælg plan',
    'plan.month':'1 måned','plan.halfSeason':'Halv sæson','plan.fullSeason':'Hel sæson <em>bedste værdi</em>',
    'plan.ads.title':'Med reklamer','plan.ads.desc':'Fuld funktionalitet, men med reklamepauser. Perfekt til at teste.',
    'plan.personal.title':'Personlig konto','plan.personal.desc':'Helt reklamefri oplevelse. Gem ubegrænset med kast.',
    'plan.clubAcc.title':'Klubkonto','plan.clubAcc.desc':'Til klubber og trænerteams. Inkluderer trænerværktøjer og præstationsanalyse.',
    'journey.eyebrow':'Vores rejse','journey.heading':'Fra idé til <span class="grad-text">virkelighed</span>',
    'journey.sub':'Sådan gik det — fra en skitse på papir til en AI-app vi forbereder til offentlig lancering.',
    'journey.m1.year':'2024 · Efterår','journey.m1.title':'Idéen fødes',
    'journey.m1.text':'To kast-entusiaster bliver trætte af målebånd og stopure.',
    'journey.m2.year':'2024 · Vinter','journey.m2.title':'Første prototype',
    'journey.m2.text':'Nætter bruges på at bygge den første pose-detektion.',
    'journey.m3.year':'2025 · Forår','journey.m3.title':'Første klub siger ja',
    'journey.m3.text':'En lokal friidrætsklub tager os ind til test. Vi rammer 3 meter forkert.',
    'journey.m4.year':'2025 · Sommer','journey.m4.title':'1,5 m præcision opnået',
    'journey.m4.text':'Efter måneder med kalibrering og AI-træning når vi den magiske grænse.',
    'journey.m5.year':'2025 · Efterår','journey.m5.title':'Beta-lancering',
    'journey.m5.text':'Indoor Distance lanceres i beta med fire grene. Gratis under udvikling.',
    'journey.m6.year':'2026 · I dag','journey.m6.title':'Her er vi nu',
    'journey.m6.text':'Appen er i beta og udvikles uge for uge. Vi forbereder lancering i <strong>2026</strong>.',
    'about.eyebrow':'Om os','about.heading':'Vi brænder for <span class="grad-text">friidræt</span>',
    'about.lead':'Indoor Distance brænder for at forenkle træningen for både trænere og unge atleter.',
    'about.p1':'Med AI og en omfattende database for spydtræning kan du udføre en analyse med bare kameraet.',
    'about.p2':'Vi fokuserer på friidræt — særligt <strong>spyd og diskos</strong>.',
    'about.quote':'"Vi laver værktøjer der hjælper unge nå deres fulde potentiale."',
    'about.quoteAuthor':'— Indoor Distance-teamet',
    'about.card.personalBest':'PERSONLIG REKORD','about.card.angle':'VINKEL','about.card.speed':'HASTIGHED',
    'faq.eyebrow':'FAQ','faq.heading':'Almindelige <span class="grad-text">spørgsmål</span>',
    'faq.q1':'Hvor nøjagtig er målingen?','faq.a1':'Standardpræcision er ca <strong>1,5 meter</strong>.',
    'faq.q2':'Hvilke grene understøttes?','faq.a2':'Spyd, diskos, slegge og kugle.',
    'faq.q3':'Har jeg brug for en speciel telefon?','faq.a3':'Nej — enhver moderne smartphone fungerer.',
    'faq.q4':'Forskel mellem kontotyper?','faq.a4':'<strong>Med reklamer</strong>, <strong>Individuel</strong>, eller <strong>Klub</strong>.',
    'faq.q5':'Hvordan betaler jeg?','faq.a5':'Via <strong>Swish (076 396 88 61)</strong>.',
    'faq.q6':'Kan jeg opsige når som helst?','faq.a6':'Ja. Ingen bindingsperioder.',
    'faq.q7':'Hvad inkluderer forsendelsen?','faq.a7':'49 SEK, <strong>gratis over 500 SEK</strong>. 3-5 hverdage.',
    'testimonials.eyebrow':'Stemmer fra beta-testere',
    'testimonials.heading':'Hvad <span class="grad-text">tidlige brugere</span> siger',
    'testimonials.sub':'Citater fra klubber og atleter.',
    'testimonials.t1.text':'"Utroligt værktøj. Min elev gik fra 42 til 51 m på en måned."',
    'testimonials.t1.role':'Træner, IFK Helsingborg',
    'testimonials.t2.text':'"Som teenager der træner alene er det perfekt."',
    'testimonials.t2.role':'15 år, Hammarby IF',
    'testimonials.t3.text':'"Vi sparer masser af tid på klubtræninger."',
    'testimonials.t3.role':'Hovedtræner, Spårvägens FK',
    'appDemo.eyebrow':'I appen','appDemo.heading':'Træn smartere med <span class="grad-text">AI</span>',
    'appDemo.sub':'Indoor Distance-appen måler kastteknikken i realtid med kameraet.',
    'appDemo.openApp':'Åbn appen →',
    'account.eyebrow':'Konto','account.heading':'Din <span class="grad-text">konto</span>',
    'account.sub':'Administrer din profil her.',
    'footer.tagline':'AI-drevet kasttræning for spyd, diskos, kugle og slegge.',
    'footer.product':'Produkt','footer.company':'Firma','footer.social':'Sociale','footer.app':'Appen','footer.myAccount':'Min konto','footer.voices':'Stemmer',
    'trust.payment':'Sikker betaling','trust.paymentSub':'SSL-krypteret · Swish',
    'trust.delivery':'Hurtig levering','trust.deliverySub':'PostNord · 3-5 dage',
    'trust.returns':'14 dgr returret','trust.returnsSub':'Gratis retur',
    'trust.shipping':'Fri fragt over 500 SEK','trust.shippingSub':'I Danmark',
    'search.placeholder':'Søg produkter, planer eller spørgsmål...',
    'search.askAI':'Spørg AI-coach','search.noResults':'Ingen resultater'
  },
  de: {
    'nav.login':'Anmelden','nav.home':'Start','nav.services':'Leistungen','nav.about':'Über uns',
    'nav.pricing':'Preise & Shop','nav.account':'Konto','nav.contact':'Kontakt',
    'hero.badge':'KI-gestütztes Wurftraining','hero.title1':'Training vereinfachen',
    'hero.title2':'für <span class="grad-text">Trainer & Jugend</span>',
    'hero.lead':'Indoor Distance nutzt KI und eine umfassende Datenbank für Speertraining. Mit nur deiner Kamera analysiert die App den Wurf und gibt dir sofort Feedback zu <strong>Geschwindigkeit, Winkel und Distanz</strong>.',
    'hero.ctaPricing':'Preise ansehen','hero.ctaLearn':'Mehr erfahren',
    'hero.stat1':'Präzision heute','hero.stat2':'Disziplinen','hero.stat3':'für volle Analyse',
    'services.eyebrow':'Leistungen','services.heading':'Was wir <span class="grad-text">bieten</span>',
    'services.sub':'Drei Dinge die einen Unterschied machen — Genauigkeit, Einfachheit und Zugänglichkeit für alle.',
    'services.f1.title':'Genauigkeit','services.f1.text':'Unser Ziel ist maximale Präzision. Aktuell liegt die Präzision bei <strong>1,5 Metern</strong>, was außergewöhnlich gut ist. Mit Kalibrierung gehen wir bis 1 Meter.',
    'services.f2.title':'Einfacheres Lernen','services.f2.text':'Wir vereinfachen das Training für junge Leichtathleten und ihre Trainer. Sofortiges Feedback zu <strong>Geschwindigkeit, Winkel und Distanz</strong>.',
    'services.f3.title':'Zugänglichkeit','services.f3.text':'Indoor Distance ist ein Tool, das <strong>jeder nutzen kann</strong>. Wir unterstützen Anfänger und Trainer in ihrer Entwicklung.',
    'pricing.eyebrow':'Preise','pricing.heading':'Wähle dein <span class="grad-text">Paket</span>',
    'pricing.sub':'Drei Stufen × drei Zeiträume. Wähle was zu dir oder deinem Verein passt.',
    'shop.eyebrow':'Shop','shop.heading':'Indoor Distance <span class="grad-text">Merch</span>',
    'shop.sub':'T-Shirts, Tassen und Aufkleber für den ganzen Verein.',
    'filter.all':'Alle','filter.men':'Herren','filter.women':'Damen','filter.youth':'Jugend',
    'filter.kids':'Kinder','filter.hoodies':'Hoodies','filter.mugs':'Tassen','filter.stickers':'Aufkleber',
    'product.chooseSize':'Größe wählen (erforderlich)','product.sizeGuide':'Größentabelle',
    'newsletter.eyebrow':'Newsletter & Warteliste','newsletter.heading':'Sichere deinen Platz — <span class="grad-text">50 % Rabatt im 1. Jahr</span>',
    'newsletter.sub':'Werde einer der ersten Athleten, die Indoor Distance testen. Wir veröffentlichen die App in Phasen, um Qualität zu sichern — Warteliste-Mitglieder zuerst.',
    'newsletter.badge':'Warteliste offen — nur auf Einladung Q3 2026',
    'newsletter.benefit1':'<strong>Frühzugang</strong> vor dem öffentlichen Start',
    'newsletter.benefit2':'<strong>50 % Rabatt</strong> im gesamten 1. Jahr',
    'newsletter.benefit3':'<strong>Beta-Feedback</strong> — gestalte Features mit',
    'newsletter.benefit4':'<strong>Trainingstipps</strong> von Experten — 1 Mail/Monat',
    'newsletter.trust1':'DSGVO-sicher — keine 3. Parteien',
    'newsletter.trust2':'Max 1 Mail pro Monat',
    'newsletter.trust3':'Jederzeit abbestellen',
    'newsletter.placeholder':'deine@email.de','newsletter.button':'Platz sichern',
    'contact.eyebrow':'Kontakt','contact.heading':'Melde <span class="grad-text">dich</span>',
    'contact.sub':'Fragen zur Technik, Partnerschaften oder allgemeine Gedanken? Schreib uns, wir antworten.',
    'contact.email':'E-Mail','contact.response':'Antwortzeit','contact.responseTime':'Innerhalb von 24 Std.',
    'contact.name':'Dein Name','contact.emailPh':'Deine E-Mail','contact.msg':'Schreibe deine Nachricht...',
    'contact.send':'Nachricht senden',
    'order.thanks':'Danke für deine Bestellung!','order.backToShop':'Zurück zum Shop',
    'sizeGuide.eyebrow':'Größentabelle','sizeGuide.title':'Finde deine Größe',
    'sizeGuide.tip':'Miss dich selbst oder vergleiche mit einem passenden Shirt. Maße unten in Zentimetern.',
    'sizeGuide.howto':'So misst du:',
    'sizeGuide.measure.chest':'Brust:','sizeGuide.measure.chestText':'Miss um die breiteste Stelle der Brust, unter den Achseln.',
    'sizeGuide.measure.waist':'Taille:','sizeGuide.measure.waistText':'Miss um den Bauchnabel, wo die Hose natürlich sitzt.',
    'sizeGuide.measure.length':'Länge:','sizeGuide.measure.lengthText':'Miss von Schulternaht zum gewünschten Ende (meist Hüfte).',
    'email.close':'Schließen','email.openMail':'In Mail öffnen',
    'toast.subscribed':'✓ Danke! Du bist jetzt Abonnent.',
    'toast.langChanged':'✓ Sprache geändert',
    'plan.budget':'Budget','plan.individual':'Individuell','plan.club':'Verein','plan.popular':'Beliebt','plan.choose':'Plan wählen',
    'plan.month':'1 Monat','plan.halfSeason':'Halbe Saison','plan.fullSeason':'Ganze Saison <em>beste Wahl</em>',
    'plan.ads.title':'Mit Werbung','plan.ads.desc':'Voller Funktionsumfang mit Werbeunterbrechungen.',
    'plan.personal.title':'Persönliches Konto','plan.personal.desc':'Komplett werbefrei. Unbegrenzt Würfe speichern.',
    'plan.clubAcc.title':'Vereinskonto','plan.clubAcc.desc':'Für Vereine und Trainerteams.',
    'journey.eyebrow':'Unsere Reise','journey.heading':'Von der Idee zur <span class="grad-text">Realität</span>',
    'journey.sub':'So lief es — von einer Skizze zu einer KI-App vor dem Launch.',
    'journey.m1.year':'2024 · Herbst','journey.m1.title':'Die Idee entsteht',
    'journey.m1.text':'Zwei Wurf-Enthusiasten haben Maßband und Stoppuhr satt.',
    'journey.m2.year':'2024 · Winter','journey.m2.title':'Erster Prototyp',
    'journey.m2.text':'Nächte werden mit der ersten Pose-Erkennung verbracht.',
    'journey.m3.year':'2025 · Frühling','journey.m3.title':'Erster Verein sagt ja',
    'journey.m3.text':'Ein örtlicher Leichtathletikverein testet — wir liegen 3 Meter daneben.',
    'journey.m4.year':'2025 · Sommer','journey.m4.title':'1,5 m Präzision erreicht',
    'journey.m4.text':'Nach Monaten mit Kalibrierung und KI-Training erreichen wir die magische Grenze.',
    'journey.m5.year':'2025 · Herbst','journey.m5.title':'Beta-Launch',
    'journey.m5.text':'Indoor Distance startet in Beta mit vier Disziplinen.',
    'journey.m6.year':'2026 · Heute','journey.m6.title':'Hier sind wir jetzt',
    'journey.m6.text':'Die App ist in Beta und wächst Woche für Woche. Launch <strong>2026</strong>.',
    'about.eyebrow':'Über uns','about.heading':'Wir lieben <span class="grad-text">Leichtathletik</span>',
    'about.lead':'Indoor Distance vereinfacht das Training für Trainer und Jugendliche.',
    'about.p1':'Mit KI und einer Datenbank für Speertraining kannst du mit der Kamera eine Analyse durchführen.',
    'about.p2':'Wir fokussieren uns auf <strong>Speer und Diskus</strong>.',
    'about.quote':'"Wir machen Werkzeuge die jungen Athleten helfen, ihr volles Potenzial zu erreichen."',
    'about.quoteAuthor':'— Das Indoor Distance Team',
    'about.card.personalBest':'BESTLEISTUNG','about.card.angle':'WINKEL','about.card.speed':'GESCHWINDIGKEIT',
    'faq.eyebrow':'FAQ','faq.heading':'Häufige <span class="grad-text">Fragen</span>',
    'faq.q1':'Wie genau ist die Messung?','faq.a1':'Standardpräzision ist ca <strong>1,5 Meter</strong>.',
    'faq.q2':'Welche Disziplinen werden unterstützt?','faq.a2':'Speer, Diskus, Hammer und Kugel.',
    'faq.q3':'Brauche ich ein spezielles Telefon?','faq.a3':'Nein — jedes moderne Smartphone funktioniert.',
    'faq.q4':'Unterschied zwischen Kontotypen?','faq.a4':'<strong>Mit Werbung</strong>, <strong>Individuell</strong>, oder <strong>Verein</strong>.',
    'faq.q5':'Wie zahle ich?','faq.a5':'Via <strong>Swish (076 396 88 61)</strong>.',
    'faq.q6':'Kann ich jederzeit kündigen?','faq.a6':'Ja. Keine Vertragslaufzeit.',
    'faq.q7':'Was umfasst der Versand?','faq.a7':'49 SEK, <strong>gratis ab 500 SEK</strong>.',
    'testimonials.eyebrow':'Stimmen von Beta-Testern',
    'testimonials.heading':'Was <strong class="grad-text">frühe Nutzer</strong> sagen',
    'testimonials.sub':'Zitate von Vereinen und Athleten.',
    'testimonials.t1.text':'"Unglaubliches Werkzeug. Mein Schüler ging von 42 auf 51 m in einem Monat."',
    'testimonials.t1.role':'Trainer, IFK Helsingborg',
    'testimonials.t2.text':'"Als Teenager der alleine trainiert ist es perfekt."',
    'testimonials.t2.role':'15 Jahre, Hammarby IF',
    'testimonials.t3.text':'"Wir sparen viel Zeit beim Vereinstraining."',
    'testimonials.t3.role':'Cheftrainerin, Spårvägens FK',
    'appDemo.eyebrow':'In der App','appDemo.heading':'Smarter trainieren mit <span class="grad-text">KI</span>',
    'appDemo.sub':'Die Indoor Distance App misst deine Wurftechnik in Echtzeit.',
    'appDemo.openApp':'App öffnen →',
    'account.eyebrow':'Konto','account.heading':'Dein <span class="grad-text">Konto</span>',
    'account.sub':'Verwalte dein Profil hier.',
    'footer.tagline':'KI-gestütztes Wurftraining für Speer, Diskus, Kugel und Hammer.',
    'footer.product':'Produkt','footer.company':'Unternehmen','footer.social':'Sozial','footer.app':'App','footer.myAccount':'Mein Konto','footer.voices':'Stimmen',
    'trust.payment':'Sichere Zahlung','trust.paymentSub':'SSL · Swish',
    'trust.delivery':'Schnelle Lieferung','trust.deliverySub':'PostNord · 3-5 Tage',
    'trust.returns':'14 Tage Rückgabe','trust.returnsSub':'Gratis Retour',
    'trust.shipping':'Gratis ab 500 SEK','trust.shippingSub':'In Schweden',
    'search.placeholder':'Produkte, Pläne oder Fragen suchen...',
    'search.askAI':'KI-Coach fragen','search.noResults':'Keine Treffer'
  },
  fr: {
    'nav.login':'Connexion','nav.home':'Accueil','nav.services':'Services','nav.about':'À propos',
    'nav.pricing':'Tarifs & Boutique','nav.account':'Compte','nav.contact':'Contact',
    'hero.badge':'Entraînement lancer par IA','hero.title1':'Simplifier l\'entraînement',
    'hero.title2':'pour <span class="grad-text">entraîneurs & jeunes</span>',
    'hero.lead':'Indoor Distance utilise l\'IA et une base de données complète pour l\'entraînement au javelot. Avec votre caméra, l\'app analyse le lancer et vous donne un retour sur <strong>vitesse, angle et distance</strong> instantanément.',
    'hero.ctaPricing':'Voir les tarifs','hero.ctaLearn':'En savoir plus',
    'hero.stat1':'précision actuelle','hero.stat2':'disciplines','hero.stat3':'pour analyse complète',
    'services.eyebrow':'Services','services.heading':'Ce que nous <span class="grad-text">offrons</span>',
    'services.sub':'Trois choses qui font la différence — précision, simplicité et accessibilité pour tous.',
    'services.f1.title':'Précision','services.f1.text':'Notre objectif est une précision maximale. Actuellement <strong>1,5 mètre</strong>, exceptionnellement bon. Avec calibration jusqu\'à 1 mètre.',
    'services.f2.title':'Apprentissage facilité','services.f2.text':'Nous simplifions l\'entraînement pour jeunes athlètes et entraîneurs. Retour immédiat sur <strong>vitesse, angle et distance</strong>.',
    'services.f3.title':'Accessibilité','services.f3.text':'Indoor Distance est un outil <strong>accessible à tous</strong>. Nous soutenons débutants et entraîneurs dans leur développement.',
    'pricing.eyebrow':'Tarifs','pricing.heading':'Choisissez votre <span class="grad-text">forfait</span>',
    'pricing.sub':'Trois niveaux × trois périodes. Choisissez ce qui vous convient.',
    'shop.eyebrow':'Boutique','shop.heading':'Indoor Distance <span class="grad-text">merch</span>',
    'shop.sub':'T-shirts, mugs et autocollants pour tout le club.',
    'filter.all':'Tout','filter.men':'Homme','filter.women':'Femme','filter.youth':'Jeune',
    'filter.kids':'Enfants','filter.hoodies':'Sweats','filter.mugs':'Mugs','filter.stickers':'Autocollants',
    'product.chooseSize':'Choisir la taille (obligatoire)','product.sizeGuide':'Guide des tailles',
    'newsletter.eyebrow':'Newsletter & Liste d\'attente','newsletter.heading':'Réservez votre place — <span class="grad-text">50 % de remise la 1re année</span>',
    'newsletter.sub':'Devenez l\'un des premiers athlètes à tester Indoor Distance. Nous lançons l\'application par étapes pour garantir la qualité — les membres de la liste d\'attente passent en premier.',
    'newsletter.badge':'Liste d\'attente ouverte — sur invitation Q3 2026',
    'newsletter.benefit1':'<strong>Accès anticipé</strong> avant le lancement public',
    'newsletter.benefit2':'<strong>50 % de remise</strong> toute la 1re année',
    'newsletter.benefit3':'<strong>Retours bêta</strong> — façonnez les fonctionnalités',
    'newsletter.benefit4':'<strong>Conseils d\'entraînement</strong> d\'experts — 1 mail/mois',
    'newsletter.trust1':'Conforme RGPD — aucun tiers',
    'newsletter.trust2':'Max 1 mail par mois',
    'newsletter.trust3':'Désabonnement à tout moment',
    'newsletter.placeholder':'votre@email.fr','newsletter.button':'Réserver ma place',
    'contact.eyebrow':'Contact','contact.heading':'Prenez <span class="grad-text">contact</span>',
    'contact.sub':'Questions sur la technologie, partenariats ou autre ? Envoyez un message, nous répondons.',
    'contact.email':'E-mail','contact.response':'Délai de réponse','contact.responseTime':'Sous 24h',
    'contact.name':'Votre nom','contact.emailPh':'Votre e-mail','contact.msg':'Écrivez votre message...',
    'contact.send':'Envoyer le message',
    'order.thanks':'Merci pour votre commande !','order.backToShop':'Retour à la boutique',
    'sizeGuide.eyebrow':'Guide des tailles','sizeGuide.title':'Trouvez votre taille',
    'sizeGuide.tip':'Mesurez-vous ou comparez avec un t-shirt qui vous va. Mesures en centimètres.',
    'sizeGuide.howto':'Comment mesurer :',
    'sizeGuide.measure.chest':'Poitrine :','sizeGuide.measure.chestText':'Mesurez le tour de poitrine au plus large, sous les bras.',
    'sizeGuide.measure.waist':'Taille :','sizeGuide.measure.waistText':'Mesurez autour du nombril, où le pantalon repose naturellement.',
    'sizeGuide.measure.length':'Longueur :','sizeGuide.measure.lengthText':'De la couture d\'épaule à la fin souhaitée (souvent la hanche).',
    'email.close':'Fermer','email.openMail':'Ouvrir dans la messagerie',
    'toast.subscribed':'✓ Merci ! Vous êtes maintenant abonné.',
    'toast.langChanged':'✓ Langue changée',
    'plan.budget':'Budget','plan.individual':'Individuel','plan.club':'Club','plan.popular':'Populaire','plan.choose':'Choisir le forfait',
    'plan.month':'1 mois','plan.halfSeason':'Demi-saison','plan.fullSeason':'Saison complète <em>meilleur prix</em>',
    'plan.ads.title':'Avec publicité','plan.ads.desc':'Toutes les fonctionnalités avec interruptions publicitaires.',
    'plan.personal.title':'Compte personnel','plan.personal.desc':'Complètement sans publicité. Lancers illimités.',
    'plan.clubAcc.title':'Compte club','plan.clubAcc.desc':'Pour clubs et équipes d\'entraîneurs.',
    'journey.eyebrow':'Notre parcours','journey.heading':'De l\'idée à la <span class="grad-text">réalité</span>',
    'journey.sub':'Voici comment ça s\'est passé — d\'un croquis à une app IA prête à être lancée.',
    'journey.m1.year':'2024 · Automne','journey.m1.title':'L\'idée naît',
    'journey.m1.text':'Deux passionnés en ont marre des mètres ruban et chronos.',
    'journey.m2.year':'2024 · Hiver','journey.m2.title':'Premier prototype',
    'journey.m2.text':'Les nuits passent à construire la première détection de pose.',
    'journey.m3.year':'2025 · Printemps','journey.m3.title':'Premier club dit oui',
    'journey.m3.text':'Un club local nous teste. Nous sommes à 3 mètres près. Retour à la planche.',
    'journey.m4.year':'2025 · Été','journey.m4.title':'1,5 m de précision atteint',
    'journey.m4.text':'Après des mois de calibration et entraînement IA, nous atteignons le seuil magique.',
    'journey.m5.year':'2025 · Automne','journey.m5.title':'Lancement bêta',
    'journey.m5.text':'Indoor Distance sort en bêta avec quatre disciplines. Gratuit pendant le développement.',
    'journey.m6.year':'2026 · Aujourd\'hui','journey.m6.title':'Nous voici',
    'journey.m6.text':'L\'app évolue semaine après semaine. Lancement prévu en <strong>2026</strong>.',
    'about.eyebrow':'À propos','about.heading':'Nous aimons <span class="grad-text">l\'athlétisme</span>',
    'about.lead':'Indoor Distance simplifie l\'entraînement pour entraîneurs et jeunes athlètes.',
    'about.p1':'Avec l\'IA et une base de données complète, vous pouvez analyser avec votre caméra.',
    'about.p2':'Nous nous concentrons sur <strong>javelot et disque</strong>.',
    'about.quote':'"Nous créons des outils pour aider les jeunes à atteindre leur plein potentiel."',
    'about.quoteAuthor':'— L\'équipe Indoor Distance',
    'about.card.personalBest':'RECORD','about.card.angle':'ANGLE','about.card.speed':'VITESSE',
    'faq.eyebrow':'FAQ','faq.heading':'Questions <span class="grad-text">courantes</span>',
    'faq.q1':'Quelle précision de mesure ?','faq.a1':'Précision standard ~<strong>1,5 m</strong>.',
    'faq.q2':'Quelles disciplines ?','faq.a2':'Javelot, disque, marteau et poids.',
    'faq.q3':'Téléphone spécial requis ?','faq.a3':'Non — tout smartphone moderne fonctionne.',
    'faq.q4':'Différence entre comptes ?','faq.a4':'<strong>Avec pub</strong>, <strong>Individuel</strong>, ou <strong>Club</strong>.',
    'faq.q5':'Comment payer ?','faq.a5':'Via <strong>Swish (076 396 88 61)</strong>.',
    'faq.q6':'Annulation possible ?','faq.a6':'Oui. Sans engagement.',
    'faq.q7':'Frais de livraison ?','faq.a7':'49 SEK, <strong>gratuit au-delà de 500 SEK</strong>.',
    'testimonials.eyebrow':'Voix de bêta-testeurs',
    'testimonials.heading':'Ce que disent <span class="grad-text">les premiers utilisateurs</span>',
    'testimonials.sub':'Citations de clubs et athlètes.',
    'testimonials.t1.text':'"Outil incroyable. Mon élève est passé de 42 à 51 m en un mois."',
    'testimonials.t1.role':'Entraîneur, IFK Helsingborg',
    'testimonials.t2.text':'"En tant qu\'ado qui s\'entraîne seule, c\'est parfait."',
    'testimonials.t2.role':'15 ans, Hammarby IF',
    'testimonials.t3.text':'"Nous gagnons beaucoup de temps aux entraînements."',
    'testimonials.t3.role':'Entraîneur principal, Spårvägens FK',
    'appDemo.eyebrow':'Dans l\'app','appDemo.heading':'Entraînez-vous plus intelligemment avec <span class="grad-text">l\'IA</span>',
    'appDemo.sub':'L\'app Indoor Distance mesure votre technique en temps réel.',
    'appDemo.openApp':'Ouvrir l\'app →',
    'account.eyebrow':'Compte','account.heading':'Votre <span class="grad-text">compte</span>',
    'account.sub':'Gérez votre profil ici.',
    'footer.tagline':'Entraînement IA pour javelot, disque, poids et marteau.',
    'footer.product':'Produit','footer.company':'Entreprise','footer.social':'Social','footer.app':'L\'app','footer.myAccount':'Mon compte','footer.voices':'Voix',
    'trust.payment':'Paiement sécurisé','trust.paymentSub':'SSL · Swish',
    'trust.delivery':'Livraison rapide','trust.deliverySub':'PostNord · 3-5 jours',
    'trust.returns':'14 j retour','trust.returnsSub':'Retour gratuit',
    'trust.shipping':'Gratuit dès 500 SEK','trust.shippingSub':'En Suède',
    'search.placeholder':'Rechercher produits, plans ou questions...',
    'search.askAI':'Demander à l\'IA','search.noResults':'Aucun résultat'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇪🇸 ESPAÑOL
  // ═══════════════════════════════════════════════════════════
  es: {
    'nav.login':'Iniciar sesión','nav.home':'Inicio','nav.services':'Servicios','nav.about':'Sobre nosotros',
    'nav.pricing':'Precios y Tienda','nav.account':'Cuenta','nav.contact':'Contacto',
    'hero.badge':'Entrenamiento con IA',
    'hero.title1':'Simplifica el entrenamiento',
    'hero.title2':'para <span class="grad-text">entrenadores y jóvenes</span>',
    'hero.lead':'Indoor Distance utiliza IA y una amplia base de datos para entrenamiento de atletismo. Con solo tu cámara, la aplicación analiza tu lanzamiento y te da retroalimentación sobre <strong>velocidad, ángulo y distancia</strong> al instante.',
    'hero.ctaPricing':'Ver el tráiler','hero.ctaLearn':'Aprender más',
    'hero.stat1':'precisión hoy','hero.stat2':'disciplinas','hero.stat3':'para análisis completo',
    'services.eyebrow':'Servicios','services.heading':'Qué <span class="grad-text">ofrecemos</span>',
    'services.sub':'Tres cosas que marcan la diferencia — precisión, simplicidad y accesibilidad para todos.',
    'services.f1.title':'Precisión','services.f2.title':'Simplicidad','services.f3.title':'Accesibilidad',
    'about.eyebrow':'Sobre nosotros','about.heading':'Nos apasiona el <span class="grad-text">atletismo</span>',
    'about.lead':'Indoor Distance es una empresa apasionada por simplificar el entrenamiento para entrenadores y jóvenes atletas.',
    'pricing.eyebrow':'Precios','pricing.heading':'Plan <span class="grad-text">simple</span>',
    'pricing.sub':'Un solo precio. Todas las funciones. Sin compromisos.',
    'contact.eyebrow':'Contacto','contact.heading':'<span class="grad-text">Contáctanos</span>',
    'contact.sub':'¿Tienes preguntas? Estamos aquí para ayudarte.',
    'contact.name':'Tu nombre','contact.email':'Tu correo','contact.message':'Tu mensaje',
    'contact.submit':'Enviar mensaje','contact.success':'¡Mensaje enviado! Te responderemos pronto.',
    'footer.tagline':'IA · Ciencia · Atletismo',
    'footer.rights':'Todos los derechos reservados.',
    'toast.langChanged':'Idioma cambiado a Español',
    'search.placeholder':'Buscar productos, planes o preguntas...',
    'search.askAI':'Preguntar a la IA','search.noResults':'Sin resultados',
    'newsletter.eyebrow':'Boletín y Lista de espera','newsletter.heading':'Reserva tu plaza — <span class="grad-text">50 % desc. el 1er año</span>',
    'newsletter.sub':'Sé uno de los primeros atletas en probar Indoor Distance. Lanzamos la app por fases para asegurar la calidad — miembros de la lista van primero.',
    'newsletter.badge':'Lista de espera abierta — solo invitación T3 2026',
    'newsletter.benefit1':'<strong>Acceso anticipado</strong> antes del lanzamiento público',
    'newsletter.benefit2':'<strong>50 % de descuento</strong> todo el primer año',
    'newsletter.benefit3':'<strong>Feedback beta</strong> — moldea las funciones',
    'newsletter.benefit4':'<strong>Consejos</strong> de expertos — 1 email/mes',
    'newsletter.trust1':'Conforme al RGPD — sin terceros',
    'newsletter.trust2':'Máx 1 email al mes',
    'newsletter.trust3':'Cancela cuando quieras',
    'newsletter.placeholder':'tu@email.es','newsletter.button':'Reservar mi plaza'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇮🇹 ITALIANO
  // ═══════════════════════════════════════════════════════════
  it: {
    'nav.login':'Accedi','nav.home':'Home','nav.services':'Servizi','nav.about':'Chi siamo',
    'nav.pricing':'Prezzi & Negozio','nav.account':'Account','nav.contact':'Contatti',
    'hero.badge':'Allenamento basato su IA',
    'hero.title1':'Semplifica l\'allenamento',
    'hero.title2':'per <span class="grad-text">allenatori e giovani</span>',
    'hero.lead':'Indoor Distance utilizza l\'IA e un ampio database per l\'allenamento di atletica leggera. Con solo la tua fotocamera, l\'app analizza il tuo lancio e ti dà feedback su <strong>velocità, angolo e distanza</strong> all\'istante.',
    'hero.ctaPricing':'Guarda il trailer','hero.ctaLearn':'Scopri di più',
    'hero.stat1':'precisione oggi','hero.stat2':'discipline','hero.stat3':'per analisi completa',
    'services.eyebrow':'Servizi','services.heading':'Cosa <span class="grad-text">offriamo</span>',
    'services.sub':'Tre cose che fanno la differenza — precisione, semplicità e accessibilità per tutti.',
    'services.f1.title':'Precisione','services.f2.title':'Semplicità','services.f3.title':'Accessibilità',
    'about.eyebrow':'Chi siamo','about.heading':'Siamo appassionati di <span class="grad-text">atletica</span>',
    'about.lead':'Indoor Distance è un\'azienda appassionata di semplificare l\'allenamento per allenatori e giovani atleti.',
    'pricing.eyebrow':'Prezzi','pricing.heading':'Piano <span class="grad-text">semplice</span>',
    'pricing.sub':'Un prezzo. Tutte le funzionalità. Nessun vincolo.',
    'contact.eyebrow':'Contatti','contact.heading':'<span class="grad-text">Contattaci</span>',
    'contact.sub':'Hai domande? Siamo qui per aiutarti.',
    'contact.name':'Il tuo nome','contact.email':'La tua email','contact.message':'Il tuo messaggio',
    'contact.submit':'Invia messaggio','contact.success':'Messaggio inviato! Ti risponderemo presto.',
    'footer.tagline':'IA · Scienza · Atletica',
    'footer.rights':'Tutti i diritti riservati.',
    'toast.langChanged':'Lingua cambiata in Italiano',
    'search.placeholder':'Cerca prodotti, piani o domande...',
    'search.askAI':'Chiedi all\'IA','search.noResults':'Nessun risultato',
    'newsletter.eyebrow':'Newsletter & Lista d\'attesa','newsletter.heading':'Prenota il tuo posto — <span class="grad-text">50 % di sconto il 1° anno</span>',
    'newsletter.sub':'Sii uno dei primi atleti a testare Indoor Distance. Rilasciamo l\'app a fasi per garantire qualità — i membri della lista vanno per primi.',
    'newsletter.badge':'Lista d\'attesa aperta — solo su invito Q3 2026',
    'newsletter.benefit1':'<strong>Accesso anticipato</strong> prima del lancio pubblico',
    'newsletter.benefit2':'<strong>50 % di sconto</strong> per tutto il 1° anno',
    'newsletter.benefit3':'<strong>Feedback beta</strong> — plasma le funzioni',
    'newsletter.benefit4':'<strong>Consigli</strong> da esperti — 1 email/mese',
    'newsletter.trust1':'Conforme al GDPR — nessun terzo',
    'newsletter.trust2':'Max 1 email al mese',
    'newsletter.trust3':'Disiscriviti in qualsiasi momento',
    'newsletter.placeholder':'tua@email.it','newsletter.button':'Prenota il mio posto'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇫🇮 SUOMI
  // ═══════════════════════════════════════════════════════════
  fi: {
    'nav.login':'Kirjaudu','nav.home':'Etusivu','nav.services':'Palvelut','nav.about':'Meistä',
    'nav.pricing':'Hinnat & Kauppa','nav.account':'Tili','nav.contact':'Yhteystiedot',
    'hero.badge':'Tekoälypohjainen valmennus',
    'hero.title1':'Yksinkertaista harjoittelu',
    'hero.title2':'<span class="grad-text">valmentajille ja nuorille</span>',
    'hero.lead':'Indoor Distance käyttää tekoälyä ja kattavaa tietokantaa yleisurheiluun. Vain kameralla sovellus analysoi heittosi ja antaa palautteen <strong>nopeudesta, kulmasta ja matkasta</strong> heti.',
    'hero.ctaPricing':'Katso traileri','hero.ctaLearn':'Lue lisää',
    'hero.stat1':'tarkkuus nyt','hero.stat2':'lajia','hero.stat3':'koko analyysiin',
    'services.eyebrow':'Palvelut','services.heading':'Mitä <span class="grad-text">tarjoamme</span>',
    'services.sub':'Kolme asiaa, jotka tekevät eron — tarkkuus, helppous ja saavutettavuus kaikille.',
    'services.f1.title':'Tarkkuus','services.f2.title':'Helppous','services.f3.title':'Saavutettavuus',
    'about.eyebrow':'Meistä','about.heading':'Intohimomme on <span class="grad-text">yleisurheilu</span>',
    'about.lead':'Indoor Distance on yritys, joka rakastaa yksinkertaistaa harjoittelua sekä valmentajille että nuorille urheilijoille.',
    'pricing.eyebrow':'Hinnat','pricing.heading':'Yksi <span class="grad-text">selkeä</span> suunnitelma',
    'pricing.sub':'Yksi hinta. Kaikki ominaisuudet. Ei sitoutumista.',
    'contact.eyebrow':'Yhteystiedot','contact.heading':'<span class="grad-text">Ota yhteyttä</span>',
    'contact.sub':'Onko sinulla kysyttävää? Olemme täällä auttamassa.',
    'contact.name':'Nimesi','contact.email':'Sähköpostisi','contact.message':'Viestisi',
    'contact.submit':'Lähetä viesti','contact.success':'Viesti lähetetty! Vastaamme pian.',
    'footer.tagline':'Tekoäly · Tiede · Yleisurheilu',
    'footer.rights':'Kaikki oikeudet pidätetään.',
    'toast.langChanged':'Kieli vaihdettu suomeksi',
    'search.placeholder':'Etsi tuotteita, suunnitelmia tai kysymyksiä...',
    'search.askAI':'Kysy tekoälyltä','search.noResults':'Ei tuloksia',
    'newsletter.eyebrow':'Uutiskirje & Jonotuslista','newsletter.heading':'Varaa paikkasi — <span class="grad-text">50 % alennus 1. vuonna</span>',
    'newsletter.sub':'Ole yksi ensimmäisistä urheilijoista testaamassa Indoor Distancea. Julkaisemme sovelluksen vaiheittain — jonottajat pääsevät ensin.',
    'newsletter.badge':'Jonotuslista auki — vain kutsulla Q3 2026',
    'newsletter.benefit1':'<strong>Varhainen pääsy</strong> ennen julkista julkaisua',
    'newsletter.benefit2':'<strong>50 % alennus</strong> koko ensimmäisen vuoden',
    'newsletter.benefit3':'<strong>Beta-palaute</strong> — muokkaa ominaisuuksia',
    'newsletter.benefit4':'<strong>Harjoitusvinkit</strong> asiantuntijoilta — 1 viesti/kk',
    'newsletter.trust1':'GDPR-turvallinen — ei kolmansia',
    'newsletter.trust2':'Maks. 1 viesti kuussa',
    'newsletter.trust3':'Peru milloin tahansa',
    'newsletter.placeholder':'sinun@email.fi','newsletter.button':'Varaa paikkani'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇵🇱 POLSKI
  // ═══════════════════════════════════════════════════════════
  pl: {
    'nav.login':'Zaloguj się','nav.home':'Strona główna','nav.services':'Usługi','nav.about':'O nas',
    'nav.pricing':'Ceny & Sklep','nav.account':'Konto','nav.contact':'Kontakt',
    'hero.badge':'Trening oparty na AI',
    'hero.title1':'Uprość trening',
    'hero.title2':'dla <span class="grad-text">trenerów i młodych</span>',
    'hero.lead':'Indoor Distance wykorzystuje AI i obszerną bazę danych do treningu lekkoatletycznego. Sama kamera w aplikacji analizuje Twój rzut i daje natychmiastową informację zwrotną o <strong>prędkości, kącie i odległości</strong>.',
    'hero.ctaPricing':'Obejrzyj trailer','hero.ctaLearn':'Dowiedz się więcej',
    'hero.stat1':'precyzja dziś','hero.stat2':'dyscyplin','hero.stat3':'do pełnej analizy',
    'services.eyebrow':'Usługi','services.heading':'Co <span class="grad-text">oferujemy</span>',
    'services.sub':'Trzy rzeczy, które robią różnicę — precyzja, prostota i dostępność dla wszystkich.',
    'services.f1.title':'Precyzja','services.f2.title':'Prostota','services.f3.title':'Dostępność',
    'about.eyebrow':'O nas','about.heading':'Jesteśmy pasjonatami <span class="grad-text">lekkoatletyki</span>',
    'about.lead':'Indoor Distance to firma, której pasją jest uproszczenie treningu dla trenerów i młodych sportowców.',
    'pricing.eyebrow':'Ceny','pricing.heading':'Prosty <span class="grad-text">plan</span>',
    'pricing.sub':'Jedna cena. Wszystkie funkcje. Bez zobowiązań.',
    'contact.eyebrow':'Kontakt','contact.heading':'<span class="grad-text">Skontaktuj się</span> z nami',
    'contact.sub':'Masz pytania? Jesteśmy tutaj, aby pomóc.',
    'contact.name':'Twoje imię','contact.email':'Twój e-mail','contact.message':'Twoja wiadomość',
    'contact.submit':'Wyślij wiadomość','contact.success':'Wiadomość wysłana! Odpowiemy wkrótce.',
    'footer.tagline':'AI · Nauka · Lekkoatletyka',
    'footer.rights':'Wszelkie prawa zastrzeżone.',
    'toast.langChanged':'Język zmieniony na polski',
    'search.placeholder':'Szukaj produktów, planów lub pytań...',
    'search.askAI':'Zapytaj AI','search.noResults':'Brak wyników',
    'newsletter.eyebrow':'Newsletter i Lista oczekujących','newsletter.heading':'Zarezerwuj miejsce — <span class="grad-text">50 % zniżki w 1. roku</span>',
    'newsletter.sub':'Bądź jednym z pierwszych lekkoatletów testujących Indoor Distance. Wdrażamy aplikację etapami — członkowie listy mają pierwszeństwo.',
    'newsletter.badge':'Lista otwarta — tylko z zaproszeniem Q3 2026',
    'newsletter.benefit1':'<strong>Wczesny dostęp</strong> przed publiczną premierą',
    'newsletter.benefit2':'<strong>50 % zniżki</strong> przez cały pierwszy rok',
    'newsletter.benefit3':'<strong>Feedback beta</strong> — kształtuj funkcje',
    'newsletter.benefit4':'<strong>Porady treningowe</strong> od ekspertów — 1 email/m-c',
    'newsletter.trust1':'Zgodne z RODO — bez stron trzecich',
    'newsletter.trust2':'Maks. 1 email miesięcznie',
    'newsletter.trust3':'Wypisz się w każdej chwili',
    'newsletter.placeholder':'twoj@email.pl','newsletter.button':'Zarezerwuj miejsce'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇳🇱 NEDERLANDS
  // ═══════════════════════════════════════════════════════════
  nl: {
    'nav.login':'Inloggen','nav.home':'Home','nav.services':'Diensten','nav.about':'Over ons',
    'nav.pricing':'Prijzen & Winkel','nav.account':'Account','nav.contact':'Contact',
    'hero.badge':'AI-gestuurd training',
    'hero.title1':'Vereenvoudig de training',
    'hero.title2':'voor <span class="grad-text">coaches & jongeren</span>',
    'hero.lead':'Indoor Distance gebruikt AI en een uitgebreide database voor atletiektraining. Met alleen je camera analyseert de app je worp en geeft je direct feedback over <strong>snelheid, hoek en afstand</strong>.',
    'hero.ctaPricing':'Bekijk de trailer','hero.ctaLearn':'Meer weten',
    'hero.stat1':'precisie vandaag','hero.stat2':'disciplines','hero.stat3':'voor volledige analyse',
    'services.eyebrow':'Diensten','services.heading':'Wat we <span class="grad-text">bieden</span>',
    'services.sub':'Drie dingen die het verschil maken — nauwkeurigheid, eenvoud en toegankelijkheid voor iedereen.',
    'services.f1.title':'Nauwkeurigheid','services.f2.title':'Eenvoud','services.f3.title':'Toegankelijkheid',
    'about.eyebrow':'Over ons','about.heading':'We zijn gepassioneerd over <span class="grad-text">atletiek</span>',
    'about.lead':'Indoor Distance is een bedrijf dat gepassioneerd is over het vereenvoudigen van training voor coaches en jonge atleten.',
    'pricing.eyebrow':'Prijzen','pricing.heading':'Eenvoudig <span class="grad-text">plan</span>',
    'pricing.sub':'Eén prijs. Alle functies. Geen verplichtingen.',
    'contact.eyebrow':'Contact','contact.heading':'<span class="grad-text">Neem contact</span> op',
    'contact.sub':'Vragen? We zijn hier om te helpen.',
    'contact.name':'Je naam','contact.email':'Je e-mail','contact.message':'Je bericht',
    'contact.submit':'Bericht versturen','contact.success':'Bericht verzonden! We reageren snel.',
    'footer.tagline':'AI · Wetenschap · Atletiek',
    'footer.rights':'Alle rechten voorbehouden.',
    'toast.langChanged':'Taal gewijzigd naar Nederlands',
    'search.placeholder':'Zoek producten, plannen of vragen...',
    'search.askAI':'Vraag AI','search.noResults':'Geen resultaten',
    'newsletter.eyebrow':'Nieuwsbrief & Wachtlijst','newsletter.heading':'Reserveer je plek — <span class="grad-text">50 % korting 1e jaar</span>',
    'newsletter.sub':'Wees een van de eerste atleten die Indoor Distance test. We lanceren de app in fases voor kwaliteit — wachtlijstleden gaan voorop.',
    'newsletter.badge':'Wachtlijst open — alleen op uitnodiging Q3 2026',
    'newsletter.benefit1':'<strong>Vroege toegang</strong> vóór publieke lancering',
    'newsletter.benefit2':'<strong>50 % korting</strong> het hele eerste jaar',
    'newsletter.benefit3':'<strong>Beta-feedback</strong> — vorm de functies',
    'newsletter.benefit4':'<strong>Trainingstips</strong> van experts — 1 e-mail/maand',
    'newsletter.trust1':'AVG-veilig — geen 3e partijen',
    'newsletter.trust2':'Max 1 e-mail per maand',
    'newsletter.trust3':'Op elk moment uitschrijven',
    'newsletter.placeholder':'jouw@email.nl','newsletter.button':'Plek reserveren'
  },

  // ═══════════════════════════════════════════════════════════
  // 🇨🇳 中文 (简体)
  // ═══════════════════════════════════════════════════════════
  zh: {
    'nav.login':'登录','nav.home':'首页','nav.services':'服务','nav.about':'关于我们',
    'nav.pricing':'价格与商店','nav.account':'账户','nav.contact':'联系我们',
    'hero.badge':'AI 驱动的训练',
    'hero.title1':'简化训练',
    'hero.title2':'为<span class="grad-text">教练和年轻运动员</span>',
    'hero.lead':'Indoor Distance 使用 AI 和全面的田径训练数据库。仅使用您的相机，应用程序就能分析您的投掷动作,并立即为您提供有关<strong>速度、角度和距离</strong>的反馈。',
    'hero.ctaPricing':'观看预告片','hero.ctaLearn':'了解更多',
    'hero.stat1':'当前精度','hero.stat2':'项目','hero.stat3':'完整分析',
    'services.eyebrow':'服务','services.heading':'我们<span class="grad-text">提供什么</span>',
    'services.sub':'三件事让我们与众不同 — 精准、简单和人人可及。',
    'services.f1.title':'精准','services.f2.title':'简单','services.f3.title':'人人可及',
    'about.eyebrow':'关于我们','about.heading':'我们热爱<span class="grad-text">田径运动</span>',
    'about.lead':'Indoor Distance 是一家致力于为教练和年轻运动员简化训练的公司。',
    'pricing.eyebrow':'价格','pricing.heading':'简单的<span class="grad-text">计划</span>',
    'pricing.sub':'一个价格。所有功能。无承诺。',
    'contact.eyebrow':'联系','contact.heading':'<span class="grad-text">联系我们</span>',
    'contact.sub':'有问题吗？我们随时为您提供帮助。',
    'contact.name':'您的姓名','contact.email':'您的邮箱','contact.message':'您的留言',
    'contact.submit':'发送消息','contact.success':'消息已发送！我们会尽快回复。',
    'footer.tagline':'AI · 科学 · 田径',
    'footer.rights':'保留所有权利。',
    'toast.langChanged':'语言已切换为中文',
    'search.placeholder':'搜索产品、计划或问题...',
    'search.askAI':'询问 AI','search.noResults':'无结果',
    'newsletter.eyebrow':'通讯 & 等候名单','newsletter.heading':'锁定您的名额 — <span class="grad-text">首年五折优惠</span>',
    'newsletter.sub':'成为首批体验 Indoor Distance 的运动员之一。我们分阶段发布以确保质量 — 等候名单会员优先。',
    'newsletter.badge':'等候名单开放 — 2026 年第三季度仅限邀请',
    'newsletter.benefit1':'<strong>抢先体验</strong> 公开发布前',
    'newsletter.benefit2':'<strong>首年 5 折</strong> 全年优惠',
    'newsletter.benefit3':'<strong>Beta 反馈</strong> — 塑造功能',
    'newsletter.benefit4':'<strong>专家训练贴士</strong> — 每月 1 封邮件',
    'newsletter.trust1':'符合 GDPR — 无第三方',
    'newsletter.trust2':'每月最多 1 封邮件',
    'newsletter.trust3':'随时取消订阅',
    'newsletter.placeholder':'your@email.com','newsletter.button':'锁定我的名额'
  }
};

function t(key, lang) {
  const L = lang || getLang();
  return (TRANSLATIONS[L] && TRANSLATIONS[L][key]) || TRANSLATIONS.sv[key] || key;
}

function getLang() {
  let lang = localStorage.getItem(LANG_KEY);
  if (!lang) {
    // Auto-detect from browser
    const browser = (navigator.language || 'sv').toLowerCase().slice(0,2);
    lang = TRANSLATIONS[browser] ? browser : 'sv';
  }
  return lang;
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  localStorage.setItem(LANG_KEY, lang);
  applyLang(lang);
  closeLangMenu();
  showToast(t('toast.langChanged', lang));
}

function applyLang(lang) {
  lang = lang || getLang();
  document.documentElement.setAttribute('lang', lang);
  // Update language button label
  const langCurrent = document.getElementById('langCurrent');
  if (langCurrent) langCurrent.textContent = lang.toUpperCase();
  // Apply text translations
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key, lang);
    if (text) el.textContent = text;
  });
  // Apply HTML translations (for content with <strong>, <span>, etc.)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const text = t(key, lang);
    if (text) el.innerHTML = text;
  });
  // Apply attribute translations (e.g. placeholder)
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const spec = el.getAttribute('data-i18n-attr'); // "placeholder:contact.name"
    spec.split(',').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s.trim());
      const text = t(key, lang);
      if (text) el.setAttribute(attr, text);
    });
  });
}

function toggleLangMenu(e) {
  if (e) e.stopPropagation();
  document.getElementById('langMenu').classList.toggle('open');
}
function closeLangMenu() {
  const m = document.getElementById('langMenu');
  if (m) m.classList.remove('open');
}
document.addEventListener('click', e => {
  const sw = document.getElementById('langSwitcher');
  if (sw && !sw.contains(e.target)) closeLangMenu();
});

// ─── Currency picker UI ───────────────────────────────────
function toggleCurrencyMenu(e) {
  if (e) e.stopPropagation();
  const m = document.getElementById('currencyMenu');
  if (m) m.classList.toggle('open');
}
function closeCurrencyMenu() {
  const m = document.getElementById('currencyMenu');
  if (m) m.classList.remove('open');
}
function setCurrencyAndClose(code) {
  setCurrency(code);
  closeCurrencyMenu();
  rerenderAllPrices();
  if (typeof showToast === 'function') {
    showToast('Valuta: ' + CURRENCIES[code].name);
  }
}
document.addEventListener('click', e => {
  const sw = document.getElementById('currencySwitcher');
  if (sw && !sw.contains(e.target)) closeCurrencyMenu();
});

// Init: visa nuvarande valuta i badge + rendera om priserna
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('currencyPickerBadge');
  if (badge) badge.textContent = getActiveCurrency();
  setTimeout(rerenderAllPrices, 400);
});

window.toggleCurrencyMenu = toggleCurrencyMenu;
window.setCurrencyAndClose = setCurrencyAndClose;

// ═══════════════════════════════════════════════════════════
//  SECTION NAV — floating dots that follow scroll position
// ═══════════════════════════════════════════════════════════
function initSectionNav() {
  const nav = document.getElementById('sectionNav');
  if (!nav) return;
  const dots = nav.querySelectorAll('.section-nav-dot');
  const sections = Array.from(dots).map(d => document.getElementById(d.getAttribute('data-section'))).filter(Boolean);
  if (!sections.length) return;

  // Show after scrolling past hero
  function updateVisibility() {
    nav.classList.toggle('visible', window.scrollY > 200);
  }
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });

  // Highlight current section
  function updateActive() {
    const viewCenter = window.scrollY + window.innerHeight * 0.4;
    let activeIdx = 0;
    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      const top = rect.top + window.scrollY;
      if (top <= viewCenter) activeIdx = i;
    }
    dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
  }
  updateActive();
  window.addEventListener('scroll', updateActive, { passive: true });

  // Smooth scroll on click
  dots.forEach(d => {
    d.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(d.getAttribute('data-section'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  AI SPOTLIGHT SEARCH — global natural language nav
// ═══════════════════════════════════════════════════════════
let aiSpotlightItems = [];
let aiSpotlightHighlight = 0;

// Build the searchable index. Includes: products, plans, sections, FAQ Q&A.
function buildSpotlightIndex() {
  const idx = [];
  // Products
  PRODUCTS.forEach(p => {
    idx.push({
      type: 'product', icon: '🛍️',
      name: p.name,
      meta: `${p.tag} · ${formatPrice(p.price)}`,
      keywords: [p.name, p.tag, p.category, ...(p.keywords||[]), p.desc].join(' '),
      action: () => {
        closeAISpotlight();
        document.getElementById('priser').scrollIntoView({ behavior: 'smooth' });
        if (isShopOpen()) setTimeout(() => openProductModal(p.id), 700);
      }
    });
  });
  // Plans
  PLANS.forEach(pl => {
    idx.push({
      type: 'plan', icon: '💎',
      name: pl.name,
      meta: formatPrice(pl.price),
      keywords: [pl.name, ...(pl.keywords||[])].join(' '),
      action: () => { closeAISpotlight(); document.querySelector(pl.href).scrollIntoView({ behavior: 'smooth' }); }
    });
  });
  // Sections (info links)
  const sections = [
    { id:'hem',          icon:'🏠', name:'Hem',                meta:'Förstasidan',                kw:'hem home start' },
    { id:'tjanster',     icon:'⚡', name:'Tjänster',            meta:'Vad vi erbjuder',            kw:'tjänster services exakthet noggrannhet utlärning tillgänglighet' },
    { id:'resa',         icon:'🗺️', name:'Vår resa',           meta:'Från idé till verklighet',   kw:'resa journey grundare historia milestone' },
    { id:'om',           icon:'👋', name:'Om oss',              meta:'Vilka vi är',                kw:'om company företag vi team grundare' },
    { id:'priser',       icon:'💰', name:'Priser & Butik',     meta:'Plan + merch',               kw:'priser pricing klubb individuell reklam butik shop merch' },
    { id:'app-demo',     icon:'📱', name:'I appen',             meta:'Riktiga skärmar',            kw:'app demo skärmar kamera ai chat profil' },
    { id:'testimonials', icon:'⭐', name:'Röster',              meta:'Beta-testare berättar',      kw:'röster testimonials recensioner kunder' },
    { id:'faq',          icon:'❓', name:'FAQ',                 meta:'Vanliga frågor',             kw:'faq frågor hjälp support' },
    { id:'konto',        icon:'👤', name:'Mitt konto',          meta:'Logga in / registrera',      kw:'konto account login dashboard profil' },
    { id:'kontakt',      icon:'✉️', name:'Kontakta oss',       meta:'Hör av dig',                 kw:'kontakt contact mail email' }
  ];
  sections.forEach(s => {
    idx.push({
      type: 'section', icon: s.icon, name: s.name, meta: s.meta, keywords: s.kw,
      action: () => { closeAISpotlight(); document.getElementById(s.id).scrollIntoView({ behavior: 'smooth' }); }
    });
  });
  // FAQ Q&A — each question can answer
  document.querySelectorAll('.faq-item').forEach((el, i) => {
    const q = el.querySelector('summary')?.textContent.trim();
    const a = el.querySelector('p')?.textContent.trim();
    if (!q || !a) return;
    idx.push({
      type: 'faq', icon: '❓',
      name: q,
      meta: a.slice(0, 60) + (a.length > 60 ? '…' : ''),
      keywords: q + ' ' + a,
      answer: a,
      action: () => {
        closeAISpotlight();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.open = true;
      }
    });
  });
  // Direct actions / shortcuts
  idx.push({
    type: 'action', icon: '🌐', name: 'Byt språk',
    meta: 'Svenska, English, Norsk, Dansk, Deutsch, Français',
    keywords: 'språk language byt english svenska norsk dansk deutsch français lang',
    action: () => { closeAISpotlight(); toggleLangMenu(); }
  });
  idx.push({
    type: 'action', icon: '🛒', name: 'Visa varukorg',
    meta: 'Se vad du har lagt i varukorgen',
    keywords: 'varukorg cart kassa checkout köp',
    action: () => { closeAISpotlight(); openCart(); }
  });
  idx.push({
    type: 'action', icon: '📐', name: 'Storleksguide',
    meta: 'Hitta rätt storlek på kläder',
    keywords: 'storlek size guide mått cm',
    action: () => { closeAISpotlight(); openSizeGuide('man'); }
  });
  idx.push({
    type: 'action', icon: '📱', name: 'Öppna Indoor Distance-appen',
    meta: 'Starta kameramätningen',
    keywords: 'app appen open öppna starta',
    action: () => { window.location.href = '../Indoor distance app/indoor_distance_pro (1).html'; }
  });
  return idx;
}

function normaliseSearch(s) {
  return (s||'').toLowerCase().replace(/[åäæ]/g,'a').replace(/[öø]/g,'o').replace(/é/g,'e').replace(/[^a-z0-9 ]/g,' ').trim();
}

// Simple natural-language Q&A — matches common questions to direct answers
function aiAnswer(query) {
  const q = normaliseSearch(query);
  if (!q || q.length < 3) return null;
  // Price questions
  if (/(vad kostar|hur mycket|pris|kostar).*(klubb)/.test(q))
    return '<strong>Klubbkonto</strong>: 1 000 kr/mån, 2 500 kr halv säsong, eller 4 500 kr hel säsong.';
  if (/(vad kostar|hur mycket|pris|kostar).*(individuell|personlig)/.test(q))
    return '<strong>Individuell</strong>: 200 kr/mån, 350 kr halv säsong, eller 650 kr hel säsong.';
  if (/(vad kostar|hur mycket|pris|kostar).*(reklam|budget|billig)/.test(q))
    return '<strong>Med reklam</strong>: 100 kr/mån, 200 kr halv säsong, eller 350 kr hel säsong.';
  // Payment
  if (/(hur betalar|betala|betalning|swish)/.test(q))
    return 'Vi tar emot betalning via <strong>Swish: 076 396 88 61</strong>. Klubbar kan även betala med faktura.';
  // Accuracy
  if (/(hur exakt|noggrannhet|precision|fel|m.tningen)/.test(q))
    return 'Standardprecision är <strong>1,5 meter</strong>. Med kalibrering når du ner till <strong>~1 meter</strong>.';
  // Disciplines
  if (/(vilka grenar|grenar|diskus|sl.gga|spjut|kula)/.test(q))
    return 'Vi stödjer <strong>spjut, diskus, slägga och kula</strong>. Varje gren har en egen fysik-modell.';
  // Phone
  if (/(telefon|phone|smartphone|enhet|krav)/.test(q))
    return 'Vilken modern smartphone som helst med kamera fungerar. Inga sensorer eller extra utrustning behövs.';
  // Shop
  if (/(butik|shop|s.lja|merch|n.r.*s.lja)/.test(q))
    return 'Butiken är ännu inte öppen — vi förbereder lansering av merch under 2026. Skriv upp dig på nyhetsbrevet för att få besked.';
  // Cancel
  if (/(avsluta|sluta|cancel|avbryta|s.ga upp)/.test(q))
    return 'Du kan avsluta när som helst. Inga bindningstider — prenumerationen förnyas inte utan ditt godkännande.';
  // Shipping
  if (/(frakt|leverans|skicka|postnord|hur lång tid)/.test(q))
    return 'Frakt: 49 kr inom Sverige, <strong>gratis över 500 kr</strong>. Levereras 3-5 arbetsdagar via PostNord.';
  return null;
}

function runAISearch(query) {
  const resultsEl = document.getElementById('aiSpotlightResults');
  if (!resultsEl) return;
  const q = (query || '').trim();
  if (!q) {
    // Show suggestions
    aiSpotlightItems = [];
    resultsEl.innerHTML = `
      <div class="ai-spotlight-empty">
        <div class="ai-spotlight-empty-icon">✨</div>
        <p>${t('search.askAI', getLang())}</p>
        <div class="ai-spotlight-suggestions">
          <button onclick="runAISearch('priser klubb')">💰 Klubbpris</button>
          <button onclick="runAISearch('hoodie')">👕 Visa hoodies</button>
          <button onclick="runAISearch('hur exakt')">🎯 Hur exakt?</button>
          <button onclick="runAISearch('appen')">📱 Visa appen</button>
          <button onclick="runAISearch('kontakt')">✉️ Kontakta</button>
          <button onclick="runAISearch('betalning')">💳 Betalning</button>
        </div>
      </div>`;
    return;
  }
  const nq = normaliseSearch(q);
  const tokens = nq.split(/\s+/).filter(Boolean);
  // Build index if not cached or stale
  if (!aiSpotlightItems._index) {
    aiSpotlightItems._index = buildSpotlightIndex();
  }
  const index = aiSpotlightItems._index;
  // Score each item
  const scored = index.map(it => {
    const text = normaliseSearch(it.name + ' ' + it.meta + ' ' + it.keywords);
    let score = 0;
    tokens.forEach(tok => {
      if (text.includes(tok)) score += 10;
      // Partial / substring
      const words = text.split(/\s+/);
      words.forEach(w => {
        if (w.startsWith(tok) && w !== tok) score += 4;
      });
    });
    // Bonus for name match
    const nameNorm = normaliseSearch(it.name);
    tokens.forEach(tok => { if (nameNorm.includes(tok)) score += 8; });
    return { it, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 8);

  aiSpotlightItems = scored.map(x => x.it);
  aiSpotlightHighlight = 0;

  // Check for direct AI answer
  const answer = aiAnswer(q);
  let html = '';
  if (answer) {
    html += `
      <div class="ai-spotlight-answer">
        <div class="ai-spotlight-answer-lbl">
          <span>✨</span> AI-svar
        </div>
        <div class="ai-spotlight-answer-text">${answer}</div>
      </div>`;
  }
  if (scored.length === 0 && !answer) {
    html = `<div class="ai-spotlight-empty"><div class="ai-spotlight-empty-icon">🤷</div><p>${t('search.noResults', getLang())}</p></div>`;
  } else if (scored.length) {
    // Group by type for nicer display
    const byType = {};
    scored.forEach(({it}, idx) => {
      if (!byType[it.type]) byType[it.type] = [];
      byType[it.type].push({ it, idx });
    });
    const typeLabels = { product:'Produkter', plan:'Planer', section:'Sektioner', faq:'Frågor', action:'Genvägar' };
    const order = ['action','section','plan','product','faq'];
    order.forEach(type => {
      if (!byType[type]) return;
      html += `<div class="ai-spotlight-section">${typeLabels[type]}</div>`;
      byType[type].forEach(({ it, idx }) => {
        html += `
          <div class="ai-spotlight-result ${idx===0?'highlighted':''}" data-idx="${idx}" onclick="executeSpotlightItem(${idx})" onmouseover="highlightSpotlight(${idx})">
            <div class="ai-spotlight-result-icon">${it.icon}</div>
            <div class="ai-spotlight-result-info">
              <div class="ai-spotlight-result-name">${it.name}</div>
              <div class="ai-spotlight-result-meta">${it.meta||''}</div>
            </div>
            <div class="ai-spotlight-result-arrow">↵</div>
          </div>`;
      });
    });
  }
  resultsEl.innerHTML = html;
}

function executeSpotlightItem(idx) {
  const item = aiSpotlightItems[idx];
  if (item && item.action) item.action();
}
function highlightSpotlight(idx) {
  aiSpotlightHighlight = idx;
  document.querySelectorAll('.ai-spotlight-result').forEach((el, i) => {
    el.classList.toggle('highlighted', parseInt(el.getAttribute('data-idx')) === idx);
  });
}
function aiSpotlightKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (aiSpotlightItems.length) {
      aiSpotlightHighlight = (aiSpotlightHighlight + 1) % aiSpotlightItems.length;
      highlightSpotlight(aiSpotlightHighlight);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (aiSpotlightItems.length) {
      aiSpotlightHighlight = (aiSpotlightHighlight - 1 + aiSpotlightItems.length) % aiSpotlightItems.length;
      highlightSpotlight(aiSpotlightHighlight);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    executeSpotlightItem(aiSpotlightHighlight);
  } else if (e.key === 'Escape') {
    closeAISpotlight();
  }
}
function openAISpotlight() {
  const m = document.getElementById('aiSpotlight');
  if (!m) return;
  m.classList.add('open');
  setTimeout(() => {
    const inp = document.getElementById('aiSpotlightInput');
    if (inp) { inp.value = ''; inp.focus(); }
    runAISearch('');
  }, 50);
}
function closeAISpotlight() {
  const m = document.getElementById('aiSpotlight');
  if (m) m.classList.remove('open');
}

// Keyboard shortcut: Cmd/Ctrl + K opens spotlight
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openAISpotlight();
  }
});

// ═══════════════════════════════════════════════════════════
//  MOBILE MENU
// ═══════════════════════════════════════════════════════════
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('mobileMenuOverlay').classList.toggle('open');
  document.getElementById('mobileMenuBtn').classList.toggle('open');
  document.body.classList.toggle('menu-open');
}
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('mobileMenuOverlay').classList.remove('open');
  document.getElementById('mobileMenuBtn').classList.remove('open');
  document.body.classList.remove('menu-open');
}

// ═══════════════════════════════════════════════════════════
//  SIZE GUIDE MODAL
// ═══════════════════════════════════════════════════════════
let sizeGuideActive = 'man';
let sgPicks = { shoulders: null, waist: null, fit: null }; // wizard state

function openSizeGuide(category) {
  // If called from product modal, default to that product's size category
  if (!category && modalProduct && modalProduct.sizeCategory) {
    category = modalProduct.sizeCategory;
  }
  if (!category || !SIZE_GUIDE[category]) category = 'man';
  sizeGuideActive = category;
  renderSizeGuideTabs();
  renderSizeGuideTable();
  // Reset wizard state
  sgPicks = { shoulders: null, waist: null, fit: null };
  const heightInput = document.getElementById('sgHeight');
  if (heightInput) heightInput.value = '';
  document.querySelectorAll('.sg-option.selected').forEach(b => b.classList.remove('selected'));
  const resultEl = document.getElementById('sgResult');
  if (resultEl) resultEl.style.display = 'none';
  document.getElementById('sizeGuideModal').classList.add('open');
  // Pre-fill height if user has saved profile data
  try {
    const profile = JSON.parse(localStorage.getItem('id_user_profile') || '{}');
    if (profile.height && heightInput) heightInput.value = profile.height;
  } catch(e) {}
}
function closeSizeGuide() {
  document.getElementById('sizeGuideModal').classList.remove('open');
}

// Wizard option selector
function selectSgOption(group, value, btn) {
  sgPicks[group] = value;
  // Highlight selected in this group
  const groupEl = btn.parentElement;
  groupEl.querySelectorAll('.sg-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  updateSizeRec();
}

// Calculate recommended size
function updateSizeRec() {
  const height = parseInt(document.getElementById('sgHeight')?.value);
  if (!height || isNaN(height) || height < 80 || height > 220) {
    document.getElementById('sgResult').style.display = 'none';
    return;
  }
  // Need at least 2 wizard picks to recommend
  const pickCount = Object.values(sgPicks).filter(Boolean).length;
  if (pickCount < 2) {
    document.getElementById('sgResult').style.display = 'none';
    return;
  }
  const rec = calculateSize(height, sgPicks, sizeGuideActive);
  document.getElementById('sgResultSize').textContent = rec.size;
  document.getElementById('sgResultCat').textContent = rec.category;
  document.getElementById('sgResultReason').innerHTML = rec.reason;
  document.getElementById('sgResult').style.display = 'block';
  // Auto-select on product if modal also open
  if (modalProduct && modalProduct.sizes && modalProduct.sizes.includes(rec.size)) {
    if (typeof selectSize === 'function') {
      // Don't auto-trigger to avoid confusion, just visually highlight
    }
  }
}

function calculateSize(height, picks, category) {
  // Determine base category from height + picks
  const cat = category || 'man';
  let sizes, catLabel;

  // Choose size set + label
  if (cat.includes('barn') || height < 110) {
    sizes = ['1-2 år','3-4 år'];
    catLabel = 'Barn';
    // Pick by height alone for kids
    const sz = height < 95 ? '1-2 år' : '3-4 år';
    return {
      size: sz,
      category: catLabel,
      reason: `Baserat på din längd <strong>${height} cm</strong>. För barn väljer vi storlek främst efter längd.`
    };
  }
  if (cat.includes('ungdom') || (height >= 110 && height < 165)) {
    sizes = ['S','M','L','XL','XXL'];
    catLabel = 'Ungdom';
  } else if (cat === 'kvinna') {
    sizes = ['S','M','L','XL','XXL'];
    catLabel = 'Dam';
  } else if (cat.includes('hoodie')) {
    sizes = cat.includes('vuxen') ? ['S','M','L','XL','XXL']
          : cat.includes('ungdom') ? ['S','M','L','XL']
          : ['1-2 år','3-4 år'];
    catLabel = cat.includes('vuxen') ? 'Vuxen huvtröja' : cat.includes('ungdom') ? 'Ungdom huvtröja' : 'Barn huvtröja';
  } else {
    sizes = ['S','M','L','XL','XXL'];
    catLabel = 'Herr';
  }

  // Map height + body type to size index
  // Base index from height
  let idx;
  if (height < 160)       idx = 0;       // S
  else if (height < 170)  idx = 0.5;     // S/M
  else if (height < 178)  idx = 1;       // M
  else if (height < 185)  idx = 2;       // L
  else if (height < 192)  idx = 3;       // XL
  else                    idx = 4;       // XXL

  // Adjust for shoulders (broader = up 1 size)
  if (picks.shoulders === 'broad')   idx += 1;
  if (picks.shoulders === 'narrow')  idx -= 0.5;
  // Adjust for waist
  if (picks.waist === 'wide')    idx += 0.5;
  if (picks.waist === 'narrow')  idx -= 0.5;
  // Adjust for fit
  if (picks.fit === 'tight')  idx -= 0.5;
  if (picks.fit === 'loose')  idx += 1;
  if (picks.fit === 'normal') idx += 0;

  // Round to nearest valid index
  idx = Math.max(0, Math.min(sizes.length - 1, Math.round(idx)));
  const size = sizes[idx];

  // Build reason text
  const reasons = [];
  reasons.push(`<strong>${height} cm</strong> + `);
  const parts = [];
  if (picks.shoulders) parts.push({
    narrow: 'smala axlar',
    normal: 'normala axlar',
    broad: 'breda axlar'
  }[picks.shoulders]);
  if (picks.waist) parts.push({
    narrow: 'smal midja',
    normal: 'normal midja',
    wide: 'rundare midja'
  }[picks.waist]);
  if (picks.fit) parts.push({
    tight: 'tajt passform',
    normal: 'normal passform',
    loose: 'lös passform'
  }[picks.fit]);
  return {
    size,
    category: catLabel,
    reason: reasons.join('') + parts.join(' + ') + ` → <strong>${size}</strong> ger dig den passform du letar efter.`
  };
}

function toggleSgTable() {
  const det = document.getElementById('sgTableDetails');
  if (det) det.open = !det.open;
  if (det && det.open) det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function renderSizeGuideTabs() {
  const tabs = document.getElementById('sizeGuideTabs');
  tabs.innerHTML = Object.keys(SIZE_GUIDE).map(cat => `
    <button class="size-tab ${cat===sizeGuideActive?'active':''}" onclick="switchSizeGuideTab('${cat}')">
      ${SIZE_GUIDE[cat].title}
    </button>
  `).join('');
}
function switchSizeGuideTab(cat) {
  sizeGuideActive = cat;
  renderSizeGuideTabs();
  renderSizeGuideTable();
}
function renderSizeGuideTable() {
  const data = SIZE_GUIDE[sizeGuideActive];
  if (!data) return;
  const table = document.getElementById('sizeGuideTable');
  table.innerHTML = `
    <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>
      ${data.rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

// ═══════════════════════════════════════════════════════════
//  EMAIL TEMPLATES (welcome + auto-reply)
// ═══════════════════════════════════════════════════════════

// Reusable circular brand logo SVG (INDOOR + D + DISTANCE)
function brandLogoSVG(color = '#DCD0BC') {
  return `
    <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="eml_t_${Math.random().toString(36).slice(2,7)}" d="M 18,52 A 32,32 0 0,1 82,52" fill="none"/>
        <path id="eml_b_${Math.random().toString(36).slice(2,7)}" d="M 82,48 A 32,32 0 0,1 18,48" fill="none"/>
      </defs>
      <text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="2.4" fill="${color}">
        <textPath href="#eml_t" startOffset="50%" text-anchor="middle">INDOOR</textPath>
      </text>
      <text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="1.8" fill="${color}">
        <textPath href="#eml_b" startOffset="50%" text-anchor="middle">DISTANCE</textPath>
      </text>
      <text x="50" y="64" font-family="Georgia,serif" font-weight="700" font-size="44" text-anchor="middle" fill="${color}">D</text>
    </svg>
  `;
}
// Simpler version with fixed IDs (for the 3 email templates — same page so we use unique IDs)
const BRAND_SVG_WELCOME = `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><path id="bwT" d="M 18,52 A 32,32 0 0,1 82,52" fill="none"/><path id="bwB" d="M 82,48 A 32,32 0 0,1 18,48" fill="none"/></defs><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="2.4" fill="currentColor"><textPath href="#bwT" startOffset="50%" text-anchor="middle">INDOOR</textPath></text><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="1.8" fill="currentColor"><textPath href="#bwB" startOffset="50%" text-anchor="middle">DISTANCE</textPath></text><text x="50" y="64" font-family="Georgia,serif" font-weight="700" font-size="44" text-anchor="middle" fill="currentColor">D</text></svg>`;
const BRAND_SVG_ORDER = `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><path id="boT" d="M 18,52 A 32,32 0 0,1 82,52" fill="none"/><path id="boB" d="M 82,48 A 32,32 0 0,1 18,48" fill="none"/></defs><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="2.4" fill="currentColor"><textPath href="#boT" startOffset="50%" text-anchor="middle">INDOOR</textPath></text><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="1.8" fill="currentColor"><textPath href="#boB" startOffset="50%" text-anchor="middle">DISTANCE</textPath></text><text x="50" y="64" font-family="Georgia,serif" font-weight="700" font-size="44" text-anchor="middle" fill="currentColor">D</text></svg>`;
const BRAND_SVG_AUTOREPLY = `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><path id="brT" d="M 18,52 A 32,32 0 0,1 82,52" fill="none"/><path id="brB" d="M 82,48 A 32,32 0 0,1 18,48" fill="none"/></defs><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="2.4" fill="currentColor"><textPath href="#brT" startOffset="50%" text-anchor="middle">INDOOR</textPath></text><text font-family="Georgia,serif" font-size="9" font-weight="600" letter-spacing="1.8" fill="currentColor"><textPath href="#brB" startOffset="50%" text-anchor="middle">DISTANCE</textPath></text><text x="50" y="64" font-family="Georgia,serif" font-weight="700" font-size="44" text-anchor="middle" fill="currentColor">D</text></svg>`;

let _lastEmailRecipient = '';
function emailWelcomeHTML(name) {
  const L = getLang();
  const greeting = { sv:`Hej${name?' '+name:''}!`, en:`Hi${name?' '+name:''}!`, no:`Hei${name?' '+name:''}!`, da:`Hej${name?' '+name:''}!`, de:`Hallo${name?' '+name:''}!`, fr:`Bonjour${name?' '+name:''} !` }[L] || `Hej${name?' '+name:''}!`;
  const intro = {
    sv:'Tack för att du gick med på vår resa för att förenkla träningen för aktiva och tränare.',
    en:'Thank you for joining our journey to simplify training for athletes and coaches.',
    no:'Takk for at du ble med på reisen vår for å forenkle treningen for utøvere og trenere.',
    da:'Tak fordi du sluttede dig til vores rejse for at forenkle træningen for atleter og trænere.',
    de:'Danke, dass du Teil unserer Reise wirst, das Training für Athleten und Trainer zu vereinfachen.',
    fr:'Merci de rejoindre notre aventure pour simplifier l\'entraînement des athlètes et entraîneurs.'
  }[L];
  const tagline = {
    sv:'Tillsammans gör vi friidrott mer rättvis och tillgänglig för alla — så att alla barn och vuxna kan följa sina drömmar.',
    en:'Together we make athletics more fair and accessible to everyone — so children and adults can follow their dreams.',
    no:'Sammen gjør vi friidrett mer rettferdig og tilgjengelig for alle — så barn og voksne kan følge drømmene sine.',
    da:'Sammen gør vi friidrætten mere retfærdig og tilgængelig for alle — så børn og voksne kan følge deres drømme.',
    de:'Gemeinsam machen wir Leichtathletik fairer und zugänglicher — damit Kinder und Erwachsene ihre Träume verfolgen können.',
    fr:'Ensemble nous rendons l\'athlétisme plus juste et accessible — pour que enfants et adultes suivent leurs rêves.'
  }[L];
  const features = {
    sv:[['🎯','Exakthet','Vi erbjuder ett mätinstrument med hög precision för dina kast — direkt feedback från kameran.'],
        ['📚','Underlätta utlärning','Förenklar träningen för både aktiva och tränare — hastighet, vinkel och längd på en knapptryckning.'],
        ['🤝','Tillgänglighet','Ett verktyg alla kan ta del av — från eliten till nybörjare.']],
    en:[['🎯','Accuracy','A precise measurement tool for your throws — instant feedback from the camera.'],
        ['📚','Easier learning','Simplifies training for athletes and coaches — speed, angle and length at a tap.'],
        ['🤝','Accessibility','A tool everyone can use — from elite to beginner.']],
    no:[['🎯','Presisjon','Et presist måleinstrument for kastene dine — øyeblikkelig tilbakemelding fra kameraet.'],
        ['📚','Enklere læring','Forenkler treningen for utøvere og trenere — hastighet, vinkel og lengde med ett trykk.'],
        ['🤝','Tilgjengelighet','Et verktøy alle kan bruke — fra elite til nybegynner.']],
    da:[['🎯','Præcision','Et præcist måleinstrument til dine kast — øjeblikkelig feedback fra kameraet.'],
        ['📚','Lettere læring','Forenkler træningen for atleter og trænere — hastighed, vinkel og længde med et tryk.'],
        ['🤝','Tilgængelighed','Et værktøj alle kan bruge — fra elite til begynder.']],
    de:[['🎯','Genauigkeit','Ein präzises Messwerkzeug für deine Würfe — sofortiges Feedback von der Kamera.'],
        ['📚','Einfacheres Lernen','Vereinfacht das Training — Geschwindigkeit, Winkel und Länge per Tastendruck.'],
        ['🤝','Zugänglichkeit','Ein Werkzeug für alle — von Elite bis Anfänger.']],
    fr:[['🎯','Précision','Un outil de mesure précis pour vos lancers — retour instantané depuis la caméra.'],
        ['📚','Apprentissage facilité','Simplifie l\'entraînement — vitesse, angle et longueur en une touche.'],
        ['🤝','Accessibilité','Un outil pour tous — de l\'élite au débutant.']]
  }[L];
  const visit = { sv:'Besök webbplatsen', en:'Visit the website', no:'Besøk nettstedet', da:'Besøg hjemmesiden', de:'Webseite besuchen', fr:'Visiter le site' }[L];
  const facilities = { sv:'Våra styrkor', en:'Our strengths', no:'Våre styrker', da:'Vores styrker', de:'Unsere Stärken', fr:'Nos atouts' }[L];
  const moreInfo = {
    sv:'Besök <a href="https://www.indoordistance.se">www.indoordistance.se</a> eller kontakta oss på <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> för mer information.',
    en:'Visit <a href="https://www.indoordistance.se">www.indoordistance.se</a> or contact us at <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> for more details.',
    no:'Besøk <a href="https://www.indoordistance.se">www.indoordistance.se</a> eller kontakt oss på <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> for mer informasjon.',
    da:'Besøg <a href="https://www.indoordistance.se">www.indoordistance.se</a> eller kontakt os på <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> for mere information.',
    de:'Besuche <a href="https://www.indoordistance.se">www.indoordistance.se</a> oder schreibe an <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> für mehr Informationen.',
    fr:'Visitez <a href="https://www.indoordistance.se">www.indoordistance.se</a> ou contactez-nous à <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a> pour plus de détails.'
  }[L];
  const footer = { sv:'© 2026 Indoor Distance · Rödalidsvägen 4, Göteborg, Sverige',
                   en:'© 2026 Indoor Distance · Rödalidsvägen 4, Gothenburg, Sweden',
                   no:'© 2026 Indoor Distance · Rödalidsvägen 4, Gøteborg, Sverige',
                   da:'© 2026 Indoor Distance · Rödalidsvägen 4, Göteborg, Sverige',
                   de:'© 2026 Indoor Distance · Rödalidsvägen 4, Göteborg, Schweden',
                   fr:'© 2026 Indoor Distance · Rödalidsvägen 4, Göteborg, Suède' }[L];
  return `
    <div class="email-tpl">
      <div class="email-tpl-hero">
        <div class="email-tpl-mark">D</div>
        <h2>${greeting}</h2>
        <p>${intro}</p>
        <a href="https://www.indoordistance.se" class="email-tpl-btn">${visit}</a>
      </div>
      <div class="email-tpl-section">
        <h3>${facilities}</h3>
        ${features.map(f => `
          <div class="email-tpl-feature">
            <div class="email-tpl-feature-icon">${f[0]}</div>
            <div>
              <strong>${f[1]}</strong>
              <p>${f[2]}</p>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="email-tpl-quote">${tagline}</div>
      <div class="email-tpl-foot">
        <p>${moreInfo}</p>
        <div class="email-tpl-fineprint">${footer}</div>
      </div>
    </div>
  `;
}

function emailOrderHTML(orderNum, total, customer, order) {
  const L = getLang();
  const greeting = { sv:`Hej ${customer.name.split(' ')[0]}!`, en:`Hi ${customer.name.split(' ')[0]}!`, no:`Hei ${customer.name.split(' ')[0]}!`, da:`Hej ${customer.name.split(' ')[0]}!`, de:`Hallo ${customer.name.split(' ')[0]}!`, fr:`Bonjour ${customer.name.split(' ')[0]} !` }[L];
  const thanks = { sv:'Tack för din beställning!', en:'Thanks for your order!', no:'Takk for bestillingen!', da:'Tak for din bestilling!', de:'Danke für deine Bestellung!', fr:'Merci pour votre commande !' }[L];
  const orderLine = { sv:`Order <strong>#${orderNum}</strong>`, en:`Order <strong>#${orderNum}</strong>`, no:`Bestilling <strong>#${orderNum}</strong>`, da:`Ordre <strong>#${orderNum}</strong>`, de:`Bestellung <strong>#${orderNum}</strong>`, fr:`Commande <strong>#${orderNum}</strong>` }[L];
  const itemsHdr = { sv:'Det här har du beställt', en:'Your items', no:'Det du har bestilt', da:'Dette har du bestilt', de:'Deine Artikel', fr:'Vos articles' }[L];
  const shipHdr = { sv:'Leverans', en:'Shipping', no:'Levering', da:'Levering', de:'Versand', fr:'Livraison' }[L];
  const swishHdr = { sv:'Betalning via Swish', en:'Payment via Swish', no:'Betaling via Swish', da:'Betaling via Swish', de:'Zahlung per Swish', fr:'Paiement via Swish' }[L];
  const totalLbl = { sv:'Totalt', en:'Total', no:'Totalt', da:'Total', de:'Gesamt', fr:'Total' }[L];
  const trackingNote = { sv:`Vi bekräftar Swish-betalningen och skickar spårningsnummer inom <strong>24 timmar</strong> till <strong>${customer.email}</strong>.`,
                          en:`We'll confirm the Swish payment and send a tracking number within <strong>24 hours</strong> to <strong>${customer.email}</strong>.`,
                          no:`Vi bekrefter Swish-betalingen og sender sporingsnummer innen <strong>24 timer</strong> til <strong>${customer.email}</strong>.`,
                          da:`Vi bekræfter Swish-betalingen og sender sporingsnummer inden for <strong>24 timer</strong> til <strong>${customer.email}</strong>.`,
                          de:`Wir bestätigen die Swish-Zahlung und senden eine Sendungsnummer innerhalb von <strong>24 Std.</strong> an <strong>${customer.email}</strong>.`,
                          fr:`Nous confirmons le paiement Swish et envoyons un numéro de suivi sous <strong>24h</strong> à <strong>${customer.email}</strong>.` }[L];
  const swishMsg = { sv:`Skriv <strong>${orderNum}</strong> som meddelande när du Swishar.`,
                      en:`Use <strong>${orderNum}</strong> as the Swish message.`,
                      no:`Bruk <strong>${orderNum}</strong> som Swish-melding.`,
                      da:`Brug <strong>${orderNum}</strong> som Swish-besked.`,
                      de:`Verwende <strong>${orderNum}</strong> als Swish-Nachricht.`,
                      fr:`Utilisez <strong>${orderNum}</strong> comme message Swish.` }[L];
  const deliveryNote = { sv:'Leverans inom 3-5 arbetsdagar via PostNord. Vi mejlar dig så fort paketet är på väg!',
                          en:'Delivery within 3-5 business days via PostNord. We\'ll email you as soon as the package ships!',
                          no:'Levering innen 3-5 virkedager via PostNord. Vi sender mail når pakken er på vei!',
                          da:'Levering inden for 3-5 hverdage via PostNord. Vi mailer dig så snart pakken er på vej!',
                          de:'Lieferung innerhalb 3-5 Werktagen über PostNord. Wir mailen dich, sobald das Paket unterwegs ist!',
                          fr:'Livraison sous 3-5 jours ouvrés via PostNord. Nous vous écrirons dès que le colis est expédié !' }[L];
  const careNote = { sv:'Tvättråd: 30°C maskintvätt, vänd avigt. Ingen torktumling — det förlänger livslängden på trycket.',
                      en:'Care: 30°C machine wash inside-out. No tumble dry — keeps the print sharp longer.',
                      no:'Pleie: 30°C vask, vrang. Ingen tørketrommel — bevarer trykket bedre.',
                      da:'Pleje: 30°C vask, vrang. Ingen tørretumbler — bevarer trykket.',
                      de:'Pflege: 30°C Maschinenwäsche, auf links. Nicht trocknergeeignet — schont den Druck.',
                      fr:'Entretien : machine 30°C, à l\'envers. Pas de sèche-linge — préserve l\'impression.' }[L];
  const careHdr = { sv:'Tvätt & vård', en:'Care', no:'Pleie', da:'Pleje', de:'Pflege', fr:'Entretien' }[L];
  const questionsTxt = { sv:'Frågor? Maila oss på',
                          en:'Questions? Email us at',
                          no:'Spørsmål? Send mail til',
                          da:'Spørgsmål? Send mail til',
                          de:'Fragen? Schreib uns an',
                          fr:'Questions ? Écrivez-nous à' }[L];
  const items = (order && order.items) || [];
  return `
    <div class="email-tpl">
      <div class="email-tpl-hero">
        <div class="email-tpl-mark">D</div>
        <h2>${greeting}</h2>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#FFF;margin-bottom:14px">${thanks}</p>
        <p style="font-size:13px;opacity:.85">${orderLine}</p>
      </div>

      <div class="email-tpl-section">
        <h3>${itemsHdr}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
          ${items.map(item => `
            <tr style="border-bottom:1px solid rgba(0,0,0,0.06)">
              <td style="padding:10px 0;width:60px">
                <div style="width:48px;height:48px;background:rgba(220,208,188,0.18);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-style:italic;color:#A89572;font-weight:700;font-size:20px">D</div>
              </td>
              <td style="padding:10px 8px">
                <strong style="font-size:13px;color:#1a1a1a">${item.name}</strong><br>
                <span style="font-size:11px;color:#777">${item.size ? 'Storlek: '+item.size+' · ' : ''}Antal: ${item.qty}</span>
              </td>
              <td style="padding:10px 0;text-align:right;font-family:Georgia,serif;font-style:italic;color:#B69861;font-weight:600">${item.price * item.qty} kr</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="2" style="padding:14px 0 4px;font-weight:700;color:#1a1a1a">${totalLbl}</td>
            <td style="padding:14px 0 4px;text-align:right;font-family:Georgia,serif;font-style:italic;font-size:20px;color:#B69861;font-weight:700">${total} kr</td>
          </tr>
        </table>
      </div>

      <div class="email-tpl-section" style="padding-top:0">
        <h3>${swishHdr}</h3>
        <div style="background:linear-gradient(135deg, rgba(220,208,188,0.20), rgba(220,208,188,0.08));border:1px solid rgba(220,208,188,0.30);border-radius:12px;padding:18px 22px;text-align:center">
          <div style="font-size:11px;letter-spacing:0.2em;color:#777;font-weight:700;margin-bottom:6px">SWISH</div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#1a1a1a;font-weight:700;margin-bottom:8px">076 396 88 61</div>
          <div style="font-size:12px;color:#555">${swishMsg}</div>
        </div>
        <p style="font-size:12px;color:#555;margin-top:14px;line-height:1.55">${trackingNote}</p>
      </div>

      <div class="email-tpl-section" style="padding-top:0">
        <h3>${shipHdr}</h3>
        <div style="display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid #eee;border-radius:10px;padding:14px 16px">
          <div style="font-size:22px">📦</div>
          <div>
            <strong style="font-size:13px;color:#1a1a1a">${customer.name}</strong><br>
            <span style="font-size:12px;color:#666;line-height:1.55">${customer.address || ''}</span>
            <p style="font-size:11px;color:#888;margin-top:8px;line-height:1.5">${deliveryNote}</p>
          </div>
        </div>
      </div>

      <div class="email-tpl-section" style="padding-top:0">
        <h3>${careHdr}</h3>
        <p style="font-size:12px;color:#555;line-height:1.6">🧺 ${careNote}</p>
      </div>

      <div class="email-tpl-quote">"${{sv:'Vi gör verktyg som hjälper ungdomar nå sin fulla potential.',en:'We make tools that help young athletes reach their full potential.',no:'Vi lager verktøy som hjelper unge nå sitt fulle potensial.',da:'Vi laver værktøjer der hjælper unge nå deres fulde potentiale.',de:'Wir machen Werkzeuge, die jungen Athleten helfen, ihr volles Potenzial zu erreichen.',fr:'Nous créons des outils pour aider les jeunes à atteindre leur plein potentiel.'}[L]}"</div>

      <div class="email-tpl-foot">
        <p style="font-size:12px;color:#555">${questionsTxt} <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a></p>
        <div class="email-tpl-fineprint">© 2026 Indoor Distance · Rödalidsvägen 4, Göteborg</div>
      </div>
    </div>
  `;
}

function emailAutoReplyHTML(name) {
  const L = getLang();
  const greeting = { sv:`Hej${name?' '+name:''}!`, en:`Hi${name?' '+name:''}!`, no:`Hei${name?' '+name:''}!`, da:`Hej${name?' '+name:''}!`, de:`Hallo${name?' '+name:''}!`, fr:`Bonjour${name?' '+name:''} !` }[L];
  const intro = { sv:'Tack för att du kontaktade oss.',
                  en:'Thank you for reaching out to us.',
                  no:'Takk for at du tok kontakt.',
                  da:'Tak fordi du kontaktede os.',
                  de:'Danke, dass du uns kontaktiert hast.',
                  fr:'Merci de nous avoir contactés.' }[L];
  const working = { sv:'Vi arbetar flitigt för att besvara dina frågor så snart som möjligt.',
                    en:'We are diligently working to address your questions as promptly as possible.',
                    no:'Vi jobber flittig med å svare på spørsmålene dine så raskt som mulig.',
                    da:'Vi arbejder flittigt på at besvare dine spørgsmål så hurtigt som muligt.',
                    de:'Wir arbeiten daran, deine Fragen so schnell wie möglich zu beantworten.',
                    fr:'Nous travaillons diligemment pour répondre à vos questions rapidement.' }[L];
  const back = { sv:'Vi återkommer inom 24 timmar. Under tiden kan du utforska webbplatsen för mer information.',
                 en:'We\'ll return within 24 hours. In the meantime, please revisit our website for more information.',
                 no:'Vi kommer tilbake innen 24 timer. I mellomtiden kan du utforske nettsiden for mer informasjon.',
                 da:'Vi vender tilbage inden for 24 timer. I mellemtiden kan du udforske hjemmesiden for mere information.',
                 de:'Wir melden uns innerhalb von 24 Std. Schau bis dahin gerne auf unserer Webseite vorbei.',
                 fr:'Nous reviendrons sous 24h. En attendant, n\'hésitez pas à explorer notre site.' }[L];
  const help = { sv:'Behöver du hjälp?', en:'Need help?', no:'Trenger du hjelp?', da:'Brug for hjælp?', de:'Brauchst du Hilfe?', fr:'Besoin d\'aide ?' }[L];
  const phoneTxt = { sv:'Ring oss på', en:'Call us at', no:'Ring oss på', da:'Ring til os på', de:'Ruf uns an', fr:'Appelez-nous au' }[L];
  return `
    <div class="email-tpl">
      <div class="email-tpl-hero">
        <div class="email-tpl-mark">D</div>
        <h2>${greeting}</h2>
        <p>${intro}</p>
        <p>${working}</p>
        <a href="https://www.indoordistance.se" class="email-tpl-btn">${{sv:'Tillbaka till webbplatsen',en:'Back to website',no:'Tilbake til nettstedet',da:'Tilbage til hjemmesiden',de:'Zurück zur Webseite',fr:'Retour au site'}[L]}</a>
      </div>
      <div class="email-tpl-section">
        <p>${back}</p>
        <h3>${help}</h3>
        <p>${phoneTxt} <strong>076-396 88 61</strong><br>
        <a href="mailto:info.indoordistance@gmail.com">info.indoordistance@gmail.com</a></p>
      </div>
      <div class="email-tpl-foot">
        <div class="email-tpl-fineprint">Rödalidsvägen 4, Göteborg · © 2026 Indoor Distance</div>
      </div>
    </div>
  `;
}

let _activeEmail = null;
function showWelcomeEmailModal(email) {
  _lastEmailRecipient = email;
  _activeEmail = 'welcome';
  const L = getLang();
  const subject = { sv:'Välkommen till Indoor Distance!', en:'Welcome to Indoor Distance!',
                    no:'Velkommen til Indoor Distance!', da:'Velkommen til Indoor Distance!',
                    de:'Willkommen bei Indoor Distance!', fr:'Bienvenue chez Indoor Distance !' }[L];
  document.getElementById('emailPreviewSubject').textContent = subject;
  document.getElementById('emailPreviewBody').innerHTML = emailWelcomeHTML('');
  document.getElementById('emailPreviewModal').classList.add('open');
  // Also fire toast
  showToast(t('toast.subscribed'));
}
function showOrderEmailModal(orderNum, total, customer, order) {
  _lastEmailRecipient = customer.email;
  _activeEmail = 'order';
  const L = getLang();
  const subject = { sv:`Beställning #${orderNum} bekräftad`, en:`Order #${orderNum} confirmed`,
                    no:`Bestilling #${orderNum} bekreftet`, da:`Ordre #${orderNum} bekræftet`,
                    de:`Bestellung #${orderNum} bestätigt`, fr:`Commande #${orderNum} confirmée` }[L];
  document.getElementById('emailPreviewSubject').textContent = subject;
  document.getElementById('emailPreviewBody').innerHTML = emailOrderHTML(orderNum, total, customer, order);
  document.getElementById('emailPreviewModal').classList.add('open');
}
function showAutoReplyModal(name, email) {
  _lastEmailRecipient = email;
  _activeEmail = 'autoreply';
  const L = getLang();
  const subject = { sv:'Vi har mottagit ditt meddelande', en:'We received your message',
                    no:'Vi har mottatt meldingen din', da:'Vi har modtaget din besked',
                    de:'Wir haben deine Nachricht erhalten', fr:'Message bien reçu' }[L];
  document.getElementById('emailPreviewSubject').textContent = subject;
  document.getElementById('emailPreviewBody').innerHTML = emailAutoReplyHTML(name);
  document.getElementById('emailPreviewModal').classList.add('open');
}
function closeEmailPreview() {
  document.getElementById('emailPreviewModal').classList.remove('open');
  _activeEmail = null;
}
function openMailto() {
  if (!_lastEmailRecipient) return closeEmailPreview();
  const subj = encodeURIComponent(document.getElementById('emailPreviewSubject').textContent);
  window.location.href = `mailto:${_lastEmailRecipient}?subject=${subj}`;
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Only run the homepage init if we're on the main index page
  // (admin.html and other pages reuse functions but not the init flow)
  const isHomepage = document.getElementById('productGrid') !== null;
  if (!isHomepage) return;

  // Loader
  const loader = document.getElementById('loader');
  if (loader) setTimeout(() => loader.classList.add('done'), 800);

  // Apply language before rendering products (filter names etc.)
  applyLang();

  renderProducts();
  updateCartUI();
  await handleOAuthReturn();
  if (getToken()) await loadUserDashboard();

  initScrollProgress();
  initMagnetic();
  initResaScene();
  initTimelineProgress();
  initSectionNav();
  initModalLockObserver();
  observeReveals();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart();
    closeProductModal();
    closeCheckout();
    closeOrderConfirm();
    closeSizeGuide();
    closeEmailPreview();
    closeMobileMenu();
    closeLangMenu();
    closeAISpotlight();
  }
});
