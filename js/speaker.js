// Speaker view: opens a companion window showing current slide, next slide,
// notes, elapsed timer, and remaining time. The main player publishes state
// over a BroadcastChannel; the companion subscribes. Navigation keys forwarded
// back to main window.

let bc = null;
let win = null;

export function initSpeakerChannel() {
  if (bc) return bc;
  try { bc = new BroadcastChannel('presenter-speaker'); } catch { bc = null; }
  return bc;
}

export function publishSpeakerState(state) {
  if (!bc) return;
  try { bc.postMessage({ kind: 'state', ...state }); } catch {}
}

// Open / focus the speaker view window.
export function openSpeakerView() {
  initSpeakerChannel();
  if (win && !win.closed) { win.focus(); return; }
  win = window.open('', 'presenter-speaker', 'popup=yes,width=1100,height=700');
  if (!win) return;
  // Pass the opener's origin + path so the speaker window can pull the same
  // CSS files via absolute URL — that's what makes the slide preview look
  // identical to the live presentation.
  const baseURL = location.href.substring(0, location.href.lastIndexOf('/') + 1);
  win.document.write(speakerHTML(baseURL));
  win.document.close();
}

export function closeSpeakerView() {
  if (win && !win.closed) win.close();
  win = null;
}

function speakerHTML(baseURL = '') {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Speaker View</title>
<base href="${baseURL}">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/themes.css">
<link rel="stylesheet" href="css/transitions.css">
<link rel="stylesheet" href="css/features.css">
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       background: #0d0d18; color: #e6e6e6; min-height: 100vh; overflow: hidden; }
#wrap { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: auto 1fr auto;
        height: 100vh; gap: 12px; padding: 12px; }
header { grid-column: 1/-1; display: flex; gap: 16px; align-items: center; }
#title { font-weight: 600; font-size: 14px; opacity: 0.7; }
.stat { font-family: 'Fira Code', monospace; padding: 6px 12px; background: #1a1a28;
        border-radius: 6px; font-size: 18px; }
.stat span { opacity: 0.55; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
             margin-right: 6px; }
