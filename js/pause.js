/* =========================================================
   MENÚ DE LA ✕ — Pausar · Continuar · Salir
   Sirve para todos los juegos: niveles del mapa y juegos de la Arena.
   Al tocar la ✕ el juego se detiene (tiempo, caída de objetos, movimiento).
   ========================================================= */
const GamePause = { active:false, kind:null };

function gamePause(kind){
  if (GamePause.active) return;
  GamePause.active = true; GamePause.kind = kind;
  if (kind === 'arena'){
    const sc = (typeof arenaLiveScene === 'function') ? arenaLiveScene() : null;
    if (sc && sc.scene && sc.scene.isActive()){ sc.scene.pause(); GamePause.scene = sc; }
  } else {
    pauseLevelTimer();
    if (State.currentLevelId === 5 && typeof l5Pause === 'function') l5Pause();
    const scr = document.getElementById('screenGame'); if (scr) scr.classList.add('game-paused');
  }
}

function gameResume(){
  if (!GamePause.active) return;
  const kind = GamePause.kind;
  GamePause.active = false;
  removeResumeFab();
  if (kind === 'arena'){
    if (GamePause.scene && GamePause.scene.scene){ try { GamePause.scene.scene.resume(); } catch (e) {} }
    GamePause.scene = null;
  } else {
    resumeLevelTimer();
    if (State.currentLevelId === 5 && typeof l5Resume === 'function') l5Resume();
    const scr = document.getElementById('screenGame'); if (scr) scr.classList.remove('game-paused');
  }
}

function removeResumeFab(){ const f = document.getElementById('resumeFab'); if (f) f.remove(); }
function showResumeFab(){
  removeResumeFab();
  const f = document.createElement('button');
  f.id = 'resumeFab'; f.className = 'resume-fab';
  f.innerHTML = '⏸ En pausa · <b>▶ Continuar</b>';
  f.addEventListener('click', () => { gameResume(); });
  document.body.appendChild(f);
}

/* Se llama al salir de cualquier pantalla de juego */
function gamePauseReset(){
  GamePause.active = false; GamePause.scene = null;
  removeResumeFab();
  const scr = document.getElementById('screenGame'); if (scr) scr.classList.remove('game-paused');
}

function openPauseMenu(kind){
  if (!document.body.classList.contains('in-game')) return;
  gamePause(kind);
  removeResumeFab();
  showModal(`
    <h2>⏸ Juego en pausa</h2>
    <p class="level-hint" style="margin-top:0;">Tu partida está detenida. ¿Qué quieres hacer?</p>
    <div class="pause-actions">
      <button class="modal-btn primary" id="pmResume">▶ Continuar</button>
      <button class="modal-btn" id="pmKeep">⏸ Seguir en pausa</button>
      <button class="modal-btn pause-exit" id="pmExit">🚪 Salir del juego</button>
    </div>
    <p class="level-hint" id="pmNote" style="min-height:18px; margin:8px 0 0;"></p>
  `);
  $('#pmResume').onclick = () => { hideModal(); gameResume(); };
  $('#pmKeep').onclick = () => { hideModal(); showResumeFab(); };      // el menú se cierra pero el juego sigue detenido
  let armed = false;
  $('#pmExit').onclick = () => {
    if (!armed){
      armed = true;
      $('#pmExit').textContent = '⚠ Toca otra vez para salir';
      $('#pmNote').textContent = 'Si sales, se pierde el progreso de este intento.';
      return;
    }
    hideModal();
    const wasKind = GamePause.kind;
    gamePauseReset();
    if (wasKind === 'arena') exitArenaGame();
    else {
      stopActiveTimer();
      if (typeof l5Pause === 'function') l5Pause();
      if (typeof mpSession !== 'undefined' && mpSession){ mpSession = null; State.mpTurnCallback = null; goMenu(); }
      else goLevels();
    }
  };
}

/* Teclado: Esc o P abren el menú de pausa */
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && document.body.classList.contains('in-game')){
    const ov = document.getElementById('modalOverlay');
    if (ov && !ov.classList.contains('hidden')) return;        // ya hay una ventana abierta
    openPauseMenu(document.body.classList.contains('in-arena') ? 'arena' : 'level');
  }
});
