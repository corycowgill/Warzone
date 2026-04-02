export const UNIT_STATS = {
  infantry: { hp: 50, speed: 3, damage: 8, range: 6, cost: 50, domain: 'land', buildTime: 3, attackRate: 1.5, armor: 0, vision: 10 },
  tank: { hp: 200, speed: 4, damage: 35, range: 10, cost: 200, domain: 'land', buildTime: 6, attackRate: 0.8, armor: 3, vision: 12 },
  drone: { hp: 80, speed: 7, damage: 15, range: 8, cost: 150, domain: 'air', buildTime: 4, attackRate: 2.0, armor: 0, vision: 14 },
  plane: { hp: 150, speed: 10, damage: 50, range: 12, cost: 300, domain: 'air', buildTime: 8, attackRate: 0.5, armor: 1, vision: 16 },
  battleship: { hp: 400, speed: 2, damage: 60, range: 18, cost: 500, domain: 'naval', buildTime: 10, attackRate: 0.4, armor: 5, vision: 20 },
  carrier: { hp: 500, speed: 1.5, damage: 10, range: 5, cost: 600, domain: 'naval', buildTime: 12, attackRate: 0.3, armor: 4, vision: 22 },
  submarine: { hp: 150, speed: 3, damage: 80, range: 8, cost: 350, domain: 'naval', buildTime: 8, attackRate: 0.6, armor: 2, vision: 10 },
  // Cycle 10 - Tier 1
  mortar: { hp: 40, speed: 2, damage: 20, range: 14, cost: 100, domain: 'land', buildTime: 5, attackRate: 0.5, armor: 0, vision: 10, minRange: 4 },
  scoutcar: { hp: 60, speed: 8, damage: 5, range: 5, cost: 75, domain: 'land', buildTime: 3, attackRate: 1.5, armor: 1, vision: 18 },
  // Cycle 10 - Tier 2
  aahalftrack: { hp: 100, speed: 5, damage: 18, range: 12, cost: 150, domain: 'land', buildTime: 5, attackRate: 1.2, armor: 1, vision: 12, airOnly: true },
  apc: { hp: 150, speed: 5, damage: 10, range: 6, cost: 125, domain: 'land', buildTime: 4, attackRate: 1.0, armor: 2, vision: 12, garrisonSlots: 4 },
  // Cycle 10 - Tier 3 (requires Tech Lab)
  heavytank: { hp: 400, speed: 2.5, damage: 55, range: 12, cost: 450, domain: 'land', buildTime: 10, attackRate: 0.5, armor: 6, vision: 12 },
  spg: { hp: 120, speed: 3, damage: 70, range: 22, cost: 350, domain: 'land', buildTime: 9, attackRate: 0.3, armor: 1, vision: 14, minRange: 8, aoeRadius: 4 },
  bomber: { hp: 250, speed: 6, damage: 100, range: 6, cost: 500, domain: 'air', buildTime: 12, attackRate: 0.2, armor: 2, vision: 16, aoeRadius: 8 },
  // Cycle 10 - Naval
  patrolboat: { hp: 80, speed: 4, damage: 12, range: 8, cost: 100, domain: 'naval', buildTime: 4, attackRate: 1.0, armor: 1, vision: 12 },
  // GD-089: Engineer unit
  engineer: { hp: 80, speed: 4, damage: 0, range: 2, cost: 200, domain: 'land', buildTime: 5, attackRate: 0, armor: 0, vision: 10 },
  // GD-111: Commander/Hero unit
  commander: { hp: 600, speed: 3, damage: 40, range: 10, cost: 500, domain: 'land', buildTime: 30, attackRate: 0.8, armor: 5, vision: 16 }
};

export const BUILDING_STATS = {
  headquarters: { hp: 1000, cost: 0, produces: ['infantry', 'commander'], size: 4, requires: [] },
  barracks: { hp: 400, cost: 200, produces: ['infantry', 'mortar', 'engineer'], size: 2, requires: [] },
  warfactory: { hp: 600, cost: 400, produces: ['tank', 'scoutcar', 'aahalftrack', 'apc', 'heavytank', 'spg'], size: 3, requires: ['barracks'] },
  airfield: { hp: 500, cost: 500, produces: ['drone', 'plane', 'bomber'], size: 3, requires: ['warfactory'] },
  shipyard: { hp: 500, cost: 450, produces: ['battleship', 'carrier', 'submarine', 'patrolboat'], size: 3, requires: ['barracks'] },
  techlab: { hp: 500, cost: 500, produces: [], size: 2, requires: ['warfactory'] },
  resourcedepot: { hp: 300, cost: 300, produces: [], size: 2, income: 8, requires: [] },
  supplydepot: { hp: 200, cost: 150, produces: [], size: 1, income: 4, requires: [] },
  bunker: { hp: 600, cost: 200, produces: [], size: 2, requires: ['barracks'], damage: 15, range: 10, attackRate: 1.0, armor: 4, targetDomain: 'ground', garrisonSlots: 4 },
  ditch: { hp: 100, cost: 0, buildTime: 5, size: 1, damageReduction: 0.5, rangeBonus: 0.25, requires: [] },
  turret: { hp: 350, cost: 250, produces: [], size: 1, requires: ['barracks'], damage: 25, range: 12, attackRate: 1.2, armor: 2, targetDomain: 'ground' },
  aaturret: { hp: 300, cost: 300, produces: [], size: 1, requires: ['warfactory'], damage: 30, range: 14, attackRate: 1.5, armor: 1, targetDomain: 'air' },
  wall: { hp: 500, cost: 50, produces: [], size: 1, requires: [], armor: 5, blocksMovement: true },
  superweapon: { hp: 800, cost: 800, produces: [], size: 4, requires: ['warfactory'], isSuperweapon: true },
  munitionscache: { hp: 250, cost: 250, produces: [], size: 2, muIncome: 4, requires: ['barracks'] },
  supplyexchange: { hp: 300, cost: 300, produces: [], size: 2, requires: ['headquarters'], isExchange: true }
};

