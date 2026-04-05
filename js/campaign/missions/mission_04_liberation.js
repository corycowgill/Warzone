/**
 * Mission 4: Liberation
 * Capture and hold a city against counterattacks.
 * Player: Britain vs Enemy: Germany
 */
export const mission4 = {
  id: 'mission_4',
  missionNumber: 4,
  act: 1,
  name: 'Liberation',
  playerNation: 'britain',
  enemyNation: 'germany',
  mapTemplate: 'continental',
  aiDifficulty: 'normal',

  briefing: `After breaking through the enemy lines, Allied forces are advancing on the strategic city of Caen. German forces have dug in and are preparing a determined defense.

Your objective is twofold: first, capture the city center by moving forces into the heart of the town. Then, hold the position against the inevitable German counterattack. Intelligence reports at least three waves of enemy reinforcements heading toward the city.

Build defensive positions quickly once you control the center. The enemy will throw everything they have at you to reclaim this vital crossroads. Hold firm, and the road to Paris lies open.`,

  playerStartSP: 600,
  playerStartMU: 150,
  enemyStartSP: 300,
  enemyStartMU: 100,
  disableEnemyAI: false,

  startingUnits: {
    player: [
      { type: 'infantry', count: 8, x: 40, z: 128 },
      { type: 'tank', count: 4, x: 45, z: 115 },
      { type: 'mortar', count: 2, x: 35, z: 140 },
      { type: 'aahalftrack', count: 1, x: 40, z: 145 },
      { type: 'scoutcar', count: 2, x: 50, z: 128 },
      { type: 'apc', count: 1, x: 40, z: 135 }
    ],
    enemy: [
      // City garrison
      { type: 'infantry', count: 6, x: 128, z: 128 },
      { type: 'infantry', count: 4, x: 130, z: 115 },
      { type: 'infantry', count: 4, x: 130, z: 141 },
      { type: 'tank', count: 2, x: 135, z: 128 },
      { type: 'mortar', count: 2, x: 128, z: 120 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 45, z: 110 },
      { type: 'warfactory', x: 45, z: 146 }
    ],
    enemy: [
      { type: 'headquarters', x: 220, z: 128 },
      { type: 'barracks', x: 200, z: 120 },
      { type: 'warfactory', x: 200, z: 136 },
      // City defenses
      { type: 'bunker', x: 120, z: 120, tag: 'city_bunker_1' },
      { type: 'bunker', x: 120, z: 136, tag: 'city_bunker_2' },
      { type: 'turret', x: 128, z: 110 },
      { type: 'turret', x: 128, z: 146 }
    ]
  },

  restrictedUnits: ['battleship', 'carrier', 'submarine', 'patrolboat', 'bomber'],
  restrictedBuildings: ['shipyard', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'reach_area',
      x: 128,
      z: 128,
      radius: 25,
      unitCount: 5,
      name: 'Capture the City Center',
      description: 'Move at least 5 units into the city center.'
    },
    {
      priority: 'primary',
      type: 'hold_area',
      x: 128,
      z: 128,
      radius: 30,
      unitCount: 3,
      target: 180, // hold for 3 minutes
      name: 'Hold the City',
      description: 'Maintain control of the city center for 3 minutes.'
    },
    {
      priority: 'primary',
      type: 'destroy_enemy_hq',
      name: 'Destroy Enemy HQ',
      description: 'Eliminate the enemy command post east of the city.'
    },
    {
      priority: 'secondary',
      type: 'build_building',
      buildingType: 'bunker',
      count: 2,
      name: 'Fortify the City',
      description: 'Build 2 bunkers to fortify your position.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 40,
      name: 'City Defender',
      description: 'Eliminate 40 enemy units total.'
    }
  ],

  openingDialogue: [
    { speaker: 'Field Marshal', text: 'Caen must be taken today. The city is the key to Normandy. Advance and liberate it!', duration: 5 },
    { speaker: 'Captain', text: 'Right, let us clear the city block by block. Watch for ambushes in the streets.', duration: 4 }
  ],

  reinforcements: [
    {
      time: 90,
      notification: 'First German counterattack incoming from the east!',
      units: [
        { type: 'infantry', count: 8, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'tank', count: 3, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } }
      ]
    },
    {
      time: 180,
      notification: 'Second counterattack wave! Armor and air support!',
      units: [
        { type: 'tank', count: 4, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'infantry', count: 6, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'drone', count: 2, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 128, z: 128 } }
      ]
    },
    {
      time: 300,
      notification: 'Final counterattack! Heavy armor approaching!',
      units: [
        { type: 'heavytank', count: 2, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'tank', count: 3, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'infantry', count: 8, team: 'enemy', edge: 'right', attackMoveTarget: { x: 128, z: 128 } },
        { type: 'drone', count: 3, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 128, z: 128 } }
      ]
    },
    {
      time: 150,
      notification: 'Allied reinforcements arriving!',
      units: [
        { type: 'tank', count: 2, team: 'player', x: 20, z: 128 },
        { type: 'infantry', count: 4, team: 'player', x: 20, z: 140 }
      ]
    }
  ],

  triggers: [
    {
      type: 'area_units',
      team: 'player',
      x: 128,
      z: 128,
      radius: 25,
      count: 5,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Captain', text: 'We control the city center! Dig in, the counterattack is coming!', duration: 5 }
        ]},
        { type: 'notification', text: 'City center captured! Prepare to defend!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 80,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'Enemy reserves spotted moving west. Brace for counterattack!', duration: 4 }
        ]}
      ]
    }
  ]
};
