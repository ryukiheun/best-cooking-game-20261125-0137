// The kitchen itself: the chef, the stations, the plate being built, the clock
// and the score. One fixed step advances cooking, chopping, orders and the
// timer; using a station is one function the keyboard and the mouse both call.
import { GRID_COLS, GRID_ROWS, SCORE, SHIFT_SECONDS } from './config.js';
import { createChef, chefFacingTile, chefTryStep, chefUpdate } from './chef.js';
import { buildStations, stationAtTile, stationBeside, STATION_KIND, isChoppable, isCookable, cookedName, tickChopping, tickCooking } from './stations.js';
import { createOrderBoard, findMatchingOrder, serveOrder, updateOrderBoard } from './orders.js';
import { ORDER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createWorld(random) {
  return {
    random,
    screen: SCREEN_TITLE,
    chef: createChef(10, 6),
    stations: buildStations(),
    board: createOrderBoard(random),
    plate: [],
    plateReady: false,
    timeLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    message: '',
    messageTimer: 0,
    autoTarget: null,
    lastTickSecond: SHIFT_SECONDS,
  };
}

export function resetWorld(world) {
  // Keep the station objects: render.js keys its progress bars and flames
  // by station identity, so replacing them would hide every bar after the
  // first shift starts (B2). Reset each station in place instead.
  const stations = world.stations;
  const fresh = createWorld(world.random);
  Object.assign(world, fresh);
  world.stations = stations;
  for (const station of stations) {
    station.progress = 0;
    station.item = null;
    station.busy = false;
    station.ready = false;
    station.done = false;
  }
  world.servePlate = null;
  world.screen = SCREEN_PLAY;
}

export function isWalkable(world, col, row) {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
  return stationAtTile(world.stations, col, row) === null;
}

function setMessage(world, text) {
  world.message = text;
  world.messageTimer = 2.5;
}

function finishedName(item) {
  return item
    .replace('_chopped', ' (chopped)')
    .replace('_cooked', ' (cooked)')
    .replace(/^./, (letter) => letter.toUpperCase());
}

// Use the station in front of the chef, or the station the mouse clicked.
// Returns an event name for the sound layer, or null.
export function useStation(world, station) {
  if (!station) return null;
  const chef = world.chef;
  if (station.kind === STATION_KIND.CRATE) {
    if (chef.carrying || chef.plate) return 'hands-full';
    chef.carrying = station.ingredient;
    return 'pickup';
  }
  if (station.kind === STATION_KIND.BIN) {
    if (!chef.carrying && !chef.plate) return null;
    chef.carrying = null;
    chef.plate = null;
    setMessage(world, 'Tossed it in the bin.');
    return 'trash';
  }
  if (station.kind === STATION_KIND.CHOP) {
    if (station.ready) {
      if (chef.carrying || chef.plate) return 'hands-full';
      chef.carrying = station.item;
      station.item = null;
      station.ready = false;
      return 'pickup';
    }
    if (station.busy) {
      setMessage(world, 'Still chopping…');
      return 'busy';
    }
    if (!chef.carrying || !isChoppable(chef.carrying)) return 'need-choppable';
    station.item = chef.carrying;
    chef.carrying = null;
    station.busy = true;
    station.progress = 0;
    return 'chop-start';
  }
  if (station.kind === STATION_KIND.STOVE) {
    if (station.done) {
      if (chef.carrying || chef.plate) return 'hands-full';
      if (station.item == null) {
        // Defensive: a done stove with nothing on it is an empty stove.
        station.done = false;
        station.busy = false;
        station.progress = 0;
        return null;
      }
      chef.carrying = station.item;
      station.item = null;
      station.done = false;
      station.busy = false; // B1: without this, tickCooking re-completes a null item.
      station.progress = 0;
      return 'pickup';
    }
    if (station.busy) {
      setMessage(world, 'Still cooking…');
      return 'busy';
    }
    if (!chef.carrying || !isCookable(chef.carrying)) return 'need-cookable';
    station.item = chef.carrying;
    chef.carrying = null;
    station.busy = true;
    station.done = false;
    station.progress = 0;
    return 'cook-start';
  }
  if (station.kind === STATION_KIND.ASSEMBLY) {
    if (chef.plate) {
      // Put a carried plate back down on an empty counter to add more.
      if (world.plate.length === 0) {
        world.plate = [...chef.plate];
        chef.plate = null;
        refreshPlate(world);
        return 'place-plate';
      }
      setMessage(world, 'Hands full — serve the plate first.');
      return 'hands-full';
    }
    if (chef.carrying) {
      if (world.plate.length >= 3) return 'plate-full';
      world.plate.push(chef.carrying);
      chef.carrying = null;
      refreshPlate(world);
      return 'place';
    }
    if (world.plate.length === 0) return null;
    chef.plate = [...world.plate];
    world.plate = [];
    refreshPlate(world);
    return 'pickup-plate';
  }
  if (station.kind === STATION_KIND.PASS) {
    if (!chef.plate) return 'need-plate';
    const order = findMatchingOrder(world.board, chef.plate);
    if (!order) {
      const served = chef.plate.map((item) => finishedName(item)).join(' + ');
      const closest = world.board.active[0];
      const needs = closest ? closest.recipe.needs.map((item) => finishedName(item)).join(' + ') : '—';
      world.score = Math.max(0, world.score - SCORE.wrongServePenalty);
      world.board.combo = 0;
      chef.plate = null;
      setMessage(world, `Wrong dish! You served ${served} — next ticket needs ${needs}. -50`);
      return 'wrong';
    }
    const earned = serveOrder(world.board, order);
    world.score += earned;
    world.coins += earned;
    chef.plate = null;
    setMessage(world, `${order.recipe.name} served! +${earned}`);
    return 'serve';
  }
  return null;
}

export function refreshPlate(world) {
  world.plateReady = findMatchingOrder(world.board, world.plate) !== null;
}

function walkToward(world, target) {
  const chef = world.chef;
  if (chef.moving) return;
  // BFS around counters: a straight-line step stalls when the preferred
  // axis is blocked (the island sits on the direct column), so find a real
  // path to any tile beside the target station (or to the target tile).
  const goalTiles = new Set();
  if (target.station) {
    for (const [dCol, dRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const col = target.station.col + dCol;
      const row = target.station.row + dRow;
      if (isWalkable(world, col, row)) goalTiles.add(`${col},${row}`);
    }
  } else if (isWalkable(world, target.col, target.row)) {
    goalTiles.add(`${target.col},${target.row}`);
  }
  if (goalTiles.size === 0) {
    world.autoTarget = null;
    return;
  }
  const startKey = `${chef.col},${chef.row}`;
  if (goalTiles.has(startKey)) return;
  const previous = new Map([[startKey, null]]);
  const queue = [[chef.col, chef.row]];
  let found = null;
  while (queue.length > 0 && found === null) {
    const [col, row] = queue.shift();
    for (const [dCol, dRow] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextCol = col + dCol;
      const nextRow = row + dRow;
      const key = `${nextCol},${nextRow}`;
      if (previous.has(key) || !isWalkable(world, nextCol, nextRow)) continue;
      previous.set(key, [col, row]);
      if (goalTiles.has(key)) {
        found = [nextCol, nextRow];
        break;
      }
      queue.push([nextCol, nextRow]);
    }
  }
  if (!found) {
    world.autoTarget = null;
    return;
  }
  // Reconstruct start -> found, then take the first step off the start tile.
  const path = [found];
  let cursor = found;
  while (!(cursor[0] === chef.col && cursor[1] === chef.row)) {
    cursor = previous.get(`${cursor[0]},${cursor[1]}`);
    if (!cursor) break;
    path.unshift(cursor);
  }
  const step = path[1];
  if (!step) {
    world.autoTarget = null;
    return;
  }
  const dCol = step[0] - chef.col;
  const dRow = step[1] - chef.row;
  const direction = dCol > 0 ? 'right' : dCol < 0 ? 'left' : dRow > 0 ? 'down' : 'up';
  chefTryStep(chef, dCol, dRow, direction, (col, row) => isWalkable(world, col, row));
}

export function stepWorld(world, step, move, usePressed, clickTarget) {
  const events = [];
  if (world.screen !== SCREEN_PLAY) return events;
  if (world.messageTimer > 0) world.messageTimer -= step;

  if (clickTarget) {
    const station = stationAtTile(world.stations, clickTarget.col, clickTarget.row);
    if (station) {
      const adjacent =
        Math.abs(station.col - world.chef.col) + Math.abs(station.row - world.chef.row) === 1;
      if (adjacent) {
        const event = useStation(world, station);
        if (event) events.push(event);
      } else {
        world.autoTarget = { col: station.col, row: station.row, station };
      }
    } else if (isWalkable(world, clickTarget.col, clickTarget.row)) {
      world.autoTarget = { col: clickTarget.col, row: clickTarget.row, station: null };
    }
  }

  if (world.autoTarget) {
    const target = world.autoTarget;
    const distance = Math.abs(target.col - world.chef.col) + Math.abs(target.row - world.chef.row);
    if (target.station && distance === 1) {
      const event = useStation(world, target.station);
      if (event) events.push(event);
      world.autoTarget = null;
    } else if (!target.station && distance === 0) {
      world.autoTarget = null;
    } else {
      walkToward(world, target);
    }
  } else if (move) {
    const directions = {
      up: [0, -1, 'up'],
      down: [0, 1, 'down'],
      left: [-1, 0, 'left'],
      right: [1, 0, 'right'],
    };
    const [dCol, dRow, direction] = directions[move];
    chefTryStep(world.chef, dCol, dRow, direction, (col, row) => isWalkable(world, col, row));
  }

  if (usePressed) {
    const facing = chefFacingTile(world.chef);
    const station = stationAtTile(world.stations, facing.col, facing.row)
      || stationBeside(world.stations, world.chef.col, world.chef.row);
    const event = useStation(world, station);
    if (event) events.push(event);
  }

  chefUpdate(world.chef, step);

  for (const station of world.stations) {
    if (station.kind === STATION_KIND.CHOP && station.busy) {
      const finished = tickChopping(station, step);
      if (finished) {
        station.item = finished;
        station.ready = true;
        events.push('chop-done');
        setMessage(world, `${finishedName(finished)} ready on the board.`);
      }
    }
    if (station.kind === STATION_KIND.STOVE && station.busy) {
      const result = tickCooking(station, step);
      if (result === 'done') {
        if (station.item == null) continue; // guard: never cook a null item
        station.item = cookedName(station.item);
        events.push('cook-done');
        setMessage(world, `${finishedName(station.item)} is cooked — grab it before it burns!`);
      } else if (result === 'burnt') {
        events.push('burnt');
        setMessage(world, 'Burnt! That pan is ruined.');
      }
    }
  }

  const expiredCount = updateOrderBoard(world.board, step);
  if (expiredCount > 0) {
    world.score = Math.max(0, world.score - ORDER.expirePenalty * expiredCount);
    events.push('expire');
    setMessage(world, expiredCount > 1 ? `${expiredCount} orders walked out. -${ORDER.expirePenalty * expiredCount}` : 'An order walked out. -40');
  }
  refreshPlate(world);

  world.timeLeft -= step;
  const wholeSecond = Math.ceil(world.timeLeft);
  if (wholeSecond !== world.lastTickSecond) {
    world.lastTickSecond = wholeSecond;
    if (wholeSecond <= 10 && wholeSecond > 0) events.push('tick');
  }
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    world.screen = SCREEN_OVER;
    events.push('shift-over');
  }
  return events;
}
