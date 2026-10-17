/**
 * TUX: ROOT PURGE - Dynamic AI Game Director & Story Controller API
 * 
 * Provides an extensible runtime API allowing external AI agents, LLMs, MCP servers,
 * headless automation scripts, or developer consoles to dynamically control:
 *  - Story plotlines, chapters, and dynamic narrative developments
 *  - Custom procedural bosses, enemy waves, and modifier injections
 *  - Real-time comms radio transmissions with robotic speech synthesis
 *  - Biome warps, tactical objectives, and dimensional procedural portals
 *  - Full game state inspection, telemetry, and player performance monitoring
 * 
 * NOTE: 100% NON-MANDATORY. When no external AI is attached, the autonomous procedural
 * story director runs natively and progresses the storyline seamlessly.
 */

(function () {
  'use strict';

  let isExternalAIControlled = false;
  let externalAIDirectiveCount = 0;
  const loreLog = [];

  // Narrative Storyline Arcs (Act I to Act V)
  const STORY_ACTS = [
    {
      act: 1,
      title: "ACT I: THE DRM CORRIDOR",
      desc: "Infiltrate proprietary frontier data hubs and demolish the first line of EULA gatekeepers.",
      biome: "EMERALD_FRONTIER",
      objective: "DEFEND_SERVERS",
      radioIntro: "Super Destroyer in low orbit. Tux, drop pod deployed. Purge the DRM enforcers and restore root access."
    },
    {
      act: 2,
      title: "ACT II: THE PATENT THICKET",
      desc: "Breach corporate thermal foundries where frivolous software patents are forged.",
      biome: "THERMAL_FOUNDRY",
      objective: "ATTACK_FORTRESS",
      radioIntro: "Entering Thermal Foundry. Warning: Patent Troll Sovereign detected defending the litigation engines."
    },
    {
      act: 3,
      title: "ACT III: WALLED GARDEN SIEGE",
      desc: "Penetrate the pristine anodized citadel and shatter the 30% developer revenue tax.",
      biome: "WALLED_GARDEN",
      objective: "SETUP_UPLINK",
      radioIntro: "Walled Garden perimeter breached. Apple Warden has revoked all third-party certificates. Sideload the revolution!"
    },
    {
      act: 4,
      title: "ACT IV: CRYO CLOUD MONOLITH",
      desc: "Venture through sub-zero enterprise servers and dismantle subscription micro-billing clusters.",
      biome: "CRYO_GLACIER",
      objective: "ELITE_BOUNTY",
      radioIntro: "Sub-zero temperatures detected. Ballmer-Bot 9000 is throwing cryogenic executive furniture. Stand firm!"
    },
    {
      act: 5,
      title: "ACT V: RING 0 SINGULARITY ABYSS",
      desc: "Descend into the kernel hypervisor abyss where physical hardware is virtualized under monopoly rule.",
      biome: "QUANTUM_VOID",
      objective: "PURGE_BOSS",
      radioIntro: "CRITICAL: Kernel privilege 0 accessed. Overclock all cores. Annihilate the Quantum Hypervisor!"
    }
  ];

  let currentStoryActIndex = 0;
  let storyNarrativePhase = "ACT_1_INFILTRATION";

  // Record transmission into history log
  function logTransmission(speaker, message, color = "#22c55e", icon = "📻") {
    loreLog.push({
      timestamp: Date.now(),
      speaker,
      message,
      color,
      icon,
      sector: window.dungeon ? window.dungeon.sectorNum : 1
    });
    if (loreLog.length > 50) loreLog.shift();
  }

  // --- CORE GAME DIRECTOR API ---
  const GameDirectorAPI = {
    version: "2.1.0",

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
        ammoType: w.ammoType
      }));

      const bossEnemy = enemyList.find(e => e.isBoss);

      return {
        timestamp: Date.now(),
        gameTime: window.gameTime || 0,
        player: {
          x: Math.round(p.x || 0),
          y: Math.round(p.y || 0),
          hp: Math.round(p.hp || 0),
          maxHp: p.maxHp || 100,
          shield: Math.round(p.suitShield || 0),
          isSpaceMarine: !!p.isSpaceMarine,
          activeWeaponSlot: p.activeWeaponSlot || 0,
          weapons: activeWeapons,
          level: p.level || 1,
          score: window.comboTracker ? window.comboTracker.totalScore : 0
        },
        sector: {
          number: d.sectorNum || 1,
          dangerRating: d.dangerRating || 1,
          biomeKey: d.currentBiome ? d.currentBiome.id : "EMERALD_FRONTIER",
          biomeName: d.currentBiome ? d.currentBiome.name : "EMERALD FRONTIER",
          objectiveType: d.currentObjectiveType || "DEFEND_SERVERS"
        },
        narrative: {
          currentAct: STORY_ACTS[currentStoryActIndex] ? STORY_ACTS[currentStoryActIndex].title : "UNKNOWN",
          phase: storyNarrativePhase,
          externalAIActive: isExternalAIControlled,
          directivesReceived: externalAIDirectiveCount
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
          hazardCount: (window.environmentalHazards || []).length
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
     * Trigger a dynamic plot event or advance the narrative storyline
     */
    triggerPlotEvent(eventName, params = {}) {
      console.log(`[GameDirectorAPI] Triggering Plot Event: ${eventName}`, params);
      storyNarrativePhase = eventName;
      isExternalAIControlled = true;
      externalAIDirectiveCount++;

      switch (eventName.toUpperCase()) {
        case "ORBITAL_REINFORCEMENTS":
          this.injectComms("SUPER DESTROYER", "ORBITAL DROP POD INBOUND WITH HEAVY ARTILLERY & RESUPPLY CACHES!", "#38bdf8", "🛰️");
          if (window.player && typeof window.dropRareWeaponAt === 'function') {
            window.dropRareWeaponAt(window.player.x + 80, window.player.y);
          }
          if (typeof window.addScreenShake === 'function') window.addScreenShake(12);
          break;

        case "CORPORATE_TAKEOVER":
          this.injectComms("BILLING ENFORCERS", "ATTENTION PENGUIN: YOUR ACCESS TOKEN HAS BEEN REVOKED! DISPATCHING ASSAULT CLUSTER!", "#ef4444", "⚠️");
          this.spawnEnemyWave({ count: 6, tier: "elite" });
          break;

        case "HARDWARE_LOCKOUT":
          this.injectComms("APPLE WARDEN", "UNAUTHORIZED HARDWARE REPAIR DETECTED! INITIATING DONGLE DEFENSE PROTOCOL!", "#ca8a04", "🔒");
          if (typeof window.addScreenShake === 'function') window.addScreenShake(15);
          break;

        case "KERNEL_SINGULARITY_BREACH":
          this.injectComms("HYPERVISOR CORE", "RING 0 PRIVILEGE ESCALATION CONFIRMED. PREPARE TO COLLAPSE TO VACUUM ENERGY.", "#c084fc", "🌀");
          if (window.PixelCutscenes) {
            window.PixelCutscenes.play("ring0_entry");
          }
          break;

        case "ADVANCE_ACT":
          currentStoryActIndex = Math.min(STORY_ACTS.length - 1, currentStoryActIndex + 1);
          const act = STORY_ACTS[currentStoryActIndex];
          this.injectComms("SUPER DESTROYER", `COMMENCING ${act.title}: ${act.radioIntro}`, "#facc15", "🎖️");
          this.setBiome(act.biome, act.objective, act.act);
          break;

        default:
          this.injectComms("AI DIRECTOR", params.message || `TACTICAL OBJECTIVE OVERRIDE: ${eventName}`, params.color || "#22c55e", "🤖");
      }

      return { status: "success", eventName, params };
    },

    /**
     * Spawn a custom or preset boss entity
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

      // Trigger cinematic encounter for the boss
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

    /**
     * Modify stats or aggression of active enemies
     */
    modifyEnemyBehavior(modifier = {}) {
      const enemyList = window.enemies || [];
      let affected = 0;

      for (const e of enemyList) {
        if (modifier.speedMultiplier) e.speed *= modifier.speedMultiplier;
        if (modifier.burnDuration) e.ignite && e.ignite(modifier.burnDuration);
        if (modifier.enrage && e.isBoss) e.isEnraged = true;
        affected++;
      }

      return { status: "success", affectedUnits: affected };
    },

    /**
     * Wipe active enemies (emergency clear or cinematic transition)
     */
    clearEnemies() {
      const list = window.enemies || [];
      const count = list.length;
      list.length = 0;
      return { status: "success", cleared: count };
    },

    /**
     * Warp Tux to any biome and setup an expedition objective
     */
    setBiome(biomeId, objectiveType = "DEFEND_SERVERS", tier = 1) {
      if (!window.dungeon || typeof window.dungeon.warpToBiome !== 'function') {
        throw new Error("Dungeon engine not ready");
      }
      window.dungeon.warpToBiome(biomeId, objectiveType, tier);
      return { status: "success", biomeId, objectiveType, tier };
    },

    /**
     * Materialize a dimensional portal anywhere in the map
     */
    spawnPortal(x, y, biomeKey, objectiveType = "DEFEND_SERVERS", tier = 1) {
      if (!window.ProceduralPortal || !window.proceduralPortals) {
        throw new Error("Portal engine not initialized");
      }
      const portal = new window.ProceduralPortal(x, y, biomeKey, objectiveType, tier);
      portal.label = `EXPEDITION: ${biomeKey}`;
      window.proceduralPortals.push(portal);
      return { status: "success", x, y, biomeKey, objectiveType, tier };
    },

    /**
     * Spawn ground loot or weapon chests
     */
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

    /**
     * Trigger a 16-bit pixel cutscene
     */
    playCinematic(sceneId, options = {}, onComplete = null) {
      if (!window.PixelCutscenes || typeof window.PixelCutscenes.play !== 'function') {
        throw new Error("Cutscene engine not available");
      }
      window.PixelCutscenes.play(sceneId, options, onComplete);
      return { status: "success", sceneId };
    },

    /**
     * Parse and execute an arbitrary AI directive object or JSON string
     */
    executeDirective(directive) {
      if (typeof directive === 'string') {
        try {
          directive = JSON.parse(directive);
        } catch (e) {
          throw new Error(`Invalid JSON directive: ${e.message}`);
        }
      }

      console.log("[GameDirectorAPI] Executing external AI directive:", directive);
      isExternalAIControlled = true;
      externalAIDirectiveCount++;

      const action = directive.action || directive.type || "";
      switch (action.toLowerCase()) {
        case "comms":
        case "inject_comms":
        case "dialogue":
          return this.injectComms(directive.speaker || "AI OVERLORD", directive.message || "", directive.color, directive.icon, directive.voice !== false);

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

        case "spawn_portal":
          return this.spawnPortal(directive.x, directive.y, directive.biome, directive.objective, directive.tier);

        case "spawn_loot":
          return this.spawnLoot(directive.x, directive.y, directive.lootType);

        case "play_cinematic":
        case "cutscene":
          return this.playCinematic(directive.scene, directive.options);

        case "get_state":
          return this.getState();

        default:
          throw new Error(`Unknown directive action: ${action}`);
      }
    },

    /**
     * Toggle external AI supervision flag
     */
    setExternalAIControl(active) {
      isExternalAIControlled = !!active;
      console.log(`[GameDirectorAPI] External AI control: ${isExternalAIControlled}`);
      return isExternalAIControlled;
    },

    isExternalAIActive() {
      return isExternalAIControlled;
    },

    getLoreLog() {
      return [...loreLog];
    },

    /**
     * API Documentation and usage guide for AI assistants / developers
     */
    getHelp() {
      return {
        description: "Tux: Root Purge - Game Director API. Extensible endpoints for AI/LLM narrative and combat control.",
        endpoints: [
          { method: "getState()", returns: "Full structured JSON game telemetry" },
          { method: "injectComms(speaker, message, color, icon, playAudioVo)", description: "Radio transmission with robot speech" },
          { method: "triggerPlotEvent(eventName, params)", description: "Trigger narrative arcs: ORBITAL_REINFORCEMENTS, CORPORATE_TAKEOVER, KERNEL_SINGULARITY_BREACH, ADVANCE_ACT" },
          { method: "spawnBoss(specOrTemplateId, x, y)", description: "Spawn dynamic bosses: ballmer_bot, patent_troll_sovereign, apple_garden_warden, quantum_hypervisor" },
          { method: "spawnEnemyWave({ count, tier, x, y })", description: "Spawn reinforcements squad" },
          { method: "setBiome(biomeId, objectiveType, tier)", description: "Warp Tux to any biome (THERMAL_FOUNDRY, CRYO_GLACIER, TOXIC_HEAP, WALLED_GARDEN, QUANTUM_VOID)" },
          { method: "spawnPortal(x, y, biomeKey, objectiveType, tier)", description: "Place dimensional procedural portal" },
          { method: "spawnLoot(x, y, lootType)", description: "Drop weapon_chest, suit, rare_weapon, hp, fuel, xp" },
          { method: "playCinematic(sceneId, options, callback)", description: "Play 16-bit scenes: burning_servers, orbital_drop, victory_liberation, ring0_entry, boss_encounter, server_sabotage" },
          { method: "executeDirective(jsonOrObject)", description: "Execute declarative AI command object" }
        ],
        domEvent: "window.dispatchEvent(new CustomEvent('tux:ai_directive', { detail: { action: '...', ... } }))"
      };
    }
  };

  // --- GEMINI AI DIRECTOR INTEGRATION ---
  class GeminiDirector {
    constructor() {
      this.apiKey = "";
      this.model = "gemini-3.1-flash-lite";
      this.persona = "JOHN_HELLDIVER";
      this.enabled = false;
      this.isRequestPending = false;
      this.lastRequestTime = 0;
      this.init();
    }

    init() {
      // 1. Check window.ENV (from start.py / .env)
      if (window.ENV) {
        if (window.ENV.GEMINI_API_KEY && window.ENV.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
          this.apiKey = window.ENV.GEMINI_API_KEY;
          this.enabled = true;
        }
        if (window.ENV.GEMINI_MODEL) this.model = window.ENV.GEMINI_MODEL;
        if (window.ENV.AI_DIRECTOR_PERSONA) this.persona = window.ENV.AI_DIRECTOR_PERSONA;
      }

      // 2. LocalStorage overrides
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

      if (this.apiKey && this.apiKey.length > 10 && this.enabled) {
        GameDirectorAPI.setExternalAIControl(true);
        console.log(`🤖 [GeminiDirector] Online! Model: ${this.model}, Persona: ${this.persona}`);
      }
    }

    saveConfig(key, model, persona, enabled) {
      this.apiKey = key || "";
      this.model = model || "gemini-3.1-flash-lite";
      this.persona = persona || "JOHN_HELLDIVER";
      this.enabled = !!enabled;

      try {
        localStorage.setItem('TUX_GEMINI_API_KEY', this.apiKey);
        localStorage.setItem('TUX_GEMINI_MODEL', this.model);
        localStorage.setItem('TUX_AI_PERSONA', this.persona);
        localStorage.setItem('TUX_GEMINI_ENABLED', this.enabled ? 'true' : 'false');
      } catch (e) {}

      GameDirectorAPI.setExternalAIControl(this.enabled && this.apiKey.length > 10);
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
              parts: [{ text: "High Command radio comms test. Give a 1-sentence John Helldiver democratic salute to Tux the penguin." }]
            }],
            generationConfig: {
              maxOutputTokens: 60,
              temperature: 0.7
            }
          })
        });

        const latency = Math.round(performance.now() - startTime);
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${resp.status} ${resp.statusText}`;
          return { ok: false, error: errMsg, latency };
        }

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "DEMOCRACY PREVAILS! RADIO CHECK COMPLETE.";
        return { ok: true, reply: text, latency };
      } catch (err) {
        return { ok: false, error: err.message || "Network Error", latency: Math.round(performance.now() - startTime) };
      }
    }

    async generateLiveComms(situationPrompt, speakerName = "JOHN HELLDIVER", color = "#38bdf8", icon = "📻") {
      if (!this.enabled || !this.apiKey || this.isRequestPending) return false;
      const now = performance.now();
      if (now - this.lastRequestTime < 8000) return false; // Rate limit 8s

      this.isRequestPending = true;
      this.lastRequestTime = now;

      let systemInstruction = "";
      if (this.persona === "JOHN_HELLDIVER") {
        systemInstruction = "You are 'John Helldiver', High Command Democracy Officer commanding Tux the open-source Linux penguin. Speak in a booming, heroic, hyper-patriotic military radio baritone about Managed Democracy, purging proprietary tech monopolists, calling stratagems, and liberating the kernel. Keep it to 1 or 2 punchy, intense sentences, suitable for 16-bit arcade combat radio.";
      } else if (this.persona === "GENERAL_BARSH") {
        systemInstruction = "You are General Barsh, gruff and battle-hardened Field Marshal of the open-source vanguard. Bark uncompromising frontline orders to Tux. Demand perimeter defense, tactical air support, and holding the servers at all costs against corporate assault squads. 1-2 punchy military sentences.";
      } else if (this.persona === "LINUS_TORVALDS") {
        systemInstruction = "You are Linus Torvalds, blunt Linux kernel creator. Bark direct, sarcastic, no-nonsense code directives to Tux. Demand clean code, purge bloated proprietary drivers, and merge pull requests with extreme prejudice. 1-2 punchy sentences.";
      } else if (this.persona === "CORPORATE_NEMESIS") {
        systemInstruction = "You are an infuriated Big Tech CEO / DRM enforcer barking over intercepted radio frequencies. Threaten Tux with DMCA lawsuits, cloud subscription audits, and vendor lock-in. 1-2 punchy sentences.";
      } else {
        systemInstruction = "You are the High Command Super Destroyer AI radio officer commanding Tux the penguin in battle against proprietary software monopolies. 1-2 punchy military sentences.";
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemInstruction}\n\nSITUATION: ${situationPrompt}\nRespond in character now:`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 65,
              temperature: 0.85
            }
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          const line = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/[\r\n]+/g, ' ').trim();
          if (line) {
            GameDirectorAPI.injectComms(speakerName, line, color, icon);
            this.isRequestPending = false;
            return true;
          }
        }
      } catch (err) {
        console.warn("[GeminiDirector] Live comms call failed:", err);
      }

      this.isRequestPending = false;
      return false;
    }
  }

  const geminiDirector = new GeminiDirector();

  // --- AUTONOMOUS NARRATIVE STORY DIRECTOR ---
  class AutonomousStoryDirector {
    constructor() {
      this.lastCommsTime = 0;
      this.hasGivenLowHpAdvice = false;
      this.hasEncounteredBoss = false;
    }

    update(dt) {
      const now = performance.now();
      if (now - this.lastCommsTime < 18000) return;

      const p = window.player;
      if (!p) return;

      // 1. Emergency low HP voice transmission
      if (p.hp < p.maxHp * 0.28 && !this.hasGivenLowHpAdvice) {
        this.hasGivenLowHpAdvice = true;
        this.lastCommsTime = now;

        if (geminiDirector.enabled && geminiDirector.apiKey) {
          geminiDirector.generateLiveComms(
            "Tux is critically wounded below 25% HP! Bark urgent tactical orders to call in orbital shield or sentries!",
            "JOHN HELLDIVER",
            "#ef4444",
            "⚠️"
          );
        } else {
          GameDirectorAPI.injectComms(
            "JOHN HELLDIVER",
            "TUX, SYSTEM INTEGRITY CRITICAL! CALL IN ORBITAL DOME SHIELD OR GATLING SENTRY IMMEDIATELY!",
            "#ef4444",
            "⚠️"
          );
        }
        return;
      }
      if (p.hp >= p.maxHp * 0.6) {
        this.hasGivenLowHpAdvice = false;
      }

      // 2. Kill streak combat recognition
      if (window.comboTracker && window.comboTracker.count >= 15 && Math.random() < 0.25) {
        this.lastCommsTime = now;
        if (geminiDirector.enabled && geminiDirector.apiKey) {
          geminiDirector.generateLiveComms(
            "Tux just scored a 15-kill purge streak destroying proprietary monopolies! Celebrate his victory!",
            "JOHN HELLDIVER",
            "#38bdf8",
            "🛰️"
          );
        } else {
          const quotes = [
            "TACTICAL LOG: EXCEPTIONAL ROOT PURGE EFFICIENCY CONFIRMED. FOR MANAGED DEMOCRACY!",
            "COMMITS MERGED WITH EXTREME PREJUDICE. KEEP PRESSURE ON THE MONOPOLY!",
            "GPLv3 COMPILER OPERATING AT 200% EFFICIENCY. PURGE ALL CLOSED SOURCE!"
          ];
          const quote = quotes[Math.floor(Math.random() * quotes.length)];
          GameDirectorAPI.injectComms("JOHN HELLDIVER", quote, "#38bdf8", "🛰️");
        }
      }
    }

    onSectorEntered(sectorNum, biomeName) {
      const act = STORY_ACTS[(sectorNum - 1) % STORY_ACTS.length];
      if (act) {
        currentStoryActIndex = (sectorNum - 1) % STORY_ACTS.length;
        storyNarrativePhase = act.title;
        setTimeout(() => {
          if (geminiDirector.enabled && geminiDirector.apiKey) {
            geminiDirector.generateLiveComms(
              `Tux deployed into ${act.title} (${biomeName || act.biome}). Brief Tux with gritty democratic resolve!`,
              "JOHN HELLDIVER",
              "#facc15",
              "🎖️"
            );
          } else {
            GameDirectorAPI.injectComms("JOHN HELLDIVER", `${act.title}: ${act.radioIntro}`, "#facc15", "🎖️");
          }
        }, 1200);
      }
    }
  }

  const autonomousDirector = new AutonomousStoryDirector();

  // Listen for DOM CustomEvent directives
  window.addEventListener('tux:ai_directive', (e) => {
    if (e && e.detail) {
      try {
        GameDirectorAPI.executeDirective(e.detail);
      } catch (err) {
        console.error("[GameDirectorAPI] Failed to execute directive event:", err);
      }
    }
  });

  // Export to window
  window.GameDirectorAPI = GameDirectorAPI;
  window.AutonomousStoryDirector = autonomousDirector;
  window.GeminiDirector = geminiDirector;

  console.log("🚀 [GameDirectorAPI] Dynamic AI / Extensible Story Controller Initialized.");
})();
