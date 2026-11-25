// Every tuning number, colour and recipe in one place. The kitchen is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 150;
export const TILE = 64;
export const GRID_COLS = 20;
export const GRID_ROWS = 9;
export const GRID_TOP = 128;

// Ingredient ids. A chopped id is the raw id plus "_chopped"; a cooked id is
// the raw id plus "_cooked". Only tomato and onion chop, only beef and pasta cook.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e63b2e', shape: 'round', chops: true },
  onion: { name: 'Onion', color: '#f3e2f5', shape: 'round', chops: true },
  bread: { name: 'Bread', color: '#e8a94e', shape: 'square', chops: false },
  beef: { name: 'Beef', color: '#8a3b2e', shape: 'square', cooks: true },
  cheese: { name: 'Cheese', color: '#f7c948', shape: 'triangle', chops: false },
  pasta: { name: 'Pasta', color: '#f2d38a', shape: 'strip', cooks: true },
};

// A recipe is the exact set of finished items a plate must hold to match an order.
export const RECIPES = [
  {
    id: 'soup',
    name: 'Sunset Tomato Soup',
    short: 'Tomato Soup',
    needs: ['tomato_chopped', 'onion_chopped'],
    price: 120,
    color: '#e63b2e',
  },
  {
    id: 'burger',
    name: 'Golden Cheese Burger',
    short: 'Cheese Burger',
    needs: ['bread', 'beef_cooked', 'cheese'],
    price: 180,
    color: '#e8a94e',
  },
  {
    id: 'pasta',
    name: 'Hearth Herb Pasta',
    short: 'Herb Pasta',
    needs: ['pasta_cooked', 'tomato_chopped', 'beef_cooked'],
    price: 220,
    color: '#f2d38a',
  },
];

export const ORDER = {
  maxActive: 3,
  patienceSeconds: 75,
  spawnSeconds: 14,
  expirePenalty: 40,
};

export const STATION = {
  chopSeconds: 2.0,
  cookSeconds: 3.5,
  burnSeconds: 9.0,
};

export const SCORE = {
  wrongServePenalty: 50,
  comboWindowSeconds: 20,
  maxCombo: 5,
};

export const PALETTE = {
  floorLight: '#f0c078',
  floorDark: '#dfa458',
  wall: '#c96f3f',
  counter: '#8a5a33',
  counterTop: '#b5773f',
  islandTop: '#a06a35',
  rug: '#b03a2e',
  board: '#fff6e0',
  text: '#2b1d12',
  cream: '#fff8e7',
  accent: '#d94f2b',
  gold: '#f7c948',
  green: '#3f9e4d',
  red: '#d9382b',
  steel: '#9aa5ad',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'ember-ladle.best';
