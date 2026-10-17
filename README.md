# 🔥 TUX: ROOT PURGE - The Open Source Reckoning
### *Soul Knight-Style Procedural Roguelike x Helldivers Orbital Stratagems & Adeptus Astartes Power Armor*

A fast, juicy retro arcade roguelike dungeon crawler where you play as **Tux the Linux Penguin**, traversing an **endless procedurally generated journey to save Linux**. Explore interconnected server chambers, survive lockdown room ambushes with solid walls, complete dynamic tactical objectives, wield a **strict 2-weapon inventory** with ground weapon swapping, manually key in **Helldivers-style orbital stratagem arrow codes** under pressure, don **Space Marine Terminator Power Armor**, and overthrow corporate proprietary monopolies!

---

## 🎮 How to Play

### Quick Start (Instant Launch)
Launch the game with one command:
```bash
python3 start.py
```
*(Or simply open `index.html` in Safari, Chrome, Firefox, or Brave!)*

---

## 🕹️ Controls

| Key / Action | Ability / Function | Description |
|---|---|---|
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | **Snappy Movement** | Soul Knight-style responsive movement with instant digital stopping and smooth wall sliding. |
| <kbd>Mouse Aim</kbd> | **Aim Reticle** | 360-degree precision aiming with holographic orbital crosshairs when armed. |
| <kbd>Left Mouse Button</kbd> | **Fire Weapon / Throw Beacon** | Fire active weapon, or throw the armed Stratagem Beacon ball to call down orbital drops! |
| <kbd>1</kbd> or <kbd>2</kbd> | **Select Weapon Slot** | Direct switch between Primary `[1]` and Secondary `[2]` weapon. |
| <kbd>Q</kbd> or <kbd>Mouse Wheel</kbd> | **Toggle Weapon** | Instantly swap between your 2 held weapons. |
| <kbd>E</kbd> | **Interact / Swap / Warp** | Swap current held weapon with ground drop, open weapon caches, hack terminals, or enter warp portal. |
| <kbd>Space</kbd> or <kbd>Shift</kbd> | **Sudo Slide / Thunder Slam** | Normal: Belly slide with invulnerability & ramming. <br>In Space Marine Armor: **Massive 280-radius Thunder Slam!** |
| <kbd>Right Mouse Button</kbd> | **KILL -9 SIGKILL Nova** | Disintegrates all enemy projectiles, knocks back all foes, and incinerates the room! |
| <kbd>F</kbd> or <kbd>R</kbd> | **Root Access Mode** | Enter supercharged frenzy mode with infinite ammo/fuel, double damage, and blaze speed! |
| <kbd>Arrow Keys</kbd> (<kbd>▲</kbd> <kbd>▶</kbd> <kbd>▼</kbd> <kbd>◀</kbd>) | **Mandatory Stratagem Codes** | Strictly and exclusively for Stratagems! Tap arrow keys anytime to automatically open terminal and arm drops. |
| <kbd>Tab</kbd> / <kbd>Ctrl</kbd> / <kbd>G</kbd> | **Toggle Stratagem Terminal** | Manually toggle the Super Destroyer Stratagem terminal overlay on/off. |

---

## 🏰 Procedural Dungeon Crawler Mode (Soul Knight Style)

Each sector is an interconnected grid of rooms carved through reinforced cyber-walls:

- **Solid Walls & Physics**: Tux and enemies smoothly slide along walls. Bullets spark and destroy against walls; rockets detonate on wall impact!
- **Room Lockdown Siren**: Entering an uncleared combat or objective chamber seals all entrance doorways with high-voltage **red laser barriers** while warning sirens blare (`playRoomLockdown()`).
- **Wave Encounters**: Enemies spawn in escalating waves inside the locked room.
- **Victory Unseal**: Purging all hostiles lifts the laser barriers (`playRoomClear()`), dropping XP, health, and chances of rare weapon drops!
- **Chamber Types**:
  - 🏠 **Spawn Chamber**: Safe starting zone equipped with an armory cache crate.
  - ⚔️ **Combat Chambers**: Hostile sectors packed with proprietary malware.
  - 📡 **Objective Chambers**: Houses tactical targets (Rogue Telemetry Relays, Open-Source Root Terminals, Elite Champions).
  - 💰 **Treasure Cache**: Contains golden weapon crates and repair nanites.
  - 👑 **Boss Arena**: Colossal arena on sector climax holding mega-bosses.
  - 🌀 **Exit Warp Gateway**: Dormant portal that awakens once all sector objectives are fulfilled, beaming Tux to the next sector!
