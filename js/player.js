import { getState, switchMode } from './app.js';
import { loadFont } from './fonts.js';
import { loadMonaco } from './code.js';
import { renderShapeSVG } from './shapes.js';
import { getFilterCSS } from './imagefilters.js';
import { initAnnotate, toggleAnnotate, handleAnnotateKey, onSlideChange as annotateSlideChange, clearAnnotations } from './annotate.js';
import { initSpeakerChannel, publishSpeakerState, openSpeakerView, closeSpeakerView } from './speaker.js';

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

  initAnnotate(slideContainer);
  const bc = initSpeakerChannel();
  if (bc) {
    bc.onmessage = (msg) => {
      const d = msg.data;
      if (!d) return;
      if (getState().mode !== 'player') return;
      if (d.kind === 'nav') navigate(d.dir);
      else if (d.kind === 'cmd' && d.cmd === 'black') slideContainer.classList.toggle('blackout');
      else if (d.kind === 'cmd' && d.cmd === 'exit') switchMode('editor');
      else if (d.kind === 'request-state') publishCurrentSpeakerState(true);
    };
  }
}

function publishCurrentSpeakerState(newSlide = false) {
  const slide = slides[currentIndex];
  const next = slides[currentIndex + 1];
  publishSpeakerState({
    title: getState().active?.title || 'Presentation',
    idx: currentIndex,
    total: slides.length,
    notes: slide?.notes || '',
    theme,
    instructor: document.getElementById('player')?.classList.contains('instructor') || false,
    presenting: true,
    // Send raw slide markup so the speaker window can render a live preview
    // by reusing the editor stylesheet (it loads the parent's CSS via
    // absolute URL). Empty string when at end of deck.
    currentHTML: slide ? buildSlideHTML(slide) : '',
    nextHTML: next ? buildSlideHTML(next) : '',
    newSlide
  });
}

// Build a self-contained 960×540 .player-stage markup string for a slide.
// Used by the speaker view so its preview matches the live presentation 1:1.
function buildSlideHTML(slide) {
  const el = buildSlideElement(slide);
  const stage = el.querySelector('.player-stage');
  return stage ? stage.outerHTML : '';
}

