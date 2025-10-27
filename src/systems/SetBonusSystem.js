import { GameState } from '../state/GameState.js';

/**
 * v7: 装备套装系统
 * 计算装备套装激活状态与加成
 */
export class SetBonusSystem {
  constructor(scene, equipConfig) {
    this.scene = scene;
    this.sets = equipConfig?.sets || {};
    this.activeSetBonuses = {};
  }
  
  /**
   * 计算当前装备的套装激活状态
   * @returns {Object} { setId: { count: number, set2Active: boolean, set4Active: boolean, bonuses: {} } }
   */
  calculateActiveSets() {
    this.activeSetBonuses = {};
    
    if (!GameState.equipment || !GameState.equipment.equipped) {
      return this.activeSetBonuses;
    }
    
    // 统计每个套装的装备数量
    const setCounts = {};
    
    Object.values(GameState.equipment.equipped).forEach(itemId => {
      const item = this.findItemById(itemId);
      if (!item || !item.setId) return;
      
      setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
    });
    
    // 计算激活的套装加成
    Object.keys(setCounts).forEach(setId => {
      const count = setCounts[setId];
      const setDef = this.sets[setId];
      
      if (!setDef) return;
      
      const set2Active = count >= 2;
      const set4Active = count >= 4;
      
      const bonuses = {};
      
      // 合并 set2 和 set4 加成
      if (set2Active && setDef.set2) {
        Object.assign(bonuses, setDef.set2);
      }
      
      if (set4Active && setDef.set4) {
        Object.assign(bonuses, setDef.set4);
      }
      
      this.activeSetBonuses[setId] = {
        count,
        set2Active,
        set4Active,
        bonuses,
        name: setDef.name
      };
    });
    
    console.log('[SetBonus] Active sets:', this.activeSetBonuses);
    return this.activeSetBonuses;
  }
  
  /**
   * 获取所有激活套装的合并加成
   * @returns {Object} 合并后的加成对象
   */
  getMergedSetBonuses() {
    const merged = {
      flatDamage: 0,
      damageMulPct: 0,
      fireRatePct: 0,
      penetrationPlus: 0,
      reboundPlus: 0,
      splitChildPct: 0,
      aoeScalePct: 0,
      droneDmgPct: 0,
      shieldCDPct: 0,
      lootChancePct: 0,
      bulletSpeedPct: 0,
      hpMulPct: 0,
      penetrationDecayMul: 1.0,
      aoeCooldownPct: 0
    };
    
    Object.values(this.activeSetBonuses).forEach(setInfo => {
      if (!setInfo.bonuses) return;
      
      Object.keys(setInfo.bonuses).forEach(key => {
        if (key === 'penetrationDecayMul') {
          // 穿透衰减乘法叠加
          merged[key] *= setInfo.bonuses[key];
        } else if (merged[key] !== undefined) {
          // 加法叠加
          merged[key] += setInfo.bonuses[key];
        }
      });
    });
    
    return merged;
  }
  
  /**
   * 查找装备（需要访问完整的装备数据）
   */
  findItemById(itemId) {
    // 从背包中查找
    const inInventory = GameState.equipment.inventory?.find(i => i.id === itemId);
    if (inInventory) return inInventory;
    
    // 从已装备中查找（需要存储完整数据）
    if (GameState.equipment.equippedItems) {
      return GameState.equipment.equippedItems[itemId];
    }
    
    return null;
  }
  
  /**
   * 获取套装进度描述（用于 HUD 显示）
   */
  getSetProgressDescription() {
    if (Object.keys(this.activeSetBonuses).length === 0) {
      return '无激活套装';
    }
    
    const lines = [];
    Object.entries(this.activeSetBonuses).forEach(([setId, info]) => {
      const locale = GameState.globals.locale || 'zh';
      const setName = info.name?.[locale] || setId;
      const progress = `${info.count}/4`;
      
      let bonusText = '';
      if (info.set4Active) {
        bonusText = '(4)';
      } else if (info.set2Active) {
        bonusText = '(2)';
      }
      
      lines.push(`${setName} ${progress} ${bonusText}`);
    });
    
    return lines.join(' | ');
  }
  
  /**
   * 获取激活的套装加成详细描述
   */
  getActiveBonusesDescription() {
    const bonuses = this.getMergedSetBonuses();
    const lines = [];
    
    const locale = GameState.globals.locale || 'zh';
    const labels = locale === 'zh' ? {
      bulletSpeedPct: '子弹速度',
      damageMulPct: '总伤害',
      fireRatePct: '射击间隔',
      penetrationPlus: '穿透',
      penetrationDecayMul: '穿透衰减',
      aoeScalePct: 'AOE伤害',
      aoeCooldownPct: 'AOE冷却',
      droneDmgPct: '无人机伤害',
      shieldCDPct: '护盾冷却',
      hpMulPct: '生命值',
      splitChildPct: '分裂小弹伤害'
    } : {
      bulletSpeedPct: 'Bullet Speed',
      damageMulPct: 'Total Damage',
      fireRatePct: 'Fire Interval',
      penetrationPlus: 'Penetration',
      penetrationDecayMul: 'Penetration Decay',
      aoeScalePct: 'AOE Damage',
      aoeCooldownPct: 'AOE Cooldown',
      droneDmgPct: 'Drone Damage',
      shieldCDPct: 'Shield Cooldown',
      hpMulPct: 'HP',
      splitChildPct: 'Split Child Damage'
    };
    
    Object.keys(bonuses).forEach(key => {
      const value = bonuses[key];
      if (value === 0 || (key === 'penetrationDecayMul' && value === 1.0)) return;
      
      const label = labels[key] || key;
      let displayValue = value;
      
      if (key.endsWith('Pct')) {
        displayValue = `${value > 0 ? '+' : ''}${value}%`;
      } else if (key === 'penetrationDecayMul') {
        displayValue = `×${value.toFixed(2)}`;
      } else if (key.endsWith('Plus')) {
        displayValue = `+${value}`;
      }
      
      lines.push(`${label} ${displayValue}`);
    });
    
    return lines.length > 0 ? lines.join(', ') : locale === 'zh' ? '无' : 'None';
  }
  
  /**
   * 检查指定套装的激活状态
   */
  isSetActive(setId, pieces = 2) {
    const setInfo = this.activeSetBonuses[setId];
    if (!setInfo) return false;
    
    if (pieces === 2) return setInfo.set2Active;
    if (pieces === 4) return setInfo.set4Active;
    
    return setInfo.count >= pieces;
  }
  
  /**
   * 获取套装列表（用于 UI 显示）
   */
  getAllSets() {
    return Object.entries(this.sets).map(([setId, setDef]) => ({
      id: setId,
      name: setDef.name,
      set2: setDef.set2,
      set4: setDef.set4
    }));
  }
}
