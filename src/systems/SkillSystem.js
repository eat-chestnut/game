import { GameState } from '../state/GameState.js';
import { UIFactory } from '../ui/UIFactory.js';
import { ThemeTokens, themeColor } from '../theme.js';
import { SaveManager } from '../state/SaveManager.js';
import { t } from '../i18n/index.js';

const SkillDescriptions = {
  atk_speed: '火力循环加速 10%，最低 0.60s',
  atk_power: '子弹伤害提高 8%',
  multi_shot: '额外子弹 +1，轻微扇形',
  scatter: '散射扇形弹幕，多角度覆盖',
  split: '命中分裂子弹，60%伤害',
  penetration: '穿透敌人并递减伤害',
  rebound: '墙面反弹，角度偏移',
  defense_shield: '护盾可吸收伤害并缓慢恢复',
  summon_drone: '召唤无人机围绕射击',
  aoe_blast: '周期性释放范围冲击波'
};

export class SkillSystem {
  constructor(scene, toastManager) {
    this.scene = scene;
    this.toastManager = toastManager;
    this.uiFactory = new UIFactory(scene);
    this.panelOpen = false;
    this.panelContainer = null;
    this.skillConfig = GameState.config;
  }

  getSkillDef(id) {
    return this.skillConfig?.skills?.find(s => s.id === id);
  }

  ensureInitialState() {
    if (!GameState.globals.nextLevelKills) {
      GameState.globals.nextLevelKills = GameState.globals.baseKillsToLevel;
    }
    if (!GameState.globals.level) {
      GameState.globals.level = 1;
    }
    this.recalcShotPattern();
  }

  onEnemyKilled() {
    GameState.globals.killCount += 1;
    if (
      GameState.globals.killCount >= GameState.globals.nextLevelKills &&
      GameState.globals.level < GameState.globals.maxPlayerLevel
    ) {
      GameState.globals.level += 1;
      GameState.globals.killCount = 0;
      GameState.globals.nextLevelKills = Math.ceil(
        GameState.globals.nextLevelKills * GameState.globals.killGrowthFactor
      );
      this.openSkillPanel();
    }
  }

