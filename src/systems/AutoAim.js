export class AutoAimSystem {
  constructor(scene) {
    this.scene = scene;
    this.timer = 0;
    this.nearest = null;
  }

  update(delta) {
    this.timer += delta;
    if (this.timer >= 50) {
      this.timer = 0;
      this.scan();
    }
  }

  scan() {
    const player = this.scene.player;
    if (!player) return;
    let closest = null;
    let closestDist = Number.MAX_SAFE_INTEGER;
    this.scene.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active) return;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestDist) {
        closestDist = distSq;
        closest = enemy;
      }
    });
    this.nearest = closest;
  }

  getTarget() {
    return this.nearest;
  }
}
