import {runMatch} from './lib/balance-match.mjs';
import {writeFile} from 'node:fs/promises';
const results=[],controlled=process.argv.includes('--controlled');
for(const nation of ['america','britain','france','germany','japan','austria'])for(const map of ['continental','river','plains'])for(const seed of [6819,9071])results.push(runMatch({nations:[nation,nation],map,seed,limit:600,aiSeed:controlled?seed:null}));
await writeFile(process.argv[2]??'docs/balance/mirror-audit.json',JSON.stringify({results,playerWins:results.filter(r=>r.winner==='player').length,enemyWins:results.filter(r=>r.winner==='enemy').length},null,2));console.log(JSON.stringify(results.map(r=>({nation:r.nations[0],map:r.map,seed:r.seed,winner:r.winner,waves:r.waves}))));
