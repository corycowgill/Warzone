/**
 * AIWorker — Web Worker for AI strategic and tactical decision-making.
 *
 * Receives a game state snapshot, runs simplified strategic/tactical logic,
 * and returns a list of commands to execute on the main thread.
 *
 * This keeps the main thread free for rendering and micro decisions.
 */

// ============================================================
// Inline mulberry32 PRNG (workers can't import ES modules from CDN)
// ============================================================
function mulberry32Next(state) {
  let t = (state + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: (state + 0x6D2B79F5) | 0 };
}

let _rngState = 0;
function rng() {
  const r = mulberry32Next(_rngState);
  _rngState = r.state;
  return r.value;
}

// ============================================================
// Build order templates
// ============================================================
const BUILD_ORDERS = {
  rush: ['barracks', 'barracks', 'resourcedepot', 'warfactory'],
  boom: ['resourcedepot', 'barracks', 'resourcedepot', 'warfactory', 'resourcedepot', 'airfield', 'techlab'],
  turtle: ['barracks', 'turret', 'resourcedepot', 'warfactory', 'turret', 'aaturret', 'airfield', 'techlab'],
  air: ['barracks', 'resourcedepot', 'warfactory', 'airfield', 'airfield', 'resourcedepot', 'techlab'],
  balanced: ['barracks', 'resourcedepot', 'warfactory', 'airfield', 'resourcedepot', 'shipyard', 'techlab']
};

const NATION_PERSONALITIES = {
  japan: { preferredStrategy: 'air', unitBias: { drone: 2.0, plane: 1.5, infantry: 0.8 }, aggressionMultiplier: 1.3, earlyHarass: true, gracePeriodReduction: 20 },
  germany: { preferredStrategy: 'rush', unitBias: { tank: 2.0, infantry: 1.0 }, aggressionMultiplier: 1.2, earlyHarass: false, gracePeriodReduction: 10 },
  austria: { preferredStrategy: 'boom', unitBias: { infantry: 2.0, tank: 0.8 }, aggressionMultiplier: 1.0, earlyHarass: false, gracePeriodReduction: 0 }
};

// ============================================================
// Worker message handler
// ============================================================
self.onmessage = function(e) {
  const msg = e.data;
  if (msg.type === 'aiDecide') {
    _rngState = msg.state.rngState || 0;
    const commands = runAIDecision(msg.team, msg.state);
    self.postMessage({ type: 'aiCommands', commands: commands, rngState: _rngState });
  }
};

// ============================================================
// Main AI decision entry point
// ============================================================
function runAIDecision(team, state) {
  const commands = [];

  // Run strategic decisions
  runStrategic(team, state, commands);

  // Run tactical decisions
  runTactical(team, state, commands);

  return commands;
}

