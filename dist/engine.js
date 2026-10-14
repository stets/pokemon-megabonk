import { ARENA_RADIUS, groundSlope, waterDepth } from './terrain.js?v=11';
export { ARENA_RADIUS } from './terrain.js?v=11';
import { SPECIES_TYPES, effectiveness, matchupLabel } from './type-chart.js?v=11';
import { avoidBuildings } from './regions.js?v=11';
import { moveWithCollisions } from './obstacles.js?v=11';
import { LEVELS, levelObjects } from './levels.js?v=11';
export { LEVELS } from './levels.js?v=11';

export const STARTERS = {
  pikachu: { name: 'Pikachu', evolved: 'Raichu', type: 'ELECTRIC', color: '#ffda4a', move: 'thunder', speed: 8.2, hp: 90, description: 'Chain lightning. Fast feet. Absolute chaos.' },
  charmander: { name: 'Charmander', evolved: 'Charmeleon', type: 'FIRE', color: '#ff9361', move: 'ember', speed: 7.8, hp: 105, description: 'Piercing fireballs. Make the forest feel the heat.' },
  bulbasaur: { name: 'Bulbasaur', evolved: 'Ivysaur', type: 'GRASS', color: '#97db83', move: 'vine', speed: 6.9, hp: 120, description: 'Wide vine sweeps. A little tank with a big bulb.' },
  squirtle: { name: 'Squirtle', evolved: 'Wartortle', type: 'WATER', color: '#74cbea', move: 'water', speed: 7.5, hp: 105, description: 'Rapid water shots. Keep the horde at a distance.' },
  eevee: { name: 'Eevee', evolved: 'Vaporeon', type: 'NORMAL', color: '#d6b48a', move: 'swift', speed: 8.6, hp: 95, description: 'Piercing stars. Quick on its paws, dangerous at range.' },
  vulpix: { name: 'Vulpix', evolved: 'Ninetales', type: 'FIRE', color: '#efa477', move: 'ember', speed: 8.3, hp: 90, description: 'Fast fire volleys. Six tails, zero hesitation.' },
  psyduck: { name: 'Psyduck', evolved: 'Golduck', type: 'WATER', color: '#f0d16c', move: 'psychic', speed: 7.1, hp: 120, description: 'Psychic bursts. The headache is everybody else’s problem.' },
  sandshrew: { name: 'Sandshrew', evolved: 'Sandslash', type: 'GROUND', color: '#dfbe6c', move: 'sand', speed: 7.6, hp: 115, description: 'Sand pulses. Armored paws and a ground-shaking attitude.' },
};
export const MOVES = {
  thunder: { name: 'Thunder Shock', type: 'ELECTRIC', color: '#ffdc50', cooldown: 1.1, damage: 20, range: 14, icon: 'ϟ' },
  ember: { name: 'Ember', type: 'FIRE', color: '#ff925e', cooldown: .72, damage: 21, range: 17, icon: '✦' },
  vine: { name: 'Vine Whip', type: 'GRASS', color: '#a9e485', cooldown: 1.25, damage: 32, range: 5.7, icon: '❧' },
  water: { name: 'Water Gun', type: 'WATER', color: '#80d9f6', cooldown: .48, damage: 15, range: 17, icon: '≈' },
  rock: { name: 'Rock Throw', type: 'ROCK', color: '#d3bc83', cooldown: 1.1, damage: 34, range: 15, speed: 14, icon: '⬟' },
  shadow: { name: 'Shadow Ball', type: 'GHOST', color: '#c29af4', cooldown: 1.05, damage: 30, range: 16, speed: 17, icon: '◉' },
  swift: { name: 'Swift', type: 'NORMAL', color: '#ffe1a0', cooldown: .65, damage: 17, range: 18, speed: 24, icon: '★' },
  psychic: { name: 'Confusion', type: 'PSYCHIC', color: '#f5a3e1', cooldown: 1.15, damage: 29, range: 7.5, icon: '◎' },
  sand: { name: 'Sand Tomb', type: 'GROUND', color: '#dfbe6c', cooldown: 1.05, damage: 36, range: 7.2, icon: '◌' },
  bite: { name: 'Bite', type: 'DARK', color: '#bb9bcc', cooldown: 1.25, damage: 16, range: 4.8, icon: '⋁' },
};
export function seededRandom(seed = 4721) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function createGame(starter = 'pikachu', seed = Date.now()) {
  const config = STARTERS[starter];
  if (!config) throw new Error('Unknown starter');
  const rng = seededRandom(seed);
  return { status: 'playing', starter, rng, time: 0, stage: 0, stageTime: 0, duration: LEVELS[0].duration, wave: 1, kills: 0, gold: 0, xp: 0, xpNext: 7, level: 1,
    player: { types: [...SPECIES_TYPES[starter]], x: 0, z: 0, y: 0, vy: 0, slideX: 0, slideZ: 0, sliding: false, angle: 0, hp: config.hp, maxHp: config.hp, speed: config.speed, invulnerable: 0, dash: 0, dashCooldown: 0, dashX: 0, dashZ: -1 },
    stats: { damage: 1, haste: 1, magnet: 3.8, armor: 0, projectiles: 1, critChance: .12, critMultiplier: 1.7 },
    combat: { shotsFired: 0, shotsHit: 0, shotsMissed: 0, immuneHits: 0, criticalHits: 0, damageDealt: 0 },
    moves: [{ id: config.move, level: 1, cooldown: .3 }, ...(starter === 'eevee' ? [{ id: 'bite', level: 1, cooldown: .6 }] : [])], enemies: [], bullets: [], drops: [], fx: [], numbers: [], nextId: 1,
    spawnTimer: .2, bossStages: [], finalBossDead: false, evolved: false, choices: [], upgradeSource: 'level',
    ...levelObjects(0),
    notice: 'SURVIVE THE WILD', noticeTime: 3, events: [] };
}
function event(g, name) { g.events.push(name); if (g.events.length > 12) g.events.shift(); }
function notice(g, message, duration = 2.7) { g.notice = message; g.noticeTime = duration; }
export function spawnEnemy(g, kind, position, elite = false) {
  const angle = g.rng() * Math.PI * 2, radius = 20 + g.rng() * 7;
  const baseRoster = g.stage === 0 && g.stageTime < 20 ? ['gastly', 'geodude'] : LEVELS[g.stage].enemies;
  const roster = [...baseRoster, ...(g.stageTime > 55 || g.stage > 0 ? ['graveler'] : []), ...(g.stageTime > 120 || g.stage > 1 ? ['golem'] : [])];
  const type = kind ?? roster[Math.floor(g.rng() * roster.length)];
  const defaults = { gastly: [42, 3.4, .65], geodude: [76, 2.2, .85], graveler: [135, 2.5, 1.1], golem: [240, 2.7, 1.35], zubat: [30, 4.8, .58], pidgey: [44, 3.9, .64], gengar: [1000, 2.8, 1.65], mewtwo: [2400, 3.3, 1.8], sandshrew: [58, 3.8, .65], sandslash: [95, 4.1, .85] }[type];
  const scale = 1 + g.stage * .75 + g.stageTime / 180;
  const e = { id: g.nextId++, kind: type, types: [...SPECIES_TYPES[type]], x: position?.x ?? g.player.x + Math.cos(angle) * radius, z: position?.z ?? g.player.z + Math.sin(angle) * radius,
    hp: defaults[0] * scale * (elite ? 1.8 : 1), maxHp: defaults[0] * scale * (elite ? 1.8 : 1), speed: defaults[1] * (1 + g.stage * .12) * (elite ? 1.15 : 1), radius: defaults[2],
    elite, boss: ['gengar', 'mewtwo'].includes(type), hit: 0, attackTimer: 2.5, angle: angle + Math.PI, phase: g.rng() * 8 };
  g.enemies.push(e); return e;
}
function hit(g, e, damage, color, attackType) {
  if (e.hp <= 0) return;
  if (e.supply) {
    e.hp -= damage;
    if (e.hp <= 0) {
      e.broken = true;
      for (let i = 0; i < 3; i++) g.drops.push({ x: e.x + (i - 1) * .35, z: e.z, kind: 'xp', value: 1, phase: i * 2 });
      g.fx.push({ kind: 'burst', x: e.x, z: e.z, color: '#85dcff', radius: 1.2, life: .4, maxLife: .4 }); event(g, 'supply-broken');
    }
    return;
  }
  const multiplier = effectiveness(attackType, e.types);
  const critical = multiplier > 0 && g.rng() < g.stats.critChance;
  const amount = Math.round(damage * multiplier * (critical ? g.stats.critMultiplier : 1));
  const feedbackColor = multiplier === 0 ? '#b2bac6' : multiplier > 1 ? '#ffe05b' : multiplier < 1 ? '#b1c2d5' : critical ? '#ffe05b' : color;
  g.numbers.push({ x: e.x, z: e.z, text: multiplier === 0 ? 'IMMUNE' : String(amount), color: feedbackColor, life: .8, maxLife: .8, critical, effectiveness: multiplier, label: multiplier === 0 ? '' : [critical ? 'CRIT!' : '', matchupLabel(multiplier)].filter(Boolean).join(' · ') });
  if (multiplier === 0) { g.combat.immuneHits++; return; }
  g.combat.damageDealt += amount; if (critical) g.combat.criticalHits++;
  e.hp -= amount; e.hit = .15;
  if (e.hp <= 0) {
    g.kills++; g.gold += e.boss ? 35 : e.elite ? 3 : 1;
    const value = e.boss ? 24 : e.elite ? 4 : 1;
    g.drops.push({ x: e.x, z: e.z, kind: 'xp', value, phase: g.rng() * 6 });
    if (g.rng() < .065 || e.boss) g.drops.push({ x: e.x + .5, z: e.z, kind: 'berry', value: 20, phase: 0 });
    g.fx.push({ kind: 'burst', x: e.x, z: e.z, color, radius: e.radius * 1.4, life: .3, maxLife: .3 });
    if (e.id === g.stageBossId) { g.finalBossDead = true; notice(g, `${e.kind.toUpperCase()} DEFEATED · CLEAR THE AREA`, 4); }
    event(g, 'enemy-killed');
  }
}
function attack(g, move) {
  const data = MOVES[move.id], p = g.player;
  const range = data.range * (1 + (move.level - 1) * .08);
  const targets = [...g.enemies, ...g.pokeballs].filter(e => e.hp > 0 && distance(e, p) < range).sort((a, b) => Number(!!a.supply) - Number(!!b.supply) || effectiveness(data.type, b.types) - effectiveness(data.type, a.types) || distance(a, p) - distance(b, p));
  if (!targets.length) return false;
  const damage = data.damage * g.stats.damage * (1 + (move.level - 1) * .32) * (g.evolved ? 1.25 : 1);
  if (['vine', 'psychic', 'sand', 'bite'].includes(move.id)) {
    for (const e of targets) hit(g, e, damage, data.color, data.type);
    g.fx.push({ kind: 'ring', x: p.x, z: p.z, radius: range, color: data.color, life: .35, maxLife: .35 });
  } else if (move.id === 'thunder') {
    let from = p;
    for (const e of targets.slice(0, Math.min(6, move.level + g.stats.projectiles))) {
      hit(g, e, damage, data.color, data.type);
      g.fx.push({ kind: 'line', x: from.x, z: from.z, tx: e.x, tz: e.z, color: data.color, life: .22, maxLife: .22 }); from = e;
    }
  } else {
    const target = targets[0], angle = Math.atan2(target.x - p.x, target.z - p.z);
    for (let n = 0; n < Math.min(5, g.stats.projectiles); n++) {
      const a = angle + (n - (Math.min(5, g.stats.projectiles) - 1) / 2) * .18;
      const speed = data.speed ?? 21;
      g.combat.shotsFired++;
      g.bullets.push({ x: p.x, z: p.z, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, life: range / speed, radius: move.id === 'rock' ? .48 : .36,
        type: data.type, color: data.color, damage, pierce: ['ember', 'swift'].includes(move.id) ? 2 + Math.floor(move.level / 3) : 1, hitIds: new Set(), enemy: false });
    }
  }
  event(g, 'attack'); return true;
}
function recommendCounter(g, pool) {
  const enemies = g.enemies.filter(e => e.hp > 0);
  const threats = enemies.length ? enemies : (g.time < 25 ? ['gastly', 'geodude'] : ['geodude', 'zubat', 'pidgey', g.time >= 140 ? 'mewtwo' : 'gengar']).map(kind => ({ kind, types: SPECIES_TYPES[kind] }));
  let selected, bestScore = 0;
  for (const choice of pool.filter(c => c.id.startsWith('move:'))) {
    const move = MOVES[choice.id.slice(5)];
    let score = 0, strongest;
    for (const enemy of threats) {
      const multiplier = effectiveness(move.type, enemy.types);
      const current = Math.max(...g.moves.map(m => effectiveness(MOVES[m.id].type, enemy.types)), 0);
      const improvement = Math.max(0, multiplier - current) * (current === 0 ? 3 : 1) * (enemy.boss ? 3 : 1);
      if (multiplier > 1) score += improvement;
      if (improvement > 0 && multiplier > 1 && (!strongest || multiplier > strongest.multiplier)) strongest = { kind: enemy.kind, multiplier };
    }
    if (score > bestScore && strongest) {
      bestScore = score; selected = choice;
      choice.matchup = `COUNTERS ${strongest.kind.toUpperCase()} · ×${strongest.multiplier}`;
    }
  }
  return selected;
}

