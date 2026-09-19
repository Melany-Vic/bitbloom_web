/* =========================================================
   BITBLOOM — motor del juego
   ========================================================= */

/* ---------- Utilidades cortas ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
function el(tag, cls, html){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}
function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

/* ---------- Sonido simple (WebAudio, sin archivos externos) ---------- */
let audioCtx = null;
function beep(type){
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    let freq = 440, dur = 0.12, wave = 'sine', vol = 0.06;
    if (type === 'correct'){ freq = 880; wave = 'triangle'; vol = 0.07; }
    if (type === 'wrong'){ freq = 140; wave = 'sawtooth'; dur = 0.22; vol = 0.08; }
    if (type === 'win'){ freq = 660; wave = 'triangle'; dur = 0.35; vol = 0.08; }
    if (type === 'lose'){ freq = 110; wave = 'square'; dur = 0.4; vol = 0.07; }
    if (type === 'click'){ freq = 520; dur = 0.05; vol = 0.04; }
    o.type = wave; o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
    if (type === 'win'){
      const o2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.type = 'triangle'; o2.frequency.setValueAtTime(880, now + 0.15);
      g2.gain.setValueAtTime(0.07, now + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      o2.start(now + 0.15); o2.stop(now + 0.55);
    }
  }catch(e){ /* audio no disponible, se ignora */ }
}

/* ---------- Estado global (en memoria, sin almacenamiento del navegador) ---------- */
const State = {
  score: 0,
  unlocked: 1,
  stars: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0},
  lives: 3,
  maxLives: 3,
  levelScore: 0,
  currentLevelId: null,
  activeTimer: null,
  activeCleanup: null,
  coins: 0,
  shopOwned: new Set(),
  sideQuests: new Set(),
  timeBonus: 1,
  onboardingDone: false,
  preQuizScore: null,
  postQuizScore: null,
  profile: null, // { name, role: 'estudiante'|'profesor' }
  classCode: null, // código de clase asignado por un profesor, si el alumno cargó uno
  mpTurnCallback: null,
};

const LEVELS = [
  { id:1, name:'Ensambla tu PC', icon:'🖥️', desc:'Arrastra cada pieza a su lugar antes de que se agote el tiempo.' },
  { id:2, name:'Diagnóstico Técnico', icon:'🩺', desc:'Analiza los síntomas y descubre si el problema es de hardware, software o red.' },
  { id:3, name:'Hardware o Software', icon:'⚡', desc:'Clasifica los elementos antes de que caigan.' },
  { id:4, name:'Cerebro del Sistema', icon:'🧠', desc:'Conecta cada función con su definición.' },
  { id:5, name:'Red de Datos', icon:'🌐', desc:'Atrapá los elementos que necesita cada función y evitá los peligrosos.' },
  { id:6, name:'Programa a Bit', icon:'🤖', desc:'Ordena el código para completar la misión final.' },
];

/* Personaje especialista que presenta cada nivel */
const LEVEL_CHAR = { 1:'byte', 2:'byte', 3:'bloom', 4:'code', 5:'net', 6:'bit' };
const CHAR_INFO = {
  bit:   { name:'Bit',   role:'Guía principal' },
  byte:  { name:'Byte',  role:'Especialista en Hardware' },
  bloom: { name:'Bloom', role:'Especialista en Software' },
  pixel: { name:'Pixel', role:'Especialista en Gráficos' },
  code:  { name:'Code',  role:'Especialista en Programación' },
  data:  { name:'Data',  role:'Especialista en Datos' },
  net:   { name:'Net',   role:'Especialista en Redes' },
  volt:  { name:'Volt',  role:'Especialista en Energía' },
};
const CHAR_AVATAR_URIS = {bit:'assets/characters/bit.png', byte:'assets/characters/byte.png', bloom:'assets/characters/bloom.png', pixel:'assets/characters/pixel.png', code:'assets/characters/code.png', data:'assets/characters/data.png', net:'assets/characters/net.png', volt:'assets/characters/volt.png'};
function charAvatar(id){ return CHAR_AVATAR_URIS[LEVEL_CHAR[id] || 'bit']; }
function charTagHtml(id){
  const c = CHAR_INFO[LEVEL_CHAR[id] || 'bit'];
  return `<div class="speaker-tag">${c.name.toUpperCase()} · ${c.role}</div>`;
}

