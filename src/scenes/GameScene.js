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

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.playerState = { fireCooldown: 0 };
  }

  create() {
    GameState.reset();
    this.gameOverTriggered = false;
    this.sceneVars = {
      enemySpeed: 150,
      enemyHP: 20,
      spawnRate: 0.8
    };
    this.maxSplitBullets = 50;
    this.maxEnemies = 80;
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
    this.setupSpawner();
    this.setupCollisions();
    this.setupWorldBounds();
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
    this.createHudPanel(150, 70, 260, 90);
    this.scoreText = this.add.text(60, 40, 'Score 0', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '26px',
      color: ThemeTokens.color.text
    }).setDepth(6);
    this.createHudPanel(360, 70, 320, 90);
    this.levelText = this.add.text(360, 40, 'Lv.1 0/15', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      color: ThemeTokens.color.text,
      align: 'center'
    }).setOrigin(0.5, 0).setDepth(6);
    this.createHudPanel(600, 70, 220, 90);
    this.waveText = this.add.text(600, 40, 'Wave 1', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      color: ThemeTokens.color.text
    }).setOrigin(0.5, 0).setDepth(6);
    this.buffText = this.add.text(360, 120, '', {
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
    this.bgStars.tilePositionY -= delta * 0.02;
    if (GameState.globals.isPaused) {
      this.qaConsole.updateMetrics(delta);
      return;
    }
    const dt = delta / 1000;
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
    const baseDamage = GameState.globals.baseDamage * GameState.globals.bulletDamageMultiplier;
    const shotCount = pattern.angles.length || 1;
    const damagePerShot = (baseDamage * pattern.totalMultiplier) / shotCount;
    const angleToTarget = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    pattern.angles.forEach(angle => {
      const finalAngle = angleToTarget + Phaser.Math.DEG_TO_RAD * angle;
      const bullet = this.acquireBullet('bullet', this.player.x, this.player.y - 30);
      if (!bullet) return;
      bullet.setDisplaySize(10, 32);
      bullet.setSize(10, 32);
      const speed = 900;
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
    this.physics.velocityFromRotation(angleRad, 850, bullet.body.velocity);
    bullet.rotation = angleRad + Math.PI / 2;
    bullet.setData('damage', damage);
    bullet.setData('baseDamage', damage);
    bullet.setData('penetrationLeft', 0);
    bullet.setData('reboundLeft', 0);
    bullet.setData('isSplitChild', true);
    bullet.setData('lastSplitMs', this.time.now);
    bullet.setData('minDamage', damage * 0.5);
  }

  spawnEnemy(force = false) {
    if (!force && this.enemies.countActive(true) >= this.maxEnemies) return;
    const x = Phaser.Math.Between(60, 660);
    const enemy = this.enemies.get(x, -40, 'enemy');
    if (!enemy) return;
    enemy.enableBody(true, x, -40, true, true);
    enemy.body.setAllowGravity(false);
    enemy.body.setVelocity(0, this.sceneVars.enemySpeed);
    enemy.hp = this.sceneVars.enemyHP;
    enemy.setDepth(20);
    enemy.setActive(true);
    enemy.setVisible(true);
  }

  updateEnemies() {
    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active) return;
      if (enemy.y > 1650) {
        this.releaseEnemy(enemy);
        this.endGame('漏怪');
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
    enemy.hp -= bullet.getData('damage');
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
    GameState.globals.score += 10;
    const dropX = enemy.x;
    const dropY = enemy.y;
    this.releaseEnemy(enemy);
    this.audio.playExplosion();
    this.skillSystem.onEnemyKilled();
    this.lootSystem.attemptDrop(dropX, dropY);
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

  endGame(reason) {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.audio.fadeOutBgm();
    this.scene.start('GameOver', { score: GameState.globals.score, wave: GameState.globals.wave, reason });
  }
}