// GD-091: Neutral Map Structures (capturable)
export const NEUTRAL_STRUCTURES = {
  watchtower: { hp: 200, visionBonus: 25, label: 'Watch Tower', description: '+25 vision radius for nearby units' },
  abandoned_factory: { hp: 300, productionBonus: 0.2, label: 'Abandoned Factory', description: '+20% production speed' },
  supply_depot: { hp: 250, incomeBonus: 5, label: 'Supply Depot', description: '+5 SP/s income' },
  comm_relay: { hp: 200, minimapReveal: true, label: 'Comm Relay', description: 'Reveals enemy positions on minimap' },
  repair_bay: { hp: 250, healRate: 3, healRadius: 20, label: 'Repair Bay', description: 'Heals nearby units +3 HP/s' }
};

export const BUILDING_UPGRADES = {
  barracks: {
    maxTier: 3,
    costs: [0, 300, 600],
    muCosts: [0, 50, 100],
    bonuses: {
      1: { productionSpeed: 1.0, label: 'Base' },
      2: { productionSpeed: 1.25, label: 'Veteran Training (+25% speed)' },
      3: { productionSpeed: 1.5, label: 'Elite Academy (+50% speed, veteran spawn)' }
    }
  },
  warfactory: {
    maxTier: 3,
    costs: [0, 400, 800],
    muCosts: [0, 60, 120],
    bonuses: {
      1: { productionSpeed: 1.0, label: 'Base' },
      2: { productionSpeed: 1.2, label: 'Advanced Assembly (+20% speed)' },
      3: { productionSpeed: 1.4, damageBonus: 1.1, label: 'Heavy Armor Works (+40% speed, +10% damage)' }
    }
  },
  airfield: {
    maxTier: 3,
    costs: [0, 500, 900],
    muCosts: [0, 80, 150],
    bonuses: {
      1: { productionSpeed: 1.0, label: 'Base' },
      2: { productionSpeed: 1.3, label: 'Flight School (+30% speed)' },
      3: { productionSpeed: 1.5, hpBonus: 1.15, label: 'Ace Training (+50% speed, +15% HP)' }
    }
  }
};

