// Export utilities: PNG per slide, all slides as ZIP-less batch downloads,
// and PDF via the browser's print pipeline (uses a dedicated stylesheet so each
// slide becomes one paginated page).
import { getState } from './app.js';
import { toast } from './storage.js';
import { renderShapeSVG } from './shapes.js';

const W = 1920, H = 1080;

// --- PNG export ---------------------------------------------------------

export async function exportSlidePNG(slideIndex) {
  const state = getState();
  if (!state.active) return;
  const slide = state.active.slides[slideIndex];
  if (!slide) return;
  const blob = await slideToPNG(slide, state.active.theme);
  download(blob, `${safe(state.active.title)}_slide_${slideIndex + 1}.png`);
  toast(`Slide ${slideIndex + 1} exported as PNG`);
}

export async function exportAllPNGs() {
  const state = getState();
  if (!state.active) return;
  toast(`Exporting ${state.active.slides.length} slides...`);
  for (let i = 0; i < state.active.slides.length; i++) {
    const blob = await slideToPNG(state.active.slides[i], state.active.theme);
    download(blob, `${safe(state.active.title)}_${String(i + 1).padStart(3, '0')}.png`);
    // Tiny stagger so the browser doesn't drop downloads.
    await new Promise(r => setTimeout(r, 150));
  }
  toast('PNG export complete');
}

