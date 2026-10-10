/* =========================================================
   ARENA · JUEGO 6 — Bóveda de Datos (con Data, de Bases de Datos)
   Los problemas de una base de datos se acercan a la bóveda
   desde los lados. Lee cada problema y toca la HERRAMIENTA
   correcta antes de que llegue:
   🗂️ Consultar (SQL) · ☁️ Nube · 🛡️ Seguridad · 🕒 Copia de seguridad
   📊 Análisis · ➕ Tablas (agregar registros)
   También puedes tocar los premios que flotan: ⭐ cristal, 🔗 relaciones
   (congela el tiempo), 🖥️ servidor extra (+1 vida) y los cofres.
   Resuelve 16 problemas para proteger los datos.
   ========================================================= */
function ArenaDataScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaData'); }

  preload(){
    arenaLoadPlayer(this);
    arenaLoadItems(this, ['coin', 'xp_crystal', 'reward_crate', 'data_box']);
    this.load.image('bg_db', 'assets/db/bg_db.jpg');
    ['sql', 'nube', 'seguridad', 'backup', 'analisis', 'tabla', 'relacion', 'servidor'].forEach(k => this.load.image('db_' + k, `assets/db/${k}.png`));
    ['bug', 'virus', 'glitch', 'lag'].forEach(k => this.load.image(k, `assets/enemies/${k}.png`));
  }

  create(){
    this.TOOLS = [
      { key:'sql',       name:'Consultar',  full:'Consultas SQL',          color:0x4fd6ff },
      { key:'nube',      name:'Nube',       full:'Base de datos en la nube', color:0x7dd3fc },
      { key:'seguridad', name:'Seguridad',  full:'Seguridad y permisos',   color:0xa78bfa },
      { key:'backup',    name:'Copia',      full:'Copia de seguridad',     color:0xffd23f },
      { key:'analisis',  name:'Análisis',   full:'Análisis de datos',      color:0xa4f23c },
      { key:'tabla',     name:'Tablas',     full:'Tablas y registros',     color:0xff7ac8 },
    ];
    this.PROBLEMS = [
      { t:'sql', s:'Necesitas encontrar al cliente con id = 1', e:'Con SQL pides solo lo que necesitas: SELECT * FROM datos WHERE id=1;' },
      { t:'sql', s:'Quieres ver solo los alumnos de 5.º grado', e:'SQL usa WHERE para filtrar: busca únicamente los registros que cumplen la condición.' },
      { t:'sql', s:'Hay que corregir el teléfono de un contacto', e:'SQL también modifica datos con UPDATE y agrega con INSERT.' },
      { t:'nube', s:'Quieres usar tus datos desde cualquier lugar', e:'Una base de datos en la nube guarda la información en servidores de Internet, accesibles desde cualquier sitio.' },
      { t:'nube', s:'Muchas personas deben guardar y descargar datos a la vez', e:'La nube permite acceso compartido y escala cuando hay mucha gente conectada.' },
      { t:'seguridad', s:'Un intruso intenta entrar sin permiso', e:'La seguridad usa usuarios, contraseñas y permisos para que solo entre quien debe.' },
      { t:'seguridad', s:'Alguien quiere ver las contraseñas de todos', e:'Los datos sensibles se protegen con permisos y cifrado.' },
      { t:'seguridad', s:'Hay que proteger los datos personales de los alumnos', e:'Proteger la privacidad es parte de la seguridad: accesos controlados y cifrado.' },
      { t:'backup', s:'Se cortó la luz y se perdieron datos', e:'Una copia de seguridad (backup) guarda los datos para recuperarlos si algo falla.' },
      { t:'backup', s:'Un error borró una tabla completa', e:'Con un backup puedes restaurar la información borrada.' },
      { t:'backup', s:'Quieres guardar una copia cada noche', e:'Los backups automáticos se programan cada cierto tiempo para no perder datos.' },
      { t:'analisis', s:'Quieres ver gráficos de las ventas del mes', e:'El análisis de datos convierte registros en gráficos y conclusiones.' },
      { t:'analisis', s:'¿Qué producto se vende más? Hay que descubrirlo', e:'Analizar los datos permite encontrar patrones y tomar decisiones.' },
      { t:'tabla', s:'Llegó un alumno nuevo: hay que registrarlo', e:'Cada registro nuevo se agrega como una fila en la tabla (INSERT).' },
      { t:'tabla', s:'Quieres ordenar datos en filas y columnas', e:'Una tabla organiza la información: filas = registros, columnas = campos.' },
      { t:'tabla', s:'Falta crear la tabla de productos', e:'Las bases de datos guardan la información en tablas; cada tabla trata un tema.' },
    ];
    this.GOAL = 16;

    this.add.image(0, 0, 'bg_db').setOrigin(0, 0).setScale(800 / 1024).setDepth(-5);
    this.add.rectangle(400, 225, 800, 450, 0x050914, 0.12).setDepth(-4);
    this.dbX = 400; this.dbY = 255;

    // Data (el robot) junto a la bóveda
    this.robot = this.add.image(95, 310, 'player').setDepth(3);
    this.robot.setScale(Math.min(96 / this.robot.height, 96 / this.robot.width));
    this.tweens.add({ targets:this.robot, y:300, duration:900, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    this.robotR = this.add.image(705, 310, 'player').setDepth(3).setFlipX(true);
    this.robotR.setScale(this.robot.scale);
    this.tweens.add({ targets:this.robotR, y:300, duration:1000, yoyo:true, repeat:-1, ease:'Sine.inOut' });

    // Panel de herramientas
    this.add.rectangle(400, 412, 800, 76, 0x050914, 0.82).setStrokeStyle(2, 0x233265).setDepth(10);
    this.buttons = [];
    this.TOOLS.forEach((t, i) => {
      const x = 95 + i * 122, y = 405;
      const base = this.add.rectangle(x, y, 108, 64, 0x0d1530, 0.95).setStrokeStyle(2, t.color).setDepth(11);
      const img = this.add.image(x, y - 6, 'db_' + t.key).setDepth(12);
      img.setScale(44 / img.height);
      const lab = this.add.text(x, y + 22, `${i + 1} · ${t.name}`, { fontFamily:'Arial', fontSize:11, color:'#cfe8ff' }).setOrigin(0.5).setDepth(12);
      base.setInteractive({ useHandCursor:true });
      base.on('pointerdown', () => this.useTool(i));
      this.buttons.push({ base, img, lab, color:t.color });
    });
    this.input.keyboard.on('keydown', e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 6) this.useTool(n - 1); });

    // Marcadores
    this.progText = this.add.text(400, 14, '', { fontFamily:'Arial Black', fontSize:15, color:'#ffffff', stroke:'#050914', strokeThickness:4 }).setOrigin(0.5, 0).setDepth(20);
    this.comboText = this.add.text(790, 14, '', { fontFamily:'Arial Black', fontSize:14, color:'#ffd23f', stroke:'#050914', strokeThickness:4 }).setOrigin(1, 0).setDepth(20);
    this.add.text(10, 14, 'Lee el problema y toca la herramienta correcta (o teclas 1–6)', { fontFamily:'monospace', fontSize:11, color:'#cfe8ff', stroke:'#050914', strokeThickness:3 }).setDepth(20);

    this.problems = [];
    this.bonuses = [];
    this.lives = 3 + ARENA_BONUS.lives; this.score = 0; this.elapsed = 0; this.solved = 0; this.streak = 0;
    this.limit = 150 * ARENA_BONUS.time;
    this.spawnIn = 1200; this.bonusIn = 9000; this.freezeUntil = 0; this.jamUntil = 0;
    this.lastIdx = -1; this.side = 0; this.ended = false;
    this.qs = arenaPickQuestions('bd', 2);
    ArenaHUD.setLives(this.lives); ArenaHUD.setScore(0); ArenaHUD.setTimer(100);
    this.refreshText();
  }

  refreshText(){
    this.progText.setText(`Problemas resueltos: ${this.solved} / ${this.GOAL}`);
    this.comboText.setText(this.streak >= 2 ? `🔥 Racha ×${this.streak}` : '');
  }

  /* ---------- Problemas ---------- */
  spawnProblem(){
    let idx; do { idx = rand(0, this.PROBLEMS.length - 1); } while (idx === this.lastIdx);
    this.lastIdx = idx;
    const p = this.PROBLEMS[idx];
    const fromLeft = (this.side++ % 2) === 0;
    const tool = this.TOOLS.find(t => t.key === p.t);
    const enemyKey = p.t === 'seguridad' ? 'glitch' : p.t === 'backup' ? 'lag' : (Math.random() < 0.5 ? 'bug' : 'virus');
    const x0 = fromLeft ? -90 : 890, y = Phaser.Math.Between(185, 270);
    const c = this.add.container(x0, y).setDepth(6);
    const spr = this.add.image(0, 0, enemyKey); spr.setScale(54 / spr.height);
    const card = this.add.rectangle(0, -64, 200, 56, 0x0d1530, 0.95).setStrokeStyle(2, 0xffffff);
    const txt = this.add.text(0, -64, p.s, { fontFamily:'Arial', fontSize:12, color:'#ffffff', align:'center', wordWrap:{ width:186 } }).setOrigin(0.5);
    c.add([spr, card, txt]);
    this.tweens.add({ targets:spr, y:6, duration:340, yoyo:true, repeat:-1 });
    const stopX = fromLeft ? this.dbX - 92 : this.dbX + 92;
    const speed = 36 + Math.min(40, this.solved * 2.4);
    this.problems.push({ c, card, p, tool, fromLeft, stopX, speed, born:this.elapsed });
  }

  /* ---------- Herramientas ---------- */
  useTool(i){
    if (this.ended) return;
    const t = this.TOOLS[i];
    const btn = this.buttons[i];
    this.tweens.add({ targets:[btn.base, btn.img], scale:'*=1.12', duration:70, yoyo:true });
    if (this.time.now < this.jamUntil) return;                       // herramientas bloqueadas un instante
    // el problema más cercano que necesita esta herramienta
    const match = this.problems.filter(q => q.p.t === t.key).sort((a, b) => Math.abs(a.c.x - a.stopX) - Math.abs(b.c.x - b.stopX))[0];
    if (match){ this.solve(match, i); return; }
    // herramienta equivocada
    const near = this.problems.slice().sort((a, b) => Math.abs(a.c.x - a.stopX) - Math.abs(b.c.x - b.stopX))[0];
    this.streak = 0; this.refreshText();
    this.jamUntil = this.time.now + 700;
    beep('wrong');
    this.buttons.forEach(b => b.base.setAlpha(0.45));
    this.time.delayedCall(700, () => this.buttons.forEach(b => b.base.setAlpha(1)));
    if (near){
      const right = this.TOOLS.find(x => x.key === near.p.t);
      recordMistake('bd', `${near.p.s} → ${right.full}`);
      arenaTeach(this, `Esa herramienta no sirve para este problema`, `Pista: «${near.p.s}» se resuelve con ${right.full}.`, '#ff4d8f', 60);
    } else {
      arenaTeach(this, 'Todavía no hay un problema para eso', 'Espera a que llegue uno y lee qué necesita.', '#ff4d8f', 60);
    }
  }

  solve(q, toolIdx){
    this.problems = this.problems.filter(x => x !== q);
    const t = this.TOOLS[toolIdx];
    // rayo desde el robot hasta el problema
    const g = this.add.graphics().setDepth(9);
    g.lineStyle(5, t.color, 1); g.lineBetween(q.fromLeft ? 120 : 680, 300, q.c.x, q.c.y);
    this.tweens.add({ targets:g, alpha:0, duration:300, onComplete:() => g.destroy() });
    for (let k = 0; k < 10; k++){
      const r = this.add.rectangle(q.c.x, q.c.y, 7, 7, t.color).setDepth(9);
      this.tweens.add({ targets:r, x:q.c.x + Phaser.Math.Between(-60, 60), y:q.c.y + Phaser.Math.Between(-60, 60), alpha:0, duration:450, onComplete:() => r.destroy() });
    }
    q.c.destroy();
    this.streak++; this.solved++;
    const gain = Math.round(20 * (1 + Math.min(this.streak, 5) * 0.25));
    this.score += gain;
    beep('correct');
    arenaTeach(this, `Correcto · ${t.full}`, q.p.e, '#a4f23c', 60);
    this.refreshText();
    if (this.solved === 8) this.time.delayedCall(900, () => arenaQuiz(this, this.qs[0], 'bd', ok => { this.score += ok ? 40 : 0; }));
    if (this.solved === 13) this.time.delayedCall(900, () => arenaQuiz(this, this.qs[1], 'bd', ok => { this.score += ok ? 40 : 0; }));
    if (this.solved >= this.GOAL) this.win();
  }

  breach(q){
    this.problems = this.problems.filter(x => x !== q);
    const right = this.TOOLS.find(x => x.key === q.p.t);
    recordMistake('bd', `${q.p.s} → ${right.full}`);
    q.c.destroy();
    this.streak = 0; this.refreshText();
    this.lives--; ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(180, 0.012);
    beep('wrong');
    arenaTeach(this, `¡El problema llegó a la bóveda! Era: ${right.full}`, q.p.e, '#ff4d8f', 60);
    if (this.lives <= 0) this.lose();
  }

  /* ---------- Premios que se tocan ---------- */
  spawnBonus(){
    const kinds = ['coin', 'crystal', 'relacion', 'servidor', 'crate', 'databox'];
    const k = Phaser.Utils.Array.GetRandom(kinds);
    const key = { coin:'it_coin', crystal:'it_xp_crystal', relacion:'db_relacion', servidor:'db_servidor', crate:'it_reward_crate', databox:'it_data_box' }[k];
    const fromLeft = Math.random() < 0.5;
    const o = this.add.image(fromLeft ? -40 : 840, Phaser.Math.Between(70, 130), key).setDepth(8);
    o.setScale((k === 'coin' ? 32 : 50) / o.height);
    o.setInteractive(new Phaser.Geom.Rectangle(-o.width * 0.3, -o.height * 0.3, o.width * 1.6, o.height * 1.6), Phaser.Geom.Rectangle.Contains);
    o.on('pointerdown', () => this.takeBonus(o, k));
    this.tweens.add({ targets:o, x:fromLeft ? 840 : -40, duration:7000, onComplete:() => o.destroy() });
    this.tweens.add({ targets:o, y:o.y + 14, duration:600, yoyo:true, repeat:-1, ease:'Sine.inOut' });
  }
  takeBonus(o, k){
    if (!o.active) return;
    const x = o.x, y = o.y; o.destroy();
    const pop = (s, c) => { const t = this.add.text(x, y, s, { fontFamily:'Arial Black', fontSize:15, color:c || '#ffd23f', stroke:'#050914', strokeThickness:4 }).setOrigin(0.5).setDepth(30); this.tweens.add({ targets:t, y:y - 34, alpha:0, duration:800, onComplete:() => t.destroy() }); };
    beep('win');
    if (k === 'coin'){ this.score += 15; pop('+15'); }
    else if (k === 'crate' || k === 'databox'){ arenaCollectChest(k === 'crate' ? 'reward_crate' : 'data_box'); this.score += 20; pop('¡Cofre!'); }
    else if (k === 'servidor'){ this.lives++; ArenaHUD.setLives(this.lives); pop('+1 vida', '#a4f23c'); arenaTeach(this, 'Servidor de respaldo', 'Tener otro servidor ayuda a que los datos sigan disponibles si uno falla.', '#a4f23c', 60); }
    else if (k === 'relacion'){ this.freezeUntil = this.time.now + 5000; pop('¡Tiempo congelado!', '#4fd6ff'); arenaTeach(this, 'Relaciones entre tablas', 'Las relaciones conectan tablas (por ejemplo alumnos y cursos) sin repetir datos.', '#4fd6ff', 60); }
    else if (k === 'crystal'){
      // super consulta: resuelve todos los problemas en pantalla
      const all = this.problems.slice();
      all.forEach(q => { this.problems = this.problems.filter(x => x !== q); q.c.destroy(); this.solved++; this.score += 15; });
      pop('¡Super consulta!', '#4fd6ff'); this.refreshText();
      if (this.solved >= this.GOAL) this.win();
    }
  }

  /* ---------- Bucle ---------- */
  update(time, delta){
    if (this.ended) return;
    const dt = delta / 1000;
    this.elapsed += dt;
    const frozen = time < this.freezeUntil;

    this.spawnIn -= delta;
    if (this.spawnIn <= 0 && this.problems.length < 3){
      this.spawnProblem();
      this.spawnIn = Math.max(2200, 4600 - this.solved * 140);
    } else if (this.spawnIn <= 0){ this.spawnIn = 400; }
    this.bonusIn -= delta;
    if (this.bonusIn <= 0){ this.spawnBonus(); this.bonusIn = Phaser.Math.Between(8000, 12000); }

    this.problems.slice().forEach(q => {
      if (!frozen) q.c.x += (q.fromLeft ? 1 : -1) * q.speed * dt;
      const left = Math.abs(q.stopX - q.c.x);
      const total = Math.abs(q.stopX - (q.fromLeft ? -90 : 890));
      const danger = 1 - left / total;
      q.card.setStrokeStyle(2, danger > 0.75 ? 0xff4d8f : danger > 0.5 ? 0xffd23f : 0xffffff);
      if ((q.fromLeft && q.c.x >= q.stopX) || (!q.fromLeft && q.c.x <= q.stopX)) this.breach(q);
    });

    ArenaHUD.setScore(Math.floor(this.score));
    ArenaHUD.setTimer(100 - this.elapsed / this.limit * 100);
    if (this.elapsed >= this.limit) this.lose('Se acabó el tiempo. ¡Lee rápido cada problema!');
  }

  win(){
    if (this.ended) return;
    this.ended = true;
    this.time.delayedCall(700, () => {
      this.scene.pause();
      arenaGameOver(true, Math.floor(this.score) + 60, '¡Bóveda protegida! Aprendiste para qué sirven las consultas SQL, las tablas, la nube, la seguridad, las copias de seguridad y el análisis de datos.');
    });
  }
  lose(msg){
    if (this.ended) return;
    this.ended = true; this.scene.pause();
    arenaGameOver(false, Math.floor(this.score), typeof msg === 'string' ? msg : 'Los problemas llegaron a la bóveda. Repasa qué herramienta resuelve cada situación.');
  }
}
)();
}
