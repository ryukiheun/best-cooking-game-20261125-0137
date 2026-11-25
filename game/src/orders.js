// The order queue: up to three tickets on the board, each with a patience bar.
// A served plate matches an order when its finished items are exactly the
// recipe's set, in any order. Serving grows a combo; letting a ticket expire
// breaks it.
import { ORDER, RECIPES, SCORE } from './config.js';
import { pickRandom } from './random.js';

export function createOrderBoard(random) {
  const board = {
    active: [],
    served: 0,
    expired: 0,
    combo: 0,
    comboTimer: 0,
    nextId: 1,
    spawnTimer: 4,
    random,
  };
  addOrder(board);
  addOrder(board);
  addOrder(board);
  return board;
}

export function addOrder(board) {
  if (board.active.length >= ORDER.maxActive) return null;
  const taken = new Set(board.active.map((order) => order.recipe.id));
  const fresh = RECIPES.filter((recipe) => !taken.has(recipe.id));
  const recipe = pickRandom(board.random, fresh.length ? fresh : RECIPES);
  const order = {
    id: board.nextId,
    recipe,
    patience: ORDER.patienceSeconds,
    maxPatience: ORDER.patienceSeconds,
  };
  board.nextId += 1;
  board.active.push(order);
  return order;
}

export function findMatchingOrder(board, plateItems) {
  for (const order of board.active) {
    if (plateMatchesRecipe(plateItems, order.recipe)) return order;
  }
  return null;
}

export function plateMatchesRecipe(plateItems, recipe) {
  if (plateItems.length !== recipe.needs.length) return false;
  const remaining = [...recipe.needs];
  for (const item of plateItems) {
    const index = remaining.indexOf(item);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

export function serveOrder(board, order) {
  board.active = board.active.filter((entry) => entry.id !== order.id);
  board.served += 1;
  board.combo = Math.min(board.combo + 1, SCORE.maxCombo);
  board.comboTimer = SCORE.comboWindowSeconds;
  const earned = order.recipe.price + (board.combo - 1) * 25;
  addOrder(board);
  return earned;
}

export function updateOrderBoard(board, step) {
  if (board.comboTimer > 0) {
    board.comboTimer -= step;
    if (board.comboTimer <= 0) board.combo = 0;
  }
  board.spawnTimer -= step;
  if (board.spawnTimer <= 0) {
    addOrder(board);
    board.spawnTimer = ORDER.spawnSeconds;
  }
  let expiredCount = 0;
  for (const order of [...board.active]) {
    order.patience -= step;
    if (order.patience <= 0) {
      board.active = board.active.filter((entry) => entry.id !== order.id);
      board.expired += 1;
      board.combo = 0;
      expiredCount += 1;
      addOrder(board);
    }
  }
  return expiredCount;
}
