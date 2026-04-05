/**
 * Mission 1: D-Day Landing
 * Land infantry on the beach, destroy coastal defenses, establish a beachhead.
 * Player: America vs Enemy: Germany
 */
export const mission1 = {
  id: 'mission_1',
  missionNumber: 1,
  act: 1,
  name: 'D-Day Landing',
  playerNation: 'america',
  enemyNation: 'germany',
  mapTemplate: 'continental',
  aiDifficulty: 'easy',

  briefing: `June 6th, 1944. The largest amphibious invasion in history is about to begin. Allied forces have gathered in the English Channel, poised to strike at the heart of Fortress Europe.

Your objective is to land your infantry on the fortified beaches of Normandy, eliminate the German coastal defenses, and establish a secure beachhead for the main invasion force.

The enemy has fortified the coastline with bunkers, turrets, and machine gun nests. The first wave will take heavy casualties, but reinforcements are on the way. Hold the beach and push inland. The fate of the free world depends on your success today.`,

  playerStartSP: 300,
  playerStartMU: 50,
  enemyStartSP: 0,
  enemyStartMU: 0,
  noProduction: false,
  noPlayerBuilding: false,
  disableEnemyAI: true,

  // Player starts on the left (beach), enemy fortifications on the right
  startingUnits: {
    player: [
      { type: 'infantry', count: 8, x: 30, z: 120 },
      { type: 'infantry', count: 6, x: 30, z: 140 },
      { type: 'mortar', count: 2, x: 25, z: 130 }
    ],
    enemy: [
      { type: 'infantry', count: 5, x: 140, z: 128, tag: 'beach_defense_1' },
      { type: 'infantry', count: 4, x: 160, z: 110, tag: 'beach_defense_2' },
      { type: 'infantry', count: 3, x: 160, z: 150 },
      { type: 'tank', count: 1, x: 180, z: 128 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 }
    ],
    enemy: [
      { type: 'headquarters', x: 210, z: 128 },
      { type: 'bunker', x: 130, z: 120, tag: 'coastal_bunker_1' },
      { type: 'bunker', x: 130, z: 140, tag: 'coastal_bunker_2' },
      { type: 'turret', x: 150, z: 128, tag: 'coastal_turret' },
      { type: 'barracks', x: 190, z: 128 },
      { type: 'wall', x: 125, z: 115 },
      { type: 'wall', x: 125, z: 120 },
      { type: 'wall', x: 125, z: 125 },
      { type: 'wall', x: 125, z: 130 },
      { type: 'wall', x: 125, z: 135 },
      { type: 'wall', x: 125, z: 140 },
      { type: 'wall', x: 125, z: 145 }
    ]
  },

  restrictedUnits: ['battleship', 'carrier', 'submarine', 'patrolboat', 'bomber', 'plane', 'heavytank', 'spg'],
  restrictedBuildings: ['shipyard', 'airfield', 'techlab', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'coastal_bunker_1',
      target: 1,
      name: 'Destroy Coastal Bunker Alpha',
      description: 'Eliminate the left coastal bunker.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'coastal_bunker_2',
      target: 1,
      name: 'Destroy Coastal Bunker Bravo',
      description: 'Eliminate the right coastal bunker.'
    },
    {
      priority: 'primary',
      type: 'reach_area',
      x: 160,
      z: 128,
      radius: 25,
      unitCount: 3,
      name: 'Establish Beachhead',
      description: 'Move at least 3 units past the coastal defenses.'
    },
    {
      priority: 'secondary',
      type: 'destroy_tagged',
      tag: 'coastal_turret',
      target: 1,
      name: 'Destroy the Gun Emplacement',
      description: 'Take out the central turret.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 20,
      name: 'Overwhelming Force',
      description: 'Eliminate 20 enemy units.'
    }
  ],

  openingDialogue: [
    { speaker: 'General Eisenhower', text: 'The eyes of the world are upon you. The hopes and prayers of liberty-loving people everywhere march with you.', duration: 6 },
    { speaker: 'Field Commander', text: 'All units, prepare for beach assault! Landing craft, deploy!', duration: 4 }
  ],

  reinforcements: [
    {
      time: 60,
      notification: 'Second wave landing! Tank reinforcements arriving!',
      units: [
        { type: 'tank', count: 3, team: 'player', x: 20, z: 128 },
        { type: 'infantry', count: 4, team: 'player', x: 20, z: 140 }
      ]
    },
    {
      time: 150,
      notification: 'Third wave! Engineers and heavy support incoming!',
      units: [
        { type: 'engineer', count: 1, team: 'player', x: 20, z: 128 },
        { type: 'tank', count: 2, team: 'player', x: 20, z: 120 },
        { type: 'infantry', count: 5, team: 'player', x: 20, z: 140 }
      ]
    },
    {
      time: 120,
      notification: 'Enemy reinforcements from inland!',
      units: [
        { type: 'infantry', count: 4, team: 'enemy', x: 230, z: 128, attackMoveTarget: { x: 130, z: 128 } },
        { type: 'tank', count: 1, team: 'enemy', x: 230, z: 140, attackMoveTarget: { x: 130, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'tagged_destroyed',
      tag: 'coastal_bunker_1',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Sergeant', text: 'Left bunker is down! Push through the gap!', duration: 4 }
        ]},
        { type: 'camera_shake', intensity: 2 }
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'coastal_bunker_2',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Sergeant', text: 'Right bunker eliminated! The beach is ours!', duration: 4 }
        ]},
        { type: 'notification', text: 'Beach defenses neutralized!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 30,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Radio Operator', text: 'Heavy fire on the beach! We need to take out those bunkers!', duration: 4 }
        ]}
      ]
    }
  ]
};
