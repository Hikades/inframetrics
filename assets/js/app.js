'use strict';
/* InfraMetrics · lógica de la aplicación
   Orden del archivo: utilidades → datos → validación → sesión → vistas → router → eventos */

/* ===== Utilidades ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = ic(type === 'err' ? 'alert' : type === 'wa' ? 'warn' : 'check-circle') + '<span></span>'; t.lastChild.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 4500);
}

/* ===== Datos (una sola fuente para dashboard, flota, fichas y reportes) ===== */
const LABEL = { cr: 'Crítico', wa: 'Alerta', ok: 'Normal', gr: 'En taller' };
const TIPOS = { EX: 'Excavadoras', CF: 'Cargadores', VQ: 'Volquetes', TR: 'Tractores' };
const EQUIPOS = [
  ['EX-02', 'Excavadora 320', 'cr', 92, 3.2, 1850, 85, 'Frente 1', 6320, 'Marco Quispe'],
  ['CF-05', 'Cargador 950', 'wa', 88, 2.6, 1900, 72, 'Patio de acopio', 3970, 'Pedro Salas'],
  ['VQ-03', 'Volquete 770', 'ok', 76, 1.9, 2050, 18, 'Rampa 2', 5210, 'Jorge Vila'],
  ['TR-06', 'Tractor D6', 'wa', 86, 2.2, 1710, 28, 'Frente 3', 4110, 'Elena Paz'],
  ['EX-07', 'Excavadora 336', 'ok', 78, 1.1, 1720, 8, 'Cantera sur', 2310, 'Luis Rojas'],
  ['EX-01', 'Excavadora 320', 'ok', 71, 1.3, 1760, 10, 'Cantera sur', 1140, 'Ana Torres'],
  ['CF-01', 'Cargador 950', 'ok', 76, 1.0, 1680, 6, 'Patio de acopio', 1480, 'Carlos Mena'],
  ['VQ-05', 'Volquete 770', 'ok', 82, 1.4, 1980, 12, 'Rampa 1', 2760, 'Rosa Díaz'],
  ['TR-04', 'Tractor D6', 'ok', 74, 1.2, 1650, 12, 'Frente 3', 3340, 'Iván Cruz'],
  ['TR-12', 'Tractor D8', 'ok', 77, 1.0, 1620, 7, 'Frente 1', 980, 'Raúl Soto'],
  ['CF-08', 'Cargador 966', 'gr', 65, 0.8, 0, 5, 'Taller central', 2050, 'Sin operador'],
  ['VQ-09', 'Volquete 777', 'gr', 70, 0.9, 0, 9, 'Taller central', 6030, 'Sin operador'],
].map(([id, modelo, estado, temp, vib, rpm, prob, ubic, horo, op]) =>
  ({ id, modelo, estado, temp, vib, rpm, prob, ubic, horo, op, tipo: id.slice(0, 2) }));
const eq = id => EQUIPOS.find(e => e.id === id);
const LIM = { temp: 90, vib: 2.5 };
const THR0 = { a: 90, r: 105, v: 2.5, w: 5 };
const DAY = 864e5;

const DEF = () => ({
  paradas: {}, rates: {}, costo: 500, extra: 0, plan: false, tfa: true, comps: {},
  alertas: [
    { eq: 'EX-02', sev: 'cr', t: 'Temperatura del motor', d: '92 °C medidos · límite 90 °C', w: 'hace 4 min', f: '20 Oct', st: 0 },
    { eq: 'CF-05', sev: 'hi', t: 'Vibración', d: '2.6 mm/s medidos · límite 2.5 mm/s', w: 'hace 18 min', f: '20 Oct', st: 1 },
    { eq: 'VQ-03', sev: 'hi', t: 'Mantenimiento en 50 h', d: 'Cambio de frenos programado', w: 'hace 1 h', f: '19 Oct', st: 2 },
    { eq: 'TR-06', sev: 'lo', t: 'Vibración sostenida', d: '2.2 mm/s durante 20 minutos', w: 'hace 35 min', f: '18 Oct', st: 3 },
    { eq: 'EX-01', sev: 'lo', t: 'Refrigerante bajo', d: 'Se repuso 1.8 L', w: 'hace 5 h', f: '18 Oct', st: 3 },
    { eq: 'CF-08', sev: 'lo', t: 'Ingreso a taller', d: 'Cambio de aceite en curso', w: 'hace 3 h', f: '17 Oct', st: 2 },
  ],
  ots: [
    { eq: 'EX-02', t: 'Fuga hidráulica', col: 0, plazo: 22 }, { eq: 'VQ-09', t: 'Cambio de frenos', col: 1, plazo: 14 },
    { eq: 'CF-08', t: 'Cambio de aceite', col: 2, plazo: 6 }, { eq: 'EX-07', t: 'Revisión de transmisión', col: 3, plazo: 0 },
  ],
  prev: [
    { eq: 'EX-02', tipo: 'pr', t: 'Cambio de aceite', h: [200, 250], f: 'Viernes' },
    { eq: 'CF-05', tipo: 'pr', t: 'Revisión de fajas', h: [480, 500], f: 'Lunes' },
    { eq: 'VQ-03', tipo: 'co', t: 'Cambio de frenos', h: [450, 500], f: 'Martes' },
    { eq: 'TR-06', tipo: 'pr', t: 'Cambio de filtros', h: [910, 1000], f: 'Miércoles' },
  ],
  prox: [{ d: 'Vie 24', eq: 'EX-02', t: 'Cambio de aceite' }, { d: 'Lun 27', eq: 'CF-05', t: 'Revisión de fajas' }, { d: 'Mar 28', eq: 'VQ-03', t: 'Cambio de frenos' }, { d: 'Mié 29', eq: 'TR-06', t: 'Cambio de filtros' }],
  erp: [
    { id: 'OT-1041', d: 'Cambio de aceite – EX-02', c: 200, f: '20 Oct 2026', st: 'ok' },
    { id: 'OT-1042', d: 'Revisión de fajas – CF-05', c: 3800, f: '21 Oct 2026', st: 'ok' },
    { id: 'OT-1043', d: 'Cambio de frenos – VQ-03', c: 5400, f: '22 Oct 2026', st: 'pe' },
    { id: 'OT-1044', d: 'Cambio de filtros – TR-06', c: 1200, f: '22 Oct 2026', st: 'pe' },
  ],
  erpAt: 'hoy, 10:24',
  thr: {},
  audit: [
    { ts: Date.now() - DAY - 3 * 36e5, who: 'Carlos Mendoza', txt: 'actualizó los umbrales', tag: 'Cambio' },
    { ts: Date.now() - 12 * DAY, who: 'Sistema', txt: 'aplicó configuración anterior' },
  ],
  prefs: { n1: true, n2: false, n3: true },
  act: [{ t: 'Contraseña actualizada', w: 'Hoy, 10:24' }, { t: 'Inicio de sesión', w: 'Hoy, 08:17 · Web (Windows)' }, { t: 'Sincronización con ERP', w: 'Ayer, 18:40' }],
  devs: [{ n: 'Web (Windows) · Chrome', w: 'Este dispositivo · Lima, hoy 08:17', me: true, i: 'monitor' }, { n: 'App móvil (Android)', w: 'Lima, ayer 18:40', i: 'mobile' }],
});
const state = Object.assign(DEF(), load('im_state3', {}));
if (state.parada) { state.paradas['EX-02'] = true; delete state.parada; }
if (!state.comps || Array.isArray(state.comps)) state.comps = {};
if (!state.rates) state.rates = {};
delete state.comp;
const persist = () => save('im_state3', state);
const estadoDe = e => state.paradas[e.id] ? 'gr' : e.estado;
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const p2 = n => String(n).padStart(2, '0');
const hhmm = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const fmtTs = ts => { const d = new Date(ts); return `${d.getDate()} ${MES[d.getMonth()]}, ${d.getFullYear()} – ${hhmm(d)}`; };
const usd = n => 'US$ ' + Math.round(n).toLocaleString('en-US');
const addAct = (t, extra = '') => { state.act.unshift({ t, w: `Hoy, ${hhmm()}${extra ? ' · ' + extra : ''}` }); state.act = state.act.slice(0, 12); };

/* ===== Validación ===== */
const RULES = {
  required: v => v.trim() ? '' : 'Completa este campo.',
  email: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Escribe un correo válido, por ejemplo nombre@empresa.com.',
  min: (v, n) => !v || v.length >= +n ? '' : `Usa al menos ${n} caracteres.`,
  strong: v => !v || (/[A-Za-z]/.test(v) && /\d/.test(v)) ? '' : 'Incluye letras y números.',
  otp: v => !v || /^\d{6}$/.test(v) ? '' : 'El código tiene 6 dígitos.',
  phone: v => !v || /^\+?[\d\s-]{7,15}$/.test(v) ? '' : 'Escribe un teléfono válido, por ejemplo +51 987 654 321.',
  match: (v, sel, f) => v === $(sel, f).value ? '' : 'Las contraseñas no coinciden.',
  num: (v, spec) => {
    const [a, b] = spec.split(',').map(Number), n = Number(v);
    return v.trim() === '' || isNaN(n) ? 'Escribe un número.' : (n < a || n > b ? `Debe estar entre ${a} y ${b}.` : '');
  },
};

function setErr(input, msg) {
  const box = input.closest('.f') || input.parentElement;
  let el = $('.err', box);
  if (msg) {
    if (!el) { el = document.createElement('p'); el.className = 'err'; box.append(el); }
    el.id = input.id + '-err'; el.textContent = msg;
    input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', el.id);
  } else {
    el?.remove(); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
  }
}
function check(input) {
  const rules = (input.dataset.rules || '').split(' ').filter(Boolean);
  let msg = '';
  if (input.type === 'checkbox') { if (rules.includes('required') && !input.checked) msg = 'Debes aceptar para continuar.'; }
  else for (const r of rules) { const [n, arg] = r.split(':'); msg = RULES[n](input.value, arg, input.form); if (msg) break; }
  setErr(input, msg);
  return !msg;
}
const validate = form => {
  const bad = $$('[data-rules]', form).filter(i => !check(i));
  bad[0]?.focus();
  return !bad.length;
};
const formError = (form, msg) => {
  const p = $('.form-err', form);
  if (p) { p.textContent = msg || ''; p.hidden = !msg; }
};

/* ===== Sesión ===== */
const users = () => load('im_users', [{ name: 'Carlos Mendoza', email: 'demo@inframetrics.com', pass: 'Demo1234', rol: 'Jefe de mantenimiento' }]);
const session = () => sessionStorage.getItem('im_session') || localStorage.getItem('im_session');
const me = () => users().find(u => u.email === session());
function login(email, remember) {
  sessionStorage.removeItem('im_session'); localStorage.removeItem('im_session');
  (remember ? localStorage : sessionStorage).setItem('im_session', email);
}
function logout() { sessionStorage.removeItem('im_session'); localStorage.removeItem('im_session'); location.hash = '#login'; }

/* ===== Iconos, fotos de equipos y gráficos (sistema visual compartido) ===== */
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const IMG = { EX: 'excavadora', CF: 'cargador', VQ: 'volquete', TR: 'tractor' };
const art = (e, cls = '') => `<div class="pic ${cls}"><img src="assets/img/${IMG[e.tipo] || 'excavadora'}.webp" alt="${e.id} · ${e.modelo}" loading="lazy" decoding="async"></div>`;

function lc({ vals, labels, min, max, ticks, limit, limitLabel, fmt, aria, tick = v => v, call = vals.length - 1, ytitle = '' }) {
  const n = vals.length, X = i => i * 100 / (n - 1), Y = v => 100 - (v - min) * 100 / (max - min);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  return `<div class="cht ${ytitle ? 'yt' : ''}" role="img" aria-label="${aria}"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e10e19" stop-opacity=".22"/><stop offset="1" stop-color="#e10e19" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map(t => `<line x1="0" x2="100" y1="${Y(t)}" y2="${Y(t)}" class="gl"/>`).join('')}
    ${limit != null ? `<line x1="0" x2="100" y1="${Y(limit)}" y2="${Y(limit)}" class="ll"/>` : ''}
    <polygon points="0,100 ${pts} 100,100" fill="url(#ga)"/><polyline points="${pts}" class="ln"/></svg>
    ${ticks.map(t => `<span class="y" style="top:${Y(t)}%">${tick(t)}</span>`).join('')}
    ${labels.map(([p, l]) => `<span class="x" style="left:${p}%">${l}</span>`).join('')}
    ${vals.map((v, i) => `<i class="dot ${i === call ? 'on' : ''}" style="left:${X(i)}%;top:${Y(v)}%"></i>`).join('')}
    ${limit != null ? `<span class="lim ${limitLabel ? 'r' : ''}" style="top:${Y(limit)}%">${limitLabel || `Límite ${limit} °C`}</span>` : ''}
    ${ytitle ? `<span class="ytl">${ytitle}</span>` : ''}
    <span class="now ${Y(vals[call]) < 18 ? 'bl' : ''}" style="left:${X(call)}%;top:${Y(vals[call])}%">${fmt(vals[call])}</span></div>`;
}
function donut(parts, total) {
  let off = 25;
  return `<div class="donut"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.915" fill="none" stroke="#eceae8" stroke-width="6"/>${parts.map(([n, c]) => { const p = n / total * 100, s = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${off}"/>`; off -= p; return s; }).join('')}</svg><div><strong>${total}</strong><small>Equipos</small></div></div>`;
}
const ring = (pct, lab, col = 'var(--ok)') => `<div class="donut ring"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.915" fill="none" stroke="#eceae8" stroke-width="4.5"/><circle cx="21" cy="21" r="15.915" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/></svg><div><strong>${pct} %</strong><small>${lab}</small></div></div>`;
/* Barras verticales: la última barra se resalta como hora actual */
const vbars = (data, max, ticks, unit) => `<div class="vb" role="img" aria-label="Producción por hora; última hora ${data[data.length - 1][1]} ${unit}">${ticks.map(t => `<div class="gl2" style="top:${100 - t / max * 100}%"><span>${t} ${unit}</span></div>`).join('')}
  <div class="cols">${data.map(([l, v], i) => `<div><i class="${i === data.length - 1 ? 'on' : ''}" style="height:${v / max * 100}%" title="${l}: ${v} ${unit}"></i><span>${l}</span></div>`).join('')}</div></div>`;

