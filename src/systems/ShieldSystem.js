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
    this.invulnerable = false; // v5: 无敌帧
    this.invulnerableEndTime = 0;
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
    // v5: 检查无敌帧
    if (this.invulnerable) {
      const now = this.scene.time.now;
      if (now >= this.invulnerableEndTime) {
        this.invulnerable = false;
        // 恢复玩家颜色
        if (this.scene.player) {
          this.scene.player.clearTint();
        }
      }
    }
    
    if (!this.level || this.layers >= this.maxLayers) return;
    this.timer += delta;
    if (this.timer >= this.rechargeSec * 1000) {
      this.timer = 0;
      this.layers = Math.min(this.layers + 1, this.maxLayers);
      this.flashIcons();
    }
  }

  absorbHit() {
    // v5: 无敌帧期间无法受伤
    if (this.invulnerable) return true;
    
    if (this.layers <= 0) return false;
    this.layers -= 1;
    this.flashIcons(true);
    
    // v5: 护盾被击穿时触发 0.5s 无敌帧
    if (this.layers === 0) {
      this.invulnerable = true;
      this.invulnerableEndTime = this.scene.time.now + 500;
      // 闪烁提示
      if (this.scene.player) {
        this.scene.player.setTint(0xffff00);
      }
      this.scene.toastManager?.show('护盾被击穿！短暂无敌！', 'warning', 1000);
    }
    
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
