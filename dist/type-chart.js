// Modern attacking-type matchups. Unlisted defenders take normal damage.
// Source: https://th.portal-pokemon.com/game/type-chart/
export const TYPE_CHART = {
  NORMAL: { ROCK: .5, STEEL: .5, GHOST: 0 },
  FIRE: { FIRE: .5, WATER: .5, GRASS: 2, ICE: 2, BUG: 2, ROCK: .5, DRAGON: .5, STEEL: 2 },
  WATER: { FIRE: 2, WATER: .5, GRASS: .5, GROUND: 2, ROCK: 2, DRAGON: .5 },
  ELECTRIC: { WATER: 2, ELECTRIC: .5, GRASS: .5, GROUND: 0, FLYING: 2, DRAGON: .5 },
  GRASS: { FIRE: .5, WATER: 2, GRASS: .5, POISON: .5, GROUND: 2, FLYING: .5, BUG: .5, ROCK: 2, DRAGON: .5, STEEL: .5 },
  ICE: { FIRE: .5, WATER: .5, GRASS: 2, ICE: .5, GROUND: 2, FLYING: 2, DRAGON: 2, STEEL: .5 },
  FIGHTING: { NORMAL: 2, ICE: 2, POISON: .5, FLYING: .5, PSYCHIC: .5, BUG: .5, ROCK: 2, GHOST: 0, DARK: 2, STEEL: 2, FAIRY: .5 },
  POISON: { GRASS: 2, POISON: .5, GROUND: .5, ROCK: .5, GHOST: .5, STEEL: 0, FAIRY: 2 },
  GROUND: { FIRE: 2, ELECTRIC: 2, GRASS: .5, POISON: 2, FLYING: 0, BUG: .5, ROCK: 2, STEEL: 2 },
  FLYING: { ELECTRIC: .5, GRASS: 2, FIGHTING: 2, BUG: 2, ROCK: .5, STEEL: .5 },
  PSYCHIC: { FIGHTING: 2, POISON: 2, PSYCHIC: .5, DARK: 0, STEEL: .5 },
  BUG: { FIRE: .5, GRASS: 2, FIGHTING: .5, POISON: .5, FLYING: .5, PSYCHIC: 2, GHOST: .5, DARK: 2, STEEL: .5, FAIRY: .5 },
  ROCK: { FIRE: 2, ICE: 2, FIGHTING: .5, GROUND: .5, FLYING: 2, BUG: 2, STEEL: .5 },
  GHOST: { NORMAL: 0, PSYCHIC: 2, GHOST: 2, DARK: .5 },
  DRAGON: { DRAGON: 2, STEEL: .5, FAIRY: 0 },
  DARK: { FIGHTING: .5, PSYCHIC: 2, GHOST: 2, DARK: .5, FAIRY: .5 },
  STEEL: { FIRE: .5, WATER: .5, ELECTRIC: .5, ICE: 2, ROCK: 2, STEEL: .5, FAIRY: 2 },
  FAIRY: { FIRE: .5, FIGHTING: 2, POISON: .5, DRAGON: 2, DARK: 2, STEEL: .5 },
};

export const SPECIES_TYPES = {
  pikachu: ['ELECTRIC'], raichu: ['ELECTRIC'], charmander: ['FIRE'], charmeleon: ['FIRE'],
  bulbasaur: ['GRASS', 'POISON'], ivysaur: ['GRASS', 'POISON'], squirtle: ['WATER'], wartortle: ['WATER'],
  gastly: ['GHOST', 'POISON'], gengar: ['GHOST', 'POISON'], geodude: ['ROCK', 'GROUND'],
  zubat: ['POISON', 'FLYING'], pidgey: ['NORMAL', 'FLYING'], mewtwo: ['PSYCHIC'],
  eevee: ['NORMAL'], vaporeon: ['WATER'], vulpix: ['FIRE'], ninetales: ['FIRE'], psyduck: ['WATER'], golduck: ['WATER'], sandshrew: ['GROUND'], sandslash: ['GROUND'],
};

export function effectiveness(attackType, defenderTypes) {
  if (!TYPE_CHART[attackType]) throw new Error(`Unknown attack type: ${attackType}`);
  return [...new Set(defenderTypes)].reduce((total, type) => {
    if (!TYPE_CHART[type]) throw new Error(`Unknown defender type: ${type}`);
    return total * (TYPE_CHART[attackType][type] ?? 1);
  }, 1);
}

export function matchupLabel(multiplier) {
  if (multiplier === 0) return 'IMMUNE';
  if (multiplier > 1) return `SUPER EFFECTIVE ×${multiplier}`;
  if (multiplier < 1) return `RESISTED ×${multiplier}`;
  return '';
}
