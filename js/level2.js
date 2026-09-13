/* =========================================================
   NIVEL 2 — Diagnóstico Técnico
   (reemplaza el antiguo nivel de binario)
   ========================================================= */
const L2_SCENARIOS = [
  { symptom:'La computadora no enciende y no se escucha ningún sonido ni se ve ninguna luz.',
    options:['Fuente de poder', 'Monitor', 'Teclado', 'Altavoces'], correct:0,
    explain:'Sin energía ningún componente puede funcionar. Lo primero es revisar la fuente de poder.' },
  { symptom:'La PC enciende y se escuchan los ventiladores, pero el monitor no muestra ninguna imagen.',
    options:['Tarjeta gráfica o cable de video', 'Mouse', 'Impresora', 'Micrófono'], correct:0,
    explain:'Si hay energía pero no hay imagen, el problema suele estar en la tarjeta gráfica o su conexión.' },
  { symptom:'El equipo se reinicia solo cuando abres varios programas pesados al mismo tiempo.',
    options:['Memoria RAM insuficiente o dañada', 'Teclado', 'Parlantes', 'Cámara web'], correct:0,
    explain:'La RAM guarda lo que los programas usan en el momento; si falla o no alcanza, el sistema se reinicia.' },
  { symptom:'Los archivos tardan mucho en abrir y en general la computadora se siente muy lenta.',
    options:['Disco de almacenamiento dañado o casi lleno', 'Mouse', 'Router', 'Micrófono'], correct:0,
    explain:'Un disco duro o SSD dañado, fragmentado o casi lleno reduce mucho la velocidad del equipo.' },
  { symptom:'El equipo se apaga solo después de unos minutos y se siente muy caliente.',
    options:['Sistema de refrigeración', 'Teclado', 'Parlantes', 'Cámara web'], correct:0,
    explain:'Si el sistema de refrigeración falla, la computadora se apaga sola para protegerse del calor.' },
  { symptom:'Aparecen ventanas de publicidad todo el tiempo y el navegador se abre solo.',
    options:['Software malicioso (malware)', 'Fuente de poder', 'Placa madre', 'Disco duro'], correct:0,
    explain:'Ese comportamiento es típico de un malware instalado en el sistema, no de una falla física.' },
  { symptom:'El router está encendido, pero ningún dispositivo de la casa logra conectarse a internet.',
    options:['Problema de red o configuración del router', 'Tarjeta gráfica', 'Memoria RAM', 'Teclado'], correct:0,
    explain:'Si todos los dispositivos fallan a la vez, casi siempre el problema está en la red o el router.' },
  { symptom:'Un programa se cierra siempre con el mismo mensaje de error apenas lo abres.',
    options:['Error de software o controlador desactualizado', 'Fuente de poder', 'Ventilador', 'Mouse'], correct:0,
    explain:'Cuando un programa falla siempre igual, generalmente es un problema de software o de sus controladores.' },
];

let l2Index = 0;
let l2Answered = false;

function l2TimeForRound(i){ return Math.max(6, 13 - i * 0.9); }

function initLevel2(){
  setupLevelHud(2, 3);
  l2Index = 0;
  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">Lee el síntoma y toca la causa más probable antes de que se agote el tiempo.</p>
    <div class="level-goal-bar">Caso <span id="l2CaseNum">1</span> / ${L2_SCENARIOS.length}</div>
    <div class="l2-monitor">
      <div class="l2-monitor-icon">🩺</div>
      <div class="l2-symptom" id="l2Symptom"></div>
    </div>
    <div class="l2-options" id="l2Options"></div>
  `;
  bitSay('Byte está analizando cada máquina averiada. ¡Ayúdalo a encontrar la causa real del problema!', 'talk');
  l2NextRound();
}

function l2NextRound(){
  if (l2Index >= L2_SCENARIOS.length){
    const stars = clamp(State.lives, 1, 3);
    finishLevel(2, true, stars, '¡Diagnosticaste todas las máquinas correctamente! Byte ya puede repararlas.');
    return;
  }
  $('#l2CaseNum').textContent = l2Index + 1;
  l2Answered = false;
  const scenario = L2_SCENARIOS[l2Index];
  $('#l2Symptom').textContent = scenario.symptom;

  const optionsBox = $('#l2Options');
  optionsBox.innerHTML = '';
  const order = shuffle(scenario.options.map((text, i) => ({ text, correct: i === scenario.correct })));
  order.forEach(opt => {
    const btn = el('button', 'l2-opt', opt.text);
    btn.addEventListener('click', () => l2Answer(opt.correct, scenario, btn));
    optionsBox.appendChild(btn);
  });

  const seconds = l2TimeForRound(l2Index);
  startTimer(seconds, null, () => {
    if (!l2Answered) l2Answer(false, scenario, null);
  });
}

function l2Answer(isCorrect, scenario, btnEl){
  if (l2Answered) return;
  l2Answered = true;
  stopActiveTimerOnly();
  const optionsBox = $('#l2Options');
  $$('.l2-opt', optionsBox).forEach(b => {
    b.disabled = true;
    if (b.textContent === scenario.options[scenario.correct]) b.classList.add('correct');
  });
  if (isCorrect){
    addScore(150);
    beep('correct');
    if (btnEl) btnEl.classList.add('correct');
    bitSay('¡Correcto! ' + scenario.explain, 'talk', 2400);
  } else {
    beep('wrong');
    shakeHud();
    if (btnEl) btnEl.classList.add('wrong');
    setLives(State.lives - 1);
    bitSay(scenario.explain, 'alarm', 2600);
    if (State.lives <= 0){
      setTimeout(() => finishLevel(2, false, 0, 'Se acabaron las vidas. Repasa cómo identificar problemas de hardware, software y red.'), 1000);
      return;
    }
  }
  l2Index++;
  setTimeout(l2NextRound, 1500);
}
