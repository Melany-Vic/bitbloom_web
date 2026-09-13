/* =========================================================
   MISIONES SECUNDARIAS — independientes del progreso principal
   ========================================================= */
const SIDE_QUESTS = [
  { key:'sq1', name:'Identifica el Componente', icon:'🔍', x:84, y:82, near:1, char:'byte', coins:25 },
  { key:'sq2', name:'HW o SW Express', icon:'⚡', x:80, y:56, near:3, char:'bloom', coins:30 },
  { key:'sq3', name:'Términos de Red', icon:'🌐', x:10, y:26, near:5, char:'net', coins:30 },
];

const SQ1_POOL = [
  { img:'assets/elements/cpu.png', name:'CPU' },
  { img:'assets/elements/ram.png', name:'Memoria RAM' },
  { img:'assets/elements/gpu.png', name:'Tarjeta Gráfica' },
  { img:'assets/elements/ssd.png', name:'Almacenamiento SSD' },
  { img:'assets/elements/motherboard.png', name:'Placa Madre' },
  { img:'assets/elements/hdd.png', name:'Disco Duro' },
  { img:'assets/elements/powersupply.png', name:'Fuente de Poder' },
  { img:'assets/elements/router.png', name:'Router' },
];

const SQ2_POOL = [
  { term:'Impresora', cat:'hardware' }, { term:'Hoja de cálculo', cat:'software' },
  { term:'Memoria USB', cat:'hardware' }, { term:'Videojuego', cat:'software' },
  { term:'Monitor', cat:'hardware' }, { term:'Antivirus', cat:'software' },
  { term:'Micrófono', cat:'hardware' }, { term:'Navegador web', cat:'software' },
];

const SQ3_POOL = [
  { term:'Router', options:['Dirige los datos entre tu red e internet', 'Guarda archivos en la nube', 'Enfría la computadora'], correct:0 },
  { term:'Dirección IP', options:['Un tipo de virus', 'Un número que identifica a un dispositivo en la red', 'Un cable de red'], correct:1 },
  { term:'Wi-Fi', options:['Red inalámbrica para conectar dispositivos', 'Un programa antivirus', 'Un componente interno de la PC'], correct:0 },
  { term:'Servidor', options:['Computadora que atiende pedidos de otros dispositivos', 'Un tipo de teclado', 'Un cable de poder'], correct:0 },
];

let sqState = null;

function openSideQuest(key){
  const sq = SIDE_QUESTS.find(s => s.key === key);
  const info = CHAR_INFO[sq.char];
  showModal(`
    <img src="assets/characters/${sq.char}.png" class="mission-avatar" alt="${info.name}">
    <div class="speaker-tag">${info.name.toUpperCase()} · ${info.role}</div>
    <h2>${sq.icon} ${sq.name}</h2>
    <p>Una misión rápida y opcional. No usa vidas ni afecta tu progreso principal — ¡solo suma monedas extra!</p>
    <div class="modal-actions">
      <button class="modal-btn" id="sqCancel">Cerrar</button>
      <button class="modal-btn primary" id="sqGo">¡Vamos! ▶</button>
    </div>
  `);
  $('#sqCancel').onclick = hideModal;
  $('#sqGo').onclick = () => runSideQuest(sq);
}

function runSideQuest(sq){
  sqState = { sq, round: 0, correct: 0 };
  if (sq.key === 'sq1') sq1Render();
  if (sq.key === 'sq2') sq2Render();
  if (sq.key === 'sq3') sq3Render();
}

function sqFinish(totalRounds){
  const sq = sqState.sq;
  const firstTime = !State.sideQuests.has(sq.key);
  const coinsEarned = firstTime ? sq.coins : Math.round(sq.coins * 0.3);
  State.coins += coinsEarned;
  State.sideQuests.add(sq.key);
  saveProgress();
  beep(sqState.correct === totalRounds ? 'win' : 'correct');
  showModal(`
    <img src="assets/characters/${sq.char}.png" class="mission-avatar" alt="">
    <h2>¡Misión secundaria completa!</h2>
    <p>Acertaste ${sqState.correct} de ${totalRounds}. Ganaste 🪙 ${coinsEarned} monedas${firstTime ? '' : ' (recompensa reducida por repetir)'}.</p>
    <div class="modal-actions">
      <button class="modal-btn primary" id="sqBackMap">Volver al mapa</button>
    </div>
  `);
  $('#sqBackMap').onclick = () => { hideModal(); goLevels(); };
}

