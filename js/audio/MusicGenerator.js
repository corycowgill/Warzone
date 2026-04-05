/**
 * MusicGenerator - Procedural background music system.
 * Generates ambient/cinematic music tracks using Web Audio API synthesis.
 * Creates menu music, battle music, combat intensity layers, and victory/defeat stings.
 */
export class MusicGenerator {
  constructor(audioContext, outputNode) {
    this.ctx = audioContext;
    this.output = outputNode;
    this.isPlaying = false;
    this.currentTrack = null;
    this.bpm = 90;
    this.key = 'Am'; // A minor - military feel
    this.schedulerInterval = null;
    this.nextNoteTime = 0;
    this.currentBeat = 0;

    // Scales for different moods
    this.scales = {
      minor: [0, 2, 3, 5, 7, 8, 10],      // Natural minor
      dorian: [0, 2, 3, 5, 7, 9, 10],      // Dorian mode - slightly brighter
      phrygian: [0, 1, 3, 5, 7, 8, 10],    // Phrygian - dark, exotic
      harmonic: [0, 2, 3, 5, 7, 8, 11],     // Harmonic minor - dramatic
      pentatonic: [0, 3, 5, 7, 10],          // Minor pentatonic
    };

    // Base note frequencies (A = 220Hz for military gravitas)
    this.baseFreq = 110; // A2

    // Active nodes for cleanup
    this._activeNodes = [];
    this._scheduledEvents = [];
  }

  /**
   * Start menu ambient music - slow, atmospheric pads
   */
  startMenuMusic() {
    this.stop();
    this.isPlaying = true;
    this.currentTrack = 'menu';
    this.bpm = 60;

    this._playMenuLoop();
  }

  _playMenuLoop() {
    if (!this.isPlaying || this.currentTrack !== 'menu') return;

    const now = this.ctx.currentTime;

    // Deep pad chord - Am
    this._playPad([220, 261.63, 329.63], now, 8, 0.06);

    // Subtle bass drone
    this._playDrone(110, now, 8, 0.04);

    // Occasional high shimmer
    if (Math.random() < 0.3) {
      const delay = Math.random() * 4;
      this._playShimmer(880 + Math.random() * 440, now + delay, 2, 0.015);
    }

    // Schedule next loop
    const id = setTimeout(() => this._playMenuLoop(), 7500);
    this._scheduledEvents.push(id);
  }

  /**
   * Start in-game background music - moderate tempo, evolving layers
   */
  startGameMusic() {
    this.stop();
    this.isPlaying = true;
    this.currentTrack = 'game';
    this.bpm = 85;
    this.currentBeat = 0;

    this._playGameLoop();
  }

  _playGameLoop() {
    if (!this.isPlaying || this.currentTrack !== 'game') return;

    const now = this.ctx.currentTime;
    const beatLen = 60 / this.bpm;

    // 4-bar phrase
    for (let bar = 0; bar < 4; bar++) {
      const barStart = now + bar * 4 * beatLen;

      // Bass line - root movement
      const bassNotes = [0, 0, 5, 3]; // Am - Am - Dm - Cm
      const bassFreq = this._noteToFreq(bassNotes[bar], -1);
      this._playBass(bassFreq, barStart, beatLen * 2, 0.05);
      this._playBass(bassFreq * 1.5, barStart + beatLen * 2, beatLen * 2, 0.03);

      // Pad chord progression
      const chords = [
        [0, 3, 7],    // Am
        [0, 3, 7],    // Am
        [5, 8, 12],   // Dm
        [3, 7, 10],   // C
      ];
      const padFreqs = chords[bar].map(n => this._noteToFreq(n, 1));
      this._playPad(padFreqs, barStart, beatLen * 4, 0.025);

      // Rhythmic pulse on beats 1 and 3
      for (let beat = 0; beat < 4; beat++) {
        const t = barStart + beat * beatLen;
        if (beat === 0 || beat === 2) {
          this._playPercHit(t, 0.03, 80);
        }
        // Hi-hat on all beats
        this._playPercHit(t, 0.015, 8000 + Math.random() * 2000);
      }

      // Melodic motif (random from scale, sparse)
      if (Math.random() < 0.5) {
        const melodyBeat = Math.floor(Math.random() * 4);
        const scale = this.scales.minor;
        const note = scale[Math.floor(Math.random() * scale.length)];
        const freq = this._noteToFreq(note + 12, 1); // One octave up
        this._playMelody(freq, barStart + melodyBeat * beatLen, beatLen * 0.8, 0.02);
      }
    }

    // Schedule next phrase
    const phraseLen = 4 * 4 * (60 / this.bpm) * 1000;
    const id = setTimeout(() => this._playGameLoop(), phraseLen - 200);
    this._scheduledEvents.push(id);
  }

  /**
   * Start combat music - intense, faster, more percussion
   */
  startCombatMusic() {
    this.stop();
    this.isPlaying = true;
    this.currentTrack = 'combat';
    this.bpm = 120;

    this._playCombatLoop();
  }