// ============================================================
// STRATEGIC LAYER
// ============================================================
function runStrategic(team, state, commands) {
  const { myUnits, enemyUnits, sp, difficulty } = state;

  // Analyze enemy composition by type
  const enemyComp = {};
  for (const u of enemyUnits) {
    enemyComp[u.type] = (enemyComp[u.type] || 0) + 1;
  }

  // Compute threat domains
  const landTypes = ['infantry', 'tank', 'mortar', 'scoutcar', 'apc', 'heavytank', 'spg'];
  const airTypes = ['drone', 'plane', 'bomber'];
  const navalTypes = ['battleship', 'carrier', 'submarine', 'patrolboat'];

  let landThreat = 0, airThreat = 0, navalThreat = 0;
  for (const type of landTypes) landThreat += (enemyComp[type] || 0);
  for (const type of airTypes) airThreat += (enemyComp[type] || 0);
  for (const type of navalTypes) navalThreat += (enemyComp[type] || 0);

  // Store for tactical use
  state._enemyComp = enemyComp;
  state._highestThreat = landThreat >= airThreat && landThreat >= navalThreat ? 'land'
    : airThreat >= navalThreat ? 'air' : 'naval';
  state._threatCounts = { land: landThreat, air: airThreat, naval: navalThreat };

  // Counter-build: suggest additional buildings
  const tankCount = (enemyComp.tank || 0) + (enemyComp.heavytank || 0);
  const airCount = (enemyComp.drone || 0) + (enemyComp.plane || 0) + (enemyComp.bomber || 0);
  const hasAirfield = state.myBuildings.some(b => b.type === 'airfield');
  const hasTechLab = state.myBuildings.some(b => b.type === 'techlab');
  const hasShipyard = state.myBuildings.some(b => b.type === 'shipyard');

  if (state._highestThreat === 'air' || airCount >= 3) {
    if (!hasAirfield) {
      commands.push({ cmd: 'queueBuild', buildingType: 'airfield' });
    }
    commands.push({ cmd: 'setCounterBias', bias: { aahalftrack: 2.5, plane: 1.5, infantry: 0.5 } });
    commands.push({ cmd: 'buildDefense', defenseType: 'aaturret' });
  } else if (state._highestThreat === 'land' && tankCount >= 3) {
    if (!hasAirfield) {
      commands.push({ cmd: 'queueBuild', buildingType: 'airfield' });
    }
    commands.push({ cmd: 'setCounterBias', bias: { drone: 2.0, plane: 1.5, aahalftrack: 0.5 } });
  } else if (state._highestThreat === 'land' && (enemyComp.infantry || 0) >= 5) {
    commands.push({ cmd: 'setCounterBias', bias: { tank: 2.0, mortar: 1.5, infantry: 0.5 } });
  } else if (state._highestThreat === 'naval') {
    if (!hasShipyard) {
      commands.push({ cmd: 'queueBuild', buildingType: 'shipyard' });
    }
    commands.push({ cmd: 'setCounterBias', bias: { patrolboat: 1.5, battleship: 1.5, submarine: 1.2 } });
  } else {
    commands.push({ cmd: 'setCounterBias', bias: null });
  }

  // On hard, rush tech lab for counters
  if (difficulty === 'hard' && !hasTechLab) {
    if (state._highestThreat === 'air' || (state._highestThreat === 'land' && tankCount >= 4)) {
      commands.push({ cmd: 'queueBuild', buildingType: 'techlab' });
    }
  }

  // Adjust attack cooldown
  if (enemyUnits.length > myUnits.length * 1.5) {
    commands.push({ cmd: 'setAttackCooldown', value: 45 });
  } else if (sp > 1000 && myUnits.length >= 8) {
    commands.push({ cmd: 'setAttackCooldown', value: 20 });
  } else {
    commands.push({ cmd: 'setAttackCooldown', value: 30 });
  }
}