/* =========================================================
   Bit — el compañero
   ========================================================= */
let bitTimeout = null;
function bitSay(text, mood = 'talk', ms = 3600){
  const companion = $('#bitCompanion');
  const bubble = $('#bitBubble');
  const avatar = $('#bitAvatar');
  companion.classList.remove('hidden');
  bubble.textContent = text;
  bubble.classList.add('show');
  avatar.classList.remove('talk','alarm');
  if (mood) avatar.classList.add(mood === 'alarm' ? 'alarm' : 'talk');
  clearTimeout(bitTimeout);
  bitTimeout = setTimeout(() => {
    bubble.classList.remove('show');
    avatar.classList.remove('talk','alarm');
  }, ms);
}
function bitHide(){ $('#bitCompanion').classList.add('hidden'); }

/* =========================================================
   Navegación entre pantallas
   ========================================================= */
function showScreen(id){
  $$('.screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

function goMenu(){
  stopActiveTimer();
  showScreen('#screenMenu');
  bitHide();
  $('#menuCoins').textContent = State.coins;
  refreshProfileUI();
}
function goLevels(){
  stopActiveTimer();
  renderLevelMap();
  showScreen('#screenLevels');
  $('#totalScore').textContent = State.score;
  $('#levelsCoins').textContent = State.coins;
  bitSay('¡Elige un nivel! Cada uno enseña algo nuevo sobre la tecnología.', 'talk');
}
function goCredits(){
  stopActiveTimer();
  renderCreditsStats();
  showScreen('#screenCredits');
  bitHide();
}

function renderCreditsStats(){
  const box = $('#creditsStats');
  const rows = [
    { icon:'⬡', term:'Puntaje total', def:`${State.score} puntos acumulados en todos los niveles.` },
    { icon:'🪙', term:'Monedas', def:`${State.coins} monedas ganadas y disponibles para la tienda.` },
  ];
  if (State.preQuizScore != null){
    rows.push({ icon:'📝', term:'Evaluación inicial', def:`Acertaste ${State.preQuizScore} de ${QUIZ_QUESTIONS.length} preguntas.` });
  }
  if (State.postQuizScore != null){
    rows.push({ icon:'🎓', term:'Evaluación final', def:`Acertaste ${State.postQuizScore} de ${QUIZ_QUESTIONS.length} preguntas.` });
  }
  box.innerHTML = rows.map(r => `
    <div class="concept-card">
      <div class="concept-icon">${r.icon}</div>
      <div class="concept-body">
        <div class="concept-term">${r.term}</div>
        <div class="concept-def">${r.def}</div>
      </div>
    </div>
  `).join('');
}

/* =========================================================
   Mapa de niveles
   ========================================================= */
/* =========================================================
   Mapa de niveles — exploración tipo mapa
   ========================================================= */
const LEVEL_MAP_POS = [
  { x:18, y:88 }, { x:55, y:76 }, { x:25, y:60 },
  { x:60, y:46 }, { x:30, y:28 }, { x:62, y:10 },
];

function renderLevelMap(){
  const path = $('#levelPath');
  path.innerHTML = '';

  const mapWrap = el('div', 'map-wrap');
  const mainPoints = LEVEL_MAP_POS.map(p => `${p.x},${p.y}`).join(' ');
  const sideLines = SIDE_QUESTS.map(sq => {
    const near = LEVEL_MAP_POS[sq.near - 1];
    return `<line x1="${near.x}" y1="${near.y}" x2="${sq.x}" y2="${sq.y}" class="map-side-line" />`;
  }).join('');

  mapWrap.innerHTML = `
    <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points="${mainPoints}" class="map-path-line" />
      ${sideLines}
    </svg>
  `;

  LEVELS.forEach((lv, i) => {
    const pos = LEVEL_MAP_POS[i];
    const unlocked = lv.id <= State.unlocked;
    const starCount = State.stars[lv.id] || 0;
    const stars = [1,2,3].map(n => `<span class="${n<=starCount?'star-on':''}">★</span>`).join('');
    const node = el('div', `map-node ${unlocked ? 'unlocked' : 'locked'}`);
    node.style.left = pos.x + '%';
    node.style.top = pos.y + '%';
    node.innerHTML = `
      <div class="map-node-badge">${unlocked ? lv.icon : '🔒'}</div>
      <div class="map-node-label">
        <div class="map-node-title">N${lv.id} · ${lv.name}</div>
        ${unlocked ? `<div class="level-stars">${stars}</div>` : `<div class="map-node-lockmsg">Bloqueado</div>`}
      </div>
    `;
    if (unlocked) node.addEventListener('click', () => openMission(lv.id));
    mapWrap.appendChild(node);
  });

  SIDE_QUESTS.forEach(sq => {
    const done = State.sideQuests.has(sq.key);
    const node = el('div', `map-node map-node-side ${done ? 'done' : ''}`);
    node.style.left = sq.x + '%';
    node.style.top = sq.y + '%';
    node.innerHTML = `
      <div class="map-node-badge side">${done ? '✓' : sq.icon}</div>
      <div class="map-node-label">
        <div class="map-node-title">${sq.name}</div>
        <div class="map-node-lockmsg">${done ? 'Completada · rejugable' : 'Misión secundaria'}</div>
      </div>
    `;
    node.addEventListener('click', () => openSideQuest(sq.key));
    mapWrap.appendChild(node);
  });

  path.appendChild(mapWrap);
}

/* =========================================================
   Modal genérico
   ========================================================= */
function showModal(html){
  $('#modalPanel').innerHTML = html;
  $('#modalOverlay').classList.remove('hidden');
}
function hideModal(){ $('#modalOverlay').classList.add('hidden'); }

const MISSIONS = {
  1: { title:'Ensambla tu PC', brief:'Una computadora llegó desarmada a BloomLand. Arrastra cada pieza a la ranura correcta antes de que se acabe el tiempo. ¡Cuidado! Algunas piezas no son parte del interior de la PC.', controls:'Arrastra con el dedo o el mouse cada pieza hasta su ranura correcta.' },
  2: { title:'Diagnóstico Técnico', brief:'Varias máquinas de BloomLand están fallando. Byte necesita tu ayuda: lee cada síntoma y decide cuál es la causa más probable, ya sea de hardware, software o red. Analiza antes de responder.', controls:'Lee el síntoma y toca la causa más probable antes de que se agote el tiempo.' },
  3: { title:'Hardware o Software', brief:'Elementos tecnológicos están cayendo del cielo digital. Decide rápido si cada uno es HARDWARE o SOFTWARE antes de que llegue al suelo.', controls:'Toca el botón HARDWARE o SOFTWARE, o usa las flechas ← → del teclado.' },
  4: { title:'Cerebro del Sistema', brief:'El Sistema Operativo de BloomLand perdió sus conexiones. Une cada función con su definición correcta antes de que se agote el tiempo.', controls:'Toca un término y luego su definición para conectarlos.' },
  5: { title:'Red de Datos', brief:'BloomLand necesita reunir los elementos correctos para tres misiones de red. Cada ronda dura hasta 3 minutos. Si tocás un enemigo, no perdés — simplemente repetís esa misma ronda hasta lograrlo.', controls:'Arrastrá el dedo o el mouse para mover a Bit, o usá las flechas ← →, y atrapá los elementos correctos que van cayendo. Si tocás un enemigo, la ronda se reinicia.' },
  6: { title:'Programa a Bit', brief:'¡Misión final! Bit necesita que ordenes correctamente los pasos que sigue una computadora para funcionar. Un paso fuera de lugar y el programa fallará.', controls:'Toca los bloques en el orden correcto para armar la secuencia. Puedes tocar un bloque ya colocado para devolverlo. Pulsa EJECUTAR cuando estés listo.' },
};

const VILLAINS = {
  1: { img:'assets/enemies/overclock.png', name:'Overclock', line:'"Voy a recalentar cada pieza hasta que no puedas ni armarla." — Overclock' },
  2: { img:'assets/enemies/virus.png', name:'Virus', line:'"Yo infecté esos equipos... ¡a ver si sabés cuál es cuál!" — Virus' },
  3: { img:'assets/enemies/bug.png', name:'Bug', line:'"Voy a mezclar todo hasta que ya no sepas qué es hardware y qué es software." — Bug' },
  4: { img:'assets/enemies/corrupt.png', name:'Corrupt', line:'"Ya corrompí las conexiones del sistema operativo. ¡Buena suerte reparándolas!" — Corrupt' },
  5: { img:'assets/enemies/lag.png', name:'Lag', line:'"Voy a hacer que todo en esta red vaya lento... o directamente falle." — Lag' },
  6: { img:'assets/enemies/glitch.png', name:'Glitch', line:'"Soy el error definitivo. Ni siquiera con todo lo que aprendiste vas a poder ordenarme." — Glitch' },
};

function openMission(id){
  const lv = LEVELS.find(l => l.id === id);
  const m = MISSIONS[id];
  const villain = VILLAINS[id];
  const villainHtml = villain ? `
    <div class="villain-banner">
      <img src="${villain.img}" alt="${villain.name}">
      <p>${villain.line}</p>
    </div>
  ` : '';
  showModal(`
    <img src="${charAvatar(id)}" class="mission-avatar" alt="${CHAR_INFO[LEVEL_CHAR[id]].name}">
    ${charTagHtml(id)}
    <h2>${lv.icon} ${m.title}</h2>
    <p>${m.brief}</p>
    ${villainHtml}
    <div class="modal-controls"><b>Controles:</b> ${m.controls}</div>
    <div class="modal-actions">
      <button class="modal-btn" id="missionCancel">Cancelar</button>
      <button class="modal-btn primary" id="missionGo">¡Comenzar! ▶</button>
    </div>
  `);
  $('#missionCancel').onclick = () => { hideModal(); };
  $('#missionGo').onclick = () => { hideModal(); showConceptBriefing(id); };
}

/* =========================================================
   Explicación previa de conceptos (antes del desafío)
   ========================================================= */
const CONCEPTS = {
  1: [
    { icon:'🧩', term:'CPU (Procesador)', def:'Es el "cerebro" de la computadora: ejecuta las instrucciones y hace los cálculos.' },
    { icon:'💾', term:'Memoria RAM', def:'Guarda de forma temporal los datos que los programas están usando en este momento.' },
    { icon:'🗄️', term:'Almacenamiento', def:'Guarda tus archivos y programas de forma permanente, aunque apagues el equipo.' },
    { icon:'🔌', term:'Fuente de Poder', def:'Convierte la electricidad de la pared en la energía que necesitan los componentes.' },
  ],
  2: [
    { icon:'🔧', term:'Diagnóstico técnico', def:'Observar los síntomas de un problema con cuidado antes de decidir qué reparar.' },
    { icon:'🔌', term:'Fuente de poder', def:'Si la PC no enciende y no hace ningún sonido, casi siempre el problema está aquí.' },
    { icon:'☣️', term:'Malware', def:'Un software dañino puede causar ventanas emergentes, lentitud o cierres inesperados.' },
    { icon:'📶', term:'Problemas de red', def:'Si varios dispositivos no logran conectarse, revisa el router o la configuración de red.' },
  ],
  3: [
    { icon:'<img src="assets/elements/pc.png" alt="">', term:'Hardware', def:'Todo lo físico que puedes tocar: monitor, teclado, disco duro, CPU, cables...' },
    { icon:'<img src="assets/software/systemsoftware.png" alt="">', term:'Software del sistema', def:'Programas como el sistema operativo, que hacen funcionar la computadora por dentro.' },
    { icon:'<img src="assets/software/appsoftware.png" alt="">', term:'Software de aplicación', def:'Los programas que usás directamente: navegador, editor, juegos, mensajería...' },
    { icon:'<img src="assets/software/folder.png" alt="">', term:'Programa', def:'Un conjunto de instrucciones guardadas en un archivo, listas para ejecutarse.' },
  ],
  4: [
    { icon:'⚙️', term:'Núcleo (Kernel)', def:'La parte central del sistema operativo: conecta el hardware con el software.' },
    { icon:'🧠', term:'Gestión de procesos', def:'El sistema operativo decide qué programa usa el procesador en cada momento.' },
    { icon:'🗂️', term:'Sistema de archivos', def:'Organiza y guarda tus documentos dentro de carpetas en el almacenamiento.' },
  ],
  5: [
    { icon:'📶', term:'Router', def:'Dirige los datos entre los dispositivos de tu red e internet.' },
    { icon:'🌐', term:'Dirección IP', def:'Un número único que identifica a cada dispositivo dentro de una red.' },
    { icon:'☣️', term:'Malware', def:'Software dañino diseñado para infectar, dañar o robar información de un sistema.' },
  ],
  6: [
    { icon:'⚙️', term:'Proceso', def:'Un programa que se está ejecutando en este momento en la computadora.' },
    { icon:'🔁', term:'Secuencia lógica', def:'El orden correcto de pasos es tan importante como los pasos mismos.' },
  ],
};

function showConceptBriefing(id){
  const cards = CONCEPTS[id] || [];
  const cardsHtml = cards.map(c => `
    <div class="concept-card">
      <div class="concept-icon">${c.icon}</div>
      <div class="concept-body">
        <div class="concept-term">${c.term}</div>
        <div class="concept-def">${c.def}</div>
      </div>
    </div>
  `).join('');
  showModal(`
    <img src="${charAvatar(id)}" class="mission-avatar" alt="${CHAR_INFO[LEVEL_CHAR[id]].name}">
    ${charTagHtml(id)}
    <h2>Antes de empezar...</h2>
    <p>Repasa estos conceptos rápidos. Te van a servir en el desafío.</p>
    <div class="concept-list">${cardsHtml}</div>
    <div class="modal-actions">
      <button class="modal-btn" id="briefBack">← Atrás</button>
      <button class="modal-btn primary" id="briefGo">¡Empezar desafío! ▶</button>
    </div>
  `);
  $('#briefBack').onclick = () => { hideModal(); openMission(id); };
  $('#briefGo').onclick = () => { hideModal(); launchLevel(id); };
}

/* =========================================================
   Motor de nivel: HUD, temporizador, vidas
   ========================================================= */
function stopActiveTimer(){
  if (State.activeTimer){ clearInterval(State.activeTimer); State.activeTimer = null; }
  if (State.activeCleanup){ try{ State.activeCleanup(); }catch(e){} State.activeCleanup = null; }
}

function setLives(n){
  State.lives = clamp(n, 0, State.maxLives);
  const box = $('#hudLives');
  box.innerHTML = '';
  for (let i = 0; i < State.maxLives; i++){
    const life = el('div', `life ${i < State.lives ? '' : 'lost'}`);
    box.appendChild(life);
  }
}
function addScore(pts){
  State.levelScore += pts;
  State.score += pts;
  $('#hudScore').textContent = State.score;
}
function shakeHud(){
  const hud = $('.hud');
  hud.animate([{ transform:'translateX(0)' },{ transform:'translateX(-6px)' },{ transform:'translateX(6px)' },{ transform:'translateX(0)' }], { duration:220 });
}

/* Temporizador de nivel (barra + callback al agotarse) */
function startTimer(seconds, onTick, onEnd){
  stopActiveTimerOnly();
  seconds = seconds * (State.timeBonus || 1);
  const total = seconds * 1000;
  const start = Date.now();
  const fill = $('#timerFill');
  fill.classList.remove('warn');
  fill.style.width = '100%';
  State.activeTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, total - elapsed);
    const pct = (remaining / total) * 100;
    fill.style.width = pct + '%';
    if (pct < 30) fill.classList.add('warn');
    if (onTick) onTick(remaining / 1000, pct);
    if (remaining <= 0){
      clearInterval(State.activeTimer);
      State.activeTimer = null;
      if (onEnd) onEnd();
    }
  }, 100);
}
function stopActiveTimerOnly(){
  if (State.activeTimer){ clearInterval(State.activeTimer); State.activeTimer = null; }
}

