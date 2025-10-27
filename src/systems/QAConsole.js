import { UIFactory } from '../ui/UIFactory.js';
import { ThemeTokens, themeColor } from '../theme.js';
import { GameState } from '../state/GameState.js';

export class QAConsole {
  constructor(scene, skillSystem) {
    this.scene = scene;
    this.skillSystem = skillSystem;
    this.uiFactory = new UIFactory(scene);
    this.container = scene.add.container(120, 1450).setDepth(200);
    this.lastDelta = 16;
    this.deltaSamples = [];
    this.rngSeed = null;
    this.lowPerfTriggered = false;
    this.observationMode = false; // 数值观察模式
    this.build();
  }

  build() {
    const bg = this.scene.add.rectangle(0, 0, 220, 300, 0x000000, 0.4);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(1, themeColor(ThemeTokens.color.primary), 0.4);
    const btnSpawn = this.uiFactory.createButton('Spawn50', { width: 180, height: 32, variant: 'primary' });
    btnSpawn.setPosition(0, -130);
    btnSpawn.on('pointerup', () => this.spawn50());
    const btnLevel = this.uiFactory.createButton('Level10', { width: 180, height: 32, variant: 'accent' });
    btnLevel.setPosition(0, -92);
    btnLevel.on('pointerup', () => this.levelTo10());
    const btnSpread = this.uiFactory.createButton('SpreadTest', { width: 180, height: 32, variant: 'primary' });
    btnSpread.setPosition(0, -54);
    btnSpread.on('pointerup', () => this.spreadTest());
    const btnStress = this.uiFactory.createButton('Stress3x', { width: 88, height: 28, variant: 'accent' });
    btnStress.setPosition(-60, -18);
    btnStress.on('pointerup', () => this.stressTest());
    const btnTouch = this.uiFactory.createButton('TouchTest', { width: 88, height: 28, variant: 'primary' });
    btnTouch.setPosition(40, -18);
    btnTouch.on('pointerup', () => this.touchTest());
    const btnObserve = this.uiFactory.createButton('Observe', { width: 180, height: 28, variant: 'primary' });
    btnObserve.setPosition(0, 18);
    btnObserve.on('pointerup', () => this.toggleObservation());
    // v5: 无人机 AI 切换
    const btnDroneAI = this.uiFactory.createButton('DroneAI', { width: 88, height: 28, variant: 'accent' });
    btnDroneAI.setPosition(-60, 52);
    btnDroneAI.on('pointerup', () => this.toggleDroneAI());
    // v5: RNG 重放
    const btnRNGReplay = this.uiFactory.createButton('RNG', { width: 88, height: 28, variant: 'primary' });
    btnRNGReplay.setPosition(40, 52);
    btnRNGReplay.on('pointerup', () => this.rngReplay());
    
    this.metricsText = this.scene.add.text(0, 165, '', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '12px',
      color: ThemeTokens.color.textMuted,
      align: 'center'
    }).setOrigin(0.5);
    this.container.add([bg, btnSpawn, btnLevel, btnSpread, btnStress, btnTouch, btnObserve, btnDroneAI, btnRNGReplay, this.metricsText]);
  }

  spawn50() {
    for (let i = 0; i < 50; i++) {
      this.scene.spawnEnemy(true);
    }
    this.logSnapshot('Spawn50');
  }

  levelTo10() {
    GameState.globals.level = 10;
    GameState.globals.killCount = GameState.globals.nextLevelKills;
    this.scene.toastManager?.show('QA: Level 10 reached', 'info');
    this.skillSystem.recalcShotPattern();
    const fireRate = this.scene.getEffectiveFireRate();
    if (fireRate < GameState.globals.minFireRate) {
      console.warn('QA assertion failed: fireRate below minimum');
    }
    this.logSnapshot('LevelUpTo10');
  }

  spreadTest() {
    GameState.skillState.scatter = 2;
    GameState.skillState.multi_shot = 3;
    this.skillSystem.recalcShotPattern();
    const pattern = GameState.globals.baseShotPattern;
    const expected = Math.max(1.2, Math.pow(1.1, 3));
    console.log('SpreadTest => totalMultiplier', pattern.totalMultiplier, 'expected', expected, 'angles', pattern.angles);
    console.assert(Math.abs(pattern.totalMultiplier - expected) < 0.01, 'QA: total multiplier mismatch');
    this.logSnapshot('SpreadTest');
  }

  updateMetrics(delta) {
    this.lastDelta = delta;
    if (delta > 0) {
      this.deltaSamples.push(delta);
      if (this.deltaSamples.length > 240) this.deltaSamples.shift();
    }
    const fps = delta > 0 ? Math.round(1000 / delta) : 0;
    const pattern = GameState.globals.baseShotPattern;
    const fireRate = this.scene.getEffectiveFireRate().toFixed(2);
    const totalMul = pattern.totalMultiplier.toFixed(2);
    const p50 = this.getFpsPercentile(0.5);
    const p95 = this.getFpsPercentile(0.95);
    
    // 自动性能降级检测
    if (!this.lowPerfTriggered && p95 > 0 && p95 < 50 && this.deltaSamples.length >= 180) {
      this.lowPerfTriggered = true;
      GameState.globals.lowPowerMode = true;
      this.scene.toastManager?.show('性能不足，已启用低功耗模式', 'warning', 3000);
      console.warn('[QA] Auto-enabled lowPowerMode due to P95 FPS < 50');
    }
    
    if (this.observationMode) {
      const obs = this.getDetailedObservation();
      this.metricsText.setText(`FPS:${fps} p50:${p50} p95:${p95}\nfR:${fireRate}s dmg:×${GameState.globals.bulletDamageMultiplier.toFixed(2)}\nshots:${pattern.angles.length} mul:${totalMul}\npen:${GameState.skillState.penetration} reb:${GameState.skillState.rebound}\nsplit:${this.scene.splitBulletCount}/${this.scene.maxSplitBullets}`);
    } else {
      this.metricsText.setText(`FPS:${fps} p50:${p50} p95:${p95}\nfireRate:${fireRate}s\nshots:${pattern.angles.length}\ntotalMul:${totalMul}`);
    }
  }

  getMetricsSnapshot() {
    const fps = this.lastDelta > 0 ? Math.round(1000 / this.lastDelta) : 0;
    return {
      fps,
      p50: this.getFpsPercentile(0.5),
      p95: this.getFpsPercentile(0.95),
      fireRate: Number(this.scene.getEffectiveFireRate().toFixed(2)),
      totalMultiplier: Number(GameState.globals.baseShotPattern.totalMultiplier.toFixed(2)),
      level: GameState.globals.level,
      skills: { ...GameState.skillState }
    };
  }

  logSnapshot(label) {
    console.log(`[QA:${label}]`, this.getMetricsSnapshot());
  }

  getFpsPercentile(p) {
    if (!this.deltaSamples.length) return 0;
    const sorted = [...this.deltaSamples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    const delta = sorted[idx];
    return delta > 0 ? Math.round(1000 / delta) : 0;
  }

  stressTest() {
    for (let i = 0; i < 80; i++) {
      this.scene.spawnEnemy(true);
    }
    this.logSnapshot('StressWave');
  }

  touchTest() {
    // 模拟触摸连点：快速触发 10 次暂停/继续
    let count = 0;
    const interval = setInterval(() => {
      this.scene.togglePause();
      count++;
      if (count >= 10) {
        clearInterval(interval);
        this.logSnapshot('TouchTest');
      }
    }, 200);
  }
  
  toggleObservation() {
    this.observationMode = !this.observationMode;
    console.log(`[QA] Observation mode: ${this.observationMode ? 'ON' : 'OFF'}`);
  }
  
  getDetailedObservation() {
    const bullets = this.scene.playerBullets.children.entries.filter(b => b.active);
    const penLayers = bullets.map(b => b.getData('penetrationLeft') || 0);
    const rebLayers = bullets.map(b => b.getData('reboundLeft') || 0);
    return {
      totalBullets: bullets.length,
      splitBullets: this.scene.splitBulletCount,
      avgPenetration: penLayers.length ? (penLayers.reduce((a, b) => a + b, 0) / penLayers.length).toFixed(1) : 0,
      avgRebound: rebLayers.length ? (rebLayers.reduce((a, b) => a + b, 0) / rebLayers.length).toFixed(1) : 0,
      enemies: this.scene.enemies.countActive(true)
    };
  }
  
  setSeed(seed) {
    this.rngSeed = seed;
    if (seed !== null) {
      Math.seedrandom(seed);
      console.log(`[QA] RNG seed set to: ${seed}`);
    }
  }
  
  toggleDroneAI() {
    // v5: 切换无人机 AI 模式
    const droneSystem = this.scene.droneSystem;
    if (!droneSystem) return;
    
    const newMode = droneSystem.aiMode === 'autoAim' ? 'fixedOrbit' : 'autoAim';
    droneSystem.setAIMode(newMode);
    const modeName = newMode === 'autoAim' ? '自动瞪准' : '环绕射击';
    this.scene.toastManager?.show(`无人机 AI: ${modeName}`, 'info', 2000);
    console.log(`[QA] Drone AI switched to: ${newMode}`);
  }
  
  rngReplay() {
    // v5: RNG 种子重放（简化实现：记录当前数据）
    const snapshot = {
      seed: Date.now(),
      duration: 60000,
      startTime: this.scene.time.now,
      initialState: {
        score: GameState.globals.score,
        wave: GameState.globals.wave,
        kills: GameState.stats.totalKills
      }
    };
    
    console.log('[QA] RNG Replay started:', snapshot);
    this.scene.toastManager?.show('RNG 重放开始（60s）', 'info', 2000);
    
    // 60s 后输出结果
    this.scene.time.delayedCall(60000, () => {
      const endState = {
        score: GameState.globals.score,
        wave: GameState.globals.wave,
        kills: GameState.stats.totalKills
      };
      const result = {
        seed: snapshot.seed,
        duration: 60000,
        delta: {
          score: endState.score - snapshot.initialState.score,
          wave: endState.wave - snapshot.initialState.wave,
          kills: endState.kills - snapshot.initialState.kills
        },
        fps: {
          avg: Math.round(1000 / (this.lastDelta || 16)),
          p50: this.getFpsPercentile(0.5),
          p95: this.getFpsPercentile(0.95)
        }
      };
      console.log('[QA] RNG Replay finished:', result);
      this.scene.toastManager?.show(`RNG 重放完成: +${result.delta.kills} 击杀`, 'success', 3000);
    });
  }
}
