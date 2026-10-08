/* =========================================================
   ARENA · JUEGO 2 — Ensamblaje Bajo Presión (plataformas)
   Recolectar 4 piezas de PC saltando entre plataformas flotantes,
   esquivando trampas (pinchos, fuego, sierras, bolas con púas) y
   enemigos. Los TRAMPOLINES te lanzan muy alto. Con las 4 piezas,
   el PORTAL se enciende: entra para pasar de ronda.
   Los escalones están pensados para que siempre se pueda llegar.
   ========================================================= */
function ArenaAssemblyScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaAssembly'); }

  preload(){
    arenaLoadPlayer(this);
    arenaLoadItems(this, ['portal', 'diamond', 'tech_chest', 'plat_float', 'plat_ctrl', 'server']);
    ['spikes', 'flames', 'saw', 'mace', 'spring', 'ice'].forEach(k => this.load.image('ob_' + k, `assets/obstacles/${k}.png`));
    this.load.image('bg_lab', 'assets/items/bg_lab.jpg');
    this.load.image('overclock', 'assets/enemies/overclock.png');
    this.load.image('corrupt', 'assets/enemies/corrupt.png');
    ['cpu', 'ram', 'gpu', 'ssd'].forEach(k => this.load.image(k, `assets/elements/${k}.png`));
  }

  create(){
    this.lives = 3; this.score = 0; this.round = 1;
    this.ended = false; this.invulnerable = false;
    ArenaHUD.setLives(this.lives); ArenaHUD.setScore(0); ArenaHUD.setTimer(100);

    // Fondo
    const bg = this.add.image(0, 0, 'bg_lab').setOrigin(0, 0).setScale(800 / 1024);   // laboratorio de hardware
    this.add.rectangle(400, 225, 800, 450, 0x050914, 0.18);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this);

    this.platformGroup = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group({ allowGravity:false });
    this.enemies = this.physics.add.group({ allowGravity:false });
    this.deco = [];       // imágenes que se borran al cambiar de ronda
    this.hazards = [];    // trampas: { obj, w, h, active() }
    this.springs = [];
    this.hint = this.add.text(20, 12, '', { fontFamily:'monospace', fontSize:13, color:'#cfe8ff', stroke:'#050914', strokeThickness:3 }).setDepth(20);

    this.player = this.physics.add.sprite(60, 350, 'player').setDepth(10);
    arenaFitPlayer(this.player, 58);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

    this.buildRound(1);
  }

  /* Plataforma con imagen y colisión solo en la parte de arriba */
  addPlatform(x, y, w, key){
    const img = this.add.image(x, y - 4, key || 'it_plat_float').setOrigin(0.5, 0).setDepth(2);
    img.setScale(w / img.width);
    const body = this.add.rectangle(x, y + 8, w * 0.92, 16, 0x000000, 0);
    this.platformGroup.add(body);
    this.deco.push(img, body);
  }
  addDeco(img){ this.deco.push(img); return img; }

  buildRound(round){
    this.round = round;
    this.collected = 0; this.needed = 4;
    this.platformGroup.clear(true, true);
    this.collectibles.clear(true, true);
    this.enemies.clear(true, true);
    this.deco.forEach(d => d.destroy && d.destroy());
    this.deco = []; this.hazards = []; this.springs = [];
    if (this.portal) this.portal.destroy();
    if (this.portalGlow) this.portalGlow.destroy();

    // Suelo + terminal decorativa
    const floor = this.add.rectangle(400, 438, 820, 30, 0x0d1530).setStrokeStyle(2, 0x4fd6ff).setDepth(2);
    this.platformGroup.add(floor); this.deco.push(floor);
    this.addDeco(this.add.image(60, 424, 'it_plat_ctrl').setOrigin(0.5, 1).setScale(0.38).setDepth(1));
    this.addDeco(this.add.image(760, 424, 'it_server').setOrigin(0.5, 1).setScale(0.8).setDepth(1));

    /* Escalones: separación vertical de 60 px (el salto llega a ~150) */
    let L;
    if (round === 1){
      L = {
        plats: [[150, 350, 140], [310, 290, 140], [470, 230, 140], [650, 170, 160], [390, 150, 100]],
        key: 'it_plat_float',
        pieces: [['cpu', 150, 318], ['ram', 310, 258], ['gpu', 470, 198], ['ssd', 390, 118]],
        portalPos: [690, 170],
        diamonds: [[650, 138], [230, 395]],
        chest: [500, 395],
        springs: [[740, 424]],
        spikes: [[420, 424]],
        flames: [[590, 424]],
        saws: [], maces: [],
        enemies: [[260, 360, 290]],
      };
    } else {
      L = {
        plats: [[140, 355, 130], [290, 300, 130], [450, 245, 130], [620, 190, 130], [745, 130, 80], [300, 160, 100]],
        key: 'ob_ice',
        pieces: [['cpu', 140, 322], ['ram', 290, 267], ['gpu', 620, 157], ['ssd', 300, 128]],
        portalPos: [745, 130],
        diamonds: [[450, 212], [560, 395]],
        chest: [200, 395],
        springs: [[690, 424], [100, 424]],
        spikes: [[380, 424], [520, 424]],
        flames: [[270, 424]],
        saws: [[425, 485, 424]],
        maces: [[470, 90]],
        enemies: [[250, 330, 300], [420, 490, 245]],
      };
    }
    L.plats.forEach(([x, y, w]) => this.addPlatform(x, y, w, L.key));

    L.pieces.forEach(([k, x, y]) => {
      const item = this.physics.add.sprite(x, y, k).setDisplaySize(32, 32).setDepth(6);
      item.body.allowGravity = false; item.kind = 'piece';
      this.collectibles.add(item);
      this.tweens.add({ targets:item, y:y - 6, duration:600, yoyo:true, repeat:-1 });
    });
    L.diamonds.forEach(([x, y]) => {
      const d = this.physics.add.sprite(x, y, 'it_diamond').setDepth(6);
      d.setScale(26 / d.height); d.kind = 'diamond';
      d.body.allowGravity = false; this.collectibles.add(d);
      this.tweens.add({ targets:d, y:y - 5, duration:500, yoyo:true, repeat:-1 });
    });
    if (L.chest){
      const c = this.physics.add.sprite(L.chest[0], L.chest[1], 'it_tech_chest').setDepth(6);
      c.setScale(30 / c.height); c.kind = 'chest';
      c.body.allowGravity = false; this.collectibles.add(c);
    }

    // Portal (bloqueado hasta tener las 4 piezas)
    const [px, py] = L.portalPos;
    this.portalGlow = this.add.circle(px, py - 30, 40, 0xa4f23c, 0).setDepth(3);
    this.portal = this.add.image(px, py + 4, 'it_portal').setOrigin(0.5, 1).setDepth(4);
    this.portal.setScale(78 / this.portal.height).setAlpha(0.4).setTint(0x778899);
    this.portalRect = new Phaser.Geom.Rectangle(px - 24, py - 70, 48, 74);

    // Trampolines
    L.springs.forEach(([x, y]) => {
      const s = this.add.image(x, y, 'ob_spring').setOrigin(0.5, 1).setDepth(3);
      s.setScale(54 / s.width);
      this.springs.push({ obj:s, rect:new Phaser.Geom.Rectangle(x - 26, y - 22, 52, 22) });
      this.deco.push(s);
    });
    // Pinchos
    L.spikes.forEach(([x, y]) => {
      const s = this.add.image(x, y, 'ob_spikes').setOrigin(0.5, 1).setDepth(3);
      s.setScale(64 / s.width);
      this.hazards.push({ obj:s, rect:new Phaser.Geom.Rectangle(x - 26, y - 24, 52, 24), active:() => true });
      this.deco.push(s);
    });
    // Fuego que se enciende y se apaga
    L.flames.forEach(([x, y]) => {
      const f = this.add.image(x, y, 'ob_flames').setOrigin(0.5, 1).setDepth(3);
      f.setScale(56 / f.height);
      const h = { obj:f, rect:new Phaser.Geom.Rectangle(x - 18, y - 52, 36, 52), active:() => f.alpha > 0.9 };
      this.hazards.push(h); this.deco.push(f);
      this.tweens.add({ targets:f, alpha:0.2, duration:700, yoyo:true, repeat:-1, hold:900, repeatDelay:600 });
    });
    // Sierras que patrullan el suelo
    (L.saws || []).forEach(([x0, x1, y]) => {
      const s = this.add.image(x0, y - 22, 'ob_saw').setDepth(3);
      s.setScale(46 / s.height);
      this.tweens.add({ targets:s, angle:360, duration:600, repeat:-1 });
      this.tweens.add({ targets:s, x:x1, duration:2200, yoyo:true, repeat:-1, ease:'Sine.inOut' });
      this.hazards.push({ obj:s, dyn:true, r:17, active:() => true });
      this.deco.push(s);
    });
    // Bolas con púas que suben y bajan
    (L.maces || []).forEach(([x, y]) => {
      const m = this.add.image(x, y, 'ob_mace').setDepth(3);
      m.setScale(44 / m.height);
      this.tweens.add({ targets:m, y:y + 70, duration:1400, yoyo:true, repeat:-1, ease:'Sine.inOut' });
      this.tweens.add({ targets:m, angle:360, duration:2400, repeat:-1 });
      this.hazards.push({ obj:m, dyn:true, r:16, active:() => true });
      this.deco.push(m);
    });

    // Enemigos que patrullan
    const enemyKeys = ['overclock', 'corrupt'];
    L.enemies.forEach(([a, b, y], i) => {
      const en = this.physics.add.sprite(a, y - 24, enemyKeys[i % 2]).setDepth(5);
      en.setDisplaySize(40, 40);
      en.body.allowGravity = false;
      en.dir = 1; en.minX = a; en.maxX = b;
      en.speed = round === 1 ? 60 : 90;
      this.enemies.add(en);
    });

    this.player.setPosition(60, 380);
    this.player.setVelocity(0, 0);
    this.roundTime = round === 1 ? 100 : 90;
    this.elapsed = 0;
    this.hint.setText(`Ronda ${round}/2 — Recoge las 4 piezas y entra al portal. ¡Los trampolines te lanzan alto!`);
  }

  collectItem(player, item){
    const k = item.kind;
    item.destroy();
    if (k === 'piece'){
      this.collected++; this.score += 40; beep('correct');
      if (this.collected >= this.needed){
        this.portal.setAlpha(1).clearTint();
        this.tweens.add({ targets:this.portal, scale:this.portal.scale * 1.06, duration:500, yoyo:true, repeat:-1 });
        this.portalGlow.setFillStyle(0xa4f23c, 0.25);
        this.tweens.add({ targets:this.portalGlow, scale:1.3, alpha:0.5, duration:600, yoyo:true, repeat:-1 });
        this.hint.setText(`Ronda ${this.round}/2 — ¡Piezas completas! Entra al portal brillante.`);
        beep('win');
      }
    } else if (k === 'diamond'){ this.score += 25; beep('correct'); }
    else if (k === 'chest'){ this.score += 60; beep('win'); }
  }

  hurt(){
    if (this.invulnerable || this.ended) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(150, 0.01);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.player.setPosition(60, 380); this.player.setVelocity(0, 0);
    this.time.delayedCall(900, () => { this.invulnerable = false; this.player.clearTint(); });
    beep('wrong');
    if (this.lives <= 0) this.lose();
  }
  hitEnemy(){ this.hurt(); }

  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta / 1000;
    const ts = this.touchState || {};
    const left = this.cursors.left.isDown || this.keys.A.isDown || ts.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || ts.right;
    const jump = this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || ts.up;

    this.player.setVelocityX(left ? -200 : right ? 200 : 0);
    if (left) this.player.setFlipX(true); else if (right) this.player.setFlipX(false);
    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-620);

    this.enemies.children.iterate(en => {
      if (!en) return;
      en.x += en.dir * en.speed * delta / 1000;
      if (en.x <= en.minX || en.x >= en.maxX) en.dir *= -1;
      en.setFlipX(en.dir < 0);
    });

    // Trampolines, trampas y portal (colisiones manuales)
    const pb = new Phaser.Geom.Rectangle(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
    this.springs.forEach(s => {
      if (Phaser.Geom.Intersects.RectangleToRectangle(pb, s.rect) && this.player.body.velocity.y >= 0){
        this.player.setVelocityY(-940);
        this.tweens.add({ targets:s.obj, scaleY:s.obj.scaleY * 0.6, duration:90, yoyo:true });
        beep('correct');
      }
    });
    for (const h of this.hazards){
      if (!h.active()) continue;
      const hit = h.dyn
        ? Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(h.obj.x, h.obj.y, h.r), pb)
        : Phaser.Geom.Intersects.RectangleToRectangle(pb, h.rect);
      if (hit){ this.hurt(); break; }
    }
    if (this.collected >= this.needed && Phaser.Geom.Intersects.RectangleToRectangle(pb, this.portalRect)){
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
      this.score += 30; beep('win');
      this.buildRound(2);
    }
  }

  lose(){
    this.ended = true;
    this.scene.pause();
    arenaGameOver(false, this.score, this.lives <= 0
      ? 'Se acabaron las vidas. Salta las trampas y usa los trampolines para subir.'
      : 'Se acabó el tiempo antes de terminar el ensamblaje.');
  }
}
)();
}
