/**
 * Mission 3: Tank Assault
 * Break through a fortified enemy line with an armor column.
 * Player: France vs Enemy: Germany
 */
export const mission3 = {
  id: 'mission_3',
  missionNumber: 3,
  act: 1,
  name: 'Tank Assault',
  playerNation: 'france',
  enemyNation: 'germany',
  mapTemplate: 'plains',
  aiDifficulty: 'normal',

  briefing: `Allied intelligence reports a heavily fortified German defensive line stretching across the countryside. Three layers of bunkers, turrets, and entrenched infantry block our advance toward the Rhine.

The French armored division has been chosen to spearhead the breakthrough. You command a powerful column of tanks, supported by infantry and artillery. Your mission: smash through all three defensive lines and destroy the enemy command post on the far side.

Expect anti-tank positions and fortified bunkers. Use your mortars to soften defenses before committing your armor. Speed is essential - enemy reserves are being mobilized.`,

  playerStartSP: 500,
  playerStartMU: 100,
  enemyStartSP: 0,
  enemyStartMU: 0,
  noProduction: false,
  disableEnemyAI: true,

  startingUnits: {
    player: [
      { type: 'tank', count: 5, x: 40, z: 128 },
      { type: 'tank', count: 3, x: 35, z: 110 },
      { type: 'infantry', count: 6, x: 45, z: 140 },
      { type: 'mortar', count: 3, x: 30, z: 128 },
      { type: 'scoutcar', count: 2, x: 50, z: 120 },
      { type: 'engineer', count: 1, x: 35, z: 135 }
    ],
    enemy: [
      // First defense line
      { type: 'infantry', count: 5, x: 100, z: 128 },
      { type: 'infantry', count: 3, x: 100, z: 110 },
      { type: 'infantry', count: 3, x: 100, z: 146 },
      // Second defense line
      { type: 'infantry', count: 4, x: 150, z: 128 },
      { type: 'tank', count: 2, x: 155, z: 120 },
      { type: 'aahalftrack', count: 1, x: 150, z: 140 },
      // Third defense line
      { type: 'infantry', count: 6, x: 200, z: 128 },
      { type: 'tank', count: 3, x: 205, z: 115 },
      { type: 'tank', count: 2, x: 205, z: 140 },
      // HQ guard
      { type: 'heavytank', count: 1, x: 230, z: 128 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 40, z: 110 },
      { type: 'warfactory', x: 40, z: 146 }
    ],
    enemy: [
      { type: 'headquarters', x: 235, z: 128, tag: 'enemy_hq' },
      // First line
      { type: 'bunker', x: 95, z: 118, tag: 'line1_bunker1' },
      { type: 'bunker', x: 95, z: 138, tag: 'line1_bunker2' },
      { type: 'wall', x: 90, z: 110 },
      { type: 'wall', x: 90, z: 115 },
      { type: 'wall', x: 90, z: 120 },
      { type: 'wall', x: 90, z: 125 },
      { type: 'wall', x: 90, z: 130 },
      { type: 'wall', x: 90, z: 135 },
      { type: 'wall', x: 90, z: 140 },
      { type: 'wall', x: 90, z: 145 },
      // Second line
      { type: 'turret', x: 145, z: 118, tag: 'line2_turret1' },
      { type: 'turret', x: 145, z: 138, tag: 'line2_turret2' },
      { type: 'bunker', x: 148, z: 128, tag: 'line2_bunker' },
      { type: 'wall', x: 140, z: 112 },
      { type: 'wall', x: 140, z: 117 },
      { type: 'wall', x: 140, z: 122 },
      { type: 'wall', x: 140, z: 133 },
      { type: 'wall', x: 140, z: 138 },
      { type: 'wall', x: 140, z: 143 },
      // Third line
      { type: 'turret', x: 195, z: 120, tag: 'line3_turret1' },
      { type: 'turret', x: 195, z: 136, tag: 'line3_turret2' },
      { type: 'bunker', x: 198, z: 128, tag: 'line3_bunker' },
      { type: 'aaturret', x: 200, z: 115 },
      { type: 'barracks', x: 220, z: 128 }
    ]
  },

  restrictedUnits: ['battleship', 'carrier', 'submarine', 'patrolboat', 'bomber', 'plane', 'drone'],
  restrictedBuildings: ['shipyard', 'airfield', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'line1_bunker1',
      target: 1,
      name: 'Breach First Defense Line (Left)',
      description: 'Destroy the left bunker of the first defensive line.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'line1_bunker2',
      target: 1,
      name: 'Breach First Defense Line (Right)',
      description: 'Destroy the right bunker of the first defensive line.'
    },
    {
      priority: 'primary',
      type: 'destroy_enemy_hq',
      name: 'Destroy Enemy Command Post',
      description: 'Push through all defenses and destroy the enemy HQ.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 30,
      name: 'Armored Supremacy',
      description: 'Destroy 30 enemy units with your armored force.'
    },
    {
      priority: 'secondary',
      type: 'keep_units_alive',
      unitType: 'tank',
      minCount: 3,
      name: 'Preserve the Armor',
      description: 'Complete the mission with at least 3 tanks surviving.'
    }
  ],

  openingDialogue: [
    { speaker: 'General de Gaulle', text: 'France shall be liberated by French arms! Advance, and show them the fury of our armor!', duration: 5 },
    { speaker: 'Tank Commander', text: 'Column, form up! Mortars, suppress those bunkers. Tanks, advance on my signal!', duration: 5 }
  ],

  reinforcements: [
    {
      time: 120,
      notification: 'Heavy tank support has arrived!',
      units: [
        { type: 'heavytank', count: 2, team: 'player', x: 20, z: 128 }
      ]
    },
    {
      time: 90,
      notification: 'Enemy reserves from the second line!',
      units: [
        { type: 'tank', count: 2, team: 'enemy', x: 170, z: 128, attackMoveTarget: { x: 100, z: 128 } },
        { type: 'infantry', count: 4, team: 'enemy', x: 170, z: 140, attackMoveTarget: { x: 100, z: 128 } }
      ]
    },
    {
      time: 240,
      notification: 'Enemy heavy armor counterattack!',
      units: [
        { type: 'heavytank', count: 1, team: 'enemy', x: 240, z: 120, attackMoveTarget: { x: 150, z: 128 } },
        { type: 'tank', count: 3, team: 'enemy', x: 240, z: 136, attackMoveTarget: { x: 150, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'area_units',
      team: 'player',
      x: 100,
      z: 128,
      radius: 20,
      count: 1,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Tank Commander', text: 'First line breached! Keep pushing forward!', duration: 4 }
        ]},
        { type: 'notification', text: 'First defense line penetrated!', color: '#00ff44' }
      ]
    },
    {
      type: 'area_units',
      team: 'player',
      x: 155,
      z: 128,
      radius: 20,
      count: 1,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Tank Commander', text: 'Second line down! One more to go!', duration: 4 }
        ]},
        { type: 'notification', text: 'Second defense line penetrated!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 60,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Radio', text: 'Intelligence reports enemy reserves moving to reinforce the second line. Hurry!', duration: 4 }
        ]}
      ]
    }
  ]
};
