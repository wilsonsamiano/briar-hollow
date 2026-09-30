import { art, blit, type Sheet } from "./assets";
import {
  CROPS,
  DX,
  DY,
  FORAGE_FRAME,
  getMap,
  npcAnchor,
  PROP_FRAME,
  TILE,
  type GameState,
  type Runtime,
  type Terrain,
} from "./data";

const FILL: Record<Terrain, string> = {
  grass: "#5f8f45",
  soil: "#8a623f",
  path: "#c4a36a",
  water: "#3c6d88",
  wood: "#a67c52",
  stone: "#8d8a84",
  sand: "#d9c08a",
  cobble: "#9a9186",
  mine: "#4a463f",
  mwall: "#2c2824",
  fence: "#6b4630",
  door: "#e0a23b",
};

function tileIndex(t: Terrain, season: number, x: number, y: number, tilled: boolean, watered: boolean, indoor: boolean) {
  if (t === "soil") return tilled ? (watered ? 4 : 3) : 8;
  if (t === "grass") {
    if (season === 3) return 11;
    if (season === 2) return 10;
    if (season === 1 && (x + y) % 2 === 0) return 14;
    return (x * 3 + y) % 6 === 0 ? 1 : 0;
  }
  if (t === "path") return 2;
  if (t === "water") return 5;
  if (t === "wood" || t === "fence") return 6;
  if (t === "stone") return 7;
  if (t === "sand") return 8;
  if (t === "cobble") return 9;
  if (t === "mine") return 12;
  if (t === "mwall") return 13;
  if (t === "door") return indoor ? 6 : 2;
  return 0;
}

