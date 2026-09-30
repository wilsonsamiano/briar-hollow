export const TILE = 16;
export const DAYS = 14;
export const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
export const DX = [0, -1, 1, 0] as const;
export const DY = [1, 0, 0, -1] as const;

export type Dir = 0 | 1 | 2 | 3;
export type ToolId = "hoe" | "can" | "axe" | "pick" | "scythe" | "rod";
export type CropId = "pip" | "tomato" | "sunmote" | "snowpea";
export type ItemId =
  | "pip-seed"
  | "tomato-seed"
  | "sunmote-seed"
  | "snowpea-seed"
  | "pip"
  | "tomato"
  | "sunmote"
  | "snowpea"
  | "wood"
  | "stone"
  | "copper"
  | "fiber"
  | "moonberry"
  | "mushroom"
  | "blossom"
  | "carp"
  | "trout"
  | "eel"
  | "egg"
  | "geode";
export type Weather = "sun" | "rain" | "snow";
export type Terrain =
  | "grass"
  | "soil"
  | "path"
  | "water"
  | "wood"
  | "stone"
  | "sand"
  | "cobble"
  | "mine"
  | "mwall"
  | "fence"
  | "door";
export type NpcId = "marrow" | "lila" | "bram" | "nia";
export type ObjKind =
  | "tree"
  | "stump"
  | "rock"
  | "copper"
  | "geode"
  | "bin"
  | "bed"
  | "counter"
  | "board"
  | "well"
  | "scarecrow"
  | "letter"
  | "coop"
  | "mill";

export interface ItemDef {
  name: string;
  sell: number;
  buy?: number;
  frame: number;
  energy?: number;
  seed?: CropId;
  season?: number;
  desc: string;
}

export const TOOLS: ToolId[] = ["hoe", "can", "axe", "pick", "scythe", "rod"];

export const TOOL_INFO: Record<ToolId, { name: string; frame: number; blurb: string }> = {
  hoe: { name: "Hoe", frame: 0, blurb: "Till soil" },
  can: { name: "Watering can", frame: 1, blurb: "Water crops" },
  axe: { name: "Axe", frame: 2, blurb: "Chop trees" },
  pick: { name: "Pickaxe", frame: 3, blurb: "Break rock" },
  scythe: { name: "Scythe", frame: 4, blurb: "Harvest and cut grass" },
  rod: { name: "Rod", frame: 5, blurb: "Fish open water" },
};

export const CROPS: Record<
  CropId,
  { name: string; seed: ItemId; item: ItemId; season: number; row: number }
> = {
  pip: { name: "Pip", seed: "pip-seed", item: "pip", season: 0, row: 0 },
  tomato: { name: "Ember tomato", seed: "tomato-seed", item: "tomato", season: 1, row: 1 },
  sunmote: { name: "Sunmote", seed: "sunmote-seed", item: "sunmote", season: 2, row: 2 },
  snowpea: { name: "Snowpea", seed: "snowpea-seed", item: "snowpea", season: 3, row: 3 },
};

export const ITEMS: Record<ItemId, ItemDef> = {
  "pip-seed": { name: "Pip seeds", sell: 10, buy: 20, frame: 6, seed: "pip", season: 0, desc: "Spring root. Quick and honest." },
  "tomato-seed": { name: "Tomato seeds", sell: 25, buy: 50, frame: 7, seed: "tomato", season: 1, desc: "Summer fruit. Likes a drink." },
  "sunmote-seed": { name: "Sunmote seeds", sell: 20, buy: 40, frame: 8, seed: "sunmote", season: 2, desc: "Fall flower with a honey heart." },
  "snowpea-seed": { name: "Snowpea seeds", sell: 35, buy: 70, frame: 9, seed: "snowpea", season: 3, desc: "Winter vine. Ignores the cold." },
  pip: { name: "Pip", sell: 45, frame: 6, energy: 14, desc: "Pale, sweet, and filling enough." },
  tomato: { name: "Ember tomato", sell: 110, frame: 7, energy: 28, desc: "Warm even after picking." },
  sunmote: { name: "Sunmote", sell: 90, frame: 8, energy: 16, desc: "Smells like a late field." },
  snowpea: { name: "Snowpea", sell: 140, frame: 9, energy: 24, desc: "Crunches like fresh frost." },
  wood: { name: "Wood", sell: 8, frame: 10, desc: "Nia always wants more." },
  stone: { name: "Stone", sell: 4, frame: 11, desc: "Heavy, common, useful." },
  copper: { name: "Copper", sell: 25, frame: 12, desc: "Ore from the fen shaft." },
  fiber: { name: "Fiber", sell: 2, frame: 13, energy: 4, desc: "Tough grass. Barely food." },
  moonberry: { name: "Moonberry", sell: 35, frame: 14, energy: 22, desc: "Lila's favorite study." },
  mushroom: { name: "Fen mushroom", sell: 20, frame: 15, energy: 16, desc: "Found off the wood path." },
  blossom: { name: "Wild blossom", sell: 15, frame: 16, energy: 8, desc: "A small cream flower." },
  carp: { name: "Fen carp", sell: 45, frame: 17, energy: 24, desc: "Slow, stubborn, common." },
  trout: { name: "Hollow trout", sell: 95, frame: 17, energy: 30, desc: "Fights the line." },
  eel: { name: "Dusk eel", sell: 170, frame: 17, energy: 34, desc: "Rare, and it knows it." },
  egg: { name: "Egg", sell: 55, frame: 18, energy: 20, desc: "From the coop, still warm." },
  geode: { name: "Hollow geode", sell: 280, frame: 19, desc: "A crystal heart from the deep shaft." },
};

