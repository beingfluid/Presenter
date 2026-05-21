import { getState, getCurrentSlide, setCurrentSlideIndex, switchMode, save } from './app.js';
import { createSlide, createElement, exportPresentation, importPresentation, toast } from './storage.js';
import { TEMPLATES, getCustomTemplates, saveCustomTemplate, deleteCustomTemplate } from './templates.js';
import { FONT_LIST, loadFont } from './fonts.js';
import { initGuides, showGuides, hideGuides } from './guides.js';
import { initRibbon, renderRibbon, setRibbonSelection } from './ribbon.js';
import { loadMonaco, createCodeEditor, destroyAllEditors, CODE_LANGUAGES, CODE_THEMES } from './code.js';
import { initContextMenu } from './contextmenu.js';
import { initStatusBar, renderStatusBar, setZoom, getZoom } from './statusbar.js';
import { initLayers, renderLayers, setLayersSelection, toggleLayersPanel } from './layers.js';

let slideListEl, canvasEl, toolbarEl, propertiesEl;
let selectedElementId = null;
let dragState = null;
let templatePanelOpen = false;
let lastTemplateIndex = 0;
let clipboard = null;

// === UNDO/REDO ===
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

function saveUndoState() {
  const state = getState();
  if (!state.active) return;
  const snapshot = JSON.stringify(state.active);
  if (undoStack.length && undoStack[undoStack.length - 1] === snapshot) return;
  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
}

function undo() {
  const state = getState();
  if (!state.active || undoStack.length === 0) return;
  redoStack.push(JSON.stringify(state.active));
  const prev = JSON.parse(undoStack.pop());
  const idx = state.presentations.findIndex(p => p.id === state.active.id);
  if (idx !== -1) state.presentations[idx] = prev;
  state.active = prev;
  if (state.currentSlideIndex >= prev.slides.length) {
    state.currentSlideIndex = prev.slides.length - 1;
  }
  selectedElementId = null;
  save(); renderEditor();
  toast('Undo');
}

function redo() {
  const state = getState();
  if (!state.active || redoStack.length === 0) return;
  undoStack.push(JSON.stringify(state.active));
  const next = JSON.parse(redoStack.pop());
  const idx = state.presentations.findIndex(p => p.id === state.active.id);
  if (idx !== -1) state.presentations[idx] = next;
  state.active = next;
  if (state.currentSlideIndex >= next.slides.length) {
    state.currentSlideIndex = next.slides.length - 1;
  }
  selectedElementId = null;
  save(); renderEditor();
  toast('Redo');
}

export function initEditor() {
  slideListEl = document.getElementById('slide-list');
  canvasEl = document.getElementById('slide-canvas');
  toolbarEl = document.getElementById('toolbar');
  propertiesEl = document.getElementById('properties-panel');
  initRibbon();
  initStatusBar();
  initLayers();
  initContextMenu(canvasEl);

  document.addEventListener('status:zoom', (e) => { canvasZoom = e.detail; applyZoom(); });
  document.addEventListener('status:present', () => switchMode('player'));
  document.addEventListener('layers:select', (e) => {
    selectedElementId = e.detail;
    setRibbonSelection(selectedElementId);
    renderRibbon(); renderCanvas(); renderProperties();
  });

  document.addEventListener('presenter:addslide', () => addSlideQuick());
  document.addEventListener('presenter:duplicateslide', () => duplicateSlide());
  document.addEventListener('presenter:deleteslide', () => deleteSlide());
  document.addEventListener('presenter:moveslide', (e) => moveSlide(e.detail));
  document.addEventListener('presenter:deleteelement', () => deleteElement());
  document.addEventListener('presenter:undo', () => undo());
  document.addEventListener('presenter:redo', () => redo());

  document.addEventListener('presenter:copy', () => copyElement());
  document.addEventListener('presenter:cut', () => cutElement());
  document.addEventListener('presenter:paste', () => pasteElement());
  document.addEventListener('presenter:nudge', (e) => nudgeElement(e.detail));
  document.addEventListener('presenter:selectall', () => selectAllElements());

  document.addEventListener('view:toggle-grid', () => toggleGrid());
  document.addEventListener('view:toggle-rulers', () => toggleRulers());
  document.addEventListener('view:zoom', (e) => adjustZoom(e.detail));
  document.addEventListener('view:zoom-fit', () => { canvasZoom = 100; applyZoom(); });
  document.addEventListener('view:slide-sorter', () => toggleSlideSorter());
  document.addEventListener('view:toggle-properties', () => {
    propertiesEl.hidden = !propertiesEl.hidden;
  });
  document.addEventListener('view:toggle-layers', () => toggleLayersPanel());
  document.addEventListener('view:slide-bg', () => {
    selectedElementId = null; renderCanvas(); renderProperties();
  });
  document.addEventListener('format:bring-front', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el) { el.zIndex = Math.max(...slide.elements.map(e => e.zIndex || 0)) + 1; save(); renderCanvas(); }
  });
  document.addEventListener('format:send-back', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el) { el.zIndex = Math.min(...slide.elements.map(e => e.zIndex || 0)) - 1; save(); renderCanvas(); }
  });
  document.addEventListener('format:align-h-center', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el) { el.x = (100 - el.width) / 2; save(); renderCanvas(); }
  });
  document.addEventListener('format:align-v-center', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el) { el.y = (100 - el.height) / 2; save(); renderCanvas(); }
  });
  document.addEventListener('format:lock', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el) { el.locked = !el.locked; save(); renderCanvas(); renderProperties(); }
  });
  document.addEventListener('slide:aspect', (e) => setAspectRatio(e.detail));
  document.addEventListener('slide:numbers', () => {
    const state = getState();
    state.active.showSlideNumbers = !state.active.showSlideNumbers;
    save();
  });
  document.addEventListener('slide:apply-template', () => openTemplatePanel('apply'));

  document.addEventListener('ribbon:add-text', () => addTextElement());
  document.addEventListener('ribbon:add-image', () => addImageElement());
  document.addEventListener('ribbon:add-shape', () => addShapeElement());
  document.addEventListener('ribbon:add-code', () => addCodeElement());
  document.addEventListener('ribbon:edit-code', () => {
    const slide = getCurrentSlide();
    const el = slide?.elements.find(e => e.id === selectedElementId);
    if (el && el.type === 'code') openCodeEditor(el);
  });
  document.addEventListener('ribbon:duplicate', () => duplicateElement());
  document.addEventListener('ribbon:delete', () => deleteElement());
  document.addEventListener('ribbon:updated', () => renderEditor());
  document.addEventListener('ribbon:set-last-template', (e) => { lastTemplateIndex = e.detail; });

  canvasEl.addEventListener('mousedown', handleCanvasMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  canvasEl.addEventListener('dblclick', handleCanvasDblClick);
  setupDragAndDrop();

  setTimeout(() => saveUndoState(), 100);
}

export function renderEditor() {
  const state = getState();
  if (!state.active) return;
  renderSlideList();
  renderCanvas();
  renderToolbar();
  renderProperties();
  setRibbonSelection(selectedElementId);
  renderRibbon();
  renderStatusBar();
  setLayersSelection(selectedElementId);
  renderLayers();
}

