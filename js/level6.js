/* =========================================================
   NIVEL 6 — Programa a Bit (nivel final)
   ========================================================= */
const L6_ROUNDS = [
  {
    title:'Secuencia de encendido',
    steps:[
      'Se presiona el botón de encendido y la fuente de poder envía electricidad',
      'La BIOS/UEFI revisa que el hardware funcione correctamente',
      'El sistema operativo se carga desde el almacenamiento a la RAM',
      'El escritorio aparece y el equipo queda listo para usarse',
    ],
    time:45,
  },
  {
    title:'Ejecutar un programa',
    steps:[
      'Haces doble clic en el ícono del programa',
      'El sistema operativo carga el programa desde el disco a la RAM',
      'El CPU procesa las instrucciones del programa',
      'El resultado se muestra en la pantalla',
    ],
    time:40,
  },
  {
    title:'Editar y guardar un archivo',
    steps:[
      'Abres un archivo y se copia desde el disco a la memoria RAM',
      'Editas el contenido del archivo en pantalla',
      'Pulsas guardar para confirmar los cambios',
      'El sistema operativo escribe los cambios en el almacenamiento',
      'El archivo actualizado queda guardado de forma permanente',
    ],
    time:38,
  },
];

let l6RoundIdx = 0;
let l6Order = [];
let l6Correct = [];
let l6Locked = false;

function initLevel6(){
  setupLevelHud(6, 3);
  l6RoundIdx = 0;
  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">Ordena los pasos tocándolos en la secuencia correcta. Toca un bloque colocado para devolverlo.</p>
    <div class="level-goal-bar" id="l6RoundTitle"></div>
    <div class="l6-sequence" id="l6Sequence"></div>
    <div class="l6-tray" id="l6Tray"></div>
    <button class="modal-btn primary l6-run" id="l6Run">▶ EJECUTAR PROGRAMA</button>
  `;
  $('#l6Run').addEventListener('click', l6Execute);
  bitSay('Cada acción de la computadora sigue un orden lógico. ¡Piensa cuál va primero!', 'talk');
  l6StartRound();
}

function l6StartRound(){
  const round = L6_ROUNDS[l6RoundIdx];
  l6Correct = round.steps;
  l6Order = [];
  l6Locked = false;
  $('#l6RoundTitle').textContent = `Ronda ${l6RoundIdx + 1} / ${L6_ROUNDS.length} · ${round.title}`;

  const tray = $('#l6Tray');
  tray.innerHTML = '';
  shuffle(round.steps).forEach((step, i) => {
    const chip = el('div', 'l6-block', `<span class="l6-block-num">${i + 1}</span>${step}`);
    chip.dataset.text = step;
    chip.addEventListener('click', () => l6AddStep(chip, step));
    tray.appendChild(chip);
  });

  l6RenderSequence();
  startTimer(round.time, null, () => {
    if (l6Order.length < l6Correct.length) l6RoundFail('¡Se acabó el tiempo antes de completar la secuencia!');
  });
}

function l6RenderSequence(){
  const seq = $('#l6Sequence');
  seq.innerHTML = '';
  for (let i = 0; i < l6Correct.length; i++){
    const slot = el('div', 'l6-slot');
    if (l6Order[i]){
      slot.classList.add('filled');
      slot.innerHTML = `<span class="l6-slot-num">${i + 1}</span>${l6Order[i]}`;
      slot.addEventListener('click', () => l6RemoveStep(i));
    } else {
      slot.innerHTML = `<span class="l6-slot-num">${i + 1}</span><em>Vacío</em>`;
    }
    seq.appendChild(slot);
  }
}

function l6AddStep(chip, step){
  if (l6Locked || l6Order.length >= l6Correct.length) return;
  l6Order.push(step);
  chip.remove();
  beep('click');
  l6RenderSequence();
}

function l6RemoveStep(index){
  if (l6Locked) return;
  const [step] = l6Order.splice(index, 1);
  l6RenderSequence();
  const tray = $('#l6Tray');
  const chip = el('div', 'l6-block', step);
  chip.dataset.text = step;
  chip.addEventListener('click', () => l6AddStep(chip, step));
  tray.appendChild(chip);
}

function l6Execute(){
  if (l6Locked) return;
  if (l6Order.length < l6Correct.length){
    bitSay('Coloca todos los pasos antes de ejecutar el programa.', 'talk', 1800);
    return;
  }
  l6Locked = true;
  stopActiveTimerOnly();
  const slots = $$('.l6-slot', $('#l6Sequence'));
  let firstErrorIndex = -1;
  for (let i = 0; i < l6Correct.length; i++){
    if (l6Order[i] !== l6Correct[i]){ firstErrorIndex = i; break; }
  }
  let i = 0;
  const step = () => {
    if (i >= slots.length || (firstErrorIndex !== -1 && i > firstErrorIndex)){
      if (firstErrorIndex === -1){
        addScore(200);
        beep('correct');
        l6RoundIdx++;
        if (l6RoundIdx >= L6_ROUNDS.length){
          const stars = clamp(State.lives, 1, 3);
          finishLevel(6, true, stars, '¡Programaste correctamente cada proceso! Bit vuelve a casa sano y salvo.');
        } else {
          bitSay('¡Secuencia perfecta! Preparando el siguiente reto...', 'talk', 1700);
          setTimeout(l6StartRound, 1500);
        }
      } else {
        l6RoundFail('El orden tenía un error. Observa dónde se detuvo el programa.');
      }
      return;
    }
    slots[i].classList.add(i === firstErrorIndex ? 'error' : 'running');
    beep(i === firstErrorIndex ? 'wrong' : 'click');
    i++;
    setTimeout(step, 420);
  };
  step();
}

function l6RoundFail(msg){
  setLives(State.lives - 1);
  shakeHud();
  bitSay(msg, 'alarm');
  if (State.lives <= 0){
    finishLevel(6, false, 0, 'Se acabaron las vidas. Repasa el orden de los procesos e inténtalo otra vez.');
    return;
  }
  setTimeout(l6StartRound, 1600);
}