/* ---------- SQ1: Identifica el Componente ---------- */
function sq1Render(){
  const item = shuffle(SQ1_POOL)[0];
  const distractors = shuffle(SQ1_POOL.filter(p => p.name !== item.name)).slice(0, 3);
  const options = shuffle([item, ...distractors]);
  showModal(`
    <h2>🔍 Identifica el Componente</h2>
    <img src="${item.img}" style="width:120px;margin:0 auto 16px;display:block;" alt="">
    <div class="quiz-options" id="sq1Options"></div>
  `);
  const box = $('#sq1Options');
  options.forEach(opt => {
    const btn = el('button', 'quiz-opt', opt.name);
    btn.addEventListener('click', () => {
      $$('.quiz-opt', box).forEach(b => { b.disabled = true; if (b.textContent === item.name) b.classList.add('correct'); });
      if (opt.name === item.name){ sqState.correct++; beep('correct'); btn.classList.add('correct'); }
      else { beep('wrong'); btn.classList.add('wrong'); }
      setTimeout(() => sqFinish(1), 900);
    });
    box.appendChild(btn);
  });
}

/* ---------- SQ2: HW o SW Express ---------- */
function sq2Render(){
  if (sqState.round === 0) sqState.items = shuffle(SQ2_POOL).slice(0, 3);
  if (sqState.round >= 3){ sqFinish(3); return; }
  const item = sqState.items[sqState.round];
  showModal(`
    <h2>⚡ HW o SW Express</h2>
    <p style="margin-bottom:10px;">Ronda ${sqState.round + 1} / 3</p>
    <div class="quiz-card"><div class="quiz-question">${item.term}</div></div>
    <div class="modal-actions" style="justify-content:center;">
      <button class="modal-btn" id="sq2Hw">HARDWARE</button>
      <button class="modal-btn" id="sq2Sw">SOFTWARE</button>
    </div>
  `);
  const answer = (choice, btnEl) => {
    const correct = choice === item.cat;
    if (correct){ sqState.correct++; beep('correct'); btnEl.classList.add('modal-btn-correct'); }
    else beep('wrong');
    sqState.round++;
    setTimeout(sq2Render, 500);
  };
  $('#sq2Hw').onclick = (e) => answer('hardware', e.target);
  $('#sq2Sw').onclick = (e) => answer('software', e.target);
}

/* ---------- SQ3: Términos de Red ---------- */
function sq3Render(){
  if (sqState.round === 0) sqState.items = shuffle(SQ3_POOL).slice(0, 3);
  if (sqState.round >= 3){ sqFinish(3); return; }
  const item = sqState.items[sqState.round];
  const order = shuffle(item.options.map((text, i) => ({ text, correct: i === item.correct })));
  showModal(`
    <h2>🌐 Términos de Red</h2>
    <p style="margin-bottom:10px;">Ronda ${sqState.round + 1} / 3 — <strong class="accent-cyan">${item.term}</strong></p>
    <div class="quiz-options" id="sq3Options"></div>
  `);
  const box = $('#sq3Options');
  order.forEach(opt => {
    const btn = el('button', 'quiz-opt', opt.text);
    btn.addEventListener('click', () => {
      $$('.quiz-opt', box).forEach(b => {
        b.disabled = true;
        if (b.textContent === item.options[item.correct]) b.classList.add('correct');
      });
      if (opt.correct){ sqState.correct++; beep('correct'); }
      else { beep('wrong'); btn.classList.add('wrong'); }
      sqState.round++;
      setTimeout(sq3Render, 1000);
    });
    box.appendChild(btn);
  });
}
