/* =========================================================
   MULTIJUGADOR EN LÍNEA — salas reales entre dispositivos
   distintos (hasta 4 jugadores), con chat en vivo, usando
   Firestore en tiempo real.

   Modos:
   🏁 Competencia — cada uno por su cuenta
   🤝 Cooperativo — suman puntos en equipo y pueden regalarse
                    vidas, tiempo, diamantes y monedas
   👥 Dúos 2 vs 2 — 4 jugadores se dividen en dos dúos con nombre
                    y compiten para ver qué dúo gana

   Cada jugador juega la MISMA actividad en su dispositivo. En
   tiempo real: lista de jugadores, puntajes, regalos, chat e
   invitaciones.
   ========================================================= */

const ONLINE_ROOM_ACTIVITIES = [
  { key:'runner',   name:'🏃 Carrera de Bits' },
  { key:'assembly', name:'🧩 Ensamblaje Bajo Presión' },
  { key:'pixel',    name:'🎨 Taller de Píxeles' },
  { key:'tunnel',   name:'🚇 Túnel de la Red' },
  { key:'energy',   name:'⚡ Carga de Volt' },
];
const ROOM_MAX = 4;
const ROOM_MODES = {
  competencia: '🏁 Competencia',
  cooperativo: '🤝 Cooperativo',
  duos:        '👥 Dúos 2 vs 2',
};
const GIFT_KINDS = {
  life:  { icon:'❤️', label:'1 vida extra',      amount:1 },
  time:  { icon:'⏱️', label:'tiempo extra (+25 s)', amount:1 },
  gem:   { icon:'💎', label:'1 diamante',         amount:1 },
  coins: { icon:'🪙', label:'50 monedas',         amount:50 },
};

let onlineRoom = { active:false, code:null, isHost:false, unsubRoom:null, unsubChat:null, data:null };
window.onlineRoom = onlineRoom;

/* ---------- Utilidades de la sala ---------- */
function roomPlayers(data){ return Object.entries((data && data.players) || {}).filter(([, p]) => !p.left); }
function isTeamMode(data){ return data && (data.mode === 'cooperativo' || data.mode === 'duos'); }
function partnersOf(data, uid){
  const me = (data.players || {})[uid];
  return roomPlayers(data).filter(([u, p]) => u !== uid && (data.mode !== 'duos' || (me && p.team === me.team)));
}
function duoName(data, t){ return ((data.teams || {})[t] || {}).name || ('Dúo ' + t); }

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
        Esta función necesita que el juego esté conectado a Firebase (ver <code>js/firebase-init.js</code>) y publicado sobre http/https — no funciona abriendo el archivo local ni en la vista previa dentro de Claude. Mientras tanto puedes usar el modo "Mismo dispositivo".
      </div>
      <button class="modal-btn primary" id="onlineFallbackBtn">Usar modo mismo dispositivo</button>
    `;
    $('#onlineFallbackBtn').onclick = () => { showMultiplayerSetup(); };
    return;
  }

  const defaultName = (State.profile && State.profile.name) || '';
  wrap.innerHTML = `
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:14px; margin-bottom:10px;">Tu nombre en la sala</h3>
      <input type="text" id="onlineNameInput" class="profile-input" placeholder="Tu nombre" value="${escapeHtml(defaultName)}" maxlength="18">
    </div>
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:14px; margin-bottom:10px;">Crear una sala nueva</h3>
      <select id="onlineModeSelect" class="online-activity-select">
        <option value="competencia">🏁 Competencia — cada uno por su cuenta</option>
        <option value="cooperativo">🤝 Cooperativo — suman puntos y se regalan ayudas</option>
        <option value="duos">👥 Dúos 2 vs 2 — 4 jugadores, dos dúos compiten</option>
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

function cleanRoomName(raw){
  const name = (raw || 'Jugador').trim().slice(0, 18) || 'Jugador';
  const m = checkText(name);
  return m.ok ? { ok:true, name } : { ok:false, reason:m.reason };
}

async function createOnlineRoom(){
  const nm = cleanRoomName($('#onlineNameInput').value);
  if (!nm.ok){ $('#onlineSetupError').textContent = '🚫 Ese nombre no está permitido. ' + nm.reason; return; }
  const name = nm.name;
  const mode = $('#onlineModeSelect').value;
  const activity = $('#onlineActivitySelect').value;
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();

  try {
    /* Se busca un código libre para no pisar la sala de otra persona */
    let code = randomRoomCode();
    for (let i = 0; i < 6; i++){
      const ex = await fs.getDoc(fs.doc(db, 'rooms', code));
      if (!ex.exists() || (ex.data().createdAt || 0) < Date.now() - 6 * 3600 * 1000) break;
      code = randomRoomCode();
    }
    const roomRef = fs.doc(db, 'rooms', code);
    const me = { name, score: 0, finished: false };
    if (mode === 'duos') me.team = 'A';
    const room = {
      hostUid: uid, mode, activity, status: 'waiting', round: 0, createdAt: Date.now(),
      players: { [uid]: me },
    };
    if (mode === 'duos') room.teams = { A:{ name:'Dúo A' }, B:{ name:'Dúo B' } };
    await fs.setDoc(roomRef, room);
    enterRoomLobby(code, true, name);
  } catch (err) {
    $('#onlineSetupError').textContent = 'No se pudo crear la sala. Revisa las reglas de Firestore e inténtalo de nuevo.';
    console.warn('createOnlineRoom', err);
  }
}

