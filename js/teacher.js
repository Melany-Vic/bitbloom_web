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
  wrap.innerHTML = `
    <div class="online-panel">
      <button class="modal-btn" id="teacherFeedbackBtn">💬 Ver opiniones de los usuarios</button>
    </div>
    <div class="online-panel" id="teacherMyClasses">
      <h3 class="prog-h">📊 Tus actividades y resultados</h3>
      <p class="level-hint" id="teacherClassesMsg">Cargando…</p>
      <div id="teacherClassesList"></div>
    </div>
    <div id="teacherBuilder"></div>
  `;
  const fbBtn = $('#teacherFeedbackBtn'); if (fbBtn) fbBtn.onclick = showFeedbackInbox;
  tbInit();
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
async function registerTeacherCode(code, title){
  const list = await getTeacherCodes();
  const ex = list.find(c => c.code === code);
  if (!ex) list.push({ code, createdAt: Date.now(), title: title || '' });
  else if (title) ex.title = title;
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
      <span class="p-name">Código <b>${escapeHtml(c.code)}</b>${c.title ? ' · ' + escapeHtml(c.title) : ''} · ${new Date(c.createdAt).toLocaleDateString('es')}</span>
      <button class="modal-btn" style="padding:6px 12px; font-size:11px;">Ver resultados ▶</button>`);
    row.querySelector('button').addEventListener('click', () => showTeacherResults(c.code));
    box.appendChild(row);
  });
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

/* Las actividades antiguas solo tenían "questions" (opción múltiple); se convierten al formato nuevo */
function classItems(payload){
  if (payload.items && payload.items.length) return payload.items;
  return (payload.questions || []).map(q => ({ kind:'mc', q:q.q, options:q.options, correct:q.correct, explain:'' }));
}

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
    payload.items = classItems(payload);
    if (!payload.items.length){ status.textContent = 'Esa actividad no tiene ejercicios.'; return; }
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
    <h2 style="text-align:center;">${st.payload.title ? escapeHtml(st.payload.title) : 'Actividad'} · ${escapeHtml(st.payload.teacher)}</h2>
    <p class="level-hint" style="text-align:center;">${st.payload.items.length} ejercicio${st.payload.items.length === 1 ? '' : 's'}</p>
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
    doc.attempts.push({ ts: Date.now(), correct: st.correct, total: st.payload.items.length, answers: st.answers });
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
  const items = st.payload.items;
  if (st.index >= items.length){
    if (!st.rewarded){
      st.rewarded = true;
      st.coinsEarned = Math.min(st.correct * 8, 40);
      State.coins += st.coinsEarned;
      recordActivity('side', 'class-' + st.code, st.correct >= Math.ceil(items.length / 2), st.correct * 10, 0, st.coinsEarned);
      saveProgress();
    }
    wrap.innerHTML = `
      <h2>¡Actividad completa!</h2>
      <p>${escapeHtml(State.realName ? State.realName.first : '')}, acertaste ${st.correct} de ${items.length}. Ganaste 🪙 ${st.coinsEarned} monedas.</p>
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

  const item = items[st.index];
  st.locked = false;
  const kinfo = (typeof T_KINDS !== 'undefined' && T_KINDS[item.kind]) ? T_KINDS[item.kind] : { icon:'🔘', label:'Pregunta' };
  const title = item.kind === 'classify'
    ? `<div class="cq-prompt">${escapeHtml(item.prompt || 'Clasifica')}</div><div class="cq-term">${escapeHtml(item.term)}</div>`
    : `<div class="quiz-question">${escapeHtml(item.q)}</div>`;
  wrap.innerHTML = `
    <p class="level-hint">Ejercicio ${st.index + 1} / ${items.length} · ${escapeHtml(st.payload.title || 'Actividad')} de ${escapeHtml(st.payload.teacher)}</p>
    <div class="cq-kind">${kinfo.icon} ${kinfo.label}</div>
    <div class="quiz-card cq-card">${title}</div>
    <div id="classBody"></div>
    <div id="classFeedback"></div>
  `;
  if (item.kind === 'order') classRenderOrder(item);
  else if (item.kind === 'match') classRenderMatch(item);
  else classRenderChoice(item);
}

