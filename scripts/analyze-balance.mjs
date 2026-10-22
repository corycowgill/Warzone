import {writeFile,mkdir} from 'node:fs/promises';
const {runMatch}=await import(process.env.BALANCE_ENGINE??'./lib/balance-match.mjs');
const output=process.argv[2]??'docs/balance/latest.json';
const pairs=[['america','germany'],['britain','japan'],['france','austria']],maps=['continental','river','plains'];
const results=[];
for(const [index,nations] of pairs.entries())for(const difficulty of ['easy','normal','hard'])for(const reverse of [false,true]){
 const result=runMatch({seed:6819+index*41,map:maps[index],nations:reverse?[...nations].reverse():nations,difficulty,limit:360});results.push(result);
 console.log(`${difficulty} ${result.map} ${result.nations.join('/')} ${result.winner} ${result.duration}s first fight ${result.firstCombat}s`);
}
const finished=results.filter(r=>r.winner!=='timeout'),median=values=>{const a=values.sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
const summary={matches:results.length,finished:finished.length,playerWins:results.filter(r=>r.winner==='player').length,enemyWins:results.filter(r=>r.winner==='enemy').length,medianFirstCombat:median(results.map(r=>r.firstCombat).filter(v=>v!==null)),medianFinishedDuration:median(finished.map(r=>r.duration)),under90:finished.filter(r=>r.duration<90).length};
await mkdir(new URL('../docs/balance/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify({method:'Actual core entities/systems and AI worker decisions at fixed 0.1s steps. Rendering, active abilities, research, neutral objectives and loot excluded. Screen for pacing regressions; not player win rates.',summary,results},null,2)+'\n');console.log(JSON.stringify(summary));
