/**
 * Mission 7: Rising Sun (Play as Japan)
 * Defend island fortress against a naval invasion.
 * Player: Japan vs Enemy: America
 */
export const mission7 = {
  id: 'mission_7',
  missionNumber: 7,
  act: 2,
  name: 'Rising Sun',
  playerNation: 'japan',
  enemyNation: 'america',
  mapTemplate: 'islands',
  aiDifficulty: 'normal',

  briefing: `The tide of war has turned in the Pacific. American forces are closing in on the outer islands of the Japanese Empire. Your garrison on Iwo Jima has been ordered to hold at all costs.

You command the island's defenses. Fortify your positions, build coastal guns, and prepare for the inevitable American amphibious assault. Wave after wave of marines and ships will assault your beaches.

For the Emperor, you must hold this island. Every hour you delay the American advance buys precious time for the homeland's defenses. Dig in deep - this will be a fight to the last man.`,

  playerStartSP: 800,
  playerStartMU: 200,
  enemyStartSP: 0,
  enemyStartMU: 0,
  disableEnemyAI: true,
  victoryOnTimeOut: true,
  timeLimit: 600, // Survive 10 minutes

  startingUnits: {
    player: [
      { type: 'infantry', count: 10, x: 180, z: 128 },
      { type: 'infantry', count: 6, x: 175, z: 110 },
      { type: 'infantry', count: 6, x: 175, z: 146 },
      { type: 'mortar', count: 3, x: 190, z: 128 },
      { type: 'tank', count: 2, x: 185, z: 120 },
      { type: 'aahalftrack', count: 2, x: 190, z: 140 }
    ],
    enemy: []
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 210, z: 128 },
      { type: 'barracks', x: 195, z: 115 },
      { type: 'barracks', x: 195, z: 141 },
      { type: 'warfactory', x: 200, z: 128 },
      { type: 'shipyard', x: 220, z: 100 },
      { type: 'bunker', x: 160, z: 120, tag: 'forward_bunker_1' },
      { type: 'bunker', x: 160, z: 136, tag: 'forward_bunker_2' },
      { type: 'turret', x: 155, z: 128 },
      { type: 'wall', x: 150, z: 115 },
      { type: 'wall', x: 150, z: 120 },
      { type: 'wall', x: 150, z: 125 },
      { type: 'wall', x: 150, z: 130 },
      { type: 'wall', x: 150, z: 135 },
      { type: 'wall', x: 150, z: 140 }
    ],
    enemy: []
  },

  restrictedUnits: ['bomber', 'carrier', 'heavytank', 'spg'],
  restrictedBuildings: ['superweapon', 'techlab'],

  objectives: [
    {
      priority: 'primary',
      type: 'survive_time',
      target: 600,
      name: 'Hold the Island',
      description: 'Survive the American assault for 10 minutes.'
    },
    {
      priority: 'primary',
      type: 'protect_tagged',
      tag: 'forward_bunker_1',
      name: 'Protect Northern Bunker',
      description: 'The northern bunker must not fall. Protect it.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 50,
      name: 'Devastating Defense',
      description: 'Destroy 50 enemy units.'
    },
    {
      priority: 'secondary',
      type: 'build_building',
      buildingType: 'turret',
      count: 4,
      name: 'Fortress Island',
      description: 'Build 4 additional turrets to fortify your defenses.'
    }
  ],

  openingDialogue: [
    { speaker: 'General Kuribayashi', text: 'We shall defend this island to the last. Every soldier, every bullet, every inch of ground. For the Emperor!', duration: 6 },
    { speaker: 'Colonel', text: 'The Americans will come from the west. Fortify the beaches and prepare your fields of fire.', duration: 5 }
  ],

  reinforcements: [
    // Wave 1: Light
    {
      time: 30,
      notification: 'American advance force spotted! Marines incoming!',
      units: [
        { type: 'infantry', count: 8, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 160, z: 128 } },
        { type: 'infantry', count: 4, team: 'enemy', x: 20, z: 110, attackMoveTarget: { x: 160, z: 120 } },
        { type: 'patrolboat', count: 2, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 160, z: 128 } }
      ]
    },
    // Wave 2: Medium
    {
      time: 120,
      notification: 'Second wave! Tanks landing on the beach!',
      units: [
        { type: 'infantry', count: 10, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 160, z: 128 } },
        { type: 'tank', count: 3, team: 'enemy', x: 20, z: 120, attackMoveTarget: { x: 160, z: 120 } },
        { type: 'mortar', count: 2, team: 'enemy', x: 15, z: 140, attackMoveTarget: { x: 160, z: 136 } }
      ]
    },
    // Wave 3: Heavy
    {
      time: 240,
      notification: 'Third wave! Heavy armor and naval support!',
      units: [
        { type: 'infantry', count: 12, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 180, z: 128 } },
        { type: 'tank', count: 4, team: 'enemy', x: 25, z: 115, attackMoveTarget: { x: 180, z: 120 } },
        { type: 'heavytank', count: 1, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 180, z: 128 } },
        { type: 'battleship', count: 1, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 100, z: 128 } }
      ]
    },
    // Wave 4: Air and Sea
    {
      time: 360,
      notification: 'Air assault! Enemy planes inbound!',
      units: [
        { type: 'drone', count: 4, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'plane', count: 2, team: 'enemy', x: 10, z: 120, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'infantry', count: 8, team: 'enemy', x: 20, z: 140, attackMoveTarget: { x: 180, z: 128 } }
      ]
    },
    // Wave 5: Final assault
    {
      time: 480,
      notification: 'Final American assault! Everything they have!',
      units: [
        { type: 'infantry', count: 15, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'tank', count: 5, team: 'enemy', x: 25, z: 118, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'heavytank', count: 2, team: 'enemy', x: 20, z: 138, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'bomber', count: 1, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'battleship', count: 1, team: 'enemy', x: 10, z: 100, attackMoveTarget: { x: 100, z: 100 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'kills',
      team: 'player',
      count: 20,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Colonel', text: 'The Americans falter! Press our advantage!', duration: 4 }
        ]},
        { type: 'grant_resources', sp: 200 }
      ]
    },
    {
      type: 'time',
      time: 300,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General Kuribayashi', text: 'We have held for five minutes. The Americans grow desperate. Hold fast!', duration: 5 }
        ]}
      ]
    }
  ],

  timedEvents: [
    {
      time: 20,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Lookout', text: 'Ships on the horizon! The Americans are coming!', duration: 4 }
        ]}
      ]
    }
  ]
};