export const FISH_TABLE = [
  { item: "carp" as const, label: "Fen carp", diff: 0.62, weight: 55 },
  { item: "trout" as const, label: "Hollow trout", diff: 0.92, weight: 32 },
  { item: "eel" as const, label: "Dusk eel", diff: 1.2, weight: 13 },
];

export const NPCS: NpcId[] = ["marrow", "lila", "bram", "nia"];

export const NPC_META: Record<NpcId, { name: string; role: string }> = {
  marrow: { name: "Marrow Vetch", role: "Shopkeeper" },
  lila: { name: "Lila Fen", role: "Botanist" },
  bram: { name: "Bram Calder", role: "Fisher" },
  nia: { name: "Nia Okonkwo", role: "Carpenter" },
};

export const LOVES: Record<NpcId, ItemId[]> = {
  marrow: ["pip", "tomato", "egg", "sunmote"],
  lila: ["moonberry", "blossom", "mushroom", "sunmote"],
  bram: ["carp", "trout", "eel"],
  nia: ["wood", "copper", "stone", "geode"],
};

export const LETTER = `The fen is yours now — sour soil, a quiet pond, and a mill that hasn't turned since the axle cracked.

Marrow sells seed and doesn't haggle. Water what you plant, unless the rain beats you to it. The shipping bin by the field pays out when you sleep.

Three favors wake the mill: ship a crop, offer Bram a fish, and bring Lila a moonberry from the east woods.

— Aunt Bramble`;

export interface Stack {
  id: ItemId;
  count: number;
}
export interface SoilCell {
  tilled: boolean;
  watered: boolean;
  crop: CropId | null;
  stage: number;
}
export interface Obj {
  id: string;
  mapId: string;
  tx: number;
  ty: number;
  kind: ObjKind;
  hp: number;
  maxHp: number;
  reviveDay: number;
}
export interface Forage {
  id: string;
  mapId: string;
  tx: number;
  ty: number;
  item: ItemId;
  alive: boolean;
}
export interface Chicken {
  id: number;
  x: number;
  y: number;
  pet: boolean;
}
export interface Drop {
  id: string;
  mapId: string;
  x: number;
  y: number;
  item: ItemId;
  count: number;
}
export interface Flags {
  letterRead: boolean;
  shippedCrop: boolean;
  giftedBram: boolean;
  giftedLila: boolean;
  millOn: boolean;
}
export type Sel = { kind: "tool"; tool: ToolId } | { kind: "item"; slot: number };

export interface GameState {
  version: 1;
  name: string;
  year: number;
  season: number;
  day: number;
  minutes: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  mapId: string;
  x: number;
  y: number;
  dir: Dir;
  sel: Sel;
  inv: (Stack | null)[];
  soil: Record<string, SoilCell>;
  objects: Obj[];
  forage: Forage[];
  chickens: Chicken[];
  drops: Drop[];
  hasCoop: boolean;
  coopEggs: number;
  toolTier: 0 | 1;
  hearts: Record<string, number>;
  talked: Record<string, boolean>;
  gifted: Record<string, boolean>;
  flags: Flags;
  weather: Weather;
  shipping: Stack[];
  cut: Record<string, boolean>;
  stats: { harvests: number; fish: number; earned: number };
}

export type Panel =
  | { t: "inventory" }
  | { t: "dialogue"; npc: NpcId; page: number }
  | { t: "shop"; tab: "buy" | "sell" }
  | { t: "ship" }
  | { t: "sleep" }
  | { t: "quests" }
  | { t: "pause" }
  | { t: "letter" }
  | { t: "summary"; passedOut: boolean; lines: string[]; earned: number }
  | { t: "mill" }
  | { t: "fish" };

