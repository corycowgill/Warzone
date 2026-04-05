/**
 * SFXLibrary - Enhanced procedural sound effects for all game events.
 * Each method generates a realistic sound using Web Audio API synthesis.
 */
export class SFXLibrary {
  constructor(audioContext, outputNode) {
    this.ctx = audioContext;
    this.output = outputNode;

    // Pre-generate noise buffers for performance
    this._whiteNoise = this._createNoiseBuffer(1.0);
    this._pinkNoise = this._createNoiseBuffer(0.5);
  }

  // ==================== WEAPON SOUNDS ====================

  rifle(volume = 0.06) {
    const t = this.ctx.currentTime;
    // Crack + body
    this._noise(t, 0.04, volume, 3000, 8000);
    this._tone(t, 0.02, volume * 0.5, 800, 200);
    // Tail
    this._noise(t + 0.04, 0.08, volume * 0.3, 500, 2000);
  }

  machineGun(volume = 0.05) {
    const t = this.ctx.currentTime;
    this._noise(t, 0.03, volume, 2000, 6000);
    this._tone(t, 0.015, volume * 0.4, 600, 150);
    this._noise(t + 0.03, 0.05, volume * 0.2, 400, 1500);
  }

  tankCannon(volume = 0.1) {
    const t = this.ctx.currentTime;
    // Big boom
    this._tone(t, 0.05, volume, 120, 30);
    this._tone(t, 0.03, volume * 0.6, 300, 80);
    this._noise(t, 0.06, volume * 0.5, 200, 3000);
    // Reverb tail
    this._noise(t + 0.06, 0.3, volume * 0.15, 100, 800);
  }

  artilleryFire(volume = 0.12) {
    const t = this.ctx.currentTime;
    // Initial blast
    this._tone(t, 0.08, volume, 80, 20);
    this._noise(t, 0.1, volume * 0.7, 150, 4000);
    // Traveling whoosh
    this._noise(t + 0.1, 0.4, volume * 0.1, 200, 1000);
  }

