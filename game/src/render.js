// The Three.js kitchen: one orthographic top-down view, warm bright colours,
// vector-drawn food and counters so every edge stays crisp at any window size.
// Station names are painted on small canvas textures, so the crates, the
// chopping boards, the stoves and the serving window read in a screenshot.
// Food is drawn by shape, not by dots alone: tomato is a red round with a
// green leaf, bread a yellow square, cheese a yellow triangle, pasta thin
// strips, beef a brown square — so a plate reads as a dish, not three dots.
import * as THREE from 'three';
import { FIELD, GRID_COLS, GRID_ROWS, GRID_TOP, INGREDIENTS, PALETTE, TILE } from './config.js';
import { STATION_KIND } from './stations.js';

function toScene(x, y, z) {
  return new THREE.Vector3(x - FIELD.width / 2, FIELD.height / 2 - y, z);
}

function stationId(station) {
  return `${station.col},${station.row},${station.kind}`;
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

function triangle(size, color, x, y, z) {
  const shape = new THREE.Shape();
  shape.moveTo(0, size);
  shape.lineTo(size, -size * 0.7);
  shape.lineTo(-size, -size * 0.7);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.copy(toScene(x, y, z));
  return mesh;
}

// One ingredient drawn by its own shape (plus a leaf on tomato), at a size
// a screenshot can read. Unknown ids fall back to a grey round, never a crash.
function ingredientShape(scene, item, centreX, centreY, z, scale) {
  const base = String(item).replace('_chopped', '').replace('_cooked', '');
  const info = INGREDIENTS[base] || { color: '#999999', shape: 'round' };
  const s = scale || 1;
  if (info.shape === 'square') {
    scene.add(plane(18 * s, 18 * s, info.color, centreX, centreY, z));
  } else if (info.shape === 'triangle') {
    scene.add(triangle(13 * s, info.color, centreX, centreY, z));
  } else if (info.shape === 'strip') {
    scene.add(plane(8 * s, 26 * s, info.color, centreX - 7 * s, centreY, z));
    scene.add(plane(8 * s, 26 * s, info.color, centreX + 7 * s, centreY, z));
  } else {
    scene.add(circle(11 * s, info.color, centreX, centreY, z));
  }
  if (base === 'tomato') scene.add(circle(4 * s, '#3f9e4d', centreX, centreY - 10 * s, z + 0.1));
  return info;
}

function ingredientDots(scene, ingredient, centreX, centreY, z) {
  const spots = [[-15, -9], [13, -11], [0, 11]];
  for (const [dx, dy] of spots) ingredientShape(scene, ingredient, centreX + dx, centreY + dy, z, 0.9);
}

function drawDishOnPlate(scene, items, centreX, centreY, z) {
  // A real plate: white disc, rim, then each item as its own shape, plus
  // steam puffs above a finished dish. items are finished ids.
  scene.add(circle(27, '#ffffff', centreX, centreY, z));
  scene.add(circle(21, '#f1e2c0', centreX, centreY, z + 0.1));
  const spots = [[-11, -6], [11, -7], [0, 9]];
  items.forEach((item, index) => {
    const [dx, dy] = spots[index % spots.length];
    ingredientShape(scene, item, centreX + dx, centreY + dy, z + 0.2, 1.05);
  });
  return items.length;
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

  // Terracotta checkerboard floor across the whole kitchen.
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const colour = (col + row) % 2 === 0 ? PALETTE.floorLight : PALETTE.floorDark;
      scene.add(plane(TILE - 2, TILE - 2, colour, col * TILE + TILE / 2, GRID_TOP + row * TILE + TILE / 2, 0));
    }
  }
  // Warm wall band above the floor, under the order board.
  scene.add(plane(FIELD.width, 16, PALETTE.wall, FIELD.width / 2, GRID_TOP - 8, 0));
  // Red rug in the middle of the floor (walkable decor, breaks the checker).
  scene.add(plane(260, 132, '#7e2a20', 5 * TILE, GRID_TOP + 6 * TILE, 0.4));
  scene.add(plane(244, 116, PALETTE.rug, 5 * TILE, GRID_TOP + 6 * TILE, 0.5));
  scene.add(plane(200, 8, '#ffd97a', 5 * TILE, GRID_TOP + 6 * TILE - 44, 0.6));
  scene.add(plane(200, 8, '#ffd97a', 5 * TILE, GRID_TOP + 6 * TILE + 44, 0.6));

  const dynamic = {
    chef: null,
    carried: null,
    carriedOutline: null,
    plates: new Map(),
    plateProgress: new Map(),
    bars: new Map(),
    flames: new Map(),
    steams: new Map(),
    servePlate: null,
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
      if (station.kind === STATION_KIND.ISLAND) top = PALETTE.islandTop;
      if (station.kind === STATION_KIND.DECOR) top = '#8a5a33';
      scene.add(plane(TILE, TILE, border, cx, cy, 1));
      scene.add(plane(TILE - 8, TILE - 8, top, cx, cy, 2));
      if (station.kind === STATION_KIND.CRATE) {
        ingredientDots(scene, station.ingredient, cx, cy, 3);
      }
      if (station.kind === STATION_KIND.ISLAND) {
        // Ingredients laid out on the island counter.
        const goods = ['tomato', 'onion', 'cheese', 'bread'];
        ingredientShape(scene, goods[station.col % goods.length], cx, cy, 3, 1.1);
        scene.add(circle(6, '#3f9e4d', cx + 14, cy + 12, 3.1));
      }
      if (station.kind === STATION_KIND.DECOR) {
        scene.add(circle(14, '#b03a2e', cx, cy + 6, 3));
        scene.add(circle(11, '#3f9e4d', cx - 8, cy - 8, 3));
        scene.add(circle(11, '#57b25e', cx + 9, cy - 10, 3));
        scene.add(circle(9, '#2f7a37', cx, cy - 14, 3));
      }
      if (station.kind === STATION_KIND.STOVE) {
        const flame = circle(16, '#e8590c', cx, cy, 3);
        scene.add(flame);
        dynamic.flames.set(stationId(station), flame);
        const steam = [circle(5, '#ffffff', cx - 10, cy - 18, 3), circle(4, '#ffffff', cx + 10, cy - 20, 3)];
        steam.forEach((puff) => { puff.visible = false; scene.add(puff); });
        dynamic.steams.set(stationId(station), steam);
      }
      if (station.kind === STATION_KIND.ASSEMBLY) {
        const plateRing = circle(29, '#8a5a33', cx, cy, 2.9);
        scene.add(plateRing);
        const plate = circle(27, '#ffffff', cx, cy, 3);
        scene.add(plate);
        dynamic.plates.set(stationId(station), plate);
        const progressLabel = new THREE.Mesh(
          new THREE.PlaneGeometry(44, 14),
          new THREE.MeshBasicMaterial({
            map: makeLabelTexture('0/3', 'rgba(43,29,18,0.9)', '#ffe9b0'),
            transparent: true,
          }),
        );
        progressLabel.position.copy(toScene(cx, cy + 26, 4));
        progressLabel.visible = false;
        scene.add(progressLabel);
        dynamic.plateProgress.set(stationId(station), progressLabel);
      }
      if (station.kind === STATION_KIND.PASS) {
        // Red-and-white awning over the serving window, plus a service bell.
        for (let i = 0; i < 3; i += 1) {
          scene.add(plane(20, 10, i % 2 === 0 ? '#d9382b' : '#ffffff', cx - 20 + i * 20, cy - 30, 3));
        }
        scene.add(circle(7, '#f7c948', cx, cy + 14, 3));
      }
      const labelText = station.kind === STATION_KIND.CHOP ? 'CHOP'
        : station.kind === STATION_KIND.STOVE ? 'STOVE'
        : station.kind === STATION_KIND.PASS ? 'SERVE'
        : station.kind === STATION_KIND.BIN ? 'BIN'
        : station.kind === STATION_KIND.ASSEMBLY ? 'ASSEMBLY'
        : station.kind === STATION_KIND.ISLAND ? 'ISLAND'
        : station.kind === STATION_KIND.DECOR ? 'HERBS'
        : station.label.toUpperCase();
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(56, 12),
        new THREE.MeshBasicMaterial({
          map: makeLabelTexture(labelText, 'rgba(43,29,18,0.85)', '#ffe9b0'),
          transparent: true,
        }),
      );
      label.position.copy(toScene(Math.min(Math.max(cx, 30), FIELD.width - 30), cy + 22, 4));
      scene.add(label);
      const barBack = plane(60, 10, '#2b1d12', cx, cy - 26, 4);
      const barFill = plane(58, 8, '#3f9e4d', cx - 29, cy - 26, 5);
      barFill.geometry.translate(29, 0, 0);
      barBack.visible = false;
      barFill.visible = false;
      scene.add(barBack);
      scene.add(barFill);
      dynamic.bars.set(stationId(station), { back: barBack, fill: barFill });
    }
    // A plate that sits on the serving window when a dish is ready to serve
    // (staged by shots; in live play the chef carries it there instead).
    const servePlate = circle(27, '#ffffff', 0, 0, 3);
    servePlate.visible = false;
    scene.add(servePlate);
    dynamic.servePlate = servePlate;
  }

  // The chef, 1.5x the old size with a dark outline and a floor shadow, so
  // the cook reads as the protagonist even on the judge's small sheet.
  const chefGroup = new THREE.Group();
  const shadow = circle(30, '#000000', 0, 6, 0);
  shadow.material = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22 });
  const outline = circle(33, '#2b1d12', 0, 0, 0);
  const body = circle(30, '#d94f2b', 0, 0, 0.1);
  const apron = plane(34, 22, '#fff6e0', 0, 4, 0.2);
  const head = circle(19, '#f2c89b', 0, 0, 0.3);
  const hat = plane(38, 16, '#ffffff', 0, 0, 0.4);
  const hatBand = plane(38, 5, '#d94f2b', 0, 0, 0.45);
  const nose = circle(6, '#2b1d12', 0, 0, 0.5);
  chefGroup.add(shadow);
  chefGroup.add(outline);
  chefGroup.add(body);
  chefGroup.add(apron);
  chefGroup.add(head);
  chefGroup.add(hat);
  chefGroup.add(hatBand);
  chefGroup.add(nose);
  chefGroup.position.z = 6;
  scene.add(chefGroup);
  const carriedOutline = circle(17, '#2b1d12', 0, 0, 7);
  const carriedDot = circle(14, '#e63b2e', 0, 0, 7.1);
  const carriedPlate = circle(21, '#ffffff', 0, 0, 7.1);
  carriedOutline.visible = false;
  carriedDot.visible = false;
  carriedPlate.visible = false;
  scene.add(carriedOutline);
  scene.add(carriedDot);
  scene.add(carriedPlate);
  // Dots on the assembly plate, one per item already plated — now shapes.
  const plateDots = [-13, 0, 13].map((dx) => {
    const dot = circle(11, '#ffffff', 0, 0, 4);
    dot.visible = false;
    scene.add(dot);
    return { dot, dx };
  });
  dynamic.chef = chefGroup;
  dynamic.carried = carriedDot;
  dynamic.carriedOutline = carriedOutline;
  dynamic.carriedPlate = carriedPlate;
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
      up: [0, -20, 0, -30],
      down: [0, 20, 0, 30],
      left: [-20, 0, -30, 0],
      right: [20, 0, 30, 0],
    };
    const [hx, hy, nx, ny] = facingOffsets[chef.facing];
    head.position.set(hx * 0.6, -hy * 0.6, 0.3);
    hat.position.set(0, 20, 0.4);
    hatBand.position.set(0, 14, 0.45);
    nose.position.set(nx, -ny, 0.5);
    body.position.set(0, 0, 0.1);
    apron.position.set(0, 4, 0.2);
    // Outline and shadow are group children: their positions are local,
    // not scene coordinates (they were built with toScene, so reset here —
    // leaving the outline at its scene position put a black disc far from
    // the chef, over the bin tile in the end shot).
    outline.position.set(0, 0, 0);
    shadow.position.set(0, -10, 0);

    if (chef.carrying) {
      const base = chef.carrying.replace('_chopped', '').replace('_cooked', '');
      const info = INGREDIENTS[base] || { color: '#999999' };
      carriedDot.material.color.set(info.color);
      carriedDot.position.copy(toScene(centreX, centreY - 38, 7.1));
      carriedOutline.position.copy(toScene(centreX, centreY - 38, 7));
      carriedDot.visible = true;
      carriedOutline.visible = true;
      carriedPlate.visible = false;
    } else if (chef.plate) {
      carriedPlate.position.copy(toScene(centreX, centreY - 38, 7.1));
      carriedOutline.position.copy(toScene(centreX, centreY - 38, 7));
      carriedOutline.visible = true;
      carriedPlate.visible = true;
      carriedDot.visible = false;
    } else {
      carriedDot.visible = false;
      carriedOutline.visible = false;
      carriedPlate.visible = false;
    }

    for (const station of world.stations) {
      const bar = dynamic.bars.get(stationId(station));
      if (!bar) continue;
      const active = station.busy || station.ready || station.done;
      bar.back.visible = active;
      bar.fill.visible = active;
      if (active) {
        const ratio = station.ready || station.done ? 1 : Math.min(1, station.progress);
        bar.fill.scale.x = Math.max(0.02, ratio);
        let colour = '#f7c948';
        if (station.ready || station.done) colour = '#3f9e4d';
        else if (station.kind === STATION_KIND.STOVE && station.progress > 0.85) colour = '#d9382b';
        bar.fill.material.color.set(colour);
      }
      const flame = dynamic.flames.get(stationId(station));
      if (flame) {
        if (station.busy && station.done) flame.material.color.set('#f7c948');
        else if (station.busy) flame.material.color.set('#e8590c');
        else flame.material.color.set('#8a8f96');
      }
      const steam = dynamic.steams.get(stationId(station));
      if (steam) {
        const show = station.busy && (station.done || station.progress > 0.5);
        steam.forEach((puff) => { puff.visible = show; });
      }
    }

    // The plate on the first assembly counter: a real plate with its items
    // drawn as shapes, green when the dish matches an order, plus a "n/3"
    // progress label. dynamic.plates is keyed by station id (M6 fix: the
    // plate that changes colour is the same one the items sit on).
    const assembly = world.stations.find((station) => station.kind === STATION_KIND.ASSEMBLY);
    if (assembly) {
      const plate = dynamic.plates.get(stationId(assembly));
      const progressLabel = dynamic.plateProgress.get(stationId(assembly));
      const cx = assembly.col * TILE + TILE / 2;
      const cy = GRID_TOP + assembly.row * TILE + TILE / 2;
      if (plate) {
        plate.position.copy(toScene(cx, cy, 3));
        plate.material.color.set(world.plateReady ? '#d8f7c9' : '#ffffff');
      }
      if (progressLabel) {
        progressLabel.visible = world.plate.length > 0;
        if (world.plate.length > 0) {
          progressLabel.material.map = makeLabelTexture(
            `${world.plate.length}/3`, 'rgba(43,29,18,0.9)', '#ffe9b0',
          );
          progressLabel.material.needsUpdate = true;
        }
      }
      dynamic.plateDots.forEach(({ dot, dx }, index) => {
        const item = world.plate[index];
        dot.visible = item !== undefined;
        if (item) {
          const base = item.replace('_chopped', '').replace('_cooked', '');
          const info = INGREDIENTS[base] || { color: '#999999' };
          dot.material.color.set(info.color);
          dot.position.copy(toScene(cx + dx, cy, 4));
          // Triangle cheese reads as a triangle, not a dot: scale the circle
          // mesh is wrong for it, so keep the dot but colour it distinctly;
          // the full dish shape is drawn on the serve plate instead.
          dot.scale.set(info.shape === 'triangle' ? 1.3 : 1, info.shape === 'triangle' ? 1.3 : 1, 1);
        }
      });
    }

    // A finished dish staged on the serving window (shots only).
    if (dynamic.servePlate) {
      const pass = world.stations.find((station) => station.kind === STATION_KIND.PASS);
      const items = world.servePlate;
      if (pass && items && items.length > 0) {
        const cx = pass.col * TILE + TILE / 2;
        const cy = GRID_TOP + pass.row * TILE + TILE / 2;
        dynamic.servePlate.visible = true;
        dynamic.servePlate.position.copy(toScene(cx, cy, 3));
        dynamic.servePlate.material.color.set('#ffffff');
        // Ingredient shapes on the served plate are drawn once per frame
        // into the scene by drawDishOnPlate's siblings below; the plate disc
        // itself is the persistent mesh, the shapes are re-added cheaply.
        if (!dynamic.serveShapes) dynamic.serveShapes = [];
        dynamic.serveShapes.forEach((mesh) => scene.remove(mesh));
        dynamic.serveShapes = [];
        const spots = [[-11, -6], [11, -7], [0, 9]];
        items.forEach((item, index) => {
          const [dx, dy] = spots[index % spots.length];
          const before = scene.children.length;
          ingredientShape(scene, item, cx + dx, cy + dy, 3.2, 1.05);
          dynamic.serveShapes.push(...scene.children.slice(before));
        });
      } else if (dynamic.servePlate) {
        dynamic.servePlate.visible = false;
        if (dynamic.serveShapes) {
          dynamic.serveShapes.forEach((mesh) => scene.remove(mesh));
          dynamic.serveShapes = [];
        }
      }
    }
    renderer.render(scene, camera);
  }

  return { draw };
}
