import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  BookOpen,
  Coins,
  Menu,
  X,
} from "lucide-react";
import { art, loadArt, onArt } from "@/game/assets";
import {
  clockLabel,
  dialoguePages,
  hintFor,
  hourOf,
  ITEMS,
  LETTER,
  NPC_META,
  questView,
  SEASONS,
  TOOL_INFO,
  TOOLS,
  type GameState,
  type ItemId,
  type NpcId,
  type Panel,
  type Runtime,
  type ToolId,
} from "@/game/data";
import { draw } from "@/game/draw";
import {
  advanceTalk,
  buyChicken,
  buyCoop,
  buyItem,
  createNewGame,
  dismissMill,
  dismissSummary,
  eatIndex,
  freshRuntime,
  offerGift,
  sellSlot,
  setPanel,
  shipSlot,
  sleep,
  tick,
  toast,
  unship,
  upgradeTools,
} from "@/game/engine";
import { attachInput, pad, pushClick, readInput, setProbeKeys } from "@/game/input";
import { downloadSave, eraseSave, hasSave, loadRaw, normalize, saveGame } from "@/game/save";
import { loadSettings, musicTick, persistSettings, resumeAudio, settings, sfx, unlockAudio } from "@/game/sound";

interface Snap {
  name: string;
  clock: string;
  date: string;
  year: number;
  weather: GameState["weather"];
  gold: number;
  energy: number;
  maxEnergy: number;
  hint: string;
  mapName: string;
  sel: GameState["sel"];
  inv: GameState["inv"];
  shipping: GameState["shipping"];
  panel: Panel | null;
  fishPhase: string | null;
  fishCatch: number;
  fishLabel: string;
  toasts: string[];
  hasCoop: boolean;
  chickens: number;
  coopEggs: number;
  toolTier: number;
  hearts: Record<string, number>;
  gifted: Record<string, boolean>;
  flags: GameState["flags"];
  season: number;
  stats: GameState["stats"];
  minutes: number;
}

const emptySnap: Snap = {
  name: "",
  clock: "",
  date: "",
  year: 1,
  weather: "sun",
  gold: 0,
  energy: 100,
  maxEnergy: 100,
  hint: "",
  mapName: "",
  sel: { kind: "tool", tool: "hoe" },
  inv: [],
  shipping: [],
  panel: null,
  fishPhase: null,
  fishCatch: 0,
  fishLabel: "",
  toasts: [],
  hasCoop: false,
  chickens: 0,
  coopEggs: 0,
  toolTier: 0,
  hearts: {},
  gifted: {},
  flags: { letterRead: false, shippedCrop: false, giftedBram: false, giftedLila: false, millOn: false },
  season: 0,
  stats: { harvests: 0, fish: 0, earned: 0 },
  minutes: 0,
};

function takeSnap(s: GameState, rt: Runtime): Snap {
  return {
    name: s.name,
    clock: clockLabel(s.minutes),
    date: `${SEASONS[s.season]} ${s.day}`,
    year: s.year,
    weather: s.weather,
    gold: s.gold,
    energy: s.energy,
    maxEnergy: s.maxEnergy,
    hint: hintFor(s),
    mapName: s.mapId.startsWith("mine") ? `Fen Shaft ${s.mapId.slice(5)}` : s.mapId === "farm" ? "Bramble Fen" : s.mapId === "town" ? "Hollow Cross" : s.mapId === "woods" ? "East Woods" : s.mapId === "house" ? "Cottage" : "Marrow's",
    sel: s.sel.kind === "item" ? { ...s.sel } : { ...s.sel },
    inv: s.inv.map((sl) => (sl ? { ...sl } : null)),
    shipping: s.shipping.map((sl) => ({ ...sl })),
    panel: rt.panel ? { ...rt.panel } : null,
    fishPhase: rt.fish?.phase ?? null,
    fishCatch: rt.fish?.catch ?? 0,
    fishLabel: rt.fish?.label ?? "",
    toasts: rt.toasts.map((t) => t.text),
    hasCoop: s.hasCoop,
    chickens: s.chickens.length,
    coopEggs: s.coopEggs,
    toolTier: s.toolTier,
    hearts: { ...s.hearts },
    gifted: { ...s.gifted },
    flags: { ...s.flags },
    season: s.season,
    stats: { ...s.stats },
    minutes: s.minutes,
  };
}