/* Entra a una sala (con transacción: nunca pasa de 4 jugadores aunque dos entren a la vez) */
async function joinRoomByCode(code, rawName){
  const nm = cleanRoomName(rawName);
  if (!nm.ok) return { ok:false, error:'🚫 Ese nombre no está permitido. ' + nm.reason };
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const roomRef = fs.doc(db, 'rooms', code);
  let hostUid = null, finalName = nm.name;
  try {
    await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) throw new Error('NOEXISTE');
      const d = snap.data();
      hostUid = d.hostUid;
      const mine = (d.players || {})[uid];
      if (mine && !mine.left){ finalName = mine.name; return; }                  // ya estabas dentro
      if (d.status !== 'waiting') throw new Error('EMPEZO');
      const active = Object.entries(d.players || {}).filter(([, p]) => !p.left);
      if (active.length >= ROOM_MAX) throw new Error('LLENA');
      // nombre repetido -> se agrega un número
      let n = nm.name, k = 2;
      const taken = () => active.some(([, p]) => (p.name || '').toLowerCase() === n.toLowerCase());
      while (taken()) n = nm.name.slice(0, 15) + ' ' + (k++);
      finalName = n;
      const p = { name:n, score:0, finished:false };
      if (d.mode === 'duos'){
        const a = active.filter(([, q]) => q.team === 'A').length, b = active.filter(([, q]) => q.team === 'B').length;
        p.team = a <= b ? 'A' : 'B';
      }
      tx.update(roomRef, { [`players.${uid}`]: p });
    });
  } catch (err) {
    const msg = String(err && err.message || err);
    if (msg.includes('NOEXISTE')) return { ok:false, error:'No existe una sala con ese código.' };
    if (msg.includes('EMPEZO'))   return { ok:false, error:'Esa sala ya empezó a jugar.' };
    if (msg.includes('LLENA'))    return { ok:false, error:'Esa sala ya está llena (máximo 4).' };
    console.warn('joinRoomByCode', err);
    return { ok:false, error:'No se pudo unir a la sala. Inténtalo de nuevo.' };
  }
  enterRoomLobby(code, hostUid === uid, finalName);
  return { ok:true };
}

async function joinOnlineRoom(){
  const code = ($('#onlineJoinCode').value || '').trim().toUpperCase();
  if (code.length !== 4){ $('#onlineSetupError').textContent = 'Ingresa un código de 4 letras.'; return; }
  const r = await joinRoomByCode(code, $('#onlineNameInput').value);
  if (!r.ok) $('#onlineSetupError').textContent = r.error;
}

function enterRoomLobby(code, isHost, myName){
  onlineRoom.active = true;
  onlineRoom.launchedRound = undefined; onlineRoom.sbSig = null; onlineRoom.restartedRound = undefined;
  onlineRoom.code = code;
  onlineRoom.isHost = isHost;
  onlineRoom.myName = myName;
  onlineRoom.joinedAt = Date.now();
  onlineRoom.strikes = 0; onlineRoom.muteUntil = 0;
  onlineRoom.chatCollapsed = false; onlineRoom.chatClearedAt = 0; onlineRoom.lastTotal = null; onlineRoom.chatUnread = 0;
  showScreen('#screenOnlineRoom');
  $('#onlineRoomCodeTitle').textContent = code;

  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs();
  const roomRef = fs.doc(db, 'rooms', code);

  onlineRoom.unsubRoom = fs.onSnapshot(roomRef, snap => {
    if (!snap.exists()){ leaveOnlineRoom(true, true); return; }
    onlineRoom.data = snap.data();
    const uid = FirebaseAPI.uid();
    onlineRoom.isHost = onlineRoom.data.hostUid === uid;
    renderRoomLobby();
    updateGiftFab();
    /* Cada ronda se lanza una sola vez (se identifica por su número) */
    const rd = onlineRoom.data.round || 0;
    const me = (onlineRoom.data.players || {})[uid];
    if (onlineRoom.data.status === 'playing' && onlineRoom.launchedRound !== rd && me && !me.left){
      onlineRoom.launchedRound = rd;
      onlineRoom.playingNow = true;
      hideModal();
      launchRoomActivity(onlineRoom.data.activity);
    }
  });

  /* Solo se escuchan los últimos 30 mensajes, para que el chat no se llene */
  const messagesRef = fs.collection(db, 'rooms', code, 'messages');
  const q = fs.query(messagesRef, fs.orderBy('createdAt', 'desc'), fs.limit(30));
  onlineRoom.unsubChat = fs.onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push(d.data()));
    msgs.reverse();
    processGifts(msgs);
    renderChatMessages(msgs);
  });
}

/* Enlace que abre el juego y propone unirse a la sala */
function roomInviteLink(){
  return location.origin + location.pathname + '?sala=' + onlineRoom.code;
}
function roomInviteText(){
  const d = onlineRoom.data || {};
  return `🎮 ¡Te invito a jugar BitBloom conmigo! (${ROOM_MODES[d.mode] || 'Multijugador'}) Entra a mi sala con el código ${onlineRoom.code}: ${roomInviteLink()}`;
}
function shareRoomWhatsApp(){
  window.open('https://wa.me/?text=' + encodeURIComponent(roomInviteText()), '_blank');
}
function shareRoomCode(){
  const text = roomInviteText();
  if (navigator.share){ navigator.share({ title:'BitBloom', text }).catch(() => {}); }
  else if (navigator.clipboard){ navigator.clipboard.writeText(text).then(() => showToast('📋 Código copiado')).catch(() => showToast(text)); }
  else showToast(text);
}

