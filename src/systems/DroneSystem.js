import { GameState } from '../state/GameState.js';

export class DroneSystem {
  constructor(scene, skillConfig) {
    this.scene = scene;
    this.skillDef = skillConfig?.skills?.find(s => s.id === 'summon_drone');
    this.level = 0;
    this.drones = [];
    this.bullets = scene.physics.add.group();
    scene.physics.add.overlap(this.bullets, scene.enemies, (bullet, enemy) => {
      if (!bullet.active || !enemy.active) return;
      enemy.hp -= bullet.getData('damage');
      if (enemy.hp <= 0) scene.handleEnemyKilled(enemy);
      bullet.destroy();
    });
  }

  setLevel(level) {
    this.level = level;
    this.configureDrones();
  }

  configureDrones() {
    this.drones.forEach(drone => drone.sprite.destroy());
    this.drones = [];
    if (!this.level) return;
    const counts = this.skillDef?.perLevel?.droneCount || [1, 2, 3];
    const fireIntervals = this.skillDef?.perLevel?.fireIntervalSec || [1.2, 0.8, 0.6];
    const count = counts[Math.min(this.level - 1, counts.length - 1)];
    const interval = fireIntervals[Math.min(this.level - 1, fireIntervals.length - 1)] * 1000;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const sprite = this.scene.add.rectangle(0, 0, 16, 16, 0x00d1b2);
      sprite.setDepth(70);
      this.drones.push({ sprite, angle, cooldown: interval, interval });
    }
  }

  update(delta) {
    if (!this.level || !this.drones.length) return;
    const player = this.scene.player;
    const radius = 80;
    this.drones.forEach(drone => {
      drone.angle += delta * 0.001;
      const x = player.x + Math.cos(drone.angle) * radius;
      const y = player.y + Math.sin(drone.angle) * radius;
      drone.sprite.setPosition(x, y);
      drone.cooldown -= delta;
      if (drone.cooldown <= 0) {
        drone.cooldown = drone.interval;
        this.fire(drone.sprite);
      }
    });
    this.bullets.children.iterate(bullet => {
      if (!bullet || !bullet.active) return;
      if (this.scene.time.now - bullet.birth > 2000) {
        bullet.destroy();
      }
    });
  }

  fire(originSprite) {
    const target = this.scene.autoAim?.getTarget();
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(originSprite.x, originSprite.y, target.x, target.y);
    const bullet = this.scene.physics.add.sprite(originSprite.x, originSprite.y, 'splitBullet');
    bullet.birth = this.scene.time.now;
    bullet.setDepth(71);
    bullet.body.setAllowGravity(false);
    const speed = GameState.globals.lowPowerMode ? 520 : 600;
    this.scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    const damage = GameState.globals.baseDamage * GameState.globals.bulletDamageMultiplier * 0.5;
    bullet.setDataEnabled();
    bullet.setData('damage', damage);
    this.bullets.add(bullet);
  }
}