// ============================================================
// TACTICAL LAYER
// ============================================================
function runTactical(team, state, commands) {
  const { myUnits, myBuildings, enemyUnits, enemyBuildings, sp, mu, gameTime,
          difficulty, strategy, gracePeriod, nation, attackWaveCount,
          lastAttackTime, attackCooldown, hasWater, maxUnitsPerTeam,
          buildOrderIndex, chosenBuildOrder, personality, config } = state;

  const enemyComp = state._enemyComp || {};

  // --- Ensure barracks ---
  const hasBarracks = myBuildings.some(b => b.type === 'barracks');
  if (!hasBarracks) {
    commands.push({ cmd: 'build', buildingType: 'barracks' });
  }

  // --- Build next structure from build order ---
  if (chosenBuildOrder && buildOrderIndex < chosenBuildOrder.length) {
    const nextType = chosenBuildOrder[buildOrderIndex];
    // Check if we already have this building (skip non-duplicatable)
    if (nextType !== 'resourcedepot' && nextType !== 'turret' && nextType !== 'aaturret' && nextType !== 'wall') {
      const existing = myBuildings.some(b => b.type === nextType);
      if (existing) {
        commands.push({ cmd: 'advanceBuildOrder' });
      } else {
        commands.push({ cmd: 'build', buildingType: nextType });
      }
    } else {
      commands.push({ cmd: 'build', buildingType: nextType });
    }
  } else {
    // Build order complete - add resource depots
    const depots = myBuildings.filter(b => b.type === 'resourcedepot').length;
    if (depots < 4 && sp > 400) {
      commands.push({ cmd: 'build', buildingType: 'resourcedepot' });
    }
  }

  // --- Build defenses (turtle strategy or hard difficulty) ---
  if (strategy === 'turtle' || difficulty === 'hard') {
    const turretCount = myBuildings.filter(b => b.type === 'turret').length;
    const aaTurretCount = myBuildings.filter(b => b.type === 'aaturret').length;
    if (turretCount < 3 && sp > 400 && hasBarracks) {
      commands.push({ cmd: 'buildDefense', defenseType: 'turret' });
    }
    if (aaTurretCount < 2 && sp > 500 && myBuildings.some(b => b.type === 'warfactory')) {
      commands.push({ cmd: 'buildDefense', defenseType: 'aaturret' });
    }
  }

  // --- Munitions caches ---
  const caches = myBuildings.filter(b => b.type === 'munitionscache').length;
  if (caches < 2 && sp > 400 && (mu || 0) < 50 && hasBarracks) {
    commands.push({ cmd: 'build', buildingType: 'munitionscache' });
  }

  // --- Produce units ---
  if (myUnits.length < (maxUnitsPerTeam || 50)) {
    for (const building of myBuildings) {
      if (!building.produces || building.produces.length === 0) continue;
      if (building.hasProduction) continue; // already producing

      let unitType = null;

      if (building.type === 'headquarters') {
        const hasCommander = myUnits.some(u => u.type === 'commander');
        if (!hasCommander && sp >= 500 && (mu || 0) >= 200 && building.canProduce) {
          unitType = 'commander';
        } else {
          unitType = chooseBarracksUnit(myUnits);
        }
      } else if (building.type === 'barracks') {
        unitType = chooseBarracksUnit(myUnits);
      } else if (building.type === 'warfactory') {
        unitType = chooseFactoryUnit(myUnits, enemyComp, gameTime, myBuildings);
      } else if (building.type === 'airfield') {
        unitType = chooseAirUnit(myUnits, strategy, myBuildings);
      } else if (building.type === 'shipyard' && hasWater) {
        unitType = chooseNavalUnit(myUnits, enemyComp);
      }

      // Apply nation personality unit bias
      if (personality && personality.unitBias && unitType) {
        for (const [biasType, weight] of Object.entries(personality.unitBias)) {
          if (weight > 1.0 && building.produces.includes(biasType) && rng() < (weight - 1.0)) {
            unitType = biasType;
            break;
          }
        }
      }

      // Apply counter-production bias
      if (state._counterBias && unitType) {
        for (const [biasType, weight] of Object.entries(state._counterBias)) {
          if (weight > 1.0 && building.produces.includes(biasType) && rng() < (weight - 1.0) * 0.5) {
            unitType = biasType;
            break;
          }
        }
      }

      if (unitType) {
        commands.push({ cmd: 'produce', buildingId: building.id, unitType: unitType });
      }
    }
  }

  // --- Supply Exchange ---
  if (gameTime > 120 && sp > 400) {
    const hasExchange = myBuildings.some(b => b.type === 'supplyexchange');
    const hasHQ = myBuildings.some(b => b.type === 'headquarters');
    if (!hasExchange && hasHQ) {
      commands.push({ cmd: 'build', buildingType: 'supplyexchange' });
    }
  }

  // --- Resource exchange ---
  if (myBuildings.some(b => b.type === 'supplyexchange')) {
    if (sp > 500 && (mu || 0) < 30) {
      commands.push({ cmd: 'exchange', direction: 'sp_to_mu' });
    } else if ((mu || 0) > 150 && sp < 200) {
      commands.push({ cmd: 'exchange', direction: 'mu_to_sp' });
    }
  }

  // --- Superweapon ---
  if (gameTime > 180) {
    const hasSuperweapon = myBuildings.some(b => b.type === 'superweapon');
    const hasWarFactory = myBuildings.some(b => b.type === 'warfactory');
    if (!hasSuperweapon && hasWarFactory && sp > 1000) {
      commands.push({ cmd: 'build', buildingType: 'superweapon' });
    }
    // Fire if charged
    const chargedSW = myBuildings.find(b => b.type === 'superweapon' && b.isCharged);
    if (chargedSW) {
      // Target enemy HQ position or first enemy building
      const hqBuilding = enemyBuildings.find(b => b.type === 'headquarters');
      const target = hqBuilding || enemyBuildings[0];
      if (target) {
        commands.push({ cmd: 'fireSuperweapon', buildingId: chargedSW.id, targetX: target.x, targetZ: target.z });
      }
    }
  }

  // --- Consider attack ---
  if (gameTime >= (gracePeriod || 75)) {
    const idleUnits = myUnits.filter(u => !u.inCombat && !u.isMoving);
    const thresholdMult = config?.attackThresholdMultiplier || 1.0;
    let attackThreshold;
    switch (strategy) {
      case 'rush': attackThreshold = Math.floor(6 * thresholdMult); break;
      case 'turtle': attackThreshold = Math.floor(14 * thresholdMult); break;
      case 'air': attackThreshold = Math.floor(8 * thresholdMult); break;
      default: attackThreshold = Math.floor(10 * thresholdMult); break;
    }
    if (personality && personality.aggressionMultiplier) {
      attackThreshold = Math.floor(attackThreshold / personality.aggressionMultiplier);
    }
    const minUnits = (attackWaveCount || 0) === 0 ? 5 : 3;

    if (idleUnits.length >= attackThreshold || (lastAttackTime || 0) > (attackCooldown || 30)) {
      if (idleUnits.length >= minUnits) {
        // Find priority target
        const target = findPriorityTarget(enemyBuildings, config);
        if (target) {
          const unitIds = idleUnits.map(u => u.id);
          if (config?.multiPronged && idleUnits.length >= 8) {
            // Multi-pronged: split into main and flank
            const midpoint = Math.floor(unitIds.length * 0.6);
            const mainIds = unitIds.slice(0, midpoint);
            const flankIds = unitIds.slice(midpoint);
            commands.push({ cmd: 'attack', unitIds: mainIds, targetX: target.x, targetZ: target.z });
            // Secondary target
            const secondary = findSecondaryTarget(enemyBuildings);
            if (secondary && flankIds.length >= 2) {
              commands.push({ cmd: 'attack', unitIds: flankIds, targetX: secondary.x, targetZ: secondary.z });
            } else if (flankIds.length >= 2) {
              const ox = (rng() > 0.5 ? 1 : -1) * 30;
              const oz = (rng() > 0.5 ? 1 : -1) * 30;
              commands.push({ cmd: 'attack', unitIds: flankIds, targetX: target.x + ox, targetZ: target.z + oz });
            }
          } else {
            commands.push({ cmd: 'attack', unitIds: unitIds, targetX: target.x, targetZ: target.z });
          }
          commands.push({ cmd: 'resetAttackTimer' });
        }
      }
    }
  }

  // --- Early harassment for aggressive nations ---
  if (personality && personality.earlyHarass && gameTime > 60 && gameTime < (gracePeriod || 75)) {
    const harassDrones = myUnits.filter(u => u.type === 'drone' && !u.inCombat && !u.isMoving);
    if (harassDrones.length >= 2) {
      const target = enemyBuildings.find(b => b.type === 'resourcedepot') || enemyBuildings[0];
      if (target) {
        commands.push({
          cmd: 'attack',
          unitIds: harassDrones.slice(0, 2).map(u => u.id),
          targetX: target.x,
          targetZ: target.z
        });
      }
    }
  }

  // --- Research ---
  if (sp >= 250 && !state.research?.inProgress) {
    const completed = state.research?.completed || [];
    // Branch research
    const hasTechLab = myBuildings.some(b => b.type === 'techlab');
    if (hasTechLab && sp >= 400) {
      const domains = ['infantry', 'armor', 'air', 'naval'];
      for (const domain of domains) {
        const branches = state.research?.branches || {};
        if (branches[domain]) continue;
        const branchKey = rng() < 0.5 ? 'branchA' : 'branchB';
        commands.push({ cmd: 'researchBranch', domain: domain, branchKey: branchKey });
        break; // one at a time
      }
    }

    // Standard research priorities
    const priorities = ['improved_armor', 'heavy_shells', 'rapid_fire', 'field_medics',
                        'advanced_optics', 'jet_engines', 'naval_plating', 'supply_lines',
                        'fortified_bunkers', 'blitz_training'];
    for (const id of priorities) {
      if (completed.includes(id)) continue;
      commands.push({ cmd: 'research', upgradeId: id });
      break;
    }
  }

  // --- Building upgrades ---
  if (sp >= 300) {
    for (const b of myBuildings) {
      if (b.canUpgrade) {
        commands.push({ cmd: 'upgrade', buildingId: b.id });
        break; // one per tick
      }
    }
  }

  // --- Build near resource nodes ---
  if (gameTime > 60 && sp > 300 && state.resourceNodes && state.resourceNodes.length > 0) {
    commands.push({ cmd: 'considerBuildNearNode' });
  }

  // --- Opportunistic raids ---
  if (config?.targetPriority && gameTime > (gracePeriod || 75) + 30) {
    // Check if enemy base is undefended
    if (enemyUnits.length > 3 && enemyBuildings.length > 0) {
      const hqBuilding = enemyBuildings.find(b => b.type === 'headquarters');
      if (hqBuilding) {
        const nearHQ = enemyUnits.filter(u => {
          const dx = u.x - hqBuilding.x;
          const dz = u.z - hqBuilding.z;
          return Math.sqrt(dx * dx + dz * dz) < 50;
        });
        if (nearHQ.length < enemyUnits.length * 0.25) {
          const idleUnits = myUnits.filter(u => !u.inCombat && !u.isMoving);
          if (idleUnits.length >= 3) {
            commands.push({
              cmd: 'attack',
              unitIds: idleUnits.slice(0, Math.min(5, idleUnits.length)).map(u => u.id),
              targetX: hqBuilding.x,
              targetZ: hqBuilding.z
            });
          }
        }
      }
    }
  }
}

