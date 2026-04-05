/**
 * AudioLoader - Loads and manages real audio files (OGG/MP3/WAV) for the game.
 * Replaces procedural synthesis with higher-quality recorded sounds when available.
 * Falls back to procedural synthesis if files aren't loaded.
 */
export class AudioLoader {
  constructor(audioContext, sfxGain) {
    this.ctx = audioContext;
    this.output = sfxGain;
    this.buffers = new Map(); // name -> AudioBuffer
    this.loading = new Map(); // name -> Promise
    this.ready = false;

    // Map game sound events to audio files
    this.soundMap = {
      // UI sounds (Kenney Interface Sounds)
      'ui_click':     'assets/audio/kenney-interface/Audio/click_003.ogg',
      'ui_hover':     'assets/audio/kenney-interface/Audio/rollover_003.ogg',
      'ui_confirm':   'assets/audio/kenney-interface/Audio/confirmation_001.ogg',
      'ui_cancel':    'assets/audio/kenney-interface/Audio/back_001.ogg',
      'ui_alert':     'assets/audio/kenney-interface/Audio/error_004.ogg',
      'ui_select':    'assets/audio/kenney-interface/Audio/switch_003.ogg',
      'ui_open':      'assets/audio/kenney-interface/Audio/open_001.ogg',
      'ui_close':     'assets/audio/kenney-interface/Audio/close_001.ogg',

      // Footsteps (Kenney Impact Sounds)
      'footstep_1':   'assets/audio/kenney-impact/Audio/footstep_concrete_000.ogg',
      'footstep_2':   'assets/audio/kenney-impact/Audio/footstep_concrete_001.ogg',
      'footstep_3':   'assets/audio/kenney-impact/Audio/footstep_concrete_002.ogg',
      'footstep_4':   'assets/audio/kenney-impact/Audio/footstep_concrete_003.ogg',

      // Impacts (Kenney Impact Sounds)
      'impact_1':     'assets/audio/kenney-impact/Audio/impactMetal_heavy_001.ogg',
      'impact_2':     'assets/audio/kenney-impact/Audio/impactMetal_heavy_002.ogg',
      'impact_3':     'assets/audio/kenney-impact/Audio/impactMetal_heavy_003.ogg',
      'impact_soft':  'assets/audio/kenney-impact/Audio/impactSoft_heavy_000.ogg',

      // Sci-fi (Kenney Sci-Fi - for abilities/tech)
      'ability_1':    'assets/audio/kenney-sci/Audio/laserSmall_001.ogg',
      'ability_2':    'assets/audio/kenney-sci/Audio/laserSmall_002.ogg',
      'ability_3':    'assets/audio/kenney-sci/Audio/laserLarge_001.ogg',
      'powerup':      'assets/audio/kenney-sci/Audio/phaserUp_001.ogg',
      'powerdown':    'assets/audio/kenney-sci/Audio/phaserDown_001.ogg',
      'alarm':        'assets/audio/kenney-sci/Audio/computerNoise_002.ogg',

      // RPG sounds (Kenney RPG - for building/production)
      'build_1':      'assets/audio/kenney-rpg/Audio/metalClick.ogg',
      'build_2':      'assets/audio/kenney-rpg/Audio/metalLatch.ogg',
      'coins':        'assets/audio/kenney-rpg/Audio/handleCoins.ogg',
      'chest':        'assets/audio/kenney-rpg/Audio/chestOpen.ogg',

      // Digital (Kenney Digital - for research/tech)
      'research':     'assets/audio/kenney-digital/Audio/powerUp10.ogg',
      'complete':     'assets/audio/kenney-digital/Audio/powerUp11.ogg',
      'levelup':      'assets/audio/kenney-digital/Audio/powerUp08.ogg',
    };
  }

  /**
   * Preload all mapped sounds
   */
  async preloadAll() {
    const entries = Object.entries(this.soundMap);
    const promises = entries.map(([name, path]) => this.load(name, path));
    await Promise.allSettled(promises);
    this.ready = true;
    console.log(`AudioLoader: ${this.buffers.size}/${entries.length} sounds loaded`);
  }

  /**
   * Load a single audio file
   */
  async load(name, path) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.loading.has(name)) return this.loading.get(name);

    const promise = fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(data => this.ctx.decodeAudioData(data))
      .then(buffer => {
        this.buffers.set(name, buffer);
        this.loading.delete(name);
        return buffer;
      })
      .catch(err => {
        this.loading.delete(name);
        // Silent fail - procedural fallback will be used
        return null;
      });

    this.loading.set(name, promise);
    return promise;
  }

  /**
   * Play a loaded sound by name
   * @param {string} name - Sound name from soundMap
   * @param {number} volume - Volume multiplier (0-1)
   * @param {number} playbackRate - Pitch variation (default 1.0)
   */
  play(name, volume = 1.0, playbackRate = 1.0) {
    const buffer = this.buffers.get(name);
    if (!buffer || !this.ctx) return false;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.output);
    source.start(0);

    return true;
  }

  /**
   * Play a random variant of a sound (e.g., footstep_1, footstep_2, etc.)
   */
  playRandom(baseName, volume = 1.0) {
    // Find all variants
    const variants = [];
    for (let i = 1; i <= 10; i++) {
      const key = `${baseName}_${i}`;
      if (this.buffers.has(key)) variants.push(key);
    }
    if (variants.length === 0) return this.play(baseName, volume);

    const pick = variants[Math.floor(Math.random() * variants.length)];
    // Slight random pitch variation for naturalism
    const rate = 0.9 + Math.random() * 0.2;
    return this.play(pick, volume, rate);
  }

  /**
   * Check if a sound is loaded
   */
  has(name) {
    return this.buffers.has(name);
  }

  dispose() {
    this.buffers.clear();
    this.loading.clear();
  }
}
