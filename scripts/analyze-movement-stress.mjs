import {runMatch} from './lib/balance-match.mjs';
import {writeFile} from 'node:fs/promises';
const results=[];
for(const map of ['continental','river','plains'])for(const armySize of [100,250]){
 const result=runMatch({map,armySize,limit:120,seed:6819,observeStalls:true});results.push(result);console.log(JSON.stringify({map,armySize,stalledEpisodes:result.stalledEpisodes,maxSimultaneousStalls:result.maxSimultaneousStalls,blockedOrders:result.blockedOrders,cpu:result.cpuStepMs}));
}
await writeFile('docs/balance/movement-stress.json',JSON.stringify({method:'Headless actual simulation. A stall episode is an active movement order more than 3 world units from its next waypoint with less than 0.25 world units of displacement per sampled second for at least 4 seconds. Excludes combat, pending routes, garrisoned and EMP-disabled units. Episodes are diagnostics, not proof of a navigation bug.',results},null,2)+'\n');