/* Muestra si acertó, la explicación y el botón para continuar */
function classAnswer(item, ok, chosen, right, extraMsg){
  const st = classQuizState;
  if (st.locked) return;
  st.locked = true;
  if (ok){ st.correct++; beep('correct'); }
  else { recordMistake('actividad', item.q); beep('wrong'); }
  st.answers.push({ q: item.q, ok: !!ok, chosen: String(chosen), right: String(right) });
  const last = st.index + 1 >= st.payload.items.length;
  const fb = $('#classFeedback');
  fb.innerHTML = `
    <div class="cq-feedback ${ok ? 'ok' : 'bad'}">
      <b>${ok ? '✅ ¡Correcto!' : '❌ No es correcto.'}</b>
      ${!ok && item.kind !== 'order' && item.kind !== 'match' ? ' La respuesta correcta es: <b>' + escapeHtml(right) + '</b>.' : ''}
      ${!ok && item.kind === 'order' ? '<div class="cq-right">Orden correcto: ' + item.steps.map((x, i) => (i + 1) + '. ' + escapeHtml(x)).join('<br>') + '</div>' : ''}
      ${extraMsg ? '<div>' + escapeHtml(extraMsg) + '</div>' : ''}
      ${item.explain ? '<div class="cq-explain">💡 ' + escapeHtml(item.explain) + '</div>' : ''}
    </div>
    <button class="modal-btn primary" id="classNext">${last ? 'Ver resultado ▶' : 'Siguiente ▶'}</button>`;
  $('#classNext').addEventListener('click', () => { st.index++; classQuizRender(); });
  fb.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* Opción múltiple, verdadero/falso y clasificar */
function classRenderChoice(item){
  const raw = item.options.map((text, i) => ({ text, correct: i === item.correct }));
  const order = item.kind === 'mc' ? shuffle(raw) : raw;   // V/F y categorías mantienen su orden
  const box = $('#classBody');
  box.className = 'quiz-options' + (item.kind === 'classify' || item.kind === 'vf' ? ' cq-row' : '');
  const rightText = item.options[item.correct];
  order.forEach(opt => {
    const btn = el('button', 'quiz-opt', escapeHtml(opt.text));
    btn.addEventListener('click', () => {
      if (classQuizState.locked) return;
      $$('.quiz-opt', box).forEach(b => b.disabled = true);
      $$('.quiz-opt', box).forEach((b, i) => { if (order[i].correct) b.classList.add('correct'); });
      if (!opt.correct) btn.classList.add('wrong');
      classAnswer(item, opt.correct, opt.text, rightText);
    });
    box.appendChild(btn);
  });
}

/* Ordenar pasos: toca los bloques en el orden correcto y pulsa Comprobar */
function classRenderOrder(item){
  const box = $('#classBody');
  const correct = item.steps;
  const pool = shuffle(correct.map(t => ({ t })));
  let placed = [];
  const draw = () => {
    box.innerHTML = `
      <p class="level-hint" style="margin:0 0 6px;">Toca los pasos en el orden correcto. Toca un paso colocado para devolverlo.</p>
      <div class="cq-slots">${correct.map((_, i) => placed[i]
        ? `<div class="cq-slot filled" data-i="${i}"><span class="cq-n">${i + 1}</span>${escapeHtml(placed[i].t)}</div>`
        : `<div class="cq-slot"><span class="cq-n">${i + 1}</span><em>Vacío</em></div>`).join('')}</div>
      <div class="cq-tray">${pool.filter(p => placed.indexOf(p) < 0).map(p => `<button class="cq-chip" data-k="${pool.indexOf(p)}">${escapeHtml(p.t)}</button>`).join('')}</div>
      <button class="modal-btn primary" id="cqCheck" ${placed.length < correct.length ? 'disabled' : ''}>▶ Comprobar</button>`;
    $$('.cq-chip', box).forEach(b => b.addEventListener('click', () => { placed.push(pool[+b.dataset.k]); beep('click'); draw(); }));
    $$('.cq-slot.filled', box).forEach(b => b.addEventListener('click', () => { placed.splice(+b.dataset.i, 1); draw(); }));
    $('#cqCheck').addEventListener('click', () => {
      const ok = placed.every((p, i) => p.t === correct[i]);
      $$('.cq-slot', box).forEach((sl, i) => sl.classList.add(placed[i].t === correct[i] ? 'good' : 'badslot'));
      $$('.cq-slot.filled', box).forEach(n => n.replaceWith(n.cloneNode(true)));   // bloquea clics
      $('#cqCheck').disabled = true;
      classAnswer(item, ok, placed.map(p => p.t).join(' → '), correct.join(' → '));
    });
  };
  draw();
}

/* Unir parejas: toca un término y luego su definición */
function classRenderMatch(item){
  const box = $('#classBody');
  const pairs = item.pairs;
  const defs = shuffle(pairs.map((p, i) => ({ d: p[1], i })));
  box.innerHTML = `
    <p class="level-hint" style="margin:0 0 6px;">Toca un término y luego la definición que le corresponde.</p>
    <div class="cq-match">
      <div class="cq-col">${pairs.map((p, i) => `<button class="cq-m cq-mt" data-i="${i}">${escapeHtml(p[0])}</button>`).join('')}</div>
      <div class="cq-col">${defs.map(d => `<button class="cq-m cq-md" data-i="${d.i}">${escapeHtml(d.d)}</button>`).join('')}</div>
    </div>`;
  let sel = null, done = 0, mistakes = 0;
  $$('.cq-mt', box).forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('matched') || classQuizState.locked) return;
    $$('.cq-mt', box).forEach(x => x.classList.remove('selected'));
    b.classList.add('selected'); sel = b;
  }));
  $$('.cq-md', box).forEach(b => b.addEventListener('click', () => {
    if (!sel || b.classList.contains('matched') || classQuizState.locked) return;
    if (sel.dataset.i === b.dataset.i){
      sel.classList.remove('selected'); sel.classList.add('matched'); b.classList.add('matched');
      sel = null; done++; beep('correct');
      if (done === pairs.length){
        classAnswer(item, mistakes === 0,
          mistakes === 0 ? 'Sin errores' : mistakes + ' error' + (mistakes === 1 ? '' : 'es'),
          pairs.map(p => p[0] + ' = ' + p[1]).join('; '),
          mistakes === 0 ? '' : 'Completaste las parejas, pero con ' + mistakes + ' error' + (mistakes === 1 ? '' : 'es') + '.');
      }
    } else {
      mistakes++; beep('wrong');
      const t = sel; sel.classList.remove('selected'); sel = null;
      t.classList.add('wrongflash'); b.classList.add('wrongflash');
      setTimeout(() => { t.classList.remove('wrongflash'); b.classList.remove('wrongflash'); }, 350);
    }
  }));
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
      ${act ? '<p class="level-hint" style="margin:0 0 10px;">' + (act.title ? escapeHtml(act.title) + ' · ' : '') + classItems(act).length + ' ejercicios · creada el ' + new Date(act.createdAt).toLocaleDateString('es') + '</p>' : ''}
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
