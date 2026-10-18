/**
 * UPTIME & OOM-KILLER MOMENTUM METER
 * Implements Gemini Argon's Roguelike Risk/Reward Uptime Architecture:
 * - 0% to 100% Uptime Gauge
 * - +5% per kill, +10% per projectile deflection, +25% per bash command success
 * - Drops to 0% when Tux takes direct HP damage (Armor damage preserves Uptime!)
 * - Tiered passive kernel optimizations (25%, 50%, 75%)
 * - At 100%: 8s OOM-Killer red lightning aura executing lowest-HP enemy with `kill -9` (+5 Armor per execution)
 */

(function () {
  'use strict';

  class UptimeMeter {
    constructor() {
      this.uptime = 0; // 0 to 100
      this.oomActive = false;
      this.oomTimer = 0;
      this.oomTickTimer = 0;
      this.shotCounter = 0;
      this.redLightningArcs = []; // Visual lightning effects
      this.setupHooks();
    }

    setupHooks() {
      if (!window.CombatEventBus) return;

      // 1. +5% per enemy kill
      window.CombatEventBus.on('OnEnemyKill', (killer, enemy) => {
        if (killer === window.player) {
          this.addUptime(5.0);
        }
      });

      // 2. +10% per melee projectile deflection
      window.CombatEventBus.on('OnProjectileDeflected', (player, proj) => {
        this.addUptime(10.0);
      });

      // 3. +25% per terminal command override
      window.CombatEventBus.on('OnTerminalCommandSuccess', (station) => {
        this.addUptime(25.0);
      });

      // 4. Damage check: Armor damage PRESERVES uptime; direct HP damage RESETS uptime to 0%!
      window.CombatEventBus.on('OnDamageTaken', (player, damageAmount, damageSource) => {
        if (!player) return;
        // If damage breached armor and reduced HP, reset Uptime!
        if (player.armor <= 0 || (damageAmount > (player.armor || 0) && player.armor === 0)) {
          if (this.uptime > 0 && !this.oomActive) {
            this.uptime = 0;
            if (window.addFloatingText) {
              window.addFloatingText(player.x, player.y - 45, "⚠️ KERNEL PANIC: UPTIME RESET (0%)", "#ef4444", 20);
            }
            if (window.soundEngine && window.soundEngine.playHurt) {
              window.soundEngine.playHurt();
            }
          }
        }
      });

      // 5. Tier 3 Buff: Every 3rd shot fires an extra piercing bullet
      window.CombatEventBus.on('OnWeaponFire', (shooter, weaponData) => {
        if (shooter === window.player && (this.uptime >= 75 || this.oomActive)) {
          this.shotCounter++;
          if (this.shotCounter % 3 === 0 && window.playerProjectiles) {
            const angle = shooter.angle || 0;
            const spd = 950;
            window.playerProjectiles.push(new window.PlayerBullet(
              shooter.x, shooter.y,
              Math.cos(angle) * spd,
              Math.sin(angle) * spd,
              7, Math.round((weaponData.damage || 25) * 1.4),
              "#ef4444", 0.95, false, 0, 0, "DIRTY_RATIO_PIERCE"
            ));
          }
        }
      });
    }

    addUptime(amount) {
      if (this.oomActive) return; // While OOM-Killer is running, stay locked at 100%
      this.uptime = Math.min(100, this.uptime + amount);

      if (this.uptime >= 100 && !this.oomActive) {
        this.triggerOOMKiller();
      }
    }

    triggerOOMKiller() {
      this.oomActive = true;
      this.oomTimer = 8.0;
      this.oomTickTimer = 0.5;

      if (window.addScreenShake) window.addScreenShake(18);
      if (window.addFloatingText && window.player) {
        window.addFloatingText(window.player.x, window.player.y - 75, "⚡ KERNEL OOM-KILLER ACTIVATED! [kill -9] ⚡", "#ef4444", 26);
      }

      if (window.broadcastBossStoryDialogue) {
        window.broadcastBossStoryDialogue("KERNEL DAEMON", "Out of memory: Kill process or sacrifice child. EXECUTING kill -9!", "#ef4444", "⚡");
      }

      if (window.soundEngine && typeof window.soundEngine.speakRobot === 'function') {
        window.soundEngine.speakRobot("OUT OF MEMORY. OOM KILLER PROTOCOL EXECUTING.", "KERNEL DAEMON");
      }
    }

    update(dt) {
      const p = window.player;
      if (!p || p.isDead) return;

      // Tier 1 Buff (>= 25% Uptime): nice -n -20 (+10% Move Speed)
      if (this.uptime >= 25 || this.oomActive) {
        p.speed = Math.max(p.speed, p.baseSpeed * 1.10);
      }

      // Tier 2 Buff (>= 50% Uptime): swapoff -a (+15% Fire Rate)
      if (this.uptime >= 50 || this.oomActive) {
        if (p.fireCooldown > 0.08) {
          p.fireCooldown -= dt * 0.15;
        }
      }

      // OOM-Killer Active Execution Phase (8 seconds)
      if (this.oomActive) {
        this.oomTimer -= dt;
        this.oomTickTimer -= dt;

        // Generate red lightning aura particles
        if (Math.random() < 0.4) {
          this.redLightningArcs.push({
            x1: p.x + (Math.random() - 0.5) * 50,
            y1: p.y + (Math.random() - 0.5) * 50,
            x2: p.x + (Math.random() - 0.5) * 80,
            y2: p.y + (Math.random() - 0.5) * 80,
            life: 0.15
          });
        }

        // Every 1.0s: execute lowest-HP enemy within 450px with red lightning & kill -9
        if (this.oomTickTimer <= 0) {
          this.oomTickTimer = 1.0;
          this.executeLowestHpEnemy();
        }

        if (this.oomTimer <= 0) {
          this.oomActive = false;
          this.uptime = 50.0; // Graceful rollback to 50%
          if (window.addFloatingText) {
            window.addFloatingText(p.x, p.y - 50, "RAM REALLOCATED (Uptime 50%)", "#38bdf8", 20);
          }
        }
      }

      // Update lightning arcs life
      for (let i = this.redLightningArcs.length - 1; i >= 0; i--) {
        this.redLightningArcs[i].life -= dt;
        if (this.redLightningArcs[i].life <= 0) {
          this.redLightningArcs.splice(i, 1);
        }
      }

      this.updateHud();
    }

    executeLowestHpEnemy() {
      const p = window.player;
      if (!p) return;

      const enemies = window.enemies || [];
      let target = null;
      let minHp = Infinity;

      for (const e of enemies) {
        if (!e || e.isDead || e.hp <= 0 || e.isBoss) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d <= 480 && e.hp < minHp) {
          minHp = e.hp;
          target = e;
        }
      }

      if (target) {
        // Red lightning strike effect
        this.redLightningArcs.push({
          x1: p.x, y1: p.y - 20,
          x2: target.x, y2: target.y,
          life: 0.35, isExecution: true
        });

        // Instant kill -9
        target.hp = 0;
        target.isDead = true;
        if (typeof target.die === 'function') target.die();

        // Restore +5 Armor
        p.armor = Math.min(p.maxArmor, (p.armor || 0) + 5);

        if (window.addFloatingText) {
          window.addFloatingText(target.x, target.y - 40, "⚡ kill -9 [PID SIGKILL] (+5 ARMOR) ⚡", "#ef4444", 22);
        }
        if (window.addScreenShake) window.addScreenShake(10);
        if (window.soundEngine && window.soundEngine.playRetroExplosion) {
          window.soundEngine.playRetroExplosion();
        }
      }
    }

    draw(ctx) {
      // Draw red lightning arcs
      if (this.redLightningArcs.length > 0) {
        ctx.save();
        for (const arc of this.redLightningArcs) {
          ctx.strokeStyle = arc.isExecution ? "#ef4444" : "#f87171";
          ctx.lineWidth = arc.isExecution ? 3.5 : 1.5;
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(arc.x1, arc.y1);
          // Zigzag intermediate point
          const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 35;
          const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 35;
          ctx.lineTo(midX, midY);
          ctx.lineTo(arc.x2, arc.y2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    updateHud() {
      const fillEl = document.getElementById('uptimeMeterFill');
      const valEl = document.getElementById('uptimeMeterValue');
      const tierEl = document.getElementById('uptimeTierBadge');
      if (!fillEl) return;

      const pct = Math.min(100, Math.max(0, this.uptime));
      fillEl.style.width = `${pct}%`;

      if (this.oomActive) {
        fillEl.style.backgroundColor = '#ef4444';
        fillEl.style.boxShadow = '0 0 14px #ef4444';
        if (valEl) valEl.innerText = `OOM-KILLER (${this.oomTimer.toFixed(1)}s)`;
        if (tierEl) tierEl.innerText = "⚡ KILL -9 ACTIVE";
      } else {
        fillEl.style.backgroundColor = pct >= 75 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e';
        fillEl.style.boxShadow = 'none';
        if (valEl) valEl.innerText = `${Math.floor(pct)}%`;
        if (tierEl) {
          if (pct >= 75) tierEl.innerText = "T3: DIRTY_RATIO";
          else if (pct >= 50) tierEl.innerText = "T2: SWAPOFF";
          else if (pct >= 25) tierEl.innerText = "T1: NICE -20";
          else tierEl.innerText = "UPTIME";
        }
      }
    }
  }

  const uptimeMeter = new UptimeMeter();
  window.UptimeMeter = uptimeMeter;
})();
