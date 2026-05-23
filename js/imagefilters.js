export const FILTERS = [
  { id: 'none', name: 'None', css: '' },
  { id: 'grayscale', name: 'Grayscale', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
  { id: 'blur', name: 'Blur', css: 'blur(2px)' },
  { id: 'brightness', name: 'Bright', css: 'brightness(1.3)' },
  { id: 'contrast', name: 'Contrast', css: 'contrast(1.5)' },
  { id: 'saturate', name: 'Saturate', css: 'saturate(2)' },
  { id: 'hue-rotate', name: 'Hue Shift', css: 'hue-rotate(90deg)' },
  { id: 'invert', name: 'Invert', css: 'invert(100%)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(40%) contrast(1.1) brightness(0.9)' },
  { id: 'cool', name: 'Cool', css: 'saturate(0.8) hue-rotate(20deg) brightness(1.1)' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.2) hue-rotate(-10deg) brightness(1.05)' },
];

export function getFilterCSS(filterId) {
  const f = FILTERS.find(f => f.id === filterId);
  return f ? f.css : '';
}
