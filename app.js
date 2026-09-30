'use strict';

// Gewichte von insgesamt 100 000. Kopf und Zahl je 49 %, der Rest ist Chaos (2 %).
const OUTCOMES = [
  {
    id: 'kopf', weight: 49000, icon: '🦅', short: 'K', name: 'Kopf',
    lines: ['Der Adler liegt oben.', 'Kopf gewinnt diese Runde.', 'Du hast Kopf geworfen.'],
  },
  {
    id: 'zahl', weight: 49000, icon: '1', short: 'Z', name: 'Zahl',
    lines: ['Die Eins liegt oben.', 'Zahl gewinnt diese Runde.', 'Du hast Zahl geworfen.'],
  },
  {
    id: 'rand', weight: 800, icon: '🪙', name: 'Auf dem Rand!', special: true,
    desc: 'Die Münze bleibt auf der Kante stehen.',
    lines: ['Wirf nochmal oder mach beides.', 'Du hast gerade eine Chance von 1 zu 125 getroffen.', 'Diese Entscheidung musst du selbst treffen.'],
  },
  {
    id: 'moewe', weight: 400, icon: '🐦', name: 'Eine Möwe klaut die Münze!', special: true,
    desc: 'Ein Vogel schnappt sich die Münze mitten im Flug.',
    lines: ['Die Möwe hat jetzt 1 € und du keine Antwort.', 'Sei froh, dass sie nicht deine Pommes genommen hat.', 'Die Möwe hat sich für „Meins“ entschieden.'],
  },
  {
    id: 'gully', weight: 400, icon: '🕳️', name: 'Ab in den Gully!', special: true,
    desc: 'Die Münze rollt weg und fällt durch das Gitter.',
    lines: ['Die Kanalratten bedanken sich für die Spende.', 'Die Münze liegt jetzt im Kanal. Gleich fällt eine neue von oben.'],
  },
  {
    id: 'schwebt', weight: 200, icon: '🎈', name: 'Die Münze schwebt.', special: true,
    desc: 'Die Münze bleibt in der Luft hängen und dreht sich.',
    lines: ['Newton dreht sich im Grab um.', 'Du siehst eine Münze, die nicht runterfällt. Wirf nochmal.'],
  },
  {
    id: 'geteilt', weight: 150, icon: '💔', name: 'Halb Kopf, halb Zahl.', special: true,
    desc: 'Die Münze zerbricht in zwei Hälften.',
    lines: ['Kompromiss! Beide Seiten bekommen ein bisschen recht.', 'Nimm von beidem die Hälfte.'],
  },
  {
    id: 'loch', weight: 50, icon: '🌌', name: 'Schwarzes Loch!', special: true,
    desc: 'Ein schwarzes Loch verschluckt die Münze samt Ergebnis.',
    lines: ['Die Münze liegt jetzt in einer anderen Dimension.', 'Dein Ergebnis steckt hinter dem Ereignishorizont.', 'Ein Paralleluniversum kennt jetzt die Antwort.'],
  },
];
const TOTAL_WEIGHT = OUTCOMES.reduce((s, o) => s + o.weight, 0);
const BY_ID = Object.fromEntries(OUTCOMES.map((o) => [o.id, o]));
const STORE_KEY = 'coinflip.v1';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const wrap = $('coin-wrap');
const coin = $('coin');
const shadow = $('shadow');
const bird = $('bird');
const hole = $('hole');
const drain = $('drain');
const halfL = wrap.querySelector('.half-left');
const halfR = wrap.querySelector('.half-right');
const resultBox = $('result');
const resultTitle = $('result-title');
const resultSub = $('result-sub');
const flipBtn = $('btn-flip');

let rot = 0; // aktuelle rotateX der Münze in Grad
let busy = false;
let coinGone = false;
let state = loadState();

// ---------- Zufall ----------

function randomInt(max) {
  // unverzerrte Zufallszahl in [0, max) via crypto
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % max;
}

