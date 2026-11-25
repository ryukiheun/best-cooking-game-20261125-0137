// The chef: one tile at a time across the kitchen floor, turning to face the
// direction of travel, with a smooth slide between tiles and a snap on arrival
// so the pixel look never wobbles.
import { GRID_COLS, GRID_ROWS, TILE } from './config.js';

export function createChef(startCol, startRow) {
  return {
    col: startCol,
    row: startRow,
    x: startCol * TILE,
    y: startRow * TILE,
    targetX: startCol * TILE,
    targetY: startRow * TILE,
    facing: 'down',
    moving: false,
    walkPhase: 0,
    carrying: null,
    speedTilesPerSecond: 7,
  };
}

export function chefFacingTile(chef) {
  const offsets = {
    up: { col: 0, row: -1 },
    down: { col: 0, row: 1 },
    left: { col: -1, row: 0 },
    right: { col: 1, row: 0 },
  };
  const offset = offsets[chef.facing];
  return { col: chef.col + offset.col, row: chef.row + offset.row };
}

export function chefTryStep(chef, dCol, dRow, direction, isWalkable) {
  if (chef.moving) return false;
  chef.facing = direction;
  const nextCol = chef.col + dCol;
  const nextRow = chef.row + dRow;
  if (nextCol < 0 || nextCol >= GRID_COLS || nextRow < 0 || nextRow >= GRID_ROWS) return false;
  if (!isWalkable(nextCol, nextRow)) return false;
  chef.col = nextCol;
  chef.row = nextRow;
  chef.targetX = nextCol * TILE;
  chef.targetY = nextRow * TILE;
  chef.moving = true;
  return true;
}

export function chefUpdate(chef, step) {
  if (!chef.moving) return;
  const distance = chef.speedTilesPerSecond * TILE * step;
  const dx = chef.targetX - chef.x;
  const dy = chef.targetY - chef.y;
  const remaining = Math.hypot(dx, dy);
  chef.walkPhase += step * 10;
  if (remaining <= distance) {
    chef.x = chef.targetX;
    chef.y = chef.targetY;
    chef.moving = false;
    chef.walkPhase = 0;
  } else {
    chef.x += (dx / remaining) * distance;
    chef.y += (dy / remaining) * distance;
  }
}
