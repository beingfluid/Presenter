import { getState, getCurrentSlide, save } from './app.js';
import { createElement, toast } from './storage.js';
import { TEMPLATES, saveCustomTemplate } from './templates.js';
import { FONT_LIST, loadFont } from './fonts.js';
import { CODE_LANGUAGES, CODE_THEMES } from './code.js';

let ribbonEl;
let selectedElementId = null;

export function initRibbon() {
  ribbonEl = document.getElementById('ribbon');
  ribbonEl.addEventListener('input', handleRibbonInput);
  ribbonEl.addEventListener('change', handleRibbonChange);
  ribbonEl.addEventListener('click', handleRibbonClick);
}

export function setRibbonSelection(elId) {
  selectedElementId = elId;
}

export function renderRibbon() {
  if (!ribbonEl) return;
  const slide = getCurrentSlide();
  if (!slide) { ribbonEl.innerHTML = ''; return; }

  if (selectedElementId) {
    const el = slide.elements.find(e => e.id === selectedElementId);
    if (el) {
      if (el.type === 'text') {
        renderTextRibbon(el);
      } else if (el.type === 'code') {
        renderCodeRibbon(el);
      } else {
        renderImageRibbon(el);
      }
      return;
    }
  }
  renderSlideRibbon(slide);
}

