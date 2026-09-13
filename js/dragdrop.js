/* =========================================================
   Ayudante genérico de arrastrar y soltar (mouse + táctil)
   ========================================================= */
function makeDraggable(node, { onStart, onMove, onDrop } = {}){
  node.style.touchAction = 'none';
  let dragging = false;
  let offsetX = 0, offsetY = 0;

  node.addEventListener('pointerdown', (e) => {
    dragging = true;
    node.setPointerCapture(e.pointerId);
    node.classList.add('dragging');
    const rect = node.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    node.style.position = 'fixed';
    node.style.left = rect.left + 'px';
    node.style.top = rect.top + 'px';
    node.style.zIndex = 999;
    node.style.width = rect.width + 'px';
    if (onStart) onStart();
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    node.style.left = (e.clientX - offsetX) + 'px';
    node.style.top = (e.clientY - offsetY) + 'px';
    if (onMove) onMove(e);
  });

  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    node.classList.remove('dragging');
    node.style.zIndex = '';
    node.releasePointerCapture && node.releasePointerCapture(e.pointerId);
    node.style.display = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    node.style.display = '';
    if (onDrop) onDrop(target, node);
  });
}

function resetDraggablePosition(node){
  node.style.position = '';
  node.style.left = '';
  node.style.top = '';
  node.style.width = '';
  node.style.zIndex = '';
}
