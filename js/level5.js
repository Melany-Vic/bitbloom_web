/* =========================================================
   NIVEL 5 — Red de Datos (persecución: atrapa los elementos)
   Cada ronda dura hasta 3 minutos. Si tocás un enemigo o se
   acaba el tiempo, repetís esa misma ronda (sin perder vidas)
   hasta lograrlo.
   ========================================================= */
const L5_ROUND_SECONDS = 180; // 3 minutos por ronda

const L5_ROUNDS = [
  {
    goal: 'Arma la conexión a Internet',
    correct: [ {img:'assets/elements/router.png', n:'Router'}, {e:'🔌', n:'Cable de red'}, {e:'📡', n:'Módem'}, {img:'assets/elements/pc.png', n:'Computadora'} ],
    wrong:   [ {img:'assets/enemies/lag.png', n:'Lag'}, {img:'assets/enemies/bug.png', n:'Bug'}, {e:'🥷', n:'Hacker'} ],
    quota: 6, spawnMs: 950, speed: 2.2,
  },
  {
    goal: 'Protege tu cuenta',
    correct: [ {e:'🔐', n:'Contraseña segura'}, {e:'📲', n:'Verificación en 2 pasos'}, {e:'🛡️', n:'Antivirus actualizado'}, {e:'🔒', n:'Conexión segura'} ],
    wrong:   [ {e:'🎣', n:'Enlace de phishing'}, {img:'assets/enemies/virus.png', n:'Virus'}, {img:'assets/enemies/glitch.png', n:'Glitch'} ],
    quota: 6, spawnMs: 820, speed: 2.6,
  },
  {
    goal: 'Envía un archivo por la red',
    correct: [ {img:'assets/elements/pc.png', n:'Servidor'}, {e:'📦', n:'Paquete de datos'}, {e:'🔢', n:'Dirección IP'}, {e:'✅', n:'Conexión estable'} ],
    wrong:   [ {img:'assets/enemies/lag.png', n:'Lag'}, {img:'assets/enemies/bug.png', n:'Bug'}, {img:'assets/enemies/corrupt.png', n:'Corrupt'} ],
    quota: 7, spawnMs: 720, speed: 2.9,
  },
];

let l5RoundIdx = 0;
let l5Caught = 0;
let l5Attempt = 1;
let l5TotalRetries = 0;
let l5BitX = 50;
let l5Items = [];
let l5RafId = null;
let l5SpawnTimer = null;
let l5LaneEl = null;
let l5BitEl = null;