function renderSlideRibbon(slide) {
  const state = getState();
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Slide ${state.currentSlideIndex + 1}/${state.active.slides.length}</span>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="add-text">+ Text</button>
      <button class="ribbon-btn" data-ribbon="add-image">+ Image</button>
      <button class="ribbon-btn" data-ribbon="add-code">+ Code</button>
      <button class="ribbon-btn" data-ribbon="add-shape">+ Shape</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Layout:</span>
      <button class="ribbon-btn" data-ribbon="tpl-0">Title</button>
      <button class="ribbon-btn" data-ribbon="tpl-2">Content</button>
      <button class="ribbon-btn" data-ribbon="tpl-4">&#9636;Img+Txt</button>
      <button class="ribbon-btn" data-ribbon="tpl-5">Txt+Img&#9637;</button>
      <button class="ribbon-btn" data-ribbon="tpl-3">2 Col</button>
      <button class="ribbon-btn" data-ribbon="tpl-13">Code</button>
      <button class="ribbon-btn" data-ribbon="tpl-14">Code+Notes</button>
      <button class="ribbon-btn" data-ribbon="tpl-16">Blank</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="save-tpl">&#9733; Save as Template</button>
    </div>
  `;
}

function renderTextRibbon(el) {
  const vAlign = el.verticalAlign || 'top';
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <select class="ribbon-select ribbon-font-select" data-rprop="fontFamily" title="Font">
        ${buildFontOptions(el.fontFamily)}
      </select>
    </div>
    <div class="ribbon-section">
      <input type="number" class="ribbon-input ribbon-num" data-rprop="fontSize" value="${el.fontSize}" min="8" max="200" step="2" title="Font Size">
      <button class="ribbon-btn" data-ribbon="size-down" title="Decrease">A&#8595;</button>
      <button class="ribbon-btn" data-ribbon="size-up" title="Increase">A&#8593;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn ${el.fontWeight === 'bold' ? 'active' : ''}" data-ribbon="toggle-bold" title="Bold"><b>B</b></button>
      <input type="color" class="ribbon-color" data-rprop="fontColor" value="${el.fontColor || '#ffffff'}" title="Text Color">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn ${el.textAlign === 'left' ? 'active' : ''}" data-ribbon="align-left" title="Left">&#9664;</button>
      <button class="ribbon-btn ${el.textAlign === 'center' ? 'active' : ''}" data-ribbon="align-center" title="Center">&#9644;</button>
      <button class="ribbon-btn ${el.textAlign === 'right' ? 'active' : ''}" data-ribbon="align-right" title="Right">&#9654;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn ${vAlign === 'top' ? 'active' : ''}" data-ribbon="valign-top" title="Top">&#9650;</button>
      <button class="ribbon-btn ${vAlign === 'middle' ? 'active' : ''}" data-ribbon="valign-middle" title="Middle">&#8212;</button>
      <button class="ribbon-btn ${vAlign === 'bottom' ? 'active' : ''}" data-ribbon="valign-bottom" title="Bottom">&#9660;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Opacity</span>
      <input type="range" class="ribbon-range" data-rprop="opacity" min="0" max="1" step="0.05" value="${el.opacity}" title="Opacity">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <input type="color" class="ribbon-color" data-rprop="backgroundColor" value="${el.backgroundColor || '#000000'}" title="Background">
      <button class="ribbon-btn btn-xs" data-ribbon="clear-bg" title="Clear BG">&#10005;</button>
      <span class="ribbon-sep-sm"></span>
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="borderWidth" value="${el.borderWidth}" min="0" max="20" title="Border Width">
      <input type="color" class="ribbon-color" data-rprop="borderColor" value="${el.borderColor || '#ffffff'}" title="Border Color">
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="borderRadius" value="${el.borderRadius}" min="0" max="100" title="Radius">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center on slide">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Middle on slide">&#8597;</button>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-front" title="Front">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-back" title="Back">&#8681;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderImageRibbon(el) {
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Image</span>
      <select class="ribbon-select" data-rprop="objectFit" title="Fit">
        <option value="contain" ${el.objectFit === 'contain' ? 'selected' : ''}>Contain</option>
        <option value="cover" ${el.objectFit === 'cover' ? 'selected' : ''}>Cover</option>
        <option value="fill" ${el.objectFit === 'fill' ? 'selected' : ''}>Fill</option>
      </select>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Opacity</span>
      <input type="range" class="ribbon-range" data-rprop="opacity" min="0" max="1" step="0.05" value="${el.opacity}" title="Opacity">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <input type="color" class="ribbon-color" data-rprop="backgroundColor" value="${el.backgroundColor || '#000000'}" title="Background">
      <button class="ribbon-btn btn-xs" data-ribbon="clear-bg" title="Clear BG">&#10005;</button>
      <span class="ribbon-sep-sm"></span>
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="borderWidth" value="${el.borderWidth}" min="0" max="20" title="Border">
      <input type="color" class="ribbon-color" data-rprop="borderColor" value="${el.borderColor || '#ffffff'}" title="Border Color">
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="borderRadius" value="${el.borderRadius}" min="0" max="100" title="Radius">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn ${el.shadowEnabled ? 'active' : ''}" data-ribbon="toggle-shadow" title="Shadow">&#9632;&#8595;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center H">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center V">&#8597;</button>
      <button class="ribbon-btn" data-ribbon="size-full" title="Full">Full</button>
      <button class="ribbon-btn" data-ribbon="size-half-left" title="Left Half">L&#189;</button>
      <button class="ribbon-btn" data-ribbon="size-half-right" title="Right Half">R&#189;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-front" title="Front">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-back" title="Back">&#8681;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderCodeRibbon(el) {
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Code</span>
      <select class="ribbon-select" data-rprop="language" title="Language">
        ${CODE_LANGUAGES.map(l => `<option value="${l}" ${l === el.language ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <select class="ribbon-select" data-rprop="codeTheme" title="Theme">
        ${CODE_THEMES.map(t => `<option value="${t.id}" ${t.id === el.codeTheme ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Font</span>
      <input type="number" class="ribbon-input ribbon-num" data-rprop="codeFontSize" value="${el.codeFontSize || 14}" min="8" max="32" step="1" title="Code Font Size">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="edit-code" title="Open Editor">&#9998; Edit Code</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Opacity</span>
      <input type="range" class="ribbon-range" data-rprop="opacity" min="0" max="1" step="0.05" value="${el.opacity}" title="Opacity">
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="borderRadius" value="${el.borderRadius}" min="0" max="50" title="Radius">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center H">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center V">&#8597;</button>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-front" title="Front">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-back" title="Back">&#8681;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function buildFontOptions(current) {
  return FONT_LIST.map(f =>
    `<option value="${f.name}" ${f.name === current ? 'selected' : ''} style="font-family:'${f.name}',sans-serif">${f.name}</option>`
  ).join('');
}

// Handle live input (range, color, number)
function handleRibbonInput(e) {
  const prop = e.target.dataset.rprop;
  if (!prop) return;
  const el = getSelectedElement();
  if (!el) return;

  let value = e.target.value;
  if (['fontSize','borderWidth','borderRadius'].includes(prop)) {
    value = parseFloat(value);
    if (isNaN(value)) return;
  } else if (prop === 'opacity') {
    value = parseFloat(value);
  }

  el[prop] = value;
  if (prop === 'fontFamily') loadFont(value);
  save();
  notify();
}

// Handle discrete changes (select)
function handleRibbonChange(e) {
  const prop = e.target.dataset.rprop;
  if (!prop) return;
  const el = getSelectedElement();
  if (!el) return;

  let value = e.target.value;
  if (['fontSize','borderWidth','borderRadius'].includes(prop)) {
    value = parseFloat(value);
  } else if (prop === 'opacity') {
    value = parseFloat(value);
  }

  el[prop] = value;
  if (prop === 'fontFamily') loadFont(value);
  save();
  notify();
}

// Handle button clicks
function handleRibbonClick(e) {
  const btn = e.target.closest('[data-ribbon]');
  if (!btn) return;
  e.preventDefault();
  const action = btn.dataset.ribbon;
  const slide = getCurrentSlide();
  if (!slide) return;
  const el = getSelectedElement();

  // Template actions (no element needed)
  if (action.startsWith('tpl-')) {
    const idx = parseInt(action.split('-')[1]);
    const tpl = TEMPLATES[idx];
    if (!tpl) return;
    const ok = slide.elements.length === 0 || confirm('Replace current slide content with template?');
    if (!ok) return;
    slide.elements = tpl.build();
    document.dispatchEvent(new CustomEvent('ribbon:set-last-template', { detail: idx }));
    save(); notify();
    return;
  }

  if (action === 'save-tpl') {
    const name = prompt('Template name:', 'My Template');
    if (name) { saveCustomTemplate(name, slide.elements, slide.background); toast('Template saved!'); }
    return;
  }

  if (action === 'add-text') { document.dispatchEvent(new CustomEvent('ribbon:add-text')); return; }
  if (action === 'add-image') { document.dispatchEvent(new CustomEvent('ribbon:add-image')); return; }
  if (action === 'add-shape') { document.dispatchEvent(new CustomEvent('ribbon:add-shape')); return; }
  if (action === 'add-code') { document.dispatchEvent(new CustomEvent('ribbon:add-code')); return; }
  if (action === 'edit-code') { document.dispatchEvent(new CustomEvent('ribbon:edit-code')); return; }

  if (!el) return;

  switch (action) {
    // Text alignment
    case 'align-left': el.textAlign = 'left'; break;
    case 'align-center': el.textAlign = 'center'; break;
    case 'align-right': el.textAlign = 'right'; break;
    case 'valign-top': el.verticalAlign = 'top'; break;
    case 'valign-middle': el.verticalAlign = 'middle'; break;
    case 'valign-bottom': el.verticalAlign = 'bottom'; break;

    // Font size
    case 'size-up': el.fontSize = Math.min(200, (el.fontSize || 24) + 4); break;
    case 'size-down': el.fontSize = Math.max(8, (el.fontSize || 24) - 4); break;

    // Bold toggle
    case 'toggle-bold': el.fontWeight = el.fontWeight === 'bold' ? 'normal' : 'bold'; break;

    // Shadow toggle
    case 'toggle-shadow': el.shadowEnabled = !el.shadowEnabled; break;

    // Clear background
    case 'clear-bg': el.backgroundColor = ''; break;

    // Position
    case 'pos-center-h': el.x = (100 - el.width) / 2; break;
    case 'pos-center-v': el.y = (100 - el.height) / 2; break;

    // Size presets
    case 'size-full': el.x = 0; el.y = 0; el.width = 100; el.height = 100; break;
    case 'size-half-left': el.x = 2; el.y = 5; el.width = 46; el.height = 90; break;
    case 'size-half-right': el.x = 52; el.y = 5; el.width = 46; el.height = 90; break;

    // Layer
    case 'bring-front': el.zIndex = Math.max(...slide.elements.map(e => e.zIndex || 0)) + 1; break;
    case 'send-back': el.zIndex = Math.min(...slide.elements.map(e => e.zIndex || 0)) - 1; break;

    // Operations
    case 'duplicate': document.dispatchEvent(new CustomEvent('ribbon:duplicate')); return;
    case 'delete': document.dispatchEvent(new CustomEvent('ribbon:delete')); return;

    default: return;
  }

  save();
  notify();
}

function getSelectedElement() {
  if (!selectedElementId) return null;
  const slide = getCurrentSlide();
  return slide?.elements.find(e => e.id === selectedElementId) || null;
}

function notify() {
  document.dispatchEvent(new CustomEvent('ribbon:updated'));
}
