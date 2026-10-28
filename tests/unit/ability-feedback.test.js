import {it,expect,vi,afterEach} from 'vitest';
import {abilityFeedback} from '../../js/ui/AbilityFeedback.js';
import {CommandCard} from '../../js/ui/CommandCard.js';
import {UNIT_ABILITIES} from '../../js/core/Constants.js';
const unit=(type,extra={})=>({alive:true,isUnit:true,team:'player',type,ability:{...UNIT_ABILITIES[type]},...extra});
const game=(mu=100)=>({teams:{player:{mu}}});
afterEach(()=>vi.unstubAllGlobals());
it('uses the real mine and sonar names rather than Repair or Ability',()=>{
 expect(abilityFeedback([unit('engineer')],game()).name).toBe('Plant Mine');
 expect(abilityFeedback([unit('patrolboat')],game()).name).toBe('Sonar Ping');
 expect(abilityFeedback([unit('tank',{_siegeMode:true})],game()).name).toBe('Exit Siege');
});
it('explains cooldown and EMP without treating those units as ready',()=>{
 expect(abilityFeedback([unit('infantry',{abilityCooldown:3.2})],game())).toMatchObject({status:'4s cooldown',disabled:true});
 expect(abilityFeedback([unit('infantry',{empDisabledTimer:2})],game())).toMatchObject({status:'EMP disabled',disabled:true});
});
it('accounts for current MU and per-unit costs in group readiness',()=>{
 const units=[unit('infantry'),unit('infantry'),unit('infantry',{abilityCooldown:2})];
 expect(abilityFeedback(units,game(10)).status).toBe('1/3 ready');
 expect(abilityFeedback(units,game(30)).status).toBe('2/3 ready');
 expect(abilityFeedback(units,game(0))).toMatchObject({status:'Need 10 MU',disabled:true});
});
it('warns about mixed abilities and reflects readiness of the actual G ability group',()=>{
 const feedback=abilityFeedback([unit('engineer'),unit('patrolboat')],game(0));
 expect(feedback.disabled).toBe(true);expect(feedback.description).toContain('Mixed abilities');
});
it('ignores dead units and supports free abilities and garrison restrictions',()=>{
 expect(abilityFeedback([unit('infantry',{alive:false})],game())).toBe(null);
 expect(abilityFeedback([unit('mortar')],game(0))).toMatchObject({status:'1/1 ready',disabled:false});
 expect(abilityFeedback([unit('infantry',{isGarrisoned:true})],game())).toMatchObject({status:'Garrisoned',disabled:true});
});
it('renders named ability state and disables unavailable command-card actions',()=>{
 const nodes=[];vi.stubGlobal('document',{createElement:()=>({children:[],attrs:{},handlers:{},appendChild(node){this.children.push(node);},setAttribute(key,value){this.attrs[key]=value;},addEventListener(key,fn){this.handlers[key]=fn;}})});
 const card=Object.assign(Object.create(CommandCard.prototype),{game:game(0),commandCardGrid:{appendChild:n=>nodes.push(n)}});
 card._buildUnitCommandCard([unit('engineer')]);
 const button=nodes.find(n=>n.attrs['aria-label']?.startsWith('Plant Mine'));
 expect(button.disabled).toBe(true);expect(button.title).toContain('50 MU');expect(button.children[0].textContent).toBe('Need 50 MU');
 expect(button.handlers.click).toBeUndefined();expect(nodes).toHaveLength(12);
});
