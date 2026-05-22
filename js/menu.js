import { getState, setActivePresentation, switchMode, save, getCurrentSlide } from './app.js';
import { createPresentation, exportPresentation, importPresentation, toast } from './storage.js';

let menuBarEl;
let openMenu = null;

export function initMenu() {
  menuBarEl = document.getElementById('menu-bar');
  menuBarEl.innerHTML = buildMenuBar();
  menuBarEl.addEventListener('click', handleMenuClick);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#menu-bar')) closeMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenus();
  });
}

function buildMenuBar() {
  const state = getState();
  return `
    <div class="menu-left">
      <div class="menu-item" data-menu="file"><span class="menu-trigger">File</span>
        <div class="menu-dropdown" data-dropdown="file">
          <button data-cmd="new-presentation">New Presentation</button>
          <button data-cmd="open-presentation">Open...</button>
          <button data-cmd="open-library">Open from Library...</button>
          <div class="menu-divider"></div>
          <button data-cmd="rename-presentation">Rename</button>
          <button data-cmd="duplicate-presentation">Duplicate Presentation</button>
          <div class="menu-divider"></div>
          <button data-cmd="import">Import JSON</button>
          <button data-cmd="export">Export JSON</button>
          <button data-cmd="export-html">Export as Standalone HTML</button>
          <div class="menu-divider"></div>
          <button data-cmd="delete-presentation" class="menu-danger">Delete Presentation</button>
        </div>
      </div>
      <div class="menu-item" data-menu="edit"><span class="menu-trigger">Edit</span>
        <div class="menu-dropdown" data-dropdown="edit">
          <button data-cmd="undo">Undo <span class="shortcut">Ctrl+Z</span></button>
          <button data-cmd="redo">Redo <span class="shortcut">Ctrl+Y</span></button>
          <div class="menu-divider"></div>
          <button data-cmd="cut">Cut <span class="shortcut">Ctrl+X</span></button>
          <button data-cmd="copy">Copy <span class="shortcut">Ctrl+C</span></button>
          <button data-cmd="paste">Paste <span class="shortcut">Ctrl+V</span></button>
          <button data-cmd="duplicate-el">Duplicate <span class="shortcut">Ctrl+D</span></button>
          <button data-cmd="delete-el">Delete <span class="shortcut">Del</span></button>
          <div class="menu-divider"></div>
          <button data-cmd="select-all">Select All <span class="shortcut">Ctrl+A</span></button>
        </div>
      </div>
      <div class="menu-item" data-menu="view"><span class="menu-trigger">View</span>
        <div class="menu-dropdown" data-dropdown="view">
          <button data-cmd="toggle-grid">Toggle Grid</button>
          <button data-cmd="toggle-rulers">Toggle Rulers</button>
          <div class="menu-divider"></div>
          <button data-cmd="zoom-in">Zoom In</button>
          <button data-cmd="zoom-out">Zoom Out</button>
          <button data-cmd="zoom-fit">Zoom to Fit</button>
          <div class="menu-divider"></div>
          <button data-cmd="slide-sorter">Slide Sorter</button>
          <button data-cmd="toggle-layers">Layers Panel</button>
          <button data-cmd="toggle-properties">Toggle Properties Panel</button>
        </div>
      </div>
      <div class="menu-item" data-menu="insert"><span class="menu-trigger">Insert</span>
        <div class="menu-dropdown" data-dropdown="insert">
          <button data-cmd="insert-text">Text Box</button>
          <button data-cmd="insert-image">Image</button>
          <button data-cmd="insert-code">Code Block</button>
          <button data-cmd="insert-shape">Shape</button>
          <div class="menu-divider"></div>
          <button data-cmd="insert-slide">New Slide <span class="shortcut">Ctrl+N</span></button>
          <button data-cmd="duplicate-slide">Duplicate Slide</button>
        </div>
      </div>
      <div class="menu-item" data-menu="format"><span class="menu-trigger">Format</span>
        <div class="menu-dropdown" data-dropdown="format">
          <button data-cmd="bring-front">Bring to Front</button>
          <button data-cmd="send-back">Send to Back</button>
          <div class="menu-divider"></div>
          <button data-cmd="align-h-center">Align Center (H)</button>
          <button data-cmd="align-v-center">Align Center (V)</button>
          <div class="menu-divider"></div>
          <button data-cmd="lock-element">Lock/Unlock Element</button>
        </div>
      </div>
      <div class="menu-item" data-menu="slide"><span class="menu-trigger">Slide</span>
        <div class="menu-dropdown" data-dropdown="slide">
          <button data-cmd="slide-bg">Change Background</button>
          <button data-cmd="slide-aspect-16-9">Aspect 16:9</button>
          <button data-cmd="slide-aspect-4-3">Aspect 4:3</button>
          <button data-cmd="slide-aspect-1-1">Aspect 1:1</button>
          <div class="menu-divider"></div>
          <button data-cmd="slide-number-toggle">Toggle Slide Numbers</button>
          <button data-cmd="apply-template">Apply Template...</button>
        </div>
      </div>
      <div class="menu-item" data-menu="present"><span class="menu-trigger">Present</span>
        <div class="menu-dropdown" data-dropdown="present">
          <button data-cmd="present-start">From Beginning <span class="shortcut">F5</span></button>
          <button data-cmd="present-current">From Current Slide</button>
          <div class="menu-divider"></div>
          <button data-cmd="present-rehearse">Rehearse (with timer)</button>
        </div>
      </div>
    </div>
    <div class="menu-center">
      <input type="text" class="title-input" id="presentation-title" value="${state.active?.title || ''}" spellcheck="false">
    </div>
    <div class="menu-right">
      <span class="save-status" id="save-status">Saved</span>
    </div>
  `;
}

