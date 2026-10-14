// Self-contained GLBs: geometry, textures, skeleton, and named animation clips.
// Source and asset credits: https://github.com/06wj/pokemon
export const MODEL_BASE = 'https://raw.githubusercontent.com/06wj/pokemon/master/public/';
export const MODELS = {
  pikachu: { id: '025', height: 2.05, faceYaw: 0 },
  raichu: { id: '026', height: 2.1, faceYaw: 0 },
  charmander: { id: '004', height: 1.9, faceYaw: 0 },
  charmeleon: { id: '005', height: 2.2, faceYaw: 0 },
  bulbasaur: { id: '001', height: 1.3, faceYaw: 0 },
  ivysaur: { id: '002', height: 1.7, faceYaw: 0 },
  squirtle: { id: '007', height: 1.65, faceYaw: 0 },
  wartortle: { id: '008', height: 1.95, faceYaw: 0 },
  gastly: { id: '092', height: 1.8, faceYaw: 0 },
  geodude: { id: '074', height: 1.6, faceYaw: 0 },
  graveler: { id: '075', height: 2.15, faceYaw: 0 },
  golem: { id: '076', height: 2.8, faceYaw: 0 },
  oddish: { id: '043', height: 1.3, faceYaw: 0 },
  paras: { id: '046', height: 1.25, faceYaw: 0 },
  zubat: { id: '041', height: 1.5, faceYaw: 0 },
  pidgey: { id: '016', height: 1.4, faceYaw: 0 },
  gengar: { id: '094', height: 2.8, faceYaw: 0 },
  mewtwo: { id: '150', height: 4.0, faceYaw: 0 },
  eevee: { id: '133', height: 1.3, faceYaw: 0 },
  vaporeon: { id: '134', height: 2.1, faceYaw: 0 },
  vulpix: { id: '037', height: 1.5, faceYaw: 0 },
  ninetales: { id: '038', height: 2.7, faceYaw: 0 },
  psyduck: { id: '054', height: 1.8, faceYaw: 0 },
  golduck: { id: '055', height: 2.7, faceYaw: 0 },
  sandshrew: { id: '027', height: 1.5, faceYaw: 0 },
  sandslash: { id: '028', height: 2.3, faceYaw: 0 },
};
export const EVOLUTIONS = { pikachu: 'raichu', charmander: 'charmeleon', bulbasaur: 'ivysaur', squirtle: 'wartortle', eevee: 'vaporeon', vulpix: 'ninetales', psyduck: 'golduck', sandshrew: 'sandslash' };
export function modelURL(kind, local = false) {
  const data = MODELS[kind];
  if (!data) throw new Error(`No model configured for ${kind}`);
  return local ? `assets/models/${data.id}.glb` : `${MODEL_BASE}models/${data.id}/model.glb`;
}
