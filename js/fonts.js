export const FONT_LIST = [
  // Sans-serif
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
  { name: 'Manrope', category: 'sans-serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Rubik', category: 'sans-serif' },
  { name: 'Oswald', category: 'sans-serif' },
  { name: 'Ubuntu', category: 'sans-serif' },
  { name: 'Fira Sans', category: 'sans-serif' },
  { name: 'Barlow', category: 'sans-serif' },
  { name: 'Quicksand', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  { name: 'Karla', category: 'sans-serif' },
  { name: 'Mulish', category: 'sans-serif' },
  { name: 'Lexend', category: 'sans-serif' },
  { name: 'Archivo', category: 'sans-serif' },
  { name: 'Cabin', category: 'sans-serif' },
  { name: 'Overpass', category: 'sans-serif' },
  { name: 'Titillium Web', category: 'sans-serif' },
  { name: 'Exo 2', category: 'sans-serif' },
  { name: 'Josefin Sans', category: 'sans-serif' },
  // System fonts (no Google load needed)
  { name: 'Comic Sans MS', category: 'system' },
  { name: 'TeleNeo', category: 'system' },
  { name: 'Arial', category: 'system' },
  { name: 'Helvetica', category: 'system' },
  { name: 'Georgia', category: 'system' },
  { name: 'Verdana', category: 'system' },
  { name: 'Times New Roman', category: 'system' },
  { name: 'Courier New', category: 'system' },
  { name: 'Trebuchet MS', category: 'system' },
  { name: 'Impact', category: 'system' },
  // Serif
  { name: 'Merriweather', category: 'serif' },
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Crimson Text', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },
  { name: 'Source Serif Pro', category: 'serif' },
  { name: 'DM Serif Display', category: 'serif' },
  { name: 'Bitter', category: 'serif' },
  { name: 'Noto Serif', category: 'serif' },
  { name: 'PT Serif', category: 'serif' },
  { name: 'Vollkorn', category: 'serif' },
  { name: 'Spectral', category: 'serif' },
  // Monospace
  { name: 'Fira Code', category: 'monospace' },
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'Source Code Pro', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Space Mono', category: 'monospace' },
  { name: 'Inconsolata', category: 'monospace' },
  { name: 'Roboto Mono', category: 'monospace' },
  // Handwriting
  { name: 'Pacifico', category: 'handwriting' },
  { name: 'Dancing Script', category: 'handwriting' },
  { name: 'Caveat', category: 'handwriting' },
  { name: 'Satisfy', category: 'handwriting' },
  { name: 'Great Vibes', category: 'handwriting' },
  { name: 'Indie Flower', category: 'handwriting' },
  { name: 'Shadows Into Light', category: 'handwriting' },
  { name: 'Kalam', category: 'handwriting' },
  // Display
  { name: 'Permanent Marker', category: 'display' },
  { name: 'Righteous', category: 'display' },
  { name: 'Bebas Neue', category: 'display' },
  { name: 'Anton', category: 'display' },
  { name: 'Bangers', category: 'display' },
  { name: 'Alfa Slab One', category: 'display' },
  { name: 'Fredoka One', category: 'display' },
  { name: 'Bungee', category: 'display' },
  { name: 'Lobster', category: 'display' },
  { name: 'Comfortaa', category: 'display' },
  { name: 'Audiowide', category: 'display' },
  { name: 'Press Start 2P', category: 'display' },
];

const SYSTEM_FONTS = new Set(['Comic Sans MS', 'TeleNeo', 'Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman', 'Courier New', 'Trebuchet MS', 'Impact']);
const loadedFonts = new Set();

export function loadFont(fontName) {
  if (!fontName || SYSTEM_FONTS.has(fontName) || loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const encoded = fontName.replace(/ /g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function loadAllUsedFonts(presentations) {
  const fonts = new Set();
  presentations.forEach(pres => {
    pres.slides?.forEach(slide => {
      slide.elements?.forEach(el => {
        if (el.type === 'text' && el.fontFamily) {
          fonts.add(el.fontFamily);
        }
      });
    });
  });
  fonts.forEach(f => loadFont(f));
}

export function getFontsByCategory() {
  const categories = {};
  FONT_LIST.forEach(f => {
    if (!categories[f.category]) categories[f.category] = [];
    categories[f.category].push(f.name);
  });
  return categories;
}