- **Minimap Radar**: Real-time HUD radar displays visited rooms, combat lockdowns, treasure caches, and gateway status.

---

## 🎯 Dynamic Random Level Objectives & Endless Journey

Each sector procedurally generates randomized mission requirements:

1. **Purge Combat Chambers**: Clear 2 locked combat sectors.
2. **Destroy Rogue Telemetry Relays**: Armored antenna towers emitting telemetry spy waves and spawning scout drones. Must be demolished!
3. **Compile Root Patch Terminal**: Stand inside the decryption radius for 12 seconds while defending against relentless waves to patch the open-source server.
4. **Hunt Elite Champions**: Neutralize armored mini-bosses with glowing energy shields.
5. **Overthrow Sector Boss**: Defeat the titan boss in the climax chamber (Sector 1-3, 2-3, 3-3, 4-3, etc.).

Once all objectives are fulfilled, the **Warp Gateway** awakens (`playObjectiveComplete()`), allowing Tux to warp (`playPortalWarp()`) into the next endless procedurally generated sector with scaled enemy HP, density, and elite affixes!

---

## 🔫 2-Weapon Inventory Limit (Soul Knight Style)

Tux can hold strictly **2 weapons at a time** (Primary and Secondary):

1. **GPL Flamethrower**: Sustained cone of fire (`apt-get purge --force`), burning enemies over time using fuel.
2. **Kernel Breaker Shotgun**: 9–14 pellet incendiary buckshot blast with high knockback.
3. **Indomitus Heavy Bolter**: Mass-reactive explosive kinetic shells that detonate on impact.
4. **Sudo Rotary Minigun**: High-RPM bullet hose spewing tracer rounds and spent brass casings.
5. **Forkbomb Cluster RPG**: Cluster rocket launcher splitting into 4–8 submunitions on impact.
6. **Plasma Railgun**: Hyper-velocity piercing energy slug that vaporizes lines of enemies.
7. **Cryo Freezing Cannon**: Sub-zero frost bursts that slow and shatter corporate malware.

### Ground Weapon Swapping
- Find weapons dropped on the floor from chests, elite foes, or previous drops.
- Approach any floor weapon to see the HUD prompt: `[E] SWAP <CURRENT> FOR <GROUND WEAPON>`.
- Press <kbd>E</kbd> to drop your active weapon onto the floor and equip the new weapon into your active slot!

---

## 📡 Mandatory Arrow Input for Stratagems

No instant single-key shortcuts! Calling in Super Destroyer orbital support requires opening the terminal and entering the exact directional arrow code under fire:

| Stratagem | Mandatory Arrow Code | Orbital Effect |
|---|---|---|
| **Eagle 500KG Bomb** | <kbd>▲</kbd> <kbd>▶</kbd> <kbd>▼</kbd> <kbd>▼</kbd> <kbd>▼</kbd> | A screaming 500KG bomb drops from orbit, causing a screen-blinding nuclear explosion (420+ radius, 2800 damage) that wipes out all enemy projectiles! |
| **Orbital 380mm HE Barrage** | <kbd>▶</kbd> <kbd>▼</kbd> <kbd>▲</kbd> <kbd>▲</kbd> <kbd>◀</kbd> <kbd>▼</kbd> <kbd>▼</kbd> | Staggered 6-shell heavy artillery bombardment pounding a 320px zone over 5 seconds. |
| **A/MLS-4X Gatling Sentry** | <kbd>▼</kbd> <kbd>▲</kbd> <kbd>▶</kbd> <kbd>▼</kbd> | Deploys an automated twin-gatling turret pod with 480 HP that locks onto nearby foes and shreds hordes. |
| **Orbital Heavy Laser Strike** | <kbd>▶</kbd> <kbd>▼</kbd> <kbd>▲</kbd> <kbd>▶</kbd> <kbd>▼</kbd> | Searing 7-second orbital particle beam that tracks down the highest-HP boss/enemy with 520 DPS. |
| **Astartes Power Suit Drop** | <kbd>▼</kbd> <kbd>▼</kbd> <kbd>▲</kbd> <kbd>▶</kbd> | Calls down an orbital Drop Pod containing the **Tux Astartes Indomitus Terminator Power Armor**! |

