import {
  absDay,
  CROPS,
  DAYS,
  dirFrom,
  DX,
  DY,
  favorsDone,
  FISH_TABLE,
  footprint,
  getMap,
  hourOf,
  isCropItem,
  isFishItem,
  ITEMS,
  ladders,
  LOVES,
  npcAnchor,
  NPCS,
  SEASONS,
  TILE,
  TOOLS,
  toolCost,
  type Dir,
  type GameState,
  type ItemId,
  type NpcId,
  type Obj,
  type Panel,
  type Runtime,
  type ToolId,
  type Weather,
} from "./data";
import type { InputFrame } from "./input";
import { rumble } from "./input";
import { saveGame } from "./save";
import { sfx } from "./sound";

let seq = 1;
function uid(prefix = "id") {
  seq += 1;
  return `${prefix}${seq.toString(36)}`;
}

export function freshRuntime(): Runtime {
  return {
    panel: null,
    path: null,
    pendingTalk: null,
    pendingUse: false,
    faceTile: null,
    fish: null,
    slimes: [],
    slimeMap: "",
    particles: [],
    floats: [],
    toasts: [],
    shake: 0,
    step: 0,
    moving: false,
    speed: 0,
    iframes: 0,
    cooldown: 0,
    holdFor: 0,
    exitLock: 0,
    warnedNight: false,
    chicks: [],
    camX: 0,
    camY: 0,
    zoom: 2,
    cssW: 800,
    cssH: 600,
    reduce: false,
    saveT: 0,
    noteT: 0,
    noteI: 0,
  };
}

export function toast(rt: Runtime, text: string) {
  rt.toasts.unshift({ text, life: 3.4 });
  rt.toasts = rt.toasts.slice(0, 3);
}

function float(rt: Runtime, x: number, y: number, text: string, color = "#241910") {
  rt.floats.push({ x, y, text, life: 1.1, color });
}

function burst(rt: Runtime, x: number, y: number, color: string) {
  if (rt.reduce) return;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    rt.particles.push({
      x,
      y,
      vx: Math.cos(a) * 28,
      vy: Math.sin(a) * 18 - 10,
      life: 0.45,
      max: 0.45,
      color,
      r: 2.2,
    });
  }
}

export function walkable(s: GameState, tx: number, ty: number, mapId = s.mapId) {
  const map = getMap(mapId);
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
  const t = map.tiles[ty][tx];
  if (t === "fence" || t === "water" || t === "mwall") return false;
  for (const o of s.objects) {
    if (o.mapId !== mapId) continue;
    for (const b of footprint(o)) if (b.tx === tx && b.ty === ty) return false;
  }
  return true;
}

function rng32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blocked(points: [number, number, number][]) {
  const set = new Set<string>();
  for (const [x, y, r] of points) {
    for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) set.add(`${i},${j}`);
  }
  return set;
}