export function updateMenuTitle() {
  const input = document.getElementById('presentation-title');
  if (input) input.value = getState().active?.title || '';
}

function handleMenuClick(e) {
  const trigger = e.target.closest('.menu-trigger');
  const cmd = e.target.closest('[data-cmd]');
  const titleInput = e.target.closest('.title-input');

  if (titleInput) {
    titleInput.addEventListener('change', () => {
      const state = getState();
      if (state.active) { state.active.title = titleInput.value; save(); }
    });
    return;
  }

  if (trigger) {
    e.stopPropagation();
    const menuItem = trigger.closest('.menu-item');
    const menuName = menuItem.dataset.menu;
    if (openMenu === menuName) {
      closeMenus();
    } else {
      closeMenus();
      openMenu = menuName;
      menuItem.classList.add('open');
    }
    return;
  }

  if (cmd) {
    e.stopPropagation();
    closeMenus();
    executeCommand(cmd.dataset.cmd);
  }
}

function closeMenus() {
  openMenu = null;
  menuBarEl.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'));
}

function executeCommand(cmd) {
  const state = getState();

  switch (cmd) {
    // File
    case 'new-presentation': {
      const title = prompt('Presentation name:', 'Untitled');
      if (!title) return;
      const pres = createPresentation(title);
      state.presentations.push(pres);
      state.active = pres;
      state.currentSlideIndex = 0;
      save();
      dispatch('menu:refresh');
      break;
    }
    case 'open-presentation': {
      const list = state.presentations.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
      const choice = prompt(`Open presentation:\n${list}\nEnter number:`, '1');
      if (!choice) return;
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < state.presentations.length) {
        setActivePresentation(state.presentations[idx].id);
        updateMenuTitle();
      }
      break;
    }
    case 'rename-presentation': {
      const name = prompt('New name:', state.active?.title);
      if (name && state.active) { state.active.title = name; save(); updateMenuTitle(); }
      break;
    }
    case 'duplicate-presentation': {
      if (!state.active) return;
      const copy = JSON.parse(JSON.stringify(state.active));
      copy.id = crypto.randomUUID();
      copy.title += ' (copy)';
      copy.slides.forEach(s => { s.id = crypto.randomUUID(); s.elements.forEach(e => { e.id = crypto.randomUUID(); }); });
      state.presentations.push(copy);
      state.active = copy;
      state.currentSlideIndex = 0;
      save();
      dispatch('menu:refresh');
      toast('Presentation duplicated');
      break;
    }
    case 'delete-presentation': {
      if (state.presentations.length <= 1) { toast('Cannot delete the only presentation'); return; }
      if (!confirm(`Delete "${state.active?.title}"?`)) return;
      state.presentations = state.presentations.filter(p => p.id !== state.active.id);
      state.active = state.presentations[0];
      state.currentSlideIndex = 0;
      save();
      dispatch('menu:refresh');
      break;
    }
    case 'open-library': {
      openLibraryPanel();
      break;
    }
    case 'import': {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async () => {
        try {
          const pres = await importPresentation(input.files[0]);
          state.presentations.push(pres);
          state.active = pres;
          state.currentSlideIndex = 0;
          save();
          dispatch('menu:refresh');
          toast('Imported!');
        } catch (e) { toast(e.message); }
      };
      input.click();
      break;
    }
    case 'export': exportPresentation(state.active); break;
    case 'export-html': exportStandaloneHTML(); break;

    // Edit
    case 'undo': dispatch('presenter:undo'); break;
    case 'redo': dispatch('presenter:redo'); break;
    case 'cut': dispatch('presenter:cut'); break;
    case 'copy': dispatch('presenter:copy'); break;
    case 'paste': dispatch('presenter:paste'); break;
    case 'duplicate-el': dispatch('ribbon:duplicate'); break;
    case 'delete-el': dispatch('presenter:deleteelement'); break;
    case 'select-all': dispatch('presenter:selectall'); break;

    // View
    case 'toggle-grid': dispatch('view:toggle-grid'); break;
    case 'toggle-rulers': dispatch('view:toggle-rulers'); break;
    case 'zoom-in': dispatch('view:zoom', 10); break;
    case 'zoom-out': dispatch('view:zoom', -10); break;
    case 'zoom-fit': dispatch('view:zoom-fit'); break;
    case 'slide-sorter': dispatch('view:slide-sorter'); break;
    case 'toggle-layers': dispatch('view:toggle-layers'); break;
    case 'toggle-properties': dispatch('view:toggle-properties'); break;

    // Insert
    case 'insert-text': dispatch('ribbon:add-text'); break;
    case 'insert-image': dispatch('ribbon:add-image'); break;
    case 'insert-code': dispatch('ribbon:add-code'); break;
    case 'insert-shape': dispatch('ribbon:add-shape'); break;
    case 'insert-slide': dispatch('presenter:addslide'); break;
    case 'duplicate-slide': dispatch('presenter:duplicateslide'); break;

    // Format
    case 'bring-front': dispatch('format:bring-front'); break;
    case 'send-back': dispatch('format:send-back'); break;
    case 'align-h-center': dispatch('format:align-h-center'); break;
    case 'align-v-center': dispatch('format:align-v-center'); break;
    case 'lock-element': dispatch('format:lock'); break;

    // Slide
    case 'slide-bg': dispatch('view:slide-bg'); break;
    case 'slide-aspect-16-9': dispatch('slide:aspect', '16:9'); break;
    case 'slide-aspect-4-3': dispatch('slide:aspect', '4:3'); break;
    case 'slide-aspect-1-1': dispatch('slide:aspect', '1:1'); break;
    case 'slide-number-toggle': dispatch('slide:numbers'); break;
    case 'apply-template': dispatch('slide:apply-template'); break;

    // Present
    case 'present-start':
      state.currentSlideIndex = 0;
      switchMode('player');
      break;
    case 'present-current':
      switchMode('player');
      break;
    case 'present-rehearse':
      switchMode('player');
      break;
  }
}

