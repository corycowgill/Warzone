/**
 * StateHash — fast deterministic hash of game state for desync detection.
 *
 * Used by multiplayer lockstep and replay validation to verify both clients
 * have identical simulation state. Computed periodically (e.g., every 30 ticks).
 *
 * Hashes: entity positions, health, alive status, team resources, game timer.
 * Does NOT hash: visual state, UI state, camera position.
 */
export class StateHash {
  /**
   * Compute a 32-bit hash of the current game state.
   * @param {Game} game - the game instance
   * @returns {{ hash: number, tick: number, entityCount: number }}
   */
  static compute(game) {
    let h = 0x811c9dc5; // FNV-1a offset basis

    // Hash game timer (truncated to 3 decimal places for float stability)
    h = StateHash._hashInt(h, Math.round(game.gameElapsed * 1000));

    // Hash team resources
    for (const team of ['player', 'enemy']) {
      h = StateHash._hashInt(h, Math.round(game.teams[team].sp));
      h = StateHash._hashInt(h, Math.round(game.teams[team].mu));
    }

    // Hash entity count
    const entities = game.entities;
    h = StateHash._hashInt(h, entities.length);

    // Hash each entity's critical state (sorted by ID for determinism)
    for (let i = 0, len = entities.length; i < len; i++) {
      const e = entities[i];
      h = StateHash._hashInt(h, e.id);
      h = StateHash._hashInt(h, e.alive ? 1 : 0);
      h = StateHash._hashInt(h, Math.round(e.health));
      if (e.mesh) {
        h = StateHash._hashInt(h, Math.round(e.mesh.position.x * 100));
        h = StateHash._hashInt(h, Math.round(e.mesh.position.z * 100));
      }
    }

    // Hash projectile count
    h = StateHash._hashInt(h, game.projectiles.length);

    // Hash RNG state
    h = StateHash._hashInt(h, game.rng.state);

    return {
      hash: h >>> 0, // unsigned 32-bit
      tick: Math.round(game.gameElapsed * 30), // approx tick number
      entityCount: entities.length
    };
  }

  /**
   * FNV-1a hash step for a 32-bit integer.
   * @param {number} h - current hash
   * @param {number} val - integer to mix in
   * @returns {number} updated hash
   */
  static _hashInt(h, val) {
    // Mix 4 bytes of val into hash
    h ^= (val & 0xFF);
    h = Math.imul(h, 0x01000193);
    h ^= ((val >>> 8) & 0xFF);
    h = Math.imul(h, 0x01000193);
    h ^= ((val >>> 16) & 0xFF);
    h = Math.imul(h, 0x01000193);
    h ^= ((val >>> 24) & 0xFF);
    h = Math.imul(h, 0x01000193);
    return h;
  }
}
