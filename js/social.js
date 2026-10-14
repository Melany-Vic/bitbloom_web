/* =========================================================
   CUENTAS / PERFIL — nombre y rol (alumno/profesor).
   No hay contraseña: cada cuenta es un nombre con su propio progreso.
   En un mismo dispositivo se pueden crear varias cuentas, cerrar sesión
   y volver a entrar a cualquiera de ellas desde la lista de cuentas.
   ========================================================= */
function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function refreshProfileUI(){
  const tag = $('#menuProfileTag');
  const teacherBtn = $('#btnTeacher');
  const logoutBtn = $('#btnLogout');
  if (State.profile){
    tag.innerHTML = `<img class="profile-head" src="${skinHeadSrc(currentSkin())}" alt=""> ${escapeHtml(State.profile.name)}
      <button class="profile-edit-link" id="profileEditLink">editar</button>`;
    teacherBtn.classList.toggle('hidden', State.profile.role !== 'profesor');
    $('#profileEditLink').addEventListener('click', () => showProfileScreen('edit'));
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    tag.innerHTML = '';
    teacherBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}

function logoutProfile(){
  showModal(`
    <h2>¿Cerrar sesión?</h2>
    <p>Tu progreso con "${escapeHtml(State.profile ? State.profile.name : '')}" queda guardado. Después podrás volver a entrar a esta cuenta o crear otra distinta en este mismo dispositivo.</p>
    <div class="modal-actions">
      <button class="modal-btn" id="logoutCancel">Cancelar</button>
      <button class="modal-btn primary" id="logoutConfirm">Cerrar sesión</button>
    </div>
  `);
  $('#logoutCancel').onclick = hideModal;
  $('#logoutConfirm').onclick = async () => {
    hideModal();
    await saveProgress();   // asegura que lo último quede guardado antes de salir
    State.profile = null;
    setActiveAccount(null);
    resetLocalState();
    refreshProfileUI();
    showProfileScreen('onboarding');
  };
}

/* Entrar a una cuenta ya verificada (contraseña correcta) */
async function enterAccount(rec){
  resetLocalState();
  State.profile = { name: rec.name, role: rec.role };
  await loadProgress();
  State.profile = { name: rec.name, role: rec.role };
  setActiveAccount(State.profile);
  registerDeviceAccount(State.profile);
  refreshProfileUI();
  refreshCurrencyUI();
  submitToLeaderboard();
  goMenu();
}

/* Pantalla de cuentas: "Entrar" (usuario + contraseña) / "Crear cuenta" (usuario único + contraseña)
   y, con la sesión iniciada, "Tu perfil" (cambiar rol o contraseña; el usuario no se puede cambiar). */
let profileTab = 'login';
async function showProfileScreen(mode){
  showScreen('#screenProfile');
  bitHide();
  $('#btnProfileBack').classList.remove('hidden');
  $('.screen-title', $('#screenProfile')).textContent = mode === 'edit' ? 'Tu perfil' : 'Cuenta';
  const wrap = $('#profileWrap');
  const accounts = getDeviceAccounts().slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

  /* ---------- Editar perfil ---------- */
  if (mode === 'edit'){
    const cur = State.profile || { name:'', role:'estudiante' };
    wrap.innerHTML = `
      <img src="${'assets/skins/' + currentSkin() + '.png'}" class="mission-avatar" alt="" style="margin:0 auto 12px; height:90px; width:auto;">
      <div class="profile-form">
        <label class="profile-label">Nombre de usuario</label>
        <input type="text" class="profile-input" value="${escapeHtml(cur.name)}" disabled>
        <label class="profile-label">Soy...</label>
        <div class="profile-role-buttons">
          <button class="profile-role-btn ${cur.role === 'estudiante' ? 'selected' : ''}" data-role="estudiante">🎓 Estudiante</button>
          <button class="profile-role-btn ${cur.role === 'profesor' ? 'selected' : ''}" data-role="profesor">🧑‍🏫 Profesor/a</button>
        </div>
        <label class="profile-label">Nueva contraseña <span class="profile-opt">(opcional)</span></label>
        <input type="password" id="profilePassInput" class="profile-input" maxlength="40" placeholder="Déjalo vacío para no cambiarla" autocomplete="new-password">
        <div class="profile-error hidden" id="profileError"></div>
        <button class="modal-btn primary profile-save-btn" id="profileSaveBtn">Guardar ▶</button>
      </div>`;
    let role = cur.role;
    $$('.profile-role-btn', wrap).forEach(btn => btn.addEventListener('click', () => {
      role = btn.dataset.role;
      $$('.profile-role-btn', wrap).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    }));
    $('#profileSaveBtn').addEventListener('click', async () => {
      const err = $('#profileError');
      const np = $('#profilePassInput').value;
      if (np && np.length < 4){ err.textContent = 'La contraseña debe tener al menos 4 caracteres.'; err.classList.remove('hidden'); return; }
      let rec = await fetchUserRecord(cur.name);
      if (!rec) rec = await buildUserRecord(cur.name, role, np || randomSalt());   // cuenta antigua sin contraseña
      rec.role = role;
      if (np){ rec.salt = randomSalt(); rec.hash = await hashPassword(np, rec.salt); }
      await saveUserRecord(rec);
      State.profile = { name: cur.name, role };
      refreshProfileUI();
      await saveProgress();
      goMenu();
    });
    return;
  }

  /* ---------- Entrar / Crear cuenta ---------- */
  if (!accounts.length && profileTab === 'login') profileTab = 'register';
  const accountsHtml = accounts.length ? `
    <div class="account-list">
      ${accounts.map((a, i) => `
        <button class="account-row" data-idx="${i}">
          <img class="account-head" src="assets/heads/bit.png" alt="">
          <span class="account-name">${escapeHtml(a.name)}</span>
          <span class="account-role">${a.role === 'profesor' ? 'Profesor/a' : 'Estudiante'}</span>
          <span class="account-go">Elegir ▶</span>
        </button>`).join('')}
    </div>` : '';

  wrap.innerHTML = `
    <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit" style="margin:0 auto 12px;">
    <div class="auth-tabs">
      <button class="auth-tab ${profileTab === 'login' ? 'active' : ''}" data-tab="login">Entrar</button>
      <button class="auth-tab ${profileTab === 'register' ? 'active' : ''}" data-tab="register">Crear cuenta</button>
    </div>
    ${profileTab === 'login' ? `
      <div class="profile-form">
        ${accountsHtml ? '<label class="profile-label">Cuentas en este dispositivo</label>' + accountsHtml : ''}
        <label class="profile-label">Nombre de usuario</label>
        <input type="text" id="authName" class="profile-input" maxlength="20" placeholder="Tu nombre de usuario" autocomplete="username">
        <label class="profile-label">Contraseña</label>
        <input type="password" id="authPass" class="profile-input" maxlength="40" placeholder="Tu contraseña" autocomplete="current-password">
        <div class="profile-error hidden" id="profileError"></div>
        <button class="modal-btn primary profile-save-btn" id="authSubmit">Entrar ▶</button>
      </div>` : `
      <div class="profile-form">
        <label class="profile-label">Nombre de usuario <span class="profile-opt">(único, nadie más puede usarlo)</span></label>
        <input type="text" id="authName" class="profile-input" maxlength="20" placeholder="Elige tu nombre de usuario" autocomplete="username">
        <label class="profile-label">Contraseña <span class="profile-opt">(mínimo 4 caracteres)</span></label>
        <input type="password" id="authPass" class="profile-input" maxlength="40" placeholder="Crea una contraseña" autocomplete="new-password">
        <label class="profile-label">Repite la contraseña</label>
        <input type="password" id="authPass2" class="profile-input" maxlength="40" placeholder="Repite la contraseña" autocomplete="new-password">
        <label class="profile-label">Soy...</label>
        <div class="profile-role-buttons">
          <button class="profile-role-btn selected" data-role="estudiante">🎓 Estudiante</button>
          <button class="profile-role-btn" data-role="profesor">🧑‍🏫 Profesor/a</button>
        </div>
        <div class="profile-error hidden" id="profileError"></div>
        <button class="modal-btn primary profile-save-btn" id="authSubmit">Crear cuenta y continuar ▶</button>
      </div>`}
  `;

  const showError = (msg) => { const e = $('#profileError'); e.textContent = msg; e.classList.remove('hidden'); };
  const busy = (on) => { const b = $('#authSubmit'); b.disabled = on; b.textContent = on ? 'Un momento…' : (profileTab === 'login' ? 'Entrar ▶' : 'Crear cuenta y continuar ▶'); };

  $$('.auth-tab', wrap).forEach(t => t.addEventListener('click', () => { profileTab = t.dataset.tab; showProfileScreen('onboarding'); }));
  $$('.account-row', wrap).forEach(btn => btn.addEventListener('click', () => {
    $('#authName').value = accounts[+btn.dataset.idx].name;
    $('#authPass').focus();
  }));

  if (profileTab === 'login'){
    const submit = async () => {
      const name = $('#authName').value.trim(), pass = $('#authPass').value;
      if (!name || !pass){ showError('Escribe tu nombre de usuario y tu contraseña.'); return; }
      busy(true);
      const rec = await fetchUserRecord(name);
      if (!rec){
        busy(false);
        showError(deviceAccountExists(name)
          ? 'Esta cuenta se creó antes de que existieran las contraseñas. Ve a "Crear cuenta", usa el mismo nombre y elige una contraseña para protegerla (se conserva tu progreso).'
          : 'No existe ese usuario. Revisa el nombre o crea una cuenta nueva.');
        return;
      }
      if (!(await checkPassword(rec, pass))){ busy(false); showError('Contraseña incorrecta.'); return; }
      await enterAccount(rec);
    };
    $('#authSubmit').addEventListener('click', submit);
    $('#authPass').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    return;
  }

  /* Crear cuenta */
  let role = 'estudiante';
  $$('.profile-role-btn', wrap).forEach(btn => btn.addEventListener('click', () => {
    role = btn.dataset.role;
    $$('.profile-role-btn', wrap).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }));
  $('#authSubmit').addEventListener('click', async () => {
    const name = $('#authName').value.trim().slice(0, 20);
    const p1 = $('#authPass').value, p2 = $('#authPass2').value;
    if (name.length < 3){ showError('El nombre de usuario debe tener al menos 3 caracteres.'); return; }
    { const mod = checkText(name); if (!mod.ok){ showError('🚫 Ese nombre de usuario no está permitido. Elige uno respetuoso.'); return; } }
    if (p1.length < 4){ showError('La contraseña debe tener al menos 4 caracteres.'); return; }
    if (p1 !== p2){ showError('Las contraseñas no coinciden.'); return; }
    busy(true);
    const existing = await fetchUserRecord(name);
    if (existing){
      busy(false);
      showError('Ese nombre de usuario ya está en uso. Elige otro distinto.');
      return;
    }
    // Cuenta antigua de este dispositivo (sin contraseña): se "reclama" y se conserva su progreso
    const legacy = deviceAccountExists(name);
    const rec = await buildUserRecord(name, legacy ? (accounts.find(a => slugifyProfileName(a.name) === slugifyProfileName(name)) || {}).role || role : role, p1);
    await saveUserRecord(rec);
    if (legacy){
      await enterAccount(rec);
      return;
    }
    resetLocalState();
    State.profile = { name: rec.name, role: rec.role };
    refreshProfileUI();
    await saveProgress();
    startQuiz('pre');
  });
}

/* =========================================================
   TABLA DE CLASIFICACIÓN — almacenamiento compartido
   Visible para cualquiera que juegue este BitBloom. Guarda el
   mejor puntaje de cada nombre de jugador.
   ========================================================= */
const LEADERBOARD_KEY = 'bitbloom-leaderboard';   // lista antigua (única); se sigue leyendo para no perder datos
let _lbLastSent = -1, _lbLastSkin = null, _lbTimer = null, _lbAuto = null;

/* Cada jugador guarda su propia ficha ("lb:usuario"), así no se pisan los datos entre jugadores */
function lbKey(){ return 'lb:' + slugifyProfileName(State.profile.name); }

async function submitToLeaderboard(){
  try {
    if (!AppStorage || !State.profile) return false;
    const entry = {
      name: State.profile.name, role: State.profile.role,
      score: totalPoints(), levelScore: State.score || 0, extraScore: State.extraPoints || 0,
      coins: State.coins, skin: currentSkin(), date: Date.now(),
    };
    const ok = await AppStorage.set(lbKey(), JSON.stringify(entry), true);
    if (ok){ _lbLastSent = entry.score; _lbLastSkin = entry.skin; }
    return !!ok;
  } catch (e) { return false; }
}

/* Se llama cada vez que se guarda el progreso: envía los puntos nuevos poco después */
function scheduleLeaderboardSync(){
  if (!State.profile || (totalPoints() === _lbLastSent && currentSkin() === _lbLastSkin)) return;
  clearTimeout(_lbTimer);
  _lbTimer = setTimeout(submitToLeaderboard, 1200);
}

async function fetchLeaderboard(){
  const rows = await AppStorage.list('lb:', true);
  const list = [];
  rows.forEach(r => { try { const o = JSON.parse(r.value); if (o && o.name) list.push(o); } catch (e) {} });
  // lista antigua: solo se agregan jugadores que aún no tienen ficha nueva
  try {
    const res = await AppStorage.get(LEADERBOARD_KEY, true);
    if (res && res.value){
      JSON.parse(res.value).forEach(o => {
        const i = list.findIndex(p => slugifyProfileName(p.name) === slugifyProfileName(o.name));
        if (i < 0) list.push(o);
        else if ((o.score || 0) > (list[i].score || 0)) list[i].score = o.score;
      });
    }
  } catch (e) {}
  list.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.coins || 0) - (a.coins || 0));
  return list;
}

