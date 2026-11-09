import { Asset } from './types';

// High-Fidelity Slice-of-Life & Manga Comic Assets (Full Color)
export const CHARACTERS: Asset[] = [
  {
    id: 'manga-boy-school',
    name: 'Studente Ragazzo (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_boy_school_color_1794186454623.jpg',
  },
  {
    id: 'manga-girl-school',
    name: 'Studentessa Ragazza (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_girl_school_color_1794186454357.jpg',
  },
  {
    id: 'manga-boy-casual',
    name: 'Ragazzo Streetwear (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_boy_casual_color_1794186469608.jpg',
  },
  {
    id: 'manga-girl-casual',
    name: 'Ragazza Casual (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_girl_casual_color_1794186469973.jpg',
  },
  {
    id: 'manga-adult-man',
    name: 'Uomo / Docente (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_adult_man_color_1794186483331.jpg',
  },
  {
    id: 'manga-chibi-cat',
    name: 'Gatto Mascotte Chibi (A Colori)',
    category: 'character',
    url: '/src/assets/images/anime_chibi_cat_color_1794186482140.jpg',
  },
];

export const BACKGROUNDS: Asset[] = [
  {
    id: 'bg-classroom',
    name: 'Aula Scolastica',
    category: 'background',
    url: '/src/assets/images/manga_bg_classroom_1794185192737.jpg',
  },
  {
    id: 'bg-city-crosswalk',
    name: 'Incrocio Cittadino',
    category: 'background',
    url: '/src/assets/images/manga_bg_city_crosswalk_1794185211725.jpg',
  },
  {
    id: 'bg-rooftop',
    name: 'Tetto della Scuola',
    category: 'background',
    url: '/src/assets/images/manga_bg_school_rooftop_1794185211550.jpg',
  },
  {
    id: 'bg-cafe',
    name: 'Bar Caffetteria',
    category: 'background',
    url: '/src/assets/images/manga_bg_cozy_cafe_1794185212460.jpg',
  },
  {
    id: 'bg-park',
    name: 'Parco nel Verde',
    category: 'background',
    url: '/src/assets/images/manga_bg_park_bench_1794185212975.jpg',
  },
];

export const STICKERS: Asset[] = [
  {
    id: 'st-pow',
    name: 'POW!',
    category: 'effect',
    url: '/src/assets/images/comic_sticker_pow_1794183084847.jpg',
  },
  {
    id: 'st-boom',
    name: 'BOOM!',
    category: 'effect',
    url: '/src/assets/images/comic_sticker_boom_1794183101466.jpg',
  },
  {
    id: 'st-zap',
    name: 'ZAP!',
    category: 'effect',
    url: '/src/assets/images/comic_sticker_zap_1794183101630.jpg',
  },
  {
    id: 'st-smash',
    name: 'SMASH!',
    category: 'effect',
    url: '/src/assets/images/comic_sticker_smash_1794183645137.jpg',
  },
];

// Comic Speech Balloons (Clean SVG format)
const SVG_BUBBLE_TALK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width="280" height="180"><path d="M 35 25 Q 15 25 15 50 L 15 110 Q 15 135 40 135 L 70 135 L 45 170 L 110 135 L 245 135 Q 265 135 265 110 L 265 50 Q 265 25 245 25 Z" fill="%23ffffff" stroke="%23111111" stroke-width="4.5" stroke-linejoin="round"/></svg>`;

const SVG_BUBBLE_SHOUT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width="280" height="180"><polygon points="35,60 15,35 60,30 90,15 130,28 175,10 200,35 245,20 235,60 270,85 240,115 270,145 225,145 210,175 165,150 135,175 100,145 65,170 65,140 20,145 40,105 10,85" fill="%23ffffff" stroke="%23111111" stroke-width="4.5" stroke-linejoin="miter"/></svg>`;

const SVG_BUBBLE_THOUGHT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width="280" height="180"><path d="M 65 50 C 45 50 30 65 30 85 C 20 90 15 100 15 112 C 15 128 28 140 45 140 C 50 150 65 155 80 150 C 95 160 120 160 135 150 C 155 158 180 152 195 140 C 215 140 230 125 230 110 C 240 100 240 85 230 75 C 235 60 225 45 210 42 C 200 30 180 25 165 32 C 150 22 125 22 110 32 C 95 24 75 30 65 50 Z" fill="%23ffffff" stroke="%23111111" stroke-width="4.5"/><circle cx="50" cy="162" r="9" fill="%23ffffff" stroke="%23111111" stroke-width="3"/><circle cx="35" cy="173" r="5" fill="%23ffffff" stroke="%23111111" stroke-width="2.5"/></svg>`;

const SVG_BUBBLE_CAPTION = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100" width="280" height="100"><rect x="5" y="5" width="270" height="90" fill="%23000000"/><rect x="0" y="0" width="270" height="90" fill="%23fff9b0" stroke="%23000000" stroke-width="4"/></svg>`;

