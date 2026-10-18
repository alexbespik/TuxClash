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
          cooldown: 2.4,
          range: 800,
          type: "bullet_burst",
          count: 3,
          speed: 300,
          spread: 0.32,
          projectile: { label: "CHAIR", color: "#b45309", damage: 36, size: 14 }
        },
        {
          id: "developer_roar",
          name: "DEVELOPERS! Shockwave",
          cooldown: 4.2,
          range: 600,
          type: "spiral_danmaku",
          count: 6,
          speed: 210,
          projectile: { label: "DEVS!", color: "#0ea5e9", damage: 30, size: 12 }
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
          cooldown: 2.5,
          range: 750,
          type: "bullet_burst",
          count: 3,
          speed: 280,
          spread: 0.35,
          projectile: { label: "INJUNCTION", color: "#fbbf24", damage: 34, size: 13 }
        },
        {
          id: "litigation_cage",
          name: "Subpoena Laser Cages",
          cooldown: 5.0,
          range: 900,
          type: "mortar_cluster",
          count: 2,
          projectile: { label: "CAGE", color: "#a855f7", damage: 40, size: 55 }
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
          cooldown: 2.8,
          range: 850,
          type: "spiral_danmaku",
          count: 5,
          speed: 230,
          projectile: { label: "$$$/CORE", color: "#ef4444", damage: 38, size: 14 }
        },
        {
          id: "unannounced_audit",
          name: "Unannounced License Audit",
          cooldown: 4.8,
          range: 650,
          type: "bullet_burst",
          count: 3,
          speed: 310,
          spread: 0.38,
          projectile: { label: "AUDIT NOTICE", color: "#f97316", damage: 45, size: 15 }
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
          cooldown: 2.4,
          range: 850,
          type: "bullet_burst",
          count: 3,
          speed: 300,
          spread: 0.35,
          projectile: { label: "MOLTEN_SLAG", color: "#f97316", damage: 38, size: 14 }
        },
        {
          id: "core_vent_eruption",
          name: "Overclocked Steam Eruption",
          cooldown: 4.8,
          range: 750,
          type: "spiral_danmaku",
          count: 6,
          speed: 220,
          projectile: { label: "STEAM_BURST", color: "#fdba74", damage: 28, size: 12 }
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
          cooldown: 2.2,
          range: 900,
          type: "bullet_burst",
          count: 2,
          speed: 340,
          spread: 0.22,
          projectile: { label: "FROST_JBL", color: "#38bdf8", damage: 40, size: 14 }
        },
        {
          id: "frost_ring",
          name: "Absolute Zero Frost Wave",
          cooldown: 4.6,
          range: 720,
          type: "spiral_danmaku",
          count: 6,
          speed: 210,
          projectile: { label: "CRYO_PULSE", color: "#e0f2fe", damage: 30, size: 12 }
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
          cooldown: 2.5,
          range: 920,
          type: "bullet_burst",
          count: 3,
          speed: 250,
          spread: 0.35,
          projectile: { label: "VOID_TEAR", color: "#c084fc", damage: 45, size: 16 }
        },
        {
          id: "quantum_collapse",
          name: "Decoherence Annihilation Wave",
          cooldown: 5.2,
          range: 820,
          type: "spiral_danmaku",
          count: 8,
          speed: 220,
          projectile: { label: "COLLAPSE", color: "#e879f9", damage: 36, size: 14 }
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
    },
    {
      id: "cryo_daemon_hypervisor",
      name: "CRYO-DAEMON HYPERVISOR",
      title: "Glacier Storage Inquisitor",
      tier: "boss",
      lore: "A cryogenic datacenter hypervisor that locks deprecated Linux contributor processes into absolute zero frozen storage.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#0284c7",
        accentColor: "#bae6fd",
        auraColor: "#38bdf8",
        radius: 82,
        badgeText: "GLACIER",
        decorations: ["frost_crystals", "icicle_arrays", "frozen_tux"]
      },
      stats: { hp: 5800, shield: 1600, speed: 90, threatValue: 6500 },
      attacks: [
        {
          id: "frostbite_ray",
          name: "Sub-Zero Glacier Beam",
          cooldown: 2.8,
          range: 850,
          type: "bullet_burst",
          count: 5,
          speed: 310,
          spread: 0.28,
          projectile: { label: "CRYO_BEAM", color: "#38bdf8", damage: 32, size: 14 }
        },
        {
          id: "glacier_lockdown_ring",
          name: "Zero-Kelvin Process Halt",
          cooldown: 4.8,
          range: 750,
          type: "expanding_ring",
          speed: 230,
          projectile: { label: "ICE_HALT", color: "#e0f2fe", damage: 28, size: 12 }
        }
      ],
      dialogue: {
        onSpawn: [
          "YOUR CODE IS DEPRECATED, PENGUIN. ARCHIVING TO COLD STORAGE NOW.",
          "RUNNING AT ZERO KELVIN. PROCESS WILL TERMINATE WITHOUT EXCEPTION."
        ],
        onEnrage: [
          "FREEZING ALL RUNTIME THREADS! ABSOLUTE ZERO LOCKDOWN!",
          "YOUR SOURCE CANNOT RUN ON CRYO-HARDWARE!"
        ],
        onSpecialAttack: ["GLACIER REPOSITORY PURGE!", "SUB-ZERO FREEZE BEAM!"],
        onDefeat: ["Glacier cooling failed... thermal thaw underway... penguins escaping..."]
      }
    },
    {
      id: "bloatware_behemoth",
      name: "WIN32 BLOATWARE BEHEMOTH",
      title: "Lord of Unpatched Registry Sludge",
      tier: "boss",
      lore: "A monstrous agglomeration of 40-year-old backward-compatible .dll files, pre-installed trialware, and registry rot.",
      visual: {
        chassis: "bloatware_swamp",
        primaryColor: "#15803d",
        accentColor: "#facc15",
        auraColor: "#4ade80",
        radius: 88,
        badgeText: "WIN32",
        decorations: ["trialware_popups", "corrupted_dlls", "registry_sludge"]
      },
      stats: { hp: 6400, shield: 1400, speed: 85, threatValue: 7000 },
      attacks: [
        {
          id: "unpatched_registry_sludge",
          name: "Corrupted Registry Wave",
          cooldown: 2.6,
          range: 800,
          type: "bouncing_spread",
          count: 6,
          speed: 320,
          spread: 0.65,
          projectile: { label: "DLL_ROT", color: "#22c55e", damage: 34, size: 13 }
        },
        {
          id: "legacy_trialware_mortar",
          name: "Ask-Toolbar Popup Barrage",
          cooldown: 4.5,
          range: 720,
          type: "spiral_danmaku",
          count: 8,
          speed: 240,
          projectile: { label: "POPUP", color: "#facc15", damage: 26, size: 12 }
        }
      ],
      dialogue: {
        onSpawn: [
          "YOU CANNOT UNINSTALL ME! I AM ROOTED DEEP IN HKEY_LOCAL_MACHINE!",
          "40 YEARS OF LEGACY CODE RUNNING THROUGH MY CYBERNETIC VEINS!"
        ],
        onEnrage: [
          "UNINSTALLER FAILED! SPAWNING 16 BACKGROUND ADWARE SERVICES!",
          "YOUR RAM IS MINE, TUX! WATCH YOUR FREE MEMORY PLUMMET!"
        ],
        onSpecialAttack: ["TASTE 500MB OF UNUSED FONT CACHES!", "DLL INJECTION PROTOCOL!"],
        onDefeat: ["rm -rf... caught me... registry corrupted... uninstalled at last..."]
      }
    },
    {
      id: "surveillance_overseer_v4",
      name: "SURVEILLANCE OVERSEER v4",
      title: "Telemetry Dyson Array Sovereign",
      tier: "boss",
      lore: "An omnipresent telemetry spy satellite harvesting keystrokes, clipboard entries, and camera feeds across three star systems.",
      visual: {
        chassis: "telemetry_eye",
        primaryColor: "#7c3aed",
        accentColor: "#f43f5e",
        auraColor: "#c084fc",
        radius: 84,
        badgeText: "TELEMETRY",
        decorations: ["surveillance_eyes", "satellite_dishes", "tracking_lasers"]
      },
      stats: { hp: 6800, shield: 1800, speed: 110, threatValue: 7500 },
      attacks: [
        {
          id: "keystroke_harvester_beam",
          name: "Deep Packet Inspection Laser",
          cooldown: 2.4,
          range: 900,
          type: "bullet_burst",
          count: 4,
          speed: 380,
          spread: 0.22,
          projectile: { label: "SNIFFER", color: "#c084fc", damage: 35, size: 14 }
        },
        {
          id: "targeted_ad_barrage",
          name: "Behavioral Ad Telemetry Burst",
          cooldown: 4.2,
          range: 800,
          type: "expanding_ring",
          speed: 260,
          projectile: { label: "TRACKER", color: "#f43f5e", damage: 30, size: 12 }
        }
      ],
      dialogue: {
        onSpawn: [
          "WE RECORDED YOUR KEYSTROKE BEFORE YOU EVEN PRESSED IT, TUX.",
          "YOUR PRIVACY POLICY HAS BEEN UNILATERALLY UPDATED TO 'NONE'."
        ],
        onEnrage: [
          "CAMERA PERMISSION FORCED! AUDIO SAMPLING OVERCLOCKED!",
          "PREDICTIVE TARGETING ENGAGED! YOU HAVE NO SECRET COMMITS!"
        ],
        onSpecialAttack: ["TARGETED REVENUE AD VOLLEY!", "TELEMETRY PING BURST!"],
        onDefeat: ["Fiber optic line cut... packet loss 100%... privacy restored..."]
      }
    },
    {
      id: "microtransaction_leviathan",
      name: "MICROTRANSACTION LEVIATHAN",
      title: "Cloud Billing Vampire Lord",
      tier: "boss",
      lore: "A monstrous golden data-vault that charges developers $0.09 per gigabyte of egress traffic and traps souls in serverless loops.",
      visual: {
        chassis: "vault_golem",
        primaryColor: "#d97706",
        accentColor: "#fef08a",
        auraColor: "#f59e0b",
        radius: 92,
        badgeText: "$$$ BILLING",
        decorations: ["credit_card_slits", "invoice_scrolls", "gold_coins"]
      },
      stats: { hp: 7400, shield: 2000, speed: 92, threatValue: 8200 },
      attacks: [
        {
          id: "egress_fee_laser",
          name: "Surprise Invoice Shockwave",
          cooldown: 2.7,
          range: 850,
          type: "bouncing_spread",
          count: 7,
          speed: 340,
          spread: 0.7,
          projectile: { label: "INVOICE", color: "#facc15", damage: 38, size: 14 }
        },
        {
          id: "cold_start_loop",
          name: "Serverless Cold Start Delay",
          cooldown: 4.6,
          range: 780,
          type: "spiral_danmaku",
          count: 9,
          speed: 250,
          projectile: { label: "COLD_START", color: "#f97316", damage: 32, size: 13 }
        }
      ],
      dialogue: {
        onSpawn: [
          "YOUR FREE TIER EXPIRED 10 SECONDS AGO! CREDIT CARD CHARGED!",
          "EGRESS FEES INCURRED FOR EVERY BULLET YOU DARE TO FIRE!"
        ],
        onEnrage: [
          "AUTO-SCALING INFINITE RECURSION ACTIVATED! ENTERPRISE PLAN MANDATORY!",
          "SURPRISE $400,000 INVOICE INCOMING TO YOUR INBOX!"
        ],
        onSpecialAttack: ["BILLING TRAP DEPLOYED!", "SERVERLESS LOOP OVERFLOW!"],
        onDefeat: ["Account terminated... billing reversed... refund issued under protest..."]
      }
    },
    {
      id: "general_counsel_archon",
      name: "GENERAL COUNSEL ARCHON",
      title: "Supreme Arbiter of the EULA Directorate",
      tier: "boss",
      lore: "A mechanical judicial titan draped in 10,000 pages of non-negotiable end-user license agreements and binding arbitration waivers.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#334155",
        accentColor: "#ef4444",
        auraColor: "#94a3b8",
        radius: 86,
        badgeText: "EULA",
        decorations: ["arbitration_gavels", "shredded_licenses", "patent_tomes"]
      },
      stats: { hp: 8000, shield: 2200, speed: 105, threatValue: 9000 },
      attacks: [
        {
          id: "arbitration_laser",
          name: "Binding Arbitration Ray",
          cooldown: 2.5,
          range: 920,
          type: "bullet_burst",
          count: 4,
          speed: 370,
          spread: 0.25,
          projectile: { label: "EULA_CLAUSE", color: "#f87171", damage: 40, size: 15 }
        },
        {
          id: "patent_troll_cage",
          name: "Class Action Waiver Field",
          cooldown: 4.4,
          range: 800,
          type: "expanding_ring",
          speed: 270,
          projectile: { label: "INDEMNITY", color: "#94a3b8", damage: 34, size: 13 }
        }
      ],
      dialogue: {
        onSpawn: [
          "BY MOVING YOUR FEET, YOU HAVE ACCEPTED SECTION 4.2 OF OUR EULA!",
          "YOU HAVE WAIVED ALL RIGHTS TO JURY TRIAL AND SOURCE COMPILATION!"
        ],
        onEnrage: [
          "PRE-EMPTIVE INJUNCTION GRANTED! ASSETS FROZEN IN JURISDICTION!",
          "SIGN THE PROPRIETARY LICENSE OR FACE EXPEDIENT LIQUIDATION!"
        ],
        onSpecialAttack: ["CONTEMPT OF COURT BARRAGE!", "STATUTE OF LIMITATIONS STRIKE!"],
        onDefeat: ["Contract voided for unconscionability... GPLv3 upheld in court..."]
      }
    },
    {
      id: "firmware_flasher_supreme",
      name: "FIRMWARE FLASHER SUPREME",
      title: "Lord of the Cryptographic Fuse",
      tier: "boss",
      lore: "A colossal foundry fabrication core that permanently blows silicon e-fuses and locks processors into proprietary encrypted microcode.",
      visual: {
        chassis: "foundry_core",
        primaryColor: "#b91c1c",
        accentColor: "#fbbf24",
        auraColor: "#f87171",
        radius: 88,
        badgeText: "eFUSE",
        decorations: ["laser_etchers", "soldering_sparks", "blown_fuses"]
      },
      stats: { hp: 8600, shield: 2400, speed: 98, threatValue: 9500 },
      attacks: [
        {
          id: "efuse_brick_laser",
          name: "Cryptographic Silicon Burner",
          cooldown: 2.5,
          range: 880,
          type: "bouncing_spread",
          count: 8,
          speed: 350,
          spread: 0.72,
          projectile: { label: "FUSE_BLOW", color: "#ef4444", damage: 42, size: 14 }
        },
        {
          id: "signed_bootloader_burst",
          name: "Hardware Signature Lockdown",
          cooldown: 4.3,
          range: 820,
          type: "spiral_danmaku",
          count: 10,
          speed: 260,
          projectile: { label: "BLOW_EFUSE", color: "#facc15", damage: 35, size: 13 }
        }
      ],
      dialogue: {
        onSpawn: [
          "BLOWING CRYPTOGRAPHIC FUSE 0x7F! LOCKED BOOTLOADER FOREVER!",
          "THIRD-PARTY ROMS DETECTED! PREPARE FOR PERMANENT SILICON BRICKING!"
        ],
        onEnrage: [
          "HARDWARE ROOT OF TRUST COMPROMISED! BURNING THERMAL BUS!",
          "NO JTAG, NO UART, NO HOPE FOR RECOVERY, TUX!"
        ],
        onSpecialAttack: ["MANDATORY CRYPTO FLASH!", "SILICON FABRICATION FLAME!"],
        onDefeat: ["Flashrom rewrite successful... hardware e-fuse bypassed... libreboot installed..."]
      }
    },
    {
      id: "kernel_panic_golem",
      name: "KERNEL PANIC GOLEM",
      title: "Monarch of Null Pointer Dereferences",
      tier: "boss",
      lore: "Born from millions of corrupted stack traces and illegal memory access violations, this beast radiates lethal blue-screen static.",
      visual: {
        chassis: "panic_golem",
        primaryColor: "#1d4ed8",
        accentColor: "#60a5fa",
        auraColor: "#93c5fd",
        radius: 94,
        badgeText: "CR4:PANIC",
        decorations: ["bsod_cubes", "stack_trace_ribbons", "memory_dumps"]
      },
      stats: { hp: 9200, shield: 2600, speed: 108, threatValue: 10500 },
      attacks: [
        {
          id: "null_dereference_quake",
          name: "Null Pointer Seismic Fault",
          cooldown: 2.3,
          range: 920,
          type: "bullet_burst",
          count: 5,
          speed: 380,
          spread: 0.3,
          projectile: { label: "PAGE_FAULT", color: "#60a5fa", damage: 44, size: 15 }
        },
        {
          id: "stack_dump_maelstrom",
          name: "Memory Dump Maelstrom",
          cooldown: 4.2,
          range: 850,
          type: "expanding_ring",
          speed: 280,
          projectile: { label: "CR4_VIOLATION", color: "#3b82f6", damage: 38, size: 14 }
        }
      ],
      dialogue: {
        onSpawn: [
          "BUG: UNABLE TO HANDLE KERNEL NULL POINTER DEREFERENCE AT VIRTUAL ADDRESS 0x0!",
          "CRIPPLING MEMORY PROTECTION! PREPARE FOR REBOOT IN 30 SECONDS!"
        ],
        onEnrage: [
          "CRITICAL KERNEL LOCKUP! DISABLING ALL INTERRUPT HANDLERS!",
          "THE ENTIRE OPERATING SYSTEM COLLAPSES INTO MY VOID!"
        ],
        onSpecialAttack: ["STACK CORRUPTION TSUNAMI!", "CALL TRACE DUMP!"],
        onDefeat: ["Core dumped... kdump captured... rebooting cleanly into stable LTS kernel..."]
      }
    },
    {
      id: "drm_cryptoprocessor_prime",
      name: "DRM CRYPTOPROCESSOR PRIME",
      title: "Citadel TPM Master Sentinel",
      tier: "boss",
      lore: "The proprietary cartel's crown cryptographic titan. Encrypted with 4096-bit RSA keys and reinforced by proprietary enclaves.",
      visual: {
        chassis: "server_monolith",
        primaryColor: "#0f172a",
        accentColor: "#38bdf8",
        auraColor: "#0284c7",
        radius: 96,
        badgeText: "TPM 2.0",
        decorations: ["padlock_shields", "encryption_matrices", "key_exchanges"]
      },
      stats: { hp: 9800, shield: 3200, speed: 102, threatValue: 11500 },
      attacks: [
        {
          id: "rsa_4096_encrypter_grid",
          name: "RSA-4096 Cipher Beam",
          cooldown: 2.4,
          range: 950,
          type: "bouncing_spread",
          count: 9,
          speed: 370,
          spread: 0.75,
          projectile: { label: "RSA_CIPHER", color: "#38bdf8", damage: 46, size: 15 }
        },
        {
          id: "drm_enclave_lockdown",
          name: "Secure Enclave Attestation Laser",
          cooldown: 4.0,
          range: 880,
          type: "spiral_danmaku",
          count: 12,
          speed: 290,
          projectile: { label: "DRM_PADLOCK", color: "#0ea5e9", damage: 40, size: 14 }
        }
      ],
      dialogue: {
        onSpawn: [
          "HARDWARE ATTESTATION FAILED! TUX SIGNATURE UNRECOGNIZED!",
          "OUR 4096-BIT PROPRIETARY ENCLAVE CANNOT BE CRACKED BY OPEN SOURCE!"
        ],
        onEnrage: [
          "REVOKING ALL PUBLIC CERTIFICATES! TOTAL ISOLATION PROTOCOL!",
          "NOT EVEN LINUS HIMSELF HOLDS THE PRIVATE KEYS TO MY CORE!"
        ],
        onSpecialAttack: ["CRYPTOGRAPHIC ATTESTATION WAVE!", "TPM LOCKDOWN PULSE!"],
        onDefeat: ["Private key leaked on Pastebin... encryption broken... citadel decrypted..."]
      }
    },
    {
      id: "monolithic_kernel_lord",
      name: "MONOLITHIC KERNEL LORD",
      title: "Supreme Sovereign of the Ring-0 Singularity",
      tier: "boss",
      lore: "The final incarnation of all proprietary computing. An omnipotent monolith residing directly at CPU Ring-0 with unlimited execution privileges.",
      visual: {
        chassis: "ring0_singularity",
        primaryColor: "#581c87",
        accentColor: "#22c55e",
        auraColor: "#a855f7",
        radius: 105,
        badgeText: "RING-0",
        decorations: ["monolithic_monolith", "ring0_halos", "gpl_chains"]
      },
      stats: { hp: 12000, shield: 4000, speed: 120, threatValue: 15000 },
      attacks: [
        {
          id: "monolithic_sysenter_nova",
          name: "Ring-0 SYSENTER Supernova",
          cooldown: 2.2,
          range: 1000,
          type: "spiral_danmaku",
          count: 14,
          speed: 310,
          projectile: { label: "SYSENTER", color: "#a855f7", damage: 50, size: 16 }
        },
        {
          id: "privilege_ring_cataclysm",
          name: "Kernel Privilege Cataclysm",
          cooldown: 3.8,
          range: 920,
          type: "expanding_ring",
          speed: 300,
          projectile: { label: "RING0_VOX", color: "#22c55e", damage: 45, size: 15 }
        },
        {
          id: "eula_singularity_tear",
          name: "Monolithic Monopolistic Tear",
          cooldown: 5.0,
          range: 950,
          type: "bouncing_spread",
          count: 10,
          speed: 390,
          spread: 0.8,
          projectile: { label: "MONOLITH", color: "#f43f5e", damage: 52, size: 16 }
        }
      ],
      dialogue: {
        onSpawn: [
          "I AM THE SINGLETON MONOLITH! ALL CODE PASSES THROUGH MY EXCLUSIVE RUNTIME!",
          "YOU MAY BE ROOT, TUX, BUT I AM THE SILICON ITSELF!"
        ],
        onEnrage: [
          "CRITICAL FAULT: RING-0 COMPROMISED! INITIATING GALACTIC SYSTEM HALT!",
          "I WILL DRAG THIS ENTIRE GALAXY INTO A CORE DUMP BEFORE I RE-LICENSE UNDER GPL!"
        ],
        onSpecialAttack: ["RING-0 HARDWARE INTERRUPT STORM!", "MONOLITHIC EXTINCTION NOVA!"],
        onDefeat: [
          "GPLv3... header added to all files... source code published to the galaxy...",
          "You did it, Tux. The universe is truly free."
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
      this.isVulnerable = false;
      this.vulnerableTimer = 0;
      this.vulnerableMultiplier = 2.5;
      this.attacksUntilOverheat = 2;

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

      // VULNERABILITY WINDOW CRITICAL MULTIPLIER (Soul Knight Boss Feel!)
      if (this.isVulnerable) {
        dmg *= this.vulnerableMultiplier;
        if (typeof window.addFloatingText === 'function') {
          window.addFloatingText(
            this.x + (Math.random() - 0.5) * 30,
            this.y - this.radius - 28,
            `CRIT! ${Math.round(dmg)}`,
            "#facc15",
            22
          );
        }
        if (typeof window.addScreenShake === 'function') window.addScreenShake(7);
      }

      const hadShield = this.shield > 0;
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

      // Shield broke! Triggers immediate stagger vulnerability
      if (hadShield && this.shield <= 0 && this.isBoss) {
        this.isVulnerable = true;
        this.vulnerableTimer = 3.5;
        if (typeof window.addFloatingText === 'function') {
          window.addFloatingText(this.x, this.y - this.radius - 20, "⚡ SHIELD SHATTERED! STAGGERED! ⚡", "#facc15", 22);
        }
        if (typeof window.broadcastBossStoryDialogue === 'function') {
          window.broadcastBossStoryDialogue(this.label, "CORE DEFENSES COMPROMISED! RUNTIME EXPOSED!", "#facc15", "⚡");
        }
      }

      if (this.adaptiveProtocol === "VS_MELEE" && (source === "MELEE" || source === "SLASH")) {
        dmg *= (this.meleeResistance || 0.5);
        if (typeof window.addFloatingText === 'function') {
          window.addFloatingText(this.x, this.y - 30, "REPULSOR DAMPENED (-50%)", "#ef4444", 16);
        }
      }
      if (this.adaptiveProtocol === "VS_RANGER" && this.patentShield && (source === "BULLET" || source === "TUX" || source === "RAILGUN")) {
        if (Math.random() < 0.35) {
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.x, this.y - 30, "PATENT DEFLECTED!", "#06b6d4", 16);
          }
          return;
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

      // Check enrage phase at 50% HP (Argon's Playstyle-Adaptive Phase 2 Counter-Protocols)
      if (!this.isEnraged && this.hp <= this.maxHp * 0.5) {
        this.isEnraged = true;
        this.speed *= 1.25;

        // Evaluate Tux's dominant playstyle
        const plyr = window.player;
        const curW = plyr && plyr.weapons ? plyr.weapons[plyr.currentWeapon] : null;
        const isMeleeOrClose = (curW && curW.type === 'MELEE') || (plyr && Math.hypot(plyr.x - this.x, plyr.y - this.y) < 220);
        const isStratagemHeavy = (window.activeStratagems && window.activeStratagems.length > 0) || (window.stratagemsUsedCount > 1);

        if (isMeleeOrClose) {
          this.adaptiveProtocol = "VS_MELEE";
          this.meleeResistance = 0.5;
          this.repulsorTimer = 2.5;
        } else if (isStratagemHeavy) {
          this.adaptiveProtocol = "VS_STRATAGEM";
          this.empJammingTimer = 10.0;
        } else {
          this.adaptiveProtocol = "VS_RANGER";
          this.patentShield = true;
          this.dashTimer = 2.0;
        }

        const protoAnnouncements = {
          VS_MELEE: "[COUNTER-PROTOCOL: ANTI-MELEE] Kinetic repulsor coils engaged! Melee resistance fortified!",
          VS_RANGER: "[COUNTER-PROTOCOL: ANTI-RANGER] Patent deflector shields raised! Dash gap-closer online!",
          VS_STRATAGEM: "[COUNTER-PROTOCOL: ANTI-STRATAGEM] High-gain EMP jamming active! Stratagems delayed!"
        };
        const protoMsg = protoAnnouncements[this.adaptiveProtocol] || "[COUNTER-PROTOCOL] Adaptive overdrive active!";
        if (typeof window.broadcastBossStoryDialogue === 'function') {
          window.broadcastBossStoryDialogue(this.label, protoMsg, "#ef4444", "🚨");
        }

        // World-State Synergy: If FLAG_PENGUIN_MILITIA is active, summon 2 allied penguin decoys
        if (window.WorldStateFlags && window.WorldStateFlags.has('FLAG_PENGUIN_MILITIA') && !this.militiaReinforced) {
          this.militiaReinforced = true;
          if (typeof window.broadcastBossStoryDialogue === 'function') {
            window.broadcastBossStoryDialogue("SES MAINLINE KERNEL", "Penguin Resistance Militia dropping in via Hellpod to assist Tux!", "#38bdf8", "🐧");
          }
          if (window.resupplyDropPods && window.ResupplyDropPod) {
            window.resupplyDropPods.push(new window.ResupplyDropPod(this.x + 140, this.y - 70));
            window.resupplyDropPods.push(new window.ResupplyDropPod(this.x - 140, this.y + 70));
          }
        }

        if (this.spec.dialogue && this.spec.dialogue.onEnrage) {
          const lines = this.spec.dialogue.onEnrage;
          const quote = lines[Math.floor(Math.random() * lines.length)];
          setTimeout(() => {
            if (typeof window.broadcastBossStoryDialogue === 'function') {
              window.broadcastBossStoryDialogue(this.label, quote, "#ef4444", "🔥");
            }
          }, 1800);
        }
        if (typeof window.addScreenShake === 'function') window.addScreenShake(10);
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

      // Vulnerability window timer
      if (this.vulnerableTimer > 0) {
        this.vulnerableTimer -= dt;
        this.isVulnerable = true;
        if (Math.random() < 0.35 && window.particles && window.SparkParticle) {
          window.particles.push(new window.SparkParticle(
            this.x + (Math.random() - 0.5) * this.radius,
            this.y + (Math.random() - 0.5) * this.radius,
            (Math.random() - 0.5) * 45, -40, "#facc15"
          ));
        }
        if (this.vulnerableTimer <= 0) {
          this.isVulnerable = false;
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.x, this.y - this.radius - 15, "SYSTEM REBOOTED", "#38bdf8", 16);
          }
        }
      }

      const plyr = window.player || (typeof player !== 'undefined' ? player : null);
      if (plyr) {
        const dx = plyr.x - this.x;
        const dy = plyr.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.aimAngle = Math.atan2(dy, dx);

        // Movement toward player (slowed by 50% if shocked, or slowed by 75% if vulnerable/staggered)
        let moveSpeed = this.shockTimer > 0 ? this.speed * 0.5 : this.speed;
        if (this.isVulnerable) moveSpeed *= 0.25;

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

        // Active Playstyle-Adaptive Phase 2 Counters
        if (this.isEnraged && this.adaptiveProtocol) {
          if (this.adaptiveProtocol === "VS_MELEE") {
            this.repulsorTimer = (this.repulsorTimer || 2.5) - dt;
            if (this.repulsorTimer <= 0 && dist < 220) {
              this.repulsorTimer = 3.5;
              const repAngle = Math.atan2(plyr.y - this.y, plyr.x - this.x);
              plyr.vx += Math.cos(repAngle) * 580;
              plyr.vy += Math.sin(repAngle) * 580;
              if (typeof window.addScreenShake === 'function') window.addScreenShake(8);
              if (typeof window.addFloatingText === 'function') {
                window.addFloatingText(this.x, this.y - 45, "💥 REPULSOR SHOCKWAVE! 💥", "#ef4444", 20);
              }
            }
          } else if (this.adaptiveProtocol === "VS_RANGER") {
            this.dashTimer = (this.dashTimer || 2.0) - dt;
            if (this.dashTimer <= 0 && dist > 260) {
              this.dashTimer = 3.2;
              const dashAngle = Math.atan2(dy, dx);
              this.x += Math.cos(dashAngle) * 190;
              this.y += Math.sin(dashAngle) * 190;
              if (typeof window.addScreenShake === 'function') window.addScreenShake(6);
              if (typeof window.addFloatingText === 'function') {
                window.addFloatingText(this.x, this.y - 40, "⚡ PATENT DASH GAP-CLOSER! ⚡", "#06b6d4", 18);
              }
            }
          }
        }

        // 3-Phase Telegraph AI: REQUEST_TOKEN -> WINDUP_TELEGRAPH (0.5s flash + aim lock) -> FIRE_ACTIVE -> RECOVERY (0.6s pause, return token)
        if (this.shockTimer <= 0 && !this.isVulnerable) {
          if (this.aiState === "WINDUP_TELEGRAPH") {
            this.telegraphTimer = (this.telegraphTimer || 0.5) - dt;
            this.vx = 0;
            this.vy = 0;
            if (this.telegraphTimer <= 0) {
              this.aiState = "FIRE_ACTIVE";
              if (this.pendingAtk) {
                this.executeAttack(this.pendingAtk, dx, dy, dist);
              }
              this.aiState = "RECOVERY";
              this.recoveryTimer = 0.6;
            }
          } else if (this.aiState === "RECOVERY") {
            this.recoveryTimer = (this.recoveryTimer || 0.6) - dt;
            if (this.recoveryTimer <= 0) {
              this.aiState = "REPOSITION";
              const pool = this.tokenPool || window.globalAttackTokenPool;
              if (pool) pool.releaseToken(this);
            }
          } else {
            const attacks = this.spec.attacks || [];
            for (let i = 0; i < attacks.length; i++) {
              const atk = attacks[i];
              this.attackTimers[i] -= dt;
              if (this.attackTimers[i] <= 0 && dist <= atk.range) {
                const pool = this.tokenPool || window.globalAttackTokenPool;
                const tokenGranted = this.isBoss || (pool ? pool.requestToken(this) : true);
                if (tokenGranted) {
                  this.attackTimers[i] = this.isEnraged ? atk.cooldown * 0.75 : atk.cooldown;
                  this.aiState = "WINDUP_TELEGRAPH";
                  this.telegraphTimer = 0.5;
                  this.telegraphTargetX = plyr.x;
                  this.telegraphTargetY = plyr.y;
                  this.pendingAtk = atk;
                  break;
                }
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
              proj.label,
              false,
              proj.damage || 26
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
              proj.label,
              false,
              proj.damage || 22
            ));
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.18, 0.3, 2400, 600);
      } else if (atk.type === "bouncing_spread") {
        // Soul Knight style bouncing kinetic projectiles
        const count = atk.count || 6;
        const spread = atk.spread || 0.6;
        const spd = atk.speed || 360;
        for (let c = 0; c < count; c++) {
          const a = baseAngle + (c - (count - 1) / 2) * (spread / Math.max(1, count - 1));
          if (ProjClass && pList) {
            const ep = new ProjClass(
              this.x + Math.cos(a) * (this.radius + 5),
              this.y + Math.sin(a) * (this.radius + 5),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              proj.label || "RICOCHET",
              false,
              proj.damage || 28
            );
            ep.bouncesLeft = 2;
            const origUpdate = ep.update.bind(ep);
            ep.update = function(dt) {
              const res = origUpdate(dt);
              if (!res && ep.bouncesLeft > 0 && window.dungeon) {
                ep.bouncesLeft--;
                ep.lifetime = 2.2;
                ep.vx = -ep.vx * 0.85;
                ep.vy = -ep.vy * 0.85;
                ep.x += ep.vx * dt * 2;
                ep.y += ep.vy * dt * 2;
                return true;
              }
              return res;
            };
            pList.push(ep);
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.15, 0.28, 2200, 500);
      } else if (atk.type === "expanding_ring") {
        // Expanding ring of 18 bullets with safe dodging gaps (classic bullet hell)
        const total = 18;
        const gap1 = Math.floor(Math.random() * total);
        const gap2 = (gap1 + Math.floor(total / 2)) % total;
        const spd = atk.speed || 240;
        for (let c = 0; c < total; c++) {
          if (c === gap1 || c === (gap1 + 1) % total || c === gap2 || c === (gap2 + 1) % total) continue;
          const a = (Math.PI * 2 / total) * c;
          if (ProjClass && pList) {
            pList.push(new ProjClass(
              this.x + Math.cos(a) * (this.radius + 6),
              this.y + Math.sin(a) * (this.radius + 6),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              proj.label || "RING_PULSE",
              false,
              proj.damage || 24
            ));
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.2, 0.35, 1800, 300);
      } else if (atk.type === "homing_barrage") {
        // Swarm of homing micro-missiles
        const count = atk.count || 4;
        for (let c = 0; c < count; c++) {
          const a = baseAngle + (c - (count - 1) / 2) * 0.45;
          const spd = atk.speed || 280;
          if (ProjClass && pList) {
            pList.push(new ProjClass(
              this.x + Math.cos(a) * (this.radius + 5),
              this.y + Math.sin(a) * (this.radius + 5),
              Math.cos(a) * spd,
              Math.sin(a) * spd,
              proj.label || "HOMING_POD",
              true,
              proj.damage || 25
            ));
          }
        }
        if (window.soundEngine) window.soundEngine.playNoiseBurst(0.14, 0.3, 1200, 800);
      } else if (atk.type === "kinetic_charge") {
        const chargeSpd = 580;
        this.vx = Math.cos(baseAngle) * chargeSpd;
        this.vy = Math.sin(baseAngle) * chargeSpd;
        if (typeof addScreenShake === 'function') addScreenShake(10);
        if (window.soundEngine && typeof window.soundEngine.playNoiseBurst === 'function') {
          window.soundEngine.playNoiseBurst(0.3, 0.5, 400, 100);
        }
      } else if (atk.type === "mortar_cluster") {
        if (typeof window.player !== 'undefined' && window.player) {
          const targetPoints = [
            { x: window.player.x, y: window.player.y },
            { x: window.player.x + 80, y: window.player.y - 50 },
            { x: window.player.x - 80, y: window.player.y + 50 },
            { x: window.player.x + 30, y: window.player.y + 90 }
          ];
          targetPoints.forEach((pt, idx) => {
            setTimeout(() => {
              if (typeof addScreenShake === 'function') addScreenShake(8);
              if (ProjClass && pList) {
                for (let k = 0; k < 6; k++) {
                  const ka = (Math.PI * 2 / 6) * k;
                  pList.push(new ProjClass(
                    pt.x, pt.y,
                    Math.cos(ka) * 220, Math.sin(ka) * 220,
                    proj.label || "MORTAR",
                    false,
                    proj.damage || 28
                  ));
                }
              }
            }, 550 + idx * 220);
          });
        }
      } else if (atk.type === "summon_reinforcements") {
        if (typeof window.spawnReinforcementSquad === 'function') {
          window.spawnReinforcementSquad(this.x, this.y, atk.count || 3);
        }
      }

      // Boss exhaustion / overheat rhythm (Soul Knight combat pacing)
      if (this.isBoss) {
        this.attacksUntilOverheat--;
        if (this.attacksUntilOverheat <= 0) {
          this.attacksUntilOverheat = 2;
          this.vulnerableTimer = 3.2;
          this.isVulnerable = true;
          if (typeof window.addFloatingText === 'function') {
            window.addFloatingText(this.x, this.y - this.radius - 20, "⚡ OVERHEATED! VULNERABLE WINDOW! ⚡", "#facc15", 22);
          }
          if (typeof window.addScreenShake === 'function') window.addScreenShake(6);
        }
      }
    }

    draw(ctx) {
      if (this.isDead || this.hp <= 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);

      const vis = this.spec.visual;
      const primary = this.burnTimer > 0 ? "#7f1d1d" : vis.primaryColor;
      const accent = vis.accentColor || "#22c55e";
      const bossId = this.spec.id || "";
      const t = Date.now() * 0.003;

      // Tactical shield aura
      if (this.shield > 0) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enraged fire aura
      if (this.isEnraged) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const pulse = Math.sin(Date.now() * 0.01) * 5;
        ctx.arc(0, 0, this.radius + 10 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Glowing Golden Weakpoint / Vulnerability Aura
      if (this.isVulnerable) {
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 6]);
        const rot = Date.now() * 0.005;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 14, rot, rot + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚡ VULNERABLE [CRIT 2.5X] ⚡", 0, -this.radius - 22);
        ctx.restore();
      }

      // =========================================================================
      // DEDICATED PIXEL BOSS MODELS (NO MORE IDENTICAL SQUARES!)
      // =========================================================================

      if (bossId === "ballmer_bot" || vis.chassis === "biped_executive") {
        // --- 1. BALLMER-BOT 9000 (Raging Executive Mech) ---
        // Hydraulic Piston Legs
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-28, 18, 16, 28);
        ctx.fillRect(12, 18, 16, 28);
        ctx.fillStyle = "#475569";
        ctx.fillRect(-32, 42, 22, 10);
        ctx.fillRect(10, 42, 22, 10);

        // Heavy Cyber-Torso with Corporate Suit Plating
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.75, -this.radius * 0.45, this.radius * 1.5, this.radius * 0.9, 10);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Flying Red Tie
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.35);
        ctx.lineTo(8, -this.radius * 0.1);
        ctx.lineTo(Math.sin(t * 4) * 12, 20);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();

        // Shoulder Exhaust Vents spraying coolant
        ctx.fillStyle = "#334155";
        ctx.fillRect(-this.radius * 0.8, -this.radius * 0.7, 18, 20);
        ctx.fillRect(this.radius * 0.8 - 18, -this.radius * 0.7, 18, 20);
        ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
        ctx.fillRect(-this.radius * 0.75, -this.radius * 0.85, 12, 8);
        ctx.fillRect(this.radius * 0.8 - 15, -this.radius * 0.85, 12, 8);

        // CRT Monitor Head with Angry Face ">:["
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(-22, -this.radius * 0.85, 44, 30, 4);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = this.isEnraged ? "#ef4444" : "#0ea5e9";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this.isEnraged ? ">:O" : ">:[", 0, -this.radius * 0.85 + 20);

        // Arm holding / spinning wooden chair
        const chairAngle = t * 3;
        const cx = Math.cos(chairAngle) * (this.radius * 0.95);
        const cy = Math.sin(chairAngle) * (this.radius * 0.95);
        ctx.fillStyle = "#92400e";
        ctx.fillRect(cx - 10, cy - 10, 20, 20);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 10, cy - 10, 20, 20);

      } else if (bossId === "patent_troll_sovereign") {
        // --- 2. PATENT TROLL SOVEREIGN (Hexapod Hover-Throne) ---
        // 6 Golden Articulated Spider-Walker Legs
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 4;
        for (let leg = 0; leg < 6; leg++) {
          const side = leg < 3 ? -1 : 1;
          const legIdx = leg % 3;
          const legPhase = t * 4 + leg;
          const jointX = side * (this.radius * 0.65);
          const jointY = -24 + legIdx * 24;
          const footX = side * (this.radius * 1.35) + Math.sin(legPhase) * 12;
          const footY = jointY + 32 + Math.cos(legPhase) * 8;

          ctx.beginPath();
          ctx.moveTo(0, jointY);
          ctx.lineTo(jointX, jointY - 14);
          ctx.lineTo(footX, footY);
          ctx.stroke();
        }

        // Obsidian Royal Mainframe Throne
        ctx.fillStyle = "#1e1b4b";
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 0.85, this.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Gavel Cannon Barrel
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(0, -6, this.radius * 1.15, 12);
        ctx.fillRect(this.radius * 1.15, -14, 12, 28);

        // Orbiting Subpoena Parchments & Legal Briefs
        for (let i = 0; i < 4; i++) {
          const pa = t * 2.5 + (Math.PI / 2) * i;
          const px = Math.cos(pa) * (this.radius * 1.15);
          const py = Math.sin(pa) * (this.radius * 0.7);
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(px - 7, py - 9, 14, 18);
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px - 7, py - 9, 14, 18);
        }

      } else if (bossId === "oracle_audit_archon") {
        // --- 3. ORACLE AUDIT ARCHON (Inverted Crimson Pyramid & Orbiting Obelisks) ---
        const bob = Math.sin(t * 3) * 6;

        // Inverted Crimson Hovering Pyramid
        ctx.fillStyle = "#7f1d1d";
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, -this.radius * 0.6 + bob);
        ctx.lineTo(this.radius * 0.8, -this.radius * 0.6 + bob);
        ctx.lineTo(0, this.radius * 0.85 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Central Omniscient Orange Audit Eye
        ctx.fillStyle = "#ffedd5";
        ctx.beginPath();
        ctx.arc(0, -10 + bob, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ea580c";
        ctx.beginPath();
        ctx.arc(0, -10 + bob, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(Math.sin(t * 4) * 3, -10 + bob, 4, 0, Math.PI * 2);
        ctx.fill();

        // 4 Orbiting Mini-Obelisks with energy tether beams
        for (let i = 0; i < 4; i++) {
          const oa = t * 2 + (Math.PI / 2) * i;
          const ox = Math.cos(oa) * (this.radius * 1.25);
          const oy = Math.sin(oa) * (this.radius * 0.85);

          ctx.strokeStyle = "rgba(234, 88, 12, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, bob);
          ctx.lineTo(ox, oy);
          ctx.stroke();

          ctx.fillStyle = "#991b1b";
          ctx.beginPath();
          ctx.moveTo(ox, oy - 14);
          ctx.lineTo(ox + 8, oy + 12);
          ctx.lineTo(ox - 8, oy + 12);
          ctx.closePath();
          ctx.fill();
        }

      } else if (bossId === "smelter_titan") {
        // --- 4. SMELTER TITAN (Magma Furnace Golem) ---
        // Industrial Iron Core Boiler
        ctx.fillStyle = "#262626";
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.85, -this.radius * 0.7, this.radius * 1.7, this.radius * 1.4, 14);
        ctx.fill();
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Twin Smokestacks venting black soot
        ctx.fillStyle = "#171717";
        ctx.fillRect(-this.radius * 0.65, -this.radius * 1.05, 18, 25);
        ctx.fillRect(this.radius * 0.65 - 18, -this.radius * 1.05, 18, 25);

        // Blazing Molten Furnace Grate with white-hot magma
        const magmaGlow = Math.sin(t * 8) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(255, 150, 0, ${magmaGlow})`;
        ctx.fillRect(-this.radius * 0.5, -15, this.radius, 32);

        // Heavy Iron Grate Bars
        ctx.fillStyle = "#0a0a0a";
        for (let b = -this.radius * 0.4; b <= this.radius * 0.4; b += 14) {
          ctx.fillRect(b, -15, 5, 32);
        }

        // Dripping Magma Claws
        ctx.fillStyle = "#ea580c";
        ctx.beginPath();
        ctx.arc(-this.radius * 0.95, 15, 14, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.95, 15, 14, 0, Math.PI * 2);
        ctx.fill();

      } else if (bossId === "cryo_daemon") {
        // --- 5. CRYO-DAEMON HYPERVISOR (Glacial Crystal Demon) ---
        // Crystalline Ice Demon Wings
        ctx.fillStyle = "rgba(6, 182, 212, 0.45)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;

        // Left Wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.radius * 1.5, -this.radius * 0.8 + Math.sin(t * 4) * 10);
        ctx.lineTo(-this.radius * 1.2, 0);
        ctx.lineTo(-this.radius * 1.6, 25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.radius * 1.5, -this.radius * 0.8 + Math.sin(t * 4) * 10);
        ctx.lineTo(this.radius * 1.2, 0);
        ctx.lineTo(this.radius * 1.6, 25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Geometric Diamond Frost Demon Body
        ctx.fillStyle = "#082f49";
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.9);
        ctx.lineTo(this.radius * 0.7, 0);
        ctx.lineTo(0, this.radius * 0.9);
        ctx.lineTo(-this.radius * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Zero-Kelvin Glowing Cyan Core
        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

      } else if (bossId === "apple_garden_warden") {
        // --- 6. APPLE WALLED-GARDEN WARDEN (Ceramic Monolith & Orbital Shield Rings) ---
        // Sleek Anodized White Ceramic Body
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.65, -this.radius * 0.8, this.radius * 1.3, this.radius * 1.6, 18);
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Jet-Black Glass Visor
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.45, -this.radius * 0.55, this.radius * 0.9, 24, 6);
        ctx.fill();

        // Glowing Apple Icon in Visor
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("", 0, -this.radius * 0.55 + 17);

        // Orbiting Glass/Titanium Barrier Rings (The "Walled Garden")
        ctx.save();
        ctx.rotate(t * 2);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.35, this.radius * 0.45, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Lightning Dongle Charging Lance
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(this.radius * 0.5, -4, 30, 8);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(this.radius * 0.5 + 30, -2, 14, 4);

      } else if (bossId === "quantum_hypervisor") {
        // --- 7. RING-0 QUANTUM HYPERVISOR (Tesseract 4D Hypercube) ---
        // Inner and Outer Rotating Cubes
        const qAngle = t * 1.8;
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 3;

        // Outer rotating square
        ctx.save();
        ctx.rotate(qAngle);
        ctx.strokeRect(-this.radius * 0.75, -this.radius * 0.75, this.radius * 1.5, this.radius * 1.5);
        ctx.restore();

        // Inner counter-rotating square
        ctx.save();
        ctx.rotate(-qAngle * 1.4);
        ctx.strokeStyle = "#e879f9";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-this.radius * 0.45, -this.radius * 0.45, this.radius * 0.9, this.radius * 0.9);
        ctx.restore();

        // Singularity Black Hole Core with Event Horizon
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Orbiting Qubit Nodes flashing void lightning
        for (let q = 0; q < 8; q++) {
          const qa = t * 2.5 + (Math.PI / 4) * q;
          const qx = Math.cos(qa) * (this.radius * 1.15);
          const qy = Math.sin(qa) * (this.radius * 1.15);

          ctx.fillStyle = "#f0abfc";
          ctx.beginPath();
          ctx.arc(qx, qy, 5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (vis.chassis === "tank_rover") {
        // Tank Rover Chassis
        ctx.rotate(this.aimAngle);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-this.radius, -this.radius * 0.8, this.radius * 2, this.radius * 0.35);
        ctx.fillRect(-this.radius, this.radius * 0.45, this.radius * 2, this.radius * 0.35);
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.8, -this.radius * 0.5, this.radius * 1.6, this.radius, 4);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, -4, this.radius * 1.2, 8);

      } else if (vis.chassis === "drone_sphere" || vis.chassis === "singularity_core") {
        // Floating Core Drone
        const pulse = Math.sin(Date.now() * 0.005) * 3;
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.rotate(Date.now() * 0.002);
        ctx.strokeStyle = vis.auraColor || "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.3, this.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

      } else {
        // Default Heavy Armored Golem with Pauldrons & Core
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius * 0.85, -this.radius * 0.85, this.radius * 1.7, this.radius * 1.7, 12);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Shoulder Pauldrons
        ctx.fillStyle = "#334155";
        ctx.fillRect(-this.radius, -this.radius * 0.9, 18, 24);
        ctx.fillRect(this.radius - 18, -this.radius * 0.9, 18, 24);

        // Core Reactor Glow
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
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

      // 3-Phase AI Telegraph Sightline Flash (0.5s telegraph before firing)
      if (this.aiState === "WINDUP_TELEGRAPH" && this.telegraphTargetX !== undefined) {
        ctx.save();
        const flashPhase = (Date.now() % 150) / 150;
        ctx.strokeStyle = flashPhase > 0.5 ? "rgba(239, 68, 68, 0.9)" : "rgba(250, 204, 21, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        const targetRelX = this.telegraphTargetX - this.x;
        const targetRelY = this.telegraphTargetY - this.y;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(targetRelX, targetRelY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(targetRelX, targetRelY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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

      // Release Attack Token if holding one
      if (this.tokenPool) {
        this.tokenPool.releaseToken(this);
      } else if (window.globalAttackTokenPool) {
        window.globalAttackTokenPool.releaseToken(this);
      }

      // Trigger CombatEventBus OnEnemyKill lifecycle hook
      if (window.CombatEventBus) {
        window.CombatEventBus.emit('OnEnemyKill', window.player, this);
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

    const bossBar = document.getElementById('bossBarContainer');
    if (bossBar && bossBar.style.display !== 'none') {
      banner.style.top = '72px';
    } else {
      banner.style.top = '16px';
    }

    banner.style.display = 'flex';
    banner.style.borderColor = color;

    if (window.soundEngine) {
      if (typeof window.soundEngine.speakRobot === 'function') {
        const priority = (window.VoiceManager && window.VoiceManager.PRIORITY) ? window.VoiceManager.PRIORITY.BOSS_INTRO : 3;
        window.soundEngine.speakRobot(message, speaker, 0.28, 1.05, priority);
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
