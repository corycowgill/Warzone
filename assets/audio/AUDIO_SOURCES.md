# Warzone Audio Sources

All audio assets listed here are either CC0 (public domain) or royalty-free with no attribution required.

## Current State

The game currently uses **procedural audio synthesis** via Web Audio API:
- `js/audio/SFXLibrary.js` - Procedural SFX (weapons, explosions, UI, vehicles)
- `js/audio/MusicGenerator.js` - Procedural music (menu, battle, victory/defeat)
- `js/systems/SoundManager.js` - Audio routing and volume control

This means the game works with zero audio files. Downloaded audio assets can be used to **replace or supplement** the procedural sounds for higher quality.

## Migration Path

To use downloaded audio files instead of procedural synthesis:
1. Run `bash assets/audio/download-audio-assets.sh` to download Kenney packs
2. Create an audio manifest mapping game events to audio files
3. Update `SoundManager.js` to load and play audio buffers
4. Keep procedural audio as fallback when files fail to load

---

## Available: Kenney Audio Packs (CC0)

Downloaded via `download-audio-assets.sh`. All CC0 licensed - no attribution required, free for commercial use.

| Pack | Assets | URL | Use in Game |
|------|--------|-----|-------------|
| Impact Sounds | ~130 | https://kenney.nl/assets/impact-sounds | Explosions, hits, collisions |
| Interface Sounds | ~100 | https://kenney.nl/assets/interface-sounds | UI clicks, menus, notifications |
| Sci-Fi Sounds | ~70 | https://kenney.nl/assets/sci-fi-sounds | Weapons, energy effects, vehicles |
| UI Audio | ~50 | https://kenney.nl/assets/ui-audio | Buttons, toggles, alerts |
| Digital Audio | ~60 | https://kenney.nl/assets/digital-audio | Ambient loops, electronic tones |
| RPG Audio | ~50 | https://kenney.nl/assets/rpg-audio | Melee hits, ambient nature |

**Total: ~460 sound effects**

### Direct Download URLs (if script fails)

```
https://kenney.nl/media/pages/assets/impact-sounds/8aa7b545c9-1677589768/kenney_impact-sounds.zip
https://kenney.nl/media/pages/assets/interface-sounds/d23a84242e-1677589452/kenney_interface-sounds.zip
https://kenney.nl/media/pages/assets/sci-fi-sounds/e3af5f7ed7-1677589334/kenney_sci-fi-sounds.zip
https://kenney.nl/media/pages/assets/ui-audio/e19c9b1814-1677590494/kenney_ui-audio.zip
https://kenney.nl/media/pages/assets/digital-audio/7492b26e77-1677590265/kenney_digital-audio.zip
https://kenney.nl/media/pages/assets/rpg-audio/706161bc16-1677590336/kenney_rpg-audio.zip
```

---

## Additional Sources (Manual Download)

### Sonniss GDC Audio Bundle (Royalty-Free)

Professional-grade game audio, 7+ GB of sounds. Royalty-free for game development.

- **Main page:** https://sonniss.com/gameaudiogdc
- **Direct:** https://gdc.sonniss.com/
- **Archive.org mirror:** https://archive.org/details/SonnissGameAudioGDC

Contains: explosions, gunfire, vehicles, ambience, impacts, and much more. Ideal for high-quality weapon and vehicle sounds.

### Freesound.org (CC0 / Various CC licenses)

Community-contributed sounds. Filter by CC0 for maximum freedom.

- **Military sounds pack:** https://freesound.org/people/qubodup/packs/4366/
- **Search explosions:** https://freesound.org/search/?q=explosion&f=license:%22Creative+Commons+0%22
- **Search gunfire:** https://freesound.org/search/?q=gunfire&f=license:%22Creative+Commons+0%22
- **Search tank:** https://freesound.org/search/?q=tank+engine&f=license:%22Creative+Commons+0%22
- **Search war ambient:** https://freesound.org/search/?q=war+ambient&f=license:%22Creative+Commons+0%22

### Pixabay Sound Effects (Free, no attribution)

- **War sounds:** https://pixabay.com/sound-effects/search/war/
- **Explosions:** https://pixabay.com/sound-effects/search/explosion/
- **Gunfire:** https://pixabay.com/sound-effects/search/gunfire/
- **Military:** https://pixabay.com/sound-effects/search/military/
- **Tank:** https://pixabay.com/sound-effects/search/tank/

### Mixkit (Free, no attribution)

- **War sounds:** https://mixkit.co/free-sound-effects/war/
- **Explosions:** https://mixkit.co/free-sound-effects/explosion/
- **Guns:** https://mixkit.co/free-sound-effects/gun/

### OpenGameArt.org (Various free licenses)

- **Audio section:** https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=13
- **War music:** https://opengameart.org/art-search-advanced?keys=war+music&field_art_type_tid%5B%5D=13
- **Battle music:** https://opengameart.org/art-search-advanced?keys=battle+music&field_art_type_tid%5B%5D=13

---

## Sound Categories Needed

| Category | Path | What to Look For |
|----------|------|------------------|
| Weapons | sfx/weapons/ | Rifle shots, machine gun bursts, cannon fire, shell impacts |
| Explosions | sfx/explosions/ | Small/medium/large explosions, building destruction |
| Vehicles | sfx/vehicles/ | Tank engines, truck motors, ship horns, plane engines |
| UI | sfx/ui/ | Button clicks, menu sounds, alerts, notifications, build complete |
| Ambient | sfx/ambient/ | Battlefield ambience, wind, rain, distant gunfire, radio chatter |
| Music | music/ | Epic orchestral, tense combat, calm base-building, victory/defeat |

---

## File Format Notes

- **Preferred format:** OGG Vorbis (best browser support + compression)
- **Alternative:** MP3 (universal support)
- **Avoid:** WAV (too large for web), FLAC (limited browser support)
- Web Audio API used by SoundManager.js supports OGG, MP3, WAV
- Keep individual files under 500KB for SFX, under 5MB for music tracks
