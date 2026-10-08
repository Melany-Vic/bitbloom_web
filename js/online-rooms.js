/* =========================================================
   MULTIJUGADOR EN LÍNEA — salas reales entre dispositivos
   distintos, con chat en vivo, usando Firestore en tiempo
   real (onSnapshot). Requiere que Firebase esté configurado
   (ver js/firebase-init.js). Si no lo está, se avisa y se
   ofrece el modo local (mismo dispositivo) en su lugar.

   IMPORTANTE — alcance real de esta versión:
   Cada jugador juega la MISMA actividad de forma independiente
   en su propio dispositivo (no ven exactamente lo mismo en
   pantalla al mismo tiempo, como en un juego de acción en
   vivo). Lo que SÍ es en tiempo real: la lista de jugadores,
   sus puntajes apenas terminan, y el chat.
   ========================================================= */

const ONLINE_ROOM_ACTIVITIES = [
  { key:'runner',   name:'🏃 Carrera de Bits' },
  { key:'assembly', name:'🧩 Ensamblaje Bajo Presión' },
  { key:'pixel',    name:'🎨 Taller de Píxeles' },
  { key:'tunnel',   name:'🚇 Túnel de la Red' },
  { key:'energy',   name:'⚡ Carga de Volt' },
];

let onlineRoom = { active:false, code:null, isHost:false, unsubRoom:null, unsubChat:null, data:null };
window.onlineRoom = onlineRoom;

function openMultiplayerChoice(){
  showModal(`
    <h2>👥 Multijugador</h2>
    <p>¿Cómo quieren jugar?</p>
    <div class="modal-actions" style="flex-direction:column; align-items:stretch;">
      <button class="modal-btn primary" id="mpLocalBtn" style="margin-bottom:10px;">📱 Mismo dispositivo (pasarlo por turnos)</button>
      <button class="modal-btn primary" id="mpOnlineBtn">🌐 Dispositivos distintos (en línea)</button>
    </div>
  `);
  $('#mpLocalBtn').onclick = () => { hideModal(); showMultiplayerSetup(); };
  $('#mpOnlineBtn').onclick = () => { hideModal(); showOnlineSetup(); };
}

async function showOnlineSetup(){
  showScreen('#screenOnlineSetup');
  bitHide();
  const wrap = $('#onlineSetupWrap');
  wrap.innerHTML = `<p class="level-hint">Verificando conexión…</p>`;

  await FirebaseAPI.ready();
  if (!FirebaseAPI.isEnabled() || !FirebaseAPI.db()){
    wrap.innerHTML = `
      <div class="online-offline-note">
        Esta función necesita que el juego esté conectado a Firebase (ver <code>js/firebase-init.js</code>) y publicado sobre http/https — no funciona abriendo el archivo local ni en la vista previa dentro de Claude. Mientras tanto podés usar el modo "Mismo dispositivo".
      </div>
      <button class="modal-btn primary" id="onlineFallbackBtn">Usar modo mismo dispositivo</button>
    `;
    $('#onlineFallbackBtn').onclick = () => { showMultiplayerSetup(); };
    return;
  }

  const defaultName = (State.profile && State.profile.name) || '';
  wrap.innerHTML = `
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:14px; margin-bottom:10px;">Tu nombre</h3>
      <input type="text" id="onlineNameInput" class="profile-input" placeholder="Tu nombre" value="${defaultName}" maxlength="18">
    </div>
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:14px; margin-bottom:10px;">Crear una sala nueva</h3>
      <select id="onlineModeSelect" class="online-activity-select">
        <option value="competencia">🏁 Competencia — cada uno por su cuenta</option>
        <option value="cooperativo">🤝 Cooperativo — suman puntos en equipo</option>
      </select>
      <select id="onlineActivitySelect" class="online-activity-select">
        ${ONLINE_ROOM_ACTIVITIES.map(a => `<option value="${a.key}">${a.name}</option>`).join('')}
      </select>
      <button class="modal-btn primary" id="onlineCreateBtn" style="width:100%;">Crear sala ▶</button>
    </div>
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:14px; margin-bottom:10px;">Unirse con un código</h3>
      <input type="text" id="onlineJoinCode" class="profile-input" placeholder="CÓDIGO DE 4 LETRAS" maxlength="4" style="text-transform:uppercase;">
      <button class="modal-btn primary" id="onlineJoinBtn" style="width:100%; margin-top:10px;">Unirme ▶</button>
    </div>
    <p class="online-code-hint" id="onlineSetupError"></p>
  `;

  $('#onlineCreateBtn').onclick = () => createOnlineRoom();
  $('#onlineJoinBtn').onclick = () => joinOnlineRoom();
}

function randomRoomCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createOnlineRoom(){
  const name = ($('#onlineNameInput').value || 'Jugador').trim().slice(0, 18) || 'Jugador';
  const mode = $('#onlineModeSelect').value;
  const activity = $('#onlineActivitySelect').value;
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const code = randomRoomCode();

  try {
    const roomRef = fs.doc(db, 'rooms', code);
    await fs.setDoc(roomRef, {
      hostUid: uid,
      mode, activity,
      status: 'waiting',
      createdAt: Date.now(),
      players: { [uid]: { name, score: 0, finished: false } },
    });
    enterRoomLobby(code, true, name);
  } catch (err) {
    $('#onlineSetupError').textContent = 'No se pudo crear la sala. Revisá las reglas de Firestore e intentá de nuevo.';
    console.warn('createOnlineRoom', err);
  }
}

async function joinOnlineRoom(){
  const name = ($('#onlineNameInput').value || 'Jugador').trim().slice(0, 18) || 'Jugador';
  const code = ($('#onlineJoinCode').value || '').trim().toUpperCase();
  if (code.length !== 4){ $('#onlineSetupError').textContent = 'Ingresá un código de 4 letras.'; return; }
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();

  try {
    const roomRef = fs.doc(db, 'rooms', code);
    const snap = await fs.getDoc(roomRef);
    if (!snap.exists()){ $('#onlineSetupError').textContent = 'No existe una sala con ese código.'; return; }
    const data = snap.data();
    if (data.status !== 'waiting'){ $('#onlineSetupError').textContent = 'Esa sala ya empezó a jugar.'; return; }
    if (Object.keys(data.players || {}).length >= 4){ $('#onlineSetupError').textContent = 'Esa sala ya está llena (máximo 4).'; return; }

    await fs.updateDoc(roomRef, { [`players.${uid}`]: { name, score: 0, finished: false } });
    enterRoomLobby(code, data.hostUid === uid, name);
  } catch (err) {
    $('#onlineSetupError').textContent = 'No se pudo unir a la sala. Intentá de nuevo.';
    console.warn('joinOnlineRoom', err);
  }
}

function enterRoomLobby(code, isHost, myName){
  onlineRoom.active = true;
  onlineRoom.launchedRound = undefined; onlineRoom.sbSig = null; onlineRoom.restartedRound = undefined;
  onlineRoom.code = code;
  onlineRoom.isHost = isHost;
  onlineRoom.myName = myName;
  showScreen('#screenOnlineRoom');
  $('#onlineRoomCodeTitle').textContent = code;

  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs();
  const roomRef = fs.doc(db, 'rooms', code);

  onlineRoom.unsubRoom = fs.onSnapshot(roomRef, snap => {
    if (!snap.exists()){ leaveOnlineRoom(true); return; }
    onlineRoom.data = snap.data();
    renderRoomLobby();
    /* Cada ronda se lanza una sola vez (se identifica por su número) */
    const rd = onlineRoom.data.round || 0;
    if (onlineRoom.data.status === 'playing' && onlineRoom.launchedRound !== rd){
      onlineRoom.launchedRound = rd;
      onlineRoom.playingNow = true;
      hideModal();
      launchRoomActivity(onlineRoom.data.activity);
    }
  });

  const messagesRef = fs.collection(db, 'rooms', code, 'messages');
  const q = fs.query(messagesRef, fs.orderBy('createdAt', 'asc'), fs.limit(50));
  onlineRoom.unsubChat = fs.onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push(d.data()));
    renderChatMessages(msgs);
  });
}