let cur = 'dash', upd = Date.now(), slide = 0;
const PAGE_IC = { dash: 'layers', flota: 'truck', ficha: 'machine', alertas: 'bell', ia: 'trend', ops: 'briefcase', taller: 'wrench', prev: 'calendar', hist: 'clock', conf: 'shield', rep: 'bars', umb: 'sliders', erp: 'database', perfil: 'user' };
const ago = () => `hace ${Math.max(1, Math.round((Date.now() - upd) / 60000))} min`;
const live = () => `<div class="live"><span class="b ok"><i class="pulse"></i>En vivo</span><small>Última actualización: ${ago()}</small><button type="button" class="ib" data-refresh aria-label="Actualizar datos">${ic('refresh')}</button></div>`;
const crumb = () => {
  if (cur === 'ficha') return `<a href="#flota">Flota</a>${ic('chev-r')}<span>Ficha del equipo</span>`;
  const g = NAV.find(([, items]) => items.some(([r]) => r === cur));
  return `<span>${g ? g[0] : 'Cuenta'}</span>${ic('chev-r')}<span aria-current="page">${TITLES[cur]}</span>`;
};
const head = (t, sub, acts = '') => `<nav class="crumb" aria-label="Ruta">${crumb()}</nav><div class="head"><div class="ph"><span class="pt">${ic(PAGE_IC[cur] || 'layers')}</span><div><h1>${t}</h1><small>${sub}</small></div></div><div class="acts">${acts}</div></div>`;

const badge = s => `<span class="b ${s}">${LABEL[s]}</span>`;
const KI = { 'Disponibilidad': 'check-circle', 'Equipos en alerta': 'warn', 'En taller': 'wrench', 'Falla prevista': 'calendar', 'Temperatura motor': 'thermo', 'Vibración': 'activity', 'RPM': 'gauge', 'Probabilidad de falla': 'warn', 'Críticas': 'warn', 'Altas': 'alert', 'Medias y bajas': 'info', 'Solucionadas': 'check-circle', 'Ventana ideal': 'clock', 'Ahorro estimado': 'dollar', 'Repuestos probables': 'wrench', 'Toneladas del turno': 'truck', 'Horas efectivas': 'clock', 'Salud de flota': 'heart', 'Riesgo a la meta': 'alert', 'MTBF': 'trend', 'MTTR': 'wrench', 'Meta MTBF': 'check-circle', 'Fallas del mes': 'warn', 'Órdenes sincronizadas': 'clip', 'Costo total sincronizado': 'tag', 'Pendientes de sincronizar': 'refresh', 'Tasa de sincronización': 'check-circle', 'Preventivos programados': 'wrench', 'Pendientes de aprobación': 'clock', 'Ejecutados': 'check-circle', 'Disponibilidad de flota': 'trend', 'Intervenciones totales': 'wrench', 'Costo total': 'database', 'Preventivos': 'calendar', 'Correctivos': 'warn' };
const kpi = (cls, label, val, sub, tip = '') =>
  `<div class="card kpi ${cls} s3"><span class="kic">${ic(KI[label] || 'bars')}</span><div class="kbd"><div class="kh"><span>${label}</span>${tip ? `<button type="button" class="i" data-tip="${tip}" aria-label="${tip}">${ic('info')}</button>` : ''}</div><strong>${val}</strong><small>${sub}</small></div></div>`;

/* Iconos automáticos para títulos de tarjeta y botones: mantiene todas las pantallas coherentes */
const H2I = [[/Equipos que requieren/, 'helmet'], [/Estado de la flota/, 'pie'], [/Disponibilidad|Temperatura ·/, 'trend'], [/Contribuci/, 'shield'], [/Datos del equipo|Datos pers/, 'clip'], [/Parar hoy|Costo/, 'dollar'], [/Equipos y prod/, 'truck'], [/prórroga/, 'clock'], [/Pendientes/, 'calendar'], [/Fallas por/, 'bars'], [/Auditor/, 'shield-check'], [/contraseña/, 'lock'], [/Notific|^Alertas/, 'bell'], [/Mantenimientos/, 'wrench'], [/Ficha del equipo/, 'machine']];
const BTN = [[/^Ver ficha|^Ver análisis/, 'eye'], [/^Volver/, 'arrow-l'], [/^Autorizar/, 'shield-check'], [/^Exportar/, 'download'], [/^Solicitar|^Ver historial/, 'clock'], [/^Avanzar/, 'arrow-r'], [/^Guardar|^Actualizar|^Recalcular|^Aprobar|^Reintentar/, 'check']];
function decorate() {
  $$('#view .card > h2').forEach(h => { if (!h.querySelector('.ic')) h.insertAdjacentHTML('afterbegin', `<span class="h2i">${ic((H2I.find(([r]) => r.test(h.textContent)) || [0, 'bars'])[1])}</span>`); });
  $$('#view .btn, #view .link.more').forEach(b => { const m = BTN.find(([r]) => r.test(b.textContent.trim())); if (m && !b.querySelector('.ic')) b.insertAdjacentHTML('afterbegin', ic(m[1])); });
}
const fld = (id, label, { type = 'text', rules = '', val = '', hint = '', ac = '' } = {}) =>
  `<div class="f"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${val}" data-rules="${rules}"${ac ? ` autocomplete="${ac}"` : ''}>${hint ? `<small>${hint}</small>` : ''}</div>`;
const sw = (id, t, d, on) => `<div class="sw"><span><strong>${t}</strong><small>${d}</small></span><input type="checkbox" name="${id}" ${on ? 'checked' : ''} aria-label="${t}"></div>`;
const chips = (name, opts, cur) => `<div class="chips" data-chips="${name}">${opts.map(([v, l]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>`;

/* Piezas del rediseño v3: cabecera de tarjeta, pastillas, tendencias, miniatura de equipo */
const h2 = (icon, t, right = '') => `<div class="hd"><h2><span class="h2i">${ic(icon)}</span>${t}</h2>${right}</div>`;
const pill = (cls, icon, t) => `<span class="b ${cls}">${icon ? ic(icon) : ''}${t}</span>`;
const ST_IC = { cr: 'warn', wa: 'warn', ok: 'check-circle', gr: 'wrench' };
const badgeI = s => pill(s, ST_IC[s], LABEL[s]);
const trend = (t, dir = 'up', good = true) => `<span class="tr ${good ? '' : 'bad'}">${ic(dir === 'up' ? 'tri-up' : 'tri-dn')}${t}</span>`;
const eqc = e => `<div class="eqc">${art(e, 'xs')}<span><strong>${e.id}</strong><small>${e.modelo}</small></span></div>`;
const hb = v => v < 50 ? 'cr' : v < 80 ? 'wa' : 'ok';
const tip = t => `<button type="button" class="i" data-tip="${t}" aria-label="${t}">${ic('info')}</button>`;

/* ===== Vistas ===== */
const V = {};
const ui = { tipo: 'all', q: '', qa: '', qe: '', sev: 'all', hist: 'all', pend: false, of: 'all', pt: 'all', ef: 'all', ueq: 'EX-02', ud: 30, actAll: false, iaEq: 'EX-02', hp: '6m', he: 'all', hq: '', hpg: 1 };

const MET = e => `<span class="mt">${ic('thermo')}${e.temp} °C</span><span class="mt">${ic('activity')}${e.vib} mm/s</span><span class="mt">${ic('wrench')}Falla ${e.prob} % en 48 h</span>`;

V.dash = () => {
  const enAlerta = EQUIPOS.filter(e => ['cr', 'wa'].includes(estadoDe(e)));
  const cnt = s => EQUIPOS.filter(e => estadoDe(e) === s).length, crit = cnt('cr');
  const COL = { ok: 'var(--ok)', wa: 'var(--warn)', cr: 'var(--crit)', gr: '#a8a29e' }, ord = ['ok', 'wa', 'cr', 'gr'];
  return head('Resumen de la flota', 'Estado de tus 12 equipos en este momento', live()) +
    (crit ? `<div class="alertbar"><span class="kic cr">${ic('warn')}</span><div><strong>EX-02 requiere parada</strong><p>85 % de probabilidad de falla en 48 h · Temperatura 92 °C sobre el límite de 90 °C</p></div><div class="acts"><a class="btn line" href="#ia/EX-02">Ver análisis</a><a class="btn" href="#parada/EX-02">Autorizar parada</a></div></div>` : '') +
    `<div class="g">${kpi('ok', 'Disponibilidad', '87 %', `<span class="up">${ic('arrow-up')}+2 puntos respecto a ayer</span>`, 'Porcentaje de horas en que los equipos estuvieron listos para trabajar.')}
     ${kpi(crit ? 'cr' : 'wa', 'Equipos en alerta', enAlerta.length, `${crit} crítico · ${enAlerta.length - crit} en alerta`, 'Equipos con temperatura o vibración sobre su umbral.')}
     ${kpi('', 'En taller', cnt('gr'), 'Dentro del plazo de 24 h', 'Equipos detenidos en mantenimiento ahora mismo.')}
     ${kpi('wa', 'Falla prevista', crit ? 1 : 0, 'EX-02 · 85 % en 48 h', 'Equipos con 60 % o más de probabilidad de fallar en 48 horas.')}</div>
    <div class="g"><div class="card s8"><h2>Equipos que requieren atención<a class="more r" href="#flota">Ver flota completa${ic('arrow-r')}</a></h2>
      ${enAlerta.map(e => `<div class="row">${art(e, 'sm')}<div class="rb"><div class="rt">${badge(estadoDe(e))}<strong>${e.id} · ${e.modelo}</strong></div><div class="mts">${MET(e)}</div></div><a class="btn line sm" href="#ficha/${e.id}">Ver ficha</a></div>`).join('') || '<div class="empty">Ningún equipo requiere atención.</div>'}</div>
    <div class="stk s4"><div class="card"><h2>Estado de la flota</h2><div class="dn-wrap">${donut(ord.map(s => [cnt(s), COL[s]]), 12)}
      <ul class="lg">${ord.map(s => `<li><span><i class="sq" style="background:${COL[s]}"></i>${LABEL[s]}</span><strong>${cnt(s)}</strong><small>(${Math.round(cnt(s) / 12 * 100)} %)</small></li>`).join('')}</ul></div></div>
    <div class="card"><h2>Disponibilidad <small>(últimos 7 días)</small></h2>${lc({ vals: [82, 82.6, 84, 84.4, 85, 86.5, 87], labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => [i * 100 / 6, d]), min: 75, max: 90, ticks: [90, 85, 80, 75], fmt: v => v + ' %', aria: 'Disponibilidad de los últimos 7 días, hoy 87 %' })}</div></div></div>`;
};

V.flota = () => {
  const rows = EQUIPOS.filter(e => (ui.tipo === 'all' || e.tipo === ui.tipo) && (e.id + e.modelo + e.ubic).toLowerCase().includes(ui.q.toLowerCase()));
  return head('Flota', 'Filtra por tipo de máquina o busca una unidad para abrir su ficha', live()) +
    `<div class="card"><div class="toolbar">${chips('tipo', [['all', 'Toda la flota'], ...Object.entries(TIPOS)], ui.tipo)}<label class="sch">${ic('search')}<input class="search" type="search" id="q" data-q="q" placeholder="Buscar equipo o ubicación" aria-label="Buscar equipo" value="${ui.q}"></label></div>` +
    (rows.length ? `<div class="tw"><table class="tbl"><tr><th>Equipo</th><th>Estado</th><th>Ubicación</th><th class="n">Temp.</th><th class="n">Vibración</th><th>Falla 48 h</th><th></th></tr>
      ${rows.map(e => `<tr><td><div class="eqc">${art(e, 'xs')}<span><strong>${e.id}</strong><small>${e.modelo}</small></span></div></td><td>${badge(estadoDe(e))}</td><td><span class="mt">${ic('pin')}${e.ubic}</span></td><td class="n">${e.temp} °C</td><td class="n">${e.vib} mm/s</td><td><div class="pr"><div class="bar ${e.prob < 25 ? 'ok' : ''}"><i style="width:${e.prob}%"></i></div><b>${e.prob} %</b></div></td><td class="n"><a class="btn line sm" href="#ficha/${e.id}">Ver ficha</a></td></tr>`).join('')}</table></div>`
      : `<div class="empty">${ic('search')}<p>No hay equipos con ese filtro. Prueba con otro tipo o borra la búsqueda.</p></div>`) + '</div>';
};

