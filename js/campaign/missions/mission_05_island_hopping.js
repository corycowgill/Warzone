/**
 * Mission 5: Island Hopping
 * Naval assault, establish a base on an island.
 * Player: America vs Enemy: Japan
 */
export const mission5 = {
  id: 'mission_5',
  missionNumber: 5,
  act: 2,
  name: 'Island Hopping',
  playerNation: 'america',
  enemyNation: 'japan',
  mapTemplate: 'islands',
  aiDifficulty: 'normal',

  briefing: `The Pacific campaign has begun. American forces are implementing the island-hopping strategy, bypassing heavily fortified positions to strike at strategic islands closer to the Japanese homeland.

Your task force has been assigned to capture a key island in the Marshall chain. The Japanese garrison is dug in, but a combined naval and marine assault should overwhelm them. Land your marines on the beach, establish a forward base, and neutralize all enemy resistance on the island.

Your fleet will provide fire support, but the marines must do the heavy lifting on shore. Build up your base quickly - the Japanese may call for naval reinforcements.`,

  playerStartSP: 500,
  playerStartMU: 100,
  enemyStartSP: 200,
  enemyStartMU: 50,
  disableEnemyAI: true,

  startingUnits: {
    player: [
      // Naval force
      { type: 'battleship', count: 1, x: 30, z: 128 },
      { type: 'patrolboat', count: 2, x: 25, z: 118 },
      { type: 'patrolboat', count: 2, x: 25, z: 138 },
      // Marines
      { type: 'infantry', count: 8, x: 50, z: 128 },
      { type: 'infantry', count: 4, x: 50, z: 115 },
      { type: 'mortar', count: 2, x: 45, z: 128 },
      { type: 'engineer', count: 1, x: 50, z: 135 }
    ],
    enemy: [
      // Island garrison
      { type: 'infantry', count: 6, x: 160, z: 128 },
      { type: 'infantry', count: 4, x: 170, z: 115 },
      { type: 'infantry', count: 4, x: 170, z: 141 },
      { type: 'mortar', count: 2, x: 165, z: 128 },
      // Naval patrol
      { type: 'patrolboat', count: 2, x: 200, z: 100 },
      { type: 'submarine', count: 1, x: 210, z: 150 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 40, z: 128 }
    ],
    enemy: [
      { type: 'headquarters', x: 200, z: 128, tag: 'island_hq' },
      { type: 'barracks', x: 180, z: 128 },
      { type: 'bunker', x: 150, z: 120, tag: 'beach_bunker_1' },
      { type: 'bunker', x: 150, z: 136, tag: 'beach_bunker_2' },
      { type: 'turret', x: 155, z: 128 },
      { type: 'aaturret', x: 175, z: 128 },
      { type: 'shipyard', x: 210, z: 110 }
    ]
  },

  restrictedUnits: ['bomber', 'heavytank', 'spg'],
  restrictedBuildings: ['superweapon', 'techlab'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'beach_bunker_1',
      target: 1,
      name: 'Clear Beach Defenses (North)',
      description: 'Destroy the northern beach bunker.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'beach_bunker_2',
      target: 1,
      name: 'Clear Beach Defenses (South)',
      description: 'Destroy the southern beach bunker.'
    },
    {
      priority: 'primary',
      type: 'build_building',
      buildingType: 'barracks',
      count: 1,
      name: 'Establish Forward Base',
      description: 'Build a barracks on the island.'
    },
    {
      priority: 'primary',
      type: 'destroy_enemy_hq',
      name: 'Capture the Island',
      description: 'Destroy the Japanese command center.'
    },
    {
      priority: 'secondary',
      type: 'produce_units',
      unitType: 'patrolboat',
      count: 3,
      name: 'Naval Dominance',
      description: 'Build a fleet of 3 patrol boats.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 25,
      name: 'Island Clearer',
      description: 'Eliminate 25 enemy combatants.'
    }
  ],

  openingDialogue: [
    { speaker: 'Admiral Nimitz', text: 'The island must be taken. Begin the bombardment, then land the marines.', duration: 5 },
    { speaker: 'Marine Captain', text: 'Semper Fi, boys. Hit the beach hard and do not stop moving!', duration: 4 }
  ],

  reinforcements: [
    {
      time: 120,
      notification: 'Japanese naval reinforcements spotted!',
      units: [
        { type: 'patrolboat', count: 3, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 40, z: 128 } },
        { type: 'infantry', count: 5, team: 'enemy', x: 220, z: 128, attackMoveTarget: { x: 160, z: 128 } }
      ]
    },
    {
      time: 200,
      notification: 'Enemy submarine wolf pack incoming!',
      units: [
        { type: 'submarine', count: 2, team: 'enemy', x: 240, z: 140, attackMoveTarget: { x: 30, z: 128 } }
      ]
    },
    {
      time: 180,
      notification: 'American carrier support arriving!',
      units: [
        { type: 'drone', count: 3, team: 'player', x: 20, z: 128 }
      ]
    }
  ],

  triggers: [
    {
      type: 'area_units',
      team: 'player',
      x: 160,
      z: 128,
      radius: 30,
      count: 3,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Marine Captain', text: 'We are on the beach! Push inland and secure a perimeter!', duration: 4 }
        ]},
        { type: 'notification', text: 'Beach secured! Establish your base!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 60,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Navy Spotter', text: 'Radar contacts approaching from the east. Enemy ships inbound!', duration: 4 }
        ]}
      ]
    }
  ]
};
