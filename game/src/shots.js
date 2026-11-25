// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a
// real game state by hand — no autoplay, no randomness — so the same seed
// always gives the same frame, and every frame shows a kitchen that is
// actually mid-game: orders on the board, food on the counters, a plate
// being built, a timer running and a dish ready to serve.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, refreshPlate } from './world.js';
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

export function stageShot(name, world) {
  world.screen = SCREEN_PLAY;
  world.timeLeft = 150;
  world.score = 0;
  world.coins = 0;
  world.board.combo = 0;
  world.plate = [];
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
    world.timeLeft = 96;
    world.score = 180;
    world.coins = 180;
    world.board.combo = 2;
    world.board.comboTimer = 12;
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
    world.timeLeft = 88;
    world.score = 340;
    world.coins = 340;
    world.board.combo = 3;
    world.board.comboTimer = 15;
    placeChef(world, 18, 0, 'right');
    world.chef.plate = firstOrder ? [...firstOrder.recipe.needs] : ['bread', 'beef_cooked', 'cheese'];
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
    world.timeLeft = 0;
    world.score = 1240;
    world.coins = 1240;
    world.board.served = 9;
    world.board.expired = 1;
    placeChef(world, 10, 4, 'down');
    world.plate = firstOrder ? firstOrder.recipe.needs.slice(0, -1) : ['tomato_chopped'];
    refreshPlate(world);
    return SCREEN_OVER;
  }

  // start: the cover. Title overlay over a kitchen already alive; the chef
  // stands clear of the panel so the cover still shows the cook at work.
  world.timeLeft = 150;
  world.plate = firstOrder ? firstOrder.recipe.needs.slice(0, -1) : ['tomato_chopped'];
  placeChef(world, 3, 6, 'right');
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
  refreshPlate(world);
  return SCREEN_TITLE;
}