async function showLeaderboardScreen(){
  showScreen('#screenLeaderboard');
  bitHide();
  const wrap = $('#leaderboardWrap');
  wrap.innerHTML = `<p class="level-hint">Cargando clasificación compartida...</p>`;
  await submitToLeaderboard();          // primero se envían tus puntos actuales
  await renderLeaderboard();
  // mientras la pantalla está abierta, se actualiza sola cada 20 s
  clearInterval(_lbAuto);
  _lbAuto = setInterval(() => {
    const scr = document.getElementById('screenLeaderboard');
    if (!scr || scr.classList.contains('hidden')){ clearInterval(_lbAuto); return; }
    renderLeaderboard(true);
  }, 20000);
}

/* Botón 🔄 Actualizar: envía tus puntos y vuelve a leer la tabla, mostrando el avance */
async function refreshLeaderboard(){
  const btn = $('#btnLeaderboardRefresh');
  if (!btn || btn.disabled) return;
  btn.disabled = true; btn.textContent = '⏳ Actualizando…';
  try {
    await submitToLeaderboard();
    const ok = await renderLeaderboard();
    showToast(ok ? '🔄 Clasificación actualizada' : 'No se pudo actualizar. Revisa tu conexión.');
  } finally {
    btn.disabled = false; btn.textContent = '🔄 Actualizar';
  }
}

