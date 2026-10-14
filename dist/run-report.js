import { LEVELS } from './levels.js?v=16';

// Run feedback and personal bests use recorded play, never estimated DPS.
export function moveRecord(game, id) {
  if (!id) return null;
  game.combat.byMove ??= {};
  return game.combat.byMove[id] ??= { casts: 0, shotsFired: 0, shotsHit: 0, shotsMissed: 0, hits: 0, criticalHits: 0, immuneHits: 0, damageDealt: 0, kills: 0 };
}

export function runRecord(game) {
  return { version: 2, won: game.status === 'won', areasCleared: game.stage + (['won', 'stage-clear'].includes(game.status) ? 1 : 0),
    time: game.time, kills: game.kills, level: game.level, starter: game.starter };
}

export function normalizeBest(value) {
  if (!value || !Number.isFinite(value.time) || value.time < 0 || !Number.isFinite(value.kills) || value.kills < 0) return null;
  return { ...value, won: value.won === true,
    areasCleared: value.won === true ? LEVELS.length : Number.isInteger(value.areasCleared) ? Math.max(0, Math.min(LEVELS.length - 1, value.areasCleared)) : 0 };
}

export function isBetterRun(candidate, saved) {
  const best = normalizeBest(saved);
  if (!best) return true;
  if (candidate.won !== best.won) return candidate.won;
  if (candidate.areasCleared !== best.areasCleared) return candidate.areasCleared > best.areasCleared;
  if (candidate.time !== best.time) return candidate.won ? candidate.time < best.time : candidate.time > best.time;
  return candidate.kills > best.kills;
}

export function moveReport(game) {
  const total = game.combat.damageDealt;
  return game.moves.map(move => {
    const recorded = game.combat.byMove?.[move.id] ?? {};
    return { id: move.id, level: move.level, damage: Math.round(recorded.damageDealt ?? 0),
      share: total > 0 ? Math.min(100, (recorded.damageDealt ?? 0) / total * 100) : 0,
      hits: recorded.hits ?? 0, crits: recorded.criticalHits ?? 0, immune: recorded.immuneHits ?? 0,
      missed: recorded.shotsMissed ?? 0, kills: recorded.kills ?? 0 };
  });
}
