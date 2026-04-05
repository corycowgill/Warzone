/**
 * SettingsManager - Centralized game settings with localStorage persistence.
 * Handles graphics, audio, controls, gameplay, and accessibility settings.
 */
export class SettingsManager {
  constructor() {
    this.defaults = {
      // Graphics
      graphics: {
        quality: 'high',        // 'low', 'medium', 'high', 'ultra'
        shadows: true,
        shadowQuality: 'medium', // 'low', 'medium', 'high'
        antialiasing: true,
        bloom: true,
        vignette: true,
        particles: 'high',      // 'low', 'medium', 'high'
        waterQuality: 'high',   // 'low', 'medium', 'high'
        resolution: 1.0,        // 0.5, 0.75, 1.0, 1.5
        vsync: true,
        showFPS: false,
        maxEntities: 200,
        dayNightCycle: true,
        weatherEffects: true,
        unitAnimations: true,
        terrainDetail: 'high',  // 'low', 'medium', 'high'
      },
      // Audio
      audio: {
        masterVolume: 0.3,
        sfxVolume: 1.0,
        musicVolume: 0.25,
        voiceVolume: 0.7,
        ambientVolume: 0.5,
        sfxEnabled: true,
        musicEnabled: true,
        voiceEnabled: true,
        ambientEnabled: true,
      },
      // Controls
      controls: {
        cameraSpeed: 1.0,
        edgePanEnabled: true,
        edgePanSpeed: 1.0,
        edgePanThreshold: 50,
        scrollZoomSpeed: 1.0,
        middleMousePan: true,
        doubleClickCenterCamera: true,
        // Keybindings (action -> key)
        keybindings: {
          moveCommand: 'M',
          attackMove: 'A',
          patrol: 'P',
          stop: 'S',
          holdPosition: 'H',
          retreat: 'R',
          selectAllMilitary: 'Ctrl+A',
          selectAllOfType: 'Ctrl+Z',
          selectIdleUnits: ',',
          selectAllUnits: '.',
          jumpToLastAlert: ' ',
          pause: 'Ctrl+P',
          techTree: 'T',
          productionOverview: '`',
          quickSave: 'Ctrl+S',
          quickLoad: 'Ctrl+L',
          toggleMinimap: 'Tab',
          controlGroup1: '1',
          controlGroup2: '2',
          controlGroup3: '3',
          controlGroup4: '4',
          controlGroup5: '5',
          controlGroup6: '6',
          controlGroup7: '7',
          controlGroup8: '8',
          controlGroup9: '9',
          controlGroup0: '0',
        }
      },
      // Gameplay
      gameplay: {
        difficulty: 'normal',
        autoSave: true,
        autoSaveInterval: 120,  // seconds
        showTutorial: true,
        confirmSurrender: true,
        showDamageNumbers: true,
        showHealthBars: 'always', // 'always', 'damaged', 'selected', 'never'
        showUnitPaths: false,
        gameSpeed: 1.0,
      },
      // Accessibility
      accessibility: {
        colorblindMode: 'none',   // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
        highContrast: false,
        largeText: false,
        screenShake: true,
        flashingEffects: true,
        subtitles: true,
      }
    };

    this.settings = this._deepClone(this.defaults);
    this.listeners = new Map();
    this.load();
  }

  /**
   * Get a setting value by dot-notation path
   * @param {string} path - e.g., 'graphics.shadows' or 'audio.masterVolume'
   */
  get(path) {
    const parts = path.split('.');
    let obj = this.settings;
    for (const part of parts) {
      if (obj === undefined || obj === null) return undefined;
      obj = obj[part];
    }
    return obj;
  }

  /**
   * Set a setting value and notify listeners
   * @param {string} path - dot-notation path
   * @param {*} value - new value
   */
  set(path, value) {
    const parts = path.split('.');
    let obj = this.settings;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    const oldValue = obj[parts[parts.length - 1]];
    obj[parts[parts.length - 1]] = value;

    // Notify listeners
    this._notifyListeners(path, value, oldValue);
    this._notifyListeners(parts[0] + '.*', value, oldValue);

    // Auto-save on change
    this.save();
  }