/* ---------- Pantalla de la sala ---------- */
function renderRoomLobby(){
  const wrap = $('#onlineRoomWrap');
  // se conserva lo que estabas escribiendo (chat o nombre del dúo) aunque la sala se actualice
  const keep = {};
  ['onlineChatInput', 'duoNameA', 'duoNameB', 'inviteInput'].forEach(id => {
    const n = document.getElementById(id);
    if (n) keep[id] = { v:n.value, focus:document.activeElement === n, s:n.selectionStart, e:n.selectionEnd };
  });
  const data = onlineRoom.data;
  if (!data) return;
  const uid = FirebaseAPI.uid();
  const players = roomPlayers(data);
  const modeLabel = ROOM_MODES[data.mode] || data.mode;
  const activityName = (ONLINE_ROOM_ACTIVITIES.find(a => a.key === data.activity) || {}).name || data.activity;
  const allFinished = players.length > 0 && players.every(([, p]) => p.finished);
  const teamTotal = players.reduce((sum, [, p]) => sum + (p.score || 0), 0);
  const waiting = data.status === 'waiting';
  const me = (data.players || {})[uid] || {};

  const duosHtml = data.mode === 'duos' ? `
    <div class="online-panel">
      <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:6px;">👥 Los dúos</h3>
      <p class="level-hint" style="margin:0 0 10px;">Cada dúo elige su nombre. Se necesitan 4 jugadores: 2 en cada dúo.</p>
      <div class="duo-grid">
        ${['A', 'B'].map(t => {
          const members = players.filter(([, p]) => p.team === t);
          const mine = me.team === t;
          const total = members.reduce((n, [, p]) => n + (p.score || 0), 0);
          return `
          <div class="duo-card ${mine ? 'mine' : ''}">
            <input class="profile-input duo-name" id="duoName${t}" maxlength="20" value="${escapeHtml(duoName(data, t))}" ${mine && waiting ? '' : 'disabled'} placeholder="Nombre del dúo">
            <div class="duo-members">${members.map(([u, p]) => `<div>${escapeHtml(p.name)}${u === data.hostUid ? ' 👑' : ''}${u === uid ? ' (tú)' : ''}${data.status !== 'waiting' && p.finished ? ' · ⬡ ' + (p.score || 0) : ''}</div>`).join('') || '<div class="duo-empty">(vacío)</div>'}
              ${members.length < 2 ? '<div class="duo-empty">+ falta 1 jugador</div>' : ''}</div>
            ${data.status !== 'waiting' ? `<div class="duo-total">Total: ⬡ ${total}</div>` : ''}
            ${!mine && waiting && members.length < 2 ? `<button class="modal-btn duo-join" data-team="${t}">Pasarme a este dúo</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  const canInvite = waiting && players.length < ROOM_MAX;
  const partners = isTeamMode(data) ? partnersOf(data, uid) : [];

  wrap.innerHTML = `
    <div>
      <div class="online-panel online-code-box">
        <div class="online-code-hint">Comparte este código para que se unan (máx. ${ROOM_MAX} jugadores)</div>
        <div class="code">${onlineRoom.code}</div>
        <div class="online-code-hint">${modeLabel} · ${activityName}</div>
        <button class="modal-btn" id="shareCodeBtn" style="margin-top:8px;">📋 Compartir código</button>
      </div>
      <div class="online-panel">
        <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:10px;">Jugadores (${players.length}/${ROOM_MAX})</h3>
        <div class="online-player-list" id="onlinePlayerList"></div>
        ${data.mode === 'cooperativo' && data.status !== 'waiting' ? `<p style="margin-top:12px; color:var(--spark-gold); font-family:var(--font-display); font-size:13px;">Total del equipo: ⬡ ${teamTotal}</p>` : ''}
      </div>
      ${duosHtml}
      ${canInvite ? `
      <div class="online-panel">
        <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:8px;">📨 Invitar a un amigo</h3>
        <p class="level-hint" style="margin:0 0 8px;">Dentro del juego: escribe su nombre de usuario (si está en línea, le aparece al instante). O envíala por WhatsApp.</p>
        <div class="online-chat-input-row">
          <input type="text" id="inviteInput" placeholder="Nombre de usuario" maxlength="20">
          <button id="inviteBtn">Invitar</button>
        </div>
        <p class="level-hint" id="inviteMsg" style="margin:6px 0 0;"></p>
        <button class="modal-btn wa-btn" id="inviteWaBtn">📲 Invitar por WhatsApp</button>
      </div>` : ''}
      ${isTeamMode(data) ? `
      <div class="online-panel">
        <h3 style="font-family:var(--font-display); font-size:13px; margin-bottom:6px;">🎁 Ayudar a tu compañero</h3>
        <p class="level-hint" style="margin:0 0 8px;">Puedes regalarle vidas, tiempo, diamantes o monedas para usarlos en el juego. Lo que ganes en los cofres también sirve.</p>
        <button class="modal-btn primary" id="giftOpenBtn" ${partners.length ? '' : 'disabled'}>🎁 Regalar algo</button>
        ${partners.length ? '' : '<p class="level-hint" style="margin:6px 0 0;">Aún no tienes compañero en la sala.</p>'}
      </div>` : ''}
      ${onlineRoom.isHost && waiting ? `<button class="modal-btn primary" id="onlineStartBtn" style="width:100%;">¡Empezar para todos! ▶</button>` : ''}
      ${onlineRoom.isHost && data.status === 'playing' && allFinished ? `<button class="modal-btn primary" id="onlineReplayBtn" style="width:100%;">🔁 Jugar otra ronda</button>` : ''}
      ${data.status === 'playing' && !allFinished ? `<p class="level-hint">Esperando a que todos terminen…</p>` : ''}
    </div>
    <div class="online-panel online-chat">
      <div class="online-chat-head">
        <h3 style="font-family:var(--font-display); font-size:13px;">💬 Chat de la sala <span class="chat-badge hidden" id="chatBadge">0</span></h3>
        <div class="online-chat-tools">
          <button id="chatClear" title="Limpiar la vista del chat">🧹</button>
          <button id="chatToggle" title="Minimizar o abrir el chat">${onlineRoom.chatCollapsed ? '▴' : '▾'}</button>
        </div>
      </div>
      <div class="online-chat-body ${onlineRoom.chatCollapsed ? 'hidden' : ''}" id="chatBody">
      <div class="online-chat-quick">
        <button data-msg="👍 ¡Vamos bien!">👍 ¡Vamos bien!</button>
        <button data-msg="🆘 ¡Ayuda!">🆘 ¡Ayuda!</button>
        <button data-msg="🎉 ¡Lo logré!">🎉 ¡Lo logré!</button>
        <button data-msg="⏳ Un segundo">⏳ Un segundo</button>
      </div>
      <div class="online-chat-messages" id="onlineChatMessages"></div>
      <div class="online-chat-input-row">
        <input type="text" id="onlineChatInput" placeholder="Escribe un mensaje respetuoso…" maxlength="140">
        <button id="onlineChatSend">Enviar</button>
      </div>
      <p class="chat-rule">🛡️ Chat moderado: no se permiten groserías, enlaces ni datos personales.</p>
      </div>
    </div>
  `;

  const list = $('#onlinePlayerList');
  players.forEach(([pUid, p]) => {
    const row = el('div', `online-player-row ${pUid === uid ? 'me' : ''}`);
    row.innerHTML = `
      <span class="p-name">${escapeHtml(p.name)}${data.mode === 'duos' && p.team ? ' · ' + escapeHtml(duoName(data, p.team)) : ''}${pUid === data.hostUid ? ' 👑' : ''}${pUid === uid ? ' (tú)' : ''}</span>
      <span class="online-status-badge ${p.finished ? 'ready' : ''}">${p.finished ? `⬡ ${p.score}` : (data.status === 'playing' ? 'jugando…' : 'listo')}</span>
    `;
    list.appendChild(row);
  });

  const startBtn = $('#onlineStartBtn');
  if (startBtn) startBtn.onclick = tryStartRoom;
  const replayBtn = $('#onlineReplayBtn');
  if (replayBtn) replayBtn.onclick = restartRoomActivity;
  $('#shareCodeBtn').onclick = shareRoomCode;

  // dúos: nombre y cambio de dúo
  ['A', 'B'].forEach(t => {
    const inp = document.getElementById('duoName' + t);
    if (inp && !inp.disabled){
      const commit = () => renameDuo(t, inp.value);
      inp.addEventListener('change', commit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    }
  });
  $$('.duo-join').forEach(b => b.onclick = () => switchDuo(b.dataset.team));

  // invitar
  const invBtn = $('#inviteBtn');
  if (invBtn) invBtn.onclick = () => inviteToRoom($('#inviteInput').value);
  const waBtn = $('#inviteWaBtn'); if (waBtn) waBtn.onclick = shareRoomWhatsApp;
  const invInp = $('#inviteInput');
  if (invInp) invInp.addEventListener('keydown', e => { if (e.key === 'Enter') invBtn.click(); });

  // regalos
  const giftBtn = $('#giftOpenBtn');
  if (giftBtn) giftBtn.onclick = () => openGiftModal();

  // chat
  $$('.online-chat-quick button').forEach(b => b.addEventListener('click', () => sendRoomChat(b.dataset.msg)));
  $('#onlineChatSend').onclick = () => {
    const input = $('#onlineChatInput');
    if (input.value.trim() && sendRoomChat(input.value.trim())) input.value = '';
  };
  $('#onlineChatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter'){ $('#onlineChatSend').click(); }
  });
  $('#chatClear').onclick = () => { onlineRoom.chatClearedAt = Date.now(); renderChatMessages(onlineRoom.lastMsgs || []); };
  $('#chatToggle').onclick = () => {
    onlineRoom.chatCollapsed = !onlineRoom.chatCollapsed;
    if (!onlineRoom.chatCollapsed) onlineRoom.chatUnread = 0;
    $('#chatBody').classList.toggle('hidden', onlineRoom.chatCollapsed);
    $('#chatToggle').textContent = onlineRoom.chatCollapsed ? '▴' : '▾';
    renderChatMessages(onlineRoom.lastMsgs || []);
  };

  Object.keys(keep).forEach(id => {
    const n = document.getElementById(id);
    if (n && !n.disabled){
      n.value = keep[id].v;
      if (keep[id].focus){ n.focus(); try { n.setSelectionRange(keep[id].s, keep[id].e); } catch (_) {} }
    }
  });

  renderChatMessages(onlineRoom.lastMsgs || []);
  maybeShowRoomScoreboard();
}

/* ---------- Dúos ---------- */
async function renameDuo(team, raw){
  const name = (raw || '').trim().slice(0, 20);
  if (!name) return;
  const m = checkText(name);
  if (!m.ok){ showToast('🚫 Ese nombre de dúo no está permitido. ' + m.reason); renderRoomLobby(); return; }
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs();
  try { await fs.updateDoc(fs.doc(db, 'rooms', onlineRoom.code), { [`teams.${team}.name`]: name }); } catch (e) { console.warn(e); }
}
async function switchDuo(team){
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  try {
    await fs.runTransaction(db, async tx => {
      const d = (await tx.get(roomRef)).data();
      const count = roomPlayers(d).filter(([, p]) => p.team === team).length;
      if (count >= 2) throw new Error('LLENO');
      tx.update(roomRef, { [`players.${uid}.team`]: team });
    });
  } catch (e) { showToast('Ese dúo ya está completo.'); }
}

/* ---------- Empezar / repetir ---------- */
function tryStartRoom(){
  const data = onlineRoom.data;
  const players = roomPlayers(data);
  if (data.mode === 'duos'){
    const a = players.filter(([, p]) => p.team === 'A').length, b = players.filter(([, p]) => p.team === 'B').length;
    if (players.length !== 4 || a !== 2 || b !== 2){
      showToast('👥 Para jugar en dúos se necesitan 4 jugadores: 2 en cada dúo.');
      return;
    }
  }
  if (players.length < 1) return;
  startRoomActivity();
}

async function startRoomActivity(){
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  const resetPlayers = {};
  roomPlayers(onlineRoom.data).forEach(([uid]) => {
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

/* Salir de la sala: se marca como "left" para no bloquear a los demás y, si eras
   la persona anfitriona, el puesto pasa a otro jugador. */
function leaveOnlineRoom(silent, skipServer){
  const code = onlineRoom.code, data = onlineRoom.data;
  if (!skipServer && code && data && FirebaseAPI.db()){
    const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
    const roomRef = fs.doc(db, 'rooms', code);
    const others = roomPlayers(data).filter(([u]) => u !== uid);
    (async () => {
      try {
        if (!others.length){ await fs.deleteDoc(roomRef); return; }
        const upd = { [`players.${uid}.left`]: true, [`players.${uid}.vote`]: 'leave' };
        if (data.hostUid === uid) upd.hostUid = others[0][0];
        await fs.updateDoc(roomRef, upd);
      } catch (e) { console.warn('leaveOnlineRoom', e); }
    })();
  }
  if (onlineRoom.unsubRoom) onlineRoom.unsubRoom();
  if (onlineRoom.unsubChat) onlineRoom.unsubChat();
  onlineRoom.unsubRoom = null; onlineRoom.unsubChat = null;
  onlineRoom.active = false;
  onlineRoom.code = null;
  onlineRoom.data = null;
  onlineRoom.playingNow = false;
  onlineRoom.sbSig = null;
  updateGiftFab();
  if (!silent) goMenu();
}

/* =========================================================
   CHAT (moderado)
   ========================================================= */
function renderChatMessages(msgs){
  onlineRoom.lastMsgs = msgs;
  const box = $('#onlineChatMessages');
  if (!box) return;
  const uid = FirebaseAPI.uid();
  const since = onlineRoom.chatClearedAt || 0;
  const shown = [];
  msgs.filter(m => (m.createdAt || 0) > since).slice(-20).forEach(m => {
    const prev = shown[shown.length - 1];
    if (!m.type && prev && !prev.type && prev.uid === m.uid && prev.text === m.text){ prev.n++; }
    else shown.push({ uid:m.uid, name:m.name, text:m.text, type:m.type, n:1 });
  });
  box.innerHTML = shown.length ? shown.map(m => m.type === 'gift'
    ? `<div class="online-chat-msg chat-gift">${escapeHtml(m.text)}</div>`
    : `<div class="online-chat-msg ${m.uid === uid ? 'mine' : ''}"><span class="who">${escapeHtml(m.name)}:</span>${escapeHtml(m.text)}${m.n > 1 ? ' <b class="chat-x">×' + m.n + '</b>' : ''}</div>`
  ).join('') : '<p class="level-hint" style="margin:auto;">Sin mensajes todavía.</p>';
  box.scrollTop = box.scrollHeight;
  const total = msgs.length;
  if (onlineRoom.chatCollapsed && onlineRoom.lastTotal != null && total > onlineRoom.lastTotal) onlineRoom.chatUnread = (onlineRoom.chatUnread || 0) + (total - onlineRoom.lastTotal);
  onlineRoom.lastTotal = total;
  const badge = $('#chatBadge');
  if (badge){ badge.textContent = onlineRoom.chatUnread || 0; badge.classList.toggle('hidden', !(onlineRoom.chatCollapsed && onlineRoom.chatUnread)); }
}

/* Devuelve true si el mensaje se envió */
function sendRoomChat(text){
  if (!onlineRoom.active) return false;
  const now = Date.now();
  if (now < onlineRoom.muteUntil){
    showToast('🔇 Chat en pausa por lenguaje inadecuado. Espera ' + Math.ceil((onlineRoom.muteUntil - now) / 1000) + ' s.');
    return false;
  }
  const mod = checkText(text);
  if (!mod.ok){
    onlineRoom.strikes = (onlineRoom.strikes || 0) + 1;
    if (onlineRoom.strikes >= 3){
      onlineRoom.muteUntil = now + 60000; onlineRoom.strikes = 0;
      showToast('🔇 Mensaje no permitido. Tu chat queda en pausa 1 minuto.');
    } else {
      showToast('🚫 Mensaje no permitido: ' + mod.reason + ' (' + onlineRoom.strikes + '/3)');
    }
    return false;
  }
  if (now - (onlineRoom.lastSent || 0) < 1500){ showToast('⏳ Espera un momento antes de enviar otro mensaje'); return false; }
  onlineRoom.lastSent = now;
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const messagesRef = fs.collection(db, 'rooms', onlineRoom.code, 'messages');
  fs.addDoc(messagesRef, { uid, name: onlineRoom.myName, text: text.slice(0, 140), createdAt: now }).catch(err => console.warn('sendRoomChat', err));
  return true;
}

/* =========================================================
   REGALOS entre compañeros (cooperativo y dúos)
   Se envían como un mensaje especial del chat; quien lo recibe lo aplica
   una sola vez. Las vidas y el tiempo se aplican en el juego en curso.
   ========================================================= */
function openGiftModal(){
  const data = onlineRoom.data;
  if (!data || !isTeamMode(data)) return;
  const uid = FirebaseAPI.uid();
  const partners = partnersOf(data, uid);
  if (!partners.length){ showToast('Aún no tienes compañero en la sala.'); return; }
  const inv = ensureInv();
  const have = { life: inv.extraLives, time: inv.extraTime, gem: inv.gems, coins: State.coins };
  const need = { life:1, time:1, gem:1, coins:50 };
  let target = partners[0][0];
  const scene = (typeof arenaLiveScene === 'function') ? arenaLiveScene() : null;
  if (scene && scene.scene) scene.scene.pause();
  showModal(`
    <h2>🎁 Regalar a tu compañero</h2>
    ${partners.length > 1 ? `<select id="giftTarget" class="online-activity-select">${partners.map(([u, p]) => `<option value="${u}">${escapeHtml(p.name)}</option>`).join('')}</select>` : `<p class="level-hint">Para: <b>${escapeHtml(partners[0][1].name)}</b></p>`}
    <div class="gift-grid">
      ${Object.keys(GIFT_KINDS).map(k => `
        <button class="gift-btn" data-k="${k}" ${have[k] >= need[k] ? '' : 'disabled'}>
          <span class="gift-ico">${GIFT_KINDS[k].icon}</span>
          <b>${GIFT_KINDS[k].label}</b>
          <small>Tienes: ${have[k]}</small>
        </button>`).join('')}
    </div>
    <p class="level-hint">Las vidas y el tiempo se usan en su juego apenas los recibe.</p>
    <div class="modal-actions"><button class="modal-btn" id="giftClose">Cerrar</button></div>
  `);
  const closeIt = () => { hideModal(); if (scene && scene.scene) scene.scene.resume(); };
  $('#giftClose').onclick = closeIt;
  const sel = $('#giftTarget'); if (sel) sel.onchange = () => { target = sel.value; };
  $$('.gift-btn').forEach(b => b.onclick = () => { if (sel) target = sel.value; sendGift(target, b.dataset.k); closeIt(); });
}

function sendGift(toUid, kind){
  const data = onlineRoom.data;
  const g = GIFT_KINDS[kind];
  const inv = ensureInv();
  let ok = false;
  if (kind === 'life') ok = consumeInv('extraLives');
  else if (kind === 'time') ok = consumeInv('extraTime');
  else if (kind === 'gem'){ if (inv.gems >= 1){ inv.gems--; ok = true; } }
  else if (kind === 'coins'){ if (State.coins >= 50){ State.coins -= 50; ok = true; } }
  if (!ok){ showToast('No tienes eso para regalar.'); return; }
  saveProgress(); refreshCurrencyUI();
  const to = (data.players || {})[toUid] || { name:'tu compañero' };
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const messagesRef = fs.collection(db, 'rooms', onlineRoom.code, 'messages');
  fs.addDoc(messagesRef, {
    uid, name: onlineRoom.myName, type:'gift', to: toUid, kind, amount: g.amount,
    gid: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    text: `🎁 ${onlineRoom.myName} le regaló ${g.label} ${g.icon} a ${to.name}`,
    createdAt: Date.now(),
  }).catch(err => console.warn('sendGift', err));
  showToast(`🎁 Enviaste ${g.label} a ${to.name}`);
  beep('correct');
}

function _giftsDone(){ try { return JSON.parse(localStorage.getItem('bb-gifts-done') || '[]'); } catch (_) { return []; } }
function processGifts(msgs){
  const uid = FirebaseAPI.uid();
  const done = _giftsDone();
  let changed = false;
  msgs.forEach(m => {
    if (m.type !== 'gift' || m.to !== uid || !m.gid || done.includes(m.gid)) return;
    if ((m.createdAt || 0) < onlineRoom.joinedAt - 5 * 60 * 1000) return;
    done.push(m.gid); changed = true;
    applyGift(m.kind, m.amount, m.name);
  });
  if (changed){ try { localStorage.setItem('bb-gifts-done', JSON.stringify(done.slice(-300))); } catch (_) {} }
}

function applyGift(kind, amount, from){
  const inv = ensureInv();
  const inGame = document.body.classList.contains('in-game');
  const scene = inGame && typeof arenaLiveScene === 'function' ? arenaLiveScene() : null;
  const alive = scene && !scene.ended && !scene.finished;
  let msg = '';
  if (kind === 'life'){
    if (alive && scene.lives != null){
      scene.lives += amount; if (scene.maxLives != null) scene.maxLives += amount;
      ArenaHUD.setLives(scene.lives);
      msg = `❤️ ${from} te regaló una vida: ¡ya la tienes en el juego!`;
    } else { inv.extraLives += amount; msg = `❤️ ${from} te regaló 1 vida extra (se usará en tu próximo juego)`; }
  } else if (kind === 'time'){
    let added = false;
    if (alive){
      if (scene.TOTAL != null){ scene.TOTAL += 25; added = true; }
      else if (scene.limit != null){ scene.limit += 25; added = true; }
      else if (scene.roundTime != null){ scene.roundTime += 25; added = true; }
    }
    if (added) msg = `⏱️ ${from} te regaló 25 segundos más: ¡ya los tienes en el juego!`;
    else { inv.extraTime += amount; msg = `⏱️ ${from} te regaló tiempo extra (se usará en tu próximo juego)`; }
  } else if (kind === 'gem'){ inv.gems += amount; msg = `💎 ${from} te regaló un diamante`; }
  else if (kind === 'coins'){ State.coins += amount; msg = `🪙 ${from} te regaló ${amount} monedas`; }
  saveProgress(); refreshCurrencyUI();
  showToast(msg); beep('win');
}

/* Botón flotante 🎁 dentro del juego (cooperativo y dúos) */
function updateGiftFab(){
  const data = onlineRoom.data;
  const show = onlineRoom.active && data && isTeamMode(data) && document.body.classList.contains('in-game')
               && partnersOf(data, FirebaseAPI.uid()).length > 0;
  let fab = document.getElementById('giftFab');
  if (show && !fab){
    fab = document.createElement('button');
    fab.id = 'giftFab'; fab.className = 'gift-fab'; fab.textContent = '🎁';
    fab.setAttribute('aria-label', 'Regalar a mi compañero');
    fab.addEventListener('click', openGiftModal);
    document.body.appendChild(fab);
  } else if (!show && fab){ fab.remove(); }
}

/* =========================================================
   INVITACIONES: un jugador invita a otro a su sala
   ========================================================= */
async function inviteToRoom(rawName){
  const msg = $('#inviteMsg');
  const name = (rawName || '').trim();
  const say = (t) => { if (msg) msg.textContent = t; };
  if (!name){ say('Escribe el nombre de usuario de tu amigo.'); return; }
  const slug = slugifyProfileName(name);
  if (State.profile && slug === slugifyProfileName(State.profile.name)){ say('No puedes invitarte a ti mismo 🙂'); return; }
  say('Buscando…');
  const rec = await fetchUserRecord(name);
  if (!rec){ say('No existe un usuario con ese nombre. Revisa cómo se escribe.'); return; }
  const inv = {
    fromName: onlineRoom.myName, fromUser: State.profile ? State.profile.name : onlineRoom.myName,
    code: onlineRoom.code, mode: onlineRoom.data.mode, activity: onlineRoom.data.activity, createdAt: Date.now(),
  };
  try {
    const ok = await AppStorage.set('invite:' + slug + ':' + onlineRoom.code, JSON.stringify(inv), true);
    if (!ok) throw new Error('no guardado');
    const online = await isUserOnline(name);
    say(online
      ? `✅ ${rec.name} está 🟢 en línea: la invitación le aparece en unos segundos dentro del juego.`
      : `✅ Invitación enviada a ${rec.name}, pero ⚪ no está en línea ahora. Le llegará cuando abra el juego; también puedes avisarle por WhatsApp.`);
    $('#inviteInput').value = '';
  } catch (e) { say('No se pudo enviar la invitación. Inténtalo de nuevo.'); }
}

function _dismissedInvites(){ try { return JSON.parse(localStorage.getItem('bb-invites-dismissed') || '[]'); } catch (_) { return []; } }
function _dismissInvite(key){
  const d = _dismissedInvites(); d.push(key);
  try { localStorage.setItem('bb-invites-dismissed', JSON.stringify(d.slice(-100))); } catch (_) {}
}

let _inviteModalOpen = false;
async function checkInvites(){
  if (!State.profile || _inviteModalOpen) return;
  if (onlineRoom.active || document.body.classList.contains('in-game') || document.hidden) return;
  if (!document.getElementById('modalOverlay').classList.contains('hidden')) return;   // no interrumpe otro aviso
  const slug = slugifyProfileName(State.profile.name);
  let rows = [];
  try { rows = await AppStorage.list('invite:' + slug + ':', true); } catch (e) { return; }
  const now = Date.now(), dismissed = _dismissedInvites();
  const invs = rows.map(r => { try { return Object.assign(JSON.parse(r.value), { _key:r.key }); } catch (e) { return null; } })
    .filter(i => i && now - i.createdAt < 20 * 60 * 1000 && !dismissed.includes(i._key + ':' + i.createdAt))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (!invs.length) return;
  showInviteModal(invs[0]);
}

function showInviteModal(inv){
  _inviteModalOpen = true;
  const act = (ONLINE_ROOM_ACTIVITIES.find(a => a.key === inv.activity) || {}).name || inv.activity;
  beep('win');
  showModal(`
    <h2>📨 ¡Te invitaron a jugar!</h2>
    <p><b>${escapeHtml(inv.fromName)}</b> te invita a su sala <b class="accent-gold">${escapeHtml(inv.code)}</b></p>
    <p class="level-hint">${ROOM_MODES[inv.mode] || ''} · ${act}</p>
    <p class="level-hint" id="invErr"></p>
    <div class="modal-actions">
      <button class="modal-btn" id="invNo">Ahora no</button>
      <button class="modal-btn primary" id="invYes">¡Unirme! ▶</button>
    </div>`);
  const finish = async () => {
    if (!inv._key) return;
    _dismissInvite(inv._key + ':' + inv.createdAt);
    try { await AppStorage.remove(inv._key, true); } catch (_) {}
  };
  $('#invNo').onclick = async () => { _inviteModalOpen = false; hideModal(); await finish(); };
  $('#invYes').onclick = async () => {
    $('#invYes').disabled = true;
    try { await FirebaseAPI.ready(); } catch (_) {}
    if (!FirebaseAPI.db()){ $('#invErr').textContent = 'No hay conexión con las salas en este momento.'; $('#invYes').disabled = false; return; }
    const r = await joinRoomByCode(inv.code, State.profile.name);
    if (r.ok){ _inviteModalOpen = false; hideModal(); await finish(); }
    else { $('#invErr').textContent = r.error; $('#invYes').disabled = false; await finish(); }
  };
  const obs = setInterval(() => { if (document.getElementById('modalOverlay').classList.contains('hidden')){ _inviteModalOpen = false; clearInterval(obs); } }, 1000);
}

/* ---------- Presencia ("en línea") ---------- */
async function sendPresence(){
  if (!State.profile || document.hidden) return;
  try { await AppStorage.set('presence:' + slugifyProfileName(State.profile.name), String(Date.now()), true); } catch (_) {}
}
async function isUserOnline(name){
  try {
    const r = await AppStorage.get('presence:' + slugifyProfileName(name), true);
    return !!(r && r.value && Date.now() - parseInt(r.value, 10) < 75000);
  } catch (_) { return false; }
}

/* ---------- Enlace de invitación (?sala=CODIGO), por ejemplo desde WhatsApp ---------- */
(function readRoomLink(){
  try {
    const code = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length === 4){
      sessionStorage.setItem('bb-pending-room', code);
      history.replaceState(null, '', location.pathname);   // limpia la dirección
    }
  } catch (_) {}
})();
async function handleRoomLink(){
  let code = null;
  try { code = sessionStorage.getItem('bb-pending-room'); } catch (_) {}
  if (!code || _inviteModalOpen || onlineRoom.active) return;
  if (!State.profile){
    if (!handleRoomLink._warned){ handleRoomLink._warned = true; showToast('📲 Inicia sesión o crea tu cuenta para unirte a la sala ' + code); }
    return;
  }
  try { await FirebaseAPI.ready(); } catch (_) {}
  if (!FirebaseAPI.db()) return;
  try { sessionStorage.removeItem('bb-pending-room'); } catch (_) {}
  const fs = FirebaseAPI.fs();
  const snap = await fs.getDoc(fs.doc(FirebaseAPI.db(), 'rooms', code));
  if (!snap.exists()){ showToast('La sala ' + code + ' ya no existe.'); return; }
  const d = snap.data();
  const host = (d.players && d.players[d.hostUid]) ? d.players[d.hostUid].name : 'Un amigo';
  showInviteModal({ fromName: host, code, mode: d.mode, activity: d.activity, _key: null, createdAt: Date.now() });
}

let _invitePoll = null;
function startInvitePolling(){
  if (_invitePoll) return;
  setTimeout(() => { sendPresence(); checkInvites(); handleRoomLink(); }, 3500);
  _invitePoll = setInterval(() => { sendPresence(); checkInvites(); handleRoomLink(); }, 10000);   // en línea: la invitación llega en ≤10 s
}

/* =========================================================
   TABLA DE PUNTAJES AL TERMINAR CADA RONDA (salas en vivo)
   Cuando todos terminan, a todos les aparece quién ganó (o qué
   dúo ganó) y la tabla. Cada jugador elige "Otra ronda" o "Salir".
   La ronda nueva empieza cuando todos votaron y alguien quiere seguir.
   ========================================================= */
async function voteRoom(vote){
  const db = FirebaseAPI.db(), fs = FirebaseAPI.fs(), uid = FirebaseAPI.uid();
  const roomRef = fs.doc(db, 'rooms', onlineRoom.code);
  if (vote === 'leave'){ onlineRoom.sbSig = null; hideModal(); leaveOnlineRoom(); return; }
  try { await fs.updateDoc(roomRef, { [`players.${uid}.vote`]: vote }); } catch (err) { console.warn('voteRoom', err); }
}

function maybeShowRoomScoreboard(){
  const data = onlineRoom.data;
  if (!data) return;
  const players = roomPlayers(data);
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
    const me = data.players[uid] || {};
    const voteIcon = v => v === 'again' ? '🔁 quiere otra' : v === 'leave' ? '🚪 sale' : '⏳ pensando…';
    let banner = '', rowsHtml = '';

    if (data.mode === 'duos'){
      const tot = { A:0, B:0 };
      players.forEach(([, p]) => { tot[p.team] = (tot[p.team] || 0) + (p.score || 0); });
      const nA = duoName(data, 'A'), nB = duoName(data, 'B');
      banner = tot.A === tot.B
        ? `<div class="mp-winner tie">🤝 ¡Empate entre «${escapeHtml(nA)}» y «${escapeHtml(nB)}»! (⬡ ${tot.A})</div>`
        : `<div class="mp-winner">🏆 ¡Ganó el dúo «${escapeHtml(tot.A > tot.B ? nA : nB)}»!<br><small>${escapeHtml(nA)}: ⬡ ${tot.A} · ${escapeHtml(nB)}: ⬡ ${tot.B}</small></div>`;
      const order = tot.A >= tot.B ? ['A', 'B'] : ['B', 'A'];
      rowsHtml = order.map((t, i) => `
        <div class="leaderboard-row duo-row ${i === 0 && tot.A !== tot.B ? 'me' : ''}">
          <div class="leaderboard-rank">${i === 0 && tot.A !== tot.B ? '🏆' : i + 1}</div>
          <div class="leaderboard-name"><b>${escapeHtml(duoName(data, t))}</b></div>
          <div class="leaderboard-score">⬡ ${tot[t]}</div>
        </div>
        ${players.filter(([, p]) => p.team === t).map(([u, p]) => `
        <div class="leaderboard-row duo-member">
          <div class="leaderboard-rank"></div>
          <div class="leaderboard-name">${escapeHtml(p.name)}${u === uid ? ' (tú)' : ''}</div>
          <div class="leaderboard-score">⬡ ${p.score || 0}</div>
          <div class="mp-wins">${voteIcon(p.vote)}</div>
        </div>`).join('')}`).join('');
    } else {
      const teamTotal = players.reduce((n, [, p]) => n + (p.score || 0), 0);
      if (data.mode === 'cooperativo'){
        banner = `<div class="mp-winner">🤝 ¡Equipo! Sumaron ⬡ ${teamTotal}</div>`;
      } else {
        const top = sorted[0][1].score || 0;
        const winners = top > 0 ? sorted.filter(([, p]) => (p.score || 0) === top) : [];
        banner = winners.length === 0 ? '<div class="mp-winner tie">Nadie sumó puntos esta ronda</div>'
          : winners.length === 1 ? `<div class="mp-winner">🏆 ¡Ganó ${escapeHtml(winners[0][1].name)}!</div>`
          : `<div class="mp-winner tie">🤝 ¡Empate entre ${winners.map(([, p]) => escapeHtml(p.name)).join(' y ')}!</div>`;
      }
      rowsHtml = sorted.map(([u, p], i) => `
          <div class="leaderboard-row ${u === uid ? 'me' : ''}">
            <div class="leaderboard-rank">${data.mode === 'competencia' && i === 0 && (p.score || 0) > 0 ? '🏆' : i + 1}</div>
            <div class="leaderboard-name">${escapeHtml(p.name)}${u === uid ? ' (tú)' : ''}</div>
            <div class="leaderboard-score">⬡ ${p.score || 0}</div>
            <div class="mp-wins">${voteIcon(p.vote)}</div>
          </div>`).join('');
    }

    showModal(`
      <h2>🏁 Ronda ${round} terminada</h2>
      ${banner}
      <div class="leaderboard-list mp-table">${rowsHtml}</div>
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
    if (data.mode === 'duos' && players.length !== 4){
      showToast('👥 Un jugador salió: la ronda sigue con quienes quedan.');
    }
    restartRoomActivity();
  }
}
