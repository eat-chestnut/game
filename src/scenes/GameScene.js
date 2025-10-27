import { ThemeTokens, themeColor } from '../theme.js';
import { GameState } from '../state/GameState.js';
import { UIFactory } from '../ui/UIFactory.js';
import { ToastManager } from '../ui/ToastManager.js';
import { AutoAimSystem } from '../systems/AutoAim.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { LootDropSystem } from '../systems/LootDropSystem.js';
import { PauseSystem } from '../systems/PauseSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { QAConsole } from '../systems/QAConsole.js';
import { ShieldSystem } from '../systems/ShieldSystem.js';
import { DroneSystem } from '../systems/DroneSystem.js';
import { AOESystem } from '../systems/AOESystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { SaveManager } from '../state/SaveManager.js';
import { BossSystem } from '../systems/BossSystem.js';
import { EliteSystem } from '../systems/EliteSystem.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem.js';
import { AccessibilitySystem } from '../systems/AccessibilitySystem.js';
import { ReplaySystem } from '../systems/ReplaySystem.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.playerState = { fireCooldown: 0 };
  }

  create() {
    GameState.reset(false);
    this.gameOverTriggered = false;
    this.sceneVars = {
      enemySpeed: 150,
      enemyHP: 20,
      spawnRate: 0.8
    };
    this.maxSplitBullets = 50;
    this.maxEnemies = 80;
    this.lowPowerFactor = GameState.globals.lowPowerMode ? 0.5 : 1;
    this.comboResetMs = 3000;
    this.comboTimer = 0;
    
    // 应用商店加成
    this.shopSystem = new ShopSystem();
    this.shopSystem.loadShop();
    this.shopSystem.applyShopBonuses();
    this.toastManager = new ToastManager(this);
    this.pauseSystem = new PauseSystem(this);
    this.audio = new AudioSystem(this);
    this.audio.startBgm();
    this.uiFactory = new UIFactory(this);
    this.buildBackground();
    this.createPlayer();
    this.createGroups();
    this.splitBulletCount = 0;
    this.buildHUD();
    this.skillSystem = new SkillSystem(this, this.toastManager);
    this.skillSystem.ensureInitialState();
    this.autoAim = new AutoAimSystem(this);
    this.lootSystem = new LootDropSystem(this);
    this.waveSystem = new WaveSystem(this);
    this.qaConsole = new QAConsole(this, this.skillSystem);
    this.shieldSystem = new ShieldSystem(this, GameState.config);
    this.droneSystem = new DroneSystem(this, GameState.config);
    this.aoeSystem = new AOESystem(this, GameState.config);
    this.achievementSystem = new AchievementSystem(this);
    this.bossSystem = new BossSystem(this, GameState.config);
    this.eliteSystem = new EliteSystem(this, GameState.config);
    this.tutorialSystem = new TutorialSystem(this, GameState.config);
    
    // v6: 新系统
    this.dailyChallenge = new DailyChallengeSystem(this, GameState.config);
    this.accessibility = new AccessibilitySystem(this, GameState.config);
    this.replaySystem = new ReplaySystem(this, GameState.config);
    
    // v6.1: 装备系统
    this.loadEquipmentConfig().then(equipConfig => {
      this.equipmentSystem = new EquipmentSystem(this, equipConfig);
      console.log('[GameScene] Equipment system initialized');
    }).catch(err => {
      console.error('[GameScene] Failed to load equipment config:', err);
      this.equipmentSystem = new EquipmentSystem(this, {});
    });
    
    // v6: 应用每日试炼规则
    this.dailyChallenge.applyRules();
    
    // v6: 开始回放录制
    if (this.replaySystem.enabled) {
      this.replaySystem.startRecording();
    }
    
    this.setupSpawner();
    this.setupCollisions();
    this.setupWorldBounds();
    this.syncExternalSkills();
    this.game.events.on('hidden', this.handleBlur, this);
    this.game.events.on('visible', this.handleFocus, this);
    
    // 启动教程（如果未完成）
    if (this.tutorialSystem.shouldShow()) {
      this.time.delayedCall(500, () => {
        this.tutorialSystem.start();
      });
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('hidden', this.handleBlur, this);
      this.game.events.off('visible', this.handleFocus, this);
    });
  }

  buildBackground() {
    this.add.rectangle(360, 800, 720, 1600, themeColor(ThemeTokens.color.bg));
    this.bgStars = this.add.tileSprite(360, 800, 720, 1600, 'noise');
    this.bgStars.setAlpha(0.1);
  }

  createPlayer() {
    this.player = this.physics.add.sprite(360, 1450, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false);
    this.playerState.fireCooldown = 0;
  }

  createGroups() {
    this.enemies = this.physics.add.group({
      maxSize: this.maxEnemies,
      runChildUpdate: false
    });
    this.playerBullets = this.physics.add.group({
      maxSize: 200,
      runChildUpdate: false
    });
  }

  buildHUD() {
    const margin = this.scale.width <= 360 ? 8 : this.scale.height >= 1800 ? 16 : 12;
    const leftX = margin + 120;
    const topY = margin + 40;
    const rightX = 720 - margin - 120;
    this.createHudPanel(leftX, topY + 30, 260, 90);
    this.scoreText = this.add.text(leftX - 90, topY, 'Score 0', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '26px',
      color: ThemeTokens.color.text
    }).setDepth(6);
    this.createHudPanel(360, topY + 30, 320, 90);
    this.levelText = this.add.text(360, topY, 'Lv.1 0/15', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      color: ThemeTokens.color.text,
      align: 'center'
    }).setOrigin(0.5, 0).setDepth(6);
    this.createHudPanel(rightX, topY + 30, 220, 90);
    this.waveText = this.add.text(rightX, topY, 'Wave 1', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      color: ThemeTokens.color.text
    }).setOrigin(0.5, 0).setDepth(6);
    this.buffText = this.add.text(360, topY + 80, '', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color: ThemeTokens.color.accent
    }).setOrigin(0.5, 0);

    this.pauseButton = this.uiFactory.createButton('暂停', { width: 200, height: 60, variant: 'accent' });
    this.pauseButton.setPosition(580, 1480);
    this.pauseButton.on('pointerup', () => this.togglePause());
  }

  createHudPanel(x, y, width, height) {
    const panel = this.add.rectangle(x, y, width, height, themeColor(ThemeTokens.color.panel), 0.85);
    panel.setDepth(5);
    panel.setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.35);
    panel.setOrigin(0.5, 0.5);
    return panel;
  }

  setupSpawner() {
    this.enemySpawnEvent = this.time.addEvent({
      delay: this.sceneVars.spawnRate * 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });
    this.pauseSystem.registerTimer(this.enemySpawnEvent);
  }

  resetSpawnTimer() {
    if (this.enemySpawnEvent) {
      const prev = this.enemySpawnEvent;
      prev.remove(false);
      this.pauseSystem.pauseables = this.pauseSystem.pauseables.filter(evt => evt !== prev);
    }
    this.setupSpawner();
  }

  setupCollisions() {
    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => this.handleBulletHit(bullet, enemy));
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      if (this.shieldSystem?.absorbHit()) {
        this.releaseEnemy(enemy);
        return;
      }
      this.releaseEnemy(enemy);
      this.endGame('碰撞');
    });
    this.physics.add.overlap(this.player, this.lootSystem.lootGroup, (_player, loot) => this.lootSystem.collect(loot));
  }

  setupWorldBounds() {
    this.physics.world.setBounds(0, 0, 720, 1600, true, true, true, true);
    this.physics.world.on('worldbounds', body => {
      const obj = body.gameObject;
      if (!obj || typeof obj.getData !== 'function') return;
      if (!obj.getData('damage')) return;
      if (!this.handleBulletRebound(obj, body)) {
        this.releaseBullet(obj);
      }
    });
  }

  togglePause() {
    this.pauseSystem.toggle();
    this.pauseButton.label.setText(GameState.globals.isPaused ? '继续' : '暂停');
  }

  update(time, delta) {
    this.bgStars.tilePositionY -= delta * 0.02 * this.lowPowerFactor;
    if (GameState.globals.isPaused) {
      this.qaConsole.updateMetrics(delta);
      return;
    }
    const dt = delta / 1000;
    GameState.stats.runSeconds += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        GameState.stats.currentCombo = 0;
      }
    }
    this.autoAim.update(delta);
    this.playerState.fireCooldown -= dt;
    if (this.playerState.fireCooldown <= 0) {
      const target = this.autoAim.getTarget();
      if (target) {
        this.fireAtTarget(target);
        this.playerState.fireCooldown = this.getEffectiveFireRate();
      }
    }
    this.updateEnemies();
    this.updateBullets(time);
    this.lootSystem.update(time);
    this.shieldSystem.update(delta);
    this.droneSystem.update(delta);
    this.aoeSystem.update(delta);
    this.bossSystem.update(delta);
    this.eliteSystem.update(delta); // v5: Healer 精英治疗
    this.updateHud();
    this.qaConsole.updateMetrics(delta);
  }

  onHasteBuffStart() {
    this.playerState.fireCooldown = Math.min(this.playerState.fireCooldown, this.getEffectiveFireRate());
  }

  getEffectiveFireRate() {
    return GameState.globals.fireRate * (GameState.hasteBuff.active ? (GameState.hasteBuff.multiplier ?? 0.75) : 1);
  }

  fireAtTarget(target) {
    const pattern = this.skillSystem.getShotPattern();
    const shopMul = GameState.globals.shopDamageMultiplier ?? 1;
    const baseDamage = GameState.globals.baseDamage * GameState.globals.bulletDamageMultiplier * shopMul;
    const shotCount = pattern.angles.length || 1;
    const perShotMultiplier = pattern.perShotMultiplier ?? pattern.totalMultiplier / shotCount;
    const damagePerShot = baseDamage * perShotMultiplier;
    const angleToTarget = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    pattern.angles.forEach(angle => {
      const finalAngle = angleToTarget + Phaser.Math.DEG_TO_RAD * angle;
      const bullet = this.acquireBullet('bullet', this.player.x, this.player.y - 30);
      if (!bullet) return;
      bullet.setDisplaySize(10, 32);
      bullet.setSize(10, 32);
      const speed = GameState.globals.lowPowerMode ? 780 : 900;
      this.physics.velocityFromRotation(finalAngle, speed, bullet.body.velocity);
      bullet.rotation = finalAngle + Math.PI / 2;
      this.skillSystem.configureBullet(bullet, damagePerShot);
    });
    this.audio.playShoot();
  }

  spawnSplitBullet(x, y, angleRad, damage) {
    if (this.splitBulletCount >= this.maxSplitBullets) return;
    const bullet = this.acquireBullet('splitBullet', x, y);
    if (!bullet) return;
    this.splitBulletCount += 1;
    bullet.setDisplaySize(8, 24);
    bullet.setSize(8, 24);
    const speed = GameState.globals.lowPowerMode ? 700 : 850;
    this.physics.velocityFromRotation(angleRad, speed, bullet.body.velocity);
    bullet.rotation = angleRad + Math.PI / 2;
    bullet.setData('damage', damage);
    bullet.setData('baseDamage', damage);
    bullet.setData('penetrationLeft', 0);
    bullet.setData('reboundLeft', 0);
    bullet.setData('isSplitChild', true);
    bullet.setData('lastSplitMs', this.time.now);
    bullet.setData('minDamage', damage * 0.5);
  }

  spawnEnemy(force = false, spawnX = null, spawnY = null, hpScale = 1) {
    if (!force && this.enemies.countActive(true) >= this.maxEnemies) return;
    const x = spawnX ?? Phaser.Math.Between(60, 660);
    const y = spawnY ?? -40;
    const enemy = this.enemies.get(x, y, 'enemy');
    if (!enemy) return;
    enemy.enableBody(true, x, y, true, true);
    enemy.body.setAllowGravity(false);
    enemy.body.setVelocity(0, this.sceneVars.enemySpeed);
    enemy.hp = this.sceneVars.enemyHP * hpScale;
    enemy.maxHp = enemy.hp;
    enemy.setDepth(20);
    enemy.setActive(true);
    enemy.setVisible(true);
    enemy.setTint(0xffffff); // 重置颜色
    enemy.setScale(1); // 重置缩放
    enemy.clearData(); // 清理旧标记
    
    // 精英生成判定
    if (!force && this.eliteSystem.shouldSpawnElite()) {
      this.eliteSystem.applyEliteAffixes(enemy);
    }
  }

  updateEnemies() {
    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active) return;
      
      // Boss 不算漏怪
      const isBoss = enemy.getData('isBoss');
      const isBossBullet = enemy.getData('isBossBullet');
      
      // Boss 弹幕超界清理
      if (isBossBullet && (enemy.y > 1700 || enemy.y < -100 || enemy.x < -100 || enemy.x > 820)) {
        this.releaseEnemy(enemy);
        return;
      }
      
      if (enemy.y > 1650) {
        if (isBoss) {
          // Boss 离开屏幕也算击败
          this.releaseEnemy(enemy);
          this.endGame('Boss 逃脱');
        } else if (!isBossBullet) {
          // 普通敌人漏怪
          this.releaseEnemy(enemy);
          this.endGame('漏怪');
        }
      }
    });
  }

  updateBullets(time) {
    this.playerBullets.children.iterate(bullet => {
      if (!bullet || !bullet.active) return;
      if (time - bullet.birth > 2000 || bullet.y < -50 || bullet.y > 1700 || bullet.x < -50 || bullet.x > 770) {
        this.releaseBullet(bullet);
      }
    });
  }

  handleBulletHit(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    const now = this.time.now;
    const cooldown = bullet.getData('hitCooldown') || 0;
    if (now < cooldown) return;
    bullet.setData('hitCooldown', now + 60);
    
    // 应用精英抗性
    let damage = bullet.getData('damage');
    if (enemy.getData('isElite')) {
      damage = this.eliteSystem.applyDamageModifier(enemy, damage);
    }
    
    // Boss AOE 额外衰减
    if (enemy.getData('isBoss') && bullet.getData('isAOE')) {
      const bossScale = GameState.config?.boss?.aoeResistScale ?? 0.75;
      damage *= bossScale;
    }
    
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      this.handleEnemyKilled(enemy);
    }
    const penetrated = this.skillSystem.handlePenetration(bullet);
    if (!penetrated) {
      this.skillSystem.trySplit(bullet);
      this.releaseBullet(bullet);
    }
  }

  handleEnemyKilled(enemy) {
    const isBoss = enemy.getData('isBoss');
    const isElite = enemy.getData('isElite');
    
    GameState.globals.score += isBoss ? 500 : (isElite ? 50 : 10);
    GameState.globals.coins += isBoss ? 50 : (isElite ? 10 : 1);
    GameState.stats.totalKills += 1;
    GameState.stats.currentCombo += 1;
    GameState.stats.highestCombo = Math.max(GameState.stats.highestCombo, GameState.stats.currentCombo);
    this.comboTimer = this.comboResetMs;
    
    const dropX = enemy.x;
    const dropY = enemy.y;
    
    // v6: 回放记录
    if (this.replaySystem) {
      this.replaySystem.recordEnemyKilled(enemy);
    }
    
    // Boss 特殊处理
    if (isBoss) {
      this.bossSystem.onBossKilled(enemy);
    }
    
    // 精英特殊处理
    if (isElite) {
      this.eliteSystem.onEliteKilled(enemy);
    }
    
    this.releaseEnemy(enemy);
    this.audio.playExplosion();
    
    // v6: 命中反馈（如果启用）
    if (this.accessibility) {
      this.accessibility.triggerHitFeedback(dropX, dropY, false);
    }
    
    this.skillSystem.onEnemyKilled();
    this.lootSystem.attemptDrop(dropX, dropY);
    
    // v6.1: 装备掉落
    if (this.equipmentSystem) {
      this.equipmentSystem.tryDrop({ x: dropX, y: dropY, isBoss, isElite });
    }
    
    this.achievementSystem.check({
      totalKills: GameState.stats.totalKills,
      wave: GameState.globals.wave,
      score: GameState.globals.score
    });
  }

  handleBulletRebound(bullet, body) {
    const rebounds = bullet.getData('reboundLeft');
    if (!rebounds || rebounds <= 0) return false;
    bullet.setData('reboundLeft', rebounds - 1);
    const velocity = bullet.body.velocity.length();
    let angle = bullet.body.velocity.angle();
    if (body.blocked.left || body.blocked.right) {
      angle = Math.PI - angle;
    } else {
      angle = -angle;
    }
    const jitter = Phaser.Math.DegToRad(Phaser.Math.Between(-4, 4));
    angle += jitter;
    this.physics.velocityFromRotation(angle, velocity, bullet.body.velocity);
    const newDamage = Math.max(bullet.getData('damage') * 0.85, bullet.getData('baseDamage') * 0.5);
    bullet.setData('damage', newDamage);
    return true;
  }

  updateHud() {
    this.scoreText.setText(`Score ${GameState.globals.score}`);
    this.levelText.setText(`Lv.${GameState.globals.level} ${GameState.globals.killCount}/${GameState.globals.nextLevelKills}`);
    this.waveText.setText(`Wave ${GameState.globals.wave}`);
    if (GameState.hasteBuff.active) {
      const remaining = Math.max(0, GameState.hasteBuff.expiresAt - this.time.now) / 1000;
      this.buffText.setText(`连锁加速 ${remaining.toFixed(1)}s`);
    } else {
      this.buffText.setText('');
    }
  }

  updateWaveHud() {
    this.waveText.setText(`Wave ${GameState.globals.wave}`);
  }

  updateBuffHud(active) {
    if (active) {
      const duration = (GameState.config?.balance?.drops?.hasteBuffDurationSec ?? 8).toFixed(1);
      this.buffText.setText(`连锁加速 ${duration}s`);
    } else {
      this.buffText.setText('');
    }
  }

  acquireBullet(texture, x, y) {
    const bullet = this.playerBullets.get(x, y, texture);
    if (!bullet) return null;
    bullet.enableBody(true, x, y, true, true);
    bullet.body.stop();
    bullet.body.setAllowGravity(false);
    bullet.body.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
    bullet.birth = this.time.now;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setDepth(texture === 'splitBullet' ? 42 : 40);
    bullet.setTexture(texture);
    bullet.setDataEnabled();
    bullet.setData('isSplitChild', false);
    bullet.setData('hitCooldown', 0);
    return bullet;
  }

  releaseBullet(bullet) {
    if (!bullet) return;
    if (bullet.getData('isSplitChild')) {
      this.splitBulletCount = Math.max(0, this.splitBulletCount - 1);
    }
    bullet.body?.stop();
    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);
  }

  releaseEnemy(enemy) {
    if (!enemy) return;
    enemy.body?.stop();
    enemy.disableBody(true, true);
    enemy.setActive(false);
    enemy.setVisible(false);
  }

  syncExternalSkills() {
    this.onSkillLevelChanged('defense_shield', GameState.skillState.defense_shield);
    this.onSkillLevelChanged('summon_drone', GameState.skillState.summon_drone);
    this.onSkillLevelChanged('aoe_blast', GameState.skillState.aoe_blast);
  }

  onSkillLevelChanged(skillId, level) {
    switch (skillId) {
      case 'defense_shield':
        this.shieldSystem?.setLevel(level);
        break;
      case 'summon_drone':
        this.droneSystem?.setLevel(level);
        break;
      case 'aoe_blast':
        this.aoeSystem?.setLevel(level);
        break;
      default:
        break;
    }
  }

  handleBlur() {
    // v6: 使用 reason 参数
    this.pauseSystem.setPaused(true, 'blur');
  }

  handleFocus() {
    this.audio.resume();
    // v6: 失去焦点后恢复
    this.pauseSystem.setPaused(false, 'blur');
  }
  
  // v6.1: 加载装备配置
  async loadEquipmentConfig() {
    try {
      const response = await fetch('equipment_config.json');
      if (!response.ok) throw new Error('Failed to fetch equipment config');
      return await response.json();
    } catch (error) {
      console.error('[GameScene] Equipment config load failed:', error);
      return {};
    }
  }

  endGame(reason) {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    const dps = GameState.stats.runSeconds > 0 ? Math.round(GameState.globals.score / GameState.stats.runSeconds) : GameState.globals.score;
    const summary = {
      score: GameState.globals.score,
      wave: GameState.globals.wave,
      kills: GameState.stats.totalKills,
      combo: GameState.stats.highestCombo,
      skills: { ...GameState.skillState },
      duration: GameState.stats.runSeconds,
      aoeTriggers: GameState.stats.aoeTriggers,
      dps,
      reason
    };
    SaveManager.updateStats({
      score: summary.score,
      wave: summary.wave,
      totalKills: summary.kills,
      highestCombo: summary.combo,
      duration: summary.duration,
      aoeTriggers: summary.aoeTriggers
    });
    SaveManager.save({
      coins: GameState.globals.coins,
      level: GameState.globals.level,
      skillState: { ...GameState.skillState },
      locale: GameState.globals.locale,
      toggles: { ...SaveManager.data.toggles, lowPowerMode: GameState.globals.lowPowerMode }
    });
    this.audio.fadeOutBgm();
    this.scene.start('GameOver', summary);
  }
}
