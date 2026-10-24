import {writeFile,mkdir} from 'node:fs/promises';
import {runMatch} from './lib/balance-match.mjs';
const nations=['america','britain','france','germany','japan','austria'];
const controlled=process.argv.includes('--controlled');
const holdout=process.argv.includes('--holdout');
const results=[],maps=holdout?['plains']:['continental','river','plains'],seeds=holdout?[24817]:[6819,9071];
const total=15*maps.length*seeds.length*2;
for(let a=0;a<nations.length;a++)for(let b=a+1;b<nations.length;b++)for(const map of maps)for(const seed of seeds)for(const reverse of [false,true]){
 const pair=[nations[a],nations[b]];
 results.push(runMatch({nations:reverse?pair.reverse():pair,map,seed,difficulty:'normal',limit:600,aiSeed:controlled?seed:null}));
 if(results.length%12===0)console.log(`Completed ${results.length}/${total} matchups`);
}
const rates=Object.fromEntries(nations.map(nation=>{const games=results.filter(r=>r.nations.includes(nation));return [nation,{matches:games.length,wins:games.filter(r=>r.winner!=='timeout'&&r.winner!=='draw'&&r.nations[r.winner==='player'?0:1]===nation).length,timeouts:games.filter(r=>r.winner==='timeout').length}];}));
const stress=[];
for(const map of (holdout?[]:maps))for(const armySize of [100,250]){
 const result=runMatch({map,armySize,limit:120,seed:6819});stress.push(result);console.log(`Stress ${map} requested ${armySize}/team: peak ${Object.values(result.peakArmy).reduce((a,b)=>a+b,0)}, CPU p95 ${result.cpuStepMs.p95.toFixed(2)}ms`);
}
await mkdir('docs/balance',{recursive:true});
await writeFile(process.argv[2]??'docs/balance/full-sweep.json',JSON.stringify({controlledAi:controlled,maps,seeds,method:'Headless core simulation, normal difficulty, every unordered faction pair with sides reversed over the specified maps and seeds, 600 simulated seconds. Excludes rendering, abilities, research, neutral objectives and loot. CPU step time is not browser FPS. Stress spawns skip unwalkable tiles; peak counts are actual.',summary:{matches:results.length,finished:results.filter(r=>r.winner!=='timeout').length,playerWins:results.filter(r=>r.winner==='player').length,enemyWins:results.filter(r=>r.winner==='enemy').length,rates},results,stress},null,2)+'\n');
console.log(JSON.stringify({rates,finished:results.filter(r=>r.winner!=='timeout').length}));
