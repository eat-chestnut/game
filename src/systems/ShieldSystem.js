import { themeColor, ThemeTokens } from '../theme.js';

export class ShieldSystem {
  constructor(scene, skillConfig) {
    this.scene = scene;
    this.skillDef = skillConfig?.skills?.find(s => s.id === 'defense_shield');
    this.level = 0;
    this.layers = 0;
    this.maxLayers = 0;
    this.rechargeSec = 12;
    this.timer = 0;
    this.icons = [];
    this.container = scene.add.container(360, 1350).setDepth(90);
  }

  setLevel(level) {
    this.level = level;
    this.maxLayers = level;
    if (this.skillDef?.perLevel?.rechargeSec) {
      this.rechargeSec = this.skillDef.perLevel.rechargeSec;
    }
    this.layers = Math.min(Math.max(this.layers, 1), this.maxLayers) || this.maxLayers;
    this.refreshIcons();
  }

  update(delta) {
    if (!this.level || this.layers >= this.maxLayers) return;
    this.timer += delta;
    if (this.timer >= this.rechargeSec * 1000) {
      this.timer = 0;
      this.layers = Math.min(this.layers + 1, this.maxLayers);
      this.flashIcons();
    }
  }

  absorbHit() {
    if (this.layers <= 0) return false;
    this.layers -= 1;
    this.flashIcons(true);
    return true;
  }

  flashIcons(onHit = false) {
    this.refreshIcons();
    this.icons.forEach(icon => {
      this.scene.tweens.add({
        targets: icon,
        alpha: onHit ? 0.2 : 1,
        yoyo: true,
        repeat: 1,
        duration: 100
      });
    });
  }

  refreshIcons() {
    this.icons.forEach(icon => icon.destroy());
    this.icons = [];
    if (!this.level) return;
    const spacing = 36;
    const totalWidth = (this.maxLayers - 1) * spacing;
    for (let i = 0; i < this.maxLayers; i++) {
      const filled = i < this.layers;
      const icon = this.scene.add.rectangle(360 - totalWidth / 2 + i * spacing, 1350, 24, 24,
        filled ? themeColor(ThemeTokens.color.accent) : themeColor(ThemeTokens.color.panel));
      icon.setStrokeStyle(2, themeColor(ThemeTokens.color.primary), filled ? 0.9 : 0.4);
      icon.setDepth(95);
      this.icons.push(icon);
    }
  }
}
