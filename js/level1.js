/* =========================================================
   NIVEL 1 — Ensambla tu PC (por secciones)
   ========================================================= */
const L1_PARTS = [
  { key:'cpu',    label:'CPU · Procesador',      img:'assets/elements/cpu.png',
    func:'El CPU es el cerebro de la computadora: ejecuta las instrucciones y hace todos los cálculos.' },
  { key:'ram',    label:'Memoria RAM',           img:'assets/elements/ram.png',
    func:'La RAM guarda de forma temporal los datos que los programas están usando en este momento.' },
  { key:'store',  label:'Almacenamiento (SSD)',  img:'assets/elements/ssd.png',
    func:'Aquí se guardan tus archivos y programas de forma permanente, incluso apagada la PC.' },
  { key:'gpu',    label:'Tarjeta Gráfica',       img:'assets/elements/gpu.png',
    func:'La tarjeta gráfica procesa las imágenes y el video que ves en pantalla.' },
  { key:'psu',    label:'Fuente de Poder',       img:'assets/elements/powersupply.png',
    func:'Convierte la electricidad de la pared en la energía que necesitan los demás componentes.' },
  { key:'mobo',   label:'Placa Madre',           img:'assets/elements/motherboard.png',
    func:'Es la base que conecta y permite que todos los demás componentes se comuniquen entre sí.' },
];
const L1_DECOYS = [
  { key:'keyboard', label:'Teclado (periférico)', img:'assets/elements/keyboard.png' },
  { key:'mouse',     label:'Mouse (periférico)',   img:'assets/elements/mouse.png' },
  { key:'os',        label:'Sistema Operativo (software)', img:null, emoji:'🪟' },
];

let l1SectionIndex = 0;

function l1IconHtml(p){ return p.img ? `<img src="${p.img}" class="l1-icon-img" alt="">` : `<span>${p.emoji}</span>`; }

function initLevel1(){
  setupLevelHud(1, 3);
  l1SectionIndex = 0;
  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">Cada sección tiene una pieza correcta. Arrástrala hasta la ranura resaltada (o toca la pieza y luego la ranura).</p>
    <div class="level-goal-bar">Sección <span id="l1SectionNum">1</span> / ${L1_PARTS.length}</div>
    <div class="l1-board" id="l1Board"></div>
    <div class="l1-tray" id="l1Tray"></div>
  `;
  const board = $('#l1Board');
  board.addEventListener('click', (ev) => {
    const slot = ev.target.closest('.l1-slot.active');
    const sel = document.querySelector('.l1-piece.selected');
    if (slot && sel) l1Place(sel, slot, sel._l1Correct);
  });
  L1_PARTS.forEach(p => {
    const slot = el('div', 'l1-slot', `
      <div class="l1-slot-icon">?</div>
      <div class="l1-slot-label">${p.label}</div>
    `);
    slot.dataset.key = p.key;
    board.appendChild(slot);
  });

  bitSay('¡Vamos a armar esta computadora pieza por pieza! Te voy a explicar para qué sirve cada una.', 'talk');
  startTimer(80, null, () => {
    finishLevel(1, false, 0, 'Se agotó el tiempo antes de terminar el ensamblaje. ¡Vuelve a intentarlo!');
  });
  l1RenderSection();
}

function l1RenderSection(){
  const slots = $$('.l1-slot');
  slots.forEach(s => s.classList.remove('active'));
  const current = L1_PARTS[l1SectionIndex];
  const activeSlot = slots.find(s => s.dataset.key === current.key);
  if (activeSlot) activeSlot.classList.add('active');
  $('#l1SectionNum').textContent = l1SectionIndex + 1;

  const pool = [
    ...L1_PARTS.filter(p => p.key !== current.key),
    ...L1_DECOYS,
  ];
  const distractors = shuffle(pool).slice(0, 3);
  const options = shuffle([current, ...distractors]);

  const tray = $('#l1Tray');
  tray.innerHTML = '';
  options.forEach(p => {
    const chip = el('div', 'l1-piece', l1IconHtml(p));
    chip.dataset.key = p.key;
    chip.title = p.label;
    tray.appendChild(chip);
    bindL1Piece(chip, current.key);
  });
}

/* Coloca una pieza en una ranura (con arrastre o con toque) */
function l1Place(chip, slot, correctKey){
  if (chip.dataset.key === correctKey){
    const partInfo = L1_PARTS.find(p => p.key === correctKey);
    slot.classList.remove('active');
    slot.classList.add('filled');
    slot.querySelector('.l1-slot-icon').innerHTML = l1IconHtml(partInfo);
    slot.classList.add('pop');
    addScore(100);
    beep('correct');
    bitSay('Correcto: ' + partInfo.label + '. ' + partInfo.func, 'talk', 5200);
    l1SectionIndex++;
    $$('.l1-piece').forEach(c => c.classList.remove('selected'));
    if (l1SectionIndex >= L1_PARTS.length){
      const stars = clamp(State.lives, 1, 3);
      setTimeout(() => finishLevel(1, true, stars, '¡Computadora ensamblada con éxito! Bit ya puede encenderla.'), 400);
    } else {
      setTimeout(l1RenderSection, 1700);
    }
  } else {
    resetDraggablePosition(chip);
    chip.classList.remove('selected');
    registerL1Mistake(slot);
  }
}

function bindL1Piece(chip, correctKey){
  makeDraggable(chip, {
    onDrop: (target, node, info) => {
      let slot = target ? target.closest('.l1-slot.active') : null;
      /* Tolerancia para dedos: si soltaste cerca de la ranura resaltada, cuenta */
      if (!slot && info){
        const act = document.querySelector('.l1-slot.active');
        if (act){
          const r = act.getBoundingClientRect(), m = 36;
          if (info.x > r.left - m && info.x < r.right + m && info.y > r.top - m && info.y < r.bottom + m) slot = act;
        }
      }
      if (slot) l1Place(chip, slot, correctKey);
      else resetDraggablePosition(chip);
    },
    /* Alternativa al arrastre: toca la pieza y luego la ranura resaltada */
    onTap: () => {
      $$('.l1-piece').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      bitSay('Ahora toca la ranura resaltada para colocar la pieza.', 'talk', 2200);
    },
  });
  chip._l1Correct = correctKey;
}

function registerL1Mistake(slot){
  recordMistake('hardware', 'Colocar la pieza en la ranura ' + String(slot.dataset.key || '').toUpperCase());
  beep('wrong');
  shakeHud();
  slot.classList.add('shake');
  setTimeout(() => slot.classList.remove('shake'), 300);
  setLives(State.lives - 1);
  const L1_HINTS = {
    cpu:'Pista: busca la pieza que es el cerebro y hace todos los cálculos.',
    ram:'Pista: es la memoria rápida que guarda datos temporales mientras usas programas.',
    store:'Pista: es donde se guardan tus archivos aunque apagues la PC.',
    gpu:'Pista: es la pieza que procesa las imágenes y el video para la pantalla.',
    psu:'Pista: convierte la electricidad de la pared en energía para los demás componentes.',
    mobo:'Pista: es la base grande que conecta a todas las demás piezas.',
  };
  bitSay('Esa pieza no va ahí. ' + (L1_HINTS[slot.dataset.key] || '¡Fíjate bien en la ranura!'), 'alarm', 4800);
  if (State.lives <= 0){
    finishLevel(1, false, 0, 'Se acabaron las vidas. Repasa las partes internas de una computadora e inténtalo otra vez.');
  }
}
