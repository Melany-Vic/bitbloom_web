/* =========================================================
   PERSISTENCIA — guarda el progreso por cuenta.

   Cada cuenta (nombre de perfil) tiene su propio progreso.
   Se guarda en dos lugares a la vez:
   1) La base de datos (Firebase / almacenamiento de Claude) vía AppStorage.
   2) El navegador de este dispositivo (localStorage), como respaldo y
      para recordar qué cuentas existen y cuál está activa.
   Al cargar se usa la copia más reciente de las dos.

   Además se guarda un HISTORIAL POR DÍA (State.history) con lo que
   se jugó cada día en cada nivel y juego de la Arena.
   ========================================================= */
const LS_ACCOUNTS = 'bitbloom-accounts';
const LS_ACTIVE   = 'bitbloom-active';
const LS_DATA_PREFIX = 'bitbloom-data-';

function lsGet(key){
  try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch (e) { return null; }
}
function lsSet(key, value){
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}
function lsRemove(key){
  try { window.localStorage.removeItem(key); } catch (e) {}
}

function slugifyProfileName(name){
  return (name || 'invitado')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'invitado';
}
function progressKey(){
  return 'bitbloom-progress-' + slugifyProfileName(State.profile && State.profile.name);
}

/* ---------- Cuentas guardadas en este dispositivo ---------- */
function getDeviceAccounts(){
  const list = lsGet(LS_ACCOUNTS);
  return Array.isArray(list) ? list : [];
}
function registerDeviceAccount(profile){
  if (!profile || !profile.name) return;
  const list = getDeviceAccounts();
  const slug = slugifyProfileName(profile.name);
  const idx = list.findIndex(a => slugifyProfileName(a.name) === slug);
  const entry = { name: profile.name, role: profile.role || 'estudiante', lastPlayed: Date.now() };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  lsSet(LS_ACCOUNTS, list);
}
function removeDeviceAccount(name){
  const slug = slugifyProfileName(name);
  lsSet(LS_ACCOUNTS, getDeviceAccounts().filter(a => slugifyProfileName(a.name) !== slug));
  lsRemove(LS_DATA_PREFIX + slug);
}
function deviceAccountExists(name){
  const slug = slugifyProfileName(name);
  return getDeviceAccounts().some(a => slugifyProfileName(a.name) === slug);
}
function setActiveAccount(profile){
  if (profile) lsSet(LS_ACTIVE, { name: profile.name, role: profile.role });
  else lsRemove(LS_ACTIVE);
}
function getActiveAccount(){ return lsGet(LS_ACTIVE); }