// Tech tree: which buildings unlock which units
export const TECH_TREE = {
  infantry: { building: 'barracks', requires: [] },
  mortar: { building: 'barracks', requires: [] },
  tank: { building: 'warfactory', requires: ['barracks'] },
  scoutcar: { building: 'warfactory', requires: [] },
  aahalftrack: { building: 'warfactory', requires: ['barracks'] },
  apc: { building: 'warfactory', requires: ['barracks'] },
  heavytank: { building: 'warfactory', requires: ['techlab'] },
  spg: { building: 'warfactory', requires: ['techlab'] },
  drone: { building: 'airfield', requires: ['warfactory'] },
  plane: { building: 'airfield', requires: ['warfactory'] },
  bomber: { building: 'airfield', requires: ['techlab'] },
  battleship: { building: 'shipyard', requires: ['barracks'] },
  carrier: { building: 'shipyard', requires: ['warfactory'] },
  submarine: { building: 'shipyard', requires: ['barracks'] },
  patrolboat: { building: 'shipyard', requires: [] },
  engineer: { building: 'barracks', requires: [] },
  commander: { building: 'headquarters', requires: ['warfactory'] }
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
  // Ground triangle: Tank > Infantry (2.0x), Infantry > Drone (1.8x), Drone > Tank (1.5x)
  infantry: { infantry: 1.0, tank: 0.4, drone: 1.8, plane: 0.3, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.5, mortar: 1.0, scoutcar: 0.8, aahalftrack: 0.6, apc: 0.5, heavytank: 0.2, spg: 1.2, bomber: 0.2, patrolboat: 0.1, engineer: 1.5 },
  tank: { infantry: 2.0, tank: 1.0, drone: 0.5, plane: 0.3, battleship: 0.3, carrier: 0.3, submarine: 0.1, building: 1.5, mortar: 1.5, scoutcar: 1.5, aahalftrack: 1.2, apc: 1.2, heavytank: 0.7, spg: 1.5, bomber: 0.2, patrolboat: 0.3, engineer: 2.0 },
  drone: { infantry: 0.8, tank: 1.5, drone: 1.0, plane: 0.5, battleship: 0.4, carrier: 0.4, submarine: 0.7, building: 0.7, mortar: 1.0, scoutcar: 1.0, aahalftrack: 0.5, apc: 0.8, heavytank: 1.2, spg: 1.2, bomber: 0.5, patrolboat: 0.4, engineer: 1.0 },
  plane: { infantry: 1.5, tank: 1.8, drone: 0.7, plane: 1.0, battleship: 1.2, carrier: 1.2, submarine: 1.0, building: 1.5, mortar: 1.5, scoutcar: 1.5, aahalftrack: 0.5, apc: 1.2, heavytank: 1.0, spg: 1.5, bomber: 0.8, patrolboat: 1.0, engineer: 1.5 },
  battleship: { infantry: 1.5, tank: 1.2, drone: 0.3, plane: 0.2, battleship: 1.0, carrier: 0.6, submarine: 1.5, building: 2.0, mortar: 1.5, scoutcar: 1.5, aahalftrack: 1.2, apc: 1.2, heavytank: 1.0, spg: 1.5, bomber: 0.2, patrolboat: 1.5, engineer: 1.5 },
  carrier: { infantry: 0.5, tank: 0.3, drone: 0.8, plane: 0.8, battleship: 1.5, carrier: 1.0, submarine: 0.5, building: 0.3, mortar: 0.5, scoutcar: 0.5, aahalftrack: 0.5, apc: 0.3, heavytank: 0.3, spg: 0.3, bomber: 0.8, patrolboat: 1.2, engineer: 0.5 },
  submarine: { infantry: 0.1, tank: 0.1, drone: 0.3, plane: 0.1, battleship: 0.6, carrier: 2.0, submarine: 1.0, building: 0.5, mortar: 0.1, scoutcar: 0.1, aahalftrack: 0.1, apc: 0.1, heavytank: 0.1, spg: 0.1, bomber: 0.1, patrolboat: 0.5, engineer: 0.1 },
  turret: { infantry: 1.5, tank: 1.0, drone: 0.3, plane: 0.2, battleship: 0.5, carrier: 0.5, submarine: 0.3, building: 0.5, mortar: 1.5, scoutcar: 1.2, aahalftrack: 1.0, apc: 1.0, heavytank: 0.5, spg: 1.5, bomber: 0.2, patrolboat: 0.5, engineer: 1.5 },
  aaturret: { infantry: 0.3, tank: 0.2, drone: 2.0, plane: 2.0, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.2, mortar: 0.3, scoutcar: 0.3, aahalftrack: 0.3, apc: 0.2, heavytank: 0.1, spg: 0.3, bomber: 2.0, patrolboat: 0.1, engineer: 0.3 },
  bunker: { infantry: 1.2, tank: 0.6, drone: 0.4, plane: 0.3, battleship: 0.3, carrier: 0.3, submarine: 0.2, building: 0.3, mortar: 1.2, scoutcar: 1.0, aahalftrack: 0.6, apc: 0.5, heavytank: 0.3, spg: 1.2, bomber: 0.3, patrolboat: 0.3, engineer: 1.2 },
  // Cycle 10 new units
  mortar: { infantry: 0.8, tank: 0.3, drone: 0.3, plane: 0.2, battleship: 0.2, carrier: 0.2, submarine: 0.1, building: 1.5, mortar: 1.0, scoutcar: 0.5, aahalftrack: 0.4, apc: 0.6, heavytank: 0.2, spg: 0.8, bomber: 0.1, patrolboat: 0.2, engineer: 0.8 },
  scoutcar: { infantry: 0.8, tank: 0.3, drone: 0.5, plane: 0.0, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.3, mortar: 0.8, scoutcar: 1.0, aahalftrack: 0.3, apc: 0.3, heavytank: 0.1, spg: 0.8, bomber: 0.0, patrolboat: 0.1, engineer: 0.8 },
  aahalftrack: { infantry: 0.3, tank: 0.3, drone: 2.0, plane: 2.0, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.2, mortar: 0.3, scoutcar: 0.5, aahalftrack: 0.5, apc: 0.3, heavytank: 0.2, spg: 0.3, bomber: 2.0, patrolboat: 0.1, engineer: 0.3 },
  apc: { infantry: 0.8, tank: 0.3, drone: 0.3, plane: 0.2, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.4, mortar: 0.8, scoutcar: 0.8, aahalftrack: 0.4, apc: 0.5, heavytank: 0.2, spg: 0.8, bomber: 0.1, patrolboat: 0.1, engineer: 0.8 },
  heavytank: { infantry: 2.0, tank: 1.3, drone: 0.5, plane: 0.3, battleship: 0.3, carrier: 0.3, submarine: 0.1, building: 2.0, mortar: 2.0, scoutcar: 2.0, aahalftrack: 1.5, apc: 1.5, heavytank: 1.0, spg: 1.5, bomber: 0.2, patrolboat: 0.3, engineer: 2.0 },
  spg: { infantry: 1.5, tank: 1.0, drone: 0.3, plane: 0.2, battleship: 0.5, carrier: 0.5, submarine: 0.1, building: 2.5, mortar: 1.5, scoutcar: 1.5, aahalftrack: 1.0, apc: 1.2, heavytank: 0.8, spg: 1.0, bomber: 0.1, patrolboat: 0.5, engineer: 1.5 },
  bomber: { infantry: 1.5, tank: 1.5, drone: 0.3, plane: 0.3, battleship: 1.5, carrier: 1.2, submarine: 0.5, building: 2.0, mortar: 1.5, scoutcar: 1.5, aahalftrack: 0.3, apc: 1.5, heavytank: 1.2, spg: 1.5, bomber: 0.5, patrolboat: 1.5, engineer: 1.5 },
  patrolboat: { infantry: 0.5, tank: 0.3, drone: 0.3, plane: 0.2, battleship: 0.3, carrier: 0.5, submarine: 2.0, building: 0.5, mortar: 0.5, scoutcar: 0.3, aahalftrack: 0.3, apc: 0.3, heavytank: 0.2, spg: 0.3, bomber: 0.2, patrolboat: 1.0, engineer: 0.5 },
  engineer: { infantry: 0.0, tank: 0.0, drone: 0.0, plane: 0.0, battleship: 0.0, carrier: 0.0, submarine: 0.0, building: 0.0, mortar: 0.0, scoutcar: 0.0, aahalftrack: 0.0, apc: 0.0, heavytank: 0.0, spg: 0.0, bomber: 0.0, patrolboat: 0.0, engineer: 0.0, commander: 0.0 },
  commander: { infantry: 1.5, tank: 1.0, drone: 0.5, plane: 0.3, battleship: 0.5, carrier: 0.5, submarine: 0.3, building: 1.5, mortar: 1.5, scoutcar: 1.5, aahalftrack: 1.0, apc: 1.0, heavytank: 0.8, spg: 1.5, bomber: 0.3, patrolboat: 0.5, engineer: 1.5, commander: 1.0 }
};

