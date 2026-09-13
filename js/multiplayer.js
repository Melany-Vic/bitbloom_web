/* =========================================================
   MULTIJUGADOR LOCAL — mismo dispositivo, por turnos.
   No hay red en vivo ni chat: cada jugador juega su turno y
   se pasa el dispositivo al siguiente. Al final se comparan
   los puntajes (Competencia) o se suman (Cooperativo).
   ========================================================= */
let mpSession = null;

function showMultiplayerSetup(){
  showScreen('#screenMultiplayer');
  bitHide();
  mpRenderSetup(2);
}

function mpRenderSetup(numPlayers){
  const wrap = $('#mpWrap');
  const nameInputs = Array.from({ length: numPlayers }, (_, i) => `
    <input type="text" class="profile-input mp-name-input" data-i="${i}" maxlength="16"
      placeholder="Nombre del jugador ${i + 1}" value="${State.profile && i === 0 ? State.profile.name : ''}">
  `).join('');
  const levelOptions = LEVELS.map(lv => `<option value="${lv.id}">Nivel ${lv.id} · ${lv.name}</option>`).join('');

  wrap.innerHTML = `
    <p class="level-hint">Jueguen de a 2, 3 o 4 en el mismo dispositivo, pasándoselo por turnos. No hay chat en vivo ni conexión entre dispositivos distintos — es modo local.</p>
    <div class="mp-form">
      <label class="profile-label">Cantidad de jugadores</label>
      <div class="profile-role-buttons" id="mpCountButtons">
        ${[2,3,4].map(n => `<button class="profile-role-btn ${n === numPlayers ? 'selected' : ''}" data-count="${n}">${n} jugadores</button>`).join('')}
      </div>

      <label class="profile-label">Nombres</label>
      <div class="mp-names">${nameInputs}</div>

      <label class="profile-label">Modo de juego</label>
      <div class="profile-role-buttons" id="mpModeButtons">
        <button class="profile-role-btn selected" data-mode="competencia">🏁 Competencia (cada uno por su cuenta)</button>
        <button class="profile-role-btn" data-mode="cooperativo">🤝 Cooperativo (suman puntos en equipo)</button>
      </div>

      <label class="profile-label">Nivel a jugar</label>
      <select class="profile-input" id="mpLevelSelect">${levelOptions}</select>

      <button class="modal-btn primary profile-save-btn" id="mpStartBtn">¡Empezar! ▶</button>
    </div>
  `;

  $$('#mpCountButtons .profile-role-btn').forEach(btn => {
    btn.addEventListener('click', () => mpRenderSetup(Number(btn.dataset.count)));
  });
  $$('#mpModeButtons .profile-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#mpModeButtons .profile-role-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  $('#mpStartBtn').addEventListener('click', () => mpStart(numPlayers));
}

function mpStart(numPlayers){
  const names = $$('.mp-name-input').map((inp, i) => inp.value.trim().slice(0, 16) || `Jugador ${i + 1}`);
  const mode = $('#mpModeButtons .profile-role-btn.selected').dataset.mode;
  const levelId = Number($('#mpLevelSelect').value);
  mpSession = {
    players: names.map(name => ({ name, turnScore: 0, stars: 0, won: false })),
    mode, levelId, currentIndex: 0,
  };
  mpNextTurn();
}

function mpNextTurn(){
  if (!mpSession || mpSession.currentIndex >= mpSession.players.length){
    mpShowResults();
    return;
  }
  const player = mpSession.players[mpSession.currentIndex];
  const lv = LEVELS.find(l => l.id === mpSession.levelId);
  showModal(`
    <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit">
    <h2>Turno de ${player.name}</h2>
    <p>Pasá el dispositivo a <strong class="accent-cyan">${player.name}</strong>. Va a jugar: <strong>${lv.icon} ${lv.name}</strong>.</p>
    <div class="modal-actions">
      <button class="modal-btn" id="mpQuit">Salir del multijugador</button>
      <button class="modal-btn primary" id="mpReady">Listo, ¡comenzar! ▶</button>
    </div>
  `);
  $('#mpQuit').onclick = () => { hideModal(); mpSession = null; goMenu(); };
  $('#mpReady').onclick = () => {
    hideModal();
    const preScore = State.score;
    State.mpTurnCallback = (id, won, stars, message) => {
      const turnScore = Math.max(0, State.score - preScore);
      player.turnScore = turnScore;
      player.stars = stars;
      player.won = won;
      showModal(`
        <img src="assets/characters/bit.png" class="mission-avatar" alt="Bit">
        <h2>${won ? '¡Turno completo!' : 'No se logró esta vez'}</h2>
        <p>${message}</p>
        <p>Puntos conseguidos en este turno: <strong class="accent-gold">⬡ ${turnScore}</strong></p>
        <div class="modal-actions">
          <button class="modal-btn primary" id="mpTurnContinue">Continuar ▶</button>
        </div>
      `);
      $('#mpTurnContinue').onclick = () => {
        hideModal();
        mpSession.currentIndex++;
        mpNextTurn();
      };
    };
    openMission(mpSession.levelId);
  };
}

function mpShowResults(){
  const wrap = $('#mpWrap');
  showScreen('#screenMultiplayer');
  const sorted = [...mpSession.players].sort((a, b) => b.turnScore - a.turnScore);
  const teamTotal = mpSession.players.reduce((sum, p) => sum + p.turnScore, 0);

  if (mpSession.mode === 'competencia'){
    wrap.innerHTML = `
      <h2 style="text-align:center;margin-bottom:14px;">🏁 Resultados de la competencia</h2>
      <div class="leaderboard-list">
        ${sorted.map((p, i) => `
          <div class="leaderboard-row ${i === 0 ? 'me' : ''}">
            <div class="leaderboard-rank">${i === 0 ? '🏆' : i + 1}</div>
            <div class="leaderboard-name">${p.name}</div>
            <div class="leaderboard-score">⬡ ${p.turnScore}</div>
            <div class="leaderboard-coins">${'★'.repeat(p.stars)}${'☆'.repeat(3 - p.stars)}</div>
          </div>
        `).join('')}
      </div>
      <button class="modal-btn primary profile-save-btn" id="mpBackMenu">Volver al menú</button>
    `;
  } else {
    wrap.innerHTML = `
      <h2 style="text-align:center;margin-bottom:14px;">🤝 Resultado del equipo</h2>
      <p class="level-hint">¡Entre todos sumaron esto jugando en equipo!</p>
      <div class="mp-team-total">⬡ ${teamTotal}</div>
      <div class="leaderboard-list">
        ${mpSession.players.map(p => `
          <div class="leaderboard-row">
            <div class="leaderboard-name">${p.name}</div>
            <div class="leaderboard-score">⬡ ${p.turnScore}</div>
          </div>
        `).join('')}
      </div>
      <button class="modal-btn primary profile-save-btn" id="mpBackMenu">Volver al menú</button>
    `;
  }
  $('#mpBackMenu').addEventListener('click', () => { mpSession = null; goMenu(); });
}
