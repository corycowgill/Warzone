/**
 * Mission 11: Superweapon Crisis
 * Race to destroy the enemy superweapon before it fires.
 * Player: Britain vs Enemy: Germany
 */
export const mission11 = {
  id: 'mission_11',
  missionNumber: 11,
  act: 3,
  name: 'Superweapon Crisis',
  playerNation: 'britain',
  enemyNation: 'germany',
  mapTemplate: 'continental',
  aiDifficulty: 'hard',

  briefing: `Intelligence has uncovered a nightmare scenario. The Germans have nearly completed a V-3 superweapon capable of devastating London. It is hidden in a heavily fortified bunker complex in northern France.

You have exactly 12 minutes before the weapon is operational and fires. Once it launches, the war could be lost. This is a race against time - you must fight through the defenses and destroy the superweapon facility before the countdown reaches zero.

Every second counts. Strike fast, strike hard. Use your armor to punch through, your aircraft to bypass defenses. Do whatever it takes. Failure is not an option.`,

  playerStartSP: 800,
  playerStartMU: 300,
  enemyStartSP: 500,
  enemyStartMU: 200,
  disableEnemyAI: false,
  timeLimit: 720, // 12 minutes - lose if time runs out

  startingUnits: {
    player: [
      { type: 'infantry', count: 10, x: 40, z: 128 },
      { type: 'tank', count: 5, x: 45, z: 115 },
      { type: 'heavytank', count: 2, x: 45, z: 140 },
      { type: 'mortar', count: 3, x: 35, z: 128 },
      { type: 'spg', count: 2, x: 30, z: 120 },
      { type: 'drone', count: 3, x: 40, z: 128 },
      { type: 'plane', count: 2, x: 35, z: 120 },
      { type: 'aahalftrack', count: 1, x: 40, z: 145 },
      { type: 'engineer', count: 1, x: 40, z: 135 }
    ],
    enemy: [
      // Outer defense
      { type: 'infantry', count: 6, x: 110, z: 128 },
      { type: 'infantry', count: 4, x: 110, z: 110 },
      { type: 'infantry', count: 4, x: 110, z: 146 },
      { type: 'tank', count: 3, x: 120, z: 128 },
      // Middle defense
      { type: 'infantry', count: 6, x: 160, z: 128 },
      { type: 'tank', count: 2, x: 165, z: 118 },
      { type: 'heavytank', count: 1, x: 165, z: 128 },
      { type: 'aahalftrack', count: 2, x: 160, z: 140 },
      // Inner defense (superweapon complex)
      { type: 'infantry', count: 8, x: 200, z: 128 },
      { type: 'heavytank', count: 2, x: 205, z: 120 },
      { type: 'tank', count: 3, x: 205, z: 136 },
      { type: 'spg', count: 1, x: 210, z: 128 }
    ]
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 30, z: 128 },
      { type: 'barracks', x: 45, z: 105 },
      { type: 'warfactory', x: 45, z: 151 },
      { type: 'airfield', x: 35, z: 128 },
      { type: 'techlab', x: 55, z: 128 }
    ],
    enemy: [
      { type: 'headquarters', x: 220, z: 128 },
      { type: 'barracks', x: 200, z: 110 },
      { type: 'barracks', x: 200, z: 146 },
      { type: 'warfactory', x: 210, z: 128 },
      { type: 'superweapon', x: 225, z: 128, tag: 'superweapon' },
      // Outer fortifications
      { type: 'bunker', x: 100, z: 120 },
      { type: 'bunker', x: 100, z: 136 },
      { type: 'turret', x: 105, z: 128 },
      // Middle fortifications
      { type: 'bunker', x: 155, z: 118 },
      { type: 'bunker', x: 155, z: 138 },
      { type: 'turret', x: 160, z: 128 },
      { type: 'aaturret', x: 165, z: 128 },
      // Inner fortifications
      { type: 'turret', x: 195, z: 120 },
      { type: 'turret', x: 195, z: 136 },
      { type: 'aaturret', x: 200, z: 128 },
      { type: 'bunker', x: 210, z: 118 },
      { type: 'bunker', x: 210, z: 138 },
      { type: 'wall', x: 190, z: 113 },
      { type: 'wall', x: 190, z: 118 },
      { type: 'wall', x: 190, z: 123 },
      { type: 'wall', x: 190, z: 133 },
      { type: 'wall', x: 190, z: 138 },
      { type: 'wall', x: 190, z: 143 }
    ]
  },

  restrictedUnits: ['carrier', 'battleship', 'submarine', 'patrolboat'],
  restrictedBuildings: ['shipyard', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'superweapon',
      target: 1,
      name: 'Destroy the Superweapon',
      description: 'Destroy the V-3 facility before it fires! Time is running out!'
    },
    {
      priority: 'secondary',
      type: 'destroy_enemy_hq',
      name: 'Destroy Enemy HQ',
      description: 'Eliminate the enemy command center.'
    },
    {
      priority: 'secondary',
      type: 'keep_units_alive',
      unitType: 'heavytank',
      minCount: 1,
      name: 'Heavy Metal',
      description: 'Keep at least 1 heavy tank alive throughout the mission.'
    }
  ],

  openingDialogue: [
    { speaker: 'Churchill', text: 'If that weapon fires, London burns. You must stop it. Whatever the cost.', duration: 5 },
    { speaker: 'Colonel', text: 'We have twelve minutes. All units, maximum speed. Punch through those defenses!', duration: 5 }
  ],

  reinforcements: [
    {
      time: 60,
      notification: 'Enemy reinforcements deploying to the outer perimeter!',
      units: [
        { type: 'infantry', count: 6, team: 'enemy', x: 130, z: 128, attackMoveTarget: { x: 80, z: 128 } },
        { type: 'tank', count: 2, team: 'enemy', x: 130, z: 118, attackMoveTarget: { x: 80, z: 128 } }
      ]
    },
    {
      time: 180,
      notification: 'Bomber wing authorized for support!',
      units: [
        { type: 'bomber', count: 2, team: 'player', x: 20, z: 128 }
      ]
    },
    {
      time: 300,
      notification: 'Elite guard deploying around the superweapon!',
      units: [
        { type: 'heavytank', count: 2, team: 'enemy', x: 220, z: 120, attackMoveTarget: { x: 180, z: 128 } },
        { type: 'infantry', count: 8, team: 'enemy', x: 215, z: 135, attackMoveTarget: { x: 180, z: 128 } }
      ]
    },
    {
      time: 420,
      notification: 'Enemy counterattack from the north!',
      units: [
        { type: 'tank', count: 4, team: 'enemy', x: 150, z: 20, attackMoveTarget: { x: 50, z: 128 } },
        { type: 'infantry', count: 6, team: 'enemy', x: 150, z: 30, attackMoveTarget: { x: 50, z: 128 } }
      ]
    }
  ],

  triggers: [
    {
      type: 'time',
      time: 360,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'Six minutes remaining! The weapon is entering final preparations!', duration: 4 }
        ]},
        { type: 'notification', text: 'WARNING: 6 MINUTES REMAINING!', color: '#ff4444' },
        { type: 'play_sound', sound: 'error' }
      ]
    },
    {
      type: 'time',
      time: 540,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'THREE MINUTES! The weapon is almost ready!', duration: 3 }
        ]},
        { type: 'notification', text: 'CRITICAL: 3 MINUTES TO LAUNCH!', color: '#ff0000' },
        { type: 'play_sound', sound: 'error' },
        { type: 'camera_shake', intensity: 1 }
      ]
    },
    {
      type: 'time',
      time: 660,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Intelligence', text: 'ONE MINUTE! Destroy it NOW!', duration: 3 }
        ]},
        { type: 'notification', text: 'FINAL WARNING: 60 SECONDS!', color: '#ff0000' },
        { type: 'play_sound', sound: 'error' },
        { type: 'camera_shake', intensity: 2 }
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'superweapon',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Churchill', text: 'The weapon is destroyed! London is saved! Magnificent work!', duration: 5 }
        ]},
        { type: 'camera_shake', intensity: 4 },
        { type: 'notification', text: 'SUPERWEAPON DESTROYED!', color: '#00ff44' }
      ]
    }
  ],

  timedEvents: [
    {
      time: 120,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Colonel', text: 'Keep pushing! We cannot afford to slow down!', duration: 3 }
        ]}
      ]
    }
  ]
};
