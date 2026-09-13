/* =========================================================
   PANEL DEL PROFESOR — crea una actividad corta (3 preguntas)
   y la guarda con un código de clase en el almacenamiento
   compartido. Cualquier alumno que ingrese ese código puede
   jugarla.
   ========================================================= */
function randomClassCode(){
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += letters[rand(0, letters.length - 1)];
  return code;
}

function showTeacherPanel(){
  showScreen('#screenTeacher');
  bitHide();
  const wrap = $('#teacherWrap');
  const suggested = randomClassCode();
  const questionBlock = (n) => `
    <div class="teacher-question">
      <label class="profile-label">Pregunta ${n}</label>
      <input type="text" class="profile-input tq-text" data-q="${n}" placeholder="Escribí la pregunta">
      ${[0,1,2,3].map(i => `
        <div class="teacher-option-row">
          <input type="radio" name="correct-${n}" value="${i}" ${i === 0 ? 'checked' : ''} class="tq-correct" data-q="${n}">
          <input type="text" class="profile-input tq-opt" data-q="${n}" data-opt="${i}" placeholder="Opción ${i + 1}${i === 0 ? ' (marcá la correcta con el círculo)' : ''}">
        </div>
      `).join('')}
    </div>
  `;

  wrap.innerHTML = `
    <p class="level-hint">Creá una actividad de 3 preguntas para tus estudiantes. Compartiles el código de clase para que la jueguen desde "Código de clase" en el menú.</p>
    <div class="teacher-form">
      <label class="profile-label">Código de clase</label>
      <input type="text" id="teacherCode" class="profile-input" maxlength="8" value="${suggested}" style="text-transform:uppercase;">
      ${questionBlock(1)}
      ${questionBlock(2)}
      ${questionBlock(3)}
      <button class="modal-btn primary profile-save-btn" id="teacherSaveBtn">Guardar actividad ▶</button>
      <p class="level-hint" id="teacherStatus"></p>
    </div>
  `;

  $('#teacherSaveBtn').addEventListener('click', saveTeacherActivity);
}

async function saveTeacherActivity(){
  const code = $('#teacherCode').value.trim().toUpperCase();
  const status = $('#teacherStatus');
  if (!code){ status.textContent = 'Ingresá un código de clase.'; return; }

  const questions = [];
  for (let n = 1; n <= 3; n++){
    const text = $(`.tq-text[data-q="${n}"]`).value.trim();
    const opts = $$(`.tq-opt[data-q="${n}"]`).map(inp => inp.value.trim());
    const correctInput = $(`input.tq-correct[data-q="${n}"]:checked`);
    const correct = correctInput ? Number(correctInput.value) : 0;
    if (!text || opts.some(o => !o)){
      status.textContent = `Completá el texto y las 4 opciones de la pregunta ${n}.`;
      return;
    }
    questions.push({ q: text, options: opts, correct });
  }

  status.textContent = 'Guardando...';
  try {
    if (!AppStorage) throw new Error('sin storage');
    const payload = {
      teacher: State.profile ? State.profile.name : 'Profesor/a',
      questions,
      createdAt: Date.now(),
    };
    await AppStorage.set('class:' + code, JSON.stringify(payload), true);
    status.textContent = `¡Listo! Compartí el código "${code}" con tus estudiantes.`;
  } catch (e) {
    status.textContent = 'No se pudo guardar (esto funciona cuando el juego corre dentro de Claude). Intentá de nuevo.';
  }
}

/* =========================================================
   CÓDIGO DE CLASE — el alumno carga la actividad del profesor
   ========================================================= */
function showClassCodeScreen(){
  showScreen('#screenClassCode');
  bitHide();
  const wrap = $('#classCodeWrap');
  wrap.innerHTML = `
    <p class="level-hint">Si tu profesor/a te dio un código de clase, ingresalo acá para jugar la actividad que preparó.</p>
    <div class="teacher-form">
      <input type="text" id="classCodeInput" class="profile-input" maxlength="8" placeholder="Código de clase" style="text-transform:uppercase;">
      <button class="modal-btn primary profile-save-btn" id="classCodeGoBtn">Buscar actividad ▶</button>
      <p class="level-hint" id="classCodeStatus"></p>
    </div>
  `;
  $('#classCodeGoBtn').addEventListener('click', loadClassActivity);
}

let classQuizState = null;

async function loadClassActivity(){
  const code = $('#classCodeInput').value.trim().toUpperCase();
  const status = $('#classCodeStatus');
  if (!code){ status.textContent = 'Ingresá un código.'; return; }
  status.textContent = 'Buscando...';
  try {
    if (!AppStorage) throw new Error('sin storage');
    const res = await AppStorage.get('class:' + code, true);
    if (!res || !res.value){ status.textContent = 'No se encontró ninguna actividad con ese código.'; return; }
    const payload = JSON.parse(res.value);
    classQuizState = { code, payload, index: 0, correct: 0 };
    classQuizRender();
  } catch (e) {
    status.textContent = 'No se encontró esa actividad, o el almacenamiento no está disponible ahora mismo.';
  }
}

function classQuizRender(){
  const wrap = $('#classCodeWrap');
  const st = classQuizState;
  if (st.index >= st.payload.questions.length){
    const coinsEarned = st.correct * 8;
    State.coins += coinsEarned;
    saveProgress();
    wrap.innerHTML = `
      <h2>¡Actividad completa!</h2>
      <p>Acertaste ${st.correct} de ${st.payload.questions.length}. Ganaste 🪙 ${coinsEarned} monedas.</p>
      <p class="level-hint">Actividad creada por ${st.payload.teacher}.</p>
      <button class="modal-btn primary profile-save-btn" id="classCodeBackBtn">Volver al menú</button>
    `;
    $('#classCodeBackBtn').addEventListener('click', goMenu);
    return;
  }
  const item = st.payload.questions[st.index];
  const order = shuffle(item.options.map((text, i) => ({ text, correct: i === item.correct })));
  wrap.innerHTML = `
    <p class="level-hint">Pregunta ${st.index + 1} / ${st.payload.questions.length} · Actividad de ${st.payload.teacher}</p>
    <div class="quiz-card"><div class="quiz-question">${item.q}</div></div>
    <div class="quiz-options" id="classQuizOptions"></div>
  `;
  const box = $('#classQuizOptions');
  order.forEach(opt => {
    const btn = el('button', 'quiz-opt', opt.text);
    btn.addEventListener('click', () => {
      $$('.quiz-opt', box).forEach(b => {
        b.disabled = true;
        if (b.textContent === item.options[item.correct]) b.classList.add('correct');
      });
      if (opt.correct){ st.correct++; beep('correct'); }
      else { beep('wrong'); btn.classList.add('wrong'); }
      st.index++;
      setTimeout(classQuizRender, 1000);
    });
    box.appendChild(btn);
  });
}
