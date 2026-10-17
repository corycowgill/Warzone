export function isEditing(event){
  return !!(event.isComposing||event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
}
export function localTeam(game){return game.isMultiplayer?game.getLocalTeam():game.mode==='2P'?game.activeTeam:'player';}
export function screenToNDC(canvas,x,y){
  const r=canvas.getBoundingClientRect();
  return {x:(x-r.left)/r.width*2-1,y:-(y-r.top)/r.height*2+1};
}