.btn { padding: 6px 12px; border-radius: 6px; background: #1a1a28; border: 1px solid #2a2a3e;
       color: #e6e6e6; cursor: pointer; font-size: 12px; }
.btn:hover { background: #2a2a3e; }
.btn.danger { background: #2a1018; border-color: #e94560; color: #ff7a8a; }
.mode-group { display: inline-flex; gap: 4px; padding: 2px; background: #0d0d18; border-radius: 8px; border: 1px solid #2a2a3e; }
.mode-btn { border: 1px solid transparent; background: transparent; }
.mode-btn:hover { background: #2a2a3e; }
.mode-btn.active { background: #3a3a5e; border-color: #7c5cfc; color: #fff; box-shadow: 0 0 0 1px #7c5cfc44; }
main { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
aside { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.5; }
/* Slide preview frame: positions a fixed-size 960x540 .player-stage in the
   center and CSS-scales it to fit, exactly like the live player. */
.slide-frame { flex: 1; background: #000; border-radius: 8px; overflow: hidden;
               border: 1px solid #2a2a3e; position: relative; }
.next-frame { aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden;
              border: 1px solid #2a2a3e; opacity: 0.9; position: relative; }
.slide-frame .player-stage,
.next-frame .player-stage {
  position: absolute; top: 50%; left: 50%;
  transform-origin: center center;
}
/* Repeat theme backgrounds keyed off the frame's data-theme since the
   parent #player selector doesn't apply here. */
[data-theme="dark"]     > .player-stage { background: #1a1a2e; color: #eaeaea; }
[data-theme="light"]    > .player-stage { background: #ffffff; color: #333; }
[data-theme="ocean"]    > .player-stage { background: #0a1628; color: #b8d4e3; }
[data-theme="sunset"]   > .player-stage { background: #2d1b3d; color: #f0d4d4; }
[data-theme="forest"]   > .player-stage { background: #0d1f0d; color: #c4e8c4; }
[data-theme="royal"]    > .player-stage { background: #0f0a2e; color: #d4c4e8; }
[data-theme="minimal"]  > .player-stage { background: #f8f9fa; color: #444; }
[data-theme="magenta"]  > .player-stage { background: #1a0a1a; color: #f0d0f0; }
[data-theme="monokai"]  > .player-stage { background: #272822; color: #f8f8f2; }
[data-theme="dracula"]  > .player-stage { background: #282a36; color: #f8f8f2; }
[data-theme="pastel"]   > .player-stage { background: #fef6e4; color: #001858; }
[data-theme="solarized"]> .player-stage { background: #fdf6e3; color: #586e75; }
#notes { flex: 1; padding: 12px; background: #1a1a28; border-radius: 8px;
         overflow-y: auto; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
#notes:empty::before { content: 'No notes for this slide'; opacity: 0.4; font-style: italic; }
footer { grid-column: 1/-1; display: flex; gap: 10px; align-items: center; justify-content: flex-start;
         padding: 6px 10px; background: #1a1a28; border-radius: 6px; border: 1px solid #2a2a3e; }
.footer-title { font-weight: 600; font-size: 13px; color: #e6e6e6; }
.footer-sep { color: #2a2a3e; }
.counter { font-family: 'Fira Code', monospace; font-size: 12px; opacity: 0.7; }
.end-card { display: flex; align-items: center; justify-content: center;
            height: 100%; opacity: 0.5; font-size: 18px; }
</style></head><body data-theme="dark">
<div id="wrap">
  <header>
    <div class="stat"><span>Elapsed</span><b id="elapsed">00:00</b></div>
    <div class="stat"><span>Slide Time</span><b id="slideTime">00:00</b></div>
    <div class="stat"><span>Clock</span><b id="clock">--:--</b></div>
    <button class="btn" id="resetTimer">Reset Timer</button>
    <div class="mode-group" role="group" aria-label="Presentation mode">
      <button class="btn mode-btn" data-mode="presenter" id="modePresenter" title="Fullscreen presenter mode">&#9654; Presenter</button>
      <button class="btn mode-btn" data-mode="instructor" id="modeInstructor" title="Windowed instructor mode (browser/taskbar visible)">&#9636; Instructor</button>
      <button class="btn mode-btn danger" data-mode="stop" id="modeStop" title="Exit presentation" hidden>&#9632; Stop</button>
    </div>
    <span style="flex:1"></span>
    <button class="btn" id="prev">&#9664; Prev</button>
    <button class="btn" id="next">Next &#9654;</button>
    <button class="btn" id="blackBtn">Black</button>
  </header>
  <main>
    <span class="label">Current Slide</span>
    <div class="slide-frame" id="current"></div>
  </main>
  <aside>
    <div>
      <span class="label">Next Up</span>
      <div class="next-frame" id="next-frame"></div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-height:0">
      <span class="label">Speaker Notes</span>
      <div id="notes"></div>
    </div>
  </aside>
  <footer>
    <span id="title" class="footer-title">Speaker View</span>
    <span class="footer-sep">|</span>
    <span class="counter" id="counter">0 / 0</span>
  </footer>
</div>
<script>
  const bc = new BroadcastChannel('presenter-speaker');
  let start = Date.now(), slideStart = Date.now();
  function fmt(s){ const m=Math.floor(s/60).toString().padStart(2,'0'); const r=(s%60).toString().padStart(2,'0'); return m+':'+r; }
  function tick(){
    const now = Date.now();
    document.getElementById('elapsed').textContent = fmt(Math.floor((now-start)/1000));
    document.getElementById('slideTime').textContent = fmt(Math.floor((now-slideStart)/1000));
    const d = new Date();
    document.getElementById('clock').textContent = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  setInterval(tick, 500); tick();
  document.getElementById('resetTimer').onclick = () => { start = Date.now(); slideStart = Date.now(); tick(); };
  document.getElementById('modePresenter').onclick = () => bc.postMessage({ kind: 'cmd', cmd: 'start', instructor: false });
  document.getElementById('modeInstructor').onclick = () => bc.postMessage({ kind: 'cmd', cmd: 'start', instructor: true });
  document.getElementById('modeStop').onclick = () => bc.postMessage({ kind: 'cmd', cmd: 'stop' });
  document.getElementById('prev').onclick = () => bc.postMessage({ kind: 'nav', dir: -1 });
  document.getElementById('next').onclick = () => bc.postMessage({ kind: 'nav', dir: 1 });
  document.getElementById('blackBtn').onclick = () => bc.postMessage({ kind: 'cmd', cmd: 'black' });
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') bc.postMessage({ kind: 'nav', dir: 1 });
    else if (e.key === 'ArrowLeft') bc.postMessage({ kind: 'nav', dir: -1 });
    else if (e.key === 'b' || e.key === 'B') bc.postMessage({ kind: 'cmd', cmd: 'black' });
    else if (e.key === 'Escape') bc.postMessage({ kind: 'cmd', cmd: 'exit' });
  });

  // Scale a .player-stage inside a host element so it fits while keeping
  // 16:9. Identical math to player.js fitPlayerStage().
  function fitStage(host) {
    const stage = host.querySelector('.player-stage');
    if (!stage) return;
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const scale = Math.min(r.width / 960, r.height / 540);
    stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }
  function renderFrame(host, html) {
    if (!html) {
      host.innerHTML = '<div class="end-card">End of presentation</div>';
      return;
    }
    host.innerHTML = html;
    requestAnimationFrame(() => fitStage(host));
  }

  // Initial waiting state: shown until the main window publishes a slide.
  const WAITING_HTML = '<div class="end-card" style="flex-direction:column;gap:10px;text-align:center;padding:24px"><div>Waiting for presentation\u2026</div><div style="font-size:13px;opacity:0.7">Click <b>Presenter</b> or <b>Instructor</b> above to begin.</div></div>';
  document.getElementById('current').innerHTML = WAITING_HTML;

  function updateModeButtons({ presenting, instructor }) {
    const p = document.getElementById('modePresenter');
    const i = document.getElementById('modeInstructor');
    const s = document.getElementById('modeStop');
    p.classList.toggle('active', presenting && !instructor);
    i.classList.toggle('active', presenting && !!instructor);
    s.hidden = !presenting;
    p.textContent = presenting ? (instructor ? '\u25B6 Switch to Presenter' : '\u25B6 Presenter') : '\u25B6 Start Presenter';
    i.textContent = presenting ? (!instructor ? '\u25A4 Switch to Instructor' : '\u25A4 Instructor') : '\u25A4 Start Instructor';
  }
  updateModeButtons({ presenting: false, instructor: false });
  window.addEventListener('resize', () => {
    fitStage(document.getElementById('current'));
    fitStage(document.getElementById('next-frame'));
  });

  bc.onmessage = (m) => {
    const d = m.data;
    if (d.kind !== 'state') return;
    const presenting = d.presenting !== false && (d.total > 0 || d.currentHTML);
    updateModeButtons({ presenting, instructor: !!d.instructor });
    document.getElementById('title').textContent = d.title || 'Speaker View';
    document.getElementById('counter').textContent = (d.idx+1)+' / '+(d.total || 0);
    document.body.dataset.theme = d.theme || 'dark';
    const cur = document.getElementById('current');
    const nxt = document.getElementById('next-frame');
    cur.setAttribute('data-theme', d.theme || 'dark');
    nxt.setAttribute('data-theme', d.theme || 'dark');
    if (!presenting) {
      cur.innerHTML = WAITING_HTML;
      nxt.innerHTML = '';
      document.getElementById('notes').textContent = '';
      return;
    }
    renderFrame(cur, d.currentHTML || '');
    renderFrame(nxt, d.nextHTML || '');
    document.getElementById('notes').textContent = d.notes || '';
    if (d.newSlide) slideStart = Date.now();
  };
  bc.postMessage({ kind: 'request-state' });
<\/script></body></html>`;
}