  _playCombatLoop() {
    if (!this.isPlaying || this.currentTrack !== 'combat') return;

    const now = this.ctx.currentTime;
    const beatLen = 60 / this.bpm;

    for (let bar = 0; bar < 4; bar++) {
      const barStart = now + bar * 4 * beatLen;

      // Heavy bass hits
      const bassPattern = [0, -1, 5, 3];
      if (bassPattern[bar] >= 0) {
        this._playBass(this._noteToFreq(bassPattern[bar], -1), barStart, beatLen, 0.08);
      }

      // Aggressive pads (power chords)
      const freq = this._noteToFreq(bassPattern[bar] >= 0 ? bassPattern[bar] : 0, 0);
      this._playPad([freq, freq * 1.5, freq * 2], barStart, beatLen * 3.5, 0.035);

      // Driving percussion
      for (let beat = 0; beat < 4; beat++) {
        const t = barStart + beat * beatLen;
        // Kick on every beat
        this._playPercHit(t, 0.05, 60);
        // Snare on 2 and 4
        if (beat === 1 || beat === 3) {
          this._playPercHit(t, 0.04, 200);
          this._playNoise(t, beatLen * 0.15, 0.03);
        }
        // Hi-hat 8ths
        this._playPercHit(t, 0.02, 9000);
        this._playPercHit(t + beatLen * 0.5, 0.015, 11000);
      }

      // Brass-like stabs
      if (bar === 0 || bar === 2) {
        const stab = this._noteToFreq(0, 1);
        this._playBrass(stab, barStart, beatLen * 0.3, 0.04);
      }
    }

    const phraseLen = 4 * 4 * (60 / this.bpm) * 1000;
    const id = setTimeout(() => this._playCombatLoop(), phraseLen - 200);
    this._scheduledEvents.push(id);
  }

  /**
   * Play victory sting
   */
  playVictory() {
    this.stop();
    const now = this.ctx.currentTime;
    // Triumphant major chord arpeggio
    const notes = [0, 4, 7, 12, 16, 19, 24];
    notes.forEach((n, i) => {
      const freq = 220 * Math.pow(2, n / 12);
      this._playMelody(freq, now + i * 0.15, 1.5, 0.04);
    });
    // Final major chord sustain
    this._playPad([220, 277.18, 329.63, 440], now + 1.2, 4, 0.05);
  }

  /**
   * Play defeat sting
   */
  playDefeat() {
    this.stop();
    const now = this.ctx.currentTime;
    // Descending minor progression
    const notes = [12, 10, 7, 3, 0, -5];
    notes.forEach((n, i) => {
      const freq = 220 * Math.pow(2, n / 12);
      this._playMelody(freq, now + i * 0.3, 1.0, 0.035);
    });
    // Low rumble
    this._playDrone(55, now + 1.5, 3, 0.04);
  }

  stop() {
    this.isPlaying = false;
    this.currentTrack = null;
    // Cancel scheduled events
    this._scheduledEvents.forEach(id => clearTimeout(id));
    this._scheduledEvents = [];
    // Stop active nodes
    const now = this.ctx.currentTime;
    this._activeNodes.forEach(node => {
      try {
        if (node.gain) {
          node.gain.gain.cancelScheduledValues(now);
          node.gain.gain.setValueAtTime(node.gain.gain.value, now);
          node.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        }
        if (node.source) {
          node.source.stop(now + 0.15);
        }
      } catch (e) { /* already stopped */ }
    });
    this._activeNodes = [];
  }

  dispose() {
    this.stop();
  }

  // ============ SYNTHESIS PRIMITIVES ============

  _noteToFreq(semitone, octave = 0) {
    return this.baseFreq * Math.pow(2, octave) * Math.pow(2, semitone / 12);
  }

  _playPad(frequencies, startTime, duration, volume) {
    frequencies.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 10; // Slight detune for width

      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.5;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);

      this._activeNodes.push({ source: osc, gain });
    });
  }

  _playBass(freq, startTime, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.05);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    this._activeNodes.push({ source: osc, gain });
  }

  _playDrone(freq, startTime, duration, volume) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.002; // Slight detune for beating

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.output);

    osc1.start(startTime);
    osc1.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.1);

    this._activeNodes.push({ source: osc1, gain });
    this._activeNodes.push({ source: osc2, gain });
  }

  _playShimmer(freq, startTime, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    this._activeNodes.push({ source: osc, gain });
  }

  _playMelody(freq, startTime, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, startTime);
    filter.frequency.exponentialRampToValueAtTime(500, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume * 0.7, startTime + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    this._activeNodes.push({ source: osc, gain });
  }

  _playBrass(freq, startTime, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(volume * 0.5, startTime + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    this._activeNodes.push({ source: osc, gain });
  }

  _playPercHit(startTime, volume, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = freq < 200 ? 'sine' : 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    if (freq < 200) {
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, startTime + 0.1);
    }

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + (freq < 200 ? 0.15 : 0.05));

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + 0.2);

    this._activeNodes.push({ source: osc, gain });
  }

  _playNoise(startTime, duration, volume) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.value = 2000;

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);

    this._activeNodes.push({ source, gain });
  }
}
