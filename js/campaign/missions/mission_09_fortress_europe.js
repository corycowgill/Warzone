/**
 * Mission 9: Fortress Europe (Play as Germany)
 * Defend against overwhelming odds.
 * Player: Germany vs Enemy: America
 */
export const mission9 = {
  id: 'mission_9',
  missionNumber: 9,
  act: 3,
  name: 'Fortress Europe',
  playerNation: 'germany',
  enemyNation: 'america',
  mapTemplate: 'river',
  aiDifficulty: 'hard',

  briefing: `The Allied forces are pressing in from all sides. The Rhine is the last major natural barrier protecting the German heartland. Your orders are clear: hold the river crossings at all costs.

You command the remnants of an elite panzer division and a garrison of veteran infantry. The fortifications along the river are strong, but the enemy has overwhelming numbers. Wave after wave of American armor and infantry will attempt to force the crossings.

This is a fight for survival. Use the terrain to your advantage. The river will slow them, your guns will stop them. There is nowhere left to retreat.`,

  playerStartSP: 700,
  playerStartMU: 200,
  enemyStartSP: 0,
  enemyStartMU: 0,
  disableEnemyAI: true,
  victoryOnTimeOut: true,
  timeLimit: 720, // 12 minutes

  startingUnits: {
    player: [
      { type: 'infantry', count: 10, x: 190, z: 128 },
      { type: 'infantry', count: 6, x: 185, z: 110 },
      { type: 'infantry', count: 6, x: 185, z: 146 },
      { type: 'tank', count: 4, x: 195, z: 128 },
      { type: 'heavytank', count: 1, x: 200, z: 128 },
      { type: 'mortar', count: 3, x: 195, z: 115 },
      { type: 'aahalftrack', count: 2, x: 195, z: 140 },
      { type: 'spg', count: 1, x: 200, z: 118 }
    ],
    enemy: []
  },

  startingBuildings: {
    player: [
      { type: 'headquarters', x: 220, z: 128, tag: 'player_hq' },
      { type: 'barracks', x: 205, z: 115 },
      { type: 'barracks', x: 205, z: 141 },
      { type: 'warfactory', x: 210, z: 128 },
      { type: 'bunker', x: 170, z: 118 },
      { type: 'bunker', x: 170, z: 138 },
      { type: 'turret', x: 175, z: 128 },
      { type: 'turret', x: 165, z: 110 },
      { type: 'turret', x: 165, z: 146 },
      { type: 'aaturret', x: 180, z: 128 },
      { type: 'wall', x: 160, z: 108 },
      { type: 'wall', x: 160, z: 113 },
      { type: 'wall', x: 160, z: 118 },
      { type: 'wall', x: 160, z: 123 },
      { type: 'wall', x: 160, z: 128 },
      { type: 'wall', x: 160, z: 133 },
      { type: 'wall', x: 160, z: 138 },
      { type: 'wall', x: 160, z: 143 },
      { type: 'wall', x: 160, z: 148 }
    ],
    enemy: []
  },

  restrictedUnits: ['carrier', 'battleship', 'submarine', 'patrolboat', 'bomber'],
  restrictedBuildings: ['shipyard', 'airfield', 'superweapon'],

  objectives: [
    {
      priority: 'primary',
      type: 'survive_time',
      target: 720,
      name: 'Hold the Rhine',
      description: 'Defend the river crossings for 12 minutes.'
    },
    {
      priority: 'primary',
      type: 'protect_tagged',
      tag: 'player_hq',
      name: 'Protect the Command Post',
      description: 'Your headquarters must survive.'
    },
    {
      priority: 'secondary',
      type: 'kill_count',
      target: 60,
      name: 'Iron Wall',
      description: 'Destroy 60 enemy units.'
    },
    {
      priority: 'secondary',
      type: 'build_building',
      buildingType: 'bunker',
      count: 3,
      name: 'Deep Defenses',
      description: 'Build 3 additional bunkers.'
    }
  ],

  openingDialogue: [
    { speaker: 'Field Marshal', text: 'The Rhine must not fall. Every man will fight to the death. There is no retreat.', duration: 5 },
    { speaker: 'Panzer Commander', text: 'Jawohl, Herr Feldmarschall. My panzers will hold the crossings.', duration: 4 }
  ],

  reinforcements: [
    // Wave 1
    {
      time: 30,
      notification: 'American vanguard approaching the river!',
      units: [
        { type: 'infantry', count: 10, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 170, z: 128 } },
        { type: 'infantry', count: 5, team: 'enemy', x: 20, z: 110, attackMoveTarget: { x: 170, z: 118 } },
        { type: 'scoutcar', count: 3, team: 'enemy', x: 25, z: 140, attackMoveTarget: { x: 170, z: 138 } }
      ]
    },
    // Wave 2
    {
      time: 120,
      notification: 'American armor crossing the river!',
      units: [
        { type: 'infantry', count: 8, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 180, z: 128 } },
        { type: 'tank', count: 5, team: 'enemy', x: 25, z: 120, attackMoveTarget: { x: 180, z: 128 } },
        { type: 'mortar', count: 3, team: 'enemy', x: 15, z: 135, attackMoveTarget: { x: 170, z: 128 } }
      ]
    },
    // Wave 3
    {
      time: 240,
      notification: 'Heavy assault wave! Tanks and air support!',
      units: [
        { type: 'infantry', count: 12, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 190, z: 128 } },
        { type: 'tank', count: 6, team: 'enemy', x: 25, z: 115, attackMoveTarget: { x: 190, z: 128 } },
        { type: 'heavytank', count: 2, team: 'enemy', x: 20, z: 140, attackMoveTarget: { x: 190, z: 128 } },
        { type: 'drone', count: 3, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 200, z: 128 } }
      ]
    },
    // Wave 4
    {
      time: 400,
      notification: 'Flanking attack from the south!',
      units: [
        { type: 'infantry', count: 8, team: 'enemy', x: 100, z: 240, attackMoveTarget: { x: 190, z: 140 } },
        { type: 'tank', count: 3, team: 'enemy', x: 100, z: 240, attackMoveTarget: { x: 190, z: 140 } }
      ]
    },
    // Wave 5
    {
      time: 540,
      notification: 'Final American push! Everything they have!',
      units: [
        { type: 'infantry', count: 15, team: 'enemy', x: 20, z: 128, attackMoveTarget: { x: 210, z: 128 } },
        { type: 'tank', count: 6, team: 'enemy', x: 25, z: 118, attackMoveTarget: { x: 210, z: 128 } },
        { type: 'heavytank', count: 3, team: 'enemy', x: 20, z: 138, attackMoveTarget: { x: 210, z: 128 } },
        { type: 'spg', count: 2, team: 'enemy', x: 15, z: 128, attackMoveTarget: { x: 200, z: 128 } },
        { type: 'bomber', count: 1, team: 'enemy', x: 10, z: 128, attackMoveTarget: { x: 220, z: 128 } }
      ]
    },
    // Player reinforcement
    {
      time: 300,
      notification: 'Panzer reserves arriving from the east!',
      units: [
        { type: 'heavytank', count: 2, team: 'player', x: 240, z: 128 },
        { type: 'tank', count: 2, team: 'player', x: 240, z: 118 }
      ]
    }
  ],

  triggers: [
    {
      type: 'kills',
      team: 'player',
      count: 30,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Panzer Commander', text: 'We are holding them! Keep firing!', duration: 4 }
        ]},
        { type: 'grant_resources', sp: 300 }
      ]
    },
    {
      type: 'time',
      time: 360,
      once: true,
      actions: [
        { type: 'dialogue', lines: [
          { speaker: 'Field Marshal', text: 'Six minutes held. The enemy grows desperate. Do not falter now!', duration: 5 }
        ]}
      ]
    }
  ],

  timedEvents: []
};
