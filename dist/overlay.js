import { groundHeight } from './terrain.js?v=4';

const TAU = Math.PI * 2;

export function paintOverlay(g, realTime, lobby) {
    const ctx = this.ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.width, this.heightPx);
    const line = (a, b, col, width) => { if (!a || !b) return; ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    for (const fx of g.fx) {
      ctx.globalAlpha = Math.min(1, fx.life / fx.maxLife * 1.6);
      if (fx.kind === 'line') {
        const a = this.project(fx.x, groundHeight(fx.x, fx.z) + 1, fx.z), b = this.project(fx.tx, groundHeight(fx.tx, fx.tz) + 1, fx.tz);
        if (a && b) { ctx.shadowColor = fx.color; ctx.shadowBlur = 12; const mid = { x: (a.x + b.x) / 2 + Math.sin(realTime * 80) * 8, y: (a.y + b.y) / 2 - 12 }; line(a, mid, '#fff4b0', 4); line(mid, b, fx.color, 3); ctx.shadowBlur = 0; }
      } else if (fx.kind === 'ring' || fx.kind === 'burst') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = fx.kind === 'ring' ? 4 : 2; ctx.beginPath();
        const r = fx.radius * (1 - fx.life / fx.maxLife * .4);
        let started = false;
        for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, v = this.project(fx.x + Math.cos(a) * r, groundHeight(fx.x + Math.cos(a) * r, fx.z + Math.sin(a) * r) + .5, fx.z + Math.sin(a) * r); if (!v) continue; if (started) ctx.lineTo(v.x, v.y); else { ctx.moveTo(v.x, v.y); started = true; } }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (!lobby) for (const e of g.enemies) {
      if ((!e.boss && e.hp >= e.maxHp) || Math.hypot(e.x - g.player.x, e.z - g.player.z) > 25) continue;
      const pos = this.project(e.x, groundHeight(e.x, e.z) + (e.boss ? 4.4 : 2.2), e.z); if (!pos) continue;
      const w = e.boss ? 80 : 26; ctx.fillStyle = '#26352bcc'; ctx.fillRect(pos.x - w / 2, pos.y, w, e.boss ? 5 : 3);
      ctx.fillStyle = e.boss ? '#c998ed' : '#f0a783'; ctx.fillRect(pos.x - w / 2, pos.y, w * Math.max(0, e.hp / e.maxHp), e.boss ? 5 : 3);
    }
    for (const n of g.numbers) {
      const pos = this.project(n.x, groundHeight(n.x, n.z) + 1.6 + (1 - n.life / n.maxLife) * 1.6, n.z); if (!pos) continue;
      ctx.globalAlpha = Math.min(1, n.life * 3); ctx.font = `800 ${n.critical ? 22 : 16}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#25312c'; ctx.strokeText(n.text, pos.x, pos.y); ctx.fillStyle = n.color; ctx.fillText(n.text, pos.x, pos.y);
      if (n.label) {
        ctx.font = '12px Alagard, monospace'; ctx.lineWidth = 3;
        ctx.strokeText(n.label, pos.x, pos.y + 15); ctx.fillText(n.label, pos.x, pos.y + 15);
      }
    }
    ctx.globalAlpha = 1;
  }
