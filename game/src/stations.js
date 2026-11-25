// The kitchen's stations: where each one sits on the grid, what it accepts,
// and how chopping and cooking progress while the chef works there.
// A station is a tile the chef cannot walk through but can use from beside it.
import { GRID_COLS, INGREDIENTS, STATION } from './config.js';

export const STATION_KIND = {
  CRATE: 'crate',
  CHOP: 'chop',
  STOVE: 'stove',
  ASSEMBLY: 'assembly',
  PASS: 'pass',
  BIN: 'bin',
  ISLAND: 'island',
  DECOR: 'decor',
};

function stationAt(col, row, kind, label, ingredient) {
  return { col, row, kind, label, ingredient: ingredient || null, progress: 0, item: null, busy: false, ready: false, done: false };
}

export function buildStations() {
  const stations = [];
  const crates = ['tomato', 'onion', 'bread', 'beef', 'cheese', 'pasta'];
  crates.forEach((ingredient, index) => {
    stations.push(stationAt(1 + index * 3, 0, STATION_KIND.CRATE, INGREDIENTS[ingredient].name, ingredient));
  });
  stations.push(stationAt(0, 3, STATION_KIND.CHOP, 'Chopping Board'));
  stations.push(stationAt(0, 5, STATION_KIND.CHOP, 'Chopping Board'));
  stations.push(stationAt(GRID_COLS - 1, 3, STATION_KIND.STOVE, 'Stove'));
  stations.push(stationAt(GRID_COLS - 1, 5, STATION_KIND.STOVE, 'Stove'));
  stations.push(stationAt(9, 7, STATION_KIND.ASSEMBLY, 'Assembly Counter'));
  stations.push(stationAt(10, 7, STATION_KIND.ASSEMBLY, 'Assembly Counter'));
  stations.push(stationAt(GRID_COLS - 1, 0, STATION_KIND.PASS, 'Serving Window'));
  stations.push(stationAt(0, 0, STATION_KIND.BIN, 'Bin'));
  // Central island counter (ingredients on top) and potted herbs: decor
  // stations the chef walks around, so the middle of the kitchen is not
  // empty floor. ISLAND/DECOR have no useStation action (null there).
  for (const col of [8, 9, 10, 11]) stations.push(stationAt(col, 4, STATION_KIND.ISLAND, 'Island Counter'));
  stations.push(stationAt(0, 8, STATION_KIND.DECOR, 'Herb Pot'));
  stations.push(stationAt(GRID_COLS - 1, 8, STATION_KIND.DECOR, 'Herb Pot'));
  return stations;
}

export function stationAtTile(stations, col, row) {
  return stations.find((station) => station.col === col && station.row === row) || null;
}

export function stationBeside(stations, col, row) {
  const neighbours = [
    [col + 1, row],
    [col - 1, row],
    [col, row + 1],
    [col, row - 1],
  ];
  for (const [nextCol, nextRow] of neighbours) {
    const found = stationAtTile(stations, nextCol, nextRow);
    if (found) return found;
  }
  return null;
}

export function isChoppable(item) {
  return item !== null && INGREDIENTS[item] && INGREDIENTS[item].chops === true;
}

export function isCookable(item) {
  return item !== null && INGREDIENTS[item] && INGREDIENTS[item].cooks === true;
}

export function choppedName(item) {
  return `${item}_chopped`;
}

export function cookedName(item) {
  return `${item}_cooked`;
}

// Advance a chopping job one step; returns the finished item or null.
// Guard: a job with no item (already picked up) never completes.
export function tickChopping(station, step) {
  if (!station.busy || station.kind !== STATION_KIND.CHOP) return null;
  if (station.item == null) {
    station.busy = false;
    station.progress = 0;
    return null;
  }
  station.progress += step / STATION.chopSeconds;
  if (station.progress >= 1) {
    const finished = choppedName(station.item);
    station.item = null;
    station.busy = false;
    station.progress = 0;
    return finished;
  }
  return null;
}

// Advance a cooking job; returns 'done' at the perfect moment, 'burnt' when it
// sat too long, or null while it is still cooking.
// Guards (B1/M1): a job with no item never completes — picking the cooked food
// up clears busy AND done, so tickCooking cannot re-complete a null item
// into "null_cooked"; a burnt pan clears done too, so no phantom ready bar.
export function tickCooking(station, step) {
  if (!station.busy || station.kind !== STATION_KIND.STOVE) return null;
  if (station.item == null) {
    station.busy = false;
    station.done = false;
    station.progress = 0;
    return null;
  }
  station.progress += step / STATION.cookSeconds;
  if (station.progress >= STATION.burnSeconds / STATION.cookSeconds) {
    station.item = null;
    station.busy = false;
    station.done = false;
    station.progress = 0;
    return 'burnt';
  }
  if (station.progress >= 1 && !station.done) {
    station.done = true;
    return 'done';
  }
  return null;
}
