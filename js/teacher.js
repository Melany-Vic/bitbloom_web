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
    <div class="online-panel">
      <button class="modal-btn" id="teacherFeedbackBtn">💬 Ver opiniones de los usuarios</button>
    </div>
    <div class="online-panel" id="teacherMyClasses">
      <h3 class="prog-h">📊 Tus actividades y resultados</h3>
      <p class="level-hint" id="teacherClassesMsg">Cargando…</p>
      <div id="teacherClassesList"></div>
    </div>
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
  const fbBtn = $('#teacherFeedbackBtn'); if (fbBtn) fbBtn.onclick = showFeedbackInbox;
  loadTeacherClasses();
}

/* ---------- Índice de actividades del profesor (para ver sus resultados) ---------- */
function teacherIndexKey(){ return 'teachercodes:' + slugifyProfileName(State.profile ? State.profile.name : 'profesor'); }
async function getTeacherCodes(){
  try {
    const r = await AppStorage.get(teacherIndexKey(), true);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return [];
}
async function registerTeacherCode(code){
  const list = await getTeacherCodes();
  if (!list.find(c => c.code === code)) list.push({ code, createdAt: Date.now() });
  try { await AppStorage.set(teacherIndexKey(), JSON.stringify(list), true); } catch (e) {}
}
async function loadTeacherClasses(){
  const msg = $('#teacherClassesMsg'), box = $('#teacherClassesList');
  if (!msg || !box) return;
  const list = await getTeacherCodes();
  if (!list.length){ msg.textContent = 'Aún no has creado actividades. Crea una abajo y compártela con tus estudiantes.'; return; }
  msg.textContent = 'Toca una actividad para ver cómo les fue a tus estudiantes.';
  box.innerHTML = '';
  list.slice().reverse().forEach(c => {
    const row = el('div', 'online-player-row', `
      <span class="p-name">Código <b>${escapeHtml(c.code)}</b> · ${new Date(c.createdAt).toLocaleDateString('es')}</span>
      <button class="modal-btn" style="padding:6px 12px; font-size:11px;">Ver resultados ▶</button>`);
    row.querySelector('button').addEventListener('click', () => showTeacherResults(c.code));
    box.appendChild(row);
  });
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
    await registerTeacherCode(code);
    loadTeacherClasses();
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
    classQuizState = { code, payload, index: 0, correct: 0, answers: [], sent: false };
    classNameStep();
  } catch (e) {
    status.textContent = 'No se encontró esa actividad, o el almacenamiento no está disponible ahora mismo.';
  }
}

/* Paso previo: el estudiante escribe su nombre y apellido reales */
function classNameStep(){
  const wrap = $('#classCodeWrap');
  const st = classQuizState;
  const rn = State.realName || { first:'', last:'' };
  wrap.innerHTML = `
    <h2 style="text-align:center;">Actividad de ${escapeHtml(st.payload.teacher)}</h2>
    <p class="level-hint">Antes de empezar, escribe tu <b>nombre y apellido reales</b> para que tu profesor/a sepa quién eres cuando reciba tus resultados.</p>
    <div class="teacher-form">
      <label class="profile-label">Nombre</label>
      <input type="text" id="realFirst" class="profile-input" maxlength="30" placeholder="Tu nombre" value="${escapeHtml(rn.first)}" autocomplete="given-name">
      <label class="profile-label">Apellido</label>
      <input type="text" id="realLast" class="profile-input" maxlength="30" placeholder="Tu apellido" value="${escapeHtml(rn.last)}" autocomplete="family-name">
      <div class="profile-error hidden" id="realNameErr"></div>
      <button class="modal-btn primary profile-save-btn" id="realNameGo">Comenzar la actividad ▶</button>
    </div>`;
  $('#realNameGo').addEventListener('click', () => {
    const first = $('#realFirst').value.trim(), last = $('#realLast').value.trim();
    if (first.length < 2 || last.length < 2){
      const e = $('#realNameErr'); e.textContent = 'Escribe tu nombre y tu apellido (mínimo 2 letras cada uno).'; e.classList.remove('hidden'); return;
    }
    State.realName = { first, last };
    saveProgress();
    classQuizRender();
  });
}