  openSkillPanel() {
    if (this.panelOpen) return;
    this.panelOpen = true;
    this.scene.pauseSystem.setPaused(true);
    const overlay = this.scene.add.rectangle(360, 800, 720, 1600, 0x000000, 0.65).setInteractive();
    overlay.setDepth(390);
    const panel = this.uiFactory.createPanel(620, 720, 'panelStrong');
    panel.setDepth(400);
    const title = this.scene.add.text(0, -260, t('chooseSkill', GameState.globals.locale), {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '32px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);

    const options = this.pickSkillOptions();
    const cards = options.map((skill, index) => this.createSkillCard(skill, index));

    const panelContent = this.scene.add.container(360, 800, [panel, title, ...cards]).setDepth(400);
    this.panelContainer = this.scene.add.container(0, 0, [overlay, panelContent]);
  }

  pickSkillOptions() {
    const available = this.skillConfig?.skills?.filter(skill => {
      const level = GameState.skillState[skill.id] ?? 0;
      return level < skill.maxLevel;
    }) ?? [];
    const picks = [];
    while (picks.length < 3 && available.length) {
      const idx = Math.floor(Math.random() * available.length);
      picks.push(available.splice(idx, 1)[0]);
    }
    const allSkills = this.skillConfig?.skills ?? [];
    while (picks.length < 3) {
      if (!allSkills.length) {
        picks.push(null);
        continue;
      }
      const candidate = allSkills[Math.floor(Math.random() * allSkills.length)];
      if (picks.includes(candidate)) continue;
      picks.push(candidate);
    }
    return picks;
  }

  createSkillCard(skillDef, index) {
    const offsetY = -140 + index * 180;
    const width = 560;
    const height = 150;
    const bg = this.scene.add.rectangle(0, 0, width, height, 0xffffff, 0.05).setOrigin(0.5);
    bg.setStrokeStyle(2, themeColor(ThemeTokens.color.primary), 0.6);
    const label = this.scene.add.text(-width / 2 + 20, -35, skillDef ? skillDef.name : '占位', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0, 0.5);
    const level = skillDef ? GameState.skillState[skillDef.id] ?? 0 : 0;
    const desc = this.scene.add.text(-width / 2 + 20, 20, skillDef ? SkillDescriptions[skillDef.id] : '所有技能已满级', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '16px',
      color: ThemeTokens.color.textMuted,
      wordWrap: { width: width - 40 }
    }).setOrigin(0, 0.5);
    const levelText = skillDef ? `Lv.${level}/${skillDef.maxLevel}` : '-';
    const levelLabel = this.scene.add.text(width / 2 - 20, 0, levelText, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '18px',
      color: ThemeTokens.color.accent
    }).setOrigin(1, 0.5);
    const container = this.scene.add.container(0, offsetY, [bg, label, desc, levelLabel]);
    container.setSize(width, height);
    if (skillDef && level < skillDef.maxLevel) {
      container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', () => {
        this.applySkill(skillDef.id);
      });
    } else if (skillDef) {
      container.setAlpha(0.35);
    }
    if (!skillDef) {
      container.setAlpha(0.2);
    }
    return container;
  }

  closePanel() {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    if (this.panelContainer) {
      this.panelContainer.destroy(true);
      this.panelContainer = null;
    }
    this.scene.pauseSystem.setPaused(false);
  }

  applySkill(skillId) {
    const def = this.getSkillDef(skillId);
    if (!def) return;
    const current = GameState.skillState[skillId] ?? 0;
    if (current >= def.maxLevel) {
      this.toastManager?.show('已达到最高等级', 'info');
      return;
    }
    GameState.skillState[skillId] = current + 1;
    switch (skillId) {
      case 'atk_speed':
        GameState.globals.fireRate = Math.max(
          GameState.globals.minFireRate,
          GameState.globals.fireRate * 0.9
        );
        break;
      case 'atk_power':
        GameState.globals.bulletDamageMultiplier *= 1.08;
        break;
      case 'multi_shot':
      case 'scatter':
        break;
      case 'split':
      case 'penetration':
      case 'rebound':
        break;
      default:
        break;
    }
    this.scene.onSkillLevelChanged?.(skillId, GameState.skillState[skillId]);
    this.recalcShotPattern();
    this.toastManager?.show(`${def.name} Lv.${GameState.skillState[skillId]}`, 'success');
    SaveManager.save({ skillState: { ...GameState.skillState } });
    this.closePanel();
  }

  recalcShotPattern() {
    const scatterLevel = GameState.skillState.scatter;
    const scatterData = this.getSkillDef('scatter');
    let baseAngles = [0];
    let scatterTotal = 1;
    if (scatterLevel > 0 && scatterData?.levels) {
      const lvl = scatterData.levels[Math.min(scatterLevel, scatterData.levels.length) - 1];
      baseAngles = [...lvl.anglesDeg];
      scatterTotal = lvl.totalDamageMultiplier;
    }
    const multiLevel = GameState.skillState.multi_shot;
    const multiData = this.getSkillDef('multi_shot');
    const jitter = multiData?.perLevel?.angleJitterDeg ?? 3;
    const scatterJitter = scatterLevel > 0
      ? scatterData?.interaction?.multiShotAngleMicroSplitDeg ?? jitter
      : jitter;
    let patternAngles = [...baseAngles];
    if (multiLevel > 0) {
      patternAngles = [];
      baseAngles.forEach(base => {
        patternAngles.push(base);
        for (let i = 1; i <= multiLevel; i++) {
          const offset = scatterJitter * i;
          patternAngles.push(base + offset, base - offset);
        }
      });
    }
    const dedupAngles = [...new Set(patternAngles.map(val => Number(val.toFixed(2))))].sort((a, b) => a - b);
    const multiTotal = multiLevel > 0 ? Math.pow(1.1, multiLevel) : 1;
    const totalMultiplier = Math.max(scatterTotal, multiTotal, 1);
    const angles = dedupAngles.length ? dedupAngles : [0];
    const shotCount = angles.length || 1;
    GameState.globals.baseShotPattern = {
      angles,
      totalMultiplier,
      perShotMultiplier: totalMultiplier / shotCount
    };
  }

  getShotPattern() {
    return GameState.globals.baseShotPattern;
  }

  configureBullet(bullet, damagePerShot) {
    bullet.setDataEnabled();
    bullet.setData('damage', damagePerShot);
    bullet.setData('baseDamage', damagePerShot);
    bullet.setData('penetrationLeft', GameState.skillState.penetration);
    bullet.setData('reboundLeft', GameState.skillState.rebound);
    bullet.setData('isSplitChild', false);
    bullet.setData('lastSplitMs', 0);
    bullet.setData('minDamage', damagePerShot * 0.5);
  }

  handlePenetration(bullet) {
    const remaining = bullet.getData('penetrationLeft');
    if (remaining > 0) {
      bullet.setData('penetrationLeft', remaining - 1);
      const newDamage = Math.max(
        bullet.getData('damage') * 0.9,
        bullet.getData('baseDamage') * 0.5
      );
      bullet.setData('damage', newDamage);
      return true;
    }
    return false;
  }

  trySplit(bullet) {
    const level = GameState.skillState.split;
    if (level <= 0) return;
    if (bullet.getData('isSplitChild')) return;
    const now = this.scene.time.now;
    const lastSplit = bullet.getData('lastSplitMs') ?? 0;
    if (now - lastSplit < 30) return;
    bullet.setData('lastSplitMs', now);
    const def = this.getSkillDef('split');
    if (!def) return;
    const childDamage = GameState.globals.baseDamage * 0.6 * GameState.globals.bulletDamageMultiplier;
    const childAngles = [def.onHit.childAngleDeg, -def.onHit.childAngleDeg];
    childAngles.forEach(angle => {
      this.scene.spawnSplitBullet(bullet.x, bullet.y, bullet.body.velocity.angle() + Phaser.Math.DEG_TO_RAD * angle, childDamage);
    });
  }
}
