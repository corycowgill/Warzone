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
  ditch: { hp: 100, cost: 0, buildTime: 5, size: 1, damageReduction: 0.5, rangeBonus: 0.25, requires: [] }
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

export const NATIONS = {
  america: { name: 'America', color: 0x3355ff, side: 'allied' },
  britain: { name: 'Great Britain', color: 0x33aa33, side: 'allied' },
  france: { name: 'France', color: 0x6666ff, side: 'allied' },
  japan: { name: 'Japan', color: 0xff3333, side: 'enemy' },
  germany: { name: 'Germany', color: 0x666666, side: 'enemy' },
  austria: { name: 'Austria', color: 0xcc6633, side: 'enemy' }
};

export const DAMAGE_MODIFIERS = {
  infantry: { infantry: 1.0, tank: 0.3, drone: 0.5, plane: 0.3, battleship: 0.1, carrier: 0.1, submarine: 0.1, building: 0.5 },
  tank: { infantry: 1.5, tank: 1.0, drone: 0.3, plane: 0.2, battleship: 0.3, carrier: 0.3, submarine: 0.1, building: 1.5 },
  drone: { infantry: 1.2, tank: 0.8, drone: 1.0, plane: 0.7, battleship: 0.5, carrier: 0.5, submarine: 0.8, building: 0.8 },
  plane: { infantry: 1.5, tank: 1.5, drone: 1.3, plane: 1.0, battleship: 1.2, carrier: 1.2, submarine: 1.0, building: 1.5 },
  battleship: { infantry: 1.5, tank: 1.2, drone: 0.5, plane: 0.3, battleship: 1.0, carrier: 1.0, submarine: 0.5, building: 2.0 },
  carrier: { infantry: 0.5, tank: 0.3, drone: 0.8, plane: 0.8, battleship: 0.3, carrier: 0.3, submarine: 0.3, building: 0.3 },
  submarine: { infantry: 0.1, tank: 0.1, drone: 0.3, plane: 0.1, battleship: 2.0, carrier: 2.0, submarine: 1.0, building: 0.5 }
};

export const GAME_CONFIG = {
  mapSize: 128,
  worldScale: 2,
  startingSP: 500,
  baseIncome: 10,
  tickRate: 1,
  unitSpeedMultiplier: 5,
  maxUnitsPerTeam: 50
};
