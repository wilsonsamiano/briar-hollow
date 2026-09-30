export const settings = { music: 0.45, sfx: 0.7 };

const SET = "briar-hollow-settings";
let ctx: AudioContext | null = null;
let musicOn = true;

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SET) || "") as { music?: number; sfx?: number };
    if (typeof raw.music === "number") settings.music = raw.music;
    if (typeof raw.sfx === "number") settings.sfx = raw.sfx;
  } catch {
    /* defaults */
  }
}

export function persistSettings() {
  try {
    localStorage.setItem(SET, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  if (!ctx || settings.sfx <= 0 || gain <= 0) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain * settings.sfx, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(name: string) {
  unlockAudio();
  if (name === "hoe") tone(140, 0.08, "triangle", 0.08);
  else if (name === "water") tone(520, 0.09, "sine", 0.05);
  else if (name === "chop") {
    tone(90, 0.1, "square", 0.06);
    tone(180, 0.06, "triangle", 0.04);
  }
  else if (name === "coin") {
    tone(660, 0.08, "square", 0.04);
    tone(880, 0.1, "square", 0.04, 0.07);
  }
  else if (name === "harvest") {
    tone(523, 0.08, "triangle", 0.05);
    tone(659, 0.1, "triangle", 0.05, 0.06);
  }
  else if (name === "talk") tone(440, 0.05, "sine", 0.04);
  else if (name === "hurt") tone(110, 0.14, "sawtooth", 0.05);
  else if (name === "bite") tone(880, 0.07, "square", 0.06);
  else if (name === "catch") {
    tone(392, 0.08, "triangle", 0.05);
    tone(523, 0.12, "triangle", 0.05, 0.08);
  }
  else if (name === "day") {
    tone(262, 0.12, "triangle", 0.05);
    tone(330, 0.14, "triangle", 0.05, 0.1);
    tone(392, 0.18, "triangle", 0.05, 0.2);
  }
  else if (name === "deny") tone(180, 0.08, "square", 0.03);
  else if (name === "plant") tone(360, 0.07, "sine", 0.04);
}

const NOTES = [196, 220, 247, 294, 330, 294, 247, 220, 247, 330];

export function musicTick(dt: number, playing: boolean, noteT: { t: number; i: number }) {
  if (!playing || settings.music <= 0 || !ctx) return;
  noteT.t -= dt;
  if (noteT.t > 0) return;
  noteT.t = 0.62;
  const freq = NOTES[noteT.i % NOTES.length];
  noteT.i++;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.018 * settings.music, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.48);
  musicOn = true;
  void musicOn;
}
