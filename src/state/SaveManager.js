const SAVE_KEY = 'autoAim_waves_progress_v4';
const CURRENT_VERSION = 'v4';

const clone = obj => {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
};

const defaultData = {
  version: CURRENT_VERSION,
  locale: 'zh',
  highScore: 0,
  maxWave: 1,
  coins: 0,
  level: 1,
  skillState: {},
  achievements: {
    totalKills: 0,
    highestCombo: 0,
    highestWave: 1,
    longestRunSeconds: 0,
    aoeTriggers: 0
  },
  achievementsUnlocked: [],
  toggles: {
    lowPowerMode: false
  },
  tutorialCompleted: false,
  shop: {
    bulletDamageLevel: 0,
    fireRateCapBought: false,
    lootChanceLevel: 0
  }
};

export const SaveManager = {
  data: clone(defaultData),

  load(existingSkillState = {}) {
    if (typeof localStorage === 'undefined') {
      this.data = clone({ ...defaultData, skillState: { ...existingSkillState } });
      return this.data;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!stored) {
        this.data = clone({ ...defaultData, skillState: { ...existingSkillState } });
        return this.data;
      }
      this.data = this.migrate(stored, existingSkillState);
    } catch (err) {
      console.error('[SaveManager] load failed, fallback to defaults', err);
      this.data = clone({ ...defaultData, skillState: { ...existingSkillState } });
    }
    return this.data;
  },

  migrate(raw, existingSkillState) {
    if (!raw || typeof raw !== 'object') {
      console.log('[SaveManager] No save data, using defaults');
      return clone({ ...defaultData, skillState: { ...existingSkillState } });
    }
    
    // v4 原生数据
    if (raw.version === CURRENT_VERSION) {
      return {
        ...defaultData,
        ...raw,
        skillState: { ...existingSkillState, ...(raw.skillState || {}) },
        toggles: { ...defaultData.toggles, ...(raw.toggles || {}) },
        achievements: { ...defaultData.achievements, ...(raw.achievements || {}) },
        achievementsUnlocked: raw.achievementsUnlocked || [],
        tutorialCompleted: raw.tutorialCompleted ?? false,
        shop: { ...defaultData.shop, ...(raw.shop || {}) }
      };
    }
    
    // v3 → v4 迁移
    if (raw.version === 'v3') {
      console.log('[SaveManager] Migrating from v3 to v4');
      return {
        ...defaultData,
        highScore: raw.highScore ?? 0,
        maxWave: raw.maxWave ?? 1,
        coins: raw.coins ?? 0,
        level: raw.level ?? 1,
        locale: raw.locale ?? 'zh',
        skillState: { ...existingSkillState, ...(raw.skillState || {}) },
        achievements: { ...defaultData.achievements, ...(raw.achievements || {}) },
        achievementsUnlocked: raw.achievementsUnlocked || [],
        toggles: { ...defaultData.toggles, ...(raw.toggles || {}) },
        tutorialCompleted: false, // v4 新增，重新显示教程
        shop: defaultData.shop
      };
    }
    
    // v2 → v4 迁移
    if (raw.version === 'v2') {
      console.log('[SaveManager] Migrating from v2 to v4');
      return {
        ...defaultData,
        highScore: raw.highScore ?? 0,
        maxWave: raw.maxWave ?? 1,
        coins: raw.coins ?? 0,
        level: raw.level ?? 1,
        skillState: { ...existingSkillState, ...(raw.skillState || {}) },
        achievements: {
          ...defaultData.achievements,
          totalKills: raw.totalKills ?? 0,
          highestWave: raw.maxWave ?? 1
        },
        toggles: {
          ...defaultData.toggles,
          lowPowerMode: raw.lowPowerMode ?? false
        },
        achievementsUnlocked: raw.achievementsUnlocked || [],
        tutorialCompleted: false,
        shop: defaultData.shop
      };
    }
    
    console.warn('[SaveManager] Unknown version, using defaults with migration');
    return clone({ ...defaultData, skillState: { ...existingSkillState } });
  },

  save(partial = {}) {
    if (typeof localStorage === 'undefined') return;
    this.data = {
      ...this.data,
      ...partial,
      version: CURRENT_VERSION
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[SaveManager] save failed', err);
    }
  },

  updateStats(stats) {
    this.save({
      highScore: Math.max(this.data.highScore, stats.score || 0),
      maxWave: Math.max(this.data.maxWave, stats.wave || 1),
      achievements: {
        ...this.data.achievements,
        totalKills: Math.max(this.data.achievements.totalKills, stats.totalKills || 0),
        highestCombo: Math.max(this.data.achievements.highestCombo, stats.highestCombo || 0),
        highestWave: Math.max(this.data.achievements.highestWave, stats.wave || 1),
        longestRunSeconds: Math.max(this.data.achievements.longestRunSeconds, stats.duration || 0),
        aoeTriggers: Math.max(this.data.achievements.aoeTriggers, stats.aoeTriggers || 0)
      }
    });
  }
};
