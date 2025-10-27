import { GameState } from '../state/GameState.js';
import { ThemeTokens, themeColor } from '../theme.js';

/**
 * BossSystem - 管理 Boss 波次、生成、阶段切换与技能释放
 * - 每 5 波出现一次 Boss
 * - Boss 高 HP、缓慢、可释放环形弹幕
 * - 受 AOE 额外衰减 ×0.75
 * - 击杀授予额外金币/经验并保证掉落
 */
export class BossSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.boss ?? {};
    this.interval = this.config.interval ?? 5;
    this.currentBoss = null;
    this.bossHealthBar = null;
    this.bossPhaseTriggered = { phase1: false, phase2: false };
  }

  shouldSpawnBoss(wave) {
    return wave > 0 && wave % this.interval === 0;
  }

  spawnBoss(wave) {
    if (this.currentBoss && this.currentBoss.active) return;
    
    const x = 360;
    const y = 200;
    
    // 创建 Boss 敌人
    const boss = this.scene.enemies.get(x, y, 'enemy');
    if (!boss) return;
    
    boss.enableBody(true, x, y, true, true);
    boss.body.setAllowGravity(false);
    
    const baseHP = this.scene.sceneVars.enemyHP;
    const hpMultiplier = this.config.hpMultiplier ?? 12;
    const speed = this.config.speed ?? 80;
    
    boss.hp = baseHP * hpMultiplier;
    boss.maxHp = boss.hp;
    boss.body.setVelocity(0, speed);
    boss.setDepth(25);
    boss.setActive(true);
    boss.setVisible(true);
    boss.setTint(0xff5c7a); // Boss 红色标识
    boss.setScale(1.5); // 放大显示
    boss.setData('isBoss', true);
    boss.setData('wave', wave);
    boss.setData('lastSkillTime', 0);
    
    this.currentBoss = boss;
    this.bossPhaseTriggered = { phase1: false, phase2: false };
    
    this.showBossHealthBar();
    this.scene.toastManager?.show(`Boss 来袭！`, 'danger', 3000);
  }

  showBossHealthBar() {
    if (this.bossHealthBar) {
      this.bossHealthBar.destroy(true);
    }
    
    const barWidth = 600;
    const barHeight = 24;
    const x = 360;
    const y = 140;
    
    const container = this.scene.add.container(x, y);
    container.setDepth(100);
    
    const bg = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x000000, 0.6);
    const border = this.scene.add.rectangle(0, 0, barWidth, barHeight);
    border.setStrokeStyle(3, themeColor(ThemeTokens.color.danger), 1);
    border.setFillStyle(0x000000, 0);
    
    const healthFill = this.scene.add.rectangle(-barWidth / 2, 0, barWidth, barHeight - 4, themeColor(ThemeTokens.color.danger), 1);
    healthFill.setOrigin(0, 0.5);
    
    const label = this.scene.add.text(0, -20, 'BOSS', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      fontWeight: '700',
      color: ThemeTokens.color.danger
    }).setOrigin(0.5);
    
    container.add([bg, healthFill, border, label]);
    container.healthFill = healthFill;
    container.maxWidth = barWidth - 4;
    
    this.bossHealthBar = container;
  }

  updateBossHealthBar() {
    if (!this.bossHealthBar || !this.currentBoss || !this.currentBoss.active) {
      if (this.bossHealthBar) {
        this.bossHealthBar.destroy(true);
        this.bossHealthBar = null;
      }
      return;
    }
    
    const hpRatio = Math.max(0, this.currentBoss.hp / this.currentBoss.maxHp);
    const width = this.bossHealthBar.maxWidth * hpRatio;
    this.bossHealthBar.healthFill.width = width;
  }

  update(delta) {
    if (!this.currentBoss || !this.currentBoss.active) {
      this.updateBossHealthBar();
      return;
    }
    
    // 更新血条
    this.updateBossHealthBar();
    
    // 阶段切换与技能释放
    const hpRatio = this.currentBoss.hp / this.currentBoss.maxHp;
    const now = this.scene.time.now;
    const lastSkill = this.currentBoss.getData('lastSkillTime') || 0;
    const cooldown = this.config.ringCooldownMs ?? 4500;
    
    // Phase 1: HP < 70%
    if (hpRatio < 0.7 && !this.bossPhaseTriggered.phase1) {
      this.bossPhaseTriggered.phase1 = true;
      this.scene.toastManager?.show('Boss 进入第二阶段！', 'warning', 2000);
      this.releaseRingBullets();
      this.currentBoss.setData('lastSkillTime', now);
    }
    
    // Phase 2: HP < 40%
    if (hpRatio < 0.4 && !this.bossPhaseTriggered.phase2) {
      this.bossPhaseTriggered.phase2 = true;
      this.scene.toastManager?.show('Boss 进入狂暴阶段！', 'danger', 2000);
      this.releaseRingBullets();
      this.currentBoss.setData('lastSkillTime', now);
    }
    
    // 持续释放环形弹幕
    if (now - lastSkill >= cooldown) {
      this.releaseRingBullets();
      this.currentBoss.setData('lastSkillTime', now);
    }
    
    // Boss 缓慢左右移动
    if (this.currentBoss.x <= 100) {
      this.currentBoss.body.setVelocityX(Math.abs(this.currentBoss.body.velocity.x));
    } else if (this.currentBoss.x >= 620) {
      this.currentBoss.body.setVelocityX(-Math.abs(this.currentBoss.body.velocity.x));
    }
    if (this.currentBoss.body.velocity.x === 0) {
      this.currentBoss.body.setVelocityX(60);
    }
  }

  releaseRingBullets() {
    if (!this.currentBoss || !this.currentBoss.active) return;
    
    const bulletCount = this.config.ringBulletCount ?? 14;
    const bulletSpeed = this.config.ringBulletSpeed ?? 260;
    const angleStep = (2 * Math.PI) / bulletCount;
    
    for (let i = 0; i < bulletCount; i++) {
      const angle = angleStep * i;
      this.spawnBossBullet(this.currentBoss.x, this.currentBoss.y, angle, bulletSpeed);
    }
    
    this.scene.audio?.playShoot();
  }

  spawnBossBullet(x, y, angleRad, speed) {
    // 使用临时组或场景创建敌人弹幕（简化实现，直接作为小敌人处理）
    // 实际项目中应创建独立的 enemyBullets 组
    const bullet = this.scene.enemies.get(x, y, 'enemy');
    if (!bullet) return;
    
    bullet.enableBody(true, x, y, true, true);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    bullet.hp = 1; // 一击即破
    bullet.setDepth(22);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setTint(0xffaa00); // 橙色弹幕
    bullet.setScale(0.6);
    bullet.setData('isBossBullet', true);
    bullet.birth = this.scene.time.now;
  }

  onBossKilled(boss) {
    if (this.currentBoss === boss) {
      this.currentBoss = null;
      if (this.bossHealthBar) {
        this.bossHealthBar.destroy(true);
        this.bossHealthBar = null;
      }
    }
    
    // 保底掉落
    if (this.config.guaranteedDrop) {
      this.scene.lootSystem?.guaranteedDrop(boss.x, boss.y, 3); // 掉落 3 个能量球
    }
    
    // 额外金币与经验
    GameState.globals.coins += 50;
    GameState.globals.score += 500;
    
    this.scene.toastManager?.show('Boss 已击败！+500 分 +50 金币', 'success', 3000);
  }

  reset() {
    this.currentBoss = null;
    this.bossPhaseTriggered = { phase1: false, phase2: false };
    if (this.bossHealthBar) {
      this.bossHealthBar.destroy(true);
      this.bossHealthBar = null;
    }
  }
}
