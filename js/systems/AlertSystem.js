import { GAME_CONFIG } from '../core/Constants.js';

const ALERT_TYPES = {
  attack: { icon: '\u2694', cssClass: 'alert-type-attack', sound: 'error', duration: 5000 },
  'unit-lost': { icon: '\u2620', cssClass: 'alert-type-unit-lost', sound: 'death', duration: 5000 },
  production: { icon: '\u2692', cssClass: 'alert-type-production', sound: 'produce', duration: 4000 },
  research: { icon: '\u269B', cssClass: 'alert-type-research', sound: 'produce', duration: 5000 },
  superweapon: { icon: '\u2622', cssClass: 'alert-type-superweapon', sound: 'explosion', duration: 6000 },
  'low-resources': { icon: '\u26A0', cssClass: 'alert-type-low-resources', sound: null, duration: 5000 }
};

const MAX_VISIBLE = 4;

export class AlertSystem {
  constructor(game) {
    this.game = game;
    this.alerts = [];
    this.container = null;
    this._lowResourceCooldown = 0;
    this._attackCooldown = 0;

    this._createContainer();
    this._subscribeEvents();
  }

  _createContainer() {
    // Remove any existing container from previous game
    const existing = document.getElementById('alert-container');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'alert-container';
    document.body.appendChild(this.container);
  }

  _subscribeEvents() {
    const bus = this.game.eventBus;

    // Base Under Attack - when player building takes damage
    this._onCombatAttack = (data) => {
      if (!data.defender || data.defender.team !== 'player') return;
      if (!data.defender.isBuilding) return;
      if (this._attackCooldown > 0) return;
      this._attackCooldown = 10; // 10 second cooldown between attack alerts
      const pos = data.defender.getPosition().clone();
      this.showAlert('attack', 'Base Under Attack!', pos);
    };
    bus.on('combat:attack', this._onCombatAttack);

    // Unit Lost
    this._onUnitDestroyed = (data) => {
      if (!data.entity || data.entity.team !== 'player') return;
      if (!data.entity.isUnit) return;
      const pos = data.entity.getPosition ? data.entity.getPosition().clone() : null;
      const name = data.entity.type.charAt(0).toUpperCase() + data.entity.type.slice(1);
      this.showAlert('unit-lost', `Unit Lost: ${name}`, pos);
    };
    bus.on('unit:destroyed', this._onUnitDestroyed);

    // Production Complete
    this._onProductionComplete = (data) => {
      if (!data.building || data.building.team !== 'player') return;
      const name = data.unitType.charAt(0).toUpperCase() + data.unitType.slice(1);
      const pos = data.building.getPosition ? data.building.getPosition().clone() : null;
      this.showAlert('production', `Production Complete: ${name}`, pos);
    };
    bus.on('production:complete', this._onProductionComplete);

    // Research Complete
    this._onResearchComplete = (data) => {
      if (data.team !== 'player') return;
      this.showAlert('research', `Research Complete!`, null);
    };
    bus.on('research:complete', this._onResearchComplete);

    // Superweapon Ready
    this._onAbilityUsed = (data) => {
      // superweapon ready is emitted by SuperweaponFacility - we listen for charged state
    };

    // Low Resources check happens in update()
  }

  update(delta) {
    // Cooldown timers
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    if (this._lowResourceCooldown > 0) this._lowResourceCooldown -= delta;

    // Check low resources
    if (this._lowResourceCooldown <= 0) {
      const sp = this.game.teams.player?.sp || 0;
      const mu = this.game.teams.player?.mu || 0;
      if (sp < 100) {
        this.showAlert('low-resources', `Low SP: ${Math.floor(sp)}`, null);
        this._lowResourceCooldown = 30;
      } else if (mu < 15) {
        this.showAlert('low-resources', `Low Munitions: ${Math.floor(mu)} MU`, null);
        this._lowResourceCooldown = 30;
      }
    }
  }

  showAlert(type, message, position) {
    const config = ALERT_TYPES[type];
    if (!config) return;

    // Play subtle audio cue
    if (config.sound && this.game.soundManager) {
      this.game.soundManager.play(config.sound);
    }

    // Create DOM element
    const el = document.createElement('div');
    el.className = `alert-notification ${config.cssClass}`;
    el.innerHTML = `
      <span class="alert-icon">${config.icon}</span>
      <span class="alert-text">${message}</span>
    `;

    // Click handler: center camera on event location
    if (position && this.game.cameraController) {
      el.addEventListener('click', () => {
        this.game.cameraController.moveTo(position.x, position.z);
      });
      el.style.cursor = 'pointer';
    }

    // Add to container
    if (!this.container) return;
    this.container.appendChild(el);

    // Track alert
    const alertObj = { el, timer: config.duration };
    this.alerts.push(alertObj);

    // Remove excess alerts (keep max visible)
    while (this.alerts.length > MAX_VISIBLE) {
      const oldest = this.alerts.shift();
      this._dismissAlert(oldest);
    }

    // Auto-dismiss after duration
    setTimeout(() => {
      this._dismissAlert(alertObj);
    }, config.duration);
  }

  _dismissAlert(alertObj) {
    if (!alertObj || !alertObj.el || !alertObj.el.parentElement) return;
    alertObj.el.classList.add('alert-dismiss');
    setTimeout(() => {
      if (alertObj.el.parentElement) {
        alertObj.el.parentElement.removeChild(alertObj.el);
      }
      const idx = this.alerts.indexOf(alertObj);
      if (idx !== -1) this.alerts.splice(idx, 1);
    }, 300);
  }

  destroy() {
    // Cleanup event listeners
    const bus = this.game.eventBus;
    if (this._onCombatAttack) bus.off('combat:attack', this._onCombatAttack);
    if (this._onUnitDestroyed) bus.off('unit:destroyed', this._onUnitDestroyed);
    if (this._onProductionComplete) bus.off('production:complete', this._onProductionComplete);
    if (this._onResearchComplete) bus.off('research:complete', this._onResearchComplete);

    // Remove container
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.alerts = [];
  }
}