function setupLevelHud(id, lives){
  const lv = LEVELS.find(l => l.id === id);
  $('#hudLevelTitle').textContent = `NIVEL ${id} · ${lv.name.toUpperCase()}`;
  State.maxLives = lives + (State.shopOwned.has('extraLife') ? 1 : 0);
  setLives(State.maxLives);
  State.levelScore = 0;
}

/* =========================================================
   Resultado de nivel
   ========================================================= */
const NEXT_TEASER = {
  2: '"¡Bien hecho! Ahora vas a necesitar tu cabeza fría, no tus manos. Te espero para diagnosticar unas máquinas averiadas." — Byte',
  3: '"Genial trabajo con el diagnóstico. Ahora vení conmigo: hay elementos tecnológicos cayendo por todos lados y hay que clasificarlos rápido." — Bloom',
  4: '"¡Excelente! El sistema operativo de BloomLand perdió sus conexiones internas. Necesito tu lógica para reconectarlo todo." — Code',
  5: '"¡La red está esperando! Un paquete de datos necesita llegar al servidor sin cruzarse con el malware. ¿Me ayudás?" — Net',
  6: '"Ya aprendiste todo lo que hace falta. Ahora es momento de rescatarme a mí: ordená el código y completá la misión final." — Bit',
};

function finishLevel(id, won, starsEarned, message){
  stopActiveTimer();
  beep(won ? 'win' : 'lose');

  if (State.mpTurnCallback){
    const cb = State.mpTurnCallback;
    State.mpTurnCallback = null;
    if (won){
      State.stars[id] = Math.max(State.stars[id] || 0, starsEarned);
    }
    cb(id, won, starsEarned, message);
    return;
  }

  let coinsEarned = 0;
  if (won){
    State.stars[id] = Math.max(State.stars[id] || 0, starsEarned);
    if (id === State.unlocked && id < LEVELS.length) State.unlocked = id + 1;
    coinsEarned = starsEarned * 15;
    State.coins += coinsEarned;
    submitToLeaderboard();
  }
  const starsHtml = [1,2,3].map(n => `<span class="${n<=starsEarned?'star-on':''}">★</span>`).join('');
  const nextId = id + 1;
  const hasNext = won && nextId <= LEVELS.length;
  const isFinalWin = won && id === LEVELS.length;
  const teaser = hasNext ? NEXT_TEASER[nextId] : null;

  showModal(`
    <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit">
    <h2>${won ? '¡Nivel superado!' : 'Inténtalo de nuevo'}</h2>
    <p>${message}</p>
    ${won ? `<div class="modal-stars">${starsHtml}</div>` : ''}
    <p style="margin-top:-6px;">Puntos obtenidos: <strong class="accent-gold">${State.levelScore}</strong>${coinsEarned ? ` &nbsp;·&nbsp; Monedas: <strong class="accent-gold">🪙 ${coinsEarned}</strong>` : ''}</p>
    ${teaser ? `<div class="modal-controls">${teaser}</div>` : ''}
    ${isFinalWin ? `<div class="modal-controls">🎓 Ya completaste las seis misiones. ¡Es hora de repetir la evaluación y ver cuánto aprendiste!</div>` : ''}
    <div class="modal-actions">
      <button class="modal-btn" id="resultMap">Mapa de niveles</button>
      ${!isFinalWin ? `<button class="modal-btn" id="resultRetry">🔁 Reintentar</button>` : ''}
      ${hasNext ? `<button class="modal-btn primary" id="resultNext">Siguiente ▶</button>` : ''}
      ${isFinalWin ? `<button class="modal-btn primary" id="resultFinalQuiz">🎓 Evaluación Final ▶</button>` : ''}
    </div>
  `);
  $('#resultMap').onclick = () => { hideModal(); goLevels(); };
  const retryBtn = $('#resultRetry');
  if (retryBtn) retryBtn.onclick = () => { hideModal(); launchLevel(id); };
  if (hasNext) $('#resultNext').onclick = () => { hideModal(); openMission(nextId); };
  if (isFinalWin) $('#resultFinalQuiz').onclick = () => { hideModal(); startQuiz('post'); };
  saveProgress();
}

