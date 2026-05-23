// Freehand drawing / annotation overlay for the presentation player.
// Toggle with `D`. Tools: pen (P), highlighter (H), eraser (E), clear (X),
// cycle color (C), thickness (1-4). Strokes live only for the current slide
// view (cleared on slide change), unless `persist` is true.

let canvas = null;
let ctx = null;
let drawing = false;
let mode = false;       // master on/off
let tool = 'pen';
let color = '#ff3b3b';
let size = 4;
const colors = ['#ff3b3b', '#ffeb3b', '#42ffd6', '#4dabff', '#ffffff', '#000000', '#ff8a3d'];
let strokes = [];       // per-slide; cleared on slide change
let last = null;
let hostEl = null;
let toolbar = null;

export function initAnnotate(playerEl) {
  hostEl = playerEl;
}

export function isAnnotating() { return mode; }

export function toggleAnnotate() {
  mode = !mode;
  if (mode) start();
  else stop();
  return mode;
}

export function clearAnnotations() {
  strokes = [];
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function onSlideChange() {
  clearAnnotations();
}

function start() {
  if (!hostEl) return;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'annotate-canvas';
    hostEl.appendChild(canvas);
  }
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.style.display = 'block';
  showToolbar();
  hostEl.classList.add('annotating');
}

function stop() {
  if (canvas) canvas.style.display = 'none';
  window.removeEventListener('resize', resize);
  if (canvas) canvas.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  hideToolbar();
  hostEl?.classList.remove('annotating');
  drawing = false;
}

function resize() {
  if (!canvas || !hostEl) return;
  const dpr = window.devicePixelRatio || 1;
  const r = hostEl.getBoundingClientRect();
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  canvas.style.width = `${r.width}px`;
  canvas.style.height = `${r.height}px`;
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  redraw();
}

function redraw() {
  if (!ctx) return;
  const r = hostEl.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  strokes.forEach(s => paintStroke(s));
}

function paintStroke(s) {
  if (s.pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.globalAlpha = s.tool === 'highlighter' ? 0.35 : 1;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.moveTo(s.pts[0].x, s.pts[0].y);
  for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function onDown(e) {
  if (!mode) return;
  drawing = true;
  const p = pt(e);
  const s = { tool, color, size: tool === 'highlighter' ? size * 4 : size, pts: [p] };
  strokes.push(s);
  last = s;
  e.preventDefault();
}
function onMove(e) {
  if (!mode || !drawing || !last) return;
  last.pts.push(pt(e));
  // Incremental paint only the new segment.
  const i = last.pts.length;
  if (i < 2) return;
  ctx.save();
  ctx.strokeStyle = last.color;
  ctx.lineWidth = last.size;
  ctx.globalAlpha = last.tool === 'highlighter' ? 0.35 : 1;
  ctx.globalCompositeOperation = last.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.moveTo(last.pts[i - 2].x, last.pts[i - 2].y);
  ctx.lineTo(last.pts[i - 1].x, last.pts[i - 1].y);
  ctx.stroke();
  ctx.restore();
}
function onUp() { drawing = false; last = null; }

function pt(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export function handleAnnotateKey(e) {
  if (!mode) return false;
  const k = e.key.toLowerCase();
  if (k === 'p') { tool = 'pen'; updateToolbar(); return true; }
  if (k === 'h') { tool = 'highlighter'; updateToolbar(); return true; }
  if (k === 'e') { tool = 'eraser'; updateToolbar(); return true; }
  if (k === 'x') { clearAnnotations(); return true; }
  if (k === 'c') { color = colors[(colors.indexOf(color) + 1) % colors.length]; updateToolbar(); return true; }
  if (['1','2','3','4'].includes(k)) { size = [2, 4, 8, 16][parseInt(k) - 1]; updateToolbar(); return true; }
  return false;
}

function showToolbar() {
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'annotate-toolbar';
    hostEl.appendChild(toolbar);
  }
  toolbar.style.display = 'flex';
  updateToolbar();
}
function hideToolbar() { if (toolbar) toolbar.style.display = 'none'; }
function updateToolbar() {
  if (!toolbar) return;
  toolbar.innerHTML = `
    <button data-at="pen" class="${tool === 'pen' ? 'on' : ''}" title="Pen (P)">&#9998;</button>
    <button data-at="highlighter" class="${tool === 'highlighter' ? 'on' : ''}" title="Highlighter (H)">&#9646;</button>
    <button data-at="eraser" class="${tool === 'eraser' ? 'on' : ''}" title="Eraser (E)">&#9633;</button>
    <span class="at-sep"></span>
    ${colors.map(c => `<button data-color="${c}" class="at-color ${c === color ? 'on' : ''}" style="background:${c}" title="Color"></button>`).join('')}
    <span class="at-sep"></span>
    ${[2,4,8,16].map((s, i) => `<button data-size="${s}" class="at-size ${size === s ? 'on' : ''}" title="Size ${i+1}"><span style="width:${s + 2}px;height:${s + 2}px"></span></button>`).join('')}
    <span class="at-sep"></span>
    <button data-at="clear" title="Clear (X)">&#10005;</button>
    <button data-at="off" title="Off (D)">&#9211;</button>
  `;
  toolbar.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.dataset.color) { color = b.dataset.color; updateToolbar(); return; }
      if (b.dataset.size) { size = parseInt(b.dataset.size); updateToolbar(); return; }
      const at = b.dataset.at;
      if (at === 'clear') clearAnnotations();
      else if (at === 'off') toggleAnnotate();
      else { tool = at; updateToolbar(); }
    });
  });
}
