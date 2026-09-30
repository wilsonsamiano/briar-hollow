const real = new Set<string>();
let probe: Set<string> | null = null;
const prev = new Set<string>();
const clicks: { x: number; y: number }[] = [];
const prevGp = new Array(20).fill(false);
let lastPadId = "";
let lastPadIndex = -1;

const navXState = { dir: 0, next: 0 };
const navYState = { dir: 0, next: 0 };

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
  /** Gamepad A. Menus use this; the world uses useEdge. */
  confirmEdge: boolean;
  /** Gamepad B. Closes menus and cancels a cast. */
  cancelEdge: boolean;
  /** Gamepad X only, so title-screen Continue is not triggered by Enter. */
  padInteractEdge: boolean;
  /** -1 LB, +1 RB. */
  toolDelta: number;
  /** Menu focus step this frame, from d-pad, stick, or arrows. */
  navX: number;
  navY: number;
  tool: number | null;
  click: { x: number; y: number } | null;
}

function pressed(keys: Set<string>, code: string) {
  return keys.has(code) && !prev.has(code);
}

function radial(x: number, y: number) {
  const m = Math.hypot(x, y);
  if (m < 0.18) return { x: 0, y: 0 };
  const scale = (m - 0.18) / (0.82 * m);
  return { x: x * scale, y: y * scale };
}

function padBusy(gp: Gamepad) {
  if (gp.buttons.some((b) => b.pressed || b.value > 0.2)) return true;
  return gp.axes.some((a) => Math.abs(a) > 0.25);
}

function activePad() {
  const list = navigator.getGamepads?.();
  if (!list) return null;
  let standard: Gamepad | null = null;
  let any: Gamepad | null = null;
  let live: Gamepad | null = null;
  for (const gp of list) {
    if (!gp || !gp.connected) continue;
    if (gp.mapping === "standard") {
      if (!standard) standard = gp;
      if (!live && padBusy(gp)) live = gp;
    } else if (!any) any = gp;
  }
  return live ?? standard ?? any;
}

function held(gp: Gamepad, index: number) {
  const b = gp.buttons[index];
  if (!b) return false;
  return b.pressed || b.value > 0.55;
}

function edge(down: boolean, index: number) {
  return down && !prevGp[index];
}

function axisDir(axis: number, neg: boolean, pos: boolean) {
  if (neg) return -1;
  if (pos) return 1;
  if (axis <= -0.55) return -1;
  if (axis >= 0.55) return 1;
  return 0;
}

function navPulse(dir: number, state: { dir: number; next: number }, now: number) {
  if (!dir) {
    state.dir = 0;
    state.next = 0;
    return 0;
  }
  if (dir !== state.dir || now >= state.next) {
    const first = state.dir !== dir;
    state.dir = dir;
    state.next = now + (first ? 280 : 220);
    return dir;
  }
  return 0;
}

export function gamepadConnected() {
  return lastPadId.length > 0;
}

export function gamepadLabel() {
  if (!lastPadId) return "";
  const cut = lastPadId.split("(")[0]?.trim() || lastPadId;
  return cut.slice(0, 42);
}

export function rumble(ms = 36, weak = 0.25, strong = 0.05) {
  const gp = activePad();
  const act = gp?.vibrationActuator;
  if (!act || typeof act.playEffect !== "function") return;
  try {
    const pending = act.playEffect("dual-rumble", {
      duration: ms,
      weakMagnitude: weak,
      strongMagnitude: strong,
    });
    void pending?.catch?.(() => {});
  } catch {
    /* this pad has no rumble */
  }
}

export function quietFrame(input: InputFrame): InputFrame {
  return {
    ...input,
    useEdge: false,
    interactEdge: false,
    bagEdge: false,
    journalEdge: false,
    pauseEdge: false,
    eatEdge: false,
    confirmEdge: false,
    cancelEdge: false,
    padInteractEdge: false,
    toolDelta: 0,
    navX: 0,
    navY: 0,
    tool: null,
    click: null,
  };
}

