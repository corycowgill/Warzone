import * as THREE from 'three';
import { GAME_CONFIG, BUILDING_STATS } from '../core/Constants.js';
import { PRODUCTION_HOTKEYS } from '../ui/ProductionShortcuts.js';

/**
 * TutorialSystem — Interactive step-based tutorial that teaches RTS basics.
 * Each step has an objective, hint text, and an EventBus-driven completion condition.
 * A persistent UI panel shows the current objective on-screen.
 */
export class TutorialSystem {
  constructor(game) {
    this.game = game;
    this.currentStep = 0;
    this.active = false;
    this._listeners = [];   // { event, callback } pairs for cleanup
    this._overlay = null;    // DOM root element
    this._stepTimer = 0;     // time spent on current step (for re-hint)
    this._hintRepeatInterval = 15; // seconds before repeating hint
    this._pulseTime = 0;     // for animating indicators
    this._advanceRemaining = null;
    this._completeBanner = null;

    this.steps = [
      {
        title: 'Select Your Infantry',
        hint: 'Left-click on one of your soldiers to select them.',
        event: 'selection:changed',
        condition: (data) => {
          return data.entities && data.entities.some(e => e.alive && e.isUnit && e.type === 'infantry' && e.team === 'player');
        }
      },
      {
        title: 'Move Your Troops',
        hint: 'Right-click on the ground to move your selected units.',
        event: 'command:move',
        condition: (data) => data.units?.some(u => u.alive && u.isUnit && u.team === 'player')
      },
      {
        title: 'Select Multiple Units',
        hint: 'Click and drag to draw a selection box around multiple units.',
        event: 'selection:changed',
        condition: (data) => {
          return data.entities && data.entities.filter(e => e.alive && e.isUnit && e.team === 'player').length >= 2;
        }
      },
      {
        title: 'Attack-Move',
        hint: 'Press A, then left-click on the ground to attack-move. Your units will engage enemies along the way.',
        event: 'command:attackmove',
        condition: (data) => data.units?.some(u => u.alive && u.isUnit && u.team === 'player')
      },
      {
        title: 'Build a Barracks',
        hint: 'Press B to open the build menu, then click Barracks. Place it near your base.',
        event: 'building:created',
        condition: (data) => {
          return data.building && data.building.type === 'barracks' && data.building.team === 'player';
        },
        onSetup: () => {
          // Grant 200 SP so the player can afford it
          if (this.game.teams && this.game.teams.player) {
            this.game.teams.player.sp += 200;
          }
        }
      },
      {
        title: 'Produce Infantry',
        hint: `Wait for your Barracks to finish, select it, then click Infantry or press ${PRODUCTION_HOTKEYS.infantry}. Wait for the soldier to deploy.`,
        event: 'production:complete',
        condition: (data) => {
          return data.unitType === 'infantry' && data.building && data.building.team === 'player';
        }
      },
      {
        title: 'Build a War Factory',
        hint: 'Press B and build a War Factory. This unlocks tanks and vehicles.',
        event: 'building:created',
        condition: (data) => {
          return data.building && data.building.type === 'warfactory' && data.building.team === 'player';
        },
        onSetup: () => {
          // Grant 400 SP for the War Factory
          if (this.game.teams && this.game.teams.player) {
            this.game.teams.player.sp += 400;
          }
        }
      },
      {
        title: 'Produce a Tank',
        hint: `Wait for your War Factory to finish, select it, then click Tank or press ${PRODUCTION_HOTKEYS.tank}. Wait for the tank to deploy.`,
        event: 'production:complete',
        condition: (data) => {
          return data.unitType === 'tank' && data.building && data.building.team === 'player';
        }
      },
      {
        title: 'Engage the Enemy',
        hint: 'Select your units and right-click on an enemy to attack! Red units are hostile.',
        event: 'combat:attack',
        condition: (data) => {
          return data.attacker && data.attacker.team === 'player';
        },
        onSetup: () => {
          this._spawnTutorialEnemies();
        }
      },
      {
        onSetup: () => this._ensurePracticeTargets(),
        title: 'Use an Ability',
        hint: 'Select an infantry unit, press G, then click an enemy to throw a Grenade. Wait for the ability to recharge if needed.',
        event: 'ability:used',
        condition: (data) => {
          return data.unit?.team === 'player' && data.unit.type === 'infantry' && data.ability === 'grenade';
        }
      },
      {
        title: 'Victory!',
        hint: 'Congratulations, Commander! You have mastered the basics of warfare.',
        event: null,
        condition: () => true,
        isFinal: true
      }
    ];
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    this.dispose();
    this._exiting = false;
    this.active = true;
    this.currentStep = 0;
    this._createOverlay();
    this._setupStep(0);
  }

