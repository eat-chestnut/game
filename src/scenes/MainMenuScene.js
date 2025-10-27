import { ThemeTokens, themeColor } from '../theme.js';
import { UIFactory } from '../ui/UIFactory.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { AchievementPanel } from '../ui/AchievementPanel.js';
import { ShopPanel } from '../ui/ShopPanel.js';
import { t } from '../i18n/index.js';
import { GameState } from '../state/GameState.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.audio = new AudioSystem(this);
    this.buildBackground();
    this.uiFactory = new UIFactory(this);
    this.buildMenu();
    // v9.2: 键盘回退（Enter/Space 开始游戏）
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.settingsPanel = new SettingsPanel(this, this.audio, {
      onLocaleChange: () => this.refreshTexts(),
      onLowPowerChange: () => {}
    });
    this.achievementPanel = new AchievementPanel(this);
    this.shopPanel = new ShopPanel(this);
  }

  buildBackground() {
    this.add.rectangle(360, 800, 720, 1600, themeColor(ThemeTokens.color.bg));
    const noise = this.add.tileSprite(360, 800, 720, 1600, 'noise');
    noise.setAlpha(0.15);
  }

  buildMenu() {
    const locale = GameState.globals.locale;
    const title = this.add.text(360, 420, t('title', locale), {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '42px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    const subtitle = this.add.text(360, 480, t('subtitle', locale), {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.textMuted,
      align: 'center'
    }).setOrigin(0.5);
    this.textNodes = { title, subtitle };

    const buttons = [
      { label: t('start', locale), action: () => this.startGame(), variant: 'primary' },
      { label: t('settings', locale), action: () => this.openSettings(), variant: 'accent' },
      { label: t('achievements', locale), action: () => this.openAchievements(), variant: 'primary' },
      { label: t('shop', locale), action: () => this.openShop(), variant: 'primary' },
      { label: t('quit', locale), action: () => window.close(), variant: 'accent' }
    ];

    buttons.forEach((btn, idx) => {
      // 临时方案：直接创建简单按钮，不使用 UIFactory
      const width = 320;
      const height = 70;
      const color = btn.variant === 'accent' ? 0x00d1b2 : 0x6c5ce7;
      const bg = this.add.rectangle(360, 620 + idx * 110, width, height, color, 0.95)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(360, 620 + idx * 110, btn.label, {
        fontFamily: ThemeTokens.typography.fontFamily,
        fontSize: '20px',
        fontStyle: '600',
        color: ThemeTokens.color.text
      }).setOrigin(0.5);
      
      // 在背景上注册事件
      bg.on('pointerdown', () => {
        console.log(`[MainMenu] Button down: ${btn.label}`);
        bg.setScale(0.98);
      });
      bg.on('pointerup', () => {
        console.log(`[MainMenu] Button up: ${btn.label}`);
        bg.setScale(1);
        btn.action();
      });
      bg.on('pointerover', () => {
        console.log(`[MainMenu] Button over: ${btn.label}`);
        bg.setScale(1.03);
      });
      bg.on('pointerout', () => {
        console.log(`[MainMenu] Button out: ${btn.label}`);
        bg.setScale(1);
      });
      bg.on('pointermove', () => console.log(`[MainMenu] Button move: ${btn.label}`));
      
      bg.setDepth(50);
      text.setDepth(51);
      
      console.log(`[MainMenu] Created direct button ${btn.label}`);
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
    console.log('[MainMenu] startGame invoked');
    // v9.2: 强制取消暂停，避免异常状态阻塞
    if (GameState?.globals) {
      GameState.globals.isPaused = false;
    }
    // 防抖：避免重复快速触发
    if (this._starting) return;
    this._starting = true;
    this.time.delayedCall(10, () => {
      this.scene.start('Game');
    });
  }

  openSettings() {
    this.settingsPanel?.open();
  }

  openAchievements() {
    this.achievementPanel?.open();
  }
  
  openShop() {
    this.shopPanel?.open();
  }

  refreshTexts() {
    const locale = GameState.globals.locale;
    if (this.textNodes?.title) this.textNodes.title.setText(t('title', locale));
    if (this.textNodes?.subtitle) this.textNodes.subtitle.setText(t('subtitle', locale));
  }
}
