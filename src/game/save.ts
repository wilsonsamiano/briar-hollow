import { DAYS, ITEMS, type GameState, type ItemId, type Stack } from "./data";

const KEY = "briar-hollow-save";
const BAK = "briar-hollow-save-bak";

export function saveGame(s: GameState) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BAK, prev);
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function eraseSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BAK);
  } catch {
    /* ignore */
  }
}

function isItem(id: unknown): id is ItemId {
  return typeof id === "string" && id in ITEMS;
}

function stacks(raw: unknown, limit: number): Stack[] {
  if (!Array.isArray(raw)) return [];
  const out: Stack[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const count = (row as { count?: unknown }).count;
    if (!isItem(id) || typeof count !== "number" || count <= 0) continue;
    out.push({ id, count: Math.min(99, Math.floor(count)) });
    if (out.length >= limit) break;
  }
  return out;
}

export function normalize(raw: unknown, fresh: GameState): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GameState>;
  if (r.version !== 1 || typeof r.mapId !== "string") return null;
  const inv = Array.from({ length: 18 }, (_, i) => {
    const src = Array.isArray(r.inv) ? r.inv[i] : null;
    if (!src || typeof src !== "object") return null;
    const id = (src as Stack).id;
    const count = (src as Stack).count;
    if (!isItem(id) || typeof count !== "number" || count <= 0) return null;
    return { id, count: Math.min(99, Math.floor(count)) };
  });
  const season = typeof r.season === "number" ? Math.max(0, Math.min(3, r.season | 0)) : 0;
  return {
    ...fresh,
    name: typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 12) : fresh.name,
    year: typeof r.year === "number" ? r.year : 1,
    season,
    day: typeof r.day === "number" ? Math.max(1, Math.min(DAYS, r.day | 0)) : 1,
    minutes: typeof r.minutes === "number" ? r.minutes : 120,
    energy: typeof r.energy === "number" ? r.energy : 100,
    maxEnergy: typeof r.maxEnergy === "number" ? r.maxEnergy : 100,
    gold: typeof r.gold === "number" ? Math.max(0, r.gold | 0) : 0,
    mapId: r.mapId,
    x: typeof r.x === "number" ? r.x : fresh.x,
    y: typeof r.y === "number" ? r.y : fresh.y,
    dir: r.dir === 0 || r.dir === 1 || r.dir === 2 || r.dir === 3 ? r.dir : 0,
    sel: r.sel && r.sel.kind === "item" ? r.sel : r.sel && r.sel.kind === "tool" ? r.sel : fresh.sel,
    inv,
    soil: r.soil && typeof r.soil === "object" ? r.soil : {},
    objects: Array.isArray(r.objects) ? r.objects : fresh.objects,
    forage: Array.isArray(r.forage) ? r.forage : fresh.forage,
    chickens: Array.isArray(r.chickens) ? r.chickens : [],
    drops: Array.isArray(r.drops) ? r.drops : [],
    hasCoop: !!r.hasCoop,
    coopEggs: typeof r.coopEggs === "number" ? r.coopEggs : 0,
    toolTier: r.toolTier === 1 ? 1 : 0,
    hearts: r.hearts && typeof r.hearts === "object" ? r.hearts : {},
    talked: {},
    gifted: {},
    flags: { ...fresh.flags, ...(r.flags ?? {}) },
    weather: r.weather === "rain" || r.weather === "snow" || r.weather === "sun" ? r.weather : "sun",
    shipping: stacks(r.shipping, 24),
    cut: {},
    stats: {
      harvests: r.stats?.harvests ?? 0,
      fish: r.stats?.fish ?? 0,
      earned: r.stats?.earned ?? 0,
    },
  };
}

export function loadRaw(): unknown {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function downloadSave(s: GameState) {
  const blob = new Blob([JSON.stringify(s)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "briar-hollow.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