  update(delta) {
    if (!this.active) return;
    if (this._advanceRemaining !== null) {
      this._advanceRemaining -= delta;
      if (this._advanceRemaining <= 0) {
        this._advanceRemaining = null;
        this._setupStep(this.currentStep + 1);
      }
      return;
    }

    if (this.currentStep === 8 || this.currentStep === 9) {
      this._practiceTimer = (this._practiceTimer || 0) + delta;
      if (this._practiceTimer >= 5) {
        this._practiceTimer = 0;
        this._ensurePracticeTargets();
      }
    }

    // Animate pulse indicator
    this._pulseTime += delta;

    // Track time on current step for re-hint
    this._stepTimer += delta;
    if (this._stepTimer >= this._hintRepeatInterval) {
      this._stepTimer = 0;
      this._flashHint();
    }

    // Pulse the objective text gently
    if (this._objectiveEl) {
      const pulse = 0.7 + 0.3 * Math.sin(this._pulseTime * 2);
      this._objectiveEl.style.opacity = pulse;
    }
  }

  dispose() {
    this.active = false;
    this._cleanupListeners();
    this._advanceRemaining = null;
    this._practiceTargets = [];
    if (this._hintTimeout) clearTimeout(this._hintTimeout);
    this._hintTimeout = null;
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
    if (this._completeBanner && this._completeBanner.parentNode) {
      this._completeBanner.parentNode.removeChild(this._completeBanner);
      this._completeBanner = null;
    }
  }

  // ── Overlay creation ────────────────────────────────────────

  _createOverlay() {
    // Remove any existing overlay
    const existing = document.getElementById('tutorial-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'tutorial-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      left: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '280px',
      background: 'rgba(10, 15, 25, 0.92)',
      border: '1px solid rgba(0, 255, 65, 0.3)',
      borderRadius: '6px',
      padding: '18px 16px',
      zIndex: '9999',
      pointerEvents: 'none',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#c0c0c0',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.08), inset 0 0 30px rgba(0, 0, 0, 0.3)',
      userSelect: 'none'
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      fontSize: '11px',
      fontWeight: 'bold',
      letterSpacing: '3px',
      color: '#00ff41',
      textShadow: '0 0 8px rgba(0, 255, 65, 0.5)',
      marginBottom: '6px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(0, 255, 65, 0.2)',
      paddingBottom: '8px'
    });
    header.textContent = 'TUTORIAL';
    panel.appendChild(header);

    // Step label
    const stepLabel = document.createElement('div');
    Object.assign(stepLabel.style, {
      fontSize: '10px',
      color: '#667',
      textAlign: 'center',
      marginBottom: '10px',
      letterSpacing: '1px'
    });
    stepLabel.textContent = 'Step 1 of ' + this.steps.length;
    this._stepLabelEl = stepLabel;
    panel.appendChild(stepLabel);

    // Objective
    const objective = document.createElement('div');
    Object.assign(objective.style, {
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#00ff41',
      textShadow: '0 0 6px rgba(0, 255, 65, 0.4)',
      marginBottom: '10px',
      textAlign: 'center',
      lineHeight: '1.3'
    });
    this._objectiveEl = objective;
    panel.appendChild(objective);

    // Hint
    const hint = document.createElement('div');
    Object.assign(hint.style, {
      fontSize: '12px',
      color: '#a0b0a0',
      lineHeight: '1.5',
      marginBottom: '14px',
      textAlign: 'center',
      transition: 'color 0.3s'
    });
    this._hintEl = hint;
    panel.appendChild(hint);

    // Progress dots
    const progress = document.createElement('div');
    Object.assign(progress.style, {
      textAlign: 'center',
      fontSize: '12px',
      letterSpacing: '3px',
      color: '#00ff41'
    });
    this._progressEl = progress;
    panel.appendChild(progress);

