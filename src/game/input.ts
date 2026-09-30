const real = new Set<string>();
let probe: Set<string> | null = null;
const prev = new Set<string>();
const clicks: { x: number; y: number }[] = [];
const prevGp = new Array(16).fill(false);

export const pad = {
  mx: 0,
  my: 0,
  useHeld: false,
  useEdge: false,
  interactEdge: false,
  bagEdge: false,
  journalEdge: false,
  pauseEdge: false,
  eatEdge: false,
};

const GAME = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
  "KeyI",
  "KeyK",
  "KeyF",
  "KeyJ",
  "Escape",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
]);

function typingTarget() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function attachInput() {
  const down = (e: KeyboardEvent) => {
    if (typingTarget()) return;
    real.add(e.code);
    if (GAME.has(e.code)) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => real.delete(e.code);
  const blur = () => real.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", blur);
  };
}

export function setProbeKeys(codes: string[]) {
  probe = codes.length ? new Set(codes) : null;
}

export function pushClick(x: number, y: number) {
  clicks.push({ x, y });
}

export interface InputFrame {
  mx: number;
  my: number;
  useHeld: boolean;
  useEdge: boolean;
  interactEdge: boolean;
  bagEdge: boolean;
  journalEdge: boolean;
  pauseEdge: boolean;
  eatEdge: boolean;
  tool: number | null;
  click: { x: number; y: number } | null;
}

function pressed(keys: Set<string>, code: string) {
  return keys.has(code) && !prev.has(code);
}

function radial(x: number, y: number) {
  const m = Math.hypot(x, y);
  if (m < 0.18) return { x: 0, y: 0 };
  const k = (m - 0.18) / (0.82 * m);
  return { x: x * k, y: y * k };
}

export function readInput(): InputFrame {
  const keys = probe ?? real;
  let mx = pad.mx;
  let my = pad.my;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;

  const gp = navigator.getGamepads?.()[0];
  let gUse = false;
  let gInteract = false;
  let gPause = false;
  let gBag = false;
  if (gp) {
    const stick = radial(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
    mx += stick.x;
    my += stick.y;
    gUse = !!gp.buttons[0]?.pressed;
    gInteract = !!gp.buttons[1]?.pressed;
    gBag = !!gp.buttons[2]?.pressed;
    gPause = !!gp.buttons[9]?.pressed;
    if (gp.buttons[12]?.pressed) my -= 1;
    if (gp.buttons[13]?.pressed) my += 1;
    if (gp.buttons[14]?.pressed) mx -= 1;
    if (gp.buttons[15]?.pressed) mx += 1;
  }
  const mag = Math.hypot(mx, my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }

  let tool: number | null = null;
  for (let i = 0; i < 6; i++) if (pressed(keys, `Digit${i + 1}`)) tool = i;

  const frame: InputFrame = {
    mx,
    my,
    useHeld: pad.useHeld || keys.has("Space") || keys.has("KeyJ") || gUse,
    useEdge: pad.useEdge || pressed(keys, "Space") || pressed(keys, "KeyJ") || (gUse && !prevGp[0]),
    interactEdge: pad.interactEdge || pressed(keys, "KeyE") || pressed(keys, "Enter") || (gInteract && !prevGp[1]),
    bagEdge: pad.bagEdge || pressed(keys, "KeyI") || (gBag && !prevGp[2]),
    journalEdge: pad.journalEdge || pressed(keys, "KeyK"),
    pauseEdge: pad.pauseEdge || pressed(keys, "Escape") || (gPause && !prevGp[9]),
    eatEdge: pad.eatEdge || pressed(keys, "KeyF"),
    tool,
    click: clicks.shift() ?? null,
  };
  pad.useEdge = false;
  pad.interactEdge = false;
  pad.bagEdge = false;
  pad.journalEdge = false;
  pad.pauseEdge = false;
  pad.eatEdge = false;
  prev.clear();
  for (const k of keys) prev.add(k);
  if (gp) {
    for (let i = 0; i < prevGp.length; i++) prevGp[i] = !!gp.buttons[i]?.pressed;
  }
  return frame;
}