const SVG_BUBBLE_WHISPER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width="280" height="180"><path d="M 35 25 Q 15 25 15 50 L 15 110 Q 15 135 40 135 L 70 135 L 45 170 L 110 135 L 245 135 Q 265 135 265 110 L 265 50 Q 265 25 245 25 Z" fill="%23ffffff" stroke="%23555555" stroke-width="3.5" stroke-dasharray="8 6" stroke-linejoin="round"/></svg>`;

export const BUBBLES: Asset[] = [
  {
    id: 'b-talk',
    name: 'Baloon Parlato',
    category: 'bubble',
    url: SVG_BUBBLE_TALK,
  },
  {
    id: 'b-shout',
    name: 'Baloon Grido / Urlo',
    category: 'bubble',
    url: SVG_BUBBLE_SHOUT,
  },
  {
    id: 'b-thought',
    name: 'Nuvola Pensiero',
    category: 'bubble',
    url: SVG_BUBBLE_THOUGHT,
  },
  {
    id: 'b-caption',
    name: 'Didascalia Narratore',
    category: 'bubble',
    url: SVG_BUBBLE_CAPTION,
  },
  {
    id: 'b-whisper',
    name: 'Sussurro Tratteggiato',
    category: 'bubble',
    url: SVG_BUBBLE_WHISPER,
  },
];

// Manga Graphic Emotes & Symbols (Speed lines, sweat, anger, etc.)
const SVG_SWEAT_DROP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120"><path d="M 50 10 C 50 10 15 65 15 85 C 15 105 30 115 50 115 C 70 115 85 105 85 85 C 85 65 50 10 50 10 Z" fill="%2338bdf8" stroke="%230284c7" stroke-width="4"/><path d="M 40 75 A 15 15 0 0 1 30 95" stroke="%23ffffff" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;

const SVG_ANGER_MARK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M 25 10 Q 50 25 75 10 M 25 90 Q 50 75 75 90 M 10 25 Q 25 50 10 75 M 90 25 Q 75 50 90 75" fill="none" stroke="%23dc2626" stroke-width="8" stroke-linecap="round"/></svg>`;

const SVG_SPEED_LINES = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><line x1="10" y1="20" x2="190" y2="20" stroke="%23000000" stroke-width="6" stroke-linecap="round"/><line x1="40" y1="50" x2="170" y2="50" stroke="%23000000" stroke-width="8" stroke-linecap="round"/><line x1="20" y1="80" x2="185" y2="80" stroke="%23000000" stroke-width="5" stroke-linecap="round"/></svg>`;

const SVG_SURPRISE_LINES = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><line x1="60" y1="10" x2="60" y2="35" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="85" x2="60" y2="110" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="10" y1="60" x2="35" y2="60" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="85" y1="60" x2="110" y2="60" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="25" y1="25" x2="45" y2="45" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="75" y1="75" x2="95" y2="95" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="95" y1="25" x2="75" y2="45" stroke="%23000000" stroke-width="5" stroke-linecap="round"/><line x1="45" y1="75" x2="25" y2="95" stroke="%23000000" stroke-width="5" stroke-linecap="round"/></svg>`;

export const COMIC_SYMBOLS: Asset[] = [
  {
    id: 'sym-sweat',
    name: 'Goccia Imbarazzo',
    category: 'effect',
    url: SVG_SWEAT_DROP,
  },
  {
    id: 'sym-anger',
    name: 'Simbolo Rabbia',
    category: 'effect',
    url: SVG_ANGER_MARK,
  },
  {
    id: 'sym-speed',
    name: 'Linee Velocità',
    category: 'effect',
    url: SVG_SPEED_LINES,
  },
  {
    id: 'sym-surprise',
    name: 'Linee Sorpresa (!)',
    category: 'effect',
    url: SVG_SURPRISE_LINES,
  },
];