function renderRoomLobby(){
  const wrap = $('#onlineRoomWrap');
  const data = onlineRoom.data;
  if (!data) return;
  const uid = FirebaseAPI.uid();
  const players = Object.entries(data.players || {}).filter(([, p]) => !p.left);
  const modeLabel = data.mode === 'cooperativo' ? '🤝 Cooperativo' : '🏁 Competencia';
  const activityName = (ONLINE_ROOM_ACTIVITIES.find(a => a.key === data.activity) || {}).name || data.activity;
  const allFinished = players.length > 0 && players.every(([, p]) => p.finished);
  const teamTotal = players.reduce((sum, [, p]) => sum + (p.score || 0), 0);

  wrap.innerHTML = `
    <div>
      <div class="online-panel online-code-box">
        <div class="online-code-hint">Compartí este código para que se unan (máx. 4 jugadores)</div>
        <div class="code">${onlineRoom.code}</div>
        <div class="online-code-hint">${modeLabel} · ${activityName}</div>
      </div>
      <div class="online-panel">
        <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:10px;">Jugadores (${players.length}/4)</h3>
        <div class="online-player-list" id="onlinePlayerList"></div>
        ${data.mode === 'cooperativo' && data.status !== 'waiting' ? `<p style="margin-top:12px; color:var(--spark-gold); font-family:var(--font-display); font-size:13px;">Total del equipo: ⬡ ${teamTotal}</p>` : ''}
      </div>
      ${onlineRoom.isHost && data.status === 'waiting' ? `<button class="modal-btn primary" id="onlineStartBtn" style="width:100%;">¡Empezar para todos! ▶</button>` : ''}
      ${onlineRoom.isHost && data.status === 'playing' && allFinished ? `<button class="modal-btn primary" id="onlineReplayBtn" style="width:100%;">🔁 Jugar otra ronda</button>` : ''}
      ${data.status === 'playing' && !allFinished ? `<p class="level-hint">Esperando a que todos terminen…</p>` : ''}
    </div>
    <div class="online-panel online-chat">
      <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:10px;">💬 Chat de la sala</h3>
      <div class="online-chat-quick">
        <button data-msg="👍 ¡Vamos bien!">👍 ¡Vamos bien!</button>
        <button data-msg="🆘 ¡Ayuda!">🆘 ¡Ayuda!</button>
        <button data-msg="🎉 ¡Lo logré!">🎉 ¡Lo logré!</button>
        <button data-msg="⏳ Un segundo">⏳ Un segundo</button>
      </div>
      <div class="online-chat-messages" id="onlineChatMessages"></div>
      <div class="online-chat-input-row">
        <input type="text" id="onlineChatInput" placeholder="Escribí un mensaje…" maxlength="140">
        <button id="onlineChatSend">Enviar</button>
      </div>
    </div>
  `;

  const list = $('#onlinePlayerList');
  players.forEach(([pUid, p]) => {
    const row = el('div', `online-player-row ${pUid === uid ? 'me' : ''}`);
    row.innerHTML = `
      <span class="p-name">${p.name}${pUid === data.hostUid ? ' 👑' : ''}${pUid === uid ? ' (vos)' : ''}</span>
      <span class="online-status-badge ${p.finished ? 'ready' : ''}">${p.finished ? `⬡ ${p.score}` : (data.status === 'playing' ? 'jugando…' : 'listo')}</span>
    `;
    list.appendChild(row);
  });

  const startBtn = $('#onlineStartBtn');
  if (startBtn) startBtn.onclick = startRoomActivity;
  const replayBtn = $('#onlineReplayBtn');
  if (replayBtn) replayBtn.onclick = restartRoomActivity;

  $$('.online-chat-quick button').forEach(b => b.addEventListener('click', () => sendRoomChat(b.dataset.msg)));
  $('#onlineChatSend').onclick = () => {
    const input = $('#onlineChatInput');
    if (input.value.trim()) sendRoomChat(input.value.trim());
    input.value = '';
  };
  $('#onlineChatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter'){ $('#onlineChatSend').click(); }
  });

  renderChatMessages(onlineRoom.lastMsgs || []);
  maybeShowRoomScoreboard();
}

