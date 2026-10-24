import {it,expect,vi,afterEach} from 'vitest';
import {ProductionPanel} from '../../js/ui/ProductionPanel.js';
class Node {
 constructor(){this.children=[];this.style={};this.dataset={};this.handlers={};this.classList={remove(){},add(){}};}
 set innerHTML(value){this.html=value;this.children=[];}
 get innerHTML(){return this.html;}
 append(...nodes){this.children.push(...nodes);}appendChild(node){this.children.push(node);}
 replaceChildren(){this.children=[];}
 setAttribute(){}addEventListener(name,callback){this.handlers[name]=callback;}
 contains(node){return this.children.some(child=>child===node||child.contains(node));}
 querySelector(selector){return this.children.find(child=>'.'+child.className===selector)??this.children.map(child=>child.querySelector(selector)).find(Boolean)??null;}
 focus(){document.activeElement=this;}
}
function setup(){
 const ids=Object.fromEntries(['production-panel','production-options','production-queue','prod-queue-icons'].map(id=>[id,new Node()]));
 const create=vi.fn(()=>new Node());vi.stubGlobal('document',{getElementById:id=>ids[id]??null,createElement:create,activeElement:null});
 let affordable=true;const game={mode:'1P',teams:{player:{nation:'america'}},resourceSystem:{canAffordBoth:()=>affordable},productionSystem:{hasTechRequirements:()=>true}};
 const panel=new ProductionPanel({game,formatName:x=>x,getPlayerNation:()=> 'america',buildPanel:{buildMenuOpen:false}});
 const building={team:'player',alive:true,produces:['infantry'],getRemainingTime:()=>3};
 return {panel,building,ids,create,setAffordable:value=>affordable=value};
}
afterEach(()=>vi.unstubAllGlobals());
it('reuses training buttons across repeated HUD refreshes and refreshes availability when it changes',()=>{
 const {panel,building,ids,create,setAffordable}=setup();panel.showProductionButtons(building);const first=ids['production-options'].children[0],created=create.mock.calls.length;
 for(let i=0;i<100;i++)panel.showProductionButtons(building);
 expect(ids['production-options'].children[0]).toBe(first);expect(create).toHaveBeenCalledTimes(created);
 setAffordable(false);panel.showProductionButtons(building);expect(ids['production-options'].children[0]).not.toBe(first);
});
it('updates queue progress without replacing a focused cancel button',()=>{
 const {panel,building,ids}=setup(),queue=[{type:'infantry',isCurrent:true,progress:0}];panel.populateQueueIcons(building,queue);const button=ids['prod-queue-icons'].children[0];button.focus();
 panel.populateQueueIcons(building,[{...queue[0],progress:.5}]);expect(ids['prod-queue-icons'].children[0]).toBe(button);expect(document.activeElement).toBe(button);expect(button.querySelector('.queue-item-progress').style.width).toBe('50%');
});
it('moves queue focus to a remaining item after cancellation and hides an empty queue',()=>{
 const {panel,building,ids}=setup(),queue=[{type:'infantry',isCurrent:true,progress:.2},{type:'engineer',isCurrent:false,progress:0}];
 panel.populateQueueIcons(building,queue);ids['prod-queue-icons'].children[1].focus();panel.populateQueueIcons(building,queue.slice(0,1));expect(document.activeElement).toBe(ids['prod-queue-icons'].children[0]);panel.populateQueueIcons(building,[]);expect(ids['production-queue'].hidden).toBe(true);
});
