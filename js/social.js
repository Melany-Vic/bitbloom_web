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
    tag.innerHTML = `${State.profile.role === 'profesor' ? '🧑‍🏫' : '🎓'} ${escapeHtml(State.profile.name)}
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

/* Entrar a una cuenta que ya existe en este dispositivo */
async function enterAccount(acc){
  resetLocalState();
  State.profile = { name: acc.name, role: acc.role };
  await loadProgress();
  State.profile = { name: acc.name, role: acc.role };
  setActiveAccount(State.profile);
  registerDeviceAccount(State.profile);
  refreshProfileUI();
  $('#menuCoins').textContent = State.coins;
  goMenu();
}

async function showProfileScreen(mode){
  showScreen('#screenProfile');
  bitHide();
  // En "edit" vuelve al menú; en "onboarding" también se puede volver al menú.
  $('#btnProfileBack').classList.remove('hidden');
  $('.screen-title', $('#screenProfile')).textContent = mode === 'edit' ? 'Tu perfil' : 'Cuentas';
  const wrap = $('#profileWrap');
  const current = State.profile || { name:'', role:'estudiante' };
  const accounts = getDeviceAccounts()
    .slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

  const accountsHtml = (mode === 'onboarding' && accounts.length) ? `
    <div class="account-list-box">
      <label class="profile-label">Cuentas en este dispositivo</label>
      <div class="account-list">
        ${accounts.map((a, i) => `
          <button class="account-row" data-idx="${i}">
            <span class="account-avatar">${a.role === 'profesor' ? '🧑‍🏫' : '🎓'}</span>
            <span class="account-name">${escapeHtml(a.name)}</span>
            <span class="account-role">${a.role === 'profesor' ? 'Profesor/a' : 'Estudiante'}</span>
            <span class="account-go">Entrar ▶</span>
          </button>`).join('')}
      </div>
      <div class="account-divider"><span>o crea una cuenta nueva</span></div>
    </div>` : '';

  wrap.innerHTML = `
    <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit" style="margin:0 auto 12px;">
    <p class="level-hint">${mode === 'onboarding'
      ? (accounts.length ? 'Elige tu cuenta o crea una nueva.' : '¡Antes de empezar, cuéntame quién eres!')
      : 'Actualiza tu nombre o tu rol.'}</p>
    ${accountsHtml}
    <div class="profile-form">
      <label class="profile-label">${mode === 'onboarding' ? 'Nombre de la cuenta nueva' : 'Tu nombre'}</label>
      <input type="text" id="profileNameInput" class="profile-input" maxlength="20" placeholder="Escribe tu nombre" value="${mode === 'edit' ? escapeHtml(current.name) : ''}">
      <div class="profile-error hidden" id="profileError"></div>
      <label class="profile-label">Soy...</label>
      <div class="profile-role-buttons">
        <button class="profile-role-btn ${current.role === 'estudiante' ? 'selected' : ''}" data-role="estudiante">🎓 Estudiante</button>
        <button class="profile-role-btn ${current.role === 'profesor' ? 'selected' : ''}" data-role="profesor">🧑‍🏫 Profesor/a</button>
      </div>
      <button class="modal-btn primary profile-save-btn" id="profileSaveBtn">${mode === 'onboarding' ? 'Crear cuenta y continuar ▶' : 'Guardar ▶'}</button>
    </div>
  `;

  $$('.account-row', wrap).forEach(btn => {
    btn.addEventListener('click', () => enterAccount(accounts[+btn.dataset.idx]));
  });

  let selectedRole = current.role || 'estudiante';
  $$('.profile-role-btn', wrap).forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRole = btn.dataset.role;
      $$('.profile-role-btn', wrap).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  const showError = (msg) => { const e = $('#profileError'); e.textContent = msg; e.classList.remove('hidden'); };

  $('#profileSaveBtn').addEventListener('click', async () => {
    const name = $('#profileNameInput').value.trim().slice(0, 20);
    if (!name){ showError('Escribe un nombre para tu cuenta.'); return; }
    const sameSlug = State.profile && slugifyProfileName(State.profile.name) === slugifyProfileName(name);

    if (mode === 'onboarding'){
      if (deviceAccountExists(name)){
        showError('Ya existe una cuenta con ese nombre en este dispositivo. Elígela en la lista o usa otro nombre.');
        return;
      }
      resetLocalState();                       // cuenta nueva = progreso en cero
      State.profile = { name, role: selectedRole };
      refreshProfileUI();
      await saveProgress();
      startQuiz('pre');
      return;
    }

    // Edición del perfil actual
    if (!sameSlug && deviceAccountExists(name)){
      showError('Ya existe otra cuenta con ese nombre en este dispositivo.');
      return;
    }
    const oldName = State.profile ? State.profile.name : null;
    State.profile = { name, role: selectedRole };
    if (oldName && !sameSlug) removeDeviceAccount(oldName);  // el nombre cambió: se mueve el progreso
    refreshProfileUI();
    await saveProgress();
    goMenu();
  });
}

/* =========================================================
   TABLA DE CLASIFICACIÓN — almacenamiento compartido
   Visible para cualquiera que juegue este BitBloom. Guarda el
   mejor puntaje de cada nombre de jugador.
   ========================================================= */
const LEADERBOARD_KEY = 'bitbloom-leaderboard';

async function submitToLeaderboard(){
  try {
    if (!AppStorage || !State.profile) return;
    let list = [];
    try {
      const res = await AppStorage.get(LEADERBOARD_KEY, true);
      if (res && res.value) list = JSON.parse(res.value);
    } catch (e) { list = []; }

    const idx = list.findIndex(p => p.name === State.profile.name && p.role === State.profile.role);
    const entry = { name: State.profile.name, role: State.profile.role, score: State.score, coins: State.coins, date: Date.now() };
    if (idx >= 0){
      if (entry.score >= list[idx].score) list[idx] = entry;
    } else {
      list.push(entry);
    }
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 30);
    await AppStorage.set(LEADERBOARD_KEY, JSON.stringify(list), true);
  } catch (e) {
    // Sin conexión a la base de datos compartida; se omite el envío.
  }
}

async function showLeaderboardScreen(){
  showScreen('#screenLeaderboard');
  bitHide();
  const wrap = $('#leaderboardWrap');
  wrap.innerHTML = `<p class="level-hint">Cargando clasificación compartida...</p>`;
  await renderLeaderboard();
}

async function renderLeaderboard(){
  const wrap = $('#leaderboardWrap');
  try {
    if (!AppStorage) throw new Error('sin storage');
    const res = await AppStorage.get(LEADERBOARD_KEY, true);
    const list = (res && res.value) ? JSON.parse(res.value) : [];
    if (!list.length){
      wrap.innerHTML = `<p class="level-hint">Todavía nadie aparece en la clasificación. ¡Completá un nivel para ser el primero!</p>`;
      return;
    }
    wrap.innerHTML = `
      <p class="level-hint">Visible para todos los que jueguen BitBloom. Se actualiza con tu mejor puntaje.</p>
      <div class="leaderboard-list">
        ${list.map((p, i) => `
          <div class="leaderboard-row ${State.profile && p.name === State.profile.name ? 'me' : ''}">
            <div class="leaderboard-rank">${i + 1}</div>
            <div class="leaderboard-name">${p.role === 'profesor' ? '🧑‍🏫' : '🎓'} ${escapeHtml(p.name)}</div>
            <div class="leaderboard-score">⬡ ${p.score}</div>
            <div class="leaderboard-coins">🪙 ${p.coins}</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = `<p class="level-hint">No se pudo cargar la clasificación compartida en este momento (esto funciona cuando el juego corre dentro de Claude). Intentá de nuevo más tarde.</p>`;
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
        <div class="prog-stat"><b>${State.score}</b><span>puntos totales</span></div>
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

  wrap.innerHTML = summary + chart + perGame + daily + quizRow;
}
