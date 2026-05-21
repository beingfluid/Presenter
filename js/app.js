import { loadData, saveData, createPresentation } from './storage.js';
import { initEditor, renderEditor } from './editor.js';
import { initPlayer, startPresentation, stopPresentation } from './player.js';
import { loadAllUsedFonts, loadFont } from './fonts.js';
import { initMenu, updateMenuTitle } from './menu.js';

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

export function switchMode(mode) {
  state.mode = mode;
  const editorEl = document.getElementById('editor');
  const playerEl = document.getElementById('player');

  if (mode === 'player') {
    editorEl.hidden = true;
    playerEl.hidden = false;
    startPresentation(state.active, state.currentSlideIndex);
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
  saveTimeout = setTimeout(() => {
    saveData({
      presentations: state.presentations,
      activeId: state.active?.id || null
    });
  }, 300);
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
    switchMode('player');
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
  document.addEventListener('menu:refresh', () => { updateMenuTitle(); renderEditor(); });
  renderEditor();
});
