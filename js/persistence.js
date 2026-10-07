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
    await AppStorage.set(progressKey(), JSON.stringify(data), false);
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
  const acc = document.getElementById('bitAccessory');
  if (acc) acc.classList.toggle('hidden', !State.shopOwned.has('accessory'));
}

async function loadProgress(){
  let best = null;
  const local = State.profile ? lsGet(LS_DATA_PREFIX + slugifyProfileName(State.profile.name)) : null;
  if (local) best = local;
  try {
    if (AppStorage && AppStorage.get){
      const result = await AppStorage.get(progressKey(), false);
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
  const acc = document.getElementById('bitAccessory');
  if (acc) acc.classList.add('hidden');
}
