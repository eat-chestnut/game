import { GameState } from '../state/GameState.js';

/**
 * v9: 宝石系统
 * 管理宝石的镶嵌、拆卸、合成，支持五行元素
 */
export class GemSystem {
  constructor(scene, equipConfig) {
    this.scene = scene;
    this.gemTypes = equipConfig?.gems?.types || {};
    this.gemTiers = equipConfig?.gems?.tiers || ['Flawed', 'Normal', 'Flawless', 'Perfect'];
    this.mergeConfig = equipConfig?.gems?.merge || { input: 3, output: 1, upgradeTier: true };
    this.sockets = equipConfig?.sockets || {};
    
    // 初始化宝石库存
    if (!GameState.gems) {
      GameState.gems = {
        inventory: [],
        socketed: {} // { itemId: [gem1, gem2, ...] }
      };
    }
  }
  
  /**
   * 生成宝石
   */
  generateGem(type = null, tier = 0) {
    const types = Object.keys(this.gemTypes);
    const selectedType = type || types[Math.floor(Math.random() * types.length)];
    const gemConfig = this.gemTypes[selectedType];
    
    if (!gemConfig) return null;
    
    const gem = {
      id: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedType,
      tier: Math.max(0, Math.min(tier, this.gemTiers.length - 1)),
      element: gemConfig.element,
      stats: {}
    };
    
    // 计算属性
    Object.keys(gemConfig.stats).forEach(statKey => {
      const values = gemConfig.stats[statKey];
      gem.stats[statKey] = values[gem.tier] || 0;
    });
    
    return gem;
  }
  
  /**
   * 镶嵌宝石
   */
  socketGem(itemId, gemId, socketIndex) {
    const item = this.findItemById(itemId);
    const gem = this.findGemById(gemId);
    
    if (!item || !gem) {
      return { success: false, error: 'Item or gem not found' };
    }
    
    // 检查插槽数量
    const maxSockets = this.sockets[item.slot] || 0;
    if (socketIndex >= maxSockets) {
      return { success: false, error: 'Invalid socket index' };
    }
    
    // 初始化插槽
    if (!GameState.gems.socketed[itemId]) {
      GameState.gems.socketed[itemId] = [];
    }
    
    // 检查插槽是否已有宝石
    if (GameState.gems.socketed[itemId][socketIndex]) {
      return { success: false, error: 'Socket already occupied' };
    }
    
    // 镶嵌宝石
    GameState.gems.socketed[itemId][socketIndex] = gem;
    
    // 从库存中移除
    const invIndex = GameState.gems.inventory.findIndex(g => g.id === gemId);
    if (invIndex !== -1) {
      GameState.gems.inventory.splice(invIndex, 1);
    }
    
    console.log(`[GemSystem] Socketed ${gem.type} gem into ${item.slot} at socket ${socketIndex}`);
    
    return { success: true, gem, item };
  }
  
  /**
   * 拆卸宝石
   */
  unsocketGem(itemId, socketIndex) {
    if (!GameState.gems.socketed[itemId]) {
      return { success: false, error: 'No gems socketed' };
    }
    
    const gem = GameState.gems.socketed[itemId][socketIndex];
    if (!gem) {
      return { success: false, error: 'Socket empty' };
    }
    
    // 移除宝石
    GameState.gems.socketed[itemId][socketIndex] = null;
    
    // 返回库存
    GameState.gems.inventory.push(gem);
    
    console.log(`[GemSystem] Unsocketed ${gem.type} gem from socket ${socketIndex}`);
    
    return { success: true, gem };
  }
  
  /**
   * 合成宝石 (3 → 1，提升品阶)
   */
  mergeGems(gemIds) {
    if (gemIds.length !== this.mergeConfig.input) {
      return { success: false, error: `Need ${this.mergeConfig.input} gems to merge` };
    }
    
    const gems = gemIds.map(id => this.findGemById(id)).filter(g => g);
    
    if (gems.length !== this.mergeConfig.input) {
      return { success: false, error: 'One or more gems not found' };
    }
    
    // 检查是否同类型同品阶
    const type = gems[0].type;
    const tier = gems[0].tier;
    
    if (!gems.every(g => g.type === type && g.tier === tier)) {
      return { success: false, error: 'All gems must be same type and tier' };
    }
    
    // 检查是否已达最高品阶
    if (tier >= this.gemTiers.length - 1) {
      return { success: false, error: 'Gems already at max tier' };
    }
    
    // 创建新宝石
    const newGem = this.generateGem(type, tier + 1);
    
    // 移除旧宝石
    gemIds.forEach(id => {
      const index = GameState.gems.inventory.findIndex(g => g.id === id);
      if (index !== -1) {
        GameState.gems.inventory.splice(index, 1);
      }
    });
    
    // 添加新宝石
    GameState.gems.inventory.push(newGem);
    
    console.log(`[GemSystem] Merged ${this.mergeConfig.input} ${type} gems, created ${this.gemTiers[newGem.tier]} tier`);
    
    return { success: true, newGem, consumed: gemIds };
  }
  
