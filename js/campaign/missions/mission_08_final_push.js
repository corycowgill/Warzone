/**
 * Mission 8: Final Push
 * Combined arms assault on a fortified island.
 * Player: America vs Enemy: Japan
 */
export const mission8 = {
  id: 'mission_8',
  missionNumber: 8,
  act: 2,
  name: 'Final Push',
  playerNation: 'america',
  enemyNation: 'japan',
  mapTemplate: 'islands',
  aiDifficulty: 'hard',

  briefing: `This is it - the final island stronghold before the Japanese homeland. Okinawa is the largest and most heavily defended position in the Pacific. The Japanese have had months to prepare, and their defenses are formidable.

This will be a full combined-arms operation. Your naval fleet will provide bombardment, your air force will establish superiority, and your marines and tanks will storm the beaches. Build up your forces, coordinate all three branches, and break through the enemy's defenses.

Take the island, and the war in the Pacific is effectively won. Fail, and the cost in lives will be catastrophic.`,

  playerStartSP: 1000,
  playerStartMU: 300,
  enemyStartSP: 500,
  enemyStartMU: 200,
  disableEnemyAI: false,

  startingUnits: {
    player: [
      // Naval force
      { type: 'battleship', count: 2, x: 20, z: 128 },
      { type: 'patrolboat', count: 3, x: 15, z: 110 },
      { type: 'submarine', count: 1, x: 15, z: 145 },
      // Air
      { type: 'drone', count: 3, x: 40, z: 128 },
      { type: 'plane', count: 2, x: 40, z: 118 },
      // Ground
      { type: 'infantry', count: 10, x: 50, z: 128 },
      { type: 'tank', count: 4, x: 50, z: 115 },
      { type: 'mortar', count: 2, x: 45, z: 140 },
      { type: 'aahalftrack', count: 2, x: 50, z: 145 },
      { type: 'engineer', count: 1, x: 45, z: 128 }
    ],
    enemy: [
      // Beach defense
      { type: 'infantry', count: 8, x: 140, z: 128 },
      { type: 'infantry', count: 4, x: 140, z: 110 },
      { type: 'infantry', count: 4, x: 140, z: 146 },
      { type: 'mortar', count: 3, x: 145, z: 128 },
      // Inner defense
      { type: 'tank', count: 3, x: 180, z: 128 },
      { type: 'heavytank', count: 1, x: 185, z: 128 },
      { type: 'aahalftrack', count: 2, x: 180, z: 118 },
      // Naval
      { type: 'battleship', count: 1, x: 230, z: 128 },
      { type: 'submarine', count: 2, x: 240, z: 115 },
      { type: 'patrolboat', count: 3, x: 235, z: 140 },
      // Air
      { type: 'drone', count: 4, x: 200, z: 128 },
      { type: 'plane', count: 2, x: 205, z: 118 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 35, z: 128 },
      { type: 'barracks', x: 50, z: 105 },
      { type: 'warfactory', x: 50, z: 151 },
      { type: 'airfield', x: 45, z: 128 },
      { type: 'shipyard', x: 25, z: 100 }
    ],
    enemy: [
      { type: 'headquarters', x: 215, z: 128, tag: 'enemy_hq' },
      { type: 'barracks', x: 200, z: 115 },
      { type: 'barracks', x: 200, z: 141 },
      { type: 'warfactory', x: 205, z: 128 },
      { type: 'airfield', x: 210, z: 115 },
      { type: 'shipyard', x: 230, z: 100 },
      // Fortifications
      { type: 'bunker', x: 135, z: 120, tag: 'outer_bunker_1' },
      { type: 'bunker', x: 135, z: 136, tag: 'outer_bunker_2' },
      { type: 'turret', x: 140, z: 128 },
      { type: 'turret', x: 170, z: 120 },
      { type: 'turret', x: 170, z: 136 },
      { type: 'aaturret', x: 175, z: 128 },
      { type: 'aaturret', x: 190, z: 128 },
      { type: 'wall', x: 130, z: 112 },
      { type: 'wall', x: 130, z: 117 },
      { type: 'wall', x: 130, z: 122 },
      { type: 'wall', x: 130, z: 127 },
      { type: 'wall', x: 130, z: 132 },
      { type: 'wall', x: 130, z: 137 },
      { type: 'wall', x: 130, z: 142 }
    ]
  },

  restrictedUnits: [],
  restrictedBuildings: ['superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'outer_bunker_1',
      target: 1,
      name: 'Breach Outer Defenses (North)',
      description: 'Destroy the northern outer bunker.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'outer_bunker_2',
      target: 1,
      name: 'Breach Outer Defenses (South)',
      description: 'Destroy the southern outer bunker.'
    },
    {
      priority: 'primary',
      type: 'destroy_enemy_hq',
      name: 'Capture the Island',
      description: 'Destroy the Japanese command headquarters.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 60,
      name: 'Total Victory',
      description: 'Eliminate 60 enemy combatants.'
    },
    {
      priority: 'secondary',
      type: 'produce_units',
      unitType: 'bomber',
      count: 2,
      name: 'Strategic Bombing',
      description: 'Build 2 bombers for strategic strikes.'
    }
  ],

  openingDialogue: [
    { speaker: 'Admiral', text: 'This is the big one. Every ship, every plane, every marine. Take that island.', duration: 5 },
    { speaker: 'General', text: 'Coordinate your forces. Navy softens them up, air clears the skies, marines storm the beach. Let us end this war.', duration: 6 }
  ],

  reinforcements: [
    {
      time: 120,
      notification: 'Enemy kamikaze attack!',
      units: [
        { type: 'drone', count: 5, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 35, z: 128 } }
      ]
    },
    {
      time: 180,
      notification: 'Reinforcement fleet arriving!',
      units: [
        { type: 'tank', count: 3, team: 'player', x: 30, z: 128 },
        { type: 'infantry', count: 6, team: 'player', x: 30, z: 140 },
        { type: 'heavytank', count: 1, team: 'player', x: 30, z: 120 }
      ]
    },
    {
      time: 240,
      notification: 'Enemy naval counterattack!',
      units: [
        { type: 'battleship', count: 1, team: 'enemy', x: 250, z: 128, attackMoveTarget: { x: 20, z: 128 } },
        { type: 'submarine', count: 2, team: 'enemy', x: 250, z: 140, attackMoveTarget: { x: 20, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'area_units',
      team: 'player',
      x: 180,
      z: 128,
      radius: 25,
      count: 5,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General', text: 'We have broken through! Push for the HQ!', duration: 4 }
        ]},
        { type: 'notification', text: 'Inner defenses breached!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: []
};