    document.body.appendChild(panel);
    this._overlay = panel;
  }

  _updateOverlay() {
    const step = this.steps[this.currentStep];
    if (!step || !this._overlay) return;

    if (this._stepLabelEl) {
      this._stepLabelEl.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    }
    if (this._objectiveEl) {
      this._objectiveEl.textContent = step.title;
      this._objectiveEl.style.opacity = '1';
    }
    if (this._hintEl) {
      this._hintEl.textContent = step.hint;
      this._hintEl.style.color = '#a0b0a0';
    }
    if (this._progressEl) {
      let dots = '';
      for (let i = 0; i < this.steps.length; i++) {
        dots += i < this.currentStep ? '\u25CF ' : i === this.currentStep ? '\u25CF ' : '\u25CB ';
      }
      this._progressEl.textContent = dots.trim();
      // Color current dot brighter
      // (done via text — filled dots for completed, current is green, rest hollow)
    }
  }

  _flashHint() {
    if (!this._hintEl) return;
    this._hintEl.style.color = '#00ff41';
    if (this._hintTimeout) clearTimeout(this._hintTimeout);
    this._hintTimeout = setTimeout(() => {
      this._hintTimeout = null;
      if (this._hintEl) this._hintEl.style.color = '#a0b0a0';
    }, 2000);
  }

  // ── Step management ─────────────────────────────────────────

  _setupStep(index) {
    this._cleanupListeners();
    this.currentStep = index;
    this._stepTimer = 0;
    this._practiceTimer = 0;

    const step = this.steps[index];
    if (!step) return;

    this._updateOverlay();

    // Handle final step
    if (step.isFinal) {
      this._finishTutorial();
      return;
    }

    // Run setup callback (resource grants, enemy spawns, etc.)
    if (step.onSetup) {
      step.onSetup();
    }

    // Register EventBus listener for completion condition
    if (step.event) {
      const callback = (data) => {
        if (this.active && this.currentStep === index && step.condition(data)) {
          this._completeStep();
        }
      };
      this.game.eventBus.on(step.event, callback);
      this._listeners.push({ event: step.event, callback });
    }
  }

  _completeStep() {
    if (!this.active || this._advanceRemaining !== null) return;
    this._cleanupListeners();

    // Show brief completion feedback
    if (this._objectiveEl) {
      this._objectiveEl.textContent = 'Complete!';
      this._objectiveEl.style.opacity = '1';
    }
    if (this._hintEl) {
      this._hintEl.textContent = '';
    }

    // Advance with simulation time so pausing also pauses tutorial progression.
    this._advanceRemaining = 1;
  }

  _finishTutorial() {
    this.active = false;
    this._cleanupListeners();
    // Save completion to localStorage
    try {
      localStorage.setItem('warzone_tutorial_complete', 'true');
    } catch (e) {
      // localStorage may be unavailable
    }

    // Remove the step panel
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }

    // Show completion banner
    this._showCompletionScreen();
  }

  _showCompletionScreen() {
    const banner = document.createElement('div');
    banner.id = 'tutorial-complete-screen';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'true');
    banner.setAttribute('aria-labelledby', 'tutorial-complete-title');
    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 10, 20, 0.85)',
      zIndex: '10000',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#c0c0c0'
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#00ff41',
      textShadow: '0 0 20px rgba(0, 255, 65, 0.6)',
      marginBottom: '12px',
      letterSpacing: '4px'
    });
    title.id = 'tutorial-complete-title';
    title.textContent = 'COMMAND TRAINING COMPLETE';
    banner.appendChild(title);

    const subtitle = document.createElement('div');
    Object.assign(subtitle.style, {
      fontSize: '14px',
      color: '#a0b0a0',
      marginBottom: '30px',
      textAlign: 'center',
      lineHeight: '1.6',
      maxWidth: '400px'
    });
    subtitle.textContent = 'Put your training into practice against an Easy opponent. Build your army, protect your base and destroy the enemy headquarters to win.';
    banner.appendChild(subtitle);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      gap: '16px'
    });

    const makeButton = (text, onClick) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      Object.assign(btn.style, {
        padding: '12px 24px',
        fontSize: '13px',
        fontWeight: 'bold',
        fontFamily: '"Courier New", Courier, monospace',
        letterSpacing: '1px',
        background: 'rgba(0, 255, 65, 0.1)',
        border: '1px solid rgba(0, 255, 65, 0.4)',
        color: '#00ff41',
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'all 0.2s',
        pointerEvents: 'auto'
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(0, 255, 65, 0.25)';
        btn.style.borderColor = '#00ff41';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(0, 255, 65, 0.1)';
        btn.style.borderColor = 'rgba(0, 255, 65, 0.4)';
      });
      btn.addEventListener('click', onClick);
      return btn;
    };

    const skirmishBtn = makeButton('PLAY FIRST SKIRMISH', () => this._exitTutorial(true));
    btnContainer.appendChild(skirmishBtn);

    const menuBtn = makeButton('RETURN TO MENU', () => this._exitTutorial(false));
    btnContainer.appendChild(menuBtn);

    banner.appendChild(btnContainer);
    document.body.appendChild(banner);
    this._completeBanner = banner;
    skirmishBtn.focus();
  }

  // ── Helpers ─────────────────────────────────────────────────

  _exitTutorial(playSkirmish) {
    if (this._exiting) return;
    this._exiting = true;
    const config = {
      mode: '1P', gameMode: 'hq_destruction', difficulty: 'easy', mapTemplate: 'plains',
      playerNation: this.game.teams.player.nation || 'america',
      enemyNation: this.game.teams.enemy.nation || 'germany'
    };
    this.dispose();
    // restart tears down tutorial systems and returns to the menu before a fresh match.
    this.game.restart();
    if (playSkirmish) {
      this.game.uiManager.hideAll();
      return this.game.startGame(config);
    }
  }

  _practiceAnchor() {
    const units = (this.game.entities || []).filter(e => e.alive && e.isUnit &&
      e.team === 'player' && !e.isGarrisoned && (e.domain === 'land' || e.type === 'infantry'));
    return units.find(e => e.type === 'infantry') || units[0];
  }

  _ensurePracticeTargets() {
    const anchor = this._practiceAnchor();
    if (!anchor) return;
    const origin = anchor.getPosition();
    const nearby = (this._practiceTargets || []).some(e => e.alive &&
      e.getPosition().distanceToSquared(origin) <= 60 * 60);
    if (!nearby) this._spawnTutorialEnemies();
  }

  _spawnTutorialEnemies() {
    const anchor = this._practiceAnchor();
    const terrain = this.game.terrain;
    const paths = this.game.pathfinding;
    if (!anchor || !terrain || !paths) return;
    const origin = anchor.getPosition();
    const worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale;
    const existing = (this.game.entities || []).filter(e => e.alive && !e.isGarrisoned);
    let routeChecks = 0;
    let spawned = 0;
    this._practiceTargets = (this._practiceTargets || []).filter(e => e.alive);
    // Never accumulate an army of replacement enemies if the player moves away.
    if (this._practiceTargets.length >= 3) return;
    for (const radius of [20, 28, 36, 12]) {
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const pos = new THREE.Vector3(origin.x + Math.cos(angle) * radius, 0,
          origin.z + Math.sin(angle) * radius);
        if (pos.x < 2 || pos.z < 2 || pos.x >= worldSize - 2 || pos.z >= worldSize - 2 ||
            !terrain.isWalkable(pos.x, pos.z)) continue;
        if (existing.some(e => {
          const size = e.isBuilding ? (BUILDING_STATS[e.type]?.size || 2) * 2 + 2 : 3;
          return e.getPosition().distanceToSquared(pos) < size * size;
        })) continue;
        if (routeChecks >= 4) return;
        routeChecks++;
        const route = paths.findPathForDomain(origin, pos, 'land');
        if (!route?.length || route[route.length - 1].distanceToSquared(pos) > 9) continue;
        const enemy = this.game.createUnit('infantry', 'enemy', pos);
        if (enemy) {
          this._practiceTargets.push(enemy);
          existing.push(enemy);
          spawned++;
        }
        if (spawned >= 3 || this._practiceTargets.length >= 3) return;
      }
    }
  }

  _cleanupListeners() {
    for (const entry of this._listeners) {
      this.game.eventBus.off(entry.event, entry.callback);
    }
    this._listeners = [];
  }
}