/* ---------- Historial por día ---------- */
function dateKey(d){
  d = d || new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* Registra una partida en el historial del día de hoy.
   kind: 'level' | 'arena' | 'side'   key: id del nivel / clave del juego */
function recordActivity(kind, key, won, score, stars, coins){
  if (!State.profile) return;
  if (!State.history) State.history = {};
  const day = dateKey();
  const d = State.history[day] || (State.history[day] = { level:{}, arena:{}, side:{}, points:0, coins:0, plays:0, wins:0 });
  d.level = d.level || {}; d.arena = d.arena || {}; d.side = d.side || {};
  const bucket = d[kind] || (d[kind] = {});
  const g = bucket[key] || (bucket[key] = { plays:0, wins:0, best:0, points:0, stars:0 });
  score = score || 0;
  g.plays++;
  if (won) g.wins++;
  g.best = Math.max(g.best, score);
  g.points += score;
  g.stars = Math.max(g.stars, stars || 0);
  d.plays++;
  if (won) d.wins++;
  d.points += score;
  d.coins += (coins || 0);
}

function buildSaveData(){
  return {
    score: State.score,
    coins: State.coins,
    unlocked: State.unlocked,
    stars: State.stars,
    shopOwned: Array.from(State.shopOwned),
    sideQuests: Array.from(State.sideQuests),
    profile: State.profile,
    timeBonus: State.timeBonus,
    onboardingDone: State.onboardingDone,
    preQuizScore: State.preQuizScore,
    postQuizScore: State.postQuizScore,
    arenaBest: State.arenaBest || {},
    skin: State.skin || 'bit',
    realName: State.realName || null,
    mistakes: State.mistakes || {},
    history: State.history || {},
    savedAt: Date.now(),
  };
}

async function saveProgress(){
  if (!State.profile) return; // sin cuenta activa no se guarda nada (evita mezclar progreso)
  const data = buildSaveData();
  // 1) Copia local en este dispositivo
  lsSet(LS_DATA_PREFIX + slugifyProfileName(State.profile.name), data);
  registerDeviceAccount(State.profile);
  setActiveAccount(State.profile);
  // 2) Base de datos (si está disponible)
  try {
    if (!AppStorage || !AppStorage.set) return;
    await AppStorage.set(progressKey(), JSON.stringify(data), true);  // por nombre de usuario: se puede recuperar desde otro dispositivo
  } catch (e) {
    // Sin conexión a la base de datos: queda la copia local.
  }
}

function applySaveData(data){
  State.score = data.score || 0;
  State.coins = data.coins || 0;
  State.unlocked = data.unlocked || 1;
  State.stars = data.stars || State.stars;
  State.shopOwned = new Set(data.shopOwned || []);
  State.sideQuests = new Set(data.sideQuests || []);
  if (!State.profile) State.profile = data.profile || null;
  State.timeBonus = data.timeBonus || 1;
  State.onboardingDone = !!data.onboardingDone;
  State.preQuizScore = (data.preQuizScore != null) ? data.preQuizScore : null;
  State.postQuizScore = (data.postQuizScore != null) ? data.postQuizScore : null;
  State.arenaBest = data.arenaBest || {};
  State.history = data.history || {};
  State.skin = data.skin || 'bit';
  State.realName = data.realName || null;
  State.mistakes = data.mistakes || {};
  const acc = document.getElementById('bitAccessory');
  if (acc) acc.classList.toggle('hidden', !State.shopOwned.has('accessory'));
}

async function loadProgress(){
  let best = null;
  const local = State.profile ? lsGet(LS_DATA_PREFIX + slugifyProfileName(State.profile.name)) : null;
  if (local) best = local;
  try {
    if (AppStorage && AppStorage.get){
      let result = await AppStorage.get(progressKey(), true);
      if (!result || !result.value) result = await AppStorage.get(progressKey(), false);   // cuentas antiguas (guardado privado)
      if (result && result.value){
        const remote = JSON.parse(result.value);
        if (!best || (remote.savedAt || 0) >= (best.savedAt || 0)) best = remote;
      }
    }
  } catch (e) {
    // Sin base de datos o sin progreso guardado todavía: se usa lo local.
  }
  if (best) applySaveData(best);
}

/* Reinicia el estado local (en memoria) a los valores por defecto.
   Se usa al cerrar sesión y al crear/entrar a otra cuenta. */
function resetLocalState(){
  State.score = 0;
  State.coins = 0;
  State.unlocked = 1;
  State.stars = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
  State.shopOwned = new Set();
  State.sideQuests = new Set();
  State.timeBonus = 1;
  State.onboardingDone = false;
  State.preQuizScore = null;
  State.postQuizScore = null;
  State.arenaBest = {};
  State.history = {};
  State.skin = 'bit';
  State.realName = null;
  State.mistakes = {};
  const acc = document.getElementById('bitAccessory');
  if (acc) acc.classList.add('hidden');
}


/* =========================================================
   USUARIOS Y CONTRASEÑAS
   - El nombre de usuario es ÚNICO: se comprueba en la base de datos
     compartida (todos los dispositivos) y en este dispositivo.
   - La contraseña nunca se guarda: solo un "hash" (huella) con sal.
   ========================================================= */
const LS_USERS = 'bitbloom-users';
function getLocalUsers(){ return lsGet(LS_USERS) || {}; }

function randomSalt(){
  const a = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(str){
  try {
    if (window.crypto && crypto.subtle){
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* cae al método simple */ }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++){
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'f' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
function hashPassword(password, salt){ return sha256Hex(salt + ':' + password + ':bitbloom'); }

/* Devuelve el registro de un usuario (base de datos o copia local) o null */
async function fetchUserRecord(name){
  const slug = slugifyProfileName(name);
  let rec = null;
  try {
    if (AppStorage && AppStorage.get){
      const r = await AppStorage.get('bitbloom-user-' + slug, true);
      if (r && r.value) rec = JSON.parse(r.value);
    }
  } catch (e) { /* sin conexión */ }
  if (!rec) rec = getLocalUsers()[slug] || null;
  return rec;
}
async function saveUserRecord(rec){
  const slug = slugifyProfileName(rec.name);
  const users = getLocalUsers(); users[slug] = rec; lsSet(LS_USERS, users);
  try {
    if (AppStorage && AppStorage.set) await AppStorage.set('bitbloom-user-' + slug, JSON.stringify(rec), true);
  } catch (e) { /* queda la copia local */ }
}
async function buildUserRecord(name, role, password){
  const salt = randomSalt();
  return { name, role, salt, hash: await hashPassword(password, salt), createdAt: Date.now() };
}
async function checkPassword(rec, password){
  return !!rec && rec.hash === await hashPassword(password, rec.salt);
}


/* =========================================================
   ERRORES POR TEMA — para la sección "Temas para reforzar"
   ========================================================= */
const MISTAKE_TOPICS = {
  hardware: { name:'Hardware: piezas del PC',       icon:'🖥️', level:1 },
  diag:     { name:'Diagnóstico técnico',           icon:'🩺', level:2 },
  hwsw:     { name:'Hardware vs Software',          icon:'⚡', level:3 },
  os:       { name:'Sistemas operativos',           icon:'🧠', level:4 },
  redes:    { name:'Redes de datos y protocolos',   icon:'🌐', level:5 },
  prog:     { name:'Programación y algoritmos',     icon:'🤖', level:6 },
  graficos: { name:'Gráficos: colores RGB',         icon:'🎨', arena:'pixel' },
  eval:     { name:'Evaluaciones (preguntas generales)', icon:'📝' },
  misiones: { name:'Misiones secundarias',          icon:'⭐' },
  actividad:{ name:'Actividades de tu profesor/a',  icon:'🧑‍🏫' },
};
function recordMistake(topic, label){
  if (!State.profile) return;
  if (!State.mistakes) State.mistakes = {};
  const t = State.mistakes[topic] || (State.mistakes[topic] = { count:0, items:{}, last:0 });
  t.count++; t.last = Date.now();
  const k = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (k) t.items[k] = (t.items[k] || 0) + 1;
  const keys = Object.keys(t.items);
  if (keys.length > 25){ keys.sort((a, b) => t.items[a] - t.items[b]); delete t.items[keys[0]]; }
}
