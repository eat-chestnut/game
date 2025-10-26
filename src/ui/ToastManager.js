import { ThemeTokens, themeColor } from '../theme.js';

export class ToastManager {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(360, 180).setDepth(999);
    this.toasts = [];
  }

  show(message, variant = 'info', duration = 2000) {
    const yOffset = -this.toasts.length * 60;
    const bgColor = variant === 'danger'
      ? ThemeTokens.color.danger
      : variant === 'success'
      ? ThemeTokens.color.success
      : ThemeTokens.color.panelStrong;
    const bg = this.scene.add.rectangle(0, yOffset, 520, 48, themeColor(bgColor), 0.92)
      .setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.6)
      .setOrigin(0.5);
    const label = this.scene.add.text(0, yOffset, message, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '18px',
      fontWeight: '600',
      color: ThemeTokens.color.text,
      align: 'center'
    }).setOrigin(0.5);
    const toast = this.scene.add.container(0, 0, [bg, label]);
    toast.setScale(0.9);
    this.scene.tweens.add({ targets: toast, scale: 1, alpha: 1, ease: 'Back.Out', duration: 220 });
    this.container.add(toast);
    const timer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.dismiss(toast)
    });
    this.toasts.push({ toast, timer });
  }

  dismiss(toastContainer) {
    const record = this.toasts.find(t => t.toast === toastContainer);
    if (!record) return;
    record.timer?.remove(false);
    this.scene.tweens.add({
      targets: toastContainer,
      alpha: 0,
      y: toastContainer.y - 40,
      duration: 220,
      onComplete: () => {
        toastContainer.destroy();
        this.toasts = this.toasts.filter(t => t.toast !== toastContainer);
        this.layout();
      }
    });
  }

  layout() {
    this.toasts.forEach((t, idx) => {
      const targetY = -idx * 60;
      this.scene.tweens.add({ targets: t.toast, y: targetY, duration: 160, ease: 'Sine.easeOut' });
    });
  }
}
