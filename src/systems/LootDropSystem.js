import { GameState } from '../state/GameState.js';

export class LootDropSystem {
  constructor(scene) {
    this.scene = scene;
    this.lootGroup = scene.physics.add.group();
    this.buffIndicator = null;
  }

  attemptDrop(x, y) {
    const chance = GameState.config?.balance?.drops?.energyOrbChance ?? 0.15;
    if (Math.random() > chance) return;
    const loot = this.scene.physics.add.sprite(x, y, 'lootOrb');
    loot.setVelocity(0, 80);
    loot.setDataEnabled();
    loot.setData('type', 'haste');
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
