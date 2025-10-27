import { ThemeTokens } from '../theme.js';
import { UIFactory } from '../ui/UIFactory.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.finalScore = data?.score ?? 0;
    this.wave = data?.wave ?? 1;
    this.kills = data?.kills ?? 0;
    this.combo = data?.combo ?? 0;
    this.skills = data?.skills ?? {};
    this.dps = data?.dps ?? 0;
  }

  create() {
    this.add.rectangle(360, 800, 720, 1600, 0x000000, 0.6);
    const ui = new UIFactory(this);
    const panel = ui.createPanel(520, 480, 'panelStrong');
    const container = this.add.container(360, 800, [panel]).setDepth(100);
    const title = this.add.text(0, -160, '战斗结束', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '32px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    const scoreText = this.add.text(0, -60, `分数：${this.finalScore}\n波次：${this.wave}\n击杀：${this.kills}\n连杀：${this.combo}\nDPS≈${this.dps}`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      align: 'center',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    const skillLines = Object.entries(this.skills)
      .filter(([, level]) => level > 0)
      .map(([key, level]) => `${key}: Lv.${level}`)
      .slice(0, 6);
    const skillsText = this.add.text(0, 40, skillLines.length ? `技能：\n${skillLines.join('\n')}` : '技能：--', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '18px',
      align: 'center',
      color: ThemeTokens.color.textMuted
    }).setOrigin(0.5);
    const retryBtn = ui.createButton('再来一次', { width: 320, height: 70, variant: 'primary' });
    retryBtn.setPosition(0, 80);
    retryBtn.on('pointerup', () => this.restart());
    const homeBtn = ui.createButton('返回主菜单', { width: 320, height: 70, variant: 'accent' });
    homeBtn.setPosition(0, 180);
    homeBtn.on('pointerup', () => this.toMenu());
    container.add([title, scoreText, skillsText, retryBtn, homeBtn]);
    container.setAlpha(0);
    container.setY(820);
    this.tweens.add({ targets: container, alpha: 1, y: 800, duration: 220, ease: 'Sine.easeOut' });
  }

  restart() {
    this.scene.start('Game');
  }

  toMenu() {
    this.scene.start('MainMenu');
  }
}