V.ficha = id => {
  const e = eq(id);
  if (!e) return head('Equipo no encontrado', `No existe una unidad con el código ${id}.`, '<a class="btn line" href="#flota">Volver a flota</a>');
  const s = estadoDe(e), t = Math.round(e.prob * .47), tt = Math.round(e.prob * .35);
  const lbl = { cr: 'Crítico', wa: 'Alerta activa', ok: 'Sin alertas', gr: 'En taller' }[s];
  const vals = [0, 1, 2, 3, 4, 5, 6].map(i => Math.round(60 + (e.temp - 60) * Math.pow(i / 6, 1.3)));
  const prox = new Date(2026, 11, 1 + e.horo % 28).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  const oper = { cr: ['Detenido', 'cr'], wa: ['Operativo', 'ok'], ok: ['Operativo', 'ok'], gr: ['En taller', 'gr'] }[s];
  const hs = e.horo.toLocaleString('es-PE');
  return head(`${e.id} · ${e.modelo}`, `<span class="mt">${ic('pin')}${e.ubic}</span><span class="mt">${ic('hourglass')}Horómetro: ${hs} h</span>`,
    `<span class="b ${s}">${ic(s === 'ok' ? 'check-circle' : 'warn')}${lbl}</span><a class="btn line" href="#flota">Volver a flota</a><a class="btn line" href="#ia/${e.id}">Ver análisis</a>${s === 'cr' ? `<a class="btn" href="#parada/${e.id}">Autorizar parada</a>` : ''}`) +
    `<div class="g">${kpi(e.temp > LIM.temp ? 'cr' : e.temp > 80 ? 'wa' : 'ok', 'Temperatura motor', e.temp + ' °C', 'Límite: 90 °C', 'Temperatura del bloque del motor.')}
     ${kpi(e.vib > LIM.vib ? 'cr' : e.vib > 2 ? 'wa' : 'ok', 'Vibración', e.vib + ' mm/s', 'Límite: 2.5 mm/s', 'Subidas sostenidas indican desgaste o desalineación.')}
     ${kpi('ok', 'RPM', e.rpm.toLocaleString('es-PE'), e.rpm ? 'Rango normal' : 'Equipo detenido', 'Vueltas por minuto del motor.')}
     ${kpi(e.prob >= 60 ? 'cr' : e.prob >= 25 ? 'wa' : 'ok', 'Probabilidad de falla', e.prob + ' %', e.prob >= 60 ? 'Riesgo alto' : e.prob >= 25 ? 'Riesgo medio' : 'Riesgo bajo', 'Probabilidad de falla en 48 horas.')}</div>
    <div class="g"><div class="stk s8"><div class="card"><h2>Temperatura · últimas 12 h</h2>${lc({ vals, labels: [[0, '-12 h'], [25, '-9 h'], [50, '-6 h'], [75, '-3 h'], [100, 'Ahora']], min: 60, max: 100, ticks: [100, 90, 80, 70, 60], limit: 90, fmt: v => v + ' °C', aria: `Temperatura de las últimas 12 horas, hoy ${e.temp} °C` })}</div>
      <div class="card strip"><div class="sti"><span class="kic ${oper[1] === 'cr' ? 'cr' : oper[1]}">${ic('activity')}</span><div><small>Estado del equipo</small><span class="b ${oper[1]}">${ic(oper[1] === 'ok' ? 'check-circle' : 'alert')}${oper[0]}</span></div></div>
        <a class="sti go" href="#prev"><span class="kic">${ic('calendar')}</span><div><small>Próximo mantenimiento</small><strong>${prox}</strong></div>${ic('chev-r', 'ch')}</a></div></div>
    <div class="stk s4"><div class="card"><h2>Ficha del equipo</h2><div class="car">${art(e, 'v' + slide)}<button class="cb l" type="button" data-car="-1" aria-label="Imagen anterior">${ic('chev-l')}</button><button class="cb r" type="button" data-car="1" aria-label="Imagen siguiente">${ic('chev-r')}</button><span class="dots">${[0, 1, 2].map(i => `<i class="${i === slide ? 'on' : ''}"></i>`).join('')}</span></div></div>
      <div class="card"><h2>Contribución al riesgo</h2><ul class="why">
        <li><span>Vibración en eje trasero<b class="b gr pct">+${t} %</b></span><div class="bar"><i style="width:${t * 2}%"></i></div></li>
        <li><span>Temperatura sobre el límite<b class="b gr pct">+${tt} %</b></span><div class="bar"><i style="width:${tt * 2}%"></i></div></li></ul></div>
      <div class="card"><h2>Datos del equipo</h2><ul class="dl"><li><span>${ic('user')}Operador</span><strong>${e.op}</strong></li><li><span>${ic('pin')}Ubicación</span><strong>${e.ubic}</strong></li><li><span>${ic('hourglass')}Horómetro</span><strong>${hs} h</strong></li></ul></div></div></div>`;
};

const SEV = { cr: ['cr', 'Crítica', 'warn'], hi: ['wa', 'Alta', 'alert'], lo: ['gr', 'Media o baja', 'info'] };
const ETAPAS = ['Nueva', 'Revisada', 'Asignada', 'Solucionada'];
const mic = t => /Temperatura|Refrigerante/.test(t) ? 'thermo' : /Vibraci/.test(t) ? 'activity' : /taller/.test(t) ? 'wrench' : 'calendar';
V.alertas = () => {
  const qq = ui.qa.toLowerCase();
  const list = state.alertas.map((a, i) => ({ ...a, i })).filter(a => (ui.sev === 'all' || a.sev === ui.sev) && !(ui.pend && a.st === 3) && (a.eq + a.t + a.d).toLowerCase().includes(qq));
  const n = s => state.alertas.filter(a => a.sev === s && a.st < 3).length;
  return head('Alertas', 'Avisos de los sensores y reportes de campo', live()) +
    `<div class="g">${kpi('cr', 'Críticas', n('cr'), 'Detener de inmediato')}${kpi('wa', 'Altas', n('hi'), 'Revisar pronto')}${kpi('', 'Medias y bajas', n('lo'), 'Sin acción urgente')}${kpi('ok', 'Solucionadas', state.alertas.filter(a => a.st === 3).length, 'Cerradas por el taller')}</div>
    <div class="toolbar sp">${chips('sev', [['all', 'Todas'], ['cr', 'Críticas'], ['hi', 'Altas'], ['lo', 'Medias y bajas']], ui.sev)}<div class="acts"><label class="sch">${ic('search')}<input class="search" type="search" id="qa" data-q="qa" placeholder="Buscar alerta, equipo o variable…" aria-label="Buscar alerta" value="${ui.qa}"></label><button type="button" class="btn line" data-tg="pend" aria-pressed="${!!ui.pend}">${ic('filter')}${ui.pend ? 'Sin solucionar' : 'Filtros'}</button></div></div>` +
    (list.map(a => { const [c, lab, si] = SEV[a.sev], e = eq(a.eq), k = a.st === 3 ? 'ok' : c;
      return `<article class="al ${k}"><div class="sevt ${k}">${ic(a.st === 3 ? 'check-circle' : si)}<span>${a.st === 3 ? 'Resuelta' : lab}</span></div>
      <div class="am"><strong>${a.eq} · ${a.t}</strong><p class="mt">${ic(mic(a.t))}${a.d}</p><small class="mt">${ic('clock')}${a.w.replace('hace', 'Hace')}</small></div>${art(e, 'al-pic')}
      <div class="ast"><small>Estado</small><ol class="trk" aria-label="Avance">${ETAPAS.map((x, j) => `<li class="${j === a.st ? 'on' : j < a.st ? 'done' : ''}">${j === a.st ? '<i></i>' : j < a.st ? ic('check') : ''}${x}</li>`).join('')}</ol>
      <div class="acts">${a.st < 3 ? `<button class="btn sm" data-adv="${a.i}">${ic('check-circle')}Pasar a «${ETAPAS[a.st + 1]}»</button>` : ''}<a class="btn line sm" href="#ficha/${a.eq}">Ver ficha</a></div></div>
      <a class="go" href="#ficha/${a.eq}" aria-label="Abrir ficha de ${a.eq}">${ic('chev-r')}</a></article>`; }).join('') || `<div class="empty">${ic('bell')}<p>No hay alertas con ese filtro.</p></div>`);
};