  /**
   * 获取装备的宝石加成
   */
  getItemGemStats(itemId) {
    const gems = GameState.gems.socketed[itemId] || [];
    const totalStats = {};
    const elements = [];
    
    gems.forEach(gem => {
      if (!gem) return;
      
      // 累加属性
      Object.keys(gem.stats).forEach(statKey => {
        totalStats[statKey] = (totalStats[statKey] || 0) + gem.stats[statKey];
      });
      
      // 收集元素
      if (gem.element && !elements.includes(gem.element)) {
        elements.push(gem.element);
      }
    });
    
    return { stats: totalStats, elements };
  }
  
  /**
   * 获取所有装备的宝石加成总和
   */
  getAllGemStats() {
    const totalStats = {};
    const elements = {};
    
    Object.keys(GameState.gems.socketed).forEach(itemId => {
      const itemStats = this.getItemGemStats(itemId);
      
      // 累加属性
      Object.keys(itemStats.stats).forEach(statKey => {
        totalStats[statKey] = (totalStats[statKey] || 0) + itemStats.stats[statKey];
      });
      
      // 统计元素权重
      itemStats.elements.forEach(element => {
        elements[element] = (elements[element] || 0) + 1;
      });
    });
    
    return { stats: totalStats, elements };
  }
  
  /**
   * 查找宝石
   */
  findGemById(gemId) {
    // 在库存中查找
    let gem = GameState.gems.inventory.find(g => g.id === gemId);
    
    // 在已镶嵌中查找
    if (!gem) {
      Object.values(GameState.gems.socketed).forEach(gems => {
        gems.forEach(g => {
          if (g && g.id === gemId) gem = g;
        });
      });
    }
    
    return gem;
  }
  
  /**
   * 查找装备
   */
  findItemById(itemId) {
    const inventory = GameState.equipment?.inventory || [];
    let item = inventory.find(i => i.id === itemId);
    
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
   * 获取装备插槽信息
   */
  getItemSocketInfo(itemId) {
    const item = this.findItemById(itemId);
    if (!item) return null;
    
    const maxSockets = this.sockets[item.slot] || 0;
    const socketed = GameState.gems.socketed[itemId] || [];
    const emptySlots = maxSockets - socketed.filter(g => g).length;
    
    return {
      maxSockets,
      socketed: socketed.filter(g => g),
      emptySlots,
      canSocket: emptySlots > 0
    };
  }
  
  /**
   * 获取可合成的宝石组
   */
  getMergeableGemGroups() {
    const groups = {};
    
    // 按类型和品阶分组
    GameState.gems.inventory.forEach(gem => {
      const key = `${gem.type}_${gem.tier}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(gem);
    });
    
    // 筛选出数量≥3的组
    const mergeable = [];
    Object.keys(groups).forEach(key => {
      if (groups[key].length >= this.mergeConfig.input) {
        const [type, tier] = key.split('_');
        if (parseInt(tier) < this.gemTiers.length - 1) {
          mergeable.push({
            type,
            tier: parseInt(tier),
            count: groups[key].length,
            gems: groups[key]
          });
        }
      }
    });
    
    return mergeable;
  }
  
  /**
   * 获取宝石显示名称
   */
  getGemDisplayName(gem, locale = 'zh') {
    const gemConfig = this.gemTypes[gem.type];
    if (!gemConfig) return gem.type;
    
    const tierName = this.gemTiers[gem.tier] || '';
    const typeName = gemConfig.name?.[locale] || gemConfig.name?.zh || gem.type;
    
    return `${tierName} ${typeName}`;
  }
}
