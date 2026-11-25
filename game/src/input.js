// Keyboard and mouse, desktop-first: WASD or arrows to walk the grid,
// Space or E to use the station the chef faces, P or Escape to pause,
// R to restart after a shift, and a mouse click to walk to a tile or use a
// station beside the chef. Clicks give back a grid tile for the world to act on.
import { GRID_COLS, GRID_ROWS, GRID_TOP, TILE } from './config.js';

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
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;
    const col = Math.floor(pixelX / TILE);
    const row = Math.floor((pixelY - GRID_TOP) / TILE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      input.clickTile = { col, row };
    }
    // A click never fires the keyboard confirm: the world answers the tile
    // itself, so a walk-to click cannot also use the station the chef faces.
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
