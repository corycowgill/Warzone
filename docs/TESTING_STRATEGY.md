# Warzone RTS - Testing Strategy

## Overview

This document describes the testing strategy for Warzone, a browser-based 3D RTS game built with Three.js and vanilla ES modules. The game has ~97 features across 42+ JS files with no build tools.

## Test Framework: Vitest

We use **Vitest** because:
- Native ES module support (the project uses `import`/`export` throughout)
- Fast execution with parallel test running
- Built-in mocking, spying, and coverage via `vi`
- Compatible with the project's zero-build-tool philosophy
- V8 coverage provider for accurate line/branch coverage

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode (re-runs on file changes)
npm run test:coverage # Run with V8 coverage report
```

### Configuration

See `vitest.config.js`. Key settings:
- Three.js is aliased to `tests/mocks/three.js` so tests run in Node without WebGL
- Test timeout is 30s to accommodate performance tests
- Coverage targets `js/**/*.js` excluding rendering code

---

## Test Architecture

### Directory Structure

```
tests/
  mocks/
    three.js          # Mock Three.js (Vector3, Mesh, Scene, etc.)
    game.js           # Mock Game object, units, buildings
  unit/
    constants.test.js        # Data integrity validation
    eventbus.test.js         # Pub/sub system
    resource-system.test.js  # Economy/income logic
    production-system.test.js# Unit production & queuing
    building.test.js         # Building entity logic
  functional/
    game-flow.test.js        # End-to-end integration scenarios
  performance/
    entity-scale.test.js     # Scaling & memory benchmarks
```

### Mocking Strategy

#### Three.js Mock (`tests/mocks/three.js`)

The game imports `three` via importmap (CDN) for rendering. Tests replace it with a lightweight mock providing:
- `Vector2`, `Vector3`, `Color` with full math operations
- `Object3D`, `Group`, `Mesh`, `Scene` with parent/child hierarchy
- Geometry and Material stubs that implement `dispose()`
- `Raycaster`, `WebGLRenderer`, `PerspectiveCamera` stubs

This approach lets us test all game logic without a GPU or browser.

#### Game Context Mock (`tests/mocks/game.js`)

Provides `createMockGame()`, `createMockUnit()`, and `createMockBuilding()` factories that mirror the real game objects with:
- EventBus instance
- Team data (SP, MU, nation)
- Entity arrays with `getUnits()` and `getBuildings()` helpers
- Configurable overrides for any property

---

## Test Categories

### 1. Unit Tests (Core Logic)

**What they test:** Individual functions and classes in isolation.

| File | Tests | Coverage |
|------|-------|----------|
| `constants.test.js` | UNIT_STATS, BUILDING_STATS, DAMAGE_MODIFIERS, TECH_TREE integrity | Data consistency |
| `eventbus.test.js` | on/off/emit, multiple listeners, cleanup | 100% of EventBus.js |
| `resource-system.test.js` | canAfford, spend, income ticks, building bonuses, nation bonuses | ResourceSystem.js |
| `production-system.test.js` | requestProduction, completeProduction, tech requirements, pop cap | ProductionSystem.js |
| `building.test.js` | canProduce, queueUnit, update, cancelQueueItem, getFullQueue | Building entity |

**Key patterns:**
- Each system test creates a minimal game context with just the dependencies needed
- EventBus events are verified with `vi.fn()` spies
- Edge cases: zero resources, pop cap, missing tech requirements

### 2. Functional/Integration Tests

**What they test:** Multi-system interactions end-to-end.

| Scenario | Systems Involved |
|----------|-----------------|
| Full production flow | ProductionSystem + ResourceSystem + Building + EventBus |
| Queue 5 units | ProductionSystem + Building queue management |
| Tech tree gating | ProductionSystem + Building requirements |
| Pop cap enforcement | ProductionSystem + entity counting |
| Economy over time | ResourceSystem + Building income |
| Resource drain | ResourceSystem + ProductionSystem |
| Combat damage calc | DAMAGE_MODIFIERS + armor + veterancy |
| Tech tree integrity | TECH_TREE + BUILDING_STATS cross-validation |

### 3. Performance Tests

**What they test:** Scalability and performance bounds.

| Benchmark | Target |
|-----------|--------|
| Create 100 entities | < 10ms |
| Create 500 entities | < 50ms |
| Create 1000 entities | < 100ms |
| Filter 1000 entities by team | < 5ms |
| 500 damage calculations | < 10ms |
| 10,000 EventBus emissions | < 50ms |
| 100 listeners on one event | < 100ms for 1000 emissions |
| Entity cleanup (dead removal) | Verify no leaks |
| EventBus listener cleanup | Verify array emptied after off() |

---

## UX/UI Testing Strategy

### Current Approach: Manual + DOM Inspection

The HUD is standard HTML/CSS overlaid on a Three.js canvas. UI testing options:

### Recommended: Playwright for Browser Automation

**Why Playwright over Puppeteer:**
- Multi-browser support (Chromium, Firefox, WebKit)
- Better async handling and auto-waiting
- Built-in test runner with assertions
- Supports clicking DOM elements (HUD buttons) and canvas coordinates

**What Playwright can test:**
1. **DOM-based HUD elements** (most of the UI):
   - Resource display updates correctly
   - Production buttons appear/disappear on building selection
   - Build menu opens/closes with B key
   - Production queue shows progress
   - Notifications appear and fade

2. **Canvas interactions** via coordinate clicking:
   - Building placement on map
   - Unit selection via click
   - Right-click to move units
   - Box selection drag

3. **Visual regression** via screenshot comparison:
   - Capture game state screenshots at key moments
   - Compare against baseline images to detect layout regressions
   - Particularly useful for the HUD overlap bugs

### Playwright Setup (Future)

```bash
npm install -D @playwright/test
npx playwright install
```

Example test structure:
```javascript
// tests/e2e/hud.spec.js
import { test, expect } from '@playwright/test';