- **Buzzer Reset on Mistype**: If you press a wrong direction, an error buzzer sounds (`playStratagemBeep(false)`), sequence clears, and you must re-enter from the beginning!
- **Throw Beacon**: Once authorized, click anywhere on screen to throw the red targeting beacon!

---

## ⚡ Astartes Space Marine Power Suit ("Suit Drop")

Call it down via Stratagem or find it delivered via orbital supply pods during boss encounters:
- **Ceramite Armor Shield**: +350 extra rechargeable overshield with 65% passive damage reduction!
- **Heavy Footsteps**: Ground-shaking metallic steps that kick up dust.
- **Twin-Linked Shoulder Bolters**: Automatically fires secondary explosive bolter rounds from shoulder pods while shooting.
- **Thunder Slam (<kbd>Space</kbd>)**: Launches into the air and crashes down like a meteor, dealing 340 AOE damage across 280 radius and throwing back all enemies!
- **Emergency Ejection System**: If the ceramite shield breaks, Tux safely ejects with an invulnerability shockwave while the suit detonates in an electrical nova!

---

## 👾 The Proprietary Enemies

1. **BSOD Cube (`CRASH.SYS`)**: Aggressive blue crash cubes with sad faces `:(` sprinting at Tux.
2. **DRM Padlocks (`LOCKED`)**: Armored brass padlocks firing anti-piracy laser beams.
3. **Subscription Slime (`$49.99/mo`)**: Greedy purple slime splitting into irritating microtransactions.
4. **Telemetry Spyware (`SPYWARE`)**: Floating cloud drones beaming keystrokes back to servers.
5. **AI Slop Hallucination Bot (`AI SLOP`)**: Chromatic shifting glitch orbs shooting hallucinated buzzwords.
6. **Patent Troll (`DMCA`)**: 6-legged mechanical spider shooting sticky copyright snare webs that slow Tux down.
7. **Kubernetes Pod Swarm (`K8S POD`)**: Hexagonal container drones projecting 180px protective forcefield shields over nearby enemies.
8. **EULA Enforcer Dreadnought (`EULA`)**: Heavy armored battle tank charging lethal piercing rail-lasers across the screen.

---

## 👑 Epic Bosses (Endless Sector Climax)

- **Sector 1-3: The Bloatware Monolith (2,200 HP)**: Colossal forced update installer window spewing unskippable restart barrages!
- **Sector 2-3: Vendor Lock-In Overlord (4,200 HP)**: Monolithic server rack firing rotating walled-garden lasers!
- **Sector 3-3: The Cloud Monopoly Titan (6,500 HP)**: Floating AWS/Azure cloud data fortress with lightning strikes, billing statements, and laser grids!
- **Sector 4-3: The Closed-Source Overmind - GPT-Omega (12,000 HP)**: Massive singularity core pulling in projectiles, summoning hallucination phantoms, and firing rotating binary death sweeps!
- **Sectors 5-1+**: **Endless Recursive Purge** with infinite escalating enemy stats and elite swarms!

---

## 🎵 Dynamic Procedural Audio Engine
- Built entirely on the **Web Audio API** with real-time procedural synthesizers.
- Procedural room lockdown klaxons, victory fanfares, portal warp whooshes, chest creaks, shotgun blasts, bolter thuds, minigun chatter, rocket launches, and orbital strikes.
- Driving 142 BPM synth-metal / cyberpunk bassline and drums.
- Zero external MP3 downloads or network dependencies required.