export interface FishState {
  phase: "wait" | "bite" | "play" | "caught" | "lost";
  timer: number;
  item: ItemId;
  label: string;
  diff: number;
  fishY: number;
  fishV: number;
  barY: number;
  catch: number;
  resolved: boolean;
}
export interface Slime {
  x: number;
  y: number;
  hp: number;
  hit: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  r: number;
}
export interface Floatie {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface Runtime {
  panel: Panel | null;
  path: { x: number; y: number }[] | null;
  pendingTalk: NpcId | null;
  pendingUse: boolean;
  faceTile: { tx: number; ty: number } | null;
  fish: FishState | null;
  slimes: Slime[];
  slimeMap: string;
  particles: Particle[];
  floats: Floatie[];
  toasts: { text: string; life: number }[];
  shake: number;
  step: number;
  moving: boolean;
  speed: number;
  iframes: number;
  cooldown: number;
  holdFor: number;
  exitLock: number;
  warnedNight: boolean;
  chicks: { vx: number; vy: number; t: number }[];
  camX: number;
  camY: number;
  zoom: number;
  cssW: number;
  cssH: number;
  reduce: boolean;
  saveT: number;
  noteT: number;
  noteI: number;
}

export interface Exit {
  tx: number;
  ty: number;
  to: string;
  sx: number;
  sy: number;
}
export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  tiles: Terrain[][];
  exits: Exit[];
}
export interface Ladder {
  tx: number;
  ty: number;
  to: string;
  sx: number;
  sy: number;
  needClear: boolean;
}

export function grid(w: number, h: number, fill: Terrain): Terrain[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}
export function rect(g: Terrain[][], x: number, y: number, w: number, h: number, t: Terrain) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (g[j]?.[i] !== undefined) g[j][i] = t;
    }
  }
}
function border(g: Terrain[][], t: Terrain) {
  const h = g.length;
  const w = g[0].length;
  for (let x = 0; x < w; x++) {
    g[0][x] = t;
    g[h - 1][x] = t;
  }
  for (let y = 0; y < h; y++) {
    g[y][0] = t;
    g[y][w - 1] = t;
  }
}
function disc(g: Terrain[][], cx: number, cy: number, r: number, t: Terrain) {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g[y][x] = t;
    }
  }
}

function buildFarm(): MapDef {
  const w = 34;
  const h = 24;
  const tiles = grid(w, h, "grass");
  border(tiles, "fence");
  rect(tiles, 3, 2, 5, 4, "fence");
  tiles[6][5] = "door";
  for (let x = 5; x <= 21; x++) tiles[7][x] = "path";
  for (let y = 7; y <= 22; y++) tiles[y][21] = "path";
  tiles[23][21] = "path";
  tiles[23][22] = "path";
  rect(tiles, 8, 12, 12, 7, "soil");
  disc(tiles, 28, 14, 4, "water");
  for (const [x, y] of [
    [22, 14],
    [23, 14],
    [22, 15],
    [23, 15],
    [22, 16],
  ]) {
    tiles[y][x] = "sand";
  }
  return {
    id: "farm",
    name: "Bramble Fen",
    w,
    h,
    tiles,
    exits: [
      { tx: 21, ty: 23, to: "town", sx: 16, sy: 1 },
      { tx: 22, ty: 23, to: "town", sx: 17, sy: 1 },
      { tx: 5, ty: 6, to: "house", sx: 5, sy: 6 },
    ],
  };
}

function buildHouse(): MapDef {
  const tiles = grid(11, 9, "wood");
  border(tiles, "fence");
  tiles[8][5] = "door";
  return {
    id: "house",
    name: "Cottage",
    w: 11,
    h: 9,
    tiles,
    exits: [{ tx: 5, ty: 8, to: "farm", sx: 5, sy: 7 }],
  };
}

function buildTown(): MapDef {
  const tiles = grid(32, 18, "grass");
  border(tiles, "fence");
  tiles[0][16] = "path";
  tiles[0][17] = "path";
  tiles[10][0] = "path";
  tiles[10][31] = "path";
  for (let y = 1; y <= 16; y++) tiles[y][16] = "path";
  for (let x = 1; x <= 30; x++) tiles[10][x] = "cobble";
  rect(tiles, 3, 2, 6, 4, "fence");
  tiles[6][5] = "door";
  for (let y = 7; y <= 10; y++) tiles[y][5] = "path";
  rect(tiles, 14, 11, 8, 4, "cobble");
  return {
    id: "town",
    name: "Hollow Cross",
    w: 32,
    h: 18,
    tiles,
    exits: [
      { tx: 16, ty: 0, to: "farm", sx: 21, sy: 22 },
      { tx: 17, ty: 0, to: "farm", sx: 22, sy: 22 },
      { tx: 0, ty: 10, to: "mine-1", sx: 9, sy: 12 },
      { tx: 31, ty: 10, to: "woods", sx: 1, sy: 10 },
      { tx: 5, ty: 6, to: "shop", sx: 5, sy: 6 },
    ],
  };
}