/* Envía el intento actual al profesor (guarda en el almacenamiento compartido) */
async function sendClassResults(){
  const st = classQuizState;
  const btn = $('#classSendBtn'), msg = $('#classSendMsg');
  btn.disabled = true; msg.textContent = 'Enviando…';
  try {
    const key = 'classres:' + st.code + ':' + slugifyProfileName(State.profile ? State.profile.name : 'invitado');
    let doc = null;
    try { const r = await AppStorage.get(key, true); if (r && r.value) doc = JSON.parse(r.value); } catch (e) {}
    if (!doc) doc = { code: st.code, attempts: [] };
    doc.student = { first: State.realName.first, last: State.realName.last, username: State.profile ? State.profile.name : '' };
    doc.attempts.push({ ts: Date.now(), correct: st.correct, total: st.payload.questions.length, answers: st.answers });
    const ok = await AppStorage.set(key, JSON.stringify(doc), true);
    if (!ok) throw new Error('no se pudo guardar');
    st.sent = true;
    msg.textContent = '✅ ¡Resultados enviados a tu profesor/a!';
    btn.textContent = '✓ Enviados';
  } catch (e) {
    btn.disabled = false;
    msg.textContent = 'No se pudo enviar ahora. Revisa tu conexión e inténtalo de nuevo.';
  }
}

