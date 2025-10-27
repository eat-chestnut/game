import { GameState } from '../state/GameState.js';

/**
 * v9.1: 组合技引擎
 * 处理技能组合逻辑（水→火、木→土、金→火等）
 */
export class ComboEngine {
  constructor(scene, config) {
    this.scene = scene;
    this.comboRules = config?.comboRules || [];
    this.statusDefaults = config?.statusDefaults || {};
    
    // 组合技事件窗口（记录最近的状态变化）
    this.eventWindow = [];
    this.windowDuration = 3000; // 3秒窗口
  }
  
  /**
   * 记录状态事件
   */
  recordEvent(enemyId, statusType, element, damage = 0) {
    this.eventWindow.push({
      enemyId,
      statusType,
      element,
      damage,
      timestamp: Date.now()
    });
    
    // 清理过期事件
    this.cleanupOldEvents();
  }
  
  /**
   * 清理过期事件
   */
  cleanupOldEvents() {
    const now = Date.now();
    this.eventWindow = this.eventWindow.filter(event => {
      return now - event.timestamp < this.windowDuration;
    });
  }
  
  /**
   * 检查并触发组合技
   */
  checkAndTriggerCombo(enemyId, currentElement, damage, enemy) {
    this.comboRules.forEach(rule => {
      if (this.canTriggerCombo(enemyId, currentElement, rule, damage)) {
        this.triggerCombo(rule, enemy, damage);
      }
    });
  }
  
  /**
   * 检查是否可以触发组合技
   */
  canTriggerCombo(enemyId, currentElement, rule, damage) {
    const sequence = rule.sequence;
    if (sequence.length !== 2) return false;
    
    // 查找前置状态事件
    const recentEvents = this.eventWindow.filter(e => e.enemyId === enemyId);
    const hasFirstStatus = recentEvents.some(e => {
      return this.matchesElement(e.element, sequence[0]);
    });
    
    if (!hasFirstStatus) return false;
    
    // 检查当前元素是否匹配第二个
    if (!this.matchesElement(currentElement, sequence[1])) return false;
    
    // 检查特殊条件
    if (rule.condition) {
      return this.evaluateCondition(rule.condition, damage);
    }
    
    return true;
  }
  
  /**
   * 匹配元素与状态
   */
  matchesElement(element, statusOrElement) {
    const elementToStatus = {
      'fire': 'burn',
      'water': 'freeze',
      'wood': 'root',
      'earth': 'shatter',
      'metal': 'expose'
    };
    
    return element === statusOrElement || elementToStatus[element] === statusOrElement;
  }
  
  /**
   * 评估条件
   */
  evaluateCondition(condition, damage) {
    // 简单的条件解析
    if (condition.includes('>=')) {
      const [left, right] = condition.split('>=').map(s => s.trim());
      
      if (left === 'fire_damage') {
        const threshold = this.statusDefaults.fire?.explodeThreshold || 100;
        return damage >= threshold;
      }
    }
    
    return true;
  }
  
  /**
   * 触发组合技
   */
  triggerCombo(rule, enemy, damage) {
    console.log(`[Combo] Triggered: ${rule.id}`);
    
    const effect = rule.effect;
    
    switch (effect.type) {
      case 'aoe_damage':
        this.triggerAOEDamage(rule, enemy, damage);
        break;
        
      case 'damage_bonus':
        // 碎裂加成在 StatusSystem 中处理
        break;
        
      case 'dot_bonus':
        // DoT加成通过状态缩放实现
        break;
    }
  }
  
  /**
   * 触发AOE伤害（解冻炸裂）
   */
  triggerAOEDamage(rule, enemy, damage) {
    const effect = rule.effect;
    
    // 解冻
    if (effect.unfreeze && this.scene.statusSystem) {
      this.scene.statusSystem.removeStatus(enemy, 'freeze');
    }
    
    // 计算AOE伤害
    const multiplier = this.parseMultiplier(effect.multiplier);
    const aoeDamage = damage * multiplier;
    const radius = effect.radius || 80;
    
    // 造成AOE伤害
    if (this.scene.damageNearbyEnemies) {
      this.scene.damageNearbyEnemies(enemy.x, enemy.y, radius, aoeDamage);
    }
    
    // 显示特效
    if (this.scene.showComboEffect) {
      this.scene.showComboEffect(enemy.x, enemy.y, rule.id);
    }
  }
  
  /**
   * 解析倍率字符串
   */
  parseMultiplier(multiplierStr) {
    if (typeof multiplierStr === 'number') return multiplierStr;
    
    // 解析 "fire.explodeMultiplier" 这样的路径
    const parts = multiplierStr.split('.');
    let value = this.statusDefaults;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0.35;
  }
  
  /**
   * 获取组合技列表（用于UI显示）
   */
  getComboList(locale = 'zh') {
    return this.comboRules.map(rule => ({
      id: rule.id,
      name: rule.name[locale] || rule.name.zh,
      sequence: rule.sequence,
      description: this.getComboDescription(rule, locale)
    }));
  }
  
  /**
   * 获取组合技描述
   */
  getComboDescription(rule, locale = 'zh') {
    const seq = rule.sequence.join(' → ');
    const effect = rule.effect;
    
    if (locale === 'zh') {
      switch (effect.type) {
        case 'aoe_damage':
          return `${seq}：触发范围爆炸`;
        case 'damage_bonus':
          return `${seq}：造成额外伤害`;
        case 'dot_bonus':
          return `${seq}：强化持续伤害`;
        default:
          return seq;
      }
    } else {
      switch (effect.type) {
        case 'aoe_damage':
          return `${seq}: Trigger AOE explosion`;
        case 'damage_bonus':
          return `${seq}: Deal bonus damage`;
        case 'dot_bonus':
          return `${seq}: Enhance DoT`;
        default:
          return seq;
      }
    }
  }
  
  /**
   * 获取最近触发的组合技统计
   */
  getComboStats() {
    const stats = {};
    
    this.comboRules.forEach(rule => {
      stats[rule.id] = {
        triggered: 0,
        lastTrigger: null
      };
    });
    
    // 这里应该从实际游戏数据中统计，暂时返回空统计
    return stats;
  }
}