function buildShop(): MapDef {
  const tiles = grid(11, 9, "wood");
  border(tiles, "fence");
  tiles[8][5] = "door";
  return {
    id: "shop",
    name: "Marrow's",
    w: 11,
    h: 9,
    tiles,
    exits: [{ tx: 5, ty: 8, to: "town", sx: 5, sy: 7 }],
  };
}

function buildWoods(): MapDef {
  const tiles = grid(28, 20, "grass");
  border(tiles, "fence");
  tiles[10][0] = "path";
  for (let x = 1; x <= 26; x++) tiles[10][x] = "path";
  disc(tiles, 22, 4, 2, "water");
  return {
    id: "woods",
    name: "East Woods",
    w: 28,
    h: 20,
    tiles,
    exits: [{ tx: 0, ty: 10, to: "town", sx: 30, sy: 10 }],
  };
}

function buildMine(floor: number): MapDef {
  const w = 18;
  const h = 16;
  const tiles = grid(w, h, "mine");
  border(tiles, "mwall");
  rect(tiles, 3, 4, 2, 2, "mwall");
  rect(tiles, 12, 7, 2, 3, "mwall");
  if (floor === 2) rect(tiles, 6, 9, 2, 2, "mwall");
  if (floor === 3) rect(tiles, 7, 5, 2, 2, "mwall");
  return { id: `mine-${floor}`, name: `Fen Shaft ${floor}`, w, h, tiles, exits: [] };
}

const STATIC: Record<string, MapDef> = {
  farm: buildFarm(),
  house: buildHouse(),
  town: buildTown(),
  shop: buildShop(),
  woods: buildWoods(),
};

export function getMap(id: string): MapDef {
  if (id.startsWith("mine-")) return buildMine(Number(id.slice(5)) || 1);
  return STATIC[id] ?? STATIC.farm;
}

export function ladders(mapId: string): Ladder[] {
  if (mapId === "mine-1") {
    return [
      { tx: 9, ty: 14, to: "town", sx: 1, sy: 10, needClear: false },
      { tx: 9, ty: 2, to: "mine-2", sx: 9, sy: 13, needClear: true },
    ];
  }
  if (mapId === "mine-2") {
    return [
      { tx: 9, ty: 14, to: "mine-1", sx: 9, sy: 3, needClear: false },
      { tx: 9, ty: 2, to: "mine-3", sx: 9, sy: 13, needClear: true },
    ];
  }
  if (mapId === "mine-3") {
    return [{ tx: 9, ty: 14, to: "mine-2", sx: 9, sy: 3, needClear: false }];
  }
  return [];
}

export function hourOf(minutes: number) {
  return Math.floor((6 * 60 + minutes) / 60) % 24;
}

export function clockLabel(minutes: number) {
  const total = 6 * 60 + Math.max(0, Math.floor(minutes));
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
}

export function absDay(s: { year: number; season: number; day: number }) {
  return s.year * 400 + s.season * DAYS + s.day;
}

export function dirFrom(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}

export function npcAnchor(s: GameState, id: NpcId): { mapId: string; tx: number; ty: number } {
  const h = hourOf(s.minutes);
  if (id === "marrow") {
    if (h >= 8 && h < 19) return { mapId: "shop", tx: 5, ty: 4 };
    return { mapId: "town", tx: 6, ty: 8 };
  }
  if (id === "bram") {
    if (h >= 6 && h < 12) return { mapId: "farm", tx: 22, ty: 16 };
    return { mapId: "town", tx: 18, ty: 12 };
  }
  if (id === "lila") return { mapId: "woods", tx: 16, ty: 12 };
  return { mapId: "town", tx: 26, ty: 8 };
}

