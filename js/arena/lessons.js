/* =========================================================
   LECCIONES Y PREGUNTAS DE LA ARENA
   - Antes de jugar, el robot del juego explica los conceptos,
     muestra el problema a resolver y cómo se juega.
   - Durante el juego aparecen preguntas cortas sobre el tema
     (con explicación). Los errores se anotan en "Temas para reforzar".
   ========================================================= */
const ARENA_LESSONS = {
  runner: {
    topic:'binario',
    slides: [
      { icon:'🔢', title:'¿Qué es un bit?', text:'¡Hola, soy Bit! Un <b>bit</b> es la unidad más pequeña de información de un computador. Solo puede valer <b>0</b> o <b>1</b>, como un interruptor apagado (0) o encendido (1).' },
      { icon:'📦', title:'Del bit al byte', text:'<b>8 bits</b> juntos forman <b>1 byte</b>. Con un byte se guarda una letra, como la "A". Después vienen el KB (≈ 1.000 bytes), el MB, el GB y el TB, para guardar fotos, música y videos.' },
      { icon:'🔟', title:'El sistema binario', text:'Los computadores cuentan solo con <b>0 y 1</b>: es el <b>sistema binario</b>. Por ejemplo: 1 = 1, 10 = 2, 11 = 3, 101 = 5. Cada posición vale el doble que la anterior (1, 2, 4, 8…).' },
      { icon:'🐛', title:'El problema', text:'¡Alerta! Unos <b>bugs</b> (errores) y <b>virus</b> se metieron en la red y están corrompiendo los datos. Debes <b>correr por el circuito</b>, esquivarlos y llegar al <b>portal</b> para salvar la información. A mitad de camino y en la meta te haré preguntas sobre bits y bytes.' },
      { icon:'🎮', title:'Cómo se juega', text:'<b>Saltar</b> los enemigos del suelo (↑, espacio o toque) y <b>deslizarte</b> bajo los voladores (↓ o deslizar el dedo hacia abajo). Recoge monedas, 💠 el cristal XP te da un escudo y los trampolines te lanzan alto.' },
    ],
  },
  assembly: {
    topic:'hardware',
    slides: [
      { icon:'🖥️', title:'¿Qué es el hardware?', text:'¡Soy Byte! El <b>hardware</b> es todo lo que puedes <b>tocar</b> de un computador: piezas, cables, teclado, pantalla… Sin hardware no hay computador.' },
      { icon:'🧠', title:'Las 4 piezas clave', text:'🧠 <b>CPU</b>: el cerebro, ejecuta las instrucciones.<br>⚡ <b>RAM</b>: memoria rápida y temporal, se borra al apagar.<br>🎮 <b>GPU</b>: dibuja imágenes y videos.<br>💾 <b>SSD</b>: guarda tus archivos aunque apagues el PC.' },
      { icon:'🔗', title:'¿Cómo trabajan juntas?', text:'Abres un juego: el <b>SSD</b> lo tiene guardado, la <b>RAM</b> lo carga para usarlo rápido, la <b>CPU</b> piensa y calcula, y la <b>GPU</b> lo dibuja en la pantalla.' },
      { icon:'🛠️', title:'El problema', text:'El computador del laboratorio <b>no enciende</b>: le faltan <b>4 piezas</b>. Salta entre las plataformas, recoge CPU, RAM, GPU y SSD y esquiva las trampas. Con las 4 piezas el <b>portal</b> se enciende, ¡pero te hará una pregunta!' },
      { icon:'🎮', title:'Cómo se juega', text:'Muévete con ◀ ▶ y salta con ⤴. Los <b>trampolines</b> te lanzan muy alto. Cuidado con los pinchos, el fuego, las sierras y las bolas con púas.' },
    ],
  },
  pixel: {
    topic:'graficos',
    slides: [
      { icon:'🟦', title:'¿Qué es un píxel?', text:'¡Soy Pixel! Toda imagen digital está hecha de miles de puntitos llamados <b>píxeles</b>. Cada uno tiene un solo color. Si te acercas mucho a una foto, ¡los verás!' },
      { icon:'📐', title:'La resolución', text:'La <b>resolución</b> es cuántos píxeles tiene una imagen (por ejemplo 1920 × 1080). Más píxeles = más detalle, pero el archivo pesa más.' },
      { icon:'🌈', title:'Los colores RGB', text:'Las pantallas mezclan luz <b>R</b>oja, <b>G</b>reen (verde) y <b>B</b>lue (azul): <b>RGB</b>.<br>🔴+🟢 = <b>amarillo</b> · 🟢+🔵 = <b>cian</b> · 🔴+🔵 = <b>magenta</b><br>Las tres juntas = <b>blanco</b>; ninguna = negro.' },
      { icon:'🖼️', title:'Formatos de imagen', text:'<b>JPG</b>: fotos livianas. <b>PNG</b>: permite fondo transparente. <b>GIF</b>: animaciones cortas. <b>SVG</b>: imagen <b>vectorial</b> (hecha con fórmulas) que se puede agrandar sin perder calidad.' },
      { icon:'🎨', title:'El problema', text:'El cuadro de la galería <b>perdió sus colores</b>. Debes <b>mezclar luz</b> para recuperarlos: cada ronda pide un color. Atrapa solo las gotas R, G y B que lo forman, esquiva los píxeles muertos y pinta los 8 cuadritos. ¡Te haré preguntas en el camino!' },
      { icon:'🎮', title:'Cómo se juega', text:'Mueve a Pixel con ◀ ▶ o arrastrando el dedo. El cristal XP da escudo y cámara lenta.' },
    ],
  },
  tunnel: {
    topic:'redes',
    slides: [
      { icon:'🌐', title:'¿Qué es una red?', text:'¡Soy Net! Una <b>red</b> conecta computadores para compartir información. <b>Internet</b> es la red de redes más grande del mundo.' },
      { icon:'📨', title:'Los paquetes', text:'Los datos viajan en trocitos llamados <b>paquetes</b>. Cada paquete lleva su destino, como una carta con dirección.' },
      { icon:'📜', title:'Los protocolos', text:'Un <b>protocolo</b> son las reglas para comunicarse.<br>🔵 <b>HTTP</b>: ver páginas web.<br>🟢 <b>FTP</b>: enviar y recibir archivos.<br>🔴 <b>SSH</b>: controlar un computador a distancia de forma segura.' },
      { icon:'🛡️', title:'El problema', text:'Un <b>malware</b> ataca el túnel de la red. Cada pocos segundos el sistema te pide hacer algo (por ejemplo: "quiero ver una página web"). Debes <b>saber qué protocolo sirve</b> y atrapar solo sus paquetes. ¡Si atrapas otro, la red falla! Esquiva también el malware.' },
      { icon:'🎮', title:'Cómo se juega', text:'Cambia de carril con ▲ ▼ (o ↑ ↓). Fíjate en la <b>misión</b> de arriba y en la leyenda de colores.' },
    ],
  },
  energy: {
    topic:'energia',
    slides: [
      { icon:'⚡', title:'¿Qué es la energía?', text:'¡Soy Volt! La <b>energía</b> hace funcionar todo: luces, computadores, celulares. La energía eléctrica viaja por cables como una corriente de electrones.' },
      { icon:'🌱', title:'Fuentes de energía', text:'☀️ <b>Solar</b>, 🌬️ <b>eólica</b> (viento) y 💧 <b>hidráulica</b> (agua) son <b>renovables</b>: no se acaban y contaminan poco.<br>🛢️ <b>Petróleo</b> y carbón son <b>no renovables</b>: se agotan y contaminan.' },
      { icon:'🔋', title:'Baterías y circuitos', text:'Una <b>batería</b> guarda energía para usarla después. Un <b>circuito</b> es el camino de la corriente: si está <b>cerrado</b> la energía fluye y el aparato funciona; si está abierto, se corta.' },
      { icon:'🏙️', title:'El problema', text:'La ciudad se quedó <b>sin energía</b> y la batería principal casi está vacía. Vuela con tu propulsor, recoge baterías, chips y energías renovables para llenarla al <b>100%</b>. ¡Cuidado: la energía se escapa poco a poco y hay obstáculos peligrosos!' },
      { icon:'🎮', title:'Cómo se juega', text:'<b>Mantén</b> ↑, espacio o toca la pantalla para subir; suelta para bajar. Las renovables cargan más que la energía "sucia" 🛢️. ¡Habrá preguntas en el camino!' },
    ],
  },
};

