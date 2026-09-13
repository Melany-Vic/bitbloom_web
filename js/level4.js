/* =========================================================
   NIVEL 4 — Cerebro del Sistema Operativo
   ========================================================= */
const L4_PAIRS = [
  { key:'kernel', term:'Núcleo (Kernel)', def:'Comunica el hardware con el software y controla todo el sistema.' },
  { key:'memoria', term:'Gestión de Memoria', def:'Decide qué programas usan la memoria RAM y cuánta necesitan.' },
  { key:'archivos', term:'Sistema de Archivos', def:'Organiza y guarda tus documentos en carpetas dentro del disco.' },
  { key:'drivers', term:'Controladores (Drivers)', def:'Permiten que el sistema hable con impresoras, mouse y otros dispositivos.' },
  { key:'interfaz', term:'Interfaz de Usuario', def:'La parte visual con íconos y ventanas que tú tocas o haces clic.' },
  { key:'procesos', term:'Gestión de Procesos', def:'Decide qué programa usa el procesador en cada instante.' },
];

let l4Selected = null;
let l4Matched = 0;

function initLevel4(){
  setupLevelHud(4, 3);
  l4Selected = null;
  l4Matched = 0;

  const stage = $('#gameStage');
  stage.innerHTML = `
    <p class="level-hint">Toca un término a la izquierda y luego su definición correcta a la derecha.</p>
    <div class="l4-board">
      <div class="l4-col" id="l4Terms"></div>
      <div class="l4-col" id="l4Defs"></div>
    </div>
  `;

  const termsCol = $('#l4Terms');
  L4_PAIRS.forEach(p => {
    const b = el('button', 'l4-card l4-term', p.term);
    b.dataset.key = p.key;
    b.addEventListener('click', () => l4PickTerm(b));
    termsCol.appendChild(b);
  });

  const defsCol = $('#l4Defs');
  shuffle(L4_PAIRS).forEach(p => {
    const b = el('button', 'l4-card l4-def', p.def);
    b.dataset.key = p.key;
    b.addEventListener('click', () => l4PickDef(b));
    defsCol.appendChild(b);
  });

  bitSay('El sistema operativo tiene muchas funciones invisibles. ¡Conecta cada una con su tarea!', 'talk');

  startTimer(50, null, () => {
    if (l4Matched < L4_PAIRS.length){
      finishLevel(4, false, 0, 'Se acabó el tiempo. Repasa las funciones del sistema operativo e inténtalo de nuevo.');
    }
  });
}

function l4PickTerm(btn){
  if (btn.classList.contains('matched')) return;
  $$('.l4-term').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  l4Selected = btn;
}

function l4PickDef(btn){
  if (btn.classList.contains('matched') || !l4Selected) return;
  const term = l4Selected;
  if (term.dataset.key === btn.dataset.key){
    term.classList.add('matched');
    btn.classList.add('matched');
    term.classList.remove('selected');
    addScore(140);
    beep('correct');
    l4Selected = null;
    l4Matched++;
    if (l4Matched === L4_PAIRS.length){
      const stars = clamp(State.lives, 1, 3);
      finishLevel(4, true, stars, '¡Reconectaste todas las funciones del sistema operativo!');
    }
  } else {
    beep('wrong');
    shakeHud();
    btn.classList.add('wrong');
    term.classList.add('wrong');
    setTimeout(() => { btn.classList.remove('wrong'); term.classList.remove('wrong'); }, 350);
    term.classList.remove('selected');
    l4Selected = null;
    setLives(State.lives - 1);
    bitSay('Esa conexión no es correcta. ¡Vuelve a intentarlo!', 'alarm');
    if (State.lives <= 0){
      finishLevel(4, false, 0, 'Se acabaron las vidas. Repasa las funciones del sistema operativo e inténtalo de nuevo.');
    }
  }
}
