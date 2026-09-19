/* =========================================================
   ARENA DE DESAFÍOS — framework compartido para los 5 juegos
   construidos con Phaser 3. Cada juego es una Phaser.Scene
   independiente; este archivo se encarga de:
   - cargar Phaser bajo demanda (no penaliza el arranque normal)
   - mostrar el menú de desafíos
   - un puente de HUD (vidas / tiempo / puntos) en HTML normal
     por encima del canvas, para que se vea igual que el resto
     de BitBloom
   - terminar la partida, dar monedas y volver al menú
   ========================================================= */

const ARENA_GAMES = [
  { key:'runner',   name:'Carrera de Bits',            icon:'🏃', char:'byte',
    desc:'Saltá obstáculos y esquivá errores mientras corrés cada vez más rápido.',
    factory:() => new ArenaRunnerScene(), coins:30 },
  { key:'assembly', name:'Ensamblaje Bajo Presión',    icon:'🧩', char:'byte',
    desc:'Recolectá las piezas de la PC en las plataformas antes de que te atrapen.',
    factory:() => new ArenaAssemblyScene(), coins:35 },
  { key:'defense',  name:'Defensa del Servidor',       icon:'🛡️', char:'net',
    desc:'Saltá sobre los enemigos que avanzan en oleadas antes de que lleguen al servidor.',
    factory:() => new ArenaDefenseScene(), coins:35 },
  { key:'tunnel',   name:'Túnel de la Red',            icon:'🚇', char:'data',
    desc:'Cambiá de carril para esquivar el malware y atrapar solo los paquetes correctos.',
    factory:() => new ArenaTunnelScene(), coins:35 },
  { key:'boss',     name:'Asalto al Corruptor',        icon:'👹', char:'bit',
    desc:'El desafío final: juntá herramientas y derrotá al Corruptor saltando sobre él.',
    factory:() => new ArenaBossScene(), coins:50 },
];

let _phaserLoadPromise = null;
function loadPhaser(){
  if (window.Phaser) return Promise.resolve();
  if (_phaserLoadPromise) return _phaserLoadPromise;
  const urls = [
    'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js',
    'https://unpkg.com/phaser@3.70.0/dist/phaser.min.js',
  ];
  const tryLoad = (i) => new Promise((resolve, reject) => {
    if (i >= urls.length){ reject(new Error('No se pudo cargar el motor del juego (Phaser). Revisá tu conexión a internet.')); return; }
    const s = document.createElement('script');
    s.src = urls[i];
    s.onload = () => {
      if (window.Phaser) resolve();
      else tryLoad(i + 1).then(resolve, reject);
    };
    s.onerror = () => { tryLoad(i + 1).then(resolve, reject); };
    document.head.appendChild(s);
  });
  _phaserLoadPromise = tryLoad(0).catch(err => { _phaserLoadPromise = null; throw err; });
  return _phaserLoadPromise;
}

let arenaPhaserGame = null;
let arenaCurrentKey = null;

function showArena(){
  showScreen('#screenArena');
  bitHide();
  $('#arenaCoins').textContent = State.coins;
  const wrap = $('#arenaWrap');
  wrap.innerHTML = `<p class="level-hint">Desafíos extra, más difíciles, pensados para competir o jugar en equipo. Ganás monedas por completarlos.</p>
    <div class="arena-grid" id="arenaGrid"></div>`;
  const grid = $('#arenaGrid');
  ARENA_GAMES.forEach(g => {
    const card = el('div', 'arena-card');
    card.innerHTML = `
      <div class="arena-card-icon">${g.icon}</div>
      <div class="arena-card-name">${g.name}</div>
      <div class="arena-card-desc">${g.desc}</div>
      <div class="arena-card-reward">🪙 hasta ${g.coins}</div>
    `;
    card.addEventListener('click', () => openArenaBrief(g.key));
    grid.appendChild(card);
  });
}

function openArenaBrief(key){
  const g = ARENA_GAMES.find(x => x.key === key);
  const info = CHAR_INFO[g.char];
  showModal(`
    <img src="assets/characters/${g.char}.png" class="mission-avatar" alt="${info.name}">
    <div class="speaker-tag">${info.name.toUpperCase()} · ${info.role}</div>
    <h2>${g.icon} ${g.name}</h2>
    <p>${g.desc}</p>
    <div class="modal-controls"><b>Controles:</b> Flechas o WASD para mover, ESPACIO o flecha arriba para saltar. En celular: botones en pantalla.</div>
    <div class="modal-actions">
      <button class="modal-btn" id="arenaCancel">Cerrar</button>
      <button class="modal-btn primary" id="arenaGo">¡A jugar! ▶</button>
    </div>
  `);
  $('#arenaCancel').onclick = hideModal;
  $('#arenaGo').onclick = () => { hideModal(); launchArenaGame(key); };
}

