import { createElement } from './storage.js';

const CUSTOM_TEMPLATES_KEY = 'presenter_custom_templates';

export const TEMPLATES = [
  {
    name: 'Title Slide',
    icon: '&#9646;',
    build: () => [
      createElement('text', { x: 10, y: 30, width: 80, height: 20, content: 'Presentation Title', fontSize: 56, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 20, y: 58, width: 60, height: 10, content: 'Subtitle or tagline goes here', fontSize: 22, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.7 })
    ]
  },
  {
    name: 'Section Header',
    icon: '&#9776;',
    build: () => [
      createElement('text', { x: 8, y: 40, width: 84, height: 18, content: 'Section Title', fontSize: 52, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 8, y: 62, width: 50, height: 5, content: '01', fontSize: 18, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Fira Code', opacity: 0.5 })
    ]
  },
  {
    name: 'Content',
    icon: '&#9783;',
    build: () => [
      createElement('text', { x: 8, y: 8, width: 84, height: 12, content: 'Slide Title', fontSize: 36, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 8, y: 25, width: 84, height: 65, content: '• First point goes here\n• Second important point\n• Third key takeaway\n• Final thought', fontSize: 22, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter', lineHeight: 1.8 })
    ]
  },
  {
    name: 'Two Column',
    icon: '&#9635;',
    build: () => [
      createElement('text', { x: 5, y: 8, width: 90, height: 12, content: 'Comparison', fontSize: 36, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 5, y: 25, width: 42, height: 65, content: 'Left Column\n\n• Point one\n• Point two\n• Point three', fontSize: 18, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 53, y: 25, width: 42, height: 65, content: 'Right Column\n\n• Point one\n• Point two\n• Point three', fontSize: 18, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter' })
    ]
  },
  {
    name: 'Left Image + Text',
    icon: '&#9636;',
    build: () => [
      createElement('image', { x: 3, y: 5, width: 45, height: 90, content: '', objectFit: 'cover', borderRadius: 12 }),
      createElement('text', { x: 53, y: 15, width: 43, height: 14, content: 'Title Here', fontSize: 34, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 53, y: 35, width: 43, height: 50, content: 'Description text that provides context and explains the image content in detail.', fontSize: 18, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter', lineHeight: 1.7 })
    ]
  },
  {
    name: 'Right Image + Text',
    icon: '&#9637;',
    build: () => [
      createElement('text', { x: 5, y: 15, width: 43, height: 14, content: 'Title Here', fontSize: 34, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 5, y: 35, width: 43, height: 50, content: 'Description text that provides context and explains the image content in detail.', fontSize: 18, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter', lineHeight: 1.7 }),
      createElement('image', { x: 52, y: 5, width: 45, height: 90, content: '', objectFit: 'cover', borderRadius: 12 })
    ]
  },
  {
    name: 'Image + Title',
    icon: '&#128444;',
    build: () => [
      createElement('image', { x: 5, y: 5, width: 45, height: 90, content: '', objectFit: 'cover', borderRadius: 12 }),
      createElement('text', { x: 55, y: 35, width: 40, height: 20, content: 'Image Title', fontSize: 42, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter' }),
      createElement('text', { x: 55, y: 58, width: 40, height: 5, content: 'Brief caption', fontSize: 16, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter', opacity: 0.6 })
    ]
  },
  {
    name: 'Three Columns',
    icon: '&#9638;',
    build: () => [
      createElement('text', { x: 5, y: 5, width: 90, height: 12, content: 'Three Points', fontSize: 32, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 3, y: 22, width: 30, height: 70, content: 'Column 1\n\nDetail text for the first column goes here.', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 35, y: 22, width: 30, height: 70, content: 'Column 2\n\nDetail text for the second column goes here.', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 67, y: 22, width: 30, height: 70, content: 'Column 3\n\nDetail text for the third column goes here.', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter' })
    ]
  },
  {
    name: 'Full Image',
    icon: '&#9679;',
    build: () => [
      createElement('image', { x: 0, y: 0, width: 100, height: 100, content: '', objectFit: 'cover' }),
      createElement('text', { x: 5, y: 75, width: 60, height: 15, content: 'Caption Text', fontSize: 28, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter', textShadow: true })
    ]
  },
  {
    name: 'Quote',
    icon: '&#10078;',
    build: () => [
      createElement('text', { x: 10, y: 20, width: 80, height: 45, content: '"The only way to do great work is to love what you do."', fontSize: 36, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Playfair Display', lineHeight: 1.6 }),
      createElement('text', { x: 30, y: 72, width: 40, height: 8, content: '— Steve Jobs', fontSize: 18, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.6 })
    ]
  },
  {
    name: 'Stats',
    icon: '&#9733;',
    build: () => [
      createElement('text', { x: 5, y: 8, width: 90, height: 10, content: 'Key Metrics', fontSize: 28, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 5, y: 30, width: 28, height: 30, content: '99%', fontSize: 52, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 5, y: 58, width: 28, height: 10, content: 'Uptime', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.7 }),
      createElement('text', { x: 36, y: 30, width: 28, height: 30, content: '2.5M', fontSize: 52, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 36, y: 58, width: 28, height: 10, content: 'Users', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.7 }),
      createElement('text', { x: 67, y: 30, width: 28, height: 30, content: '4.8', fontSize: 52, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 67, y: 58, width: 28, height: 10, content: 'Rating', fontSize: 16, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.7 })
    ]
  },
  {
    name: 'Thank You',
    icon: '&#9829;',
    build: () => [
      createElement('text', { x: 10, y: 30, width: 80, height: 25, content: 'Thank You!', fontSize: 64, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter' }),
      createElement('text', { x: 20, y: 60, width: 60, height: 10, content: 'Questions? Reach out at hello@email.com', fontSize: 18, fontWeight: 'normal', textAlign: 'center', fontFamily: 'Inter', opacity: 0.6 })
    ]
  },
  {
    name: 'Code Only',
    icon: '&#60;/&#62;',
    build: () => [
      createElement('text', { x: 5, y: 3, width: 60, height: 8, content: 'Code Title', fontSize: 28, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter', verticalAlign: 'middle' }),
      createElement('code', { x: 3, y: 14, width: 94, height: 82, content: '// Your code here\nfunction example() {\n  const data = fetchData();\n  return process(data);\n}', language: 'javascript', codeTheme: 'vs-dark', codeFontSize: 16, borderRadius: 8 })
    ]
  },
  {
    name: 'Code + Notes',
    icon: '&#9998;',
    build: () => [
      createElement('text', { x: 3, y: 3, width: 60, height: 8, content: 'Code Example', fontSize: 28, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter', verticalAlign: 'middle' }),
      createElement('code', { x: 3, y: 14, width: 58, height: 82, content: '// Example code\nconst result = await fetch(url);\nconst data = await result.json();\nconsole.log(data);', language: 'javascript', codeTheme: 'vs-dark', codeFontSize: 15, borderRadius: 8 }),
      createElement('text', { x: 64, y: 14, width: 33, height: 82, content: '&#8226; Fetch data from API\n\n&#8226; Parse JSON response\n\n&#8226; Log output to console\n\n&#8226; Uses async/await syntax', fontSize: 16, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Inter', lineHeight: 1.6, verticalAlign: 'top' })
    ]
  },
  {
    name: 'Code Comparison',
    icon: '&#8644;',
    build: () => [
      createElement('text', { x: 5, y: 2, width: 90, height: 8, content: 'Before vs After', fontSize: 28, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter', verticalAlign: 'middle' }),
      createElement('text', { x: 3, y: 11, width: 46, height: 5, content: 'Before', fontSize: 14, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter', fontColor: '#ff6b6b' }),
      createElement('code', { x: 3, y: 17, width: 46, height: 78, content: '// Old approach\nvar data = [];\nfor (var i = 0; i < items.length; i++) {\n  data.push(items[i].name);\n}', language: 'javascript', codeTheme: 'vs-dark', codeFontSize: 14, borderRadius: 8 }),
      createElement('text', { x: 51, y: 11, width: 46, height: 5, content: 'After', fontSize: 14, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Inter', fontColor: '#4ecdc4' }),
      createElement('code', { x: 51, y: 17, width: 46, height: 78, content: '// Modern approach\nconst data = items.map(item => item.name);', language: 'javascript', codeTheme: 'vs-dark', codeFontSize: 14, borderRadius: 8 })
    ]
  },
  {
    name: 'Code + Output',
    icon: '&#9654;',
    build: () => [
      createElement('text', { x: 3, y: 3, width: 60, height: 8, content: 'Demo', fontSize: 28, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Inter', verticalAlign: 'middle' }),
      createElement('code', { x: 3, y: 14, width: 94, height: 55, content: '// Script\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));', language: 'javascript', codeTheme: 'vs-dark', codeFontSize: 15, borderRadius: 8 }),
      createElement('text', { x: 3, y: 72, width: 94, height: 24, content: '> Hello, World!', fontSize: 16, fontWeight: 'normal', textAlign: 'left', fontFamily: 'Fira Code', verticalAlign: 'top', backgroundColor: '#0d1117', fontColor: '#4ecdc4', borderRadius: 8 })
    ]
  },
  {
    name: 'Blank',
    icon: '&#9634;',
    build: () => []
  }
];

export function getCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomTemplate(name, elements, background) {
  const templates = getCustomTemplates();
  templates.push({
    id: crypto.randomUUID(),
    name,
    elements: elements.map(el => {
      const copy = { ...el };
      delete copy.id;
      return copy;
    }),
    background: background ? { ...background } : { type: 'theme', value: '' }
  });
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

export function deleteCustomTemplate(id) {
  const templates = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}