/* Devuelve true si pudo mostrar la tabla */
async function renderLeaderboard(silent){
  const wrap = $('#leaderboardWrap');
  try {
    if (!AppStorage) throw new Error('sin storage');
    const list = await fetchLeaderboard();
    if (!list.length){
      wrap.innerHTML = `<p class="level-hint">Todavía nadie aparece en la clasificación. ¡Juega un nivel o un desafío para ser el primero!</p>`;
      return true;
    }
    const mySlug = State.profile ? slugifyProfileName(State.profile.name) : null;
    const myIdx = mySlug ? list.findIndex(p => slugifyProfileName(p.name) === mySlug) : -1;
    const mine = myIdx >= 0 ? list[myIdx] : null;
    const time = new Date().toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    wrap.innerHTML = `
      ${State.profile ? `
      <div class="online-panel lb-me">
        <div><b>Tu posición:</b> ${myIdx >= 0 ? '#' + (myIdx + 1) + ' de ' + list.length : 'aún sin puntos'}</div>
        <div><b>Tus puntos totales:</b> ⬡ ${totalPoints()} <small>(niveles ${State.score || 0} + juegos y misiones ${State.extraPoints || 0})</small></div>
      </div>` : ''}
      <p class="level-hint">Suma <b>todos</b> tus puntos: niveles, juegos de la Arena, misiones y actividades. Actualizada a las ${time}.</p>
      <div class="leaderboard-list">
        ${list.slice(0, 50).map((p, i) => {
          const isMe = mySlug && slugifyProfileName(p.name) === mySlug;
          const total = isMe ? Math.max(p.score || 0, totalPoints()) : (p.score || 0);
          return `
          <div class="leaderboard-row ${isMe ? 'me' : ''}">
            <div class="leaderboard-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
            <div class="leaderboard-name"><img class="lb-head" src="${skinHeadSrc(SKIN_IDS.indexOf(p.skin) >= 0 ? p.skin : 'bit')}" alt=""> <span class="lb-role" title="${p.role === 'profesor' ? 'Profesor/a' : 'Estudiante'}">${p.role === 'profesor' ? '🧑‍🏫' : '🎓'}</span> ${escapeHtml(p.name)}${p.levelScore != null ? ' <small>niveles ' + p.levelScore + ' · juegos ' + (p.extraScore || 0) + '</small>' : ''}</div>
            <div class="leaderboard-score">⬡ ${total}</div>
            <div class="leaderboard-coins">🪙 ${p.coins || 0}</div>
          </div>`;
        }).join('')}
      </div>
      ${mine || !State.profile ? '' : ''}
    `;
    return true;
  } catch (e) {
    if (!silent) wrap.innerHTML = `<p class="level-hint">No se pudo cargar la clasificación en este momento. Revisa tu conexión e inténtalo con el botón 🔄 Actualizar.</p>`;
    return false;
  }
}

