import { ThemeTokens, themeColor } from '../theme.js';
import { UIFactory } from '../ui/UIFactory.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.audio = new AudioSystem(this);
    this.buildBackground();
    this.uiFactory = new UIFactory(this);
    this.buildMenu();
  }

  buildBackground() {
    this.add.rectangle(360, 800, 720, 1600, themeColor(ThemeTokens.color.bg));
    const noise = this.add.tileSprite(360, 800, 720, 1600, 'noise');
    noise.setAlpha(0.15);
  }

  buildMenu() {
    const title = this.add.text(360, 420, 'AutoAim Waves', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '42px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    const subtitle = this.add.text(360, 480, '竖屏固定点射击
自动锁敌 · 局内升级 · 波次突围', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.textMuted,
      align: 'center'
    }).setOrigin(0.5);

    const buttons = [
      { label: '开始游戏', action: () => this.startGame(), variant: 'primary' },
      { label: '设置', action: () => this.showToast('设置暂未开放'), variant: 'accent' },
      { label: '商店', action: () => this.showToast('商店占位'), variant: 'primary' },
      { label: '退出', action: () => window.close(), variant: 'accent' }
    ];

    buttons.forEach((btn, idx) => {
      const button = this.uiFactory.createButton(btn.label, { variant: btn.variant, width: 320, height: 70 });
      button.setPosition(360, 620 + idx * 110);
      button.on('pointerup', () => btn.action());
    });
  }

  showToast(msg) {
    if (!this.toastText) {
      this.toastText = this.add.text(360, 1100, '', {
        fontFamily: ThemeTokens.typography.fontFamily,
        fontSize: '18px',
        color: ThemeTokens.color.text
      }).setOrigin(0.5);
    }
    this.toastText.setText(msg);
    this.tweens.add({ targets: this.toastText, alpha: 1, duration: 0 });
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1200, duration: 300 });
  }

  startGame() {
    this.scene.start('Game');
  }
}
