export const LEVELS = [
  { name: 'Verdant Ridges', subtitle: 'The forest is waking up.', enemies: ['gastly', 'geodude', 'pidgey', 'zubat'], boss: 'gengar', ground: '#ffffff', sky: '#b7d9ec', grass: '#7ea44b', duration: 180 },
  { name: 'Copper Badlands', subtitle: 'Fast claws. Heavy stones.', enemies: ['sandshrew', 'geodude', 'sandslash', 'zubat'], boss: 'gengar', ground: '#e4bd80', sky: '#ebba97', grass: '#be995a', duration: 180 },
  { name: 'Moonlit Ruins', subtitle: 'The final mind is waiting.', enemies: ['gastly', 'zubat', 'sandslash', 'pidgey'], boss: 'mewtwo', ground: '#b6a1d3', sky: '#50547e', grass: '#777caa', duration: 180 },
];

export function levelObjects(stage = 0) {
  const extra = stage > 0 ? [{ x: 52, z: -48, opened: false }, { x: -59, z: 43, opened: false }] : [];
  return {
    chests: [{ x: -10, z: -12, opened: false }, { x: 15, z: 6, opened: false }, { x: -18, z: 18, opened: false }, ...extra],
    shrines: [{ x: -23, z: -18 }, { x: 18, z: 22 }, { x: 8, z: -35 }, { x: -60, z: -48 }, { x: 63, z: 46 }]
      .map(s => ({ ...s, charge: 0, active: false, completed: false })),
  };
}