// Rock-Paper-Scissors counter lookup for UI tooltips
export const UNIT_COUNTERS = {
  infantry: { strong: ['drone'], weak: ['tank', 'plane'] },
  tank: { strong: ['infantry', 'building'], weak: ['drone', 'plane'] },
  drone: { strong: ['tank'], weak: ['infantry', 'aaturret', 'aahalftrack'] },
  plane: { strong: ['tank', 'infantry'], weak: ['drone', 'aaturret', 'aahalftrack'] },
  battleship: { strong: ['submarine', 'building'], weak: ['carrier', 'plane'] },
  carrier: { strong: ['battleship'], weak: ['submarine'] },
  submarine: { strong: ['carrier'], weak: ['battleship', 'patrolboat'] },
  mortar: { strong: ['building'], weak: ['tank', 'plane'] },
  scoutcar: { strong: ['mortar', 'spg'], weak: ['tank', 'aahalftrack'] },
  aahalftrack: { strong: ['drone', 'plane', 'bomber'], weak: ['tank', 'infantry'] },
  apc: { strong: ['infantry'], weak: ['tank', 'plane'] },
  heavytank: { strong: ['tank', 'building', 'infantry'], weak: ['plane', 'drone', 'spg'] },
  spg: { strong: ['building', 'infantry'], weak: ['scoutcar', 'plane', 'tank'] },
  bomber: { strong: ['building', 'infantry', 'tank'], weak: ['aahalftrack', 'plane', 'aaturret'] },
  patrolboat: { strong: ['submarine'], weak: ['battleship'] },
  engineer: { strong: ['building'], weak: ['infantry', 'tank'] },
  commander: { strong: ['infantry', 'mortar'], weak: ['plane', 'heavytank', 'spg'] }
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
    muCost: 10,
    description: 'Throw a grenade dealing 25 AOE damage (8s cooldown, 10 MU)'
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
    muCost: 15,
    description: 'Toggle: +50% range, +40% damage, but cannot move (15 MU)'
  },
  drone: {
    id: 'emp',
    name: 'EMP Pulse',
    key: 'g',
    cooldown: 12,
    range: 12,
    disableDuration: 3,
    damage: 10,
    muCost: 12,
    description: 'Disable target for 3s and deal 10 damage (12s cooldown, 12 MU)'
  },
  plane: {
    id: 'bombing_run',
    name: 'Bombing Run',
    key: 'g',
    cooldown: 15,
    range: 20,
    radius: 8,
    damage: 60,
    muCost: 20,
    description: 'Strafe a line dealing 60 AOE damage (15s cooldown, 20 MU)'
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
    muCost: 25,
    description: 'Fire 3 salvos at target area dealing 40 damage each (20s cooldown, 25 MU)'
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
    muCost: 20,
    description: 'Fire a devastating torpedo salvo dealing 120 damage (15s cooldown, 20 MU)'
  },
  mortar: {
    id: 'smoke_screen',
    name: 'Smoke Screen',
    key: 'g',
    cooldown: 15,
    range: 14,
    radius: 8,
    duration: 6,
    description: 'Deploy smoke blocking vision in area for 6s (15s cooldown)'
  },
  scoutcar: {
    id: 'flare',
    name: 'Flare',
    key: 'g',
    cooldown: 20,
    range: 20,
    radius: 15,
    duration: 8,
    description: 'Launch a flare revealing area through fog for 8s (20s cooldown)'
  },
  spg: {
    id: 'deploy',
    name: 'Deploy',
    key: 'g',
    cooldown: 1,
    description: 'Toggle: Must deploy to fire. Cannot move while deployed.'
  },
  patrolboat: {
    id: 'sonar_ping',
    name: 'Sonar Ping',
    key: 'g',
    cooldown: 20,
    radius: 15,
    duration: 5,
    description: 'Reveal submarines in radius 15 for 5s (20s cooldown)'
  },
  engineer: {
    id: 'plant_mine',
    name: 'Plant Mine',
    key: 'g',
    cooldown: 15,
    damage: 150,
    radius: 6,
    muCost: 50,
    description: 'Plant a stealth mine dealing 150 AOE damage (50 MU, one-time use)'
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
  types: ['box', 'line', 'wedge', 'circle', 'column'],
  defaultType: 'box',
  spacing: 4,
  separationRadius: 3,
  separationForce: 8,
};

