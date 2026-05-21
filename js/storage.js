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
    } : {
      content: '',
      objectFit: 'contain'
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

export function toast(message) {
  document.dispatchEvent(new CustomEvent('presenter:toast', { detail: message }));
}
