/**
 * MapSerializer - Serialize/deserialize custom maps for the Warzone map editor.
 * Handles saving to localStorage, exporting to .wzmap JSON, and importing.
 */

const MAP_VERSION = 1;
const MAX_LOCAL_MAPS = 20;
const STORAGE_KEY = 'warzone_custom_maps';
const STORAGE_INDEX_KEY = 'warzone_custom_map_index';

export class MapSerializer {

  /**
   * Serialize the full editor state into a portable JSON-friendly object.
   */
  static serializeMap(editorState) {
    const { mapName, mapDescription, mapSize, author, heightData, terrainTypeGrid,
            waterZones, treePositions, entities, resourceNodes, playerStartPositions,
            neutralStructures } = editorState;

    // Compress heightmap: round to 2 decimals, store as flat array
    const flatHeight = [];
    for (let z = 0; z <= mapSize; z++) {
      for (let x = 0; x <= mapSize; x++) {
        flatHeight.push(Math.round((heightData[z]?.[x] || 0) * 100) / 100);
      }
    }

    // Compress terrain type grid
    const flatTerrain = [];
    for (let z = 0; z < mapSize; z++) {
      for (let x = 0; x < mapSize; x++) {
        flatTerrain.push(terrainTypeGrid[z]?.[x] || 0);
      }
    }

    // RLE compress the terrain type grid (many adjacent cells are the same)
    const rleTerrainTypes = MapSerializer._rleEncode(flatTerrain);

    return {
      version: MAP_VERSION,
      metadata: {
        name: mapName || 'Untitled Map',
        description: mapDescription || '',
        author: author || 'Anonymous',
        size: mapSize,
        createdAt: new Date().toISOString()
      },
      heightmap: flatHeight,
      terrainTypes: rleTerrainTypes,
      waterZones: (waterZones || []).map(w => ({ x: w.x, z: w.z })),
      trees: (treePositions || []).map(t => ({ x: t.x, z: t.z, scale: Math.round((t.scale || 1) * 100) / 100 })),
      entities: (entities || []).map(e => ({
        type: e.type,
        team: e.team,
        x: Math.round(e.x * 10) / 10,
        z: Math.round(e.z * 10) / 10,
        isBuilding: !!e.isBuilding
      })),
      resourceNodes: (resourceNodes || []).map(r => ({
        x: Math.round(r.x * 10) / 10,
        z: Math.round(r.z * 10) / 10
      })),
      playerStarts: (playerStartPositions || []).map(p => ({
        team: p.team,
        x: Math.round(p.x * 10) / 10,
        z: Math.round(p.z * 10) / 10
      })),
      neutralStructures: (neutralStructures || []).map(n => ({
        type: n.type,
        x: Math.round(n.x * 10) / 10,
        z: Math.round(n.z * 10) / 10
      }))
    };
  }

  /**
   * Deserialize a JSON map object back into an editor state.
   */
  static deserializeMap(json) {
    if (!json || json.version !== MAP_VERSION) {
      console.warn('Map version mismatch or invalid map data');
      // Try to load anyway for forward compat
    }

    const meta = json.metadata || {};
    const mapSize = meta.size || 128;

    // Rebuild heightmap 2D array
    const heightData = [];
    const flat = json.heightmap || [];
    for (let z = 0; z <= mapSize; z++) {
      heightData[z] = new Float32Array(mapSize + 1);
      for (let x = 0; x <= mapSize; x++) {
        heightData[z][x] = flat[z * (mapSize + 1) + x] || 0;
      }
    }

    // Rebuild terrain type grid
    const flatTerrain = MapSerializer._rleDecode(json.terrainTypes || []);
    const terrainTypeGrid = [];
    for (let z = 0; z < mapSize; z++) {
      terrainTypeGrid[z] = new Uint8Array(mapSize);
      for (let x = 0; x < mapSize; x++) {
        terrainTypeGrid[z][x] = flatTerrain[z * mapSize + x] || 0;
      }
    }

    return {
      mapName: meta.name || 'Untitled Map',
      mapDescription: meta.description || '',
      mapSize: mapSize,
      author: meta.author || 'Anonymous',
      heightData,
      terrainTypeGrid,
      waterZones: json.waterZones || [],
      treePositions: (json.trees || []).map(t => ({ x: t.x, z: t.z, scale: t.scale || 1 })),
      entities: (json.entities || []).map(e => ({
        type: e.type,
        team: e.team,
        x: e.x,
        z: e.z,
        isBuilding: !!e.isBuilding
      })),
      resourceNodes: json.resourceNodes || [],
      playerStartPositions: json.playerStarts || [],
      neutralStructures: json.neutralStructures || []
    };
  }

