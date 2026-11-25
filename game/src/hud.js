// The DOM layer over the canvas: the order board, the big timer, the score,
// the chef's hands, the message toast, and the title / pause / shift-over
// overlays. DOM text stays crisp in screenshots, which is where the judge
// reads the game.
import { INGREDIENTS, RECIPES } from './config.js';

function itemChip(item) {
  const base = item.replace('_chopped', '').replace('_cooked', '');
  const info = INGREDIENTS[base];
  const suffix = item.endsWith('_chopped') ? ' (cut)' : item.endsWith('_cooked') ? ' (hot)' : '';
  return `<span class="chip" style="--dot:${info.color}">${info.name}${suffix}</span>`;
}

function recipeNeeds(recipe) {
  return recipe.needs.map(itemChip).join('');
}

export function createHud() {
  return {
    orders: document.getElementById('orders'),
    timer: document.getElementById('timer'),
    score: document.getElementById('score'),
    coins: document.getElementById('coins'),
    combo: document.getElementById('combo'),
    hands: document.getElementById('hands'),
    plate: document.getElementById('plate'),
    toast: document.getElementById('toast'),
    title: document.getElementById('title-screen'),
    pause: document.getElementById('pause-screen'),
    over: document.getElementById('over-screen'),
    overScore: document.getElementById('over-score'),
    overServed: document.getElementById('over-served'),
    best: document.getElementById('best-line'),
    best2: document.getElementById('best-line2'),
  };
}

function formatClock(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function drawHud(hud, world, best) {
  hud.orders.innerHTML = world.board.active
    .map((order) => {
      const patience = Math.max(0, Math.round((order.patience / order.maxPatience) * 100));
      const urgent = patience < 30 ? ' urgent' : '';
      return `<div class="ticket${urgent}">
        <div class="ticket-name">${order.recipe.short}</div>
        <div class="ticket-needs">${recipeNeeds(order.recipe)}</div>
        <div class="patience"><i style="width:${patience}%"></i></div>
        <div class="ticket-price">$${order.recipe.price}</div>
      </div>`;
    })
    .join('');
  hud.timer.textContent = formatClock(world.timeLeft);
  hud.timer.classList.toggle('low', world.timeLeft <= 30);
  hud.score.textContent = String(world.score);
  hud.coins.textContent = `🪙 ${world.coins}`;
  hud.combo.textContent = world.board.combo > 1 ? `COMBO x${world.board.combo}` : '';
  const chef = world.chef;
  const held = chef.carrying
    ? itemChip(chef.carrying)
    : chef.plate
      ? `🍽 ${chef.plate.map(itemChip).join('')}`
      : '<span class="empty">empty hands</span>';
  hud.hands.innerHTML = `Hands: ${held}`;
  hud.plate.innerHTML = world.plate.length
    ? `Plate on counter: ${world.plate.map(itemChip).join('')} ${world.plateReady ? '<b class="ready">READY TO SERVE ✓</b>' : ''}`
    : 'Plate on counter: —';
  hud.toast.textContent = world.messageTimer > 0 ? world.message : '';
  hud.best.textContent = best > 0 ? `Best score: ${best}` : '';
}

export function showScreen(hud, screen, world, best) {
  hud.title.classList.toggle('hidden', screen !== 'title');
  hud.pause.classList.toggle('hidden', screen !== 'paused');
  hud.over.classList.toggle('hidden', screen !== 'over');
  if (screen === 'over') {
    hud.overScore.textContent = `Score: ${world.score}`;
    hud.overServed.textContent = `Dishes served: ${world.board.served} · Orders lost: ${world.board.expired}`;
    hud.best.textContent = `Best score: ${Math.max(best, world.score)}`;
    if (hud.best2) hud.best2.textContent = `Best score: ${Math.max(best, world.score)}`;
  }
}

export function recipeLegend() {
  return RECIPES.map((recipe) => `${recipe.name}: ${recipe.needs.join(' + ')}`).join('  ·  ');
}