/* ---------- IA y ROI: análisis predictivo de cualquier equipo ---------- */
const TNAME = { EX: 'Excavadora', CF: 'Cargador', VQ: 'Volquete', TR: 'Tractor' };
const COMPS = { EX: ['Mangueras hidráulicas (1 kit)', 'Filtros de aceite (1 kit)'], CF: ['Fajas del ventilador (1 kit)', 'Filtros de aire (1 kit)'], VQ: ['Pastillas de freno (1 juego)', 'Líquido de frenos (1 kit)'], TR: ['Rodillos de oruga (1 kit)', 'Filtros de combustible (1 kit)'] };
const KITS = { EX: 'Mangueras y filtros', CF: 'Fajas y filtros', VQ: 'Frenos y líquido', TR: 'Rodillos y filtros' };
const RATE = { EX: 500, CF: 420, VQ: 650, TR: 380 }, STOP = { EX: 40, CF: 35, VQ: 50, TR: 45 };
const rateOf = e => state.rates[e.id] ?? RATE[e.tipo];
const lvlOf = p => p >= 60 ? 'cr' : p >= 25 ? 'wa' : 'ok';
const RISK = { cr: 'Riesgo alto', wa: 'Riesgo medio', ok: 'Riesgo bajo' };
/* Modelo simple y coherente: la salud cae en proporción a la probabilidad de falla */
function pred(e) {
  const p = e.prob, lvl = lvlOf(p), h0 = Math.round(95 - p * 0.12), rate = p / 6;
  const vals = [0, 1, 2, 3, 4].map(d => Math.max(0, Math.round(h0 - rate * d)));
  const cruce = rate ? (h0 - 40) / rate : Infinity, dias = { cr: 4, wa: 3, ok: 2 }[lvl];
  const c = rateOf(e), min = STOP[e.tipo], parar = Math.round(c * min / 60), romper = c * 24 * dias;
  const ahorro = lvl === 'cr' ? romper - parar : Math.max(0, Math.round(romper * p / 100) - parar);
  const ven = { cr: ['2 h', 'Turno noche'], wa: ['4 h', 'Fin de semana'], ok: ['8 h', 'Próximo preventivo'] }[lvl];
  const varb = e.temp > LIM.temp ? 'la temperatura del motor' : e.vib > LIM.vib ? 'la vibración' : 'la tendencia de los sensores';
  const reco = { cr: `Realizar mantenimiento correctivo en la próxima ventana de 2 h para evitar una falla mayor y reducir costos operativos.`,
    wa: `Programar una inspección en la próxima ventana de 4 h y vigilar ${varb} para evitar que el riesgo siga subiendo.`,
    ok: `El equipo opera dentro de rango. Mantén el plan preventivo y vuelve a revisar el análisis en 7 días.` }[lvl];
  return { p, lvl, vals, cruce, dias, parar, romper, ahorro, ven, reco, min, c };
}
const compsOf = e => state.comps[e.id] || COMPS[e.tipo].map(() => true);
V.ia = arg => {
  if (eq(arg)) ui.iaEq = arg;
  const e = eq(ui.iaEq) || eq('EX-02'), id = e.id, r = pred(e), hs = e.horo.toLocaleString('en-US'), s = estadoDe(e), cmp = compsOf(e);
  const lst = [...EQUIPOS].sort((a, b) => b.prob - a.prob);
  const cruceTxt = r.cruce <= 4 ? `cruza el umbral de falla de 40 % en ${Math.max(1, Math.ceil(r.cruce))} día(s)` : 'no llega al umbral de falla en 4 días';
  return head(`Análisis predictivo · ${id}`, 'Calcula el riesgo de falla, impacto operativo y retorno de la intervención.',
    `<a class="btn line" href="#ops">${ic('calendar')}Solicitar prórroga</a>${s === 'gr' ? '' : `<a class="btn" href="#parada/${id}">${ic('shield-check')}Autorizar parada</a>`}`) +
    `<div class="pick"><div class="pkh"><strong>Elige un equipo</strong><small>${EQUIPOS.length} equipos · ordenados por riesgo</small><label class="pks"><span class="sr">Equipo analizado</span><select data-iasel aria-label="Equipo analizado">${lst.map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${x.id} · ${TNAME[x.tipo]} · ${x.prob} %</option>`).join('')}</select></label></div>
      <nav class="eqpick" aria-label="Equipos">${lst.map(x => { const l = lvlOf(x.prob); return `<a href="#ia/${x.id}" ${x.id === id ? 'aria-current="true"' : ''}>${art(x, 'xs')}<span><strong>${x.id}</strong><small><i class="dt ${l}"></i>${x.prob} % falla</small></span></a>`; }).join('')}</nav></div>
    <div class="card eqx">${art(e, 'lg')}<div class="eqn"><h2>${id} · ${TNAME[e.tipo]}</h2><small>${e.ubic} · ${hs} h</small>${pill(r.lvl, r.lvl === 'ok' ? 'check-circle' : 'warn', RISK[r.lvl])}</div>
      <ul class="spec"><li>${ic('truck')}<span><small>Modelo</small><strong>CAT ${e.modelo.split(' ').pop()}</strong></span></li><li>${ic('clock')}<span><small>Horómetro</small><strong>${hs} h</strong></span></li><li>${ic('pin')}<span><small>Ubicación</small><strong>${e.ubic}</strong></span></li></ul>
      ${s === 'gr' ? pill('gr', 'wrench', 'En taller') : '<span class="b ok"><i class="pulse"></i>Operativa</span>'}</div>
    <div class="g">${kpi(r.lvl + ' ac', 'Probabilidad de falla', r.p + ' %', RISK[r.lvl])}${kpi('', 'Ventana ideal', r.ven[0], r.ven[1])}${kpi('ok ac', 'Ahorro estimado', usd(r.ahorro), r.lvl === 'cr' ? 'Si se interviene hoy' : 'Valor esperado según el riesgo')}${kpi('', 'Repuestos probables', cmp.filter(Boolean).length + ' kits', KITS[e.tipo])}</div>
    <div class="g"><div class="card s6">${h2('bars', 'Costo de parada', `<form class="cpf" data-form="costo" novalidate><label for="cp">Costo por hora (US$)</label><input id="cp" name="cp" type="number" value="${r.c}" data-rules="required num:1,100000"><button class="ib bd" aria-label="Recalcular">${ic('refresh')}</button></form>`)}
      <div class="cmp2"><div class="cbx">${ic('clock')}<div><small>Parar hoy · ${r.min} min</small><strong>${usd(r.parar)}</strong></div></div><div class="cbx bad">${ic('warn')}<div><small>Si se rompe · ${r.dias} días</small><strong>${usd(r.romper)}</strong></div></div></div>
      <p class="okbar">${ic('piggy')}${r.lvl === 'cr' ? `Detener ${r.min} minutos hoy evita una parálisis de ${r.dias} días.` : `Con ${r.p} % de riesgo, esperar cuesta en promedio ${usd(r.romper * r.p / 100)}.`}</p></div>
    <div class="card s6">${h2('trend', 'Proyección de degradación')}${lc({ vals: r.vals, labels: ['Hoy', '1 día', '2 días', '3 días', '4 días'].map((l, i) => [i * 25, l]), min: 20, max: 100, ticks: [100, 80, 60, 40, 20], limit: 40, limitLabel: 'Umbral de falla (40 %)', tick: v => v + ' %', fmt: v => v + ' %', call: 0, ytitle: 'Salud del equipo', aria: `La salud de ${id} baja de ${r.vals[0]} % hoy a ${r.vals[4]} % en 4 días; ${cruceTxt}` })}</div></div>
    <div class="g"><div class="reco s8 ${r.lvl}"><span class="rbig">${ic('target')}</span><h3>Recomendación<br>de IA</h3><p>${r.reco}</p><button type="button" class="btn" data-gen>${ic('calendar')}Generar orden</button></div>
      <div class="card s4">${h2('stack', 'Componentes a intervenir')}<ul class="cl">${COMPS[e.tipo].map((t, i) => `<li><label class="chk"><input type="checkbox" data-comp="${i}" ${cmp[i] ? 'checked' : ''}>${t}</label></li>`).join('')}</ul></div></div>`;
};

/* ---------- Órdenes ---------- */
const COLS = ['Reportada', 'Asignada', 'En mantenimiento', 'Lista'];
V.taller = () => head('Órdenes de trabajo', 'Plazo comprometido por reparación: 24 h', '<a class="btn line" href="#hist">Ver historial</a>') +
  `<div class="kb">${COLS.map((c, ci) => `<div class="kc"><h2>${c} <span class="b gr">${state.ots.filter(o => o.col === ci).length}</span></h2>${state.ots.map((o, i) => ({ ...o, i })).filter(o => o.col === ci).map(o => {
    const cls = o.col === 3 ? 'ok' : o.plazo >= 20 ? 'cr' : o.plazo >= 12 ? 'wa' : 'ok', e = eq(o.eq);
    return `<div class="tk ${cls === 'ok' ? '' : cls}"><div class="tkh">${e ? art(e, 'xs') : ''}<strong>${o.eq} · ${o.t}</strong></div><span class="b ${cls}">${o.col === 3 ? 'Cerrada a tiempo' : `Plazo ${o.plazo} h de 24 h`}</span><div class="acts"><a class="btn line sm" href="#ficha/${o.eq}">Ver ficha</a>${o.col < 3 ? `<button class="btn sm" data-ot="${o.i}">Avanzar</button>` : ''}</div></div>`;
  }).join('') || '<p class="kce">Sin órdenes</p>'}</div>`).join('')}</div>`;

/* ---------- Operaciones ---------- */
const OPS = [['EX-02', 500, 40, 'Hoy'], ['CF-05', 540, 72, 'En 2 días'], ['VQ-05', 610, 92, 'En 5 días'], ['TR-04', 380, 94, 'En 6 días']];
const PROD = [['08:00', 290], ['09:00', 410], ['10:00', 500], ['11:00', 530], ['12:00', 370], ['13:00', 480], ['14:00', 530], ['15:00', 600], ['16:00', 720]];
const PROG = [['Hoy', 'EX-02 · Mantenimiento correctivo', 'Urgente'], ['En 2 días', 'CF-05 · Cambio de filtros', 'Programado'], ['En 5 días', 'VQ-05 · Revisión de sistema hidráulico', 'Programado'], ['En 6 días', 'TR-04 · Mantenimiento preventivo', 'Programado']];
V.ops = () => {
  const f = ui.of, rows = OPS.map(([id, p, h, n]) => ({ e: eq(id), p, h, n, s: estadoDe(eq(id)) }))
    .filter(r => f === 'all' || (f === 'wa' ? ['wa', 'cr'].includes(r.s) : r.s === f));
  return head('Operaciones y mantenimiento', 'Gestión de producción, disponibilidad y mantenimientos de la flota.', live()) +
    `<div class="g">${kpi('ok ac', 'Toneladas del turno', '4 820 t', trend('93 % de la meta (5 200 t)'))}${kpi('', 'Horas efectivas', '62 h', trend('+6 h vs. turno anterior'))}${kpi('ok ac', 'Salud de flota', '87 %', 'Estado estable')}${kpi('cr ac', 'Riesgo a la meta', '1', 'EX-02 · Requiere atención')}</div>
    <div class="g"><div class="card s8">${h2('truck', 'Equipos y producción', chips('of', [['all', 'Todos'], ['gr', 'En taller'], ['wa', 'Alerta'], ['ok', 'Normal']], f))}
      <div class="tw"><table class="tbl"><tr><th>Equipo</th><th>Estado</th><th class="n">Producción (t)</th><th>Salud</th><th>Próx. mantenimiento</th><th></th></tr>
      ${rows.map(r => `<tr><td>${eqc(r.e)}</td><td>${badgeI(r.s)}</td><td class="n">${r.p} t</td><td><div class="hl"><b>${r.h} %</b><div class="bar ${hb(r.h)}"><i style="width:${r.h}%"></i></div></div></td><td><span class="mt">${ic('calendar')}${r.n}</span></td><td class="n"><a class="ib bd" href="#ficha/${r.e.id}" aria-label="Ver ficha de ${r.e.id}">${ic('chev-r')}</a></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No hay equipos con ese estado.</div></td></tr>'}</table></div></div>
    <form class="card s4" data-form="prorroga" novalidate>${h2('clock', 'Solicitar prórroga')}
      <div class="f"><label for="h4">Horas de prórroga</label><select id="h4" name="h4" data-rules="required"><option value="">Elige de 1 a 4 horas</option>${[1, 2, 3, 4].map(n => `<option value="${n}">${n} hora${n > 1 ? 's' : ''}</option>`).join('')}</select></div>
      <div class="f"><label for="j4">Justificación</label><textarea id="j4" name="j4" placeholder="Describe el motivo de la prórroga..." data-rules="required min:20"></textarea><small>Mínimo 20 caracteres. Con riesgo de 95 % o más se deniega.</small></div>
      <button class="btn block">${ic('clock')}Solicitar prórroga</button></form></div>
    <div class="g"><div class="card s8">${h2('bars', 'Producción del turno')}<div class="vbw">${vbars(PROD, 800, [800, 600, 400, 200, 0], 't')}
      <div class="pside"><div class="pbox">${ic('target')}<div><small>Meta del turno</small><strong>5 200 t</strong></div></div><div class="pbox ok">${ic('bars')}<div><small>Avance actual</small><strong>4 820 t (93 %)</strong></div></div></div></div></div>
    <div class="card s4">${h2('calendar', 'Mantenimientos programados')}<ul class="tl ops">${PROG.map(([w, t, s], i) => `<li class="${i ? '' : 'on'}"><strong class="wh">${w}</strong><span>${t}</span><span class="b ${i ? 'gr' : 'cr'}">${s}</span></li>`).join('')}</ul></div></div>`;
};

/* ---------- Preventivos ---------- */
const TIPO = { pr: ['pr', 'wrench', 'Preventivo'], co: ['co', 'wrench', 'Correctivo'] };
V.prev = () => {
  const f = ui.pt, prog = 12 + state.extra, ej = 8, pend = state.prev.length, pct = Math.round(ej / prog * 100);
  const list = state.prev.map((p, i) => ({ ...p, i })).filter(p => f === 'all' || p.tipo === f);
  return head('Mantenimiento preventivo', 'Planificación y control de mantenimientos programados',
    `<button type="button" class="btn line" data-dlg="nprev">${ic('plus')}Nuevo preventivo</button><button type="button" class="btn" data-scroll="prox">${ic('calendar')}Ver calendario</button>`) +
    `<div class="g">${kpi('ok', 'Preventivos programados', prog, 'Este mes')}${kpi('cr', 'Pendientes de aprobación', pend, 'Requieren revisión')}${kpi('ok', 'Ejecutados', ej, `${pct} % de cumplimiento`)}${kpi('ok', 'Disponibilidad de flota', '87 %', trend('+2 pp vs. mes anterior'))}</div>
    <div class="g"><form class="card s8" data-form="prev" novalidate>${h2('calendar', `Pendientes de aprobación <span class="cnt2">${pend}</span>`, chips('pt', [['all', 'Todos'], ['co', 'Correctivo'], ['pr', 'Preventivo']], f))}` +
    (list.length ? `<div class="tw"><table class="tbl nwt"><tr><th><input type="checkbox" data-all aria-label="Seleccionar todos"></th><th>Equipo</th><th>Tipo</th><th>Tarea</th><th class="n">Horas</th><th>Avance</th><th>Fecha estimada</th></tr>
      ${list.map(p => { const e = eq(p.eq), a = Math.min(100, Math.round(p.h[0] / p.h[1] * 100));
        return `<tr><td><input type="checkbox" name="pv" value="${p.i}" aria-label="Seleccionar ${p.eq} · ${p.t}"></td><td>${eqc(e)}</td><td>${pill(...TIPO[p.tipo])}</td><td>${p.t}</td><td class="n nw">${p.h[0].toLocaleString('es-PE')} / ${p.h[1].toLocaleString('es-PE')}</td><td><div class="hl"><b class="g">${a} %</b><div class="bar ok"><i style="width:${a}%"></i></div></div></td><td>${p.f}</td></tr>`; }).join('')}</table></div>
      <p class="form-err" role="alert" hidden></p><div class="acts mt16"><button class="btn">${ic('check')}Aprobar seleccionados</button></div>`
      : `<div class="empty">${ic('check-circle')}<p>${state.prev.length ? 'No hay pendientes de este tipo.' : 'No quedan mantenimientos pendientes. Se generaron las órdenes de trabajo.'}</p></div>`) + `</form>
    <div class="stk s4"><div class="card">${h2('calendar', 'Cumplimiento mensual')}<div class="dn-wrap">${ring(pct, 'Cumplimiento')}
      <ul class="lg"><li><span><i class="sq" style="background:var(--ok)"></i>Ejecutados</span><strong>${ej}</strong></li><li><span><i class="sq" style="background:var(--warn)"></i>Pendientes</span><strong>${pend}</strong></li><li><span><i class="sq" style="background:#bdb6b1"></i>Programados</span><strong>${prog}</strong></li></ul></div></div>
    <div class="card" id="prox" tabindex="-1">${h2('calendar', 'Próximos mantenimientos')}<ul class="nx">${state.prox.map(p => `<li><span class="dch">${p.d}</span><span><strong>${p.eq}</strong> · ${p.t}</span></li>`).join('')}</ul></div></div></div>`;
};

/* ---------- Historial técnico: registro de intervenciones con filtros y paginación ---------- */
const HIST = (() => {
  let s = 20261122;
  const rnd = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)], rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const T = { pr: { EX: ['Cambio de aceite 250 h', 'Cambio de filtros hidráulicos', 'Engrase general', 'Inspección de mangueras', 'Revisión de transmisión'], CF: ['Cambio de aceite 500 h', 'Revisión de fajas', 'Cambio de filtros de aire', 'Engrase de articulaciones'], VQ: ['Revisión de frenos', 'Cambio de aceite 500 h', 'Rotación de neumáticos', 'Cambio de filtros'], TR: ['Cambio de filtros 1 000 h', 'Tensado de orugas', 'Cambio de aceite 250 h', 'Engrase de rodillos'] },
    co: { EX: ['Cambio de bomba hidráulica', 'Reparación de fuga hidráulica', 'Cambio de manguera rota', 'Reparación de cilindro del brazo'], CF: ['Cambio de faja rota', 'Reparación de sistema eléctrico', 'Cambio de alternador'], VQ: ['Reparación de transmisión', 'Cambio de frenos', 'Reparación de suspensión'], TR: ['Cambio de rodillo de oruga', 'Reparación de motor de arranque', 'Cambio de sello hidráulico'] } };
  const TEC = ['Marco Quispe', 'Pedro Salas', 'Elena Paz', 'Luis Rojas', 'Ana Torres', 'Iván Cruz'];
  const now = new Date(); now.setHours(12, 0, 0, 0);
  const at = d => new Date(now.getTime() - d * DAY);
  const mk = (tipo, eqid, t, d, c, h, res = 'ok') => ({ tipo, eq: eqid, t, ts: at(d).getTime(), c, h, res, tec: pick(TEC) });
  const fixed = [mk('co', 'EX-02', 'Cambio de bomba hidráulica', 2, 8500, 6), mk('co', 'VQ-09', 'Reparación de transmisión', 12, 12000, 10), mk('pr', 'CF-01', 'Cambio de aceite 500 h', 14, 1200, 2), mk('pr', 'TR-04', 'Cambio de filtros 1 000 h', 24, 750, 2), mk('pr', 'EX-07', 'Revisión de transmisión', 32, 2300, 4)];
  const batch = (nPr, nCo, d0, d1, total) => {
    const L = [...Array(nPr).fill('pr'), ...Array(nCo).fill('co')].map(tipo => { const e = pick(EQUIPOS); return mk(tipo, e.id, pick(T[tipo][e.tipo]), rint(d0, d1), tipo === 'pr' ? rint(150, 700) : rint(700, 3000), tipo === 'pr' ? rint(1, 4) : rint(3, 12), rnd() < .07 ? 'obs' : 'ok'); });
    const k = total / L.reduce((a, x) => a + x.c, 0); L.forEach(x => { x.c = Math.max(50, Math.round(x.c * k / 10) * 10); });
    return L;
  };
  return [...fixed, ...batch(79, 44, 33, 181, 39450), ...batch(74, 42, 183, 364, 69780)]
    .sort((a, b) => b.ts - a.ts).map((x, i, A) => ({ ...x, id: 'INT-' + String(A.length - i).padStart(4, '0') }));
})();
const PER = { '30d': [30, 'Últimos 30 días'], '3m': [91, 'Últimos 3 meses'], '6m': [182, 'Últimos 6 meses'], '12m': [365, 'Últimos 12 meses'] };
const fmtD = ts => { const d = new Date(ts); return `${d.getDate()} ${MES[d.getMonth()].toLowerCase()} ${d.getFullYear()}`; };
const RES = { ok: ['ok', 'check', 'Completada'], obs: ['wa', 'alert', 'Con observaciones'] };
const histBase = (from, to) => HIST.filter(h => h.ts > Date.now() - to * DAY && h.ts <= Date.now() - from * DAY && (ui.he === 'all' || h.eq === ui.he));
const histRows = () => { const q = ui.hq.toLowerCase(); return histBase(0, PER[ui.hp][0]).filter(h => (ui.hist === 'all' || h.tipo === ui.hist) && (h.eq + ' ' + h.t + ' ' + h.id).toLowerCase().includes(q)); };
const pager = (p, n) => {
  if (n <= 7) return [...Array(n)].map((_, i) => i + 1);
  const w = [...new Set([1, Math.max(1, Math.min(p - 1, n - 3)), Math.max(2, Math.min(p, n - 2)), Math.max(3, Math.min(p + 1, n - 1)), n])].sort((a, b) => a - b), out = [];
  w.forEach((v, i) => { if (i && v - w[i - 1] > 1) out.push('…'); out.push(v); });
  return out;
};
V.hist = () => {
  const days = PER[ui.hp][0], cur = histBase(0, days), prv = days <= 182 ? histBase(days, days * 2) : null;
  const cost = L => L.reduce((a, h) => a + h.c, 0), nPr = cur.filter(h => h.tipo === 'pr').length, nCo = cur.length - nPr, pct = n => cur.length ? Math.round(n / cur.length * 100) : 0;
  const dN = prv ? cur.length - prv.length : null, dC = prv && cost(prv) ? Math.round((cost(cur) - cost(prv)) / cost(prv) * 100) : null;
  const rows = histRows(), per = 5, pages = Math.max(1, Math.ceil(rows.length / per)); ui.hpg = Math.min(ui.hpg, pages);
  const vis = rows.slice((ui.hpg - 1) * per, ui.hpg * per);
  return head('Historial técnico', 'Intervenciones, costos y resultados de mantenimiento', `<button type="button" class="btn line" data-csv="historial">${ic('download')}Exportar historial</button>`) +
    `<div class="g">${kpi('cr ac0', 'Intervenciones totales', cur.length, dN == null ? PER[ui.hp][1] : trend(`${dN >= 0 ? '+' : ''}${dN} vs. periodo anterior`, dN >= 0 ? 'up' : 'dn'))}
     ${kpi('acg', 'Costo total', usd(cost(cur)), dC == null ? PER[ui.hp][1] : trend(`${dC > 0 ? '+' : ''}${dC} % vs. periodo anterior`, dC > 0 ? 'up' : 'dn', dC <= 0))}
     ${kpi('ok ac', 'Preventivos', nPr, `${pct(nPr)} % del total`)}${kpi('cr ac', 'Correctivos', nCo, `${pct(nCo)} % del total`)}</div>
    <div class="card">${h2('clock', 'Registro de intervenciones', `<div class="acts hf">${chips('hist', [['all', 'Todo'], ['pr', 'Preventivo'], ['co', 'Correctivo']], ui.hist)}
      <label class="selw">${ic('calendar')}<select data-hsel="hp" aria-label="Periodo">${Object.entries(PER).map(([k, [, l]]) => `<option value="${k}" ${k === ui.hp ? 'selected' : ''}>${l}</option>`).join('')}</select>${ic('chev-d', 'cd')}</label>
      <label class="selw">${ic('user')}<select data-hsel="he" aria-label="Equipo"><option value="all">Todos los equipos</option>${EQUIPOS.map(e => `<option value="${e.id}" ${e.id === ui.he ? 'selected' : ''}>${e.id} · ${TNAME[e.tipo]}</option>`).join('')}</select>${ic('chev-d', 'cd')}</label>
      <label class="sch">${ic('search')}<input class="search" type="search" id="hq" data-q="hq" placeholder="Buscar intervención..." aria-label="Buscar intervención" value="${ui.hq}"></label></div>`)}
      <div class="tw"><table class="tbl htb"><tr><th>Tipo</th><th>Equipo</th><th>Intervención</th><th>Fecha</th><th>Costo</th><th>Duración</th><th>Resultado</th><th class="n">Acciones</th></tr>
      ${vis.map(h => `<tr><td class="c1">${pill(h.tipo === 'co' ? 'cr' : 'ok', '', h.tipo === 'co' ? 'Correctivo' : 'Preventivo')}</td><td class="c2"><strong>${h.eq}</strong></td><td class="ht c3">${h.t}</td><td class="c4">${fmtD(h.ts)}</td><td class="c5">${usd(h.c)}</td><td class="c6"><span class="mt">${ic('clock')}${h.h} h</span></td><td class="c7">${pill(...RES[h.res])}</td>
        <td class="n c8"><span class="ra"><button type="button" class="ib bd rd" data-hdet="${h.id}" aria-label="Ver detalle de ${h.id}">${ic('eye')}</button><button type="button" class="ib bd rd" data-hdoc="${h.id}" aria-label="Descargar informe de ${h.id}">${ic('file')}</button></span></td></tr>`).join('') || `<tr><td colspan="8"><div class="empty">${ic('search')}<p>No hay intervenciones con esos filtros.</p></div></td></tr>`}</table></div>
      <div class="pgr"><small>Mostrando ${vis.length} de ${rows.length} intervenciones</small>${pages > 1 ? `<nav class="pages" aria-label="Paginación"><button type="button" class="pg" data-pg="${ui.hpg - 1}" ${ui.hpg === 1 ? 'disabled' : ''} aria-label="Página anterior">${ic('chev-l')}</button>${pager(ui.hpg, pages).map(p => p === '…' ? '<span class="pe">…</span>' : `<button type="button" class="pg" data-pg="${p}" ${p === ui.hpg ? 'aria-current="page"' : ''}>${p}</button>`).join('')}<button type="button" class="pg" data-pg="${ui.hpg + 1}" ${ui.hpg === pages ? 'disabled' : ''} aria-label="Página siguiente">${ic('chev-r')}</button></nav>` : ''}</div></div>`;
};
const histDet = h => { const mo = Math.round(h.c * (h.tipo === 'co' ? .3 : .45) / 10) * 10, e = eq(h.eq);
  return `<span class="dlg-ic">${ic(h.tipo === 'co' ? 'wrench' : 'calendar')}</span><h2 id="dtt">${h.eq} · ${h.t}</h2><p class="dsub">${h.id} · ${fmtD(h.ts)}</p>
  <div class="dtop">${art(e, 'sm')}<div>${pill(h.tipo === 'co' ? 'cr' : 'ok', '', h.tipo === 'co' ? 'Correctivo' : 'Preventivo')} ${pill(...RES[h.res])}</div></div>
  <ul class="dl"><li><span>${ic('user')}Técnico</span><strong>${h.tec}</strong></li><li><span>${ic('clock')}Duración</span><strong>${h.h} h</strong></li><li><span>${ic('wrench')}Mano de obra</span><strong>${usd(mo)}</strong></li><li><span>${ic('tag')}Repuestos</span><strong>${usd(h.c - mo)}</strong></li><li><span>${ic('dollar')}Costo total</span><strong>${usd(h.c)}</strong></li></ul>
  ${h.res === 'obs' ? `<p class="note">${ic('alert')}<span>Se completó con observaciones: programar una revisión de seguimiento en la próxima ventana.</span></p>` : ''}
  <div class="acts"><button type="button" class="btn" data-hdoc="${h.id}">${ic('download')}Descargar informe</button><button type="button" class="btn line" data-close>Cerrar</button></div>`; };

