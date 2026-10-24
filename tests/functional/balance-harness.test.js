import {it,expect} from 'vitest';
import {runMatch} from '../../scripts/lib/balance-match.mjs';
it('reproduces controlled match outcomes independently of wall-clock profiling',()=>{
 const options={nations:['america','germany'],map:'river',seed:6819,aiSeed:6819,limit:120};
 const a=runMatch(options),b=runMatch(options);
 expect(a.strategies[0]).toBe(a.strategies[1]);
 for(const field of ['winner','duration','firstCombat','construction','hqHP','damageByType','killsByType'])expect(a[field]).toEqual(b[field]);
 expect(a.cpuStepMs.p95).toBeGreaterThanOrEqual(0);
});
