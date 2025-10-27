import { GameState } from '../state/GameState.js';

/**
 * v8: 成就系统
 * 跟踪和管理玩家成就，提供徽章通知
 */
export class AchievementsSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config || {};
    this.achievements = this.config.achievements || [];
    this.categories = this.config.categories || {};
    
    // 初始化成就状态
    if (!GameState.achievements) {
      GameState.achievements = {
        unlocked: {},
        progress: {},
        stats: {
          kill: 0,
          bossKill: 0,
          eliteKill: 0,
          wave: 0,
          score: 0,
          noDamageTime: 0,
          noDamageTimer: 0, // 当前无伤计时
          lastDamageTime: 0
        }
      };
    }
    
    this.notificationQueue = [];
  }
  
  /**
   * 加载成就配置
   */
  static async loadConfig() {
    try {
      const response = await fetch('./achievements.json');
      return await response.json();
    } catch (error) {
      console.error('[Achievements] Failed to load config:', error);
      return { achievements: [], categories: {} };
    }
  }
  
  /**
   * 推送成就事件
   * @param {string} type - 事件类型 (kill/wave/score/noDamageTime/setComplete/fireRateCap等)
   * @param {number} value - 事件值
   * @param {object} meta - 额外元数据
   */
  pushEvent(type, value, meta = {}) {
    if (!GameState.achievements) return;
    
    // 更新统计数据
    if (GameState.achievements.stats[type] !== undefined) {
      if (type === 'noDamageTime') {
        // 无伤时间特殊处理
        GameState.achievements.stats.noDamageTimer += value;
        GameState.achievements.stats.noDamageTime = Math.max(
          GameState.achievements.stats.noDamageTime,
          GameState.achievements.stats.noDamageTimer
        );
      } else if (type === 'score' || type === 'wave') {
        // 得分和波次取最大值
        GameState.achievements.stats[type] = Math.max(
          GameState.achievements.stats[type],
          value
        );
      } else {
        // 累加类型（击杀等）
        GameState.achievements.stats[type] += value;
      }
    }
    
    // 检查成就触发
    this.checkAchievements(type, meta);
  }
  
  /**
   * 重置无伤计时（受到伤害时调用）
   */
  resetNoDamageTimer() {
    if (GameState.achievements) {
      GameState.achievements.stats.noDamageTimer = 0;
      GameState.achievements.stats.lastDamageTime = Date.now();
    }
  }
  
  /**
   * 检查成就触发
   */
  checkAchievements(type, meta = {}) {
    this.achievements.forEach(achievement => {
      // 跳过已解锁的成就
      if (GameState.achievements.unlocked[achievement.id]) return;
      
      // 检查触发类型
      if (achievement.trigger !== type) return;
      
      // 特殊元数据检查
      if (achievement.meta) {
        if (achievement.meta.rarity && meta.rarity !== achievement.meta.rarity) {
          return;
        }
      }
      
      // 获取当前进度
      const currentValue = this.getCurrentValue(achievement.trigger);
      const progress = currentValue / achievement.threshold;
      
      // 更新进度
      GameState.achievements.progress[achievement.id] = Math.min(progress, 1.0);
      
      // 检查是否达成
      if (currentValue >= achievement.threshold) {
        this.unlockAchievement(achievement);
      }
    });
  }
  
  /**
   * 获取指定触发器的当前值
   */
  getCurrentValue(trigger) {
    return GameState.achievements.stats[trigger] || 0;
  }
  
  /**
   * 解锁成就
   */
  unlockAchievement(achievement) {
    if (GameState.achievements.unlocked[achievement.id]) return;
    
    // 标记为已解锁
    GameState.achievements.unlocked[achievement.id] = {
      timestamp: Date.now(),
      notified: false
    };
    
    // 添加到通知队列
    this.notificationQueue.push(achievement);
    
    // 发放奖励
    this.grantReward(achievement.reward);
    
    console.log(`[Achievements] Unlocked: ${achievement.id} - ${achievement.name.zh || achievement.name.en}`);
    
    // 显示通知
    this.showNotification(achievement);
  }
  
  /**
   * 发放奖励
   */
  grantReward(reward) {
    if (!reward) return;
    
    switch (reward.type) {
      case 'coins':
        if (GameState.player) {
          GameState.player.coins = (GameState.player.coins || 0) + reward.value;
        }
        break;
        
      case 'shards':
        if (GameState.equipment) {
          GameState.equipment.shards = (GameState.equipment.shards || 0) + reward.value;
        }
        break;
        
      case 'title':
        // 称号系统可在后续实现
        console.log(`[Achievements] Granted title: ${reward.value}`);
        break;
        
      default:
        console.warn(`[Achievements] Unknown reward type: ${reward.type}`);
    }
  }
  
  /**
   * 显示成就通知
   */
  showNotification(achievement) {
    const locale = GameState.globals?.locale || 'zh';
    const name = achievement.name[locale] || achievement.name.zh;
    const desc = achievement.desc[locale] || achievement.desc.zh;
    
    // 使用 ToastManager 显示
    if (this.scene.toastManager) {
      this.scene.toastManager.show(
        `🏆 ${name}\n${desc}`,
        'achievement',
        3000
      );
    }
    
    // 播放音效
    if (this.scene.audioSystem) {
      this.scene.audioSystem.playSound('achievement');
    }
    
    // 标记为已通知
    if (GameState.achievements.unlocked[achievement.id]) {
      GameState.achievements.unlocked[achievement.id].notified = true;
    }
  }
  
  /**
   * 获取所有成就
   */
  getAllAchievements() {
    return this.achievements.map(achievement => {
      const unlocked = GameState.achievements.unlocked[achievement.id];
      const progress = GameState.achievements.progress[achievement.id] || 0;
      
      return {
        ...achievement,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.timestamp,
        progress: progress
      };
    });
  }
  
  /**
   * 获取分类成就
   */
  getAchievementsByCategory(category) {
    return this.getAllAchievements().filter(a => a.category === category);
  }
  
  /**
   * 获取已解锁成就数量
   */
  getUnlockedCount() {
    return Object.keys(GameState.achievements.unlocked).length;
  }
  
  /**
   * 获取总成就数量
   */
  getTotalCount() {
    return this.achievements.length;
  }
  
  /**
   * 获取解锁百分比
   */
  getUnlockPercentage() {
    const total = this.getTotalCount();
    if (total === 0) return 0;
    
    return (this.getUnlockedCount() / total * 100).toFixed(1);
  }
  
  /**
   * 获取分类列表
   */
  getCategories() {
    const locale = GameState.globals?.locale || 'zh';
    
    return Object.keys(this.categories).map(categoryId => ({
      id: categoryId,
      name: this.categories[categoryId][locale] || this.categories[categoryId].zh,
      count: this.achievements.filter(a => a.category === categoryId).length,
      unlocked: this.achievements.filter(a => {
        return a.category === categoryId && GameState.achievements.unlocked[a.id];
      }).length
    }));
  }
  
  /**
   * 模拟成就触发（QA用）
   */
  simulateUnlock(achievementId) {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement) {
      this.unlockAchievement(achievement);
      return true;
    }
    return false;
  }
  
  /**
   * 重置所有成就（QA用）
   */
  resetAll() {
    GameState.achievements = {
      unlocked: {},
      progress: {},
      stats: {
        kill: 0,
        bossKill: 0,
        eliteKill: 0,
        wave: 0,
        score: 0,
        noDamageTime: 0,
        noDamageTimer: 0,
        lastDamageTime: 0
      }
    };
    
    console.log('[Achievements] All achievements reset');
  }
  
  /**
   * 更新（每帧调用）
   */
  update(delta) {
    // 更新无伤计时
    if (GameState.achievements && !GameState.isPaused) {
      const timeSinceLastDamage = Date.now() - (GameState.achievements.stats.lastDamageTime || 0);
      
      // 如果超过1秒没受伤，开始计时
      if (timeSinceLastDamage > 1000) {
        this.pushEvent('noDamageTime', delta / 1000);
      }
    }
  }
}
