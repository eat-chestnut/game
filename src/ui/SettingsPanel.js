import { UIFactory } from './UIFactory.js';
import { ThemeTokens, themeColor } from '../theme.js';
import { SettingsState } from '../state/SettingsState.js';

export class SettingsPanel {
  constructor(scene, audioSystem) {
    this.scene = scene;
    this.audio = audioSystem;
    this.uiFactory = new UIFactory(scene);
    this.container = null;
    this.musicLabel = null;
    this.sfxLabel = null;
    this.build();
  }

  build() {
    const overlay = this.scene.add.rectangle(360, 800, 720, 1600, 0x000000, 0.6)
      .setInteractive()
      .setDepth(500)
      .setAlpha(0);
    const panel = this.scene.add.rectangle(360, 800, 560, 520, themeColor(ThemeTokens.color.panelStrong), 0.95)
      .setDepth(505)
      .setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.5);
    const title = this.scene.add.text(360, 560, '音量设置', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '30px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5).setDepth(510);

    const musicSection = this.buildSliderRow('BGM 音量', 700, value => this.adjustVolume('musicVolume', value));
    const sfxSection = this.buildSliderRow('SFX 音量', 860, value => this.adjustVolume('sfxVolume', value));

    const closeBtn = this.uiFactory.createButton('关闭', { width: 240, height: 64, variant: 'accent' });
    closeBtn.setPosition(360, 1020);
    closeBtn.on('pointerup', () => this.close());

    this.musicLabel = musicSection.label;
    this.sfxLabel = sfxSection.label;

    this.container = this.scene.add.container(0, 0, [overlay, panel, title, musicSection.container, sfxSection.container, closeBtn])
      .setDepth(600)
      .setVisible(false);

    overlay.on('pointerdown', () => this.close());
    this.refreshLabels();
  }

  buildSliderRow(title, y, onAdjust) {
    const label = this.scene.add.text(200, y, `${title}`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.text
    }).setOrigin(0, 0.5).setDepth(510);

    const valueLabel = this.scene.add.text(520, y, '0%', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.accent
    }).setOrigin(1, 0.5).setDepth(510);

    const minusBtn = this.uiFactory.createButton('-', { width: 60, height: 60, variant: 'primary' });
    minusBtn.setPosition(360 - 80, y);
    minusBtn.on('pointerup', () => onAdjust(-0.1));

    const plusBtn = this.uiFactory.createButton('+', { width: 60, height: 60, variant: 'primary' });
    plusBtn.setPosition(360 + 80, y);
    plusBtn.on('pointerup', () => onAdjust(0.1));

    const container = this.scene.add.container(0, 0, [label, valueLabel, minusBtn, plusBtn]);
    return { container, label: valueLabel };
  }

  adjustVolume(key, delta) {
    const current = SettingsState.values[key];
    SettingsState.set(key, current + delta);
    this.refreshLabels();
    this.audio?.applySettings();
  }

  refreshLabels() {
    if (this.musicLabel) {
      this.musicLabel.setText(`${Math.round(SettingsState.values.musicVolume * 100)}%`);
    }
    if (this.sfxLabel) {
      this.sfxLabel.setText(`${Math.round(SettingsState.values.sfxVolume * 100)}%`);
    }
  }

  open() {
    if (!this.container) return;
    this.refreshLabels();
    this.container.setVisible(true);
    const overlay = this.container.list[0];
    overlay.setAlpha(0);
    this.scene.tweens.add({ targets: overlay, alpha: 1, duration: 200, ease: 'Sine.easeOut' });
  }

  close() {
    if (!this.container) return;
    this.container.setVisible(false);
  }
}