/* ---------- Confiabilidad ---------- */
const PARETO = [['Mangueras hidráulicas', 52], ['Motor', 18], ['Eléctrico', 12], ['Transmisión', 10], ['Otros', 8]];
const IND = [['clock', 'Disponibilidad', '87 %', '≥ 85 %'], ['bars', 'Confiabilidad', '92 %', '≥ 90 %'], ['wrench', 'Mantenibilidad', '78 %', '≥ 75 %']];
V.conf = () => head('Confiabilidad industrial', 'Análisis de disponibilidad, confiabilidad y fallas de la flota',
  `<button type="button" class="btn line per" data-per>${ic('calendar')}Último mes${ic('chev-r')}</button><button type="button" class="btn" data-csv="confiabilidad">${ic('download')}Exportar datos</button>`) +
  `<div class="g">${kpi('ok', 'MTBF', '145 h', trend('+25 h vs. mes anterior'), 'Tiempo medio entre fallas. Más alto es mejor.')}${kpi('ok', 'MTTR', '4.5 h', trend('-0.8 h vs. mes anterior', 'dn'), 'Tiempo medio de reparación. Más bajo es mejor.')}
   ${kpi('cr', 'Meta MTBF', '100 h', `<span class="tr">${ic('check-circle')}Superada (+45 h)</span>`, 'Objetivo de tiempo medio entre fallas para la flota.')}${kpi('cr', 'Fallas del mes', '9', trend('-3 vs. mes anterior', 'dn'), 'Fallas que detuvieron un equipo durante el mes.')}</div>
  <div class="g"><div class="card s6">${h2('bars', 'Evolución de confiabilidad')}${lc({ vals: [90, 86, 88, 90.5, 86.5, 87], labels: ['May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct'].map((l, i) => [i * 20, l]), min: 80, max: 100, ticks: [100, 95, 90, 85, 80], tick: v => v + ' %', fmt: v => v + ' %', aria: 'Confiabilidad de mayo a octubre; octubre 87 %' })}</div>
   <div class="card s6">${h2('bars', 'Fallas por sistema · Pareto', tip('Porcentaje de fallas del mes según el sistema afectado.'))}<div class="pareto">${PARETO.map(([n, v]) => `<div class="par"><span>${n}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v} %</b></div>`).join('')}</div></div></div>
  <div class="g"><div class="card s6">${h2('bars', 'Indicadores de confiabilidad')}<div class="tw"><table class="tbl"><tr><th>Indicador</th><th>Valor actual</th><th>Meta</th><th>Estado</th></tr>${IND.map(([i, n, v, m]) => `<tr><td><span class="mt">${ic(i)}${n}</span></td><td><strong>${v}</strong></td><td><strong>${m}</strong></td><td>${pill('ok', 'check-circle', 'Cumple')}</td></tr>`).join('')}</table></div></div>
   <div class="card s6 ins">${h2('bulb', 'Conclusión e insights')}<p>La confiabilidad se mantiene en 92 % y supera la meta. El 52 % de las fallas se concentra en mangueras hidráulicas. Se recomienda reforzar el plan de inspección y reemplazo preventivo.</p><button type="button" class="btn block" data-plan ${state.plan ? 'disabled' : ''}>${ic(state.plan ? 'check' : 'calendar')}${state.plan ? 'Plan de acción generado' : 'Generar plan de acción'}</button></div></div>`;

