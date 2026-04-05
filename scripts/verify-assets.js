#!/usr/bin/env node

/**
 * verify-assets.js - Asset pipeline verification script
 *
 * Reads the AssetManager.js MANIFEST and verifies that each referenced
 * model file exists on disk. Reports missing models, total counts, and file sizes.
 *
 * Usage: node scripts/verify-assets.js
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Parse the MANIFEST from AssetManager.js
function parseManifest() {
  const assetManagerPath = resolve(PROJECT_ROOT, 'js/rendering/AssetManager.js');
  const source = readFileSync(assetManagerPath, 'utf-8');

  // Extract the MANIFEST block
  const manifestMatch = source.match(/static\s+MANIFEST\s*=\s*\{([\s\S]*?)\};/);
  if (!manifestMatch) {
    console.error('ERROR: Could not find MANIFEST in AssetManager.js');
    process.exit(1);
  }

  const manifestBlock = manifestMatch[1];
  const entries = {};

  // Parse each entry: key: { path: '...', targetSize: N }
  const entryRegex = /(\w+)\s*:\s*\{\s*path\s*:\s*'([^']+)'\s*,\s*targetSize\s*:\s*([\d.]+)\s*\}/g;
  let match;
  while ((match = entryRegex.exec(manifestBlock)) !== null) {
    entries[match[1]] = {
      path: match[2],
      targetSize: parseFloat(match[3])
    };
  }

  return entries;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function categorize(key) {
  if (key.startsWith('tree_')) return 'environment';
  if (key.startsWith('unit_')) return 'unit';
  if (key.startsWith('bld_')) return 'building';
  return 'other';
}

function main() {
  console.log('='.repeat(70));
  console.log('  WARZONE Asset Verification Report');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70));
  console.log();

  const manifest = parseManifest();
  const keys = Object.keys(manifest);

  if (keys.length === 0) {
    console.error('ERROR: No entries found in MANIFEST');
    process.exit(1);
  }

  const found = [];
  const missing = [];
  let totalSize = 0;

  const categories = { environment: [], unit: [], building: [], other: [] };

  for (const key of keys) {
    const entry = manifest[key];
    const fullPath = resolve(PROJECT_ROOT, entry.path);
    const category = categorize(key);
    const exists = existsSync(fullPath);

    if (exists) {
      const stat = statSync(fullPath);
      const size = stat.size;
      totalSize += size;
      found.push({ key, path: entry.path, size, category, targetSize: entry.targetSize });
      categories[category].push({ key, path: entry.path, size, status: 'OK' });
    } else {
      missing.push({ key, path: entry.path, category, targetSize: entry.targetSize });
      categories[category].push({ key, path: entry.path, size: 0, status: 'MISSING' });
    }
  }

  // Summary
  console.log(`  Total entries in MANIFEST: ${keys.length}`);
  console.log(`  Models found:             ${found.length}`);
  console.log(`  Models missing:           ${missing.length}`);
  console.log(`  Total file size:          ${formatBytes(totalSize)}`);
  console.log();

  // Category breakdown
  console.log('-'.repeat(70));
  console.log('  CATEGORY BREAKDOWN');
  console.log('-'.repeat(70));

  for (const [cat, items] of Object.entries(categories)) {
    const catFound = items.filter(i => i.status === 'OK').length;
    const catTotal = items.length;
    const catSize = items.reduce((sum, i) => sum + i.size, 0);
    console.log(`  ${cat.toUpperCase().padEnd(14)} ${catFound}/${catTotal} loaded    ${formatBytes(catSize)}`);
  }
  console.log();

  // Detailed report - found models
  console.log('-'.repeat(70));
  console.log('  FOUND MODELS');
  console.log('-'.repeat(70));

  for (const item of found) {
    const sizeStr = formatBytes(item.size).padStart(10);
    console.log(`  [OK]      ${item.key.padEnd(24)} ${sizeStr}  ${item.path}`);
  }
  console.log();

  // Missing models
  if (missing.length > 0) {
    console.log('-'.repeat(70));
    console.log('  MISSING MODELS (will fall back to procedural geometry)');
    console.log('-'.repeat(70));

    for (const item of missing) {
      console.log(`  [MISS]    ${item.key.padEnd(24)}             ${item.path}`);
    }
    console.log();
  }

  // Unique file paths (some manifest entries share the same file)
  const uniquePaths = new Set(found.map(f => f.path));
  const uniqueMissing = new Set(missing.map(m => m.path));
  console.log('-'.repeat(70));
  console.log('  FILE STATISTICS');
  console.log('-'.repeat(70));
  console.log(`  Unique model files referenced: ${uniquePaths.size + uniqueMissing.size}`);
  console.log(`  Unique files on disk:          ${uniquePaths.size}`);
  console.log(`  Unique files missing:          ${uniqueMissing.size}`);
  console.log(`  Shared model files:            ${keys.length - (uniquePaths.size + uniqueMissing.size)} entries share files`);
  console.log();

  // Exit code
  if (missing.length > 0) {
    console.log(`WARNING: ${missing.length} model(s) not found. These entities will use procedural fallback geometry.`);
    process.exit(0); // Not an error -- fallback is expected behavior
  } else {
    console.log('All models verified successfully.');
  }

  console.log('='.repeat(70));
}

main();
