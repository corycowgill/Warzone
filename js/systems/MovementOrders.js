// One movement transaction per unit. Async results may only finish their own order.
export function issueUnitMove(unit, destination, game, {attackMove = false, formationSpeed = null, recovery = false} = {}) {
  if (!unit.alive || unit._siegeMode || unit.isGarrisoned || unit.speed <= 0 || unit.empDisabledTimer > 0) return;
  if(!recovery)unit._routeRecoveryAttempts=0;
  const patrol = recovery && unit._isPatrolling ? {points: unit._patrolPoints, index: unit._patrolIndex} : null;
  unit.moveTo(destination);
  if (patrol) {
    unit._isPatrolling = true;
    unit._patrolPoints = patrol.points;
    unit._patrolIndex = patrol.index;
  }
  unit.formationSpeed = formationSpeed;
  unit._attackMove = attackMove;
  unit._attackMoveDestination = attackMove ? destination.clone() : null;
  const revision = unit._orderRevision;
  const paths = game.pathfinding;
  if (unit.domain === 'air' || !paths) return;
  const start = unit.getPosition().clone();
  const goal = destination.clone();
  // Wait for a valid route rather than walking straight through water or walls.
  unit.moveTarget = null;
  unit.isMoving = false;
  unit._pathPending = true;
  unit._pendingMoveGoal = goal;
  const apply = path => {
    if (!unit.alive || unit._orderRevision !== revision || game.pathfinding !== paths) return;
    unit._pathPending = false;
    unit._pendingMoveGoal = null;
    if (unit.attackTarget) return;
    if (path?.length) {
      if(unit.isRetreating)unit.retreatTarget=path[path.length-1].clone();
      if (attackMove) unit._attackMoveDestination = path[path.length - 1].clone();
      const queued = unit.waypoints;
      unit.followPath([...path, ...queued]);
    } else {
      unit._isPatrolling = false;
      unit._patrolPoints = [];
      unit.isRetreating=false;unit.retreatTarget=null;
      unit.waypoints = [];
      unit._attackMove = false;
      unit._attackMoveDestination = null;
      unit.formationSpeed = null;
      game.eventBus?.emit('command:blocked', {unit, position: goal});
      const team = game.isMultiplayer ? game.getLocalTeam() : game.mode === '2P' ? game.activeTeam : 'player';
      if (game.mode !== 'SPECTATE' && unit.team === team && Date.now() - (game._blockedOrderAt || 0) >= 1500) {
        game._blockedOrderAt = Date.now();
        game.eventBus?.emit('notification', {message:'No route to that destination. Try a crossing or another approach.',color:'#e1bd7b'});
      }
    }
  };
  try {
    // Worker completion timing must never affect multiplayer simulation state.
    if (game.isMultiplayer) apply(paths.findPathForDomain(start, goal, unit.domain));
    else Promise.resolve(paths.findPathAsync(start, goal, unit.domain)).then(apply, () => apply(null));
  } catch {
    apply(null);
  }
}

// Preserve a patrol assignment while each leg uses the authoritative routed move transaction.
export function issuePatrolLeg(unit, points, index, game) {
  if (!unit.alive || unit._siegeMode || unit.isGarrisoned || unit.speed <= 0 || unit.empDisabledTimer > 0) return;
  issueUnitMove(unit, points[index], game, {attackMove: true});
  // A synchronous failed route has already canceled the movement transaction.
  if (!unit._attackMove) return;
  unit._patrolPoints = points;
  unit._patrolIndex = index;
  unit._isPatrolling = true;
}
