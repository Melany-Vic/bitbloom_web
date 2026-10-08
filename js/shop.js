/* =========================================================
   TIENDA — mejoras y personajes comprados con monedas
   Los personajes (robots de cuerpo completo) se compran una vez
   y se pueden equipar: el personaje equipado es el que se usa
   en los juegos de la Arena de Desafíos y en el nivel 5.
   ========================================================= */
const SHOP_ITEMS = [
  { key:'extraLife', icon:'❤️', name:'Vida Extra', desc:'Empiezas cada nivel con una vida adicional (4 en vez de 3).', cost:60 },
  { key:'extraTime', icon:'⏱️', name:'Tiempo Extra', desc:'Todos los temporizadores del juego te dan un 20% más de tiempo.', cost:50 },
  { key:'accessory', icon:'🎨', name:'Accesorio para Bit', desc:'Un accesorio especial y brillante para tu compañero Bit.', cost:30 },
];

const SKINS = [
  { id:'bit',   name:'Bit',   role:'Guía principal',               cost:0 },
  { id:'byte',  name:'Byte',  role:'Especialista en Hardware',     cost:60 },
  { id:'bloom', name:'Bloom', role:'Especialista en Software',     cost:60 },
  { id:'pixel', name:'Pixel', role:'Especialista en Gráficos',     cost:80 },
  { id:'data',  name:'Data',  role:'Especialista en Datos',        cost:80 },
  { id:'net',   name:'Net',   role:'Especialista en Redes',        cost:80 },
  { id:'code',  name:'Code',  role:'Especialista en Programación', cost:100 },
  { id:'volt',  name:'Volt',  role:'Especialista en Energía',      cost:100 },
  { id:'nova',  name:'Nova',  role:'Exploradora veloz',            cost:120 },
  { id:'lupa',  name:'Lupa',  role:'Detective de errores',         cost:120 },
  { id:'orbit', name:'Orbit', role:'Mini dron explorador',         cost:140 },
  { id:'buzz',  name:'Buzz',  role:'Dron mensajero alado',         cost:140 },
  { id:'solda', name:'Solda', role:'Soldadora de circuitos',       cost:160 },
  { id:'zap',   name:'Zap',   role:'Gato eléctrico veloz',         cost:160 },
];
const HEAD_IDS = ['bit', 'byte', 'bloom', 'pixel', 'code', 'data', 'net', 'volt'];
function skinHeadSrc(id){ return HEAD_IDS.indexOf(id) >= 0 ? `assets/heads/${id}.png` : `assets/skins/${id}.png`; }
const SKIN_IDS = SKINS.map(s => s.id);

function ownsSkin(id){ return id === 'bit' || State.shopOwned.has('skin_' + id); }
function currentSkin(){ return (State.skin && SKIN_IDS.indexOf(State.skin) >= 0 && ownsSkin(State.skin)) ? State.skin : 'bit'; }

function showShop(){
  showScreen('#screenShop');
  bitHide();
  $('#shopCoins').textContent = State.coins;
  renderShop();
}

function renderShop(){
  const wrap = $('#shopWrap');
  wrap.innerHTML = `
    <h3 class="shop-section-title">🤖 Personajes <span>— elige con quién jugar en la Arena</span></h3>
    <div class="shop-grid skin-grid" id="skinGrid"></div>
    <h3 class="shop-section-title">⚡ Mejoras</h3>
    <div class="shop-grid" id="shopGrid"></div>`;

  const skinGrid = $('#skinGrid');
  SKINS.forEach(sk => {
    const owned = ownsSkin(sk.id);
    const equipped = currentSkin() === sk.id;
    const card = el('div', `shop-card skin-card ${equipped ? 'equipped' : ''}`, `
      <div class="skin-img-wrap"><img src="assets/skins/${sk.id}.png" alt="${sk.name}" class="skin-img"></div>
      <div class="shop-name">${sk.name}</div>
      <div class="shop-desc">${sk.role}</div>
      <button class="shop-buy ${owned ? 'owned' : ''}" ${(!owned && State.coins < sk.cost) || equipped ? 'disabled' : ''}>
        ${equipped ? 'Equipado ✓' : owned ? 'Equipar' : `🪙 ${sk.cost}`}
      </button>
    `);
    const btn = card.querySelector('.shop-buy');
    if (!equipped) btn.addEventListener('click', () => owned ? equipSkin(sk) : buySkin(sk));
    skinGrid.appendChild(card);
  });

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

function buySkin(sk){
  if (State.coins < sk.cost || ownsSkin(sk.id)) return;
  State.coins -= sk.cost;
  State.shopOwned.add('skin_' + sk.id);
  State.skin = sk.id;               // al comprarlo queda equipado
  beep('win');
  $('#shopCoins').textContent = State.coins;
  renderShop();
  refreshProfileUI();
  saveProgress();
}
function equipSkin(sk){
  if (!ownsSkin(sk.id)) return;
  State.skin = sk.id;
  beep('correct');
  renderShop();
  refreshProfileUI();
  saveProgress();
}

function buyShopItem(item){
  if (State.coins < item.cost || State.shopOwned.has(item.key)) return;
  State.coins -= item.cost;
  State.shopOwned.add(item.key);
  beep('correct');
  if (item.key === 'extraTime') State.timeBonus = 1.2;
  if (item.key === 'accessory') $('#bitAccessory').classList.remove('hidden');
  $('#shopCoins').textContent = State.coins;
  bitSay(`¡Gracias! Ya tienes "${item.name}" activado.`, 'talk');
  renderShop();
  saveProgress();
}