  /**
   * Convert a serialized map into the format the game engine expects for gameplay.
   * Returns an object that can be passed to Terrain constructor or used to override terrain.
   */
  static exportForGameplay(json) {
    const state = MapSerializer.deserializeMap(json);
    return {
      mapName: state.mapName,
      mapSize: state.mapSize,
      heightData: state.heightData,
      terrainTypeGrid: state.terrainTypeGrid,
      treePositions: state.treePositions,
      waterZones: state.waterZones,
      entities: state.entities,
      resourceNodes: state.resourceNodes,
      playerStarts: state.playerStartPositions,
      neutralStructures: state.neutralStructures,
      isCustomMap: true
    };
  }

  // ---- localStorage operations ----

  /**
   * Save a map to localStorage. Returns the save slot key.
   */
  static saveToLocalStorage(editorState) {
    const serialized = MapSerializer.serializeMap(editorState);
    const mapId = 'map_' + Date.now();

    try {
      // Load index
      const index = JSON.parse(localStorage.getItem(STORAGE_INDEX_KEY) || '[]');

      // Enforce limit
      while (index.length >= MAX_LOCAL_MAPS) {
        const oldest = index.shift();
        localStorage.removeItem(STORAGE_KEY + '_' + oldest.id);
      }

      // Save map data
      localStorage.setItem(STORAGE_KEY + '_' + mapId, JSON.stringify(serialized));

      // Update index
      index.push({
        id: mapId,
        name: serialized.metadata.name,
        size: serialized.metadata.size,
        createdAt: serialized.metadata.createdAt
      });
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));

      return mapId;
    } catch (e) {
      console.error('Failed to save map to localStorage:', e);
      return null;
    }
  }

  /**
   * Overwrite an existing saved map in localStorage.
   */
  static updateInLocalStorage(mapId, editorState) {
    const serialized = MapSerializer.serializeMap(editorState);

    try {
      localStorage.setItem(STORAGE_KEY + '_' + mapId, JSON.stringify(serialized));

      // Update index entry
      const index = JSON.parse(localStorage.getItem(STORAGE_INDEX_KEY) || '[]');
      const entry = index.find(e => e.id === mapId);
      if (entry) {
        entry.name = serialized.metadata.name;
        entry.size = serialized.metadata.size;
        entry.createdAt = serialized.metadata.createdAt;
        localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
      }

      return mapId;
    } catch (e) {
      console.error('Failed to update map in localStorage:', e);
      return null;
    }
  }

  /**
   * Load a map from localStorage by its id.
   */
  static loadFromLocalStorage(mapId) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + '_' + mapId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load map from localStorage:', e);
      return null;
    }
  }

  /**
   * Delete a map from localStorage.
   */
  static deleteFromLocalStorage(mapId) {
    try {
      localStorage.removeItem(STORAGE_KEY + '_' + mapId);
      const index = JSON.parse(localStorage.getItem(STORAGE_INDEX_KEY) || '[]');
      const filtered = index.filter(e => e.id !== mapId);
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete map:', e);
    }
  }

  /**
   * Get list of all saved custom maps (just metadata).
   */
  static listSavedMaps() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_INDEX_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  // ---- File export/import ----

  /**
   * Export a map as a downloadable .wzmap JSON file.
   */
  static exportToFile(editorState) {
    const serialized = MapSerializer.serializeMap(editorState);
    const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (serialized.metadata.name || 'map').replace(/[^a-zA-Z0-9_-]/g, '_') + '.wzmap';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import a map from a .wzmap file. Returns a Promise resolving to the parsed JSON.
   */
  static importFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.wzmap,.json';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('No file selected')); return; }

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result);
            resolve(json);
          } catch (e) {
            reject(new Error('Invalid map file format'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      input.click();
    });
  }

  // ---- Compression helpers ----

  static _rleEncode(arr) {
    if (arr.length === 0) return [];
    const result = [];
    let current = arr[0];
    let count = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === current) {
        count++;
      } else {
        result.push(count, current);
        current = arr[i];
        count = 1;
      }
    }
    result.push(count, current);
    return result;
  }

  static _rleDecode(rle) {
    const result = [];
    for (let i = 0; i < rle.length; i += 2) {
      const count = rle[i];
      const value = rle[i + 1];
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
    }
    return result;
  }
}
