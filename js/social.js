/* =========================================================
   PERFIL — nombre y rol (alumno/profesor). No es una cuenta
   real con contraseña: es solo una identidad para mostrar en
   la tabla de clasificación y en el panel del profesor.
   ========================================================= */
function refreshProfileUI(){
  const tag = $('#menuProfileTag');
  const teacherBtn = $('#btnTeacher');
  if (State.profile){
    tag.innerHTML = `${State.profile.role === 'profesor' ? '🧑‍🏫' : '🎓'} ${State.profile.name} <button class="profile-edit-link" id="profileEditLink">editar</button>`;
    teacherBtn.classList.toggle('hidden', State.profile.role !== 'profesor');
    $('#profileEditLink').addEventListener('click', () => showProfileScreen('edit'));
  } else {
    tag.innerHTML = '';
    teacherBtn.classList.add('hidden');
  }
}

function showProfileScreen(mode){
  showScreen('#screenProfile');
  bitHide();
  $('#btnProfileBack').classList.toggle('hidden', mode !== 'edit');
  const wrap = $('#profileWrap');
  const current = State.profile || { name:'', role:'estudiante' };
  wrap.innerHTML = `
    <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit" style="margin:0 auto 16px;">
    <p class="level-hint">${mode === 'onboarding' ? '¡Antes de empezar, contame quién sos!' : 'Actualizá tu nombre o tu rol.'}</p>
    <div class="profile-form">
      <label class="profile-label">Tu nombre</label>
      <input type="text" id="profileNameInput" class="profile-input" maxlength="20" placeholder="Escribí tu nombre" value="${current.name || ''}">
      <label class="profile-label">Soy...</label>
      <div class="profile-role-buttons">
        <button class="profile-role-btn ${current.role === 'estudiante' ? 'selected' : ''}" data-role="estudiante">🎓 Estudiante</button>
        <button class="profile-role-btn ${current.role === 'profesor' ? 'selected' : ''}" data-role="profesor">🧑‍🏫 Profesor/a</button>
      </div>
      <button class="modal-btn primary profile-save-btn" id="profileSaveBtn">Guardar y continuar ▶</button>
    </div>
  `;
  let selectedRole = current.role || 'estudiante';
  $$('.profile-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRole = btn.dataset.role;
      $$('.profile-role-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  $('#profileSaveBtn').addEventListener('click', () => {
    const name = $('#profileNameInput').value.trim().slice(0, 20) || 'Explorador';
    State.profile = { name, role: selectedRole };
    saveProgress();
    refreshProfileUI();
    if (mode === 'onboarding'){
      if (!State.onboardingDone) startQuiz('pre');
      else goLevels();
    } else {
      goMenu();
    }
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
            <div class="leaderboard-name">${p.role === 'profesor' ? '🧑‍🏫' : '🎓'} ${p.name}</div>
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
