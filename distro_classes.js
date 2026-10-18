/**
 * DISTRO-CLASS LOADOUTS SYSTEM - "THE RING-0 CRUSADE"
 * Implements Fedora, Arch, NixOS, and Pop!_OS / Ubuntu chassis with unique passives,
 * active tactical skills (triggered on [Q] / [Space]), and distinctive combat stats.
 */

(function () {
  'use strict';

  const DISTRO_DEFINITIONS = {
    FEDORA: {
      id: "FEDORA",
      name: "Fedora Workstation",
      tagline: "First-party stability & hardened SELinux security policies",
      badge: "🎩",
      color: "#38bdf8",
      accent: "#0284c7",
      hp: 100,
      maxHp: 100,
      armor: 6,
      maxArmor: 6,
      speed: 230,
      traitName: "SELinux Enforcement",
      traitDesc: "Hardened MAC policy: The first incoming hit in any combat encounter deals -50% damage.",
      skillName: "dnf update -y",
      skillKey: "Q",
      skillCooldown: 18.0,
      skillDuration: 5.0,
      skillDesc: "Unleash rapid package transaction: Fire rate surged by +40% with zero energy cost for 5s."
    },
    ARCH: {
      id: "ARCH",
      name: "Arch Linux",
      tagline: "Bleeding-edge rolling release for unhinged performance purists",
      badge: "⚡",
      color: "#06b6d4",
      accent: "#0891b2",
      hp: 80,
      maxHp: 80,
      armor: 4,
      maxArmor: 4,
      speed: 260,
      traitName: "Rolling Release",
      traitDesc: "Glass Cannon: -20% Max HP, but all weapon damage and critical strike chance increased by +25%.",
      skillName: "pacman -Syu",
      skillKey: "Q",
      skillCooldown: 12.0,
      skillDuration: 0.25,
      skillDesc: "Blink forward 180px and emit an omnidirectional projectile-deflection pulse (180px radius)."
    },
    NIXOS: {
      id: "NIXOS",
      name: "NixOS",
      tagline: "Atomic declarative configurations & instant generational rollbacks",
      badge: "❄️",
      color: "#818cf8",
      accent: "#4f46e5",
      hp: 90,
      maxHp: 90,
      armor: 8,
      maxArmor: 8,
      speed: 220,
      traitName: "Atomic Declarative",
      traitDesc: "Immutable system state: Tux is immune to all environmental floor hazards, slimes, and slows.",
      skillName: "nixos-rebuild switch --rollback",
      skillKey: "Q",
      skillCooldown: 22.0,
      skillDuration: 0.1,
      skillDesc: "Roll back to previous generation: Rewinds position to 3 seconds ago and restores +2 Armor instantly."
    },
    POP_OS: {
      id: "POP_OS",
      name: "Pop!_OS / Ubuntu",
      tagline: "Out-of-the-box CUDA acceleration & auto-tiling system efficiency",
      badge: "🤖",
      color: "#f59e0b",
      accent: "#d97706",
      hp: 110,
      maxHp: 110,
      armor: 5,
      maxArmor: 5,
      speed: 235,
      traitName: "CUDA Acceleration",
      traitDesc: "Hardware accelerated: All explosive, plasma, and laser weapons deal +30% splash damage and radius.",
      skillName: "system76-power auto-tile",
      skillKey: "Q",
      skillCooldown: 24.0,
      skillDuration: 8.0,
      skillDesc: "Deploy 2 orbiting defensive sentry drones firing green laser pulses at nearby hostiles for 8s."
    }
  };

  class DistroSystem {
    constructor() {
      this.currentDistroId = 'FEDORA';
      this.skillTimer = 0;
      this.skillActiveTimer = 0;
      this.selinuxCharged = true;
      this.positionHistory = []; // For NixOS rollback: store {x, y, armor, time}
      this.popOsDrones = [];      // For Pop!_OS auto-tile drones
      this.setupHooks();
      this.setupControls();
    }

    getCurrentDistro() {
      return DISTRO_DEFINITIONS[this.currentDistroId] || DISTRO_DEFINITIONS.FEDORA;
    }

    selectDistro(distroId) {
      if (!DISTRO_DEFINITIONS[distroId]) return;
      this.currentDistroId = distroId;
      const d = DISTRO_DEFINITIONS[distroId];

      if (window.player) {
        window.player.maxHp = d.hp;
        window.player.hp = Math.min(window.player.hp, d.hp);
        window.player.maxArmor = d.maxArmor;
        window.player.armor = d.armor;
        window.player.baseSpeed = d.speed;
        window.player.speed = d.speed;
      }

      this.skillTimer = 0;
      this.skillActiveTimer = 0;
      this.selinuxCharged = true;

      if (window.soundEngine && window.soundEngine.playRetroSuccess) {
        window.soundEngine.playRetroSuccess();
      }

      if (window.addFloatingText && window.player) {
        window.addFloatingText(window.player.x, window.player.y - 70, `${d.badge} DISTRO: ${d.name.toUpperCase()} ACTIVATED!`, d.color, 24);
      }

      this.updateHud();
      this.saveSelection();
    }

    setupHooks() {
      if (!window.CombatEventBus) return;

      // SELinux -50% first hit in combat
      window.CombatEventBus.on('OnDamageCalculated', (attacker, defender, ctx) => {
        if (defender === window.player && this.currentDistroId === 'FEDORA' && this.selinuxCharged) {
          ctx.damage = Math.max(1, Math.round(ctx.damage * 0.5));
          this.selinuxCharged = false;
          if (window.addFloatingText && window.player) {
            window.addFloatingText(window.player.x, window.player.y - 50, "🛡️ SELinux Policy: -50% Damage", "#38bdf8", 18);
          }
        }
      });

      // Arch Linux Rolling Release: +25% weapon damage and crit
      window.CombatEventBus.on('OnDamageCalculated', (attacker, defender, ctx) => {
        if (attacker === window.player && this.currentDistroId === 'ARCH') {
          ctx.damage = Math.round(ctx.damage * 1.25);
        }
      });

      // Pop!_OS CUDA explosive / splash boost
      window.CombatEventBus.on('OnDamageCalculated', (attacker, defender, ctx) => {
        if (attacker === window.player && this.currentDistroId === 'POP_OS' && (ctx.isExplosive || ctx.element === 'FIRE' || ctx.element === 'ELECTRIC')) {
          ctx.damage = Math.round(ctx.damage * 1.30);
        }
      });

      // Reset SELinux on room clear
      window.CombatEventBus.on('OnRoomClear', () => {
        this.selinuxCharged = true;
      });
    }

    setupControls() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'q' || e.key === 'Q') {
          // If Linux Terminal modal or AI config modal is open, don't trigger
          const terminalModal = document.getElementById('linuxTerminalModal');
          const aiModal = document.getElementById('aiConfigModal');
          if (terminalModal && terminalModal.style.display === 'flex') return;
          if (aiModal && aiModal.style.display === 'flex') return;

          this.triggerActiveSkill();
        }
      });
    }

    triggerActiveSkill() {
      if (this.skillTimer > 0) {
        if (window.soundEngine && window.soundEngine.playEmptyClick) {
          window.soundEngine.playEmptyClick();
        }
        return;
      }

      const p = window.player;
      if (!p || p.isDead) return;

      const distro = this.getCurrentDistro();
      this.skillTimer = distro.skillCooldown;
      this.skillActiveTimer = distro.skillDuration;

      if (window.soundEngine && window.soundEngine.playStratagemDeploy) {
        window.soundEngine.playStratagemDeploy();
      }

      if (window.addFloatingText) {
        window.addFloatingText(p.x, p.y - 65, `${distro.badge} [${distro.skillName}]`, distro.color, 22);
      }

      if (window.CombatEventBus) {
        window.CombatEventBus.emit('OnSkillActivated', p, distro);
      }

      // Execute skill specific actions
      if (this.currentDistroId === 'FEDORA') {
        // dnf update -y: Fire rate surge handled in update loop
      } else if (this.currentDistroId === 'ARCH') {
        // pacman -Syu: Blink forward + deflect pulse
        const blinkDist = 180;
        const angle = p.angle || 0;
        p.x += Math.cos(angle) * blinkDist;
        p.y += Math.sin(angle) * blinkDist;
        if (window.addScreenShake) window.addScreenShake(8);

        // Omnidirectional deflect pulse
        const enemyProjectiles = window.enemyProjectiles || [];
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
          const ep = enemyProjectiles[i];
          const d = Math.hypot(ep.x - p.x, ep.y - p.y);
          if (d < 180) {
            ep.vx = -ep.vx * 1.3;
            ep.vy = -ep.vy * 1.3;
            ep.isEnemy = false;
            if (window.playerProjectiles) {
              window.playerProjectiles.push(ep);
              enemyProjectiles.splice(i, 1);
            }
          }
        }
      } else if (this.currentDistroId === 'NIXOS') {
        // Rollback: Rewind 3 seconds
        if (this.positionHistory.length > 0) {
          const pastState = this.positionHistory[0]; // ~3s ago
          p.x = pastState.x;
          p.y = pastState.y;
          p.armor = Math.min(p.maxArmor, (p.armor || 0) + 2);
          if (window.addFloatingText) {
            window.addFloatingText(p.x, p.y - 45, "↩️ GENERATIONAL ROLLBACK (+2 ARMOR)", "#818cf8", 20);
          }
          if (window.addScreenShake) window.addScreenShake(6);
        }
      } else if (this.currentDistroId === 'POP_OS') {
        // Auto-tile sentry drones
        this.popOsDrones = [
          { angleOffset: 0, fireCooldown: 0 },
          { angleOffset: Math.PI, fireCooldown: 0.25 }
        ];
      }
    }

    update(dt) {
      if (this.skillTimer > 0) {
        this.skillTimer = Math.max(0, this.skillTimer - dt);
      }
      if (this.skillActiveTimer > 0) {
        this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
      }

      const p = window.player;
      if (!p) return;

      // Track position history for NixOS rollback
      this.positionHistory.push({ x: p.x, y: p.y, armor: p.armor, time: Date.now() });
      if (this.positionHistory.length > 180) { // Keep ~3 seconds at 60fps
        this.positionHistory.shift();
      }

      // Fedora active buff: Fire rate surge
      if (this.currentDistroId === 'FEDORA' && this.skillActiveTimer > 0) {
        p.fireCooldown = Math.min(p.fireCooldown, 0.05);
      }

      // Pop!_OS auto-tile drones
      if (this.currentDistroId === 'POP_OS' && this.skillActiveTimer > 0 && this.popOsDrones.length > 0) {
        const orbitRadius = 60;
        const orbitSpeed = 4.0;
        const now = Date.now() / 1000;

        for (const drone of this.popOsDrones) {
          drone.fireCooldown -= dt;
          const a = now * orbitSpeed + drone.angleOffset;
          const dx = p.x + Math.cos(a) * orbitRadius;
          const dy = p.y + Math.sin(a) * orbitRadius;

          // Drone auto-firing green laser pulses at nearest enemy
          if (drone.fireCooldown <= 0) {
            drone.fireCooldown = 0.45;
            const enemies = window.enemies || [];
            let closest = null;
            let cDist = 450;
            for (const e of enemies) {
              if (!e || e.isDead || e.hp <= 0) continue;
              const ed = Math.hypot(e.x - dx, e.y - dy);
              if (ed < cDist) { cDist = ed; closest = e; }
            }

            if (closest && window.playerProjectiles) {
              const aimA = Math.atan2(closest.y - dy, closest.x - dx);
              const spd = 750;
              window.playerProjectiles.push(new window.PlayerBullet(
                dx, dy,
                Math.cos(aimA) * spd,
                Math.sin(aimA) * spd,
                5, 24, "#22c55e", 0.85, false, 0, 0, "AUTO_TILE_DRONE"
              ));
            }
          }
        }
      }

      this.updateHud();
    }

    draw(ctx) {
      const p = window.player;
      if (!p || p.isDead) return;

      // Draw Pop!_OS auto-tile orbiting drones
      if (this.currentDistroId === 'POP_OS' && this.skillActiveTimer > 0 && this.popOsDrones.length > 0) {
        const orbitRadius = 60;
        const orbitSpeed = 4.0;
        const now = Date.now() / 1000;

        ctx.save();
        for (const drone of this.popOsDrones) {
          const a = now * orbitSpeed + drone.angleOffset;
          const dx = p.x + Math.cos(a) * orbitRadius;
          const dy = p.y + Math.sin(a) * orbitRadius;

          // Sentry Drone Body
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(dx, dy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Laser pointer glow
          ctx.fillStyle = "#86efac";
          ctx.beginPath();
          ctx.arc(dx, dy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Arch Linux rolling release cyan particles
      if (this.currentDistroId === 'ARCH' && Math.random() < 0.25) {
        ctx.save();
        ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
        ctx.beginPath();
        ctx.arc(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 30, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    updateHud() {
      const el = document.getElementById('distroHudBadge');
      if (!el) return;
      const d = this.getCurrentDistro();
      const cd = this.skillTimer > 0 ? `${this.skillTimer.toFixed(1)}s` : "READY [Q]";
      const active = this.skillActiveTimer > 0 ? "🔥 ACTIVE" : cd;

      el.innerHTML = `
        <span style="color: ${d.color}; font-weight: bold;">${d.badge} ${d.name}</span>
        <span style="font-size: 8px; color: ${this.skillTimer <= 0 ? '#86efac' : '#94a3b8'}; margin-left: 6px;">[Q: ${active}]</span>
      `;
    }

    saveSelection() {
      try {
        localStorage.setItem('tux_selected_distro', this.currentDistroId);
      } catch (e) {}
    }

    loadSelection() {
      try {
        const saved = localStorage.getItem('tux_selected_distro');
        if (saved && DISTRO_DEFINITIONS[saved]) {
          this.currentDistroId = saved;
        }
      } catch (e) {}
    }
  }

  const distroSystem = new DistroSystem();
  distroSystem.loadSelection();
  window.DistroSystem = distroSystem;
  window.DISTRO_DEFINITIONS = DISTRO_DEFINITIONS;
})();
