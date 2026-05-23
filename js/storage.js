const STORAGE_KEY = 'presenter_data';

export function createPresentation(title = 'Untitled Presentation') {
  return {
    id: crypto.randomUUID(),
    title,
    theme: 'dark',
    transition: 'fade',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [createSlide([
      createElement('text', { x: 10, y: 30, width: 80, height: 20, content: 'Your Presentation', fontSize: 56, fontWeight: 'bold', textAlign: 'center' }),
      createElement('text', { x: 15, y: 55, width: 70, height: 12, content: 'Click to edit — drag to move — resize corners', fontSize: 22, fontWeight: 'normal', textAlign: 'center', opacity: 0.7 })
    ])]
  };
}

export function createSlide(elements = [], background = null) {
  return {
    id: crypto.randomUUID(),
    elements,
    background: background || { type: 'theme', value: '' },
    notes: ''
  };
}

export function createElement(type, overrides = {}) {
  const base = {
    id: crypto.randomUUID(),
    type,
    x: 10,
    y: 10,
    width: 40,
    height: 20,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 0,
    backgroundColor: '',
    borderWidth: 0,
    borderColor: '#ffffff',
    borderStyle: 'solid',
    borderRadius: 0,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 10,
    shadowX: 0,
    shadowY: 4,
    link: '',
    ...(type === 'text' ? {
      content: 'Text',
      fontSize: 24,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      fontColor: '',
      textAlign: 'left',
      verticalAlign: 'top',
      letterSpacing: 0,
      lineHeight: 1.4,
      textTransform: 'none',
      textShadow: false
    } : type === 'code' ? {
      content: '// Your code here\nconsole.log("Hello!");',
      language: 'javascript',
      codeTheme: 'vs-dark',
      codeFontSize: 14
    } : type === 'video' ? {
      content: '',
      autoplay: false,
      loop: false,
      muted: true
    } : type === 'shape' ? {
      content: '',
      shapeType: 'rectangle',
      fillColor: '#7c5cfc',
      strokeColor: 'transparent',
      strokeWidth: 0
    } : type === 'embed' ? {
      content: '',
      sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
    } : type === 'audio' ? {
      content: '',
      autoplay: false,
      loop: false,
      controls: true
    } : {
      content: '',
      objectFit: 'contain',
      filter: 'none'
    })
  };
  return { ...base, ...overrides };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.presentations) {
        data.presentations.forEach(migratePresentation);
      }
      return data;
    }
  } catch (e) { /* corrupted */ }
  return null;
}

function migratePresentation(pres) {
  if (!pres.slides) return;
  pres.slides.forEach(slide => {
    if (!slide.background) {
      slide.background = { type: 'theme', value: '' };
    }
    if (slide.notes === undefined) slide.notes = '';
    if (!slide.elements) {
      slide.elements = [];
      if (slide.heading) {
        slide.elements.push(createElement('text', {
          x: 10, y: 30, width: 80, height: 20,
          content: slide.heading, fontSize: 48, fontWeight: 'bold', textAlign: 'center'
        }));
      }
      if (slide.body) {
        slide.elements.push(createElement('text', {
          x: 15, y: 55, width: 70, height: 15,
          content: slide.body, fontSize: 24, fontWeight: 'normal', textAlign: 'center'
        }));
      }
      if (slide.imageUrl) {
        slide.elements.push(createElement('image', {
          x: 25, y: 20, width: 50, height: 50,
          content: slide.imageUrl, objectFit: 'contain'
        }));
      }
      delete slide.heading;
      delete slide.body;
      delete slide.imageUrl;
      delete slide.layout;
      delete slide.notes;
    }
    slide.elements.forEach(el => {
      if (el.rotation === undefined) el.rotation = 0;
      if (el.opacity === undefined) el.opacity = 1;
      if (el.locked === undefined) el.locked = false;
      if (el.zIndex === undefined) el.zIndex = 0;
      if (el.backgroundColor === undefined) el.backgroundColor = '';
      if (el.borderWidth === undefined) el.borderWidth = 0;
      if (el.borderColor === undefined) el.borderColor = '#ffffff';
      if (el.borderStyle === undefined) el.borderStyle = 'solid';
      if (el.borderRadius === undefined) el.borderRadius = 0;
      if (el.shadowEnabled === undefined) el.shadowEnabled = false;
      if (el.shadowColor === undefined) el.shadowColor = 'rgba(0,0,0,0.3)';
      if (el.shadowBlur === undefined) el.shadowBlur = 10;
      if (el.shadowX === undefined) el.shadowX = 0;
      if (el.shadowY === undefined) el.shadowY = 4;
      if (el.link === undefined) el.link = '';
      if (el.animation === undefined) el.animation = 'none';
      if (el.animationDelay === undefined) el.animationDelay = 0;
      if (el.type === 'text') {
        if (el.fontFamily === undefined) el.fontFamily = 'Inter';
        if (el.fontColor === undefined) el.fontColor = '';
        if (el.letterSpacing === undefined) el.letterSpacing = 0;
        if (el.lineHeight === undefined) el.lineHeight = 1.4;
        if (el.textTransform === undefined) el.textTransform = 'none';
        if (el.textShadow === undefined) el.textShadow = false;
        if (el.verticalAlign === undefined) el.verticalAlign = 'top';
      }
      if (el.type === 'shape') {
        if (el.shapeType === undefined) el.shapeType = 'rectangle';
        if (el.fillColor === undefined) el.fillColor = el.backgroundColor || '#7c5cfc';
        if (el.strokeColor === undefined) el.strokeColor = 'transparent';
        if (el.strokeWidth === undefined) el.strokeWidth = 0;
      }
      if (el.type === 'embed' && el.sandbox === undefined) {
        el.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation';
      }
      if (el.type === 'video') {
        if (el.autoplay === undefined) el.autoplay = false;
        if (el.loop === undefined) el.loop = false;
        if (el.muted === undefined) el.muted = true;
      }
      if (el.type === 'audio') {
        if (el.autoplay === undefined) el.autoplay = false;
        if (el.loop === undefined) el.loop = false;
        if (el.controls === undefined) el.controls = true;
      }
    });
  });
}