function exportStandaloneHTML() {
  const state = getState();
  if (!state.active) return;
  const data = JSON.stringify(state.active);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${state.active.title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;overflow:hidden;font-family:sans-serif}
.slide{position:absolute;inset:0;display:none}.slide.active{display:block}
.el{position:absolute;display:flex;align-items:center;overflow:hidden}
.el-text{width:100%;white-space:pre-wrap;word-wrap:break-word}
pre{margin:0;padding:12px;overflow:auto;height:100%;white-space:pre-wrap;font-family:monospace}
#controls{position:fixed;bottom:10px;right:10px;color:#fff;opacity:0.5;font-size:12px;z-index:99}
</style></head><body>
<div id="slides"></div><div id="controls">&#8592; &#8594; to navigate | <span id="counter"></span></div>
<script>
const pres=${data};let idx=0;
function render(){const c=document.getElementById('slides');c.innerHTML='';
pres.slides.forEach((s,i)=>{const d=document.createElement('div');d.className='slide'+(i===idx?' active':'');
const bg=s.background;if(bg&&bg.type!=='theme'){if(bg.type==='color')d.style.background=bg.value;
else if(bg.type==='gradient')d.style.background=bg.value;
else if(bg.type==='image')d.style.background='url('+bg.value+') center/cover';}
else d.style.background='#1a1a2e';
s.elements.forEach(el=>{const e=document.createElement('div');e.className='el';
let st='left:'+el.x+'%;top:'+el.y+'%;width:'+el.width+'%;height:'+el.height+'%;opacity:'+el.opacity+';';
if(el.borderRadius)st+='border-radius:'+el.borderRadius+'px;';
if(el.backgroundColor)st+='background:'+el.backgroundColor+';';
if(el.borderWidth)st+='border:'+el.borderWidth+'px '+el.borderStyle+' '+el.borderColor+';';
e.style.cssText=st;
if(el.type==='text'){e.innerHTML='<div class="el-text" style="font-size:'+el.fontSize+'px;font-weight:'+el.fontWeight+';text-align:'+el.textAlign+';color:'+(el.fontColor||'#eee')+'">'+el.content+'</div>';}
else if(el.type==='code'){e.innerHTML='<pre style="background:#1e1e1e;color:#d4d4d4;font-size:'+(el.codeFontSize||14)+'px">'+el.content.replace(/</g,'&lt;')+'</pre>';}
else if(el.type==='image'&&el.content){e.innerHTML='<img src="'+el.content+'" style="width:100%;height:100%;object-fit:'+(el.objectFit||'contain')+'">';}
d.appendChild(e);});c.appendChild(d);});
document.getElementById('counter').textContent=(idx+1)+'/'+pres.slides.length;}
render();
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' '){idx=Math.min(idx+1,pres.slides.length-1);render();}
if(e.key==='ArrowLeft'){idx=Math.max(idx-1,0);render();}});
document.addEventListener('click',e=>{const r=document.body.getBoundingClientRect();
if(e.clientX>r.width*0.5){idx=Math.min(idx+1,pres.slides.length-1);}else{idx=Math.max(idx-1,0);}render();});
<\/script></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.active.title.replace(/[^a-z0-9]/gi, '_')}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported standalone HTML');
}

