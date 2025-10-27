import { SaveManager } from '../state/SaveManager.js';

const goals = {
  totalKills: [100, 300, 800],
  highestWave: [5, 10, 20],
  highScore: [1000, 5000, 15000]
};

export class AchievementSystem {
  constructor(scene) {
    this.scene = scene;
    this.unlocked = new Set(SaveManager.data.achievementsUnlocked || []);
  }

  check(stats) {
    this.checkMetric('totalKills', stats.totalKills);
    this.checkMetric('highestWave', stats.wave);
    this.checkMetric('highScore', stats.score);
  }

  checkMetric(key, value) {
    if (!goals[key]) return;
    goals[key].forEach(target => {
      const id = `${key}_${target}`;
      if (this.unlocked.has(id)) return;
      if (value >= target) {
        this.unlocked.add(id);
        this.scene.toastManager?.show(`成就达成：${key} ${target}`, 'success');
      }
    });
    SaveManager.save({ achievementsUnlocked: Array.from(this.unlocked) });
  }
}
