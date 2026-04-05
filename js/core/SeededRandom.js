/**
 * SeededRandom — deterministic PRNG for game simulation.
 * Uses mulberry32 algorithm: fast, good distribution, 32-bit state.
 *
 * Usage:
 *   const rng = new SeededRandom(12345);
 *   rng.next()        // 0.0 to 1.0 (like Math.random())
 *   rng.nextInt(10)    // 0 to 9
 *   rng.nextRange(5, 15) // 5.0 to 15.0
 *   rng.pick(array)   // random element from array
 */
export class SeededRandom {
  constructor(seed) {
    this._state = seed | 0;
    this._initialSeed = seed | 0;
  }

  /** Get the current seed (for saving/restoring state) */
  get seed() { return this._initialSeed; }
  get state() { return this._state; }
  set state(s) { this._state = s | 0; }

  /** Reset to initial seed */
  reset() { this._state = this._initialSeed; }

  /** Returns float in [0, 1) — drop-in replacement for Math.random() */
  next() {
    let t = this._state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns integer in [0, max) */
  nextInt(max) {
    return (this.next() * max) | 0;
  }

  /** Returns float in [min, max) */
  nextRange(min, max) {
    return min + this.next() * (max - min);
  }

  /** Pick a random element from an array */
  pick(array) {
    return array[this.nextInt(array.length)];
  }

  /** Generate a seed from current time (for new games) */
  static generateSeed() {
    return (Date.now() ^ (Math.random() * 0xFFFFFFFF)) | 0;
  }
}
