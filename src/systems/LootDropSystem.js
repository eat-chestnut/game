import { GameState } from '../state/GameState.js';

export class LootDropSystem {
  constructor(scene) {
    this.scene = scene;
    this.lootGroup = scene.physics.add.group();
    this.buffIndicator = null;
  }

  attemptDrop(x, y) {
    const baseChance = GameState.config?.balance?.drops?.energyOrbChance ?? 0.15;
    const shopBonus = GameState.globals.shopLootChanceBonus ?? 0;
    const finalChance = Math.min(baseChance + shopBonus, 0.50); // 上限 50%
    if (Math.random() > finalChance) return;
    this.spawnLoot(x, y, 'haste');
  }
  
  guaranteedDrop(x, y, count = 1) {
    // Boss/精英保底掉落
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      this.spawnLoot(x + offsetX, y + offsetY, 'haste');
    }
  }
  
  spawnLoot(x, y, type) {
    const loot = this.scene.physics.add.sprite(x, y, 'lootOrb');
    loot.setVelocity(0, 80);
    loot.setDataEnabled();
    loot.setData('type', type);
    loot.setDepth(30);
    this.lootGroup.add(loot);
  }

  collect(loot) {
    if (!loot.active) return;
    loot.disableBody(true, true);
    const dropsCfg = GameState.config?.balance?.drops ?? {};
    const multiplier = dropsCfg.hasteBuffFireRateMul ?? 0.75;
    const duration = (dropsCfg.hasteBuffDurationSec ?? 8) * 1000;
    GameState.hasteBuff.active = true;
    GameState.hasteBuff.expiresAt = this.scene.time.now + duration;
    GameState.hasteBuff.multiplier = multiplier;
    this.scene.onHasteBuffStart(multiplier);
    this.scene.audio?.playPickup();
    this.scene.toastManager?.show('连锁充能：攻速强化！', 'success');
    this.scene.updateBuffHud(true);
  }

  update(time) {
    if (GameState.hasteBuff.active && time > GameState.hasteBuff.expiresAt) {
      GameState.hasteBuff.active = false;
      this.scene.toastManager?.show('攻速强化结束', 'info');
      this.scene.updateBuffHud(false);
    }
  }
}
