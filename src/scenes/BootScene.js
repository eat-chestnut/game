import { GameState } from '../state/GameState.js';
import { SettingsState } from '../state/SettingsState.js';
import { SaveManager } from '../state/SaveManager.js';
import { DefaultSkillConfig } from '../config/defaultConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const progressEl = document.getElementById('loading-progress');
    this.load.on('progress', value => {
      if (progressEl) progressEl.style.width = `${Math.floor(value * 100)}%`;
    });
    this.load.once('complete', () => {
      if (progressEl) progressEl.style.width = '100%';
      const screen = document.getElementById('loading-screen');
      if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => (screen.style.display = 'none'), 320);
      }
    });
    this.load.json('skillConfig', 'skill_config.json');
    this.load.json('buildConfig', 'build.config.json');
  }

  create() {
    SettingsState.load();
    this.generateTextures();
    let config = this.cache.json.get('skillConfig');
    if (!config || typeof config !== 'object') {
      console.error('[兼容层] skill_config.json 解析失败，使用默认配置');
      config = structuredClone(DefaultSkillConfig);
    } else {
      config = this.mergeConfig(config);
    }
    GameState.setConfig(config);
    const saveData = SaveManager.load(GameState.skillState);
    GameState.hydrate(saveData);
    this.scene.start('MainMenu');
  }

  mergeConfig(config) {
    const merged = structuredClone(DefaultSkillConfig);
    const deepMerge = (target, source) => {
      Object.entries(source || {}).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          target[key] = deepMerge({ ...(target[key] || {}) }, value);
        } else {
          target[key] = value;
        }
      });
      return target;
    };
    deepMerge(merged, config);
    if (!merged.skills?.length) {
      merged.skills = DefaultSkillConfig.skills;
    }
    ['defense_shield', 'summon_drone', 'aoe_blast'].forEach(id => {
      if (!merged.skills.some(skill => skill.id === id)) {
        console.warn(`[兼容层] 未检测到 ${id}，补齐默认技能`); // compatibles
        const fallback = DefaultSkillConfig.skills.find(s => s.id === id);
        if (fallback) merged.skills.push(fallback);
      }
    });
    return merged;
  }

  generateTextures() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    // Player
    gfx.clear();
    gfx.fillStyle(0x6c5ce7, 1);
    gfx.fillRoundedRect(0, 0, 40, 80, 12);
    gfx.generateTexture('player', 40, 80);
    // Enemy
    gfx.clear();
    gfx.fillStyle(0xff5c7a, 1);
    gfx.fillRoundedRect(0, 0, 48, 64, 16);
    gfx.generateTexture('enemy', 48, 64);
    // Bullet
    gfx.clear();
    gfx.fillStyle(0x00d1b2, 1);
    gfx.fillRoundedRect(0, 0, 10, 32, 4);
    gfx.generateTexture('bullet', 10, 32);
    // Split bullet
    gfx.clear();
    gfx.fillStyle(0x29cc97, 1);
    gfx.fillRoundedRect(0, 0, 8, 24, 4);
    gfx.generateTexture('splitBullet', 8, 24);
    // Loot orb
    gfx.clear();
    gfx.fillStyle(0x00d1b2, 1);
    gfx.fillCircle(16, 16, 16);
    gfx.generateTexture('lootOrb', 32, 32);
    // Panel background
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.05);
    gfx.fillRoundedRect(0, 0, 620, 720, 20);
    gfx.generateTexture('panel-bg', 620, 720);
    // Noise texture
    const noiseSize = 128;
    const noiseCanvas = this.textures.createCanvas('noise', noiseSize, noiseSize);
    const ctx = noiseCanvas.context;
    const imageData = ctx.createImageData(noiseSize, noiseSize);
    for (let i = 0; i < noiseSize * noiseSize * 4; i += 4) {
      const shade = Math.random() * 255;
      imageData.data[i] = shade;
      imageData.data[i + 1] = shade;
      imageData.data[i + 2] = shade;
      imageData.data[i + 3] = 50;
    }
    ctx.putImageData(imageData, 0, 0);
    noiseCanvas.refresh();
  }
}
