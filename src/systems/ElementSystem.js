import { GameState } from '../state/GameState.js';

/**
 * v9: 五行元素克制系统
 * 管理五行相克关系（木→土→水→火→金→木）
 * 攻击者对下一个元素 +30%，对上一个元素 -30%
 */
export class ElementSystem {
  constructor(scene, equipConfig) {
    this.scene = scene;
    this.config = equipConfig?.elements || {};
    this.order = this.config.order || ['wood', 'earth', 'water', 'fire', 'metal'];
    this.bonus = this.config.bonus || 0.3;
    this.penalty = this.config.penalty || -0.3;
    this.names = this.config.names || {};
    
    // 构建克制映射
    this.buildCounterMap();
  }
  
  /**
   * 构建克制映射
   */
  buildCounterMap() {
    this.counters = {};
    this.weaknesses = {};
    
    this.order.forEach((element, index) => {
      const nextIndex = (index + 1) % this.order.length;
      const prevIndex = (index - 1 + this.order.length) % this.order.length;
      
      this.counters[element] = this.order[nextIndex]; // 克制下一个
      this.weaknesses[element] = this.order[prevIndex]; // 被上一个克制
    });
  }
  
  /**
   * 计算元素克制倍率
   * @param {array} attackerElements - 攻击者元素数组
   * @param {array} defenderElements - 防御者元素数组
   * @returns {number} 伤害倍率 (0.70, 1.00, 或 1.30)
   */
  calculateDamageMultiplier(attackerElements = [], defenderElements = []) {
    if (!attackerElements.length || !defenderElements.length) {
      return 1.0; // 无元素，正常伤害
    }
    
    let maxModifier = 0;
    let hasAdvantage = false;
    let hasDisadvantage = false;
    
    // 遍历所有攻击者和防御者元素组合
    attackerElements.forEach(attackerElem => {
      defenderElements.forEach(defenderElem => {
        if (this.counters[attackerElem] === defenderElem) {
          // 攻击者克制防御者 +30%
          hasAdvantage = true;
          if (Math.abs(this.bonus) > Math.abs(maxModifier)) {
            maxModifier = this.bonus;
          }
        } else if (this.weaknesses[attackerElem] === defenderElem) {
          // 攻击者被防御者克制 -30%
          hasDisadvantage = true;
          if (Math.abs(this.penalty) > Math.abs(maxModifier)) {
            maxModifier = this.penalty;
          }
        }
      });
    });
    
    // 如果有优势和劣势，取绝对值最大的；如果相等，取优势
    if (hasAdvantage && hasDisadvantage) {
      if (Math.abs(this.bonus) >= Math.abs(this.penalty)) {
        return 1.0 + this.bonus;
      }
    }
    
    return 1.0 + maxModifier;
  }
  
  /**
   * 获取玩家主元素
   * 基于技能和宝石的权重
   */
  getPlayerMainElement() {
    const elementWeights = {};
    
    // 从技能获取元素权重
    const skills = GameState.skills || {};
    Object.keys(skills).forEach(skillId => {
      if (skillId.startsWith('elem_')) {
        const level = skills[skillId];
        if (level > 0) {
          const element = skillId.replace('elem_', '');
          elementWeights[element] = (elementWeights[element] || 0) + level;
        }
      }
    });
    
    // 从宝石获取元素权重
    if (this.scene.gemSystem) {
      const gemStats = this.scene.gemSystem.getAllGemStats();
      Object.keys(gemStats.elements).forEach(element => {
        elementWeights[element] = (elementWeights[element] || 0) + gemStats.elements[element];
      });
    }
    
    // 找出权重最高的元素
    let mainElement = null;
    let maxWeight = 0;
    
    Object.keys(elementWeights).forEach(element => {
      if (elementWeights[element] > maxWeight) {
        maxWeight = elementWeights[element];
        mainElement = element;
      }
    });
    
    return mainElement;
  }
  
