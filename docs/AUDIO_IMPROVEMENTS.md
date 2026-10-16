# Battlefield audio pass

Original synthesized audio now covers 13 sound families with three cached variants
each. Rifles, automatic weapons, cannons, heavy armor, artillery, naval guns,
torpedoes, aircraft and drones have separate profiles. Impact, destruction,
casualty and menu cues complete the bank. These are layered procedural sounds,
not downloaded recordings or new voice acting.

Combat playback uses camera-relative stereo placement, distance attenuation, slight
pitch variation, a same-family throttle and a 24-voice cap. Sample generation happens
once at initialization; individual shots reuse AudioBuffers. Weapon impacts are
triggered at visual projectile arrival. The shared mix uses dynamics compression,
and music ducks during combat and voice acknowledgements.

All saved audio controls now apply: master, SFX, music, voice and ambient levels and
their independent switches. SFX mute preserves music and ambience. Slider changes
do not restart music. Voice acknowledgements avoid speech queue buildup, use a more
consistent pitch, and honor voice mute/volume. Hidden pages suspend audio and cancel
speech; ambient callbacks avoid scheduling bursts while suspended.

Music loops schedule against the audio clock instead of starting each successive
loop 200ms early. Completed music nodes are released, and stopping music also stops
queued percussion. Noise used by music is cached. Ambient wind varies with biome,
birds are limited to temperate maps, and water maps have a subtle shore wash.

Validation: `npm run test:audio` checks finite/click-ramped samples, deterministic
variation, buffer reuse, spatial pan, voice budgets, independent settings and state
cleanup. VFX and performance checks also pass. Browser playback and independent SFX
mute/music controls were verified without console errors. An OfflineAudioContext
render of all 13 families through the compressor at default master volume measured
peak 0.177 and RMS 0.019 (linear amplitude), without clipping in that test. This is
technical playback/mix validation, not a listening review on different speakers.

Open `docs/audio-preview.html` to compare weapons, direction, distance, music,
ambience and mute controls, or render the combined mix for validation.
