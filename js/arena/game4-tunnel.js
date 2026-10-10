/* =========================================================
   ARENA · JUEGO 4 — Túnel de la Red
   3 carriles: cambiar de carril para esquivar malware y
   atrapar solo los paquetes del protocolo objetivo (color)
   que se muestra arriba. Sobrevivir 80 segundos.
   ========================================================= */
function ArenaTunnelScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaTunnel'); }

  preload(){
    arenaLoadPlayer(this);
    arenaLoadItems(this, ['data_box']);
    ['saw', 'spikecube', 'mace'].forEach(k => this.load.image('ob_' + k, `assets/obstacles/${k}.png`));
    this.load.image('bg_hub', 'assets/items/bg_hub.jpg');
    this.load.image('lag', 'assets/enemies/lag.png');
    this.load.image('glitch', 'assets/enemies/glitch.png');
  }

  create(){
    this.lanes = [110, 225, 340];
    this.laneIndex = 1;
    this.protocols = [
      { name:'HTTP', color:0x4fd6ff, css:'#4fd6ff', desc:'HTTP sirve para ver páginas web.',
        tasks:['Quieres abrir una página web 🌐', 'Quieres leer las noticias en tu navegador', 'Quieres entrar a una tienda en línea'] },
      { name:'FTP',  color:0xa4f23c, css:'#a4f23c', desc:'FTP sirve para enviar y recibir archivos.',
        tasks:['Necesitas enviar un archivo grande a otro computador 📁', 'Quieres subir tus fotos a un servidor', 'Quieres descargar un archivo desde un servidor'] },
      { name:'SSH',  color:0xff4d8f, css:'#ff4d8f', desc:'SSH permite controlar otro computador a distancia de forma segura.',
        tasks:['Debes controlar un servidor a distancia, de forma segura 🔐', 'Necesitas entrar de forma segura a otro computador', 'Quieres administrar una máquina remota con seguridad'] },
    ];
    this.target = 0;

    /* Fondo: centro de control de redes (se oscurece para que se vean los carriles) */
    this.add.image(0, 0, 'bg_hub').setOrigin(0, 0).setScale(800 / 1024).setDepth(-3);
    this.add.rectangle(400, 225, 800, 450, 0x050914, 0.55).setDepth(-2);
    this.lanes.forEach(y => this.add.rectangle(400, y, 780, 4, 0x4fd6ff, 0.55).setDepth(-1));
    this.add.rectangle(400, 36, 800, 62, 0x050914, 0.7).setDepth(5);
    this.targetText = this.add.text(20, 10, '', { fontFamily:'Arial Black', fontSize:15, color:'#ffffff', wordWrap:{ width:560 } }).setDepth(6);
    this.hint = this.add.text(20, 52, '', { fontFamily:'monospace', fontSize:11, color:'#9fb2d6' }).setDepth(6);
    this.protocols.forEach((p, i) => this.add.text(620, 8 + i * 17, '● ' + p.name, { fontFamily:'Arial Black', fontSize:13, color:p.css }).setDepth(6));
    this.updateTargetHint();

    this.player = this.physics.add.sprite(120, this.lanes[this.laneIndex], 'player');
    this.player.body.setAllowGravity(false);
    arenaFitPlayer(this.player, 72, 0.5, 0.6);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this, { laneMode:true });
    this.laneCooldown = 0;

    this.packets = this.physics.add.group({ allowGravity:false });
    this.malware = this.physics.add.group({ allowGravity:false });
    this.bonus = this.physics.add.group({ allowGravity:false });
    this.physics.add.overlap(this.player, this.bonus, (pl, b) => { b.destroy(); this.score += 40; arenaCollectChest('data_box'); arenaTeach(this, '📦 ¡Caja de datos!', 'Se abrirá como cofre al terminar.', '#ffd23f'); beep('win'); }, null, this);
    this.physics.add.overlap(this.player, this.packets, this.hitPacket, null, this);
    this.physics.add.overlap(this.player, this.malware, this.hitMalware, null, this);

    this.lives = 3 + ARENA_BONUS.lives;
    this.limit = 80 * ARENA_BONUS.time;
    this.qs = arenaPickQuestions('redes', 2);
    this.score = 0;
    this.elapsed = 0;
    this.invulnerable = false;
    this.ended = false;

    ArenaHUD.setLives(this.lives);
    ArenaHUD.setScore(0);
    ArenaHUD.setTimer(100);

    this.spawnTimer = this.time.addEvent({ delay:750, loop:true, callback:this.spawnThing, callbackScope:this });
    this.targetTimer = this.time.addEvent({ delay:8000, loop:true, callback:this.changeTarget, callbackScope:this });
  }

  updateTargetHint(){
    const p = this.protocols[this.target];
    if (this.taskIdx == null) this.taskIdx = rand(0, 2);
    this.targetText.setText(`📡 MISIÓN: ${p.tasks[this.taskIdx]}\n¿Qué protocolo necesitas? Atrapa solo sus paquetes.`);
    this.hint.setText('▲ ▼ (o W / S) cambian de carril · Si atrapas el protocolo equivocado, la red falla.');
  }

  changeTarget(){
    let next = this.target;
    while (next === this.target) next = rand(0, this.protocols.length - 1);
    this.target = next;
    this.taskIdx = rand(0, 2);
    this.updateTargetHint();
  }

  spawnThing(){
    if (this.ended) return;
    const lane = rand(0, 2);
    const roll = Math.random();
    if (roll < 0.30){
      const key = Phaser.Utils.Array.GetRandom(['lag', 'glitch', 'ob_saw', 'ob_spikecube', 'ob_mace']);
      const m = this.physics.add.sprite(860, this.lanes[lane], key);
      m.setScale(48 / m.height);
      this.malware.add(m);
      m.body.setSize(m.width * 0.7, m.height * 0.7, true);
      if (key === 'ob_saw' || key === 'ob_mace') this.tweens.add({ targets:m, angle:360, duration:700, repeat:-1 });
    } else if (roll < 0.37){
      /* Caja de datos: bonus que no depende del protocolo */
      const b = this.physics.add.sprite(860, this.lanes[lane], 'it_data_box');
      b.setScale(40 / b.height);
      this.bonus.add(b);
    } else {
      const p = this.protocols[rand(0, this.protocols.length - 1)];
      const c = this.add.circle(860, this.lanes[lane], 14, p.color);
      this.physics.add.existing(c);
      c.protocolIndex = this.protocols.indexOf(p);
      this.packets.add(c);
      c.label = this.add.text(c.x, c.y, p.name, { fontFamily:'Arial Black', fontSize:9, color:'#050914' }).setOrigin(0.5).setDepth(4);
    }
  }

  hitPacket(player, packet){
    const correct = packet.protocolIndex === this.target;
    const tp = this.protocols[this.target], pp = this.protocols[packet.protocolIndex];
    if (packet.label) packet.label.destroy();
    packet.destroy();
    if (correct){
      this.score += 15; beep('correct');
      arenaTeach(this, `Correcto · ${tp.name}`, tp.desc, '#a4f23c');
    } else {
      recordMistake('redes', `Protocolo: ${tp.tasks[this.taskIdx]} → ${tp.name}`);
      arenaTeach(this, `Incorrecto · era ${tp.name}, no ${pp.name}`, tp.desc, '#ff4d8f');
      this.loseLife();
    }
  }
  hitMalware(player, m){
    m.destroy();
    this.loseLife();
  }
  loseLife(){
    if (this.invulnerable || this.ended) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.cameras.main.shake(120, 0.01);
    this.time.delayedCall(700, () => { this.invulnerable = false; this.player.clearTint(); });
    if (this.lives <= 0) this.lose();
  }

  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta / 1000;
    this.laneCooldown -= delta;

    const up = this.cursors.up.isDown || this.keys.W.isDown || (this.touchState && this.touchState.up);
    const down = this.cursors.down.isDown || this.keys.S.isDown || (this.touchState && this.touchState.down);
    if (this.laneCooldown <= 0){
      if (up && this.laneIndex > 0){ this.laneIndex--; this.laneCooldown = 220; }
      else if (down && this.laneIndex < 2){ this.laneIndex++; this.laneCooldown = 220; }
    }
    this.player.y = Phaser.Math.Linear(this.player.y, this.lanes[this.laneIndex], 0.25);

    const speed = 220 + Math.min(220, this.elapsed * 4);
    const dx = speed * delta / 1000;
    this.packets.children.iterate(o => { if (o){ o.x -= dx; if (o.label) o.label.x = o.x; if (o.x < -40){ if (o.label) o.label.destroy(); o.destroy(); } } });
    this.malware.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -40) o.destroy(); } });
    this.bonus.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -40) o.destroy(); } });

    /* Preguntas de Net a los 25 s y a los 55 s */
    if (!this.q1 && this.elapsed >= 25 * ARENA_BONUS.time){ this.q1 = true; arenaQuiz(this, this.qs[0], 'redes', ok => { this.score += ok ? 40 : 0; }); }
    if (!this.q2 && this.elapsed >= 55 * ARENA_BONUS.time){ this.q2 = true; arenaQuiz(this, this.qs[1], 'redes', ok => { this.score += ok ? 40 : 0; }); }
    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(100 - (this.elapsed / this.limit * 100));
    if (this.elapsed >= this.limit) this.win();
  }

  win(){
    this.ended = true;
    this.spawnTimer.remove(); this.targetTimer.remove();
    this.scene.pause();
    arenaGameOver(true, this.score, '¡Atravesaste el túnel de la red sin dejar pasar malware!');
  }
  lose(){
    this.ended = true;
    this.spawnTimer.remove(); this.targetTimer.remove();
    this.scene.pause();
    arenaGameOver(false, this.score, 'Se acabaron las vidas. Fijate bien el color del protocolo objetivo.');
  }
}
)();
}