export function startPresentation(presentation, startIndex = 0, options = {}) {
  if (!presentation || !presentation.slides.length) return;

  // Instructor mode = same renderer as the player but stays inside the
  // browser window so the user can flip between tabs / dock / taskbar
  // without leaving fullscreen. The `instructor` flag controls both the
  // fullscreen call below and the CSS layout (see #player.instructor in
  // features.css for the windowed sizing).
  const instructor = !!options.instructor;

  slides = presentation.slides;
  transition = presentation.transition;
  theme = presentation.theme;
  currentIndex = startIndex;

  playerEl.dataset.theme = theme;
  playerEl.classList.add(`transition-${transition}`);
  playerEl.classList.toggle('instructor', instructor);

  // Pre-load Monaco if any slides have code
  const hasCode = slides.some(s => s.elements.some(e => e.type === 'code'));
  if (hasCode) loadMonaco();

  renderSlide(currentIndex, 'none');
  updateProgress();
  showControls();
  startTimer();
  updateNotes();
  updateNextPreview();
  updateSlideNumber();
  publishCurrentSpeakerState(true);

  // Instructor mode intentionally skips fullscreen so the browser tabs and
  // OS taskbar remain visible — handy for demos that need tab switching.
  if (!instructor && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function stopPresentation() {
  playerEl.classList.remove(`transition-${transition}`);
  playerEl.classList.remove('instructor');
  playerEl.removeAttribute('data-theme');
  slideContainer.innerHTML = '';
  stopTimer();
  overviewOpen = false;
  laserActive = false;
  if (laserEl) { laserEl.remove(); laserEl = null; }
  const overview = document.getElementById('slide-overview');
  if (overview) overview.hidden = true;
  clearAnnotations();
  // Notify the speaker window we've stopped so it can re-show the waiting
  // placeholder and update its button state. We deliberately do NOT close
  // the speaker window — keeping it open lets the user start a different
  // mode (presenter/instructor) without re-launching speaker view.
  try { publishSpeakerState({ presenting: false, currentHTML: '', nextHTML: '', notes: '', idx: 0, total: 0, title: getState().active?.title || 'Presentation' }); } catch {}
  const sn = document.getElementById('player-slide-number');
  if (sn) sn.hidden = true;
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

  // Render INSIDE a fixed-size 960×540 stage so every measurement matches
  // the editor 1:1. The .player-slide is then transform-scaled to fit the
  // visible player area — same approach as the editor's #slide-stage.
  const stage = document.createElement('div');
  stage.className = 'player-stage';
  // The dataset.theme on the wrapper drives all themed defaults.
  if (theme) stage.dataset.theme = theme;

  const bg = slide.background;
  if (bg && bg.type !== 'theme') {
    if (bg.type === 'color') stage.style.background = bg.value;
    else if (bg.type === 'gradient') stage.style.background = bg.value;
    else if (bg.type === 'image') stage.style.background = `url(${bg.value}) center/cover no-repeat`;
  }

  slide.elements.forEach(item => {
    const div = document.createElement('div');
    div.className = 'player-element';
    let style = `left:${item.x}%;top:${item.y}%;width:${item.width}%;height:${item.height}%;opacity:${item.opacity};z-index:${item.zIndex || 0};`;

    const transforms = [];
    if (item.rotation) transforms.push(`rotate(${item.rotation}deg)`);
    if (item.flipX || item.flipY) transforms.push(`scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})`);
    if (transforms.length) style += `transform:${transforms.join(' ')};`;
    if (item.backgroundColor) style += `background-color:${item.backgroundColor};`;
    if (item.borderWidth) style += `border:${item.borderWidth}px ${item.borderStyle} ${item.borderColor};`;
    if (item.borderRadius) style += `border-radius:${item.borderRadius}px;`;
    if (item.shadowEnabled) style += `box-shadow:${item.shadowX}px ${item.shadowY}px ${item.shadowBlur}px ${item.shadowColor};`;
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
      let textStyle = `font-size:${item.fontSize}px;font-weight:${item.fontWeight};text-align:${item.textAlign};font-family:'${item.fontFamily}',sans-serif;letter-spacing:${item.letterSpacing || 0}px;line-height:${item.lineHeight || 1.4};text-transform:${item.textTransform || 'none'};`;
      if (item.fontColor) textStyle += `color:${item.fontColor};`;
      if (item.textShadow) textStyle += `text-shadow:2px 2px 4px rgba(0,0,0,0.5);`;
      div.style.cssText += `justify-content:${justifyContent};`;
      div.innerHTML = `<div class="player-text" style="${textStyle}">${item.content}</div>`;
    } else if (item.type === 'code') {
      const codeSize = item.codeFontSize || 14;
      const isDark = !item.codeTheme || item.codeTheme !== 'vs';
      const codeBg = isDark ? '#1e1e1e' : '#ffffff';
      const fg = isDark ? '#d4d4d4' : '#1e1e1e';
      div.innerHTML = `<pre class="player-code" style="background:${codeBg};color:${fg};font-size:${codeSize}px;margin:0;padding:16px 20px;border-radius:${item.borderRadius || 0}px;overflow:auto;height:100%;font-family:'Fira Code','JetBrains Mono',monospace;line-height:1.6;white-space:pre;tab-size:2">${escapeHtml(item.content || '')}</pre>`;
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
      const filterCSS = item.imageFilter && item.imageFilter !== 'none' ? getFilterCSS(item.imageFilter) : '';
      div.innerHTML = `<img src="${item.content}" style="object-fit:${item.objectFit}${filterCSS ? `;filter:${filterCSS}` : ''}" alt="">`;
    } else if (item.type === 'shape') {
      div.style.cssText += 'overflow:visible;';
      div.innerHTML = renderShapeSVG(item, { editor: false });
    } else if (item.type === 'embed' && item.content) {
      const sandbox = item.sandbox || 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation';
      div.innerHTML = `<iframe src="${escapeHtml(item.content)}" sandbox="${sandbox}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" frameborder="0" style="width:100%;height:100%;border:0"></iframe>`;
    } else if (item.type === 'video' && item.content) {
      div.innerHTML = `<video src="${escapeHtml(item.content)}" ${item.autoplay ? 'autoplay' : ''} ${item.loop ? 'loop' : ''} ${item.muted ? 'muted' : ''} controls playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video>`;
    } else if (item.type === 'audio' && item.content) {
      div.innerHTML = `<audio src="${escapeHtml(item.content)}" ${item.autoplay ? 'autoplay' : ''} ${item.loop ? 'loop' : ''} controls style="width:100%"></audio>`;
    }

    stage.appendChild(div);
  });

  el.appendChild(stage);
  // Defer the fit until the element is in the DOM so we can read its size.
  requestAnimationFrame(() => fitPlayerStage(el));
  return el;
}

// Scale the 960×540 inner stage to fit the current player slide area while
// preserving aspect ratio. Matches the editor's fitStageToCanvas approach so
// every visual is pixel-identical between editor preview and presentation.
function fitPlayerStage(slideEl) {
  const stage = slideEl.querySelector('.player-stage');
  if (!stage) return;
  const host = slideContainer.getBoundingClientRect();
  if (host.width === 0 || host.height === 0) return;
  const scaleX = host.width / 960;
  const scaleY = host.height / 540;
  const scale = Math.min(scaleX, scaleY);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Re-fit on resize / orientation change so the slide always fills the
// available area without distortion.
window.addEventListener('resize', () => {
  if (!slideContainer) return;
  slideContainer.querySelectorAll('.player-slide').forEach(s => fitPlayerStage(s));
});

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
  annotateSlideChange();
  publishCurrentSpeakerState(true);
  updateSlideNumber();
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
  annotateSlideChange();
  publishCurrentSpeakerState(true);
  updateSlideNumber();
}

function updateSlideNumber() {
  let el = document.getElementById('player-slide-number');
  const show = !!getState().active?.showSlideNumbers;
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'player-slide-number';
    playerEl.appendChild(el);
  }
  el.hidden = false;
  el.textContent = `${currentIndex + 1} / ${slides.length}`;
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

  // Disable click-to-advance while annotating so drawing isn't interrupted.
  if (document.body.classList.contains('annotating')) return;

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

  if (handleAnnotateKey(e)) { e.preventDefault(); return; }

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
    case 'd':
    case 'D':
      e.preventDefault();
      toggleAnnotate();
      break;
    case 's':
    case 'S':
      e.preventDefault();
      openSpeakerView();
      publishCurrentSpeakerState(true);
      break;
    default:
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        jumpTo(parseInt(e.key) - 1);
      }
  }
}
