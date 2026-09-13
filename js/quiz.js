/* =========================================================
   EVALUACIÓN — quiz diagnóstico (inicial / final)
   ========================================================= */
const QUIZ_QUESTIONS = [
  { q:'¿Cuál de estos es un componente de HARDWARE?', options:['CPU', 'Word', 'Windows', 'Antivirus'], correct:0 },
  { q:'¿Qué hace la memoria RAM?', options:['Guarda de forma temporal los datos que un programa está usando', 'Muestra las imágenes en pantalla', 'Conecta la PC a internet', 'Enfría los componentes'], correct:0 },
  { q:'¿Cuál de estos es un SOFTWARE?', options:['Monitor', 'Navegador web', 'Teclado', 'Mouse'], correct:1 },
  { q:'¿Qué componente guarda tus archivos de forma permanente?', options:['Memoria RAM', 'Disco duro o SSD', 'Fuente de poder', 'Tarjeta gráfica'], correct:1 },
  { q:'¿Qué es un sistema operativo?', options:['Un programa que administra los recursos de la computadora', 'Un tipo de memoria', 'Un cable de red', 'Una tarjeta gráfica'], correct:0 },
  { q:'La PC no enciende y no hace ningún sonido. ¿Qué revisarías primero?', options:['La fuente de poder', 'El mouse', 'Los altavoces', 'El navegador'], correct:0 },
  { q:'¿Qué es el malware?', options:['Un tipo de hardware', 'Software diseñado para dañar o robar información', 'Un cable de red', 'Un componente de la placa madre'], correct:1 },
  { q:'¿Qué dispositivo conecta tu red local a internet?', options:['Router', 'Teclado', 'Monitor', 'Memoria RAM'], correct:0 },
  { q:'¿Cuál de estas opciones parece una dirección IP?', options:['192.168.1.1', 'ABC-123', 'hardware@bitbloom.com', 'C:/Usuarios'], correct:0 },
  { q:'¿Qué hace principalmente el CPU?', options:['Ejecuta instrucciones y realiza cálculos', 'Almacena archivos de forma permanente', 'Enfría el sistema', 'Conecta el Wi-Fi'], correct:0 },
];

let quizState = null;

function startQuiz(mode){
  quizState = { mode, index:0, correct:0, answered:false };
  showScreen('#screenQuiz');
  $('#quizTitle').textContent = mode === 'pre' ? 'Evaluación Inicial' : 'Evaluación Final';
  bitHide();
  quizRenderIntro();
}

function quizRenderIntro(){
  const wrap = $('#quizWrap');
  const isPre = quizState.mode === 'pre';
  wrap.innerHTML = `
    <div class="quiz-intro">
      <img src="assets/characters/bit.png" alt="Bit">
      <p>${isPre
        ? '¡Hola! Antes de empezar la aventura, quiero saber cuánto sabés sobre hardware y software. No te preocupes si no sabés todas las respuestas — ¡para eso vas a jugar!'
        : 'Ya completaste las seis misiones de BitBloom. Vamos a repetir la misma evaluación para ver cuánto aprendiste en el camino.'}</p>
    </div>
    <button class="modal-btn primary" id="quizIntroGo">${isPre ? '¡Empezar evaluación! ▶' : 'Empezar evaluación final ▶'}</button>
  `;
  $('#quizIntroGo').addEventListener('click', quizRenderQuestion);
}

function quizRenderQuestion(){
  const wrap = $('#quizWrap');
  const i = quizState.index;
  if (i >= QUIZ_QUESTIONS.length){
    quizFinish();
    return;
  }
  quizState.answered = false;
  const item = QUIZ_QUESTIONS[i];
  const order = shuffle(item.options.map((text, idx) => ({ text, correct: idx === item.correct })));
  wrap.innerHTML = `
    <div class="quiz-progress">Pregunta ${i + 1} / ${QUIZ_QUESTIONS.length}</div>
    <div class="quiz-card"><div class="quiz-question">${item.q}</div></div>
    <div class="quiz-options" id="quizOptions"></div>
  `;
  const optionsBox = $('#quizOptions');
  order.forEach(opt => {
    const btn = el('button', 'quiz-opt', opt.text);
    btn.addEventListener('click', () => quizAnswer(opt.correct, btn, item));
    optionsBox.appendChild(btn);
  });
}

function quizAnswer(isCorrect, btnEl, item){
  if (quizState.answered) return;
  quizState.answered = true;
  $$('.quiz-opt').forEach(b => {
    b.disabled = true;
    if (b.textContent === item.options[item.correct]) b.classList.add('correct');
  });
  if (isCorrect){
    quizState.correct++;
    beep('correct');
    btnEl.classList.add('correct');
  } else {
    beep('wrong');
    btnEl.classList.add('wrong');
  }
  quizState.index++;
  setTimeout(quizRenderQuestion, 900);
}

function quizFinish(){
  const score = quizState.correct;
  const total = QUIZ_QUESTIONS.length;
  const coinsEarned = score * 5;
  State.coins += coinsEarned;
  saveProgress();

  if (quizState.mode === 'pre'){
    State.preQuizScore = score;
    const wrap = $('#quizWrap');
    wrap.innerHTML = `
      <div class="quiz-intro">
        <img src="assets/characters/bit.png" alt="Bit">
        <h2 style="margin-bottom:10px;">¡Listo!</h2>
        <p>Acertaste <strong class="accent-cyan">${score} de ${total}</strong> preguntas. Ganaste 🪙 ${coinsEarned} monedas solo por intentarlo.<br>Ahora te voy a explicar cómo jugar BitBloom.</p>
      </div>
      <button class="modal-btn primary" id="quizToInstructions">Ver instrucciones ▶</button>
    `;
    $('#quizToInstructions').addEventListener('click', () => {
      State.onboardingDone = true;
      saveProgress();
      showInstructions(true);
    });
  } else {
    State.postQuizScore = score;
    const pre = State.preQuizScore != null ? State.preQuizScore : 0;
    let verdict;
    if (score > pre) verdict = `¡Mejoraste muchísimo! Antes acertabas ${pre}/${total} y ahora acertaste ${score}/${total}. 🎉`;
    else if (score === pre) verdict = `Mantuviste tu resultado: ${score}/${total} en ambas evaluaciones. ¡Seguí practicando para superarte!`;
    else verdict = `Esta vez acertaste ${score}/${total} (antes fue ${pre}/${total}). Repasá los niveles con más calma y volvé a intentarlo cuando quieras.`;

    const wrap = $('#quizWrap');
    wrap.innerHTML = `
      <div class="quiz-intro">
        <img src="assets/characters/bit.png" alt="Bit">
        <h2 style="margin-bottom:10px;">Evaluación final completa</h2>
        <p>${verdict}</p>
        <p style="margin-top:14px;">Ganaste 🪙 ${coinsEarned} monedas más.<br>Puntaje total del juego: <strong class="accent-gold">⬡ ${State.score}</strong> &nbsp;·&nbsp; Monedas totales: <strong class="accent-gold">🪙 ${State.coins}</strong></p>
      </div>
      <div class="modal-actions" style="justify-content:center;">
        <button class="modal-btn" id="quizToShop">🪙 Ir a la tienda</button>
        <button class="modal-btn primary" id="quizToCredits">Ver créditos ▶</button>
      </div>
    `;
    $('#quizToShop').addEventListener('click', () => showShop());
    $('#quizToCredits').addEventListener('click', () => goCredits());
  }
}
