// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a
// real game state by hand — no autoplay, no randomness — so the same seed
// always gives the same frame, and every frame shows a kitchen that is
// actually mid-game: orders on the board, food on the counters, a plate
// being built, a timer running and a dish ready to serve.
// Patience is staged to match the elapsed time on the clock (M4): an order
// created with 75 s of patience has 75 − elapsed seconds left, so a shot
// taken at 1:36 does not show full green bars.
import { SCREEN_PLAY, refreshPlate } from './world.js';
import { STATION_KIND } from './stations.js';

function placeChef(world, col, row, facing) {
  const chef = world.chef;
  chef.col = col;
  chef.row = row;
  chef.x = col * 64;
  chef.y = row * 64;
  chef.targetX = chef.x;
  chef.targetY = chef.y;
  chef.moving = false;
  chef.facing = facing;
}

function findStation(world, kind, col) {
  return world.stations.find((station) => station.kind === kind && station.col === col);
}

function setPatience(world, secondsLeft) {
  world.board.active.forEach((order, index) => {
    order.patience = Math.max(0, secondsLeft[index] ?? order.patience);
    order.maxPatience = 75;
  });
}

export function stageShot(name, world) {
  world.screen = SCREEN_PLAY;
  world.timeLeft = 150;
  world.score = 0;
  world.coins = 0;
  world.board.combo = 0;
  world.plate = [];
  world.servePlate = null;
  world.chef.carrying = null;
  world.chef.plate = null;
  world.message = '';
  world.messageTimer = 0;
  for (const station of world.stations) {
    station.busy = false;
    station.progress = 0;
    station.item = null;
    station.ready = false;
    station.done = false;
  }
  const firstOrder = world.board.active[0];
  const chop = findStation(world, STATION_KIND.CHOP, 0);
  const stove = findStation(world, STATION_KIND.STOVE, 19);

  if (name === 'play') {
    // 54 s in: ticket 1 is urgent (21 s left, red rim), the others older too.
    world.timeLeft = 96;
    world.score = 180;
    world.coins = 180;
    world.board.combo = 2;
    world.board.comboTimer = 12;
    setPatience(world, [21, 40, 58]);
    world.plate = ['tomato_chopped'];
    placeChef(world, 1, 3, 'left');
    world.chef.carrying = 'onion';
    if (chop) {
      chop.busy = true;
      chop.item = 'tomato';
      chop.progress = 0.55;
    }
    if (stove) {
      stove.busy = true;
      stove.item = 'beef';
      stove.progress = 0.7;
    }
    world.message = 'Chopping… keep the orders moving!';
    world.messageTimer = 99;
    refreshPlate(world);
    return SCREEN_PLAY;
  }

  if (name === 'serve') {
    // 62 s in: the ticket being served is nearly out of patience.
    world.timeLeft = 88;
    world.score = 340;
    world.coins = 340;
    world.board.combo = 3;
    world.board.comboTimer = 15;
    setPatience(world, [13, 45, 62]);
    placeChef(world, 18, 2, 'up');
    world.chef.plate = firstOrder ? [...firstOrder.recipe.needs] : ['bread', 'beef_cooked', 'cheese'];
    // The finished dish sits on the serving window, the chef beside it.
    world.servePlate = [...world.chef.plate];
    if (stove) {
      stove.busy = true;
      stove.item = 'pasta';
      stove.progress = 0.8;
    }
    world.message = 'Plate ready — serve it!';
    world.messageTimer = 99;
    refreshPlate(world);
    return SCREEN_PLAY;
  }

  if (name === 'end') {
    // Action shot, not a panel: the shift just ended (0:00), one ticket
    // expired (empty bar), one dish served at the window, one plate still
    // being built on the counter.
    world.timeLeft = 0;
    world.score = 1240;
    world.coins = 1240;
    world.board.served = 9;
    world.board.expired = 1;
    setPatience(world, [0, 8, 22]);
    placeChef(world, 10, 6, 'down');
    world.plate = firstOrder ? firstOrder.recipe.needs.slice(0, -1) : ['tomato_chopped'];
    world.servePlate = ['bread', 'beef_cooked', 'cheese'];
    if (stove) {
      stove.busy = true;
      stove.item = 'beef';
      stove.progress = 0.9;
    }
    world.message = 'Shift complete — 9 dishes served!';
    world.messageTimer = 99;
    refreshPlate(world);
    return SCREEN_PLAY;
  }

  // start: the cover. No title overlay at all (B1) — a live play frame,
  // chef mid-kitchen by the island, chopping and cooking already under way,
  // a plate half-built on the counter. The top bar already names the game.
  world.timeLeft = 150;
  setPatience(world, [60, 70, 75]);
  world.plate = firstOrder ? firstOrder.recipe.needs.slice(0, -1) : ['tomato_chopped'];
  placeChef(world, 7, 5, 'right');
  world.chef.carrying = 'tomato';
  if (chop) {
    chop.busy = true;
    chop.item = 'onion';
    chop.progress = 0.45;
  }
  if (stove) {
    stove.busy = true;
    stove.item = 'beef';
    stove.progress = 0.6;
  }
  world.message = 'Grab ingredients, chop, cook, serve!';
  world.messageTimer = 99;
  refreshPlate(world);
  return SCREEN_PLAY;
}
