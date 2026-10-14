/* =========================================================
   PANEL DEL PROFESOR — crea actividades en pocos pasos:
   1) elige un TEMA (12 temas del videojuego, o "desde cero")
   2) elige el TIPO (opción múltiple, verdadero/falso, relacionar,
      ordenar pasos, clasificar)
   3) marca las preguntas listas del banco y/o agrega las tuyas
   4) publica y comparte el código de clase.
   Cada actividad queda guardada con un código; los alumnos la
   juegan desde "Código de clase" y envían sus resultados.
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
      <h3 class="prog-h">⚡ Crear una actividad</h3>
      <p class="level-hint" style="margin:0 0 10px;">Elige un tema, un tipo de actividad y las preguntas listas del banco (o agrega las tuyas). En menos de un minuto tendrás un código para tus alumnos.</p>
      <button class="modal-btn primary profile-save-btn" id="teacherNewBtn">➕ Crear actividad nueva</button>
    </div>
    <div class="online-panel" id="teacherMyClasses">
      <h3 class="prog-h">📊 Tus actividades y resultados</h3>
      <p class="level-hint" id="teacherClassesMsg">Cargando…</p>
      <div id="teacherClassesList"></div>
    </div>
    <div class="online-panel">
      <button class="modal-btn" id="teacherFeedbackBtn">💬 Ver opiniones de los usuarios</button>
    </div>
  `;
  $('#teacherNewBtn').onclick = twStart;
  const fbBtn = $('#teacherFeedbackBtn'); if (fbBtn) fbBtn.onclick = showFeedbackInbox;
  loadTeacherClasses();
}

/* ---------- Índice de actividades del profesor ---------- */
function teacherIndexKey(){ return 'teachercodes:' + slugifyProfileName(State.profile ? State.profile.name : 'profesor'); }
async function getTeacherCodes(){
  try {
    const r = await AppStorage.get(teacherIndexKey(), true);
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return [];
}
async function saveTeacherCodes(list){ try { await AppStorage.set(teacherIndexKey(), JSON.stringify(list), true); } catch (e) {} }
async function registerTeacherCode(code, meta){
  const list = await getTeacherCodes();
  const i = list.findIndex(c => c.code === code);
  const entry = Object.assign({ code, createdAt: Date.now() }, i >= 0 ? list[i] : {}, meta || {});
  if (i >= 0) list[i] = entry; else list.push(entry);
  await saveTeacherCodes(list);
}
async function loadTeacherClasses(){
  const msg = $('#teacherClassesMsg'), box = $('#teacherClassesList');
  if (!msg || !box) return;
  const list = await getTeacherCodes();
  if (!list.length){ msg.textContent = 'Aún no has creado actividades. ¡Crea la primera con el botón de arriba!'; box.innerHTML = ''; return; }
  msg.textContent = 'Toca una actividad para ver cómo les fue a tus estudiantes.';
  box.innerHTML = '';
  list.slice().reverse().forEach(c => {
    const t = ACT_TYPES[c.type || 'quiz'];
    const row = el('div', 'online-player-row', `
      <span class="p-name">${t ? t.icon : '📝'} <b>${escapeHtml(c.title || 'Actividad')}</b><br><small style="color:var(--text-dim)">Código <b>${escapeHtml(c.code)}</b> · ${new Date(c.createdAt).toLocaleDateString('es')}${c.count ? ' · ' + c.count + ' ítems' : ''}</small></span>
      <span style="display:flex; gap:6px;">
        <button class="modal-btn" data-act="res" style="padding:6px 12px; font-size:11px;">Resultados ▶</button>
        <button class="modal-btn" data-act="del" style="padding:6px 10px; font-size:11px;" title="Eliminar">🗑</button>
      </span>`);
    row.querySelector('[data-act="res"]').onclick = () => showTeacherResults(c.code);
    row.querySelector('[data-act="del"]').onclick = () => {
      showModal(`<h2>¿Eliminar la actividad?</h2><p>Se borrará el código <b>${escapeHtml(c.code)}</b>. Los resultados ya enviados no se borran.</p>
        <div class="modal-actions"><button class="modal-btn" id="delNo">Cancelar</button><button class="modal-btn primary" id="delYes">Eliminar</button></div>`);
      $('#delNo').onclick = hideModal;
      $('#delYes').onclick = async () => {
        hideModal();
        try { await AppStorage.remove('class:' + c.code, true); } catch (e) {}
        await saveTeacherCodes((await getTeacherCodes()).filter(x => x.code !== c.code));
        loadTeacherClasses();
      };
    };
    box.appendChild(row);
  });
}

/* =========================================================
   ASISTENTE PARA CREAR ACTIVIDADES (profesor)
   ========================================================= */
let tw = null;   // estado del asistente
function twStart(){
  tw = { topic:null, type:null, picked:new Set(), custom:[], cats:['Grupo A', 'Grupo B'], title:'', code:randomClassCode() };
  twTopic();
}
function twHeader(step, title){
  return `<div class="tw-steps">${['Tema', 'Tipo', 'Preguntas', 'Publicar'].map((s, i) => `<span class="${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>
    <h3 class="prog-h" style="margin-top:12px;">${title}</h3>`;
}
function twNav(back, nextLabel, nextId){
  return `<div class="modal-actions" style="margin-top:14px;">
    <button class="modal-btn" id="twBack">${back ? '← Atrás' : '✕ Cancelar'}</button>
    ${nextLabel ? `<button class="modal-btn primary" id="${nextId}">${nextLabel}</button>` : ''}
  </div>`;
}

/* Paso 1: tema */
function twTopic(){
  const wrap = $('#teacherWrap');
  wrap.innerHTML = twHeader(1, '¿Sobre qué tema quieres la actividad?') + `
    <div class="tw-grid">
      ${ACTIVITY_TOPICS.map(t => `<button class="tw-card ${tw.topic === t.id ? 'sel' : ''}" data-t="${t.id}"><span class="tw-ico">${t.icon}</span><b>${t.name}</b></button>`).join('')}
      <button class="tw-card ${tw.topic === 'mezcla' ? 'sel' : ''}" data-t="mezcla"><span class="tw-ico">🧩</span><b>Mezcla de temas</b><small>Preguntas de varios temas</small></button>
      <button class="tw-card ${tw.topic === 'cero' ? 'sel' : ''}" data-t="cero"><span class="tw-ico">✏️</span><b>Crear desde cero</b><small>Solo con tus preguntas</small></button>
    </div>` + twNav(false);
  $('#twBack').onclick = showTeacherPanel;
  $$('.tw-card', wrap).forEach(b => b.onclick = () => {
    if (tw.topic !== b.dataset.t){ tw.picked = new Set(); tw.custom = []; }
    tw.topic = b.dataset.t; twType();
  });
}

function twTopicName(){
  if (tw.topic === 'mezcla') return 'Mezcla de temas';
  if (tw.topic === 'cero') return 'Actividad propia';
  return (ACTIVITY_TOPICS.find(t => t.id === tw.topic) || {}).name || '';
}
/* ¿El banco tiene preguntas de este tipo para el tema elegido? */
function twBankCount(type){
  const count = (t) => type === 'quiz' ? t.mc.length : type === 'tf' ? t.tf.length : type === 'match' ? t.match.length : type === 'order' ? t.order.length : t.classify.items.length;
  if (tw.topic === 'cero') return 0;
  if (tw.topic === 'mezcla') return type === 'classify' ? 0 : ACTIVITY_TOPICS.reduce((n, t) => n + count(t), 0);
  return count(ACTIVITY_TOPICS.find(t => t.id === tw.topic));
}

/* Paso 2: tipo */
function twType(){
  const wrap = $('#teacherWrap');
  wrap.innerHTML = twHeader(2, `Tema: ${twTopicName()} — ¿qué tipo de actividad?`) + `
    <div class="tw-grid tw-types">
      ${Object.keys(ACT_TYPES).map(k => {
        const t = ACT_TYPES[k], n = twBankCount(k);
        return `<button class="tw-card ${tw.type === k ? 'sel' : ''}" data-k="${k}"><span class="tw-ico">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small><em>${n ? n + ' listos en el banco' : 'Tú agregas el contenido'}</em></button>`;
      }).join('')}
    </div>` + twNav(true);
  $('#twBack').onclick = twTopic;
  $$('.tw-card', wrap).forEach(b => b.onclick = () => {
    if (tw.type !== b.dataset.k){ tw.picked = new Set(); tw.custom = []; }
    tw.type = b.dataset.k; twItems(true);
  });
}

/* Lista de ítems del banco para el tema + tipo (con id y texto) */
function twBankItems(){
  const topics = tw.topic === 'mezcla' ? ACTIVITY_TOPICS : tw.topic === 'cero' ? [] : [ACTIVITY_TOPICS.find(t => t.id === tw.topic)];
  const out = [];
  topics.forEach(t => {
    if (tw.type === 'quiz') t.mc.forEach((m, i) => out.push({ id:`${t.id}:q:${i}`, label:m[0], topic:t.name, data:{ q:m[0], options:[m[1], m[2], m[3]], correct:0, e:m[4] } }));
    if (tw.type === 'tf') t.tf.forEach((m, i) => out.push({ id:`${t.id}:f:${i}`, label:m[0], extra:m[1] ? 'Verdadero' : 'Falso', topic:t.name, data:{ s:m[0], a:!!m[1], e:m[2] } }));
    if (tw.type === 'match') t.match.forEach((m, i) => out.push({ id:`${t.id}:m:${i}`, label:`${m[0]}  ↔  ${m[1]}`, topic:t.name, data:{ t:m[0], d:m[1] } }));
    if (tw.type === 'order') t.order.forEach((o, i) => out.push({ id:`${t.id}:o:${i}`, label:`${o.title}: ${o.steps.join(' → ')}`, topic:t.name, data:{ title:o.title, steps:o.steps } }));
    if (tw.type === 'classify' && tw.topic !== 'mezcla') t.classify.items.forEach((m, i) => out.push({ id:`${t.id}:c:${i}`, label:m[0], extra:t.classify.cats[m[1]], topic:t.name, data:{ t:m[0], c:m[1] }, cats:t.classify.cats }));
  });
  return out;
}

/* Paso 3: preguntas */
function twItems(first){
  const wrap = $('#teacherWrap');
  const bank = twBankItems();
  if (first && bank.length){                        // selección inicial sugerida
    const def = tw.type === 'match' || tw.type === 'classify' ? bank.length : tw.type === 'order' ? 1 : Math.min(5, bank.length);
    tw.picked = new Set(bank.slice(0, def).map(b => b.id));
  }
  const classifyCats = tw.type === 'classify' && bank.length ? bank[0].cats : null;
  const total = tw.picked.size + tw.custom.length;
  const T = ACT_TYPES[tw.type];
  wrap.innerHTML = twHeader(3, `${T.icon} ${T.name} — ${twTopicName()}`) + `
    ${bank.length ? `
    <div class="online-panel">
      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px;">
        <b style="font-size:13px;">Del banco (${bank.length})</b>
        <button class="modal-btn" id="twAll" style="padding:6px 10px; font-size:11px;">Todas</button>
        <button class="modal-btn" id="twNone" style="padding:6px 10px; font-size:11px;">Ninguna</button>
        <button class="modal-btn" id="twRand" style="padding:6px 10px; font-size:11px;">🎲 Al azar</button>
        <select id="twRandN" class="online-activity-select" style="width:auto; margin:0; padding:6px 8px;">${[3, 5, 8, 10].map(n => `<option value="${n}" ${n === 5 ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      ${classifyCats ? `<p class="level-hint" style="margin:0 0 6px;">Grupos: <b>${escapeHtml(classifyCats[0])}</b> / <b>${escapeHtml(classifyCats[1])}</b></p>` : ''}
      <div class="tw-list">
        ${bank.map(b => `<label class="tw-item"><input type="checkbox" data-id="${b.id}" ${tw.picked.has(b.id) ? 'checked' : ''}><span>${escapeHtml(b.label)}${b.extra ? ' <em>(' + escapeHtml(b.extra) + ')</em>' : ''}${tw.topic === 'mezcla' ? ' <small>· ' + escapeHtml(b.topic) + '</small>' : ''}</span></label>`).join('')}
      </div>
    </div>` : `<p class="level-hint">${tw.topic === 'mezcla' && tw.type === 'classify' ? 'En "Mezcla de temas" no hay clasificaciones listas porque cada tema tiene sus propios grupos. Elige un tema, o crea las tuyas.' : 'Escribe tus propios ítems para esta actividad.'}</p>`}
    <div class="online-panel">
      <b style="font-size:13px;">✏️ Agregar lo mío</b>
      <div id="twForm" style="margin-top:8px;">${twCustomForm()}</div>
      <p class="profile-error hidden" id="twErr"></p>
      <button class="modal-btn" id="twAddBtn" style="margin-top:8px;">➕ Agregar a la actividad</button>
      ${tw.custom.length ? `<div class="tw-list" style="margin-top:10px;">${tw.custom.map((c, i) => `<div class="tw-item custom"><span>${escapeHtml(twCustomLabel(c))}</span><button class="modal-btn" data-del="${i}" style="padding:4px 10px; font-size:11px;">✕</button></div>`).join('')}</div>` : ''}
    </div>
    <p class="level-hint" id="twCount"><b>${total}</b> ítem${total === 1 ? '' : 's'} en la actividad.</p>` +
    twNav(true, 'Siguiente ▶', 'twNext');

  $('#twBack').onclick = twType;
  $$('.tw-item input[type=checkbox]', wrap).forEach(cb => cb.onchange = () => {
    if (cb.checked) tw.picked.add(cb.dataset.id); else tw.picked.delete(cb.dataset.id);
    const n = tw.picked.size + tw.custom.length; $('#twCount').innerHTML = `<b>${n}</b> ítem${n === 1 ? '' : 's'} en la actividad.`;
  });
  if ($('#twAll')){
    $('#twAll').onclick = () => { tw.picked = new Set(bank.map(b => b.id)); twItems(); };
    $('#twNone').onclick = () => { tw.picked = new Set(); twItems(); };
    $('#twRand').onclick = () => { const n = +$('#twRandN').value; tw.picked = new Set(shuffle(bank.slice()).slice(0, n).map(b => b.id)); twItems(); };
  }
  $('#twAddBtn').onclick = twAddCustom;
  $$('[data-del]', wrap).forEach(b => b.onclick = () => { tw.custom.splice(+b.dataset.del, 1); twItems(); });
  $('#twNext').onclick = () => {
    const n = tw.picked.size + tw.custom.length;
    const min = tw.type === 'match' ? 3 : tw.type === 'classify' ? 2 : 1;
    const err = $('#twErr');
    if (n < min){ err.textContent = `Elige o agrega al menos ${min} ítem${min > 1 ? 's' : ''}.`; err.classList.remove('hidden'); return; }
    if (tw.type === 'match' && n > 8){ err.textContent = 'Para relacionar, usa como máximo 8 pares.'; err.classList.remove('hidden'); return; }
    if (tw.type === 'classify' && !classifyCats && !tw.custom.length){ err.textContent = 'Agrega tus ítems con sus dos grupos.'; err.classList.remove('hidden'); return; }
    twPublish();
  };
}

function twCustomForm(){
  const t = tw.type;
  if (t === 'quiz') return `
    <input class="profile-input" id="cfQ" placeholder="Escribe la pregunta" maxlength="160">
    ${[0, 1, 2, 3].map(i => `<div class="teacher-option-row"><input type="radio" name="cfCorrect" value="${i}" ${i === 0 ? 'checked' : ''}><input class="profile-input cf-opt" placeholder="Opción ${i + 1}${i === 0 ? ' (marca la correcta con el círculo)' : i > 1 ? ' (opcional)' : ''}" maxlength="90"></div>`).join('')}`;
  if (t === 'tf') return `
    <input class="profile-input" id="cfS" placeholder="Escribe una afirmación" maxlength="160">
    <div class="teacher-option-row"><label><input type="radio" name="cfA" value="1" checked> Verdadera</label>&nbsp;&nbsp;<label><input type="radio" name="cfA" value="0"> Falsa</label></div>
    <input class="profile-input" id="cfE" placeholder="Explicación (opcional)" maxlength="160">`;
  if (t === 'match') return `
    <input class="profile-input" id="cfT" placeholder="Término (ej.: CPU)" maxlength="50">
    <input class="profile-input" id="cfD" placeholder="Definición (ej.: Ejecuta las instrucciones)" maxlength="90">`;
  if (t === 'order') return `
    <input class="profile-input" id="cfTitle" placeholder="Título (ej.: Ordena los pasos para...)" maxlength="100">
    <textarea class="fb-text" id="cfSteps" rows="4" placeholder="Escribe los pasos EN ORDEN CORRECTO, uno por línea (3 a 8 pasos)"></textarea>`;
  const bank = twBankItems();
  const cats = bank.length ? bank[0].cats : tw.cats;
  return `
    <div class="teacher-option-row"><input class="profile-input" id="cfC0" placeholder="Grupo 1 (ej.: Hardware)" maxlength="30" value="${bank.length ? '' : escapeHtml(tw.cats[0] === 'Grupo A' ? '' : tw.cats[0])}"><input class="profile-input" id="cfC1" placeholder="Grupo 2 (ej.: Software)" maxlength="30" value="${bank.length ? '' : escapeHtml(tw.cats[1] === 'Grupo B' ? '' : tw.cats[1])}"></div>
    ${bank.length ? '<p class="level-hint" style="margin:4px 0;">Tus ítems irán a estos mismos grupos: ' + escapeHtml(cats[0]) + ' / ' + escapeHtml(cats[1]) + '</p>' : ''}
    <input class="profile-input" id="cfItem" placeholder="Elemento a clasificar (ej.: Teclado)" maxlength="60">
    <div class="teacher-option-row"><label><input type="radio" name="cfCat" value="0" checked> Va en el grupo 1</label>&nbsp;&nbsp;<label><input type="radio" name="cfCat" value="1"> Va en el grupo 2</label></div>`;
}
function twCustomLabel(c){
  if (tw.type === 'quiz') return c.q + ' → ' + c.options[c.correct];
  if (tw.type === 'tf') return c.s + ' (' + (c.a ? 'Verdadero' : 'Falso') + ')';
  if (tw.type === 'match') return c.t + ' ↔ ' + c.d;
  if (tw.type === 'order') return c.title + ': ' + c.steps.join(' → ');
  return c.t + ' → ' + c.catName;
}
function twAddCustom(){
  const err = $('#twErr'); const bad = (m) => { err.textContent = m; err.classList.remove('hidden'); };
  err.classList.add('hidden');
  const clean = (t) => { const r = checkText(t, { contact:false }); return r.ok; };
  const t = tw.type;
  if (t === 'quiz'){
    const q = $('#cfQ').value.trim();
    const opts = $$('.cf-opt').map(i => i.value.trim());
    const ci = +($('input[name="cfCorrect"]:checked') || { value:0 }).value;
    if (!q || !opts[0] || !opts[1]) return bad('Escribe la pregunta y al menos 2 opciones.');
    if (!opts[ci]) return bad('La opción marcada como correcta está vacía.');
    const used = opts.map((o, i) => ({ o, i })).filter(x => x.o);
    if (![q, ...opts].every(x => !x || clean(x))) return bad('🚫 Hay palabras no permitidas. Usa un lenguaje respetuoso.');
    tw.custom.push({ q, options: used.map(x => x.o), correct: used.findIndex(x => x.i === ci) });
  } else if (t === 'tf'){
    const s = $('#cfS').value.trim(); if (!s) return bad('Escribe la afirmación.');
    const e = $('#cfE').value.trim();
    if (!clean(s) || !clean(e)) return bad('🚫 Hay palabras no permitidas. Usa un lenguaje respetuoso.');
    tw.custom.push({ s, a: $('input[name="cfA"]:checked').value === '1', e });
  } else if (t === 'match'){
    const a = $('#cfT').value.trim(), d = $('#cfD').value.trim();
    if (!a || !d) return bad('Escribe el término y su definición.');
    if (!clean(a) || !clean(d)) return bad('🚫 Hay palabras no permitidas. Usa un lenguaje respetuoso.');
    tw.custom.push({ t:a, d });
  } else if (t === 'order'){
    const title = $('#cfTitle').value.trim();
    const steps = $('#cfSteps').value.split('\n').map(x => x.trim()).filter(Boolean);
    if (!title) return bad('Escribe un título.');
    if (steps.length < 3 || steps.length > 8) return bad('Escribe entre 3 y 8 pasos, uno por línea.');
    if (![title, ...steps].every(clean)) return bad('🚫 Hay palabras no permitidas. Usa un lenguaje respetuoso.');
    tw.custom.push({ title, steps });
  } else {
    const bank = twBankItems();
    const cats = bank.length ? bank[0].cats : [$('#cfC0').value.trim(), $('#cfC1').value.trim()];
    const item = $('#cfItem').value.trim();
    if (!cats[0] || !cats[1]) return bad('Escribe los nombres de los dos grupos.');
    if (!item) return bad('Escribe el elemento a clasificar.');
    if (![item, ...cats].every(clean)) return bad('🚫 Hay palabras no permitidas. Usa un lenguaje respetuoso.');
    if (!bank.length) tw.cats = cats;
    const ci = +$('input[name="cfCat"]:checked').value;
    tw.custom.push({ t:item, c:ci, catName:cats[ci] });
  }
  twItems();
}

/* Paso 4: publicar */
function twPublish(){
  const wrap = $('#teacherWrap');
  const n = tw.picked.size + tw.custom.length;
  if (!tw.title) tw.title = `${twTopicName()} · ${ACT_TYPES[tw.type].name}`;
  wrap.innerHTML = twHeader(4, 'Último paso: nombre y código') + `
    <div class="online-panel teacher-form">
      <label class="profile-label">Título de la actividad</label>
      <input type="text" id="twTitle" class="profile-input" maxlength="60" value="${escapeHtml(tw.title)}">
      <label class="profile-label">Código de clase <span class="profile-opt">(lo escribirán tus alumnos)</span></label>
      <div style="display:flex; gap:8px;"><input type="text" id="twCode" class="profile-input" maxlength="8" value="${escapeHtml(tw.code)}" style="text-transform:uppercase;"><button class="modal-btn" id="twNewCode" title="Otro código">🎲</button></div>
      <p class="level-hint" style="margin:8px 0 0;">${ACT_TYPES[tw.type].icon} ${ACT_TYPES[tw.type].name} · ${n} ítem${n === 1 ? '' : 's'}</p>
      <p class="profile-error hidden" id="twPubErr"></p>
    </div>` + twNav(true, '🚀 Publicar actividad', 'twGo');
  $('#twBack').onclick = () => twItems();
  $('#twNewCode').onclick = () => { $('#twCode').value = randomClassCode(); };
  $('#twGo').onclick = twSave;
}

/* Arma el contenido final (banco elegido + los del profesor) */
function twBuildPayload(){
  const bank = twBankItems().filter(b => tw.picked.has(b.id));
  const t = tw.type;
  let items = bank.map(b => b.data).concat(tw.custom.map(c => { const o = Object.assign({}, c); delete o.catName; return o; }));
  const payload = {
    v: 2, type: t, topic: tw.topic, topicName: twTopicName(), title: tw.title,
    teacher: State.profile ? State.profile.name : 'Profesor/a', createdAt: Date.now(),
  };
  if (t === 'classify'){
    const cats = bank.length ? bank[0].cats : tw.cats;
    payload.cats = cats;
  }
  payload.items = items.map(i => Object.assign({}, i));
  if (t === 'quiz') payload.questions = payload.items;   // compatibilidad con la versión anterior
  return payload;
}

async function twSave(){
  const err = $('#twPubErr'); const bad = (m) => { err.textContent = m; err.classList.remove('hidden'); };
  err.classList.add('hidden');
  tw.title = $('#twTitle').value.trim();
  const code = $('#twCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!tw.title) return bad('Escribe un título.');
  if (!checkText(tw.title, { contact:false }).ok) return bad('🚫 El título tiene palabras no permitidas.');
  if (code.length < 3) return bad('El código debe tener al menos 3 letras o números.');
  const btn = $('#twGo'); btn.disabled = true; btn.textContent = 'Publicando…';
  try {
    if (!AppStorage) throw new Error('sin storage');
    const ex = await AppStorage.get('class:' + code, true);
    if (ex && ex.value){
      let owner = null; try { owner = JSON.parse(ex.value).teacher; } catch (e) {}
      if (owner && State.profile && owner !== State.profile.name){ btn.disabled = false; btn.textContent = '🚀 Publicar actividad'; return bad('Ese código ya lo usa otro profesor. Prueba con 🎲 para otro código.'); }
    }
    const payload = twBuildPayload();
    const ok = await AppStorage.set('class:' + code, JSON.stringify(payload), true);
    if (!ok) throw new Error('no guardado');
    await registerTeacherCode(code, { title: payload.title, type: payload.type, count: payload.items.length, createdAt: Date.now() });
    tw.code = code; twPublished(code, payload);
  } catch (e) {
    btn.disabled = false; btn.textContent = '🚀 Publicar actividad';
    bad('No se pudo publicar ahora. Revisa tu conexión e inténtalo de nuevo.');
  }
}

function twPublished(code, payload){
  const wrap = $('#teacherWrap');
  const msg = `📚 Actividad "${payload.title}" en BitBloom. Entra a "Código de clase" y escribe: ${code}`;
  wrap.innerHTML = `
    <div class="online-panel" style="text-align:center;">
      <div style="font-size:48px;">🎉</div>
      <h3 class="prog-h">¡Actividad publicada!</h3>
      <p class="level-hint" style="margin:0;">Comparte este código con tus estudiantes:</p>
      <div class="online-code-box" style="margin:10px 0;"><div class="code">${escapeHtml(code)}</div></div>
      <p class="level-hint">${ACT_TYPES[payload.type].icon} ${escapeHtml(payload.title)} · ${payload.items.length} ítems</p>
      <div class="modal-actions" style="flex-wrap:wrap;">
        <button class="modal-btn" id="twWa" style="background:#128c4a; border-color:#25d366; color:#fff;">📲 Enviar por WhatsApp</button>
        <button class="modal-btn" id="twCopy">📋 Copiar mensaje</button>
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;">
        <button class="modal-btn" id="twAnother">➕ Crear otra</button>
        <button class="modal-btn primary" id="twDone">Ver mis actividades</button>
      </div>
    </div>`;
  $('#twWa').onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  $('#twCopy').onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(msg).then(() => showToast('📋 Mensaje copiado')).catch(() => showToast(msg)); else showToast(msg); };
  $('#twAnother').onclick = twStart;
  $('#twDone').onclick = showTeacherPanel;
}

/* =========================================================
   CÓDIGO DE CLASE — el alumno carga y juega la actividad
   ========================================================= */
function showClassCodeScreen(){
  showScreen('#screenClassCode');
  bitHide();
  const wrap = $('#classCodeWrap');
  wrap.innerHTML = `
    <p class="level-hint">Si tu profesor/a te dio un código de clase, escríbelo aquí para jugar la actividad que preparó.</p>
    <div class="teacher-form">
      <input type="text" id="classCodeInput" class="profile-input" maxlength="8" placeholder="Código de clase" style="text-transform:uppercase;">
      <button class="modal-btn primary profile-save-btn" id="classCodeGoBtn">Buscar actividad ▶</button>
      <p class="level-hint" id="classCodeStatus"></p>
    </div>
  `;
  $('#classCodeGoBtn').addEventListener('click', loadClassActivity);
}

let classQuizState = null;

/* Convierte la actividad en una lista de "preguntas" de distintos tipos */
function buildClassQueue(p){
  const type = p.type || 'quiz';
  const items = p.items || p.questions || [];
  if (type === 'quiz') return items.map(q => ({ kind:'mc', q:q.q, options:q.options, correct:q.correct, e:q.e }));
  if (type === 'tf') return shuffle(items.slice()).map(i => ({ kind:'tf', q:i.s, answer:!!i.a, e:i.e || '' }));
  if (type === 'classify') return shuffle(items.slice()).map(i => ({ kind:'cls', q:i.t, cats:p.cats, correct:i.c }));
  if (type === 'order') return items.map(i => ({ kind:'ord', q:i.title, steps:i.steps }));
  if (type === 'match') return [{ kind:'mat', pairs:items }];
  return [];
}
function classTotalOf(queue){ return queue.reduce((n, q) => n + (q.kind === 'mat' ? q.pairs.length : 1), 0); }
function newClassState(code, payload){
  const queue = buildClassQueue(payload);
  return { code, payload, queue, total: classTotalOf(queue), index: 0, correct: 0, answers: [], sent: false };
}

async function loadClassActivity(){
  const code = $('#classCodeInput').value.trim().toUpperCase();
  const status = $('#classCodeStatus');
  if (!code){ status.textContent = 'Ingresa un código.'; return; }
  status.textContent = 'Buscando...';
  try {
    if (!AppStorage) throw new Error('sin storage');
    const res = await AppStorage.get('class:' + code, true);
    if (!res || !res.value){ status.textContent = 'No se encontró ninguna actividad con ese código.'; return; }
    const payload = JSON.parse(res.value);
    classQuizState = newClassState(code, payload);
    if (!classQuizState.total){ status.textContent = 'Esa actividad no tiene contenido.'; return; }
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
  const T = ACT_TYPES[st.payload.type || 'quiz'];
  wrap.innerHTML = `
    <h2 style="text-align:center;">${T ? T.icon : ''} ${escapeHtml(st.payload.title || 'Actividad')}</h2>
    <p class="level-hint" style="text-align:center;">De ${escapeHtml(st.payload.teacher)} · ${T ? T.name : ''}</p>
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
    doc.attempts.push({ ts: Date.now(), correct: st.correct, total: st.total, answers: st.answers });
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

/* Registra una respuesta y pasa a la siguiente */
function classAnswer(q, ok, chosen, right, delay){
  const st = classQuizState;
  if (!ok) recordMistake('actividad', q);
  st.answers.push({ q, ok: !!ok, chosen, right });
  if (ok){ st.correct++; beep('correct'); } else beep('wrong');
}
function classNext(delay){ classQuizState.index++; setTimeout(classQuizRender, delay || 1000); }
function classFeedback(ok, extra){
  const box = $('#classFeedback'); if (!box) return;
  box.innerHTML = (ok ? '<b class="ok-word">Correcto.</b> ' : '<b class="bad-word">Incorrecto.</b> ') + escapeHtml(extra || '');
}

function classQuizRender(){
  const wrap = $('#classCodeWrap');
  const st = classQuizState;
  const T = ACT_TYPES[st.payload.type || 'quiz'];
  if (st.index >= st.queue.length){
    if (!st.rewarded){
      st.rewarded = true;
      st.coinsEarned = st.correct * 8;
      State.coins += st.coinsEarned;
      recordActivity('side', 'class-' + st.code, st.correct >= Math.ceil(st.total / 2), st.correct * 10, 0, st.coinsEarned);
      saveProgress();
    }
    wrap.innerHTML = `
      <h2>¡Actividad completa!</h2>
      <p>${escapeHtml(State.realName ? State.realName.first : '')}, acertaste ${st.correct} de ${st.total}. Ganaste 🪙 ${st.coinsEarned} monedas.</p>
      <p class="level-hint">${escapeHtml(st.payload.title || 'Actividad')} · creada por ${escapeHtml(st.payload.teacher)}.</p>
      <button class="modal-btn primary profile-save-btn" id="classSendBtn">📨 Enviar mis resultados a mi profesor/a</button>
      <p class="level-hint" id="classSendMsg"></p>
      <div class="modal-actions" style="margin-top:10px;">
        <button class="modal-btn" id="classRetryBtn">🔁 Repetir la actividad</button>
        <button class="modal-btn" id="classCodeBackBtn">Volver al menú</button>
      </div>
    `;
    $('#classSendBtn').addEventListener('click', sendClassResults);
    $('#classCodeBackBtn').addEventListener('click', goMenu);
    $('#classRetryBtn').addEventListener('click', () => { classQuizState = newClassState(st.code, st.payload); classQuizRender(); });
    return;
  }
  const item = st.queue[st.index];
  const head = `<p class="level-hint">${T ? T.icon : ''} ${st.index + 1} / ${st.queue.length} · ${escapeHtml(st.payload.title || 'Actividad')}</p>`;

  /* ---- Opción múltiple ---- */
  if (item.kind === 'mc'){
    const order = shuffle(item.options.map((text, i) => ({ text, correct: i === item.correct })));
    wrap.innerHTML = head + `<div class="quiz-card"><div class="quiz-question">${escapeHtml(item.q)}</div></div><div class="quiz-options" id="classQuizOptions"></div><p class="level-hint" id="classFeedback" style="min-height:22px;"></p>`;
    const box = $('#classQuizOptions');
    order.forEach(opt => {
      const btn = el('button', 'quiz-opt', opt.text);
      btn.addEventListener('click', () => {
        $$('.quiz-opt', box).forEach(b => { b.disabled = true; if (b.textContent === item.options[item.correct]) b.classList.add('correct'); });
        if (!opt.correct) btn.classList.add('wrong');
        classAnswer(item.q, opt.correct, opt.text, item.options[item.correct]);
        classFeedback(opt.correct, item.e);
        classNext(opt.correct && !item.e ? 900 : 1700);
      });
      box.appendChild(btn);
    });
    return;
  }

  /* ---- Verdadero o falso ---- */
  if (item.kind === 'tf'){
    wrap.innerHTML = head + `<div class="quiz-card"><div class="quiz-question">${escapeHtml(item.q)}</div></div>
      <div class="quiz-options"><button class="quiz-opt" data-v="1">✔ Verdadero</button><button class="quiz-opt" data-v="0">✖ Falso</button></div>
      <p class="level-hint" id="classFeedback" style="min-height:22px;"></p>`;
    $$('.quiz-opt', wrap).forEach(btn => btn.addEventListener('click', () => {
      const said = btn.dataset.v === '1', ok = said === item.answer;
      $$('.quiz-opt', wrap).forEach(b => { b.disabled = true; if ((b.dataset.v === '1') === item.answer) b.classList.add('correct'); });
      if (!ok) btn.classList.add('wrong');
      classAnswer(item.q, ok, said ? 'Verdadero' : 'Falso', item.answer ? 'Verdadero' : 'Falso');
      classFeedback(ok, item.e || (item.answer ? 'La afirmación es verdadera.' : 'La afirmación es falsa.'));
      classNext(1700);
    }));
    return;
  }

  /* ---- Clasificar ---- */
  if (item.kind === 'cls'){
    wrap.innerHTML = head + `<p class="level-hint" style="margin-bottom:4px;">¿En qué grupo va?</p><div class="quiz-card"><div class="quiz-question">${escapeHtml(item.q)}</div></div>
      <div class="quiz-options">${item.cats.map((c, i) => `<button class="quiz-opt" data-c="${i}">${escapeHtml(c)}</button>`).join('')}</div>
      <p class="level-hint" id="classFeedback" style="min-height:22px;"></p>`;
    $$('.quiz-opt', wrap).forEach(btn => btn.addEventListener('click', () => {
      const ci = +btn.dataset.c, ok = ci === item.correct;
      $$('.quiz-opt', wrap).forEach(b => { b.disabled = true; if (+b.dataset.c === item.correct) b.classList.add('correct'); });
      if (!ok) btn.classList.add('wrong');
      classAnswer(item.q, ok, item.cats[ci], item.cats[item.correct]);
      classFeedback(ok, `«${item.q}» va en: ${item.cats[item.correct]}.`);
      classNext(1300);
    }));
    return;
  }

  /* ---- Ordenar pasos ---- */
  if (item.kind === 'ord'){
    const shown = shuffle(item.steps.map((s, i) => ({ s, i })));
    let next = 0, mistakes = 0;
    wrap.innerHTML = head + `<div class="quiz-card"><div class="quiz-question">${escapeHtml(item.q)}</div></div>
      <p class="level-hint" style="margin:6px 0;">Toca los pasos en el orden correcto.</p>
      <div class="quiz-options" id="ordBox">${shown.map(x => `<button class="quiz-opt" data-i="${x.i}">${escapeHtml(x.s)}</button>`).join('')}</div>
      <p class="level-hint" id="classFeedback" style="min-height:22px;"></p>`;
    $$('#ordBox .quiz-opt', wrap).forEach(btn => btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (+btn.dataset.i === next){
        btn.disabled = true; btn.classList.add('correct'); btn.insertAdjacentHTML('afterbegin', `<b>${next + 1}.</b> `);
        next++;
        if (next >= item.steps.length){
          const ok = mistakes === 0;
          classAnswer(item.q, ok, ok ? 'Orden correcto' : `Con ${mistakes} error${mistakes > 1 ? 'es' : ''}`, item.steps.join(' → '));
          classFeedback(ok, ok ? '¡Orden perfecto!' : `Terminaste con ${mistakes} error${mistakes > 1 ? 'es' : ''}. El orden era: ${item.steps.join(' → ')}.`);
          classNext(1900);
        }
      } else {
        mistakes++; beep('wrong'); btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 450);
        classFeedback(false, 'Ese no es el siguiente paso. ¡Piénsalo otra vez!');
      }
    }));
    return;
  }

  /* ---- Relacionar ---- */
  if (item.kind === 'mat'){
    const terms = item.pairs.map((p, i) => ({ t:p.t, i }));
    const defs = shuffle(item.pairs.map((p, i) => ({ d:p.d, i })));
    const wrongFor = {}; let done = 0, sel = null;
    wrap.innerHTML = `<p class="level-hint">${T.icon} Relaciona cada término con su definición · ${escapeHtml(st.payload.title || '')}</p>
      <div class="l4-board" style="max-width:900px; margin:0 auto;">
        <div class="l4-col" id="matL">${terms.map(x => `<button class="l4-card" data-i="${x.i}">${escapeHtml(x.t)}</button>`).join('')}</div>
        <div class="l4-col" id="matR">${defs.map(x => `<button class="l4-card" data-i="${x.i}">${escapeHtml(x.d)}</button>`).join('')}</div>
      </div><p class="level-hint" id="classFeedback" style="min-height:22px;"></p>`;
    $$('#matL .l4-card', wrap).forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      $$('#matL .l4-card', wrap).forEach(x => x.classList.remove('selected'));
      b.classList.add('selected'); sel = +b.dataset.i;
    }));
    $$('#matR .l4-card', wrap).forEach(b => b.addEventListener('click', () => {
      if (b.disabled || sel == null) { if (sel == null) classFeedback(false, 'Primero toca un término de la izquierda.'); return; }
      const di = +b.dataset.i;
      const left = $(`#matL .l4-card[data-i="${sel}"]`, wrap);
      if (di === sel){
        b.disabled = true; left.disabled = true; b.classList.add('matched'); left.classList.add('matched'); left.classList.remove('selected');
        beep('correct'); done++; sel = null; classFeedback(true, 'Muy bien.');
        if (done >= item.pairs.length){
          item.pairs.forEach((p, i) => classAnswerSilent(`${p.t} ↔ definición`, !wrongFor[i], wrongFor[i] ? 'con error' : 'a la primera', p.d));
          classNext(1000);
        }
      } else {
        wrongFor[sel] = true; beep('wrong'); b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 450);
        recordMistake('actividad', `${item.pairs[sel].t} ↔ ${item.pairs[sel].d}`);
        classFeedback(false, 'Esa no es su definición. Inténtalo otra vez.');
      }
    }));
  }
}
function classAnswerSilent(q, ok, chosen, right){
  const st = classQuizState;
  st.answers.push({ q, ok: !!ok, chosen, right });
  if (ok) st.correct++;
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
      ${act ? '<p class="level-hint" style="margin:0 0 10px;">' + ((ACT_TYPES[act.type || 'quiz'] || {}).icon || '') + ' ' + escapeHtml(act.title || 'Actividad') + ' · creada el ' + new Date(act.createdAt).toLocaleDateString('es') + '</p>' : ''}
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
