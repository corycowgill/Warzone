import { settingsManager } from '../core/SettingsManager.js';

/**
 * SettingsUI - Professional settings panel with tabbed interface.
 * Handles graphics, audio, controls, gameplay, and accessibility settings.
 */
export class SettingsUI {
  constructor() {
    this.container = null;
    this.activeTab = 'graphics';
    this.isOpen = false;
    this.keybindListening = null; // Currently rebinding key
    this._onKeyDown = null;
    this.create();
  }

  create() {
    // Create overlay container
    this.container = document.createElement('div');
    this.container.id = 'settings-overlay';
    this.container.className = 'hidden';
    this.container.innerHTML = `
      <div class="settings-backdrop"></div>
      <div class="settings-panel">
        <div class="settings-header">
          <h2>SETTINGS</h2>
          <button class="settings-close-btn" title="Close">&times;</button>
        </div>
        <div class="settings-body">
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="graphics">Graphics</button>
            <button class="settings-tab" data-tab="audio">Audio</button>
            <button class="settings-tab" data-tab="controls">Controls</button>
            <button class="settings-tab" data-tab="gameplay">Gameplay</button>
            <button class="settings-tab" data-tab="accessibility">Accessibility</button>
          </div>
          <div class="settings-content" id="settings-content"></div>
        </div>
        <div class="settings-footer">
          <button class="settings-btn settings-btn-secondary" id="settings-reset">Reset to Defaults</button>
          <button class="settings-btn settings-btn-primary" id="settings-apply">Apply & Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this._setupEvents();
  }

  _setupEvents() {
    // Close button
    this.container.querySelector('.settings-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('.settings-backdrop').addEventListener('click', () => this.close());

    // Tab switching
    this.container.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.container.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderTab();
      });
    });

    // Reset
    this.container.querySelector('#settings-reset').addEventListener('click', () => {
      settingsManager.reset(this.activeTab);
      this._renderTab();
    });

    // Apply
    this.container.querySelector('#settings-apply').addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this._renderTab();
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.keybindListening = null;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  _renderTab() {
    const content = this.container.querySelector('#settings-content');
    switch (this.activeTab) {
      case 'graphics': content.innerHTML = this._renderGraphics(); break;
      case 'audio': content.innerHTML = this._renderAudio(); break;
      case 'controls': content.innerHTML = this._renderControls(); break;
      case 'gameplay': content.innerHTML = this._renderGameplay(); break;
      case 'accessibility': content.innerHTML = this._renderAccessibility(); break;
    }
    this._bindTabEvents(content);
  }

  _renderGraphics() {
    const g = settingsManager.settings.graphics;
    return `
      <div class="settings-group">
        <h3>Quality Preset</h3>
        <div class="settings-preset-row">
          ${['low', 'medium', 'high', 'ultra'].map(p => `
            <button class="preset-btn ${g.quality === p ? 'active' : ''}" data-preset="${p}">
              ${p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="settings-group">
        <h3>Display</h3>
        ${this._renderSlider('Resolution Scale', 'graphics.resolution', g.resolution, 0.5, 2.0, 0.25, v => `${Math.round(v * 100)}%`)}
        ${this._renderToggle('V-Sync', 'graphics.vsync', g.vsync)}
        ${this._renderToggle('Show FPS Counter', 'graphics.showFPS', g.showFPS)}
        ${this._renderToggle('Anti-Aliasing', 'graphics.antialiasing', g.antialiasing)}
      </div>
      <div class="settings-group">
        <h3>Effects</h3>
        ${this._renderToggle('Shadows', 'graphics.shadows', g.shadows)}
        ${this._renderSelect('Shadow Quality', 'graphics.shadowQuality', g.shadowQuality, ['low', 'medium', 'high'])}
        ${this._renderToggle('Bloom', 'graphics.bloom', g.bloom)}
        ${this._renderToggle('Vignette', 'graphics.vignette', g.vignette)}
        ${this._renderSelect('Particle Quality', 'graphics.particles', g.particles, ['low', 'medium', 'high'])}
        ${this._renderSelect('Water Quality', 'graphics.waterQuality', g.waterQuality, ['low', 'medium', 'high'])}
      </div>
      <div class="settings-group">
        <h3>World</h3>
        ${this._renderToggle('Day/Night Cycle', 'graphics.dayNightCycle', g.dayNightCycle)}
        ${this._renderToggle('Weather Effects', 'graphics.weatherEffects', g.weatherEffects)}
        ${this._renderToggle('Unit Animations', 'graphics.unitAnimations', g.unitAnimations)}
        ${this._renderSelect('Terrain Detail', 'graphics.terrainDetail', g.terrainDetail, ['low', 'medium', 'high'])}
        ${this._renderSlider('Max Entities', 'graphics.maxEntities', g.maxEntities, 50, 400, 50, v => `${v}`)}
      </div>
    `;
  }

  _renderAudio() {
    const a = settingsManager.settings.audio;
    return `
      <div class="settings-group">
        <h3>Volume</h3>
        ${this._renderSlider('Master Volume', 'audio.masterVolume', a.masterVolume, 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        ${this._renderSlider('SFX Volume', 'audio.sfxVolume', a.sfxVolume, 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        ${this._renderSlider('Music Volume', 'audio.musicVolume', a.musicVolume, 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        ${this._renderSlider('Voice Volume', 'audio.voiceVolume', a.voiceVolume, 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        ${this._renderSlider('Ambient Volume', 'audio.ambientVolume', a.ambientVolume, 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
      </div>
      <div class="settings-group">
        <h3>Toggles</h3>
        ${this._renderToggle('Sound Effects', 'audio.sfxEnabled', a.sfxEnabled)}
        ${this._renderToggle('Music', 'audio.musicEnabled', a.musicEnabled)}
        ${this._renderToggle('Voice Lines', 'audio.voiceEnabled', a.voiceEnabled)}
        ${this._renderToggle('Ambient Sounds', 'audio.ambientEnabled', a.ambientEnabled)}
      </div>
    `;
  }

  _renderControls() {
    const c = settingsManager.settings.controls;
    const bindings = c.keybindings;
    const bindingLabels = {
      moveCommand: 'Move', attackMove: 'Attack Move', patrol: 'Patrol',
      stop: 'Stop', holdPosition: 'Hold Position', retreat: 'Retreat',
      selectAllMilitary: 'Select All Military', selectAllOfType: 'Select All of Type',
      selectIdleUnits: 'Select Idle Units', selectAllUnits: 'Select All Units',
      jumpToLastAlert: 'Jump to Alert', pause: 'Pause', techTree: 'Tech Tree',
      productionOverview: 'Production Overview', quickSave: 'Quick Save',
      quickLoad: 'Quick Load', toggleMinimap: 'Toggle Minimap',
    };

    return `
      <div class="settings-group">
        <h3>Camera</h3>
        ${this._renderSlider('Camera Speed', 'controls.cameraSpeed', c.cameraSpeed, 0.25, 3.0, 0.25, v => `${v.toFixed(2)}x`)}
        ${this._renderToggle('Edge Pan', 'controls.edgePanEnabled', c.edgePanEnabled)}
        ${this._renderSlider('Edge Pan Speed', 'controls.edgePanSpeed', c.edgePanSpeed, 0.25, 3.0, 0.25, v => `${v.toFixed(2)}x`)}
        ${this._renderSlider('Scroll Zoom Speed', 'controls.scrollZoomSpeed', c.scrollZoomSpeed, 0.25, 3.0, 0.25, v => `${v.toFixed(2)}x`)}
        ${this._renderToggle('Middle Mouse Pan', 'controls.middleMousePan', c.middleMousePan)}
      </div>
      <div class="settings-group">
        <h3>Key Bindings</h3>
        <div class="keybind-list">
          ${Object.entries(bindingLabels).map(([action, label]) => `
            <div class="keybind-row">
              <span class="keybind-label">${label}</span>
              <button class="keybind-btn ${this.keybindListening === action ? 'listening' : ''}" data-action="${action}">
                ${this.keybindListening === action ? 'Press a key...' : (bindings[action] || 'Unbound')}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _renderGameplay() {
    const g = settingsManager.settings.gameplay;
    return `
      <div class="settings-group">
        <h3>General</h3>
        ${this._renderSelect('Default Difficulty', 'gameplay.difficulty', g.difficulty, ['easy', 'normal', 'hard'])}
        ${this._renderSlider('Game Speed', 'gameplay.gameSpeed', g.gameSpeed, 0.5, 3.0, 0.25, v => `${v.toFixed(2)}x`)}
        ${this._renderToggle('Show Tutorial', 'gameplay.showTutorial', g.showTutorial)}
        ${this._renderToggle('Confirm Surrender', 'gameplay.confirmSurrender', g.confirmSurrender)}
      </div>
      <div class="settings-group">
        <h3>Display</h3>
        ${this._renderToggle('Damage Numbers', 'gameplay.showDamageNumbers', g.showDamageNumbers)}
        ${this._renderSelect('Health Bars', 'gameplay.showHealthBars', g.showHealthBars, ['always', 'damaged', 'selected', 'never'])}
        ${this._renderToggle('Show Unit Paths', 'gameplay.showUnitPaths', g.showUnitPaths)}
      </div>
      <div class="settings-group">
        <h3>Auto-Save</h3>
        ${this._renderToggle('Auto-Save', 'gameplay.autoSave', g.autoSave)}
        ${this._renderSlider('Auto-Save Interval', 'gameplay.autoSaveInterval', g.autoSaveInterval, 30, 600, 30, v => `${Math.round(v)}s`)}
      </div>
    `;
  }

  _renderAccessibility() {
    const a = settingsManager.settings.accessibility;
    return `
      <div class="settings-group">
        <h3>Visual</h3>
        ${this._renderSelect('Colorblind Mode', 'accessibility.colorblindMode', a.colorblindMode, ['none', 'protanopia', 'deuteranopia', 'tritanopia'])}
        ${this._renderToggle('High Contrast UI', 'accessibility.highContrast', a.highContrast)}
        ${this._renderToggle('Large Text', 'accessibility.largeText', a.largeText)}
      </div>
      <div class="settings-group">
        <h3>Effects</h3>
        ${this._renderToggle('Screen Shake', 'accessibility.screenShake', a.screenShake)}
        ${this._renderToggle('Flashing Effects', 'accessibility.flashingEffects', a.flashingEffects)}
      </div>
      <div class="settings-group">
        <h3>Communication</h3>
        ${this._renderToggle('Subtitles', 'accessibility.subtitles', a.subtitles)}
      </div>
    `;
  }

  // UI Component Helpers

  _renderToggle(label, path, value) {
    return `
      <div class="setting-row">
        <label class="setting-label">${label}</label>
        <label class="toggle-switch">
          <input type="checkbox" data-path="${path}" ${value ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  _renderSlider(label, path, value, min, max, step, formatFn) {
    const display = formatFn ? formatFn(value) : value;
    return `
      <div class="setting-row">
        <label class="setting-label">${label}</label>
        <div class="setting-slider-group">
          <input type="range" class="setting-slider" data-path="${path}"
            min="${min}" max="${max}" step="${step}" value="${value}">
          <span class="setting-slider-value">${display}</span>
        </div>
      </div>
    `;
  }

  _renderSelect(label, path, value, options) {
    return `
      <div class="setting-row">
        <label class="setting-label">${label}</label>
        <select class="setting-select" data-path="${path}">
          ${options.map(opt => `
            <option value="${opt}" ${value === opt ? 'selected' : ''}>
              ${opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  _bindTabEvents(content) {
    // Toggles
    content.querySelectorAll('input[type="checkbox"][data-path]').forEach(input => {
      input.addEventListener('change', () => {
        settingsManager.set(input.dataset.path, input.checked);
      });
    });

    // Sliders
    content.querySelectorAll('input[type="range"][data-path]').forEach(input => {
      input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        settingsManager.set(input.dataset.path, val);
        const display = input.parentElement.querySelector('.setting-slider-value');
        if (display) {
          // Simple formatting based on value range
          if (val <= 1 && input.max <= 2) display.textContent = `${Math.round(val * 100)}%`;
          else if (input.step === '0.25') display.textContent = `${val.toFixed(2)}x`;
          else display.textContent = `${Math.round(val)}`;
        }
      });
    });

    // Selects
    content.querySelectorAll('select[data-path]').forEach(select => {
      select.addEventListener('change', () => {
        settingsManager.set(select.dataset.path, select.value);
      });
    });

    // Preset buttons
    content.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settingsManager.applyGraphicsPreset(btn.dataset.preset);
        this._renderTab();
      });
    });

    // Keybind buttons
    content.querySelectorAll('.keybind-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (this.keybindListening === action) {
          this.keybindListening = null;
          this._renderTab();
          return;
        }
        this.keybindListening = action;
        this._renderTab();

        // Listen for next keypress
        if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.key === 'Escape') {
            this.keybindListening = null;
          } else {
            let key = '';
            if (e.ctrlKey) key += 'Ctrl+';
            if (e.shiftKey) key += 'Shift+';
            if (e.altKey) key += 'Alt+';
            key += e.key.length === 1 ? e.key.toUpperCase() : e.key;
            settingsManager.setKeybinding(action, key);
            this.keybindListening = null;
          }
          document.removeEventListener('keydown', this._onKeyDown);
          this._onKeyDown = null;
          this._renderTab();
        };
        document.addEventListener('keydown', this._onKeyDown);
      });
    });
  }
}
