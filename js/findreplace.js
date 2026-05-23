// Find & Replace across all slides of the active presentation.
// Searches text element content (rich HTML stripped for matching, replaced in-place).
import { getState, setCurrentSlideIndex, save } from './app.js';
import { toast } from './storage.js';

let panel = null;
let matches = [];        // [{slideIdx, elId, count}]
let currentMatch = -1;
let lastQuery = '';

export function openFindReplace() {
  build();
  panel.hidden = false;
  panel.querySelector('.fr-find').focus();
  panel.querySelector('.fr-find').select();
}

export function closeFindReplace() {
  if (panel) panel.hidden = true;
}

function build() {
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'find-replace-panel';
  panel.className = 'fr-panel';
  panel.innerHTML = `
    <div class="fr-row">
      <input type="text" class="fr-find" placeholder="Find" autocomplete="off">
      <button class="fr-btn" data-fr="prev" title="Previous">&#9650;</button>
      <button class="fr-btn" data-fr="next" title="Next">&#9660;</button>
      <span class="fr-status">0 / 0</span>
      <button class="fr-close" data-fr="close" title="Close (Esc)">&times;</button>
    </div>
    <div class="fr-row">
      <input type="text" class="fr-replace" placeholder="Replace" autocomplete="off">
      <button class="fr-btn" data-fr="replace">Replace</button>
      <button class="fr-btn" data-fr="replace-all">All</button>
      <label class="fr-opt"><input type="checkbox" class="fr-case"> Aa</label>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.fr-find').addEventListener('input', () => recompute());
  panel.querySelector('.fr-case').addEventListener('change', () => recompute());
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fr]');
    if (!b) return;
    const a = b.dataset.fr;
    if (a === 'close') closeFindReplace();
    else if (a === 'next') step(1);
    else if (a === 'prev') step(-1);
    else if (a === 'replace') replaceOne();
    else if (a === 'replace-all') replaceAll();
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeFindReplace(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.target.classList.contains('fr-replace')) replaceOne();
      else step(e.shiftKey ? -1 : 1);
    }
  });
}

function recompute() {
  const q = panel.querySelector('.fr-find').value;
  lastQuery = q;
  const caseSensitive = panel.querySelector('.fr-case').checked;
  matches = [];
  const state = getState();
  if (!state.active || !q) { updateStatus(); return; }
  state.active.slides.forEach((s, si) => {
    s.elements.forEach(el => {
      if (el.type !== 'text') return;
      const text = stripHTML(el.content || '');
      const re = new RegExp(escapeRe(q), caseSensitive ? 'g' : 'gi');
      const count = (text.match(re) || []).length;
      if (count) matches.push({ slideIdx: si, elId: el.id, count });
    });
  });
  currentMatch = matches.length ? 0 : -1;
  if (currentMatch >= 0) jumpTo(matches[0]);
  updateStatus();
}

function step(dir) {
  if (!matches.length) return;
  currentMatch = (currentMatch + dir + matches.length) % matches.length;
  jumpTo(matches[currentMatch]);
  updateStatus();
}

function jumpTo(m) {
  const state = getState();
  if (state.currentSlideIndex !== m.slideIdx) setCurrentSlideIndex(m.slideIdx);
}

function updateStatus() {
  if (!panel) return;
  const total = matches.reduce((a, m) => a + m.count, 0);
  panel.querySelector('.fr-status').textContent = total ? `${currentMatch + 1} / ${matches.length} (${total})` : '0 / 0';
}

function replaceOne() {
  if (!matches.length || currentMatch < 0) return;
  const q = panel.querySelector('.fr-find').value;
  const r = panel.querySelector('.fr-replace').value;
  const caseSensitive = panel.querySelector('.fr-case').checked;
  if (!q) return;
  const m = matches[currentMatch];
  const state = getState();
  const slide = state.active.slides[m.slideIdx];
  const el = slide?.elements.find(e => e.id === m.elId);
  if (!el) return;
  el.content = replaceFirstHTML(el.content || '', q, r, caseSensitive);
  save();
  document.dispatchEvent(new CustomEvent('menu:refresh'));
  recompute();
}

function replaceAll() {
  const q = panel.querySelector('.fr-find').value;
  const r = panel.querySelector('.fr-replace').value;
  const caseSensitive = panel.querySelector('.fr-case').checked;
  if (!q) return;
  const state = getState();
  let n = 0;
  state.active?.slides.forEach(s => {
    s.elements.forEach(el => {
      if (el.type !== 'text') return;
      const re = new RegExp(escapeRe(q), caseSensitive ? 'g' : 'gi');
      const next = (el.content || '').replace(re, () => { n++; return escapeHTML(r); });
      el.content = next;
    });
  });
  save();
  document.dispatchEvent(new CustomEvent('menu:refresh'));
  recompute();
  toast(`Replaced ${n}`);
}

function stripHTML(s) {
  const d = document.createElement('div'); d.innerHTML = s; return d.textContent || '';
}
function escapeHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function replaceFirstHTML(html, q, r, cs) {
  const re = new RegExp(escapeRe(q), cs ? '' : 'i');
  return html.replace(re, escapeHTML(r));
}
