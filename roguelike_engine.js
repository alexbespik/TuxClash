/**
 * ROGUELIKE ENGINE CORE ARCHITECTURE
 * Implements Argon's Roguelike System Architecture & Mechanics Specification:
 *  1. Event-Driven & Component-Based: CombatEventBus & ModifierEngine
 *  2. PRD (Pseudo-Random Distribution) Critical Hit Resolution
 *  3. AttackTokenPool (Anti-Spam AI & 3-Phase Telegraphing)
 *  4. Procedural Dungeon Generator (5x5 Grid, Corridors, Wave Lock-in & Room State Machine)
 *  5. Non-Vision Spatial Radar & LLM Game Master Dev Toolset
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. COMBAT EVENT BUS
  // ============================================================================
  class CombatEventBus {
    constructor() {
      this.listeners = new Map();
    }

    on(event, callback, priority = 0) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push({ callback, priority });
      this.listeners.get(event).sort((a, b) => b.priority - a.priority);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (!this.listeners.has(event)) return;
      const list = this.listeners.get(event).filter(item => item.callback !== callback);
      this.listeners.set(event, list);
    }

    emit(event, ...args) {
      if (!this.listeners.has(event)) return;
      const list = [...this.listeners.get(event)];
      for (const item of list) {
        try {
          item.callback(...args);
        } catch (err) {
          console.error(`[CombatEventBus] Error in listener for "${event}":`, err);
        }
      }
    }

    clear() {
      this.listeners.clear();
    }
  }

  const combatEventBus = new CombatEventBus();
  window.CombatEventBus = combatEventBus;

  // ============================================================================
  // 2. MODIFIER ENGINE (Passives, Statues, Buffs, Attachments)
  // ============================================================================
  class ModifierEngine {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.activeBuffs = new Map(); // buffId -> { id, duration, timer, params }
      this.statues = new Map();     // statueId -> { id, cooldown, timer, effect }
      this.setupDefaultHooks();
    }

    setupDefaultHooks() {
      // 1. OnWeaponFire hook
      this.eventBus.on('OnWeaponFire', (shooter, weaponData, projectileList) => {
        if (!shooter) return;
        // Shotgun buff: Adds +2 projectiles to multi-shot / shotgun / burst weapons
        if (this.hasBuff('SHOTGUN_BUFF') && projectileList) {
          if (weaponData.weapon_type === 'SHOTGUN' || (weaponData.projectile_count && weaponData.projectile_count > 1)) {
            weaponData._extraProjectiles = 2;
          }
        }
        // Statue of the Berserker: boosts bullet size & damage
        if (this.hasBuff('STATUE_BERSERKER_ACTIVE') && projectileList) {
          for (const proj of projectileList) {
            proj.damage = (proj.damage || 20) + 3;
            proj.radius = (proj.radius || 6) * 1.35;
          }
        }
      });

      // 2. OnProjectileSpawn hook
      this.eventBus.on('OnProjectileSpawn', (projectile) => {
        if (!projectile) return;
        if (this.hasBuff('BOUNCE_BUFF')) {
          projectile.bouncesLeft = (projectile.bouncesLeft || 0) + 1;
        }
        if (this.hasBuff('LASER_BUFF') && projectile.label && projectile.label.includes('BEAM')) {
          projectile.radius = (projectile.radius || 8) * 1.5;
          projectile.damage = (projectile.damage || 20) + 2;
        }
      });

      // 3. OnProjectileHit hook
      this.eventBus.on('OnProjectileHit', (projectile, target, hitInfo) => {
        if (!projectile || !target) return;
        // Melee bullet reflection handled in deflection routine
      });

      // 4. OnDamageCalculated hook
      this.eventBus.on('OnDamageCalculated', (attacker, defender, damageContext) => {
        if (!damageContext) return;
        // Elemental Crit Double Damage buff
        if (damageContext.isCrit && damageContext.elementType && damageContext.elementType !== 'NONE') {
          if (this.hasBuff('ELEMENTAL_CRIT_DOUBLE_DMG')) {
            damageContext.damage *= 2.0;
          } else {
            damageContext.damage *= 1.0;
          }
        }
        // Immunity buffs
        if (defender && defender === window.player) {
          if (damageContext.source === 'FIRE' && this.hasBuff('IMMUNITY_FIRE')) {
            damageContext.damage = 0;
            damageContext.cancelled = true;
          } else if (damageContext.source === 'POISON' && this.hasBuff('IMMUNITY_POISON')) {
            damageContext.damage = 0;
            damageContext.cancelled = true;
          } else if (damageContext.source === 'FREEZE' && this.hasBuff('IMMUNITY_FREEZE')) {
            damageContext.damage = 0;
            damageContext.cancelled = true;
          }
        }
      });

      // 5. OnDamageTaken hook
      this.eventBus.on('OnDamageTaken', (player, damageAmount, damageSource) => {
        if (!player) return;
        // Reset shield regen timer
        player.time_since_last_hit = 0;
        player.shieldRegenTimer = 0;
      });

      // 6. OnEnemyKill hook
      this.eventBus.on('OnEnemyKill', (killer, enemy) => {
        // Vampire Buff: 12% chance to restore +1 HP on kill
        if (this.hasBuff('VAMPIRE_LIFESTEAL') && window.player) {
          if (Math.random() < 0.12) {
            window.player.hp = Math.min(window.player.maxHp, window.player.hp + 1);
            if (typeof window.addFloatingText === 'function') {
              window.addFloatingText(window.player.x, window.player.y - 30, "+1 HP VAMPIRISM", "#ec4899", 18);
            }
          }
        }
      });

      // 7. OnSkillActivated hook (triggers statue passives)
      this.eventBus.on('OnSkillActivated', (player, skillData) => {
        if (!player) return;
        // Statue of the Paladin: spawns 1-hit invulnerability barrier
        if (this.hasBuff('STATUE_PALADIN')) {
          player.hasPaladinShield = true;
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(player.x, player.y - 40, "🛡️ PALADIN BARRIER ACTIVE!", "#38bdf8", 22);
          }
        }
        // Statue of the Berserker: triggers 5.0s bullet boost
        if (this.hasBuff('STATUE_BERSERKER')) {
          this.addBuff('STATUE_BERSERKER_ACTIVE', 5.0);
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(player.x, player.y - 40, "⚔️ BERSERKER RAGE: BULLET OVERDRIVE!", "#ef4444", 22);
          }
        }
        // Statue of the Elf: energy shockwave that destroys bullets & pushes enemies
        if (this.hasBuff('STATUE_ELF')) {
          if (typeof window.addScreenShake === 'function') window.addScreenShake(8);
          if (window.enemyProjectiles) {
            window.enemyProjectiles.length = 0; // Clear bullets
          }
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(player.x, player.y - 40, "💨 ELF SHOCKWAVE: BULLETS CLEARED!", "#22c55e", 22);
          }
        }
      });
    }

    addBuff(buffId, duration = Infinity, params = {}) {
      this.activeBuffs.set(buffId, {
        id: buffId,
        duration,
        timer: duration,
        params
      });
      if (typeof window.addFloatingText === 'function' && window.player) {
        window.addFloatingText(window.player.x, window.player.y - 45, `+BUFF: ${buffId}`, "#38bdf8", 18);
      }
      return true;
    }

    removeBuff(buffId) {
      return this.activeBuffs.delete(buffId);
    }

    hasBuff(buffId) {
      return this.activeBuffs.has(buffId);
    }

    getBuffs() {
      return Array.from(this.activeBuffs.keys());
    }

    update(dt) {
      for (const [id, buff] of this.activeBuffs.entries()) {
        if (buff.duration !== Infinity) {
          buff.timer -= dt;
          if (buff.timer <= 0) {
            this.activeBuffs.delete(id);
          }
        }
      }
    }

    clear() {
      this.activeBuffs.clear();
    }
  }

  const modifierEngine = new ModifierEngine(combatEventBus);
  window.ModifierEngine = modifierEngine;

  // ============================================================================
  // 3. PRD (PSEUDO-RANDOM DISTRIBUTION) CRIT RESOLUTION
  // ============================================================================
  class PRDCritTracker {
    constructor() {
      this.currentChance = 0;
    }

    roll(baseCrit) {
      if (baseCrit <= 0) return false;
      if (baseCrit >= 1.0) return true;
      const c = baseCrit * 0.34; // Theoretical PRD constant approximation
      if (this.currentChance === 0) this.currentChance = c;

      const roll = Math.random();
      if (roll < this.currentChance) {
        this.currentChance = c; // Reset on crit
        return true;
      }
      this.currentChance = Math.min(1.0, this.currentChance + c);
      return false;
    }
  }

  window.PRDCritTracker = PRDCritTracker;

  // ============================================================================
  // 4. ATTACK TOKEN POOL (Anti-Spam AI & 3-Phase Telegraphing)
  // ============================================================================
  class AttackTokenPool {
    constructor(maxTokens = 4) {
      this.maxTokens = maxTokens;
      this.availableTokens = maxTokens;
      this.holders = new Set();
    }

    requestToken(enemy) {
      if (this.holders.has(enemy)) return true;
      if (this.availableTokens > 0) {
        this.availableTokens--;
        this.holders.add(enemy);
        return true;
      }
      return false;
    }

    releaseToken(enemy) {
      if (this.holders.has(enemy)) {
        this.holders.delete(enemy);
        this.availableTokens = Math.min(this.maxTokens, this.availableTokens + 1);
        return true;
      }
      return false;
    }

    clear() {
      this.availableTokens = this.maxTokens;
      this.holders.clear();
    }
  }

  const globalAttackTokenPool = new AttackTokenPool(4);
  window.AttackTokenPool = AttackTokenPool;
  window.globalAttackTokenPool = globalAttackTokenPool;

  // ============================================================================
  // 5. PROCEDURAL DUNGEON GENERATOR (5x5 Grid + Corridors + Wave Lock-In)
  // ============================================================================
  class GridDungeonRoom {
    constructor(id, gx, gy, type = "COMBAT") {
      this.id = id;
      this.gx = gx; // Grid coordinates (0..4, 0..4)
      this.gy = gy;
      this.type = type; // "SPAWN", "COMBAT", "CHEST", "SHOP", "BOSS", "PORTAL"
      this.state = type === "SPAWN" ? "CLEARED" : "UNVISITED"; // "UNVISITED", "LOCKED_ACTIVE", "CLEARED"
      this.neighbors = new Map(); // direction -> GridDungeonRoom

      // Pixel boundary in world coordinates
      const roomTileSize = 16;
      const worldTile = 64;
      const spacingTiles = 20; // 16 room + 4 corridor
      this.worldX = (gx * spacingTiles + 2) * worldTile;
      this.worldY = (gy * spacingTiles + 2) * worldTile;
      this.width = roomTileSize * worldTile;
      this.height = roomTileSize * worldTile;
      this.cx = this.worldX + this.width / 2;
      this.cy = this.worldY + this.height / 2;

      this.currentWave = 0;
      this.maxWaves = (type === "BOSS" ? 1 : 2);
      this.enemiesInWave = [];
      this.summonMarkers = [];
      this.summonTimer = 0;
      this.tokenPool = new AttackTokenPool(4);
    }

    containsPoint(px, py) {
      return px >= this.worldX && px <= this.worldX + this.width &&
             py >= this.worldY && py <= this.worldY + this.height;
    }

    onPlayerEnter() {
      if (this.state === "UNVISITED") {
        if (this.type === "COMBAT" || this.type === "BOSS") {
          this.state = "LOCKED_ACTIVE";
          this.currentWave = 1;
          this.spawnWaveTelegraph(this.currentWave);
          if (window.soundEngine && typeof window.soundEngine.playRoomLockdown === 'function') {
            window.soundEngine.playRoomLockdown();
          }
          if (typeof window.addScreenShake === 'function') window.addScreenShake(12);
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.cx, this.cy - 100, `ROOM LOCKDOWN: WAVE ${this.currentWave}/${this.maxWaves}`, "#ef4444", 26);
          }
        } else {
          this.state = "CLEARED";
        }
      }
    }

    spawnWaveTelegraph(waveNum) {
      this.summonMarkers = [];
      this.summonTimer = 1.0; // 1.0s telegraphed summon markers
      const count = this.type === "BOSS" ? 1 : (4 + waveNum * 2);

      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 / count) * i + Math.random() * 0.4;
        const dist = 140 + Math.random() * (this.width * 0.32);
        this.summonMarkers.push({
          x: this.cx + Math.cos(a) * dist,
          y: this.cy + Math.sin(a) * dist,
          tier: (this.type === "BOSS") ? "boss" : (waveNum > 1 && i === 0 ? "elite" : "minion")
        });
      }
    }

    spawnWaveEntities() {
      this.enemiesInWave = [];
      const enemyList = window.enemies || [];

      for (const m of this.summonMarkers) {
        let enemy = null;
        if (m.tier === "boss") {
          if (window.EnemyModelFactory) {
            enemy = window.EnemyModelFactory.createFromSpec("ballmer_bot", m.x, m.y);
          }
        } else if (window.dungeon && typeof window.dungeon.createEnemyForSector === 'function') {
          enemy = window.dungeon.createEnemyForSector(m.x, m.y);
        }

        if (enemy) {
          enemy.roomRef = this;
          enemy.tokenPool = this.tokenPool;
          enemyList.push(enemy);
          this.enemiesInWave.push(enemy);
        }
      }
      this.summonMarkers = [];
    }

    update(dt) {
      if (this.state !== "LOCKED_ACTIVE") return;

      // Telegraph countdown before spawning wave entities
      if (this.summonTimer > 0) {
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
          this.spawnWaveEntities();
        }
        return;
      }

      // Check living enemies in current wave
      this.enemiesInWave = this.enemiesInWave.filter(e => !e.isDead && e.hp > 0 && (window.enemies || []).includes(e));

      if (this.enemiesInWave.length === 0) {
        if (this.currentWave < this.maxWaves) {
          this.currentWave++;
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.cx, this.cy - 60, `WAVE CLEARED! NEXT WAVE TELEGRAPHING...`, "#facc15", 22);
          }
          this.spawnWaveTelegraph(this.currentWave);
        } else {
          // Room cleared!
          this.state = "CLEARED";
          this.tokenPool.clear();
          if (window.soundEngine && typeof window.soundEngine.playRoomClear === 'function') {
            window.soundEngine.playRoomClear();
          }
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.cx, this.cy - 70, "ROOM CLEARED! GATES UNLOCKED!", "#22c55e", 26);
          }

          // Spawn reward chest & energy orbs
          if (window.weaponChests && window.WeaponChest) {
            window.weaponChests.push(new window.WeaponChest(this.cx, this.cy));
          }
          if (window.pickups && window.Pickup) {
            for (let i = 0; i < 4; i++) {
              window.pickups.push(new window.Pickup(this.cx + (Math.random() - 0.5) * 80, this.cy + (Math.random() - 0.5) * 80, 'energy'));
            }
          }

          combatEventBus.emit('OnRoomClear', this);
        }
      }
    }

    draw(ctx) {
      // Draw Summon Telegraph Markers (1.0s warning before enemies appear)
      if (this.summonTimer > 0) {
        for (const m of this.summonMarkers) {
          ctx.save();
          const pulse = Math.sin(Date.now() * 0.015) * 4;
          ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 28 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
          ctx.beginPath();
          ctx.arc(m.x, m.y, 28 + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "bold 11px monospace";
          ctx.fillStyle = "#facc15";
          ctx.textAlign = "center";
          ctx.fillText("⚠️ HOSTILE INCOMING", m.x, m.y - 34);
          ctx.restore();
        }
      }
    }
  }

  class ProceduralDungeonGenerator {
    constructor() {
      this.gridSize = 5;
      this.grid = Array(5).fill(null).map(() => Array(5).fill(null));
      this.rooms = [];
      this.spawnRoom = null;
      this.bossRoom = null;
      this.chestRoom = null;
      this.shopRoom = null;
    }

    generateFloor(floorIndex = 1) {
      this.grid = Array(5).fill(null).map(() => Array(5).fill(null));
      this.rooms = [];

      // 1. Spawn Room at (2, 2)
      const spawn = new GridDungeonRoom('spawn_2_2', 2, 2, 'SPAWN');
      this.grid[2][2] = spawn;
      this.rooms.push(spawn);
      this.spawnRoom = spawn;

      // 2. Random Walk / BFS Expansion to place 4-5 CombatRooms, 1 Chest, 1 Shop, 1 Boss
      const directions = [
        { dx: 0, dy: -1, name: 'N' },
        { dx: 0, dy: 1, name: 'S' },
        { dx: 1, dy: 0, name: 'E' },
        { dx: -1, dy: 0, name: 'W' }
      ];

      const queue = [{ x: 2, y: 2 }];
      const totalRoomsToPlace = 8;
      let placedCount = 1;

      while (queue.length > 0 && placedCount < totalRoomsToPlace) {
        const cur = queue.shift();
        const shuffled = [...directions].sort(() => Math.random() - 0.5);

        for (const dir of shuffled) {
          const nx = cur.x + dir.dx;
          const ny = cur.y + dir.dy;

          if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !this.grid[ny][nx]) {
            const roomType = "COMBAT";
            const room = new GridDungeonRoom(`room_${nx}_${ny}`, nx, ny, roomType);
            this.grid[ny][nx] = room;
            this.rooms.push(room);
            placedCount++;
            queue.push({ x: nx, y: ny });
            if (placedCount >= totalRoomsToPlace) break;
          }
        }
      }

      // 3. Designate Special Rooms
      // Leaf nodes (rooms with only 1 neighbor)
      const leafRooms = this.rooms.filter(r => r.type === "COMBAT" && this.getNeighborCount(r.gx, r.gy) === 1);
      
      // Greatest Manhattan distance from (2, 2) is Boss/Portal Room
      const sortedByDist = [...this.rooms].filter(r => r !== spawn).sort((a, b) => {
        const distA = Math.abs(a.gx - 2) + Math.abs(a.gy - 2);
        const distB = Math.abs(b.gx - 2) + Math.abs(b.gy - 2);
        return distB - distA;
      });

      if (sortedByDist.length > 0) {
        sortedByDist[0].type = (floorIndex % 5 === 0) ? "BOSS" : "PORTAL";
        sortedByDist[0].maxWaves = 1;
        this.bossRoom = sortedByDist[0];
      }

      // Assign Chest Room and Shop Room to leaves or furthest remaining
      if (leafRooms.length > 0 && leafRooms[0] !== this.bossRoom) {
        leafRooms[0].type = "CHEST";
        leafRooms[0].state = "CLEARED";
        this.chestRoom = leafRooms[0];
      }
      if (leafRooms.length > 1 && leafRooms[1] !== this.bossRoom && leafRooms[1] !== this.chestRoom) {
        leafRooms[1].type = "SHOP";
        leafRooms[1].state = "CLEARED";
        this.shopRoom = leafRooms[1];
      }

      console.log(`[ProceduralDungeonGenerator] Floor ${floorIndex} created: ${this.rooms.length} rooms (Spawn, ${this.rooms.filter(r => r.type === 'COMBAT').length} Combat, Boss/Portal at [${this.bossRoom?.gx},${this.bossRoom?.gy}])`);
      return this.rooms;
    }

    getNeighborCount(gx, gy) {
      let count = 0;
      const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
      for (const d of dirs) {
        const nx = gx + d.dx, ny = gy + d.dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && this.grid[ny][nx]) count++;
      }
      return count;
    }
  }

  window.ProceduralDungeonGenerator = ProceduralDungeonGenerator;

  // ============================================================================
  // 6. NON-VISION SPATIAL RADAR & UNIQUE LLM GAME MASTER DEV TOOLSET
  // ============================================================================
  const RoguelikeDevKit = {
    version: "4.0.0",

    /**
     * Generate 2D ASCII Grid Radar Map centered on player (Seeing without vision!)
     */
    getRadarMap(width = 41, height = 21) {
      const p = window.player || { x: 512, y: 512 };
      const d = window.dungeon;
      const tileSize = 64; // TILE_SIZE

      const playerTx = Math.floor(p.x / tileSize);
      const playerTy = Math.floor(p.y / tileSize);
      const halfW = Math.floor(width / 2);
      const halfH = Math.floor(height / 2);

      // Pre-index entities into coordinate hash for instant O(1) tile lookup
      const entityMap = new Map();
      const toKey = (wx, wy) => `${Math.floor(wx / tileSize)},${Math.floor(wy / tileSize)}`;

      for (const h of (window.environmentalHazards || [])) {
        if (h) entityMap.set(toKey(h.x, h.y), "~");
      }
      for (const t of (window.linuxTerminalStations || [])) {
        if (t) entityMap.set(toKey(t.x, t.y), "T");
      }
      for (const pt of (window.proceduralPortals || [])) {
        if (pt) entityMap.set(toKey(pt.x, pt.y), "O");
      }
      for (const c of (window.weaponChests || [])) {
        if (c && !c.opened) entityMap.set(toKey(c.x, c.y), "C");
      }
      for (const e of (window.enemies || [])) {
        if (!e) continue;
        const sym = e.isBoss ? "B" : (e.isOutpost ? "E" : "e");
        entityMap.set(toKey(e.x, e.y), sym);
      }

      const gridLines = [];

      for (let y = -halfH; y <= halfH; y++) {
        let line = "";
        for (let x = -halfW; x <= halfW; x++) {
          const curTx = playerTx + x;
          const curTy = playerTy + y;

          if (x === 0 && y === 0) {
            line += "@"; // Player Tux
            continue;
          }

          const ent = entityMap.get(`${curTx},${curTy}`);
          if (ent) {
            line += ent;
            continue;
          }

          // Tile geometry (Wall vs Open)
          if (d && d.isTileSolid(curTx, curTy)) {
            line += "#"; // Solid wall
          } else {
            line += "."; // Open floor
          }
        }
        gridLines.push(line);
      }

      return {
        timestamp: Date.now(),
        legend: {
          "@": "Player Tux",
          "B": "Boss Entity",
          "E": "Elite / Commander",
          "e": "Minion Hostile",
          "T": "Bash Linux Terminal",
          "C": "Weapon / Loot Chest",
          "O": "Extraction Portal",
          "~": "Environmental Hazard",
          "#": "Solid Wall Collider",
          ".": "Walkable Floor"
        },
        playerGridPos: { tx: playerTx, ty: playerTy },
        asciiMap: gridLines.join("\n")
      };
    },

    /**
     * Non-vision full semantic telemetry for LLM
     */
    getTacticalOverview() {
      const p = window.player || {};
      const enemyList = window.enemies || [];
      const bosses = enemyList.filter(e => e.isBoss);

      const threats = enemyList.slice(0, 12).map(e => ({
        id: e.label || "ENEMY",
        tier: e.isBoss ? "BOSS" : (e.isOutpost ? "ELITE" : "MINION"),
        hp: Math.round(e.hp),
        maxHp: e.maxHp,
        shield: Math.round(e.shield || 0),
        distanceToPlayer: Math.round(Math.hypot(e.x - (p.x || 0), e.y - (p.y || 0))),
        hasLoS: window.dungeon ? window.dungeon.hasLineOfSight(p.x || 0, p.y || 0, e.x, e.y) : true,
        isVulnerable: !!e.isVulnerable,
        isEnraged: !!e.isEnraged,
        holdsAttackToken: (e.tokenPool && e.tokenPool.holders) ? e.tokenPool.holders.has(e) : false
      })).sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);

      return {
        player: {
          hp: Math.round(p.hp || 0),
          maxHp: p.maxHp || 120,
          armor: Math.round(p.armor || p.shield || 0),
          maxArmor: p.maxArmor || p.maxShield || 50,
          energy: Math.round(p.energy || 200),
          maxEnergy: 200,
          hasShieldGate: window.ModifierEngine.hasBuff("SHIELD_GATE_NO_OVERFLOW"),
          iFrames: (p.invulnerableTimer && p.invulnerableTimer > 0),
          weapons: (p.heldWeapons || []).map(w => w.name),
          activeWeapon: (p.heldWeapons && p.heldWeapons[p.activeWeaponSlot]) ? p.heldWeapons[p.activeWeaponSlot].name : "NONE",
          activeBuffs: window.ModifierEngine.getBuffs()
        },
        combat: {
          enemyCount: enemyList.length,
          bossActive: bosses.length > 0,
          bossInfo: bosses.map(b => ({
            name: b.label,
            hp: Math.round(b.hp),
            maxHp: b.maxHp,
            shield: Math.round(b.shield || 0),
            isVulnerable: !!b.isVulnerable
          })),
          topThreats: threats.slice(0, 5),
          projectilesInAir: {
            player: (window.playerProjectiles || []).length,
            enemy: (window.enemyProjectiles || []).length
          }
        },
        realm: {
          biomeKey: (window.dungeon && window.dungeon.currentBiome) ? window.dungeon.currentBiome.id : "EMERALD_FRONTIER",
          activeMutation: (window.realmMutation) ? window.realmMutation.type : "NORMAL",
          attackTokensAvailable: globalAttackTokenPool.availableTokens,
          maxAttackTokens: globalAttackTokenPool.maxTokens
        }
      };
    },

    /**
     * Directly command any enemy or boss by index or label
     */
    commandEnemy(enemyQuery, command, params = {}) {
      const enemyList = window.enemies || [];
      const enemy = typeof enemyQuery === 'number'
        ? enemyList[enemyQuery]
        : enemyList.find(e => (e.label && e.label.toUpperCase().includes(String(enemyQuery).toUpperCase())));

      if (!enemy) throw new Error(`Enemy "${enemyQuery}" not found.`);

      const action = String(command).toUpperCase();
      switch (action) {
        case "ATTACK":
          enemy.aiState = "WINDUP_TELEGRAPH";
          enemy.windupTimer = 0.5;
          if (enemy.tokenPool) enemy.tokenPool.requestToken(enemy);
          break;
        case "FLEE":
        case "RETREAT":
          if (window.player) {
            const angle = Math.atan2(enemy.y - window.player.y, enemy.x - window.player.x);
            enemy.vx = Math.cos(angle) * (enemy.speed * 1.5);
            enemy.vy = Math.sin(angle) * (enemy.speed * 1.5);
          }
          break;
        case "HOLD":
          enemy.vx = 0;
          enemy.vy = 0;
          break;
        case "STUN":
          if (typeof enemy.shock === 'function') enemy.shock(params.duration || 2.0);
          break;
        case "OVERHEAT":
        case "VULNERABLE":
          enemy.isVulnerable = true;
          enemy.vulnerableTimer = params.duration || 3.5;
          break;
        case "KILL":
          if (typeof enemy.die === 'function') enemy.die();
          break;
        default:
          break;
      }

      return { status: "success", enemy: enemy.label, command: action };
    },

    /**
     * Collective command for all living enemies
     */
    commandAllEnemies(command) {
      const list = window.enemies || [];
      const action = String(command).toUpperCase();

      for (const e of list) {
        if (action === "ALL_CHARGE" && window.player) {
          const a = Math.atan2(window.player.y - e.y, window.player.x - e.x);
          e.vx = Math.cos(a) * (e.speed * 1.4);
          e.vy = Math.sin(a) * (e.speed * 1.4);
        } else if (action === "ALL_RETREAT" && window.player) {
          const a = Math.atan2(e.y - window.player.y, e.x - window.player.x);
          e.vx = Math.cos(a) * (e.speed * 1.4);
          e.vy = Math.sin(a) * (e.speed * 1.4);
        } else if (action === "CEASE_FIRE") {
          e.attackTimers = (e.spec?.attacks || []).map(() => 999);
        } else if (action === "FREEZE_ALL") {
          if (typeof e.shock === 'function') e.shock(5.0);
        }
      }

      return { status: "success", command: action, affectedCount: list.length };
    },

    /**
     * Mutate an enemy's parameters
     */
    mutateEnemy(enemyQuery, modifiers = {}) {
      const enemyList = window.enemies || [];
      const enemy = typeof enemyQuery === 'number'
        ? enemyList[enemyQuery]
        : enemyList.find(e => (e.label && e.label.toUpperCase().includes(String(enemyQuery).toUpperCase())));

      if (!enemy) throw new Error(`Enemy "${enemyQuery}" not found.`);

      if (modifiers.hp !== undefined) enemy.hp = modifiers.hp;
      if (modifiers.maxHp !== undefined) enemy.maxHp = modifiers.maxHp;
      if (modifiers.speed !== undefined) enemy.speed = modifiers.speed;
      if (modifiers.shield !== undefined) enemy.shield = modifiers.shield;

      return { status: "success", enemy: enemy.label, hp: enemy.hp, speed: enemy.speed };
    },

    /**
     * Force boss phase / attack pattern
     */
    forceBossPhase(bossQuery, phase, attackId = null) {
      const enemyList = window.enemies || [];
      const boss = enemyList.find(e => e.isBoss && (!bossQuery || e.label.includes(String(bossQuery))));
      if (!boss) throw new Error("Active boss not found.");

      const p = String(phase).toUpperCase();
      if (p === "ENRAGE") {
        boss.isEnraged = true;
        boss.speed *= 1.35;
      } else if (p === "OVERHEAT" || p === "VULNERABLE") {
        boss.isVulnerable = true;
        boss.vulnerableTimer = 4.0;
      }

      return { status: "success", boss: boss.label, phase: p };
    },

    /**
     * Grant player passive buff from Argon's roguelike list
     */
    grantBuff(buffId, duration = Infinity) {
      window.ModifierEngine.addBuff(buffId, duration);
      return { status: "success", buff: buffId, duration };
    },

    /**
     * Equip or give weapon from WEAPON_CATALOG
     */
    giveWeapon(weaponIdOrName) {
      if (!window.player || !window.WEAPON_CATALOG) throw new Error("Player or WEAPON_CATALOG not loaded.");
      const catalog = window.WEAPON_CATALOG;
      const weapon = typeof weaponIdOrName === 'number'
        ? catalog[weaponIdOrName]
        : catalog.find(w => w.name.toUpperCase().includes(String(weaponIdOrName).toUpperCase()));

      if (!weapon) throw new Error(`Weapon "${weaponIdOrName}" not found.`);
      window.player.swapActiveWeapon(weapon);
      return { status: "success", weapon: weapon.name };
    },

    /**
     * Adjust attack token manager pool size
     */
    modifyAttackTokens(newMaxTokens = 4) {
      globalAttackTokenPool.maxTokens = newMaxTokens;
      globalAttackTokenPool.availableTokens = newMaxTokens;
      return { status: "success", maxTokens: newMaxTokens };
    },

    /**
     * Warp player instantly to any realm or biome
     */
    warpRealm(biomeKey, objectiveType = "DEFEND_SERVERS", tier = 1) {
      if (window.GameDirectorAPI && typeof window.GameDirectorAPI.setBiome === 'function') {
        return window.GameDirectorAPI.setBiome(biomeKey, objectiveType, tier);
      } else if (window.dungeon && typeof window.dungeon.warpToBiome === 'function') {
        window.dungeon.warpToBiome(biomeKey, objectiveType, tier, true);
        return { status: "success", biomeKey, objectiveType, tier };
      }
      throw new Error("Dungeon or GameDirectorAPI not initialized");
    },

    /**
     * Spawn any boss in any realm on command
     */
    spawnBoss(bossId, x, y) {
      if (window.GameDirectorAPI && typeof window.GameDirectorAPI.spawnBoss === 'function') {
        return window.GameDirectorAPI.spawnBoss(bossId, x, y);
      }
      throw new Error("GameDirectorAPI not initialized");
    },

    /**
     * Trigger Hitstop frame dampening (clamped to max 0.04s)
     */
    triggerHitstop(duration = 0.03) {
      window.hitstopTimer = Math.min(0.04, Math.max(window.hitstopTimer || 0, duration));
      return { status: "success", hitstop: window.hitstopTimer };
    }
  };

  window.RoguelikeDevKit = RoguelikeDevKit;
  console.log("-> Roguelike Engine Core & LLM DevKit loaded.");
})();
