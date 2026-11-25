// Keyboard and mouse, desktop-first: WASD or arrows to walk the grid,
// Space or E to use the station the chef faces, P or Escape to pause,
// R to restart any time, and a mouse click to walk to a tile or use a
// station beside the chef. Clicks give back a grid tile for the world to act on.
import { FIELD, GRID_COLS, GRID_ROWS, GRID_TOP, TILE } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    actions: 0,
    clickTile: null,
    canvas,
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') {
      input.actions |= ACTION_CONFIRM;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') input.actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') input.actions |= ACTION_RESTART;
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  canvas.addEventListener('pointerdown', (event) => {
    // CSS pixels, not backing-store pixels: the canvas is DPR-scaled, so
    // canvas.width is up to 2x the CSS size and dividing by it directly
    // doubles the tile on HiDPI screens (B4).
    const rect = canvas.getBoundingClientRect();
    const cssX = (event.clientX - rect.left) / rect.width * FIELD.width;
    const cssY = (event.clientY - rect.top) / rect.height * FIELD.height;
    const col = Math.floor(cssX / TILE);
    const row = Math.floor((cssY - GRID_TOP) / TILE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      input.clickTile = { col, row };
    }
    // A click never fires the keyboard confirm: the world answers the tile
    // itself, so a walk-to click cannot also use the station the chef faces.
  });

  // B3: the title / pause / shift-over overlays cover the canvas, so a
  // click on them never reaches the canvas listener. Clicking an overlay
  // is a confirm (start / resume / restart — main.js decides which).
  document.querySelectorAll('.overlay').forEach((overlay) => {
    overlay.addEventListener('pointerdown', () => {
      input.actions |= ACTION_CONFIRM;
    });
  });

  return input;
}

export function takeActions(input) {
  const actions = input.actions;
  input.actions = 0;
  return actions;
}

export function takeClickTile(input) {
  const tile = input.clickTile;
  input.clickTile = null;
  return tile;
}

export function readMoveDirection(input) {
  const keys = input.keys;
  if (keys.has('ArrowUp') || keys.has('KeyW')) return 'up';
  if (keys.has('ArrowDown') || keys.has('KeyS')) return 'down';
  if (keys.has('ArrowLeft') || keys.has('KeyA')) return 'left';
  if (keys.has('ArrowRight') || keys.has('KeyD')) return 'right';
  return null;
}