/* ---------- Reportes y exportación ---------- */
const MANT = [['21 Oct', 'EX-02', 'Cambio de aceite'], ['22 Oct', 'CF-05', 'Revisión de fajas'], ['23 Oct', 'VQ-03', 'Cambio de frenos'], ['24 Oct', 'TR-04', 'Cambio de filtros'], ['25 Oct', 'EX-01', 'Inspección general']];
const SEVP = { cr: ['cr', 'Crítica'], hi: ['wa', 'Alta'], lo: ['ok', 'Baja'] };
const AST = st => st === 0 ? 'Abierta' : st === 3 ? 'Resuelta' : 'En proceso';
const CSV = {
  flota: () => [['Equipo', 'Modelo', 'Estado', 'Temperatura C', 'Prob. falla %', 'Ubicacion'], ...EQUIPOS.map(e => [e.id, e.modelo, LABEL[estadoDe(e)], e.temp, e.prob, e.ubic])],
  alertas: () => [['Fecha', 'Equipo', 'Severidad', 'Detalle', 'Estado'], ...state.alertas.map(a => [a.f, a.eq, SEVP[a.sev][1], a.t + ': ' + a.d, AST(a.st)])],
  mantenimientos: () => [['Fecha', 'Equipo', 'Tipo', 'Estado'], ...MANT.map(([f, e, t]) => [f, e, t, 'Programado']), ...HIST.slice(0, 40).map(h => [fmtD(h.ts), h.eq, h.t, 'Ejecutado'])],
  historial: () => [['Codigo', 'Tipo', 'Equipo', 'Intervencion', 'Fecha', 'Costo US$', 'Duracion h', 'Resultado', 'Tecnico'], ...histRows().map(h => [h.id, h.tipo === 'co' ? 'Correctivo' : 'Preventivo', h.eq, h.t, fmtD(h.ts), h.c, h.h, RES[h.res][2], h.tec])],
  confiabilidad: () => [['Indicador', 'Valor', 'Meta'], ['MTBF', '145 h', '100 h'], ['MTTR', '4.5 h', ''], ...IND.map(([, n, v, m]) => [n, v, m]), [], ['Sistema', 'Fallas %'], ...PARETO],
  erp: () => [['Orden', 'Descripcion', 'Costo US$', 'Fecha', 'Estado'], ...state.erp.map(o => [o.id, o.d, o.c, o.f, o.st === 'ok' ? 'Sincronizada' : 'Pendiente'])],
};
V.rep = () => {
  const card = (k, icon, t, d, more, th, rows) => `<div class="card s4 rp"><div class="rph"><span class="rpi">${ic(icon)}</span><div><h2>${t}</h2><p>${d}</p></div></div>
    <div class="pvw"><div class="pvh"><strong>Vista previa (5 registros)</strong><a class="link" href="#${more}">Ver más${ic('arrow-r')}</a></div><div class="tw"><table class="tbl mtb"><tr>${th.map(h => `<th>${h}</th>`).join('')}</tr>${rows}</table></div></div>
    <button type="button" class="btn" data-csv="${k}">${ic('download')}Exportar CSV</button></div>`;
  const flo = ['EX-02', 'CF-05', 'VQ-03', 'TR-04', 'EX-01'].map(eq);
  return head('Reportes', 'Descarga y consulta la información de la operación') + `<div class="g">` +
    card('flota', 'pie', 'Estado de la flota', 'Resumen de condición, temperatura, probabilidad de falla y ubicación.', 'flota', ['Equipo', 'Estado', 'Temp. (°C)', 'P. falla'],
      flo.map(e => `<tr><td>${e.id}</td><td>${pill(estadoDe(e), '', LABEL[estadoDe(e)])}</td><td>${e.temp}</td><td>${e.prob} %</td></tr>`).join('')) +
    card('alertas', 'bell', 'Alertas', 'Alertas por equipo, severidad y avance de atención.', 'alertas', ['Fecha', 'Equipo', 'Severidad', 'Estado'],
      state.alertas.slice(0, 5).map(a => `<tr><td>${a.f}</td><td>${a.eq}</td><td>${pill(SEVP[a.sev][0], '', SEVP[a.sev][1])}</td><td>${AST(a.st)}</td></tr>`).join('')) +
    card('mantenimientos', 'wrench', 'Mantenimientos', 'Historial y programación de intervenciones.', 'prev', ['Fecha', 'Equipo', 'Tipo', 'Estado'],
      MANT.map(([f, e, t]) => `<tr><td class="nw">${f}</td><td>${e}</td><td class="wr">${t}</td><td>${pill('gr', '', 'Programado')}</td></tr>`).join('')) + '</div>';
};

