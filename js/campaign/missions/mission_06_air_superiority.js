/**
 * Mission 6: Air Superiority
 * Gain control of the skies, protect your bombers.
 * Player: America vs Enemy: Japan
 */
export const mission6 = {
  id: 'mission_6',
  missionNumber: 6,
  act: 2,
  name: 'Air Superiority',
  playerNation: 'america',
  enemyNation: 'japan',
  mapTemplate: 'islands',
  aiDifficulty: 'normal',

  briefing: `Japanese air power in the Pacific is still a serious threat. Their Zero fighters control the skies above our island chain, making naval operations dangerous and ground operations costly.

Command has ordered an all-out air campaign. Your airbase has been established on a captured island. Build up your air force, establish air superiority, and then launch a bombing run on the enemy's airfield to permanently cripple their air capability.

Protect your bombers at all costs. They are the key to knocking out the enemy airfield. Build escort fighters, anti-aircraft defenses, and strike when the time is right.`,

  playerStartSP: 700,
  playerStartMU: 200,
  enemyStartSP: 500,
  enemyStartMU: 150,
  disableEnemyAI: true,

  startingUnits: {
    player: [
      { type: 'drone', count: 4, x: 50, z: 128 },
      { type: 'plane', count: 2, x: 45, z: 120 },
      { type: 'infantry', count: 4, x: 40, z: 140 },
      { type: 'aahalftrack', count: 2, x: 45, z: 135 }
    ],
    enemy: [
      // Enemy air force
      { type: 'drone', count: 5, x: 200, z: 128 },
      { type: 'plane', count: 3, x: 210, z: 120 },
      { type: 'drone', count: 3, x: 200, z: 140 },
      // Ground forces
      { type: 'infantry', count: 6, x: 190, z: 128 },
      { type: 'aahalftrack', count: 2, x: 195, z: 118 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 45, z: 110 },
      { type: 'warfactory', x: 45, z: 146 },
      { type: 'airfield', x: 55, z: 128, tag: 'player_airfield' }
    ],
    enemy: [
      { type: 'headquarters', x: 220, z: 128 },
      { type: 'barracks', x: 200, z: 110 },
      { type: 'airfield', x: 210, z: 128, tag: 'enemy_airfield' },
      { type: 'aaturret', x: 195, z: 128 },
      { type: 'aaturret', x: 205, z: 118 },
      { type: 'aaturret', x: 205, z: 138 },
      { type: 'turret', x: 190, z: 125 },
      { type: 'turret', x: 190, z: 131 }
    ]
  },

  restrictedUnits: ['battleship', 'carrier', 'submarine', 'heavytank', 'spg'],
  restrictedBuildings: ['shipyard', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'produce_units',
      unitType: 'plane',
      count: 4,
      name: 'Build Air Force',
      description: 'Produce at least 4 fighter planes.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'enemy_airfield',
      target: 1,
      name: 'Destroy Enemy Airfield',
      description: 'Bomb the enemy airfield to eliminate their air capability.'
    },
    {
      priority: 'primary',
      type: 'destroy_all_enemy_buildings',
      name: 'Eliminate Enemy Base',
      description: 'Destroy all remaining enemy structures.'
    },
    {
      priority: 'secondary',
      type: 'build_building',
      buildingType: 'aaturret',
      count: 3,
      name: 'Air Defense Network',
      description: 'Build 3 AA turrets to protect your base.'
    },
    {
      priority: 'secondary',
      type: 'keep_units_alive',
      unitType: 'plane',
      minCount: 2,
      name: 'Ace Pilots',
      description: 'Keep at least 2 fighter planes alive throughout the mission.'
    }
  ],

  openingDialogue: [
    { speaker: 'Air Marshal', text: 'The enemy controls the skies. That ends today. Get your planes in the air and clear them out!', duration: 5 },
    { speaker: 'Wing Commander', text: 'Scramble all fighters! Protect our airfield and build up for the strike on theirs!', duration: 4 }
  ],

  reinforcements: [
    {
      time: 60,
      notification: 'Enemy air raid incoming!',
      units: [
        { type: 'drone', count: 4, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 55, z: 128 } },
        { type: 'plane', count: 2, team: 'enemy', x: 240, z: 120, attackMoveTarget: { x: 55, z: 128 } }
      ]
    },
    {
      time: 150,
      notification: 'Bomber squadron ready for deployment!',
      units: [
        { type: 'bomber', count: 2, team: 'player', x: 30, z: 128 }
      ]
    },
    {
      time: 180,
      notification: 'Second enemy air wave!',
      units: [
        { type: 'plane', count: 4, team: 'enemy', x: 240, z: 130, attackMoveTarget: { x: 55, z: 128 } },
        { type: 'drone', count: 3, team: 'enemy', x: 240, z: 120, attackMoveTarget: { x: 55, z: 128 } }
      ]
    },
    {
      time: 300,
      notification: 'Enemy kamikaze wave! Protect your base!',
      units: [
        { type: 'drone', count: 6, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 30, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'tagged_destroyed',
      tag: 'enemy_airfield',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Wing Commander', text: 'Their airfield is destroyed! They cannot launch any more planes!', duration: 5 }
        ]},
        { type: 'notification', text: 'Air superiority achieved!', color: '#00ff44' },
        { type: 'camera_shake', intensity: 3 }
      ]
    }
  ],

  timedEvents: [
    {
      time: 45,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Radar Operator', text: 'Bogeys on radar! Enemy aircraft approaching from the east!', duration: 4 }
        ]}
      ]
    },
    {
      time: 140,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Air Marshal', text: 'Your bombers are ready. Escort them to the enemy airfield and finish this!', duration: 5 }
        ]}
      ]
    }
  ]
};
