import {isEditing,localTeam} from '../systems/InputPolicy.js';
// Avoid B (construction), Q/E (orbit), W/S (pan), T (tech) and R (research).
export const PRODUCTION_HOTKEYS=Object.freeze({infantry:'I',tank:'K',drone:'J',plane:'L',battleship:'N',carrier:'C',submarine:'U',mortar:'M',scoutcar:'O',aahalftrack:'X',apc:'A',heavytank:'H',spg:'G',bomber:'Y',patrolboat:'P',engineer:'V',commander:'Z'});
export function productionShortcut(game,event){
 if(game.state!=='PLAYING'||game.mode==='SPECTATE'||isEditing(event)||event.repeat||event.ctrlKey||event.altKey||event.metaKey)return null;
 const selected=(game.selectionManager?.getSelected()??[]).filter(entity=>entity.alive&&entity.team===localTeam(game));
 // Mixed selections keep unit orders; training requires only buildings selected.
 if(selected.some(entity=>entity.isUnit))return null;
 const type=Object.keys(PRODUCTION_HOTKEYS).find(type=>PRODUCTION_HOTKEYS[type]===event.key.toUpperCase());
 if(!type)return null;
 const building=selected.find(entity=>entity.isBuilding&&!entity._constructing&&entity.produces?.includes(type));
 return building?{building,type,count:event.shiftKey?5:1}:null;
}
