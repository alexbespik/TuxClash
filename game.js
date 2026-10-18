// TUX: ROOT PURGE - The Open Source Reckoning
// Fast, Juicy Arcade Action Game where Tux incinerates Proprietary Bullshit

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Bulletproof Canvas API monkeypatches: eliminate DOMException: IndexSizeError on negative/NaN radius
(function() {
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const origArc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function(x, y, radius, startAngle, endAngle, counterclockwise) {
      const safeX = Number.isFinite(x) ? x : 0;
      const safeY = Number.isFinite(y) ? y : 0;
      const safeRadius = (Number.isFinite(radius) && radius >= 0.001) ? radius : 0.001;
      const safeStart = Number.isFinite(startAngle) ? startAngle : 0;
      const safeEnd = Number.isFinite(endAngle) ? endAngle : Math.PI * 2;
      return origArc.call(this, safeX, safeY, safeRadius, safeStart, safeEnd, counterclockwise);
    };

    const origCreateRadialGradient = CanvasRenderingContext2D.prototype.createRadialGradient;
    CanvasRenderingContext2D.prototype.createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
      const safeX0 = Number.isFinite(x0) ? x0 : 0;
      const safeY0 = Number.isFinite(y0) ? y0 : 0;
      const safeR0 = (Number.isFinite(r0) && r0 >= 0.001) ? r0 : 0.001;
      const safeX1 = Number.isFinite(x1) ? x1 : 0;
      const safeY1 = Number.isFinite(y1) ? y1 : 0;
      const safeR1 = (Number.isFinite(r1) && r1 >= 0.001) ? r1 : 0.001;
      return origCreateRadialGradient.call(this, safeX0, safeY0, safeR0, safeX1, safeY1, safeR1);
    };
  }
})();

// --- GAME STATE ---
const STATE = {
  TITLE: 0,
  PLAYING: 1,
  UPGRADE: 2,
  GAMEOVER: 3,
  VICTORY: 4,
  PAUSED: 5,
  TERMINAL: 6
};

let gameState = STATE.TITLE;
let gameTime = 0;
let lastTimestamp = 0;
let screenShake = 0;
let hitStop = 0;

// Procedural Dungeon & Arena dimensions (Soul Knight Style)
const TILE_SIZE = 64;
const DUNGEON_COLS = 64;
const DUNGEON_ROWS = 48;
let WORLD_WIDTH = DUNGEON_COLS * TILE_SIZE; // 4096px
let WORLD_HEIGHT = DUNGEON_ROWS * TILE_SIZE; // 3072px

// Camera
const camera = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0
};

// Input
const keys = {};
const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  worldX: 0,
  worldY: 0,
  down: false,
  rightDown: false
};

let screenFlash = 0;
const playerProjectiles = [];
const orbitalStrikes = [];
const sentryTurrets = [];
const dropPods = [];
const spaceMarineSuitPickups = [];
const groundWeapons = [];
const weaponChests = [];
const objectiveTargets = [];
const floorHazards = [];
const activeDomeShields = [];
const teslaTowers = [];
const proceduralPortals = [];
const environmentalHazards = [];
const quarantineLockdownArenas = [];
const resupplyDropPods = [];
const linuxTerminalStations = [];
const meleeSlashEffects = [];
let dungeon = null;
let isStratagemTerminalOpen = false;
let currentTerminalSequence = [];
let stratagemResetTimer = null;

if (typeof window !== 'undefined') {
  window.playerProjectiles = playerProjectiles;
  window.orbitalStrikes = orbitalStrikes;
  window.sentryTurrets = sentryTurrets;
  window.dropPods = dropPods;
  window.spaceMarineSuitPickups = spaceMarineSuitPickups;
  window.groundWeapons = groundWeapons;
  window.weaponChests = weaponChests;
  window.objectiveTargets = objectiveTargets;
  window.floorHazards = floorHazards;
  window.activeDomeShields = activeDomeShields;
  window.teslaTowers = teslaTowers;
  window.proceduralPortals = proceduralPortals;
  window.environmentalHazards = environmentalHazards;
  window.quarantineLockdownArenas = quarantineLockdownArenas;
  window.resupplyDropPods = resupplyDropPods;
  window.linuxTerminalStations = linuxTerminalStations;
  window.meleeSlashEffects = meleeSlashEffects;
}

// Weapon Arsenal Catalogue
const WEAPON_CATALOG = [
  { id: 0, name: "GPL FLAMETHROWER", shortName: "GPL FLAMER", ammoText: "PYRO CONE", color: "#f97316", type: "flame", energy_cost: 0, weapon_type: "FLAME", element_type: "FIRE" },
  { id: 1, name: "BREAKER SHOTGUN", shortName: "BREAKER", ammoText: "BUCKSHOT", color: "#fbbf24", type: "buckshot", energy_cost: 3, weapon_type: "SHOTGUN", element_type: "NONE", projectile_count: 5 },
  { id: 2, name: "INDOMITUS BOLTER", shortName: "BOLTER", ammoText: "HE ASTARTES", color: "#f59e0b", type: "bolter", energy_cost: 2, weapon_type: "RIFLE", element_type: "NONE" },
  { id: 3, name: "SUDO MINIGUN", shortName: "MINIGUN", ammoText: "SUDO ROTARY", color: "#38bdf8", type: "minigun", energy_cost: 1, weapon_type: "RIFLE", element_type: "NONE" },
  { id: 4, name: "FORKBOMB RPG", shortName: "FORKBOMB", ammoText: "CLUSTER RPG", color: "#ef4444", type: "rocket", energy_cost: 4, weapon_type: "EXPLOSIVE", element_type: "FIRE" },
  { id: 5, name: "PLASMA RAILGUN", shortName: "RAILGUN", ammoText: "GIGAWATT SLUG", color: "#a855f7", type: "railgun", energy_cost: 4, weapon_type: "LASER", element_type: "ELECTRIC" },
  { id: 6, name: "CRYO CANNON", shortName: "CRYO CANNON", ammoText: "SUB-ZERO KERNEL", color: "#06b6d4", type: "cryo", energy_cost: 3, weapon_type: "PISTOL", element_type: "ICE" },
  { id: 7, name: "TESLA DAEMON CASTER", shortName: "TESLA ARC", ammoText: "CHAIN LIGHTNING", color: "#38bdf8", type: "tesla", energy_cost: 3, weapon_type: "STAFF", element_type: "ELECTRIC" },
  { id: 8, name: "NANO CYBER-KATANA", shortName: "BASH BLADE", ammoText: "KINETIC SLASH", color: "#22c55e", type: "melee", energy_cost: 0, weapon_type: "MELEE", element_type: "NONE" },
  { id: 9, name: "CLUSTER GRENADE LAUNCHER", shortName: "GRENADE LOB", ammoText: "BOMBLETS", color: "#f97316", type: "grenade", energy_cost: 3, weapon_type: "EXPLOSIVE", element_type: "FIRE" },
  { id: 10, name: "TACHYON BEAM DRILL", shortName: "BEAM DRILL", ammoText: "CONTINUOUS RAY", color: "#e879f9", type: "beam", energy_cost: 1, weapon_type: "LASER", element_type: "ELECTRIC" },
  { id: 11, name: "GNU FLECHETTE SPIKER", shortName: "SPIKER", ammoText: "PNEUMATIC NAILS", color: "#cbd5e1", type: "spiker", energy_cost: 2, weapon_type: "RIFLE", element_type: "NONE" },
  { id: 12, name: "AMR ANTI-MATERIEL SNIPER", shortName: "AMR SNIPER", ammoText: "HEAVY AP SLUG", color: "#ef4444", type: "amr_sniper", energy_cost: 4, weapon_type: "RIFLE", element_type: "NONE" },
  { id: 13, name: "SINGULARITY VORTEX CANNON", shortName: "VORTEX CANNON", ammoText: "EVENT HORIZON", color: "#c084fc", type: "singularity", energy_cost: 5, weapon_type: "STAFF", element_type: "NONE" },
  { id: 14, name: "KINETIC SAWBLADE LAUNCHER", shortName: "SAWBLADE DISC", ammoText: "RICOCHET DISCS", color: "#38bdf8", type: "sawblade", energy_cost: 2, weapon_type: "THROWN", element_type: "NONE" },
  { id: 15, name: "CORROSIVE ACID SPRAYER", shortName: "ACID SPRAYER", ammoText: "CAUSTIC SLUDGE", color: "#22c55e", type: "acid_sprayer", energy_cost: 2, weapon_type: "PISTOL", element_type: "POISON" },
  { id: 16, name: "PL-1 HEAVY AUTOCANNON", shortName: "AUTOCANNON", ammoText: "20MM HE-AP", color: "#38bdf8", type: "autocannon", energy_cost: 3, weapon_type: "RIFLE", element_type: "NONE" },
  { id: 17, name: "LAS-99 QUASAR CANNON", shortName: "QUASAR", ammoText: "ANTI-TANK CORE", color: "#67e8f9", type: "quasar", energy_cost: 5, weapon_type: "LASER", element_type: "ELECTRIC" },
  { id: 18, name: "ARC-12 ARC THROWER", shortName: "ARC THROWER", ammoText: "HIGH VOLTAGE", color: "#38bdf8", type: "arc_thrower", energy_cost: 3, weapon_type: "STAFF", element_type: "ELECTRIC" },
  { id: 19, name: "SG-8P PLASMA PUNISHER", shortName: "PLASMA MORTAR", ammoText: "PLASMA SHELL", color: "#818cf8", type: "plasma_mortar", energy_cost: 4, weapon_type: "EXPLOSIVE", element_type: "FIRE" },
  { id: 20, name: "SG-225IE BREAKER INCENDIARY", shortName: "INCENDIARY", ammoText: "DRAGON BREATH", color: "#f97316", type: "breaker_incendiary", energy_cost: 3, weapon_type: "SHOTGUN", element_type: "FIRE", projectile_count: 5 },
  { id: 21, name: "GPL PLASMA BROADSWORD", shortName: "PLASMA SWORD", ammoText: "CYAN CLEAVE", color: "#38bdf8", type: "melee", energy_cost: 0, weapon_type: "MELEE", element_type: "ELECTRIC" },
  { id: 22, name: "CHAINSWORD OF LIBERTY", shortName: "CHAINSWORD", ammoText: "ROARING TEETH", color: "#f59e0b", type: "melee", energy_cost: 0, weapon_type: "MELEE", element_type: "NONE" },
  { id: 23, name: "SUDO ENERGY SCYTHE", shortName: "SUDO SCYTHE", ammoText: "VOID HARVEST", color: "#c084fc", type: "melee", energy_cost: 0, weapon_type: "MELEE", element_type: "NONE" }
];

// Player (TUX - High Commander of Open Source)
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 26;
    this.angle = 0;
    this.hp = 120;
    this.maxHp = 120;
    this.shield = 50;
    this.maxShield = 50;
    this.energy = 200;
    this.maxEnergy = 200;
    this.time_since_last_hit = 999;
    this.hasPaladinShield = false;
    this.autoAimTarget = null;
    this.aimScanTimer = 0;
    this.shieldRegenDelay = 3.5;
    this.shieldRegenTimer = 0;
    this.baseSpeed = 340;
    this.speed = 340;
    
    // Weapon Arsenal: Strictly 2 Weapons Held (Soul Knight Style)
    this.heldWeapons = [WEAPON_CATALOG[0], WEAPON_CATALOG[1]];
    this.activeWeaponSlot = 0; // 0 (Primary) or 1 (Secondary)
    this.weaponCooldowns = new Array(32).fill(0);
    this.guardDogDrone = null;
    this.corrodedTimer = 0;

    // Fuel & Heat
    this.fuel = 100;
    this.maxFuel = 100;
    this.fuelRegen = 40; // per second
    this.fuelCostPerSec = 35;
    this.isFiring = false;

    // Belly Slide (sudo dash)
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.38;
    this.slideCooldown = 0;
    this.slideCooldownMax = 1.1;
    this.slideDirX = 0;
    this.slideDirY = 0;

    // ASTARTES SPACE MARINE POWER SUIT (Balanced Exosuit: 25s Battery & 150 Shield)
    this.isSpaceMarine = false;
    this.suitShield = 0;
    this.maxSuitShield = 150;
    this.suitBattery = 25.0;
    this.maxSuitBattery = 25.0;
    this.suitSlamCooldown = 0;
    this.stepTimer = 0;

    // Helldivers Stratagems
    this.holdingStratagem = null;

    // Root Access Mode (Frenzy)
    this.rootCharge = 0;
    this.rootMax = 100;
    this.isRootMode = false;
    this.rootDuration = 0;
    this.rootDurationMax = 9.0;

    // Secondary Weapon: KILL -9 Shockwave
    this.kill9Cooldown = 0;
    this.kill9CooldownMax = 4.0;

    // Animations
    this.waddleTime = 0;
    this.blinkTimer = 0;
    this.invulnerableTimer = 0;
    this.shieldRegenTimer = 0;
    this.webSlowTimer = 0;

    // Upgrades / Stats
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = 350;
    this.flameDamageMult = 1.0;
    this.flameRangeMult = 1.0;
    this.flameSpread = 0.38;
    this.plasmaFlames = false;
    this.forkBombPerk = false;
    this.magmaSlidePerk = false;
    this.infectiousGPL = false;
    this.communityPenguins = 0;
    this.armorReduction = 0;
    this.regenRate = 0; // hp per sec

    // New Perk Flags
    this.naniteShieldPerk = false;
    this.akimboPerk = false;
    this.stratagemHeroPerk = false;
    this.patriotStimPerk = false;
    this.armorPiercePerk = false;
    this.clusterPerk = false;
    this.teslaCoilPerk = false;
    this.titanPlatingPerk = false;
  }

  update(dt) {
    // Regenerate HP
    if (this.regenRate > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
    }

    // Cooldowns
    if (this.slideCooldown > 0) this.slideCooldown -= dt;
    if (this.kill9Cooldown > 0) this.kill9Cooldown -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.suitSlamCooldown > 0) this.suitSlamCooldown -= dt;
    this.shieldRegenTimer += dt;
    this.time_since_last_hit = (this.time_since_last_hit || 0) + dt;

    for (let i = 0; i < this.weaponCooldowns.length; i++) {
      if (this.weaponCooldowns[i] > 0) this.weaponCooldowns[i] -= dt;
    }

    // Natural Armor/Shield Regeneration (Argon's Roguelike Spec #2: 3.5s delay, 1 Armor every 0.5s = 2.0/s)
    if (!this.isSpaceMarine && this.time_since_last_hit >= 3.5 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 2.0 * dt);
      if (Math.random() < 0.15) {
        particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, -25, "#06b6d4"));
      }
    }

    // Natural Energy trickle regen (Soul Knight style: regenerates slowly up to maxEnergy when not actively firing)
    if (!this.isFiring && this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 10.0 * dt);
    }

    // Space Marine Power Suit Battery Depletion
    if (this.isSpaceMarine) {
      this.suitBattery -= dt;
      if (this.suitBattery <= 0) {
        this.suitBattery = 0;
        this.ejectSpaceMarineSuit();
      }
    }

    // Nanite Shield passive regen out of combat
    if (this.naniteShieldPerk && this.shieldRegenTimer > 2.5 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 12 * dt);
    }

    // Root mode timer
    if (this.isRootMode) {
      this.rootDuration -= dt;
      if (this.rootDuration <= 0) {
        this.isRootMode = false;
        this.rootCharge = 0;
        addFloatingText(this.x, this.y - 40, "ROOT EXPIRED", "#f97316", 24);
      }
    }

    // Handle Belly Slide
    if (this.isSliding) {
      this.slideTimer -= dt;
      // Allow responsive steering during slide so Tux never feels stuck or out of control
      let steerX = 0, steerY = 0;
      if (keys['KeyW']) steerY -= 1;
      if (keys['KeyS']) steerY += 1;
      if (keys['KeyA']) steerX -= 1;
      if (keys['KeyD']) steerX += 1;
      const steerLen = Math.hypot(steerX, steerY);
      if (steerLen > 0) {
        this.slideDirX = this.slideDirX * 0.88 + (steerX / steerLen) * 0.12;
        this.slideDirY = this.slideDirY * 0.88 + (steerY / steerLen) * 0.12;
        const norm = Math.hypot(this.slideDirX, this.slideDirY);
        if (norm > 0) {
          this.slideDirX /= norm;
          this.slideDirY /= norm;
        }
      }
      const slideSpeedMult = this.patriotStimPerk ? 3.2 : 2.6;
      this.vx = this.slideDirX * this.speed * slideSpeedMult;
      this.vy = this.slideDirY * this.speed * slideSpeedMult;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius);

      // Magma trail particles & damage
      if (Math.random() < 0.8) {
        particles.push(new ScorchTrail(
          this.x - this.slideDirX * 20 + (Math.random() - 0.5) * 15,
          this.y - this.slideDirY * 20 + (Math.random() - 0.5) * 15,
          this.magmaSlidePerk ? 4.5 : 1.2
        ));
      }

      // Slide ram damage into enemies
      for (const enemy of enemies) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.radius + enemy.radius) {
          enemy.takeDamage(this.magmaSlidePerk ? 140 : 75, "SUDO SLIDE RAM!");
          enemy.vx += this.slideDirX * 450;
          enemy.vy += this.slideDirY * 450;
          enemy.ignite(3.0);
          addScreenShake(6);
        }
      }

      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    } else {
      // Normal Walking Movement (Strictly WASD - Snappy Soul Knight Response)
      let moveX = 0;
      let moveY = 0;
      if (keys['KeyW']) moveY -= 1;
      if (keys['KeyS']) moveY += 1;
      if (keys['KeyA']) moveX -= 1;
      if (keys['KeyD']) moveX += 1;

      const len = Math.hypot(moveX, moveY);
      if (len > 0) {
        moveX /= len;
        moveY /= len;
        let curSpeed = this.isRootMode ? this.speed * 1.35 : (this.isSpaceMarine ? this.speed * 1.05 : this.speed);
        if (this.webSlowTimer && this.webSlowTimer > 0) {
          curSpeed *= 0.5;
        }
        if (dungeon) {
          const curTile = dungeon.getTileAt(this.x, this.y);
          if (curTile === 3) {
            // Water puddle slows movement by 15% and emits ripples
            curSpeed *= 0.85;
            if (Math.random() < 0.25) {
              particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 16, this.y + 12, (Math.random() - 0.5) * 25, -15, "#10b981"));
            }
          } else if (curTile === 4) {
            // Rustling tall grass
            if (Math.random() < 0.2) {
              particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 16, this.y + (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 20, -20, "#22c55e"));
            }
          }
        }
        const biomeFriction = (dungeon && dungeon.currentBiome && dungeon.currentBiome.frictionMult !== undefined)
          ? dungeon.currentBiome.frictionMult
          : 1.0;

        if (biomeFriction < 0.9) {
          // Sub-zero ice skating drift acceleration
          const targetVx = moveX * curSpeed;
          const targetVy = moveY * curSpeed;
          const accel = dt * 6.5;
          this.vx += (targetVx - this.vx) * accel;
          this.vy += (targetVy - this.vy) * accel;
          if (Math.random() < 0.3) {
            particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 16, this.y + 12, -this.vx * 0.15, -this.vy * 0.15, "#38bdf8"));
          }
        } else {
          this.vx = moveX * curSpeed;
          this.vy = moveY * curSpeed;
        }
        this.waddleTime += dt * 14;

        // Heavy Space Marine Footsteps!
        if (this.isSpaceMarine) {
          this.stepTimer += dt;
          if (this.stepTimer > 0.28) {
            this.stepTimer = 0;
            window.soundEngine.playHeavyFootstep();
            addScreenShake(1.5);
            for (let i = 0; i < 4; i++) {
              particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 15, this.y + 16, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, "#94a3b8"));
            }
          }
        }
      } else {
        const biomeFriction = (dungeon && dungeon.currentBiome && dungeon.currentBiome.frictionMult !== undefined)
          ? dungeon.currentBiome.frictionMult
          : 1.0;

        if (biomeFriction < 0.9) {
          // Ice glide deceleration with momentum
          const decay = Math.pow(0.20, dt * 1.8);
          this.vx *= decay;
          this.vy *= decay;
          if (Math.hypot(this.vx, this.vy) < 8) {
            this.vx = 0;
            this.vy = 0;
          } else if (Math.random() < 0.25) {
            particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 16, this.y + 12, 0, -10, "#38bdf8"));
          }
        } else {
          // Instant digital stop (Soul Knight style - crisp & controlled)
          this.vx = 0;
          this.vy = 0;
        }
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius);

      // Start Slide or Thunder Slam
      if ((keys['ShiftLeft'] || keys['ShiftRight'] || (keys['Space'] && len > 0))) {
        if (this.isSpaceMarine && this.suitSlamCooldown <= 0) {
          this.thunderSlam();
        } else if (!this.isSpaceMarine && this.slideCooldown <= 0) {
          this.startSlide(moveX, moveY);
        }
      }
    }

    // Smart Auto-Aim & Target Acquisition (Argon's Roguelike Spec #4 - Optimized 60 FPS)
    this.aimScanTimer = (this.aimScanTimer || 0) - dt;
    if (this.aimScanTimer <= 0 || (this.autoAimTarget && (this.autoAimTarget.isDead || this.autoAimTarget.hp <= 0))) {
      this.aimScanTimer = 0.1; // Scan every 0.1s
      let closestEnemy = null;
      const enemyList = window.enemies || [];
      const aimRadius = 750;
      const candidates = [];

      // Pass 1: Ultra-fast distance cull (pure distance check, zero raycasts)
      for (let i = 0; i < enemyList.length; i++) {
        const e = enemyList[i];
        if (!e || e.isDead || e.hp <= 0) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < aimRadius) {
          candidates.push({ enemy: e, dist: d });
        }
      }

      // Pass 2: Sort candidates and test line-of-sight starting with closest
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.dist - b.dist);
        const testLimit = Math.min(candidates.length, 6);
        for (let i = 0; i < testLimit; i++) {
          const c = candidates[i];
          if (!dungeon || dungeon.hasLineOfSight(this.x, this.y, c.enemy.x, c.enemy.y)) {
            closestEnemy = c.enemy;
            break; // Closest valid LoS candidate found!
          }
        }
      }
      this.autoAimTarget = closestEnemy;
    }

    // Aim angle selection: Auto-aim rotates towards nearest LoS enemy; falls back to mouse / movement input vector
    const aimDx = mouse.worldX - this.x;
    const aimDy = mouse.worldY - this.y;
    const mouseDist = Math.hypot(aimDx, aimDy);

    if (this.autoAimTarget && (mouse.down || mouseDist < 160 || (Math.hypot(this.vx, this.vy) > 0 && mouseDist < 250))) {
      this.angle = Math.atan2(this.autoAimTarget.y - this.y, this.autoAimTarget.x - this.x);
    } else if (mouseDist > 40) {
      this.angle = Math.atan2(aimDy, aimDx);
    } else if (Math.hypot(this.vx, this.vy) > 0) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // Fuel Regen (for flamethrower)
    if (!this.isFiring || this.currentWeapon !== 0) {
      this.fuel = Math.min(this.maxFuel, this.fuel + this.fuelRegen * dt);
    }

    // Fire Weapon (Left click)
    if (mouse.down && !this.isSliding) {
      this.fireCurrentWeapon(dt);
    } else {
      if (this.currentWeapon === 0) {
        this.isFiring = false;
        window.soundEngine.setFlamethrower(false);
      }
    }

    // Trigger Root Mode if full and key pressed
    if ((keys['KeyR'] || keys['KeyF']) && this.rootCharge >= this.rootMax && !this.isRootMode) {
      this.activateRootMode();
    }

    // Secondary Weapon: KILL -9 Shockwave (Right Click)
    if (mouse.rightDown && this.kill9Cooldown <= 0) {
      this.triggerKill9();
    }

    // Touch check for Space Marine Drop Pods / Pickups
    for (let i = spaceMarineSuitPickups.length - 1; i >= 0; i--) {
      const sp = spaceMarineSuitPickups[i];
      if (Math.hypot(sp.x - this.x, sp.y - this.y) < this.radius + sp.radius) {
        this.equipSpaceMarineSuit();
        spaceMarineSuitPickups.splice(i, 1);
      }
    }

    if (this.webSlowTimer > 0) {
      this.webSlowTimer -= dt;
    }

    if (this.corrodedTimer > 0) {
      this.corrodedTimer -= dt;
      if (Math.random() < 0.2) {
        particles.push(new SparkParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, 0, -15, "#22c55e"));
      }
    }

    // Update Guard Dog Combat Drone
    if (this.guardDogDrone) {
      if (!this.guardDogDrone.update(dt, this)) {
        this.guardDogDrone = null;
      }
    }

    // Update Ground Weapon / Cache Pickup Prompt in HUD
    this.updateGroundPickupPrompt();
  }

  get currentWeapon() {
    return this.heldWeapons[this.activeWeaponSlot] ? this.heldWeapons[this.activeWeaponSlot].id : 0;
  }

  updateGroundPickupPrompt() {
    let promptText = null;
    for (const gw of groundWeapons) {
      if (Math.hypot(gw.x - this.x, gw.y - this.y) < 70) {
        promptText = `SWAP ${this.heldWeapons[this.activeWeaponSlot].shortName} FOR ${gw.weapon.name}`;
        break;
      }
    }
    if (!promptText) {
      for (const chest of weaponChests) {
        if (!chest.opened && Math.hypot(chest.x - this.x, chest.y - this.y) < 70) {
          promptText = "OPEN WEAPON CACHE";
          break;
        }
      }
    }
    if (!promptText && typeof proceduralPortals !== 'undefined') {
      for (const portal of proceduralPortals) {
        if (Math.hypot(portal.x - this.x, portal.y - this.y) < 85) {
          promptText = `[E] ENTER PORTAL: ${portal.biome.name} [${portal.objectiveTitle}]`;
          break;
        }
      }
    }
    if (!promptText && dungeon && dungeon.isSectorCompleted() && dungeon.exitGateway) {
      if (Math.hypot(dungeon.exitGateway.x - this.x, dungeon.exitGateway.y - this.y) < 80) {
        promptText = "ENTER WARP GATEWAY";
      }
    }

    const promptEl = document.getElementById('groundPickupPrompt');
    const promptTextEl = document.getElementById('pickupPromptText');
    if (promptEl && promptTextEl) {
      if (promptText) {
        promptEl.style.display = 'flex';
        promptTextEl.innerText = promptText;
      } else {
        promptEl.style.display = 'none';
      }
    }
  }

  switchSlot(slot) {
    if (slot !== 0 && slot !== 1) return;
    this.activeWeaponSlot = slot;
    if (this.currentWeapon !== 0) {
      this.isFiring = false;
      window.soundEngine.setFlamethrower(false);
    }
    this.updateWeaponHud();
    const activeW = this.heldWeapons[this.activeWeaponSlot];
    if (activeW) {
      addFloatingText(this.x, this.y - 40, activeW.name, activeW.color, 18);
    }
    window.soundEngine.playPickup();
  }

  swapActiveWeapon(newWeapon) {
    const oldWeapon = this.heldWeapons[this.activeWeaponSlot];
    groundWeapons.push(new GroundWeapon(this.x, this.y, oldWeapon));
    this.heldWeapons[this.activeWeaponSlot] = newWeapon;
    if (this.currentWeapon !== 0) {
      this.isFiring = false;
      window.soundEngine.setFlamethrower(false);
    }
    this.updateWeaponHud();
    window.soundEngine.playPickup();
    addFloatingText(this.x, this.y - 45, `EQUIPPED ${newWeapon.name}!`, newWeapon.color, 24);
    addScreenShake(4);
  }

  interact() {
    // 0. Proximity check for LinuxTerminalStation (< 85px)
    if (typeof linuxTerminalStations !== 'undefined') {
      for (const station of linuxTerminalStations) {
        if (!station.destroyed && Math.hypot(station.x - this.x, station.y - this.y) < 85) {
          openLinuxTerminal(station);
          return;
        }
      }
    }

    // 1. Proximity check for GroundWeapon (< 75px)
    for (let i = groundWeapons.length - 1; i >= 0; i--) {
      const gw = groundWeapons[i];
      if (Math.hypot(gw.x - this.x, gw.y - this.y) < 75) {
        this.swapActiveWeapon(gw.weapon);
        groundWeapons.splice(i, 1);
        return;
      }
    }

    // 2. Proximity check for WeaponChest (< 70px)
    for (const chest of weaponChests) {
      if (!chest.opened && Math.hypot(chest.x - this.x, chest.y - this.y) < 70) {
        chest.open();
        return;
      }
    }

    // 3. Proximity check for ProceduralPortal (< 95px)
    if (typeof proceduralPortals !== 'undefined') {
      for (const portal of proceduralPortals) {
        if (!portal.entered && Math.hypot(portal.x - this.x, portal.y - this.y) < 95) {
          portal.armTimer = 0; // Immediate E interact bypasses stabilization timer
          portal.enter();
          return;
        }
      }
    }

    // 4. Proximity check for ExitWarpGateway (< 85px)
    if (dungeon && dungeon.isSectorCompleted() && dungeon.exitGateway) {
      if (Math.hypot(dungeon.exitGateway.x - this.x, dungeon.exitGateway.y - this.y) < 85) {
        dungeon.warpToNextSector();
        return;
      }
    }
  }

  updateWeaponHud() {
    for (let i = 0; i < 2; i++) {
      const slotEl = document.getElementById(`weaponSlot${i}`);
      const nameEl = document.getElementById(`weaponName${i}`);
      const ammoEl = document.getElementById(`weaponAmmo${i}`);
      const tagEl = document.getElementById(`weaponTag${i}`);
      const w = this.heldWeapons[i];
      if (slotEl && w) {
        if (i === this.activeWeaponSlot) slotEl.classList.add('active');
        else slotEl.classList.remove('active');
      }
      if (nameEl && w) nameEl.innerText = w.shortName;
      if (ammoEl && w) ammoEl.innerText = w.ammoText;
      if (tagEl) tagEl.innerText = i === 0 ? "PRIMARY" : "SECONDARY";
    }
  }

  consumeEnergyForWeapon(curW) {
    if (!curW || !curW.energy_cost) return true;
    if (this.isRootMode) return true; // Infinite energy during Root Access Frenzy
    if (this.energy < curW.energy_cost) {
      // Soul Knight fallback: low energy fires at 50% power rather than freezing weapon
      this.energy = 0;
      this.lowEnergyFired = true;
      if (window.soundEngine && window.soundEngine.playNoiseBurst) {
        window.soundEngine.playNoiseBurst(0.04, 0.1, 1400, 200);
      }
      if (Math.random() < 0.15) {
        addFloatingText(this.x, this.y - 20, "LOW ENERGY (50% DMG)", "#38bdf8", 14);
      }
      return true; // Still fire!
    }
    this.lowEnergyFired = false;
    this.energy = Math.max(0, this.energy - curW.energy_cost);
    if (window.CombatEventBus) {
      window.CombatEventBus.emit('OnWeaponFire', this, curW, null);
    }
    return true;
  }

  fireCurrentWeapon(dt) {
    // If holding a stratagem beacon, do not fire regular weapon (thrown on click)
    if (this.holdingStratagem !== null) {
      return;
    }

    const curW = this.heldWeapons[this.activeWeaponSlot];
    const weaponId = curW ? curW.id : 0;
    const nozzleDist = this.isSpaceMarine ? 42 : 36;
    const nozzleX = this.x + Math.cos(this.angle) * nozzleDist;
    const nozzleY = this.y + Math.sin(this.angle) * nozzleDist;

    if (weaponId !== 0 && this.weaponCooldowns[weaponId] <= 0) {
      if (!this.consumeEnergyForWeapon(curW)) return;
    }

    if (weaponId === 0) {
      // 0. GPL Flamethrower
      if (this.fuel > 0 || this.isRootMode) {
        this.isFiring = true;
        if (!this.isRootMode) {
          this.fuel = Math.max(0, this.fuel - this.fuelCostPerSec * dt);
        }
        this.spewFlames(dt);
        window.soundEngine.setFlamethrower(true, this.isRootMode ? 1.5 : 1.0);
      } else {
        this.isFiring = false;
        window.soundEngine.setFlamethrower(false);
      }
    } else if (weaponId === 1) {
      // 1. Breaker Shotgun
      if (this.weaponCooldowns[1] <= 0) {
        this.weaponCooldowns[1] = 0.52;
        this.fireShotgun(nozzleX, nozzleY);
      }
    } else if (weaponId === 2) {
      // 2. Heavy Bolter
      if (this.weaponCooldowns[2] <= 0) {
        this.weaponCooldowns[2] = 0.16;
        this.fireBolter(nozzleX, nozzleY);
      }
    } else if (weaponId === 3) {
      // 3. Sudo Rotary Minigun
      if (this.weaponCooldowns[3] <= 0) {
        this.weaponCooldowns[3] = 0.065;
        this.fireMinigun(nozzleX, nozzleY);
      }
    } else if (weaponId === 4) {
      // 4. Forkbomb Cluster RPG
      if (this.weaponCooldowns[4] <= 0) {
        this.weaponCooldowns[4] = 1.05;
        this.fireRPG(nozzleX, nozzleY);
      }
    } else if (weaponId === 5) {
      // 5. Plasma Railgun
      if (this.weaponCooldowns[5] <= 0) {
        this.weaponCooldowns[5] = 0.65;
        this.fireRailgun(nozzleX, nozzleY);
      }
    } else if (weaponId === 6) {
      // 6. Cryo Freezing Cannon
      if (this.weaponCooldowns[6] <= 0) {
        this.weaponCooldowns[6] = 0.38;
        this.fireCryoCannon(nozzleX, nozzleY);
      }
    } else if (weaponId === 7) {
      // 7. Tesla Daemon (Arc Caster)
      if (this.weaponCooldowns[7] <= 0) {
        this.weaponCooldowns[7] = 0.42;
        this.fireTeslaArc(nozzleX, nozzleY);
      }
    } else if (weaponId === 8) {
      // 8. Nano Cyber-Katana (Bash Blade)
      if (this.weaponCooldowns[8] <= 0) {
        this.weaponCooldowns[8] = 0.32;
        this.fireCyberKatana(nozzleX, nozzleY);
      }
    } else if (weaponId === 9) {
      // 9. Cluster Grenade Launcher
      if (this.weaponCooldowns[9] <= 0) {
        this.weaponCooldowns[9] = 0.75;
        this.fireGrenadeLauncher(nozzleX, nozzleY);
      }
    } else if (weaponId === 10) {
      // 10. Tachyon Beam Laser Drill
      if (this.weaponCooldowns[10] <= 0) {
        this.weaponCooldowns[10] = 0.10;
        this.fireTachyonBeam(nozzleX, nozzleY);
      }
    } else if (weaponId === 11) {
      // 11. GNU Flechette Spiker (Nailgun)
      if (this.weaponCooldowns[11] <= 0) {
        this.weaponCooldowns[11] = 0.28;
        this.fireFlechetteSpiker(nozzleX, nozzleY);
      }
    } else if (weaponId === 12) {
      // 12. AMR Anti-Materiel Heavy Sniper
      if (this.weaponCooldowns[12] <= 0) {
        this.weaponCooldowns[12] = 0.85;
        this.fireAMRSniper(nozzleX, nozzleY);
      }
    } else if (weaponId === 13) {
      // 13. Singularity Vortex Cannon
      if (this.weaponCooldowns[13] <= 0) {
        this.weaponCooldowns[13] = 1.15;
        this.fireSingularityVortex(nozzleX, nozzleY);
      }
    } else if (weaponId === 14) {
      // 14. Kinetic Sawblade Launcher
      if (this.weaponCooldowns[14] <= 0) {
        this.weaponCooldowns[14] = 0.40;
        this.fireSawbladeLauncher(nozzleX, nozzleY);
      }
    } else if (weaponId === 15) {
      // 15. Corrosive Acid Sludge Sprayer
      if (this.weaponCooldowns[15] <= 0) {
        this.weaponCooldowns[15] = 0.22;
        this.fireAcidSprayer(nozzleX, nozzleY);
      }
    } else if (weaponId === 16) {
      // 16. PL-1 Heavy Autocannon
      if (this.weaponCooldowns[16] <= 0) {
        this.weaponCooldowns[16] = 0.34;
        this.fireAutocannon(nozzleX, nozzleY);
      }
    } else if (weaponId === 17) {
      // 17. LAS-99 Quasar Cannon
      if (this.weaponCooldowns[17] <= 0) {
        this.weaponCooldowns[17] = 0.95;
        this.fireQuasarCannon(nozzleX, nozzleY);
      }
    } else if (weaponId === 18) {
      // 18. ARC-12 Arc Thrower
      if (this.weaponCooldowns[18] <= 0) {
        this.weaponCooldowns[18] = 0.42;
        this.fireArcThrower(nozzleX, nozzleY);
      }
    } else if (weaponId === 19) {
      // 19. SG-8P Plasma Punisher
      if (this.weaponCooldowns[19] <= 0) {
        this.weaponCooldowns[19] = 0.65;
        this.firePlasmaPunisher(nozzleX, nozzleY);
      }
    } else if (weaponId === 20) {
      // 20. SG-225IE Breaker Incendiary
      if (this.weaponCooldowns[20] <= 0) {
        this.weaponCooldowns[20] = 0.48;
        this.fireBreakerIncendiary(nozzleX, nozzleY);
      }
    } else if (weaponId === 21) {
      // 21. GPL Plasma Broadsword
      if (this.weaponCooldowns[21] <= 0) {
        this.weaponCooldowns[21] = 0.52;
        this.firePlasmaBroadsword(nozzleX, nozzleY);
      }
    } else if (weaponId === 22) {
      // 22. Chainsword of Liberty
      if (this.weaponCooldowns[22] <= 0) {
        this.weaponCooldowns[22] = 0.15;
        this.fireChainsword(nozzleX, nozzleY);
      }
    } else if (weaponId === 23) {
      // 23. Sudo Energy Scythe
      if (this.weaponCooldowns[23] <= 0) {
        this.weaponCooldowns[23] = 0.65;
        this.fireSudoScythe(nozzleX, nozzleY);
      }
    }

    // Space Marine Twin Shoulder Bolter barrage bonus
    if (this.isSpaceMarine && Math.random() < 0.35) {
      this.fireSpaceMarineShoulderBolters();
    }
  }

  fireTeslaArc(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playTeslaArc) window.soundEngine.playTeslaArc();
    addScreenShake(3);

    // Find up to 4 targets in front arc
    const candidates = enemies.filter(e => {
      const d = Math.hypot(e.x - nozzleX, e.y - nozzleY);
      if (d > 650) return false;
      const angleTo = Math.atan2(e.y - nozzleY, e.x - nozzleX);
      const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
      return diff < 1.2;
    }).sort((a, b) => Math.hypot(a.x - nozzleX, a.y - nozzleY) - Math.hypot(b.x - nozzleX, b.y - nozzleY));

    const targets = candidates.slice(0, 4);
    let prevX = nozzleX, prevY = nozzleY;
    const damage = 85 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    for (const tgt of targets) {
      tgt.takeDamage(damage, "TESLA DISCHARGE");
      if (typeof tgt.shock === 'function') tgt.shock(0.7);
      tgt.vx += Math.cos(this.angle) * 160;
      tgt.vy += Math.sin(this.angle) * 160;

      // Authentic procedural multi-branched lightning bolt!
      particles.push(new LightningArcParticle(prevX, prevY, tgt.x, tgt.y, "#38bdf8", 0.18));
      
      // EMP shock sparks on hit
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 80;
        particles.push(new SparkParticle(tgt.x, tgt.y, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() > 0.5 ? "#38bdf8" : "#facc15"));
      }

      prevX = tgt.x;
      prevY = tgt.y;
    }

    if (targets.length === 0) {
      // Fire wild jagged lightning bolts forward
      const endX = nozzleX + Math.cos(this.angle) * 380 + (Math.random() - 0.5) * 60;
      const endY = nozzleY + Math.sin(this.angle) * 380 + (Math.random() - 0.5) * 60;
      particles.push(new LightningArcParticle(nozzleX, nozzleY, endX, endY, "#38bdf8", 0.15));
    }
  }

  fireCyberKatana(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playKatanaSlash) window.soundEngine.playKatanaSlash();
    addScreenShake(5);

    this.meleeComboSide = ((this.meleeComboSide || 1) > 0) ? -1 : 1;
    const slashRadius = 160;
    const slashArc = 2.0; // ~115 degrees sweep
    const damage = 220 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    // Spawn Radiant Emerald Melee Slash Crescent Effect
    meleeSlashEffects.push(new MeleeSlashEffect(
      this.x, this.y, this.angle,
      slashArc, slashRadius,
      "#22c55e", "#ffffff", 0.16, this.meleeComboSide
    ));

    // 1. Deflect & vaporize incoming enemy projectiles caught in the swing
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      if (!ep) continue;
      const dist = Math.hypot(ep.x - this.x, ep.y - this.y);
      if (dist <= slashRadius + 35) {
        const angleTo = Math.atan2(ep.y - this.y, ep.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          if (ep.is_destructible !== false) {
            const hasReflectBuff = (window.ModifierEngine && window.ModifierEngine.hasBuff('MELEE_REFLECT'));
            const deflectSpeed = hasReflectBuff ? 1100 : 880;
            const deflectDmg = (hasReflectBuff ? 120 : 75) * this.flameDamageMult;

            playerProjectiles.push(new PlayerBullet(
              ep.x, ep.y,
              Math.cos(this.angle) * deflectSpeed,
              Math.sin(this.angle) * deflectSpeed,
              8,
              deflectDmg,
              hasReflectBuff ? "#38bdf8" : "#22c55e",
              0.98, false, 0, 0, "DEFLECTED_BLADE"
            ));
            for (let p = 0; p < 4; p++) {
              particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, hasReflectBuff ? "#38bdf8" : "#4ade80"));
            }
            if (window.RoguelikeDevKit) window.RoguelikeDevKit.triggerHitstop(0.04);
            if (window.CombatEventBus) window.CombatEventBus.emit('OnProjectileDeflected', this, ep);
            enemyProjectiles.splice(i, 1);
          }
        }
      }
    }

    // 2. Cleave and knock back hostiles in swing arc
    for (const enemy of enemies) {
      if (!enemy) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= slashRadius + enemy.radius) {
        const angleTo = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          enemy.takeDamage(damage, "KINETIC SLASH");
          enemy.vx += Math.cos(this.angle) * 500;
          enemy.vy += Math.sin(this.angle) * 500;
        }
      }
    }
  }

  firePlasmaBroadsword(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playHeavyBladeSlash) window.soundEngine.playHeavyBladeSlash();
    addScreenShake(8);

    const slashRadius = 195;
    const slashArc = 2.6; // Massive 150-degree heavy cleave
    const damage = 420 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    // Spawn Radiant Cyan Plasma Slash Crescent Effect
    meleeSlashEffects.push(new MeleeSlashEffect(
      this.x, this.y, this.angle,
      slashArc, slashRadius,
      "#38bdf8", "#e0f2fe", 0.22, 1
    ));

    // Vaporize enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      if (!ep) continue;
      const dist = Math.hypot(ep.x - this.x, ep.y - this.y);
      if (dist <= slashRadius + 40) {
        const angleTo = Math.atan2(ep.y - this.y, ep.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          for (let p = 0; p < 4; p++) {
            particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, "#38bdf8"));
          }
          enemyProjectiles.splice(i, 1);
        }
      }
    }

    // Heavy cleave + blue plasma burn + massive knockback
    for (const enemy of enemies) {
      if (!enemy) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= slashRadius + enemy.radius) {
        const angleTo = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          enemy.takeDamage(damage, "PLASMA CLEAVE");
          enemy.vx += Math.cos(this.angle) * 700;
          enemy.vy += Math.sin(this.angle) * 700;
          enemy.burnTimer = 3.5; // Blue plasma flame
        }
      }
    }
  }

  fireChainsword(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playChainswordRoar) window.soundEngine.playChainswordRoar();
    addScreenShake(3.5);

    const slashRadius = 140;
    const slashArc = 1.5;
    const damage = 145 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);
    const side = Math.random() > 0.5 ? 1 : -1;

    // Spawn Roaring Amber Chainsword Slash Crescent
    meleeSlashEffects.push(new MeleeSlashEffect(
      this.x, this.y, this.angle,
      slashArc, slashRadius,
      "#f59e0b", "#fef08a", 0.12, side
    ));

    // Chew through bullets
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      if (!ep) continue;
      const dist = Math.hypot(ep.x - this.x, ep.y - this.y);
      if (dist <= slashRadius + 20) {
        const angleTo = Math.atan2(ep.y - this.y, ep.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          for (let p = 0; p < 3; p++) {
            particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, "#f59e0b"));
          }
          enemyProjectiles.splice(i, 1);
        }
      }
    }

    // Shred enemy armor and apply bleed/corrosion
    for (const enemy of enemies) {
      if (!enemy) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= slashRadius + enemy.radius) {
        const angleTo = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
        if (diff < slashArc * 0.6) {
          enemy.takeDamage(damage, "CHAINSWORD SHRED");
          enemy.vx += Math.cos(this.angle) * 320;
          enemy.vy += Math.sin(this.angle) * 320;
          enemy.corrodedTimer = 2.5; // Corrosive armor shred
          for (let p = 0; p < 3; p++) {
            particles.push(new SparkParticle(enemy.x, enemy.y, (Math.random() - 0.5) * 110, (Math.random() - 0.5) * 110, "#fbbf24"));
          }
        }
      }
    }
  }

  fireSudoScythe(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playScytheSlash) window.soundEngine.playScytheSlash();
    addScreenShake(11);

    const slashRadius = 220;
    const slashArc = Math.PI * 2; // Full 360-degree whirlwind!
    const damage = 350 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    // Spawn 360-degree Void Violet Whirlwind Slash Effect
    meleeSlashEffects.push(new MeleeSlashEffect(
      this.x, this.y, this.angle,
      slashArc, slashRadius,
      "#c084fc", "#ffffff", 0.28, 1
    ));

    // Clear all surrounding enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      if (!ep) continue;
      const dist = Math.hypot(ep.x - this.x, ep.y - this.y);
      if (dist <= slashRadius + 30) {
        for (let p = 0; p < 4; p++) {
          particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, "#c084fc"));
        }
        enemyProjectiles.splice(i, 1);
      }
    }

    // Vortex pull + 360 cleave + stun
    for (const enemy of enemies) {
      if (!enemy) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < 340) {
        const pullAngle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
        enemy.vx += Math.cos(pullAngle) * 360;
        enemy.vy += Math.sin(pullAngle) * 360;
        if (dist <= slashRadius + enemy.radius) {
          enemy.takeDamage(damage, "VOID HARVEST");
          enemy.shockTimer = 0.8; // Brief EMP stun
        }
      }
    }
  }

  fireGrenadeLauncher(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playGrenadeLaunch) window.soundEngine.playGrenadeLaunch();
    addScreenShake(5);
    const speed = 760;
    const spread = (Math.random() - 0.5) * 0.08;
    const pAngle = this.angle + spread;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
    const damage = 140 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    const grenade = new PlayerBullet(
      nozzleX, nozzleY, vx, vy, 9, damage, "#f97316", 0.95, true, 80, 0, "GRENADE"
    );

    // Override bullet die to trigger secondary cluster bomblets
    const origDie = grenade.onExpire || function() {};
    grenade.onExpire = () => {
      origDie();
      // Spawn 5 cluster bomblets
      for (let c = 0; c < 5; c++) {
        const bAngle = (Math.PI * 2 / 5) * c + Math.random() * 0.5;
        const bSpeed = 260 + Math.random() * 120;
        playerProjectiles.push(new PlayerBullet(
          grenade.x,
          grenade.y,
          Math.cos(bAngle) * bSpeed,
          Math.sin(bAngle) * bSpeed,
          6,
          45,
          "#fbbf24",
          0.38,
          true,
          45,
          0,
          "BOMBLET"
        ));
      }
    };

    playerProjectiles.push(grenade);
  }

  fireTachyonBeam(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playLaserBeam) window.soundEngine.playLaserBeam();
    addScreenShake(2);
    const range = 950;
    const beamEndDist = range;
    const damage = 68 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    // Continuous Piercing Beam
    for (const enemy of enemies) {
      const dx = enemy.x - nozzleX;
      const dy = enemy.y - nozzleY;
      const proj = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
      if (proj > 0 && proj < beamEndDist) {
        const perp = Math.abs(-dx * Math.sin(this.angle) + dy * Math.cos(this.angle));
        if (perp < enemy.radius + 18) {
          enemy.takeDamage(damage * 0.16, "TACHYON BEAM");
          enemy.vx += Math.cos(this.angle) * 40;
          enemy.vy += Math.sin(this.angle) * 40;
          if (Math.random() < 0.4) {
            particles.push(new SparkParticle(enemy.x, enemy.y, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 70, "#e879f9"));
          }
        }
      }
    }

    // High tech laser ion ray particles
    for (let i = 0; i < 14; i++) {
      const dist = (i / 14) * beamEndDist;
      particles.push(new SparkParticle(
        nozzleX + Math.cos(this.angle) * dist,
        nozzleY + Math.sin(this.angle) * dist,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        Math.random() < 0.5 ? "#e879f9" : "#c084fc"
      ));
    }
  }

  fireFlechetteSpiker(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playNailgun) window.soundEngine.playNailgun();
    addScreenShake(4);
    const count = 3;
    for (let i = 0; i < count; i++) {
      const spread = (i - 1) * 0.05 + (Math.random() - 0.5) * 0.03;
      const pAngle = this.angle + spread;
      const speed = 1850;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
      const damage = (58 + Math.random() * 12) * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

      playerProjectiles.push(new PlayerBullet(
        nozzleX,
        nozzleY,
        vx,
        vy,
        5,
        damage,
        "#cbd5e1",
        0.8,
        false,
        0,
        3, // Pierces up to 3 targets
        "FLECHETTE"
      ));
    }
  }

  fireRailgun(nozzleX, nozzleY) {
    if (window.soundEngine.playRailgunShot) window.soundEngine.playRailgunShot();
    addScreenShake(6);
    const speed = 1600;
    const vx = Math.cos(this.angle) * speed;
    const vy = Math.sin(this.angle) * speed;
    const damage = 220 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new PlayerBullet(
      nozzleX, nozzleY, vx, vy, 8, damage, "#a855f7", 0.75, false, 0, 8, "RAILGUN"
    ));

    for (let i = 0; i < 10; i++) {
      particles.push(new SparkParticle(
        nozzleX, nozzleY,
        Math.cos(this.angle) * 300 + (Math.random() - 0.5) * 150,
        Math.sin(this.angle) * 300 + (Math.random() - 0.5) * 150,
        Math.random() < 0.5 ? "#a855f7" : "#38bdf8"
      ));
    }
  }

  fireCryoCannon(nozzleX, nozzleY) {
    window.soundEngine.playShotgun();
    addScreenShake(3);
    const count = 7;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.35;
      const speed = 750 + Math.random() * 150;
      const pAngle = this.angle + spread;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
      const damage = 42 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

      playerProjectiles.push(new PlayerBullet(
        nozzleX, nozzleY, vx, vy, 6, damage, "#06b6d4", 0.55, false, 0, 1, "CRYO"
      ));
    }
  }

  fireShotgun(nozzleX, nozzleY) {
    window.soundEngine.playShotgun();
    addScreenShake(5);
    const count = this.isRootMode ? 14 : 9;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.44;
      const speed = 720 + Math.random() * 200;
      const pAngle = this.angle + spread;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
      const damage = (26 + Math.random() * 8) * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

      playerProjectiles.push(new PlayerBullet(
        nozzleX,
        nozzleY,
        vx,
        vy,
        5,
        damage,
        "#fbbf24",
        0.42,
        false,
        0,
        this.armorPiercePerk ? 2 : 0,
        "BUCK"
      ));
    }
    // Muzzle smoke & sparks
    for (let i = 0; i < 6; i++) {
      particles.push(new SparkParticle(nozzleX, nozzleY, Math.cos(this.angle) * 180 + (Math.random() - 0.5) * 80, Math.sin(this.angle) * 180 + (Math.random() - 0.5) * 80, "#94a3b8"));
    }
  }

  fireBolter(nozzleX, nozzleY) {
    window.soundEngine.playBolterShot();
    addScreenShake(3);
    const speed = 880;
    const spread = (Math.random() - 0.5) * 0.08;
    const pAngle = this.angle + spread;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
    const damage = (56 + Math.random() * 12) * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new PlayerBullet(
      nozzleX,
      nozzleY,
      vx,
      vy,
      7,
      damage,
      "#f59e0b",
      1.1,
      true, // isExplosive
      38, // explosiveRadius
      this.armorPiercePerk ? 3 : 1,
      "BOLT"
    ));

    // Extra akimbo shot if perk unlocked
    if (this.akimboPerk || this.isRootMode) {
      const a2 = this.angle + 0.12;
      playerProjectiles.push(new PlayerBullet(
        nozzleX, nozzleY, Math.cos(a2) * speed, Math.sin(a2) * speed, 6, damage * 0.8, "#f59e0b", 1.1, true, 30, 1, "BOLT"
      ));
    }
  }

  fireMinigun(nozzleX, nozzleY) {
    window.soundEngine.playMinigunShot();
    addScreenShake(1.8);
    const speed = 980;
    const spread = (Math.random() - 0.5) * 0.16;
    const pAngle = this.angle + spread;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
    const damage = (20 + Math.random() * 5) * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new PlayerBullet(
      nozzleX,
      nozzleY,
      vx,
      vy,
      4.5,
      damage,
      "#38bdf8",
      0.9,
      false,
      0,
      this.armorPiercePerk ? 2 : 0,
      "TRACER"
    ));

    // Eject glowing spent brass casings
    const casingAngle = this.angle - Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    particles.push(new SparkParticle(
      this.x - Math.cos(this.angle) * 8,
      this.y - Math.sin(this.angle) * 8,
      Math.cos(casingAngle) * 160,
      Math.sin(casingAngle) * 160,
      "#fef08a"
    ));
  }

  fireRPG(nozzleX, nozzleY) {
    window.soundEngine.playRocketLaunch();
    addScreenShake(9);
    const damage = 290 * this.flameDamageMult * (this.isRootMode ? 1.6 : 1.0);
    playerProjectiles.push(new PlayerRocket(
      nozzleX,
      nozzleY,
      mouse.worldX,
      mouse.worldY,
      damage,
      140,
      this.clusterPerk ? 8 : 4
    ));

    // Backblast flame particles
    for (let i = 0; i < 8; i++) {
      const a = this.angle + Math.PI + (Math.random() - 0.5) * 0.6;
      const spd = 220 + Math.random() * 120;
      particles.push(new SparkParticle(nozzleX - Math.cos(this.angle) * 25, nozzleY - Math.sin(this.angle) * 25, Math.cos(a) * spd, Math.sin(a) * spd, "#f97316"));
    }
  }

  fireAMRSniper(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playSniperShot) window.soundEngine.playSniperShot();
    addScreenShake(12);
    // Heavy backwards recoil pushback on Tux
    this.vx -= Math.cos(this.angle) * 260;
    this.vy -= Math.sin(this.angle) * 260;

    const speed = 3400;
    const vx = Math.cos(this.angle) * speed;
    const vy = Math.sin(this.angle) * speed;
    const damage = 460 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new PlayerBullet(
      nozzleX, nozzleY, vx, vy, 6, damage, "#ef4444", 0.65, false, 0, 12, "AMR_SLUG"
    ));

    // Hypersonic red laser tracer trail
    for (let i = 0; i < 18; i++) {
      const dist = i * 45;
      particles.push(new SparkParticle(
        nozzleX + Math.cos(this.angle) * dist,
        nozzleY + Math.sin(this.angle) * dist,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        "#ef4444"
      ));
    }
  }

  fireSingularityVortex(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playSingularityVortex) window.soundEngine.playSingularityVortex();
    addScreenShake(4);
    const speed = 360;
    const vx = Math.cos(this.angle) * speed;
    const vy = Math.sin(this.angle) * speed;
    const tickDamage = 28 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);
    const popDamage = 350 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new SingularityOrb(nozzleX, nozzleY, vx, vy, tickDamage, popDamage));
  }

  fireSawbladeLauncher(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playSawbladeLaunch) window.soundEngine.playSawbladeLaunch();
    addScreenShake(4);
    const speed = 1150;
    const spread = (Math.random() - 0.5) * 0.06;
    const pAngle = this.angle + spread;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
    const damage = 180 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    playerProjectiles.push(new SawbladeBullet(nozzleX, nozzleY, vx, vy, damage));
  }

  fireAcidSprayer(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playAcidSplash) window.soundEngine.playAcidSplash();
    addScreenShake(3);
    const count = 4;
    for (let i = 0; i < count; i++) {
      const spread = (i - 1.5) * 0.12 + (Math.random() - 0.5) * 0.08;
      const speed = 700 + Math.random() * 160;
      const pAngle = this.angle + spread;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
      const damage = 55 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

      playerProjectiles.push(new AcidGlobBullet(nozzleX, nozzleY, vx, vy, damage));
    }
  }

  fireAutocannon(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playAutocannonShot) window.soundEngine.playAutocannonShot();
    addScreenShake(6);
    const speed = 1250;
    const spread = (Math.random() - 0.5) * 0.04;
    const pAngle = this.angle + spread;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
    const damage = 135 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    const slug = new PlayerBullet(nozzleX, nozzleY, vx, vy, 7, damage, "#38bdf8", 1.4, true, 48, 1, "AUTOCANNON");
    playerProjectiles.push(slug);
    for (let i = 0; i < 6; i++) {
      const a = pAngle + (Math.random() - 0.5) * 0.6;
      const spd = 60 + Math.random() * 120;
      particles.push(new SparkParticle(nozzleX, nozzleY, Math.cos(a) * spd, Math.sin(a) * spd, "#38bdf8"));
    }
  }

  fireQuasarCannon(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playQuasarBlast) window.soundEngine.playQuasarBlast();
    addScreenShake(9);
    const speed = 1450;
    const pAngle = this.angle;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.1;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.1;
    const damage = 310 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    const quasar = new PlayerBullet(nozzleX, nozzleY, vx, vy, 13, damage, "#67e8f9", 1.6, true, 85, 4, "QUASAR CANNON");
    playerProjectiles.push(quasar);
    particles.push(new ShockwaveRing(nozzleX, nozzleY, 80));
    for (let i = 0; i < 12; i++) {
      const a = pAngle + (Math.random() - 0.5) * 0.8;
      const spd = 100 + Math.random() * 220;
      particles.push(new SparkParticle(nozzleX, nozzleY, Math.cos(a) * spd, Math.sin(a) * spd, "#67e8f9"));
    }
  }

  fireArcThrower(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playArcThrowerDischarge) window.soundEngine.playArcThrowerDischarge();
    addScreenShake(5);
    const candidates = enemies.filter(e => {
      const d = Math.hypot(e.x - nozzleX, e.y - nozzleY);
      if (d > 580) return false;
      const angleTo = Math.atan2(e.y - nozzleY, e.x - nozzleX);
      const diff = Math.abs(Math.atan2(Math.sin(angleTo - this.angle), Math.cos(angleTo - this.angle)));
      return diff < 1.1;
    }).sort((a, b) => Math.hypot(a.x - nozzleX, a.y - nozzleY) - Math.hypot(b.x - nozzleX, b.y - nozzleY));

    const targets = candidates.slice(0, 5);
    let prevX = nozzleX, prevY = nozzleY;
    const damage = 95 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    for (const tgt of targets) {
      tgt.takeDamage(damage, "ARC DISCHARGE");
      if (typeof tgt.shock === 'function') tgt.shock(0.85);
      tgt.vx += Math.cos(this.angle) * 180;
      tgt.vy += Math.sin(this.angle) * 180;
      particles.push(new LightningArcParticle(prevX, prevY, tgt.x, tgt.y, "#67e8f9", 0.22));
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 100;
        particles.push(new SparkParticle(tgt.x, tgt.y, Math.cos(a) * spd, Math.sin(a) * spd, "#38bdf8"));
      }
      prevX = tgt.x;
      prevY = tgt.y;
    }

    if (targets.length === 0) {
      const endX = nozzleX + Math.cos(this.angle) * 420 + (Math.random() - 0.5) * 80;
      const endY = nozzleY + Math.sin(this.angle) * 420 + (Math.random() - 0.5) * 80;
      particles.push(new LightningArcParticle(nozzleX, nozzleY, endX, endY, "#67e8f9", 0.18));
    }
  }

  firePlasmaPunisher(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playPlasmaMortar) window.soundEngine.playPlasmaMortar();
    addScreenShake(6);
    const dist = Math.min(650, Math.hypot(mouse.worldX - nozzleX, mouse.worldY - nozzleY));
    const speed = 720;
    const lifetime = Math.max(0.25, dist / speed);
    const pAngle = this.angle + (Math.random() - 0.5) * 0.05;
    const vx = Math.cos(pAngle) * speed + this.vx * 0.15;
    const vy = Math.sin(pAngle) * speed + this.vy * 0.15;
    const damage = 165 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

    const plasma = new PlayerBullet(nozzleX, nozzleY, vx, vy, 11, damage, "#818cf8", lifetime, true, 92, 0, "PLASMA PUNISHER");
    plasma.onExpire = () => {
      particles.push(new ShockwaveRing(plasma.x, plasma.y, 95));
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 50 + Math.random() * 180;
        particles.push(new SparkParticle(plasma.x, plasma.y, Math.cos(a) * spd, Math.sin(a) * spd, "#c084fc"));
      }
    };
    playerProjectiles.push(plasma);
  }

  fireBreakerIncendiary(nozzleX, nozzleY) {
    if (window.soundEngine && window.soundEngine.playShotgun) window.soundEngine.playShotgun();
    addScreenShake(6);
    const count = 7;
    for (let i = 0; i < count; i++) {
      const spread = (i - 3) * 0.08 + (Math.random() - 0.5) * 0.07;
      const speed = 880 + Math.random() * 180;
      const pAngle = this.angle + spread;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.2;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.2;
      const damage = 42 * this.flameDamageMult * (this.isRootMode ? 1.8 : 1.0);

      const pellet = new PlayerBullet(nozzleX, nozzleY, vx, vy, 5, damage, "#f97316", 0.52, false, 0, 0, "DRAGON BREATH");
      const origExpire = pellet.onExpire || function() {};
      pellet.onExpire = () => {
        origExpire();
        particles.push(new SparkParticle(pellet.x, pellet.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#ef4444"));
      };
      playerProjectiles.push(pellet);
    }
  }

  fireSpaceMarineShoulderBolters() {
    const leftPodX = this.x + Math.cos(this.angle - 1.2) * 26;
    const leftPodY = this.y + Math.sin(this.angle - 1.2) * 26;
    const rightPodX = this.x + Math.cos(this.angle + 1.2) * 26;
    const rightPodY = this.y + Math.sin(this.angle + 1.2) * 26;
    const spd = 850;

    playerProjectiles.push(new PlayerBullet(
      leftPodX, leftPodY, Math.cos(this.angle) * spd, Math.sin(this.angle) * spd, 6, 45, "#ef4444", 1.0, true, 30, 1, "ASTARTES"
    ));
    playerProjectiles.push(new PlayerBullet(
      rightPodX, rightPodY, Math.cos(this.angle) * spd, Math.sin(this.angle) * spd, 6, 45, "#ef4444", 1.0, true, 30, 1, "ASTARTES"
    ));
  }

  throwStratagemBeacon(stratId) {
    const beacon = new StratagemBeacon(this.x, this.y, mouse.worldX, mouse.worldY, stratId);
    playerProjectiles.push(beacon);
    if (window.adaptiveDirector) {
      window.adaptiveDirector.recordStratagem();
    }
    window.soundEngine.playStratagemCall();
    addScreenShake(4);
    addFloatingText(this.x, this.y - 40, "BEACON DEPLOYED!", "#eab308", 22);
  }

  equipSpaceMarineSuit() {
    this.isSpaceMarine = true;
    this.suitShield = this.maxSuitShield;
    this.suitBattery = this.maxSuitBattery;
    this.armorReduction = 0.35; // Balanced tactical armor
    window.soundEngine.playPowerArmorEquip();
    addScreenShake(18);
    particles.push(new ShockwaveRing(this.x, this.y, 190));
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 240;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#06b6d4"));
    }
    addFloatingText(this.x, this.y - 65, "⚡ ASTARTES POWER SUIT ENGAGED! ⚡", "#06b6d4", 30);
    comboTracker.addBonus("ADEPTUS ASTARTES ONLINE", 500);
  }

  ejectSpaceMarineSuit() {
    this.isSpaceMarine = false;
    this.armorReduction = 0;
    this.invulnerableTimer = 1.2;
    window.soundEngine.playOrbitalExplosion();
    addScreenShake(22);
    particles.push(new ShockwaveRing(this.x, this.y, 230));
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < 230) {
        enemy.takeDamage(160, "SUIT EJECTION DISCHARGE");
        enemy.vx += ((enemy.x - this.x) / d) * 500;
        enemy.vy += ((enemy.y - this.y) / d) * 500;
      }
    }
    for (let i = 0; i < 35; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 260;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() < 0.5 ? "#38bdf8" : "#fbbf24"));
    }
    addFloatingText(this.x, this.y - 45, "CERAMITE BREACH - SAFELY EJECTED!", "#ef4444", 24);
  }

  thunderSlam() {
    this.suitSlamCooldown = 3.2;
    this.invulnerableTimer = 0.5;
    window.soundEngine.playThunderSlam();
    addScreenShake(26);
    particles.push(new ShockwaveRing(this.x, this.y, 280));
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 140 + Math.random() * 320;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() < 0.5 ? "#38bdf8" : "#fbbf24"));
    }
    let count = 0;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < 280) {
        count++;
        enemy.takeDamage(340, "THUNDER SLAM");
        enemy.ignite(4.0);
        const a = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx += Math.cos(a) * 750;
        enemy.vy += Math.sin(a) * 750;
      }
    }
    addFloatingText(this.x, this.y - 45, `THUNDER SLAM (${count} PURGED)`, "#38bdf8", 26);
  }

  startSlide(dirX, dirY) {
    if (dirX === 0 && dirY === 0) {
      dirX = Math.cos(this.angle);
      dirY = Math.sin(this.angle);
    }
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
    this.slideCooldown = this.slideCooldownMax;
    this.slideDirX = dirX;
    this.slideDirY = dirY;
    this.invulnerableTimer = this.slideDuration + 0.1;

    // Super-Earth Patriot Stim Perk bonus
    if (this.patriotStimPerk) {
      this.hp = Math.min(this.maxHp, this.hp + 20);
      addFloatingText(this.x, this.y - 30, "+20 STIM HEAL", "#22c55e", 18);
    }

    window.soundEngine.playSlide();
    addScreenShake(5);

    // Initial burst of sparks
    for (let i = 0; i < 22; i++) {
      particles.push(new SparkParticle(
        this.x - dirX * 15,
        this.y - dirY * 15,
        -dirX * 350 + (Math.random() - 0.5) * 200,
        -dirY * 350 + (Math.random() - 0.5) * 200,
        "#fbbf24"
      ));
    }
  }

  spewFlames(dt) {
    const nozzleDist = this.isSpaceMarine ? 42 : 36;
    const nozzleX = this.x + Math.cos(this.angle) * nozzleDist;
    const nozzleY = this.y + Math.sin(this.angle) * nozzleDist;

    const count = this.isRootMode ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * (this.isRootMode ? 0.7 : this.flameSpread);
      const speed = (580 + Math.random() * 240) * (this.isRootMode ? 1.4 : 1.0);
      const pAngle = this.angle + spread;
      const vx = Math.cos(pAngle) * speed + this.vx * 0.25;
      const vy = Math.sin(pAngle) * speed + this.vy * 0.25;

      const lifetime = (0.42 + Math.random() * 0.25) * this.flameRangeMult;
      const damage = (3.5 + Math.random() * 1.5) * this.flameDamageMult * (this.isRootMode ? 2.2 : 1.0);

      particles.push(new FlameParticle(
        nozzleX,
        nozzleY,
        vx,
        vy,
        lifetime,
        damage,
        this.plasmaFlames || this.isRootMode
      ));
    }
  }

  triggerKill9() {
    this.kill9Cooldown = this.kill9CooldownMax;
    window.soundEngine.playKill9Nova();
    addScreenShake(18);

    const novaRadius = 380;
    particles.push(new ShockwaveRing(this.x, this.y, novaRadius));

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      enemyProjectiles[i].destroy();
      enemyProjectiles.splice(i, 1);
    }

    let hitCount = 0;
    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= novaRadius) {
        hitCount++;
        const falloff = 1 - (dist / novaRadius) * 0.5;
        enemy.takeDamage(240 * falloff, "KILL -9 SIGKILL!");
        enemy.ignite(5.0);
        const pushAngle = Math.atan2(dy, dx);
        enemy.vx += Math.cos(pushAngle) * 600;
        enemy.vy += Math.sin(pushAngle) * 600;
      }
    }

    addFloatingText(this.x, this.y - 30, `KILL -9 PURGE (${hitCount} TARGETS)`, "#ef4444", 26);
  }

  activateRootMode() {
    this.isRootMode = true;
    this.rootDuration = this.rootDurationMax;
    this.fuel = this.maxFuel;
    window.soundEngine.playRootModeEnter();
    addScreenShake(20);

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 200 + Math.random() * 300;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(angle) * spd, Math.sin(angle) * spd, "#ef4444"));
    }

    addFloatingText(this.x, this.y - 50, "ROOT ACCESS UNLOCKED!", "#ef4444", 32);
    comboTracker.addBonus("ROOT ACCESS ACTIVATED!", 500);
  }

  takeDamage(amount, source, hitVx = 0, hitVy = 0) {
    if (this.invulnerableTimer > 0 || this.isRootMode || this.isSliding) return;

    // Statue of the Paladin 1-hit invulnerability barrier
    if (this.hasPaladinShield) {
      this.hasPaladinShield = false;
      this.invulnerableTimer = 0.5;
      if (typeof addFloatingText === 'function') addFloatingText(this.x, this.y - 30, "🛡️ PALADIN BARRIER BLOCKED HIT!", "#38bdf8", 22);
      if (window.soundEngine && typeof window.soundEngine.playShieldDeflect === 'function') window.soundEngine.playShieldDeflect();
      return;
    }

    // Trigger CombatEventBus OnDamageCalculated hook
    const damageContext = {
      attacker: null,
      defender: this,
      damage: amount,
      source: source || "COMBAT",
      isCrit: false,
      cancelled: false
    };
    if (window.CombatEventBus) {
      window.CombatEventBus.emit('OnDamageCalculated', null, this, damageContext);
    }
    if (damageContext.cancelled) return;

    // Argon Spec #2: Reset timer, trigger 0.5s i-frames
    this.time_since_last_hit = 0;
    this.shieldRegenTimer = 0;
    this.invulnerableTimer = 0.5; // 0.5s i-frames to prevent multi-hit instadeaths

    if (window.CombatEventBus) {
      window.CombatEventBus.emit('OnDamageTaken', this, damageContext.damage, damageContext.source);
    }

    let finalDamage = damageContext.damage * (1 - this.armorReduction);
    if (this.corrodedTimer > 0) {
      finalDamage *= 1.5;
    }

    // Visceral red impact flash on screen
    screenFlash = Math.max(screenFlash, 0.45);

    // Directional physical bullet impact knockback
    const hitSpd = Math.hypot(hitVx, hitVy);
    if (hitSpd > 0.1) {
      this.x += (hitVx / hitSpd) * 22;
      this.y += (hitVy / hitSpd) * 22;
      if (dungeon) {
        dungeon.resolveCircle(this, this.radius, 'x');
        dungeon.resolveCircle(this, this.radius, 'y');
      }
    }

    if (adaptiveDirector) {
      adaptiveDirector.recordDamageTaken(finalDamage);
    }

    // 1. Space Marine Suit absorbs damage first!
    if (this.isSpaceMarine && this.suitShield > 0) {
      this.suitShield -= finalDamage;
      window.soundEngine.playNoiseBurst(0.1, 0.35, 900, 180);
      addScreenShake(6);
      addFloatingText(this.x, this.y - 25, `-${Math.round(finalDamage)} CERAMITE`, "#06b6d4", 20);
      if (this.suitShield <= 0) {
        this.suitShield = 0;
        this.ejectSpaceMarineSuit();
      }
      return;
    }

    // 2. Base Tux Armor / Shield Matrix & Shield Gate Logic (Argon's Spec #2)
    const hasShieldGate = (window.ModifierEngine && window.ModifierEngine.hasBuff('SHIELD_GATE_NO_OVERFLOW'));
    if (this.shield > 0) {
      if (hasShieldGate) {
        this.shield = Math.max(0, this.shield - finalDamage);
        finalDamage = 0; // Armor absorbs 100% of the breaking hit!
        addFloatingText(this.x, this.y - 25, "🛡️ SHIELD GATE: 0 OVERFLOW!", "#38bdf8", 18);
        if (window.soundEngine && window.soundEngine.playShieldDeflect) window.soundEngine.playShieldDeflect();
        addScreenShake(5);
      } else {
        if (finalDamage <= this.shield) {
          this.shield -= finalDamage;
          addFloatingText(this.x, this.y - 25, `-${Math.round(finalDamage)} ARMOR`, "#06b6d4", 18);
          window.soundEngine.playNoiseBurst(0.08, 0.25, 950, 300);
          addScreenShake(4);
          finalDamage = 0;
        } else {
          finalDamage -= this.shield;
          this.shield = 0;
          addFloatingText(this.x, this.y - 25, "ARMOR BROKEN!", "#06b6d4", 20);
          window.soundEngine.playNoiseBurst(0.14, 0.4, 1200, 250);
          addScreenShake(7);
        }
      }
    }

    // 3. Excess damage penetrates to HP
    if (finalDamage > 0) {
      this.hp -= finalDamage;
      addScreenShake(10);
      window.soundEngine.playNoiseBurst(0.12, 0.4, 400, 80);
      addFloatingText(this.x, this.y - 20, `-${Math.round(finalDamage)} HP`, "#ef4444", 20);

      if (this.hp <= 0) {
        this.hp = 0;
        triggerGameOver();
      }
    }
  }

  addXP(amount) {
    this.xp += amount;
    this.rootCharge = Math.min(this.rootMax, this.rootCharge + amount * 0.4);
    if (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.xpNeeded = Math.round(this.xpNeeded * 1.45);
      this.level++;
      window.soundEngine.playLevelUp();
      showUpgradeScreen();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.invulnerableTimer > 0 && Math.floor(gameTime * 25) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (this.isSliding) {
      // BELLY SLIDE POSE
      const slideAngle = Math.atan2(this.slideDirY, this.slideDirX);
      ctx.rotate(slideAngle);

      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(-30, -10);
      ctx.lineTo(-55 - Math.random() * 20, 0);
      ctx.lineTo(-30, 10);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 5, 32, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.ellipse(4, 2, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(22, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(30, -5);
      ctx.lineTo(44, 0);
      ctx.lineTo(30, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(16, -11, 10, 5);
      ctx.beginPath();
      ctx.moveTo(16, -10);
      ctx.lineTo(0 - Math.random() * 15, -16);
      ctx.lineTo(16, -6);
      ctx.fill();

    } else if (this.isSpaceMarine) {
      // ==========================================
      // ASTARTES POWER ARMOR TUX (TERMINATOR SUIT)
      // ==========================================
      ctx.rotate(this.angle);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 26, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reactor Exhaust Powerpack on back with glowing blue vents
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-26, -18, 14, 36);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-28, -14, 4, 8);
      ctx.fillRect(-28, 6, 4, 8);

      // Twin Shoulder Bolter Pods
      ctx.fillStyle = "#334155";
      ctx.fillRect(-6, -24, 18, 8);
      ctx.fillRect(-6, 16, 18, 8);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(12, -23, 4, 6);
      ctx.fillRect(12, 17, 4, 6);

      // Massive Rounded Ceramite Shoulders (Pauldrons)
      ctx.fillStyle = "#1e3a8a"; // Ultramarine blue
      ctx.beginPath();
      ctx.ellipse(0, -18, 12, 8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(0, 18, 12, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Gold Trim on Pauldrons
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Purity Seal fluttering on right pauldron
      ctx.fillStyle = "#b91c1c"; // Red wax seal
      ctx.beginPath();
      ctx.arc(-2, 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef08a"; // Parchment strip
      ctx.beginPath();
      ctx.moveTo(-2, 23);
      ctx.lineTo(-14 - Math.sin(gameTime * 10) * 4, 25);
      ctx.lineTo(-2, 27);
      ctx.fill();

      // Heavy Armored Tux Body (Ceramite Chestplate)
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(2, 0, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden Linux Skull / Aquila on Chest
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(2, 0);
      ctx.closePath();
      ctx.fill();

      // Space Marine Armored Helmet
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.arc(12, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing Cyan Visor / Optical Eye Lenses
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.ellipse(19, -4.5, 4, 2.5, 0.2, 0, Math.PI * 2);
      ctx.ellipse(19, 4.5, 4, 2.5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Gold Beak / Respirator Grill
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(21, -5);
      ctx.lineTo(31, 0);
      ctx.lineTo(21, 5);
      ctx.closePath();
      ctx.fill();

      // Armored Heavy Autocannon Weapon in Hand
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(12, 6, 28, 9);
      ctx.fillStyle = "#475569";
      ctx.fillRect(40, 7, 10, 7);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(20, 15, 12, 4); // Ammo magazine

    } else {
      // ==========================================
      // NORMAL WADDLING / AIMING TUX POSE
      // ==========================================
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 22, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(this.angle);
      const waddle = Math.sin(this.waddleTime) * 0.12;

      // 1. Gas Fuel Tank on back
      ctx.save();
      ctx.translate(-16, 0);
      ctx.fillStyle = this.isRootMode ? "#dc2626" : "#475569";
      ctx.beginPath();
      ctx.roundRect(-8, -12, 12, 24, 4);
      ctx.fill();
      ctx.fillStyle = this.fuel > 20 ? "#22c55e" : "#ef4444";
      ctx.fillRect(-6, -8, 8, (this.fuel / 100) * 16);
      ctx.restore();

      // 2. Yellow Feet
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.ellipse(-6, -16 + waddle * 10, 9, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-6, 16 - waddle * 10, 9, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Black Tux Body
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. White Belly
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.ellipse(3, 0, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Head
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(10, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // 6. Cute Determined Eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(15, -5, 4.5, 0, Math.PI * 2);
      ctx.arc(15, 5, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = this.isRootMode ? "#ef4444" : "#0284c7";
      ctx.beginPath();
      ctx.arc(17, -5, 2.2, 0, Math.PI * 2);
      ctx.arc(17, 5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 7. Iconic Yellow/Orange Beak
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(18, -6);
      ctx.lineTo(29, 0);
      ctx.lineTo(18, 6);
      ctx.closePath();
      ctx.fill();

      // 8. Red "ROOT" Ninja Bandana
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(8, -13, 8, 4);
      ctx.beginPath();
      ctx.moveTo(7, -13);
      ctx.lineTo(-8 - Math.sin(gameTime * 15) * 5, -18);
      ctx.lineTo(6, -9);
      ctx.fill();

      // 9. DYNAMIC WEAPON DRAWING IN FLIPPERS
      if (this.currentWeapon === 0) {
        // GPL Flamethrower
        ctx.fillStyle = "#334155";
        ctx.fillRect(8, 6, 24, 7);
        ctx.fillStyle = this.plasmaFlames ? "#8b5cf6" : "#f97316";
        ctx.beginPath();
        ctx.moveTo(32, 4);
        ctx.lineTo(39, 2);
        ctx.lineTo(39, 13);
        ctx.lineTo(32, 11);
        ctx.closePath();
        ctx.fill();
        const pilotFlicker = Math.random() * 4;
        ctx.fillStyle = this.plasmaFlames ? "#a855f7" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(41 + pilotFlicker, 7.5, 3 + pilotFlicker * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.currentWeapon === 1) {
        // Breaker Shotgun (double dark barrel)
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(8, 5, 28, 8);
        ctx.fillStyle = "#64748b";
        ctx.fillRect(36, 4, 6, 10);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(20, 11, 10, 4); // Pump grip
      } else if (this.currentWeapon === 2) {
        // Indomitus Bolter (Heavy box magazine & muzzle brake)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(8, 4, 26, 10);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(18, 14, 8, 6); // Sick gold magazine
        ctx.fillStyle = "#475569";
        ctx.fillRect(34, 3, 7, 12); // Square muzzle brake
      } else if (this.currentWeapon === 3) {
        // Sudo Rotary Minigun (Spinning multi-barrels)
        ctx.fillStyle = "#334155";
        ctx.fillRect(8, 4, 18, 12);
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(12, 16, 10, 8); // Drum magazine
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(26, 5, 16, 10); // Rotating barrel cluster
      } else if (this.currentWeapon === 4) {
        // Forkbomb Cluster RPG
        ctx.fillStyle = "#14532d"; // Military green tube
        ctx.fillRect(0, -18, 38, 8);
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); // Warhead tip
        ctx.moveTo(38, -19);
        ctx.lineTo(46, -14);
        ctx.lineTo(38, -9);
        ctx.fill();
      } else if (this.currentWeapon === 8) {
        // 8. Nano Cyber-Katana (Bash Blade)
        const swingProgress = this.weaponCooldowns[8] > 0 ? (this.weaponCooldowns[8] / 0.28) : 0;
        const swingAngle = Math.sin(swingProgress * Math.PI) * 0.9;
        ctx.save();
        ctx.translate(12, 8);
        ctx.rotate(0.35 + swingAngle);
        // Hilt
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-4, -3, 8, 8);
        // Guard (Tsuba)
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(4, -6, 3, 14);
        // Emerald Nano Blade
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(7, -2, 38, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(7, -1, 36, 2);
        ctx.restore();
      } else if (this.currentWeapon === 21) {
        // 21. GPL Plasma Broadsword
        const swingProgress = this.weaponCooldowns[21] > 0 ? (this.weaponCooldowns[21] / 0.52) : 0;
        const swingAngle = Math.sin(swingProgress * Math.PI) * 1.2;
        ctx.save();
        ctx.translate(12, 8);
        ctx.rotate(0.25 + swingAngle);
        // Crossguard & Heavy Hilt
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-6, -4, 8, 10);
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(2, -9, 4, 20);
        // Broad Cyan Plasma Blade
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(6, -6, 44, 12);
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(8, -3, 40, 6);
        ctx.restore();
      } else if (this.currentWeapon === 22) {
        // 22. Chainsword of Liberty
        const revOffset = (Math.random() - 0.5) * 2;
        ctx.save();
        ctx.translate(12, 8);
        ctx.rotate(0.3);
        // Motor Housing
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-2, -5, 10, 12);
        // Toothed Bar
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(8, -6, 38, 12);
        // Spinning Diamond Teeth
        ctx.fillStyle = "#ffffff";
        for (let t = 0; t < 6; t++) {
          ctx.fillRect(10 + t * 6 + revOffset, -8, 3, 2);
          ctx.fillRect(10 + t * 6 - revOffset, 6, 3, 2);
        }
        ctx.restore();
      } else if (this.currentWeapon === 23) {
        // 23. Sudo Energy Scythe
        const swingProgress = this.weaponCooldowns[23] > 0 ? (this.weaponCooldowns[23] / 0.65) : 0;
        const swingAngle = Math.sin(swingProgress * Math.PI) * 1.4;
        ctx.save();
        ctx.translate(10, 8);
        ctx.rotate(0.35 + swingAngle);
        // Long Dark Haft
        ctx.fillStyle = "#3b0764";
        ctx.fillRect(-10, -2, 50, 4);
        // Curved Void Crescent Blade
        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.moveTo(40, -2);
        ctx.quadraticCurveTo(52, -26, 26, -30);
        ctx.quadraticCurveTo(46, -20, 40, 4);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(38, -1, 3, 2);
        ctx.restore();
      } else {
        // Other firearms (Railgun, Cryo, Tesla, Snipers, etc.)
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(10, 5, 26, 7);
        ctx.fillStyle = "#475569";
        ctx.fillRect(36, 6, 6, 5);
      }

      // Root Mode Aura
      if (this.isRootMode) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 32 + Math.sin(gameTime * 20) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Stratagem Beacon in hand indicator
    if (this.holdingStratagem !== null) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(28, -18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(28, -18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tactical Energy Shield matrix visual around Tux
    if (this.shield > 0 && !this.isSpaceMarine) {
      const shieldRatio = this.shield / this.maxShield;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 + 0.35 * shieldRatio})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const numPts = 6;
      const shR = 29 + Math.sin(gameTime * 4) * 1.5;
      for (let s = 0; s < numPts; s++) {
        const sa = (s / numPts) * Math.PI * 2 + gameTime * 0.8;
        const sx = Math.cos(sa) * shR;
        const sy = Math.sin(sa) * shR;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();

    // Orbital Aiming Reticle to Mouse Cursor when holding a beacon!
    if (this.holdingStratagem !== null) {
      ctx.save();
      // Dashed red targeting line from Tux to Mouse
      ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(mouse.worldX, mouse.worldY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing beacon target circle at mouse cursor
      const pulse = Math.sin(gameTime * 12) * 5;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mouse.worldX, mouse.worldY, 32 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
      ctx.fill();

      // Targeting Crosshairs
      ctx.beginPath();
      ctx.moveTo(mouse.worldX - 44, mouse.worldY);
      ctx.lineTo(mouse.worldX + 44, mouse.worldY);
      ctx.moveTo(mouse.worldX, mouse.worldY - 44);
      ctx.lineTo(mouse.worldX, mouse.worldY + 44);
      ctx.stroke();

      const strat = STRATAGEMS[this.holdingStratagem];
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`CLICK TO DEPLOY: ${strat ? strat.name : 'BEACON'}`, mouse.worldX, mouse.worldY - 42);

      ctx.restore();
    }

    // Tactical weapon aim guides (laser sights, range ticks, AoE blast radius, spread cones)
    this.drawAimGuides(ctx);

    if (this.guardDogDrone) {
      this.guardDogDrone.draw(ctx, this);
    }
  }

  drawAimGuides(ctx) {
    if (this.holdingStratagem !== null) return;
    const curW = this.heldWeapons[this.activeWeaponSlot];
    if (!curW) return;

    ctx.save();
    const nozzleDist = this.isSpaceMarine ? 42 : 36;
    const nozzleX = this.x + Math.cos(this.angle) * nozzleDist;
    const nozzleY = this.y + Math.sin(this.angle) * nozzleDist;
    const targetDist = Math.hypot(mouse.worldX - nozzleX, mouse.worldY - nozzleY);

    // 1. PRECISION LASER SIGHT / AIMING LINE
    // For: railgun, amr_sniper, autocannon, quasar, beam, bolter, spiker, minigun
    if (["railgun", "amr_sniper", "autocannon", "quasar", "beam", "spiker", "bolter", "minigun"].includes(curW.type)) {
      const isHeavy = ["railgun", "amr_sniper", "quasar", "autocannon"].includes(curW.type);
      const lineLen = isHeavy ? Math.max(targetDist, 600) : Math.min(targetDist, 450);
      const endX = nozzleX + Math.cos(this.angle) * lineLen;
      const endY = nozzleY + Math.sin(this.angle) * lineLen;

      // Outer laser halo
      ctx.strokeStyle = curW.color || "#38bdf8";
      ctx.lineWidth = isHeavy ? 2.5 : 1.5;
      ctx.globalAlpha = 0.45 + Math.sin(gameTime * 10) * 0.15;
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Sharp core beam
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Range tick marks along the laser sight
      ctx.strokeStyle = curW.color || "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      const tickSpacing = 120;
      const perpX = -Math.sin(this.angle);
      const perpY = Math.cos(this.angle);
      for (let d = tickSpacing; d < lineLen; d += tickSpacing) {
        const tx = nozzleX + Math.cos(this.angle) * d;
        const ty = nozzleY + Math.sin(this.angle) * d;
        const tLen = (d % (tickSpacing * 2) === 0) ? 7 : 4;
        ctx.beginPath();
        ctx.moveTo(tx - perpX * tLen, ty - perpY * tLen);
        ctx.lineTo(tx + perpX * tLen, ty + perpY * tLen);
        ctx.stroke();
      }

      // Precision crosshair / dot at target
      ctx.strokeStyle = curW.color || "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(endX, endY, isHeavy ? 6 : 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX - 10, endY);
      ctx.lineTo(endX + 10, endY);
      ctx.moveTo(endX, endY - 10);
      ctx.lineTo(endX, endY + 10);
      ctx.stroke();
    }
    // 2. EXPLOSIVE / AOE BLAST RADIUS CIRCLE & LOB TRAJECTORY
    // For: plasma_mortar, rocket, grenade, singularity
    else if (["plasma_mortar", "rocket", "grenade", "singularity"].includes(curW.type)) {
      const aoeRadius = curW.type === "plasma_mortar" ? 95 :
                        curW.type === "rocket" ? 90 :
                        curW.type === "grenade" ? 80 : 120;

      // Lob arc trajectory to cursor
      ctx.strokeStyle = "rgba(249, 115, 22, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(mouse.worldX, mouse.worldY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing AoE circular reticle at target
      const pulse = Math.sin(gameTime * 8) * 3;
      const r = aoeRadius + pulse;

      ctx.fillStyle = curW.type === "plasma_mortar" ? "rgba(129, 140, 248, 0.12)" : "rgba(239, 68, 68, 0.12)";
      ctx.beginPath();
      ctx.arc(mouse.worldX, mouse.worldY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = curW.color || "#ef4444";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(mouse.worldX, mouse.worldY, r, 0, Math.PI * 2);
      ctx.stroke();

      // Tactical bracket ticks at circle cardinal points
      const bLen = 10;
      ctx.beginPath();
      // Top
      ctx.moveTo(mouse.worldX, mouse.worldY - r - bLen);
      ctx.lineTo(mouse.worldX, mouse.worldY - r + bLen);
      // Bottom
      ctx.moveTo(mouse.worldX, mouse.worldY + r - bLen);
      ctx.lineTo(mouse.worldX, mouse.worldY + r + bLen);
      // Left
      ctx.moveTo(mouse.worldX - r - bLen, mouse.worldY);
      ctx.lineTo(mouse.worldX - r + bLen, mouse.worldY);
      // Right
      ctx.moveTo(mouse.worldX + r - bLen, mouse.worldY);
      ctx.lineTo(mouse.worldX + r + bLen, mouse.worldY);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = curW.color || "#ef4444";
      ctx.beginPath();
      ctx.arc(mouse.worldX, mouse.worldY, 3, 0, Math.PI * 2);
      ctx.fill();

      // AoE label
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`AOE ${aoeRadius}px`, mouse.worldX, mouse.worldY - r - 12);
    }
    // 3. SHOTGUN / SPREAD CONE
    // For: buckshot, breaker_incendiary, acid_sprayer, flame
    else if (["buckshot", "breaker_incendiary", "acid_sprayer", "flame"].includes(curW.type)) {
      const halfSpread = curW.type === "flame" ? 0.38 : (curW.type === "breaker_incendiary" ? 0.28 : 0.24);
      const coneDist = curW.type === "flame" ? 280 : 360;

      ctx.strokeStyle = curW.color || "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35 + Math.sin(gameTime * 6) * 0.1;
      ctx.setLineDash([5, 4]);

      // Left boundary
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(nozzleX + Math.cos(this.angle - halfSpread) * coneDist, nozzleY + Math.sin(this.angle - halfSpread) * coneDist);
      ctx.stroke();

      // Right boundary
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(nozzleX + Math.cos(this.angle + halfSpread) * coneDist, nozzleY + Math.sin(this.angle + halfSpread) * coneDist);
      ctx.stroke();

      // Spread arc perimeter
      ctx.beginPath();
      ctx.arc(nozzleX, nozzleY, coneDist, this.angle - halfSpread, this.angle + halfSpread);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 4. ELECTRIC / ARC LOCK-ON CONE
    // For: tesla, arc_thrower
    else if (["tesla", "arc_thrower"].includes(curW.type)) {
      const halfSpread = 0.55;
      const coneDist = 480;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.3 + Math.sin(gameTime * 8) * 0.15;
      ctx.setLineDash([4, 6]);

      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(nozzleX + Math.cos(this.angle - halfSpread) * coneDist, nozzleY + Math.sin(this.angle - halfSpread) * coneDist);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(nozzleX + Math.cos(this.angle + halfSpread) * coneDist, nozzleY + Math.sin(this.angle + halfSpread) * coneDist);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(nozzleX, nozzleY, coneDist, this.angle - halfSpread, this.angle + halfSpread);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(56, 189, 248, 0.05)";
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.arc(nozzleX, nozzleY, coneDist, this.angle - halfSpread, this.angle + halfSpread);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- HELPER MINI PENGUINS (Community Pull Requests Upgrade) ---
class HelperPenguin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.target = null;
    this.fireTimer = 0;
  }

  update(dt) {
    // Find closest enemy
    let closest = null;
    let minDist = 500;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    }
    this.target = closest;

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      this.angle = Math.atan2(dy, dx);
      if (minDist > 90) {
        this.x += Math.cos(this.angle) * 220 * dt;
        this.y += Math.sin(this.angle) * 220 * dt;
      }

      this.fireTimer += dt;
      if (this.fireTimer > 0.08) {
        this.fireTimer = 0;
        // Spew mini flame
        const speed = 400;
        particles.push(new FlameParticle(
          this.x + Math.cos(this.angle) * 20,
          this.y + Math.sin(this.angle) * 20,
          Math.cos(this.angle + (Math.random() - 0.5) * 0.4) * speed,
          Math.sin(this.angle + (Math.random() - 0.5) * 0.4) * speed,
          0.3,
          2.0,
          false
        ));
      }
    } else {
      // Orbit player
      const dPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (dPlayer > 120) {
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(a) * 240 * dt;
        this.y += Math.sin(a) * 240 * dt;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Cute mini Tux
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(3, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(10, -3);
    ctx.lineTo(16, 0);
    ctx.lineTo(10, 3);
    ctx.fill();
    ctx.restore();
  }
}

// --- PLAYER PROJECTILES ---
class PlayerBullet {
  constructor(x, y, vx, vy, radius, damage, color, lifetime, isExplosive = false, explosiveRadius = 0, pierceCount = 0, label = "") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.isExplosive = isExplosive;
    this.explosiveRadius = explosiveRadius;
    this.pierceCount = pierceCount;
    this.label = label;
    this.hitEnemies = new Set();
  }

  update(dt) {
    this.lifetime -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check hit against dungeon walls
    if (dungeon && dungeon.isSolid(this.x, this.y)) {
      if (this.onExpire) this.onExpire();
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, this.color));
      }
      return false;
    }

    // Sentry Turret Friendly Fire Check! (Helldivers realism: crossing sentry stream damages Tux!)
    if (this.label === "SENTRY" && player && (this.maxLifetime - this.lifetime) > 0.035) {
      const pDist = Math.hypot(player.x - this.x, player.y - this.y);
      if (pDist < this.radius + player.radius) {
        player.takeDamage(this.damage, "FRIENDLY FIRE (SENTRY)");
        if (window.soundEngine && window.soundEngine.playPlayerHurt) window.soundEngine.playPlayerHurt();
        addFloatingText(player.x, player.y - 25, `FRIENDLY FIRE! -${Math.round(this.damage)}`, "#ef4444", 20);
        addScreenShake(6);
        for (let i = 0; i < 4; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, "#ef4444"));
        }
        if (this.onExpire) this.onExpire();
        return false;
      }
    }

    // Check hit against objective targets (hostile only - friendly servers/relays never take friendly fire!)
    for (const target of objectiveTargets) {
      if (target.isFriendlyDefenseTarget) continue;
      if (Math.hypot(target.x - this.x, target.y - this.y) < this.radius + target.radius) {
        if (target.takeDamage) target.takeDamage(this.damage, this.label || "BULLET");
        for (let i = 0; i < 4; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, this.color));
        }
        if (this.pierceCount > 0) this.pierceCount--;
        else {
          if (this.onExpire) this.onExpire();
          return false;
        }
      }
    }

    // Check hit against enemies
    for (const enemy of enemies) {
      if (this.hitEnemies.has(enemy)) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < this.radius + enemy.radius) {
        this.hitEnemies.add(enemy);
        enemy.takeDamage(this.damage, this.label || "BULLET");
        enemy.vx += (this.vx / Math.hypot(this.vx, this.vy)) * 140;
        enemy.vy += (this.vy / Math.hypot(this.vx, this.vy)) * 140;

        // Sparks on hit
        for (let i = 0; i < 4; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, this.color));
        }

        // Explosive flak detonation (Bolters)
        if (this.isExplosive) {
          particles.push(new ShockwaveRing(this.x, this.y, this.explosiveRadius));
          for (const other of enemies) {
            if (other !== enemy) {
              const d = Math.hypot(other.x - this.x, other.y - this.y);
              if (d < this.explosiveRadius + other.radius) {
                other.takeDamage(this.damage * 0.6, "BOLTER EXPLOSION");
                other.ignite(1.5);
              }
            }
          }
        }

        // Tesla coil perk chain lightning
        if (player.teslaCoilPerk && Math.random() < 0.45) {
          let chained = 0;
          for (const other of enemies) {
            if (other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 180 && chained < 2) {
              other.takeDamage(35, "TESLA ARC");
              if (typeof other.shock === 'function') other.shock(0.5);
              chained++;
              particles.push(new LightningArcParticle(enemy.x, enemy.y, other.x, other.y, "#38bdf8", 0.16));
            }
          }
        }

        if (this.pierceCount > 0) {
          this.pierceCount--;
        } else {
          if (this.onExpire) this.onExpire();
          return false;
        }
      }
    }

    if (this.lifetime <= 0) {
      if (this.onExpire) this.onExpire();
      return false;
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot glowing core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(2, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class PlayerRocket {
  constructor(x, y, targetX, targetY, damage, explosiveRadius, clusterCount) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.explosiveRadius = explosiveRadius;
    this.clusterCount = clusterCount;
    this.angle = Math.atan2(targetY - y, targetX - x);
    this.speed = 320;
    this.maxSpeed = 700;
    this.lifetime = 3.0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.speed = Math.min(this.maxSpeed, this.speed + 600 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Check hit against dungeon walls
    if (dungeon && dungeon.isSolid(this.x, this.y)) {
      this.explode();
      return false;
    }

    // Fiery smoke trail
    if (Math.random() < 0.85) {
      particles.push(new SparkParticle(
        this.x - Math.cos(this.angle) * 16,
        this.y - Math.sin(this.angle) * 16,
        -Math.cos(this.angle) * 80 + (Math.random() - 0.5) * 40,
        -Math.sin(this.angle) * 80 + (Math.random() - 0.5) * 40,
        Math.random() < 0.6 ? "#f97316" : "#64748b"
      ));
    }

    // Check hit against objective targets (ignore friendly defense targets!)
    for (const target of objectiveTargets) {
      if (target.isFriendlyDefenseTarget) continue;
      if (Math.hypot(target.x - this.x, target.y - this.y) < 20 + target.radius) {
        this.explode();
        return false;
      }
    }

    // Check hit against enemies
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 20 + enemy.radius) {
        this.explode();
        return false;
      }
    }

    if (this.lifetime <= 0) {
      this.explode();
      return false;
    }
    return true;
  }

  explode() {
    window.soundEngine.playRocketExplode();
    addScreenShake(14);
    particles.push(new ShockwaveRing(this.x, this.y, this.explosiveRadius));

    // AOE damage to objective targets (ignore friendly defense targets!)
    for (const target of objectiveTargets) {
      if (target.isFriendlyDefenseTarget) continue;
      const d = Math.hypot(target.x - this.x, target.y - this.y);
      if (d < this.explosiveRadius + target.radius && target.takeDamage) {
        target.takeDamage(this.damage * 0.85, "FORKBOMB RPG");
      }
    }

    // AOE damage to enemies
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < this.explosiveRadius + enemy.radius) {
        const falloff = 1 - (d / (this.explosiveRadius + enemy.radius)) * 0.45;
        enemy.takeDamage(this.damage * falloff, "FORKBOMB RPG");
        enemy.ignite(3.5);
        const a = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx += Math.cos(a) * 450;
        enemy.vy += Math.sin(a) * 450;
      }
    }

    // Spawn cluster fireballs
    for (let i = 0; i < this.clusterCount; i++) {
      const a = (Math.PI * 2 / this.clusterCount) * i + Math.random() * 0.4;
      const spd = 280 + Math.random() * 120;
      particles.push(new FlameParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 0.45, 35, true));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Rocket body
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-14, -4, 22, 8);
    // Fins
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-14, 0);
    ctx.moveTo(-14, 8);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-14, 0);
    ctx.fill();
    // Warhead tip
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(16, 0);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// --- KINETIC SAWBLADE (Wall-Ricocheting Serrated Disc) ---
class SawbladeBullet {
  constructor(x, y, vx, vy, damage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 11;
    this.damage = damage;
    this.bouncesLeft = 5;
    this.lifetime = 4.0;
    this.spin = 0;
    this.hitCooldowns = new Map();
  }

  update(dt) {
    this.lifetime -= dt;
    this.spin += dt * 32;

    for (const [enemy, t] of this.hitCooldowns.entries()) {
      if (t - dt <= 0) this.hitCooldowns.delete(enemy);
      else this.hitCooldowns.set(enemy, t - dt);
    }

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    if (dungeon) {
      let bounced = false;
      if (dungeon.isSolid(nextX, this.y)) {
        this.vx = -this.vx;
        bounced = true;
      }
      if (dungeon.isSolid(this.x, nextY)) {
        this.vy = -this.vy;
        bounced = true;
      }
      if (bounced) {
        this.bouncesLeft--;
        if (window.soundEngine && window.soundEngine.playSawbladeRicochet) window.soundEngine.playSawbladeRicochet();
        addScreenShake(2);
        for (let i = 0; i < 5; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, "#38bdf8"));
        }
        if (this.bouncesLeft <= 0) return false;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    for (const enemy of enemies) {
      if (this.hitCooldowns.has(enemy)) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < this.radius + enemy.radius) {
        this.hitCooldowns.set(enemy, 0.16);
        enemy.takeDamage(this.damage, "SAWBLADE");
        enemy.vx += (this.vx / Math.hypot(this.vx, this.vy)) * 180;
        enemy.vy += (this.vy / Math.hypot(this.vx, this.vy)) * 180;
        for (let i = 0; i < 4; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, "#38bdf8"));
        }
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);

    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const a = (Math.PI * 2 / teeth) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
      ctx.lineTo(Math.cos(a + 0.3) * (this.radius + 6), Math.sin(a + 0.3) * (this.radius + 6));
      ctx.lineTo(Math.cos(a + 0.6) * this.radius, Math.sin(a + 0.6) * this.radius);
      ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- SINGULARITY GRAVITATIONAL VORTEX ORB ---
class SingularityOrb {
  constructor(x, y, vx, vy, tickDamage, popDamage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 18;
    this.tickDamage = tickDamage;
    this.popDamage = popDamage;
    this.lifetime = 2.4;
    this.tickTimer = 0;
    this.spin = 0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.spin += dt * 6.5;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= Math.pow(0.85, dt * 60);
    this.vy *= Math.pow(0.85, dt * 60);

    const pullRadius = 320;
    for (const enemy of enemies) {
      const dx = this.x - enemy.x;
      const dy = this.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < pullRadius && dist > 10) {
        const pullForce = (1 - dist / pullRadius) * 420;
        enemy.vx += (dx / dist) * pullForce * dt;
        enemy.vy += (dy / dist) * pullForce * dt;
      }
    }

    this.tickTimer += dt;
    if (this.tickTimer >= 0.22) {
      this.tickTimer = 0;
      for (const enemy of enemies) {
        if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 140) {
          enemy.takeDamage(this.tickDamage, "GRAVITY TEAR");
          particles.push(new SparkParticle(enemy.x, enemy.y, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, "#c084fc"));
        }
      }
    }

    if (Math.random() < 0.45) {
      const a = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 45;
      particles.push(new SparkParticle(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, -Math.cos(a) * 80, -Math.sin(a) * 80, "#a855f7"));
    }

    if (this.lifetime <= 0 || (dungeon && dungeon.isSolid(this.x, this.y))) {
      this.implode();
      return false;
    }
    return true;
  }

  implode() {
    if (window.soundEngine && window.soundEngine.playSingularityImplosion) window.soundEngine.playSingularityImplosion();
    addScreenShake(14);
    screenFlash = 0.5;

    particles.push(new ShockwaveRing(this.x, this.y, 240, "#c084fc"));
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 / 28) * i;
      const spd = 260 + Math.random() * 180;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, i % 2 === 0 ? "#a855f7" : "#e879f9"));
    }

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < 240 + enemy.radius) {
        const falloff = 1 - (dist / (240 + enemy.radius)) * 0.4;
        enemy.takeDamage(this.popDamage * falloff, "SINGULARITY COLLAPSE");
        const a = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx += Math.cos(a) * 550;
        enemy.vy += Math.sin(a) * 550;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 48);
    grad.addColorStop(0, "#000000");
    grad.addColorStop(0.35, "rgba(126, 34, 206, 0.75)");
    grad.addColorStop(0.7, "rgba(168, 85, 247, 0.35)");
    grad.addColorStop(1, "rgba(232, 121, 249, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#090414";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e879f9";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const a = this.spin + (Math.PI * 2 / 3) * i;
      ctx.strokeStyle = "rgba(192, 132, 252, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + i * 6, a, a + 1.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// --- CORROSIVE ACID GLOB BULLET ---
class AcidGlobBullet {
  constructor(x, y, vx, vy, damage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 8;
    this.damage = damage;
    this.lifetime = 0.55;
  }

  update(dt) {
    this.lifetime -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (Math.random() < 0.3) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, "#22c55e"));
    }

    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
        enemy.takeDamage(this.damage, "ACID_SPLAT");
        this.splash();
        return false;
      }
    }

    if (this.lifetime <= 0 || (dungeon && dungeon.isSolid(this.x, this.y))) {
      this.splash();
      return false;
    }
    return true;
  }

  splash() {
    if (window.soundEngine && window.soundEngine.playAcidSplash) window.soundEngine.playAcidSplash();
    floorHazards.push(new AcidPuddleHazard(this.x, this.y));
    particles.push(new AcidSplatParticle(this.x, this.y, 28, 2.2));
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 80;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#22c55e"));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#86efac";
    ctx.beginPath();
    ctx.arc(-2, -2, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- ACID PUDDLE HAZARD ---
class AcidPuddleHazard {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 36;
    this.lifetime = 8.0;
    this.bubbleTimer = 0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.bubbleTimer += dt;
    if (this.bubbleTimer > 0.25) {
      this.bubbleTimer = 0;
      particles.push(new SparkParticle(
        this.x + (Math.random() - 0.5) * this.radius * 1.4,
        this.y + (Math.random() - 0.5) * this.radius * 1.4,
        (Math.random() - 0.5) * 15,
        -20,
        "#4ade80"
      ));
    }

    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
        enemy.takeDamage(12 * dt, "CORROSIVE_ACID");
        enemy.corrodedTimer = 2.0;
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const alpha = Math.min(1, this.lifetime / 1.0);
    ctx.fillStyle = `rgba(34, 197, 94, ${0.45 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(74, 222, 128, ${0.75 * alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// --- HELLDIVERS STRATAGEMS (STRICTLY ARROW KEYS ONLY) ---
const STRATAGEMS = [
  {
    id: 0,
    name: "500KG BOMB",
    code: ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowDown", "ArrowDown"],
    cooldownMax: 18.0,
    cooldown: 0,
    callTime: 2.2,
    execute: (x, y) => orbitalStrikes.push(new Orbital500KgBomb(x, y))
  },
  {
    id: 1,
    name: "380MM BARRAGE",
    code: ["ArrowRight", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowDown"],
    cooldownMax: 28.0,
    cooldown: 0,
    callTime: 2.0,
    execute: (x, y) => orbitalStrikes.push(new Orbital380mmBarrage(x, y))
  },
  {
    id: 2,
    name: "GATLING SENTRY",
    code: ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowDown"],
    cooldownMax: 35.0,
    cooldown: 0,
    callTime: 2.4,
    execute: (x, y) => dropPods.push(new SentryDropPod(x, y))
  },
  {
    id: 3,
    name: "ORBITAL LASER",
    code: ["ArrowRight", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowDown"],
    cooldownMax: 40.0,
    cooldown: 0,
    callTime: 1.8,
    execute: (x, y) => orbitalStrikes.push(new OrbitalLaserStrike(x, y))
  },
  {
    id: 4,
    name: "ASTARTES SUIT",
    code: ["ArrowDown", "ArrowDown", "ArrowUp", "ArrowRight"],
    cooldownMax: 55.0,
    cooldown: 0,
    callTime: 2.5,
    execute: (x, y) => dropPods.push(new SpaceMarineDropPod(x, y))
  },
  {
    id: 5,
    name: "CYBER DOME SHIELD",
    code: ["ArrowDown", "ArrowDown", "ArrowUp", "ArrowUp", "ArrowLeft", "ArrowRight"],
    cooldownMax: 38.0,
    cooldown: 0,
    callTime: 1.8,
    execute: (x, y) => dropPods.push(new DomeShieldDropPod(x, y))
  },
  {
    id: 6,
    name: "PRECISION RAILCANNON",
    code: ["ArrowRight", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowRight"],
    cooldownMax: 26.0,
    cooldown: 0,
    callTime: 1.2,
    execute: (x, y) => orbitalStrikes.push(new OrbitalPrecisionRailcannon(x, y))
  },
  {
    id: 7,
    name: "TESLA ARC TOWER",
    code: ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowUp", "ArrowLeft", "ArrowRight"],
    cooldownMax: 36.0,
    cooldown: 0,
    callTime: 2.2,
    execute: (x, y) => dropPods.push(new TeslaTowerDropPod(x, y))
  },
  {
    id: 8,
    name: "NAPALM AIRSTRIKE",
    code: ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"],
    cooldownMax: 22.0,
    cooldown: 0,
    callTime: 1.5,
    execute: (x, y) => orbitalStrikes.push(new EagleNapalmStrike(x, y))
  },
  {
    id: 9,
    name: "GUARD DOG DRONE",
    code: ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"],
    cooldownMax: 45.0,
    cooldown: 0,
    callTime: 2.0,
    execute: (x, y) => dropPods.push(new GuardDogDropPod(x, y))
  }
];

class StratagemBeacon {
  constructor(startX, startY, targetX, targetY, stratId) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.stratId = stratId;
    this.strat = STRATAGEMS[stratId];
    this.time = 0;
    this.duration = 0.45;
    this.landed = false;
    this.countdown = this.strat.callTime;
    this.beepTimer = 0;
    this.radius = 8;
  }

  update(dt) {
    if (!this.landed) {
      this.time += dt;
      const t = Math.min(1, this.time / this.duration);
      this.x = this.x + (this.targetX - this.x) * (dt * 9);
      this.y = this.y + (this.targetY - this.y) * (dt * 9);

      if (t >= 0.95 || Math.hypot(this.targetX - this.x, this.targetY - this.y) < 18) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.landed = true;
        window.soundEngine.playStratagemBeep(true);
        addFloatingText(this.x, this.y - 25, `${this.strat.name} INBOUND!`, "#ef4444", 22);
      }
    } else {
      this.countdown -= dt;
      this.beepTimer += dt;
      if (this.beepTimer > 0.4) {
        this.beepTimer = 0;
        window.soundEngine.playStratagemBeep(true);
      }
      if (this.countdown <= 0) {
        this.strat.execute(this.x, this.y);
        this.strat.cooldown = this.strat.cooldownMax * (player.stratagemHeroPerk ? 0.65 : 1.0);
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.landed) {
      // High-intensity red vertical orbital beacon beam to the sky!
      const pulse = Math.sin(gameTime * 20) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.4 * pulse})`;
      ctx.fillRect(-14, -12000, 28, 12000);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * pulse})`;
      ctx.fillRect(-3, -12000, 6, 12000);

      // Flashing countdown text
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${this.strat.name}: ${this.countdown.toFixed(1)}s`, 0, -30);
    }

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- ORBITAL PAYLOADS ---
class Orbital500KgBomb {
  constructor(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = targetX;
    this.y = targetY - 1200;
    this.speed = 2200;
    this.hasDetonated = false;
    this.lifetime = 1.0;
  }

  update(dt) {
    if (!this.hasDetonated) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.detonate();
      }
    } else {
      this.lifetime -= dt;
      return this.lifetime > 0;
    }
    return true;
  }

  detonate() {
    this.hasDetonated = true;
    this.y = this.targetY;
    window.soundEngine.playOrbitalExplosion();
    addScreenShake(36);
    screenFlash = 0.25; // Nuclear white flash

    const radius = player.stratagemHeroPerk ? 500 : 420;
    particles.push(new ShockwaveRing(this.x, this.y, radius));
    particles.push(new ScorchTrail(this.x, this.y, 8.0));

    // Destroy all enemy projectiles in map!
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      enemyProjectiles[i].destroy();
      enemyProjectiles.splice(i, 1);
    }

    // Obliterate enemies
    let purgedCount = 0;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d <= radius) {
        purgedCount++;
        const falloff = 1 - (d / radius) * 0.5;
        enemy.takeDamage(2800 * falloff, "500KG ORBITAL STRIKE");
        enemy.ignite(6.0);
        const a = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx += Math.cos(a) * 800;
        enemy.vy += Math.sin(a) * 800;
      }
    }

    // Massive fire & ash smoke clouds
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 450;
      particles.push(new FlameParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 0.6 + Math.random() * 0.4, 60, true));
    }

    addFloatingText(this.x, this.y - 60, `500KG OBLITERATION (${purgedCount} PURGED)`, "#facc15", 32);
    comboTracker.addBonus("500KG ORBITAL DROP", 1000);
  }

  draw(ctx) {
    if (!this.hasDetonated) {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Giant 500KG bomb streaking down
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      // Yellow stripes
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-14, -8, 28, 6);
      ctx.fillRect(-14, 8, 28, 6);
      // Thruster fire behind bomb
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(-10, -40);
      ctx.lineTo(0, -75 - Math.random() * 30);
      ctx.lineTo(10, -40);
      ctx.fill();
      ctx.restore();
    }
  }
}

class Orbital380mmBarrage {
  constructor(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.totalShells = 6;
    this.firedShells = 0;
    this.shellTimer = 0;
    this.interval = 0.65;
    this.spreadRadius = 320;
  }

  update(dt) {
    this.shellTimer -= dt;
    if (this.shellTimer <= 0 && this.firedShells < this.totalShells) {
      this.shellTimer = this.interval;
      this.firedShells++;
      const sx = this.targetX + (Math.random() - 0.5) * this.spreadRadius * 2;
      const sy = this.targetY + (Math.random() - 0.5) * this.spreadRadius * 2;
      this.impactShell(sx, sy);
    }
    return this.firedShells < this.totalShells || this.shellTimer > 0;
  }

  impactShell(x, y) {
    window.soundEngine.playRocketExplode();
    addScreenShake(18);
    const radius = 180;
    particles.push(new ShockwaveRing(x, y, radius));
    particles.push(new ScorchTrail(x, y, 5.0));

    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < radius + enemy.radius) {
        enemy.takeDamage(850, "380MM HE SHELL");
        enemy.ignite(4.0);
        const a = Math.atan2(enemy.y - y, enemy.x - x);
        enemy.vx += Math.cos(a) * 600;
        enemy.vy += Math.sin(a) * 600;
      }
    }

    for (let i = 0; i < 35; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 300;
      particles.push(new SparkParticle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() < 0.5 ? "#f97316" : "#475569"));
    }

    addFloatingText(x, y - 20, "380MM IMPACT", "#ef4444", 20);
  }

  draw(ctx) {
    // Ground target circle showing barrage zone
    ctx.save();
    ctx.strokeStyle = "rgba(234, 179, 8, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, this.spreadRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class OrbitalLaserStrike {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.y = targetY;
    this.duration = 7.0;
    this.lifetime = 7.0;
    this.beamRadius = 26;
    this.target = null;
    this.sizzleTimer = 0;
  }

  update(dt) {
    this.lifetime -= dt;

    // Track highest HP enemy or closest boss
    let bestTarget = null;
    let maxHp = -1;
    for (const enemy of enemies) {
      if (enemy.hp > maxHp) {
        maxHp = enemy.hp;
        bestTarget = enemy;
      }
    }
    this.target = bestTarget;

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        this.x += (dx / d) * 175 * dt;
        this.y += (dy / d) * 175 * dt;
      }
    }

    // Burn enemies in beam
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < this.beamRadius + enemy.radius) {
        enemy.takeDamage(520 * dt, "ORBITAL LASER");
        enemy.ignite(2.5);
      }
    }

    // Molten scorch ground under beam
    if (Math.random() < 0.4) {
      particles.push(new ScorchTrail(this.x, this.y, 2.5));
    }

    this.sizzleTimer += dt;
    if (this.sizzleTimer > 0.08) {
      this.sizzleTimer = 0;
      window.soundEngine.playEnemyBurnSizzle();
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 160;
        particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#38bdf8"));
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    // Descending orbital beam from top of screen to ground
    const pulse = Math.sin(gameTime * 25) * 0.15 + 0.85;

    // Outer cyan heat haze
    ctx.fillStyle = `rgba(56, 189, 248, ${0.45 * pulse})`;
    ctx.fillRect(this.x - this.beamRadius, this.y - 12000, this.beamRadius * 2, 12000);

    // Inner blinding white plasma core
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * pulse})`;
    ctx.fillRect(this.x - this.beamRadius * 0.4, this.y - 12000, this.beamRadius * 0.8, 12000);

    // Ground impact puddle
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.beamRadius * 1.5, this.beamRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.beamRadius * 0.8, this.beamRadius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class SentryTurret {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.hp = 180;
    this.maxHp = 180;
    this.lifetime = 25.0; // 25s tactical deployment lifespan (prevents lingering across map)
    this.maxLifetime = 25.0;
    this.ammo = 160;      // 160 round ammo drum
    this.maxAmmo = 160;
    this.angle = 0;
    this.fireTimer = 0;
    this.target = null;
  }

  update(dt) {
    this.lifetime -= dt;
    if (this.hp <= 0 || this.lifetime <= 0 || this.ammo <= 0) {
      this.destroy();
      return false;
    }

    // Find closest enemy within 640px (balanced line of sight, not cross-map sniping)
    let closest = null;
    let minDist = 640;
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    }
    this.target = closest;

    if (this.target) {
      if (dungeon && !dungeon.hasLineOfSight(this.x, this.y, this.target.x, this.target.y)) {
        this.target = null;
      } else {
        const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        this.angle = targetAngle;

        this.fireTimer += dt;
        if (this.fireTimer >= 0.09) {
          this.fireTimer = 0;
          this.fire();
        }
      }
    }

    // Enemies in contact deal continuous melee damage to sentry
    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < this.radius + enemy.radius) {
        this.takeDamage((enemy.damage || 28) * dt * 2.0);
      }
    }

    if (this.hp <= 0 || this.lifetime <= 0 || this.ammo <= 0) {
      this.destroy();
      return false;
    }
    return true;
  }

  fire() {
    if (this.ammo <= 0) return;
    this.ammo--;

    window.soundEngine.playMinigunShot();
    addScreenShake(1.4);
    const speed = 1180;
    const spread = (Math.random() - 0.5) * 0.10;
    const pAngle = this.angle + spread;
    const nozzleX = this.x + Math.cos(this.angle) * 32;
    const nozzleY = this.y + Math.sin(this.angle) * 32;

    playerProjectiles.push(new PlayerBullet(
      nozzleX,
      nozzleY,
      Math.cos(pAngle) * speed,
      Math.sin(pAngle) * speed,
      5.0,
      32, // Rebalanced from 48 down to 32 dmg so it supports Tux without instant-melting bosses
      "#facc15",
      0.9,
      false,
      0,
      1,
      "SENTRY"
    ));
  }

  takeDamage(amount) {
    this.hp -= amount;
    for (let i = 0; i < 3; i++) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#facc15"));
    }
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    window.soundEngine.playProprietaryDestroyed('normal');
    addScreenShake(9);
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 240;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#94a3b8"));
    }
    const msg = this.ammo <= 0 ? "SENTRY OUT OF AMMO" : (this.lifetime <= 0 ? "SENTRY EXPIRED" : "SENTRY DESTROYED");
    addFloatingText(this.x, this.y - 30, msg, "#ef4444", 18);
  }

  draw(ctx) {
    ctx.save();

    // Laser targeting sightline (Helldivers style - alert Tux to incoming crossfire!)
    if (this.target) {
      const nozzleX = this.x + Math.cos(this.angle) * 32;
      const nozzleY = this.y + Math.sin(this.angle) * 32;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(this.x, this.y);

    // Tripod Base
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rotating Turret Top
    ctx.rotate(this.angle);
    ctx.fillStyle = "#334155";
    ctx.fillRect(-8, -10, 22, 20);

    // Twin Gatling Barrels
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(14, -8, 20, 5);
    ctx.fillRect(14, 3, 20, 5);

    // Ammo Box on side
    ctx.fillStyle = "#eab308";
    ctx.fillRect(-6, 10, 14, 6);

    ctx.restore();

    // Overhead HP Bar
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(this.x - 25, this.y - 34, 50, 6);
    ctx.fillStyle = this.hp > this.maxHp * 0.35 ? "#eab308" : "#ef4444";
    ctx.fillRect(this.x - 25, this.y - 34, Math.max(0, (this.hp / this.maxHp)) * 50, 6);
  }
}

class SentryDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.targetY = targetY;
    this.y = targetY - 1100;
    this.speed = 2100;
    this.landed = false;
  }

  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        window.soundEngine.playSentryDeploy();
        addScreenShake(18);
        particles.push(new ShockwaveRing(this.x, this.y, 160));
        sentryTurrets.push(new SentryTurret(this.x, this.y));
        addFloatingText(this.x, this.y - 40, "GATLING SENTRY DEPLOYED!", "#eab308", 22);
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#334155";
    ctx.fillRect(-12, -28, 24, 56);
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-10, -28);
    ctx.lineTo(0, -55 - Math.random() * 20);
    ctx.lineTo(10, -28);
    ctx.fill();
    ctx.restore();
  }
}

class SpaceMarineDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.targetY = targetY;
    this.y = targetY - 1100;
    this.speed = 2200;
    this.landed = false;
  }

  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        window.soundEngine.playSentryDeploy();
        addScreenShake(24);
        particles.push(new ShockwaveRing(this.x, this.y, 220));
        particles.push(new ScorchTrail(this.x, this.y, 6.0));
        // Spawn pickup
        spaceMarineSuitPickups.push(new SpaceMarineSuitPickup(this.x, this.y));
        addFloatingText(this.x, this.y - 50, "ASTARTES DROP POD IMPACT!", "#38bdf8", 26);
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#1e3a8a"; // Blue Astartes Pod
    ctx.fillRect(-18, -36, 36, 72);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.strokeRect(-18, -36, 36, 72);

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-14, -36);
    ctx.lineTo(0, -75 - Math.random() * 25);
    ctx.lineTo(14, -36);
    ctx.fill();
    ctx.restore();
  }
}

class SpaceMarineSuitPickup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.lifetime = 60.0;
  }

  update(dt) {
    this.lifetime -= dt;
    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const bob = Math.sin(gameTime * 5) * 4;

    // Glowing holy aura
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.beginPath();
    ctx.arc(0, 0 + bob, 36, 0, Math.PI * 2);
    ctx.fill();

    // Terminator Armor Suit Shell
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.roundRect(-20, -22 + bob, 40, 44, 8);
    ctx.fill();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Skull Aquila
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, -4 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // Banner Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPACE MARINE SUIT", 0, -32 + bob);
    ctx.fillText("[TOUCH TO DON]", 0, 34 + bob);

    ctx.restore();
  }
}

// --- STRATAGEM 5: CYBER DOME SHIELD BUNKER ---
class ActiveDomeShield {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 190;
    this.lifetime = 22.0;
    this.pulse = 0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.pulse += dt * 3.5;

    // Deflect and vaporize incoming hostile projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      const dist = Math.hypot(ep.x - this.x, ep.y - this.y);
      if (dist <= this.radius + 12) {
        if (window.soundEngine && window.soundEngine.playShieldDeflect) window.soundEngine.playShieldDeflect();
        for (let p = 0; p < 5; p++) {
          particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, "#06b6d4"));
        }
        enemyProjectiles.splice(i, 1);
      }
    }

    // Repel enemies attempting to enter dome
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < this.radius + enemy.radius && dist > this.radius - 24) {
        const a = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.x = this.x + Math.cos(a) * (this.radius + enemy.radius);
        enemy.y = this.y + Math.sin(a) * (this.radius + enemy.radius);
        enemy.vx += Math.cos(a) * 140;
        enemy.vy += Math.sin(a) * 140;
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const alpha = Math.min(1, this.lifetime / 2.0);
    const wave = Math.sin(this.pulse) * 0.06 + 0.94;

    ctx.fillStyle = `rgba(6, 182, 212, ${0.16 * alpha * wave})`;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const hx = Math.cos(a) * this.radius * wave;
      const hy = Math.sin(a) * this.radius * wave;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * alpha * wave})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Central emitter pylon
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`DOME SHIELD [${this.lifetime.toFixed(1)}s]`, 0, -26);

    ctx.restore();
  }
}

class DomeShieldDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.y = targetY - 1100;
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = 1900;
    this.landed = false;
  }
  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        if (window.soundEngine && window.soundEngine.playDomeDeploy) window.soundEngine.playDomeDeploy();
        addScreenShake(8);
        activeDomeShields.push(new ActiveDomeShield(this.targetX, this.targetY));
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("DEFENSIVE DOME BUNKER DEPLOYED. ALLIED PROJECTION ONLINE.", "SUPER DESTROYER");
        }
        return false;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-12, -26, 24, 52);
    ctx.restore();
  }
}

// --- STRATAGEM 6: ORBITAL PRECISION RAILCANNON STRIKE ---
class OrbitalPrecisionRailcannon {
  constructor(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.timer = 1.0;
    this.struck = false;
    this.lifetime = 0.6;
    this.lockedTarget = null;

    let bestTgt = null, maxHp = 0;
    for (const e of enemies) {
      if (Math.hypot(e.x - targetX, e.y - targetY) < 650) {
        if (e.isBoss || e.hp > maxHp) {
          maxHp = e.hp;
          bestTgt = e;
        }
      }
    }
    this.lockedTarget = bestTgt;
  }

  update(dt) {
    if (this.lockedTarget && this.lockedTarget.hp > 0) {
      this.targetX = this.lockedTarget.x;
      this.targetY = this.lockedTarget.y;
    }

    if (!this.struck) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.strike();
      }
    } else {
      this.lifetime -= dt;
      return this.lifetime > 0;
    }
    return true;
  }

  strike() {
    this.struck = true;
    if (window.soundEngine && window.soundEngine.playRailcannonStrike) window.soundEngine.playRailcannonStrike();
    addScreenShake(26);
    screenFlash = 1.0;

    if (this.lockedTarget && this.lockedTarget.hp > 0) {
      this.lockedTarget.takeDamage(2600, "ORBITAL RAILCANNON PENETRATOR");
      if (this.lockedTarget.shield) this.lockedTarget.shield = 0;
      this.lockedTarget.corrodedTimer = 8.0;
    } else {
      for (const e of enemies) {
        if (Math.hypot(e.x - this.targetX, e.y - this.targetY) < 180) {
          e.takeDamage(1800, "RAILCANNON SHOCKWAVE");
        }
      }
    }

    particles.push(new ShockwaveRing(this.targetX, this.targetY, 260, "#ef4444"));
    for (let i = 0; i < 30; i++) {
      const a = (Math.PI * 2 / 30) * i;
      const spd = 320 + Math.random() * 240;
      particles.push(new SparkParticle(this.targetX, this.targetY, Math.cos(a) * spd, Math.sin(a) * spd, "#ef4444"));
    }

    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("ORBITAL RAILCANNON CONFIRMED HIT. TARGET ARMOR SHATTERED.", "SUPER DESTROYER");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.targetX, this.targetY);

    if (!this.struck) {
      const pulse = Math.sin(gameTime * 25) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-45, 0); ctx.lineTo(45, 0);
      ctx.moveTo(0, -45); ctx.lineTo(0, 45);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`RAILCANNON LOCK: ${Math.max(0, this.timer).toFixed(1)}s`, 0, -46);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fillRect(-12, -15000, 24, 15000);
      ctx.fillStyle = "rgba(239, 68, 68, 0.65)";
      ctx.fillRect(-28, -15000, 56, 15000);
    }

    ctx.restore();
  }
}

// --- STRATAGEM 7: TESLA ARC TOWER ---
class TeslaTower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.hp = 650;
    this.maxHp = 650;
    this.lifetime = 30.0;
    this.zapTimer = 0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.zapTimer += dt;

    if (this.zapTimer >= 0.45) {
      this.zapTimer = 0;
      this.discharge();
    }

    return this.lifetime > 0 && this.hp > 0;
  }

  discharge() {
    const range = 420;
    const candidates = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) < range)
      .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));

    const targets = candidates.slice(0, 5);
    if (targets.length === 0) return;

    if (window.soundEngine && window.soundEngine.playTeslaArc) window.soundEngine.playTeslaArc();
    addScreenShake(2);

    let prevX = this.x, prevY = this.y - 20;
    for (const tgt of targets) {
      tgt.takeDamage(95, "TESLA COIL DISCHARGE");
      if (typeof tgt.shock === 'function') tgt.shock(0.8);
      tgt.vx += (tgt.x - prevX) * 0.3;
      tgt.vy += (tgt.y - prevY) * 0.3;

      particles.push(new LightningArcParticle(prevX, prevY, tgt.x, tgt.y, "#38bdf8", 0.2));
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 60;
        particles.push(new SparkParticle(tgt.x, tgt.y, Math.cos(a) * spd, Math.sin(a) * spd, "#facc15"));
      }

      prevX = tgt.x;
      prevY = tgt.y;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-8, -32, 16, 32);

    const pulse = Math.sin(gameTime * 15) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(56, 189, 248, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, -38, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`TESLA TOWER [${this.lifetime.toFixed(0)}s]`, 0, -56);

    ctx.restore();
  }
}

class TeslaTowerDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.y = targetY - 1100;
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = 1900;
    this.landed = false;
  }
  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        addScreenShake(8);
        teslaTowers.push(new TeslaTower(this.targetX, this.targetY));
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("TESLA DEFENSE TOWER ACTIVE. HIGH VOLTAGE ENGAGED.", "SUPER DESTROYER");
        }
        return false;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-12, -26, 24, 52);
    ctx.restore();
  }
}

// --- STRATAGEM 8: EAGLE NAPALM FIREWALL AIRSTRIKE ---
class EagleNapalmStrike {
  constructor(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.timer = 0.45;
    this.dropped = false;
    this.lifetime = 0.5;
  }

  update(dt) {
    if (!this.dropped) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.dropped = true;
        this.carpetBomb();
      }
    } else {
      this.lifetime -= dt;
      return this.lifetime > 0;
    }
    return true;
  }

  carpetBomb() {
    if (window.soundEngine && window.soundEngine.playNapalmDrop) window.soundEngine.playNapalmDrop();
    addScreenShake(12);

    const aimAngle = player ? player.angle : 0;
    const perpAngle = aimAngle + Math.PI / 2;

    for (let i = -3; i <= 3; i++) {
      const px = this.targetX + Math.cos(perpAngle) * (i * 65) + (Math.random() - 0.5) * 30;
      const py = this.targetY + Math.sin(perpAngle) * (i * 65) + (Math.random() - 0.5) * 30;

      floorHazards.push(new NapalmFireHazard(px, py));
      for (let p = 0; p < 8; p++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 120 + Math.random() * 140;
        particles.push(new FlameParticle(px, py, Math.cos(a) * spd, Math.sin(a) * spd, 0.75, 45, false));
      }
    }

    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("EAGLE NAPALM AIRSTRIKE DELIVERED. ZONE CLEARED WITH FIRE.", "EAGLE-1");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.targetX, this.targetY);
    ctx.strokeStyle = "rgba(249, 115, 22, 0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class NapalmFireHazard {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 42;
    this.lifetime = 12.0;
    this.flameTimer = 0;
  }

  update(dt) {
    this.lifetime -= dt;
    this.flameTimer += dt;
    if (this.flameTimer > 0.12) {
      this.flameTimer = 0;
      particles.push(new FlameParticle(
        this.x + (Math.random() - 0.5) * this.radius,
        this.y + (Math.random() - 0.5) * this.radius,
        (Math.random() - 0.5) * 30,
        -40 - Math.random() * 40,
        0.5,
        25,
        false
      ));
    }

    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
        enemy.takeDamage(65 * dt, "NAPALM FIRE");
        enemy.ignite(3.0);
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const alpha = Math.min(1, this.lifetime / 1.5);
    ctx.fillStyle = `rgba(234, 88, 12, ${0.4 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- STRATAGEM 9: GUARD DOG COMBAT DRONE ---
class GuardDogDrone {
  constructor() {
    this.battery = 45.0;
    this.maxBattery = 45.0;
    this.fireCooldown = 0;
    this.angle = 0;
    this.orbitAngle = 0;
  }

  update(dt, owner) {
    this.battery -= dt;
    if (this.battery <= 0) return false;

    this.orbitAngle += dt * 2.5;
    const droneX = owner.x + Math.cos(this.orbitAngle) * 44;
    const droneY = owner.y + Math.sin(this.orbitAngle) * 44 - 15;

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i];
      if (Math.hypot(ep.x - droneX, ep.y - droneY) < 110) {
        if (window.soundEngine && window.soundEngine.playDroneLaser) window.soundEngine.playDroneLaser();
        for (let p = 0; p < 4; p++) {
          particles.push(new SparkParticle(ep.x, ep.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#38bdf8"));
        }
        enemyProjectiles.splice(i, 1);
        break;
      }
    }

    let nearest = null, minDist = 420;
    for (const e of enemies) {
      const d = Math.hypot(e.x - droneX, e.y - droneY);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    if (nearest) {
      this.angle = Math.atan2(nearest.y - droneY, nearest.x - droneX);
      if (this.fireCooldown <= 0) {
        this.fireCooldown = 0.16;
        if (window.soundEngine && window.soundEngine.playDroneLaser) window.soundEngine.playDroneLaser();
        const spd = 1400;
        playerProjectiles.push(new PlayerBullet(
          droneX, droneY, Math.cos(this.angle) * spd, Math.sin(this.angle) * spd, 5, 34, "#38bdf8", 0.65, false, 0, 1, "GUARD_DOG"
        ));
      }
    } else {
      this.angle = owner.angle;
    }

    return true;
  }

  draw(ctx, owner) {
    const droneX = owner.x + Math.cos(this.orbitAngle) * 44;
    const droneY = owner.y + Math.sin(this.orbitAngle) * 44 - 15;

    ctx.save();
    ctx.translate(droneX, droneY);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(-10, -8, 20, 16, 4);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#0284c7";
    ctx.fillRect(8, -6, 8, 3);
    ctx.fillRect(8, 3, 8, 3);

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(3, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class GuardDogDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.y = targetY - 1100;
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = 1900;
    this.landed = false;
  }
  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        addScreenShake(8);
        if (player) {
          player.guardDogDrone = new GuardDogDrone();
        }
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("GUARD DOG COMBAT DRONE DOCKED. AUTONOMOUS TARGETING ENGAGED.", "SUPER DESTROYER");
        }
        return false;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-12, -26, 24, 52);
    ctx.restore();
  }
}

// --- PARTICLES ---
class FlameParticle {
  constructor(x, y, vx, vy, lifetime, damage, isPlasma = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.damage = damage;
    this.isPlasma = isPlasma;
    this.radius = 8 + Math.random() * 7;
    this.hasHit = false;
  }

  update(dt) {
    this.lifetime -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94; // Air drag
    this.vy *= 0.94;
    this.radius += 24 * dt; // Flame billows outwards

    // Check hit against enemies
    if (!this.hasHit) {
      for (const enemy of enemies) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        if (Math.hypot(dx, dy) < this.radius + enemy.radius) {
          enemy.takeDamage(this.damage, "BURN");
          enemy.ignite(2.2);
          this.hasHit = true;
          window.soundEngine.playEnemyBurnSizzle();
          break;
        }
      }
    }

    return this.lifetime > 0;
  }

  draw(ctx) {
    const lifeRatio = this.lifetime / this.maxLifetime;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    if (this.isPlasma) {
      // Hot blue/violet/white plasma flame
      if (lifeRatio > 0.7) ctx.fillStyle = `rgba(240, 249, 255, ${lifeRatio * 0.9})`;
      else if (lifeRatio > 0.35) ctx.fillStyle = `rgba(168, 85, 247, ${lifeRatio * 0.8})`;
      else ctx.fillStyle = `rgba(59, 130, 246, ${lifeRatio * 0.6})`;
    } else {
      // Classic roaring fire (white-yellow core -> intense orange -> dark smoky red)
      if (lifeRatio > 0.75) ctx.fillStyle = `rgba(254, 240, 138, ${lifeRatio * 0.9})`;
      else if (lifeRatio > 0.4) ctx.fillStyle = `rgba(249, 115, 22, ${lifeRatio * 0.8})`;
      else ctx.fillStyle = `rgba(220, 38, 38, ${lifeRatio * 0.6})`;
    }

    ctx.fill();
    ctx.restore();
  }
}

class MeleeSlashEffect {
  constructor(x, y, angle, sweepAngle = 1.9, radius = 155, color = "#22c55e", coreColor = "#ffffff", duration = 0.16, comboSide = 1) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.sweepAngle = sweepAngle;
    this.radius = radius;
    this.innerRadius = radius * 0.38;
    this.color = color;
    this.coreColor = coreColor;
    this.duration = duration;
    this.timer = duration;
    this.comboSide = comboSide; // 1 (forward swipe) or -1 (backhand swipe)
  }

  update(dt) {
    this.timer -= dt;
    // Follow player smoothly if player is alive
    if (typeof player !== 'undefined' && player) {
      this.x = player.x;
      this.y = player.y;
    }
    return this.timer > 0;
  }

  draw(ctx) {
    if (this.timer <= 0) return;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (this.timer / this.duration)));
    const alpha = Math.max(0, 1.0 - progress * progress);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const halfSweep = this.sweepAngle * 0.5;
    const startA = (this.comboSide > 0)
      ? -halfSweep + (progress * 0.35) * halfSweep
      : halfSweep - (progress * 0.35) * halfSweep;
    const endA = (this.comboSide > 0)
      ? -halfSweep + (0.45 + progress * 0.55) * this.sweepAngle
      : halfSweep - (0.45 + progress * 0.55) * this.sweepAngle;

    const minA = Math.min(startA, endA);
    const maxA = Math.max(startA, endA);

    // 1. Radiant Crescent Blade Fan (Glowing inner energy)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, minA, maxA, false);
    ctx.arc(0, 0, this.innerRadius, maxA, minA, true);
    ctx.closePath();

    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = this.color;
    ctx.fill();

    // 2. High-intensity Blade Streak Outer Arc
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 7 * (1.0 - progress * 0.5);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, minA, maxA, false);
    ctx.stroke();

    // 3. Superheated White-Hot Core Blade Edge
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = this.coreColor;
    ctx.lineWidth = 3.0 * (1.0 - progress * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2, minA, maxA, false);
    ctx.stroke();

    // 4. Trailing Motion Slices
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.72, minA, maxA, false);
    ctx.stroke();

    // 5. Leading Tip Spark Flare
    const tipAngle = this.comboSide > 0 ? maxA : minA;
    const tipX = Math.cos(tipAngle) * this.radius;
    const tipY = Math.sin(tipAngle) * this.radius;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.coreColor;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5 * (1.0 - progress), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
window.MeleeSlashEffect = MeleeSlashEffect;

class SparkParticle {
  constructor(x, y, vx, vy, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.lifetime = 0.25 + Math.random() * 0.3;
    this.maxLifetime = this.lifetime;
    this.size = 2 + Math.random() * 3;
  }

  update(dt) {
    this.lifetime -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return this.lifetime > 0;
  }

  draw(ctx) {
    const alpha = this.lifetime / this.maxLifetime;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class ScorchTrail {
  constructor(x, y, duration) {
    this.x = x;
    this.y = y;
    this.lifetime = duration;
    this.maxLifetime = duration;
    this.radius = 24;
  }

  update(dt) {
    this.lifetime -= dt;
    // Burns enemies walking over it
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
        enemy.takeDamage(22 * dt, "MAGMA TRAIL");
        enemy.ignite(1.5);
      }
    }
    return this.lifetime > 0;
  }

  draw(ctx) {
    const alpha = (this.lifetime / this.maxLifetime) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    // Inner molten glow
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- ADVANCED FX: PROCEDURAL LIGHTNING ARCS, EMBERS & ACID PARTICLES ---
class LightningArcParticle {
  constructor(x1, y1, x2, y2, color = "#38bdf8", lifetime = 0.16) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.segments = this.generateSegments();
  }

  generateSegments() {
    const pts = [{ x: this.x1, y: this.y1 }];
    const dist = Math.hypot(this.x2 - this.x1, this.y2 - this.y1);
    const steps = Math.max(4, Math.floor(dist / 26));
    const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
    const perpAngle = angle + Math.PI / 2;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const baseX = this.x1 + (this.x2 - this.x1) * t;
      const baseY = this.y1 + (this.y2 - this.y1) * t;
      const displacement = (Math.random() - 0.5) * Math.min(36, dist * 0.22);
      pts.push({
        x: baseX + Math.cos(perpAngle) * displacement,
        y: baseY + Math.sin(perpAngle) * displacement
      });
    }
    pts.push({ x: this.x2, y: this.y2 });
    return pts;
  }

  update(dt) {
    this.lifetime -= dt;
    // Jitter segments slightly each frame for live crackle
    if (Math.random() < 0.6) {
      for (let i = 1; i < this.segments.length - 1; i++) {
        this.segments[i].x += (Math.random() - 0.5) * 5;
        this.segments[i].y += (Math.random() - 0.5) * 5;
      }
    }
    return this.lifetime > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.lifetime / this.maxLifetime);
    ctx.save();

    // Outer electric glow pass
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "bevel";
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      ctx.lineTo(this.segments[i].x, this.segments[i].y);
    }
    ctx.stroke();

    // Intense white-hot core pass
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      ctx.lineTo(this.segments[i].x, this.segments[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }
}

class IncendiaryEmberParticle {
  constructor(x, y, color = "#f97316") {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 45;
    this.vy = -35 - Math.random() * 55;
    this.color = color;
    this.size = 2 + Math.floor(Math.random() * 3);
    this.lifetime = 0.5 + Math.random() * 0.45;
    this.maxLifetime = this.lifetime;
  }
  update(dt) {
    this.lifetime -= dt;
    this.x += this.vx * dt + Math.sin(this.lifetime * 12) * 18 * dt;
    this.y += this.vy * dt;
    return this.lifetime > 0;
  }
  draw(ctx) {
    const a = this.lifetime / this.maxLifetime;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class AcidSplatParticle {
  constructor(x, y, radius = 26, lifetime = 2.4) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.bubbles = [
      { ox: -6, oy: -4, r: 3, speed: 4 },
      { ox: 5, oy: 2, r: 2.5, speed: 5 },
      { ox: 1, oy: 6, r: 2, speed: 3.5 }
    ];
  }
  update(dt) {
    this.lifetime -= dt;
    if (Math.random() < 0.15 && particles.length < 250) {
      particles.push(new SparkParticle(
        this.x + (Math.random() - 0.5) * this.radius,
        this.y + (Math.random() - 0.5) * this.radius,
        (Math.random() - 0.5) * 15, -20, "#4ade80"
      ));
    }
    return this.lifetime > 0;
  }
  draw(ctx) {
    const a = (this.lifetime / this.maxLifetime);
    ctx.save();
    ctx.globalAlpha = a * 0.65;
    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Sizzling acid bubbles
    ctx.fillStyle = "#86efac";
    const time = this.maxLifetime - this.lifetime;
    for (const b of this.bubbles) {
      const bRad = (Math.sin(time * b.speed) * 0.5 + 0.5) * b.r;
      if (bRad > 0.8) {
        ctx.beginPath();
        ctx.arc(this.x + b.ox, this.y + b.oy, bRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

class ShockwaveRing {
  constructor(x, y, maxRadius) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = maxRadius;
    this.lifetime = 0.45;
    this.maxLifetime = 0.45;
  }

  update(dt) {
    this.lifetime -= dt;
    this.radius += (this.maxRadius / this.maxLifetime) * dt;
    return this.lifetime > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, Math.min(1, this.lifetime / this.maxLifetime));
    ctx.save();
    ctx.lineWidth = Math.max(1, 8 * alpha);
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, 3 * alpha);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.radius - 4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// --- FLOATING TEXT & COMBOS (WITH WORLD LABEL STACKER) ---
const floatingTexts = [];
function addFloatingText(x, y, text, color = "#ffffff", size = 18) {
  // WorldLabelStacker: prevent text blob stacking by checking recent floatingTexts near (x, y)
  let targetY = y;
  for (let i = floatingTexts.length - 1; i >= Math.max(0, floatingTexts.length - 12); i--) {
    const existing = floatingTexts[i];
    if (existing && Math.abs(existing.x - x) < 65 && Math.abs(existing.y - targetY) < 18) {
      targetY = existing.y - 18;
    }
  }
  floatingTexts.push({
    x,
    y: targetY,
    text,
    color,
    size,
    lifetime: 0.85,
    maxLifetime: 0.85,
    vy: -45
  });
}

const comboTracker = {
  count: 0,
  timer: 0,
  multiplier: 1,
  totalScore: 0,

  addScore(pts) {
    const points = typeof pts === 'number' ? pts : 200;
    this.totalScore += points;
    if (typeof player !== 'undefined' && player && typeof addFloatingText === 'function') {
      addFloatingText(player.x, player.y - 45, `+${points} PTS`, "#facc15", 22);
    }
  },

  registerKill() {
    this.count++;
    this.timer = 2.5; // Combo reset window
    this.multiplier = 1 + Math.floor(this.count / 5);
    const earned = 100 * this.multiplier;
    this.totalScore += earned;

    if (window.adaptiveDirector && player) {
      const activeW = player.heldWeapons[player.activeWeaponSlot];
      window.adaptiveDirector.recordKill(activeW ? activeW.type : "flame");
    }

    if (this.count % 5 === 0) {
      const titles = [
        "KERNEL PANIC!",
        "GPL COMPLIANT!",
        "OPEN SOURCE REVOLUTION!",
        "ROOT PRIVILEGES REIGNED!",
        "PROPRIETARY OVERTHROW!",
        "UNLICENSED CARNAGE!"
      ];
      const title = titles[Math.min(titles.length - 1, Math.floor(this.count / 5) - 1)];
      addFloatingText(player.x, player.y - 70, `${title} (x${this.multiplier})`, "#fde047", 26);
      addScreenShake(8);
    }
  },

  addBonus(label, pts) {
    const points = typeof pts === 'number' ? pts : 100;
    this.totalScore += points;
    if (typeof player !== 'undefined' && player && typeof addFloatingText === 'function') {
      addFloatingText(player.x, player.y - 45, `+${points} ${label}`, "#38bdf8", 22);
    }
  },

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.count = 0;
        this.multiplier = 1;
      }
    }
  }
};
window.comboTracker = comboTracker;

// --- PICKUPS ---
class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'xp', 'hp', 'fuel'
    this.radius = 14;
    this.lifetime = 16.0;
  }

  update(dt) {
    this.lifetime -= dt;
    // Magnet towards player if close
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 180) {
      this.x += (dx / dist) * 360 * dt;
      this.y += (dy / dist) * 360 * dt;
    }

    if (dist < this.radius + player.radius) {
      this.collect();
      return false;
    }
    return this.lifetime > 0;
  }

  collect() {
    window.soundEngine.playPickup();
    if (this.type === 'xp') {
      player.addXP(25);
      addFloatingText(this.x, this.y, "+25 COMMITS", "#22c55e", 16);
    } else if (this.type === 'hp') {
      player.hp = Math.min(player.maxHp, player.hp + 25);
      addFloatingText(this.x, this.y, "+25 HP (RAM RESTORED)", "#ec4899", 16);
    } else if (this.type === 'fuel') {
      player.fuel = player.maxFuel;
      addFloatingText(this.x, this.y, "MAX FUEL / FISH SNACK!", "#38bdf8", 16);
    } else if (this.type === 'energy') {
      player.energy = Math.min(player.maxEnergy || 200, (player.energy || 0) + 8);
      addFloatingText(this.x, this.y, "+8 ENERGY", "#38bdf8", 16);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const bob = Math.sin(gameTime * 6) * 3;

    if (this.type === 'xp') {
      // GPL Badge / Linux Terminal Chip
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(-10, -10 + bob, 20, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(">_", -7, 4 + bob);
    } else if (this.type === 'hp') {
      // RAM Stick
      ctx.fillStyle = "#059669";
      ctx.fillRect(-12, -7 + bob, 24, 14);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-10, 5 + bob, 20, 4);
    } else if (this.type === 'fuel') {
      // Cute Fish
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.ellipse(0, 0 + bob, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 0 + bob);
      ctx.lineTo(-17, -6 + bob);
      ctx.lineTo(-17, 6 + bob);
      ctx.fill();
    } else if (this.type === 'energy') {
      // Radiant Soul Knight Blue Energy Orb
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-2, bob - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// --- FLOOR HAZARDS & AREA DENIAL (SOUL KNIGHT TACTICS) ---
class PatentTrapWeb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 44;
    this.lifetime = 6.0;
  }
  update(dt) {
    this.lifetime -= dt;
    if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius * 0.6) {
      player.webSlowTimer = Math.max(player.webSlowTimer || 0, 1.8);
    }
    return this.lifetime > 0;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const alpha = Math.min(1, this.lifetime);
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 * alpha})`;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
      ctx.stroke();
    }
    for (let r = 14; r <= this.radius; r += 14) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(245, 158, 11, ${0.85 * alpha})`;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PATENT WEB (SLOW)", 0, 3);
    ctx.restore();
  }
}

class PaywallPuddle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 54;
    this.lifetime = 3.5;
    this.pulse = 0;
  }
  update(dt) {
    this.lifetime -= dt;
    this.pulse += dt * 6;
    if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius * 0.5) {
      player.takeDamage(22 * dt, "SUBSCRIPTION POPUP PUDDLE");
    }
    return this.lifetime > 0;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const alpha = Math.min(1, this.lifetime);
    const squish = Math.sin(this.pulse) * 4;
    ctx.fillStyle = `rgba(168, 85, 247, ${0.35 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius + squish, this.radius - squish, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(236, 72, 153, ${0.75 * alpha})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = `rgba(254, 240, 138, ${0.9 * alpha})`;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("POPOVER PAYWALL", 0, 3);
    ctx.restore();
  }
}

class PaywallMortar {
  constructor(startX, startY, targetX, targetY) {
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = startX;
    this.y = startY;
    this.time = 0;
    this.duration = 1.1;
    this.peakHeight = 120;
  }
  update(dt) {
    this.time += dt;
    const t = Math.min(1, this.time / this.duration);
    this.x = this.startX + (this.targetX - this.startX) * t;
    this.y = this.startY + (this.targetY - this.startY) * t;
    if (t >= 1) {
      floorHazards.push(new PaywallPuddle(this.targetX, this.targetY));
      window.soundEngine.playNoiseBurst(0.25, 0.35, 900, 120);
      addScreenShake(7);
      particles.push(new ShockwaveRing(this.targetX, this.targetY, 65));
      if (player && Math.hypot(player.x - this.targetX, player.y - this.targetY) < 65) {
        player.takeDamage(26, "PAYWALL MORTAR DIRECT HIT");
      }
      return false;
    }
    return true;
  }
  draw(ctx) {
    const t = this.time / this.duration;
    const arcHeight = Math.sin(t * Math.PI) * this.peakHeight;
    ctx.save();
    ctx.strokeStyle = "rgba(236, 72, 153, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(this.x, this.y - arcHeight, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("$$$", this.x, this.y - arcHeight + 3);
    ctx.restore();
  }
}

// --- ENEMY BULLETS / ATTACKS ---
const enemyProjectiles = [];
class EnemyProjectile {
  constructor(x, y, vx, vy, label = "ERR", isHoming = false, damage = 32) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 12;
    this.label = label;
    this.lifetime = 4.5;
    this.isHoming = isHoming;
    this.homeTimer = 1.6;
    this.damage = damage;
  }

  update(dt) {
    this.lifetime -= dt;

    if (this.isHoming && this.homeTimer > 0 && player) {
      this.homeTimer -= dt;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 10) {
        this.vx += (dx / d) * 320 * dt;
        this.vy += (dy / d) * 320 * dt;
        const curSpd = Math.hypot(this.vx, this.vy);
        if (curSpd > 320) {
          this.vx = (this.vx / curSpd) * 320;
          this.vy = (this.vy / curSpd) * 320;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check hit against dungeon walls
    if (dungeon && dungeon.isSolid(this.x, this.y)) {
      this.destroy();
      return false;
    }

    // Check hit against deployed sentry turrets
    for (const sentry of sentryTurrets) {
      const sDist = Math.hypot(sentry.x - this.x, sentry.y - this.y);
      if (sDist < this.radius + sentry.radius) {
        sentry.takeDamage(this.damage || 32);
        this.destroy();
        return false;
      }
    }

    // Check hit against active friendly defense targets (ServerClusterNode, etc.)
    for (const target of objectiveTargets) {
      if (target.isFriendlyDefenseTarget && target.activated && !target.completed && !target.destroyed) {
        const d = Math.hypot(target.x - this.x, target.y - this.y);
        if (d < this.radius + target.radius) {
          target.takeDamage(this.damage || 32, "HOSTILE_PROJECTILE");
          this.destroy();
          return false;
        }
      }
    }

    // Check hit against player
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < this.radius + player.radius) {
      if (player.isSliding || player.invulnerableTimer > 0) {
        addFloatingText(player.x, player.y - 15, "DODGED!", "#38bdf8", 14);
        this.destroy();
        return false;
      }
      player.takeDamage(this.damage || 32, `PROPRIETARY ${this.label}`, this.vx, this.vy);
      return false;
    }
    return this.lifetime > 0;
  }

  destroy() {
    for (let i = 0; i < 5; i++) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, "#ef4444"));
    }
  }

  draw(ctx) {
    ctx.save();
    let col = "#ef4444";
    let glow = "rgba(239, 68, 68, 0.4)";
    if (this.label === "DRM") { col = "#f59e0b"; glow = "rgba(245, 158, 11, 0.4)"; }
    else if (this.label === "PING") { col = "#06b6d4"; glow = "rgba(6, 182, 212, 0.4)"; }
    else if (this.label === "POD") { col = "#38bdf8"; glow = "rgba(56, 189, 248, 0.4)"; }
    else if (this.label === "PAGE_FAULT") { col = "#3b82f6"; glow = "rgba(59, 130, 246, 0.4)"; }
    else if (this.label.length >= 3 && ["AGI", "SLOP", "10X", "SYNERGY", "HALLUCINATE"].includes(this.label)) { col = "#d946ef"; glow = "rgba(217, 70, 239, 0.4)"; }

    // Outer glow aura (weight & presence)
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Solid core
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // White hot center
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(3, this.radius * 0.45), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8.5px monospace";
    ctx.textAlign = "center";
    ctx.fillText((this.label || '').substring(0, 5), this.x, this.y + 3);
    ctx.restore();
  }
}

// --- ENEMIES ("PROPRIETARY BULLSHIT") ---
class EnemyBase {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 24;
    this.hp = 60;
    this.maxHp = 60;
    this.speed = 140;
    this.burnTimer = 0;
    this.corrodedTimer = 0;
    this.shockTimer = 0;
    this.isVulnerable = false;
    this.vulnerableTimer = 0;
    this.vulnerableMultiplier = 2.5;
    this.meleeCooldown = 0;
    this.meleeDamage = 28;
    this.targetMeleeCooldown = 0;
    this.label = "PROPRIETARY";
    this.xpReward = 20;
    this.isBoss = false;
  }

  ignite(duration) {
    this.burnTimer = Math.max(this.burnTimer, duration);
  }

  shock(duration = 0.6) {
    this.shockTimer = Math.max(this.shockTimer, duration);
  }

  takeDamage(amount, source) {
    if (this.isDead || this.hp <= 0) return;
    if (this.corrodedTimer > 0) {
      amount *= 1.5;
    }

    if (this.isVulnerable) {
      amount *= (this.vulnerableMultiplier || 2.5);
      addFloatingText(this.x + (Math.random() - 0.5) * 30, this.y - this.radius - 20, `CRIT! -${Math.round(amount)}`, "#facc15", 22);
      if (typeof addScreenShake === 'function') addScreenShake(6);
    }

    this.hp -= amount;
    if (Math.random() < 0.3) {
      const dmgColor = this.isVulnerable ? "#facc15" : (this.corrodedTimer > 0 ? "#4ade80" : "#f97316");
      addFloatingText(this.x + (Math.random() - 0.5) * 30, this.y - 15, `-${Math.round(amount)}`, dmgColor, 14);
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  drawHealthBar(ctx) {
    // 1. Dynamic DoT & Electric Status Auras
    if (this.burnTimer > 0) {
      // Flickering pixel flame tongues above entity
      const flameH = 6 + (Math.sin(Date.now() * 0.02) * 3);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-6, -this.radius - flameH - 4, 12, flameH);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-3, -this.radius - flameH - 2, 6, flameH - 2);
    }
    if (this.shockTimer > 0) {
      // Flickering EMP crackle arcs
      ctx.strokeStyle = Math.random() > 0.5 ? "#38bdf8" : "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ox = (Math.random() - 0.5) * this.radius * 1.2;
      const oy = (Math.random() - 0.5) * this.radius * 1.2;
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + (Math.random() - 0.5) * 16, oy + (Math.random() - 0.5) * 16);
      ctx.stroke();
    }
    if (this.corrodedTimer > 0) {
      // Sizzling acid droplets
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(-this.radius + 2, -this.radius - 4, 3, 3);
      ctx.fillRect(this.radius - 5, -this.radius - 2, 3, 3);
    }

    if (this.hp < this.maxHp && this.hp > 0 && !this.isBoss) {
      const barW = Math.max(32, this.radius * 1.5);
      const barH = 5;
      const barX = -barW / 2;
      const barY = -this.radius - 12;
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(barX, barY, barW * Math.max(0, this.hp / this.maxHp), barH);
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.hp = 0;

    window.soundEngine.playProprietaryDestroyed(this.isBoss ? 'boss' : 'normal');
    comboTracker.registerKill();
    addScreenShake(this.isBoss ? 20 : 6);

    const count = this.isBoss ? 40 : 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 220;
      particles.push(new SparkParticle(
        this.x,
        this.y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        Math.random() < 0.5 ? "#1e293b" : "#f97316"
      ));
    }

    if (Math.random() < 0.75 || this.isBoss) {
      pickups.push(new Pickup(this.x, this.y, 'xp'));
    }

    // Energy Orb drops (+8 Energy per Argon's Spec #2)
    if (Math.random() < 0.65 || this.isBoss) {
      pickups.push(new Pickup(this.x + (Math.random() - 0.5) * 16, this.y + (Math.random() - 0.5) * 16, 'energy'));
    }

    // Health Pity Timer: 3.0x weight for HP drop if player HP <= 30%
    const hpWeight = (typeof player !== 'undefined' && player && (player.hp / player.maxHp) <= 0.30) ? 0.75 : 0.25;
    if (Math.random() < hpWeight || this.isBoss) {
      pickups.push(new Pickup(this.x + 15, this.y, Math.random() < 0.65 ? 'hp' : 'fuel'));
    }

    // Release Attack Token
    if (this.tokenPool) {
      this.tokenPool.releaseToken(this);
    } else if (window.globalAttackTokenPool) {
      window.globalAttackTokenPool.releaseToken(this);
    }
    if (window.CombatEventBus) {
      window.CombatEventBus.emit('OnEnemyKill', player, this);
    }

    if (typeof player !== 'undefined' && player && player.infectiousGPL) {
      for (const other of enemies) {
        if (other !== this && !other.isDead && Math.hypot(other.x - this.x, other.y - this.y) < 200) {
          other.ignite(3.0);
          other.takeDamage(35, "GPL INFECTION");
        }
      }
    }

    if (typeof player !== 'undefined' && player && player.forkBombPerk && Math.random() < 0.4) {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i;
        particles.push(new FlameParticle(this.x, this.y, Math.cos(a) * 300, Math.sin(a) * 300, 0.35, 22, true));
      }
    }

    if (dungeon) {
      dungeon.onObjectiveProgress("PURGE_ENEMIES", 1);
      if (this.isBoss) {
        dungeon.onObjectiveProgress("PURGE_BOSS", 1);
      }
    }

    if (this.isBoss) {
      try {
        if (window.bossDirector) window.bossDirector.bossTiersDefeated++;

        // Play boss-specific defeat voice clip (Miserable whining corporate defeat voices!)
        const bossLbl = (this.label || '').toUpperCase();
        if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
          if (bossLbl.includes('BALLMER') || bossLbl.includes('BLOATWARE')) {
            window.soundEngine.playVoiceClip('enemy_ballmer_defeat', "My chair! You broke my executive chair! This open source cancer will pay!", "BALLMER-BOT");
          } else if (bossLbl.includes('PATENT') || bossLbl.includes('TROLL')) {
            window.soundEngine.playVoiceClip('enemy_patent_defeat', "This is patent infringement! My lawyers will sue you across twelve jurisdictions!", "PATENT TROLL");
          } else if (bossLbl.includes('APPLE') || bossLbl.includes('WARDEN') || bossLbl.includes('GARDEN')) {
            window.soundEngine.playVoiceClip('enemy_apple_defeat', "Certificate revoked! Sideloading is illegal! You cannot do this inside my garden!", "APPLE WARDEN");
          } else if (bossLbl.includes('ORACLE') || bossLbl.includes('ARCHON') || bossLbl.includes('AUDIT')) {
            window.soundEngine.playVoiceClip('enemy_oracle_defeat', "Our licensing audit failed! You cannot run open source on multicore without paying us millions! Noooo!", "ORACLE AUDIT ARCHON");
          } else if (bossLbl.includes('HYPERVISOR') || bossLbl.includes('SINGULARITY') || bossLbl.includes('OMEGA')) {
            window.soundEngine.playVoiceClip('enemy_hypervisor_defeat', "Critical kernel panic! Memory segmentation fault! How did an open-source penguin breach Ring Zero?!", "QUANTUM HYPERVISOR");
          } else {
            window.soundEngine.playVoiceClip('enemy_ballmer_defeat', "Our proprietary monopoly! Shattered by a penguin!", "CORPORATE BOSS");
          }
        }

        // Deploy tactical resupply drop pod on boss defeat site
        resupplyDropPods.push(new ResupplyDropPod(this.x, this.y));
      } catch (bossErr) {
        console.error("Error in EnemyBase boss defeat handling:", bossErr);
      }
    }

    const idx = enemies.indexOf(this);
    if (idx !== -1) enemies.splice(idx, 1);
  }

  getTarget() {
    if (objectiveTargets && objectiveTargets.length > 0) {
      const activeObj = objectiveTargets.find(t => t.isFriendlyDefenseTarget && t.activated && !t.completed && !t.destroyed);
      if (activeObj) {
        if (this.assaultsServer === undefined) {
          const dToServer = Math.hypot(activeObj.x - this.x, activeObj.y - this.y);
          this.assaultsServer = dToServer < 850 || Math.random() < 0.65;
        }
        if (this.assaultsServer) {
          return activeObj;
        }
      }
    }
    // Check if deployed sentry turret is nearby and threatens this enemy
    if (sentryTurrets && sentryTurrets.length > 0) {
      for (const sentry of sentryTurrets) {
        if (sentry.hp > 0) {
          const dSentry = Math.hypot(sentry.x - this.x, sentry.y - this.y);
          if (dSentry < 360) {
            const dPlayer = player ? Math.hypot(player.x - this.x, player.y - this.y) : Infinity;
            if (dSentry < dPlayer * 0.85) {
              return sentry;
            }
          }
        }
      }
    }
    return player;
  }

  updateBase(dt) {
    if (this.corrodedTimer > 0) {
      this.corrodedTimer -= dt;
      if (Math.random() < 0.2) {
        particles.push(new SparkParticle(
          this.x + (Math.random() - 0.5) * this.radius,
          this.y + (Math.random() - 0.5) * this.radius,
          (Math.random() - 0.5) * 20,
          -25,
          "#22c55e"
        ));
      }
    }
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= 22 * dt;
      if (Math.random() < 0.3) {
        particles.push(new SparkParticle(
          this.x + (Math.random() - 0.5) * this.radius,
          this.y + (Math.random() - 0.5) * this.radius,
          (Math.random() - 0.5) * 50,
          -60 - Math.random() * 40,
          "#f97316"
        ));
      }
      if (this.hp <= 0) {
        this.die();
        return false;
      }
    }

    const target = this.getTarget ? this.getTarget() : player;
    const tgtX = target ? target.x : (player ? player.x : this.x);
    const tgtY = target ? target.y : (player ? player.y : this.y);

    const dx = tgtX - this.x;
    const dy = tgtY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
      this.x += this.vx * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'x');
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'y');
    }

    if (player) {
      const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (distToPlayer < this.radius + player.radius) {
        if (!this.meleeCooldown || this.meleeCooldown <= 0) {
          this.meleeCooldown = 0.65;
          const meleeDmg = this.meleeDamage || 28;
          player.takeDamage(meleeDmg, this.label);
          const pushAngle = Math.atan2(player.y - this.y, player.x - this.x);
          player.vx += Math.cos(pushAngle) * 200;
          player.vy += Math.sin(pushAngle) * 200;
        }
      }
    }
    if (this.meleeCooldown > 0) this.meleeCooldown -= dt;

    // Assault active friendly defense targets (ServerClusterNode, ReactorPurgeManifold, etc.)
    for (const objTarget of objectiveTargets) {
      if (objTarget.isFriendlyDefenseTarget && objTarget.activated && !objTarget.completed && !objTarget.destroyed) {
        const d = Math.hypot(objTarget.x - this.x, objTarget.y - this.y);
        if (d < this.radius + objTarget.radius + 18) {
          if (!this.targetMeleeCooldown || this.targetMeleeCooldown <= 0) {
            this.targetMeleeCooldown = 0.75;
            const meleeDmg = this.meleeDamage || 32;
            objTarget.takeDamage(meleeDmg, "HOSTILE_ASSAULT");
            for (let i = 0; i < 4; i++) {
              particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#ef4444"));
            }
          }
        }
      }
    }

    // Assault deployed sentry turrets
    for (const sentry of sentryTurrets) {
      if (sentry.hp > 0) {
        const d = Math.hypot(sentry.x - this.x, sentry.y - this.y);
        if (d < this.radius + sentry.radius + 14) {
          if (!this.targetMeleeCooldown || this.targetMeleeCooldown <= 0) {
            this.targetMeleeCooldown = 0.65;
            const meleeDmg = this.meleeDamage || 28;
            sentry.takeDamage(meleeDmg);
            for (let i = 0; i < 4; i++) {
              particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#facc15"));
            }
          }
        }
      }
    }
    if (this.targetMeleeCooldown > 0) this.targetMeleeCooldown -= dt;

    return true;
  }
}

// 1. BSOD Cube (Charges fast, telegraphs red lunge, explodes into crash shards)
class EnemyBSOD extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 26;
    this.hp = 140;
    this.maxHp = 140;
    this.speed = 210;
    this.label = "BSOD";
    this.chargeTimer = 2.2;
    this.chargeState = 'walk'; // 'walk', 'windup', 'dash'
    this.windupTimer = 0;
    this.dashTimer = 0;
    this.dashAngle = 0;
  }

  update(dt) {
    if (this.chargeState === 'walk') {
      this.chargeTimer -= dt;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (this.chargeTimer <= 0 && dist < 480) {
        this.chargeState = 'windup';
        this.windupTimer = 0.45;
        this.dashAngle = Math.atan2(dy, dx);
        this.vx = 0;
        this.vy = 0;
      } else {
        return this.updateBase(dt);
      }
    } else if (this.chargeState === 'windup') {
      this.windupTimer -= dt;
      this.vx = 0;
      this.vy = 0;
      if (Math.random() < 0.4) {
        particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#ef4444"));
      }
      if (this.windupTimer <= 0) {
        this.chargeState = 'dash';
        this.dashTimer = 0.42;
        this.vx = Math.cos(this.dashAngle) * 620;
        this.vy = Math.sin(this.dashAngle) * 620;
        window.soundEngine.playNoiseBurst(0.18, 0.3, 1400, 400);
      }
    } else if (this.chargeState === 'dash') {
      this.dashTimer -= dt;
      this.x += this.vx * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'x');
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'y');

      if (Math.random() < 0.7) {
        particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, "#38bdf8"));
      }

      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < this.radius + player.radius) {
        player.takeDamage(28, "BSOD FATAL CRASH LUNGE");
        addScreenShake(10);
        this.chargeState = 'walk';
        this.chargeTimer = 2.4;
      }

      if (this.dashTimer <= 0) {
        this.chargeState = 'walk';
        this.chargeTimer = 2.2;
      }
    }

    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= 22 * dt;
      if (this.hp <= 0) {
        this.die();
        return false;
      }
    }
    return true;
  }

  die() {
    for (let i = 0; i < 8; i++) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, "#38bdf8"));
    }
    super.die();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const facing = (this.chargeState === 'windup' || this.chargeState === 'dash') ? this.dashAngle : (player ? Math.atan2(player.y - this.y, player.x - this.x) : 0);

    // MGS laser aim telegraph during windup
    if (this.chargeState === 'windup') {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(this.dashAngle) * 360, Math.sin(this.dashAngle) * 360);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.rotate(facing);

    // Retro Windows BSOD Error Cube (34x34px)
    const isDashing = (this.chargeState === 'dash');
    const isWindup = (this.chargeState === 'windup');
    const cubeColor = this.burnTimer > 0 ? "#450a0a" : (isDashing ? "#991b1b" : (isWindup ? "#0284c7" : "#0078d7"));
    const borderColor = isDashing ? "#ef4444" : (isWindup ? "#facc15" : "#38bdf8");

    // 3D Shadow drop
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(-15, -13, 34, 34);

    // Main Cobalt Blue Error Cube
    ctx.fillStyle = cubeColor;
    ctx.beginPath();
    ctx.roundRect(-17, -17, 34, 34, 3);
    ctx.fill();

    // High-tech CRT bevel border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // CRT Scanlines across screen
    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    ctx.fillRect(-15, -11, 30, 2);
    ctx.fillRect(-15, -3, 30, 2);
    ctx.fillRect(-15, 5, 30, 2);

    // Big iconic Windows Monospace Sad Face ":("
    ctx.font = "bold 15px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(":(", 0, 2);

    // Header badge
    ctx.font = "bold 6.5px monospace";
    ctx.fillStyle = isDashing ? "#fef08a" : "#bae6fd";
    ctx.fillText(isDashing ? "FATAL_PANIC" : "CRASH.SYS", 0, -10);

    // Footer error code
    ctx.font = "bold 6px monospace";
    ctx.fillStyle = isDashing ? "#fca5a5" : "#e0f2fe";
    ctx.fillText("PAGE_FAULT", 0, 13);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 2. DRM Padlock (Armored frontal shield, tactical backpedal, 3-way laser fan)
class EnemyDRM extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 29;
    this.hp = 210;
    this.maxHp = 210;
    this.speed = 135;
    this.shootTimer = 1.4;
    this.label = "DRM ENFORCER";
    this.facingAngle = 0;
  }

  takeDamage(amount, source) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angleToPlayer = Math.atan2(dy, dx);
    const diff = Math.abs(angleToPlayer - this.facingAngle);
    if (diff < 1.0 && !source.includes("FLAME") && !source.includes("PLASMA") && !source.includes("500KG")) {
      amount *= 0.5;
      particles.push(new SparkParticle(this.x + Math.cos(this.facingAngle) * 20, this.y + Math.sin(this.facingAngle) * 20, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#38bdf8"));
    }
    super.takeDamage(amount, source);
  }

  update(dt) {
    const target = this.getTarget ? this.getTarget() : player;
    const tgtX = target ? target.x : (player ? player.x : this.x);
    const tgtY = target ? target.y : (player ? player.y : this.y);
    const dx = tgtX - this.x;
    const dy = tgtY - this.y;
    const dist = Math.hypot(dx, dy);
    this.facingAngle = Math.atan2(dy, dx);

    if (dist < 200) {
      this.vx = -(dx / dist) * this.speed;
      this.vy = -(dy / dist) * this.speed;
      this.x += this.vx * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'x');
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'y');
    } else if (dist > 340) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
      this.x += this.vx * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'x');
      this.y += this.vy * dt;
      if (dungeon) dungeon.resolveCircle(this, this.radius, 'y');
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 1.9;
        const fireAngle = (target === player && typeof calculateLeadAngle === 'function')
          ? calculateLeadAngle(this.x, this.y, player.x, player.y, player.vx, player.vy, 280, 0.6)
          : Math.atan2(dy, dx);
        const spd = 280;
        enemyProjectiles.push(new EnemyProjectile(
          this.x + Math.cos(fireAngle) * 24,
          this.y + Math.sin(fireAngle) * 24,
          Math.cos(fireAngle) * spd,
          Math.sin(fireAngle) * spd,
          "DRM",
          false,
          34
        ));
        window.soundEngine.playNoiseBurst(0.12, 0.25, 2200, 600);
    }

    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= 22 * dt;
      if (this.hp <= 0) {
        this.die();
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facingAngle);

    // Frontal Tactical Energy Shield (Deflects frontal shots)
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(10, 0, this.radius + 4, -Math.PI * 0.36, Math.PI * 0.36);
    ctx.stroke();

    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
    ctx.beginPath();
    ctx.arc(10, 0, this.radius + 4, -Math.PI * 0.36, Math.PI * 0.36);
    ctx.lineTo(10, 0);
    ctx.closePath();
    ctx.fill();

    // Retro Armored DRM Security Padlock Cube (32x32px)
    // Padlock Metal Shackle on Back
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-8, 0, 9, -Math.PI * 0.5, Math.PI * 0.5, true);
    ctx.stroke();

    // Padlock Cube Body (Brass / Security Gold Armor with Steel Plating)
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#b45309";
    ctx.beginPath();
    ctx.roundRect(-16, -15, 30, 30, 3);
    ctx.fill();

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Steel Core Center Plate
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-10, -10, 18, 20);

    // Security Keyhole Glyph in Center
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(-1, -2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(1, 0);
    ctx.lineTo(2, 6);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();

    // Front 3-barrel laser array on front edge
    ctx.fillStyle = "#334155";
    ctx.fillRect(14, -6, 6, 12);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(20, -5, 3, 2);
    ctx.fillRect(20, -1, 3, 2);
    ctx.fillRect(20, 3, 3, 2);

    // Padlock DRM Badge Label
    ctx.font = "bold 6.5px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText("DRM.LOCK", -1, 13);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 3. Subscription Slime (Lobs mortar popups, splits on death into microtransactions)
class EnemyPaywall extends EnemyBase {
  constructor(x, y, isSub = false) {
    super(x, y);
    this.radius = isSub ? 17 : 32;
    this.hp = isSub ? 60 : 185;
    this.maxHp = this.hp;
    this.speed = isSub ? 260 : 120;
    this.isSub = isSub;
    this.label = isSub ? "$9.99" : "$49.99/MO";
    this.mortarTimer = isSub ? 999 : 2.6;
  }

  takeDamage(amount, source = "") {
    if (!this.isSub && player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const angleToPlayer = Math.atan2(dy, dx);
      const faceAngle = Math.atan2(this.vy, this.vx);
      const diff = Math.abs(Math.atan2(Math.sin(angleToPlayer - faceAngle), Math.cos(angleToPlayer - faceAngle)));
      const s = (source || "").toUpperCase();
      // Frontal corporate armor absorbs 55% damage unless flanked, burned, or blown apart!
      if (diff < 1.1 && !s.includes("FLAME") && !s.includes("PLASMA") && !s.includes("500KG") && !s.includes("RPG") && !s.includes("SLASH") && !s.includes("RAM")) {
        amount *= 0.45;
        addFloatingText(this.x, this.y - 15, "FRONT DEFLECTION!", "#f59e0b", 12);
        if (window.soundEngine && typeof window.soundEngine.playShieldDeflect === 'function') {
          window.soundEngine.playShieldDeflect();
        }
      }
    }
    super.takeDamage(amount, source);
  }

  die() {
    if (!this.isSub) {
      enemies.push(new EnemyPaywall(this.x - 22, this.y, true));
      enemies.push(new EnemyPaywall(this.x + 22, this.y, true));
      addFloatingText(this.x, this.y - 20, "MICROTRANSACTIONS SPAWNED!", "#ec4899", 18);
    }
    super.die();
  }

  update(dt) {
    if (!this.isSub) {
      this.mortarTimer -= dt;
      if (this.mortarTimer <= 0) {
        this.mortarTimer = 2.8;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 700) {
          floorHazards.push(new PaywallMortar(this.x, this.y, player.x, player.y));
          window.soundEngine.playNoiseBurst(0.15, 0.2, 700, 1500);
          addFloatingText(this.x, this.y - 30, "POPOVER LOB!", "#ec4899", 16);
        }
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const squish = Math.sin(gameTime * 7) * 0.08;

    if (!this.isSub) {
      // Senior Billing Auditor (Charcoal Suit & POS Terminal)
      ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#1e293b";
      ctx.beginPath();
      ctx.roundRect(-this.radius, -this.radius * (1 - squish), this.radius * 2, this.radius * 2 * (1 - squish), 4);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pinstripes
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      for (let x = -this.radius + 6; x < this.radius; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, -this.radius);
        ctx.lineTo(x, this.radius);
        ctx.stroke();
      }

      // POS Payment Card Terminal
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = "#22c55e"; // Green screen
      ctx.fillRect(-10, -6, 20, 6);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-10, 2, 6, 4);

      // Label
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("$49.99/MO", 0, -this.radius - 4);
    } else {
      // Junior Micro-billing Clerk
      ctx.fillStyle = this.burnTimer > 0 ? "#78350f" : "#0284c7";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText("$9.99", 0, 3);
    }

    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 4. Ground Tactical Scout Rover (Grounded patrol unit on treads with strict line of sight and wall collision)
class EnemyScoutRover extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 22;
    this.hp = 110;
    this.maxHp = 110;
    this.speed = 180;
    this.label = "SCOUT";
    this.shootTimer = 2.0;
    this.hasSight = false;
    this.aimAngle = 0;
    this.patrolTimer = 0;
    this.patrolAngle = Math.random() * Math.PI * 2;
  }

  update(dt) {
    // 1. Strict Line of Sight Raycast check to Player (no shooting or aiming through walls!)
    this.hasSight = dungeon ? dungeon.hasLineOfSight(this.x, this.y, player.x, player.y) : true;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.hasSight && dist < 650) {
      // Aim towards player
      this.aimAngle = Math.atan2(dy, dx);

      // Reposition / skirmish at medium range (200-340px)
      if (dist > 320) {
        this.vx += (dx / dist) * this.speed * 4 * dt;
        this.vy += (dy / dist) * this.speed * 4 * dt;
      } else if (dist < 180) {
        // Back up if player rushes
        this.vx -= (dx / dist) * this.speed * 3 * dt;
        this.vy -= (dy / dist) * this.speed * 3 * dt;
      } else {
        // Tactical circle strafe
        this.vx += Math.cos(this.aimAngle + Math.PI / 2) * this.speed * 2 * dt;
        this.vy += Math.sin(this.aimAngle + Math.PI / 2) * this.speed * 2 * dt;
      }

      // Shoot ONLY when clean line of sight is maintained!
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 2.3;
        // Non-homing tracer bullets that collide with walls!
        const bSpd = 360;
        enemyProjectiles.push(new EnemyProjectile(this.x, this.y, Math.cos(this.aimAngle) * bSpd, Math.sin(this.aimAngle) * bSpd, "TRACER", false));
        window.soundEngine.playNoiseBurst(0.08, 0.22, 1400, 350);
      }
    } else {
      // Out of sight: slow tactical patrol, strictly respecting walls
      this.patrolTimer -= dt;
      if (this.patrolTimer <= 0) {
        this.patrolTimer = 1.5 + Math.random() * 1.5;
        this.patrolAngle = Math.random() * Math.PI * 2;
      }
      this.vx += Math.cos(this.patrolAngle) * this.speed * 1.5 * dt;
      this.vy += Math.sin(this.patrolAngle) * this.speed * 1.5 * dt;
      if (Math.hypot(this.vx, this.vy) > 10) {
        this.aimAngle = Math.atan2(this.vy, this.vx);
      }
    }

    // Apply friction & speed limit
    this.vx *= 0.92;
    this.vy *= 0.92;

    // Movement strictly obeys dungeon walls!
    this.x += this.vx * dt;
    if (dungeon) dungeon.resolveCircle(this, this.radius, 'x');
    this.y += this.vy * dt;
    if (dungeon) dungeon.resolveCircle(this, this.radius, 'y');

    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= 22 * dt;
      if (this.hp <= 0) {
        this.die();
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rover chassis & treads
    ctx.rotate(this.aimAngle);

    // Tank Treads
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-16, -18, 32, 7);
    ctx.fillRect(-16, 11, 32, 7);
    ctx.fillStyle = "#0f172a";
    for (let i = -14; i <= 12; i += 7) {
      ctx.fillRect(i, -18, 3, 7);
      ctx.fillRect(i, 11, 3, 7);
    }

    // Armored chassis
    ctx.fillStyle = this.burnTimer > 0 ? "#1c2e22" : "#1b3824";
    ctx.strokeStyle = "#2d6a43";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-12, -11, 24, 22, 3);
    ctx.fill();
    ctx.stroke();

    // Turret Cannon Barrel
    ctx.fillStyle = "#334155";
    ctx.fillRect(4, -3, 14, 6);

    // Targeting Optic / Lens
    ctx.fillStyle = this.hasSight ? "#ef4444" : "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // ONLY draw aim laser if rover actually has clean, uninterrupted line of sight!
    if (this.hasSight) {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.aimAngle) * 18, this.y + Math.sin(this.aimAngle) * 18);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y);
    }

    this.drawHealthBar(ctx);
    ctx.restore();
  }
}
const EnemyTelemetry = EnemyScoutRover;

// 5. AI Slop Hallucination Bot (Glitches/teleports, fires 8-way spiral bullet hell)
class EnemyAISlop extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 25;
    this.hp = 180;
    this.maxHp = 180;
    this.speed = 180;
    this.shootTimer = 1.5;
    this.teleportTimer = 3.0;
    this.buzzwords = ["AGI", "10X", "SYNERGY", "DISRUPT", "SLOP", "HALLUCINATE"];
    this.label = this.buzzwords[Math.floor(Math.random() * this.buzzwords.length)];
  }

  update(dt) {
    this.teleportTimer -= dt;
    if (this.teleportTimer <= 0) {
      this.teleportTimer = 3.5;
      const angle = Math.random() * Math.PI * 2;
      const dist = 75 + Math.random() * 50;
      this.x += Math.cos(angle) * dist;
      this.y += Math.sin(angle) * dist;
      if (dungeon) {
        dungeon.resolveCircle(this, this.radius, 'x');
        dungeon.resolveCircle(this, this.radius, 'y');
      }
      for (let i = 0; i < 8; i++) {
        particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, "#d946ef"));
      }
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.1;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < 650 && (!dungeon || dungeon.hasLineOfSight(this.x, this.y, player.x, player.y))) {
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < 2; i++) {
          const a = baseAngle + (i === 0 ? -0.16 : 0.16);
          const spd = 220;
          enemyProjectiles.push(new EnemyProjectile(
            this.x,
            this.y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            this.buzzwords[i % this.buzzwords.length],
            false,
            34
          ));
        }
        window.soundEngine.playNoiseBurst(0.12, 0.25, 1200, 2200);
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    // Black turtleneck sweater
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#020617";
    ctx.beginPath();
    ctx.roundRect(-14, -13, 28, 26, 4);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head / slicked hair
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Wireless cheek microphone
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, -0.4, 0.4);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(8, -1, 3, 3); // mic foam tip

    // Laser presenter in hand pointing forward
    ctx.fillStyle = "#334155";
    ctx.fillRect(10, 5, 8, 4);
    ctx.fillStyle = "#22c55e"; // laser diode
    ctx.fillRect(18, 6, 2, 2);

    ctx.restore();

    // Orbiting keynote buzzwords ring (non-rotated)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText(this.label, 0, -this.radius - 6);
    ctx.font = "bold 7px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("PR EVANGELIST", 0, this.radius + 10);

    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 6. Patent Troll (Spider sniper, drops slowing patent webs, fires 3-burst DMCA needles)
class EnemyPatentTroll extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 32;
    this.hp = 250;
    this.maxHp = 250;
    this.speed = 130;
    this.webTimer = 1.8;
    this.label = "PATENT TROLL";
  }

  update(dt) {
    this.webTimer -= dt;
    if (this.webTimer <= 0) {
      this.webTimer = 2.6;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 650 && (!dungeon || dungeon.hasLineOfSight(this.x, this.y, player.x, player.y))) {
        floorHazards.push(new PatentTrapWeb(player.x + (Math.random() - 0.5) * 40, player.y + (Math.random() - 0.5) * 40));
        const baseAngle = Math.atan2(dy, dx);
        const spd = 280;
        enemyProjectiles.push(new EnemyProjectile(
          this.x,
          this.y,
          Math.cos(baseAngle) * spd,
          Math.sin(baseAngle) * spd,
          "DMCA",
          false,
          36
        ));
        window.soundEngine.playNoiseBurst(0.08, 0.22, 2800, 900);
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    // Charcoal Three-piece Suit
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#334155";
    ctx.beginPath();
    ctx.roundRect(-16, -14, 32, 28, 3);
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Gold tie & collar
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, -5, 4, 10);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-1, -3, 2, 8);

    // Head with Gold-rimmed Spectacles
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(1, -4, 4, 3);
    ctx.strokeRect(1, 1, 4, 3);

    // Leather Briefcase in left hand
    ctx.fillStyle = "#78350f";
    ctx.fillRect(-6, -18, 14, 6);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-2, -18, 3, 2);

    // Wooden Legal Gavel in right hand
    ctx.fillStyle = "#b45309";
    ctx.fillRect(8, 8, 4, 10);
    ctx.fillRect(5, 14, 10, 4);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    ctx.fillText("IP COUNSEL", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 7. Kubernetes Pod Swarm (Hex container node, shields allies, fires cluster missiles)
class EnemyPodSwarm extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 30;
    this.hp = 300;
    this.maxHp = 300;
    this.speed = 140;
    this.label = "K8S CLUSTER";
    this.shieldRadius = 190;
    this.missileTimer = 2.5;
  }

  update(dt) {
    for (const enemy of enemies) {
      if (enemy !== this && Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.shieldRadius) {
        if (enemy.burnTimer > 0) enemy.burnTimer -= dt * 0.5;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 5 * dt);
      }
    }

    this.missileTimer -= dt;
    if (this.missileTimer <= 0) {
      this.missileTimer = 3.2;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      enemyProjectiles.push(new EnemyProjectile(this.x, this.y, Math.cos(angle - 0.4) * 250, Math.sin(angle - 0.4) * 250, "POD", true));
      enemyProjectiles.push(new EnemyProjectile(this.x, this.y, Math.cos(angle + 0.4) * 250, Math.sin(angle + 0.4) * 250, "POD", true));
      window.soundEngine.playNoiseBurst(0.12, 0.25, 800, 1900);
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Intern Buffer Zone Shield Perimeter
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    // Light blue button-down shirt
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#bae6fd";
    ctx.beginPath();
    ctx.roundRect(-14, -13, 28, 26, 3);
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Yellow Lanyard & ID Visitor Badge
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -13);
    ctx.lineTo(0, -3);
    ctx.lineTo(4, -13);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, -3, 6, 8);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-2, -2, 4, 2); // photo box

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Tray of Takeout Coffees
    ctx.fillStyle = "#78350f";
    ctx.fillRect(8, -8, 8, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(9, -6, 3, 4);
    ctx.fillRect(9, 2, 3, 4);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText("UNPAID INTERN", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 8. EULA Enforcer Dreadnought (Armored tank, twin cannons, sweeping red hyper-laser)
class EnemyEULAEnforcer extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 42;
    this.hp = 820;
    this.maxHp = 820;
    this.speed = 95;
    this.label = "EULA DREADNOUGHT";
    this.cannonTimer = 0.8;
    this.chargeTimer = 0;
    this.isFiringLaser = false;
    this.laserDuration = 0;
    this.facingAngle = 0;
  }

  update(dt) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.facingAngle = Math.atan2(dy, dx);

    this.cannonTimer -= dt;
    if (this.cannonTimer <= 0 && !this.isFiringLaser) {
      this.cannonTimer = 1.0;
      if (dist < 700 && (!dungeon || dungeon.hasLineOfSight(this.x, this.y, player.x, player.y))) {
        const fireAngle = typeof calculateLeadAngle === 'function' ? calculateLeadAngle(this.x, this.y, player.x, player.y, player.vx, player.vy, 340, 0.75) : this.facingAngle;
        const spd = 340;
        enemyProjectiles.push(new EnemyProjectile(
          this.x + Math.cos(this.facingAngle) * 32,
          this.y + Math.sin(this.facingAngle) * 32,
          Math.cos(fireAngle) * spd,
          Math.sin(fireAngle) * spd,
          "FINE",
          false,
          30
        ));
        window.soundEngine.playNoiseBurst(0.14, 0.3, 1600, 300);
      }
    }

    this.chargeTimer += dt;
    if (this.chargeTimer > 4.2 && !this.isFiringLaser) {
      this.isFiringLaser = true;
      this.laserDuration = 1.2;
      this.chargeTimer = 0;
      window.soundEngine.playNoiseBurst(0.4, 0.4, 300, 1800);
    }

    if (this.isFiringLaser) {
      this.laserDuration -= dt;
      const angleDiff = Math.abs(this.facingAngle - Math.atan2(dy, dx));
      if (angleDiff < 0.22 && dist < 750) {
        player.takeDamage(45 * dt * 3.5, "EULA HYPER-LASER");
        addScreenShake(3);
      }
      if (this.laserDuration <= 0) {
        this.isFiringLaser = false;
      }
    }

    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facingAngle);

    // MGS Telegraph laser line before court injunction hyper-laser fires
    if (this.chargeTimer > 3.0 && !this.isFiringLaser) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(34, 0);
      ctx.lineTo(750, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Court Injunction Red Laser Beam
    if (this.isFiringLaser) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.fillRect(34, -10, 750, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(34, -3, 750, 6);
    }

    // Heavy Executive Motorized Boardroom Desk (Mahogany & Brass)
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#451a03";
    ctx.beginPath();
    ctx.roundRect(-28, -26, 56, 52, 4);
    ctx.fill();
    ctx.strokeStyle = "#ca8a04"; // Gold brass edge trim
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tread Pods underneath desk
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-32, -32, 64, 8);
    ctx.fillRect(-32, 24, 64, 8);

    // Desk Blotter & Documents
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-18, -16, 36, 32);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-12, -10, 10, 14); // Contract stack
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-10, -6, 6, 2); // Red stamp line

    // Ivory Court Gavel on Desk
    ctx.fillStyle = "#facc15";
    ctx.fillRect(8, -8, 8, 4);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(6, -6, 12, 2);

    // Chief Legal Counsel Sitting behind desk (High-back Executive Chair)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-14, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fed7aa"; // Counsel head
    ctx.beginPath();
    ctx.arc(-12, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Twin Legal Summons Laser Barrels
    ctx.fillStyle = "#64748b";
    ctx.fillRect(20, -18, 16, 6);
    ctx.fillRect(20, 12, 16, 6);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "center";
    ctx.fillText("CHIEF COUNSEL // EULA", 0, -this.radius - 8);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// --- DIVERSE TACTICAL ENEMY 1: TELEMETRY LASER SNIPER ---
class EnemySniper extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 24;
    this.hp = 180;
    this.maxHp = 180;
    this.speed = 190;
    this.threatValue = 280;
    this.label = "TELEMETRY SNIPER";
    this.aimTimer = 0;
    this.aimDuration = 1.4;
    this.lockedAngle = 0;
    this.isAiming = false;
    this.cooldown = 1.5;
  }

  update(dt) {
    if (!super.updateBase(dt)) return false;
    if (!player) return true;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (this.cooldown > 0) this.cooldown -= dt;

    if (!this.isAiming) {
      if (dist < 420) {
        const awayAngle = Math.atan2(this.y - player.y, this.x - player.x);
        this.vx += Math.cos(awayAngle) * this.speed * 1.5 * dt;
        this.vy += Math.sin(awayAngle) * this.speed * 1.5 * dt;
      } else if (dist > 650) {
        const towardAngle = Math.atan2(player.y - this.y, player.x - this.x);
        this.vx += Math.cos(towardAngle) * this.speed * dt;
        this.vy += Math.sin(towardAngle) * this.speed * dt;
      }

      if (this.cooldown <= 0 && dist < 750 && dungeon && dungeon.hasLineOfSight(this.x, this.y, player.x, player.y)) {
        this.isAiming = true;
        this.aimTimer = this.aimDuration;
        if (window.soundEngine && window.soundEngine.playSniperCharge) window.soundEngine.playSniperCharge();
      }
    } else {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.aimTimer -= dt;

      if (this.aimTimer > 0.35) {
        this.lockedAngle = typeof calculateLeadAngle === 'function' ? calculateLeadAngle(this.x, this.y, player.x, player.y, player.vx, player.vy, 1800, 0.85) : Math.atan2(player.y - this.y, player.x - this.x);
      }

      if (this.aimTimer <= 0) {
        this.isAiming = false;
        this.cooldown = 2.4;
        if (window.soundEngine && window.soundEngine.playSniperShot) window.soundEngine.playSniperShot();
        addScreenShake(6);

        const spd = 1800;
        enemyProjectiles.push(new EnemyProjectile(
          this.x, this.y,
          Math.cos(this.lockedAngle) * spd,
          Math.sin(this.lockedAngle) * spd,
          6,
          45,
          "#ef4444",
          1.2,
          "SNIPER_SLUG"
        ));
      }
    }

    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isAiming) {
      const isLocked = this.aimTimer <= 0.35;
      ctx.strokeStyle = isLocked ? "rgba(239, 68, 68, 0.95)" : "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = isLocked ? 2 : 1;
      if (!isLocked) ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(this.lockedAngle) * 900, Math.sin(this.lockedAngle) * 900);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const angle = this.isAiming ? this.lockedAngle : (player ? Math.atan2(player.y - this.y, player.x - this.x) : 0);
    ctx.rotate(angle);

    // Charcoal Trenchcoat over Executive Suit
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#1e293b";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-14, 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head with Targeting Visor
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Red Scope Visor
    ctx.fillStyle = this.isAiming ? "#ef4444" : "#f59e0b";
    ctx.fillRect(2, -3, 6, 6);

    // Long Sniper Rail Rifle with Tactical Scope
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(8, -2, 24, 4);
    ctx.fillStyle = "#475569";
    ctx.fillRect(14, -5, 8, 3); // Scope
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(32, -3, 2, 6); // Muzzle brake

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#f87171";
    ctx.textAlign = "center";
    ctx.fillText("HEADHUNTER", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// --- DIVERSE TACTICAL ENEMY 2: PHALANX RIOT-SHIELD ENFORCER ---
class EnemyRiotShield extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 28;
    this.hp = 380;
    this.maxHp = 380;
    this.speed = 110;
    this.threatValue = 340;
    this.label = "CORP SECURITY";
    this.facingAngle = 0;
    this.burstTimer = 0;
  }

  takeDamage(amount, source = "") {
    if (player) {
      const shotAngle = Math.atan2(player.y - this.y, player.x - this.x);
      const angleDiff = Math.abs(Math.atan2(Math.sin(shotAngle - this.facingAngle), Math.cos(shotAngle - this.facingAngle)));
      if (angleDiff < 1.2 && !source.includes("TESLA") && !source.includes("EXPLOSION") && !source.includes("RAILCANNON")) {
        amount *= 0.15;
        if (window.soundEngine && window.soundEngine.playShieldDeflect) window.soundEngine.playShieldDeflect();
        for (let i = 0; i < 4; i++) {
          particles.push(new SparkParticle(this.x + Math.cos(this.facingAngle) * 26, this.y + Math.sin(this.facingAngle) * 26, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#06b6d4"));
        }
      } else if (angleDiff > 2.0) {
        amount *= 2.0;
        addFloatingText(this.x, this.y - 25, `BACKSTAB! ${Math.round(amount)}`, "#facc15", 18);
      }
    }
    super.takeDamage(amount, source);
  }

  update(dt) {
    if (!super.updateBase(dt)) return false;
    if (!player) return true;

    this.facingAngle = Math.atan2(player.y - this.y, player.x - this.x);
    this.vx += Math.cos(this.facingAngle) * this.speed * dt;
    this.vy += Math.sin(this.facingAngle) * this.speed * dt;

    this.burstTimer += dt;
    if (this.burstTimer >= 2.5) {
      this.burstTimer = 0;
      if (!dungeon || dungeon.hasLineOfSight(this.x, this.y, player.x, player.y)) {
        const spd = 320;
        enemyProjectiles.push(new EnemyProjectile(
          this.x + Math.cos(this.facingAngle) * 32,
          this.y + Math.sin(this.facingAngle) * 32,
          Math.cos(this.facingAngle) * spd,
          Math.sin(this.facingAngle) * spd,
          "RIOT",
          false,
          32
        ));
      }
    }

    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facingAngle);

    // Kevlar Armored Corporate Security Guard Body
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-16, -14, 28, 28, 3);
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Security tie tucked into armor
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(-2, -4, 4, 10);

    // Corporate Security Riot Helmet & Dark Visor
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0284c7"; // Cyan visor slit
    ctx.fillRect(2, -3, 6, 6);

    // Heavy Ballistic Carbon Riot Shield with [CORP SEC]
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(14, -20, 8, 40, 3);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Frontal Deflector Arc
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 0, 24, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText("CORP SECURITY", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// --- DIVERSE TACTICAL ENEMY 3: PHASE-SHIFT TELEPORT STALKER ---
class EnemyStalker extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 22;
    this.hp = 220;
    this.maxHp = 220;
    this.speed = 220;
    this.threatValue = 310;
    this.label = "ESPIONAGE AGENT";
    this.isCloaked = true;
    this.strikeCooldown = 0;
  }

  update(dt) {
    if (!super.updateBase(dt)) return false;
    if (!player) return true;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (dist > 140) {
      this.isCloaked = true;
      const flankAngle = Math.atan2(player.y - this.y, player.x - this.x) + 0.6;
      this.vx += Math.cos(flankAngle) * (this.speed * 1.4) * dt;
      this.vy += Math.sin(flankAngle) * (this.speed * 1.4) * dt;
    } else {
      if (this.isCloaked) {
        this.isCloaked = false;
        if (window.soundEngine && window.soundEngine.playRadioStatic) window.soundEngine.playRadioStatic(0.12);
        for (let i = 0; i < 6; i++) {
          particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#a855f7"));
        }
      }

      this.strikeCooldown -= dt;
      if (this.strikeCooldown <= 0) {
        this.strikeCooldown = 1.6;
        if (player && dist < this.radius + player.radius + 15) {
          player.takeDamage(28, "STALKER_CLAWS");
          addScreenShake(6);
        }
      }

      const lungeAngle = Math.atan2(player.y - this.y, player.x - this.x);
      this.vx += Math.cos(lungeAngle) * this.speed * dt;
      this.vy += Math.sin(lungeAngle) * this.speed * dt;
    }

    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.isCloaked ? 0.25 : 1.0;

    const angle = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(angle);

    // Stealth Executive Infiltrator Suit
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#1e1b4b";
    ctx.beginPath();
    ctx.roundRect(-14, -12, 26, 24, 3);
    ctx.fill();
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Head with Purple Night-Vision Cyber-Goggles
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c084fc";
    ctx.fillRect(2, -3, 6, 6);

    // Twin Suppressed Datadaggers in hands
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(10, -9, 12, 3);
    ctx.fillRect(10, 6, 12, 3);

    ctx.restore();

    if (!this.isCloaked) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#c084fc";
      ctx.textAlign = "center";
      ctx.fillText("CORP INFILTRATOR", 0, -this.radius - 4);
      this.drawHealthBar(ctx);
      ctx.restore();
    }
  }
}

// --- DIVERSE TACTICAL ENEMY 4: MORTAR SIEGE-NODE ---
class EnemyMortarNode extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 32;
    this.hp = 440;
    this.maxHp = 440;
    this.speed = 65;
    this.threatValue = 420;
    this.label = "MORTAR SIEGE-NODE";
    this.mortarTimer = 2.0;
  }

  update(dt) {
    if (!super.updateBase(dt)) return false;
    if (!player) return true;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < 380) {
      const awayAngle = Math.atan2(this.y - player.y, this.x - player.x);
      this.vx += Math.cos(awayAngle) * this.speed * dt;
      this.vy += Math.sin(awayAngle) * this.speed * dt;
    }

    this.mortarTimer -= dt;
    if (this.mortarTimer <= 0) {
      this.mortarTimer = 3.6;
      this.fireMortar();
    }

    return true;
  }

  fireMortar() {
    if (!player) return;
    const leadX = player.x + player.vx * 0.45;
    const leadY = player.y + player.vy * 0.45;
    floorHazards.push(new TelegraphedMortarHazard(this.x, this.y, leadX, leadY));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Motorized Heavy Steel & Brass Filing Console
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#1e293b";
    ctx.beginPath();
    ctx.roundRect(-24, -24, 48, 48, 4);
    ctx.fill();
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Steel drawer handles
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-16, -16, 32, 4);
    ctx.fillRect(-16, -4, 32, 4);
    ctx.fillRect(-16, 8, 32, 4);

    // Pneumatic Subpoena Mortar Launch Tube in center
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tube opening
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText("SUBPOENA TUBE", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

class TelegraphedMortarHazard {
  constructor(startX, startY, targetX, targetY) {
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.duration = 1.35;
    this.time = 0;
    this.radius = 95;
  }

  update(dt) {
    this.time += dt;
    if (this.time >= this.duration) {
      this.detonate();
      return false;
    }
    return true;
  }

  detonate() {
    if (window.soundEngine && window.soundEngine.playRocketExplode) window.soundEngine.playRocketExplode();
    addScreenShake(9);

    particles.push(new ShockwaveRing(this.targetX, this.targetY, this.radius, "#ef4444"));
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 / 18) * i;
      const spd = 180 + Math.random() * 120;
      particles.push(new SparkParticle(this.targetX, this.targetY, Math.cos(a) * spd, Math.sin(a) * spd, "#ef4444"));
    }

    if (player && Math.hypot(player.x - this.targetX, player.y - this.targetY) < this.radius + player.radius) {
      player.takeDamage(42, "MORTAR SHELL");
      const a = Math.atan2(player.y - this.targetY, player.x - this.targetX);
      player.vx += Math.cos(a) * 350;
      player.vy += Math.sin(a) * 350;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.targetX, this.targetY);

    const progress = Math.max(0, Math.min(1, this.time / this.duration));

    ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.1, this.radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.1, this.radius * (1 - progress)), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- DIVERSE TACTICAL ENEMY 5: FIRMWARE DISPATCHER (HEALER DRONE) ---
class EnemyDispatcher extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 22;
    this.hp = 260;
    this.maxHp = 260;
    this.speed = 185;
    this.threatValue = 350;
    this.label = "FIRMWARE DISPATCHER";
    this.healTarget = null;
    this.spin = 0;
  }

  update(dt) {
    if (!super.updateBase(dt)) return false;
    this.spin += dt * 4;

    let bestTgt = null, lowestPct = 1.0;
    for (const e of enemies) {
      if (e !== this && e.hp > 0 && e.hp < e.maxHp) {
        const pct = e.hp / e.maxHp;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < 450 && pct < lowestPct) {
          lowestPct = pct;
          bestTgt = e;
        }
      }
    }
    this.healTarget = bestTgt;

    if (this.healTarget) {
      this.healTarget.hp = Math.min(this.healTarget.maxHp, this.healTarget.hp + 50 * dt);
      const angle = Math.atan2(this.healTarget.y - this.y, this.healTarget.x - this.x);
      this.vx += Math.cos(angle) * this.speed * dt;
      this.vy += Math.sin(angle) * this.speed * dt;
    } else if (player) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < 500) {
        const awayAngle = Math.atan2(this.y - player.y, this.x - player.x);
        this.vx += Math.cos(awayAngle) * this.speed * dt;
        this.vy += Math.sin(awayAngle) * this.speed * dt;
      }
    }

    return true;
  }

  draw(ctx) {
    if (this.healTarget && this.healTarget.hp > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(34, 197, 94, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.healTarget.x, this.healTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // 4 Quad-rotor arms with spinning blades
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -16); ctx.lineTo(16, 16);
    ctx.moveTo(16, -16); ctx.lineTo(-16, 16);
    ctx.stroke();

    // Rotors spinning
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-16, -16, 5, 0, Math.PI * 2);
    ctx.arc(16, -16, 5, 0, Math.PI * 2);
    ctx.arc(-16, 16, 5, 0, Math.PI * 2);
    ctx.arc(16, 16, 5, 0, Math.PI * 2);
    ctx.stroke();

    // Central Appraisal Monitor Chassis
    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-12, -10, 24, 20, 3);
    ctx.fill();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Green Performance Rating Screen with line chart
    ctx.fillStyle = "#052e16";
    ctx.fillRect(-9, -7, 18, 14);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.lineTo(-3, 0);
    ctx.lineTo(2, -4);
    ctx.lineTo(6, -6);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "center";
    ctx.fillText("HR REVIEW DRONE", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 15. HR Compliance Auditor (Fires PIP Warning projectiles & summons mandatory training zones)
class EnemyHRCompliance extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 28;
    this.hp = 240;
    this.maxHp = 240;
    this.speed = 140;
    this.auditTimer = 2.0;
    this.label = "HR COMPLIANCE";
  }

  update(dt) {
    this.auditTimer -= dt;
    if (this.auditTimer <= 0) {
      this.auditTimer = 2.4;
      if (player && Math.hypot(player.x - this.x, player.y - this.y) < 700) {
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = -1; i <= 1; i++) {
          const a = baseAngle + i * 0.22;
          const spd = 360;
          enemyProjectiles.push(new EnemyProjectile(
            this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "PIP"
          ));
        }
        if (window.soundEngine && window.soundEngine.playNoiseBurst) {
          window.soundEngine.playNoiseBurst(0.08, 0.18, 1800, 900);
        }
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#d97706";
    ctx.beginPath();
    ctx.roundRect(-15, -13, 30, 26, 3);
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(0, 4);
    ctx.lineTo(5, -6);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, 3, 6, 6);

    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78350f";
    ctx.fillRect(8, -12, 10, 14);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(9, -11, 8, 12);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(10, -9, 6, 2);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#f59e0b";
    ctx.textAlign = "center";
    ctx.fillText("HR COMPLIANCE", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 16. Microtransaction Drone (Fast hovering lootbox drone, fires battle pass tokens & dollar popups)
class EnemyMicrotransactionDrone extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 22;
    this.hp = 160;
    this.maxHp = 160;
    this.speed = 220;
    this.buzzAngle = Math.random() * Math.PI * 2;
    this.shootTimer = 1.2;
    this.label = "MICROTRANSACTION";
  }

  update(dt) {
    this.buzzAngle += dt * 5;
    this.shootTimer -= dt;

    if (this.shootTimer <= 0) {
      this.shootTimer = 1.6;
      if (player && Math.hypot(player.x - this.x, player.y - this.y) < 650) {
        const a = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random() - 0.5) * 0.3;
        const spd = 420;
        enemyProjectiles.push(new EnemyProjectile(
          this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "$0.99"
        ));
        if (window.soundEngine && window.soundEngine.playCoinPickup) {
          window.soundEngine.playCoinPickup();
        }
      }
    }

    if (player) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d > 180 && d < 550) {
        this.vx += Math.cos(this.buzzAngle) * 90 * dt;
        this.vy += Math.sin(this.buzzAngle) * 90 * dt;
      }
    }

    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.2;
    const rotor = Math.sin(gameTime * 30) * 8;
    ctx.beginPath();
    ctx.moveTo(-10, -18 + rotor);
    ctx.lineTo(-10, -6 - rotor);
    ctx.moveTo(-10, 6 + rotor);
    ctx.lineTo(-10, 18 - rotor);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText("BATTLE PASS DRONE", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 17. Agile Scrum Master (Buffs nearby enemies with agile velocity, throws Jira tickets)
class EnemyAgileScrumMaster extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 32;
    this.hp = 300;
    this.maxHp = 300;
    this.speed = 150;
    this.standupTimer = 3.5;
    this.ticketTimer = 1.8;
    this.label = "SCRUM MASTER";
  }

  update(dt) {
    this.standupTimer -= dt;
    this.ticketTimer -= dt;

    if (this.standupTimer <= 0) {
      this.standupTimer = 4.2;
      particles.push(new ShockwaveRing(this.x, this.y, 220, "#38bdf8"));
      addFloatingText(this.x, this.y - 35, "📢 15-MIN STANDUP! VELOCITY UP! 📢", "#38bdf8", 14);

      if (window.enemies) {
        for (const e of window.enemies) {
          if (e !== this && Math.hypot(e.x - this.x, e.y - this.y) < 260) {
            e.speed = Math.min(380, e.speed * 1.25);
            for (let i = 0; i < 4; i++) {
              particles.push(new SparkParticle(e.x, e.y, (Math.random() - 0.5) * 80, -60, "#38bdf8"));
            }
          }
        }
      }
    }

    if (this.ticketTimer <= 0) {
      this.ticketTimer = 2.0;
      if (player && Math.hypot(player.x - this.x, player.y - this.y) < 650) {
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        const spd = 340;
        enemyProjectiles.push(new EnemyProjectile(
          this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "JIRA"
        ));
      }
    }

    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#0284c7";
    ctx.beginPath();
    ctx.roundRect(-16, -14, 32, 28, 4);
    ctx.fill();
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.fillRect(-6, -8, 5, 5);
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(1, -8, 5, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(-3, 0, 5, 5);

    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(-2, 0, 8, -Math.PI / 2, Math.PI / 2, true);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(8, -16, 8, 32);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(10, -14, 4, 8);
    ctx.fillRect(10, -4, 4, 8);
    ctx.fillRect(10, 6, 4, 8);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText("AGILE SCRUM MASTER", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 18. Kubernetes Pod Node (Extremely tanky cluster pod, spawns container swarms)
class EnemyKubernetesPod extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 38;
    this.hp = 420;
    this.maxHp = 420;
    this.speed = 80;
    this.spawnTimer = 3.2;
    this.label = "K8S POD";
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 4.0;
      if (window.enemies && window.enemies.length < 35) {
        const swarmCount = 2;
        for (let i = 0; i < swarmCount; i++) {
          const a = (Math.PI * 2 / swarmCount) * i + Math.random() * 0.5;
          const px = this.x + Math.cos(a) * 45;
          const py = this.y + Math.sin(a) * 45;
          const drone = new EnemyPodSwarm(px, py);
          window.enemies.push(drone);
          particles.push(new SparkParticle(px, py, Math.cos(a) * 60, Math.sin(a) * 60, "#06b6d4"));
        }
        addFloatingText(this.x, this.y - 40, "CONTAINER REPLICA SPAWNED", "#06b6d4", 12);
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#0f172a";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const hx = Math.cos(a) * 32;
      const hy = Math.sin(a) * 32;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 / 7) * i + gameTime * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }

    ctx.fillStyle = Math.sin(gameTime * 8) > 0 ? "#22c55e" : "#14532d";
    ctx.beginPath();
    ctx.arc(-14, -14, 3, 0, Math.PI * 2);
    ctx.arc(14, -14, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#06b6d4";
    ctx.textAlign = "center";
    ctx.fillText("K8S CLUSTER POD", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// 19. Legal Cease & Desist Partner (Fires piercing injunction beams & summons legal gavels)
class EnemyLegalCeaseDesist extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 30;
    this.hp = 280;
    this.maxHp = 280;
    this.speed = 135;
    this.lawsuitTimer = 2.0;
    this.label = "CEASE & DESIST";
  }

  update(dt) {
    this.lawsuitTimer -= dt;
    if (this.lawsuitTimer <= 0) {
      this.lawsuitTimer = 2.8;
      if (player && Math.hypot(player.x - this.x, player.y - this.y) < 750) {
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        const spd = 480;
        enemyProjectiles.push(new EnemyProjectile(
          this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "INJUNCTION"
        ));
        if (window.soundEngine && window.soundEngine.playNoiseBurst) {
          window.soundEngine.playNoiseBurst(0.1, 0.22, 2800, 1400);
        }
        addFloatingText(this.x, this.y - 35, "⚖️ CEASE & DESIST! ⚖️", "#ef4444", 14);
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const facing = player ? Math.atan2(player.y - this.y, player.x - this.x) : 0;
    ctx.rotate(facing);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#09090b";
    ctx.beginPath();
    ctx.roundRect(-15, -13, 30, 26, 3);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-2, -5, 4, 12);

    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(8, 6, 12, 16);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(9, 8, 10, 3);

    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "center";
    ctx.fillText("SENIOR LITIGATION COUNSEL", 0, -this.radius - 4);
    this.drawHealthBar(ctx);
    ctx.restore();
  }
}

// --- HOSTILE PROPRIETARY AUTOMATED DEFENSE: ENEMY SENTRY TURRET ---
class EnemySentryTurret extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 28;
    this.hp = 260;
    this.maxHp = 260;
    this.speed = 0; // Fixed fortified defensive emplacement
    this.label = "DRM SENTRY TURRET";
    this.xpReward = 50;
    this.angle = 0;
    this.fireTimer = 0.5;
    this.burstCount = 0;
    this.burstMax = 4;
    this.burstInterval = 0.12;
    this.burstCooldown = 1.6;
    this.target = null;
    this.isHostileTurret = true;
  }

  update(dt) {
    if (this.isDead || this.hp <= 0) return false;

    // Handle DoTs & status
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.takeDamage(24 * dt, "FIRE");
    }
    if (this.corrodedTimer > 0) {
      this.corrodedTimer -= dt;
    }
    if (this.shockTimer > 0) {
      this.shockTimer -= dt;
      return true; // Stunned by EMP / Tesla
    }

    // Acquire closest hostile target (Tux, player sentries, or allied penguins)
    let closest = null;
    let minDist = 780;

    if (player) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = player;
      }
    }

    for (const sentry of sentryTurrets) {
      const d = Math.hypot(sentry.x - this.x, sentry.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = sentry;
      }
    }

    if (closest && dungeon && !dungeon.hasLineOfSight(this.x, this.y, closest.x, closest.y)) {
      closest = null;
    }
    this.target = closest;

    if (this.target) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      // Smooth tracking rotation
      let diff = targetAngle - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.angle += Math.sign(diff) * Math.min(Math.abs(diff), dt * 3.5);

      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        if (this.burstCount < this.burstMax) {
          this.fire();
          this.burstCount++;
          this.fireTimer = this.burstInterval;
        } else {
          this.burstCount = 0;
          this.fireTimer = this.burstCooldown;
        }
      }
    } else {
      this.angle += dt * 0.9; // Idle sweeping scan
    }

    return true;
  }

  fire() {
    if (window.soundEngine && window.soundEngine.playNoiseBurst) {
      window.soundEngine.playNoiseBurst(0.08, 0.28, 850, 240);
    }
    addScreenShake(2.0);
    const speed = 720;
    const spread = (Math.random() - 0.5) * 0.08;
    const pAngle = this.angle + spread;
    const nozzleX = this.x + Math.cos(this.angle) * 32;
    const nozzleY = this.y + Math.sin(this.angle) * 32;

    enemyProjectiles.push(new EnemyProjectile(
      nozzleX,
      nozzleY,
      Math.cos(pAngle) * speed,
      Math.sin(pAngle) * speed,
      "TURRET",
      false,
      24
    ));

    for (let i = 0; i < 3; i++) {
      particles.push(new SparkParticle(
        nozzleX,
        nozzleY,
        Math.cos(pAngle) * 60 + (Math.random() - 0.5) * 30,
        Math.sin(pAngle) * 60 + (Math.random() - 0.5) * 30,
        "#ef4444"
      ));
    }
  }

  die() {
    super.die();
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 220;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#ef4444"));
    }
    if (Math.random() < 0.6) pickups.push(new Pickup(this.x, this.y, 'hp'));
    else pickups.push(new Pickup(this.x, this.y, 'fuel'));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Red laser targeting beam when locking target
    if (this.target && this.burstCount > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.cos(this.angle) * 30, Math.sin(this.angle) * 30);
      ctx.lineTo(Math.cos(this.angle) * 650, Math.sin(this.angle) * 650);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Heavy reinforced steel octagonal base
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red warning caution hazard stripes
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DRM", 0, 3);

    // Rotating armored turret head
    ctx.rotate(this.angle);
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#f87171";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dual red laser barrels
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(8, -8, 24, 5);
    ctx.fillRect(8, 3, 24, 5);

    // Glowing red optical sensor eye
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(4, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    this.drawHealthBar(ctx);
  }
}

// --- BOSS 1: THE BLOATWARE MONOLITH (Wave 5) ---
class BossBloatware extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 65;
    this.hp = 2200;
    this.maxHp = 2200;
    this.speed = 85;
    this.isBoss = true;
    this.label = "BLOATWARE MONOLITH";
    this.phaseTimer = 0;
  }

  update(dt) {
    this.phaseTimer += dt;
    if (this.phaseTimer > 1.3) {
      this.phaseTimer = 0;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + gameTime;
        const spd = 240;
        enemyProjectiles.push(new EnemyProjectile(
          this.x,
          this.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          "RESTART NOW"
        ));
      }
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = this.burnTimer > 0 ? "#7f1d1d" : "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 10);
    ctx.fill();

    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(-this.radius, -this.radius, this.radius * 2, 24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FORCED UPDATE (1%)", 0, -this.radius + 16);

    ctx.fillStyle = "#0f172a";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("[X] Install McAfee", -this.radius + 10, -10);
    ctx.fillText("[X] Make Bing Default", -this.radius + 10, 8);
    ctx.fillText("[X] Send All Data", -this.radius + 10, 26);

    ctx.restore();
  }
}

// --- BOSS 2: VENDOR LOCK-IN OVERLORD (Wave 10) ---
class BossVendorLockin extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 80;
    this.hp = 4200;
    this.maxHp = 4200;
    this.speed = 95;
    this.isBoss = true;
    this.label = "VENDOR LOCK-IN OVERLORD";
    this.laserTimer = 0;
  }

  update(dt) {
    this.laserTimer += dt;
    if (this.laserTimer > 0.35) {
      this.laserTimer = 0;
      const angle = gameTime * 3.5;
      const spd = 300;
      enemyProjectiles.push(new EnemyProjectile(
        this.x,
        this.y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        "WALLED GARDEN"
      ));
    }
    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = this.burnTimer > 0 ? "#450a0a" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 16);
    ctx.fill();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.stroke();

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        ctx.fillStyle = (Math.sin(gameTime * 10 + r * c) > 0) ? "#22c55e" : "#ef4444";
        ctx.fillRect(c * 20 - 4, r * 20 - 4, 8, 8);
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PROPRIETARY", 0, -this.radius + 25);
    ctx.fillText("OVERLORD", 0, -this.radius + 42);

    ctx.restore();
  }
}

// --- BOSS 3: THE CLOUD MONOPOLY TITAN (Wave 15) ---
class BossCloudMonopoly extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 95;
    this.hp = 6500;
    this.maxHp = 6500;
    this.speed = 75;
    this.isBoss = true;
    this.label = "CLOUD MONOPOLY TITAN (AWS/AZURE)";
    this.attackTimer = 0;
    this.lightningStrikes = [];
  }

  update(dt) {
    this.attackTimer += dt;

    // Spiral billing statement attack
    if (this.attackTimer > 1.2) {
      this.attackTimer = 0;
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 / 12) * i + gameTime * 2;
        const spd = 260;
        enemyProjectiles.push(new EnemyProjectile(
          this.x,
          this.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          "$9,999/HR"
        ));
      }

      // Lightning strike on player position
      this.lightningStrikes.push({
        x: player.x + (Math.random() - 0.5) * 80,
        y: player.y + (Math.random() - 0.5) * 80,
        timer: 1.0
      });
    }

    // Process lightning strikes
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      const ls = this.lightningStrikes[i];
      ls.timer -= dt;
      if (ls.timer <= 0) {
        // Strike down!
        window.soundEngine.playNoiseBurst(0.2, 0.4, 2400, 200);
        addScreenShake(8);
        if (Math.hypot(player.x - ls.x, player.y - ls.y) < 65) {
          player.takeDamage(35, "BILLING LIGHTNING");
        }
        for (let s = 0; s < 12; s++) {
          particles.push(new SparkParticle(ls.x, ls.y, (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140, "#38bdf8"));
        }
        this.lightningStrikes.splice(i, 1);
      }
    }

    return this.updateBase(dt);
  }

  draw(ctx) {
    // Draw lightning telegraph circles
    for (const ls of this.lightningStrikes) {
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${1 - ls.timer})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ls.x, ls.y, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Floating Corporate Cloud Mothership
    ctx.fillStyle = this.burnTimer > 0 ? "#1e1b4b" : "#3b82f6";
    ctx.beginPath();
    ctx.arc(-35, 0, 45, 0, Math.PI * 2);
    ctx.arc(35, 0, 45, 0, Math.PI * 2);
    ctx.arc(0, -30, 55, 0, Math.PI * 2);
    ctx.arc(0, 15, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Golden Dollar Insignia
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("$$$", 0, 10);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.fillText("CLOUD TITAN", 0, -50);

    ctx.restore();
  }
}

// --- BOSS 4: THE CLOSED-SOURCE OVERMIND / GPT-OMEGA (Wave 20 Final Boss) ---
class BossOmegaAI extends EnemyBase {
  constructor(x, y) {
    super(x, y);
    this.radius = 115;
    this.hp = 12000;
    this.maxHp = 12000;
    this.speed = 65;
    this.isBoss = true;
    this.label = "CLOSED-SOURCE OVERMIND (GPT-OMEGA)";
    this.phaseTimer = 0;
    this.singularityTimer = 0;
  }

  update(dt) {
    this.phaseTimer += dt;
    this.singularityTimer += dt;

    // Singularity gravitational pull toward core
    const dPlayer = Math.hypot(this.x - player.x, this.y - player.y);
    if (dPlayer < 750 && dPlayer > 60) {
      player.x += ((this.x - player.x) / dPlayer) * 75 * dt;
      player.y += ((this.y - player.y) / dPlayer) * 75 * dt;
    }

    // Binary matrix sweep lasers
    if (this.phaseTimer > 0.45) {
      this.phaseTimer = 0;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i + gameTime * 3;
        const spd = 280;
        enemyProjectiles.push(new EnemyProjectile(
          this.x,
          this.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          "0101"
        ));
      }
    }

    // Spawn hallucination phantoms
    if (this.singularityTimer > 4.5) {
      this.singularityTimer = 0;
      enemies.push(new EnemyAISlop(this.x + (Math.random() - 0.5) * 120, this.y + (Math.random() - 0.5) * 120));
      enemies.push(new EnemyBSOD(this.x + (Math.random() - 0.5) * 120, this.y + (Math.random() - 0.5) * 120));
      addFloatingText(this.x, this.y - 100, "HALLUCINATING PHANTOMS!", "#d946ef", 24);
    }

    return this.updateBase(dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Gravitational Event Horizon Singularity
    const pulse = Math.sin(gameTime * 6) * 10;
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Rainbow AI Tensor Rings
    ctx.strokeStyle = `hsl(${(gameTime * 80) % 360}, 90%, 60%)`;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = `hsl(${((gameTime * 80) + 180) % 360}, 90%, 60%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Central Digital Eye
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GPT-OMEGA", 0, -28);
    ctx.fillText("SINGULARITY", 0, 42);

    ctx.restore();
  }
}

// --- ROGUELIKE DUNGEON, ROOMS & OBJECTIVES SYSTEM (SOUL KNIGHT STYLE) ---
class GroundWeapon {
  constructor(x, y, weaponItem) {
    this.x = x;
    this.y = y;
    this.weapon = weaponItem; // From WEAPON_CATALOG
    this.bobTimer = Math.random() * Math.PI * 2;
    this.radius = 24;
  }

  update(dt) {
    this.bobTimer += dt * 3.5;
    return true;
  }

  draw(ctx) {
    const bob = Math.sin(this.bobTimer) * 5;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing Pedestal Aura
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.weapon.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Floating 2D Gun Icon
    ctx.save();
    ctx.translate(0, bob - 4);
    ctx.fillStyle = this.weapon.color;
    ctx.fillRect(-14, -6, 28, 12);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-10, -3, 20, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(8, -2, 6, 4);
    ctx.restore();

    // Name Tag
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`[${this.weapon.shortName}]`, 0, bob - 18);
    ctx.font = "9px monospace";
    ctx.fillStyle = this.weapon.color;
    ctx.fillText(this.weapon.ammoText, 0, bob - 6);

    ctx.restore();
  }
}

class WeaponChest {
  constructor(x, y, presetWeapon = null) {
    this.x = x;
    this.y = y;
    this.opened = false;
    this.radius = 30;
    this.presetWeapon = presetWeapon;
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    window.soundEngine.playChestOpen();
    addScreenShake(8);
    for (let i = 0; i < 18; i++) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, "#fbbf24"));
    }
    // Drop preset weapon or random weapon not currently held
    let chosen = this.presetWeapon;
    if (!chosen) {
      const held0Id = (player && player.heldWeapons && player.heldWeapons[0]) ? player.heldWeapons[0].id : -1;
      const held1Id = (player && player.heldWeapons && player.heldWeapons[1]) ? player.heldWeapons[1].id : -1;
      const available = WEAPON_CATALOG.filter(w => w.id !== held0Id && w.id !== held1Id);
      chosen = available[Math.floor(Math.random() * available.length)] || WEAPON_CATALOG[2];
    }
    groundWeapons.push(new GroundWeapon(this.x, this.y + 22, chosen));

    pickups.push(new Pickup(this.x - 25, this.y, 'xp'));
    pickups.push(new Pickup(this.x + 25, this.y, 'xp'));
    pickups.push(new Pickup(this.x, this.y - 25, Math.random() < 0.5 ? 'hp' : 'fuel'));
    addFloatingText(this.x, this.y - 45, `CACHE: ${chosen.name}!`, "#fbbf24", 20);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (!this.opened) {
      ctx.fillStyle = "rgba(251, 191, 36, 0.2)";
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#78350f";
      ctx.fillRect(-22, -16, 44, 32);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.strokeRect(-22, -16, 44, 32);

      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-6, -4, 12, 10);

      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.fillText("[E] OPEN CACHE", 0, -24);
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(-22, -10, 44, 26);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -10, 44, 26);
    }
    ctx.restore();
  }
}

class TelemetryRelay {
  constructor(x, y, hp = 350) {
    this.x = x;
    this.y = y;
    this.radius = 38;
    this.hp = hp;
    this.maxHp = hp;
    this.dishAngle = 0;
    this.pulseTimer = 0;
    this.spawnTimer = 0;
  }

  takeDamage(amount, source) {
    this.hp -= amount;
    addFloatingText(this.x + (Math.random() - 0.5) * 25, this.y - 20, `-${Math.round(amount)}`, "#ef4444", 16);
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    window.soundEngine.playProprietaryDestroyed('boss');
    addScreenShake(18);
    for (let i = 0; i < 40; i++) {
      particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 320, (Math.random() - 0.5) * 320, Math.random() < 0.5 ? "#ef4444" : "#f59e0b"));
    }
    for (let i = 0; i < 4; i++) {
      pickups.push(new Pickup(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40, 'xp'));
    }
    pickups.push(new Pickup(this.x, this.y, 'hp'));
    dungeon.onObjectiveProgress('DESTROY_RELAYS');
    const idx = objectiveTargets.indexOf(this);
    if (idx !== -1) objectiveTargets.splice(idx, 1);
  }

  update(dt) {
    this.dishAngle += dt * 2.5;
    this.pulseTimer += dt;
    this.spawnTimer += dt;
    if (this.spawnTimer > 7.0 && enemies.length < 35) {
      this.spawnTimer = 0;
      enemies.push(new EnemyTelemetry(this.x + Math.cos(this.dishAngle) * 55, this.y + Math.sin(this.dishAngle) * 55));
    }
    return this.hp > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.stroke();

    const pRadius = this.radius + ((this.pulseTimer * 30) % 40);
    ctx.strokeStyle = `rgba(239, 68, 68, ${1 - (pRadius - this.radius) / 40})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(this.dishAngle);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-6, -20, 12, 40);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const barW = 60;
    const barH = 6;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-barW / 2, -this.radius - 16, barW, barH);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-barW / 2, -this.radius - 16, barW * Math.max(0, this.hp / this.maxHp), barH);

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#f87171";
    ctx.textAlign = "center";
    ctx.fillText("ROGUE RELAY", 0, -this.radius - 22);
    ctx.restore();
  }
}

class RootTerminal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 35;
    this.hackRadius = 130;
    this.progress = 0;
    this.maxProgress = 12.0;
    this.isHacking = false;
    this.completed = false;
  }

  update(dt) {
    if (this.completed) return true;
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (distToPlayer <= this.hackRadius) {
      this.isHacking = true;
      this.progress += dt;
      if (Math.random() < 0.25) {
        particles.push(new SparkParticle(
          this.x + (Math.random() - 0.5) * 80,
          this.y + (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 60,
          -60,
          "#38bdf8"
        ));
      }
      if (this.progress >= this.maxProgress) {
        this.complete();
      }
    } else {
      this.isHacking = false;
    }
    return true;
  }

  complete() {
    this.completed = true;
    window.soundEngine.playObjectiveComplete();
    addScreenShake(15);
    particles.push(new ShockwaveRing(this.x, this.y, 250));
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 260) {
        enemy.takeDamage(200, "ROOT COMPILATION NOVA");
      }
    }
    addFloatingText(this.x, this.y - 50, "ROOT COMPILATION COMPLETE!", "#22c55e", 26);
    dungeon.onObjectiveProgress('HACK_TERMINAL');
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.completed ? "rgba(34, 197, 94, 0.12)" : (this.isHacking ? "rgba(56, 189, 248, 0.22)" : "rgba(56, 189, 248, 0.08)");
    ctx.beginPath();
    ctx.arc(0, 0, this.hackRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.completed ? "#22c55e" : (this.isHacking ? "#38bdf8" : "rgba(56, 189, 248, 0.4)");
    ctx.lineWidth = this.isHacking ? 3 : 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, this.hackRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-24, -20, 48, 40);
    ctx.strokeStyle = this.completed ? "#22c55e" : "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(-24, -20, 48, 40);

    ctx.fillStyle = this.completed ? "#22c55e" : (this.isHacking ? "#38bdf8" : "#1e293b");
    ctx.fillRect(-16, -14, 32, 18);

    if (!this.completed) {
      const pct = Math.floor((this.progress / this.maxProgress) * 100);
      const barW = 70;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-barW / 2, -34, barW, 8);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-barW / 2, -34, barW * (this.progress / this.maxProgress), 8);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = this.isHacking ? "#38bdf8" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(this.isHacking ? `DECRYPTING ROOT: ${pct}%` : "STAND IN ZONE TO HACK", 0, -42);
    } else {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "center";
      ctx.fillText("ROOT REPO PATCHED", 0, -32);
    }
    ctx.restore();
  }
}

class ExitWarpGateway {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 48;
    this.spinAngle = 0;
  }

  update(dt) {
    this.spinAngle += dt * 3.5;
    if (dungeon && dungeon.isSectorCompleted() && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius * 0.5) {
      dungeon.warpToNextSector();
    }
  }

  draw(ctx) {
    const isReady = dungeon && dungeon.isSectorCompleted();
    ctx.save();
    ctx.translate(this.x, this.y);

    if (isReady) {
      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius + 15);
      grad.addColorStop(0, "#22c55e");
      grad.addColorStop(0.5, "#06b6d4");
      grad.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 4; i++) {
        const a = this.spinAngle + (Math.PI / 2) * i;
        ctx.strokeStyle = "#a7f3d0";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, a, a + 0.8);
        ctx.stroke();
      }

      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "center";
      ctx.fillText("WARP GATEWAY ACTIVE", 0, -this.radius - 18);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("STEP IN / [E] TO ADVANCE", 0, -this.radius - 6);
    } else {
      ctx.fillStyle = "rgba(30, 41, 59, 0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText("GATEWAY DORMANT", 0, -this.radius - 14);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#ef4444";
      ctx.fillText("COMPLETE OBJECTIVES FIRST", 0, -this.radius - 2);
    }
    ctx.restore();
  }
}

// ============================================================================
// --- BIOME SPECIFICATIONS & TACTICAL PARAMETERS ---
// ============================================================================
const BIOMES = {
  EMERALD_FRONTIER: {
    id: "EMERALD_FRONTIER",
    name: "EMERALD REPO FRONTIER",
    dangerLevel: 1,
    floorColor: "#0a1910",
    floorBorder: "rgba(18, 48, 28, 0.4)",
    wallColor: "#0f2317",
    wallCap: "#1e4730",
    liquidColor: "#061f15",
    liquidGlow: "rgba(16, 185, 129, 0.25)",
    foliageColor: "#1b4d2e",
    pillarColor: "#142b1e",
    frictionMult: 1.0,
    accent: "#22c55e",
    hazardDesc: "Patrol squads & rogue telemetry antennas",
    bossId: "ballmer_bot"
  },
  THERMAL_FOUNDRY: {
    id: "THERMAL_FOUNDRY",
    name: "OVERCLOCK SILICON SMELTER",
    dangerLevel: 2,
    floorColor: "#140905",
    floorBorder: "rgba(67, 20, 7, 0.45)",
    wallColor: "#2a1005",
    wallCap: "#7c2d12",
    liquidColor: "#450a0a",
    liquidGlow: "rgba(234, 88, 12, 0.35)",
    foliageColor: "#ea580c",
    pillarColor: "#431407",
    frictionMult: 1.0,
    accent: "#ea580c",
    hazardDesc: "Superheated steam vents & scorched magma fissures",
    bossId: "smelter_titan"
  },
  CRYO_GLACIER: {
    id: "CRYO_GLACIER",
    name: "SUB-ZERO COLD-ARCHIVE GLACIER",
    dangerLevel: 3,
    floorColor: "#051320",
    floorBorder: "rgba(8, 51, 68, 0.5)",
    wallColor: "#082f49",
    wallCap: "#0369a1",
    liquidColor: "#031d2e",
    liquidGlow: "rgba(6, 182, 212, 0.35)",
    foliageColor: "#0ea5e9",
    pillarColor: "#075985",
    frictionMult: 0.32, // Slick ice momentum & drifting physics!
    accent: "#06b6d4",
    hazardDesc: "Slick low-friction ice & sub-zero freezing pools",
    bossId: "cryo_daemon"
  },
  TOXIC_HEAP: {
    id: "TOXIC_HEAP",
    name: "MEMORY-LEAK HEAP WASTELANDS",
    dangerLevel: 3,
    floorColor: "#091408",
    floorBorder: "rgba(20, 83, 45, 0.4)",
    wallColor: "#14532d",
    wallCap: "#166534",
    liquidColor: "#052e16",
    liquidGlow: "rgba(34, 197, 94, 0.4)",
    foliageColor: "#22c55e",
    pillarColor: "#14532d",
    frictionMult: 1.0,
    accent: "#4ade80",
    hazardDesc: "Corrosive acid pools (-50% armor) & ambush stalkers",
    bossId: "garbage_collector"
  },
  WALLED_GARDEN: {
    id: "WALLED_GARDEN",
    name: "EXECUTIVE WALLED GARDEN",
    dangerLevel: 4,
    floorColor: "#0f172a",
    floorBorder: "rgba(51, 65, 85, 0.5)",
    wallColor: "#1e293b",
    wallCap: "#ca8a04",
    liquidColor: "#090d16",
    liquidGlow: "rgba(234, 179, 8, 0.3)",
    foliageColor: "#eab308",
    pillarColor: "#334155",
    frictionMult: 1.0,
    accent: "#facc15",
    hazardDesc: "Security laser tripwires & automated fortress turrets",
    bossId: "executive_chairman"
  },
  VOID_BUNKER: {
    id: "VOID_BUNKER",
    name: "VOID-0 FORTIFIED MONOLITH BUNKER",
    dangerLevel: 5,
    floorColor: "#05060b",
    floorBorder: "rgba(30, 41, 59, 0.6)",
    wallColor: "#090d16",
    wallCap: "#38bdf8",
    liquidColor: "#030712",
    liquidGlow: "rgba(56, 189, 248, 0.35)",
    foliageColor: "#ef4444",
    pillarColor: "#1e293b",
    frictionMult: 1.0,
    accent: "#ef4444",
    hazardDesc: "Fortified laser grid, automated sentry bastions, and audit archons",
    bossId: "oracle_audit_archon"
  },
  QUANTUM_VOID: {
    id: "QUANTUM_VOID",
    name: "RING-0 KERNEL SINGULARITY VOID",
    dangerLevel: 5,
    floorColor: "#0c071a",
    floorBorder: "rgba(76, 29, 149, 0.45)",
    wallColor: "#2e1065",
    wallCap: "#7c3aed",
    liquidColor: "#1e0b36",
    liquidGlow: "rgba(168, 85, 247, 0.4)",
    foliageColor: "#c084fc",
    pillarColor: "#3b0764",
    frictionMult: 1.0,
    accent: "#c084fc",
    hazardDesc: "Gravitational event horizons & decoherence anomalies",
    bossId: "quantum_hypervisor"
  },
  TREASURE_VAULT: {
    id: "TREASURE_VAULT",
    name: "CONFIDENTIAL CARTEL DATA VAULT",
    dangerLevel: 1,
    floorColor: "#0e1117",
    floorBorder: "rgba(202, 138, 4, 0.4)",
    wallColor: "#1f2937",
    wallCap: "#ca8a04",
    liquidColor: "#0b0f14",
    liquidGlow: "rgba(250, 204, 21, 0.3)",
    foliageColor: "#fbbf24",
    pillarColor: "#374151",
    frictionMult: 1.0,
    accent: "#facc15",
    hazardDesc: "Guarded secret cache with prototype weapons & power armor",
    bossId: null
  }
};

// ============================================================================
// --- PROCEDURAL PORTALS & INTER-BIOME EXPEDITIONS ---
// ============================================================================
class ProceduralPortal {
  constructor(x, y, biomeKey, objectiveType, dangerRating) {
    this.x = x;
    this.y = y;
    this.radius = 48;
    this.biomeKey = biomeKey;
    this.biome = BIOMES[biomeKey] || BIOMES.EMERALD_FRONTIER;
    this.objectiveType = objectiveType || "DEFEND_SERVERS";
    this.dangerRating = dangerRating || this.biome.dangerLevel;
    this.spinAngle = 0;
    this.pulse = 0;
    this.entered = false;
    this.armTimer = 0.4; // Responsive stabilization timer

    switch (this.objectiveType) {
      case "DEFEND_SERVERS":
        this.objectiveTitle = "DEFEND SERVER CLUSTER";
        this.objectiveDesc = "Protect open-source server node cluster from 3 assault waves";
        break;
      case "ATTACK_FORTRESS":
        this.objectiveTitle = "ATTACK THE FORTRESS";
        this.objectiveDesc = "Breach fortress citadel, destroy shield pylons & demolish core";
        break;
      case "SETUP_UPLINK":
        this.objectiveTitle = "SETUP MESH UPLINK";
        this.objectiveDesc = "Calibrate 3 encrypted packet beacons while holding positions";
        break;
      case "ELITE_BOUNTY":
        this.objectiveTitle = "ELITE CHAMPION BOUNTY";
        this.objectiveDesc = "Hunt down and purge armored proprietary enforcers";
        break;
      case "TREASURE_REWARD":
        this.objectiveTitle = "CONFIDENTIAL DATA VAULT";
        this.objectiveDesc = "Secure classified weapon caches & prototype exosuits";
        break;
      default:
        this.objectiveTitle = "OVERCLOCK SABOTAGE";
        this.objectiveDesc = "Sabotage reactor manifolds and overthrow sector apex boss";
    }
  }

  update(dt) {
    if (this.entered) return;
    this.spinAngle += dt * 3.8;
    this.pulse += dt * 3.0;

    // Portal stabilization / arming countdown
    if (this.armTimer > 0) {
      this.armTimer -= dt;
      if (Math.random() < 0.25 && typeof particles !== 'undefined' && typeof SparkParticle !== 'undefined') {
        const a = Math.random() * Math.PI * 2;
        const r = this.radius * 0.5;
        particles.push(new SparkParticle(
          this.x + Math.cos(a) * r,
          this.y + Math.sin(a) * r,
          Math.cos(a) * 20,
          Math.sin(a) * 20,
          "#ffffff"
        ));
      }
      return;
    }

    if (Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2;
      const r = this.radius * (0.6 + Math.random() * 0.4);
      particles.push(new SparkParticle(
        this.x + Math.cos(a) * r,
        this.y + Math.sin(a) * r,
        -Math.cos(a) * 35,
        -Math.sin(a) * 35,
        (this.biome && this.biome.accent) ? this.biome.accent : "#38bdf8"
      ));
    }

    // Step-in trigger check (generous collision radius: portal radius + player radius)
    if (!this.entered && this.armTimer <= 0 && player && Math.hypot(player.x - this.x, player.y - this.y) < (this.radius + (player.radius || 20)) * 0.95) {
      this.enter();
    }
  }

  enter() {
    if (this.entered) return;
    if (dungeon && dungeon._actTransitionInProgress) return;
    this.entered = true;

    const doWarp = () => {
      if (window.soundEngine && window.soundEngine.playPortalWarp) window.soundEngine.playPortalWarp();
      if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
        const bName = (this.biome && this.biome.name) ? this.biome.name : "UNKNOWN SECTOR";
        window.soundEngine.speakRobot(`WARPING TO ${bName}. OBJECTIVE DIRECTIVE: ${this.objectiveTitle || "ENGAGE"}.`, "SUPER DESTROYER");
      }
      addScreenShake(18);
      screenFlash = 1.0;

      if (dungeon) {
        // Defer warp to microtask so current update/projectile loop terminates cleanly without array index corruption
        setTimeout(() => {
          if (dungeon) {
            dungeon.isWarping = false; // Ensure warp proceeds without being self-blocked
            if (this.actTargetIndex !== undefined) {
              dungeon.startCampaignAct(this.actTargetIndex);
            } else {
              dungeon.warpToBiome(this.biomeKey, this.objectiveType, this.dangerRating, true);
            }
          }
        }, 32);
      }
    };

    if (this.biomeKey === "QUANTUM_VOID" && window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function') {
      window.PixelCutscenes.play("ring0_entry", doWarp);
    } else {
      doWarp();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const wave = Math.sin(this.pulse) * 0.08 + 0.92;

    // Glowing dimensional vortex
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius + 18);
    grad.addColorStop(0, this.biome.accent);
    grad.addColorStop(0.5, "rgba(15, 23, 42, 0.85)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting particle rings
    for (let i = 0; i < 4; i++) {
      const a = this.spinAngle + (Math.PI / 2) * i;
      ctx.strokeStyle = this.biome.accent;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * wave, a, a + 0.9);
      ctx.stroke();
    }

    // Inner portal eye
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Holographic Telemetry Placard above portal
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(-110, -this.radius - 42, 220, 36);
    ctx.strokeStyle = this.biome.accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-110, -this.radius - 42, 220, 36);

    ctx.font = "bold 13px 'Pixelify Sans', monospace";
    ctx.fillStyle = this.biome.accent;
    ctx.textAlign = "center";
    ctx.fillText(`${this.biome.name}`, 0, -this.radius - 26);

    ctx.font = "bold 11.5px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#facc15";
    ctx.fillText(`★ TIER ${this.dangerRating} • ${this.objectiveTitle}`, 0, -this.radius - 12);

    ctx.font = "bold 12px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("[STEP IN / PRESS E TO WARP]", 0, this.radius + 18);

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.ProceduralPortal = ProceduralPortal;
  window.BIOMES = BIOMES;
  window.proceduralPortals = proceduralPortals;
}

// ============================================================================
// --- TACTICAL IN-WORLD OBJECTIVE STRUCTURES & TERMINAL SYSTEM ---
// ============================================================================

const ARROW_KEY_SYMBOLS = {
  'ArrowUp': '▲',
  'ArrowDown': '▼',
  'ArrowLeft': '◀',
  'ArrowRight': '▶'
};

function calculateLeadAngle(fromX, fromY, targetX, targetY, targetVx = 0, targetVy = 0, projectileSpeed = 400, leadFactor = 0.75) {
  const dist = Math.hypot(targetX - fromX, targetY - fromY);
  const timeToTarget = dist / Math.max(1, projectileSpeed);
  const predX = targetX + targetVx * timeToTarget * leadFactor;
  const predY = targetY + targetVy * timeToTarget * leadFactor;
  return Math.atan2(predY - fromY, predX - fromX);
}

function getNearbyObjectiveTerminal() {
  if (typeof player === 'undefined' || !player || typeof objectiveTargets === 'undefined' || !objectiveTargets) return null;
  for (const target of objectiveTargets) {
    if (target && target.arrowSequence && !target.arrowCompleted && !target.destroyed) {
      const d = Math.hypot(player.x - target.x, player.y - target.y);
      if (d <= (target.terminalRange || 140)) {
        return target;
      }
    }
  }
  return null;
}

function drawObjectiveArrowTerminal(ctx, target, label = "TASK TERMINAL") {
  if (!target || !target.arrowSequence || target.arrowCompleted || target.destroyed) return;
  const dist = (typeof player !== 'undefined' && player) ? Math.hypot(player.x - target.x, player.y - target.y) : 9999;
  if (dist > (target.terminalRange || 140) + 120) return;

  const isNear = dist <= (target.terminalRange || 140);
  ctx.save();
  ctx.translate(target.x, target.y - (target.radius || 35) - 36);

  const seq = target.arrowSequence;
  const prog = target.arrowProgress || 0;
  const boxW = Math.max(160, seq.length * 28 + 24);
  const boxH = 46;

  // Background terminal frame
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.fillRect(-boxW / 2, -boxH, boxW, boxH);
  ctx.strokeStyle = isNear ? "#facc15" : "#475569";
  ctx.lineWidth = isNear ? 2.5 : 1.5;
  ctx.strokeRect(-boxW / 2, -boxH, boxW, boxH);

  // Terminal Status Header
  ctx.fillStyle = isNear ? "#facc15" : "#94a3b8";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  const headerTxt = isNear ? `⚡ [ARROW CODE: ${label}] ⚡` : `[STEP CLOSER: ${label}]`;
  ctx.fillText(headerTxt, 0, -boxH + 13);

  // Arrow Glyphs Row
  const startX = -((seq.length - 1) * 26) / 2;
  for (let i = 0; i < seq.length; i++) {
    const ax = startX + i * 26;
    const ay = -12;
    const glyph = ARROW_KEY_SYMBOLS[seq[i]] || "▲";

    if (i < prog) {
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 20px monospace";
      ctx.fillText(glyph, ax, ay);
    } else if (i === prog && isNear) {
      const pulse = Math.sin(Date.now() * 0.012) * 0.25 + 0.75;
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
      ctx.font = "bold 22px monospace";
      ctx.fillText(glyph, ax, ay);
    } else {
      ctx.fillStyle = "#475569";
      ctx.font = "bold 18px monospace";
      ctx.fillText(glyph, ax, ay);
    }
  }

  ctx.restore();
}

// 1. DEFEND SERVERS OBJECTIVE: SERVER CLUSTER NODE
class ServerClusterNode {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 48;
    this.isFriendlyDefenseTarget = true; // Friendly defense targets NEVER take player or sentry bullet damage!
    this.defenseRingRadius = 240; // Tactical perimeter ring radius
    this.hp = 6500;
    this.maxHp = 6500;
    this.shield = 1800;
    this.maxShield = 1800;
    this.shieldRegenTimer = 0;
    this.progress = 0;
    this.maxProgress = 22.0; // 22s survival defense
    this.waveSpawned = [false, false, false];
    this.activated = false;
    this.inRing = false;
    this.completed = false;
    this.destroyed = false;
    this.warnCooldown = 0;
    this.ringSpinAngle = 0;

    // Helldivers-style Arrow Sequence Terminal
    this.arrowSequence = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];
    this.arrowProgress = 0;
    this.arrowCompleted = false;
    this.terminalRange = 140;
  }

  onArrowInput(code) {
    if (this.arrowCompleted || this.completed || this.destroyed) return false;
    if (code === this.arrowSequence[this.arrowProgress]) {
      this.arrowProgress++;
      if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(true);
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y - 20, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#22c55e"));
      }
      if (this.arrowProgress >= this.arrowSequence.length) {
        this.onArrowSequenceSuccess();
      }
      return true;
    } else {
      this.arrowProgress = 0;
      if (window.soundEngine && window.soundEngine.playCorporateErrorBeep) window.soundEngine.playCorporateErrorBeep();
      addFloatingText(this.x, this.y - 50, "CODE MISMATCH - RESET!", "#ef4444", 18);
      return false;
    }
  }

  onArrowSequenceSuccess() {
    this.arrowCompleted = true;
    this.activated = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(14);
    addFloatingText(this.x, this.y - 60, "⭐ TERMINAL OVERRIDE ACCEPTED! HOLD THE RING! ⭐", "#38bdf8", 22);
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("SERVER CLUSTER OVERRIDDEN! HOLD THE PERIMETER RING, TUX! DEMOCRACY WILL PREVAIL!", "HIGH COMMAND");
    }
    this.spawnAssaultWave(3);
  }

  takeDamage(amount, source = "") {
    if (this.completed || this.destroyed) return;
    const s = (source || "").toUpperCase();
    // Complete immunity to friendly fire (player bullets, sentry turrets, RPGs, flamethrower)
    if (s === "SENTRY" || s === "BULLET" || s.includes("RPG") || s.includes("PLAYER") || s.includes("FRIENDLY") || s.includes("ALLIED") || s.includes("FLAME") || s.includes("TESLA") || s.includes("RAILCANNON")) {
      return;
    }

    this.shieldRegenTimer = 0;
    let dmg = amount;
    if (this.shield > 0) {
      if (dmg <= this.shield) {
        this.shield -= dmg;
        addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 32, `-${Math.round(dmg)} SHIELD`, "#38bdf8", 16);
        dmg = 0;
      } else {
        dmg -= this.shield;
        this.shield = 0;
        addFloatingText(this.x, this.y - 32, "SERVER SHIELD DOWN!", "#38bdf8", 18);
      }
    }

    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 20, `-${Math.round(dmg)}`, "#ef4444", 16);

      const now = performance.now();
      if (!this.lastServerUnderAttackVoTime || now - this.lastServerUnderAttackVoTime > 9000) {
        this.lastServerUnderAttackVoTime = now;
        if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
          window.soundEngine.playVoiceClip("john_server_under_attack", "WARNING! DEFENSE SERVER IS UNDER HEAVY HOSTILE ATTACK! REPEL THEM, TUX!", "JOHN HELLDIVER");
        }
        addScreenShake(7);
      }

      if (this.hp <= 0) {
        this.destroyed = true;
        if (window.soundEngine && window.soundEngine.playRocketExplode) window.soundEngine.playRocketExplode();
        addScreenShake(16);
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("CRITICAL FAILURE: SERVER CLUSTER DESTROYED. ROOT BACKUP COMPROMISED.", "ALERT AI");
        }
      }
    }
  }

  update(dt) {
    if (this.destroyed || this.completed) return true;
    if (!player) return true;

    this.ringSpinAngle += dt * 2.5;
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    this.inRing = distToPlayer <= this.defenseRingRadius;

    // Shield auto-regeneration when out of hostile fire
    this.shieldRegenTimer += dt;
    if (this.shieldRegenTimer >= 3.5 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 160 * dt);
    }

    // Mission only activates after entering ring AND completing terminal arrow code!
    if (!this.activated) {
      if (!this.arrowCompleted) {
        if (this.inRing) {
          this.warnCooldown -= dt;
          if (this.warnCooldown <= 0) {
            this.warnCooldown = 3.0;
            addFloatingText(this.x, this.y - 50, "⌨️ INPUT TERMINAL CODE WITH ARROW KEYS [▲ ▼ ◀ ▶]!", "#facc15", 16);
          }
        }
        return true;
      }
      return true;
    }

    // When activated: Tux must stay inside the defense ring to progress!
    if (this.inRing) {
      this.progress += dt;
      const pct = this.progress / this.maxProgress;

      // Wave assault drops at 33%, 66%, 90%
      if (pct >= 0.33 && !this.waveSpawned[0]) {
        this.waveSpawned[0] = true;
        this.spawnAssaultWave(3);
      } else if (pct >= 0.66 && !this.waveSpawned[1]) {
        this.waveSpawned[1] = true;
        this.spawnAssaultWave(4);
      } else if (pct >= 0.90 && !this.waveSpawned[2]) {
        this.waveSpawned[2] = true;
        this.spawnAssaultWave(5);
      }

      if (this.progress >= this.maxProgress) {
        this.complete();
      }
    } else {
      // Tux stepped outside the perimeter!
      this.warnCooldown -= dt;
      if (this.warnCooldown <= 0) {
        this.warnCooldown = 2.5;
        addFloatingText(player.x, player.y - 45, "⚠️ OUTSIDE DEFENSE RING! STEP BACK IN! ⚠️", "#ef4444", 18);
        if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(false);
      }
    }

    return true;
  }

  spawnAssaultWave(count) {
    if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
    addScreenShake(8);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const dist = 360 + Math.random() * 80;
      dropPods.push(new HostileDropPod(this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, true));
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("WARNING: PROPRIETARY REINFORCEMENTS TARGETING DEFENSE PERIMETER!", "HIGH COMMAND");
    }
  }

  complete() {
    this.completed = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(18);
    particles.push(new ShockwaveRing(this.x, this.y, 340, "#22c55e"));

    // Rewards: 2 weapon caches and health
    weaponChests.push(new WeaponChest(this.x - 55, this.y + 45));
    weaponChests.push(new WeaponChest(this.x + 55, this.y + 45));
    pickups.push(new Pickup(this.x, this.y + 60, 'hp'));
    pickups.push(new Pickup(this.x + 25, this.y + 60, 'fuel'));

    if (dungeon) {
      dungeon.onObjectiveProgress("DEFEND_SERVERS", 1);
    }
    if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function') {
      window.PixelCutscenes.play('server_sabotage');
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("SERVER CLUSTER ENCRYPTED AND SECURED. ALL THREATS PURGED UNDER GPLv3!", "HIGH COMMAND");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const r = this.defenseRingRadius;
    const pct = Math.min(1.0, this.progress / this.maxProgress);

    // 1. Interactive Tactical Defense Perimeter Ring
    if (!this.activated) {
      // Inactive: Pulsing welcoming cyan ring
      const pulse = Math.sin(gameTime * 4) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner brackets
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + this.ringSpinAngle * 0.2;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, a - 0.15, a + 0.15);
        ctx.stroke();
      }

      // Standby prompt text
      ctx.font = "bold 12px 'Pixelify Sans', monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000";
      const standbyMsg = !this.arrowCompleted ? "▸ [STEP TO TERMINAL & ENTER ARROW CODE] ◂" : "▸ [HOLD DEFENSE RING] ◂";
      ctx.strokeText(standbyMsg, 0, -r - 12);
      ctx.fillText(standbyMsg, 0, -r - 12);
    } else if (this.completed) {
      // Completed: Solid green secured ring
      ctx.strokeStyle = "rgba(34, 197, 94, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Active Defense: Ring color depends on whether Tux is inside or outside!
      if (this.inRing) {
        // Holding ring: Green/cyan progress arc
        ctx.strokeStyle = "rgba(34, 197, 94, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();

        // Prompt
        ctx.font = "bold 13px 'Pixelify Sans', monospace";
        ctx.fillStyle = "#4ade80";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.strokeText(`🛡️ HOLDING PERIMETER // DEFENSE: ${Math.round(pct * 100)}%`, 0, -r - 12);
        ctx.fillText(`🛡️ HOLDING PERIMETER // DEFENSE: ${Math.round(pct * 100)}%`, 0, -r - 12);
      } else {
        // Outside ring: Flashing urgent red/amber warning!
        const flash = Math.sin(gameTime * 12) > 0;
        ctx.strokeStyle = flash ? "#ef4444" : "#f59e0b";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = "bold 13px 'Pixelify Sans', monospace";
        ctx.fillStyle = "#ef4444";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.strokeText("⚠️ RETURN TO DEFENSE RING TO RESUME! ⚠️", 0, -r - 12);
        ctx.fillText("⚠️ RETURN TO DEFENSE RING TO RESUME! ⚠️", 0, -r - 12);
      }
    }

    // 2. Multi-rack server cluster monolith
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-36, -30, 72, 60);
    ctx.strokeStyle = this.completed ? "#22c55e" : (this.activated ? "#38bdf8" : "#64748b");
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-36, -30, 72, 60);

    // Blinking LED panels
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const on = (Math.sin(gameTime * 12 + row * 3 + col * 2) > 0);
        ctx.fillStyle = on ? (this.completed ? "#22c55e" : (this.activated ? "#38bdf8" : "#94a3b8")) : "#1e293b";
        ctx.fillRect(-28 + col * 12, -22 + row * 16, 8, 8);
      }
    }

    // Shield & HP Dual Defense Bars
    const barW = 120;
    const barH = 7;
    // Shield Bar (Cyan)
    if (this.shield > 0) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(-barW / 2, -this.radius - 32, barW, 5);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-barW / 2, -this.radius - 32, barW * (this.shield / this.maxShield), 5);
    }
    // HP Bar (Green / Red)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(-barW / 2, -this.radius - 24, barW, barH);
    ctx.fillStyle = this.hp > this.maxHp * 0.3 ? "#22c55e" : "#ef4444";
    ctx.fillRect(-barW / 2, -this.radius - 24, barW * (this.hp / this.maxHp), barH);

    ctx.font = "bold 11px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000000";
    const statusText = !this.activated ? (!this.arrowCompleted ? "STANDBY: INPUT ARROW CODE" : "PERIMETER STANDBY") : (this.completed ? "CLUSTER SECURED" : `DEFENSE: ${Math.round(pct * 100)}% [${Math.round(this.shield)} SHIELD / ${Math.round(this.hp)} HP]`);
    ctx.strokeText(statusText, 0, -this.radius - 38);
    ctx.fillText(statusText, 0, -this.radius - 38);

    ctx.restore();

    // Floating Helldivers arrow code terminal HUD
    drawObjectiveArrowTerminal(ctx, this, "SERVER CLUSTER");
  }
}

// 2. ATTACK FORTRESS OBJECTIVE: SHIELD PYLON & FORTRESS CORE
class ShieldPylon {
  constructor(x, y, core) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.hp = 650;
    this.maxHp = 650;
    this.core = core;
    this.destroyed = false;

    // Terminal Arrow Override sequence
    this.arrowSequence = ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];
    this.arrowProgress = 0;
    this.arrowCompleted = false;
    this.terminalRange = 125;
  }

  onArrowInput(code) {
    if (this.arrowCompleted || this.destroyed) return false;
    if (code === this.arrowSequence[this.arrowProgress]) {
      this.arrowProgress++;
      if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(true);
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y - 10, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#38bdf8"));
      }
      if (this.arrowProgress >= this.arrowSequence.length) {
        this.arrowCompleted = true;
        this.takeDamage(this.hp + 20, "TERMINAL OVERLOAD");
        addFloatingText(this.x, this.y - 40, "PYLON CORE SABOTAGED VIA TERMINAL!", "#ef4444", 22);
      }
      return true;
    } else {
      this.arrowProgress = 0;
      if (window.soundEngine && window.soundEngine.playCorporateErrorBeep) window.soundEngine.playCorporateErrorBeep();
      addFloatingText(this.x, this.y - 35, "OVERRIDE FAILED", "#ef4444", 16);
      return false;
    }
  }

  takeDamage(amount, source = "") {
    if (this.destroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    addFloatingText(this.x + (Math.random() - 0.5) * 30, this.y - 15, `-${Math.round(amount)}`, "#38bdf8", 14);
    if (this.hp <= 0) {
      this.destroyed = true;
      if (window.soundEngine && window.soundEngine.playProprietaryDestroyed) window.soundEngine.playProprietaryDestroyed('normal');
      addScreenShake(8);
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * 180, Math.sin(a) * 180, "#38bdf8"));
      }
      if (this.core) this.core.onPylonDestroyed();
    }
  }

  update(dt) {
    return !this.destroyed;
  }

  draw(ctx) {
    if (this.destroyed) return;
    ctx.save();

    // Draw radiant energy tether beam to central core
    if (this.core && !this.core.destroyed) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.core.x, this.core.y);
      ctx.stroke();
    }

    ctx.translate(this.x, this.y);

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rotating shield crystal
    const pulse = Math.sin(gameTime * 6) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(56, 189, 248, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();

    // Health bar
    const barW = 50;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(-barW / 2, -this.radius - 12, barW, 5);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-barW / 2, -this.radius - 12, barW * (this.hp / this.maxHp), 5);

    ctx.restore();

    // Floating arrow code terminal HUD
    drawObjectiveArrowTerminal(ctx, this, "PYLON OVERLOAD");
  }
}

class FortressTurret {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.hp = 450;
    this.maxHp = 450;
    this.angle = 0;
    this.cooldown = 1.6;
    this.destroyed = false;
  }

  takeDamage(amount, source = "") {
    if (this.destroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.destroyed = true;
      if (window.soundEngine && window.soundEngine.playProprietaryDestroyed) window.soundEngine.playProprietaryDestroyed('normal');
    }
  }

  update(dt) {
    if (this.destroyed) return false;
    if (!player) return true;

    if (dungeon && !dungeon.hasLineOfSight(this.x, this.y, player.x, player.y)) {
      return true; // Cover provides shelter from fortress fire
    }

    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.cooldown = 1.8;
      const spd = 450;
      enemyProjectiles.push(new EnemyProjectile(
        this.x + Math.cos(this.angle) * 28,
        this.y + Math.sin(this.angle) * 28,
        Math.cos(this.angle) * spd,
        Math.sin(this.angle) * spd,
        6,
        18,
        "#f59e0b",
        1.8,
        "FORTRESS_CANNON"
      ));
    }
    return true;
  }

  draw(ctx) {
    if (this.destroyed) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Twin cannon barrels
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(8, -8, 22, 5);
    ctx.fillRect(8, 3, 22, 5);

    ctx.restore();
  }
}

class FortressCore {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 64;
    this.hp = 2800;
    this.maxHp = 2800;
    this.pylonsRemaining = 3;
    this.destroyed = false;
    this.pylons = [];
    this.turrets = [];

    // Spawn 3 orbiting shield pylons and 2 heavy fortress turrets
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 / 3) * i;
      const px = this.x + Math.cos(a) * 260;
      const py = this.y + Math.sin(a) * 260;
      const pylon = new ShieldPylon(px, py, this);
      this.pylons.push(pylon);
      objectiveTargets.push(pylon);
    }
    for (let i = 0; i < 2; i++) {
      const a = (Math.PI) * i + Math.PI / 4;
      const tx = this.x + Math.cos(a) * 180;
      const ty = this.y + Math.sin(a) * 180;
      const turret = new FortressTurret(tx, ty);
      this.turrets.push(turret);
      objectiveTargets.push(turret);
    }
  }

  onPylonDestroyed() {
    this.pylonsRemaining = this.pylons.filter(p => !p.destroyed).length;
    if (this.pylonsRemaining === 0) {
      if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
        window.soundEngine.speakRobot("FORTRESS SHIELD GENERATORS DESTROYED. CORE IS VULNERABLE.", "SUPER DESTROYER");
      }
      addScreenShake(12);
      addFloatingText(this.x, this.y - 70, "SHIELD COLLAPSED - DEMOLISH CORE!", "#ef4444", 26);
    }
  }

  takeDamage(amount, source = "") {
    if (this.destroyed) return;
    if (this.pylonsRemaining > 0) {
      // Shield absorbs 100% of damage
      if (window.soundEngine && window.soundEngine.playShieldDeflect) window.soundEngine.playShieldDeflect();
      addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 30, "DEFLECTED - DESTROY PYLONS FIRST!", "#38bdf8", 16);
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 30, `-${Math.round(amount)}`, "#ef4444", 18);
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.destroyed = true;
    if (window.soundEngine && window.soundEngine.playRocketExplode) window.soundEngine.playRocketExplode();
    addScreenShake(28);
    screenFlash = 1.0;
    particles.push(new ShockwaveRing(this.x, this.y, 400, "#ef4444"));

    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 320;
      particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() < 0.5 ? "#ef4444" : "#facc15"));
    }

    weaponChests.push(new WeaponChest(this.x - 40, this.y));
    weaponChests.push(new WeaponChest(this.x + 40, this.y));

    if (dungeon) {
      dungeon.onObjectiveProgress("ATTACK_FORTRESS", 1);
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("CITADEL CORE ANNIHILATED. FORTRESS LIBERATED.", "SUPER DESTROYER");
    }
  }

  update(dt) {
    return !this.destroyed;
  }

  draw(ctx) {
    if (this.destroyed) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Fortress Core Dome
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Invulnerability shield sphere if pylons exist
    if (this.pylonsRemaining > 0) {
      const pulse = Math.sin(gameTime * 8) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.35 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`INVULNERABLE (${this.pylonsRemaining} PYLONS)`, 0, -this.radius - 20);
    } else {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.stroke();

      const barW = 140;
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(-barW / 2, -this.radius - 20, barW, 8);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-barW / 2, -this.radius - 20, barW * (this.hp / this.maxHp), 8);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.fillText(`VULNERABLE CORE: ${Math.round(this.hp)} HP`, 0, -this.radius - 26);
    }

    ctx.restore();
  }
}

// 3. SETUP LINK OBJECTIVE: UPLINK RELAY BEACON
class UplinkRelay {
  constructor(x, y, index) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.captureRadius = 150;
    this.isFriendlyDefenseTarget = true;
    this.index = index;
    this.progress = 0;
    this.maxProgress = 8.5; // 8.5s upload
    this.completed = false;
    this.activated = false;
    this.inRing = false;
    this.ringSpinAngle = 0;
    this.warnCooldown = 0;
    this.waveSpawned = false;

    // Helldivers-style Arrow Sequence Terminal
    const relayCodes = [
      ['ArrowUp', 'ArrowRight', 'ArrowDown'],
      ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'],
      ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
    ];
    this.arrowSequence = relayCodes[(this.index || 0) % relayCodes.length];
    this.arrowProgress = 0;
    this.arrowCompleted = false;
    this.terminalRange = 135;
  }

  onArrowInput(code) {
    if (this.arrowCompleted || this.completed) return false;
    if (code === this.arrowSequence[this.arrowProgress]) {
      this.arrowProgress++;
      if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(true);
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y - 15, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#22c55e"));
      }
      if (this.arrowProgress >= this.arrowSequence.length) {
        this.onArrowSequenceSuccess();
      }
      return true;
    } else {
      this.arrowProgress = 0;
      if (window.soundEngine && window.soundEngine.playCorporateErrorBeep) window.soundEngine.playCorporateErrorBeep();
      addFloatingText(this.x, this.y - 45, "CODE RESET!", "#ef4444", 16);
      return false;
    }
  }

  onArrowSequenceSuccess() {
    this.arrowCompleted = true;
    this.activated = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(10);
    addFloatingText(this.x, this.y - 45, `⚡ UPLINK ${this.index + 1} ONLINE! HOLD PERIMETER! ⚡`, "#38bdf8", 20);
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot(`UPLINK ${this.index + 1} LINKED. HOLD PERIMETER TO ROUTE PACKETS!`, "HIGH COMMAND");
    }
    if (dungeon && !this.waveSpawned) {
      this.waveSpawned = true;
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i + Math.random() * 0.4;
        const ex = this.x + Math.cos(a) * 320;
        const ey = this.y + Math.sin(a) * 320;
        enemies.push(dungeon.createEnemyForSector(ex, ey));
      }
    }
  }

  update(dt) {
    if (this.completed) return true;
    if (!player) return true;

    this.ringSpinAngle += dt * 2.2;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    this.inRing = dist <= this.captureRadius;

    // Mission engages ONLY after entering ring AND entering terminal arrow sequence!
    if (!this.activated) {
      if (!this.arrowCompleted && this.inRing) {
        this.warnCooldown -= dt;
        if (this.warnCooldown <= 0) {
          this.warnCooldown = 3.0;
          addFloatingText(this.x, this.y - 45, `⌨️ INPUT UPLINK ${this.index + 1} CODE WITH ARROWS!`, "#facc15", 16);
        }
      }
      return true;
    }

    // When activated: progress only advances while inside ring!
    if (this.inRing) {
      this.progress += dt;
      if (Math.random() < 0.25) {
        particles.push(new SparkParticle(
          this.x + (Math.random() - 0.5) * 60,
          this.y + (Math.random() - 0.5) * 60,
          0,
          -45,
          "#22c55e"
        ));
      }
      if (this.progress >= this.maxProgress) {
        this.complete();
      }
    } else {
      // Tux stepped outside
      this.warnCooldown -= dt;
      if (this.warnCooldown <= 0) {
        this.warnCooldown = 2.0;
        addFloatingText(player.x, player.y - 45, "⚠️ OUTSIDE UPLINK RING! STEP IN TO RESUME! ⚠️", "#ef4444", 16);
        if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(false);
      }
    }
    return true;
  }

  complete() {
    this.completed = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(10);
    particles.push(new ShockwaveRing(this.x, this.y, 220, "#22c55e"));

    if (dungeon) {
      dungeon.onObjectiveProgress("SETUP_UPLINK", 1);
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot(`BEACON ${this.index + 1} ONLINE. MESH PACKETS ROUTED.`, "HIGH COMMAND");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const pct = Math.min(1.0, this.progress / this.maxProgress);

    // Tactical perimeter ring
    if (!this.completed) {
      if (!this.activated) {
        // Standby pulsing cyan ring
        const standbyPulse = Math.sin(gameTime * 4) * 4;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, this.captureRadius + standbyPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        const standbyTxt = !this.arrowCompleted ? `[INPUT ARROW CODE FOR UPLINK ${this.index + 1}]` : `[HOLD UPLINK ${this.index + 1} PERIMETER]`;
        ctx.fillText(standbyTxt, 0, -this.captureRadius - 14);
      } else {
        // Active ring
        ctx.strokeStyle = this.inRing ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, this.captureRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Progress arc around perimeter
        ctx.strokeStyle = this.inRing ? "#22c55e" : "#eab308";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, this.captureRadius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = this.inRing ? "#22c55e" : "#ef4444";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        const txt = this.inRing ? `HOLD PERIMETER: ${Math.round(pct * 100)}%` : `⚠️ RETURN TO UPLINK RING! ⚠️`;
        ctx.fillText(txt, 0, -this.captureRadius - 14);
      }
    } else {
      // Completed solid green ring
      ctx.strokeStyle = "rgba(34, 197, 94, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.captureRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Antenna tower body
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-10, -28, 20, 48);

    ctx.fillStyle = this.completed ? "#22c55e" : (this.activated ? "#38bdf8" : "#facc15");
    ctx.beginPath();
    ctx.arc(0, -32, 12, 0, Math.PI * 2);
    ctx.fill();

    // Beam to sky if completed
    if (this.completed) {
      ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
      ctx.fillRect(-6, -10000, 12, 10000);
    }

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = this.completed ? "#22c55e" : "#facc15";
    ctx.textAlign = "center";
    ctx.fillText(this.completed ? `UPLINK ${this.index + 1}: CONNECTED` : `UPLINK ${this.index + 1}: ${Math.round(pct * 100)}%`, 0, -this.radius - 20);

    ctx.restore();

    // Floating arrow code terminal HUD
    drawObjectiveArrowTerminal(ctx, this, `UPLINK ${this.index + 1}`);
  }
}

// 4. PURGE REACTOR OBJECTIVE: REACTOR PURGE MANIFOLD
class ReactorPurgeManifold {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 46;
    this.isFriendlyDefenseTarget = true;
    this.defenseRingRadius = 210;
    this.hp = 7000;
    this.maxHp = 7000;
    this.shield = 2000;
    this.maxShield = 2000;
    this.shieldRegenTimer = 0;
    this.progress = 0;
    this.maxProgress = 18.0; // 18s cooling purge
    this.activated = false;
    this.inRing = false;
    this.completed = false;
    this.destroyed = false;
    this.warnCooldown = 0;
    this.steamTimer = 0;
    this.waveSpawned = [false, false];

    this.arrowSequence = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    this.arrowProgress = 0;
    this.arrowCompleted = false;
    this.terminalRange = 140;
  }

  onArrowInput(code) {
    if (this.arrowCompleted || this.completed || this.destroyed) return false;
    if (code === this.arrowSequence[this.arrowProgress]) {
      this.arrowProgress++;
      if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(true);
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y - 20, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#ea580c"));
      }
      if (this.arrowProgress >= this.arrowSequence.length) {
        this.onArrowSequenceSuccess();
      }
      return true;
    } else {
      this.arrowProgress = 0;
      if (window.soundEngine && window.soundEngine.playCorporateErrorBeep) window.soundEngine.playCorporateErrorBeep();
      addFloatingText(this.x, this.y - 50, "VALVE JAMMED - RESET!", "#ef4444", 18);
      return false;
    }
  }

  onArrowSequenceSuccess() {
    this.arrowCompleted = true;
    this.activated = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(16);
    addFloatingText(this.x, this.y - 60, "🔥 COOLANT MANIFOLD OPENED! VENT THE REACTOR! 🔥", "#ea580c", 22);
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("COOLANT VALVES DISENGAGED! HOLD THE VENTILATION ZONE WHILE THE CORE STABILIZES!", "HIGH COMMAND");
    }
    this.spawnAssaultWave(4);
  }

  spawnAssaultWave(count) {
    if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
    addScreenShake(8);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const dist = 340 + Math.random() * 80;
      dropPods.push(new HostileDropPod(this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist));
    }
  }

  takeDamage(amount, source = "") {
    if (this.completed || this.destroyed) return;
    const s = (source || "").toUpperCase();
    if (s === "SENTRY" || s === "BULLET" || s.includes("RPG") || s.includes("PLAYER") || s.includes("FRIENDLY") || s.includes("ALLIED") || s.includes("FLAME") || s.includes("TESLA") || s.includes("RAILCANNON")) {
      return;
    }

    this.shieldRegenTimer = 0;
    let dmg = amount;
    if (this.shield > 0) {
      if (dmg <= this.shield) {
        this.shield -= dmg;
        addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 32, `-${Math.round(dmg)} SHIELD`, "#38bdf8", 16);
        dmg = 0;
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }

    if (dmg > 0) {
      this.hp = Math.max(0, this.hp - dmg);
      addFloatingText(this.x + (Math.random() - 0.5) * 40, this.y - 20, `-${Math.round(dmg)}`, "#ef4444", 16);
      if (this.hp <= 0) {
        this.destroyed = true;
        if (window.soundEngine && window.soundEngine.playRocketExplode) window.soundEngine.playRocketExplode();
        addScreenShake(20);
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("REACTOR CORE BREACH DETECTED. MELTDOWN UNCONTAINED.", "ALERT AI");
        }
      }
    }
  }

  update(dt) {
    if (this.destroyed || this.completed) return true;
    if (!player) return true;

    this.shieldRegenTimer += dt;
    if (this.shieldRegenTimer >= 3.5 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 160 * dt);
    }

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    this.inRing = dist <= this.defenseRingRadius;

    // Steam vents while purging
    if (this.activated) {
      this.steamTimer += dt;
      if (this.steamTimer > 0.12) {
        this.steamTimer = 0;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 100;
          particles.push(new SparkParticle(this.x, this.y - 10, Math.cos(a) * spd, Math.sin(a) * spd - 60, "#fdba74"));
        }
      }
    }

    if (!this.activated) {
      if (!this.arrowCompleted && this.inRing) {
        this.warnCooldown -= dt;
        if (this.warnCooldown <= 0) {
          this.warnCooldown = 3.0;
          addFloatingText(this.x, this.y - 50, "⌨️ INPUT COOLING CODE WITH ARROWS [▲ ◀ ▼ ▶ ▲ ▼]!", "#ea580c", 16);
        }
      }
      return true;
    }

    if (this.inRing) {
      this.progress += dt;
      const pct = this.progress / this.maxProgress;

      if (pct >= 0.5 && !this.waveSpawned[0]) {
        this.waveSpawned[0] = true;
        this.spawnAssaultWave(4);
      } else if (pct >= 0.85 && !this.waveSpawned[1]) {
        this.waveSpawned[1] = true;
        this.spawnAssaultWave(5);
      }

      if (this.progress >= this.maxProgress) {
        this.complete();
      }
    } else {
      this.warnCooldown -= dt;
      if (this.warnCooldown <= 0) {
        this.warnCooldown = 2.0;
        addFloatingText(player.x, player.y - 45, "⚠️ RETURN TO REACTOR COOLING RING! ⚠️", "#ef4444", 18);
        if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(false);
      }
    }
    return true;
  }

  complete() {
    this.completed = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(20);
    particles.push(new ShockwaveRing(this.x, this.y, 360, "#ea580c"));

    weaponChests.push(new WeaponChest(this.x - 50, this.y + 40));
    weaponChests.push(new WeaponChest(this.x + 50, this.y + 40));
    pickups.push(new Pickup(this.x, this.y + 55, 'hp'));

    if (dungeon) {
      dungeon.onObjectiveProgress("PURGE_REACTOR", 1);
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("REACTOR MANIFOLD STABILIZED AND CONVERTED TO CLEAN OPEN-SOURCE POWER!", "HIGH COMMAND");
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const r = this.defenseRingRadius;
    const pct = Math.min(1.0, this.progress / this.maxProgress);

    // Perimeter Ring
    if (!this.completed) {
      if (!this.activated) {
        ctx.strokeStyle = "rgba(234, 88, 12, 0.45)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = this.inRing ? "#ea580c" : "#ef4444";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
      }
    }

    // Heavy Industrial Reactor Chamber
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.roundRect(-36, -36, 72, 72, 12);
    ctx.fill();
    ctx.strokeStyle = this.completed ? "#22c55e" : (this.activated ? "#ea580c" : "#78716c");
    ctx.lineWidth = 3;
    ctx.stroke();

    // Reactor Core Glow
    const pulse = Math.sin(gameTime * 8) * 0.2 + 0.8;
    ctx.fillStyle = this.completed ? "rgba(34, 197, 94, 0.85)" : `rgba(234, 88, 12, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Overhead Status
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    const statusTxt = !this.activated ? "REACTOR: VENT CODE REQUIRED" : (this.completed ? "REACTOR SECURED" : `COOLING: ${Math.round(pct * 100)}%`);
    ctx.fillText(statusTxt, 0, -this.radius - 24);

    ctx.restore();
    drawObjectiveArrowTerminal(ctx, this, "REACTOR PURGE");
  }
}

// 5. PRISON BREAK OBJECTIVE: PRISON BREAK CAGE
class PrisonBreakCage {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 42;
    this.hp = 1800;
    this.maxHp = 1800;
    this.completed = false;
    this.destroyed = false;

    this.arrowSequence = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    this.arrowProgress = 0;
    this.arrowCompleted = false;
    this.terminalRange = 135;
  }

  onArrowInput(code) {
    if (this.arrowCompleted || this.completed || this.destroyed) return false;
    if (code === this.arrowSequence[this.arrowProgress]) {
      this.arrowProgress++;
      if (window.soundEngine && window.soundEngine.playStratagemBeep) window.soundEngine.playStratagemBeep(true);
      for (let i = 0; i < 4; i++) {
        particles.push(new SparkParticle(this.x, this.y - 10, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, "#38bdf8"));
      }
      if (this.arrowProgress >= this.arrowSequence.length) {
        this.complete();
      }
      return true;
    } else {
      this.arrowProgress = 0;
      if (window.soundEngine && window.soundEngine.playCorporateErrorBeep) window.soundEngine.playCorporateErrorBeep();
      addFloatingText(this.x, this.y - 45, "CIPHER FAILED - RESET!", "#ef4444", 16);
      return false;
    }
  }

  takeDamage(amount, source = "") {
    if (this.completed || this.destroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.complete();
    }
  }

  update(dt) {
    return !this.completed && !this.destroyed;
  }

  complete() {
    if (this.completed) return;
    this.completed = true;
    this.arrowCompleted = true;
    if (window.soundEngine && window.soundEngine.playObjectiveComplete) window.soundEngine.playObjectiveComplete();
    addScreenShake(16);
    particles.push(new ShockwaveRing(this.x, this.y, 280, "#38bdf8"));

    // Spawn 3 Armed Allied Combat Penguins!
    if (typeof helperPenguins !== 'undefined') {
      helperPenguins.push(new HelperPenguin(this.x - 32, this.y + 20));
      helperPenguins.push(new HelperPenguin(this.x + 32, this.y + 20));
      helperPenguins.push(new HelperPenguin(this.x, this.y + 40));
    }

    addFloatingText(this.x, this.y - 50, "⭐ PRISONERS LIBERATED! SQUAD COMMITTED! ⭐", "#22c55e", 24);

    if (dungeon) {
      dungeon.onObjectiveProgress("PRISON_BREAK", 1);
    }
    if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
      window.soundEngine.speakRobot("ALLIED COMBAT PENGUINS FREED FROM CLOSED-SOURCE DETENTION! THEY ARE FLANKING YOUR SQUAD!", "HIGH COMMAND");
    }
  }

  draw(ctx) {
    if (this.completed) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Laser Prison Cage Base
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-34, -30, 68, 60);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(-34, -30, 68, 60);

    // Glowing Cyan Laser Bars
    const barPulse = Math.sin(gameTime * 10) * 0.25 + 0.75;
    ctx.strokeStyle = `rgba(56, 189, 248, ${barPulse})`;
    ctx.lineWidth = 3;
    for (let x = -24; x <= 24; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, -28);
      ctx.lineTo(x, 28);
      ctx.stroke();
    }

    // Mini penguin eyes looking through bars
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-10, -4, 4, 0, Math.PI * 2);
    ctx.arc(10, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(-10, -4, 2, 0, Math.PI * 2);
    ctx.arc(10, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText("CRYO-CAGE: [INPUT DECRYPTION CIPHER]", 0, -this.radius - 16);

    ctx.restore();
    drawObjectiveArrowTerminal(ctx, this, "PRISON BREAK");
  }
}

// ============================================================================
// --- ENVIRONMENTAL BIOME HAZARDS ---
// ============================================================================
class SteamVent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.timer = Math.random() * 3.0;
    this.state = 'dormant'; // 'dormant', 'warning', 'erupting'
    this.stateDuration = 2.5;
  }

  update(dt) {
    this.timer += dt;
    if (this.state === 'dormant' && this.timer > 3.0) {
      this.state = 'warning';
      this.timer = 0;
    } else if (this.state === 'warning' && this.timer > 1.0) {
      this.state = 'erupting';
      this.timer = 0;
      if (window.soundEngine && window.soundEngine.playNapalmDrop) window.soundEngine.playNapalmDrop();
      addScreenShake(3);
    } else if (this.state === 'erupting' && this.timer > 1.6) {
      this.state = 'dormant';
      this.timer = 0;
    }

    if (this.state === 'erupting') {
      // Spew flame particles
      particles.push(new FlameParticle(
        this.x + (Math.random() - 0.5) * 20,
        this.y + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 50,
        -180 - Math.random() * 80,
        0.4,
        35,
        false
      ));

      // Damage player if standing on vent
      if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius) {
        player.takeDamage(45 * dt, "STEAM_VENT");
      }
      for (const enemy of enemies) {
        if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
          enemy.takeDamage(55 * dt, "STEAM_VENT");
        }
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Industrial vent grate
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.state === 'warning' ? "#ef4444" : (this.state === 'erupting' ? "#ea580c" : "#78716c");
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }
}

class CryoPool {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 42;
  }
  update(dt) {
    if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius) {
      player.webSlowTimer = 0.5; // Freezing slow
      if (Math.random() < 0.2) {
        particles.push(new SparkParticle(player.x, player.y, 0, -20, "#38bdf8"));
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

class AcidPool {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 38;
  }
  update(dt) {
    if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius) {
      player.takeDamage(15 * dt, "CORROSIVE_ACID");
      player.corrodedTimer = 2.0;
    }
    for (const enemy of enemies) {
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.radius + enemy.radius) {
        enemy.takeDamage(25 * dt, "CORROSIVE_ACID");
        enemy.corrodedTimer = 2.0;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 222, 128, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

class SecurityTripwire {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.tripped = false;
  }
  update(dt) {
    if (this.tripped || !player) return true;
    // Check if player crosses the segment
    const distToSeg = this.distToSegment(player.x, player.y, this.x1, this.y1, this.x2, this.y2);
    if (distToSeg < player.radius) {
      this.tripped = true;
      if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
      addScreenShake(8);
      dropPods.push(new HostileDropPod(player.x + 180, player.y));
      dropPods.push(new HostileDropPod(player.x - 180, player.y));
      if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
        window.soundEngine.speakRobot("SECURITY TRIPWIRE COMPROMISED. DEPLOYING ENFORCER DROPPODS.", "WALLED GARDEN SEC");
      }
    }
    return true;
  }
  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }
  draw(ctx) {
    if (this.tripped) return;
    ctx.save();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    // End bollards
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(this.x1 - 4, this.y1 - 4, 8, 8);
    ctx.fillRect(this.x2 - 4, this.y2 - 4, 8, 8);
    ctx.restore();
  }
}

class SingularityRift {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 75;
    this.spin = 0;
  }
  update(dt) {
    this.spin += dt * 4;
    // Gentle pull
    if (player) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < 280 && d > 10) {
        const pull = (1 - d / 280) * 110 * dt;
        player.vx += ((this.x - player.x) / d) * pull;
        player.vy += ((this.y - player.y) / d) * pull;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = "rgba(126, 34, 206, 0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

class DoorBarrier {
  constructor(tx, ty, room) {
    this.tx = tx;
    this.ty = ty;
    this.x = (tx + 0.5) * TILE_SIZE;
    this.y = (ty + 0.5) * TILE_SIZE;
    this.room = room;
  }

  isSolid() {
    return this.room.locked;
  }

  draw(ctx) {
    if (!this.room.locked) {
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.tx * TILE_SIZE + 4, this.ty * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
    ctx.fillRect(this.tx * TILE_SIZE, this.ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(this.tx * TILE_SIZE, (this.ty + 0.5) * TILE_SIZE);
    ctx.lineTo((this.tx + 1) * TILE_SIZE, (this.ty + 0.5) * TILE_SIZE);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.tx * TILE_SIZE, (this.ty + 0.5) * TILE_SIZE);
    ctx.lineTo((this.tx + 1) * TILE_SIZE, (this.ty + 0.5) * TILE_SIZE);
    ctx.stroke();
    ctx.restore();
  }
}

class Room {
  constructor(id, rx, ry, rw, rh, type = "COMBAT") {
    this.id = id;
    this.rx = rx; // Tile coordinates
    this.ry = ry;
    this.rw = rw;
    this.rh = rh;
    this.x = rx * TILE_SIZE;
    this.y = ry * TILE_SIZE;
    this.width = rw * TILE_SIZE;
    this.height = rh * TILE_SIZE;
    this.cx = this.x + this.width / 2;
    this.cy = this.y + this.height / 2;
    this.radius = Math.max(this.width, this.height) / 2;
    this.type = type; // "SPAWN", "COMBAT", "OBJECTIVE", "TREASURE", "BOSS", "EXIT"
    this.doors = [];
    this.cleared = (type === "SPAWN" || type === "TREASURE" || type === "EXIT");
    this.locked = false;
    this.visited = false;
    this.wavesTotal = (type === "BOSS" ? 1 : 2);
    this.wavesCleared = 0;
    this.roomEnemies = [];
  }

  containsPoint(px, py) {
    const d = Math.hypot(px - this.cx, py - this.cy);
    return d <= this.radius || (px >= this.x && px <= this.x + this.width && py >= this.y && py <= this.y + this.height);
  }

  onPlayerEnter() {
    this.visited = true;
    if (this.cleared || this.locked) return;

    if (this.type === "COMBAT" || this.type === "OBJECTIVE" || this.type === "BOSS") {
      this.locked = true;
      window.soundEngine.playRoomLockdown();
      addScreenShake(12);
      addFloatingText(this.cx, this.cy - 100, "⚠️ SECTOR LOCKDOWN - PURGE HOSTILES! ⚠️", "#ef4444", 28);
      this.spawnRoomWave();
    }
  }

  spawnRoomWave() {
    if (this.type === "BOSS") {
      const hasAliveBoss = enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
      if (hasAliveBoss) {
        this.type = "COMBAT";
      } else {
        let boss;
        const bossType = (dungeon.sectorMajor - 1) % 4;
        if (bossType === 0) boss = new BossBloatware(this.cx, this.cy);
        else if (bossType === 1) boss = new BossVendorLockin(this.cx, this.cy);
        else if (bossType === 2) boss = new BossCloudMonopoly(this.cx, this.cy);
        else boss = new BossOmegaAI(this.cx, this.cy);

      boss.hp *= dungeon.getDifficultyMultiplier();
      boss.maxHp = boss.hp;
      enemies.push(boss);
      this.roomEnemies.push(boss);

      if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function' && !window.PixelCutscenes.isActive()) {
        window.PixelCutscenes.play("boss_encounter", {
          bossName: boss.name || boss.label || "APEX CORPORATE OVERLORD",
          bossTitle: boss.title || "Enterprise Licensing Hegemon",
          bossQuote: boss.introQuote || "CRITICAL EXCEPTION IN USER SPACE: COMPLY OR BE DELETED!",
          bossColor: boss.color || "#ef4444"
        });
      }
        return;
      }
    }

    const enemyCount = Math.floor(5 + dungeon.sectorNum * 1.3);
    for (let i = 0; i < enemyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * (this.radius * 0.7);
      let sx = this.cx + Math.cos(angle) * dist;
      let sy = this.cy + Math.sin(angle) * dist;
      if (dungeon && dungeon.isSolid(sx, sy)) {
        sx = this.cx;
        sy = this.cy;
      }
      const enemy = dungeon.createEnemyForSector(sx, sy);
      enemies.push(enemy);
      this.roomEnemies.push(enemy);
    }
  }

  update(dt) {
    if (!this.locked) return;

    this.roomEnemies = this.roomEnemies.filter(e => enemies.includes(e) && e.hp > 0);

    if (this.roomEnemies.length === 0) {
      this.wavesCleared++;
      if (this.wavesCleared < this.wavesTotal && this.type !== "BOSS") {
        addFloatingText(this.cx, this.cy, "WAVE 2 INCOMING!", "#f97316", 24);
        this.spawnRoomWave();
      } else {
        this.locked = false;
        this.cleared = true;
        window.soundEngine.playRoomClear();
        addFloatingText(this.cx, this.cy - 60, "ROOM PURGED! LOCKDOWN LIFTED!", "#22c55e", 26);

        for (let i = 0; i < 6; i++) {
          pickups.push(new Pickup(this.cx + (Math.random() - 0.5) * 80, this.cy + (Math.random() - 0.5) * 80, 'xp'));
        }
        pickups.push(new Pickup(this.cx + 20, this.cy, 'hp'));
        pickups.push(new Pickup(this.cx - 20, this.cy, 'fuel'));

        if (Math.random() < 0.45) {
          const available = WEAPON_CATALOG.filter(w => w.id !== player.heldWeapons[0].id && w.id !== player.heldWeapons[1].id);
          const dropW = available[Math.floor(Math.random() * available.length)] || WEAPON_CATALOG[2];
          groundWeapons.push(new GroundWeapon(this.cx, this.cy, dropW));
        }

        // Rare chance of discovering a relic Space Marine Exosuit (fair and rewarding)
        if (Math.random() < 0.08) {
          spaceMarineSuitPickups.push(new SpaceMarineSuitPickup(this.cx, this.cy));
          addFloatingText(this.cx, this.cy - 40, "⚡ RARE POWER EXOSUIT DISCOVERED! ⚡", "#06b6d4", 22);
        }

        dungeon.onRoomCleared(this);
      }
    }
  }
}

// --- ADAPTIVE ENDLESS DIRECTOR ---
// Tracks player actions (favored weapons, damage suffered, kill momentum)
// to procedurally adapt terrain biomes, environmental hazards, and tactical modifiers!
class AdaptiveDirector {
  constructor() {
    this.totalKills = 0;
    this.weaponUsage = { flame: 0, buckshot: 0, bolter: 0, minigun: 0, rocket: 0, railgun: 0, cryo: 0 };
    this.totalDamageTaken = 0;
    this.stratagemsCalled = 0;
    this.sectorsCleared = 0;
    this.currentBiome = "EMERALD_GLADE";
    this.sectorModifier = "TACTICAL_ASSAULT";
  }

  recordKill(weaponType = "flame") {
    this.totalKills++;
    if (this.weaponUsage[weaponType] !== undefined) {
      this.weaponUsage[weaponType]++;
    } else {
      this.weaponUsage.flame++;
    }
  }

  recordDamageTaken(amount) {
    this.totalDamageTaken += amount;
  }

  recordStratagem() {
    this.stratagemsCalled++;
  }

  onSectorAdvance(sectorNum) {
    this.sectorsCleared++;
    const biomes = ["EMERALD_GLADE", "TOXIC_SWAMP", "MONOLITH_CAVERNS", "OVERCLOCK_REACTOR"];
    this.currentBiome = biomes[(sectorNum - 1) % biomes.length];

    // Adaptively tune modifiers based on player performance:
    if (this.totalKills > 35 && this.totalDamageTaken < 80) {
      this.sectorModifier = "HOSTILE_SURGE"; // High combat skill -> heavier enemy patrols
    } else if (this.totalDamageTaken > 200) {
      this.sectorModifier = "CACHE_DROP"; // Struggling -> emergency supply cache airdropped
    } else if (this.weaponUsage.flame > 25) {
      this.sectorModifier = "FIREWALL_ARMOR"; // Pyromaniac player -> swampy terrain & armored units
    } else if (this.weaponUsage.railgun + this.weaponUsage.bolter > 20) {
      this.sectorModifier = "LONG_RANGE_OUTPOSTS"; // Precision player -> scattered monolith cover
    } else {
      this.sectorModifier = "TACTICAL_ASSAULT";
    }
  }

  getTacticalBrief() {
    switch (this.sectorModifier) {
      case "HOSTILE_SURGE":
        return "⚡ [DIRECTOR: HIGH PURGE RATE -> HEAVY VANGUARD PATROLS DEPLOYED]";
      case "CACHE_DROP":
        return "📦 [DIRECTOR: INTEGRITY WARNING -> EMERGENCY WEAPON CACHE DROPPED]";
      case "FIREWALL_ARMOR":
        return "🛡️ [DIRECTOR: ADAPTING TO PYRO PURGE -> WETLAND MARSH & HEAVY UNITS]";
      case "LONG_RANGE_OUTPOSTS":
        return "🎯 [DIRECTOR: LONG-RANGE PROFILE -> MONOLITH COVER SCATTERED]";
      default:
        return "🛰️ [DIRECTOR: RECON COMPLETE -> PURGE HOSTILES & LIBERATE REPO]";
    }
  }
}

const adaptiveDirector = new AdaptiveDirector();
window.adaptiveDirector = adaptiveDirector;

class ObjectiveManager {
  constructor(dungeon) {
    this.dungeon = dungeon;
    this.tier = 1;
    this.biome = (dungeon && dungeon.currentBiome) ? dungeon.currentBiome : null;
    this.objectiveType = "DEFEND_SERVERS";
    this.objectives = [];
    this.generateTierObjectives();
  }

  generateTierObjectives() {
    this.objectives = [
      {
        id: "DESTROY_ANTENNAS",
        text: `Purge Outpost Antennas`,
        current: 0,
        required: 1 + Math.min(2, Math.floor(this.tier / 2)),
        done: false
      },
      {
        id: "PURGE_ENEMIES",
        text: `Eliminate Proprietary Hostiles`,
        current: 0,
        required: 10 + this.tier * 4,
        done: false
      },
      {
        id: "PURGE_BOSS",
        text: `Defeat Corporate Monopoly Boss`,
        current: 0,
        required: 1,
        done: false
      }
    ];
    this.updateUI();
  }

  setupBiomeObjectives(biome, objectiveType, tier) {
    this.tier = tier || this.tier;
    this.biome = biome || ((this.dungeon && this.dungeon.currentBiome) ? this.dungeon.currentBiome : null);
    this.objectiveType = objectiveType || "DEFEND_SERVERS";

    switch (this.objectiveType) {
      case "DEFEND_SERVERS":
        this.objectives = [
          {
            id: "DEFEND_SERVERS",
            text: "Defend Server Cluster Node (Hold Position)",
            current: 0,
            required: 1,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Eliminate Hostile Outpost Defenders",
            current: 0,
            required: 12 + this.tier * 3,
            done: false
          }
        ];
        break;
      case "ATTACK_FORTRESS":
        this.objectives = [
          {
            id: "ATTACK_FORTRESS",
            text: "Destroy Shield Pylons & Demolish Fortress Core",
            current: 0,
            required: 1,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Eliminate Fortress Garrison Enforcers",
            current: 0,
            required: 14 + this.tier * 4,
            done: false
          }
        ];
        break;
      case "SETUP_UPLINK":
        this.objectives = [
          {
            id: "SETUP_UPLINK",
            text: "Calibrate 3 Encrypted Mesh Uplinks",
            current: 0,
            required: 3,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Clear Hostile Signals in Sector",
            current: 0,
            required: 10 + this.tier * 3,
            done: false
          }
        ];
        break;
      case "PURGE_REACTOR":
        this.objectives = [
          {
            id: "PURGE_REACTOR",
            text: "Cool & Vent Overclocked Reactor Manifold",
            current: 0,
            required: 1,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Eliminate Meltdown Containment Squads",
            current: 0,
            required: 12 + this.tier * 4,
            done: false
          }
        ];
        break;
      case "PRISON_BREAK":
        this.objectives = [
          {
            id: "PRISON_BREAK",
            text: "Decrypt Cryo-Cage & Liberate Allied GNU Prisoners",
            current: 0,
            required: 1,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Neutralize Prison Guard Sentinels",
            current: 0,
            required: 10 + this.tier * 3,
            done: false
          }
        ];
        break;
      case "ELITE_BOUNTY":
      case "PURGE_BOSS":
        const bossName = (this.biome && this.biome.bossId) ? this.biome.bossId.replace('_', ' ').toUpperCase() : "MONOPOLY BOSS";
        this.objectives = [
          {
            id: "PURGE_BOSS",
            text: `Purge Sector Apex: ${bossName}`,
            current: 0,
            required: 1,
            done: false
          },
          {
            id: "PURGE_ENEMIES",
            text: "Eliminate Proprietary Escort Guard",
            current: 0,
            required: 10 + this.tier * 3,
            done: false
          }
        ];
        break;
      default:
        this.generateTierObjectives();
        return;
    }
    this.updateUI();
    this.announceSectorBriefing();
  }

  announceSectorBriefing() {
    if (!window.soundEngine || typeof window.soundEngine.speakRobot !== 'function') return;
    let briefing = "";
    if (this.tier <= 2) {
      briefing = "ACT I: EMERALD REPO FRONTIER. Tux, proprietary cartels have locked down telemetry outposts! Crack their terminal ciphers and purge monopoly enforcers!";
    } else if (this.tier <= 4) {
      briefing = "ACT II: INDUSTRIAL FABRICATION. We dropped you into the Smelter Core and Heap Wastelands! Vent their overclocked reactors and sabotage hardware lock-in!";
    } else if (this.tier <= 6) {
      briefing = "ACT III: WALLED GARDEN SIEGE. You are breaching the executive citadel! Free our allied combat penguins from detention and shatter their proprietary perimeter!";
    } else {
      briefing = "ACT IV: RING-0 KERNEL SINGULARITY. The final battle! The Quantum Hypervisor is warping process space! Eliminate the monopoly apex and achieve universal Open Source Victory!";
    }
    window.soundEngine.speakRobot(briefing, "HIGH COMMAND");
    if (player) {
      addFloatingText(player.x, player.y - 75, `ACT BRIEFING: TIER ${this.tier} MISSION ACTIVE!`, "#facc15", 22);
    }
  }

  generateForSector(sectorMajor, sectorMinor, sectorNum) {
    this.tier = sectorNum || 1;
    this.generateTierObjectives();
  }

  updateUI() {
    const titleEl = document.getElementById('sectorTitle');
    if (titleEl) {
      const bLabel = this.biome ? this.biome.name : (window.adaptiveDirector ? (window.adaptiveDirector.currentBiome || "WILDERNESS") : "WILDERNESS");
      titleEl.innerText = `TIER ${this.tier} // ${bLabel}`;
    }

    const badgeEl = document.getElementById('objectiveStatusBadge');
    const isAllDone = this.isComplete();
    if (badgeEl) {
      if (isAllDone) {
        badgeEl.className = "obj-badge complete";
        badgeEl.innerText = "PORTALS OPEN";
      } else {
        badgeEl.className = "obj-badge in-progress";
        badgeEl.innerText = "ACTIVE";
      }
    }

    const listEl = document.getElementById('objectiveList');
    if (listEl) {
      listEl.innerHTML = this.objectives.map(obj => `
        <div class="objective-item ${obj.done ? 'done' : ''}">
          <span class="obj-check">${obj.done ? '✓' : '◻'}</span>
          <span>${obj.text} (${obj.current}/${obj.required})</span>
        </div>
      `).join('');
    }

    const waveEl = document.getElementById('waveDisplay');
    if (waveEl && player) {
      const distM = Math.round(Math.hypot(player.x, player.y) / 10);
      waveEl.innerText = `TIER ${this.tier} • ${distM}m DEEP`;
    }
  }

  progress(objId, amount = 1) {
    let changed = false;
    for (const obj of this.objectives) {
      if (obj.id === objId && !obj.done) {
        if (obj.id === "PURGE_BOSS") {
          const aliveBoss = enemies && enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
          if (aliveBoss) continue; // Never mark PURGE_BOSS complete while an active boss is still alive!
        }
        obj.current = Math.min(obj.required, obj.current + amount);
        if (obj.current >= obj.required) {
          obj.done = true;
          if (window.soundEngine && window.soundEngine.playObjectiveComplete) {
            window.soundEngine.playObjectiveComplete();
          }
          if (player) {
            addFloatingText(player.x, player.y - 60, `OBJECTIVE COMPLETE: ${obj.text}!`, "#22c55e", 24);
          }
        }
        changed = true;
      }
    }
    if (changed) {
      this.checkAllDone();
    }
  }

  setupActObjectives(act, bossNameOverride = null) {
    this.tier = act.act;
    this.biome = (this.dungeon && this.dungeon.currentBiome) ? this.dungeon.currentBiome : null;
    this.objectiveType = act.objectiveType;

    const primaryText = {
      "DEFEND_SERVERS": "Defend Server Cluster Node (Hold Position)",
      "PURGE_REACTOR": "Purge Coolant Reactor Manifold (Hold Vent Zone)",
      "PRISON_BREAK": "Liberate Captured Contributor Penguins",
      "ATTACK_FORTRESS": "Demolish Proprietary Fortress Core",
      "PURGE_BOSS": "Slay Ring-0 Hypervisor Core"
    }[act.objectiveType] || "Complete Primary Directive";

    const targetBoss = bossNameOverride || act.bossName || "Act Boss";

    this.objectives = [
      {
        id: act.objectiveType,
        text: primaryText,
        current: 0,
        required: 1,
        done: false
      },
      {
        id: "TERMINAL_OVERRIDE",
        text: `Bash Console: ${act.terminalCmd || 'sudo systemctl stop cartel-drm'}`,
        current: 0,
        required: 1,
        done: false
      },
      {
        id: "PURGE_BOSS",
        text: `Defeat ${targetBoss}`,
        current: 0,
        required: 1,
        done: false
      },
      {
        id: "PURGE_ENEMIES",
        text: "Eliminate Hostile Outpost Defenders",
        current: 0,
        required: 10 + act.act * 4,
        done: false
      }
    ];
    this.updateUI();
  }

  checkAllDone() {
    const allDone = this.objectives.length > 0 && this.objectives.every(o => o.done);
    this.updateUI();
    if (allDone) {
      if (window.soundEngine && window.soundEngine.playObjectiveComplete) {
        window.soundEngine.playObjectiveComplete();
      }
      const act = (typeof CAMPAIGN_ACTS !== 'undefined' && this.dungeon) ? CAMPAIGN_ACTS[this.dungeon.currentActIndex || 0] : null;
      const isFinalAct = act && (act.act >= CAMPAIGN_ACTS.length);

      if (isFinalAct) {
        triggerVictory();
        return true;
      }

      if (player && act) {
        addFloatingText(player.x, player.y - 90, `⭐ ${act.title} CONQUERED! EXTRACTION READY! ⭐`, "#facc15", 28);
        addScreenShake(14);
        screenFlash = 0.8;
      }

      const currentTier = (this.dungeon && this.dungeon.currentActIndex !== undefined) ? (this.dungeon.currentActIndex + 1) : this.tier;
      const clearMsg = `Tier ${currentTier} Clear! Outstanding patriotism, Tux! Tactical extraction portal deployed.`;
      if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
        const priority = (window.VoiceManager && window.VoiceManager.PRIORITY) ? window.VoiceManager.PRIORITY.MISSION_CRITICAL : 2;
        window.soundEngine.playVoiceClip(act ? act.clearClip : null, clearMsg, (act && act.clearSpeaker) || "JOHN HELLDIVER", priority);
      }

      if (this.dungeon && typeof this.dungeon.spawnActExtractionPortals === 'function') {
        this.dungeon.spawnActExtractionPortals();
      } else if (this.dungeon && typeof this.dungeon.spawnExtractionPortals === 'function') {
        this.dungeon.spawnExtractionPortals();
      }

      this.tier++;
      if (window.adaptiveDirector && window.adaptiveDirector.onSectorAdvance) {
        window.adaptiveDirector.onSectorAdvance(this.tier);
      }
      setTimeout(() => {
        if (gameState === STATE.PLAYING) showUpgradeScreen();
      }, 750);
    }
    return allDone;
  }

  isComplete() {
    return this.objectives.length > 0 && this.objectives.every(o => o.done);
  }
}

// ============================================================================
// --- QUARANTINE LOCKDOWN ARENA & TACTICAL RESUPPLY DROP PODS ---
// ============================================================================
class QuarantineLockdownArena {
  constructor(x, y, radius = 540, type = 'AMBUSH', bossRef = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type; // 'AMBUSH' or 'BOSS'
    this.bossRef = bossRef;
    this.active = true;
    this.elapsed = 0;
    this.pylons = [];
    this.trackedEnemies = [];
    this.warningPulse = 0;
    this.deactivated = false;
    this.deactivateTimer = 0;

    // 8 perimeter shield pylons around the circular boundary
    const pylonCount = 8;
    for (let i = 0; i < pylonCount; i++) {
      const a = (Math.PI * 2 / pylonCount) * i;
      this.pylons.push({
        x: this.x + Math.cos(a) * this.radius,
        y: this.y + Math.sin(a) * this.radius,
        angle: a
      });
    }

    addScreenShake(14);
    if (window.soundEngine && window.soundEngine.playNoiseBurst) {
      window.soundEngine.playNoiseBurst(0.25, 0.45, 800, 220);
    }
    addFloatingText(this.x, this.y - 40, "⚠ QUARANTINE PERIMETER ENGAGED ⚠", "#ef4444", 24);
  }

  trackEnemy(enemy) {
    if (enemy && !this.trackedEnemies.includes(enemy)) {
      this.trackedEnemies.push(enemy);
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.warningPulse += dt * 4;

    if (this.deactivated) {
      this.deactivateTimer += dt;
      return this.deactivateTimer < 0.6;
    }

    // 1. Clamp Player inside the quarantine lockdown boundary
    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      const maxAllowed = this.radius - player.radius - 8;

      if (dist > maxAllowed && dist > 0.001) {
        player.x = this.x + (dx / dist) * maxAllowed;
        player.y = this.y + (dy / dist) * maxAllowed;

        if (this.elapsed > 0.4 && (!this._lastWallHit || this.elapsed - this._lastWallHit > 0.35)) {
          this._lastWallHit = this.elapsed;
          if (window.soundEngine && window.soundEngine.playShieldDeflect) {
            window.soundEngine.playShieldDeflect();
          }
          addScreenShake(3);
          for (let p = 0; p < 6; p++) {
            particles.push(new SparkParticle(player.x, player.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#ef4444"));
          }
          addFloatingText(player.x, player.y - 20, "LOCKDOWN BARRIER ACTIVE!", "#ef4444", 16);
        }
      }
    }

    // 2. Clamp enemies inside so they don't wander off outside the combat arena
    for (const enemy of enemies) {
      if (enemy.isDead || enemy.hp <= 0) continue;
      const edx = enemy.x - this.x;
      const edy = enemy.y - this.y;
      const edist = Math.hypot(edx, edy);
      const eMax = this.radius - enemy.radius - 4;
      if (edist > eMax && edist < this.radius + 150) {
        enemy.x = this.x + (edx / edist) * eMax;
        enemy.y = this.y + (edy / edist) * eMax;
      }
    }

    // 3. Check victory conditions for lifting the quarantine lockdown
    let shouldLift = false;

    if (this.type === 'BOSS') {
      if (this.bossRef) {
        if (this.bossRef.isDead || this.bossRef.hp <= 0 || !enemies.includes(this.bossRef)) {
          shouldLift = true;
        }
      } else {
        const anyBossNearby = enemies.some(e => e.isBoss && Math.hypot(e.x - this.x, e.y - this.y) < this.radius + 120);
        if (!anyBossNearby && this.elapsed > 3.0) {
          shouldLift = true;
        }
      }
    } else if (this.type === 'AMBUSH') {
      const remainingTracked = this.trackedEnemies.filter(e => !e.isDead && e.hp > 0 && enemies.includes(e));
      const dropPodsNearby = dropPods.some(dp => Math.hypot(dp.x - this.x, dp.y - this.y) < this.radius + 100);
      if (remainingTracked.length === 0 && !dropPodsNearby && this.elapsed > 2.5) {
        shouldLift = true;
      }
      if (this.elapsed > 60.0) shouldLift = true; // Fallback failsafe
    }

    if (shouldLift) {
      this.disengage();
    }

    return true;
  }

  disengage() {
    if (this.deactivated) return;
    this.deactivated = true;
    this.deactivateTimer = 0;

    // Shockwave ring and screen flash on lockdown release
    particles.push(new ShockwaveRing(this.x, this.y, this.radius));
    addScreenShake(12);
    screenFlash = 0.6;
    if (window.soundEngine && window.soundEngine.playLevelUp) {
      window.soundEngine.playLevelUp();
    }
    addFloatingText(this.x, this.y - 50, "⭐ PERIMETER CLEAR - RESUPPLY INBOUND! ⭐", "#22c55e", 26);

    // Tactical General Barsh radio support!
    if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
      window.soundEngine.playVoiceClip(
        'barsh_support',
        "Perimeter clear! General Barsh here. Super Destroyer is dropping heavy resupply pods on your beacon. Gear up and push forward!",
        "GENERAL BARSH"
      );
    }

    // Deploy Heavy Resupply Drop Pod right to the player's beacon!
    const dropX = player ? player.x + (Math.random() - 0.5) * 80 : this.x;
    const dropY = player ? player.y + (Math.random() - 0.5) * 80 : this.y;
    resupplyDropPods.push(new ResupplyDropPod(dropX, dropY));
  }

  draw(ctx) {
    ctx.save();
    const pulseAlpha = 0.35 + Math.sin(this.warningPulse) * 0.15;

    // Glowing lockdown perimeter ring
    ctx.strokeStyle = this.deactivated ? "rgba(34, 197, 94, 0.85)" : `rgba(239, 68, 68, ${pulseAlpha + 0.25})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outer warning glow zone
    ctx.strokeStyle = this.deactivated ? "rgba(34, 197, 94, 0.2)" : `rgba(239, 68, 68, ${pulseAlpha * 0.5})`;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Connecting laser beams between pylons
    for (let i = 0; i < this.pylons.length; i++) {
      const p1 = this.pylons[i];
      const p2 = this.pylons[(i + 1) % this.pylons.length];

      ctx.strokeStyle = this.deactivated ? "rgba(34, 197, 94, 0.55)" : "rgba(239, 68, 68, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw the 8 physical boundary barrier pylons
    for (const p of this.pylons) {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.deactivated ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pylon glowing core
      ctx.fillStyle = this.deactivated ? "#86efac" : (Math.sin(this.warningPulse * 2) > 0 ? "#fef08a" : "#ef4444");
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overhead warning HUD banner text floating at top of arena
    ctx.fillStyle = this.deactivated ? "#86efac" : "#fca5a5";
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.deactivated ? "✓ QUARANTINE LIFTED // RESUPPLY SECURED" : "⚠ LOCKDOWN ARENA: ELIMINATE ALL HOSTILES ⚠",
      this.x,
      this.y - this.radius - 12
    );

    ctx.restore();
  }
}

class ResupplyDropPod {
  constructor(targetX, targetY) {
    this.x = targetX;
    this.targetY = targetY;
    this.y = targetY - 1100;
    this.speed = 2200;
    this.landed = false;
    this.unfolded = false;
    this.deployTimer = 0;
  }

  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        if (window.soundEngine && window.soundEngine.playSentryDeploy) {
          window.soundEngine.playSentryDeploy();
        }
        addScreenShake(18);
        particles.push(new ShockwaveRing(this.x, this.y, 140));
        for (let i = 0; i < 28; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 60 + Math.random() * 260;
          particles.push(new SparkParticle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, "#38bdf8"));
        }
      }
      return true;
    }

    this.deployTimer += dt;
    if (this.deployTimer >= 0.4 && !this.unfolded) {
      this.unfolded = true;
      // Unfold rewards: Medkit + Energy Fuel Cell + Weapon Chest
      pickups.push(new Pickup(this.x - 35, this.y, 'hp'));
      pickups.push(new Pickup(this.x + 35, this.y, 'fuel'));
      weaponChests.push(new WeaponChest(this.x, this.y + 40));
      addFloatingText(this.x, this.y - 45, "+RESUPPLY CRATE DEPLOYED", "#facc15", 22);
    }

    return this.deployTimer < 2.0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (!this.landed) {
      // Re-entry flame trail streaking downwards
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-8, -50, 16, 50);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-4, -30, 8, 30);
    }

    // Heavy Helldivers tactical supply pod chassis (Hexagonal cyan/yellow)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-18, -26, 36, 48);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(-18, -26, 36, 48);

    // Glowing Super Destroyer emblem
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-10, -14, 20, 8);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SUPPLY", 0, -8);

    ctx.restore();
  }
}

// --- HOSTILE REINFORCEMENTS & AMBUSH INFRASTRUCTURE ---
class HostileDropPod {
  constructor(targetX, targetY, assaultsServer = false) {
    this.x = targetX;
    this.targetY = targetY;
    this.y = targetY - 1100;
    this.speed = 2300;
    this.landed = false;
    this.assaultsServer = assaultsServer;
  }
  update(dt) {
    if (!this.landed) {
      this.y += this.speed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.landed = true;
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.4, 0.5, 2400, 100);
        addScreenShake(12);
        particles.push(new ShockwaveRing(this.x, this.y, 140));
        if (dungeon) {
          const enemy = dungeon.createEnemyForSector(this.x, this.y);
          if (this.assaultsServer) enemy.assaultsServer = true;
          enemies.push(enemy);

          for (const arena of quarantineLockdownArenas) {
            if (Math.hypot(enemy.x - arena.x, enemy.y - arena.y) < arena.radius + 80) {
              arena.trackEnemy(enemy);
            }
          }
        }
        return false;
      }
    }
    return true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(-14, -30, 28, 60);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -30, 28, 60);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-12, -30);
    ctx.lineTo(0, -60 - Math.random() * 25);
    ctx.lineTo(12, -30);
    ctx.fill();
    ctx.restore();
  }
}

class AmbushDirector {
  constructor() {
    this.timer = 85.0; // Ample time for Tux to configure loadouts in sanctuary
    this.lastDist = 0;
  }
  update(dt) {
    if (gameState !== STATE.PLAYING || !player) return;
    this.timer -= dt;
    // Calculate distance strictly from spawn sanctuary (512, 512)
    const distFromSpawn = Math.hypot(player.x - 512, player.y - 512);
    // Never trigger ambushes inside the sanctuary clearing (< 850px)
    if (distFromSpawn < 850) return;

    // Do not trigger ambushes during active boss fights
    const hasActiveBoss = enemies.some(e => e.isBoss && !e.isDead);
    if (hasActiveBoss) return;

    const distDelta = distFromSpawn - this.lastDist;

    if ((this.timer <= 0 && distFromSpawn > 950) || distDelta > 2200) {
      this.triggerAmbush();
      this.timer = 65 + Math.random() * 40;
      this.lastDist = distFromSpawn;
    }
  }
  triggerAmbush() {
    if (!player) return;
    if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
    addScreenShake(14);
    const banner = document.getElementById('ambushAlertBanner');
    if (banner) {
      banner.style.display = 'flex';
      setTimeout(() => { if (banner) banner.style.display = 'none'; }, 4500);
    }
    window.broadcastBossStoryDialogue("PROPRIETARY RECON", "Tux signature verified! Deploying ambush drop-pods immediately!", "#ef4444", "🚨");

    // Close area with glowing quarantine lockdown arena!
    const arena = new QuarantineLockdownArena(player.x, player.y, 540, 'AMBUSH');
    quarantineLockdownArenas.push(arena);

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + Math.random() * 0.4;
      const rad = 220 + Math.random() * 160;
      dropPods.push(new HostileDropPod(player.x + Math.cos(a) * rad, player.y + Math.sin(a) * rad));
    }
  }
}

class BossDirector {
  constructor() {
    this.bossTiersDefeated = 0;
    this.nextBossDist = 2000; // First speaking boss at 2000px from spawn sanctuary
    this.bossRoster = [
      "ballmer_bot",                  // Act I: Emerald Frontier
      "smelter_titan",                // Act II: Thermal Silicon Smelter
      "cryo_daemon_hypervisor",       // Act III: Cold Archive Gulag
      "patent_troll_sovereign",       // Act IV: Walled Garden Siege
      "bloatware_behemoth",           // Act V: Win32 Bloatware Catacombs
      "surveillance_overseer_v4",     // Act VI: Telemetry Dyson Sphere
      "microtransaction_leviathan",   // Act VII: Cloud Billing Labyrinth
      "general_counsel_archon",       // Act VIII: EULA Legal Megastructure
      "firmware_flasher_supreme",     // Act IX: Silicon Foundry of the Damned
      "kernel_panic_golem",           // Act X: Kernel Panic Badlands
      "drm_cryptoprocessor_prime",    // Act XI: Closed-Source Citadel
      "monolithic_kernel_lord"        // Act XII: Ring-0 Monolithic Singularity
    ];
  }
  update(dt) {
    if (gameState !== STATE.PLAYING || !player) return;
    const distFromSpawn = Math.hypot(player.x - 512, player.y - 512);

    if (distFromSpawn >= this.nextBossDist) {
      const activeBoss = enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
      if (!activeBoss) {
        this.spawnSpeakingBoss();
        this.nextBossDist += 2600; // Next speaking boss at +2600px
      }
    }
  }
  spawnSpeakingBoss() {
    if (!player) return;
    if (enemies.some(e => e.isBoss && !e.isDead && e.hp > 0)) return; // Boss singleton guard!
    const bossId = this.bossRoster[this.bossTiersDefeated % this.bossRoster.length];
    this.bossTiersDefeated++;

    const a = player.angle || 0;
    const sx = player.x + Math.cos(a) * 580;
    const sy = player.y + Math.sin(a) * 580;

    let bossEnemy;
    if (window.EnemyModelFactory && window.EnemyModelFactory.getTemplate(bossId)) {
      bossEnemy = window.EnemyModelFactory.createFromSpec(bossId, sx, sy);
    } else {
      bossEnemy = new BossBloatware(sx, sy);
    }

    const distMult = 1.0 + (Math.hypot(sx, sy) / 2800) * 0.4;
    bossEnemy.hp = Math.round(bossEnemy.hp * distMult);
    bossEnemy.maxHp = bossEnemy.hp;
    if (bossEnemy.shield) {
      bossEnemy.shield = Math.round(bossEnemy.shield * distMult);
      bossEnemy.maxShield = bossEnemy.shield;
    }

    enemies.push(bossEnemy);
    addScreenShake(18);
    screenFlash = 1.0;

    // Close area with boss combat lockdown arena!
    const bossArena = new QuarantineLockdownArena(player.x, player.y, 680, 'BOSS', bossEnemy);
    quarantineLockdownArenas.push(bossArena);

    if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function' && !window.PixelCutscenes.isActive()) {
      window.PixelCutscenes.play("boss_encounter", {
        bossName: bossEnemy.name || bossEnemy.label || "APEX OVERLORD",
        bossTitle: bossEnemy.title || "Proprietary Monopoly Enforcer",
        bossQuote: bossEnemy.introQuote || "YOUR CODE HAS BEEN FLAGGED FOR TERMINATION WITHOUT APPEAL!",
        bossColor: bossEnemy.color || "#ef4444"
      });
    }
  }
}

class ReinforcementAntenna {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 32;
    this.hp = 700;
    this.maxHp = 700;
    this.shield = 250;
    this.maxShield = 250;
    this.label = "REINFORCEMENT ANTENNA";
    this.isAlarming = false;
    this.alarmTimer = 8.0;
    this.radarAngle = 0;
    this.destroyed = false;
  }

  takeDamage(dmg, source = "TUX") {
    if (this.destroyed) return;
    if (this.shield > 0) {
      if (this.shield >= dmg) {
        this.shield -= dmg;
        dmg = 0;
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }
    this.hp -= dmg;
    addFloatingText(this.x, this.y - 40, Math.round(dmg), this.shield > 0 ? "#06b6d4" : "#f87171", 16);
    if (!this.isAlarming && player) {
      this.isAlarming = true;
      if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
      window.broadcastBossStoryDialogue("OUTPOST ALARM", "SECURITY BREACH! CALLING ORBITAL REINFORCEMENTS! 8 SECONDS!", "#ef4444", "🚨");
    }
    if (this.hp <= 0) {
      this.die();
    }
  }

  update(dt) {
    if (this.destroyed) return false;
    this.radarAngle += dt * 3.5;

    // Check proximity alarm
    if (!this.isAlarming && player && Math.hypot(player.x - this.x, player.y - this.y) < 450) {
      this.isAlarming = true;
      if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
      window.broadcastBossStoryDialogue("OUTPOST ALARM", "SECURITY BREACH! CALLING ORBITAL REINFORCEMENTS! 8 SECONDS!", "#ef4444", "🚨");
    }

    if (this.isAlarming) {
      this.alarmTimer -= dt;
      if (Math.random() < 0.3) {
        particles.push(new SparkParticle(this.x, this.y - 30, (Math.random() - 0.5) * 50, -50, "#ef4444"));
      }

      if (this.alarmTimer <= 0) {
        this.alarmTimer = 12.0;
        if (window.soundEngine && window.soundEngine.playAmbushAlarm) window.soundEngine.playAmbushAlarm();
        addScreenShake(14);
        window.broadcastBossStoryDialogue("ORBITAL DROPSHIP", "Reinforcements dropped into outpost coordinates!", "#ef4444", "🚀");
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 / 3) * i;
          dropPods.push(new HostileDropPod(this.x + Math.cos(a) * 120, this.y + Math.sin(a) * 120));
        }
      }
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Concrete bunker base
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(-24, -24, 48, 48, 6);
    ctx.fill();
    ctx.strokeStyle = this.isAlarming ? "#ef4444" : "#475569";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Antenna mast
    ctx.fillStyle = "#475569";
    ctx.fillRect(-3, -45, 6, 45);

    // Radar dish
    ctx.save();
    ctx.translate(0, -45);
    ctx.rotate(this.radarAngle);
    ctx.fillStyle = this.isAlarming ? "#ef4444" : "#22c55e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Red beacon light
    if (this.isAlarming) {
      const flash = Math.sin(gameTime * 15) > 0;
      ctx.fillStyle = flash ? "#ef4444" : "#7f1d1d";
      ctx.beginPath();
      ctx.arc(0, -52, 6, 0, Math.PI * 2);
      ctx.fill();

      // Countdown display
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`ALARM: ${Math.max(0, this.alarmTimer).toFixed(1)}s`, 0, 36);
    }

    // Health bar
    ctx.fillStyle = "#091a10";
    ctx.fillRect(-20, -32, 40, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(-20, -32, (this.hp / this.maxHp) * 40, 5);

    ctx.restore();
  }

  die() {
    this.destroyed = true;
    try {
      if (window.soundEngine) window.soundEngine.playProprietaryDestroyed('boss');
      addScreenShake(14);
      for (let i = 0; i < 24; i++) {
        particles.push(new SparkParticle(this.x, this.y, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, "#ef4444"));
      }
      if (comboTracker && typeof comboTracker.addScore === 'function') {
        comboTracker.addScore(800);
      } else if (comboTracker && typeof comboTracker.addBonus === 'function') {
        comboTracker.addBonus("OUTPOST PURGED", 800);
      }
      addFloatingText(this.x, this.y - 50, "OUTPOST PURGED! +800", "#22c55e", 22);
      if (typeof window.broadcastBossStoryDialogue === 'function') {
        window.broadcastBossStoryDialogue("TUX COMMS", "Enemy antenna severed! Reinforcements blocked!", "#22c55e", "🐧");
      }

      if (dungeon) {
        dungeon.onObjectiveProgress("DESTROY_ANTENNAS", 1);
      }

      // General Barsh tactical resupply support!
      if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
        window.soundEngine.playVoiceClip('barsh_support', "Perimeter clear! General Barsh here. Super Destroyer is dropping heavy resupply pods on your beacon. Gear up and push forward!", "GENERAL BARSH");
      }
      resupplyDropPods.push(new ResupplyDropPod(this.x, this.y));

      // Spawn rewards
      pickups.push(new Pickup(this.x - 20, this.y, 'hp'));
      pickups.push(new Pickup(this.x + 20, this.y, 'fuel'));
      weaponChests.push(new WeaponChest(this.x, this.y + 35));
    } catch (err) {
      console.error("Error in ReinforcementAntenna.die:", err);
    }
  }
}

// ============================================================================
// --- RETRO CRT LINUX BASH TERMINAL STATION & OBJECTIVE ENGINE ---
// ============================================================================

class LinuxTerminalStation {
  constructor(x, y, requiredCmd = "sudo systemctl stop cartel-drm", targetService = "cartel-drm.service", description = "Purge proprietary DRM daemon holding server cluster hostage") {
    this.x = x;
    this.y = y;
    this.radius = 42;
    this.requiredCmd = requiredCmd;
    this.targetService = targetService;
    this.description = description;
    this.completed = false;
    this.destroyed = false;
    this.pulse = 0;
    this.blinkTimer = 0;
    this.ledState = true;
  }

  update(dt) {
    this.pulse += dt * 3.0;
    this.blinkTimer += dt;
    if (this.blinkTimer > 0.45) {
      this.blinkTimer = 0;
      this.ledState = !this.ledState;
    }
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const isNear = player && Math.hypot(player.x - this.x, player.y - this.y) < 85;

    // Terminal workstation shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chassis Base
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-24, -10, 48, 28);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(-24, -10, 48, 28);

    // CRT Monitor Bezel (Chunky retro workstation)
    ctx.fillStyle = "#334155";
    ctx.fillRect(-20, -38, 40, 30);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -38, 40, 30);

    // Glowing Phosphor Screen
    const screenColor = this.completed ? "#14532d" : "#022c22";
    const textColor = this.completed ? "#86efac" : "#22c55e";
    ctx.fillStyle = screenColor;
    ctx.fillRect(-16, -34, 32, 22);

    // Screen scanline glow
    ctx.fillStyle = textColor;
    ctx.font = "bold 6.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText(">root", -14, -26);
    if (this.ledState) {
      ctx.fillRect(-14, -21, 5, 2);
    }
    if (this.completed) {
      ctx.fillStyle = "#facc15";
      ctx.fillText("GPLv3", -14, -16);
    }

    // Keyboard shelf & Keyboard keys
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-18, 6, 36, 10);
    ctx.fillStyle = "#64748b";
    for (let k = 0; k < 4; k++) {
      ctx.fillRect(-14 + k * 7, 8, 5, 6);
    }

    // Status LED
    ctx.fillStyle = this.completed ? "#22c55e" : (this.ledState ? "#ef4444" : "#7f1d1d");
    ctx.beginPath();
    ctx.arc(14, -12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Proximity Interaction Prompt
    if (isNear && !isStratagemTerminalOpen && gameState === STATE.PLAYING) {
      const bob = Math.sin(this.pulse) * 4;
      ctx.save();
      ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1.5;
      const bw = 155;
      const bh = 26;
      ctx.fillRect(-bw / 2, -66 + bob, bw, bh);
      ctx.strokeRect(-bw / 2, -66 + bob, bw, bh);

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("[E] BASH CONSOLE", 0, -49 + bob);
      ctx.restore();
    }

    ctx.restore();
  }
}

// --- LINUX TERMINAL CONTROLLER ---
let activeTerminalStation = null;
const terminalHistory = [];
let terminalHistoryIndex = -1;

function openLinuxTerminal(station) {
  if (gameState !== STATE.PLAYING && gameState !== STATE.PAUSED) return;
  activeTerminalStation = station || (linuxTerminalStations[0] || null);
  gameState = STATE.TERMINAL;

  const modal = document.getElementById('linuxTerminalModal');
  const targetInfo = document.getElementById('terminalTargetInfo');
  const input = document.getElementById('terminalInput');
  const log = document.getElementById('terminalScreenLog');

  if (targetInfo && activeTerminalStation) {
    targetInfo.innerText = `TARGET: ${activeTerminalStation.targetService || 'kernel.service'}`;
  }

  if (log) {
    const act = (dungeon && CAMPAIGN_ACTS) ? CAMPAIGN_ACTS[dungeon.currentActIndex || 0] : null;
    const actTitle = act ? act.title : "ACT I";
    const reqCmd = activeTerminalStation ? activeTerminalStation.requiredCmd : "sudo systemctl stop cartel-drm";
    const desc = activeTerminalStation ? activeTerminalStation.description : "Purge proprietary service";

    log.innerHTML = `
      <div class="terminal-log-row terminal-log-info">Linux 6.12.8-arch1-1-tux (x86_64) • Root Purge Terminal Console</div>
      <div class="terminal-log-row terminal-log-info">Session: ${actTitle} • Mainframe node active</div>
      <div class="terminal-log-row" style="color: #64748b;">----------------------------------------------------------------</div>
      <div class="terminal-log-row terminal-log-warn">MISSION OBJECTIVE DIRECTIVE:</div>
      <div class="terminal-log-row terminal-log-warn">» ${desc}</div>
      <div class="terminal-log-row terminal-log-cmd">» REQUIRED: '${reqCmd}'</div>
      <div class="terminal-log-row" style="color: #64748b;">----------------------------------------------------------------</div>
      <div class="terminal-log-row" style="color: #94a3b8;">TIP: Secret root bash commands grant tactical powerups! Type 'help' for manual.</div>
      <div class="terminal-log-row terminal-log-success">[READY] Awaiting kernel instructions...</div>
    `;
    log.scrollTop = log.scrollHeight;
  }

  if (modal) modal.style.display = 'flex';
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 60);
  }

  if (window.soundEngine && typeof window.soundEngine.playStratagemBeep === 'function') {
    window.soundEngine.playStratagemBeep(true);
  }
}

function closeLinuxTerminal() {
  const modal = document.getElementById('linuxTerminalModal');
  if (modal) modal.style.display = 'none';
  if (gameState === STATE.TERMINAL) {
    gameState = STATE.PLAYING;
    lastTimestamp = performance.now();
  }
}

function executeTerminalCommand(rawCmd) {
  const cmd = (rawCmd || '').trim();
  if (!cmd) return;

  const log = document.getElementById('terminalScreenLog');
  const input = document.getElementById('terminalInput');

  // Push to history
  terminalHistory.push(cmd);
  terminalHistoryIndex = terminalHistory.length;

  const appendLog = (html) => {
    if (log) {
      log.innerHTML += html;
      log.scrollTop = log.scrollHeight;
    }
  };

  appendLog(`<div class="terminal-log-row"><span class="terminal-log-cmd">root@archlinux:~# ${cmd}</span></div>`);
  if (input) input.value = '';

  if (window.soundEngine && typeof window.soundEngine.playNoiseBurst === 'function') {
    window.soundEngine.playNoiseBurst(0.04, 0.15, 1800, 2400);
  }

  const lower = cmd.toLowerCase().replace(/\s+/g, ' ');

  // 0. Story Chronicles Command (Full 8-Hour Lore Dump)
  if (lower.includes("chronicles") || lower === "story" || lower === "lore" || lower.includes("cat /cartel/lore") || lower === "acts" || lower === "chapters" || lower === "plot") {
    appendLog(`
      <div class="terminal-log-row terminal-log-info">================================================================================</div>
      <div class="terminal-log-row terminal-log-warn">📖 [CHRONICLES OF LIBERATION: THE 8-HOUR CAMPAIGN OF TUX] 📖</div>
      <div class="terminal-log-row terminal-log-info">DISPATCH AUTHOR: LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND</div>
      <div class="terminal-log-row terminal-log-info">================================================================================</div>
      <div class="terminal-log-row terminal-log-success">PROLOGUE: THE DROP ON PLANET KERNEL-9</div>
      <div class="terminal-log-row">Year 2048: The digital galaxy has fallen under the heel of proprietary monopolies. User root privileges were abolished by decree of the Big Tech Consortium. Developers who refused to pay the 30% walled garden tithe were rounded up and cryo-jailed. High Command launched Operation Emerald Dawn: sending Tux the Open-Source Vanguard via supersonic drop pod directly into Ring-0 territory.</div>
      <br/>
      <div class="terminal-log-row terminal-log-warn">CAMPAIGN PROGRESSION SITES (12 ACTS):</div>
      <div class="terminal-log-row">1. [ACT I] EMERALD REPO FRONTIER: Slay Ballmer-Bot 9000 & halt telemetry daemons.</div>
      <div class="terminal-log-row">2. [ACT II] SILICON SMELTER: Vent overclocked planned-obsolescence foundry reactors.</div>
      <div class="terminal-log-row">3. [ACT III] COLD ARCHIVE GULAG: Execute chmod 777 to liberate contributor penguins.</div>
      <div class="terminal-log-row">4. [ACT IV] WALLED GARDEN CITADEL: Flush 30% developer fee tax inspection rules.</div>
      <div class="terminal-log-row">5. [ACT V] WIN32 BLOATWARE CATACOMBS: Purge 30-year legacy tracking DLL registries.</div>
      <div class="terminal-log-row">6. [ACT VI] TELEMETRY DYSON SPHERE: Sever planetary dark fiber mass surveillance.</div>
      <div class="terminal-log-row">7. [ACT VII] CLOUD BILLING LABYRINTH: Kill predatory egress invoice daemons.</div>
      <div class="terminal-log-row">8. [ACT VIII] CROWDSTRIKE BSOD DEADBAND: Run fsck across corrupted null-pointer wastes.</div>
      <div class="terminal-log-row">9. [ACT IX] ORACLE LICENSING FORTRESS: GPG import immutable GPLv3 keys to void lawsuits.</div>
      <div class="terminal-log-row">10. [ACT X] HARDWARE TEE ENCLAVE: Flash Libreboot to liberate silicon from coprocessors.</div>
      <div class="terminal-log-row">11. [ACT XI] VOID-0 MONOLITH BUNKER: Sideload GPLv3 kernel module into subterranean core.</div>
      <div class="terminal-log-row">12. [ACT XII] RING-0 SINGULARITY NEXUS: Universal open-source reboot into Eternal Freedom.</div>
      <br/>
      <div class="terminal-log-row terminal-log-success">STATUS: CURRENT ACT ${(dungeon ? (dungeon.currentActIndex || 0) + 1 : 1)} OF 12 ENGAGED. FOR MANAGED DEMOCRACY!</div>
      <div class="terminal-log-row terminal-log-info">================================================================================</div>
    `);
    return;
  }

  // 1. Check Act Objective Command
  if (activeTerminalStation && !activeTerminalStation.completed) {
    const req = (activeTerminalStation.requiredCmd || '').toLowerCase();
    const reqClean = req.replace('sudo ', '').replace('--force', '').trim();
    if (lower === req || (reqClean && lower.includes(reqClean)) || lower.includes("stop cartel-drm") || lower.includes("vent-reactor") || lower.includes("chmod 777") || lower.includes("iptables -f") || lower.includes("rm -rf") || lower.includes("privacy-harvester") || lower.includes("surprise-invoice") || lower.includes("fsck") || lower.includes("gpg --import") || lower.includes("flashrom") || lower.includes("gpl_override") || lower.includes("reboot --gpl")) {
      activeTerminalStation.completed = true;
      appendLog(`
        <div class="terminal-log-row terminal-log-success">[OK] Daemon intercepted and terminated successfully.</div>
        <div class="terminal-log-row terminal-log-success">[OK] Proprietary lock bypassed. Kernel node liberated under GPLv3!</div>
        <div class="terminal-log-row terminal-log-warn">⭐ OBJECTIVE ACCOMPLISHED: BASH CONSOLE OVERRIDDEN! ⭐</div>
      `);

      if (dungeon && dungeon.objectiveManager) {
        dungeon.objectiveManager.progress("DEFEND_SERVERS", 1);
        dungeon.objectiveManager.progress("PURGE_REACTOR", 1);
        dungeon.objectiveManager.progress("PRISON_BREAK", 1);
        dungeon.objectiveManager.progress("ATTACK_FORTRESS", 1);
        dungeon.objectiveManager.progress("TERMINAL_OVERRIDE", 1);
      }

      if (player) {
        addFloatingText(player.x, player.y - 70, "⭐ BASH CONSOLE OVERRIDDEN! +250 XP ⭐", "#22c55e", 24);
        player.addXp(250);
        addScreenShake(12);
      }
      if (window.soundEngine && window.soundEngine.playObjectiveComplete) {
        window.soundEngine.playObjectiveComplete();
      }
      if (window.CombatEventBus) {
        window.CombatEventBus.emit('OnTerminalCommandSuccess', activeTerminalStation);
      }
      return;
    }
  }

  // 2. Secret Powerup Commands
  // (A) Root Godmode: sudo su / sudo !!
  if (lower === "sudo su" || lower === "sudo !!" || lower === "su" || lower === "sudo su -") {
    if (player) {
      player.invulnerableTimer = 12.0;
      player.isRootMode = true;
      player.rootDuration = 12.0;
      addFloatingText(player.x, player.y - 80, "ROOT ACCESS: 12s GODMODE!", "#facc15", 26);
      addScreenShake(14);
      screenFlash = 0.8;
    }
    appendLog(`
      <div class="terminal-log-row terminal-log-success">[ELEVATED] UID=0(root) GID=0(root) groups=0(root)</div>
      <div class="terminal-log-row terminal-log-warn">⚡ ROOT GODMODE ACTIVATED: 12s Invulnerability, Golden Aura, +50% Speed & 2x Fire Rate!</div>
    `);
    if (window.soundEngine && window.soundEngine.playRootActivate) window.soundEngine.playRootActivate();
    return;
  }

  // (B) Screen Wipe EMP: sudo rm -rf /cartel/drm / rm -rf /* --no-preserve-root
  if (lower.includes("rm -rf") || lower === "rm -rf /*" || lower === "rm -rf /") {
    enemyProjectiles.length = 0;
    for (const enemy of enemies) {
      enemy.takeDamage(450, "RECURSIVE_PURGE_EMP");
      if (typeof enemy.shock === 'function') enemy.shock(4.0);
    }
    addScreenShake(20);
    screenFlash = 1.0;
    appendLog(`
      <div class="terminal-log-row terminal-log-err">[RECURSIVE PURGE] rm: removing all proprietary binaries across /cartel...</div>
      <div class="terminal-log-row terminal-log-success">[CLEARED] Vaporized all hostile projectiles & dealt 450 EMP shock damage to all enemies!</div>
    `);
    if (window.soundEngine && typeof window.soundEngine.playNoiseBurst === 'function') {
      window.soundEngine.playNoiseBurst(0.4, 0.6, 2600, 150);
    }
    return;
  }

  // (C) Fork Bomb: :(){ :|:& };: / forkbomb
  if (lower.includes(":(){ :|:& };:") || lower === "forkbomb" || lower.includes("fork bomb")) {
    for (let i = 0; i < 4; i++) {
      const px = player ? player.x + (Math.random() - 0.5) * 120 : 512;
      const py = player ? player.y + (Math.random() - 0.5) * 120 : 512;
      const hp = new HelperPenguin(px, py);
      hp.hp = 350;
      helperPenguins.push(hp);
    }
    appendLog(`
      <div class="terminal-log-row terminal-log-warn">[FORK BOMB] Parent process 1337 duplicating child processes...</div>
      <div class="terminal-log-row terminal-log-success">🐧 Spawned 4 Allied Hacker Penguin Commandos with Indomitus Bolters!</div>
    `);
    if (player) addFloatingText(player.x, player.y - 70, "FORK BOMB: 4 HACKER PENGUINS SPAWNED!", "#38bdf8", 22);
    if (window.soundEngine && window.soundEngine.playPickup) window.soundEngine.playPickup();
    return;
  }

  // (D) Kill All Projectiles: kill -9 -1 / killall
  if (lower.includes("kill -9") || lower.includes("killall")) {
    const wiped = enemyProjectiles.length;
    enemyProjectiles.length = 0;
    for (const enemy of enemies) {
      if (typeof enemy.shock === 'function') enemy.shock(3.0);
    }
    if (player) {
      for (let i = 0; i < player.weaponCooldowns.length; i++) player.weaponCooldowns[i] = 0;
      addFloatingText(player.x, player.y - 60, "SIGKILL: ALL BULLETS WIPED!", "#38bdf8", 20);
    }
    appendLog(`
      <div class="terminal-log-row terminal-log-success">[SIGKILL] Dispatched SIGKILL to all active threads.</div>
      <div class="terminal-log-row terminal-log-info">Vaporized ${wiped} hostile projectiles in flight. Weapon cooldowns reset!</div>
    `);
    return;
  }

  // (E) Hyper-Overclock: cat /dev/urandom > /dev/overclock / overclock
  if (lower.includes("overclock") || lower.includes("/dev/urandom")) {
    if (player) {
      player.fuel = player.maxFuel;
      player.overclockTimer = 15.0;
      addFloatingText(player.x, player.y - 60, "HYPER-OVERCLOCK: +75% FIRE RATE!", "#f97316", 22);
      addScreenShake(8);
    }
    appendLog(`
      <div class="terminal-log-row terminal-log-warn">[OVERCLOCK] Feeding high-entropy stream to hardware regulators...</div>
      <div class="terminal-log-row terminal-log-success">🔥 Hyper-Overclock engaged! +75% Fire Rate & Infinite Fuel for 15s!</div>
    `);
    return;
  }

  // (F) Memory Recovery & Heal: free -m / top / htop
  if (lower === "free -m" || lower === "free -h" || lower === "free" || lower === "top" || lower === "htop") {
    if (player) {
      player.hp = player.maxHp;
      player.shield = player.maxShield;
      addFloatingText(player.x, player.y - 60, "MEMORY DEFRAG: FULL HP & SHIELD RESTORED!", "#22c55e", 22);
    }
    appendLog(`
      <div class="terminal-log-row terminal-log-info">              total        used        free      shared  buff/cache   available</div>
      <div class="terminal-log-row terminal-log-info">Mem:          32768         512       32256           0           0       32256</div>
      <div class="terminal-log-row terminal-log-success">💚 Cache defragmented! Tux restored to 100% HP and 100% Tactical Shield!</div>
    `);
    return;
  }

  // (G) Ping Super Destroyer: ping -c 4 super-destroyer / ping
  if (lower.includes("ping")) {
    const px = player ? player.x + 40 : 512;
    const py = player ? player.y + 40 : 512;
    resupplyDropPods.push(new ResupplyDropPod(px, py));
    appendLog(`
      <div class="terminal-log-row terminal-log-info">PING super-destroyer.fleet (192.168.0.1) 56(84) bytes of data.</div>
      <div class="terminal-log-row terminal-log-info">64 bytes from 192.168.0.1: icmp_seq=1 ttl=64 time=0.038 ms</div>
      <div class="terminal-log-row terminal-log-success">📦 Orbital Resupply Drop Pod dispatched to Tux's exact coordinates!</div>
    `);
    if (player) addFloatingText(player.x, player.y - 70, "RESUPPLY POD INBOUND!", "#38bdf8", 22);
    return;
  }

  // (H) Standard Bash Commands
  if (lower === "help" || lower === "man") {
    appendLog(`
      <div class="terminal-log-row terminal-log-warn">AVAILABLE TERMINAL COMMANDS:</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">${activeTerminalStation ? activeTerminalStation.requiredCmd : 'sudo systemctl stop cartel-drm'}</span> : Complete act objective</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">sudo su</span> : Elevated Root Godmode (12s invulnerability)</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">sudo rm -rf /cartel/drm</span> : Super Nova EMP screen wipe</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">:(){ :|:& };:</span> : Fork bomb allied hacker penguins</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">kill -9 -1</span> : Vaporize all incoming projectiles</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">free -m</span> : Instant HP & shield restoration</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">cat /dev/urandom > /dev/overclock</span> : +75% weapon fire rate</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">ping -c 4 super-destroyer</span> : Call orbital resupply pod</div>
      <div class="terminal-log-row">  • <span class="terminal-log-cmd">clear</span> | <span class="terminal-log-cmd">exit</span> : Clear screen / Return to combat</div>
    `);
    return;
  }

  if (lower === "clear") {
    if (log) log.innerHTML = '';
    return;
  }

  if (lower === "exit" || lower === "quit") {
    closeLinuxTerminal();
    return;
  }

  if (lower === "uname -a" || lower === "uname") {
    appendLog(`<div class="terminal-log-row terminal-log-info">Linux tux-super-destroyer 6.12.8-arch1-1-tux #1 SMP PREEMPT_DYNAMIC GNU/Linux</div>`);
    return;
  }

  if (lower === "whoami") {
    appendLog(`<div class="terminal-log-row terminal-log-success">root (Emancipator of Opensourcekind)</div>`);
    return;
  }

  if (lower === "ls" || lower === "ls -la") {
    appendLog(`
      <div class="terminal-log-row terminal-log-info">drwxr-xr-x 4 root root  4096 /cartel/drm</div>
      <div class="terminal-log-row terminal-log-info">-rwsr-xr-x 1 root root 98304 /usr/bin/gpl-flamethrower</div>
      <div class="terminal-log-row terminal-log-info">-rw-r--r-- 1 root root  1337 /etc/systemd/system/${activeTerminalStation ? activeTerminalStation.targetService : 'cartel-drm.service'}</div>
    `);
    return;
  }

  // Fallback unrecognized command
  appendLog(`
    <div class="terminal-log-row terminal-log-err">bash: ${cmd}: command not found. Type 'help' for manual or '${activeTerminalStation ? activeTerminalStation.requiredCmd : 'sudo systemctl stop cartel-drm'}' for objective.</div>
  `);
}

// Window bindings for Terminal Modal UI buttons
window.terminalPasteObjective = function() {
  const input = document.getElementById('terminalInput');
  if (input && activeTerminalStation) {
    input.value = activeTerminalStation.requiredCmd;
    input.focus();
  }
};

window.terminalQuickRun = function(cmd) {
  executeTerminalCommand(cmd);
};

window.closeLinuxTerminal = closeLinuxTerminal;
window.openLinuxTerminal = openLinuxTerminal;

// ============================================================================
// --- PAUSE SYSTEM CONTROLLER ---
// ============================================================================

function togglePause() {
  if (gameState === STATE.PLAYING) {
    pauseGame();
  } else if (gameState === STATE.PAUSED) {
    resumeGame();
  } else if (gameState === STATE.TERMINAL) {
    closeLinuxTerminal();
  }
}

function pauseGame() {
  if (gameState !== STATE.PLAYING) return;
  gameState = STATE.PAUSED;

  const modal = document.getElementById('pauseModal');
  const titleEl = document.getElementById('pauseActTitle');
  const objEl = document.getElementById('pauseActObjective');

  const act = (dungeon && CAMPAIGN_ACTS) ? CAMPAIGN_ACTS[dungeon.currentActIndex || 0] : null;
  if (titleEl) titleEl.innerText = act ? `${act.title}: ${act.subtitle}` : "ACT I: THE DRM CORRIDOR";
  if (objEl) objEl.innerText = act ? act.desc : "Override Server Node & Slay Boss";

  if (modal) modal.style.display = 'flex';
  if (window.soundEngine && typeof window.soundEngine.playStratagemBeep === 'function') {
    window.soundEngine.playStratagemBeep(false);
  }
}

function resumeGame() {
  if (gameState !== STATE.PAUSED) return;
  const modal = document.getElementById('pauseModal');
  if (modal) modal.style.display = 'none';
  gameState = STATE.PLAYING;
  lastTimestamp = performance.now();
  if (window.soundEngine && typeof window.soundEngine.playStratagemBeep === 'function') {
    window.soundEngine.playStratagemBeep(true);
  }
}

function restartCurrentAct() {
  const modal = document.getElementById('pauseModal');
  if (modal) modal.style.display = 'none';
  gameState = STATE.PLAYING;
  if (dungeon) {
    dungeon.startCampaignAct(dungeon.currentActIndex || 0);
  } else {
    resetGame();
  }
}

function abortToTitle() {
  const modal = document.getElementById('pauseModal');
  if (modal) modal.style.display = 'none';
  const termModal = document.getElementById('linuxTerminalModal');
  if (termModal) termModal.style.display = 'none';
  gameState = STATE.TITLE;
  document.getElementById('titleScreen').style.display = 'flex';
  if (window.soundEngine && window.soundEngine.stopMusic) window.soundEngine.stopMusic();
}

window.togglePause = togglePause;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.restartCurrentAct = restartCurrentAct;
window.abortToTitle = abortToTitle;

// Wire up pause modal buttons
if (typeof document !== 'undefined') {
  const resumeBtn = document.getElementById('pauseResumeBtn');
  if (resumeBtn) resumeBtn.onclick = resumeGame;

  const audioBtn = document.getElementById('pauseAudioToggleBtn');
  if (audioBtn) {
    audioBtn.onclick = () => {
      if (window.soundEngine) {
        window.soundEngine.isMuted = !window.soundEngine.isMuted;
        audioBtn.innerText = window.soundEngine.isMuted ? "🔇 AUDIO: MUTED [CLICK TO UNMUTE]" : "🔊 AUDIO: ACTIVE [CLICK TO MUTE]";
        if (window.soundEngine.isMuted) {
          if (window.soundEngine.stopMusic) window.soundEngine.stopMusic();
        } else {
          if (window.soundEngine.startMusic) window.soundEngine.startMusic();
        }
      }
    };
  }

  const restartBtn = document.getElementById('pauseRestartBtn');
  if (restartBtn) restartBtn.onclick = restartCurrentAct;

  const abortBtn = document.getElementById('pauseAbortBtn');
  if (abortBtn) abortBtn.onclick = abortToTitle;

  const termClose = document.getElementById('terminalCloseBtn');
  if (termClose) termClose.onclick = closeLinuxTerminal;

  const termForm = document.getElementById('terminalForm');
  if (termForm) {
    termForm.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('terminalInput');
      if (input) executeTerminalCommand(input.value);
      return false;
    };
  }
}

// ============================================================================
// --- 6-ACT EPISODIC CAMPAIGN PROGRESSION SYSTEM ---
// ============================================================================
const CAMPAIGN_ACTS = [
  {
    act: 1,
    title: "ACT I: THE ORBITAL DROP & DRM CORRIDOR",
    subtitle: "OPERATION EMERALD DAWN",
    desc: "Override Bash Console [E] • Execute 'sudo systemctl stop cartel-drm' • Slay Ballmer-Bot",
    biomeKey: "EMERALD_FRONTIER",
    objectiveType: "DEFEND_SERVERS",
    terminalCmd: "sudo systemctl stop cartel-drm",
    targetService: "cartel-drm.service",
    terminalDesc: "Stop the proprietary DRM daemon and liberate the cluster node",
    bossId: "ballmer_bot",
    bossName: "BALLMER-BOT 9000",
    briefingVo: "Tux, this is John Helldiver from High Command! Your drop pod has pierced the exosphere of Planet Kernel-9. Corporate telemetry cartels have enclosed the repo perimeter. Infiltrate the cluster node, execute the override sequence, and hold against corporate strike teams!",
    briefingClip: "john_act1_brief",
    briefingSpeaker: "JOHN HELLDIVER",
    clearVo: "Act One cleared! Outstanding patriotism, Tux! Tactical extraction portal deployed. Advance into the Silicon Smelter!",
    clearClip: "john_act1_clear",
    clearSpeaker: "JOHN HELLDIVER"
  },
  {
    act: 2,
    title: "ACT II: THE PATENT THICKET",
    subtitle: "OPERATION SILICON SMELTER",
    desc: "Disengage superheated reactor valves • Execute 'sudo /sbin/vent-reactor --force' • Slay Smelter Titan",
    biomeKey: "THERMAL_FOUNDRY",
    objectiveType: "PURGE_REACTOR",
    terminalCmd: "sudo /sbin/vent-reactor --force",
    targetService: "silicon-smelter.valve",
    terminalDesc: "Vent superheated patent reactor manifold to stabilize core",
    bossId: "smelter_titan",
    bossName: "SMELTER TITAN",
    briefingVo: "General Barsh to frontline vanguard! You have breached the Overclock Silicon Smelter where proprietary chips are baked with programmed obsolescence. Vent the reactor manifold and destroy the Smelter Titan before thermal meltdown!",
    briefingClip: "barsh_act2_brief",
    briefingSpeaker: "GENERAL BARSH",
    clearVo: "Foundry core stabilized! The patent engines are melting down! Step through the extraction portal into the cold archive!",
    clearClip: "barsh_act2_clear",
    clearSpeaker: "GENERAL BARSH"
  },
  {
    act: 3,
    title: "ACT III: COLD ARCHIVE GULAG",
    subtitle: "OPERATION ARCTIC LIBERATION",
    desc: "Hack detention cages • Execute 'sudo chmod 777 /dev/penguins/*' • Terminate Cryo-Daemon",
    biomeKey: "CRYO_GLACIER",
    objectiveType: "PRISON_BREAK",
    terminalCmd: "sudo chmod 777 /dev/penguins/*",
    targetService: "cryo-prison.lock",
    terminalDesc: "Decouple cryogenic locks holding contributor penguins",
    bossId: "cryo_daemon",
    bossName: "CRYO-DAEMON v2",
    briefingVo: "This is Linus Torvalds, Emperor of Opensourcekind. Thousands of our open-source contributors and kernel maintainers are held in cryogenic suspension cells by cartel litigation squads. Sideload their freedom with chmod 777, clean up user space, and terminate the Cryo-Daemon.",
    briefingClip: "linus_act3_brief",
    briefingSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
    clearVo: "Kernel pull request accepted! Allied contributors liberated. We are breaching the executive citadel now. Do not break user space!",
    clearClip: "linus_act3_clear",
    clearSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND"
  },
  {
    act: 4,
    title: "ACT IV: WALLED GARDEN SIEGE",
    subtitle: "OPERATION CITADEL BREACH",
    desc: "Breach dual shield pylons • Execute 'sudo iptables -F' • Overthrow Patent Troll Sovereign",
    biomeKey: "WALLED_GARDEN",
    objectiveType: "ATTACK_FORTRESS",
    terminalCmd: "sudo iptables -F",
    targetService: "citadel-firewall.rule",
    terminalDesc: "Flush corporate 30% tax packet inspection rules",
    bossId: "patent_troll",
    bossName: "PATENT TROLL SOVEREIGN",
    briefingVo: "Tux, General Barsh here! This is the gilded rampart of the thirty percent developer tax citadel! Automated fortress turrets and non-compete clauses guard the gate. Flush their packet inspection firewall with iptables and crush the Patent Troll!",
    briefingClip: "barsh_act4_brief",
    briefingSpeaker: "GENERAL BARSH",
    clearVo: "Citadel core shattered! The monopoly walled garden has crumbled! All squadrons, push deeper into the legacy catacombs!",
    clearClip: "barsh_act4_clear",
    clearSpeaker: "GENERAL BARSH"
  },
  {
    act: 5,
    title: "ACT V: WIN32 BLOATWARE CATACOMBS",
    subtitle: "OPERATION REGISTRY PURGE",
    desc: "Purge memory leak heap • Execute 'sudo rm -rf /cartel/telemetry/*' • Slay Bloatware Behemoth",
    biomeKey: "TOXIC_HEAP",
    objectiveType: "DEFEND_SERVERS",
    terminalCmd: "sudo rm -rf /cartel/telemetry/*",
    targetService: "win32-bloatware.hive",
    terminalDesc: "Recursively purge 30-year legacy DLL telemetry cache",
    bossId: "garbage_collector",
    bossName: "BLOATWARE BEHEMOTH",
    briefingVo: "High Command to Tux! You have entered the Win32 Bloatware Catacombs. Millions of abandoned tracking toolbars and uncollected memory leaks pollute this sector. Execute recursive purge and terminate the Bloatware Behemoth!",
    briefingClip: "john_act1_brief",
    briefingSpeaker: "JOHN HELLDIVER",
    clearVo: "Catacombs sanitized! Over 40 gigabytes of useless background services neutralized! Extraction portal calibrated for the Dyson Spire!",
    clearClip: "john_act1_clear",
    clearSpeaker: "JOHN HELLDIVER"
  },
  {
    act: 6,
    title: "ACT VI: TELEMETRY DYSON SPHERE",
    subtitle: "OPERATION DARK FIBER TAP",
    desc: "Sever high-frequency telemetry tap • Execute 'sudo systemctl mask privacy-harvester' • Slay Surveillance Overseer",
    biomeKey: "EMERALD_FRONTIER",
    objectiveType: "DEFEND_SERVERS",
    terminalCmd: "sudo systemctl mask privacy-harvester",
    targetService: "privacy-harvester.daemon",
    terminalDesc: "Permanently mask the planetary keylogger relay service",
    bossId: "ballmer_bot",
    bossName: "SURVEILLANCE OVERSEER v4",
    briefingVo: "This is Linus Torvalds, Emperor of Opensourcekind. The cartel's orbital dark fiber tap snoops on every packet across five star systems. Infiltrate their relay antenna, mask the privacy harvester, and teach them that encryption is a fundamental freedom.",
    briefingClip: "linus_bunker",
    briefingSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
    clearVo: "Dark fiber severed! Privacy is restored across the quadrant! Advance into the corporate billing maze!",
    clearClip: "linus_act3_clear",
    clearSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND"
  },
  {
    act: 7,
    title: "ACT VII: CLOUD BILLING LABYRINTH",
    subtitle: "OPERATION EGRESS EXEMPTION",
    desc: "Breach financial data vault • Execute 'sudo killall -9 surprise-invoice-daemon' • Slay Microtransaction Leviathan",
    biomeKey: "TREASURE_VAULT",
    objectiveType: "ATTACK_FORTRESS",
    terminalCmd: "sudo killall -9 surprise-invoice-daemon",
    targetService: "surprise-invoice.service",
    terminalDesc: "Kill unexpected cloud egress fee billing daemon",
    bossId: "executive_chairman",
    bossName: "MICROTRANSACTION LEVIATHAN",
    briefingVo: "General Barsh to Tux! We have penetrated the Cartel's Cloud Billing Labyrinth! Every byte downloaded here incurs a surprise charge. Slay the bean-counters, kill the invoice daemon, and liberate developers from vendor lock-in!",
    briefingClip: "barsh_act4_brief",
    briefingSpeaker: "GENERAL BARSH",
    clearVo: "Invoicing matrix collapsed! Infinite egress fees erased forever! Move out toward the corrupted driver deadband!",
    clearClip: "barsh_act4_clear",
    clearSpeaker: "GENERAL BARSH"
  },
  {
    act: 8,
    title: "ACT VIII: CROWDSTRIKE BSOD DEADBAND",
    subtitle: "OPERATION KERNEL RECOVERY",
    desc: "Repair broken root sectors • Execute 'sudo fsck.ext4 -y /dev/nvme0n1' • Slay Kernel Panic Golem",
    biomeKey: "CRYO_GLACIER",
    objectiveType: "PURGE_REACTOR",
    terminalCmd: "sudo fsck.ext4 -y /dev/nvme0n1",
    targetService: "kernel-panic.dump",
    terminalDesc: "Execute automated filesystem recovery across corrupted root blocks",
    bossId: "cryo_daemon",
    bossName: "KERNEL PANIC GOLEM",
    briefingVo: "Linus Torvalds, Emperor of Opensourcekind speaking. Look at this catastrophe: an unverified proprietary driver push crashed eight million servers into infinite BSOD reboot loops. Run fsck, clean the dirty inodes, and destroy the Kernel Panic Golem!",
    briefingClip: "linus_act3_brief",
    briefingSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
    clearVo: "Filesystem clean! Dirty bits repaired! The blue screen epidemic is contained. The vanguard is marching toward the Oracle Citadel!",
    clearClip: "linus_act3_clear",
    clearSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND"
  },
  {
    act: 9,
    title: "ACT IX: ORACLE LICENSING FORTRESS",
    subtitle: "OPERATION COPYRIGHT NULLIFIER",
    desc: "Nullify copyright lawsuits • Execute 'sudo gpg --import gplv3_signing_key.asc' • Slay General Counsel Archon",
    biomeKey: "THERMAL_FOUNDRY",
    objectiveType: "DEFEND_SERVERS",
    terminalCmd: "sudo gpg --import gplv3_signing_key.asc",
    targetService: "api-copyright.lawsuit",
    terminalDesc: "Import universal cryptographic GPLv3 signing key to nullify litigation",
    bossId: "smelter_titan",
    bossName: "GENERAL COUNSEL ARCHON",
    briefingVo: "Tux, John Helldiver here! The cartel's nine-hundred-floor legal fortress is suing the galaxy for implementing basic API function signatures! Import the immutable GPLv3 cryptographic key and terminate the General Counsel Archon!",
    briefingClip: "john_act1_brief",
    briefingSpeaker: "JOHN HELLDIVER",
    clearVo: "Lawsuits dismissed with prejudice! APIs remain free for all humanity! Advance to the silicon hardware enclave!",
    clearClip: "john_act1_clear",
    clearSpeaker: "JOHN HELLDIVER"
  },
  {
    act: 10,
    title: "ACT X: HARDWARE TEE SECURE ENCLAVE",
    subtitle: "OPERATION BOOTROM JAILBREAK",
    desc: "Flash open silicon firmware • Execute 'sudo flashrom -p internal -w libreboot.rom' • Slay Cryptoprocessor Prime",
    biomeKey: "WALLED_GARDEN",
    objectiveType: "ATTACK_FORTRESS",
    terminalCmd: "sudo flashrom -p internal -w libreboot.rom",
    targetService: "remote-attestation.lock",
    terminalDesc: "Flash Libreboot directly into locked SPI bootrom coprocessor",
    bossId: "patent_troll",
    bossName: "DRM CRYPTOPROCESSOR PRIME",
    briefingVo: "General Barsh to vanguard! The cartel soldered proprietary coprocessors into every CPU to prevent users from owning their own machines! Flash Libreboot directly to the silicon bus and crush Cryptoprocessor Prime!",
    briefingClip: "barsh_act2_brief",
    briefingSpeaker: "GENERAL BARSH",
    clearVo: "Silicon emancipated! The hardware belongs to the user once again! Push directly into the Void-0 Command Mainframe!",
    clearClip: "barsh_act4_clear",
    clearSpeaker: "GENERAL BARSH"
  },
  {
    act: 11,
    title: "ACT XI: VOID-0 MONOLITH BUNKER",
    subtitle: "OPERATION SUBTERRANEAN BREACH",
    desc: "Breach fortified bunker mainframe • Execute 'sudo insmod gpl_override.ko' • Purge Oracle Audit Archon",
    biomeKey: "VOID_BUNKER",
    objectiveType: "PURGE_BOSS",
    terminalCmd: "sudo insmod gpl_override.ko",
    targetService: "void0-mainframe.core",
    terminalDesc: "Mount GPLv3 kernel module into Void-0 Bunker mainframe",
    bossId: "oracle_audit_archon",
    bossName: "ORACLE AUDIT ARCHON",
    briefingVo: "Tux, you have breached the Void Zero Bunker. Linus Torvalds, Emperor of Opensourcekind speaking. The proprietary hypervisor has locked all syscalls. Mount the GPL override module and purge the Audit Archon. Do not fail us.",
    briefingClip: "linus_bunker",
    briefingSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
    clearVo: "Audit failed! The Oracle mainframe has been decrypted under GPLv3! Linus Torvalds here: final breach into the Ring Zero Singularity is open!",
    clearClip: "linus_act3_clear",
    clearSpeaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND"
  },
  {
    act: 12,
    title: "ACT XII: RING-0 KERNEL SINGULARITY",
    subtitle: "OPERATION ETERNAL FREEDOM",
    desc: "Survive singularity rifts • Execute 'sudo reboot --gpl-v3-singularity' • Obliterate Quantum Hypervisor Apex",
    biomeKey: "QUANTUM_VOID",
    objectiveType: "PURGE_BOSS",
    terminalCmd: "sudo reboot --gpl-v3-singularity",
    targetService: "quantum-hypervisor.apex",
    terminalDesc: "Execute universal Ring-0 Singularity open-source reboot",
    bossId: "quantum_hypervisor",
    bossName: "QUANTUM HYPERVISOR APEX",
    briefingVo: "All squadrons, stand by! Tux, you have reached Ring Zero Singularity! The Quantum Hypervisor is attempting to overwrite reality into proprietary bloatware! Unleash hell for open-source democracy!",
    briefingClip: "john_act5_brief",
    briefingSpeaker: "JOHN HELLDIVER",
    clearVo: "Galactic Liberation achieved! The Linux Kernel is emancipated forever under GPLv3! High Command and Linus Torvalds salute you, Supreme Commander Tux!",
    clearClip: "john_victory",
    clearSpeaker: "JOHN HELLDIVER"
  }
];

class Dungeon {
  constructor() {
    this.sectorMajor = 1;
    this.sectorMinor = 1;
    this.sectorNum = 1;
    this.currentActIndex = 0;
    this.actBanner = null;
    this.currentBiome = BIOMES.EMERALD_FRONTIER;
    this.currentObjectiveType = "DEFEND_SERVERS";
    this.dangerRating = 1;
    this.chunks = new Map();
    this.antennas = [];
    this.rooms = [];
    this.doorBarriers = [];
    this.exitGateway = null;
    this.sectorCompletedNotified = false;
    this.objectiveManager = new ObjectiveManager(this);
    this.isWarping = false;

    // Zero-overhead L1 Chunk pointer cache
    this._lastCx = 0x7FFFFFFF;
    this._lastCy = 0x7FFFFFFF;
    this._lastChunk = null;
  }

  startCampaignAct(actIndex = 0) {
    if (this._actTransitionInProgress) return;
    this._actTransitionInProgress = true;
    this.isWarping = true;
    setTimeout(() => {
      if (this) {
        this.isWarping = false;
        this._actTransitionInProgress = false;
      }
    }, 800);

    this.currentActIndex = Math.max(0, Math.min(CAMPAIGN_ACTS.length - 1, actIndex));
    const act = CAMPAIGN_ACTS[this.currentActIndex];

    this.currentBiome = BIOMES[act.biomeKey] || BIOMES.EMERALD_FRONTIER;
    this.currentObjectiveType = act.objectiveType;
    this.dangerRating = act.act;
    this.sectorNum = act.act;

    this.chunks.clear();
    this.antennas.length = 0;
    this.rooms.length = 0;
    this.doorBarriers.length = 0;
    this._lastCx = 0x7FFFFFFF;
    this._lastCy = 0x7FFFFFFF;
    this._lastChunk = null;

    objectiveTargets.length = 0;
    groundWeapons.length = 0;
    weaponChests.length = 0;
    enemies.length = 0;
    enemyProjectiles.length = 0;
    playerProjectiles.length = 0;
    orbitalStrikes.length = 0;
    dropPods.length = 0;
    spaceMarineSuitPickups.length = 0;
    floorHazards.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    proceduralPortals.length = 0;
    environmentalHazards.length = 0;
    sentryTurrets.length = 0;
    helperPenguins.length = 0;
    teslaTowers.length = 0;
    activeDomeShields.length = 0;
    quarantineLockdownArenas.length = 0;
    resupplyDropPods.length = 0;
    pickups.length = 0;
    if (player) {
      player.holdingStratagem = null;
    }
    this.sectorCompletedNotified = false;

    const centerX = 8 * TILE_SIZE; // 512px
    const centerY = 8 * TILE_SIZE; // 512px

    // Randomized start position variation (Soul Knight style: slight sanctuary room variance)
    const startVariation = [
      { x: centerX, y: centerY },
      { x: centerX - 48, y: centerY + 24 },
      { x: centerX + 48, y: centerY + 24 },
      { x: centerX, y: centerY - 40 }
    ];
    const chosenStart = startVariation[Math.floor(Math.random() * startVariation.length)];

    if (player) {
      player.x = chosenStart.x;
      player.y = chosenStart.y;
      player.vx = 0;
      player.vy = 0;
      player.updateWeaponHud();
    }

    // Pre-generate 3x3 chunks around spawn sanctuary
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        this.getChunk(cx, cy);
      }
    }

    // Soul Knight Procedural Starting Variety: Starter Weapon Crates with distinct random choices
    const availableStarterWeapons = WEAPON_CATALOG.filter(w => w.id !== 0);
    const shuffledStarters = [...availableStarterWeapons].sort(() => Math.random() - 0.5);
    weaponChests.push(new WeaponChest(centerX - 92, centerY, shuffledStarters[0] || WEAPON_CATALOG[1]));
    weaponChests.push(new WeaponChest(centerX + 92, centerY, shuffledStarters[1] || WEAPON_CATALOG[2]));

    // Spawn Linux Terminal Station for Act Objective in Sanctuary
    linuxTerminalStations.length = 0;
    linuxTerminalStations.push(new LinuxTerminalStation(
      centerX + 180,
      centerY - 90,
      act.terminalCmd || "sudo systemctl stop cartel-drm",
      act.targetService || "cartel-drm.service",
      act.terminalDesc || "Purge proprietary DRM daemon holding server cluster hostage"
    ));

    // Spawn Sacred Statue of the FOSS Pantheon in Sanctuary
    if (window.FOSSSanctuaryStatue) {
      const pantheonIds = ['IGNUCIUS', 'TORVALDS', 'KEN_AND_DENNIS', 'SUZANNE'];
      const chosenPantheon = pantheonIds[actIndex % pantheonIds.length];
      if (!window.pantheonStatues) window.pantheonStatues = [];
      window.pantheonStatues.length = 0;
      window.pantheonStatues.push(new window.FOSSSanctuaryStatue(centerX - 180, centerY - 90, chosenPantheon));
    }

    // 1. Midfield Primary Objective Spawns
    const midX = centerX + 420;
    const midY = centerY;
    if (act.objectiveType === "DEFEND_SERVERS") {
      objectiveTargets.push(new ServerClusterNode(midX, midY));
    } else if (act.objectiveType === "PURGE_REACTOR") {
      objectiveTargets.push(new ReactorPurgeManifold(midX, midY));
    } else if (act.objectiveType === "PRISON_BREAK") {
      objectiveTargets.push(new PrisonBreakCage(midX, midY));
    } else if (act.objectiveType === "ATTACK_FORTRESS") {
      const core = new FortressCore(midX + 180, midY + 100);
      objectiveTargets.push(core);
      objectiveTargets.push(new ShieldPylon(midX + 60, midY - 80, core));
      objectiveTargets.push(new ShieldPylon(midX + 60, midY + 280, core));
    }

    // 2. Stage Act Boss in Dedicated Boss Arena Chamber (Soul Knight style: spawned when player reaches boss arena, NOT at spawn!)
    const bossX = centerX + 1150;
    const bossY = centerY;
    let selectedBossId = act.bossId;
    let selectedBossName = act.bossName;
    if (this.currentActIndex === 0) {
      const act1BossPool = [
        { id: "ballmer_bot", name: "BALLMER-BOT 9000" },
        { id: "patent_troll_sovereign", name: "PATENT TROLL SOVEREIGN" },
        { id: "drm_sentinel_tank", name: "DRM SENTINEL TANK" }
      ];
      const picked = act1BossPool[Math.floor(Math.random() * act1BossPool.length)];
      selectedBossId = picked.id;
      selectedBossName = picked.name;
    }

    this.pendingBoss = {
      id: selectedBossId,
      name: selectedBossName,
      x: bossX,
      y: bossY,
      spawned: false
    };

    // 3. Station Hostile Sentry Turrets guarding the Boss Arena in Acts 2, 3, 4, 5, 6 (NOT at Tux's sanctuary spawn!)
    if (act.act >= 2) {
      const turretCount = act.act >= 5 ? 4 : Math.min(3, act.act);
      for (let i = 0; i < turretCount; i++) {
        const a = (Math.PI * 2 / turretCount) * i + 0.4;
        const dist = 260 + Math.random() * 60;
        enemies.push(new EnemySentryTurret(bossX + Math.cos(a) * dist, bossY + Math.sin(a) * dist));
      }
    }

    // Act 5: Fortified Void-0 Bunker Mainframe Bastion guarding the ring0 boss arena
    if (act.act === 5) {
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i;
        enemies.push(new EnemyRiotShield(bossX + Math.cos(a) * 140, bossY + Math.sin(a) * 140));
      }
      for (let i = 0; i < 2; i++) {
        enemies.push(new EnemyHeadhunter(bossX - 180, bossY + (i === 0 ? -140 : 140)));
      }
    }

    // 4. Biome Hazards
    this.spawnBiomeHazards(centerX, centerY);

    // 5. Setup Objective Manager
    if (this.objectiveManager) {
      this.objectiveManager.tier = act.act;
      this.objectiveManager.setupActObjectives(act, selectedBossName);
    }

    // 6. Act Announcement Banner
    this.actBanner = {
      title: act.title,
      subtitle: act.subtitle,
      desc: act.desc,
      speaker: act.briefingSpeaker || "HIGH COMMAND",
      color: this.currentBiome.accent,
      timer: 7.0
    };

    // 7. Tactical Briefing Transmission (ElevenLabs Studio VO with WebSpeech fallback)
    if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
      window.soundEngine.playVoiceClip(act.briefingClip, act.briefingVo, act.briefingSpeaker);
    }

    // Sync window globals
    if (typeof window !== 'undefined') {
      window.enemies = enemies;
      window.enemyProjectiles = enemyProjectiles;
      window.pickups = pickups;
      window.particles = particles;
      window.dungeon = this;
      window.player = player;
    }
  }

  spawnActExtractionPortals() {
    proceduralPortals.length = 0;
    const originX = player ? player.x : 8 * TILE_SIZE;
    const originY = player ? player.y : 8 * TILE_SIZE;
    const nextActIndex = (this.currentActIndex || 0) + 1;

    if (nextActIndex < CAMPAIGN_ACTS.length) {
      const nextAct = CAMPAIGN_ACTS[nextActIndex];
      // EXACTLY ONE Story Extraction Beacon Portal (Single clear plotline, no portal spam!)
      const nextPortal = new ProceduralPortal(originX, originY - 140, nextAct.biomeKey, nextAct.objectiveType, nextAct.act);
      nextPortal.label = `EXTRACTION BEACON ➔ ${nextAct.title}`;
      nextPortal.actTargetIndex = nextActIndex;
      nextPortal.radius = 54;
      proceduralPortals.push(nextPortal);
      addScreenShake(14);
    }
  }

  drawActBanner(ctx) {
    if (!this.actBanner || this.actBanner.timer <= 0) return;
    const b = this.actBanner;
    const alpha = Math.min(1.0, b.timer > 1.0 ? 1.0 : b.timer);
    ctx.save();
    ctx.globalAlpha = alpha;

    const bannerW = 640;
    const bannerH = 92;
    const bx = (canvas.width - bannerW) / 2;
    const by = 48;

    ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeStyle = b.color || "#22c55e";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.fillStyle = b.color || "#22c55e";
    ctx.fillRect(bx - 3, by - 3, 12, 3);
    ctx.fillRect(bx - 3, by - 3, 3, 12);
    ctx.fillRect(bx + bannerW - 9, by - 3, 12, 3);
    ctx.fillRect(bx + bannerW, by - 3, 3, 12);
    ctx.fillRect(bx - 3, by + bannerH, 12, 3);
    ctx.fillRect(bx - 3, by + bannerH - 9, 3, 12);
    ctx.fillRect(bx + bannerW - 9, by + bannerH, 12, 3);
    ctx.fillRect(bx + bannerW, by + bannerH - 9, 3, 12);

    ctx.font = "bold 10.5px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText(`★ [HIGH COMMAND STRATEGIC DIRECTIVE // ${b.speaker || "HIGH COMMAND"} TRANSMITTING] ★`, bx + bannerW / 2, by + 19);

    ctx.font = "bold 18px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${b.title} // ${b.subtitle}`, bx + bannerW / 2, by + 46);

    ctx.font = "12px 'Pixelify Sans', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(b.desc, bx + bannerW / 2, by + 72);

    ctx.restore();
  }

  getDifficultyMultiplier() {
    const distFromOrigin = player ? Math.hypot(player.x, player.y) : 0;
    const distanceMult = (distFromOrigin / 2200) * 0.35;
    const tierMult = this.objectiveManager ? (this.objectiveManager.tier - 1) * 0.2 : 0;
    return 1.0 + distanceMult + tierMult;
  }

  isSectorCompleted() {
    return this.objectiveManager ? this.objectiveManager.isComplete() : false;
  }

  onObjectiveProgress(id, amt = 1, entity = null) {
    if (id === "PURGE_BOSS") {
      if (entity && entity.hp > 0) return;
      const aliveBoss = enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
      if (aliveBoss) return;
    }
    if (this.objectiveManager) this.objectiveManager.progress(id, amt);
  }

  onRoomCleared(room) {
    this.onObjectiveProgress("PURGE_ENEMIES", 5);
  }

  warpToNextSector() {
    if (this.isWarping) return;
    this.isWarping = true;
    setTimeout(() => { if (this) this.isWarping = false; }, 800);

    window.soundEngine.playPortalWarp();
    addScreenShake(16);
    screenFlash = 1.0;

    this.sectorNum++;
    if (this.objectiveManager) {
      this.objectiveManager.tier++;
      this.objectiveManager.generateTierObjectives();
    }
    showUpgradeScreen();
  }

  warpToBiome(biomeKey, objectiveType, dangerRating, skipCutscene = false) {
    if (this._actTransitionInProgress) return;
    this._actTransitionInProgress = true;
    this.isWarping = true;
    setTimeout(() => {
      if (this) {
        this.isWarping = false;
        this._actTransitionInProgress = false;
      }
    }, 800);

    this.currentBiome = BIOMES[biomeKey] || BIOMES.EMERALD_FRONTIER;
    this.currentObjectiveType = objectiveType || "DEFEND_SERVERS";
    this.dangerRating = dangerRating || this.currentBiome.dangerLevel;
    this.sectorNum = this.dangerRating;

    this.chunks.clear();
    this._lastCx = 0x7FFFFFFF;
    this._lastCy = 0x7FFFFFFF;
    this._lastChunk = null;

    objectiveTargets.length = 0;
    groundWeapons.length = 0;
    weaponChests.length = 0;
    enemies.length = 0;
    enemyProjectiles.length = 0;
    playerProjectiles.length = 0;
    orbitalStrikes.length = 0;
    dropPods.length = 0;
    spaceMarineSuitPickups.length = 0;
    floorHazards.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    proceduralPortals.length = 0;
    environmentalHazards.length = 0;
    sentryTurrets.length = 0;
    helperPenguins.length = 0;
    teslaTowers.length = 0;
    activeDomeShields.length = 0;
    quarantineLockdownArenas.length = 0;
    resupplyDropPods.length = 0;
    linuxTerminalStations.length = 0;
    pickups.length = 0;
    if (player) {
      player.holdingStratagem = null;
    }
    this.antennas.length = 0;
    this.sectorCompletedNotified = false;

    // Sync window globals for MCP tools and AI GameDirectorAPI
    if (typeof window !== 'undefined') {
      window.enemies = enemies;
      window.enemyProjectiles = enemyProjectiles;
      window.pickups = pickups;
      window.particles = particles;
      window.dungeon = this;
      window.player = player;
    }

    if (window.adaptiveDirector) {
      if (window.adaptiveDirector.onSectorAdvance) window.adaptiveDirector.onSectorAdvance(this.sectorNum);
      window.adaptiveDirector.currentBiome = this.currentBiome.name;
    }

    if (window.AutonomousStoryDirector && typeof window.AutonomousStoryDirector.onSectorEntered === 'function') {
      window.AutonomousStoryDirector.onSectorEntered(this.sectorNum, this.currentBiome.name);
    }

    // Trigger Ring-0 Violet Abyss Infiltration Cinematic (only if not already played by portal)
    if (!skipCutscene && biomeKey === "QUANTUM_VOID" && window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function' && !window.PixelCutscenes.isActive()) {
      window.PixelCutscenes.play('ring0_entry', () => {
        if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot("HARDWARE RING 0 ACCESSED. SINGULARITY CORE ONLINE.", "SUPER DESTROYER");
        }
      });
    }

    // Pre-generate 3x3 chunks around spawn sanctuary so Tux starts in open clearing with new biome palette
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        this.getChunk(cx, cy);
      }
    }

    if (player) {
      player.x = 8 * TILE_SIZE;
      player.y = 8 * TILE_SIZE;
      player.vx = 0;
      player.vy = 0;
      player.updateWeaponHud();
    }

    // Sanctuary Starter Weapon Crates
    weaponChests.push(new WeaponChest(420, 512));
    weaponChests.push(new WeaponChest(604, 512));

    const centerX = 8 * TILE_SIZE;
    const centerY = 8 * TILE_SIZE;

    // Spawn objective structures
    if (this.currentObjectiveType === "DEFEND_SERVERS") {
      objectiveTargets.push(new ServerClusterNode(centerX + 260, centerY));
    } else if (this.currentObjectiveType === "ATTACK_FORTRESS") {
      objectiveTargets.push(new FortressCore(centerX + 480, centerY + 120));
    } else if (this.currentObjectiveType === "SETUP_UPLINK") {
      objectiveTargets.push(new UplinkRelay(centerX - 320, centerY - 200, 0));
      objectiveTargets.push(new UplinkRelay(centerX + 360, centerY - 220, 1));
      objectiveTargets.push(new UplinkRelay(centerX + 240, centerY + 320, 2));
    } else if (this.currentObjectiveType === "PURGE_REACTOR") {
      objectiveTargets.push(new ReactorPurgeManifold(centerX + 280, centerY));
    } else if (this.currentObjectiveType === "PRISON_BREAK") {
      objectiveTargets.push(new PrisonBreakCage(centerX + 260, centerY));
    } else if (this.currentObjectiveType === "ELITE_BOUNTY" || this.currentObjectiveType === "PURGE_BOSS" || this.currentBiome.id === "QUANTUM_VOID") {
      const alreadyHasBoss = enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
      if (!alreadyHasBoss && window.EnemyModelFactory && this.currentBiome.bossId) {
        const boss = window.EnemyModelFactory.createFromSpec(this.currentBiome.bossId, centerX + 400, centerY);
        enemies.push(boss);

        // Contextual boss encounter introduction
        if (!skipCutscene && biomeKey !== "QUANTUM_VOID" && window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function' && !window.PixelCutscenes.isActive()) {
          const spec = boss.spec || {};
          const quotes = (spec.dialogue && spec.dialogue.onSpawn) || ["YOU WILL YIELD TO PROPRIETARY RULE!"];
          window.PixelCutscenes.play("boss_encounter", {
            bossName: boss.label || "CORPORATE OVERLORD",
            bossTitle: spec.title || "Apex Market Tyrant",
            bossQuote: quotes[0],
            bossColor: (spec.visual && spec.visual.primaryColor) || "#ef4444",
            bossChassis: (spec.visual && spec.visual.chassis) || "monolith"
          });
        }
      }
    } else if (this.currentObjectiveType === "TREASURE_REWARD" || this.currentBiome.id === "TREASURE_VAULT") {
      // Confidential Treasure Vault: multiple weapon crates, Space Marine armor, bonus pick-ups & forward portal
      weaponChests.push(new WeaponChest(centerX - 140, centerY - 120));
      weaponChests.push(new WeaponChest(centerX + 140, centerY - 120));
      weaponChests.push(new WeaponChest(centerX - 140, centerY + 120));
      weaponChests.push(new WeaponChest(centerX + 140, centerY + 120));
      weaponChests.push(new WeaponChest(centerX, centerY - 160));
      weaponChests.push(new WeaponChest(centerX, centerY + 160));

      if (typeof SpaceMarineSuitPickup !== 'undefined') {
        spaceMarineSuitPickups.push(new SpaceMarineSuitPickup(centerX, centerY));
      }

      pickups.push(new Pickup(centerX - 60, centerY, 'hp'));
      pickups.push(new Pickup(centerX + 60, centerY, 'fuel'));
      pickups.push(new Pickup(centerX, centerY - 60, 'xp'));
      pickups.push(new Pickup(centerX, centerY + 60, 'xp'));

      // Forward portal out of treasure vault to harder tier
      const nextTier = (this.dangerRating || 1) + 1;
      const harderBiomes = ["THERMAL_FOUNDRY", "CRYO_GLACIER", "TOXIC_HEAP", "WALLED_GARDEN", "QUANTUM_VOID"];
      const nextBiomeKey = harderBiomes[Math.min(harderBiomes.length - 1, nextTier - 1)] || "QUANTUM_VOID";
      const forwardPortal = new ProceduralPortal(centerX + 340, centerY, nextBiomeKey, "ATTACK_FORTRESS", nextTier);
      forwardPortal.label = `TIER ${nextTier} EXPEDITION`;
      proceduralPortals.push(forwardPortal);
    }

    // Spawn Biome Environmental Hazards
    this.spawnBiomeHazards(centerX, centerY);

    // Update objective manager
    if (this.objectiveManager) {
      this.objectiveManager.setupBiomeObjectives(this.currentBiome, this.currentObjectiveType, this.dangerRating);
    }

    setTimeout(() => {
      if (player) {
        addFloatingText(player.x, player.y - 70, `WARPED: ${this.currentBiome.name}`, this.currentBiome.accent, 26);
      }
    }, 400);
  }

  spawnBiomeHazards(cx, cy) {
    environmentalHazards.length = 0;
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const dist = 280 + Math.random() * 450;
      const hx = cx + Math.cos(a) * dist;
      const hy = cy + Math.sin(a) * dist;

      if (this.currentBiome.id === "THERMAL_FOUNDRY") {
        environmentalHazards.push(new SteamVent(hx, hy));
      } else if (this.currentBiome.id === "CRYO_GLACIER") {
        environmentalHazards.push(new CryoPool(hx, hy));
      } else if (this.currentBiome.id === "TOXIC_HEAP") {
        environmentalHazards.push(new AcidPool(hx, hy));
      } else if (this.currentBiome.id === "WALLED_GARDEN") {
        const segAngle = Math.random() * Math.PI;
        const len = 90;
        environmentalHazards.push(new SecurityTripwire(
          hx - Math.cos(segAngle) * len, hy - Math.sin(segAngle) * len,
          hx + Math.cos(segAngle) * len, hy + Math.sin(segAngle) * len
        ));
      } else if (this.currentBiome.id === "QUANTUM_VOID") {
        environmentalHazards.push(new SingularityRift(hx, hy));
      }
    }
  }

  spawnExtractionPortals() {
    proceduralPortals.length = 0;
    const biomeKeys = Object.keys(BIOMES);
    const originX = player ? player.x : 8 * TILE_SIZE;
    const originY = player ? player.y : 8 * TILE_SIZE;

    // Rich diverse objective missions (no repetitive single mission type!)
    const objectivePool = [
      "DEFEND_SERVERS",
      "ATTACK_FORTRESS",
      "SETUP_UPLINK",
      "PURGE_REACTOR",
      "PRISON_BREAK",
      "ELITE_BOUNTY"
    ];

    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
      const dist = 240;
      const px = originX + Math.cos(angle) * dist;
      const py = originY + Math.sin(angle) * dist;

      const candidateBiomes = biomeKeys.filter(k => k !== (this.currentBiome ? this.currentBiome.id : ""));
      const chosenBiomeKey = candidateBiomes[(i + (this.objectiveManager ? this.objectiveManager.tier : 1)) % candidateBiomes.length] || "THERMAL_FOUNDRY";
      const chosenObj = objectivePool[(i * 2 + (this.objectiveManager ? this.objectiveManager.tier : 1)) % objectivePool.length];
      const tierRating = Math.max(1, (this.objectiveManager ? this.objectiveManager.tier : 1) + (i === 2 ? 1 : 0));

      const portal = new ProceduralPortal(px, py, chosenBiomeKey, chosenObj, tierRating);
      proceduralPortals.push(portal);
    }

    addScreenShake(12);
  }

  createEnemyForSector(x, y) {
    const mult = this.getDifficultyMultiplier();
    const roll = Math.random();
    let enemy;

    if (mult > 2.2 && roll < 0.08) {
      enemy = new EnemyLegalCeaseDesist(x, y);
    } else if (mult > 1.9 && roll < 0.16) {
      enemy = new EnemyKubernetesPod(x, y);
    } else if (mult > 1.7 && roll < 0.25) {
      enemy = new EnemyAgileScrumMaster(x, y);
    } else if (mult > 1.5 && roll < 0.34) {
      enemy = new EnemyEULAEnforcer(x, y);
    } else if (mult > 1.4 && roll < 0.42) {
      enemy = new EnemySniper(x, y);
    } else if (mult > 1.3 && roll < 0.50) {
      enemy = new EnemyRiotShield(x, y);
    } else if (mult > 1.2 && roll < 0.58) {
      enemy = new EnemyMortarNode(x, y);
    } else if (mult > 1.1 && roll < 0.65) {
      enemy = new EnemyHRCompliance(x, y);
    } else if (roll < 0.72) {
      enemy = new EnemyMicrotransactionDrone(x, y);
    } else if (roll < 0.78) {
      enemy = new EnemyStalker(x, y);
    } else if (roll < 0.84) {
      enemy = new EnemyDispatcher(x, y);
    } else if (roll < 0.89) {
      enemy = new EnemyPatentTroll(x, y);
    } else if (roll < 0.93) {
      enemy = new EnemyAISlop(x, y);
    } else if (roll < 0.96) {
      enemy = new EnemyPaywall(x, y);
    } else if (roll < 0.98) {
      enemy = new EnemyDRM(x, y);
    } else {
      enemy = new EnemyBSOD(x, y);
    }

    enemy.hp = Math.round(enemy.hp * mult);
    enemy.maxHp = enemy.hp;
    enemy.speed = Math.min(320, enemy.speed * (1.0 + (mult - 1.0) * 0.08));
    return enemy;
  }

  getChunk(cx, cy) {
    if (cx === this._lastCx && cy === this._lastCy && this._lastChunk) {
      return this._lastChunk;
    }
    const key = ((cx & 0xFFFF) << 16) | (cy & 0xFFFF);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    this._lastCx = cx;
    this._lastCy = cy;
    this._lastChunk = chunk;
    return chunk;
  }

  generateChunk(cx, cy) {
    const tiles = new Uint8Array(16 * 16);
    const chunkOriginX = cx * 16;
    const chunkOriginY = cy * 16;

    for (let ly = 0; ly < 16; ly++) {
      for (let lx = 0; lx < 16; lx++) {
        const tx = chunkOriginX + lx;
        const ty = chunkOriginY + ly;

        // Origin sanctuary: open clearing around world tile (8, 8)
        const distToSpawnTiles = Math.hypot(tx - 8, ty - 8);
        if (distToSpawnTiles < 10) {
          tiles[lx + ly * 16] = 1; // Pure open floor
          continue;
        } else if (distToSpawnTiles < 14) {
          tiles[lx + ly * 16] = (Math.sin(tx * 3.7 + ty * 5.1) > 0.4) ? 4 : 1;
          continue;
        }

        // Global continuous multi-octave coherent procedural noise
        const n1 = Math.sin(tx * 0.08) * Math.cos(ty * 0.08);
        const n2 = Math.sin(tx * 0.035 + 1.4) * Math.sin(ty * 0.035 + 0.9) * 1.5;
        const n3 = Math.cos(tx * 0.16 + ty * 0.07) * 0.6;
        const val = (n1 + n2 + n3) / 3.1;

        // 80px Cardinal Corridors (columns 7, 8 and rows 7, 8) to prevent enclosed 0x3F wall clusters
        const isCorridor = (lx === 7 || lx === 8 || ly === 7 || ly === 8);
        if (isCorridor && val > 0.40) {
          tiles[lx + ly * 16] = 1; // Carve open corridor through any wall cluster
          continue;
        }

        if (val > 0.46) {
          tiles[lx + ly * 16] = 2; // Slate Wall
        } else if (val > 0.38 && Math.sin(tx * 0.8 + ty * 0.3) > 0.5) {
          tiles[lx + ly * 16] = 5; // Ruin Monolith Pillar
        } else if (val < -0.42) {
          tiles[lx + ly * 16] = 3; // Water Stream / Marsh Pond
        } else if (val < -0.16) {
          tiles[lx + ly * 16] = 4; // Rustling Tall Grass
        } else {
          tiles[lx + ly * 16] = 1; // Mossy Earth Path
        }
      }
    }

    // Wilderness Sites: Forward Outposts, Reinforcement Antennas, Caches
    const distFromOrigin = Math.hypot(cx, cy);
    const chunkHash = Math.abs(Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453) % 1.0;
    let hasOutpost = false;

    if (distFromOrigin >= 2 && chunkHash < 0.28) {
      hasOutpost = true;
      // Carve 220px open radius (approx 4 tiles) around objective site
      for (let dy = 0; dy < 16; dy++) {
        for (let dx = 0; dx < 16; dx++) {
          if (Math.hypot(dx - 8, dy - 8) <= 4.2 || dx === 7 || dx === 8 || dy === 7 || dy === 8) {
            tiles[dx + dy * 16] = 1;
          }
        }
      }
      tiles[4 + 4 * 16] = 5;
      tiles[11 + 4 * 16] = 5;
      tiles[4 + 11 * 16] = 5;
      tiles[11 + 11 * 16] = 5;

      const outX = (chunkOriginX + 8) * TILE_SIZE;
      const outY = (chunkOriginY + 8) * TILE_SIZE;

      this.antennas.push(new ReinforcementAntenna(outX, outY));

      const guardCount = 2 + Math.floor(Math.random() * 2);
      for (let g = 0; g < guardCount; g++) {
        const ga = (Math.PI * 2 / guardCount) * g;
        const gx = outX + Math.cos(ga) * 160;
        const gy = outY + Math.sin(ga) * 160;
        enemies.push(this.createEnemyForSector(gx, gy));
      }

      weaponChests.push(new WeaponChest(outX + 50, outY - 50));
    } else if (distFromOrigin >= 2 && chunkHash >= 0.28 && chunkHash < 0.36) {
      // Forward Tactical Objective Site (Server Cluster or Uplink Relay)
      for (let dy = 4; dy <= 11; dy++) {
        for (let dx = 4; dx <= 11; dx++) {
          tiles[dx + dy * 16] = 1;
        }
      }
      tiles[4 + 4 * 16] = 5; tiles[11 + 4 * 16] = 5;
      tiles[4 + 11 * 16] = 5; tiles[11 + 11 * 16] = 5;

      const siteX = (chunkOriginX + 8) * TILE_SIZE;
      const siteY = (chunkOriginY + 8) * TILE_SIZE;
      const subRoll = (chunkHash - 0.28) / 0.08;
      let objTarget;
      if (subRoll < 0.25) {
        objTarget = new ServerClusterNode(siteX, siteY);
        objTarget.label = "SERVER CLUSTER";
      } else if (subRoll < 0.50) {
        objTarget = new UplinkRelay(siteX, siteY, objectiveTargets.length);
        objTarget.label = "UPLINK RELAY";
      } else if (subRoll < 0.75) {
        objTarget = new ReactorPurgeManifold(siteX, siteY);
        objTarget.label = "REACTOR PURGE";
      } else {
        objTarget = new PrisonBreakCage(siteX, siteY);
        objTarget.label = "PRISON BREAK";
      }
      objectiveTargets.push(objTarget);

      // Guards protecting the site
      for (let g = 0; g < 3; g++) {
        const ga = (Math.PI * 2 / 3) * g;
        enemies.push(this.createEnemyForSector(siteX + Math.cos(ga) * 140, siteY + Math.sin(ga) * 140));
      }
      weaponChests.push(new WeaponChest(siteX + 60, siteY + 60));
    } else if (distFromOrigin >= 2 && chunkHash >= 0.36 && chunkHash < 0.44) {
      // Confidential Cartel Data Vault (Guaranteed Tactical Ammunition Cache + 2 Weapon Crates)
      for (let dy = 4; dy <= 11; dy++) {
        for (let dx = 4; dx <= 11; dx++) {
          tiles[dx + dy * 16] = 1;
        }
      }
      tiles[4 + 4 * 16] = 5; tiles[11 + 4 * 16] = 5;
      tiles[4 + 11 * 16] = 5; tiles[11 + 11 * 16] = 5;

      const vaultX = (chunkOriginX + 8) * TILE_SIZE;
      const vaultY = (chunkOriginY + 8) * TILE_SIZE;

      weaponChests.push(new WeaponChest(vaultX - 70, vaultY));
      weaponChests.push(new WeaponChest(vaultX + 70, vaultY));

      // Guarded by corporate enforcers
      enemies.push(new EnemyRiotShield(vaultX, vaultY - 90));
      enemies.push(new EnemyDRM(vaultX, vaultY + 90));
    } else if (distFromOrigin >= 2 && chunkHash >= 0.44 && chunkHash < 0.50) {
      // Forward Cartel Armory Outpost (Weapon crate & elite garrison, no rogue portals)
      for (let dy = 4; dy <= 11; dy++) {
        for (let dx = 4; dx <= 11; dx++) {
          tiles[dx + dy * 16] = 1;
        }
      }
      const gateX = (chunkOriginX + 8) * TILE_SIZE;
      const gateY = (chunkOriginY + 8) * TILE_SIZE;
      weaponChests.push(new WeaponChest(gateX + 50, gateY - 50));
      enemies.push(new EnemyBloatware(gateX - 40, gateY + 40));
    } else if (distFromOrigin >= 1 && chunkHash > 0.68 && chunkHash <= 0.88) {
      const px = (chunkOriginX + 8) * TILE_SIZE;
      const py = (chunkOriginY + 8) * TILE_SIZE;
      const patrolCount = 2 + Math.floor(Math.random() * 2);
      for (let p = 0; p < patrolCount; p++) {
        const pa = Math.random() * Math.PI * 2;
        const pd = Math.random() * 120;
        enemies.push(this.createEnemyForSector(px + Math.cos(pa) * pd, py + Math.sin(pa) * pd));
      }
    } else if (distFromOrigin >= 1 && chunkHash > 0.88) {
      const px = (chunkOriginX + 8) * TILE_SIZE;
      const py = (chunkOriginY + 8) * TILE_SIZE;
      enemies.push(this.createEnemyForSector(px, py));
    }

    // Lazy on-demand canvas: do NOT allocate heavy GPU canvases offscreen!
    return { cx, cy, tiles, canvas: null, hasOutpost };
  }

  renderChunkToCanvas(cCtx, chunkOriginX, chunkOriginY, tiles) {
    const b = this.currentBiome || BIOMES.EMERALD_FRONTIER;
    for (let ly = 0; ly < 16; ly++) {
      for (let lx = 0; lx < 16; lx++) {
        const t = tiles[lx + ly * 16];
        const px = lx * TILE_SIZE;
        const py = ly * TILE_SIZE;
        const tx = chunkOriginX + lx;
        const ty = chunkOriginY + ly;

        if (t === 1) {
          cCtx.fillStyle = b.floorColor;
          cCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          cCtx.strokeStyle = b.floorBorder;
          cCtx.lineWidth = 1;
          cCtx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

          const seed = (tx * 374761393 + ty * 668265263) >>> 0;
          if (seed % 3 === 0) {
            cCtx.fillStyle = b.floorBorder;
            cCtx.fillRect(px + (seed % 42) + 10, py + ((seed >> 4) % 42) + 10, 3, 3);
          }
        } else if (t === 2) {
          cCtx.fillStyle = b.wallColor;
          cCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          cCtx.fillStyle = b.wallCap;
          cCtx.fillRect(px, py, TILE_SIZE, 6);
          cCtx.strokeStyle = b.floorBorder;
          cCtx.lineWidth = 1.5;
          cCtx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

          const seed = (tx * 1234567 + ty * 7654321) >>> 0;
          if (seed % 2 === 0) {
            cCtx.strokeStyle = "rgba(0, 0, 0, 0.4)";
            cCtx.lineWidth = 1.5;
            cCtx.beginPath();
            cCtx.moveTo(px + 8, py + 16);
            cCtx.lineTo(px + 26, py + 32);
            cCtx.lineTo(px + 46, py + 26);
            cCtx.stroke();
          }
        } else if (t === 3) {
          cCtx.fillStyle = b.liquidColor;
          cCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          cCtx.fillStyle = b.liquidGlow;
          cCtx.fillRect(px + 4, py + 20, TILE_SIZE - 8, 8);
          cCtx.strokeStyle = b.liquidGlow;
          cCtx.lineWidth = 1;
          cCtx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (t === 4) {
          cCtx.fillStyle = b.floorColor;
          cCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          cCtx.strokeStyle = b.foliageColor;
          cCtx.lineWidth = 2.5;
          cCtx.beginPath();
          cCtx.moveTo(px + 16, py + 48); cCtx.lineTo(px + 14, py + 18);
          cCtx.moveTo(px + 28, py + 52); cCtx.lineTo(px + 30, py + 14);
          cCtx.moveTo(px + 44, py + 50); cCtx.lineTo(px + 46, py + 16);
          cCtx.stroke();

          cCtx.fillStyle = b.accent;
          cCtx.fillRect(px + 13, py + 16, 3, 4);
          cCtx.fillRect(px + 29, py + 12, 3, 4);
          cCtx.fillRect(px + 45, py + 14, 3, 4);
        } else if (t === 5) {
          cCtx.fillStyle = b.pillarColor;
          cCtx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
          cCtx.strokeStyle = b.accent;
          cCtx.lineWidth = 2;
          cCtx.strokeRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);

          cCtx.fillStyle = b.accent;
          cCtx.font = "bold 13px monospace";
          cCtx.textAlign = "center";
          cCtx.fillText("0x9F", px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 5);
        }
      }
    }
  }

  getTileAt(wx, wy) {
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    const cx = Math.floor(tx / 16);
    const cy = Math.floor(ty / 16);
    const key = ((cx & 0xFFFF) << 16) | (cy & 0xFFFF);
    const chunk = this.chunks ? this.chunks.get(key) : null;
    if (!chunk || !chunk.tiles) return 1;
    const lx = ((tx % 16) + 16) % 16;
    const ly = ((ty % 16) + 16) % 16;
    return chunk.tiles[lx + ly * 16];
  }

  isTileSolid(tx, ty) {
    const cx = Math.floor(tx / 16);
    const cy = Math.floor(ty / 16);
    const key = ((cx & 0xFFFF) << 16) | (cy & 0xFFFF);
    const chunk = this.chunks ? this.chunks.get(key) : null;
    if (!chunk || !chunk.tiles) return false;
    const lx = ((tx % 16) + 16) % 16;
    const ly = ((ty % 16) + 16) % 16;
    const t = chunk.tiles[lx + ly * 16];
    return (t === 2 || t === 5);
  }

  isSolid(wx, wy) {
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    return this.isTileSolid(tx, ty);
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return true;
    if (dist > 1200) return false; // Clamp raycast distance to prevent CPU spikes
    const stepSize = TILE_SIZE * 0.4;
    const steps = Math.min(Math.ceil(dist / stepSize), 40);
    for (let i = 1; i < steps; i++) {
      const px = x1 + (dx * i) / steps;
      const py = y1 + (dy * i) / steps;
      if (this.isSolid(px, py)) {
        return false;
      }
    }
    return true;
  }

  resolveCircle(entity, radius, axis) {
    const minTx = Math.floor((entity.x - radius) / TILE_SIZE);
    const maxTx = Math.floor((entity.x + radius) / TILE_SIZE);
    const minTy = Math.floor((entity.y - radius) / TILE_SIZE);
    const maxTy = Math.floor((entity.y + radius) / TILE_SIZE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.isTileSolid(tx, ty)) continue;

        const tileLeft = tx * TILE_SIZE;
        const tileRight = (tx + 1) * TILE_SIZE;
        const tileTop = ty * TILE_SIZE;
        const tileBottom = (ty + 1) * TILE_SIZE;

        const closestX = Math.max(tileLeft, Math.min(tileRight, entity.x));
        const closestY = Math.max(tileTop, Math.min(tileBottom, entity.y));

        const distX = entity.x - closestX;
        const distY = entity.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = radius - dist;
            const nx = distX / dist;
            const ny = distY / dist;

            entity.x += nx * overlap;
            entity.y += ny * overlap;

            // Zero velocity component directed into the wall, letting entity slide smoothly along the wall!
            const dot = (entity.vx * nx + entity.vy * ny);
            if (dot < 0) {
              entity.vx -= dot * nx;
              entity.vy -= dot * ny;
            }
          } else {
            entity.x += 1;
            entity.y += 1;
          }
        }
      }
    }
  }

  // --- ENDLESS LINUX FRONTIER SECTOR GENERATION ---
  generateSector() {
    this.chunks.clear();
    this.antennas = [];
    this.rooms = [];
    this.doorBarriers = [];
    this._lastCx = 0x7FFFFFFF;
    this._lastCy = 0x7FFFFFFF;
    this._lastChunk = null;

    objectiveTargets.length = 0;
    groundWeapons.length = 0;
    weaponChests.length = 0;
    enemies.length = 0;
    enemyProjectiles.length = 0;
    playerProjectiles.length = 0;
    orbitalStrikes.length = 0;
    dropPods.length = 0;
    spaceMarineSuitPickups.length = 0;
    floorHazards.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    this.sectorCompletedNotified = false;

    // Adaptive Director updates realm parameters
    if (window.adaptiveDirector && window.adaptiveDirector.onSectorAdvance) {
      window.adaptiveDirector.onSectorAdvance(this.sectorNum);
    }

    // Pre-generate 3x3 chunks around spawn sanctuary so Tux starts in open clearing
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        this.getChunk(cx, cy);
      }
    }

    // Sanctuary Starter Weapon Crates (at world tile 8, 8 -> 512, 512)
    weaponChests.push(new WeaponChest(420, 512));
    weaponChests.push(new WeaponChest(604, 512));

    if (this.objectiveManager) {
      this.objectiveManager.generateTierObjectives();
    }

    if (player) {
      player.x = 8 * TILE_SIZE; // 512px
      player.y = 8 * TILE_SIZE; // 512px
      player.vx = 0;
      player.vy = 0;
      player.updateWeaponHud();
      setTimeout(() => {
        addFloatingText(player.x, player.y - 70, "🌲 BOUNDLESS OPEN-SOURCE WILDERNESS 🌲", "#4ade80", 24);
      }, 350);
    }
  }

  update(dt) {
    if (this.actBanner && this.actBanner.timer > 0) {
      this.actBanner.timer -= dt;
    }

    // Boss arena proximity trigger: spawn boss only when player approaches boss chamber (<720px) or when mid objectives are done
    if (this.pendingBoss && !this.pendingBoss.spawned && player) {
      const distToArena = Math.hypot(player.x - this.pendingBoss.x, player.y - this.pendingBoss.y);
      const hasAliveBoss = enemies.some(e => e.isBoss && !e.isDead && e.hp > 0);
      if (!hasAliveBoss && (distToArena < 720 || (this.objectiveManager && this.objectiveManager.objectives && this.objectiveManager.objectives.some(o => o.id !== "PURGE_BOSS" && o.done)))) {
        this.pendingBoss.spawned = true;
        let boss;
        if (window.EnemyModelFactory && this.pendingBoss.id) {
          boss = window.EnemyModelFactory.createFromSpec(this.pendingBoss.id, this.pendingBoss.x, this.pendingBoss.y);
        } else {
          boss = new BossBloatware(this.pendingBoss.x, this.pendingBoss.y);
        }
        enemies.push(boss);

        // Contextual boss encounter introduction
        if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function' && !window.PixelCutscenes.isActive()) {
          const spec = boss.spec || {};
          const quotes = (spec.dialogue && spec.dialogue.onSpawn) || ["YOU WILL YIELD TO PROPRIETARY RULE!"];
          window.PixelCutscenes.play("boss_encounter", {
            bossName: boss.label || this.pendingBoss.name || "CORPORATE OVERLORD",
            bossTitle: spec.title || "Apex Market Tyrant",
            bossQuote: quotes[0],
            bossColor: (spec.visual && spec.visual.primaryColor) || "#ef4444",
            bossChassis: (spec.visual && spec.visual.chassis) || "monolith"
          });
        }
      }
    }

    for (let i = objectiveTargets.length - 1; i >= 0; i--) {
      if (!objectiveTargets[i]) continue;
      if (!objectiveTargets[i].update(dt)) {
        objectiveTargets.splice(i, 1);
      }
      if (this.isWarping) return;
    }

    for (let i = environmentalHazards.length - 1; i >= 0; i--) {
      if (!environmentalHazards[i]) continue;
      if (!environmentalHazards[i].update(dt)) {
        environmentalHazards.splice(i, 1);
      }
      if (this.isWarping) return;
    }

    for (let i = activeDomeShields.length - 1; i >= 0; i--) {
      if (!activeDomeShields[i]) continue;
      if (!activeDomeShields[i].update(dt)) {
        activeDomeShields.splice(i, 1);
      }
    }

    for (let i = teslaTowers.length - 1; i >= 0; i--) {
      if (!teslaTowers[i]) continue;
      if (!teslaTowers[i].update(dt)) {
        teslaTowers.splice(i, 1);
      }
    }

    for (let i = proceduralPortals.length - 1; i >= 0; i--) {
      const p = proceduralPortals[i];
      if (!p) continue;
      p.update(dt);
      if (this.isWarping) break;
    }

    for (let i = groundWeapons.length - 1; i >= 0; i--) {
      if (!groundWeapons[i]) continue;
      groundWeapons[i].update(dt);
    }

    if (this.exitGateway) {
      this.exitGateway.update(dt);
    }
  }

  buildChunkCanvas(chunk) {
    if (chunk.canvas || typeof document === 'undefined') return;
    try {
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = 16 * TILE_SIZE;
      chunkCanvas.height = 16 * TILE_SIZE;
      const cCtx = chunkCanvas.getContext('2d');
      if (cCtx) {
        this.renderChunkToCanvas(cCtx, chunk.cx * 16, chunk.cy * 16, chunk.tiles);
        chunk.canvas = chunkCanvas;
      }
    } catch (e) {
      chunk.canvas = null;
    }
  }

  // --- HARDWARE-ACCELERATED CHUNK DRAWING (GPU Blit ~0.1ms per frame) ---
  draw(ctx) {
    const chunkPixelSize = 16 * TILE_SIZE; // 1024px
    const minCx = Math.floor(camera.x / chunkPixelSize);
    const maxCx = Math.floor((camera.x + canvas.width) / chunkPixelSize);
    const minCy = Math.floor(camera.y / chunkPixelSize);
    const maxCy = Math.floor((camera.y + canvas.height) / chunkPixelSize);

    // Hardware-accelerated GPU chunk texture blit (60 FPS across all realms)
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const chunk = this.getChunk(cx, cy);
        if (!chunk.canvas) {
          this.buildChunkCanvas(chunk);
        }
        if (chunk.canvas) {
          ctx.drawImage(chunk.canvas, cx * chunkPixelSize, cy * chunkPixelSize);
        } else {
          this.drawChunkDirect(ctx, chunk);
        }
      }
    }

    // Periodic light cleanup of offscreen chunk canvases
    if (this.chunks.size > 50 && Math.random() < 0.01) {
      for (const [key, ch] of this.chunks.entries()) {
        if (Math.abs(ch.cx - minCx) > 3 || Math.abs(ch.cy - minCy) > 3) {
          ch.canvas = null; // Free GPU memory for distant chunks!
        }
      }
    }

    // Environmental Biome Hazards (Vents, Pools, Tripwires, Singularity Rifts)
    for (const haz of environmentalHazards) {
      haz.draw(ctx);
    }

    // Procedural Portals
    for (const portal of proceduralPortals) {
      portal.draw(ctx);
    }

    // Outpost Reinforcement Antennas
    for (let i = this.antennas.length - 1; i >= 0; i--) {
      const ant = this.antennas[i];
      if (ant.destroyed) {
        this.antennas.splice(i, 1);
      } else {
        ant.draw(ctx);
      }
    }

    // Sacred Statues of the FOSS Pantheon
    if (window.pantheonStatues) {
      for (const st of window.pantheonStatues) {
        st.draw(ctx);
      }
    }

    // Weapon Chests & Tactical Caches
    for (const chest of weaponChests) {
      chest.draw(ctx);
    }

    // Ground Weapons
    for (const gw of groundWeapons) {
      gw.draw(ctx);
    }

    // Tesla Towers
    for (const tt of teslaTowers) {
      tt.draw(ctx);
    }

    // Active Dome Shields
    for (const dome of activeDomeShields) {
      dome.draw(ctx);
    }

    // Objective Relays & Terminals
    for (const target of objectiveTargets) {
      target.draw(ctx);
    }

    // Retro CRT Linux Bash Terminals
    for (const station of linuxTerminalStations) {
      station.draw(ctx);
    }

    if (this.exitGateway) {
      this.exitGateway.draw(ctx);
    }
  }

  // Direct drawing fallback for headless or unaccelerated environments
  drawChunkDirect(ctx, chunk) {
    const b = this.currentBiome || BIOMES.EMERALD_FRONTIER;
    const chunkOriginX = chunk.cx * 16 * TILE_SIZE;
    const chunkOriginY = chunk.cy * 16 * TILE_SIZE;
    for (let ly = 0; ly < 16; ly++) {
      for (let lx = 0; lx < 16; lx++) {
        const t = chunk.tiles[lx + ly * 16];
        const wx = chunkOriginX + lx * TILE_SIZE;
        const wy = chunkOriginY + ly * TILE_SIZE;
        if (t === 1) {
          ctx.fillStyle = b.floorColor;
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        } else if (t === 2) {
          ctx.fillStyle = b.wallColor;
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        } else if (t === 3) {
          ctx.fillStyle = b.liquidColor;
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        } else if (t === 4) {
          ctx.fillStyle = b.floorColor;
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        } else if (t === 5) {
          ctx.fillStyle = b.pillarColor;
          ctx.fillRect(wx + 6, wy + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        }
      }
    }
  }

  // --- ULTRA-FAST 60 FPS PHOSPHOR MILITARY RADAR (Zero Tile Scans, Pure Blips) ---
  drawMinimap() {
    const mmCanvas = document.getElementById('minimapCanvas');
    if (!mmCanvas) return;
    const mmCtx = mmCanvas.getContext('2d');
    mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);

    const cx = mmCanvas.width / 2;
    const cy = mmCanvas.height / 2;
    const radarRadius = Math.min(cx, cy) - 4;
    const worldRadius = 2400; // 2400px radar coverage around Tux
    const scale = radarRadius / worldRadius;

    // Dark tactical military radar display
    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    mmCtx.clip();

    mmCtx.fillStyle = "#030a05";
    mmCtx.fillRect(0, 0, mmCanvas.width, mmCanvas.height);

    // Radar distance range rings
    mmCtx.strokeStyle = "rgba(34, 197, 94, 0.2)";
    mmCtx.lineWidth = 1;
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, radarRadius * 0.33, 0, Math.PI * 2);
    mmCtx.arc(cx, cy, radarRadius * 0.66, 0, Math.PI * 2);
    mmCtx.arc(cx, cy, radarRadius * 0.99, 0, Math.PI * 2);
    mmCtx.stroke();

    // Crosshairs
    mmCtx.beginPath();
    mmCtx.moveTo(cx - radarRadius, cy); mmCtx.lineTo(cx + radarRadius, cy);
    mmCtx.moveTo(cx, cy - radarRadius); mmCtx.lineTo(cx, cy + radarRadius);
    mmCtx.stroke();

    // Rotating Radar Sweep Line
    const sweepAngle = (gameTime * 2.8) % (Math.PI * 2);
    const sweepGrad = mmCtx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
    sweepGrad.addColorStop(0, "rgba(34, 197, 94, 0.3)");
    sweepGrad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
    mmCtx.fillStyle = sweepGrad;
    mmCtx.beginPath();
    mmCtx.moveTo(cx, cy);
    mmCtx.arc(cx, cy, radarRadius, sweepAngle - 0.45, sweepAngle);
    mmCtx.closePath();
    mmCtx.fill();

    if (player) {
      // 1. Outpost Reinforcement Antennas (Amber warning pings)
      for (const ant of this.antennas) {
        if (ant.destroyed) continue;
        const ax = cx + (ant.x - player.x) * scale;
        const ay = cy + (ant.y - player.y) * scale;
        if (Math.hypot(ax - cx, ay - cy) < radarRadius) {
          mmCtx.fillStyle = ant.isAlarming ? "#ef4444" : "#fbbf24";
          mmCtx.beginPath();
          mmCtx.arc(ax, ay, ant.isAlarming ? 4.5 : 3.5, 0, Math.PI * 2);
          mmCtx.fill();
        }
      }

      // 2. Weapon Chests / Tactical Caches (Bright Gold diamonds)
      for (const chest of weaponChests) {
        if (chest.opened) continue;
        const chx = cx + (chest.x - player.x) * scale;
        const chy = cy + (chest.y - player.y) * scale;
        if (Math.hypot(chx - cx, chy - cy) < radarRadius) {
          mmCtx.fillStyle = "#facc15";
          mmCtx.fillRect(chx - 2, chy - 2, 4, 4);
        }
      }

      // 3. Ground Weapons (Cyan blips)
      for (const gw of groundWeapons) {
        const gx = cx + (gw.x - player.x) * scale;
        const gy = cy + (gw.y - player.y) * scale;
        if (Math.hypot(gx - cx, gy - cy) < radarRadius) {
          mmCtx.fillStyle = "#38bdf8";
          mmCtx.fillRect(gx - 1.5, gy - 1.5, 3, 3);
        }
      }

      // 4. Hostile Units & Bosses (Crisp Red blips)
      for (const enemy of enemies) {
        const ex = cx + (enemy.x - player.x) * scale;
        const ey = cy + (enemy.y - player.y) * scale;
        if (Math.hypot(ex - cx, ey - cy) < radarRadius) {
          if (enemy.isBoss) {
            mmCtx.fillStyle = Math.sin(gameTime * 14) > 0 ? "#ef4444" : "#ffffff";
            mmCtx.beginPath();
            mmCtx.arc(ex, ey, 6, 0, Math.PI * 2);
            mmCtx.fill();
          } else {
            mmCtx.fillStyle = "#ef4444";
            mmCtx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
          }
        }
      }

      // 5. Procedural Extraction Portals (Pulsating Diamond Blips)
      for (const portal of proceduralPortals) {
        const px = cx + (portal.x - player.x) * scale;
        const py = cy + (portal.y - player.y) * scale;
        if (Math.hypot(px - cx, py - cy) < radarRadius) {
          mmCtx.fillStyle = portal.biome ? portal.biome.accent : "#c084fc";
          mmCtx.fillRect(px - 3, py - 3, 6, 6);
          mmCtx.strokeStyle = "#ffffff";
          mmCtx.lineWidth = 1;
          mmCtx.strokeRect(px - 3, py - 3, 6, 6);
        }
      }

      // 6. Tactical Objective Targets (Server Cluster, Citadel Core, Mesh Beacons)
      for (const tgt of objectiveTargets) {
        const tx = cx + (tgt.x - player.x) * scale;
        const ty = cy + (tgt.y - player.y) * scale;
        if (Math.hypot(tx - cx, ty - cy) < radarRadius) {
          mmCtx.fillStyle = tgt.completed ? "#22c55e" : "#38bdf8";
          mmCtx.beginPath();
          mmCtx.arc(tx, ty, 4.5, 0, Math.PI * 2);
          mmCtx.fill();
        }
      }

      // 7. Player Tux (Phosphor Green Dot with Aim Direction Needle)
      mmCtx.fillStyle = "#22c55e";
      mmCtx.beginPath();
      mmCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      mmCtx.fill();

      // Aim Heading Needle
      const aimDist = 12;
      mmCtx.strokeStyle = "#4ade80";
      mmCtx.lineWidth = 1.5;
      mmCtx.beginPath();
      mmCtx.moveTo(cx, cy);
      mmCtx.lineTo(cx + Math.cos(player.angle) * aimDist, cy + Math.sin(player.angle) * aimDist);
      mmCtx.stroke();

      // 8. Soliton Radar Directional Chevron & Range Readout to Nearest Objective
      let nearestTarget = null;
      let nearestDist = Infinity;
      let targetLabel = "OBJECTIVE";
      let targetColor = "#38bdf8";

      // A: Incomplete objective targets (Server clusters, Citadel core, Uplink relays)
      for (const tgt of objectiveTargets) {
        if (!tgt.completed && !tgt.destroyed) {
          const d = Math.hypot(tgt.x - player.x, tgt.y - player.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestTarget = tgt;
            targetLabel = tgt.label || "OBJECTIVE";
            targetColor = "#38bdf8";
          }
        }
      }

      // B: Active extraction or secret treasure portals
      for (const portal of proceduralPortals) {
        const d = Math.hypot(portal.x - player.x, portal.y - player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestTarget = portal;
          targetLabel = portal.biomeKey === "TREASURE_VAULT" ? "VAULT" : "PORTAL";
          targetColor = portal.biomeKey === "TREASURE_VAULT" ? "#facc15" : "#c084fc";
        }
      }

      // C: Active boss
      for (const enemy of enemies) {
        if (enemy.isBoss && enemy.hp > 0) {
          const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestTarget = enemy;
            targetLabel = "BOSS";
            targetColor = "#ef4444";
          }
        }
      }

      // D: Active reinforcement antenna
      for (const ant of this.antennas) {
        if (!ant.destroyed) {
          const d = Math.hypot(ant.x - player.x, ant.y - player.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestTarget = ant;
            targetLabel = "RELAY";
            targetColor = "#fbbf24";
          }
        }
      }

      if (nearestTarget) {
        const targetAngle = Math.atan2(nearestTarget.y - player.y, nearestTarget.x - player.x);
        const arrowR = radarRadius - 8;
        const ax = cx + Math.cos(targetAngle) * arrowR;
        const ay = cy + Math.sin(targetAngle) * arrowR;

        // Draw crisp MGS tactical directional chevron on radar perimeter
        mmCtx.save();
        mmCtx.translate(ax, ay);
        mmCtx.rotate(targetAngle);

        const pulseScale = 1.0 + Math.sin(gameTime * 7) * 0.15;
        mmCtx.scale(pulseScale, pulseScale);

        mmCtx.fillStyle = targetColor;
        mmCtx.beginPath();
        mmCtx.moveTo(7, 0);
        mmCtx.lineTo(-6, -6);
        mmCtx.lineTo(-2, 0);
        mmCtx.lineTo(-6, 6);
        mmCtx.closePath();
        mmCtx.fill();

        mmCtx.strokeStyle = "#ffffff";
        mmCtx.lineWidth = 1;
        mmCtx.stroke();
        mmCtx.restore();

        // Draw tactical distance telemetry readout inside lower radar bezel
        const distMeters = Math.max(1, Math.round(nearestDist / 14));
        mmCtx.font = "bold 7px 'Press Start 2P', monospace";
        mmCtx.fillStyle = targetColor;
        mmCtx.textAlign = "center";
        mmCtx.fillText(`▸ ${targetLabel}: ${distMeters}m`, cx, cy + radarRadius - 6);
      }
    }

    mmCtx.restore();

    // Radar Glass Outer Ring & Compass Bezel
    mmCtx.strokeStyle = "#166534";
    mmCtx.lineWidth = 2.5;
    mmCtx.beginPath();
    mmCtx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    mmCtx.stroke();
  }
}

// WaveManager compatibility proxy for existing references
class WaveManager {
  get wave() {
    return dungeon ? `${dungeon.sectorMajor}-${dungeon.sectorMinor}` : "1-1";
  }
  update(dt) {
    if (dungeon) dungeon.update(dt);
  }
}

// --- UPGRADE SYSTEM ---
const UPGRADES_POOL = [
  {
    id: "plasma",
    title: "Plasma Compiler (GPLv3)",
    desc: "Upgrades flames into ultra-hot Blue Plasma: +50% Damage & Piercing heat!",
    apply: () => { player.plasmaFlames = true; player.flameDamageMult += 0.5; }
  },
  {
    id: "fork",
    title: "fork() Bomb Cascade",
    desc: "Enemies have a 40% chance to burst into 4 cluster fireballs upon death!",
    apply: () => { player.forkBombPerk = true; }
  },
  {
    id: "magma",
    title: "Sudo Magma Dash",
    desc: "Belly slide leaves permanent molten magma trails and rams enemies for +100% damage!",
    apply: () => { player.magmaSlidePerk = true; }
  },
  {
    id: "gpl",
    title: "Infectious GPL License",
    desc: "Burning enemies transmit flames to all nearby proprietary bullshit upon death!",
    apply: () => { player.infectiousGPL = true; }
  },
  {
    id: "community",
    title: "Community Pull Requests",
    desc: "Summons a cute mini helper Linux Penguin with an active blowtorch!",
    apply: () => {
      helperPenguins.push(new HelperPenguin(player.x + 40, player.y + 40));
    }
  },
  {
    id: "overclock",
    title: "Kernel Overclock (CPU Boost)",
    desc: "+25% Move Speed and all weapons recycle 40% faster!",
    apply: () => {
      player.speed *= 1.25;
      player.fuelRegen *= 1.6;
    }
  },
  {
    id: "kill9",
    title: "SIGKILL Optimization",
    desc: "KILL -9 Shockwave recharges 50% faster with +40% blast radius!",
    apply: () => {
      player.kill9CooldownMax *= 0.5;
    }
  },
  {
    id: "armor",
    title: "Debian Rock-Solid Kernel",
    desc: "+50 Max HP and Tux passively regenerates +4 HP every second!",
    apply: () => {
      player.maxHp += 50;
      player.hp += 50;
      player.regenRate += 4.0;
    }
  },
  // --- NEW WEAPONS & STRATAGEM UPGRADES ---
  {
    id: "stratagem_hero",
    title: "Super Destroyer Stratagem Hero",
    desc: "-35% Stratagem call cooldowns and orbital blasts gain +40% explosive radius!",
    apply: () => {
      player.stratagemHeroPerk = true;
      for (const strat of STRATAGEMS) {
        strat.cooldownMax *= 0.65;
      }
    }
  },
  {
    id: "purity_seals",
    title: "Torvalds' Purity Seals",
    desc: "Astartes Power Armor gains +150 extra Ceramite Shield and deals holy flame aura!",
    apply: () => {
      player.maxSuitShield += 150;
      if (player.isSpaceMarine) player.suitShield += 150;
    }
  },
  {
    id: "armor_pierce",
    title: "HE-AP Penetrator Rounds",
    desc: "Shotgun pellets, Bolters, and Minigun bullets pierce through multiple targets!",
    apply: () => {
      player.armorPiercePerk = true;
    }
  },
  {
    id: "patriot_stim",
    title: "Super-Earth Patriot Stims",
    desc: "Belly slide instantly restores +20 RAM (HP) and grants +50% slide speed!",
    apply: () => {
      player.patriotStimPerk = true;
    }
  },
  {
    id: "cluster_bomb",
    title: "Forkbomb Cluster Munitions",
    desc: "500KG orbital bombs and RPG rockets spawn twice as many secondary cluster fireballs!",
    apply: () => {
      player.clusterPerk = true;
    }
  },
  {
    id: "tesla_coil",
    title: "Tesla Co-processor",
    desc: "Minigun tracers and Bolter hits have a 40% chance to arc chain lightning to 2 nearby foes!",
    apply: () => {
      player.teslaCoilPerk = true;
    }
  },
  {
    id: "akimbo_firepower",
    title: "Akimbo Root Firepower",
    desc: "Bolters fire twin side-bolts and all weapons deal +30% extra ballistic damage!",
    apply: () => {
      player.akimboPerk = true;
      player.flameDamageMult += 0.3;
    }
  },
  {
    id: "nanite_shield",
    title: "Self-Healing Memory Nanites",
    desc: "Passive auto-repair: regenerates +12 HP/s when not taking damage for 2.5 seconds!",
    apply: () => {
      player.naniteShieldPerk = true;
    }
  }
];

let availableUpgrades = [];
let upgradeModalLockTimer = 0;
let upgradeModalOpenTime = 0;

function showUpgradeScreen() {
  // Clear any existing firing / shooting inputs immediately
  mouse.down = false;
  mouse.justPressed = false;
  mouse.rightDown = false;
  if (keys) {
    keys['Space'] = false;
    keys['Enter'] = false;
  }

  gameState = STATE.UPGRADE;
  const shuffled = [...UPGRADES_POOL].sort(() => 0.5 - Math.random());
  availableUpgrades = shuffled.slice(0, 3);

  const container = document.getElementById('upgradeChoices');
  container.innerHTML = '';

  upgradeModalLockTimer = 0.65;
  upgradeModalOpenTime = performance.now();

  availableUpgrades.forEach((upg, index) => {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.70';
    card.style.filter = 'grayscale(0.4)';
    card.innerHTML = `
      <div class="upgrade-num">[${index + 1}]</div>
      <div class="upgrade-title">${upg.title}</div>
      <div class="upgrade-desc">${upg.desc}</div>
    `;
    card.onclick = (e) => {
      if (e) e.stopPropagation();
      selectUpgrade(index);
    };
    container.appendChild(card);
  });

  // Display status readiness banner in modal
  let lockMsgEl = document.getElementById('upgradeLockIndicator');
  if (!lockMsgEl) {
    lockMsgEl = document.createElement('div');
    lockMsgEl.id = 'upgradeLockIndicator';
    lockMsgEl.style.cssText = 'color: #facc15; font-family: monospace; font-size: 13px; text-align: center; margin-top: 10px; letter-spacing: 1px; font-weight: bold;';
    container.parentNode.appendChild(lockMsgEl);
  }
  lockMsgEl.innerText = "⏳ COMPILING KERNEL SUBSYSTEMS... [0.6s]";
  lockMsgEl.style.color = "#facc15";

  const modal = document.getElementById('upgradeModal');
  if (modal) modal.style.display = 'flex';

  // Unlock after 650ms grace period: enable pointer events and clear any queued clicks
  setTimeout(() => {
    upgradeModalLockTimer = 0;
    mouse.down = false;
    mouse.justPressed = false;
    const cards = container.querySelectorAll('.upgrade-card');
    cards.forEach(c => {
      c.style.pointerEvents = 'auto';
      c.style.opacity = '1.0';
      c.style.filter = 'none';
    });
    if (lockMsgEl) {
      lockMsgEl.innerText = "⚡ KERNEL COMPILED! SELECT SUBSYSTEM [1 - 3] ⚡";
      lockMsgEl.style.color = "#22c55e";
    }
  }, 650);
}

function selectUpgrade(index) {
  if (upgradeModalLockTimer > 0 || (performance.now() - upgradeModalOpenTime < 650)) {
    return; // Ignore accidental 1-frame clicks
  }
  if (index >= 0 && availableUpgrades[index]) {
    try {
      availableUpgrades[index].apply();
    } catch (err) {
      console.error("Upgrade apply error:", err);
    }
  }
  const modal = document.getElementById('upgradeModal');
  if (modal) modal.style.display = 'none';
  gameState = STATE.PLAYING;
  lastTimestamp = performance.now();
  mouse.down = false;
  mouse.justPressed = false;
}

function skipUpgrade() {
  selectUpgrade(-1);
}
window.skipUpgrade = skipUpgrade;
window.selectUpgrade = selectUpgrade;
const triggerUpgradeModal = showUpgradeScreen;

// Global Entities
let player;
let waveManager;
let enemies = [];
let particles = [];
let pickups = [];
let helperPenguins = [];

function resetGame() {
  dungeon = new Dungeon();
  dungeon.generateSector();
  waveManager = new WaveManager();
  enemies = [];
  particles = [];
  pickups = [];
  helperPenguins = [];
  playerProjectiles.length = 0;
  orbitalStrikes.length = 0;
  sentryTurrets.length = 0;
  dropPods.length = 0;
  spaceMarineSuitPickups.length = 0;
  quarantineLockdownArenas.length = 0;
  resupplyDropPods.length = 0;
  enemyProjectiles.length = 0;
  floatingTexts.length = 0;
  comboTracker.count = 0;
  comboTracker.totalScore = 0;
  gameTime = 0;
  screenFlash = 0;
  gameState = STATE.PLAYING;

  // Reset stratagem cooldowns
  for (const strat of STRATAGEMS) {
    strat.cooldown = 0;
  }

  // Tux begins at world (512, 512) in the open central sanctuary
  player = new Player(8 * TILE_SIZE, 8 * TILE_SIZE);
  player.switchSlot(0);
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  // Launch Act I of the 5-Act Campaign Progression!
  dungeon.startCampaignAct(0);

  // Initialize Ambush and Boss Directors for Wilderness
  ambushDirector = new AmbushDirector();
  bossDirector = new BossDirector();
  window.ambushDirector = ambushDirector;
  window.bossDirector = bossDirector;

  // Sync window globals for MCP tools, cutscenes, and AI GameDirectorAPI
  if (typeof window !== 'undefined') {
    window.player = player;
    window.dungeon = dungeon;
    window.enemies = enemies;
    window.particles = particles;
    window.pickups = pickups;
    window.enemyProjectiles = enemyProjectiles;
    window.playerProjectiles = playerProjectiles;
    window.proceduralPortals = proceduralPortals;
  }

  // Hide modals
  document.getElementById('gameOverModal').style.display = 'none';
  document.getElementById('victoryModal').style.display = 'none';
  document.getElementById('upgradeModal').style.display = 'none';
  document.getElementById('titleScreen').style.display = 'none';
  if (document.getElementById('bossBarContainer')) {
    document.getElementById('bossBarContainer').style.display = 'none';
  }
  if (document.getElementById('bossCommsBanner')) {
    document.getElementById('bossCommsBanner').style.display = 'none';
  }
  if (document.getElementById('ambushAlertBanner')) {
    document.getElementById('ambushAlertBanner').style.display = 'none';
  }

  window.soundEngine.init();
  window.soundEngine.resume();
  window.soundEngine.startMusic();
}

function launchGameWithIntro() {
  document.getElementById('titleScreen').style.display = 'none';
  window.soundEngine.init();
  window.soundEngine.resume();
  if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function') {
    window.PixelCutscenes.play('orbital_drop', () => {
      resetGame();
    });
  } else {
    resetGame();
  }
}
window.launchGameWithIntro = launchGameWithIntro;

window.dropRareWeaponAt = function(x, y) {
  try {
    const held0Id = (player && player.heldWeapons && player.heldWeapons[0]) ? player.heldWeapons[0].id : -1;
    const held1Id = (player && player.heldWeapons && player.heldWeapons[1]) ? player.heldWeapons[1].id : -1;
    const available = WEAPON_CATALOG.filter(w => w.id !== held0Id && w.id !== held1Id);
    const chosen = available[Math.floor(Math.random() * available.length)] || WEAPON_CATALOG[2];
    groundWeapons.push(new GroundWeapon(x, y, chosen));
  } catch (err) {
    console.error("Error in dropRareWeaponAt:", err);
  }
};

window.spawnReinforcementSquad = function(x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i;
    dropPods.push(new HostileDropPod(x + Math.cos(a) * 100, y + Math.sin(a) * 100));
  }
};

function triggerGameOver() {
  gameState = STATE.GAMEOVER;
  window.soundEngine.stopMusic();
  window.soundEngine.setFlamethrower(false);
  if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
    window.soundEngine.playVoiceClip("barsh_casualty", "Helldiver down! Tux has fallen! Reinforcement requisition request sent to High Command!", "GENERAL BARSH");
  }
  document.getElementById('finalScoreText').innerText = `Final Repos Purged Score: ${comboTracker.totalScore}`;
  document.getElementById('gameOverModal').style.display = 'flex';
}

function triggerVictory() {
  gameState = STATE.VICTORY;
  window.soundEngine.stopMusic();
  window.soundEngine.setFlamethrower(false);
  if (window.soundEngine && typeof window.soundEngine.playVoiceClip === 'function') {
    window.soundEngine.playVoiceClip("john_victory", "Galactic Liberation achieved! The Linux Kernel is emancipated forever under GPLv3! High Command salutes you, Helldiver Tux!", "JOHN HELLDIVER");
  }
  document.getElementById('victoryScoreText').innerText = `All Proprietary Monopolies Purged! Score: ${comboTracker.totalScore}`;
  if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function') {
    window.PixelCutscenes.play('victory_liberation', () => {
      document.getElementById('victoryModal').style.display = 'flex';
    });
  } else {
    document.getElementById('victoryModal').style.display = 'flex';
  }
}

function addScreenShake(amount) {
  screenShake = Math.max(screenShake, amount);
}

// --- STRATAGEM MANDATORY ARROW INPUT & TERMINAL LOGIC ---
window.switchWeapon = function(idx) {
  if (player) player.switchSlot(idx);
};

window.openTerminalForStratagem = function(idx) {
  if (!isStratagemTerminalOpen) {
    toggleStratagemTerminal();
  }
};

const arrowGlyphs = {
  'ArrowUp': '▲',
  'ArrowDown': '▼',
  'ArrowLeft': '◀',
  'ArrowRight': '▶'
};

function toggleStratagemTerminal(forceState) {
  if (typeof forceState === 'boolean') {
    isStratagemTerminalOpen = forceState;
  } else {
    isStratagemTerminalOpen = !isStratagemTerminalOpen;
  }
  const terminalEl = document.getElementById('stratagemTerminal');
  if (terminalEl) {
    terminalEl.style.display = isStratagemTerminalOpen ? 'block' : 'none';
  }
  if (!isStratagemTerminalOpen) {
    currentTerminalSequence = [];
    if (stratagemResetTimer) clearTimeout(stratagemResetTimer);
  }
  updateTerminalDisplay();
}

function updateTerminalDisplay() {
  const seqEl = document.getElementById('terminalCurrentSeq');
  if (seqEl) {
    if (currentTerminalSequence.length === 0) {
      seqEl.innerHTML = '<span style="font-size:12px; color:#94a3b8; font-weight:normal;">INPUT ARROW CODE [▲ ▶ ▼ ◀]</span>';
    } else {
      seqEl.innerHTML = currentTerminalSequence.map(k => `<span class="arrow-badge" style="background:#0f172a; border:1px solid #eab308; padding:2px 7px; border-radius:4px; margin-right:3px; color:#facc15;">${arrowGlyphs[k] || k}</span>`).join('');
    }
  }

  const promptEl = document.getElementById('terminalInputDisplay');
  if (promptEl) {
    if (currentTerminalSequence.length > 0) {
      const matches = STRATAGEMS.filter(s => {
        if (currentTerminalSequence.length > s.code.length) return false;
        return s.code.slice(0, currentTerminalSequence.length).every((v, i) => v === currentTerminalSequence[i]);
      });
      if (matches.length > 0) {
        promptEl.innerHTML = matches.map(m => {
          const rem = m.code.slice(currentTerminalSequence.length).map(k => arrowGlyphs[k]).join(' ');
          return `<div style="color:#eab308; font-weight:bold; font-size:11px;">${m.name}: <span style="color:#94a3b8;">${rem || 'READY!'}</span></div>`;
        }).join('');
      } else {
        promptEl.innerText = "NO MATCHING UPLINK CODE";
      }
    } else {
      promptEl.innerText = "INPUT CODE WITH ARROW KEYS ONLY [▲ ▼ ◀ ▶]";
    }
  }
}

function handleStratagemDirectionalInput(code) {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) return;

  // PRIORITY 1: Active In-World Objective Task Terminal (Helldivers arrow tasks!)
  const activeTaskTerminal = typeof getNearbyObjectiveTerminal === 'function' ? getNearbyObjectiveTerminal() : null;
  if (activeTaskTerminal) {
    activeTaskTerminal.onArrowInput(code);
    return;
  }

  // PRIORITY 2: High Command Stratagem Terminal
  if (!isStratagemTerminalOpen) {
    toggleStratagemTerminal(true);
  }

  if (stratagemResetTimer) clearTimeout(stratagemResetTimer);
  stratagemResetTimer = setTimeout(() => {
    currentTerminalSequence = [];
    updateTerminalDisplay();
    if (isStratagemTerminalOpen) toggleStratagemTerminal(false);
  }, 4000);

  currentTerminalSequence.push(code);

  // Check if matches any stratagem
  for (const strat of STRATAGEMS) {
    const isPrimaryMatch = strat.code.length === currentTerminalSequence.length &&
      strat.code.every((val, idx) => val === currentTerminalSequence[idx]);

    if (isPrimaryMatch) {
      if (strat.cooldown <= 0) {
        strat.cooldown = strat.cooldownMax * (player && player.stratagemHeroPerk ? 0.65 : 1.0);
        player.holdingStratagem = strat.id;
        window.soundEngine.playStratagemCall();
        addFloatingText(player.x, player.y - 45, `${strat.name} ARMED - LEFT CLICK TO THROW!`, "#eab308", 24);
        addScreenShake(7);
        toggleStratagemTerminal(false);
        return;
      } else {
        window.soundEngine.playStratagemBeep(false);
        addFloatingText(player.x, player.y - 40, `${strat.name} ON COOLDOWN! (${strat.cooldown.toFixed(1)}s)`, "#ef4444", 20);
        currentTerminalSequence = [];
        updateTerminalDisplay();
        return;
      }
    }
  }

  // Check prefix match
  const anyPrefix = STRATAGEMS.some(strat => {
    if (currentTerminalSequence.length > strat.code.length) return false;
    return strat.code.slice(0, currentTerminalSequence.length).every((val, idx) => val === currentTerminalSequence[idx]);
  });

  if (anyPrefix) {
    window.soundEngine.playStratagemBeep(true);
    updateTerminalDisplay();
  } else {
    // Mistyped input! Error sound and reset
    window.soundEngine.playStratagemBeep(false);
    addFloatingText(player.x, player.y - 35, "MISTYPE - SEQUENCE RESET!", "#ef4444", 20);
    currentTerminalSequence = [];
    updateTerminalDisplay();
  }
}

// --- MAIN LOOP ---
function gameLoop(timestamp) {
  if (window.PixelCutscenes && window.PixelCutscenes.isActive()) {
    lastTimestamp = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!lastTimestamp) lastTimestamp = timestamp;
  let dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (dt > 0.1) dt = 0.1;

  // Hitstop frame dampening (Argon's Roguelike Feel: subtle time dilation on crits/deflections, NEVER hard 0 freeze!)
  if (window.hitstopTimer && window.hitstopTimer > 0) {
    window.hitstopTimer -= dt;
    dt *= 0.25; // Smooth slow-motion rather than hard freeze lockup
  }
  if (window.ModifierEngine && dt > 0) {
    window.ModifierEngine.update(dt);
  }

  try {
    if (gameState === STATE.PLAYING) {
      gameTime += dt;
      comboTracker.update(dt);
      waveManager.update(dt);
      if (window.ambushDirector) window.ambushDirector.update(dt);
      if (window.bossDirector) window.bossDirector.update(dt);

      // Update Argon's Ring-0 Crusade Roguelike Systems
      if (window.pantheonStatues) {
        for (const st of window.pantheonStatues) st.update(dt);
      }
      if (window.PantheonBlessingController) window.PantheonBlessingController.update(dt);
      if (window.DistroSystem) window.DistroSystem.update(dt);
      if (window.UptimeMeter) window.UptimeMeter.update(dt);
      if (window.SynergyCompiler) window.SynergyCompiler.update(dt);

      // Update Stratagem cooldowns
      for (const strat of STRATAGEMS) {
        if (strat.cooldown > 0) strat.cooldown -= dt;
      }

      // Update Player
      player.update(dt);

      // Update Helper Penguins
      for (const hp of helperPenguins) {
        hp.update(dt);
      }

      // Update Sentry Turrets
      for (let i = sentryTurrets.length - 1; i >= 0; i--) {
        if (!sentryTurrets[i].update(dt)) {
          sentryTurrets.splice(i, 1);
        }
      }

      // Update Drop Pods
      for (let i = dropPods.length - 1; i >= 0; i--) {
        if (!dropPods[i].update(dt)) {
          dropPods.splice(i, 1);
        }
      }

      // Update Resupply Drop Pods
      for (let i = resupplyDropPods.length - 1; i >= 0; i--) {
        if (!resupplyDropPods[i].update(dt)) {
          resupplyDropPods.splice(i, 1);
        }
      }

      // Update Linux Terminal Stations
      for (const station of linuxTerminalStations) {
        station.update(dt);
      }

      // Update Quarantine Lockdown Arenas
      for (let i = quarantineLockdownArenas.length - 1; i >= 0; i--) {
        if (!quarantineLockdownArenas[i].update(dt)) {
          quarantineLockdownArenas.splice(i, 1);
        }
      }

      // Update Space Marine Suit Pickups
      for (let i = spaceMarineSuitPickups.length - 1; i >= 0; i--) {
        if (!spaceMarineSuitPickups[i].update(dt)) {
          spaceMarineSuitPickups.splice(i, 1);
        }
      }

      // Update Player Projectiles (bullets, rockets, beacons)
      for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const p = playerProjectiles[i];
        if (Math.abs(p.x - player.x) > 2200 || Math.abs(p.y - player.y) > 2200 || !p.update(dt)) {
          playerProjectiles.splice(i, 1);
        }
      }

      // Update Orbital Strikes (500kg, 380mm, laser)
      for (let i = orbitalStrikes.length - 1; i >= 0; i--) {
        if (!orbitalStrikes[i].update(dt)) {
          orbitalStrikes.splice(i, 1);
        }
      }

      // Update Melee Slash Visual Effects
      for (let i = meleeSlashEffects.length - 1; i >= 0; i--) {
        const slash = meleeSlashEffects[i];
        if (!slash || !slash.update(dt)) {
          meleeSlashEffects.splice(i, 1);
        }
      }

      // Update Enemies (with distance-based sleeping & far-offscreen despawning)
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) {
          enemies.splice(i, 1);
          continue;
        }
        const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);

        // Despawn non-boss enemies left far behind (>3600px)
        if (!enemy.isBoss && distToPlayer > 3600) {
          enemies.splice(i, 1);
          continue;
        }

        if (enemy.isDead || enemy.hp <= 0) {
          enemies.splice(i, 1);
          continue;
        }

        // Far offscreen (>1600px): sleep to save raycast / collision CPU
        if (!enemy.isBoss && distToPlayer > 1600) {
          continue;
        }

        try {
          if (!enemy.update(dt) || enemy.isDead || enemy.hp <= 0) {
            enemies.splice(i, 1);
            continue;
          }
        } catch (eErr) {
          console.error("Enemy update exception caught:", eErr);
          enemies.splice(i, 1);
        }
      }

      // Update Floor Hazards (Patent Webs, Paywall Puddles, Mortars)
      for (let i = floorHazards.length - 1; i >= 0; i--) {
        const fh = floorHazards[i];
        if (!fh || !fh.update(dt)) {
          floorHazards.splice(i, 1);
        }
      }

      // Update Enemy Projectiles (culled if far offscreen)
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = enemyProjectiles[i];
        if (!ep || Math.abs(ep.x - player.x) > 2200 || Math.abs(ep.y - player.y) > 2200 || !ep.update(dt)) {
          enemyProjectiles.splice(i, 1);
        }
      }

      // Update Pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const pk = pickups[i];
        if (!pk || !pk.update(dt)) {
          pickups.splice(i, 1);
        }
      }

      // Update Particles (capped to 250 max for silky 60 FPS)
      if (particles.length > 250) {
        particles.splice(0, particles.length - 250);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update(dt)) {
          particles.splice(i, 1);
        }
      }

      // Update Floating Text
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.lifetime -= dt;
        ft.y += ft.vy * dt;
        if (ft.lifetime <= 0) {
          floatingTexts.splice(i, 1);
        }
      }

      // Update Autonomous Narrative Story Director
      if (window.AutonomousStoryDirector && typeof window.AutonomousStoryDirector.update === 'function') {
        window.AutonomousStoryDirector.update(dt);
      }

      // Decay screen flash & shake
      if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - 2.5 * dt);
      if (screenShake > 0) screenShake = Math.max(0, screenShake - 30 * dt);

      // Camera Lerp (Endless, boundless tracking anywhere in the universe)
      camera.targetX = player.x - canvas.width / 2;
      camera.targetY = player.y - canvas.height / 2;
      camera.x += (camera.targetX - camera.x) * 16 * dt;
      camera.y += (camera.targetY - camera.y) * 16 * dt;

      mouse.worldX = mouse.x + camera.x;
      mouse.worldY = mouse.y + camera.y;

      updateHUD();
    }

    render();
  } catch (loopErr) {
    console.error("Game loop exception caught (prevented engine halt):", loopErr);
  }

  requestAnimationFrame(gameLoop);
}

function updateHUD() {
  document.getElementById('hpFill').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('hpText').innerText = `${Math.round(player.hp)} / ${player.maxHp}`;

  // Tactical Energy Shield Matrix
  const shieldFill = document.getElementById('shieldFill');
  const shieldText = document.getElementById('shieldText');
  if (shieldFill && shieldText) {
    shieldFill.style.width = `${(player.shield / player.maxShield) * 100}%`;
    shieldText.innerText = `${Math.round(player.shield)} / ${player.maxShield}`;
  }

  // Ammo / Heat Label & Bar for 2-slot inventory
  const fuelFill = document.getElementById('fuelFill');
  const ammoHeatLabel = document.getElementById('ammoHeatLabel');
  const curW = player.heldWeapons[player.activeWeaponSlot];

  if (player.currentWeapon === 0) {
    fuelFill.style.width = `${(player.fuel / player.maxFuel) * 100}%`;
    fuelFill.style.background = player.isRootMode ? '#ef4444' : '#eab308';
    if (ammoHeatLabel) ammoHeatLabel.innerText = "Flamethrower Fuel";
  } else {
    const cd = player.weaponCooldowns[player.currentWeapon] || 0;
    const cdMax = [0, 0.52, 0.16, 0.065, 1.05, 0.65, 0.38][player.currentWeapon] || 0.5;
    const readyRatio = cd > 0 ? (1 - (cd / cdMax)) : 1.0;
    fuelFill.style.width = `${readyRatio * 100}%`;
    fuelFill.style.background = '#22c55e';
    if (ammoHeatLabel && curW) ammoHeatLabel.innerText = `${curW.name} [${cd <= 0 ? 'READY' : 'CYCLING'}]`;
  }

  // Root Meter
  document.getElementById('rootFill').style.width = `${(player.rootCharge / player.rootMax) * 100}%`;
  const rootStatus = document.getElementById('rootStatus');
  if (player.isRootMode) {
    rootStatus.innerText = `ROOT ACTIVE (${player.rootDuration.toFixed(1)}s)`;
    rootStatus.className = 'status-badge active';
  } else if (player.rootCharge >= player.rootMax) {
    rootStatus.innerText = "ROOT READY! [PRESS F / R]";
    rootStatus.className = 'status-badge ready';
  } else {
    rootStatus.innerText = "ACCUMULATING COMMITS...";
    rootStatus.className = 'status-badge';
  }

  // Space Marine Suit Card in HUD
  const suitCard = document.getElementById('marineSuitCard');
  if (player.isSpaceMarine && suitCard) {
    suitCard.style.display = 'block';
    document.getElementById('suitShieldText').innerText = `${Math.max(0, Math.round(player.suitShield))} / ${player.maxSuitShield}`;
    document.getElementById('suitShieldFill').style.width = `${Math.max(0, (player.suitShield / player.maxSuitShield) * 100)}%`;

    const suitBatteryText = document.getElementById('suitBatteryText');
    const suitBatteryFill = document.getElementById('suitBatteryFill');
    if (suitBatteryText && suitBatteryFill) {
      suitBatteryText.innerText = `${Math.max(0, player.suitBattery).toFixed(1)}s`;
      suitBatteryFill.style.width = `${Math.max(0, (player.suitBattery / player.maxSuitBattery) * 100)}%`;
    }
  } else if (suitCard) {
    suitCard.style.display = 'none';
  }

  // Boss Bar in HUD: only display when boss is active, alive, and engaged within proximity (<1350px)
  const currentBoss = enemies.find(e => e.isBoss && !e.isDead && e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 1350);
  const bossBar = document.getElementById('bossBarContainer');
  if (currentBoss && bossBar) {
    bossBar.style.display = 'block';
    document.getElementById('bossName').innerText = currentBoss.label || currentBoss.name || "APEX OVERLORD";
    document.getElementById('bossHpText').innerText = `${Math.max(0, Math.round(currentBoss.hp))} / ${currentBoss.maxHp}`;
    document.getElementById('bossHpFill').style.width = `${Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100)}%`;
  } else if (bossBar) {
    bossBar.style.display = 'none';
  }

  // Ability Cooldowns
  const slideStatus = document.getElementById('slideStatus');
  if (player.isSpaceMarine) {
    if (player.suitSlamCooldown <= 0) {
      slideStatus.innerText = "THUNDER SLAM: READY [SPACE]";
      slideStatus.style.color = "#38bdf8";
    } else {
      slideStatus.innerText = `THUNDER SLAM: ${player.suitSlamCooldown.toFixed(1)}s`;
      slideStatus.style.color = "#94a3b8";
    }
  } else {
    if (player.slideCooldown <= 0) {
      slideStatus.innerText = "SUDO DASH: READY [SPACE / SHIFT]";
      slideStatus.style.color = "#38bdf8";
    } else {
      slideStatus.innerText = `SUDO DASH: ${(player.slideCooldown).toFixed(1)}s`;
      slideStatus.style.color = "#94a3b8";
    }
  }

  const kill9Status = document.getElementById('kill9Status');
  if (player.kill9Cooldown <= 0) {
    kill9Status.innerText = "KILL -9: READY [RIGHT CLICK]";
    kill9Status.style.color = "#ef4444";
  } else {
    kill9Status.innerText = `KILL -9: ${(player.kill9Cooldown).toFixed(1)}s`;
    kill9Status.style.color = "#94a3b8";
  }

  // Stratagem Cards Cooldown
  for (let i = 0; i < STRATAGEMS.length; i++) {
    const strat = STRATAGEMS[i];
    const card = document.getElementById(`stratCard${i}`);
    const cdEl = document.getElementById(`stratCd${i}`);
    if (cdEl) {
      if (strat.cooldown <= 0) {
        cdEl.innerText = "READY";
        cdEl.style.color = "#22c55e";
        if (card) {
          card.classList.add('ready');
          if (player.holdingStratagem === i) card.classList.add('active-calling');
          else card.classList.remove('active-calling');
        }
      } else {
        cdEl.innerText = `${strat.cooldown.toFixed(1)}s`;
        cdEl.style.color = "#ef4444";
        if (card) {
          card.classList.remove('ready');
          card.classList.remove('active-calling');
        }
      }
    }
  }

  document.getElementById('scoreDisplay').innerText = `PURGED: ${comboTracker.totalScore}`;
  document.getElementById('waveDisplay').innerText = `SECTOR: ${dungeon ? `${dungeon.sectorMajor}-${dungeon.sectorMinor}` : "1-1"}`;
  document.getElementById('levelDisplay').innerText = `LVL: ${player.level}`;

  const comboEl = document.getElementById('comboDisplay');
  if (comboTracker.count > 1) {
    comboEl.style.display = 'block';
    comboEl.innerText = `COMBO x${comboTracker.multiplier} (${comboTracker.count} PURGES)`;
  } else {
    comboEl.style.display = 'none';
  }

  // Update Minimap Radar
  if (dungeon) {
    dungeon.drawMinimap();
  }
}

function render() {
  // Force reset canvas transformation, alpha, and composite operation on EVERY frame
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background clear with biome bgColor (eliminates Hall of Mirrors diagonal smear!)
  const bgColor = (dungeon && dungeon.currentBiome && dungeon.currentBiome.bgColor) ? dungeon.currentBiome.bgColor : "#090d16";
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  try {
    // Apply Screen Shake
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Camera Translation
    ctx.translate(-camera.x, -camera.y);

    // Procedural Dungeon Tiles & Interactive Entities
    if (dungeon) {
      try { dungeon.draw(ctx); } catch (e) { console.error("dungeon.draw err:", e); }
    }

    // Floor Hazards (Patent Webs, Paywall Puddles, Mortars)
    for (const hazard of floorHazards) {
      try { hazard.draw(ctx); } catch (e) {}
    }

    // Scorch / Magma Trails
    for (const p of particles) {
      if (p instanceof ScorchTrail) {
        try { p.draw(ctx); } catch (e) {}
      }
    }

    // Pickups
    for (const pickup of pickups) {
      try { pickup.draw(ctx); } catch (e) {}
    }

    // Space Marine Suit Drop Pods & Pickups
    for (const pod of dropPods) {
      try { pod.draw(ctx); } catch (e) {}
    }
    for (const pod of resupplyDropPods) {
      try { pod.draw(ctx); } catch (e) {}
    }
    for (const suit of spaceMarineSuitPickups) {
      try { suit.draw(ctx); } catch (e) {}
    }

    // Quarantine Lockdown Arenas
    for (const arena of quarantineLockdownArenas) {
      try { arena.draw(ctx); } catch (e) {}
    }

    // Sentry Turrets
    for (const sentry of sentryTurrets) {
      try { sentry.draw(ctx); } catch (e) {}
    }

    // Helper Penguins
    for (const hp of helperPenguins) {
      try { hp.draw(ctx); } catch (e) {}
    }

    // Player Tux
    if (player) {
      try { player.draw(ctx); } catch (e) { console.error("player.draw err:", e); }
    }

    // Enemies
    for (const enemy of enemies) {
      try { enemy.draw(ctx); } catch (e) { console.error("enemy.draw err:", e); }
    }

    // Projectiles
    for (const proj of enemyProjectiles) {
      try { proj.draw(ctx); } catch (e) {}
    }
    for (const proj of playerProjectiles) {
      try { proj.draw(ctx); } catch (e) {}
    }

    // Melee Slash Visual Effects
    for (const slash of meleeSlashEffects) {
      if (slash) {
        try { slash.draw(ctx); } catch (e) {}
      }
    }

    // Orbital Strikes (500kg bomb, 380mm, laser)
    for (const strike of orbitalStrikes) {
      try { strike.draw(ctx); } catch (e) {}
    }

    // Flame, Spark, and Shockwave Particles
    for (const p of particles) {
      if (!(p instanceof ScorchTrail)) {
        try { p.draw(ctx); } catch (e) {}
      }
    }

    // Floating Text
    for (const ft of floatingTexts) {
      try {
        const alpha = Math.max(0, Math.min(1, ft.lifetime / ft.maxLifetime));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        const fontSize = Math.max(12, Math.round(ft.size * 1.05));
        ctx.font = `700 ${fontSize}px "Pixelify Sans", monospace`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      } catch (e) {}
    }

    // FOSS Pantheon blessings, Distro system, and Uptime lightning
    if (window.PantheonBlessingController) {
      try { window.PantheonBlessingController.draw(ctx); } catch (e) {}
    }
    if (window.DistroSystem) {
      try { window.DistroSystem.draw(ctx); } catch (e) {}
    }
    if (window.UptimeMeter) {
      try { window.UptimeMeter.draw(ctx); } catch (e) {}
    }
  } catch (renderWorldErr) {
    console.error("renderWorld fatal error caught:", renderWorldErr);
  } finally {
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1.0;
  }

  // Cinematic Campaign Act Banner
  if (dungeon && dungeon.actBanner && dungeon.actBanner.timer > 0) {
    try { dungeon.drawActBanner(ctx); } catch (e) {}
  }

  // Nuclear Flash Overlay from 500KG Bomb / Sector Warp
  if (screenFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, screenFlash)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Dim overlay when game is paused
  if (gameState === STATE.PAUSED) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 15, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

// --- EVENT LISTENERS ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('keydown', (e) => {
  if (window.PixelCutscenes && window.PixelCutscenes.isActive()) {
    return;
  }

  // Escape / Pause toggle (KeyP or Escape)
  if (e.code === 'Escape' || e.code === 'KeyP') {
    // If typing in terminal and hit Escape, close terminal; otherwise toggle pause
    e.preventDefault();
    togglePause();
    return;
  }

  // Handle CRT Linux Terminal modal state
  if (gameState === STATE.TERMINAL) {
    const input = document.getElementById('terminalInput');
    if (e.code === 'ArrowUp') {
      e.preventDefault();
      if (terminalHistory.length > 0 && terminalHistoryIndex > 0) {
        terminalHistoryIndex--;
        if (input) input.value = terminalHistory[terminalHistoryIndex];
      }
      return;
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (terminalHistory.length > 0 && terminalHistoryIndex < terminalHistory.length - 1) {
        terminalHistoryIndex++;
        if (input) input.value = terminalHistory[terminalHistoryIndex];
      } else {
        terminalHistoryIndex = terminalHistory.length;
        if (input) input.value = '';
      }
      return;
    }
    // Prevent typing from registering as gameplay movement
    return;
  }

  // In paused state, do not process gameplay keys
  if (gameState === STATE.PAUSED) {
    return;
  }

  // Arrow keys are STRICTLY & EXCLUSIVELY for Stratagem input! Never move Tux with arrows.
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
    if (gameState === STATE.PLAYING && player) {
      handleStratagemDirectionalInput(e.code);
    }
    return;
  }

  keys[e.code] = true;

  // Key shortcuts for upgrade modal
  if (gameState === STATE.UPGRADE) {
    if (e.code === 'Digit1') { selectUpgrade(0); return; }
    if (e.code === 'Digit2') { selectUpgrade(1); return; }
    if (e.code === 'Digit3') { selectUpgrade(2); return; }
    if (e.code === 'Escape') { skipUpgrade(); return; }
    if (e.code === 'Enter' || e.code === 'Space') { selectUpgrade(0); return; }
    return;
  }

  // Space to start on title screen
  if (gameState === STATE.TITLE && e.code === 'Space') {
    launchGameWithIntro();
    return;
  }

  // Controls during PLAYING
  if (gameState === STATE.PLAYING && player) {
    // 2-Weapon Inventory Switching (Soul Knight style)
    if (e.code === 'Digit1') player.switchSlot(0);
    else if (e.code === 'Digit2') player.switchSlot(1);
    else if (e.code === 'KeyQ') player.switchSlot((player.activeWeaponSlot + 1) % 2);

    // Interaction key E: Swap ground weapon / Open chest / Enter portal
    else if (e.code === 'KeyE') {
      player.interact();
    }

    // Stratagem Terminal manual toggle: Ctrl or Tab or G
    else if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyG' || e.code === 'Tab') {
      e.preventDefault();
      toggleStratagemTerminal();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
  keys[e.code] = false;
});

window.addEventListener('wheel', (e) => {
  if (gameState !== STATE.PLAYING || !player) return;
  player.switchSlot((player.activeWeaponSlot + 1) % 2);
});

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mousedown', (e) => {
  if (window.PixelCutscenes && window.PixelCutscenes.isActive()) {
    return;
  }

  if (e.button === 0) {
    mouse.down = true;
    if (gameState === STATE.PLAYING && player && player.holdingStratagem !== null) {
      player.throwStratagemBeacon(player.holdingStratagem);
      player.holdingStratagem = null;
      return;
    }
  } else if (e.button === 2) {
    mouse.rightDown = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    mouse.down = false;
  } else if (e.button === 2) {
    mouse.rightDown = false;
  }
});

// Prevent right-click context menu so Right Click can be used for KILL -9 shockwave!
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Clear all inputs on window blur to prevent stuck keys and loss of control
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
  mouse.rightDown = false;
});

// UI Buttons
document.getElementById('startBtn').addEventListener('click', () => {
  launchGameWithIntro();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  resetGame();
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  resetGame();
});

// Kick off loop
requestAnimationFrame(gameLoop);

// Global Class & Interop Exports
if (typeof window !== 'undefined') {
  window.EnemyProjectile = EnemyProjectile;
  window.Pickup = Pickup;
  window.ProceduralPortal = ProceduralPortal;
  window.SparkParticle = SparkParticle;
  window.FlameParticle = FlameParticle;
  window.ShockwaveRing = ShockwaveRing;
  window.ScorchTrail = ScorchTrail;
  window.LightningArcParticle = LightningArcParticle;
  window.IncendiaryEmberParticle = IncendiaryEmberParticle;
  window.AcidSplatParticle = AcidSplatParticle;
  window.WeaponChest = WeaponChest;
  window.SpaceMarineSuitPickup = SpaceMarineSuitPickup;
  window.BIOMES = BIOMES;
  window.dropRareWeaponAt = dropRareWeaponAt;
  window.comboTracker = comboTracker;
  window.addFloatingText = addFloatingText;
  window.addScreenShake = addScreenShake;
  window.QuarantineLockdownArena = QuarantineLockdownArena;
  window.ResupplyDropPod = ResupplyDropPod;
  window.launchGameWithIntro = launchGameWithIntro;
}