function Icon({ frame }: { frame: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [rev, setRev] = useState(0);
  useEffect(() => onArt(() => setRev((n) => n + 1)), []);
  useEffect(() => {
    const c = ref.current;
    const sheet = art.items;
    if (!c) return;
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 64, 64);
    if (!sheet) return;
    const col = frame % sheet.cols;
    const row = Math.floor(frame / sheet.cols);
    const sw = sheet.canvas.width / sheet.cols;
    const sh = sheet.canvas.height / sheet.rows;
    ctx.drawImage(sheet.canvas, col * sw, row * sh, sw, sh, 6, 6, 52, 52);
  }, [frame, rev]);
  return <canvas ref={ref} className="size-8 shrink-0" aria-hidden />;
}

function Portrait({ id }: { id: NpcId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [rev, setRev] = useState(0);
  useEffect(() => onArt(() => setRev((n) => n + 1)), []);
  useEffect(() => {
    const c = ref.current;
    const img = art.npc[id];
    if (!c) return;
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 96, 96);
    if (img) ctx.drawImage(img, 8, 4, 80, 88);
  }, [id, rev]);
  return <canvas ref={ref} className="size-16 shrink-0 rounded-full bg-parchment-deep" aria-hidden />;
}

const COFFEE_URL = "https://buymeacoffee.com/wilsonsamiano";
const APK_URL =
  "https://github.com/wilsonsamiano/briar-hollow/releases/download/v0.1.0-beta/briar-hollow-0.1.0-beta.apk";

function Btn({
  children,
  onClick,
  tone = "moss",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "moss" | "honey" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const toneCls =
    tone === "honey" ? "bg-honey text-ink" : tone === "ghost" ? "bg-parchment-deep text-ink" : "bg-moss text-cream";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 rounded-full px-4 py-2 text-base font-bold ${toneCls} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Ext({ href, children, tone = "ghost" }: { href: string; children: React.ReactNode; tone?: "honey" | "ghost" }) {
  const toneCls = tone === "honey" ? "bg-honey text-ink" : "bg-parchment-deep text-ink";
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`inline-flex min-h-12 items-center rounded-full px-4 py-2 text-base font-bold ${toneCls}`}>
      {children}
    </a>
  );
}

function Hold({
  label,
  onDown,
}: {
  label: React.ReactNode;
  onDown: (down: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={typeof label === "string" ? label : "move"}
      className="grid size-12 place-items-center rounded-full border-2 border-line bg-parchment text-ink"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown(true);
      }}
      onPointerUp={() => onDown(false)}
      onPointerCancel={() => onDown(false)}
      onLostPointerCapture={() => onDown(false)}
    >
      {label}
    </button>
  );
}

