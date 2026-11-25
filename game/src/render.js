// The Three.js kitchen: one orthographic top-down view, warm bright colours,
// vector-drawn food and counters so every edge stays crisp at any window size.
// Station names are painted on small canvas textures, so the crates, the
// chopping boards, the stoves and the serving window read in a screenshot.
import * as THREE from 'three';
import { FIELD, GRID_COLS, GRID_ROWS, GRID_TOP, INGREDIENTS, PALETTE, TILE } from './config.js';
import { STATION_KIND } from './stations.js';

function toScene(x, y, z) {
  return new THREE.Vector3(x - FIELD.width / 2, FIELD.height / 2 - y, z);
}

function makeLabelTexture(text, background, foreground) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, 256, 64);
  context.fillStyle = foreground;
  context.font = 'bold 30px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function plane(width, height, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.copy(toScene(x, y, z));
  return mesh;
}

function circle(radius, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.copy(toScene(x, y, z));
  return mesh;
}

function ingredientDots(scene, ingredient, centreX, centreY, z) {
  const info = INGREDIENTS[ingredient];
  const spots = [[-14, -8], [12, -10], [0, 10]];
  for (const [dx, dy] of spots) {
    if (info.shape === 'square') {
      scene.add(plane(16, 16, info.color, centreX + dx, centreY + dy, z));
    } else if (info.shape === 'triangle') {
      scene.add(circle(10, info.color, centreX + dx, centreY + dy, z));
    } else {
      scene.add(circle(11, info.color, centreX + dx, centreY + dy, z));
    }
  }
}

