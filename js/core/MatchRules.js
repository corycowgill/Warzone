import {AI_DIFFICULTY} from './Constants.js';
export function incomeMultiplier(game,team){
  if(game.mode==='2P')return 1;
  if(game.mode!=='SPECTATE'&&(game.isMultiplayer||team!=='enemy'))return 1;
  return Math.max(0,1+(AI_DIFFICULTY[game.aiDifficulty]?.resourceBonus??0));
}
export function difficultyDamage(game,team){
  // Human assist settings are not a side advantage in an AI exhibition or PvP.
  if(game.mode==='SPECTATE'||game.mode==='2P'||game.isMultiplayer)return 1;
  const difficulty=game._difficultyConfig;
  return team==='enemy'?(difficulty?.aiDamageMult??1):(difficulty?.playerDamageMult??1);
}
