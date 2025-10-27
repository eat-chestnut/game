import { UIFactory } from '../ui/UIFactory.js';
import { ThemeTokens, themeColor } from '../theme.js';
import { SaveManager } from '../state/SaveManager.js';

/**
 * TutorialSystem - 新手引导系统
 * - 首次运行弹出四步引导（点击继续）
 * - 引导完成状态持久化
 * - 可在设置中重置
 */
export class TutorialSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.settings?.tutorial ?? {};
    this.steps = this.config.steps ?? [];
    this.currentStepIndex = 0;
    this.container = null;
    this.uiFactory = new UIFactory(scene);
    this.completed = SaveManager.data.tutorialCompleted ?? false;
  }

  shouldShow() {
    return !this.completed && this.steps.length > 0;
  }

  start() {
    if (!this.shouldShow()) return;
    
    this.currentStepIndex = 0;
    this.showStep(this.currentStepIndex);
  }

  showStep(index) {
    if (index < 0 || index >= this.steps.length) {
      this.complete();
      return;
    }
    
    const step = this.steps[index];
    
    // 创建半透明遮罩
    const overlay = this.scene.add.rectangle(360, 800, 720, 1600, 0x000000, 0.75);
    overlay.setDepth(500);
    overlay.setInteractive();
    
    // 创建引导面板
    const panel = this.uiFactory.createPanel(620, 480, 'panelStrong');
    panel.setDepth(510);
    
    const title = this.scene.add.text(0, -160, step.title || '提示', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '28px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);
    
    const body = this.scene.add.text(0, -40, step.body || '', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.textMuted,
      wordWrap: { width: 560 },
      align: 'center'
    }).setOrigin(0.5);
    
    const progress = this.scene.add.text(0, 120, `${index + 1}/${this.steps.length}`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '16px',
      color: ThemeTokens.color.accent
    }).setOrigin(0.5);
    
    const btnNext = this.uiFactory.createButton(
      index < this.steps.length - 1 ? '下一步' : '开始游戏',
      { width: 240, height: 56, variant: 'accent' }
    );
    btnNext.setPosition(0, 180);
    btnNext.on('pointerup', () => {
      this.nextStep();
    });
    
    const content = this.scene.add.container(360, 800, [panel, title, body, progress, btnNext]);
    content.setDepth(510);
    
    this.container = this.scene.add.container(0, 0, [overlay, content]);
  }

  nextStep() {
    this.closeCurrentStep();
    this.currentStepIndex += 1;
    
    if (this.currentStepIndex < this.steps.length) {
      this.showStep(this.currentStepIndex);
    } else {
      this.complete();
    }
  }

  closeCurrentStep() {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }

  complete() {
    this.closeCurrentStep();
    this.completed = true;
    SaveManager.save({ tutorialCompleted: true });
  }

  reset() {
    this.completed = false;
    this.currentStepIndex = 0;
    SaveManager.save({ tutorialCompleted: false });
  }
}