export function makeChoices(g) {
  const pool = [
    { id: 'damage', name: 'Muscle Band', label: 'HELD ITEM', description: '+20% damage for every move.', color: '#efae75', icon: '✦' },
    { id: 'haste', name: 'Quick Claw', label: 'HELD ITEM', description: 'Attack 15% faster. More moves, more mayhem.', color: '#e9d899', icon: '»' },
    { id: 'speed', name: 'Running Shoes', label: 'HELD ITEM', description: '+12% movement speed. Stay one step ahead.', color: '#e7b1ff', icon: '↗' },
    { id: 'magnet', name: 'Exp. Share', label: 'HELD ITEM', description: '+40% candy pickup range.', color: '#83d5fa', icon: '◎' },
    { id: 'hp', name: 'Sitrus Berry', label: 'HELD ITEM', description: '+20 max HP. Heal 35 HP immediately.', color: '#a4df87', icon: '♥' },
    { id: 'armor', name: 'Rocky Helmet', label: 'HELD ITEM', description: 'Take 15% less contact damage.', color: '#b6c3d9', icon: '⬡' },
  ];
  if (g.stats.critChance < .5) pool.push({ id: 'crit-chance', name: 'Scope Lens', label: 'CRITICAL CHANCE', description: '+6 percentage points of crit chance, up to 50%.', color: '#f1d179', icon: '◎' });
  if (g.stats.critMultiplier < 3) pool.push({ id: 'crit-damage', name: 'Razor Claw', label: 'CRITICAL DAMAGE', description: '+0.25× critical damage, up to 3×.', color: '#ecaa8e', icon: '✧' });
  if (g.stats.projectiles < 5) pool.push({ id: 'projectile', name: 'Choice Specs', label: 'HELD ITEM', description: 'Fire one additional projectile. Lightning chains further.', color: '#ffbcdf', icon: '◈' });
  for (const [id, data] of Object.entries(MOVES)) {
    const existing = g.moves.find(m => m.id === id);
    if (existing?.level >= 6 || (!existing && g.moves.length >= 4)) continue;
    pool.push({ id: 'move:' + id, name: data.name, label: existing ? `MOVE · LV ${existing.level} → ${existing.level + 1}` : 'NEW ' + data.type + ' MOVE',
      description: existing ? '+32% base damage and more reach.' : `Add automatic ${data.type.toLowerCase()} attacks to your build.`, color: data.color, icon: data.icon });
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(g.rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  // Always include a move among the choices, so builds gain visible new abilities.
  const firstMove = recommendCounter(g, pool) ?? pool.find(u => u.id.startsWith('move:'));
  g.choices = [firstMove, ...pool.filter(u => u !== firstMove).slice(0, 2)].filter(Boolean);
  g.status = 'upgrade';
}
function checkLevel(g) {
  if (g.xp >= g.xpNext && g.status === 'playing') {
    g.xp -= g.xpNext; g.level++; g.xpNext = Math.floor(7 + g.level * 3.5); g.upgradeSource = 'level';
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 8);
    if (g.level >= 8 && !g.evolved) {
      g.evolved = true; g.player.types = [...SPECIES_TYPES[STARTERS[g.starter].evolved.toLowerCase()]]; g.player.maxHp += 25; g.player.hp = g.player.maxHp;
      notice(g, `${STARTERS[g.starter].evolved.toUpperCase()}! EVOLUTION!`, 4);
      event(g, 'evolved');
    }
    makeChoices(g); event(g, 'level-up');
  }
}
export function applyUpgrade(g, id) {
  if (g.status !== 'upgrade' || !g.choices.some(c => c.id === id)) return false;
  if (id.startsWith('move:')) {
    const moveId = id.slice(5), existing = g.moves.find(m => m.id === moveId);
    if (existing) existing.level++; else g.moves.push({ id: moveId, level: 1, cooldown: .25 });
  } else if (id === 'damage') g.stats.damage += .2;
  else if (id === 'crit-chance') g.stats.critChance = Math.min(.5, g.stats.critChance + .06);
  else if (id === 'crit-damage') g.stats.critMultiplier = Math.min(3, g.stats.critMultiplier + .25);
  else if (id === 'haste') g.stats.haste *= 1.15;
  else if (id === 'speed') g.player.speed *= 1.12;
  else if (id === 'magnet') g.stats.magnet *= 1.4;
  else if (id === 'armor') g.stats.armor = Math.min(.7, g.stats.armor + .15);
  else if (id === 'projectile') g.stats.projectiles++;
  else if (id === 'hp') { g.player.maxHp += 20; g.player.hp = Math.min(g.player.maxHp, g.player.hp + 35); }
  g.choices = []; g.status = 'playing'; event(g, 'upgrade-selected'); checkLevel(g); return true;
}
function damagePlayer(g, amount, attackType) {
  const p = g.player;
  if (p.invulnerable > 0 || p.dash > 0 || p.y > 1.3) return;
  const multiplier = attackType ? effectiveness(attackType, p.types) : 1;
  if (multiplier === 0) return;
  p.hp = Math.max(0, p.hp - amount * multiplier * (1 + g.stage * .25) * (1 - g.stats.armor)); p.invulnerable = .6;
  g.fx.push({ kind: 'hurt', x: p.x, z: p.z, color: '#ff7269', life: .35, maxLife: .35 }); event(g, 'player-hit');
  if (p.hp <= 0) { g.status = 'dead'; event(g, 'game-over'); }
}
function segmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
export function step(g, input = {}, dt = 1 / 60) {
  if (g.status !== 'playing') return;
  dt = Math.max(0, Math.min(dt, .05));
  const p = g.player;
  const previousPosition = { x: p.x, z: p.z };
  const depth = waterDepth(p.x, p.z), swimming = depth > .3 && p.y < depth + .2;
  g.time += dt; g.stageTime += dt; g.wave = Math.min(6, 1 + Math.floor(g.stageTime / 30));
  g.noticeTime = Math.max(0, g.noticeTime - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt); p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  let mx = input.x ?? 0, mz = input.z ?? 0; const magnitude = Math.hypot(mx, mz);
  if (magnitude > 1) { mx /= magnitude; mz /= magnitude; }
  if (input.dash && p.dashCooldown === 0) {
    p.dash = .19; p.dashCooldown = 2.8;
    p.dashX = magnitude ? mx : Math.sin(p.angle); p.dashZ = magnitude ? mz : Math.cos(p.angle);
    event(g, 'dash');
  }
  if (input.jump && p.y === 0) { p.vy = 10; event(g, 'jump'); }
  if (p.dash > 0) { p.sliding = false; p.x += p.dashX * 24 * dt; p.z += p.dashZ * 24 * dt; p.dash -= dt; }
  else {
    p.sliding = !!input.slide && p.y === 0;
    if (p.sliding) {
      const slope = groundSlope(p.x, p.z);
      const drag = Math.exp(-1.3 * dt);
      p.slideX = (p.slideX - slope.x * 32 * dt + mx * 10 * dt) * drag;
      p.slideZ = (p.slideZ - slope.z * 32 * dt + mz * 10 * dt) * drag;
      const speed = Math.hypot(p.slideX, p.slideZ);
      if (speed > 19) { p.slideX *= 19 / speed; p.slideZ *= 19 / speed; }
      p.x += p.slideX * dt; p.z += p.slideZ * dt;
      if (speed > .2) p.angle = Math.atan2(p.slideX, p.slideZ);
    } else {
      p.slideX = mx * p.speed; p.slideZ = mz * p.speed;
      p.x += mx * p.speed * dt * (swimming ? .65 : 1); p.z += mz * p.speed * dt * (swimming ? .65 : 1);
    }
  }
  if (magnitude && !p.sliding) p.angle = Math.atan2(mx, mz);
  moveWithCollisions(p, previousPosition, .5);
  const worldDistance = Math.hypot(p.x, p.z);
  if (worldDistance > ARENA_RADIUS) { p.x *= ARENA_RADIUS / worldDistance; p.z *= ARENA_RADIUS / worldDistance; }
  p.vy -= 24 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0;
  const finalDepth = waterDepth(p.x, p.z);
  if (finalDepth > .3 && p.y < finalDepth - .25) { p.y = finalDepth - .25; p.vy = 0; }
  if (swimming && p.dash <= 0) p.z += dt * 1.1;
  if (input.interact) {
    const chest = g.chests.find(c => !c.opened && distance(c, p) < 3);
    if (chest && g.gold >= 15) { chest.opened = true; g.gold -= 15; g.upgradeSource = 'chest'; makeChoices(g); event(g, 'chest-opened'); return; }
    const shrine = g.shrines.find(s => !s.completed && !s.active && distance(s, p) < 3);
    if (shrine) {
      shrine.active = true; notice(g, 'HOLD THE SHRINE · STAY IN THE RING'); event(g, 'shrine-started');
      for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2; spawnEnemy(g, undefined, { x: shrine.x + Math.cos(a) * 9, z: shrine.z + Math.sin(a) * 9 }); }
    }
  }
  for (const shrine of g.shrines) {
    if (!shrine.active || shrine.completed || distance(shrine, p) > 4.5) continue;
    shrine.charge = Math.min(1, shrine.charge + dt / 6);
    if (shrine.charge >= 1) {
      shrine.completed = true; shrine.active = false; g.upgradeSource = 'shrine';
      makeChoices(g); event(g, 'shrine-completed'); return;
    }
  }
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0 && g.enemies.length < 160) {
    spawnEnemy(g, undefined, undefined, g.stageTime > 30 && g.rng() < .08 + g.stage * .05);
    g.spawnTimer = Math.max(.1, .52 - g.stageTime * .0023 - g.stage * .08);
  }
  for (const time of [60, 120, 150]) {
    if (g.stageTime >= time && !g.bossStages.includes(time)) {
      const kind = time === 150 ? LEVELS[g.stage].boss : 'gengar';
      g.bossStages.push(time); const boss = spawnEnemy(g, kind);
      if (time === 150) g.stageBossId = boss.id;
      notice(g, `${kind.toUpperCase()} HAS ENTERED ${LEVELS[g.stage].name.toUpperCase()}`, 4); event(g, 'boss-spawned');
    }
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    const oldPosition = { x: e.x, z: e.z };
    e.hit = Math.max(0, e.hit - dt);
    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 1;
    e.angle = Math.atan2(dx, dz);
    const lunge = ['zubat', 'sandslash'].includes(e.kind) && Math.sin(g.time * 1.8 + e.phase) > .85 ? 2.1 : 1;
    if (dist > e.radius + .35) { e.x += dx / dist * e.speed * lunge * dt; e.z += dz / dist * e.speed * lunge * dt; }
    moveWithCollisions(e, oldPosition, e.radius);
    if (dist < e.radius + .55) damagePlayer(g, e.boss ? 22 : e.elite ? 15 : 10);
    if (!e.boss && ['geodude', 'graveler', 'golem'].includes(e.kind) && g.stageTime > 35 && dist < 18) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        g.bullets.push({ x: e.x, z: e.z, vx: dx / dist * 7, vz: dz / dist * 7, radius: .36, life: 3, type: 'ROCK', color: '#d3bc83', damage: 12, enemy: true });
        e.attackTimer = 4;
      }
    }
    if (e.boss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        const shots = 10 + g.stage * 2, speed = 7 + g.stage;
        for (let n = 0; n < shots; n++) {
          const a = n * Math.PI * 2 / shots + g.time * .5;
          g.bullets.push({ x: e.x, z: e.z, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, radius: .45, life: 3, type: e.kind === 'mewtwo' ? 'PSYCHIC' : 'GHOST', color: '#d999ff', damage: 16, enemy: true });
        }
        e.attackTimer = 2.8 - g.stage * .3;
      }
    }
  }
  for (const move of g.moves) {
    move.cooldown -= dt;
    if (move.cooldown <= 0 && attack(g, move)) move.cooldown = MOVES[move.id].cooldown / g.stats.haste;
  }
  for (const b of g.bullets) {
    const oldX = b.x, oldZ = b.z;
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    if (b.enemy) {
      if (segmentDistance(p.x, p.z, oldX, oldZ, b.x, b.z) < b.radius + .5) { damagePlayer(g, b.damage, b.type); b.life = 0; }
    } else {
      for (const e of [...g.enemies, ...g.pokeballs]) {
        if (e.hp <= 0 || b.hitIds.has(e.id)) continue;
        if (segmentDistance(e.x, e.z, oldX, oldZ, b.x, b.z) < e.radius + b.radius) {
          hit(g, e, b.damage, b.color, b.type); if (!b.hitIds.size) g.combat.shotsHit++; b.hitIds.add(e.id); b.pierce--;
          if (b.pierce <= 0) { b.life = 0; break; }
        }
      }
    }
  }
  for (const b of g.bullets) if (b.life <= 0 && !b.enemy && !b.hitIds.size) g.combat.shotsMissed++;
  g.bullets = g.bullets.filter(b => b.life > 0); g.enemies = g.enemies.filter(e => e.hp > 0);
  for (const drop of g.drops) {
    const dist = distance(drop, p);
    if (dist < g.stats.magnet) {
      const speed = Math.min(dist, (8 + g.stats.magnet * 2) * dt);
      drop.x += (p.x - drop.x) / (dist || 1) * speed; drop.z += (p.z - drop.z) / (dist || 1) * speed;
    }
    if (distance(drop, p) < .8) {
      if (drop.kind === 'berry') p.hp = Math.min(p.maxHp, p.hp + drop.value); else g.xp += drop.value;
      drop.collected = true;
    }
  }
  g.drops = g.drops.filter(d => !d.collected);
  // Compress distant candy piles without losing total XP or recovery potential.
  if (g.drops.length > 350) {
    const a = g.drops.find(d => d.kind === 'xp'), b = g.drops.find(d => d !== a && d.kind === 'xp');
    if (a && b) { a.value += b.value; g.drops.splice(g.drops.indexOf(b), 1); }
  }
  for (const fx of g.fx) fx.life -= dt;
  for (const n of g.numbers) n.life -= dt;
  g.fx = g.fx.filter(f => f.life > 0); g.numbers = g.numbers.filter(n => n.life > 0);
  if (g.status !== 'playing') return;
  if (g.stageTime >= g.duration && g.finalBossDead) { g.status = g.stage === LEVELS.length - 1 ? 'won' : 'stage-clear'; event(g, g.status === 'won' ? 'victory' : 'stage-clear'); return; }
  checkLevel(g);
}

export function advanceStage(g) {
  if (g.status !== 'stage-clear' || g.stage >= LEVELS.length - 1) return false;
  g.stage++; g.stageTime = 0; g.duration = LEVELS[g.stage].duration;
  g.enemies = []; g.bullets = []; g.fx = []; g.numbers = []; g.drops = [];
  g.bossStages = []; g.finalBossDead = false; g.stageBossId = null; g.spawnTimer = .4; g.wave = 1;
  Object.assign(g, levelObjects(g.stage));
  Object.assign(g.player, { x: 0, z: 0, y: 0, vy: 0, slideX: 0, slideZ: 0, sliding: false, dash: 0, invulnerable: 1.5, hp: Math.min(g.player.maxHp, g.player.hp + g.player.maxHp * .35) });
  g.status = 'playing'; notice(g, LEVELS[g.stage].name.toUpperCase(), 4);
  return true;
}
