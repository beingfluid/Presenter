import { getState, switchMode } from './app.js';
import { loadFont } from './fonts.js';
import { loadMonaco } from './code.js';

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let playerEl, slideContainer, progressBar, slideCounter;
let timerEl, notesEl, nextPreviewEl, slideNavEl;
let currentIndex = 0;
let slides = [];
let transition = 'fade';
let theme = 'dark';
let inactivityTimer;
let presentationStartTime = null;
let timerInterval = null;
let laserActive = false;
let laserEl = null;
let overviewOpen = false;

export function initPlayer() {
  playerEl = document.getElementById('player');
  slideContainer = document.getElementById('slide-container');
  progressBar = document.getElementById('progress-bar');
  slideCounter = document.getElementById('slide-counter');
  timerEl = document.getElementById('player-timer');
  notesEl = document.getElementById('player-notes');
  nextPreviewEl = document.getElementById('player-next');
  slideNavEl = document.getElementById('slide-nav');

  playerEl.addEventListener('click', handleClick);
  playerEl.addEventListener('mousemove', handleMouseMovePlayer);
  document.addEventListener('keydown', handlePlayerKeydown);
}

export function startPresentation(presentation, startIndex = 0) {
  if (!presentation || !presentation.slides.length) return;

  slides = presentation.slides;
  transition = presentation.transition;
  theme = presentation.theme;
  currentIndex = startIndex;

  playerEl.dataset.theme = theme;
  playerEl.classList.add(`transition-${transition}`);

  // Pre-load Monaco if any slides have code
  const hasCode = slides.some(s => s.elements.some(e => e.type === 'code'));
  if (hasCode) loadMonaco();

  renderSlide(currentIndex, 'none');
  updateProgress();
  showControls();
  startTimer();
  updateNotes();
  updateNextPreview();

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function stopPresentation() {
  playerEl.classList.remove(`transition-${transition}`);
  playerEl.removeAttribute('data-theme');
  slideContainer.innerHTML = '';
  stopTimer();
  overviewOpen = false;
  laserActive = false;
  if (laserEl) { laserEl.remove(); laserEl = null; }
  const overview = document.getElementById('slide-overview');
  if (overview) overview.hidden = true;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// Timer
function startTimer() {
  presentationStartTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimer() {
  if (!timerEl || !presentationStartTime) return;
  const elapsed = Math.floor((Date.now() - presentationStartTime) / 1000);
  const min = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const sec = (elapsed % 60).toString().padStart(2, '0');
  timerEl.textContent = `${min}:${sec}`;
}

// Notes
function updateNotes() {
  if (!notesEl) return;
  const slide = slides[currentIndex];
  const notes = slide?.notes || '';
  notesEl.textContent = notes || 'No notes for this slide';
  notesEl.classList.toggle('empty-notes', !notes);
}

// Next slide preview
function updateNextPreview() {
  if (!nextPreviewEl) return;
  if (currentIndex < slides.length - 1) {
    const next = slides[currentIndex + 1];
    nextPreviewEl.innerHTML = `<div class="next-label">Next</div><div class="next-thumb">${renderSlideThumb(next)}</div>`;
  } else {
    nextPreviewEl.innerHTML = '<div class="next-label">End</div>';
  }
}

function renderSlideThumb(slide) {
  if (!slide) return '';
  const elements = slide.elements.map(el => {
    if (el.type === 'text') return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;font-size:4px;overflow:hidden">${(el.content || '').substring(0, 20)}</div>`;
    return '';
  }).join('');
  return `<div class="next-slide-mini">${elements}</div>`;
}

// Slide rendering
function renderSlide(index, direction = 'none') {
  const slide = slides[index];
  if (!slide) return;

  const newEl = buildSlideElement(slide);

  if (direction === 'none' || transition === 'none') {
    slideContainer.innerHTML = '';
    slideContainer.appendChild(newEl);
    animateElements(newEl, slide);
    return;
  }

  const oldEl = slideContainer.querySelector('.slide-active');
  if (oldEl) {
    oldEl.classList.remove('slide-active');
    oldEl.classList.add('slide-exit', direction === 'forward' ? 'exit-left' : 'exit-right');
    oldEl.addEventListener('animationend', () => oldEl.remove(), { once: true });
  }

  newEl.classList.add('slide-enter', direction === 'forward' ? 'enter-right' : 'enter-left');
  slideContainer.appendChild(newEl);
  newEl.addEventListener('animationend', () => {
    newEl.classList.remove('slide-enter', 'enter-right', 'enter-left');
  }, { once: true });
  animateElements(newEl, slide);
}

function animateElements(slideEl, slide) {
  const elements = slideEl.querySelectorAll('.player-element');
  elements.forEach((div, i) => {
    const item = slide.elements[i];
    if (item && item.animation && item.animation !== 'none') {
      div.style.opacity = '0';
      const delay = (item.animationDelay || 0) + i * 100;
      setTimeout(() => {
        div.style.opacity = '';
        div.classList.add(`anim-${item.animation}`);
        div.addEventListener('animationend', () => {
          div.classList.remove(`anim-${item.animation}`);
        }, { once: true });
      }, delay);
    }
  });
}

function buildSlideElement(slide) {
  const el = document.createElement('section');
  el.className = 'player-slide slide-active';

  const bg = slide.background;
  if (bg && bg.type !== 'theme') {
    if (bg.type === 'color') el.style.background = bg.value;
    else if (bg.type === 'gradient') el.style.background = bg.value;
    else if (bg.type === 'image') el.style.background = `url(${bg.value}) center/cover no-repeat`;
  }

  // Scale factor: editor reference width is 960px, scale fonts to viewport
  const vw = window.innerWidth;
  const scaleFactor = vw / 960;

  slide.elements.forEach(item => {
    const div = document.createElement('div');
    div.className = 'player-element';
    let style = `left:${item.x}%;top:${item.y}%;width:${item.width}%;height:${item.height}%;opacity:${item.opacity};z-index:${item.zIndex || 0};`;

    if (item.rotation) style += `transform:rotate(${item.rotation}deg);`;
    if (item.backgroundColor) style += `background-color:${item.backgroundColor};`;
    if (item.borderWidth) style += `border:${Math.round(item.borderWidth * scaleFactor)}px ${item.borderStyle} ${item.borderColor};`;
    if (item.borderRadius) style += `border-radius:${Math.round(item.borderRadius * scaleFactor)}px;`;
    if (item.shadowEnabled) style += `box-shadow:${Math.round(item.shadowX * scaleFactor)}px ${Math.round(item.shadowY * scaleFactor)}px ${Math.round(item.shadowBlur * scaleFactor)}px ${item.shadowColor};`;
    if (item.link) style += `cursor:pointer;`;

    div.style.cssText = style;

    if (item.link) {
      div.dataset.link = item.link;
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(item.link, '_blank', 'noopener');
      });
    }

    if (item.type === 'text') {
      loadFont(item.fontFamily);
      const vAlign = item.verticalAlign || 'top';
      const justifyContent = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';
      const scaledFontSize = Math.round(item.fontSize * scaleFactor);
      const scaledLetterSpacing = Math.round((item.letterSpacing || 0) * scaleFactor);
      let textStyle = `font-size:${scaledFontSize}px;font-weight:${item.fontWeight};text-align:${item.textAlign};font-family:'${item.fontFamily}',sans-serif;letter-spacing:${scaledLetterSpacing}px;line-height:${item.lineHeight || 1.4};text-transform:${item.textTransform || 'none'};`;
      if (item.fontColor) textStyle += `color:${item.fontColor};`;
      if (item.textShadow) textStyle += `text-shadow:2px 2px 4px rgba(0,0,0,0.5);`;
      div.style.cssText += `justify-content:${justifyContent};`;
      div.innerHTML = `<div class="player-text" style="${textStyle}">${item.content}</div>`;
    } else if (item.type === 'code') {
      const scaledCodeSize = Math.round((item.codeFontSize || 14) * scaleFactor);
      const isDark = !item.codeTheme || item.codeTheme !== 'vs';
      const codeBg = isDark ? '#1e1e1e' : '#ffffff';
      const fg = isDark ? '#d4d4d4' : '#1e1e1e';
      div.innerHTML = `<pre class="player-code" style="background:${codeBg};color:${fg};font-size:${scaledCodeSize}px;margin:0;padding:${Math.round(16 * scaleFactor)}px ${Math.round(20 * scaleFactor)}px;border-radius:${Math.round((item.borderRadius || 0) * scaleFactor)}px;overflow:auto;height:100%;font-family:'Fira Code','JetBrains Mono',monospace;line-height:1.6;white-space:pre;tab-size:2">${escapeHtml(item.content || '')}</pre>`;
      const codeDiv = div;
      const lang = item.language || 'javascript';
      const cTheme = item.codeTheme || 'vs-dark';
      loadMonaco().then(() => {
        if (typeof monaco !== 'undefined') {
          monaco.editor.setTheme(cTheme);
          monaco.editor.colorize(item.content || '', lang, {}).then(html => {
            const pre = codeDiv.querySelector('.player-code');
            if (pre) {
              pre.innerHTML = html;
            }
          });
        }
      });
    } else if (item.type === 'image' && item.content) {
      div.innerHTML = `<img src="${item.content}" style="object-fit:${item.objectFit}" alt="">`;
    }

    el.appendChild(div);
  });

  return el;
}

// Navigation
function navigate(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= slides.length) return;
  currentIndex = newIndex;
  renderSlide(currentIndex, direction > 0 ? 'forward' : 'backward');
  updateProgress();
  showControls();
  updateNotes();
  updateNextPreview();
}

