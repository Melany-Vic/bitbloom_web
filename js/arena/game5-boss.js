/* =========================================================
   ARENA · JUEGO 5 — Asalto al Corruptor (jefe final)
   Fase 1: recolectar 3 herramientas esquivando proyectiles.
   Fase 2: saltar SOBRE el Corruptor cuando esté vulnerable,
   3 golpes para ganar. El ritmo se acelera con cada golpe.
   ========================================================= */
function ArenaBossScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaBoss'); }

  preload(){
    this.load.image('bit', 'assets/characters/bit.png');
    this.load.image('corruptor', 'assets/enemies/corrupt.png');
  }

  create(){
    this.groundY = 400;
    this.add.rectangle(400, this.groundY + 25, 900, 50, 0x0d1530).setStrokeStyle(2, 0x233265);
    const platforms = this.physics.add.staticGroup();
    [ [180,300,140], [620,300,140], [400,220,150] ].forEach(([x,y,w]) => {
      const r = this.add.rectangle(x, y, w, 18, 0x121b3d).setStrokeStyle(2, 0x233265);
      platforms.add(r);
    });

    this.hint = this.add.text(20, 16, '', { fontFamily:'monospace', fontSize:13, color:'#7d93b8' });
    this.hpBarBg = this.add.rectangle(400, 46, 200, 12, 0x233265);
    this.hpBar = this.add.rectangle(400, 46, 200, 12, 0xff4d8f);
    this.hpBarBg.setVisible(false); this.hpBar.setVisible(false);

    const groundBody = this.add.rectangle(400, this.groundY + 25, 900, 50, 0x0d1530, 0);
    this.physics.add.existing(groundBody, true);

    this.player = this.physics.add.sprite(80, this.groundY - 50, 'bit');
    this.player.setDisplaySize(50, 50);
    this.player.body.setSize(70, 90);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, groundBody);
    this.physics.add.collider(this.player, platforms);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);

    this.corruptor = this.add.sprite(400, 90, 'corruptor').setDisplaySize(70, 70);

    this.tools = this.physics.add.group({ allowGravity:false });
    [ [180,260], [620,260], [400,180] ].forEach(([x,y]) => {
      const t = this.add.text(x, y, '🔧', { fontSize:28 });
      this.physics.add.existing(t);
      t.body.setAllowGravity(false);
      this.tools.add(t);
    });
    this.physics.add.overlap(this.player, this.tools, this.collectTool, null, this);

    this.projectiles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.projectiles, this.hitByProjectile, null, this);
    this.physics.add.collider(this.projectiles, groundBody, p => p.destroy());

    this.lives = 3;
    this.score = 0;
    this.toolsCollected = 0;
    this.phase = 1;
    this.elapsed = 0;
    this.timeLimit = 120;
    this.invulnerable = false;
    this.ended = false;

    ArenaHUD.setLives(this.lives);
    ArenaHUD.setScore(0);
    ArenaHUD.setTimer(100);

    this.hint.setText('Fase 1/2 — Recolectá las 3 herramientas 🔧 y esquivá lo que cae.');
    this.projTimer = this.time.addEvent({ delay:1400, loop:true, callback:this.spawnProjectile, callbackScope:this });
  }

  collectTool(player, tool){
    tool.destroy();
    this.toolsCollected++;
    this.score += 30;
    if (this.toolsCollected >= 3) this.startPhase2();
  }

  startPhase2(){
    this.phase = 2;
    this.bossHp = 3;
    this.hpBarBg.setVisible(true); this.hpBar.setVisible(true);
    this.hint.setText('Fase 2/2 — Saltá SOBRE el Corruptor cuando brille verde.');
    this.physics.add.existing(this.corruptor);
    this.corruptor.body.setAllowGravity(false);
    this.corruptor.dir = 1;
    this.physics.add.overlap(this.player, this.corruptor, this.onBossTouch, null, this);
    this.vulnerable = false;
    this.vulnTimer = this.time.addEvent({ delay:3600, loop:true, callback:this.toggleVulnerable, callbackScope:this });
  }

  toggleVulnerable(){
    this.vulnerable = true;
    this.corruptor.setTint(0xa4f23c);
    this.time.delayedCall(1400, () => { this.vulnerable = false; this.corruptor.clearTint(); });
  }

  onBossTouch(player, boss){
    const stomped = this.vulnerable && player.body.velocity.y > 0 && (player.y + player.displayHeight * 0.3) < boss.y + 20;
    if (stomped){
      this.bossHp--;
      this.score += 60;
      this.hpBar.width = (this.bossHp / 3) * 200;
      player.setVelocityY(-420);
      beep('correct');
      this.cameras.main.shake(180, 0.015);
      this.vulnerable = false;
      this.corruptor.clearTint();
      if (this.bossHp <= 0) this.win();
      else if (this.projTimer.delay > 700) this.projTimer.delay -= 250;
    } else {
      this.loseLife();
    }
  }

  spawnProjectile(){
    if (this.ended) return;
    const x = rand(60, 740);
    const p = this.add.circle(x, 0, 10, 0xff4d8f);
    this.physics.add.existing(p);
    p.body.setAllowGravity(true);
    p.body.setVelocityY(220 + this.elapsed * 2);
    this.projectiles.add(p);
  }

  hitByProjectile(player, proj){
    proj.destroy();
    this.loseLife();
  }

  loseLife(){
    if (this.invulnerable || this.ended) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.cameras.main.shake(150, 0.01);
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

    if (this.phase === 2 && this.corruptor.body){
      this.corruptor.x += this.corruptor.dir * 90 * delta / 1000;
      if (this.corruptor.x < 140 || this.corruptor.x > 660) this.corruptor.dir *= -1;
    }

    this.projectiles.children.iterate(p => { if (p && p.y > 460) p.destroy(); });

    ArenaHUD.setScore(this.score);
    ArenaHUD.setTimer(100 - (this.elapsed / this.timeLimit * 100));
    if (this.elapsed >= this.timeLimit) this.lose();
  }

  win(){
    this.ended = true;
    this.projTimer.remove();
    if (this.vulnTimer) this.vulnTimer.remove();
    this.scene.pause();
    arenaGameOver(true, this.score, '¡Derrotaste al Corruptor! BloomLand está a salvo otra vez.');
  }
  lose(){
    this.ended = true;
    this.projTimer.remove();
    if (this.vulnTimer) this.vulnTimer.remove();
    this.scene.pause();
    arenaGameOver(false, this.score, this.phase === 1
      ? 'No lograste juntar las 3 herramientas a tiempo.'
      : 'El Corruptor resistió esta vez. ¡Esperá a que se ponga verde para saltarle encima!');
  }
}
)();
}
