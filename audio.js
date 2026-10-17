// Procedural Audio Engine for Tux: Root Purge
// Uses Web Audio API to synthesize all sound effects and an adrenaline-pumping synth-metal BGM!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.flameNoiseNode = null;
    this.flameFilter = null;
    this.flameGain = null;
    this.isFlaming = false;
    this.musicPlaying = false;
    this.musicStep = 0;
    this.musicTimer = null;
    this.bpm = 142; // Fast, driving adrenaline tempo
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Dynamic limiter compressor to allow powerful volume boost without distortion
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.25; // High-volume punchy master
      this.masterGain.connect(this.compressor);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.05; // Boosted SFX
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.8; // Boosted Synth-Metal BGM
      this.musicGain.connect(this.masterGain);

      this.initFlamethrowerSynth();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API could not be initialized:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getSharedNoiseBuffer() {
    if (this.sharedNoiseBuffer && this.sharedNoiseBuffer.sampleRate === this.ctx.sampleRate) {
      return this.sharedNoiseBuffer;
    }
    if (!this.ctx) return null;
    try {
      const size = Math.floor(this.ctx.sampleRate * 2.0); // 2.0s pre-cached noise buffer
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const d = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) {
        d[i] = Math.random() * 2 - 1;
      }
      return this.sharedNoiseBuffer;
    } catch (e) {
      return null;
    }
  }

  initFlamethrowerSynth() {
    if (!this.ctx) return;
    // Buffer for looped noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      // Pink-ish noise
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    this.flameNoiseNode = this.ctx.createBufferSource();
    this.flameNoiseNode.buffer = noiseBuffer;
    this.flameNoiseNode.loop = true;

    this.flameFilter = this.ctx.createBiquadFilter();
    this.flameFilter.type = 'bandpass';
    this.flameFilter.frequency.value = 650;
    this.flameFilter.Q.value = 2.2;

    this.flameGain = this.ctx.createGain();
    this.flameGain.gain.value = 0.0001;

    this.flameNoiseNode.connect(this.flameFilter);
    this.flameFilter.connect(this.flameGain);
    this.flameGain.connect(this.sfxGain);

    this.flameNoiseNode.start(0);
  }

  setFlamethrower(active, intensity = 1.0) {
    if (!this.ctx || !this.flameGain) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.flameGain.gain.cancelScheduledValues(now);
      this.flameGain.gain.linearRampToValueAtTime(0.65 * intensity, now + 0.05);
      this.flameFilter.frequency.cancelScheduledValues(now);
      this.flameFilter.frequency.linearRampToValueAtTime(750 + Math.random() * 250, now + 0.05);
    } else {
      this.flameGain.gain.cancelScheduledValues(now);
      this.flameGain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
    }
    this.isFlaming = active;
  }

  // Sound Effects

  playSlide() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playKill9Nova() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Sub bass drop + explosive blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);

    // High crunch distortion burst
    this.playNoiseBurst(0.5, 0.4, 1800, 150);
  }

  playNoiseBurst(duration, volume, startFreq, endFreq) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const buf = this.getSharedNoiseBuffer();
    if (!buf) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.max(20, startFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  playEnemyBurnSizzle() {
    if (!this.ctx) return;
    // Quick crispy sizzle
    if (Math.random() > 0.4) return; // Don't overwhelm audio channels
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400 + Math.random() * 600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playShotgun() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
    this.playNoiseBurst(0.22, 0.45, 1400, 200);
  }

  playMinigunShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.05);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
    this.playNoiseBurst(0.04, 0.14, 2800, 600);
  }

  playRocketLaunch() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.26);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
    this.playNoiseBurst(0.3, 0.35, 800, 2200);
  }

  playRocketExplode() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
    this.playNoiseBurst(0.45, 0.45, 2000, 80);
  }

  playThunderSlam() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.65);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.75);
    this.playNoiseBurst(0.65, 0.55, 3200, 90);
  }

  playHeavyFootstep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playProprietaryDestroyed(type = 'normal') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Crunch + glitched error screech
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const baseFreq = type === 'boss' ? 180 : 380 + Math.random() * 150;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + (type === 'boss' ? 0.7 : 0.22));

    gain.gain.setValueAtTime(type === 'boss' ? 0.6 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'boss' ? 0.75 : 0.25));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (type === 'boss' ? 0.8 : 0.26));

    this.playNoiseBurst(type === 'boss' ? 0.8 : 0.18, 0.3, 1200, 100);
  }

  playPickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.15); // C6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playStratagemBeep(correct = true) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (correct) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    }
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playStratagemCall() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Stratagem beacon deployed radio transmission
    const notes = [659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.2, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.05 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.09);
    });
  }

  playRoomLockdown() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Ominous mechanical lockdown siren / laser wall hum
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
    this.playNoiseBurst(0.25, 0.3, 1400, 200);
  }

  playRoomClear() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Triumphant chord
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + 0.5);
    });
  }

  playObjectiveComplete() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.28, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + 0.65);
    });
  }

  playPortalWarp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Ascending cosmic dimensional warp whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.8);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.9);
    this.playNoiseBurst(0.8, 0.35, 600, 3200);
  }

  playChestOpen() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Chest creak + sparkle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
    this.playPickup();
  }

  playOrbitalExplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Earth-shattering 500kg orbital bomb
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 1.2);
    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.35);

    // Multi-layered crunch & crackle
    this.playNoiseBurst(1.0, 0.6, 2500, 60);
  }

  playBolterShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Heavy mechanical thump + rocket report
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);

    this.playNoiseBurst(0.1, 0.35, 1800, 300);
  }

  playRailgunShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Electric hyper beam discharge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
    this.playNoiseBurst(0.18, 0.25, 4000, 800);
  }

  playPowerArmorEquip() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Hydraulic hiss + Power armor lock-in chime
    const chords = [196, 261.63, 329.63, 392, 523.25];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, now);
      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + 0.85);
    });
    this.playNoiseBurst(0.6, 0.3, 1600, 200);
  }

  playSentryDeploy() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Heavy metal pod impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
    this.playNoiseBurst(0.25, 0.3, 2000, 200);
  }

  playLevelUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chords = [440, 554.37, 659.25, 880];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + 0.65);
    });
  }

  playRootModeEnter() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Power siren + distortion sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  playRadioTransmission() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Squelch burst
    this.playNoiseBurst(0.08, 0.25, 3200, 1200);

    // Staccato vocoder-style digital blips
    const freqs = [350, 480, 290, 520, 390];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + 0.05 + i * 0.04);
      gain.gain.setValueAtTime(0.18, now + 0.05 + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + (i + 1) * 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + 0.05 + i * 0.04);
      osc.stop(now + 0.05 + (i + 1) * 0.04);
    });
  }

  playTeslaArc() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
    this.playNoiseBurst(0.1, 0.3, 3000, 600);
  }

  playKatanaSlash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
    this.playNoiseBurst(0.12, 0.32, 2800, 800);
  }

  playGrenadeLaunch() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
    this.playNoiseBurst(0.15, 0.35, 1200, 180);
  }

  playLaserBeam() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playNailgun() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
    this.playNoiseBurst(0.06, 0.4, 3800, 800);
  }

  playAmbushAlarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Klaxon siren
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.22;
      osc.frequency.setValueAtTime(650, t);
      osc.frequency.linearRampToValueAtTime(980, t + 0.1);
      osc.frequency.linearRampToValueAtTime(650, t + 0.2);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.21);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  }

  // --- TACTICAL MILITARY RADIO SQUELCH & VOCODER FORMANT ---
  playRadioStatic(duration = 0.14) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(duration, 0.22, 3500, 1200);
  }

  playRobotVocoderChime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Dual-carrier ring modulation effect (authentic robot vocoder blip)
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    carrier.type = 'square';
    carrier.frequency.setValueAtTime(420, now);
    carrier.frequency.setValueAtTime(360, now + 0.05);
    carrier.frequency.setValueAtTime(540, now + 0.10);

    modulator.type = 'sawtooth';
    modulator.frequency.setValueAtTime(85, now);

    modGain.gain.setValueAtTime(250, now);
    modulator.connect(carrier.frequency);

    masterGain.gain.setValueAtTime(0.24, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    carrier.connect(masterGain);
    masterGain.connect(this.sfxGain);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 0.2);
    modulator.stop(now + 0.2);
  }

  playLibertyRadioSquelch() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Military radio burst: bandpass white noise + tactical squelch beep
    const buf = this.getSharedNoiseBuffer();
    if (buf) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.08);
    }

    // High command dual tactical chirp
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now + 0.02);
    osc.frequency.setValueAtTime(1320, now + 0.05);
    oscGain.gain.setValueAtTime(0.18, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now + 0.02);
    osc.stop(now + 0.11);
  }

  playCorporateErrorBeep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(160, now + 0.06);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  speakRobot(text, speaker = 'SUPER DESTROYER', customPitch, customRate) {
    const spkUpper = (speaker || '').toUpperCase();
    const isHighCommand = /SUPER DESTROYER|HELLDIVER|HIGH COMMAND|DEMOCRACY OFFICER|CENTRAL COMMAND/i.test(spkUpper);
    const isTuxSide = isHighCommand || /TUX|EAGLE|REBEL|HACKER|ALLIED|COMMUNITY/i.test(spkUpper);
    const isFemaleEnemy = /APPLE|WARDEN|EULA|CARTEL|MAINFRAME|OUTPOST ALARM|PROPRIETARY SEC|DRM CORE|CLOUD MONOPOLY|CLOSED-SOURCE|SIRI|CORTANA|AI OVERMIND/i.test(spkUpper);

    if (isHighCommand || isTuxSide) {
      this.playLibertyRadioSquelch();
    } else if (isFemaleEnemy) {
      this.playCorporateErrorBeep();
    } else {
      this.playRadioStatic(0.08);
      this.playRobotVocoderChime();
    }

    // Asynchronous non-blocking dispatch: NEVER blocks 60 FPS gameplay!
    setTimeout(() => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const now = performance.now();
      if (window._lastSpeechBarkTime && now - window._lastSpeechBarkTime < 850) return;
      window._lastSpeechBarkTime = now;

      try {
        const utter = new SpeechSynthesisUtterance(text);

        if (isHighCommand) {
          // John Helldiver / High Command: Deep, booming, authoritative military liberty cadence (MALE)
          utter.pitch = customPitch !== undefined ? customPitch : 0.65;
          utter.rate = customRate !== undefined ? customRate : 1.05;
          utter.volume = 1.0;
        } else if (isTuxSide) {
          // Tux / Allied resistance: Resolute, heroic, battle-hardened (MALE)
          utter.pitch = customPitch !== undefined ? customPitch : 0.88;
          utter.rate = customRate !== undefined ? customRate : 1.10;
          utter.volume = 0.95;
        } else if (isFemaleEnemy) {
          // Cold, sterile, menacing corporate female DRM voice (FEMALE)
          utter.pitch = customPitch !== undefined ? customPitch : 1.35;
          utter.rate = customRate !== undefined ? customRate : 1.16;
          utter.volume = 0.90;
        } else {
          // Corporate male tyrant (Ballmer-bot, Patent Troll Sovereign, etc.)
          utter.pitch = customPitch !== undefined ? customPitch : 0.78;
          utter.rate = customRate !== undefined ? customRate : 1.22;
          utter.volume = 0.90;
        }

        if (!window._cachedVoicesList || window._cachedVoicesList.length === 0) {
          window._cachedVoicesList = window.speechSynthesis.getVoices() || [];
        }
        const voices = window._cachedVoicesList;

        if (voices && voices.length > 0) {
          let chosen = null;
          if (isHighCommand || isTuxSide) {
            // Tux / High Command: Always prioritize deep resonant MALE voices
            chosen = voices.find(v => 
              v.name.toLowerCase().includes('daniel') ||
              v.name.toLowerCase().includes('alex') ||
              v.name.toLowerCase().includes('fred') ||
              v.name.toLowerCase().includes('oliver') ||
              v.name.toLowerCase().includes('david') ||
              v.name.toLowerCase().includes('mark') ||
              v.name.toLowerCase().includes('george') ||
              (v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female') && v.lang && v.lang.startsWith('en'))
            ) || voices.find(v => v.lang && v.lang.startsWith('en'));
          } else if (isFemaleEnemy) {
            // Enemy corporate AI: Always prioritize sterile FEMALE voices
            chosen = voices.find(v => 
              v.name.toLowerCase().includes('samantha') ||
              v.name.toLowerCase().includes('victoria') ||
              v.name.toLowerCase().includes('karen') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('serena') ||
              v.name.toLowerCase().includes('fiona') ||
              v.name.toLowerCase().includes('tessa') ||
              v.name.toLowerCase().includes('female')
            ) || voices.find(v => v.lang && v.lang.startsWith('en'));
          } else {
            // Male corporate tyrant / glitched voice
            chosen = voices.find(v => 
              v.name.toLowerCase().includes('zarvox') ||
              v.name.toLowerCase().includes('cellos') ||
              v.name.toLowerCase().includes('trinoids') ||
              v.name.toLowerCase().includes('ralph') ||
              v.name.toLowerCase().includes('male')
            ) || voices.find(v => v.lang && v.lang.startsWith('en'));
          }
          if (chosen) utter.voice = chosen;
        }

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        window.speechSynthesis.speak(utter);
      } catch (err) {
        // Silently catch so game loop is NEVER impacted
      }
    }, 0);
  }

  // --- NEW WEAPONS PROCEDURAL AUDIO: AUTOCANNON, QUASAR, ARC THROWER, PLASMA ---

  playAutocannonShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Heavy concussive explosion thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);

    // Mechanical bolt clank
    const clank = this.ctx.createOscillator();
    const clankGain = this.ctx.createGain();
    clank.type = 'triangle';
    clank.frequency.setValueAtTime(1100, now + 0.08);
    clank.frequency.setValueAtTime(450, now + 0.16);
    clankGain.gain.setValueAtTime(0.28, now + 0.08);
    clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    clank.connect(clankGain);
    clankGain.connect(this.sfxGain);
    clank.start(now + 0.08);
    clank.stop(now + 0.24);
  }

  playQuasarCharge() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.75);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.70);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.80);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.82);
  }

  playQuasarBlast() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Massive laser disintegration blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
    this.playNoiseBurst(0.4, 0.6, 2200, 300);
  }

  playArcThrowerDischarge() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(220, now + 0.04);
    osc.frequency.setValueAtTime(740, now + 0.08);
    osc.frequency.setValueAtTime(140, now + 0.14);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
    this.playNoiseBurst(0.18, 0.45, 3200, 800);
  }

  playPlasmaMortar() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.26);
    gain.gain.setValueAtTime(0.70, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.30);
  }

  // --- NEW WEAPONS & STRATAGEM PROCEDURAL AUDIO ---

  playSniperCharge() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playSniperShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // High-caliber supersonic crack + sub-bass kick
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
    this.playNoiseBurst(0.28, 0.6, 4200, 300);
  }

  playSawbladeLaunch() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSawbladeRicochet() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playSingularityVortex() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.3);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playSingularityImplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Inward suction -> explosive bass drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
    this.playNoiseBurst(0.5, 0.45, 1200, 60);
  }

  playAcidSplash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(0.18, 0.35, 2400, 450);
  }

  playDomeDeploy() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playShieldDeflect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.07);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playDroneLaser() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.05);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playRailcannonStrike() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Mach-20 tungsten penetrator sonic crack + nuclear seismic impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.7);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.8);
    this.playNoiseBurst(0.65, 0.6, 5000, 50);
  }

  playNapalmDrop() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(0.9, 0.45, 1800, 250);
  }

  // --- REAL-TIME PROCEDURAL SYNTH-METAL / CYBERPUNK MUSIC LOOP ---
  startMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;
    this.musicStep = 0;

    const secondsPerBeat = 60.0 / this.bpm;
    const sixteenth = secondsPerBeat / 4;

    const playStep = () => {
      if (!this.musicPlaying) return;
      this.scheduleMusicBeat(this.musicStep, this.ctx.currentTime);
      this.musicStep = (this.musicStep + 1) % 64;
      this.musicTimer = setTimeout(playStep, sixteenth * 1000);
    };

    playStep();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusicBeat(step, time) {
    if (!this.ctx) return;

    // 1. Kick Drum (Steps 0, 4, 8, 12, 16, 20...) - Four-on-the-floor
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
      gain.gain.setValueAtTime(0.65, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.14);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.15);
    }

    // 2. Snare / Clang (Steps 4, 12, 20, 28...)
    if (step % 8 === 4) {
      this.playSynthSnare(time);
    }

    // 3. Hi-Hat on offbeats (Steps 2, 6, 10, 14...)
    if (step % 2 === 1) {
      this.playSynthHat(time, step % 4 === 3 ? 0.18 : 0.1);
    }

    // 4. Heavy Driving Bassline (D Minor: D1=36.7Hz, F1=43.6Hz, G1=49.0Hz, Bb1=58.3Hz, C2=65.4Hz)
    const bassNotes = [
      // Bar 1 & 2: D D D D F D G D
      36.7, 36.7, 36.7, 36.7,  43.65, 36.7, 49.0, 36.7,
      36.7, 36.7, 36.7, 36.7,  58.27, 49.0, 43.65, 36.7,
      // Bar 3 & 4: Bb Bb Bb Bb C C C C
      29.14, 29.14, 29.14, 29.14, 32.7, 32.7, 32.7, 32.7,
      36.7, 36.7, 36.7, 36.7,  43.65, 49.0, 58.27, 65.41
    ];
    const noteIdx = Math.floor(step / 2) % bassNotes.length;
    const freq = bassNotes[noteIdx];

    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(freq, time);

    bassFilter.type = 'lowpass';
    const filterCutoff = (step % 16 < 8) ? 800 : 1600;
    bassFilter.frequency.setValueAtTime(filterCutoff, time);
    bassFilter.Q.value = 4.5;

    bassGain.gain.setValueAtTime(0.35, time);
    bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.musicGain);

    bassOsc.start(time);
    bassOsc.stop(time + 0.16);

    // 5. Synth Lead Arpeggio / Riff (Every 16th note in bars 2 and 4)
    if (step >= 16) {
      const leadNotes = [146.8, 174.6, 220.0, 261.6, 293.7, 349.2, 440.0, 523.3];
      const leadFreq = leadNotes[(step * 3) % leadNotes.length];

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadFreq, time);

      leadGain.gain.setValueAtTime(0.07, time);
      leadGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGain);

      leadOsc.start(time);
      leadOsc.stop(time + 0.11);
    }
  }

  playSynthSnare(time) {
    if (!this.ctx) return;
    // Tone body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);
    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.linearRampToValueAtTime(0.01, time + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.1);

    // Noise snap (reusing cached buffer - eliminates GC hitching!)
    const buf = this.getSharedNoiseBuffer();
    if (buf) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.15);
    }
  }

  playSynthHat(time, vol = 0.15) {
    if (!this.ctx) return;
    const buf = this.getSharedNoiseBuffer();
    if (!buf) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }
}

window.soundEngine = new SoundEngine();
