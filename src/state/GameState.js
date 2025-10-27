export const GameState = {
  globals: {
    score: 0,
    wave: 1,
    isPaused: false,
    coins: 0,
    level: 1,
    killCount: 0,
    nextLevelKills: 15,
    bulletDamageMultiplier: 1,
    fireRate: 2,
    minFireRate: 0.6,
    baseDamage: 10,
    baseKillsToLevel: 15,
    killGrowthFactor: 1.22,
    maxPlayerLevel: 12,
    baseShotPattern: { angles: [0], totalMultiplier: 1 },
    locale: 'zh',
    lowPowerMode: false,
    highScore: 0,
    shopDamageMultiplier: 1,
    shopLootChanceBonus: 0
  },
  skillState: {
    atk_speed: 0,
    atk_power: 0,
    multi_shot: 0,
    scatter: 0,
    split: 0,
    penetration: 0,
    rebound: 0,
    defense_shield: 0,
    summon_drone: 0,
    aoe_blast: 0
  },
  hasteBuff: {
    active: false,
    expiresAt: 0,
    multiplier: 0.75
  },
  stats: {
    totalKills: 0,
    highestCombo: 0,
    currentCombo: 0,
    aoeTriggers: 0,
    runSeconds: 0
  },
  config: null,
  hydrate(saveData) {
    if (!saveData) return;
    this.globals.coins = saveData.coins ?? this.globals.coins;
    this.globals.level = saveData.level ?? this.globals.level;
    this.globals.highScore = saveData.highScore ?? 0;
    this.globals.locale = saveData.locale ?? 'zh';
    this.globals.lowPowerMode = saveData.toggles?.lowPowerMode ?? false;
    Object.keys(this.skillState).forEach(key => {
      this.skillState[key] = saveData.skillState?.[key] ?? 0;
    });
  },
  setConfig(cfg) {
    this.config = cfg;
    if (cfg?.balance) {
      const bal = cfg.balance;
      this.globals.baseDamage = bal.baseDamage;
      this.globals.fireRate = bal.fireRate;
      this.globals.minFireRate = bal.minFireRate;
      this.globals.maxPlayerLevel = bal.maxPlayerLevel;
      this.globals.baseKillsToLevel = bal.leveling.baseKillsToLevel;
      this.globals.killGrowthFactor = bal.leveling.growthFactor;
      this.globals.nextLevelKills = bal.leveling.baseKillsToLevel;
    }
  },
  reset(resetSkills = true) {
    this.globals.score = 0;
    this.globals.wave = 1;
    this.globals.level = 1;
    this.globals.killCount = 0;
    this.globals.isPaused = false;
    this.globals.nextLevelKills = this.globals.baseKillsToLevel;
    this.globals.bulletDamageMultiplier = 1;
    this.globals.fireRate = this.config?.balance?.fireRate ?? 2;
    // coins 不重置，跨局积累
    if (resetSkills) {
      this.skillState.atk_speed = 0;
      this.skillState.atk_power = 0;
      this.skillState.multi_shot = 0;
      this.skillState.scatter = 0;
      this.skillState.split = 0;
      this.skillState.penetration = 0;
      this.skillState.rebound = 0;
      this.skillState.defense_shield = 0;
      this.skillState.summon_drone = 0;
      this.skillState.aoe_blast = 0;
    }
    this.hasteBuff.active = false;
    this.hasteBuff.expiresAt = 0;
    this.globals.baseShotPattern = { angles: [0], totalMultiplier: 1 };
    this.stats.totalKills = 0;
    this.stats.highestCombo = 0;
    this.stats.currentCombo = 0;
    this.stats.aoeTriggers = 0;
    this.stats.runSeconds = 0;
  }
};