// ============================================================
// Unit choice helpers
// ============================================================
function chooseBarracksUnit(myUnits) {
  const infantry = myUnits.filter(u => u.type === 'infantry').length;
  const mortars = myUnits.filter(u => u.type === 'mortar').length;
  const engineers = myUnits.filter(u => u.type === 'engineer').length;
  if (engineers < 1 && infantry > 2 && rng() < 0.3) return 'engineer';
  if (engineers < 2 && infantry > 6 && rng() < 0.15) return 'engineer';
  if (mortars < 2 && infantry > 3 && rng() < 0.3) return 'mortar';
  return 'infantry';
}

function chooseFactoryUnit(myUnits, enemyComp, gameTime, myBuildings) {
  const tanks = myUnits.filter(u => u.type === 'tank').length;
  const heavyTanks = myUnits.filter(u => u.type === 'heavytank').length;
  const spgs = myUnits.filter(u => u.type === 'spg').length;
  const aaHTs = myUnits.filter(u => u.type === 'aahalftrack').length;
  const apcs = myUnits.filter(u => u.type === 'apc').length;
  const scoutcars = myUnits.filter(u => u.type === 'scoutcar').length;
  const hasTechLab = myBuildings.some(b => b.type === 'techlab');

  if (scoutcars < 1 && gameTime < 120) return 'scoutcar';

  const airCount = (enemyComp.drone || 0) + (enemyComp.plane || 0) + (enemyComp.bomber || 0);
  if (airCount > 2 && aaHTs < 2) return 'aahalftrack';

  if (hasTechLab) {
    if (heavyTanks < 2 && rng() < 0.3) return 'heavytank';
    if (spgs < 1 && rng() < 0.2) return 'spg';
  }

  const infantryCount = myUnits.filter(u => u.type === 'infantry').length;
  if (apcs < 1 && infantryCount > 6 && rng() < 0.2) return 'apc';

  return 'tank';
}

