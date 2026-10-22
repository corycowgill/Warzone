import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const revision='431222c',base=resolve('.tmp/balance-baseline');
const files=execFileSync('git',['ls-tree','-r','--name-only',revision,'js'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.js'));
for(const file of files){const target=resolve(base,file);if(!target.startsWith(base+'\\')&&!target.startsWith(base+'/'))throw new Error('Invalid snapshot path');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,execFileSync('git',['show',`${revision}:${file}`]));}
mkdirSync(resolve(base,'scripts/lib'),{recursive:true});writeFileSync(resolve(base,'scripts/lib/balance-match.mjs'),readFileSync('scripts/lib/balance-match.mjs'));
writeFileSync(resolve(base,'js/world/StartingDeployment.js'),`export function startingArmy(team,worldSize=256){const start=team==='player'?50:worldSize-80,z=worldSize/2+10;return [0,4,8].map(i=>({type:'infantry',x:start+i,z})).concat({type:'scoutcar',x:start+14,z});}`);
execFileSync(process.execPath,['scripts/analyze-balance.mjs','docs/balance/before.json'],{stdio:'inherit',env:{...process.env,BALANCE_ENGINE:'../.tmp/balance-baseline/scripts/lib/balance-match.mjs'}});
