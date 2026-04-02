export class SoundManager {
  constructor(game) {
    this.game = game;
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.volume = 0.3;
    this.musicVolume = 0.25;
    this.enabled = true;
    this.musicEnabled = true;
    this.initialized = false;

    // Active music/ambient state
    this._menuMusic = null;
    this._gameMusic = null;
    this._combatMusic = null;
    this._ambientWind = null;
    this._ambientWater = null;
    this._ambientArtillery = null;
    this._currentMusicType = null; // 'menu', 'game', null
    this._combatIntensity = 0;
    this._combatDecayTimer = 0;
    this._musicScheduler = null;

    // Throttle tracking to prevent sound spam
    this._lastPlayTime = {};
    this._minInterval = 0.05; // 50ms minimum between same sound

    // Off-screen combat ping throttle
    this._lastPingTime = 0;

    // Initialize on first user interaction
    this._initOnInteraction = () => {
      if (!this.initialized) {
        this.initAudio();
      }
    };
    document.addEventListener('click', this._initOnInteraction, { once: true });
    document.addEventListener('keydown', this._initOnInteraction, { once: true });
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);

      // SFX bus
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      // Music bus
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // Ambient bus
      this.ambientGain = this.audioContext.createGain();
      this.ambientGain.gain.value = 0.5;
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;

      // If game is at menu, start menu music
      if (this.game && this.game.state === 'MENU') {
        this.startMenuMusic();
      }
    } catch (e) {
      console.warn('Web Audio not available:', e);
      this.enabled = false;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAllMusic();
      this.stopAmbient();
    } else if (this.initialized) {
      // Restart appropriate music
      if (this.game.state === 'MENU') this.startMenuMusic();
      else if (this.game.state === 'PLAYING') {
        this.startGameMusic();
        this.startAmbient();
      }
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopAllMusic();
    } else if (this.initialized) {
      if (this.game.state === 'MENU') this.startMenuMusic();
      else if (this.game.state === 'PLAYING') this.startGameMusic();
    }
  }

  // Called from Game.js state changes
  onStateChange(newState) {
    if (!this.initialized || !this.enabled) return;
    switch (newState) {
      case 'MENU':
        this.stopAllMusic();
        this.stopAmbient();
        this.startMenuMusic();
        break;
      case 'PLAYING':
        this.stopAllMusic();
        this.startGameMusic();
        this.startAmbient();
        break;
      case 'GAME_OVER':
        this.stopAllMusic();
        this.stopAmbient();
        break;
    }
  }

  // Called each game frame from Game.update()
  update(delta) {
    if (!this.initialized || !this.enabled) return;

    // Decay combat intensity over time
    if (this._combatIntensity > 0) {
      this._combatDecayTimer += delta;
      if (this._combatDecayTimer > 2.0) {
        this._combatIntensity = Math.max(0, this._combatIntensity - delta * 0.3);
      }
    }

    // Fade combat music layer based on intensity
    if (this._combatMusic && this._combatMusic.gain) {
      const targetVol = Math.min(1.0, this._combatIntensity);
      const current = this._combatMusic.gain.gain.value;
      const newVol = current + (targetVol - current) * Math.min(1, delta * 2);
      this._combatMusic.gain.gain.value = newVol;
    }
  }

  // Notify that combat happened (call from CombatSystem)
  notifyCombat() {
    this._combatIntensity = Math.min(1.0, this._combatIntensity + 0.15);
    this._combatDecayTimer = 0;
  }

  // Spatial awareness: play a warning ping when player units are attacked off-screen
  notifyCombatOffscreen(position) {
    if (!this.enabled || !this.audioContext || !this.initialized) return;

    // Check if position is on screen
    const camera = this.game.sceneManager?.camera;
    if (!camera) return;

    const vec = position.clone().project(camera);
    const onScreen = vec.x >= -1 && vec.x <= 1 && vec.y >= -1 && vec.y <= 1 && vec.z < 1;

    if (!onScreen) {
      // Play a subtle warning ping - different tone based on direction
      this.playWarningPing(vec.x);
    }
  }

  playWarningPing(direction) {
    // Throttle: don't spam pings
    const now = Date.now();
    if (this._lastPingTime && now - this._lastPingTime < 3000) return;
    this._lastPingTime = now;

    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const gain = ctx.createGain();
    gain.connect(this.sfxGain);
    gain.gain.value = 0.1;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // Higher pitch for right, lower for left
    osc.frequency.value = 600 + direction * 100;
    osc.connect(gain);

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // ==================== PLAY DISPATCHER ====================

  play(soundName, options) {
    if (!this.enabled || !this.initialized || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Throttle repeated sounds
    const now = this.audioContext.currentTime;
    const key = soundName + (options?.unitType || '');
    if (this._lastPlayTime[key] && (now - this._lastPlayTime[key]) < this._minInterval) return;
    this._lastPlayTime[key] = now;

    const unitType = options?.unitType || null;

    switch (soundName) {
      case 'attack': this.playAttack(unitType); break;
      case 'death': this.playDeath(unitType); break;
      case 'explosion': this.playExplosion(); break;
      case 'produce': this.playProduce(); break;
      case 'move': this.playMoveAck(unitType); this.playVoiceLine('move'); break;
      case 'select': this.playSelectAck(unitType); this.playVoiceLine('select'); break;
      case 'acknowledge': this.playAttackAck(unitType); this.playVoiceLine('attack'); break;
      case 'build': this.playBuild(); break;
      case 'ability': this.playAbility(); break;
      case 'error': this.playError(); break;
      case 'victory': this.playVictoryFanfare(); break;
      case 'defeat': this.playDefeatSting(); break;
    }
  }

  // ==================== UNIT-TYPE ATTACK SOUNDS ====================

  playAttack(unitType) {
    switch (unitType) {
      case 'infantry': this._playInfantryAttack(); break;
      case 'tank': this._playTankAttack(); break;
      case 'drone': this._playDroneAttack(); break;
      case 'plane': this._playPlaneAttack(); break;
      case 'battleship': this._playBattleshipAttack(); break;
      case 'carrier': this._playCarrierAttack(); break;
      case 'submarine': this._playSubmarineAttack(); break;
      default: this._playInfantryAttack(); break;
    }
  }

  _playInfantryAttack() {
    // Sharp rifle crack: short noise burst, highpass
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.06;
    const buffer = this._makeNoiseBuffer(duration);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000 * (0.95 + Math.random() * 0.1);
    hp.Q.value = 2;

    const volumeVariation = 0.85 + Math.random() * 0.3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18 * volumeVariation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + duration);
  }

  _playTankAttack() {
    // Low cannon boom: low osc + noise thump
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    // Low boom oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(30 * pitchVariation, now + 0.3);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Impact noise
    const buffer = this._makeNoiseBuffer(0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    lp.Q.value = 1;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2 * volumeVariation, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);
    noise.start(now);
    noise.stop(now + 0.2);
  }

  _playDroneAttack() {
    // Quick electric burst: high freq oscillator + fast modulation
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(800 * pitchVariation, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1 * volumeVariation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  _playPlaneAttack() {
    // Strafing run: descending noise burst with midrange
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const buffer = this._makeNoiseBuffer(0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3000 * pitchVariation, now);
    bp.frequency.exponentialRampToValueAtTime(1500 * pitchVariation, now + 0.15);
    bp.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15 * volumeVariation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Add a low rumble under it
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 120 * pitchVariation;
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.08 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(this.sfxGain);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  _playBattleshipAttack() {
    // Deep naval cannon: very low boom with reverb-like tail
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(20 * pitchVariation, now + 0.5);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.3 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    // Mid rumble layer
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(120 * pitchVariation, now);
    osc2.frequency.exponentialRampToValueAtTime(50 * pitchVariation, now + 0.4);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.15 * volumeVariation, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Noise crack
    const buffer = this._makeNoiseBuffer(0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15 * volumeVariation, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscGain); oscGain.connect(this.sfxGain);
    osc2.connect(osc2Gain); osc2Gain.connect(this.sfxGain);
    noise.connect(lp); lp.connect(noiseGain); noiseGain.connect(this.sfxGain);

    osc.start(now); osc.stop(now + 0.6);
    osc2.start(now); osc2.stop(now + 0.5);
    noise.start(now); noise.stop(now + 0.3);
  }

  _playCarrierAttack() {
    // Light auto-cannon: rapid double tap
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.06;
      const buffer = this._makeNoiseBuffer(0.04);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(bp); bp.connect(gain); gain.connect(this.sfxGain);
      noise.start(t); noise.stop(t + 0.04);
    }
  }

  _playSubmarineAttack() {
    // Torpedo launch: rising whoosh + ping
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    // Whoosh
    const buffer = this._makeNoiseBuffer(0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(200 * pitchVariation, now);
    bp.frequency.exponentialRampToValueAtTime(800 * pitchVariation, now + 0.2);
    bp.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 * volumeVariation, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Sonar ping
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1400 * pitchVariation;
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, now);
    pingGain.gain.linearRampToValueAtTime(0.08 * volumeVariation, now + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(this.sfxGain);
    osc.connect(pingGain); pingGain.connect(this.sfxGain);

    noise.start(now); noise.stop(now + 0.3);
    osc.start(now); osc.stop(now + 0.15);
  }

  // ==================== UNIT-TYPE DEATH SOUNDS ====================

  playDeath(unitType) {
    switch (unitType) {
      case 'infantry': this._playInfantryDeath(); break;
      case 'tank': this._playTankDeath(); break;
      case 'drone':
      case 'plane': this._playAirDeath(); break;
      case 'battleship':
      case 'carrier':
      case 'submarine': this._playNavalDeath(); break;
      default: this._playGenericDeath(); break;
    }
  }

  _playInfantryDeath() {
    // Quick thud + short cry-like descending tone
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(80 * pitchVariation, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12 * volumeVariation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.25);
  }

  _playTankDeath() {
    // Big explosion: low rumble + noise + secondary boom
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(25 * pitchVariation, now + 0.6);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.3 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    const buffer = this._makeNoiseBuffer(0.5);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, now);
    lp.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Secondary pop
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(60, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(oscGain); oscGain.connect(this.sfxGain);
    noise.connect(lp); lp.connect(noiseGain); noiseGain.connect(this.sfxGain);
    osc2.connect(osc2Gain); osc2Gain.connect(this.sfxGain);

    osc.start(now); osc.stop(now + 0.7);
    noise.start(now); noise.stop(now + 0.5);
    osc2.start(now + 0.1); osc2.stop(now + 0.55);
  }

  _playAirDeath() {
    // Descending whine + explosion
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(200 * pitchVariation, now + 0.5);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.1 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    // Crash noise at end
    const buffer = this._makeNoiseBuffer(0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(oscGain); oscGain.connect(this.sfxGain);
    noise.connect(lp); lp.connect(noiseGain); noiseGain.connect(this.sfxGain);

    osc.start(now); osc.stop(now + 0.55);
    noise.start(now + 0.2); noise.stop(now + 0.6);
  }

  _playNavalDeath() {
    // Deep hull breach: metallic groan + water rush
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    // Metal groan
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(40 * pitchVariation, now + 0.8);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.15 * volumeVariation, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    // Water rush noise
    const buffer = this._makeNoiseBuffer(0.6);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(oscGain); oscGain.connect(this.sfxGain);
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(this.sfxGain);

    osc.start(now); osc.stop(now + 0.9);
    noise.start(now); noise.stop(now + 0.7);
  }

  _playGenericDeath() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const pitchVariation = 0.95 + Math.random() * 0.1;
    const volumeVariation = 0.85 + Math.random() * 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200 * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(40 * pitchVariation, now + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2 * volumeVariation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const buffer = this._makeNoiseBuffer(0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 * volumeVariation, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain); gain.connect(this.sfxGain);
    noise.connect(noiseGain); noiseGain.connect(this.sfxGain);

    osc.start(now); osc.stop(now + 0.4);
    noise.start(now); noise.stop(now + 0.3);
  }

  // ==================== UNIT VOICE BARKS ====================
  // Radio-chatter style beep patterns per unit type

  playSelectAck(unitType) {
    // Select click + unit-specific radio chirp
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Base click
    const click = ctx.createOscillator();
    click.type = 'sine';
    click.frequency.value = 800;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    click.connect(clickGain); clickGain.connect(this.sfxGain);
    click.start(now); click.stop(now + 0.06);

    // Unit-specific radio chirp after click
    this._playRadioChirp(unitType, now + 0.08);
  }

  playMoveAck(unitType) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    this._playCommandAck(unitType, now, [400, 500]);
  }

  playAttackAck(unitType) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    this._playCommandAck(unitType, now, [500, 600, 700]);
  }

  _playRadioChirp(unitType, startTime) {
    const ctx = this.audioContext;
    // Different beep patterns per unit type
    const patterns = {
      infantry:    [{ f: 600, d: 0.04 }, { f: 700, d: 0.04 }],
      tank:        [{ f: 300, d: 0.06 }, { f: 350, d: 0.08 }],
      drone:       [{ f: 900, d: 0.03 }, { f: 1100, d: 0.03 }, { f: 900, d: 0.03 }],
      plane:       [{ f: 500, d: 0.05 }, { f: 700, d: 0.05 }],
      battleship:  [{ f: 200, d: 0.1 }, { f: 250, d: 0.1 }],
      carrier:     [{ f: 250, d: 0.08 }, { f: 300, d: 0.06 }, { f: 350, d: 0.06 }],
      submarine:   [{ f: 400, d: 0.08 }, { f: 350, d: 0.12 }], // sonar-like
    };

    const pattern = patterns[unitType] || patterns.infantry;
    let t = startTime;

    // Radio static envelope
    const staticBuf = this._makeNoiseBuffer(0.02);
    const staticSrc = ctx.createBufferSource();
    staticSrc.buffer = staticBuf;
    const staticHP = ctx.createBiquadFilter();
    staticHP.type = 'highpass';
    staticHP.frequency.value = 4000;
    const staticGain = ctx.createGain();
    staticGain.gain.setValueAtTime(0.03, startTime);
    staticGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.02);
    staticSrc.connect(staticHP); staticHP.connect(staticGain); staticGain.connect(this.sfxGain);
    staticSrc.start(startTime); staticSrc.stop(startTime + 0.02);

    // Play beep pattern
    for (const note of pattern) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = note.f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      // Bandpass to give it a radio quality
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = note.f;
      bp.Q.value = 5;

      osc.connect(bp); bp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + note.d);
      t += note.d + 0.02;
    }
  }

  _playCommandAck(unitType, startTime, baseFreqs) {
    const ctx = this.audioContext;
    // Play the base ack tones
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const duration = baseFreqs.length * 0.05;
    osc.frequency.setValueAtTime(baseFreqs[0], startTime);
    for (let i = 1; i < baseFreqs.length; i++) {
      osc.frequency.setValueAtTime(baseFreqs[i], startTime + i * 0.05);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + 0.05);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(startTime); osc.stop(startTime + duration + 0.05);

    // Then play unit-specific chirp
    this._playRadioChirp(unitType, startTime + duration + 0.06);
  }

  // ==================== OTHER SFX ====================

  playExplosion() {
    this._playGenericDeath();
  }

  playProduce() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(800, now + 0.1);
    osc.frequency.setValueAtTime(1000, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.4);
  }

  playBuild() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(400, now + 0.1);
    osc.frequency.setValueAtTime(500, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.3);
  }

  playAbility() {
    // Ability activation: rising tri-tone with shimmer
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.08);
    osc.frequency.setValueAtTime(900, now + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.35);
  }

  playError() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.25);
  }

  // ==================== VICTORY / DEFEAT STINGS ====================

  playVictoryFanfare() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Triumphant melody: C major arpeggio with harmony and drums
    const melody = [
      { f: 523, t: 0.0, d: 0.3 },   // C5
      { f: 659, t: 0.15, d: 0.3 },   // E5
      { f: 784, t: 0.3, d: 0.3 },    // G5
      { f: 1047, t: 0.5, d: 0.6 },   // C6 (held)
      { f: 784, t: 0.7, d: 0.2 },    // G5
      { f: 1047, t: 0.9, d: 0.8 },   // C6 (final, long)
    ];

    // Melody voice
    for (const note of melody) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.f;
      const gain = ctx.createGain();
      const t = now + note.t;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
      gain.gain.setValueAtTime(0.12, t + note.d * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + note.d);
    }

    // Harmony (thirds below melody, quieter)
    const harmony = [
      { f: 415, t: 0.0, d: 0.3 },   // Ab4 (actually E harmony)
      { f: 523, t: 0.15, d: 0.3 },   // C5
      { f: 659, t: 0.3, d: 0.3 },    // E5
      { f: 784, t: 0.5, d: 0.6 },    // G5
      { f: 659, t: 0.7, d: 0.2 },    // E5
      { f: 784, t: 0.9, d: 0.8 },    // G5
    ];

    for (const note of harmony) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = note.f;
      const gain = ctx.createGain();
      const t = now + note.t;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.03);
      gain.gain.setValueAtTime(0.06, t + note.d * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + note.d);
    }

    // Bass line
    const bass = [
      { f: 131, t: 0.0, d: 0.5 },   // C3
      { f: 196, t: 0.5, d: 0.5 },    // G3
      { f: 131, t: 0.9, d: 0.8 },    // C3
    ];
    for (const note of bass) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.f;
      const gain = ctx.createGain();
      const t = now + note.t;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + note.d);
    }

    // Snare hits
    for (const t of [0.0, 0.5, 0.9]) {
      this._playPercHit(now + t, 'snare', 0.08);
    }
  }

  playDefeatSting() {
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Somber descending melody in minor
    const melody = [
      { f: 440, t: 0.0, d: 0.4 },    // A4
      { f: 392, t: 0.35, d: 0.4 },    // G4
      { f: 349, t: 0.7, d: 0.4 },     // F4
      { f: 262, t: 1.1, d: 0.8 },     // C4 (low, sustained)
      { f: 247, t: 1.5, d: 1.0 },     // B3 (final, fading)
    ];

    for (const note of melody) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = note.f;
      const gain = ctx.createGain();
      const t = now + note.t;
      // Low pass to soften the sawtooth
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = note.f * 2;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gain.gain.setValueAtTime(0.08, t + note.d * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + note.d);
    }

    // Low drone underneath
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 65; // C2
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    droneGain.gain.setValueAtTime(0.08, now + 1.5);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    drone.connect(droneGain); droneGain.connect(this.sfxGain);
    drone.start(now); drone.stop(now + 2.5);

    // Timpani roll
    for (let i = 0; i < 4; i++) {
      this._playPercHit(now + 1.1 + i * 0.15, 'kick', 0.06);
    }
  }

  // ==================== MUSIC SYSTEM ====================

  startMenuMusic() {
    if (!this.initialized || !this.musicEnabled || this._currentMusicType === 'menu') return;
    this.stopAllMusic();
    this._currentMusicType = 'menu';
    this._menuMusic = this._createMenuMusicLoop();
  }

  startGameMusic() {
    if (!this.initialized || !this.musicEnabled || this._currentMusicType === 'game') return;
    this.stopAllMusic();
    this._currentMusicType = 'game';
    this._gameMusic = this._createGameMusicLoop();
    this._combatMusic = this._createCombatMusicLayer();
  }

  stopAllMusic() {
    // Cancel any queued speech synthesis voice lines
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ok */ }
    }
    this._currentMusicType = null;
    if (this._menuMusic) {
      this._stopMusicObj(this._menuMusic);
      this._menuMusic = null;
    }
    if (this._gameMusic) {
      this._stopMusicObj(this._gameMusic);
      this._gameMusic = null;
    }
    if (this._combatMusic) {
      this._stopMusicObj(this._combatMusic);
      this._combatMusic = null;
    }
    if (this._musicScheduler) {
      clearInterval(this._musicScheduler);
      this._musicScheduler = null;
    }
  }

  _stopMusicObj(obj) {
    if (!obj) return;
    try {
      if (obj.nodes) {
        for (const node of obj.nodes) {
          try { node.stop(); } catch (e) { /* already stopped */ }
          try { node.disconnect(); } catch (e) { /* ok */ }
        }
      }
      if (obj.gain) {
        try { obj.gain.disconnect(); } catch (e) { /* ok */ }
      }
      if (obj.interval) {
        clearInterval(obj.interval);
      }
    } catch (e) { /* cleanup errors are fine */ }
  }

  _createMenuMusicLoop() {
    // Military/patriotic feel: marchlike rhythm, simple brass-like melody
    // Key of C major, 4/4 time, ~100 BPM
    const ctx = this.audioContext;
    const bpm = 100;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const loopBars = 8;
    const loopDuration = barDuration * loopBars;

    const musicObj = { nodes: [], gain: null, interval: null };
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    gain.connect(this.musicGain);
    musicObj.gain = gain;

    const scheduleLoop = () => {
      if (this._currentMusicType !== 'menu') return;
      const now = ctx.currentTime;

      // Clear old node references (they've already stopped)
      musicObj.nodes = [];

      // Melody (brass-like square wave with low-pass)
      // "Taps"-inspired simple military melody
      const melodyNotes = [
        // Bar 1-2: rising motif
        { f: 262, t: 0, d: beatDuration },           // C4
        { f: 262, t: beatDuration, d: beatDuration * 0.5 },  // C4
        { f: 330, t: beatDuration * 1.5, d: beatDuration * 0.5 }, // E4
        { f: 392, t: beatDuration * 2, d: beatDuration * 2 },  // G4 (held)
        // Bar 3-4: call
        { f: 392, t: barDuration * 1, d: beatDuration },       // G4
        { f: 330, t: barDuration * 1 + beatDuration, d: beatDuration * 0.5 }, // E4
        { f: 392, t: barDuration * 1 + beatDuration * 1.5, d: beatDuration * 0.5 }, // G4
        { f: 523, t: barDuration * 1 + beatDuration * 2, d: beatDuration * 2 },  // C5 (held)
        // Bar 5-6: descend
        { f: 523, t: barDuration * 2, d: beatDuration },       // C5
        { f: 392, t: barDuration * 2 + beatDuration, d: beatDuration }, // G4
        { f: 330, t: barDuration * 2 + beatDuration * 2, d: beatDuration }, // E4
        { f: 262, t: barDuration * 2 + beatDuration * 3, d: beatDuration }, // C4
        // Bar 7-8: resolve
        { f: 294, t: barDuration * 3, d: beatDuration },       // D4
        { f: 330, t: barDuration * 3 + beatDuration, d: beatDuration }, // E4
        { f: 262, t: barDuration * 3 + beatDuration * 2, d: beatDuration * 2 }, // C4 (held)
        // Repeat variation bars 5-8
        { f: 392, t: barDuration * 4, d: beatDuration },       // G4
        { f: 440, t: barDuration * 4 + beatDuration, d: beatDuration }, // A4
        { f: 523, t: barDuration * 4 + beatDuration * 2, d: beatDuration * 2 }, // C5
        { f: 523, t: barDuration * 5, d: beatDuration * 0.5 }, // C5
        { f: 494, t: barDuration * 5 + beatDuration * 0.5, d: beatDuration * 0.5 }, // B4
        { f: 440, t: barDuration * 5 + beatDuration, d: beatDuration }, // A4
        { f: 392, t: barDuration * 5 + beatDuration * 2, d: beatDuration * 2 }, // G4
        // Final resolve
        { f: 330, t: barDuration * 6, d: beatDuration },       // E4
        { f: 294, t: barDuration * 6 + beatDuration, d: beatDuration }, // D4
        { f: 262, t: barDuration * 6 + beatDuration * 2, d: beatDuration * 2 }, // C4
        { f: 262, t: barDuration * 7, d: beatDuration * 4 },   // C4 (whole note)
      ];

      for (const note of melodyNotes) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = note.f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = note.f * 3;
        lp.Q.value = 1;
        const noteGain = ctx.createGain();
        const t = now + note.t;
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.07, t + 0.02);
        noteGain.gain.setValueAtTime(0.07, t + note.d * 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
        osc.connect(lp); lp.connect(noteGain); noteGain.connect(gain);
        osc.start(t); osc.stop(t + note.d + 0.01);
        musicObj.nodes.push(osc);
      }

      // Bass line (root notes, sine wave)
      const bassNotes = [
        { f: 131, t: 0, d: barDuration * 2 },           // C3
        { f: 196, t: barDuration * 1, d: barDuration },  // G3 (overlap ok - it's a layer)
        { f: 131, t: barDuration * 2, d: barDuration },  // C3
        { f: 147, t: barDuration * 3, d: barDuration * 0.5 }, // D3
        { f: 131, t: barDuration * 3 + barDuration * 0.5, d: barDuration * 0.5 }, // C3
        { f: 196, t: barDuration * 4, d: barDuration },  // G3
        { f: 175, t: barDuration * 5, d: barDuration },  // F3
        { f: 131, t: barDuration * 6, d: barDuration * 2 }, // C3
      ];

      for (const note of bassNotes) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = note.f;
        const noteGain = ctx.createGain();
        const t = now + note.t;
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.1, t + 0.02);
        noteGain.gain.setValueAtTime(0.1, t + note.d * 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
        osc.connect(noteGain); noteGain.connect(gain);
        osc.start(t); osc.stop(t + note.d + 0.01);
        musicObj.nodes.push(osc);
      }

      // March-style snare drum pattern (on beats 1 and 3, with flam on 1)
      for (let bar = 0; bar < loopBars; bar++) {
        const barStart = now + bar * barDuration;
        // Beat 1 (flam)
        this._playPercToNode(barStart, 'snare', 0.04, gain);
        this._playPercToNode(barStart + 0.03, 'snare', 0.06, gain);
        // Beat 3
        this._playPercToNode(barStart + beatDuration * 2, 'snare', 0.05, gain);
        // Off-beat hi-hat
        for (let beat = 0; beat < 4; beat++) {
          this._playPercToNode(barStart + beat * beatDuration + beatDuration * 0.5, 'hat', 0.03, gain);
        }
      }
    };

    // Schedule the first loop immediately
    scheduleLoop();
    // Re-schedule before each loop ends
    musicObj.interval = setInterval(() => {
      if (this._currentMusicType !== 'menu') {
        clearInterval(musicObj.interval);
        return;
      }
      scheduleLoop();
    }, loopDuration * 1000 - 200); // 200ms before loop end

    return musicObj;
  }

  _createGameMusicLoop() {
    // Tense, atmospheric ambient music for gameplay
    // Sparse, dark, uses low drones, occasional melodic fragments
    const ctx = this.audioContext;
    const bpm = 70;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const loopBars = 16;
    const loopDuration = barDuration * loopBars;

    const musicObj = { nodes: [], gain: null, interval: null };
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    gain.connect(this.musicGain);
    musicObj.gain = gain;

    const scheduleLoop = () => {
      if (this._currentMusicType !== 'game') return;
      const now = ctx.currentTime;
      musicObj.nodes = [];

      // Low drone pad (C2 + G2, slow pulsing)
      const droneDuration = loopDuration;
      for (const freq of [65, 98]) { // C2, G2
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Slow volume pulse via LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15; // Very slow
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain);

        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.06;
        lfoGain.connect(droneGain.gain);

        osc.connect(droneGain);
        droneGain.connect(gain);
        osc.start(now);
        osc.stop(now + droneDuration);
        lfo.start(now);
        lfo.stop(now + droneDuration);
        musicObj.nodes.push(osc, lfo);
      }

      // Sparse melodic fragments (minor key, piano-like triangle waves)
      // These appear every 2-4 bars for tension
      const fragments = [
        // Bar 2
        { f: 311, t: barDuration * 2, d: beatDuration * 2 },           // Eb4
        { f: 262, t: barDuration * 2 + beatDuration * 2.5, d: beatDuration * 1.5 }, // C4
        // Bar 5
        { f: 349, t: barDuration * 5, d: beatDuration * 1.5 },         // F4
        { f: 311, t: barDuration * 5 + beatDuration * 2, d: beatDuration * 2 }, // Eb4
        // Bar 8
        { f: 392, t: barDuration * 8, d: beatDuration * 2 },           // G4
        { f: 370, t: barDuration * 8 + beatDuration * 2.5, d: beatDuration * 1.5 }, // F#4
        { f: 311, t: barDuration * 8 + beatDuration * 4, d: beatDuration * 2 },  // Eb4
        // Bar 12
        { f: 262, t: barDuration * 12, d: beatDuration * 3 },          // C4
        { f: 247, t: barDuration * 12 + beatDuration * 3, d: beatDuration * 3 }, // B3
        // Bar 15
        { f: 311, t: barDuration * 15, d: beatDuration * 2 },          // Eb4
        { f: 262, t: barDuration * 15 + beatDuration * 2, d: beatDuration * 2 }, // C4
      ];

      for (const note of fragments) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = note.f;
        const noteGain = ctx.createGain();
        const t = now + note.t;
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.04, t + 0.05);
        noteGain.gain.setValueAtTime(0.035, t + note.d * 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
        osc.connect(noteGain); noteGain.connect(gain);
        osc.start(t); osc.stop(t + note.d + 0.01);
        musicObj.nodes.push(osc);
      }

      // Sparse bass movement (every 2 bars)
      const bassPattern = [
        { f: 65, t: 0, d: barDuration * 2 },             // C2
        { f: 62, t: barDuration * 2, d: barDuration * 2 },  // B1
        { f: 55, t: barDuration * 4, d: barDuration * 2 },  // A1
        { f: 62, t: barDuration * 6, d: barDuration * 2 },  // B1
        { f: 65, t: barDuration * 8, d: barDuration * 2 },  // C2
        { f: 73, t: barDuration * 10, d: barDuration * 2 }, // D2
        { f: 62, t: barDuration * 12, d: barDuration * 2 }, // B1
        { f: 65, t: barDuration * 14, d: barDuration * 2 }, // C2
      ];

      for (const note of bassPattern) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = note.f;
        const noteGain = ctx.createGain();
        const t = now + note.t;
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.08, t + 0.1);
        noteGain.gain.setValueAtTime(0.07, t + note.d * 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
        osc.connect(noteGain); noteGain.connect(gain);
        osc.start(t); osc.stop(t + note.d + 0.01);
        musicObj.nodes.push(osc);
      }

      // Very sparse tension percussion (low toms, every ~4 bars)
      for (const barOffset of [3, 7, 11, 15]) {
        const t = now + barOffset * barDuration;
        this._playPercToNode(t, 'kick', 0.04, gain);
        this._playPercToNode(t + beatDuration * 2, 'kick', 0.03, gain);
      }
    };

    scheduleLoop();
    musicObj.interval = setInterval(() => {
      if (this._currentMusicType !== 'game') {
        clearInterval(musicObj.interval);
        return;
      }
      scheduleLoop();
    }, loopDuration * 1000 - 200);

    return musicObj;
  }

  _createCombatMusicLayer() {
    // Aggressive layer that fades in during combat
    // Faster rhythm, dissonant, driving
    const ctx = this.audioContext;
    const bpm = 140;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const loopBars = 8;
    const loopDuration = barDuration * loopBars;

    const musicObj = { nodes: [], gain: null, interval: null };
    const gain = ctx.createGain();
    gain.gain.value = 0; // Starts silent, controlled by update()
    gain.connect(this.musicGain);
    musicObj.gain = gain;

    const scheduleLoop = () => {
      if (this._currentMusicType !== 'game') return;
      const now = ctx.currentTime;
      musicObj.nodes = [];

      // Driving bass (8th notes, alternating root and fifth)
      for (let bar = 0; bar < loopBars; bar++) {
        for (let eighth = 0; eighth < 8; eighth++) {
          const t = now + bar * barDuration + eighth * (beatDuration / 2);
          const freq = eighth % 2 === 0 ? 55 : 82; // A1 / E2
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 200;
          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0, t);
          noteGain.gain.linearRampToValueAtTime(0.06, t + 0.01);
          noteGain.gain.exponentialRampToValueAtTime(0.001, t + beatDuration / 2 - 0.01);
          osc.connect(lp); lp.connect(noteGain); noteGain.connect(gain);
          osc.start(t); osc.stop(t + beatDuration / 2);
          musicObj.nodes.push(osc);
        }
      }

      // Aggressive snare on every beat
      for (let bar = 0; bar < loopBars; bar++) {
        for (let beat = 0; beat < 4; beat++) {
          const t = now + bar * barDuration + beat * beatDuration;
          if (beat % 2 === 1) {
            this._playPercToNode(t, 'snare', 0.06, gain);
          } else {
            this._playPercToNode(t, 'kick', 0.05, gain);
          }
          // Double-time hat
          this._playPercToNode(t + beatDuration * 0.25, 'hat', 0.02, gain);
          this._playPercToNode(t + beatDuration * 0.75, 'hat', 0.02, gain);
        }
      }

      // Staccato dissonant stabs every 2 bars
      const stabs = [
        { f: 220, t: barDuration * 1 + beatDuration * 3, d: beatDuration * 0.5 },
        { f: 233, t: barDuration * 3 + beatDuration * 3, d: beatDuration * 0.5 }, // Bb3
        { f: 262, t: barDuration * 5 + beatDuration * 3, d: beatDuration * 0.5 },
        { f: 247, t: barDuration * 7 + beatDuration * 3, d: beatDuration * 0.5 }, // B3
      ];

      for (const stab of stabs) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = stab.f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = stab.f * 2;
        const noteGain = ctx.createGain();
        const t = now + stab.t;
        noteGain.gain.setValueAtTime(0, t);
        noteGain.gain.linearRampToValueAtTime(0.05, t + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + stab.d);
        osc.connect(lp); lp.connect(noteGain); noteGain.connect(gain);
        osc.start(t); osc.stop(t + stab.d + 0.01);
        musicObj.nodes.push(osc);
      }
    };

    scheduleLoop();
    musicObj.interval = setInterval(() => {
      if (this._currentMusicType !== 'game') {
        clearInterval(musicObj.interval);
        return;
      }
      scheduleLoop();
    }, loopDuration * 1000 - 200);

    return musicObj;
  }

  // ==================== AMBIENT ENVIRONMENTAL SOUNDS ====================
  // (Original startAmbient/stopAmbient removed; replaced by GD-107 enhanced versions below)

  _startWindAmbient() {
    // Constant filtered noise loop for wind
    const ctx = this.audioContext;
    const duration = 4; // re-schedule every 4 seconds

    const obj = { nodes: [], gain: null, interval: null };
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    gain.connect(this.ambientGain);
    obj.gain = gain;

    const scheduleWind = () => {
      if (!this._ambientWind) return;
      const now = ctx.currentTime;

      // Long noise buffer with slow amplitude modulation for gusts
      const bufferLen = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Generate noise with slow amplitude variation
      let amp = 0.5;
      for (let i = 0; i < bufferLen; i++) {
        // Slowly vary amplitude for gusting effect
        amp += (Math.random() - 0.5) * 0.001;
        amp = Math.max(0.2, Math.min(0.8, amp));
        data[i] = (Math.random() * 2 - 1) * amp;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Low pass for wind-like quality
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      lp.Q.value = 0.5;

      // High pass to remove rumble
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 80;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.08;

      noise.connect(lp);
      lp.connect(hp);
      hp.connect(noiseGain);
      noiseGain.connect(gain);

      const now2 = ctx.currentTime;
      noise.start(now2);
      noise.stop(now2 + duration + 0.1);

      // Keep ref so we can stop
      obj.nodes = [noise];
    };

    this._ambientWind = obj;
    scheduleWind();
    obj.interval = setInterval(() => {
      if (!this._ambientWind) {
        clearInterval(obj.interval);
        return;
      }
      scheduleWind();
    }, (duration - 0.1) * 1000);
  }

  _startDistantArtillery() {
    // Occasional low booms at random intervals
    const ctx = this.audioContext;
    const obj = { nodes: [], gain: null, interval: null };
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    gain.connect(this.ambientGain);
    obj.gain = gain;

    const scheduleRumble = () => {
      if (!this._ambientArtillery) return;
      const now = ctx.currentTime;

      // Random delay 3-8 seconds
      const delay = 3 + Math.random() * 5;
      const t = now + delay;

      // Low distant boom
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      // Subtle noise rumble
      const noiseLen = 0.4;
      const buffer = this._makeNoiseBuffer(noiseLen);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 200;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(0.03, t + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);

      osc.connect(oscGain); oscGain.connect(gain);
      noise.connect(lp); lp.connect(noiseGain); noiseGain.connect(gain);

      osc.start(t); osc.stop(t + 0.5);
      noise.start(t); noise.stop(t + noiseLen);

      obj.nodes = [osc, noise];
    };

    this._ambientArtillery = obj;
    scheduleRumble();
    // Schedule new rumble at random intervals
    obj.interval = setInterval(() => {
      if (!this._ambientArtillery) {
        clearInterval(obj.interval);
        return;
      }
      scheduleRumble();
    }, 5000 + Math.random() * 3000);
  }

  // ==================== UTILITY ====================

  _makeNoiseBuffer(duration) {
    const ctx = this.audioContext;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    return buffer;
  }

  _playPercHit(time, type, volume) {
    this._playPercToNode(time, type, volume, this.sfxGain);
  }

  _playPercToNode(time, type, volume, destNode) {
    const ctx = this.audioContext;
    if (type === 'snare') {
      // Snare: short noise + tone
      const buf = this._makeNoiseBuffer(0.08);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      noise.connect(hp); hp.connect(g); g.connect(destNode);
      noise.start(time); noise.stop(time + 0.08);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);
      const og = ctx.createGain();
      og.gain.setValueAtTime(volume * 0.5, time);
      og.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(og); og.connect(destNode);
      osc.start(time); osc.stop(time + 0.05);
    } else if (type === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g); g.connect(destNode);
      osc.start(time); osc.stop(time + 0.15);
    } else if (type === 'hat') {
      const buf = this._makeNoiseBuffer(0.03);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      noise.connect(hp); hp.connect(g); g.connect(destNode);
      noise.start(time); noise.stop(time + 0.03);
    }
  }

  // ==================== GD-107: VOICE RESPONSES ====================
  // Uses Web Audio SpeechSynthesis API for unit voice lines

  playVoiceLine(category) {
    if (!this.enabled || !window.speechSynthesis) return;

    // Throttle voice lines
    const now = Date.now();
    if (this._lastVoiceTime && now - this._lastVoiceTime < 2000) return;
    this._lastVoiceTime = now;

    const lines = {
      move: ['Moving out', 'Yes sir', 'Copy that', 'On the move', 'Roger that'],
      attack: ['Engaging', 'Target acquired', 'Weapons free', 'Taking the shot', 'Fire at will'],
      select: ['Ready', 'Standing by', 'Awaiting orders', 'At your service', 'Reporting'],
      underfire: ['Under fire!', 'Taking hits!', 'We need support!', 'Incoming!', 'Contact!'],
      spotted: ['Enemy spotted', 'Tango in sight', 'Hostile detected', 'Eyes on enemy', 'Contact ahead']
    };

    const pool = lines[category];
    if (!pool) return;
    const text = pool[Math.floor(Math.random() * pool.length)];

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
      utterance.pitch = 0.8 + Math.random() * 0.4;
      utterance.volume = this.volume * 0.6;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // SpeechSynthesis not available
    }
  }

  // ==================== GD-107: ENHANCED AMBIENT SOUNDS ====================

  startAmbient() {
    if (!this.initialized || !this.audioContext) return;
    this.stopAmbient();

    const ctx = this.audioContext;

    // Wind (filtered brown noise)
    this._ambientWind = this._createWindAmbient(ctx);

    // Bird chirps (periodic oscillator chirps)
    this._ambientBirds = this._createBirdAmbient(ctx);

    // Distant artillery rumble
    this._ambientArtillery = this._createArtilleryAmbient(ctx);
  }

  _createWindAmbient(ctx) {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Brown noise (random walk)
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    source.connect(lp);
    lp.connect(gain);
    gain.connect(this.ambientGain);
    source.start();

    return { source, gain, nodes: [source] };
  }

  _createBirdAmbient(ctx) {
    const obj = { nodes: [], interval: null };
    obj.interval = setInterval(() => {
      if (!this.enabled || this.audioContext?.state === 'closed') {
        clearInterval(obj.interval);
        return;
      }
      // Random bird chirp
      if (Math.random() > 0.6) return;
      const now = ctx.currentTime;
      const freq = 2000 + Math.random() * 2000;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start(now);
      osc.stop(now + 0.15);
    }, 3000 + Math.random() * 5000);

    return obj;
  }

  _createArtilleryAmbient(ctx) {
    const obj = { nodes: [], interval: null };
    obj.interval = setInterval(() => {
      if (!this.enabled || this.audioContext?.state === 'closed') {
        clearInterval(obj.interval);
        return;
      }
      if (Math.random() > 0.4) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40 + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start(now);
      osc.stop(now + 0.6);
    }, 8000 + Math.random() * 12000);

    return obj;
  }

  stopAmbient() {
    const stops = [this._ambientWind, this._ambientBirds, this._ambientArtillery];
    for (const obj of stops) {
      if (!obj) continue;
      if (obj.interval) clearInterval(obj.interval);
      if (obj.nodes) {
        for (const n of obj.nodes) {
          try { n.stop(); } catch (e) { /* ok */ }
          try { n.disconnect(); } catch (e) { /* ok */ }
        }
      }
      if (obj.source) {
        try { obj.source.stop(); } catch (e) { /* ok */ }
        try { obj.source.disconnect(); } catch (e) { /* ok */ }
      }
      if (obj.gain) {
        try { obj.gain.disconnect(); } catch (e) { /* ok */ }
      }
    }
    this._ambientWind = null;
    this._ambientBirds = null;
    this._ambientArtillery = null;
  }
}
