import { GameState } from '../state/GameState.js';

/**
 * EliteSystem - 管理精英敌人及其词缀
 * 词缀类型：
 * - Fast: 速度 +25%
 * - Thick: HP +30%
 * - Splitter: 死亡时分裂两只小怪
 * - Resistant: 受到子弹伤害 -20%
 */
export class EliteSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.elites ?? {};
    this.maxAffixes = this.config.maxAffixes ?? 2;
    this.affixes = this.config.affixes ?? [];
    this.eliteSpawnChance = 0.12; // 12% 概率生成精英
  }

  shouldSpawnElite() {
    return Math.random() < this.eliteSpawnChance;
  }

  applyEliteAffixes(enemy) {
    if (!enemy || !this.affixes.length) return;
    
    // 随机选择 1-maxAffixes 个词缀
    const affixCount = Math.min(
      Math.floor(Math.random() * this.maxAffixes) + 1,
      this.affixes.length
    );
    
    const selectedAffixes = this.pickRandomAffixes(affixCount);
    enemy.setData('isElite', true);
    enemy.setData('affixes', selectedAffixes);
    
    // 应用词缀效果
    selectedAffixes.forEach(affix => {
      this.applyAffix(enemy, affix);
    });
    
    // 视觉标识：描边与颜色
    enemy.setTint(0x00d1b2); // 青色精英
    enemy.setScale(1.2);
  }

  pickRandomAffixes(count) {
    const pool = [...this.affixes];
    const selected = [];
    const totalWeight = pool.reduce((sum, a) => sum + (a.weight ?? 1), 0);
    
    for (let i = 0; i < count && pool.length > 0; i++) {
      const roll = Math.random() * totalWeight;
      let acc = 0;
      let idx = 0;
      
      for (let j = 0; j < pool.length; j++) {
        acc += pool[j].weight ?? 1;
        if (roll <= acc) {
          idx = j;
          break;
        }
      }
      
      selected.push(pool[idx]);
      pool.splice(idx, 1);
    }
    
    return selected;
  }

  applyAffix(enemy, affix) {
    switch (affix.id) {
      case 'fast':
        if (enemy.body) {
          const currentSpeed = enemy.body.velocity.length();
          const multiplier = affix.speedMultiplier ?? 1.25;
          enemy.body.velocity.scale(multiplier);
        }
        break;
        
      case 'thick':
        const hpMultiplier = affix.hpMultiplier ?? 1.3;
        enemy.hp *= hpMultiplier;
        enemy.maxHp = enemy.hp;
        break;
        
      case 'splitter':
        // 标记为分裂者，死亡时处理
        enemy.setData('splitterChildCount', affix.childCount ?? 2);
        break;
        
      case 'resistant':
        enemy.setData('damageScale', affix.damageScale ?? 0.8);
        break;
        
      default:
        break;
    }
  }

  onEliteKilled(enemy) {
    const affixes = enemy.getData('affixes') || [];
    
    // 检查 Splitter 词缀
    affixes.forEach(affix => {
      if (affix.id === 'splitter') {
        this.spawnSplitterChildren(enemy);
      }
    });
    
    // 额外奖励
    GameState.globals.coins += 10;
    GameState.globals.score += 50;
  }

  spawnSplitterChildren(enemy) {
    const childCount = enemy.getData('splitterChildCount') ?? 2;
    const angleStep = (2 * Math.PI) / childCount;
    
    for (let i = 0; i < childCount; i++) {
      const angle = angleStep * i;
      const offsetX = Math.cos(angle) * 40;
      const offsetY = Math.sin(angle) * 40;
      
      this.scene.spawnEnemy(false, enemy.x + offsetX, enemy.y + offsetY, 0.7); // 70% HP
    }
  }

  applyDamageModifier(enemy, baseDamage) {
    if (!enemy || !enemy.getData('isElite')) return baseDamage;
    
    const damageScale = enemy.getData('damageScale') ?? 1;
    return baseDamage * damageScale;
  }

  reset() {
    // 清理精英状态
  }
}