// === SLIDE LIST ===
function renderSlideList() {
  const state = getState();
  const slides = state.active.slides;

  slideListEl.innerHTML = slides.map((slide, i) => `
    <div class="slide-item ${i === state.currentSlideIndex ? 'active' : ''}"
         data-index="${i}" draggable="true">
      <span class="slide-number">${i + 1}</span>
      <div class="slide-thumb" ${getSlideBackgroundAttr(slide, state.active.theme)}>
        ${renderThumbElements(slide.elements)}
      </div>
    </div>
  `).join('');

  slideListEl.querySelectorAll('.slide-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedElementId = null;
      setCurrentSlideIndex(parseInt(item.dataset.index));
    });
  });
}

function getSlideBackgroundAttr(slide, theme) {
  const bg = slide.background;
  if (!bg || bg.type === 'theme') return `data-theme="${theme}"`;
  if (bg.type === 'color') return `style="background:${bg.value}"`;
  if (bg.type === 'gradient') return `style="background:${bg.value}"`;
  if (bg.type === 'image') return `style="background:url(${bg.value}) center/cover"`;
  return `data-theme="${theme}"`;
}

function getSlideBackgroundStyle(slide, theme) {
  const bg = slide.background;
  if (!bg || bg.type === 'theme') return '';
  if (bg.type === 'color') return `background:${bg.value};`;
  if (bg.type === 'gradient') return `background:${bg.value};`;
  if (bg.type === 'image') return `background:url(${bg.value}) center/cover no-repeat;`;
  return '';
}

function renderThumbElements(elements) {
  return elements.map(el => {
    if (el.type === 'text') {
      return `<div class="thumb-el" style="left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;font-size:3px;text-align:${el.textAlign};opacity:${el.opacity}">${(el.content || '').substring(0, 30)}</div>`;
    }
    return `<div class="thumb-el thumb-img" style="left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;opacity:${el.opacity}">${el.content ? '&#128444;' : ''}</div>`;
  }).join('');
}

// === CANVAS ===
function renderCanvas() {
  const state = getState();
  const slide = getCurrentSlide();
  if (!slide) {
    canvasEl.innerHTML = '<div class="empty-state"><h2>No slides</h2><p>Add a slide to get started</p></div>';
    return;
  }

  const theme = state.active.theme;
  const bgStyle = getSlideBackgroundStyle(slide, theme);
  const themeAttr = (!slide.background || slide.background.type === 'theme') ? `data-theme="${theme}"` : '';

  const ar = getAspectRatioCSS();
  canvasEl.innerHTML = `
    <div class="slide-preview ${showGrid ? 'show-grid' : ''}" ${themeAttr} style="${bgStyle}aspect-ratio:${ar};" id="slide-stage">
      ${slide.elements.map(el => renderElement(el)).join('')}
      <div class="alignment-guides"></div>
    </div>
  `;

  const stage = document.getElementById('slide-stage');
  if (stage) initGuides(stage);
}

