# Warzone Audio Asset Report

> Comprehensive catalog of free/open-source audio assets for the Warzone WWII RTS game.
> All assets evaluated for license compatibility, quality, and relevance.

**Current State:** The SoundManager (`js/systems/SoundManager.js`) uses Web Audio API to synthesize all sounds procedurally. This report identifies real audio assets to replace those synthesized sounds with high-quality recordings.

**Target Format:** OGG Vorbis preferred for web (small file size, good quality, broad browser support). MP3 as fallback. WAV only for source/editing.

---

## Table of Contents

1. [License Summary](#license-summary)
2. [TIER 1 -- Top Recommended Sources](#tier-1----top-recommended-sources)
3. [Sound Effects by Category](#sound-effects-by-category)
4. [Music by Category](#music-by-category)
5. [Implementation Plan](#implementation-plan)

---

## License Summary

| License | Attribution Required? | Commercial Use? | Notes |
|---------|----------------------|----------------|-------|
| CC0 (Public Domain) | No | Yes | Best option. No strings attached. |
| CC-BY 3.0/4.0 | Yes | Yes | Must credit author. Fine for games. |
| Pixabay License | No | Yes | Free, no attribution, some restrictions on redistribution of raw files. |
| Mixkit License | No | Yes | Free for all uses, no attribution. |
| Sonniss GDC License | No | Yes | Royalty-free, unlimited projects, no attribution. No AI/ML training. |
| Incompetech (CC-BY 4.0) | Yes | Yes | Credit Kevin MacLeod. |

**Recommendation:** Prioritize CC0 assets. Use CC-BY where needed (just add credits screen). Avoid anything requiring per-project licensing fees.

---

## TIER 1 -- Top Recommended Sources

These are the highest-value sources for Warzone. Download these first.

### 1. Sonniss GDC Game Audio Bundle (2026)
- **URL:** https://gdc.sonniss.com/
- **License:** Royalty-free, no attribution, unlimited projects
- **Format:** WAV (high quality, convert to OGG for web)
- **Size:** 7.47 GB (2026 bundle), 200+ GB (full archive from 2016-2024)
- **Quality:** 5/5
- **Relevance:** 5/5
- **Contents:** Professionally recorded SFX: weapons, explosions, vehicles, ambiences, foley, UI, impacts, destruction, mechanical sounds. This single source likely covers 60-70% of all SFX needs.
- **Archive (all years):** https://sonniss.com/gameaudiogdc/ and https://archive.org/details/SonnissGameAudioGDC
- **VERDICT: MUST DOWNLOAD. This is the single best free game audio resource in existence.**

### 2. Freesound.org -- qubodup Military Sounds Pack
- **URL:** https://freesound.org/people/qubodup/packs/4366/
- **License:** CC0 (Public Domain) -- extracted from US Government videos
- **Format:** FLAC/WAV/OGG
- **Quality:** 4/5
- **Relevance:** 5/5
- **Contents confirmed:**
  - Tank firing sounds
  - Machine gun bursts, rifle shots
  - Anti-air gun fire (Navy MK 15 Phalanx CIWS)
  - Navy battleship soundscape (turret gunshots, engine hum, radio chatter, officer commands)
  - Military plane radio chatter
  - Army forces in firefight
  - Modern war battlefield ambience loop
  - Tank engine loop
  - Truck engine idle loops
- **VERDICT: DOWNLOAD IMMEDIATELY. Perfect WWII-era military SFX, all CC0.**

### 3. Kenney.nl Audio Packs
- **URL:** https://kenney.nl/assets/category:Audio
- **License:** CC0
- **Format:** OGG (normalized volume, game-ready)
- **Quality:** 4/5
- **Relevance:** 4/5 (strong for UI/impacts, less for WWII-specific)
- **Packs:**
  - **Impact Sounds** (130 assets) -- hits, crashes, thuds. Good for combat impacts, building destruction.
  - **Interface Sounds** (100 assets) -- clicks, snaps, confirm, cancel, minimize, maximize. Perfect for UI.
  - **UI Audio** (50 assets) -- buttons, switches, generic clicks. Supplement for UI.
  - **Digital Audio** (60 assets) -- alerts, notifications. Good for game alerts.
  - **Sci-Fi Sounds** (70 assets) -- energy weapons, shields. Could work for superweapon abilities.
  - **RPG Audio** (50 assets) -- general game sounds.
- **VERDICT: DOWNLOAD ALL. Already OGG format. CC0. Drop-in ready for UI and impacts.**

### 4. Pixabay Sound Effects
- **URL:** https://pixabay.com/sound-effects/
- **License:** Pixabay License (free, no attribution)
- **Format:** MP3 (convert to OGG)
- **Quality:** 3-5/5 (varies by uploader)
- **Relevance:** 5/5
- **Key search pages:**
  - Gunfire: https://pixabay.com/sound-effects/search/gunfire/
  - Tank: https://pixabay.com/sound-effects/search/tank/
  - War explosions: https://pixabay.com/sound-effects/search/war%20explosion/
  - Warfare: https://pixabay.com/sound-effects/search/warfare/
  - Military radio: https://pixabay.com/sound-effects/search/military-radio/
  - Military: https://pixabay.com/sound-effects/search/military/
- **VERDICT: Excellent gap-filler. Search and cherry-pick the best individual sounds.**

### 5. OpenGameArt.org
- **URL:** https://opengameart.org/
- **License:** Mostly CC0, some CC-BY
- **Format:** OGG/WAV/MP3
- **Quality:** 3-4/5
- **Relevance:** 4/5
- **VERDICT: Strong for music and specific SFX collections. Details below by category.**

---

## Sound Effects by Category

### 1. WEAPONS

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| qubodup Military Pack (rifles, MGs, AA) | Freesound | https://freesound.org/people/qubodup/packs/4366/ | CC0 | FLAC/WAV | 4/5 | 5/5 |
| Tank Firing | Freesound | https://freesound.org/people/qubodup/sounds/168707/ | CC0 | FLAC | 4/5 | 5/5 |
| Navy MK 15 Phalanx CIWS (AA fire) | Freesound | https://freesound.org/people/qubodup/sounds/163119/ | CC0 | FLAC | 4/5 | 5/5 |
| Pixabay gunfire collection | Pixabay | https://pixabay.com/sound-effects/search/gunfire/ | Pixabay | MP3 | 3-4/5 | 5/5 |
| Pixabay tank fire | Pixabay | https://pixabay.com/sound-effects/search/tank%20fire/ | Pixabay | MP3 | 3-4/5 | 5/5 |
| Mixkit war/warfare SFX | Mixkit | https://mixkit.co/free-sound-effects/war/ | Mixkit | WAV | 4/5 | 4/5 |
| Mixkit gun SFX | Mixkit | https://mixkit.co/free-sound-effects/gun/ | Mixkit | WAV | 4/5 | 4/5 |
| Sonniss GDC Bundle (weapons category) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 5/5 |
| OpenGameArt Guns WWII | OGA | https://opengameart.org/content/guns-wwii | CC0 | -- | 3/5 | 4/5 |

### 2. EXPLOSIONS

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| 9 Explosion Sounds | OGA | https://opengameart.org/content/9-explosion-sounds | CC0 | WAV | 4/5 | 5/5 |
| 25 CC0 Bang/Firework SFX | OGA | https://opengameart.org/content/25-cc0-bang-firework-sfx | CC0 | WAV | 3/5 | 4/5 |
| 100 CC0 SFX (includes explosions) | OGA | https://opengameart.org/content/100-cc0-sfx | CC0 | WAV | 3/5 | 3/5 |
| Pixabay war explosions | Pixabay | https://pixabay.com/sound-effects/search/war%20explosion/ | Pixabay | MP3 | 4/5 | 5/5 |
| Mixkit explosion SFX (28 sounds) | Mixkit | https://mixkit.co/free-sound-effects/explosion/ | Mixkit | WAV | 4/5 | 5/5 |
| Sonniss GDC Bundle (destruction/impacts) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 5/5 |
| Kenney Impact Sounds (130 assets) | Kenney | https://kenney.nl/assets/impact-sounds | CC0 | OGG | 4/5 | 4/5 |

### 3. VEHICLES

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| Tank Engine Loop | Freesound | https://freesound.org/people/qubodup/sounds/200303/ | CC0 | FLAC | 4/5 | 5/5 |
| M1 Abrams Tank Idle | Freesound | https://freesound.org/people/SoundFX.studio/sounds/456275/ | CC0 | WAV | 4/5 | 4/5 |
| Airplane/Tank Engine Sound | Freesound | https://freesound.org/people/77Pacer/sounds/425268/ | CC0 | WAV | 3/5 | 4/5 |
| Truck Engine Idle Loops | Freesound | https://freesound.org/people/qubodup/sounds/187564/ | CC0 | FLAC | 4/5 | 4/5 |
| Engine Loop (heavy vehicle/tank) | OGA | https://opengameart.org/content/engine-loop-heavy-vehicletank | CC0 | WAV/MP3/OGG | 4/5 | 5/5 |
| Airplane Prop Loop | OGA | https://opengameart.org/content/airplane-prop-loop | CC-BY 3.0 | FLAC/OGG | 4/5 | 5/5 |
| Racing Car Engine Loops | OGA | https://opengameart.org/content/racing-car-engine-sound-loops | CC0 | WAV | 3/5 | 3/5 |
| Pixabay military tank sounds | Pixabay | https://pixabay.com/sound-effects/search/military%20tank/ | Pixabay | MP3 | 3-4/5 | 4/5 |
| Sonniss GDC Bundle (vehicles category) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 5/5 |

### 4. INFANTRY

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| Footsteps on Different Surfaces | OGA | https://opengameart.org/content/footsteps-on-different-surfaces | CC-BY 3.0 | WAV | 4/5 | 5/5 |
| Fantozzi's Footsteps (Grass/Sand/Stone) | OGA | https://opengameart.org/content/fantozzis-footsteps-grasssand-stone | CC0 | WAV | 3/5 | 4/5 |
| Metal Footsteps on Concrete (25 steps) | OGA | https://opengameart.org/content/metal-footsteps-on-concrete | CC0 | WAV | 3/5 | 3/5 |
| Navy Battleship Soundscape (officer commands) | Freesound | https://freesound.org/people/qubodup/sounds/162365/ | CC0 | FLAC | 4/5 | 4/5 |
| Military Plane Radio Chatter | Freesound | https://freesound.org/people/qubodup/sounds/182817/ | CC0 | FLAC | 4/5 | 4/5 |
| German Military Commands | Freesound | https://freesound.org/people/balloonhead/packs/25167/ | CC-BY | WAV | 3/5 | 3/5 |
| Pixabay soldier sounds | Pixabay | https://pixabay.com/sound-effects/search/soldier/ | Pixabay | MP3 | 3/5 | 4/5 |

**Note on Voice Commands:** Specific "move out!", "under fire!", "yes sir!" voice lines are hard to find free. Options:
- Use radio chatter from qubodup pack as ambient voice backdrop
- Use Sonniss GDC bundle (often includes voice/shout SFX)
- Record custom voice lines (cheapest approach for game-specific commands)
- Check itch.io CC0 SFX and Voices collection: https://itch.io/c/4003879/cc0-sfx-and-voices

### 5. BUILDINGS

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| 100 CC0 SFX #2 (construction site loops) | OGA | https://opengameart.org/content/100-cc0-sfx-2 | CC0 | WAV | 3/5 | 4/5 |
| Kenney Impact Sounds (destruction) | Kenney | https://kenney.nl/assets/impact-sounds | CC0 | OGG | 4/5 | 4/5 |
| Sonniss GDC Bundle (construction/destruction) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 5/5 |
| Pixabay construction sounds | Pixabay | https://pixabay.com/sound-effects/search/construction/ | Pixabay | MP3 | 3/5 | 3/5 |

**Specific sounds needed:**
- **Construction:** Hammering, sawing, machinery hum (use construction site loops from OGA 100 CC0 SFX #2)
- **Building Complete:** Short fanfare or "ding" (use Kenney UI Audio or OGA level-up sounds)
- **Building Destroyed:** Large crash + debris (combine Kenney impacts + explosion SFX)

### 6. UI SOUNDS

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| Kenney Interface Sounds (100 assets) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | OGG | 5/5 | 5/5 |
| Kenney UI Audio (50 assets) | Kenney | https://kenney.nl/assets/ui-audio | CC0 | OGG | 5/5 | 5/5 |
| Kenney Digital Audio (60 assets) | Kenney | https://kenney.nl/assets/digital-audio | CC0 | OGG | 4/5 | 4/5 |
| 51 UI Sound Effects (OGA) | OGA | https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks | CC0 | WAV | 4/5 | 5/5 |
| UI Sound Effects Library (OGA) | OGA | https://opengameart.org/content/ui-sound-effects-library | CC0 | WAV | 4/5 | 4/5 |
| GUI Sound Effects (OGA) | OGA | https://opengameart.org/content/gui-sound-effects | CC0 | WAV | 3/5 | 4/5 |
| Button Click (OGA) | OGA | https://opengameart.org/content/button-click-sound-effect-cc0public-domain | CC0 | WAV | 3/5 | 3/5 |

**Mapping to game needs:**
- Click: Kenney Interface Sounds
- Hover: Kenney UI Audio
- Confirm: Kenney Interface Sounds (confirmation category)
- Cancel: Kenney Interface Sounds (snap/back)
- Alert: Kenney Digital Audio
- Achievement unlock: OGA level-up/power-up sounds

### 7. AMBIENT

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| War Ambience Loop | Freesound | https://freesound.org/people/qubodup/sounds/239139/ | CC0 | FLAC | 4/5 | 5/5 |
| Modern War Battlefield | Freesound | https://freesound.org/people/qubodup/sounds/184730/ | CC0 | FLAC | 4/5 | 5/5 |
| Army Forces in Fire Fight | Freesound | https://freesound.org/people/qubodup/sounds/162256/ | CC0 | FLAC | 4/5 | 5/5 |
| Birds and Wind Ambient | OGA | https://opengameart.org/content/birds-and-wind-ambient-birds-wind-and-synth | CC0 | OGG | 3/5 | 4/5 |
| CC0 Background Ambience | OGA | https://opengameart.org/content/cc0-background-ambience | CC0 | OGG | 3/5 | 4/5 |
| Tiny Naval Battle Sounds Set | OGA | https://opengameart.org/content/tiny-naval-battle-sounds-set | CC0 | WAV | 3/5 | 5/5 |
| Pixabay warfare ambience | Pixabay | https://pixabay.com/sound-effects/search/warfare/ | Pixabay | MP3 | 4/5 | 4/5 |
| Pixabay military radio | Pixabay | https://pixabay.com/sound-effects/search/military-radio/ | Pixabay | MP3 | 3/5 | 4/5 |
| Sonniss GDC Bundle (ambiences) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 5/5 |

### 8. ABILITIES (Power-ups, Charges, Impacts)

| Asset | Source | URL | License | Format | Quality | Relevance |
|-------|--------|-----|---------|--------|---------|-----------|
| Electricity Game Sound Pack | OGA | https://opengameart.org/content/electricity-game-sound-pack | CC0 | WAV | 4/5 | 4/5 |
| 63 Digital Sound Effects (lasers, power-ups, zaps) | OGA | https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc | CC0 | WAV | 4/5 | 4/5 |
| Power-Up Sound Effects | OGA | https://opengameart.org/content/power-up-sound-effects | CC0 | WAV | 3/5 | 4/5 |
| Level Up/Power Up (13 sounds) | OGA | https://opengameart.org/content/level-up-power-up-coin-get-13-sounds | CC0 | WAV | 3/5 | 4/5 |
| 50 CC0 Retro/Synth SFX | OGA | https://opengameart.org/content/50-cc0-retro-synth-sfx | CC0 | WAV | 3/5 | 3/5 |
| Kenney Sci-Fi Sounds (70 assets) | Kenney | https://kenney.nl/assets/sci-fi-sounds | CC0 | OGG | 4/5 | 3/5 |

---

## Music by Category

### 1. MENU MUSIC (Cinematic, Military, Orchestral)

| Track/Asset | Source | URL | License | Format | Quality | Relevance |
|-------------|--------|-----|---------|--------|---------|-----------|
| "The Tread of War" (RPG Orchestral) | OGA | https://opengameart.org/content/the-tread-of-war-rpg-orchestral-essentials-military-music | CC0 | OGG | 4/5 | 5/5 |
| "War Theme" | OGA | https://opengameart.org/content/war-theme | CC0 | OGG | 4/5 | 5/5 |
| "Some Militaristic Tune" | OGA | https://opengameart.org/content/some-militaristic-tune | CC0 | OGG | 3/5 | 5/5 |
| CC0 Cinematic Music collection | OGA | https://opengameart.org/content/cc0-cinematic-music | CC0 | OGG | 4/5 | 4/5 |
| Kevin MacLeod - Epic/Intense tracks | Incompetech | https://incompetech.com/music/royalty-free/music.html | CC-BY 4.0 | MP3 | 5/5 | 4/5 |
| "Call to Adventure" | Incompetech | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300022 | CC-BY 4.0 | MP3 | 4/5 | 4/5 |
| "Volatile Reaction" | Incompetech | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400039 | CC-BY 4.0 | MP3 | 4/5 | 4/5 |
| US Army Old Guard Fife & Drum Corps | FMA | https://freemusicarchive.org/music/The_United_States_Army_Old_Guard_Fife_and_Drum_Corps/Celebrating_50_Years | Public Domain | MP3 | 4/5 | 4/5 |

### 2. IN-GAME BACKGROUND (Moderate Tension, Military Theme)

| Track/Asset | Source | URL | License | Format | Quality | Relevance |
|-------------|--------|-----|---------|--------|---------|-----------|
| "War on Water" Tracks | OGA | https://opengameart.org/content/war-on-water-tracks | CC0 | OGG | 4/5 | 4/5 |
| "War Song" | OGA | https://opengameart.org/content/war-song | CC0 | OGG | 3/5 | 4/5 |
| Good CC0 Music collection | OGA | https://opengameart.org/content/good-cc0-music | CC0 | OGG | 3-4/5 | 3/5 |
| Kevin MacLeod action/suspenseful tracks | Incompetech | https://incompetech.com/music/royalty-free/music.html | CC-BY 4.0 | MP3 | 5/5 | 4/5 |
| Sonniss GDC Bundle (music/ambience) | Sonniss | https://gdc.sonniss.com/ | Royalty-free | WAV | 5/5 | 4/5 |

### 3. COMBAT MUSIC (Intense, Dramatic)

| Track/Asset | Source | URL | License | Format | Quality | Relevance |
|-------------|--------|-----|---------|--------|---------|-----------|
| "Orchestral Battle Music" | OGA | https://opengameart.org/content/orchestral-battle-music-0 | CC0 | OGG | 4/5 | 5/5 |
| "Battle Theme A" (epic strings/horns) | OGA | https://opengameart.org/content/battle-theme-a | CC0 | OGG | 4/5 | 5/5 |
| "Battle Theme" | OGA | https://opengameart.org/content/battle-theme-0 | CC0 | OGG | 3/5 | 4/5 |
| "Boss Battle Music" | OGA | https://opengameart.org/content/boss-battle-music | CC0 | OGG | 4/5 | 4/5 |
| Victory War & Battle Music Loops | OGA | https://opengameart.org/content/victory-war-battle-music-loops-library | CC0 | OGG | 4/5 | 5/5 |
| "The Tread of War" (Jonathan Shaw) | OGA | https://opengameart.org/content/the-tread-of-war-jonathan-shaw-pixelsphere-jobromedia | CC0 | OGG | 4/5 | 5/5 |
| Kevin MacLeod intense/aggressive tracks | Incompetech | https://incompetech.com/music/royalty-free/music.html | CC-BY 4.0 | MP3 | 5/5 | 4/5 |

### 4. VICTORY FANFARE

| Track/Asset | Source | URL | License | Format | Quality | Relevance |
|-------------|--------|-----|---------|--------|---------|-----------|
| "Victory" (fanfare) | OGA | https://opengameart.org/content/victory | CC0 | MP3/WAV | 3/5 | 5/5 |
| "Victory Fanfare Short" | OGA | https://opengameart.org/content/victory-fanfare-short | CC0 | OGG | 4/5 | 5/5 |
| "Lively Meadow" (Victory Fanfare + Song) | OGA | https://opengameart.org/content/lively-meadow-victory-fanfare-and-song | CC0 | OGG | 4/5 | 4/5 |
| "Victory Party" | OGA | https://opengameart.org/content/victory-party | CC0/CC-BY 4.0 | OGG | 3/5 | 3/5 |
| "Victory Theme for RPG" | OGA | https://opengameart.org/content/victory-theme-for-rpg | CC0 | OGG | 3/5 | 4/5 |

### 5. DEFEAT THEME

| Track/Asset | Source | URL | License | Format | Quality | Relevance |
|-------------|--------|-----|---------|--------|---------|-----------|
| "Medieval: Defeat Theme" | OGA | https://opengameart.org/content/medieval-defeat-theme | CC0 | OGG | 4/5 | 4/5 |
| Kevin MacLeod somber/dark tracks | Incompetech | https://incompetech.com/music/royalty-free/music.html | CC-BY 4.0 | MP3 | 4/5 | 4/5 |

---

## Additional Sources (Searched but Lower Priority)

### Zapsplat
- **URL:** https://www.zapsplat.com/sound-effect-category/war-and-weapons/
- **License:** Free with account (attribution required on free tier), or paid for no-attribution
- **Quality:** 4/5
- **Notes:** 160,000+ weapon/war sounds. Requires free account to download. Good quality but attribution requirement on free tier is inconvenient. Use as backup source.

### Mixkit
- **URL:** https://mixkit.co/free-sound-effects/war/
- **License:** Mixkit License (free, no attribution)
- **Quality:** 4/5
- **Available:** 25 war SFX, 28 warfare SFX, 19 battle SFX, plus explosion, gun, and tank categories
- **Notes:** Smaller library but high quality and very permissive license. Good for cherry-picking specific sounds.

### SoundBible
- **URL:** https://soundbible.com/tags-world-war.html
- **License:** Mixed (check per sound)
- **Quality:** 2-3/5
- **Notes:** Older site, lower quality recordings. Use as last resort.

### Free Music Archive
- **URL:** https://freemusicarchive.org/
- **License:** Mixed Creative Commons
- **Quality:** 3-4/5
- **Notes:** Good for music, not SFX. Has military marches from US Army bands (public domain).

### itch.io Sound Packs
- **URL:** https://itch.io/game-assets/free/tag-sound-effects/tag-weapons
- **License:** Varies (filter by CC0)
- **Quality:** 3-4/5
- **Key packs:**
  - "Sounds of War" (275 SFX): https://delusiondrive.itch.io/sounds-of-war-full-audio-effects-pack-in-mp3-format
  - CC0 SFX and Voices collection: https://itch.io/c/4003879/cc0-sfx-and-voices
  - CC0 sound effects tag: https://itch.io/game-assets/assets-cc0/tag-sound-effects

### FreePD.com
- **STATUS: CLOSED** after 17 years. No longer available. Some content may be on Internet Archive.

---

## Implementation Plan

### Phase 1: Download and Organize (Immediate)
1. **Download Sonniss GDC 2026 bundle** (7.47 GB) -- covers most SFX needs
2. **Download all Kenney audio packs** (6 packs, ~460 assets) -- covers all UI needs
3. **Download qubodup military pack** from Freesound -- covers WWII weapons/vehicles
4. **Download OGA naval battle sounds** -- covers naval combat

### Phase 2: Curate and Convert
1. Listen to all downloaded assets, select best per category
2. Convert WAV/FLAC/MP3 to OGG Vorbis (use ffmpeg: `ffmpeg -i input.wav -c:a libvorbis -q:a 4 output.ogg`)
3. Normalize volume levels across all assets
4. Trim/edit sounds as needed (remove silence, adjust loops)
5. Target file sizes: SFX < 100KB each, music < 2MB each, ambient loops < 500KB each

### Phase 3: Download Music
1. Download OGA battle/war music tracks (CC0)
2. Download Kevin MacLeod tracks from Incompetech (CC-BY 4.0)
3. Select 2-3 tracks per music category
4. Create looping versions for in-game background

### Phase 4: Integrate into SoundManager
1. Create `assets/audio/sfx/` directory structure:
   ```
   assets/audio/
     sfx/
       weapons/        (rifle.ogg, machinegun.ogg, cannon.ogg, artillery.ogg, naval_gun.ogg, aa_fire.ogg)
       explosions/     (small.ogg, medium.ogg, large.ogg, building_collapse.ogg)
       vehicles/       (tank_idle.ogg, tank_move.ogg, jeep.ogg, plane_flyby.ogg, ship.ogg)
       infantry/       (footstep_grass.ogg, footstep_dirt.ogg, footstep_concrete.ogg)
       buildings/      (construction_loop.ogg, complete.ogg, destroyed.ogg)
       ui/             (click.ogg, hover.ogg, confirm.ogg, cancel.ogg, alert.ogg, achievement.ogg)
       abilities/      (powerup.ogg, charge.ogg, impact.ogg)
       ambient/        (battlefield.ogg, birds.ogg, wind.ogg, ocean.ogg, radio_chatter.ogg)
     music/
       menu.ogg
       ingame_1.ogg
       ingame_2.ogg
       combat_1.ogg
       combat_2.ogg
       victory.ogg
       defeat.ogg
   ```
2. Update `SoundManager.js` to load OGG files via `fetch()` + `AudioContext.decodeAudioData()`
3. Replace synthesized sounds with real audio buffers
4. Add preloading system with loading progress indicator

### Phase 5: Credits
Add audio credits to game (settings/about screen):
```
Sound Effects:
- Sonniss GDC Game Audio Bundle (sonniss.com)
- Kenney.nl (CC0)
- qubodup on Freesound.org (CC0, US Government Public Domain)
- OpenGameArt.org contributors (CC0)
- Pixabay.com contributors

Music:
- Kevin MacLeod (incompetech.com) - Licensed under CC BY 4.0
- OpenGameArt.org contributors (CC0)
- Free Music Archive contributors
```

---

## Summary: Priority Download List

| Priority | Source | What to Get | Est. Size | License |
|----------|--------|-------------|-----------|---------|
| 1 | Sonniss GDC 2026 | Full bundle | 7.47 GB | Royalty-free |
| 2 | Kenney.nl | All 6 audio packs | ~50 MB | CC0 |
| 3 | Freesound (qubodup) | Military sounds pack | ~100 MB | CC0 |
| 4 | OpenGameArt.org | War/battle music + naval sounds + explosions + footsteps + UI | ~200 MB | CC0 |
| 5 | Incompetech | 5-8 military/epic/somber tracks | ~50 MB | CC-BY 4.0 |
| 6 | Pixabay | Cherry-pick gaps (radio, specific weapons) | ~30 MB | Pixabay License |
| 7 | Mixkit | Cherry-pick specific war/explosion SFX | ~20 MB | Mixkit License |

**Total estimated raw download: ~8 GB**
**Final game audio budget (after conversion/selection): ~15-30 MB OGG**
