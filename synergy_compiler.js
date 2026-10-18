/**
 * PACKAGE DEPENDENCY SYNERGY ENGINE - "THE RING-0 CRUSADE"
 * Implements 2-part weapon/buff combinations with retro GCC compiler toasts:
 *  - Broadcast Storm: Ethernet Railgun/Plasma + Shock Tag -> Chain-lightning arcs
 *  - Sudo Firewall: Melee Shield/Gate + Fire/Plasma -> Armor breach 360 fire ring
 *  - Systemd Auto-Restart: Armor Regen + Statue Blessing -> Instant 50% shield reboot on break
 *  - Thermal Throttling: Flamethrower/Fire + Cryo/Ice -> 300% Thermal Shock shatter
 */

(function () {
  'use strict';

  const SYNERGY_DEFINITIONS = {
    BROADCAST_STORM: {
      id: "BROADCAST_STORM",
      name: "Broadcast Storm",
      pkgReq: "ethernet-railgun-devel + libshock-core",
      description: "Projectiles emit bouncing chain-lightning arcs between up to 3 nearby hostiles for 35 electric damage.",
      color: "#38bdf8"
    },
    SUDO_FIREWALL: {
      id: "SUDO_FIREWALL",
      name: "Sudo Firewall",
      pkgReq: "iptables-mod-shield + netfilter-plasma",
      description: "When Armor absorbs damage, discharges a 360-degree radial ring of fire that burns approaching hostiles.",
      color: "#ef4444"
    },
    SYSTEMD_AUTO_RESTART: {
      id: "SYSTEMD_AUTO_RESTART",
      name: "Systemd Auto-Restart",
      pkgReq: "systemd-networkd + pantheon-daemon",
      description: "When Armor breaks, immediately reboots shield to 50% max armor (60s internal cooldown).",
      color: "#22c55e"
    },
    THERMAL_THROTTLING: {
      id: "THERMAL_THROTTLING",
      name: "Thermal Throttling",
      pkgReq: "libsensors-molten + cryo-glacier-libs",
      description: "Alternating heat and freeze damages trigger Thermal Shock: 300% crit damage shattering frozen targets.",
      color: "#f59e0b"
    }
  };

  class SynergyCompiler {
    constructor() {
      this.activeSynergies = new Set();
      this.systemdCooldown = 0;
      this.setupHooks();
    }

    setupHooks() {
      if (!window.CombatEventBus) return;

      // Check synergies on weapon fire, weapon equip, and buff change
      window.CombatEventBus.on('OnWeaponFire', (shooter, weaponData) => {
        if (shooter !== window.player) return;
        this.evaluateSynergies();

        // Broadcast Storm: Chain lightning
        if (this.hasSynergy('BROADCAST_STORM') && Math.random() < 0.65) {
          this.triggerBroadcastStorm(shooter);
        }
      });

      // Sudo Firewall: On damage taken
      window.CombatEventBus.on('OnDamageTaken', (player, damageAmount, damageSource) => {
        if (player !== window.player) return;
        this.evaluateSynergies();

        if (this.hasSynergy('SUDO_FIREWALL') && player.armor > 0) {
          this.triggerSudoFirewall(player);
        }

        // Systemd Auto-Restart: When Armor breaks to 0
        if (this.hasSynergy('SYSTEMD_AUTO_RESTART') && player.armor <= 0 && this.systemdCooldown <= 0) {
          this.triggerSystemdAutoRestart(player);
        }
      });

      // Thermal Throttling: On projectile hit
      window.CombatEventBus.on('OnProjectileHit', (projectile, target, hitInfo) => {
        if (!target) return;
        this.evaluateSynergies();

        if (this.hasSynergy('THERMAL_THROTTLING')) {
          if (target.isFrozen && (projectile.element === 'FIRE' || projectile.label === 'FLAMETHROWER')) {
            hitInfo.damage = Math.round(hitInfo.damage * 3.0);
            target.isFrozen = false;
            if (window.addFloatingText) {
              window.addFloatingText(target.x, target.y - 45, "💥 THERMAL SHOCK CRIT (300%)! 💥", "#f59e0b", 22);
            }
            if (window.soundEngine && window.soundEngine.playRetroExplosion) {
              window.soundEngine.playRetroExplosion();
            }
          }
        }
      });
    }

    hasSynergy(synergyId) {
      return this.activeSynergies.has(synergyId);
    }

    evaluateSynergies() {
      const p = window.player;
      if (!p) return;

      const curW = p.weapons ? p.weapons[p.currentWeapon] : null;
      const wName = curW ? curW.name.toUpperCase() : '';
      const wType = curW ? curW.type : '';
      const hasModifier = window.ModifierEngine;

      // 1. Broadcast Storm: Railgun / Plasma Carbine + Electric/Shock buff
      const hasElectricWeapon = wName.includes('RAILGUN') || wName.includes('PLASMA') || curW?.element === 'ELECTRIC';
      const hasShockBuff = hasModifier && (hasModifier.hasBuff('SHOCK_BUFF') || hasModifier.hasBuff('CHAIN_LIGHTNING'));
      this.checkAndApply('BROADCAST_STORM', hasElectricWeapon && hasShockBuff);

      // 2. Sudo Firewall: Riot Shield / Melee / Shield Buff + Fire / Plasma weapon
      const hasMeleeOrShield = wType === 'MELEE' || (hasModifier && hasModifier.hasBuff('SHIELD_GATE_NO_OVERFLOW'));
      const hasFire = wName.includes('FLAME') || wName.includes('MOLTEN') || curW?.element === 'FIRE';
      this.checkAndApply('SUDO_FIREWALL', hasMeleeOrShield && hasFire);

      // 3. Systemd Auto-Restart: Armor Regen Buff + Statue Blessing
      const hasArmorRegen = hasModifier && hasModifier.hasBuff('ARMOR_REGEN_SPEED');
      const hasStatue = hasModifier && (hasModifier.hasBuff('STATUE_IGNUCIUS') || hasModifier.hasBuff('STATUE_TORVALDS') || hasModifier.hasBuff('STATUE_KEN_DENNIS') || hasModifier.hasBuff('STATUE_SUZANNE'));
      this.checkAndApply('SYSTEMD_AUTO_RESTART', hasArmorRegen && hasStatue);

      // 4. Thermal Throttling: Flamethrower / Fire + Ice / Cryo
      const hasIce = wName.includes('ICE') || wName.includes('CRYO') || curW?.element === 'ICE' || (hasModifier && hasModifier.hasBuff('FREEZE_BUFF'));
      this.checkAndApply('THERMAL_THROTTLING', hasFire && hasIce);
    }

    checkAndApply(synergyId, condition) {
      if (condition && !this.activeSynergies.has(synergyId)) {
        this.activeSynergies.add(synergyId);
        this.showGccToast(SYNERGY_DEFINITIONS[synergyId]);
      } else if (!condition && this.activeSynergies.has(synergyId)) {
        this.activeSynergies.delete(synergyId);
      }
    }

    showGccToast(syn) {
      if (!syn) return;
      if (window.soundEngine && window.soundEngine.playObjectiveComplete) {
        window.soundEngine.playObjectiveComplete();
      }
      if (window.addFloatingText && window.player) {
        window.addFloatingText(window.player.x, window.player.y - 85, `gcc: ${syn.name} [OK]`, syn.color, 24);
      }

      // Add to HUD terminal banner
      const banner = document.getElementById('synergyToastBanner');
      if (banner) {
        banner.innerHTML = `
          <div style="font-family: var(--font-pixel-mono); color: #86efac; font-size: 11px;">$ gcc -O3 -shared -o libsynergy.so</div>
          <div style="font-family: var(--font-pixel-title); color: ${syn.color}; font-size: 13px; margin: 4px 0;">⚡ SYNERGY COMPILED: ${syn.name} ⚡</div>
          <div style="font-family: var(--font-pixel-body); color: #f8fafc; font-size: 10px;">${syn.description}</div>
        `;
        banner.style.display = 'block';
        setTimeout(() => { if (banner) banner.style.display = 'none'; }, 5000);
      }
    }

    triggerBroadcastStorm(shooter) {
      const enemies = window.enemies || [];
      const nearby = [];
      for (const e of enemies) {
        if (!e || e.isDead || e.hp <= 0) continue;
        const d = Math.hypot(e.x - shooter.x, e.y - shooter.y);
        if (d < 350) nearby.push(e);
      }

      const chainTargets = nearby.slice(0, 3);
      for (let i = 0; i < chainTargets.length; i++) {
        const t = chainTargets[i];
        t.takeDamage(35);
        if (window.particles) {
          window.particles.push(new window.SparkParticle(t.x, t.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, "#38bdf8"));
        }
      }
    }

    triggerSudoFirewall(player) {
      const blastRadius = 140;
      const enemies = window.enemies || [];

      // Radial ring visual effect
      if (window.particles) {
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 / 16) * i;
          window.particles.push(new window.SparkParticle(
            player.x + Math.cos(a) * blastRadius * 0.7,
            player.y + Math.sin(a) * blastRadius * 0.7,
            Math.cos(a) * 120, Math.sin(a) * 120, "#ef4444"
          ));
        }
      }

      for (const e of enemies) {
        if (!e || e.isDead || e.hp <= 0) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d <= blastRadius) {
          e.takeDamage(45);
          e.isBurning = true;
          e.burnTimer = 3.0;
        }
      }

      if (window.addScreenShake) window.addScreenShake(6);
    }

    triggerSystemdAutoRestart(player) {
      this.systemdCooldown = 60.0;
      const restoreAmount = Math.ceil(player.maxArmor * 0.5);
      player.armor = restoreAmount;

      if (window.addFloatingText) {
        window.addFloatingText(player.x, player.y - 65, `systemctl restart tuxedo.service (+${restoreAmount} ARMOR)`, "#22c55e", 22);
      }
      if (window.soundEngine && window.soundEngine.playArmorCharge) {
        window.soundEngine.playArmorCharge();
      }
      if (window.addScreenShake) window.addScreenShake(8);
    }

    update(dt) {
      if (this.systemdCooldown > 0) {
        this.systemdCooldown = Math.max(0, this.systemdCooldown - dt);
      }
    }
  }

  const synergyCompiler = new SynergyCompiler();
  window.SynergyCompiler = synergyCompiler;
  window.SYNERGY_DEFINITIONS = SYNERGY_DEFINITIONS;
})();