async function slideToPNG(slide, theme) {
  const svg = buildSlideSVG(slide, theme);
  // Render the SVG into a canvas via an image; foreignObject keeps text fidelity.
  const blobIn = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blobIn);
  try {
    const img = await loadImage(url);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = themeBg(theme);
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise(res => c.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function buildSlideSVG(slide, theme) {
  const bg = slide.background;
  let bgFill;
  if (!bg || bg.type === 'theme') bgFill = `<rect width="${W}" height="${H}" fill="${themeBg(theme)}"/>`;
  else if (bg.type === 'color') bgFill = `<rect width="${W}" height="${H}" fill="${bg.value}"/>`;
  else if (bg.type === 'image' && bg.value) bgFill = `<image href="${escAttr(bg.value)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`;
  else if (bg.type === 'gradient') {
    // Best-effort: render with a foreignObject div so CSS gradient is respected.
    bgFill = `<foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${escAttr(bg.value)}"></div></foreignObject>`;
  } else bgFill = `<rect width="${W}" height="${H}" fill="${themeBg(theme)}"/>`;

  const themeText = themeFg(theme);
  const elems = (slide.elements || []).slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(el => renderElementSVG(el, themeText)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bgFill}${elems}</svg>`;
}

function renderElementSVG(el, defaultColor) {
  const x = (el.x / 100) * W;
  const y = (el.y / 100) * H;
  const w = (el.width / 100) * W;
  const h = (el.height / 100) * H;
  const opacity = el.opacity ?? 1;
  const rot = el.rotation || 0;
  const transform = rot ? `transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"` : '';

  if (el.type === 'shape') {
    const shapeSVG = renderShapeSVG(el).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<g ${transform} opacity="${opacity}"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${shapeSVG}</svg></g>`;
  }

  if (el.type === 'image' && el.content) {
    return `<g ${transform} opacity="${opacity}"><image href="${escAttr(el.content)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${el.objectFit === 'cover' ? 'xMidYMid slice' : el.objectFit === 'fill' ? 'none' : 'xMidYMid meet'}"/></g>`;
  }

  // Text and everything else via foreignObject for high fidelity.
  const scaledFontSize = Math.round((el.fontSize || 24) * (W / 960));
  const color = el.fontColor || defaultColor;
  const bg = el.backgroundColor ? `background:${esc(el.backgroundColor)};` : '';
  const border = el.borderWidth ? `border:${el.borderWidth * (W / 960)}px ${el.borderStyle || 'solid'} ${el.borderColor || '#fff'};` : '';
  const radius = el.borderRadius ? `border-radius:${el.borderRadius * (W / 960)}px;` : '';
  const vAlign = el.verticalAlign || 'top';
  const jc = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';

  let body = '';
  if (el.type === 'text') {
    const ts = `font-size:${scaledFontSize}px;font-weight:${el.fontWeight || 'normal'};text-align:${el.textAlign || 'left'};font-family:'${esc(el.fontFamily || 'Inter')}',sans-serif;letter-spacing:${(el.letterSpacing || 0) * (W / 960)}px;line-height:${el.lineHeight || 1.4};text-transform:${el.textTransform || 'none'};color:${color};white-space:pre-wrap;width:100%;`;
    body = `<div style="${ts}">${sanitizeRichText(el.content || '')}</div>`;
  } else if (el.type === 'code') {
    const cs = Math.round((el.codeFontSize || 14) * (W / 960));
    const dark = !el.codeTheme || el.codeTheme !== 'vs';
    const cbg = dark ? '#1e1e1e' : '#fff';
    const cfg = dark ? '#d4d4d4' : '#1e1e1e';
    body = `<pre style="background:${cbg};color:${cfg};margin:0;padding:${20 * (W / 960)}px;font-family:'Fira Code',monospace;font-size:${cs}px;line-height:1.6;white-space:pre;tab-size:2;width:100%;height:100%;box-sizing:border-box;overflow:hidden">${escapeXML(el.content || '')}</pre>`;
  } else if (el.type === 'embed' || el.type === 'video') {
    body = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;color:#888;font-family:sans-serif">[${el.type}]</div>`;
  } else {
    body = '';
  }

  const wrap = `display:flex;flex-direction:column;justify-content:${jc};width:100%;height:100%;overflow:hidden;${bg}${border}${radius}box-sizing:border-box;`;
  return `<g ${transform} opacity="${opacity}"><foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="${wrap}">${body}</div></foreignObject></g>`;
}

function sanitizeRichText(html) {
  // Pass through but escape stray ampersands; rely on contenteditable HTML being well-formed.
  return html.replace(/&(?!#?\w+;)/g, '&amp;');
}
function escapeXML(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function esc(s) { return String(s || '').replace(/"/g, '&quot;'); }
function escAttr(s) { return esc(s); }
function safe(s) { return String(s || 'presentation').replace(/[^a-z0-9_\-]+/gi, '_'); }
function themeBg(t) {
  return ({ dark: '#1a1a2e', light: '#ffffff', ocean: '#0a1628', sunset: '#2d1b3d', forest: '#0d1f0d', royal: '#0f0a2e', minimal: '#f8f9fa', magenta: '#1a0a1a', monokai: '#272822', dracula: '#282a36', pastel: '#fef6e4', solarized: '#fdf6e3' }[t]) || '#1a1a2e';
}
function themeFg(t) {
  return ({ dark: '#eaeaea', light: '#333', ocean: '#b8d4e3', sunset: '#f0d4d4', forest: '#c4e8c4', royal: '#d4c4e8', minimal: '#444', magenta: '#f0d0f0', monokai: '#f8f8f2', dracula: '#f8f8f2', pastel: '#001858', solarized: '#586e75' }[t]) || '#eaeaea';
}
function download(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// --- PDF export via print ----------------------------------------------

export function exportPDF() {
  const state = getState();
  if (!state.active) return;

  // Build a hidden container with one page per slide.
  let host = document.getElementById('print-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'print-host';
    document.body.appendChild(host);
  }
  host.innerHTML = state.active.slides.map((s, i) => `
    <div class="print-page" data-theme="${state.active.theme}">
      ${slidePrintHTML(s, state.active.theme, i + 1, state.active.slides.length)}
    </div>
  `).join('');

  document.body.classList.add('printing');
  const cleanup = () => {
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 100);
}

function slidePrintHTML(slide, theme, n, total) {
  const bg = slide.background;
  let style = '';
  if (!bg || bg.type === 'theme') style = `background:${themeBg(theme)};color:${themeFg(theme)}`;
  else if (bg.type === 'color') style = `background:${bg.value}`;
  else if (bg.type === 'gradient') style = `background:${bg.value}`;
  else if (bg.type === 'image') style = `background:url('${bg.value}') center/cover no-repeat`;

  const elems = (slide.elements || []).map(el => {
    const pos = `position:absolute;left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;opacity:${el.opacity};transform:rotate(${el.rotation || 0}deg);z-index:${el.zIndex || 0};`;
    const box = (el.backgroundColor ? `background:${el.backgroundColor};` : '') +
                (el.borderWidth ? `border:${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#fff'};` : '') +
                (el.borderRadius ? `border-radius:${el.borderRadius}px;` : '');
    if (el.type === 'text') {
      const vAlign = el.verticalAlign || 'top';
      const jc = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';
      const ts = `font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.textAlign};font-family:'${el.fontFamily}',sans-serif;line-height:${el.lineHeight || 1.4};color:${el.fontColor || 'inherit'};letter-spacing:${el.letterSpacing || 0}px;text-transform:${el.textTransform || 'none'};white-space:pre-wrap;`;
      return `<div style="${pos}${box}display:flex;flex-direction:column;justify-content:${jc};overflow:hidden"><div style="${ts}">${el.content || ''}</div></div>`;
    }
    if (el.type === 'image' && el.content) return `<div style="${pos}${box}overflow:hidden"><img src="${el.content}" style="width:100%;height:100%;object-fit:${el.objectFit || 'contain'}"></div>`;
    if (el.type === 'shape') return `<div style="${pos}overflow:visible">${renderShapeSVG(el)}</div>`;
    if (el.type === 'code') {
      const dark = !el.codeTheme || el.codeTheme !== 'vs';
      return `<pre style="${pos}${box}background:${dark ? '#1e1e1e' : '#fff'};color:${dark ? '#d4d4d4' : '#1e1e1e'};margin:0;padding:16px 20px;font-family:'Fira Code',monospace;font-size:${el.codeFontSize || 14}px;line-height:1.6;white-space:pre;overflow:hidden">${(el.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
    }
    if (el.type === 'embed' || el.type === 'video' || el.type === 'audio') {
      return `<div style="${pos}${box}display:flex;align-items:center;justify-content:center;background:#000;color:#aaa;font-family:sans-serif">[${el.type}]</div>`;
    }
    return '';
  }).join('');

  return `<div class="print-slide" style="${style}">${elems}<div class="print-num">${n} / ${total}</div></div>`;
}
