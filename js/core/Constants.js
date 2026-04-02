export const UNIT_STATS = {
  infantry: { hp: 50, speed: 3, damage: 8, range: 6, cost: 50, domain: 'land', buildTime: 3, attackRate: 1.5, armor: 0, vision: 10 },
  tank: { hp: 200, speed: 4, damage: 35, range: 10, cost: 200, domain: 'land', buildTime: 6, attackRate: 0.8, armor: 3, vision: 12 },
  drone: { hp: 80, speed: 7, damage: 15, range: 8, cost: 150, domain: 'air', buildTime: 4, attackRate: 2.0, armor: 0, vision: 14 },
  plane: { hp: 150, speed: 10, damage: 50, range: 12, cost: 300, domain: 'air', buildTime: 8, attackRate: 0.5, armor: 1, vision: 16 },
  battleship: { hp: 400, speed: 2, damage: 60, range: 18, cost: 500, domain: 'naval', buildTime: 10, attackRate: 0.4, armor: 5, vision: 20 },
  carrier: { hp: 500, speed: 1.5, damage: 10, range: 5, cost: 600, domain: 'naval', buildTime: 12, attackRate: 0.3, armor: 4, vision: 22 },
  submarine: { hp: 150, speed: 3, damage: 80, range: 8, cost: 350, domain: 'naval', buildTime: 8, attackRate: 0.6, armor: 2, vision: 10 }
};

export const BUILDING_STATS = {
  headquarters: { hp: 1000, cost: 0, produces: ['infantry'], size: 4, requires: [] },
  barracks: { hp: 400, cost: 200, produces: ['infantry'], size: 2, requires: [] },
  warfactory: { hp: 600, cost: 400, produces: ['tank'], size: 3, requires: ['barracks'] },
  airfield: { hp: 500, cost: 500, produces: ['drone', 'plane'], size: 3, requires: ['warfactory'] },
  shipyard: { hp: 500, cost: 450, produces: ['battleship', 'carrier', 'submarine'], size: 3, requires: ['barracks'] },
  resourcedepot: { hp: 300, cost: 300, produces: [], size: 2, income: 8, requires: [] },
  supplydepot: { hp: 200, cost: 150, produces: [], size: 1, income: 4, requires: [] },
  bunker: { hp: 600, cost: 200, produces: [], size: 2, requires: ['barracks'], damage: 15, range: 10, attackRate: 1.0, armor: 4, targetDomain: 'ground', garrisonSlots: 4 },
  ditch: { hp: 100, cost: 0, buildTime: 5, size: 1, damageReduction: 0.5, rangeBonus: 0.25, requires: [] },
  turret: { hp: 350, cost: 250, produces: [], size: 1, requires: ['barracks'], damage: 25, range: 12, attackRate: 1.2, armor: 2, targetDomain: 'ground' },
  aaturret: { hp: 300, cost: 300, produces: [], size: 1, requires: ['warfactory'], damage: 30, range: 14, attackRate: 1.5, armor: 1, targetDomain: 'air' },
  wall: { hp: 500, cost: 50, produces: [], size: 1, requires: [], armor: 5, blocksMovement: true }
};

// Tech tree: which buildings unlock which units
export const TECH_TREE = {
  infantry: { building: 'barracks', requires: [] },
  tank: { building: 'warfactory', requires: ['barracks'] },
  drone: { building: 'airfield', requires: ['warfactory'] },
  plane: { building: 'airfield', requires: ['warfactory'] },
  battleship: { building: 'shipyard', requires: ['barracks'] },
  carrier: { building: 'shipyard', requires: ['warfactory'] },
  submarine: { building: 'shipyard', requires: ['barracks'] }
};