function pickOutcome() {
  let r = randomInt(TOTAL_WEIGHT);
  for (const o of OUTCOMES) {
    if (r < o.weight) return o;
    r -= o.weight;
  }
  return OUTCOMES[0];
}

const pick = (arr) => arr[randomInt(arr.length)];

// ---------- Speicher ----------

function loadState() {
  const fresh = { counts: {}, total: 0, history: [], streak: { id: null, n: 0 }, best: 0, labels: ['', ''], muted: false };
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    return s ? { ...fresh, ...s } : fresh;
  } catch {
    return fresh;
  }
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* egal */ }
}

// ---------- Sound & Haptik ----------

let audio;
function tone(freq, dur, { type = 'sine', gain = 0.15, delay = 0, slide } = {}) {
  if (state.muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch { /* kein Audio */ }
}

const sfx = {
  flip() { tone(2400, 0.25, { gain: 0.08 }); tone(3600, 0.18, { gain: 0.04 }); },
  land() { tone(1800, 0.12, { gain: 0.1, type: 'triangle' }); tone(2700, 0.2, { gain: 0.06, delay: 0.09 }); vibrate(30); },
  special() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { gain: 0.08, delay: i * 0.09, type: 'triangle' })); vibrate([40, 60, 40, 60, 120]); },
  swoosh() { tone(300, 0.4, { gain: 0.08, type: 'sawtooth', slide: 900 }); },
  plop() { tone(600, 0.3, { gain: 0.15, slide: 120 }); },
  crack() { tone(180, 0.15, { gain: 0.2, type: 'square', slide: 60 }); vibrate(80); },
  whoosh() { tone(900, 1.2, { gain: 0.08, type: 'sawtooth', slide: 40 }); },
};

function vibrate(p) { if (!state.muted && navigator.vibrate) navigator.vibrate(p); }

// ---------- Animation-Helfer ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function anim(el, frames, opts) {
  return el.animate(frames, { fill: 'forwards', ...opts }).finished;
}

function clearAnims() {
  for (const el of [wrap, coin, shadow, bird, hole, drain, halfL, halfR]) {
    el.getAnimations().forEach((a) => a.cancel());
  }
  halfL.style.display = halfR.style.display = 'none';
  coin.style.display = '';
  wrap.style.filter = '';
  coin.style.transform = `rotateX(${rot}deg)`;
}

// Münze hochwerfen und mit rotateX = target wieder auffangen
async function toss({ target, height = 210, duration = 1250, land = true }) {
  const from = rot;
  rot = target;
  const up = [
    { transform: 'translateY(0)', easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
    { transform: `translateY(${-height}px)`, offset: 0.45, easing: 'cubic-bezier(0.6, 0, 0.8, 0.4)' },
    { transform: 'translateY(0)' },
  ];
  const upOnly = [
    { transform: 'translateY(0)', easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
    { transform: `translateY(${-height}px)` },
  ];
  const frames = land ? up : upOnly;
  const shadowFrames = land
    ? [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0.3, offset: 0.45 }, { transform: 'scale(1)', opacity: 1 }]
    : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.4)', opacity: 0.3 }];
  await Promise.all([
    anim(wrap, frames, { duration }),
    anim(coin, [{ transform: `rotateX(${from}deg)` }, { transform: `rotateX(${target}deg)` }], { duration, easing: land ? 'cubic-bezier(0.25, 0.6, 0.45, 1)' : 'ease-out' }),
    anim(shadow, shadowFrames, { duration }),
  ]);
}

function nextFace(face, spins = 5 + randomInt(3)) {
  // face: 0 = Kopf, 180 = Zahl, 90 = Rand
  const base = Math.ceil(rot / 360) * 360 + spins * 360;
  return base + face;
}

async function bounce() {
  await anim(wrap, [
    { transform: 'translateY(0)' },
    { transform: 'translateY(-18px)', easing: 'ease-in' },
    { transform: 'translateY(0)' },
  ], { duration: 260, easing: 'ease-out' });
}

