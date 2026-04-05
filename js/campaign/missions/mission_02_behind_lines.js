/**
 * Mission 2: Behind Enemy Lines
 * Commandos-only stealth mission. Sabotage 3 strategic targets.
 * Player: Britain vs Enemy: Germany
 */
export const mission2 = {
  id: 'mission_2',
  missionNumber: 2,
  act: 1,
  name: 'Behind Enemy Lines',
  playerNation: 'britain',
  enemyNation: 'germany',
  mapTemplate: 'continental',
  aiDifficulty: 'normal',

  briefing: `British intelligence has identified three critical enemy targets deep behind the front lines: a fuel depot, a communications relay, and an ammunition stockpile.

A small team of elite commandos has been inserted under cover of darkness. Your mission is to infiltrate enemy territory and destroy all three targets before dawn. You have no reinforcements and no base - just your wits and your soldiers.

Move carefully. The enemy patrols are heavy, and detection will bring overwhelming response. Strike fast, strike hard, and get out alive.`,

  playerStartSP: 0,
  playerStartMU: 100,
  enemyStartSP: 200,
  enemyStartMU: 50,
  noProduction: true,
  noPlayerBuilding: true,
  disableEnemyAI: true,
  noDefeatOnHQLoss: true,
  timeLimit: 600, // 10 minutes

  startingUnits: {
    player: [
      { type: 'infantry', count: 6, x: 30, z: 50 },
      { type: 'scoutcar', count: 1, x: 35, z: 55 },
      { type: 'engineer', count: 1, x: 30, z: 60 }
    ],
    enemy: [
      // Patrol group 1 (near fuel depot)
      { type: 'infantry', count: 3, x: 100, z: 60 },
      { type: 'scoutcar', count: 1, x: 110, z: 55 },
      // Patrol group 2 (near comm relay)
      { type: 'infantry', count: 4, x: 140, z: 170 },
      { type: 'tank', count: 1, x: 150, z: 165 },
      // Patrol group 3 (near ammo dump)
      { type: 'infantry', count: 3, x: 200, z: 100 },
      { type: 'infantry', count: 3, x: 210, z: 120 },
      // Reserve force (center)
      { type: 'tank', count: 2, x: 150, z: 128 },
      { type: 'infantry', count: 4, x: 145, z: 128 }
    ]
  },

  startingBuildings: {
    player: [],
    enemy: [
      { type: 'supplydepot', x: 110, z: 60, tag: 'fuel_depot' },
      { type: 'resourcedepot', x: 150, z: 180, tag: 'comm_relay' },
      { type: 'munitionscache', x: 210, z: 110, tag: 'ammo_dump' },
      { type: 'barracks', x: 150, z: 128 },
      { type: 'turret', x: 105, z: 65 },
      { type: 'turret', x: 145, z: 175 },
      { type: 'turret', x: 205, z: 105 },
      { type: 'bunker', x: 155, z: 128 }
    ]
  },

  restrictedUnits: ['tank', 'heavytank', 'spg', 'drone', 'plane', 'bomber', 'battleship', 'carrier', 'submarine', 'patrolboat', 'aahalftrack', 'apc', 'mortar', 'commander'],
  restrictedBuildings: ['headquarters', 'barracks', 'warfactory', 'airfield', 'shipyard', 'techlab', 'resourcedepot', 'supplydepot', 'bunker', 'turret', 'aaturret', 'wall', 'superweapon', 'munitionscache', 'supplyexchange', 'ditch'],

  objectives: [
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'fuel_depot',
      target: 1,
      name: 'Destroy the Fuel Depot',
      description: 'Sabotage the enemy fuel storage facility.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'comm_relay',
      target: 1,
      name: 'Destroy the Communications Relay',
      description: 'Cut off enemy communications.'
    },
    {
      priority: 'primary',
      type: 'destroy_tagged',
      tag: 'ammo_dump',
      target: 1,
      name: 'Destroy the Ammunition Dump',
      description: 'Eliminate the enemy munitions stockpile.'
    },
    {
      priority: 'secondary',
      type: 'keep_units_alive',
      unitType: 'infantry',
      minCount: 4,
      name: 'Minimal Casualties',
      description: 'Complete the mission with at least 4 infantry surviving.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 15,
      name: 'Ghost Protocol',
      description: 'Eliminate 15 enemy soldiers.'
    }
  ],

  openingDialogue: [
    { speaker: 'MI6 Handler', text: 'Commandos, you have been inserted 10 klicks behind enemy lines. Three targets, one night. Good luck.', duration: 5 },
    { speaker: 'Squad Leader', text: 'Right lads, keep it quiet. We hit the fuel depot first, then the comm relay, then the ammo dump.', duration: 5 }
  ],

  triggers: [
    {
      type: 'tagged_destroyed',
      tag: 'fuel_depot',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Squad Leader', text: 'Fuel depot is burning! Move to the next target!', duration: 4 }
        ]},
        { type: 'camera_shake', intensity: 3 },
        { type: 'play_sound', sound: 'explosion' },
        // Alert spawns patrol
        { type: 'spawn_units', units: [
          { type: 'infantry', count: 3, team: 'enemy', x: 130, z: 80, attackMoveTarget: { x: 110, z: 60 } }
        ]}
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'comm_relay',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Squad Leader', text: 'Comm relay destroyed! They are blind and deaf now. One more target!', duration: 4 }
        ]},
        { type: 'camera_shake', intensity: 3 }
      ]
    },
    {
      type: 'tagged_destroyed',
      tag: 'ammo_dump',
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'MI6 Handler', text: 'Brilliant work! All targets destroyed. Extract immediately!', duration: 4 }
        ]},
        { type: 'camera_shake', intensity: 4 }
      ]
    },
    // If player takes too long, enemy gets reinforcements
    {
      type: 'time',
      time: 360,
      once: true,
      actions: [
        { type: 'notification', text: 'Dawn is approaching! Enemy patrols increasing!', color: '#ff8844' },
        { type: 'spawn_units', units: [
          { type: 'infantry', count: 4, team: 'enemy', x: 150, z: 100, attackMoveTarget: { x: 100, z: 60 } },
          { type: 'tank', count: 1, team: 'enemy', x: 160, z: 128, attackMoveTarget: { x: 100, z: 100 } }
        ]}
      ]
    }
  ],

  defeatConditions: [
    { type: 'all_units_dead', team: 'player' }
  ],

  timedEvents: [
    {
      time: 120,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'MI6 Handler', text: 'Enemy patrol patterns are shifting. Stay sharp.', duration: 4 }
        ]}
      ]
    }
  ]
};