// ============================================================
// NATION BONUSES - Each nation gets unique gameplay modifiers
// ============================================================
export const NATIONS = {
  america: {
    name: 'America',
    color: 0x3355ff,
    side: 'allied',
    description: 'Versatile forces with superior infantry firepower',
    bonuses: {
      infantryDamage: 1.15,     // +15% infantry damage
      tankDamage: 1.0,
      tankSpeed: 1.10,          // +10% tank speed
      productionSpeed: 1.05,    // +5% faster production
      incomeBonus: 0,
      allArmor: 1.0,
      airDamage: 1.0,
      airSpeed: 1.0,
      navalHP: 1.0,
      costReduction: 1.0
    }
  },
  britain: {
    name: 'Great Britain',
    color: 0x33aa33,
    side: 'allied',
    description: 'Defensive mastery with strong armor and naval tradition',
    bonuses: {
      infantryDamage: 1.0,
      tankDamage: 1.0,
      tankSpeed: 1.0,
      productionSpeed: 1.0,
      incomeBonus: 2,           // +2 SP/s base income
      allArmor: 1.25,           // +25% armor effectiveness
      airDamage: 1.0,
      airSpeed: 1.0,
      navalHP: 1.15,            // +15% naval HP
      costReduction: 1.0
    }
  },
  france: {
    name: 'France',
    color: 0x6666ff,
    side: 'allied',
    description: 'Economic powerhouse with cost-efficient production',
    bonuses: {
      infantryDamage: 1.0,
      tankDamage: 1.0,
      tankSpeed: 1.0,
      productionSpeed: 1.10,    // +10% faster production
      incomeBonus: 4,           // +4 SP/s base income
      allArmor: 1.0,
      airDamage: 1.0,
      airSpeed: 1.0,
      navalHP: 1.0,
      costReduction: 0.90       // 10% cheaper units
    }
  },
  japan: {
    name: 'Japan',
    color: 0xff3333,
    side: 'enemy',
    description: 'Air and naval supremacy with fast strike capability',
    bonuses: {
      infantryDamage: 1.0,
      tankDamage: 1.0,
      tankSpeed: 1.0,
      productionSpeed: 1.0,
      incomeBonus: 0,
      allArmor: 1.0,
      airDamage: 1.20,          // +20% air damage
      airSpeed: 1.15,           // +15% air speed
      navalHP: 1.20,            // +20% naval HP
      costReduction: 1.0
    }
  },
  germany: {
    name: 'Germany',
    color: 0x666666,
    side: 'enemy',
    description: 'Armored blitzkrieg with devastating tank warfare',
    bonuses: {
      infantryDamage: 1.0,
      tankDamage: 1.15,         // +15% tank damage
      tankSpeed: 1.15,          // +15% tank speed
      productionSpeed: 1.0,
      incomeBonus: 0,
      allArmor: 1.20,           // +20% armor effectiveness
      airDamage: 1.0,
      airSpeed: 1.0,
      navalHP: 1.0,
      costReduction: 1.0
    }
  },
  austria: {
    name: 'Austria',
    color: 0xcc6633,
    side: 'enemy',
    description: 'Rapid mobilization with overwhelming numbers',
    bonuses: {
      infantryDamage: 1.10,     // +10% infantry damage
      tankDamage: 1.0,
      tankSpeed: 1.0,
      productionSpeed: 1.20,    // +20% faster production
      incomeBonus: 2,           // +2 SP/s base income
      allArmor: 1.0,
      airDamage: 1.0,
      airSpeed: 1.0,
      navalHP: 1.0,
      costReduction: 1.0
    }
  }
};

export const DAMAGE_MODIFIERS = {
  infantry: { infantry: 1.0, tank: 0.3, drone: 0.5, plane: 0.3, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.5 },
  tank: { infantry: 1.5, tank: 1.0, drone: 0.3, plane: 0.2, battleship: 0.3, carrier: 0.3, submarine: 0.1, building: 1.5 },
  drone: { infantry: 1.2, tank: 0.8, drone: 1.0, plane: 0.7, battleship: 0.5, carrier: 0.5, submarine: 0.8, building: 0.8 },
  plane: { infantry: 1.5, tank: 1.5, drone: 1.3, plane: 1.0, battleship: 1.2, carrier: 1.2, submarine: 1.0, building: 1.5 },
  battleship: { infantry: 1.5, tank: 1.2, drone: 0.5, plane: 0.3, battleship: 1.0, carrier: 1.0, submarine: 0.5, building: 2.0 },
  carrier: { infantry: 0.5, tank: 0.3, drone: 0.8, plane: 0.8, battleship: 0.3, carrier: 0.3, submarine: 0.3, building: 0.3 },
  submarine: { infantry: 0.1, tank: 0.1, drone: 0.3, plane: 0.1, battleship: 2.0, carrier: 2.0, submarine: 1.0, building: 0.5 },
  turret: { infantry: 1.5, tank: 1.0, drone: 0.3, plane: 0.2, battleship: 0.5, carrier: 0.5, submarine: 0.3, building: 0.5 },
  aaturret: { infantry: 0.3, tank: 0.2, drone: 2.0, plane: 2.0, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.2 },
  bunker: { infantry: 1.2, tank: 0.6, drone: 0.4, plane: 0.3, battleship: 0.3, carrier: 0.3, submarine: 0.2, building: 0.3 }
};

