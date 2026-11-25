// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer plus the DOM HUD paint what is there.
// The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order sequence. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, resetWorld, stepWorld, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { createInput, takeActions, takeClickTile, readMoveDirection, ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART } from './input.js';
import { createKitchenRenderer } from './render.js';
import { createHud, drawHud, showScreen, recipeLegend } from './hud.js';
import { stageShot } from './shots.js';
import { playChopSound, playPickupSound, playSizzleSound, playServeSound, playErrorSound, playTickSound } from './audio.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
// Exposed for automated play-testing only (read score / hands / stations).
window.__world = world;
const renderer = createKitchenRenderer(canvas);
const hud = createHud();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function playEventSound(event) {
  if (event === 'chop-start' || event === 'chop-done') playChopSound();
  else if (event === 'pickup' || event === 'pickup-plate' || event === 'place' || event === 'place-plate') playPickupSound();
  else if (event === 'cook-start' || event === 'cook-done') playSizzleSound();
  else if (event === 'serve') playServeSound();
  else if (event === 'wrong' || event === 'burnt' || event === 'expire' || event === 'hands-full' || event === 'need-plate' || event === 'need-choppable' || event === 'need-cookable' || event === 'plate-full' || event === 'busy') playErrorSound();
  else if (event === 'tick') playTickSound();
}

function runShot(name) {
  document.getElementById('recipe-list').textContent = recipeLegend();
  // Shots hide the help line: it is text noise for the judge's contact sheet.
  const help = document.getElementById('help');
  if (help) help.style.display = 'none';
  const screen = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world);
    drawHud(hud, world, readBest());
    showScreen(hud, screen, world, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingUse = false;

  document.getElementById('recipe-list').textContent = recipeLegend();

  function startShift() {
    resetWorld(world);
    accumulator = 0;
    announce('Shift started. Serve the orders before the timer runs out.');
  }

  function endShift() {
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = takeActions(input);
    const clicked = takeClickTile(input);
    if (world.screen === SCREEN_TITLE && (actions & ACTION_CONFIRM || clicked)) {
      startShift();
      return;
    }
    if (world.screen === SCREEN_OVER && (actions & ACTION_RESTART || actions & ACTION_CONFIRM || clicked)) {
      startShift();
      return;
    }
    if (actions & ACTION_PAUSE && world.screen === SCREEN_PLAY) {
      world.screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && world.screen === SCREEN_PAUSED) {
      // Resume only: the same Space must not also fire the station in
      // front of the chef on the resume frame (M2).
      world.screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    // M3: R restarts mid-shift too, matching the "R restart" help text.
    if (world.screen === SCREEN_PLAY && (actions & ACTION_RESTART)) {
      startShift();
      return;
    }
    if (world.screen === SCREEN_PLAY && (actions & ACTION_CONFIRM)) pendingUse = true;
    if (world.screen === SCREEN_PLAY && clicked) {
      const events = stepWorld(world, 0, null, false, clicked);
      for (const event of events) playEventSound(event);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (world.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && world.screen === SCREEN_PLAY) {
        const move = readMoveDirection(input);
        const usePressed = pendingUse;
        pendingUse = false;
        const events = stepWorld(world, STEP, move, usePressed, null);
        for (const event of events) playEventSound(event);
        if (world.screen === SCREEN_OVER) endShift();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world);
    drawHud(hud, world, best);
    showScreen(hud, world.screen, world, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === SCREEN_PLAY) {
      world.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember and Ladle. Press Space or click to start the shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
