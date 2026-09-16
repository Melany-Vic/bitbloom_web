/* =========================================================
   ARENA · JUEGO 3 — Defensa del Servidor
   Saltar SOBRE los enemigos (estilo Mario) para eliminarlos
   antes de que lleguen al servidor central. 3 oleadas.
   ========================================================= */
function ArenaDefenseScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaDefense'); }

  preload(){
    this.load.image('bit', 'assets/characters/bit.png');
    this.load.image('bug', 'assets/enemies/bug.png');
    this.load.image('virus', 'assets/enemies/virus.png');
    this.load.image('glitch', 'assets/enemies/glitch.png');
    this.load.image('pc', 'assets/elements/pc.png');
  }

  create(){
    this.groundY = 390;
    this.add.rectangle(400, this.groundY + 30, 900, 60, 0x0d1530).setStrokeStyle(2, 0x233265);

    this.server = this.add.sprite(400, this.groundY - 30, 'pc').setDisplaySize(56, 56);
    this.serverHealth = 100;
    this.healthBarBg = this.add.rectangle(400, this.groundY - 74, 100, 10, 0x233265);
    this.healthBar = this.add.rectangle(400, this.groundY - 74, 100, 10, 0xa4f23c);

    this.hint = this.add.text(20, 16, '', { fontFamily:'monospace', fontSize:13, color:'#7d93b8' });

    const groundBody = this.add.rectangle(400, this.groundY + 30, 900, 60, 0x0d1530, 0);
    this.physics.add.existing(groundBody, true);

    this.player = this.physics.add.sprite(400, this.groundY - 200, 'bit');
    this.player.setDisplaySize(52, 52);
    this.player.body.setSize(70, 90);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, groundBody);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, groundBody);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouch, null, this);

    this.lives = 3;
    this.score = 0;
    this.wave = 0;
    this.ended = false;
    this.enemyKeys = ['bug', 'virus', 'glitch'];

    ArenaHUD.setLives(this.lives);
    ArenaHUD.setScore(0);
    ArenaHUD.setTimer(100);

    this.startWave();
  }

  startWave(){
    this.wave++;
    if (this.wave > 3){ this.win(); return; }
    this.toSpawn = 3 + this.wave * 2;
    this.spawned = 0;
    this.waveSpeed = 60 + this.wave * 30;
    this.hint.setText(`Oleada ${this.wave}/3 — Saltá sobre los enemigos para eliminarlos.`);
    this.spawnEvent = this.time.addEvent({
      delay: Math.max(500, 1000 - this.wave * 150), loop:true, callback: this.spawnEnemy, callbackScope:this,
    });
  }

  spawnEnemy(){
    if (this.spawned >= this.toSpawn){ this.spawnEvent.remove(); return; }
    this.spawned++;
    const fromLeft = Math.random() < 0.5;
    const key = this.enemyKeys[rand(0, this.enemyKeys.length - 1)];
    const en = this.physics.add.sprite(fromLeft ? -30 : 830, this.groundY - 26, key);
    en.setDisplaySize(40, 40);
    en.body.setAllowGravity(false);
    en.setVelocityX((fromLeft ? 1 : -1) * this.waveSpeed);
    en.dir = fromLeft ? 1 : -1;
    this.enemies.add(en);
  }

  onEnemyTouch(player, enemy){
    const stomped = player.body.velocity.y > 0 && (player.y + player.displayHeight * 0.3) < enemy.y;
    if (stomped){
      enemy.destroy();
      this.score += 25;
      player.setVelocityY(-380);
      beep('correct');
    } else {
      if (this.invulnerable || this.ended) return;
      this.lives--;
      ArenaHUD.setLives(this.lives);
      this.invulnerable = true;
      player.setTint(0xff4d8f);
      this.cameras.main.shake(150, 0.01);
      this.time.delayedCall(800, () => { this.invulnerable = false; player.clearTint(); });
      if (this.lives <= 0) this.lose();
    }
  }

  damageServer(amount){
    this.serverHealth = Math.max(0, this.serverHealth - amount);
    this.healthBar.width = this.serverHealth;
    if (this.serverHealth <= 0) this.lose();
  }

  update(time, delta){
    if (this.ended) return;

    const left = this.cursors.left.isDown || this.keys.A.isDown || (this.touchState && this.touchState.left);
    const right = this.cursors.right.isDown || this.keys.D.isDown || (this.touchState && this.touchState.right);
    const jump = this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || (this.touchState && this.touchState.up);
    this.player.setVelocityX(left ? -200 : right ? 200 : 0);
    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-560);

    this.enemies.children.iterate(en => {
      if (!en) return;
      if (Math.abs(en.x - 400) < 26){
        this.damageServer(12);
        en.destroy();
        return;
      }
    });

    if (this.spawned >= this.toSpawn && this.enemies.countActive() === 0 && !this.ended){
      this.time.delayedCall(600, () => this.startWave());
      this.toSpawn = Infinity; // evita relanzar la misma oleada mientras esperamos
    }

    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(this.serverHealth);
  }

  win(){
    this.ended = true;
    this.scene.pause();
    arenaGameOver(true, this.score, '¡Defendiste el servidor de las tres oleadas de amenazas!');
  }
  lose(){
    this.ended = true;
    this.scene.pause();
    arenaGameOver(false, this.score, this.serverHealth <= 0
      ? 'El servidor quedó dañado. Saltá sobre los enemigos antes de que lleguen al centro.'
      : 'Se acabaron las vidas. ¡Volvé a intentarlo!');
  }
}
)();
}
