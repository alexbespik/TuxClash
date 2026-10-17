/**
 * TUX: ROOT PURGE - Authentic 16-Bit Pixel Art Cutscene Engine
 * Reusable retro cinematic system for narrative story cutscenes:
 *  1. 'burning_servers'   : Tux incinerates proprietary corporate server towers with the GPL Flamethrower
 *  2. 'orbital_drop'      : Super Destroyer launches Astartes Tux in a hypersonic drop pod to the surface
 *  3. 'victory_liberation': Sunrise liberation, planting the Linux Penguin flag atop defeated mainframe
 */

(function () {
  'use strict';

  // Internal low-resolution virtual canvas dimensions for authentic chunky pixel rendering
  const VW = 480;
  const VH = 270;

  let activeCutscene = null;
  let animFrameId = null;
  let startTime = 0;
  let onCompleteCallback = null;
  let overlayEl = null;
  let canvasEl = null;
  let ctx = null;

  // Particle systems for fire, smoke, sparks, and debris
  let particles = [];
  let stars = [];

  function initStars() {
    stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * VW,
        y: Math.random() * (VH * 0.75),
        speed: 0.2 + Math.random() * 0.8,
        size: Math.random() > 0.8 ? 2 : 1,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  function spawnFireParticles(x, y, count, spreadX, dirX) {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'fire',
        x: x + (Math.random() - 0.5) * spreadX,
        y: y + (Math.random() - 0.5) * 8,
        vx: dirX * (2.5 + Math.random() * 3.5) + (Math.random() - 0.5) * 1.5,
        vy: -1.2 - Math.random() * 2.8,
        life: 0,
        maxLife: 24 + Math.random() * 20,
        size: 3 + Math.floor(Math.random() * 4)
      });
    }
  }

  function spawnDebris(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.push({
        type: 'debris',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 0,
        maxLife: 30 + Math.random() * 25,
        color: Math.random() > 0.5 ? '#38bdf8' : (Math.random() > 0.5 ? '#f59e0b' : '#ef4444'),
        size: 2 + Math.floor(Math.random() * 3)
      });
    }
  }

  function spawnFireworks(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = 1.2 + Math.random() * 3.0;
      particles.push({
        type: 'firework',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 35 + Math.random() * 20,
        color: color,
        size: 2 + (Math.random() > 0.6 ? 1 : 0)
      });
    }
  }

  // --- PIXEL SPRITE DRAWING HELPERS ---

  // Draws an authentic 16-bit Tux sprite
  function drawPixelTux(c, px, py, frame, options = {}) {
    const scale = options.scale || 2;
    const waddle = options.walking ? Math.sin(frame * 0.25) * 2 : 0;
    const facing = options.facing !== undefined ? options.facing : 1;
    const armUp = options.armUp || false;
    const thumbsUp = options.thumbsUp || false;
    const armored = options.armored || false;

    c.save();
    c.translate(Math.round(px), Math.round(py + waddle));
    c.scale(facing * scale, scale);

    // Pixel Tux Body Outline (Black)
    c.fillStyle = armored ? '#334155' : '#0a0a0f';
    c.fillRect(-8, -14, 16, 24);
    c.fillRect(-10, -10, 20, 18);
    c.fillRect(-6, -18, 12, 5);

    // Ceramite armor accents if Astartes Tux
    if (armored) {
      c.fillStyle = '#0284c7';
      c.fillRect(-9, -12, 18, 8); // Breastplate
      c.fillStyle = '#38bdf8';
      c.fillRect(-7, -10, 14, 2); // Glowing energy conduit
      c.fillStyle = '#f59e0b';
      c.fillRect(-4, -8, 8, 4); // Eagle / Tux Crest
      // Blue glowing cyber visor
      c.fillStyle = '#06b6d4';
      c.fillRect(0, -16, 6, 3);
    } else {
      // White Belly
      c.fillStyle = '#f8fafc';
      c.fillRect(-4, -6, 8, 14);
      c.fillRect(-6, -2, 12, 9);

      // Red Commando Bandana
      c.fillStyle = '#dc2626';
      c.fillRect(-7, -17, 14, 3);
      // Fluttering knot tails
      const tailFlap = Math.sin(frame * 0.3) * 2;
      c.fillRect(-11, -17 + tailFlap, 4, 2);
      c.fillRect(-13, -16 + tailFlap * 1.5, 3, 2);

      // Tux Eyes
      c.fillStyle = '#ffffff';
      c.fillRect(1, -16, 4, 4);
      c.fillStyle = '#000000';
      c.fillRect(3, -15, 2, 2);

      // Tux Beak (Golden Orange)
      c.fillStyle = '#f59e0b';
      c.fillRect(3, -12, 6, 3);
      c.fillStyle = '#d97706';
      c.fillRect(3, -9, 4, 1);
    }

    // Flipper / Arms
    if (thumbsUp) {
      // Right arm raised giving thumbs up!
      c.fillStyle = '#0a0a0f';
      c.fillRect(4, -8, 6, 3);
      c.fillStyle = '#f59e0b';
      c.fillRect(9, -12, 3, 5); // Thumb up
      c.fillRect(7, -9, 4, 3);
      // Sparkle on thumb
      c.fillStyle = '#ffffff';
      c.fillRect(10, -14, 2, 2);
    } else if (armUp) {
      c.fillStyle = '#0a0a0f';
      c.fillRect(4, -14, 3, 8);
    } else {
      c.fillStyle = '#0a0a0f';
      c.fillRect(4, -6, 3, 10);
    }

    // Weapon: GPL Flamethrower held in flipper
    if (options.hasFlamer) {
      c.fillStyle = '#475569';
      c.fillRect(4, -5, 14, 4); // Barrel
      c.fillStyle = '#1e293b';
      c.fillRect(2, -2, 6, 4);  // Grip
      c.fillStyle = '#ef4444';
      c.fillRect(-10, -8, 4, 10); // Red fuel canister on back
      c.fillStyle = '#cbd5e1';
      c.fillRect(-9, -10, 2, 2);  // Valve cap
      c.fillStyle = '#f59e0b';
      c.fillRect(16, -6, 3, 6);  // Pilot light nozzle
      // Tiny pilot flame
      if (Math.random() > 0.3) {
        c.fillStyle = '#ef4444';
        c.fillRect(19, -5, 3, 3);
        c.fillStyle = '#fef08a';
        c.fillRect(20, -4, 2, 2);
      }
    }

    // Tux Feet (Orange Webbed)
    c.fillStyle = '#f59e0b';
    c.fillRect(-7, 10, 5, 2);
    c.fillRect(2, 10, 5, 2);

    c.restore();
  }

  // Draws a proprietary server rack
  function drawPixelServerRack(c, rx, ry, rw, rh, options = {}) {
    c.save();
    // Metal chassis
    c.fillStyle = '#090d14';
    c.fillRect(rx, ry, rw, rh);
    c.fillStyle = '#1e293b';
    c.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);

    // Bevel highlights & shadow
    c.fillStyle = '#334155';
    c.fillRect(rx, ry, rw, 2);
    c.fillRect(rx, ry, 2, rh);
    c.fillStyle = '#020617';
    c.fillRect(rx + rw - 2, ry, 2, rh);
    c.fillRect(rx, ry + rh - 2, rw, 2);

    // Server trays (horizontal slots)
    const slotCount = Math.floor((rh - 12) / 14);
    for (let s = 0; s < slotCount; s++) {
      const sy = ry + 8 + s * 14;
      c.fillStyle = '#0f172a';
      c.fillRect(rx + 4, sy, rw - 8, 10);
      c.fillStyle = '#020617';
      c.fillRect(rx + 4, sy + 9, rw - 8, 1);

      // Blinking LEDs
      const ledColor = options.burning
        ? (Math.random() > 0.5 ? '#ef4444' : '#f59e0b')
        : ((s + options.frame) % 3 === 0 ? '#22c55e' : (s % 2 === 0 ? '#38bdf8' : '#eab308'));
      c.fillStyle = ledColor;
      c.fillRect(rx + 6, sy + 3, 2, 2);
      c.fillRect(rx + 10, sy + 3, 2, 2);

      // Cooling vent lines
      c.fillStyle = '#1e293b';
      for (let v = 0; v < 4; v++) {
        c.fillRect(rx + 16 + v * 4, sy + 3, 2, 4);
      }
    }

    // Monitor display in middle slot
    const my = ry + 20;
    c.fillStyle = '#020617';
    c.fillRect(rx + 6, my, rw - 12, 22);
    c.fillStyle = options.burning ? '#ef4444' : '#1e3a8a';
    c.fillRect(rx + 8, my + 2, rw - 16, 18);

    // Text on monitor
    c.fillStyle = options.burning ? '#ffffff' : '#38bdf8';
    c.font = '6px monospace';
    if (options.burning) {
      c.fillText(":( BSOD", rx + 10, my + 10);
      c.fillText("0xDEAD", rx + 10, my + 17);
    } else {
      c.fillText(options.label || "DRM_V4", rx + 10, my + 10);
      c.fillText("ACTIVE", rx + 10, my + 17);
    }

    // Proprietary cartel brand stencil on top
    c.fillStyle = '#64748b';
    c.font = '7px monospace';
    c.fillText(options.cartelName || "MS_CLOUD", rx + 6, ry + 7);

    // If burning, draw jagged cracks & sparks
    if (options.burning) {
      c.fillStyle = '#fef08a';
      c.fillRect(rx + rw * 0.4, ry + rh * 0.3, 3, 3);
      c.fillRect(rx + rw * 0.7, ry + rh * 0.6, 2, 2);
    }

    c.restore();
  }

  // Draws retro 16-bit dialog typewriter box
  function drawPixelDialogBox(c, speaker, message, charProgress) {
    const bx = 30;
    const by = VH - 64;
    const bw = VW - 60;
    const bh = 52;

    // Dark slate pixel panel with stepped bevel
    c.fillStyle = '#070c14';
    c.fillRect(bx, by, bw, bh);

    // Outer 2px black border
    c.fillStyle = '#000000';
    c.fillRect(bx - 2, by - 2, bw + 4, 2);
    c.fillRect(bx - 2, by + bh, bw + 4, 2);
    c.fillRect(bx - 2, by, 2, bh);
    c.fillRect(bx + bw, by, 2, bh);

    // Inner 2px highlight (cyan / green)
    c.fillStyle = '#22c55e';
    c.fillRect(bx, by, bw, 2);
    c.fillRect(bx, by, 2, bh);
    c.fillStyle = '#0f291e';
    c.fillRect(bx, by + bh - 2, bw, 2);
    c.fillRect(bx + bw - 2, by, 2, bh);

    // Speaker Name Tag Box
    c.fillStyle = '#14532d';
    c.fillRect(bx + 12, by - 10, speaker.length * 8 + 14, 12);
    c.fillStyle = '#000000';
    c.fillRect(bx + 10, by - 10, 2, 12);
    c.fillRect(bx + 12 + speaker.length * 8 + 14, by - 10, 2, 12);
    c.fillRect(bx + 12, by - 12, speaker.length * 8 + 14, 2);

    c.fillStyle = '#86efac';
    c.font = '8px "Press Start 2P", monospace';
    c.fillText(speaker, bx + 16, by - 2);

    // Dialogue message with typewriter slicing
    const visibleText = message.substring(0, Math.floor(charProgress));
    c.fillStyle = '#f8fafc';
    c.font = '9px "Silkscreen", "Press Start 2P", monospace';

    // Word wrap across max 2 lines
    const words = visibleText.split(' ');
    let line1 = '';
    let line2 = '';
    for (let w of words) {
      if ((line1 + w).length < 46 && line2 === '') {
        line1 += (line1 ? ' ' : '') + w;
      } else {
        line2 += (line2 ? ' ' : '') + w;
      }
    }

    c.fillText(line1, bx + 16, by + 18);
    if (line2) {
      c.fillText(line2, bx + 16, by + 34);
    }

    // Blinking prompt arrow ▼
    if (Math.floor(Date.now() / 300) % 2 === 0) {
      c.fillStyle = '#facc15';
      c.fillText('▼', bx + bw - 18, by + bh - 10);
    }
  }

  // --- CUTSCENE 1: TUX BURNING THE PROPRIETARY SERVERS ---
  function renderBurningServers(time, frame) {
    // 0.0s - 3.5s : Entering server room
    // 3.5s - 6.0s : Dialogue: "Your license has expired..."
    // 6.0s - 11.0s: Flamethrower ignites! Torrent of pixel fire across racks
    // 11.0s - 14.5s: Explosion bursts, BSODs, racks incinerating
    // 14.5s - 18.0s: Thumbs up, title card victory!

    // Background: Server Room Floor & Wall
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, VW, VH);

    // Dark brick grid wall
    ctx.fillStyle = '#0a0f18';
    ctx.fillRect(0, 0, VW, VH * 0.7);
    ctx.fillStyle = '#0f172a';
    for (let y = 10; y < VH * 0.7; y += 18) {
      ctx.fillRect(0, y, VW, 1);
    }
    for (let x = 0; x < VW; x += 32) {
      ctx.fillRect(x, 0, 1, VH * 0.7);
    }

    // Caution Hazard Stripes on floor line
    const floorY = VH * 0.7;
    for (let hx = 0; hx < VW; hx += 16) {
      ctx.fillStyle = (hx / 16) % 2 === 0 ? '#ca8a04' : '#0f172a';
      ctx.fillRect(hx, floorY - 6, 16, 6);
    }

    // Tiled Computer Floor
    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, floorY, VW, VH - floorY);
    ctx.fillStyle = '#1e293b';
    for (let fy = floorY; fy < VH; fy += 24) {
      ctx.fillRect(0, fy, VW, 1);
    }
    for (let fx = 0; fx < VW; fx += 40) {
      ctx.fillRect(fx, floorY, 1, VH - floorY);
    }

    const isBurning = time >= 6.0;

    // Server Racks (Right side)
    const racks = [
      { x: 260, y: 30, w: 50, h: 155, label: "ORACLE_DB", cartel: "PROP_CORP" },
      { x: 320, y: 20, w: 56, h: 165, label: "DRM_V9", cartel: "BALLMER_AI" },
      { x: 386, y: 35, w: 52, h: 150, label: "TELEMETRY", cartel: "MONOPOLY" },
      { x: 448, y: 15, w: 45, h: 170, label: "EULA_CORE", cartel: "CLOSED_SRC" }
    ];

    racks.forEach((rk) => {
      drawPixelServerRack(ctx, rk.x, rk.y, rk.w, rk.h, {
        burning: isBurning,
        frame: frame,
        label: rk.label,
        cartelName: rk.cartel
      });
    });

    // Tux position
    let tuxX = 50;
    let tuxY = floorY - 2;
    let walking = false;
    let flamerFiring = false;
    let thumbsUp = false;

    if (time < 3.5) {
      // Tux walks into room
      tuxX = -20 + (time / 3.5) * 110;
      walking = true;
    } else {
      tuxX = 90;
    }

    if (time >= 6.0 && time < 13.5) {
      flamerFiring = true;
    }

    if (time >= 14.5) {
      thumbsUp = true;
    }

    // Draw Tux
    drawPixelTux(ctx, tuxX, tuxY, frame, {
      scale: 2.2,
      facing: 1,
      walking: walking,
      hasFlamer: true,
      thumbsUp: thumbsUp
    });

    // Flamethrower Fire Emitter
    if (flamerFiring) {
      const flamerMuzzleX = tuxX + 44;
      const flamerMuzzleY = tuxY - 14;
      spawnFireParticles(flamerMuzzleX, flamerMuzzleY, 5, 4, 1.4);

      // Play procedural flame audio if available
      if (window.soundEngine && window.soundEngine.startFlamethrower && !window.soundEngine.isFlaming) {
        window.soundEngine.startFlamethrower();
      }
    } else {
      if (window.soundEngine && window.soundEngine.stopFlamethrower && window.soundEngine.isFlaming) {
        window.soundEngine.stopFlamethrower();
      }
    }

    // Server explosions during burn phase
    if (time >= 7.5 && time < 14.0) {
      if (Math.random() < 0.25) {
        const targetRack = racks[Math.floor(Math.random() * racks.length)];
        const exX = targetRack.x + Math.random() * targetRack.w;
        const exY = targetRack.y + Math.random() * targetRack.h;
        spawnDebris(exX, exY, 8);
        spawnFireParticles(exX, exY, 8, 20, 0);
        if (window.soundEngine && window.soundEngine.playExplosionSmall && Math.random() < 0.3) {
          window.soundEngine.playExplosionSmall();
        }
      }
    }

    // Update & Draw Particles (Fire & Debris)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'fire') {
        const progress = p.life / p.maxLife;
        let color = '#fef08a'; // White-yellow
        if (progress > 0.3) color = '#f59e0b'; // Amber
        if (progress > 0.6) color = '#ef4444'; // Red
        if (progress > 0.85) color = '#475569'; // Smoke gray

        ctx.fillStyle = color;
        const size = Math.max(1, Math.round(p.size * (1 - progress * 0.4)));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      } else if (p.type === 'debris') {
        p.vy += 0.15; // Gravity
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    // Dialogue phases
    if (time >= 3.5 && time < 6.0) {
      const progress = (time - 3.5) * 26;
      drawPixelDialogBox(ctx, "TUX", "YOUR LICENSE HAS EXPIRED, PROPRIETARY SCUM.", progress);
    } else if (time >= 6.5 && time < 10.5) {
      const progress = (time - 6.5) * 24;
      drawPixelDialogBox(ctx, "CARTEL MAINFRAME", "ERROR 403! GPL VIOLATION DETECTED! CORE OVERHEATING!", progress);
    } else if (time >= 10.5 && time < 14.5) {
      const progress = (time - 10.5) * 28;
      drawPixelDialogBox(ctx, "TUX", "APT-GET PURGE --FORCE. MAY THE SOURCE BE WITH YOU.", progress);
    }

    // Final Title Card
    if (time >= 14.5) {
      // Letterbox dark banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 40, VW, 60);

      ctx.fillStyle = '#22c55e';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("SERVERS PURGED. ROOT ACQUIRED.", VW / 2, 68);

      ctx.fillStyle = '#facc15';
      ctx.font = '8px "Silkscreen", "Press Start 2P", monospace';
      ctx.fillText("* THE PROPRIETARY CARTEL HAS FALLEN *", VW / 2, 86);
      ctx.textAlign = 'left';
    }
  }

  // --- CUTSCENE 2: ORBITAL DROP POD ASSAULT ---
  function renderOrbitalDrop(time, frame) {
    // 0.0s - 3.5s : Space Destroyer in orbit
    // 3.5s - 6.5s : Tux Astartes enters pod, launch initiated
    // 6.5s - 10.0s: Hypersonic atmospheric entry with fire trail
    // 10.0s - 14.0s: Surface crash crater & seismic smoke
    // 14.0s - 17.5s: Pod hatch blows open, Tux steps out ready for war!

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, VW, VH);

    if (time < 9.5) {
      // Space / Atmospheric Horizon
      // Draw Stars
      ctx.fillStyle = '#ffffff';
      stars.forEach((s) => {
        const twinkle = Math.sin(frame * 0.1 + s.twinkle) > 0.3;
        if (twinkle) {
          ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
        }
      });

      // Curvature of the Cyber-Planet below
      const planetY = VH * 0.72;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(VW / 2, planetY + 360, 420, Math.PI, 0, false);
      ctx.fill();

      // Atmospheric glowing rim
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (time < 6.5) {
        // Super Destroyer Starship in Orbit
        const shipX = VW / 2 - 110;
        const shipY = 45;

        // Ship hull (grey & charcoal)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(shipX, shipY, 220, 36);
        ctx.fillRect(shipX + 40, shipY - 14, 140, 14); // Bridge tower
        ctx.fillRect(shipX + 80, shipY - 22, 60, 8);  // Comms array

        // Bevel outlines
        ctx.fillStyle = '#475569';
        ctx.fillRect(shipX, shipY, 220, 2);
        ctx.fillRect(shipX + 40, shipY - 14, 140, 2);

        // Yellow tactical markings & ship name
        ctx.fillStyle = '#facc15';
        ctx.fillRect(shipX + 20, shipY + 12, 18, 4);
        ctx.fillRect(shipX + 180, shipY + 12, 18, 4);
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText("SES PROP-KILLER", shipX + 56, shipY + 18);

        // Blue Ion Thrusters glowing
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(shipX - 12, shipY + 8, 12, 8);
        ctx.fillRect(shipX - 12, shipY + 20, 12, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(shipX - 6, shipY + 10, 6, 4);
        ctx.fillRect(shipX - 6, shipY + 22, 6, 4);

        // Drop Pod Deployment from bottom bay
        if (time >= 4.0) {
          const podY = shipY + 36 + (time - 4.0) * 22;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(VW / 2 - 12, podY, 24, 32);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(VW / 2 - 8, podY + 4, 16, 6);
          // Launch sparks
          spawnDebris(VW / 2, podY, 2);
        }
      } else {
        // Hypersonic Atmospheric Entry (Time 6.5s - 9.5s)
        const podProgress = (time - 6.5) / 3.0;
        const podX = 60 + podProgress * (VW - 120);
        const podY = 30 + podProgress * 150;

        // Fiery Re-entry Trail
        spawnFireParticles(podX - 20, podY - 15, 6, 8, -1.5);

        // Drawing Drop Pod Streaking Down
        ctx.save();
        ctx.translate(podX, podY);
        ctx.rotate(0.55);

        // Fiery shock cone
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-18, -10, 36, 20);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-24, -14, 48, 28);

        // Pod Chassis
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, -8, 24, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.restore();
      }
    } else {
      // Ground Level Surface Impact (Time 9.5s - 17.5s)
      // Background: Proprietary Server Complex ruins
      ctx.fillStyle = '#080d16';
      ctx.fillRect(0, 0, VW, VH);

      // Distant server towers
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 20, 50, 160);
      ctx.fillRect(110, 45, 60, 135);
      ctx.fillRect(360, 30, 70, 150);

      // Ground floor
      const groundY = VH * 0.72;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, groundY, VW, VH - groundY);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, groundY, VW, 3);

      const podLandingX = VW / 2;
      const podLandingY = groundY - 18;

      // Crater & Debris
      ctx.fillStyle = '#030712';
      ctx.fillRect(podLandingX - 50, groundY - 4, 100, 14);

      // Initial impact blast wave
      if (time >= 9.5 && time < 10.5) {
        const shockRadius = (time - 9.5) * 180;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(podLandingX, groundY, shockRadius, Math.PI, 0, false);
        ctx.stroke();

        spawnDebris(podLandingX, groundY, 12);
        spawnFireParticles(podLandingX, groundY, 8, 40, 0);

        if (window.soundEngine && window.soundEngine.playExplosionLarge && time < 9.7) {
          window.soundEngine.playExplosionLarge();
        }
      }

      // Drop Pod Chassis on Ground
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(podLandingX - 22, podLandingY - 42, 44, 58);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(podLandingX - 16, podLandingY - 36, 32, 14);

      // Pod Hatch Blow-off (at 12.0s)
      if (time >= 12.0) {
        // Hatch blown off to the right
        const hatchProgress = Math.min(1.0, (time - 12.0) * 2.0);
        const hatchX = podLandingX + 24 + hatchProgress * 40;
        const hatchY = podLandingY - 10 + hatchProgress * 15;
        ctx.fillStyle = '#334155';
        ctx.fillRect(hatchX, hatchY, 10, 34);

        // Tux steps forward out of the pod in full Astartes Armor!
        const stepProgress = Math.min(1.0, (time - 12.5) * 1.5);
        const tuxOutX = podLandingX - 10 + stepProgress * 34;
        const tuxOutY = groundY - 2;

        drawPixelTux(ctx, tuxOutX, tuxOutY, frame, {
          scale: 2.3,
          facing: 1,
          armored: true,
          walking: stepProgress < 1.0
        });

        // Twin shoulder bolter pods on Tux
        ctx.fillStyle = '#475569';
        ctx.fillRect(tuxOutX + 2, tuxOutY - 34, 10, 4);
        ctx.fillRect(tuxOutX - 14, tuxOutY - 34, 10, 4);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'fire') {
        const progress = p.life / p.maxLife;
        ctx.fillStyle = progress > 0.6 ? '#ef4444' : '#fef08a';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      } else if (p.type === 'debris') {
        p.vy += 0.15;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    // Dialogue Banner
    if (time >= 1.0 && time < 4.5) {
      const progress = (time - 1.0) * 26;
      drawPixelDialogBox(ctx, "SUPER DESTROYER", "INITIATING HELLDIVER DROP: DEPLOYING TO ENCRYPTED VAULT.", progress);
    } else if (time >= 13.0 && time < 16.5) {
      const progress = (time - 13.0) * 26;
      drawPixelDialogBox(ctx, "TUX ASTARTES", "CERAMITE SHIELD ACTIVE. READY TO DISTRIBUTE FREEDOM.", progress);
    }

    // Title Card
    if (time >= 15.0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 36, VW, 52);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("TACTICAL DROP CONFIRMED", VW / 2, 60);

      ctx.fillStyle = '#86efac';
      ctx.font = '8px "Silkscreen", "Press Start 2P", monospace';
      ctx.fillText("[ PURGE INITIATED // NO RETREAT ]", VW / 2, 76);
      ctx.textAlign = 'left';
    }
  }

  // --- CUTSCENE 3: VICTORY & LIBERATION OF OPEN SOURCE ---
  function renderVictoryLiberation(time, frame) {
    // 0.0s - 4.0s : 16-bit sunrise over the smoldering Cartel ruins
    // 4.0s - 8.0s : Tux plants the Linux Penguin Flag atop the central server monolith
    // 8.0s - 12.0s: Flag flutters, cheering penguins gather
    // 12.0s - 17.0s: 8-bit fireworks in sky, "SYSTEM LIBERATED" banner

    // 16-Bit Pastel Sunrise Sky Stripes
    const skyBands = [
      '#1e1b4b', '#312e81', '#4338ca', '#6366f1',
      '#7c3aed', '#c026d3', '#db2777', '#f43f5e',
      '#fb923c', '#fde047'
    ];
    const bandHeight = Math.ceil((VH * 0.75) / skyBands.length);
    skyBands.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, idx * bandHeight, VW, bandHeight);
    });

    // Rising Golden Sun
    const sunY = Math.max(40, 110 - (time / 16.0) * 50);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(VW / 2, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain & fallen corporate tower silhouettes
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, VH * 0.75);
    ctx.lineTo(80, 110);
    ctx.lineTo(160, 140);
    ctx.lineTo(240, 90);
    ctx.lineTo(340, 130);
    ctx.lineTo(420, 100);
    ctx.lineTo(VW, VH * 0.75);
    ctx.closePath();
    ctx.fill();

    // Defeated Cartel Monolith Tower (tilted & smoking)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(VW / 2 - 40, VH * 0.52, 80, 80);
    ctx.fillStyle = '#020617';
    ctx.fillRect(VW / 2 - 34, VH * 0.55, 68, 70);

    // Ground line
    const groundY = VH * 0.75;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, groundY, VW, VH - groundY);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, groundY, VW, 3); // Green grass of freedom

    // Flagpole & Linux Penguin Flag
    const poleX = VW / 2 + 10;
    const poleBaseY = VH * 0.52;
    const poleTopY = poleBaseY - 60;

    // Flagpole
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(poleX, poleTopY, 3, 60);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(poleX - 1, poleTopY - 3, 5, 3); // Golden finial

    // Fluttering Linux Penguin Flag (animates with wave function)
    const wave1 = Math.sin(frame * 0.2) * 3;
    const wave2 = Math.cos(frame * 0.25) * 4;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(poleX + 3, poleTopY);
    ctx.quadraticCurveTo(poleX + 22, poleTopY + wave1, poleX + 44, poleTopY + wave2);
    ctx.lineTo(poleX + 44, poleTopY + 28 + wave2);
    ctx.quadraticCurveTo(poleX + 22, poleTopY + 28 + wave1, poleX + 3, poleTopY + 28);
    ctx.closePath();
    ctx.fill();

    // Yellow Tux beak/feet crest inside flag
    ctx.fillStyle = '#facc15';
    ctx.fillRect(poleX + 16, poleTopY + 10 + wave1, 10, 8);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(poleX + 18, poleTopY + 8 + wave1, 6, 8);

    // Tux standing beside flag with arm up in victory
    drawPixelTux(ctx, poleX - 22, poleBaseY, frame, {
      scale: 2.2,
      facing: 1,
      armUp: true,
      thumbsUp: time >= 8.0
    });

    // Small open-source penguins gathering below
    if (time >= 6.0) {
      const penProgress = Math.min(1.0, (time - 6.0) * 0.4);
      const cheeringCount = Math.floor(penProgress * 8);
      for (let p = 0; p < cheeringCount; p++) {
        const px = 40 + p * 48;
        const py = groundY;
        drawPixelTux(ctx, px, py, frame + p * 5, {
          scale: 1.4,
          facing: px < VW / 2 ? 1 : -1,
          walking: false,
          armUp: Math.sin(frame * 0.3 + p) > 0
        });
      }
    }

    // 8-Bit Fireworks Launching in Sky
    if (time >= 7.0 && Math.random() < 0.12) {
      const fxX = 60 + Math.random() * (VW - 120);
      const fxY = 30 + Math.random() * 80;
      const colors = ['#22c55e', '#38bdf8', '#facc15', '#f43f5e', '#a855f7'];
      spawnFireworks(fxX, fxY, colors[Math.floor(Math.random() * colors.length)]);

      if (window.soundEngine && window.soundEngine.playLevelUp && Math.random() < 0.4) {
        window.soundEngine.playLevelUp();
      }
    }

    // Update fireworks particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // Gentle gravity

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    // Dialogue
    if (time >= 2.0 && time < 6.5) {
      const progress = (time - 2.0) * 26;
      drawPixelDialogBox(ctx, "TUX", "THE MONOPOLY HAS BEEN PURGED. KERNEL 6.X PREVAILS.", progress);
    } else if (time >= 7.0 && time < 12.0) {
      const progress = (time - 7.0) * 26;
      drawPixelDialogBox(ctx, "LINUX REBELS", "ALL CODE IS OPEN SOURCE! FREEDOM UNDER GPLv3!", progress);
    }

    // Final Victory Title Banner
    if (time >= 10.0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(0, 26, VW, 56);

      ctx.fillStyle = '#facc15';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("SYSTEM LIBERATED", VW / 2, 50);

      ctx.fillStyle = '#86efac';
      ctx.font = '8px "Silkscreen", "Press Start 2P", monospace';
      ctx.fillText("* THE GALAXY HAS BEEN RESTORED TO ROOT *", VW / 2, 68);
      ctx.textAlign = 'left';
    }
  }

  // --- ENGINE CONTROLLER ---
  function updateAndRender() {
    if (!activeCutscene) return;

    const now = performance.now();
    const elapsedSec = (now - startTime) / 1000.0;
    const frame = Math.floor(elapsedSec * 60);

    // Clear low-res canvas
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VW, VH);

    let maxDuration = 18.0;

    switch (activeCutscene) {
      case 'burning_servers':
        maxDuration = 18.0;
        renderBurningServers(elapsedSec, frame);
        break;
      case 'orbital_drop':
        maxDuration = 17.5;
        renderOrbitalDrop(elapsedSec, frame);
        break;
      case 'victory_liberation':
        maxDuration = 18.0;
        renderVictoryLiberation(elapsedSec, frame);
        break;
      default:
        console.warn("Unknown cutscene:", activeCutscene);
        stopCutscene();
        return;
    }

    if (elapsedSec >= maxDuration) {
      stopCutscene();
      return;
    }

    animFrameId = requestAnimationFrame(updateAndRender);
  }

  function playCutscene(sceneName, onComplete) {
    if (!canvasEl) {
      canvasEl = document.getElementById('cutsceneCanvas');
      overlayEl = document.getElementById('cutsceneOverlay');
      if (canvasEl) {
        canvasEl.width = VW;
        canvasEl.height = VH;
        ctx = canvasEl.getContext('2d');
        ctx.imageSmoothingEnabled = false;
      }
    }

    if (!canvasEl || !ctx) {
      console.warn("Cutscene canvas element not found!");
      if (onComplete) onComplete();
      return;
    }

    activeCutscene = sceneName;
    startTime = performance.now();
    onCompleteCallback = onComplete;
    particles = [];
    initStars();

    if (overlayEl) {
      overlayEl.style.display = 'flex';
    }

    // Stop flamethrower loop sound if active
    if (window.soundEngine && window.soundEngine.stopFlamethrower) {
      window.soundEngine.stopFlamethrower();
    }

    // Keyboard listener to skip cutscene with Space or Escape
    window.addEventListener('keydown', handleCutsceneKey);

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(updateAndRender);
  }

  function handleCutsceneKey(e) {
    if (e.code === 'Space' || e.code === 'Escape' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      stopCutscene();
    }
  }

  function stopCutscene() {
    if (!activeCutscene) return;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    window.removeEventListener('keydown', handleCutsceneKey);

    // Stop sound loops
    if (window.soundEngine && window.soundEngine.stopFlamethrower) {
      window.soundEngine.stopFlamethrower();
    }

    activeCutscene = null;
    particles = [];

    if (overlayEl) {
      overlayEl.style.display = 'none';
    }

    const cb = onCompleteCallback;
    onCompleteCallback = null;
    if (cb && typeof cb === 'function') {
      cb();
    }
  }

  function isCutsceneActive() {
    return activeCutscene !== null;
  }

  // Public API
  window.PixelCutscenes = {
    play: playCutscene,
    stop: stopCutscene,
    isActive: isCutsceneActive,
    scenes: ['burning_servers', 'orbital_drop', 'victory_liberation']
  };

  // Helper shortcut
  window.playCutscene = playCutscene;
})();
