import { GameState } from '../state/GameState.js';

export class WaveSystem {
  constructor(scene) {
    this.scene = scene;
    this.toast = scene.toastManager;
    const interval = (GameState.config?.balance?.waves?.intervalSeconds ?? 30) * 1000;
    this.timer = scene.time.addEvent({ delay: interval, loop: true, callback: () => this.advanceWave() });
    scene.pauseSystem.registerTimer(this.timer);
  }

  advanceWave() {
    GameState.globals.wave += 1;
    const wavesCfg = GameState.config?.balance?.waves ?? {};
    const enemySpeedMul = wavesCfg.enemySpeedMulPerWave ?? 1.04;
    const enemyHpMul = wavesCfg.enemyHpMulPerWave ?? 1.06;
    const spawnRateMul = wavesCfg.spawnRateMulPerWave ?? 0.97;
    const spawnRateFloor = wavesCfg.spawnRateFloor ?? 0.3;
    this.scene.sceneVars.enemySpeed *= enemySpeedMul;
    this.scene.sceneVars.enemyHP *= enemyHpMul;
    this.scene.sceneVars.spawnRate = Math.max(spawnRateFloor, this.scene.sceneVars.spawnRate * spawnRateMul);
    this.scene.resetSpawnTimer();
    this.scene.updateWaveHud();
    this.toast?.show(`第 ${GameState.globals.wave} 波来袭`, 'info', 2500);
  }
}
