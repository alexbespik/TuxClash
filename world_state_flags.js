/**
 * WORLD-STATE FLAGS ENGINE - "THE RING-0 CRUSADE"
 * Tracks cross-act campaign progression and unlocks global passive infrastructure
 * across all acts based on Gemini Argon's Roguelike Master Expansion Bible.
 */

(function () {
  'use strict';

  const WorldStateFlags = {
    flags: {
      FLAG_DRM_WEAKENED: false,        // Act I: Reduces EnemyDRM padlock shield HP by 20% across all future Acts
      FLAG_COOLANT_DIVERTED: false,    // Act II: Unlocks thermal vents that damage enemies, removes heat debuffs
      FLAG_PENGUIN_MILITIA: false,     // Act III: Rescued penguin daemons randomly drop into future boss fights as allied decoys
      FLAG_FIREWALL_FLUSHED: false,    // Act IV: Increases Stratagem cooldown recovery speed by +25%
      FLAG_TELEMETRY_BLIND: false,     // Act V: Enemies in Acts VI-XII lose 15% projectile tracking accuracy
      FLAG_DARK_FIBER_TAP: false,      // Act VI: Reveals all hidden Chest and Terminal locations on HUD minimap immediately
      FLAG_SERVERLESS_SUBSIDY: false,  // Act VII: Free weapon crate rerolls and +50 starting Energy
      FLAG_INDEMNIFIED: false,         // Act VIII: Tux takes -15% damage from elite laser / orbital hazards
      FLAG_OVERCLOCKED_BUS: false,     // Act IX: Tux base movement speed +12%
      FLAG_KERNEL_STABLE: false,       // Act X: Shield-Gate invincibility frames extended from 0.5s to 0.8s
      FLAG_DECRYPTED_PAYLOAD: false,   // Act XI: All Tux attacks deal +25% bonus damage to boss shields
      FLAG_GPLV3_VICTORY: false        // Act XII: Galactic GPLv3 liberation achieved!
    },

    actFlagMap: [
      "FLAG_DRM_WEAKENED",
      "FLAG_COOLANT_DIVERTED",
      "FLAG_PENGUIN_MILITIA",
      "FLAG_FIREWALL_FLUSHED",
      "FLAG_TELEMETRY_BLIND",
      "FLAG_DARK_FIBER_TAP",
      "FLAG_SERVERLESS_SUBSIDY",
      "FLAG_INDEMNIFIED",
      "FLAG_OVERCLOCKED_BUS",
      "FLAG_KERNEL_STABLE",
      "FLAG_DECRYPTED_PAYLOAD",
      "FLAG_GPLV3_VICTORY"
    ],

    has(flag) {
      return !!this.flags[flag];
    },

    set(flag, value = true) {
      if (this.flags.hasOwnProperty(flag)) {
        this.flags[flag] = !!value;
        this.save();
        if (window.CombatEventBus) {
          window.CombatEventBus.emit('OnWorldStateChanged', flag, this.flags[flag]);
        }
      }
    },

    getAll() {
      return { ...this.flags };
    },

    onActCompleted(actIndex) {
      if (actIndex >= 0 && actIndex < this.actFlagMap.length) {
        const flag = this.actFlagMap[actIndex];
        this.set(flag, true);
        this.notifyFlagUnlocked(flag, actIndex);
      }
    },

    notifyFlagUnlocked(flag, actIndex) {
      const descriptions = {
        FLAG_DRM_WEAKENED: "FLAG_DRM_WEAKENED: Cartel Padlock Shield HP reduced by -20%!",
        FLAG_COOLANT_DIVERTED: "FLAG_COOLANT_DIVERTED: Thermal vents rerouted against hostiles!",
        FLAG_PENGUIN_MILITIA: "FLAG_PENGUIN_MILITIA: Allied Penguin Daemons mobilized for boss drops!",
        FLAG_FIREWALL_FLUSHED: "FLAG_FIREWALL_FLUSHED: Stratagem recharge rate accelerated by +25%!",
        FLAG_TELEMETRY_BLIND: "FLAG_TELEMETRY_BLIND: Cartel telemetry scrambled! Enemy tracking accuracy -15%!",
        FLAG_DARK_FIBER_TAP: "FLAG_DARK_FIBER_TAP: Dark Fiber tapped! All caches & terminals visible on radar!",
        FLAG_SERVERLESS_SUBSIDY: "FLAG_SERVERLESS_SUBSIDY: Free weapon rerolls & +50 Max Energy subsidy!",
        FLAG_INDEMNIFIED: "FLAG_INDEMNIFIED: Legal indemnity granted! -15% Hazard & Laser damage taken!",
        FLAG_OVERCLOCKED_BUS: "FLAG_OVERCLOCKED_BUS: Hardware bus overclocked! Tux movement speed +12%!",
        FLAG_KERNEL_STABLE: "FLAG_KERNEL_STABLE: Kernel integrity fortified! Shield-gate i-frames -> 0.8s!",
        FLAG_DECRYPTED_PAYLOAD: "FLAG_DECRYPTED_PAYLOAD: Cryptographic keys exposed! +25% Boss Shield damage!",
        FLAG_GPLV3_VICTORY: "FLAG_GPLV3_VICTORY: Galactic GPLv3 re-licensing complete! Cartel dismantled!"
      };

      const msg = descriptions[flag] || `WORLD-STATE FLAG UNLOCKED: ${flag}`;
      if (window.addFloatingText && window.player) {
        window.addFloatingText(window.player.x, window.player.y - 80, `⚡ ${msg} ⚡`, "#38bdf8", 22);
      }
      if (window.broadcastBossStoryDialogue) {
        window.broadcastBossStoryDialogue("SES MAINLINE KERNEL", msg, "#38bdf8", "🌐");
      }
    },

    save() {
      try {
        localStorage.setItem('tux_world_state_flags', JSON.stringify(this.flags));
      } catch (e) {}
    },

    load() {
      try {
        const saved = localStorage.getItem('tux_world_state_flags');
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.assign(this.flags, parsed);
        }
      } catch (e) {}
    },

    reset() {
      for (const k in this.flags) {
        this.flags[k] = false;
      }
      try {
        localStorage.removeItem('tux_world_state_flags');
      } catch (e) {}
    }
  };

  WorldStateFlags.load();
  window.WorldStateFlags = WorldStateFlags;

  // Register event bus listeners for flags
  if (window.CombatEventBus) {
    window.CombatEventBus.on('OnRoomClear', (room) => {
      // Bonus energy orb drop if serverless subsidy is active
      if (WorldStateFlags.has('FLAG_SERVERLESS_SUBSIDY') && window.player) {
        window.player.energy = Math.min(window.player.maxEnergy || 200, (window.player.energy || 0) + 15);
      }
    });

    window.CombatEventBus.on('OnDamageCalculated', (attacker, defender, ctx) => {
      // Enemy DRM shield reduction
      if (WorldStateFlags.has('FLAG_DRM_WEAKENED') && defender && defender.isDRMPadlock) {
        ctx.damage = Math.round(ctx.damage * 1.25);
      }
      // Boss shield penetration
      if (WorldStateFlags.has('FLAG_DECRYPTED_PAYLOAD') && defender && defender.isBoss && defender.shield > 0) {
        ctx.damage = Math.round(ctx.damage * 1.25);
      }
      // Indemnified hazard defense
      if (WorldStateFlags.has('FLAG_INDEMNIFIED') && defender === window.player && (ctx.source === 'HAZARD' || ctx.source === 'LASER')) {
        ctx.damage = Math.round(ctx.damage * 0.85);
      }
    });
  }
})();