async function openLibraryPanel() {
  let panel = document.getElementById('library-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'library-panel';
    panel.className = 'floating-panel';
    document.getElementById('editor').appendChild(panel);
  }

  panel.innerHTML = '<h3>Presentation Library</h3><p style="color:var(--editor-text-muted);font-size:12px">Loading...</p>';
  panel.hidden = false;

  try {
    const res = await fetch('Presentations/manifest.json');
    if (!res.ok) throw new Error('No manifest found');
    const manifest = await res.json();

    panel.innerHTML = `
      <h3>Presentation Library</h3>
      <div class="library-grid">
        ${manifest.map(item => `
          <button class="library-item" data-file="${item.file}">
            <span class="library-icon">&#128196;</span>
            <span class="library-title">${item.title}</span>
          </button>
        `).join('')}
      </div>
    `;

    panel.querySelectorAll('.library-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const file = btn.dataset.file;
        try {
          const r = await fetch(`Presentations/${file}`);
          if (!r.ok) throw new Error(`Failed to load ${file}`);
          const data = await r.json();
          if (!data.slides || !Array.isArray(data.slides)) throw new Error('Invalid presentation');
          if (!data.id) data.id = crypto.randomUUID();
          const state = getState();
          const existing = state.presentations.findIndex(p => p.id === data.id);
          if (existing !== -1) {
            state.presentations[existing] = data;
          } else {
            state.presentations.push(data);
          }
          state.active = data;
          state.currentSlideIndex = 0;
          save();
          dispatch('menu:refresh');
          toast(`Opened: ${data.title}`);
          panel.hidden = true;
        } catch (e) {
          toast(e.message);
        }
      });
    });
  } catch (e) {
    panel.innerHTML = `<h3>Presentation Library</h3><p style="color:var(--editor-danger);font-size:12px">Could not load library: ${e.message}</p>`;
  }

  setTimeout(() => {
    const handler = (e) => {
      if (panel && !panel.contains(e.target)) panel.hidden = true;
    };
    document.addEventListener('mousedown', handler, { once: true });
  }, 50);
}

function dispatch(event, detail = null) {
  document.dispatchEvent(new CustomEvent(event, { detail }));
}