function classQuizRender(){
  const wrap = $('#classCodeWrap');
  const st = classQuizState;
  if (st.index >= st.payload.questions.length){
    if (!st.rewarded){
      st.rewarded = true;
      st.coinsEarned = st.correct * 8;
      State.coins += st.coinsEarned;
      recordActivity('side', 'class-' + st.code, st.correct >= Math.ceil(st.payload.questions.length / 2), st.correct * 10, 0, st.coinsEarned);
      saveProgress();
    }
    wrap.innerHTML = `
      <h2>¡Actividad completa!</h2>
      <p>${escapeHtml(State.realName ? State.realName.first : '')}, acertaste ${st.correct} de ${st.payload.questions.length}. Ganaste 🪙 ${st.coinsEarned} monedas.</p>
      <p class="level-hint">Actividad creada por ${escapeHtml(st.payload.teacher)}.</p>
      <button class="modal-btn primary profile-save-btn" id="classSendBtn">📨 Enviar mis resultados a mi profesor/a</button>
      <p class="level-hint" id="classSendMsg"></p>
      <div class="modal-actions" style="margin-top:10px;">
        <button class="modal-btn" id="classRetryBtn">🔁 Repetir la actividad</button>
        <button class="modal-btn" id="classCodeBackBtn">Volver al menú</button>
      </div>
    `;
    $('#classSendBtn').addEventListener('click', sendClassResults);
    $('#classCodeBackBtn').addEventListener('click', goMenu);
    $('#classRetryBtn').addEventListener('click', () => {
      classQuizState = { code: st.code, payload: st.payload, index: 0, correct: 0, answers: [], sent: false };
      classQuizRender();
    });
    return;
  }
  const item = st.payload.questions[st.index];
  const order = shuffle(item.options.map((text, i) => ({ text, correct: i === item.correct })));
  wrap.innerHTML = `
    <p class="level-hint">Pregunta ${st.index + 1} / ${st.payload.questions.length} · Actividad de ${escapeHtml(st.payload.teacher)}</p>
    <div class="quiz-card"><div class="quiz-question">${escapeHtml(item.q)}</div></div>
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
      if (!opt.correct) recordMistake('actividad', item.q);
      st.answers.push({ q: item.q, ok: !!opt.correct, chosen: opt.text, right: item.options[item.correct] });
      if (opt.correct){ st.correct++; beep('correct'); }
      else { beep('wrong'); btn.classList.add('wrong'); }
      st.index++;
      setTimeout(classQuizRender, 1000);
    });
    box.appendChild(btn);
  });
}


/* =========================================================
   RESULTADOS DEL PROFESOR — ve a todos los alumnos que enviaron
   su actividad, en qué deben mejorar y si han mejorado.
   ========================================================= */
async function showTeacherResults(code){
  const wrap = $('#teacherWrap');
  wrap.innerHTML = `<p class="level-hint">Cargando resultados de <b>${escapeHtml(code)}</b>…</p>`;
  const [actRes, rows] = await Promise.all([
    AppStorage.get('class:' + code, true).catch(() => null),
    AppStorage.list('classres:' + code + ':', true),
  ]);
  const act = actRes && actRes.value ? JSON.parse(actRes.value) : null;
  const students = rows.map(r => { try { return JSON.parse(r.value); } catch (e) { return null; } })
    .filter(d => d && d.attempts && d.attempts.length)
    .sort((a, b) => (a.student.last + a.student.first).localeCompare(b.student.last + b.student.first, 'es'));

  const pct = a => a.total ? Math.round(a.correct / a.total * 100) : 0;
  const last = d => d.attempts[d.attempts.length - 1];
  const totalAttempts = students.reduce((n, d) => n + d.attempts.length, 0);
  const avg = students.length ? Math.round(students.reduce((n, d) => n + pct(last(d)), 0) / students.length) : 0;

  // Preguntas: % de acierto en el último intento de cada alumno
  const qStats = {};
  students.forEach(d => last(d).answers.forEach(a => {
    const q = qStats[a.q] || (qStats[a.q] = { ok:0, n:0 });
    q.n++; if (a.ok) q.ok++;
  }));
  const qRows = Object.keys(qStats).map(q => ({ q, p: Math.round(qStats[q].ok / qStats[q].n * 100), n: qStats[q].n }));

  const trend = d => {
    if (d.attempts.length < 2) return '<span class="online-status-badge">1er intento</span>';
    const diff = pct(last(d)) - pct(d.attempts[0]);
    if (diff > 0) return `<span class="prog-trend up">▲ Mejoró +${diff}%</span>`;
    if (diff < 0) return `<span class="prog-trend down">▼ Bajó ${diff}%</span>`;
    return '<span class="prog-trend">＝ Igual</span>';
  };

  wrap.innerHTML = `
    <div class="modal-actions" style="justify-content:flex-start; margin-bottom:10px;">
      <button class="modal-btn" id="trBack">← Volver al panel</button>
      <button class="modal-btn" id="trRefresh">🔄 Actualizar</button>
    </div>
    <div class="online-panel">
      <h3 class="prog-h">Resultados · código ${escapeHtml(code)}</h3>
      ${act ? '<p class="level-hint" style="margin:0 0 10px;">' + act.questions.length + ' preguntas · creada el ' + new Date(act.createdAt).toLocaleDateString('es') + '</p>' : ''}
      <div class="prog-stats">
        <div class="prog-stat"><b>${students.length}</b><span>alumnos</span></div>
        <div class="prog-stat"><b>${totalAttempts}</b><span>intentos enviados</span></div>
        <div class="prog-stat"><b>${avg}%</b><span>promedio de la clase</span></div>
      </div>
    </div>
    ${students.length ? `
    <div class="online-panel">
      <h3 class="prog-h">🎯 En qué deben mejorar</h3>
      <p class="prog-note">Porcentaje de alumnos que acertó cada pregunta en su último intento.</p>
      ${qRows.map(r => `
        <div class="tr-q">
          <div class="tr-q-top"><span>${escapeHtml(r.q)}</span><b class="${r.p < 60 ? 'tr-low' : 'tr-ok'}">${r.p}%</b></div>
          <div class="tr-bar"><div class="tr-bar-fill ${r.p < 60 ? 'low' : ''}" style="width:${r.p}%"></div></div>
          ${r.p < 60 ? '<div class="tr-flag">⚠ Conviene reforzar este tema</div>' : ''}
        </div>`).join('')}
    </div>
    <div class="online-panel">
      <h3 class="prog-h">👥 Alumnos</h3>
      ${students.map(d => {
        const l = last(d), best = Math.max(...d.attempts.map(pct));
        return `
        <details class="prog-day">
          <summary>
            <span class="prog-day-name" style="text-transform:none;">${escapeHtml(d.student.first)} ${escapeHtml(d.student.last)} <small style="color:var(--text-faint)">@${escapeHtml(d.student.username)}</small></span>
            <span class="prog-day-sum">${l.correct}/${l.total} · ${pct(l)}% · ${d.attempts.length} intento${d.attempts.length === 1 ? '' : 's'} · ${trend(d)}</span>
          </summary>
          ${d.attempts.map((a, i) => `
            <div class="prog-day-row" style="flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between;"><span>Intento ${i + 1} · ${new Date(a.ts).toLocaleString('es', { dateStyle:'short', timeStyle:'short' })}</span><span>${a.correct}/${a.total} (${pct(a)}%)</span></div>
              ${a.answers.filter(x => !x.ok).map(x => `<div class="tr-miss">✗ ${escapeHtml(x.q)}<br><small>Respondió: ${escapeHtml(x.chosen)} · Correcta: ${escapeHtml(x.right)}</small></div>`).join('') || '<div class="tr-okline">✓ Todo correcto</div>'}
            </div>`).join('')}
          <div class="prog-day-row"><span>Mejor resultado</span><span>${best}%</span></div>
        </details>`;
      }).join('')}
    </div>` : `<div class="online-panel"><p class="level-hint">Todavía ningún estudiante ha enviado resultados para este código.</p></div>`}
  `;
  $('#trBack').addEventListener('click', showTeacherPanel);
  $('#trRefresh').addEventListener('click', () => showTeacherResults(code));
}