/* Bancos de preguntas: q, options (la correcta va primero y se mezcla), explain */
const QUIZ_BANKS = {
  binario: [
    { q:'¿Cuántos bits tiene un byte?', o:['8 bits', '2 bits', '16 bits'], e:'Un byte son 8 bits juntos.' },
    { q:'El sistema binario usa solo los dígitos…', o:['0 y 1', '1 al 9', '0 al 7'], e:'Los computadores solo entienden 0 y 1.' },
    { q:'¿Qué número es el 101 en binario?', o:['5', '3', '7'], e:'101 = 4 + 0 + 1 = 5.' },
    { q:'¿Cuál es la unidad más pequeña de información?', o:['El bit', 'El byte', 'El megabyte'], e:'El bit (0 o 1) es lo más pequeño.' },
    { q:'¿Qué es un "bug"?', o:['Un error en un programa', 'Una pieza del PC', 'Un tipo de cable'], e:'Un bug es un fallo o error en un programa.' },
    { q:'Aproximadamente, 1 KB equivale a…', o:['1.000 bytes', '10 bytes', '1 bit'], e:'Un kilobyte son unos 1.000 bytes.' },
  ],
  hardware: [
    { q:'¿Qué pieza es el "cerebro" que ejecuta las instrucciones?', o:['La CPU', 'La RAM', 'El SSD'], e:'La CPU (procesador) ejecuta las instrucciones de los programas.' },
    { q:'¿Qué memoria se borra cuando apagas el computador?', o:['La RAM', 'El SSD', 'La CPU'], e:'La RAM es temporal: guarda datos solo mientras el PC está encendido.' },
    { q:'¿Qué pieza dibuja las imágenes y videos en la pantalla?', o:['La GPU', 'La RAM', 'El teclado'], e:'La GPU (tarjeta gráfica) se encarga de los gráficos.' },
    { q:'¿Dónde se guardan tus archivos aunque apagues el PC?', o:['En el SSD', 'En la RAM', 'En el mouse'], e:'El SSD (o disco) guarda los datos de forma permanente.' },
    { q:'El teclado y el mouse son…', o:['Hardware', 'Software', 'Un virus'], e:'Son hardware: puedes tocarlos.' },
  ],
  graficos: [
    { q:'¿Qué significan las siglas RGB?', o:['Rojo, Verde y Azul', 'Rápido, Grande y Brillante', 'Rojo, Gris y Blanco'], e:'RGB = Red, Green, Blue: rojo, verde y azul.' },
    { q:'¿Qué es un píxel?', o:['El punto más pequeño de una imagen', 'Un tipo de cable', 'Un programa de dibujo'], e:'Una imagen digital está hecha de miles de píxeles.' },
    { q:'¿Qué formato permite fondo transparente?', o:['PNG', 'JPG', 'MP3'], e:'PNG admite transparencia; JPG no.' },
    { q:'¿Qué ventaja tiene una imagen vectorial (SVG)?', o:['Se agranda sin perder calidad', 'Siempre pesa más', 'Solo sirve en blanco y negro'], e:'Los vectores usan fórmulas, por eso no se pixelan al agrandar.' },
    { q:'Luz roja + luz verde da…', o:['Amarillo', 'Azul', 'Negro'], e:'En RGB, rojo + verde = amarillo.' },
  ],
  redes: [
    { q:'¿Qué es un paquete en una red?', o:['Un trocito de datos con destino', 'Una caja con cables', 'Un tipo de virus'], e:'Los datos viajan divididos en paquetes.' },
    { q:'Una red sirve para…', o:['Conectar equipos y compartir información', 'Apagar el computador', 'Dibujar imágenes'], e:'Una red conecta dispositivos para compartir datos y recursos.' },
    { q:'¿Qué protocolo se usa para ver páginas web?', o:['HTTP', 'FTP', 'SSH'], e:'HTTP (y HTTPS) sirven para las páginas web.' },
    { q:'¿Qué es una dirección IP?', o:['El número que identifica un dispositivo en la red', 'Un tipo de antivirus', 'Una pieza del PC'], e:'La IP identifica a cada dispositivo conectado a una red.' },
    { q:'HTTPS se diferencia de HTTP porque…', o:['Protege los datos con cifrado', 'Es más lento a propósito', 'No usa Internet'], e:'La "S" significa seguro: cifra la comunicación.' },
  ],
  energia: [
    { q:'¿Cuál es una fuente de energía renovable?', o:['La solar', 'El petróleo', 'El carbón'], e:'El Sol no se agota y contamina poco.' },
    { q:'Una batería sirve para…', o:['Guardar energía para usarla después', 'Enfriar el computador', 'Conectarse a Internet'], e:'Las baterías almacenan energía eléctrica.' },
    { q:'En un circuito cerrado…', o:['La corriente fluye y el aparato funciona', 'No pasa corriente', 'Se apaga todo'], e:'Cerrado = camino completo para la corriente.' },
    { q:'¿Qué energía se obtiene del viento?', o:['Eólica', 'Solar', 'Nuclear'], e:'Los aerogeneradores producen energía eólica.' },
    { q:'¿Qué es mejor para ahorrar energía?', o:['Apagar lo que no usas', 'Dejar las luces prendidas', 'Cargar el celular todo el día'], e:'Apagar lo que no se usa evita gastar energía.' },
  ],
};

