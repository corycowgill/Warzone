import {Frustum,Matrix4,Sphere} from 'three';
const frustum=new Frustum(),projection=new Matrix4(),bounds=new Sphere();
export function needsHealthOverlay(entity){
 return entity.alive&&!entity.isGarrisoned&&entity.mesh?.visible!==false&&(
  entity.selected||entity.health<entity.maxHealth||entity.attackTarget?.alive||entity.isRetreating||entity.empDisabledTimer>0||entity._constructing
 );
}
// Presentation runs once per displayed frame, never once per simulation catch-up step.
export function updateEntityOverlays(entities,camera){
 camera.updateMatrixWorld();
 projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
 for(const entity of entities){
  if(!entity.healthBar)continue;
  let visible=needsHealthOverlay(entity);
  if(visible&&entity.mesh){
   bounds.center.copy(entity.mesh.position);bounds.center.y+=entity.healthBar.position.y;bounds.radius=5;
   visible=frustum.intersectsSphere(bounds);
  }
  if(!visible){entity.healthBar.visible=false;if(entity._typeLabel)entity._typeLabel.visible=false;continue;}
  entity.updateHealthBar(camera);
 }
}