function initLevel5(){
  setupLevelHud(5, 3);
  l5RoundIdx = 0;
  l5TotalRetries = 0;
  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">Movete para atrapar los elementos correctos. Si tocás un enemigo, repetís la ronda: ¡no hay límite de intentos!</p>
    <div class="level-goal-bar" id="l5Goal"></div>
    <div class="l5-progress" id="l5Progress"></div>
    <div class="l5-lane" id="l5Lane">
      <img src="assets/characters/bit.png" class="l5-bit" id="l5Bit" alt="Bit">
    </div>
    <p class="level-hint">Arrastrá el dedo o el mouse sobre el área de juego, o usá las flechas ← →.</p>
  `;
  l5LaneEl = $('#l5Lane');
  l5BitEl = $('#l5Bit');
  bitSay('¡Persigamos los elementos que necesitamos! Si tocás un enemigo, no pasa nada grave: solo repetís la ronda.', 'talk');

  document.addEventListener('keydown', l5KeyHandler);
  l5LaneEl.addEventListener('pointermove', l5PointerHandler);
  l5LaneEl.addEventListener('pointerdown', l5PointerHandler);

  State.activeCleanup = l5Cleanup;
  l5StartRound(1);
}

function l5Cleanup(){
  if (l5RafId) cancelAnimationFrame(l5RafId);
  if (l5SpawnTimer) clearInterval(l5SpawnTimer);
  document.removeEventListener('keydown', l5KeyHandler);
  l5Items = [];
}

function l5KeyHandler(e){
  if ($('#screenGame').classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') l5BitX = clamp(l5BitX - 6, 4, 96);
  if (e.key === 'ArrowRight') l5BitX = clamp(l5BitX + 6, 4, 96);
}
function l5PointerHandler(e){
  const rect = l5LaneEl.getBoundingClientRect();
  const pct = ((e.clientX - rect.left) / rect.width) * 100;
  l5BitX = clamp(pct, 4, 96);
}

function l5StartRound(attempt){
  const round = L5_ROUNDS[l5RoundIdx];
  l5Caught = 0;
  l5Attempt = attempt;
  l5Items.forEach(it => it.el.remove());
  l5Items = [];
  l5BitX = 50;
  $('#l5Goal').innerHTML = `Ronda ${l5RoundIdx + 1}/${L5_ROUNDS.length} — <span class="accent-cyan">${round.goal}</span>` +
    (attempt > 1 ? ` <span class="l5-attempt">· Intento ${attempt}</span>` : '');
  l5UpdateProgress(round);
  if (attempt === 1){
    bitSay(`Necesitamos: ${round.correct.map(c => c.n).join(', ')}. ¡Evitá lo demás!`, 'talk', 3200);
  }

  if (l5RafId) cancelAnimationFrame(l5RafId);
  if (l5SpawnTimer) clearInterval(l5SpawnTimer);
  l5SpawnTimer = setInterval(() => l5Spawn(round), round.spawnMs);
  l5RafId = requestAnimationFrame(() => l5Tick(round));

  startTimer(L5_ROUND_SECONDS, null, () => l5RoundRetry('¡Se acabaron los 3 minutos! Vamos de nuevo con esta misma ronda.'));
}

function l5UpdateProgress(round){
  $('#l5Progress').textContent = `Atrapados: ${l5Caught} / ${round.quota}`;
}

function l5Spawn(round){
  const isCorrectSpawn = Math.random() < 0.62;
  const pool = isCorrectSpawn ? round.correct : round.wrong;
  const item = pool[rand(0, pool.length - 1)];
  const el2 = el('div', 'l5-item', item.img ? `<img src="${item.img}" class="l5-item-img" alt="">` : item.e);
  el2.title = item.n;
  const x = rand(6, 94);
  el2.style.left = x + '%';
  el2.style.top = '-40px';
  l5LaneEl.appendChild(el2);
  l5Items.push({ el: el2, x, y: -40, correct: isCorrectSpawn, caught: false });
}

function l5Tick(round){
  const laneHeight = l5LaneEl.clientHeight;
  if (l5BitEl) l5BitEl.style.left = l5BitX + '%';

  for (let i = l5Items.length - 1; i >= 0; i--){
    const it = l5Items[i];
    if (it.caught) continue;
    it.y += round.speed;
    it.el.style.top = it.y + 'px';

    const closeEnough = it.y > laneHeight - 90 && Math.abs(it.x - l5BitX) < 9;
    if (closeEnough){
      it.caught = true;
      l5Catch(it, round);
    } else if (it.y > laneHeight + 20){
      it.el.remove();
      l5Items.splice(i, 1);
    }
  }
  l5RafId = requestAnimationFrame(() => l5Tick(round));
}

function l5Catch(item, round){
  item.el.classList.add(item.correct ? 'l5-caught-good' : 'l5-caught-bad');
  setTimeout(() => { item.el.remove(); l5Items = l5Items.filter(i => i !== item); }, 180);

  if (item.correct){
    l5Caught++;
    addScore(40);
    beep('correct');
    l5UpdateProgress(round);
    if (l5Caught >= round.quota){
      l5RoundComplete();
    }
  } else {
    l5RoundRetry(`¡Tocaste a ${item.n}! Hay que repetir esta ronda desde el principio.`);
  }
}

function l5RoundComplete(){
  stopActiveTimerOnly();
  if (l5RafId) cancelAnimationFrame(l5RafId);
  if (l5SpawnTimer) clearInterval(l5SpawnTimer);
  addScore(150);
  beep('correct');
  l5RoundIdx++;
  if (l5RoundIdx >= L5_ROUNDS.length){
    l5Cleanup();
    const stars = l5TotalRetries === 0 ? 3 : l5TotalRetries <= 2 ? 2 : 1;
    finishLevel(5, true, stars, '¡Reuniste todos los elementos que la red necesitaba en cada misión!');
  } else {
    bitSay('¡Perfecto! Preparando el siguiente desafío...', 'talk', 1600);
    setTimeout(() => l5StartRound(1), 1400);
  }
}

function l5RoundRetry(msg){
  if (l5RafId) cancelAnimationFrame(l5RafId);
  if (l5SpawnTimer) clearInterval(l5SpawnTimer);
  stopActiveTimerOnly();
  beep('wrong');
  shakeHud();
  l5TotalRetries++;
  bitSay(msg, 'alarm', 2200);
  setTimeout(() => l5StartRound(l5Attempt + 1), 1400);
}
