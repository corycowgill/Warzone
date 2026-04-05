/**
 * EditorUI - HTML/CSS overlay for the Map Editor.
 * Left sidebar: tool palette
 * Right sidebar: properties panel
 * Top bar: file operations
 * Bottom bar: brush/tool info
 */

import { TOOLS, TERRAIN_TYPES, TERRAIN_TYPE_NAMES } from './MapEditor.js';
import { BUILDING_STATS, UNIT_STATS, NEUTRAL_STRUCTURES } from '../core/Constants.js';
import { MapSerializer } from './MapSerializer.js';
import { getExampleMapList } from './ExampleMaps.js';

export class EditorUI {
  constructor(editor) {
    this.editor = editor;
    this.container = null;
    this._build();
  }

  _build() {
    // Remove any existing editor UI
    const existing = document.getElementById('editor-ui');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'editor-ui';
    this.container.innerHTML = this._getHTML();
    document.body.appendChild(this.container);

    this._applyStyles();
    this._bindEvents();
    this.updateToolState();
    this.updateBrushInfo();
    this.updateMapProperties();
  }

  _getHTML() {
    const buildingTypes = Object.keys(BUILDING_STATS);
    const unitTypes = Object.keys(UNIT_STATS);
    const neutralTypes = Object.keys(NEUTRAL_STRUCTURES);

    return `
    <!-- Top Bar -->
    <div id="editor-topbar">
      <div class="editor-topbar-group">
        <button id="ed-btn-new" class="ed-btn" title="New Map">New</button>
        <button id="ed-btn-save" class="ed-btn" title="Save to Browser">Save</button>
        <button id="ed-btn-load" class="ed-btn" title="Load Map">Load</button>
        <button id="ed-btn-export" class="ed-btn" title="Export .wzmap file">Export</button>
        <button id="ed-btn-import" class="ed-btn" title="Import .wzmap file">Import</button>
      </div>
      <div class="editor-topbar-center">
        <span id="ed-map-title" class="ed-map-title">Untitled Map</span>
      </div>
      <div class="editor-topbar-group">
        <button id="ed-btn-testplay" class="ed-btn ed-btn-accent" title="Test Play this map">Test Play</button>
        <button id="ed-btn-exit" class="ed-btn ed-btn-danger" title="Exit to Main Menu">Exit</button>
      </div>
    </div>

    <!-- Left Sidebar: Tool Palette -->
    <div id="editor-sidebar-left">
      <div class="ed-section-title">Tools</div>
      <div class="ed-tool-grid">
        <button class="ed-tool-btn" data-tool="select" title="Select (click entities)">
          <span class="ed-tool-icon">&#9758;</span><span class="ed-tool-label">Select</span>
        </button>
        <button class="ed-tool-btn" data-tool="raise" title="Raise Terrain">
          <span class="ed-tool-icon">&#9650;</span><span class="ed-tool-label">Raise</span>
        </button>
        <button class="ed-tool-btn" data-tool="lower" title="Lower Terrain">
          <span class="ed-tool-icon">&#9660;</span><span class="ed-tool-label">Lower</span>
        </button>
        <button class="ed-tool-btn" data-tool="paint" title="Paint Terrain Type">
          <span class="ed-tool-icon">&#9998;</span><span class="ed-tool-label">Paint</span>
        </button>
        <button class="ed-tool-btn" data-tool="water" title="Paint Water Zones">
          <span class="ed-tool-icon">&#9783;</span><span class="ed-tool-label">Water</span>
        </button>
        <button class="ed-tool-btn" data-tool="trees" title="Place Trees/Forest">
          <span class="ed-tool-icon">&#9652;</span><span class="ed-tool-label">Trees</span>
        </button>
        <button class="ed-tool-btn" data-tool="place_resource" title="Place Resource Node">
          <span class="ed-tool-icon">&#9830;</span><span class="ed-tool-label">Resource</span>
        </button>
        <button class="ed-tool-btn" data-tool="place_start" title="Place Player Start Position">
          <span class="ed-tool-icon">&#9873;</span><span class="ed-tool-label">Start Pos</span>
        </button>
        <button class="ed-tool-btn" data-tool="erase" title="Erase entities/trees in area">
          <span class="ed-tool-icon">&#10005;</span><span class="ed-tool-label">Erase</span>
        </button>
      </div>

      <div class="ed-section-title" style="margin-top:12px;">Terrain Type</div>
      <div class="ed-terrain-grid">
        ${TERRAIN_TYPE_NAMES.map((name, i) => `
          <button class="ed-terrain-btn" data-terrain="${i}" title="${name}">
            <span class="ed-terrain-swatch" style="background:${this._terrainCSSColor(i)}"></span>
            <span>${name}</span>
          </button>
        `).join('')}
      </div>

      <div class="ed-section-title" style="margin-top:12px;">Team</div>
      <div class="ed-team-grid">
        <button class="ed-team-btn selected" data-team="player" style="color:#3388ff;">Player</button>
        <button class="ed-team-btn" data-team="enemy" style="color:#ff3333;">Enemy</button>
        <button class="ed-team-btn" data-team="neutral" style="color:#cccc44;">Neutral</button>
      </div>
    </div>

    <!-- Right Sidebar: Entity Palette + Properties -->
    <div id="editor-sidebar-right">
      <div class="ed-section-title">Buildings</div>
      <div class="ed-entity-list" id="ed-building-list">
        ${buildingTypes.map(t => `
          <button class="ed-entity-btn" data-entity="${t}" data-kind="building" title="${t}">
            ${t}
          </button>
        `).join('')}
      </div>

      <div class="ed-section-title" style="margin-top:10px;">Units</div>
      <div class="ed-entity-list" id="ed-unit-list">
        ${unitTypes.map(t => `
          <button class="ed-entity-btn" data-entity="${t}" data-kind="unit" title="${t}">
            ${t}
          </button>
        `).join('')}
      </div>

      <div class="ed-section-title" style="margin-top:10px;">Neutral Structures</div>
      <div class="ed-entity-list" id="ed-neutral-list">
        ${neutralTypes.map(t => `
          <button class="ed-entity-btn ed-neutral-btn" data-neutral="${t}" title="${NEUTRAL_STRUCTURES[t].label}">
            ${NEUTRAL_STRUCTURES[t].label}
          </button>
        `).join('')}
      </div>

      <div class="ed-section-title" style="margin-top:10px;">Map Properties</div>
      <div class="ed-props">
        <label>Name: <input type="text" id="ed-prop-name" value="Untitled Map" maxlength="40"></label>
        <label>Description: <input type="text" id="ed-prop-desc" value="" maxlength="100"></label>
        <label>Size:
          <select id="ed-prop-size">
            <option value="64">64x64</option>
            <option value="128" selected>128x128</option>
            <option value="256">256x256</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div id="editor-bottombar">
      <div class="ed-bottom-group">
        <span class="ed-bottom-label">Brush:</span>
        <button class="ed-brush-btn" data-brush="1" title="1x1">1</button>
        <button class="ed-brush-btn selected" data-brush="3" title="3x3">3</button>
        <button class="ed-brush-btn" data-brush="5" title="5x5">5</button>
        <button class="ed-brush-btn" data-brush="7" title="7x7">7</button>
      </div>
      <div class="ed-bottom-group">
        <span id="ed-tool-info" class="ed-bottom-label">Tool: Select</span>
      </div>
      <div class="ed-bottom-group">
        <span class="ed-bottom-label">Grid: <kbd>G</kbd> | Undo: <kbd>Ctrl+Z</kbd> | Redo: <kbd>Ctrl+Y</kbd> | Brush Size: <kbd>1-4</kbd></span>
      </div>
    </div>

    <!-- Load Map Modal -->
    <div id="ed-load-modal" class="ed-modal hidden">
      <div class="ed-modal-content">
        <h3>Load Map</h3>
        <div id="ed-load-list"></div>
        <div style="margin-top:12px;text-align:right;">
          <button id="ed-load-cancel" class="ed-btn">Cancel</button>
        </div>
      </div>
    </div>

    <!-- New Map Modal -->
    <div id="ed-new-modal" class="ed-modal hidden">
      <div class="ed-modal-content">
        <h3>New Map</h3>
        <label>Map Size:
          <select id="ed-new-size">
            <option value="64">64x64 (Small)</option>
            <option value="128" selected>128x128 (Medium)</option>
            <option value="256">256x256 (Large)</option>
          </select>
        </label>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button id="ed-new-cancel" class="ed-btn">Cancel</button>
          <button id="ed-new-confirm" class="ed-btn ed-btn-accent">Create</button>
        </div>
      </div>
    </div>
    `;
  }

