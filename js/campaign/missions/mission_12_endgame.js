/**
 * Mission 12: Endgame
 * Epic final battle with all unit types, multiple fronts.
 * Player: America vs Enemy: Germany
 */
export const mission12 = {
  id: 'mission_12',
  missionNumber: 12,
  act: 3,
  name: 'Endgame',
  playerNation: 'america',
  enemyNation: 'germany',
  mapTemplate: 'continental',
  aiDifficulty: 'hard',

  briefing: `This is it. The final battle of the war. Allied forces have converged on the enemy's last stronghold - a massive fortified complex protected by the most powerful military force ever assembled. Land, sea, and air - every branch of the military is committed.

The enemy has deployed their full arsenal: heavy tanks, artillery, bombers, a naval fleet, and rumor has it, a second superweapon is nearing completion. You must coordinate a massive combined-arms assault across multiple fronts.

Build up your forces, establish air and naval superiority, and launch the final assault. The entire war comes down to this battle. Victory here means the end of the conflict. There is no mission after this one.`,

  playerStartSP: 1500,
  playerStartMU: 500,
  enemyStartSP: 1000,
  enemyStartMU: 400,
  disableEnemyAI: false,

  startingUnits: {
    player: [
      // Main force
      { type: 'infantry', count: 12, x: 40, z: 128 },
      { type: 'tank', count: 6, x: 45, z: 115 },
      { type: 'heavytank', count: 3, x: 45, z: 141 },
      { type: 'mortar', count: 3, x: 35, z: 128 },
      { type: 'spg', count: 2, x: 30, z: 118 },
      { type: 'aahalftrack', count: 2, x: 40, z: 148 },
      { type: 'apc', count: 2, x: 45, z: 135 },
      { type: 'engineer', count: 2, x: 40, z: 125 },
      { type: 'commander', count: 1, x: 35, z: 128 },
      // Air
      { type: 'drone', count: 4, x: 35, z: 128 },
      { type: 'plane', count: 3, x: 30, z: 120 },
      { type: 'bomber', count: 1, x: 30, z: 136 },
      // Naval
      { type: 'battleship', count: 2, x: 15, z: 128 },
      { type: 'patrolboat', count: 3, x: 10, z: 115 },
      { type: 'submarine', count: 2, x: 10, z: 141 }
    ],
    enemy: [
      // Outer defense force
      { type: 'infantry', count: 8, x: 130, z: 128 },
      { type: 'tank', count: 4, x: 135, z: 118 },
      { type: 'tank', count: 3, x: 135, z: 138 },
      { type: 'aahalftrack', count: 2, x: 130, z: 128 },
      // Inner defense
      { type: 'infantry', count: 10, x: 180, z: 128 },
      { type: 'heavytank', count: 3, x: 185, z: 120 },
      { type: 'tank', count: 4, x: 185, z: 136 },
      { type: 'spg', count: 2, x: 190, z: 128 },
      { type: 'mortar', count: 3, x: 180, z: 115 },
      // HQ guard
      { type: 'heavytank', count: 2, x: 215, z: 128 },
      { type: 'infantry', count: 6, x: 210, z: 120 },
      { type: 'commander', count: 1, x: 220, z: 128 },
      // Air force
      { type: 'drone', count: 5, x: 200, z: 128 },
      { type: 'plane', count: 3, x: 205, z: 120 },
      { type: 'bomber', count: 2, x: 210, z: 128 },
      // Navy
      { type: 'battleship', count: 1, x: 230, z: 128 },
      { type: 'submarine', count: 2, x: 235, z: 140 },
      { type: 'patrolboat', count: 3, x: 230, z: 115 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 45, z: 100 },
      { type: 'barracks', x: 45, z: 156 },
      { type: 'warfactory', x: 50, z: 118 },
      { type: 'warfactory', x: 50, z: 138 },
      { type: 'airfield', x: 40, z: 128 },
      { type: 'shipyard', x: 20, z: 100 },
      { type: 'techlab', x: 55, z: 128 },
      { type: 'resourcedepot', x: 30, z: 110 },
      { type: 'munitionscache', x: 30, z: 146 }
    ],
    enemy: [
      { type: 'headquarters', x: 225, z: 128, tag: 'final_hq' },
      { type: 'barracks', x: 200, z: 105 },
      { type: 'barracks', x: 200, z: 151 },
      { type: 'warfactory', x: 205, z: 118 },
      { type: 'warfactory', x: 205, z: 138 },
      { type: 'airfield', x: 210, z: 128 },
      { type: 'shipyard', x: 235, z: 100 },
      { type: 'techlab', x: 215, z: 128 },
      { type: 'superweapon', x: 230, z: 128, tag: 'final_superweapon' },
      { type: 'resourcedepot', x: 220, z: 110 },
      { type: 'resourcedepot', x: 220, z: 146 },
      { type: 'munitionscache', x: 210, z: 105 },
      // Outer fortifications
      { type: 'bunker', x: 120, z: 118 },
      { type: 'bunker', x: 120, z: 138 },
      { type: 'turret', x: 125, z: 128 },
      { type: 'turret', x: 125, z: 108 },
      { type: 'turret', x: 125, z: 148 },
      { type: 'aaturret', x: 130, z: 118 },
      { type: 'aaturret', x: 130, z: 138 },
      // Inner fortifications
      { type: 'bunker', x: 175, z: 118 },
      { type: 'bunker', x: 175, z: 138 },
      { type: 'turret', x: 180, z: 128 },
      { type: 'turret', x: 180, z: 108 },
      { type: 'turret', x: 180, z: 148 },
      { type: 'aaturret', x: 185, z: 128 },
      // Walls
      { type: 'wall', x: 115, z: 105 },
      { type: 'wall', x: 115, z: 110 },
      { type: 'wall', x: 115, z: 115 },
      { type: 'wall', x: 115, z: 120 },
      { type: 'wall', x: 115, z: 125 },
      { type: 'wall', x: 115, z: 130 },
      { type: 'wall', x: 115, z: 135 },
      { type: 'wall', x: 115, z: 140 },
      { type: 'wall', x: 115, z: 145 },
      { type: 'wall', x: 115, z: 150 },
      { type: 'wall', x: 170, z: 110 },
      { type: 'wall', x: 170, z: 115 },
      { type: 'wall', x: 170, z: 120 },
      { type: 'wall', x: 170, z: 125 },
      { type: 'wall', x: 170, z: 130 },
      { type: 'wall', x: 170, z: 135 },
      { type: 'wall', x: 170, z: 140 },
      { type: 'wall', x: 170, z: 145 }
    ]
  },

  restrictedUnits: [],
  restrictedBuildings: [],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'final_superweapon',
      target: 1,
      name: 'Neutralize the Superweapon',
      description: 'Destroy the enemy superweapon facility before it becomes operational.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'final_hq',
      target: 1,
      name: 'Destroy Enemy Command',
      description: 'Eliminate the enemy headquarters to end the war.'
    },
    {
      priority: 'secondary',
      type: 'destroy_all_enemy_buildings',
      name: 'Total Annihilation',
      description: 'Destroy every enemy structure. Leave nothing standing.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 80,
      name: 'Decisive Victory',
      description: 'Destroy 80 enemy units.'
    },
    {
      priority: 'secondary',
      type: 'keep_units_alive',
      unitType: 'commander',
      minCount: 1,
      name: 'Lead from the Front',
      description: 'Your commander must survive the final battle.',
      hidden: true
    }
  ],

  openingDialogue: [
    { speaker: 'Supreme Commander', text: 'This is the final battle. Everything we have fought for comes down to this moment. All forces, advance.', duration: 6 },
    { speaker: 'General', text: 'Coordinate all branches. Navy bombards, air strikes the defenses, ground forces push through. This is it.', duration: 6 },
    { speaker: 'Your Commander', text: 'For freedom. For victory. Let us end this war.', duration: 4 }
  ],

  reinforcements: [
    // Enemy air strike
    {
      time: 90,
      notification: 'Enemy bomber wing inbound!',
      units: [
        { type: 'bomber', count: 2, team: 'enemy', x: 240, z: 128, attackMoveTarget: { x: 30, z: 128 } },
        { type: 'plane', count: 3, team: 'enemy', x: 240, z: 120, attackMoveTarget: { x: 35, z: 128 } }
      ]
    },
    // Player reinforcement wave
    {
      time: 180,
      notification: 'Second army arriving! Fresh troops and armor!',
      units: [
        { type: 'infantry', count: 8, team: 'player', x: 15, z: 128 },
        { type: 'tank', count: 4, team: 'player', x: 15, z: 118 },
        { type: 'heavytank', count: 2, team: 'player', x: 15, z: 138 }
      ]
    },
    // Enemy counterattack
    {
      time: 240,
      notification: 'Massive enemy counterattack from multiple directions!',
      units: [
        { type: 'infantry', count: 10, team: 'enemy', x: 200, z: 20, attackMoveTarget: { x: 50, z: 100 } },
        { type: 'tank', count: 4, team: 'enemy', x: 200, z: 20, attackMoveTarget: { x: 50, z: 100 } },
        { type: 'infantry', count: 10, team: 'enemy', x: 200, z: 236, attackMoveTarget: { x: 50, z: 156 } },
        { type: 'tank', count: 4, team: 'enemy', x: 200, z: 236, attackMoveTarget: { x: 50, z: 156 } }
      ]
    },
    // Enemy elite guard
    {
      time: 360,
      notification: 'Enemy deploying elite panzer division!',
      units: [
        { type: 'heavytank', count: 3, team: 'enemy', x: 220, z: 128, attackMoveTarget: { x: 120, z: 128 } },
        { type: 'tank', count: 4, team: 'enemy', x: 220, z: 118, attackMoveTarget: { x: 120, z: 128 } },
        { type: 'spg', count: 2, team: 'enemy', x: 230, z: 128, attackMoveTarget: { x: 130, z: 128 } }
      ]
    },
    // Naval battle
    {
      time: 300,
      notification: 'Enemy fleet engaging! Naval battle commencing!',
      units: [
        { type: 'battleship', count: 1, team: 'enemy', x: 250, z: 128, attackMoveTarget: { x: 15, z: 128 } },
        { type: 'submarine', count: 2, team: 'enemy', x: 250, z: 145, attackMoveTarget: { x: 15, z: 128 } }
      ]
    },
    // Player carrier support
    {
      time: 420,
      notification: 'Carrier group arriving with air reinforcements!',
      units: [
        { type: 'carrier', count: 1, team: 'player', x: 5, z: 128 },
        { type: 'plane', count: 3, team: 'player', x: 10, z: 120 },
        { type: 'bomber', count: 2, team: 'player', x: 10, z: 136 }
      ]
    }
  ],

  triggers: [
    {
      type: 'area_units',
      team: 'player',
      x: 130,
      z: 128,
      radius: 25,
      count: 5,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General', text: 'First defense line breached! Keep the momentum going!', duration: 4 }
        ]},
        { type: 'notification', text: 'Outer defenses penetrated!', color: '#00ff44' }
      ]
    },
    {
      type: 'area_units',
      team: 'player',
      x: 185,
      z: 128,
      radius: 25,
      count: 3,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General', text: 'Inner defenses breached! The superweapon is within reach!', duration: 4 }
        ]},
        { type: 'notification', text: 'Inner defenses breached!', color: '#00ff44' },
        // Enemy desperation - last reserves
        { type: 'spawn_units', units: [
          { type: 'heavytank', count: 2, team: 'enemy', x: 225, z: 128 },
          { type: 'infantry', count: 8, team: 'enemy', x: 220, z: 128 }
        ]}
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'final_superweapon',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Supreme Commander', text: 'The superweapon is destroyed! Now finish the enemy HQ!', duration: 5 }
        ]},
        { type: 'camera_shake', intensity: 5 },
        { type: 'notification', text: 'SUPERWEAPON NEUTRALIZED!', color: '#00ff44' }
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'final_hq',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Supreme Commander', text: 'The war is over. The enemy has fallen. Victory is ours!', duration: 6 },
          { speaker: 'Your Commander', text: 'It is done. We did it. The world is free.', duration: 5 }
        ]},
        { type: 'camera_shake', intensity: 3 }
      ]
    },
    // Hidden objective reveal
    {
      type: 'time',
      time: 60,
      once: true,
      actions: [
        { type: 'reveal_objective', objectiveIndex: 4 }
      ]
    }
  ],

  timedEvents: [
    {
      time: 60,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'Enemy superweapon facility detected in the rear of their base. Priority target!', duration: 5 }
        ]}
      ]
    },
    {
      time: 300,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'General', text: 'Five minutes in. Keep the pressure up on all fronts!', duration: 4 }
        ]}
      ]
    }
  ]
};
