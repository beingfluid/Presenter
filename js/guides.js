let guidesEl = null;
const SNAP_THRESHOLD = 1.5;

export function initGuides(container) {
  // Reuse the .alignment-guides node baked into the slide-stage template if
  // present — otherwise create one. Re-rendering the stage replaces the
  // existing node so we must re-bind on every initGuides() call.
  guidesEl = container.querySelector(':scope > .alignment-guides');
  if (!guidesEl) {
    guidesEl = document.createElement('div');
    guidesEl.className = 'alignment-guides';
    container.appendChild(guidesEl);
  } else {
    guidesEl.innerHTML = '';
  }
}

export function showGuides(movingEl, allElements, stageRect) {
  if (!guidesEl) return { snapX: null, snapY: null };

  const guides = [];
  let snapX = null;
  let snapY = null;

  const moving = {
    left: movingEl.x,
    right: movingEl.x + movingEl.width,
    centerX: movingEl.x + movingEl.width / 2,
    top: movingEl.y,
    bottom: movingEl.y + movingEl.height,
    centerY: movingEl.y + movingEl.height / 2
  };

  const targets = [
    { left: 0, right: 100, centerX: 50, top: 0, bottom: 100, centerY: 50, isCanvas: true },
    ...allElements.filter(el => el.id !== movingEl.id).map(el => ({
      left: el.x,
      right: el.x + el.width,
      centerX: el.x + el.width / 2,
      top: el.y,
      bottom: el.y + el.height,
      centerY: el.y + el.height / 2
    }))
  ];

  for (const target of targets) {
    // Vertical alignment (X-axis snapping)
    const vChecks = [
      { m: moving.left, t: target.left, label: 'left-left' },
      { m: moving.left, t: target.right, label: 'left-right' },
      { m: moving.right, t: target.left, label: 'right-left' },
      { m: moving.right, t: target.right, label: 'right-right' },
      { m: moving.centerX, t: target.centerX, label: 'center-center' },
      { m: moving.left, t: target.centerX, label: 'left-center' },
      { m: moving.right, t: target.centerX, label: 'right-center' },
      { m: moving.centerX, t: target.left, label: 'center-left' },
      { m: moving.centerX, t: target.right, label: 'center-right' },
    ];

    for (const check of vChecks) {
      const dist = Math.abs(check.m - check.t);
      if (dist < SNAP_THRESHOLD) {
        snapX = check.t - (check.m - moving.left);
        guides.push({ type: 'vertical', pos: check.t, isCenter: check.label.includes('center') });
      }
    }

    // Horizontal alignment (Y-axis snapping)
    const hChecks = [
      { m: moving.top, t: target.top, label: 'top-top' },
      { m: moving.top, t: target.bottom, label: 'top-bottom' },
      { m: moving.bottom, t: target.top, label: 'bottom-top' },
      { m: moving.bottom, t: target.bottom, label: 'bottom-bottom' },
      { m: moving.centerY, t: target.centerY, label: 'center-center' },
      { m: moving.top, t: target.centerY, label: 'top-center' },
      { m: moving.bottom, t: target.centerY, label: 'bottom-center' },
      { m: moving.centerY, t: target.top, label: 'center-top' },
      { m: moving.centerY, t: target.bottom, label: 'center-bottom' },
    ];

    for (const check of hChecks) {
      const dist = Math.abs(check.m - check.t);
      if (dist < SNAP_THRESHOLD) {
        snapY = check.t - (check.m - moving.top);
        guides.push({ type: 'horizontal', pos: check.t, isCenter: check.label.includes('center') });
      }
    }
  }

  renderGuides(guides);
  return { snapX, snapY };
}

export function hideGuides() {
  if (guidesEl) guidesEl.innerHTML = '';
}

function renderGuides(guides) {
  // De-duplicate guides at the same position; prefer center over edge so the
  // user sees the more informative blue marker when both happen to coincide.
  const unique = new Map();
  guides.forEach(g => {
    const key = `${g.type}-${g.pos.toFixed(1)}`;
    const existing = unique.get(key);
    if (!existing || (g.isCenter && !existing.isCenter)) unique.set(key, g);
  });

  guidesEl.innerHTML = Array.from(unique.values()).map(g => {
    const cls = `guide guide-${g.type === 'vertical' ? 'v' : 'h'} ${g.isCenter ? 'guide-center' : 'guide-edge'}`;
    const label = g.isCenter ? 'Center' : 'Edge';
    const pos = g.type === 'vertical'
      ? `left:${g.pos}%`
      : `top:${g.pos}%`;
    return `<div class="${cls}" style="${pos}"><span class="guide-label">${label}</span></div>`;
  }).join('');
}
