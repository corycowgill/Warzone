# Warzone Constitution

> Warzone is a browser-based 3D Real-Time Strategy game set in an alternate World War II, built with Three.js and pure ES modules. Six asymmetric nations wage war across land, sea, and air — playable instantly in any modern browser with zero install. Inspired by StarCraft, Warcraft, Command & Conquer Red Alert, and Age of Empires. The goal is to deliver a fully polished, market-ready RTS experience that rivals classic PC titles, all running in a browser tab.

**Ralph Wiggum Version:** `6022995317363dc3dba3aa0100dc3e40ed83dfff`

---

## Context Detection

**Ralph Loop Mode** (started by ralph-loop*.sh):
- Pick highest priority incomplete spec from `specs/`
- Implement, test, commit, push
- Output `<promise>DONE</promise>` only when 100% complete
- Output `<promise>ALL_DONE</promise>` when no work remains

**Interactive Mode** (normal conversation):
- Be helpful, guide decisions, create specs

---

## Core Principles

### I. Fun First, Then Polish
Gameplay feel and strategic depth take absolute priority. Every system must serve the question: "Is this fun to play?" If a feature doesn't make the game more enjoyable or strategically interesting, it doesn't ship. Visual polish and technical elegance follow gameplay.

### II. Quality Over Speed
Every feature should be solid and polished before moving on. No half-implementations. Acceptance criteria must be fully met before marking a spec complete. A smaller game that works perfectly beats a large game full of bugs.

### III. Move Fast, Iterate
Ship rough working versions quickly, then refine based on testing and feedback. Don't over-plan — implement, test, learn, improve. Each iteration should produce a playable improvement.

---

## Technical Stack

- **Renderer:** Three.js v0.172.0 (via CDN importmap, no build tools)
- **Language:** Vanilla JavaScript ES modules
- **UI:** HTML/CSS with classList toggling (`.hidden { display: none !important; }`)
- **Server:** Node.js HTTP server (server.js, port 8000)
- **Architecture:** EventBus pub/sub, Entity → Unit/Building hierarchy
- **Systems:** CombatSystem, CommandSystem, PathfindingSystem (A*), ProductionSystem, ResourceSystem, SelectionManager, SoundManager (Web Audio)
- **AI:** AIController with grid-based building placement
- **42 JS files** across: core/, rendering/, world/, entities/, units/, buildings/, systems/, ai/, ui/

---

## Key Project Documents

- `docs/GAME_DESIGN_DOCUMENT.md` — Comprehensive GDD with faction design, unit roster, economy, tech tree
- `docs/GAME_CRITIQUE.md` — External critic review (2.4/10) with 20 prioritized improvements
- `docs/ARCHITECTURE_PROPOSAL.md` — Engine architecture upgrade plan
- `docs/ART_ASSET_MANIFEST.md` — 3D model sources and visual style guide

**Always read these docs before starting work on any spec.** They define what the game should become.

---

## Autonomy

YOLO Mode: ENABLED
Git Autonomy: ENABLED

---

## Specs

Specs live in `specs/` as markdown files. Pick the highest priority incomplete spec (lower number = higher priority). A spec is incomplete if it lacks `## Status: COMPLETE`.

Spec template: https://raw.githubusercontent.com/github/spec-kit/refs/heads/main/templates/spec-template.md

When all specs are complete, re-verify a random one before signaling done.

---

## NR_OF_TRIES

Track attempts per spec via `<!-- NR_OF_TRIES: N -->` at the bottom of the spec file. Increment each attempt. At 10+, the spec is too hard — split it into smaller specs.

---

## History

Append a 1-line summary to `history.md` after each spec completion. For details, create `history/YYYY-MM-DD--spec-name.md` with lessons learned, decisions made, and issues encountered. Check history before starting work on any spec.

---

## Completion Logs

After each spec, create `completion_log/YYYY-MM-DD--HH-MM-SS--spec-name.md` with a brief summary.

---

## Completion Signal

All acceptance criteria verified, tests pass, changes committed and pushed → output `<promise>DONE</promise>`. Never output this until truly complete.