  _terrainCSSColor(type) {
    const colors = {
      0: '#2d7323',
      1: '#6b5230',
      2: '#c2ad73',
      3: '#6b6652',
      4: '#d9e0eb'
    };
    return colors[type] || '#2d7323';
  }

  _applyStyles() {
    if (document.getElementById('editor-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'editor-ui-styles';
    style.textContent = `
      #editor-ui {
        pointer-events: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        font-size: 12px;
        color: #ccc;
      }
      #editor-ui > * {
        pointer-events: auto;
      }

      /* Top Bar */
      #editor-topbar {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 40px;
        background: rgba(10,15,25,0.95);
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        gap: 10px;
      }
      .editor-topbar-group { display: flex; gap: 6px; }
      .editor-topbar-center { flex: 1; text-align: center; }
      .ed-map-title {
        font-size: 14px;
        font-weight: bold;
        color: #ffcc00;
        letter-spacing: 1px;
      }

      .ed-btn {
        padding: 5px 12px;
        background: rgba(30,40,60,0.9);
        border: 1px solid #444;
        border-radius: 3px;
        color: #ccc;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        transition: all 0.15s;
      }
      .ed-btn:hover { background: rgba(50,60,80,0.9); border-color: #666; }
      .ed-btn-accent { color: #00ff41; border-color: #00ff41; }
      .ed-btn-accent:hover { background: rgba(0,255,65,0.15); }
      .ed-btn-danger { color: #ff4444; border-color: #ff4444; }
      .ed-btn-danger:hover { background: rgba(255,68,68,0.15); }

      /* Left Sidebar */
      #editor-sidebar-left {
        position: absolute;
        top: 44px;
        left: 0;
        width: 160px;
        bottom: 36px;
        background: rgba(10,15,25,0.92);
        border-right: 1px solid #333;
        padding: 8px;
        overflow-y: auto;
      }

      .ed-section-title {
        font-size: 11px;
        font-weight: bold;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
      }

      .ed-tool-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
      }

      .ed-tool-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 6px 4px;
        background: rgba(30,40,60,0.8);
        border: 1px solid #333;
        border-radius: 3px;
        color: #aaa;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        transition: all 0.15s;
      }
      .ed-tool-btn:hover { background: rgba(50,60,80,0.9); border-color: #555; }
      .ed-tool-btn.active {
        background: rgba(0,255,65,0.15);
        border-color: #00ff41;
        color: #00ff41;
      }
      .ed-tool-icon { font-size: 16px; }
      .ed-tool-label { margin-top: 2px; }

      .ed-terrain-grid {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .ed-terrain-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        background: rgba(30,40,60,0.7);
        border: 1px solid #333;
        border-radius: 3px;
        color: #aaa;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        transition: all 0.15s;
      }
      .ed-terrain-btn:hover { border-color: #555; }
      .ed-terrain-btn.active { border-color: #ffcc00; color: #ffcc00; }
      .ed-terrain-swatch {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 2px;
        border: 1px solid #555;
      }

      .ed-team-grid {
        display: flex;
        gap: 4px;
      }
      .ed-team-btn {
        flex: 1;
        padding: 4px 2px;
        background: rgba(30,40,60,0.7);
        border: 1px solid #333;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        font-weight: bold;
        transition: all 0.15s;
      }
      .ed-team-btn:hover { border-color: #555; }
      .ed-team-btn.selected { border-color: currentColor; background: rgba(255,255,255,0.08); }

      /* Right Sidebar */
      #editor-sidebar-right {
        position: absolute;
        top: 44px;
        right: 0;
        width: 180px;
        bottom: 36px;
        background: rgba(10,15,25,0.92);
        border-left: 1px solid #333;
        padding: 8px;
        overflow-y: auto;
      }

      .ed-entity-list {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
      }
      .ed-entity-btn {
        padding: 3px 6px;
        background: rgba(30,40,60,0.7);
        border: 1px solid #333;
        border-radius: 3px;
        color: #aaa;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        text-transform: capitalize;
        transition: all 0.15s;
      }
      .ed-entity-btn:hover { border-color: #555; color: #ddd; }
      .ed-entity-btn.active { border-color: #00ff41; color: #00ff41; }
      .ed-neutral-btn.active { border-color: #ffcc00; color: #ffcc00; }

      .ed-props {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ed-props label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;
        color: #888;
      }
      .ed-props input, .ed-props select {
        padding: 4px 6px;
        background: rgba(20,30,50,0.9);
        border: 1px solid #444;
        border-radius: 3px;
        color: #ccc;
        font-size: 11px;
        font-family: inherit;
      }

      /* Bottom Bar */
      #editor-bottombar {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 32px;
        background: rgba(10,15,25,0.95);
        border-top: 1px solid #333;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 20px;
      }
      .ed-bottom-group { display: flex; align-items: center; gap: 6px; }
      .ed-bottom-label { color: #888; font-size: 11px; }
      .ed-bottom-label kbd {
        background: rgba(50,60,80,0.8);
        border: 1px solid #555;
        border-radius: 2px;
        padding: 1px 4px;
        font-size: 10px;
        color: #ccc;
      }

      .ed-brush-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        background: rgba(30,40,60,0.8);
        border: 1px solid #444;
        border-radius: 3px;
        color: #aaa;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        transition: all 0.15s;
      }
      .ed-brush-btn:hover { border-color: #666; }
      .ed-brush-btn.selected { border-color: #ffcc00; color: #ffcc00; }

      /* Modal */
      .ed-modal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10010;
      }
      .ed-modal.hidden { display: none; }
      .ed-modal-content {
        background: rgba(15,20,35,0.98);
        border: 1px solid #444;
        border-radius: 6px;
        padding: 20px;
        min-width: 350px;
        max-width: 500px;
        max-height: 70vh;
        overflow-y: auto;
      }
      .ed-modal-content h3 {
        margin: 0 0 12px 0;
        color: #ffcc00;
        font-size: 16px;
      }
      .ed-load-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(30,40,60,0.7);
        border: 1px solid #333;
        border-radius: 3px;
        margin-bottom: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ed-load-item:hover { border-color: #00ff41; }
      .ed-load-item-name { font-weight: bold; color: #ccc; }
      .ed-load-item-meta { font-size: 10px; color: #666; }
      .ed-load-item-del {
        background: none;
        border: 1px solid #ff4444;
        color: #ff4444;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  _bindEvents() {
    // Tool buttons
    this.container.querySelectorAll('.ed-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.editor.setTool(tool);
      });
    });

    // Terrain type buttons
    this.container.querySelectorAll('.ed-terrain-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = parseInt(btn.dataset.terrain);
        this.editor.setTerrainType(type);
        this.editor.setTool(TOOLS.PAINT);
      });
    });

    // Team buttons
    this.container.querySelectorAll('.ed-team-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.ed-team-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.editor.setEntityTeam(btn.dataset.team);
      });
    });

    // Entity buttons (buildings)
    this.container.querySelectorAll('#ed-building-list .ed-entity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.ed-entity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.setEntityType(btn.dataset.entity, true);
      });
    });

    // Entity buttons (units)
    this.container.querySelectorAll('#ed-unit-list .ed-entity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.ed-entity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.setEntityType(btn.dataset.entity, false);
      });
    });

    // Neutral structure buttons
    this.container.querySelectorAll('.ed-neutral-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.ed-entity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.setNeutralType(btn.dataset.neutral);
      });
    });

    // Brush size buttons
    this.container.querySelectorAll('.ed-brush-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.ed-brush-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.editor.setBrushSize(parseInt(btn.dataset.brush));
      });
    });

    // Top bar buttons
    document.getElementById('ed-btn-new')?.addEventListener('click', () => {
      document.getElementById('ed-new-modal')?.classList.remove('hidden');
    });

    document.getElementById('ed-new-cancel')?.addEventListener('click', () => {
      document.getElementById('ed-new-modal')?.classList.add('hidden');
    });

    document.getElementById('ed-new-confirm')?.addEventListener('click', () => {
      const size = parseInt(document.getElementById('ed-new-size')?.value || '128');
      this.editor.newMap(size);
      document.getElementById('ed-new-modal')?.classList.add('hidden');
    });

    document.getElementById('ed-btn-save')?.addEventListener('click', () => {
      this._syncPropsFromInputs();
      const id = this.editor.save();
      if (id) {
        this._showToast('Map saved!');
      } else {
        this._showToast('Save failed!', true);
      }
    });

    document.getElementById('ed-btn-load')?.addEventListener('click', () => {
      this._showLoadModal();
    });

    document.getElementById('ed-load-cancel')?.addEventListener('click', () => {
      document.getElementById('ed-load-modal')?.classList.add('hidden');
    });

    document.getElementById('ed-btn-export')?.addEventListener('click', () => {
      this._syncPropsFromInputs();
      this.editor.exportFile();
      this._showToast('Exported!');
    });

    document.getElementById('ed-btn-import')?.addEventListener('click', () => {
      this.editor.importFile().then(() => {
        this.updateMapProperties();
        this._showToast('Imported!');
      }).catch(e => this._showToast('Import failed: ' + e.message, true));
    });

    document.getElementById('ed-btn-testplay')?.addEventListener('click', () => {
      this._syncPropsFromInputs();
      this.editor.testPlay();
    });

    document.getElementById('ed-btn-exit')?.addEventListener('click', () => {
      this.editor.exit();
    });

    // Map properties inputs
    document.getElementById('ed-prop-name')?.addEventListener('input', (e) => {
      this.editor.mapName = e.target.value;
      document.getElementById('ed-map-title').textContent = e.target.value || 'Untitled Map';
    });

    document.getElementById('ed-prop-desc')?.addEventListener('input', (e) => {
      this.editor.mapDescription = e.target.value;
    });

    document.getElementById('ed-prop-size')?.addEventListener('change', (e) => {
      const newSize = parseInt(e.target.value);
      if (newSize !== this.editor.mapSize) {
        this.editor.newMap(newSize);
      }
    });
  }

  _syncPropsFromInputs() {
    const nameInput = document.getElementById('ed-prop-name');
    const descInput = document.getElementById('ed-prop-desc');
    if (nameInput) this.editor.mapName = nameInput.value;
    if (descInput) this.editor.mapDescription = descInput.value;
  }

  _showLoadModal() {
    const modal = document.getElementById('ed-load-modal');
    const list = document.getElementById('ed-load-list');
    if (!modal || !list) return;

    // Build list of maps
    const savedMaps = MapSerializer.listSavedMaps();
    const exampleMaps = getExampleMapList();

    let html = '';

    // Example maps section
    if (exampleMaps.length > 0) {
      html += '<div style="color:#888;font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Example Maps</div>';
      for (const m of exampleMaps) {
        html += `
          <div class="ed-load-item" data-load-id="${m.id}">
            <div>
              <div class="ed-load-item-name">${m.name}</div>
              <div class="ed-load-item-meta">${m.description || ''} (${m.size}x${m.size})</div>
            </div>
          </div>
        `;
      }
    }

    // Saved maps section
    if (savedMaps.length > 0) {
      html += '<div style="color:#888;font-size:10px;margin:12px 0 6px 0;text-transform:uppercase;letter-spacing:1px;">Your Maps</div>';
      for (const m of savedMaps) {
        html += `
          <div class="ed-load-item" data-load-id="${m.id}">
            <div>
              <div class="ed-load-item-name">${m.name}</div>
              <div class="ed-load-item-meta">${m.size}x${m.size} - ${new Date(m.createdAt).toLocaleDateString()}</div>
            </div>
            <button class="ed-load-item-del" data-delete-id="${m.id}" title="Delete">X</button>
          </div>
        `;
      }
    }

    if (!html) {
      html = '<div style="color:#666;text-align:center;padding:20px;">No saved maps yet.</div>';
    }

    list.innerHTML = html;

    // Bind load events
    list.querySelectorAll('.ed-load-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('ed-load-item-del')) return;
        const id = item.dataset.loadId;
        this.editor.loadMap(id);
        modal.classList.add('hidden');
        this._showToast('Map loaded!');
      });
    });

    // Bind delete events
    list.querySelectorAll('.ed-load-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        MapSerializer.deleteFromLocalStorage(id);
        this._showLoadModal(); // Refresh
      });
    });

    modal.classList.remove('hidden');
  }

  _showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 20px;
      background: ${isError ? 'rgba(255,50,50,0.9)' : 'rgba(0,200,65,0.9)'};
      color: white;
      border-radius: 4px;
      font-size: 13px;
      font-family: sans-serif;
      z-index: 10020;
      pointer-events: none;
      transition: opacity 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 1500);
    setTimeout(() => { toast.remove(); }, 2000);
  }

  // ===================== State Updates =====================

  updateToolState() {
    // Update tool buttons
    this.container.querySelectorAll('.ed-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === this.editor.currentTool);
    });

    // Update terrain type buttons
    this.container.querySelectorAll('.ed-terrain-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.terrain) === this.editor.selectedTerrainType);
    });

    // Update tool info
    const toolInfo = document.getElementById('ed-tool-info');
    if (toolInfo) {
      const toolNames = {
        select: 'Select',
        raise: 'Raise Terrain',
        lower: 'Lower Terrain',
        paint: 'Paint: ' + TERRAIN_TYPE_NAMES[this.editor.selectedTerrainType],
        water: 'Paint Water',
        trees: 'Place Trees',
        place_entity: 'Place Entity: ' + (this.editor.selectedEntityType || 'none'),
        place_resource: 'Place Resource Node',
        place_start: 'Place Start Position',
        place_neutral: 'Place Neutral: ' + (this.editor.selectedNeutralType || 'none'),
        erase: 'Erase'
      };
      toolInfo.textContent = 'Tool: ' + (toolNames[this.editor.currentTool] || this.editor.currentTool);
    }
  }

  updateBrushInfo() {
    this.container.querySelectorAll('.ed-brush-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.brush) === this.editor.brushSize);
    });
  }

  updateMapProperties() {
    const nameInput = document.getElementById('ed-prop-name');
    const descInput = document.getElementById('ed-prop-desc');
    const sizeSelect = document.getElementById('ed-prop-size');
    const title = document.getElementById('ed-map-title');

    if (nameInput) nameInput.value = this.editor.mapName;
    if (descInput) descInput.value = this.editor.mapDescription;
    if (sizeSelect) sizeSelect.value = String(this.editor.mapSize);
    if (title) title.textContent = this.editor.mapName || 'Untitled Map';
  }

  show() {
    if (this.container) this.container.classList.remove('hidden');
  }

  hide() {
    if (this.container) this.container.classList.add('hidden');
  }

  destroy() {
    if (this.container) this.container.remove();
    this.container = null;
  }
}
