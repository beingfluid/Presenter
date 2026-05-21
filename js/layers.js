import { getCurrentSlide, save } from './app.js';

let panelEl;
let selectedId = null;

export function initLayers() {
  panelEl = document.getElementById('layers-panel');
}

export function setLayersSelection(id) {
  selectedId = id;
}

export function renderLayers() {
  if (!panelEl || panelEl.hidden) return;
  const slide = getCurrentSlide();
  if (!slide) { panelEl.querySelector('.layers-list').innerHTML = ''; return; }

  const sorted = [...slide.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const list = panelEl.querySelector('.layers-list');
  if (!list) return;
  list.innerHTML = sorted.map(el => `
    <div class="layer-item ${el.id === selectedId ? 'active' : ''} ${el.locked ? 'locked' : ''}" data-layer-id="${el.id}">
      <span class="layer-icon">${el.type === 'text' ? 'T' : el.type === 'code' ? '&lt;/&gt;' : '&#128444;'}</span>
      <span class="layer-name">${getLayerName(el)}</span>
      <button class="layer-btn" data-layer-action="visibility" title="${el.opacity === 0 ? 'Show' : 'Hide'}">${el.opacity === 0 ? '&#9675;' : '&#9679;'}</button>
      <button class="layer-btn" data-layer-action="lock" title="${el.locked ? 'Unlock' : 'Lock'}">${el.locked ? '&#128274;' : '&#128275;'}</button>
    </div>
  `).join('');

  list.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-layer-action]')) return;
      const id = item.dataset.layerId;
      document.dispatchEvent(new CustomEvent('layers:select', { detail: id }));
    });

    item.querySelectorAll('[data-layer-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.layerId;
        const el = slide.elements.find(e => e.id === id);
        if (!el) return;
        if (btn.dataset.layerAction === 'visibility') {
          el.opacity = el.opacity === 0 ? 1 : 0;
        } else if (btn.dataset.layerAction === 'lock') {
          el.locked = !el.locked;
        }
        save();
        document.dispatchEvent(new CustomEvent('ribbon:updated'));
      });
    });
  });
}

function getLayerName(el) {
  if (el.type === 'text') {
    const text = (el.content || '').replace(/<[^>]*>/g, '').trim();
    return text.substring(0, 20) || 'Text';
  }
  if (el.type === 'code') return `Code (${el.language || 'js'})`;
  return el.content ? 'Image' : 'Empty Image';
}

export function toggleLayersPanel() {
  if (!panelEl) return;
  panelEl.hidden = !panelEl.hidden;
  if (!panelEl.hidden) renderLayers();
}