function renderElement(el) {
  const selected = el.id === selectedElementId ? 'selected' : '';
  const locked = el.locked ? 'locked' : '';
  let style = `left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;opacity:${el.opacity};z-index:${el.zIndex};`;

  if (el.rotation) style += `transform:rotate(${el.rotation}deg);`;
  if (el.backgroundColor) style += `background-color:${el.backgroundColor};`;
  if (el.borderWidth) style += `border:${el.borderWidth}px ${el.borderStyle} ${el.borderColor};`;
  if (el.borderRadius) style += `border-radius:${el.borderRadius}px;`;
  if (el.shadowEnabled) style += `box-shadow:${el.shadowX}px ${el.shadowY}px ${el.shadowBlur}px ${el.shadowColor};`;

  if (el.type === 'text') {
    const vAlign = el.verticalAlign || 'top';
    const justifyContent = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';
    const wrapStyle = `justify-content:${justifyContent};`;
    let textStyle = `font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.textAlign};font-family:'${el.fontFamily}',sans-serif;letter-spacing:${el.letterSpacing}px;line-height:${el.lineHeight};text-transform:${el.textTransform};`;
    if (el.fontColor) textStyle += `color:${el.fontColor};`;
    if (el.textShadow) textStyle += `text-shadow:2px 2px 4px rgba(0,0,0,0.5);`;

    loadFont(el.fontFamily);

    return `
      <div class="canvas-element ${selected} ${locked}" data-id="${el.id}" style="${style}">
        <div class="element-content text-wrap" style="${wrapStyle}">
          <div class="text-element" style="${textStyle}">${el.content}</div>
        </div>
        ${selected ? renderHandles() : ''}
      </div>`;
  }

  if (el.type === 'code') {
    return `
      <div class="canvas-element ${selected} ${locked}" data-id="${el.id}" style="${style}">
        <div class="element-content code-element" data-code-id="${el.id}" data-lang="${el.language || 'javascript'}" data-theme="${el.codeTheme || 'vs-dark'}">
          <pre class="code-preview">${escapeHtml(el.content || '')}</pre>
        </div>
        ${selected ? renderHandles() : ''}
      </div>`;
  }

  return `
    <div class="canvas-element ${selected} ${locked}" data-id="${el.id}" style="${style}">
      <div class="element-content image-element">
        ${el.content ? `<img src="${el.content}" style="object-fit:${el.objectFit}" draggable="false" alt="">` : '<div class="image-placeholder">Double-click to add image</div>'}
      </div>
      ${selected ? renderHandles() : ''}
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHandles() {
  return `
    <div class="resize-handle nw" data-handle="nw"></div>
    <div class="resize-handle ne" data-handle="ne"></div>
    <div class="resize-handle sw" data-handle="sw"></div>
    <div class="resize-handle se" data-handle="se"></div>
    <div class="resize-handle n" data-handle="n"></div>
    <div class="resize-handle s" data-handle="s"></div>
    <div class="resize-handle e" data-handle="e"></div>
    <div class="resize-handle w" data-handle="w"></div>
  `;
}

// === TOOLBAR ===
function renderToolbar() {
  const state = getState();
  if (!state.active) return;
  const pres = state.active;

  toolbarEl.innerHTML = `
    <div class="toolbar-group">
      <button class="btn" data-action="add-slide">+ Slide</button>
      <button class="btn" data-action="duplicate-slide">Duplicate</button>
      <button class="btn btn-danger" data-action="delete-slide">Delete</button>
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-group">
      <button class="btn" data-action="add-text">+ Text</button>
      <button class="btn" data-action="add-image">+ Image</button>
      <button class="btn" data-action="add-code">+ Code</button>
      <button class="btn" data-action="add-shape">+ Shape</button>
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-group">
      <label>Theme:
        <select data-prop="theme">
          ${['dark','light','ocean','sunset','forest','royal','minimal','magenta'].map(t =>
            `<option value="${t}" ${pres.theme === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </label>
      <label>Transition:
        <select data-prop="transition">
          ${['fade','slide','zoom','flip','cover','push','none'].map(t =>
            `<option value="${t}" ${pres.transition === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </label>
    </div>
    <div class="toolbar-group toolbar-right">
      <button class="btn" data-action="export">Export</button>
      <label class="btn import-label">Import<input type="file" accept=".json" data-action="import" hidden></label>
      <button class="btn btn-primary" data-action="present">&#9654; Present</button>
    </div>
  `;

  toolbarEl.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleToolbarClick(btn.dataset.action));
  });
  toolbarEl.querySelector('[data-prop="theme"]').addEventListener('change', (e) => {
    state.active.theme = e.target.value;
    save(); renderCanvas(); renderSlideList();
  });
  toolbarEl.querySelector('[data-prop="transition"]').addEventListener('change', (e) => {
    state.active.transition = e.target.value; save();
  });
  toolbarEl.querySelector('[data-action="import"]')?.addEventListener('change', handleImport);
}

function handleToolbarClick(action) {
  switch (action) {
    case 'add-slide': addSlideQuick(); break;
    case 'duplicate-slide': duplicateSlide(); break;
    case 'delete-slide': deleteSlide(); break;
    case 'add-text': addTextElement(); break;
    case 'add-image': addImageElement(); break;
    case 'add-shape': addShapeElement(); break;
    case 'add-code': addCodeElement(); break;
    case 'present': switchMode('player'); break;
    case 'export': exportPresentation(getState().active); break;
  }
}

function addSlideQuick() {
  saveUndoState();
  const state = getState();
  if (!state.active) return;
  const tpl = TEMPLATES[lastTemplateIndex] || TEMPLATES[0];
  const slide = createSlide(tpl.build());
  state.active.slides.splice(state.currentSlideIndex + 1, 0, slide);
  state.currentSlideIndex++;
  selectedElementId = null;
  save(); renderEditor();
}

// === TEMPLATE PANEL ===
// mode: 'add' = add new slide, 'apply' = replace current slide content
let templatePanelMode = 'add';

function openTemplatePanel(mode = 'add') {
  templatePanelMode = mode;
  templatePanelOpen = true;
  let panel = document.getElementById('template-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'template-panel';
    panel.className = 'floating-panel';
    document.getElementById('editor').appendChild(panel);
  }
  const custom = getCustomTemplates();
  const title = mode === 'apply' ? 'Apply Layout to This Slide' : 'Add New Slide from Template';
  panel.innerHTML = `
    <h3>${title}</h3>
    <div class="template-grid">
      ${TEMPLATES.map((t, i) => `
        <button class="template-item ${i === lastTemplateIndex ? 'last-used' : ''}" data-tpl="${i}">
          <span class="template-icon">${t.icon}</span>
          <span class="template-name">${t.name}</span>
        </button>
      `).join('')}
    </div>
    ${custom.length ? `
      <h3 style="margin-top:16px">Saved Templates</h3>
      <div class="template-grid">
        ${custom.map(t => `
          <button class="template-item custom-tpl" data-custom-id="${t.id}">
            <span class="template-icon">&#9733;</span>
            <span class="template-name">${t.name}</span>
            <span class="tpl-delete" data-delete-id="${t.id}" title="Delete">&times;</span>
          </button>
        `).join('')}
      </div>
    ` : ''}
  `;
  panel.hidden = false;

  panel.querySelectorAll('[data-tpl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.tpl);
      lastTemplateIndex = idx;
      if (templatePanelMode === 'apply') {
        applyTemplateToCurrentSlide(idx);
      } else {
        addSlideFromBuiltinTemplate(idx);
      }
      closeTemplatePanel();
    });
  });
  panel.querySelectorAll('[data-custom-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('[data-delete-id]')) return;
      const id = btn.dataset.customId;
      if (templatePanelMode === 'apply') {
        applyCustomTemplateToCurrentSlide(id);
      } else {
        addSlideFromCustomTemplate(id);
      }
      closeTemplatePanel();
    });
  });
  panel.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomTemplate(btn.dataset.deleteId);
      openTemplatePanel(templatePanelMode);
    });
  });

  setTimeout(() => {
    const handler = (e) => {
      const p = document.getElementById('template-panel');
      if (p && !p.contains(e.target)) closeTemplatePanel();
    };
    document.addEventListener('mousedown', handler, { once: true });
  }, 50);
}

function toggleTemplatePanel() {
  if (templatePanelOpen) {
    closeTemplatePanel();
  } else {
    openTemplatePanel('add');
  }
}

function closeTemplatePanel() {
  templatePanelOpen = false;
  const panel = document.getElementById('template-panel');
  if (panel) panel.hidden = true;
}

function applyTemplateToCurrentSlide(index) {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const tpl = TEMPLATES[index] || TEMPLATES[0];
  slide.elements = tpl.build();
  selectedElementId = null;
  save(); renderEditor();
}

function applyCustomTemplateToCurrentSlide(id) {
  saveUndoState();
  const custom = getCustomTemplates();
  const tpl = custom.find(t => t.id === id);
  if (!tpl) return;
  const slide = getCurrentSlide();
  if (!slide) return;
  slide.elements = tpl.elements.map(el => ({ ...el, id: crypto.randomUUID() }));
  if (tpl.background) slide.background = { ...tpl.background };
  selectedElementId = null;
  save(); renderEditor();
}

function addSlideFromBuiltinTemplate(index) {
  saveUndoState();
  const state = getState();
  if (!state.active) return;
  const tpl = TEMPLATES[index] || TEMPLATES[0];
  const slide = createSlide(tpl.build());
  state.active.slides.splice(state.currentSlideIndex + 1, 0, slide);
  state.currentSlideIndex++;
  selectedElementId = null;
  save(); renderEditor();
}

function addSlideFromCustomTemplate(id) {
  saveUndoState();
  const custom = getCustomTemplates();
  const tpl = custom.find(t => t.id === id);
  if (!tpl) return;
  const state = getState();
  const elements = tpl.elements.map(el => ({ ...el, id: crypto.randomUUID() }));
  const slide = createSlide(elements, tpl.background);
  state.active.slides.splice(state.currentSlideIndex + 1, 0, slide);
  state.currentSlideIndex++;
  selectedElementId = null;
  save(); renderEditor();
}

// === PROPERTIES PANEL ===
function renderProperties() {
  const slide = getCurrentSlide();
  if (!slide) {
    propertiesEl.innerHTML = '<div class="props-empty">No slide selected</div>';
    return;
  }

  let html = '';

  if (!selectedElementId) {
    // Show SLIDE properties when no element selected
    html += renderSlideProperties(slide);
  } else {
    const el = slide.elements.find(e => e.id === selectedElementId);
    if (!el) {
      html += renderSlideProperties(slide);
    } else {
      if (el.type === 'text') {
        html += renderTextProperties(el);
      } else {
        html += renderImageProperties(el);
      }
      html += renderStyleProperties(el);
      html += renderPositionProperties(el);
      html += `
        <div class="props-actions">
          <button class="btn btn-sm" data-action="bring-front">&#8593; Front</button>
          <button class="btn btn-sm" data-action="send-back">&#8595; Back</button>
          <button class="btn btn-sm" data-action="lock">${el.locked ? '&#128275; Unlock' : '&#128274; Lock'}</button>
          <button class="btn btn-sm" data-action="duplicate-el">&#9851; Clone</button>
          <button class="btn btn-sm btn-danger" data-action="delete-element">&#128465; Delete</button>
        </div>
      `;
    }
  }

  propertiesEl.innerHTML = html;
  attachAllListeners();
}

function renderSlideProperties(slide) {
  const state = getState();
  const bg = slide.background || { type: 'theme', value: '' };
  const presetGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
    'linear-gradient(135deg, #ff0084 0%, #33001b 100%)',
    'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
    'linear-gradient(135deg, #000428 0%, #004e92 100%)',
    'linear-gradient(135deg, #fffbd5 0%, #b20a2c 100%)',
  ];

  return `
    <h3>Slide Properties</h3>
    <div class="slide-info">Slide ${state.currentSlideIndex + 1} of ${state.active.slides.length}</div>
    <h3>Background</h3>
    <div class="bg-type-tabs">
      <button class="bg-tab ${bg.type === 'theme' ? 'active' : ''}" data-bg-type="theme">Theme</button>
      <button class="bg-tab ${bg.type === 'color' ? 'active' : ''}" data-bg-type="color">Color</button>
      <button class="bg-tab ${bg.type === 'gradient' ? 'active' : ''}" data-bg-type="gradient">Gradient</button>
      <button class="bg-tab ${bg.type === 'image' ? 'active' : ''}" data-bg-type="image">Image</button>
    </div>
    ${bg.type === 'color' ? `
      <label>Color:<input type="color" data-bg-field="value" value="${bg.value || '#1a1a2e'}"></label>
    ` : ''}
    ${bg.type === 'gradient' ? `
      <div class="gradient-presets">
        ${presetGradients.map(g => `<div class="gradient-swatch" data-gradient="${g}" style="background:${g}"></div>`).join('')}
      </div>
      <label>Custom:<input type="text" data-bg-field="value" value="${bg.value || ''}" placeholder="linear-gradient(...)"></label>
    ` : ''}
    ${bg.type === 'image' ? `
      <label>Image URL:<input type="text" data-bg-field="value" value="${bg.value || ''}" placeholder="https://..."></label>
    ` : ''}
    <h3>Speaker Notes</h3>
    <textarea data-slide-field="notes" rows="4" placeholder="Speaker notes (press N during presentation to show)...">${slide.notes || ''}</textarea>
    <h3>Layout Templates</h3>
    <button class="btn btn-full" data-action="apply-template">Apply Template to This Slide</button>
    <button class="btn btn-full" data-action="save-template" style="margin-top:4px">Save Slide as Template</button>
  `;
}

function renderTextProperties(el) {
  const vAlign = el.verticalAlign || 'top';
  return `
    <h3>Text</h3>
    <label>Content:<textarea data-field="content" rows="3">${el.content}</textarea></label>
    <div class="inline-format-hint">Double-click to edit inline. Select text for formatting toolbar.</div>
    <label class="font-picker-label">Font:
      <div class="font-picker">
        <input type="text" class="font-search" value="${el.fontFamily}" data-field="fontFamily" placeholder="Search fonts..." autocomplete="off">
        <div class="font-dropdown" hidden></div>
      </div>
    </label>
    <label>Size:<div class="range-row"><input type="range" data-field="fontSize" min="8" max="200" value="${el.fontSize}"><span class="range-val">${el.fontSize}px</span></div></label>
    <label>Weight:
      <select data-field="fontWeight">
        ${['300','normal','500','600','bold','800','900'].map(w => `<option value="${w}" ${el.fontWeight === w ? 'selected' : ''}>${w}</option>`).join('')}
      </select>
    </label>
    <label>H-Align:
      <div class="btn-group" data-group="textAlign">
        <button class="btn btn-sm ${el.textAlign === 'left' ? 'btn-active' : ''}" data-align-val="left" title="Left">&#9664;</button>
        <button class="btn btn-sm ${el.textAlign === 'center' ? 'btn-active' : ''}" data-align-val="center" title="Center">&#9644;</button>
        <button class="btn btn-sm ${el.textAlign === 'right' ? 'btn-active' : ''}" data-align-val="right" title="Right">&#9654;</button>
      </div>
    </label>
    <label>V-Align:
      <div class="btn-group" data-group="verticalAlign">
        <button class="btn btn-sm ${vAlign === 'top' ? 'btn-active' : ''}" data-valign-val="top" title="Top">&#9650;</button>
        <button class="btn btn-sm ${vAlign === 'middle' ? 'btn-active' : ''}" data-valign-val="middle" title="Middle">&#9644;</button>
        <button class="btn btn-sm ${vAlign === 'bottom' ? 'btn-active' : ''}" data-valign-val="bottom" title="Bottom">&#9660;</button>
      </div>
    </label>
    <label>Color:<input type="color" data-field="fontColor" value="${el.fontColor || '#ffffff'}"><button class="btn btn-xs clear-color" data-clear="fontColor">Reset</button></label>
    <label>Letter Spacing:<div class="range-row"><input type="range" data-field="letterSpacing" min="-5" max="20" step="0.5" value="${el.letterSpacing}"><span class="range-val">${el.letterSpacing}px</span></div></label>
    <label>Line Height:<div class="range-row"><input type="range" data-field="lineHeight" min="0.8" max="3" step="0.1" value="${el.lineHeight}"><span class="range-val">${el.lineHeight}</span></div></label>
    <label>Transform:
      <select data-field="textTransform">
        <option value="none" ${el.textTransform === 'none' ? 'selected' : ''}>None</option>
        <option value="uppercase" ${el.textTransform === 'uppercase' ? 'selected' : ''}>UPPERCASE</option>
        <option value="lowercase" ${el.textTransform === 'lowercase' ? 'selected' : ''}>lowercase</option>
        <option value="capitalize" ${el.textTransform === 'capitalize' ? 'selected' : ''}>Capitalize</option>
      </select>
    </label>
    <label class="checkbox-label"><input type="checkbox" data-field="textShadow" ${el.textShadow ? 'checked' : ''}> Text Shadow</label>
    <h3>Link</h3>
    <label>Element Link (opens on click in presentation):<input type="text" data-field="link" value="${el.link || ''}" placeholder="https://..."></label>
  `;
}

function renderImageProperties(el) {
  return `
    <h3>Image</h3>
    <label>URL:<input type="text" data-field="content" value="${el.content}" placeholder="https://..."></label>
    <label>Fit:
      <select data-field="objectFit">
        <option value="contain" ${el.objectFit === 'contain' ? 'selected' : ''}>Contain</option>
        <option value="cover" ${el.objectFit === 'cover' ? 'selected' : ''}>Cover</option>
        <option value="fill" ${el.objectFit === 'fill' ? 'selected' : ''}>Fill</option>
        <option value="none" ${el.objectFit === 'none' ? 'selected' : ''}>None (original)</option>
      </select>
    </label>
    <h3>Link</h3>
    <label>Element Link (opens on click in presentation):<input type="text" data-field="link" value="${el.link || ''}" placeholder="https://..."></label>
  `;
}

function renderStyleProperties(el) {
  return `
    <h3>Style</h3>
    <label>Background:<input type="color" data-field="backgroundColor" value="${el.backgroundColor || '#000000'}"><button class="btn btn-xs clear-color" data-clear="backgroundColor">Clear</button></label>
    <label>Opacity:<div class="range-row"><input type="range" data-field="opacity" min="0" max="1" step="0.05" value="${el.opacity}"><span class="range-val">${Math.round(el.opacity * 100)}%</span></div></label>
    <label>Rotation:<div class="range-row"><input type="range" data-field="rotation" min="-180" max="180" step="1" value="${el.rotation}"><span class="range-val">${el.rotation}&deg;</span></div></label>
    <label>Corner Radius:<div class="range-row"><input type="range" data-field="borderRadius" min="0" max="100" value="${el.borderRadius}"><span class="range-val">${el.borderRadius}px</span></div></label>
    <h3>Border</h3>
    <label>Width:<div class="range-row"><input type="range" data-field="borderWidth" min="0" max="20" value="${el.borderWidth}"><span class="range-val">${el.borderWidth}px</span></div></label>
    <label>Color:<input type="color" data-field="borderColor" value="${el.borderColor || '#ffffff'}"></label>
    <label>Style:
      <select data-field="borderStyle">
        <option value="solid" ${el.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
        <option value="dashed" ${el.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
        <option value="dotted" ${el.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
      </select>
    </label>
    <h3>Shadow</h3>
    <label class="checkbox-label"><input type="checkbox" data-field="shadowEnabled" ${el.shadowEnabled ? 'checked' : ''}> Enable Shadow</label>
    ${el.shadowEnabled ? `
      <label>Color:<input type="color" data-field="shadowColor" value="${rgbaToHex(el.shadowColor)}"></label>
      <label>Blur:<div class="range-row"><input type="range" data-field="shadowBlur" min="0" max="50" value="${el.shadowBlur}"><span class="range-val">${el.shadowBlur}px</span></div></label>
      <label>X:<div class="range-row"><input type="range" data-field="shadowX" min="-30" max="30" value="${el.shadowX}"><span class="range-val">${el.shadowX}px</span></div></label>
      <label>Y:<div class="range-row"><input type="range" data-field="shadowY" min="-30" max="30" value="${el.shadowY}"><span class="range-val">${el.shadowY}px</span></div></label>
    ` : ''}
  `;
}

function renderPositionProperties(el) {
  return `
    <h3>Position & Size</h3>
    <div class="props-grid">
      <label>X:<input type="number" data-field="x" value="${Math.round(el.x * 10) / 10}" min="0" max="100" step="0.5"></label>
      <label>Y:<input type="number" data-field="y" value="${Math.round(el.y * 10) / 10}" min="0" max="100" step="0.5"></label>
      <label>W:<input type="number" data-field="width" value="${Math.round(el.width * 10) / 10}" min="1" max="100" step="0.5"></label>
      <label>H:<input type="number" data-field="height" value="${Math.round(el.height * 10) / 10}" min="1" max="100" step="0.5"></label>
    </div>
    <h3>Animation</h3>
    <label>Enter Animation:
      <select data-field="animation">
        <option value="none" ${(el.animation || 'none') === 'none' ? 'selected' : ''}>None</option>
        <option value="fadeIn" ${el.animation === 'fadeIn' ? 'selected' : ''}>Fade In</option>
        <option value="slideUp" ${el.animation === 'slideUp' ? 'selected' : ''}>Slide Up</option>
        <option value="slideLeft" ${el.animation === 'slideLeft' ? 'selected' : ''}>Slide Left</option>
        <option value="scaleIn" ${el.animation === 'scaleIn' ? 'selected' : ''}>Scale In</option>
        <option value="bounceIn" ${el.animation === 'bounceIn' ? 'selected' : ''}>Bounce In</option>
        <option value="rotateIn" ${el.animation === 'rotateIn' ? 'selected' : ''}>Rotate In</option>
        <option value="typewriter" ${el.animation === 'typewriter' ? 'selected' : ''}>Typewriter</option>
      </select>
    </label>
    <label>Delay (ms):<input type="number" data-field="animationDelay" value="${el.animationDelay || 0}" min="0" max="5000" step="100"></label>
  `;
}

function rgbaToHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  return '#000000';
}

// === ATTACH ALL LISTENERS ===
function attachAllListeners() {
  const slide = getCurrentSlide();
  const el = slide?.elements.find(e => e.id === selectedElementId);

  // Background tabs
  propertiesEl.querySelectorAll('.bg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const s = getCurrentSlide();
      if (!s) return;
      s.background = { type: tab.dataset.bgType, value: '' };
      save(); renderEditor();
    });
  });

  // Background fields
  propertiesEl.querySelectorAll('[data-bg-field]').forEach(input => {
    input.addEventListener('input', () => {
      const s = getCurrentSlide();
      if (!s) return;
      s.background.value = input.value;
      save(); renderCanvas(); renderSlideList();
    });
  });

  // Gradient swatches
  propertiesEl.querySelectorAll('.gradient-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const s = getCurrentSlide();
      if (!s) return;
      s.background = { type: 'gradient', value: swatch.dataset.gradient };
      save(); renderEditor();
    });
  });

  // Speaker notes
  propertiesEl.querySelector('[data-slide-field="notes"]')?.addEventListener('input', (e) => {
    const s = getCurrentSlide();
    if (s) { s.notes = e.target.value; save(); }
  });

  // Apply template button
  propertiesEl.querySelector('[data-action="apply-template"]')?.addEventListener('click', () => {
    openTemplatePanel('apply');
  });

  // Save as template
  propertiesEl.querySelector('[data-action="save-template"]')?.addEventListener('click', () => {
    const s = getCurrentSlide();
    if (!s) return;
    const name = prompt('Template name:', `Custom ${new Date().toLocaleDateString()}`);
    if (!name) return;
    saveCustomTemplate(name, s.elements, s.background);
    toast('Template saved!');
  });

  if (!el) return;

  // Data fields
  propertiesEl.querySelectorAll('[data-field]').forEach(input => {
    const event = (input.type === 'range' || input.type === 'color') ? 'input' : 'change';
    input.addEventListener(event, () => {
      updateField(el, input);
    });
    if (input.type === 'range') {
      input.addEventListener('input', () => updateRangeLabel(input));
    }
  });

  // Horizontal align buttons
  propertiesEl.querySelectorAll('[data-align-val]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      el.textAlign = btn.dataset.alignVal;
      save(); renderCanvas(); renderProperties();
    });
  });

  // Vertical align buttons
  propertiesEl.querySelectorAll('[data-valign-val]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      el.verticalAlign = btn.dataset.valignVal;
      save(); renderCanvas(); renderProperties();
    });
  });

  // Clear color buttons
  propertiesEl.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      el[btn.dataset.clear] = '';
      save(); renderCanvas(); renderProperties();
    });
  });

  // Action buttons
  propertiesEl.querySelector('[data-action="delete-element"]')?.addEventListener('click', deleteElement);
  propertiesEl.querySelector('[data-action="bring-front"]')?.addEventListener('click', () => changeZIndex(el, 1));
  propertiesEl.querySelector('[data-action="send-back"]')?.addEventListener('click', () => changeZIndex(el, -1));
  propertiesEl.querySelector('[data-action="lock"]')?.addEventListener('click', () => { el.locked = !el.locked; save(); renderProperties(); renderCanvas(); });
  propertiesEl.querySelector('[data-action="duplicate-el"]')?.addEventListener('click', duplicateElement);

  // Font search
  setupFontSearch(el);
}

function updateRangeLabel(input) {
  const row = input.closest('.range-row');
  if (!row) return;
  const val = row.querySelector('.range-val');
  if (!val) return;
  const field = input.dataset.field;
  if (field === 'opacity') val.textContent = `${Math.round(input.value * 100)}%`;
  else if (field === 'rotation') val.textContent = `${input.value}°`;
  else if (field === 'lineHeight') val.textContent = input.value;
  else val.textContent = `${input.value}px`;
}

let undoFieldTimer = null;
function updateField(el, input) {
  const field = input.dataset.field;
  let value;

  if (input.type === 'checkbox') {
    value = input.checked;
  } else if (['x','y','width','height','fontSize','letterSpacing','lineHeight','opacity','rotation','borderWidth','borderRadius','shadowBlur','shadowX','shadowY','zIndex'].includes(field)) {
    value = parseFloat(input.value);
    if (isNaN(value)) return;
  } else {
    value = input.value;
  }

  // Debounced undo save — captures state once per burst of changes
  if (!undoFieldTimer) {
    saveUndoState();
  }
  clearTimeout(undoFieldTimer);
  undoFieldTimer = setTimeout(() => { undoFieldTimer = null; }, 1000);

  el[field] = value;
  save();
  renderCanvas();
  renderSlideList();

  if (field === 'shadowEnabled') renderProperties();
}

// === FONT SEARCH ===
function setupFontSearch(el) {
  const searchInput = propertiesEl.querySelector('.font-search');
  const dropdown = propertiesEl.querySelector('.font-dropdown');
  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('focus', () => {
    showFontDropdown(searchInput, dropdown, '');
  });

  searchInput.addEventListener('input', () => {
    showFontDropdown(searchInput, dropdown, searchInput.value);
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.hidden = true; }, 200);
  });
}

function showFontDropdown(input, dropdown, query) {
  const filtered = FONT_LIST.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) || f.category.includes(query.toLowerCase())
  ).slice(0, 25);

  dropdown.innerHTML = filtered.map(f => `
    <div class="font-option" data-font="${f.name}" style="font-family:'${f.name}',sans-serif">
      ${f.name} <span class="font-cat">${f.category}</span>
    </div>
  `).join('');

  dropdown.hidden = false;
  filtered.forEach(f => loadFont(f.name));

  dropdown.querySelectorAll('.font-option').forEach(opt => {
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const fontName = opt.dataset.font;
      input.value = fontName;
      dropdown.hidden = true;
      const slide = getCurrentSlide();
      const el = slide?.elements.find(e => e.id === selectedElementId);
      if (el) {
        el.fontFamily = fontName;
        loadFont(fontName);
        save(); renderCanvas();
      }
    });
  });
}

// === CANVAS INTERACTION ===
function handleCanvasMouseDown(e) {
  const handle = e.target.closest('.resize-handle');
  const element = e.target.closest('.canvas-element');
  const stage = document.getElementById('slide-stage');
  if (!stage) return;

  if (handle && selectedElementId) {
    e.preventDefault();
    const stageRect = stage.getBoundingClientRect();
    const el = getCurrentSlide()?.elements.find(el => el.id === selectedElementId);
    if (!el || el.locked) return;

    dragState = {
      type: 'resize',
      handle: handle.dataset.handle,
      startX: e.clientX,
      startY: e.clientY,
      stageRect,
      origX: el.x, origY: el.y,
      origW: el.width, origH: el.height
    };
  } else if (element) {
    const id = element.dataset.id;
    const el = getCurrentSlide()?.elements.find(el => el.id === id);
    if (!el) return;

    if (id !== selectedElementId) {
      // First click: select the element and show ribbon immediately
      selectedElementId = id;
      setRibbonSelection(selectedElementId);
      renderRibbon();
      renderCanvas();
      renderProperties();
    }

    if (el.type === 'text' && id === selectedElementId) {
      const textEl = element.querySelector('.text-element');
      if (textEl && textEl.contentEditable === 'true') {
        return;
      }
    }

    if (el.locked) return;
    e.preventDefault();
    const stageRect = stage.getBoundingClientRect();
    dragState = {
      type: 'move',
      startX: e.clientX, startY: e.clientY,
      stageRect, origX: el.x, origY: el.y,
      moved: false
    };
  } else if (e.target.closest('.slide-preview') && !element) {
    selectedElementId = null;
    setRibbonSelection(null);
    renderRibbon();
    renderCanvas();
    renderProperties();
  }
}

function handleMouseMove(e) {
  if (!dragState) return;

  const pixelDx = Math.abs(e.clientX - dragState.startX);
  const pixelDy = Math.abs(e.clientY - dragState.startY);

  // Drag threshold — 3px before starting move (prevents accidental drags on click)
  if (!dragState.moved && dragState.type === 'move' && pixelDx < 3 && pixelDy < 3) {
    return;
  }
  dragState.moved = true;
  e.preventDefault();

  const slide = getCurrentSlide();
  if (!slide) return;
  const el = slide.elements.find(el => el.id === selectedElementId);
  if (!el) return;

  const dx = ((e.clientX - dragState.startX) / dragState.stageRect.width) * 100;
  const dy = ((e.clientY - dragState.startY) / dragState.stageRect.height) * 100;

  if (dragState.type === 'move') {
    el.x = clamp(dragState.origX + dx, 0, 100 - el.width);
    el.y = clamp(dragState.origY + dy, 0, 100 - el.height);

    const { snapX, snapY } = showGuides(el, slide.elements, dragState.stageRect);
    if (snapX !== null) el.x = snapX;
    if (snapY !== null) el.y = snapY;
  } else if (dragState.type === 'resize') {
    applyResize(el, dragState, dx, dy);
    showGuides(el, slide.elements, dragState.stageRect);
  }

  renderCanvas();
}

function handleMouseUp(e) {
  if (dragState) {
    const wasMoved = dragState.moved;
    const wasMove = dragState.type === 'move';

    if (wasMoved) {
      saveUndoState();
    }
    dragState = null;
    hideGuides();

    if (wasMoved) {
      save(); renderSlideList(); renderProperties();
    } else if (wasMove && selectedElementId) {
      // Click without drag on already-selected text element → enter edit mode
      const slide = getCurrentSlide();
      const el = slide?.elements.find(el => el.id === selectedElementId);
      if (el && el.type === 'text') {
        const element = canvasEl.querySelector(`[data-id="${selectedElementId}"]`);
        if (element) enterTextEditMode(element, el);
      }
    }
  }
}

function applyResize(el, state, dx, dy) {
  const h = state.handle;
  let x = state.origX, y = state.origY, w = state.origW, ht = state.origH;

  if (h.includes('e')) w = Math.max(3, state.origW + dx);
  if (h.includes('w')) { w = Math.max(3, state.origW - dx); x = state.origX + (state.origW - w); }
  if (h.includes('s')) ht = Math.max(3, state.origH + dy);
  if (h.includes('n')) { ht = Math.max(3, state.origH - dy); y = state.origY + (state.origH - ht); }

  el.x = clamp(x, 0, 97);
  el.y = clamp(y, 0, 97);
  el.width = clamp(w, 3, 100 - el.x);
  el.height = clamp(ht, 3, 100 - el.y);
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function handleCanvasDblClick(e) {
  const element = e.target.closest('.canvas-element');
  if (!element) return;

  const id = element.dataset.id;
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = slide.elements.find(e => e.id === id);
  if (!el) return;

  if (el.type === 'text') {
    enterTextEditMode(element, el);
  } else if (el.type === 'code') {
    openCodeEditor(el);
  } else {
    const url = prompt('Enter image URL:', el.content || '');
    if (url !== null) {
      el.content = url;
      save(); renderCanvas(); renderSlideList(); renderProperties();
    }
  }
}

function openCodeEditor(el) {
  let overlay = document.getElementById('code-editor-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'code-editor-overlay';
    overlay.className = 'code-editor-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="code-editor-panel">
      <div class="code-editor-header">
        <select id="code-lang-select">
          ${CODE_LANGUAGES.map(l => `<option value="${l}" ${l === el.language ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select id="code-theme-select">
          ${CODE_THEMES.map(t => `<option value="${t.id}" ${t.id === el.codeTheme ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="code-editor-done">Done</button>
        <button class="btn" id="code-editor-cancel">Cancel</button>
      </div>
      <div id="code-editor-container"></div>
    </div>
  `;
  overlay.hidden = false;

  loadMonaco().then(() => {
    const container = document.getElementById('code-editor-container');
    const editor = createCodeEditor(container, 'overlay-editor', el.content, el.language, el.codeTheme, false);

    document.getElementById('code-lang-select').addEventListener('change', (e) => {
      const model = editor.getModel();
      monaco.editor.setModelLanguage(model, e.target.value);
    });

    document.getElementById('code-theme-select').addEventListener('change', (e) => {
      monaco.editor.setTheme(e.target.value);
    });

    document.getElementById('code-editor-done').addEventListener('click', () => {
      saveUndoState();
      el.content = editor.getValue();
      el.language = document.getElementById('code-lang-select').value;
      el.codeTheme = document.getElementById('code-theme-select').value;
      editor.dispose();
      overlay.hidden = true;
      save(); renderEditor();
    });

    document.getElementById('code-editor-cancel').addEventListener('click', () => {
      editor.dispose();
      overlay.hidden = true;
    });
  });
}

let activeEditEl = null;

function enterTextEditMode(element, el) {
  const contentEl = element.querySelector('.text-element');
  if (!contentEl || contentEl.contentEditable === 'true') return;

  activeEditEl = contentEl;
  contentEl.contentEditable = 'true';
  contentEl.focus();

  // Place cursor at click position (browser handles this naturally)
  contentEl.addEventListener('mouseup', showFormatToolbar);
  contentEl.addEventListener('keyup', showFormatToolbar);

  const finishEdit = () => {
    contentEl.contentEditable = 'false';
    activeEditEl = null;
    el.content = contentEl.innerHTML;
    hideFormatToolbar();
    saveUndoState();
    save(); renderSlideList(); renderProperties();
    contentEl.removeEventListener('blur', finishEdit);
    contentEl.removeEventListener('keydown', editKeys);
    contentEl.removeEventListener('mouseup', showFormatToolbar);
    contentEl.removeEventListener('keyup', showFormatToolbar);
  };
  const editKeys = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); contentEl.blur(); }
  };
  contentEl.addEventListener('blur', finishEdit);
  contentEl.addEventListener('keydown', editKeys);
}

// === INLINE FORMATTING TOOLBAR ===
function showFormatToolbar() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    hideFormatToolbar();
    return;
  }

  let toolbar = document.getElementById('format-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'format-toolbar';
    toolbar.className = 'format-toolbar';
    document.body.appendChild(toolbar);
  }

  toolbar.innerHTML = `
    <button data-cmd="bold" title="Bold"><b>B</b></button>
    <button data-cmd="italic" title="Italic"><i>I</i></button>
    <button data-cmd="underline" title="Underline"><u>U</u></button>
    <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
    <span class="fmt-sep"></span>
    <button data-cmd="foreColor" title="Text Color">&#127912;</button>
    <button data-cmd="fontSize-up" title="Increase Size">A&#8593;</button>
    <button data-cmd="fontSize-down" title="Decrease Size">A&#8595;</button>
    <span class="fmt-sep"></span>
    <button data-cmd="createLink" title="Add Link">&#128279;</button>
    <button data-cmd="unlink" title="Remove Link">&#10060;</button>
    <input type="color" class="fmt-color-picker" value="#ff0000" title="Pick color">
  `;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  toolbar.style.top = `${rect.top - 44 + window.scrollY}px`;
  toolbar.style.left = `${rect.left + rect.width / 2}px`;
  toolbar.hidden = false;

  toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.onmousedown = (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const url = prompt('Enter URL:', 'https://');
        if (url) document.execCommand('createLink', false, url);
        // Make links open in new tab
        const links = document.querySelectorAll('[contenteditable="true"] a');
        links.forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
      } else if (cmd === 'foreColor') {
        const colorInput = toolbar.querySelector('.fmt-color-picker');
        colorInput.click();
      } else if (cmd === 'fontSize-up') {
        document.execCommand('fontSize', false, '5');
      } else if (cmd === 'fontSize-down') {
        document.execCommand('fontSize', false, '2');
      } else {
        document.execCommand(cmd, false, null);
      }
    };
  });

  const colorPicker = toolbar.querySelector('.fmt-color-picker');
  colorPicker.addEventListener('input', (e) => {
    document.execCommand('foreColor', false, e.target.value);
  });
}

function hideFormatToolbar() {
  const toolbar = document.getElementById('format-toolbar');
  if (toolbar) toolbar.hidden = true;
}

// === ELEMENT OPERATIONS ===
function addTextElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = createElement('text', {
    x: 15, y: 35, width: 70, height: 15,
    content: 'New Text', fontSize: 32, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', verticalAlign: 'middle'
  });
  slide.elements.push(el);
  selectedElementId = el.id;
  save(); renderEditor();
}

function addImageElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = createElement('image', {
    x: 25, y: 15, width: 50, height: 60,
    content: '', objectFit: 'contain'
  });
  slide.elements.push(el);
  selectedElementId = el.id;
  save(); renderEditor();
}

function addShapeElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = createElement('text', {
    x: 30, y: 30, width: 20, height: 30,
    content: '', fontSize: 1, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter',
    backgroundColor: 'rgba(124, 92, 252, 0.3)', borderRadius: 8, borderWidth: 2, borderColor: '#7c5cfc'
  });
  slide.elements.push(el);
  selectedElementId = el.id;
  save(); renderEditor();
}

function addCodeElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = createElement('code', {
    x: 10, y: 15, width: 80, height: 65,
    content: '// Your code here\nfunction hello(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(hello("World"));',
    language: 'javascript',
    codeTheme: 'vs-dark',
    codeFontSize: 14,
    borderRadius: 8
  });
  slide.elements.push(el);
  selectedElementId = el.id;
  save(); renderEditor();
  loadMonaco();
}

function deleteElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide || !selectedElementId) return;
  slide.elements = slide.elements.filter(e => e.id !== selectedElementId);
  selectedElementId = null;
  save(); renderEditor();
}

function duplicateElement() {
  saveUndoState();
  const slide = getCurrentSlide();
  if (!slide || !selectedElementId) return;
  const el = slide.elements.find(e => e.id === selectedElementId);
  if (!el) return;
  const copy = { ...el, id: crypto.randomUUID(), x: el.x + 3, y: el.y + 3 };
  slide.elements.push(copy);
  selectedElementId = copy.id;
  save(); renderEditor();
}

