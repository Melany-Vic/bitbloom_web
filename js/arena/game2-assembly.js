/* =========================================================
   ARENA · JUEGO 2 — Ensamblaje Bajo Presión (plataformas)
   Recolectar 4 piezas de PC saltando entre plataformas,
   evitando enemigos que patrullan. 2 rondas, la segunda
   más difícil.
   ========================================================= */
function ArenaAssemblyScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaAssembly'); }

  preload(){
    this.load.image('bit', 'assets/characters/bit.png');
    this.load.image('overclock', 'assets/enemies/overclock.png');
    this.load.image('corrupt', 'assets/enemies/corrupt.png');
    ['cpu','ram','gpu','ssd'].forEach(k => this.load.image(k, `assets/elements/${k}.png`));
  }

  create(){
    this.lives = 3;
    this.score = 0;
    this.round = 1;
    this.ended = false;
    this.invulnerable = false;

    ArenaHUD.setLives(this.lives);
    ArenaHUD.setScore(0);
    ArenaHUD.setTimer(100);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);

    this.platformGroup = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group({ allowGravity:false });
    this.enemies = this.physics.add.group({ allowGravity:false });
    this.door = null;
    this.hint = this.add.text(20, 16, '', { fontFamily:'monospace', fontSize:13, color:'#7d93b8' });

    this.player = this.physics.add.sprite(60, 350, 'bit');
    this.player.setDisplaySize(50, 50);
    this.player.body.setSize(70, 90);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.collectibles, this.collectPiece, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

    this.buildRound(1);
  }

  buildRound(round){
    this.round = round;
    this.collected = 0;
    this.needed = 4;
    this.platformGroup.clear(true, true);
    this.collectibles.clear(true, true);
    this.enemies.clear(true, true);
    if (this.door) this.door.destroy();

    const layout = [
      { x:400, y:430, w:820, h:30 },
      { x:200, y:330, w:140, h:20 },
      { x:420, y:270, w:140, h:20 },
      { x:640, y:330, w:140, h:20 },
      { x:380, y:180, w:160, h:20 },
      { x:700, y:200, w:120, h:20 },
    ];
    layout.forEach(p => {
      const rect = this.add.rectangle(p.x, p.y, p.w, p.h, 0x121b3d).setStrokeStyle(2, 0x233265);
      this.platformGroup.add(rect);
    });

    const pieces = [
      { key:'cpu', x:200, y:295 }, { key:'ram', x:420, y:235 },
      { key:'gpu', x:640, y:295 }, { key:'ssd', x:380, y:145 },
    ];
    pieces.forEach(p => {
      const item = this.physics.add.sprite(p.x, p.y, p.key).setDisplaySize(34, 34);
      item.body.allowGravity = false;
      this.collectibles.add(item);
    });

    this.door = this.add.rectangle(700, 165, 40, 60, 0x233265).setStrokeStyle(2, 0x4fd6ff);
    this.physics.add.existing(this.door);
    this.door.body.allowGravity = false;
    this.door.body.immovable = true;

    const enemyCount = round === 1 ? 1 : 3;
    const enemyKeys = ['overclock', 'corrupt'];
    const patrolSpans = [ [340,500,270], [560,720,330], [140,340,150] ];
    for (let i = 0; i < enemyCount; i++){
      const span = patrolSpans[i % patrolSpans.length];
      const en = this.physics.add.sprite(span[0], span[2] - 24, enemyKeys[i % enemyKeys.length]);
      en.setDisplaySize(42, 42);
      en.body.allowGravity = false;
      en.dir = 1;
      en.minX = span[0]; en.maxX = span[1];
      en.speed = round === 1 ? 70 : 110;
      this.enemies.add(en);
    }

    this.player.setPosition(60, 350);
    this.roundTime = round === 1 ? 90 : 75;
    this.elapsed = 0;
    this.hint.setText(`Ronda ${round}/2 — Recolectá las 4 piezas y llegá a la puerta.`);
  }

  collectPiece(player, item){
    item.destroy();
    this.collected++;
    this.score += 40;
    if (this.collected >= this.needed){
      this.door.setStrokeStyle(3, 0xa4f23c);
      this.hint.setText(`Ronda ${this.round}/2 — ¡Piezas completas! Andá a la puerta brillante.`);
    }
  }

  hitEnemy(player, enemy){
    if (this.invulnerable || this.ended) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(150, 0.01);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.player.setPosition(60, 350);
    this.time.delayedCall(900, () => { this.invulnerable = false; this.player.clearTint(); });
    if (this.lives <= 0) this.lose();
  }

  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta / 1000;

    const left = this.cursors.left.isDown || this.keys.A.isDown || (this.touchState && this.touchState.left);
    const right = this.cursors.right.isDown || this.keys.D.isDown || (this.touchState && this.touchState.right);
    const jump = this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || (this.touchState && this.touchState.up);

    this.player.setVelocityX(left ? -190 : right ? 190 : 0);
    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-560);

    this.enemies.children.iterate(en => {
      if (!en) return;
      en.x += en.dir * en.speed * delta / 1000;
      if (en.x <= en.minX || en.x >= en.maxX) en.dir *= -1;
    });

    if (this.collected >= this.needed && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.door.getBounds())){
      this.nextRoundOrWin();
    }

    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(100 - (this.elapsed / this.roundTime * 100));
    if (this.elapsed >= this.roundTime) this.lose();
  }

  nextRoundOrWin(){
    if (this.round >= 2){
      this.ended = true;
      this.scene.pause();
      arenaGameOver(true, this.score, '¡Armaste la computadora completa en las dos rondas!');
    } else {
      this.score += 30;
      this.buildRound(2);
    }
  }

  lose(){
    this.ended = true;
    this.scene.pause();
    arenaGameOver(false, this.score, this.lives <= 0
      ? 'Se acabaron las vidas. Repasá el mapa y evitá a los enemigos.'
      : 'Se acabó el tiempo antes de terminar el ensamblaje.');
  }
}
)();
}
