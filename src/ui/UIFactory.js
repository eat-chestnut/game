import { ThemeTokens, UIFactoryDefaults, themeColor } from '../theme.js';

export class UIFactory {
  constructor(scene) {
    this.scene = scene;
  }

  createPanel(width, height, variant = 'panelStrong') {
    const colorHex = ThemeTokens.color[variant === 'panelStrong' ? 'panelStrong' : 'panel'];
    const rect = this.scene.add.rectangle(0, 0, width, height, themeColor(colorHex), 0.92);
    rect.setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.35);
    rect.setOrigin(0.5);
    rect.setDepth(10);
    return rect;
  }

  createButton(label, options = {}) {
    const width = options.width ?? 260;
    const height = options.height ?? 60;
    const variant = options.variant ?? 'primary';
    const color = variant === 'accent' ? ThemeTokens.color.accent : ThemeTokens.color.primary;
    const bg = this.scene.add.rectangle(0, 0, width, height, themeColor(color), 0.95)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      fontStyle: '600',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    const container = this.scene.add.container(0, 0, [bg, text]).setDepth(20);
    container.setSize(width, height);
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains, { cursor: 'pointer' });
    container.bg = bg;
    container.label = text;
    container.on('pointerover', () => {
      this.scene.tweens.add({ targets: container, scale: UIFactoryDefaults.hoverScale, duration: 140, ease: 'Sine.easeOut' });
    });
    container.on('pointerout', () => {
      this.scene.tweens.add({ targets: container, scale: 1, duration: 140, ease: 'Sine.easeOut' });
    });
    container.on('pointerdown', () => {
      this.scene.tweens.add({ targets: container, scale: UIFactoryDefaults.pressScale, duration: 60, ease: 'Sine.easeIn' });
    });
    container.on('pointerup', () => {
      this.scene.tweens.add({ targets: container, scale: UIFactoryDefaults.hoverScale, duration: 100, ease: 'Sine.easeOut' });
    });
    return container;
  }

  createLabel(text, style = {}) {
    return this.scene.add.text(0, 0, text, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: style.fontSize ?? '18px',
      fontWeight: style.fontWeight ?? '500',
      color: style.color ?? ThemeTokens.color.text
    }).setOrigin(0.5);
  }
}