// ============================================================
// RESEARCH UPGRADES - Global upgrades purchasable at buildings
// ============================================================
export const RESEARCH_UPGRADES = {
  improved_armor: {
    name: 'Improved Armor',
    description: '+2 armor to all land units',
    cost: 300,
    muCost: 50,
    researchTime: 15,
    building: 'warfactory',
    applies: (unit) => unit.domain === 'land',
    effect: { armor: 2 }
  },
  advanced_optics: {
    name: 'Advanced Optics',
    description: '+20% air unit vision and range',
    cost: 350,
    muCost: 60,
    researchTime: 12,
    building: 'airfield',
    applies: (unit) => unit.domain === 'air',
    effect: { visionMult: 1.2, rangeMult: 1.2 }
  },
  fortified_bunkers: {
    name: 'Fortified Bunkers',
    description: '+25% building HP',
    cost: 250,
    muCost: 40,
    researchTime: 10,
    building: 'barracks',
    applies: (entity) => entity.isBuilding,
    effect: { hpMult: 1.25 }
  },
  rapid_fire: {
    name: 'Rapid Fire',
    description: '+15% attack rate for infantry',
    cost: 200,
    muCost: 30,
    researchTime: 10,
    building: 'barracks',
    applies: (unit) => unit.type === 'infantry',
    effect: { attackRateMult: 1.15 }
  },
  heavy_shells: {
    name: 'Heavy Shells',
    description: '+20% tank and battleship damage',
    cost: 400,
    muCost: 70,
    researchTime: 15,
    building: 'warfactory',
    applies: (unit) => unit.type === 'tank' || unit.type === 'battleship',
    effect: { damageMult: 1.2 }
  },
  field_medics: {
    name: 'Field Medics',
    description: 'Infantry slowly regenerate HP',
    cost: 250,
    muCost: 40,
    researchTime: 12,
    building: 'barracks',
    applies: (unit) => unit.type === 'infantry',
    effect: { regen: 2 }
  },
  jet_engines: {
    name: 'Jet Engines',
    description: '+25% air unit speed',
    cost: 300,
    muCost: 50,
    researchTime: 12,
    building: 'airfield',
    applies: (unit) => unit.domain === 'air',
    effect: { speedMult: 1.25 }
  },
  naval_plating: {
    name: 'Naval Plating',
    description: '+3 armor to all naval units',
    cost: 350,
    muCost: 60,
    researchTime: 15,
    building: 'shipyard',
    applies: (unit) => unit.domain === 'naval',
    effect: { armor: 3 }
  },
  supply_lines: {
    name: 'Supply Lines',
    description: '+25% income from all sources',
    cost: 400,
    muCost: 80,
    researchTime: 20,
    building: 'resourcedepot',
    applies: null,
    effect: { incomeMult: 1.25 }
  },
  blitz_training: {
    name: 'Blitz Training',
    description: '+15% production speed globally',
    cost: 350,
    muCost: 60,
    researchTime: 18,
    building: 'headquarters',
    applies: null,
    effect: { productionMult: 1.15 }
  }
};

// GD-090: Branching Tech Tree Choices
// Each domain has Branch A and Branch B, researched at Tech Lab.
// Choosing one branch locks out the other for that domain.
export const TECH_BRANCHES = {
  infantry: {
    label: 'Infantry Doctrine',
    branchA: {
      id: 'infantry_assault',
      name: 'Assault Doctrine',
      description: '+25% infantry damage, +1 armor, unlock grenadier squad',
      cost: 400,
      muCost: 60,
      researchTime: 20,
      effects: {
        applies: (unit) => unit.type === 'infantry' || unit.type === 'mortar',
        damageMult: 1.25,
        armor: 1
      }
    },
    branchB: {
      id: 'infantry_support',
      name: 'Support Doctrine',
      description: '+40% infantry HP, +3 HP/s regen, enhanced field medics',
      cost: 400,
      muCost: 60,
      researchTime: 20,
      effects: {
        applies: (unit) => unit.type === 'infantry' || unit.type === 'mortar',
        hpMult: 1.4,
        regen: 3
      }
    }
  },
  vehicle: {
    label: 'Vehicle Doctrine',
    branchA: {
      id: 'vehicle_blitz',
      name: 'Blitzkrieg Doctrine',
      description: '+30% vehicle speed, +15% damage, fast flanking',
      cost: 500,
      muCost: 80,
      researchTime: 25,
      effects: {
        applies: (unit) => unit.domain === 'land' && unit.type !== 'infantry' && unit.type !== 'mortar' && unit.type !== 'engineer',
        speedMult: 1.3,
        damageMult: 1.15
      }
    },
    branchB: {
      id: 'vehicle_fortress',
      name: 'Fortress Doctrine',
      description: '+35% vehicle HP, +3 armor, siege specialists',
      cost: 500,
      muCost: 80,
      researchTime: 25,
      effects: {
        applies: (unit) => unit.domain === 'land' && unit.type !== 'infantry' && unit.type !== 'mortar' && unit.type !== 'engineer',
        hpMult: 1.35,
        armor: 3
      }
    }
  },
  air: {
    label: 'Air Doctrine',
    branchA: {
      id: 'air_superiority',
      name: 'Air Superiority',
      description: '+30% air damage, +20% range, dominate the skies',
      cost: 500,
      muCost: 80,
      researchTime: 25,
      effects: {
        applies: (unit) => unit.domain === 'air',
        damageMult: 1.3,
        rangeMult: 1.2
      }
    },
    branchB: {
      id: 'air_strike',
      name: 'Ground Strike',
      description: '+40% air HP, +25% speed, survive AA and hit hard',
      cost: 500,
      muCost: 80,
      researchTime: 25,
      effects: {
        applies: (unit) => unit.domain === 'air',
        hpMult: 1.4,
        speedMult: 1.25
      }
    }
  },
  naval: {
    label: 'Naval Doctrine',
    branchA: {
      id: 'naval_firepower',
      name: 'Naval Firepower',
      description: '+25% naval damage, +15% range, long-range bombardment',
      cost: 450,
      muCost: 70,
      researchTime: 22,
      effects: {
        applies: (unit) => unit.domain === 'naval',
        damageMult: 1.25,
        rangeMult: 1.15
      }
    },
    branchB: {
      id: 'naval_resilience',
      name: 'Naval Resilience',
      description: '+40% naval HP, +4 armor, unsinkable fleet',
      cost: 450,
      muCost: 70,
      researchTime: 22,
      effects: {
        applies: (unit) => unit.domain === 'naval',
        hpMult: 1.4,
        armor: 4
      }
    }
  }
};