export function dialoguePages(
  id: NpcId,
  ctx: { name: string; weather: Weather; hearts: number; flags: Flags; season: number },
): string[] {
  const warm = ctx.hearts >= 2;
  if (id === "marrow") {
    return [
      ctx.weather === "rain"
        ? "Roof's dripping on the flour again. Mind the puddle."
        : `You're ${ctx.name}. Bramble's kin. Seed's on the counter when I'm open — eight to seven.`,
      warm
        ? "The hollow looks better with somebody watering it."
        : "Shipping bin pays in the morning. I buy the same prices if you can't wait.",
      "Don't plant snowpeas in spring. They'll sulk and so will I.",
    ];
  }
  if (id === "lila") {
    return [
      "Lila Fen. I keep notes on whatever the woods decide to grow.",
      ctx.flags.giftedLila
        ? "That moonberry is already pressed in the book. Thank you."
        : "A moonberry, if you find one off the path, would finish a page I've left blank for years.",
      warm ? "The fen listens, if you stay long enough." : "Mushrooms are fine. Blossoms too. Moonberries are the study.",
    ];
  }
  if (id === "bram") {
    return [
      hourOfLine(ctx),
      ctx.flags.giftedBram
        ? "Best supper I've had since the mill still turned."
        : "Catch anything with a fin and I'll take it off your hands. Gladly.",
      "Carp is honest. Trout argues. The eel is a rumor until it isn't.",
    ];
  }
  return [
    "Nia. I raise beams, coops, and the occasional tool if you bring copper.",
    ctx.flags.millOn
      ? "Axle's true. Don't lean on the wheel while it's wet."
      : "The mill's axle cracked years ago. Favors move faster than nails — ask the others.",
    "Copper tools bite cleaner. A coop needs wood and a bit of gold.",
  ];
}

function hourOfLine(ctx: { weather: Weather }) {
  if (ctx.weather === "rain") return "Fish bite lazy in the rain. I don't.";
  if (ctx.weather === "snow") return "Pond's not frozen. The carp don't seem to mind.";
  return "Mornings I haunt your dock. After noon I'm in the square, usually hungry.";
}

export function questView(flags: Flags) {
  return [
    { title: "First harvest", detail: "Ship or sell any crop.", done: flags.shippedCrop },
    { title: "Bram's supper", detail: "Catch a fish and offer it to Bram.", done: flags.giftedBram },
    { title: "Lila's study", detail: "Offer Lila a moonberry from the east woods.", done: flags.giftedLila },
  ];
}

export function favorsDone(flags: Flags) {
  return flags.shippedCrop && flags.giftedBram && flags.giftedLila;
}

export function hintFor(s: GameState) {
  if (!s.flags.letterRead) return "A letter is pinned by the cottage door.";
  if (!s.flags.shippedCrop) return "Till soil, plant seeds, water them, then ship the harvest.";
  if (!s.flags.giftedBram) return "Fish the east pond. Offer the catch to Bram.";
  if (!s.flags.giftedLila) return "Pick a moonberry in the east woods for Lila.";
  if (!s.flags.millOn) return "Three favors are done. The old mill is waking.";
  return "Plant, fish, mind the coop, or dig the west shaft.";
}

export function toolCost(tool: ToolId, tier: number) {
  const base: Record<ToolId, number> = { hoe: 2, can: 2, axe: 3, pick: 4, scythe: 1, rod: 3 };
  return Math.max(1, base[tool] - tier);
}

export function isCropItem(id: ItemId) {
  return id === "pip" || id === "tomato" || id === "sunmote" || id === "snowpea";
}

export function isFishItem(id: ItemId) {
  return id === "carp" || id === "trout" || id === "eel";
}

export const SOLID_KINDS = new Set<ObjKind>([
  "tree",
  "stump",
  "rock",
  "copper",
  "geode",
  "bin",
  "bed",
  "board",
  "well",
  "scarecrow",
  "coop",
  "mill",
]);

export function footprint(o: Obj): { tx: number; ty: number }[] {
  if (o.hp <= 0 || !SOLID_KINDS.has(o.kind)) return [];
  if (o.kind === "coop") {
    return [
      { tx: o.tx, ty: o.ty },
      { tx: o.tx + 1, ty: o.ty },
      { tx: o.tx, ty: o.ty + 1 },
      { tx: o.tx + 1, ty: o.ty + 1 },
    ];
  }
  if (o.kind === "mill") {
    return [
      { tx: o.tx, ty: o.ty },
      { tx: o.tx + 1, ty: o.ty },
      { tx: o.tx, ty: o.ty + 1 },
    ];
  }
  return [{ tx: o.tx, ty: o.ty }];
}

export const PROP_FRAME: Partial<Record<ObjKind, number>> = {
  bin: 0,
  scarecrow: 1,
  rock: 2,
  stump: 3,
  well: 9,
  board: 10,
  letter: 10,
  bed: 11,
  counter: 12,
};

export const FORAGE_FRAME: Partial<Record<ItemId, number>> = {
  moonberry: 4,
  mushroom: 5,
  blossom: 6,
};