function copyElement() {
  const slide = getCurrentSlide();
  if (!slide || !selectedElementId) return;
  const el = slide.elements.find(e => e.id === selectedElementId);
  if (!el) return;
  clipboard = JSON.parse(JSON.stringify(el));
  toast('Copied');
}

function cutElement() {
  const slide = getCurrentSlide();
  if (!slide || !selectedElementId) return;
  const el = slide.elements.find(e => e.id === selectedElementId);
  if (!el) return;
  saveUndoState();
  clipboard = JSON.parse(JSON.stringify(el));
  slide.elements = slide.elements.filter(e => e.id !== selectedElementId);
  selectedElementId = null;
  save(); renderEditor();
  toast('Cut');
}

function pasteElement() {
  if (!clipboard) return;
  const slide = getCurrentSlide();
  if (!slide) return;
  saveUndoState();
  const pasted = { ...JSON.parse(JSON.stringify(clipboard)), id: crypto.randomUUID(), x: clipboard.x + 3, y: clipboard.y + 3 };
  slide.elements.push(pasted);
  selectedElementId = pasted.id;
  save(); renderEditor();
  toast('Pasted');
}

function nudgeElement([dx, dy]) {
  const slide = getCurrentSlide();
  if (!slide || !selectedElementId) return;
  const el = slide.elements.find(e => e.id === selectedElementId);
  if (!el || el.locked) return;
  el.x = Math.max(0, Math.min(100 - el.width, el.x + dx));
  el.y = Math.max(0, Math.min(100 - el.height, el.y + dy));
  save(); renderCanvas(); renderSlideList();
}

