import { ThemeTokens } from '../theme.js';

/**
 * v6: 无障碍系统
 * 提供高对比度模式、色盲友好调色、屏幕震动控制等
 */
export class AccessibilitySystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.accessibility || {};
    this.highContrast = this.config.highContrast || false;
    this.colorBlindMode = this.config.colorBlind || 'off'; // 'off' | 'protan' | 'deutan' | 'tritan'
    this.screenShake = this.config.screenShake !== false;
    this.particleIntensity = this.config.particleIntensity || 1.0; // 0.0 ~ 1.0
    
    // 备份原始主题
    this.originalTheme = { ...ThemeTokens };
    
    this.applySettings();
  }
  
  applySettings() {
    if (this.highContrast) {
      this.applyHighContrast();
    } else if (this.colorBlindMode !== 'off') {
      this.applyColorBlindMode(this.colorBlindMode);
    } else {
      this.restoreOriginalTheme();
    }
  }
  
  applyHighContrast() {
    // 高对比度：使用纯黑白与强色
    ThemeTokens.color.background = '#000000';
    ThemeTokens.color.text = '#FFFFFF';
    ThemeTokens.color.textMuted = '#CCCCCC';
    ThemeTokens.color.primary = '#00FFFF';
    ThemeTokens.color.accent = '#FFFF00';
    ThemeTokens.color.danger = '#FF0000';
    ThemeTokens.color.success = '#00FF00';
    ThemeTokens.color.panel = '#1A1A1A';
    ThemeTokens.color.panelStrong = '#333333';
    
    console.log('[Accessibility] High contrast mode enabled');
  }
  
  applyColorBlindMode(mode) {
    // 色盲友好调色
    switch (mode) {
      case 'protan': // 红色盲
        ThemeTokens.color.primary = '#0099FF'; // 蓝色
        ThemeTokens.color.accent = '#FFB020'; // 橙色
        ThemeTokens.color.danger = '#8B4513'; // 棕色替代红色
        ThemeTokens.color.success = '#00A8E8'; // 青蓝色
        break;
        
      case 'deutan': // 绿色盲
        ThemeTokens.color.primary = '#0099FF';
        ThemeTokens.color.accent = '#FFB020';
        ThemeTokens.color.danger = '#FF6B6B';
        ThemeTokens.color.success = '#4A90E2'; // 蓝色替代绿色
        break;
        
      case 'tritan': // 蓝色盲
        ThemeTokens.color.primary = '#E63946'; // 红色
        ThemeTokens.color.accent = '#FFB020';
        ThemeTokens.color.danger = '#8B0000';
        ThemeTokens.color.success = '#2A9D8F'; // 青绿色
        break;
    }
    
    console.log(`[Accessibility] Color blind mode: ${mode}`);
  }
  
  restoreOriginalTheme() {
    Object.keys(this.originalTheme).forEach(key => {
      if (this.originalTheme[key] && typeof this.originalTheme[key] === 'object') {
        Object.keys(this.originalTheme[key]).forEach(subKey => {
          ThemeTokens[key][subKey] = this.originalTheme[key][subKey];
        });
      }
    });
    
    console.log('[Accessibility] Theme restored to original');
  }
  
  setHighContrast(enabled) {
    this.highContrast = enabled;
    this.applySettings();
  }
  
  setColorBlindMode(mode) {
    if (['off', 'protan', 'deutan', 'tritan'].includes(mode)) {
      this.colorBlindMode = mode;
      this.applySettings();
    }
  }
  
  setScreenShake(enabled) {
    this.screenShake = enabled;
  }
  
  setParticleIntensity(intensity) {
    this.particleIntensity = Math.max(0, Math.min(1.0, intensity));
  }
  
  // 触发屏幕震动（如果启用）
  triggerScreenShake(intensity = 0.5, duration = 200) {
    if (!this.screenShake) return;
    
    const camera = this.scene.cameras.main;
    if (!camera) return;
    
    camera.shake(duration, intensity * 0.01);
  }
  
  // 触发命中反馈
  triggerHitFeedback(x, y, critical = false) {
    if (critical) {
      this.triggerScreenShake(0.8, 150);
    } else {
      this.triggerScreenShake(0.3, 100);
    }
    
    // 粒子效果（根据强度调整）
    if (this.particleIntensity > 0 && this.scene.add) {
      const particleCount = Math.floor(5 * this.particleIntensity);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 50;
        const particle = this.scene.add.circle(x, y, 2, critical ? 0xFFFF00 : 0xFFFFFF);
        particle.setDepth(100);
        
        this.scene.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * speed,
          y: y + Math.sin(angle) * speed,
          alpha: 0,
          duration: 300,
          onComplete: () => particle.destroy()
        });
      }
    }
  }
  
  // 获取当前设置（用于保存）
  getSettings() {
    return {
      highContrast: this.highContrast,
      colorBlind: this.colorBlindMode,
      screenShake: this.screenShake,
      particleIntensity: this.particleIntensity
    };
  }
  
  // 加载设置
  loadSettings(settings) {
    if (!settings) return;
    
    if (settings.highContrast !== undefined) this.highContrast = settings.highContrast;
    if (settings.colorBlind) this.colorBlindMode = settings.colorBlind;
    if (settings.screenShake !== undefined) this.screenShake = settings.screenShake;
    if (settings.particleIntensity !== undefined) this.particleIntensity = settings.particleIntensity;
    
    this.applySettings();
  }
}