export const GAME_CONFIG = {
  mapSize: 128,
  worldScale: 2,
  startingSP: 600,
  startingMU: 100,
  baseIncome: 12,
  baseMUIncome: 5,
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

// ============================================================
// NATION ACTIVE ABILITIES - Faction-specific cooldown abilities
// ============================================================
export const NATION_ABILITIES = {
  america: {
    id: 'lend_lease',
    name: 'Lend-Lease',
    description: 'Instantly grant +200 SP',
    cooldown: 120,
    effect: { grantSP: 200 }
  },
  britain: {
    id: 'naval_supremacy',
    name: 'Naval Supremacy',
    description: 'All naval units +30% speed, +20% damage for 20s',
    cooldown: 90,
    duration: 20,
    effect: { navalSpeedMult: 1.3, navalDamageMult: 1.2 }
  },
  france: {
    id: 'resistance_network',
    name: 'Resistance Network',
    description: 'Reveal all enemy units for 10s',
    cooldown: 100,
    duration: 10,
    effect: { revealAll: true }
  },
  japan: {
    id: 'banzai_charge',
    name: 'Banzai Charge',
    description: 'Selected infantry +50% speed, +30% damage for 8s, take 20% more damage',
    cooldown: 80,
    duration: 8,
    effect: { infantrySpeedMult: 1.5, infantryDamageMult: 1.3, infantryVulnerability: 1.2 }
  },
  germany: {
    id: 'blitzkrieg',
    name: 'Blitzkrieg',
    description: 'All land units +40% speed for 12s',
    cooldown: 100,
    duration: 12,
    effect: { landSpeedMult: 1.4 }
  },
  austria: {
    id: 'war_economy',
    name: 'War Economy',
    description: 'All unit costs -25% for 30s',
    cooldown: 110,
    duration: 30,
    effect: { costReductionMult: 0.75 }
  }
};

// ============================================================
// SUPERWEAPON SYSTEM
// ============================================================
export const SUPERWEAPON_CONFIG = {
  building: {
    type: 'superweapon',
    hp: 800,
    cost: 800,
    size: 4,
    requires: ['warfactory']
  },
  weapons: {
    america: { name: 'Atomic Bomb', chargeTime: 300, radius: 25, damage: 500, type: 'nuke' },
    germany: { name: 'V-2 Rocket', chargeTime: 200, radius: 8, damage: 800, type: 'rocket' },
    britain: { name: 'Carpet Bombing', chargeTime: 240, radius: 15, damage: 300, type: 'carpet', width: 10, length: 30 },
    france: { name: 'Artillery Barrage', chargeTime: 220, radius: 18, damage: 350, type: 'carpet', width: 12, length: 25 },
    japan: { name: 'Divine Wind', chargeTime: 250, radius: 20, damage: 450, type: 'nuke' },
    austria: { name: 'Siege Bombardment', chargeTime: 210, radius: 10, damage: 600, type: 'rocket' }
  }
};

// ============================================================
// RESOURCE NODE CONFIG
// ============================================================
export const RESOURCE_NODE_CONFIG = {
  count: 7,
  bonusIncome: 4,
  captureRadius: 15,
  glowColor: 0xffdd44,
  minimapColor: '#ffdd44'
};

// ============================================================
// SALVAGE CONFIG
// ============================================================
export const SALVAGE_CONFIG = {
  percentage: 0.15,
  excludeTypes: ['wall', 'ditch']
};

// ============================================================
// BUILDING LIMITS - Max count per type per team
// ============================================================
export const BUILDING_LIMITS = {
  barracks: 3,
  warfactory: 2,
  airfield: 2,
  shipyard: 2,
  supplydepot: 4,
  resourcedepot: 4,
  turret: 10,
  aaturret: 10,
  bunker: 5,
  wall: 20,
  ditch: 20,
  techlab: 1,
  superweapon: 1,
  munitionscache: 4,
  supplyexchange: 1
};

// ============================================================
// CONSTRUCTION CONFIG
// ============================================================
export const CONSTRUCTION_CONFIG = {
  startHPPercent: 0.10,
  cancelRefundPercent: 0.75,
  preBuiltTypes: ['headquarters']
};

export const MAP_TEMPLATES = {
  random: {
    label: 'Random',
    description: 'Randomly selected map template',
    waterStyle: 'random'
  },
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

// ============================================================
// GD-105: FACTION-UNIQUE UNITS
// Maps nation → unit type overrides with modified stats and abilities
// ============================================================
export const FACTION_UNITS = {
  america: {
    infantry: {
      factionType: 'ranger',
      name: 'Ranger',
      description: 'Elite infantry with camo when stationary, +20% damage',
      statsOverride: { damage: 10 }, // 8 * 1.2 = ~10
      abilities: {
        id: 'camo',
        name: 'Camo',
        passive: true,
        description: 'Invisible when stationary for 3s. +20% base damage.',
        camoDelay: 3.0
      }
    },
    heavytank: {
      factionType: 'sherman_jumbo',
      name: 'Sherman Jumbo',
      description: 'Extra frontal armor +3, slightly lower speed',
      statsOverride: { armor: 9, speed: 2.0 } // base 6+3=9, slower
    }
  },
  britain: {
    infantry: {
      factionType: 'commando',
      name: 'Commando',
      description: 'Captures at 75% HP, +30% speed',
      statsOverride: { speed: 3.9 } // 3 * 1.3
    },
    heavytank: {
      factionType: 'churchill',
      name: 'Churchill Tank',
      description: 'Slow but aura gives +10% armor to nearby vehicles',
      statsOverride: { speed: 1.8 },
      aura: { type: 'armor', bonus: 0.10, radius: 20, domain: 'land' }
    }
  },
  france: {
    infantry: {
      factionType: 'maquis',
      name: 'Maquis',
      description: 'Guerrilla fighter, spawns from forests on 60s cooldown',
      statsOverride: {},
      abilities: {
        id: 'forest_spawn',
        name: 'Forest Spawn',
        passive: true,
        description: 'Can be spawned from any forest tile (60s cooldown)',
        forestSpawnCooldown: 60
      }
    },
    scoutcar: {
      factionType: 'amx_light',
      name: 'AMX Light Tank',
      description: 'Fast tank with smoke, lower HP',
      statsOverride: { hp: 50, speed: 9, damage: 12 },
      abilities: {
        id: 'smoke_pop',
        name: 'Smoke Pop',
        key: 'g',
        cooldown: 20,
        radius: 8,
        duration: 5,
        description: 'Pop smoke concealing the area for 5s (20s CD)'
      }
    }
  },
  germany: {
    infantry: {
      factionType: 'stormtrooper',
      name: 'Stormtrooper',
      description: 'Higher fire rate 2x, SMG, lower range 4',
      statsOverride: { attackRate: 3.0, range: 4 }
    },
    heavytank: {
      factionType: 'tiger',
      name: 'Tiger',
      description: 'Highest damage tank, +25% damage, +1 range, expensive',
      statsOverride: { damage: 69, range: 13, cost: 550 } // 55*1.25=~69
    }
  },
  japan: {
    infantry: {
      factionType: 'imperial_marine',
      name: 'Imperial Marine',
      description: 'Banzai charge: +50% speed +30% damage for 5s, then 50% HP loss',
      statsOverride: {},
      abilities: {
        id: 'banzai',
        name: 'Banzai Charge',
        key: 'g',
        cooldown: 30,
        duration: 5,
        speedMult: 1.5,
        damageMult: 1.3,
        hpCost: 0.5,
        description: 'Charge! +50% speed, +30% damage for 5s, then lose 50% HP'
      }
    },
    plane: {
      factionType: 'zero',
      name: 'Zero Fighter',
      description: 'Kamikaze on death dealing 200 AOE damage',
      statsOverride: {},
      onDeath: { type: 'kamikaze', damage: 200, radius: 8 }
    }
  },
  austria: {
    infantry: {
      factionType: 'jaeger',
      name: 'Jaeger',
      description: 'Mountain infantry, no forest penalty, +50% elevation bonus',
      statsOverride: {},
      passive: { noForestPenalty: true, elevationBonusMult: 1.5 }
    },
    spg: {
      factionType: 'sturmhaubitze',
      name: 'Sturmhaubitze',
      description: 'Faster deploy/undeploy, +10% fire rate',
      statsOverride: { attackRate: 0.33 } // 0.3 * 1.1
    }
  }
};

// ============================================================
// GD-111: COMMANDER/HERO UNITS
// ============================================================
export const COMMANDER_CONFIG = {
  cost: 500,
  muCost: 200,
  buildTime: 30,
  respawnCooldown: 90,
  stats: { hp: 600, speed: 3, damage: 40, range: 10, domain: 'land', attackRate: 0.8, armor: 5, vision: 16 },
  abilities: {
    america: [
      { id: 'airborne_drop', name: 'Airborne Drop', cooldown: 90, description: 'Paradrop 3 infantry at target', range: 40, spawnCount: 3 },
      { id: 'rally_cry', name: 'Rally Cry', cooldown: 60, duration: 10, description: '+20% damage aura', aura: { damageMult: 1.2, radius: 25 } },
      { id: 'artillery_strike', name: 'Artillery Strike', cooldown: 120, description: '3 shells at target', range: 40, shells: 3, damage: 80, radius: 8 }
    ],
    britain: [
      { id: 'smoke_barrage', name: 'Smoke Barrage', cooldown: 60, description: 'Large smoke area', range: 35, radius: 15, duration: 8 },
      { id: 'inspire', name: 'Inspire', cooldown: 60, duration: 10, description: '+25% speed aura', aura: { speedMult: 1.25, radius: 25 } },
      { id: 'naval_bombardment', name: 'Naval Bombardment', cooldown: 120, description: 'Massive damage line near water', range: 40, damage: 150, radius: 12 }
    ],
    france: [
      { id: 'resistance_cell', name: 'Resistance Cell', cooldown: 90, description: 'Spawn 5 Maquis from nearest forest', spawnCount: 5 },
      { id: 'sabotage', name: 'Sabotage', cooldown: 60, description: 'Disable target building 15s', range: 30, disableDuration: 15 },
      { id: 'fortify', name: 'Fortify', cooldown: 120, duration: 20, description: 'All buildings +50% HP', hpMult: 1.5 }
    ],
    germany: [
      { id: 'blitzkrieg_cmd', name: 'Blitzkrieg', cooldown: 90, duration: 10, description: '+30% speed all vehicles', aura: { speedMult: 1.3, radius: 999, domain: 'land' } },
      { id: 'panzer_ace', name: 'Panzer Ace', cooldown: 60, duration: 10, description: 'Commander deals 2x damage', selfDamageMult: 2.0 },
      { id: 'v2_strike', name: 'V2 Strike', cooldown: 120, description: 'Huge damage at target', range: 50, damage: 300, radius: 10 }
    ],
    japan: [
      { id: 'divine_wind', name: 'Divine Wind', cooldown: 90, duration: 10, description: 'All air +50% damage', aura: { damageMult: 1.5, radius: 999, domain: 'air' } },
      { id: 'banzai_wave', name: 'Banzai Wave', cooldown: 90, duration: 10, description: 'All infantry +40% speed', aura: { speedMult: 1.4, radius: 999, domain: 'infantry' } },
      { id: 'torpedo_barrage', name: 'Torpedo Barrage', cooldown: 120, description: 'Naval area damage', range: 40, damage: 200, radius: 15 }
    ],
    austria: [
      { id: 'mountain_fortress', name: 'Mountain Fortress', cooldown: 90, description: 'Spawn 3 turrets at location 30s', range: 35, turretCount: 3, turretDuration: 30 },
      { id: 'iron_discipline', name: 'Iron Discipline', cooldown: 60, duration: 15, description: '+3 armor all units', aura: { armor: 3, radius: 999 } },
      { id: 'siege_bombardment_cmd', name: 'Siege Bombardment', cooldown: 120, description: 'Long range artillery barrage', range: 50, damage: 100, shells: 5, radius: 10 }
    ]
  }
};

// ============================================================
// GD-112: WEATHER SYSTEM
// ============================================================
export const WEATHER_CONFIG = {
  types: {
    clear: { name: 'Clear', visionMult: 1.0, speedMult: 1.0, infantryDPS: 0, color: null, particleColor: null },
    rain: { name: 'Rain', visionMult: 0.8, speedMult: 0.9, infantryDPS: 0, color: 0x556688, particleColor: 0x8899bb },
    fog: { name: 'Fog', visionMult: 0.6, speedMult: 1.0, infantryDPS: 0, color: 0xaabbcc, particleColor: null },
    sandstorm: { name: 'Sandstorm', visionMult: 0.7, speedMult: 1.0, infantryDPS: 1, color: 0xccaa77, particleColor: 0xddbb88 }
  },
  changeInterval: [180, 240], // 3-4 minutes
  transitionDuration: 30,
  mapWeatherPool: {
    continental: ['clear', 'rain', 'fog'],
    islands: ['clear', 'rain', 'fog'],
    river: ['clear', 'rain', 'fog'],
    plains: ['clear', 'sandstorm', 'clear'],
    random: ['clear', 'rain', 'fog', 'sandstorm']
  }
};

// GD-134: Challenge Scenarios
export const CHALLENGE_SCENARIOS = {
  hold_the_line: {
    name: 'Hold the Line',
    description: 'Defend your HQ with a starting army for 10 minutes. No production allowed. Enemies attack in waves of increasing strength.',
    timeLimit: 600,
    playerNation: 'america',
    enemyNation: 'germany',
    playerStartSP: 0,
    playerStartMU: 0,
    noProduction: true,
    startingUnits: { player: { infantry: 8, tank: 3, mortar: 2, aahalftrack: 1 }, enemy: {} },
    waves: [
      { time: 30, units: { infantry: 5 } },
      { time: 90, units: { infantry: 6, tank: 2 } },
      { time: 180, units: { infantry: 8, tank: 3, mortar: 2 } },
      { time: 300, units: { infantry: 10, tank: 4, drone: 3 } },
      { time: 420, units: { infantry: 12, tank: 5, drone: 4, heavytank: 1 } },
      { time: 540, units: { infantry: 15, tank: 6, drone: 5, heavytank: 2 } }
    ],
    victory: 'survive',
    halfTimeForStars: 300
  },
  blitzkrieg: {
    name: 'Blitzkrieg',
    description: 'Destroy the enemy base within 5 minutes using a pre-built tank army. No reinforcements!',
    timeLimit: 300,
    playerNation: 'germany',
    enemyNation: 'france',
    playerStartSP: 0,
    playerStartMU: 0,
    noProduction: true,
    startingUnits: { player: { tank: 6, infantry: 4, scoutcar: 2, heavytank: 2 }, enemy: { infantry: 10, tank: 3, mortar: 3 } },
    enemyHasDefenses: true,
    victory: 'destroy_hq',
    halfTimeForStars: 150
  },
  naval_supremacy: {
    name: 'Naval Supremacy',
    description: 'Island map. Build a fleet of ships and air units to destroy the enemy fleet. Land units disabled.',
    timeLimit: 900,
    playerNation: 'japan',
    enemyNation: 'britain',
    playerStartSP: 800,
    playerStartMU: 200,
    mapTemplate: 'islands',
    navalOnly: true,
    startingUnits: { player: { patrolboat: 2 }, enemy: { patrolboat: 2 } },
    victory: 'destroy_all',
    halfTimeForStars: 450
  },
  underdog: {
    name: 'Underdog',
    description: 'Start with half resources against a Hard AI with bonus resources. Prove your skill!',
    timeLimit: 0,
    playerNation: 'france',
    enemyNation: 'japan',
    playerStartSP: 250,
    playerStartMU: 50,
    enemyStartSP: 750,
    enemyStartMU: 200,
    enemyDifficulty: 'hard',
    startingUnits: { player: {}, enemy: {} },
    victory: 'destroy_all',
    halfTimeForStars: 600
  },
  commander_duel: {
    name: 'Commander Duel',
    description: 'Commanders only! No other units. Use abilities wisely in this hero battle.',
    timeLimit: 600,
    playerNation: 'america',
    enemyNation: 'germany',
    playerStartSP: 0,
    playerStartMU: 500,
    noProduction: true,
    startingUnits: { player: { commander: 1 }, enemy: { commander: 1 } },
    victory: 'destroy_commander',
    halfTimeForStars: 120
  }
};
