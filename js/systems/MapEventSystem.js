import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export class MapEventSystem {
  constructor(game) {
    this.game = game;

    // Map event timer state
    this._mapEventTimer = 0;
    this._mapEventInterval = 60; // seconds between events

    // Tutorial state
    this._tutorialStep = 0;
    this._tutorialTimer = 0;
    this._tutorialShown = false;
  }

  update(delta) {
    // Dynamic map events
    this._mapEventTimer += delta;
    if (this._mapEventTimer >= this._mapEventInterval) {
      this._mapEventTimer = 0;
      this.triggerMapEvent();
    }

    // Tutorial tips for new players
    if (!this._tutorialShown && this.game.mode !== 'SPECTATE') {
      this.updateTutorial(delta);
    }
  }

  triggerMapEvent() {
    const events = ['supply_drop', 'resource_surge', 'reinforcements'];
    const event = events[Math.floor(this.game.rng.next() * events.length)];
    const mapSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;

    switch (event) {
      case 'supply_drop': {
        const x = 60 + this.game.rng.next() * (mapSize - 120);
        const z = 60 + this.game.rng.next() * (mapSize - 120);
        if (this.game.terrain && this.game.terrain.isWalkable(x, z)) {
          const reward = 150 + Math.floor(this.game.rng.next() * 100);
          this.game.createSupplyCache(x, z, reward, 0x44ccff, 0x00ffcc);
          if (this.game.uiManager && this.game.uiManager.hud) {
            this.game.uiManager.hud.showNotification(`Supply drop detected! (${reward} SP)`, '#00ffcc');
          }
          if (this.game.soundManager) this.game.soundManager.play('produce');
        }
        break;
      }
      case 'resource_surge': {
        // Both teams get a small SP bonus
        const bonus = 50 + Math.floor(this.game.rng.next() * 50);
        this.game.teams.player.sp += bonus;
        this.game.teams.enemy.sp += bonus;
        if (this.game.uiManager && this.game.uiManager.hud) {
          this.game.uiManager.hud.showNotification(`Resource surge! +${bonus} SP`, '#88ff88');
        }
        break;
      }
      case 'reinforcements': {
        // Random free infantry for both teams near their HQ
        for (const team of ['player', 'enemy']) {
          const hq = this.game.getHQ(team);
          if (!hq) continue;
          const hqPos = hq.getPosition();
          const pos = new THREE.Vector3(
            hqPos.x + (this.game.rng.next() - 0.5) * 20,
            0,
            hqPos.z + (this.game.rng.next() - 0.5) * 20
          );
          this.game.createUnit('infantry', team, pos);
        }
        if (this.game.uiManager && this.game.uiManager.hud) {
          this.game.uiManager.hud.showNotification('Reinforcements arrived!', '#88ff88');
        }
        break;
      }
    }
  }

  updateTutorial(delta) {
    this._tutorialTimer += delta;
    const tips = [
      { time: 5, msg: 'Select units with left-click or drag. Right-click to move.', color: '#88ccff' },
      { time: 15, msg: 'Press A for attack-move. Press B to open the build menu.', color: '#88ccff' },
      { time: 30, msg: 'Press V to cycle stance (Aggressive/Defensive/Hold Fire).', color: '#ffcc00' },
      { time: 50, msg: 'Press P to patrol. Press F for nation ability. Shift+F to cycle formations.', color: '#ffcc00' },
      { time: 75, msg: 'Press G to use unit abilities. Press T to view the tech tree.', color: '#00ff88' },
      { time: 100, msg: 'Shift+right-click queues waypoints. Press F1 for all controls.', color: '#00ff88' },
    ];

    if (this._tutorialStep < tips.length && this._tutorialTimer >= tips[this._tutorialStep].time) {
      const tip = tips[this._tutorialStep];
      if (this.game.uiManager && this.game.uiManager.hud) {
        this.game.uiManager.hud.showNotification(tip.msg, tip.color);
      }
      this._tutorialStep++;
      if (this._tutorialStep >= tips.length) {
        this._tutorialShown = true;
      }
    }
  }

  dispose() {
    this._mapEventTimer = 0;
    this._tutorialTimer = 0;
    this._tutorialStep = 0;
    this._tutorialShown = false;
  }
}
