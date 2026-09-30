export interface Sheet {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
}

export interface ArtSet {
  rev: number;
  player: Sheet | null;
  crops: Sheet | null;
  props: Sheet | null;
  items: Sheet | null;
  tiles: Sheet | null;
  npc: Record<string, HTMLCanvasElement | null>;
  house: HTMLCanvasElement | null;
  shop: HTMLCanvasElement | null;
  tree: HTMLCanvasElement | null;
  mill: HTMLCanvasElement | null;
  coop: HTMLCanvasElement | null;
  chicken: Sheet | null;
  slime: Sheet | null;
}

export const art: ArtSet = {
  rev: 0,
  player: null,
  crops: null,
  props: null,
  items: null,
  tiles: null,
  npc: { marrow: null, lila: null, bram: null, nia: null },
  house: null,
  shop: null,
  tree: null,
  mill: null,
  coop: null,
  chicken: null,
  slime: null,
};

const listeners = new Set<() => void>();
export function onArt(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function bump() {
  art.rev++;
  listeners.forEach((fn) => fn());
}

function isMagenta(r: number, g: number, b: number) {
  return r > 155 && b > 155 && g < 190 && (r + b) / 2 - g > 45;
}

function floodKey(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const w = c.width;
  const h = c.height;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const seen = new Uint8Array(w * h);
  const stack = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)];
  while (stack.length) {
    const p = stack.pop()!;
    if (p < 0 || p >= w * h || seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!isMagenta(d[i], d[i + 1], d[i + 2])) continue;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  ctx.putImageData(image, 0, 0);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function toCanvas(img: HTMLImageElement, key: boolean) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  if (key) floodKey(c);
  return c;
}

async function sheet(url: string, cols: number, rows: number, key: boolean): Promise<Sheet | null> {
  const img = await loadImage(url);
  if (!img) return null;
  const canvas = toCanvas(img, key);
  if (!canvas) return null;
  return { canvas, cols, rows };
}

let started = false;
export function loadArt() {
  if (started) return;
  started = true;
  void (async () => {
    const [player, crops, props, items, tiles, chicken, slime, marrow, lila, bram, nia, house, shop, tree, mill, coop] =
      await Promise.all([
        sheet("/game/player.jpg", 4, 4, true),
        sheet("/game/crops.jpg", 4, 4, true),
        sheet("/game/props.jpg", 4, 4, true),
        sheet("/game/items.jpg", 4, 5, true),
        sheet("/game/tiles.jpg", 4, 4, false),
        sheet("/game/chicken.jpg", 2, 2, true),
        sheet("/game/slime.jpg", 2, 2, true),
        loadImage("/game/npc-marrow.jpg"),
        loadImage("/game/npc-lila.jpg"),
        loadImage("/game/npc-bram.jpg"),
        loadImage("/game/npc-nia.jpg"),
        loadImage("/game/house.jpg"),
        loadImage("/game/shop.jpg"),
        loadImage("/game/tree.jpg"),
        loadImage("/game/mill.jpg"),
        loadImage("/game/coop.jpg"),
      ]);
    art.player = player;
    art.crops = crops;
    art.props = props;
    art.items = items;
    art.tiles = tiles;
    art.chicken = chicken;
    art.slime = slime;
    if (marrow) art.npc.marrow = toCanvas(marrow, true);
    if (lila) art.npc.lila = toCanvas(lila, true);
    if (bram) art.npc.bram = toCanvas(bram, true);
    if (nia) art.npc.nia = toCanvas(nia, true);
    if (house) art.house = toCanvas(house, true);
    if (shop) art.shop = toCanvas(shop, true);
    if (tree) art.tree = toCanvas(tree, true);
    if (mill) art.mill = toCanvas(mill, true);
    if (coop) art.coop = toCanvas(coop, true);
    bump();
  })();
}

export function blit(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet | null | undefined,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip = false,
) {
  if (!sheet) return false;
  const col = frame % sheet.cols;
  const row = Math.floor(frame / sheet.cols) % sheet.rows;
  const sw = sheet.canvas.width / sheet.cols;
  const sh = sheet.canvas.height / sheet.rows;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (flip) {
    ctx.translate(Math.round(dx + dw), Math.round(dy));
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.canvas, col * sw, row * sh, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet.canvas, col * sw, row * sh, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
  }
  ctx.restore();
  return true;
}
