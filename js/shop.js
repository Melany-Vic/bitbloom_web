/* =========================================================
   TIENDA — mejoras compradas con monedas
   ========================================================= */
const SHOP_ITEMS = [
  { key:'extraLife', icon:'❤️', name:'Vida Extra', desc:'Empezás cada nivel con una vida adicional (4 en vez de 3).', cost:60 },
  { key:'extraTime', icon:'⏱️', name:'Tiempo Extra', desc:'Todos los temporizadores del juego te dan un 20% más de tiempo.', cost:50 },
  { key:'accessory', icon:'🎨', name:'Accesorio para Bit', desc:'Un accesorio especial y brillante para tu compañero Bit.', cost:30 },
];

function showShop(){
  showScreen('#screenShop');
  bitHide();
  $('#shopCoins').textContent = State.coins;
  renderShop();
}

function renderShop(){
  const wrap = $('#shopWrap');
  wrap.innerHTML = `<div class="shop-grid" id="shopGrid"></div>`;
  const grid = $('#shopGrid');
  SHOP_ITEMS.forEach(item => {
    const owned = State.shopOwned.has(item.key);
    const card = el('div', 'shop-card', `
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      <button class="shop-buy ${owned ? 'owned' : ''}" ${owned || State.coins < item.cost ? 'disabled' : ''}>
        ${owned ? 'Comprado ✓' : `🪙 ${item.cost}`}
      </button>
    `);
    if (!owned){
      card.querySelector('.shop-buy').addEventListener('click', () => buyShopItem(item));
    }
    grid.appendChild(card);
  });
}

function buyShopItem(item){
  if (State.coins < item.cost || State.shopOwned.has(item.key)) return;
  State.coins -= item.cost;
  State.shopOwned.add(item.key);
  beep('correct');
  if (item.key === 'extraTime') State.timeBonus = 1.2;
  if (item.key === 'accessory') $('#bitAccessory').classList.remove('hidden');
  $('#shopCoins').textContent = State.coins;
  bitSay(`¡Gracias! Ya tenés "${item.name}" activado.`, 'talk');
  renderShop();
  saveProgress();
}