export function readInput(): InputFrame {
  const keys = probe ?? real;
  let mx = pad.mx;
  let my = pad.my;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;

  const gp = activePad();
  let gUse = false;
  let gUseEdge = false;
  let gInteract = false;
  let gBag = false;
  let gJournal = false;
  let gPause = false;
  let gEat = false;
  let gCancel = false;
  let toolDelta = 0;
  let stickX = 0;
  let stickY = 0;
  let dpadX = 0;
  let dpadY = 0;
  if (gp) {
    if (gp.index !== lastPadIndex) prevGp.fill(false);
    lastPadIndex = gp.index;
    lastPadId = gp.id || "Controller";
    const stick = radial(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
    stickX = stick.x;
    stickY = stick.y;
    mx += stick.x;
    my += stick.y;
    const up = held(gp, 12);
    const down = held(gp, 13);
    const left = held(gp, 14);
    const right = held(gp, 15);
    if (up) my -= 1;
    if (down) my += 1;
    if (left) mx -= 1;
    if (right) mx += 1;
    dpadX = left ? -1 : right ? 1 : 0;
    dpadY = up ? -1 : down ? 1 : 0;
    gUse = held(gp, 0) || held(gp, 7);
    gUseEdge = edge(held(gp, 0), 0) || edge(held(gp, 7), 7);
    gCancel = edge(held(gp, 1), 1);
    gInteract = edge(held(gp, 2), 2);
    gJournal = edge(held(gp, 3), 3);
    gBag = edge(held(gp, 8), 8);
    gPause = edge(held(gp, 9), 9);
    gEat = edge(held(gp, 6), 6);
    if (edge(held(gp, 5), 5)) toolDelta += 1;
    if (edge(held(gp, 4), 4)) toolDelta -= 1;
  } else {
    lastPadId = "";
    lastPadIndex = -1;
  }

  const mag = Math.hypot(mx, my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }

  let tool: number | null = null;
  for (let i = 0; i < 6; i++) if (pressed(keys, `Digit${i + 1}`)) tool = i;

  const now = performance.now();
  const keyNavX = pressed(keys, "ArrowRight") ? 1 : pressed(keys, "ArrowLeft") ? -1 : 0;
  const keyNavY = pressed(keys, "ArrowDown") ? 1 : pressed(keys, "ArrowUp") ? -1 : 0;
  const navX = navPulse(axisDir(stickX, dpadX < 0, dpadX > 0) || keyNavX, navXState, now);
  const navY = navPulse(axisDir(stickY, dpadY < 0, dpadY > 0) || keyNavY, navYState, now);

  const frame: InputFrame = {
    mx,
    my,
    useHeld: pad.useHeld || keys.has("Space") || keys.has("KeyJ") || gUse,
    useEdge: pad.useEdge || pressed(keys, "Space") || pressed(keys, "KeyJ") || gUseEdge,
    interactEdge: pad.interactEdge || pressed(keys, "KeyE") || pressed(keys, "Enter") || gInteract,
    bagEdge: pad.bagEdge || pressed(keys, "KeyI") || gBag,
    journalEdge: pad.journalEdge || pressed(keys, "KeyK") || gJournal,
    pauseEdge: pad.pauseEdge || pressed(keys, "Escape") || gPause,
    eatEdge: pad.eatEdge || pressed(keys, "KeyF") || gEat,
    confirmEdge: false,
    cancelEdge: gCancel,
    padInteractEdge: gInteract,
    toolDelta,
    navX,
    navY,
    tool,
    click: clicks.shift() ?? null,
  };
  // A is confirm. RT is only a second Use, not a menu confirm.
  frame.confirmEdge = !!gp && edge(held(gp, 0), 0);

  pad.useEdge = false;
  pad.interactEdge = false;
  pad.bagEdge = false;
  pad.journalEdge = false;
  pad.pauseEdge = false;
  pad.eatEdge = false;
  prev.clear();
  for (const k of keys) prev.add(k);
  if (gp) {
    for (let i = 0; i < prevGp.length; i++) prevGp[i] = held(gp, i);
  } else prevGp.fill(false);
  return frame;
}

function focusables(root: ParentNode) {
  const nodes = [...root.querySelectorAll<HTMLElement>("button, a[href], summary, input")];
  return nodes.filter((el) => {
    if (el.matches(":disabled")) return false;
    if (el instanceof HTMLInputElement && (el.type === "hidden" || el.type === "file")) return false;
    if (typeof el.checkVisibility === "function") return el.checkVisibility();
    return true;
  });
}

function ring(el: HTMLElement) {
  document.querySelectorAll(".pad-focus").forEach((n) => n.classList.remove("pad-focus"));
  el.classList.add("pad-focus");
  el.focus();
}

/** Move a honey ring through a menu and activate the focused control. */
export function steerMenu(root: HTMLElement, input: InputFrame) {
  const nodes = focusables(root);
  if (!nodes.length) return;
  const active = document.activeElement;
  let index = active instanceof HTMLElement ? nodes.indexOf(active) : -1;

  const ranged = index >= 0 && nodes[index] instanceof HTMLInputElement && (nodes[index] as HTMLInputElement).type === "range";
  if (ranged && input.navX) {
    const el = nodes[index] as HTMLInputElement;
    const step = Number(el.step) || 0.05;
    const min = Number(el.min);
    const max = Number(el.max);
    const raw = Number(el.value) + input.navX * step;
    const next = Math.round(Math.min(max, Math.max(min, raw)) * 100) / 100;
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    proto?.set?.call(el, String(next));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const step = ranged ? input.navY : input.navY || input.navX;
  if (step) {
    const next = index < 0 ? (step > 0 ? 0 : nodes.length - 1) : (index + step + nodes.length) % nodes.length;
    const el = nodes[next];
    if (el) {
      ring(el);
      index = next;
    }
  }

  if (!input.confirmEdge) return;
  const current = index >= 0 ? nodes[index] : null;
  const target =
    current && !(current instanceof HTMLInputElement && current.type !== "range")
      ? current
      : root.querySelector<HTMLElement>("[data-pad-primary]") ?? nodes.find((n) => n.tagName === "BUTTON") ?? null;
  if (!target || (target instanceof HTMLInputElement && target.type === "range")) return;
  if (document.activeElement !== target) ring(target);
  target.click();
}