export function createKitchenRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(FIELD.width, FIELD.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3ddb0');
  const camera = new THREE.OrthographicCamera(
    -FIELD.width / 2, FIELD.width / 2, FIELD.height / 2, -FIELD.height / 2, 0.1, 100,
  );
  camera.position.z = 10;

  // Checkerboard floor across the whole kitchen.
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const colour = (col + row) % 2 === 0 ? PALETTE.floorLight : PALETTE.floorDark;
      scene.add(plane(TILE - 2, TILE - 2, colour, col * TILE + TILE / 2, GRID_TOP + row * TILE + TILE / 2, 0));
    }
  }
  // Warm wall band above the floor, under the order board.
  scene.add(plane(FIELD.width, 16, PALETTE.wall, FIELD.width / 2, GRID_TOP - 8, 0));

  const dynamic = {
    chef: null,
    carried: null,
    plate: null,
    bars: new Map(),
    flames: new Map(),
    stationLabels: new Map(),
  };

  function buildStations(world) {
    for (const station of world.stations) {
      const cx = station.col * TILE + TILE / 2;
      const cy = GRID_TOP + station.row * TILE + TILE / 2;
      let top = PALETTE.counterTop;
      let border = PALETTE.counter;
      if (station.kind === STATION_KIND.CHOP) top = '#d9a05b';
      if (station.kind === STATION_KIND.STOVE) top = '#5b6068';
      if (station.kind === STATION_KIND.PASS) top = '#f7c948';
      if (station.kind === STATION_KIND.BIN) top = '#7d838a';
      if (station.kind === STATION_KIND.ASSEMBLY) top = '#ffffff';
      scene.add(plane(TILE, TILE, border, cx, cy, 1));
      scene.add(plane(TILE - 8, TILE - 8, top, cx, cy, 2));
      if (station.kind === STATION_KIND.CRATE) {
        ingredientDots(scene, station.ingredient, cx, cy, 3);
      }
      if (station.kind === STATION_KIND.STOVE) {
        const flame = circle(12, '#e8590c', cx, cy, 3);
        scene.add(flame);
        dynamic.flames.set(station, flame);
      }
      if (station.kind === STATION_KIND.ASSEMBLY) {
        const plate = circle(20, '#ffffff', cx, cy, 3);
        plate.material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        scene.add(plate);
        dynamic.plate = plate;
      }
      const labelText = station.kind === STATION_KIND.CHOP ? 'CHOP'
        : station.kind === STATION_KIND.STOVE ? 'STOVE'
        : station.kind === STATION_KIND.PASS ? 'SERVE'
        : station.kind === STATION_KIND.BIN ? 'BIN'
        : station.kind === STATION_KIND.ASSEMBLY ? 'ASSEMBLY'
        : station.label.toUpperCase();
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 15),
        new THREE.MeshBasicMaterial({
          map: makeLabelTexture(labelText, 'rgba(43,29,18,0.85)', '#ffe9b0'),
          transparent: true,
        }),
      );
      label.position.copy(toScene(Math.min(Math.max(cx, 32), FIELD.width - 32), cy + 26, 4));
      scene.add(label);
      const barBack = plane(52, 8, '#2b1d12', cx, cy - 26, 4);
      const barFill = plane(50, 6, '#3f9e4d', cx - 25, cy - 26, 5);
      barFill.geometry.translate(25, 0, 0);
      barBack.visible = false;
      barFill.visible = false;
      scene.add(barBack);
      scene.add(barFill);
      dynamic.bars.set(station, { back: barBack, fill: barFill });
    }
  }

  // The chef: apron body, head, tall white hat, and a nose dot for facing.
  const chefGroup = new THREE.Group();
  const body = circle(20, '#d94f2b', 0, 0, 0);
  const head = circle(13, '#f2c89b', 0, 0, 0);
  const hat = plane(26, 12, '#ffffff', 0, 0, 0);
  const nose = circle(4, '#2b1d12', 0, 0, 0);
  chefGroup.add(body);
  chefGroup.add(head);
  chefGroup.add(hat);
  chefGroup.add(nose);
  chefGroup.position.z = 6;
  scene.add(chefGroup);
  const carriedDot = circle(10, '#e63b2e', 0, 0, 7);
  scene.add(carriedDot);
  // Dots on the assembly plate, one per item already plated.
  const plateDots = [-12, 0, 12].map((dx) => {
    const dot = circle(8, '#ffffff', 0, 0, 4);
    dot.visible = false;
    scene.add(dot);
    return { dot, dx };
  });
  dynamic.chef = chefGroup;
  dynamic.carried = carriedDot;
  dynamic.plateDots = plateDots;

  let stationsBuilt = false;

  function draw(world) {
    if (!stationsBuilt) {
      buildStations(world);
      stationsBuilt = true;
    }
    const chef = world.chef;
    const centreX = chef.x + TILE / 2;
    const centreY = GRID_TOP + chef.y + TILE / 2;
    chefGroup.position.copy(toScene(centreX, centreY, 6));
    const bob = chef.moving ? Math.sin(chef.walkPhase) * 2 : 0;
    chefGroup.scale.set(1, 1 + bob * 0.01, 1);
    const facingOffsets = {
      up: [0, -14, 0, -22],
      down: [0, 14, 0, 22],
      left: [-14, 0, -22, 0],
      right: [14, 0, 22, 0],
    };
    const [hx, hy, nx, ny] = facingOffsets[chef.facing];
    head.position.set(hx * 0.6, -hy * 0.6, 0.1);
    hat.position.set(0, 14, 0.2);
    nose.position.set(nx, -ny, 0.3);
    body.position.set(0, 0, 0);

    if (chef.carrying) {
      const base = chef.carrying.replace('_chopped', '').replace('_cooked', '');
      carriedDot.material.color.set(INGREDIENTS[base].color);
      carriedDot.position.copy(toScene(centreX, centreY - 30, 7));
      carriedDot.visible = true;
    } else if (chef.plate) {
      carriedDot.material.color.set('#ffffff');
      carriedDot.position.copy(toScene(centreX, centreY - 30, 7));
      carriedDot.visible = true;
    } else {
      carriedDot.visible = false;
    }

    for (const station of world.stations) {
      const bar = dynamic.bars.get(station);
      if (!bar) continue;
      const active = station.busy || station.ready || station.done;
      bar.back.visible = active;
      bar.fill.visible = active;
      if (active) {
        const ratio = station.ready || station.done ? 1 : Math.min(1, station.progress);
        bar.fill.scale.x = Math.max(0.02, ratio);
        bar.fill.material.color.set(station.ready || station.done ? '#3f9e4d' : '#f7c948');
      }
      const flame = dynamic.flames.get(station);
      if (flame) {
        if (station.busy && station.done) flame.material.color.set('#f7c948');
        else if (station.busy) flame.material.color.set('#e8590c');
        else flame.material.color.set('#8a8f96');
      }
    }

    // The plate on the assembly counter shows its items as coloured dots.
    const assembly = world.stations.find((station) => station.kind === STATION_KIND.ASSEMBLY);
    if (assembly && dynamic.plate) {
      const cx = assembly.col * TILE + TILE / 2;
      const cy = GRID_TOP + assembly.row * TILE + TILE / 2;
      dynamic.plate.position.copy(toScene(cx, cy, 3));
      dynamic.plate.material.color.set(world.plateReady ? '#d8f7c9' : '#ffffff');
      dynamic.plateDots.forEach(({ dot, dx }, index) => {
        const item = world.plate[index];
        dot.visible = item !== undefined;
        if (item) {
          const base = item.replace('_chopped', '').replace('_cooked', '');
          dot.material.color.set(INGREDIENTS[base].color);
          dot.position.copy(toScene(cx + dx, cy, 4));
        }
      });
    }
    renderer.render(scene, camera);
  }

  return { draw };
}
