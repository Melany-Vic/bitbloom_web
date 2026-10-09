/* =========================================================
   CAJITA DE OPINIONES
   Los usuarios cuentan si les gusta el juego, si todo funciona
   bien y qué se debe mejorar. Se guardan en la base compartida
   y los profesores pueden leerlas desde su panel.
   ========================================================= */
const FB_RATINGS = [
  { v:4, icon:'😍', label:'¡Me encanta!' },
  { v:3, icon:'🙂', label:'Me gusta' },
  { v:2, icon:'😐', label:'Más o menos' },
  { v:1, icon:'😕', label:'Debe mejorar' },
];
const FB_AREAS = ['Juegos de la Arena', 'Niveles del mapa', 'Tienda y cofres', 'Multijugador', 'Actividades del profesor', 'Diseño y botones en celular', 'Otro'];

function openFeedbackBox(){
  let rating = 0, works = '';
  showModal(`
    <h2>💬 Tus opiniones</h2>
    <p class="level-hint" style="margin-top:0;">Cuéntanos cómo te va con BitBloom. ¡Tu opinión nos ayuda a mejorarlo!</p>
    <div class="fb-block">
      <label class="profile-label">¿Qué te parece el videojuego?</label>
      <div class="fb-ratings">${FB_RATINGS.map(r => `<button class="fb-rate" data-v="${r.v}"><span>${r.icon}</span>${r.label}</button>`).join('')}</div>
    </div>
    <div class="fb-block">
      <label class="profile-label">¿Todo funciona bien?</label>
      <div class="fb-ratings fb-works">
        <button class="fb-work" data-w="si">✅ Sí, todo bien</button>
        <button class="fb-work" data-w="algo">⚠️ Algo falla</button>
      </div>
    </div>
    <div class="fb-block">
      <label class="profile-label">¿Sobre qué quieres opinar?</label>
      <select id="fbArea" class="online-activity-select">${FB_AREAS.map(a => `<option>${a}</option>`).join('')}</select>
    </div>
    <div class="fb-block">
      <label class="profile-label">Escribe tu comentario <span class="profile-opt">(qué te gusta o qué debería mejorar)</span></label>
      <textarea id="fbText" class="fb-text" maxlength="500" rows="4" placeholder="Ejemplo: Me gusta la Carrera de Bits, pero el botón de saltar es pequeño en mi celular…"></textarea>
      <div class="fb-count"><span id="fbCount">0</span>/500</div>
    </div>
    <div class="profile-error hidden" id="fbError"></div>
    <div class="modal-actions">
      <button class="modal-btn" id="fbCancel">Cancelar</button>
      <button class="modal-btn primary" id="fbSend">📨 Enviar opinión</button>
    </div>
  `);
  const err = (m) => { const e = $('#fbError'); e.textContent = m; e.classList.remove('hidden'); };
  $$('.fb-rate').forEach(b => b.onclick = () => { rating = +b.dataset.v; $$('.fb-rate').forEach(x => x.classList.toggle('sel', x === b)); });
  $$('.fb-work').forEach(b => b.onclick = () => { works = b.dataset.w; $$('.fb-work').forEach(x => x.classList.toggle('sel', x === b)); });
  $('#fbText').addEventListener('input', () => { $('#fbCount').textContent = $('#fbText').value.length; });
  $('#fbCancel').onclick = hideModal;
  $('#fbSend').onclick = async () => {
    const text = $('#fbText').value.trim();
    if (!rating){ err('Elige cómo te parece el videojuego.'); return; }
    if (!works){ err('Cuéntanos si todo funciona bien o si algo falla.'); return; }
    if (works === 'algo' && text.length < 8){ err('Cuéntanos qué falla (escribe al menos unas palabras).'); return; }
    if (text){ const m = checkText(text); if (!m.ok){ err('🚫 ' + m.reason); return; } }
    if (Date.now() - (parseInt(localStorage.getItem('bb-last-feedback') || '0', 10)) < 45000){ err('Espera un momento antes de enviar otra opinión.'); return; }
    const btn = $('#fbSend'); btn.disabled = true; btn.textContent = 'Enviando…';
    const user = State.profile ? State.profile.name : 'Invitado';
    const rec = {
      user, role: State.profile ? State.profile.role : 'estudiante',
      rating, works, area: $('#fbArea').value, text,
      device: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computador',
      ts: Date.now(),
    };
    try {
      const ok = await AppStorage.set('feedback:' + rec.ts + '-' + slugifyProfileName(user), JSON.stringify(rec), true);
      if (!ok) throw new Error('no guardado');
      try { localStorage.setItem('bb-last-feedback', String(Date.now())); } catch (_) {}
      showModal(`
        <h2>¡Gracias, ${escapeHtml(user)}! 💙</h2>
        <p>Recibimos tu opinión. Nos ayuda a hacer que BitBloom sea cada vez mejor.</p>
        <div class="modal-actions"><button class="modal-btn primary" id="fbDone">Cerrar</button></div>`);
      $('#fbDone').onclick = hideModal;
    } catch (e) {
      btn.disabled = false; btn.textContent = '📨 Enviar opinión';
      err('No se pudo enviar ahora. Revisa tu conexión e inténtalo de nuevo.');
    }
  };
}

/* Para profesores: lista de opiniones recibidas */
async function showFeedbackInbox(){
  const wrap = $('#teacherWrap');
  wrap.innerHTML = '<p class="level-hint">Cargando opiniones…</p>';
  const rows = await AppStorage.list('feedback:', true);
  const items = rows.map(r => { try { return JSON.parse(r.value); } catch (e) { return null; } }).filter(Boolean).sort((a, b) => b.ts - a.ts).slice(0, 60);
  const avg = items.length ? (items.reduce((n, i) => n + i.rating, 0) / items.length) : 0;
  const issues = items.filter(i => i.works === 'algo').length;
  wrap.innerHTML = `
    <div class="modal-actions" style="justify-content:flex-start; margin-bottom:10px;">
      <button class="modal-btn" id="fbInboxBack">← Volver al panel</button>
      <button class="modal-btn" id="fbInboxRefresh">🔄 Actualizar</button>
    </div>
    <div class="online-panel">
      <h3 class="prog-h">💬 Opiniones de los usuarios</h3>
      <div class="prog-stats">
        <div class="prog-stat"><b>${items.length}</b><span>opiniones</span></div>
        <div class="prog-stat"><b>${items.length ? avg.toFixed(1) + '/4' : '—'}</b><span>valoración media</span></div>
        <div class="prog-stat"><b>${issues}</b><span>reportan fallos</span></div>
      </div>
    </div>
    <div class="online-panel">
      ${items.length ? items.map(i => {
        const r = FB_RATINGS.find(x => x.v === i.rating) || FB_RATINGS[2];
        return `<div class="fb-item ${i.works === 'algo' ? 'issue' : ''}">
          <div class="fb-item-top"><b>${r.icon} ${escapeHtml(i.user)}</b><small>${new Date(i.ts).toLocaleDateString('es')} · ${escapeHtml(i.device)} · ${escapeHtml(i.area)}</small></div>
          <div class="fb-item-sub">${i.works === 'algo' ? '⚠️ Dice que algo falla' : '✅ Todo funciona bien'} · ${r.label}</div>
          ${i.text ? '<div class="fb-item-text">' + escapeHtml(i.text) + '</div>' : ''}
        </div>`;
      }).join('') : '<p class="level-hint">Todavía no hay opiniones.</p>'}
    </div>`;
  $('#fbInboxBack').onclick = showTeacherPanel;
  $('#fbInboxRefresh').onclick = showFeedbackInbox;
}
