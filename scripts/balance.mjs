import { writeFileSync } from 'node:fs';
import { createGame, step, applyUpgrade, STARTERS, distance, advanceStage } from '../dist/engine.js';
const campaign=process.argv.includes('--campaign');
const duration=campaign?900:180;
const results=[];
const seeds=[19,81,123,4721,65191,91277];
for(const starter of Object.keys(STARTERS)) {
  const runs=[];
  for(const seed of seeds) {
    const g=createGame(starter,seed), clears=[];
    for(let frame=0;frame<duration*30 && !['dead','won',...(campaign?[]:['stage-clear'])].includes(g.status);frame++) {
      if(g.status==='stage-clear'){clears.push({stage:g.stage,time:Math.round(g.time),hp:Math.round(g.player.hp),level:g.level});advanceStage(g);}
      if(g.status==='upgrade'){
        const choice=g.choices.find(c=>c.matchup) ?? g.choices.find(c=>c.id.startsWith('move:')) ?? g.choices.find(c=>['damage','haste','crit-chance'].includes(c.id)) ?? g.choices[0];
        applyUpgrade(g,choice.id);
      }
      let x=Math.cos(g.time*.13)*20-g.player.x,z=Math.sin(g.time*.13)*20-g.player.z;
      const goalLength=Math.hypot(x,z)||1;x=x/goalLength*.35;z=z/goalLength*.35;
      for(const e of g.enemies){const dx=g.player.x-e.x,dz=g.player.z-e.z,d=Math.hypot(dx,dz);if(d<10){x+=dx/(d*d+.5)*1.8;z+=dz/(d*d+.5)*1.8;}}
      const candy=g.drops.filter(d=>d.kind==='xp').sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];
      if(candy&&distance(candy,g.player)<8){const d=distance(candy,g.player)||1;x+=(candy.x-g.player.x)/d*.45;z+=(candy.z-g.player.z)/d*.45;}
      const length=Math.hypot(x,z)||1;
      step(g,{x:x/length,z:z/length,dash:g.enemies.some(e=>distance(e,g.player)<2.5)&&g.player.dashCooldown===0},1/30);
    }
    runs.push({seed,time:Math.round(g.time),kills:g.kills,level:g.level,status:g.status==='playing'&&g.time>=duration-.1?'timeout':g.status,damage:Math.round(g.combat.damageDealt),stage:g.stage,hp:Math.round(g.player.hp),clears,moves:g.moves.map(m=>({id:m.id,level:m.level}))});
  }
  const median=key=>runs.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor(runs.length/2)];
  const row={starter,survival:median('time'),kills:median('kills'),level:median('level'),wins:runs.filter(r=>r.status==='won').length,clears:runs.reduce((sum,r)=>sum+r.clears.length,0),runs}; results.push(row);
  console.log(`${starter.padEnd(10)} survival=${row.survival}s kills=${row.kills} level=${row.level} wins=${row.wins}/${seeds.length} clears=${row.clears}`);
}
writeFileSync(new URL(campaign?'../campaign-balance-results.json':'../balance-results.json',import.meta.url),JSON.stringify({ruleset:'v15 regional layouts, mixed Grass/Bug roster and region-boss priority with immunity avoidance',scenario:`six seeded, ${campaign?'full-campaign (900s limit)':'first-area (180s limit)'} avoidance runs with counter-first upgrades; directional AI is not a human playtest`,results},null,2)+'\n');
