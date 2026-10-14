import { groundHeight } from './terrain.js?v=14';
import { drawLightning } from './lightning.js?v=14';

const TAU = Math.PI * 2;

export function paintOverlay(g, realTime, lobby) {
    const ctx = this.ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.width, this.heightPx);
    const line = (a, b, col, width) => { if (!a || !b) return; ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    for (const fx of g.fx) {
      ctx.globalAlpha = Math.min(1, fx.life / fx.maxLife * 1.6);
      if (fx.kind === 'line') {
        const a = this.project(fx.x, groundHeight(fx.x, fx.z) + 1, fx.z), b = this.project(fx.tx, groundHeight(fx.tx, fx.tz) + 1, fx.tz);
        if (a && b) drawLightning(ctx, a, b, fx.color, fx.x * 3 + fx.z * 7 + Math.floor(fx.life * 28));
      } else if (fx.kind === 'fire') {
        const center = this.project(fx.x, groundHeight(fx.x, fx.z) + .9, fx.z);
        if (center) for (let i = 0; i < 7; i++) { const a = i * TAU / 7, r = (1 - fx.life / fx.maxLife) * 30; ctx.fillStyle = i % 2 ? '#fff2a5' : '#ff9f42'; ctx.fillRect(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r - r * .6, 4, 6); }
      } else if (fx.kind === 'ring' || fx.kind === 'burst') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = fx.kind === 'ring' ? 4 : 2; ctx.beginPath();
        const r = fx.radius * (1 - fx.life / fx.maxLife * .4);
        let started = false;
        for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, v = this.project(fx.x + Math.cos(a) * r, groundHeight(fx.x + Math.cos(a) * r, fx.z + Math.sin(a) * r) + .5, fx.z + Math.sin(a) * r); if (!v) continue; if (started) ctx.lineTo(v.x, v.y); else { ctx.moveTo(v.x, v.y); started = true; } }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const zone of g.captureZones ?? []) {
      ctx.strokeStyle = '#ffa575'; ctx.lineWidth = 4; ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * TAU, x = zone.x + Math.cos(a) * zone.radius, z = zone.z + Math.sin(a) * zone.radius;
        const point = this.project(x, groundHeight(x, z) + .1, z); if (!point) continue;
        if (i === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke(); const center = this.project(zone.x, groundHeight(zone.x, zone.z) + .4, zone.z);
      if (center) { ctx.font = '20px Alagard, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd6a5'; ctx.fillText('MOVE!', center.x, center.y); }
    }
    if (!lobby) for (const e of g.enemies) {
      if ((!e.boss && e.hp >= e.maxHp) || Math.hypot(e.x - g.player.x, e.z - g.player.z) > 25) continue;
      const pos = this.project(e.x, groundHeight(e.x, e.z) + (e.kind === 'ranger' ? 2.7 : e.kind === 'pidgey' ? 3.1 : e.boss ? 4.4 : 2.2), e.z); if (!pos) continue;
      const w = e.boss ? 150 : e.elite ? 78 : 64, barHeight = e.boss ? 12 : 8;
      ctx.fillStyle = '#121b22'; ctx.fillRect(pos.x - w / 2 - 2, pos.y - 2, w + 4, barHeight + 4); ctx.fillStyle = '#26352bcc'; ctx.fillRect(pos.x - w / 2, pos.y, w, barHeight);
      ctx.fillStyle = e.boss ? '#c998ed' : '#f0a783'; ctx.fillRect(pos.x - w / 2, pos.y, w * Math.max(0, e.hp / e.maxHp), barHeight);
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