function scatterTrees(mapId: string, block: Set<string>, count: number, rng: () => number): Obj[] {
  const map = getMap(mapId);
  const spots: { tx: number; ty: number }[] = [];
  for (let y = 1; y < map.h - 1; y++) {
    for (let x = 1; x < map.w - 1; x++) {
      if (map.tiles[y][x] !== "grass") continue;
      if (block.has(`${x},${y}`)) continue;
      spots.push({ tx: x, ty: y });
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = spots[i];
    const b = spots[j];
    if (!a || !b) continue;
    spots[i] = b;
    spots[j] = a;
  }
  return spots.slice(0, count).map((p, i) => ({
    id: `${mapId}-tree-${i}`,
    mapId,
    tx: p.tx,
    ty: p.ty,
    kind: "tree" as const,
    hp: 3,
    maxHp: 3,
    reviveDay: 0,
  }));
}

function regenMine(s: GameState) {
  s.objects = s.objects.filter((o) => !o.mapId.startsWith("mine"));
  const spots = [
    [3, 3],
    [5, 5],
    [6, 8],
    [4, 11],
    [7, 6],
    [11, 4],
    [13, 11],
    [14, 5],
    [11, 12],
    [7, 12],
    [14, 12],
    [6, 3],
  ];
  for (let floor = 1; floor <= 3; floor++) {
    const mapId = `mine-${floor}`;
    let i = 0;
    for (const [tx, ty] of spots) {
      if (!walkable(s, tx, ty, mapId)) continue;
      const copper = i % 4 === 0;
      s.objects.push({
        id: `m${floor}r${i}`,
        mapId,
        tx,
        ty,
        kind: copper ? "copper" : "rock",
        hp: copper ? 3 : 2,
        maxHp: copper ? 3 : 2,
        reviveDay: 0,
      });
      i++;
    }
    if (floor === 3 && walkable(s, 11, 6, mapId)) {
      s.objects.push({
        id: "geode-rock",
        mapId,
        tx: 11,
        ty: 6,
        kind: "geode",
        hp: 3,
        maxHp: 3,
        reviveDay: 0,
      });
    }
  }
}

export function createNewGame(name: string): GameState {
  const rng = rng32(0x0b1a);
  const farmBlock = blocked([
    [10, 8, 5],
    [5, 6, 2],
    [7, 7, 1],
    [20, 13, 1],
    [22, 15, 2],
    [26, 4, 3],
    [24, 8, 1],
    [7, 15, 1],
  ]);
  const townBlock = blocked([
    [6, 8, 2],
    [26, 8, 2],
    [18, 12, 2],
    [23, 4, 2],
    [14, 12, 1],
  ]);
  const woodBlock = blocked([
    [16, 12, 2],
    [1, 10, 1],
  ]);
  const objects: Obj[] = [
    ...scatterTrees("farm", farmBlock, 18, rng),
    ...scatterTrees("town", townBlock, 8, rng),
    ...scatterTrees("woods", woodBlock, 26, rng),
    { id: "bin", mapId: "farm", tx: 20, ty: 13, kind: "bin", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "letter", mapId: "farm", tx: 7, ty: 7, kind: "letter", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "scare", mapId: "farm", tx: 7, ty: 15, kind: "scarecrow", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "well", mapId: "farm", tx: 24, ty: 8, kind: "well", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "rock-a", mapId: "farm", tx: 2, ty: 16, kind: "rock", hp: 2, maxHp: 2, reviveDay: 0 },
    { id: "rock-b", mapId: "farm", tx: 31, ty: 8, kind: "rock", hp: 2, maxHp: 2, reviveDay: 0 },
    { id: "rock-c", mapId: "farm", tx: 18, ty: 5, kind: "rock", hp: 2, maxHp: 2, reviveDay: 0 },
    { id: "bed", mapId: "house", tx: 3, ty: 5, kind: "bed", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "counter", mapId: "shop", tx: 5, ty: 2, kind: "counter", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "board", mapId: "town", tx: 14, ty: 12, kind: "board", hp: 1, maxHp: 1, reviveDay: 0 },
    { id: "mill", mapId: "town", tx: 23, ty: 4, kind: "mill", hp: 1, maxHp: 1, reviveDay: 0 },
  ];
  const soil: GameState["soil"] = {};
  for (let x = 10; x <= 15; x++) soil[`${x},14`] = { tilled: true, watered: true, crop: "pip", stage: 1 };
  const forageSpots: [string, number, number, ItemId][] = [
    ["woods", 4, 8, "moonberry"],
    ["woods", 8, 8, "moonberry"],
    ["woods", 12, 13, "moonberry"],
    ["woods", 20, 8, "moonberry"],
    ["woods", 22, 13, "moonberry"],
    ["woods", 24, 15, "moonberry"],
    ["woods", 6, 14, "mushroom"],
    ["woods", 10, 6, "mushroom"],
    ["woods", 18, 15, "mushroom"],
    ["woods", 15, 8, "blossom"],
    ["woods", 3, 13, "blossom"],
    ["woods", 21, 16, "blossom"],
    ["farm", 2, 10, "blossom"],
    ["farm", 30, 20, "mushroom"],
  ];
  const state: GameState = {
    version: 1,
    name: name.slice(0, 12) || "Rowan",
    year: 1,
    season: 0,
    day: 1,
    minutes: 120,
    energy: 100,
    maxEnergy: 100,
    gold: 400,
    mapId: "farm",
    x: 10.5 * TILE,
    y: 8.5 * TILE,
    dir: 0,
    sel: { kind: "tool", tool: "hoe" },
    inv: Array.from({ length: 18 }, () => null),
    soil,
    objects,
    forage: [],
    chickens: [],
    drops: [],
    hasCoop: false,
    coopEggs: 0,
    toolTier: 0,
    hearts: {},
    talked: {},
    gifted: {},
    flags: { letterRead: false, shippedCrop: false, giftedBram: false, giftedLila: false, millOn: false },
    weather: "sun",
    shipping: [],
    cut: {},
    stats: { harvests: 0, fish: 0, earned: 0 },
  };
  state.inv[0] = { id: "pip-seed", count: 12 };
  state.objects = state.objects.filter(
    (o) => !forageSpots.some((f) => f[0] === o.mapId && f[1] === o.tx && f[2] === o.ty && o.kind === "tree"),
  );
  state.forage = forageSpots.map((f, i) => ({
    id: `forage-${i}`,
    mapId: f[0],
    tx: f[1],
    ty: f[2],
    item: f[3],
    alive: true,
  }));
  regenMine(state);
  return state;
}

export function addItem(s: GameState, id: ItemId, count: number) {
  let left = count;
  for (const sl of s.inv) {
    if (sl && sl.id === id && sl.count < 99) {
      const n = Math.min(99 - sl.count, left);
      sl.count += n;
      left -= n;
    }
  }
  for (let i = 0; i < s.inv.length && left > 0; i++) {
    if (!s.inv[i]) {
      const n = Math.min(99, left);
      s.inv[i] = { id, count: n };
      left -= n;
    }
  }
  return left;
}

export function countItem(s: GameState, id: ItemId) {
  return s.inv.reduce((n, sl) => n + (sl?.id === id ? sl.count : 0), 0);
}

export function removeItem(s: GameState, id: ItemId, count: number) {
  let left = count;
  for (let i = s.inv.length - 1; i >= 0 && left > 0; i--) {
    const sl = s.inv[i];
    if (!sl || sl.id !== id) continue;
    const n = Math.min(sl.count, left);
    sl.count -= n;
    left -= n;
    if (sl.count <= 0) s.inv[i] = null;
  }
  return left === 0;
}

function give(s: GameState, rt: Runtime, id: ItemId, count: number) {
  const left = addItem(s, id, count);
  float(rt, s.x, s.y - 18, `+${ITEMS[id].name}`, "#3e6b46");
  if (left > 0) {
    s.drops.push({ id: uid("drop"), mapId: s.mapId, x: s.x, y: s.y - 6, item: id, count: left });
    toast(rt, "Pack full — the rest dropped at your feet.");
  }
}

function front(s: GameState) {
  return {
    tx: Math.floor(s.x / TILE) + DX[s.dir],
    ty: Math.floor(s.y / TILE) + DY[s.dir],
  };
}

function spend(s: GameState, rt: Runtime, cost: number) {
  if (s.energy < cost) {
    toast(rt, "Too tired. Eat or sleep.");
    sfx("deny");
    float(rt, s.x, s.y - 16, "Tired", "#c4653a");
    return false;
  }
  s.energy = Math.max(0, s.energy - cost);
  return true;
}

function soilKey(tx: number, ty: number) {
  return `${tx},${ty}`;
}

function rollFish() {
  let r = Math.random() * 100;
  for (const f of FISH_TABLE) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH_TABLE[0];
}

function faceWater(s: GameState) {
  const map = getMap(s.mapId);
  const ptx = Math.floor(s.x / TILE);
  const pty = Math.floor(s.y / TILE);
  const ahead = map.tiles[pty + DY[s.dir]]?.[ptx + DX[s.dir]];
  if (ahead === "water") return true;
  for (let i = 0; i < 4; i++) {
    const d = i as Dir;
    if (map.tiles[pty + DY[d]]?.[ptx + DX[d]] === "water") {
      s.dir = d;
      return true;
    }
  }
  return false;
}

function objAt(s: GameState, tx: number, ty: number) {
  return s.objects.find((o) => o.mapId === s.mapId && o.tx === tx && o.ty === ty && o.hp > 0);
}

function breakRock(s: GameState, rt: Runtime, o: Obj) {
  if (o.kind === "rock") give(s, rt, "stone", Math.random() < 0.5 ? 2 : 1);
  else if (o.kind === "copper") {
    give(s, rt, "copper", 2);
    give(s, rt, "stone", 1);
  } else if (o.kind === "geode") give(s, rt, "geode", 1);
  s.objects = s.objects.filter((x) => x !== o);
  burst(rt, (o.tx + 0.5) * TILE, (o.ty + 0.5) * TILE, "#8d8a84");
}

function tryPlant(s: GameState, rt: Runtime) {
  if (s.sel.kind !== "item") return false;
  const sl = s.inv[s.sel.slot];
  if (!sl) return false;
  const crop = ITEMS[sl.id].seed;
  if (!crop) return false;
  const { tx, ty } = front(s);
  if (s.mapId !== "farm" || getMap(s.mapId).tiles[ty]?.[tx] !== "soil") {
    toast(rt, "Plant on tilled fen soil.");
    return true;
  }
  const key = soilKey(tx, ty);
  const cell = s.soil[key];
  if (!cell?.tilled) {
    toast(rt, "Hoe the soil first.");
    return true;
  }
  if (cell.crop) {
    toast(rt, "Something is already growing.");
    return true;
  }
  if (CROPS[crop].season !== s.season) {
    toast(rt, `${CROPS[crop].name} only grows in ${SEASONS[CROPS[crop].season]}.`);
    return true;
  }
  if (!spend(s, rt, 1)) return true;
  cell.crop = crop;
  cell.stage = 0;
  sl.count -= 1;
  if (sl.count <= 0) s.inv[s.sel.slot] = null;
  burst(rt, (tx + 0.5) * TILE, (ty + 0.5) * TILE, "#3e6b46");
  sfx("plant");
  rt.cooldown = 0.28;
  return true;
}

function harvestAt(s: GameState, rt: Runtime, tx: number, ty: number) {
  const cell = s.soil[soilKey(tx, ty)];
  if (!cell?.crop || cell.stage < 3) return false;
  const spec = CROPS[cell.crop];
  const n = Math.random() < 0.18 ? 2 : 1;
  give(s, rt, spec.item, n);
  cell.crop = null;
  cell.stage = 0;
  s.stats.harvests += n;
  burst(rt, (tx + 0.5) * TILE, (ty + 0.4) * TILE, "#e0a23b");
  sfx("harvest");
  return true;
}

function hitSlime(s: GameState, rt: Runtime) {
  const fx = s.x + DX[s.dir] * TILE;
  const fy = s.y + DY[s.dir] * TILE;
  let best: (typeof rt.slimes)[number] | null = null;
  let bestD = 20;
  for (const sl of rt.slimes) {
    const d = Math.hypot(sl.x - fx, sl.y - fy);
    if (d < bestD) {
      best = sl;
      bestD = d;
    }
  }
  if (!best) return false;
  const dmg = s.sel.kind === "tool" && (s.sel.tool === "pick" || s.sel.tool === "axe") ? 2 : 1;
  best.hp -= dmg;
  best.hit = 0.15;
  rt.shake = rt.reduce ? 0 : 3;
  sfx("chop");
  float(rt, best.x, best.y - 10, `-${dmg}`, "#c4653a");
  if (best.hp <= 0) {
    rt.slimes = rt.slimes.filter((x) => x !== best);
    give(s, rt, "fiber", 1);
    if (Math.random() < 0.3) give(s, rt, "copper", 1);
  }
  return true;
}

export function useTool(s: GameState, rt: Runtime) {
  if (rt.cooldown > 0) return;
  if (tryPlant(s, rt)) return;
  const tool: ToolId = s.sel.kind === "tool" ? s.sel.tool : "hoe";
  if (s.sel.kind === "item") {
    const sl = s.inv[s.sel.slot];
    if (sl && ITEMS[sl.id].energy && !ITEMS[sl.id].seed) {
      eatIndex(s, rt, s.sel.slot);
      return;
    }
    toast(rt, "Select a tool, or seeds to plant.");
    return;
  }
  const { tx, ty } = front(s);
  const map = getMap(s.mapId);
  const terrain = map.tiles[ty]?.[tx];
  let acted = false;
  const power = s.toolTier ? 2 : 1;

  if (tool === "hoe") {
    if (s.mapId === "farm" && terrain === "soil") {
      const key = soilKey(tx, ty);
      const cell = s.soil[key] ?? { tilled: false, watered: false, crop: null, stage: 0 };
      if (cell.crop) toast(rt, "A crop is in the way.");
      else if (!spend(s, rt, toolCost(tool, s.toolTier))) return;
      else {
        cell.tilled = true;
        s.soil[key] = cell;
        burst(rt, (tx + 0.5) * TILE, (ty + 0.5) * TILE, "#8a623f");
        sfx("hoe");
        acted = true;
      }
    }
  } else if (tool === "can") {
    const spots = [[tx, ty]];
    if (s.toolTier) {
      const px = DY[s.dir];
      const py = -DX[s.dir];
      spots.push([tx + px, ty + py], [tx - px, ty - py]);
    }
    const valid = spots.filter(([x, y]) => {
      const cell = s.soil[soilKey(x, y)];
      return s.mapId === "farm" && map.tiles[y]?.[x] === "soil" && cell && (cell.tilled || cell.crop);
    });
    if (valid.length) {
      if (!spend(s, rt, toolCost(tool, s.toolTier))) return;
      for (const [x, y] of valid) {
        const cell = s.soil[soilKey(x, y)];
        if (cell) cell.watered = true;
        burst(rt, (x + 0.5) * TILE, (y + 0.5) * TILE, "#3c6d88");
      }
      sfx("water");
      acted = true;
    } else toast(rt, "Nothing to water.");
  } else if (tool === "axe") {
    const o = objAt(s, tx, ty);
    if (o && (o.kind === "tree" || o.kind === "stump")) {
      if (!spend(s, rt, toolCost(tool, s.toolTier))) return;
      o.hp -= power;
      sfx("chop");
      rt.shake = rt.reduce ? 0 : 4;
      acted = true;
      if (o.kind === "tree" && o.hp <= 0) {
        give(s, rt, "wood", 4);
        o.kind = "stump";
        o.hp = 2;
        o.maxHp = 2;
        o.reviveDay = absDay(s) + 5;
      } else if (o.kind === "stump" && o.hp <= 0) {
        give(s, rt, "wood", 1);
        s.objects = s.objects.filter((x) => x !== o);
      }
    } else toast(rt, "Face a tree.");
  } else if (tool === "pick") {
    const o = objAt(s, tx, ty);
    if (o && (o.kind === "rock" || o.kind === "copper" || o.kind === "geode")) {
      if (!spend(s, rt, toolCost(tool, s.toolTier))) return;
      o.hp -= power;
      sfx("chop");
      rt.shake = rt.reduce ? 0 : 4;
      acted = true;
      if (o.hp <= 0) breakRock(s, rt, o);
    } else toast(rt, "Face stone or ore.");
  } else if (tool === "scythe") {
    const cell = s.soil[soilKey(tx, ty)];
    if (cell?.crop && cell.stage >= 3) {
      if (spend(s, rt, toolCost(tool, s.toolTier))) {
        harvestAt(s, rt, tx, ty);
        acted = true;
      }
    } else if ((s.mapId === "farm" || s.mapId === "woods") && (terrain === "grass" || terrain === "sand")) {
      const mark = `${s.mapId}:${tx},${ty}`;
      if (s.cut[mark]) toast(rt, "Already cut.");
      else if (spend(s, rt, toolCost(tool, s.toolTier))) {
        s.cut[mark] = true;
        if (Math.random() < 0.55) give(s, rt, "fiber", 1);
        sfx("harvest");
        acted = true;
      }
    } else toast(rt, "Nothing ripe.");
  } else if (tool === "rod") {
    if (!faceWater(s)) toast(rt, "Stand beside the water.");
    else if (spend(s, rt, toolCost(tool, s.toolTier))) {
      const fish = rollFish();
      rt.fish = {
        phase: "wait",
        timer: 0.7 + Math.random() * 1.4,
        item: fish.item,
        label: fish.label,
        diff: fish.diff,
        fishY: 0.45,
        fishV: 0,
        barY: 0.4,
        catch: 0.25,
        resolved: false,
      };
      rt.panel = { t: "fish" };
      rt.path = null;
      acted = true;
    }
  }

  if (!acted && (tool === "hoe" || tool === "axe" || tool === "pick" || tool === "scythe")) {
    if (hitSlime(s, rt)) {
      if (spend(s, rt, toolCost(tool, s.toolTier))) acted = true;
    }
  } else if (acted) {
    hitSlime(s, rt);
  }
  if (acted) rt.cooldown = s.toolTier ? 0.22 : 0.32;
}

function nearestNpc(s: GameState): NpcId | null {
  const ptx = Math.floor(s.x / TILE);
  const pty = Math.floor(s.y / TILE);
  let best: NpcId | null = null;
  let bd = 99;
  for (const id of NPCS) {
    const a = npcAnchor(s, id);
    if (a.mapId !== s.mapId) continue;
    const d = Math.max(Math.abs(a.tx - ptx), Math.abs(a.ty - pty));
    if (d <= 1 && d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

export function openTalk(s: GameState, rt: Runtime, id: NpcId) {
  s.talked[id] = true;
  rt.panel = { t: "dialogue", npc: id, page: 0 };
  rt.path = null;
  sfx("talk");
}

export function interact(s: GameState, rt: Runtime) {
  const npc = nearestNpc(s);
  if (npc) {
    openTalk(s, rt, npc);
    return;
  }
  if (s.mapId === "farm") {
    for (const c of s.chickens) {
      if (Math.hypot(c.x - s.x, c.y - s.y) < 22) {
        if (c.pet) toast(rt, "Already fussed over today.");
        else {
          c.pet = true;
          toast(rt, "Feathers settle. She looks pleased.");
          sfx("talk");
        }
        return;
      }
    }
  }
  const f = front(s);
  const here = { tx: Math.floor(s.x / TILE), ty: Math.floor(s.y / TILE) };
  const crop = s.soil[soilKey(f.tx, f.ty)] ?? s.soil[soilKey(here.tx, here.ty)];
  if (crop?.crop && crop.stage >= 3) {
    const at = s.soil[soilKey(f.tx, f.ty)]?.crop ? f : here;
    if (spend(s, rt, 1)) harvestAt(s, rt, at.tx, at.ty);
    return;
  }
  const obj =
    objAt(s, f.tx, f.ty) ??
    objAt(s, here.tx, here.ty) ??
    s.objects.find((o) => o.mapId === s.mapId && Math.max(Math.abs(o.tx - here.tx), Math.abs(o.ty - here.ty)) <= 1);
  if (obj) {
    if (obj.kind === "letter") {
      s.flags.letterRead = true;
      rt.panel = { t: "letter" };
      return;
    }
    if (obj.kind === "bed") {
      rt.panel = { t: "sleep" };
      return;
    }
    if (obj.kind === "bin") {
      rt.panel = { t: "ship" };
      return;
    }
    if (obj.kind === "board") {
      rt.panel = { t: "quests" };
      return;
    }
    if (obj.kind === "counter") {
      const h = hourOf(s.minutes);
      if (h >= 8 && h < 19) rt.panel = { t: "shop", tab: "buy" };
      else toast(rt, "Marrow covers the till after seven. He's open from eight.");
      return;
    }
    if (obj.kind === "well") {
      toast(rt, "The can already drinks from the fen.");
      return;
    }
    if (obj.kind === "coop") {
      if (!s.hasCoop) return;
      if (s.coopEggs <= 0) toast(rt, "No eggs yet. They arrive with morning.");
      else {
        const n = s.coopEggs;
        give(s, rt, "egg", n);
        s.coopEggs = 0;
        toast(rt, `Collected ${n} egg${n > 1 ? "s" : ""}.`);
        sfx("coin");
      }
      return;
    }
    if (obj.kind === "mill") {
      toast(rt, s.flags.millOn ? "The wheel turns. It leaves a gift at dawn." : "The axle is cracked. Three favors will wake it.");
      return;
    }
  }
  const forage = s.forage.find(
    (g) => g.alive && g.mapId === s.mapId && Math.max(Math.abs(g.tx - here.tx), Math.abs(g.ty - here.ty)) <= 1,
  );
  if (forage) {
    forage.alive = false;
    give(s, rt, forage.item, 1);
    sfx("harvest");
    return;
  }
  toast(rt, "Nothing here.");
}

function findPath(s: GameState, tx: number, ty: number) {
  const start = { x: Math.floor(s.x / TILE), y: Math.floor(s.y / TILE) };
  if (start.x === tx && start.y === ty) return [] as { x: number; y: number }[];
  const map = getMap(s.mapId);
  const key = (x: number, y: number) => `${x},${y}`;
  const q = [start];
  const prev = new Map<string, string | null>();
  prev.set(key(start.x, start.y), null);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let guard = 0;
  while (q.length && guard < 900) {
    guard++;
    const cur = q.shift();
    if (!cur) break;
    if (cur.x === tx && cur.y === ty) break;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
      const k = key(nx, ny);
      if (prev.has(k) || !walkable(s, nx, ny)) continue;
      prev.set(k, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const path: { x: number; y: number }[] = [];
  let c: string | null = key(tx, ty);
  while (c && c !== key(start.x, start.y)) {
    const [x, y] = c.split(",").map(Number);
    path.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    c = prev.get(c) ?? null;
  }
  path.reverse();
  return path;
}

function findPathNear(s: GameState, tx: number, ty: number) {
  const opts = [
    [tx + 1, ty],
    [tx - 1, ty],
    [tx, ty + 1],
    [tx, ty - 1],
  ];
  let best: { x: number; y: number }[] | null = null;
  for (const [x, y] of opts) {
    if (!walkable(s, x, y)) continue;
    const path = findPath(s, x, y);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}

function npcOnTile(s: GameState, tx: number, ty: number): NpcId | null {
  for (const id of NPCS) {
    const a = npcAnchor(s, id);
    if (a.mapId === s.mapId && Math.max(Math.abs(a.tx - tx), Math.abs(a.ty - ty)) <= 0) return id;
  }
  return null;
}

export function handleClick(s: GameState, rt: Runtime, wx: number, wy: number) {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  const ptx = Math.floor(s.x / TILE);
  const pty = Math.floor(s.y / TILE);
  const dist = Math.max(Math.abs(tx - ptx), Math.abs(ty - pty));
  const npc = npcOnTile(s, tx, ty);
  if (dist <= 1) {
    if (tx !== ptx || ty !== pty) s.dir = dirFrom(tx - ptx, ty - pty);
    if (npc) openTalk(s, rt, npc);
    else useTool(s, rt);
    rt.path = null;
    return;
  }
  rt.pendingTalk = npc;
  rt.pendingUse = !npc;
  rt.faceTile = { tx, ty };
  const direct = walkable(s, tx, ty) ? findPath(s, tx, ty) : null;
  rt.path = direct ?? findPathNear(s, tx, ty);
  if (!rt.path) toast(rt, "Can't reach that.");
}

function arrive(s: GameState, rt: Runtime) {
  if (rt.pendingTalk) {
    openTalk(s, rt, rt.pendingTalk);
    rt.pendingTalk = null;
    rt.pendingUse = false;
    return;
  }
  if (rt.pendingUse && rt.faceTile) {
    const ptx = Math.floor(s.x / TILE);
    const pty = Math.floor(s.y / TILE);
    s.dir = dirFrom(rt.faceTile.tx - ptx, rt.faceTile.ty - pty);
    rt.pendingUse = false;
    useTool(s, rt);
  }
}

function blockedAt(s: GameState, px: number, py: number) {
  const r = 4.5;
  const pts: [number, number][] = [
    [px - r, py - 2],
    [px + r, py - 2],
    [px - r, py + 3],
    [px + r, py + 3],
  ];
  return pts.some(([x, y]) => !walkable(s, Math.floor(x / TILE), Math.floor(y / TILE)));
}

function movePlayer(s: GameState, rt: Runtime, mx: number, my: number, dt: number) {
  const sp = 88;
  let vx = mx * sp;
  let vy = my * sp;
  const nx = s.x + vx * dt;
  const ny = s.y + vy * dt;
  if (!blockedAt(s, nx, s.y)) s.x = nx;
  else vx = 0;
  if (!blockedAt(s, s.x, ny)) s.y = ny;
  else vy = 0;
  rt.speed = Math.hypot(vx, vy);
  rt.moving = rt.speed > 8;
  if (rt.moving) {
    s.dir = dirFrom(mx, my);
    rt.step += rt.speed * dt;
  }
}

function checkExit(s: GameState, rt: Runtime) {
  if (rt.exitLock > 0) return;
  const tx = Math.floor(s.x / TILE);
  const ty = Math.floor(s.y / TILE);
  const ex = getMap(s.mapId).exits.find((e) => e.tx === tx && e.ty === ty);
  if (ex) {
    s.mapId = ex.to;
    s.x = (ex.sx + 0.5) * TILE;
    s.y = (ex.sy + 0.5) * TILE;
    rt.path = null;
    rt.exitLock = 0.4;
    rt.slimeMap = "";
    return;
  }
  const lad = ladders(s.mapId).find((l) => l.tx === tx && l.ty === ty);
  if (!lad) return;
  const clear = !s.objects.some(
    (o) => o.mapId === s.mapId && (o.kind === "rock" || o.kind === "copper") && o.hp > 0,
  );
  if (lad.needClear && !clear) {
    toast(rt, "Rubble still chokes the shaft.");
    s.y = (ty + 1.35) * TILE;
    rt.exitLock = 0.9;
    return;
  }
  s.mapId = lad.to;
  s.x = (lad.sx + 0.5) * TILE;
  s.y = (lad.sy + 0.5) * TILE;
  rt.path = null;
  rt.exitLock = 0.4;
  rt.slimeMap = "";
}

function ensureSlimes(s: GameState, rt: Runtime) {
  if (!s.mapId.startsWith("mine")) {
    rt.slimes = [];
    rt.slimeMap = "";
    return;
  }
  if (rt.slimeMap === s.mapId) return;
  rt.slimeMap = s.mapId;
  const floor = Number(s.mapId.slice(5)) || 1;
  const spots = [
    [5, 6],
    [7, 9],
    [11, 5],
    [14, 9],
    [6, 11],
    [13, 12],
    [4, 8],
  ];
  rt.slimes = [];
  for (const [tx, ty] of spots) {
    if (rt.slimes.length >= floor + 1) break;
    if (!walkable(s, tx, ty)) continue;
    rt.slimes.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, hp: 1 + floor, hit: 0 });
  }
}

function tickSlimes(s: GameState, rt: Runtime, dt: number) {
  const floor = Number(s.mapId.slice(5)) || 1;
  for (const sl of rt.slimes) {
    sl.hit = Math.max(0, sl.hit - dt);
    const dx = s.x - sl.x;
    const dy = s.y - sl.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 150) {
      const sp = 26 + floor * 8;
      const nx = sl.x + (dx / dist) * sp * dt;
      const ny = sl.y + (dy / dist) * sp * dt;
      if (walkable(s, Math.floor(nx / TILE), Math.floor(sl.y / TILE))) sl.x = nx;
      if (walkable(s, Math.floor(sl.x / TILE), Math.floor(ny / TILE))) sl.y = ny;
    }
    if (dist < 12 && rt.iframes <= 0) {
      s.energy = Math.max(0, s.energy - 8);
      rt.iframes = 0.85;
      rt.shake = rt.reduce ? 0 : 6;
      s.x -= (dx / dist) * 12;
      s.y -= (dy / dist) * 12;
      float(rt, s.x, s.y - 16, "-8", "#c4653a");
      sfx("hurt");
      if (s.energy <= 0) toast(rt, "A slime sapped the last of your strength.");
    }
  }
}

function tickChickens(s: GameState, rt: Runtime, dt: number) {
  if (!s.hasCoop) return;
  while (rt.chicks.length < s.chickens.length) rt.chicks.push({ vx: 0, vy: 0, t: 0 });
  const x0 = 24 * TILE;
  const y0 = 3 * TILE;
  const x1 = 32 * TILE;
  const y1 = 9 * TILE;
  s.chickens.forEach((c, i) => {
    const v = rt.chicks[i];
    if (!v) return;
    v.t -= dt;
    if (v.t <= 0) {
      v.vx = (Math.random() - 0.5) * 22;
      v.vy = (Math.random() - 0.5) * 22;
      v.t = 0.7 + Math.random();
    }
    c.x = Math.max(x0, Math.min(x1, c.x + v.vx * dt));
    c.y = Math.max(y0, Math.min(y1, c.y + v.vy * dt));
  });
}

function updateFish(s: GameState, rt: Runtime, input: InputFrame, dt: number) {
  const f = rt.fish;
  if (!f) return;
  if (f.phase === "wait") {
    f.timer -= dt;
    if (f.timer <= 0) {
      f.phase = "bite";
      f.timer = 1.15;
      sfx("bite");
    }
  } else if (f.phase === "bite") {
    f.timer -= dt;
    if (input.useEdge) {
      f.phase = "play";
      f.catch = 0.28;
      rumble(28, 0.2, 0.15);
    } else if (f.timer <= 0) {
      f.phase = "lost";
      f.timer = 1;
      f.resolved = true;
      toast(rt, "Too slow — it slipped away.");
    }
  } else if (f.phase === "play") {
    f.fishV += (Math.random() - 0.5) * dt * 4.2 * f.diff;
    f.fishV = Math.max(-0.85 * f.diff, Math.min(0.85 * f.diff, f.fishV));
    f.fishY += f.fishV * dt;
    if (f.fishY <= 0 || f.fishY >= 1) {
      f.fishV *= -0.7;
      f.fishY = Math.max(0, Math.min(1, f.fishY));
    }
    f.barY += (input.useHeld ? -0.85 : 0.72) * dt;
    f.barY = Math.max(0, Math.min(0.78, f.barY));
    const overlap = f.fishY >= f.barY && f.fishY <= f.barY + 0.22;
    const need = 2.15;
    f.catch += overlap ? dt / need : -dt / (need * 1.3);
    f.catch = Math.max(0, Math.min(1, f.catch));
    if (f.catch >= 1 && !f.resolved) {
      f.resolved = true;
      f.phase = "caught";
      f.timer = 1.05;
      give(s, rt, f.item, 1);
      s.stats.fish += 1;
      toast(rt, `Caught a ${f.label}.`);
      sfx("catch");
      rumble(70, 0.45, 0.2);
    } else if (f.catch <= 0 && !f.resolved) {
      f.resolved = true;
      f.phase = "lost";
      f.timer = 1.05;
      toast(rt, `${f.label} got away.`);
    }
  } else {
    f.timer -= dt;
    if (f.timer <= 0) {
      rt.fish = null;
      if (rt.panel?.t === "fish") rt.panel = null;
    }
  }
}

function rollWeather(season: number): Weather {
  const r = Math.random();
  if (season === 3) return r < 0.58 ? "snow" : "sun";
  const p = season === 1 ? 0.22 : season === 2 ? 0.36 : 0.42;
  return r < p ? "rain" : "sun";
}

export function sleep(s: GameState, rt: Runtime, passedOut: boolean) {
  const lines: string[] = [];
  let earned = 0;
  for (const st of s.shipping) {
    const g = ITEMS[st.id].sell * st.count;
    earned += g;
    lines.push(`${st.count} × ${ITEMS[st.id].name} — ${g}g`);
    if (isCropItem(st.id)) s.flags.shippedCrop = true;
  }
  s.shipping = [];
  s.gold += earned;
  s.stats.earned += earned;
  if (passedOut) {
    const pen = Math.min(200, Math.floor(s.gold * 0.1));
    s.gold -= pen;
    if (pen) lines.push(`You collapsed on the path and lost ${pen}g.`);
  }
  let froze = 0;
  for (const key of Object.keys(s.soil)) {
    const cell = s.soil[key];
    if (!cell) continue;
    if (cell.crop && cell.watered && cell.stage < 3) cell.stage += 1;
    if (!cell.crop && cell.tilled && !cell.watered) {
      delete s.soil[key];
      continue;
    }
    cell.watered = false;
  }
  s.day += 1;
  if (s.day > DAYS) {
    s.day = 1;
    s.season = (s.season + 1) % 4;
    if (s.season === 0) s.year += 1;
    for (const cell of Object.values(s.soil)) {
      if (cell.crop && CROPS[cell.crop].season !== s.season) {
        cell.crop = null;
        cell.stage = 0;
        froze++;
      }
    }
  }
  if (froze) lines.push("The turn of the season took what couldn't last.");
  s.weather = rollWeather(s.season);
  if (s.weather === "rain") {
    for (const cell of Object.values(s.soil)) if (cell.tilled || cell.crop) cell.watered = true;
    lines.push("Rain is on the fields. You can leave the can.");
  } else if (s.weather === "snow") lines.push("Snow quiets the fen. Snowpeas don't mind.");
  else lines.push("A clear morning.");
  if (s.chickens.length) {
    s.coopEggs += s.chickens.length;
    lines.push(`${s.chickens.length} egg${s.chickens.length > 1 ? "s" : ""} waiting in the coop.`);
    for (const c of s.chickens) c.pet = false;
  }
  for (const g of s.forage) g.alive = true;
  s.cut = {};
  s.talked = {};
  s.gifted = {};
  for (const o of s.objects) {
    if (o.kind === "stump" && o.reviveDay && o.reviveDay <= absDay(s)) {
      o.kind = "tree";
      o.hp = 3;
      o.maxHp = 3;
      o.reviveDay = 0;
    }
  }
  regenMine(s);
  s.mapId = "house";
  s.x = 5.5 * TILE;
  s.y = 6.5 * TILE;
  s.dir = 0;
  s.minutes = 0;
  s.energy = passedOut ? Math.floor(s.maxEnergy * 0.5) : s.maxEnergy;
  if (s.flags.millOn) {
    const seed = (["pip-seed", "tomato-seed", "sunmote-seed", "snowpea-seed"] as const)[s.season];
    give(s, rt, seed, 1);
    s.gold += 30;
    lines.push(`The mill left ${ITEMS[seed].name} and 30g.`);
  }
  rt.path = null;
  rt.fish = null;
  rt.slimes = [];
  rt.slimeMap = "";
  rt.exitLock = 0.6;
  rt.warnedNight = false;
  rt.panel = { t: "summary", passedOut, lines, earned };
  sfx("day");
  saveGame(s);
}

function decayFx(rt: Runtime, dt: number) {
  for (const t of rt.toasts) t.life -= dt;
  rt.toasts = rt.toasts.filter((t) => t.life > 0);
  for (const p of rt.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  rt.particles = rt.particles.filter((p) => p.life > 0);
  for (const f of rt.floats) {
    f.life -= dt;
    f.y -= 14 * dt;
  }
  rt.floats = rt.floats.filter((f) => f.life > 0);
  rt.shake = rt.reduce ? 0 : Math.max(0, rt.shake - dt * 18);
  rt.exitLock = Math.max(0, rt.exitLock - dt);
  rt.iframes = Math.max(0, rt.iframes - dt);
  rt.cooldown = Math.max(0, rt.cooldown - dt);
}

export function tick(s: GameState, rt: Runtime, input: InputFrame, dt: number) {
  decayFx(rt, dt);
  if (s.minutes >= 20 * 60 && rt.panel?.t !== "summary") {
    sleep(s, rt, true);
    return;
  }
  if (rt.fish) {
    if (input.cancelEdge) {
      rt.fish = null;
      if (rt.panel?.t === "fish") rt.panel = null;
      toast(rt, "Line pulled in.");
      return;
    }
    updateFish(s, rt, input, dt);
    return;
  }
  if (!rt.panel && favorsDone(s.flags) && !s.flags.millOn) {
    rt.panel = { t: "mill" };
    return;
  }
  if (input.pauseEdge) {
    if (!rt.panel) rt.panel = { t: "pause" };
    else if (rt.panel.t !== "summary" && rt.panel.t !== "mill") rt.panel = null;
  }
  if (input.cancelEdge && rt.panel) {
    if (rt.panel.t === "summary") dismissSummary(rt);
    else if (rt.panel.t !== "mill") rt.panel = null;
  }
  if (input.bagEdge) rt.panel = rt.panel?.t === "inventory" ? null : { t: "inventory" };
  if (input.journalEdge) rt.panel = rt.panel?.t === "quests" ? null : { t: "quests" };
  if (input.tool !== null) s.sel = { kind: "tool", tool: TOOLS[input.tool] ?? "hoe" };
  if (!rt.panel && input.toolDelta) {
    const cur = s.sel.kind === "tool" ? TOOLS.indexOf(s.sel.tool) : 0;
    const next = (Math.max(0, cur) + input.toolDelta + TOOLS.length) % TOOLS.length;
    s.sel = { kind: "tool", tool: TOOLS[next] ?? "hoe" };
  }
  if (rt.panel) return;

  if (input.click) handleClick(s, rt, input.click.x, input.click.y);
  const steered = Math.hypot(input.mx, input.my) > 0.2 && !input.click;
  let mx = 0;
  let my = 0;
  if (steered) {
    rt.path = null;
    rt.pendingTalk = null;
    rt.pendingUse = false;
    mx = input.mx;
    my = input.my;
  } else if (rt.path && rt.path.length) {
    const p = rt.path[0];
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const len = Math.hypot(dx, dy);
    if (len < 3) {
      s.x = p.x;
      s.y = p.y;
      rt.path.shift();
      if (!rt.path.length) arrive(s, rt);
    } else {
      mx = dx / len;
      my = dy / len;
    }
  }
  if (mx || my) movePlayer(s, rt, mx, my, dt);
  else {
    rt.speed = 0;
    rt.moving = false;
  }
  if (input.useEdge) useTool(s, rt);
  else if (input.useHeld) {
    rt.holdFor += dt;
    if (rt.holdFor > 0.28 && rt.cooldown <= 0) useTool(s, rt);
  } else rt.holdFor = 0;
  if (input.interactEdge) interact(s, rt);
  if (input.eatEdge) eatHeld(s, rt);

  ensureSlimes(s, rt);
  if (s.mapId.startsWith("mine")) tickSlimes(s, rt, dt);
  tickChickens(s, rt, dt);
  s.drops = s.drops.filter((d) => {
    if (d.mapId !== s.mapId) return true;
    if (Math.hypot(d.x - s.x, d.y - s.y) < 14) {
      const left = addItem(s, d.item, d.count);
      if (left === 0) {
        float(rt, d.x, d.y - 8, ITEMS[d.item].name, "#3e6b46");
        return false;
      }
      d.count = left;
    }
    return true;
  });
  checkExit(s, rt);
  s.minutes += dt * 8;
  if (hourOf(s.minutes) >= 23 && !rt.warnedNight) {
    rt.warnedNight = true;
    toast(rt, "It's late. The bed is in the cottage.");
  }
  rt.saveT += dt;
  if (rt.saveT > 15) {
    rt.saveT = 0;
    saveGame(s);
  }
}

export function eatIndex(s: GameState, rt: Runtime, index: number) {
  const sl = s.inv[index];
  if (!sl) return;
  const energy = ITEMS[sl.id].energy;
  if (!energy) {
    toast(rt, "That isn't food.");
    return;
  }
  if (s.energy >= s.maxEnergy - 2) {
    toast(rt, "You're not hungry.");
    return;
  }
  s.energy = Math.min(s.maxEnergy, s.energy + energy);
  sl.count -= 1;
  if (sl.count <= 0) {
    s.inv[index] = null;
    if (s.sel.kind === "item" && s.sel.slot === index) s.sel = { kind: "tool", tool: "hoe" };
  }
  float(rt, s.x, s.y - 16, `+${energy}`, "#e0a23b");
  sfx("harvest");
}

function eatHeld(s: GameState, rt: Runtime) {
  if (s.sel.kind !== "item") {
    toast(rt, "Hold a food from your pack, then press F or the left trigger.");
    return;
  }
  eatIndex(s, rt, s.sel.slot);
}

export function buyItem(s: GameState, rt: Runtime, id: ItemId, n: number) {
  const def = ITEMS[id];
  if (!def.buy) return;
  if (def.season !== undefined && def.season !== s.season) {
    toast(rt, `${def.name} aren't sold this season.`);
    return;
  }
  let bought = 0;
  for (let i = 0; i < n; i++) {
    if (s.gold < def.buy) break;
    if (addItem(s, id, 1) !== 0) break;
    s.gold -= def.buy;
    bought++;
  }
  if (!bought) toast(rt, s.gold < (def.buy ?? 0) ? "Not enough gold." : "Pack is full.");
  else {
    sfx("coin");
    toast(rt, `Bought ${bought}.`);
  }
}

export function sellSlot(s: GameState, rt: Runtime, index: number) {
  const sl = s.inv[index];
  if (!sl) return;
  const g = ITEMS[sl.id].sell * sl.count;
  s.gold += g;
  s.stats.earned += g;
  if (isCropItem(sl.id)) s.flags.shippedCrop = true;
  s.inv[index] = null;
  if (s.sel.kind === "item" && s.sel.slot === index) s.sel = { kind: "tool", tool: "hoe" };
  sfx("coin");
  toast(rt, `Sold for ${g}g.`);
}

export function shipSlot(s: GameState, index: number) {
  const sl = s.inv[index];
  if (!sl) return;
  s.inv[index] = null;
  const exist = s.shipping.find((x) => x.id === sl.id);
  if (exist) exist.count += sl.count;
  else s.shipping.push(sl);
  if (s.sel.kind === "item" && s.sel.slot === index) s.sel = { kind: "tool", tool: "hoe" };
}

export function unship(s: GameState, index: number) {
  const sl = s.shipping[index];
  if (!sl) return;
  if (addItem(s, sl.id, sl.count) === 0) s.shipping.splice(index, 1);
}

export function offerGift(s: GameState, rt: Runtime) {
  if (rt.panel?.t !== "dialogue") return;
  const npc = rt.panel.npc;
  if (s.gifted[npc]) {
    toast(rt, "They already accepted a gift today.");
    return;
  }
  if (s.sel.kind !== "item") {
    toast(rt, "Select a gift in your pack first.");
    return;
  }
  const sl = s.inv[s.sel.slot];
  if (!sl) return;
  const id = sl.id;
  sl.count -= 1;
  if (sl.count <= 0) s.inv[s.sel.slot] = null;
  s.gifted[npc] = true;
  const loved = LOVES[npc].includes(id);
  s.hearts[npc] = Math.min(400, (s.hearts[npc] ?? 0) + (loved ? 90 : 28));
  if (npc === "bram" && isFishItem(id)) s.flags.giftedBram = true;
  if (npc === "lila" && id === "moonberry") s.flags.giftedLila = true;
  toast(rt, loved ? "They love this." : "They accept it kindly.");
  sfx("talk");
}

export function upgradeTools(s: GameState, rt: Runtime) {
  if (s.toolTier) {
    toast(rt, "Already copper.");
    return;
  }
  if (s.gold < 800 || countItem(s, "copper") < 8) {
    toast(rt, "Need 800g and 8 copper.");
    return;
  }
  removeItem(s, "copper", 8);
  s.gold -= 800;
  s.toolTier = 1;
  toast(rt, "Copper edges. The can covers a wider row.");
  sfx("chop");
}

export function buyCoop(s: GameState, rt: Runtime) {
  if (s.hasCoop) return;
  if (s.gold < 400 || countItem(s, "wood") < 20) {
    toast(rt, "Need 400g and 20 wood.");
    return;
  }
  removeItem(s, "wood", 20);
  s.gold -= 400;
  s.hasCoop = true;
  s.objects.push({ id: "coop", mapId: "farm", tx: 26, ty: 4, kind: "coop", hp: 1, maxHp: 1, reviveDay: 0 });
  toast(rt, "Nia raised a coop on the northeast grass.");
  sfx("chop");
}

export function buyChicken(s: GameState, rt: Runtime) {
  if (!s.hasCoop) {
    toast(rt, "Build a coop with Nia first.");
    return;
  }
  if (s.chickens.length >= 4) {
    toast(rt, "The coop is full.");
    return;
  }
  if (s.gold < 250) {
    toast(rt, "A chicken is 250g.");
    return;
  }
  s.gold -= 250;
  s.chickens.push({ id: s.chickens.length + 1, x: 27 * TILE, y: 6 * TILE, pet: false });
  toast(rt, "A chicken settles into the yard.");
  sfx("coin");
}

export function advanceTalk(rt: Runtime, pages: number) {
  if (rt.panel?.t !== "dialogue") return;
  if (rt.panel.page < pages - 1) rt.panel.page += 1;
  else rt.panel = null;
}

export function dismissSummary(rt: Runtime) {
  if (rt.panel?.t === "summary") rt.panel = null;
}

export function dismissMill(s: GameState, rt: Runtime) {
  s.flags.millOn = true;
  rt.panel = null;
  toast(rt, "The wheel takes the current. Dawn will leave a gift.");
  sfx("day");
  saveGame(s);
}

export function setPanel(rt: Runtime, panel: Panel | null) {
  rt.panel = panel;
}