async function launchArenaGame(key){
  arenaCurrentKey = key;
  const g = ARENA_GAMES.find(x => x.key === key);
  showScreen('#screenArenaGame');
  $('#arenaGameTitle').textContent = g.name.toUpperCase();
  $('#arenaStage').innerHTML = '<div class="arena-loading" id="arenaLoading">Cargando el motor del juego…</div>';
  arenaSetLives(3);
  arenaSetScore(0);
  arenaSetTimer(100);

  try {
    await loadPhaser();
  } catch (err) {
    $('#arenaStage').innerHTML = `<div class="arena-loading">${err.message}</div>`;
    return;
  }

  $('#arenaStage').innerHTML = '<div class="arena-canvas-box" id="arenaCanvasBox"></div>';

  if (arenaPhaserGame){ arenaPhaserGame.destroy(true); arenaPhaserGame = null; }

  arenaPhaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'arenaCanvasBox',
    width: 800,
    height: 450,
    backgroundColor: '#0a1024',
    physics: { default:'arcade', arcade:{ gravity:{ y: 1300 }, debug:false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: g.factory(),
  });
}

/* ---------- Puente de HUD (lo usan las escenas de Phaser) ---------- */
function arenaSetLives(n){
  const box = $('#arenaLives');
  box.innerHTML = '';
  for (let i = 0; i < 3; i++){
    box.appendChild(el('div', `life ${i < n ? '' : 'lost'}`));
  }
}
function arenaSetScore(n){ $('#arenaScore').textContent = n; }
function arenaSetTimer(pct){
  const fill = $('#arenaTimerFill');
  fill.style.width = clamp(pct, 0, 100) + '%';
  fill.classList.toggle('warn', pct < 30);
}

window.ArenaHUD = { setLives: arenaSetLives, setScore: arenaSetScore, setTimer: arenaSetTimer };

/* ---------- Controles táctiles compartidos (para celular) ---------- */
function addArenaTouchControls(scene, opts){
  opts = opts || {};
  const stage = document.getElementById('arenaCanvasBox') || document.getElementById('arenaStage');
  const wrap = document.createElement('div');
  wrap.className = 'arena-touch-controls';
  wrap.innerHTML = `
    <div class="arena-touch-left-right">
      <div class="arena-touch-btn" id="atLeft">◀</div>
      <div class="arena-touch-btn" id="atRight">▶</div>
    </div>
    <div class="arena-touch-btn" id="atJump">⤴</div>
  `;
  stage.appendChild(wrap);
  scene.touchState = { left:false, right:false, up:false };
  const bind = (id, prop) => {
    const node = wrap.querySelector('#' + id);
    node.addEventListener('pointerdown', (e) => { e.preventDefault(); scene.touchState[prop] = true; });
    node.addEventListener('pointerup', () => { scene.touchState[prop] = false; });
    node.addEventListener('pointerleave', () => { scene.touchState[prop] = false; });
  };
  bind('atLeft', 'left');
  bind('atRight', 'right');
  bind('atJump', 'up');
  scene.events.once('shutdown', () => wrap.remove());
  scene.events.once('destroy', () => wrap.remove());
}
function arenaGameOver(won, score, message){
  if (arenaPhaserGame){ arenaPhaserGame.destroy(true); arenaPhaserGame = null; }
  const g = ARENA_GAMES.find(x => x.key === arenaCurrentKey);
  const coinsEarned = won ? g.coins : Math.round(g.coins * 0.2);
  State.coins += coinsEarned;
  State.score += score;
  saveProgress();
  beep(won ? 'win' : 'lose');

  /* Si estamos jugando dentro de una sala en línea, el resultado se
     reporta a la sala (en vivo, para los demás jugadores) en vez de
     mostrar el resultado local de la Arena. */
  if (window.onlineRoom && window.onlineRoom.active){
    reportRoomScore(score);
    showModal(`
      <img src="assets/characters/${g.char}.png" class="mission-avatar" alt="">
      <h2>${won ? '¡Desafío superado!' : 'No lo lograste esta vez'}</h2>
      <p>${message}</p>
      <p>Tu puntaje ya se compartió con la sala: <strong class="accent-cyan">${score}</strong> puntos.</p>
      <div class="modal-actions">
        <button class="modal-btn primary" id="arenaOnlineBackBtn">Ver la sala</button>
      </div>
    `);
    $('#arenaOnlineBackBtn').onclick = () => hideModal();
    return;
  }

  showScreen('#screenArena');
  showModal(`
    <img src="assets/characters/${g.char}.png" class="mission-avatar" alt="">
    <h2>${won ? '¡Desafío superado!' : 'No lo lograste esta vez'}</h2>
    <p>${message}</p>
    <p>Puntos: <strong class="accent-cyan">${score}</strong> &nbsp;·&nbsp; Monedas ganadas: <strong class="accent-gold">🪙 ${coinsEarned}</strong></p>
    <div class="modal-actions">
      <button class="modal-btn" id="arenaBackBtn">Volver a la Arena</button>
      <button class="modal-btn primary" id="arenaRetryBtn">🔁 Reintentar</button>
    </div>
  `);
  $('#arenaBackBtn').onclick = () => { hideModal(); showArena(); };
  $('#arenaRetryBtn').onclick = () => { hideModal(); launchArenaGame(arenaCurrentKey); };
}

function exitArenaGame(){
  if (arenaPhaserGame){ arenaPhaserGame.destroy(true); arenaPhaserGame = null; }
  showArena();
}
