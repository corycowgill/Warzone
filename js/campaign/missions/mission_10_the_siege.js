/**
 * Mission 10: The Siege
 * Surround and starve out a fortified position.
 * Player: France vs Enemy: Austria
 */
export const mission10 = {
  id: 'mission_10',
  missionNumber: 10,
  act: 3,
  name: 'The Siege',
  playerNation: 'france',
  enemyNation: 'austria',
  mapTemplate: 'continental',
  aiDifficulty: 'hard',

  briefing: `An Austrian mountain fortress dominates a critical mountain pass. Frontal assault would be suicidal - the defenses are too strong, the terrain too favorable for the defenders.

Instead, High Command has ordered a siege. Surround the fortress, cut off all supply routes, and destroy their resource buildings. Without supplies, the garrison will weaken. You have been given a large force and ample resources to build siege lines.

Be patient but vigilant. The garrison will attempt breakout sorties, and relief forces may attempt to break through your encirclement. Hold the siege, destroy their economy, and the fortress will fall.`,

  playerStartSP: 1000,
  playerStartMU: 250,
  enemyStartSP: 600,
  enemyStartMU: 150,
  disableEnemyAI: false,

  startingUnits: {
    player: [
      // Northern siege force
      { type: 'infantry', count: 6, x: 80, z: 80 },
      { type: 'tank', count: 2, x: 85, z: 75 },
      { type: 'mortar', count: 2, x: 75, z: 85 },
      // Southern siege force
      { type: 'infantry', count: 6, x: 80, z: 176 },
      { type: 'tank', count: 2, x: 85, z: 180 },
      { type: 'mortar', count: 2, x: 75, z: 172 },
      // Western main force
      { type: 'infantry', count: 8, x: 50, z: 128 },
      { type: 'tank', count: 4, x: 55, z: 120 },
      { type: 'heavytank', count: 1, x: 50, z: 128 },
      { type: 'spg', count: 2, x: 40, z: 128 },
      { type: 'engineer', count: 2, x: 50, z: 135 }
    ],
    enemy: [
      // Fortress garrison
      { type: 'infantry', count: 10, x: 155, z: 128 },
      { type: 'infantry', count: 5, x: 150, z: 115 },
      { type: 'infantry', count: 5, x: 150, z: 141 },
      { type: 'tank', count: 3, x: 160, z: 128 },
      { type: 'heavytank', count: 1, x: 165, z: 128 },
      { type: 'mortar', count: 3, x: 155, z: 120 },
      { type: 'aahalftrack', count: 2, x: 160, z: 138 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 45, z: 115 },
      { type: 'barracks', x: 45, z: 141 },
      { type: 'warfactory', x: 40, z: 128 },
      { type: 'techlab', x: 50, z: 148 }
    ],
    enemy: [
      { type: 'headquarters', x: 170, z: 128, tag: 'fortress_hq' },
      { type: 'barracks', x: 155, z: 110 },
      { type: 'barracks', x: 155, z: 146 },
      { type: 'warfactory', x: 160, z: 128 },
      { type: 'resourcedepot', x: 180, z: 120, tag: 'supply_line_1' },
      { type: 'resourcedepot', x: 180, z: 136, tag: 'supply_line_2' },
      { type: 'supplydepot', x: 175, z: 115, tag: 'supply_line_3' },
      { type: 'supplydepot', x: 175, z: 141, tag: 'supply_line_4' },
      // Heavy fortifications
      { type: 'bunker', x: 140, z: 118 },
      { type: 'bunker', x: 140, z: 128 },
      { type: 'bunker', x: 140, z: 138 },
      { type: 'turret', x: 135, z: 113 },
      { type: 'turret', x: 135, z: 143 },
      { type: 'aaturret', x: 150, z: 128 },
      { type: 'wall', x: 130, z: 108 },
      { type: 'wall', x: 130, z: 113 },
      { type: 'wall', x: 130, z: 118 },
      { type: 'wall', x: 130, z: 123 },
      { type: 'wall', x: 130, z: 128 },
      { type: 'wall', x: 130, z: 133 },
      { type: 'wall', x: 130, z: 138 },
      { type: 'wall', x: 130, z: 143 },
      { type: 'wall', x: 130, z: 148 }
    ]
  },

  restrictedUnits: ['carrier', 'battleship', 'submarine', 'patrolboat'],
  restrictedBuildings: ['shipyard', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'supply_line_1',
      target: 1,
      name: 'Cut Supply Line Alpha',
      description: 'Destroy the eastern resource depot.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'supply_line_2',
      target: 1,
      name: 'Cut Supply Line Bravo',
      description: 'Destroy the southeastern resource depot.'
    },
    {
      priority: 'primary',
      type: 'destroy_enemy_hq',
      name: 'Capture the Fortress',
      description: 'With supplies cut, storm the fortress and destroy the HQ.'
    },
    {
      priority: 'secondary',
      type: 'destroy_tagged',
      tag: 'supply_line_3',
      target: 1,
      name: 'Total Blockade (North)',
      description: 'Destroy the northern supply depot.'
    },
    {
      priority: 'secondary',
      type: 'destroy_tagged',
      tag: 'supply_line_4',
      target: 1,
      name: 'Total Blockade (South)',
      description: 'Destroy the southern supply depot.'
    }
  ],

  openingDialogue: [
    { speaker: 'General', text: 'The fortress is impregnable to direct assault. We will starve them out. Cut their supply lines!', duration: 5 },
    { speaker: 'Artillery Officer', text: 'Our SPGs can reach their fortifications from range. Use them to soften the defenses.', duration: 5 }
  ],

  reinforcements: [
    // Enemy breakout attempt
    {
      time: 120,
      notification: 'Enemy breakout attempt from the fortress!',
      units: [
        { type: 'tank', count: 3, team: 'enemy', x: 145, z: 128, attackMoveTarget: { x: 50, z: 128 } },
        { type: 'infantry', count: 6, team: 'enemy', x: 145, z: 120, attackMoveTarget: { x: 50, z: 128 } }
      ]
    },
    // Relief force from the east
    {
      time: 240,
      notification: 'Enemy relief force approaching from the east!',
      units: [
        { type: 'infantry', count: 8, team: 'enemy', edge: 'right', attackMoveTarget: { x: 170, z: 128 } },
        { type: 'tank', count: 4, team: 'enemy', edge: 'right', attackMoveTarget: { x: 170, z: 128 } },
        { type: 'heavytank', count: 1, team: 'enemy', edge: 'right', attackMoveTarget: { x: 170, z: 128 } }
      ]
    },
    // Player air support
    {
      time: 180,
      notification: 'Air support authorized! Bombers incoming!',
      units: [
        { type: 'bomber', count: 1, team: 'player', x: 20, z: 128 },
        { type: 'drone', count: 3, team: 'player', x: 20, z: 120 }
      ]
    },
    // Second relief force
    {
      time: 420,
      notification: 'Major enemy relief column from the northeast!',
      units: [
        { type: 'infantry', count: 10, team: 'enemy', x: 240, z: 80, attackMoveTarget: { x: 170, z: 128 } },
        { type: 'tank', count: 5, team: 'enemy', x: 240, z: 70, attackMoveTarget: { x: 170, z: 128 } },
        { type: 'heavytank', count: 2, team: 'enemy', x: 240, z: 90, attackMoveTarget: { x: 170, z: 128 } },
        { type: 'spg', count: 1, team: 'enemy', x: 245, z: 80, attackMoveTarget: { x: 170, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'objective_complete',
      objectiveIndex: 0, // supply_line_1 destroyed
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'First supply line cut! The garrison is weakening. Keep the pressure on!', duration: 4 }
        ]}
      ]
    },
    {
      type: 'objective_complete',
      objectiveIndex: 1, // supply_line_2 destroyed
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General', text: 'Both main supply lines destroyed! The fortress is running on fumes. Prepare the final assault!', duration: 5 }
        ]},
        { type: 'notification', text: 'Supply lines severed! Fortress weakening!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 90,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Scout', text: 'General, the garrison is preparing a sortie. They may try to break out!', duration: 4 }
        ]}
      ]
    }
  ]
};
