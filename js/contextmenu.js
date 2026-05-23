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
  // Type-aware first block — shows the single most useful action for the type.
  const typeAction = {
    image: '<button data-ctx="replace-image">&#128247; Replace Image&hellip;</button>',
    code:  '<button data-ctx="edit-code">&#9998; Open Code Editor</button>',
    embed: '<button data-ctx="edit-url">&#9998; Edit Embed URL</button>',
    video: '<button data-ctx="edit-url">&#9998; Edit Video URL</button>',
    audio: '<button data-ctx="edit-url">&#9998; Edit Audio URL</button>',
  }[el.type] || '';
  const canFlip = el.type === 'image' || el.type === 'shape';
  return `
    ${typeAction ? typeAction + '<div class="ctx-divider"></div>' : ''}
    <button data-ctx="cut">Cut <span class="ctx-short">Ctrl+X</span></button>
    <button data-ctx="copy">Copy <span class="ctx-short">Ctrl+C</span></button>
    <button data-ctx="paste">Paste <span class="ctx-short">Ctrl+V</span></button>
    <button data-ctx="duplicate">Duplicate <span class="ctx-short">Ctrl+D</span></button>
    <div class="ctx-divider"></div>
    <button data-ctx="copy-style">Copy Style</button>
    <button data-ctx="paste-style">Paste Style</button>
    <div class="ctx-divider"></div>
    <button data-ctx="bring-front">Bring to Front</button>
    <button data-ctx="bring-forward">Bring Forward</button>
    <button data-ctx="send-backward">Send Backward</button>
    <button data-ctx="send-back">Send to Back</button>
    <div class="ctx-divider"></div>
    <button data-ctx="align-left">Align Left</button>
    <button data-ctx="align-right">Align Right</button>
    <button data-ctx="align-top">Align Top</button>
    <button data-ctx="align-bottom">Align Bottom</button>
    <button data-ctx="align-h">Center Horizontally</button>
    <button data-ctx="align-v">Center Vertically</button>
    <button data-ctx="align-both">Center on Slide</button>
    ${canFlip ? `
      <div class="ctx-divider"></div>
      <button data-ctx="flip-h">Flip Horizontal</button>
      <button data-ctx="flip-v">Flip Vertical</button>
    ` : ''}
    <div class="ctx-divider"></div>
    <button data-ctx="lock">${el.locked ? '&#128275; Unlock' : '&#128274; Lock'}</button>
    <button data-ctx="delete" class="ctx-danger">Delete <span class="ctx-short">Del</span></button>
  `;
}

function buildCanvasMenu() {
  return `
    <button data-ctx="paste">Paste <span class="ctx-short">Ctrl+V</span></button>
    <div class="ctx-divider"></div>
    <button data-ctx="add-text">Add Text</button>
    <button data-ctx="add-image">Add Image</button>
    <button data-ctx="add-shape">Add Shape</button>
    <button data-ctx="add-code">Add Code Block</button>
    <button data-ctx="add-embed">Add Embed</button>
    <button data-ctx="add-video">Add Video</button>
    <button data-ctx="add-audio">Add Audio</button>
    <div class="ctx-divider"></div>
    <button data-ctx="slide-bg">Slide Background&hellip;</button>
    <button data-ctx="select-all">Select All <span class="ctx-short">Ctrl+A</span></button>
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
        case 'copy-style': dispatch('element:copy-style'); break;
        case 'paste-style': dispatch('element:paste-style'); break;
        case 'bring-front': el.zIndex = Math.max(...slide.elements.map(e => e.zIndex || 0)) + 1; save(); dispatch('ribbon:updated'); break;
        case 'bring-forward': el.zIndex = (el.zIndex || 0) + 1; save(); dispatch('ribbon:updated'); break;
        case 'send-backward': el.zIndex = (el.zIndex || 0) - 1; save(); dispatch('ribbon:updated'); break;
        case 'send-back': el.zIndex = Math.min(...slide.elements.map(e => e.zIndex || 0)) - 1; save(); dispatch('ribbon:updated'); break;
        case 'align-left':   dispatch('element:align', 'left'); break;
        case 'align-right':  dispatch('element:align', 'right'); break;
        case 'align-top':    dispatch('element:align', 'top'); break;
        case 'align-bottom': dispatch('element:align', 'bottom'); break;
        case 'align-h': el.x = (100 - el.width) / 2; save(); dispatch('ribbon:updated'); break;
        case 'align-v': el.y = (100 - el.height) / 2; save(); dispatch('ribbon:updated'); break;
        case 'align-both': el.x = (100 - el.width) / 2; el.y = (100 - el.height) / 2; save(); dispatch('ribbon:updated'); break;
        case 'flip-h': dispatch('element:flip', 'h'); break;
        case 'flip-v': dispatch('element:flip', 'v'); break;
        case 'lock': el.locked = !el.locked; save(); dispatch('ribbon:updated'); break;
        case 'replace-image': dispatch('element:replace-image'); break;
        case 'edit-code': dispatch('ribbon:edit-code'); break;
        case 'edit-url': {
          const url = prompt('URL:', el.content || '');
          if (url !== null) { el.content = url; save(); dispatch('ribbon:updated'); }
          break;
        }
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
        case 'add-shape': dispatch('ribbon:add-shape'); break;
        case 'add-code': dispatch('ribbon:add-code'); break;
        case 'add-embed': dispatch('ribbon:add-embed'); break;
        case 'add-video': dispatch('ribbon:add-video'); break;
        case 'add-audio': dispatch('ribbon:add-audio'); break;
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