// ---------- Die einzelnen Ergebnisse ----------

const scenes = {
  async kopf() {
    await toss({ target: nextFace(0) });
    sfx.land();
    await bounce();
  },

  async zahl() {
    await toss({ target: nextFace(180) });
    sfx.land();
    await bounce();
  },

  async rand() {
    await toss({ target: nextFace(90) });
    sfx.land();
    await anim(coin, [
      { transform: `rotateX(${rot - 25}deg)` },
      { transform: `rotateX(${rot + 15}deg)` },
      { transform: `rotateX(${rot - 8}deg)` },
      { transform: `rotateX(${rot + 4}deg)` },
      { transform: `rotateX(${rot}deg)` },
    ], { duration: 900, easing: 'ease-out' });
    sfx.special();
  },

  async moewe() {
    const w = stage.clientWidth;
    await toss({ target: nextFace(0, 3), height: 170, duration: 650, land: false });
    sfx.swoosh();
    bird.style.opacity = 1;
    await anim(bird, [{ transform: 'translate(0, 0) scaleX(-1)' }, { transform: `translate(${w / 2 - 10}px, 20px) scaleX(-1)` }], { duration: 450, easing: 'ease-in' });
    vibrate(50);
    await Promise.all([
      anim(bird, [{ transform: `translate(${w / 2 - 10}px, 20px) scaleX(-1)` }, { transform: `translate(${w + 160}px, -60px) scaleX(-1)` }], { duration: 800, easing: 'ease-in' }),
      anim(wrap, [{ transform: 'translate(0, -170px)' }, { transform: `translate(${w / 2 + 200}px, -250px) scale(0.6)` }], { duration: 800, easing: 'ease-in' }),
      anim(coin, [{ transform: `rotateX(${rot}deg)` }, { transform: `rotateX(${rot + 720}deg)` }], { duration: 800 }),
    ]);
    bird.style.opacity = 0;
    coinGone = true;
    sfx.special();
  },

  async gully() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    await toss({ target: nextFace(0) });
    sfx.land();
    anim(drain, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(0.3, 1.6, 0.5, 1)' });
    const dx = w * 0.94 - 60 - w / 2;
    const dy = h * 0.96 - 22 - h * 0.62;
    await Promise.all([
      anim(wrap, [
        { transform: 'translate(0, 0) rotateZ(0)' },
        { transform: `translate(${dx}px, ${dy - 20}px) rotateZ(420deg) scale(0.75)`, offset: 0.8 },
        { transform: `translate(${dx}px, ${dy + 20}px) rotateZ(480deg) scale(0)` },
      ], { duration: 1300, easing: 'ease-in' }),
      anim(shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }),
    ]);
    sfx.plop();
    coinGone = true;
    await sleep(250);
    sfx.special();
  },

  async schwebt() {
    await toss({ target: nextFace(0, 3), height: 140, duration: 800, land: false });
    sfx.special();
    wrap.style.filter = 'drop-shadow(0 0 18px rgba(255, 220, 120, 0.9))';
    wrap.animate([{ transform: 'translateY(-140px)' }, { transform: 'translateY(-156px)' }], { duration: 1400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    coin.animate([{ transform: `rotateX(${rot}deg) rotateY(0)` }, { transform: `rotateX(${rot}deg) rotateY(360deg)` }], { duration: 3200, iterations: Infinity });
  },

  async geteilt() {
    await toss({ target: nextFace(0) });
    sfx.land();
    await sleep(350);
    sfx.crack();
    coin.style.display = 'none';
    halfL.style.display = halfR.style.display = 'block';
    await Promise.all([
      anim(halfL, [{ transform: 'none' }, { transform: 'translate(-8px, 0) rotate(-4deg)', offset: 0.25 }, { transform: 'translate(-60px, 14px) rotate(-18deg)' }], { duration: 900, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' }),
      anim(halfR, [{ transform: 'none' }, { transform: 'translate(8px, 0) rotate(4deg)', offset: 0.25 }, { transform: 'translate(60px, 14px) rotate(18deg)' }], { duration: 900, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' }),
    ]);
    sfx.special();
  },

  async loch() {
    const lift = stage.clientHeight * (0.62 - 0.40);
    anim(hole, [{ transform: 'scale(0) rotate(0)' }, { transform: 'scale(1) rotate(180deg)' }], { duration: 900, easing: 'ease-out' });
    sfx.whoosh();
    await toss({ target: nextFace(0, 2), height: lift, duration: 700, land: false });
    const frames = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const angle = p * 900;
      const r = 70 * (1 - p);
      frames.push({ transform: `translateY(${-lift}px) rotateZ(${angle}deg) translateX(${r}px) scale(${1 - p * 0.98})` });
    }
    // erst leicht zur Seite, dann spiralförmig hinein
    await anim(wrap, [{ transform: `translateY(${-lift}px)` }, frames[0]], { duration: 200 });
    await Promise.all([
      anim(wrap, frames, { duration: 1400, easing: 'ease-in' }),
      anim(shadow, [{ opacity: 0.3 }, { opacity: 0 }], { duration: 400 }),
    ]);
    coinGone = true;
    vibrate(200);
    await anim(hole, [{ transform: 'scale(1) rotate(180deg)' }, { transform: 'scale(1.25) rotate(260deg)', offset: 0.3 }, { transform: 'scale(0) rotate(540deg)' }], { duration: 700, easing: 'ease-in' });
    sfx.special();
  },
};

async function newCoin() {
  await sleep(1400);
  clearAnims();
  rot = 0;
  coin.style.transform = 'rotateX(0deg)';
  await Promise.all([
    anim(wrap, [
      { transform: 'translateY(-420px)', easing: 'cubic-bezier(0.5, 0, 1, 0.6)' },
      { transform: 'translateY(0)', offset: 0.7, easing: 'ease-out' },
      { transform: 'translateY(-20px)', offset: 0.85, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ], { duration: 700 }),
    anim(shadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 }),
  ]);
  sfx.land();
  coinGone = false;
}

// ---------- Ablauf ----------

async function flip() {
  if (busy) return;
  busy = true;
  flipBtn.disabled = true;
  resultBox.classList.remove('pop');
  resultTitle.classList.remove('special');
  resultTitle.textContent = '…';
  resultSub.textContent = ' ';
  clearAnims();

  const outcome = pickOutcome();
  sfx.flip();
  try {
    await scenes[outcome.id]();
  } catch (e) {
    console.error(e);
  }

  const isNew = outcome.special && !state.counts[outcome.id];
  record(outcome);
  showResult(outcome);
  if (isNew) toast(`Neu in deiner Sammlung: ${outcome.icon} ${outcome.name}`);

  if (coinGone) await newCoin();
  busy = false;
  flipBtn.disabled = false;
}

function record(o) {
  state.counts[o.id] = (state.counts[o.id] || 0) + 1;
  state.total++;
  state.history.unshift(o.id);
  state.history.length = Math.min(state.history.length, 14);
  if (state.streak.id === o.id) state.streak.n++;
  else state.streak = { id: o.id, n: 1 };
  if (!o.special) state.best = Math.max(state.best, state.streak.n);
  saveState();
  renderHistory();
}

function showResult(o) {
  const labels = state.labels;
  let sub = pick(o.lines);
  if (o.id === 'kopf' && labels[0]) sub = `→ ${labels[0]}`;
  if (o.id === 'zahl' && labels[1]) sub = `→ ${labels[1]}`;
  if (!o.special && state.streak.n >= 3) sub += ` (${state.streak.n}× in Folge!)`;
  resultTitle.textContent = o.special ? `${o.icon} ${o.name}` : o.name;
  resultTitle.classList.toggle('special', !!o.special);
  resultSub.textContent = sub;
  void resultBox.offsetWidth; // Animation neu starten
  resultBox.classList.add('pop');
}

function renderHistory() {
  const list = $('history');
  list.innerHTML = '';
  for (const id of state.history) {
    const o = BY_ID[id];
    if (!o) continue;
    const li = document.createElement('li');
    li.className = o.special ? 'special' : id;
    li.textContent = o.special ? o.icon : o.short;
    li.title = o.name;
    list.appendChild(li);
  }
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- Statistik-Dialog ----------

function pct(n, total) {
  if (!total) return '–';
  return `${((n / total) * 100).toFixed(1).replace('.', ',')} %`;
}

function oddsText(weight) {
  const p = (weight / TOTAL_WEIGHT) * 100;
  const pStr = p >= 1 ? p.toFixed(1) : p.toFixed(2);
  return `${pStr.replace('.', ',')} % (1 : ${Math.round(TOTAL_WEIGHT / weight)})`;
}

function renderInfo() {
  const c = state.counts;
  const specials = OUTCOMES.filter((o) => o.special);
  const chaos = specials.reduce((s, o) => s + (c[o.id] || 0), 0);
  $('stats').innerHTML = [
    ['Würfe', state.total],
    [`Kopf · ${pct(c.kopf || 0, state.total)}`, c.kopf || 0],
    [`Zahl · ${pct(c.zahl || 0, state.total)}`, c.zahl || 0],
    ['Chaos', chaos],
    ['Beste Serie', state.best],
    ['Gesammelt', `${specials.filter((o) => c[o.id]).length}/${specials.length}`],
  ].map(([label, val]) => `<div class="stat"><b>${val}</b><span>${label}</span></div>`).join('');

  $('collection').innerHTML = specials.map((o) => {
    const n = c[o.id] || 0;
    return n
      ? `<li><span class="ico">${o.icon}</span><div>${o.name}<small>${o.desc}</small></div><span class="count">${n}×</span></li>`
      : `<li class="locked"><span class="ico">❓</span><div>???<small>Noch nicht erlebt · ${oddsText(o.weight)}</small></div></li>`;
  }).join('');

  $('odds').innerHTML = OUTCOMES.map((o) => {
    const known = !o.special || c[o.id];
    return `<tr><td>${known ? `${o.special ? o.icon + ' ' : ''}${o.name}` : '❓ Geheimes Ereignis'}</td><td>${oddsText(o.weight)}</td></tr>`;
  }).join('');
}

// ---------- Installation ----------

let installEvent = null;
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  $('btn-install').hidden = false;
});

$('btn-install').addEventListener('click', async () => {
  if (installEvent) {
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
    $('btn-install').hidden = true;
  } else {
    renderInfo();
    $('info').showModal();
  }
});

if (isIOS && !isStandalone) {
  $('btn-install').hidden = false;
  $('ios-hint').hidden = false;
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- Events ----------

flipBtn.addEventListener('click', flip);
stage.addEventListener('click', flip);
document.addEventListener('keydown', (e) => {
  if ((e.code === 'Space' || e.code === 'Enter') && e.target === document.body) {
    e.preventDefault();
    flip();
  }
});

$('btn-info').addEventListener('click', () => { renderInfo(); $('info').showModal(); });
$('info').addEventListener('click', (e) => { if (e.target === $('info')) $('info').close(); });

$('btn-reset').addEventListener('click', () => {
  if (!confirm('Statistik und Sammlung zurücksetzen?')) return;
  state = { ...loadState(), counts: {}, total: 0, history: [], streak: { id: null, n: 0 }, best: 0 };
  saveState();
  renderHistory();
  renderInfo();
});

const soundBtn = $('btn-sound');
function renderSound() { soundBtn.textContent = state.muted ? '🔇' : '🔊'; }
soundBtn.addEventListener('click', () => { state.muted = !state.muted; saveState(); renderSound(); });

['label-kopf', 'label-zahl'].forEach((id, i) => {
  const input = $(id);
  input.value = state.labels[i] || '';
  input.addEventListener('input', () => { state.labels[i] = input.value.trim(); saveState(); });
});

renderSound();
renderHistory();
