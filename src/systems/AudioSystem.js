import { SettingsState } from '../state/SettingsState.js';

export class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.bgmSource = null;
    this.unlocked = false;
    this.scene.input?.once('pointerdown', () => this.unlockAudio());
  }

  unlockAudio() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ensureContext();
    this.startBgm();
  }

  ensureContext() {
    if (!this.unlocked) return;
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = SettingsState.values.musicVolume;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = SettingsState.values.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  applySettings() {
    if (!this.ctx) return;
    if (this.musicGain) this.musicGain.gain.value = SettingsState.values.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = SettingsState.values.sfxVolume;
  }

  startBgm() {
    if (!this.unlocked) {
      this.scene.input?.once('pointerdown', () => this.startBgm());
      return;
    }
    this.ensureContext();
    this.applySettings();
    this.stopBgm();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = Math.sin(2 * Math.PI * 110 * t) * 0.2 + Math.sin(2 * Math.PI * 220 * t) * 0.1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start(0);
    this.bgmSource = source;
  }

  stopBgm() {
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    if (this.musicGain) this.musicGain.gain.value = SettingsState.values.musicVolume;
  }

  fadeOutBgm() {
    if (!this.musicGain) return;
    this.scene.tweens.addCounter({
      from: this.musicGain.gain.value,
      to: 0,
      duration: 800,
      onUpdate: tween => {
        this.musicGain.gain.value = tween.getValue();
      },
      onComplete: () => this.stopBgm()
    });
  }

  playShoot() {
    if (!this.unlocked) return;
    this.ensureContext();
    this.applySettings();
    this.triggerTone(620, 80);
  }

  playExplosion() {
    if (!this.unlocked) return;
    this.ensureContext();
    this.applySettings();
    this.triggerNoise(0.15);
  }

  playPickup() {
    if (!this.unlocked) return;
    this.ensureContext();
    this.applySettings();
    this.triggerTone(880, 120, 0.5);
  }

  triggerTone(freq, durationMs, gainScale = 1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'triangle';
    gain.gain.value = 0.25 * gainScale;
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);
    osc.stop(this.ctx.currentTime + durationMs / 1000);
  }

  triggerNoise(durationSec) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
