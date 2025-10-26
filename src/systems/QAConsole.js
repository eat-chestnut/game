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
    this.build();
  }

  build() {
    const bg = this.scene.add.rectangle(0, 0, 220, 180, 0x000000, 0.4);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(1, themeColor(ThemeTokens.color.primary), 0.4);
    const btnSpawn = this.uiFactory.createButton('Spawn50', { width: 180, height: 40, variant: 'primary' });
    btnSpawn.setPosition(0, -60);
    btnSpawn.on('pointerup', () => this.spawn50());
    const btnLevel = this.uiFactory.createButton('Level10', { width: 180, height: 40, variant: 'accent' });
    btnLevel.setPosition(0, 0);
    btnLevel.on('pointerup', () => this.levelTo10());
    const btnSpread = this.uiFactory.createButton('SpreadTest', { width: 180, height: 40, variant: 'primary' });
    btnSpread.setPosition(0, 60);
    btnSpread.on('pointerup', () => this.spreadTest());
    this.metricsText = this.scene.add.text(0, 110, '', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '14px',
      color: ThemeTokens.color.textMuted,
      align: 'center'
    }).setOrigin(0.5);
    this.container.add([bg, btnSpawn, btnLevel, btnSpread, this.metricsText]);
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
    const fps = delta > 0 ? Math.round(1000 / delta) : 0;
    const pattern = GameState.globals.baseShotPattern;
    const fireRate = this.scene.getEffectiveFireRate().toFixed(2);
    const totalMul = pattern.totalMultiplier.toFixed(2);
    this.metricsText.setText(`FPS:${fps}\nfireRate:${fireRate}s\nshots:${pattern.angles.length}\ntotalMul:${totalMul}`);
  }

  getMetricsSnapshot() {
    const fps = this.lastDelta > 0 ? Math.round(1000 / this.lastDelta) : 0;
    return {
      fps,
      fireRate: Number(this.scene.getEffectiveFireRate().toFixed(2)),
      totalMultiplier: Number(GameState.globals.baseShotPattern.totalMultiplier.toFixed(2)),
      level: GameState.globals.level,
      skills: { ...GameState.skillState }
    };
  }

  logSnapshot(label) {
    console.log(`[QA:${label}]`, this.getMetricsSnapshot());
  }
}
