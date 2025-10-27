import { GameState } from '../state/GameState.js';

/**
 * v9: 装备升级与合成系统
 * 支持装备升级至 Lv10，同槽同稀有装备合成
 */
export class EquipmentUpgradeSystem {
  constructor(scene, equipConfig) {
    this.scene = scene;
    this.config = equipConfig?.upgrade || {};
    this.maxLevel = this.config.maxLevel || 10;
    this.costCurve = this.config.costShardsCurve || [0, 3, 6, 10, 15, 21, 28, 36, 45, 55];
    this.statScale = this.config.statScalePerLevel || 0.08;
    this.mergeRules = this.config.mergeRules || {};
  }
  
  /**
   * 升级装备
   * @param {string} itemId - 装备ID
   * @returns {object} 结果 { success, cost, newLevel, error }
   */
  upgradeItem(itemId) {
    const item = this.findItemById(itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    // 检查等级上限
    const currentLevel = item.level || 1;
    if (currentLevel >= this.maxLevel) {
      return { success: false, error: 'Max level reached' };
    }
    
    // 计算消耗
    const cost = this.getUpgradeCost(currentLevel);
    const shards = GameState.equipment?.shards || 0;
    
    if (shards < cost) {
      return { success: false, error: 'Not enough shards', required: cost, current: shards };
    }
    
    // 扣除残片
    GameState.equipment.shards -= cost;
    
    // 升级
    item.level = currentLevel + 1;
    
    // 重新计算属性（基于等级缩放）
    this.recalculateItemStats(item);
    
    console.log(`[EquipmentUpgrade] Item ${itemId} upgraded to level ${item.level}`);
    
    return {
      success: true,
      cost: cost,
      newLevel: item.level
    };
  }
  
  /**
   * 批量升级装备
   * @param {array} itemIds - 装备ID数组
   * @returns {object} 结果 { upgraded: [], failed: [] }
   */
  batchUpgrade(itemIds) {
    const results = { upgraded: [], failed: [] };
    
    itemIds.forEach(itemId => {
      const result = this.upgradeItem(itemId);
      if (result.success) {
        results.upgraded.push({ itemId, level: result.newLevel });
      } else {
        results.failed.push({ itemId, error: result.error });
      }
    });
    
    return results;
  }
  
  /**
   * 合成装备
   * @param {string} item1Id - 装备1 ID
   * @param {string} item2Id - 装备2 ID
   * @returns {object} 结果 { success, resultItem, consumed, error }
   */
  mergeItems(item1Id, item2Id) {
    const item1 = this.findItemById(item1Id);
    const item2 = this.findItemById(item2Id);
    
    if (!item1 || !item2) {
      return { success: false, error: 'Item not found' };
    }
    
    // 检查是否可合成（同槽同稀有）
    if (item1.slot !== item2.slot || item1.rarity !== item2.rarity) {
      return { success: false, error: 'Items must be same slot and rarity' };
    }
    
    // 检查锁定
    if (item1.locked || item2.locked) {
      return { success: false, error: 'Cannot merge locked items' };
    }
    
    const level1 = item1.level || 1;
    const level2 = item2.level || 1;
    
    // 规则：同槽同稀有 → 提升等级
    if (level1 < this.maxLevel || level2 < this.maxLevel) {
      // 选择等级较高的作为基础
      const baseItem = level1 >= level2 ? item1 : item2;
      const consumedItem = level1 >= level2 ? item2 : item1;
      
      // 提升1级
      baseItem.level = (baseItem.level || 1) + 1;
      this.recalculateItemStats(baseItem);
      
      // 移除被消耗的装备
      this.removeItem(consumedItem.id);
      
      console.log(`[EquipmentUpgrade] Merged items, new level: ${baseItem.level}`);
      
      return {
        success: true,
        resultItem: baseItem,
        consumed: [consumedItem.id]
      };
    }
    
    // 规则：满级同槽同稀有 → 提升品质
    if (level1 === this.maxLevel && level2 === this.maxLevel) {
      const rarityTiers = ['Common', 'Rare', 'Epic', 'Legend'];
      const currentTier = rarityTiers.indexOf(item1.rarity);
      
      if (currentTier < rarityTiers.length - 1) {
        // 提升品质，重置等级为1
        item1.rarity = rarityTiers[currentTier + 1];
        item1.level = 1;
        
        // 重新生成词缀（品质提升）
        this.upgradeItemRarity(item1);
        
        // 移除被消耗的装备
        this.removeItem(item2.id);
        
        console.log(`[EquipmentUpgrade] Merged max level items, upgraded to ${item1.rarity}`);
        
        return {
          success: true,
          resultItem: item1,
          consumed: [item2.id],
          rarityUpgrade: true
        };
      }
    }
    
    return { success: false, error: 'Cannot merge these items' };
  }
  
  /**
   * 获取升级消耗
   */
  getUpgradeCost(currentLevel) {
    if (currentLevel >= this.maxLevel) return Infinity;
    return this.costCurve[currentLevel] || 0;
  }
  
  /**
   * 重新计算装备属性（基于等级）
   */
  recalculateItemStats(item) {
    const level = item.level || 1;
    const scaleMultiplier = 1 + (level - 1) * this.statScale;
    
    // 缩放所有词缀数值
    if (item.affixes) {
      Object.keys(item.affixes).forEach(affixKey => {
        const baseValue = item.baseAffixes?.[affixKey] || item.affixes[affixKey];
        if (!item.baseAffixes) {
          item.baseAffixes = { ...item.affixes };
        }
        item.affixes[affixKey] = Math.floor(baseValue * scaleMultiplier);
      });
    }
  }
  
  /**
   * 提升装备品质（合成时）
   */
  upgradeItemRarity(item) {
    const equipSystem = this.scene.equipmentSystem;
    if (!equipSystem) return;
    
    // 重新生成词缀（使用新的稀有度）
    const rarityConfig = equipSystem.rarityLevels?.find(r => r.id === item.rarity);
    if (rarityConfig) {
      const newAffixes = {};
      const rolls = rarityConfig.rolls || 1;
      
      // 重新roll词缀
      for (let i = 0; i < rolls; i++) {
        const affix = equipSystem.rollRandomAffix(rarityConfig.tier);
        if (affix) {
          Object.assign(newAffixes, affix);
        }
      }
      
      item.affixes = newAffixes;
      item.baseAffixes = { ...newAffixes };
    }
  }
  
  /**
   * 查找装备
   */
  findItemById(itemId) {
    // 在背包中查找
    const inventory = GameState.equipment?.inventory || [];
    let item = inventory.find(i => i.id === itemId);
    
    // 在已装备中查找
    if (!item) {
      const equipped = GameState.equipment?.equippedItems || {};
      Object.keys(equipped).forEach(slot => {
        if (equipped[slot]?.id === itemId) {
          item = equipped[slot];
        }
      });
    }
    
    return item;
  }
  
  /**
   * 移除装备
   */
  removeItem(itemId) {
    // 从背包中移除
    if (GameState.equipment?.inventory) {
      const index = GameState.equipment.inventory.findIndex(i => i.id === itemId);
      if (index !== -1) {
        GameState.equipment.inventory.splice(index, 1);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取装备升级信息
   */
  getItemUpgradeInfo(itemId) {
    const item = this.findItemById(itemId);
    if (!item) return null;
    
    const level = item.level || 1;
    const cost = this.getUpgradeCost(level);
    const canUpgrade = level < this.maxLevel && (GameState.equipment?.shards || 0) >= cost;
    
    return {
      currentLevel: level,
      maxLevel: this.maxLevel,
      upgradeCost: cost,
      canUpgrade: canUpgrade,
      isMaxLevel: level >= this.maxLevel,
      statScale: this.statScale
    };
  }
  
  /**
   * 获取可合成的装备对
   */
  getMergeablePairs() {
    const inventory = GameState.equipment?.inventory || [];
    const pairs = [];
    
    // 按槽位和稀有度分组
    const groups = {};
    inventory.forEach(item => {
      if (item.locked) return; // 跳过锁定的
      
      const key = `${item.slot}_${item.rarity}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    // 找出可合成的对
    Object.values(groups).forEach(group => {
      if (group.length >= 2) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            pairs.push({ item1: group[i], item2: group[j] });
          }
        }
      }
    });
    
    return pairs;
  }
}
