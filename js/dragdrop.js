/* =========================================================
   Ayudante genérico de arrastrar y soltar (mouse + táctil)
   - Funciona en celular/tablet (iPhone incluido): mientras arrastras
     se muestra una copia grande de la pieza un poco arriba del dedo,
     para que el dedo no la tape.
   - Un toque corto (sin arrastrar) llama a onTap.
   - Si el sistema cancela el gesto, la pieza vuelve a su lugar.
   ========================================================= */
function makeDraggable(node, { onStart, onMove, onDrop, onTap, onCancel } = {}){
  node.style.touchAction = 'none';
  node.style.webkitUserSelect = 'none';
  node.style.userSelect = 'none';
  node.style.webkitTouchCallout = 'none';
  node.addEventListener('contextmenu', e => e.preventDefault());
  let st = null;

  const place = (e) => {
    const lift = st.touch ? 54 : 0;                    // el dedo no tapa la pieza
    st.cx = e.clientX; st.cy = e.clientY - lift;
    st.ghost.style.transform = `translate(${st.cx - st.gw / 2}px, ${st.cy - st.gh / 2}px)`;
  };
  const cleanup = () => {
    if (!st) return;
    if (st.ghost) st.ghost.remove();
    node.classList.remove('dragging-source');
    try { node.releasePointerCapture(st.id); } catch (_) {}
    st = null;
  };

  node.addEventListener('pointerdown', (e) => {
    if (st) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const rect = node.getBoundingClientRect();
    st = { id:e.pointerId, sx:e.clientX, sy:e.clientY, rect, moved:false, ghost:null, touch:e.pointerType !== 'mouse' };
    try { node.setPointerCapture(e.pointerId); } catch (_) {}
  });

  node.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.moved){
      if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 8) return;   // todavía es un toque
      st.moved = true;
      const g = node.cloneNode(true);
      g.classList.add('drag-ghost');
      st.gw = st.rect.width * 1.2; st.gh = st.rect.height * 1.2;
      g.style.cssText = `position:fixed;left:0;top:0;width:${st.gw}px;height:${st.gh}px;margin:0;pointer-events:none;z-index:10000;transition:none;will-change:transform;`;
      document.body.appendChild(g);
      st.ghost = g;
      node.classList.add('dragging-source');
      if (onStart) onStart();
    }
    e.preventDefault();
    place(e);
    if (onMove) onMove(e);
  });

  const finish = (e, cancelled) => {
    if (!st || e.pointerId !== st.id) return;
    const moved = st.moved, x = st.cx, y = st.cy;
    cleanup();
    if (cancelled){ if (onCancel) onCancel(node); return; }
    if (!moved){ if (onTap) onTap(node); return; }
    const target = document.elementFromPoint(x, y);
    if (onDrop) onDrop(target, node, { x, y });
  };
  node.addEventListener('pointerup', (e) => finish(e, false));
  node.addEventListener('pointercancel', (e) => finish(e, true));
}

function resetDraggablePosition(node){
  node.classList.remove('dragging-source');
  node.style.position = '';
  node.style.left = '';
  node.style.top = '';
  node.style.width = '';
  node.style.zIndex = '';
}
