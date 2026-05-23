import { getState, getCurrentSlide, save } from './app.js';
import { createElement, toast } from './storage.js';
import { TEMPLATES, saveCustomTemplate } from './templates.js';
import { FONT_LIST, loadFont } from './fonts.js';
import { CODE_LANGUAGES, CODE_THEMES } from './code.js';
import { SHAPE_TYPES, shapeSwatchSVG } from './shapes.js';

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
      } else if (el.type === 'shape') {
        renderShapeRibbon(el);
      } else if (el.type === 'embed') {
        renderEmbedRibbon(el);
      } else if (el.type === 'video') {
        renderVideoRibbon(el);
      } else if (el.type === 'audio') {
        renderAudioRibbon(el);
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
      <button class="ribbon-btn" data-ribbon="add-text" title="Add Text" aria-label="Add Text"><b>T</b><sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-image" title="Add Image" aria-label="Add Image">&#128247;<sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-code" title="Add Code" aria-label="Add Code">&lt;/&gt;<sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-shape" title="Add Shape" aria-label="Add Shape">&#9670;<sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-embed" title="Add Embed (YouTube/web)" aria-label="Add Embed">&#127760;<sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-video" title="Add Video" aria-label="Add Video">&#127909;<sup>+</sup></button>
      <button class="ribbon-btn" data-ribbon="add-audio" title="Add Audio" aria-label="Add Audio">&#127925;<sup>+</sup></button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Layout</span>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-0" title="Title" aria-label="Title">${tplIconTitle()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-2" title="Content" aria-label="Content">${tplIconContent()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-4" title="Image + Text" aria-label="Image + Text">${tplIconImgTxt()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-5" title="Text + Image" aria-label="Text + Image">${tplIconTxtImg()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-3" title="Two Columns" aria-label="Two Columns">${tplIcon2Col()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-13" title="Code" aria-label="Code">${tplIconCode()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-14" title="Code + Notes" aria-label="Code + Notes">${tplIconCodeNotes()}</button>
      <button class="ribbon-btn ribbon-tpl" data-ribbon="tpl-16" title="Blank" aria-label="Blank">${tplIconBlank()}</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="save-tpl" title="Save current slide as template" aria-label="Save as Template">&#9733;</button>
    </div>
  `;
}

// Tiny SVG layout previews so the Layout row reads at a glance.
function tplBox(inner) { return `<svg viewBox="0 0 20 12" width="22" height="14" aria-hidden="true"><rect x="0.5" y="0.5" width="19" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.55"/>${inner}</svg>`; }
function tplIconTitle()      { return tplBox('<rect x="4" y="4" width="12" height="2" fill="currentColor"/><rect x="6" y="7" width="8"  height="1" fill="currentColor" opacity="0.6"/>'); }
function tplIconContent()    { return tplBox('<rect x="3" y="2" width="14" height="1.6" fill="currentColor"/><rect x="3" y="5" width="14" height="1" fill="currentColor" opacity="0.6"/><rect x="3" y="7" width="11" height="1" fill="currentColor" opacity="0.6"/><rect x="3" y="9" width="13" height="1" fill="currentColor" opacity="0.6"/>'); }
function tplIconImgTxt()     { return tplBox('<rect x="2" y="2" width="7" height="8" fill="currentColor" opacity="0.45"/><rect x="11" y="3" width="6" height="1.2" fill="currentColor"/><rect x="11" y="5" width="6" height="1" fill="currentColor" opacity="0.6"/><rect x="11" y="6.5" width="5" height="1" fill="currentColor" opacity="0.6"/>'); }
function tplIconTxtImg()     { return tplBox('<rect x="3" y="3" width="6" height="1.2" fill="currentColor"/><rect x="3" y="5" width="6" height="1" fill="currentColor" opacity="0.6"/><rect x="3" y="6.5" width="5" height="1" fill="currentColor" opacity="0.6"/><rect x="11" y="2" width="7" height="8" fill="currentColor" opacity="0.45"/>'); }
function tplIcon2Col()       { return tplBox('<rect x="2" y="2" width="7" height="8" fill="currentColor" opacity="0.45"/><rect x="11" y="2" width="7" height="8" fill="currentColor" opacity="0.45"/>'); }
function tplIconCode()       { return tplBox('<text x="10" y="8.5" font-family="monospace" font-size="6" font-weight="700" text-anchor="middle" fill="currentColor">&lt;/&gt;</text>'); }
function tplIconCodeNotes()  { return tplBox('<rect x="2" y="2" width="11" height="8" fill="currentColor" opacity="0.3"/><text x="7.5" y="7" font-family="monospace" font-size="3.5" font-weight="700" text-anchor="middle" fill="currentColor">&lt;/&gt;</text><rect x="14" y="3" width="4" height="1" fill="currentColor" opacity="0.6"/><rect x="14" y="5" width="4" height="1" fill="currentColor" opacity="0.6"/><rect x="14" y="7" width="3" height="1" fill="currentColor" opacity="0.6"/>'); }
function tplIconBlank()      { return tplBox(''); }

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
      <button class="ribbon-btn" data-ribbon="pos-align-left" title="Align Left">&#8676;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center horizontally">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-align-right" title="Align Right">&#8677;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center vertically">&#8597;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-front" title="To Front">&#8679;&#8679;</button>
      <button class="ribbon-btn" data-ribbon="bring-forward" title="Bring Forward">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-backward" title="Send Backward">&#8681;</button>
      <button class="ribbon-btn" data-ribbon="send-back" title="To Back">&#8681;&#8681;</button>
      <button class="ribbon-btn ${el.locked ? 'active' : ''}" data-ribbon="lock" title="Lock / Unlock">${el.locked ? '&#128274;' : '&#128275;'}</button>
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
      <button class="ribbon-btn" data-ribbon="replace-image" title="Replace image from file" aria-label="Replace Image">&#128247;</button>
      <button class="ribbon-btn" data-ribbon="flip-h" title="Flip Horizontal">&#8646;</button>
      <button class="ribbon-btn" data-ribbon="flip-v" title="Flip Vertical">&#8645;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="size-full" title="Fill slide" aria-label="Fill slide">&#9974;</button>
      <button class="ribbon-btn" data-ribbon="size-half-left" title="Left half" aria-label="Left half">&#9612;</button>
      <button class="ribbon-btn" data-ribbon="size-half-right" title="Right half" aria-label="Right half">&#9616;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="pos-align-left" title="Align Left">&#8676;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center H">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-align-right" title="Align Right">&#8677;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center V">&#8597;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-forward" title="Bring Forward">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-backward" title="Send Backward">&#8681;</button>
      <button class="ribbon-btn ${el.locked ? 'active' : ''}" data-ribbon="lock" title="Lock / Unlock">${el.locked ? '&#128274;' : '&#128275;'}</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderShapeRibbon(el) {
  const swatches = SHAPE_TYPES.map(s =>
    `<button class="ribbon-btn shape-swatch ${s.id === el.shapeType ? 'active' : ''}" data-ribbon="set-shape-${s.id}" title="${s.name}" style="padding:2px 4px">${shapeSwatchSVG(s.id)}</button>`
  ).join('');
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Shape</span>
      ${swatches}
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Fill</span>
      <input type="color" class="ribbon-color" data-rprop="fillColor" value="${el.fillColor || '#7c5cfc'}" title="Fill">
      <span class="ribbon-label">Stroke</span>
      <input type="color" class="ribbon-color" data-rprop="strokeColor" value="${el.strokeColor && el.strokeColor !== 'transparent' ? el.strokeColor : '#ffffff'}" title="Stroke Color">
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="strokeWidth" value="${el.strokeWidth || 0}" min="0" max="20" title="Stroke Width">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Opacity</span>
      <input type="range" class="ribbon-range" data-rprop="opacity" min="0" max="1" step="0.05" value="${el.opacity}">
      <input type="number" class="ribbon-input ribbon-num-sm" data-rprop="rotation" value="${el.rotation || 0}" min="-360" max="360" step="5" title="Rotate">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="flip-h" title="Flip Horizontal">&#8646;</button>
      <button class="ribbon-btn" data-ribbon="flip-v" title="Flip Vertical">&#8645;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="pos-align-left" title="Align Left">&#8676;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center H">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-align-right" title="Align Right">&#8677;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center V">&#8597;</button>
      <span class="ribbon-sep-sm"></span>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn" data-ribbon="bring-forward" title="Bring Forward">&#8679;</button>
      <button class="ribbon-btn" data-ribbon="send-backward" title="Send Backward">&#8681;</button>
      <button class="ribbon-btn ${el.locked ? 'active' : ''}" data-ribbon="lock" title="Lock / Unlock">${el.locked ? '&#128274;' : '&#128275;'}</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderEmbedRibbon(el) {
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Embed URL</span>
      <input type="text" class="ribbon-input" data-rprop="content" value="${el.content || ''}" style="flex:1;min-width:260px" placeholder="https://www.youtube.com/embed/...">
      <button class="ribbon-btn" data-ribbon="edit-url" title="Edit URL">&#9998;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <span class="ribbon-label">Opacity</span>
      <input type="range" class="ribbon-range" data-rprop="opacity" min="0" max="1" step="0.05" value="${el.opacity}">
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="size-full" title="Fill slide" aria-label="Fill slide">&#9974;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-h" title="Center horizontally">&#8596;</button>
      <button class="ribbon-btn" data-ribbon="pos-center-v" title="Center vertically">&#8597;</button>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderVideoRibbon(el) {
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Video URL</span>
      <input type="text" class="ribbon-input" data-rprop="content" value="${el.content || ''}" style="flex:1;min-width:240px" placeholder=".mp4 / .webm / .ogg">
      <button class="ribbon-btn" data-ribbon="edit-url">&#9998;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <label class="ribbon-check"><input type="checkbox" data-rprop="autoplay" ${el.autoplay ? 'checked' : ''}> Autoplay</label>
      <label class="ribbon-check"><input type="checkbox" data-rprop="loop" ${el.loop ? 'checked' : ''}> Loop</label>
      <label class="ribbon-check"><input type="checkbox" data-rprop="muted" ${el.muted ? 'checked' : ''}> Muted</label>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="size-full" title="Fill slide" aria-label="Fill slide">&#9974;</button>
      <button class="ribbon-btn" data-ribbon="duplicate" title="Duplicate">&#9851;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete" title="Delete">&#128465;</button>
    </div>
  `;
}

function renderAudioRibbon(el) {
  ribbonEl.innerHTML = `
    <div class="ribbon-section">
      <span class="ribbon-label">Audio URL</span>
      <input type="text" class="ribbon-input" data-rprop="content" value="${el.content || ''}" style="flex:1;min-width:240px" placeholder=".mp3 / .ogg / .wav">
      <button class="ribbon-btn" data-ribbon="edit-url">&#9998;</button>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <label class="ribbon-check"><input type="checkbox" data-rprop="autoplay" ${el.autoplay ? 'checked' : ''}> Autoplay</label>
      <label class="ribbon-check"><input type="checkbox" data-rprop="loop" ${el.loop ? 'checked' : ''}> Loop</label>
    </div>
    <div class="ribbon-sep"></div>
    <div class="ribbon-section">
      <button class="ribbon-btn" data-ribbon="duplicate">&#9851;</button>
      <button class="ribbon-btn ribbon-danger" data-ribbon="delete">&#128465;</button>
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
      <button class="ribbon-btn" data-ribbon="edit-code" title="Open code editor" aria-label="Edit Code">&#9998;</button>
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

  let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (['fontSize','borderWidth','borderRadius','strokeWidth','rotation'].includes(prop)) {
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

  let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (['fontSize','borderWidth','borderRadius','strokeWidth','rotation'].includes(prop)) {
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
  if (action === 'add-embed') { document.dispatchEvent(new CustomEvent('ribbon:add-embed')); return; }
  if (action === 'add-video') { document.dispatchEvent(new CustomEvent('ribbon:add-video')); return; }
  if (action === 'add-audio') { document.dispatchEvent(new CustomEvent('ribbon:add-audio')); return; }
  if (action === 'edit-code') { document.dispatchEvent(new CustomEvent('ribbon:edit-code')); return; }

  if (action.startsWith('set-shape-')) {
    const st = action.replace('set-shape-', '');
    if (el && el.type === 'shape') { el.shapeType = st; save(); notify(); }
    return;
  }
  if (action === 'edit-url' && el) {
    const url = prompt(el.type === 'embed' ? 'Embed URL:' : el.type === 'video' ? 'Video URL:' : 'URL:', el.content || '');
    if (url !== null) { el.content = url; save(); notify(); }
    return;
  }

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
    case 'bring-forward': document.dispatchEvent(new CustomEvent('element:bring-forward')); return;
    case 'send-backward': document.dispatchEvent(new CustomEvent('element:send-backward')); return;

    // Lock
    case 'lock': el.locked = !el.locked; break;

    // Flip
    case 'flip-h': document.dispatchEvent(new CustomEvent('element:flip', { detail: 'h' })); return;
    case 'flip-v': document.dispatchEvent(new CustomEvent('element:flip', { detail: 'v' })); return;

    // Align to slide edges (named pos-align-* to avoid colliding with the
    // text-align cases above which are used by the text ribbon).
    case 'pos-align-left':   document.dispatchEvent(new CustomEvent('element:align', { detail: 'left' })); return;
    case 'pos-align-right':  document.dispatchEvent(new CustomEvent('element:align', { detail: 'right' })); return;
    case 'pos-align-top':    document.dispatchEvent(new CustomEvent('element:align', { detail: 'top' })); return;
    case 'pos-align-bottom': document.dispatchEvent(new CustomEvent('element:align', { detail: 'bottom' })); return;

    // Image-specific replace
    case 'replace-image': document.dispatchEvent(new CustomEvent('element:replace-image')); return;

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
