/* =========================================================
   ARENA · JUEGO 1 — Carrera de Bits (endless runner)
   Saltar obstáculos y enemigos, recolectar bits, sobrevivir
   60 segundos mientras la velocidad aumenta.
   ========================================================= */
function ArenaRunnerScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaRunner'); }

  preload(){
    this.load.image('bit', 'assets/characters/bit.png');
    this.load.image('bug', 'assets/enemies/bug.png');
    this.load.image('virus', 'assets/enemies/virus.png');
  }

  create(){
    this.groundY = 390;
    this.add.rectangle(400, this.groundY + 30, 900, 60, 0x0d1530).setStrokeStyle(2, 0x233265);
    this.add.text(20, 16, 'Saltá los obstáculos. ¡Sobreviví 60 segundos!', { fontFamily:'monospace', fontSize:14, color:'#7d93b8' });

    const groundBody = this.add.rectangle(400, this.groundY + 30, 900, 60, 0x0d1530, 0);
    this.physics.add.existing(groundBody, true);

    this.player = this.physics.add.sprite(120, this.groundY - 50, 'bit');
    this.player.setDisplaySize(56, 56);
    this.player.body.setSize(70, 90);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, groundBody);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);

    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);

    this.lives = 3;
    this.score = 0;
    this.elapsed = 0;
    this.invulnerable = false;
    this.ended = false;

    ArenaHUD.setLives(this.lives);
    ArenaHUD.setScore(0);
    ArenaHUD.setTimer(100);

    this.spawnTimer = this.time.addEvent({ delay:1100, loop:true, callback:this.spawnObstacle, callbackScope:this });
    this.collectTimer = this.time.addEvent({ delay:850, loop:true, callback:this.spawnCollectible, callbackScope:this });
  }

  spawnObstacle(){
    if (this.ended) return;
    const isEnemy = Math.random() < 0.55;
    let obj;
    if (isEnemy){
      const key = Math.random() < 0.5 ? 'bug' : 'virus';
      obj = this.physics.add.sprite(860, this.groundY - 28, key);
      obj.setDisplaySize(48, 48);
    } else {
      obj = this.add.rectangle(860, this.groundY - 20, 28, 40, 0xff4d8f);
      this.physics.add.existing(obj);
    }
    obj.body.allowGravity = false;
    obj.body.immovable = true;
    this.obstacles.add(obj);
  }

  spawnCollectible(){
    if (this.ended) return;
    const y = this.groundY - (Math.random() < 0.5 ? 60 : 140);
    const obj = this.add.circle(860, y, 11, 0x4fd6ff);
    this.physics.add.existing(obj);
    obj.body.allowGravity = false;
    this.collectibles.add(obj);
  }

  hitObstacle(player, obstacle){
    if (this.invulnerable || this.ended) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(150, 0.01);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.time.delayedCall(800, () => { this.invulnerable = false; this.player.clearTint(); });
    if (this.lives <= 0) this.lose();
  }

  collectItem(player, item){
    item.destroy();
    this.score += 10;
  }

  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta;
    const secs = this.elapsed / 1000;
    const speed = 220 + Math.min(260, secs * 4);

    const jumpPressed = this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || (this.touchState && this.touchState.up);
    if (jumpPressed && this.player.body.blocked.down) this.player.setVelocityY(-620);

    if ((this.cursors.left.isDown || this.keys.A.isDown || (this.touchState && this.touchState.left)) && this.player.x > 60) this.player.x -= 4;
    if ((this.cursors.right.isDown || this.keys.D.isDown || (this.touchState && this.touchState.right)) && this.player.x < 300) this.player.x += 4;

    const dx = speed * delta / 1000;
    this.obstacles.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -60) o.destroy(); } });
    this.collectibles.children.iterate(o => { if (o){ o.x -= dx; if (o.x < -60) o.destroy(); } });

    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(100 - (secs / 60 * 100));
    if (secs >= 60) this.win();
  }

  win(){
    this.ended = true;
    this.spawnTimer.remove(); this.collectTimer.remove();
    this.scene.pause();
    arenaGameOver(true, this.score, '¡Sobreviviste toda la carrera esquivando los errores del sistema!');
  }
  lose(){
    this.ended = true;
    this.spawnTimer.remove(); this.collectTimer.remove();
    this.scene.pause();
    arenaGameOver(false, this.score, 'Perdiste todas las vidas. ¡Practicá el salto y volvé a intentarlo!');
  }
}
)();
}
