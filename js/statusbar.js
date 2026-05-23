import { getState, getCurrentSlide } from './app.js';

let statusEl;
let zoomLevel = 100;

export function initStatusBar() {
  statusEl = document.getElementById('status-bar');
  if (!statusEl) return;
  statusEl.addEventListener('click', handleStatusClick);
  statusEl.addEventListener('input', handleStatusInput);
}

export function setZoom(z) {
  zoomLevel = z;
  renderStatusBar();
}

export function getZoom() {
  return zoomLevel;
}

export function renderStatusBar() {
  if (!statusEl) return;
  const state = getState();
  if (!state.active) return;
  const slide = getCurrentSlide();
  const slideCount = state.active.slides.length;
  const elementCount = slide ? slide.elements.length : 0;
  const aspect = state.active.aspectRatio || '16:9';

  statusEl.innerHTML = `
    <div class="status-left">
      <input type="text" class="status-title-input" id="presentation-title" value="${escapeAttr(state.active.title || '')}" placeholder="Untitled presentation" spellcheck="false" title="Presentation title">
      <span class="status-sep">|</span>
      <span class="status-item">Slide ${state.currentSlideIndex + 1} / ${slideCount}</span>
      <span class="status-sep">|</span>
      <span class="status-item">${elementCount} element${elementCount !== 1 ? 's' : ''}</span>
      <span class="status-sep">|</span>
      <span class="status-item">${aspect}</span>
    </div>
    <div class="status-right">
      <button class="status-btn" data-status="zoom-out" title="Zoom Out">-</button>
      <input type="range" class="status-zoom" data-status="zoom-range" min="50" max="200" value="${zoomLevel}" title="Zoom ${zoomLevel}%">
      <button class="status-btn" data-status="zoom-in" title="Zoom In">+</button>
      <span class="status-item zoom-label">${zoomLevel}%</span>
      <span class="status-sep">|</span>
      <button class="status-btn" data-status="grid" title="Toggle Grid" aria-label="Toggle Grid">&#9638;</button>
      <button class="status-btn" data-status="present" title="Present" aria-label="Present">&#9654;</button>
    </div>
  `;
}

function handleStatusClick(e) {
  const btn = e.target.closest('[data-status]');
  if (!btn) return;
  const action = btn.dataset.status;
  switch (action) {
    case 'zoom-in':
      zoomLevel = Math.min(200, zoomLevel + 10);
      document.dispatchEvent(new CustomEvent('status:zoom', { detail: zoomLevel }));
      renderStatusBar();
      break;
    case 'zoom-out':
      zoomLevel = Math.max(50, zoomLevel - 10);
      document.dispatchEvent(new CustomEvent('status:zoom', { detail: zoomLevel }));
      renderStatusBar();
      break;
    case 'grid':
      document.dispatchEvent(new CustomEvent('view:toggle-grid'));
      break;
    case 'present':
      document.dispatchEvent(new CustomEvent('status:present'));
      break;
  }
}

function handleStatusInput(e) {
  if (e.target.dataset.status === 'zoom-range') {
    zoomLevel = parseInt(e.target.value);
    document.dispatchEvent(new CustomEvent('status:zoom', { detail: zoomLevel }));
    const label = statusEl.querySelector('.zoom-label');
    if (label) label.textContent = `${zoomLevel}%`;
  } else if (e.target.id === 'presentation-title') {
    const state = getState();
    if (state.active) {
      state.active.title = e.target.value;
      document.dispatchEvent(new CustomEvent('title:changed', { detail: e.target.value }));
    }
  }
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
