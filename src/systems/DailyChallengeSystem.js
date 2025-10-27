import { GameState } from '../state/GameState.js';

/**
 * v6+v8: 每日试炼系统
 * 基于日期生成每日规则（1~2条），影响游戏平衡
 * 例如：高密度小怪、弱穿透、强化反弹、精英密度+、玩家HP-等
 * v8: 新增规则类型与离线榜单集成
 */
export class DailyChallengeSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.dailyChallenge || {};
    this.enabled = this.config.enabled !== false;
    this.rulesPool = this.config.rulesPool || this.getDefaultRulesPool();
    this.todayRules = [];
    this.todaySeed = 0;
    
    // v8: 记录活跃状态（用于榜单绑定）
    if (!GameState.dailyChallenge) {
      GameState.dailyChallenge = {
        active: false,
        seed: null,
        rules: []
      };
    }
    
    if (this.enabled) {
      this.generateDailyRules();
    }
  }
  
  getDefaultRulesPool() {
    return [
      {
        id: 'high_density',
        name: '高密度小怪',
        desc: '敌人生成速度 ×1.5',
        apply: (scene) => {
          scene.sceneVars.spawnRate *= 0.67; // 间隔缩短
        }
      },
      {
        id: 'weak_penetration',
        name: '弱穿透',
        desc: '穿透衰减 ×0.80 → ×0.70',
        apply: (scene) => {
          // 在 GameScene 的穿透逻辑中检查此规则
        }
      },
      {
        id: 'strong_rebound',
        name: '强化反弹',
        desc: '反弹衰减 ×0.85 → ×0.95',
        apply: (scene) => {
          // 在 GameScene 的反弹逻辑中检查此规则
        }
      },
      {
        id: 'thick_enemies',
        name: '厚甲敌人',
        desc: '敌人 HP ×1.4',
        apply: (scene) => {
          scene.sceneVars.enemyHP *= 1.4;
        }
      },
      {
        id: 'fast_enemies',
        name: '疾速敌人',
        desc: '敌人速度 ×1.3',
        apply: (scene) => {
          scene.sceneVars.enemySpeed *= 1.3;
        }
      },
      {
        id: 'elite_surge',
        name: '精英潮涌',
        desc: '精英生成概率 ×2',
        apply: (scene) => {
          if (scene.eliteSystem) {
            scene.eliteSystem.spawnChance *= 2;
          }
        }
      },
      {
        id: 'low_loot',
        name: '稀缺掉落',
        desc: '掉落概率 ×0.6',
        apply: (scene) => {
          if (scene.lootSystem) {
            scene.lootSystem.dropChance *= 0.6;
          }
        }
      },
      {
        id: 'short_waves',
        name: '急促波次',
        desc: '波次间隔 30s → 20s',
        apply: (scene) => {
          if (scene.waveSystem) {
            scene.waveSystem.waveInterval = 20000;
          }
        }
      },
      // v8: 新增规则
      {
        id: 'elite_density_plus',
        name: '精英密度+',
        desc: '精英密度上调 ×1.8，掉率微升 +10%',
        apply: (scene) => {
          if (scene.eliteSystem) {
            scene.eliteSystem.spawnChance *= 1.8;
            scene.eliteSystem.lootBonus = (scene.eliteSystem.lootBonus || 0) + 0.10;
          }
        }
      },
      {
        id: 'player_hp_minus',
        name: '玩家HP-',
        desc: '玩家生命削减 ×0.5（最小 1HP）',
        apply: (scene) => {
          if (scene.player && GameState.player) {
            const currentHP = GameState.player.hp || 100;
            GameState.player.maxHP = Math.max(1, Math.floor(currentHP * 0.5));
            GameState.player.hp = GameState.player.maxHP;
            console.log('[DailyChallenge] Player HP reduced to:', GameState.player.maxHP);
          }
        }
      }
    ];
  }
  
  generateDailyRules() {
    // 基于日期生成种子
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    this.todaySeed = this.hashString(dateStr);
    
    // 使用种子随机抽取 1~2 条规则
    const rng = this.seededRandom(this.todaySeed);
    const ruleCount = Math.floor(rng() * 2) + 1; // 1 或 2
    
    const poolCopy = [...this.rulesPool];
    this.todayRules = [];
    
    for (let i = 0; i < ruleCount && poolCopy.length > 0; i++) {
      const idx = Math.floor(rng() * poolCopy.length);
      this.todayRules.push(poolCopy.splice(idx, 1)[0]);
    }
    
    console.log(`[DailyChallenge] Today's rules (seed: ${this.todaySeed}):`, this.todayRules.map(r => r.name));
  }
  
  applyRules() {
    if (!this.enabled || this.todayRules.length === 0) return;
    
    // v8: 标记每日试炼活跃
    GameState.dailyChallenge.active = true;
    GameState.dailyChallenge.seed = this.todaySeed;
    GameState.dailyChallenge.rules = this.todayRules.map(r => ({
      id: r.id,
      name: r.name,
      desc: r.desc
    }));
    
    this.todayRules.forEach(rule => {
      if (rule.apply) {
        rule.apply(this.scene);
      }
    });
    
    console.log(`[DailyChallenge] Applied ${this.todayRules.length} rule(s)`);
  }
  
  getRulesDescription() {
    if (!this.enabled || this.todayRules.length === 0) {
      return '今日无特殊规则';
    }
    
    // v8: 添加种子信息
    const rulesText = this.todayRules.map(r => `${r.name}: ${r.desc}`).join('\n');
    return `【每日试炼 #${this.todaySeed}】\n${rulesText}`;
  }
  
  getRulesList() {
    return this.todayRules.map(r => ({
      name: r.name,
      desc: r.desc
    }));
  }
  
  // 简单哈希函数
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  // 基于种子的伪随机数生成器
  seededRandom(seed) {
    let state = seed;
    return function() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
  
  // 检查规则是否影响特定行为
  hasRule(ruleId) {
    return this.todayRules.some(r => r.id === ruleId);
  }
  
  // 获取规则修正值（用于数值计算）
  getRuleModifier(type) {
    // 根据规则类型返回修正系数
    if (this.hasRule('weak_penetration') && type === 'penetration') {
      return 0.70 / 0.90; // 从 0.90 降至 0.70
    }
    if (this.hasRule('strong_rebound') && type === 'rebound') {
      return 0.95 / 0.85; // 从 0.85 升至 0.95
    }
    // v8: 新规则修正
    if (this.hasRule('elite_density_plus') && type === 'eliteSpawn') {
      return 1.8;
    }
    if (this.hasRule('elite_density_plus') && type === 'eliteLoot') {
      return 1.10;
    }
    if (this.hasRule('player_hp_minus') && type === 'playerHP') {
      return 0.5;
    }
    return 1.0;
  }
  
  // v8: 获取今日种子（用于榜单绑定）
  getTodaySeed() {
    return this.todaySeed;
  }
  
  // v8: 停用每日试炼（退出每日试炼模式）
  deactivate() {
    if (GameState.dailyChallenge) {
      GameState.dailyChallenge.active = false;
    }
  }
}