  navalGun(volume = 0.1) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.1, volume, 60, 15);
    this._tone(t, 0.06, volume * 0.5, 200, 50);
    this._noise(t, 0.12, volume * 0.6, 100, 2000);
    this._noise(t + 0.12, 0.5, volume * 0.1, 50, 400);
  }

  antiAir(volume = 0.07) {
    const t = this.ctx.currentTime;
    // Rapid burst
    for (let i = 0; i < 3; i++) {
      const dt = i * 0.05;
      this._noise(t + dt, 0.025, volume, 3000, 9000);
      this._tone(t + dt, 0.015, volume * 0.3, 500, 200);
    }
  }

  // ==================== EXPLOSION SOUNDS ====================

  smallExplosion(volume = 0.08) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.06, volume, 150, 30);
    this._noise(t, 0.08, volume * 0.7, 200, 5000);
    this._noise(t + 0.08, 0.15, volume * 0.2, 100, 1000);
  }

  largeExplosion(volume = 0.15) {
    const t = this.ctx.currentTime;
    // Core detonation
    this._tone(t, 0.12, volume, 60, 10);
    this._tone(t, 0.08, volume * 0.6, 200, 40);
    this._noise(t, 0.15, volume * 0.8, 100, 6000);
    // Debris
    this._noise(t + 0.15, 0.3, volume * 0.3, 200, 3000);
    // Rumble tail
    this._tone(t + 0.2, 0.5, volume * 0.1, 40, 15);
  }

  buildingDestroyed(volume = 0.12) {
    const t = this.ctx.currentTime;
    // Structural collapse
    this._tone(t, 0.15, volume, 50, 15);
    this._noise(t, 0.2, volume * 0.6, 80, 3000);
    // Crumble sounds
    for (let i = 0; i < 4; i++) {
      const delay = 0.1 + Math.random() * 0.4;
      this._noise(t + delay, 0.1, volume * 0.15, 500, 4000);
    }
    this._noise(t + 0.3, 0.5, volume * 0.1, 50, 600);
  }

  // ==================== VEHICLE SOUNDS ====================

  engineStart(volume = 0.04) {
    const t = this.ctx.currentTime;
    // Starter motor
    for (let i = 0; i < 3; i++) {
      this._tone(t + i * 0.15, 0.1, volume * 0.3, 150 + i * 20, 200 + i * 30);
    }
    // Engine catch
    this._tone(t + 0.45, 0.3, volume, 80, 120);
  }

  engineIdle(volume = 0.02) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 55;

    lfo.type = 'sine';
    lfo.frequency.value = 8;
    lfoGain.gain.value = 3;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.output);

    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.5);
    lfo.stop(t + 0.5);
  }

  // ==================== UI SOUNDS ====================

  uiClick(volume = 0.03) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.03, volume, 1200, 800);
  }

  uiHover(volume = 0.015) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.02, volume, 1800, 1400);
  }

  uiConfirm(volume = 0.04) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.05, volume, 800, 1200);
    this._tone(t + 0.06, 0.05, volume, 1200, 1600);
  }

  uiCancel(volume = 0.03) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.05, volume, 600, 300);
  }

  uiAlert(volume = 0.05) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.1, volume, 800, 800);
    this._tone(t + 0.12, 0.1, volume, 800, 800);
  }

  // ==================== BUILDING SOUNDS ====================

  buildingPlace(volume = 0.05) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.08, volume, 200, 400);
    this._noise(t, 0.06, volume * 0.3, 500, 3000);
  }

  buildingComplete(volume = 0.06) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.1, volume, 400, 800);
    this._tone(t + 0.1, 0.1, volume, 600, 1000);
    this._tone(t + 0.2, 0.15, volume, 800, 800);
  }

  // ==================== UNIT SOUNDS ====================

  unitTrained(volume = 0.04) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.08, volume, 600, 900);
    this._tone(t + 0.1, 0.06, volume * 0.7, 900, 1200);
  }

  unitDeath(unitType, volume = 0.06) {
    const t = this.ctx.currentTime;
    if (unitType === 'infantry') {
      this._noise(t, 0.15, volume * 0.5, 200, 2000);
      this._tone(t, 0.08, volume * 0.3, 200, 80);
    } else {
      // Vehicle death = explosion
      this.smallExplosion(volume);
    }
  }

  // ==================== ABILITY SOUNDS ====================

  abilityActivate(volume = 0.06) {
    const t = this.ctx.currentTime;
    this._tone(t, 0.03, volume, 500, 2000);
    this._tone(t + 0.03, 0.1, volume * 0.5, 2000, 1000);
  }

  superweaponCharge(volume = 0.08) {
    const t = this.ctx.currentTime;
    // Rising tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 2);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(t);
    osc.stop(t + 2.1);
  }

  superweaponFire(volume = 0.2) {
    const t = this.ctx.currentTime;
    // Massive explosion
    this._tone(t, 0.2, volume, 40, 8);
    this._tone(t, 0.15, volume * 0.5, 100, 20);
    this._noise(t, 0.3, volume * 0.7, 50, 8000);
    this._noise(t + 0.3, 0.8, volume * 0.2, 30, 500);
  }

  // ==================== HELPERS ====================

  _tone(startTime, duration, volume, freqStart, freqEnd) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  _noise(startTime, duration, volume, filterLow, filterHigh) {
    const source = this.ctx.createBufferSource();
    source.buffer = this._whiteNoise;
    const gain = this.ctx.createGain();
    const bandpass = this.ctx.createBiquadFilter();

    bandpass.type = 'bandpass';
    bandpass.frequency.value = (filterLow + filterHigh) / 2;
    bandpass.Q.value = 0.5;

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.output);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }

  _createNoiseBuffer(seconds) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  dispose() {
    this._whiteNoise = null;
    this._pinkNoise = null;
  }
}