function selectAllElements() {
  // For now, select first element (multi-select is complex)
  const slide = getCurrentSlide();
  if (!slide || !slide.elements.length) return;
  selectedElementId = slide.elements[0].id;
  setRibbonSelection(selectedElementId);
  renderRibbon();
  renderCanvas();
  renderProperties();
}

function changeZIndex(el, direction) {
  const slide = getCurrentSlide();
  if (!slide) return;
  const maxZ = Math.max(...slide.elements.map(e => e.zIndex || 0));
  const minZ = Math.min(...slide.elements.map(e => e.zIndex || 0));
  el.zIndex = direction > 0 ? maxZ + 1 : minZ - 1;
  save(); renderCanvas();
}

// === SLIDE OPERATIONS ===
function duplicateSlide() {
  saveUndoState();
  const state = getState();
  const slide = getCurrentSlide();
  if (!slide) return;
  const copy = {
    id: crypto.randomUUID(),
    elements: slide.elements.map(el => ({ ...el, id: crypto.randomUUID() })),
    background: { ...slide.background }
  };
  state.active.slides.splice(state.currentSlideIndex + 1, 0, copy);
  state.currentSlideIndex++;
  selectedElementId = null;
  save(); renderEditor();
}

function deleteSlide() {
  saveUndoState();
  const state = getState();
  if (!state.active || state.active.slides.length <= 1) return;
  state.active.slides.splice(state.currentSlideIndex, 1);
  if (state.currentSlideIndex >= state.active.slides.length) {
    state.currentSlideIndex = state.active.slides.length - 1;
  }
  selectedElementId = null;
  save(); renderEditor();
}