function chooseAirUnit(myUnits, strategy, myBuildings) {
  const drones = myUnits.filter(u => u.type === 'drone').length;
  const planes = myUnits.filter(u => u.type === 'plane').length;
  const bombers = myUnits.filter(u => u.type === 'bomber').length;
  const hasTechLab = myBuildings.some(b => b.type === 'techlab');

  if (hasTechLab && bombers < 1 && rng() < 0.3) return 'bomber';
  if (strategy === 'air') return planes < drones ? 'plane' : 'drone';
  return drones < 3 ? 'drone' : 'plane';
}

function chooseNavalUnit(myUnits, enemyComp) {
  const battleships = myUnits.filter(u => u.type === 'battleship').length;
  const subs = myUnits.filter(u => u.type === 'submarine').length;
  const carriers = myUnits.filter(u => u.type === 'carrier').length;
  const patrolBoats = myUnits.filter(u => u.type === 'patrolboat').length;

  const enemySubs = enemyComp.submarine || 0;
  if (enemySubs > 0 && patrolBoats < Math.max(2, enemySubs)) return 'patrolboat';
  if (patrolBoats < 2 && battleships === 0) return 'patrolboat';
  if (battleships < 2) return 'battleship';
  if (subs < 2) return 'submarine';
  if (carriers < 1) return 'carrier';
  if (battleships <= subs) return 'battleship';
  if (subs <= carriers) return 'submarine';
  return 'carrier';
}

// ============================================================
// Target selection helpers
// ============================================================
function findPriorityTarget(enemyBuildings, config) {
  if (!config || !config.targetPriority) {
    const hq = enemyBuildings.find(b => b.type === 'headquarters');
    return hq || null;
  }

  const priorities = ['warfactory', 'airfield', 'barracks', 'resourcedepot', 'headquarters'];
  for (const pType of priorities) {
    const target = enemyBuildings.find(b => b.type === pType);
    if (target) return target;
  }
  return enemyBuildings[0] || null;
}

function findSecondaryTarget(enemyBuildings) {
  const depots = enemyBuildings.filter(b => b.type === 'resourcedepot');
  if (depots.length > 0) return depots[0];

  const prod = enemyBuildings.filter(b =>
    b.type === 'barracks' || b.type === 'warfactory' || b.type === 'airfield'
  );
  if (prod.length > 0) return prod[prod.length - 1];

  const hq = enemyBuildings.find(b => b.type === 'headquarters');
  return hq || null;
}
