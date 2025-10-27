import { GameState } from '../state/GameState.js';

/**
 * v7: 装备预设/换装系统
 * 支持保存和快速切换装备配置
 */
export class LoadoutSystem {
  constructor(scene, equipConfig) {
    this.scene = scene;
    this.maxLoadouts = equipConfig?.loadouts?.count || 3;
    
    // 初始化 loadouts
    if (!GameState.loadouts) {
      GameState.loadouts = {
        slots: [],
        activeSlot: -1
      };
      
      // 创建空槽位
      for (let i = 0; i < this.maxLoadouts; i++) {
        GameState.loadouts.slots.push({
          name: `预设 ${i + 1}`,
          equipped: {},
          settings: {
            sort: 'power',
            filter: {}
          },
          saved: false
        });
      }
    }
  }
  
  /**
   * 保存当前装备到指定槽位
   */
  saveLoadout(slotIndex, name = null) {
    if (slotIndex < 0 || slotIndex >= this.maxLoadouts) {
      console.error('[Loadout] Invalid slot index:', slotIndex);
      return false;
    }
    
    if (!GameState.equipment) {
      console.error('[Loadout] No equipment data');
      return false;
    }
    
    const loadout = GameState.loadouts.slots[slotIndex];
    
    // 保存当前装备状态
    loadout.equipped = JSON.parse(JSON.stringify(GameState.equipment.equipped || {}));
    loadout.settings = JSON.parse(JSON.stringify(GameState.equipment.settings || {}));
    loadout.saved = true;
    
    if (name) {
      loadout.name = name;
    }
    
    GameState.loadouts.activeSlot = slotIndex;
    
    console.log(`[Loadout] Saved to slot ${slotIndex}:`, loadout.name);
    return true;
  }
  
  /**
   * 从指定槽位加载装备
   */
  loadLoadout(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.maxLoadouts) {
      console.error('[Loadout] Invalid slot index:', slotIndex);
      return false;
    }
    
    const loadout = GameState.loadouts.slots[slotIndex];
    
    if (!loadout.saved) {
      console.warn('[Loadout] Slot not saved:', slotIndex);
      return false;
    }
    
    if (!GameState.equipment) {
      console.error('[Loadout] No equipment data');
      return false;
    }
    
    // 卸下当前所有装备到背包
    this.unequipAll();
    
    // 装备预设中的装备
    Object.entries(loadout.equipped).forEach(([slot, itemId]) => {
      if (itemId && this.scene.equipmentSystem) {
        // 检查装备是否在背包中
        const item = GameState.equipment.inventory.find(i => i.id === itemId);
        if (item) {
          this.scene.equipmentSystem.equipItem(itemId);
        } else {
          console.warn(`[Loadout] Item ${itemId} not found in inventory`);
        }
      }
    });
    
    // 恢复设置
    if (loadout.settings) {
      GameState.equipment.settings = JSON.parse(JSON.stringify(loadout.settings));
    }
    
    GameState.loadouts.activeSlot = slotIndex;
    
    // 重新计算数值
    if (this.scene.equipmentSystem) {
      this.scene.equipmentSystem.recalculateStats();
    }
    
    // 刷新 HUD
    if (this.scene.updateHud) {
      this.scene.updateHud();
    }
    
    console.log(`[Loadout] Loaded from slot ${slotIndex}:`, loadout.name);
    return true;
  }
  
  /**
   * 卸下所有装备到背包
   */
  unequipAll() {
    if (!GameState.equipment || !GameState.equipment.equipped) return;
    
    const equipped = { ...GameState.equipment.equipped };
    
    Object.keys(equipped).forEach(slot => {
      if (this.scene.equipmentSystem) {
        this.scene.equipmentSystem.unequipItem(slot);
      }
    });
  }
  
  /**
   * 删除指定槽位的预设
   */
  deleteLoadout(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.maxLoadouts) {
      console.error('[Loadout] Invalid slot index:', slotIndex);
      return false;
    }
    
    const loadout = GameState.loadouts.slots[slotIndex];
    loadout.equipped = {};
    loadout.settings = { sort: 'power', filter: {} };
    loadout.saved = false;
    loadout.name = `预设 ${slotIndex + 1}`;
    
    if (GameState.loadouts.activeSlot === slotIndex) {
      GameState.loadouts.activeSlot = -1;
    }
    
    console.log(`[Loadout] Deleted slot ${slotIndex}`);
    return true;
  }
  
  /**
   * 重命名预设
   */
  renameLoadout(slotIndex, newName) {
    if (slotIndex < 0 || slotIndex >= this.maxLoadouts) {
      console.error('[Loadout] Invalid slot index:', slotIndex);
      return false;
    }
    
    GameState.loadouts.slots[slotIndex].name = newName;
    console.log(`[Loadout] Renamed slot ${slotIndex} to:`, newName);
    return true;
  }
  
  /**
   * 获取所有预设
   */
  getAllLoadouts() {
    return GameState.loadouts.slots.map((slot, index) => ({
      index,
      name: slot.name,
      saved: slot.saved,
      active: GameState.loadouts.activeSlot === index,
      equippedCount: Object.keys(slot.equipped).length
    }));
  }
  
  /**
   * 获取当前激活的预设索引
   */
  getActiveLoadoutIndex() {
    return GameState.loadouts.activeSlot;
  }
  
  /**
   * 快速切换到下一个预设
   */
  switchToNext() {
    const savedSlots = GameState.loadouts.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.saved);
    
    if (savedSlots.length === 0) {
      console.warn('[Loadout] No saved loadouts to switch');
      return false;
    }
    
    const currentIndex = GameState.loadouts.activeSlot;
    const currentPos = savedSlots.findIndex(({ index }) => index === currentIndex);
    const nextPos = (currentPos + 1) % savedSlots.length;
    const nextSlot = savedSlots[nextPos];
    
    return this.loadLoadout(nextSlot.index);
  }
  
  /**
   * 快速切换到上一个预设
   */
  switchToPrevious() {
    const savedSlots = GameState.loadouts.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.saved);
    
    if (savedSlots.length === 0) {
      console.warn('[Loadout] No saved loadouts to switch');
      return false;
    }
    
    const currentIndex = GameState.loadouts.activeSlot;
    const currentPos = savedSlots.findIndex(({ index }) => index === currentIndex);
    const prevPos = (currentPos - 1 + savedSlots.length) % savedSlots.length;
    const prevSlot = savedSlots[prevPos];
    
    return this.loadLoadout(prevSlot.index);
  }
  
  /**
   * 验证预设数据有效性
   */
  validateLoadout(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.maxLoadouts) {
      return { valid: false, reason: 'Invalid slot index' };
    }
    
    const loadout = GameState.loadouts.slots[slotIndex];
    
    if (!loadout.saved) {
      return { valid: false, reason: 'Loadout not saved' };
    }
    
    // 检查装备是否都存在
    const missingItems = [];
    Object.entries(loadout.equipped).forEach(([slot, itemId]) => {
      if (itemId) {
        const item = GameState.equipment.inventory.find(i => i.id === itemId);
        if (!item) {
          missingItems.push(itemId);
        }
      }
    });
    
    if (missingItems.length > 0) {
      return { 
        valid: false, 
        reason: 'Missing items', 
        missingItems 
      };
    }
    
    return { valid: true };
  }
}
