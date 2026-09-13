/* =========================================================
   NIVEL 3 — Hardware o Software
   ========================================================= */
const L3_HARDWARE = [
  { label:'CPU', img:'assets/elements/cpu.png' }, { label:'Memoria RAM', img:'assets/elements/ram.png' },
  { label:'Almacenamiento SSD', img:'assets/elements/ssd.png' }, { label:'Tarjeta Gráfica', img:'assets/elements/gpu.png' },
  { label:'Disco Duro', img:'assets/elements/hdd.png' }, { label:'Placa Madre', img:'assets/elements/motherboard.png' },
  { label:'Teclado', img:'assets/elements/keyboard.png' }, { label:'Mouse', img:'assets/elements/mouse.png' },
  { label:'Fuente de Poder', img:'assets/elements/powersupply.png' }, { label:'Computadora (PC)', img:'assets/elements/pc.png' },
];
const L3_SOFTWARE = [
  { label:'Procesador de Texto', icon:'📄' }, { label:'Editor de Imágenes', icon:'🎨' }, { label:'Sistema Operativo', icon:'🪟' },
  { label:'Navegador Web', icon:'🌐' }, { label:'Videojuego', icon:'🎮' }, { label:'Antivirus', icon:'🛡️' },
  { label:'App de Mensajería', icon:'💬' }, { label:'Hoja de Cálculo', icon:'📊' }, { label:'Reproductor de Música', icon:'🎵' },
  { label:'App Bancaria', icon:'🏦' },
];
const L3_TOTAL = 14;
let l3Index = 0;
let l3Queue = [];
let l3Answered = false;

function initLevel3(){
  setupLevelHud(3, 3);
  l3Index = 0;
  const pool = shuffle([
    ...L3_HARDWARE.map(x => ({ ...x, cat:'hardware' })),
    ...L3_SOFTWARE.map(x => ({ ...x, cat:'software' })),
  ]);
  l3Queue = pool.slice(0, L3_TOTAL);

  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">¿Es HARDWARE o SOFTWARE? Decide antes de que caiga. También puedes usar las flechas ← →.</p>
    <div class="level-goal-bar">Elemento <span id="l3Idx">1</span> / ${L3_TOTAL}</div>
    <div class="l3-lane" id="l3Lane"><div class="l3-ground"></div></div>
    <div class="l3-buttons">
      <button class="l3-btn hw" id="l3Hw">⬅ HARDWARE</button>
      <button class="l3-btn sw" id="l3Sw">SOFTWARE ➡</button>
    </div>
  `;
  $('#l3Hw').addEventListener('click', () => l3Answer('hardware'));
  $('#l3Sw').addEventListener('click', () => l3Answer('software'));
  document.addEventListener('keydown', l3KeyHandler);
  bitSay('Todo lo que puedes tocar es hardware. Lo que solo ves en pantalla es software. ¡Vamos!', 'talk');
  l3Next();
}

function l3KeyHandler(e){
  if ($('#screenGame').classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') l3Answer('hardware');
  if (e.key === 'ArrowRight') l3Answer('software');
}

function l3Next(){
  if (l3Index >= L3_TOTAL){
    document.removeEventListener('keydown', l3KeyHandler);
    const stars = clamp(State.lives, 1, 3);
    finishLevel(3, true, stars, '¡Clasificaste todos los elementos tecnológicos como todo un experto!');
    return;
  }
  const item = l3Queue[l3Index];
  $('#l3Idx').textContent = l3Index + 1;
  l3Answered = false;

  const lane = $('#l3Lane');
  lane.querySelectorAll('.l3-item').forEach(n => n.remove());
  const iconHtml = item.img ? `<img src="${item.img}" class="l3-icon-img" alt="">` : item.icon;
  const chip = el('div', 'l3-item', `<span class="l3-item-icon">${iconHtml}</span><span>${item.label}</span>`);
  const leftPct = rand(15, 75);
  chip.style.left = leftPct + '%';
  lane.appendChild(chip);

  const seconds = Math.max(1.8, 4 - l3Index * 0.14);
  const laneHeight = lane.clientHeight - 66;
  requestAnimationFrame(() => {
    chip.style.transition = `top ${seconds}s linear`;
    chip.style.top = laneHeight + 'px';
  });

  startTimer(seconds, null, () => {
    if (!l3Answered) l3Answer(null);
  });
}

function l3Answer(choice){
  if (l3Answered) return;
  l3Answered = true;
  stopActiveTimerOnly();
  const item = l3Queue[l3Index];
  const lane = $('#l3Lane');
  const chip = $('.l3-item', lane);
  const correct = choice === item.cat;

  if (correct){
    addScore(120);
    beep('correct');
    if (chip) chip.classList.add('l3-correct');
  } else {
    beep('wrong');
    shakeHud();
    if (chip) chip.classList.add('l3-wrong');
    setLives(State.lives - 1);
    bitSay(`${item.label} es ${item.cat === 'hardware' ? 'HARDWARE' : 'SOFTWARE'}.`, 'alarm', 1500);
    if (State.lives <= 0){
      document.removeEventListener('keydown', l3KeyHandler);
      setTimeout(() => finishLevel(3, false, 0, 'Se acabaron las vidas. Recuerda: si lo puedes tocar es hardware; si es un programa, es software.'), 900);
      return;
    }
  }
  l3Index++;
  setTimeout(l3Next, 420);
}
