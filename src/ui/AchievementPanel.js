import { ThemeTokens, themeColor } from '../theme.js';
import { SaveManager } from '../state/SaveManager.js';

export class AchievementPanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.container = this.scene.add.container(0, 0).setDepth(620).setVisible(false);
    this.overlay = this.scene.add.rectangle(360, 800, 720, 1600, 0x000000, 0.65)
      .setInteractive()
      .on('pointerdown', () => this.close());
    const panel = this.scene.add.rectangle(360, 800, 520, 560, themeColor(ThemeTokens.color.panelStrong), 0.95)
      .setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.5);
    const title = this.scene.add.text(360, 540, '成就', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '30px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    this.listText = this.scene.add.text(360, 820, '', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.text,
      align: 'left'
    }).setOrigin(0.5);
    this.container.add([this.overlay, panel, title, this.listText]);
  }

  open() {
    this.visible = true;
    this.container.setVisible(true);
    const ach = SaveManager.data.achievements;
    const lines = [
      `最高分：${SaveManager.data.highScore}`,
      `最高波次：${SaveManager.data.maxWave}`,
      `累计击杀：${ach?.totalKills ?? 0}`,
      `最高连杀：${ach?.highestCombo ?? 0}`,
      `AOE 触发：${ach?.aoeTriggers ?? 0}`
    ];
    this.listText.setText(lines.join('\n'));
  }

  close() {
    this.visible = false;
    this.container.setVisible(false);
  }
}
