export const OPENING_ENEMIES = ['gastly', 'geodude', 'paras'];

export const LEVELS = [
  { name: 'Verdant Ridges', subtitle: 'The forest is waking up.', enemies: ['gastly', 'geodude', 'pidgey', 'zubat', 'oddish', 'paras'], boss: 'gengar', ground: '#ffffff', sky: '#b7d9ec', grass: '#7ea44b', leaves: ['#527b47', '#789852', '#7fa15a', '#99b56c'], rocks: ['#89988a', '#a3ab96', '#829455'], duration: 180 },
  { name: 'Copper Badlands', subtitle: 'Fast claws. Heavy stones.', enemies: ['sandshrew', 'geodude', 'sandslash', 'zubat', 'paras'], boss: 'gengar', ground: '#e4bd80', sky: '#ebba97', grass: '#be995a', leaves: ['#756644', '#a18d56', '#b69c61', '#c0ab75'], rocks: ['#a67d60', '#c29a72', '#8e764e'], duration: 180 },
  { name: 'Moonlit Ruins', subtitle: 'The final mind is waiting.', enemies: ['gastly', 'zubat', 'sandslash', 'pidgey', 'oddish'], boss: 'mewtwo', ground: '#b6a1d3', sky: '#50547e', grass: '#777caa', leaves: ['#515875', '#6b7395', '#8185ad', '#9c9ec2'], rocks: ['#7c819b', '#a7a8bc', '#687d8f'], duration: 180 },
];

export function levelObjects(stage = 0) {
  const extra = stage > 0 ? [{ x: 52, z: -48, opened: false }, { x: -59, z: 43, opened: false }] : [];
  return {
    pokeballs: [[4, 8], [-5, 8], [7, 16], [-6, -12], [24, 5], [-32, -9], [38, -24], [-49, 16], [58, 4], [2, 42], [-16, 57], [65, -52]]
      .map(([x, z], i) => ({ id: -100 - i, x, z, hp: 18, supply: true, types: [], broken: false })),
    chests: [{ x: stage === 2 ? -4 : -10, z: stage === 2 ? -8 : -12, opened: false }, { x: 15, z: 6, opened: false }, { x: -18, z: 18, opened: false }, ...extra],
    shrines: [{ x: -23, z: -18 }, { x: 18, z: 22 }, { x: 8, z: -35 }, { x: -60, z: -48 }, { x: 63, z: 46 }]
      .map(s => ({ ...s, charge: 0, active: false, completed: false })),
  };
}
