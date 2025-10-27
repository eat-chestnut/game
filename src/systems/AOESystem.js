import { GameState } from '../state/GameState.js';

export class AOESystem {
  constructor(scene, skillConfig) {
    this.scene = scene;
    this.skillDef = skillConfig?.skills?.find(s => s.id === 'aoe_blast');
    this.level = 0;
    this.timer = 0;
    this.interval = 8000;
    this.damageScale = 0.8;
  }

  setLevel(level) {
    this.level = level;
    if (!level) return;
    const intervals = this.skillDef?.perLevel?.intervalSec || [8, 8];
    const scales = this.skillDef?.perLevel?.damageScale || [0.8, 1.2];
    this.interval = (intervals[Math.min(level - 1, intervals.length - 1)] || 8) * 1000;
    this.damageScale = scales[Math.min(level - 1, scales.length - 1)] || 0.8;
    this.timer = this.interval;
  }

  update(delta) {
    if (!this.level) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      this.timer = this.interval;
      this.triggerBlast();
    }
  }

  triggerBlast() {
    const circle = this.scene.add.circle(this.scene.player.x, this.scene.player.y, 20, 0x6c5ce7, 0.2);
    circle.setDepth(60);
    const radius = GameState.globals.lowPowerMode ? 220 : 280;
    this.scene.tweens.add({
      targets: circle,
      radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy()
    });
    const damage = GameState.globals.baseDamage * GameState.globals.bulletDamageMultiplier * this.damageScale;
    this.scene.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
      if (dist <= radius) {
        const isBoss = enemy.getData?.('isBoss');
        const scale = isBoss ? (this.skillDef?.bossScale ?? 0.75) : 1;
        enemy.hp -= damage * scale;
        if (enemy.hp <= 0) {
          this.scene.handleEnemyKilled(enemy);
        }
      }
    });
    GameState.stats.aoeTriggers += 1;
    this.scene.cameras.main.shake(100, 0.002);
  }
}
