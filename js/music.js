/* =========================================================
   🎵 MI MÚSICA — cada jugador elige canciones de SU dispositivo
   - Los archivos de audio se guardan solo en este dispositivo
     (IndexedDB). No se suben a internet ni se comparten.
   - Se puede elegir una canción distinta para cada juego de la
     Arena, o una para todos.
   - Se pausa con el menú de la ✕ y se detiene al terminar.
   ========================================================= */
const MUSIC_LS = 'bb-music';
const MusicState = { audio:null, url:null, urls:{}, playingKey:null, previewing:false };

function musicSettings(){
  const s = lsGet(MUSIC_LS) || {};
  return { vol: (s.vol != null ? s.vol : 0.6), muted: !!s.muted, tracks: s.tracks || {} };
}
function musicSave(s){ lsSet(MUSIC_LS, s); }

/* ---------- Almacenamiento (IndexedDB) ---------- */
const MusicDB = {
  _db: null,
  open(){
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      try {
        const rq = indexedDB.open('bitbloom-music', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('tracks', { keyPath:'key' });
        rq.onsuccess = () => { this._db = rq.result; res(this._db); };
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
  },
  async put(key, blob, name){
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction('tracks', 'readwrite'); tx.objectStore('tracks').put({ key, blob, name }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
  async get(key){
    const db = await this.open();
    return new Promise((res, rej) => { const rq = db.transaction('tracks').objectStore('tracks').get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); });
  },
  async del(key){
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction('tracks', 'readwrite'); tx.objectStore('tracks').delete(key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
};
/* Si no hay IndexedDB (modo privado) la canción vale solo mientras la página siga abierta */
const _musicMemory = {};

async function musicStore(key, file){
  const url = URL.createObjectURL(file);
  if (MusicState.urls[key]) URL.revokeObjectURL(MusicState.urls[key]);
  MusicState.urls[key] = url;
  try { await MusicDB.put(key, file, file.name); } catch (e) { _musicMemory[key] = file; }
  const s = musicSettings(); s.tracks[key] = { name: file.name }; musicSave(s);
}
async function musicRemove(key){
  try { await MusicDB.del(key); } catch (e) {}
  delete _musicMemory[key];
  if (MusicState.urls[key]){ URL.revokeObjectURL(MusicState.urls[key]); delete MusicState.urls[key]; }
  const s = musicSettings(); delete s.tracks[key]; musicSave(s);
}

/* Prepara las canciones guardadas (URLs) para que suenen al instante al empezar el juego.
   Es necesario en iPhone: el audio debe iniciarse justo al tocar el botón de jugar. */
async function musicPrepare(){
  const s = musicSettings();
  for (const key of Object.keys(s.tracks)){
    if (MusicState.urls[key]) continue;
    try {
      const rec = await MusicDB.get(key);
      if (rec && rec.blob) MusicState.urls[key] = URL.createObjectURL(rec.blob);
      else if (_musicMemory[key]) MusicState.urls[key] = URL.createObjectURL(_musicMemory[key]);
    } catch (e) {}
  }
}

/* ---------- Reproducción ---------- */
function musicUrlFor(gameKey){ return MusicState.urls[gameKey] || MusicState.urls['all'] || null; }

function musicStartSync(gameKey){
  musicStop();
  const url = musicUrlFor(gameKey);
  if (!url) return false;
  const s = musicSettings();
  const a = new Audio(url);
  a.loop = true; a.volume = s.vol; a.muted = s.muted; a.preload = 'auto';
  MusicState.audio = a; MusicState.playingKey = gameKey;
  const p = a.play();
  if (p && p.catch) p.catch(() => {
    showToast('🎵 Toca la pantalla para activar tu música');
    const once = () => { if (MusicState.audio === a) a.play().catch(() => {}); };
    window.addEventListener('pointerdown', once, { once:true });
  });
  return true;
}
function musicStop(){
  if (MusicState.audio){ try { MusicState.audio.pause(); } catch (e) {} MusicState.audio = null; }
  MusicState.playingKey = null; MusicState.previewing = false;
}
function musicPause(){ if (MusicState.audio && !MusicState.previewing) try { MusicState.audio.pause(); } catch (e) {} }
function musicResume(){ if (MusicState.audio && !MusicState.previewing) MusicState.audio.play().catch(() => {}); }
function musicSetVolume(v){
  const s = musicSettings(); s.vol = v; musicSave(s);
  if (MusicState.audio) MusicState.audio.volume = v;
}
function musicToggleMute(){
  const s = musicSettings(); s.muted = !s.muted; musicSave(s);
  if (MusicState.audio) MusicState.audio.muted = s.muted;
  return s.muted;
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) musicPause();
  else if (!(typeof GamePause !== 'undefined' && GamePause.active)) musicResume();
});

/* ---------- Pantalla "🎵 Mi música" ---------- */
function openMusicSettings(){
  const s = musicSettings();
  const rows = [{ key:'all', icon:'🎶', name:'Todos los juegos' }].concat(ARENA_GAMES.map(g => ({ key:g.key, icon:g.icon, name:g.name })));
  showModal(`
    <h2>🎵 Mi música</h2>
    <p class="level-hint" style="margin-top:0;">Elige canciones de tu dispositivo para jugar. Se guardan <b>solo aquí</b>: no se suben a internet ni se comparten. Si un juego tiene su propia canción, suena esa; si no, la de "Todos los juegos".</p>
    <div class="music-list">
      ${rows.map(r => `
        <div class="music-row" data-key="${r.key}">
          <div class="music-name">${r.icon} <b>${escapeHtml(r.name)}</b><small>${s.tracks[r.key] ? '🎵 ' + escapeHtml(s.tracks[r.key].name) : 'sin canción'}</small></div>
          <div class="music-btns">
            ${s.tracks[r.key] ? `<button class="music-b" data-act="play" title="Probar">▶</button><button class="music-b" data-act="del" title="Quitar">🗑</button>` : ''}
            <button class="music-b pick" data-act="pick">📂 ${s.tracks[r.key] ? 'Cambiar' : 'Elegir'}</button>
          </div>
        </div>`).join('')}
    </div>
    <div class="music-vol">
      <span>🔈</span><input type="range" id="musVol" min="0" max="1" step="0.05" value="${s.vol}"><button class="music-b" id="musMute">${s.muted ? '🔇 Silenciado' : '🔊 Con sonido'}</button>
    </div>
    <p class="level-hint" id="musMsg" style="min-height:18px;"></p>
    <div class="modal-actions"><button class="modal-btn primary" id="musClose">Listo</button></div>
  `);
  const msg = t => { const m = $('#musMsg'); if (m) m.textContent = t; };
  $('#musClose').onclick = () => { musicStop(); hideModal(); };
  $('#musVol').oninput = e => musicSetVolume(+e.target.value);
  $('#musMute').onclick = () => { $('#musMute').textContent = musicToggleMute() ? '🔇 Silenciado' : '🔊 Con sonido'; };
  $$('.music-row').forEach(row => {
    const key = row.dataset.key;
    row.querySelectorAll('.music-b').forEach(btn => btn.onclick = async () => {
      const act = btn.dataset.act;
      if (act === 'pick'){
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.aac,.ogg,.wav';
        inp.onchange = async () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          if (f.size > 40 * 1024 * 1024){ msg('Ese archivo es muy grande (máximo 40 MB).'); return; }
          if (f.type && !f.type.startsWith('audio/') && !/\.(mp3|m4a|aac|ogg|wav)$/i.test(f.name)){ msg('Elige un archivo de audio (MP3, M4A, OGG o WAV).'); return; }
          await musicStore(key, f);
          openMusicSettings();
          const m2 = $('#musMsg'); if (m2) m2.textContent = '✔ Canción guardada en este dispositivo.';
        };
        inp.click();
      } else if (act === 'del'){
        await musicRemove(key); openMusicSettings();
      } else if (act === 'play'){
        if (MusicState.previewing && MusicState.audio){ musicStop(); btn.textContent = '▶'; return; }
        await musicPrepare();
        const url = MusicState.urls[key];
        if (!url){ msg('No se pudo leer esa canción. Vuelve a elegirla.'); return; }
        musicStop();
        const a = new Audio(url); a.loop = false; a.volume = musicSettings().vol; a.muted = musicSettings().muted;
        MusicState.audio = a; MusicState.previewing = true;
        a.play().catch(() => msg('Toca otra vez para reproducir.'));
        btn.textContent = '⏹';
        setTimeout(() => { if (MusicState.audio === a){ musicStop(); btn.textContent = '▶'; } }, 12000);   // vista previa de 12 s
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', () => { setTimeout(musicPrepare, 500); });
