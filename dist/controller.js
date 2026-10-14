export function stickAxes(x = 0, y = 0, deadzone = .18) {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= deadzone) return { x: 0, y: 0 };
  const strength = Math.min(1, (length - deadzone) / (1 - deadzone));
  return { x: x / length * strength, y: y / length * strength };
}

export class ControllerInput {
  constructor() { this.previous = new Set(); this.id = null; this.nextNavigation = 0; this.lastNavigation = ''; }
  poll(pads, time = 0) {
    const pad = Array.from(pads ?? []).find(p => p?.connected !== false && p && (p.mapping === 'standard' || p.axes?.length >= 4));
    if (!pad) { this.previous.clear(); this.id = null; this.lastNavigation = ''; return { connected: false, pressed: new Set(), held: new Set(), move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, navX: 0, navY: 0 }; }
    if (this.id !== pad.id) this.previous.clear();
    this.id = pad.id;
    const held = new Set(); pad.buttons.forEach((b, i) => { if (b.pressed || b.value > .5) held.add(i); });
    const pressed = new Set([...held].filter(i => !this.previous.has(i))); this.previous = held;
    const move = stickAxes(pad.axes[0], pad.axes[1]), look = stickAxes(pad.axes[2], pad.axes[3]);
    const x = held.has(14) ? -1 : held.has(15) ? 1 : Math.abs(move.x) > .55 ? Math.sign(move.x) : 0;
    const y = held.has(12) ? -1 : held.has(13) ? 1 : Math.abs(move.y) > .55 ? Math.sign(move.y) : 0;
    const direction = `${x},${y}`, navigate = (x || y) && (direction !== this.lastNavigation || time >= this.nextNavigation);
    if (navigate) this.nextNavigation = time + .25;
    this.lastNavigation = direction;
    return { connected: true, pressed, held, move, look, navX: navigate ? x : 0, navY: navigate ? y : 0 };
  }
}