/* =========================================================
   MI PROGRESO — cómo vas en cada juego y día por día
   ========================================================= */
function fmtDayLabel(key, long){
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = long ? { weekday:'long', day:'numeric', month:'long' } : { weekday:'short', day:'numeric' };
  return dt.toLocaleDateString('es', opts);
}

/* Información de todos los juegos que se registran en el historial */
function progressGameList(){
  return [
    ...LEVELS.map(lv => ({ kind:'level', key:String(lv.id), icon:lv.icon, name:`N${lv.id} · ${lv.name}` })),
    ...ARENA_GAMES.map(g => ({ kind:'arena', key:g.key, icon:g.icon, name:g.name })),
    ...SIDE_QUESTS.map(sq => ({ kind:'side', key:sq.key, icon:sq.icon, name:sq.name })),
  ];
}

function progressBarChart(values, labels, unit){
  const max = Math.max(1, ...values);
  return `<div class="prog-chart">${values.map((v, i) => `
    <div class="prog-col" title="${labels[i]}: ${v} ${unit}">
      <div class="prog-val">${v || ''}</div>
      <div class="prog-bar-wrap"><div class="prog-bar ${v ? '' : 'empty'}" style="height:${v ? Math.max(8, Math.round(v / max * 100)) : 4}%"></div></div>
      <div class="prog-label">${labels[i]}</div>
    </div>`).join('')}</div>`;
}

