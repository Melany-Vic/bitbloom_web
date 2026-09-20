/* =========================================================
   ARENA · JUEGO 4 — Túnel de la Red
   3 carriles: cambiar de carril para esquivar malware y
   atrapar solo los paquetes del protocolo objetivo (color)
   que se muestra arriba. Sobrevivir 55 segundos.
   ========================================================= */
function ArenaTunnelScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaTunnel'); }

  preload(){
    this.load.image('bit', 'assets/characters/bit.png');
    this.load.image('lag', 'assets/enemies/lag.png');
    this.load.image('glitch', 'assets/enemies/glitch.png');
  }

  create(){
    this.lanes = [110, 225, 340];
    this.laneIndex = 1;
    this.protocols = [
      { name:'HTTP', color:0x4fd6ff, css:'#4fd6ff' },
      { name:'FTP',  color:0xa4f23c, css:'#a4f23c' },
      { name:'SSH',  color:0xff4d8f, css:'#ff4d8f' },
    ];
    this.target = 0;

    this.lanes.forEach(y => this.add.rectangle(400, y, 780, 4, 0x233265));
    this.hint = this.add.text(20, 16, '', { fontFamily:'monospace', fontSize:13, color:'#7d93b8' });
    this.targetText = this.add.text(650, 16, '', { fontFamily:'Arial Black', fontSize:16, color:'#ffffff' });
    this.updateTargetHint();

    this.player = this.physics.add.sprite(120, this.lanes[this.laneIndex], 'bit');
    this.player.setDisplaySize(48, 48);
    this.player.body.setAllowGravity(false);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);
    this.laneCooldown = 0;

    this.packets = this.physics.add.group({ allowGravity:false });
    this.malware = this.physics.add.group({ allowGravity:false });
    this.physics.add.overlap(this.player, this.packets, this.hitPacket, null, this);
    this.physics.add.overlap(this.player, this.malware, this.hitMalware, null, this);

    this.lives = 3;
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
    this.targetText.setText(`Objetivo: ${p.name}`);
    this.targetText.setColor(p.css);
    this.hint.setText('↑ / ↓ o W / S para cambiar de carril. Atrapá solo el color del objetivo.');
  }

  changeTarget(){
    let next = this.target;
    while (next === this.target) next = rand(0, this.protocols.length - 1);
    this.target = next;
    this.updateTargetHint();
  }

  spawnThing(){
    if (this.ended) return;
    const lane = rand(0, 2);
    if (Math.random() < 0.3){
      const key = Math.random() < 0.5 ? 'lag' : 'glitch';
      const m = this.physics.add.sprite(860, this.lanes[lane], key);
      m.setDisplaySize(42, 42);
      this.malware.add(m);
    } else {
      const p = this.protocols[rand(0, this.protocols.length - 1)];
      const c = this.add.circle(860, this.lanes[lane], 14, p.color);
      this.physics.add.existing(c);
      c.protocolIndex = this.protocols.indexOf(p);
      this.packets.add(c);
    }
  }

  hitPacket(player, packet){
    const correct = packet.protocolIndex === this.target;
    packet.destroy();
    if (correct){ this.score += 15; beep('correct'); }
    else this.loseLife();
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
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    if (this.laneCooldown <= 0){
      if (up && this.laneIndex > 0){ this.laneIndex--; this.laneCooldown = 220; }
      else if (down && this.laneIndex < 2){ this.laneIndex++; this.laneCooldown = 220; }
    }
    this.player.y = Phaser.Math.Linear(this.player.y, this.lanes[this.laneIndex], 0.25);

    const speed = 220 + Math.min(220, this.elapsed * 4);
    const dx = speed * delta / 1000;
    this.packets.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -40) o.destroy(); } });
    this.malware.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -40) o.destroy(); } });

    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(100 - (this.elapsed / 55 * 100));
    if (this.elapsed >= 55) this.win();
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
