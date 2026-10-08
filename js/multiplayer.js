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
    players: names.map(name => ({ name, turnScore: 0, stars: 0, won: false, wins: 0, total: 0 })),
    mode, levelId, currentIndex: 0, round: 1,
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
  const S = mpSession;
  const sorted = [...S.players].sort((a, b) => b.turnScore - a.turnScore);
  const teamTotal = S.players.reduce((sum, p) => sum + p.turnScore, 0);
  S.players.forEach(p => { p.total += p.turnScore; });

  let banner = '';
  if (S.mode === 'competencia'){
    const top = sorted[0].turnScore;
    const winners = top > 0 ? sorted.filter(p => p.turnScore === top) : [];
    winners.forEach(p => p.wins++);
    banner = winners.length === 0
      ? '<div class="mp-winner tie">Nadie sumó puntos esta ronda</div>'
      : winners.length === 1
        ? `<div class="mp-winner">🏆 ¡Ganó ${escapeHtml(winners[0].name)}!</div>`
        : `<div class="mp-winner tie">🤝 ¡Empate entre ${winners.map(w => escapeHtml(w.name)).join(' y ')}!</div>`;
  } else {
    banner = `<div class="mp-winner">🤝 ¡Equipo! Sumaron ⬡ ${teamTotal}</div>`;
  }

  wrap.innerHTML = `
    <h2 style="text-align:center;margin-bottom:6px;">🏁 Ronda ${S.round} · Tabla de puntajes</h2>
    ${banner}
    <div class="leaderboard-list mp-table">
      <div class="leaderboard-row mp-head"><div class="leaderboard-rank">#</div><div class="leaderboard-name">Jugador</div><div class="leaderboard-score">Ronda</div><div class="leaderboard-coins">Total</div><div class="mp-wins">Victorias</div></div>
      ${sorted.map((p, i) => `
        <div class="leaderboard-row ${i === 0 && S.mode === 'competencia' && p.turnScore > 0 ? 'me' : ''}">
          <div class="leaderboard-rank">${S.mode === 'competencia' && i === 0 && p.turnScore > 0 ? '🏆' : i + 1}</div>
          <div class="leaderboard-name">${escapeHtml(p.name)} <small>${'★'.repeat(p.stars)}${'☆'.repeat(3 - p.stars)}</small></div>
          <div class="leaderboard-score">⬡ ${p.turnScore}</div>
          <div class="leaderboard-coins">⬡ ${p.total}</div>
          <div class="mp-wins">${S.mode === 'competencia' ? '🏅 ' + p.wins : '—'}</div>
        </div>`).join('')}
    </div>
    <p class="level-hint">¿Quieren jugar otra ronda?</p>
    <div class="modal-actions">
      <button class="modal-btn" id="mpBackMenu">🚪 No, salir</button>
      <button class="modal-btn primary" id="mpAgain">🔁 Otra ronda</button>
    </div>
  `;
  $('#mpBackMenu').addEventListener('click', () => { mpSession = null; goMenu(); });
  $('#mpAgain').addEventListener('click', () => {
    S.round++;
    S.currentIndex = 0;
    S.players.forEach(p => { p.turnScore = 0; p.stars = 0; p.won = false; });
    mpNextTurn();
  });
}
