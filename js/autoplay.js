let autoplayInterval = null;
let autoplayTime = 5000;
let isPaused = false;
let onNavigate = null;

export function startAutoplay(navigateFn, duration = 5000) {
  onNavigate = navigateFn;
  autoplayTime = duration;
  isPaused = false;
  showAutoplayUI();
  tick();
}

export function stopAutoplay() {
  clearInterval(autoplayInterval);
  autoplayInterval = null;
  onNavigate = null;
  hideAutoplayUI();
}

export function togglePause() {
  isPaused = !isPaused;
  updateAutoplayUI();
  if (!isPaused) tick();
  else clearInterval(autoplayInterval);
}

export function isAutoplay() {
  return autoplayInterval !== null || (onNavigate !== null && !isPaused);
}

function tick() {
  clearInterval(autoplayInterval);
  autoplayInterval = setInterval(() => {
    if (!isPaused && onNavigate) onNavigate(1);
  }, autoplayTime);
}

function showAutoplayUI() {
  let el = document.getElementById('autoplay-bar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'autoplay-bar';
    el.className = 'autoplay-bar';
    document.getElementById('player').appendChild(el);
  }
  updateAutoplayUI();
  el.hidden = false;
}

function updateAutoplayUI() {
  const el = document.getElementById('autoplay-bar');
  if (!el) return;
  el.innerHTML = `
    <button class="ap-btn" data-ap="prev">&#9664;&#9664;</button>
    <button class="ap-btn" data-ap="toggle">${isPaused ? '&#9654;' : '&#10074;&#10074;'}</button>
    <button class="ap-btn" data-ap="next">&#9654;&#9654;</button>
    <span class="ap-time">${autoplayTime / 1000}s</span>
    <button class="ap-btn" data-ap="stop">&#10005;</button>
  `;
  el.querySelectorAll('[data-ap]').forEach(btn => {
    btn.onclick = () => {
      switch (btn.dataset.ap) {
        case 'prev': if (onNavigate) onNavigate(-1); break;
        case 'next': if (onNavigate) onNavigate(1); break;
        case 'toggle': togglePause(); break;
        case 'stop': stopAutoplay(); break;
      }
    };
  });
}

function hideAutoplayUI() {
  const el = document.getElementById('autoplay-bar');
  if (el) el.hidden = true;
}