  /**
   * Listen for setting changes
   * @param {string} path - dot-notation path or 'category.*' for all changes in category
   * @param {Function} callback - (newValue, oldValue, path) => void
   * @returns {Function} unsubscribe function
   */
  onChange(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);
    return () => this.listeners.get(path)?.delete(callback);
  }

  /**
   * Reset a category or all settings to defaults
   */
  reset(category) {
    if (category && this.defaults[category]) {
      this.settings[category] = this._deepClone(this.defaults[category]);
      this._notifyListeners(category + '.*', this.settings[category], null);
    } else {
      this.settings = this._deepClone(this.defaults);
      this._notifyListeners('*', this.settings, null);
    }
    this.save();
  }

  /**
   * Get the keybinding for an action
   */
  getKeybinding(action) {
    return this.settings.controls.keybindings[action] || null;
  }

  /**
   * Set a keybinding for an action
   */
  setKeybinding(action, key) {
    // Check for conflicts
    const existing = Object.entries(this.settings.controls.keybindings)
      .find(([a, k]) => k === key && a !== action);
    if (existing) {
      // Clear the conflicting binding
      this.settings.controls.keybindings[existing[0]] = '';
    }
    this.settings.controls.keybindings[action] = key;
    this.save();
  }

  /**
   * Get graphics quality preset and apply it
   */
  applyGraphicsPreset(preset) {
    const presets = {
      low: {
        shadows: false, shadowQuality: 'low', antialiasing: false,
        bloom: false, vignette: false, particles: 'low', waterQuality: 'low',
        resolution: 0.75, dayNightCycle: false, weatherEffects: false,
        unitAnimations: false, terrainDetail: 'low', maxEntities: 100,
      },
      medium: {
        shadows: true, shadowQuality: 'low', antialiasing: true,
        bloom: false, vignette: true, particles: 'medium', waterQuality: 'medium',
        resolution: 1.0, dayNightCycle: true, weatherEffects: true,
        unitAnimations: true, terrainDetail: 'medium', maxEntities: 150,
      },
      high: {
        shadows: true, shadowQuality: 'medium', antialiasing: true,
        bloom: true, vignette: true, particles: 'high', waterQuality: 'high',
        resolution: 1.0, dayNightCycle: true, weatherEffects: true,
        unitAnimations: true, terrainDetail: 'high', maxEntities: 200,
      },
      ultra: {
        shadows: true, shadowQuality: 'high', antialiasing: true,
        bloom: true, vignette: true, particles: 'high', waterQuality: 'high',
        resolution: 1.5, dayNightCycle: true, weatherEffects: true,
        unitAnimations: true, terrainDetail: 'high', maxEntities: 300,
      }
    };

    const p = presets[preset];
    if (!p) return;

    this.settings.graphics = { ...this.settings.graphics, quality: preset, ...p };
    this._notifyListeners('graphics.*', this.settings.graphics, null);
    this.save();
  }

  /**
   * Save settings to localStorage
   */
  save() {
    try {
      localStorage.setItem('warzone_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  /**
   * Load settings from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem('warzone_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = this._deepMerge(this._deepClone(this.defaults), parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
      this.settings = this._deepClone(this.defaults);
    }
  }

  /**
   * Export settings as JSON string
   */
  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  import(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      this.settings = this._deepMerge(this._deepClone(this.defaults), parsed);
      this.save();
      this._notifyListeners('*', this.settings, null);
    } catch (e) {
      console.warn('Failed to import settings:', e);
    }
  }

  // Private helpers

  _notifyListeners(path, newValue, oldValue) {
    const listeners = this.listeners.get(path);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(newValue, oldValue, path); } catch (e) { console.warn('Settings listener error:', e); }
      }
    }
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}

// Singleton instance
export const settingsManager = new SettingsManager();
