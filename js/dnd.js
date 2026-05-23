// Drag-and-drop + clipboard-paste support for images on the editor canvas.
// Files are converted to data URLs (works fully offline; persists in localStorage).
import { getCurrentSlide, save } from './app.js';
import { createElement, toast } from './storage.js';

const IMAGE_RE = /^image\//;

export function initDragDrop(canvasEl, onChanged) {
  // Prevent default drag-over so drop fires.
  canvasEl.addEventListener('dragover', (e) => {
    if (hasImage(e.dataTransfer) || hasUri(e.dataTransfer)) {
      e.preventDefault();
      canvasEl.classList.add('drop-target');
    }
  });
  canvasEl.addEventListener('dragleave', (e) => {
    if (e.target === canvasEl) canvasEl.classList.remove('drop-target');
  });
  canvasEl.addEventListener('drop', async (e) => {
    canvasEl.classList.remove('drop-target');
    if (!hasImage(e.dataTransfer) && !hasUri(e.dataTransfer)) return;
    e.preventDefault();

    const slide = getCurrentSlide();
    if (!slide) return;

    const pos = pointToPercent(canvasEl, e.clientX, e.clientY);

    // Image file dropped.
    const file = [...(e.dataTransfer.files || [])].find(f => IMAGE_RE.test(f.type));
    if (file) {
      const dataUrl = await fileToDataURL(file);
      addImageAt(slide, dataUrl, pos);
      onChanged?.();
      toast('Image added');
      return;
    }
    // URL / image dragged from another page.
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && /^https?:|^data:image\//.test(uri.trim())) {
      addImageAt(slide, uri.trim(), pos);
      onChanged?.();
      toast('Image added');
    }
  });

  // Paste images from clipboard (anywhere — not just inside editable text).
  document.addEventListener('paste', async (e) => {
    // Skip when typing in a real input.
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (IMAGE_RE.test(item.type)) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const dataUrl = await fileToDataURL(file);
        const slide = getCurrentSlide();
        if (!slide) return;
        addImageAt(slide, dataUrl, { x: 25, y: 20 });
        onChanged?.();
        toast('Image pasted');
        return;
      }
    }

    // Fallback: text clipboard. Covers two common flows the user asked for:
    //   1. Right-click an image online → "Copy image address" (URL string)
    //   2. Copy a data:image/... URL from anywhere
    // Accept http(s) URLs that look like image files (by extension OR by
    // explicit data:image prefix). Non-image text is ignored so normal
    // paste-into-empty-canvas does nothing surprising.
    const text = (e.clipboardData?.getData('text/plain') || '').trim();
    if (!text) return;
    if (isLikelyImageUrl(text)) {
      e.preventDefault();
      const slide = getCurrentSlide();
      if (!slide) return;
      addImageAt(slide, text, { x: 25, y: 20 });
      onChanged?.();
      toast('Image pasted from URL');
    }
  });
}

// Matches data:image/... and http(s) URLs ending in a common image extension
// (query string allowed, e.g. ?w=600).
function isLikelyImageUrl(s) {
  if (/^data:image\//i.test(s)) return true;
  if (!/^https?:\/\//i.test(s)) return false;
  // Strip query / fragment, then test extension.
  const path = s.split(/[?#]/)[0];
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(path);
}

function hasImage(dt) {
  if (!dt) return false;
  return [...(dt.types || [])].includes('Files');
}
function hasUri(dt) {
  if (!dt) return false;
  const types = [...(dt.types || [])];
  return types.includes('text/uri-list') || types.includes('text/plain');
}

function pointToPercent(canvasEl, cx, cy) {
  const stage = document.getElementById('slide-stage');
  if (!stage) return { x: 25, y: 25 };
  const r = stage.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100));
  const y = Math.max(0, Math.min(100, ((cy - r.top) / r.height) * 100));
  return { x: clamp(x - 25, 0, 70), y: clamp(y - 20, 0, 70) };
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function addImageAt(slide, url, { x, y }) {
  const el = createElement('image', {
    x, y, width: 50, height: 50, content: url, objectFit: 'contain'
  });
  slide.elements.push(el);
  save();
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