/* Devuelve n preguntas distintas del banco */
function arenaPickQuestions(topic, n){
  const bank = QUIZ_BANKS[topic].slice();
  const out = [];
  while (out.length < n && bank.length) out.push(bank.splice(rand(0, bank.length - 1), 1)[0]);
  return out;
}

/* ---------- Lección antes de jugar ---------- */
function startArenaLesson(key, onDone){
  const g = ARENA_GAMES.find(x => x.key === key);
  const L = ARENA_LESSONS[key];
  const info = CHAR_INFO[g.char];
  let i = 0;
  const render = () => {
    const s = L.slides[i];
    const last = i === L.slides.length - 1;
    showModal(`
      <div class="lesson">
        <img src="assets/characters/${g.char}.png" class="mission-avatar" alt="${info.name}">
        <div class="speaker-tag">${info.name.toUpperCase()} · ${info.role}</div>
        <div class="lesson-icon">${s.icon}</div>
        <h2>${s.title}</h2>
        <p class="lesson-text">${s.text}</p>
        <div class="lesson-dots">${L.slides.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="modal-actions">
          <button class="modal-btn" id="lsBack" ${i === 0 ? 'disabled' : ''}>◀ Atrás</button>
          <button class="modal-btn primary" id="lsNext">${last ? '¡A jugar! ▶' : 'Siguiente ▶'}</button>
        </div>
        ${last ? '' : '<button class="lesson-skip" id="lsSkip">Saltar lección</button>'}
      </div>`);
    $('#lsBack').onclick = () => { if (i > 0){ i--; render(); } };
    $('#lsNext').onclick = () => { if (!last){ i++; render(); } else finish(); };
    const sk = $('#lsSkip'); if (sk) sk.onclick = finish;
  };
  const finish = () => {
    if (!State.lessonsSeen) State.lessonsSeen = {};
    State.lessonsSeen[key] = true;
    saveProgress();
    hideModal();
    onDone();
  };
  render();
}

