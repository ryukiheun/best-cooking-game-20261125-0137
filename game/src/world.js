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
    chef: createChef(10, 4),
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
  const fresh = createWorld(world.random);
  Object.assign(world, fresh);
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
    if (station.busy) return null;
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
      chef.carrying = station.item;
      station.item = null;
      station.done = false;
      station.progress = 0;
      return 'pickup';
    }
    if (station.busy) return null;
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
      world.score = Math.max(0, world.score - SCORE.wrongServePenalty);
      world.board.combo = 0;
      chef.plate = null;
      setMessage(world, 'Wrong dish! The guests sent it back. -50');
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
  const dCol = target.col - chef.col;
  const dRow = target.row - chef.row;
  const axes = Math.abs(dCol) >= Math.abs(dRow)
    ? [[Math.sign(dCol), 0, dCol > 0 ? 'right' : 'left'], [0, Math.sign(dRow), dRow > 0 ? 'down' : 'up']]
    : [[0, Math.sign(dRow), dRow > 0 ? 'down' : 'up'], [Math.sign(dCol), 0, dCol > 0 ? 'right' : 'left']];
  for (const [stepCol, stepRow, direction] of axes) {
    if (stepCol === 0 && stepRow === 0) continue;
    if (chefTryStep(chef, stepCol, stepRow, direction, (col, row) => isWalkable(world, col, row))) return;
  }
  world.autoTarget = null;
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
        station.item = cookedName(station.item);
        events.push('cook-done');
        setMessage(world, `${finishedName(station.item)} is cooked — grab it before it burns!`);
      } else if (result === 'burnt') {
        events.push('burnt');
        setMessage(world, 'Burnt! That pan is ruined.');
      }
    }
  }

  if (updateOrderBoard(world.board, step)) {
    world.score = Math.max(0, world.score - ORDER.expirePenalty);
    events.push('expire');
    setMessage(world, 'An order walked out. -40');
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
