/* =========================================================
   COFRES Y PREMIOS
   Al terminar un nivel o un juego de la Arena se abren los cofres
   que ganaste (el de victoria + los que recogiste jugando).
   Cada cofre da un premio al azar:
   🪙 monedas · 💎 diamantes · ❤️ vida extra · ⏱️ tiempo extra
   - Las vidas y el tiempo extra se guardan y se usan solos
     en tu siguiente nivel o juego.
   - Los diamantes sirven para comprar cofres sorpresa en la tienda.
   ========================================================= */
function ensureInv(){
  if (!State.inv) State.inv = { gems:0, extraLives:0, extraTime:0 };
  return State.inv;
}
function consumeInv(key){
  const inv = ensureInv();
  if (inv[key] > 0){ inv[key]--; return true; }
  return false;
}

function refreshCurrencyUI(){
  const c = document.getElementById('menuCoins'); if (c) c.textContent = State.coins;
  const g = document.getElementById('menuGems');  if (g) g.textContent = ensureInv().gems;
  const sc = document.getElementById('shopCoins'); if (sc) sc.textContent = State.coins;
  const sg = document.getElementById('shopGems');  if (sg) sg.textContent = ensureInv().gems;
}

/* Aviso corto que aparece arriba y se va solo */
function showToast(msg){
  let t = document.getElementById('bbToast');
  if (!t){ t = document.createElement('div'); t.id = 'bbToast'; t.className = 'bb-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

const PRIZE_TABLE = [
  { id:'coins',   w:36 },
  { id:'gems',    w:22 },
  { id:'life',    w:14 },
  { id:'time',    w:14 },
  { id:'jackpot', w:14 },
];
function rollPrize(){
  let r = Math.random() * PRIZE_TABLE.reduce((n, p) => n + p.w, 0);
  const kind = (PRIZE_TABLE.find(p => (r -= p.w) < 0) || PRIZE_TABLE[0]).id;
  const inv = ensureInv();
  switch (kind){
    case 'gems': { const n = rand(1, 3); inv.gems += n; return { icon:'💎', title:`+${n} diamante${n > 1 ? 's' : ''}`, detail:'Úsalos en la tienda para comprar cofres sorpresa.' }; }
    case 'life': inv.extraLives++; return { icon:'❤️', title:'+1 vida extra', detail:'Se usará sola en tu próximo nivel o juego.' };
    case 'time': inv.extraTime++;  return { icon:'⏱️', title:'+30% de tiempo extra', detail:'Se usará solo en tu próximo juego con tiempo.' };
    case 'jackpot': { const n = rand(100, 150); State.coins += n; inv.gems += 1; return { icon:'🎰', title:`¡Premio mayor! +${n} monedas y +1 💎`, detail:'¡Qué suerte!' }; }
    default: { const n = rand(20, 70); State.coins += n; return { icon:'🪙', title:`+${n} monedas`, detail:'Ya están en tu monedero.' }; }
  }
}

/* Abre una lista de cofres uno por uno. `imgs` = nombres de imagen de assets/items/ */
function openChests(imgs, onDone){
  imgs = (imgs || []).slice(0, 5);
  if (!imgs.length){ if (onDone) onDone(); return; }
  let i = 0;
  const step = () => {
    const img = imgs[i];
    showModal(`
      <h2>🎁 ¡Cofre de recompensa!</h2>
      <p class="level-hint" style="margin:0;">Cofre ${i + 1} de ${imgs.length}</p>
      <div class="chest-stage" id="chestStage">
        <div class="chest-burst" id="chestBurst"></div>
        <img class="chest-img shake" id="chestImg" src="assets/items/${img}.png" alt="Cofre">
      </div>
      <p class="level-hint" id="chestMsg">¡Tócalo para abrirlo!</p>
      <div class="modal-actions"><button class="modal-btn primary" id="chestBtn">🔓 Abrir cofre</button></div>
    `);
    let opened = false;
    const open = () => {
      if (opened) return; opened = true;
      beep('win');
      $('#chestImg').classList.remove('shake'); $('#chestImg').classList.add('opening');
      $('#chestBurst').classList.add('on');
      $('#chestBtn').disabled = true;
      setTimeout(() => {
        const prize = rollPrize();
        saveProgress(); refreshCurrencyUI();
        $('#chestStage').innerHTML = `<div class="prize-icon">${prize.icon}</div>`;
        $('#chestMsg').innerHTML = `<b class="accent-gold" style="font-size:18px;">${prize.title}</b><br>${prize.detail}`;
        const btn = $('#chestBtn');
        btn.disabled = false;
        btn.textContent = i < imgs.length - 1 ? 'Siguiente cofre ▶' : '¡Genial! Continuar ▶';
        btn.onclick = () => { i++; if (i < imgs.length) step(); else { hideModal(); if (onDone) onDone(); } };
      }, 650);
    };
    $('#chestBtn').onclick = open;
    $('#chestImg').onclick = open;
  };
  step();
}