function moveSlide(direction) {
  const state = getState();
  if (!state.active) return;
  const newIndex = state.currentSlideIndex + direction;
  if (newIndex < 0 || newIndex >= state.active.slides.length) return;
  const slides = state.active.slides;
  [slides[state.currentSlideIndex], slides[newIndex]] = [slides[newIndex], slides[state.currentSlideIndex]];
  state.currentSlideIndex = newIndex;
  save(); renderEditor();
}

// === SLIDE LIST DRAG AND DROP ===
function setupDragAndDrop() {
  let dragIndex = null;

  slideListEl.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.slide-item');
    if (!item) return;
    dragIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  slideListEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.slide-item');
    if (!item) return;
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    item.classList.toggle('drop-above', e.clientY < midY);
    item.classList.toggle('drop-below', e.clientY >= midY);
  });

  slideListEl.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.slide-item');
    if (item) item.classList.remove('drop-above', 'drop-below');
  });

  slideListEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.slide-item');
    if (!item || dragIndex === null) return;
    const dropIndex = parseInt(item.dataset.index);
    const rect = item.getBoundingClientRect();
    const insertIndex = e.clientY < rect.top + rect.height / 2 ? dropIndex : dropIndex + 1;
    const state = getState();
    const [moved] = state.active.slides.splice(dragIndex, 1);
    const finalIndex = insertIndex > dragIndex ? insertIndex - 1 : insertIndex;
    state.active.slides.splice(finalIndex, 0, moved);
    state.currentSlideIndex = finalIndex;
    save(); renderEditor();
  });

  slideListEl.addEventListener('dragend', () => {
    dragIndex = null;
    slideListEl.querySelectorAll('.slide-item').forEach(el => {
      el.classList.remove('dragging', 'drop-above', 'drop-below');
    });
  });
}