function showProgressScreen(){
  showScreen('#screenProgress');
  bitHide();
  const wrap = $('#progressWrap');
  if (!State.profile){
    wrap.innerHTML = `<p class="level-hint">Crea o elige una cuenta primero para llevar un registro de tu progreso.</p>`;
    return;
  }
  const hist = State.history || {};
  const dayKeys = Object.keys(hist).sort();           // de más antiguo a más nuevo
  const gameList = progressGameList();

  /* --- Resumen --- */
  const totalPlays = dayKeys.reduce((n, k) => n + (hist[k].plays || 0), 0);
  const totalWins  = dayKeys.reduce((n, k) => n + (hist[k].wins || 0), 0);
  const today = hist[dateKey()];
  const summary = `
    <div class="online-panel">
      <h3 class="prog-h">⬡ Resumen de ${escapeHtml(State.profile.name)}</h3>
      <div class="prog-stats">
        <div class="prog-stat"><b>${totalPoints()}</b><span>puntos totales</span></div>
        <div class="prog-stat"><b>${State.coins}</b><span>monedas</span></div>
        <div class="prog-stat"><b>${dayKeys.length}</b><span>días jugados</span></div>
        <div class="prog-stat"><b>${totalPlays}</b><span>partidas</span></div>
        <div class="prog-stat"><b>${totalWins}</b><span>victorias</span></div>
        <div class="prog-stat"><b>${today ? today.points : 0}</b><span>puntos hoy</span></div>
      </div>
    </div>`;

  /* --- Últimos 7 días --- */
  const last7 = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(dateKey(d));
  }
  const chart = `
    <div class="online-panel">
      <h3 class="prog-h">📅 Puntos de los últimos 7 días</h3>
      ${progressBarChart(last7.map(k => (hist[k] ? hist[k].points : 0)), last7.map(k => fmtDayLabel(k, false)), 'puntos')}
      ${dayKeys.length ? '' : '<p class="prog-empty">Todavía no hay partidas registradas. ¡Juega un nivel o un desafío de la Arena para empezar tu historial!</p>'}
    </div>`;

  /* --- Evolución por juego --- */
  const gameRows = gameList.map(g => {
    const days = dayKeys.filter(k => hist[k][g.kind] && hist[k][g.kind][g.key]);
    let stat, trend = '';
    if (!days.length){
      stat = '<span class="online-status-badge">sin jugar</span>';
      return `<div class="prog-game"><div class="prog-game-top"><span class="p-name">${g.icon} ${g.name}</span>${stat}</div></div>`;
    }
    const entries = days.map(k => hist[k][g.kind][g.key]);
    const plays = entries.reduce((n, e) => n + e.plays, 0);
    const wins = entries.reduce((n, e) => n + e.wins, 0);
    const bestEver = Math.max(...entries.map(e => e.best));
    if (entries.length >= 2){
      const diff = entries[entries.length - 1].best - entries[entries.length - 2].best;
      trend = diff > 0 ? `<span class="prog-trend up">▲ +${diff}</span>` : diff < 0 ? `<span class="prog-trend down">▼ ${diff}</span>` : `<span class="prog-trend">＝</span>`;
    }
    const lastDays = days.slice(-7);
    const bars = progressBarChart(lastDays.map(k => hist[k][g.kind][g.key].best), lastDays.map(k => fmtDayLabel(k, false)), 'mejor puntaje');
    const starsTxt = g.kind === 'level' ? ` · ${'★'.repeat(State.stars[+g.key] || 0)}${'☆'.repeat(3 - (State.stars[+g.key] || 0))}` : '';
    return `
      <div class="prog-game">
        <div class="prog-game-top"><span class="p-name">${g.icon} ${g.name}</span>${trend}</div>
        <div class="prog-game-meta">Mejor puntaje: <b>${bestEver}</b> · ${plays} partida${plays === 1 ? '' : 's'} · ${wins} victoria${wins === 1 ? '' : 's'}${starsTxt}</div>
        <div class="prog-mini">${bars}</div>
      </div>`;
  }).join('');
  const perGame = `
    <div class="online-panel">
      <h3 class="prog-h">🎮 Cómo vas en cada juego</h3>
      <p class="prog-note">Cada barra es tu mejor puntaje de un día en que jugaste ese juego.</p>
      ${gameRows}
    </div>`;

  /* --- Temas para reforzar (los que más te has equivocado) --- */
  const mistakes = State.mistakes || {};
  const topicRows = Object.keys(mistakes)
    .map(k => ({ key:k, info:MISTAKE_TOPICS[k] || { name:k, icon:'❓' }, t:mistakes[k] }))
    .filter(r => r.t.count > 0)
    .sort((a, b) => b.t.count - a.t.count);
  const maxMistakes = topicRows.length ? topicRows[0].t.count : 1;
  const reinforce = `
    <div class="online-panel">
      <h3 class="prog-h">🎯 Temas para reforzar</h3>
      ${topicRows.length ? '<p class="prog-note">Estos son los temas en los que más te has equivocado. ¡Practícalos para mejorar!</p>' : '<p class="prog-empty">¡Muy bien! Todavía no hay errores registrados. Cuando te equivoques en algún tema, aparecerá aquí para que lo repases.</p>'}
      ${topicRows.slice(0, 6).map((r, i) => {
        const items = Object.keys(r.t.items).sort((a, b) => r.t.items[b] - r.t.items[a]).slice(0, 3);
        const pct = Math.max(8, Math.round(r.t.count / maxMistakes * 100));
        const level = r.info.level ? `<button class="modal-btn" data-practice-level="${r.info.level}" style="padding:6px 12px; font-size:11px;">Practicar ▶</button>`
                    : r.info.arena ? `<button class="modal-btn" data-practice-arena="${r.info.arena}" style="padding:6px 12px; font-size:11px;">Practicar ▶</button>` : '';
        return `
        <div class="tr-q">
          <div class="tr-q-top"><span>${r.info.icon} <b>${i === 0 ? 'Prioridad: ' : ''}${escapeHtml(r.info.name)}</b></span><b class="tr-low">${r.t.count} error${r.t.count === 1 ? '' : 'es'}</b></div>
          <div class="tr-bar"><div class="tr-bar-fill low" style="width:${pct}%"></div></div>
          ${items.length ? '<div class="prog-note" style="margin:6px 0 0;">Te cuesta: ' + items.map(x => escapeHtml(x) + ' <small>(×' + r.t.items[x] + ')</small>').join(' · ') + '</div>' : ''}
          ${level ? '<div style="margin-top:8px;">' + level + '</div>' : ''}
        </div>`;
      }).join('')}
    </div>`;

  /* --- Día por día --- */
  const nameOf = (kind, key) => { const g = gameList.find(x => x.kind === kind && x.key === key); return g ? `${g.icon} ${g.name}` : key; };
  const daysHtml = dayKeys.slice().reverse().map((k, idx) => {
    const d = hist[k];
    const rows = ['level', 'arena', 'side'].flatMap(kind =>
      Object.keys(d[kind] || {}).map(key => {
        const e = d[kind][key];
        return `<div class="prog-day-row">
          <span>${nameOf(kind, key)}</span>
          <span>${e.plays}× · ${e.wins} ✓ · mejor ${e.best}</span>
        </div>`;
      })).join('');
    return `
      <details class="prog-day" ${idx === 0 ? 'open' : ''}>
        <summary><span class="prog-day-name">${fmtDayLabel(k, true)}${k === dateKey() ? ' · hoy' : ''}</span>
          <span class="prog-day-sum">⬡ ${d.points} · 🪙 ${d.coins} · ${d.plays} partida${d.plays === 1 ? '' : 's'}</span></summary>
        ${rows}
      </details>`;
  }).join('');
  const daily = `
    <div class="online-panel">
      <h3 class="prog-h">🗓️ Día por día</h3>
      ${daysHtml || '<p class="prog-empty">Aquí aparecerá lo que juegues cada día.</p>'}
    </div>`;

  /* --- Evaluaciones --- */
  const quizRow = (State.preQuizScore != null || State.postQuizScore != null) ? `
    <div class="online-panel">
      <h3 class="prog-h">📝 Evaluaciones</h3>
      <div class="online-player-row"><span class="p-name">Evaluación inicial</span><span class="online-status-badge">${State.preQuizScore != null ? State.preQuizScore + '/10' : '—'}</span></div>
      <div class="online-player-row"><span class="p-name">Evaluación final</span><span class="online-status-badge">${State.postQuizScore != null ? State.postQuizScore + '/10' : '—'}</span></div>
    </div>` : '';

  wrap.innerHTML = summary + chart + reinforce + perGame + daily + quizRow;
  $$('[data-practice-level]', wrap).forEach(b => b.addEventListener('click', () => openMission(+b.dataset.practiceLevel)));
  $$('[data-practice-arena]', wrap).forEach(b => b.addEventListener('click', () => openArenaBrief(b.dataset.practiceArena)));
}