export function BriarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rtRef = useRef<Runtime>(freshRuntime());
  const modeRef = useRef<"title" | "play">("title");
  const noteRef = useRef({ t: 0, i: 0 });
  const [mode, setMode] = useState<"title" | "play">("title");
  const [snap, setSnap] = useState<Snap>(emptySnap);
  const [name, setName] = useState("Rowan");
  const [saveReady, setSaveReady] = useState(false);
  const [continueOk, setContinueOk] = useState(false);
  const [titleArt, setTitleArt] = useState(true);
  const [confirmErase, setConfirmErase] = useState(false);
  const [music, setMusic] = useState(0.45);
  const [sfxVol, setSfxVol] = useState(0.7);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirs = useRef(new Set<string>());

  const sync = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    setSnap(takeSnap(s, rtRef.current));
  }, []);

  const boot = useCallback(
    (s: GameState) => {
      unlockAudio();
      stateRef.current = s;
      const rt = freshRuntime();
      rt.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rt.toasts = [{ text: "WASD to move. Space uses a tool. E talks.", life: 6 }];
      rtRef.current = rt;
      modeRef.current = "play";
      setMode("play");
      saveGame(s);
      setContinueOk(true);
      sync();
    },
    [sync],
  );

  useEffect(() => {
    loadArt();
    loadSettings();
    setMusic(settings.music);
    setSfxVol(settings.sfx);
    setContinueOk(hasSave());
    setSaveReady(true);
    const detach = attachInput();
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastSync = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const s = stateRef.current;
      const rt = rtRef.current;
      if (canvas && modeRef.current === "play" && s) {
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.floor(cssW * dpr));
        const h = Math.max(1, Math.floor(cssH * dpr));
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        rt.cssW = cssW;
        rt.cssH = cssH;
        rt.zoom = cssW < 720 ? 2 : 3;
        const input = readInput();
        acc += dt;
        let steps = 0;
        let first = true;
        while (acc >= 1 / 60 && steps < 4) {
          tick(
            s,
            rt,
            first
              ? input
              : {
                  ...input,
                  useEdge: false,
                  interactEdge: false,
                  bagEdge: false,
                  journalEdge: false,
                  pauseEdge: false,
                  eatEdge: false,
                  tool: null,
                  click: null,
                },
            1 / 60,
          );
          first = false;
          acc -= 1 / 60;
          steps++;
        }
        const ctx = canvas.getContext("2d");
        if (ctx && cssW > 2) draw(ctx, s, rt, dt);
        musicTick(dt, true, noteRef.current);
        if (now - lastSync > 90) {
          lastSync = now;
          setSnap(takeSnap(s, rt));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.__controlsTest = {
      getYaw: () => {
        const st = stateRef.current;
        if (!st) return 0;
        return [Math.PI / 2, Math.PI, 0, -Math.PI / 2][st.dir] ?? 0;
      },
      getSpeed: () => rtRef.current.speed,
      getX: () => stateRef.current?.x ?? 0,
      getY: () => stateRef.current?.y ?? 0,
      setKeys: (codes: string[]) => setProbeKeys(codes),
      advanceDay: () => {
        const st = stateRef.current;
        if (!st) return;
        sleep(st, rtRef.current, false);
        setSnap(takeSnap(st, rtRef.current));
      },
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && stateRef.current) saveGame(stateRef.current);
      else resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      detach();
      document.removeEventListener("visibilitychange", onVis);
      delete window.__controlsTest;
    };
  }, []);

  function run(fn: (s: GameState, rt: Runtime) => void) {
    const s = stateRef.current;
    if (!s) return;
    fn(s, rtRef.current);
    sync();
  }

  function pointDir(dir: string, down: boolean) {
    if (down) dirs.current.add(dir);
    else dirs.current.delete(dir);
    pad.mx = (dirs.current.has("r") ? 1 : 0) - (dirs.current.has("l") ? 1 : 0);
    pad.my = (dirs.current.has("d") ? 1 : 0) - (dirs.current.has("u") ? 1 : 0);
  }

  const panel = snap.panel;
  const held = snap.sel.kind === "item" ? snap.inv[snap.sel.slot] : null;
  const fishLabel =
    snap.fishPhase === "bite" ? "Hook!" : snap.fishPhase === "play" ? "Hold to lift" : snap.fishPhase === "wait" ? "Waiting on a bite…" : snap.fishPhase === "caught" ? "Caught" : snap.fishPhase === "lost" ? "Lost it" : "Use";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink text-ink touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        onPointerDown={(e) => {
          if (modeRef.current !== "play" || rtRef.current.panel) return;
          const canvas = canvasRef.current;
          const s = stateRef.current;
          if (!canvas || !s) return;
          const rect = canvas.getBoundingClientRect();
          const rt = rtRef.current;
          const wx = (e.clientX - rect.left) / rt.zoom + rt.camX;
          const wy = (e.clientY - rect.top) / rt.zoom + rt.camY;
          pushClick(wx, wy);
        }}
      />

      {mode === "play" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="pointer-events-auto max-w-[70%] rounded-panel border-2 border-line bg-parchment px-3 py-2 text-ink shadow-lg">
              <h1 className="font-display text-lg leading-tight">
                {snap.date}
                <span className="ml-2 text-sm font-sans font-bold text-muted">Year {snap.year}</span>
              </h1>
              <p className="tabular-nums text-sm font-bold">
                {snap.clock}
                <span className="ml-2 font-sans text-muted">
                  {snap.weather === "rain" ? "Rain" : snap.weather === "snow" ? "Snow" : "Clear"}
                </span>
              </p>
              <p className="text-xs text-muted">{snap.mapName}</p>
              <div className="mt-1 h-2.5 w-32 overflow-hidden rounded-full bg-parchment-deep" aria-label={`Energy ${Math.round(snap.energy)}`}>
                <div className="h-full bg-honey" style={{ width: `${Math.max(0, Math.min(100, (snap.energy / snap.maxEnergy) * 100))}%` }} />
              </div>
            </div>
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 rounded-full border-2 border-line bg-parchment px-3 py-1 text-ink">
                <Coins className="size-4" aria-hidden />
                <span className="tabular-nums text-lg font-bold">{snap.gold}</span>
              </div>
              <button type="button" className="grid size-12 place-items-center rounded-full border-2 border-line bg-parchment text-ink" onClick={() => run((s, rt) => setPanel(rt, rt.panel?.t === "quests" ? null : { t: "quests" }))} aria-label="Journal">
                <BookOpen className="size-5" />
              </button>
              <button type="button" className="grid size-12 place-items-center rounded-full border-2 border-line bg-parchment text-ink" onClick={() => run((s, rt) => setPanel(rt, { t: "pause" }))} aria-label="Menu">
                <Menu className="size-5" />
              </button>
            </div>
          </div>

          <p className="pointer-events-none mx-auto max-w-md rounded-full bg-ink/80 px-3 py-1 text-center text-sm text-cream">{snap.hint}</p>

          <div className="mt-auto flex flex-col gap-2 pb-3">
            {snap.toasts[0] && (
              <p aria-live="polite" className="mx-auto max-w-sm rounded-full bg-parchment px-3 py-1 text-center text-sm font-bold text-ink">
                {snap.toasts[0]}
              </p>
            )}
            {snap.fishPhase && (
              <div className="pointer-events-none mx-auto w-56 rounded-panel border-2 border-line bg-parchment px-3 py-2 text-center text-ink">
                <p className="font-display text-xl">{fishLabel}</p>
                {snap.fishPhase === "play" && (
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-parchment-deep">
                    <div className="h-full bg-moss" style={{ width: `${Math.round(snap.fishCatch * 100)}%` }} />
                  </div>
                )}
                <p className="text-xs text-muted">{snap.fishLabel}</p>
              </div>
            )}
            <div className="pointer-events-auto flex justify-center gap-1 px-2">
              {TOOLS.map((tool) => {
                const active = snap.sel.kind === "tool" && snap.sel.tool === tool;
                return (
                  <button
                    key={tool}
                    type="button"
                    aria-label={TOOL_INFO[tool].name}
                    onClick={() => run((s) => { s.sel = { kind: "tool", tool }; })}
                    className={`grid size-12 place-items-center rounded-2xl border-2 bg-parchment ${active ? "border-honey" : "border-line"}`}
                  >
                    <Icon frame={TOOL_INFO[tool].frame} />
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-auto flex justify-center gap-1 overflow-x-auto px-2">
              {snap.inv.map((sl, i) =>
                sl ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => run((s) => { s.sel = { kind: "item", slot: i }; })}
                    className={`flex h-12 items-center gap-1 rounded-2xl border-2 bg-parchment px-1 ${snap.sel.kind === "item" && snap.sel.slot === i ? "border-honey" : "border-line"}`}
                  >
                    <Icon frame={ITEMS[sl.id].frame} />
                    <span className="tabular-nums text-xs font-bold">{sl.count}</span>
                  </button>
                ) : null,
              )}
            </div>
            <div className="pointer-events-auto flex items-end justify-between px-3">
              <div className="grid w-36 grid-cols-3 gap-1">
                <span />
                <Hold label={<ArrowUp className="size-5" />} onDown={(d) => pointDir("u", d)} />
                <span />
                <Hold label={<ArrowLeft className="size-5" />} onDown={(d) => pointDir("l", d)} />
                <span />
                <Hold label={<ArrowRight className="size-5" />} onDown={(d) => pointDir("r", d)} />
                <span />
                <Hold label={<ArrowDown className="size-5" />} onDown={(d) => pointDir("d", d)} />
                <span />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="min-h-12 min-w-20 rounded-full bg-moss px-4 font-bold text-cream"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    pad.useHeld = true;
                    pad.useEdge = true;
                  }}
                  onPointerUp={() => { pad.useHeld = false; }}
                  onPointerCancel={() => { pad.useHeld = false; }}
                >
                  {snap.fishPhase === "bite" ? "Hook" : snap.fishPhase === "play" ? "Lift" : "Use"}
                </button>
                <button type="button" className="min-h-12 rounded-full bg-honey px-4 font-bold text-ink" onClick={() => { pad.interactEdge = true; }}>
                  Talk
                </button>
                <button type="button" className="grid size-12 place-items-center rounded-full border-2 border-line bg-parchment" aria-label="Pack" onClick={() => run((s, rt) => setPanel(rt, rt.panel?.t === "inventory" ? null : { t: "inventory" }))}>
                  <Backpack className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "play" && panel && panel.t !== "fish" && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-ink/50 p-3 sm:items-center">
          <section className="max-h-full w-full max-w-md overflow-y-auto rounded-panel border-2 border-line bg-parchment p-4 text-ink shadow-xl">
            {panel.t === "letter" && (
              <>
                <h2 className="font-display text-2xl">From Aunt Bramble</h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">{LETTER}</p>
                <div className="mt-4 flex justify-end">
                  <Btn onClick={() => run((s, rt) => { s.flags.letterRead = true; setPanel(rt, null); })}>Fold it away</Btn>
                </div>
              </>
            )}
            {panel.t === "sleep" && (
              <>
                <h2 className="font-display text-2xl">Sleep until morning?</h2>
                <p className="mt-2 text-muted">The day pauses. Shipping sells, crops grow, and you wake at six.</p>
                <div className="mt-4 flex gap-2">
                  <Btn onClick={() => run((s, rt) => sleep(s, rt, false))}>Sleep</Btn>
                  <Btn tone="ghost" onClick={() => run((s, rt) => setPanel(rt, null))}>Not yet</Btn>
                </div>
              </>
            )}
            {panel.t === "summary" && (
              <>
                <h2 className="font-display text-2xl">{panel.passedOut ? "You collapsed" : "A new morning"}</h2>
                <p className="mt-1 tabular-nums font-bold">{panel.earned > 0 ? `+${panel.earned}g shipped` : "Nothing shipped."}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {panel.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end">
                  <Btn onClick={() => run((s, rt) => dismissSummary(rt))}>Wake up</Btn>
                </div>
              </>
            )}
            {panel.t === "mill" && (
              <>
                <h2 className="font-display text-2xl">The wheel turns</h2>
                <p className="mt-3 leading-relaxed">
                  Nia fitted the axle at dusk. Water takes the paddles, and the old mill in Hollow Cross breathes again. Each morning it leaves a packet of seed and a little gold.
                </p>
                <div className="mt-4 flex justify-end">
                  <Btn onClick={() => run((s, rt) => dismissMill(s, rt))}>Listen to it</Btn>
                </div>
              </>
            )}
            {panel.t === "quests" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">Journal</h2>
                  <button type="button" aria-label="Close" onClick={() => run((s, rt) => setPanel(rt, null))}><X /></button>
                </div>
                <ul className="mt-3 space-y-3">
                  {questView(snap.flags).map((q) => (
                    <li key={q.title}>
                      <p className="font-bold">{q.done ? "Done" : "Open"} · {q.title}</p>
                      <p className="text-sm text-muted">{q.detail}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  {snap.flags.millOn ? "The mill is awake." : "Wake the mill with all three favors."}
                </p>
              </>
            )}
            {panel.t === "inventory" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">Pack</h2>
                  <button type="button" aria-label="Close" onClick={() => run((s, rt) => setPanel(rt, null))}><X /></button>
                </div>
                <ul className="mt-3 space-y-2">
                  {snap.inv.map((sl, i) =>
                    sl ? (
                      <li key={i} className="flex items-center gap-2">
                        <Icon frame={ITEMS[sl.id].frame} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{ITEMS[sl.id].name}</p>
                          <p className="text-xs text-muted">{ITEMS[sl.id].desc}</p>
                        </div>
                        <span className="tabular-nums font-bold">{sl.count}</span>
                        {ITEMS[sl.id].energy ? (
                          <Btn tone="honey" onClick={() => run((s, rt) => eatIndex(s, rt, i))}>Eat</Btn>
                        ) : null}
                        <Btn tone="ghost" onClick={() => run((s) => { s.sel = { kind: "item", slot: i }; })}>Hold</Btn>
                      </li>
                    ) : null,
                  )}
                </ul>
                {snap.inv.every((sl) => !sl) && <p className="mt-3 text-muted">Empty, except the tools on your belt.</p>}
              </>
            )}
            {panel.t === "shop" && (
              <ShopPanel
                snap={snap}
                onClose={() => run((s, rt) => setPanel(rt, null))}
                onTab={(tab) => run((s, rt) => { if (rt.panel?.t === "shop") rt.panel = { t: "shop", tab }; })}
                onBuy={(id, n) => run((s, rt) => buyItem(s, rt, id, n))}
                onSell={(i) => run((s, rt) => sellSlot(s, rt, i))}
                onChicken={() => run((s, rt) => buyChicken(s, rt))}
              />
            )}
            {panel.t === "ship" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">Shipping bin</h2>
                  <button type="button" aria-label="Close" onClick={() => run((s, rt) => setPanel(rt, null))}><X /></button>
                </div>
                <p className="text-sm text-muted">Paid when you sleep. Tap to move a stack.</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-bold">Pack</p>
                    {snap.inv.map((sl, i) => sl && (
                      <button key={i} type="button" className="mt-1 flex w-full items-center gap-1 rounded-xl bg-parchment-deep px-2 py-1 text-left" onClick={() => run((s) => shipSlot(s, i))}>
                        <Icon frame={ITEMS[sl.id].frame} />
                        <span className="text-sm">{sl.count} {ITEMS[sl.id].name}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="font-bold">Bin</p>
                    {snap.shipping.map((sl, i) => (
                      <button key={`${sl.id}-${i}`} type="button" className="mt-1 flex w-full items-center gap-1 rounded-xl bg-parchment-deep px-2 py-1 text-left" onClick={() => run((s) => unship(s, i))}>
                        <Icon frame={ITEMS[sl.id].frame} />
                        <span className="text-sm">{sl.count} · {ITEMS[sl.id].sell * sl.count}g</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {panel.t === "dialogue" && (
              <Dialogue
                snap={snap}
                npc={panel.npc}
                page={panel.page}
                heldName={held ? ITEMS[held.id].name : null}
                onAdvance={(pages) => run((s, rt) => advanceTalk(rt, pages))}
                onClose={() => run((s, rt) => setPanel(rt, null))}
                onGift={() => run((s, rt) => offerGift(s, rt))}
                onShop={() => run((s, rt) => setPanel(rt, { t: "shop", tab: "buy" }))}
                onUpgrade={() => run((s, rt) => upgradeTools(s, rt))}
                onCoop={() => run((s, rt) => buyCoop(s, rt))}
              />
            )}
            {panel.t === "pause" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">Paused</h2>
                  <button type="button" aria-label="Close" onClick={() => run((s, rt) => setPanel(rt, null))}><X /></button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  WASD or the pad moves. Tap a nearby tile to use your tool, or a far tile to walk. Space uses the tool you selected. E talks, shops, fishes a conversation, and sleeps at the bed. 1–6 pick tools. Menus pause the clock. Pass out at 2 AM and you lose a little gold.
                </p>
                <p className="mt-2 text-sm tabular-nums">Harvests {snap.stats.harvests} · Fish {snap.stats.fish} · Earned {snap.stats.earned}g</p>
                <label className="mt-3 block text-sm font-bold">
                  Music
                  <input className="mt-1 w-full" type="range" min={0} max={1} step={0.05} value={music} onChange={(e) => { const v = Number(e.target.value); settings.music = v; setMusic(v); persistSettings(); }} />
                </label>
                <label className="mt-2 block text-sm font-bold">
                  Effects
                  <input className="mt-1 w-full" type="range" min={0} max={1} step={0.05} value={sfxVol} onChange={(e) => { const v = Number(e.target.value); settings.sfx = v; setSfxVol(v); persistSettings(); sfx("talk"); }} />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn onClick={() => run((s, rt) => { saveGame(s); toast(rt, "Saved."); setPanel(rt, null); })}>Save</Btn>
                  <Btn tone="ghost" onClick={() => stateRef.current && downloadSave(stateRef.current)}>Export</Btn>
                  <Btn tone="ghost" onClick={() => fileRef.current?.click()}>Import</Btn>
                  <Btn tone="honey" onClick={() => { if (stateRef.current) saveGame(stateRef.current); modeRef.current = "title"; setMode("title"); }}>Title</Btn>
                  {confirmErase ? (
                    <Btn tone="ghost" onClick={() => { eraseSave(); setContinueOk(false); setConfirmErase(false); modeRef.current = "title"; setMode("title"); }}>Confirm erase</Btn>
                  ) : (
                    <Btn tone="ghost" onClick={() => setConfirmErase(true)}>Erase save</Btn>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Ext href={COFFEE_URL} tone="honey">Buy me a coffee</Ext>
                  <Ext href={APK_URL}>Android beta</Ext>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void file.text().then((text) => {
                      try {
                        const next = normalize(JSON.parse(text) as unknown, createNewGame(name || "Rowan"));
                        if (!next) throw new Error("bad");
                        stateRef.current = next;
                        saveGame(next);
                        toast(rtRef.current, "Save brought in.");
                        sync();
                      } catch {
                        toast(rtRef.current, "That file wasn't a Briar Hollow save.");
                        sync();
                      }
                    });
                  }}
                />
              </>
            )}
          </section>
        </div>
      )}

      {mode === "title" && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-ink">
          {titleArt && (
            <img src="/game/title.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setTitleArt(false)} />
          )}
          <div className="absolute inset-0 bg-ink/45" />
          <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-end p-4 sm:justify-center">
            <form
              className="rounded-panel border-2 border-line bg-parchment p-5 text-ink shadow-xl"
              onSubmit={(e) => {
                e.preventDefault();
                boot(createNewGame(name.trim() || "Rowan"));
              }}
            >
              <p className="text-sm font-bold tracking-wide text-moss">A fen farm</p>
              <h1 className="font-display text-4xl leading-none">Briar Hollow</h1>
              <p className="mt-2 text-base leading-relaxed">Till a sour field, trade with the crossroads, and wake a mill that forgot how to turn.</p>
              <label className="mt-4 block text-sm font-bold" htmlFor="farmer-name">
                Your name
                <input
                  id="farmer-name"
                  value={name}
                  maxLength={12}
                  autoComplete="off"
                  suppressHydrationWarning
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-line bg-cream px-3 py-2 text-base text-ink select-text"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn type="submit">Start</Btn>
                {saveReady && continueOk && (
                  <Btn
                    tone="honey"
                    onClick={() => {
                      const next = normalize(loadRaw(), createNewGame(name.trim() || "Rowan"));
                      if (next) boot(next);
                    }}
                  >
                    Continue
                  </Btn>
                )}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer font-bold">How to play</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Move with WASD, arrows, or the pad. The bottom row is your tools — hoe, can, axe, pick, scythe, rod. Face a tile and press Use. Seeds must be selected from the pack before they plant. Sleep in the cottage to end the day. East is the woods, south is town, west of town is the mine.
                </p>
              </details>
              <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-line pt-4">
                <Ext href={COFFEE_URL} tone="honey">Buy me a coffee</Ext>
                <Ext href={APK_URL}>Android beta</Ext>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The beta APK sideloads on Android. Download it, open the file, and allow install from your browser if the phone asks.
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function ShopPanel({
  snap,
  onClose,
  onTab,
  onBuy,
  onSell,
  onChicken,
}: {
  snap: Snap;
  onClose: () => void;
  onTab: (tab: "buy" | "sell") => void;
  onBuy: (id: ItemId, n: number) => void;
  onSell: (index: number) => void;
  onChicken: () => void;
}) {
  const tab = snap.panel?.t === "shop" ? snap.panel.tab : "buy";
  const goods = (Object.keys(ITEMS) as ItemId[]).filter((id) => ITEMS[id].buy);
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Marrow's till</h2>
        <button type="button" aria-label="Close" onClick={onClose}><X /></button>
      </div>
      <div className="mt-2 flex gap-2">
        <Btn tone={tab === "buy" ? "moss" : "ghost"} onClick={() => onTab("buy")}>Buy</Btn>
        <Btn tone={tab === "sell" ? "moss" : "ghost"} onClick={() => onTab("sell")}>Sell</Btn>
      </div>
      {tab === "buy" ? (
        <ul className="mt-3 space-y-2">
          {goods.map((id) => {
            const def = ITEMS[id];
            const locked = def.season !== undefined && def.season !== snap.season;
            return (
              <li key={id} className="flex items-center gap-2">
                <Icon frame={def.frame} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{def.name}</p>
                  <p className="text-xs text-muted">{locked ? `Only in ${SEASONS[def.season ?? 0]}` : def.desc}</p>
                </div>
                <span className="tabular-nums text-sm font-bold">{def.buy}g</span>
                <Btn disabled={locked} onClick={() => onBuy(id, 1)}>1</Btn>
                <Btn disabled={locked} tone="ghost" onClick={() => onBuy(id, 5)}>5</Btn>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-2 pt-2">
            <p className="text-sm">Chicken · 250g · {snap.chickens}/4</p>
            <Btn disabled={!snap.hasCoop || snap.chickens >= 4} onClick={onChicken}>Buy</Btn>
          </li>
        </ul>
      ) : (
        <ul className="mt-3 space-y-2">
          {snap.inv.map((sl, i) => sl && (
            <li key={i} className="flex items-center gap-2">
              <Icon frame={ITEMS[sl.id].frame} />
              <p className="flex-1 font-bold">{sl.count} {ITEMS[sl.id].name}</p>
              <span className="tabular-nums text-sm">{ITEMS[sl.id].sell * sl.count}g</span>
              <Btn onClick={() => onSell(i)}>Sell</Btn>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Dialogue({
  snap,
  npc,
  page,
  heldName,
  onAdvance,
  onClose,
  onGift,
  onShop,
  onUpgrade,
  onCoop,
}: {
  snap: Snap;
  npc: NpcId;
  page: number;
  heldName: string | null;
  onAdvance: (pages: number) => void;
  onClose: () => void;
  onGift: () => void;
  onShop: () => void;
  onUpgrade: () => void;
  onCoop: () => void;
}) {
  const pages = dialoguePages(npc, {
    name: snap.name,
    weather: snap.weather,
    hearts: Math.floor((snap.hearts[npc] ?? 0) / 100),
    flags: snap.flags,
    season: snap.season,
  });
  const last = page >= pages.length - 1;
  const hearts = Math.floor((snap.hearts[npc] ?? 0) / 100);
  const hour = hourOf(snap.minutes);
  const shopOpen = npc === "marrow" && hour >= 8 && hour < 19;
  return (
    <>
      <div className="flex items-center gap-3">
        <Portrait id={npc} />
        <div>
          <h2 className="font-display text-2xl">{NPC_META[npc].name}</h2>
          <p className="text-sm text-muted">{NPC_META[npc].role}</p>
          <div className="mt-1 flex gap-1" aria-label={`${hearts} of 4 fondness`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`size-3 ${i < hearts ? "bg-honey" : "bg-parchment-deep"}`} />
            ))}
          </div>
        </div>
        <button type="button" className="ml-auto" aria-label="Close" onClick={onClose}><X /></button>
      </div>
      <button type="button" className="mt-3 w-full text-left text-base leading-relaxed" onClick={() => onAdvance(pages.length)}>
        {pages[page] ?? ""}
      </button>
      {last && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn tone="ghost" onClick={() => onAdvance(pages.length)}>Close</Btn>
          <Btn tone="honey" onClick={onGift}>{heldName ? `Offer ${heldName}` : "Offer held item"}</Btn>
          {shopOpen && <Btn onClick={onShop}>Shop</Btn>}
          {npc === "nia" && !snap.toolTier && <Btn onClick={onUpgrade}>Copper tools · 800g + 8 copper</Btn>}
          {npc === "nia" && !snap.hasCoop && <Btn onClick={onCoop}>Build coop · 400g + 20 wood</Btn>}
        </div>
      )}
    </>
  );
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys: (codes: string[]) => void;
      advanceDay?: () => void;
    };
  }
}
