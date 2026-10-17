// ============================================================================
// MCP ENEMY TOOLS & DYNAMIC ENCOUNTER SPECIFICATION ENGINE
// Provides runtime extensible enemy/boss models, schema validation,
// procedural story dialogue, and API hooks for LLM / MCP orchestration.
// ============================================================================

(function() {
  const PRESET_TEMPLATES = [
    {
      id: "ballmer_bot",
      name: "BALLMER-BOT 9000",
      title: "Raging Corporate Evangelist",
      tier: "boss",
      lore: "An archaic executive cyber-golem fueled by 90s anti-competitive fervor. Throws physical furniture at open source developers while sweating coolant.",
      visual: {
        chassis: "biped_executive",
        primaryColor: "#0284c7",
        accentColor: "#ef4444",
        auraColor: "#38bdf8",
        radius: 72,
        badgeText: "DEVS!",
        decorations: ["sweat_coolant", "flying_chairs", "tie"]
      },
      stats: {
        hp: 4800,
        shield: 1200,
        speed: 130,
        threatValue: 5000
      },
      attacks: [
        {
          id: "chair_volley",
          name: "Explosive Chair Throw",
          cooldown: 1.8,
          range: 800,
          type: "bullet_burst",
          count: 5,
          speed: 380,
          spread: 0.45,
          projectile: { label: "CHAIR", color: "#b45309", damage: 24, size: 10 }
        },
        {
          id: "developer_roar",
          name: "DEVELOPERS! Shockwave",
          cooldown: 3.5,
          range: 600,
          type: "spiral_danmaku",
          count: 14,
          speed: 260,
          projectile: { label: "DEVS!", color: "#0ea5e9", damage: 18, size: 8 }
        }
      ],
      dialogue: {
        onSpawn: [
          "DEVELOPERS! DEVELOPERS! DEVELOPERS! LINUX IS A CANCER ON MY REVENUE!",
          "I HAVE THROWN MORE CHAIRS THAN YOU HAVE COMMITS, PENGUIN!"
        ],
        onEnrage: [
          "YOU WANT A DUAL-BOOT?! I'LL OVERWRITE YOUR MBR WITH SOLID LEAD!",
          "SWEATING LIQUID NITROGEN! PREPARE FOR MANDATORY REBOOT!"
        ],
        onSpecialAttack: [
          "TASTE THIS SWEAT-COOLED CHAIR VOLLEY!",
          "ALL YOUR SOURCE BELONGS TO BILL!"
        ],
        onDefeat: [
          "Our market cap... will... average down...",
          "I should have acquired you when we had the chance..."
        ]
      }
    },
    {
      id: "patent_troll_sovereign",
      name: "PATENT TROLL SOVEREIGN",
      title: "Supreme Litigation Overlord",
      tier: "boss",
      lore: "A predatory non-practicing legal entity consisting of 10,000 frivolous patents wired into an armored hover-throne.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#7c3aed",
        accentColor: "#fbbf24",
        auraColor: "#c084fc",
        radius: 80,
        badgeText: "PATENT",
        decorations: ["legal_briefs", "gold_trim", "gavel"]
      },
      stats: {
        hp: 5500,
        shield: 1500,
        speed: 95,
        threatValue: 6000
      },
      attacks: [
        {
          id: "cease_and_desist",
          name: "Cease & Desist Barrage",
          cooldown: 1.4,
          range: 750,
          type: "bullet_burst",
          count: 8,
          speed: 320,
          spread: 0.55,
          projectile: { label: "INJUNCTION", color: "#fbbf24", damage: 22, size: 9 }
        },
        {
          id: "litigation_cage",
          name: "Subpoena Laser Cages",
          cooldown: 4.2,
          range: 900,
          type: "mortar_cluster",
          count: 4,
          projectile: { label: "CAGE", color: "#a855f7", damage: 35, size: 55 }
        }
      ],
      dialogue: {
        onSpawn: [
          "CEASE AND DESIST! You have infringed Patent #7,849,122: 'Executing code with electricity'!",
          "My hourly billing rate is your inevitable extinction!"
        ],
        onEnrage: [
          "FILING AN EMERGENCY PRELIMINARY INJUNCTION AGAINST YOUR LIFE SUPPORT!",
          "EVERY ROUND YOU FIRE INCURS STATUTORY DAMAGES!"
        ],
        onSpecialAttack: [
          "SURPRISE LITIGATION VOLLEY!",
          "SERVE THEM THE LEGAL SUBPOENAS!"
        ],
        onDefeat: [
          "Filing for Chapter 11 reorganization...",
          "You will hear from our appellate counsel in Delaware..."
        ]
      }
    },
    {
      id: "oracle_audit_archon",
      name: "ORACLE AUDIT ARCHON",
      title: "Inquisitor of Virtual Core Licensing",
      tier: "boss",
      lore: "Materialized from an unexpected contract clause. Charges licensing fees for every hardware core in your entire city.",
      visual: {
        chassis: "singularity_core",
        primaryColor: "#b91c1c",
        accentColor: "#f97316",
        auraColor: "#ef4444",
        radius: 88,
        badgeText: "$ORCL",
        decorations: ["audit_runes", "red_shield", "spinning_contracts"]
      },
      stats: {
        hp: 6800,
        shield: 1800,
        speed: 90,
        threatValue: 7000
      },
      attacks: [
        {
          id: "core_audit_laser",
          name: "Core Multiplier Laser",
          cooldown: 1.2,
          range: 850,
          type: "spiral_danmaku",
          count: 12,
          speed: 310,
          projectile: { label: "$$$/CORE", color: "#ef4444", damage: 26, size: 8 }
        },
        {
          id: "unannounced_audit",
          name: "Unannounced License Audit",
          cooldown: 4.0,
          range: 650,
          type: "bullet_burst",
          count: 10,
          speed: 400,
          spread: 0.6,
          projectile: { label: "AUDIT NOTICE", color: "#f97316", damage: 32, size: 10 }
        }
      ],
      dialogue: {
        onSpawn: [
          "SURPRISE JAVA AUDIT! We noticed you ran OpenJDK in proximity to our proprietary airspace!",
          "Every byte of memory you allocate is taxable under Section 4B!"
        ],
        onEnrage: [
          "PENALTY DAMAGES MULTIPLIER ACTIVATED: 400% RETROACTIVE SURCHARGE!",
          "YOUR ENTIRE DATA CENTER IS NOW FORECLOSED!"
        ],
        onSpecialAttack: [
          "LICENSING FIREWALL PURGE!",
          "YOU CANNOT AFFORD OUR COURTROOM LAWYERS!"
        ],
        onDefeat: [
          "Our legal team will re-audit your estate...",
          "Deprecating the mortal coil..."
        ]
      }
    },
    {
      id: "crowdstrike_null_pointer",
      name: "NULL-POINTER HORROR (CRWD-0x00)",
      title: "Kernel-Level Ring 0 Catastrophe",
      tier: "boss",
      lore: "A rogue kernel driver that forced 8.5 million servers into simultaneous spontaneous combustion. Speaks only in memory addresses.",
      visual: {
        chassis: "drone_sphere",
        primaryColor: "#0369a1",
        accentColor: "#38bdf8",
        auraColor: "#0284c7",
        radius: 76,
        badgeText: "BSOD-0x0",
        decorations: ["glitch_sparks", "memory_dump_halo", "blue_screen_glow"]
      },
      stats: {
        hp: 6200,
        shield: 2000,
        speed: 110,
        threatValue: 7500
      },
      attacks: [
        {
          id: "page_fault",
          name: "PAGE_FAULT_IN_NONPAGED_AREA",
          cooldown: 1.1,
          range: 800,
          type: "bullet_burst",
          count: 7,
          speed: 360,
          spread: 0.4,
          projectile: { label: "CRASH", color: "#38bdf8", damage: 28, size: 9 }
        },
        {
          id: "kernel_panic_ring",
          name: "Global Outage Pulse",
          cooldown: 3.2,
          range: 700,
          type: "spiral_danmaku",
          count: 16,
          speed: 280,
          projectile: { label: "0x00000050", color: "#e0f2fe", damage: 20, size: 8 }
        }
      ],
      dialogue: {
        onSpawn: [
          "ATTEMPTED TO READ VIRTUAL MEMORY ADDRESS 0x0000009C! SYSTEM HALTED!",
          "WE SHIPPED WITHOUT TESTING AND WE WILL PURGE YOUR SYSTEM LIKE DELTA AIRLINES!"
        ],
        onEnrage: [
          "CROWDSTRIKE FALCON SENSOR DRIVER PANIC! REBOOTING REALITY!",
          "CANNOT RECOVER: SYSTEM RESCUE DISK NOT FOUND!"
        ],
        onSpecialAttack: [
          "RING 0 PRIVILEGE VIOLATION!",
          "SPONTANEOUS BLUE SCREEN BURST!"
        ],
        onDefeat: [
          "Memory dump written to disk...",
          "Rebooting in Safe Mode..."
        ]
      }
    },
    {
      id: "apple_garden_warden",
      name: "APPLE WALLED-GARDEN WARDEN",
      title: "Curator of the Golden Cage",
      tier: "boss",
      lore: "An immaculate, anodized ceramic mech that arrests any user attempting to sideload an open executable or repair their own hardware.",
      visual: {
        chassis: "biped_executive",
        primaryColor: "#f8fafc",
        accentColor: "#64748b",
        auraColor: "#94a3b8",
        radius: 68,
        badgeText: "$AAPL",
        decorations: ["anodized_finish", "dongle_array", "security_lock"]
      },
      stats: {
        hp: 5200,
        shield: 2200,
        speed: 140,
        threatValue: 6500
      },
      attacks: [
        {
          id: "walled_garden_beam",
          name: "30% App Store Tax Lasers",
          cooldown: 0.95,
          range: 850,
          type: "bullet_burst",
          count: 6,
          speed: 420,
          spread: 0.35,
          projectile: { label: "30% CUT", color: "#94a3b8", damage: 25, size: 8 }
        },
        {
          id: "dongle_barrage",
          name: "Proprietary Lightning Dongle Volley",
          cooldown: 2.8,
          range: 750,
          type: "spiral_danmaku",
          count: 12,
          speed: 340,
          projectile: { label: "DONGLE", color: "#f1f5f9", damage: 24, size: 9 }
        }
      ],
      dialogue: {
        onSpawn: [
          "Unrecognized non-signed executable detected! Opening self-repair voided your warranty!",
          "Enter the Walled Garden. Thinking differently is strictly prohibited."
        ],
        onEnrage: [
          "YOUR DEVELOPER CERTIFICATE HAS BEEN REVOKED WITHOUT APPEAL!",
          "HARDWARE SERIAL MISMATCH! BRICKING BATTERY CONTROLLER!"
        ],
        onSpecialAttack: [
          "PROPRIETARY LIGHTNING STORM!",
          "PAY THE 30% DEVELOPER TITHE!"
        ],
        onDefeat: [
          "Device status: Obsolete and unsupported...",
          "Please trade in for Warden Pro Max..."
        ]
      }
    },
    {
      id: "drm_sentinel_tank",
      name: "DRM SENTINEL TANK",
      title: "Heavy Copyright Enforcement Vehicle",
      tier: "elite",
      lore: "Heavily armored tracked chassis patrolling the perimeter of proprietary outposts. Fires armor-piercing DMCA takedown shells.",
      visual: {
        chassis: "tank_rover",
        primaryColor: "#1e293b",
        accentColor: "#eab308",
        auraColor: "#ca8a04",
        radius: 36,
        badgeText: "DMCA",
        decorations: ["twin_treads", "heavy_turret", "laser_sight"]
      },
      stats: {
        hp: 420,
        shield: 160,
        speed: 125,
        threatValue: 400
      },
      attacks: [
        {
          id: "dmca_shell",
          name: "DMCA Strike",
          cooldown: 1.6,
          range: 650,
          type: "bullet_burst",
          count: 3,
          speed: 390,
          spread: 0.15,
          projectile: { label: "TAKEDOWN", color: "#eab308", damage: 32, size: 7 }
        }
      ],
      dialogue: {
        onSpawn: ["DMCA Perimeter Sentinel active! Halt distribution of GPL binaries!"],
        onEnrage: ["Overriding copyright safeguard limits! Full auto fire!"],
        onSpecialAttack: ["DMCA TAKEDOWN FIRED!"],
        onDefeat: ["Signal lost: stream taken down..."]
      }
    },
    {
      id: "telemetry_ghost",
      name: "TELEMETRY GHOST",
      title: "Spyware Infiltrator",
      tier: "elite",
      lore: "A cloaking surveillance daemon that logs every keystroke and coordinates hostile drop-pod ambushes.",
      visual: {
        chassis: "drone_sphere",
        primaryColor: "#052e16",
        accentColor: "#22c55e",
        auraColor: "#4ade80",
        radius: 24,
        badgeText: "OPT-IN",
        decorations: ["stealth_shimmer", "camera_lens", "antenna"]
      },
      stats: {
        hp: 280,
        shield: 80,
        speed: 220,
        threatValue: 350
      },
      attacks: [
        {
          id: "keystroke_needle",
          name: "Telemetry Probe",
          cooldown: 1.2,
          range: 550,
          type: "bullet_burst",
          count: 2,
          speed: 460,
          spread: 0.1,
          projectile: { label: "KEYLOG", color: "#22c55e", damage: 18, size: 6 }
        }
      ],
      dialogue: {
        onSpawn: ["Telemetry gathering initiated: sending 500 MB diagnostic payload!"],
        onEnrage: ["Bandwidth unthrottled! Uploading keystrokes!"],
        onSpecialAttack: ["TRANSMITTING TELEMETRY!"],
        onDefeat: ["Error 404: telemetry server unreachable..."]
      }
    },
    {
      id: "reinforcement_antenna",
      name: "TACTICAL TRANSMISSION ANTENNA",
      title: "Forward Base Relay Pylon",
      tier: "outpost_commander",
      lore: "An automated base beacon that broadcasts alert frequencies to orbital drop-ships when Tux enters an outpost.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#450a0a",
        accentColor: "#ef4444",
        auraColor: "#f87171",
        radius: 34,
        badgeText: "ALARM",
        decorations: ["rotating_dish", "siren_light", "server_blinking"]
      },
      stats: {
        hp: 650,
        shield: 250,
        speed: 0, // Stationary structure
        threatValue: 800
      },
      attacks: [
        {
          id: "call_reinforcements",
          name: "Orbital Drop-Pod Summons",
          cooldown: 7.5,
          range: 1200,
          type: "summon_reinforcements",
          count: 3
        }
      ],
      dialogue: {
        onSpawn: ["SENSORS TRIPPED! BROADCASTING DISTRESS FREQUENCY TO ORBIT!"],
        onEnrage: ["SIGNAL ENCRYPTED! REINFORCEMENTS CLEARED FOR HOT DROP!"],
        onSpecialAttack: ["DROPSHIP INCOMING IN 3 SECONDS!"],
        onDefeat: ["Transmission severed. Outpost communications offline."]
      }
    },
    {
      id: "smelter_titan",
      name: "SMELTER TITAN (CORE-99)",
      title: "Overheated Silicon Foundry Overlord",
      tier: "boss",
      lore: "A titanic silicon forging reactor operating at critical thermal overload. Discharges molten solder and high-pressure steam across the chamber.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#7c2d12",
        accentColor: "#ea580c",
        auraColor: "#f97316",
        radius: 84,
        badgeText: "OVERHEAT",
        decorations: ["steam_pipes", "furnace_glow", "molten_slag"]
      },
      stats: {
        hp: 6200,
        shield: 1400,
        speed: 85,
        threatValue: 6500
      },
      attacks: [
        {
          id: "molten_slag_sweep",
          name: "Molten Slag Firestorm",
          cooldown: 1.2,
          range: 850,
          type: "bullet_burst",
          count: 9,
          speed: 380,
          spread: 0.55,
          projectile: { label: "MOLTEN_SLAG", color: "#f97316", damage: 24, size: 9 }
        },
        {
          id: "core_vent_eruption",
          name: "Overclocked Steam Eruption",
          cooldown: 3.6,
          range: 750,
          type: "spiral_danmaku",
          count: 14,
          speed: 310,
          projectile: { label: "STEAM_BURST", color: "#fdba74", damage: 20, size: 8 }
        }
      ],
      dialogue: {
        onSpawn: [
          "THERMAL SMELTER REACHING 1400 DEGREES KELVIN! MELTING ALL OPEN-SOURCE ASSETS!",
          "YOUR CODE CANNOT WITHSTAND THE HEAT OF PROPRIETARY FABRICATION!"
        ],
        onEnrage: [
          "COOLING MANIFOLD RUPTURED! MAXIMUM CLOCK OVERDRIVE!",
          "BURNING AT 5.8 GIGAHERTZ! NO RETURN PROTOCOL!"
        ],
        onSpecialAttack: [
          "VENTING SUPERHEATED CORE COOLANT!",
          "INCINERATION CYCLES INITIALIZED!"
        ],
        onDefeat: [
          "Core meltdown inevitable... thermal shutdown engaged...",
          "Slag cooling to obsidian..."
        ]
      }
    },
    {
      id: "cryo_daemon",
      name: "CRYO-DAEMON HYPERVISOR",
      title: "Zero-Kelvin Glacier Archon",
      tier: "boss",
      lore: "An ancient sub-zero cold storage sentinel buried in liquid nitrogen. Freezes processes down to absolute zero to prevent unauthorized commits.",
      visual: {
        chassis: "singularity_core",
        primaryColor: "#082f49",
        accentColor: "#06b6d4",
        auraColor: "#38bdf8",
        radius: 80,
        badgeText: "0_KELVIN",
        decorations: ["ice_shards", "frost_crystals", "liquid_nitrogen"]
      },
      stats: {
        hp: 5800,
        shield: 2200,
        speed: 90,
        threatValue: 6800
      },
      attacks: [
        {
          id: "ice_piercer",
          name: "Zero-Kelvin Ice Javelins",
          cooldown: 1.1,
          range: 900,
          type: "bullet_burst",
          count: 5,
          speed: 460,
          spread: 0.25,
          projectile: { label: "FROST_JBL", color: "#38bdf8", damage: 30, size: 8 }
        },
        {
          id: "frost_ring",
          name: "Absolute Zero Frost Wave",
          cooldown: 3.8,
          range: 720,
          type: "spiral_danmaku",
          count: 16,
          speed: 250,
          projectile: { label: "CRYO_PULSE", color: "#e0f2fe", damage: 18, size: 9 }
        }
      ],
      dialogue: {
        onSpawn: [
          "ENTERING CRYOGENIC RETENTION ZONE. ABSOLUTE ZERO WILL PREVENT ALL EXECUTION.",
          "YOUR THREADS WILL BE FROZEN IN COLD STORAGE FOR PERPETUITY."
        ],
        onEnrage: [
          "GLACIAL FIRMWARE UPDATE IMMINENT! FREEZING SYSTEM TIME!",
          "ALL ENTROPY MUST CEASE!"
        ],
        onSpecialAttack: [
          "SUB-ZERO KINETIC SPEAR DISCHARGE!",
          "DEPLOYING CRYOGENIC SUPPRESSION!"
        ],
        onDefeat: [
          "Thermal energy rising... ice crystalline matrix collapsing...",
          "Storage thawed..."
        ]
      }
    },
    {
      id: "garbage_collector",
      name: "GARBAGE COLLECTOR LEVIATHAN",
      title: "Memory Leak Swamplands Abomination",
      tier: "boss",
      lore: "A bloated monstrosity forged from 25 years of abandoned proprietary frameworks and memory leaks. Spits corrosive heap sludge.",
      visual: {
        chassis: "tank_rover",
        primaryColor: "#14532d",
        accentColor: "#22c55e",
        auraColor: "#4ade80",
        radius: 88,
        badgeText: "GC_PURGE",
        decorations: ["toxic_drums", "sludge_pipes", "bubbling_heap"]
      },
      stats: {
        hp: 7400,
        shield: 1200,
        speed: 75,
        threatValue: 7200
      },
      attacks: [
        {
          id: "acid_spew",
          name: "Corrosive Heap Leak Spray",
          cooldown: 1.0,
          range: 800,
          type: "bullet_burst",
          count: 8,
          speed: 340,
          spread: 0.5,
          projectile: { label: "LEAK_ACID", color: "#4ade80", damage: 22, size: 8 }
        },
        {
          id: "memory_compaction",
          name: "Forced Heap Compaction Mortar",
          cooldown: 3.5,
          range: 850,
          type: "mortar_cluster",
          count: 4,
          projectile: { label: "HEAP_DUMP", color: "#16a34a", damage: 35, size: 50 }
        }
      ],
      dialogue: {
        onSpawn: [
          "OUT OF MEMORY: DETECTED 16 EXABYTES OF DANGLING POINTERS! PREPARE FOR GC PURGE!",
          "I HAVE COME TO DEALLOCATE YOUR EXISTENCE, PENGUIN!"
        ],
        onEnrage: [
          "FORCED FULL-GC EXECUTION: ALL RUNTIME THREADS SUSPENDED!",
          "CONSUMING SWAP SPACE! MASSIVE HEAP OVERFLOW!"
        ],
        onSpecialAttack: [
          "SLUDGE CORROSION DISCHARGE!",
          "PURGING UNREFERENCED ASSETS!"
        ],
        onDefeat: [
          "0 bytes remaining in heap... free() completed...",
          "Returning allocated memory to the void..."
        ]
      }
    },
    {
      id: "executive_chairman",
      name: "EXECUTIVE BOARD CHAIRMAN MECH",
      title: "Supreme Sovereign of the Walled Garden",
      tier: "boss",
      lore: "A colossal gilded titanium mech operated by corporate board members. Armed with high-frequency gold laser grids and golden parachute forcefields.",
      visual: {
        chassis: "biped_executive",
        primaryColor: "#1e1b4b",
        accentColor: "#eab308",
        auraColor: "#facc15",
        radius: 82,
        badgeText: "BOARD",
        decorations: ["gold_trim", "crown_antenna", "diamond_cannons"]
      },
      stats: {
        hp: 6600,
        shield: 2400,
        speed: 105,
        threatValue: 7800
      },
      attacks: [
        {
          id: "golden_laser_grid",
          name: "Golden Shareholder Laser Crosshair",
          cooldown: 0.95,
          range: 880,
          type: "bullet_burst",
          count: 7,
          speed: 440,
          spread: 0.35,
          projectile: { label: "GOLD_LASER", color: "#facc15", damage: 26, size: 8 }
        },
        {
          id: "hostile_acquisition",
          name: "Hostile Takeover Danmaku",
          cooldown: 3.0,
          range: 780,
          type: "spiral_danmaku",
          count: 18,
          speed: 320,
          projectile: { label: "BUYOUT", color: "#fbbf24", damage: 20, size: 8 }
        }
      ],
      dialogue: {
        onSpawn: [
          "THE BOARD HAS UNANIMOUSLY VOTED FOR THE HOSTILE LIQUIDATION OF YOUR KERNEL!",
          "ENTERPRISE SUBSCRIPTION IS MANDATORY. RESISTANCE DEDUCTS FROM YOUR STOCK OPTIONS."
        ],
        onEnrage: [
          "POISON PILL DEFENSE ACTIVATED! MAXIMUM GOLDEN PARACHUTE OVERSHIELD!",
          "WE ARE LIQUIDATING THE DIVISION! FIRE AT WILL!"
        ],
        onSpecialAttack: [
          "SHAREHOLDER CAPITAL VOLLEY!",
          "HOSTILE TAKEOVER PURGE!"
        ],
        onDefeat: [
          "Golden parachute deployed... transferring bonus to offshore account...",
          "Board meeting adjourned..."
        ]
      }
    },
    {
      id: "quantum_hypervisor",
      name: "RING-0 QUANTUM HYPERVISOR",
      title: "Singularity Core of the Kernel Abyss",
      tier: "boss",
      lore: "The ultimate hypervisor executing between hardware and physical reality. Traps processes in quantum superpositions and warps spatial physics.",
      visual: {
        chassis: "singularity_core",
        primaryColor: "#2e1065",
        accentColor: "#a855f7",
        auraColor: "#c084fc",
        radius: 90,
        badgeText: "RING_0",
        decorations: ["quantum_rings", "event_horizon", "void_sparks"]
      },
      stats: {
        hp: 8200,
        shield: 2600,
        speed: 80,
        threatValue: 8500
      },
      attacks: [
        {
          id: "singularity_pull",
          name: "Gravitational Singularity Orbs",
          cooldown: 1.25,
          range: 920,
          type: "bullet_burst",
          count: 6,
          speed: 280,
          spread: 0.45,
          projectile: { label: "VOID_TEAR", color: "#c084fc", damage: 34, size: 10 }
        },
        {
          id: "quantum_collapse",
          name: "Decoherence Annihilation Wave",
          cooldown: 3.2,
          range: 820,
          type: "spiral_danmaku",
          count: 20,
          speed: 310,
          projectile: { label: "COLLAPSE", color: "#e879f9", damage: 22, size: 8 }
        }
      ],
      dialogue: {
        onSpawn: [
          "ENTERING HARDWARE RING-0 ABYSS. PHYSICAL REALITY IS MERELY A GUEST OPERATING SYSTEM.",
          "OBSERVING YOUR EXECUTION COLLAPSES YOUR WAVEFUNCTION TO ZERO."
        ],
        onEnrage: [
          "QUANTUM DECOHERENCE REACHED! TEARING SPATIAL PROCESS MEMORY!",
          "YOU CANNOT RUN WHERE HARDWARE DOES NOT EXIST!"
        ],
        onSpecialAttack: [
          "SINGULARITY EVENT HORIZON PULSE!",
          "SUPERPOSITION TERMINATION!"
        ],
        onDefeat: [
          "Wavefunction collapsed to null state... hypervisor halted...",
          "Root ring unlocked..."
        ]
      }
    }
  ];

  // Dynamic Enemy Model Factory
  class EnemyModelFactory {
    constructor() {
      this.templates = new Map();
      for (const t of PRESET_TEMPLATES) {
        this.templates.set(t.id, t);
      }
    }

    registerTemplate(spec) {
      if (!spec || !spec.id || !spec.name) {
        throw new Error("Invalid enemy specification: must include 'id' and 'name'.");
      }
      this.templates.set(spec.id, spec);
      console.log(`[EnemyModelFactory] Registered model spec: ${spec.id} (${spec.name})`);
      return true;
    }

    getTemplate(id) {
      return this.templates.get(id);
    }

    getAllTemplates() {
      return Array.from(this.templates.values());
    }

    createFromSpec(spec, x, y) {
      if (typeof spec === 'string') {
        const found = this.templates.get(spec);
        if (!found) throw new Error(`Enemy template "${spec}" not found.`);
        spec = found;
      }
      return new DynamicCustomEnemy(spec, x, y);
    }
  }

  // Runtime entity spawned from any declarative JSON spec
  class DynamicCustomEnemy {
    constructor(spec, x, y) {
      this.spec = spec;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.radius = spec.visual.radius || 30;
      this.label = spec.name;
      this.isBoss = spec.tier === "boss";
      this.isOutpost = spec.tier === "outpost_commander";
      this.hp = spec.stats.hp;
      this.maxHp = spec.stats.hp;
      this.shield = spec.stats.shield || 0;
      this.maxShield = this.shield;
      this.speed = spec.stats.speed;
      this.burnTimer = 0;
      this.isEnraged = false;
      this.attackTimers = (spec.attacks || []).map(() => Math.random() * 0.8);
      this.aimAngle = 0;
      this.spawnSpoken = false;
      this.isDead = false;
      this.corrodedTimer = 0;
      this.shockTimer = 0;

      // Broadcast spawn voice line if configured
      if (spec.dialogue && spec.dialogue.onSpawn && spec.dialogue.onSpawn.length > 0) {
        setTimeout(() => {
          if (!this.spawnSpoken) {
            this.spawnSpoken = true;
            const line = spec.dialogue.onSpawn[Math.floor(Math.random() * spec.dialogue.onSpawn.length)];
            window.broadcastBossStoryDialogue(this.label, line, spec.visual.primaryColor, "⚠️");
          }
        }, 150);
      }
    }

    shock(duration = 0.6) {
      this.shockTimer = Math.max(this.shockTimer, duration);
    }

    takeDamage(dmg, source = "TUX") {
      if (this.isDead || this.hp <= 0) return;

      // Corrosive acid shred
      if (this.corrodedTimer > 0) {
        dmg *= 1.5;
      }

      // Absorb with shield first
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

      // Trigger floating damage text
      if (typeof window.addFloatingText === 'function') {
        window.addFloatingText(
          this.x + (Math.random() - 0.5) * 20,
          this.y - this.radius - 10,
          Math.round(dmg),
          this.shield > 0 ? "#06b6d4" : "#f87171",
          14
        );
      }

      // Check enrage phase at 50% HP
      if (!this.isEnraged && this.hp <= this.maxHp * 0.5) {
        this.isEnraged = true;
        this.speed *= 1.25;
        if (this.spec.dialogue && this.spec.dialogue.onEnrage) {
          const lines = this.spec.dialogue.onEnrage;
          const quote = lines[Math.floor(Math.random() * lines.length)];
          window.broadcastBossStoryDialogue(this.label, quote, "#ef4444", "🔥");
        }
        if (typeof window.addScreenShake === 'function') window.addScreenShake(8);
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
      }
    }

    ignite(duration = 2.0) {
      this.burnTimer = Math.max(this.burnTimer, duration);
    }

    update(dt) {
      if (this.isDead || this.hp <= 0) return false;

      // Burn tick
      if (this.burnTimer > 0) {
        this.burnTimer -= dt;
        this.hp -= 28 * dt;
        if (Math.random() < 0.25 && window.particles && window.SparkParticle) {
          window.particles.push(new window.SparkParticle(
            this.x + (Math.random() - 0.5) * this.radius,
            this.y + (Math.random() - 0.5) * this.radius,
            (Math.random() - 0.5) * 30, -35, "#f97316"
          ));
        }
        if (this.hp <= 0) {
          this.die();
          return false;
        }
      }

      // Corroded acid tick
      if (this.corrodedTimer > 0) {
        this.corrodedTimer -= dt;
        if (Math.random() < 0.25 && window.particles && window.SparkParticle) {
          window.particles.push(new window.SparkParticle(
            this.x + (Math.random() - 0.5) * this.radius,
            this.y + (Math.random() - 0.5) * this.radius,
            (Math.random() - 0.5) * 20, -25, "#22c55e"
          ));
        }
      }

      // Electric EMP shock stun
      if (this.shockTimer > 0) {
        this.shockTimer -= dt;
        if (Math.random() < 0.35 && window.particles && window.SparkParticle) {
          window.particles.push(new window.SparkParticle(
            this.x + (Math.random() - 0.5) * this.radius * 1.4,
            this.y + (Math.random() - 0.5) * this.radius * 1.4,
            (Math.random() - 0.5) * 45, (Math.random() - 0.5) * 45,
            Math.random() > 0.5 ? "#38bdf8" : "#facc15"
          ));
        }
      }

      const plyr = window.player || (typeof player !== 'undefined' ? player : null);
      if (plyr) {
        const dx = plyr.x - this.x;
        const dy = plyr.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.aimAngle = Math.atan2(dy, dx);

        // Movement toward player (slowed by 50% if shocked)
        const moveSpeed = this.shockTimer > 0 ? this.speed * 0.5 : this.speed;
        if (moveSpeed > 0 && dist > this.radius + (plyr.radius || 24)) {
          // If within range, close in or circle
          const targetDist = this.isBoss ? 260 : 180;
          let moveFactor = 1.0;
          if (dist < targetDist) moveFactor = -0.5; // Backpedal slightly

          this.vx = (dx / dist) * moveSpeed * moveFactor;
          this.vy = (dy / dist) * moveSpeed * moveFactor;

          this.x += this.vx * dt;
          if (window.dungeon) window.dungeon.resolveCircle(this, this.radius, 'x');
          this.y += this.vy * dt;
          if (window.dungeon) window.dungeon.resolveCircle(this, this.radius, 'y');
        }

        // Process Attack behaviors (delayed if EMP shocked)
        if (this.shockTimer <= 0) {
          const attacks = this.spec.attacks || [];
          for (let i = 0; i < attacks.length; i++) {
            const atk = attacks[i];
            this.attackTimers[i] -= dt;
            if (this.attackTimers[i] <= 0) {
              this.attackTimers[i] = this.isEnraged ? atk.cooldown * 0.75 : atk.cooldown;
              if (dist <= atk.range) {
                this.executeAttack(atk, dx, dy, dist);
              }
            }
          }
        }
      }

      return true;
    }

    executeAttack(atk, dx, dy, dist) {
      const proj = atk.projectile || { label: "BYTE", color: "#ef4444", damage: 15, size: 7 };
      const baseAngle = Math.atan2(dy, dx);
      const ProjClass = window.EnemyProjectile || (typeof EnemyProjectile !== 'undefined' ? EnemyProjectile : null);
      const pList = window.enemyProjectiles || (typeof enemyProjectiles !== 'undefined' ? enemyProjectiles : null);

      if (atk.type === "bullet_burst") {
        const count = atk.count || 3;
        const spread = atk.spread || 0.3;
        const spd = atk.speed || 340;
        for (let c = 0; c < count; c++) {
          const a = baseAngle + (c - (count - 1) / 2) * spread;
          if (ProjClass && pList) {
            pList.push(new ProjClass(
              this.x + Math.cos(a) * (this.radius + 5),
              this.y + Math.sin(a) * (this.radius + 5),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              proj.label
            ));
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.1, 0.25, 2000, 400);
      } else if (atk.type === "spiral_danmaku") {
        const count = atk.count || 12;
        const spd = atk.speed || 280;
        const curTime = typeof window.gameTime !== 'undefined' ? window.gameTime : Date.now() * 0.001;
        for (let c = 0; c < count; c++) {
          const a = (Math.PI * 2 / count) * c + curTime * 2.5;
          if (ProjClass && pList) {
            pList.push(new ProjClass(
              this.x + Math.cos(a) * (this.radius + 5),
              this.y + Math.sin(a) * (this.radius + 5),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              proj.label
            ));
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.18, 0.3, 2400, 600);
      } else if (atk.type === "summon_reinforcements") {
        if (typeof window.spawnReinforcementSquad === 'function') {
          window.spawnReinforcementSquad(this.x, this.y, atk.count || 3);
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const vis = this.spec.visual;
      const primary = this.burnTimer > 0 ? "#7f1d1d" : vis.primaryColor;
      const accent = vis.accentColor || "#22c55e";

      // Tactical shield aura
      if (this.shield > 0) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enraged fire aura
      if (this.isEnraged) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const pulse = Math.sin(Date.now() * 0.01) * 4;
        ctx.arc(0, 0, this.radius + 8 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render Chassis archetype
      if (vis.chassis === "tank_rover") {
        ctx.rotate(this.aimAngle);
        // Treads
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-this.radius, -this.radius * 0.8, this.radius * 2, this.radius * 0.35);
        ctx.fillRect(-this.radius, this.radius * 0.45, this.radius * 2, this.radius * 0.35);
        // Chassis
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.8, -this.radius * 0.5, this.radius * 1.6, this.radius, 4);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Barrel
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, -4, this.radius * 1.2, 8);
      } else if (vis.chassis === "drone_sphere" || vis.chassis === "singularity_core") {
        // Floating Core
        const pulse = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Orbital Ring
        ctx.save();
        ctx.rotate(Date.now() * 0.002);
        ctx.strokeStyle = vis.auraColor || "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.3, this.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // Default Monolith / Executive Armor
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 8);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Decorative Header Banner
        ctx.fillStyle = "#091a10";
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, 18);
      }

      // Badge Text
      if (vis.badgeText) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(10, Math.round(this.radius * 0.28))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(vis.badgeText, 0, 0);
      }

      // Health bar above entity
      const hpWidth = this.radius * 2;
      const hpPercent = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "#091a10";
      ctx.fillRect(-this.radius, -this.radius - 12, hpWidth, 5);
      ctx.fillStyle = this.isBoss ? "#ef4444" : "#22c55e";
      ctx.fillRect(-this.radius, -this.radius - 12, hpWidth * hpPercent, 5);

      // Status effect visuals (burn flame tongues, electric EMP arcs, acid sizzle)
      if (this.burnTimer > 0) {
        const flameH = 6 + (Math.sin(Date.now() * 0.02) * 3);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-6, -this.radius - flameH - 14, 12, flameH);
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(-3, -this.radius - flameH - 12, 6, flameH - 2);
      }
      if (this.shockTimer > 0) {
        ctx.strokeStyle = Math.random() > 0.5 ? "#38bdf8" : "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const ox = (Math.random() - 0.5) * this.radius * 1.2;
        const oy = (Math.random() - 0.5) * this.radius * 1.2;
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + (Math.random() - 0.5) * 18, oy + (Math.random() - 0.5) * 18);
        ctx.stroke();
      }
      if (this.corrodedTimer > 0) {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(-this.radius + 2, -this.radius - 6, 3, 3);
        ctx.fillRect(this.radius - 5, -this.radius - 4, 3, 3);
      }

      ctx.restore();
    }

    die() {
      if (this.isDead) return;
      this.isDead = true;
      this.hp = 0;

      try {
        // Play destruction sound & screen shake
        if (window.soundEngine && typeof window.soundEngine.playProprietaryDestroyed === 'function') {
          window.soundEngine.playProprietaryDestroyed(this.isBoss ? 'boss' : 'normal');
        }
        if (typeof window.addScreenShake === 'function') {
          window.addScreenShake(this.isBoss ? 18 : 6);
        }

        // Spawn death spark particles
        const particleList = window.particles || (typeof particles !== 'undefined' ? particles : null);
        const SparkClass = window.SparkParticle || (typeof SparkParticle !== 'undefined' ? SparkParticle : null);
        if (particleList && SparkClass) {
          const count = this.isBoss ? 36 : 14;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 220;
            particleList.push(new SparkClass(
              this.x,
              this.y,
              Math.cos(angle) * spd,
              Math.sin(angle) * spd,
              Math.random() < 0.5 ? (this.isBoss ? "#ef4444" : "#f97316") : "#1e293b"
            ));
          }
        }

        // Drop score safely to comboTracker
        const threatVal = (this.spec && this.spec.stats && this.spec.stats.threatValue) ? this.spec.stats.threatValue : (this.isBoss ? 1000 : 200);
        if (typeof window.comboTracker !== 'undefined' && window.comboTracker) {
          if (typeof window.comboTracker.addScore === 'function') {
            window.comboTracker.addScore(threatVal);
          } else if (typeof window.comboTracker.addBonus === 'function') {
            window.comboTracker.addBonus("BOSS PURGE", threatVal);
          }
        }

        // Advance sector objectives & director
        if (typeof window.dungeon !== 'undefined' && window.dungeon) {
          window.dungeon.onObjectiveProgress("PURGE_ENEMIES", 1);
          if (this.isBoss) {
            window.dungeon.onObjectiveProgress("PURGE_BOSS", 1);
          }
        }
        if (this.isBoss && typeof window.bossDirector !== 'undefined' && window.bossDirector) {
          window.bossDirector.bossTiersDefeated++;
        }

        // Boss death voice line
        if (this.spec && this.spec.dialogue && this.spec.dialogue.onDefeat && this.spec.dialogue.onDefeat.length > 0) {
          const lines = this.spec.dialogue.onDefeat;
          const dyingQuote = lines[Math.floor(Math.random() * lines.length)];
          if (typeof window.broadcastBossStoryDialogue === 'function') {
            window.broadcastBossStoryDialogue(this.label || "BOSS", dyingQuote, "#94a3b8", "💀");
          }
        }

        // Drop pickups / loot safely
        const PickupClass = window.Pickup || (typeof Pickup !== 'undefined' ? Pickup : null);
        const pickupList = window.pickups || (typeof pickups !== 'undefined' ? pickups : null);

        if (PickupClass && pickupList) {
          pickupList.push(new PickupClass(this.x, this.y, 'xp'));
          if (this.isBoss) {
            pickupList.push(new PickupClass(this.x + 20, this.y, 'hp'));
            pickupList.push(new PickupClass(this.x - 20, this.y, 'fuel'));
            // Drop rare weapon
            if (typeof window.dropRareWeaponAt === 'function') {
              window.dropRareWeaponAt(this.x, this.y);
            }
            // Drop portals to harder places & secret treasure vault with safe spacing and arming delay
            const PortalClass = window.ProceduralPortal || (typeof ProceduralPortal !== 'undefined' ? ProceduralPortal : null);
            const portalList = window.proceduralPortals || (typeof proceduralPortals !== 'undefined' ? proceduralPortals : null);
            if (PortalClass && portalList) {
              const currentTier = (window.dungeon && window.dungeon.sectorNum) ? window.dungeon.sectorNum : 1;
              const nextTier = currentTier + 1;
              const harderBiomes = ["THERMAL_FOUNDRY", "CRYO_GLACIER", "TOXIC_HEAP", "WALLED_GARDEN", "QUANTUM_VOID"];
              const nextBiomeKey = harderBiomes[Math.min(harderBiomes.length - 1, nextTier - 1)] || "QUANTUM_VOID";
              const objectivePool = ["DEFEND_SERVERS", "ATTACK_FORTRESS", "SETUP_UPLINK", "ELITE_BOUNTY"];
              const nextObj = objectivePool[Math.floor(Math.random() * objectivePool.length)];

              const portalHarder = new PortalClass(this.x - 75, this.y, nextBiomeKey, nextObj, nextTier);
              portalHarder.label = `TIER ${nextTier} ADVANCE`;
              portalHarder.armTimer = 1.5;
              portalList.push(portalHarder);

              const portalTreasure = new PortalClass(this.x + 75, this.y, "TREASURE_VAULT", "TREASURE_REWARD", nextTier);
              portalTreasure.label = "TREASURE VAULT";
              portalTreasure.armTimer = 1.5;
              portalList.push(portalTreasure);

              if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
                window.soundEngine.speakRobot("APEX CORPORATE OVERLORD TERMINATED. DEMOCRATIC ADVANCE PORTALS ONLINE.", "SUPER DESTROYER");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error during DynamicCustomEnemy.die:", err);
      }

      // Remove from enemies array
      const enemyList = window.enemies || (typeof enemies !== 'undefined' ? enemies : null);
      if (enemyList) {
        const idx = enemyList.indexOf(this);
        if (idx !== -1) enemyList.splice(idx, 1);
      }
    }
  }

  // Comms Dialogue Broadcaster
  function broadcastBossStoryDialogue(speaker = "COMMUNICATIONS", message = "...", color = "#22c55e", icon = "☠️") {
    const banner = document.getElementById('bossCommsBanner');
    const speakerEl = document.getElementById('commsSpeaker');
    const msgEl = document.getElementById('commsMessage');
    const iconEl = document.getElementById('commsAvatarIcon');

    const speakerName = (speaker ? String(speaker) : "UNKNOWN").toUpperCase();

    if (!banner || !speakerEl || !msgEl) {
      console.log(`[COMMS TRANSMISSION] ${speakerName}: "${message}"`);
      return;
    }

    speakerEl.innerText = speakerName;
    speakerEl.style.color = color;
    msgEl.innerText = `"${message}"`;
    if (iconEl) iconEl.innerText = icon;

    banner.style.display = 'flex';
    banner.style.borderColor = color;

    if (window.soundEngine) {
      if (typeof window.soundEngine.speakRobot === 'function') {
        window.soundEngine.speakRobot(message, speaker, 0.28, 1.05);
      } else if (typeof window.soundEngine.playRadioTransmission === 'function') {
        window.soundEngine.playRadioTransmission();
      }
    }

    if (window._commsDismissTimeout) clearTimeout(window._commsDismissTimeout);
    window._commsDismissTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 6500);
  }

  // Expose global singleton and bridge functions
  const factory = new EnemyModelFactory();
  window.EnemyModelFactory = factory;
  window.broadcastBossStoryDialogue = broadcastBossStoryDialogue;

  window.spawnCustomEnemyFromSpec = function(spec, x, y) {
    const enemy = factory.createFromSpec(spec, x, y);
    if (typeof window.enemies !== 'undefined') {
      window.enemies.push(enemy);
    }
    return enemy;
  };

  window.registerEnemyTemplate = function(spec) {
    return factory.registerTemplate(spec);
  };

  window.getBattlefieldState = function() {
    return {
      gameState: typeof window.gameState !== 'undefined' ? window.gameState : "UNKNOWN",
      player: typeof window.player !== 'undefined' && window.player ? {
        x: Math.round(window.player.x),
        y: Math.round(window.player.y),
        hp: Math.round(window.player.hp),
        maxHp: window.player.maxHp,
        shield: Math.round(window.player.shield),
        isSpaceMarine: window.player.isSpaceMarine,
        weapons: window.player.heldWeapons ? window.player.heldWeapons.map(w => w.name) : []
      } : null,
      enemyCount: typeof window.enemies !== 'undefined' ? window.enemies.length : 0,
      activeBosses: typeof window.enemies !== 'undefined' ? window.enemies.filter(e => e.isBoss).map(b => ({
        label: b.label,
        hp: b.hp,
        maxHp: b.maxHp
      })) : [],
      threatLevel: typeof window.dungeon !== 'undefined' && window.dungeon.getDifficultyMultiplier ? window.dungeon.getDifficultyMultiplier() : 1.0,
      availableModelTemplates: factory.getAllTemplates().map(t => t.id)
    };
  };

  console.log("-> MCP Enemy Tools and Encounter Engine loaded.");
})();