function renderChatMessages(msgs){
  onlineRoom.lastMsgs = msgs;
  const box = $('#onlineChatMessages');
  if (!box) return;
  const uid = FirebaseAPI.uid();
  box.innerHTML = msgs.map(m => `
    <div class="online-chat-msg ${m.uid === uid ? 'mine' : ''}"><span class="who">${m.name}:</span>${m.text}</div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

async function sendRoomChat(text){
  if (!onlineRoom.active) return;
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const messagesRef = fs.collection(db, 'rooms', onlineRoom.code, 'messages');
  try {
    await fs.addDoc(messagesRef, { uid, name: onlineRoom.myName, text: text.slice(0, 140), createdAt: Date.now() });
  } catch (err) { console.warn('sendRoomChat', err); }
}

async function startRoomActivity(){
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  const resetPlayers = {};
  Object.keys(onlineRoom.data.players || {}).forEach(uid => {
    resetPlayers[`players.${uid}.finished`] = false;
    resetPlayers[`players.${uid}.score`] = 0;
    resetPlayers[`players.${uid}.vote`] = null;
  });
  await fs.updateDoc(roomRef, { status:'playing', round: ((onlineRoom.data && onlineRoom.data.round) || 0) + 1, ...resetPlayers });
}
async function restartRoomActivity(){
  onlineRoom.playingNow = false;
  await startRoomActivity();
}

function launchRoomActivity(activityKey){
  bitSay('¡Empezó la ronda de la sala! Cuando termines, tu puntaje se comparte en vivo con los demás.', 'talk', 3200);
  launchArenaGame(activityKey);
}

async function reportRoomScore(score){
  if (!onlineRoom.active) return;
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  try {
    await fs.updateDoc(roomRef, {
      [`players.${uid}.score`]: score,
      [`players.${uid}.finished`]: true,
    });
  } catch (err) { console.warn('reportRoomScore', err); }
  onlineRoom.playingNow = false;
  showScreen('#screenOnlineRoom');
}

function leaveOnlineRoom(silent){
  if (onlineRoom.unsubRoom) onlineRoom.unsubRoom();
  if (onlineRoom.unsubChat) onlineRoom.unsubChat();
  onlineRoom.active = false;
  onlineRoom.code = null;
  onlineRoom.data = null;
  onlineRoom.playingNow = false;
  if (!silent) goMenu();
}


/* =========================================================
   TABLA DE PUNTAJES AL TERMINAR CADA RONDA (salas en vivo)
   Cuando todos terminan, a todos les aparece quién ganó y la
   tabla de puntajes. Cada jugador elige "Otra ronda" o "Salir".
   La ronda nueva empieza cuando todos votaron y alguien quiere seguir.
   ========================================================= */
async function voteRoom(vote){
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  const upd = { [`players.${uid}.vote`]: vote };
  if (vote === 'leave') upd[`players.${uid}.left`] = true;
  try { await fs.updateDoc(roomRef, upd); } catch (err) { console.warn('voteRoom', err); }
  if (vote === 'leave'){ onlineRoom.sbSig = null; hideModal(); leaveOnlineRoom(); }
}

function maybeShowRoomScoreboard(){
  const data = onlineRoom.data;
  if (!data) return;
  const players = Object.entries(data.players || {}).filter(([, p]) => !p.left);
  const allFinished = data.status === 'playing' && players.length > 0 && players.every(([, p]) => p.finished);
  if (!allFinished){
    if (onlineRoom.sbSig){ onlineRoom.sbSig = null; hideModal(); }   // empezó una ronda nueva
    return;
  }
  const uid = FirebaseAPI.uid();
  const round = data.round || 1;
  const sig = round + '|' + players.map(([u, p]) => u + ':' + p.score + ':' + (p.vote || '')).join(',');
  if (sig !== onlineRoom.sbSig){
    onlineRoom.sbSig = sig;
    const sorted = players.slice().sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
    const teamTotal = players.reduce((n, [, p]) => n + (p.score || 0), 0);
    let banner;
    if (data.mode === 'cooperativo'){
      banner = `<div class="mp-winner">🤝 ¡Equipo! Sumaron ⬡ ${teamTotal}</div>`;
    } else {
      const top = sorted[0][1].score || 0;
      const winners = top > 0 ? sorted.filter(([, p]) => (p.score || 0) === top) : [];
      banner = winners.length === 0 ? '<div class="mp-winner tie">Nadie sumó puntos esta ronda</div>'
        : winners.length === 1 ? `<div class="mp-winner">🏆 ¡Ganó ${escapeHtml(winners[0][1].name)}!</div>`
        : `<div class="mp-winner tie">🤝 ¡Empate entre ${winners.map(([, p]) => escapeHtml(p.name)).join(' y ')}!</div>`;
    }
    const me = data.players[uid] || {};
    const voteIcon = v => v === 'again' ? '🔁 quiere otra' : v === 'leave' ? '🚪 sale' : '⏳ pensando…';
    showModal(`
      <h2>🏁 Ronda ${round} terminada</h2>
      ${banner}
      <div class="leaderboard-list mp-table">
        ${sorted.map(([u, p], i) => `
          <div class="leaderboard-row ${u === uid ? 'me' : ''}">
            <div class="leaderboard-rank">${data.mode !== 'cooperativo' && i === 0 && (p.score || 0) > 0 ? '🏆' : i + 1}</div>
            <div class="leaderboard-name">${escapeHtml(p.name)}${u === uid ? ' (tú)' : ''}</div>
            <div class="leaderboard-score">⬡ ${p.score || 0}</div>
            <div class="mp-wins">${voteIcon(p.vote)}</div>
          </div>`).join('')}
      </div>
      ${me.vote === 'again'
        ? '<p class="level-hint">Esperando a que los demás elijan…</p>'
        : '<p class="level-hint">¿Quieres jugar otra ronda?</p>'}
      <div class="modal-actions">
        <button class="modal-btn" id="rsLeave">🚪 Salir</button>
        <button class="modal-btn primary" id="rsAgain" ${me.vote === 'again' ? 'disabled' : ''}>🔁 Otra ronda</button>
      </div>`);
    $('#rsLeave').onclick = () => voteRoom('leave');
    $('#rsAgain').onclick = () => voteRoom('again');
  }
  // Cuando todos votaron y alguien quiere seguir, el primero (por id) inicia la ronda nueva
  const voted = players.every(([, p]) => p.vote);
  const again = players.filter(([, p]) => p.vote === 'again').map(([u]) => u).sort();
  if (voted && again.length && again[0] === uid && onlineRoom.restartedRound !== round){
    onlineRoom.restartedRound = round;
    restartRoomActivity();
  }
}
