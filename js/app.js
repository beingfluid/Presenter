import { loadData, saveData, createPresentation } from './storage.js';
import { initEditor, renderEditor } from './editor.js';
import { initPlayer, startPresentation, stopPresentation } from './player.js';
import { loadAllUsedFonts, loadFont } from './fonts.js';
import { initMenu, updateMenuTitle, rebuildMenuBar } from './menu.js';
import { pushRecent } from './storage.js';

const state = {
  presentations: [],
  active: null,
  currentSlideIndex: 0,
  mode: 'editor'
};

export function getState() {
  return state;
}

export function setActivePresentation(id) {
  state.active = state.presentations.find(p => p.id === id) || null;
  state.currentSlideIndex = 0;
  if (state.active) pushRecent(state.active.id);
  save();
  renderEditor();
}

export function getCurrentSlide() {
  if (!state.active) return null;
  return state.active.slides[state.currentSlideIndex] || null;
}

export function setCurrentSlideIndex(index) {
  if (!state.active) return;
  state.currentSlideIndex = Math.max(0, Math.min(index, state.active.slides.length - 1));
  renderEditor();
}

export function switchMode(mode, options = {}) {
  state.mode = mode === 'editor' ? 'editor' : 'player';
  const editorEl = document.getElementById('editor');
  const playerEl = document.getElementById('player');

  if (state.mode === 'player') {
    editorEl.hidden = true;
    playerEl.hidden = false;
    startPresentation(state.active, state.currentSlideIndex, { instructor: !!options.instructor });
  } else {
    playerEl.hidden = true;
    editorEl.hidden = false;
    stopPresentation();
    renderEditor();
  }
}

let saveTimeout;
export function save() {
  clearTimeout(saveTimeout);
  setSaveStatus('saving');
  saveTimeout = setTimeout(() => {
    try {
      saveData({
        presentations: state.presentations,
        activeId: state.active?.id || null
      });
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error', e?.message || 'Save failed');
    }
  }, 300);
}

function setSaveStatus(kind, msg) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.classList.remove('saving', 'saved-just');
  if (kind === 'saving') { el.textContent = 'Saving…'; el.classList.add('saving'); }
  else if (kind === 'saved') {
    const t = new Date();
    el.textContent = `Saved · ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
    el.classList.add('saved-just');
  }
  else if (kind === 'error') { el.textContent = `⚠ ${msg || 'Error'}`; }
}

function initState() {
  const data = loadData();
  if (data && data.presentations?.length) {
    state.presentations = data.presentations;
    state.active = state.presentations.find(p => p.id === data.activeId) || state.presentations[0];
  } else {
    const first = createPresentation('My First Presentation');
    state.presentations = [first];
    state.active = first;
    save();
  }
  loadFont('Inter');
  loadAllUsedFonts(state.presentations);
}

function handleKeydown(e) {
  if (state.mode === 'player') return;

  const isEditing = e.target.closest('[contenteditable="true"]') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

  if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter') || (e.metaKey && e.key === 'Enter')) {
    e.preventDefault();
    // Shift+F5 (or Ctrl/Cmd+Shift+Enter) launches Instructor Mode — windowed
    // presentation that keeps browser tabs and the OS taskbar visible.
    switchMode('player', { instructor: e.shiftKey });
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:find'));
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:undo'));
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:redo'));
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditing) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:copy'));
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !isEditing) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:cut'));
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing) {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:paste'));
    return;
  }

  if (isEditing) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:addslide'));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:duplicateslide'));
  }
  if (e.key === 'Delete' || (e.key === 'Backspace' && !isEditing)) {
    if (document.activeElement.closest('.slide-list')) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('presenter:deleteslide'));
    } else {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('presenter:deleteelement'));
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:moveslide', { detail: -1 }));
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:moveslide', { detail: 1 }));
  }
  // Arrow key nudging for selected element
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !(e.ctrlKey || e.metaKey)) {
    const step = e.shiftKey ? 5 : 1;
    const dir = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:nudge', { detail: dir }));
  }
  // Select all elements
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('presenter:selectall'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initState();
  initMenu();
  initEditor();
  initPlayer();
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('menu:refresh', () => { rebuildMenuBar(); updateMenuTitle(); renderEditor(); });
  document.addEventListener('title:changed', () => { saveData(state); });
  document.addEventListener('presenter:toast', (e) => showToast(e.detail));

  // Allow the Speaker View popup to start/stop a presentation when the
  // editor isn't yet in player mode. The player.js channel listener only
  // runs while mode==='player', so we handle 'start' here as a fallback.
  try {
    const sbc = new BroadcastChannel('presenter-speaker');
    sbc.onmessage = (m) => {
      const d = m.data;
      if (!d || d.kind !== 'cmd') return;
      if (d.cmd === 'start') {
        const wantInstructor = !!d.instructor;
        const playerEl = document.getElementById('player');
        const isPlaying = state.mode === 'player';
        const currentlyInstructor = playerEl?.classList.contains('instructor') || false;
        if (!isPlaying) {
          switchMode('player', { instructor: wantInstructor });
        } else if (currentlyInstructor !== wantInstructor) {
          // Toggle between presenter and instructor modes mid-presentation.
          switchMode('editor');
          setTimeout(() => switchMode('player', { instructor: wantInstructor }), 50);
        }
      } else if (d.cmd === 'stop') {
        if (state.mode === 'player') switchMode('editor');
      }
    };
  } catch {}
  renderEditor();
});

// Lightweight toast renderer. Anything in the app can fire
// `presenter:toast` with a string and it'll appear bottom-centre.
let toastTimer = null;
function showToast(msg) {
  if (!msg) return;
  let host = document.getElementById('presenter-toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'presenter-toast';
    host.className = 'presenter-toast';
    document.body.appendChild(host);
  }
  host.textContent = msg;
  host.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), 2200);
}
