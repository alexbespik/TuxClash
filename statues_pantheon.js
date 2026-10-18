/**
 * SACRED STATUES OF THE FOSS PANTHEON
 * Implements interactive shrine statues honoring open-source pioneers:
 *  - St. IGNUcius (Richard Stallman): Copyleft Halo (jams enemy weapons in melee range)
 *  - Emperor Linus Torvalds: Git Blame Daggers (crits spawn homing commit daggers)
 *  - Ken Thompson & Dennis Ritchie: UNIX Pipe Fork (kills fork projectile into 2 children)
 *  - Blender Suzanne Mascot: Wireframe Decoy (dashing spawns wireframe aggro decoy)
 */

(function () {
  'use strict';

  const PANTHEON_DEFINITIONS = {
    IGNUCIUS: {
      id: "IGNUCIUS",
      name: "St. IGNUcius of Emacs",
      title: "Patron Saint of Copyleft & GPL",
      quote: "There is no system but GNU, and Linux is one of its kernels.",
      color: "#f59e0b",
      blessingName: "Copyleft Halo",
      blessingDesc: "Surrounds Tux with an orbital GPL license halo. Hostiles entering melee range have their weapons jammed for 3.0s."
    },
    TORVALDS: {
      id: "TORVALDS",
      name: "Emperor Linus Torvalds",
      title: "Lord of the Merge Request & Git Blame",
      quote: "Talk is cheap. Show me the code.",
      color: "#22c55e",
      blessingName: "Git Blame Daggers",
      blessingDesc: "Critical hits spawn 2 homing commit daggers that track and penetrate enemy weak points (150% damage)."
    },
    KEN_AND_DENNIS: {
      id: "KEN_AND_DENNIS",
      name: "Ken Thompson & Dennis Ritchie",
      title: "Architects of UNIX & The C Standard",
      quote: "You are not expected to understand this.",
      color: "#06b6d4",
      blessingName: "UNIX Pipe Fork",
      blessingDesc: "Every projectile that eliminates a hostile forks (fork()) into two secondary child projectiles (70% damage)."
    },
    SUZANNE: {
      id: "SUZANNE",
      name: "Blender Suzanne",
      title: "Sacred Mascot of 3D Freedom",
      quote: "Rendered purely on CPU and sheer community will.",
      color: "#f97316",
      blessingName: "Wireframe Decoy",
      blessingDesc: "Dashing leaves behind a glowing wireframe monkey penguin decoy that draws hostile aggro for 4.0s."
    }
  };

  class FOSSSanctuaryStatue {
    constructor(x, y, pantheonId = 'IGNUCIUS') {
      this.x = x;
      this.y = y;
      this.radius = 36;
      this.pantheonId = pantheonId;
      this.data = PANTHEON_DEFINITIONS[pantheonId] || PANTHEON_DEFINITIONS.IGNUCIUS;
      this.activated = false;
      this.glowTimer = 0;
    }

    update(dt) {
      this.glowTimer += dt * 2;
      const p = window.player;
      if (!p) return;

      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < 70 && !this.activated) {
        // Show interaction prompt
        if (window.input && (window.input.interact || window.input.keys?.e || window.input.keys?.E)) {
          this.activate(p);
        }
      }
    }

    activate(p) {
      if (this.activated) return;
      this.activated = true;

      // Grant statue buff to ModifierEngine
      if (window.ModifierEngine) {
        window.ModifierEngine.addBuff(`STATUE_${this.pantheonId}`, 999999, {
          pantheonId: this.pantheonId,
          name: this.data.blessingName
        });
      }

      if (window.soundEngine && window.soundEngine.playRetroSuccess) {
        window.soundEngine.playRetroSuccess();
      }

      if (window.addScreenShake) window.addScreenShake(10);
      if (window.addFloatingText) {
        window.addFloatingText(this.x, this.y - 60, `BLESSING: ${this.data.blessingName}!`, this.data.color, 24);
      }

      if (window.broadcastBossStoryDialogue) {
        window.broadcastBossStoryDialogue(this.data.name.toUpperCase(), `"${this.data.quote}" - ${this.data.blessingName} bestowed!`, this.data.color, "🏛️");
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Stone Pedestal
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-28, 4, 56, 20);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(-28, 4, 56, 20);

      // Bronze/Marble Statue Bust
      ctx.fillStyle = this.activated ? this.data.color : "#94a3b8";
      ctx.beginPath();
      ctx.arc(0, -14, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Golden Halo / Aura if activated
      if (this.activated) {
        ctx.strokeStyle = this.data.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -32, 16, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Proximity interaction prompt
      const p = window.player;
      if (p && !this.activated && Math.hypot(p.x - this.x, p.y - this.y) < 75) {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[E] PRAY FOR BLESSING", 0, -42);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "8px monospace";
        ctx.fillText(this.data.name, 0, 34);
      }

      ctx.restore();
    }
  }

  // Active runtime effects for the 4 blessings
  class PantheonBlessingController {
    constructor() {
      this.wireframeDecoys = [];
      this.homingDaggers = [];
      this.setupHooks();
    }

    setupHooks() {
      if (!window.CombatEventBus) return;

      // 1. Ken & Dennis UNIX Pipe Fork (kill forks projectile into 2 children)
      window.CombatEventBus.on('OnEnemyKill', (killer, enemy) => {
        if (killer === window.player && window.ModifierEngine?.hasBuff('STATUE_KEN_AND_DENNIS') && window.playerProjectiles) {
          const a = Math.random() * Math.PI * 2;
          for (let i = 0; i < 2; i++) {
            const forkAngle = a + (i === 0 ? 0.4 : -0.4);
            const spd = 700;
            window.playerProjectiles.push(new window.PlayerBullet(
              enemy.x, enemy.y,
              Math.cos(forkAngle) * spd,
              Math.sin(forkAngle) * spd,
              5, 28, "#06b6d4", 0.9, false, 0, 0, "UNIX_FORK_PIPE"
            ));
          }
        }
      });

      // 2. Linus Git Blame Daggers (crits spawn homing commit daggers)
      window.CombatEventBus.on('OnProjectileHit', (projectile, target, hitInfo) => {
        if (hitInfo.isCrit && window.ModifierEngine?.hasBuff('STATUE_TORVALDS') && target) {
          for (let i = 0; i < 2; i++) {
            this.homingDaggers.push({
              x: projectile.x,
              y: projectile.y,
              target: target,
              speed: 650,
              damage: Math.round(projectile.damage * 1.5),
              life: 1.5
            });
          }
        }
      });

      // 3. Blender Suzanne Wireframe Decoy on Dash/Roll
      window.CombatEventBus.on('OnPlayerDash', (player) => {
        if (window.ModifierEngine?.hasBuff('STATUE_SUZANNE')) {
          this.wireframeDecoys.push({
            x: player.x,
            y: player.y,
            life: 4.0
          });
          if (window.addFloatingText) {
            window.addFloatingText(player.x, player.y - 40, "🐵 SUZANNE DECOY DEPLOYED", "#f97316", 18);
          }
        }
      });
    }

    update(dt) {
      const p = window.player;
      if (!p) return;

      // 4. St. IGNUcius Copyleft Halo: Jams nearby enemy weapons in melee range
      if (window.ModifierEngine?.hasBuff('STATUE_IGNUCIUS')) {
        const enemies = window.enemies || [];
        for (const e of enemies) {
          if (!e || e.isDead || e.hp <= 0) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 130) {
            e.attackCooldown = Math.max(e.attackCooldown || 0, 1.5); // Jam weapons!
            if (Math.random() < 0.08 && window.addFloatingText) {
              window.addFloatingText(e.x, e.y - 30, "GPL JAMMED!", "#f59e0b", 12);
            }
          }
        }
      }

      // Update homing daggers
      for (let i = this.homingDaggers.length - 1; i >= 0; i--) {
        const d = this.homingDaggers[i];
        d.life -= dt;
        if (d.life <= 0 || !d.target || d.target.isDead) {
          this.homingDaggers.splice(i, 1);
          continue;
        }

        const angle = Math.atan2(d.target.y - d.y, d.target.x - d.x);
        d.x += Math.cos(angle) * d.speed * dt;
        d.y += Math.sin(angle) * d.speed * dt;

        if (Math.hypot(d.x - d.target.x, d.y - d.target.y) < 24) {
          d.target.takeDamage(d.damage);
          if (window.addFloatingText) {
            window.addFloatingText(d.target.x, d.target.y - 35, `git blame: -${d.damage}`, "#22c55e", 16);
          }
          this.homingDaggers.splice(i, 1);
        }
      }

      // Update wireframe decoys
      for (let i = this.wireframeDecoys.length - 1; i >= 0; i--) {
        const decoy = this.wireframeDecoys[i];
        decoy.life -= dt;
        if (decoy.life <= 0) {
          this.wireframeDecoys.splice(i, 1);
        }
      }
    }

    draw(ctx) {
      // Draw homing daggers
      for (const d of this.homingDaggers) {
        ctx.save();
        ctx.fillStyle = "#22c55e";
        ctx.shadowColor = "#86efac";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw wireframe decoys
      for (const decoy of this.wireframeDecoys) {
        ctx.save();
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(decoy.x - 14, decoy.y - 14, 28, 28);
        ctx.beginPath();
        ctx.moveTo(decoy.x - 14, decoy.y - 14); ctx.lineTo(decoy.x + 14, decoy.y + 14);
        ctx.moveTo(decoy.x + 14, decoy.y - 14); ctx.lineTo(decoy.x - 14, decoy.y + 14);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  const pantheonBlessingController = new PantheonBlessingController();
  window.FOSSSanctuaryStatue = FOSSSanctuaryStatue;
  window.PantheonBlessingController = pantheonBlessingController;
  window.PANTHEON_DEFINITIONS = PANTHEON_DEFINITIONS;
})();