/* =========================================================
   Lanzador de nivel
   ========================================================= */
function launchLevel(id){
  State.currentLevelId = id;
  showScreen('#screenGame');
  $('#gameStage').innerHTML = '';
  bitHide();
  const initFns = {
    1: initLevel1,
    2: initLevel2,
    3: initLevel3,
    4: initLevel4,
    5: initLevel5,
    6: initLevel6,
  };
  initFns[id]();
}

function exitGame(){
  showModal(`
    <h2>¿Salir de la misión?</h2>
    <p>Perderás el progreso de este intento.</p>
    <div class="modal-actions">
      <button class="modal-btn" id="stayBtn">Seguir jugando</button>
      <button class="modal-btn primary" id="leaveBtn">Salir</button>
    </div>
  `);
  $('#stayBtn').onclick = hideModal;
  $('#leaveBtn').onclick = () => { hideModal(); stopActiveTimer(); goLevels(); };
}

/* =========================================================
   Eventos generales
   ========================================================= */
window.addEventListener('DOMContentLoaded', () => {
  $('#btnStart').addEventListener('click', () => {
    if (!State.profile){ showProfileScreen('onboarding'); return; }
    if (!State.onboardingDone) startQuiz('pre');
    else goLevels();
  });
  $('#btnLevels').addEventListener('click', goLevels);
  $('#btnCredits').addEventListener('click', goCredits);
  $('#btnLevelsBack').addEventListener('click', goMenu);
  $('#btnCreditsBack').addEventListener('click', goMenu);
  $('#btnGameExit').addEventListener('click', exitGame);
  $('#btnOpenInstructions').addEventListener('click', () => showInstructions(false));
  $('#btnInstructionsBack').addEventListener('click', goLevels);
  $('#btnOpenShop').addEventListener('click', showShop);
  $('#btnShopBack').addEventListener('click', goLevels);
  $('#btnProfileBack').addEventListener('click', goMenu);
  $('#btnMultiplayer').addEventListener('click', openMultiplayerChoice);
  $('#btnMultiplayerBack').addEventListener('click', () => { mpSession = null; goMenu(); });
  $('#btnLeaderboard').addEventListener('click', showLeaderboardScreen);
  $('#btnLeaderboardBack').addEventListener('click', goMenu);
  $('#btnLeaderboardRefresh').addEventListener('click', renderLeaderboard);
  $('#btnTeacher').addEventListener('click', showTeacherPanel);
  $('#btnTeacherBack').addEventListener('click', goMenu);
  $('#btnArena').addEventListener('click', showArena);
  $('#btnArenaBack').addEventListener('click', goMenu);
  $('#btnArenaGameExit').addEventListener('click', exitArenaGame);
  $('#btnOnlineSetupBack').addEventListener('click', goMenu);
  $('#btnOnlineRoomLeave').addEventListener('click', () => leaveOnlineRoom(false));
  $('#btnClassCode').addEventListener('click', showClassCodeScreen);
  $('#btnClassCodeBack').addEventListener('click', goMenu);
  showScreen('#screenMenu');

  loadProgress().finally(() => {
    $('#menuCoins').textContent = State.coins;
    if (State.shopOwned.has('accessory')) $('#bitAccessory').classList.remove('hidden');
    refreshProfileUI();
  });
});
