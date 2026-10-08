/* =========================================================
   ARENA · JUEGO 5 — Carga de Volt (con Volt, de Energía)
   Volt vuela con su propulsor eléctrico (mantén ↑ / ESPACIO /
   toca la pantalla para subir, suelta para bajar).
   Recoge baterías, chips y cajas de energía para llenar la
   BATERÍA al 100%, pero la energía se escapa poco a poco y los
   obstáculos (pinchos, fuego, sierras, bolas con púas, rocas,
   cercas láser) te quitan carga y vidas.
   ========================================================= */
function ArenaVoltScene(){
  return new (class extends Phaser.Scene {
  constructor(){ super('ArenaVolt'); }

  preload(){
    arenaLoadPlayer(this);
    arenaLoadItems(this, ['battery', 'battery_v', 'chip', 'energy_box', 'reward_crate', 'diamond']);
    ['spikes', 'flames', 'saw', 'mace', 'spikecube', 'rock', 'laser'].forEach(k => this.load.image('ob_' + k, `assets/obstacles/${k}.png`));
    this.load.image('bg_level', 'assets/items/bg_level.jpg');
  }

  create(){
    this.TIPS = [
      'Las baterías almacenan energía para usarla después.',
      'El Sol y el viento son energías renovables: no se acaban.',
      'Un circuito cerrado deja pasar la corriente eléctrica.',
      'Los chips usan muy poca energía para hacer mucho trabajo.',
      'Apagar lo que no usas ahorra energía.',
    ];
    this.bg = this.add.tileSprite(0, 0, 800, 315, 'bg_level').setOrigin(0, 0).setScale(450 / 315);
    this.add.rectangle(400, 225, 800, 450, 0x050914, 0.45);
    // Techo y suelo
    this.add.rectangle(400, 6, 800, 12, 0x0d1530).setStrokeStyle(2, 0x233265).setDepth(2);
    this.add.rectangle(400, 444, 800, 12, 0x0d1530).setStrokeStyle(2, 0x233265).setDepth(2);

    this.player = this.add.image(150, 225, 'player').setDepth(6);
    this.player.setScale(Math.min(74 / this.player.height, 86 / this.player.width));
    this.vy = 0;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,SPACE');
    addArenaTouchControls(this, { holdMode:true });

    this.things = [];          // obstáculos y premios activos
    this.lives = 3; this.charge = 18; this.score = 0; this.elapsed = 0;
    this.invulnerable = false; this.ended = false;
    this.spawnIn = 900; this.sparkIn = 0; this.lineIn = 0; this.boxIn = 12000;
    ArenaHUD.setLives(this.lives); ArenaHUD.setScore(0); ArenaHUD.setTimer(100);

    // Medidor de batería dentro del juego
    this.add.rectangle(400, 30, 306, 30, 0x0d1530, 0.9).setStrokeStyle(2, 0x4fd6ff).setDepth(20);
    this.chargeBar = this.add.rectangle(252, 30, 0, 22, 0xa4f23c).setOrigin(0, 0.5).setDepth(21);
    this.chargeText = this.add.text(400, 30, '', { fontFamily:'Arial Black', fontSize:14, color:'#ffffff', stroke:'#050914', strokeThickness:3 }).setOrigin(0.5).setDepth(22);
    const ico = this.add.image(228, 30, 'it_battery_v').setDepth(22); ico.setScale(26 / ico.height);
    this.add.text(20, 16, 'Sube con ↑ / ESPACIO / toque. ¡Llena la batería al 100%!', { fontFamily:'monospace', fontSize:12, color:'#cfe8ff', stroke:'#050914', strokeThickness:3 }).setDepth(20);
    this.tipText = this.add.text(400, 418, '', { fontFamily:'monospace', fontSize:12, color:'#a4f23c', stroke:'#050914', strokeThickness:3 }).setOrigin(0.5).setDepth(22);
  }

  /* ---------- Creación ---------- */
  place(key, x, y, h, kind, extra){
    const o = this.add.image(x, y, key).setDepth(5);
    o.setScale(h / o.height);
    o.kind = kind;
    Object.assign(o, extra || {});
    this.things.push(o);
    return o;
  }
  pickup(kind, x, y){
    const map = {
      cell:  { key:'it_battery_v', h:38, gain:8 },
      bat:   { key:'it_battery',   h:30, gain:12 },
      chip:  { key:'it_chip',      h:40, gain:6, pts:20 },
      box:   { key:'it_energy_box', h:52, gain:25 },
      crate: { key:'it_reward_crate', h:44, gain:10, pts:100 },
      gem:   { key:'it_diamond',   h:28, gain:0, pts:30 },
    };
    const d = map[kind];
    const o = this.place(d.key, x, y, d.h, 'pickup', { gain:d.gain, pts:d.pts || 0, pk:kind });
    this.tweens.add({ targets:o, scaleX:o.scaleX * 1.1, scaleY:o.scaleY * 1.1, duration:420, yoyo:true, repeat:-1 });
    return o;
  }
  hazard(key, x, y, h, rad, extra){
    return this.place('ob_' + key, x, y, h, 'hazard', Object.assign({ rad }, extra || {}));
  }

  spawnPattern(secs){
    const X = 880, r = Math.random();
    if (r < 0.20){                                   // pinchos en el suelo + baterías arriba
      this.hazard('spikes', X, 430, 34, 26, { rw:30, rh:18 });
      for (let i = 0; i < 4; i++) this.pickup('cell', X - 40 + i * 36, 330 - Math.sin(i / 3 * Math.PI) * 50);
    } else if (r < 0.34){                            // fuego en el suelo
      const f = this.hazard('flames', X, 420, 54, 24, { rw:22, rh:26 });
      this.tweens.add({ targets:f, alpha:0.55, duration:260, yoyo:true, repeat:-1 });
      this.pickup('bat', X - 10, 300); this.pickup('bat', X + 50, 300);
    } else if (r < 0.46){                            // pinchos colgando del techo
      const s = this.hazard('spikes', X, 40, 34, 26, { rw:30, rh:18 });
      s.setFlipY(true);
      for (let i = 0; i < 4; i++) this.pickup('cell', X - 40 + i * 36, 130 + Math.sin(i / 3 * Math.PI) * 40);
    } else if (r < 0.60 && secs > 6){                // sierra que sube y baja
      const y0 = Phaser.Math.Between(110, 340);
      const s = this.hazard('saw', X, y0, 50, 22);
      this.tweens.add({ targets:s, angle:360, duration:500, repeat:-1 });
      this.tweens.add({ targets:s, y:y0 + (y0 > 225 ? -70 : 70), duration:900, yoyo:true, repeat:-1, ease:'Sine.inOut' });
      this.pickup('chip', X + 80, y0 < 225 ? y0 + 120 : y0 - 120);
    } else if (r < 0.72 && secs > 10){               // bola con púas / bloque con púas
      const y0 = Phaser.Math.Between(100, 350);
      const key = Math.random() < 0.5 ? 'mace' : 'spikecube';
      const m = this.hazard(key, X, y0, 56, 24);
      this.tweens.add({ targets:m, angle:360, duration:2600, repeat:-1 });
      this.pickup('bat', X + 90, 225 + (y0 > 225 ? -90 : 90));
    } else if (r < 0.80 && secs > 14){               // cerca láser (rodéala)
      const y0 = Phaser.Math.Between(150, 300);
      this.hazard('laser', X, y0, 120, 0, { rw:34, rh:56 });
      this.pickup('cell', X + 20, y0 - 100 < 60 ? y0 + 100 : y0 - 100);
    } else if (r < 0.88 && secs > 8){                // roca que cae hacia el suelo
      const y0 = Phaser.Math.Between(70, 140);
      const rk = this.hazard('rock', X, y0, 52, 22);
      this.tweens.add({ targets:rk, y:y0 + 160, duration:1800, yoyo:true, repeat:-1, ease:'Sine.inOut' });
      this.pickup('cell', X + 60, 330);
    } else {                                         // ola de baterías
      const base = Phaser.Math.Between(120, 330);
      for (let i = 0; i < 7; i++) this.pickup(i % 3 === 2 ? 'bat' : 'cell', X + i * 40, base + Math.sin(i * 0.9) * 55);
      if (Math.random() < 0.3) this.pickup('gem', X + 300, base);
    }
  }

  pop(x, y, str, color){
    const t = this.add.text(x, y, str, { fontFamily:'Arial Black', fontSize:15, color:color || '#a4f23c', stroke:'#050914', strokeThickness:4 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets:t, y:y - 34, alpha:0, duration:750, onComplete:() => t.destroy() });
  }

  hurt(){
    if (this.invulnerable || this.ended) return;
    this.lives--; ArenaHUD.setLives(this.lives);
    this.charge = Math.max(0, this.charge - 10);
    this.cameras.main.shake(140, 0.012);
    this.invulnerable = true;
    this.player.setTint(0xff4d8f);
    this.tweens.add({ targets:this.player, alpha:0.35, duration:90, yoyo:true, repeat:8 });
    this.time.delayedCall(950, () => { this.invulnerable = false; this.player.clearTint(); this.player.setAlpha(1); });
    this.pop(this.player.x, this.player.y - 40, '-10%', '#ff4d8f');
    beep('wrong');
    if (this.lives <= 0) this.lose();
  }

  /* ---------- Bucle ---------- */
  update(time, delta){
    if (this.ended) return;
    const dt = delta / 1000;
    this.elapsed += delta;
    const secs = this.elapsed / 1000;
    const speed = 250 + Math.min(170, secs * 3);
    const dx = speed * dt;

    this.bg.tilePositionX += dx * 0.25;

    // Propulsor: mantener = subir
    const ts = this.touchState || {};
    const hold = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || ts.up || this.input.activePointer.isDown;
    this.vy += (hold ? -1500 : 950) * dt;
    this.vy = Phaser.Math.Clamp(this.vy, -380, 420);
    this.player.y = Phaser.Math.Clamp(this.player.y + this.vy * dt, 40, 418);
    if (this.player.y <= 40 || this.player.y >= 418) this.vy = 0;
    this.player.setAngle(Phaser.Math.Clamp(this.vy * 0.04, -14, 14));

    // Chispas del propulsor
    this.sparkIn -= delta;
    if (this.sparkIn <= 0){
      this.sparkIn = hold ? 40 : 110;
      const c = hold ? 0xffd23f : 0x4fd6ff;
      const sp = this.add.rectangle(this.player.x - 24, this.player.y + 22, 6, 6, c, 0.9).setDepth(4);
      this.tweens.add({ targets:sp, x:sp.x - 50, y:sp.y + (hold ? 18 : 6), alpha:0, duration:320, onComplete:() => sp.destroy() });
    }
    this.lineIn -= delta;
    if (this.lineIn <= 0){
      this.lineIn = 120;
      const l = this.add.rectangle(830, Phaser.Math.Between(30, 430), Phaser.Math.Between(30, 90), 2, 0xffffff, 0.12).setDepth(1);
      this.tweens.add({ targets:l, x:-120, duration:(950 / (speed * 2)) * 1000, onComplete:() => l.destroy() });
    }

    // Aparición
    this.spawnIn -= delta;
    if (this.spawnIn <= 0){
      this.spawnPattern(secs);
      this.spawnIn = Math.max(850, Phaser.Math.Between(1500, 2200) * (300 / Math.max(speed, 300)));
    }
    this.boxIn -= delta;
    if (this.boxIn <= 0){
      this.pickup(Math.random() < 0.3 ? 'crate' : 'box', 880, Phaser.Math.Between(100, 340));
      this.boxIn = Phaser.Math.Between(11000, 16000);
    }

    // Movimiento y colisiones
    const px = this.player.x, py = this.player.y;
    const pb = new Phaser.Geom.Rectangle(px - 16, py - 28, 32, 52);
    for (let i = this.things.length - 1; i >= 0; i--){
      const o = this.things[i];
      o.x -= dx;
      if (o.x < -140){ o.destroy(); this.things.splice(i, 1); continue; }
      if (o.x > 860 || o.x < -40) continue;
      if (o.kind === 'pickup'){
        const rect = new Phaser.Geom.Rectangle(o.x - o.displayWidth / 2, o.y - o.displayHeight / 2, o.displayWidth, o.displayHeight);
        if (Phaser.Geom.Intersects.RectangleToRectangle(pb, rect)){
          this.charge = Math.min(100, this.charge + o.gain);
          this.score += o.pts + o.gain * 2;
          if (o.gain) this.pop(o.x, o.y - 20, '+' + o.gain + '%');
          else this.pop(o.x, o.y - 20, '+' + o.pts, '#ffd23f');
          if (o.pk === 'box' || o.pk === 'crate') this.tipText.setText(Phaser.Utils.Array.GetRandom(this.TIPS)), this.time.delayedCall(3500, () => this.tipText && this.tipText.setText(''));
          beep('correct');
          o.destroy(); this.things.splice(i, 1);
        }
      } else if (o.kind === 'hazard'){
        const hit = o.rad
          ? Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(o.x, o.y, o.rad), pb)
          : Phaser.Geom.Intersects.RectangleToRectangle(pb, new Phaser.Geom.Rectangle(o.x - o.rw / 2, o.y - o.rh * 1.2, o.rw, o.rh * 2.4));
        if (hit) this.hurt();
      }
    }

    // La energía se escapa poco a poco
    this.charge = Math.max(0, this.charge - 1.0 * dt);
    this.score += 4 * dt;
    this.chargeBar.width = 3 * this.charge;
    this.chargeBar.setFillStyle(this.charge < 25 ? 0xff4d8f : this.charge < 55 ? 0xffd23f : 0xa4f23c);
    this.chargeText.setText(Math.floor(this.charge) + '%');
    ArenaHUD.setScore(Math.floor(this.score));
    ArenaHUD.setTimer(100 - secs / 110 * 100);

    if (this.charge >= 100) this.win();
    else if (this.charge <= 0 && secs > 5) this.lose('Te quedaste sin energía. ¡Recoge más baterías!');
    else if (secs >= 110) this.lose('Se acabó el tiempo antes de llenar la batería.');
  }

  win(){
    this.ended = true; this.scene.pause();
    arenaGameOver(true, Math.floor(this.score) + 50, '¡Batería al 100%! La energía se guarda en baterías y viaja por circuitos para hacer funcionar tus dispositivos.');
  }
  lose(msg){
    this.ended = true; this.scene.pause();
    arenaGameOver(false, Math.floor(this.score), typeof msg === 'string' ? msg : 'Perdiste todas las vidas. Esquiva pinchos, fuego, sierras y bolas con púas.');
  }
}
)();
}
