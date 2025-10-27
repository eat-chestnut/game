import { GameState } from '../state/GameState.js';

/**
 * v9.1: 元素状态系统
 * 管理 Burn/Freeze/Root/Shatter/Expose 等元素状态
 * 处理状态互斥、联动和DoT计算
 */
export class StatusSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.statusDefaults || {};
    
    // 状态配置
    this.burnConfig = this.config.burn || { duration: 2.0, tickInterval: 0.5, damageRatio: 0.4, bossMultiplier: 0.6 };
    this.freezeConfig = this.config.freeze || { duration: 1.25, bossDuration: 0.8, bossSlowPct: 0.4 };
    this.rootConfig = this.config.root || { duration: 1.0, bossSlowPct: 0.6 };
    this.shatterConfig = this.config.shatter || { bonusPct: 0.15, consumeOnHit: true };
    this.exposeConfig = this.config.expose || { duration: 4.0, bossDuration: 6.0, vulnerabilityPct: 0.12, maxStacks: 1 };
    this.fireConfig = this.config.fire || { explodeThreshold: 100, explodeMultiplier: 0.35, bossExplodeMultiplier: 0.2, unfreezeDebuff: -0.2 };
    
    // 状态追踪映射
    this.enemyStatuses = new Map(); // enemyId -> status object
  }
  
  /**
   * 应用状态到敌人
   */
  applyStatus(enemy, statusType, source = {}) {
    if (!enemy || !enemy.id) return;
    
    const isBoss = enemy.isBoss || false;
    
    // 获取或创建状态对象
    if (!this.enemyStatuses.has(enemy.id)) {
      this.enemyStatuses.set(enemy.id, {
        burn: null,
        freeze: null,
        root: null,
        shatter: null,
        expose: null
      });
    }
    
    const statuses = this.enemyStatuses.get(enemy.id);
    
    // 状态互斥检查
    if (statusType === 'burn' && statuses.freeze) {
      // 灼烧时不能冰冻
      return;
    }
    
    if (statusType === 'freeze' && statuses.burn) {
      // 冰冻时已有灼烧，不能冰冻
      return;
    }
    
    // 应用状态
    switch (statusType) {
      case 'burn':
        this.applyBurn(enemy, statuses, source, isBoss);
        break;
        
      case 'freeze':
        this.applyFreeze(enemy, statuses, source, isBoss);
        break;
        
      case 'root':
        this.applyRoot(enemy, statuses, source, isBoss);
        break;
        
      case 'shatter':
        this.applyShatter(enemy, statuses, source);
        break;
        
      case 'expose':
        this.applyExpose(enemy, statuses, source, isBoss);
        break;
    }
  }
  
  /**
   * 应用灼烧
   */
  applyBurn(enemy, statuses, source, isBoss) {
    const statusScale = this.getStatusScale(source);
    const duration = this.burnConfig.duration * (1 + statusScale.durationPct);
    const damageRatio = this.burnConfig.damageRatio * (1 + statusScale.dotPct);
    const tickInterval = this.burnConfig.tickInterval;
    
    const baseDamage = source.damage || 10;
    const tickDamage = baseDamage * damageRatio * (isBoss ? this.burnConfig.bossMultiplier : 1.0);
    
    statuses.burn = {
      duration: duration,
      tickInterval: tickInterval,
      tickDamage: tickDamage,
      lastTick: Date.now(),
      startTime: Date.now()
    };
    
    console.log(`[Status] Applied Burn to ${enemy.id}: ${tickDamage.toFixed(1)} dmg every ${tickInterval}s for ${duration}s`);
  }
  
  /**
   * 应用冰冻
   */
  applyFreeze(enemy, statuses, source, isBoss) {
    const statusScale = this.getStatusScale(source);
    const duration = isBoss ? this.freezeConfig.bossDuration : this.freezeConfig.duration;
    const finalDuration = duration * (1 + statusScale.durationPct);
    
    statuses.freeze = {
      duration: finalDuration,
      isBoss: isBoss,
      slowPct: isBoss ? this.freezeConfig.bossSlowPct * (1 + statusScale.slowCapPct) : 1.0,
      startTime: Date.now()
    };
    
    // 完全冻结或减速
    if (!isBoss) {
      enemy.frozenUntil = Date.now() + finalDuration * 1000;
    } else {
      enemy.slowUntil = Date.now() + finalDuration * 1000;
      enemy.slowMultiplier = 1.0 - statuses.freeze.slowPct;
    }
    
    console.log(`[Status] Applied Freeze to ${enemy.id}: ${finalDuration.toFixed(2)}s ${isBoss ? 'slow' : 'frozen'}`);
  }
  
  /**
   * 应用缠绕
   */
  applyRoot(enemy, statuses, source, isBoss) {
    const statusScale = this.getStatusScale(source);
    const duration = this.rootConfig.duration * (1 + statusScale.durationPct);
    
    statuses.root = {
      duration: duration,
      isBoss: isBoss,
      slowPct: isBoss ? this.rootConfig.bossSlowPct * (1 + statusScale.slowCapPct) : 1.0,
      startTime: Date.now()
    };
    
    if (!isBoss) {
      enemy.rootedUntil = Date.now() + duration * 1000;
    } else {
      enemy.slowUntil = Date.now() + duration * 1000;
      enemy.slowMultiplier = 1.0 - statuses.root.slowPct;
    }
    
    console.log(`[Status] Applied Root to ${enemy.id}: ${duration.toFixed(2)}s`);
  }
  
  /**
   * 应用碎裂标记
   */
  applyShatter(enemy, statuses, source) {
    statuses.shatter = {
      bonusPct: this.shatterConfig.bonusPct,
      consumed: false
    };
    
    console.log(`[Status] Applied Shatter mark to ${enemy.id}`);
  }
  
  /**
   * 应用破甲
   */
  applyExpose(enemy, statuses, source, isBoss) {
    const statusScale = this.getStatusScale(source);
    const duration = isBoss ? this.exposeConfig.bossDuration : this.exposeConfig.duration;
    const finalDuration = duration * (1 + statusScale.durationPct);
    const vulnPct = this.exposeConfig.vulnerabilityPct * (1 + statusScale.vulnPct);
    
    // 不叠层，仅刷新
    if (statuses.expose) {
      statuses.expose.duration = finalDuration;
      statuses.expose.startTime = Date.now();
    } else {
      statuses.expose = {
        duration: finalDuration,
        vulnPct: vulnPct,
        startTime: Date.now()
      };
    }
    
    console.log(`[Status] Applied Expose to ${enemy.id}: +${(vulnPct * 100).toFixed(1)}% vuln for ${finalDuration}s`);
  }
  
  /**
   * 处理冰冻被火击中（解冻+伤害降低+可能炸裂）
   */
  handleFireHitOnFrozen(enemy, fireDamage, source) {
    const statuses = this.enemyStatuses.get(enemy.id);
    if (!statuses || !statuses.freeze) return fireDamage;
    
    // 解冻
    this.removeStatus(enemy, 'freeze');
    
    // 火伤降低
    const debuffedDamage = fireDamage * (1 + this.fireConfig.unfreezeDebuff);
    
    // 检查是否触发炸裂
    if (fireDamage >= this.fireConfig.explodeThreshold) {
      const statusScale = this.getStatusScale(source);
      const explodeMul = this.fireConfig.explodeMultiplier * (1 + statusScale.explodePowerPct);
      const bossExplodeMul = this.fireConfig.bossExplodeMultiplier * (1 + statusScale.explodePowerPct);
      
      const explodeDamage = fireDamage * (enemy.isBoss ? bossExplodeMul : explodeMul);
      
      // 触发AOE爆炸
      this.triggerExplode(enemy, explodeDamage);
      
      console.log(`[Status] Unfreeze explode triggered: ${explodeDamage.toFixed(1)} AOE damage`);
    }
    
    return debuffedDamage;
  }
  
  /**
   * 触发炸裂AOE
   */
  triggerExplode(enemy, damage) {
    // 在敌人周围造成AOE伤害
    const radius = 80;
    
    // 这里应该调用场景的AOE伤害系统
    if (this.scene.damageNearbyEnemies) {
      this.scene.damageNearbyEnemies(enemy.x, enemy.y, radius, damage);
    }
  }
  
  /**
   * 消耗碎裂标记并返回伤害加成
   */
  consumeShatter(enemy) {
    const statuses = this.enemyStatuses.get(enemy.id);
    if (!statuses || !statuses.shatter || statuses.shatter.consumed) {
      return 1.0; // 无加成
    }
    
    // 消耗碎裂
    statuses.shatter.consumed = true;
    const bonus = 1.0 + statuses.shatter.bonusPct;
    
    console.log(`[Status] Consumed Shatter: +${(statuses.shatter.bonusPct * 100).toFixed(1)}% damage`);
    
    return bonus;
  }
  
  /**
   * 获取易伤加成
   */
  getVulnerabilityMultiplier(enemy) {
    const statuses = this.enemyStatuses.get(enemy.id);
    if (!statuses || !statuses.expose) return 1.0;
    
    return 1.0 + statuses.expose.vulnPct;
  }
  
  /**
   * 移除状态
   */
  removeStatus(enemy, statusType) {
    const statuses = this.enemyStatuses.get(enemy.id);
    if (!statuses) return;
    
    if (statusType === 'freeze') {
      statuses.freeze = null;
      enemy.frozenUntil = null;
      enemy.slowUntil = null;
      enemy.slowMultiplier = 1.0;
    } else {
      statuses[statusType] = null;
    }
  }
  
  /**
   * 清理敌人状态（敌人死亡时调用）
   */
  clearEnemy(enemyId) {
    this.enemyStatuses.delete(enemyId);
  }
  
  /**
   * 获取状态缩放系数（来自装备/宝石）
   */
  getStatusScale(source = {}) {
    // 从装备系统获取状态加成
    let dotPct = 0;
    let durationPct = 0;
    let vulnPct = 0;
    let slowCapPct = 0;
    let explodePowerPct = 0;
    
    // 汇总装备词缀
    if (GameState.equipment) {
      const equipped = GameState.equipment.equippedItems || {};
      Object.values(equipped).forEach(item => {
        if (item && item.affixes) {
          dotPct += (item.affixes.statusDotPct || 0) / 100;
          durationPct += (item.affixes.statusDurationPct || 0) / 100;
          vulnPct += (item.affixes.statusVulnPct || 0) / 100;
          slowCapPct += (item.affixes.statusSlowCapPct || 0) / 100;
          explodePowerPct += (item.affixes.statusExplodePowerPct || 0) / 100;
        }
      });
    }
    
    // 汇总宝石加成
    if (this.scene.gemSystem) {
      const gemStats = this.scene.gemSystem.getAllGemStats();
      dotPct += (gemStats.stats.statusDotPct || 0) / 100;
      durationPct += (gemStats.stats.statusDurationPct || 0) / 100;
      vulnPct += (gemStats.stats.statusVulnPct || 0) / 100;
    }
    
    return {
      dotPct: Math.max(0, dotPct),
      durationPct: Math.max(0, durationPct),
      vulnPct: Math.max(0, vulnPct),
      slowCapPct: Math.max(0, slowCapPct),
      explodePowerPct: Math.max(0, explodePowerPct)
    };
  }
  
  /**
   * 更新（每帧调用）
   */
  update(delta) {
    const now = Date.now();
    
    this.enemyStatuses.forEach((statuses, enemyId) => {
      // 更新灼烧DoT
      if (statuses.burn) {
        const elapsed = (now - statuses.burn.startTime) / 1000;
        
        if (elapsed >= statuses.burn.duration) {
          statuses.burn = null;
        } else {
          const timeSinceLastTick = (now - statuses.burn.lastTick) / 1000;
          if (timeSinceLastTick >= statuses.burn.tickInterval) {
            // 触发DoT伤害
            this.applyBurnTick(enemyId, statuses.burn.tickDamage);
            statuses.burn.lastTick = now;
          }
        }
      }
      
      // 更新冰冻
      if (statuses.freeze) {
        const elapsed = (now - statuses.freeze.startTime) / 1000;
        if (elapsed >= statuses.freeze.duration) {
          statuses.freeze = null;
        }
      }
      
      // 更新缠绕
      if (statuses.root) {
        const elapsed = (now - statuses.root.startTime) / 1000;
        if (elapsed >= statuses.root.duration) {
          statuses.root = null;
        }
      }
      
      // 更新破甲
      if (statuses.expose) {
        const elapsed = (now - statuses.expose.startTime) / 1000;
        if (elapsed >= statuses.expose.duration) {
          statuses.expose = null;
        }
      }
    });
  }
  
  /**
   * 应用灼烧跳伤
   */
  applyBurnTick(enemyId, damage) {
    // 查找敌人对象并造成伤害
    if (this.scene.enemies) {
      const enemy = this.scene.enemies.find(e => e.id === enemyId);
      if (enemy && enemy.takeDamage) {
        enemy.takeDamage(damage, 'burn');
      }
    }
  }
  
  /**
   * 获取敌人状态信息（用于UI显示）
   */
  getEnemyStatusInfo(enemyId) {
    const statuses = this.enemyStatuses.get(enemyId);
    if (!statuses) return null;
    
    const now = Date.now();
    const info = [];
    
    if (statuses.burn) {
      const remaining = statuses.burn.duration - (now - statuses.burn.startTime) / 1000;
      info.push({ type: 'burn', remaining: Math.max(0, remaining) });
    }
    
    if (statuses.freeze) {
      const remaining = statuses.freeze.duration - (now - statuses.freeze.startTime) / 1000;
      info.push({ type: 'freeze', remaining: Math.max(0, remaining) });
    }
    
    if (statuses.root) {
      const remaining = statuses.root.duration - (now - statuses.root.startTime) / 1000;
      info.push({ type: 'root', remaining: Math.max(0, remaining) });
    }
    
    if (statuses.shatter && !statuses.shatter.consumed) {
      info.push({ type: 'shatter', active: true });
    }
    
    if (statuses.expose) {
      const remaining = statuses.expose.duration - (now - statuses.expose.startTime) / 1000;
      info.push({ type: 'expose', remaining: Math.max(0, remaining), vulnPct: statuses.expose.vulnPct });
    }
    
    return info;
  }
}
