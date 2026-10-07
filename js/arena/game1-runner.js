/* =========================================================
   ARENA · JUEGO 1 — Carrera de Bits (endless runner)
   Estilo Chrome Dino / Subway Surfers:
   - Fondo con paralaje (estrellas, ciudad, suelo en movimiento)
   - SALTAR (↑ / ESPACIO / toque / deslizar arriba) los enemigos del suelo
   - DESLIZARSE (↓ / deslizar abajo) para pasar bajo los enemigos voladores
   - Monedas, Bit-coin (bonus), cristal XP (escudo), checkpoint a mitad
     de carrera (+1 vida) y un portal de meta al final.
   El personaje es el que equipaste en la tienda.
   ========================================================= */
function ArenaRunnerScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaRunner'); }

  preload(){
    arenaLoadPlayer(this, 'run');
    arenaLoadItems(this, ['coin', 'bit_coin', 'xp_crystal', 'checkpoint', 'portal', 'reward_crate']);
    ['ice', 'spikes', 'flames', 'saw', 'mace', 'spring'].forEach(k => this.load.image('ob_' + k, `assets/obstacles/${k}.png`));
    ['bug', 'virus', 'glitch', 'lag'].forEach(k => this.load.image(k, `assets/enemies/${k}.png`));
  }

  makeTextures(){
    const G = this.groundY;
    const t = this.textures;
    if (!t.exists('rn_stars')){
      const g = this.make.graphics({ x:0, y:0, add:false });
      for (let i = 0; i < 46; i++){
        const s = Phaser.Math.Between(1, 3);
        g.fillStyle(i % 5 === 0 ? 0x4fd6ff : 0x7d93b8, Phaser.Math.FloatBetween(0.35, 0.9));
        g.fillRect(Phaser.Math.Between(0, 508), Phaser.Math.Between(0, 190), s, s);
      }
      g.generateTexture('rn_stars', 512, 200); g.destroy();
    }
    if (!t.exists('rn_city')){
      const g = this.make.graphics({ x:0, y:0, add:false });
      let x = 0;
      while (x < 512){
        const w = Math.min(Phaser.Math.Between(34, 70), 512 - x);
        const h = Phaser.Math.Between(50, 150);
        g.fillStyle(0x0e1836, 1); g.fillRect(x, 170 - h, w, h);
        g.lineStyle(2, 0x1c2c5e, 1); g.strokeRect(x, 170 - h, w, h);
        for (let wy = 170 - h + 8; wy < 160; wy += 14){
          for (let wx = x + 6; wx < x + w - 8; wx += 12){
            if (Math.random() < 0.35){ g.fillStyle(Math.random() < 0.3 ? 0xa4f23c : 0x4fd6ff, 0.55); g.fillRect(wx, wy, 5, 6); }
          }
        }
        x += w;
      }
      g.generateTexture('rn_city', 512, 170); g.destroy();
    }
    if (!t.exists('rn_ground')){
      const h = 450 - G;
      const g = this.make.graphics({ x:0, y:0, add:false });
      g.fillStyle(0x0d1530, 1); g.fillRect(0, 0, 128, h);
      g.fillStyle(0x4fd6ff, 1); g.fillRect(0, 0, 128, 3);
      g.fillStyle(0x233265, 1);
      [[8, 16, 22], [52, 28, 14], [86, 20, 30], [30, 44, 10], [100, 52, 16]].forEach(([x, y, w]) => g.fillRect(x, y, w, 3));
      g.generateTexture('rn_ground', 128, h); g.destroy();
    }
  }

  create(){
    this.groundY = 310;
    const G = this.groundY;
    this.makeTextures();

    this.add.rectangle(400, 225, 800, 450, 0x070d20);
    this.stars = this.add.tileSprite(0, 0, 800, 200, 'rn_stars').setOrigin(0, 0);
    this.city  = this.add.tileSprite(0, G - 170, 800, 170, 'rn_city').setOrigin(0, 0).setAlpha(0.9);
    this.ground = this.add.tileSprite(0, G, 800, 450 - G, 'rn_ground').setOrigin(0, 0).setDepth(2);

    const groundBody = this.add.rectangle(400, G + (450 - G) / 2, 900, 450 - G, 0x000000, 0);
    this.physics.add.existing(groundBody, true);

    this.add.text(16, 10, '↑ saltar  ·  ↓ deslizarse  ·  ¡Llega al portal!', { fontFamily:'monospace', fontSize:13, color:'#7d93b8' }).setDepth(10);

    /* Personaje (origen en los pies para que se apoye bien en el suelo) */
    this.player = this.physics.add.sprite(130, G, 'player').setOrigin(0.5, 1).setDepth(5);
    arenaFitPlayer(this.player, 88, 0.4, 0.78);
    this.baseSX = this.player.scaleX; this.baseSY = this.player.scaleY;
    this.physics.add.collider(this.player, groundBody);

    this.shieldRing = this.add.circle(0, 0, 54).setStrokeStyle(3, 0x4fd6ff).setVisible(false).setDepth(6);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    addArenaTouchControls(this, { runnerMode:true });

    /* Toque / deslizamiento sobre el juego (celular y iPhone) */
    this.jumpBuffer = 0; this.slideUntil = 0;
    this.input.on('pointerdown', p => { this._sw = { x:p.x, y:p.y }; });
    this.input.on('pointerup', p => {
      if (!this._sw) return;
      const dy = p.y - this._sw.y;
      if (dy > 35) this.slideUntil = this.time.now + 650;
      else { this.jumpBuffer = 160; this.slideUntil = 0; }
      this._sw = null;
    });

    this.springs = [];
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);

    this.lives = 3; this.score = 0; this.elapsed = 0;
    this.invulnerable = false; this.ended = false;
    this.shieldUntil = 0;
    this.spawnIn = 1400; this.crystalIn = 11000;
    this.dustIn = 0; this.lineIn = 0;
    this.checkpoint = null; this.portal = null;

    ArenaHUD.setLives(this.lives); ArenaHUD.setScore(0); ArenaHUD.setTimer(100);
  }

  /* ---------- Creación de objetos ---------- */
  addEnemy(x, key, flying, h){
    const o = this.physics.add.sprite(x, flying ? this.groundY - 44 : this.groundY + 2, key).setOrigin(0.5, 1).setDepth(4);
    o.setScale((h || (flying ? 50 : 54)) / o.height);
    const bw = o.width * 0.55, bh = o.height * 0.6;
    o.body.setSize(bw, bh); o.body.setOffset((o.width - bw) / 2, o.height - bh - o.height * 0.08);
    this.obstacles.add(o);
    o.body.setAllowGravity(false); o.body.setImmovable(true);
    if (flying) this.tweens.add({ targets:o, scaleX:o.scaleX * 1.08, scaleY:o.scaleY * 0.94, duration:260, yoyo:true, repeat:-1 });
    return o;
  }
  addSpring(x){
    const sp = this.add.image(x, this.groundY + 2, 'ob_spring').setOrigin(0.5, 1).setDepth(3);
    sp.setScale(64 / sp.width);
    this.springs.push(sp);
    return sp;
  }
  addCollectible(x, y, kind){
    const key = kind === 'bit' ? 'it_bit_coin' : kind === 'crystal' ? 'it_xp_crystal' : kind === 'crate' ? 'it_reward_crate' : 'it_coin';
    const h = kind === 'bit' ? 40 : kind === 'crystal' ? 46 : kind === 'crate' ? 38 : 28;
    const c = this.physics.add.sprite(x, y, key).setDepth(4);
    c.setScale(h / c.height);
    c.kind = kind;
    this.collectibles.add(c);
    c.body.setAllowGravity(false);
    this.tweens.add({ targets:c, y:y - 5, duration:500, yoyo:true, repeat:-1, ease:'Sine.inOut' });
    return c;
  }
  coinArc(x0, n, baseY, arc){
    for (let i = 0; i < n; i++){
      const y = baseY - (n > 1 ? arc * Math.sin(Math.PI * i / (n - 1)) : 0);
      this.addCollectible(x0 + i * 34, y, 'coin');
    }
  }

  spawnPattern(secs){
    const X = 880, G = this.groundY, r = Math.random();
    const hardOk = secs > 8;
    const pick = arr => Phaser.Utils.Array.GetRandom(arr);
    if (r < 0.26){
      const k = pick(['bug', 'virus']);
      this.addEnemy(X, k, false);
      if (Math.random() < 0.6) this.coinArc(X - 52, 5, G - 54, 80);
    } else if (r < 0.42){
      this.addEnemy(X, 'ob_spikes', false, 38);                // pinchos
      this.coinArc(X - 50, 5, G - 56, 86);
    } else if (r < 0.54){
      this.addEnemy(X, 'ob_ice', false, 54);                   // bloques de hielo
      if (Math.random() < 0.6) this.coinArc(X - 40, 5, G - 60, 86);
    } else if (r < 0.64 && hardOk){
      const f = this.addEnemy(X, 'ob_flames', false, 62);      // llamas
      this.tweens.add({ targets:f, alpha:0.6, duration:220, yoyo:true, repeat:-1 });
      this.coinArc(X - 40, 5, G - 60, 90);
    } else if (r < 0.78 && hardOk){
      const k = pick(['lag', 'glitch', 'ob_saw', 'ob_mace']);   // voladores: deslizarse
      const o = this.addEnemy(X, k, true, k === 'ob_mace' ? 52 : 50);
      if (k === 'ob_saw') this.tweens.add({ targets:o, angle:360, duration:500, repeat:-1 });
      this.coinArc(X - 40, 4, G - 20, 0);
    } else if (r < 0.86){
      this.addSpring(X);                                       // trampolín: coins arriba
      this.coinArc(X + 20, 6, G - 170, 40);
      this.addCollectible(X + 120, G - 190, Math.random() < 0.5 ? 'bit' : 'crate');
    } else if (r < 0.93 && secs > 18){
      this.addEnemy(X, 'bug', false);
      this.addEnemy(X + 300, 'ob_saw', true);
    } else {
      const high = Math.random() < 0.5;
      this.coinArc(X, 6, high ? G - 120 : G - 22, high ? 40 : 0);
      if (Math.random() < 0.35) this.addCollectible(X + 220, G - 90, 'bit');
      else if (Math.random() < 0.15) this.addCollectible(X + 220, G - 60, 'crate');
    }
  }

  popText(x, y, str, color){
    const t = this.add.text(x, y, str, { fontFamily:'Arial Black', fontSize:16, color:color || '#ffd23f', stroke:'#050914', strokeThickness:4 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets:t, y:y - 34, alpha:0, duration:700, onComplete:() => t.destroy() });
  }

  /* ---------- Eventos ---------- */
  hitObstacle(player, ob){
    if (this.invulnerable || this.ended || this.time.now < this.shieldUntil) return;
    this.lives--;
    ArenaHUD.setLives(this.lives);
    this.cameras.main.shake(150, 0.012);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.tweens.add({ targets:this.player, alpha:0.35, duration:90, yoyo:true, repeat:8 });
    this.time.delayedCall(950, () => { this.invulnerable = false; this.player.clearTint(); this.player.setAlpha(1); });
    ob.destroy();
    if (this.lives <= 0) this.lose();
  }

  collectItem(player, item){
    const k = item.kind;
    this.popText(item.x, item.y - 10, k === 'bit' ? '+50' : k === 'crate' ? '+100' : k === 'crystal' ? '¡Escudo XP!' : '+10', k === 'crystal' ? '#4fd6ff' : '#ffd23f');
    if (k === 'coin') this.score += 10;
    else if (k === 'crate') this.score += 100;
    else if (k === 'bit') this.score += 50;
    else if (k === 'crystal'){
      this.shieldUntil = this.time.now + 5000;
      this.score += 20;
    }
    beep('correct');
    item.destroy();
  }

  /* ---------- Bucle principal ---------- */
  update(time, delta){
    if (this.ended) return;
    this.elapsed += delta;
    const secs = this.elapsed / 1000;
    const dt = delta / 1000;
    const speed = 250 + Math.min(260, secs * 4.4);
    const dx = speed * dt;

    // Paralaje
    this.ground.tilePositionX += dx;
    this.city.tilePositionX += dx * 0.35;
    this.stars.tilePositionX += dx * 0.12;

    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;
    const down = this.cursors.down.isDown || this.keys.S.isDown || (this.touchState && this.touchState.down) || time < this.slideUntil;
    const upKey = this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || (this.touchState && this.touchState.up);
    if (upKey) this.jumpBuffer = 120;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - delta);

    if (this.jumpBuffer > 0 && onGround && !(down && !upKey)){
      this.player.setVelocityY(-660);
      this.jumpBuffer = 0; this.slideUntil = 0;
      this.dust(6);
    }

    // Deslizarse (en el aire = caída rápida)
    if (down && !upKey){
      if (onGround) this.player.setScale(this.baseSX * 1.15, this.baseSY * 0.5);
      else { this.player.setScale(this.baseSX, this.baseSY); if (body.velocity.y < 750) this.player.setVelocityY(750); }
      this.player.setAngle(0);
    } else {
      if (onGround){
        this.player.setScale(this.baseSX, this.baseSY * (1 + Math.sin(this.elapsed * 0.036) * 0.035));
        this.player.setAngle(Math.sin(this.elapsed * 0.018) * 3);
      } else {
        this.player.setScale(this.baseSX, this.baseSY);
        this.player.setAngle(Phaser.Math.Clamp(body.velocity.y * 0.012, -10, 12));
      }
    }

    // Escudo
    const shield = time < this.shieldUntil;
    this.shieldRing.setVisible(shield);
    if (shield){
      this.shieldRing.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2);
      this.shieldRing.setAlpha(0.6 + Math.sin(time * 0.02) * 0.3);
      if (this.shieldUntil - time < 1200) this.shieldRing.setVisible(Math.floor(time / 100) % 2 === 0);
    }

    // Polvo y líneas de velocidad
    this.dustIn -= delta; this.lineIn -= delta;
    if (this.dustIn <= 0 && onGround && !down){ this.dust(1); this.dustIn = 110; }
    if (this.lineIn <= 0){
      this.lineIn = 90;
      const l = this.add.rectangle(830, Phaser.Math.Between(30, this.groundY - 30), Phaser.Math.Between(40, 110), 2, 0xffffff, 0.16).setDepth(1);
      this.tweens.add({ targets:l, x:-150, duration:(1000 / (speed * 2.2)) * 1000, onComplete:() => l.destroy() });
    }

    // Aparición de obstáculos / premios
    this.spawnIn -= delta;
    if (this.spawnIn <= 0 && secs < 53){
      this.spawnPattern(secs);
      this.spawnIn = Math.max(700, Phaser.Math.Between(1000, 1700) * (300 / Math.max(speed, 300)));
    }
    this.crystalIn -= delta;
    if (this.crystalIn <= 0 && secs < 50){
      this.addCollectible(880, this.groundY - Phaser.Math.Between(70, 120), 'crystal');
      this.crystalIn = Phaser.Math.Between(14000, 20000);
    }
    if (!this.checkpoint && secs >= 28){
      this.checkpoint = this.add.image(900, this.groundY + 6, 'it_checkpoint').setOrigin(0.5, 1).setDepth(3);
      this.checkpoint.setScale(120 / this.checkpoint.height);
    }
    if (!this.portal && secs >= 55){
      this.portal = this.add.image(930, this.groundY + 8, 'it_portal').setOrigin(0.5, 1).setDepth(3);
      this.portal.setScale(190 / this.portal.height);
    }

    // Movimiento del mundo
    const move = o => { if (o && o.active){ o.x -= dx; if (o.x < -120) o.destroy(); } };
    this.obstacles.getChildren().slice().forEach(move);
    this.collectibles.getChildren().slice().forEach(move);
    for (let i = this.springs.length - 1; i >= 0; i--){
      const sp = this.springs[i];
      sp.x -= dx;
      if (sp.x < -120){ sp.destroy(); this.springs.splice(i, 1); continue; }
      if (Math.abs(sp.x - this.player.x) < 34 && this.player.y >= this.groundY - 40 && body.velocity.y >= 0 && onGround){
        this.player.setVelocityY(-900);
        this.tweens.add({ targets:sp, scaleY:sp.scaleY * 0.55, duration:90, yoyo:true });
        beep('correct');
      }
    }

    if (this.checkpoint){
      this.checkpoint.x -= dx;
      if (!this.checkpoint.used && this.checkpoint.x <= this.player.x + 20){
        this.checkpoint.used = true;
        this.checkpoint.setTint(0xa4f23c);
        if (this.lives < 3){ this.lives++; ArenaHUD.setLives(this.lives); }
        this.score += 50;
        this.banner('¡CHECKPOINT!' + (this.lives >= 3 ? '' : ''), '#a4f23c');
        beep('win');
      }
      if (this.checkpoint.x < -150){ this.checkpoint.destroy(); this.checkpoint = { x:-999, used:true, destroy(){} , setTint(){} }; }
    }
    if (this.portal){
      this.portal.x -= dx;
      if (this.portal.x <= this.player.x + 25) return this.win();
    }

    this.score += 5 * dt;
    ArenaHUD.setScore(Math.floor(this.score));
    ArenaHUD.setTimer(100 - (secs / 58 * 100));
    if (secs >= 62) this.win();
  }

  dust(n){
    for (let i = 0; i < n; i++){
      const d = this.add.rectangle(this.player.x - 16 + Phaser.Math.Between(-4, 4), this.groundY - 3, 6, 6, 0x7d93b8, 0.7).setDepth(3);
      this.tweens.add({ targets:d, x:d.x - Phaser.Math.Between(30, 70), y:d.y - Phaser.Math.Between(4, 18), alpha:0, duration:380, onComplete:() => d.destroy() });
    }
  }
  banner(str, color){
    const t = this.add.text(400, 130, str, { fontFamily:'Arial Black', fontSize:30, color, stroke:'#050914', strokeThickness:6 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets:t, y:100, alpha:0, duration:1400, delay:300, onComplete:() => t.destroy() });
  }

  win(){
    if (this.ended) return;
    this.ended = true;
    this.tweens.add({ targets:this.player, alpha:0, scaleX:0, scaleY:0, duration:350 });
    this.time.delayedCall(380, () => {
      this.scene.pause();
      arenaGameOver(true, Math.floor(this.score), '¡Cruzaste el portal! Esquivaste todos los errores del sistema.');
    });
  }
  lose(){
    this.ended = true;
    this.scene.pause();
    arenaGameOver(false, Math.floor(this.score), 'Perdiste todas las vidas. Salta los enemigos del suelo y deslízate bajo los voladores.');
  }
}
)();
}
