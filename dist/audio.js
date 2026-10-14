export function musicBpm(status, progress = 0) {
  return status === 'lobby' ? 104 : 118 + 60 * Math.max(0, Math.min(1, progress));
}

// Original music and effects synthesized locally with Web Audio.
const midi = note => 440 * 2 ** ((note - 69) / 12);
export class GameAudio {
  constructor() { this.enabled = true; this.context = null; this.nextBeat = 0; this.beat = 0; this.lastAttack = 0; }
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { this.enabled = false; return; }
        this.context = new Ctx();
        this.master = this.context.createGain(); this.master.gain.value = .5; this.master.connect(this.context.destination);
        this.music = this.context.createGain(); this.music.gain.value = .1; this.music.connect(this.master);
        this.effects = this.context.createGain(); this.effects.gain.value = .24; this.effects.connect(this.master);
        this.noise = this.context.createBuffer(1, this.context.sampleRate * .25, this.context.sampleRate);
        const samples = this.noise.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        this.nextBeat = this.context.currentTime + .1;
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { this.enabled = false; }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.unlock();
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? .5 : 0, this.context.currentTime, .04);
    return this.enabled;
  }
  note(frequency, duration, volume, type = 'triangle', delay = 0, bus = this.effects, endFrequency) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context, start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.001, start); gain.gain.linearRampToValueAtTime(volume, start + .006); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(bus); oscillator.start(start); oscillator.stop(start + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  hiss(duration, volume, cutoff = 2500, delay = 0, bus = this.effects) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context, start = ctx.currentTime + delay, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(bus); source.start(start); source.stop(start + Math.min(.24, duration));
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  effect(name) {
    if (!this.enabled || !this.context) return;
    if (name === 'boss') { [36, 43, 48].forEach((n, i) => this.note(midi(n), .65, .3, 'sawtooth', i * .18)); this.hiss(.2, .2, 700); }
    if (name === 'select') this.note(660, .07, .2, 'sine', 0, this.effects, 900);
    if (name === 'portal') { this.hiss(1.1, .18, 700); [48, 55, 60, 67, 72].forEach((n, i) => this.note(midi(n), .65, .12, 'sine', i * .16)); }
    if (name === 'start') [60, 64, 67, 72].forEach((n, i) => this.note(midi(n), .16, .22, 'triangle', i * .08));
    if (name === 'bonk') { this.note(270, .055, .16, 'triangle', 0, this.effects, 130); this.hiss(.03, .08, 1100); }
    if (name === 'hurt') { this.note(120, .2, .4, 'sawtooth', 0, this.effects, 42); this.hiss(.12, .15, 400); }
    if (name === 'dash') { this.hiss(.15, .26, 1400); this.note(150, .16, .15, 'sine', 0, this.effects, 650); }
    if (name === 'jump') this.note(240, .16, .15, 'triangle', 0, this.effects, 600);
    if (name === 'candy') this.note(1200, .045, .075, 'sine', 0, this.effects, 1700);
    if (name === 'upgrade') [72, 76, 79].forEach((n, i) => this.note(midi(n), .2, .22, 'triangle', i * .075));
    if (name === 'evolve') [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.note(midi(n), .4, .25, 'triangle', i * .1));
    if (name === 'win') [60, 64, 67, 72, 79, 76, 79, 84].forEach((n, i) => this.note(midi(n), .35, .25, 'triangle', i * .16));
    if (name === 'lose') [64, 60, 55, 48].forEach((n, i) => this.note(midi(n), .35, .2, 'triangle', i * .18));
  }
  tick(status, intensity = 0) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const ctx = this.context;
    this.music.gain.setTargetAtTime(status === 'playing' ? .16 : status === 'lobby' ? .09 : .035, ctx.currentTime, .3);
    if (this.nextBeat < ctx.currentTime) this.nextBeat = ctx.currentTime + .02;
    const stepDuration = 60 / musicBpm(status, intensity) / 4;
    const melody = [72, 76, 79, 76, 74, 0, 72, 67, 69, 72, 76, 72, 67, 0, 69, 71, 72, 0, 79, 81, 79, 76, 74, 0, 72, 69, 67, 69, 71, 74, 76, 0];
    const roots = [48, 45, 53, 55];
    while (this.nextBeat < ctx.currentTime + .12) {
      const delay = Math.max(0, this.nextBeat - ctx.currentTime), index = this.beat % 32, root = roots[Math.floor(this.beat / 16) % 4];
      if (melody[index]) this.note(midi(melody[index]), stepDuration * .8, .4, 'triangle', delay, this.music);
      if (this.beat % 2 === 0) this.note(midi(root + (this.beat % 4 ? 12 : 0)), stepDuration * 1.4, .5, 'triangle', delay, this.music);
      if (this.beat % 4 === 0) this.note(110, .11, .5, 'sine', delay, this.music, 38);
      if (this.beat % 8 === 4) this.hiss(.07, .25, 900, delay, this.music);
      if (status === 'playing' && this.beat % 2 === 1) this.hiss(.03, .07, 7000, delay, this.music);
      this.beat++; this.nextBeat += stepDuration;
    }
  }
}