// === VIEW FEATURES ===
let showGrid = false;
let showRulers = false;
let canvasZoom = 100;
let aspectRatio = '16:9';

function toggleGrid() {
  showGrid = !showGrid;
  const stage = document.getElementById('slide-stage');
  if (stage) stage.classList.toggle('show-grid', showGrid);
}

function toggleRulers() {
  showRulers = !showRulers;
  canvasEl.classList.toggle('show-rulers', showRulers);
}

function adjustZoom(delta) {
  canvasZoom = Math.max(50, Math.min(200, canvasZoom + delta));
  applyZoom();
}

function applyZoom() {
  const preview = document.getElementById('slide-stage');
  if (preview) preview.style.transform = `scale(${canvasZoom / 100})`;
}

function setAspectRatio(ratio) {
  aspectRatio = ratio;
  const state = getState();
  if (state.active) state.active.aspectRatio = ratio;
  save(); renderCanvas();
}

function getAspectRatioCSS() {
  const state = getState();
  const ratio = state.active?.aspectRatio || '16:9';
  if (ratio === '4:3') return '4/3';
  if (ratio === '1:1') return '1/1';
  return '16/9';
}

function toggleSlideSorter() {
  let sorter = document.getElementById('slide-sorter-overlay');
  if (sorter && !sorter.hidden) { sorter.hidden = true; return; }
  if (!sorter) {
    sorter = document.createElement('div');
    sorter.id = 'slide-sorter-overlay';
    sorter.className = 'slide-sorter-overlay';
    document.getElementById('editor').appendChild(sorter);
  }
  const state = getState();
  sorter.innerHTML = `
    <div class="sorter-header"><h3>Slide Sorter</h3><button class="btn" id="close-sorter">&times; Close</button></div>
    <div class="sorter-grid">
      ${state.active.slides.map((s, i) => `
        <div class="sorter-item ${i === state.currentSlideIndex ? 'current' : ''}" data-idx="${i}">
          <div class="sorter-thumb" ${getSlideBackgroundAttr(s, state.active.theme)}>${renderThumbElements(s.elements)}</div>
          <span class="sorter-num">${i + 1}</span>
        </div>
      `).join('')}
    </div>
  `;
  sorter.hidden = false;
  sorter.querySelector('#close-sorter').addEventListener('click', () => { sorter.hidden = true; });
  sorter.querySelectorAll('.sorter-item').forEach(item => {
    item.addEventListener('click', () => {
      setCurrentSlideIndex(parseInt(item.dataset.idx));
      sorter.hidden = true;
    });
  });
}

// === IMPORT ===
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const pres = await importPresentation(file);
    const state = getState();
    state.presentations.push(pres);
    state.active = pres;
    state.currentSlideIndex = 0;
    selectedElementId = null;
    save(); renderEditor();
    toast('Presentation imported!');
  } catch (err) {
    toast(err.message);
  }
  e.target.value = '';
}
