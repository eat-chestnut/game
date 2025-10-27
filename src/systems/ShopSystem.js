import { GameState } from '../state/GameState.js';
import { SaveManager } from '../state/SaveManager.js';

/**
 * ShopSystem - 商店系统（基础版）
 * 商店项目：
 * - BulletDamage: +8% 伤害乘区
 * - FireRateCap: 将 minFireRate 从 0.60 提升到 0.55（仅一次）
 * - LootChance: +3% 掉落概率（上限 30%）
 * 
 * 商店数值只对新开局生效，并持久化
 */
export class ShopSystem {
  constructor() {
    this.shopData = SaveManager.data.shop ?? this.getDefaultShop();
  }

  getDefaultShop() {
    return {
      bulletDamageLevel: 0,
      bulletDamageMax: 10,
      bulletDamageCost: 50,
      bulletDamagePerLevel: 0.08,
      
      fireRateCapBought: false,
      fireRateCapCost: 200,
      fireRateCapValue: 0.55,
      
      lootChanceLevel: 0,
      lootChanceMax: 10,
      lootChanceCost: 30,
      lootChancePerLevel: 0.03,
      lootChanceMaxBonus: 0.30
    };
  }

  loadShop() {
    const saved = SaveManager.data.shop;
    if (saved) {
      this.shopData = { ...this.getDefaultShop(), ...saved };
    }
    this.saveShop();
  }

  saveShop() {
    SaveManager.save({ shop: { ...this.shopData } });
  }

  canBuy(item) {
    const coins = GameState.globals.coins;
    switch (item) {
      case 'bulletDamage':
        return this.shopData.bulletDamageLevel < this.shopData.bulletDamageMax &&
               coins >= this.shopData.bulletDamageCost;
      case 'fireRateCap':
        return !this.shopData.fireRateCapBought &&
               coins >= this.shopData.fireRateCapCost;
      case 'lootChance':
        return this.shopData.lootChanceLevel < this.shopData.lootChanceMax &&
               coins >= this.shopData.lootChanceCost;
      default:
        return false;
    }
  }

  buy(item) {
    if (!this.canBuy(item)) return false;

    switch (item) {
      case 'bulletDamage':
        GameState.globals.coins -= this.shopData.bulletDamageCost;
        this.shopData.bulletDamageLevel += 1;
        this.saveShop();
        return true;

      case 'fireRateCap':
        GameState.globals.coins -= this.shopData.fireRateCapCost;
        this.shopData.fireRateCapBought = true;
        this.saveShop();
        return true;

      case 'lootChance':
        GameState.globals.coins -= this.shopData.lootChanceCost;
        this.shopData.lootChanceLevel += 1;
        this.saveShop();
        return true;

      default:
        return false;
    }
  }

  getShopItems() {
    return [
      {
        id: 'bulletDamage',
        name: '伤害提升',
        description: `子弹基础伤害 +${(this.shopData.bulletDamagePerLevel * 100).toFixed(0)}%`,
        cost: this.shopData.bulletDamageCost,
        level: this.shopData.bulletDamageLevel,
        maxLevel: this.shopData.bulletDamageMax,
        available: this.canBuy('bulletDamage')
      },
      {
        id: 'fireRateCap',
        name: '攻速上限突破',
        description: `将最低开火间隔从 0.60s 降至 ${this.shopData.fireRateCapValue}s`,
        cost: this.shopData.fireRateCapCost,
        level: this.shopData.fireRateCapBought ? 1 : 0,
        maxLevel: 1,
        available: this.canBuy('fireRateCap')
      },
      {
        id: 'lootChance',
        name: '掉落概率',
        description: `能量球掉落概率 +${(this.shopData.lootChancePerLevel * 100).toFixed(0)}%（当前 +${(this.shopData.lootChanceLevel * this.shopData.lootChancePerLevel * 100).toFixed(0)}%）`,
        cost: this.shopData.lootChanceCost,
        level: this.shopData.lootChanceLevel,
        maxLevel: this.shopData.lootChanceMax,
        available: this.canBuy('lootChance')
      }
    ];
  }

  // 在游戏开始时应用商店加成
  applyShopBonuses() {
    // 伤害加成
    const damageBonus = 1 + (this.shopData.bulletDamageLevel * this.shopData.bulletDamagePerLevel);
    GameState.globals.shopDamageMultiplier = damageBonus;

    // 攻速上限
    if (this.shopData.fireRateCapBought) {
      GameState.globals.minFireRate = this.shopData.fireRateCapValue;
    }

    // 掉落概率加成
    const lootBonus = Math.min(
      this.shopData.lootChanceLevel * this.shopData.lootChancePerLevel,
      this.shopData.lootChanceMaxBonus
    );
    GameState.globals.shopLootChanceBonus = lootBonus;
  }
}
