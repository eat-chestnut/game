import { GameState } from '../state/GameState.js';

/**
 * v6.1: 装备系统
 * 处理装备生成、掉落、穿戴、分解、锻造与数值融合
 */
export class EquipmentSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config || {};
    this.slots = this.config.slots || ['Weapon', 'Core', 'Module', 'Charm'];
    this.rarity = this.config.rarity || [];
    this.affixes = this.config.affixes || {};
    this.craft = this.config.craft || {};
    this.drop = this.config.drop || {};
    this.ui = this.config.ui || {};
    this.rules = this.config.rules || {};
    this.sets = this.config.sets || {};
    this.affixLocks = this.config.affixLocks || { baseCost: 2, costMultiplierPerLock: 2 };
    
    // 初始化全局变量
    if (!GameState.equipment) {
      GameState.equipment = {
        inventory: [],
        equipped: {},
        equippedItems: {}, // v7: 存储已装备的完整数据
        shards: 0,
        settings: {
          autoSalvage: this.ui.autoSalvage || ['Common'],
          sort: 'power',
          filter: {}
        }
      };
    }
    
    this.nextItemId = 1;
  }
  
  // v7: 生成装备（支持套装）
  generateEquipment(rarityId = null, slotId = null, setId = null) {
    // 1. 确定稀有度
    let rarity;
    if (rarityId) {
      rarity = this.rarity.find(r => r.id === rarityId);
    } else {
      // 随机roll稀有度
      const roll = Math.random();
      let accumulated = 0;
      for (const r of this.rarity) {
        accumulated += r.drop;
        if (roll <= accumulated) {
          rarity = r;
          break;
        }
      }
      if (!rarity) rarity = this.rarity[0]; // fallback
    }
    
    // 2. 确定槽位
    const slot = slotId || this.slots[Math.floor(Math.random() * this.slots.length)];
    
    // 3. 生成词缀
    const affixList = this.rollAffixes(rarity.tier);
    
    // 4. 计算 powerScore
    const powerScore = this.calculatePowerScore(affixList);
    
    // v7: 随机分配套装（概率30%）
    if (!setId && Math.random() < 0.3 && Object.keys(this.sets).length > 0) {
      const setIds = Object.keys(this.sets);
      setId = setIds[Math.floor(Math.random() * setIds.length)];
    }
    
    const item = {
      id: this.nextItemId++,
      slot,
      rarity: rarity.id,
      color: rarity.color,
      tier: rarity.tier,
      affixes: affixList,
      affixLocks: {}, // v7: 词缀锁定状态
      powerScore,
      name: `${rarity.id} ${slot}`,
      locked: false,
      setId: setId || null // v7: 套装 ID
    };
    
    console.log(`[Equipment] Generated: ${item.name} (Power: ${powerScore})`);
    return item;
  }
  
  // 随机roll词缀
  rollAffixes(tier) {
    const affixNames = Object.keys(this.affixes);
    const rolls = tier; // Common=1, Rare=2, Epic=3, Legend=4
    const result = {};
    
    for (let i = 0; i < rolls; i++) {
      const affixName = affixNames[Math.floor(Math.random() * affixNames.length)];
      const affixData = this.affixes[affixName];
      
      if (!affixData) continue;
      
      const min = affixData.min[tier - 1] || 0;
      const max = affixData.max[tier - 1] || 0;
      const value = min + Math.random() * (max - min);
      
      // 如果已存在相同词缀，取最大值（或叠加，根据需求）
      if (result[affixName]) {
        result[affixName] = Math.max(result[affixName], value);
      } else {
        result[affixName] = value;
      }
    }
    
    return result;
  }
  
  // 计算装备评分
  calculatePowerScore(affixes) {
    let score = 0;
    const weights = {
      flatDamage: 2.0,
      damageMulPct: 1.5,
      fireRatePct: 1.8,
      penetrationPlus: 3.0,
      reboundPlus: 3.0,
      splitChildPct: 1.2,
      aoeScalePct: 1.3,
      droneDmgPct: 1.3,
      shieldCDPct: 1.4,
      lootChancePct: 1.0
    };
    
    Object.keys(affixes).forEach(key => {
      const value = Math.abs(affixes[key]);
      const weight = weights[key] || 1.0;
      score += value * weight;
    });
    
    return Math.round(score);
  }
  
  // 装备掉落判定
  tryDrop(enemy) {
    if (!enemy) return;
    
    let chance = this.drop.baseChance || 0.12;
    
    // 精英额外加成
    if (enemy.isElite) {
      chance += this.drop.eliteBonus || 0.18;
    }
    
    // Boss 保底
    if (enemy.isBoss) {
      chance = Math.max(chance, this.drop.bossBonus || 0.60);
    }
    
    if (Math.random() < chance) {
      const item = this.generateEquipment();
      this.handleDrop(item, enemy.x, enemy.y);
    }
  }
  
  // 处理掉落
  handleDrop(item, x, y) {
    // 检查是否自动分解
    const autoSalvage = GameState.equipment.settings.autoSalvage || [];
    if (autoSalvage.includes(item.rarity)) {
      this.salvageItem(item);
      this.scene.toastManager?.show(`自动分解: ${item.name} → ${this.getSalvageValue(item.rarity)} 残片`, 'info', 1500);
      return;
    }
    
    // 检查背包空间
    const maxBag = this.ui.maxBag || 24;
    if (GameState.equipment.inventory.length >= maxBag) {
      this.scene.toastManager?.show('背包已满！装备丢失', 'danger', 2000);
      return;
    }
    
    // 添加到背包
    GameState.equipment.inventory.push(item);
    
    // 显示拾取提示
    if (this.scene.add) {
      const text = this.scene.add.text(x, y, `+${item.name}`, {
        fontSize: '14px',
        color: item.color,
        stroke: '#000',
        strokeThickness: 2
      }).setDepth(200);
      
      this.scene.tweens.add({
        targets: text,
        y: y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => text.destroy()
      });
    }
    
    this.scene.toastManager?.show(`获得装备: ${item.name}`, 'success', 2000);
  }
  
  // v7: 穿戴装备（存储完整数据）
  equipItem(itemId) {
    const item = GameState.equipment.inventory.find(i => i.id === itemId);
    if (!item) return false;
    
    // 卸下当前槽位的装备
    const currentEquipped = GameState.equipment.equipped[item.slot];
    if (currentEquipped) {
      this.unequipItem(item.slot);
    }
    
    // 穿戴新装备
    GameState.equipment.equipped[item.slot] = itemId;
    
    // v7: 存储完整装备数据
    if (!GameState.equipment.equippedItems) {
      GameState.equipment.equippedItems = {};
    }
    GameState.equipment.equippedItems[itemId] = JSON.parse(JSON.stringify(item));
    
    // 从背包移除
    GameState.equipment.inventory = GameState.equipment.inventory.filter(i => i.id !== itemId);
    
    // 重新计算数值
    this.recalculateStats();
    
    console.log(`[Equipment] Equipped: ${item.name} to ${item.slot}`);
    return true;
  }
  
  // v7: 卸下装备
  unequipItem(slot) {
    const itemId = GameState.equipment.equipped[slot];
    if (!itemId) return false;
    
    // v7: 从 equippedItems 获取完整数据
    const item = GameState.equipment.equippedItems?.[itemId];
    if (item) {
      // 检查背包空间
      const maxBag = this.ui.maxBag || 24;
      if (GameState.equipment.inventory.length >= maxBag) {
        console.warn('[Equipment] Inventory full, cannot unequip');
        return false;
      }
      
      GameState.equipment.inventory.push(item);
      delete GameState.equipment.equippedItems[itemId];
    }
    
    // 从已装备移除
    delete GameState.equipment.equipped[slot];
    
    // 重新计算数值
    this.recalculateStats();
    
    console.log(`[Equipment] Unequipped from ${slot}`);
    return true;
  }
  
  // 分解装备
  salvageItem(item) {
    const value = this.getSalvageValue(item.rarity);
    GameState.equipment.shards += value;
    console.log(`[Equipment] Salvaged ${item.name} → +${value} shards (Total: ${GameState.equipment.shards})`);
  }
  
  getSalvageValue(rarity) {
    return this.craft.salvagePerRarity?.[rarity] || 1;
  }
  
  // 锻造装备
  forgeEquipment(rarity) {
    const cost = this.craft.forgeCosts?.[rarity];
    if (!cost) return null;
    
    if (GameState.equipment.shards < cost) {
      console.warn('[Equipment] Not enough shards for forge');
      return null;
    }
    
    GameState.equipment.shards -= cost;
    const item = this.generateEquipment(rarity);
    
    console.log(`[Equipment] Forged ${item.name} for ${cost} shards`);
    return item;
  }
  
  // v7: 重铸装备（支持词缀锁定）
  rerollItem(itemId, withLocks = false) {
    const item = GameState.equipment.inventory.find(i => i.id === itemId);
    if (!item) return false;
    
    // v7: 计算成本（基础成本 × 锁定数量）
    const lockedCount = withLocks ? Object.values(item.affixLocks || {}).filter(Boolean).length : 0;
    const cost = this.affixLocks.baseCost * Math.pow(this.affixLocks.costMultiplierPerLock, lockedCount);
    
    if (GameState.equipment.shards < cost) {
      console.warn('[Equipment] Not enough shards for reroll');
      return false;
    }
    
    GameState.equipment.shards -= cost;
    
    // v7: 重新roll词缀（保留锁定的）
    if (withLocks && item.affixLocks) {
      const newAffixes = this.rollAffixes(item.tier);
      
      // 保留锁定的词缀
      Object.keys(item.affixLocks).forEach(affixKey => {
        if (item.affixLocks[affixKey] && item.affixes[affixKey] !== undefined) {
          newAffixes[affixKey] = item.affixes[affixKey];
        }
      });
      
      item.affixes = newAffixes;
    } else {
      item.affixes = this.rollAffixes(item.tier);
    }
    
    item.powerScore = this.calculatePowerScore(item.affixes);
    
    console.log(`[Equipment] Rerolled ${item.name} for ${cost} shards (${lockedCount} locked)`);
    return true;
  }
  
  // v7: 锁定/解锁词缀
  toggleAffixLock(itemId, affixKey) {
    const item = GameState.equipment.inventory.find(i => i.id === itemId);
    if (!item || !item.affixes[affixKey]) return false;
    
    if (!item.affixLocks) {
      item.affixLocks = {};
    }
    
    item.affixLocks[affixKey] = !item.affixLocks[affixKey];
    console.log(`[Equipment] ${item.affixLocks[affixKey] ? 'Locked' : 'Unlocked'} affix ${affixKey} on ${item.name}`);
    return true;
  }
  
  // v7: 批量分解
  salvageMultiple(itemIds) {
    if (!Array.isArray(itemIds)) return 0;
    
    let totalShards = 0;
    const salvaged = [];
    
    itemIds.forEach(itemId => {
      const item = GameState.equipment.inventory.find(i => i.id === itemId);
      if (item && !item.locked) {
        const value = this.getSalvageValue(item.rarity);
        totalShards += value;
        salvaged.push(item.name);
        
        // 从背包移除
        GameState.equipment.inventory = GameState.equipment.inventory.filter(i => i.id !== itemId);
      }
    });
    
    GameState.equipment.shards += totalShards;
    console.log(`[Equipment] Batch salvaged ${salvaged.length} items → +${totalShards} shards`);
    
    return totalShards;
  }
  
  // 查找已装备的装备
  findEquippedItem(itemId) {
    // 从装备槽位反查
    for (const slot of this.slots) {
      if (GameState.equipment.equipped[slot] === itemId) {
        // 需要从某处恢复装备数据（简化处理）
        return { id: itemId, slot };
      }
    }
    return null;
  }
  
  // 重新计算装备提供的数值
  recalculateStats() {
    const stats = {
      flatDamage: 0,
      damageMulPct: 0,
      fireRatePct: 0,
      penetrationPlus: 0,
      reboundPlus: 0,
      splitChildPct: 0,
      aoeScalePct: 0,
      droneDmgPct: 0,
      shieldCDPct: 0,
      lootChancePct: 0
    };
    
    // 遍历已装备的装备
    Object.values(GameState.equipment.equipped).forEach(itemId => {
      const item = this.findItemById(itemId);
      if (!item || !item.affixes) return;
      
      Object.keys(item.affixes).forEach(affixKey => {
        if (stats[affixKey] !== undefined) {
          stats[affixKey] += item.affixes[affixKey];
        }
      });
    });
    
    // 应用上限
    if (this.rules.maxTotalDamageMulFromEquip) {
      stats.damageMulPct = Math.min(stats.damageMulPct, this.rules.maxTotalDamageMulFromEquip * 100);
    }
    if (this.rules.maxPenetrationFromEquip) {
      stats.penetrationPlus = Math.min(stats.penetrationPlus, this.rules.maxPenetrationFromEquip);
    }
    if (this.rules.maxReboundFromEquip) {
      stats.reboundPlus = Math.min(stats.reboundPlus, this.rules.maxReboundFromEquip);
    }
    if (this.rules.maxSplitChildBonus) {
      stats.splitChildPct = Math.min(stats.splitChildPct, this.rules.maxSplitChildBonus * 100);
    }
    
    // 存储到全局状态
    GameState.equipmentStats = stats;
    
    console.log('[Equipment] Stats recalculated:', stats);
    return stats;
  }
  
  // 查找装备（背包+已装备）
  findItemById(itemId) {
    // 先在背包里找
    let item = GameState.equipment.inventory.find(i => i.id === itemId);
    if (item) return item;
    
    // 再在已装备里找（需要完整数据结构）
    // 简化处理：假设装备数据也存储在某处
    return null;
  }
  
  // 获取所有装备提供的修正值
  getEquipmentModifier(type) {
    const stats = GameState.equipmentStats || {};
    
    switch (type) {
      case 'damage':
        return {
          flat: stats.flatDamage || 0,
          multiplier: 1 + (stats.damageMulPct || 0) / 100
        };
      case 'fireRate':
        return 1 + (stats.fireRatePct || 0) / 100;
      case 'penetration':
        return stats.penetrationPlus || 0;
      case 'rebound':
        return stats.reboundPlus || 0;
      case 'splitChild':
        return 1 + (stats.splitChildPct || 0) / 100;
      case 'aoe':
        return 1 + (stats.aoeScalePct || 0) / 100;
      case 'drone':
        return 1 + (stats.droneDmgPct || 0) / 100;
      case 'shieldCD':
        return 1 + (stats.shieldCDPct || 0) / 100;
      case 'loot':
        return 1 + (stats.lootChancePct || 0) / 100;
      default:
        return 1;
    }
  }
}