/* ---------- Umbrales ---------- */
V.umb = () => {
  const id = ui.ueq, e = eq(id), t = state.thr[id] || THR0, days = +ui.ud, aud = state.audit.filter(a => Date.now() - a.ts <= days * DAY);
  const tile = (k, icon, label, help, val, lvl, rules, step) => `<div class="tile"><span class="ti">${ic(icon)}</span><div class="f"><div class="lr"><label for="${k}">${label}</label>${tip(help)}</div><input id="${k}" name="${k}" type="number" step="${step}" value="${val}" data-rules="${rules}">${lvl === 'wa' ? '<span class="b wa">Advertencia</span>' : '<span class="b cr">Crítica</span>'}</div></div>`;
  return head('Umbrales de alerta', 'Configura los límites operativos para recibir alertas en tiempo real') +
    `<div class="g"><form class="card s8 accent" data-form="umbrales" novalidate>${h2('gear', 'Configuración de umbrales')}
      <div class="f"><label for="q7">Equipo</label><div class="eqsel">${art(e, 'xs')}<select id="q7" name="q7" data-ueq>${EQUIPOS.filter(x => x.estado !== 'gr').map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${x.id} · ${x.modelo.replace(/ \d.*$/, '')}</option>`).join('')}</select></div><small class="mt">${ic('info')}Los cambios se aplicarán para este equipo únicamente.</small></div>
      <div class="tiles">${tile('a7', 'thermo', 'Temperatura amarilla (°C)', 'Sobre este valor se genera una advertencia.', t.a, 'wa', 'required num:50,150', 1)}${tile('r7', 'thermo', 'Temperatura roja (°C)', 'Sobre este valor se genera una alerta crítica.', t.r, 'cr', 'required num:50,150', 1)}
      ${tile('v7', 'activity', 'Vibración amarilla (mm/s)', 'Sobre este valor se genera una advertencia.', t.v, 'wa', 'required num:0.1,20', 0.1)}${tile('w7', 'activity', 'Vibración roja (mm/s)', 'Sobre este valor se genera una alerta crítica.', t.w, 'cr', 'required num:0.1,20', 0.1)}</div>
      <p class="form-err" role="alert" hidden></p><div class="acts sb"><button type="button" class="btn line" data-reset>${ic('refresh')}Restablecer</button><button class="btn">${ic('check')}Guardar umbrales</button></div></form>
    <div class="stk s4"><div class="card">${h2('shield-check', 'Auditoría', `<select class="msel" data-ud aria-label="Periodo de auditoría">${[[7, 'Últimos 7 días'], [30, 'Últimos 30 días'], [90, 'Últimos 90 días']].map(([v, l]) => `<option value="${v}" ${v === days ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
      ${aud.length ? `<ul class="tl au">${aud.map((a, i) => `<li class="${i ? '' : 'on'}"><div><strong>${fmtTs(a.ts)}</strong><small>${a.who} ${a.txt}</small></div>${a.tag ? `<span class="b cr">${a.tag}</span>` : ''}</li>`).join('')}</ul>` : `<div class="empty">Sin cambios en este periodo.</div>`}</div>
      <div class="card">${h2('eye', 'Vista previa de alertas')}<div class="pv">${ic('warn')}<div><strong>Alerta de temperatura</strong><p id="pv-t">La temperatura de ${id} alcanzó ${t.r} °C (umbral rojo).</p></div><small>${hhmm()}</small></div>
      <div class="rec">${ic('bulb')}<div><strong>Recomendación</strong><p>Mantén los umbrales actualizados según las condiciones operativas de tu flota.</p></div></div></div></div></div>`;
};

/* ---------- ERP ---------- */
const EST = { ok: ['ok', 'check', 'Sincronizada'], pe: ['wa', 'clock', 'Pendiente'], er: ['cr', 'alert', 'Con error'] };
V.erp = () => {
  const L = state.erp, ok = L.filter(o => o.st === 'ok'), pe = L.filter(o => o.st === 'pe');
  const nSync = 22 + ok.length, cost = 14400 + ok.reduce((s, o) => s + o.c, 0), rate = Math.round(nSync / (nSync + pe.length) * 100);
  const f = ui.ef, q = ui.qe.toLowerCase(), rows = L.filter(o => (f === 'all' || o.st === f) && (o.id + o.d).toLowerCase().includes(q));
  return head('Conexión con ERP', 'Sincroniza órdenes, costos y repuestos con el sistema contable',
    `<div class="live"><span class="b ok"><i class="pulse"></i>Conectado</span><small>Última sincronización: ${state.erpAt}</small><button type="button" class="ib" data-erpchk aria-label="Verificar conexión">${ic('refresh')}</button></div>`) +
    `<div class="g">${kpi('ok ac', 'Órdenes sincronizadas', nSync, trend('+3 vs. semana anterior'))}${kpi('', 'Costo total sincronizado', usd(cost), 'Este mes')}${kpi('wa', 'Pendientes de sincronizar', pe.length, 'Órdenes en cola')}${kpi('ok', 'Tasa de sincronización', rate + ' %', 'Objetivo: ≥ 90 %')}</div>
    <div class="card">${h2('database', 'Órdenes del ERP', `<div class="acts">${chips('ef', [['all', 'Todas'], ['ok', 'Sincronizadas'], ['pe', 'Pendientes'], ['er', 'Con error']], f)}<label class="sch">${ic('search')}<input class="search" type="search" id="qe" data-q="qe" placeholder="Buscar orden..." aria-label="Buscar orden" value="${ui.qe}"></label></div>`)}
      <div class="tw"><table class="tbl"><tr><th>Orden</th><th>Descripción</th><th>Costo</th><th>Fecha</th><th>Estado</th><th></th></tr>
      ${rows.map(o => `<tr><td><strong class="red">${o.id}</strong></td><td>${o.d}</td><td>${usd(o.c)}</td><td>${o.f}</td><td>${pill(...EST[o.st])}</td><td class="n"><button type="button" class="ib bd" data-erpdoc="${o.id}" aria-label="Descargar comprobante de ${o.id}">${ic('file')}</button></td></tr>`).join('') || `<tr><td colspan="6"><div class="empty">${ic('search')}<p>No hay órdenes con ese filtro.</p></div></td></tr>`}</table></div>
      <div class="acts sb mt16"><button type="button" class="btn" data-erp ${pe.length ? '' : 'disabled'}>${ic('refresh')}Reintentar sincronización</button><button type="button" class="btn line" data-csv="erp">${ic('download')}Exportar reporte</button></div></div>`;
};

/* ---------- Perfil ---------- */
const PREFS = [['n1', 'mail', 'Alertas críticas por correo', 'Te avisamos cuando un equipo requiera parada.'], ['n2', 'msg', 'Alertas por mensaje de texto', 'Para cuando estés en campo.'], ['n3', 'bars', 'Reportes semanales', 'Recibe un resumen de desempeño de la flota.']];
const initials = n => (n || 'U').split(' ').map(w => w[0]).slice(0, 2).join('');
V.perfil = () => {
  const u = me() || {}, tel = u.tel || '+51 987 654 321', [cc, ...num] = tel.split(' '), acts = ui.actAll ? state.act : state.act.slice(0, 3);
  return head('Mi perfil y seguridad', 'Gestiona tu información, credenciales y preferencias de la cuenta', `<a class="btn line" href="#dash">${ic('arrow-l')}Volver al resumen</a>`) +
    `<div class="card pf"><span class="av xl">${initials(u.name)}</span><div class="pfi"><h2>${u.name || 'Usuario'}</h2><small>${u.rol || 'Jefe de mantenimiento'}</small><div class="pfc"><span class="mt">${ic('mail')}${u.email || ''}</span><span class="mt">${ic('phone')}${tel}</span></div></div>
      <ul class="pfm"><li><span class="kic cr">${ic('calendar')}</span><span><small>Miembro desde</small><strong>${u.since || 'Oct 2026'}</strong></span></li><li><span class="kic cr">${ic('shield')}</span><span><small>Rol</small><strong>Administrador</strong></span></li><li><span class="kic cr">${ic('users')}</span><span><small>Área</small><strong>Mantenimiento</strong></span></li></ul></div>
    <div class="g"><form class="card s6" data-form="datos" novalidate>${h2('clip', 'Datos personales', `<button type="button" class="btn line sm" data-edit>${ic('edit')}Editar</button>`)}
      <div class="fr"><label for="pn">Nombre completo</label><div class="f"><input id="pn" name="pn" value="${u.name || ''}" autocomplete="name" data-rules="required min:3"></div></div>
      <div class="fr"><label for="pc">Correo institucional</label><div class="f"><input id="pc" name="pc" type="email" value="${u.email || ''}" autocomplete="email" data-rules="required email"></div></div>
      <div class="fr"><label for="pt">Teléfono</label><div class="f"><div class="tel"><select name="pcc" aria-label="Código de país">${['+51', '+52', '+54', '+56', '+57', '+1', '+34'].map(c => `<option ${c === cc ? 'selected' : ''}>${c}</option>`).join('')}</select><input id="pt" name="pt" type="tel" value="${num.join(' ')}" autocomplete="tel-national" data-rules="required phone"></div></div></div>
      <button class="btn">${ic('check')}Guardar cambios</button></form>
    <div class="card s6">${h2('lock', 'Seguridad de la cuenta')}<ul class="sec">
      <li><span class="kic cr">${ic('wrench')}</span><div><strong>Cambiar contraseña</strong><small>Actualiza tu contraseña de acceso.</small></div><button type="button" class="btn ghost sm" data-dlg="clave">Actualizar${ic('chev-r')}</button></li>
      <li><span class="kic cr">${ic('shield')}</span><div><strong>Autenticación en dos pasos (2FA)</strong><small>Añade una capa extra de seguridad.</small></div><span class="tfa">${state.tfa ? pill('ok', 'check', 'Activada') : pill('gr', '', 'Desactivada')}<input type="checkbox" class="tgl" id="tfa" ${state.tfa ? 'checked' : ''} aria-label="Autenticación en dos pasos"></span></li>
      <li><span class="kic cr">${ic('monitor')}</span><div><strong>Dispositivos activos</strong><small>Gestiona los dispositivos con sesión iniciada.</small></div><button type="button" class="btn line sm" data-dlg="devs">Ver dispositivos${ic('chev-r')}</button></li></ul></div></div>
    <div class="g"><div class="card s6">${h2('bell', 'Preferencias de notificaciones')}<ul class="sec">${PREFS.map(([k, i, t, d]) => `<li><span class="kic cr">${ic(i)}</span><div><strong>${t}</strong><small>${d}</small></div><input type="checkbox" class="tgl" data-pref="${k}" ${state.prefs[k] ? 'checked' : ''} aria-label="${t}"></li>`).join('')}</ul></div>
    <div class="card s6">${h2('clock', 'Actividad reciente', state.act.length > 3 ? `<button type="button" class="link lk" data-tg="actAll">${ui.actAll ? 'Ver menos' : 'Ver historial'}${ic('arrow-r')}</button>` : '')}<ul class="tl ac">${acts.map((a, i) => `<li class="${i ? '' : 'on'}"><div><strong>${a.t}</strong><small>${a.w}</small></div></li>`).join('')}</ul></div></div>`;
};
const devsHTML = () => `<span class="dlg-ic">${ic('monitor')}</span><h2 id="dvt">Dispositivos activos</h2><p class="dsub">Cierra la sesión en los dispositivos que no reconozcas.</p>
  <ul class="sec dv">${state.devs.map((d, i) => `<li><span class="kic">${ic(d.i)}</span><div><strong>${d.n}</strong><small>${d.w}</small></div>${d.me ? pill('ok', 'check', 'Actual') : `<button type="button" class="btn line sm" data-devout="${i}">Cerrar sesión</button>`}</li>`).join('')}</ul>
  <div class="acts"><button type="button" class="btn line" data-close>Cerrar</button></div>`;

/* ===== Navegación ===== */
const NAV = [['Monitoreo', [['dash', 'Resumen'], ['flota', 'Flota'], ['alertas', 'Alertas']]], ['Decisión', [['ia', 'IA y ROI'], ['ops', 'Operaciones']]],
  ['Taller', [['taller', 'Órdenes'], ['prev', 'Preventivos'], ['hist', 'Historial']]], ['Análisis y sistema', [['conf', 'Confiabilidad'], ['rep', 'Reportes'], ['umb', 'Umbrales'], ['erp', 'ERP']]]];
const TITLES = { dash: 'Resumen', flota: 'Flota', ficha: 'Ficha de equipo', alertas: 'Alertas', ia: 'IA y ROI', ops: 'Operaciones', taller: 'Órdenes', prev: 'Preventivos', hist: 'Historial', conf: 'Confiabilidad', rep: 'Reportes', umb: 'Umbrales', erp: 'ERP', perfil: 'Mi perfil' };
const NAV_IC = { dash: 'home', flota: 'truck', alertas: 'bell', ia: 'trend', ops: 'briefcase', taller: 'wrench', prev: 'calendar', hist: 'clock', conf: 'shield', rep: 'bars', umb: 'sliders', erp: 'database' };
const AUTH = ['login', 'registro', 'recuperar'];
let last = 'dash';

function buildNav(cur) {  // cur local = página activa
  const u = me() || {}, nAl = state.alertas.filter(a => a.st < 3 && a.sev !== 'lo').length;
  const active = cur === 'ficha' ? 'flota' : cur;
  $('#mbar-av').textContent = initials(u.name);
  $('#nav').innerHTML = `<a class="brand" href="#dash"><svg width="30" height="28" viewBox="0 0 30 28" aria-hidden="true"><path d="M15 1 29 27h-9l-5-10-5 10H1z" fill="#e10e19"/></svg><span>Infra<b style="color:#e10e19">Metrics</b></span></a>` +
    NAV.map(([g, items]) => `<span class="gt">${g}</span>` + items.map(([r, l]) => `<a href="#${r}" ${r === active ? 'aria-current="page"' : ''}>${ic(NAV_IC[r])}<span>${l}</span>${r === 'alertas' && nAl ? `<span class="cnt">${nAl}</span>` : ''}</a>`).join('')).join('') +
    `<div class="me"><a class="usr" href="#perfil" ${cur === 'perfil' ? 'aria-current="page"' : ''}><span class="av">${(u.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('')}</span><span><strong>${u.name || 'Usuario'}</strong><small>${u.rol || 'Jefe de mantenimiento'}</small></span>${ic('chev-r', 'ch')}</a><a class="out" href="#login" data-logout>${ic('logout')}Cerrar sesión</a></div>`;
}

function navOpen(on) {
  document.body.classList.toggle('nav-open', on); $('#scrim').hidden = !on;
  $('#menu-btn').setAttribute('aria-expanded', on); $('#menu-btn').setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
  if (on) $('#nav a[aria-current]')?.focus();
}
function route() {
  const [name, arg] = (location.hash.slice(1) || 'login').split('/');
  const logged = !!me();
  if (!logged && !AUTH.includes(name)) return void (location.hash = '#login');
  if (logged && AUTH.includes(name)) return void (location.hash = '#dash');
  navOpen(false);
  if (name === 'parada') {
    const e = eq(arg) || eq(ui.iaEq) || eq('EX-02'), r = pred(e), dlg = $('#parada');
    if (!$('#view').innerHTML) { $('#view').innerHTML = V.dash(); $('#shell').hidden = false; document.body.dataset.mode = 'app'; buildNav('dash'); }
    dlg.dataset.eq = e.id; $('#pt').textContent = `Autorizar parada de ${e.id}`; $('#pp').textContent = `Probabilidad de falla: ${e.prob} % en las próximas 48 horas.`; $('#pd').textContent = `${r.dias} días`;
    if (!dlg.open) dlg.showModal(); return;
  }
  if ($('#parada').open) $('#parada').close();
  if (AUTH.includes(name)) {
    document.body.dataset.mode = 'auth'; $('#shell').hidden = true;
    $$('[data-auth]').forEach(s => s.hidden = s.id !== name);
    if (name === 'recuperar') resendTimer();
    document.title = { login: 'Iniciar sesión', registro: 'Crear cuenta', recuperar: 'Restablecer contraseña' }[name] + ' · InfraMetrics';
    return;
  }
  if (!V[name]) return void (location.hash = '#dash');
  document.body.dataset.mode = 'app'; $('#shell').hidden = false;
  cur = name; $('#view').innerHTML = V[name](arg); decorate();
  buildNav(name); last = arg ? `${name}/${arg}` : name;
  document.title = `${TITLES[name]} · InfraMetrics`;
  $('#view').focus({ preventScroll: true }); scrollTo(0, 0);
}
const refresh = () => { const f = document.activeElement?.id, y = scrollY; route(); scrollTo(0, y); if (f) $('#' + f)?.focus({ preventScroll: true }); };


/* ===== Confirmación genérica (acciones irreversibles) ===== */
let pending = null;
function ask({ title, msg, ok = 'Confirmar' }, fn) {
  $('#ct').textContent = title; $('#cm').textContent = msg; $('#c-ok span').textContent = ok;
  pending = fn; $('#confirm').showModal(); $('#c-no').focus();
}
const download = (name, rows) => {
  const body = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })), download: name + '.csv' });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Descarga lista.');
};

/* ===== Acciones de formulario ===== */
const FORMS = {
  login(f) {
    const d = new FormData(f), u = users().find(x => x.email === d.get('e1').trim().toLowerCase());
    if (!u || u.pass !== d.get('p1')) return formError(f, 'Correo o contraseña incorrectos. Revisa los datos o restablece tu contraseña.');
    login(u.email, d.get('remember') === 'on'); addAct('Inicio de sesión', 'Web'); persist();
    location.hash = '#dash'; toast(`Bienvenido, ${u.name.split(' ')[0]}.`);
  },
  registro(f) {
    const d = new FormData(f), email = d.get('e2').trim().toLowerCase(), all = users(), now = new Date();
    if (all.some(u => u.email === email)) return setErr($('#e2'), 'Ya existe una cuenta con este correo. Inicia sesión.'), $('#e2').focus();
    save('im_users', [...all, { name: d.get('n2').trim(), email, pass: d.get('p2'), rol: d.get('r2'), since: `${MES[now.getMonth()]} ${now.getFullYear()}` }]);
    f.reset(); meter(''); location.hash = '#login'; toast('Cuenta creada. Ya puedes iniciar sesión.');
  },
  recuperar(f) {
    const d = new FormData(f), email = d.get('e3').trim().toLowerCase(), all = users(), u = all.find(x => x.email === email);
    if (d.get('o3') !== '123456') return setErr($('#o3'), 'El código es incorrecto o venció. Solicita uno nuevo.'), $('#d0').focus();
    if (!u) return formError(f, 'No encontramos una cuenta con ese correo.');
    u.pass = d.get('p3'); save('im_users', all); f.reset(); $('#o3').value = ''; location.hash = '#login'; toast('Contraseña restablecida. Inicia sesión.');
  },
  costo(f) { state.rates[ui.iaEq] = +new FormData(f).get('cp'); persist(); refresh(); toast(`Cálculo de ${ui.iaEq} actualizado.`); },
  prorroga(f) {
    const d = new FormData(f);
    if (eq('EX-02').prob >= 95) return toast('Prórroga denegada: el riesgo es de 95 % o más.', 'err');
    f.reset(); toast(`Prórroga de ${d.get('h4')} h solicitada. Mantenimiento decidirá según el riesgo.`, 'wa');
  },
  prev(f) {
    const sel = $$('[name=pv]:checked', f).map(c => +c.value);
    if (!sel.length) return formError(f, 'Selecciona al menos un mantenimiento para aprobar.');
    sel.forEach(i => state.ots.push({ eq: state.prev[i].eq, t: state.prev[i].t, col: 1, plazo: 0 }));
    state.prev = state.prev.filter((_, i) => !sel.includes(i)); persist(); refresh(); toast(`${sel.length} mantenimiento(s) aprobado(s). Se generaron las órdenes de trabajo.`);
  },
  nprev(f) {
    const d = new FormData(f), a = +d.get('n5a'), b = +d.get('n5b'), dt = new Date(d.get('n5d') + 'T00:00');
    if (a > b) return setErr($('#n5a'), 'Las horas actuales no pueden superar el intervalo.'), $('#n5a').focus();
    const lab = `${DOW[dt.getDay()]} ${dt.getDate()}`;
    state.prev.push({ eq: d.get('n5e'), tipo: d.get('n5k'), t: d.get('n5t').trim(), h: [a, b], f: `${lab} ${MES[dt.getMonth()].toLowerCase()}` });
    state.prox.push({ d: lab, eq: d.get('n5e'), t: d.get('n5t').trim() }); state.extra++;
    persist(); f.reset(); f.closest('dialog').close(); refresh(); toast('Preventivo agregado a los pendientes de aprobación.');
  },
  umbrales(f) {
    const d = new FormData(f), id = d.get('q7'), [a, r, v, w] = ['a7', 'r7', 'v7', 'w7'].map(k => +d.get(k));
    if (a >= r || v >= w) return formError(f, 'El valor amarillo debe ser menor que el rojo, tanto en temperatura como en vibración.');
    state.thr[id] = { a, r, v, w };
    state.audit.unshift({ ts: Date.now(), who: me()?.name || 'Tú', txt: `actualizó los umbrales de ${id}`, tag: 'Cambio' });
    persist(); refresh(); toast(`Umbrales de ${id} guardados.`);
  },
  datos(f) {
    const d = new FormData(f), all = users(), u = all.find(x => x.email === session());
    if (u) { u.name = d.get('pn').trim(); u.tel = `${d.get('pcc')} ${d.get('pt').trim()}`; u.email = d.get('pc').trim().toLowerCase(); save('im_users', all); login(u.email, !!localStorage.getItem('im_session')); }
    addAct('Datos personales actualizados'); persist(); refresh(); toast('Datos actualizados.');
  },
  clave(f) {
    const d = new FormData(f), all = users(), u = all.find(x => x.email === session());
    if (!u || u.pass !== d.get('c0')) return setErr($('#c0'), 'La contraseña actual no es correcta.'), $('#c0').focus();
    if (d.get('c1') === u.pass) return formError(f, 'La nueva contraseña debe ser distinta de la actual.');
    u.pass = d.get('c1'); save('im_users', all); f.reset(); f.closest('dialog').close();
    addAct('Contraseña actualizada'); persist(); refresh(); toast('Contraseña actualizada.');
  },
};


/* ===== Crear cuenta y restablecer contraseña ===== */
const STRENGTH = [['', 'Mínimo 8 caracteres, con letras y números'], ['cr', 'Débil'], ['wa', 'Media'], ['ok', 'Segura'], ['ok', 'Muy segura']];
function meter(v) {
  const m = $('#meter'); if (!m) return;
  const n = !v ? 0 : [v.length >= 8, /[A-Za-z]/.test(v) && /\d/.test(v), /[A-Z]/.test(v) && /[a-z]/.test(v), v.length >= 12 || /[^A-Za-z0-9]/.test(v)].filter(Boolean).length || 1;
  const [cls, txt] = STRENGTH[v ? n : 0];
  m.className = 'meter ' + cls; $$('i', m).forEach((b, i) => b.classList.toggle('on', !!v && i < n)); $('span', m).textContent = txt;
}
const otpBoxes = () => $$('[data-otp] input');
function otpSync() { const h = $('#o3'); h.value = otpBoxes().map(b => b.value).join(''); if (h.getAttribute('aria-invalid')) check(h); }
function otpInput(b) {
  const bx = otpBoxes(), i = bx.indexOf(b), d = b.value.replace(/\D/g, '');
  if (d.length > 1) { d.slice(0, 6 - i).split('').forEach((c, k) => { bx[i + k].value = c; }); bx[Math.min(5, i + d.length - 1)].focus(); }
  else { b.value = d; if (d && i < 5) bx[i + 1].focus(); }
  otpSync();
}
document.addEventListener('keydown', e => {
  if (!e.target.closest?.('[data-otp]')) return;
  const bx = otpBoxes(), i = bx.indexOf(e.target);
  if (e.key === 'Backspace' && !e.target.value && i > 0) { bx[i - 1].value = ''; bx[i - 1].focus(); otpSync(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft' && i > 0) bx[i - 1].focus();
  else if (e.key === 'ArrowRight' && i < 5) bx[i + 1].focus();
});
let resendT;
function resendTimer() {
  const b = $('[data-resend]'); if (!b) return; clearInterval(resendT); let s = 45;
  const tick = () => { if (s <= 0) { clearInterval(resendT); b.disabled = false; b.textContent = 'Reenviar código'; return; } b.disabled = true; b.innerHTML = `Reenviar código en <b>0:${String(s).padStart(2, '0')}</b>`; s--; };
  tick(); resendT = setInterval(tick, 1000);
}

/* ===== Eventos ===== */
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); formError(f, '');
  if (validate(f)) FORMS[f.dataset.form](f);
});
document.addEventListener('focusout', e => { if (e.target.matches?.('[data-rules]') && (e.target.value || e.target.getAttribute('aria-invalid'))) check(e.target); });
document.addEventListener('input', e => {
  if (e.target.dataset?.q) { ui[e.target.dataset.q] = e.target.value; if (e.target.dataset.q === 'hq') ui.hpg = 1; const id = e.target.id, pos = e.target.selectionStart; refresh(); const q = $('#' + id); q.focus(); q.setSelectionRange(pos, pos); return; }
  if (e.target.id === 'p2') meter(e.target.value);
  if (e.target.closest?.('[data-otp]')) otpInput(e.target);
  if (e.target.id === 'r7' && $('#pv-t')) $('#pv-t').textContent = `La temperatura de ${ui.ueq} alcanzó ${e.target.value || '—'} °C (umbral rojo).`;
  if (e.target.getAttribute?.('aria-invalid')) check(e.target);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.ueq !== undefined) { ui.ueq = t.value; refresh(); }
  else if (t.dataset.ud !== undefined) { ui.ud = t.value; refresh(); }
  else if (t.id === 'tfa') { state.tfa = t.checked; addAct(t.checked ? '2FA activada' : '2FA desactivada'); persist(); refresh(); toast(t.checked ? 'Autenticación en dos pasos activada.' : 'Autenticación en dos pasos desactivada.', t.checked ? '' : 'wa'); }
  else if (t.dataset.pref) { state.prefs[t.dataset.pref] = t.checked; persist(); toast('Preferencia guardada.'); }
  else if (t.dataset.comp) { const e = eq(ui.iaEq), a = compsOf(e); a[+t.dataset.comp] = t.checked; state.comps[e.id] = a; persist(); refresh(); }
  else if (t.dataset.iasel !== undefined) location.hash = '#ia/' + t.value;
  else if (t.dataset.hsel) { ui[t.dataset.hsel] = t.value; ui.hpg = 1; refresh(); }
  else if (t.dataset.all !== undefined) { $$('[name=pv]', t.form).forEach(c => { c.checked = t.checked; }); }
  else if (t.name === 'pv') { const all = $('[data-all]', t.form), b = $$('[name=pv]', t.form); all.checked = b.every(c => c.checked); all.indeterminate = !all.checked && b.some(c => c.checked); }
});
document.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const ds = t.dataset;
  if (ds.refresh !== undefined) { upd = Date.now(); refresh(); toast('Datos actualizados.'); }
  else if (ds.car) { slide = (slide + +ds.car + 3) % 3; refresh(); }
  else if (ds.tg) { ui[ds.tg] = !ui[ds.tg]; refresh(); }
  else if (ds.resend !== undefined) { toast('Te enviamos un nuevo código a tu correo.'); resendTimer(); }
  else if (ds.social) { toast(`El acceso con ${ds.social} no está activo en esta demostración.`, 'wa'); }
  else if (ds.eye !== undefined) { const i = $('input', t.parentElement), show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.innerHTML = ic(show ? 'eye-off' : 'eye'); t.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña'); t.setAttribute('aria-pressed', show); }
  else if (ds.logout !== undefined) { e.preventDefault(); logout(); }
  else if (t.closest('[data-chips]')) { const k = t.closest('[data-chips]').dataset.chips; ui[k] = ds.v; if (k === 'hist') ui.hpg = 1; refresh(); }
  else if (ds.adv) { const a = state.alertas[+ds.adv]; a.st = Math.min(3, a.st + 1); persist(); refresh(); toast(`${a.eq}: alerta ${ETAPAS[a.st].toLowerCase()}.`); }
  else if (ds.ot) {
    const o = state.ots[+ds.ot];
    ask({ title: `¿Avanzar la orden de ${o.eq}?`, msg: `«${o.t}» pasará de «${COLS[o.col]}» a «${COLS[o.col + 1]}».`, ok: 'Sí, avanzar' },
      () => { o.col++; persist(); refresh(); toast(`${o.eq}: orden en «${COLS[o.col]}».`); });
  }
  else if (t.id === 'c-ok') { const fn = pending; pending = null; $('#confirm').close(); fn?.(); }
  else if (t.id === 'c-no') { pending = null; $('#confirm').close(); }
  else if (ds.csv) download(ds.csv, CSV[ds.csv]());
  else if (ds.erpdoc) { const o = state.erp.find(x => x.id === ds.erpdoc); download(o.id, [['Orden', 'Descripcion', 'Costo US$', 'Fecha', 'Estado'], [o.id, o.d, o.c, o.f, EST[o.st][2]]]); }
  else if (ds.erpchk !== undefined) toast('Conexión con el ERP verificada.');
  else if (ds.erp !== undefined) {
    t.disabled = true; t.lastChild.textContent = 'Sincronizando…';
    setTimeout(() => { const n = state.erp.filter(o => o.st === 'pe').length; state.erp.forEach(o => { o.st = 'ok'; }); state.erpAt = `hoy, ${hhmm()}`; addAct('Sincronización con ERP'); persist(); if (location.hash === '#erp') refresh(); toast(`${n} orden(es) sincronizada(s) con el ERP.`); }, 900);
  }
  else if (ds.dlg) { if (ds.dlg === 'devs') $('#devs-b').innerHTML = devsHTML(); $('#' + ds.dlg).showModal(); }
  else if (ds.close !== undefined) t.closest('dialog').close();
  else if (ds.devout) { state.devs.splice(+ds.devout, 1); persist(); $('#devs-b').innerHTML = devsHTML(); toast('Sesión cerrada en ese dispositivo.'); }
  else if (ds.scroll) { const el = $('#' + ds.scroll); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  else if (ds.edit !== undefined) { const i = $('#pn'); i.focus(); i.select(); }
  else if (ds.reset !== undefined) { const f = t.form; [['a7', THR0.a], ['r7', THR0.r], ['v7', THR0.v], ['w7', THR0.w]].forEach(([k, v]) => { f.elements[k].value = v; setErr(f.elements[k], ''); }); $('#pv-t').textContent = `La temperatura de ${ui.ueq} alcanzó ${THR0.r} °C (umbral rojo).`; toast('Valores por defecto cargados. Guarda para aplicarlos.', 'wa'); }
  else if (ds.per !== undefined) toast('Por ahora el análisis está disponible solo para el último mes.', 'wa');
  else if (ds.plan !== undefined) {
    state.plan = true; state.prev.push({ eq: 'EX-02', tipo: 'pr', t: 'Inspección de mangueras hidráulicas', h: [0, 250], f: 'Esta semana' }); state.extra++;
    state.prox.push({ d: 'Próx.', eq: 'EX-02', t: 'Inspección de mangueras hidráulicas' }); persist(); refresh(); toast('Plan de acción generado: la inspección de mangueras se agregó a Preventivos.');
  }
  else if (ds.gen !== undefined) {
    const e = eq(ui.iaEq), sel = compsOf(e), c = COMPS[e.tipo].filter((_, i) => sel[i]);
    if (!c.length) return toast('Marca al menos un componente a intervenir.', 'err');
    state.ots.unshift({ eq: e.id, t: (lvlOf(e.prob) === 'cr' ? 'Correctivo: ' : 'Inspección: ') + c.map(x => x.replace(/ \(.*/, '').toLowerCase()).join(' y '), col: 0, plazo: 2 });
    persist(); location.hash = '#taller'; toast(`Orden de trabajo generada para ${e.id}.`);
  }
  else if (t.id === 'p-ok') { const id = $('#parada').dataset.eq, o = state.ots.find(x => x.eq === id && x.col === 0); state.paradas[id] = true; if (o) o.col = 1; else state.ots.push({ eq: id, t: 'Parada por riesgo de falla', col: 1, plazo: 0 }); persist(); $('#parada').close(); location.hash = '#taller'; toast(`Parada de ${id} autorizada. Se asignó la orden de trabajo.`); }
  else if (ds.pg) { ui.hpg = +ds.pg; refresh(); $('.htb')?.closest('.card').scrollIntoView({ block: 'nearest' }); }
  else if (ds.hdet) { $('#det-b').innerHTML = histDet(HIST.find(h => h.id === ds.hdet)); $('#det').showModal(); }
  else if (ds.hdoc) { const h = HIST.find(x => x.id === ds.hdoc); download(h.id, [['Codigo', 'Tipo', 'Equipo', 'Intervencion', 'Fecha', 'Costo US$', 'Duracion h', 'Resultado', 'Tecnico'], [h.id, h.tipo === 'co' ? 'Correctivo' : 'Preventivo', h.eq, h.t, fmtD(h.ts), h.c, h.h, RES[h.res][2], h.tec]]); }
  else if (t.id === 'menu-btn') navOpen(!document.body.classList.contains('nav-open'));
  else if (ds.navclose !== undefined) navOpen(false);
  else if (t.id === 'p-no') { $('#parada').close(); }
});
$('#parada').addEventListener('close', () => { if (location.hash === '#parada') location.hash = '#' + last; });
$('#confirm').addEventListener('close', () => { pending = null; });
$('#n5e').insertAdjacentHTML('beforeend', EQUIPOS.map(e => `<option value="${e.id}">${e.id} · ${e.modelo}</option>`).join(''));
addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { navOpen(false); $('#menu-btn').focus(); } });
addEventListener('resize', () => { if (innerWidth > 900 && document.body.classList.contains('nav-open')) navOpen(false); });
addEventListener('hashchange', route);
addEventListener('DOMContentLoaded', route);