function blitInset(ctx: CanvasRenderingContext2D, sheet: Sheet, frame: number, dx: number, dy: number, dw: number, dh: number) {
  const col = frame % sheet.cols;
  const row = Math.floor(frame / sheet.cols) % sheet.rows;
  const cw = sheet.canvas.width / sheet.cols;
  const ch = sheet.canvas.height / sheet.rows;
  const inset = 0.2;
  ctx.drawImage(
    sheet.canvas,
    col * cw + cw * inset,
    row * ch + ch * inset,
    cw * (1 - inset * 2),
    ch * (1 - inset * 2),
    dx,
    dy,
    dw,
    dh,
  );
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx = 7, ry = 3) {
  ctx.fillStyle = "rgba(36,25,16,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function draw(ctx: CanvasRenderingContext2D, s: GameState, rt: Runtime, dt: number) {
  const cssW = rt.cssW;
  const cssH = rt.cssH;
  const zoom = rt.zoom;
  const map = getMap(s.mapId);
  const viewW = cssW / zoom;
  const viewH = cssH / zoom;
  let camX = s.x - viewW * 0.5;
  let camY = s.y - viewH * 0.42;
  camX = Math.max(0, Math.min(camX, Math.max(0, map.w * TILE - viewW)));
  camY = Math.max(0, Math.min(camY, Math.max(0, map.h * TILE - viewH)));
  camX = Math.round(camX * zoom) / zoom;
  camY = Math.round(camY * zoom) / zoom;
  rt.camX = camX;
  rt.camY = camY;

  ctx.setTransform(rt.cssW ? (ctx.canvas.width / cssW) : 1, 0, 0, ctx.canvas.height / cssH || 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#241910";
  ctx.fillRect(0, 0, cssW, cssH);

  const shake = rt.shake;
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  ctx.translate(-camX * zoom, -camY * zoom);
  ctx.scale(zoom, zoom);

  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const x1 = Math.min(map.w, Math.ceil((camX + viewW) / TILE) + 1);
  const y1 = Math.min(map.h, Math.ceil((camY + viewH) / TILE) + 1);
  const indoor = s.mapId === "house" || s.mapId === "shop";
  const now = performance.now() / 1000;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = map.tiles[y][x];
      const cell = s.mapId === "farm" ? s.soil[`${x},${y}`] : undefined;
      const frame = tileIndex(t, s.season, x, y, !!cell?.tilled, !!cell?.watered, indoor);
      if (art.tiles) blitInset(ctx, art.tiles, frame, x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      else {
        ctx.fillStyle = FILL[t];
        ctx.fillRect(x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      }
      if (t === "water") {
        ctx.fillStyle = `rgba(255,248,234,${0.12 + Math.sin(now * 2 + x + y) * 0.05})`;
        ctx.fillRect(x * TILE, y * TILE + ((now * 12 + x * 3) % TILE), TILE, 2);
      }
      if (t === "fence") {
        ctx.fillStyle = "rgba(36,25,16,0.35)";
        ctx.fillRect(x * TILE, y * TILE, TILE, 3);
      }
    }
  }

  if (s.mapId === "farm") {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const cell = s.soil[`${x},${y}`];
        if (!cell?.crop) continue;
        const spec = CROPS[cell.crop];
        const bob = cell.stage >= 3 ? Math.sin(now * 3 + x) * 0.6 : 0;
        const drawn = blit(ctx, art.crops, spec.row * 4 + cell.stage, x * TILE - 1, y * TILE - 8 + bob, 18, 20);
        if (!drawn) {
          ctx.fillStyle = ["#d8d2c4", "#c4653a", "#e0a23b", "#8fbf73"][spec.row] ?? "#3e6b46";
          ctx.beginPath();
          ctx.arc(x * TILE + 8, y * TILE + 8, 3 + cell.stage, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  for (const g of s.forage) {
    if (!g.alive || g.mapId !== s.mapId) continue;
    const fr = FORAGE_FRAME[g.item] ?? 6;
    if (!blit(ctx, art.props, fr, g.tx * TILE - 2, g.ty * TILE - 8, 20, 22)) {
      ctx.fillStyle = "#3e6b46";
      ctx.fillRect(g.tx * TILE + 4, g.ty * TILE + 4, 8, 8);
    }
  }

  type Sprite = { y: number; draw: () => void };
  const sprites: Sprite[] = [];

  for (const o of s.objects) {
    if (o.mapId !== s.mapId || o.hp <= 0) continue;
    const foot = (o.ty + 1) * TILE;
    sprites.push({
      y: foot,
      draw: () => {
        const dx = o.tx * TILE;
        const dy = o.ty * TILE;
        if (o.kind === "tree" && art.tree) {
          shadow(ctx, dx + 8, dy + 14, 10, 4);
          ctx.drawImage(art.tree, dx - 14, dy - 28, 44, 46);
          return;
        }
        if (o.kind === "mill" && art.mill) {
          shadow(ctx, dx + 16, dy + 28, 16, 5);
          ctx.drawImage(art.mill, dx - 6, dy - 26, 52, 56);
          return;
        }
        if (o.kind === "coop" && art.coop && s.hasCoop) {
          shadow(ctx, dx + 16, dy + 30, 16, 5);
          ctx.drawImage(art.coop, dx - 4, dy - 18, 46, 50);
          if (s.coopEggs > 0) {
            ctx.fillStyle = "#e0a23b";
            ctx.beginPath();
            ctx.arc(dx + 34, dy + 8, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }
        const frame = PROP_FRAME[o.kind];
        shadow(ctx, dx + 8, dy + 13, 6, 2.5);
        if (frame !== undefined && blit(ctx, art.props, frame, dx - 2, dy - 8, 20, 22)) {
          if (o.kind === "copper" || o.kind === "geode") {
            ctx.fillStyle = o.kind === "geode" ? "#f4e7c8" : "#e0a23b";
            ctx.fillRect(dx + 6, dy + 6, 4, 4);
          }
          return;
        }
        if (o.kind === "copper") {
          if (blit(ctx, art.props, 2, dx - 2, dy - 6, 20, 20)) return;
        }
        ctx.fillStyle = o.kind === "bed" ? "#f4e7c8" : o.kind === "counter" ? "#a67c52" : "#6b4630";
        ctx.fillRect(dx + 2, dy + 2, TILE - 4, TILE - 4);
      },
    });
  }

  if (s.mapId === "farm" && art.house) {
    sprites.push({
      y: 6 * TILE,
      draw: () => {
        shadow(ctx, 5.5 * TILE, 6.2 * TILE, 28, 6);
        ctx.drawImage(art.house!, 2.2 * TILE, 0.4 * TILE, 6.4 * TILE, 6 * TILE);
      },
    });
  }
  if (s.mapId === "town" && art.shop) {
    sprites.push({
      y: 6 * TILE,
      draw: () => {
        shadow(ctx, 6 * TILE, 6.2 * TILE, 30, 6);
        ctx.drawImage(art.shop!, 2.1 * TILE, 0.3 * TILE, 7.2 * TILE, 6.2 * TILE);
      },
    });
  }

  for (const id of ["marrow", "lila", "bram", "nia"] as const) {
    const a = npcAnchor(s, id);
    if (a.mapId !== s.mapId) continue;
    const x = (a.tx + 0.5) * TILE;
    const y = (a.ty + 0.85) * TILE;
    const bob = Math.sin(now * 2 + a.tx) * 0.8;
    sprites.push({
      y,
      draw: () => {
        shadow(ctx, x, y, 7, 3);
        const img = art.npc[id];
        if (img) ctx.drawImage(img, x - 11, y - 28 + bob, 22, 30);
        else {
          ctx.fillStyle = "#3e6b46";
          ctx.fillRect(x - 6, y - 18, 12, 16);
        }
      },
    });
  }

  if (s.mapId === "farm") {
    for (const c of s.chickens) {
      sprites.push({
        y: c.y,
        draw: () => {
          shadow(ctx, c.x, c.y, 5, 2);
          const frame = Math.floor(now * 4 + c.id) % 4;
          if (!blit(ctx, art.chicken, frame, c.x - 8, c.y - 14, 16, 16)) {
            ctx.fillStyle = "#fff8ea";
            ctx.beginPath();
            ctx.arc(c.x, c.y - 4, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
    }
  }

  for (const sl of rt.slimes) {
    sprites.push({
      y: sl.y,
      draw: () => {
        const squash = sl.hit > 0 ? 1.2 : 1;
        shadow(ctx, sl.x, sl.y, 6, 2);
        const frame = Math.floor(now * 6) % 4;
        if (!blit(ctx, art.slime, frame, sl.x - 9 * squash, sl.y - 14, 18 * squash, 16)) {
          ctx.fillStyle = "#3e6b46";
          ctx.beginPath();
          ctx.ellipse(sl.x, sl.y - 6, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  for (const d of s.drops) {
    if (d.mapId !== s.mapId) continue;
    sprites.push({
      y: d.y,
      draw: () => {
        blit(ctx, art.items, ITEMS_FRAME(d.item), d.x - 6, d.y - 12, 12, 12);
      },
    });
  }

  const pFrame = (rt.moving ? Math.floor(rt.step / 8) % 4 : 0) * 4 + s.dir;
  sprites.push({
    y: s.y,
    draw: () => {
      shadow(ctx, s.x, s.y, 7, 3);
      const blink = rt.iframes > 0 && Math.floor(rt.iframes * 16) % 2 === 0;
      if (!blink) {
        const ok = blit(ctx, art.player, pFrame, s.x - 12, s.y - 30, 24, 32);
        if (!ok) {
          ctx.fillStyle = "#f4e7c8";
          ctx.fillRect(s.x - 5, s.y - 20, 10, 12);
          ctx.fillStyle = "#3e6b46";
          ctx.fillRect(s.x - 6, s.y - 10, 12, 8);
        }
      }
    },
  });

  sprites.sort((a, b) => a.y - b.y);
  for (const sp of sprites) sp.draw();

  if (!rt.panel) {
    const tx = Math.floor(s.x / TILE) + DX[s.dir];
    const ty = Math.floor(s.y / TILE) + DY[s.dir];
    ctx.strokeStyle = "rgba(224,162,59,0.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);
  }
  if (rt.path) {
    ctx.fillStyle = "rgba(224,162,59,0.85)";
    for (const p of rt.path) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const p of rt.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.font = "bold 8px Nunito, sans-serif";
  ctx.textAlign = "center";
  for (const f of rt.floats) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff8ea";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  for (const id of ["marrow", "lila", "bram", "nia"] as const) {
    const a = npcAnchor(s, id);
    if (a.mapId !== s.mapId) continue;
    const x = (a.tx + 0.5) * TILE;
    const y = (a.ty + 0.85) * TILE;
    if (Math.hypot(x - s.x, y - s.y) < 52) {
      const label = id === "marrow" ? "Marrow" : id === "lila" ? "Lila" : id === "bram" ? "Bram" : "Nia";
      ctx.strokeStyle = "#fff8ea";
      ctx.lineWidth = 2;
      ctx.strokeText(label, x, y - 32);
      ctx.fillStyle = "#241910";
      ctx.fillText(label, x, y - 32);
    }
  }

  ctx.restore();

  const outdoor = !indoor;
  let dark = 0;
  if (s.mapId.startsWith("mine")) dark = 0.72;
  else if (outdoor) {
    const dusk = 11 * 60;
    const night = 14 * 60;
    if (s.minutes >= night) dark = 0.58;
    else if (s.minutes > dusk) dark = ((s.minutes - dusk) / (night - dusk)) * 0.58;
    if (s.weather === "rain") dark = Math.min(0.72, dark + 0.08);
  }
  if (dark > 0.02) {
    ctx.fillStyle = `rgba(12,16,28,${dark})`;
    ctx.fillRect(0, 0, cssW, cssH);
    const sx = (s.x - camX) * zoom;
    const sy = (s.y - camY) * zoom;
    const rad = (s.mapId.startsWith("mine") ? 78 : 130) * zoom;
    const g = ctx.createRadialGradient(sx, sy - 10, rad * 0.15, sx, sy - 10, rad);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy - 10, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  if (outdoor && s.weather !== "sun" && !rt.reduce) {
    ctx.save();
    const n = 48;
    for (let i = 0; i < n; i++) {
      const speed = s.weather === "snow" ? 18 : 90;
      const y = ((now * speed + i * 37) % (cssH + 20)) - 10;
      const x = (i * 53 + (s.weather === "rain" ? now * 40 : 0)) % cssW;
      ctx.fillStyle = s.weather === "snow" ? "rgba(255,248,234,0.85)" : "rgba(180,210,230,0.45)";
      if (s.weather === "snow") ctx.fillRect(x, y, 3, 3);
      else ctx.fillRect(x, y, 2, 10);
    }
    ctx.restore();
  }

  const fish = rt.fish;
  if (fish && (fish.phase === "play" || fish.phase === "bite" || fish.phase === "wait")) {
    const bw = Math.min(220, cssW * 0.55);
    const bh = 120;
    const bx = (cssW - bw) / 2;
    const by = cssH * 0.36;
    ctx.fillStyle = "rgba(36,25,16,0.78)";
    roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    if (fish.phase === "play") {
      const trackX = bx + bw * 0.38;
      const trackY = by + 16;
      const trackH = bh - 32;
      ctx.fillStyle = "#e4d0a4";
      ctx.fillRect(trackX, trackY, 18, trackH);
      const zone = trackY + fish.barY * trackH;
      ctx.fillStyle = "#3e6b46";
      ctx.fillRect(trackX, zone, 18, trackH * 0.22);
      ctx.fillStyle = "#c4653a";
      ctx.beginPath();
      ctx.arc(trackX + 9, trackY + fish.fishY * trackH, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8ea";
      ctx.fillRect(bx + 28, by + bh - 22, (bw - 56) * fish.catch, 6);
    }
  }
  void dt;
}

function ITEMS_FRAME(id: string) {
  const table: Record<string, number> = {
    pip: 6,
    tomato: 7,
    sunmote: 8,
    snowpea: 9,
    wood: 10,
    stone: 11,
    copper: 12,
    fiber: 13,
    moonberry: 14,
    mushroom: 15,
    blossom: 16,
    carp: 17,
    trout: 17,
    eel: 17,
    egg: 18,
    geode: 19,
    "pip-seed": 6,
    "tomato-seed": 7,
    "sunmote-seed": 8,
    "snowpea-seed": 9,
  };
  return table[id] ?? 10;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