  /**
   * 获取玩家所有元素
   */
  getPlayerElements() {
    const elements = new Set();
    
    // 从技能获取
    const skills = GameState.skills || {};
    Object.keys(skills).forEach(skillId => {
      if (skillId.startsWith('elem_')) {
        const level = skills[skillId];
        if (level > 0) {
          const element = skillId.replace('elem_', '');
          elements.add(element);
        }
      }
    });
    
    // 从宝石获取
    if (this.scene.gemSystem) {
      const gemStats = this.scene.gemSystem.getAllGemStats();
      Object.keys(gemStats.elements).forEach(element => {
        if (gemStats.elements[element] > 0) {
          elements.add(element);
        }
      });
    }
    
    return Array.from(elements);
  }
  
  /**
   * 获取敌人元素
   * @param {object} enemy - 敌人对象
   * @returns {array} 元素数组
   */
  getEnemyElements(enemy) {
    if (!enemy) return [];
    
    // 从敌人属性获取
    if (enemy.elements) {
      return Array.isArray(enemy.elements) ? enemy.elements : [enemy.elements];
    }
    
    // 从敌人类型推断（如果有）
    if (enemy.archetype) {
      return this.getArchetypeElements(enemy.archetype);
    }
    
    return [];
  }
  
  /**
   * 获取原型元素（根据配置）
   */
  getArchetypeElements(archetype) {
    const archetypeMap = {
      'grunt': ['wood'],
      'runner': ['fire'],
      'tank': ['earth'],
      'sniper': ['metal'],
      'caster': ['water']
    };
    
    return archetypeMap[archetype] || [];
  }
  
  /**
   * 计算玩家对敌人的伤害倍率
   */
  getPlayerVsEnemyMultiplier(enemy) {
    const playerElements = this.getPlayerElements();
    const enemyElements = this.getEnemyElements(enemy);
    
    return this.calculateDamageMultiplier(playerElements, enemyElements);
  }
  
  /**
   * 获取元素显示名称
   */
  getElementName(element, locale = 'zh') {
    return this.names[locale]?.[element] || element;
  }
  
  /**
   * 获取元素颜色
   */
  getElementColor(element) {
    const colors = {
      wood: '#10B981',
      fire: '#EF4444',
      earth: '#F59E0B',
      metal: '#A78BFA',
      water: '#3B82F6'
    };
    
    return colors[element] || '#FFFFFF';
  }
  
  /**
   * 获取克制关系描述
   */
  getCounterDescription(attackerElements, defenderElements, locale = 'zh') {
    const multiplier = this.calculateDamageMultiplier(attackerElements, defenderElements);
    
    if (multiplier > 1.0) {
      return locale === 'zh' ? '克制 +30%' : 'Advantage +30%';
    } else if (multiplier < 1.0) {
      return locale === 'zh' ? '被克 -30%' : 'Disadvantage -30%';
    }
    
    return locale === 'zh' ? '正常' : 'Normal';
  }
  
  /**
   * 获取元素克制图表（用于UI显示）
   */
  getCounterChart() {
    const chart = [];
    
    this.order.forEach(element => {
      chart.push({
        element: element,
        counters: this.counters[element],
        weakness: this.weaknesses[element]
      });
    });
    
    return chart;
  }
  
  /**
   * 分配敌人元素（生成时）
   */
  assignEnemyElements(enemy) {
    if (enemy.elements) return; // 已有元素
    
    // 根据敌人类型分配元素
    if (enemy.archetype) {
      enemy.elements = this.getArchetypeElements(enemy.archetype);
      return;
    }
    
    // Boss 和精英可以有多个元素
    if (enemy.isBoss) {
      const count = Math.random() < 0.5 ? 2 : 1;
      enemy.elements = this.randomElements(count);
    } else if (enemy.isElite) {
      const count = Math.random() < 0.3 ? 2 : 1;
      enemy.elements = this.randomElements(count);
    } else {
      // 普通敌人1个元素
      enemy.elements = this.randomElements(1);
    }
  }
  
  /**
   * 随机选择元素
   */
  randomElements(count = 1) {
    const shuffled = [...this.order].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
