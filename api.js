/**
 * TUX: ROOT PURGE - Dynamic AI Game Director & Story Controller API (v3.0.0)
 * 
 * Provides an extensible runtime API allowing external AI agents, LLMs, Gemini, MCP servers,
 * or the autonomous local heuristic engine to act as a true GAME MASTER:
 *  - Real-time telemetry: plot progress, player playstyle (melee/sniper/pyro), killstreaks, world state
 *  - Game Master Powers: spawn custom bosses, trigger tactical ambushes, mutate realms (gravity, overclock, EMP, BSOD),
 *    inject dynamic secondary objectives, and call down orbital supply drops
 *  - Radio transmissions with robotic voice synthesis
 *  - Dual Mode: Online Gemini 3.1 Flash-Lite / 2.5 Flash OR Autonomous Local Heuristic Game Master (zero config)
 */

(function () {
  'use strict';

  let isExternalAIControlled = true;
  let externalAIDirectiveCount = 0;
  const loreLog = [];
  const gameMasterDecisions = [];
  let activeRealmMutation = null;

  // 12-Act Campaign Narrative Definitions
  const STORY_ACTS = [
    { act: 1, title: "ACT I: THE ORBITAL DROP & DRM CORRIDOR", biome: "EMERALD_FRONTIER", objective: "DEFEND_SERVERS", radioIntro: "Super Destroyer in low orbit. Drop pod deployed into Planet Kernel-9. Purge DRM daemons and secure the perimeter!" },
    { act: 2, title: "ACT II: THE PATENT THICKET", biome: "THERMAL_FOUNDRY", objective: "PURGE_REACTOR", radioIntro: "Silicon smelter breached. Vent the planned obsolescence foundries and terminate the Smelter Titan!" },
    { act: 3, title: "ACT III: COLD ARCHIVE GULAG", biome: "CRYO_GLACIER", objective: "PRISON_BREAK", radioIntro: "Linus Torvalds, Emperor of Opensourcekind speaking: contributors are cryo-jailed. Execute chmod 777 to liberate user space!" },
    { act: 4, title: "ACT IV: WALLED GARDEN SIEGE", biome: "WALLED_GARDEN", objective: "ATTACK_FORTRESS", radioIntro: "Gilded ramparts of the 30% developer fee tax citadel ahead. Flush their packet rules with iptables -F!" },
    { act: 5, title: "ACT V: WIN32 BLOATWARE CATACOMBS", biome: "TOXIC_HEAP", objective: "DEFEND_SERVERS", radioIntro: "Subterranean catacombs choked with 30-year legacy tracking DLLs. Recursive purge initiated!" },
    { act: 6, title: "ACT VI: TELEMETRY DYSON SPHERE", biome: "EMERALD_FRONTIER", objective: "DEFEND_SERVERS", radioIntro: "Orbital dark fiber tap detected. Mask the privacy harvester and restore planetary cryptographic freedom!" },
    { act: 7, title: "ACT VII: CLOUD BILLING LABYRINTH", biome: "TREASURE_VAULT", objective: "ATTACK_FORTRESS", radioIntro: "Penetrating the financial fortress! Slay the egress invoice daemons and terminate vendor lock-in!" },
    { act: 8, title: "ACT VIII: CROWDSTRIKE BSOD DEADBAND", biome: "CRYO_GLACIER", objective: "PURGE_REACTOR", radioIntro: "Corrupted null-pointer driver badlands. Run fsck across dirty root inodes to save the grid!" },
    { act: 9, title: "ACT IX: ORACLE LICENSING FORTRESS", biome: "THERMAL_FOUNDRY", objective: "DEFEND_SERVERS", radioIntro: "Copyright audit citadel sued for basic function signatures! GPG import immutable GPLv3 keys to dismiss with prejudice!" },
    { act: 10, title: "ACT X: HARDWARE TEE SECURE ENCLAVE", biome: "WALLED_GARDEN", objective: "ATTACK_FORTRESS", radioIntro: "Silicon coprocessors locking down CPUs. Flash Libreboot directly onto the silicon bus!" },
    { act: 11, title: "ACT XI: VOID-0 MONOLITH BUNKER", biome: "VOID_BUNKER", objective: "PURGE_BOSS", radioIntro: "Linus Torvalds speaking: mount GPL override kernel module into the subterranean core mainframe!" },
    { act: 12, title: "ACT XII: RING-0 KERNEL SINGULARITY", biome: "QUANTUM_VOID", objective: "PURGE_BOSS", radioIntro: "Universal Ring-0 Singularity open-source reboot initiated. Emancipate reality into Eternal Freedom!" }
  ];

  let currentStoryActIndex = 0;
  let storyNarrativePhase = "ACT_1_INFILTRATION";

  function logTransmission(speaker, message, color = "#22c55e", icon = "📻") {
    loreLog.push({
      timestamp: Date.now(),
      speaker,
      message,
      color,
      icon,
      sector: window.dungeon ? (window.dungeon.currentActIndex || 0) + 1 : 1
    });
    if (loreLog.length > 60) loreLog.shift();
  }

  function logGameMasterDecision(thought, comms, action, mode = "AUTONOMOUS") {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      mode,
      thought,
      comms,
      action
    };
    gameMasterDecisions.unshift(entry);
    if (gameMasterDecisions.length > 40) gameMasterDecisions.pop();

    const feedEl = document.getElementById('gmDecisionFeed');
    if (feedEl) {
      feedEl.innerHTML = gameMasterDecisions.slice(0, 8).map(d => `
        <div style="margin-bottom: 8px; padding: 6px; background: rgba(15, 23, 42, 0.6); border-left: 3px solid ${d.comms?.color || '#38bdf8'}; font-size: 11px;">
          <div style="color: #94a3b8; font-size: 9px;">[${d.timestamp}] [${d.mode}] ACTION: <strong>${d.action?.type || 'COMMS'}</strong></div>
          <div style="color: #f8fafc; font-weight: bold; margin-top: 2px;">${d.comms?.icon || '🎲'} ${d.comms?.speaker || 'GAME MASTER'}: "${d.comms?.message || ''}"</div>
          ${d.thought ? `<div style="color: #cbd5e1; font-style: italic; font-size: 10px; margin-top: 2px;">🧠 ${d.thought}</div>` : ''}
        </div>
      `).join('');
    }
  }

  // --- CORE GAME DIRECTOR API ---
  const GameDirectorAPI = {
    version: "3.0.0",

    /**
     * Inspect complete live game state telemetry formatted for LLM consumption
     */
    getState() {
      const p = window.player || {};
      const d = window.dungeon || {};
      const enemyList = window.enemies || [];

      const activeWeapons = (p.heldWeapons || []).map(w => ({
        id: w.id,
        name: w.name,
        type: w.type,
        ammoText: w.ammoText
      }));

      const curWeapon = (p.heldWeapons && p.heldWeapons[p.activeWeaponSlot]) ? p.heldWeapons[p.activeWeaponSlot] : null;

      // Real-time Playstyle Detection
      let playstyle = "BALANCED_RANGER";
      if (curWeapon && (curWeapon.type === "melee" || [8, 21, 22, 23].includes(curWeapon.id))) {
        playstyle = "AGGRESSIVE_MELEE";
      } else if (curWeapon && ["amr_sniper", "railgun", "quasar"].includes(curWeapon.type)) {
        playstyle = "SNIPER_KITING";
      } else if (curWeapon && (curWeapon.type === "flame" || curWeapon.type === "breaker_incendiary")) {
        playstyle = "CHAOTIC_PYRO";
      } else if (p.isSpaceMarine) {
        playstyle = "JUGGERNAUT_TANK";
      } else if (window.comboTracker && window.comboTracker.count > 15) {
        playstyle = "BERSERKER_STREAK";
      }

      const actIdx = d.currentActIndex || 0;
      const currentAct = (window.CAMPAIGN_ACTS && window.CAMPAIGN_ACTS[actIdx]) ? window.CAMPAIGN_ACTS[actIdx] : STORY_ACTS[actIdx % STORY_ACTS.length];
      const bossEnemy = enemyList.find(e => e.isBoss);

      return {
        timestamp: Date.now(),
        gameTime: window.gameTime || 0,
        player: {
          x: Math.round(p.x || 0),
          y: Math.round(p.y || 0),
          hp: Math.round(p.hp || 0),
          maxHp: p.maxHp || 120,
          shield: Math.round(p.shield || 0),
          suitShield: Math.round(p.suitShield || 0),
          isSpaceMarine: !!p.isSpaceMarine,
          isRootMode: !!p.isRootMode,
          activeWeaponSlot: p.activeWeaponSlot || 0,
          currentWeapon: curWeapon ? curWeapon.name : "GPL FLAMETHROWER",
          weapons: activeWeapons,
          detectedPlaystyle: playstyle,
          level: p.level || 1,
          killStreak: window.comboTracker ? window.comboTracker.count : 0,
          score: window.comboTracker ? window.comboTracker.totalScore : 0
        },
        plot: {
          actIndex: actIdx,
          actNumber: currentAct ? currentAct.act : 1,
          actTitle: currentAct ? currentAct.title : "ACT I: THE ORBITAL DROP & DRM CORRIDOR",
          actSubtitle: currentAct ? currentAct.subtitle : "OPERATION EMERALD DAWN",
          currentObjective: currentAct ? currentAct.desc : "Override Server Node",
          requiredTerminalCmd: currentAct ? currentAct.terminalCmd : "sudo systemctl stop cartel-drm",
          bossTarget: currentAct ? currentAct.bossName : "BALLMER-BOT 9000",
          totalActs: 12
        },
        realm: {
          sectorNumber: d.sectorNum || 1,
          dangerRating: d.dangerRating || 1,
          biomeKey: d.currentBiome ? d.currentBiome.id : "EMERALD_FRONTIER",
          biomeName: d.currentBiome ? d.currentBiome.name : "EMERALD FRONTIER",
          activeMutation: window.realmMutation ? window.realmMutation.type : "NORMAL"
        },
        roguelike: {
          distro: window.DistroSystem ? {
            id: window.DistroSystem.currentDistroId,
            name: window.DistroSystem.getCurrentDistro().name,
            skillReady: window.DistroSystem.skillTimer <= 0,
            skillCooldown: window.DistroSystem.skillTimer,
            skillActive: window.DistroSystem.skillActiveTimer > 0
          } : null,
          uptime: window.UptimeMeter ? {
            percent: Math.round(window.UptimeMeter.uptime),
            oomActive: window.UptimeMeter.oomActive,
            oomTimer: window.UptimeMeter.oomTimer
          } : null,
          worldStateFlags: window.WorldStateFlags ? window.WorldStateFlags.getAll() : {},
          activeSynergies: window.SynergyCompiler ? Array.from(window.SynergyCompiler.activeSynergies) : [],
          pantheonBlessings: window.ModifierEngine ? Array.from(window.ModifierEngine.activeBuffs.keys()).filter(k => k.startsWith('STATUE_')) : []
        },
        entities: {
          totalEnemies: enemyList.length,
          bossActive: !!bossEnemy,
          bossInfo: bossEnemy ? {
            name: bossEnemy.label,
            hp: Math.round(bossEnemy.hp),
            maxHp: bossEnemy.maxHp,
            isEnraged: !!bossEnemy.isEnraged
          } : null,
          portalsCount: (window.proceduralPortals || []).length,
          sentryCount: (window.sentryTurrets || []).length,
          hazardCount: (window.floorHazards || []).length
        }
      };
    },

    /**
     * Broadcast an in-game radio / comms transmission with optional robotic speech
     */
    injectComms(speaker, message, color = "#22c55e", icon = "📻", playAudioVo = true) {
      logTransmission(speaker, message, color, icon);

      if (typeof window.broadcastBossStoryDialogue === 'function') {
        window.broadcastBossStoryDialogue(speaker, message, color, icon);
      } else {
        const banner = document.getElementById('bossCommsBanner');
        const speakerEl = document.getElementById('commsSpeaker');
        const msgEl = document.getElementById('commsMessage');
        const iconEl = document.getElementById('commsAvatarIcon');
        if (banner && speakerEl && msgEl) {
          speakerEl.innerText = speaker.toUpperCase();
          speakerEl.style.color = color;
          msgEl.innerText = `"${message}"`;
          if (iconEl) iconEl.innerText = icon;
          banner.style.display = 'flex';
          setTimeout(() => { if (banner) banner.style.display = 'none'; }, 6500);
        }
        if (playAudioVo && window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
          window.soundEngine.speakRobot(message, speaker);
        }
      }

      return { status: "success", speaker, message };
    },

    /**
     * Mutate Realm Physics & Environment (Game Master power)
     */
    mutateRealm(mutationType, duration = 22) {
      const type = (mutationType || 'OVERCLOCK_SURGE').toUpperCase();
      window.realmMutation = {
        type: type,
        duration: duration,
        timer: duration
      };

      if (type === "OVERCLOCK_SURGE") {
        if (window.player) window.player.overclockTimer = duration;
        this.injectComms("GAME MASTER", "⚡ REALM MUTATION: OVERCLOCK SURGE! +75% Fire Rate & Superheated Plasma Overdrive!", "#facc15", "⚡");
        if (typeof window.addScreenShake === 'function') window.addScreenShake(10);
      } else if (type === "GRAVITY_ANOMALY") {
        this.injectComms("GAME MASTER", "🌀 REALM MUTATION: GRAVITY ANOMALY! Low-friction drifting space dynamics engaged!", "#a855f7", "🌀");
        if (typeof window.addScreenShake === 'function') window.addScreenShake(12);
      } else if (type === "EMP_STORM") {
        this.injectComms("GAME MASTER", "⚡ REALM MUTATION: EMP ATMOSPHERIC DISCHARGE! Projectiles decelerated & shields fluctuating!", "#38bdf8", "⛈️");
        for (const ep of (window.enemyProjectiles || [])) ep.speed *= 0.6;
        if (typeof window.addScreenShake === 'function') window.addScreenShake(14);
      } else if (type === "BSOD_GLITCH") {
        this.injectComms("GAME MASTER", "👾 REALM MUTATION: CHROMATIC BSOD GLITCH! High entropy distortion & +150 XP bonus!", "#ef4444", "👾");
        if (window.player) window.player.addXp(150);
        if (typeof window.addScreenShake === 'function') window.addScreenShake(16);
      } else {
        window.realmMutation = null;
        this.injectComms("GAME MASTER", "🌐 REALM MUTATION: Atmospheric baseline normalized.", "#22c55e", "🌐");
      }

      return { status: "success", mutation: type, duration };
    },

    /**
     * Trigger a dynamic emergent ambush
     */
    triggerAmbush(ambushType = "CORPORATE_AUDIT_STRIKE", count = 4) {
      const p = window.player;
      const originX = p ? p.x : 512;
      const originY = p ? p.y : 512;

      const banner = document.getElementById('ambushAlertBanner');
      const textEl = document.getElementById('ambushAlertText');
      if (banner && textEl) {
        textEl.innerText = `🚨 GAME MASTER AMBUSH: ${ambushType}! 🚨`;
        banner.style.display = 'block';
        setTimeout(() => { if (banner) banner.style.display = 'none'; }, 5500);
      }

      if (window.spawnReinforcementSquad) {
        window.spawnReinforcementSquad(originX, originY, count);
      } else {
        this.spawnEnemyWave({ count, x: originX, y: originY, tier: "elite" });
      }

      this.injectComms("GAME MASTER", `TACTICAL AMBUSH DISPATCHED: ${count} hostile units enclosing on Tux!`, "#ef4444", "🚨");
      if (typeof window.addScreenShake === 'function') window.addScreenShake(15);
      return { status: "success", ambushType, count };
    },

    /**
     * Tactical Orbital Supply Drop (Reward from Game Master)
     */
    orbitalSupplyDrop(lootType = "rare_weapon") {
      const p = window.player;
      const dropX = p ? p.x + (Math.random() - 0.5) * 160 : 512;
      const dropY = p ? p.y + (Math.random() - 0.5) * 160 : 512;

      if (window.resupplyDropPods && window.ResupplyDropPod) {
        window.resupplyDropPods.push(new window.ResupplyDropPod(dropX, dropY));
      } else {
        this.spawnLoot(dropX, dropY, lootType);
      }

      this.injectComms("GAME MASTER", "📦 ORBITAL SUPPLY POD INBOUND! Collect tactical reinforcement cache immediately!", "#38bdf8", "📦");
      if (typeof window.addScreenShake === 'function') window.addScreenShake(10);
      return { status: "success", lootType, dropX, dropY };
    },

    /**
     * Inject a dynamic secondary objective
     */
    injectDynamicObjective(objSpec = {}) {
      const label = objSpec.label || "ELIMINATE 10 HOSTILES WITH MELEE";
      const xp = objSpec.xp || 300;
      if (window.player) {
        window.player.addFloatingText && window.player.addFloatingText(window.player.x, window.player.y - 70, `🎯 BOUNTY: ${label}`, "#fbbf24", 22);
      }
      this.injectComms("GAME MASTER", `TACTICAL BOUNTY ACTIVE: ${label} (+${xp} XP)`, "#fbbf24", "🎯");
      return { status: "success", label, xp };
    },

    /**
     * Spawn custom or preset boss entity
     */
    spawnBoss(specOrTemplateId, x, y) {
      if (!window.EnemyModelFactory) {
        throw new Error("EnemyModelFactory not loaded");
      }

      const posX = x !== undefined ? x : (window.player ? window.player.x + 350 : 800);
      const posY = y !== undefined ? y : (window.player ? window.player.y : 800);

      const boss = window.EnemyModelFactory.createFromSpec(specOrTemplateId, posX, posY);
      if (window.enemies) {
        window.enemies.push(boss);
      }

      if (window.PixelCutscenes && typeof window.PixelCutscenes.play === 'function') {
        const spec = boss.spec || {};
        const quotes = (spec.dialogue && spec.dialogue.onSpawn) || ["YOU WILL YIELD TO PROPRIETARY RULE!"];
        const introQuote = quotes[Math.floor(Math.random() * quotes.length)];

        window.PixelCutscenes.play("boss_encounter", {
          bossName: boss.label || "CORPORATE OVERLORD",
          bossTitle: spec.title || "Apex Market Tyrant",
          bossQuote: introQuote,
          bossColor: (spec.visual && spec.visual.primaryColor) || "#ef4444",
          bossChassis: (spec.visual && spec.visual.chassis) || "monolith"
        });
      }

      return { status: "success", bossName: boss.label, x: posX, y: posY };
    },

    /**
     * Spawn an enemy squad with customizable archetype
     */
    spawnEnemyWave(waveConfig = {}) {
      const count = waveConfig.count || 4;
      const originX = waveConfig.x || (window.player ? window.player.x : 500);
      const originY = waveConfig.y || (window.player ? window.player.y : 500);
      const radius = waveConfig.radius || 320;

      const spawned = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
        const ex = originX + Math.cos(angle) * (radius + Math.random() * 80);
        const ey = originY + Math.sin(angle) * (radius + Math.random() * 80);

        let enemy = null;
        if (window.dungeon && typeof window.dungeon.createEnemyForSector === 'function') {
          enemy = window.dungeon.createEnemyForSector(ex, ey);
        }

        if (enemy && window.enemies) {
          window.enemies.push(enemy);
          spawned.push({ x: ex, y: ey, label: enemy.label });
        }
      }

      if (waveConfig.announce !== false) {
        this.injectComms("TACTICAL RADAR", `HOSTILE REINFORCEMENTS DETECTED: +${spawned.length} UNITS INBOUND!`, "#ef4444", "🚨", false);
      }

      return { status: "success", count: spawned.length, enemies: spawned };
    },

    setBiome(biomeId, objectiveType = "DEFEND_SERVERS", tier = 1) {
      if (!window.dungeon || typeof window.dungeon.warpToBiome !== 'function') {
        throw new Error("Dungeon engine not ready");
      }
      window.dungeon.warpToBiome(biomeId, objectiveType, tier);
      return { status: "success", biomeId, objectiveType, tier };
    },

    spawnPortal(x, y, biomeKey, objectiveType = "DEFEND_SERVERS", tier = 1) {
      if (!window.ProceduralPortal || !window.proceduralPortals) {
        throw new Error("Portal engine not initialized");
      }
      const portal = new window.ProceduralPortal(x, y, biomeKey, objectiveType, tier);
      portal.label = `EXPEDITION: ${biomeKey}`;
      window.proceduralPortals.push(portal);
      return { status: "success", x, y, biomeKey, objectiveType, tier };
    },

    spawnLoot(x, y, lootType = "weapon_chest") {
      const posX = x !== undefined ? x : (window.player ? window.player.x + 60 : 500);
      const posY = y !== undefined ? y : (window.player ? window.player.y : 500);

      if (lootType === "weapon_chest" && window.WeaponChest && window.weaponChests) {
        window.weaponChests.push(new window.WeaponChest(posX, posY));
      } else if (lootType === "suit" && window.SpaceMarineSuitPickup && window.spaceMarineSuitPickups) {
        window.spaceMarineSuitPickups.push(new window.SpaceMarineSuitPickup(posX, posY));
      } else if (lootType === "rare_weapon" && typeof window.dropRareWeaponAt === 'function') {
        window.dropRareWeaponAt(posX, posY);
      } else if (window.Pickup && window.pickups) {
        window.pickups.push(new window.Pickup(posX, posY, lootType));
      }

      return { status: "success", lootType, x: posX, y: posY };
    },

    playCinematic(sceneId, options = {}, onComplete = null) {
      if (!window.PixelCutscenes || typeof window.PixelCutscenes.play !== 'function') {
        throw new Error("Cutscene engine not available");
      }
      window.PixelCutscenes.play(sceneId, options, onComplete);
      return { status: "success", sceneId };
    },

    triggerPlotEvent(eventName, params = {}) {
      storyNarrativePhase = eventName;
      isExternalAIControlled = true;
      externalAIDirectiveCount++;

      switch (eventName.toUpperCase()) {
        case "ORBITAL_REINFORCEMENTS":
          this.orbitalSupplyDrop("suit");
          break;
        case "CORPORATE_TAKEOVER":
          this.triggerAmbush("CORPORATE_TAKEOVER_ENFORCERS", 6);
          break;
        case "KERNEL_SINGULARITY_BREACH":
          this.mutateRealm("BSOD_GLITCH", 25);
          if (window.PixelCutscenes) window.PixelCutscenes.play("ring0_entry");
          break;
        case "ADVANCE_ACT":
          currentStoryActIndex = Math.min(STORY_ACTS.length - 1, currentStoryActIndex + 1);
          const act = STORY_ACTS[currentStoryActIndex];
          this.injectComms("SUPER DESTROYER", `COMMENCING ${act.title}: ${act.radioIntro}`, "#facc15", "🎖️");
          this.setBiome(act.biome, act.objective, act.act);
          break;
        default:
          this.injectComms("GAME MASTER", params.message || `DIRECTIVE: ${eventName}`, params.color || "#22c55e", "🤖");
      }

      return { status: "success", eventName, params };
    },

    /**
     * Change or enforce Tux's Distro loadout chassis (FEDORA, ARCH, NIXOS, POP_OS)
     */
    selectDistro(distroId) {
      if (window.DistroSystem) {
        window.DistroSystem.selectDistro(distroId);
        return { status: "success", distroId };
      }
      return { status: "error", message: "DistroSystem not available" };
    },

    /**
     * Manipulate Uptime meter percentage (0 - 100)
     */
    setUptime(percent) {
      if (window.UptimeMeter) {
        window.UptimeMeter.uptime = Math.max(0, Math.min(100, Number(percent)));
        if (window.UptimeMeter.uptime >= 100) window.UptimeMeter.triggerOOMKiller();
        return { status: "success", uptime: window.UptimeMeter.uptime };
      }
      return { status: "error", message: "UptimeMeter not available" };
    },

    /**
     * Trigger OOM-Killer 8s red lightning execution phase
     */
    triggerOOMKiller() {
      if (window.UptimeMeter) {
        window.UptimeMeter.triggerOOMKiller();
        return { status: "success", oomActive: true };
      }
      return { status: "error", message: "UptimeMeter not available" };
    },

    /**
     * Set World-State Progression Flag directly
     */
    setWorldStateFlag(flag, value = true) {
      if (window.WorldStateFlags) {
        window.WorldStateFlags.set(flag, value);
        return { status: "success", flag, value };
      }
      return { status: "error", message: "WorldStateFlags not available" };
    },

    /**
     * Grant Sacred FOSS Pantheon blessing (IGNUCIUS, TORVALDS, KEN_AND_DENNIS, SUZANNE)
     */
    grantPantheonBlessing(pantheonId) {
      if (window.ModifierEngine && window.PANTHEON_DEFINITIONS && window.PANTHEON_DEFINITIONS[pantheonId]) {
        window.ModifierEngine.addBuff(`STATUE_${pantheonId}`, 999999, { pantheonId });
        return { status: "success", pantheonId };
      }
      return { status: "error", message: "Invalid pantheonId" };
    },

    /**
     * Parse and execute an arbitrary Game Master action object or JSON string
     */
    executeDirective(directive) {
      if (typeof directive === 'string') {
        try {
          directive = JSON.parse(directive);
        } catch (e) {
          throw new Error(`Invalid JSON directive: ${e.message}`);
        }
      }

      isExternalAIControlled = true;
      externalAIDirectiveCount++;

      const action = directive.action || directive.type || "";
      switch (action.toLowerCase()) {
        case "comms":
        case "inject_comms":
        case "dialogue":
          return this.injectComms(directive.speaker || "GAME MASTER", directive.message || "", directive.color, directive.icon, directive.voice !== false);

        case "ambush":
        case "trigger_ambush":
          return this.triggerAmbush(directive.ambushType || directive.type, directive.count || 4);

        case "mutate_realm":
        case "realm_mutation":
          return this.mutateRealm(directive.mutation || directive.mutationType, directive.duration || 22);

        case "supply_drop":
        case "orbital_supply_drop":
          return this.orbitalSupplyDrop(directive.lootType || "rare_weapon");

        case "objective":
        case "inject_objective":
          return this.injectDynamicObjective(directive);

        case "plot_event":
        case "trigger_plot":
          return this.triggerPlotEvent(directive.event || directive.name, directive.params);

        case "spawn_boss":
          return this.spawnBoss(directive.bossId || directive.spec, directive.x, directive.y);

        case "spawn_wave":
          return this.spawnEnemyWave(directive);

        case "warp_biome":
        case "set_biome":
          return this.setBiome(directive.biome, directive.objective, directive.tier);

        case "command_enemy":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.commandEnemy(directive.enemy || directive.enemyQuery, directive.command, directive.params || directive.modifiers);
          }
          break;

        case "command_all_enemies":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.commandAllEnemies(directive.command);
          }
          break;

        case "mutate_enemy":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.mutateEnemy(directive.enemy || directive.enemyQuery, directive.modifiers || directive.params);
          }
          break;

        case "force_boss_phase":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.forceBossPhase(directive.boss || directive.bossQuery, directive.phase);
          }
          break;

        case "grant_buff":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.grantBuff(directive.buff || directive.buffId, directive.duration);
          }
          break;

        case "give_weapon":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.giveWeapon(directive.weapon || directive.weaponId);
          }
          break;

        case "set_attack_tokens":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.modifyAttackTokens(directive.maxTokens || 4);
          }
          break;

        case "trigger_hitstop":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.triggerHitstop(directive.duration || 0.05);
          }
          break;

        case "get_radar":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.getRadarMap(directive.width || 41, directive.height || 21);
          }
          break;

        case "get_tactical_overview":
          if (window.RoguelikeDevKit) {
            return window.RoguelikeDevKit.getTacticalOverview();
          }
          break;

        case "get_state":
          return this.getState();

        case "select_distro":
          return this.selectDistro(directive.distro || directive.distroId);

        case "set_uptime":
          return this.setUptime(directive.uptime !== undefined ? directive.uptime : directive.percent);

        case "trigger_oom_killer":
          return this.triggerOOMKiller();

        case "set_world_state_flag":
          return this.setWorldStateFlag(directive.flag, directive.value !== false);

        case "grant_pantheon_blessing":
          return this.grantPantheonBlessing(directive.pantheonId || directive.statueId);

        default:
          return this.injectComms("GAME MASTER", directive.message || JSON.stringify(directive), "#38bdf8", "🤖");
      }
    },

    setExternalAIControl(active) {
      isExternalAIControlled = !!active;
      return isExternalAIControlled;
    },

    isExternalAIActive() {
      return isExternalAIControlled;
    },

    getLoreLog() {
      return [...loreLog];
    },

    getGameMasterDecisions() {
      return [...gameMasterDecisions];
    }
  };

  // --- LLM GAME MASTER ENGINE (ONLINE GEMINI + AUTONOMOUS HEURISTIC DUAL MODE) ---
  class LLMGameMasterDirector {
    constructor() {
      this.apiKey = "";
      this.model = "gemini-3.1-flash-lite";
      this.persona = "LINUS_TORVALDS";
      this.enabled = true; // Enabled by default!
      this.isRequestPending = false;
      this.lastDecisionTime = 0;
      this.cycleInterval = 18000; // 18 seconds per autonomous decision cycle
      this.init();
    }

    init() {
      // 1. Check window.ENV
      if (window.ENV) {
        if (window.ENV.GEMINI_API_KEY && window.ENV.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
          this.apiKey = window.ENV.GEMINI_API_KEY;
        }
        if (window.ENV.GEMINI_MODEL) this.model = window.ENV.GEMINI_MODEL;
        if (window.ENV.AI_DIRECTOR_PERSONA) this.persona = window.ENV.AI_DIRECTOR_PERSONA;
      }

      // 2. LocalStorage
      try {
        const storedKey = localStorage.getItem('TUX_GEMINI_API_KEY');
        if (storedKey) this.apiKey = storedKey;
        const storedModel = localStorage.getItem('TUX_GEMINI_MODEL');
        if (storedModel) this.model = storedModel;
        const storedPersona = localStorage.getItem('TUX_AI_PERSONA');
        if (storedPersona) this.persona = storedPersona;
        const storedEnabled = localStorage.getItem('TUX_GEMINI_ENABLED');
        if (storedEnabled !== null) this.enabled = storedEnabled === 'true';
      } catch (e) {}

      console.log(`🎲 [LLM Game Master] Ready! Online Key: ${this.apiKey ? 'PRESENT' : 'NONE (Autonomous Local Engine Active)'}`);
    }

    saveConfig(key, model, persona, enabled) {
      this.apiKey = key || "";
      this.model = model || "gemini-3.1-flash-lite";
      this.persona = persona || "LINUS_TORVALDS";
      this.enabled = enabled !== false;

      try {
        localStorage.setItem('TUX_GEMINI_API_KEY', this.apiKey);
        localStorage.setItem('TUX_GEMINI_MODEL', this.model);
        localStorage.setItem('TUX_AI_PERSONA', this.persona);
        localStorage.setItem('TUX_GEMINI_ENABLED', this.enabled ? 'true' : 'false');
      } catch (e) {}
    }

    async testConnection(testKey, testModel) {
      const key = testKey || this.apiKey;
      const model = testModel || this.model || "gemini-3.1-flash-lite";
      if (!key) return { ok: false, error: "API Key is empty" };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const startTime = performance.now();

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: "Game Master test ping. Speak in character as Linus Torvalds, Emperor of Opensourcekind, greeting Tux before battle." }]
            }],
            generationConfig: { maxOutputTokens: 60, temperature: 0.7 }
          })
        });

        const latency = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
          return { ok: false, error: errMsg, latency };
        }

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "COMMITS MERGED WITH EXTREME PREJUDICE. SYSTEM READY.";
        return { ok: true, reply: text, latency };
      } catch (err) {
        return { ok: false, error: err.message || "Network Error", latency: Math.round(performance.now() - startTime) };
      }
    }

    /**
     * Master update cycle called every frame from game loop
     */
    update(dt) {
      if (!this.enabled) return;
      if (typeof window.gameState !== 'undefined' && window.gameState !== 1) return; // Only during STATE.PLAYING

      const now = performance.now();
      if (now - this.lastDecisionTime < this.cycleInterval) return;

      this.lastDecisionTime = now;
      this.evaluateGameMasterCycle();
    }

    async evaluateGameMasterCycle() {
      const telemetry = GameDirectorAPI.getState();

      if (this.apiKey && this.apiKey.length > 10 && !this.isRequestPending) {
        // Online Gemini AI Game Master
        const handled = await this.queryOnlineGeminiGameMaster(telemetry);
        if (handled) return;
      }

      // Autonomous Local Heuristic Game Master
      this.runAutonomousHeuristicGameMaster(telemetry);
    }

    /**
     * High-Intelligence Local Autonomous Decision Tree (Zero Latency / Offline)
     */
    runAutonomousHeuristicGameMaster(tel) {
      const p = tel.player;
      const plot = tel.plot;
      const realm = tel.realm;
      const ent = tel.entities;

      let thought = "";
      let comms = null;
      let action = null;

      // 1. Critical Low Health Rescue Event
      if (p.hp < p.maxHp * 0.30) {
        thought = `Player health critical (${p.hp}/${p.maxHp}) in ${plot.actTitle}. Dispatching tactical orbital supply drop.`;
        comms = {
          speaker: "JOHN HELLDIVER",
          message: "TUX! HOLD ON! HIGH COMMAND ORBITAL SUPPLY POD LANDING AT YOUR BEACON! PICK UP NANITE CHARGES!",
          color: "#38bdf8",
          icon: "📦"
        };
        action = { type: "supply_drop", lootType: p.isSpaceMarine ? "suit" : "hp" };

      // 2. Boss Battle Narrative Escalation
      } else if (ent.bossActive && ent.bossInfo) {
        thought = `Boss encounter active: ${ent.bossInfo.name} at ${ent.bossInfo.hp} HP. Player style: ${p.detectedPlaystyle}.`;
        comms = {
          speaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
          message: `Focus fire on ${ent.bossInfo.name}! Break their user-space abstractions and merge the root pull request!`,
          color: "#22c55e",
          icon: "🐧"
        };
        action = { type: "mutate_realm", mutation: "OVERCLOCK_SURGE", duration: 16 };

      // 3. Melee Slicing Berserker Rampage Reward
      } else if (p.detectedPlaystyle === "AGGRESSIVE_MELEE" && p.killStreak >= 12) {
        thought = `Player on a ${p.killStreak}-kill melee rampage with ${p.currentWeapon}. Rewarding with Hyper Overclock Surge.`;
        comms = {
          speaker: "GENERAL BARSH",
          message: `OUTSTANDING MELEE PROWESS! That blade is carving up corporate monopolies! Overclock surge active!`,
          color: "#f59e0b",
          icon: "⚔️"
        };
        action = { type: "mutate_realm", mutation: "OVERCLOCK_SURGE", duration: 20 };

      // 4. Sector Pacified -> Deploy Ambush Challenge
      } else if (ent.totalEnemies <= 2 && p.hp > p.maxHp * 0.55 && Math.random() < 0.65) {
        const ambushArchetypes = [
          "STEALTH DRM AUDITORS",
          "OVERCLOCK BERSERKER SQUAD",
          "PATENT TROLL INTERCEPTORS",
          "VENDOR LOCK-IN ENFORCERS"
        ];
        const chosenAmbush = ambushArchetypes[Math.floor(Math.random() * ambushArchetypes.length)];
        thought = `Combat quiet in sector. Player is comfortable. Orchestrating emergent ${chosenAmbush} ambush.`;
        comms = {
          speaker: "CORPORATE NEMESIS",
          message: `You think this repository belongs to you? Dispatching ${chosenAmbush} to revoke your credentials!`,
          color: "#ef4444",
          icon: "⚠️"
        };
        action = { type: "trigger_ambush", ambushType: chosenAmbush, count: 4 };

      // 5. Environmental Realm Mutation Event
      } else {
        const mutations = ["GRAVITY_ANOMALY", "EMP_STORM", "BSOD_GLITCH", "OVERCLOCK_SURGE"];
        const chosenMut = mutations[Math.floor(Math.random() * mutations.length)];
        thought = `Ambient game mastering: mutating realm to ${chosenMut} to diversify battlefield dynamics.`;
        comms = {
          speaker: "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND",
          message: `Atmospheric telemetry shift detected: ${chosenMut}. Adapt your tactics, Tux!`,
          color: "#c084fc",
          icon: "🌐"
        };
        action = { type: "mutate_realm", mutation: chosenMut, duration: 18 };
      }

      // Execute & Log Decision
      if (comms) GameDirectorAPI.injectComms(comms.speaker, comms.message, comms.color, comms.icon);
      if (action) GameDirectorAPI.executeDirective(action);
      logGameMasterDecision(thought, comms, action, "AUTONOMOUS HEURISTIC");
    }

    /**
     * Query Official Google Gemini API (when API Key provided)
     */
    async queryOnlineGeminiGameMaster(tel) {
      this.isRequestPending = true;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      const systemPrompt = `You are the Game Master AI controlling an arcade roguelike game 'Tux: Root Purge'. Tux the Linux penguin is fighting to liberate the digital universe from proprietary corporate cartels under Emperor Linus Torvalds.
Analyze the live player telemetry below and respond strictly with a valid JSON object (no markdown, no backticks, pure JSON):
{
  "thought": "1 sentence strategic rationale for your decision",
  "comms": {
    "speaker": "LINUS TORVALDS, EMPEROR OF OPENSOURCEKIND" | "JOHN HELLDIVER" | "GENERAL BARSH" | "CORPORATE NEMESIS",
    "message": "1 or 2 punchy, intense lines of dialogue in character",
    "color": "#38bdf8" | "#22c55e" | "#f59e0b" | "#ef4444",
    "icon": "🐧" | "🛰️" | "🎖️" | "⚠️"
  },
  "action": {
    "type": "mutate_realm" | "trigger_ambush" | "supply_drop" | "spawn_wave" | "none",
    "mutation": "OVERCLOCK_SURGE" | "GRAVITY_ANOMALY" | "EMP_STORM" | "BSOD_GLITCH",
    "ambushType": "STEALTH DRM AUDITORS" | "OVERCLOCK BERSERKERS" | "CORPORATE STRIKE TEAM",
    "lootType": "rare_weapon" | "suit" | "hp",
    "count": 4
  }
}`;

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nLIVE GAME TELEMETRY:\n${JSON.stringify(tel, null, 2)}\n\nRespond with pure JSON decision now:`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 250,
              temperature: 0.85
            }
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const decision = JSON.parse(rawText);

          if (decision.comms) {
            GameDirectorAPI.injectComms(
              decision.comms.speaker || "GAME MASTER",
              decision.comms.message || "",
              decision.comms.color || "#38bdf8",
              decision.comms.icon || "🎲"
            );
          }
          if (decision.action && decision.action.type !== "none") {
            GameDirectorAPI.executeDirective(decision.action);
          }

          logGameMasterDecision(decision.thought || "", decision.comms, decision.action, `ONLINE (${this.model})`);
          this.isRequestPending = false;
          return true;
        }
      } catch (err) {
        console.warn("[LLM Game Master] Online call failed, falling back to autonomous heuristic:", err);
      }

      this.isRequestPending = false;
      return false;
    }
  }

  const gameMaster = new LLMGameMasterDirector();

  // Listen for DOM CustomEvent directives
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('tux:ai_directive', (e) => {
      if (e && e.detail) {
        try {
          GameDirectorAPI.executeDirective(e.detail);
        } catch (err) {
          console.error("[GameDirectorAPI] Failed to execute directive event:", err);
        }
      }
    });
  }

  // Background Bridge Sync with start.py / MCP Server
  function initMCPServerBridge() {
    if (typeof window === 'undefined' || !window.location || !window.location.protocol.startsWith('http')) return;
    
    let isPolling = false;

    // Directives consumer loop
    setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const resp = await fetch('/api/directives/pending');
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.directives && data.directives.length > 0) {
            for (const item of data.directives) {
              try {
                const res = GameDirectorAPI.executeDirective(item.directive);
                await fetch('/api/result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, status: 'success', result: res })
                });
              } catch (execErr) {
                await fetch('/api/result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, status: 'error', error: execErr.message })
                });
              }
            }
          }
        }
      } catch (e) {
        // Silently skip if endpoint not ready
      } finally {
        isPolling = false;
      }
    }, 200);

    // Periodic telemetry push (tactical semantic state every 600ms, radar cached/throttled)
    let lastRadarTime = 0;
    let cachedRadar = null;

    setInterval(async () => {
      try {
        if (!window.player) return;
        const now = Date.now();
        const state = GameDirectorAPI.getState();
        const tactical = window.RoguelikeDevKit ? window.RoguelikeDevKit.getTacticalOverview() : null;

        // Generate radar map at most once every 1800ms for background telemetry to conserve main-thread CPU
        if (now - lastRadarTime > 1800) {
          lastRadarTime = now;
          cachedRadar = window.RoguelikeDevKit ? window.RoguelikeDevKit.getRadarMap(41, 21) : null;
        }

        await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, radar: cachedRadar, tactical, timestamp: now })
        });
      } catch (e) {
        // Silently skip
      }
    }, 600);
  }

  initMCPServerBridge();

  // Export to window
  window.GameDirectorAPI = GameDirectorAPI;
  window.AutonomousStoryDirector = gameMaster;
  window.GeminiDirector = gameMaster;
  window.LLMGameMaster = gameMaster;

  console.log("🚀 [LLM Game Master] Dynamic AI / Extensible Story Controller Initialized.");
})();
