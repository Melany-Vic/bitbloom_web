/* =========================================================
   INSTRUCCIONES — cómo jugar BitBloom
   ========================================================= */
const INSTRUCTIONS = [
  { icon:'❤️', term:'Vidas', def:'Cada nivel te da 3 vidas (el corazón se ve como un pequeño hexágono ⬡). Si te equivocás, perdés una. Si llegás a 0, tenés que reintentar el nivel.' },
  { icon:'⏱️', term:'Tiempo', def:'La barra de arriba muestra cuánto tiempo te queda. Se pone roja cuando se está por acabar: ¡apurate!' },
  { icon:'⬡', term:'Puntos', def:'Ganás puntos por cada respuesta o acción correcta. Se suman a tu puntaje total, visible en el mapa de niveles.' },
  { icon:'🪙', term:'Monedas', def:'Además de puntos, ganás monedas al superar niveles y al responder las evaluaciones. Usalas en la Tienda para comprar mejoras.' },
  { icon:'🖱️', term:'Arrastrar y soltar', def:'En algunos niveles vas a arrastrar piezas con el dedo o el mouse hasta el lugar correcto.' },
  { icon:'👆', term:'Elegir una opción', def:'En otros niveles vas a tocar la respuesta correcta entre varias opciones, antes de que se acabe el tiempo.' },
  { icon:'🔗', term:'Conectar', def:'En el nivel del Sistema Operativo, tocá un término y luego su definición para conectarlos.' },
  { icon:'▶', term:'Ejecutar', def:'En el nivel final vas a ordenar bloques y presionar EJECUTAR para comprobar si tu secuencia es correcta.' },
  { icon:'🤖', term:'Bit y los especialistas', def:'Bit te va a acompañar todo el juego. Antes de cada nivel, un especialista (Byte, Bloom, Code, Net...) te va a explicar su misión.' },
];

function showInstructions(fromOnboarding){
  showScreen('#screenInstructions');
  bitHide();
  const wrap = $('#instructionsWrap');
  const cardsHtml = INSTRUCTIONS.map(c => `
    <div class="concept-card">
      <div class="concept-icon">${c.icon}</div>
      <div class="concept-body">
        <div class="concept-term">${c.term}</div>
        <div class="concept-def">${c.def}</div>
      </div>
    </div>
  `).join('');
  wrap.innerHTML = `
    <p class="level-hint" style="margin-top:10px;">Repasá esto antes de empezar tu aventura por BloomLand.</p>
    <div class="concept-list">${cardsHtml}</div>
    <div class="instructions-footer">
      <button class="modal-btn primary" id="instructionsContinue">${fromOnboarding ? '¡Entrar a BloomLand! ▶' : 'Volver'}</button>
    </div>
  `;
  $('#instructionsContinue').addEventListener('click', () => {
    if (fromOnboarding) goLevels();
    else goLevels();
  });
}
