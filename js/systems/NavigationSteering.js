// Local steering remains inside the same terrain/wall grid used by A*.
export function canTraverse(unit,x,z){
  const game=unit.game,terrain=game?.terrain;
  if(unit.domain==='air'||!terrain)return true;
  const pos=unit.getPosition(),distance=Math.hypot(x-pos.x,z-pos.z);
  const steps=Math.max(1,Math.ceil(distance/((terrain.worldScale??2)*.3)));
  for(let i=1;i<=steps;i++){
    const px=pos.x+(x-pos.x)*i/steps,pz=pos.z+(z-pos.z)*i/steps;
    if(game.pathfinding?.isPassable){
      const grid=terrain.worldToGrid(px,pz);
      if(!game.pathfinding.isPassable(grid.x,grid.z,unit.domain))return false;
    }else if(unit.domain==='naval'?!terrain.isWater(px,pz):terrain.isWalkable?!terrain.isWalkable(px,pz):terrain.isWater(px,pz))return false;
  }
  return true;
}
export function steerStep(unit,dx,dz,amount,sepX=0,sepZ=0){
  const pos=unit.getPosition(),distance=Math.hypot(dx,dz);
  if(distance<1e-8)return null;
  amount=Math.min(amount,distance);
  const sx=dx/distance+sepX*.8,sz=dz/distance+sepZ*.8,len=Math.hypot(sx,sz)||1;
  const options=[[sx/len,sz/len],[dx/distance,dz/distance]];
  // Sliding is a last resort; never turn an invalid diagonal into corner cutting.
  options.push(Math.abs(dx)>Math.abs(dz)?[Math.sign(dx),0]:[0,Math.sign(dz)]);
  for(const [vx,vz] of options){const x=pos.x+vx*amount,z=pos.z+vz*amount;if(canTraverse(unit,x,z))return {x,z};}
  return null;
}
export function separationVector(unit,other){
  let x=unit.getPosition().x-other.getPosition().x,z=unit.getPosition().z-other.getPosition().z;
  let distance=Math.hypot(x,z);
  if(distance<1e-6){
    // Opposite, deterministic directions for exactly overlapping pairs.
    const a=Math.min(unit.id,other.id),b=Math.max(unit.id,other.id),angle=((a*73856093^b*19349663)>>>0)%6283/1000;
    const sign=unit.id<other.id?1:-1;x=Math.cos(angle)*sign;z=Math.sin(angle)*sign;distance=0;
  }else{x/=distance;z/=distance;}
  return {x,z,distance};
}