test('production panel shows when building selected', async ({ page }) => {
  await page.goto('http://localhost:8000');
  // Start a game...
  // Click on a barracks...
  const panel = page.locator('#production-panel');
  await expect(panel).toBeVisible();
  // Click infantry button
  await panel.locator('button:has-text("Infantry")').click();
  // Verify resources decreased
});
```

### Alternative: Canvas-Level Testing

For testing Three.js rendering (unit positions, selection boxes, etc.):
- Use synthetic `MouseEvent` dispatch on the canvas
- Assert game state changes rather than visual output
- Example: dispatch click at canvas center, verify `selectionManager.getSelected()` changed

### Accessibility Testing

- Use `axe-core` integration with Playwright to check HUD elements
- Verify keyboard navigation works for all menus
- Check color contrast ratios in the CSS

---

## What to Test Next

### Priority 1 (High Impact)
- [ ] CombatSystem: full damage pipeline with modifiers, armor, veterancy, retreat
- [ ] PathfindingSystem: A* pathfinding correctness and domain filtering
- [ ] AIController: build order logic, threat assessment, counter-building
- [ ] SelectionManager: click selection, box selection, multi-select

### Priority 2 (Medium Impact)
- [ ] FogOfWar: visibility states, reveal/hide logic
- [ ] WaveSystem (survival mode): wave progression, difficulty scaling
- [ ] NationAbilitySystem: cooldowns, activation, effects
- [ ] WeatherSystem: weather effects on combat

### Priority 3 (UI/Polish)
- [ ] HUD: Playwright E2E tests for all panels
- [ ] Visual regression tests for HUD layout
- [ ] Minimap rendering accuracy
- [ ] Sound manager (mock Web Audio API)

---

## Memory Leak Detection

### Heap Snapshot Pattern

```javascript
// In Playwright E2E test
test('no memory leak after game restart', async ({ page }) => {
  await page.goto('http://localhost:8000');
  // Play a game, restart
  const heapBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize);
  // Play again, restart again
  const heapAfter = await page.evaluate(() => performance.memory?.usedJSHeapSize);
  // Heap should not grow more than 20%
  expect(heapAfter).toBeLessThan(heapBefore * 1.2);
});
```

### Entity Leak Detection

The performance tests already validate:
- Dead entities are properly removed from arrays
- EventBus listeners are cleaned up after `off()`
- No orphaned references after entity destruction

### Common Leak Sources to Watch
- Event listeners not removed on game restart (`EventBus.off()`)
- Three.js geometries/materials not `dispose()`d
- DOM elements appended but never removed (notifications, tooltips)
- `setInterval`/`setTimeout` not cleared

---

## CI/CD Integration

For automated testing in a CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## Bug Fixes Applied (This Session)

### Bug 1: Production Buttons Unclickable (Critical)
**Root cause:** `updateProductionPanel()` called `showSingleEntityInfo()` every frame (~60fps), which rebuilt the entire selection panel HTML and all production buttons. Click events fired on buttons that were immediately destroyed and recreated.

**Fix:** Replaced per-frame full rebuild with `_updateBuildingInfoLive()` that only updates dynamic data (HP bars, production progress, button states) via DOM queries, preserving event handlers.

### Bug 2: HUD Panel Overlaps
**Root cause:** The production overview panel (`z-index: 101`) overlapped the selection panel. Alert notifications (`z-index: 200, right: 10px`) overlapped the production panel (`right: 10px`).

**Fix:** 
- Reduced production overview panel z-index to 15 and shortened its bottom bound
- Moved alert container to `right: 240px` to avoid overlapping the production panel

### Bug 3: Click-Through on HUD Panels
**Root cause:** Clicks on HUD panel buttons (production, command card) propagated to the canvas behind them, triggering unit deselection via `InputManager`.

**Fix:** Added `stopPropagation()` on `mousedown`, `mouseup`, and `click` events for all major HUD panels (production panel, build menu, command card, selection panel, resource bar).
