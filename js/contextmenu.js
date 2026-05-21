import { getCurrentSlide, save } from './app.js';
import { createElement, toast } from './storage.js';

let menuEl = null;

export function initContextMenu(canvasEl) {
  canvasEl.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideContextMenu(); });
}

function handleContextMenu(e) {
  e.preventDefault();
  const element = e.target.closest('.canvas-element');
  const slide = getCurrentSlide();
  if (!slide) return;

  hideContextMenu();
  menuEl = document.createElement('div');
  menuEl.className = 'context-menu';
  menuEl.style.left = `${e.clientX}px`;
  menuEl.style.top = `${e.clientY}px`;

  if (element) {
    const id = element.dataset.id;
    const el = slide.elements.find(e => e.id === id);
    if (!el) return;
    menuEl.innerHTML = buildElementMenu(el);
    attachElementActions(menuEl, el, slide);
  } else {
    menuEl.innerHTML = buildCanvasMenu();
    attachCanvasActions(menuEl);
  }

  document.body.appendChild(menuEl);
  // Keep menu on screen
  const rect = menuEl.getBoundingClientRect();
  if (rect.right > window.innerWidth) menuEl.style.left = `${window.innerWidth - rect.width - 8}px`;
  if (rect.bottom > window.innerHeight) menuEl.style.top = `${window.innerHeight - rect.height - 8}px`;
}

function buildElementMenu(el) {
  return `
    <button data-ctx="cut">Cut <span class="ctx-short">Ctrl+X</span></button>
    <button data-ctx="copy">Copy <span class="ctx-short">Ctrl+C</span></button>
    <button data-ctx="paste">Paste <span class="ctx-short">Ctrl+V</span></button>
    <button data-ctx="duplicate">Duplicate <span class="ctx-short">Ctrl+D</span></button>
    <div class="ctx-divider"></div>
    <button data-ctx="bring-front">Bring to Front</button>
    <button data-ctx="bring-forward">Bring Forward</button>
    <button data-ctx="send-backward">Send Backward</button>
    <button data-ctx="send-back">Send to Back</button>
    <div class="ctx-divider"></div>
    <button data-ctx="align-h">Center Horizontally</button>
    <button data-ctx="align-v">Center Vertically</button>
    <button data-ctx="align-both">Center on Slide</button>
    <div class="ctx-divider"></div>
    <button data-ctx="lock">${el.locked ? 'Unlock' : 'Lock'}</button>
    <button data-ctx="delete" class="ctx-danger">Delete</button>
  `;
}

function buildCanvasMenu() {
  return `
    <button data-ctx="paste">Paste <span class="ctx-short">Ctrl+V</span></button>
    <div class="ctx-divider"></div>
    <button data-ctx="add-text">Add Text</button>
    <button data-ctx="add-image">Add Image</button>
    <button data-ctx="add-code">Add Code Block</button>
    <button data-ctx="add-shape">Add Shape</button>
    <div class="ctx-divider"></div>
    <button data-ctx="slide-bg">Slide Background...</button>
    <button data-ctx="select-all">Select All</button>
  `;
}

function attachElementActions(menu, el, slide) {
  menu.querySelectorAll('[data-ctx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.ctx;
      switch (action) {
        case 'cut': dispatch('presenter:cut'); break;
        case 'copy': dispatch('presenter:copy'); break;
        case 'paste': dispatch('presenter:paste'); break;
        case 'duplicate': dispatch('ribbon:duplicate'); break;
        case 'bring-front': el.zIndex = Math.max(...slide.elements.map(e => e.zIndex || 0)) + 1; save(); dispatch('ribbon:updated'); break;
        case 'bring-forward': el.zIndex = (el.zIndex || 0) + 1; save(); dispatch('ribbon:updated'); break;
        case 'send-backward': el.zIndex = (el.zIndex || 0) - 1; save(); dispatch('ribbon:updated'); break;
        case 'send-back': el.zIndex = Math.min(...slide.elements.map(e => e.zIndex || 0)) - 1; save(); dispatch('ribbon:updated'); break;
        case 'align-h': el.x = (100 - el.width) / 2; save(); dispatch('ribbon:updated'); break;
        case 'align-v': el.y = (100 - el.height) / 2; save(); dispatch('ribbon:updated'); break;
        case 'align-both': el.x = (100 - el.width) / 2; el.y = (100 - el.height) / 2; save(); dispatch('ribbon:updated'); break;
        case 'lock': el.locked = !el.locked; save(); dispatch('ribbon:updated'); break;
        case 'delete': dispatch('presenter:deleteelement'); break;
      }
      hideContextMenu();
    });
  });
}

function attachCanvasActions(menu) {
  menu.querySelectorAll('[data-ctx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.ctx;
      switch (action) {
        case 'paste': dispatch('presenter:paste'); break;
        case 'add-text': dispatch('ribbon:add-text'); break;
        case 'add-image': dispatch('ribbon:add-image'); break;
        case 'add-code': dispatch('ribbon:add-code'); break;
        case 'add-shape': dispatch('ribbon:add-shape'); break;
        case 'slide-bg': dispatch('view:slide-bg'); break;
        case 'select-all': dispatch('presenter:selectall'); break;
      }
      hideContextMenu();
    });
  });
}

function hideContextMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; }
}

function dispatch(event, detail = null) {
  document.dispatchEvent(new CustomEvent(event, { detail }));
}