export function saveData(data) {
  data.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    toast('Storage full — export your presentations to avoid data loss.');
  }
}

export function exportPresentation(presentation) {
  const blob = new Blob([JSON.stringify(presentation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importPresentation(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.slides || !Array.isArray(data.slides)) {
          reject(new Error('Invalid presentation file'));
          return;
        }
        if (!data.id) data.id = crypto.randomUUID();
        migratePresentation(data);
        resolve(data);
      } catch (e) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.readAsText(file);
  });
}

// Read a single image file as a data URL.
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Import a presentation along with companion image files. The user may select
// a single .json plus any number of image files; references inside the JSON to
// `./images/foo.png` or bare `foo.png` are rewritten to the matching image's
// data URL so the imported deck works fully offline / on any host.
export async function importPresentationWithAssets(fileList) {
  const files = Array.from(fileList || []);
  const jsonFile = files.find(f => /\.json$/i.test(f.name));
  if (!jsonFile) throw new Error('No .json file selected');

  // Build name → dataURL map for non-JSON files.
  const assetMap = {};
  for (const f of files) {
    if (f === jsonFile) continue;
    if (!/^image\/|^video\/|^audio\//.test(f.type) && !/\.(png|jpe?g|gif|webp|svg|mp4|webm|ogg|mp3|wav)$/i.test(f.name)) continue;
    assetMap[f.name.toLowerCase()] = await fileToDataURL(f);
  }

  const pres = await importPresentation(jsonFile);
  const warnings = [];
  let resolved = 0;
  for (const slide of pres.slides) {
    if (slide.background?.type === 'image' && typeof slide.background.value === 'string') {
      const repl = resolveAsset(slide.background.value, assetMap);
      if (repl !== slide.background.value) { slide.background.value = repl; resolved++; }
      else if (isProblematic(slide.background.value)) warnings.push(slide.background.value);
    }
    for (const el of slide.elements) {
      if ((el.type === 'image' || el.type === 'video' || el.type === 'audio') && el.content) {
        const repl = resolveAsset(el.content, assetMap);
        if (repl !== el.content) { el.content = repl; resolved++; }
        else if (isProblematic(el.content)) warnings.push(el.content);
      }
    }
  }
  return { presentation: pres, resolved, warnings };
}

function resolveAsset(src, map) {
  if (!src || src.startsWith('data:') || src.startsWith('http:') || src.startsWith('https:')) return src;
  // Strip leading ./ and folder prefixes; try basename match against the map.
  const cleaned = src.replace(/^\.?\//, '').split('?')[0];
  const base = cleaned.split('/').pop().toLowerCase();
  if (map[cleaned.toLowerCase()]) return map[cleaned.toLowerCase()];
  if (map[base]) return map[base];
  return src;
}

function isProblematic(src) {
  if (!src) return false;
  if (src.startsWith('file://')) return true;
  // Bare relative paths only work if the host has them — flag for the user.
  if (!src.startsWith('data:') && !src.startsWith('http:') && !src.startsWith('https:') && !src.startsWith('./Presentations/')) return true;
  return false;
}

export function toast(message) {
  document.dispatchEvent(new CustomEvent('presenter:toast', { detail: message }));
}

// Recently-opened presentation IDs (most recent first).
const RECENTS_KEY = 'presenter_recents';
const RECENTS_MAX = 8;
export function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
}
export function pushRecent(id) {
  if (!id) return;
  const list = getRecents().filter(i => i !== id);
  list.unshift(id);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, RECENTS_MAX)));
}