function jumpTo(index) {
  if (index < 0 || index >= slides.length || index === currentIndex) return;
  const dir = index > currentIndex ? 'forward' : 'backward';
  currentIndex = index;
  renderSlide(currentIndex, dir);
  updateProgress();
  showControls();
  updateNotes();
  updateNextPreview();
}

function updateProgress() {
  const pct = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100;
  progressBar.style.width = `${pct}%`;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
}

function showControls() {
  playerEl.classList.add('show-controls');
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    playerEl.classList.remove('show-controls');
  }, 3000);
}

// Laser pointer
function handleMouseMovePlayer(e) {
  if (!laserActive || getState().mode !== 'player') return;
  if (!laserEl) {
    laserEl = document.createElement('div');
    laserEl.className = 'laser-pointer';
    playerEl.appendChild(laserEl);
  }
  laserEl.style.left = `${e.clientX}px`;
  laserEl.style.top = `${e.clientY}px`;
}

// Slide overview
function toggleOverview() {
  overviewOpen = !overviewOpen;
  let overview = document.getElementById('slide-overview');
  if (!overview) {
    overview = document.createElement('div');
    overview.id = 'slide-overview';
    overview.className = 'slide-overview';
    playerEl.appendChild(overview);
  }

  if (overviewOpen) {
    overview.innerHTML = `<div class="overview-grid">${slides.map((s, i) => `
      <div class="overview-item ${i === currentIndex ? 'current' : ''}" data-idx="${i}">
        <div class="overview-num">${i + 1}</div>
        <div class="overview-mini"></div>
      </div>
    `).join('')}</div>`;
    overview.hidden = false;
    overview.querySelectorAll('.overview-item').forEach(item => {
      item.addEventListener('click', () => {
        jumpTo(parseInt(item.dataset.idx));
        overviewOpen = false;
        overview.hidden = true;
      });
    });
  } else {
    overview.hidden = true;
  }
}

