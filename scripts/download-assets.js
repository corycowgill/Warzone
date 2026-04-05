#!/usr/bin/env node
/**
 * Asset Download Script for Warzone RTS
 * Downloads free CC0/CC-BY 3D models from the web.
 *
 * Usage: node scripts/download-assets.js
 *
 * Current model sources already included in the project:
 *   - Kenney.nl (CC0) - Nature kit, space kit, tower defense kit, castle kit, city kit
 *   - Three.js examples (MIT) - Soldier model
 *   - Various CC0/CC-BY models for units and buildings
 *
 * This script documents recommended model upgrades and where to find them.
 * Most models require manual download from their source websites.
 */
import { existsSync, mkdirSync, createWriteStream, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// Create directories
const dirs = [
  'models/units', 'models/buildings', 'models/environment',
  'textures/terrain', 'textures/skybox', 'textures/ui',
  'audio/sfx/weapons', 'audio/sfx/explosions', 'audio/sfx/ui',
  'audio/sfx/vehicles', 'audio/sfx/ambient',
  'audio/music',
];

for (const dir of dirs) {
  const fullPath = join(ASSETS_DIR, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}/`);
  }
}

/**
 * Download a file from URL with redirect following
 */
function download(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      console.log(`  Skip (exists): ${destPath.split('/assets/')[1]}`);
      resolve();
      return;
    }

    const proto = url.startsWith('https') ? https : http;
    console.log(`  Downloading: ${url.substring(0, 80)}...`);

    proto.get(url, { headers: { 'User-Agent': 'Warzone-RTS-AssetDownloader/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        download(res.headers.location, destPath, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const file = createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  Done: ${destPath.split('/assets/')[1]}`);
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ============ CURRENT MODEL MAPPING (AssetManager.js MANIFEST) ============
// This documents what each game entity maps to for models.

const CURRENT_MANIFEST = {
  // --- UNITS (all paths verified to exist) ---
  unit_infantry:    'assets/models/units/soldier.glb',           // Three.js Soldier - animated military soldier
  unit_engineer:    'assets/models/units/xbot.glb',              // Animated humanoid
  unit_tank:        'assets/models/units/tank.glb',              // Military tank model (~900KB)
  unit_heavytank:   'assets/models/units/tank.glb',              // Same tank, scaled larger
  unit_scoutcar:    'assets/models/units/scout-vehicle.glb',     // Light military vehicle
  unit_apc:         'assets/models/units/apc.glb',               // Armored personnel carrier
  unit_aahalftrack: 'assets/models/units/humvee.glb',            // Military humvee/halftrack
  unit_spg:         'assets/models/units/cannon-mobile.glb',     // Self-propelled gun
  unit_mortarteam:  'assets/models/units/cannon.glb',            // Stationary cannon/mortar
  unit_commander:   'assets/models/units/mini-arena/character-soldier.glb', // Soldier character
  unit_drone:       'assets/models/units/drone.glb',             // UAV drone
  unit_plane:       'assets/models/units/fighter-jet.glb',       // Fighter aircraft
  unit_bomber:      'assets/models/units/craft-cargo.glb',       // Cargo/bomber aircraft
  unit_battleship:  'assets/models/units/battleship.glb',        // Naval battleship
  unit_destroyer:   'assets/models/units/destroyer.glb',         // Naval destroyer
  unit_submarine:   'assets/models/units/submarine.glb',         // Submarine
  unit_patrolboat:  'assets/models/units/patrol-boat.glb',       // Patrol boat
  unit_carrier:     'assets/models/units/warship.glb',           // Aircraft carrier/warship

  // --- BUILDINGS (military-themed, no medieval models) ---
  bld_headquarters:   'assets/models/buildings/fortress.glb',                        // Military fortress
  bld_barracks:       'assets/models/buildings/barracks.glb',                        // Military barracks
  bld_warfactory:     'assets/models/units/space-kit/hangar_largeB.glb',             // Large industrial hangar
  bld_shipyard:       'assets/models/buildings/dock.glb',                            // Dock/pier
  bld_airfield:       'assets/models/units/space-kit/hangar_largeA.glb',             // Large hangar for aircraft
  bld_turret:         'assets/models/buildings/tower-defense/weapon-turret.glb',     // Military weapon turret
  bld_aaturret:       'assets/models/buildings/tower-defense/weapon-cannon.glb',     // AA cannon emplacement
  bld_bunker:         'assets/models/buildings/tower-defense/tower-square-build-f.glb', // Fortified bunker
  bld_wall:           'assets/models/buildings/stone-wall.glb',                      // Defensive wall
  bld_supplydepot:    'assets/models/buildings/storage.glb',                         // Storage warehouse
  bld_supplyexchange: 'assets/models/buildings/shipping-port.glb',                   // Industrial port
  bld_resourcedepot:  'assets/models/units/space-kit/hangar_smallA.glb',             // Small resource hangar
  bld_techlab:        'assets/models/units/space-kit/structure_detailed.glb',        // Tech/research structure
  bld_superweapon:    'assets/models/buildings/tower-defense/tower-round-build-f.glb', // Imposing tower
  bld_munitionscache: 'assets/models/buildings/barrel.glb',                          // Barrel storage
  bld_ditch:          'assets/models/buildings/fence-fortified.glb',                 // Fortified trench
  bld_shippingport:   'assets/models/buildings/shipping-port.glb',                   // Port structure
  bld_watchtower:     'assets/models/buildings/watch-tower.glb',                     // Observation tower
};

// ============ RECOMMENDED UPGRADES ============
// These are better models that can be manually downloaded from free sources.
// Download the GLB files and place them in the specified paths.

const UPGRADE_RECOMMENDATIONS = [
  {
    key: 'unit_tank (upgrade)',
    description: 'Dedicated WWII-style low poly tank',
    sources: [
      'https://mreliptik.itch.io/free-lowpoly-tank-3d-model (CC0, GLTF/FBX)',
      'https://poly.pizza/bundle/Low-Poly-Military-Vehicles-lSgBuYh48X (CC-BY, 9 vehicles by Zsky)',
    ],
    destPath: 'assets/models/units/tank.glb',
    notes: 'Current tank.glb is adequate. Upgrade for more WWII-authentic look.',
  },
  {
    key: 'unit_heavytank (dedicated model)',
    description: 'Larger, heavier tank distinct from regular tank',
    sources: [
      'https://poly.pizza/search/heavy+tank (CC-BY)',
      'https://sketchfab.com/search?q=low+poly+heavy+tank&type=models (Various CC)',
    ],
    destPath: 'assets/models/units/heavy-tank.glb',
    notes: 'Currently reuses tank.glb at larger scale. A dedicated model would be better.',
  },
  {
    key: 'unit_bomber (WWII bomber)',
    description: 'WWII-style bomber aircraft instead of cargo craft',
    sources: [
      'https://poly.pizza/search/bomber (CC-BY)',
      'https://sketchfab.com/search?q=low+poly+bomber&type=models (Various CC)',
    ],
    destPath: 'assets/models/units/bomber.glb',
    notes: 'Current craft-cargo.glb is from Kenney space kit. Replace with propeller bomber.',
  },
  {
    key: 'unit_plane (WWII fighter)',
    description: 'WWII-style propeller fighter instead of modern jet',
    sources: [
      'https://poly.pizza/search/fighter+plane (CC-BY)',
      'https://sketchfab.com/search?q=low+poly+ww2+fighter&type=models (Various CC)',
    ],
    destPath: 'assets/models/units/ww2-fighter.glb',
    notes: 'Current fighter-jet.glb is a modern jet. WWII theme needs propeller aircraft.',
  },
  {
    key: 'bld_headquarters (military HQ)',
    description: 'Large military command center / base building',
    sources: [
      'https://ithappystudios.com/free/military-free/ (Free, GLTF/FBX, 26 military assets)',
      'https://poly.pizza/search/military+base (CC-BY)',
    ],
    destPath: 'assets/models/buildings/military-hq.glb',
    notes: 'Current fortress.glb works but a dedicated military HQ would be better.',
  },
  {
    key: 'bld_barracks (military barracks)',
    description: 'Quonset hut or military barracks building',
    sources: [
      'https://ithappystudios.com/free/military-free/ (Free, includes barracks)',
      'https://poly.pizza/search/barracks (CC-BY)',
    ],
    destPath: 'assets/models/buildings/military-barracks.glb',
    notes: 'Current barracks.glb is decent. Upgrade for more authentic WWII look.',
  },
];

// ============ AUDIO ASSET SOURCES (CC0 / Royalty-Free) ============

const AUDIO_KENNEY_PACKS = [
  {
    name: 'Impact Sounds',
    url: 'https://kenney.nl/media/pages/assets/impact-sounds/8aa7b545c9-1677589768/kenney_impact-sounds.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_impact-sounds.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'impact-sounds'),
    license: 'CC0',
    assets: '~130 impact/collision sounds',
    gameUse: 'Explosions, bullet impacts, building hits',
  },
  {
    name: 'Interface Sounds',
    url: 'https://kenney.nl/media/pages/assets/interface-sounds/d23a84242e-1677589452/kenney_interface-sounds.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_interface-sounds.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'interface-sounds'),
    license: 'CC0',
    assets: '~100 UI sounds',
    gameUse: 'Menu clicks, button hovers, notifications',
  },
  {
    name: 'Sci-Fi Sounds',
    url: 'https://kenney.nl/media/pages/assets/sci-fi-sounds/e3af5f7ed7-1677589334/kenney_sci-fi-sounds.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_sci-fi-sounds.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'sci-fi-sounds'),
    license: 'CC0',
    assets: '~70 sci-fi sounds',
    gameUse: 'Weapon fire, energy effects, superweapon sounds',
  },
  {
    name: 'UI Audio',
    url: 'https://kenney.nl/media/pages/assets/ui-audio/e19c9b1814-1677590494/kenney_ui-audio.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_ui-audio.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'ui-audio'),
    license: 'CC0',
    assets: '~50 UI sounds',
    gameUse: 'Build complete, research done, resource alerts',
  },
  {
    name: 'Digital Audio',
    url: 'https://kenney.nl/media/pages/assets/digital-audio/7492b26e77-1677590265/kenney_digital-audio.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_digital-audio.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'digital-audio'),
    license: 'CC0',
    assets: '~60 electronic/digital sounds',
    gameUse: 'Ambient tones, electronic alerts, radar pings',
  },
  {
    name: 'RPG Audio',
    url: 'https://kenney.nl/media/pages/assets/rpg-audio/706161bc16-1677590336/kenney_rpg-audio.zip',
    dest: join(ASSETS_DIR, 'audio', 'kenney', 'kenney_rpg-audio.zip'),
    extractTo: join(ASSETS_DIR, 'audio', 'kenney', 'rpg-audio'),
    license: 'CC0',
    assets: '~50 RPG sounds',
    gameUse: 'Melee combat, ambient nature, footsteps',
  },
];

const AUDIO_ADDITIONAL_SOURCES = [
  {
    name: 'Sonniss GDC Audio Bundle',
    url: 'https://sonniss.com/gameaudiogdc',
    altUrls: [
      'https://gdc.sonniss.com/',
      'https://archive.org/details/SonnissGameAudioGDC',
    ],
    license: 'Royalty-Free',
    notes: '7+ GB professional game audio bundle. Explosions, gunfire, vehicles, ambience.',
  },
  {
    name: 'Freesound.org Military Pack',
    url: 'https://freesound.org/people/qubodup/packs/4366/',
    license: 'CC0',
    notes: 'Military sound effects pack. Download individual sounds.',
  },
  {
    name: 'Pixabay War Sound Effects',
    url: 'https://pixabay.com/sound-effects/search/war/',
    license: 'Pixabay License (free, no attribution)',
    notes: 'War, explosion, gunfire sounds. Manual download required.',
  },
  {
    name: 'Mixkit War Sound Effects',
    url: 'https://mixkit.co/free-sound-effects/war/',
    license: 'Free (Mixkit License)',
    notes: '28+ warfare sounds including gunfire and explosions.',
  },
  {
    name: 'OpenGameArt CC0 Sound Effects',
    url: 'https://opengameart.org/content/cc0-sound-effects',
    license: 'CC0',
    notes: 'Community game audio. Search for war, military, tank, explosion.',
  },
];

// Download Kenney audio packs
async function downloadAudioPacks() {
  console.log('\n\n=== Downloading Kenney Audio Packs ===\n');

  const kenneyDir = join(ASSETS_DIR, 'audio', 'kenney');
  if (!existsSync(kenneyDir)) {
    mkdirSync(kenneyDir, { recursive: true });
  }

  for (const pack of AUDIO_KENNEY_PACKS) {
    try {
      await download(pack.url, pack.dest);
    } catch (e) {
      console.log(`  FAILED: ${pack.name} - ${e.message}`);
      console.log(`  Manual download: ${pack.url}`);
    }
  }

  console.log('\nAfter downloading, extract ZIPs to their respective folders.');
  console.log('Or run: bash assets/audio/download-audio-assets.sh');
}

// ============ PRINT STATUS ============

console.log('=== Warzone RTS Asset Status ===\n');

console.log('Current Model Assignments:');
console.log('-'.repeat(80));
let okCount = 0;
let missingCount = 0;
for (const [key, path] of Object.entries(CURRENT_MANIFEST)) {
  const fullPath = join(__dirname, '..', path);
  const exists = existsSync(fullPath);
  const status = exists ? 'OK' : 'MISSING';
  if (exists) okCount++; else missingCount++;
  console.log(`  [${status}] ${key.padEnd(22)} -> ${path}`);
}
console.log(`\n  ${okCount} models found, ${missingCount} missing`);

console.log('\n\nRecommended Model Upgrades:');
console.log('-'.repeat(80));
for (const rec of UPGRADE_RECOMMENDATIONS) {
  console.log(`\n  ${rec.key}`);
  console.log(`    ${rec.description}`);
  console.log(`    Destination: ${rec.destPath}`);
  console.log(`    Sources:`);
  for (const src of rec.sources) {
    console.log(`      - ${src}`);
  }
  if (rec.notes) {
    console.log(`    Notes: ${rec.notes}`);
  }
}

console.log('\n\nTo upgrade models:');
console.log('  1. Visit the source URLs above');
console.log('  2. Download the GLB/GLTF files');
console.log('  3. Place them in the destination paths listed');
console.log('  4. Update AssetManager.js MANIFEST if paths differ');
console.log('  5. All units/buildings have procedural fallbacks if models fail to load');

// ============ AUDIO STATUS ============

console.log('\n\nAudio Packs (Kenney CC0):');
console.log('-'.repeat(80));
for (const pack of AUDIO_KENNEY_PACKS) {
  const exists = existsSync(pack.dest);
  const status = exists ? 'DOWNLOADED' : 'NOT YET';
  console.log(`  [${status.padEnd(10)}] ${pack.name.padEnd(20)} (${pack.assets})`);
  console.log(`              Use: ${pack.gameUse}`);
}

console.log('\n\nAdditional Audio Sources (manual download):');
console.log('-'.repeat(80));
for (const src of AUDIO_ADDITIONAL_SOURCES) {
  console.log(`\n  ${src.name} [${src.license}]`);
  console.log(`    URL: ${src.url}`);
  if (src.altUrls) {
    for (const alt of src.altUrls) {
      console.log(`    Alt: ${alt}`);
    }
  }
  console.log(`    ${src.notes}`);
}

console.log('\n\nNote: The game currently uses procedural audio (Web Audio API synthesis).');
console.log('Downloaded audio files can replace procedural sounds for higher quality.');
console.log('See: assets/audio/AUDIO_SOURCES.md for details.\n');

// Write the manifest for reference
writeFileSync(
  join(ASSETS_DIR, 'manifest.json'),
  JSON.stringify({
    current: CURRENT_MANIFEST,
    upgrades: UPGRADE_RECOMMENDATIONS,
    audio: {
      kenney: AUDIO_KENNEY_PACKS.map(p => ({ name: p.name, url: p.url, license: p.license })),
      additional: AUDIO_ADDITIONAL_SOURCES.map(s => ({ name: s.name, url: s.url, license: s.license })),
    },
  }, null, 2)
);
console.log('Wrote asset manifest to assets/manifest.json');

// Download audio if --download-audio flag is passed
if (process.argv.includes('--download-audio')) {
  downloadAudioPacks().catch(e => console.error('Audio download error:', e));
}