/* ---------- Pregunta dentro del juego (pausa la escena) ----------
   scene: escena de Phaser · item: {q,o,e} · topic: tema para "Temas para reforzar"
   cb(correcta:boolean) se llama al cerrar la explicación y reanudar. */
function arenaQuiz(scene, item, topic, cb){
  const g = ARENA_GAMES.find(x => x.key === arenaCurrentKey);
  const info = CHAR_INFO[g.char];
  scene.scene.pause();
  const opts = item.o.map((t, idx) => ({ t, ok: idx === 0 })).sort(() => Math.random() - 0.5);
  showModal(`
    <div class="lesson">
      <img src="assets/characters/${g.char}.png" class="mission-avatar" alt="${info.name}" style="width:64px;">
      <div class="speaker-tag">${info.name.toUpperCase()} pregunta…</div>
      <h2 style="font-size:17px;">${item.q}</h2>
      <div class="quiz-options" id="aqOpts">
        ${opts.map((o, k) => `<button class="quiz-opt" data-k="${k}">${o.t}</button>`).join('')}
      </div>
      <p class="level-hint" id="aqFeedback" style="min-height:42px;"></p>
      <div class="modal-actions"><button class="modal-btn primary hidden" id="aqGo">Continuar ▶</button></div>
    </div>`);
  let done = false;
  $$('#aqOpts .quiz-opt').forEach(b => b.addEventListener('click', () => {
    if (done) return; done = true;
    const ok = opts[+b.dataset.k].ok;
    b.classList.add(ok ? 'correct' : 'wrong');
    if (!ok){
      $$('#aqOpts .quiz-opt').forEach(x => { if (opts[+x.dataset.k].ok) x.classList.add('correct'); });
      recordMistake(topic, item.q);
    }
    beep(ok ? 'correct' : 'wrong');
    $('#aqFeedback').innerHTML = (ok ? '✅ <b>¡Correcto!</b> ' : '❌ <b>Casi.</b> ') + item.e;
    const go = $('#aqGo'); go.classList.remove('hidden');
    go.onclick = () => { hideModal(); scene.scene.resume(); if (cb) cb(ok); };
  }));
}

/* Texto flotante de enseñanza dentro del juego (se muestra unos segundos) */
function arenaTeach(scene, title, text, color){
  if (scene._teach){ scene._teach.destroy(); scene._teachT && scene._teachT.remove(); }
  const box = scene.add.container(400, 400).setDepth(60);
  const bg = scene.add.rectangle(0, 0, 640, 54, 0x0d1530, 0.94).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color || '#4fd6ff').color);
  const t = scene.add.text(0, 0, `${title}\n${text}`, { fontFamily:'Arial', fontSize:13, color:'#ffffff', align:'center', wordWrap:{ width:610 } }).setOrigin(0.5);
  box.add([bg, t]);
  box.setAlpha(0);
  scene.tweens.add({ targets:box, alpha:1, duration:200 });
  scene._teach = box;
  scene._teachT = scene.time.delayedCall(4200, () => {
    scene.tweens.add({ targets:box, alpha:0, duration:300, onComplete:() => box.destroy() });
  });
}
