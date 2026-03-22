# WARZONE -- Game Design Document

**Version:** 1.0
**Platform:** Web Browser (Three.js / WebGL)
**Genre:** 3D Real-Time Strategy
**Target Audience:** RTS enthusiasts, competitive strategy gamers, casual browser gamers

---

## Table of Contents

1. [Game Vision](#1-game-vision)
2. [Faction Design](#2-faction-design)
3. [Unit Roster](#3-unit-roster)
4. [Building Roster](#4-building-roster)
5. [Economy Design](#5-economy-design)
6. [Tech Tree](#6-tech-tree)
7. [Combat Mechanics](#7-combat-mechanics)
8. [Map Design](#8-map-design)
9. [Game Modes](#9-game-modes)
10. [UI/UX Design](#10-uiux-design)
11. [Win Conditions](#11-win-conditions)
12. [AI Design](#12-ai-design)
13. [Audio Design](#13-audio-design)
14. [Polish Features](#14-polish-features)
15. [Implementation Priorities](#15-implementation-priorities)

---

## 1. Game Vision

### Elevator Pitch

Warzone is a browser-based 3D RTS set in an alternate World War II where six nations wage war across land, sea, and air. Unlike traditional RTS games that require downloads and installs, Warzone delivers a full competitive RTS experience inside a browser tab -- no install, no launcher, just click and command.

### What Makes Warzone Unique

1. **Zero-friction access.** Play instantly in any modern browser. Share a match link and your friend is in-game in seconds. This is the core competitive advantage over StarCraft, Age of Empires, and every other RTS that demands a client install.

2. **Tri-domain warfare.** Every match plays across land, sea, and air simultaneously. The map is designed so that naval and air power are not optional side-shows but integral paths to victory. You cannot win by massing one domain alone -- amphibious assaults, carrier air strikes, and submarine blockades are core strategic tools.

3. **Six asymmetric nations.** Each nation shares a common unit roster but has unique faction abilities, stat bonuses, and a signature superweapon that change how you play. Choosing America vs. Japan is not cosmetic -- it reshapes your opener, your army composition, and your win condition.

4. **Dual-resource economy with map control.** Two resources -- Supply Points (SP) for general production and Munitions (MU) for advanced tech and abilities -- force players to choose between economic expansion and military aggression. Resource nodes are scattered across the map, rewarding map control and punishing turtling.

5. **Deep veterancy system.** Units that survive combat gain experience, increasing their stats and eventually unlocking a special ability. Protecting elite squads becomes a micro-level decision that intersects with macro-level strategy.

### Design Pillars

- **Accessible, not shallow.** Easy to learn the basics (select, move, attack), deep enough to reward 500 hours of play.
- **Every match tells a story.** Comebacks are possible. Snowball mechanics are tempered by comeback mechanics (salvage income, defensive bonuses, superweapon timers).
- **Spectacle in the browser.** Even with geometric shapes as placeholder art, combat should *feel* impactful through particles, screen shake, sound design, and unit animations.
- **Respect the player's time.** Average match length target: 12-20 minutes. No hour-long slogs.

---

## 2. Faction Design

All six nations share the same unit roster (see Section 3) but each has:
- A **passive bonus** that is always active
- An **active ability** on a cooldown
- A **unique superweapon** unlocked at Tier 3

### Allied Nations

#### AMERICA -- "Arsenal of Democracy"
| Element | Detail |
|---------|--------|
| **Passive:** Industrial Powerhouse | All production buildings produce units 15% faster |
| **Active:** Lend-Lease (120s CD) | Instantly grants 200 SP. Can be used to fund a critical push or recover from a raid. |
| **Superweapon:** Atomic Bomb | Single-target area devastation. 300s charge time. Massive damage in a large radius. Destroys buildings outright. One-shot, must be rebuilt. |
| **Color:** Blue (#3355FF) |
| **Playstyle:** Aggressive macro. Out-produce the enemy. Flood the map with units and use Lend-Lease to sustain pushes. |

#### GREAT BRITAIN -- "The Thin Red Line"
| Element | Detail |
|---------|--------|
| **Passive:** Fortified Positions | All defensive buildings (Bunkers, Turrets) have +25% HP and +15% range |
| **Active:** Naval Supremacy (90s CD) | All naval units gain +30% speed and +20% damage for 20 seconds |
| **Superweapon:** RAF Carpet Bombing | Designate a rectangular area. After a 5-second warning siren, a wave of bombers blankets the area with explosives. 240s charge. |
| **Color:** Green (#33AA33) |
| **Playstyle:** Defensive control. Establish strong positions, use naval dominance to control the waterways, then push with overwhelming firepower. |

#### FRANCE -- "La Resistance"
| Element | Detail |
|---------|--------|
| **Passive:** Entrenched Doctrine | All infantry gain +20% damage when stationary for 3+ seconds (dug in) |
| **Active:** Resistance Network (100s CD) | Reveals all enemy units on the map for 10 seconds (intel sweep) |
| **Superweapon:** Railway Gun "Gustav" | Ultra-long-range cannon that fires 3 shells at a target area. Extreme building damage. 270s charge. |
| **Color:** Blue-violet (#6666FF) |
| **Playstyle:** Information warfare. Use intel to pick favorable fights. Infantry-heavy compositions that hold ground effectively. |

### Axis Nations

#### JAPAN -- "Empire of the Rising Sun"
| Element | Detail |
|---------|--------|
| **Passive:** Bushido Code | All units deal +10% damage when below 50% HP (desperate valor) |
| **Active:** Banzai Charge (80s CD) | Selected infantry units gain +50% speed and +30% damage for 8 seconds but take 20% more damage |
| **Superweapon:** Kamikaze Strike | Launches 5 untargetable planes that dive-bomb a target area. Each deals heavy damage. 250s charge. |
| **Color:** Red (#FF3333) |
| **Playstyle:** Aggressive all-in. Punishes passive play. Strongest when behind, making comebacks terrifying. |

#### GERMANY -- "Blitzkrieg"
| Element | Detail |
|---------|--------|
| **Passive:** Panzer Doctrine | All vehicles (tanks, APCs, SPGs) have +10% speed and +1 armor |
| **Active:** Blitzkrieg (100s CD) | All land units gain +40% speed for 12 seconds. Enables devastating flanking maneuvers. |
| **Superweapon:** V-2 Rocket | Precision strike on a single target. Very high single-target damage. Fast charge (200s) but small radius. Best for sniping key buildings. |
| **Color:** Grey (#666666) |
| **Playstyle:** Armored warfare. Fast, mechanized armies that strike before the enemy can react. Tank-heavy compositions with speed advantages. |

#### AUSTRIA -- "The Iron Crown"
| Element | Detail |
|---------|--------|
| **Passive:** Austro-Hungarian Legacy | Resource depots generate +20% income |
| **Active:** War Economy (110s CD) | For 30 seconds, all unit costs are reduced by 25% |
| **Superweapon:** Siege Mortar "Skoda" | Deploys a massive mortar emplacement anywhere on the map that fires for 15 seconds, then self-destructs. 280s charge. |
| **Color:** Bronze (#CC6633) |
| **Playstyle:** Economic dominance. Out-earn the opponent, overwhelm with superior numbers. War Economy creates explosive production windows. |

---

## 3. Unit Roster

### Design Philosophy

Every unit has a clear role. No unit should be "strictly better" than another -- each has a counter and a situation where it excels. Units are organized into three tiers corresponding to tech requirements.

### Domain Legend
- (L) = Land, (A) = Air, (N) = Naval

### Tier 1 -- Base Units (Available from Barracks / Shipyard)

| # | Unit | Domain | HP | Speed | Damage | Range | Armor | Cost (SP) | Build Time | Role |
|---|------|--------|-----|-------|--------|-------|-------|-----------|------------|------|
| 1 | **Rifleman** | L | 50 | 3 | 8 | 6 | 0 | 50 | 3s | Basic infantry. Cheap, expendable. Good vision. |
| 2 | **Mortar Team** | L | 40 | 2 | 20 | 14 | 0 | 100 | 5s | Indirect fire infantry. High range, slow, fragile. Anti-building. |
| 3 | **Scout Car** | L | 60 | 8 | 5 | 5 | 1 | 75 | 3s | Fast recon. Reveals large area. Cannot attack air. |
| 4 | **Patrol Boat** | N | 80 | 4 | 12 | 8 | 1 | 100 | 4s | Cheap naval unit. Anti-submarine. |

### Tier 2 -- Advanced Units (Require War Factory / Airfield / Shipyard + War Factory)

| # | Unit | Domain | HP | Speed | Damage | Range | Armor | Cost (SP) | Build Time | Role |
|---|------|--------|-----|-------|--------|-------|-------|-----------|------------|------|
| 5 | **Tank** | L | 200 | 4 | 35 | 10 | 3 | 200 | 6s | Main battle unit. Strong vs. vehicles and buildings. |
| 6 | **Anti-Air Half-Track** | L | 100 | 5 | 18 | 12 | 1 | 150 | 5s | Dedicated anti-air. Weak vs. ground. |
| 7 | **APC** | L | 150 | 5 | 10 | 6 | 2 | 125 | 4s | Transports up to 4 infantry. Garrisoned units fire from inside with reduced range. |
| 8 | **Drone** | A | 80 | 7 | 15 | 8 | 0 | 150 | 4s | Fast air scout and harasser. Anti-infantry. |
| 9 | **Fighter Plane** | A | 150 | 10 | 50 | 12 | 1 | 300 | 8s | Air superiority. Strong vs. all air and ground. |
| 10 | **Submarine** | N | 150 | 3 | 80 | 8 | 2 | 350 | 8s | Stealth naval. Invisible unless detected. Devastating vs. large ships. |

### Tier 3 -- Elite Units (Require Tech Lab or specific T3 building)

| # | Unit | Domain | HP | Speed | Damage | Range | Armor | Cost (SP) | Build Time | Role |
|---|------|--------|-----|-------|--------|-------|-------|-----------|------------|------|
| 11 | **Heavy Tank** | L | 400 | 2.5 | 55 | 12 | 6 | 450 | 10s | Slow, devastating siege unit. Crushes infantry. |
| 12 | **Self-Propelled Gun (SPG)** | L | 120 | 3 | 70 | 22 | 1 | 350 | 9s | Artillery. Extreme range, must deploy to fire. Minimum range of 8. |
| 13 | **Bomber** | A | 250 | 6 | 100 | 6 | 2 | 500 | 12s | Area-of-effect air-to-ground. Devastating vs. clusters and buildings. |
| 14 | **Battleship** | N | 400 | 2 | 60 | 18 | 5 | 500 | 10s | Capital ship. Shore bombardment. Anti-naval. |
| 15 | **Carrier** | N | 500 | 1.5 | 10 | 5 | 4 | 600 | 12s | Spawns 3 auto-controlled drone fighters. Mobile airfield. |

### Counter Relationships (Rock-Paper-Scissors Extended)

```
Rifleman  --> counters: Drone, Mortar Team
Mortar    --> counters: Buildings, entrenched infantry
Scout Car --> counters: Infantry (run-over), Artillery (fast flank)
Tank      --> counters: Vehicles, Buildings
AA HT     --> counters: Drone, Fighter, Bomber
APC       --> counters: Nothing directly, enables infantry mobility
Drone     --> counters: Scout Car, Submarine (detection)
Fighter   --> counters: Drone, Bomber, all air
Submarine --> counters: Battleship, Carrier
Heavy Tank--> counters: Tank, Buildings (siege)
SPG       --> counters: Everything at range (if protected)
Bomber    --> counters: Ground blobs, Buildings
Patrol Bt --> counters: Submarine
Battleship--> counters: Ground (shore bombardment), Naval
Carrier   --> counters: Submarine (drone detection), area denial
```

---

## 4. Building Roster

### Design Philosophy

Buildings form the backbone of the economy and tech tree. Strategic placement matters -- turrets near choke points, resource depots near nodes, tech labs protected in the rear.

### Core Buildings

| Building | HP | Cost (SP) | Size | Requires | Function |
|----------|-----|-----------|------|----------|----------|
| **Headquarters (HQ)** | 1000 | -- | 4x4 | -- | Starting building. Produces Riflemen. Generates base income. Losing your HQ is a critical blow. |
| **Barracks** | 400 | 200 | 2x2 | -- | Produces all infantry: Rifleman, Mortar Team. Unlocks T1 tech. |
| **War Factory** | 600 | 400 | 3x3 | Barracks | Produces vehicles: Tank, AA Half-Track, APC, Scout Car. |
| **Airfield** | 500 | 500 | 3x3 | War Factory | Produces air units: Drone, Fighter Plane. |
| **Shipyard** | 500 | 450 | 3x3 | Barracks | Produces naval units: Patrol Boat, Submarine. Must be placed on coast. |

### Economy Buildings

| Building | HP | Cost (SP) | Size | Requires | Function |
|----------|-----|-----------|------|----------|----------|
| **Supply Depot** | 300 | 300 | 2x2 | -- | Passive SP income (+8 SP/s). Place near resource nodes for bonus (+4 SP/s per adjacent node). |
| **Munitions Cache** | 250 | 350 | 2x2 | Barracks | Generates Munitions (MU). Required for upgrades and abilities. +5 MU/s. |
| **Refinery** | 350 | 400 | 2x2 | War Factory | Advanced economy. +12 SP/s. Also allows selling excess MU for SP. |

### Defensive Buildings

| Building | HP | Cost (SP) | Size | Requires | Function |
|----------|-----|-----------|------|----------|----------|
| **Bunker** | 500 | 150 | 1x1 | Barracks | Garrisons 4 infantry. Garrisoned infantry gain +50% range and 75% damage reduction. |
| **Machine Gun Turret** | 300 | 200 | 1x1 | Barracks | Anti-infantry auto-turret. 360-degree arc of fire. |
| **Anti-Air Battery** | 250 | 250 | 1x1 | War Factory | Anti-air turret. Essential for base defense against air raids. |
| **Coastal Gun** | 350 | 300 | 2x2 | Shipyard | Anti-naval turret. Long range, placed on coastline. |
| **Sandbag Wall** | 100 | 25 | 1x1 | -- | Cheap barrier. Blocks pathing, provides cover to adjacent infantry (+25% damage reduction). |
| **Mine Field** | 1 | 75 | 1x1 | Barracks | Invisible. Detonates when enemy land unit crosses. 150 damage in small radius. One-use. |

### Tech Buildings

| Building | HP | Cost (SP/MU) | Size | Requires | Function |
|----------|-----|-------------|------|----------|----------|
| **Tech Lab** | 400 | 500 SP, 100 MU | 2x2 | War Factory | Unlocks T3 units: Heavy Tank, SPG, Bomber, Battleship, Carrier. Unlocks upgrade paths. |
| **Superweapon Facility** | 600 | 800 SP, 200 MU | 4x4 | Tech Lab | Unlocks faction superweapon. Long build time (60s). High-value target. |

### Building Limits

- HQ: 1 per player (cannot be rebuilt if destroyed)
- Barracks: Max 3
- War Factory: Max 2
- Airfield: Max 2
- Shipyard: Max 2
- Supply Depot / Munitions Cache / Refinery: Max 4 each
- Defensive buildings: Max 10 total
- Tech Lab: Max 1
- Superweapon Facility: Max 1

---

## 5. Economy Design

### Two-Resource System

| Resource | Symbol | Generation | Purpose |
|----------|--------|-----------|---------|
| **Supply Points (SP)** | Yellow coin icon | Passive income from HQ, Supply Depots, Refineries, Resource Nodes | Unit production, building construction, basic repairs |
| **Munitions (MU)** | Red shell icon | Passive income from Munitions Caches | Upgrades, unit abilities, superweapons, advanced repairs |

### Income Sources

**Base Income:**
- HQ generates 10 SP/s passively (always, even without depots)
- Each Supply Depot: +8 SP/s
- Each Refinery: +12 SP/s
- Each Munitions Cache: +5 MU/s

**Map Resource Nodes:**
- Scattered across the map (6-8 per map)
- Supply Nodes: Place a Supply Depot within 15 units to gain +4 SP/s bonus
- Munitions Nodes: Place a Munitions Cache within 15 units to gain +3 MU/s bonus
- Nodes are at contested locations (center of map, near choke points) to encourage map control

**Salvage Income (Comeback Mechanic):**
- When any unit or building is destroyed, the player who killed it gains 15% of the destroyed entity's cost as SP
- Prevents snowballing: the player who is losing generates income for the attacker, but also makes each remaining unit more valuable

### Economic Pressure

- Unit upkeep: None (simplicity over simulation)
- Income diminishes if HQ is destroyed: -50% all income
- Resource depots near nodes can be raided, cutting supply lines
- Players must expand to resource nodes or rely on fewer, safer income sources

### Starting Resources

- 500 SP, 0 MU
- Base income: 10 SP/s
- First 60 seconds are the "build-up phase" where most players are constructing and producing, not fighting

---

## 6. Tech Tree

### Three-Tier Progression

```
TIER 1 (Game Start)
  HQ -----> Barracks -----> Supply Depot
                |              Munitions Cache
                |
TIER 2 (Requires Barracks)
  Barracks --> War Factory --> Airfield
           |               |
           --> Shipyard     --> Refinery

TIER 3 (Requires War Factory + specific building)
  War Factory --> Tech Lab --> Superweapon Facility
                           --> Unlocks T3 units at their production buildings
```

### Upgrade Paths (Purchased at Tech Lab with MU)

Each upgrade path is a branching choice -- you can only pick ONE branch per game, forcing strategic commitment.

#### Infantry Upgrades (Branch A or B)
- **A: Veteran Training** (100 MU) -- All infantry gain +15% HP and +10% damage
- **B: Guerrilla Tactics** (100 MU) -- All infantry gain +20% speed and camouflage when stationary (invisible until they fire)

#### Vehicle Upgrades (Branch A or B)
- **A: Composite Armor** (150 MU) -- All vehicles gain +2 armor
- **B: High-Velocity Rounds** (150 MU) -- All vehicles gain +20% damage and +2 range

#### Air Upgrades (Branch A or B)
- **A: Afterburners** (120 MU) -- All air units gain +30% speed
- **B: Payload Upgrade** (120 MU) -- All air units gain +25% damage and +AoE to bombs

#### Naval Upgrades (Branch A or B)
- **A: Sonar Array** (100 MU) -- All naval units detect stealth. Submarines revealed at 2x range.
- **B: Torpedo Salvo** (100 MU) -- All naval units gain a torpedo ability (active, 30s CD) dealing 100 bonus damage to ships

#### Global Upgrades (No branching, purchasable independently)
- **Field Repairs** (80 MU) -- All units slowly regenerate HP out of combat (+2 HP/s after 10s no damage)
- **Improved Logistics** (60 MU) -- All production buildings produce 10% faster
- **Advanced Optics** (50 MU) -- All units gain +3 vision range

---

## 7. Combat Mechanics

### Damage System

**Base Damage Formula:**
```
finalDamage = baseDamage * damageModifier * (1 - armorReduction) * stanceMultiplier
```

- `baseDamage`: Inherent damage stat of the attacking unit
- `damageModifier`: Lookup from the attacker/defender type matrix (see below)
- `armorReduction`: Each point of armor reduces damage by 4% (max 80% reduction at 20 armor)
- `stanceMultiplier`: 1.0 normally, modified by terrain/cover/stance

**Minimum damage:** Always at least 1 damage per hit

### Damage Type Matrix (Abbreviated)

High-level relationships (full matrix in Constants.js):

| Attacker \ Defender | Infantry | Vehicle | Air | Naval | Building |
|---------------------|----------|---------|-----|-------|----------|
| Infantry (Rifle) | 1.0 | 0.3 | 0.5 | 0.1 | 0.5 |
| Infantry (Mortar) | 0.8 | 0.5 | 0.0 | 0.0 | 2.0 |
| Vehicle (Tank) | 1.5 | 1.0 | 0.2 | 0.3 | 1.5 |
| Vehicle (AA) | 0.5 | 0.3 | 2.5 | 0.1 | 0.3 |
| Air (Drone) | 1.2 | 0.8 | 1.0 | 0.5 | 0.8 |
| Air (Fighter) | 1.5 | 1.5 | 1.5 | 1.2 | 1.5 |
| Air (Bomber) | 2.0 | 1.5 | 0.3 | 0.5 | 3.0 |
| Naval (Patrol) | 0.3 | 0.1 | 0.3 | 0.8 | 0.2 |
| Naval (Sub) | 0.1 | 0.1 | 0.0 | 2.0 | 0.5 |
| Naval (Battleship) | 1.5 | 1.2 | 0.3 | 1.0 | 2.0 |

### Armor System

- Each armor point = 4% damage reduction (increased from current 2% for more meaningful differentiation)
- Armor caps at 20 (80% reduction) to prevent invincibility
- Some attacks bypass armor (mortar, bomber AoE, superweapons)

### Cover and Terrain Effects

| Terrain/Cover | Effect |
|---------------|--------|
| Open ground | No modifier |
| Forest/trees | Infantry: -25% incoming damage, -2 speed. Vehicles: -3 speed. Blocks line of sight. |
| Hills/high ground | +15% damage when firing downhill, +3 vision range |
| Sandbag walls | Adjacent infantry: -25% incoming damage |
| Bunker garrison | -75% incoming damage, +50% range |
| Water (shallow) | Infantry: -50% speed. Vehicles: impassable. |
| Water (deep) | Only naval units |

### Veterancy / Experience System

Units gain XP from combat:
- Dealing damage: 1 XP per point of damage dealt
- Killing a unit: Bonus XP equal to 50% of the killed unit's cost
- Surviving combat: +5 XP per engagement survived (10s of combat)

| Rank | XP Required | Bonus | Visual |
|------|-------------|-------|--------|
| Recruit | 0 | Base stats | No indicator |
| Veteran | 100 | +10% HP, +10% damage, +5% speed | 1 chevron |
| Elite | 300 | +20% HP, +20% damage, +10% speed, +1 armor | 2 chevrons |
| Hero | 600 | +30% HP, +30% damage, +15% speed, +2 armor, **unlocks active ability** | 3 chevrons + glow |

**Hero Abilities (by unit type):**
- Rifleman Hero: "Sniper Shot" -- one high-damage, long-range shot on 20s CD
- Tank Hero: "Reactive Armor" -- absorbs the next 100 damage. 30s CD
- Fighter Hero: "Ace Pilot" -- evades all attacks for 3 seconds. 25s CD
- Battleship Hero: "Broadside" -- fires all cannons simultaneously for 3x damage. 40s CD

### Attack Mechanics

- **Attack Rate:** Defined per unit type (attacks per second). Cooldown = 1 / attackRate.
- **Auto-acquire:** Idle units automatically engage the nearest enemy within their weapon range.
- **Attack-move:** Units move toward a destination but engage any enemy encountered en route.
- **Focus fire:** Multiple units ordered to attack the same target all fire at it.
- **Overkill protection (future):** Units in a group avoid wasting shots on nearly-dead targets.
- **Friendly fire:** Bomber and SPG AoE damages friendly units (encourages careful micro).

---

## 8. Map Design

### Map Layout Philosophy

Every map must have:
1. **Two base positions** separated by at least 60% of the map
2. **A water body** accessible from both sides (for naval gameplay)
3. **3-4 resource nodes** in contested positions between the bases
4. **2+ choke points** that create strategic decision-making
5. **Flanking routes** that reward mobile play
6. **Coastal access** for both players (to build shipyards)

### Current Map: "Divided Coast"

```
+--------------------------------------------------+
|  [P-Base]                                         |
|   HQ  Barracks                                    |
|                    [Node]                          |
|              Hills/Forest                          |
|                          [Choke]    ~~~~           |
|         [Node]                     ~~~~  [Coast]   |
|                    Open Plain      ~~~~  [Node]    |
|                          [Choke]    ~~~~           |
|              Hills/Forest                          |
|                    [Node]                          |
|                                   [E-Base]         |
|                                    HQ  Barracks    |
+--------------------------------------------------+
Legend: ~~~~ = Water, [Node] = Resource Node, [Choke] = Narrow passage
```

- **Map size:** 256x256 world units (128x128 grid)
- Left 70% is land with rolling terrain
- Right 30% is a sea channel with coastal access
- Shore access at 30% and 70% of the vertical axis

### Planned Additional Maps

| Map Name | Biome | Size | Description |
|----------|-------|------|-------------|
| **Island Chain** | Tropical | 256x256 | Multiple islands connected by shallow water crossings. Heavy naval emphasis. |
| **Fortress Europa** | Temperate | 320x320 | D-Day style. One player defends a fortified coastline, the other attacks from the sea. Asymmetric start. |
| **Frozen Front** | Winter/Snow | 256x256 | Rivers freeze and thaw on a timer, opening/closing land bridges. Dynamic terrain. |
| **Desert Storm** | Arid | 256x256 | Open terrain with scattered oasis resource nodes. Sandstorms periodically reduce vision. |
| **Urban Warfare** | City | 192x192 | Dense building grid. Infantry-focused. Vehicles restricted to roads. Many garrison opportunities. |

### Map Editor (Future)

- Grid-based terrain painting (grass, sand, water, forest, hills)
- Resource node placement
- Start position definition
- Export/import as JSON

---

## 9. Game Modes

### Skirmish (Primary Mode)

| Mode | Players | Description |
|------|---------|-------------|
| **1v1** | 2 | Standard competitive. One human vs. AI or hot-seat vs. human. |
| **2v2** | 4 | Team-based. Shared vision, separate economies. |
| **Free-for-All** | 3-4 | Every player for themselves. Diplomacy through action. |
| **Comp Stomp** | 2 humans vs 2 AI | Cooperative vs. AI. Good for learning. |

### Campaign (Future -- Stretch Goal)

A 12-mission campaign across the Allied and Axis sides:

**Allied Campaign (6 missions):**
1. Training Grounds -- Tutorial mission. Basic movement, selection, attack.
2. Beach Assault -- Amphibious landing under fire. Learn naval + land coordination.
3. Behind Enemy Lines -- Stealth mission. Small squad infiltration. Learn veterancy.
4. Air Superiority -- Air-focused mission. Destroy enemy airfields.
5. The Siege -- Defend a position against waves. Learn defensive building.
6. Final Push -- Full-scale assault on enemy capital. All systems active.

**Axis Campaign (6 missions):**
- Mirror structure with Axis perspective. Different tactical challenges.

### Survival Mode

- Endless waves of increasingly difficult enemies
- Solo or co-op (2 players)
- Earn SP between waves to build defenses and produce units
- Leaderboard: How many waves survived
- Wave composition escalates: Infantry -> Vehicles -> Air -> Mixed -> Elite -> Superweapon waves

### Challenge Missions (Future)

- Timed scenarios: "Destroy the enemy base in 5 minutes"
- Puzzle-like: "Win with only infantry" or "No buildings allowed"
- Unlockable after campaign completion

---

## 10. UI/UX Design

### Screen Layout (In-Game)

```
+------------------------------------------------------------------+
| [SP: 1250]  [MU: 80]  [Income: +18/s]  [Units: 23/50] [12:34]  |  <- Top Bar
|                                                                    |
|                                                                    |
|                                                                    |
|                        3D VIEWPORT                                 |
|                                                                    |
|                                                                    |
|                                                                    |
|  +--------+                                                        |
|  |MINIMAP |                                          [Alerts]      |
|  |        |                                                        |
|  +--------+                                                        |
| +------------------+----------------------------+------------------+
| | SELECTION INFO   | COMMAND PANEL              | PRODUCTION       |
| | Unit portrait    | [Move] [Attack] [Stop]     | [Rifleman: 50SP] |
| | HP: 180/200      | [Hold] [Patrol] [Build]    | [Mortar: 100SP]  |
| | ATK:35 RNG:10    | [Ability]                  | [Tank: 200SP]    |
| | Rank: Veteran *  |                            | Queue: Tank, Inf |
| +------------------+----------------------------+------------------+
```

### Hotkey Scheme

| Category | Key | Action |
|----------|-----|--------|
| **Camera** | Arrow keys, W | Pan camera |
| | Q / E | Rotate camera left/right |
| | Mouse wheel | Zoom in/out |
| | Middle mouse drag | Pan camera |
| **Selection** | Left click | Select unit |
| | Shift + click | Add to selection |
| | Ctrl + click | Remove from selection |
| | Left drag | Box select |
| | Double-click | Select all of same type on screen |
| **Commands** | Right click | Move / Attack (context-sensitive) |
| | A | Attack-move |
| | S | Stop |
| | D | Hold position |
| | P | Patrol (between current position and right-click target) |
| **Control Groups** | Ctrl + 1-9 | Assign selection to group |
| | 1-9 | Recall control group |
| | Double-tap 1-9 | Center camera on control group |
| **Production** | B | Open build menu |
| | Tab | Cycle through production buildings |
| | Esc | Cancel current action / close menus |
| **Interface** | F1 | Toggle keyboard help |
| | F2 | Toggle stats overlay |
| | Space | Center camera on last alert |
| | , (comma) | Select all idle military units |
| | . (period) | Select all military units |

### Control Groups

- Players can assign up to 9 control groups (Ctrl+1 through Ctrl+9)
- Pressing the number key selects the group
- Double-tapping centers the camera on the group
- Groups persist until reassigned
- Visual indicator on unit: small number badge

### Alert System

Alerts appear as slide-in notifications on the right side and ping on the minimap:

| Alert Type | Color | Trigger |
|------------|-------|---------|
| Under Attack | Red | Player unit or building takes damage |
| Unit Produced | Green | Production complete |
| Building Complete | Blue | Building finished |
| Resource Low | Yellow | SP < 100 or MU < 25 |
| Superweapon Ready | Gold | Superweapon charged |
| Ally Under Attack | Orange | (2v2 mode) Teammate unit takes damage |

Clicking an alert centers the camera on the relevant location.

### Minimap

- Bottom-left corner, 200x200px
- Shows terrain colors, unit dots (green = friendly, red = enemy), building squares
- Left-click on minimap: move camera
- Right-click on minimap: issue move/attack command
- Fog of war applied (only shows explored/visible areas)
- Ping system: Alt+click on minimap to ping allies

---

## 11. Win Conditions

### Primary Win Condition: Elimination

- Destroy all enemy buildings and units
- If the enemy has no buildings and no units, they lose
- Destroying the HQ is not instant-win but delivers a crippling blow (-50% income)

### Alternative Win Conditions (Selectable in Game Setup)

| Condition | Description | Timer |
|-----------|-------------|-------|
| **HQ Destruction** | Destroy the enemy HQ. Faster games. | -- |
| **Economic Victory** | Accumulate 5000 SP in your bank (not spent). Rewards economic play. | -- |
| **Superweapon Victory** | Fire your superweapon 3 times. Rewards turtling and defense. | -- |
| **Time Limit** | Highest total military value (HP + damage of all units) after X minutes wins. | 15/20/30 min |

### Surrender

- Players can surrender at any time (button in options menu)
- In 2v2, a surrendered player's units become AI-controlled for 60 seconds, then are removed

---

## 12. AI Design

### AI Architecture

The existing 3-layer AI (Strategic, Tactical, Micro) is solid. Expand as follows:

#### Strategic Layer (Every 10 seconds)

Evaluates the overall game state and chooses a macro strategy:

| Strategy | Trigger | Behavior |
|----------|---------|----------|
| **Rush** | High SP, 5+ units, early game | Minimize building, maximize early aggression |
| **Balanced** | Default | Build economy and army in parallel |
| **Turtle** | Outnumbered 1.5:1 | Prioritize defensive buildings, tech up |
| **All-In** | Late game, superweapon close | Throw everything at the enemy before they can fire superweapon |
| **Naval Push** | Has shipyard, enemy coast exposed | Build naval fleet, shore bombard |
| **Air Raid** | Has airfield, enemy lacks AA | Produce air units, harass economy |

#### Tactical Layer (Every 3 seconds)

Executes the chosen strategy:
- Build order execution (adaptive, not scripted)
- Unit production priorities based on scouting information
- Attack timing based on army strength comparison
- Expansion decisions (when to build remote resource depots)

#### Micro Layer (Every 1 second)

- Retreat critically wounded units (<20% HP)
- Focus fire high-value targets
- Kite ranged units (move away from approaching melee)
- Spread units to reduce AoE damage
- Pull damaged units behind healthy ones

### Difficulty Levels

| Level | Income Bonus | Reaction Time | Scouting | Micro Quality |
|-------|-------------|---------------|----------|---------------|
| **Easy** | -20% | 5s delays | None | No micro |
| **Normal** | 0% | 3s delays | Basic | Basic retreat |
| **Hard** | +10% | 1s delays | Active scouting | Full micro |
| **Brutal** | +25% | 0.5s delays | Omniscient (no fog) | Perfect micro + ability usage |

### AI Personalities (For variety in repeated play)

| Personality | Description |
|-------------|-------------|
| **The General** | Balanced and methodical. Builds a strong base, then attacks with mixed forces. |
| **The Blitzer** | Aggressive early game. Rushes with T1 units. Falls off if stopped. |
| **The Turtler** | Heavy defense. Techs to T3 and superweapons. Slow but devastating late game. |
| **The Admiral** | Prioritizes naval and air. Controls the water, then bombs inland. |
| **The Economist** | Expands aggressively to resource nodes. Overwhelms with economic advantage. |

---

## 13. Audio Design

### Sound Categories

#### UI Sounds (Procedural -- Already Implemented)
- Selection click (short tone)
- Move command (acknowledgement beep)
- Attack command (sharp tone)
- Build placed (construction ratchet)
- Error/invalid action (low buzz)
- Production complete (ascending chime)
- Victory fanfare (ascending chord)
- Defeat dirge (descending tones)

#### Combat Sounds (Procedural -- Expand)
- Gunshot (white noise burst -- existing)
- Explosion (low-frequency boom -- existing)
- Tank cannon (deeper, longer boom)
- Aircraft engine (continuous buzz, pitch varies with speed)
- Naval horn (for battleships on production)
- Artillery whistle (incoming shell sound)
- Torpedo splash

#### Ambient Sounds (New -- Procedural)
- Wind (filtered white noise, intensity varies)
- Waves (for water-adjacent areas)
- Bird calls (very subtle, for non-combat areas)
- Radio chatter (very faint background)

#### Music (New -- Procedural/Generative)
- **Main Menu:** Low, atmospheric pad with military snare pattern
- **In-Game Calm:** Ambient synth pad, evolves slowly. Minimal.
- **In-Game Combat:** Tempo increases, adds percussion layers when combat events fire
- **Victory:** Triumphant brass-style synth chord progression
- **Defeat:** Somber descending progression

Music should be generated procedurally using Web Audio oscillators and filters to keep file size at zero (browser-based constraint). The system should layer tracks based on game state intensity.

### Sound Design Principles

1. **No audio fatigue.** Limit simultaneous sound effects to 8. Prioritize combat sounds over ambient.
2. **Spatial audio (future).** Sounds louder for units near the camera. Use Web Audio panning.
3. **User control.** Master volume, music volume, SFX volume sliders. Mute button.
4. **Procedural everything.** No audio file downloads. All sounds generated via Web Audio API oscillators, noise buffers, and filters. This is essential for a zero-install browser game.

---

## 14. Polish Features

### Fog of War

**Implementation Plan:**
- Each team has a visibility grid matching the terrain grid (128x128)
- Three states per cell: **Unexplored** (black), **Explored** (dark, shows terrain but not units), **Visible** (fully lit, shows everything)
- Each unit updates visibility around it based on its `vision` stat every frame
- Fog rendered as a semi-transparent overlay on the 3D terrain (black plane with alpha holes)
- Enemy units/buildings only visible when in a "Visible" cell
- Buildings remain visible once explored (but marked as "last known position" if not currently visible)

### Control Groups

- Ctrl+1-9 to assign, 1-9 to recall
- Stored as arrays on the Game object
- HUD shows small numbered icons for active control groups
- Double-tap number to center camera on group

### Replay System (Future)

- Record all game commands (not states) as a command log
- Replay by re-simulating commands at any speed
- Observer camera: free movement, both teams visible
- Export replay as JSON file, import to view

### Observer Mode (Future)

- Watch an AI vs. AI game in real-time
- Full vision of both teams
- Speed controls (0.5x, 1x, 2x, 4x)

### Stats Screen (Post-Game)

| Stat | Description |
|------|-------------|
| Units Produced | Total count by type |
| Units Lost | Total count by type |
| Units Killed | Total count by type |
| Damage Dealt | Total damage inflicted |
| Damage Taken | Total damage received |
| Resources Gathered | Total SP and MU earned |
| Resources Spent | Total SP and MU spent |
| Peak Army Value | Highest total army HP + damage value |
| Buildings Constructed | Count by type |
| Time to First Attack | Seconds until first combat |
| APM (Actions Per Minute) | Commands issued per minute |

Displayed as a side-by-side comparison between both players, with a timeline graph showing resource/army value over time.

### Visual Effects (Priority Enhancements)

| Effect | Description | Priority |
|--------|-------------|----------|
| Muzzle flash | Already exists. Enhance with particle burst. | High |
| Explosions | Already exists. Add camera shake on large explosions. | High |
| Smoke trails | Projectiles leave fading smoke. | Medium |
| Unit death | Body remains for 5 seconds, then fades. | Medium |
| Building destruction | Progressive damage states (intact -> damaged -> destroyed). | Medium |
| Water splash | When naval units fire or are hit. | Low |
| Tire tracks / treads | Tanks leave temporary ground marks. | Low |
| Muzzle smoke | Brief smoke puff after firing. | Low |

### Quality of Life Features

- **Idle unit finder:** Comma key selects all idle military units
- **Select all military:** Period key selects all military units
- **Double-click select all of type:** Double-click a rifleman to select all riflemen on screen
- **Production hotkeys:** Number keys in production panel correspond to unit slots
- **Shift-queue commands:** Hold Shift to queue move/attack waypoints
- **Rally point visual:** Green flag at rally point with line from building
- **Grid overlay:** Toggle to show pathfinding grid (debug/advanced)
- **Unit count per type:** Top bar shows breakdown on hover

---

## 15. Implementation Priorities

### Phase 1: Foundation (Current Sprint)

The prototype has the core game loop working. Priority fixes:

1. **Fog of war** -- Without it, the game has no information asymmetry and no scouting game
2. **Control groups (Ctrl+1-9)** -- Essential for any RTS
3. **Dual resource system** -- Add Munitions as second resource
4. **Faction abilities** -- Implement passives for all 6 nations
5. **4 new unit types** -- Mortar Team, Scout Car, AA Half-Track, Patrol Boat (fills critical role gaps)

### Phase 2: Depth

6. **Veterancy system** -- XP gain and rank bonuses
7. **Tech Lab + T3 units** -- Heavy Tank, SPG, Bomber
8. **Upgrade paths** -- Branching upgrades at Tech Lab
9. **Defensive buildings** -- Bunker, MG Turret, AA Battery, Walls
10. **Improved AI** -- Difficulty levels, personalities, scouting behavior

### Phase 3: Content

11. **Additional maps** -- At least 3 maps with different biomes
12. **Superweapons** -- Faction-specific ultimate abilities
13. **Active faction abilities** -- Lend-Lease, Blitzkrieg, Banzai Charge, etc.
14. **Cover/terrain system** -- Forest, hills, elevation damage bonuses
15. **Post-game stats screen**

### Phase 4: Polish

16. **3D models** (replacing geometric shapes)
17. **Enhanced particle effects and visual feedback**
18. **Procedural music system**
19. **Replay system**
20. **Campaign mode (stretch goal)**

### Phase 5: Multiplayer (Stretch Goal)

21. **WebSocket-based multiplayer** (lockstep or server-authoritative)
22. **Lobby system and matchmaking**
23. **Spectator mode**
24. **Leaderboards**

---

## Appendix A: Balance Philosophy

### The 40/40/20 Rule

- 40% of balance comes from **unit stats** (HP, damage, speed, range, armor)
- 40% of balance comes from **counter relationships** (damage modifiers)
- 20% of balance comes from **economy** (cost, build time, tech requirements)

No single unit should win the game alone. Every composition should have a counter-composition. If a unit is dominating, first check its counter-units before nerfing it directly.

### Balance Testing Methodology

1. Run 100 AI vs. AI games at "Normal" difficulty for each faction matchup
2. Faction win rates should be within 45-55% for every matchup
3. No single unit type should compose >60% of the winning army in >30% of games
4. Average game length should be 12-20 minutes
5. T3 units should appear in ~40% of games (not every game, not never)

---

## Appendix B: Browser Performance Budget

| Metric | Target |
|--------|--------|
| FPS | 60fps on mid-range hardware |
| Max entities | 200 (100 per team) |
| Max triangles | 50,000 scene total |
| Memory | < 200MB |
| Load time | < 3 seconds |
| Download size | < 5MB total (no audio files, no textures > 256x256) |

All 3D models should use low-poly geometry with vertex colors (matching current art style). No texture files needed. Particle effects use instanced geometry.

---

*End of Game Design Document*