// ============================================================
// UNIT ABILITIES - Active abilities per unit type
// ============================================================
export const UNIT_ABILITIES = {
  infantry: {
    id: 'grenade',
    name: 'Grenade',
    key: 'g',
    cooldown: 8,
    range: 10,
    radius: 6,
    damage: 25,
    description: 'Throw a grenade dealing 25 AOE damage (8s cooldown)'
  },
  tank: {
    id: 'siege_mode',
    name: 'Siege Mode',
    key: 'g',
    cooldown: 1,
    duration: 0,
    rangeBonus: 1.5,
    damageBonus: 1.4,
    speedPenalty: 0,
    description: 'Toggle: +50% range, +40% damage, but cannot move'
  },
  drone: {
    id: 'emp',
    name: 'EMP Pulse',
    key: 'g',
    cooldown: 12,
    range: 12,
    disableDuration: 3,
    damage: 10,
    description: 'Disable target for 3s and deal 10 damage (12s cooldown)'
  },
  plane: {
    id: 'bombing_run',
    name: 'Bombing Run',
    key: 'g',
    cooldown: 15,
    range: 20,
    radius: 8,
    damage: 60,
    description: 'Strafe a line dealing 60 AOE damage (15s cooldown)'
  },
  battleship: {
    id: 'barrage',
    name: 'Barrage',
    key: 'g',
    cooldown: 20,
    range: 24,
    radius: 10,
    damage: 40,
    salvos: 3,
    description: 'Fire 3 salvos at target area dealing 40 damage each (20s cooldown)'
  },
  carrier: {
    id: 'launch_squadron',
    name: 'Launch Squadron',
    key: 'g',
    cooldown: 25,
    range: 30,
    squadronDamage: 30,
    squadronCount: 3,
    squadronDuration: 6,
    description: 'Launch 3 attack drones that assault target area for 6s (25s cooldown)'
  },
  submarine: {
    id: 'torpedo_salvo',
    name: 'Torpedo Salvo',
    key: 'g',
    cooldown: 15,
    range: 14,
    damage: 120,
    description: 'Fire a devastating torpedo salvo dealing 120 damage (15s cooldown)'
  }
};

// ============================================================
// VETERANCY SYSTEM
// ============================================================
export const VETERANCY = {
  ranks: [
    { name: 'Rookie', kills: 0, color: '#888888', symbol: '' },
    { name: 'Veteran', kills: 3, color: '#ffcc00', symbol: '\u2605' },
    { name: 'Elite', kills: 7, color: '#ff8800', symbol: '\u2605\u2605' },
    { name: 'Ace', kills: 15, color: '#ff3300', symbol: '\u2605\u2605\u2605' }
  ],
  bonusPerRank: {
    damage: 0.10,
    maxHP: 0.10,
    armor: 1,
    speed: 0.05
  }
};

export const FORMATION_CONFIG = {
  types: ['box', 'line'],
  defaultType: 'box',
  spacing: 4,
  separationRadius: 3,
  separationForce: 8,
};

export const GAME_CONFIG = {
  mapSize: 128,
  worldScale: 2,
  startingSP: 600,
  baseIncome: 12,
  tickRate: 1,
  unitSpeedMultiplier: 5,
  maxUnitsPerTeam: 50
};

export const AI_DIFFICULTY = {
  easy: {
    label: 'Easy',
    resourceBonus: 0,
    attackThresholdMultiplier: 1.5,
    strategicInterval: 15,
    tacticalInterval: 5,
    microInterval: 2,
    buildOrderVariety: false,
    multiPronged: false,
    scouting: false,
    countersPlayer: false,
    targetPriority: false
  },
  normal: {
    label: 'Normal',
    resourceBonus: 0,
    attackThresholdMultiplier: 1.0,
    strategicInterval: 10,
    tacticalInterval: 3,
    microInterval: 1,
    buildOrderVariety: true,
    multiPronged: true,
    scouting: true,
    countersPlayer: false,
    targetPriority: true
  },
  hard: {
    label: 'Hard',
    resourceBonus: 0.5,
    attackThresholdMultiplier: 0.7,
    strategicInterval: 7,
    tacticalInterval: 2,
    microInterval: 0.5,
    buildOrderVariety: true,
    multiPronged: true,
    scouting: true,
    countersPlayer: true,
    targetPriority: true
  }
};

export const MAP_TEMPLATES = {
  continental: {
    label: 'Continental',
    description: 'Large landmass with water on one side',
    waterStyle: 'side'
  },
  islands: {
    label: 'Islands',
    description: 'Scattered islands separated by water channels',
    waterStyle: 'channels'
  },
  river: {
    label: 'River Crossing',
    description: 'Land split by a winding river with bridge crossings',
    waterStyle: 'river'
  },
  plains: {
    label: 'Open Plains',
    description: 'Wide open terrain with minimal water and rolling hills',
    waterStyle: 'minimal'
  }
};