// Click handling
function handleClick(e) {
  if (getState().mode !== 'player') return;

  if (overviewOpen) return;

  const linkEl = e.target.closest('[data-link]');
  const inlineLink = e.target.closest('a[href]');
  if (linkEl || inlineLink) {
    if (inlineLink) {
      e.preventDefault();
      window.open(inlineLink.href, '_blank', 'noopener');
    }
    return;
  }

  const rect = playerEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x > rect.width * 0.3) {
    navigate(1);
  } else {
    navigate(-1);
  }
}

// Keyboard
function handlePlayerKeydown(e) {
  if (getState().mode !== 'player') return;

  switch (e.key) {
    case 'ArrowRight':
    case ' ':
    case 'Enter':
      e.preventDefault();
      navigate(1);
      break;
    case 'ArrowLeft':
    case 'Backspace':
      e.preventDefault();
      navigate(-1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigate(-1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      navigate(1);
      break;
    case 'Home':
      e.preventDefault();
      jumpTo(0);
      break;
    case 'End':
      e.preventDefault();
      jumpTo(slides.length - 1);
      break;
    case 'Escape':
      e.preventDefault();
      if (overviewOpen) { toggleOverview(); }
      else { switchMode('editor'); }
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      break;
    case 'l':
    case 'L':
      e.preventDefault();
      laserActive = !laserActive;
      if (!laserActive && laserEl) { laserEl.remove(); laserEl = null; }
      break;
    case 'o':
    case 'O':
    case 'g':
    case 'G':
      e.preventDefault();
      toggleOverview();
      break;
    case 'n':
    case 'N':
      e.preventDefault();
      notesEl?.classList.toggle('notes-visible');
      break;
    case 'b':
    case 'B':
      e.preventDefault();
      slideContainer.classList.toggle('blackout');
      break;
    case 'w':
    case 'W':
      e.preventDefault();
      slideContainer.classList.toggle('whiteout');
      break;
    default:
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        jumpTo(parseInt(e.key) - 1);
      }
  }
}
