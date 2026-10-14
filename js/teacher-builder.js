/* =========================================================
   CONSTRUCTOR DE ACTIVIDADES (panel del profesor)
   1) Elegir un tema (12 temas) o empezar desde cero.
   2) Marcar preguntas del banco predeterminado del tema.
   3) Agregar preguntas propias de 5 tipos distintos.
   4) Guardar con un código de clase.
   Depende de teacher-bank.js (TEACHER_TOPICS, T_KINDS).
   ========================================================= */
const TB_MAX_ITEMS = 25;
let tb = null;

function tbInit(){
  tb = { topic: null, items: [], title: '', code: randomClassCode() };
  tbRender();
}

function tbUid(){ return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
function tbShort(s, n){ s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* Texto corto que describe un ejercicio en las listas */
function tbItemText(it){
  if (it.kind === 'classify') return `${it.prompt}: ${it.term}  (${it.options.join(' / ')})`;
  if (it.kind === 'order') return `${it.q}  (${it.steps.length} pasos)`;
  if (it.kind === 'match') return `${it.q}  (${it.pairs.length} parejas)`;
  return it.q;
}
function tbBadge(kind){ const k = T_KINDS[kind] || { label:kind }; return `<span class="tb-badge tb-${kind}">${k.label}</span>`; }

/* Guarda lo escrito en los campos antes de volver a dibujar la pantalla */
function tbSync(){
  const t = $('#tbTitle'), c = $('#tbCode');
  if (t) tb.title = t.value;
  if (c) tb.code = c.value;
}

function tbRender(){
  const box = $('#teacherBuilder');
  if (!box) return;
  const topic = tb.topic ? teacherTopicById(tb.topic) : null;
  const selIds = new Set(tb.items.map(x => x.id));
  const head = (n, t, d) => `<div class="tb-step-head"><span class="tb-step-n">${n}</span><div><div class="tb-step-t">${t}</div><div class="tb-step-d">${d}</div></div></div>`;

  const topicCards = TEACHER_TOPICS.map(t => `
    <button class="tb-topic ${tb.topic === t.id ? 'on' : ''}" data-topic="${t.id}">
      <span class="tb-topic-name">${escapeHtml(t.name)}</span>
      <span class="tb-topic-desc">${escapeHtml(t.desc)}</span>
      <span class="tb-topic-n">${t.items.length} ejercicios</span>
    </button>`).join('');

  const bankHtml = topic ? `
    <div class="online-panel tb-bank">
      ${head(2, 'Elige los ejercicios de: ' + escapeHtml(topic.name), 'Marca los que quieras usar. Luego podrás ordenarlos o editarlos.')}
      <div class="tb-bank-actions">
        <button class="modal-btn" id="tbAll">Elegir todos</button>
        <button class="modal-btn" id="tbRand5">5 al azar</button>
        <button class="modal-btn" id="tbRand10">10 al azar</button>
        <button class="modal-btn" id="tbNone">Quitar los de este tema</button>
      </div>
      <div class="tb-bank-list">
        ${topic.items.map(it => `
          <label class="tb-row ${selIds.has(it.id) ? 'sel' : ''}">
            <input type="checkbox" data-id="${it.id}" ${selIds.has(it.id) ? 'checked' : ''}>
            <span class="tb-row-main">${tbBadge(it.kind)}<span class="tb-row-text">${escapeHtml(tbItemText(it))}</span></span>
          </label>`).join('')}
      </div>
    </div>` : '';

  const addBtns = Object.keys(T_KINDS).map(k => `<button class="modal-btn tb-add-btn" data-add="${k}">${T_KINDS[k].label}</button>`).join('');

  const selHtml = tb.items.length ? tb.items.map((it, i) => `
    <div class="tb-sel">
      <span class="tb-sel-n">${i + 1}</span>
      <span class="tb-row-main">${tbBadge(it.kind)}<span class="tb-row-text">${escapeHtml(tbItemText(it))}</span></span>
      <span class="tb-sel-btns">
        <button class="tb-mini" data-up="${i}" ${i === 0 ? 'disabled' : ''}>Subir</button>
        <button class="tb-mini" data-down="${i}" ${i === tb.items.length - 1 ? 'disabled' : ''}>Bajar</button>
        ${it.kind !== 'classify' ? `<button class="tb-mini" data-edit="${i}">Editar</button>` : ''}
        <button class="tb-mini del" data-del="${i}">Quitar</button>
      </span>
    </div>`).join('') : '<p class="tb-empty">Todavía no hay ejercicios. Elige un tema o agrega uno propio.</p>';

  box.innerHTML = `
    <div class="online-panel">
      ${head(1, 'Elige un tema', 'Usa ejercicios ya preparados o crea los tuyos desde cero. Puedes mezclar ambas cosas.')}
      <div class="tb-topics">
        ${topicCards}
        <button class="tb-topic scratch" id="tbScratch">
          <span class="tb-topic-name">Crear desde cero</span>
          <span class="tb-topic-desc">Escribe tus propios ejercicios, sin usar el banco.</span>
          <span class="tb-topic-n">Personalizado</span>
        </button>
      </div>
    </div>
    ${bankHtml}
    <div class="online-panel tb-mine" id="tbMine">
      ${head(topic ? 3 : 2, 'Arma tu actividad', 'Revisa el orden, agrega ejercicios propios y guarda con un código de clase.')}
      <div class="teacher-form">
        <label class="profile-label">NOMBRE DE LA ACTIVIDAD (OPCIONAL)</label>
        <input type="text" id="tbTitle" class="profile-input" maxlength="60" placeholder="Ej.: Repaso de hardware" value="${escapeHtml(tb.title)}">
        <label class="profile-label">CÓDIGO DE CLASE</label>
        <input type="text" id="tbCode" class="profile-input" maxlength="8" value="${escapeHtml(tb.code)}" style="text-transform:uppercase;">
      </div>
      <div class="tb-list-head"><span>EJERCICIOS ELEGIDOS</span><span>${tb.items.length} / ${TB_MAX_ITEMS}</span></div>
      <div class="tb-sel-list">${selHtml}</div>
      <div class="tb-list-head" style="margin-top:14px;"><span>AGREGAR UN EJERCICIO PROPIO</span></div>
      <div class="tb-add">${addBtns}</div>
      <button class="modal-btn primary profile-save-btn" id="tbSave" style="margin-top:16px;">Guardar actividad ▶</button>
      <p class="level-hint" id="tbStatus"></p>
    </div>`;

  /* --- eventos --- */
  $$('.tb-topic[data-topic]', box).forEach(b => b.addEventListener('click', () => {
    tbSync(); tb.topic = b.dataset.topic; tbRender();
    const bank = $('.tb-bank'); if (bank) bank.scrollIntoView({ behavior:'smooth', block:'start' });
  }));
  $('#tbScratch').addEventListener('click', () => {
    tbSync(); tb.topic = null; tbRender();
    const m = $('#tbMine'); if (m) m.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  if (topic){
    $$('.tb-bank-list input[type=checkbox]', box).forEach(cb => cb.addEventListener('change', () => {
      tbSync();
      const it = topic.items.find(x => x.id === cb.dataset.id);
      if (!it) return;
      if (cb.checked){
        if (tb.items.length >= TB_MAX_ITEMS){ cb.checked = false; tbStatus(`Máximo ${TB_MAX_ITEMS} ejercicios por actividad.`); return; }
        tb.items.push(teacherCloneItem(it));
      } else {
        tb.items = tb.items.filter(x => x.id !== it.id);
      }
      tbRender();
    }));
    $('#tbAll').addEventListener('click', () => { tbSync(); tbAddFromTopic(topic, topic.items.length); });
    $('#tbRand5').addEventListener('click', () => { tbSync(); tbAddFromTopic(topic, 5); });
    $('#tbRand10').addEventListener('click', () => { tbSync(); tbAddFromTopic(topic, 10); });
    $('#tbNone').addEventListener('click', () => { tbSync(); tb.items = tb.items.filter(x => x.topic !== topic.id || !topic.items.some(b => b.id === x.id)); tbRender(); });
  }

  $$('[data-up]', box).forEach(b => b.addEventListener('click', () => { tbSync(); const i = +b.dataset.up; [tb.items[i - 1], tb.items[i]] = [tb.items[i], tb.items[i - 1]]; tbRender(); }));
  $$('[data-down]', box).forEach(b => b.addEventListener('click', () => { tbSync(); const i = +b.dataset.down; [tb.items[i + 1], tb.items[i]] = [tb.items[i], tb.items[i + 1]]; tbRender(); }));
  $$('[data-del]', box).forEach(b => b.addEventListener('click', () => { tbSync(); tb.items.splice(+b.dataset.del, 1); tbRender(); }));
  $$('[data-edit]', box).forEach(b => b.addEventListener('click', () => { tbSync(); tbOpenEditor(tb.items[+b.dataset.edit].kind, +b.dataset.edit); }));
  $$('.tb-add-btn', box).forEach(b => b.addEventListener('click', () => { tbSync(); tbOpenEditor(b.dataset.add, null); }));
  $('#tbSave').addEventListener('click', () => { tbSync(); tbSave(); });
}

function tbStatus(msg){ const s = $('#tbStatus'); if (s) s.textContent = msg; }

/* Agrega n ejercicios del tema (al azar) que todavía no estén elegidos */
function tbAddFromTopic(topic, n){
  const have = new Set(tb.items.map(x => x.id));
  const free = shuffle(topic.items.filter(it => !have.has(it.id)));
  const room = TB_MAX_ITEMS - tb.items.length;
  const take = free.slice(0, Math.min(n, room));
  take.forEach(it => tb.items.push(teacherCloneItem(it)));
  tbRender();
  if (take.length < Math.min(n, free.length)) tbStatus(`Máximo ${TB_MAX_ITEMS} ejercicios por actividad.`);
}

/* ---------------------------------------------------------
   Editores (ventana emergente) para cada tipo de ejercicio
   --------------------------------------------------------- */
function tbEditorShell(title, bodyHtml){
  showModal(`
    <h2 style="margin-bottom:6px;">${title}</h2>
    <div class="teacher-form tb-editor">${bodyHtml}
      <div class="profile-error hidden" id="edErr"></div>
      <div class="modal-actions">
        <button class="modal-btn" id="edCancel">Cancelar</button>
        <button class="modal-btn primary" id="edSave">Guardar ejercicio</button>
      </div>
    </div>`);
  $('#edCancel').onclick = hideModal;
}
function tbEdErr(msg){ const e = $('#edErr'); e.textContent = msg; e.classList.remove('hidden'); }
function tbVal(sel){ const n = $(sel); return n ? n.value.trim() : ''; }
function tbPutItem(idx, item){
  if (idx != null){ item.id = tbUid(); tb.items[idx] = item; }
  else { if (tb.items.length >= TB_MAX_ITEMS){ tbEdErr(`Máximo ${TB_MAX_ITEMS} ejercicios por actividad.`); return false; } item.id = tbUid(); tb.items.push(item); }
  hideModal(); tbRender();
  const m = $('#tbMine'); if (m) m.scrollIntoView({ behavior:'smooth', block:'start' });
  return true;
}

function tbOpenEditor(kind, idx){
  const cur = idx != null ? tb.items[idx] : null;
  if (kind === 'mc') return tbEditMC(cur, idx);
  if (kind === 'vf') return tbEditVF(cur, idx);
  if (kind === 'classify') return tbEditClassify();
  if (kind === 'order') return tbEditOrder(cur, idx);
  if (kind === 'match') return tbEditMatch(cur, idx);
}

function tbEditMC(cur, idx){
  const opts = cur ? cur.options : ['', '', '', ''];
  const rows = [0, 1, 2, 3].map(i => `
    <div class="teacher-option-row">
      <input type="radio" name="edCorrect" value="${i}" ${(cur ? cur.correct : 0) === i ? 'checked' : ''}>
      <input type="text" class="profile-input ed-opt" placeholder="Opción ${i + 1}${i === 0 ? ' (marca la correcta con el círculo)' : ''}" value="${escapeHtml(opts[i] || '')}">
    </div>`).join('');
  tbEditorShell('Opción múltiple', `
    <label class="profile-label">PREGUNTA</label>
    <input type="text" id="edQ" class="profile-input" maxlength="200" placeholder="Escribe la pregunta" value="${escapeHtml(cur ? cur.q : '')}">
    ${rows}
    <label class="profile-label">EXPLICACIÓN (OPCIONAL, SE MUESTRA AL RESPONDER)</label>
    <input type="text" id="edExp" class="profile-input" maxlength="240" value="${escapeHtml(cur ? cur.explain || '' : '')}">`);
  $('#edSave').onclick = () => {
    const q = tbVal('#edQ');
    const options = $$('.ed-opt').map(i => i.value.trim());
    if (!q || options.some(o => !o)) return tbEdErr('Escribe la pregunta y las 4 opciones.');
    if (new Set(options.map(o => o.toLowerCase())).size < 4) return tbEdErr('Las 4 opciones deben ser distintas.');
    const c = $('input[name=edCorrect]:checked');
    tbPutItem(idx, { kind:'mc', q, options, correct: c ? Number(c.value) : 0, explain: tbVal('#edExp') });
  };
}

function tbEditVF(cur, idx){
  tbEditorShell('Verdadero o falso', `
    <label class="profile-label">AFIRMACIÓN</label>
    <input type="text" id="edQ" class="profile-input" maxlength="200" placeholder="Ej.: La RAM guarda archivos de forma permanente." value="${escapeHtml(cur ? cur.q : '')}">
    <label class="profile-label">¿ES VERDADERA O FALSA?</label>
    <div class="teacher-option-row"><input type="radio" name="edTF" value="0" ${!cur || cur.correct === 0 ? 'checked' : ''}> <span>Verdadera</span></div>
    <div class="teacher-option-row"><input type="radio" name="edTF" value="1" ${cur && cur.correct === 1 ? 'checked' : ''}> <span>Falsa</span></div>
    <label class="profile-label">EXPLICACIÓN (OPCIONAL)</label>
    <input type="text" id="edExp" class="profile-input" maxlength="240" value="${escapeHtml(cur ? cur.explain || '' : '')}">`);
  $('#edSave').onclick = () => {
    const q = tbVal('#edQ');
    if (!q) return tbEdErr('Escribe la afirmación.');
    const c = $('input[name=edTF]:checked');
    tbPutItem(idx, { kind:'vf', q, options:['Verdadero', 'Falso'], correct: c ? Number(c.value) : 0, explain: tbVal('#edExp') });
  };
}

function tbEditClassify(){
  tbEditorShell('Clasificar', `
    <p class="level-hint" style="margin:0;">El estudiante verá un elemento a la vez y deberá elegir su categoría. Cada elemento cuenta como un ejercicio.</p>
    <label class="profile-label">INSTRUCCIÓN</label>
    <input type="text" id="edQ" class="profile-input" maxlength="120" placeholder="Ej.: ¿Hardware o software?">
    <div class="tb-cats">
      ${[0, 1, 2].map(i => `
        <div class="tb-cat">
          <input type="text" class="profile-input ed-cat" maxlength="30" placeholder="Categoría ${i + 1}${i === 2 ? ' (opcional)' : ''}">
          <textarea class="profile-input ed-terms" rows="5" placeholder="Un elemento por línea"></textarea>
        </div>`).join('')}
    </div>`);
  $('#edSave').onclick = () => {
    const prompt = tbVal('#edQ') || 'Clasifica';
    const names = $$('.ed-cat').map(i => i.value.trim());
    const lists = $$('.ed-terms').map(t => t.value.split('\n').map(s => s.trim()).filter(Boolean));
    const cats = [], groups = [];
    names.forEach((n, i) => { if (n){ cats.push(n); groups.push(lists[i]); } });
    if (cats.length < 2) return tbEdErr('Escribe al menos 2 categorías.');
    if (groups.some(g => !g.length)) return tbEdErr('Cada categoría necesita al menos un elemento.');
    const out = [];
    groups.forEach((g, c) => g.forEach(term => out.push({ kind:'classify', prompt, term, q: prompt + ': ' + term, options: cats.slice(), correct: c, explain: term + ': ' + cats[c] + '.', id: tbUid() })));
    const room = TB_MAX_ITEMS - tb.items.length;
    if (!room) return tbEdErr(`Máximo ${TB_MAX_ITEMS} ejercicios por actividad.`);
    out.slice(0, room).forEach(x => tb.items.push(x));
    hideModal(); tbRender();
    if (out.length > room) tbStatus(`Se agregaron ${room} elementos (máximo ${TB_MAX_ITEMS}).`);
  };
}

function tbEditOrder(cur, idx){
  tbEditorShell('Ordenar pasos', `
    <label class="profile-label">INSTRUCCIÓN</label>
    <input type="text" id="edQ" class="profile-input" maxlength="160" placeholder="Ej.: Ordena los pasos para encender una PC." value="${escapeHtml(cur ? cur.q : '')}">
    <label class="profile-label">PASOS EN EL ORDEN CORRECTO (UNO POR LÍNEA, DE 3 A 7)</label>
    <textarea id="edSteps" class="profile-input" rows="7" placeholder="Primer paso&#10;Segundo paso&#10;Tercer paso">${escapeHtml(cur ? cur.steps.join('\n') : '')}</textarea>
    <p class="level-hint" style="margin:0;">Al estudiante se le mostrarán mezclados.</p>
    <label class="profile-label">EXPLICACIÓN (OPCIONAL)</label>
    <input type="text" id="edExp" class="profile-input" maxlength="240" value="${escapeHtml(cur ? cur.explain || '' : '')}">`);
  $('#edSave').onclick = () => {
    const q = tbVal('#edQ');
    const steps = $('#edSteps').value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!q) return tbEdErr('Escribe la instrucción.');
    if (steps.length < 3 || steps.length > 7) return tbEdErr('Escribe entre 3 y 7 pasos, uno por línea.');
    tbPutItem(idx, { kind:'order', q, steps, explain: tbVal('#edExp') });
  };
}

function tbEditMatch(cur, idx){
  const pairs = cur ? cur.pairs : [];
  const rows = [0, 1, 2, 3, 4, 5].map(i => `
    <div class="tb-pair">
      <input type="text" class="profile-input ed-a" maxlength="50" placeholder="Término ${i + 1}${i > 2 ? ' (opcional)' : ''}" value="${escapeHtml((pairs[i] || [])[0] || '')}">
      <span class="tb-pair-sep">con</span>
      <input type="text" class="profile-input ed-b" maxlength="80" placeholder="Definición ${i + 1}" value="${escapeHtml((pairs[i] || [])[1] || '')}">
    </div>`).join('');
  tbEditorShell('Unir parejas', `
    <label class="profile-label">INSTRUCCIÓN</label>
    <input type="text" id="edQ" class="profile-input" maxlength="160" placeholder="Ej.: Une cada componente con su función." value="${escapeHtml(cur ? cur.q : '')}">
    <label class="profile-label">PAREJAS (DE 3 A 6)</label>
    ${rows}
    <label class="profile-label">EXPLICACIÓN (OPCIONAL)</label>
    <input type="text" id="edExp" class="profile-input" maxlength="240" value="${escapeHtml(cur ? cur.explain || '' : '')}">`);
  $('#edSave').onclick = () => {
    const q = tbVal('#edQ');
    const a = $$('.ed-a').map(i => i.value.trim()), b = $$('.ed-b').map(i => i.value.trim());
    const ps = [];
    for (let i = 0; i < a.length; i++){
      if (a[i] && b[i]) ps.push([a[i], b[i]]);
      else if (a[i] || b[i]) return tbEdErr(`La pareja ${i + 1} está incompleta.`);
    }
    if (!q) return tbEdErr('Escribe la instrucción.');
    if (ps.length < 3) return tbEdErr('Necesitas al menos 3 parejas completas.');
    if (new Set(ps.map(p => p[0].toLowerCase())).size < ps.length) return tbEdErr('Los términos no pueden repetirse.');
    tbPutItem(idx, { kind:'match', q, pairs: ps, explain: tbVal('#edExp') });
  };
}

/* ---------------------------------------------------------
   Guardar la actividad en el almacenamiento compartido
   --------------------------------------------------------- */
function tbCleanItem(it){
  const o = JSON.parse(JSON.stringify(it));
  delete o.id; delete o.topic;
  return o;
}

async function tbSave(){
  const code = (tb.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 3){ tbStatus('El código debe tener entre 3 y 8 letras o números.'); return; }
  if (!tb.items.length){ tbStatus('Agrega al menos un ejercicio antes de guardar.'); return; }
  tbStatus('Guardando...');
  try {
    if (!AppStorage) throw new Error('sin storage');
    const me = State.profile ? State.profile.name : 'Profesor/a';
    /* No pisar el código de otro profesor */
    try {
      const ex = await AppStorage.get('class:' + code, true);
      if (ex && ex.value){
        const old = JSON.parse(ex.value);
        if (old.teacher && old.teacher !== me){ tbStatus(`El código "${code}" ya lo usa otro profesor/a. Elige uno diferente.`); return; }
      }
    } catch (e) {}
    const payload = {
      version: 2,
      teacher: me,
      title: (tb.title || '').trim(),
      topic: tb.topic || null,
      items: tb.items.map(tbCleanItem),
      createdAt: Date.now(),
    };
    await AppStorage.set('class:' + code, JSON.stringify(payload), true);
    /* Rótulo del tema: uno solo, varios o personalizada */
    const tIds = new Set(tb.items.map(x => x.topic || 'propio'));
    let tName = 'Personalizada';
    if (tIds.size === 1 && !tIds.has('propio')){ const t1 = teacherTopicById([...tIds][0]); tName = t1 ? t1.name : tName; }
    else if (tIds.size > 1) tName = 'Varios temas';
    await registerTeacherCode(code, payload.title, payload.items.length, tName);
    tbInit();
    tpTab('mine');
    loadTeacherClasses(`Actividad guardada. Comparte el código ${code} con tus estudiantes.`);
  } catch (e) {
    tbStatus('No se pudo guardar (esto funciona cuando el juego corre dentro de Claude o con conexión). Inténtalo de nuevo.');
  }
}
