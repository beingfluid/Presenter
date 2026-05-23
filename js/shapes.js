// SVG shape rendering for the `shape` element type.
// Shape types: rectangle, ellipse, triangle, diamond, line, arrow, double-arrow, star, hexagon, pentagon, parallelogram, trapezoid, cloud, heart, lightning, callout

export const SHAPE_TYPES = [
  { id: 'rectangle',     name: 'Rectangle',     icon: '▭' },
  { id: 'ellipse',       name: 'Ellipse',       icon: '◯' },
  { id: 'triangle',      name: 'Triangle',      icon: '△' },
  { id: 'diamond',       name: 'Diamond',       icon: '◇' },
  { id: 'pentagon',      name: 'Pentagon',      icon: '⬠' },
  { id: 'hexagon',       name: 'Hexagon',       icon: '⬡' },
  { id: 'star',          name: 'Star',          icon: '★' },
  { id: 'heart',         name: 'Heart',         icon: '♥' },
  { id: 'line',          name: 'Line',          icon: '─' },
  { id: 'arrow',         name: 'Arrow',         icon: '→' },
  { id: 'double-arrow',  name: 'Double Arrow',  icon: '↔' },
  { id: 'parallelogram', name: 'Parallelogram', icon: '▱' },
  { id: 'trapezoid',     name: 'Trapezoid',     icon: '⏢' },
  { id: 'callout',       name: 'Callout',       icon: '💬' },
  { id: 'cloud',         name: 'Cloud',         icon: '☁' },
  { id: 'lightning',     name: 'Lightning',     icon: '⚡' }
];

// Render an inline SVG for the given shape element.
// All shapes use a viewBox of 0 0 100 100 so they scale to fill the element box.
export function renderShapeSVG(el, opts = {}) {
  const fill = el.fillColor || '#7c5cfc';
  const stroke = el.strokeColor || 'transparent';
  const sw = el.strokeWidth || 0;
  const op = opts.editor ? 1 : 1;
  const inner = shapePath(el.shapeType || 'rectangle', { fill, stroke, sw });
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible;opacity:${op}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function shapePath(type, { fill, stroke, sw }) {
  const s = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
  switch (type) {
    case 'rectangle':
      return `<rect x="0" y="0" width="100" height="100" rx="2" ${s}/>`;
    case 'ellipse':
      return `<ellipse cx="50" cy="50" rx="50" ry="50" ${s}/>`;
    case 'triangle':
      return `<polygon points="50,2 98,98 2,98" ${s}/>`;
    case 'diamond':
      return `<polygon points="50,2 98,50 50,98 2,50" ${s}/>`;
    case 'pentagon':
      return `<polygon points="50,2 98,40 82,98 18,98 2,40" ${s}/>`;
    case 'hexagon':
      return `<polygon points="25,3 75,3 98,50 75,97 25,97 2,50" ${s}/>`;
    case 'star': {
      const pts = [];
      const cx = 50, cy = 50, R = 48, r = 20;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? R : r;
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(' ')}" ${s}/>`;
    }
    case 'heart':
      return `<path d="M50,88 C8,60 8,18 30,18 C42,18 50,28 50,38 C50,28 58,18 70,18 C92,18 92,60 50,88 Z" ${s}/>`;
    case 'line':
      return `<line x1="2" y1="50" x2="98" y2="50" stroke="${fill}" stroke-width="${Math.max(sw, 3)}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    case 'arrow':
      return `<g stroke="${fill}" fill="${fill}">
        <line x1="2" y1="50" x2="78" y2="50" stroke-width="${Math.max(sw, 6)}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <polygon points="98,50 70,28 70,72" stroke="none"/>
      </g>`;
    case 'double-arrow':
      return `<g stroke="${fill}" fill="${fill}">
        <line x1="14" y1="50" x2="86" y2="50" stroke-width="${Math.max(sw, 6)}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <polygon points="2,50 30,28 30,72" stroke="none"/>
        <polygon points="98,50 70,28 70,72" stroke="none"/>
      </g>`;
    case 'parallelogram':
      return `<polygon points="22,8 98,8 78,92 2,92" ${s}/>`;
    case 'trapezoid':
      return `<polygon points="20,8 80,8 98,92 2,92" ${s}/>`;
    case 'callout':
      return `<path d="M4,8 L96,8 Q98,8 98,10 L98,68 Q98,70 96,70 L52,70 L40,92 L32,70 L4,70 Q2,70 2,68 L2,10 Q2,8 4,8 Z" ${s}/>`;
    case 'cloud':
      return `<path d="M28,72 Q8,72 8,55 Q8,42 22,40 Q22,22 42,22 Q56,22 60,32 Q66,28 74,32 Q88,32 90,46 Q98,48 98,58 Q98,72 84,72 Z" ${s}/>`;
    case 'lightning':
      return `<polygon points="55,2 22,52 46,52 38,98 78,42 52,42 62,2" ${s}/>`;
    default:
      return `<rect x="0" y="0" width="100" height="100" rx="2" ${s}/>`;
  }
}

// Build a small swatch SVG for shape picker buttons.
export function shapeSwatchSVG(type) {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:24px;height:24px" xmlns="http://www.w3.org/2000/svg">${shapePath(type, { fill: '#fff', stroke: '#fff', sw: 0 })}</svg>`;
}
