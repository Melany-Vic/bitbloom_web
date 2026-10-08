/* =========================================================
   ARENA · JUEGO 3 — Taller de Píxeles (con Pixel, de Gráficos)
   Las pantallas forman todos sus colores mezclando luz ROJA (R),
   VERDE (G) y AZUL (B): el modelo RGB.
   Cada ronda pide un color. Atrapá las gotas de luz que lo forman
   (por ejemplo AMARILLO = R + G) y evitá las que no van o los
   "píxeles muertos". Cada color completado pinta un cuadrito del
   cuadro. ¡Pintá los 8 antes de que se acabe el tiempo!
   ========================================================= */
function ArenaPixelScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaPixel'); }

  preload(){
    arenaLoadPlayer(this);
    arenaLoadItems(this, ['coin', 'bit_coin', 'xp_crystal']);
    this.load.image('glitch', 'assets/enemies/glitch.png');
    this.load.image('bug', 'assets/enemies/bug.png');
  }

  create(){
    this.COMP = { R:0xff3b3b, G:0x3bff6a, B:0x3b7dff };
    const T = [
      { name:'ROJO',     need:['R'],           color:0xff3b3b, tip:'La luz roja sola se ve roja.' },
      { name:'VERDE',    need:['G'],           color:0x3bff6a, tip:'La luz verde sola se ve verde.' },
      { name:'AZUL',     need:['B'],           color:0x3b7dff, tip:'La luz azul sola se ve azul.' },
      { name:'AMARILLO', need:['R', 'G'],      color:0xffe83b, tip:'Luz roja + luz verde = amarillo.' },
      { name:'CIAN',     need:['G', 'B'],      color:0x3be8ff, tip:'Luz verde + luz azul = cian.' },
      { name:'MAGENTA',  need:['R', 'B'],      color:0xff3bff, tip:'Luz roja + luz azul = magenta.' },
      { name:'BLANCO',   need:['R', 'G', 'B'], color:0xffffff, tip:'Las tres luces juntas forman el blanco.' },
    ];
    const extra = Phaser.Utils.Array.GetRandom(T.slice(3, 7));
    this.targets = T.concat([extra]);
    this.roundIdx = 0;
    this.got = {};

    this.makeTextures();
    this.buildBackground();
    this.buildPanel();

    /* Personaje abajo, se mueve de lado a lado */
    this.player = this.physics.add.sprite(400, 448, 'player').setOrigin(0.5, 1).setDepth(5);
    this.player.body.setAllowGravity(false);
    const fw = this.player.width, fh = this.player.height;
    this.player.setScale(Math.min(86 / fh, 100 / fw));
    this.player.body.setSize(fw * 0.8, fh * 0.45);
    this.player.body.setOffset(fw * 0.1, fh * 0.12);
    this.player.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this, { horizontalOnly:true });

    this.drops = this.physics.add.group({ allowGravity:false });
    this.physics.add.overlap(this.player, this.drops, this.onCatch, null, this);

    this.lives = 3; this.score = 0; this.elapsed = 0; this.TOTAL = 100;
    this.invulnerable = false; this.ended = false;
    this.shieldUntil = 0; this.slowUntil = 0;
    ArenaHUD.setLives(this.lives); ArenaHUD.setScore(0); ArenaHUD.setTimer(100);

    this.spawnTimer = this.time.addEvent({ delay:620, loop:true, callback:this.spawnDrop, callbackScope:this });
    this.shieldRing = this.add.circle(0, 0, 58).setStrokeStyle(3, 0x4fd6ff).setVisible(false).setDepth(6);
    this.startRound();
  }

  makeTextures(){
    ['R', 'G', 'B'].forEach(k => {
      if (this.textures.exists('orb_' + k)) return;
      const g = this.make.graphics({ x:0, y:0, add:false });
      g.fillStyle(this.COMP[k], 0.25); g.fillCircle(24, 24, 24);
      g.fillStyle(this.COMP[k], 1);    g.fillCircle(24, 24, 18);
      g.lineStyle(3, 0xffffff, 0.9);   g.strokeCircle(24, 24, 18);
      g.fillStyle(0xffffff, 0.45);     g.fillCircle(17, 16, 5);
      g.generateTexture('orb_' + k, 48, 48); g.destroy();
    });
  }

  buildBackground(){
    this.add.rectangle(400, 225, 800, 450, 0x070d20);
    const g = this.add.graphics();
    g.lineStyle(1, 0x16224a, 0.8);
    for (let x = 0; x <= 800; x += 40) g.lineBetween(x, 0, x, 450);
    for (let y = 0; y <= 450; y += 40) g.lineBetween(0, y, 800, y);
    for (let i = 0; i < 26; i++){
      const s = Phaser.Math.Between(4, 10);
      const sq = this.add.rectangle(Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 450), s, s, Phaser.Utils.Array.GetRandom([0xff3b3b, 0x3bff6a, 0x3b7dff, 0x4fd6ff]), 0.12);
      this.tweens.add({ targets:sq, y:sq.y + Phaser.Math.Between(20, 60), alpha:0.04, duration:Phaser.Math.Between(1800, 3600), yoyo:true, repeat:-1 });
    }
    this.add.rectangle(400, 452, 820, 8, 0x4fd6ff, 0.5).setDepth(1);
  }

  buildPanel(){
    this.add.rectangle(200, 40, 380, 62, 0x0d1530, 0.92).setStrokeStyle(2, 0x233265).setDepth(8);
    this.add.text(22, 18, 'MEZCLA EL COLOR:', { fontFamily:'monospace', fontSize:11, color:'#7d93b8' }).setDepth(9);
    this.swatch = this.add.rectangle(40, 50, 30, 30, 0xffffff).setStrokeStyle(2, 0xffffff).setDepth(9);
    this.targetName = this.add.text(64, 38, '', { fontFamily:'Arial Black', fontSize:18, color:'#ffffff' }).setDepth(9);
    this.needIcons = [];
    this.tipText = this.add.text(20, 78, '', { fontFamily:'monospace', fontSize:12, color:'#a4f23c' }).setDepth(9);

    /* El cuadro: 8 cuadritos que se van pintando */
    this.add.text(630, 12, 'TU CUADRO', { fontFamily:'monospace', fontSize:11, color:'#7d93b8' }).setDepth(9);
    this.cells = [];
    for (let i = 0; i < 8; i++){
      const cx = 636 + (i % 4) * 36, cy = 40 + Math.floor(i / 4) * 36;
      this.cells.push(this.add.rectangle(cx, cy, 32, 32, 0x121b3d).setStrokeStyle(2, 0x233265).setDepth(9));
    }
  }

  startRound(){
    const t = this.targets[this.roundIdx];
    this.got = {};
    this.swatch.setFillStyle(t.color);
    this.targetName.setText(t.name);
    this.tipText.setText(t.tip);
    this.needIcons.forEach(i => i.destroy());
    this.needIcons = [];
    const startX = 70 + t.name.length * 13 + 24;
    t.need.forEach((c, i) => {
      const img = this.add.image(startX + i * 36, 50, 'orb_' + c).setScale(0.6).setAlpha(0.35).setDepth(9);
      img.comp = c;
      this.needIcons.push(img);
    });
  }

  spawnDrop(){
    if (this.ended) return;
    const t = this.targets[this.roundIdx];
    const needLeft = t.need.filter(c => !this.got[c]);
    const badChance = 0.15 + this.roundIdx * 0.018;
    const r = Math.random();
    const x = Phaser.Math.Between(40, 760);
    let o;
    if (r < 0.60){
      const comp = (Math.random() < 0.55 && needLeft.length) ? Phaser.Utils.Array.GetRandom(needLeft) : Phaser.Utils.Array.GetRandom(['R', 'G', 'B']);
      o = this.physics.add.sprite(x, -24, 'orb_' + comp);
      o.kind = 'orb'; o.comp = comp;
      o.label = this.add.text(x, -24, comp, { fontFamily:'Arial Black', fontSize:15, color:'#ffffff', stroke:'#050914', strokeThickness:3 }).setOrigin(0.5).setDepth(4);
    } else if (r < 0.60 + badChance){
      o = this.physics.add.sprite(x, -30, Math.random() < 0.5 ? 'glitch' : 'bug');
      o.setScale(44 / o.height); o.kind = 'bad';
      this.tweens.add({ targets:o, angle:12, duration:220, yoyo:true, repeat:-1 });
    } else if (r < 0.60 + badChance + 0.12){
      o = this.physics.add.sprite(x, -20, 'it_coin'); o.setScale(30 / o.height); o.kind = 'coin';
    } else if (r < 0.60 + badChance + 0.15 && this.time.now > this.shieldUntil){
      o = this.physics.add.sprite(x, -30, 'it_xp_crystal'); o.setScale(48 / o.height); o.kind = 'crystal';
    } else {
      o = this.physics.add.sprite(x, -24, 'it_bit_coin'); o.setScale(40 / o.height); o.kind = 'bit';
    }
    o.setDepth(4);
    this.drops.add(o);
    o.body.setAllowGravity(false);
    o.baseV = 150 + this.roundIdx * 16 + Math.min(60, this.elapsed / 1000);
    o.body.setVelocityY(o.baseV);
  }

  kill(o){ if (o.label) o.label.destroy(); o.destroy(); }

  pop(x, y, str, color){
    const t = this.add.text(x, y, str, { fontFamily:'Arial Black', fontSize:15, color:color || '#ffd23f', stroke:'#050914', strokeThickness:4 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets:t, y:y - 32, alpha:0, duration:750, onComplete:() => t.destroy() });
  }

  onCatch(player, o){
    if (this.ended || !o.active) return;
    const t = this.targets[this.roundIdx];
    const x = o.x, y = o.y;
    switch (o.kind){
      case 'orb':
        if (t.need.includes(o.comp)){
          if (!this.got[o.comp]){
            this.got[o.comp] = true;
            this.score += 15; beep('correct');
            const icon = this.needIcons.find(i => i.comp === o.comp);
            if (icon){ icon.setAlpha(1); this.tweens.add({ targets:icon, scale:0.85, duration:120, yoyo:true }); }
            this.pop(x, y, '+15', '#a4f23c');
            this.kill(o);
            if (t.need.every(c => this.got[c])) this.completeRound();
            return;
          }
          this.score += 2; this.kill(o); return;             // ya la tenías
        }
        this.kill(o);
        this.pop(x, y, '¡Ese color no va!', '#ff4d8f');
        this.loseLife();
        return;
      case 'bad':
        this.kill(o); this.pop(x, y, '¡Píxel muerto!', '#ff4d8f'); this.loseLife(); return;
      case 'coin': this.score += 10; this.pop(x, y, '+10'); beep('correct'); break;
      case 'bit':  this.score += 40; this.pop(x, y, '+40'); beep('correct'); break;
      case 'crystal':
        this.shieldUntil = this.time.now + 6000;
        this.slowUntil = this.time.now + 6000;
        this.pop(x, y, '¡Pincel XP! Escudo + cámara lenta', '#4fd6ff'); beep('win'); break;
    }
    this.kill(o);
  }

  completeRound(){
    const t = this.targets[this.roundIdx];
    const cell = this.cells[this.roundIdx];
    cell.setFillStyle(t.color); cell.setStrokeStyle(2, 0xffffff);
    this.tweens.add({ targets:cell, scale:1.35, duration:160, yoyo:true });
    this.score += 50; beep('win');
    this.pop(400, 200, `¡${t.name} listo! +50`, '#ffffff');
    this.drops.getChildren().slice().forEach(d => this.kill(d));
    this.roundIdx++;
    if (this.roundIdx >= this.targets.length){ this.win(); return; }
    this.time.delayedCall(450, () => { if (!this.ended) this.startRound(); });
  }

  loseLife(){
    if (this.invulnerable || this.ended || this.time.now < this.shieldUntil) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(130, 0.01);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.time.delayedCall(750, () => { this.invulnerable = false; this.player.clearTint(); });
    beep('wrong');
    if (this.lives <= 0) this.lose();
  }

  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta;
    const secs = this.elapsed / 1000;

    // Movimiento: teclado, botones o arrastrar el dedo / mouse
    const ts = this.touchState || {};
    const left = this.cursors.left.isDown || this.keys.A.isDown || ts.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || ts.right;
    let vx = 0;
    if (left) vx = -480; else if (right) vx = 480;
    else {
      const p = this.input.activePointer;
      if (p.isDown){
        const d = p.x - this.player.x;
        vx = Math.abs(d) < 8 ? 0 : Phaser.Math.Clamp(d * 8, -560, 560);
      }
    }
    this.player.setVelocityX(vx);
    if (vx !== 0) this.player.setFlipX(vx < 0);

    // Cámara lenta (cristal XP)
    const slow = time < this.slowUntil;
    this.drops.getChildren().slice().forEach(o => {
      if (!o.active) return;
      o.body.setVelocityY(o.baseV * (slow ? 0.45 : 1));
      if (o.label) o.label.setPosition(o.x, o.y);
      if (o.y > 480) this.kill(o);
    });

    // Escudo
    const shield = time < this.shieldUntil;
    this.shieldRing.setVisible(shield);
    if (shield){
      this.shieldRing.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2);
      this.shieldRing.setAlpha(0.6 + Math.sin(time * 0.02) * 0.3);
    }

    // Más gotas a medida que avanza
    this.spawnTimer.delay = Math.max(380, 620 - this.roundIdx * 28);

    ArenaHUD.setScore(Math.floor(this.score));
    ArenaHUD.setTimer(100 - (secs / this.TOTAL * 100));
    if (secs >= this.TOTAL) this.lose(true);
  }

  win(){
    this.ended = true;
    this.spawnTimer.remove();
    this.time.delayedCall(500, () => {
      this.scene.pause();
      arenaGameOver(true, Math.floor(this.score), '¡Pintaste todo el cuadro! Ahora sabes cómo las pantallas forman los colores con luz roja, verde y azul (RGB).');
    });
  }
  lose(timeout){
    this.ended = true;
    this.spawnTimer.remove();
    this.scene.pause();
    arenaGameOver(false, Math.floor(this.score), timeout === true
      ? 'Se acabó el tiempo. Recuerda: rojo + verde = amarillo, verde + azul = cian, rojo + azul = magenta.'
      : 'Perdiste todas las vidas. Atrapa solo las gotas del color que pide la mezcla.');
  }
}
)();
}
