let monacoReady = false;
let monacoLoadPromise = null;
const editors = new Map();

export const CODE_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go',
  'rust', 'ruby', 'php', 'html', 'css', 'json', 'xml', 'yaml', 'sql',
  'shell', 'markdown', 'plaintext'
];

export const CODE_THEMES = [
  { id: 'vs-dark', name: 'Dark' },
  { id: 'vs', name: 'Light' },
  { id: 'hc-black', name: 'High Contrast' }
];

export function loadMonaco() {
  if (monacoReady) return Promise.resolve();
  if (monacoLoadPromise) return monacoLoadPromise;

  monacoLoadPromise = new Promise((resolve) => {
    if (typeof require === 'undefined' || !require.config) {
      // loader not ready yet, wait
      const check = setInterval(() => {
        if (typeof require !== 'undefined' && require.config) {
          clearInterval(check);
          initMonaco(resolve);
        }
      }, 50);
    } else {
      initMonaco(resolve);
    }
  });
  return monacoLoadPromise;
}

function initMonaco(resolve) {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
  require(['vs/editor/editor.main'], () => {
    monacoReady = true;
    resolve();
  });
}

export function createCodeEditor(container, elementId, code, language, theme, readOnly = false) {
  if (!monacoReady) return null;

  // Destroy existing if any
  destroyEditor(elementId);

  const editor = monaco.editor.create(container, {
    value: code || '',
    language: language || 'javascript',
    theme: theme || 'vs-dark',
    readOnly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: readOnly ? 'off' : 'on',
    wordWrap: 'on',
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    scrollbar: { vertical: readOnly ? 'hidden' : 'auto', horizontal: 'auto' },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: readOnly ? 'none' : 'line',
    contextmenu: !readOnly,
    tabSize: 2
  });

  editors.set(elementId, editor);
  return editor;
}

export function destroyEditor(elementId) {
  const existing = editors.get(elementId);
  if (existing) {
    existing.dispose();
    editors.delete(elementId);
  }
}

export function destroyAllEditors() {
  editors.forEach(e => e.dispose());
  editors.clear();
}

export function getEditor(elementId) {
  return editors.get(elementId) || null;
}

export function createReadOnlyHighlight(container, code, language, theme) {
  if (!monacoReady) {
    container.innerHTML = `<pre style="margin:0;padding:8px;font-family:'Fira Code',monospace;font-size:14px;overflow:auto;height:100%;white-space:pre-wrap">${escapeHtml(code)}</pre>`;
    return;
  }

  monaco.editor.colorize(code || '', language || 'javascript', { theme: theme || 'vs-dark' }).then(html => {
    container.innerHTML = `<div style="padding:8px;font-size:14px;line-height:1.5;overflow:auto;height:100%;font-family:'Fira Code',monospace">${html}</div>`;
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
